import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'
import { assertPlanOwned } from '@/lib/server/workout-api'

export async function POST(request: Request) {
  return runV1(request, 'workout:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const plan_id = typeof body.plan_id === 'string' ? body.plan_id : ''
    if (!plan_id) return jsonError('Campo obrigatório: plan_id', 400)
    if (!(await assertPlanOwned(admin, userId, plan_id))) {
      return jsonError('plan_id inválido', 404)
    }

    const day_letter = typeof body.day_letter === 'string' ? body.day_letter.trim() : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!day_letter || !name) {
      return jsonError('Campos obrigatórios: day_letter, name', 400)
    }

    let nextOrder = 0
    if (typeof body.order === 'number') {
      nextOrder = body.order
    } else {
      const { data: existing } = await admin
        .from('workout_days')
        .select('order')
        .eq('plan_id', plan_id)
        .order('order', { ascending: false })
        .limit(1)
      if (existing && existing.length > 0) nextOrder = (existing[0].order as number) + 1
    }

    const insert = {
      plan_id,
      day_letter,
      name,
      muscle_groups: Array.isArray(body.muscle_groups)
        ? (body.muscle_groups as unknown[]).filter((s): s is string => typeof s === 'string')
        : [],
      rest_hours: typeof body.rest_hours === 'number' ? body.rest_hours : 48,
      color: typeof body.color === 'string' ? body.color : '#6366f1',
      order: nextOrder,
    }

    const { data, error } = await admin.from('workout_days').insert(insert).select().single()
    if (error) return jsonError(error.message, 400)
    return jsonOk(data, 201)
  })
}
