/**
 * Escopos da API pública (Bearer). Compartilhado entre UI de configuração e rotas.
 * - `*` concede tudo.
 * - `recurso:*` concede leitura e escrita daquele recurso.
 */

export const API_SCOPES = [
  { id: '*', label: 'Acesso total (todos os módulos)', description: 'Equivalente a todas as permissões abaixo.' },
  { id: 'agenda:*', label: 'Agenda (completo)', description: 'Eventos e tarefas — ler e alterar.' },
  { id: 'agenda:read', label: 'Agenda — leitura', description: 'Listar eventos e tarefas.' },
  { id: 'agenda:write', label: 'Agenda — escrita', description: 'Criar, editar e excluir eventos e tarefas.' },
  { id: 'finance:*', label: 'Financeiro (completo)', description: 'Categorias e transações.' },
  { id: 'finance:read', label: 'Financeiro — leitura', description: 'Listar categorias e transações.' },
  { id: 'finance:write', label: 'Financeiro — escrita', description: 'Criar e editar categorias e transações.' },
  { id: 'workout:*', label: 'Treino (completo)', description: 'Planos, dias, exercícios e logs.' },
  { id: 'workout:read', label: 'Treino — leitura', description: 'Ler planos, fichas e histórico.' },
  { id: 'workout:write', label: 'Treino — escrita', description: 'Criar/editar planos, dias, exercícios e registrar treinos.' },
  { id: 'settings:*', label: 'Preferências (completo)', description: 'Configurações da conta no app.' },
  { id: 'settings:read', label: 'Preferências — leitura', description: 'Ler notificações e preferências.' },
  { id: 'settings:write', label: 'Preferências — escrita', description: 'Atualizar notificações e preferências.' },
  { id: 'diet:*', label: 'Dieta (completo)', description: 'Ler e registrar refeições pela API.' },
  { id: 'diet:read', label: 'Dieta — leitura', description: 'GET /api/v1/diet (por data ou intervalo).' },
  { id: 'diet:write', label: 'Dieta — escrita', description: 'POST/PATCH/DELETE em entradas de dieta.' },
  { id: 'backup:read', label: 'Backup — leitura', description: 'Snapshot completo (GET /api/v1/backup).' },
] as const

export type ApiScopeId = (typeof API_SCOPES)[number]['id']

export function normalizeScopes(scopes: string[]): string[] {
  const set = new Set<string>()
  for (const s of scopes) {
    const t = s.trim()
    if (t) set.add(t)
  }
  return Array.from(set)
}

export function hasScope(granted: string[], required: string): boolean {
  if (granted.includes('*')) return true
  if (granted.includes(required)) return true
  const [resource, action] = required.split(':')
  if (resource && action && granted.includes(`${resource}:*`)) return true
  return false
}

export function assertScopes(granted: string[], required: string): boolean {
  return hasScope(granted, required)
}
