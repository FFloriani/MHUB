'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import Modal from '../shared/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useFinance } from '../FinanceContext'
import { deleteBudget, upsertBudget } from '@/lib/data/finance/budgets'
import type { Budget } from '@/lib/data/finance/types'
import { parseCurrency } from '../shared/format'

interface BudgetModalProps {
  open: boolean
  onClose: () => void
  initial?: Budget | null
  excludeCategoryIds?: string[]
  onSaved?: () => void
}

export default function BudgetModal({
  open,
  onClose,
  initial,
  excludeCategoryIds = [],
  onSaved,
}: BudgetModalProps) {
  const { user, categories } = useFinance()
  const [categoryId, setCategoryId] = useState('')
  const [limit, setLimit] = useState('')
  const [threshold, setThreshold] = useState(80)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = Boolean(initial)
  const expenseCategories = useMemo(() => {
    const exc = new Set(excludeCategoryIds)
    return categories.filter(
      (c) => c.kind === 'expense' && !c.is_archived && (!exc.has(c.id) || c.id === initial?.category_id),
    )
  }, [categories, excludeCategoryIds, initial?.category_id])

  useEffect(() => {
    if (!open) return
    if (initial) {
      setCategoryId(initial.category_id)
      setLimit(initial.monthly_limit.toFixed(2).replace('.', ','))
      setThreshold(initial.alert_threshold)
    } else {
      setCategoryId(expenseCategories[0]?.id ?? '')
      setLimit('')
      setThreshold(80)
    }
    setError(null)
  }, [open, initial, expenseCategories])

  async function handleSave() {
    setError(null)
    const limitNum = parseCurrency(limit)
    if (!categoryId) return setError('Selecione uma categoria')
    if (limitNum <= 0) return setError('Limite inválido')
    setIsSaving(true)
    try {
      await upsertBudget({
        user_id: user.id,
        category_id: categoryId,
        monthly_limit: limitNum,
        alert_threshold: threshold,
      })
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
    if (!confirm('Remover este orçamento?')) return
    setIsDeleting(true)
    try {
      await deleteBudget(initial.id)
      onSaved?.()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar orçamento' : 'Novo orçamento'}
      size="md"
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
              <span className="ml-1.5">Remover</span>
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
        <Field label="Categoria">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={isEdit}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
          >
            <option value="">—</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Limite mensal">
          <Input
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="R$ 0,00"
            inputMode="decimal"
          />
        </Field>

        <Field label={`Alertar ao atingir ${threshold}%`}>
          <input
            type="range"
            min={50}
            max={100}
            step={5}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full"
          />
        </Field>

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
