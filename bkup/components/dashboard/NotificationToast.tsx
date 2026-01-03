'use client'

import { X, Check } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import type { Database } from '@/lib/supabase'

type Event = Database['public']['Tables']['events']['Row']

interface NotificationToastProps {
  event: Event
  onConfirm: () => void
  onDismiss: () => void
}

export default function NotificationToast({ event, onConfirm, onDismiss }: NotificationToastProps) {
  const startTime = parseISO(event.start_time)
  const timeStr = format(startTime, 'HH:mm', { locale: ptBR })

  return (
    <Card className="p-4 shadow-lg border-l-4 border-primary animate-slide-in">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <h4 className="font-semibold text-gray-900">Compromisso em breve</h4>
          </div>
          <p className="text-sm font-medium text-gray-900 mb-1">{event.title}</p>
          <p className="text-xs text-gray-600">Horário: {timeStr}</p>
          {event.description && (
            <p className="text-xs text-gray-500 mt-1">{event.description}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            className="flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            Vi
          </Button>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  )
}

