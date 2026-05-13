import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'

function parseMealTime(v: unknown): string | null | undefined {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  const s = String(v).trim()
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s)
  if (!m) return undefined
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)))
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)))
  const sec = m[3] ? Math.min(59, Math.max(0, parseInt(m[3], 10))) : 0
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return runV1(request, 'diet:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const { data: existing } = await admin
      .from('diet_meal_slots')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()
    if (!existing || existing.user_id !== userId) return jsonError('Refeição não encontrada', 404)

    const updates: Record<string, unknown> = {}
    if (typeof body.title === 'string') updates.title = body.title.trim()
    if ('meal_time' in body) {
      if (body.meal_time === null || body.meal_time === '') {
        updates.meal_time = null
      } else {
        const t = parseMealTime(body.meal_time)
        if (t === undefined) {
          return jsonError('meal_time inválido (use HH:MM)', 400)
        }
        updates.meal_time = t
      }
    }
    if (typeof body.sort_order === 'number') updates.sort_order = body.sort_order
    if (typeof body.logged_date === 'string') updates.logged_date = body.logged_date.slice(0, 10)

    if (Object.keys(updates).length === 0) return jsonError('Nenhum campo para atualizar', 400)

    const { data, error } = await admin
      .from('diet_meal_slots')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()
    if (error) return jsonError(error.message, 400)
    return jsonOk(data)
  })
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  return runV1(request, 'diet:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const { data: existing } = await admin
      .from('diet_meal_slots')
      .select('user_id')
      .eq('id', params.id)
      .maybeSingle()
    if (!existing || existing.user_id !== userId) return jsonError('Refeição não encontrada', 404)

    const { error } = await admin.from('diet_meal_slots').delete().eq('id', params.id)
    if (error) return jsonError(error.message, 400)
    return jsonOk({ deleted: true, id: params.id })
  })
}
