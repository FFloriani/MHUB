'use client'

import { useState, useEffect } from 'react'
import { Key, Loader2, Copy, RefreshCw, Check } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { supabase } from '@/lib/supabase'
import { getApiToken, regenerateApiToken } from '@/lib/data/settings'

export default function ApiKeysSettings() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      try {
        const t = await getApiToken(data.user.id)
        if (t) {
          setToken(t)
        } else {
          // Primeira vez: gera automaticamente
          const newToken = await regenerateApiToken(data.user.id)
          setToken(newToken)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleCopy = async () => {
    if (!token) return
    await navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerate = async () => {
    if (!confirm('Gerar um novo token? O token atual deixará de funcionar imediatamente.')) return
    setRegenerating(true)
    try {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const newToken = await regenerateApiToken(data.user.id)
      setToken(newToken)
    } catch (e) {
      console.error(e)
      alert('Erro ao regenerar token')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <Card id="api-token" className="p-6 border-l-4 border-l-amber-500 scroll-mt-24">
      <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
        <Key className="w-5 h-5 text-amber-600" />
        Token de acesso
      </h2>
      <p className="text-sm text-gray-500 mb-5">
        Use no header{' '}
        <code className="bg-gray-100 px-1 rounded text-xs">Authorization: Bearer …</code>{' '}
        em qualquer chamada para <code className="bg-gray-100 px-1 rounded text-xs">/api/v1/*</code>.{' '}
        <Link href="/docs/api" className="text-indigo-600 underline">Ver documentação</Link>
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Carregando…</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-900 font-mono text-sm text-green-400 break-all">
            <span className="flex-1 select-all">{token}</span>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => void handleCopy()} className="gap-2">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void handleRegenerate()}
              disabled={regenerating}
              className="gap-2 text-gray-500"
            >
              {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Gerar novo
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
