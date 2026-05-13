'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import {
  Save,
  Loader2,
  Upload,
  Download,
  Bell,
  Sparkles,
  Calendar,
  ListTodo,
  DollarSign,
  BookOpen,
  Check,
  AlertCircle,
  Trash2,
  Key,
  Database,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  LogOut,
  User as UserIcon,
  Mail,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import WebPushSettings from '@/components/settings/WebPushSettings'
import TelegramSettings from '@/components/settings/TelegramSettings'
import ApiKeysSettings from '@/components/settings/ApiKeysSettings'
import { getSession, signOut } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { getUserSettings, updateUserSettings, type UserSettingsData } from '@/lib/data/settings'
import {
  exportFullBackup,
  restoreFullBackup,
  exportSimpleBackup,
  restoreSimpleBackup,
  detectBackupModules,
  deleteAllAgenda,
  type BackupData,
  type BackupModule,
  type SimpleBackupData,
  type DateFilterOption,
} from '@/lib/data/backup'
import { cn } from '@/lib/utils'

type SectionId = 'notificacoes' | 'api' | 'backup' | 'documentacao' | 'perigo'

interface SectionDef {
  id: SectionId
  label: string
  shortLabel: string
  description: string
  icon: typeof Bell
  accent: string
}

const SECTIONS: SectionDef[] = [
  {
    id: 'notificacoes',
    label: 'Notificações',
    shortLabel: 'Notificações',
    description: 'Push, Telegram e lembretes locais.',
    icon: Bell,
    accent: 'text-indigo-600 bg-indigo-50',
  },
  {
    id: 'api',
    label: 'API & integrações',
    shortLabel: 'API',
    description: 'Chaves para ChatGPT, Claude, Cursor ou scripts próprios.',
    icon: Key,
    accent: 'text-amber-700 bg-amber-50',
  },
  {
    id: 'backup',
    label: 'Backup & dados',
    shortLabel: 'Backup',
    description: 'Exportar e importar seus dados (JSON).',
    icon: Database,
    accent: 'text-emerald-700 bg-emerald-50',
  },
  {
    id: 'documentacao',
    label: 'Documentação & ajuda',
    shortLabel: 'Docs',
    description: 'Guia para humanos e guia para IAs.',
    icon: BookOpen,
    accent: 'text-sky-700 bg-sky-50',
  },
  {
    id: 'perigo',
    label: 'Zona de perigo',
    shortLabel: 'Perigo',
    description: 'Apagar dados irreversivelmente.',
    icon: AlertTriangle,
    accent: 'text-red-700 bg-red-50',
  },
]

