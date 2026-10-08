/**
 * LAS CONSTANTES DE LA RETRANSMISIÓN Y DEL SIN DESTRIPE (E2, docs/retransmision.md §15.3 y §15.4): su
 * ÚNICA fuente de valores. Los tests se escriben contra los nombres, nunca contra literales.
 *
 * Viven aquí y no en `packages/engine/src/constants.ts` porque ninguna es de juego: no cambian una
 * carrera ni lo grabado, y tocarlas corre `typecheck` y `test:rapido`, no los ocho tramos de bancos
 * (§15.1, D-52). La deriva hacia la carrera la impiden dos reglas de ESLint (15-b): ni el motor ni
 * los ficheros de `shared` que usa el grabador (`timeline`, `codec`, `reduce`, `reveal`) pueden
 * importarlas. Un cambio de valor se anota en `docs/balance.md` con la medida que lo justifica, sin
 * subir `ENGINE_VERSION` (15-h).
 *
 * Nacen enteras en el PR 2, el primero que las lee (17-e). Unidades: s de carrera es reloj de
 * carrera (`RaceS`) y s de pared, el tiempo del espectador; M es medida, E estimada y S/E sin
 * evidencia de los jueces. Cuáles son iniciales y quién las acepta, en §15.6.
 */
import type { StageKind } from '../contracts.js'
import type { CueClass, PaceZone } from './timeline.js' // los dos se declaran en timeline.ts (17-z)

