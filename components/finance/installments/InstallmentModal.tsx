'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from '../shared/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useFinance } from '../FinanceContext'
import { createInstallmentWithTransactions } from '@/lib/data/finance/installments'
import { PAYMENT_METHODS } from '@/lib/data/finance/types'
import { formatCurrency, isoToday, parseCurrency } from '../shared/format'

interface InstallmentModalProps {
  open: boolean
  onClose: () => void
  onSaved?: () => void
}

export default function InstallmentModal({ open, onClose, onSaved }: InstallmentModalProps) {
  const { user, categories, refreshTransactions } = useFinance()

  const [title, setTitle] = useState('')
  const [total, setTotal] = useState('')
  const [count, setCount] = useState(2)
  const [firstDue, setFirstDue] = useState(isoToday())
  const [paymentMethod, setPaymentMethod] = useState<string>('Cartão de Crédito')
  const [categoryId, setCategoryId] = useState('')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.kind === 'expense' && !c.is_archived),
    [categories],
  )

  useEffect(() => {
    if (!open) return
    setTitle('')
    setTotal('')
    setCount(2)
    setFirstDue(isoToday())
    setPaymentMethod('Cartão de Crédito')
    setCategoryId(expenseCategories[0]?.id ?? '')
    setNotes('')
    setError(null)
  }, [open, expenseCategories])

  const totalNum = parseCurrency(total)
  const perInstallment = count > 0 ? totalNum / count : 0

  async function handleSave() {
    setError(null)
    if (!title.trim()) return setError('Informe um título')
    if (totalNum <= 0) return setError('Valor total inválido')
    if (count < 1 || count > 360) return setError('Número de parcelas inválido')
    setIsSaving(true)
    try {
      await createInstallmentWithTransactions({
        user_id: user.id,
        category_id: categoryId || null,
        title: title.trim(),
        total_amount: totalNum,
        total_count: count,
        first_due: firstDue,
        payment_method: paymentMethod || null,
        notes: notes.trim() || null,
      })
      await refreshTransactions()
      onSaved?.()
      onClose()
    } catch (err) {
      console.error(err)
      setError('Erro ao salvar')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova compra parcelada"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin mr-1.5" size={16} /> : null}
            Criar {count} parcela{count > 1 ? 's' : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Título da compra">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Notebook, TV..."
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Valor total">
            <Input
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              placeholder="R$ 0,00"
              inputMode="decimal"
            />
          </Field>
          <Field label="Parcelas">
            <Input
              type="number"
              min={1}
              max={360}
              value={count}
              onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
            />
          </Field>
          <Field label="Primeiro vencimento">
            <Input type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Forma de pagamento">
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">—</option>
              {expenseCategories.map((c) => (
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

        {totalNum > 0 ? (
          <div className="text-sm bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg px-3 py-2">
            <span className="font-medium">{count}x</span> de aproximadamente{' '}
            <span className="font-semibold">{formatCurrency(perInstallment)}</span> a partir de{' '}
            {firstDue.split('-').reverse().join('/')}.
          </div>
        ) : null}

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
