import type { SupabaseClient } from '@supabase/supabase-js'

/** Verifica se o plano pertence ao usuário. */
export async function assertPlanOwned(
  admin: SupabaseClient,
  userId: string,
  planId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from('workout_plans')
    .select('user_id')
    .eq('id', planId)
    .maybeSingle()
  if (error || !data) return false
  return data.user_id === userId
}

/** Verifica se o dia pertence ao usuário (via plano). */
export async function assertDayOwned(
  admin: SupabaseClient,
  userId: string,
  dayId: string,
): Promise<{ ok: boolean; planId: string | null }> {
  const { data: day, error } = await admin
    .from('workout_days')
    .select('plan_id')
    .eq('id', dayId)
    .maybeSingle()
  if (error || !day) return { ok: false, planId: null }
  const owned = await assertPlanOwned(admin, userId, day.plan_id)
  return { ok: owned, planId: day.plan_id }
}

/** Verifica se o exercício pertence ao usuário (via dia → plano). */
export async function assertExerciseOwned(
  admin: SupabaseClient,
  userId: string,
  exerciseId: string,
): Promise<boolean> {
  const { data: ex, error } = await admin
    .from('workout_exercises')
    .select('day_id')
    .eq('id', exerciseId)
    .maybeSingle()
  if (error || !ex) return false
  const { ok } = await assertDayOwned(admin, userId, ex.day_id)
  return ok
}
