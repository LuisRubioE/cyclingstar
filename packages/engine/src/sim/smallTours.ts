/**
 * EL BANCO DE LAS CARRERAS PEQUEÑAS (v23, docs/balance.md «v23»). La forma de campo y la forma de
 * pregunta que a la batería le faltaban.
 *
 * **Por qué existe.** El invariante que medía el sprint —`flat.bestSprinterWinPct` sobre
 * `llana-180`— monta **tres sprinters con SPR 84, 85 y 86** y mide el 36 %, cómodamente dentro de su
 * 30-45 %. Un campo así no existe en producción: el planificador de órdenes que corre el juego
 * (`world/autoOrders.ts`) nombra sprinter al mejor de cada equipo solo si pasa de 68 de SPR, y en un
 * campo generado de verdad **el mejor le saca 2,7 puntos de SPR efectivo al segundo** (y 5 al
 * tercero), no uno. Con tres rematadores
 * empatados el ganador lo decide el ruido y el estadístico sale bonito; con un mejor claro, no. El
 * día de juego 46 lo enseñó: **Race Arabia, cinco etapas, cinco victorias del mismo corredor**, y
 * Sharjah 4 de 5, mientras CI seguía en verde.
 *
 * Es la misma lección que `realQueens` frente a `grandTour` (v17) y `timeTrials` frente a `cri-40`
 * (v19): **lo que no se mide sobre carreras reales, no se mide.** El escenario canónico no se retira
 * —el sprint entre iguales es una pregunta legítima y sigue teniendo su objetivo—: lo que entra es
 * la pregunta de al lado, que nadie hacía.
 *
 * **Y la pregunta es de CARRERA, no de etapa.** «¿Gana las cinco?» no se contesta con un invariante
 * sobre una etapa suelta por muchas semillas que se le echen: hace falta el MISMO campo corriendo
 * las cinco etapas seguidas, con su fatiga acumulándose, que es lo que hace producción. De ahí que
 * este banco corra CARRERAS del calendario enteras y no etapas sueltas.
 *
 * Puro y determinista: todo el azar sale de `seededRng` y de `stageSeed`.
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
import { type Division, generateNpcRider, sampleNpcAge } from '../world/npc.js'

/** Una carrera del banco: cuál es y qué forma cubre. */
export interface SmallTour {
  raceId: string
  /** Qué FORMA de carrera cubre. Es el criterio de selección, y por eso se escribe. */
  why: string
}

/**
 * Las carreras del banco. Lista CERRADA, por la misma razón que las de `realQueens` y `timeTrials`:
 * un banco que se recalculara solo dejaría de ser comparable entre versiones del motor.
 *
 * Se eligen por FORMA y por HISTORIAL: las cinco primeras son, con nombre y apellidos, las carreras
 * del día de juego 46 en las que el dueño vio el defecto.
 */
