/**
 * EL BANCO DE CONTRARRELOJES REALES (v19, docs/balance.md «v19 — El abanico de la contrarreloj»).
 *
 * Es a la crono lo que `sim/realQueens.ts` es a la etapa reina, y nace de la misma lección: el
 * invariante que existía —`timeTrial.p90MinusP10Seconds` sobre `cri-40`, 40 corredores de crono
 * correcto en 40 km de laboratorio— estaba **en verde** mientras producción repartía en
 * `race-colombia` e3 una cola del **46,4 %** del primero al último, y en `nc-co-itt` del 41,2 %. No
 * es que midiera mal: es que medía la brecha CENTRAL de un campo estrecho, y el defecto vivía en la
 * cola de un campo ancho.
 *
 * El banco corre las cronos REALES del calendario, elegidas por FORMA —el largo del recorrido y el
 * nivel del campo—, con las dos de producción dentro por nombre.
 *
 * **EL CAMPO ES DE LA DIVISIÓN DE LA CARRERA, Y NO ES UN DETALLE.** `sim/realQueens.ts` monta las
 * carreras continentales con tres equipos invitados de categoría superior, y para una etapa reina
 * eso es lo que se ve; para medir la COLA de una crono, no: mete en el pelotón a un especialista
 * WorldTour de perfil 92 que en la Race Colombia de producción no existe —el mejor tiempo real
 * corresponde a un perfil de 70—. Medido, ese invitado solo empuja la cola del 13 % al 18 %, así que
 * el banco se corre con el campo que la carrera tiene de verdad: continental en las continentales,
 * WorldTour en las WorldTour. Contrastado contra los tiempos de producción en docs/balance.md.
 *
 * Puro y determinista: todo sale de `seededRng` y de `stageSeed`.
 */
import { ATTRIBUTES, type Attribute, type Vocation, seededRng } from '@cyclingstar/shared'
import { eff0, initialEnergy } from '../banister.js'
import { SEASON_CALENDAR } from '../routes/calendar.js'
import { matchCount } from '../stage/physics.js'
import { stageSeed } from '../stage/rng.js'
import { simulateStage } from '../stage/simulate.js'
import type { StageOrders, StageRider } from '../stage/types.js'
import { autoStageOrders } from '../world/autoOrders.js'
import { type Division, generateNpcRider, sampleNpcAge } from '../world/npc.js'

/** Una crono del banco: la carrera, la etapa y por qué está aquí. */
export interface RealTimeTrial {
  raceId: string
  stageIndex: number
  /** Qué FORMA de contrarreloj cubre. Es el criterio de selección, y por eso se escribe. */
  why: string
  /**
   * Un CAMPEONATO NACIONAL no lleva equipos: corre un puñado de corredores de un solo país y se
   * numera 1..N por fama (`calendarRun.ts::assignBibs`), así que el dorsal 1 es el mejor. Cambia el
   * tamaño del campo —40 en producción, no 133— y con él los alcances.
   */
  championship?: boolean
}

/**
 * Las cronos del banco. Lista CERRADA, por la misma razón que la de las reinas reales: un banco que
 * se recalcule solo dejaría de ser comparable entre versiones del motor.
 */
export const REAL_TIME_TRIALS: readonly RealTimeTrial[] = [
  {
    raceId: 'race-colombia',
    stageIndex: 3,
    why: 'LA CRONO DE PRODUCCIÓN: 33 km llanos, 130 corredores continentales y una general que invertir. Repartía una cola del 46,4 % y 65 alcances.',
  },
  {
    raceId: 'nc-co-itt',
    stageIndex: 1,
    why: 'La otra de producción: campeonato nacional de un día, 38 km, campo pequeño y rampa por dorsales (sin general que invertir).',
    championship: true,
  },
  {
    raceId: 'race-italy',
    stageIndex: 10,
    why: 'La crono más larga de una gran vuelta: 42 km y campo WorldTour. El campo de gran vuelta tiene que llegar MÁS apretado que el continental.',
  },
  {
    raceId: 'race-spain',
    stageIndex: 18,
    why: 'La misma distancia que la de Colombia (33 km) con campo WorldTour: aísla el efecto del NIVEL del campo del efecto del recorrido.',
  },
  {
    raceId: 'race-chrono',
    stageIndex: 1,
    why: 'La crono más larga del calendario (45 km, un día): es donde la erosión tiene más recorrido para ensanchar la cola por su cuenta.',
  },
]

const VOCATIONS: Vocation[] = ['escalada', 'velocidad', 'clasicas', 'crono', 'fondo']

const NEUTRAL_ORDERS: StageOrders = {
  role: 'libre',
  mentality: 'reservon',
  contestSprints: false,
  contestClimbs: false,
}

