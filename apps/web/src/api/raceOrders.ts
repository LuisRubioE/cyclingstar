export type StageRole =
  'lider' | 'sprinter' | 'lanzador' | 'gregario' | 'cazaetapas' | 'marcador' | 'libre'
export type Mentality = 'reservon' | 'oportunista' | 'combativo' | 'supercombativo'
export type Effort = 'ahorrar' | 'normal' | 'a_tope'

export interface StageOrder {
  stageDay: number
  role: StageRole
  targetRiderId: string | null
  mentality: Mentality
  effort: Effort
  triggerKm: number | null
  contestSprints: boolean
  contestClimbs: boolean
}

export interface RaceStage {
  day: number
  name: string
  kind: 'llana' | 'media' | 'reina' | 'cri'
  timeTrial: boolean
  km: number
  altimetry: string
}

export interface RosterRider {
  id: string
  name: string
}

export interface TestTour {
  stages: RaceStage[]
  orders: StageOrder[]
  roster: RosterRider[]
}

export async function fetchTestTour(): Promise<TestTour> {
  const res = await fetch('/api/races/test-tour')
  if (!res.ok) throw new Error('Could not load the race.')
  return (await res.json()) as TestTour
}

export async function saveStageOrders(orders: StageOrder[]): Promise<void> {
  const res = await fetch('/api/races/test-tour/orders', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orders }),
  })
  if (!res.ok) throw new Error('Could not save your orders.')
}
