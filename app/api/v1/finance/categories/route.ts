import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'
import type { FinanceKind } from '@/lib/data/finance/types'

const KINDS: FinanceKind[] = ['expense', 'income', 'investment']

export async function GET(request: Request) {
  return runV1(request, 'finance:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('finance_categories')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    if (error) throw error
    return jsonOk({ categories: data ?? [] })
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

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const kind = body.kind as string
    if (!name || !KINDS.includes(kind as FinanceKind)) {
      return jsonError('Campos obrigatórios: name, kind (expense | income | investment)', 400)
    }

    const insert = {
      user_id: userId,
      name,
      kind: kind as FinanceKind,
      icon: typeof body.icon === 'string' ? body.icon : 'Tag',
      color: typeof body.color === 'string' ? body.color : '#6366f1',
      is_archived: Boolean(body.is_archived),
      sort_order: typeof body.sort_order === 'number' ? body.sort_order : 0,
    }

    const { data, error } = await admin.from('finance_categories').insert(insert).select().single()
    if (error) return jsonError(error.message, 400)
    return jsonOk(data, 201)
  })
}
