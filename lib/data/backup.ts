
import { supabase } from '../supabase'
import type { Database } from '../supabase'

type Tables = Database['public']['Tables']
type UserSettings = Tables['user_settings']['Row']
type Event = Tables['events']['Row']
type Task = Tables['tasks']['Row']

type FinanceCategory = Tables['finance_categories']['Row']
type FinanceTransaction = Tables['finance_transactions']['Row']
type FinanceRecurring = Tables['finance_recurring']['Row']
type FinanceInstallment = Tables['finance_installments']['Row']
type FinanceBudget = Tables['finance_budgets']['Row']
type FinanceLoan = Tables['finance_loans']['Row']
type FinanceLoanPayment = Tables['finance_loan_payments']['Row']

export interface BackupData {
    version: number
    timestap: string
    userId: string
    data: {
        userSettings: UserSettings | null
        events: Event[]
        tasks: Task[]
        financeCategories: FinanceCategory[]
        financeTransactions: FinanceTransaction[]
        financeRecurring: FinanceRecurring[]
        financeInstallments: FinanceInstallment[]
        financeBudgets: FinanceBudget[]
        financeLoans: FinanceLoan[]
        financeLoanPayments: FinanceLoanPayment[]
    }
}

/**
 * Exporta TODOS os dados do usuário para um objeto JSON
 */
export async function exportFullBackup(userId: string): Promise<BackupData> {
    const { data: userSettings, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

    if (settingsError) console.error('Error fetching settings:', settingsError)

    const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)

    if (eventsError) throw new Error('Falha ao exportar eventos: ' + eventsError.message)

    const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)

    if (tasksError) throw new Error('Falha ao exportar tarefas: ' + tasksError.message)

    const [
        catRes,
        txRes,
        recurringRes,
        installmentsRes,
        budgetsRes,
        loansRes,
        loanPaymentsRes,
    ] = await Promise.all([
        supabase.from('finance_categories').select('*').eq('user_id', userId),
        supabase.from('finance_transactions').select('*').eq('user_id', userId),
        supabase.from('finance_recurring').select('*').eq('user_id', userId),
        supabase.from('finance_installments').select('*').eq('user_id', userId),
        supabase.from('finance_budgets').select('*').eq('user_id', userId),
        supabase.from('finance_loans').select('*').eq('user_id', userId),
        supabase.from('finance_loan_payments').select('*').eq('user_id', userId),
    ])

    for (const r of [catRes, txRes, recurringRes, installmentsRes, budgetsRes, loansRes, loanPaymentsRes]) {
        if (r.error) throw new Error('Falha ao exportar dados financeiros: ' + r.error.message)
    }

    return {
        version: 2,
        timestap: new Date().toISOString(),
        userId,
        data: {
            userSettings: userSettings || null,
            events: events || [],
            tasks: tasks || [],
            financeCategories: catRes.data || [],
            financeTransactions: txRes.data || [],
            financeRecurring: recurringRes.data || [],
            financeInstallments: installmentsRes.data || [],
            financeBudgets: budgetsRes.data || [],
            financeLoans: loansRes.data || [],
            financeLoanPayments: loanPaymentsRes.data || [],
        },
    }
}

/**
 * Restaura o backup, substituindo os dados atuais
 */
