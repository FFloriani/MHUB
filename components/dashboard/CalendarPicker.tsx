'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addYears, subYears, getYear, getMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface CalendarPickerProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  isOpen: boolean
  onClose: () => void
}

type ViewMode = 'calendar' | 'months' | 'years'

export default function CalendarPicker({
  selectedDate,
  onDateChange,
  isOpen,
  onClose,
}: CalendarPickerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate))
  const [currentYear, setCurrentYear] = useState(getYear(selectedDate))

  if (!isOpen) return null

  const handleDateSelect = (date: Date) => {
    onDateChange(date)
    onClose()
    setViewMode('calendar')
  }

  const handleMonthSelect = (month: number) => {
    const newDate = new Date(currentYear, month, 1)
    setCurrentMonth(newDate)
    setViewMode('calendar')
  }

  const handleYearSelect = (year: number) => {
    setCurrentYear(year)
    setViewMode('months')
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const goToPreviousYear = () => {
    setCurrentYear(currentYear - 1)
  }

  const goToNextYear = () => {
    setCurrentYear(currentYear + 1)
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(startOfMonth(today))
    setCurrentYear(getYear(today))
    handleDateSelect(today)
  }

  // Render Calendar View
  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
    
    // Primeiro dia do mês (0 = Domingo, 1 = Segunda, etc.)
    const firstDayOfWeek = monthStart.getDay()
    
    // Dias da semana
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    
    // Criar array completo com dias do mês anterior, atual e próximo
    const calendarDays: Date[] = []
    
    // Adicionar dias do mês anterior para completar a primeira semana
    const previousMonth = subMonths(currentMonth, 1)
    const previousMonthEnd = endOfMonth(previousMonth)
    const daysToShowFromPrevious = firstDayOfWeek
    
    for (let i = daysToShowFromPrevious - 1; i >= 0; i--) {
      const day = new Date(previousMonthEnd)
      day.setDate(previousMonthEnd.getDate() - i)
      calendarDays.push(day)
    }
    
    // Adicionar todos os dias do mês atual
    daysInMonth.forEach(day => calendarDays.push(day))
    
    // Adicionar dias do próximo mês para completar a última semana (total de 42 dias = 6 semanas)
    const totalDays = calendarDays.length
    const daysToAdd = 42 - totalDays // 6 semanas x 7 dias = 42
    
    if (daysToAdd > 0) {
      const nextMonth = addMonths(currentMonth, 1)
      const nextMonthStart = startOfMonth(nextMonth)
      
      for (let i = 0; i < daysToAdd; i++) {
        const day = new Date(nextMonthStart)
        day.setDate(nextMonthStart.getDate() + i)
        calendarDays.push(day)
      }
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousMonth}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <button
              onClick={() => setViewMode('months')}
              className="px-3 py-1 text-sm font-semibold text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextMonth}
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="text-xs"
          >
            Hoje
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-gray-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const isSelected = isSameDay(day, selectedDate)
            const isToday = isSameDay(day, new Date())
            const isCurrentMonth = isSameMonth(day, currentMonth)

            return (
              <button
                key={`${day.toISOString()}-${index}`}
                onClick={() => handleDateSelect(day)}
                className={`
                  aspect-square flex items-center justify-center text-sm rounded-lg transition-colors
                  ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                  ${isSelected 
                    ? 'bg-primary text-white font-semibold' 
                    : isToday && isCurrentMonth
                    ? 'bg-primary/10 text-primary font-semibold hover:bg-primary/20'
                    : isCurrentMonth
                    ? 'hover:bg-gray-100'
                    : 'hover:bg-gray-50'
                  }
                `}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Render Months View
  const renderMonths = () => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousYear}
              aria-label="Ano anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <button
              onClick={() => setViewMode('years')}
              className="px-3 py-1 text-sm font-semibold text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              {currentYear}
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextYear}
              aria-label="Próximo ano"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('calendar')}
            className="text-xs"
          >
            Voltar
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {months.map((month, index) => {
            const isSelected = getMonth(selectedDate) === index && getYear(selectedDate) === currentYear
            return (
              <button
                key={month}
                onClick={() => handleMonthSelect(index)}
                className={`
                  px-4 py-3 text-sm rounded-lg transition-colors text-center
                  ${isSelected
                    ? 'bg-primary text-white font-semibold'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                  }
                `}
              >
                {month}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Render Years View
  const renderYears = () => {
    const startYear = Math.floor(currentYear / 10) * 10
    const years = Array.from({ length: 12 }, (_, i) => startYear - 1 + i)

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentYear(currentYear - 10)}
              aria-label="Década anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-3 py-1 text-sm font-semibold text-gray-900">
              {startYear} - {startYear + 11}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentYear(currentYear + 10)}
              aria-label="Próxima década"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('months')}
            className="text-xs"
          >
            Voltar
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {years.map((year) => {
            const isSelected = getYear(selectedDate) === year
            return (
              <button
                key={year}
                onClick={() => handleYearSelect(year)}
                className={`
                  px-4 py-3 text-sm rounded-lg transition-colors text-center
                  ${isSelected
                    ? 'bg-primary text-white font-semibold'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                  }
                `}
              >
                {year}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <Card className="w-full max-w-sm p-6 m-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Selecionar Data</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {viewMode === 'calendar' && renderCalendar()}
        {viewMode === 'months' && renderMonths()}
        {viewMode === 'years' && renderYears()}
      </Card>
    </div>
  )
}

