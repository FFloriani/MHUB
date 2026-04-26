'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Wallet } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useFinance } from '../FinanceContext'
import { listLoansWithBalance, type LoanWithBalance } from '@/lib/data/finance/loans'
import type { Loan } from '@/lib/data/finance/types'
import { formatCurrency, formatDate } from '../shared/format'
import LoanModal from './LoanModal'
import PaymentModal from './PaymentModal'

const STATUS_LABEL = {
  open: 'Em aberto',
  partial: 'Parcial',
  paid: 'Quitado',
}

const STATUS_STYLE = {
  open: 'bg-amber-100 text-amber-700',
  partial: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
}

export default function LoansTab() {
  const { user } = useFinance()
  const [data, setData] = useState<LoanWithBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Loan | null>(null)
  const [creating, setCreating] = useState(false)
  const [paymentTarget, setPaymentTarget] = useState<LoanWithBalance | null>(null)
  const [filter, setFilter] = useState<'all' | 'lent' | 'borrowed'>('all')

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setData(await listLoansWithBalance(user.id))
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    reload()
  }, [reload])

  const filtered = filter === 'all' ? data : data.filter((d) => d.loan.direction === filter)

  const totals = data.reduce(
    (acc, d) => {
      if (d.loan.status === 'paid') return acc
      if (d.loan.direction === 'lent') acc.toReceive += d.remaining
      else acc.toPay += d.remaining
      return acc
    },
    { toReceive: 0, toPay: 0 },
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm text-gray-500">
          Controle empréstimos que você fez ou recebeu, com pagamentos parciais e status automático.
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} className="mr-1" /> Novo empréstimo
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-400">A receber</div>
          <div className="text-xl font-bold text-emerald-600 mt-1 tabular-nums">{formatCurrency(totals.toReceive)}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-400">A pagar</div>
          <div className="text-xl font-bold text-red-600 mt-1 tabular-nums">{formatCurrency(totals.toPay)}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Pill active={filter === 'all'} onClick={() => setFilter('all')}>
          Todos
        </Pill>
        <Pill active={filter === 'lent'} onClick={() => setFilter('lent')}>
          Emprestei
        </Pill>
        <Pill active={filter === 'borrowed'} onClick={() => setFilter('borrowed')}>
          Peguei emprestado
        </Pill>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm bg-white border border-gray-100 rounded-2xl">
          Nenhum empréstimo cadastrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((d) => {
            const pct = d.loan.principal > 0 ? (d.paid / Number(d.loan.principal)) * 100 : 0
            return (
              <div key={d.loan.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{d.loan.counterpart_name}</div>
                    <div className="text-xs text-gray-500">
                      {d.loan.direction === 'lent' ? 'Eu emprestei' : 'Eu peguei'} · {formatDate(d.loan.taken_on)}
                      {d.loan.due_date ? <> · vence {formatDate(d.loan.due_date)}</> : null}
                    </div>
                  </div>
                  <span className={`text-[10px] uppercase px-2 py-1 rounded ${STATUS_STYLE[d.loan.status]}`}>
                    {STATUS_LABEL[d.loan.status]}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Pago: <span className="font-medium text-emerald-600">{formatCurrency(d.paid)}</span>
                  </span>
                  <span className="font-semibold text-gray-900">{formatCurrency(d.loan.principal)}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                {d.loan.status !== 'paid' ? (
                  <div className="text-xs text-gray-500 mt-2">
                    Restante: <span className="font-medium text-red-600">{formatCurrency(d.remaining)}</span>
                  </div>
                ) : null}

                {d.loan.notes ? (
                  <div className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg px-2 py-1.5 italic">
                    {d.loan.notes}
                  </div>
                ) : null}

                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => setPaymentTarget(d)} className="flex-1">
                    <Wallet size={14} className="mr-1" /> Pagamentos
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(d.loan)}>
                    <Pencil size={14} />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <LoanModal open={creating} onClose={() => setCreating(false)} onSaved={reload} />
      <LoanModal
        open={Boolean(editing)}
        initial={editing}
        onClose={() => setEditing(null)}
        onSaved={reload}
      />
      {paymentTarget ? (
        <PaymentModal
          open={Boolean(paymentTarget)}
          onClose={() => setPaymentTarget(null)}
          loan={paymentTarget.loan}
          remaining={paymentTarget.remaining}
          onSaved={reload}
        />
      ) : null}
    </div>
  )
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active
          ? 'bg-gray-900 text-white border-gray-900'
          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}
