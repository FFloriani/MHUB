'use client'

import { useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Card from '@/components/ui/Card'
import type { Revenue, Investment, Expense } from '@/lib/data/financial'

const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

interface FinancialChartsProps {
  revenues: Revenue[]
  investments: Investment[]
  expenses: Expense[]
  year: number
}

export default function FinancialCharts({ revenues, investments, expenses, year }: FinancialChartsProps) {
  const chartData = useMemo(() => {
    return MONTHS_SHORT.map((month, index) => {
      const monthNum = index + 1
      
      const revenue = revenues
        .filter(r => r.month === monthNum)
        .reduce((sum, r) => sum + Number(r.amount), 0)
      
      const investment = investments
        .filter(i => i.month === monthNum)
        .reduce((sum, i) => sum + Number(i.amount), 0)
      
      const expenseFixa = expenses
        .filter(e => e.month === monthNum && e.type === 'fixa')
        .reduce((sum, e) => sum + Number(e.amount), 0)
      
      const expenseVariavel = expenses
        .filter(e => e.month === monthNum && e.type === 'variavel')
        .reduce((sum, e) => sum + Number(e.amount), 0)
      
      const expenseExtra = expenses
        .filter(e => e.month === monthNum && e.type === 'extra')
        .reduce((sum, e) => sum + Number(e.amount), 0)
      
      const expenseAdicional = expenses
        .filter(e => e.month === monthNum && e.type === 'adicional')
        .reduce((sum, e) => sum + Number(e.amount), 0)
      
      const totalExpenses = expenseFixa + expenseVariavel + expenseExtra + expenseAdicional
      const balance = revenue - investment - totalExpenses
      
      return {
        month,
        Receita: revenue,
        Investimentos: investment,
        'Despesas Fixas': expenseFixa,
        'Despesas Variáveis': expenseVariavel,
        'Despesas Extras': expenseExtra,
        'Despesas Adicionais': expenseAdicional,
        'Total Despesas': totalExpenses,
        Saldo: balance,
      }
    })
  }, [revenues, investments, expenses])

  const categoryData = useMemo(() => {
    const revenueCategories: Record<string, number> = {}
    revenues.forEach(r => {
      revenueCategories[r.category] = (revenueCategories[r.category] || 0) + Number(r.amount)
    })
    
    return Object.entries(revenueCategories).map(([name, value]) => ({
      name,
      value,
    }))
  }, [revenues])

  const expenseTypeData = useMemo(() => {
    const types: Record<string, number> = {}
    expenses.forEach(e => {
      const typeName = {
        fixa: 'Fixas',
        variavel: 'Variáveis',
        extra: 'Extras',
        adicional: 'Adicionais',
      }[e.type] || e.type
      types[typeName] = (types[typeName] || 0) + Number(e.amount)
    })
    
    return Object.entries(types).map(([name, value]) => ({
      name,
      value,
    }))
  }, [expenses])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico de Linha - Receitas vs Despesas */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Receitas vs Despesas</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            />
            <Legend />
            <Line type="monotone" dataKey="Receita" stroke="#10b981" strokeWidth={2} />
            <Line type="monotone" dataKey="Total Despesas" stroke="#ef4444" strokeWidth={2} />
            <Line type="monotone" dataKey="Investimentos" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Gráfico de Barras - Despesas por Tipo */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Despesas por Tipo</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            />
            <Legend />
            <Bar dataKey="Despesas Fixas" stackId="a" fill="#ef4444" />
            <Bar dataKey="Despesas Variáveis" stackId="a" fill="#f59e0b" />
            <Bar dataKey="Despesas Extras" stackId="a" fill="#8b5cf6" />
            <Bar dataKey="Despesas Adicionais" stackId="a" fill="#ec4899" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Gráfico de Pizza - Receitas por Categoria */}
      {categoryData.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Receitas por Categoria</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Gráfico de Pizza - Despesas por Tipo */}
      {expenseTypeData.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição de Despesas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={expenseTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {expenseTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Gráfico de Linha - Saldo Mensal */}
      <Card className="p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Saldo Mensal</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip 
              formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="Saldo" 
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ fill: '#10b981', r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}

