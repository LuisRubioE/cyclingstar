import { sql } from 'drizzle-orm'
import {
  boolean,
  char,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * Esquema (SPEC 11). Paso 6: worlds, users, game_state, tick_log.
 * Paso 9: se amplía `users` para better-auth y se añaden sessions, accounts y
 * verifications (tablas propias de better-auth, SPEC 11). Ids en uuid en todo el modelo.
 *
 * Convenciones SPEC 11: id uuid, created_at timestamptz default now(),
 * dinero y tiempos en enteros, atributos internos en real.
 */

/**
 * Email insensible a mayúsculas (SPEC 11: `email citext unique`). Requiere la extensión
 * `citext`, que el arrancador de migraciones crea de forma idempotente (ver migrate.ts).
 */
const citext = customType<{ data: string }>({
  dataType() {
    return 'citext'
  },
})

/** El mundo persistente: semilla del azar y versión del motor con que se creó. */
export const worlds = pgTable('worlds', {
  id: uuid('id').primaryKey().defaultRandom(),
  worldSeed: text('world_seed').notNull(),
  engineVersion: integer('engine_version').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Cuentas de usuario / identidad (SPEC 11). Es la tabla de usuario de better-auth
 * (Paso 9): la contraseña se guarda cifrada en `accounts`, no aquí. Los campos
 * `locale` e `isAdmin` son propios del juego; el resto los usa better-auth.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().default(''),
  email: citext('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  // Sin uso con better-auth (la contraseña cifrada vive en accounts.password). Se conserva
  // para no forzar una migración de borrado frágil; se puede retirar en un paso dedicado.
  passwordHash: text('password_hash'),
  locale: text('locale').notNull().default('es'),
  isAdmin: boolean('is_admin').notNull().default(false),
  // Cuenta premium: a futuro de pago; al principio, admin y personas de confianza. Habilita tomar
  // el control de un equipo bot y convertirlo en equipo humano (SPEC 7).
  premium: boolean('premium').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Sesiones de better-auth (cookies respaldadas en Postgres). */
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Credenciales/proveedores de better-auth. La contraseña (hash) vive aquí. */
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Tokens de verificación de better-auth (verificación de email, reset, etc.). */
export const verifications = pgTable('verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * El reloj del mundo: fila única (id = 1). `season_id` queda sin clave foránea todavía;
 * se enlaza a `seasons` cuando esa tabla exista (fase del mundo vivo).
 */
export const gameState = pgTable(
  'game_state',
  {
    id: integer('id').primaryKey().default(1),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worlds.id),
    currentDay: integer('current_day').notNull(),
    seasonId: uuid('season_id'),
    lastProcessedDay: integer('last_processed_day').notNull(),
  },
  (t) => [check('game_state_singleton', sql`${t.id} = 1`)],
)

/** Bitácora de cada avance del mundo (SPEC 2 y 11): auditoría del tick. */
export const tickLog = pgTable('tick_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  daysProcessed: integer('days_processed').notNull(),
  durationMs: integer('duration_ms').notNull(),
  ok: boolean('ok').notNull(),
  notes: text('notes'),
})

// ---- El ciclista (SPEC 3 y 11), Paso 15 ----

export const archetypeEnum = pgEnum('rider_archetype', [
  'escalada',
  'velocidad',
  'clasicas',
  'crono',
  'fondo',
])
export const genderEnum = pgEnum('gender', ['M', 'F'])
export const healthEnum = pgEnum('rider_health', ['sano', 'molestias', 'enfermo', 'lesionado'])
export const attributeEnum = pgEnum('rider_attribute', [
  'RES',
  'REC',
  'LLA',
  'MON',
  'COL',
  'CRI',
  'SPR',
  'DES',
  'PAV',
  'TAC',
])

export const divisionEnum = pgEnum('team_division', ['WT', 'PRS', 'CON'])
export const teamNameStatusEnum = pgEnum('team_name_status', ['pendiente', 'aprobado', 'rechazado'])
export const philosophyEnum = pgEnum('team_philosophy', [
  'general',
  'sprints',
  'clasicas',
  'cantera',
  'equilibrado',
])

/** Equipos NPC y de usuarios en tres divisiones (SPEC 7.1, 11, Paso 33). */
export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worlds.id),
    name: text('name').notNull(),
    nameStatus: teamNameStatusEnum('name_status').notNull().default('aprobado'),
    ownerUserId: uuid('owner_user_id').references(() => users.id), // null = NPC
    /** Nacionalidad del equipo (ISO-3166 alpha-2). Nullable durante la transición; la génesis y el
     * backfill del tick la rellenan de forma determinista según la realidad por división. */
    country: char('country', { length: 2 }),
    division: divisionEnum('division').notNull(),
    budget: integer('budget').notNull().default(0),
    philosophy: philosophyEnum('philosophy').notNull(),
    jerseySeed: text('jersey_seed').notNull(),
    facilities: real('facilities').notNull().default(1),
    pointsSeason: integer('points_season').notNull().default(0),
  },
  (t) => [index('teams_world_division_idx').on(t.worldId, t.division)],
)

