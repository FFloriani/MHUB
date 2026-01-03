'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, ChevronUp, ChevronDown, MoreHorizontal, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getEventsByDate, type VirtualEvent } from '@/lib/data/events'

export default function CompactAgenda() {
    const [currentTime, setCurrentTime] = useState(new Date())
    const [events, setEvents] = useState<VirtualEvent[]>([])
    const [isExpanded, setIsExpanded] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const interval = setInterval(() => setCurrentTime(new Date()), 60000)

        fetchEvents()

        return () => clearInterval(interval)
    }, [])

    const fetchEvents = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        try {
            // Usa a função centralizada que busca na tabela 'events' e trata recorrência
            const todayEvents = await getEventsByDate(user.id, new Date())

            // Filtra apenas eventos que ainda não acabaram
            const now = new Date()
            const validEvents = todayEvents
                .filter(e => {
                    const end = e.end_time ? new Date(e.end_time) : new Date(e.start_time)
                    return end > now
                })

            setEvents(validEvents)

        } catch (err) {
            console.error("Erro ao buscar agenda:", err)
        }
    }

    const formatTime = (dateArg: Date | string) => {
        const date = typeof dateArg === 'string' ? new Date(dateArg) : dateArg
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }

    const currentEvent = events.find(e => {
        const start = new Date(e.start_time)
        const end = e.end_time ? new Date(e.end_time) : start
        return currentTime >= start && currentTime <= end
    })

    const nextEvents = events.filter(e => new Date(e.start_time) > currentTime).slice(0, 2)

    if (!mounted) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`fixed bottom-8 left-8 z-40 bg-gray-900 border border-gray-800 shadow-2xl transition-all duration-300 overflow-hidden ${isExpanded ? 'rounded-2xl w-64' : 'rounded-full w-auto'}`}
        >
            {/* Header (Sempre Visível) */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-800 transition-colors"
                title={isExpanded ? "Minimizar Agenda" : "Ver Agenda"}
            >
                <div className="flex items-center gap-2 text-indigo-400">
                    <Clock size={16} />
                    <span className="font-mono font-bold text-sm tracking-widest">{formatTime(currentTime)}</span>
                </div>

                {!isExpanded && (
                    <div className="flex items-center gap-2 border-l border-gray-700 pl-3">
                        {currentEvent ? (
                            <span className="text-xs text-white font-medium truncate max-w-[120px]">
                                Agora: {currentEvent.title}
                            </span>
                        ) : nextEvents.length > 0 ? (
                            <span className="text-xs text-gray-400 truncate max-w-[120px]">
                                Próx: {nextEvents[0].title}
                            </span>
                        ) : (
                            <span className="text-xs text-gray-500">Livre</span>
                        )}
                    </div>
                )}

                {isExpanded && <ChevronDown size={14} className="ml-auto text-gray-500" />}
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-800"
                    >
                        <div className="p-4 space-y-4">
                            {/* Current Status */}
                            <div className="text-center">
                                {currentEvent ? (
                                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                                        <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Acontecendo Agora</span>
                                        <p className="font-bold text-white mt-1">{currentEvent.title}</p>
                                        <p className="text-xs text-indigo-300 mt-1">
                                            {formatTime(new Date(currentEvent.start_time))} - {currentEvent.end_time ? formatTime(new Date(currentEvent.end_time)) : ''}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-2 text-gray-500">
                                        <span className="text-sm font-medium text-gray-300">Você está livre</span>
                                    </div>
                                )}
                            </div>

                            {/* Timeline */}
                            {nextEvents.length > 0 && (
                                <div className="space-y-3 relative">
                                    <div className="absolute left-[5px] top-2 bottom-2 w-[1px] bg-gray-800" />

                                    {nextEvents.map((event) => (
                                        <div key={event.id} className="relative pl-4 flex gap-3 items-start group">
                                            <div className="absolute left-[2px] top-1.5 w-1.5 h-1.5 rounded-full bg-gray-600 group-hover:bg-indigo-400 transition-colors ring-2 ring-gray-900" />

                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-mono text-gray-500 mb-0.5">
                                                    {formatTime(new Date(event.start_time))}
                                                </p>
                                                <p className="text-xs font-medium text-gray-300 truncate mb-0.5 group-hover:text-white transition-colors">
                                                    {event.title}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {nextEvents.length === 0 && !currentEvent && (
                                <div className="text-center py-2 opacity-50">
                                    <Calendar size={24} className="mx-auto text-gray-600 mb-2" />
                                    <p className="text-xs text-gray-500">Dia tranquilo!</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
