/**
 * EL BANCO DEL GRUPO PEQUEÑO (docs/tactica.md §7.3, paso 0).
 *
 * **Es el único sitio donde la superioridad numérica se puede medir SIN RUIDO.** En un pelotón de
 * 176 corredores, «dos de la misma casa en la fuga» es un suceso que ocurre de vez en cuando y cuyo
 * efecto queda enterrado bajo cien decisiones ajenas. Aquí el escenario se construye a mano: una
 * fuga de tres con una pareja y un suelto, y se cuenta quién gana. Si la pareja no gana más que el
 * azar, la superioridad numérica no existe en el motor, se diga lo que se diga en el diseño.
 *
 * Barato a propósito —de dos a seis corredores por corrida—, así que se puede correr muchas veces y
 * la respuesta no depende del tamaño de muestra.
 *
 * **Lo que este banco mide HOY es el suelo**: `pairEdgePct` sobre el motor del paso 0 debería salir
 * en el **66,7 % del puro azar**, porque la coordinación de equipo dentro de un grupo (R02) no
 * existe todavía. Ése es el número que hace falta tener escrito ANTES de tocar nada: sin él, el
 * 80 % que R02 promete no se puede atribuir a R02.
 */
import { ATTRIBUTES, type Attribute, seededRng } from '@cyclingstar/shared'
import { eff0, initialEnergy } from '../banister.js'
import { matchCount } from '../stage/physics.js'
import { stageSeed } from '../stage/rng.js'
import { simulateStage } from '../stage/simulate.js'
import type { StageOrders, StageProfile, StageRider } from '../stage/types.js'
import { generateNpcRider, sampleNpcAge } from '../world/npc.js'

/** Un escenario del banco: cuántos corredores, repartidos en qué casas. */
export interface Duel {
  id: string
  /** Los equipos, en orden: `[2, 1]` es una pareja y un suelto. */
  casas: number[]
  why: string
}

export const DUELS: readonly Duel[] = [
  { id: 'pareja-vs-suelto', casas: [2, 1], why: 'LA pregunta: ¿vale de algo ser dos de tres?' },
  { id: 'mano-a-mano', casas: [1, 1], why: 'el control: sin superioridad, todo es azar y forma' },
  { id: 'tres-parejas', casas: [2, 2, 2], why: 'seis corredores, tres casas: nadie manda' },
  { id: 'favoritos-sin-peones', casas: [1, 1, 1, 1], why: 'cuatro jefes sin gregarios: R18 puro' },
  { id: 'dos-vs-dos-vs-uno', casas: [2, 2, 1], why: 'el suelto entre dos parejas' },
]

const NEUTRAL: StageOrders = {
  role: 'libre',
  mentality: 'oportunista',
  contestSprints: true,
  contestClimbs: true,
}

/**
 * EL RECORRIDO: los últimos 40 km de una etapa cualquiera, llanos con un repecho.
 *
 * Corto a propósito. Lo que este banco pregunta pasa en el final —quién releva, quién se guarda,
 * quién ataca— y simular 180 km para llegar ahí sería pagar por kilómetros en los que no pasa nada.
 */
const PERFIL: StageProfile = {
  segments: [
    { km: 18, tipo: 'llano' },
    { km: 4, tipo: 'rompepiernas' },
    { km: 18, tipo: 'llano' },
  ],
}

export interface DuelRun {
  duel: Duel
  run: number
  winnerId: string
  winnerTeam: string
  /** ¿Ganó la casa con MÁS corredores en el grupo? `null` si no hay una casa mayoritaria. */
  wonByMajority: boolean | null
}

