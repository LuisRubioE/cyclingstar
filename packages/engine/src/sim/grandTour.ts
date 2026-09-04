/**
 * LA GRAN VUELTA DEL BANCO (docs/motor.md §VI.3). Una vuelta de 21 etapas con 176 corredores
 * corrida entera, día a día, en PURO MOTOR: sin base de datos y sin reloj.
 *
 * Existe por una razón concreta: el criterio de éxito de los abandonos —«empezar con ~176 y terminar
 * con entre 140 y 155»— no se puede medir sobre una etapa suelta. Es una propiedad de TRES SEMANAS:
 * la fatiga que se acumula día tras día, el depósito que mengua con el TSB, las caídas que se van
 * sumando y el pelotón que adelgaza. Los escenarios canónicos (`llana-180`, `reina-150`) son etapas
 * sueltas de 40 corredores y no pueden decir nada de eso.
 *
 * **Reproduce lo que hace `packages/db` en el tick**, y a propósito comparte con él las funciones
 * que deciden (`injuryEndsRace`, `raceIllnessProbability`): si producción y el banco no llaman a lo
 * mismo, el invariante mide otra cosa que el juego.
 *
 * Puro y determinista: todo el azar sale de `seededRng` con semillas derivadas de `worldSeed`.
 */
import { ATTRIBUTES, type Attribute, type Vocation, seededRng } from '@cyclingstar/shared'
import { applyDailyLoad, eff0, initialEnergy, raceIllnessProbability } from '../banister.js'
import { STAGE } from '../constants.js'
import { SEASON_CALENDAR } from '../routes/calendar.js'
import { injuryEndsRace } from '../stage/abandon.js'
import { matchCount } from '../stage/physics.js'
import { stageSeed } from '../stage/rng.js'
import { simulateStage, stageTss } from '../stage/simulate.js'
import type { Incident, StageOrders, StageRider } from '../stage/types.js'
import { autoStageOrders } from '../world/autoOrders.js'
import { generateNpcRider, sampleNpcAge } from '../world/npc.js'

/** La gran vuelta canónica del calendario: 21 etapas con dos cronos y siete finales en alto. */
export const GRAND_TOUR_ID = 'race-france'

/** 22 equipos de 8: el tamaño real del pelotón de una gran vuelta. */
const TEAMS = 22
const RIDERS_PER_TEAM = 8
/** Los cuatro últimos equipos son invitados de segunda división (SPEC 8: `openTo`). */
const WORLD_TOUR_TEAMS = 18
const VOCATIONS: Vocation[] = ['escalada', 'velocidad', 'clasicas', 'crono', 'fondo']

/**
 * Estado de un corredor entre etapas. Es EXACTAMENTE lo que `packages/db` lee de `riders` y
 * `rider_hidden` para construir el `StageRider` de cada día.
 */
interface TourRider {
  riderId: string
  teamId: string
  attrs: Record<Attribute, number>
  fragility: number
  ctl: number
  atl: number
  morale: number
  rec: number
}

/** Por qué se fue cada uno. Son las tres causas de docs/motor.md §VI.3, con la cuarta desglosada. */
export interface AbandonCauses {
  /** Se bajó de la bici en carretera (motor: `estado: 'abandon'`). */
  colapso: number
  /** Llegó fuera del corte de tiempo (motor: `estado: 'dnf'`). */
  fueraControl: number
  /** Caída con lesión: no toma la salida al día siguiente (capa de datos). */
  lesion: number
  /** Enfermó durante la carrera: no toma la salida al día siguiente (capa de datos). */
  enfermedad: number
}

/**
 * EL REPARTO DE CAUSAS EN PORCENTAJE (v20, docs/motor.md §VI.3), agrupado como lo agrupan las listas
 * de abandonos de las grandes vueltas reales y no como lo agrupaba la tabla vieja.
 *
 * **La CAÍDA se cuenta entera**, junta el `lesion` de la capa de datos —terminó la etapa y no toma la
 * salida mañana— y el `colapso` del motor —se bajó de la bici hoy—, porque desde la v20 el colapso lo
 * produce el corredor en apuros, que es un caído. En «crash/injury» de una lista real están los dos.
 */
export interface AbandonMix {
  crashPct: number
  illnessPct: number
  outOfTimePct: number
}

export function abandonMix(c: AbandonCauses): AbandonMix {
  const total = Math.max(1, c.colapso + c.fueraControl + c.lesion + c.enfermedad)
  return {
    crashPct: (100 * (c.lesion + c.colapso)) / total,
    illnessPct: (100 * c.enfermedad) / total,
    outOfTimePct: (100 * c.fueraControl) / total,
  }
}

