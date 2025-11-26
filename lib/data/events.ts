import { supabase } from '../supabase'
import type { Database } from '../supabase'

type Event = Database['public']['Tables']['events']['Row']
type EventInsert = Database['public']['Tables']['events']['Insert']
type EventUpdate = Database['public']['Tables']['events']['Update']

export async function getEventsByDate(userId: string, date: Date) {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', startOfDay.toISOString())
    .lte('start_time', endOfDay.toISOString())
    .order('start_time', { ascending: true })
  
  if (error) throw error
  return data as Event[]
}

export async function createEvent(event: EventInsert) {
  const { data, error } = await supabase
    .from('events')
    .insert(event)
    .select()
    .single()
  
  if (error) {
    console.error('Supabase error creating event:', error)
    throw error
  }
  return data as Event
}

export async function updateEvent(id: string, updates: EventUpdate) {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data as Event
}

export async function deleteEvent(id: string) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export async function findRepeatedEvents(userId: string, event: Event) {
  // Extrai o horário (HH:mm) do evento
  const startTime = new Date(event.start_time)
  const endTime = new Date(event.end_time)
  const startHour = startTime.getHours()
  const startMinute = startTime.getMinutes()
  const endHour = endTime.getHours()
  const endMinute = endTime.getMinutes()
  
  // Busca todos os eventos do usuário com mesmo título
  let query = supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .eq('title', event.title)
  
  // Se a descrição não for nula, filtra por descrição também
  if (event.description) {
    query = query.eq('description', event.description)
  } else {
    query = query.is('description', null)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  
  // Filtra eventos com mesmo horário (mesma hora e minuto de início e fim)
  const repeated = (data as Event[]).filter((e) => {
    const eStart = new Date(e.start_time)
    const eEnd = new Date(e.end_time)
    return (
      eStart.getHours() === startHour &&
      eStart.getMinutes() === startMinute &&
      eEnd.getHours() === endHour &&
      eEnd.getMinutes() === endMinute
    )
  })
  
  return repeated
}

export async function deleteMultipleEvents(ids: string[]) {
  if (ids.length === 0) return
  
  const { error } = await supabase
    .from('events')
    .delete()
    .in('id', ids)
  
  if (error) throw error
}

export async function getUpcomingEvents(userId: string, daysAhead: number = 7) {
  const now = new Date()
  const futureDate = new Date()
  futureDate.setDate(now.getDate() + daysAhead)
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', now.toISOString())
    .lte('start_time', futureDate.toISOString())
    .order('start_time', { ascending: true })
  
  if (error) throw error
  return data as Event[]
}

