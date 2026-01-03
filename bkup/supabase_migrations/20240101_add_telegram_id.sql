-- Adiciona suporte a Chat ID do Telegram nas configurações
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- (Opcional) Comentário para documentação
COMMENT ON COLUMN public.user_settings.telegram_chat_id IS 'ID numérico do chat do Telegram para envio de notificações via Bot';
