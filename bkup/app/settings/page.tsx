'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, ArrowLeft, Upload, Download, Bell } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import WebPushSettings from '@/components/settings/WebPushSettings'
import TelegramSettings from '@/components/settings/TelegramSettings'
import { getSession } from '@/lib/auth'
import { getUserSettings, updateUserSettings, type UserSettingsData } from '@/lib/data/settings'
import { exportFullBackup, restoreFullBackup, type BackupData } from '@/lib/data/backup'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [settings, setSettings] = useState<UserSettingsData | null>(null)

  // Backup states
  const [restoring, setRestoring] = useState(false)

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

        {/* Backup e Restauração */}
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

        <div className="flex justify-center pt-8">
          <p className="text-xs text-gray-400">MHUB v1.1 • Floridots Projects</p>
        </div>
      </main>
    </div>
  )
}
