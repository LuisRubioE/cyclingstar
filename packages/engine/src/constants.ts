/**
 * Hogar único de todas las constantes de juego del motor (CLAUDE.md, SPEC 6).
 * Cada constante se documenta con su intención y todo cambio se anota en docs/balance.md
 * con la razón y la corrida de Montecarlo que lo justifica.
 *
 * Paso 21: se pueblan las constantes del SPEC 6 (STAGE): resolución, ley de velocidad,
 * drafting, cerillos, erosión, intensidades de riesgo y finales.
 */

/**
 * Versión del comportamiento del motor. Se incrementa ante CUALQUIER cambio de
 * comportamiento del motor (CLAUDE.md) y entra en la semilla del RNG (SPEC 6.1:
 * seed = sha256(worldSeed, raceId, stageDay, engineVersion)).
 */
export const ENGINE_VERSION = 1 as const

/**
 * Constantes de creación del ciclista (SPEC 3.4 y 3.5). El muestreo es determinista a
 * partir de la semilla del corredor.
 */
export const CREATION = {
  // Valores iniciales por categoría de la vocación (SPEC 3.5).
  primaryMean: 46,
  adjacentMean: 38,
  restMean: 30,
  valueSd: 3,
  // TAC inicia siempre bajo: el oficio se aprende corriendo (SPEC 3.5, 3.6).
  tacInitialMin: 25,
  tacInitialMax: 32,

  // Techos: mu_a = ceilingBase + ceilingBiasWeight * bias. El peso 12 es LA perilla
  // entre fantasía y lotería (SPEC 3.5); su ajuste va a docs/balance.md.
  ceilingBase: 58,
  ceilingBiasWeight: 12,
  ceilingSd: 9,
  ceilingMin: 45,
  ceilingMax: 96,

  // Don global: garantiza que eres ciclista, no que seas de élite en tu vocación (SPEC 3.5).
  globalGift: true,
  giftThreshold: 82,
  giftMin: 82,
  giftMax: 90,

  // Atributos ocultos (SPEC 3.4).
  talentAlpha: 2,
  talentBeta: 4.5,
  fragilitySigma: 0.25,
  fragilityMin: 0.6,
  fragilityMax: 1.8,
  peakAgeMin: 26,
  peakAgeMax: 31,
  declineOffsetMin: 3,
  declineOffsetMax: 6,
} as const

/**
 * Generación del mundo NPC (SPEC 10). Atributos ~ clamp(N(mu_rol_div, 8), 20, 95); el mu base por
 * división y los descensos por categoría de atributo modelan el nivel de cada corredor. Los techos
 * de los jóvenes dejan margen de mejora; los veteranos ya están hechos.
 */
export const NPC = {
  // mu del atributo primario de la vocación por división (World Tour, Pro Series, Continental).
  divisionPrimaryMu: { WT: 78, PRS: 68, CON: 60 },
  adjacentDrop: 10,
  restDrop: 22,
  attrSd: 8,
  attrMin: 20,
  attrMax: 95,
  // Techos por edad (SPEC 10): joven (<= 23) crece; veterano no.
  youngAge: 23,
  ceilingBoostMin: 5,
  ceilingBoostMax: 30,
  ceilingMax: 96,
  // Distribución de edades 18..38 sesgada a 24..30 (media de una Beta reescalada).
  ageMin: 18,
  ageMax: 38,
  ageBetaAlpha: 4,
  ageBetaBeta: 4,
} as const

/** Modelo de Banister: forma como consecuencia contable de la carga (SPEC 4). */
export const BANISTER = {
  tauFitness: 42,
  // tauFatiga = base + scale * (1 - REC/100): 5 días si REC=100, 10 si REC=0.
  tauFatigueBase: 5,
  tauFatigueRecScale: 5,
  // Estado inicial de un neoprofesional.
  initialCtl: 45,
  initialAtl: 45,
  // fitF = clamp(CTL / fitnessCap, 0, 1).
  fitnessCap: 95,
  // M_form = base + scale * formIndex, en [0.92, 1.05].
  mFormBase: 0.92,
  mFormScale: 0.13,
  // Barra de frescura: clamp(base + slope * TSB, 0, 100).
  freshnessBase: 55,
  freshnessSlope: 1.1,
} as const

