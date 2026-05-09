import type { SupabaseClient } from '@supabase/supabase-js'
import { format, parseISO } from 'date-fns'
import type { Database } from '@/lib/supabase'

export type VirtualEventRow = Database['public']['Tables']['events']['Row'] & {
  is_virtual?: boolean
  parent_event_id?: string
  virtual_date?: string
}

/**
 * Mesma lógica de getEventsByDate, usando cliente Supabase injetado (ex.: service role).
 */
export async function fetchEventsForDateAdmin(
  admin: SupabaseClient,
  userId: string,
  date: Date,
): Promise<VirtualEventRow[]> {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const dayOfWeek = date.getDay()
  const dateStr = format(date, 'yyyy-MM-dd')

  const { data: regularEvents, error: regularError } = await admin
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .eq('is_recurring', false)
    .gte('start_time', startOfDay.toISOString())
    .lte('start_time', endOfDay.toISOString())
    .order('start_time', { ascending: true })

  if (regularError) throw regularError

  const { data: recurringEvents, error: recurringError } = await admin
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .eq('is_recurring', true)
    .contains('recurrence_days', [dayOfWeek])

  if (recurringError) throw recurringError

  const virtualEvents: VirtualEventRow[] = (recurringEvents || [])
    .filter((event) => {
      if (event.recurrence_end_date) {
        const endDate = new Date(event.recurrence_end_date)
        if (date > endDate) return false
      }
      const originalDate = new Date(event.start_time)
      originalDate.setHours(0, 0, 0, 0)
      if (date < originalDate) return false
      return true
    })
    .map((event) => {
      const originalStart = parseISO(event.start_time)
      const originalEnd = event.end_time ? parseISO(event.end_time) : null

      const virtualStart = new Date(date)
      virtualStart.setHours(
        originalStart.getHours(),
        originalStart.getMinutes(),
        originalStart.getSeconds(),
        0,
      )

      let virtualEnd: Date | null = null
      if (originalEnd) {
        virtualEnd = new Date(date)
        virtualEnd.setHours(
          originalEnd.getHours(),
          originalEnd.getMinutes(),
          originalEnd.getSeconds(),
          0,
        )
      }

      return {
        ...event,
        id: `${event.id}_${dateStr}`,
        start_time: virtualStart.toISOString(),
        end_time: virtualEnd ? virtualEnd.toISOString() : null,
        is_virtual: true as const,
        parent_event_id: event.id,
        virtual_date: dateStr,
      }
    })

  const allEvents: VirtualEventRow[] = [
    ...(regularEvents || []).map((e) => ({ ...e, is_virtual: false as const })),
    ...virtualEvents,
  ].sort((a, b) => a.start_time.localeCompare(b.start_time))

  return allEvents
}

export function realEventId(id: string): string {
  return id.includes('_') ? id.split('_')[0] : id
}
