/**
 * 1) Apaga TODA a dieta do usuário via API v1 (backup → DELETE refeições).
 * 2) Cria o plano recorrente seg–sáb (sem domingo).
 *
 * Coloque no .env.local (ou no ambiente):
 *   MHUB_URL=https://mhub-chi.vercel.app   — URL pública do app, sem barra no final
 *   MHUB_TOKEN=mhub_...                     — Configurações → Chaves de API
 *   MHUB_REF_DATE=2026-05-11                — opcional (seg–sáb para validar POST /diet)
 *
 * Só sem MHUB_URL: usa `npx vercel curl` se o projeto estiver linkado (deploy com proteção).
 *
 *   npm run seed:diet-seg-sab
 */

import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

function loadEnvLocal() {
  const p = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(p)) return {}
  const raw = fs.readFileSync(p, 'utf8')
  const out = {}
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

const envFile = loadEnvLocal()
const BASE = (process.env.MHUB_URL || envFile.MHUB_URL || '').replace(/\/$/, '')
const TOKEN = (process.env.MHUB_TOKEN || envFile.MHUB_TOKEN || '').trim()
const REF_DATE = process.env.MHUB_REF_DATE || '2026-05-11'
const useVercelCurl =
  !BASE && process.env.MHUB_VERCEL_CLI !== '0' && process.env.MHUB_VERCEL_CLI !== 'false'

const RECURRENCE_DAYS = [1, 2, 3, 4, 5, 6]

const MEALS = [
  {
    title: 'Café da Manhã',
    meal_time: '07:30',
    sort_order: 0,
    entries: [
      ['Ovos inteiros mexidos', '4 unidades', 280, 26, 2, 20],
      ['Aveia em flocos cozida', '50 g (peso seco)', 190, 7, 33, 4],
      ['Banana', '1 unidade média', 100, 1, 22, 0],
      ['Pasta de amendoim integral', '1 colher de sopa (~15 g)', 90, 4, 3, 7],
      ['Café preto sem açúcar', '1 xícara', 0, 0, 0, 0],
    ],
  },
  {
    title: 'Pós-treino',
    meal_time: '10:40',
    sort_order: 1,
    entries: [
      ['Peito de frango grelhado', '200 g', 330, 58, 0, 7],
      ['Arroz branco cozido', '100 g (cozido)', 130, 4, 28, 0],
      ['Creatina monohidratada', '5 g (1 scoop)', 0, 0, 0, 0],
    ],
  },
  {
    title: 'Almoço',
    meal_time: '13:30',
    sort_order: 2,
    entries: [
      ['Frango / carne magra / fígado (alternar)', '150 g', 270, 45, 0, 12],
      ['Arroz branco cozido', '100 g (cozido)', 130, 3, 28, 0],
      ['Feijão cozido', '100 g (cozido)', 120, 8, 20, 1],
      [
        'Salada mista',
        'alface, tomate, repolho, pepino, cenoura — à vontade',
        25,
        2,
        4,
        0,
      ],
      ['Azeite extra-virgem na salada', '1 colher de sopa (~10 ml)', 90, 0, 0, 10],
      ['Ômega 3', '1 cápsula', 15, 0, 0, 1],
    ],
  },
  {
    title: 'Lanche',
    meal_time: '16:30',
    sort_order: 3,
    entries: [
      ['Sardinha em lata (escorrida)', '2 latas', 220, 30, 0, 10],
      ['Banana', '1 unidade', 100, 1, 25, 1],
    ],
  },
  {
    title: 'Jantar',
    meal_time: '19:30',
    sort_order: 4,
    entries: [
      ['Ovos mexidos OU frango grelhado', '6 ovos OU 150 g frango', 410, 40, 2, 24],
      ['Batata inglesa cozida', '1 unidade média (~150 g)', 115, 3, 26, 0],
      ['Salada com vinagrete', 'à vontade', 75, 2, 12, 6],
    ],
  },
]

function noWipe() {
  return process.argv.includes('--no-wipe')
}

/** Extrai o primeiro objeto JSON completo (chaves balanceadas) de uma string ruidosa. */
function parseJsonObjectLoose(s) {
  const start = s.indexOf('{')
  if (start === -1) throw new Error('Sem objeto JSON na saída')
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (esc) {
      esc = false
      continue
    }
    if (inStr) {
      if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') {
      inStr = true
      continue
    }
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) {
        return JSON.parse(s.slice(start, i + 1))
      }
    }
  }
  throw new Error('JSON truncado ou inválido na saída')
}