export const SMALL_TOURS: readonly SmallTour[] = [
  {
    raceId: 'race-arabia',
    why: 'EL CASO DEL ENCARGO: 5 etapas (3 llanas y 2 medias) de nivel Pro Series. En producción las ganó las CINCO el mismo corredor, las cinco al sprint, con 131-133 de 133 en el tiempo del ganador.',
  },
  {
    raceId: 'race-sharjah',
    why: 'La misma forma un escalón por debajo (continental) y con una crono en medio: en producción, 4 victorias de 5 para el mismo hombre.',
  },
  {
    raceId: 'race-besseges',
    why: 'Continental de 5 etapas con TRES medias seguidas: es la carrera cuya e3 metió a 130 de 130 corredores en el mismo segundo.',
  },
  {
    raceId: 'race-provence',
    why: 'La carrera de la queja textual («etapa 2 y etapa 3 el resultado se parece demasiado»): 3 etapas de tipos DISTINTOS —llana, media y reina— que en producción dieron el mismo ganador y 4 de los 10 primeros en común.',
  },
  {
    raceId: 'race-oman',
    why: 'Pro Series de 5 etapas y la carrera de los MÁRGENES buenos: en producción se llevó una fuga en solitario por 16 s (e1) y una fuga de cuatro por 10 s (e4), que es justo el desenlace que el juego necesita y casi nunca produce.',
  },
  {
    raceId: 'race-victoria',
    why: 'Continental de 5 etapas con crono, y la otra fuga de grupo que ganó en llano (e1, tres corredores por 25 s).',
  },
  {
    raceId: 'race-down-under',
    why: 'CINCO MEDIAS SEGUIDAS y campo WorldTour: el contraste de nivel del banco y la carrera cuya e5 metió a 140 de 140 en el mismo segundo. Si la media montaña solo sabe llegar entera, aquí se ve cinco veces.',
  },
  {
    raceId: 'race-colombia',
    why: 'La vuelta LARGA del banco —9 etapas: 2 llanas, 3 medias, 3 reinas y una crono— y la que en producción salió BIEN: 9 ganadores distintos en 9 etapas. Está aquí como CONTRASTE, porque impide leer «poca variabilidad» como una propiedad de todas las carreras, y con dos lunares que vigilar: su e9 metió a 128 de 128 en el mismo segundo y su e8 dejó 51 minutos de cola.',
  },
  {
    raceId: 'race-almeria',
    why: 'LA DE UN DÍA EN LLANO, y el caso de la fuga que NO se persiguió: 210 km llanos en los que un corredor solo le sacó 4 minutos a un pelotón de 132. Está en el banco porque un margen así no es una fuga que aguanta, es un pelotón que no persiguió.',
  },
  {
    raceId: 'race-tramuntana',
    why: 'EL MISMO DEFECTO EN MONTAÑA, y en su forma extrema: clásica de un día de 210 km tipo reina en la que el ganador llegó solo y los puestos 2.º al 6.º entraron TODOS a 38 min 27 s, sin un solo `breakaway_caught` en la crónica. Es el control de que arreglar el llano arregla también el otro sitio donde el pelotón dejaba de perseguir.',
  },
] as const

const VOCATIONS: Vocation[] = ['escalada', 'velocidad', 'clasicas', 'crono', 'fondo']

/**
 * Medio minuto: la ventana dentro de la cual el espectador lee «han llegado juntos». Es la escala
 * de un final en alto —los de delante se sacan cinco o diez segundos entre ellos, no cuatro
 * minutos— y no una perilla de calibración.
 */
const LEAD_GROUP_SECONDS = 30

const NEUTRAL_ORDERS: StageOrders = {
  role: 'libre',
  mentality: 'reservon',
  contestSprints: false,
  contestClimbs: false,
}

/**
 * El pelotón de una carrera de este nivel, con la MISMA composición que `sim/realQueens.ts`: una
 * continental la corren equipos continentales con tres o cuatro invitados de categoría superior, y
 * una WorldTour, el pelotón del Tour. El nivel del campo no es decorado —de él salen cuántos
 * rematadores hay y cuánta ventaja le saca el mejor al segundo, que es toda la pregunta de este
 * banco— y por eso se comparte la tabla en vez de inventar otra.
 */
function fieldFor(level: string): { teams: number; per: number; divisions: Division[] } {
  if (level === 'WT') return { teams: 22, per: 8, divisions: ['WT', 'WT', 'WT', 'PRS'] }
  if (level === 'PRS') return { teams: 20, per: 7, divisions: ['PRS', 'PRS', 'CON'] }
  return { teams: 18, per: 7, divisions: ['CON', 'CON', 'CON', 'CON', 'PRS', 'WT'] }
}

/** Estado de un corredor entre etapas: lo mismo que `packages/db` lee para armar el día siguiente. */
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

