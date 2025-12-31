'use client'

import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import { Plus, Minus, Edit2, Trash2, Clock, Calendar as CalendarIcon, AlignLeft, Repeat, ZoomIn, ZoomOut, Navigation, Maximize2, Minimize2, ExternalLink, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { VirtualEvent } from '@/lib/data/events'

type Event = VirtualEvent

interface TimelineProps {
  events: Event[]
  onAddEvent: () => void
  onEditEvent: (event: Event) => void
  onDeleteEvent: (id: string) => void
  isFullscreen?: boolean
  onFullscreenChange?: (isFullscreen: boolean) => void
  onOpenPopup?: () => void
}

const HEADER_HEIGHT = 56
const BASE_EVENT_HEIGHT = 72
const BASE_EVENT_GAP = 8
const BASE_HOUR_WIDTH = 150

// Zoom settings
const MIN_ZOOM = 0.5
const MAX_ZOOM = 2.5
const ZOOM_STEP = 0.15

// Color palette for events (non-recurring)
const EVENT_COLORS = [
  { bg: 'from-indigo-500 to-purple-500', border: 'border-indigo-500', light: 'bg-indigo-50', text: 'text-indigo-600' },
  { bg: 'from-emerald-500 to-teal-500', border: 'border-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600' },
  { bg: 'from-amber-500 to-orange-500', border: 'border-amber-500', light: 'bg-amber-50', text: 'text-amber-600' },
  { bg: 'from-rose-500 to-pink-500', border: 'border-rose-500', light: 'bg-rose-50', text: 'text-rose-600' },
  { bg: 'from-cyan-500 to-blue-500', border: 'border-cyan-500', light: 'bg-cyan-50', text: 'text-cyan-600' },
]

export default function Timeline({ 
  events, 
  onAddEvent, 
  onEditEvent, 
  onDeleteEvent,
  isFullscreen = false,
  onFullscreenChange,
  onOpenPopup
}: TimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [baseWidth, setBaseWidth] = useState(BASE_HOUR_WIDTH)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null)

  // Calculated dimensions based on zoom
  const hourWidth = baseWidth * zoomLevel
  const EVENT_HEIGHT = BASE_EVENT_HEIGHT * zoomLevel
  const EVENT_GAP = BASE_EVENT_GAP * zoomLevel

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(MIN_ZOOM, prev - ZOOM_STEP))
  }, [])

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1)
  }, [])

  // Ctrl + Scroll zoom handler
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        if (e.deltaY < 0) {
          setZoomLevel(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP))
        } else {
          setZoomLevel(prev => Math.max(MIN_ZOOM, prev - ZOOM_STEP))
        }
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [])

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Responsive base width
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width < 640) setBaseWidth(100)
      else if (width < 1024) setBaseWidth(120)
      else setBaseWidth(150)
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
        endHour: Math.min(24, currentH + 8),
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

    const startHour = Math.max(0, minStart - 1)
    const endHour = Math.min(24, Math.max(maxEnd + 2, minStart + 8))

    const lanes: { event: Event; laneIndex: number; colorIndex: number }[] = []
    const laneEndTimes: number[] = []

    sortedEvents.forEach((event, index) => {
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

      lanes.push({ event, laneIndex, colorIndex: index % EVENT_COLORS.length })
    })

    return { startHour, endHour, lanes, maxLanes: laneEndTimes.length }
  }, [events])

  const scrollToNow = useCallback(() => {
    if (scrollContainerRef.current) {
      const now = new Date()
      const currentHour = now.getHours() + now.getMinutes() / 60
      const relativeHour = Math.max(0, currentHour - startHour - 1)

      scrollContainerRef.current.scrollTo({
        left: relativeHour * hourWidth,
        behavior: 'smooth'
      })
    }
  }, [startHour, hourWidth])

  // Initial scroll
  useEffect(() => {
    scrollToNow()
  }, [scrollToNow])

  const getEventStyle = (event: Event, laneIndex: number) => {
    const start = parseISO(event.start_time)
    const end = event.end_time ? parseISO(event.end_time) : start

    const startHourFloat = start.getHours() + start.getMinutes() / 60
    let durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

    if (durationHours < 0.25) durationHours = 0.25

    const left = (startHourFloat - startHour) * hourWidth

    return {
      left: `${left}px`,
      width: `${Math.max(durationHours * hourWidth, 60)}px`,
      top: `${laneIndex * (EVENT_HEIGHT + EVENT_GAP)}px`,
      height: `${EVENT_HEIGHT}px`
    }
  }

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-gray-200/60 shadow-xl overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-gradient-to-r from-primary via-primary-dark to-secondary">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
            <CalendarIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Agenda</h2>
            <p className="text-xs text-white/70 font-medium capitalize">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isFullscreen && onFullscreenChange && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onFullscreenChange(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-white text-xs font-medium transition-all"
              title="Expandir agenda"
            >
              <Maximize2 className="w-4 h-4" />
            </motion.button>
          )}
          {isFullscreen && onFullscreenChange && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onFullscreenChange(false)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-white text-xs font-medium transition-all"
              title="Minimizar agenda"
            >
              <Minimize2 className="w-4 h-4" />
            </motion.button>
          )}
          {onOpenPopup && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenPopup}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-white text-xs font-medium transition-all"
              title="Abrir em nova janela"
            >
              <ExternalLink className="w-4 h-4" />
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={scrollToNow}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-white text-xs font-medium transition-all"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Agora</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAddEvent}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-primary rounded-xl text-xs font-bold shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo</span>
          </motion.button>
        </div>
      </div>

      {/* Timeline Body */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto custom-scrollbar relative bg-gradient-to-b from-gray-50/50 to-white"
        style={{ cursor: 'grab' }}
        onMouseDown={(e) => {
          const ele = e.currentTarget
          ele.style.cursor = 'grabbing'
          ele.style.userSelect = 'none'

          const pos = { left: ele.scrollLeft, x: e.clientX }

          const onMouseMove = (e: MouseEvent) => {
            const dx = e.clientX - pos.x
            ele.scrollLeft = pos.left - dx
          }

          const onMouseUp = () => {
            ele.style.cursor = 'grab'
            ele.style.removeProperty('user-select')
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
          }

          document.addEventListener('mousemove', onMouseMove)
          document.addEventListener('mouseup', onMouseUp)
        }}
      >
        <div
          className="relative min-w-max"
          style={{
            width: `${(endHour - startHour) * hourWidth}px`,
            height: `${Math.max(250, maxLanes * (EVENT_HEIGHT + EVENT_GAP) + HEADER_HEIGHT + 60)}px`
          }}
        >
          {/* Time Strip */}
          <div className="flex sticky top-0 bg-white/95 backdrop-blur-md z-20 border-b border-gray-100">
            {hours.map((hour, i) => {
              const isNow = currentTime.getHours() === hour
              return (
                <div
                  key={hour}
                  className={`flex-shrink-0 h-14 flex flex-col justify-center pl-3 border-r border-gray-100 transition-colors ${isNow ? 'bg-primary/5' : ''}`}
                  style={{ width: `${hourWidth}px` }}
                >
                  <span className={`text-sm font-bold ${isNow ? 'text-primary' : 'text-gray-800'}`}>
                    {String(hour).padStart(2, '0')}:00
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {hour < 12 ? 'AM' : 'PM'}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Background Grid */}
          <div className="absolute top-14 bottom-0 left-0 right-0 flex pointer-events-none">
            {hours.map((hour, i) => (
              <div
                key={`grid-${hour}`}
                className={`flex-shrink-0 border-r border-gray-100/60 h-full ${i % 2 === 0 ? 'bg-gray-50/30' : 'bg-white'}`}
                style={{ width: `${hourWidth}px` }}
              >
                {/* Half hour indicator */}
                <div 
                  className="absolute top-0 bottom-0 border-r border-dashed border-gray-100/40"
                  style={{ left: `${hourWidth / 2}px` }}
                />
              </div>
            ))}
          </div>

          {/* Current Time Line */}
          {(() => {
            const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60
            if (currentHour >= startHour && currentHour <= endHour) {
              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute top-14 bottom-0 z-30 pointer-events-none"
                  style={{ left: `${(currentHour - startHour) * hourWidth}px` }}
                >
                  {/* Time indicator pill */}
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full shadow-lg whitespace-nowrap">
                    {format(currentTime, 'HH:mm')}
                  </div>
                  
                  {/* Vertical line */}
                  <div className="w-0.5 h-full bg-gradient-to-b from-red-500 via-red-500 to-red-500/20 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                </motion.div>
              )
            }
            return null
          })()}

          {/* Empty State */}
          {events.length === 0 && (
            <div className="absolute inset-0 top-14 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center px-6"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                  <CalendarIcon className="w-8 h-8 text-primary/60" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">
                  Nenhum compromisso
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Sua agenda está livre para hoje
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onAddEvent}
                  className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-xl text-sm font-medium shadow-lg"
                >
                  <Plus className="w-4 h-4 inline mr-1.5" />
                  Adicionar compromisso
                </motion.button>
              </motion.div>
            </div>
          )}

          {/* Events Layer */}
          <div className="relative mt-4 pb-32" style={{ minHeight: `${maxLanes * (EVENT_HEIGHT + EVENT_GAP) + 100}px` }}>
            <AnimatePresence>
              {lanes.map(({ event, laneIndex, colorIndex }) => {
                const style = getEventStyle(event, laneIndex)
                const isHovered = hoveredEventId === event.id
                const isRecurring = event.is_recurring || event.is_virtual
                const color = isRecurring 
                  ? { bg: 'from-pink-500 to-rose-500', border: 'border-pink-500', light: 'bg-pink-50', text: 'text-pink-600' }
                  : EVENT_COLORS[colorIndex]

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="absolute group"
                    style={{
                      ...style,
                      zIndex: isHovered ? 50 : 10,
                    }}
                    onMouseEnter={() => setHoveredEventId(event.id)}
                    onMouseLeave={() => setHoveredEventId(null)}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditEvent(event)
                    }}
                  >
                    {/* Event Card */}
                    <motion.div 
                      whileHover={{ scale: 1.02, y: -2 }}
                      className={`h-full rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border-l-4 ${color.border}`}
                    >
                      {/* Gradient background */}
                      <div className={`absolute inset-0 bg-gradient-to-r ${color.bg} opacity-10`} />
                      
                      <div className="relative h-full bg-white/95 backdrop-blur-sm p-3 flex flex-col justify-center">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="font-bold text-gray-900 text-sm truncate">
                                {event.title}
                              </span>
                              {isRecurring && (
                                <Repeat className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                              )}
                            </div>
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 ${color.light} rounded-md`}>
                              <Clock className={`w-3 h-3 ${color.text}`} />
                              <span className={`text-[11px] font-semibold ${color.text}`}>
                                {format(parseISO(event.start_time), 'HH:mm')}
                                {event.end_time && event.end_time !== event.start_time && (
                                  <> - {format(parseISO(event.end_time), 'HH:mm')}</>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Tooltip */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 bg-gray-900 text-white p-4 rounded-2xl shadow-2xl z-[100]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Arrow */}
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-gray-900" />
                          
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-bold text-base leading-tight mb-1">{event.title}</h4>
                              {isRecurring && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-pink-500/20 text-pink-300 rounded-full text-[10px] font-medium">
                                  <Repeat className="w-3 h-3" />
                                  Recorrente
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEditEvent(event)
                                }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDeleteEvent(event.id)
                                }}
                                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg">
                              <Clock className="w-4 h-4 text-primary-light" />
                              <span className="text-sm font-medium">
                                {format(parseISO(event.start_time), 'HH:mm')}
                                {event.end_time && event.end_time !== event.start_time && (
                                  <> - {format(parseISO(event.end_time), 'HH:mm')}</>
                                )}
                              </span>
                            </div>

                            {event.description && (
                              <div className="flex gap-2 px-3 py-2 bg-white/5 rounded-lg">
                                <AlignLeft className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-gray-300 line-clamp-3">{event.description}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 p-1.5 z-30">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleZoomOut}
          disabled={zoomLevel <= MIN_ZOOM}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-primary disabled:opacity-40 disabled:hover:bg-transparent transition-all"
          title="Diminuir zoom"
        >
          <ZoomOut className="w-4 h-4" />
        </motion.button>
        
        <button
          onClick={handleResetZoom}
          className="px-2 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-gray-600 hover:bg-gray-100 hover:text-primary transition-all min-w-[40px]"
          title="Resetar zoom"
        >
          {Math.round(zoomLevel * 100)}%
        </button>
        
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleZoomIn}
          disabled={zoomLevel >= MAX_ZOOM}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-primary disabled:opacity-40 disabled:hover:bg-transparent transition-all"
          title="Aumentar zoom"
        >
          <ZoomIn className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  )
}
