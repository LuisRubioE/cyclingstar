import {
  ARCHETYPE_KEY_ATTR,
  type Attribute,
  ATTRIBUTES,
  raceIdFromKey,
  riderAge,
  seasonPosition,
  type Gender,
  type PublicRider,
  type Vocation,
} from '@cyclingstar/shared'
import {
  BANISTER,
  type CeilingOpinion,
  ceilingOpinions,
  type CoachNote,
  coachNotes,
  facilitiesTier,
  isDeclining,
  MORALE,
  type StageEffort,
} from '@cyclingstar/engine'
import { type SQL, and, desc, eq, gt, isNull, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import { type Horizon, type VeilDelta, veilDelta } from './horizon.js'
import { seasonMinus } from './ranking.js'
import {
  contracts,
  gameState,
  riderAttrLog,
  riderAttrs,
  riderDailyLog,
  riderHidden,
  riders,
  teams,
  worlds,
} from './schema.js'

/**
 * Servicios de datos del ciclista (Paso 15). La creación inserta el corredor, sus atributos
 * visibles y su genoma oculto en una transacción. Los atributos ocultos (techos, talento...)
 * nunca se exponen a la web.
 */

export interface RiderHiddenInput {
  talent: number
  fragility: number
  peakAge: number
  declineAge: number
  ceilings: Record<Attribute, number>
}

export interface CreateRiderInput {
  worldId: string
  userId: string
  name: string
  country: string
  gender: Gender
  archetype: Vocation
  birthSeason: number
  faceSeed: string
  attributes: Record<Attribute, number>
  hidden: RiderHiddenInput
}

/** Día actual y creación del mundo (epoch ms), para calcular la cuenta atrás del próximo avance. */
export async function getWorldClock(
  db: Database,
): Promise<{ currentDay: number; createdAtMs: number } | null> {
  const rows = await db
    .select({ currentDay: gameState.currentDay, createdAt: worlds.createdAt })
    .from(gameState)
    .innerJoin(worlds, eq(worlds.id, gameState.worldId))
    .limit(1)
  const row = rows[0]
  return row ? { currentDay: row.currentDay, createdAtMs: row.createdAt.getTime() } : null
}

/** Mundo actual y día de juego (o null si aún no hubo génesis). */
export async function getCurrentWorld(
  db: Database,
): Promise<{ worldId: string; currentDay: number; worldSeed: string } | null> {
  const rows = await db
    .select({
      worldId: gameState.worldId,
      currentDay: gameState.currentDay,
      worldSeed: worlds.worldSeed,
    })
    .from(gameState)
    .innerJoin(worlds, eq(worlds.id, gameState.worldId))
    .limit(1)
  const row = rows[0]
  return row ? { worldId: row.worldId, currentDay: row.currentDay, worldSeed: row.worldSeed } : null
}

/** Crea un corredor con sus atributos y su genoma oculto (una transacción). */
export async function createRider(db: Database, input: CreateRiderInput): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(riders)
      .values({
        worldId: input.worldId,
        userId: input.userId,
        name: input.name,
        country: input.country,
        residence: input.country, // un corredor nuevo vive en su país hasta que fiche por un equipo
        gender: input.gender,
        birthSeason: input.birthSeason,
        archetype: input.archetype,
        faceSeed: input.faceSeed,
        /**
         * CON LAS PIERNAS DE UN JÚNIOR, NO CON LAS DE UN CONVALECIENTE. Esto no se escribía, así que
         * el humano se quedaba con el defecto de la columna —`ctl = atl = 0`, `morale = 50`—
         * mientras todo NPC nace con 45/45/60 y `BANISTER.initialCtl` dice justamente 45.
         *
         * No era cosmético: con CTL 0 el multiplicador de depósito sale 0,90 y con 45 sale 0,99, o
         * sea que el jugador empezaba su carrera un 9 % por debajo de su propio nivel y sin que
         * nada se lo dijera. Un chaval de 18 tiene fondo hecho; lo que no tiene es nivel.
         */
        ctl: BANISTER.initialCtl,
        atl: BANISTER.initialAtl,
        morale: MORALE.mean,
      })
      .returning({ id: riders.id })

    const rider = inserted[0]
    if (!rider) {
      throw new Error('no se pudo crear el corredor')
    }

    await tx
      .insert(riderAttrs)
      .values(
        ATTRIBUTES.map((attr) => ({ riderId: rider.id, attr, value: input.attributes[attr] })),
      )

    await tx.insert(riderHidden).values({
      riderId: rider.id,
      talent: input.hidden.talent,
      ceilings: input.hidden.ceilings,
      fragility: input.hidden.fragility,
      peakAge: input.hidden.peakAge,
      declineAge: input.hidden.declineAge,
    })

    return { id: rider.id }
  })
}

