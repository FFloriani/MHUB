# MHUB API v1

Documentação da API HTTP para automação (Cursor, Claude, scripts). Todas as rotas ficam em **`/api/v1/...`**.

**Arquivo no repositório:** `MHUB_API.md` (raiz do projeto). Você pode abrir no GitHub, colar o conteúdo no chat da IA ou anexar o arquivo em conversas que aceitam documentos.

---

## Índice

1. [Como usar com uma IA (passo a passo)](#como-usar-com-uma-ia-passo-a-passo)  
2. [Texto pronto para colar no Chat da IA](#texto-pronto-para-colar-no-chat-da-ia)  
3. [Autenticação](#autenticação)  
4. [Base URL e Vercel](#base-url-e-vercel)  
5. [Escopos](#escopos)  
6. [Endpoints (detalhe)](#endpoints-detalhe)  
7. [Exemplos curl](#exemplos-curl)  
8. [Erros](#erros)  
9. [Requisitos no Supabase / servidor](#requisitos-no-supabase--servidor)

---

## Como usar com uma IA (passo a passo)

1. **URL base** — Use o mesmo endereço que você abre no navegador para o MHUB (produção), **sem** barra no final.  
   - Ex.: `https://seu-dominio.vercel.app` ou domínio customizado.  
   - Evite URLs de *preview* com **Deployment Protection** se o `curl` de fora falhar: use produção ou configure bypass na Vercel.

2. **Token** — No app: **Configurações → API para automação (IA / scripts)** → gerar chave → copiar o valor que começa com `mhub_`.  
   - Guarde em lugar seguro; a IA pode usar esse valor só **na sua máquina** (variável de ambiente, `.env` local), não em prints públicos.

3. **Dar contexto à IA** — Faça uma destas opções:  
   - Cole a seção [**Texto pronto para colar no Chat da IA**](#texto-pronto-para-colar-no-chat-da-ia) e preencha `BASE_URL` e `TOKEN`.  
   - Ou anexe / aponte para este arquivo `MHUB_API.md`.  
   - No **Cursor**: você pode colocar o bloco em `.cursor/rules` ou em uma nota fixa do projeto.

4. **Pedido típico** — Ex.: *“Usando BASE_URL e o header Authorization com meu token, lista meus eventos de hoje e sugere um `curl` para criar uma tarefa amanhã.”*

5. **Segurança** — Não commite o token no Git; não cole em issues públicas do GitHub.

---

## Texto pronto para colar no Chat da IA

Copie o bloco abaixo, substitua os valores e envie para Claude, ChatGPT, Cursor, etc.

```text
Você vai me ajudar a chamar a API do MHUB (aplicação Next.js) via HTTP.

Configuração (preencha eu):
- BASE_URL: https://COLOQUE-AQUI-SEM-BARRA-FINAL
- Para cada requisição, envie o header exatamente assim:
  Authorization: Bearer COLOQUE_SEU_TOKEN_mhub_...

Regras:
- Todas as rotas começam com BASE_URL + "/api/v1"
- Respostas de sucesso são JSON; erros trazem { "error": "mensagem" }.
- Códigos: 401 = token inválido/ausente; 403 = escopo insuficiente; 503 = servidor sem service role (problema de deploy, não do usuário).

Endpoints (resumo):
- GET  /api/v1/me — confere token e retorna user_id e scopes
- GET  /api/v1/events?date=YYYY-MM-DD — eventos do dia (inclui virtuais de recorrentes)
- POST /api/v1/events — body JSON: title, start_time (ISO); opcional: end_time, description, is_recurring, recurrence_days (0-6), recurrence_end_date
- PATCH/DELETE /api/v1/events/:id
- GET  /api/v1/tasks
- POST /api/v1/tasks — title; opcional: is_completed, target_date
- PATCH/DELETE /api/v1/tasks/:id
- GET  /api/v1/finance/categories | POST mesmo path para criar
- PATCH/DELETE /api/v1/finance/categories/:id
- GET  /api/v1/finance/transactions?year=YYYY&month=M ou ?from=...&to=... (sem filtro: até 500)
- POST /api/v1/finance/transactions — title, kind (expense|income|investment), amount, occurred_on; opcional: category_id, payment_method, notes, tags, paid
- PATCH/DELETE /api/v1/finance/transactions/:id
- GET  /api/v1/workout — plano ativo + dias + exercícios
- PATCH /api/v1/workout/exercises/:id — opcional: name, sets, reps, rest_seconds, weight_kg, notes, order
- GET /api/v1/settings | PATCH /api/v1/settings — notificações e prefs
- GET /api/v1/diet — por enquanto 501 (não implementado)

Me responda sempre com comandos curl ou fetch que eu possa rodar, usando BASE_URL e assumindo que eu colocarei o token em variável MHUB_TOKEN no shell.
```

---

## Autenticação

Gere o token em **Configurações → API para automação** no site.

```http
Authorization: Bearer mhub_<seu_segredo>
```

O texto completo do token só aparece **uma vez** ao criar a chave. No banco fica só o hash (SHA-256).

---

## Base URL e Vercel

Monte as URLs assim:

```text
https://<seu-dominio-de-producão>/api/v1/...
```

Se o projeto na Vercel tiver **Deployment Protection** em URLs de *preview*, chamadas diretas (Postman, `curl` de outro servidor) podem exigir cookie de login Vercel ou *protection bypass*. Em produção, use o domínio principal configurado no projeto.

---

## Escopos

Cada chave tem uma lista de escopos. Exemplos: `agenda:read`, `agenda:write`, `finance:*`, `*`.

- **`*`** — todas as permissões da API.  
- **`recurso:*`** — leitura e escrita daquele módulo (ex.: `finance:*`).

Se receber **403**, a chave não inclui o escopo necessário — gere outra chave com a permissão ou marque “Acesso total”.

---

## Endpoints (detalhe)

### `GET /api/v1/me`

Retorna `user_id`, `scopes`, `api`, `docs`. Qualquer chave válida basta (não precisa de escopo específico além de autenticar).

### Agenda — eventos

| Método | Rota | Escopo |
|--------|------|--------|
| `GET` | `/api/v1/events?date=YYYY-MM-DD` | `agenda:read` |
| `POST` | `/api/v1/events` | `agenda:write` |
| `PATCH` | `/api/v1/events/:id` | `agenda:write` |
| `DELETE` | `/api/v1/events/:id` | `agenda:write` |

**POST body (JSON):** `title`, `start_time` (ISO 8601); opcional: `end_time`, `description`, `is_recurring`, `recurrence_days` (array 0–6 = dom–sáb), `recurrence_end_date`.

IDs “virtuais” de recorrentes podem aparecer como `uuid_YYYY-MM-DD`; em `PATCH`/`DELETE` o servidor usa o UUID pai.

### Agenda — tarefas

| Método | Rota | Escopo |
|--------|------|--------|
| `GET` | `/api/v1/tasks` | `agenda:read` |
| `POST` | `/api/v1/tasks` | `agenda:write` |
| `PATCH` | `/api/v1/tasks/:id` | `agenda:write` |
| `DELETE` | `/api/v1/tasks/:id` | `agenda:write` |

**POST body:** `title`; opcional: `is_completed`, `target_date` (`YYYY-MM-DD`).

### Financeiro

| Método | Rota | Escopo |
|--------|------|--------|
| `GET` | `/api/v1/finance/categories` | `finance:read` |
| `POST` | `/api/v1/finance/categories` | `finance:write` |
| `PATCH` | `/api/v1/finance/categories/:id` | `finance:write` |
| `DELETE` | `/api/v1/finance/categories/:id` | `finance:write` |
| `GET` | `/api/v1/finance/transactions?year=&month=` ou `from=&to=` ou sem filtro (máx. 500) | `finance:read` |
| `POST` | `/api/v1/finance/transactions` | `finance:write` |
| `PATCH` | `/api/v1/finance/transactions/:id` | `finance:write` |
| `DELETE` | `/api/v1/finance/transactions/:id` | `finance:write` |

**POST transação:** `title`, `kind` (`expense` | `income` | `investment`), `amount`, `occurred_on`; opcional: `category_id`, `payment_method`, `notes`, `tags`, `paid`.

### Treino

| Método | Rota | Escopo |
|--------|------|--------|
| `GET` | `/api/v1/workout` | `workout:read` |
| `PATCH` | `/api/v1/workout/exercises/:id` | `workout:write` |

**PATCH exercício:** opcional: `name`, `sets`, `reps`, `rest_seconds`, `weight_kg`, `notes`, `order`.

### Preferências (`user_settings`)

| Método | Rota | Escopo |
|--------|------|--------|
| `GET` | `/api/v1/settings` | `settings:read` |
| `PATCH` | `/api/v1/settings` | `settings:write` |

**PATCH:** opcional: `notifications_enabled`, `notification_minutes_before`, `allow_multiple_notifications`, `telegram_chat_id`.

### Dieta (reservado)

| Método | Rota | Escopo |
|--------|------|--------|
| `GET` | `/api/v1/diet` | `diet:read` |

Resposta atual: **501** até existir módulo de dieta.

---

## Exemplos curl

```bash
export MHUB_URL="https://seu-dominio.vercel.app"
export MHUB_TOKEN="mhub_..."

curl -s -H "Authorization: Bearer $MHUB_TOKEN" "$MHUB_URL/api/v1/me"

curl -s -H "Authorization: Bearer $MHUB_TOKEN" "$MHUB_URL/api/v1/events?date=2026-05-09"
```

**Windows PowerShell:**

```powershell
$MHUB_URL = "https://seu-dominio.vercel.app"
$MHUB_TOKEN = "mhub_..."
$h = @{ Authorization = "Bearer $MHUB_TOKEN" }
Invoke-RestMethod -Uri "$MHUB_URL/api/v1/me" -Headers $h
```

---

## Erros

| Código | Significado |
|--------|-------------|
| `401` | Sem header ou token inválido/revogado |
| `403` | Token ok mas sem escopo para a rota |
| `503` | `SUPABASE_SERVICE_ROLE_KEY` ausente no servidor |
| `501` | Rota reservada (ex.: dieta) |

Corpo típico: `{ "error": "..." }`.

---

## Requisitos no Supabase / servidor

- Migração SQL `supabase_migrations/20260511_user_api_keys.sql` aplicada no Supabase (tabela `user_api_keys`).  
- Variável **`SUPABASE_SERVICE_ROLE_KEY`** no Vercel (e em `.env.local` no dev) — **sem** prefixo `NEXT_PUBLIC_`.  
- Mais detalhes em `SUPABASE_SETUP.md`.

---

*Última atualização: documentação alinhada à API v1 do repositório MHUB.*
