'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import DateSelector from './DateSelector'
import PageTransition from '@/components/layout/PageTransition'
import Timeline from './Timeline'
import TaskList from './TaskList'
import AddEventModal from './AddEventModal'
import EditEventModal from './EditEventModal'
import AddTaskModal from './AddTaskModal'
import EditTaskModal from './EditTaskModal'
import DeleteEventConfirmModal from './DeleteEventConfirmModal'
import NotificationToast from './NotificationToast'
import { getEventsByDate, createEvent, createRecurringEvent, updateEvent, deleteEvent, findRepeatedEvents, deleteMultipleEvents, isEventRecurring, getParentEvent, type VirtualEvent } from '@/lib/data/events'
import { getTasksByDate, createTask, updateTask, deleteTask } from '@/lib/data/tasks'
import { useEventNotifications, markEventAsConfirmed } from '@/hooks/useEventNotifications'
import type { Database } from '@/lib/supabase'

type Event = Database['public']['Tables']['events']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

type DisplayEvent = VirtualEvent

interface DashboardProps {
  user: User
}

export default function Dashboard({ user }: DashboardProps) {
  const searchParams = useSearchParams()
  const isPopupMode = searchParams.get('mode') === 'popup'

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<DisplayEvent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<DisplayEvent | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<DisplayEvent | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeNotifications, setActiveNotifications] = useState<DisplayEvent[]>([])
  const [editingEventRepeatDays, setEditingEventRepeatDays] = useState<number[]>([])
  const [isTimelineFullscreen, setIsTimelineFullscreen] = useState(isPopupMode)

  useEffect(() => {
    if (isPopupMode) {
      const savedDate = localStorage.getItem('mhub_selected_date')
      if (savedDate) {
        setSelectedDate(new Date(savedDate))
      }
    }
  }, [isPopupMode])

  const handleOpenTimelinePopup = useCallback(() => {
    const width = 1400
    const height = 900
    const left = (window.screen.width - width) / 2
    const top = (window.screen.height - height) / 2
    localStorage.setItem('mhub_selected_date', format(selectedDate, 'yyyy-MM-dd'))
    const popupUrl = `${window.location.pathname}?mode=popup`
    window.open(popupUrl, 'timeline-popup', `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`)
  }, [selectedDate])

  const handleNewNotification = (event: Event) => {
    setActiveNotifications((prev) => {
      if (prev.some((e) => e.id === event.id)) return prev
      return [...prev, event]
    })
  }

  useEventNotifications(user.id, handleNewNotification)

  const handleConfirmNotification = (eventId: string) => {
    markEventAsConfirmed(eventId)
    setActiveNotifications((prev) => prev.filter((e) => e.id !== eventId))
  }

  const handleDismissNotification = (eventId: string) => {
    setActiveNotifications((prev) => prev.filter((e) => e.id !== eventId))
  }

  const loadData = useCallback(async () => {
    try {
      const [eventsData, tasksData] = await Promise.all([
        getEventsByDate(user.id, selectedDate),
        getTasksByDate(user.id, selectedDate),
      ])
      setEvents(eventsData)
      setTasks(tasksData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsInitialLoading(false)
    }
  }, [user.id, selectedDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAddEvent = async (data: { title: string, startTime: string, endTime: string, description: string, repeatDays: number[] }) => {
    try {
      if (data.repeatDays.length === 0) {
        await createEvent({ user_id: user.id, title: data.title, start_time: data.startTime, end_time: data.endTime, description: data.description || null, is_recurring: false })
      } else {
        await createRecurringEvent({ user_id: user.id, title: data.title, start_time: data.startTime, end_time: data.endTime, description: data.description || null, recurrence_days: data.repeatDays, recurrence_end_date: null })
      }
      await loadData()
    } catch (error: any) {
      console.error('Error creating event:', error)
      alert(`Erro ao criar compromisso: ${error?.message || JSON.stringify(error)}`)
      throw error
    }
  }

  const handleEditEvent = async (id: string, data: { title: string, startTime: string, endTime: string, description: string, repeatDays: number[] }) => {
    try {
      const realId = id.includes('_') ? id.split('_')[0] : id
      await updateEvent(realId, { title: data.title, start_time: data.startTime, end_time: data.endTime, description: data.description || null, is_recurring: data.repeatDays.length > 0, recurrence_days: data.repeatDays.length > 0 ? data.repeatDays : null })
      await loadData()
    } catch (error) {
      console.error('Error updating event:', error)
      throw error
    }
  }

  const handleUpdateEvent = async (id: string, updates: { start_time?: string; end_time?: string }) => {
    // 1. Optimistic Update (Visual instantâneo)
    const oldEvents = [...events]
    setEvents(prev => prev.map(evt => {
      // Verifica ID exato ou ID virtual (para recorrências na visualização)
      if (evt.id === id) {
        return { ...evt, ...updates }
      }
      return evt
    }))

    try {
      // 2. Persistência em background
      await updateEvent(id, updates)

      // 3. Sync final silencioso (opcional, para garantir consistência de recorrências complexas)
      const freshEvents = await getEventsByDate(user.id, selectedDate)
      setEvents(freshEvents)
    } catch (error) {
      console.error('Error updating event via drag:', error)
      // Rollback em caso de erro
      setEvents(oldEvents)
      alert('Erro ao mover evento. Tente novamente.')
    }
  }

  const handleDeleteEvent = async (id: string) => {
    const event = events.find((e) => e.id === id)
    if (!event) return
    try {
      if (event.is_recurring || event.is_virtual) {
        setEventToDelete(event)
        setIsDeleteConfirmModalOpen(true)
        return
      }
      if (confirm('Tem certeza que deseja deletar este compromisso?')) {
        setEvents(prev => prev.filter(e => e.id !== id))
        await deleteEvent(id)
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Erro ao deletar compromisso')
      loadData()
    }
  }

  const handleDeleteOneEvent = async () => {
    if (!eventToDelete) return
    setIsDeleting(true)
    try {
      await deleteEvent(eventToDelete.id)
      setEvents(prev => prev.filter(e => e.id !== eventToDelete.id))
      setIsDeleteConfirmModalOpen(false)
      setEventToDelete(null)
      await loadData()
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Erro ao deletar compromisso')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteAllRepeatedEvents = async () => {
    if (!eventToDelete) return
    setIsDeleting(true)
    try {
      await deleteEvent(eventToDelete.id)
      await loadData()
      setIsDeleteConfirmModalOpen(false)
      setEventToDelete(null)
    } catch (error) {
      console.error('Error deleting recurring event:', error)
      alert('Erro ao deletar compromissos')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddTask = async (title: string) => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const newTask = await createTask({ user_id: user.id, title, is_completed: false, target_date: dateStr })
      setTasks([newTask, ...tasks])
    } catch (error) {
      console.error('Error creating task:', error)
      throw error
    }
  }

  const handleToggleTask = async (id: string, isCompleted: boolean) => {
    try {
      setTasks(tasks.map((task) => task.id === id ? { ...task, is_completed: isCompleted } : task))
      await updateTask(id, { is_completed: isCompleted })
    } catch (error) {
      console.error('Error updating task:', error)
      loadData()
    }
  }

  const handleEditTask = async (id: string, title: string) => {
    try {
      const updatedTask = await updateTask(id, { title })
      setTasks(tasks.map((t) => t.id === id ? updatedTask : t))
    } catch (error) {
      console.error('Error updating task:', error)
      throw error
    }
  }

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta tarefa?')) return
    try {
      setTasks(tasks.filter((t) => t.id !== id))
      await deleteTask(id)
    } catch (error) {
      console.error('Error deleting task:', error)
      loadData()
    }
  }

  if (isInitialLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-500">Carregando...</div></div>
  }

  return (
    <div className="min-h-screen flex flex-col">
      {!isPopupMode && (
        <div className="flex flex-col items-center md:flex-row md:items-end md:justify-between gap-4 p-4 sm:p-8 pb-0">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary animate-gradient-x">
                Bom dia, {user.email?.split('@')[0]}!
              </span>
            </h1>
            <p className="text-gray-500 font-medium text-sm sm:text-base">Vamos fazer hoje um dia produtivo.</p>
          </div>
          <div className="bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-white/20 shadow-sm">
            <DateSelector date={selectedDate} onDateChange={setSelectedDate} />
          </div>
        </div>
      )}

      {activeNotifications.length > 0 && (
        <div className="fixed top-20 right-6 z-50 space-y-3 max-w-md">
          {activeNotifications.map((event) => (
            <NotificationToast key={event.id} event={event} onConfirm={() => handleConfirmNotification(event.id)} onDismiss={() => handleDismissNotification(event.id)} />
          ))}
        </div>
      )}

      {isPopupMode ? (
        <div className="h-screen w-screen p-4 sm:p-6">
          <Timeline
            events={events}
            onAddEvent={() => setIsEventModalOpen(true)}
            onEditEvent={async (event) => {
              setEditingEvent(event)
              setIsEditEventModalOpen(true)
              try {
                const repeated = await findRepeatedEvents(user.id, event)
                setEditingEventRepeatDays(repeated.length > 1 ? Array.from(new Set(repeated.map(e => new Date(e.start_time).getDay()))) : [])
              } catch { setEditingEventRepeatDays([]) }
            }}
            onDeleteEvent={handleDeleteEvent}
            onUpdateEvent={handleUpdateEvent}
            isFullscreen={true}
            onFullscreenChange={(value) => !value && window.close()}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </div>
      ) : (
        <PageTransition className="flex-1 flex flex-col lg:flex-row gap-8 p-4 sm:p-8 w-full">
          {/* Coluna Esquerda - Agenda/Timeline */}
          <div className="w-full max-w-full min-w-0 lg:flex-1 lg:w-0 overflow-hidden">
            <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 p-2 sm:p-8 shadow-glass h-full">
              <Timeline
                events={events}
                onAddEvent={() => setIsEventModalOpen(true)}
                onEditEvent={async (event) => {
                  setEditingEvent(event)
                  setIsEditEventModalOpen(true)
                  try {
                    const repeated = await findRepeatedEvents(user.id, event)
                    setEditingEventRepeatDays(repeated.length > 1 ? Array.from(new Set(repeated.map(e => new Date(e.start_time).getDay()))) : [])
                  } catch { setEditingEventRepeatDays([]) }
                }}
                onDeleteEvent={handleDeleteEvent}
                onUpdateEvent={handleUpdateEvent}
                isFullscreen={isTimelineFullscreen}
                onFullscreenChange={setIsTimelineFullscreen}
                onOpenPopup={handleOpenTimelinePopup}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            </div>
          </div>

          {/* Coluna Direita - Tasks/To-Do */}
          <div className="w-full lg:w-[400px] flex-shrink-0">
            <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-white/40 p-8 shadow-glass h-full sticky top-8">
              <TaskList
                tasks={tasks}
                onToggleTask={handleToggleTask}
                onAddTask={() => setIsTaskModalOpen(true)}
                onEditTask={(task) => { setEditingTask(task); setIsEditTaskModalOpen(true) }}
                onDeleteTask={handleDeleteTask}
              />
            </div>
          </div>
        </PageTransition>
      )}

      {/* Modais */}
      <AddEventModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} onSave={handleAddEvent} selectedDate={selectedDate} />
      <EditEventModal isOpen={isEditEventModalOpen} onClose={() => { setIsEditEventModalOpen(false); setEditingEvent(null); setEditingEventRepeatDays([]) }} onSave={handleEditEvent} event={editingEvent} currentRepeatDays={editingEventRepeatDays} />
      <AddTaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} onSave={handleAddTask} />
      <EditTaskModal isOpen={isEditTaskModalOpen} onClose={() => { setIsEditTaskModalOpen(false); setEditingTask(null) }} onSave={handleEditTask} task={editingTask} />
      <DeleteEventConfirmModal isOpen={isDeleteConfirmModalOpen} onClose={() => { setIsDeleteConfirmModalOpen(false); setEventToDelete(null) }} onDeleteOne={handleDeleteOneEvent} onDeleteAll={handleDeleteAllRepeatedEvents} eventTitle={eventToDelete?.title || ''} repeatedCount={0} isDeleting={isDeleting} isRecurring={eventToDelete?.is_recurring || eventToDelete?.is_virtual || false} />

      {isTimelineFullscreen && !isPopupMode && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-gray-900/95 backdrop-blur-md">
          <div className="h-full w-full p-4 sm:p-6">
            <Timeline events={events} onAddEvent={() => setIsEventModalOpen(true)} onEditEvent={async (event) => { setEditingEvent(event); setIsEditEventModalOpen(true); try { const repeated = await findRepeatedEvents(user.id, event); setEditingEventRepeatDays(repeated.length > 1 ? Array.from(new Set(repeated.map(e => new Date(e.start_time).getDay()))) : []) } catch { setEditingEventRepeatDays([]) } }} onDeleteEvent={handleDeleteEvent} isFullscreen={true} onFullscreenChange={setIsTimelineFullscreen} onOpenPopup={handleOpenTimelinePopup} selectedDate={selectedDate} onDateChange={setSelectedDate} />
          </div>
        </motion.div>
      )}
    </div>
  )
}
