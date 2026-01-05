-- Adiciona updated_at para a tabela events (CRÍTICO para reenvio de notificações e sincronia)
alter table public.events 
add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

-- Garante que created_at existe (caso não exista, cria também, mas costuma ser padrão)
alter table public.events 
add column if not exists created_at timestamp with time zone default timezone('utc'::text, now()) not null;

-- Função genérica para atualizar updated_at (se não existir ainda)
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger específico para events
drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row
execute procedure public.handle_updated_at();
