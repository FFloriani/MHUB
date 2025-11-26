import { useEffect, useRef, useState, useCallback } from 'react'
import { parseISO, differenceInMinutes, differenceInSeconds } from 'date-fns'
import { getUpcomingEvents } from '@/lib/data/events'
import { getUserSettings, type UserSettingsData } from '@/lib/data/settings'
import type { Database } from '@/lib/supabase'

type Event = Database['public']['Tables']['events']['Row']

const CHECK_INTERVAL_MS = 10000 // Verificar a cada 10 segundos para melhor precisão
const STORAGE_KEY = 'mhub_notified_events'
const CONFIRMED_KEY = 'mhub_confirmed_notifications'

// Função para solicitar permissão de notificações
async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('Este navegador não suporta notificações')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

// Função para obter eventos já notificados do localStorage
function getNotifiedEvents(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return new Set()
    
    const data = JSON.parse(stored)
    const eventIds = data.eventIds || []
    const timestamp = data.timestamp || 0
    
    // Limpar eventos antigos (mais de 24 horas)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    if (timestamp < oneDayAgo) {
      localStorage.removeItem(STORAGE_KEY)
      return new Set()
    }
    
    return new Set(eventIds)
  } catch {
    return new Set()
  }
}

// Função para obter eventos confirmados (visualizados pelo usuário)
function getConfirmedEvents(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  
  try {
    const stored = localStorage.getItem(CONFIRMED_KEY)
    if (!stored) return new Set()
    
    const data = JSON.parse(stored)
    const eventIds = data.eventIds || []
    const timestamp = data.timestamp || 0
    
    // Limpar eventos antigos (mais de 24 horas)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    if (timestamp < oneDayAgo) {
      localStorage.removeItem(CONFIRMED_KEY)
      return new Set()
    }
    
    return new Set(eventIds)
  } catch {
    return new Set()
  }
}

// Função para marcar evento como notificado
function markEventAsNotified(eventId: string) {
  if (typeof window === 'undefined') return
  
  try {
    const notified = getNotifiedEvents()
    notified.add(eventId)
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      eventIds: Array.from(notified),
      timestamp: Date.now(),
    }))
  } catch (error) {
    console.error('Error saving notified events:', error)
  }
}

// Função para marcar evento como confirmado (visualizado)
export function markEventAsConfirmed(eventId: string) {
  if (typeof window === 'undefined') return
  
  try {
    const confirmed = getConfirmedEvents()
    confirmed.add(eventId)
    
    localStorage.setItem(CONFIRMED_KEY, JSON.stringify({
      eventIds: Array.from(confirmed),
      timestamp: Date.now(),
    }))
  } catch (error) {
    console.error('Error saving confirmed events:', error)
  }
}

// Função para enviar notificação do sistema (Windows)
function sendSystemNotification(event: Event) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return
  }

  const startTime = parseISO(event.start_time)
  const timeStr = startTime.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
  
  const notification = new Notification('MHUB - Compromisso em breve', {
    body: `${event.title}\nHorário: ${timeStr}${event.description ? `\n${event.description}` : ''}`,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: `event-${event.id}`, // Evita múltiplas notificações do mesmo evento
    requireInteraction: false,
    silent: false, // Toca som no Windows
  })

  notification.onclick = () => {
    window.focus()
    notification.close()
  }

  // Auto-fecha após 10 segundos
  setTimeout(() => {
    notification.close()
  }, 10000)
}

export function useEventNotifications(
  userId: string | undefined,
  onNewNotification?: (event: Event) => void
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const permissionRequestedRef = useRef(false)
  const [settings, setSettings] = useState<UserSettingsData | null>(null)
  const notifiedEventsRef = useRef<Set<string>>(new Set())

  // Carregar configurações do usuário
  useEffect(() => {
    if (!userId) return

    const loadSettings = async () => {
      try {
        const userSettings = await getUserSettings(userId)
        setSettings(userSettings)
      } catch (error) {
        console.error('Erro ao carregar configurações:', error)
      }
    }

    loadSettings()
  }, [userId])

  useEffect(() => {
    if (!userId || !settings) return

    // Solicitar permissão apenas se notificações estiverem habilitadas
    if (!permissionRequestedRef.current && settings.notifications_enabled) {
      requestNotificationPermission().then((granted) => {
        if (granted) {
          console.log('Permissão de notificações concedida')
        } else {
          console.log('Permissão de notificações negada')
        }
      })
      permissionRequestedRef.current = true
    }

    // Se notificações não estão habilitadas, não fazer nada
    if (!settings.notifications_enabled) {
      return
    }

    // Função para verificar eventos próximos
    const checkUpcomingEvents = async () => {
      try {
        // Recarregar configurações para pegar atualizações
        const currentSettings = await getUserSettings(userId)
        setSettings(currentSettings)

        // Se notificações foram desabilitadas, parar
        if (!currentSettings.notifications_enabled) {
          return
        }

        const notificationMinutes = currentSettings.notification_minutes_before
        const upcomingEvents = await getUpcomingEvents(userId, 1) // Próximas 24 horas
        const now = new Date()
        const notifiedEvents = getNotifiedEvents()
        const confirmedEvents = getConfirmedEvents()

        for (const event of upcomingEvents) {
          const eventStartTime = parseISO(event.start_time)
          const minutesUntilEvent = differenceInMinutes(eventStartTime, now)
          const secondsUntilEvent = differenceInSeconds(eventStartTime, now)

          // Verifica se está no intervalo de notificação (mais flexível: até 1 minuto após o tempo configurado)
          const shouldNotify = 
            minutesUntilEvent <= notificationMinutes && 
            minutesUntilEvent >= notificationMinutes - 1 &&
            secondsUntilEvent > 0 // Ainda não passou do horário
          
          const alreadyNotified = notifiedEvents.has(event.id)
          const alreadyConfirmed = confirmedEvents.has(event.id)

          if (shouldNotify && !alreadyNotified) {
            // Envia notificação do sistema (Windows) - apenas 1 vez
            if (Notification.permission === 'granted') {
              sendSystemNotification(event)
              markEventAsNotified(event.id)
              console.log(`Notificação do sistema enviada para: ${event.title} (${minutesUntilEvent} min antes)`)
            }

            // Mostra notificação no site (persiste até confirmar)
            if (onNewNotification && !alreadyConfirmed) {
              onNewNotification(event)
            }
          }
        }
      } catch (error) {
        console.error('Erro ao verificar eventos próximos:', error)
      }
    }

    // Verificar imediatamente
    checkUpcomingEvents()

    // Configurar intervalo para verificar periodicamente
    intervalRef.current = setInterval(checkUpcomingEvents, CHECK_INTERVAL_MS)

    // Limpar intervalo ao desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [userId, settings])

  return {
    requestPermission: requestNotificationPermission,
    hasPermission: typeof window !== 'undefined' && Notification.permission === 'granted',
  }
}

