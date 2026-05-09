'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Apple,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useAuth } from '@/components/providers/AuthProvider'
import {
  MEAL_LABELS,
  MEAL_ORDER,
  createDietEntry,
  deleteDietEntry,
  listDietEntries,
  summarizeDay,
  updateDietEntry,
  type DietEntry,
  type DietMealType,
  ymd,
} from '@/lib/data/diet'

function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + delta)
  return ymd(dt)
}

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const emptyForm = {
  meal_type: 'breakfast' as DietMealType,
  name: '',
  quantity_text: '',
  calories: '',
  protein_g: '',
  carbs_g: '',
  fat_g: '',
  notes: '',
}

export default function DietPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [date, setDate] = useState(() => ymd(new Date()))
  const [entries, setEntries] = useState<DietEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DietEntry | null>(null)
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const list = await listDietEntries(user.id, date)
      setEntries(list)
    } catch (e) {
      console.error(e)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [user, date])

  useEffect(() => {
    if (!authLoading && !user) router.push('/')
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  const summary = useMemo(() => summarizeDay(entries), [entries])

  const grouped = useMemo(() => {
    const map = new Map<DietMealType, DietEntry[]>()
    for (const t of MEAL_ORDER) map.set(t, [])
    for (const e of entries) {
      const arr = map.get(e.meal_type) ?? []
      arr.push(e)
      map.set(e.meal_type, arr)
    }
    return map
  }, [entries])

  function openCreate(meal?: DietMealType) {
    setEditing(null)
    setForm({ ...emptyForm, meal_type: meal ?? 'breakfast' })
    setModalOpen(true)
  }

  function openEdit(entry: DietEntry) {
    setEditing(entry)
    setForm({
      meal_type: entry.meal_type,
      name: entry.name,
      quantity_text: entry.quantity_text ?? '',
      calories: entry.calories != null ? String(entry.calories) : '',
      protein_g: entry.protein_g != null ? String(entry.protein_g) : '',
      carbs_g: entry.carbs_g != null ? String(entry.carbs_g) : '',
      fat_g: entry.fat_g != null ? String(entry.fat_g) : '',
      notes: entry.notes ?? '',
    })
    setModalOpen(true)
  }

  function parseOptionalInt(s: string): number | null {
    const t = s.trim()
    if (!t) return null
    const n = Number(t)
    return Number.isFinite(n) ? Math.round(n) : null
  }

  function parseOptionalFloat(s: string): number | null {
    const t = s.trim()
    if (!t) return null
    const n = Number(t.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    try {
      const payload = {
        meal_type: form.meal_type,
        name: form.name,
        quantity_text: form.quantity_text.trim() || null,
        calories: parseOptionalInt(form.calories),
        protein_g: parseOptionalFloat(form.protein_g),
        carbs_g: parseOptionalFloat(form.carbs_g),
        fat_g: parseOptionalFloat(form.fat_g),
        notes: form.notes.trim() || null,
      }
      if (editing) {
        await updateDietEntry(user.id, editing.id, payload)
      } else {
        await createDietEntry(user.id, { logged_date: date, ...payload })
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      console.error(err)
      alert('Não foi possível salvar. Confira se a migração da dieta foi aplicada no Supabase.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!user || !confirm('Excluir este item?')) return
    try {
      await deleteDietEntry(user.id, id)
      await load()
    } catch (err) {
      console.error(err)
    }
  }

  if (authLoading) {
    return (
      <MainLayout>
        <div className="min-h-[50vh] flex items-center justify-center text-gray-500">Carregando…</div>
      </MainLayout>
    )
  }

  if (!user) return null

  const hasMacros =
    summary.calories > 0 || summary.protein_g > 0 || summary.carbs_g > 0 || summary.fat_g > 0

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 pb-24">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <UtensilsCrossed className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dieta</h1>
              <p className="text-sm text-gray-500">Registro do dia — refeições e macros (opcionais)</p>
            </div>
          </div>
        </header>

        <Card className="p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="p-2"
              onClick={() => setDate((d) => addDays(d, -1))}
              aria-label="Dia anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="p-2"
              onClick={() => setDate((d) => addDays(d, 1))}
              aria-label="Próximo dia"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setDate(ymd(new Date()))}>
              Hoje
            </Button>
          </div>
          <p className="text-sm text-gray-600 capitalize sm:text-right">{formatDisplayDate(date)}</p>
        </Card>

        {hasMacros ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <Card className="p-4 text-center border-emerald-100 bg-emerald-50/50">
              <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Calorias</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{summary.calories || '—'}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Proteína (g)</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {summary.protein_g > 0 ? summary.protein_g.toFixed(1) : '—'}
              </p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Carbo (g)</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {summary.carbs_g > 0 ? summary.carbs_g.toFixed(1) : '—'}
              </p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gordura (g)</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {summary.fat_g > 0 ? summary.fat_g.toFixed(1) : '—'}
              </p>
            </Card>
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {MEAL_ORDER.map((meal) => {
              const items = grouped.get(meal) ?? []
              return (
                <section key={meal}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Apple className="w-5 h-5 text-emerald-600" />
                      {MEAL_LABELS[meal]}
                    </h2>
                    <Button type="button" size="sm" variant="secondary" onClick={() => openCreate(meal)}>
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 px-4 rounded-xl bg-gray-50 border border-dashed border-gray-200">
                      Nada registrado nesta refeição.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {items.map((item) => (
                        <li key={item.id}>
                          <Card className="p-4 flex flex-col sm:flex-row sm:items-start gap-3 justify-between group">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900">{item.name}</p>
                              {item.quantity_text ? (
                                <p className="text-sm text-gray-500 mt-0.5">{item.quantity_text}</p>
                              ) : null}
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-600">
                                {item.calories != null ? <span>{item.calories} kcal</span> : null}
                                {item.protein_g != null ? <span>P {item.protein_g}g</span> : null}
                                {item.carbs_g != null ? <span>C {item.carbs_g}g</span> : null}
                                {item.fat_g != null ? <span>G {item.fat_g}g</span> : null}
                              </div>
                              {item.notes ? (
                                <p className="text-sm text-gray-500 mt-2 border-l-2 border-emerald-200 pl-2">
                                  {item.notes}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex gap-1 shrink-0 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-gray-600"
                                onClick={() => openEdit(item)}
                                aria-label="Editar"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-red-600"
                                onClick={() => handleDelete(item.id)}
                                aria-label="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </Card>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        )}

        {modalOpen ? (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
            <Card className="w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{editing ? 'Editar item' : 'Novo item'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Refeição</label>
                  <select
                    value={form.meal_type}
                    onChange={(e) => setForm((f) => ({ ...f, meal_type: e.target.value as DietMealType }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white text-gray-900"
                  >
                    {MEAL_ORDER.map((m) => (
                      <option key={m} value={m}>
                        {MEAL_LABELS[m]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Alimento / descrição</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ex.: Aveia com banana"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Quantidade (texto livre)</label>
                  <Input
                    value={form.quantity_text}
                    onChange={(e) => setForm((f) => ({ ...f, quantity_text: e.target.value }))}
                    placeholder="Ex.: 80g, 1 xícara"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">kcal</label>
                    <Input
                      type="number"
                      min={0}
                      value={form.calories}
                      onChange={(e) => setForm((f) => ({ ...f, calories: e.target.value }))}
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Proteína (g)</label>
                    <Input
                      inputMode="decimal"
                      value={form.protein_g}
                      onChange={(e) => setForm((f) => ({ ...f, protein_g: e.target.value }))}
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Carbo (g)</label>
                    <Input
                      inputMode="decimal"
                      value={form.carbs_g}
                      onChange={(e) => setForm((f) => ({ ...f, carbs_g: e.target.value }))}
                      placeholder="—"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Gordura (g)</label>
                    <Input
                      inputMode="decimal"
                      value={form.fat_g}
                      onChange={(e) => setForm((f) => ({ ...f, fat_g: e.target.value }))}
                      placeholder="—"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
                  <Input
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Opcional"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving || !form.name.trim()}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'Salvar' : 'Adicionar'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        ) : null}
      </div>
    </MainLayout>
  )
}
