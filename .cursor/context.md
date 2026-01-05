📊 ANÁLISE COMPLETA DO PROJETO MHUB
PARTE 1: IDENTIDADE E PROPÓSITO
1.1 O que é este projeto?
Campo	Valor
Tipo	Web App (PWA)
Categoria	Produtividade / Dashboard Pessoal
Conceito Central	Um organizador pessoal híbrido que integra agenda, finanças e estudos em uma única plataforma com design moderno e animações fluidas
Diferencial	Combina 3 módulos importantes (Agenda, Financeiro, Estudos) com estética glassmorphism premium, notificações push/telegram, e sistema de gamificação para estudos (XP/Níveis)
1.2 Para quem é este projeto?
Campo	Valor
Público-alvo primário	Usuário individual (parece ser um "personal organizer" próprio - Floriani)
Nível de expertise esperado	Intermediário (precisa entender navegação entre módulos)
Contexto de uso	Uso diário para gerenciamento de compromissos, controle financeiro mensal, e acompanhamento de estudos com PDFs
Problema que resolve	Centraliza organização pessoal evitando múltiplas ferramentas; gamifica estudos para manter motivação; controle financeiro visual
PARTE 2: ESTRUTURA TÉCNICA
2.1 Arquitetura e Stack
FRAMEWORK/BIBLIOTECA:

Principal: Next.js 14 (App Router)
Versão: 14.0.4
Linguagem: TypeScript
ESTILIZAÇÃO:

Sistema: Tailwind CSS
Versão: 3.3.0
Configurações especiais: 
tailwind.config.ts
 customizado com:
Cores customizadas (primary: indigo, secondary: pink, dark: slate)
Background gradients customizados
Animações customizadas (slide-in, fade-in, float, pulse-slow)
Box shadows customizadas (glass, glow)
BIBLIOTECAS PRINCIPAIS:

