-- =====================================================================
-- Módulo Dieta - registro de refeições por dia
-- =====================================================================

create table if not exists public.diet_entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  logged_date     date not null,
  meal_type       text not null
    check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  name            text not null,
  quantity_text   text,
  calories        integer,
  protein_g       numeric(10, 2),
  carbs_g         numeric(10, 2),
  fat_g           numeric(10, 2),
  notes           text,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default timezone('utc'::text, now()),
  updated_at      timestamptz not null default timezone('utc'::text, now())
);

create index idx_diet_entries_user_date on public.diet_entries (user_id, logged_date);

create trigger trg_diet_entries_updated_at
  before update on public.diet_entries
  for each row execute function public.set_updated_at();

alter table public.diet_entries enable row level security;

create policy "diet_entries_select_own" on public.diet_entries
  for select using (auth.uid() = user_id);
create policy "diet_entries_insert_own" on public.diet_entries
  for insert with check (auth.uid() = user_id);
create policy "diet_entries_update_own" on public.diet_entries
  for update using (auth.uid() = user_id);
create policy "diet_entries_delete_own" on public.diet_entries
  for delete using (auth.uid() = user_id);
