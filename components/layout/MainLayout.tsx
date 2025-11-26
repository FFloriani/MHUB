'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

import { useAuth } from '@/components/providers/AuthProvider'

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isExpanded, setIsExpanded] = useState(true)
    const [isMobile, setIsMobile] = useState(false)

    // Handle responsive check
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 1024
            setIsMobile(mobile)
            if (mobile) {
                setIsExpanded(true) // Always "expanded" inside the drawer
            }
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // If loading, just render children (or a loader, but children is safer to avoid flash)
    // Actually, if we are loading, we might not know if we should show sidebar.
    // But AuthProvider handles initial load fast.

    if (!user) {
        return <main className="min-h-screen bg-gray-50">{children}</main>
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <Sidebar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                isExpanded={isExpanded}
                setIsExpanded={setIsExpanded}
                isMobile={isMobile}
            />

            {/* Main Content Area */}
            <div className={cn(
                "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out",
                !isMobile ? (isExpanded ? "ml-64" : "ml-20") : "ml-0"
            )}>

                {/* Mobile Header */}
                <header className="lg:hidden h-16 bg-white border-b border-gray-200 flex items-center px-4 sticky top-0 z-20">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    >
                        <Menu size={24} />
                    </button>
                    <span className="ml-3 font-bold text-lg text-gray-900">MHUB</span>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    )
}
