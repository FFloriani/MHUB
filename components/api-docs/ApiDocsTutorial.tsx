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

# Identificação
GET  /api/v1/me — user_id, scopes, links /docs

# Agenda
GET  /api/v1/events?date=AAAA-MM-DD — dia (inclui virtuais de recorrentes)
GET  /api/v1/events?from=…&to=… (até 31 dias) — { from, to, days:[{date,events}] }
GET  /api/v1/events?upcoming=true&limit=N (default 10, máx 50) — próximos
POST /api/v1/events — title, start_time (ISO); opc: end_time, description, is_recurring, recurrence_days[0-6], recurrence_end_date
PATCH e DELETE /api/v1/events/:id
GET  /api/v1/tasks — pendentes + concluídas últimos 7 dias (default)
GET  /api/v1/tasks?status=pending|completed|all&from=…&to=…&limit=… — filtrado
POST /api/v1/tasks — title; opc: is_completed, target_date
PATCH e DELETE /api/v1/tasks/:id

# Financeiro — básico
GET  /api/v1/finance/categories
POST /api/v1/finance/categories — name, kind; opc: icon, color, is_archived, sort_order
PATCH e DELETE /api/v1/finance/categories/:id
GET  /api/v1/finance/transactions — year+month OU from+to; opc kind=expense|income|investment|all; sem datas: até 500
POST /api/v1/finance/transactions — title, kind, amount, occurred_on; opc: category_id, payment_method, notes, tags, paid
PATCH e DELETE /api/v1/finance/transactions/:id

# Financeiro — avançado
GET/POST /api/v1/finance/recurring (?active=true) — title, kind, amount, day_of_month, start_date; opc: end_date, category_id, payment_method, notes, active
PATCH e DELETE /api/v1/finance/recurring/:id
POST /api/v1/finance/recurring/materialize — { year, month } → cria transações do mês para templates ativos (idempotente)
GET/POST /api/v1/finance/installments — POST atômico: title, total_amount, total_count, first_due; opc: category_id, payment_method, notes
GET /api/v1/finance/installments/:id — { installment, transactions }
PATCH /api/v1/finance/installments/:id — só metadados; DELETE cascade
GET  /api/v1/finance/budgets — sem params: lista; com ?year&month: + usage[{category_id, spent, percent, status}]
POST /api/v1/finance/budgets — upsert por (user_id, category_id): category_id, monthly_limit, alert_threshold (0-100, def 80)
PATCH e DELETE /api/v1/finance/budgets/:id
GET  /api/v1/finance/loans (?status=open|partial|paid&direction=lent|borrowed) — inclui paid e remaining
POST /api/v1/finance/loans — counterpart_name, direction, principal (>0), taken_on; opc: due_date, notes
GET /api/v1/finance/loans/:id — { loan(com paid/remaining), payments }
PATCH e DELETE /api/v1/finance/loans/:id
GET/POST /api/v1/finance/loans/:id/payments — POST: amount(>0), paid_on, notes? → recalcula status
PATCH e DELETE /api/v1/finance/loans/:id/payments/:paymentId

# Treino
GET /api/v1/workout — plano ativo aninhado | ?plan_id=… | ?all=true
GET/POST /api/v1/workout/plans — POST: name; opc: division_type, is_active (auto-desativa outros)
GET/PATCH/DELETE /api/v1/workout/plans/:id
POST /api/v1/workout/days — plan_id, day_letter, name; opc: muscle_groups[], rest_hours, color, order
GET/PATCH/DELETE /api/v1/workout/days/:id
POST /api/v1/workout/exercises — day_id, name; opc: sets, reps, rest_seconds, weight_kg, notes, order
PATCH e DELETE /api/v1/workout/exercises/:id
GET /api/v1/workout/logs (?from&to&day_id&limit) — histórico de treinos concluídos
POST /api/v1/workout/logs — opc: day_id, event_id, completed_at, duration_minutes, notes
PATCH e DELETE /api/v1/workout/logs/:id

# Dieta
GET /api/v1/diet?date=… (dia) | ?from=…&to=… (até 31 dias)
POST /api/v1/diet/meals — title; opc: logged_date, meal_time (HH:MM), sort_order
PATCH e DELETE /api/v1/diet/meals/:id
POST /api/v1/diet — name, meal_slot_id; opc: logged_date, quantity_text, calories, protein_g, carbs_g, fat_g, notes
PATCH e DELETE /api/v1/diet/:id

# Preferências
GET /api/v1/settings | PATCH /api/v1/settings (notifications_enabled, notification_minutes_before, allow_multiple_notifications, telegram_chat_id)

# Backup completo
GET /api/v1/backup — snapshot único de todos os módulos (escopo backup:read)

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
