-- ========================================
-- MÓDULO TREINO - MHUB
-- ========================================

-- Tabela principal: Plano de treino do usuário
create table public.workout_plans (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null default 'Meu Plano de Treino',
    division_type text not null default 'ABCD',
    is_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Dias de treino (A, B, C, D, etc)
create table public.workout_days (
    id uuid default gen_random_uuid() primary key,
    plan_id uuid references public.workout_plans(id) on delete cascade not null,
    day_letter text not null,
    name text not null,
    muscle_groups text[] default '{}',
    rest_hours integer default 48,
    color text default '#6366F1',
    "order" integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Exercícios de cada dia
create table public.workout_exercises (
    id uuid default gen_random_uuid() primary key,
    day_id uuid references public.workout_days(id) on delete cascade not null,
    name text not null,
    sets integer default 3,
    reps text default '12',
    rest_seconds integer default 60,
    weight_kg numeric(6,2),
    notes text,
    "order" integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Histórico de treinos realizados
create table public.workout_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    day_id uuid references public.workout_days(id) on delete set null,
    event_id uuid references public.events(id) on delete set null,
    completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
    duration_minutes integer,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índices para performance
create index idx_workout_plans_user on public.workout_plans(user_id);
create index idx_workout_days_plan on public.workout_days(plan_id);
create index idx_workout_exercises_day on public.workout_exercises(day_id);
create index idx_workout_logs_user on public.workout_logs(user_id);

-- Habilita RLS
alter table public.workout_plans enable row level security;
alter table public.workout_days enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_logs enable row level security;

-- Políticas para workout_plans
create policy "Users can view own workout_plans"
    on public.workout_plans for select
    using (auth.uid() = user_id);

create policy "Users can insert own workout_plans"
    on public.workout_plans for insert
    with check (auth.uid() = user_id);

create policy "Users can update own workout_plans"
    on public.workout_plans for update
    using (auth.uid() = user_id);

create policy "Users can delete own workout_plans"
    on public.workout_plans for delete
    using (auth.uid() = user_id);

-- Políticas para workout_days (baseadas no plan owner)
create policy "Users can view own workout_days"
    on public.workout_days for select
    using (exists (select 1 from public.workout_plans where id = workout_days.plan_id and user_id = auth.uid()));

create policy "Users can insert own workout_days"
    on public.workout_days for insert
    with check (exists (select 1 from public.workout_plans where id = workout_days.plan_id and user_id = auth.uid()));

create policy "Users can update own workout_days"
    on public.workout_days for update
    using (exists (select 1 from public.workout_plans where id = workout_days.plan_id and user_id = auth.uid()));

create policy "Users can delete own workout_days"
    on public.workout_days for delete
    using (exists (select 1 from public.workout_plans where id = workout_days.plan_id and user_id = auth.uid()));

-- Políticas para workout_exercises (baseadas no day owner)
create policy "Users can view own workout_exercises"
    on public.workout_exercises for select
    using (exists (
        select 1 from public.workout_days wd 
        join public.workout_plans wp on wp.id = wd.plan_id 
        where wd.id = workout_exercises.day_id and wp.user_id = auth.uid()
    ));

create policy "Users can insert own workout_exercises"
    on public.workout_exercises for insert
    with check (exists (
        select 1 from public.workout_days wd 
        join public.workout_plans wp on wp.id = wd.plan_id 
        where wd.id = workout_exercises.day_id and wp.user_id = auth.uid()
    ));

create policy "Users can update own workout_exercises"
    on public.workout_exercises for update
    using (exists (
        select 1 from public.workout_days wd 
        join public.workout_plans wp on wp.id = wd.plan_id 
        where wd.id = workout_exercises.day_id and wp.user_id = auth.uid()
    ));

create policy "Users can delete own workout_exercises"
    on public.workout_exercises for delete
    using (exists (
        select 1 from public.workout_days wd 
        join public.workout_plans wp on wp.id = wd.plan_id 
        where wd.id = workout_exercises.day_id and wp.user_id = auth.uid()
    ));

-- Políticas para workout_logs
create policy "Users can view own workout_logs"
    on public.workout_logs for select
    using (auth.uid() = user_id);

create policy "Users can insert own workout_logs"
    on public.workout_logs for insert
    with check (auth.uid() = user_id);

-- Funções para updated_at
create or replace function update_workout_plans_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create or replace function update_workout_days_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create or replace function update_workout_exercises_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

-- Triggers para updated_at
create trigger update_workout_plans_updated_at
    before update on public.workout_plans
    for each row
    execute function update_workout_plans_updated_at();

create trigger update_workout_days_updated_at
    before update on public.workout_days
    for each row
    execute function update_workout_days_updated_at();

create trigger update_workout_exercises_updated_at
    before update on public.workout_exercises
    for each row
    execute function update_workout_exercises_updated_at();
