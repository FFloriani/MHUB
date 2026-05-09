import { parseISO } from 'date-fns'
import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'
import { fetchEventsForDateAdmin } from '@/lib/server/agenda-api'

function parseDateQuery(url: URL): Date {
  const d = url.searchParams.get('date')
  if (d) {
    const parsed = parseISO(d)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

export async function GET(request: Request) {
  return runV1(request, 'agenda:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const date = parseDateQuery(new URL(request.url))
    const events = await fetchEventsForDateAdmin(admin, userId, date)
    return jsonOk({ date: date.toISOString().slice(0, 10), events })
  })
}

export async function POST(request: Request) {
  return runV1(request, 'agenda:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const start_time = typeof body.start_time === 'string' ? body.start_time : ''
    if (!title || !start_time) {
      return jsonError('Campos obrigatórios: title, start_time (ISO 8601)', 400)
    }

    const insert = {
      user_id: userId,
      title,
      start_time,
      end_time: typeof body.end_time === 'string' ? body.end_time : null,
      description: typeof body.description === 'string' ? body.description : null,
      is_recurring: Boolean(body.is_recurring),
      recurrence_days: Array.isArray(body.recurrence_days)
        ? (body.recurrence_days as number[]).filter((n) => typeof n === 'number')
        : null,
      recurrence_end_date:
        typeof body.recurrence_end_date === 'string' ? body.recurrence_end_date : null,
    }

    const { data, error } = await admin.from('events').insert(insert).select().single()
    if (error) return jsonError(error.message, 400)
    return jsonOk(data, 201)
  })
}
