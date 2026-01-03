'use client'

import { useState } from 'react'
import { BellRing, Zap, Loader2, StopCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { usePushNotifications } from '@/hooks/usePushNotifications'

interface WebPushSettingsProps {
    userId: string
}

export default function WebPushSettings({ userId }: WebPushSettingsProps) {
    const { isSubscribed, subscribeToPush, unsubscribeFromPush } = usePushNotifications()
    const [loading, setLoading] = useState(false)

    const handleSubscribe = async () => {
        setLoading(true)
        await subscribeToPush(userId)
        setLoading(false)
    }

    const handleUnsubscribe = async () => {
        if (!confirm('Tem certeza? Você deixará de receber notificações neste dispositivo.')) return
        setLoading(true)
        await unsubscribeFromPush(userId)
        setLoading(false)
    }

    return (
        <Card className="p-6 border-l-4 border-l-indigo-500">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-500" />
                Notificações Push (Beta)
            </h2>

            <div className="space-y-4">
                <div className="p-4 bg-indigo-50 text-indigo-900 rounded-lg flex items-start gap-3">
                    <BellRing className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-semibold mb-1">Receba alertas mesmo com o site fechado</p>
                        <p>
                            Ative esta opção para receber notificações nativas do sistema através do Service Worker.
                            Funciona mesmo se a aba do MHUB estiver fechada.
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-indigo-100 rounded-xl">
                    <div>
                        <p className="font-medium text-gray-900">Estado da Assinatura</p>
                        <p className="text-xs text-gray-500">
                            {isSubscribed ? 'Ativo e monitorando ✅' : 'Inativo ❌'}
                        </p>
                    </div>

                    {!isSubscribed ? (
                        <Button
                            onClick={handleSubscribe}
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Ativando...
                                </>
                            ) : (
                                'Ativar Push'
                            )}
                        </Button>
                    ) : (
                        <Button
                            onClick={handleUnsubscribe}
                            disabled={loading}
                            variant="ghost"
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <StopCircle className="w-4 h-4 mr-2" />
                                    Desativar
                                </>
                            )}
                        </Button>
                    )}
                </div>

                <p className="text-[10px] text-gray-400 text-center">
                    Requer suporte a Web Push e Service Workers (Chrome, Edge, Firefox). Não funciona em modo anônimo.
                </p>
            </div>
        </Card>
    )
}
