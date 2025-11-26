'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Bell, Clock, Save, ArrowLeft } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { getUser, getSession } from '@/lib/auth'
import { getUserSettings, updateUserSettings, type UserSettingsData } from '@/lib/data/settings'
import type { User } from '@supabase/supabase-js'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<UserSettingsData>({
    notifications_enabled: false,
    notification_minutes_before: 15,
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const session = await getSession()
      if (!session?.user) {
        router.push('/')
        return
      }
      setUser(session.user)
      await loadSettings(session.user.id)
    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/')
    }
  }

  const loadSettings = async (userId: string) => {
    try {
      const userSettings = await getUserSettings(userId)
      setSettings(userSettings)
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return

    setIsSaving(true)
    try {
      await updateUserSettings(user.id, settings)
      alert('Configurações salvas com sucesso!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Erro ao salvar configurações. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRequestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Seu navegador não suporta notificações')
      return
    }

    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      setSettings((prev) => ({ ...prev, notifications_enabled: true }))
      alert('Permissão de notificações concedida!')
    } else {
      setSettings((prev) => ({ ...prev, notifications_enabled: false }))
      alert('Permissão de notificações negada. Para ativar, acesse as configurações do navegador.')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Carregando...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-600" />
              <h1 className="text-2xl font-semibold text-gray-900">Configurações</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto p-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificações
          </h2>

          <div className="space-y-6">
            {/* Habilitar Notificações */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-900 block mb-1">
                  Ativar Notificações
                </label>
                <p className="text-xs text-gray-600">
                  Receba lembretes antes dos seus compromissos
                </p>
              </div>
              <div className="flex items-center gap-3">
                {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied' && (
                  <span className="text-xs text-red-600">Bloqueado no navegador</span>
                )}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications_enabled}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleRequestNotificationPermission()
                      } else {
                        setSettings((prev) => ({ ...prev, notifications_enabled: false }))
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            {/* Tempo de Antecedência */}
            {settings.notifications_enabled && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="text-sm font-medium text-gray-900 block mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Notificar com quantos minutos de antecedência?
                </label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min="1"
                    max="1440"
                    value={settings.notification_minutes_before}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 15
                      setSettings((prev) => ({
                        ...prev,
                        notification_minutes_before: Math.max(1, Math.min(1440, value)),
                      }))
                    }}
                    className="w-32"
                  />
                  <span className="text-sm text-gray-600">minutos antes</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Escolha entre 1 minuto e 24 horas (1440 minutos) antes do compromisso
                </p>
              </div>
            )}

            {/* Botão Salvar */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}

