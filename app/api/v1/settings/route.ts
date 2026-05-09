import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'

const DEFAULTS = {
  notifications_enabled: false,
  notification_minutes_before: 15,
  allow_multiple_notifications: true,
  telegram_chat_id: null as string | null,
}

export async function GET(request: Request) {
  return runV1(request, 'settings:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.from('user_settings').select('*').eq('user_id', userId).maybeSingle()

    if (error) throw error
    if (!data) return jsonOk({ settings: DEFAULTS })

    return jsonOk({
      settings: {
        notifications_enabled: data.notifications_enabled ?? DEFAULTS.notifications_enabled,
        notification_minutes_before: data.notification_minutes_before ?? DEFAULTS.notification_minutes_before,
        allow_multiple_notifications:
          (data as { allow_multiple_notifications?: boolean }).allow_multiple_notifications ??
          DEFAULTS.allow_multiple_notifications,
        telegram_chat_id:
          (data as { telegram_chat_id?: string | null }).telegram_chat_id ?? DEFAULTS.telegram_chat_id,
      },
    })
  })
}

export async function PATCH(request: Request) {
  return runV1(request, 'settings:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const payload: Record<string, unknown> = {}
    if ('notifications_enabled' in body) payload.notifications_enabled = Boolean(body.notifications_enabled)
    if ('notification_minutes_before' in body) {
      const n = Number(body.notification_minutes_before)
      if (!Number.isFinite(n)) return jsonError('notification_minutes_before inválido', 400)
      payload.notification_minutes_before = n
    }
    if ('allow_multiple_notifications' in body)
      payload.allow_multiple_notifications = Boolean(body.allow_multiple_notifications)
    if ('telegram_chat_id' in body) {
      payload.telegram_chat_id =
        body.telegram_chat_id === null || body.telegram_chat_id === ''
          ? null
          : String(body.telegram_chat_id)
    }

    if (Object.keys(payload).length === 0) return jsonError('Nenhum campo para atualizar', 400)

    const { data: existing } = await admin.from('user_settings').select('id').eq('user_id', userId).maybeSingle()

    if (existing) {
      const { data, error } = await admin
        .from('user_settings')
        .update(payload)
        .eq('user_id', userId)
        .select()
        .single()
      if (error) return jsonError(error.message, 400)
      return jsonOk({
        settings: {
          notifications_enabled: data.notifications_enabled,
          notification_minutes_before: data.notification_minutes_before,
          allow_multiple_notifications: (data as { allow_multiple_notifications?: boolean })
            .allow_multiple_notifications,
          telegram_chat_id: (data as { telegram_chat_id?: string | null }).telegram_chat_id ?? null,
        },
      })
    }

    const insert = {
      user_id: userId,
      notifications_enabled:
        typeof payload.notifications_enabled === 'boolean'
          ? payload.notifications_enabled
          : DEFAULTS.notifications_enabled,
      notification_minutes_before:
        typeof payload.notification_minutes_before === 'number'
          ? payload.notification_minutes_before
          : DEFAULTS.notification_minutes_before,
      ...payload,
    }

    const { data, error } = await admin.from('user_settings').insert(insert).select().single()
    if (error) return jsonError(error.message, 400)
    return jsonOk({
      settings: {
        notifications_enabled: data.notifications_enabled,
        notification_minutes_before: data.notification_minutes_before,
        allow_multiple_notifications: (data as { allow_multiple_notifications?: boolean })
          .allow_multiple_notifications,
        telegram_chat_id: (data as { telegram_chat_id?: string | null }).telegram_chat_id ?? null,
      },
    })
  })
}
