'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import LoginScreen from '@/components/auth/LoginScreen'
import Dashboard from '@/components/dashboard/Dashboard'
import type { User } from '@supabase/supabase-js'

export default function Home() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Carregando...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return <Dashboard user={user} />
}
