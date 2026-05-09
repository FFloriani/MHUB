import { hasScope } from '@/lib/api/scopes'
import {
  authenticateV1Request,
  jsonError,
  type V1AuthContext,
} from '@/lib/server/api-auth'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'

type Handler = (ctx: V1AuthContext) => Promise<Response>

/**
 * Autentica Bearer, checa escopo e injeta contexto. Usa service role após auth.
 */
export async function runV1(request: Request, requiredScope: string, handler: Handler): Promise<Response> {
  const ctx = await authenticateV1Request(request)
  if (!ctx) {
    return jsonError('Não autorizado. Envie Authorization: Bearer <sua_chave>.', 401)
  }

  try {
    getSupabaseAdmin()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Configuração do servidor incompleta.'
    return jsonError(msg, 503)
  }

  if (!hasScope(ctx.scopes, requiredScope)) {
    return jsonError(`Permissão negada. Escopo necessário: ${requiredScope}`, 403, {
      scope: requiredScope,
    })
  }

  try {
    return await handler(ctx)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro interno'
    console.error('[api/v1]', e)
    return jsonError(msg, 500)
  }
}
