import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'
import type { FinanceKind } from '@/lib/data/finance/types'

const KINDS: FinanceKind[] = ['expense', 'income', 'investment']

function monthRange(year: number, month: number): { from: string; to: string } {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(end.getDate())}`,
  }
}

export async function GET(request: Request) {
  return runV1(request, 'finance:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const url = new URL(request.url)
    const year = url.searchParams.get('year')
    const month = url.searchParams.get('month')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const kind = url.searchParams.get('kind') as FinanceKind | 'all' | null

    let q = admin
      .from('finance_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false })

    let bounded = false
    if (year && month) {
      const y = Number(year)
      const m = Number(month)
      if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
        return jsonError('Parâmetros year e month inválidos', 400)
      }
      const r = monthRange(y, m)
      q = q.gte('occurred_on', r.from).lte('occurred_on', r.to)
      bounded = true
    } else if (from && to) {
      q = q.gte('occurred_on', from).lte('occurred_on', to)
      bounded = true
    }

    if (kind && kind !== 'all' && KINDS.includes(kind)) {
      q = q.eq('kind', kind)
    }

    if (!bounded) {
      q = q.limit(500)
    }

    const { data, error } = await q
    if (error) throw error
    return jsonOk({ transactions: data ?? [] })
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

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const kind = body.kind as string
    const amount = typeof body.amount === 'number' ? body.amount : Number(body.amount)
    const occurred_on = typeof body.occurred_on === 'string' ? body.occurred_on : ''

    if (!title || !KINDS.includes(kind as FinanceKind) || !Number.isFinite(amount) || !occurred_on) {
      return jsonError(
        'Campos obrigatórios: title, kind (expense|income|investment), amount (número), occurred_on (YYYY-MM-DD)',
        400,
      )
    }

    const insert = {
      user_id: userId,
      title,
      kind: kind as FinanceKind,
      amount,
      occurred_on,
      category_id: typeof body.category_id === 'string' ? body.category_id : null,
      payment_method: typeof body.payment_method === 'string' ? body.payment_method : null,
      notes: typeof body.notes === 'string' ? body.notes : null,
      tags: Array.isArray(body.tags) ? (body.tags as string[]).filter((t) => typeof t === 'string') : [],
      paid: body.paid !== undefined ? Boolean(body.paid) : true,
    }

    const { data, error } = await admin.from('finance_transactions').insert(insert).select().single()
    if (error) return jsonError(error.message, 400)
    return jsonOk(data, 201)
  })
}
