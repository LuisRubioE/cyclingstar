/**
 * Contratos HTTP entre apps/api y apps/web (única fuente de verdad).
 *
 * Cada respuesta que consume la web tiene aquí su esquema Zod; los tipos se DERIVAN del esquema
 * con `z.infer` (nunca se declaran a mano en paralelo). Los clientes de `apps/web/src/api` validan
 * con estos esquemas, así un cambio de campo en el backend falla en el borde con un mensaje claro
 * en vez de propagarse como `undefined` por la interfaz.
 *
 * Convenciones:
 * - Los objetos son "strip" por defecto (Zod ignora campos extra): añadir un campo en la API nunca
 *   rompe la web.
 * - `.optional()` solo donde la API puede NO enviar el campo (ramas sin mundo, respuestas parciales).
 * - Los vocabularios internos del dominio siguen en español (roles, mentalidades…), como en el motor.
 */

import { z } from 'zod'
import { ATTRIBUTES, GENDERS, HEALTH_STATES, type PublicRider, VOCATIONS } from './rider.js'
import { INTENSITIES, SESSIONS } from './training.js'

// --- Piezas comunes ------------------------------------------------------------------------

/** Respuesta de una mutación sin cuerpo relevante. */
export const okResponseSchema = z.object({ ok: z.boolean() })
export type OkResponse = z.infer<typeof okResponseSchema>

/** Respuesta de un guardado en bloque: cuántos elementos aceptó el servidor. */
export const savedResponseSchema = z.object({ ok: z.boolean(), saved: z.number().int() })
export type SavedResponse = z.infer<typeof savedResponseSchema>

/** Cuerpo de error uniforme de la API (`setErrorHandler`). */
export const apiErrorBodySchema = z.object({ ok: z.literal(false).optional(), error: z.string() })

export const attributesSchema = z.record(z.enum(ATTRIBUTES), z.number())

export const genderSchema = z.enum(GENDERS)
export const vocationSchema = z.enum(VOCATIONS)
export const healthStateSchema = z.enum(HEALTH_STATES)
export const sessionSchema = z.enum(SESSIONS)
export const intensitySchema = z.enum(INTENSITIES)

/** Nivel deportivo del equipo/carrera y clase de la carrera (SPEC 8). */
export const raceLevelSchema = z.enum(['WT', 'PRS', 'CON'])
export type RaceLevel = z.infer<typeof raceLevelSchema>
export const raceFormatSchema = z.enum(['gran-vuelta', 'una-semana', 'un-dia'])
export type RaceFormat = z.infer<typeof raceFormatSchema>
export const raceClassSchema = z.enum(['WT', 'Pro', '1', '2', 'NC'])
export type RaceClass = z.infer<typeof raceClassSchema>

/** Vocabulario de las órdenes de etapa (SPEC 6). */
export const stageRoleSchema = z.enum([
  'lider',
  'sprinter',
  'lanzador',
  'gregario',
  'cazaetapas',
  'marcador',
  'libre',
])
export type StageRole = z.infer<typeof stageRoleSchema>
export const mentalitySchema = z.enum(['reservon', 'oportunista', 'combativo', 'supercombativo'])
export type Mentality = z.infer<typeof mentalitySchema>
export const effortSchema = z.enum(['ahorrar', 'normal', 'a_tope'])
export type Effort = z.infer<typeof effortSchema>

// --- /api/riders/me y compañía (el ciclista del jugador) ------------------------------------

/** Vista pública del ciclista propio; debe cuadrar con la interfaz `PublicRider` de SPEC 3. */
export const publicRiderSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  gender: genderSchema,
  archetype: vocationSchema,
  birthSeason: z.number().int(),
  attributes: attributesSchema,
}) satisfies z.ZodType<PublicRider>

export const myRiderResponseSchema = z.object({ rider: publicRiderSchema.nullable() })

export const geoCountryResponseSchema = z.object({ country: z.string().nullable() })

export const generatedNameSchema = z.object({
  firstName: z.string(),
  surname: z.string(),
  fullName: z.string(),
})
export type GeneratedName = z.infer<typeof generatedNameSchema>

export const createdRiderResponseSchema = z.object({ ok: z.boolean(), id: z.string() })

export const upcomingRaceSchema = z.object({
  raceId: z.string(),
  raceKey: z.string(),
  raceName: z.string(),
  raceClass: z.string(),
  country: z.string().nullable(),
  startGameDay: z.number().int(),
  daysUntil: z.number().int(),
  stageCount: z.number().int(),
  ongoing: z.boolean(),
  bib: z.number().int().nullable(),
})
export type UpcomingRace = z.infer<typeof upcomingRaceSchema>
export const upcomingRacesResponseSchema = z.object({ races: z.array(upcomingRaceSchema) })

