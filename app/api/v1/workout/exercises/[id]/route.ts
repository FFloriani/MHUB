import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'
import type { SupabaseClient } from '@supabase/supabase-js'

async function assertExerciseOwned(admin: SupabaseClient, userId: string, exerciseId: string): Promise<boolean> {
  const { data: ex, error: e1 } = await admin
    .from('workout_exercises')
    .select('id, day_id')
    .eq('id', exerciseId)
    .maybeSingle()
  if (e1 || !ex) return false
  const { data: day, error: e2 } = await admin
    .from('workout_days')
    .select('plan_id')
    .eq('id', ex.day_id)
    .maybeSingle()
  if (e2 || !day) return false
  const { data: plan, error: e3 } = await admin
    .from('workout_plans')
    .select('user_id')
    .eq('id', day.plan_id)
    .maybeSingle()
  if (e3 || !plan || plan.user_id !== userId) return false
  return true
}

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
