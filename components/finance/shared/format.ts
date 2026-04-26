export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

export function formatCurrencyCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}k`
  return formatCurrency(value)
}

export function parseCurrency(input: string): number {
  if (!input) return 0
  const cleaned = input
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function monthLabel(month: number, short = false): string {
  const idx = Math.min(Math.max(month - 1, 0), 11)
  return short ? MONTHS_SHORT[idx] : MONTHS[idx]
}

export function isoToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function formatDateShort(iso: string): string {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}
