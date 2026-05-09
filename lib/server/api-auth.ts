import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { hashApiKeySecret } from '@/lib/server/hash-api-key'

export type V1AuthContext = {
  userId: string
  keyId: string
  scopes: string[]
}

export function extractBearerToken(request: Request): string | null {
  const h = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!h?.startsWith('Bearer ')) return null
  const t = h.slice(7).trim()
  return t || null
}

/**
 * Valida Bearer token contra user_api_keys (hash) e retorna contexto.
 */
export async function authenticateV1Request(request: Request): Promise<V1AuthContext | null> {
  const plain = extractBearerToken(request)
  if (!plain) return null

  let admin
  try {
    admin = getSupabaseAdmin()
  } catch {
    return null
  }

  const keyHash = hashApiKeySecret(plain)
  const { data, error } = await admin
    .from('user_api_keys')
    .select('id, user_id, scopes, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle()

  if (error || !data || data.revoked_at) return null

  void touchKeyLastUsed(data.id)

  return {
    userId: data.user_id,
    keyId: data.id,
    scopes: Array.isArray(data.scopes) ? data.scopes : [],
  }
}

async function touchKeyLastUsed(keyId: string): Promise<void> {
  try {
    const admin = getSupabaseAdmin()
    await admin
      .from('user_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyId)
  } catch {
    // ignora falha de telemetria
  }
}

export function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return Response.json({ error: message, ...extra }, { status })
}

export function jsonOk(body: unknown, status = 200) {
  return Response.json(body, { status })
}
