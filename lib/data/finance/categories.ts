import { supabase } from '../../supabase'
import type { Category, CategoryInsert, CategoryUpdate, FinanceKind } from './types'

export const DEFAULT_EXPENSE_CATEGORIES: Array<{ name: string; icon: string; color: string }> = [
  { name: 'Alimentação', icon: 'UtensilsCrossed', color: '#f97316' },
  { name: 'iFood', icon: 'Bike', color: '#ef4444' },
  { name: 'Mercado', icon: 'ShoppingCart', color: '#22c55e' },
  { name: 'Transporte', icon: 'Car', color: '#3b82f6' },
  { name: 'Uber', icon: 'Car', color: '#0ea5e9' },
  { name: 'Casa', icon: 'Home', color: '#8b5cf6' },
  { name: 'Aluguel', icon: 'Building2', color: '#a855f7' },
  { name: 'Contas', icon: 'Receipt', color: '#06b6d4' },
  { name: 'Internet', icon: 'Wifi', color: '#0891b2' },
  { name: 'Energia', icon: 'Zap', color: '#eab308' },
  { name: 'Água', icon: 'Droplet', color: '#0ea5e9' },
  { name: 'Saúde', icon: 'Heart', color: '#ec4899' },
  { name: 'Higiene', icon: 'Sparkles', color: '#14b8a6' },
  { name: 'Academia', icon: 'Dumbbell', color: '#dc2626' },
  { name: 'Lazer', icon: 'Gamepad2', color: '#a855f7' },
  { name: 'Streaming', icon: 'Tv', color: '#e11d48' },
  { name: 'Compras Online', icon: 'Package', color: '#f59e0b' },
  { name: 'Vestuário', icon: 'Shirt', color: '#d946ef' },
  { name: 'Educação', icon: 'GraduationCap', color: '#0d9488' },
  { name: 'Pets', icon: 'Cat', color: '#a16207' },
  { name: 'Presentes', icon: 'Gift', color: '#db2777' },
  { name: 'Outros', icon: 'MoreHorizontal', color: '#64748b' },
]

export const DEFAULT_INCOME_CATEGORIES: Array<{ name: string; icon: string; color: string }> = [
  { name: 'Salário', icon: 'Wallet', color: '#10b981' },
  { name: 'Freelance', icon: 'Briefcase', color: '#0ea5e9' },
  { name: 'Bônus', icon: 'Award', color: '#f59e0b' },
  { name: '13º / Férias', icon: 'CalendarHeart', color: '#8b5cf6' },
  { name: 'Reembolso', icon: 'Undo2', color: '#14b8a6' },
  { name: 'Outros', icon: 'MoreHorizontal', color: '#64748b' },
]

export const DEFAULT_INVESTMENT_CATEGORIES: Array<{ name: string; icon: string; color: string }> = [
  { name: 'Tesouro Direto', icon: 'Landmark', color: '#0d9488' },
  { name: 'Renda Fixa', icon: 'PiggyBank', color: '#0ea5e9' },
  { name: 'Ações', icon: 'TrendingUp', color: '#16a34a' },
  { name: 'Cripto', icon: 'Bitcoin', color: '#f59e0b' },
  { name: 'Previdência', icon: 'ShieldCheck', color: '#6366f1' },
  { name: 'Outros', icon: 'MoreHorizontal', color: '#64748b' },
]

export async function listCategories(userId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('finance_categories')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createCategory(payload: CategoryInsert): Promise<Category> {
  const { data, error } = await supabase
    .from('finance_categories')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCategory(id: string, updates: CategoryUpdate): Promise<Category> {
  const { data, error } = await supabase
    .from('finance_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('finance_categories').delete().eq('id', id)
  if (error) throw error
}

export async function ensureDefaultCategories(userId: string): Promise<Category[]> {
  const existing = await listCategories(userId)
  if (existing.length > 0) return existing

  const seeds: CategoryInsert[] = [
    ...DEFAULT_EXPENSE_CATEGORIES.map<CategoryInsert>((c, i) => ({
      user_id: userId,
      name: c.name,
      icon: c.icon,
      color: c.color,
      kind: 'expense' as FinanceKind,
      sort_order: i,
    })),
    ...DEFAULT_INCOME_CATEGORIES.map<CategoryInsert>((c, i) => ({
      user_id: userId,
      name: c.name,
      icon: c.icon,
      color: c.color,
      kind: 'income' as FinanceKind,
      sort_order: i,
    })),
    ...DEFAULT_INVESTMENT_CATEGORIES.map<CategoryInsert>((c, i) => ({
      user_id: userId,
      name: c.name,
      icon: c.icon,
      color: c.color,
      kind: 'investment' as FinanceKind,
      sort_order: i,
    })),
  ]

  const { data, error } = await supabase
    .from('finance_categories')
    .insert(seeds)
    .select()

  if (error) throw error
  return data ?? []
}
