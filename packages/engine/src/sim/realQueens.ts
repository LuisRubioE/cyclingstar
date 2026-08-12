/**
 * EL BANCO DE ETAPAS REINA REALES (v17, docs/motor.md §9). La cobertura que le faltaba a la
 * batería, y la lección de la regresión que esta tanda corrige.
 *
 * `grandTour.queenLastGroupPct` (v16) mide la cola de la carrera sobre las siete etapas reina de UNA
 * gran vuelta —siempre la misma, `race-france`—, y ese invariante estaba en verde mientras Race
 * Colombia e5 metía a 126 de 130 corredores a más de 74 minutos en producción. No es que el
 * invariante estuviera mal: es que **ninguna etapa de la gran vuelta tiene esa forma**. La reina
 * canónica de Francia es un final en alto de 170-185 km; la de Colombia son 232 km con el último
 * puerto a 62 km de meta y **47 km de terreno rodador hasta la línea**, que es exactamente el
 * recorrido donde un pelotón resignado se descuelga sin remedio.
 *
 * Este banco corre etapas reina REALES del calendario, elegidas por FORMA y no por prestigio:
 * finales en alto y finales rodados, de 128 a 232 km, del WorldTour al continental, y con el caso
 * de la regresión —`race-colombia` e5— dentro por nombre. Cada una con un campo generado del nivel
 * que le corresponde, porque una carrera continental no la corre el pelotón del Tour.
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
import { type StageTail, type TailStats, tailStats } from './grandTour.js'

/** Una etapa del banco: la carrera, la etapa y por qué está aquí. */
export interface RealQueen {
  raceId: string
  stageIndex: number
  /** Qué FORMA de etapa reina cubre. Es el criterio de selección, y por eso se escribe. */
  why: string
}

/**
 * Las etapas del banco. Se eligen por forma, no por cartel, y la lista es CERRADA a propósito: un
 * banco que se recalcule solo («las diez reinas con más desnivel») cambiaría de contenido cada vez
 * que se toque un recorrido y dejaría de ser comparable entre versiones.
 */
export const REAL_QUEENS: readonly RealQueen[] = [
  {
    raceId: 'race-colombia',
    stageIndex: 5,
    why: 'LA REGRESIÓN DE LA v16: 232 km, el último puerto a 62 km de meta y 47 km rodadores hasta la línea. En producción metió a 126 de 130 a más de 74 minutos y ningún invariante se enteró.',
  },
  {
    raceId: 'race-two-seas',
    stageIndex: 4,
    why: 'La otra reina de final rodado, en WorldTour: 210 km y solo 7,8 km de subida en los últimos 50.',
  },
  {
    raceId: 'race-spain',
    stageIndex: 7,
    why: 'Reina de gran vuelta con la meta en llano (3 km de subida en los últimos 50): el caso en el que la cola NO la explica el puerto final.',
  },
  {
    raceId: 'race-france',
    stageIndex: 20,
    why: 'La reina tipo: 171 km y 4.516 m con final en alto. Es la forma que el banco de la v16 ya cubría, y sigue aquí como control.',
  },
  {
    raceId: 'race-italy',
    stageIndex: 19,
    why: 'La reina corta y brutal: 151 km, 4.094 m, tres puertos encadenados.',
  },
  {
    raceId: 'race-catalonia',
    stageIndex: 4,
    why: 'La reina que sube SIN PARAR el último tercio: 38 de los últimos 50 km son puerto. El extremo opuesto a Colombia.',
  },
  {
    raceId: 'race-guatemala',
    stageIndex: 9,
    why: 'Reina continental larga (200 km, 4.075 m) con campo continental: el nivel de carrera donde salió el defecto.',
  },
  {
    raceId: 'race-tachira',
    stageIndex: 6,
    why: 'Reina continental corta (166 km): el contraste de longitud dentro del mismo nivel.',
  },
  {
    raceId: 'race-rhone-alpes',
    stageIndex: 8,
    why: 'LA ETAPA MÁS DURA DEL CALENDARIO (v22): 120 km y 3.800 m —Col du Pré 6,9 al 10,1 %, Bisanne 11,4 al 7,7 %, Aravis y final en el Plateau de Solaison, 11,3 km al 9,1 %—. Es el BORDE del corte de §VI.3: cola del 10,1 % de mediana y 17,57 % en el peor caso contra un techo del 18 %. Ninguna otra etapa del banco tiene esta forma (corta, cuatro puertos encadenados y final en alto de 11 km al 9 %) y hasta la v21 nadie la vigilaba: si cruzara el corte, CI no se enteraría, igual que no se enteró de Race Colombia e5 en la v16.',
  },
] as const

const VOCATIONS: Vocation[] = ['escalada', 'velocidad', 'clasicas', 'crono', 'fondo']