/** El ciclista (SPEC 11). `team_id` queda sin FK hasta que exista `teams`. */
export const riders = pgTable(
  'riders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worlds.id),
    userId: uuid('user_id').references(() => users.id), // null = NPC
    teamId: uuid('team_id'),
    name: text('name').notNull(),
    country: char('country', { length: 2 }).notNull(),
    /** País de RESIDENCIA (ISO alpha-2): base del coste de viajes y de la vivienda. Arranca en el
     * país de nacimiento (casa familiar, gratis) y cambia al del equipo al firmar. Null = reside en
     * su país (se resuelve a `country`). */
    residence: char('residence', { length: 2 }),
    gender: genderEnum('gender').notNull(),
    birthSeason: integer('birth_season').notNull(),
    archetype: archetypeEnum('archetype').notNull(),
    retiredAt: integer('retired_at'),
    money: integer('money').notNull().default(0),
    fame: real('fame').notNull().default(0),
    seasonPoints: integer('season_points').notNull().default(0),
    morale: real('morale').notNull().default(50),
    teamTrust: real('team_trust').notNull().default(50),
    ctl: real('ctl').notNull().default(0),
    atl: real('atl').notNull().default(0),
    health: healthEnum('health').notNull().default('sano'),
    healthUntilDay: integer('health_until_day'),
    faceSeed: text('face_seed').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('riders_user_idx').on(t.userId),
    index('riders_team_idx').on(t.teamId),
    index('riders_world_fame_idx').on(t.worldId, t.fame),
  ],
)

/** Atributos visibles del corredor (escala interna [1,99]); PK compuesta. */
export const riderAttrs = pgTable(
  'rider_attrs',
  {
    riderId: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    attr: attributeEnum('attr').notNull(),
    value: real('value').notNull(),
  },
  (t) => [primaryKey({ columns: [t.riderId, t.attr] })],
)

/** Atributos ocultos: techos (genoma), talento, fragilidad, edades (SPEC 3.4). */
export const riderHidden = pgTable('rider_hidden', {
  riderId: uuid('rider_id')
    .primaryKey()
    .references(() => riders.id, { onDelete: 'cascade' }),
  talent: real('talent').notNull(),
  ceilings: jsonb('ceilings').notNull().$type<Record<string, number>>(),
  fragility: real('fragility').notNull(),
  peakAge: integer('peak_age').notNull(),
  declineAge: integer('decline_age').notNull(),
})

/** Registro de variaciones de atributos: flechas de tendencia; se purga a 60 días (SPEC 11). */
export const riderAttrLog = pgTable(
  'rider_attr_log',
  {
    riderId: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    gameDay: integer('game_day').notNull(),
    attr: attributeEnum('attr').notNull(),
    delta: real('delta').notNull(),
  },
  (t) => [primaryKey({ columns: [t.riderId, t.gameDay, t.attr] })],
)

// ---- Entrenamiento (SPEC 5 y 11), Pasos 18-20 ----

export const sessionEnum = pgEnum('training_session', [
  'descanso_total',
  'descanso_activo',
  'fondo',
  'umbral',
  'puertos',
  'sprint',
  'crono',
  'bajada_paves',
  'gimnasio',
  'video_tactica',
  'viaje',
])
export const intensityEnum = pgEnum('training_intensity', ['suave', 'normal', 'fuerte'])

/** Órdenes de entrenamiento encoladas por el jugador (SPEC 5.1, 5.2). */
export const trainingOrders = pgTable(
  'training_orders',
  {
    riderId: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    gameDay: integer('game_day').notNull(),
    session: sessionEnum('session').notNull(),
    intensity: intensityEnum('intensity').notNull(),
  },
  (t) => [primaryKey({ columns: [t.riderId, t.gameDay] })],
)

export const stageRoleEnum = pgEnum('stage_role', [
  'lider',
  'sprinter',
  'lanzador',
  'gregario',
  'cazaetapas',
  'marcador',
  'libre',
])
export const mentalityEnum = pgEnum('stage_mentality', [
  'reservon',
  'oportunista',
  'combativo',
  'supercombativo',
])
export const effortEnum = pgEnum('stage_effort', ['ahorrar', 'normal', 'a_tope'])

