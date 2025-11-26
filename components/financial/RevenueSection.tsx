'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { createRevenue, updateRevenue, deleteRevenue } from '@/lib/data/financial'
import RevenueModal from './RevenueModal'
import type { Revenue } from '@/lib/data/financial'

const REVENUE_CATEGORIES = [
  'Salário',
  'Aluguel',
  'Pensão',
  'Horas extras',
  '13º salário',
  'Férias',
  'Outros',
]

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

interface RevenueSectionProps {
  revenues: Revenue[]
  year: number
  userId: string
  onUpdate: () => void
}

export default function RevenueSection({ revenues, year, userId, onUpdate }: RevenueSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null)

  const getRevenueForMonth = (category: string, month: number) => {
    return revenues.find(r => r.category === category && r.month === month)
  }

  const calculateTotalForMonth = (month: number) => {
    return revenues
      .filter(r => r.month === month)
      .reduce((sum, r) => sum + Number(r.amount), 0)
  }

  const handleSave = async (data: { category: string; amount: number; month: number }) => {
    try {
      if (editingRevenue) {
        await updateRevenue(editingRevenue.id, {
          amount: data.amount,
        })
      } else {
        await createRevenue({
          user_id: userId,
          category: data.category,
          amount: data.amount,
          month: data.month,
          year,
        })
      }
      onUpdate()
      setIsModalOpen(false)
      setEditingRevenue(null)
    } catch (error) {
      console.error('Error saving revenue:', error)
      alert('Erro ao salvar receita')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta receita?')) return
    try {
      await deleteRevenue(id)
      onUpdate()
    } catch (error) {
      console.error('Error deleting revenue:', error)
      alert('Erro ao deletar receita')
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Receitas</h3>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingRevenue(null)
            setIsModalOpen(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Receita
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
            {REVENUE_CATEGORIES.map((category) => (
              <tr key={category} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-2 font-medium text-gray-900">{category}</td>
                {MONTHS.map((_, monthIndex) => {
                  const month = monthIndex + 1
                  const revenue = getRevenueForMonth(category, month)
                  return (
                    <td key={monthIndex} className="py-2 px-2 text-right">
                      {revenue ? (
                        <div className="flex items-center justify-end gap-1 group">
                          <span className="text-gray-900">
                            R$ {Number(revenue.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                            <button
                              onClick={() => {
                                setEditingRevenue(revenue)
                                setIsModalOpen(true)
                              }}
                              className="p-1 text-gray-500 hover:text-primary"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDelete(revenue.id)}
                              className="p-1 text-gray-500 hover:text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingRevenue(null)
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
          </tbody>
        </table>
      </div>

      <RevenueModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingRevenue(null)
        }}
        onSave={handleSave}
        revenue={editingRevenue}
        year={year}
      />
    </Card>
  )
}

