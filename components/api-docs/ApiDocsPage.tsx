'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Bot,
  Check,
  Copy,
  KeyRound,
  Link2,
  ListTree,
  Terminal,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

function CopyBlock({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <div className="relative group">
      <pre className="text-xs sm:text-sm bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto max-h-[420px] overflow-y-auto whitespace-pre-wrap break-words pr-24">
        {text}
      </pre>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="absolute top-3 right-3 shadow-md"
        onClick={() => {
          void navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 2000)
        }}
      >
        {done ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        <span className="ml-1 hidden sm:inline">{done ? 'Copiado' : label}</span>
      </Button>
    </div>
  )
}

export default function ApiDocsPage() {
  const baseUrl = useMemo(
    () => (typeof window !== 'undefined' ? window.location.origin : 'https://seu-site.vercel.app'),
    [],
  )

  const promptForAi = useMemo(
    () => `Você é meu assistente para usar a API do MHUB (organizador pessoal).

Minha URL base do site (sem barra no final): ${baseUrl}
Toda chamada HTTP começa com: ${baseUrl}/api/v1

Autenticação: em TODAS as requisições envie o header:
Authorization: Bearer COLA_AQUI_MEU_TOKEN_mhub_

O token eu gero em: Configurações → API para automação (IA / scripts). Não peça meu token em conversa pública; uso só variável de ambiente ou arquivo local.

Regras:
- Respostas de sucesso são JSON. Erros: { "error": "mensagem" }.
- 401 = token inválido ou ausente. 403 = minha chave não tem permissão (escopo) para essa rota. 503 = problema no servidor (service role).

Endpoints principais:
GET  /api/v1/me — testar token (retorna user_id e scopes)
GET  /api/v1/events?date=AAAA-MM-DD — eventos do dia
POST /api/v1/events — JSON: title, start_time (ISO); opcional: end_time, description, is_recurring, recurrence_days (0-6), recurrence_end_date
PATCH /DELETE /api/v1/events/:id
GET  /api/v1/tasks | POST /api/v1/tasks (title; opcional target_date, is_completed) | PATCH/DELETE /api/v1/tasks/:id
GET  /api/v1/finance/categories | POST /api/v1/finance/categories
GET  /api/v1/finance/transactions?year=ANO&month=MES ou ?from=&to=
POST /api/v1/finance/transactions — title, kind (expense|income|investment), amount, occurred_on
PATCH/DELETE /api/v1/finance/categories/:id e /finance/transactions/:id
GET  /api/v1/workout — plano ativo
PATCH /api/v1/workout/exercises/:id — campos do exercício
GET /api/v1/settings | PATCH /api/v1/settings — preferências de notificação
GET /api/v1/diet — ainda não implementado (501)

Quando eu pedir algo, responda com comandos curl prontos usando $MHUB_URL="${baseUrl}" e $MHUB_TOKEN assumindo que eu exportei a variável no terminal, ou com fetch em JavaScript.`,
    [baseUrl],
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link
            href="/settings"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar às configurações
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Bot className="w-8 h-8 text-indigo-600" />
            Guia da API com IA
          </h1>
          <p className="mt-3 text-gray-600 text-lg leading-relaxed">
            Use ChatGPT, Claude, Cursor ou outro assistente para montar chamadas HTTP ao seu MHUB — por
            exemplo listar eventos, criar tarefas ou lançar despesas — sem programar à mão tudo do zero.
          </p>
        </div>

        <Card className="p-6 space-y-4 border-l-4 border-l-indigo-500">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold">
              1
            </span>
            Crie sua chave de acesso
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Vá em{' '}
            <Link href="/settings" className="text-indigo-600 font-medium underline">
              Configurações
            </Link>
            , role até <strong>API para automação (IA / scripts)</strong>, escolha as permissões (ou &quot;Acesso
            total&quot;) e clique em <strong>Gerar nova chave</strong>. Copie o texto que começa com{' '}
            <code className="bg-gray-100 px-1 rounded">mhub_</code> — ele só aparece uma vez.
          </p>
        </Card>

        <Card className="p-6 space-y-4 border-l-4 border-l-emerald-500">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
              2
            </span>
            Saiba sua URL base
          </h2>
          <p className="text-gray-600 text-sm flex items-start gap-2">
            <Link2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            É o endereço que você usa para abrir o MHUB no navegador, <strong>sem</strong> barra no final.
            Neste dispositivo aparece assim:
          </p>
          <code className="block bg-gray-100 rounded-lg px-4 py-3 text-sm font-mono text-gray-800 break-all">
            {baseUrl}
          </code>
          <p className="text-gray-500 text-xs">
            Todas as rotas da API ficam em <code className="bg-gray-50 px-1 rounded">{baseUrl}/api/v1/...</code>
          </p>
        </Card>

        <Card className="p-6 space-y-4 border-l-4 border-l-amber-500">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-sm font-bold">
              3
            </span>
            Cole na IA este texto (instruções)
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            O bloco abaixo explica para o assistente o que é a API, qual URL usar e quais rotas existem.
            Depois de colar, diga o que quer, por exemplo: &quot;Monta um curl para listar minhas tarefas&quot; ou
            &quot;Cria um POST para um evento amanhã às 15h&quot;.
          </p>
          <CopyBlock text={promptForAi} label="Copiar texto" />
          <p className="text-amber-800 text-xs bg-amber-50 border border-amber-100 rounded-lg p-3">
            <KeyRound className="w-4 h-4 inline mr-1 align-text-bottom" />
            No texto copiado, troque <code className="bg-white px-1 rounded">COLA_AQUI_MEU_TOKEN_mhub_</code> pelo
            seu token real <strong>só no chat privado</strong> ou use variável{' '}
            <code className="bg-white px-1 rounded">MHUB_TOKEN</code> no terminal e peça para a IA usar isso.
          </p>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
            <ListTree className="w-5 h-5 text-gray-700" />
            Como a autenticação funciona
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Em <strong>cada</strong> requisição envie o cabeçalho HTTP:
          </p>
          <pre className="bg-gray-900 text-green-400 text-xs rounded-xl p-4 overflow-x-auto">
            {`Authorization: Bearer mhub_...seu_segredo...`}
          </pre>
          <p className="text-gray-500 text-xs">
            Quem não tiver esse header recebe <strong>401</strong>. Se a chave existir mas não tiver permissão para
            aquela rota, recebe <strong>403</strong>.
          </p>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
            <Terminal className="w-5 h-5 text-gray-700" />
            Teste rápido no terminal
          </h2>
          <p className="text-gray-600 text-sm">Depois de exportar URL e token:</p>
          <CopyBlock
            label="Copiar"
            text={`export MHUB_URL="${baseUrl}"
export MHUB_TOKEN="mhub_COLOQUE_SEU_TOKEN_AQUI"

curl -s -H "Authorization: Bearer $MHUB_TOKEN" "$MHUB_URL/api/v1/me"`}
          />
          <p className="text-gray-500 text-xs">
            Se aparecer JSON com <code className="bg-gray-100 px-1 rounded">user_id</code> e{' '}
            <code className="bg-gray-100 px-1 rounded">scopes</code>, está funcionando.
          </p>
        </Card>

        <div className="text-center text-sm text-gray-500 pt-4">
          Arquivo técnico completo no repositório: <code className="bg-gray-100 px-1 rounded">MHUB_API.md</code> —
          útil para quem desenvolve; este guia é o que importa no dia a dia no site.
        </div>
      </main>
    </div>
  )
}
