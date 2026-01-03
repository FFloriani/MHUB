'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { Music2, Minimize2, Link as LinkIcon, Volume2, GripHorizontal, Heart, ListMusic, ChevronRight, X } from 'lucide-react'
import { db } from '@/lib/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { supabase } from '@/lib/supabase'

declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

interface FocusPlayerProps {
    subjectId: string
}

interface PlaylistItem {
    id?: string
    title: string
    url: string
}

const DEFAULT_SUGGESTIONS = [
    { title: 'Lofi Girl', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
    { title: 'Rain Sounds', url: 'https://www.youtube.com/watch?v=mPZkdNFkNps' },
    { title: 'Classical', url: 'https://www.youtube.com/watch?v=R03h7J2l50I' }
]

export default function FocusPlayer({ subjectId }: FocusPlayerProps) {
    const [mounted, setMounted] = useState(false)
    const [isExpanded, setIsExpanded] = useState(true)
    const [showPlaylist, setShowPlaylist] = useState(false)
    const [currentUrl, setCurrentUrl] = useState('')
    const [inputValue, setInputValue] = useState('')
    const [volume, setVolume] = useState(50)
    const [player, setPlayer] = useState<any>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [videoTitle, setVideoTitle] = useState('')

    // Playlist State (persistente via supabase)
    const [playlist, setPlaylist] = useState<PlaylistItem[]>([])

    const playerContainerRef = useRef<HTMLDivElement>(null)
    const dragControls = useDragControls()
    const constraintsRef = useRef(null)

    // Ref para diferenciar Click de Drag no botão de expandir
    const isDraggingRef = useRef(false)

    useEffect(() => {
        setMounted(true)
        if (!window.YT) {
            const tag = document.createElement('script')
            tag.src = "https://www.youtube.com/iframe_api"
            const firstScriptTag = document.getElementsByTagName('script')[0]
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
        }

        // Auth & Initial Load
        const load = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                fetchPlaylist(session.user.id)
            }
        }
        load()

        // Auth Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                fetchPlaylist(session.user.id)
            } else {
                setPlaylist([])
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const fetchPlaylist = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('study_playlist_items')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true })

            if (error) {
                console.error('Error fetching playlist:', error)
                return
            }
            if (data) setPlaylist(data)
        } catch (e) {
            console.error('Error loading playlist', e)
        }
    }

    const addToPlaylist = async () => {
        if (!currentUrl) return

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            console.warn('User not authenticated')
            return
        }

        const titleToSave = videoTitle || "Música sem título"

        if (playlist.some(item => item.url === currentUrl)) return

        const newItem = { title: titleToSave, url: currentUrl, user_id: user.id }
        setPlaylist([...playlist, newItem])

        const { data, error } = await supabase
            .from('study_playlist_items')
            .insert([{ title: titleToSave, url: currentUrl, user_id: user.id }])
            .select()

        if (error) {
            console.error('Error saving to playlist:', error)
            // Reverte estado otimista se falhar
            fetchPlaylist(user.id)
        }
        if (data) {
            setPlaylist(prev => prev.map(p => p.url === currentUrl ? data[0] : p))
        }
    }

    const removeFromPlaylist = async (id: string, url: string) => {
        setPlaylist(playlist.filter(item => item.url !== url))
        if (id) await supabase.from('study_playlist_items').delete().eq('id', id)
    }

    const settings = useLiveQuery(
        () => db.playerSettings.get(subjectId),
        [subjectId]
    )

    useEffect(() => {
        if (settings && settings.lastPlayedLink && !currentUrl) {
            loadVideo(settings.lastPlayedLink, settings.volume ? settings.volume * 100 : 50)
        }
    }, [settings])

    const getVideoId = (url: string) => {
        if (!url) return null
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
        const match = url.match(regex)
        return match ? match[1] : null
    }

    const loadVideo = (url: string, volOverride?: number) => {
        const videoId = getVideoId(url)
        if (!videoId) return

        setCurrentUrl(url)
        setInputValue(url)
        const vol = volOverride ?? volume

        if (player && typeof player.loadVideoById === 'function') {
            player.loadVideoById(videoId)
            player.setVolume(vol)
        } else {
            createPlayer(videoId, vol)
        }

        db.playerSettings.put({
            subjectId,
            lastPlayedLink: url,
            volume: vol / 100
        })
    }

    const createPlayer = (videoId: string, startVol: number) => {
        const init = () => {
            if (window.YT && window.YT.Player) {
                // Importante: Não limpar container se ele já tiver o iframe
                const existingFrame = document.getElementById('yt-player-target')
                if (!existingFrame || existingFrame.tagName !== 'IFRAME') {
                    if (playerContainerRef.current) playerContainerRef.current.innerHTML = '<div id="yt-player-target"></div>'

                    new window.YT.Player('yt-player-target', {
                        height: '100%',
                        width: '100%',
                        videoId: videoId,
                        playerVars: {
                            'playsinline': 1,
                            'controls': 1,
                            'autoplay': 1,
                            'disablekb': 1,
                        },
                        events: {
                            'onReady': (event: any) => {
                                event.target.setVolume(startVol)
                                const data = event.target.getVideoData()
                                if (data && data.title) setVideoTitle(data.title)
                                setPlayer(event.target)
                            },
                            'onStateChange': (event: any) => {
                                if (event.target.getVideoData) {
                                    const data = event.target.getVideoData()
                                    if (data && data.title) setVideoTitle(data.title)
                                }
                            }
                        }
                    })
                }
            } else {
                setTimeout(init, 500)
            }
        }
        init()
    }

    const handleVolumeChange = (newVol: number) => {
        setVolume(newVol)
        if (player && typeof player.setVolume === 'function') {
            player.setVolume(newVol)
        }
        db.playerSettings.update(subjectId, { volume: newVol / 100 })
    }

    const isCurrentSaved = playlist.some(p => p.url === currentUrl)

    if (!mounted) return null

    return (
        <>
            <div ref={constraintsRef} className="fixed inset-4 pointer-events-none z-[59]" />

            <motion.div
                drag
                dragListener={false}
                dragControls={dragControls}
                dragConstraints={constraintsRef}
                dragElastic={0}
                dragMomentum={false}
                onDragStart={() => {
                    setIsDragging(true)
                    isDraggingRef.current = true
                }}
                onDragEnd={() => {
                    setIsDragging(false)
                    // Pequeno delay para evitar clique acidental ao soltar
                    setTimeout(() => { isDraggingRef.current = false }, 150)
                }}
                initial={{ x: 20, y: 20, opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ willChange: 'transform' }}
                className={`fixed bottom-8 right-8 z-[60] flex items-start pointer-events-none ${isExpanded ? 'h-auto' : 'h-14'}`}
            >
                {/* Main Player Card */}
                <div className={`bg-[#121212] border border-white/10 shadow-2xl overflow-hidden pointer-events-auto transition-all duration-300 relative z-20 ${isExpanded ? 'rounded-2xl w-[300px]' : 'rounded-full w-14 h-14'}`}>

                    {/* Header Compacto */}
                    <div
                        onPointerDown={(e) => dragControls.start(e)}
                        className="flex items-center justify-between p-3 cursor-grab active:cursor-grabbing bg-white/5 border-b border-white/5 h-14 relative touch-none group"
                    >
                        {/* Esquerda: Icone, Titulo, Ações */}
                        <div className="flex items-center gap-3 pointer-events-none select-none flex-1 min-w-0 mr-2">
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${currentUrl ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-gray-800'}`}>
                                {isDragging ? <GripHorizontal size={16} className="text-white animate-pulse" /> : <Music2 size={16} className="text-white" />}
                            </div>

                            {isExpanded && (
                                <div className="flex items-center gap-2 flex-1 min-w-0 pointer-events-auto">
                                    <span className="text-xs font-bold text-gray-200 truncate flex-1 leading-tight">
                                        {videoTitle || "Focus Player"}
                                    </span>

                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                isCurrentSaved ? removeFromPlaylist(playlist.find(p => p.url === currentUrl)?.id!, currentUrl) : addToPlaylist()
                                            }}
                                            className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${isCurrentSaved ? 'text-rose-500' : 'text-gray-400'}`}
                                            title={isCurrentSaved ? "Remove from Playlist" : "Save to Playlist"}
                                        >
                                            <Heart size={14} fill={isCurrentSaved ? "currentColor" : "none"} />
                                        </button>

                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowPlaylist(!showPlaylist); }}
                                            className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${showPlaylist ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-400'}`}
                                            title="My Playlist"
                                        >
                                            <ListMusic size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Minimize Button */}
                        {isExpanded ? (
                            <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={() => { setIsExpanded(false); setShowPlaylist(false); }}
                                className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-full cursor-pointer pointer-events-auto transition-colors flex-shrink-0 ml-1"
                                title="Minimize"
                            >
                                <Minimize2 size={18} />
                            </button>
                        ) : (
                            <button
                                onPointerDown={(e) => dragControls.start(e)}
                                onClick={(e) => {
                                    // Bloqueia se foi apenas arraste
                                    if (!isDraggingRef.current) setIsExpanded(true)
                                }}
                                className="absolute inset-0 z-10 cursor-pointer"
                                aria-label="Expand"
                            />
                        )}
                    </div>

                    {/* VIDEO PERSISTENTE */}
                    <div className={`relative w-full bg-black transition-all duration-300 ${isExpanded ? 'aspect-video opacity-100 h-auto' : 'h-0 opacity-0 pointer-events-none overflow-hidden'}`}>
                        <div ref={playerContainerRef} className="w-full h-full">
                            <div id="yt-player-target" className="w-full h-full" />
                        </div>

                        {isDragging && <div className="absolute inset-0 z-50 bg-transparent" />}

                        {!currentUrl && isExpanded && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-2 pointer-events-none select-none">
                                <Music2 size={32} opacity={0.2} />
                                <span className="text-xs">Paste a link to start</span>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    {isExpanded && (
                        <div className="p-3 bg-[#121212]">
                            <div className="flex items-center gap-3">
                                <div className="flex-1 relative group">
                                    <form onSubmit={(e) => { e.preventDefault(); loadVideo(inputValue); }} className="relative flex items-center">
                                        <LinkIcon size={12} className="absolute left-2 text-gray-500" />
                                        <input
                                            type="text"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            placeholder="YouTube URL..."
                                            className="w-full bg-zinc-900/50 text-white text-[10px] py-1.5 pl-7 pr-2 rounded-lg border border-white/5 focus:border-indigo-500 focus:bg-black outline-none placeholder:text-gray-600 transition-all h-8"
                                        />
                                    </form>
                                </div>

                                <div className="w-20 flex items-center gap-1.5">
                                    <Volume2 size={12} className="text-gray-500" />
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={volume}
                                        onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Playlist Drawer */}
                <AnimatePresence>
                    {isExpanded && showPlaylist && (
                        <motion.div
                            initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                            animate={{ width: 220, opacity: 1, marginLeft: 12 }}
                            exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                            className="h-[280px] bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
                        >
                            <div className="p-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Your Library</span>
                                <button onClick={() => setShowPlaylist(false)} className="text-gray-500 hover:text-white">
                                    <X size={14} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide space-y-1">
                                {playlist.length > 0 ? (
                                    playlist.map(item => (
                                        <div key={item.url} className="group relative flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer" onClick={() => loadVideo(item.url)}>
                                            <div className="w-1 h-8 rounded-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors" />
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-[10px] truncate leading-tight ${currentUrl === item.url ? 'text-indigo-400 font-medium' : 'text-gray-300'}`}>
                                                    {item.title}
                                                </p>
                                            </div>
                                            {item.id && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeFromPlaylist(item.id!, item.url); }}
                                                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-rose-500 p-1"
                                                >
                                                    <X size={12} />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center">
                                        <p className="text-[10px] text-gray-500 mb-4">Empty.</p>
                                        <p className="text-[10px] text-gray-600 font-medium mb-2">Suggestions:</p>
                                        <div className="space-y-2">
                                            {DEFAULT_SUGGESTIONS.map(s => (
                                                <button
                                                    key={s.title}
                                                    onClick={() => loadVideo(s.url)}
                                                    className="w-full text-left text-[10px] text-indigo-400 hover:underline"
                                                >
                                                    + {s.title}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </>
    )
}
