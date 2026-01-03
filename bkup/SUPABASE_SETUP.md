# Configuração do Supabase - Tabela de Configurações

Para habilitar as configurações personalizadas de notificações, você precisa criar a tabela `user_settings` no Supabase.

## Passo a Passo:

1. Acesse o **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (no menu lateral)
4. Clique em **New Query**
5. Cole o conteúdo do arquivo `supabase_migrations/create_user_settings.sql`
6. Clique em **Run** ou pressione `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

## O que o SQL faz:

- Cria a tabela `user_settings` com:
  - `notifications_enabled`: Se o usuário quer receber notificações (boolean)
  - `notification_minutes_before`: Quantos minutos antes do compromisso notificar (integer)
  
- Configura **Row Level Security (RLS)** para que cada usuário só veja/edite suas próprias configurações

- Cria um trigger para atualizar automaticamente o campo `updated_at`

## Verificação:

Após executar o SQL, você pode verificar se a tabela foi criada:

1. Vá em **Table Editor** no Supabase
2. Você deve ver a tabela `user_settings` na lista
3. A tabela deve estar vazia inicialmente (será preenchida quando os usuários acessarem as configurações)

## Pronto!

Após executar o SQL, o sistema de configurações estará funcionando. Os usuários poderão:

- Acessar `/settings` para configurar suas preferências
- Escolher se querem receber notificações ou não
- Definir quantos minutos antes do compromisso querem ser notificados (1 minuto até 24 horas)