/** Cuántos equipos y de qué división corre una carrera de este nivel (ver la cabecera). */
function fieldFor(level: string): { teams: number; per: number; division: Division } {
  if (level === 'WT') return { teams: 22, per: 8, division: 'WT' }
  if (level === 'PRS') return { teams: 20, per: 7, division: 'PRS' }
  return { teams: 19, per: 7, division: 'CON' }
}

interface BenchRider {
  riderId: string
  teamId: string
  bib: number
  attrs: Record<Attribute, number>
  ctl: number
  atl: number
  morale: number
}

/** El pelotón de una crono de este nivel, con dorsales por bloques de equipo como en producción. */
function buildField(worldSeed: string, level: string, championship = false): BenchRider[] {
  const rng = seededRng(`${worldSeed}:tt-field`)
  // Un campeonato nacional no lleva equipos: 40 corredores de un país, numerados 1..N por fama.
  const { teams, per, division } = championship
    ? { teams: 1, per: 40, division: 'CON' as Division }
    : fieldFor(level)
  const field: BenchRider[] = []
  for (let t = 0; t < teams; t++) {
    for (let k = 0; k < per; k++) {
      const riderId = `tt-${t}-${k}`
      const vocation = VOCATIONS[Math.floor(rng() * VOCATIONS.length)]!
      const age = sampleNpcAge(`${worldSeed}:${riderId}:age`)
      const genome = generateNpcRider(`${worldSeed}:${riderId}`, { division, vocation, age })
      field.push({
        riderId,
        teamId: championship ? `tt-nation` : `tt-team-${t}`,
        // Dorsales por bloques de decena, con el x1 para el jefe de filas: es como los reparte
        // producción (`packages/db/src/calendarRun.ts::assignBibs`) y es lo que ordena la rampa
        // cuando no hay general. En un campeonato se numera 1..N corrido, por fama.
        bib: championship ? k + 1 : (t + 1) * 10 + k + 1,
        attrs: genome.attributes,
        ctl: 55 + 25 * rng(),
        atl: 45 + 20 * rng(),
        morale: 55 + 20 * rng(),
      })
    }
  }
  return field
}

/** Cómo llegó una crono: la cola es el criterio, lo demás es contexto. */
export interface TimeTrialTail {
  kind: string
  km: number
  riders: number
  /** Retraso del ÚLTIMO respecto al ganador, en % de su tiempo. El número de esta tanda. */
  tailPct: number
  /** Retraso de la MEDIANA del campo, en % del ganador. */
  medianPct: number
  /** Brecha p90-p10 del campo, en segundos (la medida vieja, sobre un campo real). */
  p90MinusP10Seconds: number
  /** Velocidad media del ganador y del último, en km/h: la prueba de credibilidad. */
  winnerKmh: number
  lastKmh: number
  /** Alcances de la jornada (`tt_catches`), que es lo que la cola produce en la carretera. */
  catches: number
}

/**
 * Corre una crono del banco con una semilla.
 *
 * **La general de la rampa.** Una crono que es etapa de una vuelta sale en orden inverso de la
 * general, así que el banco necesita una: se reparte por MON con los empates que produce una etapa
 * llana, que es lo que hay en producción (tras la e2 de Race Colombia, 58 corredores a un tiempo y
 * 54 a otro). Va por MON a propósito —un campo real no está ordenado igual en la general que contra
 * el reloj— y no toca ni un tiempo: la rampa solo mueve los ALCANCES (v18 §4).
 */