/**
 * LA COLA DE LA CARRERA en una etapa en línea (v16, docs/motor.md §9). Es la medida que le faltaba
 * al banco: el corte de tiempo, la causa «fuera de control» y la sensación de «llegan todos juntos»
 * dependen de CUÁNTO pierde el último, y eso no se puede medir sobre una etapa suelta de 40
 * corredores de laboratorio. Aquí se mide donde importa: la gran vuelta que corre el juego.
 */
export interface StageTail {
  /** `llana` · `media` · `reina`. Las contrarrelojes quedan fuera: no tienen grupos. */
  kind: string
  /** Qué etapa de la vuelta fue: sin esto, un caso raro del banco no se puede ir a mirar. */
  stageIndex: number
  /**
   * CUÁNTOS TERMINARON, y esto no es decorado: sin ello el resto de la fila se lee mal.
   *
   * `oneGroup` y `top10GapSeconds` se calculan sobre los CLASIFICADOS, así que una etapa diezmada
   * —doce supervivientes que entran juntos— sale con «un solo grupo» y «0 s del 1.º al 10.º»
   * exactamente igual que un pelotón que llega compacto, cuando son lo contrario. Peor: la brecha
   * 1.º-10.º usa `timed[9] ?? winner`, o sea que si no hay diez clasificados informa CERO.
   *
   * Se descubrió persiguiendo justamente eso: una reina con `oneGroup` que podía ser cualquiera de
   * las dos cosas y el banco no sabía decir cuál.
   */
  finishers: number
  /** Retraso del último CLASIFICADO respecto al ganador, en % de su tiempo. */
  lastGroupPct: number
  /** Grupos de tiempo en meta (relojes distintos entre los clasificados). */
  groups: number
  /** ¿Terminó el pelotón ENTERO con el mismo segundo? */
  oneGroup: boolean
  /**
   * % de los clasificados que comparten el tiempo del GANADOR. Es la otra mitad de la medida y la
   * que vigila que arreglar la cola no convierta una llana en un abanico: en una etapa llana que
   * acaba al sprint el grupo principal tiene que seguir llegando junto.
   */
  winnerGroupPct: number
  /** Brecha entre el 1.º y el 10.º del día, en segundos (SPEC 6.17). */
  top10GapSeconds: number
  /** ¿Ganó alguien llegado DESDE LA CARRETERA (fuga o ataque), y no con el grupo perseguidor? */
  wonFromMove: boolean
}

export interface GrandTourResult {
  starters: number
  finishers: number
  /** % del pelotón que abandona en las tres semanas (objetivo de §VI.3: 12-20 %). */
  abandonPct: number
  causes: AbandonCauses
  /** Veces que una etapa tocó el tope del 4 % (salvaguarda 1 de §VI.3). */
  capHitStages: number
  /** Corredores readmitidos con penalización tras el corte de tiempo (salvaguarda 1). */
  readmitted: number
  /** Etapas en las que hubo alguna readmisión. */
  readmissionStages: number
  /** Una fila por etapa en línea: cómo llegó la cola de la carrera. */
  tails: StageTail[]
}

/** El pelotón de salida: 22 equipos de 8, deterministas desde la semilla del mundo. */
function buildField(worldSeed: string): TourRider[] {
  const rng = seededRng(`${worldSeed}:gt-field`)
  const field: TourRider[] = []
  for (let t = 0; t < TEAMS; t++) {
    for (let k = 0; k < RIDERS_PER_TEAM; k++) {
      const riderId = `gt-${t}-${k}`
      const vocation = VOCATIONS[Math.floor(rng() * VOCATIONS.length)]!
      const age = sampleNpcAge(`${worldSeed}:${riderId}:age`)
      const genome = generateNpcRider(`${worldSeed}:${riderId}`, {
        division: t < WORLD_TOUR_TEAMS ? 'WT' : 'PRS',
        vocation,
        age,
      })
      field.push({
        riderId,
        teamId: `gt-team-${t}`,
        attrs: genome.attributes,
        fragility: genome.hidden.fragility,
        // Un pelotón que llega a una gran vuelta: con fondo hecho y razonablemente fresco. El
        // desgaste de las tres semanas lo pone luego `applyDailyLoad`, que es de lo que va esto.
        ctl: 55 + 25 * rng(),
        atl: 45 + 20 * rng(),
        morale: 55 + 20 * rng(),
        rec: genome.attributes.REC,
      })
    }
  }
  return field
}

