import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk } from '@/lib/server/api-auth'

/**
 * GET /api/v1/workout
 *
 * Sem parâmetros: devolve plano ativo aninhado (compatibilidade legado).
 * `?plan_id=...`: devolve aquele plano específico (precisa ser do usuário).
 * `?all=true`: devolve `{ plans: [{ ...plan, days: [{ ...day, exercises: [] }] }] }` com TODOS os planos.
 */
export async function GET(request: Request) {
  return runV1(request, 'workout:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const url = new URL(request.url)
    const all = url.searchParams.get('all') === 'true'
    const planIdParam = url.searchParams.get('plan_id')

    const planQuery = admin.from('workout_plans').select('*').eq('user_id', userId)

    if (all) {
      const { data: plans, error } = await planQuery.order('updated_at', { ascending: false })
      if (error) throw error
      const result = await Promise.all((plans ?? []).map((p) => loadPlanFull(admin, p.id, p)))
      return jsonOk({ plans: result })
    }

    if (planIdParam) {
      const { data: plan, error } = await planQuery.eq('id', planIdParam).maybeSingle()
      if (error) throw error
      if (!plan) return jsonOk({ plan: null, days: [] })
      const full = await loadPlanFull(admin, plan.id, plan)
      return jsonOk(full)
    }

    const { data: plan, error } = await planQuery.eq('is_active', true).maybeSingle()
    if (error) throw error
    if (!plan) return jsonOk({ plan: null, days: [] })
    const full = await loadPlanFull(admin, plan.id, plan)
    return jsonOk(full)
  })
}

async function loadPlanFull(
  admin: ReturnType<typeof getSupabaseAdmin>,
  planId: string,
  plan: unknown,
) {
  const { data: days } = await admin
    .from('workout_days')
    .select('*')
    .eq('plan_id', planId)
    .order('order', { ascending: true })

  const daysWithExercises = await Promise.all(
    (days || []).map(async (day) => {
      const { data: exercises } = await admin
        .from('workout_exercises')
        .select('*')
        .eq('day_id', day.id)
        .order('order', { ascending: true })
      return { ...day, exercises: exercises ?? [] }
    }),
  )

  return { plan, days: daysWithExercises }
}
