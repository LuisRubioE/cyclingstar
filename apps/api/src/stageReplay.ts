import {
  type Database,
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
} from '@cyclingstar/db'
import {
  type CalendarRace,
  type CalendarStage,
  SEASON_CALENDAR,
  type StageInput,
  renderAltimetrySvg,
  stagesForSeason,
} from '@cyclingstar/engine'
import { NO_LEADERS, type RaceLeaders, currentSeason, raceLeaders } from '@cyclingstar/shared'
import { leadersThroughStage } from './broadcastSource.js'
import {
  type ChronicleEvent,
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

/** La ficha de la etapa (`StageReplay`): sin correr, corrida sin crónica o corrida con crónica y radio. */
export async function stageReplayOf(db: Database, ctx: StageContext) {
  const { race, raceKey, day, spec, stage, km } = ctx
  // Contexto de la etapa: a qué carrera pertenece y cuántas etapas tiene. Sin esto la página de
  // etapa es un callejón sin salida (docs/navegacion.md §6.3): no sabe ni su carrera ni si hay
  // anterior/siguiente. Va en las TRES ramas de respuesta, corrida o no.
  const raceInfo = {
    id: race.id,
    name: race.name,
    country: race.country ?? null,
    stageCount: race.stages.length,
  }
  // De dónde a dónde va la etapa ESTE año; viaja en las tres ramas, corrida o no.
  const ciudades = { from: ctx.ofTheSeason.from, to: ctx.ofTheSeason.to }
  const snapshot = await getStageSnapshot(db, raceKey, day)
  if (!snapshot) {
    return {
      day,
      name: spec.name,
      km,
      run: false as const,
      race: raceInfo,
      ...ciudades,
      label: spec.label,
      kind: spec.kind,
      timeTrial: spec.timeTrial,
      altimetry: renderAltimetrySvg(stage.profile),
    }
  }
  // LA HISTORIA DE UNA ETAPA CORRIDA SE LEE DE SU SNAPSHOT, NO DEL CALENDARIO DE HOY: el
  // porqué y el caso de producción que lo destapó, en `stageHistory.ts`.
  const racedInput = snapshot.input as StageInput
  const racedProfile = racedInput.profile
  const racedTimeTrial = racedInput.timeTrial === true
  const head = stageHead(day, spec, {
    profile: racedProfile,
    timeTrial: racedTimeTrial,
    km: stageKm(racedProfile.segments),
  })

  /**
   * LA HOJA DE LA ETAPA LLEVA TAMBIÉN A LOS QUE NO ACABARON (v50). El dueño: «los DNF no salen
   * en la clasificación de la etapa», y antes: «no sé si se retiró antes de salir o en medio».
   * La lista de salida es la del SNAPSHOT —el campo que el motor corrió ese día—, así que quien
   * está en ella y no está clasificado se retiró en carretera, y quien no está ni en ella es que
   * no tomó la salida. Ver `getStageNonFinishers`.
   */
  const started = racedInput.riders.map((r) => r.riderId)
  const results = [
    ...(await getStageResults(db, raceKey, day)),
    ...(await getStageNonFinishers(db, raceKey, day, started)),
  ]
  const gc = await getGcThroughStage(db, raceKey, day)
  // Montaña y puntos tal como quedaron TRAS esta etapa (acumulado hasta el día `day`).
  const kom = await getKomClassification(db, raceKey, day)
  const points = await getPointsClassification(db, raceKey, day)
  // Clasificación por equipos: la de ESTA etapa y la acumulada tras ella, igual que la general.
  const { stage: teamStage, overall: teamGc } = await getTeamClassifications(db, raceKey, day)
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
    storedEvents,
    names,
    // Una crono se lee por el reloj de carrera, no por el kilómetro (v18); y si se corrió contra
    // el reloj lo dice el snapshot, que es quien vio la etapa.
    { byClock: racedTimeTrial },
  )
  const altimetry = renderAltimetrySvg(racedProfile, { markers: buildMarkers(storedEvents) })
  // LA RADIO DE CARRERA, con la misma gente que el journal. `null` en las etapas corridas antes
  // de guardarla, y ahí la vista lo dice en vez de inventarla. A quién se sigue lo decidió quien
  // la escribió; aquí solo se le pone cara.
  const radio = buildRaceRadio(snapshot.radio, names)
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
