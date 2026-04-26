import { supabase } from '../../supabase'
import type {
  Installment,
  InstallmentInsert,
  InstallmentUpdate,
  Transaction,
  TransactionInsert,
} from './types'

export async function listInstallments(userId: string): Promise<Installment[]> {
  const { data, error } = await supabase
    .from('finance_installments')
    .select('*')
    .eq('user_id', userId)
    .order('first_due', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getInstallmentTransactions(
  installmentId: string,
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('*')
    .eq('installment_id', installmentId)
    .order('installment_index', { ascending: true })
  if (error) throw error
  return data ?? []
}

export interface CreateInstallmentInput {
  user_id: string
  category_id: string | null
  title: string
  total_amount: number
  total_count: number
  first_due: string // YYYY-MM-DD
  payment_method: string | null
  notes: string | null
}

/**
 * Cria o cabeçalho da compra parcelada e gera N transações filhas,
 * uma por mês a partir de `first_due`. Cada parcela = total_amount / total_count
 * (com ajuste de centavos na última parcela).
 */
export async function createInstallmentWithTransactions(
  input: CreateInstallmentInput,
): Promise<{ installment: Installment; transactions: Transaction[] }> {
  if (input.total_count < 1) throw new Error('Quantidade de parcelas inválida')

  const insertHeader: InstallmentInsert = {
    user_id: input.user_id,
    category_id: input.category_id,
    title: input.title,
    total_amount: input.total_amount,
    total_count: input.total_count,
    first_due: input.first_due,
    payment_method: input.payment_method,
    notes: input.notes,
  }

  const { data: header, error: hErr } = await supabase
    .from('finance_installments')
    .insert(insertHeader)
    .select()
    .single()
  if (hErr) throw hErr

  const baseCents = Math.floor((input.total_amount * 100) / input.total_count)
  const remainderCents = Math.round(input.total_amount * 100) - baseCents * input.total_count

  const [y, m, d] = input.first_due.split('-').map(Number)
  const firstDay = d
  const txs: TransactionInsert[] = []
  for (let i = 0; i < input.total_count; i += 1) {
    const date = new Date(y, m - 1 + i, 1)
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const day = Math.min(firstDay, lastDay)
    const occurred = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const amountCents = baseCents + (i === input.total_count - 1 ? remainderCents : 0)
    txs.push({
      user_id: input.user_id,
      kind: 'expense',
      category_id: input.category_id,
      title: `${input.title} (${i + 1}/${input.total_count})`,
      amount: amountCents / 100,
      occurred_on: occurred,
      payment_method: input.payment_method,
      notes: input.notes,
      installment_id: header.id,
      installment_index: i + 1,
      paid: false,
    })
  }

  const { data: createdTxs, error: tErr } = await supabase
    .from('finance_transactions')
    .insert(txs)
    .select()
  if (tErr) {
    await supabase.from('finance_installments').delete().eq('id', header.id)
    throw tErr
  }

  return { installment: header, transactions: createdTxs ?? [] }
}

export async function updateInstallment(
  id: string,
  updates: InstallmentUpdate,
): Promise<Installment> {
  const { data, error } = await supabase
    .from('finance_installments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteInstallment(id: string): Promise<void> {
  const { error } = await supabase.from('finance_installments').delete().eq('id', id)
  if (error) throw error
}
