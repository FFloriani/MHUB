'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Sparkles, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useFinance } from '../FinanceContext'
import { listRecurring, materializeRecurringMonth } from '@/lib/data/finance/recurring'
import type { Recurring } from '@/lib/data/finance/types'
import { formatCurrency, monthLabel } from '../shared/format'
import CategoryIcon from '../shared/CategoryIcon'
import RecurringModal from './RecurringModal'

export default function RecurringTab() {
  const { user, year, month, categoriesById, refreshTransactions } = useFinance()
  const [list, setList] = useState<Recurring[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Recurring | null>(null)
  const [creating, setCreating] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedMsg, setGeneratedMsg] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setList(await listRecurring(user.id))
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleGenerate() {
    setGenerating(true)
    setGeneratedMsg(null)
    try {
      const created = await materializeRecurringMonth(user.id, year, month)
      setGeneratedMsg(
        created === 0
          ? `Nenhum novo lançamento. ${monthLabel(month)} já está em dia.`
          : `${created} lançamento(s) criados em ${monthLabel(month)}/${year}.`,
      )
      await refreshTransactions()
    } catch (err) {
      console.error(err)
      setGeneratedMsg('Erro ao gerar lançamentos.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm text-gray-500">
          Templates que se repetem todo mês (ex: aluguel, internet, academia, salário).
        </p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 size={16} className="animate-spin mr-1.5" />
            ) : (
              <Sparkles size={16} className="mr-1.5" />
            )}
            Gerar {monthLabel(month, true)}/{year}
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} className="mr-1" /> Novo
          </Button>
        </div>
      </div>

      {generatedMsg ? (
        <div className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2">
          {generatedMsg}
        </div>
      ) : null}

      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Carregando...</div>
      ) : list.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm bg-white border border-gray-100 rounded-2xl">
          Nenhum lançamento recorrente. Crie um para automatizar contas mensais.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {list.map((r) => {
            const cat = r.category_id ? categoriesById.get(r.category_id) : undefined
            return (
              <button
                key={r.id}
                onClick={() => setEditing(r)}
                className="text-left bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${cat?.color ?? '#94a3b8'}1a` }}
                    >
                      <CategoryIcon name={cat?.icon ?? 'Tag'} color={cat?.color ?? '#94a3b8'} size={16} />
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">{r.title}</div>
                      <div className="text-xs text-gray-500">
                        Dia {r.day_of_month} · {cat?.name ?? '—'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-semibold tabular-nums ${
                        r.kind === 'expense'
                          ? 'text-red-600'
                          : r.kind === 'income'
                            ? 'text-emerald-600'
                            : 'text-indigo-600'
                      }`}
                    >
                      {formatCurrency(r.amount)}
                    </div>
                    {!r.active ? (
                      <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        inativo
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <RecurringModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={reload}
      />
      <RecurringModal
        open={Boolean(editing)}
        initial={editing}
        onClose={() => setEditing(null)}
        onSaved={reload}
      />
    </div>
  )
}
