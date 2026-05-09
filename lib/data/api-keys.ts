import { supabase } from '../supabase'
import type { Database } from '../supabase'

export type UserApiKeyRow = Database['public']['Tables']['user_api_keys']['Row']

/** Lista chaves do usuário (sem o hash). */
export async function listUserApiKeys(): Promise<
  Pick<
    UserApiKeyRow,
    'id' | 'name' | 'token_prefix' | 'scopes' | 'created_at' | 'last_used_at' | 'revoked_at'
  >[]
> {
  const { data: session } = await supabase.auth.getUser()
  const user = session.user
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('user_api_keys')
    .select('id, name, token_prefix, scopes, created_at, last_used_at, revoked_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function revokeUserApiKey(keyId: string): Promise<void> {
  const { error } = await supabase
    .from('user_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)

  if (error) throw error
}
