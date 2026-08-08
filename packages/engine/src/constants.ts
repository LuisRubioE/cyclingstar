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
 *
 * v4: los rasgos de una etapa admiten SECTORES DE PAVÉ reales (`StageFeatures.cobbles`) y
 * `buildFeatureProfile()` los traduce a segmentos `paves` con sus estrellas. No cambia ninguna ley
 * física, pero sí el recorrido que corren las clásicas del Norte —y con él su coste en energía
 * (SPEC 6.5)—, así que las etapas ya no son las mismas: es cambio de comportamiento.
 *
 * v5: la CLÁSICA LARGA entra en la calibración. El relieve anónimo reconstruido pasa a escalarse por
 * terreno (`RELIEF.rollingAmplitude`), disputar un banner deja de cobrarse una vez por puesto
 * puntuable (era un fallo: hasta 16 de tanque por meta volante), y el coste por km, el umbral de
 * erosión y el depósito del corredor fatigado se recalibran para que un monumento de 250 km no
 * agote el depósito del pelotón entero (docs/balance.md).
 *
 * v6 (Cambio 5 de docs/motor.md, telemetría): el motor cuenta lo que ya sabía y se callaba. El
 * corte del pelotón pasa a narrarse con la selección ACUMULADA y con el tamaño del grupo antes y
 * después (antes solo el descuelgue de UN bloque: el grupo de cabeza saltaba de 81 a 3 sin
 * explicación); el parte de boquete deja de mirar solo a la fuga y sigue al grupo de CABEZA sea
 * quien sea, con throttle apretado en los últimos 40 km; y nace `front_group`, que nombra a los
 * corredores que van delante cuando quedan pocos. No cambia ninguna ley física —los tiempos y el
 * orden de meta son los mismos—, pero sí los eventos emitidos y la semilla, así que es cambio de
 * comportamiento.
 *
 * v7 (Cambio 1 de docs/motor.md §12, MODELO DE FINAL): el orden de llegada dentro de un grupo deja
 * de decidirlo un solo atributo (`finishUphill ? max(MON,COL) : SPR`). El final se DERIVA del
 * recorrido —últimos 5 km, última cota y a qué distancia corona— y del tamaño del grupo que llega,
 * dando siete arquetipos (`sprint_masivo`, `sprint_reducido`, `puncheur`, `alto`, `pave`,
 * `descenso`, `solitario`), y cada uno puntúa con su MEZCLA de atributos: así el PAV interviene por
 * fin en un resultado y una rampa de 200 m deja de convertir una llana en llegada de escaladores.
 * Además el TRABAJO del día (`workUnits`, que se calculaba y no se usaba para nada) se cobra en el
 * remate, y los banners se disputan con la erosión del momento en vez de con el corredor del km 0.
 */
export const ENGINE_VERSION = 7 as const

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
  // TSB 0 -> 1.00 · -25 -> 0.79 · -45 -> 0.62 · <= -55 -> 0.52 (suelo).
  // La pendiente es MÁS dura que el 0.0045 de partida de §VI.1 porque con ella la tercera semana
  // de una gran vuelta no llegaba a erosionar (medido: 0.40 frente al objetivo 0.60-0.85); la
  // tabla de objetivos de §VI.1 manda sobre los números concretos. Se endurece otra vez (0.0065 ->
  // 0.0085, suelo 0.64 -> 0.52) al bajar el coste por km para que la clásica larga no saturase: con
  // el coste nuevo, un corredor de tercera semana saliendo con 70,7 solo erosionaba 0,48.
  freshnessBase: 1.0,
  freshnessSlope: 0.0085,
  freshnessMin: 0.52,
  freshnessMax: 1.05,
  // Cotas del producto (§VI.1): ni el mejor sale con un tanque irreal ni el peor con uno inservible.
  // El suelo baja de 0.70 a 0.58 por lo mismo: es el que fija el depósito del hundido (58,6).
  min: 0.58,
  max: 1.08,
} as const

