import { supabase } from '../supabase'
import type { Database } from '../supabase'
import { format, parseISO } from 'date-fns'

type Event = Database['public']['Tables']['events']['Row']
type EventInsert = Database['public']['Tables']['events']['Insert']
type EventUpdate = Database['public']['Tables']['events']['Update']

// Virtual event extends Event with a flag to identify it and reference to parent
export type VirtualEvent = Event & {
  is_virtual?: boolean
  parent_event_id?: string
  virtual_date?: string // The date this virtual instance represents
}

/**
 * Get events for a specific date, including virtual instances of recurring events
 */
export async function getEventsByDate(userId: string, date: Date): Promise<VirtualEvent[]> {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)
  
  const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, etc.
  const dateStr = format(date, 'yyyy-MM-dd')
  
  // Fetch non-recurring events for this specific date
  const { data: regularEvents, error: regularError } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .eq('is_recurring', false)
    .gte('start_time', startOfDay.toISOString())
    .lte('start_time', endOfDay.toISOString())
    .order('start_time', { ascending: true })
  
  if (regularError) throw regularError
  
  // Fetch all recurring events for this user that include this day of week
  const { data: recurringEvents, error: recurringError } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .eq('is_recurring', true)
    .contains('recurrence_days', [dayOfWeek])
  
  if (recurringError) throw recurringError
  
  // Generate virtual events from recurring events
  const virtualEvents: VirtualEvent[] = (recurringEvents || [])
    .filter(event => {
      // Check if recurrence has ended
      if (event.recurrence_end_date) {
        const endDate = new Date(event.recurrence_end_date)
        if (date > endDate) return false
      }
      
      // Check if the date is on or after the original event date
      const originalDate = new Date(event.start_time)
      originalDate.setHours(0, 0, 0, 0)
      if (date < originalDate) return false
      
      return true
    })
    .map(event => {
      // Create virtual event with adjusted times for this date
      const originalStart = parseISO(event.start_time)
      const originalEnd = event.end_time ? parseISO(event.end_time) : null
      
      // Create new start time with the same hours/minutes but on the target date
      const virtualStart = new Date(date)
      virtualStart.setHours(
        originalStart.getHours(),
        originalStart.getMinutes(),
        originalStart.getSeconds(),
        0
      )
      
      let virtualEnd: Date | null = null
      if (originalEnd) {
        virtualEnd = new Date(date)
        virtualEnd.setHours(
          originalEnd.getHours(),
          originalEnd.getMinutes(),
          originalEnd.getSeconds(),
          0
        )
      }
      
      return {
        ...event,
        // Use a composite ID for virtual events: parentId_date
        id: `${event.id}_${dateStr}`,
        start_time: virtualStart.toISOString(),
        end_time: virtualEnd ? virtualEnd.toISOString() : null,
        is_virtual: true,
        parent_event_id: event.id,
        virtual_date: dateStr,
      }
    })
  
  // Combine and sort by start time
  const allEvents: VirtualEvent[] = [
    ...(regularEvents || []).map(e => ({ ...e, is_virtual: false })),
    ...virtualEvents
  ].sort((a, b) => a.start_time.localeCompare(b.start_time))
  
  return allEvents
}

/**
 * Create a new event (recurring or one-time)
 */
export async function createEvent(event: EventInsert): Promise<Event> {
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

/**
 * Create a recurring event
 */
export async function createRecurringEvent(params: {
  user_id: string
  title: string
  start_time: string
  end_time: string | null
  description: string | null
  recurrence_days: number[]
  recurrence_end_date?: string | null
}): Promise<Event> {
  const event: EventInsert = {
    user_id: params.user_id,
    title: params.title,
    start_time: params.start_time,
    end_time: params.end_time,
    description: params.description,
    is_recurring: true,
    recurrence_days: params.recurrence_days,
    recurrence_end_date: params.recurrence_end_date || null,
  }
  
  return createEvent(event)
}

/**
 * Update an event - handles both regular and recurring events
 */
export async function updateEvent(id: string, updates: EventUpdate): Promise<Event> {
  // Check if this is a virtual event ID (contains underscore with date)
  const realId = id.includes('_') ? id.split('_')[0] : id
  
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', realId)
    .select()
    .single()
  
  if (error) throw error
  return data as Event
}

/**
 * Delete an event
 */
export async function deleteEvent(id: string): Promise<void> {
  // Check if this is a virtual event ID
  const realId = id.includes('_') ? id.split('_')[0] : id
  
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', realId)
  
  if (error) throw error
}

/**
 * Get the parent event of a virtual event
 */
export async function getParentEvent(virtualEventId: string): Promise<Event | null> {
  const realId = virtualEventId.includes('_') ? virtualEventId.split('_')[0] : virtualEventId
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', realId)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  return data as Event
}

/**
 * Check if an event is recurring
 */
export async function isEventRecurring(id: string): Promise<boolean> {
  const realId = id.includes('_') ? id.split('_')[0] : id
  
  const { data, error } = await supabase
    .from('events')
    .select('is_recurring')
    .eq('id', realId)
    .single()
  
  if (error) return false
  return data?.is_recurring || false
}

/**
 * Stop recurrence for an event (convert to one-time)
 */
export async function stopRecurrence(id: string): Promise<Event> {
  const realId = id.includes('_') ? id.split('_')[0] : id
  
  return updateEvent(realId, {
    is_recurring: false,
    recurrence_days: null,
    recurrence_end_date: null,
  })
}

/**
 * End recurrence at a specific date
 */
export async function endRecurrenceAt(id: string, endDate: Date): Promise<Event> {
  const realId = id.includes('_') ? id.split('_')[0] : id
  
  return updateEvent(realId, {
    recurrence_end_date: format(endDate, 'yyyy-MM-dd'),
  })
}

/**
 * Delete multiple events by IDs
 */
export async function deleteMultipleEvents(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  
  // Extract real IDs from virtual IDs
  const realIds = [...new Set(ids.map(id => id.includes('_') ? id.split('_')[0] : id))]
  
  const { error } = await supabase
    .from('events')
    .delete()
    .in('id', realIds)
  
  if (error) throw error
}

/**
 * Find related recurring events (deprecated - now we use single recurring event)
 * Kept for backward compatibility during migration
 */
export async function findRepeatedEvents(userId: string, event: Event | VirtualEvent): Promise<Event[]> {
  // For recurring events, just return the parent event
  const realId = event.id.includes('_') ? event.id.split('_')[0] : event.id
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', realId)
  
  if (error) throw error
  return data as Event[]
}

/**
 * Get upcoming events including recurring ones
 */
export async function getUpcomingEvents(userId: string, daysAhead: number = 7): Promise<VirtualEvent[]> {
  const now = new Date()
  const allEvents: VirtualEvent[] = []
  
  // Get events for each day
  for (let i = 0; i <= daysAhead; i++) {
    const date = new Date(now)
    date.setDate(now.getDate() + i)
    
    const dayEvents = await getEventsByDate(userId, date)
    
    // Filter to only future events
    const futureEvents = dayEvents.filter(event => {
      const eventTime = new Date(event.start_time)
      return eventTime >= now
    })
    
    allEvents.push(...futureEvents)
  }
  
  // Sort by start time
  return allEvents.sort((a, b) => a.start_time.localeCompare(b.start_time))
}
