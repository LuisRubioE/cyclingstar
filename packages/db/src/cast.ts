/**
 * EL REPARTO CONGELADO (E2, docs/retransmision.md §4.2, §7 y decisión 17-k; paso 5): quién corrió la
 * etapa, con qué equipo y equipación, con qué maillot y qué dice su rótulo, tal como era AL CORRERLA
 * (D-15). Lo arma `buildTimelineCast` al grabar, dentro de la transacción del día y en un punto de
 * guardado que solo lee (§5.5), y el grabador lo guarda en la línea: lo guardado no se reescribe (D-10),
 * así que un traspaso, un cambio de equipación o el aprendizaje de las etapas siguientes no cambian lo
 * que se ve de esta. Cada dato que sale de una etapa lleva su procedencia (`from`), que la API degrada
 * al servir con el horizonte del espectador (§7.8, §10.10).
 *
 * Casi todo llega en memoria desde `runOneStage`, que ya lo ha leído para correr la etapa: la entrada
 * (dorsal, equipo del día, puesto y déficit de salida), el país y el género de cada corredor, la
 * general de salida (`gcRows`) y los atributos leídos AL EMPEZAR, antes de que el aprendizaje los
 * cambie (8-g). A la base van tres lecturas: la equipación de los equipos del día, las victorias de
 * etapa de esta carrera hasta la N − 1 y las victorias conocidas (`knownWins`, 7-e); y los títulos del
 * día, que el diario del tick pide una vez por día (§7.4).
 */