/**
 * Cambia la vocación declarada (la "etiqueta") del corredor. No toca techos ni atributos: el
 * corredor decide luego alinear su entrenamiento; además influye en las convocatorias por tipo
 * de carrera (la IA lee el archetype).
 */
export async function setRiderArchetype(
  db: Database,
  riderId: string,
  archetype: Vocation,
): Promise<void> {
  await db.update(riders).set({ archetype }).where(eq(riders.id, riderId))
}

/** El ciclista del usuario (con atributos visibles), o null si aún no ha creado uno. */
/**
 * El corredor ACTIVO de un usuario. El filtro por `retiredAt` es de la v47 y es lo que hace posible
 * el relevo: cuando el rollover jubila a los 39, este hombre deja de ser «tu ciclista» —pasa a ser
 * historia, con su palmarés intacto— y el jugador puede crearse uno nuevo. Sin el filtro, el retirado
 * seguiría bloqueando la creación y la jubilación sería el final de la partida en vez de un capítulo.
 */
/**
 * CUÁNTOS CICLISTAS HA TENIDO YA ESTE USUARIO, retirados incluidos.
 *
 * Es el `intento` de la semilla de creación. `getRiderForUser` filtra por «no retirado» —solo puedes
 * tener uno VIVO— pero para sembrar hace falta contarlos todos: si no, el que se retira y empieza de
 * nuevo recibiría exactamente el mismo genoma que la primera vez, y la segunda carrera sería la
 * misma partida otra vez.
 */
export async function countRidersForUser(db: Database, userId: string): Promise<number> {
  const filas = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(riders)
    .where(eq(riders.userId, userId))
  return filas[0]?.n ?? 0
}

export async function getRiderForUser(db: Database, userId: string): Promise<PublicRider | null> {
  const riderRows = await db
    .select()
    .from(riders)
    .where(and(eq(riders.userId, userId), isNull(riders.retiredAt)))
    .limit(1)
  const rider = riderRows[0]
  if (!rider) return null

  const attrRows = await db.select().from(riderAttrs).where(eq(riderAttrs.riderId, rider.id))
  const attributes = {} as Record<Attribute, number>
  for (const attr of ATTRIBUTES) attributes[attr] = 0
  for (const row of attrRows) attributes[row.attr] = row.value

  return {
    id: rider.id,
    name: rider.name,
    country: rider.country,
    gender: rider.gender,
    archetype: rider.archetype,
    birthSeason: rider.birthSeason,
    attributes,
  }
}

export type HealthState = 'sano' | 'molestias' | 'enfermo' | 'lesionado'
export interface RiderHealth {
  state: HealthState
  /** Día de juego hasta el que dura la baja (enfermo/lesionado); null si está sano. */
  untilDay: number | null
}

/**
 * Estado de salud del corredor (sano / molestias / enfermo / lesionado) y hasta cuándo dura la baja.
 * M (E2, §10.6; sup. P5; 8b): con la caída (o la enfermedad) en una etapa que `h` tiene velada, la
 * salud de antes, que es indistinguible de la de un corredor al que no le pasó nada (§11.6, punto 3).
 */
