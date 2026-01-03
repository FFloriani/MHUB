'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, Clock, Trophy, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface CheckoutModalProps {
    isOpen: boolean
    onClose: () => void
    subjectId: string
    subjectName: string
    durationSeconds: number
}

export default function CheckoutModal({ isOpen, onClose, subjectId, subjectName, durationSeconds }: CheckoutModalProps) {
    const router = useRouter()
    const [notes, setNotes] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    // Formata segundos para HH:MM:SS
    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }

    // Calcula XP (ex: 1 XP por minuto)
    const xpEarned = Math.floor(durationSeconds / 60) * 1

    const handleConfirm = async () => {
        setIsSaving(true)
        try {
            // Verificar Auth
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                throw new Error('Usuário não autenticado')
            }

            // Calcular horários obrigatórios
            const endTime = new Date()
            const startTime = new Date(endTime.getTime() - (durationSeconds * 1000))

            // 1. Salvar Sessão
            const { error: sessionError } = await supabase.from('study_sessions').insert({
                user_id: user.id,
                subject_id: subjectId,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                duration_minutes: Math.round(durationSeconds / 60),
                notes: notes,
                xp_earned: xpEarned,
            })

            if (sessionError) throw sessionError

            // 2. Atualizar XP da Matéria
            const { data: subject } = await supabase.from('subjects').select('xp_current, level').eq('id', subjectId).single()

            if (subject) {
                const newXp = (subject.xp_current || 0) + xpEarned
                const newLevel = Math.floor(newXp / 1000) + 1

                await supabase.from('subjects').update({
                    xp_current: newXp,
                    level: newLevel
                }).eq('id', subjectId)
            }

            // Sucesso!
            router.push('/studies')
        } catch (error: any) {
            console.error('Erro ao salvar sessão:', error)
            alert(`Erro ao salvar progresso: ${error.message || 'Tente novamente.'}`)
            setIsSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative bg-white dark:bg-gray-900 rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-800"
                >
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full dark:hover:bg-gray-800 transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>

                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Sessão Finalizada!</h2>
                        <p className="text-gray-500 dark:text-gray-400">Ótimo foco em <span className="font-semibold text-indigo-500">{subjectName}</span></p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl flex flex-col items-center justify-center gap-2">
                            <Clock size={24} className="text-blue-500" />
                            <span className="text-2xl font-bold dark:text-white">{formatTime(durationSeconds)}</span>
                            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Tempo</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl flex flex-col items-center justify-center gap-2">
                            <Trophy size={24} className="text-yellow-500" />
                            <span className="text-2xl font-bold dark:text-white">+{xpEarned}</span>
                            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">XP Ganho</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notas da Sessão (Opcional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="O que você aprendeu hoje?"
                                className="w-full h-24 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-none rounded-xl p-4 resize-none focus:ring-2 focus:ring-indigo-500 outline-none placeholder-gray-400 dark:placeholder-gray-500"
                            />
                        </div>

                        <button
                            onClick={handleConfirm}
                            disabled={isSaving}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'Salvando...' : (
                                <>
                                    <Save size={20} />
                                    Confirmar e Receber XP
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
