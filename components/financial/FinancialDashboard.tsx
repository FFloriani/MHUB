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
    <div className="flex-1 space-y-8 animate-in fade-in duration-500">
      {/* Header & Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-gray-500 mt-1">Gerencie suas receitas, despesas e investimentos.</p>
        </div>

        <div className="flex items-center bg-white rounded-xl border border-gray-200 p-1 shadow-sm self-start md:self-auto">
          <button
            onClick={() => setYear(year - 1)}
            className="p-2 hover:bg-gray-50 rounded-lg text-gray-500 transition-colors"
          >
            ←
          </button>
          <span className="px-4 font-semibold text-gray-900 min-w-[4rem] text-center">
            {year}
          </span>
          <button
            onClick={() => setYear(year + 1)}
            className="p-2 hover:bg-gray-50 rounded-lg text-gray-500 transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Charts & Summary (2/3 width on large screens) */}
        <div className="xl:col-span-2 space-y-6">
          <FinancialCharts
            revenues={revenues}
            investments={investments}
            expenses={expenses}
            year={year}
          />

          <FinancialSummary
            revenues={revenues}
            investments={investments}
            expenses={expenses}
            year={year}
          />
        </div>

        {/* Right Column: Transaction Lists (1/3 width on large screens) */}
        <div className="space-y-6">
          <RevenueSection
            revenues={revenues}
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

          <InvestmentSection
            investments={investments}
            year={year}
            userId={user.id}
            onUpdate={loadData}
          />
        </div>
      </div>
    </div>
  )
}

