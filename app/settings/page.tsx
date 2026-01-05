'use client'

import { useState, useEffect, useRef } from 'react'
import { Save, Loader2, ArrowLeft, Upload, Download, Bell, Sparkles, Calendar, ListTodo, DollarSign, BookOpen, Check, AlertCircle, Trash2 } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import WebPushSettings from '@/components/settings/WebPushSettings'
import TelegramSettings from '@/components/settings/TelegramSettings'
import { getSession } from '@/lib/auth'
import { getUserSettings, updateUserSettings, type UserSettingsData } from '@/lib/data/settings'
import { exportFullBackup, restoreFullBackup, exportSimpleBackup, restoreSimpleBackup, detectBackupModules, deleteAllAgenda, type BackupData, type BackupModule, type SimpleBackupData, type DateFilterOption } from '@/lib/data/backup'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [settings, setSettings] = useState<UserSettingsData | null>(null)

  // Backup states
  const [restoring, setRestoring] = useState(false)

  // Backup Simplificado states
  const [selectedModules, setSelectedModules] = useState<BackupModule[]>(['eventos', 'tarefas'])
  const [exportingSimple, setExportingSimple] = useState(false)
  const [importingSimple, setImportingSimple] = useState(false)
  const [importPreview, setImportPreview] = useState<{
    eventos: number
    tarefas: number
    financeiro: { receitas: number; despesas: number; investimentos: number } | null
    estudos: number
  } | null>(null)
  const [pendingImportData, setPendingImportData] = useState<SimpleBackupData | null>(null)
  const [importMode, setImportMode] = useState<'merge' | 'replace' | 'update'>('update')
  const simpleImportRef = useRef<HTMLInputElement>(null)

  // Filtros de exportação
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('future')
  const [includeRecurring, setIncludeRecurring] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const session = await getSession()
      if (!session?.user) return

      setUser(session.user)
      const data = await getUserSettings(session.user.id)
      setSettings(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user || !settings) return
    setSaving(true)
    try {
      await updateUserSettings(user.id, {
        notifications_enabled: settings.notifications_enabled,
        notification_minutes_before: Number(settings.notification_minutes_before)
      })
      alert('Configurações salvas!')
    } catch (error) {
      alert('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleBackupDownload = async () => {
    if (!user) return
    const backupData = await exportFullBackup(user.id)
    if (backupData) {
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `mhub-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
    } else {
      alert('Erro ao gerar backup')
    }
  }

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!confirm('ATENÇÃO: Isso irá substituir TODOS os seus dados atuais pelos do backup. Deseja continuar?')) return

    setRestoring(true)
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string) as BackupData
        const success = await restoreFullBackup(user.id, json)
        alert('Restauração concluída! A página será recarregada.')
        window.location.reload()
      } catch (err) {
        alert('Erro ao restaurar dados (Arquivo inválido?).')
        console.error(err)
      } finally {
        setRestoring(false)
      }
    }
    reader.readAsText(file)
  }

  // === BACKUP SIMPLIFICADO ===

  const toggleModule = (mod: BackupModule) => {
    setSelectedModules(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    )
  }

  const selectAllModules = () => {
    setSelectedModules(['eventos', 'tarefas', 'financeiro', 'estudos'])
  }

  const handleSimpleExport = async () => {
    if (!user || selectedModules.length === 0) return
    setExportingSimple(true)
    try {
      const backupData = await exportSimpleBackup(user.id, selectedModules, {
        dateFilter,
        includeRecurring
      })
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `mhub-ia-${selectedModules.join('-')}-${new Date().toISOString().split('T')[0]}.json`
      a.click()
    } catch (err) {
      alert('Erro ao exportar')
      console.error(err)
    } finally {
      setExportingSimple(false)
    }
  }

  const handleSimpleImportSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string)

        // Detecta módulos presentes
        const detected = detectBackupModules(json)
        setImportPreview(detected)
        setPendingImportData(json as SimpleBackupData)
      } catch (err) {
        alert('Arquivo JSON inválido')
        console.error(err)
        setImportPreview(null)
        setPendingImportData(null)
      }
    }
    reader.readAsText(file)
  }

  const handleSimpleImportConfirm = async () => {
    if (!user || !pendingImportData) return
    setImportingSimple(true)
    try {
      const stats = await restoreSimpleBackup(user.id, pendingImportData, importMode)
      const created = stats.eventos + stats.tarefas + stats.financeiro + stats.estudos
      const updated = stats.atualizados || 0

      let message = 'Importação concluída!'
      if (updated > 0) message += ` ${updated} atualizados.`
      if (created > 0) message += ` ${created} criados.`
      if (updated === 0 && created === 0) message += ' Nenhuma alteração necessária.'

      alert(message)
      setImportPreview(null)
      setPendingImportData(null)
      if (simpleImportRef.current) simpleImportRef.current.value = ''
    } catch (err: any) {
      alert('Erro: ' + (err?.message || 'Falha na importação'))
      console.error(err)
    } finally {
      setImportingSimple(false)
    }
  }

  const cancelSimpleImport = () => {
    setImportPreview(null)
    setPendingImportData(null)
    if (simpleImportRef.current) simpleImportRef.current.value = ''
  }

  // === ZONA DE PERIGO ===
  const [deletingAgenda, setDeletingAgenda] = useState(false)

  const handleDeleteAllAgenda = async () => {
    if (!user) return

    // Confirmação dupla
    const confirm1 = confirm('⚠️ ATENÇÃO: Isso vai DELETAR TODOS os eventos e tarefas da sua agenda.\n\nDeseja continuar?')
    if (!confirm1) return

    const confirm2 = prompt('Digite "DELETAR" para confirmar:')
    if (confirm2?.toUpperCase() !== 'DELETAR') {
      alert('Operação cancelada.')
      return
    }

    setDeletingAgenda(true)
    try {
      const result = await deleteAllAgenda(user.id)
      alert(`Agenda limpa! ${result.eventos} eventos e ${result.tarefas} tarefas foram deletados.`)
    } catch (err: any) {
      alert('Erro: ' + (err?.message || 'Falha ao deletar'))
      console.error(err)
    } finally {
      setDeletingAgenda(false)
    }
  }

  const refreshSettings = () => {
    loadData()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!settings || !user) return null

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pl-64 pt-20 md:pt-0">
      <header className="fixed top-0 left-0 right-0 md:left-64 bg-white border-b border-gray-200 px-6 py-4 z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="md:hidden">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Configurações</h1>
        </div>
      </header>

      <main className="p-6 mt-16 md:mt-20 max-w-4xl space-y-8">

        {/* Notificações Locais */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-500" />
            Notificações Locais
          </h2>

          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="font-medium text-gray-900">Ativar Notificações</p>
              <p className="text-sm text-gray-500">Receba lembretes antes dos seus compromissos (apenas com site aberto)</p>
            </div>
            <div className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.notifications_enabled}
                onChange={(e) => setSettings({ ...settings, notifications_enabled: e.target.checked })}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </div>
          </div>

          {settings.notifications_enabled && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 text-gray-400" />
                <label className="text-sm font-medium text-gray-700">
                  Notificar com quantos minutos de antecedência?
                </label>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  className="w-24 bg-white"
                  value={settings.notification_minutes_before}
                  onChange={(e) => setSettings({ ...settings, notification_minutes_before: Number(e.target.value) })}
                />
                <span className="text-sm text-gray-500">minutos antes</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Notificar Reagendamentos</p>
              <p className="text-sm text-gray-500">Enviar novo alerta se eu mudar o horário de um evento que já foi notificado.</p>
            </div>
            <div className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.allow_multiple_notifications ?? true}
                onChange={(e) => setSettings({ ...settings, allow_multiple_notifications: e.target.checked })}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Configurações
            </Button>
          </div>
        </Card>

        {/* Notificações Push */}
        <WebPushSettings userId={user.id} />

        {/* Notificações Telegram */}
        <TelegramSettings
          userId={user.id}
          initialSettings={settings}
          onUpdate={refreshSettings}
        />

        {/* ============ BACKUP SIMPLIFICADO PARA IA ============ */}
        <Card className="p-6 border-l-4 border-l-indigo-500">
          <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            Backup Simplificado para IA
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Exporte seus dados em formato compacto e legível para edição por IA (ChatGPT, Claude, etc).
          </p>

          {/* Exportar */}
          <div className="space-y-4 mb-8">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-gray-400" />
              Exportar
            </h3>

            <p className="text-sm text-gray-500">Selecione o que exportar:</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: 'eventos' as BackupModule, label: 'Eventos', icon: Calendar, color: 'indigo' },
                { id: 'tarefas' as BackupModule, label: 'Tarefas', icon: ListTodo, color: 'emerald' },
                { id: 'financeiro' as BackupModule, label: 'Financeiro', icon: DollarSign, color: 'amber' },
                { id: 'estudos' as BackupModule, label: 'Estudos', icon: BookOpen, color: 'purple' },
              ].map(mod => {
                const isSelected = selectedModules.includes(mod.id)
                const Icon = mod.icon
                return (
                  <button
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${isSelected
                      ? `border-${mod.color}-500 bg-${mod.color}-50 text-${mod.color}-700`
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                      }`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isSelected ? `bg-${mod.color}-500 text-white` : 'bg-gray-100'
                      }`}>
                      {isSelected ? <Check className="w-3 h-3" /> : null}
                    </div>
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{mod.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Filtros de Período (só aparece se eventos selecionado) */}
            {selectedModules.includes('eventos') && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <p className="text-sm font-medium text-gray-700">Período dos eventos:</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { value: 'today' as DateFilterOption, label: 'Só hoje', desc: '' },
                    { value: 'future' as DateFilterOption, label: 'Futuros', desc: '(de hoje em diante)' },
                    { value: 'all' as DateFilterOption, label: 'Tudo', desc: '(histórico completo)' },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-all ${dateFilter === opt.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                    >
                      <input
                        type="radio"
                        name="dateFilter"
                        value={opt.value}
                        checked={dateFilter === opt.value}
                        onChange={() => setDateFilter(opt.value)}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{opt.label}</span>
                      {opt.desc && <span className="text-xs text-gray-400">{opt.desc}</span>}
                    </label>
                  ))}
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeRecurring}
                    onChange={(e) => setIncludeRecurring(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-600">
                    Incluir eventos recorrentes
                    <span className="text-xs text-gray-400 ml-1">(senão, exporta só eventos únicos)</span>
                  </span>
                </label>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={selectAllModules}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Selecionar Tudo
              </button>

              <div className="flex-1" />

              <Button
                onClick={handleSimpleExport}
                disabled={exportingSimple || selectedModules.length === 0}
              >
                {exportingSimple ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                Baixar JSON
              </Button>
            </div>
          </div>

          {/* Importar */}
          <div className="space-y-4 pt-6 border-t border-gray-100">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-gray-400" />
              Importar
            </h3>

            <p className="text-sm text-gray-500">
              Importe um JSON editado. O sistema detecta automaticamente o conteúdo.
            </p>

            <input
              ref={simpleImportRef}
              type="file"
              accept=".json"
              className="hidden"
              id="simple-import-file"
              onChange={handleSimpleImportSelect}
            />

            {!importPreview ? (
              <label htmlFor="simple-import-file">
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-all">
                  <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Clique para selecionar arquivo JSON</p>
                </div>
              </label>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <AlertCircle className="w-4 h-4 text-indigo-500" />
                  Detectado no arquivo:
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className={`flex items-center gap-2 ${importPreview.eventos > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {importPreview.eventos > 0 ? <Check className="w-4 h-4" /> : <span className="w-4 h-4">✗</span>}
                    {importPreview.eventos} Eventos
                  </div>
                  <div className={`flex items-center gap-2 ${importPreview.tarefas > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {importPreview.tarefas > 0 ? <Check className="w-4 h-4" /> : <span className="w-4 h-4">✗</span>}
                    {importPreview.tarefas} Tarefas
                  </div>
                  <div className={`flex items-center gap-2 ${importPreview.financeiro ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {importPreview.financeiro ? <Check className="w-4 h-4" /> : <span className="w-4 h-4">✗</span>}
                    {importPreview.financeiro
                      ? `${importPreview.financeiro.receitas + importPreview.financeiro.despesas + importPreview.financeiro.investimentos} Financeiro`
                      : 'Financeiro'
                    }
                  </div>
                  <div className={`flex items-center gap-2 ${importPreview.estudos > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {importPreview.estudos > 0 ? <Check className="w-4 h-4" /> : <span className="w-4 h-4">✗</span>}
                    {importPreview.estudos} Matérias
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <span className="text-sm text-gray-600">Modo:</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'update'}
                      onChange={() => setImportMode('update')}
                      className="text-indigo-600"
                    />
                    <span className="text-sm font-medium text-indigo-600">Atualizar existentes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="text-indigo-600"
                    />
                    <span className="text-sm">Adicionar como novos</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-indigo-600"
                    />
                    <span className="text-sm text-rose-600">Substituir tudo</span>
                  </label>
                </div>

                <p className="text-xs text-gray-400 pt-1">
                  {importMode === 'update' && '• Busca por título+data+hora e atualiza. Eventos não encontrados são criados.'}
                  {importMode === 'merge' && '• Adiciona todos como novos (pode duplicar).'}
                  {importMode === 'replace' && '• Apaga TUDO e importa só o que está no JSON.'}
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={cancelSimpleImport}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancelar
                  </button>
                  <div className="flex-1" />
                  <Button onClick={handleSimpleImportConfirm} disabled={importingSimple}>
                    {importingSimple ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    Importar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Backup e Restauração (Completo) */}
        <Card className="p-6 border-l-4 border-l-rose-500">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Download className="w-5 h-5 text-rose-500" />
            Backup e Restauração
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Exportar Dados</h3>
              <p className="text-sm text-gray-500">Baixe um arquivo JSON com todas as suas tarefas, eventos e notas.</p>
              <Button variant="secondary" onClick={handleBackupDownload}>
                <Download className="w-4 h-4 mr-2" />
                Fazer Backup
              </Button>
            </div>

            <div className="space-y-3 border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-6">
              <h3 className="font-medium text-gray-900">Importar Dados</h3>
              <p className="text-sm text-gray-500">Restaure um backup anterior. Cuidado: Substitui os dados atuais.</p>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  id="restore-file"
                  onChange={handleRestore}
                  disabled={restoring}
                />
                <label htmlFor="restore-file">
                  <div
                    className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 shadow-sm h-10 py-2 px-4 w-full md:w-auto cursor-pointer"
                  >
                    {restoring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    {restoring ? 'Restaurando...' : 'Restaurar Backup'}
                  </div>
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* Zona de Perigo */}
        <Card className="p-6 border-l-4 border-l-red-500 bg-red-50/30">
          <h2 className="text-lg font-semibold text-red-700 mb-2 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Zona de Perigo
          </h2>
          <p className="text-sm text-red-600/70 mb-4">
            Ações irreversíveis. Tenha certeza antes de continuar.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200">
              <div>
                <h3 className="font-medium text-gray-900">Limpar Agenda</h3>
                <p className="text-sm text-gray-500">Deleta TODOS os eventos e tarefas. Irreversível.</p>
              </div>
              <button
                onClick={handleDeleteAllAgenda}
                disabled={deletingAgenda}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium transition-colors"
              >
                {deletingAgenda ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deletingAgenda ? 'Deletando...' : 'Deletar Tudo'}
              </button>
            </div>
          </div>
        </Card>

        <div className="flex justify-center pt-8">
          <p className="text-xs text-gray-400">MHUB v1.1 • Floridots Projects</p>
        </div>
      </main>
    </div>
  )
}
