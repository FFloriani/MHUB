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
      <pre className="text-xs sm:text-sm bg-slate-900 text-slate-100 rounded-xl p-4 overflow-x-auto max-h-[420px] overflow-y-auto whitespace-pre-wrap break-words pr-24">
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

export type ApiDocsTutorialProps = {
  backLink: { href: string; label: string }
}

export default function ApiDocsTutorial({ backLink }: ApiDocsTutorialProps) {
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
- 401 = token inválido ou ausente. 403 = minha chave não tem permissão (escopo) para essa rota. 503 = a API não está disponível no servidor (configuração do deploy).

Endpoints (API v1 — alinhado à documentação em /docs/api):
GET  /api/v1/me — user_id, scopes, links /docs
GET  /api/v1/events?date=AAAA-MM-DD — { date, events }; date opcional (default hoje)
POST /api/v1/events — title, start_time (ISO); opcional: end_time, description, is_recurring, recurrence_days (0-6), recurrence_end_date
PATCH e DELETE /api/v1/events/:id
GET  /api/v1/tasks — { tasks }: pendentes + concluídas dos últimos 7 dias
POST /api/v1/tasks — title; opcional: is_completed, target_date
PATCH e DELETE /api/v1/tasks/:id
GET  /api/v1/finance/categories — { categories }
POST /api/v1/finance/categories — name, kind; opcional: icon, color, is_archived, sort_order
PATCH e DELETE /api/v1/finance/categories/:id
GET  /api/v1/finance/transactions — year+month ou from+to; opcional kind= expense|income|investment|all; sem datas: até 500
POST /api/v1/finance/transactions — title, kind, amount, occurred_on; opcional: category_id, payment_method, notes, tags, paid
PATCH e DELETE /api/v1/finance/transactions/:id
GET  /api/v1/workout — plano ativo + days + exercises
PATCH /api/v1/workout/exercises/:id — só edição (não cria plano pela API)
GET /api/v1/settings | PATCH /api/v1/settings
GET /api/v1/diet — 501

Detalhes: ${baseUrl}/docs/api

Quando eu pedir algo, responda com comandos curl prontos usando $MHUB_URL="${baseUrl}" e $MHUB_TOKEN assumindo que eu exportei a variável no terminal, ou com fetch em JavaScript.`,
    [baseUrl],
  )

  return (
    <div className="pb-16">
      <div className="border-b border-slate-200 bg-white/80 px-4 sm:px-8 py-4 mb-8">
        <Link
          href={backLink.href}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLink.label}
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-8 space-y-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Bot className="w-8 h-8 text-indigo-600" />
            Guia da API com IA
          </h1>
          <p className="mt-3 text-slate-600 text-lg leading-relaxed">
            Use ChatGPT, Claude, Cursor ou outro assistente para montar chamadas HTTP ao seu MHUB — por
            exemplo listar eventos, criar tarefas ou lançar despesas — sem programar à mão tudo do zero.
          </p>
        </div>

        <Card className="p-6 space-y-4 border-l-4 border-l-indigo-500 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold">
              1
            </span>
            Crie sua chave de acesso
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Vá em{' '}
            <Link href="/settings" className="text-indigo-600 font-medium underline">
              Configurações
            </Link>
            , role até <strong>API para automação (IA / scripts)</strong>, escolha as permissões (ou &quot;Acesso
            total&quot;) e clique em <strong>Gerar nova chave</strong>. Copie o texto que começa com{' '}
            <code className="bg-slate-100 px-1 rounded">mhub_</code> — ele só aparece uma vez.
          </p>
        </Card>

        <Card className="p-6 space-y-4 border-l-4 border-l-emerald-500 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
              2
            </span>
            Saiba sua URL base
          </h2>
          <p className="text-slate-600 text-sm flex items-start gap-2">
            <Link2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            É o endereço que você usa para abrir o MHUB no navegador, <strong>sem</strong> barra no final.
            Neste dispositivo aparece assim:
          </p>
          <code className="block bg-slate-100 rounded-lg px-4 py-3 text-sm font-mono text-slate-800 break-all">
            {baseUrl}
          </code>
          <p className="text-slate-500 text-xs">
            Todas as rotas da API ficam em <code className="bg-slate-50 px-1 rounded">{baseUrl}/api/v1/...</code>
          </p>
        </Card>

        <Card className="p-6 space-y-4 border-l-4 border-l-amber-500 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-sm font-bold">
              3
            </span>
            Cole na IA este texto (instruções)
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            O bloco abaixo explica para o assistente o que é a API, qual URL usar e quais rotas existem.
            Depois de colar, diga o que quer, por exemplo: &quot;Monta um curl para listar minhas tarefas&quot; ou
            &quot;Cria um POST para um evento amanhã às 15h&quot;.
          </p>
          <CopyBlock text={promptForAi} label="Copiar texto" />
          <p className="text-amber-900 text-xs bg-amber-50 border border-amber-100 rounded-lg p-3">
            <KeyRound className="w-4 h-4 inline mr-1 align-text-bottom" />
            No texto copiado, troque <code className="bg-white px-1 rounded">COLA_AQUI_MEU_TOKEN_mhub_</code> pelo
            seu token real <strong>só em ambiente privado</strong> ou use variável{' '}
            <code className="bg-white px-1 rounded">MHUB_TOKEN</code> no terminal e peça para a IA usar isso.
          </p>
        </Card>

        <Card className="p-6 space-y-4 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
            <ListTree className="w-5 h-5 text-slate-700" />
            Como a autenticação funciona
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Em <strong>cada</strong> requisição envie o cabeçalho HTTP:
          </p>
          <pre className="bg-slate-900 text-emerald-400 text-xs rounded-xl p-4 overflow-x-auto">
            {`Authorization: Bearer mhub_...seu_segredo...`}
          </pre>
          <p className="text-slate-500 text-xs">
            Quem não tiver esse header recebe <strong>401</strong>. Se a chave existir mas não tiver permissão para
            aquela rota, recebe <strong>403</strong>.
          </p>
        </Card>

        <Card className="p-6 space-y-4 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
            <Terminal className="w-5 h-5 text-slate-700" />
            Teste rápido no terminal
          </h2>
          <p className="text-slate-600 text-sm">Depois de exportar URL e token:</p>
          <CopyBlock
            label="Copiar"
            text={`export MHUB_URL="${baseUrl}"
export MHUB_TOKEN="mhub_COLOQUE_SEU_TOKEN_AQUI"

curl -s -H "Authorization: Bearer $MHUB_TOKEN" "$MHUB_URL/api/v1/me"`}
          />
          <p className="text-slate-500 text-xs">
            Se aparecer JSON com <code className="bg-slate-100 px-1 rounded">user_id</code> e{' '}
            <code className="bg-slate-100 px-1 rounded">scopes</code>, está funcionando.
          </p>
        </Card>

        <p className="text-center text-sm text-slate-500 pt-4">
          Referência completa das rotas:{' '}
          <Link href="/docs/api" className="text-indigo-600 font-medium underline">
            Documentação → Referência API
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