export const riderSummarySchema = z.object({
  teamId: z.string().nullable(),
  teamName: z.string().nullable(),
  money: z.number(),
  morale: z.number(),
  fame: z.number(),
  seasonPoints: z.number(),
  seasonRank: z.number(),
  fieldSize: z.number(),
  nationality: z.string(),
  residence: z.string(),
  housingCovered: z.boolean(),
})
export type RiderSummary = z.infer<typeof riderSummarySchema>
export const riderSummaryResponseSchema = z.object({ summary: riderSummarySchema.nullable() })

// --- /api/riders/me/form (forma y salud) ---------------------------------------------------

export const formPointSchema = z.object({
  gameDay: z.number().int(),
  ctl: z.number(),
  atl: z.number(),
  tsb: z.number(),
  tss: z.number(),
  activity: z.string(),
})
export type FormPoint = z.infer<typeof formPointSchema>

export const riderHealthSchema = z.object({
  state: healthStateSchema,
  untilDay: z.number().int().nullable(),
})
export type RiderHealth = z.infer<typeof riderHealthSchema>

export const formResponseSchema = z.object({
  log: z.array(formPointSchema),
  form: z.object({ stars: z.number(), freshness: z.number() }).nullable(),
  // Sin ciclista la API no envía `health` (solo `{ log, form }`).
  health: riderHealthSchema.nullable().optional(),
})
export type FormResponse = z.infer<typeof formResponseSchema>

// --- /api/riders/me/orders y /api/me/team-training (entrenamiento) --------------------------

export const trainingOrderSchema = z.object({
  gameDay: z.number().int(),
  session: sessionSchema,
  intensity: intensitySchema,
})
export type TrainingOrder = z.infer<typeof trainingOrderSchema>

export const ordersResponseSchema = z.object({
  currentDay: z.number().int(),
  horizonDays: z.number().int(),
  orders: z.array(trainingOrderSchema),
  /** Días de juego (absolutos) del horizonte en los que el corredor tiene carrera (#6). */
  raceDays: z.array(z.number().int()),
})
export type OrdersResponse = z.infer<typeof ordersResponseSchema>

export const teamTrainingResponseSchema = z.object({
  plan: z.array(trainingOrderSchema),
  canEdit: z.boolean(),
  teamName: z.string().nullable(),
})
export type TeamTraining = z.infer<typeof teamTrainingResponseSchema>

// --- /api/calendar (calendario de temporada) -----------------------------------------------

export const calendarStageSummarySchema = z.object({
  index: z.number().int(),
  name: z.string(),
  label: z.string(),
  kind: z.string(),
  km: z.number(),
  timeTrial: z.boolean(),
  /** Localidad de salida y de meta de la etapa (recorrido real), o null si no está definido. */
  from: z.string().nullable(),
  to: z.string().nullable(),
})
export type CalendarStageSummary = z.infer<typeof calendarStageSummarySchema>

export const calendarRaceSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  level: raceLevelSchema,
  raceClass: raceClassSchema,
  championshipCountry: z.string().nullable(),
  championshipCategory: z.enum(['elite', 'u23']).nullable(),
  country: z.string().nullable(),
  format: raceFormatSchema,
  startDay: z.number().int(),
  openTo: z.array(raceLevelSchema),
  winner: z.string().nullable(),
  /** Índices de etapa (1-based) tras los que hay un día de descanso; vacío si no tiene. */
  restAfter: z.array(z.number().int()),
  stages: z.array(calendarStageSummarySchema),
})
export type CalendarRaceSummary = z.infer<typeof calendarRaceSummarySchema>

export const calendarResponseSchema = z.object({
  races: z.array(calendarRaceSummarySchema),
  /** Día actual de la temporada (0..363), o null si aún no hay mundo. */
  dayOfSeason: z.number().int().nullable(),
})
export type Calendar = z.infer<typeof calendarResponseSchema>

// --- /api/calendar/:raceId (ficha de carrera) ----------------------------------------------

export const gcRowSchema = z.object({
  riderId: z.string(),
  name: z.string(),
  country: z.string(),
  teamName: z.string().nullable(),
  isBot: z.boolean(),
  tiempoTotalS: z.number(),
  /** Abandonó la carrera (caída grave): se muestra como DNF al final de la general. */
  dnf: z.boolean().optional(),
})
export type GcRow = z.infer<typeof gcRowSchema>

export const stageWinnerSchema = z.object({
  stageDay: z.number().int(),
  riderId: z.string(),
  name: z.string(),
  country: z.string(),
  teamName: z.string().nullable(),
  isBot: z.boolean(),
})
export type StageWinner = z.infer<typeof stageWinnerSchema>

export const raceHonourSchema = z.object({
  season: z.number().int(),
  winnerName: z.string(),
  winnerCountry: z.string(),
})
export type RaceHonour = z.infer<typeof raceHonourSchema>

