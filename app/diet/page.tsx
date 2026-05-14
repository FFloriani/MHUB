'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addDays, startOfWeek } from 'date-fns'
import {
  Apple,
  ChevronLeft,
  ChevronRight,
  Clock,
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
  allEntriesFromDay,
  addRecurringSkip,
  createDietEntry,
  createMealSlot,
  deleteDietEntry,
  deleteMealSlot,
  entryRecurrenceDaysForStorage,
  fetchDietEntryCountsInRange,
  findOrCreateMatchingMealSlot,
  formatMealTimeLabel,
  formatRecurrenceDaysLabel,
  inputTimeToPg,
  isoDatesInWeekForWeekdays,
  listRecurringSkipsForDate,
  loadDietDay,
  mealTimeToInput,
  normalizeRecurrenceDays,
  removeRecurringSkip,
  summarizeDay,
  updateDietEntry,
  updateMealSlot,
  type DietDayMeal,
  type DietEntry,
  type RecurringSkipRow,
  ymd,
} from '@/lib/data/diet'
import { cn } from '@/lib/utils'

const WEEK_STARTS_ON = 0 as const
const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function localDateFromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDaysIso(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + delta)
  return ymd(dt)
}

function formatDisplayDate(iso: string): string {
  return localDateFromIso(iso).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const emptyItemForm = {
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
  const [meals, setMeals] = useState<DietDayMeal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [weekCounts, setWeekCounts] = useState<Record<string, number>>({})
  const [hiddenSkips, setHiddenSkips] = useState<RecurringSkipRow[]>([])

  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<DietEntry | null>(null)
  const [itemForm, setItemForm] = useState(emptyItemForm)
  /** Só para refeição recorrente: alimento extra só no dia visualizado. */
  const [itemOnlyThisDay, setItemOnlyThisDay] = useState(false)
  /** Só para item modelo em refeição recorrente: dias em que o alimento entra (subset dos dias da refeição). */
  const [itemEntryWeekdayMask, setItemEntryWeekdayMask] = useState<number[]>([])
  /** 0=Dom … 6=Sáb — novo item em refeição pontual: em quais dias da semana criar na mesma semana. */
  const [repeatWeekdayMask, setRepeatWeekdayMask] = useState<number[]>([])

  const [newMealOpen, setNewMealOpen] = useState(false)
  const [newMealTitle, setNewMealTitle] = useState('')
  const [newMealTime, setNewMealTime] = useState('')
  /** true = refeição só na data do topo; false = marcar dias da semana (recorrente). */
  const [newMealOneOffOnly, setNewMealOneOffOnly] = useState(false)
  const [newMealRecurrenceMask, setNewMealRecurrenceMask] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])

  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [editMealTitle, setEditMealTitle] = useState('')
  const [editMealTime, setEditMealTime] = useState('')
  /** Refeição recorrente em edição: máscara de dias (0=Dom … 6=Sáb). */
  const [editMealRecurrenceMask, setEditMealRecurrenceMask] = useState<number[]>([])
  const [editMealIsRecurring, setEditMealIsRecurring] = useState(false)
  const weekSelectedBtnRef = useRef<HTMLButtonElement>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const selected = localDateFromIso(date)
      const weekStart = startOfWeek(selected, { weekStartsOn: WEEK_STARTS_ON })
      const from = ymd(weekStart)
      const to = ymd(addDays(weekStart, 6))

      const [dayMeals, counts, skips] = await Promise.all([
        loadDietDay(user.id, date),
        fetchDietEntryCountsInRange(user.id, from, to),
        listRecurringSkipsForDate(user.id, date),
      ])
      setMeals(dayMeals)
      setWeekCounts(counts)
      setHiddenSkips(skips)
    } catch (e) {
      console.error(e)
      setMeals([])
      setWeekCounts({})
      setHiddenSkips([])
    } finally {
      setLoading(false)
    }
  }, [user, date])

  const weekDays = useMemo(() => {
    const selected = localDateFromIso(date)
    const weekStart = startOfWeek(selected, { weekStartsOn: WEEK_STARTS_ON })
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i)
      const iso = ymd(d)
      const dow = d.getDay()
      return {
        iso,
        label: WEEKDAY_LABELS[dow],
        dayNum: d.getDate(),
        count: weekCounts[iso] ?? 0,
      }
    })
  }, [date, weekCounts])

  useEffect(() => {
    if (!authLoading && !user) router.push('/')
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  useEffect(() => {
    weekSelectedBtnRef.current?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: 'smooth',
    })
  }, [date])

  const allEntries = useMemo(() => allEntriesFromDay(meals), [meals])
  const summary = useMemo(() => summarizeDay(allEntries), [allEntries])
  const activeSlotForModal = useMemo(() => meals.find((m) => m.id === activeSlotId) ?? null, [meals, activeSlotId])
  const activeSlotRecurrenceNorm = useMemo(
    () => normalizeRecurrenceDays(activeSlotForModal?.recurrence_days) ?? [],
    [activeSlotForModal?.recurrence_days],
  )
  const showItemDayToggles = useMemo(() => {
    if (!activeSlotRecurrenceNorm.length) return false
    if (!editingEntry && itemOnlyThisDay) return false
    if (editingEntry && editingEntry.logged_date != null && editingEntry.logged_date !== '') return false
    return true
  }, [activeSlotRecurrenceNorm, editingEntry, itemOnlyThisDay])

  function openCreateItem(slotId: string) {
    setEditingEntry(null)
    setActiveSlotId(slotId)
    setItemForm({ ...emptyItemForm })
    setItemOnlyThisDay(false)
    setRepeatWeekdayMask([localDateFromIso(date).getDay()])
    const meal = meals.find((m) => m.id === slotId)
    const rd = normalizeRecurrenceDays(meal?.recurrence_days)
    if (rd?.length) {
      setItemEntryWeekdayMask([...rd])
    } else {
      setItemEntryWeekdayMask([])
    }
    setItemModalOpen(true)
  }

  function toggleItemEntryWeekday(w: number) {
    setItemEntryWeekdayMask((prev) => {
      const meal = meals.find((m) => m.id === activeSlotId)
      const allowed = normalizeRecurrenceDays(meal?.recurrence_days) ?? []
      if (!allowed.includes(w)) return prev
      const base = prev.length > 0 ? prev : [...allowed]
      const set = new Set(base)
      if (set.has(w)) {
        if (set.size <= 1) return Array.from(set).sort((a, b) => a - b)
        set.delete(w)
      } else {
        set.add(w)
      }
      return Array.from(set).sort((a, b) => a - b)
    })
  }

  function toggleRepeatWeekday(w: number) {
    setRepeatWeekdayMask((prev) => {
      const set = new Set(prev.length > 0 ? prev : [localDateFromIso(date).getDay()])
      if (set.has(w)) {
        if (set.size <= 1) return Array.from(set).sort((a, b) => a - b)
        set.delete(w)
      } else {
        set.add(w)
      }
      return Array.from(set).sort((a, b) => a - b)
    })
  }

  function openEditItem(entry: DietEntry) {
    setEditingEntry(entry)
    setActiveSlotId(entry.meal_slot_id)
    setItemForm({
      name: entry.name,
      quantity_text: entry.quantity_text ?? '',
      calories: entry.calories != null ? String(entry.calories) : '',
      protein_g: entry.protein_g != null ? String(entry.protein_g) : '',
      carbs_g: entry.carbs_g != null ? String(entry.carbs_g) : '',
      fat_g: entry.fat_g != null ? String(entry.fat_g) : '',
      notes: entry.notes ?? '',
    })
    const meal = meals.find((m) => m.id === entry.meal_slot_id)
    const slotDays = normalizeRecurrenceDays(meal?.recurrence_days)
    const isTemplate = entry.logged_date == null || entry.logged_date === ''
    if (slotDays?.length && isTemplate) {
      const er = normalizeRecurrenceDays(entry.recurrence_days)
      setItemEntryWeekdayMask(er ? [...er] : [...slotDays])
    } else {
      setItemEntryWeekdayMask([])
    }
    setItemOnlyThisDay(false)
    setRepeatWeekdayMask([])
    setItemModalOpen(true)
  }

  function closeItemModal() {
    setItemModalOpen(false)
    setItemOnlyThisDay(false)
    setRepeatWeekdayMask([localDateFromIso(date).getDay()])
    setItemEntryWeekdayMask([])
  }

  function startEditMeal(m: DietDayMeal) {
    setEditingMealId(m.id)
    setEditMealTitle(m.title)
    setEditMealTime(mealTimeToInput(m.meal_time))
    const rd = normalizeRecurrenceDays(m.recurrence_days)
    const isRec = Boolean(rd?.length)
    setEditMealIsRecurring(isRec)
    setEditMealRecurrenceMask(isRec && rd ? [...rd] : [])
  }

  function cancelEditMeal() {
    setEditingMealId(null)
    setEditMealTitle('')
    setEditMealTime('')
    setEditMealIsRecurring(false)
    setEditMealRecurrenceMask([])
  }

  function toggleEditMealWeekday(w: number) {
    setEditMealRecurrenceMask((prev) => {
      const set = new Set(prev.length > 0 ? prev : [0, 1, 2, 3, 4, 5, 6])
      if (set.has(w)) {
        if (set.size <= 1) return Array.from(set).sort((a, b) => a - b)
        set.delete(w)
      } else {
        set.add(w)
      }
      return Array.from(set).sort((a, b) => a - b)
    })
  }

  async function saveEditMeal(slotId: string) {
    if (!user) return
    const title = editMealTitle.trim()
    if (!title) return
    setSaving(true)
    try {
      const patch: Parameters<typeof updateMealSlot>[2] = {
        title,
        meal_time: inputTimeToPg(editMealTime),
      }
      if (editMealIsRecurring) {
        const rec = normalizeRecurrenceDays(editMealRecurrenceMask)
        if (!rec?.length) {
          alert('Selecione pelo menos um dia da semana para esta refeição recorrente.')
          return
        }
        patch.recurrence_days = rec
      }
      await updateMealSlot(user.id, slotId, patch)
      cancelEditMeal()
      await load()
    } catch (err) {
      console.error(err)
      alert('Não foi possível salvar a refeição.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteMeal(slotId: string) {
    if (!user || !confirm('Remover esta refeição e todos os alimentos dela?')) return
    try {
      await deleteMealSlot(user.id, slotId)
      await load()
    } catch (err) {
      console.error(err)
    }
  }

  function toggleNewMealWeekday(w: number) {
    setNewMealRecurrenceMask((prev) => {
      const set = new Set(prev.length > 0 ? prev : [0, 1, 2, 3, 4, 5, 6])
      if (set.has(w)) {
        if (set.size <= 1) return Array.from(set).sort((a, b) => a - b)
        set.delete(w)
      } else {
        set.add(w)
      }
      return Array.from(set).sort((a, b) => a - b)
    })
  }

  async function handleSkipRecurringDay(slotId: string) {
    if (!user) return
    if (
      !confirm(
        'Ocultar esta refeição recorrente só neste dia? Você pode restaurar abaixo ou usar outra refeição pontual.',
      )
    )
      return
    try {
      await addRecurringSkip(user.id, slotId, date)
      await load()
    } catch (e) {
      console.error(e)
      alert('Não foi possível ocultar.')
    }
  }

  async function handleRestoreSkip(mealSlotId: string) {
    if (!user) return
    try {
      await removeRecurringSkip(user.id, mealSlotId, date)
      await load()
    } catch (e) {
      console.error(e)
    }
  }

  async function handleCreateMeal(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    const title = newMealTitle.trim()
    if (!title) return
    setSaving(true)
    try {
      if (newMealOneOffOnly) {
        await createMealSlot(user.id, {
          logged_date: date,
          title,
          meal_time: inputTimeToPg(newMealTime),
        })
      } else {
        const mask =
          newMealRecurrenceMask.length > 0 ? newMealRecurrenceMask : [localDateFromIso(date).getDay()]
        await createMealSlot(user.id, {
          recurrence_days: mask,
          title,
          meal_time: inputTimeToPg(newMealTime),
        })
      }
      setNewMealOpen(false)
      setNewMealTitle('')
      setNewMealTime('')
      setNewMealOneOffOnly(false)
      setNewMealRecurrenceMask([0, 1, 2, 3, 4, 5, 6])
      await load()
    } catch (err) {
      console.error(err)
      alert('Não foi possível criar a refeição. Rode a migração 20260515_diet_meal_recurrence no Supabase.')
    } finally {
      setSaving(false)
    }
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

  async function handleItemSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!user || !activeSlotId) return
    setSaving(true)
    try {
      const payload = {
        name: itemForm.name,
        quantity_text: itemForm.quantity_text.trim() || null,
        calories: parseOptionalInt(itemForm.calories),
        protein_g: parseOptionalFloat(itemForm.protein_g),
        carbs_g: parseOptionalFloat(itemForm.carbs_g),
        fat_g: parseOptionalFloat(itemForm.fat_g),
        notes: itemForm.notes.trim() || null,
      }
      if (editingEntry) {
        const patch: Parameters<typeof updateDietEntry>[2] = { ...payload }
        const meal = meals.find((m) => m.id === editingEntry.meal_slot_id)
        const mealRec = normalizeRecurrenceDays(meal?.recurrence_days) ?? []
        if (
          mealRec.length > 0 &&
          (editingEntry.logged_date == null || editingEntry.logged_date === '')
        ) {
          try {
            const mask =
              itemEntryWeekdayMask.length > 0 ? itemEntryWeekdayMask : [...mealRec]
            patch.recurrence_days = entryRecurrenceDaysForStorage(meal?.recurrence_days, mask)
          } catch (e) {
            alert(e instanceof Error ? e.message : 'Dias inválidos')
            return
          }
        }
        await updateDietEntry(user.id, editingEntry.id, patch)
      } else {
        const templateMeal = meals.find((m) => m.id === activeSlotId)
        if (!templateMeal) {
          alert('Refeição não encontrada. Recarregue a página.')
          return
        }

        const recurring = Boolean(normalizeRecurrenceDays(templateMeal.recurrence_days)?.length)
        if (recurring) {
          let recurrence_days: number[] | null | undefined = undefined
          const tplRec = normalizeRecurrenceDays(templateMeal.recurrence_days)
          if (!itemOnlyThisDay && tplRec?.length) {
            try {
              const mask =
                itemEntryWeekdayMask.length > 0 ? itemEntryWeekdayMask : [...tplRec]
              recurrence_days = entryRecurrenceDaysForStorage(templateMeal.recurrence_days, mask)
            } catch (e) {
              alert(e instanceof Error ? e.message : 'Dias inválidos')
              return
            }
          }
          await createDietEntry(user.id, {
            logged_date: itemOnlyThisDay ? date : null,
            meal_slot_id: activeSlotId,
            ...payload,
            ...(recurrence_days !== undefined ? { recurrence_days } : {}),
          })
        } else {
          const weekdays =
            repeatWeekdayMask.length > 0 ? repeatWeekdayMask : [localDateFromIso(date).getDay()]
          const targetDates = isoDatesInWeekForWeekdays(date, weekdays)
          await Promise.all(
            targetDates.map(async (iso) => {
              const slot = await findOrCreateMatchingMealSlot(user.id, iso, {
                title: templateMeal.title,
                meal_time: templateMeal.meal_time,
                sort_order: templateMeal.sort_order,
              })
              await createDietEntry(user.id, {
                logged_date: iso,
                meal_slot_id: slot.id,
                ...payload,
              })
            }),
          )
        }
      }
      closeItemModal()
      await load()
    } catch (err) {
      console.error(err)
      alert('Não foi possível salvar o item.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteItem(id: string) {
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
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <UtensilsCrossed className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dieta</h1>
              <p className="text-sm text-gray-500">
                <strong className="font-medium text-gray-700">Nova refeição</strong>: escolha se é{' '}
                <strong>só neste dia</strong> ou <strong>recorrente</strong> (dias da semana, como na agenda). Itens na
                refeição recorrente valem em todos esses dias; use “Só neste dia” no alimento ou “Ocultar neste dia” na
                refeição se quiser exceção.
              </p>
            </div>
          </div>
        </header>

        <Card className="p-4 mb-6 space-y-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="p-2 shrink-0"
              onClick={() => setDate((d) => addDaysIso(d, -7))}
              aria-label="Semana anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0 overflow-x-auto pb-1 -mx-0.5 px-0.5">
              <div className="grid grid-cols-7 gap-1 min-w-[280px] sm:min-w-0">
              {weekDays.map((day) => {
                const isSelected = day.iso === date
                return (
                  <button
                    key={day.iso}
                    ref={isSelected ? weekSelectedBtnRef : undefined}
                    type="button"
                    onClick={() => setDate(day.iso)}
                    className={cn(
                      'flex flex-col items-center rounded-xl py-2 px-0.5 transition-all border min-w-[2.65rem] sm:min-w-0',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 shadow-sm ring-1 ring-emerald-500/30'
                        : 'border-transparent bg-gray-50/80 hover:bg-gray-100',
                      day.iso === ymd(new Date()) && !isSelected && 'ring-1 ring-amber-300 ring-inset',
                    )}
                  >
                    <span className="text-[10px] font-semibold text-gray-500 uppercase">{day.label}</span>
                    <span className="text-base font-bold text-gray-900">{day.dayNum}</span>
                    {day.count > 0 ? (
                      <span
                        className="mt-1 w-2 h-2 rounded-full bg-emerald-500"
                        title={`${day.count} item(ns)`}
                      />
                    ) : (
                      <span className="h-2 mt-1" aria-hidden />
                    )}
                  </button>
                )
              })}
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="p-2 shrink-0"
              onClick={() => setDate((d) => addDaysIso(d, 7))}
              aria-label="Próxima semana"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 pt-1 border-t border-gray-100">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="p-2"
                onClick={() => setDate((d) => addDaysIso(d, -1))}
                aria-label="Dia anterior"
              >
                <ChevronLeft className="w-4 h-4" />
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
                onClick={() => setDate((d) => addDaysIso(d, 1))}
                aria-label="Próximo dia"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setDate(ymd(new Date()))}>
                Hoje
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              className="inline-flex items-center gap-2 w-fit bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => {
                setNewMealOneOffOnly(false)
                setNewMealRecurrenceMask([0, 1, 2, 3, 4, 5, 6])
                setNewMealOpen(true)
              }}
            >
              <Plus className="w-4 h-4" />
              Nova refeição
            </Button>
            <p className="text-sm text-gray-600 capitalize sm:ml-auto">{formatDisplayDate(date)}</p>
          </div>
        </Card>

        {hiddenSkips.length > 0 ? (
          <Card className="p-4 mb-6 border-amber-200 bg-amber-50/80">
            <p className="text-sm font-medium text-amber-900 mb-2">Refeições recorrentes ocultas neste dia</p>
            <ul className="flex flex-wrap gap-2">
              {hiddenSkips.map((s) => (
                <li key={s.meal_slot_id}>
                  <Button type="button" size="sm" variant="secondary" onClick={() => void handleRestoreSkip(s.meal_slot_id)}>
                    Restaurar “{s.title}”
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

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
        ) : meals.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            <p className="mb-4">Nenhuma refeição neste dia.</p>
            <Button
              type="button"
              onClick={() => {
                setNewMealOneOffOnly(false)
                setNewMealRecurrenceMask([0, 1, 2, 3, 4, 5, 6])
                setNewMealOpen(true)
              }}
              className="bg-emerald-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar primeira refeição
            </Button>
          </Card>
        ) : (
          <div className="space-y-8">
            {meals.map((meal) => (
              <section key={meal.id}>
                <Card className="overflow-hidden border-emerald-100/80">
                  <div className="px-4 py-3 bg-gradient-to-r from-emerald-50/90 to-white border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {editingMealId === meal.id ? (
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 flex-1 w-full min-w-0">
                        <div className="flex flex-col gap-2 flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                            <div className="flex-1">
                              <label className="text-xs text-gray-500">Nome</label>
                              <Input
                                value={editMealTitle}
                                onChange={(e) => setEditMealTitle(e.target.value)}
                                className="mt-0.5"
                              />
                            </div>
                            <div className="w-full sm:w-32">
                              <label className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Hora
                              </label>
                              <input
                                type="time"
                                value={editMealTime}
                                onChange={(e) => setEditMealTime(e.target.value)}
                                className="mt-0.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                              />
                            </div>
                          </div>
                          {editMealIsRecurring ? (
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 space-y-2 w-full">
                              <p className="text-xs font-semibold text-emerald-900">Dias da refeição (repetir toda semana)</p>
                              <p className="text-xs text-emerald-800/90">
                                Inclua <strong>Dom</strong> aqui se quiser que a refeição e os alimentos também vão para domingo.
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {WEEKDAY_LABELS.map((label, w) => {
                                  const on = editMealRecurrenceMask.includes(w)
                                  return (
                                    <button
                                      key={label}
                                      type="button"
                                      onClick={() => toggleEditMealWeekday(w)}
                                      className={cn(
                                        'rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors min-w-[2.5rem]',
                                        on
                                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                                      )}
                                    >
                                      {label}
                                    </button>
                                  )
                                })}
                              </div>
                              <div className="flex flex-wrap gap-3 pt-0.5">
                                <button
                                  type="button"
                                  className="text-xs font-medium text-emerald-800 underline decoration-emerald-400"
                                  onClick={() => setEditMealRecurrenceMask([0, 1, 2, 3, 4, 5, 6])}
                                >
                                  Toda a semana
                                </button>
                                <button
                                  type="button"
                                  className="text-xs font-medium text-emerald-800 underline decoration-emerald-400"
                                  onClick={() => setEditMealRecurrenceMask([1, 2, 3, 4, 5])}
                                >
                                  Seg–Sex
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button type="button" size="sm" variant="secondary" onClick={cancelEditMeal}>
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={saving || !editMealTitle.trim()}
                            onClick={() => void saveEditMeal(meal.id)}
                          >
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <Apple className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <h2 className="text-lg font-semibold text-gray-900">{meal.title}</h2>
                          {meal.meal_time ? (
                            <p className="text-sm text-emerald-700 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3.5 h-3.5" />
                              {formatMealTimeLabel(meal.meal_time)}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400 mt-0.5">Sem horário definido</p>
                          )}
                          {formatRecurrenceDaysLabel(meal.recurrence_days) ? (
                            <span className="inline-flex mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md w-fit">
                              {formatRecurrenceDaysLabel(meal.recurrence_days)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    )}
                    {editingMealId !== meal.id ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-gray-600 gap-1"
                          onClick={() => startEditMeal(meal)}
                          title="Editar nome, horário e dias da refeição"
                        >
                          <Pencil className="w-4 h-4" />
                          <span className="hidden sm:inline text-xs">Editar</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-red-600 gap-1"
                          onClick={() => void handleDeleteMeal(meal.id)}
                          title="Remover esta refeição e todos os alimentos"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline text-xs">Remover</span>
                        </Button>
                        {meal.recurrence_days?.length ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-amber-800 gap-1"
                            onClick={() => void handleSkipRecurringDay(meal.id)}
                            title="Não mostrar esta refeição recorrente só neste dia"
                          >
                            Ocultar hoje
                          </Button>
                        ) : null}
                        <Button type="button" size="sm" variant="secondary" onClick={() => openCreateItem(meal.id)}>
                          <Plus className="w-4 h-4 mr-1" />
                          Alimento
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <div className="p-4">
                    {meal.entries.length === 0 ? (
                      <p className="text-sm text-gray-400 py-2">Nenhum alimento — use &quot;Alimento&quot;.</p>
                    ) : (
                      <ul className="space-y-2">
                        {meal.entries.map((item) => (
                          <li key={item.id}>
                            <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between group rounded-xl border border-gray-100 p-3 hover:bg-gray-50/80">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-900">{item.name}</p>
                                {item.logged_date == null && formatRecurrenceDaysLabel(item.recurrence_days) ? (
                                  <span className="inline-flex mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-900 bg-teal-100/90 px-1.5 py-0.5 rounded w-fit">
                                    {formatRecurrenceDaysLabel(item.recurrence_days)}
                                  </span>
                                ) : null}
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
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditItem(item)}
                                  aria-label="Editar"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600"
                                  onClick={() => void handleDeleteItem(item.id)}
                                  aria-label="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Card>
              </section>
            ))}
          </div>
        )}

        {newMealOpen ? (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
            <Card className="w-full max-w-md p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Nova refeição</h3>
              <form onSubmit={handleCreateMeal} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
                  <Input
                    value={newMealTitle}
                    onChange={(e) => setNewMealTitle(e.target.value)}
                    placeholder="Ex.: Café da manhã, Pré-treino"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Horário (opcional)
                  </label>
                  <input
                    type="time"
                    value={newMealTime}
                    onChange={(e) => setNewMealTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Quando vale</label>
                  <div className="flex flex-wrap gap-3 mb-3">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        className="rounded border-gray-300"
                        checked={!newMealOneOffOnly}
                        onChange={() => setNewMealOneOffOnly(false)}
                      />
                      Nos dias da semana (repetir toda semana)
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        className="rounded border-gray-300"
                        checked={newMealOneOffOnly}
                        onChange={() => setNewMealOneOffOnly(true)}
                      />
                      Só em {formatDisplayDate(date).split(',')[0] ?? 'este dia'}
                    </label>
                  </div>
                  {!newMealOneOffOnly ? (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 space-y-2">
                      <p className="text-xs text-emerald-900">Marque os dias (igual tarefas da agenda)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {WEEKDAY_LABELS.map((label, w) => {
                          const on = newMealRecurrenceMask.includes(w)
                          return (
                            <button
                              key={label}
                              type="button"
                              onClick={() => toggleNewMealWeekday(w)}
                              className={cn(
                                'rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors min-w-[2.5rem]',
                                on
                                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                              )}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                      <div className="flex flex-wrap gap-3 pt-1">
                        <button
                          type="button"
                          className="text-xs font-medium text-emerald-800 underline"
                          onClick={() => setNewMealRecurrenceMask([0, 1, 2, 3, 4, 5, 6])}
                        >
                          Toda a semana
                        </button>
                        <button
                          type="button"
                          className="text-xs font-medium text-emerald-800 underline"
                          onClick={() => setNewMealRecurrenceMask([1, 2, 3, 4, 5])}
                        >
                          Seg–Sex
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setNewMealOpen(false)
                      setNewMealTitle('')
                      setNewMealTime('')
                      setNewMealOneOffOnly(false)
                      setNewMealRecurrenceMask([0, 1, 2, 3, 4, 5, 6])
                    }}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving || !newMealTitle.trim()}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        ) : null}

        {itemModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
            <Card className="w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {editingEntry ? 'Editar alimento' : 'Novo alimento'}
              </h3>
              {activeSlotForModal ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-700 space-y-1.5 mb-4">
                  <p>
                    <span className="font-semibold text-gray-900">Dias da refeição: </span>
                    {formatRecurrenceDaysLabel(activeSlotForModal.recurrence_days) ??
                      (activeSlotForModal.logged_date
                        ? `só ${activeSlotForModal.logged_date}`
                        : '—')}
                  </p>
                  {activeSlotRecurrenceNorm.length ? (
                    editingEntry?.logged_date ? (
                      <p className="text-gray-600">
                        Este item é <strong>só neste dia</strong> ({editingEntry.logged_date}). O modelo da refeição nos
                        outros dias não muda.
                      </p>
                    ) : (
                      <p className="text-gray-600">
                        Use os botões abaixo para marcar em quais dias este alimento entra na refeição.
                      </p>
                    )
                  ) : null}
                </div>
              ) : null}
              {showItemDayToggles && activeSlotForModal ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 space-y-2 mb-4">
                  <p className="text-xs font-semibold text-emerald-900">Dias deste alimento</p>
                  <p className="text-xs text-emerald-800/80 leading-relaxed">
                    Toque no dia para ligar ou desligar. Só entram os dias em que a refeição já vale.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAY_LABELS.map((label, w) => {
                      if (!activeSlotRecurrenceNorm.includes(w)) return null
                      const on = itemEntryWeekdayMask.includes(w)
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => toggleItemEntryWeekday(w)}
                          className={cn(
                            'rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors min-w-[2.5rem]',
                            on
                              ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                          )}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      type="button"
                      className="text-xs font-medium text-emerald-800 underline decoration-emerald-400 hover:text-emerald-950"
                      onClick={() =>
                        setItemEntryWeekdayMask([...activeSlotRecurrenceNorm])
                      }
                    >
                      Todos os dias da refeição
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-emerald-800 underline decoration-emerald-400 hover:text-emerald-950"
                      onClick={() => {
                        const dow = localDateFromIso(date).getDay()
                        const rd = activeSlotRecurrenceNorm
                        const pick = rd.includes(dow) ? dow : rd[0]
                        if (pick !== undefined) setItemEntryWeekdayMask([pick])
                      }}
                    >
                      Só um dia
                    </button>
                  </div>
                </div>
              ) : null}
              <form onSubmit={handleItemSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Alimento / descrição</label>
                  <Input
                    value={itemForm.name}
                    onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Quantidade (texto)</label>
                  <Input
                    value={itemForm.quantity_text}
                    onChange={(e) => setItemForm((f) => ({ ...f, quantity_text: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">kcal</label>
                    <Input
                      type="number"
                      min={0}
                      value={itemForm.calories}
                      onChange={(e) => setItemForm((f) => ({ ...f, calories: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Proteína (g)</label>
                    <Input
                      inputMode="decimal"
                      value={itemForm.protein_g}
                      onChange={(e) => setItemForm((f) => ({ ...f, protein_g: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Carbo (g)</label>
                    <Input
                      inputMode="decimal"
                      value={itemForm.carbs_g}
                      onChange={(e) => setItemForm((f) => ({ ...f, carbs_g: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Gordura (g)</label>
                    <Input
                      inputMode="decimal"
                      value={itemForm.fat_g}
                      onChange={(e) => setItemForm((f) => ({ ...f, fat_g: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Observações</label>
                  <Input
                    value={itemForm.notes}
                    onChange={(e) => setItemForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
                {!editingEntry && activeSlotRecurrenceNorm.length ? (
                  <label className="flex items-start gap-2 text-sm cursor-pointer rounded-lg border border-gray-200 p-3 bg-gray-50/80">
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-gray-300"
                      checked={itemOnlyThisDay}
                      onChange={(e) => setItemOnlyThisDay(e.target.checked)}
                    />
                    <span>
                      <span className="font-medium text-gray-800">Só neste dia</span>
                      <span className="block text-xs text-gray-500 mt-0.5">
                        Marca o alimento só em {WEEKDAY_LABELS[localDateFromIso(date).getDay()]} (
                        {date}); os outros dias da semana continuam com a lista padrão da refeição.
                      </span>
                    </span>
                  </label>
                ) : null}
                {!editingEntry && !activeSlotRecurrenceNorm.length ? (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 space-y-2">
                    <p className="text-xs font-semibold text-emerald-900">Repetir nesta semana</p>
                    <p className="text-xs text-emerald-800/80 leading-relaxed">
                      Marque os dias em que este alimento também deve aparecer. Se aquele dia ainda não tiver esta
                      refeição pontual, ela é criada automaticamente.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAY_LABELS.map((label, w) => {
                        const mask =
                          repeatWeekdayMask.length > 0
                            ? repeatWeekdayMask
                            : [localDateFromIso(date).getDay()]
                        const on = mask.includes(w)
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => toggleRepeatWeekday(w)}
                            className={cn(
                              'rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors min-w-[2.5rem]',
                              on
                                ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                            )}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                    <div className="flex flex-wrap gap-3 pt-1">
                      <button
                        type="button"
                        className="text-xs font-medium text-emerald-800 underline decoration-emerald-400 hover:text-emerald-950"
                        onClick={() => setRepeatWeekdayMask([0, 1, 2, 3, 4, 5, 6])}
                      >
                        Toda a semana
                      </button>
                      <button
                        type="button"
                        className="text-xs font-medium text-emerald-800 underline decoration-emerald-400 hover:text-emerald-950"
                        onClick={() => setRepeatWeekdayMask([localDateFromIso(date).getDay()])}
                      >
                        Só {WEEKDAY_LABELS[localDateFromIso(date).getDay()]}
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="secondary" onClick={closeItemModal} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving || !itemForm.name.trim()}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingEntry ? 'Salvar' : 'Adicionar'}
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
