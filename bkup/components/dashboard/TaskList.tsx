'use client'

import { Plus, Edit2, Trash2, CheckCircle2, Circle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/ui/Button'
import type { Database } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type Task = Database['public']['Tables']['tasks']['Row']

interface TaskListProps {
  tasks: Task[]
  onToggleTask: (id: string, isCompleted: boolean) => void
  onAddTask: () => void
  onEditTask: (task: Task) => void
  onDeleteTask: (id: string) => void
}

export default function TaskList({ tasks, onToggleTask, onAddTask, onEditTask, onDeleteTask }: TaskListProps) {
  const completedTasks = tasks.filter((t) => t.is_completed)
  const pendingTasks = tasks.filter((t) => !t.is_completed)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Tarefas</h2>
        <Button
          variant="primary"
          size="sm"
          onClick={onAddTask}
          className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
        {pendingTasks.length === 0 && completedTasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-gray-400 py-12 bg-white/50 rounded-2xl border border-dashed border-gray-200"
          >
            <p>Nenhuma tarefa para hoje</p>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {pendingTasks.length > 0 && (
            <motion.div layout>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">
                Pendentes ({pendingTasks.length})
              </h3>
              <div className="space-y-3">
                {pendingTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="group relative bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all duration-300"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => onToggleTask(task.id, true)}
                        className="mt-0.5 text-gray-400 hover:text-primary transition-colors"
                      >
                        <Circle size={20} />
                      </button>
                      <span className="flex-1 text-sm text-gray-700 font-medium leading-relaxed">
                        {task.title}
                      </span>
                    </div>

                    <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur rounded-lg p-1">
                      <button
                        onClick={() => onEditTask(task)}
                        className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Deletar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {completedTasks.length > 0 && (
            <motion.div layout className="mt-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">
                Concluídas ({completedTasks.length})
              </h3>
              <div className="space-y-3">
                {completedTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group relative bg-gray-50/50 rounded-xl p-4 border border-transparent hover:border-gray-200 transition-all duration-300"
                  >
                    <div className="flex items-start gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onToggleTask(task.id, false)}
                        className="mt-0.5 text-green-500 hover:text-green-600 transition-colors"
                      >
                        <CheckCircle2 size={20} />
                      </button>
                      <span className="flex-1 text-sm text-gray-500 line-through decoration-gray-400">
                        {task.title}
                      </span>
                    </div>

                    <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur rounded-lg p-1 shadow-sm">
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Deletar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