/**
 * Fila de una clasificación por puntos: metas volantes (`points`) o montaña (`kom`). La comparten
 * la ficha de carrera, el replay de etapa y los resultados de la vuelta de prueba.
 */
export const pointsEntrySchema = z.object({
  riderId: z.string(),
  name: z.string(),
  country: z.string(),
  isBot: z.boolean(),
  puntos: z.number(),
})
export type PointsEntry = z.infer<typeof pointsEntrySchema>

/**
 * Fila de la clasificación POR EQUIPOS, la misma para la de una etapa y la acumulada.
 *
 * Regla del ciclismo: por etapa suman los tiempos de meta de los TRES MEJORES de cada equipo (sin
 * bonificaciones, que no cuentan para esta clasificación), y la de la carrera acumula esas sumas
 * etapa a etapa —no es la suma de los tres mejores de la general, porque los tres que puntúan
 * cambian cada día—. Un equipo que se queda con menos de tres clasificados no puntúa esa etapa y
 * sale de la clasificación (`out`), pero se sigue mostrando al final, como los DNF de la general.
 */
export const teamClassEntrySchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  /** País del equipo (ISO alpha-2); null si no lo tiene asignado. */
  country: z.string().nullable(),
  /** Suma de tiempos: la de la etapa, o la acumulada de la carrera. */
  tiempoS: z.number(),
  /** Suma de los puestos de los corredores que puntúan (primer desempate). */
  sumaPuestos: z.number().int(),
  /** Etapas puntuadas (1 en la clasificación de una etapa). */
  stagesScored: z.number().int(),
  /** Fuera de la clasificación: se quedó sin tres clasificados en alguna etapa. */
  out: z.boolean(),
})
export type TeamClassEntry = z.infer<typeof teamClassEntrySchema>

/**
 * Momento en el que está la carrera ESTA temporada. Es lo que decide qué pestañas tiene su página y
 * cuál abre por defecto (docs/navegacion.md §7.1): por correr manda el recorrido; en curso y
 * terminada, las clasificaciones. Lo calcula la API con la misma regla que usa el tick para repartir
 * puntos de general ("terminada" = existe resultado de su última etapa).
 */
export const raceStatusSchema = z.enum(['upcoming', 'racing', 'finished'])
export type RaceStatus = z.infer<typeof raceStatusSchema>

export const raceStagePlanSchema = calendarStageSummarySchema.extend({
  /** Altimetría de la etapa: SVG autocontenido del perfil (relieve, puertos y categorías). */
  altimetry: z.string(),
})
export type RaceStagePlan = z.infer<typeof raceStagePlanSchema>

export const raceViewSchema = z.object({
  // La ficha va completa haya mundo o no: sin mundo cambian los resultados, no la identidad de la
  // carrera, que sale del calendario del motor.
  race: z.object({
    id: z.string(),
    name: z.string(),
    level: z.string(),
    raceClass: z.string(),
    format: z.string(),
    stageCount: z.number().int(),
    country: z.string().nullable(),
    /** Día de la temporada (0..363) en el que sale la carrera. */
    startDay: z.number().int(),
  }),
  /** Día actual de la temporada (0..363); null si aún no hay mundo. */
  dayOfSeason: z.number().int().nullable(),
  status: raceStatusSchema,
  /** Etapas (1-based) ya corridas esta temporada. */
  runDays: z.array(z.number().int()),
  stages: z.array(raceStagePlanSchema),
  /** Índices de etapa (1-based) tras los que hay día de descanso (vacío si no tiene). */
  restAfter: z.array(z.number().int()),
  /** General COMPLETA: la web enseña el top 20 y ofrece "Show all" (§7.3). */
  gc: z.array(gcRowSchema),
  /** Clasificación por puntos (metas volantes) de la carrera. */
  points: z.array(pointsEntrySchema),
  /** Clasificación de la montaña (KOM) de la carrera. */
  kom: z.array(pointsEntrySchema),
  /** Clasificación por equipos acumulada de la carrera (vacía si aún no se ha corrido). */
  teamGc: z.array(teamClassEntrySchema),
  stageWinners: z.array(stageWinnerSchema),
  history: z.array(raceHonourSchema),
})
export type RaceView = z.infer<typeof raceViewSchema>

export const startlistRiderSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  isBot: z.boolean(),
  /** Dorsal (número de corredor); null en rosters sin dorsales. */
  bib: z.number().int().nullable(),
})
export type StartlistRider = z.infer<typeof startlistRiderSchema>

export const startlistTeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string().nullable(),
  division: z.string(),
  /** Semilla del maillot del equipo (para pintar su kit). */
  jerseySeed: z.string(),
  /** Corredores de la escuadra; lleno solo cuando ya está congelada (`frozen`). */
  riders: z.array(startlistRiderSchema),
})
export type StartlistTeam = z.infer<typeof startlistTeamSchema>

