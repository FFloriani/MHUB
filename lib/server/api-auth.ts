import { getSupabaseAdmin } from '@/lib/server/supabase-admin'

export type V1AuthContext = {
  userId: string
}

export function extractBearerToken(request: Request): string | null {
  const h = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!h?.startsWith('Bearer ')) return null
  const t = h.slice(7).trim()
  return t || null
}

/**
 * Valida Bearer token contra api_token em user_settings.
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

  const { data, error } = await admin
    .from('user_settings')
    .select('user_id')
    .eq('api_token', plain)
    .maybeSingle()

  if (error || !data) return null

  return { userId: data.user_id }
}

export function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return Response.json({ error: message, ...extra }, { status })
}

export function jsonOk(body: unknown, status = 200) {
  return Response.json(body, { status })
}
