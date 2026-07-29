-- Supabase SQL Editor에서 실행하세요.
-- 미니 캐치테이블: 비회원 전용 (로그인 없음). 기존 posts(게시판 테스트) 테이블은 삭제합니다.

drop table if exists posts;

-- 1. 매장
create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  category text,
  description text,
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
  slot_id uuid not null unique references reservation_slots(id) on delete cascade,
  reserver_name text not null,
  status text not null default 'CONFIRMED' check (status in ('CONFIRMED', 'CANCELLED')),
  reserved_at timestamptz not null default now()
);

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

-- 4. 실시간 웨이팅
create table if not exists waitings (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  waiter_name text not null,
  party_size int not null check (party_size > 0),
  waiting_number int not null,
  status text not null default 'WAITING' check (status in ('WAITING', 'CALLED', 'ENTERED', 'CANCELLED')),
  created_at timestamptz not null default now()
);

-- 매장/당일 기준으로 대기 순번 자동 부여
create or replace function assign_waiting_number()
returns trigger as $$
begin
  select coalesce(max(waiting_number), 0) + 1
    into new.waiting_number
    from waitings
    where store_id = new.store_id
      and created_at::date = current_date;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_assign_waiting_number on waitings;
create trigger trg_assign_waiting_number
  before insert on waitings
  for each row execute function assign_waiting_number();

-- RLS: 완전 비회원 서비스라 anon 권한으로 조회/등록/상태변경 모두 허용
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
alter publication supabase_realtime add table reservation_slots;
alter publication supabase_realtime add table reservations;
alter publication supabase_realtime add table waitings;

-- 데모용 매장 1곳 + 오늘의 시간대별 슬롯(11:00~20:00, 1시간 간격) 시드 데이터
do $$
declare
  demo_store_id uuid;
  slot_hour int;
begin
  insert into stores (name, address, category, description)
  values ('미니 캐치테이블 식당', '서울시 강남구 테헤란로 123', '한식', '실시간 웨이팅과 시간대별 예약을 제공하는 데모 매장입니다.')
  returning id into demo_store_id;

  for slot_hour in 11..20 loop
    insert into reservation_slots (store_id, slot_date, slot_time)
    values (demo_store_id, current_date, make_time(slot_hour, 0, 0));
  end loop;
end $$;
