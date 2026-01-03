'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { createExpense, updateExpense, deleteExpense } from '@/lib/data/financial'
import ExpenseModal from './ExpenseModal'
import type { Expense } from '@/lib/data/financial'
import { cn } from '@/lib/utils'

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

interface ExpenseSectionProps {
  expenses: Expense[]
  year: number
  userId: string
  onUpdate: () => void
}

export default function ExpenseSection({ expenses, year, userId, onUpdate }: ExpenseSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [selectedType, setSelectedType] = useState<'fixa' | 'variavel' | 'extra' | 'adicional'>('fixa')
  const [prefillData, setPrefillData] = useState<{ type: string; category: string; item: string } | null>(null)

  // Mobile state
  const [mobileMonth, setMobileMonth] = useState(new Date().getMonth() + 1)

  const getExpenseForMonth = (type: string, category: string, item: string, month: number) => {
    return expenses.find(e =>
      e.type === type &&
      e.category === category &&
      e.item === item &&
      e.month === month
    )
  }

  const calculateTotalForMonth = (type: string, month: number) => {
    return expenses
      .filter(e => e.type === type && e.month === month)
      .reduce((sum, e) => sum + Number(e.amount), 0)
  }

  const handleSave = async (data: { type: string; category: string; item: string; amount: number; month: number }) => {
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          amount: data.amount,
        })
      } else {
        await createExpense({
          user_id: userId,
          type: data.type,
          category: data.category,
          item: data.item,
          amount: data.amount,
          month: data.month,
          year,
        })
      }
      onUpdate()
      setIsModalOpen(false)
      setEditingExpense(null)
    } catch (error) {
      console.error('Error saving expense:', error)
      alert('Erro ao salvar despesa')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta despesa?')) return
    try {
      await deleteExpense(id)
      onUpdate()
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('Erro ao deletar despesa')
    }
  }

  const renderExpenseTable = (type: 'fixa' | 'variavel' | 'extra' | 'adicional', title: string) => {
    const structure = EXPENSE_STRUCTURE[type]

    return (
      <div className="mb-8">
        <h4 className="text-md font-semibold text-gray-900 mb-3">{title}</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-700">Categoria</th>
                <th className="text-left py-2 px-2 font-medium text-gray-700">Despesa</th>
                {MONTHS.map((month, index) => (
                  <th key={index} className="text-right py-2 px-2 font-medium text-gray-700 min-w-[100px]">
                    {month.substring(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(structure).map(([category, items]) =>
                items.map((item, itemIndex) => (
                  <tr key={`${category}-${item}`} className="border-b border-gray-100 hover:bg-gray-50">
                    {itemIndex === 0 && (
                      <td rowSpan={items.length} className="py-2 px-2 font-medium text-gray-900 align-top">
                        {category}
                      </td>
                    )}
                    <td className="py-2 px-2 text-gray-700">{item}</td>
                    {MONTHS.map((_, monthIndex) => {
                      const month = monthIndex + 1
                      const expense = getExpenseForMonth(type, category, item, month)
                      return (
                        <td key={monthIndex} className="py-2 px-2 text-right">
                          {expense ? (
                            <div className="flex items-center justify-end gap-1 group">
                              <span className="text-gray-900">
                                R$ {Number(expense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                                <button
                                  onClick={() => {
                                    setEditingExpense(expense)
                                    setIsModalOpen(true)
                                  }}
                                  className="p-1 text-gray-500 hover:text-primary"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDelete(expense.id)}
                                  className="p-1 text-gray-500 hover:text-red-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingExpense(null)
                                setSelectedType(type)
                                setPrefillData({ type, category, item })
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
                ))
              )}
              <tr className="border-t-2 border-gray-300 font-semibold bg-gray-50">
                <td colSpan={2} className="py-2 px-2 text-gray-900">Total {title.toLowerCase()}</td>
                {MONTHS.map((_, monthIndex) => {
                  const month = monthIndex + 1
                  const total = calculateTotalForMonth(type, month)
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
      </div>
    )
  }

  const renderMobileView = () => {
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

        {/* Expense Lists by Type */}
        {(['fixa', 'variavel', 'extra', 'adicional'] as const).map((type) => {
          const title = type === 'fixa' ? 'Fixas' : type === 'variavel' ? 'Variáveis' : type === 'extra' ? 'Extras' : 'Adicionais'
          const structure = EXPENSE_STRUCTURE[type]
          const total = calculateTotalForMonth(type, mobileMonth)

          return (
            <div key={type} className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h4 className="font-semibold text-gray-900">{title}</h4>
                <span className="text-sm font-bold text-gray-900">
                  R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-3">
                {Object.entries(structure).map(([category, items]) => (
                  <div key={category} className="space-y-2">
                    <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider">{category}</h5>
                    <div className="grid gap-2">
                      {items.map((item) => {
                        const expense = getExpenseForMonth(type, category, item, mobileMonth)
                        return (
                          <div key={item} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-700">{item}</span>
                            {expense ? (
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-900">
                                  R$ {Number(expense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingExpense(expense)
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
                                  setEditingExpense(null)
                                  setSelectedType(type)
                                  setPrefillData({ type, category, item })
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
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Despesas</h3>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingExpense(null)
            setSelectedType('fixa')
            setIsModalOpen(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Adicionar Despesa</span>
          <span className="sm:hidden">Adicionar</span>
        </Button>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block">
        {renderExpenseTable('fixa', 'Despesas Fixas')}
        {renderExpenseTable('variavel', 'Despesas Variáveis')}
        {renderExpenseTable('extra', 'Despesas Extras')}
        {renderExpenseTable('adicional', 'Despesas Adicionais')}
      </div>

      {/* Mobile View */}
      <div className="lg:hidden">
        {renderMobileView()}
      </div>

      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingExpense(null)
          setPrefillData(null)
        }}
        onSave={handleSave}
        expense={editingExpense}
        defaultType={selectedType}
        prefillData={prefillData}
        year={year}
      />
    </Card>
  )
}
