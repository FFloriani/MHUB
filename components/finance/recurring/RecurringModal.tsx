'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import Modal from '../shared/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useFinance } from '../FinanceContext'
import {
  createRecurring,
  deleteRecurring,
  updateRecurring,
} from '@/lib/data/finance/recurring'
import {
  FinanceKind,
  KIND_LABELS,
  PAYMENT_METHODS,
  Recurring,
} from '@/lib/data/finance/types'
import { isoToday, parseCurrency } from '../shared/format'

interface RecurringModalProps {
  open: boolean
  onClose: () => void
  initial?: Recurring | null
  onSaved?: () => void
}

export default function RecurringModal({ open, onClose, initial, onSaved }: RecurringModalProps) {
  const { user, categories } = useFinance()

  const [kind, setKind] = useState<FinanceKind>('expense')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [day, setDay] = useState(1)
  const [startDate, setStartDate] = useState(isoToday())
  const [endDate, setEndDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [notes, setNotes] = useState('')
  const [active, setActive] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = Boolean(initial)
  const filteredCategories = useMemo(
    () => categories.filter((c) => c.kind === kind && !c.is_archived),
    [categories, kind],
  )

  useEffect(() => {
    if (!open) return
    if (initial) {
      setKind(initial.kind)
      setTitle(initial.title)
      setAmount(initial.amount.toFixed(2).replace('.', ','))
      setDay(initial.day_of_month)
      setStartDate(initial.start_date)
      setEndDate(initial.end_date ?? '')
      setPaymentMethod(initial.payment_method ?? '')
      setCategoryId(initial.category_id ?? '')
      setNotes(initial.notes ?? '')
      setActive(initial.active)
    } else {
      setKind('expense')
      setTitle('')
      setAmount('')
      setDay(new Date().getDate())
      setStartDate(isoToday())
      setEndDate('')
      setPaymentMethod('')
      setCategoryId('')
      setNotes('')
      setActive(true)
    }
    setError(null)
  }, [open, initial])

  async function handleSave() {
    setError(null)
    const numericAmount = parseCurrency(amount)
    if (!title.trim()) return setError('Informe um título')
    if (numericAmount <= 0) return setError('Valor inválido')
    if (day < 1 || day > 31) return setError('Dia inválido (1-31)')

    setIsSaving(true)
    try {
      if (initial) {
        await updateRecurring(initial.id, {
          kind,
          title: title.trim(),
          amount: numericAmount,
          day_of_month: day,
          start_date: startDate,
          end_date: endDate || null,
          payment_method: paymentMethod || null,
          category_id: categoryId || null,
          notes: notes.trim() || null,
          active,
        })
      } else {
        await createRecurring({
          user_id: user.id,
          kind,
          title: title.trim(),
          amount: numericAmount,
          day_of_month: day,
          start_date: startDate,
          end_date: endDate || null,
          payment_method: paymentMethod || null,
          category_id: categoryId || null,
          notes: notes.trim() || null,
          active,
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
    if (!confirm('Excluir este template recorrente? As transações já geradas serão mantidas.')) return
    setIsDeleting(true)
    try {
      await deleteRecurring(initial.id)
      onSaved?.()
      onClose()
    } catch (err) {
      console.error(err)
      setError('Erro ao excluir')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar recorrente' : 'Novo lançamento recorrente'}
      size="lg"
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
        <div className="grid grid-cols-3 gap-2">
          {(['expense', 'income', 'investment'] as FinanceKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                kind === k
                  ? k === 'expense'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : k === 'income'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Título">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Internet, Aluguel..." />
          </Field>
          <Field label="Valor">
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="R$ 0,00"
              inputMode="decimal"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Dia do mês">
            <Input
              type="number"
              min={1}
              max={31}
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
            />
          </Field>
          <Field label="Início">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Fim (opcional)">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Forma de pagamento">
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900"
            >
              <option value="">—</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Categoria">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-gray-900"
            >
              <option value="">—</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Observações">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          Ativo (gera transações automaticamente ao usar &quot;Gerar mês&quot;)
        </label>

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
