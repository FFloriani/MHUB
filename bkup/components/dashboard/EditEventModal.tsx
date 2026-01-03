'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import type { VirtualEvent } from '@/lib/data/events'
import { format, parseISO } from 'date-fns'

type Event = VirtualEvent

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
]

interface EditEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (id: string, data: {
    title: string
    startTime: string
    endTime: string
    description: string
    repeatDays: number[]
  }) => Promise<void>
  event: Event | null
  currentRepeatDays?: number[] // Dias que o evento está repetindo atualmente
}

export default function EditEventModal({
  isOpen,
  onClose,
  onSave,
  event,
  currentRepeatDays = [],
}: EditEventModalProps) {
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [description, setDescription] = useState('')
  const [repeatDays, setRepeatDays] = useState<number[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      const start = parseISO(event.start_time)
      setStartTime(format(start, 'HH:mm'))
      if (event.end_time) {
        const end = parseISO(event.end_time)
        setEndTime(format(end, 'HH:mm'))
      } else {
        // Se não tiver end_time, usa o mesmo horário de início
        setEndTime(format(start, 'HH:mm'))
      }
      setDescription(event.description || '')
      // Use recurrence_days from the event if available, otherwise use currentRepeatDays
      if (event.recurrence_days && event.recurrence_days.length > 0) {
        setRepeatDays(event.recurrence_days)
      } else if (currentRepeatDays.length > 0) {
        setRepeatDays(currentRepeatDays)
      } else {
        setRepeatDays([])
      }
    }
  }, [event, currentRepeatDays])

  const toggleDay = (day: number) => {
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const selectAllDays = () => {
    setRepeatDays([0, 1, 2, 3, 4, 5, 6])
  }

  const clearDays = () => {
    setRepeatDays([])
  }

  if (!isOpen || !event) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const startDate = parseISO(event.start_time)
      const dateStr = format(startDate, 'yyyy-MM-dd')
      const startDateTime = new Date(`${dateStr}T${startTime}:00`)
      const endDateTime = new Date(`${dateStr}T${endTime}:00`)

      await onSave(event.id, {
        title,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        description,
        repeatDays,
      })

      onClose()
    } catch (error) {
      console.error('Error saving event:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6 m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Editar Compromisso</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reunião com equipe"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Início
              </label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fim
              </label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900 placeholder-gray-500 resize-none"
              rows={3}
              placeholder="Adicione detalhes sobre o compromisso..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Repetir em dias da semana
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllDays}
                  className="text-xs text-primary hover:underline"
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={clearDays}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Limpar
                </button>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    repeatDays.includes(day.value)
                      ? 'bg-secondary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
            {repeatDays.length === 0 ? (
              <p className="text-xs text-gray-500 mt-2">
                Se nenhum dia for selecionado, o evento aparecerá apenas na data original
              </p>
            ) : (
              <div className="mt-2 p-2 bg-secondary/10 rounded-lg">
                <p className="text-xs text-secondary font-medium">
                  ✨ Este evento repetirá para sempre nos dias selecionados até você deletá-lo
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

