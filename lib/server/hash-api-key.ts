import { createHash } from 'crypto'

/**
 * Hash armazenado no banco para o segredo em texto puro (enviado no header Authorization).
 * O token em si nunca é persistido.
 */
export function hashApiKeySecret(plainSecret: string): string {
  return createHash('sha256').update(plainSecret, 'utf8').digest('hex')
}
