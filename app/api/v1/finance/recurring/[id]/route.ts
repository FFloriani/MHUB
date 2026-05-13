import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'
import type { FinanceKind } from '@/lib/data/finance/types'

const KINDS: FinanceKind[] = ['expense', 'income', 'investment']

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return runV1(request, 'finance:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const { data: existing } = await admin
      .from('finance_recurring')
      .select('user_id')
      .eq('id', params.id)
      .maybeSingle()
    if (!existing || existing.user_id !== userId) return jsonError('Recorrente não encontrado', 404)

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const updates: Record<string, unknown> = {}
    if (typeof body.title === 'string') updates.title = body.title
    if (typeof body.kind === 'string' && KINDS.includes(body.kind as FinanceKind))
      updates.kind = body.kind
    if (typeof body.amount === 'number') updates.amount = body.amount
    else if (body.amount !== undefined && body.amount !== null) updates.amount = Number(body.amount)
    if (typeof body.day_of_month === 'number') {
      if (body.day_of_month < 1 || body.day_of_month > 31)
        return jsonError('day_of_month deve estar entre 1 e 31', 400)
      updates.day_of_month = Math.round(body.day_of_month)
    }
    if (typeof body.start_date === 'string') updates.start_date = body.start_date
    if ('end_date' in body)
      updates.end_date = body.end_date === null ? null : typeof body.end_date === 'string' ? body.end_date : undefined
    if ('category_id' in body)
      updates.category_id =
        body.category_id === null ? null : typeof body.category_id === 'string' ? body.category_id : undefined
    if ('payment_method' in body)
      updates.payment_method =
        body.payment_method === null ? null : typeof body.payment_method === 'string' ? body.payment_method : undefined
    if ('notes' in body) updates.notes = body.notes === null ? null : String(body.notes)
    if ('active' in body) updates.active = Boolean(body.active)

    for (const k of Object.keys(updates)) {
      if (updates[k] === undefined) delete updates[k]
    }

    if (Object.keys(updates).length === 0) return jsonError('Nenhum campo para atualizar', 400)

    const { data, error } = await admin
      .from('finance_recurring')
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
      .from('finance_recurring')
      .select('user_id')
      .eq('id', params.id)
      .maybeSingle()
    if (!existing || existing.user_id !== userId) return jsonError('Recorrente não encontrado', 404)

    const { error } = await admin.from('finance_recurring').delete().eq('id', params.id)
    if (error) return jsonError(error.message, 400)
    return jsonOk({ deleted: true, id: params.id })
  })
}