export async function getRiderHealth(
  db: Database,
  h: Horizon,
  riderId: string,
): Promise<RiderHealth | null> {
  const rows = await db
    .select({ health: riders.health, healthUntilDay: riders.healthUntilDay })
    .from(riders)
    .where(eq(riders.id, riderId))
    .limit(1)
  const r = rows[0]
  if (!r) return null
  const before = (await veilDelta(db, h)).health.get(riderId)
  if (before !== undefined) return { state: before.health, untilDay: before.untilDay }
  return { state: r.health as HealthState, untilDay: r.healthUntilDay }
}

export interface RiderSummary {
  teamId: string | null
  teamName: string | null
  money: number
  morale: number
  fame: number
  seasonPoints: number
  /** Puesto en el ranking de la temporada (por puntos) entre los corredores en activo del mundo. */
  seasonRank: number
  /** Corredores en activo del mundo (tamaño del ranking). */
  fieldSize: number
  /** Nacionalidad (país de origen, casa familiar). */
  nationality: string
  /** País de residencia actual (dónde vive/entrena). */
  residence: string
  /** El contrato cubre el alquiler de vivienda (el equipo lo paga). */
  housingCovered: boolean
}

/**
 * Ranking de temporada por puntos entre los corredores en activo del mundo: puesto (cuántos tienen
 * más puntos, +1) y tamaño del campo. Reutilizado por la ficha propia y la pública.
 *
 * R (E2, §10.6 y §11.5, 11-f; sup. P1; 8b): el puesto es la posición en el ranking de la temporada A
 * HORIZONTE, no la cuenta de los que tienen más puntos de verdad. `seasonPoints` son ya los del
 * corredor a horizonte (los suyos menos los velados), y la cuenta de la base se corrige con los
 * corredores que tienen puntos velados, que son pocos: cada uno deja de contar por sus puntos de
 * verdad y cuenta por los suyos a horizonte. Con el velo vacío, la cuenta de siempre.
 */
export async function getSeasonRank(
  db: Database,
  h: Horizon,
  worldId: string,
  seasonPoints: number,
): Promise<{ seasonRank: number; fieldSize: number }> {
  const activeWorld = and(eq(riders.worldId, worldId), isNull(riders.retiredAt))
  const betterRows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(riders)
    .where(and(activeWorld, gt(riders.seasonPoints, seasonPoints)))
  const totalRows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(riders)
    .where(activeWorld)
  let better = betterRows[0]?.n ?? 0
  const d = await veilDelta(db, h)
  if (d.points.size > 0) {
    const veiled = await db
      .select({ id: riders.id, points: riders.seasonPoints })
      .from(riders)
      .where(and(activeWorld, sql`${riders.id} = any(${sql.param([...d.points.keys()])}::uuid[])`))
    for (const r of veiled)
      better +=
        Number(r.points - seasonMinus(d, r.id) > seasonPoints) - Number(r.points > seasonPoints)
  }
  return { seasonRank: better + 1, fieldSize: totalRows[0]?.n ?? 0 }
}

/**
 * Estado del corredor para la cabecera del perfil: equipo, dinero, moral, fama, puntos y ranking. R
 * (E2, §10.6; sups. H2 y P1; 8b): los puntos de la temporada, el dinero (sin los premios de las etapas
 * que `h` tiene veladas, `VeilDelta.money`) y el puesto, a horizonte.
 */
