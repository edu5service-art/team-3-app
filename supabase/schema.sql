-- Supabase SQL Editor에서 실행하세요.

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table posts enable row level security;

create policy "Public read access"
  on posts for select
  to anon
  using (true);

create policy "Public insert access"
  on posts for insert
  to anon
  with check (true);
