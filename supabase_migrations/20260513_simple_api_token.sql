-- Adiciona token de API simples por usuário em user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS api_token TEXT UNIQUE;

-- Gera token para usuários existentes que ainda não têm
UPDATE user_settings
SET api_token = 'mhub_' || encode(gen_random_bytes(32), 'hex')
WHERE api_token IS NULL;