export const raceStartlistSchema = z.object({
  /** La carrera está próxima a empezar (dentro de la ventana) y aún no se ha corrido. */
  upcoming: z.boolean(),
  /** Días de juego que faltan para la salida (ausente si no hay mundo). */
  daysUntil: z.number().int().optional(),
  /** La escuadra ya está congelada: se muestran corredores reales. */
  frozen: z.boolean().optional(),
  teams: z.array(startlistTeamSchema),
  freeAgents: z.array(startlistRiderSchema),
})
export type RaceStartlist = z.infer<typeof raceStartlistSchema>

// --- /api/teams, /api/countries, /api/free-agents (explorar el mundo) ----------------------

export const teamListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string().nullable(),
  division: z.string(),
  budget: z.number(),
  pointsSeason: z.number(),
  jerseySeed: z.string(),
  riderCount: z.number().int(),
})
export type TeamListItem = z.infer<typeof teamListItemSchema>
export const teamsResponseSchema = z.object({ teams: z.array(teamListItemSchema) })

export const teamRiderSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  archetype: z.string(),
  isBot: z.boolean(),
  seasonPoints: z.number(),
  foreign: z.boolean(),
  /** Estado de salud: 'sano' | 'molestias' | 'enfermo' | 'lesionado'. */
  health: z.string(),
})
export type TeamRider = z.infer<typeof teamRiderSchema>

export const teamDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string().nullable(),
  division: z.string(),
  budget: z.number(),
  pointsSeason: z.number(),
  jerseySeed: z.string(),
  human: z.boolean(),
  roster: z.array(teamRiderSchema),
})
export type TeamDetail = z.infer<typeof teamDetailSchema>
export const teamResponseSchema = z.object({ team: teamDetailSchema })

export const teamControlSchema = z.object({
  premium: z.boolean(),
  isAdmin: z.boolean(),
  team: z
    .object({
      id: z.string(),
      name: z.string(),
      isBot: z.boolean(),
      ownedByMe: z.boolean(),
    })
    .nullable(),
})
export type TeamControl = z.infer<typeof teamControlSchema>
export const teamControlResponseSchema = z.object({ control: teamControlSchema.nullable() })

export const takeOverResponseSchema = z.object({
  ok: z.boolean(),
  teamId: z.string(),
  teamName: z.string(),
})

export const teamNewsItemSchema = z.object({
  gameDay: z.number().int(),
  kind: z.string(),
  text: z.string(),
})
export type TeamNewsItem = z.infer<typeof teamNewsItemSchema>
export const teamNewsResponseSchema = z.object({ news: z.array(teamNewsItemSchema) })

export const publicRiderDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  /** País de residencia (dónde vive/entrena). */
  residence: z.string(),
  archetype: z.string(),
  age: z.number().int(),
  isBot: z.boolean(),
  teamId: z.string().nullable(),
  teamName: z.string().nullable(),
  seasonPoints: z.number(),
  seasonRank: z.number(),
  fieldSize: z.number(),
  fame: z.number(),
  attributes: attributesSchema,
  /**
   * Estado de salud, PÚBLICO a propósito: en el ciclismo real una lesión es noticia y un rival
   * querría saberla. Lo que sigue siendo privado es el detalle fino (frescura, fatiga, forma), que
   * solo sale en modo propietario.
   */
  health: riderHealthSchema,
})
export type PublicRiderDetail = z.infer<typeof publicRiderDetailSchema>
export const publicRiderDetailResponseSchema = z.object({ rider: publicRiderDetailSchema })

export const badgeSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string(),
  desc: z.string(),
})
export type Badge = z.infer<typeof badgeSchema>
export const badgesResponseSchema = z.object({ badges: z.array(badgeSchema) })

export const countrySummarySchema = z.object({
  country: z.string(),
  riderCount: z.number().int(),
  totalPoints: z.number(),
})
export type CountrySummary = z.infer<typeof countrySummarySchema>
export const countriesResponseSchema = z.object({ countries: z.array(countrySummarySchema) })

export const countryRiderSchema = z.object({
  id: z.string(),
  name: z.string(),
  archetype: z.string(),
  isBot: z.boolean(),
  teamId: z.string().nullable(),
  teamName: z.string().nullable(),
  seasonPoints: z.number(),
  fame: z.number(),
})
export type CountryRider = z.infer<typeof countryRiderSchema>
export const countryRidersResponseSchema = z.object({
  code: z.string(),
  riders: z.array(countryRiderSchema),
})

export const freeAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  archetype: z.string(),
  age: z.number().int(),
  isBot: z.boolean(),
  seasonPoints: z.number(),
  fame: z.number(),
})
export type FreeAgent = z.infer<typeof freeAgentSchema>
export const freeAgentsResponseSchema = z.object({ riders: z.array(freeAgentSchema) })

// --- /api/news -----------------------------------------------------------------------------

