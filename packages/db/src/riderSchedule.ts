import { SEASON_CALENDAR, raceLastDay, stageDayOfSeason } from '@cyclingstar/engine'
import { TRANSPORT_COST, travelTier } from '@cyclingstar/shared'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import type { Database } from './client.js'
import { type Horizon, type VeilDelta, veilDelta } from './horizon.js'
import { emitNews } from './news.js'
import { raceRosters, riders } from './schema.js'

/**
 * Días de juego en los que un corredor tiene carrera (#6): de sus convocatorias (race_rosters),
 * traducidas a días de juego absolutos según el calendario. Sirve para no
 * dejar entrenar un día de carrera en el planificador.
 */

const SEASON_DAYS = 364

/**
 * EL ABANDONO QUE `h` PUEDE VER (M, E2, docs/retransmision.md §10.6 y §11.2; sups. X2, X9 y X10; 8b):
 * el día del abandono, o null si cayó en una etapa que `h` tiene velada (`VeilDelta.abandons`). Las tres
 * puertas leen la misma máscara y a la vez, porque si una enmascarara y otra no, la otra delataría. La
 * retirada voluntaria no entra nunca en ella (10-i): es un acto del jugador, no un resultado.
 */
function abandonedDayAt(
  d: VeilDelta,
  raceKey: string,
  riderId: string,
  abandonedDay: number | null,
): number | null {
  return abandonedDay != null && d.abandons.has(`${raceKey}|${riderId}`) ? null : abandonedDay
}

/**
 * Conjunto de días de juego con carrera para el corredor, dentro de [fromDay, toDay]. M (sup. X10, 11-b;
 * 8b): con el abandono velado, los días que quedaban de la carrera siguen siendo de carrera, en el
 * planificador y en su proyección.
 */
export async function getRiderRaceDays(
  db: Database,
  h: Horizon,
  riderId: string,
  fromDay: number,
  toDay: number,
): Promise<number[]> {
  const rosters = await db
    .select({ raceId: raceRosters.raceId, abandonedDay: raceRosters.abandonedDay })
    .from(raceRosters)
    .where(eq(raceRosters.riderId, riderId))
  const d = await veilDelta(db, h)

  const days = new Set<number>()
  for (const row of rosters) {
    const raceId = row.raceId
    const abandonedDay = abandonedDayAt(d, raceId, riderId, row.abandonedDay)
    // Clave del calendario: `${raceId}:s${season}`. Una clave sin temporada no es del calendario.
    const m = /^(.*):s(\d+)$/.exec(raceId)
    if (!m) continue
    const baseId = m[1]!
    const season = Number(m[2])
    const race = SEASON_CALENDAR.find((r) => r.id === baseId)
    if (!race) continue
    for (let idx = 1; idx <= race.stages.length; idx++) {
      const gameDay = season * SEASON_DAYS + stageDayOfSeason(race, idx)
      // Si el corredor ABANDONÓ, ya no toma la salida en las etapas posteriores: esos días SÍ entrena
      // (se recupera). Solo cuentan como día de carrera las etapas hasta el día del abandono inclusive.
      if (abandonedDay != null && gameDay > abandonedDay) continue
      if (gameDay >= fromDay && gameDay <= toDay) days.add(gameDay)
    }
  }
  return [...days].sort((a, b) => a - b)
}

/*
 * ── El viaje de IDA ─────────────────────────────────────────────────────────────────────────────
 * El modelo de viajes (`shared/travel.ts`) siempre ha cobrado el desplazamiento en DOS monedas:
 * dinero (transporte + hotel) y DÍAS de trabajo. El dinero se cobra entero al congelar la
 * convocatoria, pero los días solo se aplicaban a la VUELTA (`riders.travel_until_day`, que `calendarRun.ts`
 * escribe al congelar la escuadra: último día de carrera + días de viaje). La ida no existía, y el corredor entrenaba con
 * normalidad la víspera de cruzar un océano —y el planificador se lo enseñaba como un día de
 * trabajo más, que es como lo vio el jugador—.
 *
 * Los días de ida NO se guardan en una columna: se DEDUCEN de la convocatoria (que se congela ~2
 * semanas antes) y de la residencia del corredor. Así el plan puede enseñarlos con antelación —un
 * plan que no ve el viaje no es un plan— sin escribir nada por adelantado que luego haya que
 * deshacer si el corredor cae enfermo o se le cambia la escuadra.
 */

