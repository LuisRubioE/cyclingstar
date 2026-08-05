export interface LedgerEntry {
  gameDay: number
  kind: string
  amount: number
  note: string
}

export interface Ledger {
  balance: number
  entries: LedgerEntry[]
  /** Día de juego actual del mundo (para calcular el próximo día de pago). Null si no hay mundo/ciclista. */
  gameDay: number | null
  /** Salario semanal del contrato vigente, o null si el corredor no tiene contrato. */
  salary: number | null
}

export async function fetchLedger(): Promise<Ledger> {
  const res = await fetch('/api/riders/me/ledger')
  if (!res.ok) throw new Error('Could not load your finances.')
  return (await res.json()) as Ledger
}

const KIND_LABEL: Record<string, string> = {
  salario: 'Salary',
  premio: 'Prize',
  staff: 'Staff',
  patrocinador: 'Sponsor',
  viaje: 'Travel',
  vivienda: 'Housing',
  otro: 'Other',
}

export function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? kind
}

export function money(n: number): string {
  const sign = n < 0 ? '−' : n > 0 ? '+' : ''
  return `${sign}${Math.abs(n).toLocaleString('en-US')}`
}
