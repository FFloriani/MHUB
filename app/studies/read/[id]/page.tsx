'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeft, Clock, CheckCircle, Calendar, ListTodo } from 'lucide-react'
import { db } from '@/lib/db'
import type { LocalFile } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import FocusPlayer from '@/components/studies/FocusPlayer'
import CheckoutModal from '@/components/studies/CheckoutModal'
import AddEventModal from '@/components/dashboard/AddEventModal'
import AddTaskModal from '@/components/dashboard/AddTaskModal'
import CompactAgenda from '@/components/studies/CompactAgenda'
import { createEvent, createRecurringEvent } from '@/lib/data/events'
import { createTask } from '@/lib/data/tasks'

const PDFReader = dynamic(() => import('@/components/studies/PDFReader'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full text-white">Iniciando Leitor...</div>
})

export default function ReaderPage() {
    const { id } = useParams()
    const router = useRouter()
    const [file, setFile] = useState<LocalFile | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [subject, setSubject] = useState<{ name: string } | null>(null)

    // Timer State
    const [seconds, setSeconds] = useState(0)
    const [isPaused, setIsPaused] = useState(false)
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

    // New Modals State
    const [isEventModalOpen, setIsEventModalOpen] = useState(false)
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

    useEffect(() => {
        loadBook()
    }, [id])

    // Timer Logic
    useEffect(() => {
        if (isPaused || isCheckoutOpen) return
        const interval = setInterval(() => setSeconds(s => s + 1), 1000)
        return () => clearInterval(interval)
    }, [isPaused, isCheckoutOpen])

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600)
        const m = Math.floor((totalSeconds % 3600) / 60)
        const s = totalSeconds % 60
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    const loadBook = async () => {
        if (!id) return
        try {
            const foundFile = await db.files.get(Number(id))
            if (foundFile) {
                setFile(foundFile)
                // Busca nome da matéria para o modal
                const { data } = await supabase.from('subjects').select('name').eq('id', foundFile.subjectId).single()
                if (data) setSubject(data)
            } else {
                alert('Livro não encontrado no dispositivo.')
                router.back()
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const handlePageUpdate = (page: number) => {
        if (file?.id) {
            db.files.update(file.id, { lastReadPage: page })
        }
    }

    const handleAddEvent = async (eventData: any) => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuário não autenticado')

            if (eventData.repeatDays && eventData.repeatDays.length > 0) {
                await createRecurringEvent({
                    user_id: user.id,
                    title: eventData.title,
                    start_time: eventData.startTime,
                    end_time: eventData.endTime,
                    description: eventData.description,
                    recurrence_days: eventData.repeatDays
                })
            } else {
                await createEvent({
                    user_id: user.id,
                    title: eventData.title,
                    start_time: eventData.startTime,
                    end_time: eventData.endTime,
                    description: eventData.description,
                    is_recurring: false
                })
            }

            alert('Compromisso agendado!')
        } catch (error: any) {
            console.error('Erro ao salvar evento:', error)
            alert('Erro ao salvar compromisso.') // O modal fecha sozinho ou precisa fechar? Se der erro mantém?
            // Para UX, se der erro, manter modal aberto pode ser bom. Mas vou apenas alertar e fechar por enquanto pois o modal não tem controle externo de loading/erro exposto via prop onSave.
            throw error
        }
    }

    const handleAddTask = async (title: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuário não autenticado')

            await createTask({
                user_id: user.id,
                title,
                target_date: new Date().toISOString().split('T')[0],
                is_completed: false
            })

            alert('Tarefa adicionada!')
        } catch (error: any) {
            console.error('Erro ao salvar tarefa:', error)
            alert('Erro ao salvar tarefa.')
            throw error
        }
    }

    if (isLoading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Carregando biblioteca...</div>
    if (!file) return null

    return (
        <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
            {/* Header com Timer */}
            <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 shrink-0 transition-colors hover:bg-gray-800/50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()} // Botão simples de voltar
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-medium text-sm hidden sm:inline">Voltar</span>
                    </button>

                    {/* New Action Buttons */}
                    <div className="flex items-center gap-1 border-l border-gray-700 pl-4 h-6">
                        <button
                            onClick={() => setIsEventModalOpen(true)}
                            className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-full transition-colors"
                            title="Novo Compromisso"
                        >
                            <Calendar size={18} />
                        </button>
                        <button
                            onClick={() => setIsTaskModalOpen(true)}
                            className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded-full transition-colors"
                            title="Nova Tarefa"
                        >
                            <ListTodo size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-gray-500 font-medium text-sm truncate max-w-[200px] hidden md:block">
                        {file.name}
                    </span>
                    <div className={`flex items-center gap-2 font-mono text-xl font-bold ${isPaused ? 'text-yellow-500' : 'text-indigo-400'}`}>
                        <Clock size={16} />
                        {formatTime(seconds)}
                    </div>
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className="text-xs text-gray-500 hover:text-white px-2 py-1 border border-gray-700 rounded"
                    >
                        {isPaused ? 'Retomar' : 'Pausar'}
                    </button>
                </div>

                <button
                    onClick={() => setIsCheckoutOpen(true)}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-green-900/20 transition-all hover:scale-105"
                >
                    <CheckCircle size={16} />
                    <span className="hidden sm:inline">Finalizar</span>
                </button>
            </div>

            {/* Reader Area */}
            <div className="flex-1 relative group bg-gray-900 overflow-hidden">
                <PDFReader
                    file={file}
                    onPageChange={handlePageUpdate}
                    initialPage={file.lastReadPage}
                />
            </div>

            {/* Focus Player Widget */}
            <FocusPlayer subjectId={file.subjectId} />

            {/* Compact Agenda Widget */}
            <CompactAgenda />

            {/* Checkout Modal */}
            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                subjectId={file.subjectId}
                subjectName={subject?.name || 'Estudos'}
                durationSeconds={seconds}
            />

            {/* New Modals */}
            <AddEventModal
                isOpen={isEventModalOpen}
                onClose={() => setIsEventModalOpen(false)}
                onSave={handleAddEvent}
                selectedDate={new Date()} // Padrão hoje
            />
            <AddTaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onSave={handleAddTask}
            />
        </div>
    )
}
