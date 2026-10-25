-- Home app – multi-household schema
-- Run in Supabase → SQL Editor → New query → Run.
-- WARNING: drops the existing app tables (safe while they are still empty).

drop table if exists task_events, completions, tasks, household_members, households, profiles cascade;
drop function if exists is_member, is_owner, create_household, join_household, regenerate_invite, gen_invite_code cascade;

-- ── People ────────────────────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  color text not null default '#007aff',
  created_at timestamptz not null default now()
);

-- ── Households & membership ───────────────────────────────────────────────
create or replace function gen_invite_code() returns text language sql volatile as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, 8)
$$;

create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 60),
  invite_code text not null unique default gen_invite_code(),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table household_members (
  household_id uuid not null references households on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index household_members_user_idx on household_members (user_id);

-- security definer: used inside RLS policies without recursing into them
create or replace function is_member(h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from household_members where household_id = h and user_id = auth.uid())
$$;

create or replace function is_owner(h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from household_members where household_id = h and user_id = auth.uid() and role = 'owner')
$$;

-- ── Chores ────────────────────────────────────────────────────────────────
create table tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  title text not null,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'quarterly')),
  category text not null default 'כללי',
  due_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index tasks_household_idx on tasks (household_id);

create table completions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
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
create index completions_household_idx on completions (household_id, completed_at);

create table task_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  task_id uuid not null references tasks on delete cascade,
  from_date date not null,
  to_date date not null,
  "by" uuid not null references profiles,
  created_at timestamptz not null default now()
);
create index task_events_household_idx on task_events (household_id);

-- ── Row level security ────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table households enable row level security;
alter table household_members enable row level security;
alter table tasks enable row level security;
alter table completions enable row level security;
alter table task_events enable row level security;

-- Profiles: yourself, and people you share a household with
create policy profiles_select on profiles for select to authenticated using (
  id = auth.uid() or exists (
    select 1 from household_members a join household_members b on a.household_id = b.household_id
    where a.user_id = auth.uid() and b.user_id = profiles.id)
);
create policy profiles_insert on profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Households: members read, owners rename/delete. Creation goes through create_household().
create policy households_select on households for select to authenticated using (is_member(id));
create policy households_update on households for update to authenticated using (is_owner(id)) with check (is_owner(id));
create policy households_delete on households for delete to authenticated using (is_owner(id));

-- Membership: members see each other; you can leave, owners can remove. Joining goes through join_household().
create policy members_select on household_members for select to authenticated using (is_member(household_id));
create policy members_update on household_members for update to authenticated using (is_owner(household_id)) with check (is_owner(household_id));
create policy members_delete on household_members for delete to authenticated using (user_id = auth.uid() or is_owner(household_id));

-- Chores data: members of the household only
create policy tasks_all on tasks for all to authenticated using (is_member(household_id)) with check (is_member(household_id));
create policy completions_all on completions for all to authenticated using (is_member(household_id)) with check (is_member(household_id));
create policy task_events_all on task_events for all to authenticated using (is_member(household_id)) with check (is_member(household_id));

-- ── RPCs ──────────────────────────────────────────────────────────────────
create or replace function create_household(p_name text) returns households
language plpgsql security definer set search_path = public as $$
declare h households;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into households (name, created_by) values (trim(p_name), auth.uid()) returning * into h;
  insert into household_members (household_id, user_id, role) values (h.id, auth.uid(), 'owner');
  return h;
end $$;

create or replace function join_household(p_code text) returns households
language plpgsql security definer set search_path = public as $$
declare h households;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into h from households where invite_code = upper(trim(p_code));
  if h.id is null then raise exception 'invalid invite code'; end if;
  insert into household_members (household_id, user_id) values (h.id, auth.uid()) on conflict do nothing;
  return h;
end $$;

create or replace function regenerate_invite(p_household uuid) returns text
language plpgsql security definer set search_path = public as $$
declare code text;
begin
  if not is_owner(p_household) then raise exception 'only owners can do this'; end if;
  update households set invite_code = gen_invite_code() where id = p_household returning invite_code into code;
  return code;
end $$;

revoke execute on function create_household, join_household, regenerate_invite from public, anon;
grant execute on function create_household, join_household, regenerate_invite to authenticated;

-- ── Live sync ─────────────────────────────────────────────────────────────
alter publication supabase_realtime add table tasks, completions, task_events, household_members, households;
