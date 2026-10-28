-- Fixes from the Supabase database advisor. No data changes.

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
