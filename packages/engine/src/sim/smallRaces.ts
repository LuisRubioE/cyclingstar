/**
 * EL BANCO QUE NO EXISTÍA Y VA PRIMERO: LAS CARRERAS PEQUEÑAS DE VERDAD
 * (docs/tactica.md §7.2, paso 0).
 *
 * **Por qué hace falta habiendo ya `smallTours`.** Aquél corre carreras del calendario enteras, que
 * era la pieza que faltaba en la v23, pero arma el campo por NIVEL de carrera: una continental la
 * corren 18 equipos de 7, o sea 126 corredores. Y el dueño no mira eso. Lo que mira —y de donde sale
 * la queja que abre el rediseño táctico— es **una .2 de una semana con cinco o diez equipos de
 * cuatro a seis**: treinta corredores, una fuga de nueve, seis casas representadas dentro de ella.
 *
 * En un pelotón de 126 la fuga de nueve es el 7 % del campo y casi nunca lleva dos del mismo equipo;
 * en uno de 30 es el 30 % y la superioridad numérica dentro de la fuga es el hecho central de la
 * carrera. Son dos preguntas distintas, y hasta aquí la segunda **no tenía banco**.
 *
 * **La lista es CERRADA**, por la misma razón que la de `smallTours` y `realQueens`: un banco cuya
 * muestra cambia sola no vigila, informa.
 *
 * DOS DE LAS CUATRO CARRERAS QUE §7.2 NOMBRABA NO VALEN, y hay que decirlo en vez de sustituirlas en
 * silencio: `almeria` y `aulne` son carreras de **UN SOLO DÍA** en el calendario de hoy, y el propio
 * §7.2 pide «8 carreras reales de 3-5 etapas». Se conservan las dos que sí cumplen —`wallonia`, la
 * de la queja, y `sharjah`, el campo máximo— y las otras seis se eligen aquí con el criterio que
 * §7.2 escribió: por división y por formato, cubriendo 3, 4 y 5 etapas y de 24 a 60 corredores.
 *
 * Lo que este banco NO lleva todavía, dicho en vez de fingido: la memoria entre etapas y las
 * clasificaciones secundarias son del paso 4, y leerlas es del 16. Hoy corre con lo que existe —la
 * general acumulada y `autoStageOrders` con `gcRank`—, que es exactamente lo que hace producción.
 *
 * Puro y determinista: todo el azar sale de `seededRng` y de `stageSeed`.
 */
import { ATTRIBUTES, type Attribute, type Vocation, seededRng } from '@cyclingstar/shared'
import { applyDailyLoad, eff0, initialEnergy } from '../banister.js'
import { SEASON_CALENDAR } from '../routes/calendar.js'
import { matchCount } from '../stage/physics.js'
import { stageSeed } from '../stage/rng.js'
import { simulateStage, stageTss } from '../stage/simulate.js'
import type { StageOrders, StageRider } from '../stage/types.js'
import { autoStageOrders } from '../world/autoOrders.js'
import { type Division, generateNpcRider, sampleNpcAge } from '../world/npc.js'

/**
 * LA LISTA CERRADA. `equipos × tamaño` = el campo, y va aquí y no en `CalendarRace` porque el
 * calendario **no lleva número de equipos ni tamaño de escuadra**: eso lo decide `packages/db` por
 * división al inscribir. Así que el banco declara el reparto que quiere medir, y lo declara escrito.
 */
export interface SmallRace {
  raceId: string
  equipos: number
  tamano: number
  /** Por qué está en la lista: sin esto, dentro de un año nadie sabe qué cubría cada una. */
  why: string
}