export async function getRiderSummary(
  db: Database,
  h: Horizon,
  riderId: string,
): Promise<RiderSummary | null> {
  const rows = await db
    .select({
      worldId: riders.worldId,
      teamId: riders.teamId,
      teamName: teams.name,
      money: riders.money,
      morale: riders.morale,
      fame: riders.fame,
      seasonPoints: riders.seasonPoints,
      nationality: riders.country,
      residence: riders.residence,
      housingCovered: contracts.payHousing,
    })
    .from(riders)
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .leftJoin(contracts, eq(contracts.riderId, riders.id))
    .where(eq(riders.id, riderId))
    .limit(1)
  const me = rows[0]
  if (!me) return null

  const d = await veilDelta(db, h)
  const seasonPoints = me.seasonPoints - seasonMinus(d, riderId)
  const rank = await getSeasonRank(db, h, me.worldId, seasonPoints)
  return {
    teamId: me.teamId,
    teamName: me.teamName,
    money: me.money - (d.money.get(riderId) ?? 0),
    morale: me.morale,
    fame: me.fame,
    seasonPoints,
    seasonRank: rank.seasonRank,
    fieldSize: rank.fieldSize,
    nationality: me.nationality,
    residence: me.residence ?? me.nationality,
    housingCovered: me.housingCovered ?? false,
  }
}

export interface DailyLogRow {
  gameDay: number
  ctl: number
  atl: number
  tsb: number
  tss: number
  activity: string
  /**
   * EL PARTE DEL DÍA DE CARRERA (v47): en qué se le fue la energía. `null` en los días de
   * entrenamiento —no hay carrera que contar— y en las etapas anteriores a la v47.
   */
  parte: StageEffort | null
}

/**
 * LOS DÍAS DE CARRERA VELADOS DE UN CORREDOR (E2, docs/retransmision.md §11.13, decisión 11-e; sups.
 * H4 y X1; 8b): día de juego → la actividad que el tick escribe para esa etapa
 * (`carrera:<raceId>:e<n>`, `stageRun.ts`), en los días de las etapas que `h` tiene veladas de las
 * carreras en cuya lista de salida está (`VeilDelta.raceDays`). Corriera o no: tras un abandono, los
 * días que quedaban pasan a ser de entrenamiento o de descanso, y enseñarlo delataría el abandono.
 */
export function veiledRaceDays(
  h: Horizon,
  d: VeilDelta,
  riderId: string,
): ReadonlyMap<number, string> {
  const days = new Set(d.raceDays.get(riderId) ?? [])
  const out = new Map<number, string>()
  for (const v of h.veil)
    if (days.has(v.gameDay))
      out.set(v.gameDay, `carrera:${raceIdFromKey(v.raceKey)}:e${v.stageDay}`)
  return out
}

/**
 * La serie de `GET /api/riders/me/form` bajo el velo (11-e): la carga se queda, porque es la condición
 * (DD-08), y en un día de carrera velado la actividad pasa a la de su etapa y el parte, a null. Es lo que
 * B1b deja cambiar en esa fila (`log.[veiledDay]`, §11.18).
 */
export function veilDailyLog(
  rows: readonly DailyLogRow[],
  veiled: ReadonlyMap<number, string>,
): DailyLogRow[] {
  return rows.map((r) => {
    const activity = veiled.get(r.gameDay)
    return activity === undefined ? r : { ...r, activity, parte: null }
  })
}

/**
 * Lo aprendido en carrera de los días velados (11-e): las filas de `rider_attr_log` con origen `carrera`
 * o `sobrecompensacion` de esos días, que se multiplican por el puesto y dicen quién terminó (sup. X1).
 * Las de `entrenamiento`, `declive` y `detraining` se quedan: no dependen de la etapa. La lista va como
 * UN parámetro de tipo array, como en `veilSql`.
 */
function notLearnedOnVeiledDays(days: readonly number[]): SQL | undefined {
  return days.length === 0
    ? undefined
    : sql`not (${riderAttrLog.source} in ('carrera', 'sobrecompensacion') and ${riderAttrLog.gameDay} = any(${sql.param([...days])}::int[]))`
}

