import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 1. Verificar se a migration de Events (updated_at) funcionou
        // Tentamos ordenar por updated_at. Se falhar, a coluna não existe.
        let eventsMigrationOk = false
        let eventsErrorMsg = null
        let eventsData = []

        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('updated_at', { ascending: false }) // Teste de fogo
                .limit(5)

            if (error) throw error
            eventsData = data
            eventsMigrationOk = true
        } catch (err: any) {
            eventsErrorMsg = err.message
        }

        // 2. Verificar se a migration de Settings (allow_multiple_notifications) funcionou
        let settingsMigrationOk = false
        let settingsErrorMsg = null

        try {
            const { error } = await supabase
                .from('user_settings')
                .select('allow_multiple_notifications') // Teste de fogo
                .limit(1)

            if (error) throw error
            settingsMigrationOk = true
        } catch (err: any) {
            settingsErrorMsg = err.message
        }

        return NextResponse.json({
            status: eventsMigrationOk && settingsMigrationOk ? 'OK' : 'MISSING_MIGRATIONS',
            checks: {
                events_updated_at: {
                    ok: eventsMigrationOk,
                    error: eventsErrorMsg
                },
                settings_allow_spam: {
                    ok: settingsMigrationOk,
                    error: settingsErrorMsg
                }
            },
            recent_events: eventsData.map(e => ({
                id: e.id,
                title: e.title,
                updated_at: e.updated_at,
                description_preview: e.description ? e.description.substring(0, 30) + '...' : null
            }))
        }, { status: 200 })

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