export const SMALL_RACES: readonly SmallRace[] = [
  // La de la queja: cinco etapas de media montaña, seis casas, treinta corredores.
  { raceId: 'race-wallonia', equipos: 6, tamano: 5, why: 'la de la queja: fuga de 9, seis casas' },
  // El campo MÁXIMO del rango que el dueño describe, y con una crono dentro.
  { raceId: 'race-sharjah', equipos: 10, tamano: 6, why: 'el máximo: 60, con crono' },
  // El campo MÍNIMO, y tres etapas: el formato más corto que existe.
  { raceId: 'race-provence', equipos: 6, tamano: 4, why: 'el mínimo: 24, y solo tres días' },
  // Tres etapas con reina en medio: la general se decide el segundo día y hay dos para defenderla.
  {
    raceId: 'race-magna-grecia',
    equipos: 7,
    tamano: 4,
    why: 'reina en medio: dos días defendiendo',
  },
  // Cuatro etapas que ABREN con crono: la general existe desde el minuto uno y nadie va a cero.
  { raceId: 'race-istria', equipos: 8, tamano: 5, why: 'abre con crono: general desde el día 1' },
  // El extremo de arriba: WorldTour. El mismo formato pequeño con el mejor campo posible.
  { raceId: 'race-down-under', equipos: 9, tamano: 6, why: 'el techo: WT en formato pequeño' },
  // Dos reinas y una crono en cinco días: la carrera más dura del banco.
  { raceId: 'race-algarve', equipos: 8, tamano: 6, why: 'dos reinas y crono: la más dura' },
  // Empieza y acaba en llano: es donde el tren de sprint y el mejor rematador se ven.
  {
    raceId: 'race-besseges',
    equipos: 7,
    tamano: 5,
    why: 'llana al principio y al final: el sprint',
  },
]

/** El reparto de divisiones por nivel de carrera, el mismo que usan los otros bancos. */
function divisionsFor(level: string): Division[] {
  if (level === 'WT') return ['WT', 'WT', 'WT', 'PRS']
  if (level === 'PRS') return ['PRS', 'PRS', 'CON']
  return ['CON', 'CON', 'CON', 'CON', 'PRS', 'WT']
}

interface RaceRider {
  riderId: string
  teamId: string
  attrs: Record<Attribute, number>
  fragility: number
  ctl: number
  atl: number
  morale: number
}

/**
 * El campo con el TAMAÑO QUE DICTA LA TABLA, no el que dicta el nivel. Es la diferencia entera entre
 * este banco y `smallTours`: aquí el número de equipos y de corredores por equipo es la variable
 * independiente del experimento, así que no puede salir de otro sitio.
 */
function buildField(worldSeed: string, race: SmallRace, level: string): RaceRider[] {
  const rng = seededRng(`${worldSeed}:sr-field`)
  const divisions = divisionsFor(level)
  const field: RaceRider[] = []
  for (let t = 0; t < race.equipos; t++) {
    const division = divisions[t % divisions.length]!
    for (let k = 0; k < race.tamano; k++) {
      const riderId = `sr-${t}-${k}`
      const vocation = VOCATIONS_LOCAL[Math.floor(rng() * VOCATIONS_LOCAL.length)]!
      const genome = generateNpcRider(`${worldSeed}:${riderId}`, {
        division,
        vocation,
        age: sampleNpcAge(`${worldSeed}:${riderId}:age`, { v2: true }),
        v2: true,
      })
      field.push({
        riderId,
        teamId: `sr-team-${t}`,
        attrs: genome.attributes,
        fragility: genome.hidden.fragility,
        ctl: 55 + 25 * rng(),
        atl: 45 + 20 * rng(),
        morale: 55 + 20 * rng(),
      })
    }
  }
  return field
}

const VOCATIONS_LOCAL: Vocation[] = ['escalada', 'velocidad', 'clasicas', 'crono', 'fondo']

function findRace(raceId: string): (typeof SEASON_CALENDAR)[number] {
  const race = SEASON_CALENDAR.find((r) => r.id === raceId)
  if (!race) throw new Error(`Banco de carreras pequeñas de verdad: no existe ${raceId}`)
  return race
}

/** Cómo terminó una etapa: lo que este banco mira, que es de GRUPO y no de remate. */
export interface SmallRaceStageRow {
  raceId: string
  stageIndex: number
  kind: string
  timeTrial: boolean
  /** Cuántos corredores toman la salida ese día. */
  starters: number
  winnerId: string
  /** ¿Ganó desde la carretera (fuga/ataque) o al remate? */
  fromMove: boolean
  /** El tamaño del grupo de cabeza que se escapó, si lo hubo (0 si no hubo fuga). */
  leadGroupRiders: number
  /** CUÁNTAS CASAS distintas hay en ese grupo: el número del que va toda la queja. */
  leadGroupTeams: number
  /** El mayor número de corredores que un SOLO equipo mete en ese grupo. */
  maxSameTeamInLead: number
}

export interface SmallRaceRun {
  race: SmallRace
  run: number
  fieldSize: number
  rows: SmallRaceStageRow[]
  /** Los diez primeros de la general final, en orden. */
  gcTop: string[]
}

