'use client'

import { useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import Modal from '../shared/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useFinance } from '../FinanceContext'
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from '@/lib/data/finance/categories'
import type { Category, FinanceKind } from '@/lib/data/finance/types'
import { KIND_LABELS } from '@/lib/data/finance/types'
import CategoryIcon from '../shared/CategoryIcon'

const ICONS = [
  'Tag', 'UtensilsCrossed', 'Bike', 'ShoppingCart', 'Car', 'Home', 'Building2',
  'Receipt', 'Wifi', 'Zap', 'Droplet', 'Heart', 'Sparkles', 'Dumbbell',
  'Gamepad2', 'Tv', 'Package', 'Shirt', 'GraduationCap', 'Cat', 'Gift',
  'Wallet', 'Briefcase', 'Award', 'CalendarHeart', 'Undo2', 'Landmark',
  'PiggyBank', 'TrendingUp', 'Bitcoin', 'ShieldCheck', 'Plane', 'Coffee',
  'Pizza', 'Beer', 'Music', 'BookOpen', 'Camera', 'Heart', 'Stethoscope',
  'Fuel', 'Bus', 'Train', 'Smartphone', 'Laptop', 'CreditCard', 'Banknote',
] as const

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b',
  '#a16207', '#0d9488', '#dc2626', '#db2777',
] as const

interface CategoryModalProps {
  open: boolean
  onClose: () => void
  initial?: Category | null
  defaultKind?: FinanceKind
  onSaved?: () => void
}

export default function CategoryModal({
  open,
  onClose,
  initial,
  defaultKind = 'expense',
  onSaved,
}: CategoryModalProps) {
  const { user, refreshCategories } = useFinance()

  const [kind, setKind] = useState<FinanceKind>(defaultKind)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('Tag')
  const [color, setColor] = useState('#6366f1')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = Boolean(initial)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setKind(initial.kind)
      setName(initial.name)
      setIcon(initial.icon)
      setColor(initial.color)
    } else {
      setKind(defaultKind)
      setName('')
      setIcon('Tag')
      setColor('#6366f1')
    }
    setError(null)
  }, [open, initial, defaultKind])

  async function handleSave() {
    setError(null)
    if (!name.trim()) return setError('Informe um nome')
    setIsSaving(true)
    try {
      if (initial) {
        await updateCategory(initial.id, {
          kind,
          name: name.trim(),
          icon,
          color,
        })
      } else {
        await createCategory({
          user_id: user.id,
          kind,
          name: name.trim(),
          icon,
          color,
        })
      }
      await refreshCategories()
      onSaved?.()
      onClose()
    } catch (err) {
      console.error(err)
      setError('Erro ao salvar (categoria com nome já existente?)')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!initial) return
    if (
      !confirm(
        'Excluir esta categoria? Lançamentos existentes ficam sem categoria, mas não são apagados.',
      )
    )
      return
    setIsDeleting(true)
    try {
      await deleteCategory(initial.id)
      await refreshCategories()
      onSaved?.()
      onClose()
    } catch (err) {
      console.error(err)
      setError('Erro ao excluir')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar categoria' : 'Nova categoria'}
      size="lg"
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
              <span className="ml-1.5">Excluir</span>
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
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-2">
          {(['expense', 'income', 'investment'] as FinanceKind[]).map((k) => (
            <button
              key={k}
              type="button"
              disabled={isEdit}
              onClick={() => setKind(k)}
              className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                kind === k
                  ? k === 'expense'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : k === 'income'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50'
              }`}
            >
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 px-3 py-3 bg-gray-50 rounded-xl">
          <span
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: `${color}1a` }}
          >
            <CategoryIcon name={icon} color={color} size={24} />
          </span>
          <div>
            <div className="text-sm font-medium text-gray-900">{name || 'Pré-visualização'}</div>
            <div className="text-xs text-gray-500">{KIND_LABELS[kind]}</div>
          </div>
        </div>

        <Field label="Nome">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Restaurantes, Salário..."
          />
        </Field>

        <Field label="Ícone">
          <div className="grid grid-cols-8 gap-1.5 max-h-40 overflow-y-auto p-1 bg-gray-50 rounded-xl">
            {ICONS.map((iconName) => (
              <button
                key={iconName}
                type="button"
                onClick={() => setIcon(iconName)}
                className={`p-2 rounded-lg flex items-center justify-center ${
                  icon === iconName ? 'bg-white border-2 border-primary' : 'hover:bg-white border-2 border-transparent'
                }`}
              >
                <CategoryIcon name={iconName} color={color} size={16} />
              </button>
            ))}
          </div>
        </Field>

        <Field label="Cor">
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-lg border-2 transition-transform ${
                  color === c ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
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
