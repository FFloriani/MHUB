import { supabase } from '../supabase'

// ========================================
// TYPES
// ========================================

export interface WorkoutPlan {
    id: string
    user_id: string
    name: string
    division_type: 'AB' | 'ABC' | 'ABCD' | 'PPL' | 'CUSTOM'
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface WorkoutDay {
    id: string
    plan_id: string
    day_letter: string
    name: string
    muscle_groups: string[]
    rest_hours: number
    color: string
    order: number
    exercises?: WorkoutExercise[]
}

export interface WorkoutExercise {
    id: string
    day_id: string
    name: string
    sets: number
    reps: string
    rest_seconds: number
    weight_kg?: number
    notes?: string
    order: number
}

export interface WorkoutLog {
    id: string
    user_id: string
    day_id?: string
    event_id?: string
    completed_at: string
    duration_minutes?: number
    notes?: string
}

// ========================================
// TEMPLATES
// ========================================

export const MUSCLE_GROUPS = [
    { id: 'chest', label: 'Peito', emoji: '🫁' },
    { id: 'back', label: 'Costas', emoji: '🔙' },
    { id: 'shoulders', label: 'Ombros', emoji: '💪' },
    { id: 'biceps', label: 'Bíceps', emoji: '💪' },
    { id: 'triceps', label: 'Tríceps', emoji: '💪' },
    { id: 'legs', label: 'Pernas', emoji: '🦵' },
    { id: 'glutes', label: 'Glúteos', emoji: '🍑' },
    { id: 'abs', label: 'Abdômen', emoji: '🎯' },
    { id: 'forearms', label: 'Antebraço', emoji: '✊' },
    { id: 'calves', label: 'Panturrilha', emoji: '🦶' },
]

export const EXERCISE_SUGGESTIONS: Record<string, string[]> = {
    chest: ['Supino Reto', 'Supino Inclinado', 'Supino Declinado', 'Crucifixo', 'Crossover', 'Flexão', 'Peck Deck'],
    back: ['Puxada Frontal', 'Remada Curvada', 'Remada Unilateral', 'Pulldown', 'Levantamento Terra', 'Barra Fixa', 'Remada Cavalinho'],
    shoulders: ['Desenvolvimento', 'Elevação Lateral', 'Elevação Frontal', 'Face Pull', 'Crucifixo Inverso', 'Arnold Press'],
    biceps: ['Rosca Direta', 'Rosca Alternada', 'Rosca Martelo', 'Rosca Scott', 'Rosca Concentrada', 'Rosca 21'],
    triceps: ['Tríceps Pulley', 'Tríceps Testa', 'Tríceps Francês', 'Mergulho', 'Tríceps Corda', 'Supino Fechado'],
    legs: ['Agachamento Livre', 'Leg Press', 'Cadeira Extensora', 'Mesa Flexora', 'Agachamento Hack', 'Afundo', 'Stiff'],
    glutes: ['Hip Thrust', 'Elevação Pélvica', 'Abdução', 'Agachamento Sumô', 'Kickback'],
    abs: ['Abdominal Crunch', 'Prancha', 'Elevação de Pernas', 'Abdominal Infra', 'Russian Twist', 'Abdominal Oblíquo'],
    forearms: ['Rosca de Punho', 'Rosca Inversa', 'Farmer Walk'],
    calves: ['Panturrilha em Pé', 'Panturrilha Sentado', 'Panturrilha no Leg Press'],
}

// Template padrão ABCD
export const DEFAULT_TEMPLATE: Omit<WorkoutDay, 'id' | 'plan_id'>[] = [
    {
        day_letter: 'A',
        name: 'Peito + Tríceps',
        muscle_groups: ['chest', 'triceps'],
        rest_hours: 48,
        color: '#EF4444',
        order: 0,
        exercises: [
            { id: '', day_id: '', name: 'Supino Reto', sets: 4, reps: '8-12', rest_seconds: 90, order: 0 },
            { id: '', day_id: '', name: 'Supino Inclinado', sets: 3, reps: '10-12', rest_seconds: 60, order: 1 },
            { id: '', day_id: '', name: 'Crucifixo', sets: 3, reps: '12-15', rest_seconds: 60, order: 2 },
            { id: '', day_id: '', name: 'Tríceps Pulley', sets: 3, reps: '12-15', rest_seconds: 60, order: 3 },
            { id: '', day_id: '', name: 'Tríceps Testa', sets: 3, reps: '10-12', rest_seconds: 60, order: 4 },
        ]
    },
    {
        day_letter: 'B',
        name: 'Costas + Bíceps',
        muscle_groups: ['back', 'biceps'],
        rest_hours: 48,
        color: '#3B82F6',
        order: 1,
        exercises: [
            { id: '', day_id: '', name: 'Puxada Frontal', sets: 4, reps: '8-12', rest_seconds: 90, order: 0 },
            { id: '', day_id: '', name: 'Remada Curvada', sets: 4, reps: '8-12', rest_seconds: 90, order: 1 },
            { id: '', day_id: '', name: 'Remada Unilateral', sets: 3, reps: '10-12', rest_seconds: 60, order: 2 },
            { id: '', day_id: '', name: 'Rosca Direta', sets: 3, reps: '10-12', rest_seconds: 60, order: 3 },
            { id: '', day_id: '', name: 'Rosca Martelo', sets: 3, reps: '12-15', rest_seconds: 60, order: 4 },
        ]
    },
    {
        day_letter: 'C',
        name: 'Pernas',
        muscle_groups: ['legs', 'glutes', 'calves'],
        rest_hours: 72,
        color: '#22C55E',
        order: 2,
        exercises: [
            { id: '', day_id: '', name: 'Agachamento Livre', sets: 4, reps: '8-12', rest_seconds: 120, order: 0 },
            { id: '', day_id: '', name: 'Leg Press', sets: 4, reps: '10-15', rest_seconds: 90, order: 1 },
            { id: '', day_id: '', name: 'Cadeira Extensora', sets: 3, reps: '12-15', rest_seconds: 60, order: 2 },
            { id: '', day_id: '', name: 'Mesa Flexora', sets: 3, reps: '12-15', rest_seconds: 60, order: 3 },
            { id: '', day_id: '', name: 'Panturrilha em Pé', sets: 4, reps: '15-20', rest_seconds: 45, order: 4 },
        ]
    },
    {
        day_letter: 'D',
        name: 'Ombros + Abdômen',
        muscle_groups: ['shoulders', 'abs'],
        rest_hours: 48,
        color: '#F59E0B',
        order: 3,
        exercises: [
            { id: '', day_id: '', name: 'Desenvolvimento', sets: 4, reps: '8-12', rest_seconds: 90, order: 0 },
            { id: '', day_id: '', name: 'Elevação Lateral', sets: 4, reps: '12-15', rest_seconds: 60, order: 1 },
            { id: '', day_id: '', name: 'Elevação Frontal', sets: 3, reps: '12-15', rest_seconds: 60, order: 2 },
            { id: '', day_id: '', name: 'Face Pull', sets: 3, reps: '15-20', rest_seconds: 60, order: 3 },
            { id: '', day_id: '', name: 'Abdominal Crunch', sets: 3, reps: '20', rest_seconds: 45, order: 4 },
            { id: '', day_id: '', name: 'Prancha', sets: 3, reps: '45s', rest_seconds: 30, order: 5 },
        ]
    },
]

// ========================================
// CRUD FUNCTIONS
// ========================================

// Buscar plano ativo do usuário
export async function getActiveWorkoutPlan(userId: string): Promise<WorkoutPlan | null> {
    const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null // Não encontrado
        console.error('Error fetching workout plan:', error)
        return null
    }
    return data
}

