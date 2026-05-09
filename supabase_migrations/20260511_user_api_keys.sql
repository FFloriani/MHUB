-- Chaves de API pessoais para automação (Cursor, Claude Code, scripts).
-- A verificação do token ocorre no servidor com SUPABASE_SERVICE_ROLE_KEY.

create table if not exists public.user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'API Key',
  token_prefix text not null,
  key_hash text not null,
  scopes text[] not null default array['*']::text[],
  created_at timestamptz not null default timezone('utc'::text, now()),
  last_used_at timestamptz,
  revoked_at timestamptz,
  constraint user_api_keys_key_hash_unique unique (key_hash)
);

create index if not exists user_api_keys_key_hash_active_idx
  on public.user_api_keys (key_hash)
  where revoked_at is null;

create index if not exists user_api_keys_user_id_idx
  on public.user_api_keys (user_id);

alter table public.user_api_keys enable row level security;

create policy "Users select own api keys"
  on public.user_api_keys for select
  using (auth.uid() = user_id);

create policy "Users insert own api keys"
  on public.user_api_keys for insert
  with check (auth.uid() = user_id);

create policy "Users update own api keys"
  on public.user_api_keys for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own api keys"
  on public.user_api_keys for delete
  using (auth.uid() = user_id);
