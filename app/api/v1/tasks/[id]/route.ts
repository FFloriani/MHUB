import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk, jsonError } from '@/lib/server/api-auth'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return runV1(request, 'agenda:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return jsonError('JSON inválido', 400)
    }

    const updates: Record<string, unknown> = {}
    if (typeof body.title === 'string') updates.title = body.title
    if ('is_completed' in body) updates.is_completed = Boolean(body.is_completed)
    if ('target_date' in body)
      updates.target_date = body.target_date === null ? null : String(body.target_date)

    const { data: existing } = await admin.from('tasks').select('user_id').eq('id', params.id).maybeSingle()
    if (!existing || existing.user_id !== userId) return jsonError('Tarefa não encontrada', 404)

    const { data, error } = await admin
      .from('tasks')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return jsonError(error.message, 400)
    return jsonOk(data)
  })
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  return runV1(request, 'agenda:write', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const { data: existing } = await admin.from('tasks').select('user_id').eq('id', params.id).maybeSingle()
    if (!existing || existing.user_id !== userId) return jsonError('Tarefa não encontrada', 404)

    const { error } = await admin.from('tasks').delete().eq('id', params.id)
    if (error) return jsonError(error.message, 400)
    return jsonOk({ deleted: true, id: params.id })
  })
}
