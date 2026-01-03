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

        // 2. Buscar TODOS os eventos (recorrentes ou não)
        // Precisamos buscar eventos recorrentes globalmente (pois a data de inicio pode ser antiga)
        // Para otimizar, buscamos:
        // A) Eventos Únicos no futuro próximo
        // B) Eventos Recorrentes (is_recurring = true)

        // Como o Supabase não tem "OR" complexo fácil aqui misturado com datas diferentes, vamos simplificar:
        // Buscamos eventos unicos nas proximas 24h OR eventos recorrentes (todos)
        // WARNING: Se tiver MUITOS eventos recorrentes, isso pode pesar. Mas para app pessoal/pequeno é ok.

        const now = new Date()
        const endTime = new Date(now.getTime() + 24 * 60 * 60000).toISOString() // +24h

        const { data: events, error: eventsError } = await supabase
            .from('events')
            .select('*')
            // Logica simplificada: Pega tudo e filtra no código (Node.js é rápido pra filtrar arrays de <10k itens)
            // Se escalar, precisa criar func no banco.
            .or(`and(is_recurring.eq.false,start_time.gte.${now.toISOString()},start_time.lte.${endTime}),is_recurring.eq.true`)

        if (eventsError) throw eventsError

        if (!events || events.length === 0) {
            return NextResponse.json({ success: true, count: 0, msg: 'Sem eventos' })
        }

        log(`[Cron] Processando ${events.length} eventos (únicos + recorrentes).`)

        let notificationsSent = 0
        let telegramSent = 0
        let logsCreated = 0

        // 3. Processar cada evento
        for (const event of events) {

            // --- Lógica de Data/Hora do Evento ---
            let triggerDate: Date | null = null

            if (event.is_recurring) {
                // Verificar se hoje é um dia de ocorrência
                // getDay(): 0 = Domingo, ..., 6 = Sabado
                // recurrence_days supõe-se usar a mesma métrica
                const currentDay = now.getDay()
                const days = event.recurrence_days || []

                if (!days.includes(currentDay)) continue // Não é hoje

                // Validar recurrence_end_date
                if (event.recurrence_end_date) {
                    const endDate = new Date(event.recurrence_end_date)
                    if (now > endDate) continue // Já acabou a recorrência
                }

                // Construir data de Hoje com Hora do Evento
                const baseTime = new Date(event.start_time)
                triggerDate = new Date(now)
                triggerDate.setHours(baseTime.getHours(), baseTime.getMinutes(), 0, 0)

            } else {
                // Evento Único
                triggerDate = new Date(event.start_time)
            }

            if (!triggerDate) continue

            // --- Lógica de Disparo ---

            // Buscar Configs User
            const { data: userSettings } = await supabase
                .from('user_settings')
                .select('notification_minutes_before, notifications_enabled, telegram_chat_id')
                .eq('user_id', event.user_id)
                .single()

            const minutesBefore = userSettings?.notification_minutes_before || 15
            const isEnabled = userSettings?.notifications_enabled !== false
            const userTelegramId = userSettings?.telegram_chat_id

            if (!isEnabled) continue

            const triggerTimeMs = triggerDate.getTime() - (minutesBefore * 60000)
            const nowTime = now.getTime()

            // Se a hora do disparo já passou (e não passou muito, ex: janela de 15 min de atraso aceitavel)
            // Para não notificar coisas de 5h da manhã se o cron rodar meio dia
            const timeDiff = nowTime - triggerTimeMs
            const isTime = timeDiff >= 0 && timeDiff < 30 * 60000 // Aceita até 30min de atraso do cron

            if (isTime) {

                // Verificar Anti-spam (Log Hoje)
                // Checa se já enviou notificação para este evento *nas últimas 12 horas*
                const twelveHoursAgo = new Date(nowTime - 12 * 60 * 60 * 1000).toISOString()

                const { data: logExists } = await supabase
                    .from('notification_logs')
                    .select('id')
                    .eq('event_id', event.id)
                    .eq('user_id', event.user_id)
                    .gt('sent_at', twelveHoursAgo) // IMPORTANTE: Filtra por data recente
                    .single()

                if (logExists) continue

                // --- PREPARAR MENSAGENS ---
                const timeString = triggerDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

                // Título: Adiciona ícone se recorrente
                const displayTitle = `${event.is_recurring ? '🔁 ' : ''}${event.title}`

                // 1. Enviar WEB PUSH
                const { data: subs } = await supabase
                    .from('push_subscriptions')
                    .select('*')
                    .eq('user_id', event.user_id)

                if (subs && subs.length > 0) {
                    const payload = JSON.stringify({
                        title: `MHUB: ${displayTitle}`,
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

                // 2. Enviar TELEGRAM
                if (userTelegramId) {
                    try {
                        const message = `🔔 *MHUB Alerta*\n\n📅 **${displayTitle}**\n⏰ Horário: ${timeString}\n⏳ Faltam ${minutesBefore} minutos.`

                        const tgUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`
                        await fetch(tgUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: userTelegramId,
                                text: message,
                                parse_mode: 'Markdown'
                            })
                        })
                        telegramSent++
                        log(`[Telegram] Enviado para user ${event.user_id}`)
                    } catch (tgError) {
                        console.error('[Telegram Error]', tgError)
                    }
                }

                // --- REGISTRAR LOG ---
                try {
                    await supabase.from('notification_logs').insert({
                        event_id: event.id,
                        user_id: event.user_id,
                        status: 'sent',
                        sent_at: new Date().toISOString()
                    })
                    logsCreated++
                } catch (logErr) {
                    // Se falhar (ex: duplicate key se a migration não rodou), engole o erro para não quebrar o loop
                    console.error('Erro ao salvar log (provável duplicação):', logErr)
                }
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