export async function restoreFullBackup(userId: string, backup: BackupData): Promise<void> {
    if (!backup.data || !backup.version) {
        throw new Error('Arquivo de backup inválido ou corrompido.')
    }

    // Limpeza do financeiro (ordem inversa por causa das FKs)
    await supabase.from('finance_loan_payments').delete().eq('user_id', userId)
    await supabase.from('finance_loans').delete().eq('user_id', userId)
    await supabase.from('finance_budgets').delete().eq('user_id', userId)
    await supabase.from('finance_transactions').delete().eq('user_id', userId)
    await supabase.from('finance_installments').delete().eq('user_id', userId)
    await supabase.from('finance_recurring').delete().eq('user_id', userId)
    await supabase.from('finance_categories').delete().eq('user_id', userId)

    await supabase.from('tasks').delete().eq('user_id', userId)
    await supabase.from('events').delete().eq('user_id', userId)
    await supabase.from('user_settings').delete().eq('user_id', userId)

    const sanitize = <T extends Record<string, any>>(items: T[]): T[] =>
        items.map((item) => ({ ...item, user_id: userId }))

    if (backup.data.userSettings) {
        const { error } = await supabase
            .from('user_settings')
            .insert({ ...backup.data.userSettings, user_id: userId })
        if (error) console.error('Erro ao restaurar settings:', error)
    }

    if (backup.data.events?.length) {
        const { error } = await supabase.from('events').insert(sanitize(backup.data.events))
        if (error) throw new Error('Erro ao restaurar eventos: ' + error.message)
    }

    if (backup.data.tasks?.length) {
        const { error } = await supabase.from('tasks').insert(sanitize(backup.data.tasks))
        if (error) throw new Error('Erro ao restaurar tarefas: ' + error.message)
    }

    if (backup.data.financeCategories?.length) {
        const { error } = await supabase
            .from('finance_categories')
            .insert(sanitize(backup.data.financeCategories))
        if (error) throw new Error('Erro ao restaurar categorias: ' + error.message)
    }

    if (backup.data.financeRecurring?.length) {
        const { error } = await supabase
            .from('finance_recurring')
            .insert(sanitize(backup.data.financeRecurring))
        if (error) throw new Error('Erro ao restaurar recorrentes: ' + error.message)
    }

    if (backup.data.financeInstallments?.length) {
        const { error } = await supabase
            .from('finance_installments')
            .insert(sanitize(backup.data.financeInstallments))
        if (error) throw new Error('Erro ao restaurar parceladas: ' + error.message)
    }

    if (backup.data.financeTransactions?.length) {
        const { error } = await supabase
            .from('finance_transactions')
            .insert(sanitize(backup.data.financeTransactions))
        if (error) throw new Error('Erro ao restaurar transações: ' + error.message)
    }

    if (backup.data.financeBudgets?.length) {
        const { error } = await supabase
            .from('finance_budgets')
            .insert(sanitize(backup.data.financeBudgets))
        if (error) throw new Error('Erro ao restaurar orçamentos: ' + error.message)
    }

    if (backup.data.financeLoans?.length) {
        const { error } = await supabase
            .from('finance_loans')
            .insert(sanitize(backup.data.financeLoans))
        if (error) throw new Error('Erro ao restaurar empréstimos: ' + error.message)
    }

    if (backup.data.financeLoanPayments?.length) {
        const { error } = await supabase
            .from('finance_loan_payments')
            .insert(sanitize(backup.data.financeLoanPayments))
        if (error) throw new Error('Erro ao restaurar pagamentos de empréstimos: ' + error.message)
    }
}

// ============================================================
// BACKUP SIMPLIFICADO PARA LLMs
// ============================================================

export interface SimpleEvent {
    titulo: string
    data: string           // "2026-01-06"
    inicio: string         // "14:00"
    fim?: string
    descricao?: string
    repete?: string[]
}

export interface SimpleTask {
    titulo: string
    data: string
    concluida: boolean
}

export type SimpleKind = 'despesa' | 'receita' | 'investimento'

export interface SimpleTransaction {
    tipo: SimpleKind           // "despesa" | "receita" | "investimento"
    titulo: string
    valor: number
    data: string               // YYYY-MM-DD
    categoria?: string         // nome da categoria
    pagamento?: string         // forma de pagamento
    tags?: string[]
    pago?: boolean
    observacoes?: string
}

export interface SimpleRecurring {
    tipo: SimpleKind
    titulo: string
    valor: number
    dia: number                // dia do mês
    inicio: string
    fim?: string
    categoria?: string
    pagamento?: string
    ativo?: boolean
}

export interface SimpleLoan {
    pessoa: string
    direcao: 'emprestei' | 'peguei'
    valor: number
    data: string
    vencimento?: string
    status?: 'aberto' | 'parcial' | 'quitado'
    observacoes?: string
    pagamentos?: { valor: number; data: string; observacao?: string }[]
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
            transacoes?: SimpleTransaction[]
            recorrentes?: SimpleRecurring[]
            emprestimos?: SimpleLoan[]
        }
        estudos?: {
            materias?: SimpleSubject[]
        }
    }
}

export type BackupModule = 'eventos' | 'tarefas' | 'financeiro' | 'estudos'

const DAY_TO_PT: Record<number, string> = {
    0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab',
}

const PT_TO_DAY: Record<string, number> = {
    'dom': 0, 'seg': 1, 'ter': 2, 'qua': 3, 'qui': 4, 'sex': 5, 'sab': 6,
}

