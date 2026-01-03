import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    let debugLogs: string[] = []
    const log = (msg: string) => {
        console.log(msg)
        debugLogs.push(msg)
    }

    try {
        // 1. Configuração e Sanitização
        const subject = 'mailto:florianioficial@gmail.com'
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
        const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

        // Token do Bot (Fixo do Sistema)
        const telegramToken = '8445962431:AAEPZpph5oZh1GE1YWn9eylxzx4MTZnm3HA'

        if (!publicKey || !privateKey || !supabaseUrl || !supabaseServiceKey) {
            throw new Error('Configuração incompleta env vars')
        }

        webpush.setVapidDetails(subject, publicKey, privateKey)

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        // 2. Buscar eventos nas próximas 24 horas
        const now = new Date()
        const endTime = new Date(now.getTime() + 24 * 60 * 60000).toISOString() // +24h

        log(`[Cron] Rodando às ${now.toISOString()}. Buscando eventos até ${endTime}`)

        const { data: events, error: eventsError } = await supabase
            .from('events')
            .select('*')
            .eq('is_recurring', false)
            .gte('start_time', now.toISOString())
            .lte('start_time', endTime)

        if (eventsError) throw eventsError

        if (!events || events.length === 0) {
            return NextResponse.json({ success: true, count: 0, msg: 'Sem eventos futuros' })
        }

        log(`[Cron] Encontrados ${events.length} eventos candidatos.`)

        let notificationsSent = 0
        let telegramSent = 0
        let logsCreated = 0

        // 3. Processar cada evento
        for (const event of events) {

            // Buscar Configurações do User Dono do Evento (Agora inclindo telegram_chat_id)
            const { data: userSettings } = await supabase
                .from('user_settings')
                .select('notification_minutes_before, notifications_enabled, telegram_chat_id')
                .eq('user_id', event.user_id)
                .single()

            const minutesBefore = userSettings?.notification_minutes_before || 15
            const isEnabled = userSettings?.notifications_enabled !== false
            const userTelegramId = userSettings?.telegram_chat_id // ID Dinâmico do User

            if (!isEnabled) continue

            // Calcular o "Momento do Disparo"
            const eventTime = new Date(event.start_time).getTime()
            const triggerTime = eventTime - (minutesBefore * 60000)
            const nowTime = now.getTime()

            // Se já chegou a hora
            if (nowTime >= triggerTime) {

                // Verificar Anti-spam
                const { data: logExists } = await supabase
                    .from('notification_logs')
                    .select('id')
                    .eq('event_id', event.id)
                    .eq('user_id', event.user_id)
                    .single()

                if (logExists) continue

                // --- PREPARAR MENSAGENS ---
                const timeString = new Date(event.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

                // 1. Enviar WEB PUSH
                const { data: subs } = await supabase
                    .from('push_subscriptions')
                    .select('*')
                    .eq('user_id', event.user_id)

                if (subs && subs.length > 0) {
                    const payload = JSON.stringify({
                        title: `MHUB: ${event.title}`,
                        body: `Começa em ${minutesBefore} min: ${timeString}`,
                        url: '/'
                    })

                    for (const sub of subs) {
                        try {
                            await webpush.sendNotification(sub.subscription as any, payload)
                            notificationsSent++
                        } catch (err: any) {
                            if (err.statusCode === 410 || err.statusCode === 404) {
                                await supabase.from('push_subscriptions').delete().eq('id', sub.id)
                            }
                        }
                    }
                }

                // 2. Enviar TELEGRAM (Dinâmico)
                if (userTelegramId) {
                    try {
                        const message = `🔔 *MHUB Alerta*\n\n📅 **${event.title}**\n⏰ Começa às: ${timeString}\n⏳ Faltam ${minutesBefore} minutos.`

                        const tgUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`
                        await fetch(tgUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: userTelegramId, // Aqui vai o ID do usuário específico
                                text: message,
                                parse_mode: 'Markdown'
                            })
                        })
                        telegramSent++
                        log(`[Telegram] Enviado para user ${event.user_id} (Chat: ${userTelegramId})`)
                    } catch (tgError) {
                        console.error('[Telegram Error]', tgError)
                    }
                } else {
                    log(`[Telegram] User ${event.user_id} não configurou Telegram.`)
                }

                // --- REGISTRAR LOG ---
                await supabase.from('notification_logs').insert({
                    event_id: event.id,
                    user_id: event.user_id,
                    status: 'sent',
                    sent_at: new Date().toISOString()
                })
                logsCreated++
            }
        }

        return NextResponse.json({
            success: true,
            notificationsSent,
            telegramSent,
            logsCreated,
            debug: debugLogs
        })

    } catch (error: any) {
        console.error('Cron Error', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
