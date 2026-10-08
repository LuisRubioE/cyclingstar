/**
 * packages/db: capa de datos con Drizzle (SPEC 11). Migraciones solo con drizzle-kit.
 * Paso 6: esquema fundacional (worlds, users, game_state, tick_log) y el arrancador de
 * migraciones con advisory lock.
 */
export * from './schema.js'
export { createDb, type Database, type DbClient } from './client.js'
export { runMigrations } from './migrate.js'
export {
  DEFAULT_MAX_DAYS_PER_RUN,
  POISON_PILL_ATTEMPTS,
  GENESIS_WORLD_SEED,
  runTick,
  targetGameDay,
  type RunTickOptions,
  type TickSummary,
} from './tick.js'
export { WORLD_REPAIR_VERSION, markWorldRepaired, worldNeedsRepair } from './worldRepair.js'
export {
  ENROLL_LOCK_DAYS,
  ensureRaceRosterFrozen,
  lockCalendarDay,
  predictStartlist,
  recomputeWorldRanking,
  runCalendarDay,
  selectFieldTeams,
  type CalendarDayOptions,
  type RaceStartlist,
  type StartlistRider,
  type StartlistTeam,
} from './calendarRun.js'
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
  planResidenceRepairs,
  planWorld,
  reconcileBotResidences,
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
export { enterRace, getEnterableRaces, withdrawRace, type EnterableRace } from './raceEntry.js'
export {
  draftRace,
  getRiderTeamRacePlan,
  getTeamCalendar,
  undraftRace,
  type TeamCalendar,
  type TeamCalendarRace,
  type TeamPlanRace,
  type TeamRacePlan,
} from './teamPlan.js'
export { runRollover } from './rollover.js'
export {
  emitNews,
  getGlobalNews,
  getRiderNews,
  getStageNews,
  getTeamNews,
  newsNames,
  type NewsItem,
  type NewsReadOptions,
} from './news.js'
export { palmaresTitleSource, type ChampionTitleSource, type Queryable } from './titles.js'
// La línea temporal grabada de E2 (docs/retransmision.md §5.5 y §5.6; paso 5): el diario del tick que
// baja a `runOneStage` por `StageRunSpec.timeline`, la escritura de las filas y la lectura con su LRU,
// que el 6a pone delante del adaptador de la radio.
export {
  TIMELINE_TOMBSTONE_FORMAT,
  TimelineUnavailableError,
  clearStageTimelineCache,
  readStageTemplateRev,
  readStageTimeline,
  stageTimelineRow,
  timelineTickLog,
  tombstoneRow,
  writeStageTimelineRows,
  type StageTimelineMeta,
  type StageTimelineRow,
  type TimelineFailure,
  type TimelineFailureReason,
  type TimelineTickLog,
} from './timelines.js'
export { buildTimelineCast, type CastContext } from './cast.js'
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
  getRaceRiderIdentities,
  getRacedStageProfiles,
  getRunStageDays,
  getStageNonFinishers,
  getStageResults,
  getStageSnapshot,
  getStageWinners,
  type StageWinnerRow,
  type GcRow,
  type PointsRow,
  type RaceRiderIdentity,
  type RacedProfileRow,
  type StageResultRow,
  type StageSnapshotRow,
} from './results.js'
// Una etapa corrida como la corre el tick, para los tests de `apps/api` que piden la ruta de etapa y
// para los scripts de banco (docs/retransmision.md §17.3; el diseño lo ponía en el paso 2, §17.20).
export { runOneStage, type StageRunSpec } from './stageRun.js'
// El horizonte y el velo de E2 (docs/retransmision.md §4.10 y §10.6): los tipos y las funciones puras
// nacen en el 3a (17-g); computeHorizon, el mapa del día, el memo, horizonSummary y touchLastSeen, en
// el 7a, con clearHorizonCaches solo para los tests (el mundo de B1, §16.3); veilCast, en el 7b; y el
// predicado, veilSql, en el 8a.
export {
  TtlMemo,
  anonHorizon,
  clearHorizonCaches,
  computeHorizon,
  horizonSummary,
  isVeiled,
  lastRunStages,
  raceExpired,
  stageCountOf,
  stageGameDay,
  stageGateOf,
  throughStage,
  touchLastSeen,
  veilCast,
  veilSql,
  worldHorizon,
  type Horizon,
  type HorizonKind,
  type KnowledgeLetter,
  type ToGoKmOf,
  type VeilDelta,
  type VeiledStage,
  type Viewer,
  type WorldRef,
} from './horizon.js'
// Lo visto (E2, §10.3; paso 7a): las cuatro escrituras de race_watch, sus dos lecturas y la memoria del
// proceso de lo alcanzado (D-55).
export {
  LETTER_OF_MODE,
  ProgressMemory,
  readSpoilerPrefs,
  readWatch,
  recordProgress,
  revealStage,
  setFollow,
  setSpoilerScope,
  type ProgressMemoryOptions,
  type ProgressResult,
  type ReportOutcome,
  type WatchKey,
  type WatchRow,
} from './watch.js'
// El reparto provisional del adaptador de la radio (E2, §3.8, 17-k).
export { getCastIdentities, getOwnRiderIds, type CastIdentities } from './castIdentities.js'
export {
  TEAM_SCORING_RIDERS,
  getTeamClassifications,
  teamStageScores,
  type TeamClassRow,
  type TeamClassifications,
  type TeamStageEntry,
  type TeamStageScore,
} from './teamClassification.js'
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
  releaseUserToWorld,
  setUserPremium,
  takeOverBotTeam,
  updateOwnedTeam,
  type AccountControl,
  type TakeOverResult,
  type TeamEdit,
  type TeamEditResult,
} from './teamControl.js'
export {
  deleteUserAsAdmin,
  isRootAdmin,
  isRootAdminUser,
  isUserAdmin,
  listUsersForAdmin,
  updateUserAsAdmin,
  type AdminUserPatch,
  type AdminUserRow,
} from './adminUsers.js'
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
  YOUNG_MAX_AGE,
  getRaceClassifications,
  standingsByRider,
  type ClassificationRow,
  type RaceClassifications,
} from './classifications.js'
export { buildRaceContext, raceMemoryOf, raceShapeOf } from './raceContext.js'
export {
  backfillRaceRoutes,
  canonico,
  freezeRaceRoute,
  getRaceRoute,
  huellaCanonica,
  raceStagesForWorld,
  reclassifyRouteSource,
  seasonOfRaceKey,
  type FrozenStage,
  type RouteSource,
} from './raceRoutes.js'
// TEMPORAL (v88): la transición E1; se borra con `sim/legacy/` (ver transicionE1.ts).
export {
  E1_TRANSICION_DIAS,
  congelarTransicionE1,
  type ResultadoTransicionE1,
} from './transicionE1.js'
export {
  createRider,
  getAttrTrend,
  getBlockReport,
  getCoachView,
  getCurrentWorld,
  getDailyLog,
  countRidersForUser,
  getRiderForUser,
  getRiderHealth,
  getRiderSummary,
  getSeasonRank,
  getWorldClock,
  setRiderArchetype,
  TREND_WINDOW_DAYS,
  type AttrLogSource,
  type AttrTrendRow,
  type BlockReport,
  type BlockReportRow,
  type CoachView,
  type CoachViewRow,
  type CreateRiderInput,
  type DailyLogRow,
  type HealthState,
  type RiderHealth,
  type RiderHiddenInput,
  type RiderSummary,
} from './riders.js'
export {
  getPlanForDay,
  getTeamTrainingPlan,
  getTrainingMode,
  getTrainingOrders,
  getTrainingPlan,
  setTeamTrainingPlan,
  setTrainingMode,
  setTrainingOrders,
  setTrainingPlan,
  type TrainingMode,
  type TrainingOrderRow,
  type TrainingPlanRow,
} from './training.js'
export {
  getRiderRaceDays,
  getRiderTravelDays,
  getRiderUpcomingRaces,
  outboundTravelDays,
  retireFromRace,
  returnTravelDays,
  returnTravelDaysFor,
  ridersTravellingBack,
  ridersTravellingOutbound,
  type RetireOutcome,
  type RiderTravelDay,
  type TravelDirection,
  type RiderUpcomingRace,
} from './riderSchedule.js'
export {
  buildRiderRaceResults,
  getRiderRaceResults,
  type RiderRaceResult,
  type RiderStagePlacing,
} from './riderResults.js'
export {
  getRiderLastRaceReport,
  lastReadyStageOf,
  type ReadyStage,
  type RiderRaceReport,
  type RaceReportOrders,
  type RaceReportEvent,
} from './raceReport.js'
export {
  getRaceRivals,
  getRaceTeams,
  getRosterTeammates,
  getStageOrders,
  isOnRoster,
  setStageOrders,
  type Effort,
  type Mentality,
  type StageOrderRow,
  type StageRole,
} from './raceOrders.js'
export { backfillArchetypes, type BackfillResult } from './scripts/backfillArchetypes.js'
