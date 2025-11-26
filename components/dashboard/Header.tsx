'use client'

import { User, LogOut, Settings, Calendar, DollarSign } from 'lucide-react'
import Button from '@/components/ui/Button'
import DateSelector from './DateSelector'
import { signOut } from '@/lib/auth'
import { useRouter, usePathname } from 'next/navigation'

interface HeaderProps {
  userEmail?: string
  selectedDate: Date
  onDateChange: (date: Date) => void
}

export default function Header({ userEmail, selectedDate, onDateChange }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-semibold text-gray-900">MHUB</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className={pathname === '/' ? 'bg-gray-100' : ''}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Agenda
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/financial')}
              className={pathname === '/financial' ? 'bg-gray-100' : ''}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Financeiro
            </Button>
          </div>
          {pathname === '/' && <DateSelector date={selectedDate} onDateChange={onDateChange} />}
        </div>
        
        <div className="flex items-center gap-4">
          {userEmail && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>{userEmail}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/settings')}
            title="Configurações"
          >
            <Settings className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Configurações</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  )
}