/**
 * Serie diaria de carga/forma (SPEC 4, 11) para la gráfica del perfil, orden ascendente. F (E2, §10.6,
 * 11-e; sup. H4; 8b): un día de carrera velado se sirve como día de carrera, con la actividad de su
 * etapa y sin parte (`veilDailyLog`).
 */
export async function getDailyLog(
  db: Database,
  h: Horizon,
  riderId: string,
  limitDays: number,
): Promise<DailyLogRow[]> {
  const rows = await db
    .select({
      gameDay: riderDailyLog.gameDay,
      ctl: riderDailyLog.ctl,
      atl: riderDailyLog.atl,
      tsb: riderDailyLog.tsb,
      tss: riderDailyLog.tss,
      activity: riderDailyLog.activity,
      parte: riderDailyLog.parte,
    })
    .from(riderDailyLog)
    .where(eq(riderDailyLog.riderId, riderId))
    .orderBy(desc(riderDailyLog.gameDay))
    .limit(limitDays)
  const d = await veilDelta(db, h)
  return veilDailyLog(rows.reverse(), veiledRaceDays(h, d, riderId))
}

/**
 * LA FICHA DEL CORREDOR: tendencia, opinión del entrenador e informe del bloque
 * (docs/entrenamiento.md §2.3 y §4.6).
 *
 * Las tres consultas comparten una regla: **los ocultos no salen de aquí**. El techo se convierte en
 * una de tres frases antes de cruzar la frontera, el talento y la fragilidad en códigos de frase, y
 * `kInst` en «bajo / normal / alto». Lo que la API devuelve no permite reconstruir ni un número.
 */

/** Ventana de la flecha y del informe. 28 días, no 7 (docs/entrenamiento.md §2.3). */
export const TREND_WINDOW_DAYS = 28

export interface AttrTrendRow {
  attr: Attribute
  /** Suma de los `delta` de los últimos 28 días, con todos sus orígenes. */
  delta28: number
}

/**
 * Δ28 por atributo. Lo que NO aparece es que no se movió: la flecha de `→` se pinta con el cero, no
 * con un hueco. F (E2, §10.6, 11-e; sup. X1; 8b): sin lo aprendido en carrera los días velados.
 */
export async function getAttrTrend(
  db: Database,
  h: Horizon,
  riderId: string,
  currentDay: number,
): Promise<AttrTrendRow[]> {
  const d = await veilDelta(db, h)
  const rows = await db
    .select({
      attr: riderAttrLog.attr,
      delta28: sql<number>`sum(${riderAttrLog.delta})`.as('delta28'),
    })
    .from(riderAttrLog)
    .where(
      and(
        eq(riderAttrLog.riderId, riderId),
        gt(riderAttrLog.gameDay, currentDay - TREND_WINDOW_DAYS),
        notLearnedOnVeiledDays(d.raceDays.get(riderId) ?? []),
      ),
    )
    .groupBy(riderAttrLog.attr)
  const porAttr = new Map(rows.map((r) => [r.attr as Attribute, Number(r.delta28)]))
  return ATTRIBUTES.map((attr) => ({ attr, delta28: porAttr.get(attr) ?? 0 }))
}

export interface CoachViewRow {
  attr: Attribute
  opinion: CeilingOpinion
}

export interface CoachView {
  /**
   * Una opinión por atributo, RELATIVA al propio corredor y estable durante toda la temporada
   * (docs/agenda.md §4.20). Ninguna dice un nivel: dicen dónde tiene más margen y dónde menos.
   */
  ceilings: CoachViewRow[]
  /** Las frases por regla, en código: la UI las traduce. */
  notes: CoachNote[]
  declining: boolean
  /** El gimnasio del equipo en tres palabras, o `null` si el corredor no tiene equipo. */
  facilities: 'bajo' | 'normal' | 'alto' | null
  season: number
}

