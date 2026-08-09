/**
 * Bancos de medida de la CAPA TÁCTICA (docs/motor.md §13). Responden a las preguntas que el dueño
 * hace de la capa, y que ningún invariante sabía contestar: ¿se parecen dos carreras?, ¿cuántos
 * intentos hay por etapa y cuántos prosperan?, ¿la general de una carrera llana llega a abrirse?,
 * ¿un final en alto lo decide un ataque o el desgaste del tren del favorito?
 *
 * Es análisis, no motor: solo lee `StageOutput`. Lo consume `sim/cli.ts`.
 */
import { SEASON_CALENDAR } from '../routes/calendar.js'
import { simulateStage } from '../stage/simulate.js'
import { stageSeed } from '../stage/rng.js'
import type { Attribute } from '@cyclingstar/shared'
import type { StageInput, StageOrders, StageRider } from '../stage/types.js'
import type { Scenario } from './scenarios.js'

function eff(
  base: number,
  over: Partial<Record<Attribute, number>> = {},
): Record<Attribute, number> {
  return {
    RES: base,
    REC: base,
    LLA: base,
    MON: base,
    COL: base,
    CRI: base,
    SPR: base,
    DES: base,
    PAV: base,
    TAC: base,
    ...over,
  }
}

function orders(o: Partial<StageOrders>): StageOrders {
  return { role: 'libre', mentality: 'reservon', contestSprints: false, contestClimbs: false, ...o }
}

function rider(id: string, over: Partial<StageRider>): StageRider {
  return {
    riderId: id,
    eff0: eff(50),
    energy: 100,
    matches: 4,
    tsb: 0,
    orders: orders({}),
    gcDeficitSeconds: 0,
    ...over,
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const s = [...values].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[m - 1]! + s[m]!) / 2 : s[m]!
}

// --- 1. Que dos carreras no se parezcan ---------------------------------------------------

export interface VarietyStats {
  runs: number
  /** Intentos de movimiento por etapa (mediana y extremos). */
  attemptsMedian: number
  attemptsMin: number
  attemptsMax: number
  /** Intentos que prosperan (se convierten en un grupo con ventaja) sobre el total. */
  prosperFraction: number
  /** Km en que SALE la fuga del día (mediana); -1 si no cuaja. */
  breakKmMedian: number
  /** Intentos fallidos antes del que acaba siendo la fuga del día (mediana, y el peor caso). */
  triesBeforeBreakMedian: number
  triesBeforeBreakMax: number
  /** % de etapas sin fuga del día. */
  noBreakPct: number
  /** Guiones distintos: (¿cuaja fuga?, ¿la cazan?, tipo de final, ganador) sobre el total. */
  distinctScripts: number
  /** Ganadores distintos. */
  distinctWinners: number
  /** % de etapas con al menos un ataque tardío narrado. */
  lateAttackPct: number
  /** % de etapas que gana un corredor que había atacado. */
  attackerWinPct: number
}

