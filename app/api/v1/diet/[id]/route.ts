import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'other'] as const
type MealType = (typeof MEAL_TYPES)[number]

function isMealType(s: string): s is MealType {
  return (MEAL_TYPES as readonly string[]).includes(s)
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
      .from('diet_entries')
      .select('user_id')
      .eq('id', params.id)
      .maybeSingle()
    if (!existing || existing.user_id !== userId) return jsonError('Registro não encontrado', 404)

    const optNum = (v: unknown): number | null | undefined => {
      if (v === undefined) return undefined
      if (v === null || v === '') return null
      const n = typeof v === 'number' ? v : Number(v)
      return Number.isFinite(n) ? n : undefined
    }

    const updates: Record<string, unknown> = {}
    if (typeof body.logged_date === 'string') updates.logged_date = body.logged_date.slice(0, 10)
    if (typeof body.meal_type === 'string') {
      if (!isMealType(body.meal_type)) {
        return jsonError('meal_type inválido', 400)
      }
      updates.meal_type = body.meal_type
    }
    if (typeof body.name === 'string') updates.name = body.name.trim()
    if ('quantity_text' in body)
      updates.quantity_text =
        body.quantity_text === null ? null : typeof body.quantity_text === 'string' ? body.quantity_text.trim() || null : undefined
    const cal = optNum(body.calories)
    if (cal !== undefined) updates.calories = cal !== null ? Math.round(cal) : null
    const p = optNum(body.protein_g)
    if (p !== undefined) updates.protein_g = p
    const c = optNum(body.carbs_g)
    if (c !== undefined) updates.carbs_g = c
    const f = optNum(body.fat_g)
    if (f !== undefined) updates.fat_g = f
    if ('notes' in body)
      updates.notes = body.notes === null ? null : typeof body.notes === 'string' ? body.notes.trim() || null : undefined
    if (typeof body.sort_order === 'number') updates.sort_order = body.sort_order

    for (const k of Object.keys(updates)) {
      if (updates[k] === undefined) delete updates[k]
    }

    if (Object.keys(updates).length === 0) return jsonError('Nenhum campo para atualizar', 400)

    const { data, error } = await admin.from('diet_entries').update(updates).eq('id', params.id).select().single()
    if (error) return jsonError(error.message, 400)
    return jsonOk(data)
  })
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  return runV1(request, 'diet:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const { data: existing } = await admin
      .from('diet_entries')
      .select('user_id')
      .eq('id', params.id)
      .maybeSingle()
    if (!existing || existing.user_id !== userId) return jsonError('Registro não encontrado', 404)

    const { error } = await admin.from('diet_entries').delete().eq('id', params.id)
    if (error) return jsonError(error.message, 400)
    return jsonOk({ deleted: true, id: params.id })
  })
}
