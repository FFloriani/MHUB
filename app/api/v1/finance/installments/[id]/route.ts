import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'

async function loadAndOwn(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  id: string,
) {
  const { data } = await admin
    .from('finance_installments')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!data || data.user_id !== userId) return null
  return data
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return runV1(_request, 'finance:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const installment = await loadAndOwn(admin, userId, params.id)
    if (!installment) return jsonError('Parcelamento não encontrado', 404)

    const { data: transactions, error } = await admin
      .from('finance_transactions')
      .select('*')
      .eq('installment_id', params.id)
      .order('installment_index', { ascending: true })
    if (error) return jsonError(error.message, 400)

    return jsonOk({ installment, transactions: transactions ?? [] })
  })
}

/**
 * PATCH só metadados (`title`, `payment_method`, `notes`, `category_id`).
 * Não recalcula parcelas — pra mudar valor/quantidade, delete e recrie.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return runV1(request, 'finance:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const installment = await loadAndOwn(admin, userId, params.id)
    if (!installment) return jsonError('Parcelamento não encontrado', 404)

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const updates: Record<string, unknown> = {}
    if (typeof body.title === 'string') updates.title = body.title
    if ('category_id' in body)
      updates.category_id =
        body.category_id === null ? null : typeof body.category_id === 'string' ? body.category_id : undefined
    if ('payment_method' in body)
      updates.payment_method =
        body.payment_method === null ? null : typeof body.payment_method === 'string' ? body.payment_method : undefined
    if ('notes' in body) updates.notes = body.notes === null ? null : String(body.notes)

    for (const k of Object.keys(updates)) {
      if (updates[k] === undefined) delete updates[k]
    }

    if (Object.keys(updates).length === 0) return jsonError('Nenhum campo para atualizar', 400)

    const { data, error } = await admin
      .from('finance_installments')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()
    if (error) return jsonError(error.message, 400)
    return jsonOk(data)
  })
}

/**
 * DELETE — Remove o cabeçalho. As transações ligadas caem por CASCADE no banco.
 */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  return runV1(_request, 'finance:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const installment = await loadAndOwn(admin, userId, params.id)
    if (!installment) return jsonError('Parcelamento não encontrado', 404)

    const { error } = await admin.from('finance_installments').delete().eq('id', params.id)
    if (error) return jsonError(error.message, 400)
    return jsonOk({ deleted: true, id: params.id })
  })
}
