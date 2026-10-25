-- Run once in Supabase → SQL Editor → New query → Run

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  color text not null default '#007aff'
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  frequency text not null check (frequency in ('daily','weekly','monthly','quarterly')),
  category text not null default 'כללי',
  due_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks on delete cascade,
  appeared_on date not null,
  deadline date not null,
  completed_on date not null,
  completed_at timestamptz not null default now(),
  done_by uuid not null references profiles,
  marked_by uuid not null references profiles,
  on_time boolean not null,
  days_late int not null default 0
);
create index if not exists completions_task_idx on completions (task_id, completed_at desc);

create table if not exists task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks on delete cascade,
  from_date date not null,
  to_date date not null,
  "by" uuid not null references profiles,
  created_at timestamptz not null default now()
);

-- Only signed-in household members can read/write
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table completions enable row level security;
alter table task_events enable row level security;

drop policy if exists "members" on profiles;
drop policy if exists "members" on tasks;
drop policy if exists "members" on completions;
drop policy if exists "members" on task_events;
create policy "members" on profiles for all to authenticated using (true) with check (true);
create policy "members" on tasks for all to authenticated using (true) with check (true);
create policy "members" on completions for all to authenticated using (true) with check (true);
create policy "members" on task_events for all to authenticated using (true) with check (true);

-- Live sync between phones
alter publication supabase_realtime add table tasks, completions, task_events, profiles;
