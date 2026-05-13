import { parseISO } from 'date-fns'
import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'
import { loadDietDayAdmin, isoWeekday } from '@/lib/server/diet-day'

function parseLoggedDate(url: URL): string {
  const d = url.searchParams.get('date')
  if (d) {
    const parsed = parseISO(d)
    if (!Number.isNaN(parsed.getTime())) return d.slice(0, 10)
  }
  return new Date().toISOString().slice(0, 10)
}

/**
 * GET /api/v1/diet
 *
 * Sem nada / `?date=YYYY-MM-DD`: dia único — `{ date, meal_slots: [...] }`.
 * `?from=YYYY-MM-DD&to=YYYY-MM-DD` (máx 31 dias): `{ from, to, days: [{ date, meal_slots }] }`.
 */
export async function GET(request: Request) {
  return runV1(request, 'diet:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    if (from && to) {
      const start = parseISO(from)
      const end = parseISO(to)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return jsonError('from/to inválidos (use YYYY-MM-DD)', 400)
      }
      const msPerDay = 1000 * 60 * 60 * 24
      const dayCount = Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1
      if (dayCount < 1) return jsonError('to deve ser ≥ from', 400)
      if (dayCount > 31) return jsonError('intervalo máximo: 31 dias', 400)

      const fromStr = from.slice(0, 10)
      const toStr = to.slice(0, 10)

      const days: Array<{ date: string; meal_slots: Awaited<ReturnType<typeof loadDietDayAdmin>> }> = []
      for (let i = 0; i < dayCount; i += 1) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        const dateStr = d.toISOString().slice(0, 10)
        const meal_slots = await loadDietDayAdmin(admin, userId, dateStr)
        days.push({ date: dateStr, meal_slots })
      }

      return jsonOk({ from: fromStr, to: toStr, days })
    }

    const loggedDate = parseLoggedDate(url)
    const meal_slots = await loadDietDayAdmin(admin, userId, loggedDate)
    return jsonOk({ date: loggedDate, meal_slots })
  })
}

export async function POST(request: Request) {
  return runV1(request, 'diet:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const logged_date =
      typeof body.logged_date === 'string' ? body.logged_date.slice(0, 10) : parseLoggedDate(new URL(request.url))
    const meal_slot_id = typeof body.meal_slot_id === 'string' ? body.meal_slot_id : ''
    if (!meal_slot_id) return jsonError('Campo obrigatório: meal_slot_id', 400)

    const { data: slot } = await admin
      .from('diet_meal_slots')
      .select('id, user_id, logged_date, recurrence_days')
      .eq('id', meal_slot_id)
      .maybeSingle()
    if (!slot || slot.user_id !== userId) {
      return jsonError('Refeição (slot) inválida', 400)
    }

    const rec = slot.recurrence_days as number[] | null
    const isRecurring = Array.isArray(rec) && rec.length > 0 && slot.logged_date == null

    let entryLoggedDate: string | null
    if (isRecurring) {
      const dow = isoWeekday(logged_date)
      if (!rec.includes(dow)) {
        return jsonError('Esta refeição recorrente não vale neste dia da semana', 400)
      }
      entryLoggedDate =
        body.per_day === true && typeof body.logged_date === 'string'
          ? body.logged_date.slice(0, 10)
          : null
    } else {
      if (slot.logged_date !== logged_date) {
        return jsonError('Refeição (slot) inválida para esta data', 400)
      }
      entryLoggedDate = logged_date
    }

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return jsonError('Campo obrigatório: name', 400)

    const optNum = (v: unknown): number | null => {
      if (v === null || v === undefined || v === '') return null
      const n = typeof v === 'number' ? v : Number(v)
      return Number.isFinite(n) ? n : null
    }

    const insert = {
      user_id: userId,
      logged_date: entryLoggedDate,
      meal_slot_id,
      name,
      quantity_text: typeof body.quantity_text === 'string' ? body.quantity_text.trim() || null : null,
      calories: optNum(body.calories) !== null ? Math.round(optNum(body.calories)!) : null,
      protein_g: optNum(body.protein_g),
      carbs_g: optNum(body.carbs_g),
      fat_g: optNum(body.fat_g),
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
      sort_order: typeof body.sort_order === 'number' ? body.sort_order : 0,
    }

    const { data, error } = await admin.from('diet_entries').insert(insert).select().single()
    if (error) return jsonError(error.message, 400)
    return jsonOk(data, 201)
  })
}
