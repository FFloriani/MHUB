-- =====================================================================
-- Garante diet_meal_slots + RLS e força o PostgREST a enxergar a tabela.
-- Rode no SQL Editor do Supabase (mesmo projeto das env da Vercel).
-- Idempotente: pode rodar mais de uma vez.
-- =====================================================================

-- Trigger helper (caso o projeto não tenha finance_v2 aplicado)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Tabela de slots de refeição
-- ---------------------------------------------------------------------
create table if not exists public.diet_meal_slots (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  logged_date     date not null,
  title           text not null,
  meal_time       time without time zone,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default timezone('utc'::text, now()),
  updated_at      timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_diet_meal_slots_user_date
  on public.diet_meal_slots (user_id, logged_date);

drop trigger if exists trg_diet_meal_slots_updated_at on public.diet_meal_slots;
create trigger trg_diet_meal_slots_updated_at
  before update on public.diet_meal_slots
  for each row execute function public.set_updated_at();

alter table public.diet_meal_slots enable row level security;

drop policy if exists "diet_meal_slots_select_own" on public.diet_meal_slots;
drop policy if exists "diet_meal_slots_insert_own" on public.diet_meal_slots;
drop policy if exists "diet_meal_slots_update_own" on public.diet_meal_slots;
drop policy if exists "diet_meal_slots_delete_own" on public.diet_meal_slots;

create policy "diet_meal_slots_select_own" on public.diet_meal_slots
  for select using (auth.uid() = user_id);
create policy "diet_meal_slots_insert_own" on public.diet_meal_slots
  for insert with check (auth.uid() = user_id);
create policy "diet_meal_slots_update_own" on public.diet_meal_slots
  for update using (auth.uid() = user_id);
create policy "diet_meal_slots_delete_own" on public.diet_meal_slots
  for delete using (auth.uid() = user_id);

grant all on public.diet_meal_slots to postgres, service_role;
grant select, insert, update, delete on public.diet_meal_slots to authenticated;

-- ---------------------------------------------------------------------
-- diet_entries: coluna meal_slot_id + backfill se ainda existir meal_type
-- ---------------------------------------------------------------------
alter table public.diet_entries
  add column if not exists meal_slot_id uuid references public.diet_meal_slots (id) on delete cascade;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'diet_entries' and column_name = 'meal_type'
  ) then
    insert into public.diet_meal_slots (user_id, logged_date, title, meal_time, sort_order)
    select
      e.user_id,
      e.logged_date,
      case e.meal_type
        when 'breakfast' then 'Café da manhã'
        when 'lunch' then 'Almoço'
        when 'dinner' then 'Jantar'
        when 'snack' then 'Lanche'
        else 'Outro'
      end,
      null,
      case e.meal_type
        when 'breakfast' then 0
        when 'lunch' then 1
        when 'snack' then 2
        when 'dinner' then 3
        else 4
      end
    from (
      select distinct user_id, logged_date, meal_type from public.diet_entries
    ) e
    where not exists (
      select 1 from public.diet_meal_slots s
      where s.user_id = e.user_id
        and s.logged_date = e.logged_date
        and s.title = case e.meal_type
          when 'breakfast' then 'Café da manhã'
          when 'lunch' then 'Almoço'
          when 'dinner' then 'Jantar'
          when 'snack' then 'Lanche'
          else 'Outro'
        end
    );

    -- Liga entradas aos slots (match user + data + tipo → título do slot)
    update public.diet_entries e
    set meal_slot_id = s.id
    from public.diet_meal_slots s
    where e.user_id = s.user_id
      and e.logged_date = s.logged_date
      and e.meal_slot_id is null
      and s.title = case e.meal_type
                      when 'breakfast' then 'Café da manhã'
                      when 'lunch' then 'Almoço'
                      when 'dinner' then 'Jantar'
                      when 'snack' then 'Lanche'
                      else 'Outro'
                    end;

    if not exists (select 1 from public.diet_entries where meal_slot_id is null) then
      alter table public.diet_entries drop column meal_type;
      alter table public.diet_entries alter column meal_slot_id set not null;
    end if;
  end if;
end
$$;

-- PostgREST: recarregar cache de schema (corrige "not in the schema cache")
notify pgrst, 'reload schema';
