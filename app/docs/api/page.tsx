import Link from 'next/link'
import { API_SCOPES } from '@/lib/api/scopes'

function Table({
  headers,
  rows,
}: {
  headers: string[]
  rows: string[][]
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 my-4">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100 text-slate-700 text-left">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold border-b border-slate-200">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white text-slate-800">
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 align-top">
                  <code className="text-xs sm:text-sm bg-slate-50 px-1.5 py-0.5 rounded break-all">{cell}</code>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function JsonExample({ title, children }: { title?: string; children: string }) {
  return (
    <div className="my-4">
      {title ? <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</p> : null}
      <pre className="bg-slate-900 text-slate-100 text-xs rounded-xl p-4 overflow-x-auto leading-relaxed">{children}</pre>
    </div>
  )
}

export default function ApiReferencePage() {
  const scopeRows = API_SCOPES.map((s) => [s.id, s.label, s.description])

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
      <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-2">Referência</p>
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">API REST v1</h1>
      <p className="text-slate-600 leading-relaxed mb-6 max-w-2xl">
        Todas as rotas públicas de automação ficam sob{' '}
        <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">/api/v1</code>. Respostas de sucesso são
        JSON (<code className="bg-slate-100 px-1 rounded">application/json</code>). Envie em cada requisição:
      </p>
      <pre className="bg-slate-900 text-emerald-300 text-sm rounded-xl p-4 overflow-x-auto mb-10">
        Authorization: Bearer mhub_…
      </pre>
      <p className="text-slate-600 text-sm mb-10">
        Gere o token em{' '}
        <Link href="/settings" className="text-indigo-600 underline font-medium">
          Configurações
        </Link>{' '}
        (API para automação). O valor completo só é mostrado uma vez; no banco armazena-se apenas o hash.
      </p>

      <nav className="flex flex-wrap gap-2 mb-12 text-sm">
        {[
          ['#url-base', 'URL base'],
          ['#formato', 'Formato'],
          ['#escopos', 'Escopos'],
          ['#me', 'GET /me'],
          ['#eventos', 'Eventos'],
          ['#tarefas', 'Tarefas'],
          ['#financeiro', 'Financeiro'],
          ['#treino', 'Treino'],
          ['#settings', 'Preferências'],
          ['#diet', 'Dieta'],
          ['#erros', 'Erros'],
          ['#exemplos', 'Exemplos'],
        ].map(([id, label]) => (
          <a
            key={id}
            href={id}
            className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-indigo-200 hover:text-indigo-700"
          >
            {label}
          </a>
        ))}
      </nav>

      <section id="url-base" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">URL base</h2>
        <p className="text-slate-600 text-sm leading-relaxed mb-3">
          Use o mesmo origin do site no navegador, <strong>sem</strong> barra no final. Ex.:{' '}
          <code className="bg-slate-100 px-1 rounded">https://seu-projeto.vercel.app</code>. As chamadas ficam{' '}
          <code className="bg-slate-100 px-1 rounded">{'{BASE}'}/api/v1/…</code>.
        </p>
        <p className="text-slate-600 text-sm leading-relaxed">
          Em previews da Vercel com proteção de deploy, <code className="bg-slate-100 px-1 rounded">curl</code> externo
          pode falhar; use produção ou bypass configurado no painel.
        </p>
      </section>

      <section id="formato" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Formato das respostas</h2>
        <ul className="text-slate-600 text-sm space-y-2 list-disc pl-5">
          <li>
            <strong>Sucesso:</strong> corpo JSON; criação costuma retornar <strong>201</strong> com o registro criado.
          </li>
          <li>
            <strong>Erro:</strong> em geral{' '}
            <code className="bg-slate-100 px-1 rounded text-xs">{`{ "error": "mensagem" }`}</code>. Em{' '}
            <strong>403</strong> pode vir também <code className="bg-slate-100 px-1 rounded text-xs">scope</code> com o
            escopo exigido.
          </li>
          <li>
            <strong>JSON inválido</strong> no corpo: <strong>400</strong>.
          </li>
          <li>
            <strong>Recurso de outro usuário ou inexistente:</strong> <strong>404</strong> onde indicado abaixo.
          </li>
        </ul>
      </section>

      <section id="escopos" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Escopos</h2>
        <p className="text-slate-600 text-sm mb-4">
          Cada chave armazena uma lista de escopos. <code className="bg-slate-100 px-1 rounded">*</code> libera tudo.{' '}
          <code className="bg-slate-100 px-1 rounded">recurso:*</code> libera leitura e escrita daquele módulo (ex.:{' '}
          <code className="bg-slate-100 px-1 rounded">finance:*</code>).
        </p>
        <Table headers={['ID', 'Nome', 'Descrição']} rows={scopeRows} />
      </section>

      <section id="me" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
          <code className="text-lg">GET /api/v1/me</code>
        </h2>
        <p className="text-slate-600 text-sm mb-3">
          Confere o token. Não exige escopo além da chave válida. Útil para scripts e IAs obterem{' '}
          <code className="bg-slate-100 px-1 rounded">user_id</code>, escopos e links desta documentação no site.
        </p>
        <p className="text-slate-600 text-sm mb-3">
          Campos: <code className="bg-slate-100 px-1 rounded">user_id</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">scopes</code>, <code className="bg-slate-100 px-1 rounded">api</code>{' '}
          (<code className="bg-slate-100 px-1 rounded">mhub-v1</code>),{' '}
          <code className="bg-slate-100 px-1 rounded">docs_home</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">guide_url</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">api_reference_url</code> (caminhos relativos como{' '}
          <code className="bg-slate-100 px-1 rounded">/docs</code>, <code className="bg-slate-100 px-1 rounded">/docs/guia-ia</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">/docs/api</code>).
        </p>
        <JsonExample title="Exemplo de corpo">
          {`{
  "user_id": "uuid…",
  "scopes": ["agenda:*", "finance:read"],
  "api": "mhub-v1",
  "docs_home": "/docs",
  "guide_url": "/docs/guia-ia",
  "api_reference_url": "/docs/api"
}`}
        </JsonExample>
      </section>

      <section id="eventos" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Agenda — eventos</h2>
        <Table
          headers={['Método', 'Rota', 'Escopo']}
          rows={[
            ['GET', '/api/v1/events?date=YYYY-MM-DD', 'agenda:read'],
            ['POST', '/api/v1/events', 'agenda:write'],
            ['PATCH', '/api/v1/events/:id', 'agenda:write'],
            ['DELETE', '/api/v1/events/:id', 'agenda:write'],
          ]}
        />
        <h3 className="text-sm font-bold text-slate-800 mt-6 mb-2">GET</h3>
        <p className="text-slate-600 text-sm mb-2">
          Query <code className="bg-slate-100 px-1 rounded">date</code> opcional. Se ausente ou inválido, usa a{' '}
          <strong>data de hoje</strong> no servidor. Retorno:
        </p>
        <JsonExample>
          {`{
  "date": "2026-05-09",
  "events": [ … ]
}`}
        </JsonExample>
        <p className="text-slate-600 text-sm mb-2">
          A lista inclui ocorrências do dia, inclusive instâncias virtuais de eventos recorrentes (o app já calcula isso
          no servidor).
        </p>
        <h3 className="text-sm font-bold text-slate-800 mt-6 mb-2">POST (JSON)</h3>
        <ul className="text-slate-600 text-sm space-y-1 list-disc pl-5 mb-4">
          <li>
            Obrigatórios: <code className="bg-slate-100 px-1 rounded">title</code> (texto),{' '}
            <code className="bg-slate-100 px-1 rounded">start_time</code> (string ISO 8601).
          </li>
          <li>
            Opcionais: <code className="bg-slate-100 px-1 rounded">end_time</code>,{' '}
            <code className="bg-slate-100 px-1 rounded">description</code>,{' '}
            <code className="bg-slate-100 px-1 rounded">is_recurring</code> (boolean),{' '}
            <code className="bg-slate-100 px-1 rounded">recurrence_days</code> (array de inteiros 0–6 = domingo a
            sábado), <code className="bg-slate-100 px-1 rounded">recurrence_end_date</code>.
          </li>
        </ul>
        <h3 className="text-sm font-bold text-slate-800 mb-2">PATCH / DELETE</h3>
        <p className="text-slate-600 text-sm">
          <code className="bg-slate-100 px-1 rounded">PATCH</code> aceita qualquer subconjunto dos campos acima; use{' '}
          <code className="bg-slate-100 px-1 rounded">null</code> para limpar <code className="bg-slate-100 px-1 rounded">end_time</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">description</code> ou{' '}
          <code className="bg-slate-100 px-1 rounded">recurrence_end_date</code>. IDs públicos de ocorrência virtual podem
          vir como <code className="bg-slate-100 px-1 rounded">uuid_YYYY-MM-DD</code>; o servidor normaliza para o UUID do
          evento pai em mutações. <code className="bg-slate-100 px-1 rounded">DELETE</code> responde{' '}
          <code className="bg-slate-100 px-1 rounded text-xs">{`{ "deleted": true, "id": "…" }`}</code>.
        </p>
      </section>

      <section id="tarefas" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Agenda — tarefas</h2>
        <Table
          headers={['Método', 'Rota', 'Escopo']}
          rows={[
            ['GET', '/api/v1/tasks', 'agenda:read'],
            ['POST', '/api/v1/tasks', 'agenda:write'],
            ['PATCH', '/api/v1/tasks/:id', 'agenda:write'],
            ['DELETE', '/api/v1/tasks/:id', 'agenda:write'],
          ]}
        />
        <h3 className="text-sm font-bold text-slate-800 mt-6 mb-2">GET</h3>
        <p className="text-slate-600 text-sm mb-2">
          Monta uma lista em duas partes: todas as tarefas <strong>não concluídas</strong> (ordenadas por{' '}
          <code className="bg-slate-100 px-1 rounded">target_date</code> ascendente), depois tarefas{' '}
          <strong>concluídas</strong> cuja <code className="bg-slate-100 px-1 rounded">target_date</code> é nos{' '}
          <strong>últimos 7 dias</strong> (mais recentes primeiro). Corpo:
        </p>
        <JsonExample>
          {`{
  "tasks": [ … ]
}`}
        </JsonExample>
        <h3 className="text-sm font-bold text-slate-800 mt-6 mb-2">POST (JSON)</h3>
        <p className="text-slate-600 text-sm mb-2">
          Obrigatório: <code className="bg-slate-100 px-1 rounded">title</code>. Opcionais:{' '}
          <code className="bg-slate-100 px-1 rounded">is_completed</code> (boolean, padrão falso),{' '}
          <code className="bg-slate-100 px-1 rounded">target_date</code> (<code className="bg-slate-100 px-1 rounded">YYYY-MM-DD</code> ou omitido
          / null).
        </p>
        <h3 className="text-sm font-bold text-slate-800 mb-2">PATCH</h3>
        <p className="text-slate-600 text-sm">
          Campos opcionais: <code className="bg-slate-100 px-1 rounded">title</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">is_completed</code>, <code className="bg-slate-100 px-1 rounded">target_date</code>{' '}
          (<code className="bg-slate-100 px-1 rounded">null</code> para limpar). <code className="bg-slate-100 px-1 rounded">DELETE</code> devolve{' '}
          <code className="bg-slate-100 px-1 rounded text-xs">{`{ "deleted": true, "id": "…" }`}</code>.
        </p>
      </section>

      <section id="financeiro" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Financeiro</h2>

        <h3 className="text-lg font-semibold text-slate-800 mb-3">Categorias</h3>
        <Table
          headers={['Método', 'Rota', 'Escopo']}
          rows={[
            ['GET', '/api/v1/finance/categories', 'finance:read'],
            ['POST', '/api/v1/finance/categories', 'finance:write'],
            ['PATCH', '/api/v1/finance/categories/:id', 'finance:write'],
            ['DELETE', '/api/v1/finance/categories/:id', 'finance:write'],
          ]}
        />
        <p className="text-slate-600 text-sm mb-2">
          <strong>GET</strong> retorna <code className="bg-slate-100 px-1 rounded text-xs">{`{ "categories": [ … ] }`}</code>, ordenadas
          por <code className="bg-slate-100 px-1 rounded">sort_order</code> e nome.
        </p>
        <p className="text-slate-600 text-sm mb-2">
          <strong>POST</strong> — obrigatórios: <code className="bg-slate-100 px-1 rounded">name</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">kind</code> igual a <code className="bg-slate-100 px-1 rounded">expense</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">income</code> ou <code className="bg-slate-100 px-1 rounded">investment</code>.
          Opcionais: <code className="bg-slate-100 px-1 rounded">icon</code> (string, padrão{' '}
          <code className="bg-slate-100 px-1 rounded">Tag</code>), <code className="bg-slate-100 px-1 rounded">color</code> (hex, padrão
          indigo), <code className="bg-slate-100 px-1 rounded">is_archived</code> (boolean),{' '}
          <code className="bg-slate-100 px-1 rounded">sort_order</code> (número, padrão 0).
        </p>
        <p className="text-slate-600 text-sm mb-6">
          <strong>PATCH</strong>: qualquer subconjunto de{' '}
          <code className="bg-slate-100 px-1 rounded">name</code>, <code className="bg-slate-100 px-1 rounded">kind</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">icon</code>, <code className="bg-slate-100 px-1 rounded">color</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">is_archived</code>, <code className="bg-slate-100 px-1 rounded">sort_order</code>.{' '}
          <strong>DELETE</strong>: <code className="bg-slate-100 px-1 rounded text-xs">{`{ "deleted": true, "id": "…" }`}</code>.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mb-3">Transações</h3>
        <Table
          headers={['Método', 'Rota', 'Escopo']}
          rows={[
            ['GET', '/api/v1/finance/transactions (+ query)', 'finance:read'],
            ['POST', '/api/v1/finance/transactions', 'finance:write'],
            ['PATCH', '/api/v1/finance/transactions/:id', 'finance:write'],
            ['DELETE', '/api/v1/finance/transactions/:id', 'finance:write'],
          ]}
        />
        <p className="text-slate-600 text-sm mb-2">
          <strong>GET</strong> — filtros de data (use um dos modos):
        </p>
        <ul className="text-slate-600 text-sm space-y-1 list-disc pl-5 mb-3">
          <li>
            <code className="bg-slate-100 px-1 rounded">year</code> e <code className="bg-slate-100 px-1 rounded">month</code> (1–12)
            delimitam o mês civil inteiro.
          </li>
          <li>
            Ou <code className="bg-slate-100 px-1 rounded">from</code> e <code className="bg-slate-100 px-1 rounded">to</code> como{' '}
            <code className="bg-slate-100 px-1 rounded">YYYY-MM-DD</code> em <code className="bg-slate-100 px-1 rounded">occurred_on</code>.
          </li>
          <li>
            Se <strong>não</strong> houver janela de datas, a consulta retorna até <strong>500</strong> lançamentos (mais
            recentes primeiro).
          </li>
        </ul>
        <p className="text-slate-600 text-sm mb-2">
          Opcional em qualquer modo: <code className="bg-slate-100 px-1 rounded">kind</code> ={' '}
          <code className="bg-slate-100 px-1 rounded">expense</code> | <code className="bg-slate-100 px-1 rounded">income</code> |{' '}
          <code className="bg-slate-100 px-1 rounded">investment</code> | <code className="bg-slate-100 px-1 rounded">all</code> (omitir
          ou <code className="bg-slate-100 px-1 rounded">all</code> = sem filtrar por tipo). Corpo:{' '}
          <code className="bg-slate-100 px-1 rounded text-xs">{`{ "transactions": [ … ] }`}</code>.
        </p>
        <p className="text-slate-600 text-sm mb-2">
          <strong>POST</strong> — obrigatórios: <code className="bg-slate-100 px-1 rounded">title</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">kind</code>, <code className="bg-slate-100 px-1 rounded">amount</code> (número),{' '}
          <code className="bg-slate-100 px-1 rounded">occurred_on</code> (<code className="bg-slate-100 px-1 rounded">YYYY-MM-DD</code>).
          Opcionais: <code className="bg-slate-100 px-1 rounded">category_id</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">payment_method</code>, <code className="bg-slate-100 px-1 rounded">notes</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">tags</code> (array de strings), <code className="bg-slate-100 px-1 rounded">paid</code>{' '}
          (boolean; padrão <code className="bg-slate-100 px-1 rounded">true</code>).
        </p>
        <p className="text-slate-600 text-sm">
          <strong>PATCH</strong>: qualquer combinação de{' '}
          <code className="bg-slate-100 px-1 rounded">title</code>, <code className="bg-slate-100 px-1 rounded">kind</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">amount</code>, <code className="bg-slate-100 px-1 rounded">occurred_on</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">category_id</code>, <code className="bg-slate-100 px-1 rounded">payment_method</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">notes</code>, <code className="bg-slate-100 px-1 rounded">tags</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">paid</code>; use <code className="bg-slate-100 px-1 rounded">null</code> onde o servidor
          aceita para limpar referências. <strong>DELETE</strong> devolve{' '}
          <code className="bg-slate-100 px-1 rounded text-xs">{`{ "deleted": true, "id": "…" }`}</code>.
        </p>
      </section>

      <section id="treino" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Treino</h2>
        <Table
          headers={['Método', 'Rota', 'Escopo']}
          rows={[
            ['GET', '/api/v1/workout', 'workout:read'],
            ['PATCH', '/api/v1/workout/exercises/:id', 'workout:write'],
          ]}
        />
        <p className="text-slate-600 text-sm mb-2">
          <strong>GET</strong> — retorna o <strong>plano ativo</strong> do usuário e os dias com exercícios:
        </p>
        <JsonExample>
          {`{
  "plan": { … } | null,
  "days": [
    {
      …campos do dia…,
      "exercises": [ … ]
    }
  ]
}`}
        </JsonExample>
        <p className="text-slate-600 text-sm mb-2">
          Se não houver plano ativo, <code className="bg-slate-100 px-1 rounded">plan</code> é <code className="bg-slate-100 px-1 rounded">null</code> e{' '}
          <code className="bg-slate-100 px-1 rounded">days</code> é array vazio.
        </p>
        <p className="text-slate-600 text-sm">
          <strong>PATCH /api/v1/workout/exercises/:id</strong> — atualiza um exercício que pertença ao seu usuário
          (validação em cadeia exercício → dia → plano). Campos opcionais:{' '}
          <code className="bg-slate-100 px-1 rounded">name</code>, <code className="bg-slate-100 px-1 rounded">sets</code> (número),{' '}
          <code className="bg-slate-100 px-1 rounded">reps</code> (string), <code className="bg-slate-100 px-1 rounded">rest_seconds</code>{' '}
          (número), <code className="bg-slate-100 px-1 rounded">weight_kg</code> (número ou <code className="bg-slate-100 px-1 rounded">null</code>),{' '}
          <code className="bg-slate-100 px-1 rounded">notes</code>, <code className="bg-slate-100 px-1 rounded">order</code>. Não há rota
          pública para criar planos ou dias pela API — somente leitura da estrutura e edição de exercícios existentes.
        </p>
      </section>

      <section id="settings" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Preferências</h2>
        <Table
          headers={['Método', 'Rota', 'Escopo']}
          rows={[
            ['GET', '/api/v1/settings', 'settings:read'],
            ['PATCH', '/api/v1/settings', 'settings:write'],
          ]}
        />
        <p className="text-slate-600 text-sm mb-2">
          <strong>GET</strong> retorna{' '}
          <code className="bg-slate-100 px-1 rounded text-xs">{`{ "settings": { … } }`}</code>. Se ainda não existir linha em{' '}
          <code className="bg-slate-100 px-1 rounded">user_settings</code>, os valores padrão são aplicados no JSON:
        </p>
        <JsonExample>
          {`{
  "settings": {
    "notifications_enabled": false,
    "notification_minutes_before": 15,
    "allow_multiple_notifications": true,
    "telegram_chat_id": null
  }
}`}
        </JsonExample>
        <p className="text-slate-600 text-sm">
          <strong>PATCH</strong> — envie ao menos um campo: <code className="bg-slate-100 px-1 rounded">notifications_enabled</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">notification_minutes_before</code> (número),{' '}
          <code className="bg-slate-100 px-1 rounded">allow_multiple_notifications</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">telegram_chat_id</code> (string ou vazio/<code className="bg-slate-100 px-1 rounded">null</code> para
          limpar). Corpo vazio ou sem campos conhecidos → <strong>400</strong>.
        </p>
      </section>

      <section id="diet" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Dieta (reservado)</h2>
        <p className="text-slate-600 text-sm">
          <code className="bg-slate-100 px-1 rounded">GET /api/v1/diet</code> exige escopo{' '}
          <code className="bg-slate-100 px-1 rounded">diet:read</code>. Hoje responde <strong>501</strong> com mensagem
          informando que o módulo ainda não está disponível na API.
        </p>
      </section>

      <section id="erros" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Códigos HTTP</h2>
        <Table
          headers={['Código', 'Significado']}
          rows={[
            ['200 / 201', 'Sucesso'],
            ['400', 'JSON inválido, validação (campos obrigatórios), parâmetros inválidos ou PATCH sem campos (settings)'],
            ['401', 'Header Bearer ausente ou token inválido/revogado'],
            ['403', 'Token válido mas sem o escopo da rota (ver campo scope quando enviado)'],
            ['404', 'Recurso inexistente ou de outro usuário'],
            ['500', 'Erro interno não tratado (mensagem no body)'],
            ['501', 'Recurso reservado (dieta)'],
            ['503', 'Servidor sem service role / Supabase admin (configuração de deploy)'],
          ]}
        />
      </section>

      <section id="exemplos" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Exemplos rápidos</h2>
        <p className="text-slate-600 text-sm mb-3">Bash:</p>
        <pre className="bg-slate-900 text-emerald-400 text-xs rounded-xl p-4 overflow-x-auto mb-6">
          {`export MHUB_URL="https://seu-site.vercel.app"
export MHUB_TOKEN="mhub_..."

curl -s -H "Authorization: Bearer $MHUB_TOKEN" "$MHUB_URL/api/v1/me"
curl -s -H "Authorization: Bearer $MHUB_TOKEN" "$MHUB_URL/api/v1/events?date=2026-05-09"
curl -s -H "Authorization: Bearer $MHUB_TOKEN" "$MHUB_URL/api/v1/finance/transactions?year=2026&month=5&kind=expense"`}
        </pre>
        <p className="text-slate-600 text-sm mb-3">PowerShell:</p>
        <pre className="bg-slate-900 text-sky-300 text-xs rounded-xl p-4 overflow-x-auto mb-8">
          {`$MHUB_URL = "https://seu-site.vercel.app"
$MHUB_TOKEN = "mhub_..."
$h = @{ Authorization = "Bearer $MHUB_TOKEN" }
Invoke-RestMethod -Uri "$MHUB_URL/api/v1/me" -Headers $h`}
        </pre>
        <p className="text-slate-600 text-sm">
          Fluxo guiado para IAs:{' '}
          <Link href="/docs/guia-ia" className="text-indigo-600 underline font-medium">
            Guia com IA
          </Link>
          .
        </p>
      </section>
    </article>
  )
}