/**
 * LA OPINIÓN DEL ENTRENADOR, UNA VEZ POR TEMPORADA.
 *
 * «Una vez por temporada» se consigue **sin guardar nada**: el error del entrenador sale de una
 * semilla del corredor (`${worldSeed}:${riderId}:ojeador:${attr}`) que no cambia nunca, y lo único
 * que se mueve es su tamaño, que depende de la edad. Así la misma pregunta hecha cien veces el mismo
 * año da la misma respuesta, y al pasar de año se afina sola en vez de resortearse. Una tabla para
 * esto habría sido una tabla que purgar, que migrar y que mantener a cambio de nada.
 */
export async function getCoachView(
  db: Database,
  riderId: string,
  worldSeed: string,
  currentDay: number,
): Promise<CoachView | null> {
  const rows = await db
    .select({
      birthSeason: riders.birthSeason,
      archetype: riders.archetype,
      teamId: riders.teamId,
      talent: riderHidden.talent,
      fragility: riderHidden.fragility,
      declineAge: riderHidden.declineAge,
      ceilings: riderHidden.ceilings,
    })
    .from(riders)
    .innerJoin(riderHidden, eq(riderHidden.riderId, riders.id))
    .where(eq(riders.id, riderId))
    .limit(1)
  const r = rows[0]
  if (!r) return null

  // La temporada del proyecto es la de `seasonPosition` (1-indexada), que es con la que se guardaron
  // todos los `birthSeason`. `currentSeason()` va 0-indexada y usarla aquí le quitaría un año a todo
  // el mundo: es el mismo nombre para dos convenciones, y por eso la edad se pide a `riderAge`.
  const season = seasonPosition(currentDay).season
  const age = riderAge(r.birthSeason, season)

  const attrRows = await db.select().from(riderAttrs).where(eq(riderAttrs.riderId, riderId))
  const attributes = {} as Record<Attribute, number>
  for (const attr of ATTRIBUTES) attributes[attr] = 0
  for (const row of attrRows) attributes[row.attr] = row.value

  const ceilings = {} as Record<Attribute, number>
  for (const attr of ATTRIBUTES) ceilings[attr] = r.ceilings[attr] ?? 100

  let facilities: 'bajo' | 'normal' | 'alto' | null = null
  if (r.teamId) {
    const t = await db
      .select({ facilities: teams.facilities })
      .from(teams)
      .where(eq(teams.id, r.teamId))
      .limit(1)
    if (t[0]) facilities = facilitiesTier(t[0].facilities)
  }

  const opiniones = ceilingOpinions(ceilings, age, `${worldSeed}:${riderId}:ojeador`)
  return {
    ceilings: ATTRIBUTES.map((attr) => ({ attr, opinion: opiniones[attr] })),
    notes: coachNotes({
      age,
      declineAge: r.declineAge,
      talent: r.talent,
      fragility: r.fragility,
      rec: attributes.REC,
      carta: ARCHETYPE_KEY_ATTR[r.archetype],
      attributes,
      ceilings,
    }),
    declining: isDeclining(age, r.declineAge),
    facilities,
    season,
  }
}

/** Un renglón del informe: cuánto se movió un atributo y de dónde vino cada trozo. */
export interface BlockReportRow {
  attr: Attribute
  total: number
  /** Desglose por origen. Solo aparecen los que de verdad se escriben (ver `attrLogSourceEnum`). */
  bySource: { source: AttrLogSource; delta: number }[]
}

export type AttrLogSource =
  'entrenamiento' | 'carrera' | 'sobrecompensacion' | 'declive' | 'detraining'

export interface BlockReport {
  fromDay: number
  toDay: number
  rows: BlockReportRow[]
  /** Cuántos días entrenó y cuántos corrió en la ventana, para poder decir «9 sesiones». */
  trainingDays: number
  raceDays: number
  /** Las sesiones que hizo, contadas por tipo: es lo que el informe cita entre paréntesis. */
  sessions: { activity: string; days: number }[]
}

