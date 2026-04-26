'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { ensureDefaultCategories, listCategories } from '@/lib/data/finance/categories'
import { listTransactionsByMonth, listTransactionsByYear } from '@/lib/data/finance/transactions'
import type { Category, Transaction } from '@/lib/data/finance/types'

interface FinanceContextValue {
  user: User
  year: number
  month: number
  setMonth: (year: number, month: number) => void
  categories: Category[]
  categoriesById: Map<string, Category>
  refreshCategories: () => Promise<void>
  transactions: Transaction[]
  yearTransactions: Transaction[]
  isLoading: boolean
  refreshTransactions: () => Promise<void>
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function FinanceProvider({ user, children }: { user: User; children: React.ReactNode }) {
  const today = useRef(new Date()).current
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonthState] = useState(today.getMonth() + 1)
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [yearTransactions, setYearTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refreshCategories = useCallback(async () => {
    const cats = await listCategories(user.id)
    if (cats.length === 0) {
      const seeded = await ensureDefaultCategories(user.id)
      setCategories(seeded)
    } else {
      setCategories(cats)
    }
  }, [user.id])

  const refreshTransactions = useCallback(async () => {
    const [monthTx, yearTx] = await Promise.all([
      listTransactionsByMonth(user.id, year, month),
      listTransactionsByYear(user.id, year),
    ])
    setTransactions(monthTx)
    setYearTransactions(yearTx)
  }, [user.id, year, month])

  useEffect(() => {
    let active = true
    setIsLoading(true)
    ;(async () => {
      try {
        await refreshCategories()
        await refreshTransactions()
      } catch (err) {
        console.error('Erro carregando dados financeiros', err)
      } finally {
        if (active) setIsLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [refreshCategories, refreshTransactions])

  const setMonth = useCallback((y: number, m: number) => {
    setYear(y)
    setMonthState(m)
  }, [])

  const categoriesById = useMemo(() => {
    const map = new Map<string, Category>()
    for (const c of categories) map.set(c.id, c)
    return map
  }, [categories])

  const value = useMemo<FinanceContextValue>(
    () => ({
      user,
      year,
      month,
      setMonth,
      categories,
      categoriesById,
      refreshCategories,
      transactions,
      yearTransactions,
      isLoading,
      refreshTransactions,
    }),
    [
      user,
      year,
      month,
      setMonth,
      categories,
      categoriesById,
      refreshCategories,
      transactions,
      yearTransactions,
      isLoading,
      refreshTransactions,
    ],
  )

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
