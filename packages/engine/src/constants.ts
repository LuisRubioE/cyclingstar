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
 *
 * v2: el reparto del trabajo en el grupo (quién releva) pasa a decidirse por rol, frescura y
 * protección de equipo en vez de por la posición en el array de entrada; el marcaje de carrera
 * pasa a resolverse con el módulo `stage/marcaje.ts`; el ruido de los mini-sprints de banner se
 * unifica con el del sprint de meta (`sprintScoreNoiseSd`).
 *
 * v3 (Cambio 0 de docs/motor.md): el depósito inicial deja de ser 100 para todos y se deriva de
 * forma, frescura y salud, con lo que la erosión por fin se activa (antes era 0,000 siempre) y con
 * ella la pájara y el coste en energía de los cerillos; el controlador del pelotón sale del
 * condicional de la fuga y regula el ritmo siempre; las velocidades y la VAM bajan a rango real; y
 * los descolgados se reagrupan en grupeto también en subida.
 */
export const ENGINE_VERSION = 3 as const

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

/**
 * Depósito inicial de energía E0 con que un corredor toma la salida (docs/motor.md §VI.1).
 *
 * E0 = 100 · clamp( mTankFitness(CTL) · mTankFreshness(TSB) · mHealth(salud), min, max )
 *
 * Sustituye al `energy: 100` que estaba cableado para todos: sin esto la erosión no se activaba
 * jamás (el gasto de una etapa nunca alcanzaba el umbral) y una gran vuelta no se notaba en las
 * piernas. El arrastre entre etapas sale GRATIS del Banister: `applyDailyLoad` sube el ATL con el
 * TSS real de cada etapa, así que el TSB baja día a día y el depósito mengua solo.
 */