const NEUTRAL_ORDERS: StageOrders = {
  role: 'libre',
  mentality: 'reservon',
  contestSprints: false,
  contestClimbs: false,
}

/**
 * Corre una gran vuelta completa y devuelve cuántos terminan y por qué se fueron los demás.
 * El bucle es el del tick: construir el campo del día con su estado, simular, aplicar la carga,
 * y decidir quién no toma la salida mañana.
 */
export function runGrandTour(worldSeed: string): GrandTourResult {
  const race = SEASON_CALENDAR.find((r) => r.id === GRAND_TOUR_ID)
  if (!race) throw new Error(`Banco de la gran vuelta: no existe ${GRAND_TOUR_ID}`)
  const field = buildField(worldSeed)
  const alive = new Map(field.map((r) => [r.riderId, { ...r }]))
  const starters = alive.size
  const causes: AbandonCauses = { colapso: 0, fueraControl: 0, lesion: 0, enfermedad: 0 }
  let capHitStages = 0
  let readmitted = 0
  let readmissionStages = 0
  const tails: StageTail[] = []
  /**
   * LA GENERAL, para que el banco corra la misma carrera que producción (v42). Desde la v42 las
   * órdenes del día miran el puesto en la general —el maillot es la carta de su equipo y no puede
   * salir de lanzador de nadie—, y un banco que no la llevara mediría un motor distinto del que
   * corre el juego. Que es, exactamente, cómo ese defecto sobrevivió hasta que el dueño lo vio.
   *
   * Es el acumulado de tiempos de meta, sin los desempates finos de `gcSort` (aquí no hacen falta:
   * el motor solo usa el puesto para saber si estás entre los primeros, y el tiempo para saber a
   * cuánto vas).
   *
   * Y SE ORDENA SOLO ENTRE LOS QUE SIGUEN EN CARRERA, que es la lección que producción ya aprendió
   * (v31): la fila de un abandonado se queda con el tiempo de las etapas que corrió, o sea MENOS que
   * el de nadie, y con él dentro el líder pasa a ser un fantasma y todo el mundo se cree a minutos
   * de alguien que se bajó de la bici.
   */
  const gcTotal = new Map<string, number>()
  const gcOrder = (ids: readonly string[]): string[] =>
    [...ids]
      .filter((id) => gcTotal.has(id))
      .sort((a, b) => gcTotal.get(a)! - gcTotal.get(b)! || (a < b ? -1 : 1))

  for (const stage of race.stages) {
    const racing = [...alive.values()]
    if (racing.length === 0) break
    const orden = gcOrder(racing.map((r) => r.riderId))
    const rank = new Map(orden.map((id, i) => [id, i + 1]))
    /**
     * EL DÉFICIT, que es la otra mitad de llevar la general (E3). El puesto dice quién es la carta
     * del equipo; el DÉFICIT es lo que el motor mira para saber quién amenaza (`gcThreatFraction`,
     * SPEC 6.9) y para decidir si al pelotón le compensa dejar irse una fuga. Con todos a cero
     * `hasGcContext` sale false y esa capa entera no se ejecutaba NUNCA en tres semanas de banco,
     * aunque en producción se ejecute cada día.
     */
    const gcLeader = orden.length > 0 ? gcTotal.get(orden[0]!)! : 0
    const orders = autoStageOrders(
      racing.map((r) => ({
        riderId: r.riderId,
        attrs: r.attrs,
        teamId: r.teamId,
        ...(rank.has(r.riderId) ? { gcRank: rank.get(r.riderId)! } : {}),
      })),
      { kind: stage.kind, timeTrial: stage.timeTrial === true },
    )
    const riders: StageRider[] = racing.map((r) => {
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
        gcDeficitSeconds: (gcTotal.get(r.riderId) ?? gcLeader) - gcLeader,
        gcRank: rank.get(r.riderId) ?? null,
        fragility: r.fragility,
        // El banco reproduce lo que hace `packages/db`, y desde la v15 eso incluye el EQUIPO: 22
        // equipos de 8 con su plan (docs/motor.md §V.1). Sin esto el banco mediría una gran vuelta
        // de 176 agentes libres, que no es la que corre el juego.
        teamId: r.teamId,
      }
    })
    const out = simulateStage(
      {
        profile: stage.profile,
        riders,
        ...(stage.timeTrial === true ? { timeTrial: true } : {}),
        // …Y SE CORRE DONDE Y CUANDO SE CORRE (v42). Una gran vuelta de tres semanas en julio en
        // Francia no tiene el clima de un sitio cualquiera: llueve el 17 % de los días y hace 23°.
        // El banco mide la carrera que el juego corre, así que también su cielo.
        lugar: {
          ...(race.country != null ? { pais: race.country } : {}),
          dia: race.startDay + stage.index - 1,
        },
      },
      // `engineVersion: 1` FIJO en la semilla, como el resto del banco (`campaignSeeds`): el
      // objetivo mide el comportamiento del motor, y si la semilla se moviera con cada versión no
      // se podría distinguir un cambio de calibración de un cambio de dados.
      stageSeed({ worldSeed, raceId: GRAND_TOUR_ID, stageDay: stage.index, engineVersion: 1 }),
    )

    // La general del día siguiente: el acumulado de los que han llegado (v42).
    for (const r of out.results) {
      if (r.estado !== 'finish') continue
      gcTotal.set(r.riderId, (gcTotal.get(r.riderId) ?? 0) + r.tiempoS - r.bonificacionS)
    }

    // 0. La COLA de la etapa (v16): a cuánto entra el último grupo y cuántos relojes distintos hay
    //    en meta. Se mide sobre los CLASIFICADOS —el que queda fuera de control ya no está en la
    //    carrera— y solo en las etapas en línea: una contrarreloj no tiene grupos que medir.
    if (stage.timeTrial !== true) {
      const timed = out.results.filter((r) => r.estado === 'finish')
      const winner = timed[0]?.tiempoS ?? 0
      if (timed.length > 0 && winner > 0) {
        const last = timed.reduce((mx, r) => Math.max(mx, r.tiempoS), winner)
        const clocks = new Set(timed.map((r) => r.tiempoS))
        tails.push({
          kind: stage.kind,
          stageIndex: stage.index,
          finishers: timed.length,
          lastGroupPct: (100 * (last - winner)) / winner,
          groups: clocks.size,
          oneGroup: clocks.size === 1,
          winnerGroupPct: (100 * timed.filter((r) => r.tiempoS === winner).length) / timed.length,
          top10GapSeconds: (timed[9]?.tiempoS ?? winner) - winner,
          wonFromMove: out.events.find((e) => e.tipo === 'meta')?.datos?.fuga === 1,
        })
      }
    }

    // 1. La carga del día sube el ATL de todos los que corrieron: es lo que hunde el TSB semana a
    //    semana y, con él, el depósito de mañana (docs/motor.md §VI.1).
    for (const r of racing) {
      const tss = stageTss(out.workUnits.get(r.riderId) ?? 0)
      const load = applyDailyLoad({ ctl: r.ctl, atl: r.atl }, tss, r.rec)
      r.ctl = load.ctl
      r.atl = load.atl
    }

    // 2. Lo que decidió el MOTOR dentro de la etapa: colapso y fuera de control.
    let goneThisStage = 0
    for (const result of out.results) {
      if (result.estado === 'finish') continue
      if (result.estado === 'abandon') causes.colapso += 1
      else causes.fueraControl += 1
      alive.delete(result.riderId)
      goneThisStage += 1
    }
    const cap = Math.floor(STAGE.abandonStageCapFraction * riders.length)
    if (cap > 0 && goneThisStage >= cap) {
      capHitStages += 1
    }
    const back = out.events
      .filter((e) => e.plantilla === 'time_cut_readmitted')
      .reduce((acc, e) => acc + Number(e.datos?.count ?? 0), 0)
    if (back > 0) {
      readmitted += back
      readmissionStages += 1
    }

    // 3. Lo que decide la CAPA DE DATOS, que es la que sabe que hay un mañana: la lesión que impide
    //    tomar la salida y la enfermedad contraída en carrera (docs/motor.md §VI.3).
    const worst = new Map<string, Incident>()
    for (const inc of out.incidents) {
      const prev = worst.get(inc.riderId)
      if (!prev || inc.diasBaja > prev.diasBaja) worst.set(inc.riderId, inc)
    }
    for (const [riderId, inc] of worst) {
      if (!alive.has(riderId)) continue
      if (inc.diasBaja <= 0) continue
      if (!injuryEndsRace(inc.severidad, inc.diasBaja)) continue
      alive.delete(riderId)
      causes.lesion += 1
    }
    // La última etapa no tiene un «mañana» al que no tomar la salida.
    if (stage.index < race.stages.length) {
      for (const r of [...alive.values()]) {
        const rng = seededRng(`${worldSeed}:ill:${GRAND_TOUR_ID}:${stage.index}:${r.riderId}`)
        if (rng() >= raceIllnessProbability(r.fragility, r.ctl - r.atl)) continue
        alive.delete(r.riderId)
        causes.enfermedad += 1
      }
    }
  }

  const finishers = alive.size
  return {
    starters,
    finishers,
    abandonPct: (100 * (starters - finishers)) / starters,
    causes,
    capHitStages,
    readmitted,
    readmissionStages,
    tails,
  }
}