const SIMPLE_KIND_TO_DB: Record<SimpleKind, 'expense' | 'income' | 'investment'> = {
    despesa: 'expense',
    receita: 'income',
    investimento: 'investment',
}

const DB_KIND_TO_SIMPLE: Record<'expense' | 'income' | 'investment', SimpleKind> = {
    expense: 'despesa',
    income: 'receita',
    investment: 'investimento',
}

function formatLocalDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function formatLocalTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
}

function toSimpleEvent(event: Event): SimpleEvent {
    const startDate = new Date(event.start_time)
    const endDate = event.end_time ? new Date(event.end_time) : null

    const simple: SimpleEvent = {
        titulo: event.title,
        data: formatLocalDate(startDate),
        inicio: formatLocalTime(startDate),
    }

    if (endDate) simple.fim = formatLocalTime(endDate)
    if (event.description) simple.descricao = event.description
    if (event.is_recurring && event.recurrence_days?.length) {
        simple.repete = event.recurrence_days.map((d) => DAY_TO_PT[d])
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
        ? simple.repete!.map((d) => PT_TO_DAY[d.toLowerCase()]).filter((n) => n !== undefined)
        : null

    return {
        user_id: userId,
        title: simple.titulo,
        start_time: startTime.toISOString(),
        end_time: endTime?.toISOString() || null,
        description: simple.descricao || null,
        is_recurring: isRecurring,
        recurrence_days: recurrenceDays,
        recurrence_end_date: null,
    }
}

function toSimpleTask(task: Task): SimpleTask {
    return {
        titulo: task.title,
        data: task.target_date || new Date().toISOString().split('T')[0],
        concluida: task.is_completed,
    }
}

function fromSimpleTask(simple: SimpleTask, userId: string): Omit<Task, 'id'> {
    return {
        user_id: userId,
        title: simple.titulo,
        target_date: simple.data,
        is_completed: simple.concluida,
    }
}

export type DateFilterOption = 'future' | 'today' | 'all'

export interface SimpleBackupOptions {
    dateFilter: DateFilterOption
    includeRecurring: boolean
}

export async function exportSimpleBackup(
    userId: string,
    modules: BackupModule[],
    options: SimpleBackupOptions = { dateFilter: 'future', includeRecurring: false },
): Promise<SimpleBackupData> {
    const backup: SimpleBackupData = {
        mhub_backup: {
            versao: 2,
            data_criacao: new Date().toISOString().split('T')[0],
            modulos: modules,
        },
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    let dateFilterStart: Date | null = null
    let dateFilterEnd: Date | null = null

    switch (options.dateFilter) {
        case 'future':
            dateFilterStart = today
            break
        case 'today':
            dateFilterStart = today
            dateFilterEnd = tomorrow
            break
        case 'all':
            dateFilterStart = null
            break
    }

    // Eventos
    if (modules.includes('eventos')) {
        let allEvents: Event[] = []

        let query = supabase
            .from('events')
            .select('*')
            .eq('user_id', userId)
            .eq('is_recurring', false)
            .order('start_time', { ascending: true })

        if (dateFilterStart) query = query.gte('start_time', dateFilterStart.toISOString())
        if (dateFilterEnd) query = query.lt('start_time', dateFilterEnd.toISOString())

        const { data: events } = await query
        allEvents = events || []

        if (options.includeRecurring) {
            const { data: recurringEvents } = await supabase
                .from('events')
                .select('*')
                .eq('user_id', userId)
                .eq('is_recurring', true)
                .order('start_time', { ascending: true })
            allEvents = [...allEvents, ...(recurringEvents || [])]
        }

        allEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        backup.mhub_backup.eventos = allEvents.map(toSimpleEvent)
    }

    // Tarefas
    if (modules.includes('tarefas')) {
        let query = supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId)
            .order('target_date', { ascending: true })

        if (dateFilterStart) query = query.gte('target_date', formatLocalDate(dateFilterStart))

        const { data: tasks } = await query
        backup.mhub_backup.tarefas = (tasks || []).map(toSimpleTask)
    }

    // Financeiro
    if (modules.includes('financeiro')) {
        const [catsRes, txRes, recRes, loansRes, paysRes] = await Promise.all([
            supabase.from('finance_categories').select('*').eq('user_id', userId),
            supabase.from('finance_transactions').select('*').eq('user_id', userId).order('occurred_on', { ascending: false }),
            supabase.from('finance_recurring').select('*').eq('user_id', userId),
            supabase.from('finance_loans').select('*').eq('user_id', userId).order('taken_on', { ascending: false }),
            supabase.from('finance_loan_payments').select('*').eq('user_id', userId).order('paid_on', { ascending: false }),
        ])

        const catsById = new Map<string, FinanceCategory>()
        for (const c of catsRes.data || []) catsById.set(c.id, c)

        const txs = (txRes.data || []) as FinanceTransaction[]
        const transacoes: SimpleTransaction[] = txs.map((t) => ({
            tipo: DB_KIND_TO_SIMPLE[t.kind as 'expense' | 'income' | 'investment'],
            titulo: t.title,
            valor: Number(t.amount),
            data: t.occurred_on,
            categoria: t.category_id ? catsById.get(t.category_id)?.name : undefined,
            pagamento: t.payment_method ?? undefined,
            tags: t.tags?.length ? t.tags : undefined,
            pago: t.paid,
            observacoes: t.notes ?? undefined,
        }))

        const recs = (recRes.data || []) as FinanceRecurring[]
        const recorrentes: SimpleRecurring[] = recs.map((r) => ({
            tipo: DB_KIND_TO_SIMPLE[r.kind as 'expense' | 'income' | 'investment'],
            titulo: r.title,
            valor: Number(r.amount),
            dia: r.day_of_month,
            inicio: r.start_date,
            fim: r.end_date ?? undefined,
            categoria: r.category_id ? catsById.get(r.category_id)?.name : undefined,
            pagamento: r.payment_method ?? undefined,
            ativo: r.active,
        }))

        const paymentsByLoan = new Map<string, FinanceLoanPayment[]>()
        for (const p of paysRes.data || []) {
            const arr = paymentsByLoan.get(p.loan_id) ?? []
            arr.push(p)
            paymentsByLoan.set(p.loan_id, arr)
        }

        const emprestimos: SimpleLoan[] = (loansRes.data || []).map((l) => ({
            pessoa: l.counterpart_name,
            direcao: l.direction === 'lent' ? 'emprestei' : 'peguei',
            valor: Number(l.principal),
            data: l.taken_on,
            vencimento: l.due_date ?? undefined,
            status: l.status === 'open' ? 'aberto' : l.status === 'partial' ? 'parcial' : 'quitado',
            observacoes: l.notes ?? undefined,
            pagamentos: (paymentsByLoan.get(l.id) || []).map((p) => ({
                valor: Number(p.amount),
                data: p.paid_on,
                observacao: p.notes ?? undefined,
            })),
        }))

        backup.mhub_backup.financeiro = { transacoes, recorrentes, emprestimos }
    }

    // Estudos
    if (modules.includes('estudos')) {
        const { data: subjects } = await supabase
            .from('subjects')
            .select('*')
            .eq('user_id', userId)

        backup.mhub_backup.estudos = {
            materias: (subjects || []).map((s) => ({
                nome: s.name,
                cor: s.color,
                nivel: s.level,
                xp: s.xp_current,
            })),
        }
    }

    return backup
}

export function detectBackupModules(backup: any): {
    eventos: number
    tarefas: number
    financeiro: { transacoes: number; recorrentes: number; emprestimos: number } | null
    estudos: number
} {
    const data = backup?.mhub_backup
    return {
        eventos: Array.isArray(data?.eventos) ? data.eventos.length : 0,
        tarefas: Array.isArray(data?.tarefas) ? data.tarefas.length : 0,
        financeiro: data?.financeiro
            ? {
                  transacoes: Array.isArray(data.financeiro.transacoes) ? data.financeiro.transacoes.length : 0,
                  recorrentes: Array.isArray(data.financeiro.recorrentes) ? data.financeiro.recorrentes.length : 0,
                  emprestimos: Array.isArray(data.financeiro.emprestimos) ? data.financeiro.emprestimos.length : 0,
              }
            : null,
        estudos: Array.isArray(data?.estudos?.materias) ? data.estudos.materias.length : 0,
    }
}

/**
 * Garante que cada nome de categoria do backup tenha um id no banco; cria as faltantes.
 * Retorna um Map<nome+kind, id>.
 */
async function ensureCategoryIds(
    userId: string,
    needed: Array<{ name: string; kind: 'expense' | 'income' | 'investment' }>,
): Promise<Map<string, string>> {
    const result = new Map<string, string>()
    if (needed.length === 0) return result

    const { data: existing } = await supabase
        .from('finance_categories')
        .select('id, name, kind')
        .eq('user_id', userId)

    const map = new Map<string, string>()
    for (const c of existing || []) map.set(`${c.name.toLowerCase()}|${c.kind}`, c.id)

    const toCreate: { user_id: string; name: string; kind: 'expense' | 'income' | 'investment' }[] = []
    const seen = new Set<string>()
    for (const n of needed) {
        const key = `${n.name.toLowerCase()}|${n.kind}`
        if (seen.has(key)) continue
        seen.add(key)
        if (!map.has(key)) {
            toCreate.push({ user_id: userId, name: n.name, kind: n.kind })
        }
    }

    if (toCreate.length > 0) {
        const { data: created } = await supabase
            .from('finance_categories')
            .insert(toCreate)
            .select('id, name, kind')
        for (const c of created || []) map.set(`${c.name.toLowerCase()}|${c.kind}`, c.id)
    }

    map.forEach((v, k) => result.set(k, v))
    return result
}

export async function restoreSimpleBackup(
    userId: string,
    backup: SimpleBackupData,
    mode: 'replace' | 'merge' | 'update' = 'merge',
): Promise<{ eventos: number; tarefas: number; financeiro: number; estudos: number; atualizados?: number }> {
    const data = backup.mhub_backup
    const stats = { eventos: 0, tarefas: 0, financeiro: 0, estudos: 0, atualizados: 0 }

    // Eventos (sem mudança em relação à versão anterior)
    if (data.eventos?.length) {
        if (mode === 'replace') {
            await supabase.from('events').delete().eq('user_id', userId)
            const eventsToInsert = data.eventos.map((e) => fromSimpleEvent(e, userId))
            const { error } = await supabase.from('events').insert(eventsToInsert)
            if (error) throw new Error('Erro ao importar eventos: ' + error.message)
            stats.eventos = eventsToInsert.length
        } else if (mode === 'merge') {
            const eventsToInsert = data.eventos.map((e) => fromSimpleEvent(e, userId))
            const { error } = await supabase.from('events').insert(eventsToInsert)
            if (error) throw new Error('Erro ao importar eventos: ' + error.message)
            stats.eventos = eventsToInsert.length
        } else if (mode === 'update') {
            const { data: existingEvents } = await supabase
                .from('events')
                .select('*')
                .eq('user_id', userId)

            for (const simpleEvent of data.eventos) {
                const eventData = fromSimpleEvent(simpleEvent, userId)
                const existing = existingEvents?.find((e) => {
                    const existingDate = new Date(e.start_time)
                    const newDate = new Date(eventData.start_time)
                    const sameTitle = e.title.toLowerCase() === eventData.title.toLowerCase()
                    const sameDate = existingDate.toDateString() === newDate.toDateString()
                    const sameTime =
                        existingDate.getHours() === newDate.getHours() &&
                        existingDate.getMinutes() === newDate.getMinutes()
                    return sameTitle && sameDate && sameTime
                })

                if (existing) {
                    const { error } = await supabase
                        .from('events')
                        .update({
                            title: eventData.title,
                            description: eventData.description,
                            start_time: eventData.start_time,
                            end_time: eventData.end_time,
                            is_recurring: eventData.is_recurring,
                            recurrence_days: eventData.recurrence_days,
                        })
                        .eq('id', existing.id)
                    if (error) throw new Error('Erro ao atualizar evento: ' + error.message)
                    stats.atualizados++
                } else {
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
            const { data: existingTasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', userId)

            for (const simpleTask of data.tarefas) {
                const taskData = fromSimpleTask(simpleTask, userId)
                const existing = existingTasks?.find(
                    (t) =>
                        t.title.toLowerCase() === taskData.title.toLowerCase() &&
                        t.target_date === taskData.target_date,
                )
                if (existing) {
                    const { error } = await supabase
                        .from('tasks')
                        .update({
                            title: taskData.title,
                            is_completed: taskData.is_completed,
                            target_date: taskData.target_date,
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
            const tasksToInsert = data.tarefas.map((t) => fromSimpleTask(t, userId))
            const { error } = await supabase.from('tasks').insert(tasksToInsert)
            if (error) throw new Error('Erro ao importar tarefas: ' + error.message)
            stats.tarefas = tasksToInsert.length
        }
    }

    // Financeiro
    if (data.financeiro) {
        if (mode === 'replace') {
            await supabase.from('finance_loan_payments').delete().eq('user_id', userId)
            await supabase.from('finance_loans').delete().eq('user_id', userId)
            await supabase.from('finance_transactions').delete().eq('user_id', userId)
            await supabase.from('finance_recurring').delete().eq('user_id', userId)
        }

        const txs = data.financeiro.transacoes || []
        const recs = data.financeiro.recorrentes || []
        const loans = data.financeiro.emprestimos || []

        const needed: { name: string; kind: 'expense' | 'income' | 'investment' }[] = []
        for (const t of txs) if (t.categoria) needed.push({ name: t.categoria, kind: SIMPLE_KIND_TO_DB[t.tipo] })
        for (const r of recs) if (r.categoria) needed.push({ name: r.categoria, kind: SIMPLE_KIND_TO_DB[r.tipo] })

        const catMap = await ensureCategoryIds(userId, needed)
        const idFor = (name: string | undefined, kind: SimpleKind): string | null => {
            if (!name) return null
            return catMap.get(`${name.toLowerCase()}|${SIMPLE_KIND_TO_DB[kind]}`) ?? null
        }

        let count = 0
        if (txs.length) {
            const items = txs.map((t) => ({
                user_id: userId,
                kind: SIMPLE_KIND_TO_DB[t.tipo],
                title: t.titulo,
                amount: t.valor,
                occurred_on: t.data,
                category_id: idFor(t.categoria, t.tipo),
                payment_method: t.pagamento ?? null,
                tags: t.tags ?? [],
                paid: t.pago ?? true,
                notes: t.observacoes ?? null,
            }))
            const { error } = await supabase.from('finance_transactions').insert(items)
            if (error) throw new Error('Erro ao importar transações: ' + error.message)
            count += items.length
        }

        if (recs.length) {
            const items = recs.map((r) => ({
                user_id: userId,
                kind: SIMPLE_KIND_TO_DB[r.tipo],
                title: r.titulo,
                amount: r.valor,
                day_of_month: r.dia,
                start_date: r.inicio,
                end_date: r.fim ?? null,
                category_id: idFor(r.categoria, r.tipo),
                payment_method: r.pagamento ?? null,
                active: r.ativo ?? true,
            }))
            const { error } = await supabase.from('finance_recurring').insert(items)
            if (error) throw new Error('Erro ao importar recorrentes: ' + error.message)
            count += items.length
        }

        if (loans.length) {
            for (const l of loans) {
                const { data: created, error } = await supabase
                    .from('finance_loans')
                    .insert({
                        user_id: userId,
                        counterpart_name: l.pessoa,
                        direction: l.direcao === 'emprestei' ? 'lent' : 'borrowed',
                        principal: l.valor,
                        taken_on: l.data,
                        due_date: l.vencimento ?? null,
                        notes: l.observacoes ?? null,
                    })
                    .select('id')
                    .single()
                if (error) throw new Error('Erro ao importar empréstimo: ' + error.message)
                count += 1

                if (l.pagamentos?.length && created) {
                    const payments = l.pagamentos.map((p) => ({
                        user_id: userId,
                        loan_id: created.id,
                        amount: p.valor,
                        paid_on: p.data,
                        notes: p.observacao ?? null,
                    }))
                    const { error: payErr } = await supabase.from('finance_loan_payments').insert(payments)
                    if (payErr) throw new Error('Erro ao importar pagamentos: ' + payErr.message)
                    count += payments.length
                }
            }
        }

        stats.financeiro = count
    }

    // Estudos
    if (data.estudos?.materias?.length) {
        if (mode === 'replace') {
            await supabase.from('subjects').delete().eq('user_id', userId)
        }
        const items = data.estudos.materias.map((s) => ({
            user_id: userId,
            name: s.nome,
            color: s.cor,
            level: s.nivel,
            xp_current: s.xp,
            xp_next_level: 100 * (s.nivel + 1),
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
    const { count: eventCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

    const { count: taskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

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
        tarefas: taskCount || 0,
    }
}
