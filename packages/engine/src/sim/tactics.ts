/**
 * Bancos de medida de la CAPA TÁCTICA (docs/motor.md §13). Responden a las preguntas que el dueño
 * hace de la capa, y que ningún invariante sabía contestar: ¿se parecen dos carreras?, ¿cuántos
 * intentos hay por etapa y cuántos prosperan?, ¿la general de una carrera llana llega a abrirse?,
 * ¿un final en alto lo decide un ataque o el desgaste del tren del favorito?
 *
 * Es análisis, no motor: solo lee `StageOutput`. Lo consume `sim/cli.ts`.
 */
import { STAGE } from '../constants.js'
import { SEASON_CALENDAR } from '../routes/calendar.js'
import { chaseField } from '../stage/chase.js'
import { simulateStage } from '../stage/simulate.js'
import { stageSeed } from '../stage/rng.js'
import { type AutoOrderRider, autoStageOrders } from '../world/autoOrders.js'
import type { Attribute } from '@cyclingstar/shared'
import type { StageInput, StageOrders, StageRider } from '../stage/types.js'
import { flatScenario, type Scenario } from './scenarios.js'

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

// --- 3-bis. La caza depende del campo -----------------------------------------------------

/**
 * El campo de una GRAN VUELTA en una etapa llana: cinco trenes de sprint de primer nivel (rematador
 * de 82-90 con su lanzador y dos gregarios), sus baroudeurs y el resto del pelotón. Es el contraste
 * del banco de la caza: aquí la fuga tiene que seguir llegando poco.
 */
export function grandTourSprintField(): StageRider[] {
  const riders: StageRider[] = []
  for (let t = 0; t < 5; t++) {
    const leader = `spr-${t}`
    riders.push(
      rider(leader, {
        eff0: eff(60, { SPR: 82 + 2 * t, LLA: 72 }),
        orders: orders({ role: 'sprinter', contestSprints: true }),
      }),
    )
    riders.push(
      rider(`lan-${t}`, {
        eff0: eff(60, { SPR: 68, LLA: 74 }),
        orders: orders({ role: 'lanzador', targetRiderId: leader, contestSprints: true }),
      }),
    )
    for (let g = 0; g < 2; g++) {
      riders.push(
        rider(`greg-${t}-${g}`, {
          eff0: eff(60, { LLA: 70 }),
          orders: orders({ role: 'gregario', targetRiderId: leader }),
        }),
      )
    }
  }
  for (let i = 0; i < 6; i++) {
    riders.push(
      rider(`brk-${i}`, {
        eff0: eff(58, { TAC: 62, LLA: 68 }),
        orders: orders({ role: 'cazaetapas', mentality: 'combativo', contestSprints: true }),
      }),
    )
  }
  for (let i = 0; i < 14; i++)
    riders.push(rider(`pel-${i}`, { eff0: eff(58, { LLA: 64 + (i % 8) }) }))
  return riders
}

/**
 * El campo INTERMEDIO: una ProSeries con dos trenes de rematador correcto (74-76) y un par de
 * ayudantes cada uno. Existe para ver que la escala es un gradiente y no un segundo interruptor.
 */
export function proSprintField(): StageRider[] {
  const riders: StageRider[] = []
  for (let t = 0; t < 2; t++) {
    const leader = `spr-${t}`
    riders.push(
      rider(leader, {
        eff0: eff(58, { SPR: 74 + 2 * t, LLA: 70 }),
        orders: orders({ role: 'sprinter', contestSprints: true }),
      }),
    )
    riders.push(
      rider(`lan-${t}`, {
        eff0: eff(58, { SPR: 64, LLA: 70 }),
        orders: orders({ role: 'lanzador', targetRiderId: leader, contestSprints: true }),
      }),
    )
  }
  for (let i = 0; i < 6; i++) {
    riders.push(
      rider(`brk-${i}`, {
        eff0: eff(56, { TAC: 60, LLA: 66 }),
        orders: orders({ role: 'cazaetapas', mentality: 'combativo', contestSprints: true }),
      }),
    )
  }
  for (let i = 0; i < 30; i++)
    riders.push(rider(`pel-${i}`, { eff0: eff(56, { LLA: 62 + (i % 8) }) }))
  return riders
}

export interface ChaseStats {
  /** Fuerza de la caza que mide el motor para ese campo. */
  force: number
  /** Trenes con opciones reales. */
  trains: number
  races: number
  stages: number
  /** % de etapas llanas que NO acaban en sprint masivo. */
  noBunchPct: number
  /** Cuántas de las 5 llanas de una semana no acaban al sprint (mediana). */
  medianNoBunchPerWeek: number
  /** % de etapas que gana un corredor llegado desde la carretera (escapado). */
  breakawayWinPct: number
}

/**
 * El banco de la CAZA (criterio del dueño): cinco etapas llanas corridas por el MISMO recorrido y el
 * mismo campo, contando cuántas se resuelven sin sprint masivo. En una carrera modesta al menos una
 * debería escapársele al pelotón; en una gran vuelta con cinco trenes, casi ninguna.
 */
