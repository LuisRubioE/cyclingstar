import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  customType,
  integer,
  pgTable,
  text,
  timestamp,
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
