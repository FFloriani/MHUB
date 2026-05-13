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

function ymdLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * GET /api/v1/events
 *
 * - Sem nada / `?date=YYYY-MM-DD`: eventos do dia (inclui recorrentes virtuais).
 * - `?from=YYYY-MM-DD&to=YYYY-MM-DD`: devolve `{ from, to, days: [{ date, events }] }`.
 *   Limite: até 31 dias por chamada.
 * - `?upcoming=true&limit=N` (default 10, máx 50): próximos eventos a partir de hoje.
 */
export async function GET(request: Request) {
  return runV1(request, 'agenda:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const upcoming = url.searchParams.get('upcoming') === 'true'
    const limitParam = Number(url.searchParams.get('limit') ?? '10')

    if (upcoming) {
      const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10
      const now = new Date()
      const days: Array<{ date: string; events: Awaited<ReturnType<typeof fetchEventsForDateAdmin>> }> = []
      let collected = 0
      for (let i = 0; i < 60 && collected < limit; i += 1) {
        const d = new Date(now)
        d.setDate(now.getDate() + i)
        d.setHours(0, 0, 0, 0)
        const evs = await fetchEventsForDateAdmin(admin, userId, d)
        const future = i === 0 ? evs.filter((e) => new Date(e.start_time).getTime() >= now.getTime()) : evs
        if (future.length > 0) {
          days.push({ date: ymdLocal(d), events: future.slice(0, limit - collected) })
          collected += future.length
        }
      }
      const flat = days.flatMap((d) => d.events).slice(0, limit)
      return jsonOk({ upcoming: true, events: flat, days })
    }

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

      const days: Array<{ date: string; events: Awaited<ReturnType<typeof fetchEventsForDateAdmin>> }> = []
      for (let i = 0; i < dayCount; i += 1) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        d.setHours(0, 0, 0, 0)
        const evs = await fetchEventsForDateAdmin(admin, userId, d)
        days.push({ date: ymdLocal(d), events: evs })
      }
      return jsonOk({ from: ymdLocal(start), to: ymdLocal(end), days })
    }

    const date = parseDateQuery(url)
    const events = await fetchEventsForDateAdmin(admin, userId, date)
    return jsonOk({ date: ymdLocal(date), events })
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
