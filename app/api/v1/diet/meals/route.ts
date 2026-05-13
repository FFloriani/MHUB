import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'
import { parseISO } from 'date-fns'

/** Normaliza inteiros 0–6 únicos e ordenados. */
function normalizeRecurrenceDays(body: Record<string, unknown>): number[] | null {
  const raw = body.recurrence_days
  if (!Array.isArray(raw) || raw.length === 0) return null
  const set = new Set<number>()
  for (const x of raw) {
    if (typeof x === 'number' && x >= 0 && x <= 6) set.add(Math.floor(x))
  }
  if (set.size === 0) return null
  return Array.from(set).sort((a, b) => a - b)
}

/** Normaliza hora para Postgres HH:MM:SS ou null. */
function parseMealTime(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  const s = String(v).trim()
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s)
  if (!m) return null
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)))
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)))
  const sec = m[3] ? Math.min(59, Math.max(0, parseInt(m[3], 10))) : 0
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function parseLoggedDateFromBody(body: Record<string, unknown>, request: Request): string | undefined {
  if (typeof body.logged_date === 'string') return body.logged_date.slice(0, 10)
  const url = new URL(request.url)
  const d = url.searchParams.get('date')
  if (d) {
    const parsed = parseISO(d)
    if (!Number.isNaN(parsed.getTime())) return d.slice(0, 10)
  }
  return undefined
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

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return jsonError('Campo obrigatório: title', 400)

    const meal_time = parseMealTime(body.meal_time)
    if (body.meal_time !== undefined && body.meal_time !== null && body.meal_time !== '' && meal_time === null) {
      return jsonError('meal_time inválido (use HH:MM)', 400)
    }

    const rec = normalizeRecurrenceDays(body)
    let logged_date: string | null = null

    if (rec == null) {
      const d =
        parseLoggedDateFromBody(body, request) ??
        new Date().toISOString().slice(0, 10)
      logged_date = d
    }

    const { data: orderRows } = await admin
      .from('diet_meal_slots')
      .select('sort_order')
      .eq('user_id', userId)

    const nextOrder =
      typeof body.sort_order === 'number'
        ? body.sort_order
        : orderRows?.length
          ? Math.max(...orderRows.map((r: { sort_order: number }) => r.sort_order)) + 1
          : 0

    const { data, error } = await admin
      .from('diet_meal_slots')
      .insert({
        user_id: userId,
        logged_date,
        recurrence_days: rec,
        title,
        meal_time,
        sort_order: nextOrder,
      })
      .select()
      .single()

    if (error) return jsonError(error.message, 400)
    return jsonOk(data, 201)
  })
}
