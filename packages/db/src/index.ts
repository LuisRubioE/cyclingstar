/**
 * packages/db: capa de datos con Drizzle (SPEC 11). Migraciones solo con drizzle-kit.
 * Paso 6: esquema fundacional (worlds, users, game_state, tick_log) y el arrancador de
 * migraciones con advisory lock.
 */
export * from './schema.js'
export { createDb, type Database, type DbClient } from './client.js'
export { runMigrations } from './migrate.js'
export { runTick, targetGameDay, type RunTickOptions, type TickSummary } from './tick.js'
export {
  generateName,
  isBlockedName,
  regenerateName,
  type CountryNames,
  type GeneratedName,
} from './names.js'
export {
  createRider,
  getCurrentWorld,
  getRiderForUser,
  type CreateRiderInput,
  type RiderHiddenInput,
} from './riders.js'
export { getTrainingOrders, setTrainingOrders, type TrainingOrderRow } from './training.js'
