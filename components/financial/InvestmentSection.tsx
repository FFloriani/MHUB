'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { createInvestment, updateInvestment, deleteInvestment } from '@/lib/data/financial'
import InvestmentModal from './InvestmentModal'
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

interface InvestmentSectionProps {
  investments: Investment[]
  year: number
  userId: string
  onUpdate: () => void
}

export default function InvestmentSection({ investments, year, userId, onUpdate }: InvestmentSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null)

  const getInvestmentForMonth = (category: string, month: number) => {
    return investments.find(i => i.category === category && i.month === month)
  }

  const calculateTotalForMonth = (month: number) => {
    return investments
      .filter(i => i.month === month)
      .reduce((sum, i) => sum + Number(i.amount), 0)
  }

  const handleSave = async (data: { category: string; amount: number; month: number }) => {
    try {
      if (editingInvestment) {
        await updateInvestment(editingInvestment.id, {
          amount: data.amount,
        })
      } else {
        await createInvestment({
          user_id: userId,
          category: data.category,
          amount: data.amount,
          month: data.month,
          year,
        })
      }
      onUpdate()
      setIsModalOpen(false)
      setEditingInvestment(null)
    } catch (error) {
      console.error('Error saving investment:', error)
      alert('Erro ao salvar investimento')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este investimento?')) return
    try {
      await deleteInvestment(id)
      onUpdate()
    } catch (error) {
      console.error('Error deleting investment:', error)
      alert('Erro ao deletar investimento')
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Investimentos</h3>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingInvestment(null)
            setIsModalOpen(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Investimento
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 font-medium text-gray-700">Categoria</th>
              {MONTHS.map((month, index) => (
                <th key={index} className="text-right py-2 px-2 font-medium text-gray-700 min-w-[100px]">
                  {month.substring(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INVESTMENT_CATEGORIES.map((category) => (
              <tr key={category} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-2 font-medium text-gray-900">{category}</td>
                {MONTHS.map((_, monthIndex) => {
                  const month = monthIndex + 1
                  const investment = getInvestmentForMonth(category, month)
                  return (
                    <td key={monthIndex} className="py-2 px-2 text-right">
                      {investment ? (
                        <div className="flex items-center justify-end gap-1 group">
                          <span className="text-gray-900">
                            R$ {Number(investment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                            <button
                              onClick={() => {
                                setEditingInvestment(investment)
                                setIsModalOpen(true)
                              }}
                              className="p-1 text-gray-500 hover:text-primary"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDelete(investment.id)}
                              className="p-1 text-gray-500 hover:text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingInvestment(null)
                            setIsModalOpen(true)
                          }}
                          className="text-gray-400 hover:text-primary text-xs"
                        >
                          Adicionar
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr className="border-t-2 border-gray-300 font-semibold bg-gray-50">
              <td className="py-2 px-2 text-gray-900">Total</td>
              {MONTHS.map((_, monthIndex) => {
                const month = monthIndex + 1
                const total = calculateTotalForMonth(month)
                return (
                  <td key={monthIndex} className="py-2 px-2 text-right text-gray-900">
                    R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                )
              })}
            </tr>
            <tr className="border-t border-gray-200 text-xs text-gray-600">
              <td className="py-2 px-2">% sobre Receita</td>
              {MONTHS.map((_, monthIndex) => {
                const month = monthIndex + 1
                const investmentTotal = calculateTotalForMonth(month)
                // Este cálculo será feito no componente pai com acesso às receitas
                return (
                  <td key={monthIndex} className="py-2 px-2 text-right">
                    -
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <InvestmentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingInvestment(null)
        }}
        onSave={handleSave}
        investment={editingInvestment}
        year={year}
      />
    </Card>
  )
}

