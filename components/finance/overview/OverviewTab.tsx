'use client'

import { useMemo } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  Scale,
  TrendingUp,
} from 'lucide-react'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { useFinance } from '../FinanceContext'
import { formatCurrency, monthLabel } from '../shared/format'
import CategoryIcon from '../shared/CategoryIcon'
import YearDashboard from './YearDashboard'
import type { Transaction } from '@/lib/data/finance/types'

export default function OverviewTab() {
  const { transactions, yearTransactions, categoriesById, year, month } = useFinance()

  const monthTotals = useMemo(() => sumByKind(transactions), [transactions])
  const balance = monthTotals.income - monthTotals.expense
  const savingsRate =
    monthTotals.income > 0 ? ((monthTotals.income - monthTotals.expense) / monthTotals.income) * 100 : 0

  const expensesByCategory = useMemo(() => {
    const acc = new Map<string, number>()
    for (const t of transactions) {
      if (t.kind !== 'expense') continue
      const key = t.category_id ?? 'sem_categoria'
      acc.set(key, (acc.get(key) ?? 0) + Number(t.amount))
    }
    const entries = Array.from(acc.entries()).sort((a, b) => b[1] - a[1])
    return entries.map(([id, value]) => {
      const cat = id !== 'sem_categoria' ? categoriesById.get(id) : null
      return {
        id,
        name: cat?.name ?? 'Sem categoria',
        color: cat?.color ?? '#94a3b8',
        icon: cat?.icon ?? 'Tag',
        value,
      }
    })
  }, [transactions, categoriesById])

  const topExpenses = useMemo(
    () =>
      transactions
        .filter((t) => t.kind === 'expense')
        .sort((a, b) => Number(b.amount) - Number(a.amount))
        .slice(0, 5),
    [transactions],
  )

  const previousMonths = useMemo(() => buildSparkline(yearTransactions, year, month), [yearTransactions, year, month])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          icon={<ArrowUpRight size={18} />}
          label="Receitas"
          value={monthTotals.income}
          tone="green"
        />
        <SummaryCard
          icon={<ArrowDownRight size={18} />}
          label="Despesas"
          value={monthTotals.expense}
          tone="red"
        />
        <SummaryCard
          icon={<TrendingUp size={18} />}
          label="Investimentos"
          value={monthTotals.invest}
          tone="indigo"
        />
        <SummaryCard
          icon={<Scale size={18} />}
          label="Saldo do mês"
          value={balance}
          tone={balance >= 0 ? 'green' : 'red'}
          extra={`${savingsRate.toFixed(0)}% poupado`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Despesas por categoria</h3>
            <span className="text-xs text-gray-400">{monthLabel(month)} / {year}</span>
          </div>

          {expensesByCategory.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              Nenhuma despesa registrada neste mês.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {expensesByCategory.map((c) => (
                        <Cell key={c.id} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <ul className="space-y-2 text-sm">
                {expensesByCategory.slice(0, 8).map((c) => {
                  const pct = monthTotals.expense > 0 ? (c.value / monthTotals.expense) * 100 : 0
                  return (
                    <li key={c.id} className="flex items-center gap-2">
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${c.color}1a` }}
                      >
                        <CategoryIcon name={c.icon} color={c.color} size={14} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-gray-700">
                          <span className="truncate">{c.name}</span>
                          <span className="font-medium tabular-nums">{formatCurrency(c.value)}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: c.color }}
                          />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Top 5 gastos do mês</h3>
            {topExpenses.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">Sem despesas ainda.</div>
            ) : (
              <ul className="space-y-2">
                {topExpenses.map((t) => {
                  const cat = t.category_id ? categoriesById.get(t.category_id) : undefined
                  return (
                    <li key={t.id} className="flex items-center gap-2 text-sm">
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${cat?.color ?? '#94a3b8'}1a` }}
                      >
                        <CategoryIcon name={cat?.icon ?? 'Tag'} color={cat?.color ?? '#94a3b8'} size={14} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 truncate">{t.title}</div>
                        <div className="text-[11px] text-gray-400">{cat?.name ?? '—'}</div>
                      </div>
                      <div className="font-semibold text-red-600 tabular-nums text-sm">
                        {formatCurrency(t.amount)}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
              <PiggyBank size={16} /> Tendência (últimos 6 meses)
            </h3>
            <Sparkline data={previousMonths} />
          </div>
        </div>
      </div>

      <YearDashboard />
    </div>
  )
}

function sumByKind(list: Transaction[]) {
  let income = 0
  let expense = 0
  let invest = 0
  for (const t of list) {
    const v = Number(t.amount)
    if (t.kind === 'income') income += v
    else if (t.kind === 'expense') expense += v
    else invest += v
  }
  return { income, expense, invest }
}

function buildSparkline(yearTx: Transaction[], year: number, month: number) {
  const points: { month: number; income: number; expense: number; balance: number }[] = []
  for (let offset = 5; offset >= 0; offset -= 1) {
    let m = month - offset
    let y = year
    while (m <= 0) {
      m += 12
      y -= 1
    }
    const sums = yearTx
      .filter((t) => {
        const [ty, tm] = t.occurred_on.split('-').map(Number)
        return ty === y && tm === m
      })
      .reduce(
        (acc, t) => {
          if (t.kind === 'income') acc.income += Number(t.amount)
          else if (t.kind === 'expense') acc.expense += Number(t.amount)
          return acc
        },
        { income: 0, expense: 0 },
      )
    points.push({ month: m, income: sums.income, expense: sums.expense, balance: sums.income - sums.expense })
  }
  return points
}

function Sparkline({ data }: { data: { month: number; balance: number }[] }) {
  const max = Math.max(1, ...data.map((d) => Math.abs(d.balance)))
  return (
    <div className="flex items-end justify-between gap-1.5 h-24">
      {data.map((d, i) => {
        const h = (Math.abs(d.balance) / max) * 100
        const positive = d.balance >= 0
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex-1 flex items-end">
              <div
                className={`w-full rounded-md ${positive ? 'bg-emerald-400/80' : 'bg-red-400/80'}`}
                style={{ height: `${Math.max(h, 4)}%` }}
                title={formatCurrency(d.balance)}
              />
            </div>
            <span className="text-[10px] text-gray-400">{monthLabel(d.month, true)}</span>
          </div>
        )
      })}
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
  extra,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone: 'red' | 'green' | 'indigo'
  extra?: string
}) {
  const styles = {
    red: { ring: 'bg-red-500/10 text-red-600', value: 'text-red-600' },
    green: { ring: 'bg-emerald-500/10 text-emerald-600', value: 'text-emerald-600' },
    indigo: { ring: 'bg-indigo-500/10 text-indigo-600', value: 'text-indigo-600' },
  }[tone]
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <span className="text-xs uppercase tracking-wide text-gray-400">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${styles.ring}`}>{icon}</span>
      </div>
      <div className={`mt-2 text-xl font-bold ${styles.value} tabular-nums`}>{formatCurrency(value)}</div>
      {extra ? <div className="text-[11px] text-gray-400 mt-0.5">{extra}</div> : null}
    </div>
  )
}