/** Salud y enfermedad (SPEC 4.2, 4.3). */
export const HEALTH = {
  mSano: 1.0,
  mMolestias: 0.96,
  mEnfermo: 0.9,
  // p_enfermo_dia = base * fragilidad * exp(max(0, -TSB - tsbOffset) / tsbScale).
  illnessBase: 0.002,
  illnessTsbOffset: 22,
  illnessTsbScale: 9,
} as const

/** Moral (SPEC 4.2, 4.4). M_moral = base + scale * MOR/100; regresión diaria a la media. */
export const MORALE = {
  mMoralBase: 0.98,
  mMoralScale: 0.04,
  mean: 60,
  regression: 0.03,
} as const

/** Progresión por entrenamiento y decaimientos (SPEC 5.2, 5.5). */
export const TRAINING = {
  // K_talento = base + talento/100, en [0.6, 1.6].
  kTalentBase: 0.6,
  // K_intensidad.
  kIntSuave: 0.7,
  kIntNormal: 1.0,
  kIntFuerte: 1.25,
  // K_ready: entrenar reventado apenas rinde.
  kReadyTsbThreshold: -30,
  kReadyLow: 0.25,
  // K_dim: ganancias decrecientes hacia el techo personal.
  kDimCap: 1.2,
  kDimExponent: 1.3,
  kDimDenomFloor: 10,
  kDimCeilingRef: 30,
  // Decaimientos (SPEC 5.5).
  detrainingCtlThreshold: 35,
  detrainingLoss: 0.03,
  ageDecayBase: 0.02,
  ageDecaySlope: 0.004,
  trainedDecayFactor: 0.4,
  desPavDecayFactor: 0.25,
  // Enfermedad: días fuera (SPEC 4.3).
  illDaysMin: 2,
  illDaysMax: 6,
} as const

/**
 * Motor de etapa por bloques de 100 metros (SPEC 6). Todo el azar entra por intensidades
 * `λ` (eventos/km), nunca por probabilidades por bloque: p_bloque = 1 - exp(-λ·dx) (6.8).
 * Las aceleraciones se expresan en km/h por segundo, jamás por bloque (misma doctrina de
 * invariancia de resolución). Cada perilla se anota en docs/balance.md.
 */