/**
 * Días de juego que el corredor pasa VIAJANDO hacia una carrera que sale el día `startGameDay`: los
 * `k` días ANTERIORES a la salida, con `k` los días de transporte del tramo (0 en casa, 1 dentro del
 * continente, 2 intercontinental). En casa la lista es vacía: se duerme en casa y se va por la
 * mañana. Pura y determinista.
 */
export function outboundTravelDays(
  startGameDay: number,
  from: string | null,
  to: string | null,
): number[] {
  const { days } = TRANSPORT_COST[travelTier(from, to)]
  const out: number[] = []
  for (let d = startGameDay - days; d < startGameDay; d++) out.push(d)
  return out
}

/**
 * Días de juego que el corredor pasa VIAJANDO de vuelta a casa de una carrera que termina el día
 * `lastGameDay`: los `k` días POSTERIORES al último día de carrera, con el mismo `k` que la ida. Es
 * el espejo exacto de `outboundTravelDays` y coincide con lo que `calendarRun.ts` escribe en
 * `riders.travel_until_day` (`último día de carrera + k`): el viaje se cobra en las dos direcciones.
 * Pura y determinista.
 */
export function returnTravelDays(
  lastGameDay: number,
  from: string | null,
  to: string | null,
): number[] {
  const { days } = TRANSPORT_COST[travelTier(from, to)]
  const out: number[] = []
  for (let d = lastGameDay + 1; d <= lastGameDay + days; d++) out.push(d)
  return out
}

/**
 * Los días de vuelta de UNA carrera tal como los cobra el tick y los pinta el plan: la previsión de
 * `returnTravelDays`, salvo que `riders.travel_until_day` caiga dentro de los dos días siguientes a su
 * último día (el tramo más largo), en cuyo caso manda ese valor escrito. Un solo sitio para las dos
 * lecturas, para que el plan no enseñe un día que el tick no cobra (ni al revés).
 */
export function returnTravelDaysFor(
  lastGameDay: number,
  from: string | null,
  to: string | null,
  travelUntilDay: number | null,
): number[] {
  const longestTrip = TRANSPORT_COST.intercontinental.days
  if (
    travelUntilDay != null &&
    travelUntilDay > lastGameDay &&
    travelUntilDay <= lastGameDay + longestTrip
  ) {
    return Array.from({ length: travelUntilDay - lastGameDay }, (_, i) => lastGameDay + 1 + i)
  }
  return returnTravelDays(lastGameDay, from, to)
}

/** Sentido de un día de viaje: hacia la carrera (`out`) o de vuelta a casa (`back`). */
export type TravelDirection = 'out' | 'back'

/** Un día de viaje del plan: qué día, de qué carrera y en qué sentido. */
export interface RiderTravelDay {
  gameDay: number
  raceKey: string
  raceName: string
  country: string | null
  direction: TravelDirection
}

/**
 * Días de VIAJE del corredor dentro de [fromDay, toDay], en los DOS sentidos, deducidos de sus
 * convocatorias ya congeladas. Es lo que el planificador (y las órdenes) pintan como «Travel» antes
 * de que llegue el día: esos días no se entrena.
 *
 * - La IDA: los `k` días anteriores a la salida (`outboundTravelDays`).
 * - La VUELTA: los `k` días posteriores al último día de carrera (`returnTravelDays`). Antes no se
 *   deducía aquí con el argumento de que depende de dónde y cuándo acaba realmente el corredor, y
 *   el plan enseñaba medio viaje (docs/agenda.md §4.19). Pero el último día y el país se conocen
 *   de antemano igual que la salida, así que la vuelta se predice con la misma regla.
 * - Lo REAL manda sobre lo previsto: si `riders.travel_until_day` ya está escrito para una carrera
 *   (cae dentro de los dos días siguientes a su último día), la vuelta de ESA carrera llega hasta
 *   ese día y no hasta la previsión, por si la residencia del corredor cambió desde la convocatoria.
 *
 * Sin duplicados: si dos viajes caen el mismo día (una vuelta y la ida a la carrera siguiente), el
 * día sale una sola vez, y gana la IDA, que es hacia donde va el corredor. Y un día que cae dentro
 * de otra carrera suya es día de carrera, no de viaje.
 */
