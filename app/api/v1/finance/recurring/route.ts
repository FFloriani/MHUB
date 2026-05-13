import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'
import type { FinanceKind } from '@/lib/data/finance/types'

const KINDS: FinanceKind[] = ['expense', 'income', 'investment']

export async function GET(request: Request) {
  return runV1(request, 'finance:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const url = new URL(request.url)
    const onlyActive = url.searchParams.get('active') === 'true'

    let q = admin
      .from('finance_recurring')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (onlyActive) q = q.eq('active', true)

    const { data, error } = await q
    if (error) throw error
    return jsonOk({ recurring: data ?? [] })
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
    const day_of_month = typeof body.day_of_month === 'number' ? body.day_of_month : Number(body.day_of_month)
    const start_date = typeof body.start_date === 'string' ? body.start_date : ''

    if (!title || !KINDS.includes(kind as FinanceKind) || !Number.isFinite(amount) || !Number.isFinite(day_of_month) || !start_date) {
      return jsonError(
        'Campos obrigatórios: title, kind (expense|income|investment), amount, day_of_month (1-31), start_date (YYYY-MM-DD)',
        400,
      )
    }

    if (day_of_month < 1 || day_of_month > 31) {
      return jsonError('day_of_month deve estar entre 1 e 31', 400)
    }

    const insert = {
      user_id: userId,
      title,
      kind: kind as FinanceKind,
      amount,
      day_of_month: Math.round(day_of_month),
      start_date,
      end_date: typeof body.end_date === 'string' ? body.end_date : null,
      category_id: typeof body.category_id === 'string' ? body.category_id : null,
      payment_method: typeof body.payment_method === 'string' ? body.payment_method : null,
      notes: typeof body.notes === 'string' ? body.notes : null,
      active: body.active !== undefined ? Boolean(body.active) : true,
    }

    const { data, error } = await admin.from('finance_recurring').insert(insert).select().single()
    if (error) return jsonError(error.message, 400)
    return jsonOk(data, 201)
  })
}