export function runRealTimeTrial(tt: RealTimeTrial, run: number): TimeTrialTail {
  const race = SEASON_CALENDAR.find((r) => r.id === tt.raceId)
  if (!race) throw new Error(`Banco de cronos: no existe ${tt.raceId}`)
  const stage = race.stages.find((s) => s.index === tt.stageIndex)
  if (!stage) throw new Error(`Banco de cronos: ${tt.raceId} no tiene etapa ${tt.stageIndex}`)
  if (stage.timeTrial !== true)
    throw new Error(`Banco de cronos: ${tt.raceId} e${tt.stageIndex} no es crono`)

  const worldSeed = `crono-real-${tt.raceId}-${run}`
  const field = buildField(worldSeed, race.level, tt.championship === true)
  // ¿Hay general que invertir? Solo si la crono es una etapa de una vuelta que no es la primera.
  const hasGc = race.stages.length > 1 && tt.stageIndex > 1
  const byClimb = [...field].sort((a, b) => b.attrs.MON - a.attrs.MON)
  const gcOf = new Map<string, { rank: number; deficit: number }>()
  byClimb.forEach((r, i) => {
    // Tres bloques de tiempo, como los deja una vuelta que empieza con etapas llanas: el líder, un
    // grupo de cabeza con diferencias y dos grandes bolsas de empatados.
    const deficit = i === 0 ? 0 : i < 12 ? 30 * i : i < byClimb.length / 2 ? 600 : 900
    gcOf.set(r.riderId, { rank: i + 1, deficit })
  })

  const orders = autoStageOrders(
    field.map((r) => ({ riderId: r.riderId, attrs: r.attrs, teamId: r.teamId })),
    { kind: stage.kind, timeTrial: true },
  )
  const riders: StageRider[] = field.map((r) => {
    const tsb = r.ctl - r.atl
    const eff = {} as Record<Attribute, number>
    for (const a of ATTRIBUTES) eff[a] = eff0(r.attrs[a], r.ctl, tsb, 'sano', r.morale)
    const gc = hasGc ? gcOf.get(r.riderId) : undefined
    return {
      riderId: r.riderId,
      eff0: eff,
      energy: initialEnergy(r.ctl, tsb, 'sano'),
      matches: matchCount(eff, tsb, false),
      tsb,
      orders: orders.get(r.riderId) ?? NEUTRAL_ORDERS,
      gcDeficitSeconds: gc?.deficit ?? 0,
      gcRank: gc?.rank ?? null,
      bib: r.bib,
      teamId: r.teamId,
    }
  })

  const out = simulateStage(
    { profile: stage.profile, riders, timeTrial: true },
    // `engineVersion: 1` FIJO en la semilla, como el resto del banco: el objetivo mide el
    // comportamiento del motor, no los dados.
    stageSeed({ worldSeed, raceId: tt.raceId, stageDay: tt.stageIndex, engineVersion: 1 }),
  )
  const times = out.results.map((r) => r.tiempoS).sort((a, b) => a - b)
  const winner = times[0] ?? 0
  if (winner <= 0)
    throw new Error(`Banco de cronos: ${tt.raceId} e${tt.stageIndex} sin clasificados`)
  const last = times[times.length - 1]!
  const at = (p: number): number => times[Math.min(times.length - 1, Math.floor(times.length * p))]!
  const km = stage.profile.segments.reduce((sum, seg) => sum + seg.km, 0)
  const catches = out.events.find((e) => e.plantilla === 'tt_catches')?.datos?.count ?? 0
  return {
    kind: `${tt.raceId} e${tt.stageIndex}`,
    km,
    riders: times.length,
    tailPct: (100 * (last - winner)) / winner,
    medianPct: (100 * (at(0.5) - winner)) / winner,
    p90MinusP10Seconds: at(0.9) - at(0.1),
    winnerKmh: km / (winner / 3600),
    lastKmh: km / (last / 3600),
    catches: typeof catches === 'number' ? catches : 0,
  }
}

/** El resumen de una crono del banco sobre varias semillas. */
export interface TimeTrialStats {
  runs: number
  km: number
  riders: number
  medianTailPct: number
  maxTailPct: number
  medianWinnerKmh: number
  medianLastKmh: number
  medianCatches: number
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)] ?? 0
}

function summarize(rows: TimeTrialTail[]): TimeTrialStats {
  return {
    runs: rows.length,
    km: rows[0]?.km ?? 0,
    riders: rows[0]?.riders ?? 0,
    medianTailPct: median(rows.map((r) => r.tailPct)),
    maxTailPct: Math.max(...rows.map((r) => r.tailPct)),
    medianWinnerKmh: median(rows.map((r) => r.winnerKmh)),
    medianLastKmh: median(rows.map((r) => r.lastKmh)),
    medianCatches: median(rows.map((r) => r.catches)),
  }
}

export interface RealTimeTrialStats {
  runsPerStage: number
  perStage: { tt: RealTimeTrial; stats: TimeTrialStats }[]
  /** El banco entero junto: es sobre esto sobre lo que se mide el objetivo. */
  all: TimeTrialStats
  /** La crono con la cola mediana más ancha: el peor caso del calendario. */
  worst: { tt: RealTimeTrial; medianTailPct: number }
}

/** Corre el banco entero: cada crono con N semillas deterministas. */
export function analyzeRealTimeTrials(runsPerStage: number): RealTimeTrialStats {
  const perStage: { tt: RealTimeTrial; stats: TimeTrialStats }[] = []
  const all: TimeTrialTail[] = []
  for (const tt of REAL_TIME_TRIALS) {
    const rows: TimeTrialTail[] = []
    for (let i = 0; i < runsPerStage; i++) rows.push(runRealTimeTrial(tt, i))
    all.push(...rows)
    perStage.push({ tt, stats: summarize(rows) })
  }
  const worst = perStage.reduce((mx, row) =>
    row.stats.medianTailPct > mx.stats.medianTailPct ? row : mx,
  )
  return {
    runsPerStage,
    perStage,
    all: summarize(all),
    worst: { tt: worst.tt, medianTailPct: worst.stats.medianTailPct },
  }
}
