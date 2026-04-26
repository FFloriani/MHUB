'use client'

import { Paperclip, RotateCw, Layers } from 'lucide-react'
import CategoryIcon from '../shared/CategoryIcon'
import { formatCurrency, formatDateShort } from '../shared/format'
import type { Category, Transaction } from '@/lib/data/finance/types'

interface TransactionRowProps {
  tx: Transaction
  category?: Category
  onClick: () => void
  hasAttachment?: boolean
}

export default function TransactionRow({ tx, category, onClick, hasAttachment }: TransactionRowProps) {
  const sign = tx.kind === 'expense' ? '-' : '+'
  const valueColor =
    tx.kind === 'expense' ? 'text-red-600' : tx.kind === 'income' ? 'text-emerald-600' : 'text-indigo-600'
  const cBg = category?.color ?? '#94a3b8'

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
    >
      <span
        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${cBg}1a` }}
      >
        <CategoryIcon name={category?.icon ?? 'Tag'} color={cBg} size={18} />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">{tx.title}</span>
          {tx.installment_id ? (
            <span className="text-[10px] uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Layers size={10} /> parcela
            </span>
          ) : null}
          {tx.recurring_id ? (
            <span className="text-[10px] uppercase tracking-wide text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded flex items-center gap-1">
              <RotateCw size={10} /> recorrente
            </span>
          ) : null}
          {!tx.paid ? (
            <span className="text-[10px] uppercase tracking-wide text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded">
              pendente
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
          <span>{formatDateShort(tx.occurred_on)}</span>
          {category ? <span>· {category.name}</span> : null}
          {tx.payment_method ? <span>· {tx.payment_method}</span> : null}
          {tx.tags?.length ? (
            <span className="truncate">· {tx.tags.map((t) => `#${t}`).join(' ')}</span>
          ) : null}
          {hasAttachment ? <Paperclip size={12} className="text-gray-400" /> : null}
        </div>
      </div>

      <div className={`shrink-0 font-semibold ${valueColor}`}>
        {sign} {formatCurrency(tx.amount)}
      </div>
    </button>
  )
}
