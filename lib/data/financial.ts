import { supabase } from '../supabase'
import type { Database } from '../supabase'

type Revenue = Database['public']['Tables']['revenues']['Row']
type RevenueInsert = Database['public']['Tables']['revenues']['Insert']
type RevenueUpdate = Database['public']['Tables']['revenues']['Update']

type Investment = Database['public']['Tables']['investments']['Row']
type InvestmentInsert = Database['public']['Tables']['investments']['Insert']
type InvestmentUpdate = Database['public']['Tables']['investments']['Update']

type Expense = Database['public']['Tables']['expenses']['Row']
type ExpenseInsert = Database['public']['Tables']['expenses']['Insert']
type ExpenseUpdate = Database['public']['Tables']['expenses']['Update']

// ========== RECEITAS ==========
export async function getRevenues(userId: string, year: number) {
  const { data, error } = await supabase
    .from('revenues')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .order('month', { ascending: true })
    .order('category', { ascending: true })
  
  if (error) throw error
  return data as Revenue[]
}

export async function createRevenue(revenue: RevenueInsert) {
  // Verifica se já existe
  const { data: existing, error: checkError } = await supabase
    .from('revenues')
    .select('id')
    .eq('user_id', revenue.user_id)
    .eq('category', revenue.category)
    .eq('month', revenue.month)
    .eq('year', revenue.year)
    .maybeSingle()

  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError
  }

  if (existing) {
    // Atualiza se já existe
    const { data, error } = await supabase
      .from('revenues')
      .update({ amount: revenue.amount })
      .eq('id', existing.id)
      .select()
      .single()
    
    if (error) throw error
    return data as Revenue
  } else {
    // Cria novo
    const { data, error } = await supabase
      .from('revenues')
      .insert(revenue)
      .select()
      .single()
    
    if (error) throw error
    return data as Revenue
  }
}

export async function updateRevenue(id: string, updates: RevenueUpdate) {
  const { data, error } = await supabase
    .from('revenues')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data as Revenue
}

export async function deleteRevenue(id: string) {
  const { error } = await supabase
    .from('revenues')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// ========== INVESTIMENTOS ==========
export async function getInvestments(userId: string, year: number) {
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .order('month', { ascending: true })
    .order('category', { ascending: true })
  
  if (error) throw error
  return data as Investment[]
}

export async function createInvestment(investment: InvestmentInsert) {
  // Verifica se já existe
  const { data: existing, error: checkError } = await supabase
    .from('investments')
    .select('id')
    .eq('user_id', investment.user_id)
    .eq('category', investment.category)
    .eq('month', investment.month)
    .eq('year', investment.year)
    .maybeSingle()

  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError
  }

  if (existing) {
    // Atualiza se já existe
    const { data, error } = await supabase
      .from('investments')
      .update({ amount: investment.amount })
      .eq('id', existing.id)
      .select()
      .single()
    
    if (error) throw error
    return data as Investment
  } else {
    // Cria novo
    const { data, error } = await supabase
      .from('investments')
      .insert(investment)
      .select()
      .single()
    
    if (error) throw error
    return data as Investment
  }
}

export async function updateInvestment(id: string, updates: InvestmentUpdate) {
  const { data, error } = await supabase
    .from('investments')
    .update(updates)
    .select()
    .single()
  
  if (error) throw error
  return data as Investment
}

export async function deleteInvestment(id: string) {
  const { error } = await supabase
    .from('investments')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// ========== DESPESAS ==========
export async function getExpenses(userId: string, year: number) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .order('month', { ascending: true })
    .order('type', { ascending: true })
    .order('category', { ascending: true })
  
  if (error) throw error
  return data as Expense[]
}

export async function createExpense(expense: ExpenseInsert) {
  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select()
    .single()
  
  if (error) throw error
  return data as Expense
}

export async function updateExpense(id: string, updates: ExpenseUpdate) {
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data as Expense
}

export async function deleteExpense(id: string) {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Tipos exportados
export type { Revenue, Investment, Expense }

