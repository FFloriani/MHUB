import { addDays, startOfWeek } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

export type DietMealSlot = Database['public']['Tables']['diet_meal_slots']['Row']
export type DietEntry = Database['public']['Tables']['diet_entries']['Row']

export type DietDayMeal = DietMealSlot & { entries: DietEntry[] }

const WEEKDAY_LABELS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function normalizeRecurrenceDays(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const set = new Set<number>()
  for (const x of raw) {
    let n: number
    if (typeof x === 'number' && Number.isFinite(x)) n = Math.trunc(x)
    else if (typeof x === 'string' && /^-?\d+$/.test(x.trim())) n = parseInt(x.trim(), 10)
    else continue
    if (n >= 0 && n <= 6) set.add(n)
  }
  if (set.size === 0) return null
  return Array.from(set).sort((a, b) => a - b)
}

/** Para item modelo: `null`/vazio = aparece em todos os dias da refeição; senão só nos dias indicados (subset dos dias do slot). */
export function entryRecurrenceDaysForStorage(slotDays: unknown, selected: number[]): number[] | null {
  const slot = normalizeRecurrenceDays(slotDays)
  if (!slot?.length) return null
  const allowed = new Set(slot)
  const uniq = new Set<number>()
  for (const w of selected) {
    if (typeof w === 'number' && w >= 0 && w <= 6 && allowed.has(w)) uniq.add(w)
  }
  if (uniq.size === 0) throw new Error('Selecione pelo menos um dia.')
  const sorted = Array.from(uniq).sort((a, b) => a - b)
  const slotSorted = [...slot].sort((a, b) => a - b)
  if (sorted.length === slotSorted.length && sorted.every((v, i) => v === slotSorted[i])) return null
  return sorted
}

/** Se o item entra na lista de um dia (YYYY-MM-DD). */
export function entryVisibleOnDietDay(
  entry: Pick<DietEntry, 'logged_date' | 'recurrence_days'>,
  dayYmd: string,
): boolean {
  const d = dayYmd.slice(0, 10)
  if (entry.logged_date != null && entry.logged_date !== '') {
    return String(entry.logged_date).slice(0, 10) === d
  }
  const dow = localFromYmd(d).getDay()
  const er = normalizeRecurrenceDays(entry.recurrence_days)
  if (!er?.length) return true
  return er.includes(dow)
}

