import { authenticateV1Request, jsonError, jsonOk } from '@/lib/server/api-auth'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'

/** Informações da chave autenticada (sem dados sensíveis). */
export async function GET(request: Request) {
  const ctx = await authenticateV1Request(request)
  if (!ctx) {
    return jsonError('Não autorizado. Use Authorization: Bearer <token>.', 401)
  }
  try {
    getSupabaseAdmin()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Servidor não configurado.'
    return jsonError(msg, 503)
  }

  return jsonOk({
    user_id: ctx.userId,
    scopes: ctx.scopes,
    api: 'mhub-v1',
    docs: '/MHUB_API.md',
  })
}