function buildField(worldSeed: string, level: string): TourRider[] {
  const rng = seededRng(`${worldSeed}:st-field`)
  const { teams, per, divisions } = fieldFor(level)
  const field: TourRider[] = []
  for (let t = 0; t < teams; t++) {
    const division = divisions[t % divisions.length]!
    for (let k = 0; k < per; k++) {
      const riderId = `st-${t}-${k}`
      const vocation = VOCATIONS[Math.floor(rng() * VOCATIONS.length)]!
      const age = sampleNpcAge(`${worldSeed}:${riderId}:age`)
      const genome = generateNpcRider(`${worldSeed}:${riderId}`, { division, vocation, age })
      field.push({
        riderId,
        teamId: `st-team-${t}`,
        attrs: genome.attributes,
        fragility: genome.hidden.fragility,
        // Una carrera de una semana: con fondo hecho y razonablemente fresco. El desgaste de los
        // cinco días lo pone `applyDailyLoad`, igual que en la gran vuelta del banco.
        ctl: 55 + 25 * rng(),
        atl: 45 + 20 * rng(),
        morale: 55 + 20 * rng(),
        rec: genome.attributes.REC,
      })
    }
  }
  return field
}

/** Cómo terminó una etapa del banco. */
export interface TourStageRow {
  raceId: string
  stageIndex: number
  /** `llana` · `media` · `reina` · `clasica`. Las cronos no producen fila: no tienen grupos. */
  kind: string
  winnerId: string
  /** Los diez primeros, en orden: es lo que compara dos etapas de la misma carrera entre sí. */
  topTen: string[]
  /** ¿Ganó el mejor rematador del campo (el SPR más alto del día 1)? */
  bestSprinterWon: boolean
  /** Corredores que comparten el tiempo del ganador. */
  winnerGroupRiders: number
  /**
   * …y los que entran DENTRO DE MEDIO MINUTO del ganador, que es como se lee un grupo de cabeza.
   *
   * Hace falta aparte de `winnerGroupRiders`, y la razón es de reloj y no de motor: en un final en
   * alto los de delante cruzan de uno en uno con cinco o diez segundos entre ellos, así que
   * «comparten el segundo del ganador» vale 1 aunque hayan llegado juntos. La frase «una etapa
   * reina real deja llegar juntos a un grupo de 5-15» se refiere a ESTO, no al mismo segundo.
   */
  leadGroupRiders30S: number
  /** …en % de los clasificados. En una llana real es casi todo el campo; en una reina, no. */
  winnerGroupPct: number
  /** Grupos de tiempo en meta (relojes distintos entre los clasificados). */
  groups: number
  /** ¿Terminó el pelotón ENTERO con el mismo segundo? */
  oneGroup: boolean
  /** Retraso del último clasificado respecto al ganador, en % de su tiempo. */
  lastGroupPct: number
  /** ¿Ganó alguien llegado DESDE LA CARRETERA (fuga o ataque que aguanta)? */
  wonFromMove: boolean
  /**
   * Segundos que el grupo del ganador le saca al SIGUIENTE grupo. Es el número de la queja: en
   * producción las fugas que ganaron en llano lo hicieron por 240 s, 193 s, 25 s, 16 s y 10 s, y las
   * dos primeras no son una fuga que aguanta sino un pelotón que no persiguió.
   */
  marginToNextGroupS: number
  /**
   * VELOCIDAD MEDIA DEL GANADOR, en km/h. No es una medida de esta tanda: es su GUARDARRAÍL. Las
   * medianas de producción por tipo de etapa —crono 49,2 · llana 44,8 · media 42,4 · clásica 40,5 ·
   * reina 35,8— están todas dentro del rango real, así que la ley de velocidad (v19) está bien y no
   * se toca. Lo que hay que arreglar es cómo se REPARTE el campo, no a qué velocidad va; si una
   * calibración moviera estas medianas fuera de rango, la palanca sería la equivocada.
   */
  winnerKmh: number
  /**
   * Cribas LEJOS DE META narradas en la etapa (`peloton_selection`, v21). En las 81 etapas del día
   * de juego 46 este evento aparece **una sola vez**: el motor casi nunca rompe el pelotón lejos de
   * la línea, y por eso el desenlace es binario. Sube solo si la carrera se parte de verdad, así que
   * es la lectura honesta de si (c) se ha movido —no lleva objetivo, se mide y se anota—.
   */
  farSelections: number
}

export interface SmallTourRun {
  raceId: string
  level: string
  riders: number
  /** El mejor rematador del campo el día 1 y cuánta punta le saca al segundo (SPR efectivo). */
  bestSprinterId: string
  bestSprinterEdge: number
  rows: TourStageRow[]
}

