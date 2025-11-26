'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import type { Expense } from '@/lib/data/financial'

const EXPENSE_STRUCTURE = {
  fixa: {
    Habitação: ['Aluguel', 'Condomínio', 'Prestação da casa', 'Seguro da casa', 'Diarista', 'Mensalista'],
    Transporte: ['Prestação do carro', 'Seguro do carro', 'Estacionamento'],
    Saúde: ['Seguro saúde', 'Plano de saúde'],
    Educação: ['Colégio', 'Faculdade', 'Curso'],
    Impostos: ['IPTU', 'IPVA'],
    Outros: ['Seguro de vida'],
  },
  variavel: {
    Habitação: ['Luz', 'Água', 'Telefone', 'Telefone Celular', 'Gás', 'Mensalidade TV', 'Internet'],
    Transporte: ['Metrô', 'Ônibus', 'Combustível', 'Estacionamento'],
    Alimentação: ['Supermercado', 'Feira', 'Padaria'],
    Saúde: ['Medicamentos'],
    'Cuidados pessoais': ['Cabeleireiro', 'Manicure', 'Esteticista', 'Academia', 'Clube'],
  },
  extra: {
    Saúde: ['Médico', 'Dentista', 'Hospital'],
    'Manutenção/ prevenção': ['Carro', 'Casa'],
    Educação: ['Material escolar', 'Uniforme'],
  },
  adicional: {
    Lazer: ['Viagens', 'Cinema/teatro', 'Restaurantes/bares', 'Locadora DVD'],
    Vestuário: ['Roupas', 'Calçados', 'Acessórios'],
    Outros: ['Presentes'],
  },
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

interface ExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { type: string; category: string; item: string; amount: number; month: number }) => void
  expense: Expense | null
  defaultType?: 'fixa' | 'variavel' | 'extra' | 'adicional'
  prefillData?: { type: string; category: string; item: string } | null
  year: number
}

export default function ExpenseModal({ isOpen, onClose, onSave, expense, defaultType = 'fixa', prefillData, year }: ExpenseModalProps) {
  const [type, setType] = useState<'fixa' | 'variavel' | 'extra' | 'adicional'>(defaultType)
  const [category, setCategory] = useState('')
  const [item, setItem] = useState('')
  const [amount, setAmount] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)

  useEffect(() => {
    if (expense) {
      setType(expense.type as 'fixa' | 'variavel' | 'extra' | 'adicional')
      setCategory(expense.category)
      setItem(expense.item)
      setAmount(expense.amount.toString())
      setMonth(expense.month)
    } else if (prefillData) {
      setType(prefillData.type as 'fixa' | 'variavel' | 'extra' | 'adicional')
      setCategory(prefillData.category)
      setItem(prefillData.item)
      setAmount('')
      setMonth(new Date().getMonth() + 1)
    } else {
      setType(defaultType)
      const structure = EXPENSE_STRUCTURE[defaultType]
      const firstCategory = Object.keys(structure)[0] as keyof typeof structure
      setCategory(firstCategory)
      const items = structure[firstCategory]
      setItem(items[0])
      setAmount('')
      setMonth(new Date().getMonth() + 1)
    }
  }, [expense, defaultType, prefillData])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount.replace(',', '.'))
    if (isNaN(numAmount) || numAmount < 0) {
      alert('Por favor, insira um valor válido')
      return
    }
    onSave({ type, category, item, amount: numAmount, month })
  }

  const availableCategories = Object.keys(EXPENSE_STRUCTURE[type])
  const availableItems = category ? (EXPENSE_STRUCTURE[type][category as keyof typeof EXPENSE_STRUCTURE[typeof type]] || []) : []

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6 m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {expense ? 'Editar Despesa' : 'Nova Despesa'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              value={type}
              onChange={(e) => {
                const newType = e.target.value as typeof type
                setType(newType)
                const structure = EXPENSE_STRUCTURE[newType]
                const firstCategory = Object.keys(structure)[0] as keyof typeof structure
                setCategory(firstCategory)
                const items = structure[firstCategory]
                setItem(items[0])
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="fixa">Fixa</option>
              <option value="variavel">Variável</option>
              <option value="extra">Extra</option>
              <option value="adicional">Adicional</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => {
                const newCategory = e.target.value
                setCategory(newCategory)
                const structure = EXPENSE_STRUCTURE[type]
                const items = structure[newCategory as keyof typeof structure]
                if (items && items.length > 0) {
                  setItem(items[0])
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item
            </label>
            <select
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              {availableItems.map((it) => (
                <option key={it} value={it}>{it}</option>
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

