'use client'

import { useState, useEffect, useCallback } from 'react'
import { getRevenues, getInvestments, getExpenses } from '@/lib/data/financial'
import type { User } from '@supabase/supabase-js'
import RevenueSection from './RevenueSection'
import InvestmentSection from './InvestmentSection'
import ExpenseSection from './ExpenseSection'
import FinancialSummary from './FinancialSummary'
import FinancialCharts from './FinancialCharts'

interface FinancialDashboardProps {
  user: User
}

export default function FinancialDashboard({ user }: FinancialDashboardProps) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [revenues, setRevenues] = useState<any[]>([])
  const [investments, setInvestments] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [revenuesData, investmentsData, expensesData] = await Promise.all([
        getRevenues(user.id, year),
        getInvestments(user.id, year),
        getExpenses(user.id, year),
      ])
      setRevenues(revenuesData)
      setInvestments(investmentsData)
      setExpenses(expensesData)
    } catch (error) {
      console.error('Error loading financial data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user.id, year])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Carregando dados financeiros...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header com seletor de ano */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">Controle Financeiro</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setYear(year - 1)}
              className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
            >
              ←
            </button>
            <span className="px-4 py-1 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded">
              {year}
            </span>
            <button
              onClick={() => setYear(year + 1)}
              className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
            >
              →
            </button>
          </div>
        </div>

        {/* Gráficos */}
        <FinancialCharts
          revenues={revenues}
          investments={investments}
          expenses={expenses}
          year={year}
        />

        {/* Resumo Financeiro */}
        <FinancialSummary
          revenues={revenues}
          investments={investments}
          expenses={expenses}
          year={year}
        />

        {/* Seções de dados */}
        <RevenueSection
          revenues={revenues}
          year={year}
          userId={user.id}
          onUpdate={loadData}
        />

        <InvestmentSection
          investments={investments}
          year={year}
          userId={user.id}
          onUpdate={loadData}
        />

        <ExpenseSection
          expenses={expenses}
          year={year}
          userId={user.id}
          onUpdate={loadData}
        />
      </div>
    </div>
  )
}

