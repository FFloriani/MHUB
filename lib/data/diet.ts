import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

export type DietEntry = Database['public']['Tables']['diet_entries']['Row']
export type DietMealType = DietEntry['meal_type']

export const MEAL_ORDER: DietMealType[] = ['breakfast', 'lunch', 'snack', 'dinner', 'other']

export const MEAL_LABELS: Record<DietMealType, string> = {
  breakfast: 'Café da manhã',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snack: 'Lanche',
  other: 'Outro',
}

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const MEAL_RANK: Record<DietMealType, number> = {
  breakfast: 0,
  lunch: 1,
  snack: 2,
  dinner: 3,
  other: 4,
}

export function sortDietEntries(entries: DietEntry[]): DietEntry[] {
  return [...entries].sort((a, b) => {
    const mr = MEAL_RANK[a.meal_type] - MEAL_RANK[b.meal_type]
    if (mr !== 0) return mr
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
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

/** Copia todos os itens de um dia para outro (novos ids). Retorna quantidade copiada. */
export async function copyDietEntriesFromDate(
  userId: string,
  fromLoggedDate: string,
  toLoggedDate: string,
): Promise<number> {
  if (fromLoggedDate === toLoggedDate) return 0
  const items = await listDietEntries(userId, fromLoggedDate)
  if (items.length === 0) return 0

  const rows = items.map((e) => ({
    user_id: userId,
    logged_date: toLoggedDate,
    meal_type: e.meal_type,
    name: e.name,
    quantity_text: e.quantity_text,
    calories: e.calories,
    protein_g: e.protein_g,
    carbs_g: e.carbs_g,
    fat_g: e.fat_g,
    notes: e.notes,
    sort_order: e.sort_order,
  }))

  const { error } = await supabase.from('diet_entries').insert(rows)
  if (error) throw error
  return rows.length
}

export async function listDietEntries(userId: string, loggedDate: string): Promise<DietEntry[]> {
  const { data, error } = await supabase
    .from('diet_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('logged_date', loggedDate)

  if (error) throw error
  return sortDietEntries((data as DietEntry[]) ?? [])
}

export async function createDietEntry(
  userId: string,
  payload: {
    logged_date: string
    meal_type: DietMealType
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
      meal_type: payload.meal_type,
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
      'meal_type' | 'name' | 'quantity_text' | 'calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'notes' | 'sort_order'
    >
  >,
): Promise<DietEntry> {
  const updates: Record<string, unknown> = {}
  if (patch.meal_type !== undefined) updates.meal_type = patch.meal_type
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

/** Soma macros do dia para cartões de resumo */
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

export { ymd }
