import Link from 'next/link'

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
                  <code className="text-xs sm:text-sm bg-slate-50 px-1.5 py-0.5 rounded">{cell}</code>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ApiReferencePage() {
  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
      <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-2">Referência</p>
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">API REST v1</h1>
      <p className="text-slate-600 leading-relaxed mb-10 max-w-2xl">
        Base: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">/api/v1</code>. Todas as
        respostas são JSON. Inclua o token pessoal no header{' '}
        <code className="bg-slate-100 px-1.5 rounded">Authorization: Bearer mhub_…</code> gerado em{' '}
        <Link href="/settings" className="text-indigo-600 underline font-medium">
          Configurações
        </Link>
        .
      </p>

      <nav className="flex flex-wrap gap-2 mb-12 text-sm">
        {[
          ['#visao-geral', 'Visão geral'],
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

      <section id="visao-geral" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Visão geral</h2>
        <p className="text-slate-600 text-sm leading-relaxed mb-3">
          Cada usuário possui chaves com escopos (permissões). O endpoint{' '}
          <code className="bg-slate-100 px-1 rounded">GET /api/v1/me</code> confirma o token e devolve{' '}
          <code className="bg-slate-100 px-1 rounded">user_id</code>, <code className="bg-slate-100 px-1 rounded">scopes</code> e links de documentação.
        </p>
        <p className="text-slate-600 text-sm leading-relaxed">
          Para um fluxo guiado com ChatGPT ou Claude, use o{' '}
          <Link href="/docs/guia-ia" className="text-indigo-600 underline font-medium">
            Guia com IA
          </Link>
          .
        </p>
      </section>

      <section id="escopos" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Escopos</h2>
        <p className="text-slate-600 text-sm mb-3">
          Exemplos: <code className="bg-slate-100 px-1 rounded">agenda:read</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">finance:*</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">*</code> (acesso total). O prefixo{' '}
          <code className="bg-slate-100 px-1 rounded">recurso:*</code> libera leitura e escrita daquele módulo.
        </p>
        <p className="text-slate-600 text-sm">
          Se receber <strong>403</strong>, gere uma nova chave com o escopo necessário ou use “Acesso total”.
        </p>
      </section>

      <section id="me" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
          <code className="text-lg">GET /api/v1/me</code>
        </h2>
        <p className="text-slate-600 text-sm">
          Retorna <code className="bg-slate-100 px-1 rounded">user_id</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">scopes</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">api</code> e caminhos da documentação no site (
          <code className="bg-slate-100 px-1 rounded">docs_home</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">guide_url</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">api_reference_url</code>) além de{' '}
          <code className="bg-slate-100 px-1 rounded">docs</code> (arquivo no repositório). Não exige escopo além de um
          token válido.
        </p>
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
        <p className="text-slate-600 text-sm">
          <strong>POST JSON:</strong> <code className="bg-slate-100 px-1 rounded">title</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">start_time</code> (ISO); opcional:{' '}
          <code className="bg-slate-100 px-1 rounded">end_time</code>, <code className="bg-slate-100 px-1 rounded">description</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">is_recurring</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">recurrence_days</code> (0–6),{' '}
          <code className="bg-slate-100 px-1 rounded">recurrence_end_date</code>. IDs virtuais de recorrentes usam o
          padrão <code className="bg-slate-100 px-1 rounded">uuid_YYYY-MM-DD</code>; mutações normalizam para o UUID
          pai.
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
        <p className="text-slate-600 text-sm">
          <strong>POST:</strong> <code className="bg-slate-100 px-1 rounded">title</code>; opcional:{' '}
          <code className="bg-slate-100 px-1 rounded">is_completed</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">target_date</code> (YYYY-MM-DD).
        </p>
      </section>

      <section id="financeiro" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Financeiro</h2>
        <Table
          headers={['Método', 'Rota', 'Escopo']}
          rows={[
            ['GET', '/api/v1/finance/categories', 'finance:read'],
            ['POST', '/api/v1/finance/categories', 'finance:write'],
            ['PATCH', '/api/v1/finance/categories/:id', 'finance:write'],
            ['DELETE', '/api/v1/finance/categories/:id', 'finance:write'],
            ['GET', '/api/v1/finance/transactions?year=&month= ou ?from=&to=', 'finance:read'],
            ['POST', '/api/v1/finance/transactions', 'finance:write'],
            ['PATCH', '/api/v1/finance/transactions/:id', 'finance:write'],
            ['DELETE', '/api/v1/finance/transactions/:id', 'finance:write'],
          ]}
        />
        <p className="text-slate-600 text-sm">
          Listagem sem filtro de data retorna até <strong>500</strong> lançamentos.{' '}
          <strong>POST transação:</strong> <code className="bg-slate-100 px-1 rounded">title</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">kind</code> (expense | income | investment),{' '}
          <code className="bg-slate-100 px-1 rounded">amount</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">occurred_on</code>; opcional:{' '}
          <code className="bg-slate-100 px-1 rounded">category_id</code>, <code className="bg-slate-100 px-1 rounded">payment_method</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">notes</code>, <code className="bg-slate-100 px-1 rounded">tags</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">paid</code>.
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
        <p className="text-slate-600 text-sm">
          <strong>PATCH exercício:</strong> opcional{' '}
          <code className="bg-slate-100 px-1 rounded">name</code>, <code className="bg-slate-100 px-1 rounded">sets</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">reps</code>, <code className="bg-slate-100 px-1 rounded">rest_seconds</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">weight_kg</code>, <code className="bg-slate-100 px-1 rounded">notes</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">order</code>.
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
        <p className="text-slate-600 text-sm">
          <strong>PATCH:</strong> opcional <code className="bg-slate-100 px-1 rounded">notifications_enabled</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">notification_minutes_before</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">allow_multiple_notifications</code>,{' '}
          <code className="bg-slate-100 px-1 rounded">telegram_chat_id</code>.
        </p>
      </section>

      <section id="diet" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Dieta (reservado)</h2>
        <p className="text-slate-600 text-sm">
          <code className="bg-slate-100 px-1 rounded">GET /api/v1/diet</code> — escopo <code className="bg-slate-100 px-1 rounded">diet:read</code>.
          Resposta atual <strong>501</strong> até o módulo existir.
        </p>
      </section>

      <section id="erros" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Códigos de erro</h2>
        <Table
          headers={['HTTP', 'Significado']}
          rows={[
            ['401', 'Token ausente ou inválido'],
            ['403', 'Token sem escopo para a rota'],
            ['503', 'API indisponível no ambiente (configuração do servidor)'],
            ['501', 'Recurso ainda não implementado'],
          ]}
        />
        <p className="text-slate-600 text-sm mt-3">Corpo típico: {`{ "error": "mensagem" }`}</p>
      </section>

      <section id="exemplos" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">Exemplos</h2>
        <p className="text-slate-600 text-sm mb-3">Bash:</p>
        <pre className="bg-slate-900 text-emerald-400 text-xs rounded-xl p-4 overflow-x-auto mb-6">
          {`export MHUB_URL="https://seu-dominio.com"
export MHUB_TOKEN="mhub_..."

curl -s -H "Authorization: Bearer $MHUB_TOKEN" "$MHUB_URL/api/v1/me"`}
        </pre>
        <p className="text-slate-600 text-sm mb-3">PowerShell:</p>
        <pre className="bg-slate-900 text-sky-300 text-xs rounded-xl p-4 overflow-x-auto">
          {`$MHUB_URL = "https://seu-dominio.com"
$MHUB_TOKEN = "mhub_..."
$h = @{ Authorization = "Bearer $MHUB_TOKEN" }
Invoke-RestMethod -Uri "$MHUB_URL/api/v1/me" -Headers $h`}
        </pre>
      </section>
    </article>
  )
}