// Buscar dias de um plano com exercícios
export async function getWorkoutDays(planId: string): Promise<WorkoutDay[]> {
    const { data: days, error: daysError } = await supabase
        .from('workout_days')
        .select('*')
        .eq('plan_id', planId)
        .order('order', { ascending: true })

    if (daysError) {
        console.error('Error fetching workout days:', daysError)
        return []
    }

    // Buscar exercícios de cada dia
    const daysWithExercises = await Promise.all(
        (days || []).map(async (day) => {
            const { data: exercises } = await supabase
                .from('workout_exercises')
                .select('*')
                .eq('day_id', day.id)
                .order('order', { ascending: true })

            return { ...day, exercises: exercises || [] }
        })
    )

    return daysWithExercises
}

// Criar plano do zero
export async function createWorkoutPlan(userId: string, name: string = 'Meu Plano de Treino'): Promise<WorkoutPlan> {
    const { data, error } = await supabase
        .from('workout_plans')
        .insert({
            user_id: userId,
            name,
            division_type: 'ABCD',
            is_active: true
        })
        .select()
        .single()

    if (error) throw error
    return data
}

// Criar plano a partir de template
export async function createPlanFromTemplate(userId: string): Promise<{ plan: WorkoutPlan, days: WorkoutDay[] }> {
    // 1. Criar plano
    const plan = await createWorkoutPlan(userId, 'Treino ABCD')

    // 2. Criar dias com exercícios
    const createdDays: WorkoutDay[] = []

    for (const template of DEFAULT_TEMPLATE) {
        const { data: day, error: dayError } = await supabase
            .from('workout_days')
            .insert({
                plan_id: plan.id,
                day_letter: template.day_letter,
                name: template.name,
                muscle_groups: template.muscle_groups,
                rest_hours: template.rest_hours,
                color: template.color,
                order: template.order
            })
            .select()
            .single()

        if (dayError) throw dayError

        // 3. Criar exercícios do dia
        if (template.exercises && template.exercises.length > 0) {
            const exercisesToInsert = template.exercises.map((ex, idx) => ({
                day_id: day.id,
                name: ex.name,
                sets: ex.sets,
                reps: ex.reps,
                rest_seconds: ex.rest_seconds,
                order: idx
            }))

            const { data: exercises, error: exError } = await supabase
                .from('workout_exercises')
                .insert(exercisesToInsert)
                .select()

            if (exError) throw exError
            day.exercises = exercises
        }

        createdDays.push(day)
    }

    return { plan, days: createdDays }
}

