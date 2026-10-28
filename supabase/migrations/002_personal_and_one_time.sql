-- Personal tasks (owner_id) and one-time tasks (frequency = 'once').
-- Safe to run on an existing database – keeps all data.

alter table tasks add column if not exists owner_id uuid references profiles on delete cascade;
comment on column tasks.owner_id is 'null = shared household task; otherwise the member this personal task belongs to';

alter table tasks drop constraint if exists tasks_frequency_check;
alter table tasks add constraint tasks_frequency_check check (frequency in ('once', 'daily', 'weekly', 'monthly', 'quarterly'));

-- A personal task must belong to a member of the same household
create or replace function check_task_owner() returns trigger language plpgsql set search_path = public as $$
begin
  if new.owner_id is not null and not exists (
    select 1 from household_members where household_id = new.household_id and user_id = new.owner_id
  ) then raise exception 'owner is not a member of this household'; end if;
  return new;
end $$;
drop trigger if exists tasks_owner_check on tasks;
create trigger tasks_owner_check before insert or update of owner_id, household_id on tasks
  for each row execute function check_task_owner();
