'use client'

import { useState } from 'react'
import { Send, CheckCircle2, Copy, ExternalLink, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { updateUserSettings, UserSettingsData } from '@/lib/data/settings'

interface TelegramSettingsProps {
    userId: string
    initialSettings: UserSettingsData
    onUpdate: () => void
}

export default function TelegramSettings({ userId, initialSettings, onUpdate }: TelegramSettingsProps) {
    const [telegramId, setTelegramId] = useState(initialSettings.telegram_chat_id || '')
    const [loading, setLoading] = useState(false)
    const [saved, setSaved] = useState(!!initialSettings.telegram_chat_id)

    const handleSave = async () => {
        setLoading(true)
        try {
            await updateUserSettings(userId, { telegram_chat_id: telegramId })
            setSaved(true)
            onUpdate()
            alert('Telegram conectado com sucesso!')
        } catch (error) {
            alert('Erro ao salvar ID do Telegram')
        } finally {
            setLoading(false)
        }
    }

    const handleDisconnect = async () => {
        if (!confirm('Deseja desconectar o Telegram?')) return
        setLoading(true)
        try {
            await updateUserSettings(userId, { telegram_chat_id: null })
            setTelegramId('')
            setSaved(false)
            onUpdate()
        } catch (error) {
            alert('Erro ao desconectar')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="p-6 border-l-4 border-l-sky-500">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Send className="w-5 h-5 text-sky-500" />
                Notificações via Telegram
            </h2>

            {saved ? (
                <div className="flex flex-col gap-4">
                    <div className="p-4 bg-green-50 text-green-800 rounded-lg flex items-center gap-3 border border-green-200">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <div>
                            <p className="font-semibold">Conectado!</p>
                            <p className="text-sm">Seu ID: <span className="font-mono bg-green-100 px-1 rounded">{telegramId}</span></p>
                        </div>
                    </div>
                    <Button
                        onClick={handleDisconnect}
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 self-start"
                    >
                        Desconectar Telegram
                    </Button>
                </div>
            ) : (
                <div className="space-y-6">
                    <p className="text-sm text-gray-600">
                        Siga os passos abaixo para receber seus lembretes direto no seu Telegram:
                    </p>

                    <ol className="space-y-4 text-sm text-gray-700 list-decimal list-inside bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <li className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <span>Abra nosso bot no Telegram e clique em <strong>COMEÇAR</strong>:</span>
                            <a
                                href="https://t.me/MHUB_notificacoes_bot"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-sky-600 hover:underline font-medium"
                            >
                                @MHUB_notificacoes_bot <ExternalLink className="w-3 h-3" />
                            </a>
                        </li>
                        <li className="flex flex-col gap-2">
                            <span>Procure pelo bot <strong>@userinfobot</strong>, dê Start e copie o número (ID) dele.</span>
                            <a
                                href="https://t.me/userinfobot"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 text-xs"
                            >
                                Abrir @userinfobot <ExternalLink className="w-3 h-3" />
                            </a>
                        </li>
                        <li>
                            Cole seu ID numérico abaixo:
                        </li>
                    </ol>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            placeholder="Ex: 123456789"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                            value={telegramId}
                            onChange={(e) => setTelegramId(e.target.value.replace(/\D/g, ''))} // Só números
                        />
                        <Button
                            onClick={handleSave}
                            disabled={!telegramId || loading}
                            className="bg-sky-500 hover:bg-sky-600 text-white"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar e Conectar'}
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    )
}