/**
 * RELIEVE ANÓNIMO de un recorrido reconstruido (`routes/featureProfile.ts`). Entre dos dificultades
 * publicadas (puertos, muros) la carretera no es una mesa de billar: ondula. Ese relleno es
 * sintético —la fuente no lo publica— y se dibuja con rampas cortas alternas de pendiente
 * `±(min + rango·aleatorio)·amplitud`.
 *
 * La AMPLITUD depende del terreno, y esa es la perilla que faltaba: con una única amplitud para
 * todos los terrenos, la llanura del Norte ondulaba igual que los Prealpes. Medido con una amplitud
 * común, Paris-Roubaix salía con 2.154 m de desnivel cuando la carrera tiene ~1.450 (+49 %) y el
 * Ronde con 3.030 frente a ~2.500 (+21 %). El relleno no es decorado: cada metro reconstruido se
 * paga en el tanque (SPEC 6.5, `costClimbSlope`), así que inflarlo inflaba la erosión.
 *
 * Los valores se calibran contra el desnivel PUBLICADO de las carreras de referencia (ver
 * docs/balance.md): Paris-Roubaix ~1.450 m · Ronde van Vlaanderen ~2.500 · Il Lombardia ~4.400 ·
 * Milano-Sanremo ~2.000.
 */
