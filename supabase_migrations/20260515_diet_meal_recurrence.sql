-- Recorrência semanal nas refeições (dias 0=Dom .. 6=Sáb, igual agenda)
-- + exceção: pular refeição recorrente em um dia específico

alter table public.diet_meal_slots
  add column if not exists recurrence_days integer[];

alter table public.diet_meal_slots
  alter column logged_date drop not null;

-- Recorrente: logged_date nulo + recurrence_days preenchido.
-- Pontual: logged_date preenchido + recurrence_days nulo.
alter table public.diet_meal_slots drop constraint if exists diet_meal_slot_recurrence_ck;
alter table public.diet_meal_slots add constraint diet_meal_slot_recurrence_ck check (
  (
    recurrence_days is null
    and logged_date is not null
  )
  or
  (
    recurrence_days is not null
    and cardinality(recurrence_days) >= 1
    and logged_date is null
  )
);

-- Itens “modelo” da refeição recorrente: logged_date nulo; só este dia: logged_date = dia
alter table public.diet_entries
  alter column logged_date drop not null;

create table if not exists public.diet_recurring_skips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meal_slot_id uuid not null references public.diet_meal_slots (id) on delete cascade,
  skip_date date not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (meal_slot_id, skip_date)
);

create index if not exists idx_diet_recurring_skips_user_date
  on public.diet_recurring_skips (user_id, skip_date);

alter table public.diet_recurring_skips enable row level security;

drop policy if exists "diet_recurring_skips_select_own" on public.diet_recurring_skips;
drop policy if exists "diet_recurring_skips_insert_own" on public.diet_recurring_skips;
drop policy if exists "diet_recurring_skips_delete_own" on public.diet_recurring_skips;

create policy "diet_recurring_skips_select_own" on public.diet_recurring_skips
  for select using (auth.uid() = user_id);
create policy "diet_recurring_skips_insert_own" on public.diet_recurring_skips
  for insert with check (auth.uid() = user_id);
create policy "diet_recurring_skips_delete_own" on public.diet_recurring_skips
  for delete using (auth.uid() = user_id);

grant all on public.diet_recurring_skips to postgres, service_role;
grant select, insert, delete on public.diet_recurring_skips to authenticated;

notify pgrst, 'reload schema';