/** Corre una campaña y mide cuánto se parecen entre sí las carreras (criterio 1 y 2 del encargo). */
export function analyzeVariety(scenario: Scenario, seeds: string[]): VarietyStats {
  const attempts: number[] = []
  const breakKms: number[] = []
  const triesBefore: number[] = []
  const scripts = new Set<string>()
  const winners = new Set<string>()
  let prospered = 0
  let total = 0
  let noBreak = 0
  let lateAttack = 0
  let attackerWin = 0

  for (const seed of seeds) {
    const out = simulateStage(scenario.input, seed)
    const tries = out.events.filter((e) => e.tipo === 'intento')
    // Un intento PROSPERA cuando el grupo que nace supera el boquete de consagración: o se convierte
    // en la fuga del día, o es un ataque que se sostiene.
    const ok = out.events.filter((e) => e.tipo === 'ataque' || e.tipo === 'fuga_formada')
    attempts.push(tries.length)
    total += tries.length
    prospered += ok.length
    const formed = out.events.find((e) => e.tipo === 'fuga_formada')
    const caught = out.events.find((e) => e.tipo === 'fuga_cazada')
    if (formed) {
      breakKms.push(formed.km)
      // Cuántas veces se intentó ANTES del movimiento que acabó siendo la fuga del día. Es el
      // número de la regla 5: «lo normal es que haya muchos intentos antes de que cuaje».
      triesBefore.push(tries.filter((e) => e.km < formed.km).length)
    } else noBreak += 1
    const win = out.events.find((e) => e.tipo === 'meta')
    const winner = out.results[0]?.riderId ?? '?'
    winners.add(winner)
    // El GUION de la etapa: cómo se desarrolló, no quién ganó. Cuándo cuajó la fuga (o si no
    // cuajó), cuántos intentos hicieron falta, si la cazaron, si la etapa se ganó desde la
    // carretera y qué clase de final la resolvió. Dos etapas con el mismo guion se parecen.
    scripts.add(
      [
        formed ? `t${tries.filter((e) => e.km < formed.km).length}` : 'sinfuga',
        `i${Math.round(tries.length / 4)}`,
        caught ? 'cazada' : 'viva',
        win?.datos?.fuga === 1 ? 'desdefuga' : 'delgrupo',
        String(win?.datos?.finish ?? ''),
      ].join('|'),
    )
    const late = out.events.some((e) => e.tipo === 'ataque')
    if (late) lateAttack += 1
    const attackers = new Set(
      out.events.filter((e) => e.tipo === 'ataque').flatMap((e) => e.protagonistas),
    )
    if (attackers.has(winner)) attackerWin += 1
  }

  const runs = seeds.length
  return {
    runs,
    attemptsMedian: median(attempts),
    attemptsMin: Math.min(...attempts),
    attemptsMax: Math.max(...attempts),
    prosperFraction: total === 0 ? 0 : prospered / total,
    breakKmMedian: breakKms.length === 0 ? -1 : median(breakKms),
    triesBeforeBreakMedian: median(triesBefore),
    triesBeforeBreakMax: triesBefore.length === 0 ? 0 : Math.max(...triesBefore),
    noBreakPct: (100 * noBreak) / runs,
    distinctScripts: scripts.size,
    distinctWinners: winners.size,
    lateAttackPct: (100 * lateAttack) / runs,
    attackerWinPct: (100 * attackerWin) / runs,
  }
}

// --- 3. La general de Sharjah -------------------------------------------------------------

/**
 * El banco de Sharjah (docs/balance.md, v7): las 5 etapas REALES de `race-sharjah` con un campo de
 * 40 donde hay un sprinter deliberadamente MALO —SPR 78 y 45 en todo lo demás— y 39 rivales
 * continentales mejores que él en cualquier otra faceta. Es el caso que el dueño vio en producción.
 */
export function sharjahField(): StageRider[] {
  const riders: StageRider[] = [
    rider('sprinter-malo', {
      eff0: eff(45, { SPR: 78 }),
      orders: orders({ role: 'sprinter', contestSprints: true }),
    }),
  ]
  for (let i = 0; i < 39; i++) {
    // Rivales mejores en TODO menos en la punta de velocidad: 52-73 de base, SPR 46-64.
    const base = 52 + (i % 22)
    riders.push(
      rider(`riv-${i}`, {
        eff0: eff(base, { SPR: 46 + (i % 19), TAC: 55 + (i % 15) }),
        orders: orders(
          i % 5 === 0
            ? { role: 'cazaetapas', mentality: 'combativo' }
            : i % 5 === 1
              ? { role: 'lider' }
              : { role: 'gregario' },
        ),
      }),
    )
  }
  return riders
}

export interface GcStats {
  races: number
  stages: number
  /** % de etapas donde NO todos comparten el tiempo del ganador. */
  stagesWithTimeGapsPct: number
  /** Mediana de corredores que llegan con el tiempo del ganador. */
  medianSameTime: number
  /** Generales que gana el sprinter malo. */
  sprinterGcWins: number
  /** Margen mediano de la general (s). */
  medianGcMargin: number
  /** Etapas que gana el sprinter malo. */
  sprinterStageWins: number
}

