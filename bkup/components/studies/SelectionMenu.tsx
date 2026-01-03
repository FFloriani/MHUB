'use client'

import { useState, useEffect } from 'react'
import { Copy, StickyNote, Check, X } from 'lucide-react'

interface SelectionMenuProps {
    position: { top: number; left: number } | null
    selectedText: string
    onClose: () => void
    onAddNote: (text: string, note: string) => void
}

export default function SelectionMenu({ position, selectedText, onClose, onAddNote }: SelectionMenuProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [noteText, setNoteText] = useState('')
    const [justCopied, setJustCopied] = useState(false)

    // Efeito de entrada suave
    const [isVisible, setIsVisible] = useState(false)
    useEffect(() => {
        if (position) {
            setIsVisible(true)
            setIsExpanded(false)
            setNoteText('')
        } else {
            setIsVisible(false)
        }
    }, [position])

    if (!position || !isVisible) return null

    const handleCopy = () => {
        navigator.clipboard.writeText(selectedText)
        setJustCopied(true)
        setTimeout(() => setJustCopied(false), 2000)
    }

    const handleSubmitNote = () => {
        if (noteText.trim()) {
            onAddNote(selectedText, noteText)
            setIsExpanded(false)
            setNoteText('')
            onClose() // Fecha o menu após salvar
        }
    }

    return (
        <div
            onMouseUp={(e) => e.stopPropagation()} // BLINDAGEM: Impede que cliques aqui fechem o menu
            className="selection-menu-container fixed z-[60] flex items-center gap-1 p-1 bg-gray-900/90 text-white backdrop-blur-md border border-white/10 rounded-full shadow-2xl transition-all duration-300 ease-out origin-bottom"
            style={{
                top: position.top - 40, // 40px acima da seleção
                left: position.left,
                transform: 'translateX(-50%)' // Centraliza
            }}
        >
            {!isExpanded ? (
                <>
                    <button
                        onClick={() => setIsExpanded(true)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-yellow-400 group relative"
                        title="Adicionar Nota"
                    >
                        <StickyNote size={18} />
                    </button>

                    <div className="w-px h-4 bg-white/20 mx-1" />

                    <button
                        onClick={handleCopy}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors relative"
                        title="Copiar Texto"
                    >
                        {justCopied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                    </button>

                    {/* Botão de Fechar Rápido (opcional, para limpar seleção visualmente) */}
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-red-400"
                    >
                        <X size={14} />
                    </button>
                </>
            ) : (
                <div className="flex items-center animate-in slide-in-from-left-2 duration-200">
                    <input
                        autoFocus
                        type="text"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Digite sua nota..."
                        className="bg-transparent border-none outline-none text-sm text-white placeholder-gray-400 px-3 w-48 font-medium h-full"
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmitNote()}
                    />
                    <button
                        onClick={handleSubmitNote}
                        className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-colors mr-1"
                    >
                        <Check size={14} />
                    </button>
                    <button
                        onClick={() => setIsExpanded(false)}
                        className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Setinha apontando para baixo (triângulo) */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900/90 border-r border-b border-white/10 rotate-45" />
        </div>
    )
}
