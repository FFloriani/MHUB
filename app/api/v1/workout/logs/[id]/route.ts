import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'
import { assertDayOwned } from '@/lib/server/workout-api'

async function assertLogOwned(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  id: string,
): Promise<boolean> {
  const { data } = await admin.from('workout_logs').select('user_id').eq('id', id).maybeSingle()
  return !!data && data.user_id === userId
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return runV1(request, 'workout:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    if (!(await assertLogOwned(admin, userId, params.id))) {
      return jsonError('Registro não encontrado', 404)
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const updates: Record<string, unknown> = {}
    if ('day_id' in body) {
      if (body.day_id === null) {
        updates.day_id = null
      } else if (typeof body.day_id === 'string') {
        const { ok } = await assertDayOwned(admin, userId, body.day_id)
        if (!ok) return jsonError('day_id inválido', 400)
        updates.day_id = body.day_id
      }
    }
    if ('event_id' in body)
      updates.event_id = body.event_id === null ? null : String(body.event_id)
    if (typeof body.completed_at === 'string') updates.completed_at = body.completed_at
    if ('duration_minutes' in body)
      updates.duration_minutes = body.duration_minutes === null ? null : Number(body.duration_minutes)
    if ('notes' in body) updates.notes = body.notes === null ? null : String(body.notes)

    if (Object.keys(updates).length === 0) return jsonError('Nenhum campo para atualizar', 400)

    const { data, error } = await admin
      .from('workout_logs')
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
    if (!(await assertLogOwned(admin, userId, params.id))) {
      return jsonError('Registro não encontrado', 404)
    }
    const { error } = await admin.from('workout_logs').delete().eq('id', params.id)
    if (error) return jsonError(error.message, 400)
    return jsonOk({ deleted: true, id: params.id })
  })
}
