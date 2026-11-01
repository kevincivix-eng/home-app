-- Improvement suggestions written from inside the app. They stay here until handled.
-- reviewed_at marks a suggestion as already raised with the developer; reply is the answer shown in the app.

create table if not exists suggestions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  body text not null check (length(trim(body)) between 1 and 1000),
  created_by uuid references profiles on delete set null,
  status text not null default 'open' check (status in ('open', 'planned', 'done', 'declined')),
  reply text check (reply is null or length(reply) <= 2000),
  reviewed_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists suggestions_household_idx on suggestions (household_id);
create index if not exists suggestions_created_by_idx on suggestions (created_by);

alter table suggestions enable row level security;
drop policy if exists suggestions_all on suggestions;
create policy suggestions_all on suggestions for all to authenticated using (is_member(household_id)) with check (is_member(household_id));

do $$ begin
  alter publication supabase_realtime add table suggestions;
exception when duplicate_object then null; end $$;
