'use client'

import { format, parseISO } from 'date-fns'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import type { Database } from '@/lib/supabase'

type Event = Database['public']['Tables']['events']['Row']

interface TimelineProps {
  events: Event[]
  onAddEvent: () => void
  onEditEvent: (event: Event) => void
  onDeleteEvent: (id: string) => void
}

export default function Timeline({ events, onAddEvent, onEditEvent, onDeleteEvent }: TimelineProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i)

  // Agrupa eventos que começam no mesmo horário para distribuir horizontalmente
  const groupEventsByTimeSlot = (eventsForHour: Array<{ event: Event; position: ReturnType<typeof getEventPosition> }>) => {
    const groups: Map<string, Array<{ event: Event; position: ReturnType<typeof getEventPosition> }>> = new Map()
    
    eventsForHour.forEach(({ event, position }) => {
      if (!position) return
      
      const start = parseISO(event.start_time)
      const timeKey = `${start.getHours()}:${String(start.getMinutes()).padStart(2, '0')}`
      
      if (!groups.has(timeKey)) {
        groups.set(timeKey, [])
      }
      groups.get(timeKey)!.push({ event, position })
    })
    
    return groups
  }

  const getEventPosition = (event: Event, hour: number): {
    top: string
    height: string
    isStart: boolean
    isEnd: boolean
  } | null => {
    const start = parseISO(event.start_time)
    const startHour = start.getHours() + start.getMinutes() / 60
    
    // Se não tem end_time ou end_time é igual a start_time, é apenas um ponto
    const isSingleTimeEvent = !event.end_time || event.end_time === event.start_time
    
    if (isSingleTimeEvent) {
      if (startHour >= hour && startHour < hour + 1) {
        return {
          top: `${((startHour - hour) / 1) * 100}%`,
          height: '4px',
          isStart: true,
          isEnd: true,
        }
      }
      return null
    }
    
    if (!event.end_time) {
      return null
    }
    
    const end = parseISO(event.end_time)
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
                  {(() => {
                    // Mapeia eventos com suas posições
                    const eventsWithPositions = events
                      .map((event) => {
                        const position = getEventPosition(event, hour)
                        return position ? { event, position } : null
                      })
                      .filter((item): item is { event: Event; position: NonNullable<ReturnType<typeof getEventPosition>> } => item !== null)

                    // Agrupa eventos por horário
                    const groupedEvents = groupEventsByTimeSlot(eventsWithPositions)
                    
                    return Array.from(groupedEvents.entries()).flatMap(([timeKey, eventGroup]) => {
                      const groupSize = eventGroup.length
                      const isMultiple = groupSize > 1
                      
                      return eventGroup.map(({ event, position }, index) => {
                        // position já está garantido como não-null pelo filter acima
                        if (!position) return null
                        
                        // Calcula largura e posição horizontal para eventos no mesmo horário
                        const widthPercent = isMultiple ? 100 / groupSize : 100
                        const leftPercent = isMultiple ? (index * widthPercent) : 0
                        const margin = isMultiple ? 1 : 0 // Pequena margem entre eventos lado a lado
                        
                        // Evento sem end_time ou com end_time igual a start_time - mostra como ponto/nó compacto
                        const isSingleTimeEvent = !event.end_time || event.end_time === event.start_time
                        
                        if (isSingleTimeEvent) {
                          return (
                            <div
                              key={`${event.id}-${hour}`}
                              className="absolute group cursor-pointer"
                              style={{
                                top: position.top,
                                left: `${leftPercent}%`,
                                width: `calc(${widthPercent}% - ${margin * 2}px)`,
                                marginLeft: index > 0 ? `${margin}px` : '0',
                                marginRight: index < groupSize - 1 ? `${margin}px` : '0',
                              }}
                              onClick={() => onEditEvent(event)}
                            >
                              {/* Nó compacto */}
                              <div className="bg-primary/10 border-l-4 border-primary rounded px-2 py-1.5 hover:bg-primary/20 transition-colors">
                                <div className="font-medium text-gray-900 text-xs truncate">
                                  {event.title}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {format(parseISO(event.start_time), 'HH:mm')}
                                </div>
                              </div>
                              
                              {/* Tooltip com detalhes completos */}
                              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-3 min-w-[280px] opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none group-hover:pointer-events-auto">
                                <div className="font-semibold text-gray-900 text-sm mb-1">
                                  {event.title}
                                </div>
                                <div className="text-xs text-gray-600 mb-2">
                                  {format(parseISO(event.start_time), 'HH:mm')}
                                  {event.end_time && event.end_time !== event.start_time && ` - ${format(parseISO(event.end_time), 'HH:mm')}`}
                                </div>
                                {event.description && (
                                  <div className="text-xs text-gray-500 mb-3 whitespace-pre-wrap">
                                    {event.description}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onEditEvent(event)
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-primary hover:bg-gray-100 rounded transition-all"
                                    aria-label="Editar evento"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Editar
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onDeleteEvent(event.id)
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-red-600 hover:bg-gray-100 rounded transition-all"
                                    aria-label="Deletar evento"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Deletar
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        
                        // Evento com end_time (durações) - também compacto quando múltiplos
                        return (
                          <div
                            key={`${event.id}-${hour}`}
                            className="absolute group cursor-pointer"
                            style={{
                              top: position.top,
                              height: position.height,
                              left: `${leftPercent}%`,
                              width: `calc(${widthPercent}% - ${margin * 2}px)`,
                              marginLeft: index > 0 ? `${margin}px` : '0',
                              marginRight: index < groupSize - 1 ? `${margin}px` : '0',
                              minHeight: '20px',
                            }}
                            onClick={() => onEditEvent(event)}
                          >
                            {position.isStart && (
                              <>
                                {/* Nó compacto quando múltiplos eventos */}
                                <div className={`bg-primary/10 border-l-4 border-primary rounded p-2 hover:bg-primary/15 transition-colors ${isMultiple ? 'h-full' : ''}`}>
                                  <div className="font-medium text-gray-900 text-xs truncate">
                                    {event.title}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-0.5">
                                    {format(parseISO(event.start_time), 'HH:mm')}
                                    {event.end_time && event.end_time !== event.start_time && ` - ${format(parseISO(event.end_time), 'HH:mm')}`}
                                  </div>
                                  {!isMultiple && event.description && (
                                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                      {event.description}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Tooltip com detalhes completos (sempre visível no hover) */}
                                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-3 min-w-[280px] opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none group-hover:pointer-events-auto">
                                  <div className="font-semibold text-gray-900 text-sm mb-1">
                                    {event.title}
                                  </div>
                                  <div className="text-xs text-gray-600 mb-2">
                                    {format(parseISO(event.start_time), 'HH:mm')}
                                    {event.end_time && event.end_time !== event.start_time && ` - ${format(parseISO(event.end_time), 'HH:mm')}`}
                                  </div>
                                  {event.description && (
                                    <div className="text-xs text-gray-500 mb-3 whitespace-pre-wrap">
                                      {event.description}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onEditEvent(event)
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-primary hover:bg-gray-100 rounded transition-all"
                                      aria-label="Editar evento"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                      Editar
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onDeleteEvent(event.id)
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-red-600 hover:bg-gray-100 rounded transition-all"
                                      aria-label="Deletar evento"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Deletar
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Botões de ação no canto superior direito (apenas quando não múltiplos) */}
                                {!isMultiple && (
                                  <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        e.preventDefault()
                                        onEditEvent(event)
                                      }}
                                      className="p-1.5 bg-white/90 hover:bg-white text-gray-600 hover:text-primary rounded shadow-sm transition-all"
                                      aria-label="Editar evento"
                                      title="Editar"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        e.preventDefault()
                                        onDeleteEvent(event.id)
                                      }}
                                      className="p-1.5 bg-white/90 hover:bg-white text-gray-600 hover:text-red-600 rounded shadow-sm transition-all"
                                      aria-label="Deletar evento"
                                      title="Deletar"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )
                      })
                    })
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

