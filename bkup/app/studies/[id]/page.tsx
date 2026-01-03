'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Upload, FileText, Trash2, BookOpen } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { db, type LocalFile } from '@/lib/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'

export default function SubjectPage() {
    const { id } = useParams()
    const router = useRouter()
    const [subject, setSubject] = useState<any>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isLoadingSubject, setIsLoadingSubject] = useState(true)

    // Busca Arquivos Locais (Reativo)
    const files = useLiveQuery(
        () => db.files.where('subjectId').equals(id as string).toArray(),
        [id]
    )

    useEffect(() => {
        fetchSubject()
    }, [id])

    const fetchSubject = async () => {
        if (!id) return
        const { data, error } = await supabase
            .from('subjects')
            .select('*')
            .eq('id', id)
            .single()

        if (!error && data) {
            setSubject(data)
        }
        setIsLoadingSubject(false)
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
        let uploadedFiles: FileList | null = null

        if ('dataTransfer' in e) {
            e.preventDefault()
            uploadedFiles = e.dataTransfer.files
            setIsDragging(false)
        } else {
            uploadedFiles = e.target.files
        }

        if (!uploadedFiles || uploadedFiles.length === 0) return

        const file = uploadedFiles[0]
        if (file.type !== 'application/pdf') {
            alert('Por favor, envie apenas arquivos PDF.')
            return
        }

        try {
            // Salvar no IndexedDB
            await db.files.add({
                subjectId: id as string,
                file: file, // Blob direto
                name: file.name,
                type: file.type,
                size: file.size,
                lastReadPage: 1,
                createdAt: new Date()
            })
        } catch (error) {
            console.error('Erro ao salvar arquivo:', error)
            alert('Erro ao salvar livro. Verifique espaço em disco.')
        }
    }

    const deleteFile = async (fileId: number) => {
        if (confirm('Tem certeza que deseja remover este livro?')) {
            await db.files.delete(fileId)
        }
    }

    if (isLoadingSubject) return <div className="p-8">Carregando...</div>
    if (!subject) return <div className="p-8">Matéria não encontrada</div>

    return (
        <div className="space-y-8 min-h-screen"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
            onDrop={handleFileUpload}
        >
            {/* Drag Overlay */}
            {isDragging && (
                <div className="fixed inset-0 bg-indigo-500/10 backdrop-blur-sm border-4 border-indigo-500 border-dashed z-50 flex items-center justify-center pointer-events-none">
                    <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center gap-4 animate-bounce">
                        <Upload size={48} className="text-indigo-500" />
                        <h3 className="text-2xl font-bold text-indigo-600">Solte o PDF aqui</h3>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className={`rounded-3xl p-8 text-white relative overflow-hidden bg-gradient-to-r ${subject.color}`}>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
                        >
                            <ArrowLeft />
                        </button>
                        <div>
                            <h1 className="text-4xl font-extrabold">{subject.name}</h1>
                            <p className="text-white/80 font-medium">Biblioteca Local</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-black/20 p-4 rounded-2xl backdrop-blur-sm">
                        <div className="text-right">
                            <p className="text-xs text-white/70">Nível {subject.level}</p>
                            <p className="font-bold text-xl">{subject.xp_current} XP</p>
                        </div>
                        <div className="h-10 w-1 bg-white/20 rounded-full" />
                        <label className="cursor-pointer bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-indigo-50 transition-colors flex items-center gap-2">
                            <Upload size={18} />
                            Adicionar PDF
                            <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                        </label>
                    </div>
                </div>

                {/* Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            </div>

            {/* Books Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {files?.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl text-gray-400">
                        <FileText size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg">Nenhum livro adicionado ainda.</p>
                        <p className="text-sm">Arraste um PDF para cá ou clique em Adicionar.</p>
                    </div>
                )}

                {files?.map(file => (
                    <motion.div
                        key={file.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group relative bg-white rounded-2xl p-4 shadow-sm hover:shadow-md border border-gray-100 transition-all cursor-pointer"
                        onClick={() => router.push(`/studies/read/${file.id}`)}
                    >
                        <div className="aspect-[3/4] bg-gray-100 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                            {/* Placeholder Cover - Futuramente react-pdf pode gerar thumbnail */}
                            <div className="text-center p-4">
                                <FileText size={40} className="mx-auto mb-2 text-gray-300" />
                                <span className="text-xs text-gray-400 font-mono">PDF</span>
                            </div>

                            {/* Hover Action */}
                            <div className="absolute inset-0 bg-indigo-500/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center flex-col gap-2 text-white">
                                <BookOpen size={32} />
                                <span className="font-bold">Ler Agora</span>
                            </div>
                        </div>

                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <h3 className="font-semibold text-gray-800 line-clamp-2 text-sm" title={file.name}>{file.name}</h3>
                                <p className="text-xs text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteFile(file.id!); }}
                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
