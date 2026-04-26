import { supabase } from '../../supabase'
import type {
  FinanceKind,
  Transaction,
  TransactionInsert,
  TransactionUpdate,
} from './types'

export interface TransactionFilters {
  userId: string
  kind?: FinanceKind | 'all'
  categoryId?: string | null
  search?: string
  tags?: string[]
  /** YYYY-MM-DD inclusive */
  dateFrom?: string
  /** YYYY-MM-DD inclusive */
  dateTo?: string
}

export async function listTransactions(filters: TransactionFilters): Promise<Transaction[]> {
  let query = supabase
    .from('finance_transactions')
    .select('*')
    .eq('user_id', filters.userId)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.kind && filters.kind !== 'all') query = query.eq('kind', filters.kind)
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
  if (filters.dateFrom) query = query.gte('occurred_on', filters.dateFrom)
  if (filters.dateTo) query = query.lte('occurred_on', filters.dateTo)
  if (filters.search?.trim()) query = query.ilike('title', `%${filters.search.trim()}%`)
  if (filters.tags?.length) query = query.contains('tags', filters.tags)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function listTransactionsByMonth(
  userId: string,
  year: number,
  month: number,
): Promise<Transaction[]> {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  return listTransactions({
    userId,
    dateFrom: toISO(start),
    dateTo: toISO(end),
  })
}

export async function listTransactionsByYear(
  userId: string,
  year: number,
): Promise<Transaction[]> {
  return listTransactions({
    userId,
    dateFrom: `${year}-01-01`,
    dateTo: `${year}-12-31`,
  })
}

export async function createTransaction(payload: TransactionInsert): Promise<Transaction> {
  const { data, error } = await supabase
    .from('finance_transactions')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTransaction(
  id: string,
  updates: TransactionUpdate,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('finance_transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('finance_transactions').delete().eq('id', id)
  if (error) throw error
}

export async function listAllTags(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('tags')
    .eq('user_id', userId)
  if (error) throw error
  const set = new Set<string>()
  for (const row of data ?? []) {
    for (const t of row.tags ?? []) set.add(t)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
