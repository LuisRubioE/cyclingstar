/**
 * EL BANCO QUE MIRA DENTRO DE UN PUERTO (v26, docs/balance.md «v26»).
 *
 * Todo lo que la batería sabía medir de una etapa de montaña se medía EN META: la cola de la
 * carrera, los grupos de tiempo, la brecha 1.º-10.º. Y con eso no se puede responder a la pregunta
 * del dueño —«que haya remontadas en una subida… o uno que empieza muy fuerte y luego se hunde»—,
 * porque entre el pie y la cima el motor no emitía un solo dato con el ORDEN de la carrera. Sin esa
 * regla no hay forma de saber si un cambio en la física del descuelgue funciona.
 *
 * Este banco corre las MISMAS etapas reina reales de `sim/realQueens.ts`, con el mismo campo y la
 * misma semilla (`realQueenSetup`), y lo único que cambia es lo que mira: pide tres fotos por puerto
 * —pie, mitad y cima— con `StageProbe` y compara el orden de la carrera en las tres. Que sean las
 * mismas etapas no es comodidad: es lo que permite leer los dos bancos juntos y saber si lo que
 * arregla el puerto rompe la cola, que es exactamente el compromiso de esta tanda.
 *
 * Puro y determinista: no tira un dado propio y la foto es observación (`StageProbe`).
 */
import { STAGE } from '../constants.js'
import { sampleProfile } from '../stage/sample.js'
import { simulateStage } from '../stage/simulate.js'
import type { SnapshotRider, StageOutput, StageProfile } from '../stage/types.js'
import { REAL_QUEENS, type RealQueen, realQueenSetup } from './realQueens.js'

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

/**
 * CUÁNTOS PUESTOS SON «CAMBIAR DE SITIO». Cinco, y no es arbitrario: por debajo, en un pelotón de
 * 150 corredores, cualquier reordenación dentro del mismo grupo de tiempo contaría como remontada.
 * Cinco puestos es una diferencia que un espectador ve en la carretera.
 */
export const CLIMB_POS_THRESHOLD = 5

/** Un puerto del recorrido, tal como lo ven los bloques de la física. */
export interface ClimbSpan {
  /** Km donde arranca la subida y km donde se corona. */
  fromKm: number
  toKm: number
  km: number
  /** Desnivel positivo acumulado, en metros. */
  gain: number
  /** Pendiente media en %. */
  avgG: number
}

/**
 * Los puertos de un recorrido: rachas de bloques de `subida`, con los respiros cortos cosidos.
 *
 * El cosido no es un adorno: un puerto real trae rellanos y hasta contrapendientes de doscientos
 * metros —el Col du Pré de Race Rhône-Alpes tiene dos—, y sin coserlos un puerto de 12 km sale
 * partido en cinco pedazos de dos y ninguno pasa el suelo de longitud. `stitchKm` es deliberadamente
 * corto (0,5 km): lo que separa dos puertos de verdad es un descenso, no un rellano.
 */
export function findClimbs(profile: StageProfile, minKm = 4, stitchKm = 0.5): ClimbSpan[] {
  const blocks = sampleProfile(profile)
  const dx = STAGE.dx
  const stitch = Math.round(stitchKm / dx)
  const spans: { from: number; to: number }[] = []
  let from: number | null = null
  let lastClimb = -1
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i]!.tipo === 'subida') {
      if (from === null) from = i
      lastClimb = i
    } else if (from !== null && i - lastClimb > stitch) {
      spans.push({ from, to: lastClimb })
      from = null
    }
  }
  if (from !== null) spans.push({ from, to: lastClimb })

  const out: ClimbSpan[] = []
  for (const s of spans) {
    const km = (s.to - s.from + 1) * dx
    if (km < minKm) continue
    let gain = 0
    for (let i = s.from; i <= s.to; i++) gain += Math.max(0, blocks[i]!.g) * 10 * dx
    out.push({ fromKm: s.from * dx, toKm: (s.to + 1) * dx, km, gain, avgG: gain / (10 * km) })
  }
  return out
}

