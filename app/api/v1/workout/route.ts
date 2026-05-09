import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk } from '@/lib/server/api-auth'

export async function GET(request: Request) {
  return runV1(request, 'workout:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()
    const { data: plan, error: e1 } = await admin
      .from('workout_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()

    if (e1) throw e1
    if (!plan) return jsonOk({ plan: null, days: [] })

    const { data: days, error: e2 } = await admin
      .from('workout_days')
      .select('*')
      .eq('plan_id', plan.id)
      .order('order', { ascending: true })

    if (e2) throw e2

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

    return jsonOk({ plan, days: daysWithExercises })
  })
}
