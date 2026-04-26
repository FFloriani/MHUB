'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useFinance } from '../FinanceContext'
import { formatCurrency, formatCurrencyCompact, monthLabel } from '../shared/format'
import type { Transaction } from '@/lib/data/finance/types'

export default function YearDashboard() {
  const { yearTransactions, year, categoriesById } = useFinance()

  const monthly = useMemo(() => buildMonthly(yearTransactions), [yearTransactions])
  const heat = useMemo(
    () => buildHeatmap(yearTransactions, categoriesById),
    [yearTransactions, categoriesById],
  )

  const yearTotals = monthly.reduce(
    (acc, m) => {
      acc.income += m.income
      acc.expense += m.expense
      acc.invest += m.invest
      acc.balance += m.balance
      return acc
    },
    { income: 0, expense: 0, invest: 0, balance: 0 },
  )

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Visão anual {year}</h3>
          <div className="flex gap-3 text-xs text-gray-500">
            <span>
              Entradas: <span className="text-emerald-600 font-medium">{formatCurrency(yearTotals.income)}</span>
            </span>
            <span>
              Saídas: <span className="text-red-600 font-medium">{formatCurrency(yearTotals.expense)}</span>
            </span>
            <span>
              Saldo:{' '}
              <span
                className={`font-medium ${yearTotals.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
              >
                {formatCurrency(yearTotals.balance)}
              </span>
            </span>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthly}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCurrencyCompact}
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[6, 6, 0, 0]} />
              <Bar dataKey="invest" name="Investimentos" fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Line
                type="monotone"
                dataKey="cumulativeBalance"
                name="Saldo acumulado"
                stroke="#0f172a"
                strokeWidth={2.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {heat.categories.length > 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Mapa de calor por categoria (despesas)</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="text-left text-xs text-gray-400 font-normal pb-1">Categoria</th>
                  {Array.from({ length: 12 }, (_, i) => (
                    <th key={i} className="text-[10px] text-gray-400 font-normal pb-1 text-center">
                      {monthLabel(i + 1, true)}
                    </th>
                  ))}
                  <th className="text-right text-xs text-gray-400 font-normal pb-1 pl-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {heat.categories.map((row) => (
                  <tr key={row.id}>
                    <td className="text-sm text-gray-700 truncate pr-2" style={{ maxWidth: 160 }}>
                      <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ background: row.color }} />
                      {row.name}
                    </td>
                    {row.values.map((v: number, i: number) => {
                      const intensity = heat.maxByCategory.get(row.id) ?? 0
                      const ratio = intensity > 0 ? v / intensity : 0
                      const alpha = Math.round(ratio * 255).toString(16).padStart(2, '0')
                      return (
                        <td key={i} className="p-0">
                          <div
                            className="w-full h-7 rounded-md text-[10px] flex items-center justify-center text-white font-medium"
                            style={{
                              background: v > 0 ? `${row.color}${alpha === '00' ? '20' : alpha}` : '#f1f5f9',
                            }}
                            title={`${monthLabel(i + 1)}: ${formatCurrency(v)}`}
                          >
                            {ratio > 0.5 ? formatCurrencyCompact(v).replace('R$ ', '') : ''}
                          </div>
                        </td>
                      )
                    })}
                    <td className="text-right text-sm font-medium text-gray-900 tabular-nums pl-2">
                      {formatCurrencyCompact(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}

interface MonthRow {
  month: number
  label: string
  income: number
  expense: number
  invest: number
  balance: number
  cumulativeBalance: number
}

function buildMonthly(txs: Transaction[]): MonthRow[] {
  const months: MonthRow[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    label: monthLabel(i + 1, true),
    income: 0,
    expense: 0,
    invest: 0,
    balance: 0,
    cumulativeBalance: 0,
  }))
  for (const t of txs) {
    const m = Number(t.occurred_on.split('-')[1])
    if (m < 1 || m > 12) continue
    const v = Number(t.amount)
    if (t.kind === 'income') months[m - 1].income += v
    else if (t.kind === 'expense') months[m - 1].expense += v
    else months[m - 1].invest += v
  }
  let acc = 0
  for (const row of months) {
    row.balance = row.income - row.expense
    acc += row.balance
    row.cumulativeBalance = acc
  }
  return months
}

interface HeatRow {
  id: string
  name: string
  color: string
  values: number[]
  total: number
}

function buildHeatmap(
  txs: Transaction[],
  categoriesById: Map<string, { id: string; name: string; color: string }>,
) {
  const map = new Map<string, HeatRow>()
  for (const t of txs) {
    if (t.kind !== 'expense') continue
    const id = t.category_id ?? 'sem_categoria'
    const cat = id !== 'sem_categoria' ? categoriesById.get(id) : null
    let row = map.get(id)
    if (!row) {
      row = {
        id,
        name: cat?.name ?? 'Sem categoria',
        color: cat?.color ?? '#94a3b8',
        values: Array(12).fill(0),
        total: 0,
      }
      map.set(id, row)
    }
    const m = Number(t.occurred_on.split('-')[1])
    if (m < 1 || m > 12) continue
    const v = Number(t.amount)
    row.values[m - 1] += v
    row.total += v
  }

  const categories = Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
  const maxByCategory = new Map<string, number>()
  for (const c of categories) {
    maxByCategory.set(c.id, Math.max(0, ...c.values))
  }
  return { categories, maxByCategory }
}