export function formatRecurrenceDaysLabel(days: unknown): string | null {
  const n = normalizeRecurrenceDays(days)
  if (!n?.length) return null
  if (n.length === 7) return 'Todos os dias'
  return n.map((d) => WEEKDAY_LABELS_PT[d] ?? '?').join(', ')
}

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function localFromYmd(ymdStr: string): Date {
  const [y, m, d] = ymdStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function dowFromYmd(ymdStr: string): number {
  return localFromYmd(ymdStr).getDay()
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

/** Refeições só deste dia (não recorrentes). */
export async function listMealSlots(userId: string, loggedDate: string): Promise<DietMealSlot[]> {
  const { data, error } = await supabase
    .from('diet_meal_slots')
    .select('*')
    .eq('user_id', userId)
    .eq('logged_date', loggedDate)
    .is('recurrence_days', null)

  if (error) throw error
  return sortSlots((data as DietMealSlot[]) ?? [])
}

async function listSkippedSlotIds(userId: string, loggedDate: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('diet_recurring_skips')
    .select('meal_slot_id')
    .eq('user_id', userId)
    .eq('skip_date', loggedDate.slice(0, 10))

  if (error) throw error
  return new Set((data ?? []).map((r: { meal_slot_id: string }) => r.meal_slot_id))
}

/** Refeições visíveis num dia: pontuais da data + recorrentes cujo weekday bate, menos “pulos”. */
export async function listMealSlotsForDate(userId: string, loggedDate: string): Promise<DietMealSlot[]> {
  const dow = dowFromYmd(loggedDate)
  const [oneOff, recurring, skips] = await Promise.all([
    supabase
      .from('diet_meal_slots')
      .select('*')
      .eq('user_id', userId)
      .eq('logged_date', loggedDate.slice(0, 10))
      .is('recurrence_days', null),
    supabase
      .from('diet_meal_slots')
      .select('*')
      .eq('user_id', userId)
      .is('logged_date', null)
      .not('recurrence_days', 'is', null),
    listSkippedSlotIds(userId, loggedDate),
  ])

  if (oneOff.error) throw oneOff.error
  if (recurring.error) throw recurring.error

  const a = (oneOff.data as DietMealSlot[]) ?? []
  const bRaw = (recurring.data as DietMealSlot[]) ?? []
  const b = bRaw.filter((s) => normalizeRecurrenceDays(s.recurrence_days)?.includes(dow))
  const merged = [...a, ...b].filter((s) => !skips.has(s.id))
  return sortSlots(merged)
}

export async function nextSlotSortOrder(userId: string, loggedDate: string): Promise<number> {
  const slots = await listMealSlots(userId, loggedDate)
  if (slots.length === 0) return 0
  return Math.max(...slots.map((s) => s.sort_order)) + 1
}

async function nextGlobalSortOrder(userId: string): Promise<number> {
  const { data, error } = await supabase.from('diet_meal_slots').select('sort_order').eq('user_id', userId)
  if (error) throw error
  if (!data?.length) return 0
  return Math.max(...data.map((r: { sort_order: number }) => r.sort_order)) + 1
}

export async function createMealSlot(
  userId: string,
  payload: {
    logged_date?: string | null
    recurrence_days?: number[] | null
    title: string
    meal_time?: string | null
    sort_order?: number
  },
): Promise<DietMealSlot> {
  const rec = normalizeRecurrenceDays(payload.recurrence_days)
  let logged_date: string | null
  if (rec && rec.length > 0) {
    logged_date = null
  } else {
    const d = payload.logged_date?.slice(0, 10)
    if (!d) throw new Error('Data obrigatória para refeição pontual')
    logged_date = d
  }

  const sort_order = payload.sort_order ?? (await nextGlobalSortOrder(userId))
  const { data, error } = await supabase
    .from('diet_meal_slots')
    .insert({
      user_id: userId,
      logged_date,
      recurrence_days: rec,
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
  patch: Partial<Pick<DietMealSlot, 'title' | 'meal_time' | 'sort_order' | 'logged_date' | 'recurrence_days'>>,
): Promise<DietMealSlot> {
  const updates: Record<string, unknown> = {}
  if (patch.title !== undefined) updates.title = patch.title.trim()
  if (patch.meal_time !== undefined) updates.meal_time = patch.meal_time
  if (patch.sort_order !== undefined) updates.sort_order = patch.sort_order
  if (patch.logged_date !== undefined) updates.logged_date = patch.logged_date
  if (patch.recurrence_days !== undefined) {
    updates.recurrence_days = patch.recurrence_days === null ? null : normalizeRecurrenceDays(patch.recurrence_days)
  }

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

export async function addRecurringSkip(userId: string, mealSlotId: string, skipDate: string): Promise<void> {
  const { error } = await supabase.from('diet_recurring_skips').insert({
    user_id: userId,
    meal_slot_id: mealSlotId,
    skip_date: skipDate.slice(0, 10),
  })
  if (error) throw error
}

export async function removeRecurringSkip(userId: string, mealSlotId: string, skipDate: string): Promise<void> {
  const { error } = await supabase
    .from('diet_recurring_skips')
    .delete()
    .eq('user_id', userId)
    .eq('meal_slot_id', mealSlotId)
    .eq('skip_date', skipDate.slice(0, 10))
  if (error) throw error
}

export type RecurringSkipRow = { meal_slot_id: string; title: string }

/** Refeições recorrentes ocultas neste dia (para reativar). */
export async function listRecurringSkipsForDate(userId: string, skipDate: string): Promise<RecurringSkipRow[]> {
  const d = skipDate.slice(0, 10)
  const { data: skips, error: e1 } = await supabase
    .from('diet_recurring_skips')
    .select('meal_slot_id')
    .eq('user_id', userId)
    .eq('skip_date', d)
  if (e1) throw e1
  const ids = (skips ?? []).map((r: { meal_slot_id: string }) => r.meal_slot_id)
  if (ids.length === 0) return []

  const { data: slots, error: e2 } = await supabase
    .from('diet_meal_slots')
    .select('id, title')
    .eq('user_id', userId)
    .in('id', ids)
  if (e2) throw e2
  const byId = new Map((slots as { id: string; title: string }[] | null)?.map((s) => [s.id, s.title]) ?? [])
  return ids.map((id) => ({ meal_slot_id: id, title: byId.get(id) ?? 'Refeição' }))
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
  const slots = await listMealSlotsForDate(userId, loggedDate)
  if (slots.length === 0) return []

  const slotIds = slots.map((s) => s.id)
  const { data: allEntries, error } = await supabase
    .from('diet_entries')
    .select('*')
    .eq('user_id', userId)
    .in('meal_slot_id', slotIds)

  if (error) throw error
  const entries = (allEntries as DietEntry[]) ?? []
  const d = loggedDate.slice(0, 10)
  const filtered = entries.filter((e) => entryVisibleOnDietDay(e, d))

  const bySlot = new Map<string, DietEntry[]>()
  for (const s of slots) bySlot.set(s.id, [])
  for (const e of filtered) {
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
    /** `null` = item do modelo da refeição recorrente (vale em todos os dias da recorrência). */
    logged_date: string | null
    meal_slot_id: string
    name: string
    quantity_text?: string | null
    calories?: number | null
    protein_g?: number | null
    carbs_g?: number | null
    fat_g?: number | null
    notes?: string | null
    sort_order?: number
    recurrence_days?: number[] | null
  },
): Promise<DietEntry> {
  const logged =
    payload.logged_date === null || payload.logged_date === ''
      ? null
      : payload.logged_date.slice(0, 10)

  let recurrence_days: number[] | null = null
  if (logged == null && payload.recurrence_days !== undefined) {
    const n = normalizeRecurrenceDays(payload.recurrence_days)
    recurrence_days = n && n.length > 0 ? n : null
  }

  const { data, error } = await supabase
    .from('diet_entries')
    .insert({
      user_id: userId,
      logged_date: logged,
      meal_slot_id: payload.meal_slot_id,
      name: payload.name.trim(),
      quantity_text: payload.quantity_text?.trim() || null,
      calories: payload.calories ?? null,
      protein_g: payload.protein_g ?? null,
      carbs_g: payload.carbs_g ?? null,
      fat_g: payload.fat_g ?? null,
      notes: payload.notes?.trim() || null,
      sort_order: payload.sort_order ?? 0,
      recurrence_days,
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
      | 'logged_date'
      | 'recurrence_days'
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
  if (patch.logged_date !== undefined) {
    updates.logged_date =
      patch.logged_date === null || patch.logged_date === '' ? null : patch.logged_date.slice(0, 10)
  }
  if (patch.recurrence_days !== undefined) {
    if (patch.recurrence_days === null) {
      updates.recurrence_days = null
    } else {
      const n = normalizeRecurrenceDays(patch.recurrence_days)
      updates.recurrence_days = n && n.length > 0 ? n : null
    }
  }

  const { data: row } = await supabase
    .from('diet_entries')
    .select('logged_date')
    .eq('id', id)
    .eq('user_id', userId)
    .single()
  const ld = updates.logged_date !== undefined ? updates.logged_date : row?.logged_date
  if (ld != null && ld !== '' && updates.recurrence_days !== undefined) {
    updates.recurrence_days = null
  }

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
  const start = localFromYmd(from.slice(0, 10))
  const end = localFromYmd(to.slice(0, 10))
  const counts: Record<string, number> = {}
  for (let t = start.getTime(); t <= end.getTime(); t += 24 * 60 * 60 * 1000) {
    const iso = ymd(new Date(t))
    const meals = await loadDietDay(userId, iso)
    counts[iso] = allEntriesFromDay(meals).length
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