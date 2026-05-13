import { parseISO } from 'date-fns'
import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'

function parseLoggedDate(url: URL): string {
  const d = url.searchParams.get('date')
  if (d) {
    const parsed = parseISO(d)
    if (!Number.isNaN(parsed.getTime())) return d.slice(0, 10)
  }
  return new Date().toISOString().slice(0, 10)
}

function sortSlots<T extends { meal_time: string | null; sort_order: number; created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.meal_time && b.meal_time) return a.meal_time.localeCompare(b.meal_time)
    if (a.meal_time) return -1
    if (b.meal_time) return 1
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

function sortEntries<T extends { sort_order: number; created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
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

      const [{ data: slots, error: e1 }, { data: entries, error: e2 }] = await Promise.all([
        admin
          .from('diet_meal_slots')
          .select('*')
          .eq('user_id', userId)
          .gte('logged_date', fromStr)
          .lte('logged_date', toStr),
        admin
          .from('diet_entries')
          .select('*')
          .eq('user_id', userId)
          .gte('logged_date', fromStr)
          .lte('logged_date', toStr),
      ])
      if (e1) return jsonError(e1.message, 400)
      if (e2) return jsonError(e2.message, 400)

      const slotsByDate = new Map<string, typeof slots>()
      for (const s of slots ?? []) {
        const arr = slotsByDate.get(s.logged_date) ?? []
        arr.push(s)
        slotsByDate.set(s.logged_date, arr)
      }
      const entriesBySlot = new Map<string, typeof entries>()
      for (const e of entries ?? []) {
        const arr = entriesBySlot.get(e.meal_slot_id) ?? []
        arr.push(e)
        entriesBySlot.set(e.meal_slot_id, arr)
      }

      const days: Array<{ date: string; meal_slots: unknown[] }> = []
      for (let i = 0; i < dayCount; i += 1) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        const dateStr = d.toISOString().slice(0, 10)
        const daySlots = sortSlots(slotsByDate.get(dateStr) ?? [])
        const meal_slots = daySlots.map((s) => ({
          ...s,
          entries: sortEntries(entriesBySlot.get(s.id) ?? []),
        }))
        days.push({ date: dateStr, meal_slots })
      }

      return jsonOk({ from: fromStr, to: toStr, days })
    }

    const loggedDate = parseLoggedDate(url)

    const [{ data: slots, error: e1 }, { data: entries, error: e2 }] = await Promise.all([
      admin.from('diet_meal_slots').select('*').eq('user_id', userId).eq('logged_date', loggedDate),
      admin.from('diet_entries').select('*').eq('user_id', userId).eq('logged_date', loggedDate),
    ])

    if (e1) return jsonError(e1.message, 400)
    if (e2) return jsonError(e2.message, 400)

    const orderedSlots = sortSlots(slots ?? [])
    const bySlot = new Map<string, typeof entries>()
    for (const s of orderedSlots) bySlot.set(s.id, [])
    for (const e of entries ?? []) {
      const arr = bySlot.get(e.meal_slot_id) ?? []
      arr.push(e)
      bySlot.set(e.meal_slot_id, arr)
    }

    const meal_slots = orderedSlots.map((s) => ({
      ...s,
      entries: sortEntries(bySlot.get(s.id) ?? []),
    }))

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
      .select('id, user_id, logged_date')
      .eq('id', meal_slot_id)
      .maybeSingle()
    if (!slot || slot.user_id !== userId || slot.logged_date !== logged_date) {
      return jsonError('Refeição (slot) inválida para esta data', 400)
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
      logged_date,
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