// Atualizar dia de treino
export async function updateWorkoutDay(dayId: string, updates: Partial<WorkoutDay>): Promise<WorkoutDay> {
    const { data, error } = await supabase
        .from('workout_days')
        .update({
            name: updates.name,
            muscle_groups: updates.muscle_groups,
            rest_hours: updates.rest_hours,
            color: updates.color,
        })
        .eq('id', dayId)
        .select()
        .single()

    if (error) throw error
    return data
}

// Adicionar exercício
export async function addExercise(dayId: string, exercise: Partial<WorkoutExercise>): Promise<WorkoutExercise> {
    // Pegar o próximo order
    const { data: existing } = await supabase
        .from('workout_exercises')
        .select('order')
        .eq('day_id', dayId)
        .order('order', { ascending: false })
        .limit(1)

    const nextOrder = existing && existing.length > 0 ? existing[0].order + 1 : 0

    const { data, error } = await supabase
        .from('workout_exercises')
        .insert({
            day_id: dayId,
            name: exercise.name || 'Novo Exercício',
            sets: exercise.sets || 3,
            reps: exercise.reps || '12',
            rest_seconds: exercise.rest_seconds || 60,
            weight_kg: exercise.weight_kg,
            notes: exercise.notes,
            order: nextOrder
        })
        .select()
        .single()

    if (error) throw error
    return data
}

// Atualizar exercício
export async function updateExercise(exerciseId: string, updates: Partial<WorkoutExercise>): Promise<WorkoutExercise> {
    const { data, error } = await supabase
        .from('workout_exercises')
        .update({
            name: updates.name,
            sets: updates.sets,
            reps: updates.reps,
            rest_seconds: updates.rest_seconds,
            weight_kg: updates.weight_kg,
            notes: updates.notes,
            order: updates.order
        })
        .eq('id', exerciseId)
        .select()
        .single()

    if (error) throw error
    return data
}

// Deletar exercício
export async function deleteExercise(exerciseId: string): Promise<void> {
    const { error } = await supabase
        .from('workout_exercises')
        .delete()
        .eq('id', exerciseId)

    if (error) throw error
}

// Deletar plano inteiro
export async function deleteWorkoutPlan(planId: string): Promise<void> {
    const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', planId)

    if (error) throw error
}

// ========================================
// HELPERS PARA AGENDA
// ========================================

// Formatar descrição para evento na agenda
export function formatWorkoutDescription(day: WorkoutDay): string {
    if (!day.exercises || day.exercises.length === 0) {
        return `🏋️ ${day.name}\n\nNenhum exercício configurado.`
    }

    const muscleGroupLabels = day.muscle_groups
        .map(g => MUSCLE_GROUPS.find(m => m.id === g)?.label || g)
        .join(', ')

    let description = `🏋️ TREINO ${day.day_letter} - ${day.name}\n`
    description += `💪 Grupos: ${muscleGroupLabels}\n\n`
    description += `📋 EXERCÍCIOS:\n`

    day.exercises.forEach((ex, idx) => {
        description += `\n${idx + 1}. ${ex.name}\n`
        description += `   → ${ex.sets} séries × ${ex.reps} reps\n`
        if (ex.weight_kg) description += `   → Carga: ${ex.weight_kg}kg\n`
        if (ex.rest_seconds) description += `   → Descanso: ${ex.rest_seconds}s\n`
        if (ex.notes) description += `   → Obs: ${ex.notes}\n`
    })

    return description
}

// Determinar qual treino fazer hoje baseado na sequência
export async function getNextWorkoutDay(userId: string): Promise<WorkoutDay | null> {
    const plan = await getActiveWorkoutPlan(userId)
    if (!plan) return null

    const days = await getWorkoutDays(plan.id)
    if (days.length === 0) return null

    // Buscar último treino realizado
    const { data: lastLog } = await supabase
        .from('workout_logs')
        .select('day_id')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single()

    if (!lastLog) {
        // Nunca treinou, retorna o primeiro
        return days[0]
    }

    // Encontrar o próximo na sequência
    const lastIndex = days.findIndex(d => d.id === lastLog.day_id)
    const nextIndex = (lastIndex + 1) % days.length
    return days[nextIndex]
}

// Registrar treino realizado
export async function logWorkout(userId: string, dayId: string, eventId?: string, durationMinutes?: number): Promise<void> {
    const { error } = await supabase
        .from('workout_logs')
        .insert({
            user_id: userId,
            day_id: dayId,
            event_id: eventId,
            duration_minutes: durationMinutes
        })

    if (error) throw error
}