export const newsItemSchema = z.object({
  gameDay: z.number().int(),
  kind: z.string(),
  text: z.string(),
  personal: z.boolean(),
  /** Protagonista, para pintar su bandera y enlazarlo (null si el titular no tiene corredor). */
  riderId: z.string().nullable(),
  riderName: z.string().nullable(),
  country: z.string().nullable(),
  /** Equipo ACTUAL del protagonista: es lo que permite filtrar el feed por equipo (§3.5). */
  teamId: z.string().nullable(),
  teamName: z.string().nullable(),
})
export type NewsItem = z.infer<typeof newsItemSchema>
export const newsResponseSchema = z.object({ news: z.array(newsItemSchema) })

// --- /api/rankings, premios, salón de la fama y récords -------------------------------------

export const rankingRowSchema = z.object({
  riderId: z.string(),
  name: z.string(),
  country: z.string(),
  teamId: z.string().nullable(),
  teamName: z.string().nullable(),
  isBot: z.boolean(),
  points: z.number(),
})
export type RankingRow = z.infer<typeof rankingRowSchema>
export const rankingResponseSchema = z.object({ ranking: z.array(rankingRowSchema) })

export const awardWinnerSchema = z.object({
  riderId: z.string(),
  name: z.string(),
  country: z.string(),
  isBot: z.boolean(),
  archetype: z.string(),
  points: z.number(),
})
export type AwardWinner = z.infer<typeof awardWinnerSchema>

export const seasonAwardsSchema = z.object({
  riderOfYear: awardWinnerSchema.nullable(),
  bestSprinter: awardWinnerSchema.nullable(),
  bestClimber: awardWinnerSchema.nullable(),
  revelation: awardWinnerSchema.nullable(),
})
export type SeasonAwards = z.infer<typeof seasonAwardsSchema>
export const seasonAwardsResponseSchema = z.object({ awards: seasonAwardsSchema.nullable() })

export const hallOfFameRowSchema = z.object({
  riderId: z.string(),
  name: z.string(),
  country: z.string(),
  isBot: z.boolean(),
  gc: z.number(),
  stage: z.number(),
  kom: z.number(),
  points: z.number(),
  total: z.number(),
})
export type HallOfFameRow = z.infer<typeof hallOfFameRowSchema>
export const hallOfFameResponseSchema = z.object({ riders: z.array(hallOfFameRowSchema) })

export const recordEntrySchema = z.object({
  riderId: z.string(),
  name: z.string(),
  country: z.string(),
  isBot: z.boolean(),
  value: z.number(),
  note: z.string(),
})
export type RecordEntry = z.infer<typeof recordEntrySchema>

export const allTimeRecordsSchema = z.object({
  mostWins: recordEntrySchema.nullable(),
  mostGcWins: recordEntrySchema.nullable(),
  youngestWinner: recordEntrySchema.nullable(),
})
export type AllTimeRecords = z.infer<typeof allTimeRecordsSchema>
export const recordsResponseSchema = z.object({ records: allTimeRecordsSchema.nullable() })

/** Historial de ganadores de una carrera (incluye el nombre de la carrera, a diferencia de RaceHonour). */
export const raceHistoryHonourSchema = z.object({
  season: z.number().int(),
  raceName: z.string(),
  winnerId: z.string(),
  winnerName: z.string(),
  winnerCountry: z.string(),
})
export type RaceHistoryHonour = z.infer<typeof raceHistoryHonourSchema>
export const raceHistoryResponseSchema = z.object({ history: z.array(raceHistoryHonourSchema) })

export const palmaresRowSchema = z.object({
  season: z.number().int(),
  raceId: z.string(),
  raceName: z.string(),
  kind: z.string(),
  detail: z.string(),
})
export type PalmaresRow = z.infer<typeof palmaresRowSchema>
export const palmaresResponseSchema = z.object({ palmares: z.array(palmaresRowSchema) })

/** Puesto del corredor en una etapa suelta, dentro del desglose de su carrera. */
export const riderStagePlacingSchema = z.object({
  stageDay: z.number().int(),
  puesto: z.number().int(),
})
export type RiderStagePlacing = z.infer<typeof riderStagePlacingSchema>

/**
 * El paso del corredor por una carrera. En una carrera por etapas su resultado ES la general
 * (`gcPuesto`, se gane o no) y las etapas son el desglose; en una de un día las dos cosas coinciden.
 */
export const riderRaceResultSchema = z.object({
  raceId: z.string(),
  raceName: z.string(),
  raceClass: z.string(),
  season: z.number().int(),
  stageCount: z.number().int(),
  isOneDay: z.boolean(),
  gcPuesto: z.number().int().nullable(),
  dnf: z.boolean(),
  finished: z.boolean(),
  stages: z.array(riderStagePlacingSchema),
})
export type RiderRaceResult = z.infer<typeof riderRaceResultSchema>
export const riderResultsResponseSchema = z.object({ results: z.array(riderRaceResultSchema) })

