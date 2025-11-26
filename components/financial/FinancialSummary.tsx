'use client'

import Card from '@/components/ui/Card'
import type { Revenue, Investment, Expense } from '@/lib/data/financial'

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
  const calculateTotalForMonth = (month: number, data: Array<{ month: number; amount: number }>) => {
    return data
      .filter(item => item.month === month)
      .reduce((sum, item) => sum + Number(item.amount), 0)
  }

  const calculateRevenueTotal = (month: number) => {
    return calculateTotalForMonth(month, revenues)
  }

  const calculateInvestmentTotal = (month: number) => {
    return calculateTotalForMonth(month, investments)
  }

  const calculateExpenseTotal = (month: number, type: string) => {
    return expenses
      .filter(e => e.month === month && e.type === type)
      .reduce((sum, e) => sum + Number(e.amount), 0)
  }

  const calculateTotalExpenses = (month: number) => {
    return expenses
      .filter(e => e.month === month)
      .reduce((sum, e) => sum + Number(e.amount), 0)
  }

  const calculateBalance = (month: number) => {
    const revenue = calculateRevenueTotal(month)
    const investment = calculateInvestmentTotal(month)
    const totalExpenses = calculateTotalExpenses(month)
    return revenue - investment - totalExpenses
  }

  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return 0
    return ((value / total) * 100).toFixed(1)
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo Financeiro</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 font-medium text-gray-700">Item</th>
              {MONTHS.map((month, index) => (
                <th key={index} className="text-right py-2 px-2 font-medium text-gray-700 min-w-[100px]">
                  {month.substring(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200 font-semibold">
              <td className="py-2 px-2 text-gray-900">Receita</td>
              {MONTHS.map((_, index) => {
                const month = index + 1
                const total = calculateRevenueTotal(month)
                return (
                  <td key={index} className="py-2 px-2 text-right text-green-600">
                    R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                )
              })}
            </tr>
            
            <tr className="border-b border-gray-200 font-semibold">
              <td className="py-2 px-2 text-gray-900">Investimentos</td>
              {MONTHS.map((_, index) => {
                const month = index + 1
                const total = calculateInvestmentTotal(month)
                const revenue = calculateRevenueTotal(month)
                const percentage = calculatePercentage(total, revenue)
                return (
                  <td key={index} className="py-2 px-2 text-right">
                    <div className="text-blue-600">
                      R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {percentage}%
                    </div>
                  </td>
                )
              })}
            </tr>
            
            <tr className="border-b border-gray-200">
              <td className="py-2 px-2 text-gray-700 pl-4">Despesas Fixas</td>
              {MONTHS.map((_, index) => {
                const month = index + 1
                const total = calculateExpenseTotal(month, 'fixa')
                const revenue = calculateRevenueTotal(month)
                const percentage = calculatePercentage(total, revenue)
                return (
                  <td key={index} className="py-2 px-2 text-right">
                    <div className="text-gray-900">
                      R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {percentage}%
                    </div>
                  </td>
                )
              })}
            </tr>
            
            <tr className="border-b border-gray-200">
              <td className="py-2 px-2 text-gray-700 pl-4">Despesas Variáveis</td>
              {MONTHS.map((_, index) => {
                const month = index + 1
                const total = calculateExpenseTotal(month, 'variavel')
                const revenue = calculateRevenueTotal(month)
                const percentage = calculatePercentage(total, revenue)
                return (
                  <td key={index} className="py-2 px-2 text-right">
                    <div className="text-gray-900">
                      R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {percentage}%
                    </div>
                  </td>
                )
              })}
            </tr>
            
            <tr className="border-b border-gray-200">
              <td className="py-2 px-2 text-gray-700 pl-4">Despesas Extras</td>
              {MONTHS.map((_, index) => {
                const month = index + 1
                const total = calculateExpenseTotal(month, 'extra')
                const revenue = calculateRevenueTotal(month)
                const percentage = calculatePercentage(total, revenue)
                return (
                  <td key={index} className="py-2 px-2 text-right">
                    <div className="text-gray-900">
                      R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {percentage}%
                    </div>
                  </td>
                )
              })}
            </tr>
            
            <tr className="border-b border-gray-200">
              <td className="py-2 px-2 text-gray-700 pl-4">Despesas Adicionais</td>
              {MONTHS.map((_, index) => {
                const month = index + 1
                const total = calculateExpenseTotal(month, 'adicional')
                const revenue = calculateRevenueTotal(month)
                const percentage = calculatePercentage(total, revenue)
                return (
                  <td key={index} className="py-2 px-2 text-right">
                    <div className="text-gray-900">
                      R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {percentage}%
                    </div>
                  </td>
                )
              })}
            </tr>
            
            <tr className="border-t-2 border-gray-300 font-semibold bg-gray-50">
              <td className="py-2 px-2 text-gray-900">Saldo</td>
              {MONTHS.map((_, index) => {
                const month = index + 1
                const balance = calculateBalance(month)
                return (
                  <td key={index} className={`py-2 px-2 text-right ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
}