const NEUTRAL_ORDERS: StageOrders = {
  role: 'libre',
  mentality: 'reservon',
  contestSprints: false,
  contestClimbs: false,
}

/**
 * El pelotón de una carrera de este nivel. No es un detalle de decorado: la regresión salió en una
 * carrera CONTINENTAL, donde el campo es un puñado de escaladores buenos y mucho corredor modesto,
 * y ese contraste es justo lo que rompe la carrera en pedazos. Correrlo todo con el pelotón del
 * Tour habría escondido el defecto igual que lo escondió la gran vuelta del banco.
 */
function fieldFor(level: string): { teams: number; per: number; divisions: Division[] } {
  if (level === 'WT') return { teams: 22, per: 8, divisions: ['WT', 'WT', 'WT', 'PRS'] }
  if (level === 'PRS') return { teams: 20, per: 7, divisions: ['PRS', 'PRS', 'CON'] }
  return { teams: 18, per: 7, divisions: ['CON', 'CON', 'CON', 'CON', 'PRS', 'WT'] }
}

interface BenchRider {
  riderId: string
  teamId: string
  attrs: Record<Attribute, number>
  fragility: number
  ctl: number
  atl: number
  morale: number
}

function buildField(worldSeed: string, level: string): BenchRider[] {
  const rng = seededRng(`${worldSeed}:rq-field`)
  const { teams, per, divisions } = fieldFor(level)
  const field: BenchRider[] = []
  for (let t = 0; t < teams; t++) {
    // El nivel del equipo rota por la lista: en una continental hay tres o cuatro equipos de
    // categoría superior invitados, que son los que ponen a los ocho escaladores buenos.
    const division = divisions[t % divisions.length]!
    for (let k = 0; k < per; k++) {
      const riderId = `rq-${t}-${k}`
      const vocation = VOCATIONS[Math.floor(rng() * VOCATIONS.length)]!
      const age = sampleNpcAge(`${worldSeed}:${riderId}:age`)
      const genome = generateNpcRider(`${worldSeed}:${riderId}`, { division, vocation, age })
      field.push({
        riderId,
        teamId: `rq-team-${t}`,
        attrs: genome.attributes,
        fragility: genome.hidden.fragility,
        // Una carrera de una semana en su primer tercio: con fondo y razonablemente fresco. Sin la
        // fatiga de tres semanas, que es lo que mide la gran vuelta del banco y no esto.
        ctl: 55 + 25 * rng(),
        atl: 45 + 20 * rng(),
        morale: 55 + 20 * rng(),
      })
    }
  }
  return field
}

/** Busca una etapa del calendario, con un error que dice qué falta si no está. */
function findStage(raceId: string, stageIndex: number) {
  const race = SEASON_CALENDAR.find((r) => r.id === raceId)
  if (!race) throw new Error(`Banco de reinas reales: no existe ${raceId}`)
  const stage = race.stages.find((s) => s.index === stageIndex)
  if (!stage) throw new Error(`Banco de reinas reales: ${raceId} no tiene etapa ${stageIndex}`)
  return { race, stage }
}

/** Corre una etapa con un campo dado y mide cómo llegó la COLA de la carrera. */
function runStage(
  label: string,
  raceId: string,
  stageIndex: number,
  riders: StageRider[],
  worldSeed: string,
): StageTail {
  const { stage } = findStage(raceId, stageIndex)
  const out = simulateStage(
    { profile: stage.profile, riders },
    // `engineVersion: 1` FIJO en la semilla, como el resto del banco: el objetivo mide el
    // comportamiento del motor, no los dados, y si la semilla se moviera con cada versión no se
    // podría distinguir una calibración de un cambio de azar.
    stageSeed({ worldSeed, raceId, stageDay: stageIndex, engineVersion: 1 }),
  )
  const timed = out.results.filter((r) => r.estado === 'finish')
  const winner = timed[0]?.tiempoS ?? 0
  if (timed.length === 0 || winner <= 0) {
    throw new Error(`Banco de reinas reales: ${label} sin clasificados`)
  }
  const last = timed.reduce((mx, r) => Math.max(mx, r.tiempoS), winner)
  const clocks = new Set(timed.map((r) => r.tiempoS))
  return {
    kind: label,
    lastGroupPct: (100 * (last - winner)) / winner,
    groups: clocks.size,
    oneGroup: clocks.size === 1,
    winnerGroupPct: (100 * timed.filter((r) => r.tiempoS === winner).length) / timed.length,
    top10GapSeconds: (timed[9]?.tiempoS ?? winner) - winner,
    wonFromMove: out.events.find((e) => e.tipo === 'meta')?.datos?.fuga === 1,
  }
}

