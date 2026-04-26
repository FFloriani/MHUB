'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useFinance } from '../FinanceContext'
import {
  deleteInstallment,
  getInstallmentTransactions,
  listInstallments,
} from '@/lib/data/finance/installments'
import type { Installment, Transaction } from '@/lib/data/finance/types'
import { formatCurrency, formatDateShort, monthLabel } from '../shared/format'
import CategoryIcon from '../shared/CategoryIcon'
import InstallmentModal from './InstallmentModal'

interface Row {
  installment: Installment
  txs: Transaction[]
  paid: number
  remaining: number
  paidCount: number
}

export default function InstallmentsTab() {
  const { user, categoriesById, refreshTransactions } = useFinance()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listInstallments(user.id)
      const enriched = await Promise.all(
        list.map(async (it) => {
          const txs = await getInstallmentTransactions(it.id)
          const paid = txs.filter((t) => t.paid).reduce((acc, t) => acc + Number(t.amount), 0)
          const paidCount = txs.filter((t) => t.paid).length
          return {
            installment: it,
            txs,
            paid,
            remaining: Math.max(0, Number(it.total_amount) - paid),
            paidCount,
          }
        }),
      )
      setRows(enriched)
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleDelete(it: Installment) {
    if (
      !confirm(
        `Excluir "${it.title}" e suas ${it.total_count} parcelas? As parcelas serão removidas em cascata.`,
      )
    )
      return
    try {
      await deleteInstallment(it.id)
      await refreshTransactions()
      reload()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm text-gray-500">
          Compras parceladas geram automaticamente lançamentos mensais. Marque cada parcela como paga conforme efetuar.
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} className="mr-1" /> Nova parcelada
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Carregando...</div>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm bg-white border border-gray-100 rounded-2xl">
          Nenhuma compra parcelada cadastrada.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(({ installment: it, txs, paid, remaining, paidCount }) => {
            const cat = it.category_id ? categoriesById.get(it.category_id) : undefined
            const pct = it.total_amount > 0 ? (paid / Number(it.total_amount)) * 100 : 0
            const nextTx = txs.find((t) => !t.paid)
            return (
              <div
                key={it.id}
                className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${cat?.color ?? '#94a3b8'}1a` }}
                    >
                      <CategoryIcon name={cat?.icon ?? 'Tag'} color={cat?.color ?? '#94a3b8'} size={18} />
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{it.title}</div>
                      <div className="text-xs text-gray-500">
                        {it.total_count}x · {cat?.name ?? '—'} · {it.payment_method ?? '—'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{formatCurrency(it.total_amount)}</div>
                    <button
                      onClick={() => handleDelete(it)}
                      className="text-xs text-red-500 hover:text-red-700 inline-flex items-center gap-1 mt-0.5"
                    >
                      <Trash2 size={12} /> excluir
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Pago: <span className="text-emerald-600 font-medium">{formatCurrency(paid)}</span> ({paidCount}/{it.total_count})
                  </span>
                  <span>
                    Restante: <span className="text-red-600 font-medium">{formatCurrency(remaining)}</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>

                {nextTx ? (
                  <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                    Próxima parcela: <span className="font-medium">#{nextTx.installment_index}</span> em{' '}
                    {monthLabel(Number(nextTx.occurred_on.split('-')[1]), true)} ({formatDateShort(nextTx.occurred_on)}) ·{' '}
                    {formatCurrency(nextTx.amount)}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      <InstallmentModal open={creating} onClose={() => setCreating(false)} onSaved={reload} />
    </div>
  )
}
