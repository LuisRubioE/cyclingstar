import {
  type Database,
  type Horizon,
  type StageResultRow,
  type StageSnapshotRow,
  getCurrentWorld,
  getGcThroughStage,
  getKomClassification,
  getPointsClassification,
  getRaceRiderIdentities,
  getStageNonFinishers,
  getStageResults,
  getStageSnapshot,
  getTeamClassifications,
  raceStagesForWorld,
  teamsOfTheDay,
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
  currentSeason,
  raceLeaders,
} from '@cyclingstar/shared'
import { leadersThroughStage } from './broadcastSource.js'
import { tableChampions } from './champions.js'
import { teamClassView } from './screenShape.js'
import {
  type ChronicleEntry,
  type ChronicleEvent,
  type ChronicleNames,
  buildChronicle,
  buildMarkers,
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

/**
 * Lo que una ruta le da a la ficha ya leído o de quien mira. Hasta W4 llevaba también los sucesos con los
 * papeles de grupo de la voz para redactar la crónica (`annotate`, §12.6) y a quién nombraba la radio
 * (`radio`, 11a); W4 sacó las dos de la ficha (D-16 revocada).
 */
export interface StageReplayOptions {
  /**
   * El snapshot de la etapa ya leído (null: sin correr), para no leerlo dos veces: la ruta de etapa lo
   * lee antes de decidir si sirve el resultado (`stageAccessOf`, 7b). Sin él, se lee aquí.
   */
  readonly snapshot?: StageSnapshotRow | null
  /**
   * EL VELO DE LOS TÍTULOS (E3, docs/visual.md §8.5; 4-l, 17a): el horizonte de quien mira, con el que
   * `champions` deja fuera el título de un campeonato que no ha visto. Sale de otras carreras, que la
   * puerta de esta etapa no cubre. Sin él, el del mundo.
   */
  readonly h?: Horizon
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
    altimetry: renderAltimetrySvg(stage.profile),
    // sin tablas, nadie a quien vestir de campeón (E3, §8.5; 17a)
    champions: {},
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
 * `altimetry`) y el contexto de siempre, sin los opcionales de resultado (`results`, `gc`, `kom`,
 * `points`, `teamStage` y `teamGc`), sin `leaders` ENTERO (la web de ayer lo lee con
 * `?.`; uno sin `afterStage` no pasaría su esquema), sin campeones (no hay tablas; 17a) y con la
 * altimetría sin marcas, como la de una etapa sin correr (sup. E7). Ninguno de esos campos depende del
 * desenlace. Pura: el snapshot llega leído.
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
    altimetry: renderAltimetrySvg(profile),
    champions: {},
  }
}

/**
 * La ficha de la etapa (`StageReplay`): sin correr, o corrida con su resultado y sus clasificaciones. Sin
 * crónica ni radio desde W4 (D-16 revocada): las dos se fueron de la pantalla, y lo que no se pinta no
 * cruza (la frontera, §13.2).
 *
 * SIN HORIZONTE, A PROPÓSITO (E2, docs/retransmision.md §10.6 y §14.1; paso 8a): lo que se sirve ya lo
 * han decidido antes de llamarla `stageAccessOf` (la ruta de etapa), la puerta del acta y la de la
 * meta, y solo llegan aquí una etapa que la pantalla va a enseñar o el modo diagnóstico. Sus lecturas,
 * todas de la tabla de §10.6, van con `worldHorizon`: la etapa entera, como la lee el tick. Una etapa
 * conocida no tiene ninguna anterior velada (lo conocido es un prefijo, D-28), así que P no cortaría.
 * Salvo los títulos de campeón (`champions`, E3, 17a), que salen de los campeonatos y no de esta
 * carrera: van con el horizonte de quien mira (`opts.h`).
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
  // día —la clasificación tras la N−1, la del orden de llegada y los momentos— y los de después de la
  // etapa, que es lo que muestran las tablas de esta misma página. En una carrera de UN DÍA no
  // hay ninguno: no hay clasificación anterior que arrastrar ni día siguiente que defender.
  const oneDay = race.stages.length === 1
  const onRoad = oneDay ? NO_LEADERS : await leadersThroughStage(db, raceKey, day - 1)
  const afterStage: RaceLeaders = oneDay
    ? NO_LEADERS
    : raceLeaders({ gc, points, kom, teams: teamGc })
  const leaders = { onRoad, afterStage }
  // LOS CAMPEONES DE ESAS TABLAS (E3, docs/visual.md §8.5; 4-l, 17a): el título que lleva cada uno el
  // día de esta etapa, con la disciplina con que se corrió y la categoría de la carrera.
  const champions = await tableChampions(
    db,
    opts.h ?? worldHorizon,
    ctx.worldId,
    {
      raceKey,
      stageDay: day,
      timeTrial: racedTimeTrial,
      category: race.championshipCategory ?? 'elite',
    },
    [...results, ...gc, ...kom, ...points].map((r) => r.riderId),
  )
  // Los sucesos CONGELADOS al correr la etapa ponen las marcas de la altimetría (los puertos, las
  // volantes y lo que pasó en ellos). Las etapas corridas antes de guardarlos van sin marcas.
  const storedEvents = snapshot.events as ChronicleEvent[] | null
  const altimetry = renderAltimetrySvg(
    racedProfile,
    storedEvents ? { markers: buildMarkers(storedEvents) } : undefined,
  )
  return {
    day,
    name: head.name,
    km: head.km,
    run: true as const,
    race: raceInfo,
    ...ciudades,
    kind: head.kind,
    altimetry,
    results,
    gc,
    kom,
    points,
    // las dos por equipos, en su forma de pantalla (19d): sin la suma de puestos, que el acta y la meta,
    // fuera del serializador, llevarían si no
    teamStage: teamClassView(teamStage),
    teamGc: teamClassView(teamGc),
    leaders,
    champions,
  }
}

/** Lo que devuelve la ruta de etapa: un `StageReplay` (la rama sin correr lleva además `label`). */
export type StageReplayBody = Awaited<ReturnType<typeof stageReplayOf>>

