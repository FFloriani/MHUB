import { supabase } from '../supabase'
import type { Database } from '../supabase'

type Task = Database['public']['Tables']['tasks']['Row']
type TaskInsert = Database['public']['Tables']['tasks']['Insert']
type TaskUpdate = Database['public']['Tables']['tasks']['Update']

/**
 * Busca TODAS as tarefas do usuário:
 * - Todas as pendentes (independente de data)
 * - Concluídas nos últimos 7 dias (para dar tempo de ver/desmarcar)
 */
export async function getAllTasks(userId: string) {
  // 1. Todas as pendentes
  const { data: pending, error: pendingError } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('is_completed', false)
    .order('created_at', { ascending: false })

  if (pendingError) throw pendingError

  // 2. Concluídas recentemente (últimos 7 dias)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: completed, error: completedError } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('is_completed', true)
    .gte('target_date', sevenDaysAgo.toISOString().split('T')[0])
    .order('target_date', { ascending: false })

  if (completedError) throw completedError

  return [...(pending || []), ...(completed || [])] as Task[]
}

/** @deprecated Use getAllTasks instead */
export async function getTasksByDate(userId: string, date: Date) {
  return getAllTasks(userId)
}

export async function createTask(task: TaskInsert) {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single()
  
  if (error) throw error
  return data as Task
}

export async function updateTask(id: string, updates: TaskUpdate) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data as Task
}

export async function deleteTask(id: string) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

