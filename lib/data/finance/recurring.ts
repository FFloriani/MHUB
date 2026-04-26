import { supabase } from '../../supabase'
import type {
  Recurring,
  RecurringInsert,
  RecurringUpdate,
  TransactionInsert,
} from './types'

export async function listRecurring(userId: string): Promise<Recurring[]> {
  const { data, error } = await supabase
    .from('finance_recurring')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createRecurring(payload: RecurringInsert): Promise<Recurring> {
  const { data, error } = await supabase
    .from('finance_recurring')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRecurring(
  id: string,
  updates: RecurringUpdate,
): Promise<Recurring> {
  const { data, error } = await supabase
    .from('finance_recurring')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRecurring(id: string): Promise<void> {
  const { error } = await supabase.from('finance_recurring').delete().eq('id', id)
  if (error) throw error
}

/**
 * Para cada template ativo dentro do intervalo (start_date <= mês fim e
 * (end_date é null ou >= mês início)), cria uma transação no mês alvo
 * caso ainda não exista uma transação para aquele template naquele mês.
 *
 * Retorna a quantidade de transações criadas.
 */
export async function materializeRecurringMonth(
  userId: string,
  year: number,
  month: number,
): Promise<number> {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = toISO(new Date(year, month, 0))

  const { data: templates, error: tplErr } = await supabase
    .from('finance_recurring')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .lte('start_date', monthEnd)

  if (tplErr) throw tplErr
  const eligible = (templates ?? []).filter(
    (t) => !t.end_date || t.end_date >= monthStart,
  )
  if (eligible.length === 0) return 0

  const ids = eligible.map((t) => t.id)
  const { data: existing, error: exErr } = await supabase
    .from('finance_transactions')
    .select('recurring_id')
    .eq('user_id', userId)
    .gte('occurred_on', monthStart)
    .lte('occurred_on', monthEnd)
    .in('recurring_id', ids)

  if (exErr) throw exErr
  const already = new Set((existing ?? []).map((r) => r.recurring_id))

  const lastDay = new Date(year, month, 0).getDate()
  const toInsert: TransactionInsert[] = eligible
    .filter((t) => !already.has(t.id))
    .map((t) => {
      const day = Math.min(t.day_of_month, lastDay)
      const occurred = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      return {
        user_id: userId,
        kind: t.kind,
        category_id: t.category_id,
        title: t.title,
        amount: t.amount,
        occurred_on: occurred,
        payment_method: t.payment_method,
        notes: t.notes,
        recurring_id: t.id,
        paid: false,
      }
    })

  if (toInsert.length === 0) return 0

  const { error: insErr } = await supabase.from('finance_transactions').insert(toInsert)
  if (insErr) throw insErr
  return toInsert.length
}

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
