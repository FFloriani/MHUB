import { supabase } from '../../supabase'
import type { Budget, BudgetInsert, BudgetUpdate } from './types'

export async function listBudgets(userId: string): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('finance_budgets')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return data ?? []
}

export async function upsertBudget(payload: BudgetInsert): Promise<Budget> {
  const { data, error } = await supabase
    .from('finance_budgets')
    .upsert(payload, { onConflict: 'user_id,category_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBudget(id: string, updates: BudgetUpdate): Promise<Budget> {
  const { data, error } = await supabase
    .from('finance_budgets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBudget(id: string): Promise<void> {
  const { error } = await supabase.from('finance_budgets').delete().eq('id', id)
  if (error) throw error
}

export interface BudgetUsage {
  budget: Budget
  spent: number
  percent: number
  status: 'ok' | 'warning' | 'over'
}

/**
 * Calcula o consumo do mês para cada orçamento (apenas despesas).
 */
export async function getBudgetUsage(
  userId: string,
  year: number,
  month: number,
): Promise<BudgetUsage[]> {
  const budgets = await listBudgets(userId)
  if (budgets.length === 0) return []

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const ids = budgets.map((b) => b.category_id)
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('category_id, amount')
    .eq('user_id', userId)
    .eq('kind', 'expense')
    .in('category_id', ids)
    .gte('occurred_on', monthStart)
    .lte('occurred_on', monthEnd)
  if (error) throw error

  const sums = new Map<string, number>()
  for (const r of data ?? []) {
    if (!r.category_id) continue
    sums.set(r.category_id, (sums.get(r.category_id) ?? 0) + Number(r.amount))
  }

  return budgets.map<BudgetUsage>((b) => {
    const spent = sums.get(b.category_id) ?? 0
    const percent = b.monthly_limit > 0 ? (spent / b.monthly_limit) * 100 : 0
    const status: BudgetUsage['status'] =
      percent >= 100 ? 'over' : percent >= b.alert_threshold ? 'warning' : 'ok'
    return { budget: b, spent, percent, status }
  })
}
