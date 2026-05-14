import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'
import { isoWeekday } from '@/lib/server/diet-day'
import { entryRecurrenceDaysForStorage } from '@/lib/data/diet'

function slotAppliesToDate(slot: {
  logged_date: string | null
  recurrence_days: number[] | null
}, targetDateYmd: string): boolean {
  const rec = slot.recurrence_days
  if (rec && rec.length > 0 && slot.logged_date == null) {
    return rec.includes(isoWeekday(targetDateYmd))
  }
  return slot.logged_date === targetDateYmd
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
      .select('user_id, logged_date, meal_slot_id')
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
    if ('logged_date' in body) {
      if (body.logged_date === null) updates.logged_date = null
      else if (typeof body.logged_date === 'string') {
        const s = body.logged_date.slice(0, 10)
        updates.logged_date = s.length ? s : null
      }
    }

    if (typeof body.meal_slot_id === 'string') {
      const { data: slot } = await admin
        .from('diet_meal_slots')
        .select('id, user_id, logged_date, recurrence_days')
        .eq('id', body.meal_slot_id)
        .maybeSingle()

      const templateDate =
        (updates.logged_date as string | null | undefined) ??
        (existing.logged_date as string | null) ??
        null
      const anchor =
        typeof body.anchor_date === 'string'
          ? body.anchor_date.slice(0, 10)
          : templateDate
          ? String(templateDate).slice(0, 10)
          : null

      if (!slot || slot.user_id !== userId || !anchor || !slotAppliesToDate(slot, anchor)) {
        return jsonError('meal_slot_id inválido para esta data', 400)
      }
      updates.meal_slot_id = body.meal_slot_id
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

    if ('recurrence_days' in body) {
      const finalSlotId =
        typeof updates.meal_slot_id === 'string' ? updates.meal_slot_id : existing.meal_slot_id

      const finalLogged: string | null =
        'logged_date' in updates
          ? updates.logged_date === null || updates.logged_date === ''
            ? null
            : String(updates.logged_date).slice(0, 10)
          : existing.logged_date != null && existing.logged_date !== ''
            ? String(existing.logged_date).slice(0, 10)
            : null

      if (finalLogged != null && finalLogged !== '') {
        const raw = body.recurrence_days
        const wantsSubset =
          raw !== null &&
          Array.isArray(raw) &&
          raw.some((x) => typeof x === 'number' && x >= 0 && x <= 6)
        if (wantsSubset) {
          return jsonError('Itens com data fixa não usam recurrence_days no item.', 400)
        }
      } else {
        const { data: slot } = await admin
          .from('diet_meal_slots')
          .select('recurrence_days')
          .eq('id', finalSlotId)
          .maybeSingle()
        const rec = slot?.recurrence_days as number[] | null
        if (!rec?.length) {
          return jsonError('recurrence_days só em refeições recorrentes.', 400)
        }
        try {
          if (body.recurrence_days === null) {
            updates.recurrence_days = null
          } else if (Array.isArray(body.recurrence_days)) {
            updates.recurrence_days = entryRecurrenceDaysForStorage(rec, body.recurrence_days)
          } else {
            return jsonError('recurrence_days deve ser array 0–6 ou null.', 400)
          }
        } catch (e) {
          return jsonError(e instanceof Error ? e.message : 'recurrence_days inválido.', 400)
        }
      }
    }

    const finalLoggedAfter: string | null =
      'logged_date' in updates
        ? updates.logged_date === null || updates.logged_date === ''
          ? null
          : String(updates.logged_date).slice(0, 10)
        : existing.logged_date != null && existing.logged_date !== ''
          ? String(existing.logged_date).slice(0, 10)
          : null

    if (finalLoggedAfter != null && finalLoggedAfter !== '') {
      updates.recurrence_days = null
    }

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
