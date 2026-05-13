import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'

/**
 * GET /api/v1/finance/budgets
 *
 * Sem parâmetros: `{ budgets: [...] }`.
 * `?year=YYYY&month=MM`: também devolve `usage: [{ category_id, spent, percent, status }]`
 * (status: ok | warning | over, baseado em `alert_threshold` e `monthly_limit`).
 */
export async function GET(request: Request) {
  return runV1(request, 'finance:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const url = new URL(request.url)
    const yearParam = url.searchParams.get('year')
    const monthParam = url.searchParams.get('month')

    const { data: budgets, error } = await admin
      .from('finance_budgets')
      .select('*')
      .eq('user_id', userId)
    if (error) throw error

    if (!yearParam || !monthParam) {
      return jsonOk({ budgets: budgets ?? [] })
    }

    const year = Number(yearParam)
    const month = Number(monthParam)
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return jsonError('Parâmetros year e month inválidos', 400)
    }

    const pad = (n: number) => String(n).padStart(2, '0')
    const monthStart = `${year}-${pad(month)}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const monthEnd = `${year}-${pad(month)}-${pad(lastDay)}`

    const list = budgets ?? []
    if (list.length === 0) return jsonOk({ budgets: [], usage: [] })

    const ids = list.map((b) => b.category_id)
    const { data: txs, error: e2 } = await admin
      .from('finance_transactions')
      .select('category_id, amount')
      .eq('user_id', userId)
      .eq('kind', 'expense')
      .in('category_id', ids)
      .gte('occurred_on', monthStart)
      .lte('occurred_on', monthEnd)
    if (e2) return jsonError(e2.message, 400)

    const sums = new Map<string, number>()
    for (const r of txs ?? []) {
      if (!r.category_id) continue
      sums.set(r.category_id, (sums.get(r.category_id) ?? 0) + Number(r.amount))
    }

    const usage = list.map((b) => {
      const spent = sums.get(b.category_id) ?? 0
      const percent = b.monthly_limit > 0 ? (spent / b.monthly_limit) * 100 : 0
      const status: 'ok' | 'warning' | 'over' =
        percent >= 100 ? 'over' : percent >= b.alert_threshold ? 'warning' : 'ok'
      return { category_id: b.category_id, spent, percent, status }
    })

    return jsonOk({ budgets: list, usage, year, month })
  })
}

/**
 * POST /api/v1/finance/budgets — upsert por (user_id, category_id).
 * Body: `{ category_id, monthly_limit, alert_threshold? (default 80) }`.
 */
export async function POST(request: Request) {
  return runV1(request, 'finance:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const category_id = typeof body.category_id === 'string' ? body.category_id : ''
    const monthly_limit = Number(body.monthly_limit)
    if (!category_id || !Number.isFinite(monthly_limit) || monthly_limit < 0) {
      return jsonError('Campos obrigatórios: category_id, monthly_limit (≥ 0)', 400)
    }

    const alert_threshold =
      body.alert_threshold === undefined ? 80 : Number(body.alert_threshold)
    if (!Number.isFinite(alert_threshold) || alert_threshold < 0 || alert_threshold > 100) {
      return jsonError('alert_threshold deve estar entre 0 e 100', 400)
    }

    const { data: catCheck } = await admin
      .from('finance_categories')
      .select('user_id')
      .eq('id', category_id)
      .maybeSingle()
    if (!catCheck || catCheck.user_id !== userId) {
      return jsonError('category_id inválido', 400)
    }

    const { data, error } = await admin
      .from('finance_budgets')
      .upsert({ user_id: userId, category_id, monthly_limit, alert_threshold }, {
        onConflict: 'user_id,category_id',
      })
      .select()
      .single()

    if (error) return jsonError(error.message, 400)
    return jsonOk(data, 201)
  })
}
