'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Calendar,
    DollarSign,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    User,
    X,
    BookOpen
} from 'lucide-react'
import { signOut } from '@/lib/auth'
import { useAuth } from '@/components/providers/AuthProvider'
import { cn } from '@/lib/utils'

interface SidebarProps {
    isOpen: boolean
    setIsOpen: (isOpen: boolean) => void
    isExpanded: boolean
    setIsExpanded: (isExpanded: boolean) => void
    isMobile: boolean
}

export default function Sidebar({ isOpen, setIsOpen, isExpanded, setIsExpanded, isMobile }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const { user } = useAuth()

    // Fecha sidebar ao navegar (mobile)
    useEffect(() => {
        if (isOpen) {
            setIsOpen(false)
        }
    }, [pathname])

    const handleSignOut = async () => {
        try {
            await signOut()
            router.push('/')
            router.refresh()
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    const navItems = [
        { name: 'Agenda', icon: Calendar, path: '/' },
        { name: 'Financeiro', icon: DollarSign, path: '/financial' },
        { name: 'Estudos', icon: BookOpen, path: '/studies' },
        { name: 'Configurações', icon: Settings, path: '/settings' },
    ]

    const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
        <>
            {/* Header / Logo */}
            <div className="h-20 flex items-center justify-between px-5 border-b border-gray-100/50">
                <div className={cn("flex items-center gap-3 overflow-hidden", !isExpanded && !mobile && "justify-center w-full")}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30">
                        <span className="text-white font-bold text-xl">M</span>
                    </div>
                    {(isExpanded || mobile) && (
                        <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600"
                        >
                            MHUB
                        </motion.span>
                    )}
                </div>

                {/* Desktop Collapse Toggle */}
                {!mobile && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 rounded-full hover:bg-gray-100/50 text-gray-500 transition-colors"
                    >
                        {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    </button>
                )}

                {/* Mobile Close Button */}
                {mobile && (
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 rounded-full hover:bg-gray-100/50 text-gray-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.path
                    return (
                        <button
                            key={item.path}
                            onClick={() => router.push(item.path)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                                isActive
                                    ? "text-white shadow-lg shadow-primary/25"
                                    : "text-gray-600 hover:bg-gray-50/80 hover:text-gray-900"
                            )}
                            title={!isExpanded && !mobile ? item.name : undefined}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId={mobile ? "activeTabMobile" : "activeTab"}
                                    className="absolute inset-0 bg-gradient-to-r from-primary to-primary-dark"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}

                            <item.icon
                                size={22}
                                className={cn(
                                    "flex-shrink-0 relative z-10 transition-colors",
                                    isActive ? "text-white" : "text-gray-500 group-hover:text-primary"
                                )}
                            />

                            {(isExpanded || mobile) && (
                                <span className={cn("relative z-10 font-medium", isActive ? "text-white" : "")}>
                                    {item.name}
                                </span>
                            )}

                            {/* Tooltip for collapsed state (desktop only) */}
                            {!isExpanded && !mobile && (
                                <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
                                    {item.name}
                                </div>
                            )}
                        </button>
                    )
                })}
            </nav>

            {/* Footer / User */}
            <div className="p-4 border-t border-gray-100/50 space-y-2 bg-white/30">
                {(isExpanded || mobile) && user?.email && (
                    <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 truncate bg-white/50 rounded-lg border border-white/50">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-200 to-gray-100 flex items-center justify-center text-gray-500">
                            <User size={16} />
                        </div>
                        <div className="flex flex-col truncate">
                            <span className="text-xs text-gray-400 font-medium">Logado como</span>
                            <span className="truncate font-semibold text-gray-700" title={user.email}>{user.email}</span>
                        </div>
                    </div>
                )}
                <button
                    onClick={handleSignOut}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-red-500 hover:bg-red-50 hover:text-red-600",
                        !isExpanded && !mobile && "justify-center"
                    )}
                    title={!isExpanded && !mobile ? "Sair" : undefined}
                >
                    <LogOut size={22} className="flex-shrink-0" />
                    {(isExpanded || mobile) && (
                        <span className="font-medium">Sair</span>
                    )}
                </button>
            </div>
        </>
    )

    return (
        <>
            {/* ========== SIDEBAR DESKTOP (CSS-controlled) ========== */}
            <aside
                className={cn(
                    "hidden lg:flex fixed left-0 top-0 z-40 h-screen flex-col border-r border-white/20",
                    "bg-white/80 backdrop-blur-xl shadow-glass transition-all duration-300",
                    isExpanded ? "w-64" : "w-20"
                )}
            >
                <SidebarContent mobile={false} />
            </aside>

            {/* ========== SIDEBAR MOBILE (Drawer Overlay) ========== */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Drawer */}
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="lg:hidden fixed left-0 top-0 z-50 h-screen w-64 flex flex-col border-r border-white/20 bg-white/95 backdrop-blur-xl shadow-2xl"
                        >
                            <SidebarContent mobile={true} />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}
