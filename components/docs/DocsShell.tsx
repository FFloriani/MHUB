'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Bot, FileJson, Home, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/docs', label: 'Início', icon: BookOpen },
  { href: '/docs/guia-ia', label: 'Guia com IA', icon: Bot },
  { href: '/docs/api', label: 'Referência API', icon: FileJson },
]

export default function DocsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="space-y-1 px-3 py-4">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/docs' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </Link>
        )
      })}
      <div className="pt-4 mt-4 border-t border-slate-200">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          <Home className="w-5 h-5" />
          Voltar ao app MHUB
        </Link>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed lg:sticky top-0 z-50 h-screen w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col transition-transform duration-200 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <Link href="/docs" className="font-bold text-lg text-slate-900 tracking-tight" onClick={() => setMobileOpen(false)}>
            MHUB <span className="text-indigo-600 font-semibold">Docs</span>
          </Link>
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <NavLinks onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="lg:hidden sticky top-0 z-30 h-14 flex items-center gap-3 px-4 border-b border-slate-200 bg-white/95 backdrop-blur">
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-700"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold text-slate-800">Documentação</span>
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}
