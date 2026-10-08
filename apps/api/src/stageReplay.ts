import {
  type Database,
  type Horizon,
  type StageSnapshotRow,
  TimelineUnavailableError,
  getCurrentWorld,
  getGcThroughStage,
  getKomClassification,
  getOwnRiderIds,
  getPointsClassification,
  getRaceRiderIdentities,
  getStageNonFinishers,
  getStageResults,
  getStageSnapshot,
  getTeamClassifications,
  raceStagesForWorld,
  readStageTimeline,
  veilCast,
  worldHorizon,
} from '@cyclingstar/db'
import {
  type CalendarRace,
  type CalendarStage,
  SEASON_CALENDAR,
  type StageInput,
  renderAltimetrySvg,
  stagesForSeason,
} from '@cyclingstar/engine'
import {
  NO_LEADERS,
  type PreStageInfo,
  type RaceLeaders,
  type RaceRadio,
  type StageTimeline,
  currentSeason,
  raceLeaders,
  radioFromTimeline,
  radioNameableAt,
  startStateOf,
} from '@cyclingstar/shared'
import { leadersThroughStage } from './broadcastSource.js'
import {
  type ChronicleEvent,
  type ChronicleNames,
  buildChronicle,
  buildMarkers,
  buildRaceRadio,
  chronicleNames,
} from './chronicle.js'
import { type StageSpecHead, calendarStageSpec, stageHead } from './stageHistory.js'
import { congeladaComoEtapa, stageKm } from './stageRoute.js'

/**
 * LA FICHA DE UNA ETAPA DEL CALENDARIO, tal como la sirve la ruta de etapa (`StageReplay`). Sale de
 * `routes/races.ts` en el 3a (E2, docs/retransmision.md §14.2), sin cambiar nada de lo que devuelve,
 * porque la usan también el acta (`GET …/report`) y el paquete de meta (`POST …/broadcast/finish`), que
 * sirven el `StageReplay` entero de una etapa corrida, y la cabecera de la retransmisión, que necesita
 * la etapa de la edición del mundo y su etiqueta.
 */

/** La carrera y la etapa de una petición, resueltas contra el calendario y el mundo. */
export interface StageContext {
  readonly race: CalendarRace
  readonly worldId: string
  readonly season: number
  /** `${raceId}:s${season}` */
  readonly raceKey: string
  readonly day: number
  /** la de la temporada (`stagesForSeason`): de ella salen las ciudades */
  readonly ofTheSeason: CalendarStage
  /** la que corre el mundo este año: la congelada (race_routes) o, si aún no, la de la temporada */
  readonly stage: CalendarStage
  readonly km: number
  /** la etiqueta del final la pone el recorrido (stageHistory.ts) */
  readonly spec: StageSpecHead
}

/**
 * La carrera y la etapa, contra el calendario (dato del motor) ANTES de tocar la base: un raceId o un
 * día inexistentes dan null (404), no un 500 por consulta con basura. `season` es la de `?season=`;
 * sin ella, la de hoy, como siempre ha hecho la ruta de etapa (§14.2).
 */
export async function stageContextOf(
  db: Database,
  raceId: string,
  day: number,
  season?: number,
): Promise<StageContext | null> {
  const race = SEASON_CALENDAR.find((r) => r.id === raceId)
  if (!race || !race.stages[day - 1]) return null
  const world = await getCurrentWorld(db)
  if (!world) return null
  const s = season ?? currentSeason(world.currentDay)
  const raceKey = `${race.id}:s${s}`
  // La etapa que el MUNDO corre este año (congelada, o la edición de la temporada si aún no), no
  // la de la temporada 0: es la que se enseña mientras no se haya corrido (docs/generador.md §10.7).
  const frozen = (await raceStagesForWorld(db, world.worldId, raceKey, race.id, s))[day - 1]
  const ofTheSeason = stagesForSeason(race.id, s)[day - 1]
  if (!ofTheSeason) return null
  const stage = frozen ? congeladaComoEtapa(ofTheSeason, frozen) : ofTheSeason
  const km = stageKm(stage.profile.segments)
  return {
    race,
    worldId: world.worldId,
    season: s,
    raceKey,
    day,
    ofTheSeason,
    stage,
    km,
    spec: calendarStageSpec(stage, km),
  }
}