export const BROADCAST = {
  // RITMO (§8.2, §9.4; D-19). Iniciales: B17 los mide en los pasos 0 y 10 y la prueba de lectura los acepta (D-60).
  /** Watch, sin pausas: s de carrera por s de pared mientras la cabeza tiene más de aboveKm km a meta.
   *  M: 7:39-19:59 por etapa en línea (ejecutabilidad §2.1, juez-ejec/ritmo.mjs, 5 etapas × semillas 0 y 1). */
  pace: [
    { aboveKm: 50, x: 60 },
    { aboveKm: 20, x: 30 },
    { aboveKm: 5, x: 12 },
    { aboveKm: 1, x: 4 },
    { aboveKm: 0, x: 1.5 },
  ] as const satisfies readonly PaceZone[],
  /** Highlights, la misma forma. M: 2:12-6:37 (el mismo script). */
  summaryPace: [
    { aboveKm: 50, x: 300 },
    { aboveKm: 20, x: 120 },
    { aboveKm: 5, x: 40 },
    { aboveKm: 1, x: 10 },
    { aboveKm: 0, x: 3 },
  ] as const satisfies readonly PaceZone[],
  /** s de pared por etapa en el digest de While you were away, por tipo de etapa: fijo, no mira lo que pasó. E (§15.3). */
  digestBudgetS: {
    llana: 60,
    media: 90,
    reina: 150,
    cri: 120,
    clasica: 150,
  } as const satisfies Readonly<Record<StageKind, number>>,
  /** Crono: s de carrera por s de pared mientras la fracción de salidos (de 0 a 1) es ≤ upToStarted.
   *  M: de 5:20 a 11:23 (un prólogo de 176 a 60 s, una crono con general a 120 s y las nacionales de 35 y 40 km, §9.4). */
  ttPace: [
    { upToStarted: 0.6, x: 120 },
    { upToStarted: 0.9, x: 40 },
    { upToStarted: 1, x: 12 },
  ] as const satisfies readonly { readonly upToStarted: number; readonly x: number }[],
  /** s de carrera por s de pared en el último km del último en salir. */
  ttLastKmX: 2,
  /** km/h nominales por pendiente media del km (%, de ProfileStrip.altM), para playbackEstimateS (About 9 min): nunca los de
   *  la carrera. Cada km toma la primera banda con upToPct ≥ su pendiente. M (l2/estimacion.mjs): tabla de §15.3. */
  nominalKmh: [
    { upToPct: -4, kmh: 56 },
    { upToPct: -1.5, kmh: 47 },
    { upToPct: 1.5, kmh: 44 },
    { upToPct: 4, kmh: 37 },
    { upToPct: 7, kmh: 22 },
    { upToPct: Infinity, kmh: 16 },
  ] as const satisfies readonly { readonly upToPct: number; readonly kmh: number }[],
  /** La altitud de la estimación (E2, paso 10b; B17): un km de más de abovePct % de pendiente media cuya cota media pasa de
   *  fromM tarda en playbackEstimateS y ttPlaybackEstimateS 1 + slowdownPer1000M · (cota − fromM) / 1000 veces lo de su banda
   *  de nominalKmh. Solo el perfil, nunca la carrera. M (10b, la línea grabada de las 22 en línea del banco × 2): esos km van
   *  de media un 8 % más despacio que su banda de 1.000 a 1.500 m, un 17 % de 1.500 a 2.000 y un 37 % por encima; mínimos
   *  cuadrados desde 1.000 m, 0,18. Sin ella, el digest de race-colombia e5 congelada (hasta 2.274 m) dura un 41 % más que su
   *  presupuesto (8-k pide menos del 40 %); con ella, un 23 %, y la duración anunciada fuera de los finales en alto no se mueve. */
  nominalAltitude: { abovePct: 4, fromM: 1000, slowdownPer1000M: 0.2 },

  // MANDOS (§8.5; D-20)
  speeds: [0.5, 1, 2, 4], // ×½ ×1 ×2 ×4: multiplican el factor de la zona, no mueven las zonas
  nextActionSpeedup: 20, // Next action multiplica el factor por 20 hasta que se revela un Cue de clase ≥ nextActionMinClass: causal
  nextActionMinClass: 2 satisfies CueClass, // clase de Cue: Next action se corta cuando entra en la cola el primero de clase ≥ esta que no sea de la ronda de la moto (6-m, §8.5)
  skippedMinClass: 2 satisfies CueClass, // While you skipped enseña, al volver de un salto, los Cue saltados de clase ≥ esta
  seekStepKm: 5, // km de los saltos −5 km y +5 km
  seekFinalKm: 20, // km a meta del salto Final 20 km
  ttSeekStepS: 600, // s de carrera de los saltos −10 min y +10 min de la crono (9-g, §9.4)
  ttSeekLastStarters: 20, // corredores del salto Last 20 starters de la crono (9-g, §9.4)
  resumeBackS: 60, // s de carrera que se retrocede al reanudar, con Previously
  controlsHideS: 3, // s de pared sin tocar tras los que los mandos y la barra de progreso se esconden en playing; vuelven con
  // cualquier toque, movimiento o tecla, y no se esconden con el foco dentro (8-p, §18.8). S/E: la prueba de lectura

  // RÓTULOS Y CAPA FIJA (§6.2, §6.5, §7, §8.6; D-17, D-21, D-22). S/E salvo donde se dice: los acepta la prueba de lectura.
  cueHoldS: [3, 4, 5, 6] as const satisfies Readonly<Record<CueClass, number>>, // s de pared que ocupa un Cue según su clase 0-3; no paran el reloj
  cueQueueMax: 3, // Cue esperando como mucho; con la cola llena se descartan los de clase 0 y 1, salvo la presentación de
  // la fuga, que no cuenta (6-m): la carrera no se frena
  cueTopStart: 5, // puesto de salida hasta el que la caída, el descolgado o el abandono de un corredor son de clase 3 (6-g)
  crashNamesDelayS: 3, // s de pared entre CRASH y los nombres de los caídos
  breakRoundEveryS: 6, // s de pared entre dos rótulos de la moto que rodea la fuga, de clase 2 y reservados (6-m), uno por
  // escapado de breakRoundOf; solo en Watch a ×½, ×1 y ×2
  gapsTableEveryRealS: 25, // s de pared entre dos cuadros de diferencias generales
  quietFinalKm: 5, // km a meta desde los que ya no sale el cuadro de diferencias
  quietFinalM: 500, // m a meta desde los que no sale un rótulo de corredor: solo la distancia
  climbCardLeadKm: 3, // km antes del pie en que sale la ficha del puerto
  finishFreezeS: 3, // s de pared del plano del ganador antes del cierre
  previewCardS: 5, // s de pared de cada uno de los cuatro cuadros de la previa
  previewGcTop: 3, // favoritos de la previa: los 3 primeros de la general de salida...
  previewAttrTop: 3, // ...y los 3 mejores inscritos por el atributo del tipo de etapa (SPR, COL, MON, CRI, PAV)
  closingResultTop: 10, // puestos del resultado en el cierre, más el corredor propio
  closingCardS: 6, // s de pared de cada cuadro del cierre antes de pasar solo (§6.11, §8.6). S/E
  previewThreatsMax: 3, // corredores que el cuadro de maillots de la previa nombra por maillot (§8.6)
  recapMaxCues: 5, // rótulos de clase ≥ 2 que enseñan While you skipped y Previously (8-i, §8.5)
  cardRowsMax: 5, // filas de un cuadro de diferencias, de la general virtual o de la lista de una fuga (dos corredores
  // por fila) en el móvil (§6.7). S/E
  cardLinesMax: 3, // líneas del rótulo de corredor además del nombre (§4.8; lo exige riderCardSchema, §4.11)
  gcLineTop: 20, // puesto de salida hasta el que la general gana una línea del rótulo: 14th overall +4:02
  sameTimeS: 5, // s de carrera por debajo de los cuales la diferencia principal es s.t.
  trendWindowKm: 5,
  trendMinS: 5, // tendencia: el hueco ahora menos el de 5 km antes; flecha solo si cambia más de 5 s de carrera
  mainGapTopStart: 3, // con el pelotón delante, la diferencia principal va contra el primero de detrás con maillot o top 3 de salida
  virtualGcTop: 10,
  virtualGcMaxS: 300, // general virtual si uno de los 10 primeros de salida va en otro grupo que el líder a menos de 300 s de carrera

  // TRAMOS Y PROGRESO (§10, §14; D-06, D-55)
  chunkRaceS: 900, // s de carrera que cubre como mucho un BroadcastChunk
  prefetchRaceS: 900, // s de carrera por delante de lo alcanzado que se sirven como mucho; más allá, 409 (B18)
  progressEveryRealS: 15, // s de pared entre dos informes de lo alcanzado (y siempre al pausar, ocultarse y salir). S/E
  progressMinDeltaS: 60, // s de carrera que tiene que crecer lo alcanzado para escribir race_watch (o cambia el estado). S/E: B14, paso 7. PROGRESS_MIN_DELTA_S la sustituye sin desplegar (§15.8)

  // TOPES DE RED DE B6 (§14.8, §16.4; decisión 16-h): con gzip 6, el doble de lo estimado o medido. S/E
  maxHeadGzipBytes: 16_384, // bytes: la cabecera (BroadcastHead). M: 7,1-9,0 KB (§18.1)
  maxChunkGzipBytes: 12_288, // bytes: el tramo mayor. M: hasta 4,72 KB (§18.1)
  maxFinishGzipBytes: 40_960, // bytes: el paquete de meta (BroadcastFinish). E: 10-20 KB (§14.8)
  maxVeiledStageGzipBytes: 4_096, // bytes: la ruta de etapa sin los opcionales de resultado. M: 0,46-2,1 KB (§14.8)
  maxKnownStageGzipBytes: 112_640, // bytes: la ruta de etapa CONOCIDA (StageReplay entero, con la radio). M: de 22,2 a 100,1 KB con gzip
  // en las 22 en línea del banco (mapa 07 §7); el máximo más un 10 %, no el doble. Tope de banco (B6, 15-g)

  // NOMBRES (§6.3, §7.5, §7.7; D-18, D-26, D-27)
  nameWholeGroupUpTo: 12, // corredores: un grupo de hasta 12 se nombra entero. Copia de NAME_WHOLE_GROUP_UP_TO, atada (§15.5)
  byNamesUpTo: 3, // corredores: un grupo de 3 o menos se rotula por sus nombres (GroupLabel 'names'; SPEC §6.15)
  namedGcTop: 10, // puestos de salida que se nombran en un grupo mayor que nameWholeGroupUpTo
  /** corredores nombrados como mucho por grupo y foto en la Race Radio; el resto se cuenta (+56 riders more). Era
   *  MAX_NAMED_PER_GROUP de apps/api/src/chronicle.ts (v47), que desde el 11a la lee de aquí, como radioFromTimeline */
  radioNamedMax: 24,
  breakNamedMax: 2, // corredores que nombra la frase de la fuga; el resto se cuenta (R23.4 admite tres)
  knownNameMinWins: 3, // victorias desde las que un corredor es nombre conocido (nivel 7 de NotorietyLevel)
  gcThreatTop: 10, // puesto de salida hasta el que un corredor amenaza la general (nivel 5 de NotorietyLevel)
  roleHysteresisKm: 1, // km que tiene que sostenerse la condición de un papel para que el papel del grupo cambie (4-q)
  bunchMinShare: 2 / 3, // fracción de los que corren desde la que el grupo con el título es Bunch. Copia de PELOTON_MIN_SHARE, atada
  chaseMinShare: 0.5, // fracción del mayor grupo de detrás de la cabeza para ser la persecución. Copia de STAGE.gapChaseMainFraction, atada

  // RACIMOS EN LA VOZ (§12.2; D-43, DD-18)
  liveClusters: false, // se enciende solo si B19 sigue en 0 con racimos: pide un banco verde, por eso no es interruptor (§15.8)
  liveClusterWindowKm: 5,
  liveClusterMin: 3, // la ventana de groupRuns en km y los descuelgues de corredores sin rótulo que hacen un racimo

  // RELOJ ESTIMADO (§3, §14; D-07)
  estimatedClockMaxErrKm: 1, // km: si el p99 del error de la cabeza del adaptador pasa de esto (B22, paso 6), las etapas sin línea abren solo en Report. S/E

  // MÓVIL Y CACHÉ (§6.2, §10, §18; D-17, D-35, D-56)
  mobileGroupRows: 4, // filas de la barra de grupos en móvil; el resto, +N groups
  overlayHz: 10,
  barHz: 4, // repintados por segundo de la capa fija y de la barra. S/E: la medida a mano del paso 10 puede bajar barHz
  decodedCacheEntries: 16, // entradas del LRU de líneas decodificadas por (raceKey, stageDay) en la API. M: de 8 a 30 MB (con 64, de 33 a 121: §5.6, 18-d)
  chunkCacheMaxAgeS: 3600, // s de Cache-Control: private, max-age de un tramo: el dato es inmutable y solo se sirve dentro de lo permitido
} as const

