'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import type { Investment } from '@/lib/data/financial'

const INVESTMENT_CATEGORIES = [
  'Ações',
  'Tesouro Direto',
  'Renda fixa',
  'Previdência privada',
  'Outros',
]

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

interface InvestmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { category: string; amount: number; month: number }) => void
  investment: Investment | null
  year: number
}

export default function InvestmentModal({ isOpen, onClose, onSave, investment, year }: InvestmentModalProps) {
  const [category, setCategory] = useState('Ações')
  const [amount, setAmount] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)

  useEffect(() => {
    if (investment) {
      setCategory(investment.category)
      setAmount(investment.amount.toString())
      setMonth(investment.month)
    } else {
      setCategory('Ações')
      setAmount('')
      setMonth(new Date().getMonth() + 1)
    }
  }, [investment])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount.replace(',', '.'))
    if (isNaN(numAmount) || numAmount < 0) {
      alert('Por favor, insira um valor válido')
      return
    }
    onSave({ category, amount: numAmount, month })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6 m-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {investment ? 'Editar Investimento' : 'Novo Investimento'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              {INVESTMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mês
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              {MONTHS.map((m, index) => (
                <option key={index} value={index + 1}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor (R$)
            </label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Salvar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

