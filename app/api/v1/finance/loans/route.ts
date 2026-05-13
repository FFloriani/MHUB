import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'

const DIRECTIONS = ['lent', 'borrowed'] as const
type Direction = (typeof DIRECTIONS)[number]
const STATUSES = ['open', 'partial', 'paid'] as const

/**
 * GET /api/v1/finance/loans
 *
 * Sem parâmetros: `{ loans: [{ ...loan, paid, remaining }] }` com saldo calculado.
 * `?status=open|partial|paid`: filtra pelo status.
 * `?direction=lent|borrowed`: filtra pela direção.
 */
export async function GET(request: Request) {
  return runV1(request, 'finance:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const direction = url.searchParams.get('direction')

    let q = admin
      .from('finance_loans')
      .select('*')
      .eq('user_id', userId)
      .order('taken_on', { ascending: false })

    if (status && STATUSES.includes(status as (typeof STATUSES)[number])) q = q.eq('status', status)
    if (direction && DIRECTIONS.includes(direction as Direction)) q = q.eq('direction', direction)

    const { data: loans, error } = await q
    if (error) throw error

    const list = loans ?? []
    if (list.length === 0) return jsonOk({ loans: [] })

    const { data: payments, error: e2 } = await admin
      .from('finance_loan_payments')
      .select('loan_id, amount')
      .eq('user_id', userId)
      .in('loan_id', list.map((l) => l.id))
    if (e2) return jsonError(e2.message, 400)

    const sums = new Map<string, number>()
    for (const p of payments ?? []) {
      sums.set(p.loan_id, (sums.get(p.loan_id) ?? 0) + Number(p.amount))
    }

    const enriched = list.map((loan) => {
      const paid = sums.get(loan.id) ?? 0
      const remaining = Math.max(0, Number(loan.principal) - paid)
      return { ...loan, paid, remaining }
    })

    return jsonOk({ loans: enriched })
  })
}

export async function POST(request: Request) {
  return runV1(request, 'finance:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const counterpart_name = typeof body.counterpart_name === 'string' ? body.counterpart_name.trim() : ''
    const direction = body.direction as string
    const principal = Number(body.principal)
    const taken_on = typeof body.taken_on === 'string' ? body.taken_on : ''

    if (!counterpart_name || !DIRECTIONS.includes(direction as Direction) || !Number.isFinite(principal) || principal <= 0 || !taken_on) {
      return jsonError(
        'Campos obrigatórios: counterpart_name, direction (lent|borrowed), principal (>0), taken_on (YYYY-MM-DD)',
        400,
      )
    }

    const insert = {
      user_id: userId,
      counterpart_name,
      direction: direction as Direction,
      principal,
      taken_on,
      due_date: typeof body.due_date === 'string' ? body.due_date : null,
      status: 'open' as const,
      notes: typeof body.notes === 'string' ? body.notes : null,
    }

    const { data, error } = await admin.from('finance_loans').insert(insert).select().single()
    if (error) return jsonError(error.message, 400)
    return jsonOk(data, 201)
  })
}
