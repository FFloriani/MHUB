
-- Adiciona preferência de receber notificações múltiplas (reschedule)
alter table public.user_settings 
add column if not exists allow_multiple_notifications boolean default true;
