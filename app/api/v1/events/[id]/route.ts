import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'
import { realEventId } from '@/lib/server/agenda-api'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return runV1(request, 'agenda:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const id = realEventId(params.id)
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const updates: Record<string, unknown> = {}
    if (typeof body.title === 'string') updates.title = body.title
    if (typeof body.start_time === 'string') updates.start_time = body.start_time
    if ('end_time' in body) updates.end_time = body.end_time === null ? null : String(body.end_time)
    if ('description' in body)
      updates.description = body.description === null ? null : String(body.description)
    if ('is_recurring' in body) updates.is_recurring = Boolean(body.is_recurring)
    if (Array.isArray(body.recurrence_days)) updates.recurrence_days = body.recurrence_days
    if ('recurrence_end_date' in body)
      updates.recurrence_end_date =
        body.recurrence_end_date === null ? null : String(body.recurrence_end_date)

    const { data: existing } = await admin.from('events').select('user_id').eq('id', id).maybeSingle()
    if (!existing || existing.user_id !== userId) return jsonError('Evento não encontrado', 404)

    const { data, error } = await admin.from('events').update(updates).eq('id', id).select().single()
    if (error) return jsonError(error.message, 400)
    return jsonOk(data)
  })
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  return runV1(request, 'agenda:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const id = realEventId(params.id)

    const { data: existing } = await admin.from('events').select('user_id').eq('id', id).maybeSingle()
    if (!existing || existing.user_id !== userId) return jsonError('Evento não encontrado', 404)

    const { error } = await admin.from('events').delete().eq('id', id)
    if (error) return jsonError(error.message, 400)
    return jsonOk({ deleted: true, id })
  })
}
