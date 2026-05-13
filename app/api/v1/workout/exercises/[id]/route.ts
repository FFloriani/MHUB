import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'
import { assertDayOwned, assertExerciseOwned } from '@/lib/server/workout-api'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return runV1(request, 'workout:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const ok = await assertExerciseOwned(admin, userId, params.id)
    if (!ok) return jsonError('Exercício não encontrado', 404)

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const updates: Record<string, unknown> = {}
    if (typeof body.name === 'string') updates.name = body.name
    if (typeof body.sets === 'number') updates.sets = body.sets
    if (typeof body.reps === 'string') updates.reps = body.reps
    if (typeof body.rest_seconds === 'number') updates.rest_seconds = body.rest_seconds
    if ('weight_kg' in body) updates.weight_kg = body.weight_kg === null ? null : Number(body.weight_kg)
    if ('notes' in body) updates.notes = body.notes === null ? null : String(body.notes)
    if (typeof body.order === 'number') updates.order = body.order
    if (typeof body.day_id === 'string' && body.day_id) {
      const check = await assertDayOwned(admin, userId, body.day_id)
      if (!check.ok) return jsonError('day_id inválido', 400)
      updates.day_id = body.day_id
    }

    if (Object.keys(updates).length === 0) return jsonError('Nenhum campo para atualizar', 400)

    const { data, error } = await admin
      .from('workout_exercises')
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
    const ok = await assertExerciseOwned(admin, userId, params.id)
    if (!ok) return jsonError('Exercício não encontrado', 404)
    const { error } = await admin.from('workout_exercises').delete().eq('id', params.id)
    if (error) return jsonError(error.message, 400)
    return jsonOk({ deleted: true, id: params.id })
  })
}
