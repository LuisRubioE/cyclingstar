export interface Offer {
  id: string
  teamName: string
  division: string
  role: string
  salary: number
  seasons: number
  releaseClause: number
}

export interface Contract {
  teamName: string
  division: string
  role: string
  salary: number
  endSeason: number
  releaseClause: number
}

export interface Market {
  offers: Offer[]
  contract: Contract | null
}

export async function fetchMarket(): Promise<Market> {
  const res = await fetch('/api/riders/me/offers')
  if (!res.ok) throw new Error('Could not load the market.')
  return (await res.json()) as Market
}

export async function respondToOffer(id: string, action: 'accept' | 'reject'): Promise<void> {
  const res = await fetch(`/api/riders/me/offers/${id}/${action}`, { method: 'POST' })
  if (!res.ok) throw new Error('Could not respond to the offer.')
}

const ROLE_LABEL: Record<string, string> = {
  lider: 'Leader',
  colider: 'Co-leader',
  gregario: 'Domestique',
  libre: 'Free role',
}

export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role
}