export function analyzeChase(riders: StageRider[], tag: string, races: number): ChaseStats {
  const profile = flatScenario().input.profile
  const field = chaseField(riders)
  const perWeek: number[] = []
  let stages = 0
  let noBunch = 0
  let fromBreak = 0
  for (let r = 0; r < races; r++) {
    let week = 0
    for (let s = 1; s <= 5; s++) {
      const seed = stageSeed({
        worldSeed: `${tag}-${r}`,
        raceId: tag,
        stageDay: s,
        engineVersion: 1,
      })
      const out = simulateStage({ profile, riders }, seed)
      stages += 1
      const win = out.events.find((e) => e.tipo === 'meta')
      if (win?.datos?.won !== 'sprint') {
        noBunch += 1
        week += 1
      }
      if (win?.datos?.fuga === 1) fromBreak += 1
    }
    perWeek.push(week)
  }
  return {
    force: field.force,
    trains: field.trains.length,
    races,
    stages,
    noBunchPct: (100 * noBunch) / stages,
    medianNoBunchPerWeek: median(perWeek),
    breakawayWinPct: (100 * fromBreak) / stages,
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

// --- 7. La atribución del trabajo (v11) ---------------------------------------------------

export interface AttributionStats {
  runs: number
  /** Partes de «quién tira del pelotón» por etapa: mediana, extremos y % dentro de la ventana 3-6. */
  pullsMedian: number
  pullsMin: number
  pullsMax: number
  pullsInWindowPct: number
  /** Corredores nombrados en cada parte (mediana): tienen que ser 2-3, no doce. */
  pullNamesMedian: number
  /** Capturas narradas por etapa y cuántas de ellas se le atribuyen a alguien. */
  catchesPerStage: number
  attributedPct: number
  /** % de etapas que cuentan cómo se reparte el trabajo dentro de la fuga. */
  breakSharePct: number
}

/**
 * El banco de la ATRIBUCIÓN (docs/balance.md, v11): las dos preguntas del dueño —«quién tira del
 * pelotón» y «quién hizo el trabajo para reducir la distancia»— no son invariantes de balance sino
 * de CRÓNICA, y lo que hay que medir es que salgan las veces justas: ni una ni veinte.
 */
export function analyzeAttribution(scenario: Scenario, seeds: string[]): AttributionStats {
  const pulls: number[] = []
  const names: number[] = []
  let inWindow = 0
  let catches = 0
  let attributed = 0
  let withShare = 0
  const narrated = (e: { datos?: Record<string, number | string> }): boolean => e.datos?.narra !== 0
  for (const seed of seeds) {
    const out = simulateStage(scenario.input, seed)
    const pull = out.events.filter((e) => e.plantilla === 'peloton_pull')
    pulls.push(pull.length)
    if (pull.length >= 3 && pull.length <= 6) inWindow += 1
    for (const e of pull) names.push(e.protagonistas.length)
    const caught = out.events.filter(
      (e) =>
        narrated(e) &&
        (e.plantilla === 'breakaway_caught' ||
          e.plantilla === 'move_caught' ||
          e.plantilla === 'attack_reeled'),
    )
    catches += caught.length
    attributed += out.events.filter((e) => e.plantilla === 'chase_work').length
    if (out.events.some((e) => e.plantilla === 'break_share')) withShare += 1
  }
  const runs = seeds.length
  return {
    runs,
    pullsMedian: median(pulls),
    pullsMin: Math.min(...pulls),
    pullsMax: Math.max(...pulls),
    pullsInWindowPct: (100 * inWindow) / runs,
    pullNamesMedian: median(names),
    catchesPerStage: catches / runs,
    attributedPct: catches === 0 ? 0 : (100 * attributed) / catches,
    breakSharePct: (100 * withShare) / runs,
  }
}

// --- 8. El PLAN DE EQUIPO (v15, docs/motor.md §V.1) ---------------------------------------

/**
 * Un campo con EQUIPOS de verdad, con los roles repartidos por el mismo planificador que usa
 * producción (`world/autoOrders.ts`). Es el lecho donde se mide lo que le importaba al dueño: con
 * qué frecuencia el parte de «quién tira» puede nombrar a un EQUIPO en vez de a una alianza de
 * corredores sueltos. Los campos de los otros bancos son de agentes libres —no traen `teamId`— y
 * por construcción no pueden decir nada de esto.
 *
 * `strong` es cuántos equipos traen un rematador con opciones reales: es la perilla que distingue
 * una carrera con dos equipos fuertes de una con ocho.
 */
export function teamedField(opts: {
  teams: number
  per: number
  kind: 'llana' | 'media' | 'reina'
  strong: number
}): StageRider[] {
  const auto: AutoOrderRider[] = []
  for (let t = 0; t < opts.teams; t++) {
    for (let k = 0; k < opts.per; k++) {
      // Un rematador, un lanzador nato, un escalador y relleno: la plantilla tipo de un equipo.
      const over =
        k === 0
          ? { SPR: t < opts.strong ? 84 - t : 62, LLA: 70 }
          : k === 1
            ? { SPR: 66, LLA: 72 }
            : k === 2
              ? { MON: 74, COL: 70, TAC: 62 }
              : { LLA: 64 + k, TAC: 58 }
      auto.push({ riderId: `t${t}-r${k}`, attrs: eff(58, over), teamId: `team-${t}` })
    }
  }
  const plan = autoStageOrders(auto, { kind: opts.kind, timeTrial: false })
  return auto.map((r) =>
    rider(r.riderId, {
      eff0: r.attrs,
      teamId: r.teamId,
      orders: plan.get(r.riderId) ?? orders({}),
    }),
  )
}

/**
 * Recorrido de MEDIA MONTAÑA para el banco del plan de equipo: 160 km con un repecho largo, un
 * puerto de segunda a 30 km de meta y un valle final. Es la «etapa de transición» del encargo —la
 * que en carretera sí se corre por alianza entre equipos— y el contraste de la llana canónica.
 */
export const HILLY_PROFILE: StageInput['profile'] = {
  segments: [
    { km: 60, tipo: 'llano' },
    { km: 20, tipo: 'rompepiernas' },
    { km: 40, tipo: 'llano' },
    { km: 10, tipo: 'puerto', tramos: [{ km: 10, g: 6 }] },
    { km: 30, tipo: 'llano' },
  ],
  banners: [{ km: 130, tipo: 'cima' }],
}

export interface TeamVoiceStats {
  runs: number
  /** Partes de «quién tira» sobre un grupo grande (los que la crónica cuenta con voz de equipo). */
  pulls: number
  /** % de esos partes cuyos nombrados son TODOS del mismo equipo: la medida del encargo. */
  teamVoicePct: number
  /** …y de esos, cuántos dicen además POR QUÉ tira ese equipo. Un parte sin motivo va a medias. */
  withReasonPct: number
  /** Reparto de motivos entre los partes con voz de equipo. */
  reasons: { etapa: number; maillot: number; general: number; sinMotivo: number }
  /**
   * Equipos distintos que llegan a llevar el frente en una etapa, en MEDIA (no en mediana). Es un
   * entero pequeño —una etapa tiene uno, dos o tres dueños del frente— y su mediana vive en una
   * retícula (1 · 1,5 · 2 · 2,5), así que un objetivo apoyado en ella se cumple o falla por un
   * salto entero: exactamente el «invariante intermitente» que ya enseñó `grandTour.abandonPct`.
   * La media mide lo mismo de forma continua.
   */
  frontTeamsAvg: number
}

/**
 * LA VOZ DE LA CRÓNICA (el criterio de éxito visible del dueño): «Cumbre Escuadra ha tomado el
 * frente» frente a «X, Y y Z se reparten el trabajo». Medido tal como lo decide la web
 * (`stageJournal.ts`): un parte se cuenta con voz de equipo si todos sus protagonistas son del
 * mismo equipo, y solo sobre un grupo grande, porque con un grupo pequeño se nombra a los
 * corredores por acuerdo de la casa (`STAGE.frontNamesMaxRiders`).
 */
export function analyzeTeamVoice(
  riders: StageRider[],
  profile: StageInput['profile'],
  seeds: string[],
  gcDeficits?: ReadonlyMap<string, number>,
): TeamVoiceStats {
  const teamOf = new Map(riders.map((r) => [r.riderId, r.teamId ?? r.riderId]))
  // La general se inyecta desde fuera cuando el banco quiere medir los motivos de general: el motor
  // solo la conoce por `gcDeficitSeconds`, que es lo que rellena `packages/db` en producción.
  const field = gcDeficits
    ? riders.map((r) => ({ ...r, gcDeficitSeconds: gcDeficits.get(r.riderId) ?? 0 }))
    : riders
  let pulls = 0
  let single = 0
  const reasons = { etapa: 0, maillot: 0, general: 0, sinMotivo: 0 }
  const fronts: number[] = []
  for (const seed of seeds) {
    const out = simulateStage({ profile, riders: field }, seed)
    const seen = new Set<string>()
    for (const e of out.events) {
      if (e.plantilla !== 'peloton_pull') continue
      if (Number(e.datos?.size ?? 0) <= STAGE.frontNamesMaxRiders) continue
      pulls += 1
      const teams = new Set(e.protagonistas.map((id) => teamOf.get(id) ?? id))
      if (teams.size !== 1) continue
      single += 1
      seen.add([...teams][0]!)
      const why = String(e.datos?.porQue ?? '')
      if (why === 'etapa') reasons.etapa += 1
      else if (why === 'maillot') reasons.maillot += 1
      else if (why === 'general') reasons.general += 1
      else reasons.sinMotivo += 1
    }
    fronts.push(seen.size)
  }
  return {
    runs: seeds.length,
    pulls,
    teamVoicePct: pulls === 0 ? 0 : (100 * single) / pulls,
    withReasonPct: single === 0 ? 0 : (100 * (single - reasons.sinMotivo)) / single,
    reasons,
    frontTeamsAvg: fronts.reduce((a, b) => a + b, 0) / Math.max(1, fronts.length),
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
