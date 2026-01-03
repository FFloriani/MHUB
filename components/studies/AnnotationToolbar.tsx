'use client'

import { motion } from 'framer-motion'
import { Hand, Pen, Highlighter, Eraser, Undo, Redo, Trash2, MousePointer2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToolType = 'hand' | 'pen' | 'highlighter' | 'eraser'

interface AnnotationToolbarProps {
    currentTool: ToolType
    onToolChange: (tool: ToolType) => void
    currentColor: string
    onColorChange: (color: string) => void
    currentWidth: number
    onWidthChange: (width: number) => void
    canUndo: boolean
    canRedo: boolean
    onUndo: () => void
    onRedo: () => void
    onClear: () => void
}

const COLORS = [
    '#000000', // Preto
    '#ef4444', // Vermelho
    '#22c55e', // Verde
    '#3b82f6', // Azul
    '#a855f7', // Roxo
    '#facc15', // Amarelo (Highlighter)
]

export default function AnnotationToolbar({
    currentTool,
    onToolChange,
    currentColor,
    onColorChange,
    currentWidth,
    onWidthChange,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onClear
}: AnnotationToolbarProps) {
    return (
        <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="fixed left-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-4 p-3 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
        >
            {/* Ferramentas Principais */}
            <div className="flex flex-col gap-2">
                <ToolButton
                    active={currentTool === 'hand'}
                    onClick={() => onToolChange('hand')}
                    icon={MousePointer2}
                    label="Navegar"
                />
                <ToolButton
                    active={currentTool === 'pen'}
                    onClick={() => onToolChange('pen')}
                    icon={Pen}
                    label="Caneta"
                />
                <ToolButton
                    active={currentTool === 'highlighter'}
                    onClick={() => onToolChange('highlighter')}
                    icon={Highlighter}
                    label="Marca-Texto"
                />
                <ToolButton
                    active={currentTool === 'eraser'}
                    onClick={() => onToolChange('eraser')}
                    icon={Eraser}
                    label="Borracha"
                />
            </div>

            <div className="w-full h-px bg-white/10" />

            {/* Configurações (Só aparece se não for Hand ou Eraser) */}
            {(currentTool === 'pen' || currentTool === 'highlighter') && (
                <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-left-2 items-center">
                    {/* Cores */}
                    <div className="grid grid-cols-2 gap-1.5">
                        {COLORS.map(color => (
                            <button
                                key={color}
                                onClick={() => onColorChange(color)}
                                className={cn(
                                    "w-5 h-5 rounded-full border border-white/10 transition-transform hover:scale-110",
                                    currentColor === color && "ring-2 ring-white scale-110"
                                )}
                                style={{ backgroundColor: color }}
                                title={color}
                            />
                        ))}
                    </div>

                    {/* Espessura */}
                    <input
                        type="range"
                        min={1}
                        max={20}
                        value={currentWidth}
                        onChange={(e) => onWidthChange(Number(e.target.value))}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white mt-1"
                        title="Espessura"
                    />
                </div>
            )}

            <div className="w-full h-px bg-white/10" />

            {/* Ações */}
            <div className="flex flex-col gap-2">
                <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 rounded-xl transition-colors"
                    title="Desfazer"
                >
                    <Undo size={18} />
                </button>
                <button
                    onClick={onRedo}
                    disabled={!canRedo}
                    className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 rounded-xl transition-colors"
                    title="Refazer"
                >
                    <Redo size={18} />
                </button>
                <button
                    onClick={onClear}
                    className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                    title="Limpar Página"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </motion.div>
    )
}

function ToolButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "p-3 rounded-xl transition-all duration-200 group relative",
                active
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                    : "text-gray-400 hover:bg-white/10 hover:text-white"
            )}
            title={label}
        >
            <Icon size={20} />
            {/* Tooltip Lateral */}
            <span className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-white/10">
                {label}
            </span>
        </button>
    )
}
