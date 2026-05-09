import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'

export async function GET(request: Request) {
  return runV1(request, 'agenda:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()

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