/** Corre `race-sharjah` completa con N semillas y mide su general (criterio 3 del encargo). */
export function analyzeSharjah(runs: number): GcStats {
  const race = SEASON_CALENDAR.find((r) => r.id === 'race-sharjah')
  if (!race) throw new Error('No existe race-sharjah en el calendario')
  const riders = sharjahField()
  let stagesWithGaps = 0
  let stages = 0
  let sprinterGc = 0
  let sprinterStages = 0
  const sameTime: number[] = []
  const margins: number[] = []

  for (let s = 0; s < runs; s++) {
    const gc = new Map<string, number>()
    for (const r of riders) gc.set(r.riderId, 0)
    for (const stage of race.stages) {
      const seed = stageSeed({
        worldSeed: `sharjah-${s}`,
        raceId: 'race-sharjah',
        stageDay: stage.index,
        engineVersion: 1,
      })
      // La general arrastra el hueco real de cada corredor, que es lo que el motor necesita para
      // saber quién es una amenaza (SPEC 6.9, `gcDeficitSeconds`).
      const best = Math.min(...[...gc.values()])
      const input: StageInput = {
        profile: stage.profile,
        riders: riders.map((r) => ({
          ...r,
          gcDeficitSeconds: (gc.get(r.riderId) ?? 0) - best,
        })),
        ...(stage.timeTrial ? { timeTrial: true } : {}),
      }
      const out = simulateStage(input, seed)
      stages += 1
      const winnerTime = out.results[0]?.tiempoS ?? 0
      const same = out.results.filter((r) => r.tiempoS === winnerTime).length
      sameTime.push(same)
      if (same < out.results.length) stagesWithGaps += 1
      if (out.results[0]?.riderId === 'sprinter-malo') sprinterStages += 1
      for (const r of out.results) {
        gc.set(r.riderId, (gc.get(r.riderId) ?? 0) + r.tiempoS - r.bonificacionS)
      }
    }
    const table = [...gc.entries()].sort((a, b) => a[1] - b[1])
    if (table[0]?.[0] === 'sprinter-malo') sprinterGc += 1
    if (table[0] && table[1]) margins.push(table[1][1] - table[0][1])
  }

  return {
    races: runs,
    stages,
    stagesWithTimeGapsPct: (100 * stagesWithGaps) / stages,
    medianSameTime: median(sameTime),
    sprinterGcWins: sprinterGc,
    medianGcMargin: median(margins),
    sprinterStageWins: sprinterStages,
  }
}

// --- 4 y 5. Final en alto y el que se deja ir ---------------------------------------------

export interface UphillStats {
  runs: number
  /** % de finales donde el desenlace nace de un ATAQUE (alguien se va y llega delante). */
  attackDecidedPct: number
  /** % donde lo decide el desgaste por ritmo (nadie ataca con éxito: llegan juntos y esprintan). */
  attritionPct: number
  /** Ataques por etapa (mediana). */
  attacksMedian: number
  /** Margen mediano del ganador (s). */
  medianMargin: number
}

/**
 * Un final en alto (criterio 4): ¿lo decide un ataque o el tren del favorito reventando a todos?
 * Se considera decidido por ataque si el ganador figura como protagonista de un ataque logrado.
 */
export function analyzeUphillFinish(scenario: Scenario, seeds: string[]): UphillStats {
  let byAttack = 0
  let byAttrition = 0
  const attacks: number[] = []
  const margins: number[] = []
  for (const seed of seeds) {
    const out = simulateStage(scenario.input, seed)
    const atk = out.events.filter((e) => e.tipo === 'ataque')
    attacks.push(atk.length)
    const winner = out.results[0]?.riderId
    const win = out.events.find((e) => e.tipo === 'meta')
    margins.push(Number(win?.datos?.margin ?? 0))
    const winnerAttacked = winner != null && atk.some((e) => e.protagonistas.includes(winner))
    if (winnerAttacked) byAttack += 1
    else byAttrition += 1
  }
  const runs = seeds.length
  return {
    runs,
    attackDecidedPct: (100 * byAttack) / runs,
    attritionPct: (100 * byAttrition) / runs,
    attacksMedian: median(attacks),
    medianMargin: median(margins),
  }
}

export interface GiveUpStats {
  runs: number
  /** Corredores que se dejan ir en los últimos km, por etapa (mediana). */
  giveUpsMedian: number
  /** % de etapas con al menos uno. */
  stagesWithGiveUpPct: number
  /** Peor retraso relativo al ganador de un corredor que se deja ir (%). Vigila el fuera de control. */
  worstLossPct: number
}

/** Regla 8: el agotado que administra el esfuerzo en los últimos km (criterio 5 del encargo). */
export function analyzeGiveUp(scenario: Scenario, seeds: string[]): GiveUpStats {
  const counts: number[] = []
  let withAny = 0
  let worst = 0
  for (const seed of seeds) {
    const out = simulateStage(scenario.input, seed)
    const ev = out.events.filter((e) => e.tipo === 'abandona_ritmo')
    counts.push(ev.length)
    if (ev.length > 0) withAny += 1
    const winnerTime = out.results[0]?.tiempoS ?? 1
    const ids = new Set(ev.flatMap((e) => e.protagonistas))
    for (const r of out.results) {
      if (!ids.has(r.riderId)) continue
      worst = Math.max(worst, (100 * (r.tiempoS - winnerTime)) / winnerTime)
    }
  }
  const runs = seeds.length
  return {
    runs,
    giveUpsMedian: median(counts),
    stagesWithGiveUpPct: (100 * withAny) / runs,
    worstLossPct: worst,
  }
}
