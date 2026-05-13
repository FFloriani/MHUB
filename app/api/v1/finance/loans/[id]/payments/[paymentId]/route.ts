import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'

async function recomputeStatus(
  admin: ReturnType<typeof getSupabaseAdmin>,
  loanId: string,
  principal: number,
) {
  const { data: pays } = await admin
    .from('finance_loan_payments')
    .select('amount')
    .eq('loan_id', loanId)
  const paid = (pays ?? []).reduce((acc, p) => acc + Number(p.amount), 0)
  const status: 'open' | 'partial' | 'paid' = paid <= 0 ? 'open' : paid >= principal ? 'paid' : 'partial'
  await admin.from('finance_loans').update({ status }).eq('id', loanId)
  return { paid, status }
}

async function loadOwnedPayment(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  loanId: string,
  paymentId: string,
) {
  const { data } = await admin
    .from('finance_loan_payments')
    .select('*')
    .eq('id', paymentId)
    .eq('loan_id', loanId)
    .maybeSingle()
  if (!data || data.user_id !== userId) return null
  return data
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; paymentId: string } },
) {
  return runV1(request, 'finance:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const payment = await loadOwnedPayment(admin, userId, params.id, params.paymentId)
    if (!payment) return jsonError('Pagamento não encontrado', 404)

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const updates: Record<string, unknown> = {}
    if (body.amount !== undefined) {
      const v = Number(body.amount)
      if (!Number.isFinite(v) || v <= 0) return jsonError('amount inválido', 400)
      updates.amount = v
    }
    if (typeof body.paid_on === 'string') updates.paid_on = body.paid_on
    if ('notes' in body) updates.notes = body.notes === null ? null : String(body.notes)

    if (Object.keys(updates).length === 0) return jsonError('Nenhum campo para atualizar', 400)

    const { data, error } = await admin
      .from('finance_loan_payments')
      .update(updates)
      .eq('id', params.paymentId)
      .select()
      .single()
    if (error) return jsonError(error.message, 400)

    const { data: loan } = await admin
      .from('finance_loans')
      .select('principal')
      .eq('id', params.id)
      .maybeSingle()
    const totals = loan ? await recomputeStatus(admin, params.id, Number(loan.principal)) : null

    return jsonOk({ payment: data, totals })
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; paymentId: string } },
) {
  return runV1(_request, 'finance:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const payment = await loadOwnedPayment(admin, userId, params.id, params.paymentId)
    if (!payment) return jsonError('Pagamento não encontrado', 404)
    const { error } = await admin
      .from('finance_loan_payments')
      .delete()
      .eq('id', params.paymentId)
    if (error) return jsonError(error.message, 400)

    const { data: loan } = await admin
      .from('finance_loans')
      .select('principal')
      .eq('id', params.id)
      .maybeSingle()
    const totals = loan ? await recomputeStatus(admin, params.id, Number(loan.principal)) : null

    return jsonOk({ deleted: true, id: params.paymentId, totals })
  })
}
