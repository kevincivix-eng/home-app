-- Recipes for dishes, and a dish bank: dishes with week = null are alternatives
-- that can be swapped into the menu (a swapped-out dish goes back to the bank).

alter table meal_dishes alter column week drop not null;
alter table meal_dishes drop constraint if exists meal_dishes_week_check;
alter table meal_dishes add constraint meal_dishes_week_check check (week is null or week between 1 and 4);

alter table meal_dishes add column if not exists cook_time text check (cook_time is null or length(cook_time) <= 60);
alter table meal_dishes add column if not exists servings text check (servings is null or length(servings) <= 60);
-- [{ "name": "בצל", "amount": "2" }, ...]
alter table meal_dishes add column if not exists ingredients jsonb not null default '[]'::jsonb;
-- ["step 1", "step 2", ...]
alter table meal_dishes add column if not exists steps jsonb not null default '[]'::jsonb;
