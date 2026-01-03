'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, BookOpen, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'
import { ActivityCalendar } from 'react-activity-calendar'
import AddSubjectModal from '@/components/studies/AddSubjectModal'

type Subject = Database['public']['Tables']['subjects']['Row']

export default function StudiesPage() {
    const router = useRouter()
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)

    useEffect(() => {
        fetchSubjects()
    }, [])

    const fetchSubjects = async () => {
        try {
            const { data, error } = await supabase
                .from('subjects')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setSubjects(data || [])
        } catch (error) {
            console.error('Erro ao buscar matérias:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            {/* Header & Heatmap Area */}
            <div className="flex flex-col xl:flex-row gap-6">
                <div className="flex-1 space-y-2">
                    <h1 className="text-3xl font-extrabold tracking-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                            Knowledge Garden
                        </span>
                    </h1>
                    <p className="text-gray-500 font-medium">
                        Cultive suas habilidades e acompanhe seu progresso.
                    </p>
                </div>

                {/* Placeholder Heatmap (Futuro) */}
                <div className="bg-white/50 p-4 rounded-xl border border-white/20 shadow-sm overflow-hidden flex items-center justify-center">
                    <p className="text-xs text-gray-400">Heatmap de inconsistência (Em Breve)</p>
                </div>
            </div>

            {/* Grid de Subjects */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Card de Adicionar */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="aspect-video rounded-3xl border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50 flex flex-col items-center justify-center gap-3 transition-all group"
                    onClick={() => setIsModalOpen(true)}
                >
                    <div className="p-3 bg-white rounded-full shadow-sm group-hover:shadow-md transition-all">
                        <Plus className="w-6 h-6 text-indigo-500" />
                    </div>
                    <span className="font-semibold text-gray-400 group-hover:text-indigo-600">Nova Matéria</span>
                </motion.button>

                {/* Cards das Matérias */}
                {subjects.map((subject) => (
                    <motion.div
                        key={subject.id}
                        layoutId={`card-${subject.id}`}
                        onClick={() => router.push(`/studies/${subject.id}`)}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        className={`aspect-video rounded-3xl p-6 relative overflow-hidden bg-gradient-to-br ${subject.color || 'from-gray-100 to-gray-200'} text-white shadow-lg cursor-pointer hover:shadow-xl transition-all`}
                    >
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                                <h3 className="text-xl font-bold">{subject.name}</h3>
                                <p className="text-white/80 text-sm">Nível {subject.level}</p>
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-medium opacity-90">
                                    <span>XP</span>
                                    <span>{subject.xp_current} / {subject.xp_next_level}</span>
                                </div>
                                {/* Barra de Progresso */}
                                <div className="h-2 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
                                    <div
                                        className="h-full bg-white/90 rounded-full transition-all duration-500"
                                        style={{ width: `${(subject.xp_current / subject.xp_next_level) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Background Decoration */}
                        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    </motion.div>
                ))}
            </div>

            <AddSubjectModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchSubjects}
            />
        </div>
    )
}
