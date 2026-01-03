'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/AuthProvider'

interface AddSubjectModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

const COLORS = [
    { name: 'Indigo', value: 'from-indigo-500 to-purple-600' },
    { name: 'Emerald', value: 'from-emerald-500 to-teal-600' },
    { name: 'Orange', value: 'from-orange-500 to-amber-600' },
    { name: 'Rose', value: 'from-rose-500 to-pink-600' },
    { name: 'Blue', value: 'from-blue-500 to-cyan-600' },
    { name: 'Violet', value: 'from-violet-500 to-fuchsia-600' },
]

export default function AddSubjectModal({ isOpen, onClose, onSuccess }: AddSubjectModalProps) {
    const { user } = useAuth()
    const [name, setName] = useState('')
    const [selectedColor, setSelectedColor] = useState(COLORS[0].value)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !name.trim()) return

        try {
            setIsLoading(true)
            const { error } = await supabase
                .from('subjects')
                .insert({
                    user_id: user.id,
                    name: name.trim(),
                    color: selectedColor,
                    level: 1,
                    xp_current: 0,
                    xp_next_level: 1000
                })

            if (error) throw error

            onSuccess()
            onClose()
            setName('')
        } catch (error) {
            console.error('Erro ao criar matéria:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 p-6 border border-gray-100"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Nova Matéria</h2>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Nome da Habilidade</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Inglês, Programação, Investimentos..."
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-700">Cor do Card</label>
                                <div className="grid grid-cols-6 gap-2">
                                    {COLORS.map((color) => (
                                        <button
                                            key={color.name}
                                            type="button"
                                            onClick={() => setSelectedColor(color.value)}
                                            className={`w-full aspect-square rounded-full bg-gradient-to-br ${color.value} relative shadow-sm hover:scale-110 transition-transform`}
                                        >
                                            {selectedColor === color.value && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Check size={16} className="text-white drop-shadow-md" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading || !name.trim()}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                >
                                    {isLoading ? 'Criando...' : 'Criar Matéria'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
