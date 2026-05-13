import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'

const STATUSES = ['open', 'partial', 'paid'] as const
type LoanStatus = (typeof STATUSES)[number]

async function loadAndOwn(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  id: string,
) {
  const { data } = await admin.from('finance_loans').select('*').eq('id', id).maybeSingle()
  if (!data || data.user_id !== userId) return null
  return data
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return runV1(_request, 'finance:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const loan = await loadAndOwn(admin, userId, params.id)
    if (!loan) return jsonError('Empréstimo não encontrado', 404)

    const { data: payments, error } = await admin
      .from('finance_loan_payments')
      .select('*')
      .eq('loan_id', params.id)
      .order('paid_on', { ascending: false })
    if (error) return jsonError(error.message, 400)

    const paid = (payments ?? []).reduce((acc, p) => acc + Number(p.amount), 0)
    const remaining = Math.max(0, Number(loan.principal) - paid)
    return jsonOk({ loan: { ...loan, paid, remaining }, payments: payments ?? [] })
  })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return runV1(request, 'finance:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const loan = await loadAndOwn(admin, userId, params.id)
    if (!loan) return jsonError('Empréstimo não encontrado', 404)

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const updates: Record<string, unknown> = {}
    if (typeof body.counterpart_name === 'string') updates.counterpart_name = body.counterpart_name.trim()
    if (typeof body.principal === 'number' || (body.principal !== undefined && body.principal !== null)) {
      const v = Number(body.principal)
      if (!Number.isFinite(v) || v <= 0) return jsonError('principal inválido', 400)
      updates.principal = v
    }
    if (typeof body.taken_on === 'string') updates.taken_on = body.taken_on
    if ('due_date' in body)
      updates.due_date = body.due_date === null ? null : typeof body.due_date === 'string' ? body.due_date : undefined
    if (typeof body.status === 'string' && STATUSES.includes(body.status as LoanStatus))
      updates.status = body.status
    if ('notes' in body) updates.notes = body.notes === null ? null : String(body.notes)

    for (const k of Object.keys(updates)) {
      if (updates[k] === undefined) delete updates[k]
    }

    if (Object.keys(updates).length === 0) return jsonError('Nenhum campo para atualizar', 400)

    const { data, error } = await admin
      .from('finance_loans')
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
    const loan = await loadAndOwn(admin, userId, params.id)
    if (!loan) return jsonError('Empréstimo não encontrado', 404)
    const { error } = await admin.from('finance_loans').delete().eq('id', params.id)
    if (error) return jsonError(error.message, 400)
    return jsonOk({ deleted: true, id: params.id })
  })
}