/**
 * LOS NOMBRES DE UNA ETAPA CORRIDA, CON LA IDENTIDAD DEL DÍA (E2, docs/retransmision.md §12.7, O-07; paso
 * 12), para el acta y para la voz. Cada inscrito, con su dorsal y el equipo CON EL QUE CORRIÓ
 * (`teamOfDay`: el de la entrada de la etapa, o el del reparto de su línea), no el de hoy: un traspaso ya
 * no reescribe las crónicas viejas. Quien no está en la lista de salida, con lo de los resultados; y
 * todos con el maillot que llevaban puesto (`onRoad`, la clasificación tras la N − 1). El equipo de un
 * inscrito lo dice su identidad del día también cuando corrió sin equipo: el de los resultados es el de
 * hoy (`riders.team_id`), y `chronicleNames`, que funde cada campo con el primer valor no nulo, se lo
 * pondría a quien entonces corría por su cuenta.
 */
export async function namesOfTheDay(
  db: Database,
  raceKey: string,
  teamOfDay: ReadonlyMap<string, string | null>,
  results: readonly StageResultRow[],
  onRoad: RaceLeaders,
): Promise<ChronicleNames> {
  const identities = await getRaceRiderIdentities(db, raceKey, teamOfDay)
  const rostered = new Set(identities.map((i) => i.riderId))
  const others = results.map((r) => (rostered.has(r.riderId) ? { ...r, teamName: null } : r))
  return chronicleNames([...identities, ...others], onRoad)
}

/**
 * EL ACTA DE UNA ETAPA (E2, docs/retransmision.md §12.9): `buildChronicle` sin `live` sobre
 * `stage_snapshots.events`, con los nombres del día, en su orden (por el reloj de carrera en una crono,
 * v18). Hasta W4 la servía también la ruta de etapa como la crónica bajo el resultado (`chronicle`); el
 * dueño la retiró de la pantalla (D-16 revocada) y queda de ella lo que leen los momentos del corredor.
 * Null si la etapa no se corrió, no guardó sus sucesos (antes de la `0024`) o `h` la vela.
 */
export async function stageChronicleOf(
  db: Database,
  h: Horizon,
  ctx: StageContext,
): Promise<ChronicleEntry[] | null> {
  const snapshot = await getStageSnapshot(db, h, ctx.raceKey, ctx.day)
  const events = (snapshot?.events ?? null) as ChronicleEvent[] | null
  if (snapshot === null || events === null) return null
  const { input, timeTrial } = racedOf(ctx, snapshot)
  const results = [
    ...(await getStageResults(db, h, ctx.raceKey, ctx.day)),
    ...(await getStageNonFinishers(
      db,
      h,
      ctx.raceKey,
      ctx.day,
      input.riders.map((r) => r.riderId),
    )),
  ]
  const onRoad =
    ctx.race.stages.length === 1
      ? NO_LEADERS
      : await leadersThroughStage(db, ctx.raceKey, ctx.day - 1)
  const names = await namesOfTheDay(db, ctx.raceKey, teamsOfTheDay(input.riders), results, onRoad)
  return buildChronicle(events, names, { byClock: timeTrial })
}

/**
 * LOS MOMENTOS DE UN CORREDOR EN UNA ETAPA (E2, docs/retransmision.md §12.9, 12-k, D-47; paso 12): las
 * líneas del acta de la etapa (`stageChronicleOf`) en que el corredor es protagonista o destinatario
 * (`mentions`: el `forId` de los que tiran para él), en el orden del acta. El racimo de `groupRuns` en que
 * va cuenta como suyo: es la línea que dice que se descolgó. Los pinta la tarjeta `Your last race` en
 * lugar de `personalNarration`. Null como el acta (G: la ruta pide la última CONOCIDA, así que no
 * debería).
 */
export async function riderMomentsOf(
  db: Database,
  h: Horizon,
  ctx: StageContext,
  riderId: string,
): Promise<ChronicleEntry[] | null> {
  const acta = await stageChronicleOf(db, h, ctx)
  const isMine = (r: { readonly id?: string | null }): boolean => r.id === riderId
  return (
    acta?.filter(
      (e) => e.protagonists.some(isMine) || Object.values(e.mentions ?? {}).some(isMine),
    ) ?? null
  )
}