/**
 * Lo ÚNICO que un título, un aviso o una miniatura saben de una etapa (D-42): por tipo no cabe un
 * resultado. Es el `tomorrow` del paquete de meta y el `ready` de `GET /api/riders/me/last-race` (8a).
 */
export function preStageInfoOf(ctx: StageContext): PreStageInfo {
  return {
    raceName: ctx.race.name,
    season: ctx.season,
    stageDay: ctx.day,
    stageCount: ctx.race.stages.length,
    km: ctx.km,
    label: ctx.spec.label,
    stageKind: ctx.spec.kind,
  }
}

/** Lo que la retransmisión cambia de la ficha (§12.6): los sucesos con que se redacta la crónica. */
export interface StageReplayOptions {
  /**
   * Los sucesos guardados antes de redactarlos: las rutas de la retransmisión les ponen los papeles de
   * grupo de la voz (`storedWithRoles`, 6b) para quien tiene `Watch` encendido. Los marcadores de la
   * altimetría siguen leyendo los guardados.
   */
  readonly annotate?: (stored: readonly ChronicleEvent[]) => readonly ChronicleEvent[]
  /**
   * El snapshot de la etapa ya leído (null: sin correr), para no leerlo dos veces: la ruta de etapa lo
   * lee antes de decidir si sirve el resultado (`stageAccessOf`, 7b). Sin él, se lee aquí.
   */
  readonly snapshot?: StageSnapshotRow | null
  /**
   * A QUIÉN NOMBRA LA RADIO DESDE LA LÍNEA (11a; §12.10, 12-o): el horizonte de quien mira, con el que se
   * degrada el reparto del que salen los maillots y la general de salida que nombra §7.7, y de quién son
   * los corredores propios (R23.7). Sin él, el horizonte del mundo y nadie propio. `false`, sin radio: el
   * paquete de meta no la lleva (14-b) y no se construye para tirarla.
   */
  readonly radio?: RadioViewer | false
}

/** Quién mira la radio de una ficha: su horizonte y su cuenta (null, el visitante). */
export interface RadioViewer {
  readonly h: Horizon
  readonly userId: string | null
}

/**
 * Contexto de la etapa: a qué carrera pertenece y cuántas etapas tiene. Sin esto la página de etapa es
 * un callejón sin salida (docs/navegacion.md §6.3): no sabe ni su carrera ni si hay anterior/siguiente.
 * Va en todas las ramas de respuesta, corrida o no.
 */
function raceInfoOf(ctx: StageContext) {
  return {
    id: ctx.race.id,
    name: ctx.race.name,
    country: ctx.race.country ?? null,
    stageCount: ctx.race.stages.length,
  }
}

/** De dónde a dónde va la etapa ESTE año; viaja en todas las ramas, corrida o no. */
function citiesOf(ctx: StageContext) {
  return { from: ctx.ofTheSeason.from, to: ctx.ofTheSeason.to }
}

/** La ficha de una etapa sin correr: el recorrido que el mundo va a correr, nada más. */
function notRunReplayOf(ctx: StageContext) {
  const { day, spec, stage, km } = ctx
  return {
    day,
    name: spec.name,
    km,
    run: false as const,
    race: raceInfoOf(ctx),
    ...citiesOf(ctx),
    label: spec.label,
    kind: spec.kind,
    timeTrial: spec.timeTrial,
    altimetry: renderAltimetrySvg(stage.profile),
  }
}

