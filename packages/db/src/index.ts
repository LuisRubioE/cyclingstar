/**
 * packages/db: capa de datos con Drizzle (SPEC 11). Migraciones solo con drizzle-kit.
 * Paso 6: esquema fundacional (worlds, users, game_state, tick_log) y el arrancador de
 * migraciones con advisory lock.
 */
export * from './schema.js'
export { createDb, type Database, type DbClient } from './client.js'
export { runMigrations } from './migrate.js'
export { runTick, targetGameDay, type RunTickOptions, type TickSummary } from './tick.js'
export { raceWorldDay } from './race.js'
export { ensureTestTourField, fillerRiderSpec, type FillerSpec } from './npc.js'
export {
  getRaceGc,
  getRunStageDays,
  getStageResults,
  getStageSnapshot,
  type GcRow,
  type StageResultRow,
  type StageSnapshotRow,
} from './results.js'
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
  getDailyLog,
  getRiderForUser,
  type CreateRiderInput,
  type DailyLogRow,
  type RiderHiddenInput,
} from './riders.js'
export { getTrainingOrders, setTrainingOrders, type TrainingOrderRow } from './training.js'
export {
  addToRoster,
  getStageOrders,
  isOnRoster,
  setStageOrders,
  type Effort,
  type Mentality,
  type StageOrderRow,
  type StageRole,
} from './raceOrders.js'
