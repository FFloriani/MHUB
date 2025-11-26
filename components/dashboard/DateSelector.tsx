'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from '@/components/ui/Button'

interface DateSelectorProps {
  date: Date
  onDateChange: (date: Date) => void
}

export default function DateSelector({ date, onDateChange }: DateSelectorProps) {
  const goToPreviousDay = () => {
    const newDate = new Date(date)
    newDate.setDate(newDate.getDate() - 1)
    onDateChange(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(date)
    newDate.setDate(newDate.getDate() + 1)
    onDateChange(newDate)
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={goToPreviousDay}
        aria-label="Dia anterior"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>
      
      <button
        onClick={goToToday}
        className="px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <div className="text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            {format(date, 'EEEE', { locale: ptBR })}
          </div>
          <div className="text-lg">
            {format(date, 'd')} de {format(date, 'MMMM', { locale: ptBR })}
          </div>
          {isToday && (
            <div className="text-xs text-primary mt-1">Hoje</div>
          )}
        </div>
      </button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={goToNextDay}
        aria-label="Próximo dia"
      >
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  )
}