export const TANK = {
  // Escala del depósito: 100 unidades es el corredor de referencia (fresco, CTL medio, sano).
  base: 100,
  // Condición (CTL): el fondo da tanque. CTL 0 -> 0.90 · CTL 50 -> 1.00 · CTL 100 -> 1.10.
  fitnessBase: 0.9,
  fitnessScale: 0.2,
  fitnessMin: 0.9,
  fitnessMax: 1.1,
  // Frescura (TSB): la fatiga acumulada vacía el depósito antes de salir.
  // TSB 0 -> 1.00 · -25 -> 0.84 · -45 -> 0.71 · <= -55 -> 0.64 (suelo).
  // La pendiente es MÁS dura que el 0.0045 de partida de §VI.1 porque con ella la tercera semana
  // de una gran vuelta no llegaba a erosionar (medido: 0.40 frente al objetivo 0.60-0.85); la
  // tabla de objetivos de §VI.1 manda sobre los números concretos.
  freshnessBase: 1.0,
  freshnessSlope: 0.0065,
  freshnessMin: 0.64,
  freshnessMax: 1.05,
  // Cotas del producto (§VI.1): ni el mejor sale con un tanque irreal ni el peor con uno inservible.
  min: 0.7,
  max: 1.08,
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
  // vRef(g) km/h: subida clamp(190/(g + 3.5), 8, 44) | llano 43 | paves 38 | descenso 55.
  // El llano baja de 44 a 43: con 44 la etapa llana canónica salía a 47,1 km/h de media (real 42-45).
  vRefFlat: 42,
  // Subida HIPERBÓLICA (ver `vRef`): A/(g+k). Calibrada para que la VAM de los punteros de una
  // etapa reina (P75 86 al compromiso de puerto decisivo) caiga en 1.500-1.800 m/h en todo el
  // rango de puertos sostenidos: al 8% 20,1 km/h (VAM 1.610), al 10% 17,1 (1.714), al 12% 14,9
  // (1.792). La recta anterior daba VAM 1.940 al 8% y 2.260 al 12%, imposibles.
  vRefClimbNumerator: 190,
  vRefClimbOffset: 3.5,
  vRefClimbMin: 8,
  vRefPaves: 38,
  vRefDescent: 55,
  // ritmo(c) = 0.90 + 0.30·c, con c = compromiso del grupo (0 tempo, 1 a bloque). La escala baja de
  // 0.35 a 0.30 para que el COMPROMISO del grupo pese menos y QUIÉN PEDALEA pese más (§3-bis-c).
  // No puede bajar mucho más: el invariante "un pelotón comprometido cierra 50-75 s por 10 km"
  // depende justo de la razón ritmo(0.85)/ritmo(0.60), y con 0.30 queda en 1.069 (medido 53 s).
  rhythmBase: 0.9,
  rhythmScale: 0.3,
  // v_objetivo = vRef(g)·(P75/75)^0.39·ritmo(c). El exponente sube de 0.34 a 0.39: con 0.34 el nivel
  // del corredor casi no influía (P75 60 frente a 85 eran 8 km/h en llano contando el ritmo). No
  // puede subir mucho más: el invariante de la CRI (brecha p90-p10 de 2 a 4 minutos en 40 km) lo
  // acota por arriba —con 0.45 medía 4,4 min y con 0.85, 7— porque en crono la ley se aplica sin
  // rebufo ni grupo y el exponente se ve entero.
  p75Reference: 75,
  p75Exponent: 0.39,
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
  // Ritmo (s/km) al que un descolgado recorta el boquete con el pelotón en llano/descenso: en terreno
  // rodador los grupos vuelven a juntarse; solo los muy distanciados en la subida llegan más atrás.
  chaseBackSecondsPerKm: 8,
  // Grupeto: dos descolgados separados por menos de esto ruedan JUNTOS. Es el umbral que usa la
  // SUBIDA, donde no hay recorte (la selección debe mantenerse) pero los que se sueltan a la vez
  // sí forman un grupo. Sin él la etapa reina terminaba con 30 grupos de un corredor (§3-bis-e).
  // Estrecho a propósito: fusiona a los que van realmente juntos, no a los que están cortados.
  grupetoJoinGapSeconds: 12,
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
  // Tope de la fecha de formación de la fuga como fracción del recorrido: en una etapa corta la
  // fuga no puede "formarse" a 25 km de salida; nunca pasa de este % del total.
  breakFormMaxRouteFraction: 0.15,
  // Variación de la ventaja (s) a partir de la cual el reporte de boquete dice que la fuga se
  // estira (+1) o se recorta (-1) respecto al reporte anterior; por debajo, se considera estable.
  gapTrendThresholdSeconds: 3,

  // 6.5 — Coste, tanque y drafting.
  // costeBase paves: 0.55 + 0.06·estrellas.
  costPavesBase: 0.55,
  costPavesStars: 0.06,
  // costeBase por pendiente: g<=-3 -> 0.10 | -3<g<0 -> lerp(0.10, 0.30) | g>=0 -> 0.30 + 0.17·g.
  // La pendiente del coste sube de 0.11 a 0.17: con 0.11, una etapa reina gastaba solo un 18% más
  // de tanque que una llana (medido 51,8% frente a 43,7%), y con esa separación NINGÚN umbral de
  // erosión podía a la vez dejar la llana a 0 y llevar la reina al 0,20-0,50 que pide §VI.1.
  costDescentFloor: 0.1,
  costFlatBase: 0.3,
  costClimbSlope: 0.17,
  costDescentGradient: -3,
  // draftMax por terreno: llano 0.42 | descenso 0.25 | paves 0.18 | subida clamp(0.32 - 0.028·g, 0.08, 0.42).
  // El rebufo del llano sube de 0.32 a 0.42: ir a rueda en un pelotón grande ahorra de verdad un
  // 40-50%, no un 32%. Es la otra mitad de la separación llano/montaña —el llano se abarata y la
  // subida no, porque ahí el rebufo apenas existe— y además hace que RELEVAR pese mucho más.
  draftFlat: 0.42,
  draftDescent: 0.25,
  draftPaves: 0.18,
  draftClimbBase: 0.32,
  draftClimbSlope: 0.028,
  draftClimbMin: 0.08,
  // shelter_i: protegido 0.9 | rotando/trabajando 0.4 | fugado que releva 0.5 | solo 0.0.
  shelterProtected: 0.9,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.5): parámetro definido pero sin efecto en la simulación.
  // El motor solo distingue hoy dos estados (protegido / relevando): quien trabaja usa
  // `shelterRelay`. Falta el tercer estado "rotando en cabeza del pelotón" de la tabla del SPEC.
  shelterWorking: 0.4,
  shelterRelay: 0.5,
  shelterAlone: 0.0,
  // coste = dx·costeBase·ritmo(c)^1.6·(1 - draftMax·shelter).
  costRhythmExponent: 1.6,

  // 6.5/6.18 — Reparto del trabajo dentro del grupo: quién releva (paga `shelterRelay`) y quién
  // va a rueda (`shelterProtected`). NO puede decidirlo el orden del array de entrada: se ordena
  // por "deber de relevo", con el rol como criterio principal, la frescura restante como segundo
  // y un jitter determinista del RNG sembrado (subflujo `work:<riderId>`) para romper empates.
  // Así un líder que aparezca el primero en el input ya no se pasa la etapa tirando.
  relayDutyByRole: {
    gregario: 1.0, // su oficio es tirar y proteger al jefe
    lanzador: 0.85, // tira, pero se reserva algo para el último km
    libre: 0.6, // sin órdenes concretas: colabora lo normal
    cazaetapas: 0.5, // ahorra para su ataque
    marcador: 0.35, // vive a rueda de su objetivo, no del viento
    sprinter: 0.2, // se guarda entero para la meta
    lider: 0.1, // el equipo lo lleva; solo tira si no queda nadie más
  },
  // Peso de la frescura (E/E0) en el deber de relevo: quien va vaciado deja de dar relevos y los
  // que aún tienen tanque asumen el trabajo, como en carretera.
  relayFreshnessWeight: 0.35,
  // Penalización al deber de relevo de un corredor que lleva gregarios suyos en el grupo: si tiene
  // equipo alrededor, el equipo trabaja por él (SPEC 6.18) y él pasa al final de la cola de relevos.
  relayProtectedPenalty: 0.5,
  // Amplitud del desempate aleatorio (determinista, sembrado) del deber de relevo.
  relayJitterWeight: 0.05,

  // 6.6 — Cerillos (esfuerzos supraumbral discretos).
  // comp = 0.50·max(MON,COL) + 0.30·RES + 0.20·LLA; cerillos = 2 + (comp>=55)+(>=72)+(>=88).
  matchCompMonWeight: 0.5,
  matchCompResWeight: 0.3,
  matchCompLlaWeight: 0.2,
  matchBase: 2,
  matchThresholds: [55, 72, 88],
  matchMin: 1,
  matchTsbPenaltyThreshold: -25,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.6): parámetro definido pero sin efecto en la simulación.
  // Gastar un cerillo debería restar energía del tanque; hoy solo activa `matchBonus` durante
  // `matchBonusBlocks` bloques y no cuesta nada.
  matchCost: 5,
  matchBonus: 10,
  matchBonusBlocks: 5,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.6): parámetro definido pero sin efecto en la simulación.
  // Vaciado profundo: quien termina con E < 0.12·E0 debería arrancar la etapa siguiente con un
  // cerillo menos. `matchCount(..., deepDepleted)` sabe aplicarlo, pero nadie calcula el flag.
  matchDepletionThreshold: 0.12,

  // 6.7 — Erosión por vaciado (durabilidad).
  // depl = clamp(1 - E/E0, 0, 1); umbral = 0.20 + 0.40·RES/100.
  // La base baja de 0.35 a 0.20 porque con 0.35 el umbral quedaba en 0.57 para un RES de 55 y el
  // gasto de una etapa NUNCA lo alcanzaba: la erosión era 0.000 siempre y RES, la durabilidad y el
  // tanque entero eran decorativos (docs/motor.md §3-bis-a). Con 0.20 y los costes recalibrados, la
  // llana tranquila sigue sin erosionar (gasto 38%, umbral 42%), la reina en fresco erosiona 0,24 y
  // la reina en tercera semana 0,65, que es justo la tabla de objetivos de §VI.1.
  erosionThresholdBase: 0.2,
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
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.8): parámetro definido pero sin efecto en la simulación.
  // Ataques de salida: la fuga del día se compone hoy de una sola tacada por puntuación
  // (breakawayScore*), no integrando esta intensidad km a km.
  lambdaBreakawayAttack: 1.2,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.8): parámetro definido pero sin efecto en la simulación.
  // Contraataques: el motor no genera hoy ningún grupo perseguidor tras un ataque.
  lambdaCounterAttack: 0.02,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.8): parámetro definido pero sin efecto en la simulación.
  // Puentes a la fuga: nadie salta del pelotón a la fuga; una vez formada, su composición no cambia.
  lambdaBridge: 0.08,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.8): parámetro definido pero sin efecto en la simulación.
  // Ventana de boquete en la que un puente sería viable (va con `lambdaBridge`).
  bridgeGapMinSeconds: 30,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.8): parámetro definido pero sin efecto en la simulación.
  bridgeGapMaxSeconds: 150,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.8): parámetro definido pero sin efecto en la simulación.
  // Ataques en la subida: hoy la subida solo DESCUELGA (lambdaDropBase); nadie ataca hacia delante,
  // así que ningún favorito se va en solitario y las diferencias salen solo del descuelgue.
  lambdaClimbAttack: 0.1,
  lambdaDropBase: 0.9,
  // Descuelgue: λ = lambdaDropBase · max(0, P75 - perfil) / denom. El denominador traduce el
  // déficit en puntos de atributo a una intensidad humana; se calibra al Montecarlo de montaña.
  dropDeficitDenom: 12,
  // Tolerancia (puntos de perfil) antes de arriesgar el descuelgue: sube de 2 a 4 porque con el
  // pelotón regulando de verdad y la erosión activa la montaña seleccionaba demasiado (brecha
  // 1º-10º de 377 s; con 4 baja a 285 sin perder la selección: el mejor escalador sigue ganando).
  dropDeficitTolerance: 4,
  // Un descolgado rueda solo a su tope (contrarreloj improvisada), perdiendo tiempo bloque a bloque.
  // Sube de 0.70 a 0.82: al 0.70 un descolgado rodaba muy por debajo de su límite y una etapa reina
  // producía brechas irreales. Quien se descuelga en un puerto no se sienta, va a su umbral.
  shedCommit: 0.82,
  // 6.10 — Fuga: consolida si el compromiso del pelotón < 0.25 durante 2 km.
  breakawayCommitThreshold: 0.25,
  breakawayConsolidateKm: 2,
  // La fuga rueda a tempo cooperando (conserva), con cooperación variable por etapa: unas se
  // entienden y aguantan, otras se miran y las cazan. Esa varianza produce el 2-8% de fugas.
  // Suben de 0.50/0.65 a 0.52/0.665 porque el pelotón ya no rueda a paseo cuando no hay nada que
  // cazar: con los valores viejos la fuga en llano caía del 5,8% al 0,6%. El extremo superior sigue
  // siendo muy sensible (0.68 -> 8,0%, 0.665 -> 3,4%, 0.75 -> 28,7%).
  breakawayCommitMin: 0.52,
  breakawayCommitMax: 0.665,
  // Control del boquete (leash): los sprinters dejan a la fuga una ventaja máxima que se cierra
  // linealmente hasta el punto de captura (finish - 12 km). El pelotón regula en lazo cerrado:
  // tempo de mantenimiento + ganancia proporcional al exceso sobre el boquete deseado.
  // Sube de 150 a 175: con el controlador liberado la caza se cerraba a 29 km de meta (objetivo
  // 8-25); con 175 la captura mediana vuelve a los 23-24 km.
  chaseMaxLeashSeconds: 175,
  chaseHoldCommit: 0.62,
  chaseGain: 0.006,
  // Control de la general en etapas sin llegada masiva: el pelotón limita el boquete a este
  // tempo (no captura); la subida final decide. Calibra el % de fugas que ganan en montaña.
  // Sube de 265 a 330: con el pelotón regulando SIEMPRE (antes solo mientras había fuga) el boquete
  // se cerraba solo y la fuga en montaña se hundía del 35,8% al 3,3%. Sigue siendo la perilla más
  // sensible del motor (300 -> 25%, 330 -> 38%, 600 -> 100% de fugas que ganan).
  gcControlLeash: 342,
  // Compromiso de los favoritos en la subida decisiva: tempo duro que descuelga poco a poco
  // (no máximo, o el grupo llegaría junto). Calibra la caza de la fuga y el estiramiento.
  climbRaceCommit: 0.85,
  // Tamaño de la fuga del día: entre 3 y 6 corredores (mín + entero uniforme en [0, rango-1]).
  // Menos de 3 no colabora; más de 6 es un grupo que el pelotón ya no deja marchar.
  breakawaySizeMin: 3,
  breakawaySizeRange: 4,
  breakawayScoreTac: 0.4,
  breakawayScoreLla: 0.3,
  breakawayScoreRng: 0.3,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.10): parámetro definido pero sin efecto en la simulación.
  // Filtro de candidatos a la fuga: un sprinter puro (SPR >= 70) no debería irse a la fuga...
  breakawaySkipSprThreshold: 70,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.10): parámetro definido pero sin efecto en la simulación.
  // ...ni debería irse quien llega a la etapa con menos del 40% del tanque.
  breakawaySkipEnergyFraction: 0.4,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.10): parámetro definido pero sin efecto en la simulación.
  // Tensión de la fuga: la fuga debería ir tensándose km a km (quien no releva, quien se guarda)
  // hasta romperse. Hoy `Group.tension` existe pero nadie la acumula ni la lee; la cooperación
  // (`coop`) se fija una vez al formarse la fuga y ya no cambia en toda la etapa.
  breakawayTensionPerKm: 0.4,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.10): parámetro definido pero sin efecto en la simulación.
  breakawayTensionThreshold: 6,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.10): parámetro definido pero sin efecto en la simulación.
  breakawayTensionCoopFactor: 0.7,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.10): parámetro definido pero sin efecto en la simulación.
  breakawayTensionAttackFactor: 3,

  // 6.9 — El pelotón como controlador (decisiones cada 10 bloques, con histéresis).
  // El ritmo del pelotón lo marca su cuarto delantero de punteros, no todo el bloque (6.4).
  pelotonPaceFraction: 0.25,
  // En subida el ritmo lo imponen los más fuertes (atacan): fracción menor -> más selección.
  // Calibra el estiramiento del grupo de cabeza en montaña (brechas 1-4 min).
  climbPaceFraction: 0.12,
  // Fracción de ritmo en un puerto que se sube a TEMPO (lejos de meta): más corredores marcan el ritmo,
  // el P75 baja y apenas se descuelga nadie. El pelotón solo se rompe de verdad en el puerto decisivo.
  climbTempoFraction: 0.5,
  // Solo se ataca un puerto (ritmo duro, selección) si quedan estos km o menos para meta (o final en alto).
  climbRaceKmToGo: 30,
  decisionEveryBlocks: 10,
  chaseFeasibleSecondsPerKm: 8,
  chaseCatchTargetKm: 12,
  commitHysteresis: 0.4,
  commitIdle: 0.1,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.9): parámetro definido pero sin efecto en la simulación.
  // Amenaza para la general: el pelotón debería endurecer la caza si en la fuga va alguien
  // peligroso en la clasificación (`StageRider.gcDeficitSeconds`, que hoy tampoco se lee).
  gcThreatFraction: 0.6,
  // Ritmo del pelotón cuando NO hay nada que cazar por delante (sin fuga, o ya cazada). Antes esto
  // no existía: el controlador vivía dentro de `if (breakaway && !caught)` y el pelotón se quedaba
  // en `commitIdle` toda la etapa. Un pelotón rueda a tempo de carretera, no a paseo.
  pelotonTempoCommit: 0.55,
  // Ritmo del pelotón en un puerto que NO es decisivo (lejos de meta): se sube a tempo.
  climbTempoCommit: 0.62,
  // Los últimos km de una etapa de meta llana: los trenes se organizan y el pelotón vuela.
  finalDriveKm: 15,
  finalDriveCommit: 0.85,

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
  // Ruido multiplicativo del remate: score = base·N(1, sd). Es el ÚNICO modelo de ruido de
  // desempate del motor; lo comparten el sprint de meta y los mini-sprints de banner (6.11).
  sprintScoreNoiseSd: 0.045,
  // Desempate dentro de un mismo grupo de meta: cada puesto suma este épsilon al reloj del grupo,
  // de modo que el orden del sprint sobrevive al `sort` sin alterar el tiempo redondeado a segundos.
  finishTieBreakSeconds: 0.001,
  // "Día" del corredor (SPEC 6.7): cada corredor rinde algo mejor o peor cada etapa (piernas del día),
  // escalando su nivel efectivo. Aporta variación —no siempre gana el mismo— sin volverlo azar puro.
  dayFormSd: 0.035,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.12): parámetro definido pero sin efecto en la simulación.
  // Ataques tardíos: en los últimos km nadie ataca; el final se resuelve siempre por el sprint
  // dentro de cada grupo ya formado.
  lambdaLateAttack: 0.5,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.12): parámetro definido pero sin efecto en la simulación.
  // Km a meta en que se abre la ventana de ataques tardíos (va con `lambdaLateAttack`).
  lateAttackKm: 3,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.12): parámetro definido pero sin efecto en la simulación.
  // Tamaño a partir del cual un grupo se considera "gordo" (un ataque tardío tiene menos éxito).
  // Ojo: el sprint masivo NO usa este umbral, usa `bunchSprintMinRiders`.
  bigGroupThreshold: 25,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.12): parámetro definido pero sin efecto en la simulación.
  // Definición de "final en alto" del SPEC (últimos 3 km con pendiente media >= 5%). El motor usa
  // en su lugar una heurística propia sobre los `finalBlocks`: "algún bloque final es subida".
  hilltopFinishKm: 3,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.12): parámetro definido pero sin efecto en la simulación.
  hilltopFinishGradient: 5,

  // 6.13 — CRI/cronoescalada/CRE.
  ttCommitment: 0.85,
  ttNoiseSd: 0.006,
  ttCompositeCri: 0.75,
  ttCompositeLla: 0.15,
  ttCompositeRes: 0.1,
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.13): parámetros definidos pero sin efecto en la simulación.
  // Contrarreloj por equipos: `simulateTimeTrial` solo resuelve CRI individual (un grupo por
  // corredor). No existe modo CRE ni entrada que lo active (`StageInput.timeTrial` es booleano).
  teamTtShelter: 0.5,
  teamTtPaceRider: 4,
  teamTtPaceFactor: 0.98,

  // 6.14 — Caídas e incidentes.
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.14): parámetros definidos pero sin efecto en la simulación.
  // Probabilidad de caída POR ETAPA y tipo de etapa. El motor no las usa: reparte el riesgo como
  // intensidad λ por bloque y terreno (`crashLambda*`), que es la doctrina de invariancia de
  // resolución. Quedan como referencia de calibración: la suma de λ·dx de una etapa debería
  // reproducir estas cifras. Hoy nadie comprueba esa correspondencia.
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
  // Consecuencias de una caída por severidad: tiempo perdido en carretera (s) y días de baja.
  // Cada rango se expresa como mínimo + amplitud uniforme, para que la tirada sea `min + rng()·range`.
  // Un susto cuesta medio minuto largo (levantarse y volver al grupo); una caída grave arruina el mes.
  crashLossNoneMinS: 30,
  crashLossNoneRangeS: 60, // 30-90 s: sin daño y con rasguños
  crashLossMinorMinS: 60,
  crashLossMinorRangeS: 120, // 60-180 s: lesión leve
  crashLossMajorMinS: 120,
  crashLossMajorRangeS: 180, // 120-300 s: lesión grave
  crashDaysScratchesMin: 3,
  crashDaysScratchesRange: 3, // 3-6 días
  crashDaysMinorMin: 5,
  crashDaysMinorRange: 10, // 5-15 días
  crashDaysMajorMin: 20,
  crashDaysMajorRange: 40, // 20-60 días

  // 6.15 — Bonificaciones de tiempo en meta.
  timeBonuses: [10, 6, 4],

  // 6.18 — Marcaje (capa 4). p_rueda = clamp(0.35 + (TAC_m-TAC_t)/80 - 0.10·extra, 0.15, 0.90).
  // PENDIENTE DE IMPLEMENTAR (SPEC 6.18): parámetros definidos pero sin efecto en la simulación.
  // Los consume `marcaje.wheelProbability()`, que existe y tiene tests pero que el bucle de carrera
  // NO llama: hoy el marcador SIEMPRE consigue la rueda de su objetivo y la TAC no interviene.
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