Biblioteca	Propósito	Versão
@supabase/supabase-js	Backend (Auth + Database)	^2.39.0
framer-motion	Animações e transições	^10.18.0
lucide-react	Ícones vetoriais	^0.309.0
date-fns	Manipulação de datas	^3.6.0
dexie + dexie-react-hooks	IndexedDB local (arquivos/anotações)	^4.2.1
react-pdf + pdfjs-dist	Leitura de PDFs	^9.1.1 / ^4.4.168
react-player	Player YouTube	^3.4.0
recharts	Gráficos financeiros	^3.5.0
react-activity-calendar	Calendário de atividades	^3.0.5
web-push	Notificações Push	^3.6.7
clsx + tailwind-merge	Utilitários de classes	^2.0.0 / ^2.2.0
2.2 Mapeamento de Arquivos
MHUB/
├── app/
│   ├── api/
│   │   └── cron/send-notifications/   # API route para cron jobs
│   ├── auth/callback/                  # OAuth callback
│   ├── financial/
│   │   └── page.tsx                    # Página de Financeiro
│   ├── settings/
│   │   └── page.tsx                    # Página de Configurações
│   ├── studies/
│   │   ├── [id]/page.tsx              # Página individual de matéria
│   │   ├── read/[id]/page.tsx         # Leitor de PDF
│   │   └── page.tsx                    # Lista de matérias
│   ├── popup/                          # Modo popup da timeline
│   ├── globals.css                     # Estilos globais
│   ├── layout.tsx                      # Layout raiz com AuthProvider
│   └── page.tsx                        # Home (Dashboard)
│
├── components/
│   ├── auth/
│   │   └── LoginScreen.tsx             # Tela de login com Google
│   ├── dashboard/
│   │   ├── Dashboard.tsx               # Componente principal da home
│   │   ├── Timeline.tsx                # Timeline visual de eventos (~674 linhas)
│   │   ├── TaskList.tsx                # Lista de tarefas
│   │   ├── DateSelector.tsx            # Seletor de data
│   │   ├── CalendarPicker.tsx          # Picker de calendário expandido
│   │   ├── AddEventModal.tsx           # Modal criar evento
│   │   ├── EditEventModal.tsx          # Modal editar evento
│   │   ├── AddTaskModal.tsx            # Modal criar tarefa
│   │   ├── EditTaskModal.tsx           # Modal editar tarefa
│   │   ├── DeleteEventConfirmModal.tsx # Confirmação de exclusão
│   │   ├── Header.tsx                  # Header do dashboard
│   │   └── NotificationToast.tsx       # Toast de notificação
│   ├── financial/
│   │   ├── FinancialDashboard.tsx      # Dashboard financeiro
│   │   ├── FinancialCharts.tsx         # Gráficos com Recharts
│   │   ├── FinancialSummary.tsx        # Resumo financeiro
│   │   ├── RevenueSection.tsx          # Seção de receitas
│   │   ├── ExpenseSection.tsx          # Seção de despesas
│   │   ├── InvestmentSection.tsx       # Seção de investimentos
│   │   ├── RevenueModal.tsx            # Modal de receita
│   │   ├── ExpenseModal.tsx            # Modal de despesa
│   │   └── InvestmentModal.tsx         # Modal de investimento
│   ├── studies/
│   │   ├── PDFReader.tsx               # Leitor de PDF (~460 linhas)
│   │   ├── FocusPlayer.tsx             # Player YouTube flutuante (~436 linhas)
│   │   ├── AnnotationCanvas.tsx        # Canvas de anotações
│   │   ├── AnnotationToolbar.tsx       # Toolbar de ferramentas
│   │   ├── SelectionMenu.tsx           # Menu de seleção de texto
│   │   ├── NoteViewer.tsx              # Visualizador de notas
│   │   ├── AddSubjectModal.tsx         # Modal criar matéria
│   │   ├── CheckoutModal.tsx           # Modal de checkout/estudos
│   │   └── CompactAgenda.tsx           # Agenda compacta (estudos)
│   ├── layout/
│   │   ├── MainLayout.tsx              # Layout principal com sidebar
│   │   ├── Sidebar.tsx                 # Navegação lateral
│   │   └── PageTransition.tsx          # Transições entre páginas
│   ├── settings/
│   │   ├── WebPushSettings.tsx         # Config notificações push
│   │   └── TelegramSettings.tsx        # Config Telegram
│   ├── providers/
│   │   └── AuthProvider.tsx            # Context de autenticação
│   └── ui/
│       ├── Button.tsx                  # Componente botão
│       ├── Card.tsx                    # Componente card
│       ├── Input.tsx                   # Componente input
│       └── Checkbox.tsx                # Componente checkbox
│
├── hooks/
│   ├── useEventNotifications.ts        # Hook de notificações de eventos
│   └── usePushNotifications.ts         # Hook de push notifications
│
├── lib/
│   ├── supabase.ts                     # Cliente Supabase + types (~306 linhas)
│   ├── auth.ts                         # Funções de autenticação
│   ├── db.ts                           # Configuração Dexie (IndexedDB)
│   ├── push.ts                         # Utilitários Push
│   ├── utils.ts                        # Utilitários gerais (cn)
│   └── data/
│       ├── events.ts                   # CRUD de eventos (~308 linhas)
│       ├── tasks.ts                    # CRUD de tarefas
│       ├── financial.ts                # CRUD financeiro
│       ├── settings.ts                 # CRUD configurações
│       └── backup.ts                   # Export/Import backup
│
├── public/
│   ├── manifest.json                   # PWA manifest
│   ├── pdf.worker.mjs                  # Worker do PDF.js
│   ├── sw.js                           # Service Worker
│   └── icon.png                        # Ícone da aplicação
│
├── docs/                               # Documentação
├── supabase_migrations/                # Migrações SQL
└── [arquivos de config]
TOTAL:

Páginas/Rotas: 6 (Home, Financial, Studies, Studies/[id], Studies/read/[id], Settings)
Componentes: 41
Utilitários: 10 (lib/ + hooks/)
Arquivos de config: tailwind.config.ts, next.config.js, tsconfig.json, postcss.config.js
PARTE 3: FUNCIONALIDADES E FLUXOS
3.1 Funcionalidades Principais (Core Features)
1. MÓDULO AGENDA/DASHBOARD
Descrição: Timeline visual horizontal com eventos do dia, suporte a eventos recorrentes, drag horizontal para navegar, zoom ctrl+scroll, drag-and-drop de eventos pixel-perfect (60fps) com resize fluido.
Onde está: 
components/dashboard/Dashboard.tsx
, 
Timeline.tsx
, 
TaskList.tsx
Importância: Crítica
Depende de: Supabase (events, tasks), framer-motion, date-fns
2. MÓDULO FINANCEIRO
Descrição: Dashboard financeiro com receitas, despesas, investimentos organizados por mês/ano com gráficos visuais
Onde está: components/financial/, app/financial/page.tsx
Importância: Alta
Depende de: Supabase (revenues, investments, expenses), recharts
3. MÓDULO ESTUDOS (Knowledge Garden)
Descrição: Sistema gamificado de estudos com matérias (XP/Níveis), upload de PDFs com leitor integrado, anotações/highlights, player YouTube flutuante
Onde está: components/studies/, app/studies/, lib/db.ts
Importância: Alta
Depende de: Supabase (subjects, study_sessions), Dexie/IndexedDB (arquivos locais), react-pdf, framer-motion
4. AUTENTICAÇÃO GOOGLE OAUTH
Descrição: Login via Google integrado com Supabase Auth
Onde está: lib/auth.ts, components/auth/LoginScreen.tsx, components/providers/AuthProvider.tsx
Importância: Crítica
Depende de: Supabase Auth
3.2 Funcionalidades Secundárias
Feature	Descrição	Complementa	Pode ser removida?
Notificações Locais	Alertas antes de compromissos (com site aberto)	Agenda	Sim
Notificações Push/Telegram	Alertas mesmo com site fechado	Agenda	Sim
Backup/Restore	Export/import de dados em JSON	Todos	Sim
Focus Player	Player YouTube flutuante para estudos	Estudos	Com cautela
Eventos Recorrentes	Eventos que se repetem em dias específicos	Agenda	Com cautela
Canvas Anotações PDF	Desenhar/escrever sobre PDFs	Estudos	Sim
3.3 Funcionalidades Planejadas/Futuras
Feature	Status	Evidências
Heatmap de Estudos	Stub	app/studies/page.tsx linha 56: "Heatmap de inconsistência (Em Breve)"
Integração Telegram completa	Implementado (Descrições Ricas + Anti-Spam Inteligente)	components/settings/TelegramSettings.tsx
Cron Jobs para notificações	Implementado	app/api/cron/send-notifications/route.ts, cronjobapi.md
3.4 Jornada do Usuário (Fluxo Principal)
FLUXO PRIMÁRIO - AGENDA:

1. Usuário acessa → app/page.tsx
2. Sistema verifica auth → AuthProvider
3. Usuário não logado → LoginScreen.tsx
4. Login Google → Supabase Auth
5. Usuário logado → Dashboard.tsx
6. Dashboard carrega → Timeline + TaskList
7. Usuário navega dias → DateSelector
8. Usuário cria evento → AddEventModal
9. Evento salvo → Supabase events
10. Timeline atualizada → getEventsByDate()
ARQUIVOS ENVOLVIDOS:

Entrada: page.tsx → Dashboard.tsx
Lógica: lib/data/events.ts, lib/data/tasks.ts
Estado: AuthProvider.tsx (context), useState no Dashboard
Saída: Timeline.tsx, TaskList.tsx
PARTE 4: ARQUITETURA DE DADOS
4.1 Entidades Principais (Supabase)
Entidade	Tabela	Campos Críticos	Consumidores
User	Supabase Auth	id, email	Todos os módulos
Event	events	id, user_id, title, start_time, end_time, is_recurring, recurrence_days, updated_at	Timeline, Dashboard
Task	tasks	id, user_id, title, is_completed, target_date	TaskList, Dashboard
Revenue	revenues	id, user_id, category, amount, month, year	FinancialDashboard
Investment	investments	id, user_id, category, amount, month, year	FinancialDashboard
Expense	expenses	id, user_id, type, category, item, amount, month, year	FinancialDashboard
Subject	subjects	id, user_id, name, color, level, xp_current, xp_next_level	Studies
StudySession	study_sessions	id, user_id, subject_id, duration_minutes, xp_earned	Studies
UserSettings	user_settings	id, user_id, notifications_enabled, notification_minutes_before, allow_multiple_notifications	Settings
PlaylistItem	study_playlist_items	id, user_id, title, url	FocusPlayer
4.2 Entidades Locais (IndexedDB - Dexie)
Entidade	Tabela	Campos Críticos	Consumidores
LocalFile	files	id, subjectId, file (Blob), name, lastReadPage, coverImage	PDFReader
PlayerSetting	playerSettings	subjectId, lastPlayedLink, volume	FocusPlayer
Annotation	annotations	id, fileId, page_number, quote, note, color, rects	PDFReader
PageAnnotations	pageAnnotations	id, fileId, pageNumber, strokes, shapes, textBoxes	AnnotationCanvas
4.3 Fluxo de Dados Principal
DADO: Evento (Event)
│
├─ ORIGEM: AddEventModal / EditEventModal
├─ PROCESSAMENTO: createEvent() / updateEvent() em lib/data/events.ts
├─ ARMAZENAMENTO: Supabase PostgreSQL (table: events)
├─ VirtualEvent: Eventos recorrentes geram instâncias virtuais com ID composto (parentId_date)
└─ CONSUMO: Timeline.tsx via getEventsByDate()
DEPENDÊNCIAS:
- Depende de: user_id (Auth)
- Alimenta: Notificações (useEventNotifications)
4.4 Gerenciamento de Estado
ESTRATÉGIA DE ESTADO:

Escopo	Método	Uso
Global	React Context (AuthProvider)	Usuário logado, sessão
Local	useState	Estados de UI, dados carregados
Persistente Server	Supabase	Todos os dados principais
Persistente Client	IndexedDB (Dexie)	Arquivos PDF, anotações canvas
Persistente Client	localStorage	Eventos notificados, preferências
ESTADOS PRINCIPAIS:

Estado	Escopo	Mutado por	Observado por
user	Global	AuthProvider	Todos os componentes via useAuth()
events	Local (Dashboard)	createEvent, updateEvent, deleteEvent	Timeline
tasks	Local (Dashboard)	createTask, updateTask, deleteTask	TaskList
selectedDate	Local (Dashboard)	DateSelector	Dashboard, Timeline
PARTE 5: DESIGN SYSTEM E MEDIDAS EXATAS
5.1 Layout e Espaçamento
CONTAINERS PRINCIPAIS:

Container	Classes Tailwind	Valor PX
Global wrapper (main layout)	min-h-screen flex	-
Sidebar Desktop Expandida	w-64	256px
Sidebar Desktop Colapsada	w-20	80px
Task Column	lg:w-[400px]	400px
Content Area	ml-0 lg:ml-64	0 / 256px
GRID SYSTEM:

Contexto	Classes	Gap
Studies Grid	grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4	gap-6 (24px)
Financial Grid	grid-cols-1 xl:grid-cols-3	gap-6 (24px)
Dashboard Layout	flex flex-col lg:flex-row	gap-8 (32px)
ESPAÇAMENTOS COMUNS:

Classe Tailwind	Valor PX	Contexto
p-4	16px	Padding mobile
p-6	24px	Padding cards
p-8	32px	Padding desktop sections
gap-2	8px	Gaps pequenos
gap-3	12px	Gaps botões
gap-4	16px	Gaps médios
gap-6	24px	Gaps grids
gap-8	32px	Gaps seções
mb-6	24px	Margin bottom títulos
space-y-2	8px	Stack vertical
5.2 Tipografia Detalhada
CONFIGURAÇÃO:

Fonte Principal: Inter (Google Fonts via next/font)
Carregamento: next/font/google otimizado
HIERARQUIA COMPLETA:

Elemento	Classes	PX	Peso	Contexto
H1 Principal	text-2xl sm:text-4xl font-extrabold	24px / 36px	800	Saudação Dashboard
H1 Gradient	text-3xl font-extrabold	30px	800	Título Studies
H2 Página	text-3xl font-bold	30px	700	Título Financial
H2 Card	text-lg font-semibold	18px	600	Títulos seções
Subtítulo	text-sm sm:text-base font-medium	14/16px	500	Descrições
Body	text-sm	14px	400	Texto padrão
Small	text-xs	12px	400	Labels, hints
Micro	text-[10px]	10px	400/500	Timeline AM/PM, tooltips
Login título	text-4xl font-bold	36px	700	MHUB login
Sidebar	text-2xl font-bold	24px	700	"MHUB" sidebar
CORES DE TEXTO:

Tipo	Classes	Hex
Primário	text-gray-900	#111827
Secundário	text-gray-500 / text-gray-600	#6B7280 / #4B5563
Muted	text-gray-400	#9CA3AF
Branco	text-white	#FFFFFF
Destaque Primary	text-primary (Tailwind custom)	#6366F1
Destaque Secondary	text-secondary	#EC4899
Erro	text-red-500	#EF4444
Sucesso	text-emerald-600	#059669
5.3 Componentes e Dimensões
PADRÕES VISUAIS:

Aspecto	Valor	Contexto
Estilo dominante	Glassmorphism + Gradients	Todo o app
Background pattern	Gradientes radiais em corners	app/globals.css body
Glass effect	bg-white/70 backdrop-blur-lg border-white/20	Cards principais
Glass card	bg-white/80 backdrop-blur-md border-white/50	Cards secundários
Border radius padrão	rounded-xl (12px), rounded-2xl (16px), rounded-3xl (24px)	Conforme contexto
Sombras	shadow-sm, shadow-lg, shadow-xl, shadow-glass (custom)	Elevação
COMPONENTES PRINCIPAIS:

Componente	Width	Height	Padding	Border Radius
Button SM	auto	auto	px-3 py-1.5 (12px/6px)	rounded-lg (8px)
Button MD	auto	auto	px-4 py-2 (16px/8px)	rounded-lg (8px)
Button LG	auto	auto	px-6 py-3 (24px/12px)	rounded-lg (8px)
Card	auto	auto	p-6 (24px)	rounded-2xl (16px)
Input	w-full	auto	px-4 py-2 (16px/8px)	rounded-lg (8px)
Sidebar item	w-full	auto	px-3 py-3 (12px/12px)	rounded-xl (12px)
Timeline Event	dinâmico	72px fixo	p-3 (12px)	rounded-xl (12px)
Subject Card	grid auto	aspect-video	p-6 (24px)	rounded-3xl (24px)
Modal	max-w-md (448px)	auto	varia	rounded-2xl (16px)
Logo container	40px × 40px	40px	-	rounded-xl (12px)
5.4 Cores do Design System
PALETA TAILWIND CUSTOMIZADA (tailwind.config.ts):

Token	Valor	Uso
primary.DEFAULT	#6366F1 (Indigo 500)	Botões, destaques
primary.dark	#4F46E5 (Indigo 600)	Hover, gradients
primary.light	#818CF8 (Indigo 400)	Estados leves
secondary.DEFAULT	#EC4899 (Pink 500)	Acentos, gradients
secondary.dark	#DB2777 (Pink 600)	Hover
secondary.light	#F472B6 (Pink 400)	Estados leves
dark.DEFAULT	#0F172A (Slate 900)	Backgrounds escuros
dark.lighter	#1E293B (Slate 800)	Cards escuros
GRADIENTES:

Nome	Valor	Uso
hero-gradient	linear-gradient(135deg, #6366F1, #EC4899)	Headers
glass-gradient	linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))	Glassmorphism
5.5 Animações e Transições
BIBLIOTECA: Framer Motion ^10.18.0

PADRÕES DE ANIMAÇÃO:

Contexto	Duration	Easing	Config Framer
Slide-in	300ms	ease-out	{ type: "spring", stiffness: 500, damping: 30 }
Fade-in	500ms	ease-out	{ opacity: 0, y: 10 } → { opacity: 1, y: 0 }
Float	3000ms	ease-in-out	Infinite translate Y
Sidebar spring	spring	stiffness: 300, damping: 30	Drawer mobile
Card hover	200ms	spring	whileHover={{ y: -5 }}
Button tap	instant	spring	whileTap={{ scale: 0.95 }}
Timeline event	spring	stiffness: 400, damping: 25	Entrada de eventos
TRANSIÇÕES CSS (Tailwind):

Classe	Valor
transition-all	all 150ms
duration-200	200ms
duration-300	300ms
duration-500	500ms
INTERAÇÕES:

Tipo	Efeito
Hover Cards	whileHover={{ y: -5 }}, hover:shadow-lg
Hover Buttons	whileHover={{ scale: 1.05 }}
Active/Tap	whileTap={{ scale: 0.95 }}
Focus	focus:ring-2 focus:ring-primary focus:ring-offset-2
Loading	animate-spin (Loader2 icon)
PARTE 6: INTEGRAÇÕES E CAPACIDADES
6.1 Capacidades Técnicas Confirmadas
Capacidade	Status	Detalhes
[x] Autenticação Google OAuth	✅	Supabase Auth
[x] CRUD de dados em nuvem	✅	Supabase PostgreSQL
[x] Armazenamento local de arquivos grandes	✅	IndexedDB via Dexie (PDFs)
[x] Leitura de PDFs	✅	react-pdf + pdfjs-dist
[x] Anotações em PDF (texto)	✅	Highlights com coordenadas normalizadas
[x] Anotações em PDF (canvas)	✅	Strokes com tool pen/highlighter/eraser
[x] Player YouTube integrado	✅	YouTube IFrame API
[x] Notificações do navegador	✅	Notification API nativa
[x] Notificações Push	✅	web-push + service worker
[x] Backup/Restore JSON	✅	lib/data/backup.ts
[x] Eventos recorrentes	✅	VirtualEvents gerados dinamicamente
[x] Gráficos visuais	✅	Recharts
[x] PWA básico	✅	manifest.json + sw.js
[ ] Modo offline completo	❌	Apenas leitura de PDFs locais
6.2 Integrações Externas
INTEGRAÇÃO: Supabase