function SectionHeader({ icon: Icon, title, description }: { icon: typeof Bell; title: string; description?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-1">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Icon className="w-5 h-5 text-gray-500" />
        {title}
      </h2>
      {description ? <p className="text-sm text-gray-500">{description}</p> : null}
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [settings, setSettings] = useState<UserSettingsData | null>(null)
  const [active, setActive] = useState<SectionId>('notificacoes')

  const [restoring, setRestoring] = useState(false)

  const [selectedModules, setSelectedModules] = useState<BackupModule[]>(['eventos', 'tarefas'])
  const [exportingSimple, setExportingSimple] = useState(false)
  const [importingSimple, setImportingSimple] = useState(false)
  const [importPreview, setImportPreview] = useState<{
    eventos: number
    tarefas: number
    financeiro: { transacoes: number; recorrentes: number; emprestimos: number } | null
    estudos: number
  } | null>(null)
  const [pendingImportData, setPendingImportData] = useState<SimpleBackupData | null>(null)
  const [importMode, setImportMode] = useState<'merge' | 'replace' | 'update'>('update')
  const simpleImportRef = useRef<HTMLInputElement>(null)

  const [dateFilter, setDateFilter] = useState<DateFilterOption>('future')
  const [includeRecurring, setIncludeRecurring] = useState(false)

  const [deletingAgenda, setDeletingAgenda] = useState(false)

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    try {
      const session = await getSession()
      if (!session?.user) return
      setUser({ id: session.user.id, email: session.user.email ?? undefined })
      const data = await getUserSettings(session.user.id)
      setSettings(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const refreshSettings = () => {
    void loadData()
  }

  async function handleSave() {
    if (!user || !settings) return
    setSaving(true)
    try {
      await updateUserSettings(user.id, {
        notifications_enabled: settings.notifications_enabled,
        notification_minutes_before: Number(settings.notification_minutes_before),
        allow_multiple_notifications: settings.allow_multiple_notifications ?? true,
      })
      alert('Configurações salvas!')
    } catch (error) {
      console.error(error)
      alert('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
      router.push('/')
      router.refresh()
    } catch (e) {
      console.error(e)
    }
  }

  async function handleBackupDownload() {
    if (!user) return
    const backupData = await exportFullBackup(user.id)
    if (!backupData) {
      alert('Erro ao gerar backup')
      return
    }
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mhub-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (!confirm('ATENÇÃO: Isso irá substituir TODOS os seus dados atuais pelos do backup. Deseja continuar?')) return

    setRestoring(true)
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string) as BackupData
        await restoreFullBackup(user.id, json)
        alert('Restauração concluída! A página será recarregada.')
        window.location.reload()
      } catch (err) {
        alert('Erro ao restaurar dados (arquivo inválido?).')
        console.error(err)
      } finally {
        setRestoring(false)
      }
    }
    reader.readAsText(file)
  }

  const toggleModule = (mod: BackupModule) => {
    setSelectedModules((prev) => (prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]))
  }

  const selectAllModules = () => setSelectedModules(['eventos', 'tarefas', 'financeiro', 'estudos'])

  async function handleSimpleExport() {
    if (!user || selectedModules.length === 0) return
    setExportingSimple(true)
    try {
      const backupData = await exportSimpleBackup(user.id, selectedModules, { dateFilter, includeRecurring })
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mhub-ia-${selectedModules.join('-')}-${new Date().toISOString().split('T')[0]}.json`
      a.click()
    } catch (err) {
      console.error(err)
      alert('Erro ao exportar')
    } finally {
      setExportingSimple(false)
    }
  }

  function handleSimpleImportSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string)
        const detected = detectBackupModules(json)
        setImportPreview(detected)
        setPendingImportData(json as SimpleBackupData)
      } catch (err) {
        console.error(err)
        alert('Arquivo JSON inválido')
        setImportPreview(null)
        setPendingImportData(null)
      }
    }
    reader.readAsText(file)
  }

  async function handleSimpleImportConfirm() {
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
    } catch (err) {
      console.error(err)
      alert('Erro: ' + (err instanceof Error ? err.message : 'falha na importação'))
    } finally {
      setImportingSimple(false)
    }
  }

  function cancelSimpleImport() {
    setImportPreview(null)
    setPendingImportData(null)
    if (simpleImportRef.current) simpleImportRef.current.value = ''
  }

  async function handleDeleteAllAgenda() {
    if (!user) return
    const c1 = confirm('⚠ Isso vai DELETAR TODOS os eventos e tarefas da sua agenda. Continuar?')
    if (!c1) return
    const c2 = prompt('Digite "DELETAR" para confirmar:')
    if (c2?.toUpperCase() !== 'DELETAR') {
      alert('Operação cancelada.')
      return
    }
    setDeletingAgenda(true)
    try {
      const r = await deleteAllAgenda(user.id)
      alert(`Agenda limpa! ${r.eventos} eventos e ${r.tarefas} tarefas deletados.`)
    } catch (err) {
      console.error(err)
      alert('Erro: ' + (err instanceof Error ? err.message : 'falha ao deletar'))
    } finally {
      setDeletingAgenda(false)
    }
  }

  const currentSection = useMemo(() => SECTIONS.find((s) => s.id === active) ?? SECTIONS[0], [active])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!settings || !user) return null

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configurações</h1>
            <p className="text-sm text-gray-500 mt-0.5">Tudo do MHUB num lugar só — escolha a seção à esquerda.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100">
              <UserIcon className="w-4 h-4 text-gray-500" />
              <span className="truncate max-w-[200px]" title={user.email}>
                {user.email ?? 'Conta'}
              </span>
            </div>
            <button
              onClick={() => void handleSignOut()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="lg:hidden mb-4 -mx-1 px-1 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {SECTIONS.map((s) => {
              const isActive = s.id === active
              const Icon = s.icon
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap border',
                    isActive
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {s.shortLabel}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          <aside className="hidden lg:block">
            <nav className="sticky top-6 bg-white border border-gray-200 rounded-2xl p-2 shadow-sm">
              {SECTIONS.map((s) => {
                const isActive = s.id === active
                const Icon = s.icon
                return (
                  <button
                    key={s.id}
                    onClick={() => setActive(s.id)}
                    className={cn(
                      'w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-colors group',
                      isActive ? 'bg-gray-900 text-white shadow-sm' : 'hover:bg-gray-50 text-gray-700',
                    )}
                  >
                    <div
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                        isActive ? 'bg-white/10' : s.accent,
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-semibold', isActive ? 'text-white' : 'text-gray-900')}>
                        {s.label}
                      </p>
                      <p className={cn('text-xs mt-0.5', isActive ? 'text-white/70' : 'text-gray-500')}>
                        {s.description}
                      </p>
                    </div>
                    <ChevronRight
                      className={cn(
                        'w-4 h-4 mt-2 shrink-0 transition-transform',
                        isActive ? 'text-white/70' : 'text-gray-300 group-hover:text-gray-500',
                      )}
                    />
                  </button>
                )
              })}
              <div className="mt-3 pt-3 border-t border-gray-100 px-3 pb-1">
                <p className="text-[11px] text-gray-400">MHUB v1.1 · Floridots Projects</p>
              </div>
            </nav>
          </aside>

          <section className="min-w-0">
            {active === 'notificacoes' && (
              <div className="space-y-6">
                <SectionHeader
                  icon={currentSection.icon}
                  title={currentSection.label}
                  description="Onde e quando o MHUB pode te avisar."
                />

                <Card className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900">Lembretes no navegador</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Aviso popup do navegador antes do compromisso. Só funciona com a aba do MHUB aberta.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.notifications_enabled}
                        onChange={(e) =>
                          setSettings({ ...settings, notifications_enabled: e.target.checked })
                        }
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                    </label>
                  </div>

                  {settings.notifications_enabled ? (
                    <>
                      <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <label className="text-sm font-medium text-gray-700 shrink-0">
                          Avisar
                        </label>
                        <Input
                          type="number"
                          min={0}
                          className="w-24 bg-white"
                          value={settings.notification_minutes_before}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              notification_minutes_before: Number(e.target.value),
                            })
                          }
                        />
                        <span className="text-sm text-gray-500">minutos antes</span>
                      </div>

                      <div className="mt-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">Reagendamentos</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Mandar aviso novo se eu mudar a hora de um evento já notificado.
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={settings.allow_multiple_notifications ?? true}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                allow_multiple_notifications: e.target.checked,
                              })
                            }
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                        </label>
                      </div>
                    </>
                  ) : null}

                  <div className="mt-5 flex justify-end">
                    <Button onClick={() => void handleSave()} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Salvar
                    </Button>
                  </div>
                </Card>

                <WebPushSettings userId={user.id} />

                <TelegramSettings userId={user.id} initialSettings={settings} onUpdate={refreshSettings} />
              </div>
            )}

            {active === 'api' && (
              <div className="space-y-6">
                <SectionHeader
                  icon={currentSection.icon}
                  title={currentSection.label}
                  description="Use o MHUB no ChatGPT, Claude, Cursor ou em scripts próprios via REST."
                />

                <Card className="p-5 bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        Comece pelo guia
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Texto pronto para colar na IA, exemplos no terminal e referência de todas as rotas.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                      <Link
                        href="/docs/guia-ia"
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                      >
                        Guia com IA
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        href="/docs/api"
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 transition-colors"
                      >
                        Referência REST
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </Card>

                <ApiKeysSettings />
              </div>
            )}

            {active === 'backup' && (
              <div className="space-y-6">
                <SectionHeader
                  icon={currentSection.icon}
                  title={currentSection.label}
                  description="Dois formatos: simplificado (para IA editar) e completo (réplica do banco)."
                />

                <Card className="p-6">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    Backup simplificado (para IA)
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 mb-5">
                    JSON enxuto e legível. Bom para pedir para uma IA editar e reimportar.
                  </p>

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Exportar</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                      {[
                        { id: 'eventos' as BackupModule, label: 'Eventos', icon: Calendar },
                        { id: 'tarefas' as BackupModule, label: 'Tarefas', icon: ListTodo },
                        { id: 'financeiro' as BackupModule, label: 'Financeiro', icon: DollarSign },
                        { id: 'estudos' as BackupModule, label: 'Estudos', icon: BookOpen },
                      ].map((mod) => {
                        const isSelected = selectedModules.includes(mod.id)
                        const Icon = mod.icon
                        return (
                          <button
                            key={mod.id}
                            onClick={() => toggleModule(mod.id)}
                            className={cn(
                              'flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left',
                              isSelected
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                            )}
                          >
                            <div
                              className={cn(
                                'w-5 h-5 rounded-md flex items-center justify-center shrink-0',
                                isSelected ? 'bg-indigo-500 text-white' : 'bg-gray-100',
                              )}
                            >
                              {isSelected ? <Check className="w-3 h-3" /> : null}
                            </div>
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="text-sm font-medium truncate">{mod.label}</span>
                          </button>
                        )
                      })}
                    </div>

                    {selectedModules.includes('eventos') ? (
                      <div className="bg-gray-50 rounded-xl p-3 space-y-3 mb-4">
                        <p className="text-xs font-medium text-gray-600">Período dos eventos:</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: 'today' as DateFilterOption, label: 'Só hoje' },
                            { value: 'future' as DateFilterOption, label: 'Futuros' },
                            { value: 'all' as DateFilterOption, label: 'Tudo' },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setDateFilter(opt.value)}
                              className={cn(
                                'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                                dateFilter === opt.value
                                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={includeRecurring}
                            onChange={(e) => setIncludeRecurring(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                          />
                          Incluir eventos recorrentes
                        </label>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between gap-3">
                      <button
                        onClick={selectAllModules}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Selecionar tudo
                      </button>
                      <Button onClick={() => void handleSimpleExport()} disabled={exportingSimple || selectedModules.length === 0}>
                        {exportingSimple ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                        Baixar JSON
                      </Button>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Importar</p>
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
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-all">
                          <Upload className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Clique para escolher um JSON</p>
                        </div>
                      </label>
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <AlertCircle className="w-4 h-4 text-indigo-500" />
                          Detectado no arquivo:
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className={cn('flex items-center gap-2', importPreview.eventos > 0 ? 'text-emerald-600' : 'text-gray-400')}>
                            {importPreview.eventos > 0 ? <Check className="w-4 h-4" /> : <span className="w-4 h-4">✗</span>}
                            {importPreview.eventos} Eventos
                          </div>
                          <div className={cn('flex items-center gap-2', importPreview.tarefas > 0 ? 'text-emerald-600' : 'text-gray-400')}>
                            {importPreview.tarefas > 0 ? <Check className="w-4 h-4" /> : <span className="w-4 h-4">✗</span>}
                            {importPreview.tarefas} Tarefas
                          </div>
                          <div className={cn('flex items-center gap-2', importPreview.financeiro ? 'text-emerald-600' : 'text-gray-400')}>
                            {importPreview.financeiro ? <Check className="w-4 h-4" /> : <span className="w-4 h-4">✗</span>}
                            {importPreview.financeiro
                              ? `${importPreview.financeiro.transacoes + importPreview.financeiro.recorrentes + importPreview.financeiro.emprestimos} Financeiro`
                              : 'Financeiro'}
                          </div>
                          <div className={cn('flex items-center gap-2', importPreview.estudos > 0 ? 'text-emerald-600' : 'text-gray-400')}>
                            {importPreview.estudos > 0 ? <Check className="w-4 h-4" /> : <span className="w-4 h-4">✗</span>}
                            {importPreview.estudos} Matérias
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Modo:</p>
                          <div className="flex flex-wrap gap-2">
                            {(
                              [
                                { v: 'update', label: 'Atualizar existentes', cls: 'border-indigo-500 bg-indigo-50 text-indigo-700' },
                                { v: 'merge', label: 'Adicionar como novos', cls: 'border-gray-300 bg-white text-gray-700' },
                                { v: 'replace', label: 'Substituir tudo', cls: 'border-red-300 bg-red-50 text-red-700' },
                              ] as const
                            ).map((opt) => (
                              <button
                                key={opt.v}
                                type="button"
                                onClick={() => setImportMode(opt.v)}
                                className={cn(
                                  'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                                  importMode === opt.v ? opt.cls : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                                )}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 pt-2">
                            {importMode === 'update' && 'Busca por título+data+hora e atualiza. Não encontrados viram novos.'}
                            {importMode === 'merge' && 'Adiciona todos como novos (pode duplicar).'}
                            {importMode === 'replace' && 'Apaga TUDO e importa só o que está no JSON.'}
                          </p>
                        </div>
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={cancelSimpleImport} className="text-sm text-gray-500 hover:text-gray-700">
                            Cancelar
                          </button>
                          <Button onClick={() => void handleSimpleImportConfirm()} disabled={importingSimple}>
                            {importingSimple ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                            Importar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600" />
                    Backup completo
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 mb-5">
                    Réplica do banco — inclui tudo (configurações, anexos, etc). Restaurar substitui seus dados atuais.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/40">
                      <p className="font-medium text-gray-900">Exportar</p>
                      <p className="text-xs text-gray-500 mt-1 mb-3">Baixe um JSON com todos os módulos.</p>
                      <Button variant="secondary" onClick={() => void handleBackupDownload()}>
                        <Download className="w-4 h-4 mr-2" />
                        Baixar backup
                      </Button>
                    </div>
                    <div className="rounded-xl border border-rose-100 p-4 bg-rose-50/40">
                      <p className="font-medium text-gray-900">Restaurar</p>
                      <p className="text-xs text-rose-600 mt-1 mb-3">Atenção: substitui seus dados atuais.</p>
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        id="restore-file"
                        onChange={handleRestore}
                        disabled={restoring}
                      />
                      <label htmlFor="restore-file">
                        <div className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 shadow-sm h-10 py-2 px-4 cursor-pointer">
                          {restoring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                          {restoring ? 'Restaurando...' : 'Restaurar backup'}
                        </div>
                      </label>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {active === 'documentacao' && (
              <div className="space-y-6">
                <SectionHeader
                  icon={currentSection.icon}
                  title={currentSection.label}
                  description="O guia da API vive em /docs — agora acessado aqui."
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DocCard
                    href="/docs"
                    title="Visão geral"
                    description="Tudo do MHUB num só lugar: módulos, atalhos e fluxo geral."
                    accent="from-indigo-500 to-violet-500"
                  />
                  <DocCard
                    href="/docs/guia-ia"
                    title="Guia com IA"
                    description="Como usar com ChatGPT, Claude e Cursor (PT-BR, passo a passo)."
                    accent="from-emerald-500 to-teal-500"
                  />
                  <DocCard
                    href="/docs/api"
                    title="Referência da API REST"
                    description="Rotas, escopos, corpos JSON e exemplos."
                    accent="from-amber-500 to-orange-500"
                  />
                  <DocCard
                    href="mailto:contato@floridots.com"
                    title="Suporte"
                    description="Bug, dúvida, sugestão — fala comigo."
                    accent="from-rose-500 to-pink-500"
                    external
                    icon={Mail}
                  />
                </div>
              </div>
            )}

            {active === 'perigo' && (
              <div className="space-y-6">
                <SectionHeader
                  icon={currentSection.icon}
                  title={currentSection.label}
                  description="Ações irreversíveis. Faça backup antes."
                />

                <Card className="p-6 border-red-200 bg-red-50/40">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-red-900 flex items-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        Apagar toda a agenda
                      </p>
                      <p className="text-sm text-red-700/80 mt-1">
                        Deleta TODOS os eventos e tarefas. Pede confirmação dupla.
                      </p>
                    </div>
                    <button
                      onClick={() => void handleDeleteAllAgenda()}
                      disabled={deletingAgenda}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors shrink-0"
                    >
                      {deletingAgenda ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      {deletingAgenda ? 'Deletando...' : 'Apagar agenda'}
                    </button>
                  </div>
                </Card>

                <p className="text-xs text-gray-400 text-center pt-4">
                  Precisando apagar algo que não está aqui? Use{' '}
                  <button
                    type="button"
                    className="underline hover:text-gray-600"
                    onClick={() => setActive('backup')}
                  >
                    Backup &rarr; Restaurar
                  </button>{' '}
                  com um JSON vazio do módulo desejado.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

function DocCard({
  href,
  title,
  description,
  accent,
  external,
  icon: Icon = BookOpen,
}: {
  href: string
  title: string
  description: string
  accent: string
  external?: boolean
  icon?: typeof BookOpen
}) {
  const content = (
    <div className="group h-full rounded-2xl border border-gray-200 bg-white p-5 hover:border-gray-300 hover:shadow-md transition-all">
      <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white mb-3 shadow-sm', accent)}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="font-semibold text-gray-900 flex items-center gap-1.5">
        {title}
        <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
      </p>
      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{description}</p>
    </div>
  )

  if (external) {
    return (
      <a href={href} className="block h-full" target="_blank" rel="noreferrer">
        {content}
      </a>
    )
  }
  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  )
}
