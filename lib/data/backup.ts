
import { supabase } from '../supabase'
import type { Database } from '../supabase'

// Tipos baseados no Database schema
type Tables = Database['public']['Tables']
type UserSettings = Tables['user_settings']['Row']
type Event = Tables['events']['Row']
type Task = Tables['tasks']['Row']
type Revenue = Tables['revenues']['Row']
type Investment = Tables['investments']['Row']
type Expense = Tables['expenses']['Row']

export interface BackupData {
    version: number
    timestap: string
    userId: string
    data: {
        userSettings: UserSettings | null
        events: Event[]
        tasks: Task[]
        revenues: Revenue[]
        investments: Investment[]
        expenses: Expense[]
    }
}

/**
 * Exporta TODOS os dados do usuário para um objeto JSON
 */
export async function exportFullBackup(userId: string): Promise<BackupData> {
    // 1. User Settings
    const { data: userSettings, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

    if (settingsError) console.error('Error fetching settings:', settingsError)

    // 2. Events (Agenda)
    const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)

    if (eventsError) throw new Error('Falha ao exportar eventos: ' + eventsError.message)

    // 3. Tasks (Tarefas)
    const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)

    if (tasksError) throw new Error('Falha ao exportar tarefas: ' + tasksError.message)

    // 4. Financial - Revenues
    const { data: revenues, error: revError } = await supabase
        .from('revenues')
        .select('*')
        .eq('user_id', userId)

    if (revError) throw new Error('Falha ao exportar receitas: ' + revError.message)

    // 5. Financial - Investments
    const { data: investments, error: invError } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', userId)

    if (invError) throw new Error('Falha ao exportar investimentos: ' + invError.message)

    // 6. Financial - Expenses
    const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)

    if (expError) throw new Error('Falha ao exportar despesas: ' + expError.message)

    return {
        version: 1,
        timestap: new Date().toISOString(),
        userId: userId,
        data: {
            userSettings: userSettings || null,
            events: events || [],
            tasks: tasks || [],
            revenues: revenues || [],
            investments: investments || [],
            expenses: expenses || []
        }
    }
}

/**
 * Restaura o backup, substituindo os dados atuais
 */
export async function restoreFullBackup(userId: string, backup: BackupData): Promise<void> {
    // Validações básicas
    if (!backup.data || !backup.version) {
        throw new Error('Arquivo de backup inválido ou corrompido.')
    }

    // Opcional: Verificar se o backup pertence ao mesmo usuário (ou permitir migração se o user quiser)
    // Neste caso, vamos forçar o ID do usuário logado para garantir segurança, ignorando o ID do JSON original na hora de inserir,
    // mas usaremos os dados. Porém, precisamos garantir que os IDs dos registros não colidam se eles já existirem em outra conta (muito raro com UUID).
    // Estratégia: Limpar dados atuais do usuário e inserir os do backup.

    // LIMPEZA (Deletar dados atuais)
    // Ordem: Tabelas dependentes primeiro (se houvesse FKs rigorosas, mas aqui é plano)

    // 1. Limpar Financeiro
    await supabase.from('expenses').delete().eq('user_id', userId)
    await supabase.from('revenues').delete().eq('user_id', userId)
    await supabase.from('investments').delete().eq('user_id', userId)

    // 2. Limpar Tarefas e Eventos
    await supabase.from('tasks').delete().eq('user_id', userId)
    await supabase.from('events').delete().eq('user_id', userId)

    // 3. User Settings (Geralmente é 1 por user, então vamos fazer upsert ou delete/insert)
    await supabase.from('user_settings').delete().eq('user_id', userId)

    // INSERÇÃO (Restaurar dados)
    // Precisamos sanitizar os dados para garantir que o user_id seja o do usuário atual
    // (Caso ele esteja restaurando backup de outra conta dele ou algo assim)

    const sanitize = (items: any[]) => items.map(item => ({ ...item, user_id: userId }))

    // 1. User Settings
    if (backup.data.userSettings) {
        const { error } = await supabase
            .from('user_settings')
            .insert({ ...backup.data.userSettings, user_id: userId })
        if (error) console.error('Erro ao restaurar settings:', error)
    }

    // 2. Events
    if (backup.data.events?.length) {
        const { error } = await supabase
            .from('events')
            .insert(sanitize(backup.data.events))
        if (error) throw new Error('Erro ao restaurar eventos: ' + error.message)
    }

    // 3. Tasks
    if (backup.data.tasks?.length) {
        const { error } = await supabase
            .from('tasks')
            .insert(sanitize(backup.data.tasks))
        if (error) throw new Error('Erro ao restaurar tarefas: ' + error.message)
    }

    // 4. Financial
    if (backup.data.revenues?.length) {
        const { error } = await supabase
            .from('revenues')
            .insert(sanitize(backup.data.revenues))
        if (error) throw new Error('Erro ao restaurar receitas: ' + error.message)
    }

    if (backup.data.investments?.length) {
        const { error } = await supabase
            .from('investments')
            .insert(sanitize(backup.data.investments))
        if (error) throw new Error('Erro ao restaurar investimentos: ' + error.message)
    }

    if (backup.data.expenses?.length) {
        const { error } = await supabase
            .from('expenses')
            .insert(sanitize(backup.data.expenses))
        if (error) throw new Error('Erro ao restaurar despesas: ' + error.message)
    }
}

