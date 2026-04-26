'use client'

import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useFinance } from '../FinanceContext'
import type { Category, FinanceKind } from '@/lib/data/finance/types'
import { KIND_LABELS } from '@/lib/data/finance/types'
import CategoryIcon from '../shared/CategoryIcon'
import CategoryModal from './CategoryModal'

export default function CategoriesTab() {
  const { categories } = useFinance()
  const [editing, setEditing] = useState<Category | null>(null)
  const [creating, setCreating] = useState<{ open: boolean; kind?: FinanceKind }>({ open: false })

  const grouped = useMemo(() => {
    const groups: Record<FinanceKind, Category[]> = { expense: [], income: [], investment: [] }
    for (const c of categories) {
      if (!c.is_archived) groups[c.kind].push(c)
    }
    return groups
  }, [categories])

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Personalize as categorias de cada tipo. Cada categoria tem ícone e cor únicos para facilitar a leitura nos gráficos.
      </p>

      {(['expense', 'income', 'investment'] as FinanceKind[]).map((kind) => (
        <section key={kind}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">{KIND_LABELS[kind]}</h3>
            <Button size="sm" variant="ghost" onClick={() => setCreating({ open: true, kind })}>
              <Plus size={14} className="mr-1" /> Nova
            </Button>
          </div>
          {grouped[kind].length === 0 ? (
            <div className="text-xs text-gray-400 italic px-3 py-3 bg-gray-50 rounded-xl">
              Nenhuma categoria.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {grouped[kind].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setEditing(c)}
                  className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow text-left"
                >
                  <span
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${c.color}1a` }}
                  >
                    <CategoryIcon name={c.icon} color={c.color} size={16} />
                  </span>
                  <span className="text-sm font-medium text-gray-900 truncate">{c.name}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      ))}

      <CategoryModal
        open={creating.open}
        onClose={() => setCreating({ open: false })}
        defaultKind={creating.kind}
      />
      <CategoryModal
        open={Boolean(editing)}
        initial={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}