/**
 * LA HISTORIA DE UNA ETAPA CORRIDA SE LEE DE SU SNAPSHOT, NO DEL CALENDARIO DE HOY: el recorrido que
 * se corrió y su cabecera (nombre, km, tipo y crono). El porqué y el caso de producción que lo destapó,
 * en `stageHistory.ts`.
 */
function racedOf(ctx: StageContext, snapshot: StageSnapshotRow) {
  const input = snapshot.input as StageInput
  const profile = input.profile
  const timeTrial = input.timeTrial === true
  const head = stageHead(ctx.day, ctx.spec, {
    profile,
    timeTrial,
    km: stageKm(profile.segments),
  })
  return { input, profile, timeTrial, head }
}

/**
 * LA FICHA SIN RESULTADO (§14.1, regla 1; 14-e; paso 7b): lo que la ruta de etapa sirve cuando la
 * pantalla no va a enseñar el resultado. Los obligatorios de `StageReplay` (`day`, `name`, `km`, `run` y
 * `altimetry`) y el contexto de siempre, sin los opcionales de resultado (`results`, `chronicle`, `gc`,
 * `kom`, `points`, `teamStage`, `teamGc` y `radio`), sin `leaders` ENTERO (la web de ayer lo lee con
 * `?.`; uno sin `afterStage` no pasaría su esquema) y con la altimetría sin marcas, como la de una etapa
 * sin correr (sup. E7). Ninguno de esos campos depende del desenlace. Pura: el snapshot llega leído.
 */
export function stageShellOf(ctx: StageContext, snapshot: StageSnapshotRow | null) {
  if (!snapshot) return notRunReplayOf(ctx)
  const { profile, head } = racedOf(ctx, snapshot)
  return {
    day: ctx.day,
    name: head.name,
    km: head.km,
    run: true as const,
    race: raceInfoOf(ctx),
    ...citiesOf(ctx),
    kind: head.kind,
    timeTrial: head.timeTrial,
    altimetry: renderAltimetrySvg(profile),
  }
}

/**
 * La ficha de la etapa (`StageReplay`): sin correr, corrida sin crónica o corrida con crónica y radio.
 *
 * SIN HORIZONTE, A PROPÓSITO (E2, docs/retransmision.md §10.6 y §14.1; paso 8a): lo que se sirve ya lo
 * han decidido antes de llamarla `stageAccessOf` (la ruta de etapa), la puerta del acta y la de la
 * meta, y solo llegan aquí una etapa que la pantalla va a enseñar o el modo diagnóstico. Sus lecturas,
 * todas de la tabla de §10.6, van con `worldHorizon`: la etapa entera, como la lee el tick. Una etapa
 * conocida no tiene ninguna anterior velada (lo conocido es un prefijo, D-28), así que P no cortaría.
 */
