-- Supabase SQL Editor에서 실행하세요.
-- 이미 supabase/schema.sql을 실행해서 stores/reservation_slots/reservations/waitings가
-- 있는 기존 프로젝트에 적용하는 증분 마이그레이션입니다. 기존 데이터는 지우지 않습니다.

-- 매장의 "현재 영업일" 개념 추가 (다음날 넘어가기 기능의 기준)
alter table stores add column if not exists current_business_date date not null default current_date;

-- 웨이팅에 영업일 컬럼 추가하고, 기존 데이터는 생성일 기준으로 채워넣기
alter table waitings add column if not exists business_date date not null default current_date;
update waitings set business_date = created_at::date where business_date is distinct from created_at::date;

-- 웨이팅 등록 시 매장의 현재 영업일과 그 날짜 기준 대기 순번을 자동 부여하도록 갱신
create or replace function assign_waiting_number()
returns trigger as $$
begin
  select current_business_date into new.business_date from stores where id = new.store_id;

  select coalesce(max(waiting_number), 0) + 1
    into new.waiting_number
    from waitings
    where store_id = new.store_id
      and business_date = new.business_date;

  return new;
end;
$$ language plpgsql;

-- 예약이 취소되면 슬롯을 다시 예약 가능 상태로 되돌림
create or replace function reopen_slot_on_cancel()
returns trigger as $$
begin
  if new.status = 'CANCELLED' and old.status is distinct from 'CANCELLED' then
    update reservation_slots set status = 'AVAILABLE' where id = new.slot_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_reopen_slot_on_cancel on reservations;
create trigger trg_reopen_slot_on_cancel
  after update on reservations
  for each row execute function reopen_slot_on_cancel();

-- 특정 매장/날짜에 11:00~20:00 시간대 슬롯을 생성 (이미 있으면 건너뜀)
create or replace function generate_slots_for_date(p_store_id uuid, p_date date)
returns void as $$
declare
  slot_hour int;
begin
  for slot_hour in 11..20 loop
    insert into reservation_slots (store_id, slot_date, slot_time)
    values (p_store_id, p_date, make_time(slot_hour, 0, 0))
    on conflict (store_id, slot_date, slot_time) do nothing;
  end loop;
end;
$$ language plpgsql;

-- 점주 화면 "다음 날짜로 넘어가기": 영업일을 하루 넘기고 새 슬롯을 생성
create or replace function advance_to_next_day(p_store_id uuid)
returns date as $$
declare
  next_date date;
begin
  update stores
    set current_business_date = current_business_date + 1
    where id = p_store_id
    returning current_business_date into next_date;

  perform generate_slots_for_date(p_store_id, next_date);

  return next_date;
end;
$$ language plpgsql security definer;

-- 점주 화면 "예약취소": 예약 하나만 취소
create or replace function cancel_reservation(p_reservation_id uuid)
returns void as $$
begin
  update reservations set status = 'CANCELLED' where id = p_reservation_id;
end;
$$ language plpgsql security definer;

-- stores 테이블도 실시간 반영 대상으로 등록 (다음날 넘어가기 시 화면 자동 갱신용)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'stores'
  ) then
    alter publication supabase_realtime add table stores;
  end if;
end $$;
