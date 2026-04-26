import type { Database } from '../../supabase'

type T = Database['public']['Tables']

export type FinanceKind = 'expense' | 'income' | 'investment'

export type Category = T['finance_categories']['Row']
export type CategoryInsert = T['finance_categories']['Insert']
export type CategoryUpdate = T['finance_categories']['Update']

export type Transaction = T['finance_transactions']['Row']
export type TransactionInsert = T['finance_transactions']['Insert']
export type TransactionUpdate = T['finance_transactions']['Update']

export type Recurring = T['finance_recurring']['Row']
export type RecurringInsert = T['finance_recurring']['Insert']
export type RecurringUpdate = T['finance_recurring']['Update']

export type Installment = T['finance_installments']['Row']
export type InstallmentInsert = T['finance_installments']['Insert']
export type InstallmentUpdate = T['finance_installments']['Update']

export type Budget = T['finance_budgets']['Row']
export type BudgetInsert = T['finance_budgets']['Insert']
export type BudgetUpdate = T['finance_budgets']['Update']

export type Loan = T['finance_loans']['Row']
export type LoanInsert = T['finance_loans']['Insert']
export type LoanUpdate = T['finance_loans']['Update']

export type LoanPayment = T['finance_loan_payments']['Row']
export type LoanPaymentInsert = T['finance_loan_payments']['Insert']

export type Attachment = T['finance_attachments']['Row']

export const PAYMENT_METHODS = [
  'Pix',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Dinheiro',
  'Boleto',
  'Transferência',
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const KIND_LABELS: Record<FinanceKind, string> = {
  expense: 'Despesa',
  income: 'Receita',
  investment: 'Investimento',
}

export const KIND_COLORS: Record<FinanceKind, string> = {
  expense: '#ef4444',
  income: '#10b981',
  investment: '#6366f1',
}