/** Puesto de cada corredor en una foto: por reloj, y los empates COMPARTEN puesto (1,1,1,4…). */
function ranksOf(snapshot: readonly SnapshotRider[], only: Set<string>): Map<string, number> {
  const rows = snapshot
    .filter((r) => only.has(r.riderId))
    .sort((a, b) => a.tS - b.tS || (a.riderId < b.riderId ? -1 : 1))
  const ranks = new Map<string, number>()
  let rank = 0
  let prev = Number.NaN
  let seen = 0
  for (const r of rows) {
    seen += 1
    if (r.tS !== prev) {
      rank = seen
      prev = r.tS
    }
    ranks.set(r.riderId, rank)
  }
  return ranks
}

/** Lo que pasa DENTRO de un puerto, en una corrida. */
export interface ClimbRun {
  climb: ClimbSpan
  /** Corredores en carrera que cruzan las TRES fotos (el que abandona en medio no cuenta). */
  riders: number
  /**
   * REMONTADAS: cuántos mejoran su puesto entre el pie y la cima en `CLIMB_POS_THRESHOLD` o más. Es
   * el número nuevo de la tanda.
   */
  gainers: number
  /** …y cuántos PIERDEN ese mismo tanto. */
  losers: number
  /** El que empieza mal y remonta: pierde puestos en la parte baja y los recupera en la alta. */
  comebacks: number
  /** El que se hunde: va en el cuarto delantero a mitad de puerto y se cae en la parte alta. */
  blowups: number
  /** La mejor remontada y el peor hundimiento de la corrida, en puestos. */
  bestGain: number
  worstDrop: number
  /** Relojes DISTINTOS en la cima: la granularidad del tiempo dentro del puerto. */
  clocksAtTop: number
  /** Segundos cedidos contra el primero por kilómetro de puerto: mediana del campo y peor caso. */
  medianLossPerKm: number
  maxLossPerKm: number
}

/** Cómo llegó la carrera a meta, mirado como una DISTRIBUCIÓN y no como una cola. */
export interface FinishShape {
  finishers: number
  /** Cuántos llegan dentro de 10 s, 30 s y 60 s del ganador. */
  within10s: number
  within30s: number
  within60s: number
  /** Relojes distintos en meta: con grupos-escalón son pocos y grandes. */
  clocks: number
  /** El ESCALÓN más grande entre dos clasificados consecutivos, en segundos. */
  maxStepS: number
  /** Fracción del campo que comparte reloj con alguien: 100 % son escalones puros. */
  sharedPct: number
}

export interface ClimbStageRun {
  climbs: ClimbRun[]
  finish: FinishShape
}

/** Cómo se reparten los tiempos de meta: continuos o a escalones. */
export function finishShape(out: StageOutput): FinishShape {
  const times = out.results
    .filter((r) => r.estado === 'finish')
    .map((r) => r.tiempoS)
    .sort((a, b) => a - b)
  if (times.length === 0) {
    return {
      finishers: 0,
      within10s: 0,
      within30s: 0,
      within60s: 0,
      clocks: 0,
      maxStepS: 0,
      sharedPct: 0,
    }
  }
  const winner = times[0]!
  const counts = new Map<number, number>()
  for (const t of times) counts.set(t, (counts.get(t) ?? 0) + 1)
  let maxStep = 0
  for (let i = 1; i < times.length; i++) maxStep = Math.max(maxStep, times[i]! - times[i - 1]!)
  const shared = times.filter((t) => (counts.get(t) ?? 0) > 1).length
  return {
    finishers: times.length,
    within10s: times.filter((t) => t - winner <= 10).length,
    within30s: times.filter((t) => t - winner <= 30).length,
    within60s: times.filter((t) => t - winner <= 60).length,
    clocks: counts.size,
    maxStepS: maxStep,
    sharedPct: (100 * shared) / times.length,
  }
}

