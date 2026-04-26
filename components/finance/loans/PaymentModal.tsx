'use client'

import { useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import Modal from '../shared/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useFinance } from '../FinanceContext'
import {
  createLoanPayment,
  deleteLoanPayment,
  listLoanPayments,
} from '@/lib/data/finance/loans'
import type { Loan, LoanPayment } from '@/lib/data/finance/types'
import { formatCurrency, formatDate, isoToday, parseCurrency } from '../shared/format'

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  loan: Loan
  remaining: number
  onSaved?: () => void
}

export default function PaymentModal({ open, onClose, loan, remaining, onSaved }: PaymentModalProps) {
  const { user } = useFinance()
  const [amount, setAmount] = useState('')
  const [paidOn, setPaidOn] = useState(isoToday())
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<LoanPayment[]>([])

  useEffect(() => {
    if (!open) return
    setAmount('')
    setPaidOn(isoToday())
    setNotes('')
    setError(null)
    listLoanPayments(loan.id).then(setHistory).catch(console.error)
  }, [open, loan.id])

  async function handleSave() {
    setError(null)
    const num = parseCurrency(amount)
    if (num <= 0) return setError('Valor inválido')
    setIsSaving(true)
    try {
      await createLoanPayment({
        user_id: user.id,
        loan_id: loan.id,
        amount: num,
        paid_on: paidOn,
        notes: notes.trim() || null,
      })
      const fresh = await listLoanPayments(loan.id)
      setHistory(fresh)
      onSaved?.()
      setAmount('')
      setNotes('')
    } catch (err) {
      console.error(err)
      setError('Erro ao registrar pagamento')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRemove(p: LoanPayment) {
    if (!confirm(`Remover pagamento de ${formatCurrency(p.amount)}?`)) return
    try {
      await deleteLoanPayment(p.id)
      const fresh = await listLoanPayments(loan.id)
      setHistory(fresh)
      onSaved?.()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pagamentos · ${loan.counterpart_name}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Fechar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin mr-1.5" size={16} /> : null}
            Registrar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-600">
          Restante a {loan.direction === 'lent' ? 'receber' : 'pagar'}:{' '}
          <span className="font-semibold text-gray-900">{formatCurrency(remaining)}</span> de{' '}
          {formatCurrency(loan.principal)}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Valor">
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="R$ 0,00"
              inputMode="decimal"
            />
          </Field>
          <Field label="Data">
            <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </Field>
          <Field label="Observação">
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Pix, dinheiro..."
            />
          </Field>
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <div className="border-t border-gray-100 pt-4">
          <h4 className="font-medium text-gray-900 text-sm mb-2">Histórico</h4>
          {history.length === 0 ? (
            <div className="text-xs text-gray-400 italic">Nenhum pagamento registrado.</div>
          ) : (
            <ul className="divide-y divide-gray-50 border border-gray-100 rounded-xl">
              {history.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-800 tabular-nums">{formatCurrency(p.amount)}</div>
                    <div className="text-xs text-gray-500">
                      {formatDate(p.paid_on)}
                      {p.notes ? <> · {p.notes}</> : null}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(p)}
                    className="text-red-500 hover:text-red-700"
                    aria-label="Remover"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