/**
 * Prepara el `StageInput` de un día, con la general acumulada dentro.
 *
 * Es lo mismo que hace `smallTours.ts` y lo mismo que hará `packages/db`: sin general, el motor no
 * ejecuta la capa que mira quién amenaza la carrera, y el banco mediría un motor distinto del que
 * corre el juego.
 */
export function smallRaceSetup(
  race: SmallRace,
  run: number,
  stageIndex: number,
  field: RaceRider[],
  gcTotal: Map<string, number>,
): {
  input: {
    profile: (typeof SEASON_CALENDAR)[number]['stages'][number]['profile']
    riders: StageRider[]
  }
  seed: string
} {
  const cal = findRace(race.raceId)
  const stage = cal.stages[stageIndex - 1]!
  const orden = field
    .map((r) => r.riderId)
    .filter((id) => gcTotal.has(id))
    .sort((a, b) => gcTotal.get(a)! - gcTotal.get(b)! || (a < b ? -1 : 1))
  const rank = new Map(orden.map((id, i) => [id, i + 1]))
  const gcLeader = orden.length > 0 ? gcTotal.get(orden[0]!)! : 0

  const orders = autoStageOrders(
    field.map((r) => ({
      riderId: r.riderId,
      attrs: r.attrs,
      teamId: r.teamId,
      ...(rank.has(r.riderId) ? { gcRank: rank.get(r.riderId)! } : {}),
    })),
    { kind: stage.kind, timeTrial: stage.timeTrial === true },
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
      orders: (orders.get(r.riderId) ?? NEUTRAL) as StageOrders,
      gcDeficitSeconds: (gcTotal.get(r.riderId) ?? gcLeader) - gcLeader,
      gcRank: rank.get(r.riderId) ?? null,
      fragility: r.fragility,
      teamId: r.teamId,
    }
  })
  return {
    input: { profile: stage.profile, riders },
    seed: stageSeed({
      worldSeed: `carrera-chica-${race.raceId}-${run}`,
      raceId: race.raceId,
      stageDay: stageIndex,
      engineVersion: 1,
    }),
  }
}

const NEUTRAL: StageOrders = {
  role: 'libre',
  mentality: 'reservon',
  contestSprints: false,
  contestClimbs: false,
}

/** Corre una carrera entera con el mismo campo, día a día. */
export function runSmallRace(race: SmallRace, run: number): SmallRaceRun {
  const cal = findRace(race.raceId)
  const worldSeed = `carrera-chica-${race.raceId}-${run}`
  const field = buildField(worldSeed, race, cal.level)
  const estado = new Map(field.map((r) => [r.riderId, { ...r }]))
  const gcTotal = new Map<string, number>()
  const rows: SmallRaceStageRow[] = []

  for (let i = 1; i <= cal.stages.length; i++) {
    const stage = cal.stages[i - 1]!
    const vivos = [...estado.values()]
    if (vivos.length === 0) break
    const { input, seed } = smallRaceSetup(race, run, i, vivos, gcTotal)
    const out = simulateStage(input, seed)

    const meta = out.events.find((e) => e.tipo === 'meta')
    const ganador = out.results[0]

    /**
     * LA FUGA, leída de `fuga_formada` y no del parte de meta: el evento lleva los DORSALES, que es
     * lo único con lo que se puede contar casas. Si hay varias fugas en el día se toma **la mayor**,
     * que es la que el aficionado llama «la fuga del día».
     *
     * Y cuenta la fuga tal como NACE, no la que llega: la queja del dueño —«nueve corredores y seis
     * casas»— es sobre la composición del grupo que se va, no sobre quién sobrevive en meta.
     */
    const fugas = out.events.filter((e) => e.tipo === 'fuga_formada')
    const mayor = fugas.reduce<string[]>(
      (mejor, e) => (e.protagonistas.length > mejor.length ? e.protagonistas : mejor),
      [],
    )
    const casas = new Set(mayor.map((id) => estado.get(id)?.teamId ?? '?'))
    const porCasa = new Map<string, number>()
    for (const id of mayor) {
      const t = estado.get(id)?.teamId ?? '?'
      porCasa.set(t, (porCasa.get(t) ?? 0) + 1)
    }
    const fuga = mayor.length

    if (ganador !== undefined) {
      rows.push({
        raceId: race.raceId,
        stageIndex: i,
        kind: stage.kind,
        timeTrial: stage.timeTrial === true,
        starters: vivos.length,
        winnerId: ganador.riderId,
        fromMove: meta?.datos?.fuga === 1,
        leadGroupRiders: fuga,
        leadGroupTeams: casas.size,
        maxSameTeamInLead: porCasa.size === 0 ? 0 : Math.max(...porCasa.values()),
      })
    }

    // La general y la carga del día, como en producción.
    for (const r of out.results) {
      if (r.estado !== 'finish') continue
      gcTotal.set(r.riderId, (gcTotal.get(r.riderId) ?? 0) + r.tiempoS - r.bonificacionS)
    }
    for (const r of vivos) {
      const dia = estado.get(r.riderId)
      if (!dia) continue
      const tss = stageTss(out.workUnits.get(r.riderId) ?? 40)
      const carga = applyDailyLoad({ ctl: dia.ctl, atl: dia.atl }, tss, dia.attrs.REC)
      dia.ctl = carga.ctl
      dia.atl = carga.atl
    }
  }

  const gcTop = [...gcTotal.entries()]
    .sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, 10)
    .map(([id]) => id)

  return { race, run, fieldSize: field.length, rows, gcTop }
}