/** Resumen de la cola por TIPO de etapa: es la lectura que pide docs/motor.md §9. */
export interface TailStats {
  stages: number
  /** Retraso mediano del último grupo, en % del tiempo del ganador. */
  medianLastGroupPct: number
  /** …y el peor de todas las etapas de ese tipo. */
  maxLastGroupPct: number
  /** Grupos de tiempo en meta (mediana). */
  medianGroups: number
  /** % de etapas de ese tipo que terminan con el pelotón ENTERO al mismo segundo. */
  oneGroupPct: number
  /** % del pelotón que comparte el tiempo del ganador (mediana de las etapas de ese tipo). */
  medianWinnerGroupPct: number
  /** Brecha mediana 1.º-10.º, en segundos (SPEC 6.17). */
  medianTop10GapSeconds: number
  /** % de etapas ganadas DESDE LA CARRETERA (fuga o ataque que aguanta). */
  wonFromMovePct: number
}

export function tailStats(tails: StageTail[]): TailStats {
  const pcts = [...tails.map((t) => t.lastGroupPct)].sort((a, b) => a - b)
  const groups = [...tails.map((t) => t.groups)].sort((a, b) => a - b)
  const shares = [...tails.map((t) => t.winnerGroupPct)].sort((a, b) => a - b)
  const mid = <T>(v: T[]): T | undefined => v[Math.floor(v.length / 2)]
  return {
    stages: tails.length,
    medianLastGroupPct: mid(pcts) ?? 0,
    maxLastGroupPct: pcts[pcts.length - 1] ?? 0,
    medianGroups: mid(groups) ?? 0,
    medianWinnerGroupPct: mid(shares) ?? 0,
    medianTop10GapSeconds: mid([...tails.map((t) => t.top10GapSeconds)].sort((a, b) => a - b)) ?? 0,
    wonFromMovePct:
      tails.length === 0 ? 0 : (100 * tails.filter((t) => t.wonFromMove).length) / tails.length,
    oneGroupPct:
      tails.length === 0 ? 0 : (100 * tails.filter((t) => t.oneGroup).length) / tails.length,
  }
}

