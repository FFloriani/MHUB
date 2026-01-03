import { useState, useEffect } from 'react'
import { registerServiceWorker, urlBase64ToUint8Array } from '@/lib/push'
import { supabase } from '@/lib/supabase'

export function usePushNotifications() {
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [subscription, setSubscription] = useState<PushSubscription | null>(null)

    useEffect(() => {
        // Verificar status atual ao carregar
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready.then((registration) => {
                registration.pushManager.getSubscription().then((sub) => {
                    if (sub) {
                        setIsSubscribed(true)
                        setSubscription(sub)
                    }
                })
            })
        }
    }, [])

    const subscribeToPush = async (userId: string) => {
        try {
            const registration = await registerServiceWorker()
            if (!registration) {
                throw new Error('Service Worker registration failed')
            }

            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            if (!vapidPublicKey) throw new Error('VAPID Public Key not found in Environment Variables')

            const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            })

            // Salvar no Supabase
            const { error } = await supabase
                .from('push_subscriptions')
                .insert({
                    user_id: userId,
                    subscription: sub.toJSON()
                })

            if (error) {
                // Se der erro de duplicidade, tudo bem, já está inscrito
                if (error.code !== '23505') { // codigo postgres para unique violation
                    throw error
                }
            }

            setSubscription(sub)
            setIsSubscribed(true)
            console.log('Web Push Subscribed!', sub)
            return true
        } catch (error) {
            console.error('Failed to subscribe to push:', error)
            alert('Erro ao ativar notificações push. Verifique se o navegador suporta.')
            return false
        }
    }

    const unsubscribeFromPush = async (userId: string) => {
        try {
            if (subscription) {
                // 1. Unsubscribe no browser
                await subscription.unsubscribe()

                // 2. Remover do banco Supabase
                // Tenta remover baseando-se no endpoint para garantir que deleta o certo
                const endpoint = subscription.endpoint
                if (endpoint) {
                    // Nota: 'contains' com JSONB pode ser chato. 
                    // Melhor estratégia: Deixar o Cron limpar quando der 410 Gone,
                    // OU tentar deletar se tivermos um ID.
                    // Vamos tentar uma query genérica por endpoint

                    // Como o campo 'subscription' é JSONB, precisamos acessar a chave endpoint dentro dele
                    await supabase
                        .from('push_subscriptions')
                        .delete()
                        .eq('user_id', userId)
                        .filter('subscription->>endpoint', 'eq', endpoint)
                }

                setIsSubscribed(false)
                setSubscription(null)
                console.log('Web Push Unsubscribed!')
            }
        } catch (error) {
            console.error('Error unsubscribing', error)
            alert('Erro ao desativar notificações.')
        }
    }

    return {
        isSubscribed,
        subscribeToPush,
        unsubscribeFromPush
    }
}
