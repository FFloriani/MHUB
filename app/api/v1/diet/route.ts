import { runV1 } from '@/lib/server/v1-handler'
import { jsonError } from '@/lib/server/api-auth'

/** Reservado para o módulo de dieta. */
export async function GET(request: Request) {
  return runV1(request, 'diet:read', async () =>
    jsonError('Módulo dieta ainda não está disponível na API.', 501),
  )
}