/** API em produção via `npx vercel curl` (bypass de proteção do deployment). */
function apiVercel(pathname, { method = 'GET', body } = {}) {
  const args = ['vercel', 'curl', pathname, '--', '--silent', '--show-error']
  args.push('--header', `Authorization: Bearer ${TOKEN}`)
  if (method !== 'GET') {
    args.push('--request', method)
  }
  if (body !== undefined) {
    args.push('--header', 'Content-Type: application/json')
    args.push('--data', JSON.stringify(body))
  }
  const r = spawnSync('npx', args, {
    cwd: ROOT,
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
    env: { ...process.env, CI: '1' },
  })
  const errText = (r.stderr || '').trim()
  if (r.error) throw r.error
  const raw = (r.stdout || '').trim()
  let j
  try {
    j = parseJsonObjectLoose(raw || errText)
  } catch (e) {
    throw new Error(
      `${method} ${pathname}: ${e.message}. stderr: ${errText.slice(0, 200)}`,
    )
  }
  if (j && typeof j.error === 'string' && r.status !== 0) {
    throw new Error(`${method} ${pathname} → ${JSON.stringify(j)}`)
  }
  if (r.status !== 0 && (pathname.includes('/diet') || pathname.includes('/backup'))) {
    if (j && j.error) throw new Error(`${method} ${pathname} → ${JSON.stringify(j)}`)
    throw new Error(`${method} ${pathname} vercel curl exit ${r.status}`)
  }
  return j
}

async function apiFetch(pathname, { method = 'GET', body } = {}) {
  const r = await fetch(`${BASE}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) {
    throw new Error(`${method} ${pathname} → ${r.status}: ${JSON.stringify(j)}`)
  }
  return j
}

async function api(pathname, opts) {
  if (useVercelCurl) {
    return apiVercel(pathname, opts)
  }
  return apiFetch(pathname, opts)
}

async function wipeDietViaApi() {
  const backup = await api('/api/v1/backup')
  const diet = backup?.data?.diet
  const slots = diet?.meal_slots
  if (!Array.isArray(slots) || slots.length === 0) {
    console.error('(nenhuma refeição para apagar)')
    return
  }
  for (const s of slots) {
    await api(`/api/v1/diet/meals/${s.id}`, { method: 'DELETE' })
    console.error(`− refeição removida ${s.title || s.id}`)
  }
}

async function seedMeals() {
  for (const m of MEALS) {
    const slot = await api('/api/v1/diet/meals', {
      method: 'POST',
      body: {
        title: m.title,
        meal_time: m.meal_time,
        sort_order: m.sort_order,
        recurrence_days: RECURRENCE_DAYS,
      },
    })

    let i = 0
    for (const [name, quantity_text, calories, protein_g, carbs_g, fat_g] of m.entries) {
      await api('/api/v1/diet', {
        method: 'POST',
        body: {
          meal_slot_id: slot.id,
          logged_date: REF_DATE,
          name,
          quantity_text,
          calories,
          protein_g,
          carbs_g,
          fat_g,
          sort_order: i,
        },
      })
      i += 1
    }

    console.error(`+ ${m.title} (${m.entries.length} itens) slot=${slot.id}`)
  }
}

async function main() {
  if (!TOKEN) {
    console.error('Defina MHUB_TOKEN (Configurações → Chaves de API) no ambiente ou em .env.local')
    process.exit(1)
  }
  if (!BASE && !useVercelCurl) {
    console.error(
      'Sem MHUB_URL: defina MHUB_URL ou deixe vercel curl ativo (remova MHUB_VERCEL_CLI=0). Projeto deve estar linkado (`vercel link`).',
    )
    process.exit(1)
  }

  console.error(
    `Alvo: ${useVercelCurl ? 'produção (npx vercel curl)' : BASE} | ref_date: ${REF_DATE} | dias: ${RECURRENCE_DAYS.join(',')}`,
  )

  if (!noWipe()) {
    await wipeDietViaApi()
  } else {
    console.error('(—no-wipe: não apagou dieta existente)')
  }

  await seedMeals()
  console.error('Pronto.')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