/** Convocatorias: qué corredores corren una carrera (SPEC 6.11, Paso 29). */
export const raceRosters = pgTable(
  'race_rosters',
  {
    raceId: text('race_id').notNull(),
    riderId: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.raceId, t.riderId] })],
)

/** Órdenes de etapa del piloto automático, encolables por toda la vuelta (SPEC 6.18, Paso 29). */
export const stageOrders = pgTable(
  'stage_orders',
  {
    riderId: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    raceId: text('race_id').notNull(),
    stageDay: integer('stage_day').notNull(),
    role: stageRoleEnum('role').notNull(),
    // Objetivo para roles que lo requieren (lanzador, gregario, marcador). Sin FK: puede ser NPC.
    targetRiderId: uuid('target_rider_id'),
    mentality: mentalityEnum('mentality').notNull(),
    effort: effortEnum('effort').notNull(),
    // Disparador: atacar en el km indicado (nulo = sin disparador explícito).
    triggerKm: integer('trigger_km'),
    contestSprints: boolean('contest_sprints').notNull().default(false),
    contestClimbs: boolean('contest_climbs').notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.riderId, t.raceId, t.stageDay] })],
)

/** Resultados de una etapa ya corrida por el motor (SPEC 6.15, Paso 30). */
export const stageResults = pgTable(
  'stage_results',
  {
    raceId: text('race_id').notNull(),
    stageDay: integer('stage_day').notNull(),
    riderId: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    puesto: integer('puesto').notNull(),
    tiempoS: integer('tiempo_s').notNull(),
    bonificacionS: integer('bonificacion_s').notNull().default(0),
    puntosVolante: integer('puntos_volante').notNull().default(0),
    puntosMontana: integer('puntos_montana').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.raceId, t.stageDay, t.riderId] })],
)

/** Clasificación general de una carrera, acumulada etapa a etapa (SPEC 6.15, Paso 30). */
export const raceGc = pgTable(
  'race_gc',
  {
    raceId: text('race_id').notNull(),
    riderId: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    tiempoTotalS: integer('tiempo_total_s').notNull().default(0),
    puntosVolante: integer('puntos_volante').notNull().default(0),
    puntosMontana: integer('puntos_montana').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.raceId, t.riderId] })],
)

/** Snapshot de entrada de una etapa, para regenerar el replay bajo demanda (SPEC 6.1, Paso 30). */
export const stageSnapshots = pgTable(
  'stage_snapshots',
  {
    raceId: text('race_id').notNull(),
    stageDay: integer('stage_day').notNull(),
    seed: text('seed').notNull(),
    engineVersion: integer('engine_version').notNull(),
    input: jsonb('input').notNull(),
  },
  (t) => [primaryKey({ columns: [t.raceId, t.stageDay] })],
)

export const palmaresKindEnum = pgEnum('palmares_kind', ['gc', 'stage', 'kom', 'points'])

/** Palmarés permanente: logros de un corredor por temporada (SPEC, Paso 40). No se reinicia. */
export const palmares = pgTable(
  'palmares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worlds.id),
    riderId: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    season: integer('season').notNull(),
    raceId: text('race_id').notNull(),
    raceName: text('race_name').notNull(),
    kind: palmaresKindEnum('kind').notNull(),
    /** Detalle opcional (p. ej. número de etapa). */
    detail: text('detail').notNull().default(''),
    gameDay: integer('game_day').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('palmares_rider_idx').on(t.riderId),
    index('palmares_race_idx').on(t.worldId, t.raceId),
  ],
)

export const newsScopeEnum = pgEnum('news_scope', ['global', 'personal'])

/** Feed de noticias del mundo, global o personal de un corredor (SPEC, Paso 39). */
export const news = pgTable(
  'news',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worlds.id),
    gameDay: integer('game_day').notNull(),
    scope: newsScopeEnum('scope').notNull().default('global'),
    /** Corredor protagonista para el feed personal (null en noticias solo globales). */
    riderId: uuid('rider_id').references(() => riders.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    text: text('text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('news_world_day_idx').on(t.worldId, t.gameDay),
    index('news_rider_idx').on(t.riderId),
  ],
)

export const txnKindEnum = pgEnum('txn_kind', [
  'salario',
  'premio',
  'staff',
  'patrocinador',
  'viaje',
  'vivienda',
  'otro',
])

/** Libro de transacciones del corredor (SPEC 9, Paso 38). El saldo es la suma de sus entradas. */
export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    riderId: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    gameDay: integer('game_day').notNull(),
    kind: txnKindEnum('kind').notNull(),
    /** Cantidad con signo: positiva ingreso, negativa gasto. */
    amount: integer('amount').notNull(),
    note: text('note').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('transactions_rider_idx').on(t.riderId, t.gameDay)],
)

