import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'

async function loadLoanOwned(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  loanId: string,
) {
  const { data } = await admin.from('finance_loans').select('*').eq('id', loanId).maybeSingle()
  if (!data || data.user_id !== userId) return null
  return data
}

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

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return runV1(_request, 'finance:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const loan = await loadLoanOwned(admin, userId, params.id)
    if (!loan) return jsonError('Empréstimo não encontrado', 404)
    const { data, error } = await admin
      .from('finance_loan_payments')
      .select('*')
      .eq('loan_id', params.id)
      .order('paid_on', { ascending: false })
    if (error) return jsonError(error.message, 400)
    return jsonOk({ payments: data ?? [] })
  })
}

/**
 * POST /api/v1/finance/loans/:id/payments
 *
 * Registra pagamento parcial. Atualiza o status do empréstimo automaticamente
 * (`open` se ainda zero; `partial` se pagou alguma coisa; `paid` se já cobriu o principal).
 *
 * Body: `{ amount (>0), paid_on (YYYY-MM-DD), notes? }`.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  return runV1(request, 'finance:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const loan = await loadLoanOwned(admin, userId, params.id)
    if (!loan) return jsonError('Empréstimo não encontrado', 404)

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const amount = Number(body.amount)
    const paid_on = typeof body.paid_on === 'string' ? body.paid_on : ''
    if (!Number.isFinite(amount) || amount <= 0 || !paid_on) {
      return jsonError('Campos obrigatórios: amount (>0), paid_on (YYYY-MM-DD)', 400)
    }

    const { data, error } = await admin
      .from('finance_loan_payments')
      .insert({
        loan_id: params.id,
        user_id: userId,
        amount,
        paid_on,
        notes: typeof body.notes === 'string' ? body.notes : null,
      })
      .select()
      .single()
    if (error) return jsonError(error.message, 400)

    const totals = await recomputeStatus(admin, params.id, Number(loan.principal))
    return jsonOk({ payment: data, totals }, 201)
  })
}
