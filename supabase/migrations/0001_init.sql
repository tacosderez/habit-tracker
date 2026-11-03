-- Habit Tracker + Reminders — schema for Supabase (PostgreSQL)
-- Apply with: npx supabase db push   or paste into the SQL editor.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.theme_preference as enum ('system', 'light', 'dark');
create type public.habit_frequency as enum ('daily', 'weekly', 'monthly');
create type public.tracking_type as enum ('boolean', 'numeric', 'duration');
create type public.reminder_status as enum ('pending', 'completed', 'cancelled', 'snoozed');
create type public.log_source as enum ('manual', 'reminder', 'widget');

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  theme_preference public.theme_preference not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Categories (dynamic HEX consumed by tags, charts, icons)
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  color_hex text not null,
  icon text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint categories_color_hex_format check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  constraint categories_name_unique unique (user_id, name)
);

create index categories_user_id_idx on public.categories (user_id, sort_order);

-- ---------------------------------------------------------------------------
-- Habits
-- tracking_type = how progress is measured
-- frequency + schedule_* = when the habit is expected
-- "Días específicos" is a schedule, not a tracking type:
--   daily + schedule_weekdays = {1,4}  → Mondays and Thursdays
-- duration values are stored in seconds
-- ---------------------------------------------------------------------------

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  title text not null,
  description text,
  frequency public.habit_frequency not null default 'daily',
  tracking_type public.tracking_type not null default 'boolean',
  target_value numeric(12, 2) not null default 1,
  unit text,
  -- ISO weekdays 1=Mon … 7=Sun. Empty / null = every day in the frequency period.
  schedule_weekdays smallint[],
  -- Calendar days 1–31 for monthly habits. Empty / null = any day in the month.
  schedule_month_days smallint[],
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habits_target_positive check (target_value > 0),
  constraint habits_weekdays_valid check (
    schedule_weekdays is null
    or schedule_weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  ),
  constraint habits_month_days_valid check (
    schedule_month_days is null
    or (
      schedule_month_days <@ array[
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
        17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31
      ]::smallint[]
    )
  ),
  constraint habits_boolean_target check (
    tracking_type <> 'boolean' or target_value = 1
  )
);

create index habits_user_frequency_idx on public.habits (user_id, frequency) where not is_archived;
create index habits_user_category_idx on public.habits (user_id, category_id) where not is_archived;

-- ---------------------------------------------------------------------------
-- Pause windows — absence of logs in [starts_on, ends_on] does not break
-- streaks and is excluded from analytics denominators.
-- ends_on null = pause still open.
-- ---------------------------------------------------------------------------

create table public.habit_pauses (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  starts_on date not null,
  ends_on date,
  reason text,
  created_at timestamptz not null default now(),
  constraint habit_pauses_range check (ends_on is null or ends_on >= starts_on)
);

create index habit_pauses_habit_range_idx on public.habit_pauses (habit_id, starts_on, ends_on);

-- ---------------------------------------------------------------------------
-- Reminders (one-shot). Optional FK to a parent habit.
-- contribution_value = how much completing this reminder advances the habit.
-- ---------------------------------------------------------------------------

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  habit_id uuid references public.habits (id) on delete set null,
  title text not null,
  notes text,
  due_at timestamptz not null,
  status public.reminder_status not null default 'pending',
  completed_at timestamptz,
  contribution_value numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminders_contribution_positive check (
    contribution_value is null or contribution_value > 0
  )
);

create index reminders_user_due_idx on public.reminders (user_id, due_at);
create index reminders_user_status_idx on public.reminders (user_id, status);
create index reminders_habit_idx on public.reminders (habit_id) where habit_id is not null;

-- ---------------------------------------------------------------------------
-- Habit logs (progress events). Multiple logs on the same local date SUM.
-- ---------------------------------------------------------------------------

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  reminder_id uuid unique references public.reminders (id) on delete set null,
  logged_on date not null,
  value numeric(12, 2) not null,
  source public.log_source not null default 'manual',
  created_at timestamptz not null default now(),
  constraint habit_logs_value_positive check (value > 0)
);

create index habit_logs_habit_day_idx on public.habit_logs (habit_id, logged_on);
create index habit_logs_user_day_idx on public.habit_logs (user_id, logged_on);

-- ---------------------------------------------------------------------------
-- Streak node catalog (UI map). Not per-user.
-- ---------------------------------------------------------------------------

create table public.streak_nodes (
  threshold_days integer primary key,
  key text not null unique,
  title text not null,
  sort_order integer not null
);

insert into public.streak_nodes (threshold_days, key, title, sort_order) values
  (7, 'spark', '7 días', 1),
  (21, 'habit', '21 días', 2),
  (30, 'anchor', '30 días', 3);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger habits_updated_at before update on public.habits
  for each row execute function public.set_updated_at();
create trigger reminders_updated_at before update on public.reminders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth: profile + default categories
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));

  insert into public.categories (user_id, name, color_hex, icon, sort_order) values
    (new.id, 'Físico',   '#22C55E', 'dumbbell', 1),
    (new.id, 'Finanzas', '#EAB308', 'wallet',   2),
    (new.id, 'Creativo', '#A855F7', 'palette',  3),
    (new.id, 'Mental',   '#3B82F6', 'brain',    4),
    (new.id, 'Social',   '#F97316', 'users',    5);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Domain helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_habit_paused(p_habit_id uuid, p_on date)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.habit_pauses p
    where p.habit_id = p_habit_id
      and p.starts_on <= p_on
      and (p.ends_on is null or p.ends_on >= p_on)
  );