export const contractRoleEnum = pgEnum('contract_role', ['lider', 'colider', 'gregario', 'libre'])
export const offerStatusEnum = pgEnum('offer_status', [
  'pendiente',
  'aceptada',
  'rechazada',
  'expirada',
])

/** Contrato vigente de un corredor con su equipo (SPEC 7.2, Paso 36). Uno por corredor. */
export const contracts = pgTable(
  'contracts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    riderId: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    role: contractRoleEnum('role').notNull().default('libre'),
    /** Salario semanal en moneda del juego. */
    salary: integer('salary').notNull(),
    startSeason: integer('start_season').notNull(),
    /** Última temporada cubierta (inclusive). */
    endSeason: integer('end_season').notNull(),
    releaseClause: integer('release_clause').notNull().default(0),
    /** El equipo asume el alquiler de vivienda del corredor (extra del contrato, no lo paga él). */
    payHousing: boolean('pay_housing').notNull().default(false),
  },
  (t) => [index('contracts_rider_idx').on(t.riderId), index('contracts_team_idx').on(t.teamId)],
)

/** Oferta de contrato a un corredor (bandeja de ofertas, SPEC 7.2, Paso 36). */
export const offers = pgTable(
  'offers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    riderId: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    season: integer('season').notNull(),
    role: contractRoleEnum('role').notNull(),
    salary: integer('salary').notNull(),
    seasons: integer('seasons').notNull(),
    releaseClause: integer('release_clause').notNull().default(0),
    createdDay: integer('created_day').notNull(),
    status: offerStatusEnum('status').notNull().default('pendiente'),
    /** La oferta incluye que el equipo pague el alquiler de vivienda (a cambio de menos salario). */
    payHousing: boolean('pay_housing').notNull().default(false),
  },
  (t) => [index('offers_rider_status_idx').on(t.riderId, t.status)],
)

/** Deseos de calendario del corredor: qué carreras marca como objetivo (SPEC 7.2, Paso 35). */
export const riderRacePrefs = pgTable(
  'rider_race_prefs',
  {
    riderId: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    raceId: text('race_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.riderId, t.raceId] })],
)

/**
 * Auto-inscripción de un agente libre a una carrera: un corredor humano SIN equipo puede inscribirse
 * a una carrera que se pueda permitir; paga su propio viaje. Al convocarse la carrera, si le llega el
 * dinero y no está ocupado, se le cobra el viaje y se le mete en el pelotón (enrolled=true).
 */
export const raceEntries = pgTable(
  'race_entries',
  {
    riderId: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    raceId: text('race_id').notNull(),
    season: integer('season').notNull(),
    createdDay: integer('created_day').notNull(),
    /** Ya convocado y pagado el viaje (metido en el pelotón). */
    enrolled: boolean('enrolled').notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.riderId, t.raceId, t.season] })],
)

/** Decisiones de convocatoria por carrera y temporada (SPEC 6.18, Paso 35). */
export const raceCallups = pgTable(
  'race_callups',
  {
    riderId: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    raceId: text('race_id').notNull(),
    season: integer('season').notNull(),
    decidedDay: integer('decided_day').notNull(),
    selected: boolean('selected').notNull(),
    /** El corredor había marcado la carrera como objetivo. */
    wanted: boolean('wanted').notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.riderId, t.raceId, t.season] }),
    index('race_callups_rider_idx').on(t.riderId),
  ],
)

/** Registro diario de carga y forma para la gráfica y la auditoría (SPEC 4, 11). */
export const riderDailyLog = pgTable(
  'rider_daily_log',
  {
    riderId: uuid('rider_id')
      .notNull()
      .references(() => riders.id, { onDelete: 'cascade' }),
    gameDay: integer('game_day').notNull(),
    tss: real('tss').notNull(),
    ctl: real('ctl').notNull(),
    atl: real('atl').notNull(),
    tsb: real('tsb').notNull(),
    activity: text('activity').notNull(),
  },
  (t) => [primaryKey({ columns: [t.riderId, t.gameDay] })],
)

/**
 * Lista de bloqueo curada por admins (equipos reales, ciclistas reales, personas famosas). Evita
 * su uso en la generación y renombra los ya existentes. `value_norm` es el valor normalizado
 * (minúsculas, sin espacios extra) sobre el que se compara y se garantiza unicidad por tipo.
 */
export const blockedNameKindEnum = pgEnum('blocked_name_kind', ['team', 'rider'])

export const blockedNames = pgTable(
  'blocked_names',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: blockedNameKindEnum('kind').notNull(),
    value: text('value').notNull(),
    valueNorm: text('value_norm').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('blocked_names_kind_norm_idx').on(t.kind, t.valueNorm)],
)
