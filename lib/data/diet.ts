import { addDays, startOfWeek } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

export type DietMealSlot = Database['public']['Tables']['diet_meal_slots']['Row']
export type DietEntry = Database['public']['Tables']['diet_entries']['Row']

export type DietDayMeal = DietMealSlot & { entries: DietEntry[] }

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** "HH:MM" para <input type="time" /> (Postgres devolve "HH:MM:SS"). */
export function mealTimeToInput(t: string | null | undefined): string {
  if (!t) return ''
  const s = String(t).slice(0, 5)
  return /^\d{2}:\d{2}$/.test(s) ? s : ''
}

/** Aceita "HH:MM" ou vazio → null ou "HH:MM:SS" para o banco. */
export function inputTimeToPg(s: string): string | null {
  const t = s.trim()
  if (!t) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(t)
  if (!m) return null
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)))
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)))
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`
}

export function formatMealTimeLabel(t: string | null | undefined): string {
  return mealTimeToInput(t) || ''
}

function sortSlots(slots: DietMealSlot[]): DietMealSlot[] {
  return [...slots].sort((a, b) => {
    if (a.meal_time && b.meal_time) return a.meal_time.localeCompare(b.meal_time)
    if (a.meal_time) return -1
    if (b.meal_time) return 1
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

function sortEntries(entries: DietEntry[]): DietEntry[] {
  return [...entries].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

export async function listMealSlots(userId: string, loggedDate: string): Promise<DietMealSlot[]> {
  const { data, error } = await supabase
    .from('diet_meal_slots')
    .select('*')
    .eq('user_id', userId)
    .eq('logged_date', loggedDate)

  if (error) throw error
  return sortSlots((data as DietMealSlot[]) ?? [])
}

export async function nextSlotSortOrder(userId: string, loggedDate: string): Promise<number> {
  const slots = await listMealSlots(userId, loggedDate)
  if (slots.length === 0) return 0
  return Math.max(...slots.map((s) => s.sort_order)) + 1
}

export async function createMealSlot(
  userId: string,
  payload: { logged_date: string; title: string; meal_time?: string | null; sort_order?: number },
): Promise<DietMealSlot> {
  const sort_order = payload.sort_order ?? (await nextSlotSortOrder(userId, payload.logged_date))
  const { data, error } = await supabase
    .from('diet_meal_slots')
    .insert({
      user_id: userId,
      logged_date: payload.logged_date,
      title: payload.title.trim(),
      meal_time: payload.meal_time ?? null,
      sort_order,
    })
    .select()
    .single()

  if (error) throw error
  return data as DietMealSlot
}

export async function updateMealSlot(
  userId: string,
  id: string,
  patch: Partial<Pick<DietMealSlot, 'title' | 'meal_time' | 'sort_order' | 'logged_date'>>,
): Promise<DietMealSlot> {
  const updates: Record<string, unknown> = {}
  if (patch.title !== undefined) updates.title = patch.title.trim()
  if (patch.meal_time !== undefined) updates.meal_time = patch.meal_time
  if (patch.sort_order !== undefined) updates.sort_order = patch.sort_order
  if (patch.logged_date !== undefined) updates.logged_date = patch.logged_date

  const { data, error } = await supabase
    .from('diet_meal_slots')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data as DietMealSlot
}

export async function deleteMealSlot(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from('diet_meal_slots').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
}

function localFromYmd(ymdStr: string): Date {
  const [y, m, d] = ymdStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Datas ISO (YYYY-MM-DD) na **mesma semana** que `anchorYmd`, uma por dia da semana (0=Dom .. 6=Sáb). */
export function isoDatesInWeekForWeekdays(anchorYmd: string, weekdays: readonly number[]): string[] {
  const anchor = localFromYmd(anchorYmd)
  const weekStart = startOfWeek(anchor, { weekStartsOn: 0 })
  const uniq = new Set<number>()
  for (let i = 0; i < weekdays.length; i++) {
    const w = weekdays[i]
    if (w >= 0 && w <= 6) uniq.add(w)
  }
  const out: string[] = []
  uniq.forEach((w) => {
    out.push(ymd(addDays(weekStart, w)))
  })
  return Array.from(new Set(out)).sort()
}

function normMealTimeForMatch(t: string | null | undefined): string {
  if (t == null || t === '') return ''
  return String(t).slice(0, 8)
}

/** Garante um slot com o mesmo título e horário no dia; cria um se não existir. */
export async function findOrCreateMatchingMealSlot(
  userId: string,
  loggedDate: string,
  template: Pick<DietMealSlot, 'title' | 'meal_time' | 'sort_order'>,
): Promise<DietMealSlot> {
  const slots = await listMealSlots(userId, loggedDate)
  const wantTitle = template.title.trim()
  const wantTime = normMealTimeForMatch(template.meal_time)
  const match = slots.find(
    (s) => s.title.trim() === wantTitle && normMealTimeForMatch(s.meal_time) === wantTime,
  )
  if (match) return match
  return createMealSlot(userId, {
    logged_date: loggedDate,
    title: template.title,
    meal_time: template.meal_time,
    sort_order: template.sort_order,
  })
}

export async function listDietEntries(userId: string, loggedDate: string): Promise<DietEntry[]> {
  const { data, error } = await supabase
    .from('diet_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('logged_date', loggedDate)

  if (error) throw error
  return sortEntries((data as DietEntry[]) ?? [])
}

export async function loadDietDay(userId: string, loggedDate: string): Promise<DietDayMeal[]> {
  const [slots, entries] = await Promise.all([
    listMealSlots(userId, loggedDate),
    listDietEntries(userId, loggedDate),
  ])
  const bySlot = new Map<string, DietEntry[]>()
  for (const s of slots) bySlot.set(s.id, [])
  for (const e of entries) {
    const arr = bySlot.get(e.meal_slot_id) ?? []
    arr.push(e)
    bySlot.set(e.meal_slot_id, arr)
  }
  return slots.map((s) => ({
    ...s,
    entries: sortEntries(bySlot.get(s.id) ?? []),
  }))
}

export async function createDietEntry(
  userId: string,
  payload: {
    logged_date: string
    meal_slot_id: string
    name: string
    quantity_text?: string | null
    calories?: number | null
    protein_g?: number | null
    carbs_g?: number | null
    fat_g?: number | null
    notes?: string | null
    sort_order?: number
  },
): Promise<DietEntry> {
  const { data, error } = await supabase
    .from('diet_entries')
    .insert({
      user_id: userId,
      logged_date: payload.logged_date,
      meal_slot_id: payload.meal_slot_id,
      name: payload.name.trim(),
      quantity_text: payload.quantity_text?.trim() || null,
      calories: payload.calories ?? null,
      protein_g: payload.protein_g ?? null,
      carbs_g: payload.carbs_g ?? null,
      fat_g: payload.fat_g ?? null,
      notes: payload.notes?.trim() || null,
      sort_order: payload.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) throw error
  return data as DietEntry
}

export async function updateDietEntry(
  userId: string,
  id: string,
  patch: Partial<
    Pick<
      DietEntry,
      | 'meal_slot_id'
      | 'name'
      | 'quantity_text'
      | 'calories'
      | 'protein_g'
      | 'carbs_g'
      | 'fat_g'
      | 'notes'
      | 'sort_order'
    >
  >,
): Promise<DietEntry> {
  const updates: Record<string, unknown> = {}
  if (patch.meal_slot_id !== undefined) updates.meal_slot_id = patch.meal_slot_id
  if (patch.name !== undefined) updates.name = patch.name.trim()
  if (patch.quantity_text !== undefined) updates.quantity_text = patch.quantity_text?.trim() || null
  if (patch.calories !== undefined) updates.calories = patch.calories
  if (patch.protein_g !== undefined) updates.protein_g = patch.protein_g
  if (patch.carbs_g !== undefined) updates.carbs_g = patch.carbs_g
  if (patch.fat_g !== undefined) updates.fat_g = patch.fat_g
  if (patch.notes !== undefined) updates.notes = patch.notes?.trim() || null
  if (patch.sort_order !== undefined) updates.sort_order = patch.sort_order

  const { data, error } = await supabase
    .from('diet_entries')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data as DietEntry
}

export async function deleteDietEntry(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from('diet_entries').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
}

export async function fetchDietEntryCountsInRange(
  userId: string,
  from: string,
  to: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('diet_entries')
    .select('logged_date')
    .eq('user_id', userId)
    .gte('logged_date', from)
    .lte('logged_date', to)

  if (error) throw error
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const k = String((row as { logged_date: string }).logged_date).slice(0, 10)
    counts[k] = (counts[k] ?? 0) + 1
  }
  return counts
}

export async function copyDietEntriesFromDate(
  userId: string,
  fromLoggedDate: string,
  toLoggedDate: string,
): Promise<{ slots: number; items: number }> {
  if (fromLoggedDate === toLoggedDate) return { slots: 0, items: 0 }
  const slots = await listMealSlots(userId, fromLoggedDate)
  const entries = await listDietEntries(userId, fromLoggedDate)
  if (slots.length === 0) return { slots: 0, items: 0 }

  const idMap = new Map<string, string>()
  for (const s of slots) {
    const created = await createMealSlot(userId, {
      logged_date: toLoggedDate,
      title: s.title,
      meal_time: s.meal_time,
      sort_order: s.sort_order,
    })
    idMap.set(s.id, created.id)
  }

  if (entries.length === 0) {
    return { slots: slots.length, items: 0 }
  }

  const rows = entries
    .map((e) => {
      const newSlotId = idMap.get(e.meal_slot_id)
      if (!newSlotId) return null
      return {
        user_id: userId,
        logged_date: toLoggedDate,
        meal_slot_id: newSlotId,
        name: e.name,
        quantity_text: e.quantity_text,
        calories: e.calories,
        protein_g: e.protein_g,
        carbs_g: e.carbs_g,
        fat_g: e.fat_g,
        notes: e.notes,
        sort_order: e.sort_order,
      }
    })
    .filter(Boolean) as Database['public']['Tables']['diet_entries']['Insert'][]

  if (rows.length === 0) {
    return { slots: slots.length, items: 0 }
  }
  const { error } = await supabase.from('diet_entries').insert(rows)
  if (error) throw error
  return { slots: slots.length, items: rows.length }
}

export function summarizeDay(entries: DietEntry[]): {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
} {
  let calories = 0
  let protein_g = 0
  let carbs_g = 0
  let fat_g = 0
  for (const e of entries) {
    if (e.calories != null) calories += e.calories
    if (e.protein_g != null) protein_g += Number(e.protein_g)
    if (e.carbs_g != null) carbs_g += Number(e.carbs_g)
    if (e.fat_g != null) fat_g += Number(e.fat_g)
  }
  return { calories, protein_g, carbs_g, fat_g }
}

export function allEntriesFromDay(meals: DietDayMeal[]): DietEntry[] {
  return meals.flatMap((m) => m.entries)
}

export { ymd }
