'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { FinanceProvider } from '@/components/finance/FinanceContext'
import FinanceShell from '@/components/finance/FinanceShell'

export default function FinancialPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Carregando...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <FinanceProvider user={user}>
        <FinanceShell />
      </FinanceProvider>
    </div>
  )
}