// ============================================================
// BACKUP SIMPLIFICADO PARA LLMs (Modular e Compacto)
// ============================================================

// Tipos simplificados (legíveis por humanos/LLMs)
export interface SimpleEvent {
    titulo: string
    data: string           // "2026-01-06"
    inicio: string         // "14:00"
    fim?: string           // "15:30"
    descricao?: string
    repete?: string[]      // ["seg", "qua", "sex"]
}

export interface SimpleTask {
    titulo: string
    data: string           // "2026-01-06"
    concluida: boolean
}

export interface SimpleRevenue {
    categoria: string
    valor: number
    mes: number
    ano: number
}

export interface SimpleExpense {
    tipo: string           // "Fixo" | "Variável"
    categoria: string
    item: string
    valor: number
    mes: number
    ano: number
}

export interface SimpleInvestment {
    categoria: string
    valor: number
    mes: number
    ano: number
}

export interface SimpleSubject {
    nome: string
    cor: string
    nivel: number
    xp: number
}

export interface SimpleBackupData {
    mhub_backup: {
        versao: number
        data_criacao: string
        modulos: string[]
        eventos?: SimpleEvent[]
        tarefas?: SimpleTask[]
        financeiro?: {
            receitas?: SimpleRevenue[]
            despesas?: SimpleExpense[]
            investimentos?: SimpleInvestment[]
        }
        estudos?: {
            materias?: SimpleSubject[]
        }
    }
}

export type BackupModule = 'eventos' | 'tarefas' | 'financeiro' | 'estudos'

// Mapas de conversão para dias da semana
const DAY_TO_PT: Record<number, string> = {
    0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab'
}

const PT_TO_DAY: Record<string, number> = {
    'dom': 0, 'seg': 1, 'ter': 2, 'qua': 3, 'qui': 4, 'sex': 5, 'sab': 6
}

// Helper para formatar data local como YYYY-MM-DD
function formatLocalDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// Helper para formatar hora local como HH:MM
function formatLocalTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
}

// Funções de conversão
function toSimpleEvent(event: Event): SimpleEvent {
    const startDate = new Date(event.start_time)
    const endDate = event.end_time ? new Date(event.end_time) : null

    const simple: SimpleEvent = {
        titulo: event.title,
        data: formatLocalDate(startDate),      // Usa data LOCAL, não UTC
        inicio: formatLocalTime(startDate),    // Usa hora LOCAL, não UTC
    }

    if (endDate) {
        simple.fim = formatLocalTime(endDate)
    }

    if (event.description) {
        simple.descricao = event.description
    }

    if (event.is_recurring && event.recurrence_days?.length) {
        simple.repete = event.recurrence_days.map(d => DAY_TO_PT[d])
    }

    return simple
}

function fromSimpleEvent(simple: SimpleEvent, userId: string): Omit<Event, 'id'> {
    const [year, month, day] = simple.data.split('-').map(Number)
    const [startH, startM] = simple.inicio.split(':').map(Number)

    const startTime = new Date(year, month - 1, day, startH, startM)
    let endTime: Date | null = null

    if (simple.fim) {
        const [endH, endM] = simple.fim.split(':').map(Number)
        endTime = new Date(year, month - 1, day, endH, endM)
    }

    const isRecurring = Array.isArray(simple.repete) && simple.repete.length > 0
    const recurrenceDays = isRecurring
        ? simple.repete!.map(d => PT_TO_DAY[d.toLowerCase()]).filter(n => n !== undefined)
        : null

    return {
        user_id: userId,
        title: simple.titulo,
        start_time: startTime.toISOString(),
        end_time: endTime?.toISOString() || null,
        description: simple.descricao || null,
        is_recurring: isRecurring,
        recurrence_days: recurrenceDays,
        recurrence_end_date: null
    }
}