/** Corre una etapa del banco de reinas reales mirando DENTRO de sus puertos. */
export function runClimbStage(queen: RealQueen, run: number, minKm = 4): ClimbStageRun {
  const { input, seed } = realQueenSetup(queen, run)
  const climbs = findClimbs(input.profile, minKm)
  const shots = new Map<number, SnapshotRider[]>()
  const atKm: number[] = []
  // El PIE se mide un bloque ANTES de la primera rampa: en el primer bloque de subida la selección
  // ya ha corrido una vez, y preguntar ahí sería preguntar por un puerto que ya ha empezado.
  const footKm = (c: ClimbSpan): number => Math.max(STAGE.dx, c.fromKm - STAGE.dx)
  const midKm = (c: ClimbSpan): number => c.fromKm + c.km / 2
  const topKm = (c: ClimbSpan): number => c.toKm - STAGE.dx
  for (const c of climbs) atKm.push(footKm(c), midKm(c), topKm(c))
  const out: StageOutput = simulateStage(input, seed, {
    atKm,
    onSnapshot: (km, riders) => shots.set(Math.round(km * 10) / 10, [...riders]),
  })

  const nearest = (km: number): SnapshotRider[] => {
    let best: SnapshotRider[] = []
    let bestD = Number.POSITIVE_INFINITY
    for (const [k, v] of shots) {
      const d = Math.abs(k - km)
      if (d < bestD) {
        bestD = d
        best = v
      }
    }
    return best
  }

  const rows: ClimbRun[] = []
  for (const c of climbs) {
    const foot = nearest(footKm(c))
    const mid = nearest(midKm(c))
    const top = nearest(topKm(c))
    // Solo los que cruzan las TRES fotos: el que abandona dentro del puerto no ha perdido puestos,
    // ha dejado la carrera, y contarlo sería inflar justo el número que esta tanda persigue.
    const inMid = new Set(mid.map((r) => r.riderId))
    const inTop = new Set(top.map((r) => r.riderId))
    const common = new Set(
      foot.map((r) => r.riderId).filter((id) => inMid.has(id) && inTop.has(id)),
    )
    if (common.size < 2) continue
    const rFoot = ranksOf(foot, common)
    const rMid = ranksOf(mid, common)
    const rTop = ranksOf(top, common)
    const th = CLIMB_POS_THRESHOLD
    const frontQuarter = Math.max(1, Math.ceil(common.size / 4))
    let gainers = 0
    let losers = 0
    let comebacks = 0
    let blowups = 0
    let bestGain = 0
    let worstDrop = 0
    for (const id of common) {
      const a = rFoot.get(id)!
      const b = rMid.get(id)!
      const z = rTop.get(id)!
      const delta = a - z
      if (delta >= th) gainers += 1
      if (-delta >= th) losers += 1
      // Remontada de libro: pierde puestos en la parte baja y los recupera en la alta.
      if (a - b <= -th && b - z >= th) comebacks += 1
      // Hundimiento de libro: va en el cuarto delantero a mitad de puerto y se cae en la alta.
      if (b <= frontQuarter && b - z <= -th) blowups += 1
      bestGain = Math.max(bestGain, delta)
      worstDrop = Math.max(worstDrop, -delta)
    }
    const footT = new Map(foot.map((r) => [r.riderId, r.tS]))
    const topT = new Map(top.map((r) => [r.riderId, r.tS]))
    const ids = [...common]
    const leaderFoot = Math.min(...ids.map((id) => footT.get(id)!))
    const leaderTop = Math.min(...ids.map((id) => topT.get(id)!))
    const losses = ids.map(
      (id) => (topT.get(id)! - leaderTop - (footT.get(id)! - leaderFoot)) / c.km,
    )
    rows.push({
      climb: c,
      riders: common.size,
      gainers,
      losers,
      comebacks,
      blowups,
      bestGain,
      worstDrop,
      clocksAtTop: new Set(ids.map((id) => topT.get(id)!)).size,
      medianLossPerKm: median(losses),
      maxLossPerKm: Math.max(...losses),
    })
  }

  return { climbs: rows, finish: finishShape(out) }
}

