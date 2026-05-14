import type { SupabaseClient } from '@supabase/supabase-js'
import { entryVisibleOnDietDay, normalizeRecurrenceDays } from '@/lib/data/diet'

/** Dia da semana 0–6 para uma data calendário YYYY-MM-DD (UTC meio-dia, estável). */
export function isoWeekday(dateStr: string): number {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay()
}

type SlotRow = {
  id: string
  user_id: string
  logged_date: string | null
  title: string
  meal_time: string | null
  sort_order: number
  recurrence_days: number[] | null
  created_at: string
  updated_at: string
}

type EntryRow = {
  id: string
  user_id: string
  logged_date: string | null
  meal_slot_id: string
  name: string
  quantity_text: string | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  notes: string | null
  sort_order: number
  recurrence_days: number[] | null
  created_at: string
  updated_at: string
}

function sortSlots<T extends SlotRow>(slots: T[]): T[] {
  return [...slots].sort((a, b) => {
    if (a.meal_time && b.meal_time) return a.meal_time.localeCompare(b.meal_time)
    if (a.meal_time) return -1
    if (b.meal_time) return 1
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

function sortEntries<T extends EntryRow>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

/** Mesma regra que o cliente: refeições do dia = pontuais + recorrentes − skips. */
export async function loadDietDayAdmin(
  admin: SupabaseClient,
  userId: string,
  loggedDate: string,
): Promise<Array<SlotRow & { entries: EntryRow[] }>> {
  const d = loggedDate.slice(0, 10)
  const dow = isoWeekday(d)

  const [{ data: skips }, { data: oneOff }, { data: recurring }] = await Promise.all([
    admin.from('diet_recurring_skips').select('meal_slot_id').eq('user_id', userId).eq('skip_date', d),
    admin
      .from('diet_meal_slots')
      .select('*')
      .eq('user_id', userId)
      .eq('logged_date', d)
      .is('recurrence_days', null),
    admin
      .from('diet_meal_slots')
      .select('*')
      .eq('user_id', userId)
      .is('logged_date', null)
      .not('recurrence_days', 'is', null),
  ])

  const skipSet = new Set((skips ?? []).map((r: { meal_slot_id: string }) => r.meal_slot_id))
  const a = (oneOff ?? []) as SlotRow[]
  const bRaw = (recurring ?? []) as SlotRow[]
  const b = bRaw.filter((s) => normalizeRecurrenceDays(s.recurrence_days)?.includes(dow))
  const slots = sortSlots([...a, ...b].filter((s) => !skipSet.has(s.id)))

  if (slots.length === 0) return []

  const slotIds = slots.map((s) => s.id)
  const { data: allEntries } = await admin
    .from('diet_entries')
    .select('*')
    .eq('user_id', userId)
    .in('meal_slot_id', slotIds)

  const entries = (allEntries ?? []) as EntryRow[]
  const filtered = entries.filter((e) => entryVisibleOnDietDay(e, d))

  const bySlot = new Map<string, EntryRow[]>()
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