export async function getRiderTravelDays(
  db: Database,
  riderId: string,
  fromDay: number,
  toDay: number,
): Promise<RiderTravelDay[]> {
  const [rider] = await db
    .select({
      residence: riders.residence,
      country: riders.country,
      travelUntilDay: riders.travelUntilDay,
    })
    .from(riders)
    .where(eq(riders.id, riderId))
  if (!rider) return []
  const home = rider.residence ?? rider.country
  const rosters = await db
    .select({ raceId: raceRosters.raceId })
    .from(raceRosters)
    .where(eq(raceRosters.riderId, riderId))

  const byDay = new Map<number, RiderTravelDay>()
  const add = (day: RiderTravelDay): void => {
    if (day.gameDay < fromDay || day.gameDay > toDay) return
    const prev = byDay.get(day.gameDay)
    // La ida pisa a la vuelta el mismo día; entre dos del mismo sentido se queda la primera.
    if (!prev || (prev.direction === 'back' && day.direction === 'out')) byDay.set(day.gameDay, day)
  }
  // Los días DENTRO de una carrera (de la salida a la última etapa) nunca son de viaje: la carrera
  // manda, igual que en el tick de entrenamiento. Solo pasa con carreras encadenadas.
  const racing = new Set<number>()
  for (const { raceId } of rosters) {
    const m = /^(.*):s(\d+)$/.exec(raceId)
    if (!m) continue // una clave sin temporada no es del calendario
    const race = SEASON_CALENDAR.find((r) => r.id === m[1])
    if (!race) continue
    const season = Number(m[2])
    const startGameDay = season * SEASON_DAYS + race.startDay
    const lastGameDay = season * SEASON_DAYS + raceLastDay(race)
    const country = race.country ?? null
    const base = { raceKey: raceId, raceName: race.name, country }
    for (const gameDay of outboundTravelDays(startGameDay, home, country)) {
      add({ ...base, gameDay, direction: 'out' })
    }
    const back = returnTravelDaysFor(lastGameDay, home, country, rider.travelUntilDay)
    for (const gameDay of back) add({ ...base, gameDay, direction: 'back' })
    for (let d = startGameDay; d <= lastGameDay; d++) racing.add(d)
  }
  return [...byDay.values()]
    .filter((t) => !racing.has(t.gameDay))
    .sort((a, b) => a.gameDay - b.gameDay)
}

/**
 * Igual, pero para el MUNDO entero y un solo día: quién está hoy de camino a una carrera. Lo usa el
 * tick de entrenamiento, que no puede permitirse una consulta por corredor. Recibe la residencia ya
 * leída (el tick tiene los corredores en memoria) y devuelve solo los ids que viajan hoy.
 */
export async function ridersTravellingOutbound(
  db: Pick<Database, 'select'>,
  homeByRider: Map<string, string | null>,
  gameDay: number,
): Promise<Set<string>> {
  const ids = [...homeByRider.keys()]
  if (ids.length === 0) return new Set()
  const rosters = await db
    .select({ raceId: raceRosters.raceId, riderId: raceRosters.riderId })
    .from(raceRosters)
    .where(inArray(raceRosters.riderId, ids))

  const travelling = new Set<string>()
  for (const { raceId, riderId } of rosters) {
    if (travelling.has(riderId)) continue
    const m = /^(.*):s(\d+)$/.exec(raceId)
    if (!m) continue
    const race = SEASON_CALENDAR.find((r) => r.id === m[1])
    if (!race) continue
    const startGameDay = Number(m[2]) * SEASON_DAYS + race.startDay
    // Solo las carreras que salen en los próximos dos días pueden tener viaje hoy (el tramo más
    // largo son 2 días): descartarlas antes ahorra el cálculo en las ~40 carreras de la temporada.
    if (startGameDay <= gameDay || startGameDay > gameDay + 2) continue
    const days = outboundTravelDays(
      startGameDay,
      homeByRider.get(riderId) ?? null,
      race.country ?? null,
    )
    if (days.includes(gameDay)) travelling.add(riderId)
  }
  return travelling
}

/**
 * Espejo de `ridersTravellingOutbound` para la VUELTA: quién está hoy volviendo a casa de una carrera
 * que ya terminó. Se deduce de la convocatoria y del último día de la carrera, NO de que
 * `travel_until_day >= hoy` a secas: esa columna se escribe al CONGELAR la escuadra (~2 semanas antes
 * de la salida), así que leída sola marcaba de viaje al corredor desde la convocatoria hasta su vuelta
 * y le quitaba dos semanas de entrenamiento antes de cada carrera fuera de casa.
 */
