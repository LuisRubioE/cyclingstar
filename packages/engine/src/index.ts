/**
 * packages/engine: motor de etapa por bloques de 100 metros (SPEC 6) y lógica pura de juego.
 * Función pura y determinista: jamás importa de db, jamás usa Date.now() ni Math.random();
 * todo azar viene del RNG sembrado (CLAUDE.md, SPEC 6.1).
 *
 * Paso 15: creación del genoma del ciclista (SPEC 3.4-3.5).
 * Paso 21: andamiaje del motor de etapa (SPEC 6.1-6.2): tipos, subflujos de RNG y muestreo.
 */
export {
  BANISTER,
  CREATION,
  ENGINE_VERSION,
  HEALTH,
  MORALE,
  NPC,
  STAGE,
  TRAINING,
} from './constants.js'
export { deriveClimbCategory, isWall, sampleProfile, stageLengthKm } from './stage/sample.js'
export { stageRng, stageSeed, type StageSeedParts } from './stage/rng.js'
export { blockProbability, rollHazard } from './stage/hazard.js'
export { simulateStage, stageTss } from './stage/simulate.js'
export { simulateTimeTrial } from './stage/timetrial.js'
export { crashLambda, rollCrash, type CrashOutcome } from './stage/crash.js'
export {
  markingMargin,
  resolveMarking,
  wheelProbability,
  type MarkingOutcome,
} from './stage/marcaje.js'
export { EventLog } from './stage/events.js'
export {
  elevationProfile,
  renderAltimetrySvg,
  type AltimetryMarker,
  type AltimetryOptions,
  type ElevationPoint,
} from './routes/altimetry.js'
export { TEST_TOUR, type StageKind, type TourStage } from './routes/testTour.js'
export {
  SEASON_CALENDAR,
  type CalendarRace,
  type CalendarStage,
  type RaceFormat,
  type RaceLevel,
  type StageSpec,
} from './routes/calendar.js'
export {
  raceLastDay,
  raceOngoingBefore,
  scheduledStageIndex,
  stageDayOfSeason,
} from './routes/schedule.js'
export { RACE_ROUTES, raceRoute, stageEndpoints } from './routes/raceRoutes.js'
export {
  RACE_CLASSES,
  RACE_CLASS_INFO,
  classPrestige,
  racePoints,
  type RaceClass,
  type RaceClassInfo,
} from './routes/uci.js'
export {
  generateNpcRider,
  sampleNpcAge,
  type Division,
  type NpcGenome,
  type NpcHidden,
} from './world/npc.js'
export { renderJerseySvg } from './world/jersey.js'
export { autoStageOrders, type AutoOrderRider, type AutoOrderStage } from './world/autoOrders.js'
export { neoproAge, shouldRetire } from './world/lifecycle.js'
export { gcPrizes, stagePrize, teamGcPrizes, teamStagePrize } from './world/prizes.js'
export { AVG_WEEKLY_WAGE, SPONSOR_INCOME_PER_WEEK, npcWageBill } from './world/teamEconomy.js'
export {
  gcPointsByClass,
  gcResultPoints,
  stagePointsByClass,
  stageResultPoints,
} from './world/points.js'
export { renderNews, type NewsData, type NewsKind } from './world/news.js'
export {
  callupScore,
  raceVocationFit,
  selectSquad,
  type CallupCandidate,
  type SquadSelection,
  type TeamPhilosophy,
} from './world/callups.js'
export {
  ageMarketK,
  offerSalary,
  offerSeasons,
  releaseClause,
  type ContractRole,
  type OfferInput,
} from './world/contracts.js'
export {
  analyzeFlat,
  analyzeMountain,
  analyzeTimeTrial,
  type FlatStats,
  type MountainStats,
  type TimeTrialStats,
} from './sim/analyze.js'
export {
  campaignSeeds,
  flatScenario,
  queenScenario,
  timeTrialScenario,
  type Scenario,
} from './sim/scenarios.js'
export {
  advanceGroup,
  createGroup,
  gapSeconds,
  isCapture,
  mergeGroups,
  percentile75,
  type Group,
  type GroupInit,
} from './stage/group.js'
export {
  accLimit,
  blockCost,
  blockPerfil,
  blockSeconds,
  climbWeight,
  costBase,
  draftMax,
  effNow,
  effNowAttr,
  erosion,
  depletion,
  matchCount,
  rhythm,
  stepSpeed,
  targetSpeed,
  vRef,
  type AccOptions,
  type Eff,
} from './stage/physics.js'
export type {
  Banner,
  BannerType,
  Block,
  BlockTerrain,
  ClimbCategory,
  Incident,
  Mentality,
  RaceEvent,
  Ramp,
  Segment,
  SegmentTerrain,
  StageInput,
  StageOrders,
  StageOutput,
  StageProfile,
  StageResult,
  StageRider,
  StageRole,
} from './stage/types.js'
export {
  simulateRiderDay,
  type DailyLog,
  type RiderDayContext,
  type RiderDayResult,
  type RiderDayState,
} from './progression.js'
export { generateRiderGenome, type RiderGenome, type RiderHidden } from './creation.js'
export {
  applyDailyLoad,
  eff0,
  fitnessFactor,
  formIndex,
  formStars,
  freshnessBar,
  illnessProbability,
  mForm,
  mHealth,
  mMorale,
  regressMorale,
  tauFatigue,
  tsbFactor,
  type Load,
} from './banister.js'
export * from './random.js'