export const RELIEF = {
  // Pendiente del relleno: |g| = min + rango·U(0,1), escalada por la amplitud del terreno.
  rollingMinGradient: 0.4,
  rollingGradientRange: 2.4,
  // Longitud de cada rampa del relleno (km): tramos cortos, ni un tobogán ni un falso llano eterno.
  rollingMinKm: 1.4,
  rollingKmRange: 2.2,
  // Amplitud por terreno dominante de la etapa. 1.0 es la referencia (la clásica de montes: un
  // Lombardía, un Lieja), y de ahí hacia abajo cuanto más plano es el país que se atraviesa.
  rollingAmplitude: {
    flat: 0.55, // etapa de llanura: la carretera apenas se mueve entre dificultad y dificultad
    itt: 0.55, // una crono se traza por terreno rodador a propósito
    cobbles: 0.7, // llanura del Norte: los muros están declarados, entre ellos es plano
    hilly: 0.85, // media montaña y clásicas de costa: ondula, pero el relieve gordo va declarado
    classic: 1.0, // clásica de montes (Prealpes lombardos, Ardenas): referencia de la escala
    mountain: 1.15, // valles de alta montaña: ni los enlaces son llanos
  },
  // Amplitud de una etapa sin terreno declarado: la de referencia.
  rollingAmplitudeDefault: 1.0,
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
  // Nº mínimo de descolgados ACUMULADOS desde el último corte narrado para volver a narrarlo. La
  // cuenta es acumulada, no del bloque: en una criba continua se soltaban 2-3 por bloque y solo se
  // narraba uno cada 3 km, así que el grupo de cabeza pasaba de 81 a 3 con dos frases de por medio.
  splitEventMinDropped: 2,
  // …y además tiene que ser una parte APRECIABLE del grupo. En una etapa con final en alto el
  // puerto decisivo dura toda la etapa (`raceThisClimb`), y con el suelo de 2 solo, la crónica
  // narraba un corte cada tres kilómetros de principio a fin (medido: 26 por etapa). Un pelotón de
  // 176 necesita perder ~26 para que sea noticia; un grupo de 5, dos.
  splitEventMinDropFraction: 0.15,
  // Distancia mínima (km) entre dos "cortes" narrados: evita repetir la frase bloque a bloque.
  splitEventMinKmGap: 12,
  // Un corte GRANDE se cuenta YA, sin esperar al throttle de km: si desde el último aviso se ha
  // quedado esta fracción del grupo, ha pasado algo que el lector tiene que saber en el acto.
  // El mínimo absoluto es la otra mitad de la regla y es imprescindible: sin él, en cuanto el
  // grupo de cabeza queda pequeño la fracción se cumple con dos descolgados y la excepción salta
  // en cada bloque (medido: 37 cortes narrados por etapa, un muro de texto).
  splitEventBigDropFraction: 0.25,
  splitEventBigDropMin: 12,
  // Aun así el corte grande respeta un mínimo propio: el último puerto revienta el pelotón en dos
  // kilómetros y sin este suelo la explosión se narraba con siete frases seguidas en el mismo km.
  // Una explosión merece UNA frase que la explique, no una por escalón.
  splitEventBigDropKmGap: 3,
  // Por debajo de este tamaño, el grupo de cabeza deja de ser "un pelotón" y la crónica puede
  // NOMBRAR a los que van delante. Es también el umbral por el que deja de tener sentido decir
  // que "tira un equipo": con tres corredores en cabeza no tira un equipo, tira un corredor.
  frontNamesMaxRiders: 8,
  // Cada cuántos km, como mucho, se refresca el parte de quién va en cabeza. Solo se emite cuando
  // el grupo de cabeza es pequeño Y ha cambiado de tamaño, así que una fuga estable no lo repite.
  frontGroupReportKmGap: 5,
  // Journal: cada cuántos km se reporta la ventaja de cabeza, y el boquete mínimo para reportarlo.
  gapReportKmGap: 25,
  // En el DESENLACE la carrera se decide y 25 km sin noticias hacen aparecer siete minutos de la
  // nada: dentro de los últimos `gapReportFinalKm` el parte se da cada `gapReportFinalKmGap` km.
  gapReportFinalKm: 40,
  gapReportFinalKmGap: 4,
  // …y aun así solo se repite si la ventaja se ha MOVIDO de verdad respecto al parte anterior. Una
  // brecha clavada en 7:00 durante veinte kilómetros no es noticia; lo que hay que contar es cómo
  // crece o se derrumba. Sin este filtro el desenlace se llenaba de "el líder sigue con 7:00".
  gapReportChangeFraction: 0.15,
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
  // costeBase por pendiente: g<=-3 -> 0.10 | -3<g<0 -> lerp(0.10, cf) | g>=0 -> cf + 0.135·g.
  // La pendiente del coste subió de 0.11 a 0.17 en el Cambio 0: con 0.11, una etapa reina gastaba
  // solo un 18% más de tanque que una llana, y con esa separación NINGÚN umbral de erosión podía a
  // la vez dejar la llana a 0 y llevar la reina al 0,20-0,50 que pide §VI.1.
  //
  // Ahora bajan las dos (0.30 -> 0.22 y 0.17 -> 0.135) porque aquella calibración se hizo contra
  // perfiles SINTÉTICOS y LISOS —la llana canónica es g = 0 durante 180 km y la reina, 135 km a
  // g = 0 más un puerto— mientras un recorrido REAL cobra pendiente en casi todos sus km. Con los
  // valores viejos un monumento de 250 km gastaba 117 de un depósito de 100: el pelotón entero
  // entraba en pájara y la erosión topaba en 1,000, es decir, dejaba de discriminar. Con estos, la
  // llana sigue sin erosionar (gasto 28,8%), la reina erosiona 0,216 e Il Lombardia 0,86 sin
  // saturar. La razón llana/reina (0,65) y el umbral de erosión son las dos ataduras: ver
  // docs/balance.md, «la aritmética de la clásica larga».
  costDescentFloor: 0.1,
  costFlatBase: 0.22,
  costClimbSlope: 0.135,
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
  // depl = clamp(1 - E/E0, 0, 1); umbral = 0.07 + 0.40·RES/100.
  // La base bajó de 0.35 a 0.20 porque con 0.35 el umbral quedaba en 0.57 para un RES de 55 y el
  // gasto de una etapa NUNCA lo alcanzaba: la erosión era 0.000 siempre y RES, la durabilidad y el
  // tanque entero eran decorativos (docs/motor.md §3-bis-a). Ahora baja de 0.20 a 0.07 porque el
  // coste por km también ha bajado: el umbral tiene que seguir al gasto o la reina deja de erosionar.
  // Queda justo por encima del gasto de la llana tranquila (28,8% frente a un umbral de 29,2% con
  // RES 55): es la atadura que impide subirlo más, porque la llana NO debe erosionar.
  erosionThresholdBase: 0.07,
  erosionThresholdResScale: 0.4,
  erosionExponent: 1.2,
  // Techo estructural de la erosión (docs/motor.md §VI.1: «≤ 0,92 — jamás 1,000»). En 1,000 todo el
  // pelotón está igual de degradado, el modelo deja de discriminar y el resultado vuelve a ser azar,
  // que es lo contrario de lo que persigue el desgaste. Hasta ahora el techo solo lo sostenía la
  // calibración de las clásicas en fresco (la más dura mide 0,868); en una etapa de montaña REAL con
  // un campo de tercera semana saturaba el 100% del campo. No mueve ningún invariante actual: todos
  // miden por debajo de 0,92.
  erosionMax: 0.92,
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
  // Subieron de 0.50/0.65 a 0.52/0.665 porque el pelotón dejó de rodar a paseo cuando no hay nada
  // que cazar. El extremo superior BAJA ahora a 0.635: al abaratar el coste por km (clásica larga)
  // la fuga se desgasta menos y aguantaba el 15,0% de las llanas, muy por encima del 2-8%. Sigue
  // siendo la perilla más sensible del llano: 0.62 -> 0,8%, 0.635 -> 5,8%, 0.65 -> 10,0%.
  breakawayCommitMin: 0.52,
  breakawayCommitMax: 0.635,
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
  // Subió de 265 a 342: con el pelotón regulando SIEMPRE (antes solo mientras había fuga) el boquete
  // se cerraba solo y la fuga en montaña se hundía del 35,8% al 3,3%. Sube otra vez a 350 al bajar
  // el coste por km y el techo de cooperación de la fuga (0.665 -> 0.635), que se llevaron la fuga
  // en montaña al 25,8% (pegada al suelo del rango). Sigue siendo la perilla más sensible del motor,
  // y el estadístico tiene mucha varianza: medido con 120 / 500 semillas, 335 -> 22% / 26%,
  // 342 -> 26% / 31%, 350 -> 29% / 35%, 365 -> 37% / 47%. Con 350 el rango 25-45% se cumple en las
  // DOS campañas (la de CI y la de `pnpm sim`), que es la condición que hay que exigir.
  gcControlLeash: 350,
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

  // 6.12 — MODELO DE FINAL (docs/motor.md §12). Sustituye a `finishUphill ? max(MON,COL) : SPR`,
  // que era binario, frágil (un bloque en subida en los últimos 2 km convertía una llana en
  // llegada de escaladores) y dejaba el PAV sin intervenir jamás en ningún resultado.
  //
  // El tipo de final se deriva del RECORRIDO (últimos kilómetros, última cota y a qué distancia
  // corona) y del TAMAÑO del grupo que llega. Ver `stage/finish.ts`.
  // Ventana del final: los últimos 5 km, no los últimos 2. Un final se juega en el último puerto y
  // en lo que venga detrás, no en los 200 metros de meta.
  finishWindowKm: 5,
  // Dónde se busca la última cota del final. Más allá de 15 km, un puerto ya no define la llegada
  // (define la selección, que es otra cosa y la resuelve el descuelgue).
  finishClimbSearchKm: 15,
  // Un bloque "sube" a efectos del final a partir de esta pendiente. Por debajo es relieve menudo:
  // el relleno ondulado de los recorridos reconstruidos y los rompepiernas (g = 1.5) no son cotas.
  finishClimbMinGradient: 3,
  // Respiro tolerado DENTRO de una cota (bloques de 100 m): un rellano de 500 m no parte un puerto
  // en dos cotas distintas.
  finishClimbGapBlocks: 5,
  // Longitud mínima (km) para que una racha ascendente cuente como cota. ESTE es el número que
  // impide que una rampa de 200 m antes de meta convierta una etapa llana en llegada de escaladores.
  finishClimbMinKm: 0.4,
  // La cota "muere en la meta" si corona a menos de esto (km): el último medio kilómetro suele
  // aflojar y no por eso deja de ser un final en alto.
  finishSummitKm: 0.6,
  // …y es un final en ALTO (manda el escalador puro) si además mide al menos estos km. Por debajo
  // es un muro: lo gana un puncheur, no un escalador de gran vuelta.
  finishAltoMinKm: 3,
  // Puncheur: cota que corona dentro de estos km de meta…
  finishPuncheurKmToGo: 5,
  // …y con esta dureza mínima (km·g², el baremo de la categoría de cima). 15 son ~1 km al 4% o
  // 0,6 km al 5%: por debajo es un repecho, no un final de puncheur.
  finishPuncheurScore: 15,
  // Un final que ARRASTRA hacia arriba sin una cota clara (falso llano largo) también es de
  // puncheur. 2,5% de media en 5 km son 125 m de desnivel en la llegada. El umbral no puede bajar
  // a 2: un segmento de rompepiernas rueda a g = 1.5 fijo y arrastraría a media montaña ahí.
  finishDragGradient: 2.5,
  // Final en DESCENSO: al menos esta fracción de los últimos km baja.
  finishDescentKm: 3,
  finishDescentFraction: 0.5,
  // Final de PAVÉ: fracción de adoquín en los últimos km. La ventana es larga (30 km) a propósito:
  // el pavé decide la llegada mucho antes de la meta —Paris-Roubaix mide 0,30 en esa ventana y
  // entra de sobra— pero el Ronde, cuyos últimos 13 km tras el Paterberg son asfalto, no.
  finishPaveKm: 30,
  finishPaveFraction: 0.1,
  // A partir de este tamaño el grupo que llega es un sprint MASIVO; por debajo, un esprint de grupo
  // reducido, donde la colocación y la táctica pesan mucho más que la punta de velocidad.
  finishBunchMinRiders: 15,
  // Pesos de la mezcla de atributos por tipo de final. Suman 1 en cada fila, así la puntuación de
  // remate queda siempre en la escala 0-100 de los atributos. La intención de cada mezcla:
  // - sprint_masivo: manda la punta (SPR), pero hay que llegar a la última curva bien colocado y
  //   con piernas: por eso LLA y TAC no son cero. Antes era SPR al 100%, y esa fila es la que
  //   producía el caso del dueño —un sprinter con 45 en todo lo demás ganaba 48 de 50 etapas de
  //   Race Sharjah—. Medido sobre ese mismo banco: con SPR 1.00 gana 48/50; con 0.72, 26/50; con
  //   0.66, 19/50; con 0.60 se hunde a 5/50, que ya es pasarse (para eso es sprinter). El
  //   invariante "el mejor sprinter gana el 30-45% de las llanas canónicas" apenas se entera del
  //   cambio (39,8% con 0.72 · 39,2% con 0.66): allí el sprinter es 86 contra un campo de 56.
  // - sprint_reducido: la mitad es punta y la otra mitad es carrera —leer el momento (TAC) y
  //   aguantar el tirón después de un día duro (RES)—.
  // - puncheur: la mezcla COL + SPR + TAC del final de muro; se remata en cuesta, no en llano.
  // - alto: escalada pura (MON, con COL para las rampas) y fondo. La táctica pesa poco: arriba se
  //   llega como se puede.
  // - pave: PAV y LLA, que es exactamente el perfil de un clasicómano del Norte, con TAC de
  //   colocación (en el adoquín se pierde la carrera por ir mal situado).
  // - descenso: DES y TAC mandan; el que baja y elige la trazada gana, aunque remate peor.
  // - solitario: un grupo de uno no disputa nada, pero la fila existe para que el modelo sea total.
  finishWeights: {
    sprint_masivo: { SPR: 0.66, LLA: 0.18, TAC: 0.16 },
    sprint_reducido: { SPR: 0.5, LLA: 0.15, TAC: 0.25, RES: 0.1 },
    puncheur: { COL: 0.4, SPR: 0.28, TAC: 0.2, RES: 0.12 },
    alto: { MON: 0.6, COL: 0.2, RES: 0.15, TAC: 0.05 },
    pave: { PAV: 0.5, LLA: 0.27, TAC: 0.15, SPR: 0.08 },
    descenso: { DES: 0.42, TAC: 0.25, SPR: 0.18, LLA: 0.15 },
    solitario: { RES: 0.35, LLA: 0.3, TAC: 0.2, MON: 0.15 },
  },
  // Penalización del TRABAJO del día en el remate (docs/motor.md §12). `workUnits` ya se calculaba
  // y no se usaba para NADA en el resultado: quien había relevado 100 km llegaba igual que quien
  // fue a rueda, y por eso ir a rueda era la única estrategia sin coste de oportunidad. Se compara
  // con la MEDIA del grupo de meta (no con un absoluto) para que no dependa de lo larga que sea la
  // etapa: quien ha hecho un 20% más de trabajo que sus rivales remata un 20%·peso peor.
  finishWorkWeight: 0.6,
  // Tope de la corrección, arriba y abajo: el trabajo pesa, pero no anula la diferencia de nivel.
  finishWorkMax: 0.15,
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
  // Definición de "final en alto" del SPEC 6.12: últimos 3 km con pendiente media >= 5%. Estuvo
  // definida y sin usar mientras el motor resolvía el final con su propia heurística ("algún bloque
  // de los últimos 2 km sube"); ahora es uno de los dos caminos que llevan al tipo `alto`
  // (`stage/finish.ts`), el que cubre la cumbre con rellano antes de la pancarta.
  hilltopFinishKm: 3,
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
