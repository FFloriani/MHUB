-- Tabela para armazenar as assinaturas de Web Push
create table if not exists public.push_subscriptions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint push_subscriptions_pkey primary key (id),
  -- Garante que o mesmo endpoint não seja duplicado para o mesmo usuário
  constraint push_subscriptions_endpoint_key unique (user_id, subscription)
);

-- Habilitar RLS (Row Level Security)
alter table public.push_subscriptions enable row level security;

-- Políticas de Segurança (RLS)
-- Usuário só pode ver suas próprias assinaturas
create policy "Users can view own subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

-- Usuário pode inserir suas próprias assinaturas
create policy "Users can insert own subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

-- Usuário pode deletar suas próprias assinaturas
create policy "Users can delete own subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- Trigger para atualizar o updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row
  execute function public.handle_updated_at();
