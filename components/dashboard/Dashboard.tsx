'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import type { User } from '@supabase/supabase-js'
import Header from './Header'
import Timeline from './Timeline'
import TaskList from './TaskList'
import AddEventModal from './AddEventModal'
import AddTaskModal from './AddTaskModal'
import { getEventsByDate, createEvent } from '@/lib/data/events'
import { getTasksByDate, createTask, updateTask } from '@/lib/data/tasks'
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
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [selectedDate, user.id])

  const loadData = async () => {
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
  }

  const handleAddEvent = async (data: {
    title: string
    startTime: string
    endTime: string
    description: string
  }) => {
    try {
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
    } catch (error) {
      console.error('Error creating event:', error)
      throw error
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
      
      <main className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Coluna Esquerda - Agenda/Timeline */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6 shadow-sm overflow-hidden">
          <Timeline
            events={events}
            onAddEvent={() => setIsEventModalOpen(true)}
          />
        </div>

        {/* Coluna Direita - Tasks/To-Do */}
        <div className="w-96 bg-white rounded-lg border border-gray-200 p-6 shadow-sm overflow-hidden">
          <TaskList
            tasks={tasks}
            onToggleTask={handleToggleTask}
            onAddTask={() => setIsTaskModalOpen(true)}
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

      <AddTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleAddTask}
      />
    </div>
  )
}

