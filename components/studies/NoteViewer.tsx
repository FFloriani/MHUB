'use client'

import { X, Trash2 } from 'lucide-react'

interface NoteViewerProps {
    annotation: any
    position: { top: number; left: number }
    onClose: () => void
    onDelete: (id: number) => void
}

export default function NoteViewer({ annotation, position, onClose, onDelete }: NoteViewerProps) {
    if (!annotation) return null

    return (
        <div
            className="fixed z-[70] w-64 bg-gray-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-200 p-4"
            style={{
                top: position.top, // Vai ficar logo abaixo ou acima da marcação
                left: position.left,
                transform: 'translate(-50%, 10px)' // Centraliza e dá um respiro
            }}
        >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Nota</span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onDelete(annotation.id)}
                        className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-red-400 transition-colors"
                        title="Excluir"
                    >
                        <Trash2 size={12} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Conteúdo */}
            <div className="space-y-2">
                {/* A citação (Texto marcado) */}
                <div className="pl-2 border-l-2 border-yellow-500/30">
                    <p className="text-gray-400 text-xs italic line-clamp-3">
                        &quot;{annotation.quote}&quot;
                    </p>
                </div>

                {/* A nota do usuário */}
                <p className="text-sm font-medium text-gray-200 leading-relaxed">
                    {annotation.note}
                </p>
            </div>

            {/* Setinha visual (Triângulo) */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900/95 border-l border-t border-white/10 rotate-45" />
        </div>
    )
}