/** Busca una carrera del calendario, con un error que dice qué falta si no está. */
function findRace(raceId: string) {
  const race = SEASON_CALENDAR.find((r) => r.id === raceId)
  if (!race) throw new Error(`Banco de carreras pequeñas: no existe ${raceId}`)
  return race
}

/**
 * Corre una carrera del banco de principio a fin con el MISMO campo, día a día. El bucle es el del
 * tick de producción y el mismo de `sim/grandTour.ts`: armar el campo del día con su estado,
 * simular, aplicar la carga y decidir quién no toma la salida mañana.
 */
export function runSmallTour(tour: SmallTour, run: number): SmallTourRun {
  const race = findRace(tour.raceId)
  const worldSeed = `carrera-pequena-${tour.raceId}-${run}`
  const field = buildField(worldSeed, race.level)
  const alive = new Map(field.map((r) => [r.riderId, { ...r }]))
  const startRiders = alive.size
  const rows: TourStageRow[] = []
  let bestSprinterId = ''
  let bestSprinterEdge = 0

  for (const stage of race.stages) {
    const racing = [...alive.values()]
    if (racing.length === 0) break
    const orders = autoStageOrders(
      racing.map((r) => ({ riderId: r.riderId, attrs: r.attrs, teamId: r.teamId })),
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
        gcDeficitSeconds: 0,
        fragility: r.fragility,
        teamId: r.teamId,
      }
    })
    // EL MEJOR REMATADOR DEL CAMPO, fijado el día 1 y con el campo entero en la salida: es «el
    // sprinter de la carrera», el que el dueño ve ganarlo todo. Se mide sobre el SPR EFECTIVO
    // —forma, frescura y moral incluidas— porque es el que decide el sprint, no el del genoma.
    if (bestSprinterId === '') {
      const bySpr = [...riders].sort(
        (a, b) => b.eff0.SPR - a.eff0.SPR || (a.riderId < b.riderId ? -1 : 1),
      )
      bestSprinterId = bySpr[0]?.riderId ?? ''
      bestSprinterEdge = (bySpr[0]?.eff0.SPR ?? 0) - (bySpr[1]?.eff0.SPR ?? 0)
    }

    const out = simulateStage(
      {
        profile: stage.profile,
        riders,
        ...(stage.timeTrial === true ? { timeTrial: true } : {}),
      },
      // `engineVersion: 1` FIJO en la semilla, como el resto del banco: el objetivo mide el
      // comportamiento del motor, no los dados, y si la semilla se moviera con cada versión no se
      // podría distinguir una calibración de un cambio de azar.
      stageSeed({ worldSeed, raceId: tour.raceId, stageDay: stage.index, engineVersion: 1 }),
    )

    if (stage.timeTrial !== true) {
      const timed = out.results.filter((r) => r.estado === 'finish')
      const winner = timed[0]
      if (winner && winner.tiempoS > 0) {
        const winnerTime = winner.tiempoS
        const last = timed.reduce((mx, r) => Math.max(mx, r.tiempoS), winnerTime)
        const clocks = new Set(timed.map((r) => r.tiempoS))
        const withWinner = timed.filter((r) => r.tiempoS === winnerTime).length
        const nextClock = timed.reduce(
          (mn, r) => (r.tiempoS > winnerTime ? Math.min(mn, r.tiempoS) : mn),
          Number.POSITIVE_INFINITY,
        )
        const km = stage.profile.segments.reduce((sum, seg) => sum + seg.km, 0)
        rows.push({
          raceId: tour.raceId,
          stageIndex: stage.index,
          kind: stage.kind,
          winnerId: winner.riderId,
          topTen: timed.slice(0, 10).map((r) => r.riderId),
          bestSprinterWon: winner.riderId === bestSprinterId,
          winnerGroupRiders: withWinner,
          leadGroupRiders30S: timed.filter((r) => r.tiempoS - winnerTime <= LEAD_GROUP_SECONDS)
            .length,
          winnerGroupPct: (100 * withWinner) / timed.length,
          groups: clocks.size,
          oneGroup: clocks.size === 1,
          lastGroupPct: (100 * (last - winnerTime)) / winnerTime,
          wonFromMove: out.events.find((e) => e.tipo === 'meta')?.datos?.fuga === 1,
          marginToNextGroupS: Number.isFinite(nextClock) ? nextClock - winnerTime : 0,
          winnerKmh: km / (winnerTime / 3600),
          farSelections: out.events.filter((e) => e.plantilla === 'peloton_selection').length,
        })
      }
    }

    // La carga del día, y lo que decide quién no toma la salida mañana. Es el bucle del tick, igual
    // que en `sim/grandTour.ts`: sin él las cinco etapas las correría un campo eternamente fresco.
    for (const r of racing) {
      const tss = stageTss(out.workUnits.get(r.riderId) ?? 0)
      const load = applyDailyLoad({ ctl: r.ctl, atl: r.atl }, tss, r.rec)
      r.ctl = load.ctl
      r.atl = load.atl
    }
    for (const result of out.results) {
      if (result.estado === 'finish') continue
      alive.delete(result.riderId)
    }
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
    }
    if (stage.index < race.stages.length) {
      for (const r of [...alive.values()]) {
        const rng = seededRng(`${worldSeed}:ill:${tour.raceId}:${stage.index}:${r.riderId}`)
        if (rng() >= raceIllnessProbability(r.fragility, r.ctl - r.atl)) continue
        alive.delete(r.riderId)
      }
    }
  }

  return {
    raceId: tour.raceId,
    level: race.level,
    riders: startRiders,
    bestSprinterId,
    bestSprinterEdge,
    rows,
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!
}

