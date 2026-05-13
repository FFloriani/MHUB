import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'
import { assertDayOwned, assertPlanOwned } from '@/lib/server/workout-api'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return runV1(_request, 'workout:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const { ok } = await assertDayOwned(admin, userId, params.id)
    if (!ok) return jsonError('Dia não encontrado', 404)

    const { data: day, error } = await admin
      .from('workout_days')
      .select('*')
      .eq('id', params.id)
      .single()
    if (error) return jsonError(error.message, 400)

    const { data: exercises } = await admin
      .from('workout_exercises')
      .select('*')
      .eq('day_id', params.id)
      .order('order', { ascending: true })

    return jsonOk({ ...day, exercises: exercises ?? [] })
  })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return runV1(request, 'workout:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const { ok } = await assertDayOwned(admin, userId, params.id)
    if (!ok) return jsonError('Dia não encontrado', 404)

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const updates: Record<string, unknown> = {}
    if (typeof body.day_letter === 'string') updates.day_letter = body.day_letter.trim()
    if (typeof body.name === 'string') updates.name = body.name.trim()
    if (Array.isArray(body.muscle_groups))
      updates.muscle_groups = (body.muscle_groups as unknown[]).filter((s): s is string => typeof s === 'string')
    if (typeof body.rest_hours === 'number') updates.rest_hours = body.rest_hours
    if (typeof body.color === 'string') updates.color = body.color
    if (typeof body.order === 'number') updates.order = body.order
    if (typeof body.plan_id === 'string' && body.plan_id) {
      if (!(await assertPlanOwned(admin, userId, body.plan_id))) {
        return jsonError('plan_id inválido', 400)
      }
      updates.plan_id = body.plan_id
    }

    if (Object.keys(updates).length === 0) return jsonError('Nenhum campo para atualizar', 400)

    const { data, error } = await admin
      .from('workout_days')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()
    if (error) return jsonError(error.message, 400)
    return jsonOk(data)
  })
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  return runV1(_request, 'workout:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const { ok } = await assertDayOwned(admin, userId, params.id)
    if (!ok) return jsonError('Dia não encontrado', 404)
    const { error } = await admin.from('workout_days').delete().eq('id', params.id)
    if (error) return jsonError(error.message, 400)
    return jsonOk({ deleted: true, id: params.id })
  })
}