function toSimpleTask(task: Task): SimpleTask {
    return {
        titulo: task.title,
        data: task.target_date || new Date().toISOString().split('T')[0],
        concluida: task.is_completed
    }
}

function fromSimpleTask(simple: SimpleTask, userId: string): Omit<Task, 'id'> {
    return {
        user_id: userId,
        title: simple.titulo,
        target_date: simple.data,
        is_completed: simple.concluida
    }
}

/**
 * Opções de filtro para backup simplificado
 */
export type DateFilterOption = 'future' | 'today' | 'all'

export interface SimpleBackupOptions {
    dateFilter: DateFilterOption    // 'future' | 'last30' | 'all'
    includeRecurring: boolean       // incluir eventos recorrentes?
}

/**
 * Exporta backup simplificado com módulos selecionados e filtros
 */
export async function exportSimpleBackup(
    userId: string,
    modules: BackupModule[],
    options: SimpleBackupOptions = { dateFilter: 'future', includeRecurring: false }
): Promise<SimpleBackupData> {
    const backup: SimpleBackupData = {
        mhub_backup: {
            versao: 1,
            data_criacao: new Date().toISOString().split('T')[0],
            modulos: modules
        }
    }

    // Calcula data de corte baseado no filtro
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    let dateFilterStart: Date | null = null
    let dateFilterEnd: Date | null = null  // Para filtro 'today'

    switch (options.dateFilter) {
        case 'future':
            dateFilterStart = today
            break
        case 'today':
            // Só eventos de hoje (entre 00:00 de hoje e 00:00 de amanhã)
            dateFilterStart = today
            dateFilterEnd = tomorrow
            break
        case 'all':
            dateFilterStart = null
            break
    }

    // Eventos
    if (modules.includes('eventos')) {
        let allEvents: any[] = []

        // Query para eventos ÚNICOS (não recorrentes) - aplica filtro de data
        {
            let query = supabase
                .from('events')
                .select('*')
                .eq('user_id', userId)
                .eq('is_recurring', false)
                .order('start_time', { ascending: true })

            // Filtro de data início
            if (dateFilterStart) {
                query = query.gte('start_time', dateFilterStart.toISOString())
            }

            // Filtro de data fim (só para 'today')
            if (dateFilterEnd) {
                query = query.lt('start_time', dateFilterEnd.toISOString())
            }

            const { data: events } = await query
            allEvents = [...(events || [])]
        }

        // Query para eventos RECORRENTES - não filtra por data (eles se repetem)
        if (options.includeRecurring) {
            const { data: recurringEvents } = await supabase
                .from('events')
                .select('*')
                .eq('user_id', userId)
                .eq('is_recurring', true)
                .order('start_time', { ascending: true })

            allEvents = [...allEvents, ...(recurringEvents || [])]
        }

        // Ordena por start_time
        allEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

        backup.mhub_backup.eventos = allEvents.map(toSimpleEvent)
    }

    // Tarefas (também aplica filtro de data)
    if (modules.includes('tarefas')) {
        let query = supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId)
            .order('target_date', { ascending: true })

        // Filtro de data para tarefas
        if (dateFilterStart) {
            query = query.gte('target_date', formatLocalDate(dateFilterStart))
        }

        const { data: tasks } = await query
        backup.mhub_backup.tarefas = (tasks || []).map(toSimpleTask)
    }

    // Financeiro
    if (modules.includes('financeiro')) {
        const [revenues, expenses, investments] = await Promise.all([
            supabase.from('revenues').select('*').eq('user_id', userId),
            supabase.from('expenses').select('*').eq('user_id', userId),
            supabase.from('investments').select('*').eq('user_id', userId)
        ])

        backup.mhub_backup.financeiro = {
            receitas: (revenues.data || []).map(r => ({
                categoria: r.category,
                valor: r.amount,
                mes: r.month,
                ano: r.year
            })),
            despesas: (expenses.data || []).map(e => ({
                tipo: e.type,
                categoria: e.category,
                item: e.item,
                valor: e.amount,
                mes: e.month,
                ano: e.year
            })),
            investimentos: (investments.data || []).map(i => ({
                categoria: i.category,
                valor: i.amount,
                mes: i.month,
                ano: i.year
            }))
        }
    }

    // Estudos
    if (modules.includes('estudos')) {
        const { data: subjects } = await supabase
            .from('subjects')
            .select('*')
            .eq('user_id', userId)

        backup.mhub_backup.estudos = {
            materias: (subjects || []).map(s => ({
                nome: s.name,
                cor: s.color,
                nivel: s.level,
                xp: s.xp_current
            }))
        }
    }

    return backup
}

