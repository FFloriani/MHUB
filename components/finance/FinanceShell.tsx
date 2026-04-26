'use client'

import { useState } from 'react'
import {
  LayoutDashboard,
  ListTree,
  RotateCw,
  Layers,
  Target,
  Coins,
  Tags,
  type LucideIcon,
} from 'lucide-react'
import { useFinance } from './FinanceContext'
import MonthSelector from './MonthSelector'
import OverviewTab from './overview/OverviewTab'
import TransactionsTab from './transactions/TransactionsTab'
import RecurringTab from './recurring/RecurringTab'
import InstallmentsTab from './installments/InstallmentsTab'
import BudgetsTab from './budgets/BudgetsTab'
import LoansTab from './loans/LoansTab'
import CategoriesTab from './categories/CategoriesTab'

type TabId = 'overview' | 'transactions' | 'recurring' | 'installments' | 'budgets' | 'loans' | 'categories'

interface TabDef {
  id: TabId
  label: string
  icon: LucideIcon
}

const TABS: TabDef[] = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'transactions', label: 'Lançamentos', icon: ListTree },
  { id: 'recurring', label: 'Recorrentes', icon: RotateCw },
  { id: 'installments', label: 'Parceladas', icon: Layers },
  { id: 'budgets', label: 'Orçamento', icon: Target },
  { id: 'loans', label: 'Empréstimos', icon: Coins },
  { id: 'categories', label: 'Categorias', icon: Tags },
]

export default function FinanceShell() {
  const { year, month, setMonth, isLoading } = useFinance()
  const [tab, setTab] = useState<TabId>('overview')

  return (
    <div className="flex-1 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-gray-500 mt-1">
            Controle completo de gastos, receitas, investimentos e empréstimos.
          </p>
        </div>
        <MonthSelector year={year} month={month} onChange={setMonth} />
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-1 flex flex-wrap gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = t.id === tab
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Carregando dados financeiros...</div>
      ) : (
        <div className="pb-12">
          {tab === 'overview' ? <OverviewTab /> : null}
          {tab === 'transactions' ? <TransactionsTab /> : null}
          {tab === 'recurring' ? <RecurringTab /> : null}
          {tab === 'installments' ? <InstallmentsTab /> : null}
          {tab === 'budgets' ? <BudgetsTab /> : null}
          {tab === 'loans' ? <LoansTab /> : null}
          {tab === 'categories' ? <CategoriesTab /> : null}
        </div>
      )}
    </div>
  )
}
