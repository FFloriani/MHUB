'use client'

import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { monthLabel } from './shared/format'

interface MonthSelectorProps {
  year: number
  month: number
  onChange: (year: number, month: number) => void
  onJumpToday?: () => void
}

export default function MonthSelector({ year, month, onChange, onJumpToday }: MonthSelectorProps) {
  const prev = () => {
    if (month === 1) onChange(year - 1, 12)
    else onChange(year, month - 1)
  }
  const next = () => {
    if (month === 12) onChange(year + 1, 1)
    else onChange(year, month + 1)
  }
  const today = () => {
    const d = new Date()
    if (onJumpToday) onJumpToday()
    onChange(d.getFullYear(), d.getMonth() + 1)
  }

  return (
    <div className="flex items-center bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
      <button
        onClick={prev}
        className="p-2 hover:bg-gray-50 rounded-lg text-gray-500 transition-colors"
        aria-label="Mês anterior"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="px-3 min-w-[10rem] text-center">
        <div className="text-sm font-semibold text-gray-900">{monthLabel(month)}</div>
        <div className="text-xs text-gray-400">{year}</div>
      </div>
      <button
        onClick={next}
        className="p-2 hover:bg-gray-50 rounded-lg text-gray-500 transition-colors"
        aria-label="Próximo mês"
      >
        <ChevronRight size={18} />
      </button>
      <button
        onClick={today}
        className="ml-1 px-2 py-2 hover:bg-gray-50 rounded-lg text-gray-500 transition-colors flex items-center gap-1 text-xs"
        title="Ir para hoje"
      >
        <CalendarDays size={14} />
        <span className="hidden sm:inline">Hoje</span>
      </button>
    </div>
  )
}