export const STAGE = {
  // Paso de integración fijo: 0.1 km = 100 m. Una etapa de 180 km son 1.800 bloques (6.1).
  dx: 0.1,

  // 6.4 — Ley de velocidad.
  // w(g) = clamp((g - 2) / 6, 0.15, 1.0): peso del atributo de subida frente al de llano.
  wGradientOffset: 2,
  wGradientScale: 6,
  wMin: 0.15,
  wMax: 1.0,
  // Muro: subida total <= 2,5 km con g >= 8 -> el atributo de subida es COL en vez de MON.
  wallMaxKm: 2.5,
  wallMinGradient: 8,
  // Rompepiernas rueda como llano pero con g = 1.5 en la ley (6.4).
  rollingGradient: 1.5,
  // Paves: 0.6·eff(PAV) + 0.4·eff(LLA).
  pavesPavWeight: 0.6,
  pavesLlaWeight: 0.4,
  // vRef(g) km/h: subida clamp(44 - 2.7·g, 14, 44) | llano 44 | paves 38 | descenso 55.
  vRefFlat: 44,
  vRefClimbBase: 44,
  vRefClimbSlope: 2.7,
  vRefClimbMin: 14,
  vRefPaves: 38,
  vRefDescent: 55,
  // ritmo(c) = 0.90 + 0.35·c, con c = compromiso del grupo (0 tempo, 1 a bloque).
  rhythmBase: 0.9,
  rhythmScale: 0.35,
  // v_objetivo = vRef(g)·(P75/75)^0.34·ritmo(c).
  p75Reference: 75,
  p75Exponent: 0.34,
  // Inercia: aceleraciones acotadas en km/h por segundo, asimétricas (6.4).
  accPedal: 0.4,
  accGrav: 1.5,
  accGravGradient: -2,
  accFinal: 1.5,
  decMax: 3.0,
  matchAccMultiplier: 2.5,
  // Velocidad inicial del grupo tras la salida neutralizada (6.3).
  initialSpeed: 35,
  captureGapSeconds: 5,
  // Un descolgado en llano/descenso vuelve al pelotón si su boquete es de este orden (s): la subida
  // parte el grupo, pero en terreno rodador los cortes pequeños se cazan y el pelotón se recompone.
  regroupGapSeconds: 22,
  // Nº mínimo de descolgados en un bloque de subida para narrar el "corte" del pelotón en la crónica.
  splitEventMinDropped: 2,
  // Distancia mínima (km) entre dos "cortes" narrados: evita repetir la frase bloque a bloque.
  splitEventMinKmGap: 3,
  // Journal: cada cuántos km se reporta la ventaja de la fuga, y el boquete mínimo para reportarlo.
  gapReportKmGap: 25,
  gapReportMinSeconds: 20,
  // Colaboración de la fuga: por encima de este compromiso, la fuga «va a bloque» (colabora bien).
  breakCoopThreshold: 0.58,
  // Fracción del recorrido a partir de la cual se narra que los sprinters organizan la caza.
  chaseAnnounceFrac: 0.4,
  // Nº mínimo de corredores en el grupo de cabeza para narrar la llegada como sprint masivo.
  bunchSprintMinRiders: 8,
  // La fuga se fecha en los primeros km (ataques de salida), no en el km 0: mín + aleatorio determinista.
  breakFormMinKm: 3,
  breakFormKmRange: 17,

  // 6.5 — Coste, tanque y drafting.
  // costeBase paves: 0.55 + 0.06·estrellas.
  costPavesBase: 0.55,
  costPavesStars: 0.06,
  // costeBase por pendiente: g<=-3 -> 0.10 | -3<g<0 -> lerp(0.10, 0.30) | g>=0 -> 0.30 + 0.11·g.
  costDescentFloor: 0.1,
  costFlatBase: 0.3,
  costClimbSlope: 0.11,
  costDescentGradient: -3,
  // draftMax por terreno: llano 0.32 | descenso 0.25 | paves 0.18 | subida clamp(0.32 - 0.028·g, 0.08, 0.32).
  draftFlat: 0.32,
  draftDescent: 0.25,
  draftPaves: 0.18,
  draftClimbBase: 0.32,
  draftClimbSlope: 0.028,
  draftClimbMin: 0.08,
  // shelter_i: protegido 0.9 | rotando/trabajando 0.4 | fugado que releva 0.5 | solo 0.0.
  shelterProtected: 0.9,
  shelterWorking: 0.4,
  shelterRelay: 0.5,
  shelterAlone: 0.0,
  // coste = dx·costeBase·ritmo(c)^1.6·(1 - draftMax·shelter).
  costRhythmExponent: 1.6,

  // 6.6 — Cerillos (esfuerzos supraumbral discretos).
  // comp = 0.50·max(MON,COL) + 0.30·RES + 0.20·LLA; cerillos = 2 + (comp>=55)+(>=72)+(>=88).
  matchCompMonWeight: 0.5,
  matchCompResWeight: 0.3,
  matchCompLlaWeight: 0.2,
  matchBase: 2,
  matchThresholds: [55, 72, 88],
  matchMin: 1,
  matchTsbPenaltyThreshold: -25,
  matchCost: 5,
  matchBonus: 10,
  matchBonusBlocks: 5,
  // Vaciado profundo: quien termina con E < 0.12·E0 arranca con un cerillo menos (6.6).
  matchDepletionThreshold: 0.12,

  // 6.7 — Erosión por vaciado (durabilidad).
  // depl = clamp(1 - E/E0, 0, 1); umbral = 0.35 + 0.40·RES/100.
  erosionThresholdBase: 0.35,
  erosionThresholdResScale: 0.4,
  erosionExponent: 1.2,
  // coefErosion por atributo.
  erosionCoef: {
    SPR: 0.45,
    COL: 0.35,
    MON: 0.3,
    LLA: 0.25,
    CRI: 0.25,
    PAV: 0.2,
    TAC: 0.15,
    DES: 0.1,
  },
  // Pájara: E <= 0 -> atributos físicos · 0.55 y descuelgue automático.
  bonkFactor: 0.55,

  // 6.8 — Intensidades de riesgo (eventos/km). Ajustables desde docs/balance.md.
  lambdaBreakawayAttack: 1.2,
  lambdaCounterAttack: 0.02,
  lambdaBridge: 0.08,
  bridgeGapMinSeconds: 30,
  bridgeGapMaxSeconds: 150,
  lambdaClimbAttack: 0.1,
  lambdaDropBase: 0.9,
  // Descuelgue: λ = lambdaDropBase · max(0, P75 - perfil) / denom. El denominador traduce el
  // déficit en puntos de atributo a una intensidad humana; se calibra al Montecarlo de montaña.
  dropDeficitDenom: 12,
  dropDeficitTolerance: 2,
  // Un descolgado rueda solo a su tope (contrarreloj improvisada), perdiendo tiempo bloque a bloque.
  shedCommit: 0.7,
  // 6.10 — Fuga: consolida si el compromiso del pelotón < 0.25 durante 2 km.
  breakawayCommitThreshold: 0.25,
  breakawayConsolidateKm: 2,
  // La fuga rueda a tempo cooperando (conserva), con cooperación variable por etapa: unas se
  // entienden y aguantan, otras se miran y las cazan. Esa varianza produce el 2-8% de fugas.
  breakawayCommitMin: 0.5,
  breakawayCommitMax: 0.65,
  // Control del boquete (leash): los sprinters dejan a la fuga una ventaja máxima que se cierra
  // linealmente hasta el punto de captura (finish - 12 km). El pelotón regula en lazo cerrado:
  // tempo de mantenimiento + ganancia proporcional al exceso sobre el boquete deseado.
  chaseMaxLeashSeconds: 150,
  chaseHoldCommit: 0.62,
  chaseGain: 0.006,
  // Control de la general en etapas sin llegada masiva: el pelotón limita el boquete a este
  // tempo (no captura); la subida final decide. Calibra el % de fugas que ganan en montaña.
  gcControlLeash: 265,
  // Compromiso de los favoritos en la subida decisiva: tempo duro que descuelga poco a poco
  // (no máximo, o el grupo llegaría junto). Calibra la caza de la fuga y el estiramiento.
  climbRaceCommit: 0.85,
  breakawayScoreTac: 0.4,
  breakawayScoreLla: 0.3,
  breakawayScoreRng: 0.3,
  breakawaySkipSprThreshold: 70,
  breakawaySkipEnergyFraction: 0.4,
  breakawayTensionPerKm: 0.4,
  breakawayTensionThreshold: 6,
  breakawayTensionCoopFactor: 0.7,
  breakawayTensionAttackFactor: 3,

  // 6.9 — El pelotón como controlador (decisiones cada 10 bloques, con histéresis).
  // El ritmo del pelotón lo marca su cuarto delantero de punteros, no todo el bloque (6.4).
  pelotonPaceFraction: 0.25,
  // En subida el ritmo lo imponen los más fuertes (atacan): fracción menor -> más selección.
  // Calibra el estiramiento del grupo de cabeza en montaña (brechas 1-4 min).
  climbPaceFraction: 0.12,
  decisionEveryBlocks: 10,
  chaseFeasibleSecondsPerKm: 8,
  chaseCatchTargetKm: 12,
  commitHysteresis: 0.4,
  commitIdle: 0.1,
  gcThreatFraction: 0.6,

  // 6.11 — Banners: metas volantes y cimas puntuables.
  bannerCost: 2,
  // Derivación de categoría de cima: score = sum(km_i·g_i^2) con g_i > 2.
  climbScoreMinGradient: 2,
  climbCatThresholds: { cat4: 40, cat3: 120, cat2: 300, cat1: 600, hc: 1000 },
  sprintPoints: [20, 15, 12, 10, 8, 6, 4, 2],
  // Puntos de la clasificación por puntos que reparte la META de etapa (SPEC 6.11). El final de
  // etapa es la fuente principal de la regularidad, por encima de las metas volantes intermedias.
  finishPoints: [25, 20, 16, 14, 12, 10, 8, 7, 6, 5, 4, 3, 2, 1],
  climbPoints: {
    HC: [20, 15, 12, 10, 8, 6, 4, 2],
    cat1: [10, 8, 6, 4, 2, 1],
    cat2: [5, 3, 2, 1],
    cat3: [2, 1],
    cat4: [1],
  },

  // 6.12 — Últimos 2 km (20 bloques) y finales.
  finalBlocks: 20,
  sprintScoreNoiseSd: 0.045,
  // "Día" del corredor (SPEC 6.7): cada corredor rinde algo mejor o peor cada etapa (piernas del día),
  // escalando su nivel efectivo. Aporta variación —no siempre gana el mismo— sin volverlo azar puro.
  dayFormSd: 0.035,
  lambdaLateAttack: 0.5,
  lateAttackKm: 3,
  bigGroupThreshold: 25,
  hilltopFinishKm: 3,
  hilltopFinishGradient: 5,

  // 6.13 — CRI/cronoescalada/CRE.
  ttCommitment: 0.85,
  ttNoiseSd: 0.006,
  ttCompositeCri: 0.75,
  ttCompositeLla: 0.15,
  ttCompositeRes: 0.1,
  teamTtShelter: 0.5,
  teamTtPaceRider: 4,
  teamTtPaceFactor: 0.98,

  // 6.14 — Caídas e incidentes.
  crashBaseFlat: 0.025,
  crashBaseMedium: 0.018,
  crashBaseMountain: 0.022,
  crashBasePaves: 0.07,
  crashBaseTt: 0.008,
  crashErosionScale: 0.5,
  crashSkillScale: 0.35,
  // Intensidad de caída por bloque (eventos/km), ponderada por terreno de riesgo (SPEC 6.14).
  // Calibrada para que una etapa de pavés deje un 5-12% de bajas por caída.
  crashLambdaBase: 0.00005,
  crashLambdaDescent: 0.0018,
  crashLambdaPaves: 0.0045,
  crashLambdaFinal: 0.0008,
  // severidad: 60% sin daño (30-90 s) | 30% rasguños (eff -3%, 3-6 d) | 9% leve (5-15 d) | 1% grave (20-60 d).
  crashSeverity: {
    none: 0.6,
    scratches: 0.3,
    minor: 0.09,
    major: 0.01,
  },

  // 6.15 — Bonificaciones de tiempo en meta.
  timeBonuses: [10, 6, 4],

  // 6.18 — Marcaje (capa 4). p_rueda = clamp(0.35 + (TAC_m-TAC_t)/80 - 0.10·extra, 0.15, 0.90).
  markWheelBase: 0.35,
  markWheelTacScale: 80,
  markWheelExtraPenalty: 0.1,
  markWheelMin: 0.15,
  markWheelMax: 0.9,
  // margen = (eff_m+10) - (eff_t+10) + 4; <0 cede 1.2·|margen| s; < -6 se suelta.
  markDraftTolerance: 4,
  markDropMargin: -6,
  markGiveScale: 1.2,

  // 6.18 — Trabajo de equipo (gregarios y lanzadores). Da PESO a la estrategia: rodearse de un buen
  // equipo rinde de verdad. Los gregarios que acompañan a su líder en el grupo le ahorran energía
  // (le protegen del viento, le llevan bidones, cierran huecos); un tren de lanzadores lanza al
  // sprinter en la última rampa. Solo cuentan los compañeros presentes en el MISMO grupo del líder.
  domestiqueProtectPerHelper: 0.05, // cada gregario presente rebaja un 5% el coste del líder...
  domestiqueProtectMax: 0.15, //       ...hasta un 15% (≈3 gregarios): un equipo fuerte ahorra mucho.
  leadOutBoostPerHelper: 0.05, // cada lanzador presente sube un 5% la puntuación de sprint del líder...
  leadOutMaxHelpers: 2, //             ...con dos ya se satura (un tren de más de dos no suma más).

  // TSS de etapa derivado del gasto (workUnits) para alimentar el Banister (SPEC 5.1, 6.15).
  tssPerWorkUnit: 5,
} as const
