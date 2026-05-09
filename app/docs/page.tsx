import Link from 'next/link'
import { ArrowRight, Bot, FileJson } from 'lucide-react'

export default function DocsHomePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
      <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-3">Documentação</p>
      <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">
        MHUB — guias e API
      </h1>
      <p className="text-lg text-slate-600 leading-relaxed mb-12">
        Central oficial de ajuda: como automatizar sua agenda, finanças e treino com assistentes de IA e
        integrações HTTP, sem depender de arquivos soltos no GitHub.
      </p>

      <div className="grid gap-4 sm:gap-6">
        <Link
          href="/docs/guia-ia"
          className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            <Bot className="w-6 h-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-700 flex items-center gap-2">
              Guia com IA
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h2>
            <p className="text-slate-600 text-sm mt-1 leading-relaxed">
              Passo a passo: criar chave de API, URL base, texto pronto para colar no ChatGPT ou Claude e teste com{' '}
              <code className="text-xs bg-slate-100 px-1 rounded">curl</code>.
            </p>
          </div>
        </Link>

        <Link
          href="/docs/api"
          className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
            <FileJson className="w-6 h-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-700 flex items-center gap-2">
              Referência da API REST
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h2>
            <p className="text-slate-600 text-sm mt-1 leading-relaxed">
              Autenticação por Bearer, escopos, todas as rotas <code className="text-xs bg-slate-100 px-1 rounded">/api/v1</code>,
              corpos JSON e códigos de erro — em uma página só, no padrão de documentação de produto.
            </p>
          </div>
        </Link>
      </div>

      <p className="mt-12 text-sm text-slate-500 border-t border-slate-200 pt-8">
        Desenvolvedores que clonam o repositório também encontram o espelho em{' '}
        <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">MHUB_API.md</code> na raiz do projeto.
      </p>
    </div>
  )
}
