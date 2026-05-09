import { parseISO } from 'date-fns'
import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'other'] as const
type MealType = (typeof MEAL_TYPES)[number]

function isMealType(s: string): s is MealType {
  return (MEAL_TYPES as readonly string[]).includes(s)
}

function parseLoggedDate(url: URL): string {
  const d = url.searchParams.get('date')
  if (d) {
    const parsed = parseISO(d)
    if (!Number.isNaN(parsed.getTime())) return d.slice(0, 10)
  }
  return new Date().toISOString().slice(0, 10)
}

const MEAL_RANK: Record<MealType, number> = {
  breakfast: 0,
  lunch: 1,
  snack: 2,
  dinner: 3,
  other: 4,
}

function sortEntries<T extends { meal_type: string; sort_order: number; created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const mr = MEAL_RANK[a.meal_type as MealType] - MEAL_RANK[b.meal_type as MealType]
    if (mr !== 0) return mr
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

export async function GET(request: Request) {
  return runV1(request, 'diet:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const loggedDate = parseLoggedDate(new URL(request.url))
    const { data, error } = await admin
      .from('diet_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('logged_date', loggedDate)

    if (error) return jsonError(error.message, 400)
    return jsonOk({ date: loggedDate, entries: sortEntries(data ?? []) })
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
    const mealRaw = typeof body.meal_type === 'string' ? body.meal_type : ''
    if (!isMealType(mealRaw)) {
      return jsonError('meal_type deve ser: breakfast | lunch | dinner | snack | other', 400)
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
      meal_type: mealRaw,
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
