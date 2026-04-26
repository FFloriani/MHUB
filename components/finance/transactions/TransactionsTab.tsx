'use client'

import { useMemo, useState } from 'react'
import { Plus, Search, Filter as FilterIcon } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useFinance } from '../FinanceContext'
import { formatCurrency } from '../shared/format'
import TransactionRow from './TransactionRow'
import TransactionModal from './TransactionModal'
import type { FinanceKind, Transaction } from '@/lib/data/finance/types'

export default function TransactionsTab() {
  const { transactions, categoriesById } = useFinance()

  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<FinanceKind | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [creating, setCreating] = useState<{ open: boolean; kind?: FinanceKind }>({ open: false })

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return transactions.filter((tx) => {
      if (kindFilter !== 'all' && tx.kind !== kindFilter) return false
      if (categoryFilter !== 'all' && tx.category_id !== categoryFilter) return false
      if (s) {
        const title = tx.title.toLowerCase()
        const tags = (tx.tags ?? []).join(' ').toLowerCase()
        if (!title.includes(s) && !tags.includes(s)) return false
      }
      return true
    })
  }, [transactions, search, kindFilter, categoryFilter])

  const categoryOptions = useMemo(() => {
    const used = new Set<string>()
    transactions.forEach((t) => {
      if (t.category_id) used.add(t.category_id)
    })
    return Array.from(used)
      .map((id) => categoriesById.get(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [transactions, categoriesById])

  const totals = useMemo(() => {
    let income = 0
    let expense = 0
    let invest = 0
    for (const t of filtered) {
      if (t.kind === 'income') income += Number(t.amount)
      else if (t.kind === 'expense') expense += Number(t.amount)
      else invest += Number(t.amount)
    }
    return { income, expense, invest }
  }, [filtered])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou tag..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCreating({ open: true, kind: 'expense' })}>
            <Plus size={16} className="mr-1" /> Lançamento
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-500 flex items-center gap-1">
          <FilterIcon size={14} /> Filtros:
        </span>
        <Pill active={kindFilter === 'all'} onClick={() => setKindFilter('all')}>
          Todos
        </Pill>
        <Pill active={kindFilter === 'expense'} onClick={() => setKindFilter('expense')} tone="red">
          Despesas
        </Pill>
        <Pill active={kindFilter === 'income'} onClick={() => setKindFilter('income')} tone="green">
          Receitas
        </Pill>
        <Pill active={kindFilter === 'investment'} onClick={() => setKindFilter('investment')} tone="indigo">
          Investimentos
        </Pill>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700"
        >
          <option value="all">Todas as categorias</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <Mini label="Receitas" color="text-emerald-600" value={totals.income} />
        <Mini label="Despesas" color="text-red-600" value={totals.expense} />
        <Mini label="Investimentos" color="text-indigo-600" value={totals.invest} />
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-50">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            Nenhum lançamento encontrado neste mês com esses filtros.
          </div>
        ) : (
          filtered.map((tx) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              category={tx.category_id ? categoriesById.get(tx.category_id) : undefined}
              onClick={() => setEditing(tx)}
            />
          ))
        )}
      </div>

      <TransactionModal
        open={creating.open}
        onClose={() => setCreating({ open: false })}
        defaultKind={creating.kind}
      />
      <TransactionModal
        open={Boolean(editing)}
        initial={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}

function Pill({
  active,
  onClick,
  children,
  tone = 'default',
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  tone?: 'default' | 'red' | 'green' | 'indigo'
}) {
  const activeStyles: Record<string, string> = {
    default: 'bg-gray-900 text-white border-gray-900',
    red: 'bg-red-600 text-white border-red-600',
    green: 'bg-emerald-600 text-white border-emerald-600',
    indigo: 'bg-indigo-600 text-white border-indigo-600',
  }
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active ? activeStyles[tone] : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}

function Mini({ label, color, value }: { label: string; color: string; value: number }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
      <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`font-semibold ${color}`}>{formatCurrency(value)}</div>
    </div>
  )
}
