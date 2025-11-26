import { supabase } from '../supabase'
import type { Database } from '../supabase'

type Task = Database['public']['Tables']['tasks']['Row']
type TaskInsert = Database['public']['Tables']['tasks']['Insert']
type TaskUpdate = Database['public']['Tables']['tasks']['Update']

export async function getTasksByDate(userId: string, date: Date) {
  const dateStr = date.toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('target_date', dateStr)
    .order('is_completed', { ascending: true })
  
  if (error) throw error
  return data as Task[]
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

