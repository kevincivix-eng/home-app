-- Family meal planning: a 4-week menu cycle that repeats. A plan week runs Friday → Thursday:
-- "weekend" dishes are cooked Fri/Sat and last until Tuesday, "midweek" dishes are cooked Tue/Wed.
-- Ingredients are each week's shopping list; week 0 is the monthly pantry check.

create table if not exists meal_plans (
  household_id uuid primary key references households on delete cascade,
  cycle_start date not null,  -- a Friday on which week 1 began
  week_titles text[] not null default array['', '', '', ''],
  updated_at timestamptz not null default now()
);

create table if not exists meal_dishes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  week int not null check (week between 1 and 4),
  slot text not null check (slot in ('weekend', 'midweek')),
  title text not null check (length(trim(title)) between 1 and 120),
  note text check (note is null or length(note) <= 400),
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists meal_dishes_household_idx on meal_dishes (household_id);

create table if not exists meal_ingredients (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  week int not null check (week between 0 and 4),
  section text not null check (length(trim(section)) between 1 and 40),
  name text not null check (length(trim(name)) between 1 and 80),
  amount text check (amount is null or length(amount) <= 80),
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists meal_ingredients_household_idx on meal_ingredients (household_id);

alter table meal_plans enable row level security;
alter table meal_dishes enable row level security;
alter table meal_ingredients enable row level security;
drop policy if exists meal_plans_all on meal_plans;
drop policy if exists meal_dishes_all on meal_dishes;
drop policy if exists meal_ingredients_all on meal_ingredients;
create policy meal_plans_all on meal_plans for all to authenticated using (is_member(household_id)) with check (is_member(household_id));
create policy meal_dishes_all on meal_dishes for all to authenticated using (is_member(household_id)) with check (is_member(household_id));
create policy meal_ingredients_all on meal_ingredients for all to authenticated using (is_member(household_id)) with check (is_member(household_id));

-- Requests to change the menu live with the app suggestions
alter table suggestions add column if not exists kind text not null default 'app';
alter table suggestions drop constraint if exists suggestions_kind_check;
alter table suggestions add constraint suggestions_kind_check check (kind in ('app', 'menu'));

do $$ begin
  alter publication supabase_realtime add table meal_plans, meal_dishes, meal_ingredients;
exception when duplicate_object then null; end $$;