import { SEASON_CALENDAR, type StageInput } from '@cyclingstar/engine'
import {
  type Attribute,
  BROADCAST,
  type CastRider,
  type CastTeam,
  type ChampionTitle,
  type ProfileStrip,
  SPOILER,
  type StageRef,
  type TimelineCast,
  type WornInput,
  distinctions,
  wornJerseys,
} from '@cyclingstar/shared'
import { and, eq, exists, inArray, lt, lte, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { palmares, stageResults, teams } from './schema.js'
import type { Queryable } from './titles.js'

/** Lo que `buildTimelineCast` recibe de `runOneStage` (y de quien corre etapas como él). */
export interface CastContext {
  readonly worldId: string
  /** el día de juego absoluto en que se corre la etapa */
  readonly gameDay: number
  readonly raceKey: string
  /** el id del calendario, sin temporada: de él sale la categoría (`championshipCategory`) */
  readonly raceId: string
  readonly stageDay: number
  /** `StageKind`: decide el atributo de los favoritos (8-f) */
  readonly kind: string
  readonly timeTrial: boolean
  /** la entrada congelada: `riders` está en el orden de `RiderIx` */
  readonly input: StageInput
  /** `profileStripOf` de la etapa: los puertos y su categoría, para los favoritos de una clásica */
  readonly profile: ProfileStrip
  /** país y género de cada corredor de la salida (`riders`) */
  readonly riders: ReadonlyMap<string, { readonly country: string; readonly gender: 'M' | 'F' }>
  /**
   * La general de salida, la de `runOneStage` (`gcRows`): los que siguen en carrera, ordenados con el
   * desempate del ciclismo (`gcSort.ts`), con sus puntos acumulados hasta la N − 1.
   */
  readonly gcRows: readonly {
    readonly riderId: string
    readonly puntosVolante: number
    readonly puntosMontana: number
  }[]
  /** los atributos leídos al empezar la etapa, antes del aprendizaje (8-g) */
  readonly attrsByRider: ReadonlyMap<string, Readonly<Record<Attribute, number>>>
  /** los títulos vigentes el día de la etapa (`ChampionTitleSource.titlesOn`, §7.4) */
  readonly titles: ReadonlyMap<string, readonly ChampionTitle[]>
}

/** La categoría de cada carrera del calendario: la de su campeonato o, si no lo es, élite (§4.8). */
const CATEGORY: ReadonlyMap<string, 'elite' | 'u23'> = new Map(
  SEASON_CALENDAR.map((r) => [r.id, r.championshipCategory ?? 'elite'] as const),
)

type FavouriteWhy = TimelineCast['favourites'][number]['why']

/** El atributo público que ordena a los favoritos de cada tipo (8-f). */
const ATTRIBUTE_OF: Record<FavouriteWhy, Attribute> = {
  sprint: 'SPR',
  hills: 'COL',
  climb: 'MON',
  tt: 'CRI',
  cobbles: 'PAV',
}

/**
 * EL TIPO DE FAVORITO DE LA ETAPA (8-f): llana SPR, media COL, reina MON, crono CRI; y una clásica,
 * PAV si tiene algún segmento de pavés, MON si tiene un puerto HC o de 1.ª y COL si no.
 */
export function favouriteKindOf(
  kind: string,
  timeTrial: boolean,
  input: StageInput,
  profile: ProfileStrip,
): FavouriteWhy {
  if (timeTrial || kind === 'cri') return 'tt'
  if (kind === 'llana') return 'sprint'
  if (kind === 'media') return 'hills'
  if (kind === 'reina') return 'climb'
  if (input.profile.segments.some((s) => s.tipo === 'paves')) return 'cobbles'
  return profile.climbs.some((c) => c.cat === 'HC' || c.cat === 'cat1') ? 'climb' : 'hills'
}

/**
 * LAS CLASIFICACIONES DE SALIDA (7-b): la general es `gcRows`; puntos y montaña, esas mismas filas con
 * más de cero puntos, de más a menos y, a igualdad, en el orden de la general. Es lo que dicen la API y
 * el acta (`getPointsClassification` y `getKomClassification` tiran a quien tiene cero), y no lo que la
 * lista de seguimiento del tick, que tras un prólogo vestiría de verde y azul al 2.º y al 3.º.
 */
export function startStandings(gcRows: CastContext['gcRows']): WornInput['standings'] {
  const by = (key: 'puntosVolante' | 'puntosMontana') =>
    gcRows
      .filter((r) => r[key] > 0)
      .sort((a, b) => b[key] - a[key])
      .map((r) => ({ riderId: r.riderId }))
  return {
    gc: gcRows.map((r) => ({ riderId: r.riderId })),
    points: by('puntosVolante'),
    kom: by('puntosMontana'),
  }
}

/**
 * EL REPARTO CONGELADO DE UNA ETAPA (D-15): por `RiderIx` (el orden de `input.riders`) y con los
 * equipos por primera aparición, como lo pide el grabador. `q` es el punto de guardado que solo lee
 * (§5.5): un error de una lectura lo deshace a él, nunca a la transacción del día, y deja la etapa sin
 * línea.
 */
export async function buildTimelineCast(q: Queryable, ctx: CastContext): Promise<TimelineCast> {
  const from: StageRef | null =
    ctx.stageDay > 1 ? { raceKey: ctx.raceKey, stageDay: ctx.stageDay - 1 } : null

  // Los equipos con los que se corre HOY, por primera aparición, con su equipación de hoy.
  const teamIds: string[] = []
  const teamIx = new Map<string, number>()
  for (const r of ctx.input.riders) {
    if (r.teamId == null || teamIx.has(r.teamId)) continue
    teamIx.set(r.teamId, teamIds.length)
    teamIds.push(r.teamId)
  }
  const seeds = new Map(
    teamIds.length === 0
      ? []
      : (
          await q
            .select({ id: teams.id, jerseySeed: teams.jerseySeed })
            .from(teams)
            .where(inArray(teams.id, teamIds))
        ).map((t) => [t.id, t.jerseySeed] as const),
  )
  const castTeams: CastTeam[] = teamIds.map((teamId) => {
    const jerseySeed = seeds.get(teamId)
    if (jerseySeed === undefined) throw new Error(`reparto: el equipo ${teamId} no existe`)
    return { teamId, jerseySeed }
  })

  // Las victorias de etapa de ESTA carrera hasta la N − 1 (stage_results, puesto 1).
  const stageWins = new Map<string, StageRef[]>()
  if (ctx.stageDay > 1) {
    const wins = await q
      .select({ riderId: stageResults.riderId, stageDay: stageResults.stageDay })
      .from(stageResults)
      .where(
        and(
          eq(stageResults.raceId, ctx.raceKey),
          eq(stageResults.puesto, 1),
          lt(stageResults.stageDay, ctx.stageDay),
        ),
      )
      .orderBy(stageResults.stageDay)
    for (const w of wins)
      stageWins.set(w.riderId, [
        ...(stageWins.get(w.riderId) ?? []),
        { raceKey: ctx.raceKey, stageDay: w.stageDay },
      ])
  }

  // LAS VICTORIAS CONOCIDAS (7-e): las de carreras TERMINADAS hace más de `expiryGameDays`, cuya fila
  // gc lo fecha, para que ningún velo pueda ocultarlas por construcción. EXISTS y no una unión, para
  // que una fila repetida no duplique la cuenta.
  const ids = ctx.input.riders.map((r) => r.riderId)
  const g = alias(palmares, 'g')
  const known = new Map(
    (
      await q
        .select({ riderId: palmares.riderId, n: sql<number>`count(*)::int` })
        .from(palmares)
        .where(
          and(
            eq(palmares.worldId, ctx.worldId),
            inArray(palmares.riderId, ids),
            inArray(palmares.kind, ['gc', 'stage']),
            exists(
              q
                .select({ uno: sql`1` })
                .from(g)
                .where(
                  and(
                    eq(g.worldId, palmares.worldId),
                    eq(g.raceId, palmares.raceId),
                    eq(g.season, palmares.season),
                    eq(g.kind, 'gc'),
                    lte(g.gameDay, ctx.gameDay - SPOILER.expiryGameDays),
                  ),
                ),
            ),
          ),
        )
        .groupBy(palmares.riderId)
    ).map((r) => [r.riderId, r.n] as const),
  )

  // El maillot llevado y las líneas, con la regla UCI de shared (§7.2) sobre la salida.
  const wornInput: WornInput = {
    firstDay: ctx.stageDay === 1,
    discipline: ctx.timeTrial ? 'itt' : 'road',
    category: CATEGORY.get(ctx.raceId) ?? 'elite',
    standings: startStandings(ctx.gcRows),
    standingsFrom: from,
    titles: ctx.titles,
  }
  const worn = wornJerseys(wornInput)

  const riders = ctx.input.riders.map((r, rider): CastRider => {
    const who = ctx.riders.get(r.riderId)
    if (who === undefined)
      throw new Error(`reparto: ${r.riderId} tomó la salida y no está en riders`)
    const gcRank = r.gcRank ?? null
    const gcDeficitS = gcRank === null ? null : r.gcDeficitSeconds
    return {
      rider,
      riderId: r.riderId,
      bib: r.bib ?? null,
      team: r.teamId == null ? null : (teamIx.get(r.teamId) ?? null),
      country: who.country,
      gender: who.gender,
      start: { gcRank, gcDeficitS, from: gcRank === null ? null : from },
      worn: worn.get(r.riderId) ?? { kind: 'team' },
      distinctions: distinctions(
        r.riderId,
        wornInput,
        worn,
        { gcRank, gcDeficitS },
        stageWins.get(r.riderId) ?? [],
        { gcLineTop: BROADCAST.gcLineTop },
      ),
      knownWins: known.get(r.riderId) ?? 0,
    }
  })

  // LOS FAVORITOS DE LA PREVIA (8-g): los mejores inscritos por el atributo del tipo de etapa, con los
  // valores leídos al empezar, por valor decreciente y, a igual valor, por RiderIx.
  const why = favouriteKindOf(ctx.kind, ctx.timeTrial, ctx.input, ctx.profile)
  const attr = ATTRIBUTE_OF[why]
  const favourites = ctx.input.riders
    .map((r, rider) => ({ rider, value: ctx.attrsByRider.get(r.riderId)?.[attr] ?? 0 }))
    .sort((a, b) => b.value - a.value || a.rider - b.rider)
    .slice(0, BROADCAST.previewAttrTop)
    .map(({ rider }) => ({ rider, why }))

  return { riders, teams: castTeams, favourites }
}
