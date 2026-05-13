-- =====================================================================
-- Dieta: refeições dinâmicas por dia + horário (slots)
-- =====================================================================

create table public.diet_meal_slots (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  logged_date     date not null,
  title           text not null,
  meal_time       time without time zone,
  sort_order      integer not null default 0,
  legacy_meal_type text,
  created_at      timestamptz not null default timezone('utc'::text, now()),
  updated_at      timestamptz not null default timezone('utc'::text, now())
);

create index idx_diet_meal_slots_user_date on public.diet_meal_slots (user_id, logged_date);

create trigger trg_diet_meal_slots_updated_at
  before update on public.diet_meal_slots
  for each row execute function public.set_updated_at();

alter table public.diet_meal_slots enable row level security;

create policy "diet_meal_slots_select_own" on public.diet_meal_slots
  for select using (auth.uid() = user_id);
create policy "diet_meal_slots_insert_own" on public.diet_meal_slots
  for insert with check (auth.uid() = user_id);
create policy "diet_meal_slots_update_own" on public.diet_meal_slots
  for update using (auth.uid() = user_id);
create policy "diet_meal_slots_delete_own" on public.diet_meal_slots
  for delete using (auth.uid() = user_id);

alter table public.diet_entries
  add column meal_slot_id uuid references public.diet_meal_slots (id) on delete cascade;

insert into public.diet_meal_slots (user_id, logged_date, title, meal_time, sort_order, legacy_meal_type)
select
  user_id,
  logged_date,
  case meal_type
    when 'breakfast' then 'Café da manhã'
    when 'lunch' then 'Almoço'
    when 'dinner' then 'Jantar'
    when 'snack' then 'Lanche'
    else 'Outro'
  end,
  null,
  case meal_type
    when 'breakfast' then 0
    when 'lunch' then 1
    when 'snack' then 2
    when 'dinner' then 3
    else 4
  end,
  meal_type
from public.diet_entries
group by user_id, logged_date, meal_type;

update public.diet_entries e
set meal_slot_id = s.id
from public.diet_meal_slots s
where e.user_id = s.user_id
  and e.logged_date = s.logged_date
  and e.meal_type = s.legacy_meal_type;

alter table public.diet_meal_slots drop column legacy_meal_type;

alter table public.diet_entries alter column meal_slot_id set not null;

alter table public.diet_entries drop column meal_type;

create index idx_diet_entries_meal_slot on public.diet_entries (meal_slot_id);
