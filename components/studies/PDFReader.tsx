'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, Minimize, LayoutTemplate, Columns, Grid2X2, Lightbulb } from 'lucide-react'
import type { LocalFile } from '@/lib/db'
import { db, type Annotation } from '@/lib/db' // Importando DB Local
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import SelectionMenu from './SelectionMenu'
import NoteViewer from './NoteViewer'

// Configuração Segura do Worker (Local)
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.mjs`;

interface PDFReaderProps {
    file: LocalFile
    onPageChange: (page: number) => void
    initialPage?: number
    isDarkMode?: boolean
}

export default function PDFReader({ file, onPageChange, initialPage = 1, isDarkMode: initialDarkMode = false }: PDFReaderProps) {
    const [numPages, setNumPages] = useState<number>(0)
    const [pageNumber, setPageNumber] = useState(initialPage)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const [fileUrl, setFileUrl] = useState<string | null>(null)
    const [isDarkMode, setIsDarkMode] = useState(initialDarkMode)

    const [gridSize, setGridSize] = useState<1 | 2 | 4>(1)
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
    const containerRef = useRef<HTMLDivElement>(null)
    const [scaleMultiplier, setScaleMultiplier] = useState(1.0)

    // State de Anotações (Local)
    const [annotations, setAnnotations] = useState<Annotation[]>([])
    // Dados da Seleção Atual
    const [selectionData, setSelectionData] = useState<{
        position: { top: number; left: number },
        text: string,
        normalizedRects: Array<{ top: number; left: number; width: number; height: number }>,
        pageNumber: number,
        pageElement: HTMLElement
    } | null>(null)

    // Estado da Nota Ativa (Visualização)
    const [activeNote, setActiveNote] = useState<{ annotation: Annotation, position: { top: number, left: number } } | null>(null)

    // MONITOR: Carrega anotações do Dexie quando o arquivo abrir
    useEffect(() => {
        if (!file?.id) return

        const loadAnnotations = async () => {
            try {
                // Busca todas as anotações deste arquivo
                const data = await db.annotations.where('fileId').equals(file.id as number).toArray()
                setAnnotations(data)
            } catch (err) {
                console.error('Erro ao carregar anotações:', err)
            }
        }
        loadAnnotations()
    }, [file])

    useEffect(() => {
        if (!containerRef.current) return
        const updateSize = () => {
            if (containerRef.current) {
                setContainerSize({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                })
            }
        }
        updateSize()
        window.addEventListener('resize', updateSize)
        return () => window.removeEventListener('resize', updateSize)
    }, [isFullscreen])

    useEffect(() => {
        if (file?.file) {
            const url = URL.createObjectURL(file.file)
            setFileUrl(url)
            return () => URL.revokeObjectURL(url)
        }
    }, [file])

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages)
        setError(null)
    }

    // MONITOR DE SELEÇÃO
    useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection()
            // Se perdeu seleção, fecha o menu (com cuidado)
            if (!selection || selection.isCollapsed) {
                // Lógica de fechar pode ficar aqui se quiser auto-close agressivo
            }
        }
        document.addEventListener('selectionchange', handleSelectionChange)
        return () => document.removeEventListener('selectionchange', handleSelectionChange)
    }, [])

    // FINALIZAÇÃO DO CLIQUE (Captura geometria da seleção IMEDIATAMENTE)
    const handleMouseUp = (e: React.MouseEvent) => {
        // Se o clique foi DENTRO do menu, ignora (não fecha nada)
        if ((e.target as HTMLElement).closest('.selection-menu-container')) {
            return
        }

        const selection = window.getSelection()
        if (!selection || selection.isCollapsed) {
            // Se clicou fora (no papel) e não tem seleção, limpa tudo
            setSelectionData(null)
            return
        }

        const text = selection.toString().trim()
        if (text.length > 0) {
            const range = selection.getRangeAt(0)
            const rect = range.getBoundingClientRect()

            // Busca página
            let node = selection.anchorNode
            let pageElement: HTMLElement | null = null
            while (node && node !== document.body) {
                if (node instanceof HTMLElement && node.classList.contains('react-pdf__Page')) {
                    pageElement = node
                    break
                }
                node = node?.parentNode || null
            }

            if (!pageElement) return

            // CALCULA AGORA (SNAPSHOT)
            // Assim não dependemos da seleção continuar ativa depois
            const pageRect = pageElement.getBoundingClientRect()
            const clientRects = Array.from(range.getClientRects())

            const normalizedRects = clientRects.map(r => ({
                top: ((r.top - pageRect.top) / pageRect.height) * 100,
                left: ((r.left - pageRect.left) / pageRect.width) * 100,
                width: (r.width / pageRect.width) * 100,
                height: (r.height / pageRect.height) * 100
            }))

            const pageAttr = pageElement.getAttribute('data-page-number')
            const targetPage = pageAttr ? parseInt(pageAttr) : pageNumber

            setSelectionData({
                text,
                position: {
                    top: rect.top,
                    left: rect.left + (rect.width / 2)
                },
                normalizedRects: normalizedRects,
                pageNumber: targetPage,
                pageElement: pageElement
            })
        }
    }

    // SALVAR NOVA NOTA
    const handleAddNote = async (text: string, note: string) => {
        // Agora usamos os dados JÁ calculados do state
        if (!selectionData || !file.id) return

        // Debug
        console.log('Salvando (Snapshot):', selectionData.normalizedRects)

        const newAnnotation: Annotation = {
            fileId: file.id,
            page_number: selectionData.pageNumber,
            quote: text,
            note,
            color: '#fde047',
            rects: selectionData.normalizedRects, // Usa o snapshot
            createdAt: new Date()
        }

        try {
            const id = await db.annotations.add(newAnnotation)
            setAnnotations(prev => [...prev, { ...newAnnotation, id: id as number }])
            setSelectionData(null)
            window.getSelection()?.removeAllRanges()
        } catch (err) {
            console.error('Erro ao salvar:', err)
            alert('Erro ao salvar anotação.')
        }
    }

    // EXCLUIR NOTA
    const handleDeleteNote = async (id: number) => {
        try {
            await db.annotations.delete(id)
            setAnnotations(prev => prev.filter(a => a.id !== id))
            setActiveNote(null)
        } catch (err) {
            console.error('Erro ao excluir:', err)
        }
    }

    const changePage = useCallback((direction: -1 | 1) => {
        const offset = direction * gridSize
        setPageNumber(prevPage => {
            const newPage = Math.min(Math.max(1, prevPage + offset), numPages)
            if (newPage !== prevPage) {
                onPageChange(newPage)
            }
            return newPage
        })
    }, [gridSize, numPages, onPageChange])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') changePage(1)
            if (e.key === 'ArrowLeft') changePage(-1)
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [changePage])

    return (
        <div
            onMouseUp={handleMouseUp}
            className={`flex flex-col items-center justify-start h-full bg-gray-900 overflow-hidden relative ${isFullscreen ? 'fixed inset-0 z-50' : 'rounded-3xl'}`}
        >
            {error && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-gray-900/90 p-8">
                    <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-6 text-center text-white">
                        Erro ao abrir livro: {error.message}
                    </div>
                </div>
            )}

            {/* Menu Flutuante de Seleção */}
            <SelectionMenu
                position={selectionData?.position || null}
                selectedText={selectionData?.text || ''}
                onClose={() => setSelectionData(null)}
                onAddNote={handleAddNote}
            />

            {/* Note Viewer (Card de Visualização) */}
            {activeNote && (
                <NoteViewer
                    annotation={activeNote.annotation}
                    position={activeNote.position}
                    onClose={() => setActiveNote(null)}
                    onDelete={handleDeleteNote}
                />
            )}

            {/* Toolbar Topo */}
            <div className="absolute top-4 z-20 flex items-center gap-2 bg-gray-800/90 backdrop-blur text-white px-4 py-2 rounded-full shadow-xl border border-white/10 transition-opacity hover:opacity-100 opacity-0 group-hover:opacity-100">
                <div className="flex bg-black/20 rounded-lg p-0.5 mr-2">
                    <button onClick={() => setGridSize(1)} className={`p-1.5 rounded-md ${gridSize === 1 ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}><LayoutTemplate size={14} /></button>
                    <button onClick={() => setGridSize(2)} className={`p-1.5 rounded-md ${gridSize === 2 ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}><Columns size={14} /></button>
                    <button onClick={() => setGridSize(4)} className={`p-1.5 rounded-md ${gridSize === 4 ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}><Grid2X2 size={14} /></button>
                </div>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-1.5 rounded-md transition-colors mr-2 ${isDarkMode ? 'text-yellow-400 bg-yellow-400/20' : 'text-gray-400 hover:text-white'}`}><Lightbulb size={16} /></button>
                <div className="w-px h-4 bg-white/20 mx-1" />
                <button onClick={() => setScaleMultiplier(s => Math.max(0.2, s - 0.1))} className="p-1 hover:bg-white/20 rounded"><ZoomOut size={16} /></button>
                <span className="text-xs font-mono w-12 text-center">{Math.round(scaleMultiplier * 100)}%</span>
                <button onClick={() => setScaleMultiplier(s => Math.min(2.0, s + 0.1))} className="p-1 hover:bg-white/20 rounded"><ZoomIn size={16} /></button>
                <div className="w-px h-4 bg-white/20 mx-1" />
                <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1 hover:bg-white/20 rounded">{isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}</button>
            </div>

            {/* Container do Documento */}
            <div
                ref={containerRef}
                className={`flex-1 w-full overflow-hidden flex items-center justify-center p-4 bg-gray-900 transition-colors duration-500`}
            >
                {fileUrl && containerSize.height > 0 && (
                    <Document
                        file={fileUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={(err) => setError(err)}
                        className={`shadow-2xl grid gap-4 justify-center items-center content-center ${gridSize === 4 ? 'grid-cols-4' : (gridSize === 2 ? 'grid-cols-2' : 'grid-cols-1')}`}
                        loading={<div className="text-white animate-pulse">Carregando livro...</div>}
                    >
                        {Array.from({ length: gridSize }).map((_, index) => {
                            const pageToRender = pageNumber + index
                            if (pageToRender > numPages) return null

                            const gapTotal = (gridSize - 1) * 16
                            const maxH = containerSize.height - 40
                            const maxW = (containerSize.width - 40 - gapTotal) / gridSize
                            const heightBasedOnWidth = maxW * 1.41
                            const finalHeight = Math.min(maxH, heightBasedOnWidth) * scaleMultiplier

                            return (
                                <div
                                    key={pageToRender}
                                    className={`relative shadow-2xl select-none ${isDarkMode ? '[&_canvas]:invert [&_canvas]:hue-rotate-180 [&_canvas]:brightness-90 [&_canvas]:contrast-125' : ''}`}
                                >
                                    <Page
                                        pageNumber={pageToRender}
                                        height={finalHeight}
                                        renderTextLayer={true}
                                        renderAnnotationLayer={true}
                                        className="border border-white/5 bg-white"
                                        loading=""
                                    />

                                    {/* CAMADA DE HIGHLIGHTS (Notas Salvas) */}
                                    <div className="absolute inset-0 pointer-events-none z-10">
                                        {annotations
                                            .filter(a => a.page_number === pageToRender)
                                            .map(annotation => (
                                                <div key={annotation.id}>
                                                    {annotation.rects.map((rect, i) => (
                                                        <div
                                                            key={i}
                                                            // CORREÇÃO VISUAL: Amarelo Forte + Transparência Segura
                                                            // O mix-blend-mode falhou em alguns browsers, então voltamos pro seguro.
                                                            className="absolute cursor-pointer pointer-events-auto hover:opacity-75 transition-all"
                                                            style={{
                                                                top: `${rect.top}%`,
                                                                left: `${rect.left}%`,
                                                                width: `${rect.width}%`,
                                                                height: `${rect.height}%`,
                                                                backgroundColor: '#facc15', // Amarelo Ouro (Mais forte que o anterior)
                                                                opacity: 0.5 // Transparência fixa para garantir leitura
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                // Calcula posição do mouse na tela para abrir o balão perto do clique
                                                                const clickRect = (e.target as HTMLElement).getBoundingClientRect()
                                                                setActiveNote({
                                                                    annotation,
                                                                    position: {
                                                                        top: clickRect.bottom + 10,
                                                                        left: clickRect.left + (clickRect.width / 2)
                                                                    }
                                                                })
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            ))
                                        }
                                    </div>

                                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 font-mono select-none">
                                        pg {pageToRender}
                                    </span>
                                </div>
                            )
                        })}
                    </Document>
                )}
            </div>

            {/* Controles de Navegação */}
            <div className="absolute bottom-6 z-20 flex items-center gap-4 bg-gray-800/90 backdrop-blur text-white px-6 py-3 rounded-2xl shadow-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => changePage(-1)} disabled={pageNumber <= 1} className="p-2 hover:bg-white/20 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft /></button>
                <div className="text-center">
                    <span className="font-bold text-lg block leading-none">{pageNumber}{gridSize > 1 && numPages > 0 && ` - ${Math.min(numPages, pageNumber + gridSize - 1)}`}</span>
                    <span className="text-xs text-gray-400">de {numPages || '--'}</span>
                </div>
                <button onClick={() => changePage(1)} disabled={pageNumber >= numPages} className="p-2 hover:bg-white/20 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight /></button>
            </div>
        </div>
    )
}