$$;

create or replace function public.habit_is_due_on(p_habit public.habits, p_on date)
returns boolean
language plpgsql
stable
as $$
declare
  iso_dow smallint := extract(isodow from p_on)::smallint;
  month_day smallint := extract(day from p_on)::smallint;
begin
  if p_habit.is_archived then
    return false;
  end if;

  if p_habit.frequency = 'daily' then
    if p_habit.schedule_weekdays is null or cardinality(p_habit.schedule_weekdays) = 0 then
      return true;
    end if;
    return iso_dow = any (p_habit.schedule_weekdays);
  end if;

  if p_habit.frequency = 'weekly' then
    if p_habit.schedule_weekdays is null or cardinality(p_habit.schedule_weekdays) = 0 then
      return iso_dow = 1; -- default: count once, on Monday
    end if;
    return iso_dow = any (p_habit.schedule_weekdays);
  end if;

  -- monthly
  if p_habit.schedule_month_days is null or cardinality(p_habit.schedule_month_days) = 0 then
    return month_day = 1;
  end if;
  return month_day = any (p_habit.schedule_month_days);
end;
$$;

-- Completing a reminder linked to a habit writes a proportional habit_log.
create or replace function public.sync_habit_log_from_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_habit public.habits;
  v_value numeric(12, 2);
  v_logged_on date;
begin
  if new.status is distinct from 'completed' or new.habit_id is null then
    if old.status = 'completed' and new.status is distinct from 'completed' then
      delete from public.habit_logs where reminder_id = new.id;
    end if;
    return new;
  end if;

  select * into v_habit from public.habits where id = new.habit_id;
  if not found then
    return new;
  end if;

  v_value := coalesce(
    new.contribution_value,
    case when v_habit.tracking_type = 'boolean' then 1 else v_habit.target_value end
  );
  v_logged_on := (new.completed_at at time zone 'UTC')::date;

  insert into public.habit_logs (user_id, habit_id, reminder_id, logged_on, value, source)
  values (new.user_id, new.habit_id, new.id, v_logged_on, v_value, 'reminder')
  on conflict (reminder_id) do update
    set value = excluded.value,
        logged_on = excluded.logged_on;

  return new;
end;
$$;

create trigger reminders_sync_habit_log
  after insert or update of status, habit_id, contribution_value, completed_at
  on public.reminders
  for each row execute function public.sync_habit_log_from_reminder();

create or replace function public.complete_reminder(p_reminder_id uuid)
returns public.reminders
language plpgsql
security invoker
as $$
declare
  v_row public.reminders;
begin
  update public.reminders
  set status = 'completed',
      completed_at = coalesce(completed_at, now())
  where id = p_reminder_id
    and user_id = auth.uid()
  returning * into v_row;

  if not found then
    raise exception 'Reminder not found';
  end if;

  return v_row;
end;
$$;

-- Daily completion % per user (paused + not-due habits excluded).
create or replace view public.daily_completion as
select
  h.user_id,
  d.logged_on as day,
  avg(
    least(1, coalesce(sums.total_value, 0) / nullif(h.target_value, 0))
  )::numeric(6, 4) as completion_pct,
  count(*)::integer as habits_due
from public.habits h
join (
  select distinct logged_on, user_id from public.habit_logs
  union
  select current_date, id from public.profiles
) d on d.user_id = h.user_id
left join (
  select habit_id, logged_on, sum(value) as total_value
  from public.habit_logs
  group by habit_id, logged_on
) sums on sums.habit_id = h.id and sums.logged_on = d.logged_on
where public.habit_is_due_on(h, d.logged_on)
  and not public.is_habit_paused(h.id, d.logged_on)
group by h.user_id, d.logged_on;

-- Historical performance by category (for radar / bars).
create or replace view public.category_performance as
select
  h.user_id,
  h.category_id,
  c.name as category_name,
  c.color_hex,
  avg(
    least(1, coalesce(sums.total_value, 0) / nullif(h.target_value, 0))
  )::numeric(6, 4) as completion_pct,
  count(distinct sums.logged_on)::integer as logged_days
from public.habits h
join public.categories c on c.id = h.category_id
left join (
  select l.habit_id, l.logged_on, sum(l.value) as total_value
  from public.habit_logs l
  where not public.is_habit_paused(l.habit_id, l.logged_on)
  group by l.habit_id, l.logged_on
) sums on sums.habit_id = h.id
where not h.is_archived
group by h.user_id, h.category_id, c.name, c.color_hex;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.habits enable row level security;
alter table public.habit_pauses enable row level security;
alter table public.reminders enable row level security;
alter table public.habit_logs enable row level security;
alter table public.streak_nodes enable row level security;

create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid());

create policy "categories_own" on public.categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "habits_own" on public.habits
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "habit_pauses_own" on public.habit_pauses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "reminders_own" on public.reminders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "habit_logs_own" on public.habit_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "streak_nodes_read" on public.streak_nodes for select using (true);

grant select on public.daily_completion to authenticated;
grant select on public.category_performance to authenticated;
grant execute on function public.complete_reminder(uuid) to authenticated;