// --- /api/riders/me/ledger (finanzas) ------------------------------------------------------

export const ledgerEntrySchema = z.object({
  gameDay: z.number().int(),
  kind: z.string(),
  amount: z.number(),
  note: z.string(),
})
export type LedgerEntry = z.infer<typeof ledgerEntrySchema>

export const ledgerResponseSchema = z.object({
  balance: z.number(),
  entries: z.array(ledgerEntrySchema),
  /** Día de juego actual del mundo (para el próximo día de pago). Null sin mundo/ciclista. */
  gameDay: z.number().int().nullable(),
  /** Salario semanal del contrato vigente, o null si el corredor no tiene contrato. */
  salary: z.number().nullable(),
})
export type Ledger = z.infer<typeof ledgerResponseSchema>

// --- /api/riders/me/offers (mercado) -------------------------------------------------------

export const offerSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  teamName: z.string(),
  division: z.string(),
  role: z.string(),
  salary: z.number(),
  seasons: z.number().int(),
  releaseClause: z.number(),
  payHousing: z.boolean(),
  relocatesTo: z.string().nullable(),
})
export type Offer = z.infer<typeof offerSchema>

export const contractSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  division: z.string(),
  role: z.string(),
  salary: z.number(),
  endSeason: z.number().int(),
  releaseClause: z.number(),
})
export type Contract = z.infer<typeof contractSchema>

export const marketResponseSchema = z.object({
  offers: z.array(offerSchema),
  contract: contractSchema.nullable(),
})
export type Market = z.infer<typeof marketResponseSchema>

// --- /api/riders/me/race-prefs (objetivos de calendario) -----------------------------------

export const racePrefSchema = z.object({
  raceId: z.string(),
  name: z.string(),
  level: z.string(),
  format: z.string(),
  startDay: z.number().int(),
  stageCount: z.number().int(),
  wanted: z.boolean(),
  callup: z.enum(['selected', 'not-selected']).nullable(),
})
export type RacePref = z.infer<typeof racePrefSchema>
export const racePrefsResponseSchema = z.object({ races: z.array(racePrefSchema) })

// --- /api/riders/me/race-entries (auto-inscripción del agente libre) ------------------------

export const enterableRaceSchema = z.object({
  raceId: z.string(),
  name: z.string(),
  country: z.string().nullable(),
  startDay: z.number().int(),
  raceClass: z.string(),
  travelMoney: z.number(),
  travelDays: z.number(),
  entered: z.boolean(),
  enrolled: z.boolean(),
  affordable: z.boolean(),
})
export type EnterableRace = z.infer<typeof enterableRaceSchema>
export const enterableRacesResponseSchema = z.object({ races: z.array(enterableRaceSchema) })

// --- /api/teams/me/calendar (draft de calendario del equipo) --------------------------------

export const teamCalendarRaceSchema = z.object({
  raceId: z.string(),
  name: z.string(),
  country: z.string().nullable(),
  startDay: z.number().int(),
  level: z.string(),
  raceClass: z.string(),
  format: z.string(),
  travelPerRider: z.number(),
  squad: z.number().int(),
  drafted: z.boolean(),
  natural: z.boolean(),
  travelTier: z.enum(['home', 'continental', 'intercontinental']),
})
export type TeamCalendarRace = z.infer<typeof teamCalendarRaceSchema>

export const teamCalendarSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  teamCountry: z.string().nullable(),
  budget: z.number(),
  weeklyIncome: z.number(),
  weeklyWages: z.number(),
  weeklyNet: z.number(),
  races: z.array(teamCalendarRaceSchema),
})
export type TeamCalendar = z.infer<typeof teamCalendarSchema>
export const teamCalendarResponseSchema = z.object({ calendar: teamCalendarSchema.nullable() })

// --- /api/teams/me/race-plan (plan del equipo, en lectura, para un miembro) -----------------

/**
 * El programa del equipo tal como lo ve un corredor de la plantilla: sin costes de viaje ni
 * finanzas, que son cosa de quien gestiona el equipo.
 */
export const teamPlanRaceSchema = z.object({
  raceId: z.string(),
  name: z.string(),
  country: z.string().nullable(),
  startDay: z.number().int(),
  level: z.string(),
  raceClass: z.string(),
  format: z.string(),
  /** El equipo tiene previsto acudir. */
  attending: z.boolean(),
  /** Es del calendario natural del equipo (su circuito de casa). */
  natural: z.boolean(),
})
export type TeamPlanRace = z.infer<typeof teamPlanRaceSchema>

export const teamRacePlanSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  teamCountry: z.string().nullable(),
  division: z.string(),
  /** La temporada entera, no solo lo que queda: el miembro también mira dónde ha estado el equipo. */
  races: z.array(teamPlanRaceSchema),
})
export type TeamRacePlan = z.infer<typeof teamRacePlanSchema>
export const teamRacePlanResponseSchema = z.object({ plan: teamRacePlanSchema.nullable() })