export async function stageReplayOf(
  db: Database,
  ctx: StageContext,
  opts: StageReplayOptions = {},
) {
  const { race, raceKey, day } = ctx
  const raceInfo = raceInfoOf(ctx)
  const ciudades = citiesOf(ctx)
  const snapshot =
    opts.snapshot === undefined
      ? await getStageSnapshot(db, worldHorizon, raceKey, day)
      : opts.snapshot
  if (!snapshot) return notRunReplayOf(ctx)
  const {
    input: racedInput,
    profile: racedProfile,
    timeTrial: racedTimeTrial,
    head,
  } = racedOf(ctx, snapshot)

  /**
   * LA HOJA DE LA ETAPA LLEVA TAMBIÉN A LOS QUE NO ACABARON (v50). El dueño: «los DNF no salen
   * en la clasificación de la etapa», y antes: «no sé si se retiró antes de salir o en medio».
   * La lista de salida es la del SNAPSHOT —el campo que el motor corrió ese día—, así que quien
   * está en ella y no está clasificado se retiró en carretera, y quien no está ni en ella es que
   * no tomó la salida. Ver `getStageNonFinishers`.
   */
  const started = racedInput.riders.map((r) => r.riderId)
  const results = [
    ...(await getStageResults(db, worldHorizon, raceKey, day)),
    ...(await getStageNonFinishers(db, worldHorizon, raceKey, day, started)),
  ]
  const gc = await getGcThroughStage(db, worldHorizon, raceKey, day)
  // Montaña y puntos tal como quedaron TRAS esta etapa (acumulado hasta el día `day`).
  const kom = await getKomClassification(db, worldHorizon, raceKey, day)
  const points = await getPointsClassification(db, worldHorizon, raceKey, day)
  // Clasificación por equipos: la de ESTA etapa y la acumulada tras ella, igual que la general.
  const { stage: teamStage, overall: teamGc } = await getTeamClassifications(
    db,
    worldHorizon,
    raceKey,
    day,
  )
  // LOS MAILLOTS, en dos juegos (ver `stageReplaySchema.leaders`): los de la carretera de ese
  // día —la clasificación tras la N−1, que es lo que cuenta el journal— y los de después de la
  // etapa, que es lo que muestran las tablas de esta misma página. En una carrera de UN DÍA no
  // hay ninguno: no hay clasificación anterior que arrastrar ni día siguiente que defender.
  const oneDay = race.stages.length === 1
  const onRoad = oneDay ? NO_LEADERS : await leadersThroughStage(db, raceKey, day - 1)
  const afterStage: RaceLeaders = oneDay
    ? NO_LEADERS
    : raceLeaders({ gc, points, kom, teams: teamGc })
  const leaders = { onRoad, afterStage }
  // El journal se lee de los eventos CONGELADOS al correr la etapa (no se re-simula): así siempre
  // cuadra con el resultado guardado. Las etapas corridas antes de guardarlos no tienen journal
  // detallado (no lo inventamos re-simulando, que daría una historia distinta al resultado real).
  const storedEvents = snapshot.events as ChronicleEvent[] | null
  if (!storedEvents) {
    return {
      day,
      name: head.name,
      km: head.km,
      run: true as const,
      race: raceInfo,
      ...ciudades,
      kind: head.kind,
      timeTrial: head.timeTrial,
      altimetry: renderAltimetrySvg(racedProfile),
      results,
      gc,
      kom,
      points,
      teamStage,
      teamGc,
      leaders,
      journalUnavailable: true,
    }
  }
  // La identidad de los protagonistas sale del ROSTER (dorsal, equipo, país de todos los
  // inscritos) y, para quien no esté en él, de los resultados de la etapa: los eventos están
  // congelados y hay que resolverlos con lo que haya hoy, sin romperse por lo que falte.
  const identities = await getRaceRiderIdentities(db, raceKey)
  // …y con el maillot que llevaba PUESTO ese día, que es parte de su identidad en la carretera
  // exactamente igual que el dorsal: así sale en TODAS las menciones sin tocar una sola frase.
  // El índice de identidades se construye UNA vez: lo comparten el journal y la radio, así que
  // no pueden llamar de dos maneras distintas al mismo corredor.
  const names = chronicleNames([...identities, ...results], onRoad)
  const chronicle = buildChronicle(
    opts.annotate === undefined ? storedEvents : [...opts.annotate(storedEvents)],
    names,
    // Una crono se lee por el reloj de carrera, no por el kilómetro (v18); y si se corrió contra
    // el reloj lo dice el snapshot, que es quien vio la etapa.
    { byClock: racedTimeTrial },
  )
  const altimetry = renderAltimetrySvg(racedProfile, { markers: buildMarkers(storedEvents) })
  // LA RADIO DE CARRERA, con la misma gente que el journal. `null` en las etapas corridas antes
  // de guardarla, y ahí la vista lo dice en vez de inventarla. Desde el 11a sale de la línea grabada
  // si la etapa la tiene (`radioOf`); si no, de la guardada, a la que aquí solo se le pone cara.
  const radio =
    opts.radio === false
      ? null
      : await radioOf(db, ctx, snapshot, names, results, opts.radio ?? WORLD_VIEWER)
  return {
    day,
    name: head.name,
    km: head.km,
    run: true as const,
    race: raceInfo,
    ...ciudades,
    kind: head.kind,
    timeTrial: head.timeTrial,
    altimetry,
    results,
    chronicle,
    gc,
    kom,
    points,
    teamStage,
    teamGc,
    leaders,
    ...(radio ? { radio } : {}),
  }
}

