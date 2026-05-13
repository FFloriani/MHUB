import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'
import { assertDayOwned } from '@/lib/server/workout-api'

export async function POST(request: Request) {
  return runV1(request, 'workout:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const day_id = typeof body.day_id === 'string' ? body.day_id : ''
    if (!day_id) return jsonError('Campo obrigatório: day_id', 400)
    const { ok } = await assertDayOwned(admin, userId, day_id)
    if (!ok) return jsonError('day_id inválido', 404)

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return jsonError('Campo obrigatório: name', 400)

    let nextOrder = 0
    if (typeof body.order === 'number') {
      nextOrder = body.order
    } else {
      const { data: existing } = await admin
        .from('workout_exercises')
        .select('order')
        .eq('day_id', day_id)
        .order('order', { ascending: false })
        .limit(1)
      if (existing && existing.length > 0) nextOrder = (existing[0].order as number) + 1
    }

    const insert = {
      day_id,
      name,
      sets: typeof body.sets === 'number' ? body.sets : 3,
      reps: typeof body.reps === 'string' ? body.reps : '10',
      rest_seconds: typeof body.rest_seconds === 'number' ? body.rest_seconds : 60,
      weight_kg:
        body.weight_kg === null || body.weight_kg === undefined ? null : Number(body.weight_kg),
      notes: typeof body.notes === 'string' ? body.notes : null,
      order: nextOrder,
    }

    const { data, error } = await admin.from('workout_exercises').insert(insert).select().single()
    if (error) return jsonError(error.message, 400)
    return jsonOk(data, 201)
  })
}
