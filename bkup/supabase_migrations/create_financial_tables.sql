-- Cria tabela de Receitas
create table public.revenues (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  category text not null, -- Salário, Aluguel, Pensão, Horas extras, 13º salário, Férias, Outros
  amount numeric(10, 2) not null,
  month integer not null, -- 1-12 (Janeiro a Dezembro)
  year integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Cria tabela de Investimentos
create table public.investments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  category text not null, -- Ações, Tesouro Direto, Renda fixa, Previdência privada, Outros
  amount numeric(10, 2) not null,
  month integer not null, -- 1-12
  year integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Cria tabela de Despesas
create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  type text not null, -- fixa, variavel, extra, adicional
  category text not null, -- Habitação, Transporte, Saúde, etc.
  item text not null, -- Aluguel, Luz, Supermercado, etc.
  amount numeric(10, 2) not null,
  month integer not null, -- 1-12
  year integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índices para performance
create index idx_revenues_user_year_month on public.revenues(user_id, year, month);
create index idx_investments_user_year_month on public.investments(user_id, year, month);
create index idx_expenses_user_year_month on public.expenses(user_id, year, month);

-- Índices únicos para evitar duplicatas (receitas e investimentos)
create unique index if not exists idx_revenues_unique on public.revenues(user_id, category, month, year);
create unique index if not exists idx_investments_unique on public.investments(user_id, category, month, year);

-- Habilita segurança (Row Level Security)
alter table public.revenues enable row level security;
alter table public.investments enable row level security;
alter table public.expenses enable row level security;

-- Políticas de segurança para RECEITAS
create policy "Usuários podem ver apenas suas próprias receitas"
  on public.revenues for select using (auth.uid() = user_id);

create policy "Usuários podem criar suas receitas"
  on public.revenues for insert with check (auth.uid() = user_id);

create policy "Usuários podem atualizar suas receitas"
  on public.revenues for update using (auth.uid() = user_id);

create policy "Usuários podem deletar suas receitas"
  on public.revenues for delete using (auth.uid() = user_id);

-- Políticas de segurança para INVESTIMENTOS
create policy "Usuários podem ver apenas seus próprios investimentos"
  on public.investments for select using (auth.uid() = user_id);

create policy "Usuários podem criar seus investimentos"
  on public.investments for insert with check (auth.uid() = user_id);

create policy "Usuários podem atualizar seus investimentos"
  on public.investments for update using (auth.uid() = user_id);

create policy "Usuários podem deletar seus investimentos"
  on public.investments for delete using (auth.uid() = user_id);

-- Políticas de segurança para DESPESAS
create policy "Usuários podem ver apenas suas próprias despesas"
  on public.expenses for select using (auth.uid() = user_id);

create policy "Usuários podem criar suas despesas"
  on public.expenses for insert with check (auth.uid() = user_id);

create policy "Usuários podem atualizar suas despesas"
  on public.expenses for update using (auth.uid() = user_id);

create policy "Usuários podem deletar suas despesas"
  on public.expenses for delete using (auth.uid() = user_id);

-- Funções para atualizar updated_at automaticamente
create or replace function update_revenues_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create or replace function update_investments_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create or replace function update_expenses_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers para atualizar updated_at
create trigger update_revenues_updated_at
  before update on public.revenues
  for each row
  execute function update_revenues_updated_at();

create trigger update_investments_updated_at
  before update on public.investments
  for each row
  execute function update_investments_updated_at();

create trigger update_expenses_updated_at
  before update on public.expenses
  for each row
  execute function update_expenses_updated_at();

