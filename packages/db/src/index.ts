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
export { runCalendarDay, selectFieldTeams } from './calendarRun.js'
export {
  getCountriesSummary,
  getCountryRiders,
  getFreeAgents,
  getPublicRider,
  getTeamDetail,
  getTeams,
  type CountryRiderRow,
  type CountrySummaryRow,
  type FreeAgentRow,
  type PublicRiderDetail,
  type TeamDetail,
  type TeamListRow,
  type TeamRiderRow,
} from './browse.js'
export {
  clusterTeamNationalities,
  planNationalClustering,
  planWorld,
  reconcileTeams,
  renationalizeBotRosters,
  seedWorld,
  teamCountryByIndex,
  NATIONAL_CORE_SHARE,
  type ClusterRider,
  type ClusterTeam,
  type RiderPlan,
  type TeamPlan,
  type WorldPlan,
} from './world.js'
export { ensureTestTourField } from './npc.js'
export {
  getRacePrefs,
  releaseUncontractedHumans,
  runCallups,
  setRacePref,
  type RacePrefRow,
} from './callups.js'
export {
  acceptOffer,
  getContract,
  getOffers,
  rejectOffer,
  runMarket,
  type ContractRow,
  type OfferRow,
} from './contracts.js'
export { runRollover } from './rollover.js'
export { emitNews, getGlobalNews, getRiderNews, getTeamNews, type NewsItem } from './news.js'
export {
  getAllTimeRecords,
  getHallOfFame,
  getPalmares,
  getRaceHistory,
  getRanking,
  getRiderBadges,
  getSeasonAwards,
  getSeasonWinners,
  getYoungRiders,
  type AllTimeRecords,
  type AwardWinner,
  type Badge,
  type HallOfFameRow,
  type PalmaresRow,
  type RaceHonour,
  type RankingRow,
  type RecordEntry,
  type SeasonAwards,
} from './ranking.js'
export {
  awardRacePrizes,
  creditRider,
  getLedger,
  runPayroll,
  type Ledger,
  type LedgerEntry,
} from './economy.js'
export {
  getGcThroughStage,
  getKomClassification,
  getPointsClassification,
  getRaceGc,
  getRunStageDays,
  getStageResults,
  getStageSnapshot,
  getStageWinners,
  teamsClassification,
  type StageWinnerRow,
  type GcRow,
  type PointsRow,
  type StageResultRow,
  type StageSnapshotRow,
  type TeamGcRow,
} from './results.js'
export {
  generateName,
  generateUniqueName,
  isBlockedName,
  regenerateName,
  type CountryNames,
  type GeneratedName,
} from './names.js'
export { dedupeWorldNames, type DedupeResult } from './dedupeNames.js'
export { getWorldHealth, type WorldHealth, type TickLogRow } from './adminStats.js'
export { langForCountry, makeLangTeamName, teamNameCandidate, type LangId } from './teamNameLang.js'
export {
  getAccountControl,
  setUserPremium,
  takeOverBotTeam,
  updateOwnedTeam,
  type AccountControl,
  type TakeOverResult,
  type TeamEdit,
  type TeamEditResult,
} from './teamControl.js'
export { isRiderNameTaken, generateUniqueRiderName } from './nameService.js'
export {
  addBlocked,
  getBlockedSet,
  isNameBlocked,
  listBlocked,
  normalizeBlocked,
  removeBlocked,
  type BlockedKind,
  type BlockedNameRow,
} from './blocklist.js'
export {
  createRider,
  getCurrentWorld,
  getDailyLog,
  getRiderForUser,
  getRiderSummary,
  getSeasonRank,
  getWorldClock,
  setRiderArchetype,
  type CreateRiderInput,
  type DailyLogRow,
  type RiderHiddenInput,
  type RiderSummary,
} from './riders.js'
export { getTrainingOrders, setTrainingOrders, type TrainingOrderRow } from './training.js'
export { getRiderRaceDays } from './riderSchedule.js'
export {
  getRiderLastRaceReport,
  type RiderRaceReport,
  type RaceReportOrders,
  type RaceReportEvent,
} from './raceReport.js'
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
