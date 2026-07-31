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
 * Esquema fundacional (Paso 6). Solo las 4 tablas de este paso, según SPEC 11:
 * worlds, users, game_state, tick_log. El resto del modelo (riders, teams, races...)
 * llega en pasos posteriores.
 *
 * Convenciones SPEC 11: id uuid, created_at timestamptz default now(),
 * dinero y tiempos en enteros, atributos internos en real.
 */

/**
 * Email insensible a mayúsculas (SPEC 11: `email citext unique`). Requiere la extensión
 * `citext`, que el arrancador de migraciones crea de forma idempotente antes de aplicar
 * el esquema (ver migrate.ts).
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

/** Cuentas de usuario. En el Paso 9 (better-auth) se reconcilia con sus tablas de sesión. */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: citext('email').notNull().unique(),
  passwordHash: text('password_hash'),
  locale: text('locale').notNull().default('es'),
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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
