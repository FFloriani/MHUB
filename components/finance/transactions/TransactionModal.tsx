'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Paperclip, Trash2, ExternalLink } from 'lucide-react'
import Modal from '../shared/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useFinance } from '../FinanceContext'
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from '@/lib/data/finance/transactions'
import {
  deleteAttachment,
  getAttachmentUrl,
  listAttachments,
  uploadAttachment,
} from '@/lib/data/finance/attachments'
import {
  Attachment,
  FinanceKind,
  KIND_LABELS,
  PAYMENT_METHODS,
  Transaction,
} from '@/lib/data/finance/types'
import { isoToday, parseCurrency } from '../shared/format'
import CategoryIcon from '../shared/CategoryIcon'

interface TransactionModalProps {
  open: boolean
  onClose: () => void
  initial?: Transaction | null
  defaultKind?: FinanceKind
  onSaved?: () => void
}

export default function TransactionModal({
  open,
  onClose,
  initial,
  defaultKind,
  onSaved,
}: TransactionModalProps) {
  const { user, categories, refreshTransactions } = useFinance()

  const [kind, setKind] = useState<FinanceKind>(defaultKind ?? 'expense')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [occurredOn, setOccurredOn] = useState(isoToday())
  const [paymentMethod, setPaymentMethod] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [tagsInput, setTagsInput] = useState('')
  const [notes, setNotes] = useState('')
  const [paid, setPaid] = useState(true)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const isEdit = Boolean(initial)
  const isInstallmentChild = Boolean(initial?.installment_id)

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.kind === kind && !c.is_archived),
    [categories, kind],
  )

  useEffect(() => {
    if (!open) return
    if (initial) {
      setKind(initial.kind)
      setTitle(initial.title)
      setAmount(formatAmountInput(initial.amount))
      setOccurredOn(initial.occurred_on)
      setPaymentMethod(initial.payment_method ?? '')
      setCategoryId(initial.category_id ?? '')
      setTagsInput((initial.tags ?? []).join(', '))
      setNotes(initial.notes ?? '')
      setPaid(initial.paid)
    } else {
      setKind(defaultKind ?? 'expense')
      setTitle('')
      setAmount('')
      setOccurredOn(isoToday())
      setPaymentMethod('')
      setCategoryId('')
      setTagsInput('')
      setNotes('')
      setPaid(true)
    }
    setPendingFiles([])
    setError(null)
  }, [open, initial, defaultKind])

  useEffect(() => {
    if (!open || !initial) {
      setAttachments([])
      return
    }
    let active = true
    listAttachments(initial.id)
      .then((res) => {
        if (active) setAttachments(res)
      })
      .catch(console.error)
    return () => {
      active = false
    }
  }, [open, initial])

  useEffect(() => {
    if (!filteredCategories.find((c) => c.id === categoryId)) {
      setCategoryId(filteredCategories[0]?.id ?? '')
    }
  }, [filteredCategories, categoryId])

  async function handleSave() {
    setError(null)
    const numericAmount = parseCurrency(amount)
    if (!title.trim()) return setError('Informe um título')
    if (numericAmount <= 0) return setError('Valor precisa ser maior que zero')

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    setIsSaving(true)
    try {
      let saved: Transaction
      if (initial) {
        saved = await updateTransaction(initial.id, {
          kind,
          title: title.trim(),
          amount: numericAmount,
          occurred_on: occurredOn,
          payment_method: paymentMethod || null,
          category_id: categoryId || null,
          tags,
          notes: notes.trim() || null,
          paid,
        })
      } else {
        saved = await createTransaction({
          user_id: user.id,
          kind,
          title: title.trim(),
          amount: numericAmount,
          occurred_on: occurredOn,
          payment_method: paymentMethod || null,
          category_id: categoryId || null,
          tags,
          notes: notes.trim() || null,
          paid,
        })
      }

      if (pendingFiles.length > 0) {
        await Promise.all(pendingFiles.map((f) => uploadAttachment(user.id, saved.id, f)))
      }

      await refreshTransactions()
      onSaved?.()
      onClose()
    } catch (err) {
      console.error(err)
      setError('Erro ao salvar. Verifique sua conexão e tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!initial) return
    if (!confirm('Excluir este lançamento?')) return
    setIsDeleting(true)
    try {
      await deleteTransaction(initial.id)
      await refreshTransactions()
      onSaved?.()
      onClose()
    } catch (err) {
      console.error(err)
      setError('Erro ao excluir')
    } finally {
      setIsDeleting(false)
    }
  }

  async function openAttachment(att: Attachment) {
    const url = await getAttachmentUrl(att.storage_path)
    if (url) window.open(url, '_blank')
  }

  async function removeAttachment(att: Attachment) {
    if (!confirm(`Remover anexo "${att.file_name}"?`)) return
    try {
      await deleteAttachment(att)
      setAttachments((arr) => arr.filter((a) => a.id !== att.id))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar lançamento' : 'Novo lançamento'}
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
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : null}
            <span className={isSaving ? 'ml-1.5' : ''}>{isEdit ? 'Salvar' : 'Adicionar'}</span>
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {isInstallmentChild ? (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
            Esta é uma parcela de uma compra parcelada. Algumas alterações afetam apenas esta parcela.
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-2">
          {(['expense', 'income', 'investment'] as FinanceKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                kind === k
                  ? k === 'expense'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : k === 'income'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {KIND_LABELS[k]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Título">
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: iFood, Mercado Pão de Açúcar..."
            />
          </Field>
          <Field label="Valor">
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="R$ 0,00"
              inputMode="decimal"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Data">
            <Input type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
          </Field>
          <Field label="Forma de pagamento">
            <Select value={paymentMethod} onChange={(v) => setPaymentMethod(v)}>
              <option value="">—</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Categoria">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
            {filteredCategories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                  categoryId === c.id
                    ? 'bg-primary/5 border-primary/40 text-primary-dark'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${c.color}1a` }}
                >
                  <CategoryIcon name={c.icon} color={c.color} size={14} />
                </span>
                <span className="truncate">{c.name}</span>
              </button>
            ))}
            {filteredCategories.length === 0 ? (
              <div className="col-span-full text-xs text-gray-400 italic px-2">
                Nenhuma categoria nesta seção. Crie em &quot;Categorias&quot;.
              </div>
            ) : null}
          </div>
        </Field>

        <Field label="Tags (separadas por vírgula)">
          <Input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="viagem, presente, urgente..."
          />
        </Field>

        <Field label="Observações">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder-gray-500"
            placeholder="Detalhes, motivo da compra, vendedor..."
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={paid}
            onChange={(e) => setPaid(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          Já pago / efetivado
        </label>

        <Field label="Anexos">
          <div className="space-y-2">
            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50 cursor-pointer">
              <Paperclip size={14} />
              <span>Clique para anexar comprovantes (foto ou PDF)</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : []
                  setPendingFiles((prev) => [...prev, ...files])
                  e.target.value = ''
                }}
              />
            </label>

            {pendingFiles.length > 0 ? (
              <div className="text-xs text-gray-500">
                <span className="font-semibold">A enviar ao salvar:</span>
                <ul className="mt-1 space-y-0.5">
                  {pendingFiles.map((f, i) => (
                    <li key={i} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded">
                      <span className="truncate">{f.name}</span>
                      <button
                        onClick={() => setPendingFiles((arr) => arr.filter((_, j) => j !== i))}
                        className="text-red-500 hover:text-red-700 ml-2"
                        aria-label="Remover"
                      >
                        <Trash2 size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {attachments.length > 0 ? (
              <ul className="space-y-1">
                {attachments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between bg-gray-50 px-2 py-1.5 rounded text-xs">
                    <button
                      onClick={() => openAttachment(a)}
                      className="flex items-center gap-1.5 text-gray-700 hover:text-primary"
                    >
                      <ExternalLink size={12} />
                      <span className="truncate max-w-[18rem]">{a.file_name}</span>
                    </button>
                    <button
                      onClick={() => removeAttachment(a)}
                      className="text-red-500 hover:text-red-700"
                      aria-label="Remover anexo"
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
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

function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900"
    >
      {children}
    </select>
  )
}

function formatAmountInput(n: number): string {
  return n.toFixed(2).replace('.', ',')
}
