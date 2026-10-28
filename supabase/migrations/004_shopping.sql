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
