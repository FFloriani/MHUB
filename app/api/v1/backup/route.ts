import { runV1 } from '@/lib/server/v1-handler'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'
import { jsonOk } from '@/lib/server/api-auth'

/**
 * GET /api/v1/backup
 *
 * Snapshot completo das tabelas do usuário (todos os módulos).
 * Útil para a IA enxergar o estado em uma chamada só. Escopo: `backup:read`.
 *
 * Resposta:
 * ```
 * {
 *   version: 2,
 *   timestamp: "...",
 *   user_id: "...",
 *   data: {
 *     user_settings, events, tasks,
 *     finance: { categories, transactions, recurring, installments, budgets, loans, loan_payments },
 *     workout: { plans, days, exercises, logs },
 *     diet: { meal_slots, entries }
 *   }
 * }
 * ```
 */
export async function GET(request: Request) {
  return runV1(request, 'backup:read', async ({ userId }) => {
    const admin = getSupabaseAdmin()

    const [
      settingsRes,
      eventsRes,
      tasksRes,
      catsRes,
      txsRes,
      recRes,
      instRes,
      budgRes,
      loansRes,
      loanPaysRes,
      plansRes,
      daysRes,
      exsRes,
      logsRes,
      slotsRes,
      entriesRes,
    ] = await Promise.all([
      admin.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
      admin.from('events').select('*').eq('user_id', userId),
      admin.from('tasks').select('*').eq('user_id', userId),
      admin.from('finance_categories').select('*').eq('user_id', userId),
      admin.from('finance_transactions').select('*').eq('user_id', userId),
      admin.from('finance_recurring').select('*').eq('user_id', userId),
      admin.from('finance_installments').select('*').eq('user_id', userId),
      admin.from('finance_budgets').select('*').eq('user_id', userId),
      admin.from('finance_loans').select('*').eq('user_id', userId),
      admin.from('finance_loan_payments').select('*').eq('user_id', userId),
      admin.from('workout_plans').select('*').eq('user_id', userId),
      admin.from('workout_days').select('*'),
      admin.from('workout_exercises').select('*'),
      admin.from('workout_logs').select('*').eq('user_id', userId),
      admin.from('diet_meal_slots').select('*').eq('user_id', userId),
      admin.from('diet_entries').select('*').eq('user_id', userId),
    ])

    const planIds = new Set((plansRes.data ?? []).map((p) => p.id))
    const days = (daysRes.data ?? []).filter((d) => planIds.has(d.plan_id))
    const dayIds = new Set(days.map((d) => d.id))
    const exercises = (exsRes.data ?? []).filter((e) => dayIds.has(e.day_id))

    return jsonOk({
      version: 2,
      timestamp: new Date().toISOString(),
      user_id: userId,
      data: {
        user_settings: settingsRes.data ?? null,
        events: eventsRes.data ?? [],
        tasks: tasksRes.data ?? [],
        finance: {
          categories: catsRes.data ?? [],
          transactions: txsRes.data ?? [],
          recurring: recRes.data ?? [],
          installments: instRes.data ?? [],
          budgets: budgRes.data ?? [],
          loans: loansRes.data ?? [],
          loan_payments: loanPaysRes.data ?? [],
        },
        workout: {
          plans: plansRes.data ?? [],
          days,
          exercises,
          logs: logsRes.data ?? [],
        },
        diet: {
          meal_slots: slotsRes.data ?? [],
          entries: entriesRes.data ?? [],
        },
      },
    })
  })
}
