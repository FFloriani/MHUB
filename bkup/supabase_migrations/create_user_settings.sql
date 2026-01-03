-- Cria a tabela de Configurações do Usuário
create table public.user_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  notifications_enabled boolean default false,
  notification_minutes_before integer default 15,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id)
);

-- Cria índice para busca rápida por user_id
create index if not exists idx_user_settings_user_id on public.user_settings(user_id);

-- Habilita segurança (Row Level Security)
alter table public.user_settings enable row level security;

-- Cria regras de segurança para CONFIGURAÇÕES
create policy "Usuários podem ver apenas suas próprias configurações"
  on public.user_settings for select using (auth.uid() = user_id);

create policy "Usuários podem criar suas configurações"
  on public.user_settings for insert with check (auth.uid() = user_id);

create policy "Usuários podem atualizar suas configurações"
  on public.user_settings for update using (auth.uid() = user_id);

create policy "Usuários podem deletar suas configurações"
  on public.user_settings for delete using (auth.uid() = user_id);

-- Função para atualizar updated_at automaticamente
create or replace function update_user_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger para atualizar updated_at
create trigger update_user_settings_updated_at
  before update on public.user_settings
  for each row
  execute function update_user_settings_updated_at();
