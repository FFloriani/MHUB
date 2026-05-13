import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'
import { assertDayOwned } from '@/lib/server/workout-api'

/**
 * GET /api/v1/workout/logs
 * Query opcional: `from`, `to` (YYYY-MM-DD baseado em completed_at), `day_id`, `limit` (default 100).
 */
export async function GET(request: Request) {
  return runV1(request, 'workout:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const dayId = url.searchParams.get('day_id')
    const limitParam = Number(url.searchParams.get('limit') ?? '100')
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 100

    let q = admin
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(limit)

    if (from) q = q.gte('completed_at', from)
    if (to) q = q.lte('completed_at', `${to}T23:59:59.999Z`)
    if (dayId) q = q.eq('day_id', dayId)

    const { data, error } = await q
    if (error) throw error
    return jsonOk({ logs: data ?? [] })
  })
}

/**
 * POST /api/v1/workout/logs
 * Body: `{ day_id?, event_id?, completed_at? (ISO, default agora), duration_minutes?, notes? }`
 */
export async function POST(request: Request) {
  return runV1(request, 'workout:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    let day_id: string | null = null
    if (typeof body.day_id === 'string' && body.day_id) {
      const { ok } = await assertDayOwned(admin, userId, body.day_id)
      if (!ok) return jsonError('day_id inválido', 400)
      day_id = body.day_id
    }

    const insert = {
      user_id: userId,
      day_id,
      event_id: typeof body.event_id === 'string' ? body.event_id : null,
      completed_at: typeof body.completed_at === 'string' ? body.completed_at : new Date().toISOString(),
      duration_minutes:
        body.duration_minutes === undefined || body.duration_minutes === null
          ? null
          : Number(body.duration_minutes),
      notes: typeof body.notes === 'string' ? body.notes : null,
    }

    const { data, error } = await admin.from('workout_logs').insert(insert).select().single()
    if (error) return jsonError(error.message, 400)
    return jsonOk(data, 201)
  })
}
