import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'

/**
 * GET /api/v1/tasks
 *
 * Padrão (sem parâmetros): pendentes + concluídas dos últimos 7 dias.
 * Query opcional:
 *  - `status=pending|completed|all` (default: combo padrão)
 *  - `from=YYYY-MM-DD&to=YYYY-MM-DD` filtra por `target_date`
 *  - `limit` (default 500)
 */
export async function GET(request: Request) {
  return runV1(request, 'agenda:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const limitParam = Number(url.searchParams.get('limit') ?? '500')
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : 500

    if (status === 'pending' || status === 'completed' || status === 'all' || from || to) {
      let q = admin
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('target_date', { ascending: true, nullsFirst: false })
        .limit(limit)

      if (status === 'pending') q = q.eq('is_completed', false)
      else if (status === 'completed') q = q.eq('is_completed', true)
      if (from) q = q.gte('target_date', from)
      if (to) q = q.lte('target_date', to)

      const { data, error } = await q
      if (error) throw error
      return jsonOk({ tasks: data ?? [] })
    }

    const { data: pending, error: e1 } = await admin
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .order('target_date', { ascending: true, nullsFirst: false })

    if (e1) throw e1

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cutoff = sevenDaysAgo.toISOString().split('T')[0]

    const { data: completed, error: e2 } = await admin
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('is_completed', true)
      .gte('target_date', cutoff)
      .order('target_date', { ascending: false })

    if (e2) throw e2

    const tasks = [...(pending || []), ...(completed || [])]
    return jsonOk({ tasks })
  })
}

export async function POST(request: Request) {
  return runV1(request, 'agenda:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return jsonError('Campo obrigatório: title', 400)

    const insert = {
      user_id: userId,
      title,
      is_completed: Boolean(body.is_completed),
      target_date: typeof body.target_date === 'string' ? body.target_date : null,
    }

    const { data, error } = await admin.from('tasks').insert(insert).select().single()
    if (error) return jsonError(error.message, 400)
    return jsonOk(data, 201)
  })
}
