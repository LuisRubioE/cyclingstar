/**
 * IA de convocatorias (SPEC 6.18, 7.2, Paso 35). Dada una carrera y los corredores de un equipo,
 * elige la escuadra ponderando encaje con el recorrido, puntos, forma reciente, deseo del corredor
 * y confianza con el equipo (team_trust), con el sesgo de la filosofía del equipo. Todo puro y
 * determinista: la parte estocástica sale de una semilla, para que el mundo sea reproducible.
 */
import { type Vocation, seededRng } from '@cyclingstar/shared'
import type { StageKind } from '../routes/testTour.js'

export type TeamPhilosophy = 'general' | 'sprints' | 'clasicas' | 'cantera' | 'equilibrado'

export interface CallupCandidate {
  riderId: string
  archetype: Vocation
  /** Puntos de la temporada (regularidad, victorias). */
  pointsSeason: number
  /** Forma reciente en estrellas [0,5] (SPEC 3.2). */
  formStars: number
  /** El corredor marcó esta carrera como objetivo (rider_race_prefs). */
  desire: boolean
  /** Confianza con el equipo [0,100] (SPEC 6.18). */
  teamTrust: number
  /** Menor de ~23 años: pesa para la filosofía de cantera. */
  young: boolean
}

/** Afinidad de cada tipo de etapa con cada vocación (cuánto luce ese perfil a ese corredor). */
const KIND_AFFINITY: Record<StageKind, Partial<Record<Vocation, number>>> = {
  llana: { velocidad: 1, fondo: 0.4, crono: 0.3, clasicas: 0.2, escalada: 0.1 },
  media: { clasicas: 0.8, fondo: 0.7, escalada: 0.6, velocidad: 0.3, crono: 0.3 },
  reina: { escalada: 1, fondo: 0.7, clasicas: 0.3, crono: 0.2, velocidad: 0.1 },
  cri: { crono: 1, fondo: 0.5, escalada: 0.4, clasicas: 0.4, velocidad: 0.3 },
  clasica: { clasicas: 1, fondo: 0.5, velocidad: 0.4, escalada: 0.3, crono: 0.3 },
}

/** Encaje medio de cada vocación con el recorrido de la carrera (promedio sobre sus etapas). */
export function raceVocationFit(stageKinds: StageKind[]): Record<Vocation, number> {
  const totals: Record<Vocation, number> = {
    escalada: 0,
    velocidad: 0,
    clasicas: 0,
    crono: 0,
    fondo: 0,
  }
  if (stageKinds.length === 0) return totals
  for (const kind of stageKinds) {
    const aff = KIND_AFFINITY[kind]
    for (const voc of Object.keys(totals) as Vocation[]) {
      totals[voc] += aff[voc] ?? 0
    }
  }
  for (const voc of Object.keys(totals) as Vocation[]) totals[voc] /= stageKinds.length
  return totals
}

// Pesos del score de convocatoria (SPEC 6.18). Suman a un orden de magnitud comparable.
const W_FIT = 1.0
const W_POINTS = 0.8
const W_FORM = 0.6
const W_DESIRE = 0.5
const W_TRUST = 0.4
const POINTS_NORM = 400 // puntos que saturan la contribución de regularidad
const PHILOSOPHY_BONUS = 0.6

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

/** Sesgo de la filosofía del equipo sobre un corredor (SPEC 7.2). */
function philosophyBonus(philosophy: TeamPhilosophy, c: CallupCandidate, fit: number): number {
  switch (philosophy) {
    case 'sprints':
      return c.archetype === 'velocidad' ? PHILOSOPHY_BONUS : 0
    case 'clasicas':
      return c.archetype === 'clasicas' ? PHILOSOPHY_BONUS : 0
    case 'cantera':
      return c.young ? PHILOSOPHY_BONUS : 0
    case 'general':
      // Favorece a los corredores que mejor encajan con la carrera (líderes de la escuadra).
      return fit * PHILOSOPHY_BONUS
    case 'equilibrado':
      return 0
  }
}

/** Score de convocatoria de un corredor para una carrera (mayor = más probable). */
export function callupScore(
  c: CallupCandidate,
  raceFit: Record<Vocation, number>,
  philosophy: TeamPhilosophy,
): number {
  const fit = raceFit[c.archetype]
  return (
    W_FIT * fit +
    W_POINTS * clamp01(c.pointsSeason / POINTS_NORM) +
    W_FORM * (c.formStars / 5) +
    W_DESIRE * (c.desire ? 1 : 0) +
    W_TRUST * (c.teamTrust / 100) +
    philosophyBonus(philosophy, c, fit)
  )
}

export interface SquadSelection {
  /** Corredores convocados, en orden de convocatoria. */
  squad: string[]
  /** Score de cada candidato (para depurar y para la UI). */
  scores: { riderId: string; score: number }[]
}

/**
 * Elige `size` corredores del equipo por muestreo ponderado sin reemplazo: el peso crece con el
 * score, así que los mejores encajes entran casi siempre pero queda margen para la sorpresa. La
 * semilla hace la selección reproducible.
 */
export function selectSquad(
  candidates: CallupCandidate[],
  opts: {
    raceFit: Record<Vocation, number>
    philosophy: TeamPhilosophy
    size: number
    seed: string
  },
): SquadSelection {
  const scores = candidates.map((c) => ({
    riderId: c.riderId,
    score: callupScore(c, opts.raceFit, opts.philosophy),
  }))
  const rng = seededRng(`callup:${opts.seed}`)

  // Muestreo ponderado sin reemplazo. Peso = exp(gamma * score): monótono y siempre positivo.
  const GAMMA = 2.5
  const pool = scores.map((s) => ({ riderId: s.riderId, weight: Math.exp(GAMMA * s.score) }))
  const squad: string[] = []
  const size = Math.min(opts.size, pool.length)
  for (let n = 0; n < size; n++) {
    let total = 0
    for (const p of pool) total += p.weight
    if (total <= 0) break
    let r = rng() * total
    let idx = 0
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i]!.weight
      if (r <= 0) {
        idx = i
        break
      }
    }
    squad.push(pool[idx]!.riderId)
    pool.splice(idx, 1)
  }

  return { squad, scores: scores.sort((a, b) => b.score - a.score) }
}