/** Corre una etapa del banco con una semilla y devuelve cómo llegó la cola de la carrera. */
export function runRealQueen(queen: RealQueen, run: number): StageTail {
  const { race, stage } = findStage(queen.raceId, queen.stageIndex)
  const worldSeed = `reina-real-${queen.raceId}-${run}`
  const field = buildField(worldSeed, race.level)
  const orders = autoStageOrders(
    field.map((r) => ({ riderId: r.riderId, attrs: r.attrs, teamId: r.teamId })),
    { kind: stage.kind, timeTrial: false },
  )
  const riders: StageRider[] = field.map((r) => {
    const tsb = r.ctl - r.atl
    const eff = {} as Record<Attribute, number>
    for (const a of ATTRIBUTES) eff[a] = eff0(r.attrs[a], r.ctl, tsb, 'sano', r.morale)
    return {
      riderId: r.riderId,
      eff0: eff,
      energy: initialEnergy(r.ctl, tsb, 'sano'),
      matches: matchCount(eff, tsb, false),
      tsb,
      orders: orders.get(r.riderId) ?? NEUTRAL_ORDERS,
      gcDeficitSeconds: 0,
      fragility: r.fragility,
      teamId: r.teamId,
    }
  })
  return runStage(
    `${queen.raceId}-e${queen.stageIndex}`,
    queen.raceId,
    queen.stageIndex,
    riders,
    worldSeed,
  )
}

/**
 * EL CASO DE LA REGRESIÓN, TAL CUAL SE REPRODUJO (v17). Race Colombia e5 con el campo continental
 * con el que el dueño la reprodujo: 130 corredores, **8 escaladores a 82, 16 a 62 y el resto a 52**.
 *
 * No es el campo del banco de arriba —aquel lo genera `generateNpcRider` y sale un CONTINUO de
 * niveles— y esa diferencia es justo el punto: lo que rompe la carrera es el ESCALÓN, un puñado de
 * corredores treinta puntos por encima de una masa homogénea. Con el continuo la etapa se porta
 * (10-13 % de cola en el banco) y con el escalón se iba a un 74 minutos. Por eso el caso va aparte y
 * con el campo con el que se vio.
 *
 * Lo que se sella no es un número de calibración sino el CORTE de §VI.3: una etapa reina cuya cola
 * vive por encima del 18 % es una etapa en la que el corte de tiempo deja de ser un riesgo y pasa a
 * ser una eliminación en bloque que solo frena el tope del 4 %. Medido: v16 llegaba al 18,9 % (y en
 * producción, al 22 %); la v17 se queda en el 15,5 % peor caso.
 */
export function colombiaRegressionTails(runs: number): StageTail[] {
  const { stage } = findStage('race-colombia', 5)
  const eff = (base: number): Record<Attribute, number> => {
    const out = {} as Record<Attribute, number>
    for (const a of ATTRIBUTES) out[a] = base
    return out
  }
  const raw = Array.from({ length: 130 }, (_, i) => ({
    riderId: `co-${i}`,
    teamId: `co-team-${i % 26}`,
    attrs: eff(i < 8 ? 82 : i < 24 ? 62 : 52),
  }))
  const orders = autoStageOrders(raw, { kind: stage.kind, timeTrial: false })
  const riders: StageRider[] = raw.map((r) => ({
    riderId: r.riderId,
    eff0: r.attrs,
    energy: 100,
    matches: 4,
    tsb: 0,
    orders: orders.get(r.riderId) ?? NEUTRAL_ORDERS,
    gcDeficitSeconds: 0,
    fragility: 1,
    teamId: r.teamId,
  }))
  return Array.from({ length: runs }, (_, i) =>
    runStage('race-colombia-e5-regresion', 'race-colombia', 5, riders, `colombia-${i}`),
  )
}

export interface RealQueenStats {
  runsPerStage: number
  /** Una fila por etapa del banco, en el orden de `REAL_QUEENS`. */
  perStage: { queen: RealQueen; stats: TailStats }[]
  /** El banco entero junto: es sobre esto sobre lo que se mide el objetivo. */
  all: TailStats
  /** La etapa con la mediana de cola más alta: la que enseña el peor caso del calendario. */
  worst: { queen: RealQueen; medianLastGroupPct: number }
}

/** Corre el banco entero: cada etapa con N semillas deterministas. */
export function analyzeRealQueens(runsPerStage: number): RealQueenStats {
  const perStage: { queen: RealQueen; stats: TailStats }[] = []
  const all: StageTail[] = []
  for (const queen of REAL_QUEENS) {
    const tails: StageTail[] = []
    for (let i = 0; i < runsPerStage; i++) tails.push(runRealQueen(queen, i))
    all.push(...tails)
    perStage.push({ queen, stats: tailStats(tails) })
  }
  const worst = perStage.reduce((mx, row) =>
    row.stats.medianLastGroupPct > mx.stats.medianLastGroupPct ? row : mx,
  )
  return {
    runsPerStage,
    perStage,
    all: tailStats(all),
    worst: { queen: worst.queen, medianLastGroupPct: worst.stats.medianLastGroupPct },
  }
}