export interface ClimbStats {
  runs: number
  /** Sobre el puerto DECISIVO de cada corrida: el último del recorrido. */
  decisive: {
    medianGainers: number
    medianLosers: number
    medianComebacks: number
    medianBlowups: number
    medianBestGain: number
    medianClocksAtTop: number
    medianRiders: number
    medianLossPerKm: number
    /** Corridas cuyo puerto decisivo NO produce ni una remontada: hoy son todas. */
    zeroGainerPct: number
  }
  /** Sobre TODOS los puertos largos del banco. */
  allClimbs: {
    climbs: number
    medianGainers: number
    medianComebacks: number
    medianBlowups: number
    zeroGainerPct: number
  }
  finish: {
    medianWithin10s: number
    medianWithin30s: number
    medianWithin60s: number
    medianClocks: number
    medianMaxStepS: number
    medianSharedPct: number
  }
}

function summarize(runs: ClimbStageRun[]): ClimbStats {
  const decisive = runs
    .map((r) => r.climbs[r.climbs.length - 1])
    .filter((c): c is ClimbRun => c != null)
  const all = runs.flatMap((r) => r.climbs)
  const fin = runs.map((r) => r.finish)
  const zeroPct = (rows: ClimbRun[]): number =>
    rows.length === 0 ? 0 : (100 * rows.filter((c) => c.gainers === 0).length) / rows.length
  return {
    runs: runs.length,
    decisive: {
      medianGainers: median(decisive.map((c) => c.gainers)),
      medianLosers: median(decisive.map((c) => c.losers)),
      medianComebacks: median(decisive.map((c) => c.comebacks)),
      medianBlowups: median(decisive.map((c) => c.blowups)),
      medianBestGain: median(decisive.map((c) => c.bestGain)),
      medianClocksAtTop: median(decisive.map((c) => c.clocksAtTop)),
      medianRiders: median(decisive.map((c) => c.riders)),
      medianLossPerKm: median(decisive.map((c) => c.medianLossPerKm)),
      zeroGainerPct: zeroPct(decisive),
    },
    allClimbs: {
      climbs: all.length,
      medianGainers: median(all.map((c) => c.gainers)),
      medianComebacks: median(all.map((c) => c.comebacks)),
      medianBlowups: median(all.map((c) => c.blowups)),
      zeroGainerPct: zeroPct(all),
    },
    finish: {
      medianWithin10s: median(fin.map((f) => f.within10s)),
      medianWithin30s: median(fin.map((f) => f.within30s)),
      medianWithin60s: median(fin.map((f) => f.within60s)),
      medianClocks: median(fin.map((f) => f.clocks)),
      medianMaxStepS: median(fin.map((f) => f.maxStepS)),
      medianSharedPct: median(fin.map((f) => f.sharedPct)),
    },
  }
}

export interface ClimbBenchStats {
  runsPerStage: number
  perStage: { queen: RealQueen; stats: ClimbStats }[]
  all: ClimbStats
}

/** Corre el banco entero: las reinas reales, mirando dentro de sus puertos. */
export function analyzeClimbs(runsPerStage: number): ClimbBenchStats {
  const perStage: { queen: RealQueen; stats: ClimbStats }[] = []
  const all: ClimbStageRun[] = []
  for (const queen of REAL_QUEENS) {
    const runs: ClimbStageRun[] = []
    for (let i = 0; i < runsPerStage; i++) runs.push(runClimbStage(queen, i))
    all.push(...runs)
    perStage.push({ queen, stats: summarize(runs) })
  }
  return { runsPerStage, perStage, all: summarize(all) }
}
