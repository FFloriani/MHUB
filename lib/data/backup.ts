
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
