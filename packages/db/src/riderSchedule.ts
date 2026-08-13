import { SEASON_CALENDAR, TEST_TOUR, raceLastDay, stageDayOfSeason } from '@cyclingstar/engine'
import { TRANSPORT_COST, travelTier } from '@cyclingstar/shared'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import type { Database } from './client.js'
import { emitNews } from './news.js'
import { raceRosters, riders } from './schema.js'

/**
 * Días de juego en los que un corredor tiene carrera (#6): de sus convocatorias (race_rosters),
 * traducidas a días de juego absolutos según la vuelta de prueba o el calendario. Sirve para no
 * dejar entrenar un día de carrera en el planificador.
 */

const SEASON_DAYS = 364

/** Conjunto de días de juego con carrera para el corredor, dentro de [fromDay, toDay]. */
export async function getRiderRaceDays(
  db: Database,
  riderId: string,
  fromDay: number,
  toDay: number,
): Promise<number[]> {
  const rosters = await db
    .select({ raceId: raceRosters.raceId, abandonedDay: raceRosters.abandonedDay })
    .from(raceRosters)
    .where(eq(raceRosters.riderId, riderId))

  const days = new Set<number>()
  for (const { raceId, abandonedDay } of rosters) {
    if (raceId === 'test-tour') {
      for (const stage of TEST_TOUR) {
        if (stage.day >= fromDay && stage.day <= toDay) days.add(stage.day)
      }
      continue
    }
    // Clave del calendario: `${raceId}:s${season}`.
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
 * convocatoria, pero los días solo se aplicaban a la VUELTA: `riders.travel_until_day` se escribe
 * cuando la carrera TERMINA (`calendarRun.ts`). La ida no existía, y el corredor entrenaba con
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

/** Un día de viaje del plan: qué día, hacia qué carrera y a cuántos días de la salida. */
export interface RiderTravelDay {
  gameDay: number
  raceKey: string
  raceName: string
  country: string | null
}

/**
 * Días de VIAJE DE IDA del corredor dentro de [fromDay, toDay], deducidos de sus convocatorias ya
 * congeladas. Es lo que el planificador pinta como «Travel» antes de que llegue el día: esos días no
 * se entrena. La VUELTA no se deduce aquí —la escribe `calendarRun.ts` en `travel_until_day` cuando
 * la carrera termina, porque depende de dónde y cuándo acabó realmente el corredor—.
 */
export async function getRiderTravelDays(
  db: Database,
  riderId: string,
  fromDay: number,
  toDay: number,
): Promise<RiderTravelDay[]> {
  const [rider] = await db
    .select({ residence: riders.residence, country: riders.country })
    .from(riders)
    .where(eq(riders.id, riderId))
  if (!rider) return []
  const home = rider.residence ?? rider.country
  const rosters = await db
    .select({ raceId: raceRosters.raceId })
    .from(raceRosters)
    .where(eq(raceRosters.riderId, riderId))

  const out: RiderTravelDay[] = []
  for (const { raceId } of rosters) {
    const m = /^(.*):s(\d+)$/.exec(raceId)
    if (!m) continue // la vuelta de prueba no viaja
    const race = SEASON_CALENDAR.find((r) => r.id === m[1])
    if (!race) continue
    const startGameDay = Number(m[2]) * SEASON_DAYS + race.startDay
    for (const gameDay of outboundTravelDays(startGameDay, home, race.country ?? null)) {
      if (gameDay < fromDay || gameDay > toDay) continue
      out.push({ gameDay, raceKey: raceId, raceName: race.name, country: race.country ?? null })
    }
  }
  return out.sort((a, b) => a.gameDay - b.gameDay)
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
 * race_rosters ~2 semanas antes). Ordenadas por día de salida; incluye las que están en curso hoy.
 */
export async function getRiderUpcomingRaces(
  db: Database,
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
  const out: RiderUpcomingRace[] = []
  for (const { raceId, bib, abandonedDay } of rosters) {
    const m = /^(.*):s(\d+)$/.exec(raceId)
    if (!m) continue // la vuelta de prueba (test-tour) no cuenta como carrera del calendario
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
 */
export async function retireFromRace(
  db: Database,
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
  if (row.abandonedDay != null) return { ok: true, raceName: race.name, alreadyOut: true }

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

  const [rider] = await db
    .select({ name: riders.name })
    .from(riders)
    .where(eq(riders.id, opts.riderId))
  await emitNews(db, {
    worldId: opts.worldId,
    gameDay: opts.currentDay,
    kind: 'abandon',
    seed: `abandon:${opts.raceKey}:${opts.currentDay}:${opts.riderId}`,
    data: { rider: rider?.name ?? 'A rider', race: race.name, detail: 'withdraws' },
    riderId: opts.riderId,
  })
  return { ok: true, raceName: race.name, alreadyOut: false }
}
