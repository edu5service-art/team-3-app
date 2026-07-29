-- Supabase SQL Editor에서 실행하세요. (신규 설치용 전체 스크립트)
-- 이미 한 번 schema.sql을 실행한 적이 있다면, 대신
-- supabase/migrations/002_next_day_and_cancel.sql 을 실행하세요 (기존 데이터 유지).

-- 미니 캐치테이블: 비회원 전용 (로그인 없음). 기존 posts(게시판 테스트) 테이블은 삭제합니다.
drop table if exists posts;

-- 1. 매장
create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  category text,
  description text,
  current_business_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- 2. 시간대별 예약 슬롯
create table if not exists reservation_slots (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  slot_date date not null default current_date,
  slot_time time not null,
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE', 'CLOSED')),
  created_at timestamptz not null default now(),
  unique (store_id, slot_date, slot_time)
);

-- 3. 예약
create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references reservation_slots(id) on delete cascade,
  reserver_name text not null,
  status text not null default 'CONFIRMED' check (status in ('CONFIRMED', 'CANCELLED')),
  reserved_at timestamptz not null default now()
);

-- 취소된 예약은 같은 슬롯에 대한 재예약을 막지 않도록, 취소되지 않은 예약에 한해서만 슬롯당 1건으로 제한
create unique index if not exists reservations_slot_id_active_idx
  on reservations (slot_id)
  where status <> 'CANCELLED';

-- 예약이 생기면 슬롯을 자동으로 마감 처리
create or replace function close_slot_on_reservation()
returns trigger as $$
begin
  update reservation_slots set status = 'CLOSED' where id = new.slot_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_close_slot_on_reservation on reservations;
create trigger trg_close_slot_on_reservation
  after insert on reservations
  for each row execute function close_slot_on_reservation();

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

-- 4. 실시간 웨이팅
create table if not exists waitings (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  waiter_name text not null,
  party_size int not null check (party_size > 0),
  business_date date not null default current_date,
  waiting_number int not null,
  status text not null default 'WAITING' check (status in ('WAITING', 'CALLED', 'ENTERED', 'CANCELLED')),
  created_at timestamptz not null default now()
);

-- 웨이팅 등록 시 매장의 현재 영업일(business_date)과 그 날짜 기준 대기 순번을 자동 부여
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

drop trigger if exists trg_assign_waiting_number on waitings;
create trigger trg_assign_waiting_number
  before insert on waitings
  for each row execute function assign_waiting_number();

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

-- 점주 화면 "다음 날짜로 넘어가기": 영업일을 하루 넘기고 새 슬롯을 생성.
-- 이전 날짜의 예약/웨이팅은 삭제하지 않지만, 화면은 새 영업일 기준으로만 조회하므로
-- 사실상 모두 초기화된 것처럼 보입니다. SECURITY DEFINER로 RLS 없이 안전하게 실행됩니다.
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

-- 점주 화면 "예약취소": 예약 하나만 취소 (트리거가 슬롯을 다시 예약 가능으로 되돌림)
create or replace function cancel_reservation(p_reservation_id uuid)
returns void as $$
begin
  update reservations set status = 'CANCELLED' where id = p_reservation_id;
end;
$$ language plpgsql security definer;

-- RLS: 완전 비회원 서비스라 anon 권한으로 조회/등록/상태변경 모두 허용
-- (다음날 넘어가기 / 예약취소는 위 SECURITY DEFINER 함수로만 가능)
alter table stores enable row level security;
alter table reservation_slots enable row level security;
alter table reservations enable row level security;
alter table waitings enable row level security;

create policy "stores public select" on stores for select to anon using (true);

create policy "slots public select" on reservation_slots for select to anon using (true);
create policy "slots public update" on reservation_slots for update to anon using (true);

create policy "reservations public select" on reservations for select to anon using (true);
create policy "reservations public insert" on reservations for insert to anon with check (true);

create policy "waitings public select" on waitings for select to anon using (true);
create policy "waitings public insert" on waitings for insert to anon with check (true);
create policy "waitings public update" on waitings for update to anon using (true);

-- Realtime 반영 대상 테이블 등록
alter publication supabase_realtime add table stores;
alter publication supabase_realtime add table reservation_slots;
alter publication supabase_realtime add table reservations;
alter publication supabase_realtime add table waitings;

-- 데모용 매장 1곳 + 오늘의 시간대별 슬롯(11:00~20:00, 1시간 간격) 시드 데이터
do $$
declare
  demo_store_id uuid;
begin
  insert into stores (name, address, category, description)
  values ('미니 캐치테이블 식당', '서울시 강남구 테헤란로 123', '한식', '실시간 웨이팅과 시간대별 예약을 제공하는 데모 매장입니다.')
  returning id into demo_store_id;

  perform generate_slots_for_date(demo_store_id, current_date);
end $$;