/** Cómo llega una etapa de un TIPO dado: la foto de meta que el dueño mira. */
export interface ShapeStats {
  stages: number
  /** Grupos de tiempo en meta (mediana). */
  medianGroups: number
  /** % de los clasificados en el tiempo del ganador (mediana). */
  medianWinnerGroupPct: number
  /** …y en corredores. */
  medianWinnerGroupRiders: number
  /** Corredores que entran dentro de medio minuto del ganador: el GRUPO DE CABEZA (mediana). */
  medianLeadGroupRiders: number
  /** % de etapas de ese tipo que terminan con el campo ENTERO en el mismo segundo. */
  oneGroupPct: number
  /** Retraso mediano del último clasificado, en % del tiempo del ganador. */
  medianLastGroupPct: number
  /** % de etapas ganadas desde la carretera (fuga o ataque que aguanta). */
  wonFromMovePct: number
  /** Velocidad mediana del ganador, en km/h: el guardarraíl de la ley de velocidad. */
  medianWinnerKmh: number
  /** Cribas lejos de meta narradas por etapa (mediana) y en total. */
  farSelections: number
}

export function shapeStats(rows: TourStageRow[]): ShapeStats {
  return {
    stages: rows.length,
    medianGroups: median(rows.map((r) => r.groups)),
    medianWinnerGroupPct: median(rows.map((r) => r.winnerGroupPct)),
    medianWinnerGroupRiders: median(rows.map((r) => r.winnerGroupRiders)),
    medianLeadGroupRiders: median(rows.map((r) => r.leadGroupRiders30S)),
    oneGroupPct:
      rows.length === 0 ? 0 : (100 * rows.filter((r) => r.oneGroup).length) / rows.length,
    medianLastGroupPct: median(rows.map((r) => r.lastGroupPct)),
    wonFromMovePct:
      rows.length === 0 ? 0 : (100 * rows.filter((r) => r.wonFromMove).length) / rows.length,
    medianWinnerKmh: median(rows.map((r) => r.winnerKmh)),
    farSelections: rows.reduce((acc, r) => acc + r.farSelections, 0),
  }
}

