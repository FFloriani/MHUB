import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'

export async function GET(request: Request) {
  return runV1(request, 'workout:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('workout_plans')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return jsonOk({ plans: data ?? [] })
  })
}

/**
 * Cria plano. Se `is_active=true`, desativa os outros do usuário automaticamente.
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

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return jsonError('Campo obrigatório: name', 400)

    const setActive = body.is_active !== undefined ? Boolean(body.is_active) : false

    if (setActive) {
      const { error: deactErr } = await admin
        .from('workout_plans')
        .update({ is_active: false })
        .eq('user_id', userId)
      if (deactErr) return jsonError(deactErr.message, 400)
    }

    const insert = {
      user_id: userId,
      name,
      division_type: typeof body.division_type === 'string' ? body.division_type : 'AB',
      is_active: setActive,
    }

    const { data, error } = await admin.from('workout_plans').insert(insert).select().single()
    if (error) return jsonError(error.message, 400)
    return jsonOk(data, 201)
  })
}
