'use client'

import { format, parseISO } from 'date-fns'
import { Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import type { Database } from '@/lib/supabase'

type Event = Database['public']['Tables']['events']['Row']

interface TimelineProps {
  events: Event[]
  onAddEvent: () => void
}

export default function Timeline({ events, onAddEvent }: TimelineProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i)

  const getEventPosition = (event: Event, hour: number): {
    top: string
    height: string
    isStart: boolean
    isEnd: boolean
  } | null => {
    const start = parseISO(event.start_time)
    const end = parseISO(event.end_time)
    const startHour = start.getHours() + start.getMinutes() / 60
    const endHour = end.getHours() + end.getMinutes() / 60
    
    // Check if event overlaps with this hour
    if (endHour <= hour || startHour >= hour + 1) {
      return null
    }
    
    const hourStart = Math.max(startHour, hour)
    const hourEnd = Math.min(endHour, hour + 1)
    const top = ((hourStart - hour) / 1) * 100
    const height = ((hourEnd - hourStart) / 1) * 100
    
    return {
      top: `${top}%`,
      height: `${height}%`,
      isStart: startHour >= hour,
      isEnd: endHour <= hour + 1,
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Agenda</h2>
        <Button
          variant="primary"
          size="sm"
          onClick={onAddEvent}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Compromisso
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {/* Timeline grid */}
          <div className="space-y-0">
            {hours.map((hour) => (
              <div
                key={hour}
                className="flex border-b border-gray-100 min-h-[60px]"
              >
                <div className="w-16 flex-shrink-0 py-2 text-xs text-gray-500 text-right pr-3">
                  {String(hour).padStart(2, '0')}h
                </div>
                <div className="flex-1 relative py-1">
                  {/* Events positioned absolutely */}
                  {events
                    .map((event) => {
                      const position = getEventPosition(event, hour)
                      if (!position) return null
                      
                      return (
                        <div
                          key={`${event.id}-${hour}`}
                          className="absolute left-0 right-2 bg-primary/10 border-l-4 border-primary rounded p-2 text-sm"
                          style={{
                            top: position.top,
                            height: position.height,
                            minHeight: '20px',
                          }}
                        >
                          {position.isStart && (
                            <>
                              <div className="font-medium text-gray-900">
                                {event.title}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                {format(parseISO(event.start_time), 'HH:mm')} -{' '}
                                {format(parseISO(event.end_time), 'HH:mm')}
                              </div>
                              {event.description && (
                                <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                  {event.description}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })
                    .filter(Boolean)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

