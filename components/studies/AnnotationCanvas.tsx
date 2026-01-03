'use client'

import { useState, useRef, useEffect } from 'react'
import type { Stroke, ToolType } from '@/lib/db'

interface AnnotationCanvasProps {
    pageNumber: number
    strokes: Stroke[]
    currentTool: ToolType
    currentColor: string
    currentWidth: number
    onStrokeComplete: (stroke: Stroke) => void
    onStrokeDelete: (strokeId: string) => void
}

export default function AnnotationCanvas({
    pageNumber,
    strokes,
    currentTool,
    currentColor,
    currentWidth,
    onStrokeComplete,
    onStrokeDelete
}: AnnotationCanvasProps) {
    const svgRef = useRef<SVGSVGElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [currentPoints, setCurrentPoints] = useState<{ x: number, y: number, pressure: number }[]>([])
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

    // Monitora tamanho do Canvas para renderizar pixels corretos (evita distorção de aspecto)
    useEffect(() => {
        if (!svgRef.current) return

        const observer = new ResizeObserver(entries => {
            const entry = entries[0]
            if (entry) {
                setCanvasSize({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                })
            }
        })

        observer.observe(svgRef.current)
        return () => observer.disconnect()
    }, [])

    // Handlers de Ponteiro
    const handlePointerDown = (e: React.PointerEvent) => {
        if (currentTool === 'hand') return
        e.preventDefault() // Previne scroll/touch actions

        // Se for borracha, não iniciamos desenho, apenas detectamos clique/arraste
        if (currentTool === 'eraser') {
            // Lógica de apagar (simples: apaga se passar perto)
            // Implementado no Move
            setIsDrawing(true)
            return
        }

        const point = normalizePoint(e)
        if (!point) return

        setIsDrawing(true)
        setCurrentPoints([point]);
        // Captura o ponteiro para garantir que o 'up' dispare
        (e.target as Element).setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDrawing) return
        e.preventDefault()

        const point = normalizePoint(e)
        if (!point) return

        if (currentTool === 'eraser') {
            // Apaga traços próximos
            const hit = findHitStroke(point, strokes)
            if (hit) {
                onStrokeDelete(hit.id)
            }
        } else {
            // Desenha
            setCurrentPoints(prev => [...prev, point])
        }
    }

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDrawing) return
        e.preventDefault()

        if (currentTool !== 'eraser' && currentPoints.length > 0) {
            // Finaliza traço
            const stroke: Stroke = {
                id: crypto.randomUUID(),
                tool: currentTool as 'pen' | 'highlighter',
                color: currentColor,
                lineWidth: currentWidth,
                opacity: currentTool === 'highlighter' ? 0.3 : 1,
                points: currentPoints,
                timestamp: new Date()
            }
            onStrokeComplete(stroke)
        }

        setIsDrawing(false)
        setCurrentPoints([])

        try {
            (e.target as Element).releasePointerCapture(e.pointerId)
        } catch (err) {
            // Ignora erro se ponteiro já foi liberado
        }
    }

    // Normaliza coordenadas para % (0-100)
    const normalizePoint = (e: React.PointerEvent) => {
        if (!svgRef.current) return null
        const rect = svgRef.current.getBoundingClientRect()
        return {
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100,
            pressure: e.pressure || 0.5
        }
    }

    // Detecção de colisão para borracha
    const findHitStroke = (point: { x: number, y: number }, candidateStrokes: Stroke[]) => {
        // Tolerância em % (ex: 2% da tela)
        const tolerance = 2
        return candidateStrokes.find(stroke => {
            return stroke.points.some(p => {
                const dx = p.x - point.x
                const dy = p.y - point.y
                return (dx * dx + dy * dy) < (tolerance * tolerance)
            })
        })
    }

    // NOVO: Converte pontos % para PX para renderização
    const getPathD = (points: { x: number, y: number }[]) => {
        if (points.length < 2 || canvasSize.width === 0) return ''

        // Helper
        const toPx = (p: { x: number, y: number }) => ({
            x: (p.x / 100) * canvasSize.width,
            y: (p.y / 100) * canvasSize.height
        })

        const p0 = toPx(points[0])
        let d = `M ${p0.x} ${p0.y}`

        for (let i = 1; i < points.length - 1; i++) {
            const current = toPx(points[i])
            const next = toPx(points[i + 1])
            const xc = (current.x + next.x) / 2
            const yc = (current.y + next.y) / 2
            d += ` Q ${current.x} ${current.y}, ${xc} ${yc}`
        }

        if (points.length > 1) {
            const last = toPx(points[points.length - 1])
            d += ` L ${last.x} ${last.y}`
        }

        return d
    }

    const shouldDisablePointer = currentTool === 'hand'

    return (
        <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full z-20 touch-none"
            style={{
                pointerEvents: shouldDisablePointer ? 'none' : 'auto',
                cursor: currentTool === 'eraser' ? 'crosshair' : (shouldDisablePointer ? 'default' : 'crosshair')
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp} // Finaliza se sair do canvas
        >
            {/* Traços Salvos */}
            {strokes.map(stroke => (
                <path
                    key={stroke.id}
                    d={getPathD(stroke.points)}
                    stroke={stroke.color}
                    strokeWidth={stroke.lineWidth} // Pixels reais
                    strokeOpacity={stroke.opacity}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            ))}

            {/* Traço Atual (Preview) */}
            {isDrawing && currentTool !== 'eraser' && currentPoints.length > 0 && (
                <path
                    d={getPathD(currentPoints)}
                    stroke={currentColor}
                    strokeWidth={currentWidth}
                    strokeOpacity={currentTool === 'highlighter' ? 0.3 : 1}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}
        </svg>
    )
}
