-- Biweekly tasks. Safe to run on an existing database – keeps all data.

alter table tasks drop constraint if exists tasks_frequency_check;
alter table tasks add constraint tasks_frequency_check check (frequency in ('once', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly'));