/** El reparto de victorias de una carrera: la pregunta «¿gana las cinco?». */
export interface WinShare {
  /** Carreras corridas (cada carrera × cada semilla cuenta una). */
  races: number
  /** Etapas de LLEGADA AGRUPADA sobre las que se mide (las que un sprinter puede ganar). */
  bunchStages: number
  /** % de esas etapas que gana el mejor rematador del campo. */
  bestSprinterWinPct: number
  /**
   * % de carreras en las que el mejor rematador se lleva TODAS las de llegada agrupada. Solo cuentan
   * las carreras con TRES o más: llevarse dos de dos es un resultado corriente y no la queja del
   * dueño, que era «gana las cinco».
   */
  sweepPct: number
  /** Carreras del banco con tres o más llegadas agrupadas, que son sobre las que se mide el barrido. */
  sweepableRaces: number
  /** Ganadores DISTINTOS por cada 100 etapas de la carrera (todas, no solo las agrupadas). */
  distinctWinnerPct: number
  /** Ventaja mediana en SPR efectivo del mejor rematador sobre el segundo, el día 1. */
  medianEdge: number
}

/**
 * ¿QUÉ ES UNA ETAPA DE LLEGADA AGRUPADA? La que llega un grupo lo bastante grande como para que el
 * sprint lo dispute un sprinter: 15 corredores es el mismo listón con el que el modelo de final
 * separa `sprint_masivo` de `sprint_reducido` (`STAGE.finishBunchMinRiders`, docs/motor.md §12). Se
 * mide sobre el DESENLACE y no sobre la etiqueta de la etapa a propósito: la queja del dueño es que
 * las medias también acaban en sprint masivo, así que contarlas por su etiqueta las dejaría fuera.
 */
const BUNCH_RIDERS = STAGE.finishBunchMinRiders

/** Con menos de tres llegadas agrupadas, «se las lleva todas» no dice nada: se las lleva dos. */
const SWEEPABLE_MIN_STAGES = 3

export function winShare(runs: SmallTourRun[]): WinShare {
  let bunchStages = 0
  let bestWins = 0
  let sweeps = 0
  let sweepable = 0
  let stages = 0
  let distinct = 0
  const edges: number[] = []
  for (const run of runs) {
    const bunch = run.rows.filter((r) => r.winnerGroupRiders >= BUNCH_RIDERS)
    const won = bunch.filter((r) => r.bestSprinterWon).length
    bunchStages += bunch.length
    bestWins += won
    if (bunch.length >= SWEEPABLE_MIN_STAGES) {
      sweepable += 1
      if (won === bunch.length) sweeps += 1
    }
    stages += run.rows.length
    distinct += new Set(run.rows.map((r) => r.winnerId)).size
    edges.push(run.bestSprinterEdge)
  }
  return {
    races: runs.length,
    bunchStages,
    bestSprinterWinPct: bunchStages === 0 ? 0 : (100 * bestWins) / bunchStages,
    sweepPct: sweepable === 0 ? 0 : (100 * sweeps) / sweepable,
    sweepableRaces: sweepable,
    distinctWinnerPct: stages === 0 ? 0 : (100 * distinct) / stages,
    medianEdge: median(edges),
  }
}

/**
 * DOS ETAPAS SEGUIDAS DE LA MISMA CARRERA, ¿SE PARECEN? La queja textual del dueño («race
 * provence… etapa 2 y etapa 3 el resultado se parece demasiado») medida como lo que es: cuántos de
 * los diez primeros de una etapa repiten entre los diez primeros de la siguiente.
 *
 * No lleva objetivo, y es a propósito: **no hay un número del ciclismo real que decir aquí**. En una
 * vuelta pequeña de verdad los diez primeros de dos sprints seguidos se parecen bastante —son los
 * mismos sprinters— y los de un sprint y una etapa de montaña, nada. Es una medida de LECTURA, para
 * que la próxima tanda sepa si el parecido sube o baja, y no un listón que calibrar a ciegas.
 */
export function topTenOverlap(runs: SmallTourRun[]): { pairs: number; medianCommon: number } {
  const commons: number[] = []
  for (const run of runs) {
    for (let i = 1; i < run.rows.length; i++) {
      const prev = new Set(run.rows[i - 1]!.topTen)
      commons.push(run.rows[i]!.topTen.filter((id) => prev.has(id)).length)
    }
  }
  return { pairs: commons.length, medianCommon: median(commons) }
}

