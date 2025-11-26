'use client'

import { Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Checkbox from '@/components/ui/Checkbox'
import type { Database } from '@/lib/supabase'

type Task = Database['public']['Tables']['tasks']['Row']

interface TaskListProps {
  tasks: Task[]
  onToggleTask: (id: string, isCompleted: boolean) => void
  onAddTask: () => void
}

export default function TaskList({ tasks, onToggleTask, onAddTask }: TaskListProps) {
  const completedTasks = tasks.filter((t) => t.is_completed)
  const pendingTasks = tasks.filter((t) => !t.is_completed)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Tarefas</h2>
        <Button
          variant="primary"
          size="sm"
          onClick={onAddTask}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3">
        {pendingTasks.length === 0 && completedTasks.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>Nenhuma tarefa para hoje</p>
          </div>
        )}
        
        {pendingTasks.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Pendentes ({pendingTasks.length})
            </h3>
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <Card key={task.id} className="p-3 flex items-center gap-3">
                  <Checkbox
                    checked={task.is_completed}
                    onChange={(e) => onToggleTask(task.id, e.target.checked)}
                  />
                  <span className="flex-1 text-sm text-gray-900">
                    {task.title}
                  </span>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        {completedTasks.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Concluídas ({completedTasks.length})
            </h3>
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <Card key={task.id} className="p-3 flex items-center gap-3 opacity-60">
                  <Checkbox
                    checked={task.is_completed}
                    onChange={(e) => onToggleTask(task.id, e.target.checked)}
                  />
                  <span className="flex-1 text-sm text-gray-500 line-through">
                    {task.title}
                  </span>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

