'use client'

import { useState, useEffect, useCallback } from 'react'
import { Key, Loader2, Plus, Copy, Ban, BookOpen } from 'lucide-react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'
import { API_SCOPES, normalizeScopes, type ApiScopeId } from '@/lib/api/scopes'
import { listUserApiKeys, revokeUserApiKey, type UserApiKeyRow } from '@/lib/data/api-keys'

async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function generateSecret(): string {
  const a = new Uint8Array(32)
  crypto.getRandomValues(a)
  const hex = Array.from(a)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `mhub_${hex}`
}

type KeyListItem = Pick<
  UserApiKeyRow,
  'id' | 'name' | 'token_prefix' | 'scopes' | 'created_at' | 'last_used_at' | 'revoked_at'
>

export default function ApiKeysSettings() {
  const [rows, setRows] = useState<KeyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('Cursor / IA')
  const [selectedScopes, setSelectedScopes] = useState<ApiScopeId[]>(['*'])
  const [revealedOnce, setRevealedOnce] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listUserApiKeys()
      setRows(list)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggleScope = (id: ApiScopeId) => {
    if (id === '*') {
      setSelectedScopes(['*'])
      return
    }
    setSelectedScopes((prev) => {
      const next = new Set(prev.filter((s) => s !== '*'))
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return normalizeScopes(Array.from(next)) as ApiScopeId[]
    })
  }

  const handleCreate = async () => {
    const { data: session } = await supabase.auth.getUser()
    const user = session.user
    if (!user) return

    setCreating(true)
    try {
      const secret = generateSecret()
      const key_hash = await sha256Hex(secret)
      const token_prefix = secret.slice(0, 14)
      const scopes = normalizeScopes(selectedScopes.length ? selectedScopes : ['*'])

      const { error } = await supabase
        .from('user_api_keys')
        .insert({
          user_id: user.id,
          name: name.trim() || 'API Key',
          token_prefix,
          key_hash,
          scopes,
        })
        .select('id')
        .single()

      if (error) throw error
      setRevealedOnce(secret)
      setName('Cursor / IA')
      await load()
    } catch (e: unknown) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Erro ao criar chave')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('Revogar esta chave? Scripts e IAs que a usam deixarão de funcionar.')) return
    try {
      await revokeUserApiKey(id)
      await load()
    } catch (e) {
      console.error(e)
      alert('Erro ao revogar')
    }
  }

  const copyToken = () => {
    if (!revealedOnce) return
    void navigator.clipboard.writeText(revealedOnce)
  }

  return (
    <Card id="gerenciar-chaves-api" className="p-6 border-l-4 border-l-amber-500 scroll-mt-24">
      <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <Key className="w-5 h-5 text-amber-600" />
        API para automação (IA / scripts)
      </h2>
      <div className="mb-6 p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <BookOpen className="w-10 h-10 text-indigo-600 shrink-0" />
          <div>
            <p className="font-semibold text-gray-900">Como usar com ChatGPT, Claude ou Cursor</p>
            <p className="text-sm text-gray-600 mt-1">
              Guia em português, com texto pronto para colar na IA e teste no terminal.
            </p>
          </div>
        </div>
        <Link
          href="/docs/guia-ia"
          className="inline-flex items-center justify-center rounded-lg font-medium transition-colors px-4 py-2 text-base bg-primary text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary w-full sm:w-auto whitespace-nowrap"
        >
          Abrir guia no site
        </Link>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Crie um token com escopos limitados. Use no header{' '}
        <code className="bg-gray-100 px-1 rounded text-xs">Authorization: Bearer …</code> nas rotas{' '}
        <code className="bg-gray-100 px-1 rounded text-xs">/api/v1/*</code>.
      </p>
      <p className="text-sm text-gray-600 mb-4">
        Referência completa:{' '}
        <Link href="/docs/api" className="text-indigo-600 underline font-medium">
          documentação da API REST
        </Link>{' '}
        (rotas, escopos, corpos JSON e exemplos).
      </p>

      {revealedOnce ? (
        <div className="mb-6 p-4 bg-gray-900 text-green-400 rounded-xl font-mono text-xs break-all space-y-2">
          <p className="text-amber-200 font-sans text-sm">Copie agora — não será exibida de novo:</p>
          <p>{revealedOnce}</p>
          <Button type="button" size="sm" variant="secondary" onClick={copyToken}>
            <Copy className="w-4 h-4 mr-2" />
            Copiar
          </Button>
          <Button type="button" size="sm" variant="ghost" className="text-gray-400" onClick={() => setRevealedOnce(null)}>
            Ocultar
          </Button>
        </div>
      ) : null}

      <div className="space-y-4 mb-6">
        <div>
          <label className="text-sm font-medium text-gray-700">Nome da chave</label>
          <Input className="mt-1 bg-white" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Notebook trabalho" />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Permissões</p>
          <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/50 p-3 space-y-2">
            {API_SCOPES.map((s) => (
              <label key={s.id} className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-gray-300"
                  checked={selectedScopes.includes(s.id)}
                  onChange={() => toggleScope(s.id)}
                />
                <span>
                  <span className="font-medium text-gray-800">{s.label}</span>
                  {s.description ? (
                    <span className="block text-gray-500 text-xs mt-0.5">{s.description}</span>
                  ) : null}
                  <code className="text-[10px] text-gray-400">{s.id}</code>
                </span>
              </label>
            ))}
          </div>
        </div>

        <Button onClick={() => void handleCreate()} disabled={creating}>
          {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          Gerar nova chave
        </Button>
      </div>

      <h3 className="text-sm font-semibold text-gray-800 mb-2">Chaves ativas</h3>
      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma chave ainda.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border ${
                r.revoked_at ? 'bg-gray-100 border-gray-200 opacity-60' : 'bg-white border-gray-100'
              }`}
            >
              <div>
                <p className="font-medium text-gray-900">{r.name}</p>
                <p className="text-xs text-gray-500 font-mono">
                  {r.token_prefix}… · {r.scopes?.slice(0, 3).join(', ')}
                  {r.scopes && r.scopes.length > 3 ? '…' : ''}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Criada {new Date(r.created_at).toLocaleString('pt-BR')}
                  {r.last_used_at ? ` · Último uso ${new Date(r.last_used_at).toLocaleString('pt-BR')}` : ''}
                  {r.revoked_at ? ' · Revogada' : ''}
                </p>
              </div>
              {!r.revoked_at ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => void handleRevoke(r.id)} className="text-red-600">
                  <Ban className="w-4 h-4 mr-1" />
                  Revogar
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