export async function ridersTravellingBack(
  db: Pick<Database, 'select'>,
  homeByRider: Map<string, string | null>,
  travelUntilByRider: Map<string, number | null>,
  gameDay: number,
): Promise<Set<string>> {
  const ids = [...homeByRider.keys()]
  if (ids.length === 0) return new Set()
  const rosters = await db
    .select({ raceId: raceRosters.raceId, riderId: raceRosters.riderId })
    .from(raceRosters)
    .where(inArray(raceRosters.riderId, ids))

  const longestTrip = TRANSPORT_COST.intercontinental.days
  const travelling = new Set<string>()
  for (const { raceId, riderId } of rosters) {
    if (travelling.has(riderId)) continue
    const m = /^(.*):s(\d+)$/.exec(raceId)
    if (!m) continue
    const race = SEASON_CALENDAR.find((r) => r.id === m[1])
    if (!race) continue
    const lastGameDay = Number(m[2]) * SEASON_DAYS + raceLastDay(race)
    // Solo las carreras que acabaron en los dos días anteriores pueden tener vuelta hoy.
    if (lastGameDay >= gameDay || lastGameDay < gameDay - longestTrip) continue
    const days = returnTravelDaysFor(
      lastGameDay,
      homeByRider.get(riderId) ?? null,
      race.country ?? null,
      travelUntilByRider.get(riderId) ?? null,
    )
    if (days.includes(gameDay)) travelling.add(riderId)
  }
  return travelling
}

// Los resultados del corredor para su ficha viven en `riderResults.ts`: van AGRUPADOS POR CARRERA,
// con la general de titular y las etapas como desglose (docs/navegacion.md §3.6).

/** Una carrera próxima (o en curso) del corredor: nombre, clase, día de salida y cuánto falta. */
export interface RiderUpcomingRace {
  raceId: string
  /** Clave de almacenamiento de la carrera+temporada (`${raceId}:s${season}`), para órdenes/roster. */
  raceKey: string
  raceName: string
  raceClass: string
  country: string | null
  startGameDay: number
  daysUntil: number
  stageCount: number
  ongoing: boolean
  /** Dorsal del corredor en esa carrera (null si aún no se asignó). */
  bib: number | null
}

/**
 * Carreras a las que el corredor está inscrito y aún no han terminado (su convocatoria ya congelada en
 * race_rosters ~2 semanas antes). Ordenadas por día de salida; incluye las que están en curso hoy. M
 * (sup. X2; 8b): con el abandono velado, la carrera sigue en curso; unas órdenes para un corredor que ya
 * no corre se ignoran sin daño.
 */
export async function getRiderUpcomingRaces(
  db: Database,
  h: Horizon,
  riderId: string,
  currentDay: number,
): Promise<RiderUpcomingRace[]> {
  const rosters = await db
    .select({
      raceId: raceRosters.raceId,
      bib: raceRosters.bib,
      abandonedDay: raceRosters.abandonedDay,
    })
    .from(raceRosters)
    .where(eq(raceRosters.riderId, riderId))
  const d = await veilDelta(db, h)
  const out: RiderUpcomingRace[] = []
  for (const row of rosters) {
    const { raceId, bib } = row
    const abandonedDay = abandonedDayAt(d, raceId, riderId, row.abandonedDay)
    const m = /^(.*):s(\d+)$/.exec(raceId)
    if (!m) continue // una clave sin temporada no es del calendario
    const baseId = m[1]!
    const season = Number(m[2])
    const race = SEASON_CALENDAR.find((r) => r.id === baseId)
    if (!race) continue
    const startGameDay = season * SEASON_DAYS + race.startDay
    const lastGameDay = season * SEASON_DAYS + raceLastDay(race)
    if (lastGameDay < currentDay) continue // ya terminó
    if (abandonedDay != null && currentDay > abandonedDay) continue // abandonó: ya está fuera
    out.push({
      raceId: baseId,
      raceKey: raceId,
      raceName: race.name,
      raceClass: race.raceClass,
      country: race.country ?? null,
      startGameDay,
      daysUntil: startGameDay - currentDay,
      stageCount: race.stages.length,
      ongoing: startGameDay <= currentDay && currentDay <= lastGameDay,
      bib,
    })
  }
  return out.sort((a, b) => a.startGameDay - b.startGameDay)
}

// --- Retirada VOLUNTARIA de una carrera por etapas (docs/motor.md §V.5) ---------------------

/** Por qué no se puede uno retirar. `ok` cuando sí. */
export type RetireOutcome =
  | { ok: true; raceName: string; alreadyOut: false }
  | { ok: true; raceName: string; alreadyOut: true }
  | { ok: false; reason: 'no_inscrito' | 'no_en_marcha' | 'un_dia' }