// --- Órdenes de etapa (/api/races/test-tour y /api/my-orders) -------------------------------

export const stageOrderSchema = z.object({
  stageDay: z.number().int(),
  role: stageRoleSchema,
  targetRiderId: z.string().nullable(),
  mentality: mentalitySchema,
  effort: effortSchema,
  triggerKm: z.number().nullable(),
  contestSprints: z.boolean(),
  contestClimbs: z.boolean(),
})
export type StageOrder = z.infer<typeof stageOrderSchema>

/** Tipos de etapa del motor (StageKind). La web declaraba solo cuatro y se dejaba fuera 'clasica'. */
export const stageKindSchema = z.enum(['llana', 'media', 'reina', 'cri', 'clasica'])
export type StageKind = z.infer<typeof stageKindSchema>

export const raceStageSchema = z.object({
  day: z.number().int(),
  name: z.string(),
  kind: stageKindSchema,
  timeTrial: z.boolean(),
  km: z.number(),
  altimetry: z.string(),
})
export type RaceStage = z.infer<typeof raceStageSchema>

export const rosterRiderSchema = z.object({ id: z.string(), name: z.string() })
export type RosterRider = z.infer<typeof rosterRiderSchema>

export const testTourResponseSchema = z.object({
  stages: z.array(raceStageSchema),
  orders: z.array(stageOrderSchema),
  roster: z.array(rosterRiderSchema),
})
export type TestTour = z.infer<typeof testTourResponseSchema>

export const raceOrdersResponseSchema = z.object({
  race: z.object({ id: z.string(), name: z.string() }),
  stages: z.array(raceStageSchema),
  orders: z.array(stageOrderSchema),
  /** Compañeros de equipo en la carrera (objetivos de lanzador/gregario). */
  teammates: z.array(rosterRiderSchema),
  /** Rivales en la carrera (a quién marcar/seguir), por fama. */
  rivals: z.array(rosterRiderSchema),
})
export type RaceOrders = z.infer<typeof raceOrdersResponseSchema>

// --- Resultados, crónica y replay ----------------------------------------------------------

export const raceResultsGcEntrySchema = gcRowSchema.extend({
  puntosVolante: z.number(),
  puntosMontana: z.number(),
})
export type GcEntry = z.infer<typeof raceResultsGcEntrySchema>

/** Misma forma que `PointsEntry`: clasificación de puntos/montaña tras una etapa. */
export type StageClassEntry = PointsEntry

export const stageStatusSchema = z.object({
  day: z.number().int(),
  name: z.string(),
  kind: z.string(),
  km: z.number(),
  run: z.boolean(),
})
export type StageStatus = z.infer<typeof stageStatusSchema>

export const raceResultsSchema = z.object({
  gc: z.array(raceResultsGcEntrySchema),
  points: z.array(pointsEntrySchema),
  kom: z.array(pointsEntrySchema),
  /** Clasificación por equipos acumulada de la vuelta. */
  teamGc: z.array(teamClassEntrySchema),
  stages: z.array(stageStatusSchema),
})
export type RaceResults = z.infer<typeof raceResultsSchema>

export const chronicleEntrySchema = z.object({
  km: z.number(),
  tS: z.number(),
  plantilla: z.string(),
  protagonists: z.array(z.string()),
  /** Datos numéricos del evento (p.ej. gapS = ventaja de la fuga; trend = -1/0/1). */
  datos: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
  /** Equipos de los protagonistas (nombres, sin repetir), para nombrarlos en la crónica. */
  protagonistTeams: z.array(z.string()).optional(),
})
export type ChronicleEntry = z.infer<typeof chronicleEntrySchema>

export const stageResultEntrySchema = z.object({
  riderId: z.string(),
  name: z.string(),
  country: z.string(),
  teamName: z.string().nullable(),
  isBot: z.boolean(),
  puesto: z.number().int(),
  tiempoS: z.number(),
  bonificacionS: z.number(),
  puntosVolante: z.number(),
  puntosMontana: z.number(),
})
export type StageResultEntry = z.infer<typeof stageResultEntrySchema>

export const stageGcEntrySchema = z.object({
  riderId: z.string(),
  name: z.string(),
  country: z.string(),
  teamName: z.string().nullable(),
  isBot: z.boolean(),
  tiempoTotalS: z.number(),
  dnf: z.boolean().optional(),
})
export type StageGcEntry = z.infer<typeof stageGcEntrySchema>

/**
 * Carrera a la que pertenece una etapa: contexto de la cabecera y base de la navegación
 * anterior/siguiente (docs/navegacion.md §7.2).
 */
export const stageRaceContextSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string().nullable(),
  stageCount: z.number().int(),
})
export type StageRaceContext = z.infer<typeof stageRaceContextSchema>

