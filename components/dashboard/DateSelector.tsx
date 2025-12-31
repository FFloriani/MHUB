'use client'

import { useState, useRef } from 'react'
import { format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'
import CalendarPicker from './CalendarPicker'

interface DateSelectorProps {
  date: Date
  onDateChange: (date: Date) => void
}

export default function DateSelector({ date, onDateChange }: DateSelectorProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

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

  const isToday = isSameDay(date, new Date())

  return (
    <div className="relative">
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Previous Day Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={goToPreviousDay}
          className="p-2 sm:p-2.5 rounded-xl bg-white/80 hover:bg-white shadow-sm border border-gray-100 text-gray-600 hover:text-primary transition-all"
          aria-label="Dia anterior"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </motion.button>
        
        {/* Date Display Button */}
        <motion.button
          ref={triggerRef}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsCalendarOpen(true)}
          className="group px-4 sm:px-6 py-2 sm:py-3 bg-white/90 hover:bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            {/* Calendar Icon */}
            <div className="hidden sm:flex p-2 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 text-primary group-hover:from-primary/20 group-hover:to-secondary/20 transition-all">
              <Calendar className="w-4 h-4" />
            </div>
            
            {/* Date Text */}
            <div className="text-center sm:text-left">
              <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-medium">
                {format(date, 'EEEE', { locale: ptBR })}
              </div>
              <div className="text-sm sm:text-lg font-bold text-gray-900">
                {format(date, 'd', { locale: ptBR })}
                <span className="text-gray-400 font-normal"> de </span>
                {format(date, 'MMMM', { locale: ptBR })}
              </div>
            </div>

            {/* Today Badge */}
            {isToday && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="hidden sm:flex px-2 py-1 bg-gradient-to-r from-primary to-secondary text-white text-[10px] font-bold uppercase tracking-wider rounded-full"
              >
                Hoje
              </motion.div>
            )}
          </div>

          {/* Mobile Today Indicator */}
          {isToday && (
            <div className="sm:hidden text-[10px] text-primary font-semibold mt-0.5">
              Hoje
            </div>
          )}
        </motion.button>
        
        {/* Next Day Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={goToNextDay}
          className="p-2 sm:p-2.5 rounded-xl bg-white/80 hover:bg-white shadow-sm border border-gray-100 text-gray-600 hover:text-primary transition-all"
          aria-label="Próximo dia"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </motion.button>
      </div>

      <CalendarPicker
        selectedDate={date}
        onDateChange={onDateChange}
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        triggerRef={triggerRef}
      />
    </div>
  )
}