/** Lo que devuelve la ruta de etapa: un `StageReplay` (la rama sin correr lleva además `label`). */
export type StageReplayBody = Awaited<ReturnType<typeof stageReplayOf>>

/** Sin espectador: el horizonte del mundo y nadie propio. */
const WORLD_VIEWER: RadioViewer = { h: worldHorizon, userId: null }

/** Los diez primeros de una etapa conocida (12-o): la lista de seguimiento de hoy, aplicada al leer. */
const FIRST_OF_THE_STAGE = 10

/**
 * LA RADIO DE LA FICHA (E2, docs/retransmision.md §12.10 y §11.16; D-16, 12-o; paso 11a). La de la línea
 * grabada si la etapa la tiene (`radioFromTimeline`), con la política de §7.7 sobre el reparto degradado
 * por el velo de quien mira (los maillots que no son del equipo y los `namedGcTop` primeros de la
 * general de salida, más los protagonistas de los sucesos hasta cada foto), los diez primeros de la etapa
 * (en una etapa conocida no destripan, y son a quien el dueño sigue por la radio aunque no tire: el
 * ganador que viajó escondido en el pelotón) y los corredores propios de quien mira (R23.7). Quien llama
 * solo pide la ficha entera de una etapa conocida, o con `?diag=1`, o sin `SPOILER_MODE`, o fuera del
 * velo. Sin línea (corrida antes del paso 5 o con `TIMELINE_RECORD=off`) o con una lápida, la guardada de
 * siempre: `stage_snapshots.radio` se sigue escribiendo hasta el 11b (17-v).
 */
async function radioOf(
  db: Database,
  ctx: StageContext,
  snapshot: StageSnapshotRow,
  names: ChronicleNames,
  results: readonly { readonly riderId: string; readonly puesto: number; readonly dnf: boolean }[],
  viewer: RadioViewer,
): Promise<RaceRadio | null> {
  let tl: StageTimeline | null = null
  try {
    tl = await readStageTimeline(db, viewer.h, ctx.raceKey, ctx.day)
  } catch (err) {
    if (!(err instanceof TimelineUnavailableError)) throw err
  }
  if (tl === null) return buildRaceRadio(snapshot.radio, names)
  const ixOf = new Map(tl.riderIds.map((id, r) => [id, r] as const))
  const ixs = (ids: Iterable<string>): number[] =>
    [...ids].flatMap((id) => {
      const r = ixOf.get(id)
      return r === undefined ? [] : [r]
    })
  // una crono no tiene radio (la vacía, como la guardada), ni hace falta saber de quién es nadie
  const own = tl.timeTrial || viewer.userId === null ? [] : await getOwnRiderIds(db, viewer.userId)
  const cast = veilCast(tl.cast, viewer.h)
  const firstTen = results
    .filter((r) => !r.dnf)
    .sort((a, b) => a.puesto - b.puesto)
    .slice(0, FIRST_OF_THE_STAGE)
    .map((r) => r.riderId)
  return radioFromTimeline(tl, {
    riderOf: names.riderOf,
    own: new Set(ixs(own)),
    nameableAt: radioNameableAt(tl, {
      wearing: cast.riders.filter((c) => c.worn.kind !== 'team').map((c) => c.rider),
      gcTop: startStateOf(cast, tl.riderIds.length).gcTop,
      extra: ixs(firstTen),
    }),
  })
}