/** El modo sin destripe (§10, §11). Los días de juego son cuatro por día real (el tick de 6 h). */
export const SPOILER = {
  /** Días de juego tras la ÚLTIMA etapa de una carrera en que se levanta su velo, todas sus etapas a la vez: 56 son 14 días
   *  reales, y quien vuelve tras dos semanas aún tiene en guardia la gran vuelta que dejó (D-31). Lo lee también el reparto al grabar (knownWins). */
  expiryGameDays: 56,
  /** En guardia por defecto (alcance guarded) aunque el espectador no corra en ellas: tres grandes vueltas y cinco monumentos,
   *  68 etapas por temporada. M (producto, e2prod/headline.mjs): quien no mira nada tiene alguna velada 260 días de 364,
   *  7 a la vez en la mediana, 29 en el p90 y 42 como máximo. Del dueño: DD-01. Los ids, atados al calendario (§15.5). */
  headlineRaces: [
    'race-italy',
    'race-france',
    'race-spain',
    'race-sanremo',
    'race-flanders',
    'race-roubaix',
    'race-liege',
    'race-lombardy',
  ],
  viewerCookieDays: 90, // días reales de vida de cs_viewer: más que la sesión de 7 días de better-auth (D-34)
  lastSeenEveryMin: 60, // minutos reales: como mucho una escritura de users.last_seen_at por hora (D-33; también la pide E7)
  newsGroupAbove: 3, // etapas veladas de una carrera por encima de las cuales las noticias las juntan en una línea (D-45)
  adaptiveAskAfterRaces: 2, // carreras de cabecera ignoradas (ni vistas ni reveladas) tras las que se ofrece own_only, una sola vez
  horizonMemoS: 60, // s reales del memo de computeHorizon por (userId, currentDay, horizonRev) en el proceso (D-33). E
  /** entradas como mucho de cada memo del proceso (el del horizonte, el de veilDelta y el de la sesión; TtlMemo, §10.7, 10-m): en el
   *  peor caso, 500 mánagers distintos en un minuto, 17 y 88 MB (estimado por §10.7). S/E: pasarlo solo cuesta recalcular (3 a 9 ms, §18.2). */
  horizonMemoEntries: 500,
  /** ms: p95 de computeHorizon que exige B14 con 250.000 filas de race_rosters. M: la consulta por corredor tarda 0,11 ms con
   *  race_rosters_rider_idx y 19,6 ms sin él (juez del motor, C12, PGlite, 249.232 filas). */
  horizonBudgetMs: 5,
} as const
