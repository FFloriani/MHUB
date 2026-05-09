# MHUB API v1

API HTTP para automação (Cursor, Claude Code, scripts). Todas as rotas estão em **`/api/v1/...`**.

## Autenticação

Envie o token gerado em **Configurações → API para automação**:

```http
Authorization: Bearer mhub_<seu_segredo>
```

O segredo completo só aparece **uma vez** ao criar a chave. No banco só existe o hash (SHA-256).

## Requisito de servidor

A validação do Bearer usa a **service role** do Supabase no servidor. Configure:

- `SUPABASE_SERVICE_ROLE_KEY` — no Vercel (Environment Variables) e em `.env.local` em desenvolvimento.
- **Nunca** coloque essa chave no frontend nem em repositório público.

Também é necessário executar a migração SQL `supabase_migrations/20260511_user_api_keys.sql` no projeto Supabase.

## Escopos

Cada chave tem uma lista de escopos (ex.: `agenda:read`, `finance:*`, `*`). O caractere `*` na chave concede tudo. `recurso:*` concede leitura e escrita daquele módulo.

## Base URL

Substitua pela URL do seu deploy (ex.: `https://seu-app.vercel.app`):

```text
https://<seu-dominio>/api/v1
```

---

## Endpoints

### `GET /api/v1/me`

Retorna `user_id`, `scopes` e metadados. Qualquer chave válida basta.

### Agenda — eventos

| Método | Rota | Escopo |
|--------|------|--------|
| `GET` | `/api/v1/events?date=YYYY-MM-DD` | `agenda:read` |
| `POST` | `/api/v1/events` | `agenda:write` |
| `PATCH` | `/api/v1/events/:id` | `agenda:write` |
| `DELETE` | `/api/v1/events/:id` | `agenda:write` |

**POST body (JSON):** `title`, `start_time` (ISO), opcional: `end_time`, `description`, `is_recurring`, `recurrence_days` (array de 0–6), `recurrence_end_date`.

IDs de eventos recorrentes “virtuais” podem vir como `uuid_YYYY-MM-DD`; o servidor normaliza para o UUID pai nas mutações.

### Agenda — tarefas

| Método | Rota | Escopo |
|--------|------|--------|
| `GET` | `/api/v1/tasks` | `agenda:read` |
| `POST` | `/api/v1/tasks` | `agenda:write` |
| `PATCH` | `/api/v1/tasks/:id` | `agenda:write` |
| `DELETE` | `/api/v1/tasks/:id` | `agenda:write` |

**POST body:** `title`, opcional: `is_completed`, `target_date` (`YYYY-MM-DD`).

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

**POST transação:** `title`, `kind` (`expense` | `income` | `investment`), `amount`, `occurred_on`; opcional: `.category_id`, `payment_method`, `notes`, `tags`, `paid`.

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

**PATCH:** campos opcionais `notifications_enabled`, `notification_minutes_before`, `allow_multiple_notifications`, `telegram_chat_id`.

### Dieta (reservado)

| Método | Rota | Escopo |
|--------|------|--------|
| `GET` | `/api/v1/diet` | `diet:read` |

Resposta atual: **501** até o módulo existir.

---

## Exemplo (curl)

```bash
export MHUB_URL="https://seu-app.vercel.app"
export MHUB_TOKEN="mhub_..."

curl -s -H "Authorization: Bearer $MHUB_TOKEN" "$MHUB_URL/api/v1/me"

curl -s -H "Authorization: Bearer $MHUB_TOKEN" "$MHUB_URL/api/v1/events?date=2026-05-09"
```

## Erros

Respostas JSON com `{ "error": "..." }`. Códigos comuns: `401` (token ausente ou inválido), `403` (escopo insuficiente), `503` (service role não configurada no servidor).
