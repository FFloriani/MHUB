'use client'

import { useMemo, useRef, useEffect, useState } from 'react'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { Plus, Edit2, Trash2, Clock, Calendar as CalendarIcon, AlignLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/ui/Button'
import type { Database } from '@/lib/supabase'

type Event = Database['public']['Tables']['events']['Row']

interface TimelineProps {
  events: Event[]
  onAddEvent: () => void
  onEditEvent: (event: Event) => void
  onDeleteEvent: (id: string) => void
}

const HEADER_HEIGHT = 48
const EVENT_HEIGHT = 64
const EVENT_GAP = 12
const MIN_HOUR_WIDTH = 100

export default function Timeline({ events, onAddEvent, onEditEvent, onDeleteEvent }: TimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [hourWidth, setHourWidth] = useState(140)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Responsive hour width
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width < 640) setHourWidth(90)
      else if (width < 1024) setHourWidth(110)
      else setHourWidth(140)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Calculate dynamic range and lanes
  const { startHour, endHour, lanes, maxLanes } = useMemo(() => {
    if (events.length === 0) {
      const currentH = new Date().getHours()
      return {
        startHour: Math.max(0, currentH - 2),
        endHour: Math.min(24, currentH + 6),
        lanes: [],
        maxLanes: 0
      }
    }

    let minStart = 24
    let maxEnd = 0

    const sortedEvents = [...events].sort((a, b) => {
      const startA = parseISO(a.start_time).getTime()
      const startB = parseISO(b.start_time).getTime()
      if (startA !== startB) return startA - startB

      const endA = a.end_time ? parseISO(a.end_time).getTime() : startA
      const endB = b.end_time ? parseISO(b.end_time).getTime() : startB
      return (endB - startB) - (endA - startA)
    })

    sortedEvents.forEach(event => {
      const start = parseISO(event.start_time)
      const end = event.end_time ? parseISO(event.end_time) : start

      const s = start.getHours()
      const e = end.getHours() + (end.getMinutes() > 0 ? 1 : 0)

      if (s < minStart) minStart = s
      if (e > maxEnd) maxEnd = e
    })

    // Add padding (1 hour before, 2 hours after)
    const startHour = Math.max(0, minStart - 1)
    const endHour = Math.min(24, Math.max(maxEnd + 1, minStart + 6))

    const lanes: { event: Event; laneIndex: number }[] = []
    const laneEndTimes: number[] = []

    sortedEvents.forEach((event) => {
      const start = parseISO(event.start_time)
      const end = event.end_time ? parseISO(event.end_time) : start
      const duration = Math.max(differenceInMinutes(end, start), 15)
      const effectiveEnd = start.getTime() + duration * 60 * 1000

      let laneIndex = -1

      for (let i = 0; i < laneEndTimes.length; i++) {
        if (laneEndTimes[i] <= start.getTime()) {
          laneIndex = i
          laneEndTimes[i] = effectiveEnd
          break
        }
      }

      if (laneIndex === -1) {
        laneIndex = laneEndTimes.length
        laneEndTimes.push(effectiveEnd)
      }

      lanes.push({ event, laneIndex })
    })

    return { startHour, endHour, lanes, maxLanes: laneEndTimes.length }
  }, [events])

  const scrollToNow = () => {
    if (scrollContainerRef.current) {
      const now = new Date()
      const currentHour = now.getHours() + now.getMinutes() / 60
      const relativeHour = Math.max(0, currentHour - startHour - 0.5) // Center it a bit

      scrollContainerRef.current.scrollTo({
        left: relativeHour * hourWidth,
        behavior: 'smooth'
      })
    }
  }

  // Initial scroll
  useEffect(() => {
    scrollToNow()
  }, [startHour, hourWidth])

  const getEventStyle = (event: Event, laneIndex: number) => {
    const start = parseISO(event.start_time)
    const end = event.end_time ? parseISO(event.end_time) : start

    const startHourFloat = start.getHours() + start.getMinutes() / 60
    let durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

    if (durationHours < 0.25) durationHours = 0.25

    const left = (startHourFloat - startHour) * hourWidth

    return {
      left: `${left}px`,
      width: `${Math.max(durationHours * hourWidth, 40)}px`, // Minimum width 40px
      top: `${laneIndex * (EVENT_HEIGHT + EVENT_GAP)}px`,
      height: `${EVENT_HEIGHT}px`
    }
  }

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)

  return (
    <div className="flex flex-col h-full bg-white/40 backdrop-blur-md rounded-3xl border border-white/60 shadow-xl overflow-hidden ring-1 ring-white/50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100/50 bg-white/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Agenda</h2>
            <p className="text-xs text-gray-500 font-medium">
              {format(new Date(), "EEEE, d 'de' MMMM")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={scrollToNow}
            className="text-xs font-medium text-gray-600 hover:text-primary hover:bg-primary/5"
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Agora
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onAddEvent}
            className="shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all text-xs px-4 py-2 h-9 rounded-xl"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo
          </Button>
        </div>
      </div>

      {/* Timeline Body */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar relative bg-gradient-to-b from-gray-50/30 to-white/30"
        style={{ cursor: 'grab' }}
        onMouseDown={(e) => {
          const ele = e.currentTarget;
          ele.style.cursor = 'grabbing';
          ele.style.userSelect = 'none';

          let pos = {
            left: ele.scrollLeft,
            x: e.clientX,
          };

          const onMouseMove = (e: MouseEvent) => {
            const dx = e.clientX - pos.x;
            ele.scrollLeft = pos.left - dx;
          };

          const onMouseUp = () => {
            ele.style.cursor = 'grab';
            ele.style.removeProperty('user-select');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        }}
      >
        <div
          className="relative min-w-max"
          style={{
            width: `${(endHour - startHour) * hourWidth}px`,
            height: `${Math.max(200, maxLanes * (EVENT_HEIGHT + EVENT_GAP) + HEADER_HEIGHT + 40)}px`
          }}
        >
          {/* Time Strip */}
          <div className="flex border-b border-gray-100/50 sticky top-0 bg-white/80 backdrop-blur-md z-20 h-[48px] shadow-sm">
            {hours.map((hour) => (
              <div
                key={hour}
                className="flex-shrink-0 border-r border-gray-100/50 text-xs font-semibold text-gray-400 flex items-center pl-3 group hover:bg-gray-50/50 transition-colors"
                style={{ width: `${hourWidth}px` }}
              >
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Background Grid */}
          <div className="absolute top-[48px] bottom-0 left-0 right-0 flex pointer-events-none z-0">
            {hours.map((hour, i) => (
              <div
                key={`grid-${hour}`}
                className={`flex-shrink-0 border-r border-gray-100/30 h-full ${i % 2 === 0 ? 'bg-gray-50/20' : ''}`}
                style={{ width: `${hourWidth}px` }}
              />
            ))}
          </div>

          {/* Current Time Line */}
          {(() => {
            const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60
            if (currentHour >= startHour && currentHour <= endHour) {
              return (
                <div
                  className="absolute top-[48px] bottom-0 w-px bg-red-500 z-10 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                  style={{ left: `${(currentHour - startHour) * hourWidth}px` }}
                >
                  <div className="absolute -top-1.5 -left-2 w-4 h-4 rounded-full bg-red-500 shadow-md border-2 border-white flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  </div>
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    {format(currentTime, 'HH:mm')}
                  </div>
                </div>
              )
            }
            return null
          })()}

          {/* Events Layer */}
          <div className="relative mt-4" style={{ height: `${maxLanes * (EVENT_HEIGHT + EVENT_GAP)}px` }}>
            <AnimatePresence>
              {lanes.map(({ event, laneIndex }) => {
                const style = getEventStyle(event, laneIndex)

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute group z-10 px-1"
                    style={style}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditEvent(event)
                    }}
                  >
                    <div className="h-full bg-white/90 backdrop-blur-sm border-l-4 border-primary rounded-xl shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 p-3 overflow-hidden relative ring-1 ring-gray-100 group-hover:ring-primary/30">
                      <div className="flex flex-col h-full justify-center">
                        <div className="font-bold text-gray-900 text-xs truncate pr-2 mb-0.5">
                          {event.title}
                        </div>
                        <div className="text-[10px] text-primary font-semibold flex items-center gap-1.5 bg-primary/5 w-fit px-1.5 py-0.5 rounded-md">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(event.start_time), 'HH:mm')}
                          {event.end_time && event.end_time !== event.start_time && ` - ${format(parseISO(event.end_time), 'HH:mm')}`}
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-slate-900/95 backdrop-blur-xl text-white p-4 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto z-50 scale-95 group-hover:scale-100 origin-bottom border border-white/10">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-sm leading-tight">{event.title}</h4>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditEvent(event)
                            }}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-300 hover:text-white"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteEvent(event.id)
                            }}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors text-gray-300 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-primary-light font-medium bg-primary/10 px-2 py-1 rounded-lg w-fit">
                          <Clock className="w-3.5 h-3.5" />
                          {format(parseISO(event.start_time), 'HH:mm')}
                          {event.end_time && event.end_time !== event.start_time && ` - ${format(parseISO(event.end_time), 'HH:mm')}`}
                        </div>

                        {event.description && (
                          <div className="flex gap-2 text-xs text-gray-300 leading-relaxed bg-white/5 p-2 rounded-lg">
                            <AlignLeft className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <p className="line-clamp-3">{event.description}</p>
                          </div>
                        )}
                      </div>

                      {/* Arrow */}
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900/95"></div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