export interface GrandTourStats {
  runs: number
  /** Media del % de abandonos de las vueltas corridas (objetivo 12-20 %). */
  abandonPct: number
  minAbandonPct: number
  maxAbandonPct: number
  medianFinishers: number
  causes: AbandonCauses
  capHitStages: number
  readmitted: number
  readmissionStages: number
  /** La cola de la carrera por TIPO de etapa (v16): reina, media montaña y llana. */
  tails: { reina: TailStats; media: TailStats; llana: TailStats; todas: TailStats }
}

/** Corre N grandes vueltas deterministas y agrega el objetivo de §VI.3. */
export function analyzeGrandTour(runs: number): GrandTourStats {
  const causes: AbandonCauses = { colapso: 0, fueraControl: 0, lesion: 0, enfermedad: 0 }
  const pcts: number[] = []
  const finishers: number[] = []
  let capHitStages = 0
  let readmitted = 0
  let readmissionStages = 0
  const tails: StageTail[] = []
  for (let i = 0; i < runs; i++) {
    const r = runGrandTour(`gran-vuelta-${i}`)
    tails.push(...r.tails)
    pcts.push(r.abandonPct)
    finishers.push(r.finishers)
    causes.colapso += r.causes.colapso
    causes.fueraControl += r.causes.fueraControl
    causes.lesion += r.causes.lesion
    causes.enfermedad += r.causes.enfermedad
    capHitStages += r.capHitStages
    readmitted += r.readmitted
    readmissionStages += r.readmissionStages
  }
  const sorted = [...finishers].sort((a, b) => a - b)
  return {
    runs,
    abandonPct: pcts.reduce((a, b) => a + b, 0) / Math.max(1, runs),
    minAbandonPct: Math.min(...pcts),
    maxAbandonPct: Math.max(...pcts),
    medianFinishers: sorted[Math.floor(sorted.length / 2)] ?? 0,
    causes,
    capHitStages,
    readmitted,
    readmissionStages,
    tails: {
      reina: tailStats(tails.filter((t) => t.kind === 'reina')),
      media: tailStats(tails.filter((t) => t.kind === 'media')),
      llana: tailStats(tails.filter((t) => t.kind === 'llana')),
      todas: tailStats(tails),
    },
  }
}