export interface SmallRaceStats {
  runsPerRace: number
  races: number
  stages: number
  /** % de etapas ganadas desde la carretera, que en campo pequeño debería ser ALTO. */
  wonFromMovePct: number
  /** Mediana de corredores en el grupo de cabeza cuando hay fuga. */
  medianLeadGroupRiders: number
  /** Mediana de CASAS distintas en ese grupo: el número de la queja. */
  medianLeadGroupTeams: number
  /** % de fugas donde un solo equipo mete DOS O MÁS: la superioridad numérica, hoy invisible. */
  numericalEdgePct: number
  /** El mismo hombre gana la carrera entera: % de carreras donde el líder gana ≥ 2 etapas. */
  multiWinnerPct: number
  porCarrera: {
    raceId: string
    fieldSize: number
    wonFromMovePct: number
    medianLeadGroupTeams: number
  }[]
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[m - 1]! + s[m]!) / 2 : s[m]!
}

export function analyzeSmallRaces(runsPerRace: number): SmallRaceStats {
  const todas: SmallRaceRun[] = []
  for (const race of SMALL_RACES) {
    for (let i = 0; i < runsPerRace; i++) todas.push(runSmallRace(race, i))
  }
  const filas = todas.flatMap((r) => r.rows).filter((r) => !r.timeTrial)
  const conFuga = filas.filter((r) => r.leadGroupRiders > 0)
  const multi = todas.filter((r) => {
    const cuenta = new Map<string, number>()
    for (const f of r.rows) cuenta.set(f.winnerId, (cuenta.get(f.winnerId) ?? 0) + 1)
    return [...cuenta.values()].some((n) => n >= 2)
  }).length

  return {
    runsPerRace,
    races: SMALL_RACES.length,
    stages: filas.length,
    wonFromMovePct:
      filas.length === 0 ? 0 : (100 * filas.filter((f) => f.fromMove).length) / filas.length,
    medianLeadGroupRiders: median(conFuga.map((f) => f.leadGroupRiders)),
    medianLeadGroupTeams: median(conFuga.map((f) => f.leadGroupTeams)),
    numericalEdgePct:
      conFuga.length === 0
        ? 0
        : (100 * conFuga.filter((f) => f.maxSameTeamInLead >= 2).length) / conFuga.length,
    multiWinnerPct: todas.length === 0 ? 0 : (100 * multi) / todas.length,
    porCarrera: SMALL_RACES.map((race) => {
      const suyas = todas.filter((r) => r.race.raceId === race.raceId)
      const f = suyas.flatMap((r) => r.rows).filter((r) => !r.timeTrial)
      const cf = f.filter((r) => r.leadGroupRiders > 0)
      return {
        raceId: race.raceId,
        fieldSize: suyas[0]?.fieldSize ?? 0,
        wonFromMovePct: f.length === 0 ? 0 : (100 * f.filter((x) => x.fromMove).length) / f.length,
        medianLeadGroupTeams: median(cf.map((x) => x.leadGroupTeams)),
      }
    }),
  }
}
