import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'
import { parseISO } from 'date-fns'

function parseLoggedDateFromBody(body: Record<string, unknown>, request: Request): string {
  if (typeof body.logged_date === 'string') return body.logged_date.slice(0, 10)
  const url = new URL(request.url)
  const d = url.searchParams.get('date')
  if (d) {
    const parsed = parseISO(d)
    if (!Number.isNaN(parsed.getTime())) return d.slice(0, 10)
  }
  return new Date().toISOString().slice(0, 10)
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

export async function POST(request: Request) {
  return runV1(request, 'diet:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const logged_date = parseLoggedDateFromBody(body, request)
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return jsonError('Campo obrigatório: title', 400)

    const meal_time = parseMealTime(body.meal_time)
    if (body.meal_time !== undefined && body.meal_time !== null && body.meal_time !== '' && meal_time === null) {
      return jsonError('meal_time inválido (use HH:MM)', 400)
    }

    const { data: existing } = await admin
      .from('diet_meal_slots')
      .select('sort_order')
      .eq('user_id', userId)
      .eq('logged_date', logged_date)
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextOrder =
      typeof body.sort_order === 'number'
        ? body.sort_order
        : existing?.[0]?.sort_order !== undefined
          ? (existing[0].sort_order as number) + 1
          : 0

    const { data, error } = await admin
      .from('diet_meal_slots')
      .insert({
        user_id: userId,
        logged_date,
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
