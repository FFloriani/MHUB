import { supabase } from '../../supabase'
import type {
  Loan,
  LoanInsert,
  LoanPayment,
  LoanPaymentInsert,
  LoanUpdate,
} from './types'

export async function listLoans(userId: string): Promise<Loan[]> {
  const { data, error } = await supabase
    .from('finance_loans')
    .select('*')
    .eq('user_id', userId)
    .order('taken_on', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createLoan(payload: LoanInsert): Promise<Loan> {
  const { data, error } = await supabase
    .from('finance_loans')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateLoan(id: string, updates: LoanUpdate): Promise<Loan> {
  const { data, error } = await supabase
    .from('finance_loans')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteLoan(id: string): Promise<void> {
  const { error } = await supabase.from('finance_loans').delete().eq('id', id)
  if (error) throw error
}

export async function listLoanPayments(loanId: string): Promise<LoanPayment[]> {
  const { data, error } = await supabase
    .from('finance_loan_payments')
    .select('*')
    .eq('loan_id', loanId)
    .order('paid_on', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function listAllLoanPayments(userId: string): Promise<LoanPayment[]> {
  const { data, error } = await supabase
    .from('finance_loan_payments')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return data ?? []
}

export async function createLoanPayment(
  payload: LoanPaymentInsert,
): Promise<LoanPayment> {
  const { data, error } = await supabase
    .from('finance_loan_payments')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteLoanPayment(id: string): Promise<void> {
  const { error } = await supabase.from('finance_loan_payments').delete().eq('id', id)
  if (error) throw error
}

export interface LoanWithBalance {
  loan: Loan
  paid: number
  remaining: number
  payments: LoanPayment[]
}

export async function listLoansWithBalance(userId: string): Promise<LoanWithBalance[]> {
  const [loans, payments] = await Promise.all([
    listLoans(userId),
    listAllLoanPayments(userId),
  ])
  const byLoan = new Map<string, LoanPayment[]>()
  for (const p of payments) {
    const arr = byLoan.get(p.loan_id) ?? []
    arr.push(p)
    byLoan.set(p.loan_id, arr)
  }
  return loans.map((loan) => {
    const ps = byLoan.get(loan.id) ?? []
    const paid = ps.reduce((acc, p) => acc + Number(p.amount), 0)
    return {
      loan,
      paid,
      remaining: Math.max(0, Number(loan.principal) - paid),
      payments: ps.sort((a, b) => (a.paid_on < b.paid_on ? 1 : -1)),
    }
  })
}
