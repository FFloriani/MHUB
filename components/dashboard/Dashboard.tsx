'use client'

import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import type { User } from '@supabase/supabase-js'
import Header from './Header'
import Timeline from './Timeline'
import TaskList from './TaskList'
import AddEventModal from './AddEventModal'
import EditEventModal from './EditEventModal'
import AddTaskModal from './AddTaskModal'
import EditTaskModal from './EditTaskModal'
import DeleteEventConfirmModal from './DeleteEventConfirmModal'
import NotificationToast from './NotificationToast'
import { getEventsByDate, createEvent, updateEvent, deleteEvent, findRepeatedEvents, deleteMultipleEvents } from '@/lib/data/events'
import { getTasksByDate, createTask, updateTask, deleteTask } from '@/lib/data/tasks'
import { useEventNotifications, markEventAsConfirmed } from '@/hooks/useEventNotifications'
import type { Database } from '@/lib/supabase'

type Event = Database['public']['Tables']['events']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

interface DashboardProps {
  user: User
}

export default function Dashboard({ user }: DashboardProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null)
  const [repeatedEvents, setRepeatedEvents] = useState<Event[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeNotifications, setActiveNotifications] = useState<Event[]>([])
  const [editingEventRepeatDays, setEditingEventRepeatDays] = useState<number[]>([])

  // Handler para novas notificações
  const handleNewNotification = (event: Event) => {
    setActiveNotifications((prev) => {
      // Evita duplicatas
      if (prev.some((e) => e.id === event.id)) {
        return prev
      }
      return [...prev, event]
    })
  }

  // Configurar notificações de eventos
  useEventNotifications(user.id, handleNewNotification)

  // Confirmar visualização de notificação
  const handleConfirmNotification = (eventId: string) => {
    markEventAsConfirmed(eventId)
    setActiveNotifications((prev) => prev.filter((e) => e.id !== eventId))
  }

  // Fechar notificação sem confirmar
  const handleDismissNotification = (eventId: string) => {
    setActiveNotifications((prev) => prev.filter((e) => e.id !== eventId))
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
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
      setIsLoading(false)
    }
  }, [user.id, selectedDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAddEvent = async (data: {
    title: string
    startTime: string
    endTime: string
    description: string
    repeatDays: number[]
  }) => {
    try {
      const baseDate = new Date(data.startTime)
      const baseHour = baseDate.getHours()
      const baseMinute = baseDate.getMinutes()
      
      const baseEndDate = new Date(data.endTime)
      const baseEndHour = baseEndDate.getHours()
      const baseEndMinute = baseEndDate.getMinutes()
      
      // Se não há dias selecionados, cria apenas um evento
      if (data.repeatDays.length === 0) {
        const newEvent = await createEvent({
          user_id: user.id,
          title: data.title,
          start_time: data.startTime,
          end_time: data.endTime,
          description: data.description || null,
        })
        setEvents([...events, newEvent].sort((a, b) => 
          a.start_time.localeCompare(b.start_time)
        ))
        await loadData() // Recarrega para garantir que está atualizado
        return
      }

      // Cria eventos repetidos para os próximos 30 dias nos dias selecionados
      const newEvents: Event[] = []
      const today = new Date(selectedDate)
      today.setHours(0, 0, 0, 0)
      
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(today.getDate() + i)
        const dayOfWeek = checkDate.getDay()
        
        if (data.repeatDays.includes(dayOfWeek)) {
          const eventStartDate = new Date(checkDate)
          eventStartDate.setHours(baseHour, baseMinute, 0, 0)
          
          const eventEndDate = new Date(checkDate)
          eventEndDate.setHours(baseEndHour, baseEndMinute, 0, 0)
          
          const event = await createEvent({
            user_id: user.id,
            title: data.title,
            start_time: eventStartDate.toISOString(),
            end_time: eventEndDate.toISOString(),
            description: data.description || null,
          })
          newEvents.push(event)
        }
      }
      
      setEvents([...events, ...newEvents].sort((a, b) => 
        a.start_time.localeCompare(b.start_time)
      ))
      await loadData() // Recarrega para garantir que está atualizado
    } catch (error: any) {
      console.error('Error creating event:', error)
      alert(`Erro ao criar compromisso: ${error?.message || JSON.stringify(error)}`)
      throw error
    }
  }

  const handleEditEvent = async (id: string, data: {
    title: string
    startTime: string
    endTime: string
    description: string
    repeatDays: number[]
  }) => {
    try {
      const eventToEdit = events.find((e) => e.id === id)
      if (!eventToEdit) return

      // Se não há dias de repetição selecionados, atualiza apenas o evento atual
      if (data.repeatDays.length === 0) {
        const updatedEvent = await updateEvent(id, {
          title: data.title,
          start_time: data.startTime,
          end_time: data.endTime,
          description: data.description || null,
        })
        setEvents(events.map((e) => e.id === id ? updatedEvent : e).sort((a, b) => 
          a.start_time.localeCompare(b.start_time)
        ))
        await loadData()
        return
      }

      // Se há dias de repetição, precisa atualizar ou criar eventos repetidos
      // Primeiro, busca eventos repetidos existentes
      const repeatedEvents = await findRepeatedEvents(user.id, eventToEdit)
      
      // Deleta todos os eventos repetidos antigos
      if (repeatedEvents.length > 0) {
        const idsToDelete = repeatedEvents.map((e) => e.id)
        await deleteMultipleEvents(idsToDelete)
      }

      // Cria novos eventos com os dias de repetição atualizados
      const baseDate = new Date(data.startTime)
      const baseHour = baseDate.getHours()
      const baseMinute = baseDate.getMinutes()
      
      const baseEndDate = new Date(data.endTime)
      const baseEndHour = baseEndDate.getHours()
      const baseEndMinute = baseEndDate.getMinutes()

      const today = new Date(selectedDate)
      today.setHours(0, 0, 0, 0)
      
      const newEvents: Event[] = []
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(today.getDate() + i)
        const dayOfWeek = checkDate.getDay()
        
        if (data.repeatDays.includes(dayOfWeek)) {
          const eventStartDate = new Date(checkDate)
          eventStartDate.setHours(baseHour, baseMinute, 0, 0)
          
          const eventEndDate = new Date(checkDate)
          eventEndDate.setHours(baseEndHour, baseEndMinute, 0, 0)
          
          const event = await createEvent({
            user_id: user.id,
            title: data.title,
            start_time: eventStartDate.toISOString(),
            end_time: eventEndDate.toISOString(),
            description: data.description || null,
          })
          newEvents.push(event)
        }
      }
      
      setEvents([...events.filter((e) => !repeatedEvents.some((re) => re.id === e.id)), ...newEvents].sort((a, b) => 
        a.start_time.localeCompare(b.start_time)
      ))
      await loadData()
    } catch (error) {
      console.error('Error updating event:', error)
      throw error
    }
  }

  const handleDeleteEvent = async (id: string) => {
    const event = events.find((e) => e.id === id)
    if (!event) return

    try {
      // Busca eventos repetidos
      const repeated = await findRepeatedEvents(user.id, event)
      
      // Se há mais de um evento repetido, mostra o modal de confirmação
      if (repeated.length > 1) {
        setEventToDelete(event)
        setRepeatedEvents(repeated)
        setIsDeleteConfirmModalOpen(true)
        return
      }
      
      // Se é apenas um evento, deleta diretamente
      if (confirm('Tem certeza que deseja deletar este compromisso?')) {
        await deleteEvent(id)
        setEvents(events.filter((e) => e.id !== id))
        await loadData()
      }
    } catch (error) {
      console.error('Error checking repeated events:', error)
      // Em caso de erro, tenta deletar normalmente
      if (confirm('Tem certeza que deseja deletar este compromisso?')) {
        try {
          await deleteEvent(id)
          setEvents(events.filter((e) => e.id !== id))
          await loadData()
        } catch (deleteError) {
          console.error('Error deleting event:', deleteError)
          alert('Erro ao deletar compromisso')
        }
      }
    }
  }

  const handleDeleteOneEvent = async () => {
    if (!eventToDelete) return
    
    setIsDeleting(true)
    try {
      await deleteEvent(eventToDelete.id)
      setEvents(events.filter((e) => e.id !== eventToDelete.id))
      await loadData()
      setIsDeleteConfirmModalOpen(false)
      setEventToDelete(null)
      setRepeatedEvents([])
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Erro ao deletar compromisso')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteAllRepeatedEvents = async () => {
    if (!eventToDelete || repeatedEvents.length === 0) return
    
    setIsDeleting(true)
    try {
      const idsToDelete = repeatedEvents.map((e) => e.id)
      await deleteMultipleEvents(idsToDelete)
      setEvents(events.filter((e) => !idsToDelete.includes(e.id)))
      await loadData()
      setIsDeleteConfirmModalOpen(false)
      setEventToDelete(null)
      setRepeatedEvents([])
    } catch (error) {
      console.error('Error deleting multiple events:', error)
      alert('Erro ao deletar compromissos')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddTask = async (title: string) => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const newTask = await createTask({
        user_id: user.id,
        title,
        is_completed: false,
        target_date: dateStr,
      })
      setTasks([newTask, ...tasks])
    } catch (error) {
      console.error('Error creating task:', error)
      throw error
    }
  }

  const handleToggleTask = async (id: string, isCompleted: boolean) => {
    try {
      await updateTask(id, { is_completed: isCompleted })
      setTasks(tasks.map((task) => 
        task.id === id ? { ...task, is_completed: isCompleted } : task
      ))
    } catch (error) {
      console.error('Error updating task:', error)
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
    if (!confirm('Tem certeza que deseja deletar esta tarefa?')) {
      return
    }
    
    try {
      await deleteTask(id)
      setTasks(tasks.filter((t) => t.id !== id))
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header
        userEmail={user.email}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />
      
      {/* Notificações Toast */}
      {activeNotifications.length > 0 && (
        <div className="fixed top-20 right-6 z-50 space-y-3 max-w-md">
          {activeNotifications.map((event) => (
            <NotificationToast
              key={event.id}
              event={event}
              onConfirm={() => handleConfirmNotification(event.id)}
              onDismiss={() => handleDismissNotification(event.id)}
            />
          ))}
        </div>
      )}
      
      <main className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Coluna Esquerda - Agenda/Timeline */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6 shadow-sm overflow-hidden">
          <Timeline
            events={events}
            onAddEvent={() => setIsEventModalOpen(true)}
            onEditEvent={async (event) => {
              setEditingEvent(event)
              setIsEditEventModalOpen(true)
              // Busca dias de repetição do evento
              try {
                const repeated = await findRepeatedEvents(user.id, event)
                if (repeated.length > 1) {
                  // Extrai os dias da semana dos eventos repetidos
                  const days = new Set<number>()
                  repeated.forEach((e) => {
                    const date = new Date(e.start_time)
                    days.add(date.getDay())
                  })
                  setEditingEventRepeatDays(Array.from(days))
                } else {
                  setEditingEventRepeatDays([])
                }
              } catch {
                setEditingEventRepeatDays([])
              }
            }}
            onDeleteEvent={handleDeleteEvent}
          />
        </div>

        {/* Coluna Direita - Tasks/To-Do */}
        <div className="w-96 bg-white rounded-lg border border-gray-200 p-6 shadow-sm overflow-hidden">
          <TaskList
            tasks={tasks}
            onToggleTask={handleToggleTask}
            onAddTask={() => setIsTaskModalOpen(true)}
            onEditTask={(task) => {
              setEditingTask(task)
              setIsEditTaskModalOpen(true)
            }}
            onDeleteTask={handleDeleteTask}
          />
        </div>
      </main>

      {/* Modais */}
      <AddEventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={handleAddEvent}
        selectedDate={selectedDate}
      />

      <EditEventModal
        isOpen={isEditEventModalOpen}
        onClose={() => {
          setIsEditEventModalOpen(false)
          setEditingEvent(null)
          setEditingEventRepeatDays([])
        }}
        onSave={handleEditEvent}
        event={editingEvent}
        currentRepeatDays={editingEventRepeatDays}
      />

      <AddTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleAddTask}
      />

      <EditTaskModal
        isOpen={isEditTaskModalOpen}
        onClose={() => {
          setIsEditTaskModalOpen(false)
          setEditingTask(null)
        }}
        onSave={handleEditTask}
        task={editingTask}
      />

      <DeleteEventConfirmModal
        isOpen={isDeleteConfirmModalOpen}
        onClose={() => {
          setIsDeleteConfirmModalOpen(false)
          setEventToDelete(null)
          setRepeatedEvents([])
        }}
        onDeleteOne={handleDeleteOneEvent}
        onDeleteAll={handleDeleteAllRepeatedEvents}
        eventTitle={eventToDelete?.title || ''}
        repeatedCount={repeatedEvents.length}
        isDeleting={isDeleting}
      />
    </div>
  )
}

