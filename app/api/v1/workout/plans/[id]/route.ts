import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'
import { assertPlanOwned } from '@/lib/server/workout-api'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return runV1(_request, 'workout:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    if (!(await assertPlanOwned(admin, userId, params.id))) {
      return jsonError('Plano não encontrado', 404)
    }
    const { data, error } = await admin.from('workout_plans').select('*').eq('id', params.id).single()
    if (error) return jsonError(error.message, 400)
    return jsonOk(data)
  })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return runV1(request, 'workout:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    if (!(await assertPlanOwned(admin, userId, params.id))) {
      return jsonError('Plano não encontrado', 404)
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const updates: Record<string, unknown> = {}
    if (typeof body.name === 'string') updates.name = body.name.trim()
    if (typeof body.division_type === 'string') updates.division_type = body.division_type

    if ('is_active' in body) {
      const activate = Boolean(body.is_active)
      if (activate) {
        const { error: deactErr } = await admin
          .from('workout_plans')
          .update({ is_active: false })
          .eq('user_id', userId)
        if (deactErr) return jsonError(deactErr.message, 400)
      }
      updates.is_active = activate
    }

    if (Object.keys(updates).length === 0) return jsonError('Nenhum campo para atualizar', 400)

    const { data, error } = await admin
      .from('workout_plans')
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
    if (!(await assertPlanOwned(admin, userId, params.id))) {
      return jsonError('Plano não encontrado', 404)
    }
    const { error } = await admin.from('workout_plans').delete().eq('id', params.id)
    if (error) return jsonError(error.message, 400)
    return jsonOk({ deleted: true, id: params.id })
  })
}
