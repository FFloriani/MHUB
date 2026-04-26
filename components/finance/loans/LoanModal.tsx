'use client'

import { useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import Modal from '../shared/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useFinance } from '../FinanceContext'
import { createLoan, deleteLoan, updateLoan } from '@/lib/data/finance/loans'
import type { Loan } from '@/lib/data/finance/types'
import { isoToday, parseCurrency } from '../shared/format'

interface LoanModalProps {
  open: boolean
  onClose: () => void
  initial?: Loan | null
  onSaved?: () => void
}

export default function LoanModal({ open, onClose, initial, onSaved }: LoanModalProps) {
  const { user } = useFinance()
  const [name, setName] = useState('')
  const [direction, setDirection] = useState<'lent' | 'borrowed'>('lent')
  const [principal, setPrincipal] = useState('')
  const [takenOn, setTakenOn] = useState(isoToday())
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = Boolean(initial)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setName(initial.counterpart_name)
      setDirection(initial.direction)
      setPrincipal(initial.principal.toFixed(2).replace('.', ','))
      setTakenOn(initial.taken_on)
      setDueDate(initial.due_date ?? '')
      setNotes(initial.notes ?? '')
    } else {
      setName('')
      setDirection('lent')
      setPrincipal('')
      setTakenOn(isoToday())
      setDueDate('')
      setNotes('')
    }
    setError(null)
  }, [open, initial])

  async function handleSave() {
    setError(null)
    const num = parseCurrency(principal)
    if (!name.trim()) return setError('Informe o nome da pessoa')
    if (num <= 0) return setError('Valor inválido')
    setIsSaving(true)
    try {
      if (initial) {
        await updateLoan(initial.id, {
          counterpart_name: name.trim(),
          direction,
          principal: num,
          taken_on: takenOn,
          due_date: dueDate || null,
          notes: notes.trim() || null,
        })
      } else {
        await createLoan({
          user_id: user.id,
          counterpart_name: name.trim(),
          direction,
          principal: num,
          taken_on: takenOn,
          due_date: dueDate || null,
          notes: notes.trim() || null,
        })
      }
      onSaved?.()
      onClose()
    } catch (err) {
      console.error(err)
      setError('Erro ao salvar')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!initial) return
    if (!confirm('Excluir este empréstimo e todos seus pagamentos?')) return
    setIsDeleting(true)
    try {
      await deleteLoan(initial.id)
      onSaved?.()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar empréstimo' : 'Novo empréstimo'}
      size="md"
      footer={
        <>
          {isEdit ? (
            <Button
              variant="ghost"
              className="text-red-600 hover:bg-red-50 mr-auto"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
            >
              {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
              <span className="ml-1.5">Excluir</span>
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin mr-1.5" size={16} /> : null}
            {isEdit ? 'Salvar' : 'Criar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDirection('lent')}
            className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
              direction === 'lent'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Emprestei (vão me pagar)
          </button>
          <button
            type="button"
            onClick={() => setDirection('borrowed')}
            className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
              direction === 'borrowed'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Peguei emprestado (vou pagar)
          </button>
        </div>

        <Field label={direction === 'lent' ? 'Pessoa que pegou emprestado' : 'Pessoa que emprestou'}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome..." />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Valor">
            <Input
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              placeholder="R$ 0,00"
              inputMode="decimal"
            />
          </Field>
          <Field label="Data">
            <Input type="date" value={takenOn} onChange={(e) => setTakenOn(e.target.value)} />
          </Field>
          <Field label="Prazo (opcional)">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Observações">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Detalhes, motivo, condições..."
          />
        </Field>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}
