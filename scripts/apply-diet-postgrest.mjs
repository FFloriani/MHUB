/**
 * Aplica supabase_migrations/20260514_ensure_diet_meal_slots_postgrest.sql
 * usando a connection string do Postgres (Supabase).
 *
 * 1) Supabase → Project Settings → Database → Connection string → URI
 * 2) Coloque em .env.local na raiz do MHUB:
 *    DATABASE_URL=postgresql://postgres.[ref]:[SENHA]@...pooler.supabase.com:6543/postgres
 *
 * 3) Na pasta do projeto:
 *    npm run db:apply-diet-postgrest
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import pg from 'pg'

function loadEnvLocal() {
  const p = resolve(process.cwd(), '.env.local')
  if (!existsSync(p)) return
  const text = readFileSync(p, 'utf8')
  for (const line of text.split(/\n')) {
    const s = line.trim()
    if (!s || s.startsWith('#')) continue
    const eq = s.indexOf('=')
    if (eq === -1) continue
    const k = s.slice(0, eq).trim()
    let v = s.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (process.env[k] === undefined) process.env[k] = v
  }
}

loadEnvLocal()

const url = process.env.DATABASE_URL?.trim()
if (!url) {
  console.error('Defina DATABASE_URL no .env.local (URI do Postgres no painel Supabase).')
  process.exit(1)
}

const migrationPath = resolve(
  process.cwd(),
  'supabase_migrations/20260514_ensure_diet_meal_slots_postgrest.sql',
)
const sql = readFileSync(migrationPath, 'utf8')

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
})

try {
  await client.connect()
  await client.query(sql)
  console.log('OK: migração aplicada + PostgREST recarregado (NOTIFY pgrst).')
} catch (e) {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
} finally {
  await client.end().catch(() => {})
}
