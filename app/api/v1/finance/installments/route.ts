import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'

export async function GET(request: Request) {
  return runV1(request, 'finance:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('finance_installments')
      .select('*')
      .eq('user_id', userId)
      .order('first_due', { ascending: false })
    if (error) throw error
    return jsonOk({ installments: data ?? [] })
  })
}

/**
 * POST /api/v1/finance/installments
 *
 * Cria o cabeçalho e **N transações filhas** (uma por mês) em uma operação.
 * Cada parcela = total_amount / total_count (com ajuste de centavos na última).
 *
 * Body obrigatório: `title`, `total_amount`, `total_count`, `first_due` (YYYY-MM-DD).
 * Opcionais: `category_id`, `payment_method`, `notes`.
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

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const total_amount = Number(body.total_amount)
    const total_count = Number(body.total_count)
    const first_due = typeof body.first_due === 'string' ? body.first_due : ''

    if (!title || !Number.isFinite(total_amount) || !Number.isFinite(total_count) || total_count < 1 || !first_due) {
      return jsonError(
        'Campos obrigatórios: title, total_amount, total_count (≥1), first_due (YYYY-MM-DD)',
        400,
      )
    }

    const category_id = typeof body.category_id === 'string' ? body.category_id : null
    const payment_method = typeof body.payment_method === 'string' ? body.payment_method : null
    const notes = typeof body.notes === 'string' ? body.notes : null

    const { data: header, error: hErr } = await admin
      .from('finance_installments')
      .insert({
        user_id: userId,
        title,
        total_amount,
        total_count: Math.round(total_count),
        first_due,
        category_id,
        payment_method,
        notes,
      })
      .select()
      .single()
    if (hErr) return jsonError(hErr.message, 400)

    const count = Math.round(total_count)
    const baseCents = Math.floor((total_amount * 100) / count)
    const remainderCents = Math.round(total_amount * 100) - baseCents * count

    const [y, m, d] = first_due.split('-').map(Number)
    const firstDay = d
    const txs = []
    for (let i = 0; i < count; i += 1) {
      const date = new Date(y, m - 1 + i, 1)
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
      const day = Math.min(firstDay, lastDay)
      const occurred = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const amountCents = baseCents + (i === count - 1 ? remainderCents : 0)
      txs.push({
        user_id: userId,
        kind: 'expense' as const,
        category_id,
        title: `${title} (${i + 1}/${count})`,
        amount: amountCents / 100,
        occurred_on: occurred,
        payment_method,
        notes,
        installment_id: header.id,
        installment_index: i + 1,
        paid: false,
      })
    }

    const { data: createdTxs, error: tErr } = await admin
      .from('finance_transactions')
      .insert(txs)
      .select()
    if (tErr) {
      await admin.from('finance_installments').delete().eq('id', header.id)
      return jsonError(tErr.message, 400)
    }

    return jsonOk({ installment: header, transactions: createdTxs ?? [] }, 201)
  })
}
