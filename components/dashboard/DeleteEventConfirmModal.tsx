'use client'

import { AlertTriangle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface DeleteEventConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onDeleteOne: () => void
  onDeleteAll: () => void
  eventTitle: string
  repeatedCount: number
  isDeleting: boolean
}

export default function DeleteEventConfirmModal({
  isOpen,
  onClose,
  onDeleteOne,
  onDeleteAll,
  eventTitle,
  repeatedCount,
  isDeleting,
}: DeleteEventConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6 m-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Deletar Compromisso
            </h3>
            <p className="text-sm text-gray-600">
              Este compromisso se repete em <strong>{repeatedCount} dias</strong>.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-gray-900 mb-1">{eventTitle}</p>
          <p className="text-xs text-gray-600">
            {repeatedCount === 1 
              ? 'Este evento aparece apenas neste dia.'
              : `Este evento aparece em ${repeatedCount} dias diferentes.`}
          </p>
        </div>

        <div className="space-y-3">
          <Button
            variant="primary"
            onClick={onDeleteAll}
            disabled={isDeleting}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? 'Deletando...' : `Deletar todos os ${repeatedCount} compromissos`}
          </Button>
          <Button
            variant="ghost"
            onClick={onDeleteOne}
            disabled={isDeleting}
            className="w-full"
          >
            Deletar apenas este compromisso
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full text-gray-500"
          >
            Cancelar
          </Button>
        </div>
      </Card>
    </div>
  )
}

