'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, AlertTriangle } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useFinance } from '../FinanceContext'
import { getBudgetUsage, type BudgetUsage } from '@/lib/data/finance/budgets'
import { formatCurrency, monthLabel } from '../shared/format'
import CategoryIcon from '../shared/CategoryIcon'
import BudgetModal from './BudgetModal'
import type { Budget } from '@/lib/data/finance/types'

export default function BudgetsTab() {
  const { user, year, month, categoriesById } = useFinance()
  const [usage, setUsage] = useState<BudgetUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [creating, setCreating] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setUsage(await getBudgetUsage(user.id, year, month))
    } finally {
      setLoading(false)
    }
  }, [user.id, year, month])

  useEffect(() => {
    reload()
  }, [reload])

  const totalLimit = usage.reduce((acc, u) => acc + Number(u.budget.monthly_limit), 0)
  const totalSpent = usage.reduce((acc, u) => acc + u.spent, 0)
  const overall = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-sm text-gray-500">
            Defina um teto mensal por categoria. As barras viram amarelas/vermelhas conforme você consome.
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Aplicado em <span className="font-medium">{monthLabel(month)} / {year}</span>
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} className="mr-1" /> Novo orçamento
        </Button>
      </div>

      {usage.length > 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Total do mês</span>
            <span className="text-gray-900 font-semibold">
              {formatCurrency(totalSpent)} / {formatCurrency(totalLimit)}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full transition-all duration-300 ${
                overall >= 100 ? 'bg-red-500' : overall >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, overall)}%` }}
            />
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Carregando...</div>
      ) : usage.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm bg-white border border-gray-100 rounded-2xl">
          Nenhum orçamento configurado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {usage.map((u) => {
            const cat = categoriesById.get(u.budget.category_id)
            const barColor =
              u.status === 'over' ? 'bg-red-500' : u.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
            return (
              <button
                key={u.budget.id}
                onClick={() => setEditing(u.budget)}
                className="text-left bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${cat?.color ?? '#94a3b8'}1a` }}
                    >
                      <CategoryIcon name={cat?.icon ?? 'Tag'} color={cat?.color ?? '#94a3b8'} size={16} />
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">{cat?.name ?? 'Sem categoria'}</div>
                      <div className="text-xs text-gray-500">
                        {formatCurrency(u.spent)} / {formatCurrency(u.budget.monthly_limit)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-semibold tabular-nums ${
                        u.status === 'over'
                          ? 'text-red-600'
                          : u.status === 'warning'
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                      }`}
                    >
                      {u.percent.toFixed(0)}%
                    </div>
                    {u.status === 'over' ? (
                      <span className="text-[10px] text-red-700 bg-red-100 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                        <AlertTriangle size={10} /> excedeu
                      </span>
                    ) : u.status === 'warning' ? (
                      <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        atenção
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${Math.min(100, u.percent)}%` }}
                  />
                </div>
              </button>
            )
          })}
        </div>
      )}

      <BudgetModal
        open={creating}
        onClose={() => setCreating(false)}
        excludeCategoryIds={usage.map((u) => u.budget.category_id)}
        onSaved={reload}
      />
      <BudgetModal
        open={Boolean(editing)}
        initial={editing}
        onClose={() => setEditing(null)}
        excludeCategoryIds={usage.map((u) => u.budget.category_id)}
        onSaved={reload}
      />
    </div>
  )
}
