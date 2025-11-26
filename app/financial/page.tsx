'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Header from '@/components/dashboard/Header'
import FinancialDashboard from '@/components/financial/FinancialDashboard'
import type { User } from '@supabase/supabase-js'

export default function FinancialPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const session = await getSession()
      if (!session?.user) {
        router.push('/')
        return
      }
      setUser(session.user)
    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Carregando...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header
        userEmail={user.email}
        selectedDate={new Date()}
        onDateChange={() => {}}
      />
      <FinancialDashboard user={user} />
    </div>
  )
}

