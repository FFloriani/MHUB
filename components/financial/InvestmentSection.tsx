'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
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

  // Mobile state
  const [mobileMonth, setMobileMonth] = useState(new Date().getMonth() + 1)

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

  const renderMobileView = () => {
    const total = calculateTotalForMonth(mobileMonth)

    return (
      <div className="space-y-6">
        {/* Month Selector */}
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
          <button
            onClick={() => setMobileMonth(m => m === 1 ? 12 : m - 1)}
            className="p-2 hover:bg-white rounded-full transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <span className="font-semibold text-gray-900">{MONTHS[mobileMonth - 1]}</span>
          <button
            onClick={() => setMobileMonth(m => m === 12 ? 1 : m + 1)}
            className="p-2 hover:bg-white rounded-full transition-colors"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Total Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <h4 className="font-semibold text-gray-900">Total Investimentos</h4>
          <span className="text-sm font-bold text-blue-600">
            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* List */}
        <div className="space-y-2">
          {INVESTMENT_CATEGORIES.map((category) => {
            const investment = getInvestmentForMonth(category, mobileMonth)
            return (
              <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">{category}</span>
                {investment ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-blue-600">
                      R$ {Number(investment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => {
                        setEditingInvestment(investment)
                        setIsModalOpen(true)
                      }}
                      className="text-gray-400 hover:text-blue-600"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingInvestment(null)
                      setIsModalOpen(true)
                    }}
                    className="text-xs text-blue-600 font-medium hover:underline"
                  >
                    Adicionar
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
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
          <span className="hidden sm:inline">Adicionar Investimento</span>
          <span className="sm:hidden">Adicionar</span>
        </Button>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block overflow-x-auto">
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
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="lg:hidden">
        {renderMobileView()}
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
