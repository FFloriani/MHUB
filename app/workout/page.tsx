'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Dumbbell,
    Plus,
    Trash2,
    Edit3,
    ChevronDown,
    ChevronUp,
    Loader2,
    Sparkles,
    Calendar,
    ArrowRight,
    GripVertical,
    Check,
    X,
    Info,
    Palette
} from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useAuth } from '@/components/providers/AuthProvider'
import {
    getActiveWorkoutPlan,
    getWorkoutDays,
    createPlanFromTemplate,
    updateExercise,
    addExercise,
    deleteExercise,
    updateWorkoutDay,
    formatWorkoutDescription,
    deleteWorkoutPlan,
    MUSCLE_GROUPS,
    EXERCISE_SUGGESTIONS,
    type WorkoutPlan,
    type WorkoutDay,
    type WorkoutExercise
} from '@/lib/data/workout'
import { supabase } from '@/lib/supabase'

const DAY_COLORS = [
    '#EF4444', '#F59E0B', '#22C55E', '#3B82F6',
    '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1'
]

export default function WorkoutPage() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [plan, setPlan] = useState<WorkoutPlan | null>(null)
    const [days, setDays] = useState<WorkoutDay[]>([])
    const [expandedDay, setExpandedDay] = useState<string | null>(null)
    const [editingExercise, setEditingExercise] = useState<string | null>(null)
    const [showGuide, setShowGuide] = useState(true)

    // Estados para edição de dia
    const [editingDay, setEditingDay] = useState<WorkoutDay | null>(null)
    const [showDayModal, setShowDayModal] = useState(false)

    useEffect(() => {
        if (user) loadData()
    }, [user])

    async function loadData() {
        if (!user) return
        setLoading(true)
        try {
            const activePlan = await getActiveWorkoutPlan(user.id)
            if (activePlan) {
                setPlan(activePlan)
                const workoutDays = await getWorkoutDays(activePlan.id)
                setDays(workoutDays)
                setShowGuide(false)
            }
        } catch (err) {
            console.error('Error loading workout data:', err)
        } finally {
            setLoading(false)
        }
    }

    async function handleCreateFromTemplate() {
        if (!user) return
        setLoading(true)
        try {
            const { plan: newPlan, days: newDays } = await createPlanFromTemplate(user.id)
            setPlan(newPlan)
            setDays(newDays)
            setShowGuide(false)
        } catch (err) {
            console.error('Error creating plan:', err)
            alert('Erro ao criar plano de treino')
        } finally {
            setLoading(false)
        }
    }

    async function handleUpdateExercise(exerciseId: string, updates: Partial<WorkoutExercise>) {
        try {
            await updateExercise(exerciseId, updates)
            setDays(prev => prev.map(day => ({
                ...day,
                exercises: day.exercises?.map(ex =>
                    ex.id === exerciseId ? { ...ex, ...updates } : ex
                )
            })))
            setEditingExercise(null)
        } catch (err: any) {
            console.error('Error updating exercise:', err)
            alert(`Erro ao atualizar: ${err?.message || 'Erro desconhecido'}`)
        }
    }

    async function handleAddExercise(dayId: string) {
        try {
            const newExercise = await addExercise(dayId, { name: 'Novo Exercício' })
            setDays(prev => prev.map(day =>
                day.id === dayId
                    ? { ...day, exercises: [...(day.exercises || []), newExercise] }
                    : day
            ))
            setEditingExercise(newExercise.id)
        } catch (err: any) {
            console.error('Error adding exercise:', err)
            alert(`Erro ao adicionar: ${err?.message || 'Erro desconhecido'}`)
        }
    }

    async function handleDeleteExercise(exerciseId: string, dayId: string) {
        if (!confirm('Remover este exercício?')) return
        try {
            await deleteExercise(exerciseId)
            setDays(prev => prev.map(day =>
                day.id === dayId
                    ? { ...day, exercises: day.exercises?.filter(ex => ex.id !== exerciseId) }
                    : day
            ))
        } catch (err: any) {
            console.error('Error deleting exercise:', err)
            alert(`Erro ao deletar: ${err?.message || 'Erro desconhecido'}`)
        }
    }

    // ========== GERENCIAMENTO DE DIAS ==========

    async function handleAddDay() {
        if (!plan) return
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
        const nextLetter = letters[days.length] || `Dia ${days.length + 1}`
        const nextColor = DAY_COLORS[days.length % DAY_COLORS.length]

        try {
            const { data, error } = await supabase
                .from('workout_days')
                .insert({
                    plan_id: plan.id,
                    day_letter: nextLetter,
                    name: 'Novo Treino',
                    muscle_groups: [],
                    rest_hours: 48,
                    color: nextColor,
                    order: days.length
                })
                .select()
                .single()

            if (error) throw error
            setDays(prev => [...prev, { ...data, exercises: [] }])
        } catch (err: any) {
            console.error('Error adding day:', err)
            alert(`Erro ao adicionar dia: ${err?.message || 'Erro'}`)
        }
    }

    async function handleUpdateDay(dayId: string, updates: Partial<WorkoutDay>) {
        try {
            await updateWorkoutDay(dayId, updates)
            setDays(prev => prev.map(d => d.id === dayId ? { ...d, ...updates } : d))
            setShowDayModal(false)
            setEditingDay(null)
        } catch (err: any) {
            console.error('Error updating day:', err)
            alert(`Erro ao atualizar: ${err?.message || 'Erro'}`)
        }
    }

    async function handleDeleteDay(dayId: string) {
        if (!confirm('Deletar este dia de treino e todos os exercícios?')) return
        try {
            const { error } = await supabase
                .from('workout_days')
                .delete()
                .eq('id', dayId)

            if (error) throw error
            setDays(prev => prev.filter(d => d.id !== dayId))
        } catch (err: any) {
            console.error('Error deleting day:', err)
            alert(`Erro ao deletar: ${err?.message || 'Erro'}`)
        }
    }

    async function handleResetPlan() {
        if (!plan) return
        if (!confirm('Isso vai DELETAR todo o seu plano de treino. Continuar?')) return
        try {
            await deleteWorkoutPlan(plan.id)
            setPlan(null)
            setDays([])
            setShowGuide(true)
        } catch (err: any) {
            alert(`Erro: ${err?.message}`)
        }
    }

    if (loading) {
        return (
            <MainLayout>
                <div className="flex justify-center items-center h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            </MainLayout>
        )
    }

    return (
        <MainLayout>
            <div className="min-h-screen p-6 pb-24 md:pl-64 pt-6">
                {/* Header */}
                <div className="max-w-4xl mx-auto mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white">
                            <Dumbbell className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Treino</h1>
                            <p className="text-gray-500">Configure sua divisão e exercícios</p>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Guia Inicial (aparece se não tem plano) */}
                    {showGuide && !plan && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="p-8 bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="p-3 rounded-xl bg-orange-100">
                                        <Sparkles className="w-6 h-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                                            Bem-vindo ao Módulo de Treino! 🏋️
                                        </h2>
                                        <p className="text-gray-600">
                                            Configure sua divisão de treino aqui e ela será integrada automaticamente com sua agenda.
                                        </p>
                                    </div>
                                </div>

                                {/* Como Funciona */}
                                <div className="bg-white/80 rounded-xl p-6 mb-6">
                                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <Info className="w-5 h-5 text-blue-500" />
                                        Como Funciona
                                    </h3>
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="flex gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
                                                1
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">Configure seu Plano</p>
                                                <p className="text-sm text-gray-500">Use o template ABCD ou crie o seu</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
                                                2
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">Adicione na Agenda</p>
                                                <p className="text-sm text-gray-500">Ao criar evento, escolha &quot;Treino&quot;</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
                                                3
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">Exercícios Automáticos</p>
                                                <p className="text-sm text-gray-500">O treino aparece na descrição do evento</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Ciência */}
                                <div className="bg-white/80 rounded-xl p-6 mb-6">
                                    <h3 className="font-semibold text-gray-900 mb-3">🔬 Dica Científica</h3>
                                    <div className="grid gap-3 md:grid-cols-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="text-green-500">✓</span>
                                            <span>Cada músculo <strong>2x por semana</strong> (ideal para naturais)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-green-500">✓</span>
                                            <span>Perna/Costas: <strong>72-96h</strong> de descanso</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-green-500">✓</span>
                                            <span>Braços/Ombro: <strong>48h</strong> de descanso</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-green-500">✓</span>
                                            <span>Síntese proteica dura <strong>24-48h</strong> após treino</span>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleCreateFromTemplate}
                                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                                >
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Começar com Template ABCD
                                </Button>
                            </Card>
                        </motion.div>
                    )}

                    {/* Cards de Dias */}
                    {plan && days.length > 0 && (
                        <div className="space-y-4">
                            {days.map((day, idx) => (
                                <motion.div
                                    key={day.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                >
                                    <Card
                                        className="overflow-hidden"
                                        style={{ borderLeft: `4px solid ${day.color}` }}
                                    >
                                        {/* Header do Dia */}
                                        <button
                                            onClick={() => setExpandedDay(expandedDay === day.id ? null : day.id)}
                                            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
                                                    style={{ backgroundColor: day.color }}
                                                >
                                                    {day.day_letter}
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="font-semibold text-gray-900">{day.name}</h3>
                                                    <p className="text-sm text-gray-500">
                                                        {day.muscle_groups.map(g =>
                                                            MUSCLE_GROUPS.find(m => m.id === g)?.label || g
                                                        ).join(', ') || 'Sem grupos definidos'}
                                                        {' • '}
                                                        {day.exercises?.length || 0} exercícios
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                                    {day.rest_hours}h descanso
                                                </span>
                                                {/* Botões de Editar e Deletar Dia */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setEditingDay(day)
                                                        setShowDayModal(true)
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Editar dia"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDeleteDay(day.id)
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Deletar dia"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                {expandedDay === day.id ? (
                                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                                )}
                                            </div>
                                        </button>

                                        {/* Exercícios (Expandido) */}
                                        <AnimatePresence>
                                            {expandedDay === day.id && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="border-t border-gray-100"
                                                >
                                                    <div className="p-4 space-y-3 bg-gray-50">
                                                        {day.exercises?.map((exercise, exIdx) => (
                                                            <ExerciseRow
                                                                key={exercise.id}
                                                                exercise={exercise}
                                                                isEditing={editingExercise === exercise.id}
                                                                onEdit={() => setEditingExercise(exercise.id)}
                                                                onSave={(updates) => handleUpdateExercise(exercise.id, updates)}
                                                                onCancel={() => setEditingExercise(null)}
                                                                onDelete={() => handleDeleteExercise(exercise.id, day.id)}
                                                                suggestions={day.muscle_groups.flatMap(g =>
                                                                    EXERCISE_SUGGESTIONS[g] || []
                                                                )}
                                                            />
                                                        ))}

                                                        <button
                                                            onClick={() => handleAddExercise(day.id)}
                                                            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-orange-400 hover:text-orange-500 transition-colors flex items-center justify-center gap-2"
                                                        >
                                                            <Plus className="w-5 h-5" />
                                                            Adicionar Exercício
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </Card>
                                </motion.div>
                            ))}

                            {/* Botão Adicionar Novo Dia */}
                            <button
                                onClick={handleAddDay}
                                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 hover:border-orange-400 hover:text-orange-500 transition-colors flex items-center justify-center gap-2 bg-white/50"
                            >
                                <Plus className="w-5 h-5" />
                                Adicionar Novo Dia (E, F, G...)
                            </button>

                            {/* Botão Resetar Plano */}
                            <div className="flex justify-end">
                                <button
                                    onClick={handleResetPlan}
                                    className="text-sm text-red-400 hover:text-red-600 transition-colors"
                                >
                                    Resetar Plano Completo
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Integração com Agenda - Dica */}
                    {plan && (
                        <Card className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
                            <div className="flex items-start gap-4">
                                <div className="p-2 rounded-lg bg-indigo-100">
                                    <Calendar className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 mb-1">
                                        Adicionar Treino na Agenda
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-3">
                                        Vá para a <strong>Agenda</strong>, clique em <strong>+ Novo Evento</strong>,
                                        e escolha o tipo <strong>&quot;Treino&quot;</strong>. O sistema vai puxar automaticamente
                                        os exercícios do dia selecionado.
                                    </p>
                                    <a
                                        href="/"
                                        className="inline-flex items-center gap-2 text-indigo-600 font-medium hover:text-indigo-700"
                                    >
                                        Ir para Agenda
                                        <ArrowRight className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {/* Modal de Edição de Dia */}
            <AnimatePresence>
                {showDayModal && editingDay && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => { setShowDayModal(false); setEditingDay(null) }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                        >
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Editar Dia de Treino
                            </h3>
                            <DayEditForm
                                day={editingDay}
                                onSave={(updates) => handleUpdateDay(editingDay.id, updates)}
                                onCancel={() => { setShowDayModal(false); setEditingDay(null) }}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </MainLayout>
    )
}

// ========================================
// Componente de Linha de Exercício
// ========================================

interface ExerciseRowProps {
    exercise: WorkoutExercise
    isEditing: boolean
    onEdit: () => void
    onSave: (updates: Partial<WorkoutExercise>) => void
    onCancel: () => void
    onDelete: () => void
    suggestions: string[]
}

function ExerciseRow({
    exercise,
    isEditing,
    onEdit,
    onSave,
    onCancel,
    onDelete,
    suggestions
}: ExerciseRowProps) {
    const [name, setName] = useState(exercise.name)
    const [sets, setSets] = useState(exercise.sets)
    const [reps, setReps] = useState(exercise.reps)
    const [rest, setRest] = useState(exercise.rest_seconds)
    const [showSuggestions, setShowSuggestions] = useState(false)

    useEffect(() => {
        setName(exercise.name)
        setSets(exercise.sets)
        setReps(exercise.reps)
        setRest(exercise.rest_seconds)
    }, [exercise])

    if (isEditing) {
        return (
            <div className="bg-white rounded-xl p-4 border-2 border-orange-300 shadow-sm">
                <div className="grid gap-3">
                    <div className="relative">
                        <Input
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value)
                                setShowSuggestions(true)
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            placeholder="Nome do exercício"
                            className="font-medium"
                        />
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                {suggestions
                                    .filter(s => s.toLowerCase().includes(name.toLowerCase()))
                                    .slice(0, 5)
                                    .map((sug, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setName(sug)
                                                setShowSuggestions(false)
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 transition-colors"
                                        >
                                            {sug}
                                        </button>
                                    ))
                                }
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-xs text-gray-500">Séries</label>
                            <Input
                                type="number"
                                value={sets}
                                onChange={(e) => setSets(Number(e.target.value))}
                                className="text-center"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Reps</label>
                            <Input
                                value={reps}
                                onChange={(e) => setReps(e.target.value)}
                                placeholder="8-12"
                                className="text-center"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Descanso (s)</label>
                            <Input
                                type="number"
                                value={rest}
                                onChange={(e) => setRest(Number(e.target.value))}
                                className="text-center"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={onCancel}>
                            <X className="w-4 h-4" />
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => onSave({ name, sets, reps, rest_seconds: rest })}
                            className="bg-orange-500 hover:bg-orange-600"
                        >
                            <Check className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl p-4 flex items-center gap-4 group hover:shadow-md transition-shadow">
            <div className="text-gray-300 cursor-grab">
                <GripVertical className="w-5 h-5" />
            </div>
            <div className="flex-1">
                <h4 className="font-medium text-gray-900">{exercise.name}</h4>
                <p className="text-sm text-gray-500">
                    {exercise.sets} × {exercise.reps}
                    {exercise.rest_seconds && ` • ${exercise.rest_seconds}s descanso`}
                </p>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                    onClick={onEdit}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                    <Edit3 className="w-4 h-4" />
                </button>
                <button
                    onClick={onDelete}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

// ========================================
// Componente de Edição de Dia
// ========================================

interface DayEditFormProps {
    day: WorkoutDay
    onSave: (updates: Partial<WorkoutDay>) => void
    onCancel: () => void
}

function DayEditForm({ day, onSave, onCancel }: DayEditFormProps) {
    const [dayLetter, setDayLetter] = useState(day.day_letter)
    const [name, setName] = useState(day.name)
    const [color, setColor] = useState(day.color)
    const [muscleGroups, setMuscleGroups] = useState<string[]>(day.muscle_groups || [])
    const [restHours, setRestHours] = useState(day.rest_hours)

    const toggleMuscleGroup = (groupId: string) => {
        setMuscleGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(g => g !== groupId)
                : [...prev, groupId]
        )
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSave({
            day_letter: dayLetter,
            name,
            color,
            muscle_groups: muscleGroups,
            rest_hours: restHours
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Letra e Nome */}
            <div className="grid grid-cols-4 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Letra</label>
                    <Input
                        value={dayLetter}
                        onChange={(e) => setDayLetter(e.target.value.toUpperCase())}
                        maxLength={2}
                        className="text-center font-bold"
                    />
                </div>
                <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Peito + Tríceps"
                    />
                </div>
            </div>

            {/* Cor */}
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Cor</label>
                <div className="flex gap-2">
                    {DAY_COLORS.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            className={`w-8 h-8 rounded-lg transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>

            {/* Grupos Musculares */}
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Grupos Musculares</label>
                <div className="flex flex-wrap gap-2">
                    {MUSCLE_GROUPS.map((group) => (
                        <button
                            key={group.id}
                            type="button"
                            onClick={() => toggleMuscleGroup(group.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${muscleGroups.includes(group.id)
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {group.emoji} {group.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Descanso */}
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Horas de Descanso</label>
                <div className="flex gap-2">
                    {[24, 48, 72, 96].map((h) => (
                        <button
                            key={h}
                            type="button"
                            onClick={() => setRestHours(h)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${restHours === h
                                ? 'bg-indigo-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {h}h
                        </button>
                    ))}
                </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                    Salvar
                </Button>
            </div>
        </form>
    )
}
