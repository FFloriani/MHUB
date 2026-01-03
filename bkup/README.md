# MHUB - Organizador Pessoal Híbrido

Um organizador pessoal moderno construído com Next.js, TypeScript e Supabase.

## 🚀 Tecnologias

- **Framework**: Next.js 14 (App Router)
- **Linguagem**: TypeScript (Strict mode)
- **Estilização**: Tailwind CSS
- **Backend**: Supabase (Auth + Database)
- **Ícones**: Lucide React
- **Datas**: date-fns

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta no Supabase com banco de dados configurado

## 🛠 Instalação

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
Crie um arquivo `.env.local` na raiz do projeto com:
```
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

4. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

5. Acesse [http://localhost:3000](http://localhost:3000)

## 🗄 Estrutura do Banco de Dados

O projeto espera as seguintes tabelas no Supabase:

### Tabela `tasks`
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `title` (text)
- `is_completed` (boolean)
- `target_date` (date)

### Tabela `events`
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `title` (text)
- `start_time` (timestamp)
- `end_time` (timestamp)
- `description` (text, nullable)

**Importante**: Certifique-se de que o RLS (Row Level Security) está configurado corretamente nas tabelas.

## 🎨 Funcionalidades

- ✅ Autenticação com Google OAuth
- 📅 Timeline visual do dia (00h - 23h)
- 📝 Lista de tarefas com checkbox
- ➕ Adicionar eventos e tarefas
- 📆 Navegação entre dias
- 🔒 Dashboard protegida por autenticação

## 📁 Estrutura do Projeto

```
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── callback/     # Callback do OAuth
│   ├── globals.css           # Estilos globais
│   ├── layout.tsx             # Layout raiz
│   └── page.tsx               # Página principal
├── components/
│   ├── auth/
│   │   └── LoginScreen.tsx    # Tela de login
│   ├── dashboard/
│   │   ├── Dashboard.tsx      # Componente principal da dashboard
│   │   ├── Header.tsx         # Cabeçalho com navegação
│   │   ├── Timeline.tsx       # Timeline de eventos
│   │   ├── TaskList.tsx       # Lista de tarefas
│   │   ├── DateSelector.tsx   # Seletor de data
│   │   ├── AddEventModal.tsx  # Modal para adicionar evento
│   │   └── AddTaskModal.tsx   # Modal para adicionar tarefa
│   └── ui/
│       ├── Button.tsx          # Componente de botão
│       ├── Input.tsx           # Componente de input
│       ├── Card.tsx            # Componente de card
│       └── Checkbox.tsx        # Componente de checkbox
├── lib/
│   ├── supabase.ts            # Cliente do Supabase
│   ├── auth.ts                # Funções de autenticação
│   ├── utils.ts               # Utilitários
│   └── data/
│       ├── tasks.ts           # Funções para tarefas
│       └── events.ts          # Funções para eventos
└── package.json

```

## 🔧 Configuração do Supabase

1. No painel do Supabase, configure o Google OAuth:
   - Vá em Authentication > Providers > Google
   - Adicione o Client ID e Client Secret do Google
   - Configure a URL de callback: `https://seu-dominio.com/api/auth/callback`

2. Configure o RLS nas tabelas:
   - `tasks`: Usuários só podem ver/editar suas próprias tarefas
   - `events`: Usuários só podem ver/editar seus próprios eventos

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria a build de produção
- `npm run start` - Inicia o servidor de produção
- `npm run lint` - Executa o linter

## 🎯 Próximos Passos

- [ ] Adicionar edição de eventos e tarefas
- [ ] Adicionar exclusão de eventos e tarefas
- [ ] Implementar notificações
- [ ] Adicionar tema escuro
- [ ] Melhorar responsividade mobile

## 📄 Licença

Este projeto é privado.

