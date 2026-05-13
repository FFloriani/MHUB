import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'

/**
 * POST /api/v1/finance/recurring/materialize
 *
 * Para cada template ativo do usuário cujo `start_date <= fim do mês alvo` e
 * (`end_date` é null ou `>= início do mês`), cria a transação correspondente
 * no mês `{ year, month }` se ainda não existir.
 *
 * Body: `{ year: number, month: number }` (mês 1-12).
 * Resposta: `{ created: number, year, month }`.
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

    const year = Number(body.year)
    const month = Number(body.month)
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return jsonError('Campos obrigatórios: year, month (1-12)', 400)
    }

    const pad = (n: number) => String(n).padStart(2, '0')
    const monthStart = `${year}-${pad(month)}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const monthEnd = `${year}-${pad(month)}-${pad(lastDay)}`

    const { data: templates, error: tplErr } = await admin
      .from('finance_recurring')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .lte('start_date', monthEnd)

    if (tplErr) return jsonError(tplErr.message, 400)

    const eligible = (templates ?? []).filter((t) => !t.end_date || t.end_date >= monthStart)
    if (eligible.length === 0) return jsonOk({ created: 0, year, month })

    const ids = eligible.map((t) => t.id)
    const { data: existing, error: exErr } = await admin
      .from('finance_transactions')
      .select('recurring_id')
      .eq('user_id', userId)
      .gte('occurred_on', monthStart)
      .lte('occurred_on', monthEnd)
      .in('recurring_id', ids)

    if (exErr) return jsonError(exErr.message, 400)
    const already = new Set((existing ?? []).map((r) => r.recurring_id))

    const toInsert = eligible
      .filter((t) => !already.has(t.id))
      .map((t) => {
        const day = Math.min(t.day_of_month, lastDay)
        const occurred = `${year}-${pad(month)}-${pad(day)}`
        return {
          user_id: userId,
          kind: t.kind,
          category_id: t.category_id,
          title: t.title,
          amount: t.amount,
          occurred_on: occurred,
          payment_method: t.payment_method,
          notes: t.notes,
          recurring_id: t.id,
          paid: false,
        }
      })

    if (toInsert.length === 0) return jsonOk({ created: 0, year, month })

    const { error: insErr } = await admin.from('finance_transactions').insert(toInsert)
    if (insErr) return jsonError(insErr.message, 400)
    return jsonOk({ created: toInsert.length, year, month })
  })
}
