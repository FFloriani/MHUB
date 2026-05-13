import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return runV1(request, 'finance:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const { data: existing } = await admin
      .from('finance_budgets')
      .select('user_id')
      .eq('id', params.id)
      .maybeSingle()
    if (!existing || existing.user_id !== userId) return jsonError('Orçamento não encontrado', 404)

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const updates: Record<string, unknown> = {}
    if (body.monthly_limit !== undefined) {
      const v = Number(body.monthly_limit)
      if (!Number.isFinite(v) || v < 0) return jsonError('monthly_limit inválido', 400)
      updates.monthly_limit = v
    }
    if (body.alert_threshold !== undefined) {
      const v = Number(body.alert_threshold)
      if (!Number.isFinite(v) || v < 0 || v > 100)
        return jsonError('alert_threshold deve estar entre 0 e 100', 400)
      updates.alert_threshold = v
    }

    if (Object.keys(updates).length === 0) return jsonError('Nenhum campo para atualizar', 400)

    const { data, error } = await admin
      .from('finance_budgets')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()
    if (error) return jsonError(error.message, 400)
    return jsonOk(data)
  })
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  return runV1(_request, 'finance:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const { data: existing } = await admin
      .from('finance_budgets')
      .select('user_id')
      .eq('id', params.id)
      .maybeSingle()
    if (!existing || existing.user_id !== userId) return jsonError('Orçamento não encontrado', 404)

    const { error } = await admin.from('finance_budgets').delete().eq('id', params.id)
    if (error) return jsonError(error.message, 400)
    return jsonOk({ deleted: true, id: params.id })
  })
}
