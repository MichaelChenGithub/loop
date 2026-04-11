-- user_quota: tracks session usage per authenticated user
create table public.user_quota (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  sessions_used int not null default 0,
  minutes_used  numeric(6,2) not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.user_quota enable row level security;

-- users can only read their own quota row
create policy "users can read own quota"
  on public.user_quota
  for select
  using (auth.uid() = user_id);

-- only the service role can insert/update quota rows
create policy "service role can manage quota"
  on public.user_quota
  for all
  using (auth.role() = 'service_role');

-- beta_signups: single-row counter for total registered users
create table public.beta_signups (
  total_users int not null default 0
);

alter table public.beta_signups enable row level security;

-- no public read/write; only service role accesses this table
create policy "service role can manage beta signups"
  on public.beta_signups
  for all
  using (auth.role() = 'service_role');

-- seed the single row
insert into public.beta_signups (total_users) values (0);
