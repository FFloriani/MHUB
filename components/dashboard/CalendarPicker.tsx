'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getYear, getMonth, isWeekend } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface CalendarPickerProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  isOpen: boolean
  onClose: () => void
  triggerRef?: React.RefObject<HTMLElement>
}

type ViewMode = 'calendar' | 'months' | 'years'

export default function CalendarPicker({
  selectedDate,
  onDateChange,
  isOpen,
  onClose,
  triggerRef,
}: CalendarPickerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate))
  const [currentYear, setCurrentYear] = useState(getYear(selectedDate))
  const calendarRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<'bottom' | 'top' | 'center'>('center')
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})

  // Update current month when selected date changes
  useEffect(() => {
    if (isOpen) {
      setCurrentMonth(startOfMonth(selectedDate))
      setCurrentYear(getYear(selectedDate))
    }
  }, [selectedDate, isOpen])

  // Calculate position based on available space
  useEffect(() => {
    if (!isOpen) {
      setPosition('center')
      return
    }

    const timer = setTimeout(() => {
      if (!triggerRef?.current) {
        setPosition('center')
        return
      }

      const triggerRect = triggerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const estimatedCalendarHeight = 480
      const padding = 20

      const spaceBelow = viewportHeight - triggerRect.bottom
      const spaceAbove = triggerRect.top

      if (spaceBelow >= estimatedCalendarHeight + padding) {
        setPosition('bottom')
      } else if (spaceAbove >= estimatedCalendarHeight + padding) {
        setPosition('top')
      } else {
        setPosition('center')
      }
    }, 10)

    return () => clearTimeout(timer)
  }, [isOpen, triggerRef])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const isCentered = position === 'center'

  // Calculate position for popover
  useEffect(() => {
    if (!isOpen || isCentered || !triggerRef?.current) {
      setPopoverStyle({})
      return
    }

    const updatePosition = () => {
      const triggerRect = triggerRef.current!.getBoundingClientRect()
      const padding = 12

      setPopoverStyle({
        left: `${triggerRect.left + triggerRect.width / 2}px`,
        top: position === 'bottom' ? `${triggerRect.bottom + padding}px` : 'auto',
        bottom: position === 'top' ? `${window.innerHeight - triggerRect.top + padding}px` : 'auto',
        transform: 'translateX(-50%)',
      })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen, isCentered, position, triggerRef])

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

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToPreviousYear = () => setCurrentYear(currentYear - 1)
  const goToNextYear = () => setCurrentYear(currentYear + 1)

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
    const firstDayOfWeek = monthStart.getDay()
    
    const weekDays = [
      { short: 'D', full: 'Dom' },
      { short: 'S', full: 'Seg' },
      { short: 'T', full: 'Ter' },
      { short: 'Q', full: 'Qua' },
      { short: 'Q', full: 'Qui' },
      { short: 'S', full: 'Sex' },
      { short: 'S', full: 'Sáb' },
    ]
    
    const calendarDays: Date[] = []
    const previousMonth = subMonths(currentMonth, 1)
    const previousMonthEnd = endOfMonth(previousMonth)
    
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = new Date(previousMonthEnd)
      day.setDate(previousMonthEnd.getDate() - i)
      calendarDays.push(day)
    }
    
    daysInMonth.forEach(day => calendarDays.push(day))
    
    const totalDays = calendarDays.length
    const daysToAdd = 42 - totalDays
    
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
      <div className="space-y-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all active:scale-95"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setViewMode('months')}
            className="px-4 py-2 text-base font-bold text-gray-900 hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/10 rounded-xl transition-all capitalize"
          >
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </button>
          
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all active:scale-95"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Week Days Header */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, i) => (
            <div
              key={day.full}
              className={`
                text-center text-xs font-semibold py-2 rounded-lg
                ${i === 0 || i === 6 ? 'text-secondary/70' : 'text-gray-400'}
              `}
            >
              <span className="hidden sm:inline">{day.full}</span>
              <span className="sm:hidden">{day.short}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const isSelected = isSameDay(day, selectedDate)
            const isToday = isSameDay(day, new Date())
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isWeekendDay = isWeekend(day)

            return (
              <motion.button
                key={`${day.toISOString()}-${index}`}
                onClick={() => handleDateSelect(day)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  relative aspect-square flex items-center justify-center text-sm font-medium rounded-xl transition-all duration-200
                  ${!isCurrentMonth && 'opacity-30'}
                  ${isWeekendDay && isCurrentMonth && !isSelected ? 'text-secondary' : ''}
                  ${isSelected 
                    ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/30' 
                    : isToday && isCurrentMonth
                    ? 'bg-primary/10 text-primary ring-2 ring-primary/30'
                    : isCurrentMonth
                    ? 'text-gray-700 hover:bg-gray-100'
                    : 'text-gray-400 hover:bg-gray-50'
                  }
                `}
              >
                {format(day, 'd')}
                {isToday && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </motion.button>
            )
          })}
        </div>
      </div>
    )
  }

  // Render Months View
  const renderMonths = () => {
    const months = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ]
    const currentMonthIndex = getMonth(new Date())

    return (
      <div className="space-y-4">
        {/* Year Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousYear}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all active:scale-95"
            aria-label="Ano anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setViewMode('years')}
            className="px-4 py-2 text-base font-bold text-gray-900 hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/10 rounded-xl transition-all"
          >
            {currentYear}
          </button>
          
          <button
            onClick={goToNextYear}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all active:scale-95"
            aria-label="Próximo ano"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Months Grid */}
        <div className="grid grid-cols-3 gap-2">
          {months.map((month, index) => {
            const isSelected = getMonth(selectedDate) === index && getYear(selectedDate) === currentYear
            const isCurrentMonthOfYear = index === currentMonthIndex && currentYear === getYear(new Date())
            
            return (
              <motion.button
                key={month}
                onClick={() => handleMonthSelect(index)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  relative px-4 py-4 text-sm font-medium rounded-xl transition-all duration-200
                  ${isSelected
                    ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/30'
                    : isCurrentMonthOfYear
                    ? 'bg-primary/10 text-primary ring-2 ring-primary/30'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }
                `}
              >
                {month}
              </motion.button>
            )
          })}
        </div>

        {/* Back Button */}
        <button
          onClick={() => setViewMode('calendar')}
          className="w-full py-2 text-sm font-medium text-gray-500 hover:text-primary transition-colors"
        >
          ← Voltar ao calendário
        </button>
      </div>
    )
  }

  // Render Years View
  const renderYears = () => {
    const startYear = Math.floor(currentYear / 12) * 12
    const years = Array.from({ length: 12 }, (_, i) => startYear + i)
    const thisYear = getYear(new Date())

    return (
      <div className="space-y-4">
        {/* Decade Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentYear(currentYear - 12)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all active:scale-95"
            aria-label="Anos anteriores"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="px-4 py-2 text-base font-bold text-gray-900">
            {startYear} - {startYear + 11}
          </div>
          
          <button
            onClick={() => setCurrentYear(currentYear + 12)}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all active:scale-95"
            aria-label="Próximos anos"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Years Grid */}
        <div className="grid grid-cols-3 gap-2">
          {years.map((year) => {
            const isSelected = getYear(selectedDate) === year
            const isThisYear = year === thisYear
            
            return (
              <motion.button
                key={year}
                onClick={() => handleYearSelect(year)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  relative px-4 py-4 text-sm font-medium rounded-xl transition-all duration-200
                  ${isSelected
                    ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/30'
                    : isThisYear
                    ? 'bg-primary/10 text-primary ring-2 ring-primary/30'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }
                `}
              >
                {year}
              </motion.button>
            )
          })}
        </div>

        {/* Back Button */}
        <button
          onClick={() => setViewMode('months')}
          className="w-full py-2 text-sm font-medium text-gray-500 hover:text-primary transition-colors"
        >
          ← Voltar aos meses
        </button>
      </div>
    )
  }

  if (!isOpen) return null

  const calendarContent = (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />

      {/* Calendar Popover */}
      <div
        ref={calendarRef}
        className={`
          ${isCentered 
            ? 'fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none p-4'
            : 'fixed z-[9999]'
          }
        `}
        style={isCentered ? undefined : popoverStyle}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: isCentered ? 20 : position === 'top' ? 10 : -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={`${isCentered ? 'pointer-events-auto' : ''} w-full max-w-[340px]`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary via-primary-dark to-secondary p-4 text-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  <span className="font-semibold">Calendário</span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Selected Date Display */}
              <div className="space-y-0.5">
                <p className="text-white/70 text-xs uppercase tracking-wider">
                  {format(selectedDate, 'EEEE', { locale: ptBR })}
                </p>
                <p className="text-2xl font-bold">
                  {format(selectedDate, "d 'de' MMMM, yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="p-4">
              <AnimatePresence mode="wait">
                {viewMode === 'calendar' && (
                  <motion.div
                    key="calendar"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderCalendar()}
                  </motion.div>
                )}
                {viewMode === 'months' && (
                  <motion.div
                    key="months"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderMonths()}
                  </motion.div>
                )}
                {viewMode === 'years' && (
                  <motion.div
                    key="years"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderYears()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-4 pb-4">
              <button
                onClick={goToToday}
                className="w-full py-3 bg-gradient-to-r from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 text-primary font-semibold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4" />
                Ir para hoje
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )

  if (typeof window !== 'undefined') {
    return createPortal(calendarContent, document.body)
  }

  return calendarContent
}
