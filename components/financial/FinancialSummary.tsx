'use client'

import Card from '@/components/ui/Card'
import type { Revenue, Investment, Expense } from '@/lib/data/financial'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

interface FinancialSummaryProps {
  revenues: Revenue[]
  investments: Investment[]
  expenses: Expense[]
  year: number
}

export default function FinancialSummary({ revenues, investments, expenses, year }: FinancialSummaryProps) {
  const [expandedMonth, setExpandedMonth] = useState<number | null>(new Date().getMonth() + 1)

  const calculateTotalForMonth = (month: number, data: Array<{ month: number; amount: number }>) => {
    return data
      .filter(item => item.month === month)
      .reduce((sum, item) => sum + Number(item.amount), 0)
  }

  const calculateRevenueTotal = (month: number) => calculateTotalForMonth(month, revenues)
  const calculateInvestmentTotal = (month: number) => calculateTotalForMonth(month, investments)

  const calculateExpenseTotal = (month: number, type?: string) => {
    return expenses
      .filter(e => e.month === month && (!type || e.type === type))
      .reduce((sum, e) => sum + Number(e.amount), 0)
  }

  const calculateBalance = (month: number) => {
    const revenue = calculateRevenueTotal(month)
    const investment = calculateInvestmentTotal(month)
    const totalExpenses = calculateExpenseTotal(month)
    return revenue - investment - totalExpenses
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Resumo Anual</h3>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Mês</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Receita</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Investimentos</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Despesas</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {MONTHS.map((monthName, index) => {
              const month = index + 1
              const revenue = calculateRevenueTotal(month)
              const investment = calculateInvestmentTotal(month)
              const expense = calculateExpenseTotal(month)
              const balance = calculateBalance(month)

              return (
                <tr key={month} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-gray-900">{monthName}</td>
                  <td className="py-3 px-4 text-right text-green-600 font-medium">{formatCurrency(revenue)}</td>
                  <td className="py-3 px-4 text-right text-blue-600">{formatCurrency(investment)}</td>
                  <td className="py-3 px-4 text-right text-red-600">{formatCurrency(expense)}</td>
                  <td className={cn("py-3 px-4 text-right font-bold", balance >= 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(balance)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden divide-y divide-gray-100">
        {MONTHS.map((monthName, index) => {
          const month = index + 1
          const isExpanded = expandedMonth === month
          const revenue = calculateRevenueTotal(month)
          const investment = calculateInvestmentTotal(month)
          const expense = calculateExpenseTotal(month)
          const balance = calculateBalance(month)

          return (
            <div key={month} className="bg-white">
              <button
                onClick={() => setExpandedMonth(isExpanded ? null : month)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium text-gray-900">{monthName}</span>
                  <span className={cn("text-sm font-semibold", balance >= 0 ? "text-green-600" : "text-red-600")}>
                    {formatCurrency(balance)}
                  </span>
                </div>
                {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 bg-gray-50/50 space-y-2 text-sm">
                  <div className="flex justify-between pt-2">
                    <span className="text-gray-600">Receita</span>
                    <span className="text-green-600 font-medium">{formatCurrency(revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Investimentos</span>
                    <span className="text-blue-600">{formatCurrency(investment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Despesas Totais</span>
                    <span className="text-red-600">{formatCurrency(expense)}</span>
                  </div>

                  {/* Detailed Expenses Breakdown */}
                  <div className="mt-3 pt-2 border-t border-gray-200 pl-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Fixas</span>
                      <span className="text-gray-700">{formatCurrency(calculateExpenseTotal(month, 'fixa'))}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Variáveis</span>
                      <span className="text-gray-700">{formatCurrency(calculateExpenseTotal(month, 'variavel'))}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Extras</span>
                      <span className="text-gray-700">{formatCurrency(calculateExpenseTotal(month, 'extra'))}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
