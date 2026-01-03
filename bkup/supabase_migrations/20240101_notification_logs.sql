-- Cria tabela para rastrear notificações enviadas e evitar spam/duplicidade
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'sent', -- 'sent', 'failed'
    
    -- Garante que só existe 1 log por evento por usuário (ou seja, só avisa 1 vez)
    UNIQUE(event_id, user_id)
);

-- Ativar RLS (Segurança)
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Política: Usuário só vê seus próprios logs
CREATE POLICY "Users can see own logs" ON public.notification_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Política: Service Role (Cron) pode inserir logs
-- (Service Role ignora RLS, mas é bom documentar)