export const stageReplaySchema = z.object({
  day: z.number().int(),
  name: z.string(),
  km: z.number(),
  run: z.boolean(),
  /**
   * Carrera de la etapa. Ausente en la vuelta de prueba (`/api/races/test-tour/stages/:day`), que
   * vive fuera del calendario de temporada; las etapas de calendario SIEMPRE la traen.
   */
  race: stageRaceContextSchema.optional(),
  /** Tipo de etapa (llana, media, reina, cri, clasica). Ausente en la vuelta de prueba. */
  kind: stageKindSchema.optional(),
  /** Contrarreloj: el journal cuenta la historia del crono (mejor tiempo, diferencias). */
  timeTrial: z.boolean().optional(),
  /** La etapa corrió antes de guardar la crónica: no hay journal detallado. */
  journalUnavailable: z.boolean().optional(),
  altimetry: z.string(),
  results: z.array(stageResultEntrySchema).optional(),
  chronicle: z.array(chronicleEntrySchema).optional(),
  gc: z.array(stageGcEntrySchema).optional(),
  /** Clasificación de la montaña (KOM) tras esta etapa. */
  kom: z.array(pointsEntrySchema).optional(),
  /** Clasificación por puntos (metas volantes) tras esta etapa. */
  points: z.array(pointsEntrySchema).optional(),
  /** Clasificación por equipos DE ESTA ETAPA (los tres mejores de cada equipo hoy). */
  teamStage: z.array(teamClassEntrySchema).optional(),
  /** Clasificación por equipos acumulada TRAS esta etapa. */
  teamGc: z.array(teamClassEntrySchema).optional(),
})
export type StageReplay = z.infer<typeof stageReplaySchema>

export const advanceWorldResponseSchema = z.object({
  ok: z.boolean(),
  currentDay: z.number().int().nullable(),
  daysProcessed: z.number().int().optional(),
})

// --- Informe personal de la última carrera --------------------------------------------------

export const raceReportOrdersSchema = z.object({
  role: z.string(),
  mentality: z.string(),
  contestSprints: z.boolean(),
  contestClimbs: z.boolean(),
})
export type RaceReportOrders = z.infer<typeof raceReportOrdersSchema>

export const raceReportEventSchema = z.object({ km: z.number(), plantilla: z.string() })
export type RaceReportEvent = z.infer<typeof raceReportEventSchema>

export const riderRaceReportSchema = z.object({
  raceName: z.string(),
  stageName: z.string(),
  raceId: z.string(),
  stageDay: z.number().int(),
  orders: raceReportOrdersSchema.nullable(),
  position: z.number().int(),
  fieldSize: z.number().int(),
  timeGapToWinnerS: z.number(),
  sprintPoints: z.number(),
  komPoints: z.number(),
  bonusS: z.number(),
  winnerName: z.string().nullable(),
  personalEvents: z.array(raceReportEventSchema),
  story: z.array(raceReportEventSchema),
})
export type RiderRaceReport = z.infer<typeof riderRaceReportSchema>
export const lastRaceResponseSchema = z.object({ report: riderRaceReportSchema.nullable() })

// --- Admin (protegido por x-admin-token) ---------------------------------------------------

export const blockedKindSchema = z.enum(['team', 'rider'])
export type BlockedKind = z.infer<typeof blockedKindSchema>

export const blockedNameSchema = z.object({
  id: z.string(),
  kind: blockedKindSchema,
  value: z.string(),
  note: z.string().nullable(),
  createdAt: z.string(),
})
export type BlockedName = z.infer<typeof blockedNameSchema>
export const blocklistResponseSchema = z.object({
  ok: z.boolean(),
  items: z.array(blockedNameSchema),
})
export const blocklistAddResponseSchema = z.object({ ok: z.boolean(), inserted: z.boolean() })

export const tickLogRowSchema = z.object({
  startedAt: z.string(),
  daysProcessed: z.number().int(),
  durationMs: z.number(),
  ok: z.boolean(),
  notes: z.string().nullable(),
})
export type TickLogRow = z.infer<typeof tickLogRowSchema>

export const worldHealthSchema = z.object({
  currentDay: z.number().int(),
  season: z.number().int(),
  worldCreatedAt: z.string().nullable(),
  riders: z.object({
    active: z.number().int(),
    human: z.number().int(),
    bots: z.number().int(),
    retired: z.number().int(),
    freeAgents: z.number().int(),
  }),
  teams: z.object({
    total: z.number().int(),
    human: z.number().int(),
    wt: z.number().int(),
    prs: z.number().int(),
    con: z.number().int(),
  }),
  users: z.number().int(),
  recentTicks: z.array(tickLogRowSchema),
})
export type WorldHealth = z.infer<typeof worldHealthSchema>
export const worldHealthResponseSchema = z.object({ ok: z.boolean(), health: worldHealthSchema })