/**
 * LOS MÁRGENES DE UNA FUGA QUE GANA EN LLANO. La otra mitad de la queja: no es que la fuga no gane
 * nunca —gana el 21 % de las llanas de producción—, es que cuando gana lo hace por CUATRO MINUTOS,
 * que no es una fuga que aguanta sino un pelotón que no persiguió.
 */
export interface MoveMargins {
  wins: number
  medianMarginS: number
  maxMarginS: number
  /** Victorias con un margen de MINUTOS (≥ 120 s): las que delatan que nadie persiguió. */
  runawayPct: number
  /** …y las del término medio realista, de 5 a 60 s, que es lo que al juego le falta. */
  closePct: number
}

/** Un margen de dos minutos en llano no es una fuga que aguanta: es un pelotón que no persiguió. */
const RUNAWAY_MARGIN_S = 120
const CLOSE_MARGIN_MIN_S = 5
const CLOSE_MARGIN_MAX_S = 60

export function moveMargins(rows: TourStageRow[]): MoveMargins {
  const wins = rows.filter((r) => r.wonFromMove)
  const margins = wins.map((r) => r.marginToNextGroupS)
  return {
    wins: wins.length,
    medianMarginS: median(margins),
    maxMarginS: margins.length === 0 ? 0 : Math.max(...margins),
    runawayPct:
      margins.length === 0
        ? 0
        : (100 * margins.filter((m) => m >= RUNAWAY_MARGIN_S).length) / margins.length,
    closePct:
      margins.length === 0
        ? 0
        : (100 * margins.filter((m) => m >= CLOSE_MARGIN_MIN_S && m <= CLOSE_MARGIN_MAX_S).length) /
          margins.length,
  }
}

export interface SmallTourStats {
  runsPerRace: number
  /** Una fila por carrera del banco, en el orden de `SMALL_TOURS`. */
  perRace: { tour: SmallTour; runs: SmallTourRun[]; share: WinShare; shape: ShapeStats }[]
  /** El reparto de victorias del banco entero: es sobre esto sobre lo que se mide el objetivo. */
  share: WinShare
  /** La foto de meta por TIPO de etapa. */
  shapes: { llana: ShapeStats; media: ShapeStats; reina: ShapeStats; todas: ShapeStats }
  /** Los márgenes de las fugas que ganan en LLANO, que es donde vivía la queja. */
  flatMargins: MoveMargins
  overlap: { pairs: number; medianCommon: number }
  /** La carrera cuyo mejor rematador más domina: el peor caso del banco. */
  worst: { tour: SmallTour; bestSprinterWinPct: number }
}

/** Corre el banco entero: cada carrera con N semillas deterministas. */
export function analyzeSmallTours(runsPerRace: number): SmallTourStats {
  const perRace: SmallTourStats['perRace'] = []
  const allRuns: SmallTourRun[] = []
  for (const tour of SMALL_TOURS) {
    const runs: SmallTourRun[] = []
    for (let i = 0; i < runsPerRace; i++) runs.push(runSmallTour(tour, i))
    allRuns.push(...runs)
    perRace.push({
      tour,
      runs,
      share: winShare(runs),
      shape: shapeStats(runs.flatMap((r) => r.rows)),
    })
  }
  const rows = allRuns.flatMap((r) => r.rows)
  const worst = perRace.reduce((mx, row) =>
    row.share.bestSprinterWinPct > mx.share.bestSprinterWinPct ? row : mx,
  )
  return {
    runsPerRace,
    perRace,
    share: winShare(allRuns),
    shapes: {
      llana: shapeStats(rows.filter((r) => r.kind === 'llana')),
      media: shapeStats(rows.filter((r) => r.kind === 'media')),
      reina: shapeStats(rows.filter((r) => r.kind === 'reina')),
      todas: shapeStats(rows),
    },
    flatMargins: moveMargins(rows.filter((r) => r.kind === 'llana')),
    overlap: topTenOverlap(allRuns),
    worst: { tour: worst.tour, bestSprinterWinPct: worst.share.bestSprinterWinPct },
  }
}