/**
 * EL INFORME DEL BLOQUE (docs/entrenamiento.md §4.6): «Mountain +1,8 · 1,1 racing · 0,9 training».
 *
 * Responde a las dos preguntas que el jugador hace y hoy no tienen respuesta: «hice X y no mejoró» y
 * «¿por qué mejoré?». Solo deltas y sesiones; el VALOR del atributo no aparece nunca.
 *
 * El desglose es tan fino como lo que se escribe, y no más: hoy el motor devuelve el estado final de
 * un día y no su descomposición, así que `declive` y `detraining` viajan DENTRO del neto de
 * `entrenamiento` en vez de aparecer como líneas propias. Se dice aquí en vez de pintar una línea
 * «age −0,2» que sería inventada.
 *
 * F (E2, §10.6 y §11.13, 11-e; sup. X1; 8b): sin lo aprendido en carrera ni la sobrecompensación de los
 * días velados, y las sesiones contadas por día, con cada día de carrera velado con la actividad de su
 * etapa: la lista sale igual abandonara el corredor o no. `raceDays` sigue contando las sesiones
 * `carrera` a secas, que el tick no escribe nunca: un defecto de hoy que E2 no arregla (§19.7, DD-24);
 * el 8b solo lo vela.
 */
export async function getBlockReport(
  db: Database,
  h: Horizon,
  riderId: string,
  currentDay: number,
): Promise<BlockReport> {
  const desde = currentDay - TREND_WINDOW_DAYS
  const d = await veilDelta(db, h)
  const log = await db
    .select({
      attr: riderAttrLog.attr,
      source: riderAttrLog.source,
      delta: sql<number>`sum(${riderAttrLog.delta})`.as('delta'),
    })
    .from(riderAttrLog)
    .where(
      and(
        eq(riderAttrLog.riderId, riderId),
        gt(riderAttrLog.gameDay, desde),
        notLearnedOnVeiledDays(d.raceDays.get(riderId) ?? []),
      ),
    )
    .groupBy(riderAttrLog.attr, riderAttrLog.source)

  const porAttr = new Map<Attribute, { source: AttrLogSource; delta: number }[]>()
  for (const row of log) {
    const lista = porAttr.get(row.attr as Attribute) ?? []
    lista.push({ source: row.source as AttrLogSource, delta: Number(row.delta) })
    porAttr.set(row.attr as Attribute, lista)
  }

  // Las sesiones, día a día (28 filas como mucho): cada día de carrera velado cuenta con la actividad
  // de su etapa, corriera o no.
  const dias = await db
    .select({ gameDay: riderDailyLog.gameDay, activity: riderDailyLog.activity })
    .from(riderDailyLog)
    .where(and(eq(riderDailyLog.riderId, riderId), gt(riderDailyLog.gameDay, desde)))
  const veiled = veiledRaceDays(h, d, riderId)
  const porActividad = new Map<string, number>()
  for (const dia of dias) {
    const activity = veiled.get(dia.gameDay) ?? dia.activity
    porActividad.set(activity, (porActividad.get(activity) ?? 0) + 1)
  }

  const sessions = [...porActividad]
    .map(([activity, days]) => ({ activity, days }))
    .sort((a, b) => b.days - a.days || a.activity.localeCompare(b.activity))
  const raceDays = sessions.filter((s) => s.activity === 'carrera').reduce((a, s) => a + s.days, 0)

  const rows: BlockReportRow[] = []
  for (const attr of ATTRIBUTES) {
    const bySource = (porAttr.get(attr) ?? []).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    if (bySource.length === 0) continue
    rows.push({ attr, total: bySource.reduce((a, s) => a + s.delta, 0), bySource })
  }
  rows.sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  return {
    fromDay: desde + 1,
    toDay: currentDay,
    rows,
    trainingDays: sessions.reduce((a, s) => a + s.days, 0) - raceDays,
    raceDays,
    sessions,
  }
}
