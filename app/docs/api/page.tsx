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
          ['#financeiro', 'Financeiro (básico)'],
          ['#financeiro-avancado', 'Financeiro (avançado)'],
          ['#treino', 'Treino'],
          ['#settings', 'Preferências'],
          ['#diet', 'Dieta'],
          ['#backup', 'Backup'],
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
        <h3 className="text-sm font-bold text-slate-800 mt-6 mb-2">GET — três modos</h3>
        <ul className="text-slate-600 text-sm space-y-1 list-disc pl-5 mb-3">
          <li>
            <strong>Dia único</strong> (default): <code className="bg-slate-100 px-1 rounded">?date=YYYY-MM-DD</code>{' '}
            (ou sem parâmetros = hoje). Inclui virtuais de eventos recorrentes.
          </li>
          <li>
            <strong>Intervalo:</strong> <code className="bg-slate-100 px-1 rounded">?from=YYYY-MM-DD&amp;to=YYYY-MM-DD</code>{' '}
            (até 31 dias). Devolve <code className="bg-slate-100 px-1 rounded">days: [{`{ date, events }`}]</code>.
          </li>
          <li>
            <strong>Próximos:</strong> <code className="bg-slate-100 px-1 rounded">?upcoming=true&amp;limit=N</code>{' '}
            (default 10, máx 50): varre até 60 dias e devolve <code className="bg-slate-100 px-1 rounded">events</code> +
            agrupamento em <code className="bg-slate-100 px-1 rounded">days</code>.
          </li>
        </ul>
        <JsonExample>
          {`// dia único
{ "date": "2026-05-09", "events": [ … ] }

// intervalo
{ "from": "2026-05-09", "to": "2026-05-15", "days": [ { "date": "…", "events": [ … ] } ] }

// upcoming
{ "upcoming": true, "events": [ … ], "days": [ … ] }`}
        </JsonExample>
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
          <strong>Sem parâmetros:</strong> tarefas <strong>não concluídas</strong> (ordenadas por{' '}
          <code className="bg-slate-100 px-1 rounded">target_date</code> ascendente) <strong>+</strong> concluídas dos{' '}
          <strong>últimos 7 dias</strong>.
        </p>
        <p className="text-slate-600 text-sm mb-2">
          <strong>Filtros opcionais:</strong> <code className="bg-slate-100 px-1 rounded">status=pending|completed|all</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">from=YYYY-MM-DD</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">to=YYYY-MM-DD</code> (filtra por{' '}
          <code className="bg-slate-100 px-1 rounded">target_date</code>),{' '}
          <code className="bg-slate-100 px-1 rounded">limit</code> (default 500, máx 1000). Qualquer um destes ativa o
          modo filtrado e ignora a janela padrão de 7 dias.
        </p>
        <JsonExample>{`{ "tasks": [ … ] }`}</JsonExample>
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

      <section id="financeiro-avancado" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
          Financeiro — recorrentes, parceladas, orçamento e empréstimos
        </h2>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">Recorrentes</h3>
        <Table
          headers={['Método', 'Rota', 'Escopo']}
          rows={[
            ['GET', '/api/v1/finance/recurring (?active=true)', 'finance:read'],
            ['POST', '/api/v1/finance/recurring', 'finance:write'],
            ['PATCH', '/api/v1/finance/recurring/:id', 'finance:write'],
            ['DELETE', '/api/v1/finance/recurring/:id', 'finance:write'],
            ['POST', '/api/v1/finance/recurring/materialize', 'finance:write'],
          ]}
        />
        <p className="text-slate-600 text-sm mb-2">
          <strong>POST</strong> — obrigatórios: <code className="bg-slate-100 px-1 rounded">title</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">kind</code> (<code className="bg-slate-100 px-1 rounded">expense</code> | <code className="bg-slate-100 px-1 rounded">income</code> | <code className="bg-slate-100 px-1 rounded">investment</code>),{' '}
          <code className="bg-slate-100 px-1 rounded">amount</code>, <code className="bg-slate-100 px-1 rounded">day_of_month</code> (1–31),{' '}
          <code className="bg-slate-100 px-1 rounded">start_date</code> (<code className="bg-slate-100 px-1 rounded">YYYY-MM-DD</code>). Opcionais:{' '}
          <code className="bg-slate-100 px-1 rounded">end_date</code>, <code className="bg-slate-100 px-1 rounded">category_id</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">payment_method</code>, <code className="bg-slate-100 px-1 rounded">notes</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">active</code> (default true).
        </p>
        <p className="text-slate-600 text-sm mb-2">
          <strong>POST /materialize</strong> — body <code className="bg-slate-100 px-1 rounded text-xs">{`{ year, month }`}</code> (1–12).
          Cria as transações do mês alvo para cada template ativo cujo intervalo cobre o mês, pulando os que já têm
          transação naquele mês (idempotente). Resposta:{' '}
          <code className="bg-slate-100 px-1 rounded text-xs">{`{ created: N, year, month }`}</code>.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-2">Parceladas</h3>
        <Table
          headers={['Método', 'Rota', 'Escopo']}
          rows={[
            ['GET', '/api/v1/finance/installments', 'finance:read'],
            ['POST', '/api/v1/finance/installments', 'finance:write'],
            ['GET', '/api/v1/finance/installments/:id (com transactions)', 'finance:read'],
            ['PATCH', '/api/v1/finance/installments/:id (só metadados)', 'finance:write'],
            ['DELETE', '/api/v1/finance/installments/:id (cascade)', 'finance:write'],
          ]}
        />
        <p className="text-slate-600 text-sm mb-2">
          <strong>POST</strong> — atômico: cria o cabeçalho e N transações filhas (uma por mês a partir de{' '}
          <code className="bg-slate-100 px-1 rounded">first_due</code>). Valor de cada parcela ={' '}
          <code className="bg-slate-100 px-1 rounded">total_amount / total_count</code> (ajuste de centavos na última).
          Obrigatórios: <code className="bg-slate-100 px-1 rounded">title</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">total_amount</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">total_count</code> (≥1),{' '}
          <code className="bg-slate-100 px-1 rounded">first_due</code>. Opcionais:{' '}
          <code className="bg-slate-100 px-1 rounded">category_id</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">payment_method</code>, <code className="bg-slate-100 px-1 rounded">notes</code>.
          Resposta: <code className="bg-slate-100 px-1 rounded text-xs">{`{ installment, transactions: [ … ] }`}</code>.
        </p>
        <p className="text-slate-600 text-sm mb-2">
          <strong>PATCH</strong> mexe só nos metadados (<code className="bg-slate-100 px-1 rounded">title</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">category_id</code>, <code className="bg-slate-100 px-1 rounded">payment_method</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">notes</code>). Pra mudar valor/quantidade, delete e recrie.{' '}
          <strong>DELETE</strong> apaga as transações filhas em cascade.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-2">Orçamento</h3>
        <Table
          headers={['Método', 'Rota', 'Escopo']}
          rows={[
            ['GET', '/api/v1/finance/budgets (?year&month → uso)', 'finance:read'],
            ['POST', '/api/v1/finance/budgets (upsert por user_id+category_id)', 'finance:write'],
            ['PATCH', '/api/v1/finance/budgets/:id', 'finance:write'],
            ['DELETE', '/api/v1/finance/budgets/:id', 'finance:write'],
          ]}
        />
        <p className="text-slate-600 text-sm mb-2">
          <strong>POST</strong> — obrigatórios <code className="bg-slate-100 px-1 rounded">category_id</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">monthly_limit</code> (≥0). Opcional{' '}
          <code className="bg-slate-100 px-1 rounded">alert_threshold</code> (0–100, default 80). Faz{' '}
          <em>upsert</em> — chamar 2x na mesma categoria atualiza.
        </p>
        <p className="text-slate-600 text-sm mb-2">
          <strong>GET</strong> com <code className="bg-slate-100 px-1 rounded">year</code> +{' '}
          <code className="bg-slate-100 px-1 rounded">month</code> também devolve consumo:
        </p>
        <JsonExample>
          {`{
  "budgets": [ … ],
  "usage": [
    { "category_id": "…", "spent": 412.30, "percent": 82.46, "status": "warning" }
  ],
  "year": 2026, "month": 5
}`}
        </JsonExample>
        <p className="text-slate-600 text-sm">
          <code className="bg-slate-100 px-1 rounded">status</code>:{' '}
          <code className="bg-slate-100 px-1 rounded">ok</code> (abaixo do alerta),{' '}
          <code className="bg-slate-100 px-1 rounded">warning</code> (≥ alerta, &lt; 100%),{' '}
          <code className="bg-slate-100 px-1 rounded">over</code> (≥ 100%).
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-2">Empréstimos</h3>
        <Table
          headers={['Método', 'Rota', 'Escopo']}
          rows={[
            ['GET', '/api/v1/finance/loans (?status&direction)', 'finance:read'],
            ['POST', '/api/v1/finance/loans', 'finance:write'],
            ['GET', '/api/v1/finance/loans/:id (com payments)', 'finance:read'],
            ['PATCH', '/api/v1/finance/loans/:id', 'finance:write'],
            ['DELETE', '/api/v1/finance/loans/:id', 'finance:write'],
            ['GET', '/api/v1/finance/loans/:id/payments', 'finance:read'],
            ['POST', '/api/v1/finance/loans/:id/payments', 'finance:write'],
            ['PATCH', '/api/v1/finance/loans/:id/payments/:paymentId', 'finance:write'],
            ['DELETE', '/api/v1/finance/loans/:id/payments/:paymentId', 'finance:write'],
          ]}
        />
        <p className="text-slate-600 text-sm mb-2">
          <strong>POST /loans</strong> — obrigatórios:{' '}
          <code className="bg-slate-100 px-1 rounded">counterpart_name</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">direction</code> (<code className="bg-slate-100 px-1 rounded">lent</code>{' '}
          = emprestei, <code className="bg-slate-100 px-1 rounded">borrowed</code> = peguei emprestado),{' '}
          <code className="bg-slate-100 px-1 rounded">principal</code> (&gt;0),{' '}
          <code className="bg-slate-100 px-1 rounded">taken_on</code> (YYYY-MM-DD). Opcionais:{' '}
          <code className="bg-slate-100 px-1 rounded">due_date</code>, <code className="bg-slate-100 px-1 rounded">notes</code>.
          Listagem inclui <code className="bg-slate-100 px-1 rounded">paid</code> e <code className="bg-slate-100 px-1 rounded">remaining</code>{' '}
          calculados.
        </p>
        <p className="text-slate-600 text-sm">
          <strong>POST /payments</strong> — registra pagamento parcial e <strong>recalcula o status</strong> do empréstimo
          (<code className="bg-slate-100 px-1 rounded">open</code> /{' '}
          <code className="bg-slate-100 px-1 rounded">partial</code> /{' '}
          <code className="bg-slate-100 px-1 rounded">paid</code>). Body:{' '}
          <code className="bg-slate-100 px-1 rounded text-xs">{`{ amount (>0), paid_on, notes? }`}</code>. Resposta:{' '}
          <code className="bg-slate-100 px-1 rounded text-xs">{`{ payment, totals: { paid, status } }`}</code>.
        </p>
      </section>

      <section id="treino" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Treino</h2>
        <p className="text-slate-600 text-sm mb-4">
          Estrutura: <code className="bg-slate-100 px-1 rounded">plano</code> →{' '}
          <code className="bg-slate-100 px-1 rounded">dias</code> →{' '}
          <code className="bg-slate-100 px-1 rounded">exercícios</code>. Treinos concluídos vão em{' '}
          <code className="bg-slate-100 px-1 rounded">workout_logs</code>.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mb-2">Estrutura aninhada</h3>
        <Table
          headers={['Método', 'Rota', 'Escopo']}
          rows={[
            ['GET', '/api/v1/workout (plano ativo)', 'workout:read'],
            ['GET', '/api/v1/workout?plan_id=…', 'workout:read'],
            ['GET', '/api/v1/workout?all=true', 'workout:read'],
          ]}
        />
        <p className="text-slate-600 text-sm mb-2">
          <strong>GET</strong> sem nada devolve o plano ativo aninhado{' '}
          <code className="bg-slate-100 px-1 rounded text-xs">{`{ plan, days: [{ …, exercises: [] }] }`}</code>.{' '}
          <code className="bg-slate-100 px-1 rounded">?plan_id=…</code> abre um plano específico.{' '}
          <code className="bg-slate-100 px-1 rounded">?all=true</code> lista todos: <code className="bg-slate-100 px-1 rounded text-xs">{`{ plans: [{ ...plan, days: [...] }] }`}</code>.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-2">Planos</h3>
        <Table
          headers={['Método', 'Rota', 'Escopo']}
          rows={[
            ['GET', '/api/v1/workout/plans', 'workout:read'],
            ['POST', '/api/v1/workout/plans', 'workout:write'],
            ['GET', '/api/v1/workout/plans/:id', 'workout:read'],
            ['PATCH', '/api/v1/workout/plans/:id', 'workout:write'],
            ['DELETE', '/api/v1/workout/plans/:id', 'workout:write'],
          ]}
        />
        <p className="text-slate-600 text-sm mb-2">
          <strong>POST</strong> — obrigatório <code className="bg-slate-100 px-1 rounded">name</code>. Opcionais:{' '}
          <code className="bg-slate-100 px-1 rounded">division_type</code> (default <code className="bg-slate-100 px-1 rounded">AB</code>),{' '}
          <code className="bg-slate-100 px-1 rounded">is_active</code>. Se{' '}
          <code className="bg-slate-100 px-1 rounded">is_active=true</code> os outros planos ativos do usuário são
          desativados automaticamente. <strong>PATCH</strong> aceita os mesmos campos; idem para ativação automática.
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-2">Dias</h3>
        <Table
          headers={['Método', 'Rota', 'Escopo']}
          rows={[
            ['POST', '/api/v1/workout/days (body: plan_id, day_letter, name, …)', 'workout:write'],
            ['GET', '/api/v1/workout/days/:id (com exercises)', 'workout:read'],
            ['PATCH', '/api/v1/workout/days/:id', 'workout:write'],
            ['DELETE', '/api/v1/workout/days/:id', 'workout:write'],
          ]}
        />
        <p className="text-slate-600 text-sm mb-2">
          <strong>POST</strong> — obrigatórios <code className="bg-slate-100 px-1 rounded">plan_id</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">day_letter</code> (ex.: A, B, C),{' '}
          <code className="bg-slate-100 px-1 rounded">name</code>. Opcionais:{' '}
          <code className="bg-slate-100 px-1 rounded">muscle_groups</code> (array de strings),{' '}
          <code className="bg-slate-100 px-1 rounded">rest_hours</code>, <code className="bg-slate-100 px-1 rounded">color</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">order</code> (auto-incrementa se omitido).
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-2">Exercícios</h3>
        <Table
          headers={['Método', 'Rota', 'Escopo']}
          rows={[
            ['POST', '/api/v1/workout/exercises (body: day_id, name, …)', 'workout:write'],
            ['PATCH', '/api/v1/workout/exercises/:id', 'workout:write'],
            ['DELETE', '/api/v1/workout/exercises/:id', 'workout:write'],
          ]}
        />
        <p className="text-slate-600 text-sm mb-2">
          <strong>POST</strong> — obrigatórios <code className="bg-slate-100 px-1 rounded">day_id</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">name</code>. Opcionais:{' '}
          <code className="bg-slate-100 px-1 rounded">sets</code> (default 3),{' '}
          <code className="bg-slate-100 px-1 rounded">reps</code> (string, default <code className="bg-slate-100 px-1 rounded">10</code>),{' '}
          <code className="bg-slate-100 px-1 rounded">rest_seconds</code> (default 60),{' '}
          <code className="bg-slate-100 px-1 rounded">weight_kg</code>, <code className="bg-slate-100 px-1 rounded">notes</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">order</code>. <strong>PATCH</strong> também aceita{' '}
          <code className="bg-slate-100 px-1 rounded">day_id</code> (move para outro dia, validando ownership).
        </p>

        <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-2">Logs (treinos concluídos)</h3>
        <Table
          headers={['Método', 'Rota', 'Escopo']}
          rows={[
            ['GET', '/api/v1/workout/logs (+ filtros)', 'workout:read'],
            ['POST', '/api/v1/workout/logs', 'workout:write'],
            ['PATCH', '/api/v1/workout/logs/:id', 'workout:write'],
            ['DELETE', '/api/v1/workout/logs/:id', 'workout:write'],
          ]}
        />
        <p className="text-slate-600 text-sm">
          <strong>GET</strong> aceita <code className="bg-slate-100 px-1 rounded">from</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">to</code> (data ISO no <code className="bg-slate-100 px-1 rounded">completed_at</code>),{' '}
          <code className="bg-slate-100 px-1 rounded">day_id</code>, <code className="bg-slate-100 px-1 rounded">limit</code> (default 100, máx 500).
          Resposta <code className="bg-slate-100 px-1 rounded text-xs">{`{ "logs": [ … ] }`}</code>.{' '}
          <strong>POST</strong> — todos opcionais: <code className="bg-slate-100 px-1 rounded">day_id</code> (validado),{' '}
          <code className="bg-slate-100 px-1 rounded">event_id</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">completed_at</code> (default agora),{' '}
          <code className="bg-slate-100 px-1 rounded">duration_minutes</code>, <code className="bg-slate-100 px-1 rounded">notes</code>.
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
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Dieta</h2>
        <p className="text-slate-600 text-sm mb-4">
          Refeições em <code className="bg-slate-100 px-1 rounded">diet_meal_slots</code> — pontuais (uma{' '}
          <code className="bg-slate-100 px-1 rounded">logged_date</code>) ou recorrentes semanais ({' '}
          <code className="bg-slate-100 px-1 rounded">recurrence_days</code>: dias 0=domingo … 6=sábado, com{' '}
          <code className="bg-slate-100 px-1 rounded">logged_date</code> nulo). Alimentos em{' '}
          <code className="bg-slate-100 px-1 rounded">diet_entries</code> por <code className="bg-slate-100 px-1 rounded">meal_slot_id</code>
          ; no item “modelo” (sem <code className="bg-slate-100 px-1 rounded">logged_date</code>),{' '}
          <code className="bg-slate-100 px-1 rounded">recurrence_days</code> opcional restringe em quais dias da semana aquele
          alimento aparece — só valores que já existem nos <code className="bg-slate-100 px-1 rounded">recurrence_days</code>{' '}
          da refeição (omitir ou <code className="bg-slate-100 px-1 rounded">null</code> = vale todos esses dias).
          Exceções “pular neste dia” ficam em <code className="bg-slate-100 px-1 rounded">diet_recurring_skips</code> (incluídas no{' '}
          <code className="bg-slate-100 px-1 rounded">GET /api/v1/backup</code>). Remover refeição apaga itens em cascata.
        </p>
        <Table
          headers={['Método', 'Rota', 'Escopo']}
          rows={[
            ['GET', '/api/v1/diet?date=YYYY-MM-DD', 'diet:read'],
            ['GET', '/api/v1/diet?from=…&to=… (até 31 dias)', 'diet:read'],
            ['POST', '/api/v1/diet/meals', 'diet:write'],
            ['PATCH', '/api/v1/diet/meals/:id', 'diet:write'],
            ['DELETE', '/api/v1/diet/meals/:id', 'diet:write'],
            ['POST', '/api/v1/diet', 'diet:write'],
            ['PATCH', '/api/v1/diet/:id', 'diet:write'],
            ['DELETE', '/api/v1/diet/:id', 'diet:write'],
          ]}
        />
        <p className="text-slate-600 text-sm mb-2">
          <strong>GET</strong> — dia único (default ou{' '}
          <code className="bg-slate-100 px-1 rounded">?date=YYYY-MM-DD</code>):{' '}
          <code className="bg-slate-100 px-1 rounded text-xs">{`{ "date": "…", "meal_slots": [ { …slot, "entries": [ … ] } ] }`}</code>.
          Intervalo (<code className="bg-slate-100 px-1 rounded">?from=…&amp;to=…</code>, máx 31 dias):{' '}
          <code className="bg-slate-100 px-1 rounded text-xs">{`{ "from": "…", "to": "…", "days": [ { "date": "…", "meal_slots": [ … ] } ] }`}</code>.
          Slots ordenados por <code className="bg-slate-100 px-1 rounded">meal_time</code>, depois{' '}
          <code className="bg-slate-100 px-1 rounded">sort_order</code> e criação.
        </p>
        <p className="text-slate-600 text-sm mb-2">
          <strong>POST /api/v1/diet/meals</strong> — obrigatório: <code className="bg-slate-100 px-1 rounded">title</code>. Ou bem{' '}
          <code className="bg-slate-100 px-1 rounded">recurrence_days</code> (array de inteiros 0–6) para refeição semanal, ou refeição pontual com{' '}
          <code className="bg-slate-100 px-1 rounded">logged_date</code> (default hoje se não houver recorrência). Opcionais:{' '}
          <code className="bg-slate-100 px-1 rounded">meal_time</code>, <code className="bg-slate-100 px-1 rounded">sort_order</code>.
        </p>
        <p className="text-slate-600 text-sm mb-2">
          <strong>PATCH / DELETE /api/v1/diet/meals/:id</strong> — atualizar ou remover a refeição.{' '}
          <code className="bg-slate-100 px-1 rounded">PATCH</code>: <code className="bg-slate-100 px-1 rounded">title</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">meal_time</code> (<code className="bg-slate-100 px-1 rounded">null</code> para limpar),{' '}
          <code className="bg-slate-100 px-1 rounded">sort_order</code>, <code className="bg-slate-100 px-1 rounded">recurrence_days</code> e/ou{' '}
          <code className="bg-slate-100 px-1 rounded">logged_date</code>: ao enviar <code className="bg-slate-100 px-1 rounded">recurrence_days</code> valida a
          semana (e zera <code className="bg-slate-100 px-1 rounded">logged_date</code>); array vazio exige{' '}
          <code className="bg-slate-100 px-1 rounded">logged_date</code> para virar pontual; só{' '}
          <code className="bg-slate-100 px-1 rounded">logged_date</code> sem a chave de recorrência força pontual (zera recorrência).
        </p>
        <p className="text-slate-600 text-sm mb-2">
          <strong>POST /api/v1/diet</strong> — obrigatórios: <code className="bg-slate-100 px-1 rounded">name</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">meal_slot_id</code>. Para slot pontual, a data do item deve bater com o slot; para slot
          recorrente, o dia consultado deve estar em <code className="bg-slate-100 px-1 rounded">recurrence_days</code>. Item “modelo” (vale todos os
          dias): omita <code className="bg-slate-100 px-1 rounded">per_day</code> ou use <code className="bg-slate-100 px-1 rounded">false</code> —{' '}
          <code className="bg-slate-100 px-1 rounded">logged_date</code> no registro fica nulo. Só para aquele dia:{' '}
          <code className="bg-slate-100 px-1 rounded">per_day: true</code> e <code className="bg-slate-100 px-1 rounded">logged_date</code> no corpo. Opcionais:{' '}
          <code className="bg-slate-100 px-1 rounded">quantity_text</code>, <code className="bg-slate-100 px-1 rounded">calories</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">protein_g</code>, <code className="bg-slate-100 px-1 rounded">carbs_g</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">fat_g</code>, <code className="bg-slate-100 px-1 rounded">notes</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">sort_order</code>, e para modelo em refeição recorrente{' '}
          <code className="bg-slate-100 px-1 rounded">recurrence_days</code> (subconjunto 0–6 dos dias da refeição;{' '}
          <code className="bg-slate-100 px-1 rounded">null</code> = todos). Para usar um dia da semana que a refeição ainda não
          inclui, atualize antes o slot com <strong>PATCH /api/v1/diet/meals/:id</strong> (união de dias); caso contrário o servidor
          rejeita o item com <strong>400</strong>.
        </p>
        <p className="text-slate-600 text-sm">
          <strong>PATCH / DELETE /api/v1/diet/:id</strong> — item (entrada). <code className="bg-slate-100 px-1 rounded">PATCH</code> aceita os
          campos do item e opcionalmente <code className="bg-slate-100 px-1 rounded">meal_slot_id</code> e{' '}
          <code className="bg-slate-100 px-1 rounded">anchor_date</code> (YYYY-MM-DD) para validar o slot contra um dia concreto.
          Em item modelo de refeição recorrente, <code className="bg-slate-100 px-1 rounded">recurrence_days</code> (array 0–6 ou{' '}
          <code className="bg-slate-100 px-1 rounded">null</code>) segue a mesma regra de subconjunto do slot. Itens com data fixa
          não usam <code className="bg-slate-100 px-1 rounded">recurrence_days</code>. Corpo
          vazio no PATCH → <strong>400</strong>. <code className="bg-slate-100 px-1 rounded">DELETE</code> retorna{' '}
          <code className="bg-slate-100 px-1 rounded text-xs">{`{ "deleted": true, "id": "…" }`}</code>.
        </p>
      </section>

      <section id="backup" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Backup</h2>
        <Table
          headers={['Método', 'Rota', 'Escopo']}
          rows={[['GET', '/api/v1/backup', 'backup:read']]}
        />
        <p className="text-slate-600 text-sm mb-2">
          <strong>GET</strong> retorna um <em>snapshot completo</em> do usuário em uma única resposta, útil para uma IA
          enxergar o estado em uma chamada. Estrutura:
        </p>
        <JsonExample>
          {`{
  "version": 2,
  "timestamp": "…",
  "user_id": "…",
  "data": {
    "user_settings": { … } | null,
    "events": [ … ],
    "tasks":  [ … ],
    "finance": {
      "categories": [ … ], "transactions": [ … ],
      "recurring":  [ … ], "installments": [ … ],
      "budgets":    [ … ], "loans": [ … ], "loan_payments": [ … ]
    },
    "workout": { "plans": [ … ], "days": [ … ], "exercises": [ … ], "logs": [ … ] },
    "diet":    { "meal_slots": [ … ], "entries": [ … ], "recurring_skips": [ … ] }
  }
}`}
        </JsonExample>
        <p className="text-slate-600 text-sm">
          Não há rota REST de restauração pública — para reimportar, use a interface em{' '}
          <Link href="/settings" className="text-indigo-600 underline font-medium">Configurações → Backup</Link>.
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