/**
 * Detecta quais módulos estão presentes em um backup
 */
export function detectBackupModules(backup: any): {
    eventos: number
    tarefas: number
    financeiro: { receitas: number; despesas: number; investimentos: number } | null
    estudos: number
} {
    const data = backup?.mhub_backup

    return {
        eventos: Array.isArray(data?.eventos) ? data.eventos.length : 0,
        tarefas: Array.isArray(data?.tarefas) ? data.tarefas.length : 0,
        financeiro: data?.financeiro ? {
            receitas: Array.isArray(data.financeiro.receitas) ? data.financeiro.receitas.length : 0,
            despesas: Array.isArray(data.financeiro.despesas) ? data.financeiro.despesas.length : 0,
            investimentos: Array.isArray(data.financeiro.investimentos) ? data.financeiro.investimentos.length : 0
        } : null,
        estudos: Array.isArray(data?.estudos?.materias) ? data.estudos.materias.length : 0
    }
}

/**
 * Restaura backup simplificado
 * @param mode 'replace' = substitui tudo, 'merge' = adiciona aos existentes, 'update' = atualiza existentes por título+data
 */
export async function restoreSimpleBackup(
    userId: string,
    backup: SimpleBackupData,
    mode: 'replace' | 'merge' | 'update' = 'merge'
): Promise<{ eventos: number; tarefas: number; financeiro: number; estudos: number; atualizados?: number }> {
    const data = backup.mhub_backup
    const stats = { eventos: 0, tarefas: 0, financeiro: 0, estudos: 0, atualizados: 0 }

    // Eventos
    if (data.eventos?.length) {
        if (mode === 'replace') {
            await supabase.from('events').delete().eq('user_id', userId)
            const eventsToInsert = data.eventos.map(e => fromSimpleEvent(e, userId))
            const { error } = await supabase.from('events').insert(eventsToInsert)
            if (error) throw new Error('Erro ao importar eventos: ' + error.message)
            stats.eventos = eventsToInsert.length
        }
        else if (mode === 'merge') {
            const eventsToInsert = data.eventos.map(e => fromSimpleEvent(e, userId))
            const { error } = await supabase.from('events').insert(eventsToInsert)
            if (error) throw new Error('Erro ao importar eventos: ' + error.message)
            stats.eventos = eventsToInsert.length
        }
        else if (mode === 'update') {
            // Busca todos os eventos do usuário para fazer match
            const { data: existingEvents } = await supabase
                .from('events')
                .select('*')
                .eq('user_id', userId)

            for (const simpleEvent of data.eventos) {
                const eventData = fromSimpleEvent(simpleEvent, userId)

                // Tenta encontrar evento existente por título + data de início
                const existing = existingEvents?.find(e => {
                    const existingDate = new Date(e.start_time)
                    const newDate = new Date(eventData.start_time)
                    const sameTitle = e.title.toLowerCase() === eventData.title.toLowerCase()
                    const sameDate = existingDate.toDateString() === newDate.toDateString()
                    const sameTime = existingDate.getHours() === newDate.getHours() &&
                        existingDate.getMinutes() === newDate.getMinutes()
                    return sameTitle && sameDate && sameTime
                })

                if (existing) {
                    // Atualiza evento existente
                    const { error } = await supabase
                        .from('events')
                        .update({
                            title: eventData.title,
                            description: eventData.description,
                            start_time: eventData.start_time,
                            end_time: eventData.end_time,
                            is_recurring: eventData.is_recurring,
                            recurrence_days: eventData.recurrence_days
                        })
                        .eq('id', existing.id)

                    if (error) throw new Error('Erro ao atualizar evento: ' + error.message)
                    stats.atualizados++
                } else {
                    // Cria novo evento
                    const { error } = await supabase.from('events').insert(eventData)
                    if (error) throw new Error('Erro ao criar evento: ' + error.message)
                    stats.eventos++
                }
            }
        }
    }

    // Tarefas
    if (data.tarefas?.length) {
        if (mode === 'replace') {
            await supabase.from('tasks').delete().eq('user_id', userId)
        }

        if (mode === 'update') {
            // Busca tarefas existentes
            const { data: existingTasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', userId)

            for (const simpleTask of data.tarefas) {
                const taskData = fromSimpleTask(simpleTask, userId)

                // Match por título + data
                const existing = existingTasks?.find(t =>
                    t.title.toLowerCase() === taskData.title.toLowerCase() &&
                    t.target_date === taskData.target_date
                )

                if (existing) {
                    const { error } = await supabase
                        .from('tasks')
                        .update({
                            title: taskData.title,
                            is_completed: taskData.is_completed,
                            target_date: taskData.target_date
                        })
                        .eq('id', existing.id)

                    if (error) throw new Error('Erro ao atualizar tarefa: ' + error.message)
                    stats.atualizados++
                } else {
                    const { error } = await supabase.from('tasks').insert(taskData)
                    if (error) throw new Error('Erro ao criar tarefa: ' + error.message)
                    stats.tarefas++
                }
            }
        } else {
            const tasksToInsert = data.tarefas.map(t => fromSimpleTask(t, userId))
            const { error } = await supabase.from('tasks').insert(tasksToInsert)
            if (error) throw new Error('Erro ao importar tarefas: ' + error.message)
            stats.tarefas = tasksToInsert.length
        }
    }

    // Financeiro
    if (data.financeiro) {
        if (mode === 'replace') {
            await supabase.from('revenues').delete().eq('user_id', userId)
            await supabase.from('expenses').delete().eq('user_id', userId)
            await supabase.from('investments').delete().eq('user_id', userId)
        }

        let count = 0

        if (data.financeiro.receitas?.length) {
            const items = data.financeiro.receitas.map(r => ({
                user_id: userId,
                category: r.categoria,
                amount: r.valor,
                month: r.mes,
                year: r.ano
            }))
            await supabase.from('revenues').insert(items)
            count += items.length
        }

        if (data.financeiro.despesas?.length) {
            const items = data.financeiro.despesas.map(e => ({
                user_id: userId,
                type: e.tipo,
                category: e.categoria,
                item: e.item,
                amount: e.valor,
                month: e.mes,
                year: e.ano
            }))
            await supabase.from('expenses').insert(items)
            count += items.length
        }

        if (data.financeiro.investimentos?.length) {
            const items = data.financeiro.investimentos.map(i => ({
                user_id: userId,
                category: i.categoria,
                amount: i.valor,
                month: i.mes,
                year: i.ano
            }))
            await supabase.from('investments').insert(items)
            count += items.length
        }

        stats.financeiro = count
    }

    // Estudos
    if (data.estudos?.materias?.length) {
        if (mode === 'replace') {
            await supabase.from('subjects').delete().eq('user_id', userId)
        }

        const items = data.estudos.materias.map(s => ({
            user_id: userId,
            name: s.nome,
            color: s.cor,
            level: s.nivel,
            xp_current: s.xp,
            xp_next_level: 100 * (s.nivel + 1)
        }))
        await supabase.from('subjects').insert(items)
        stats.estudos = items.length
    }

    return stats
}

/**
 * Deleta todos os eventos e tarefas do usuário
 */
export async function deleteAllAgenda(userId: string): Promise<{ eventos: number; tarefas: number }> {
    // Conta antes de deletar
    const { count: eventCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

    const { count: taskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

    // Deleta tudo
    const { error: eventsError } = await supabase
        .from('events')
        .delete()
        .eq('user_id', userId)

    if (eventsError) throw new Error('Erro ao deletar eventos: ' + eventsError.message)

    const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('user_id', userId)

    if (tasksError) throw new Error('Erro ao deletar tarefas: ' + tasksError.message)

    return {
        eventos: eventCount || 0,
        tarefas: taskCount || 0
    }
}