Propósito: Backend completo (Auth + Database + RLS)
Implementação: lib/supabase.ts, lib/data/*.ts
Tipo: REST API (PostgREST)
Dados trocados: Usuários, eventos, tarefas, finanças, estudos
Crítico para funcionamento? Sim
Fallback se falhar? App não funciona sem auth
INTEGRAÇÃO: YouTube IFrame API

Propósito: Player de música/vídeo para estudos
Implementação: components/studies/FocusPlayer.tsx
Tipo: JavaScript SDK
Dados trocados: URLs de vídeo, comandos de player
Crítico para funcionamento? Não
Fallback se falhar? Feature não disponível
INTEGRAÇÃO: Telegram Bot

Propósito: Notificações externas
Implementação: components/settings/TelegramSettings.tsx, API routes
Tipo: Telegram Bot API
Crítico para funcionamento? Não
Fallback: Notificações push/locais
6.3 Integrações Internas (Módulos)
AuthProvider (Context)
├─ DEPENDE DE: Supabase Auth
├─ USADO POR: Todos os componentes
├─ EXPORTA: useAuth() hook
└─ PODE SER ISOLADO? Não
Dashboard Module
├─ DEPENDE DE: AuthProvider, lib/data/events, lib/data/tasks
├─ USADO POR: app/page.tsx
├─ EXPORTA: Nada (página)
└─ PODE SER ISOLADO? Sim
Financial Module
├─ DEPENDE DE: AuthProvider, lib/data/financial
├─ USADO POR: app/financial/page.tsx
├─ EXPORTA: Nada (página)
└─ PODE SER ISOLADO? Sim
Studies Module
├─ DEPENDE DE: AuthProvider, Supabase (subjects), Dexie (files, annotations)
├─ USADO POR: app/studies/*
├─ EXPORTA: Nada (páginas)
└─ PODE SER ISOLADO? Sim (módulo mais independente)
PARTE 7: UX E PERFORMANCE
7.1 Padrões de Interface
ESTÉTICA:

Estilo dominante: Glassmorphism + Gradientes + Dark UI elements
Paleta de cores:
Primária: #6366F1 (Indigo)
Secundária: #EC4899 (Pink)
Background: #F9FAFB (Gray 50) com gradientes radiais sutis
Cards: Branco com transparência e blur
Hierarquia visual: Gradientes atraem atenção, ícones coloridos indicam ação
Responsividade: Mobile-first com breakpoints lg (1024px)
PADRÕES DE INTERAÇÃO:

Padrão	Implementação
Feedbacks	Loaders com Loader2 spinning, toasts para notificações
Navegação	Sidebar fixa com collapse, rotas Next.js
Entrada de dados	Modais com formulários
Drag	Timeline horizontal, Focus Player draggable
Zoom	Ctrl+Scroll na Timeline
COMUNICAÇÃO:

Tipo	Implementação
Mensagens de erro	console.error + alert() básico
Validações	Básica (required fields)
Confirmações	confirm() nativo para ações destrutivas
Orientação	Placeholders em inputs, empty states
7.2 Performance e Otimizações
OPERAÇÕES PESADAS IDENTIFICADAS:

Operação	Local	Impacto	Otimização
Renderização Timeline	Timeline.tsx	Médio	useMemo para cálculos, useRef e Direct DOM manipulation para Drag (60fps)
Carregamento PDF	PDFReader.tsx	Alto	Worker em arquivo separado, URL.createObjectURL
Strokes Canvas	AnnotationCanvas.tsx	Médio	Estado local com persist ao DB
Busca eventos recorrentes	events.ts	Médio	VirtualEvents calculados dinamicamente
OTIMIZAÇÕES EM USO:

Otimização	Status	Local
[x] useMemo	Timeline lanes, event styles	Timeline.tsx
[x] useCallback	Handlers de navegação, zoom	Timeline.tsx, PDFReader.tsx
[x] Lazy loading (imports)	Não implementado sistematicamente	-
[x] Debounce	Não encontrado	-
[x] Image optimization	next/image não usado	-
[x] PDF Worker	Worker separado em public/	pdf.worker.mjs
[x] Dexie para arquivos grandes	IndexedDB evita limite localStorage	lib/db.ts
RESUMO EXECUTIVO
O MHUB é um Web App de produtividade pessoal moderno e bem estruturado, construído com Next.js 14 + TypeScript + Supabase + Tailwind CSS. O projeto combina três módulos principais:

Agenda - Timeline visual com eventos recorrentes
Financeiro - Dashboard com gráficos mensais/anuais
Estudos - Sistema gamificado com leitor PDF e player YouTube
Pontos Fortes:

Design premium com glassmorphism e animações Framer Motion
Arquitetura modular bem separada
Uso inteligente de IndexedDB para arquivos grandes
Sistema de eventos recorrentes bem implementado
Pontos de Atenção:

Tratamento de erros básico (alert/confirm nativos)
Ausência de testes automatizados
Sem lazy loading sistemático de componentes
Sem modo offline completo
Stack Principal: Next.js 14, TypeScript, Tailwind CSS, Supabase, Framer Motion, Dexie, react-pdf