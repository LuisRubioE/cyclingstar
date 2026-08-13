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
  TANK,
  TRAINING,
} from './constants.js'
export { deriveClimbCategory, isWall, sampleProfile, stageLengthKm } from './stage/sample.js'
export { stageRng, stageSeed, type StageSeedParts } from './stage/rng.js'
export { blockProbability, rollHazard } from './stage/hazard.js'
export { simulateStage, stageTss } from './stage/simulate.js'
export { simulateTimeTrial } from './stage/timetrial.js'
// EL VOCABULARIO DE GRUPOS (v27, SPEC 6.15 y docs/motor.md §16). La tabla de qué nombres puede imprimir
// cada plantilla vive con el medidor —es quien cuenta cuántos ve un lector por etapa— y la exporta
// para que el test del journal compruebe que ninguna frase usa uno que no esté declarado.
export { GROUP_NOUNS, WATCHED_GROUP_NOUNS } from './sim/coherence.js'
// El orden de salida de una crono (v18): regla pura, exportada y con test propio. Fuera del motor
// la usa la web para explicar el formato antes de que la etapa se corra.
export {
  timeTrialStartOrder,
  type StartOrderMode,
  type StartOrderPlan,
  type StartOrderRider,
  type StartSlot,
} from './stage/startOrder.js'
export { crashLambda, rollCrash, type CrashOutcome } from './stage/crash.js'
// Abandonos automáticos (docs/motor.md §VI.3). `injuryEndsRace` la consume packages/db: el motor
// simula UNA etapa y no sabe que hay un mañana al que no tomar la salida.
export {
  applyTimeCut,
  collapseLambda,
  elevationGainPerKm,
  injuryEndsRace,
  shouldCollapse,
  timeCutFraction,
  type CollapseContext,
  type FinishGroup,
  type TimeCutOutcome,
} from './stage/abandon.js'
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
export { stageKindOf, type StageShape } from './routes/stageKind.js'
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
  analyzeErosion,
  analyzeFlat,
  analyzeMountain,
  analyzeTimeTrial,
  type ErosionStats,
  type FlatStats,
  type MountainStats,
  type TimeTrialStats,
} from './sim/analyze.js'
export {
  campaignSeeds,
  flatScenario,
  queenScenario,
  queenThirdWeekScenario,
  timeTrialScenario,
  type Scenario,
} from './sim/scenarios.js'
export { TARGETS, type Target } from './sim/targets.js'
// LA RADIO DE CARRERA (v28): la foto de `StageProbe` convertida en «estado de carrera por
// kilómetro» —grupos, huecos y quién tira—. Se exporta porque la cuenta es la misma para la
// herramienta de depuración (`scripts/race-radio.mjs`) y para la vista recorrible que viene detrás.
export {
  raceRadioCollector,
  raceRadioFrom,
  radioKmFrom,
  radioKmPoints,
  type RaceRadio,
  type RaceRadioOptions,
  type RadioGroup,
  type RadioGroupKind,
  type RadioKm,
  type RadioPuller,
} from './sim/raceRadio.js'
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
  isDeepDepleted,
  matchCount,
  rhythm,
  tankState,
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
  TankState,
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
  initialEnergy,
  mForm,
  mHealth,
  mMorale,
  mTankFitness,
  mTankFreshness,
  raceIllnessProbability,
  regressMorale,
  tauFatigue,
  tsbFactor,
  type Load,
} from './banister.js'
export * from './random.js'