/** Arma el grupo a mano: mismos atributos de base, distinta casa. */
export function duelSetup(
  duel: Duel,
  run: number,
): {
  input: { profile: StageProfile; riders: StageRider[] }
  seed: string
  teams: Map<string, string>
} {
  const worldSeed = `duelo-${duel.id}-${run}`
  const rng = seededRng(`${worldSeed}:campo`)
  const riders: StageRider[] = []
  const teams = new Map<string, string>()
  duel.casas.forEach((cuantos, t) => {
    for (let k = 0; k < cuantos; k++) {
      const riderId = `d-${t}-${k}`
      const genome = generateNpcRider(`${worldSeed}:${riderId}`, {
        division: 'PRS',
        vocation: 'fondo',
        age: sampleNpcAge(`${worldSeed}:${riderId}:age`, { v2: true }),
        v2: true,
      })
      const ctl = 60 + 15 * rng()
      const atl = 50 + 12 * rng()
      const tsb = ctl - atl
      const eff = {} as Record<Attribute, number>
      for (const a of ATTRIBUTES) eff[a] = eff0(genome.attributes[a], ctl, tsb, 'sano', 60)
      teams.set(riderId, `duelo-equipo-${t}`)
      riders.push({
        riderId,
        eff0: eff,
        energy: initialEnergy(ctl, tsb, 'sano'),
        matches: matchCount(eff, tsb, false),
        tsb,
        orders: NEUTRAL,
        gcDeficitSeconds: 0,
        fragility: genome.hidden.fragility,
        teamId: `duelo-equipo-${t}`,
      })
    }
  })
  return {
    input: { profile: PERFIL, riders },
    seed: stageSeed({
      worldSeed,
      raceId: `duelo-${duel.id}`,
      stageDay: 1,
      engineVersion: 1,
    }),
    teams,
  }
}

export function runDuel(duel: Duel, run: number): DuelRun | null {
  const { input, seed, teams } = duelSetup(duel, run)
  const out = simulateStage(input, seed)
  const ganador = out.results.find((r) => r.estado === 'finish')
  if (ganador === undefined) return null
  const mayor = Math.max(...duel.casas)
  const hayMayoria = duel.casas.filter((c) => c === mayor).length === 1 && mayor > 1
  const suCasa = teams.get(ganador.riderId) ?? '?'
  const indice = duel.casas.findIndex((_, t) => `duelo-equipo-${t}` === suCasa)
  return {
    duel,
    run,
    winnerId: ganador.riderId,
    winnerTeam: suCasa,
    wonByMajority: hayMayoria ? duel.casas[indice] === mayor : null,
  }
}

export interface DuelStats {
  runs: number
  porEscenario: {
    id: string
    runs: number
    /** % de corridas ganadas por la casa mayoritaria. */
    majorityWinPct: number
    /** Lo que daría el PURO AZAR con ese reparto: la referencia contra la que se lee todo. */
    chancePct: number
    /** La diferencia: es «cuánto vale ser más». Cero significa que no vale nada. */
    edgePoints: number
  }[]
  /** `pairEdgePct` de §7.5: la fuga de tres con pareja y suelto, que es LA pregunta. */
  pairEdgePct: number
}

export function analyzeDuels(runsPerDuel: number): DuelStats {
  const filas: {
    id: string
    runs: number
    majorityWinPct: number
    chancePct: number
    edgePoints: number
  }[] = []
  let pair = 0
  for (const duel of DUELS) {
    const corridas: DuelRun[] = []
    for (let i = 0; i < runsPerDuel; i++) {
      const r = runDuel(duel, i)
      if (r !== null) corridas.push(r)
    }
    const conMayoria = corridas.filter((r) => r.wonByMajority !== null)
    const mayor = Math.max(...duel.casas)
    const total = duel.casas.reduce((a, b) => a + b, 0)
    const azar =
      duel.casas.filter((c) => c === mayor).length === 1 && mayor > 1 ? (100 * mayor) / total : 0
    const ganadas = conMayoria.filter((r) => r.wonByMajority === true).length
    const pct = conMayoria.length === 0 ? 0 : (100 * ganadas) / conMayoria.length
    filas.push({
      id: duel.id,
      runs: corridas.length,
      majorityWinPct: pct,
      chancePct: azar,
      edgePoints: azar === 0 ? 0 : pct - azar,
    })
    if (duel.id === 'pareja-vs-suelto') pair = pct
  }
  return { runs: runsPerDuel * DUELS.length, porEscenario: filas, pairEdgePct: pair }
}
