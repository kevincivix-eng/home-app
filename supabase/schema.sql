-- Home app – multi-household schema
-- Run in Supabase → SQL Editor → New query → Run.
-- WARNING: drops the existing app tables (safe while they are still empty).

drop table if exists shopping_items, shopping_lists, task_events, completions, tasks, household_members, households, profiles cascade;
drop function if exists is_member, is_owner, create_household, join_household, regenerate_invite, gen_invite_code, check_task_owner, shopping_item_household, check_list_owner, create_default_lists cascade;

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
  frequency text not null constraint tasks_frequency_check check (frequency in ('once', 'daily', 'weekly', 'monthly', 'quarterly')),
  owner_id uuid references profiles on delete cascade,  -- null = shared; otherwise a personal task
  category text not null default 'כללי',
  due_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index tasks_household_idx on tasks (household_id);

create or replace function check_task_owner() returns trigger language plpgsql set search_path = public as $$
begin
  if new.owner_id is not null and not exists (
    select 1 from household_members where household_id = new.household_id and user_id = new.owner_id
  ) then raise exception 'owner is not a member of this household'; end if;
  return new;
end $$;
create trigger tasks_owner_check before insert or update of owner_id, household_id on tasks
  for each row execute function check_task_owner();

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

-- ── Hardening (same as migrations/003_hardening.sql) ─────────────────────
-- 1) Pin search_path on the remaining function
alter function gen_invite_code() set search_path = public;

-- 2) RLS helpers are only for signed-in users
revoke execute on function is_member(uuid), is_owner(uuid) from public, anon;
grant execute on function is_member(uuid), is_owner(uuid) to authenticated;

-- 3) Evaluate auth.uid() once per query instead of once per row
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated using (
  id = (select auth.uid()) or exists (
    select 1 from household_members a join household_members b on a.household_id = b.household_id
    where a.user_id = (select auth.uid()) and b.user_id = profiles.id)
);
drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists members_delete on household_members;
create policy members_delete on household_members for delete to authenticated using (user_id = (select auth.uid()) or is_owner(household_id));

-- 4) Index foreign keys
create index if not exists completions_task_idx on completions (task_id);
create index if not exists completions_done_by_idx on completions (done_by);
create index if not exists completions_marked_by_idx on completions (marked_by);
create index if not exists households_created_by_idx on households (created_by);
create index if not exists task_events_task_idx on task_events (task_id);
create index if not exists task_events_by_idx on task_events ("by");
create index if not exists tasks_owner_idx on tasks (owner_id);

-- ── Shopping (same as migrations/004_shopping.sql) ─────────────────────────
-- Shopping lists: several lists per household (shared or personal), each with
-- its own catalog of products. A product is either "needed" (on the list) or
-- just remembered in the catalog; "in_cart" marks it during a shopping trip.

create table if not exists shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  icon text not null default '🛒',
  owner_id uuid references profiles on delete cascade,  -- null = shared
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists shopping_lists_household_idx on shopping_lists (household_id);
create index if not exists shopping_lists_owner_idx on shopping_lists (owner_id);

create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  list_id uuid not null references shopping_lists on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  category text not null default 'אחר',
  needed boolean not null default true,
  in_cart boolean not null default false,
  quantity int check (quantity is null or quantity between 1 and 999),
  note text check (note is null or length(note) <= 120),
  times_bought int not null default 0,
  last_bought_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists shopping_items_name_idx on shopping_items (list_id, lower(trim(name)));
create index if not exists shopping_items_household_idx on shopping_items (household_id);

-- An item always lives in its list's household (set from the list, never from the client)
create or replace function shopping_item_household() returns trigger
language plpgsql set search_path = public as $$
begin
  new.household_id := (select household_id from shopping_lists where id = new.list_id);
  if new.household_id is null then raise exception 'list not found'; end if;
  return new;
end $$;
drop trigger if exists shopping_items_household on shopping_items;
create trigger shopping_items_household before insert or update of list_id on shopping_items
  for each row execute function shopping_item_household();

-- Personal list owner must be a member of the household
create or replace function check_list_owner() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.owner_id is not null and not exists (
    select 1 from household_members where household_id = new.household_id and user_id = new.owner_id
  ) then raise exception 'owner is not a member of this household'; end if;
  return new;
end $$;
drop trigger if exists shopping_lists_owner_check on shopping_lists;
create trigger shopping_lists_owner_check before insert or update of owner_id, household_id on shopping_lists
  for each row execute function check_list_owner();

alter table shopping_lists enable row level security;
alter table shopping_items enable row level security;
drop policy if exists shopping_lists_all on shopping_lists;
drop policy if exists shopping_items_all on shopping_items;
create policy shopping_lists_all on shopping_lists for all to authenticated using (is_member(household_id)) with check (is_member(household_id));
create policy shopping_items_all on shopping_items for all to authenticated using (is_member(household_id)) with check (is_member(household_id));

-- Default lists for every household (existing and new)
create or replace function create_default_lists(h uuid) returns void
language sql security definer set search_path = public as $$
  insert into shopping_lists (household_id, name, icon, sort)
  select h, n, i, s from (values ('סופר', '🛒', 0), ('פארם', '💊', 1), ('בית', '🏠', 2)) v(n, i, s)
  where not exists (select 1 from shopping_lists where household_id = h and owner_id is null);
$$;
revoke execute on function create_default_lists(uuid) from public, anon, authenticated;

select create_default_lists(id) from households;

create or replace function create_household(p_name text) returns households
language plpgsql security definer set search_path = public as $$
declare h households;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into households (name, created_by) values (trim(p_name), auth.uid()) returning * into h;
  insert into household_members (household_id, user_id, role) values (h.id, auth.uid(), 'owner');
  perform create_default_lists(h.id);
  return h;
end $$;

do $$ begin
  alter publication supabase_realtime add table shopping_lists, shopping_items;
exception when duplicate_object then null; end $$;
