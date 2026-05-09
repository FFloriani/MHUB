import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'
import type { FinanceKind } from '@/lib/data/finance/types'

const KINDS: FinanceKind[] = ['expense', 'income', 'investment']

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return runV1(request, 'finance:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const { data: existing } = await admin
      .from('finance_transactions')
      .select('user_id')
      .eq('id', params.id)
      .maybeSingle()
    if (!existing || existing.user_id !== userId) return jsonError('Transação não encontrada', 404)

    const updates: Record<string, unknown> = {}
    if (typeof body.title === 'string') updates.title = body.title
    if (typeof body.kind === 'string' && KINDS.includes(body.kind as FinanceKind))
      updates.kind = body.kind
    if (typeof body.amount === 'number') updates.amount = body.amount
    else if (body.amount !== undefined && body.amount !== null) updates.amount = Number(body.amount)
    if (typeof body.occurred_on === 'string') updates.occurred_on = body.occurred_on
    if ('category_id' in body)
      updates.category_id =
        body.category_id === null ? null : typeof body.category_id === 'string' ? body.category_id : undefined
    if ('payment_method' in body)
      updates.payment_method =
        body.payment_method === null
          ? null
          : typeof body.payment_method === 'string'
            ? body.payment_method
            : undefined
    if ('notes' in body)
      updates.notes = body.notes === null ? null : typeof body.notes === 'string' ? body.notes : undefined
    if (Array.isArray(body.tags)) updates.tags = body.tags
    if ('paid' in body) updates.paid = Boolean(body.paid)

    for (const k of Object.keys(updates)) {
      if (updates[k] === undefined) delete updates[k]
    }

    const { data, error } = await admin
      .from('finance_transactions')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()
    if (error) return jsonError(error.message, 400)
    return jsonOk(data)
  })
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  return runV1(request, 'finance:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const { data: existing } = await admin
      .from('finance_transactions')
      .select('user_id')
      .eq('id', params.id)
      .maybeSingle()
    if (!existing || existing.user_id !== userId) return jsonError('Transação não encontrada', 404)

    const { error } = await admin.from('finance_transactions').delete().eq('id', params.id)
    if (error) return jsonError(error.message, 400)
    return jsonOk({ deleted: true, id: params.id })
  })
}