/**
 * El jugador retira a su corredor de una carrera por etapas EN MARCHA (docs/motor.md §V.5): «voy
 * mal, arriesgo lesión, no voy a ganar nada — mejor retirarme y preparar otra carrera».
 *
 * Es la misma marca que usan los abandonos automáticos (`race_rosters.abandoned_day`), así que las
 * consecuencias son exactamente las mismas y no hay un segundo camino que mantener: no toma la
 * salida en las etapas siguientes, sale de la general y de las clasificaciones desde ese día, y su
 * ficha lo muestra como DNF.
 *
 * Comprobaciones, todas necesarias:
 * - que el corredor esté INSCRITO en esa carrera (roster congelado),
 * - que la carrera esté EN MARCHA (ya ha salido y no ha terminado): retirarse de una carrera que no
 *   ha empezado es renunciar a la convocatoria, que es otra cosa y no existe todavía,
 * - que sea POR ETAPAS: en una prueba de un día no hay «mañana» al que no tomar la salida,
 * - e IDEMPOTENTE: retirarse dos veces no mueve el día ni duplica el titular.
 *
 * M (E2, §11.2; sup. X9, decisión 11-j; 8b): si el corredor ya abandonó en una etapa que `h` tiene
 * velada, la respuesta es la de una retirada normal (`alreadyOut: false`) y no se escribe nada: cualquier
 * otra delataría la caída. La carrera sigue en «tus carreras» hasta que se conozca esa etapa, porque la
 * máscara de `getRiderUpcomingRaces` sigue en pie: una incoherencia aceptada (§11.2).
 */
export async function retireFromRace(
  db: Database,
  h: Horizon,
  opts: { worldId: string; riderId: string; raceKey: string; currentDay: number },
): Promise<RetireOutcome> {
  const [row] = await db
    .select({ abandonedDay: raceRosters.abandonedDay })
    .from(raceRosters)
    .where(and(eq(raceRosters.raceId, opts.raceKey), eq(raceRosters.riderId, opts.riderId)))
  if (!row) return { ok: false, reason: 'no_inscrito' }

  const m = /^(.*):s(\d+)$/.exec(opts.raceKey)
  if (!m) return { ok: false, reason: 'no_inscrito' }
  const race = SEASON_CALENDAR.find((r) => r.id === m[1])
  if (!race) return { ok: false, reason: 'no_inscrito' }
  if (race.stages.length <= 1) return { ok: false, reason: 'un_dia' }
  const season = Number(m[2])
  const startGameDay = season * SEASON_DAYS + race.startDay
  const lastGameDay = season * SEASON_DAYS + raceLastDay(race)
  if (opts.currentDay < startGameDay || opts.currentDay > lastGameDay) {
    return { ok: false, reason: 'no_en_marcha' }
  }
  if (row.abandonedDay != null) {
    const d = await veilDelta(db, h)
    const seen = abandonedDayAt(d, opts.raceKey, opts.riderId, row.abandonedDay) !== null
    return seen
      ? { ok: true, raceName: race.name, alreadyOut: true }
      : { ok: true, raceName: race.name, alreadyOut: false }
  }

  const updated = await db
    .update(raceRosters)
    .set({ abandonedDay: opts.currentDay, abandonedReason: 'voluntario' })
    .where(
      and(
        eq(raceRosters.raceId, opts.raceKey),
        eq(raceRosters.riderId, opts.riderId),
        // La carrera contra el tick: si el abandono ya se escribió entremedias, no se pisa.
        isNull(raceRosters.abandonedDay),
      ),
    )
    .returning({ riderId: raceRosters.riderId })
  if (updated.length === 0) return { ok: true, raceName: race.name, alreadyOut: true }

  // El titular, con sus datos (docs/retransmision.md §12.8): se retira ENTRE etapas, así que no lleva
  // etapa; su equipo es el de hoy, que es el del día del hecho.
  const [rider] = await db
    .select({ teamId: riders.teamId })
    .from(riders)
    .where(eq(riders.id, opts.riderId))
  await emitNews(db, {
    worldId: opts.worldId,
    gameDay: opts.currentDay,
    seed: `abandon:${opts.raceKey}:${opts.currentDay}:${opts.riderId}`,
    raceKey: opts.raceKey,
    riderId: opts.riderId,
    payload: {
      kind: 'abandon',
      raceId: race.id,
      season,
      stageDay: null,
      riderId: opts.riderId,
      teamId: rider?.teamId ?? null,
      reason: 'voluntario',
    },
  })
  return { ok: true, raceName: race.name, alreadyOut: false }
}
