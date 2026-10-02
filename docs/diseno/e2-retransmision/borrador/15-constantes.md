## 15. Las constantes

Esta sección escribe enteros los tres bloques de constantes de E2 (`TIMELINE`, `BROADCAST` y `SPOILER`) y es su ÚNICA fuente de valores: cuando otra sección escribe una cifra de uno de ellos, manda la de aquí, y el implementador copia estos bloques y escribe los tests contra los nombres, nunca contra literales. Los valores son los que fijó la síntesis más once que las decisiones usan y la síntesis no nombraba (15-e) y los que añadieron §6, §8, §9 y §16 al escribirse. Cada constante lleva su unidad, su intención y si su valor está medido (con quién y con qué script), estimado o sin evidencia de los jueces (S/E). Las líneas son las de HEAD `9c21885`, comprobadas en `af953b9`, que solo añade `docs/diseno/`. Tres medidas son nuevas y se hicieron en el scratchpad de la síntesis sin tocar el repositorio, con el `dist` del motor v89: `l2/estimacion.mjs` (la estimación de duración), `l2/digest.mjs` (el digest de una gran vuelta) y `l2/bloquesCalendario.mjs` (los bloques de foto en las 1.418 etapas del calendario); los bloques se compilaron con TypeScript 5.9.3 y el `tsconfig.base.json` del repositorio (`l2/tipos/`).

### 15.1 Dónde viven y por qué

La regla de la casa es una línea de `Claude.md` (l. 12): «Toda constante de juego vive en packages/engine/src/constants.ts con comentario de intención. Cambios de constantes se anotan en docs/balance.md.» El encargo la resume sin el adjetivo (`00-encargo.md` §4, regla 4: «constantes en `packages/engine/src/constants.ts` con comentario de intención»). E2 la cumple en su letra, porque ninguna de sus constantes es de juego, y se desvía por escrito del resumen del encargo en dos de sus tres bloques (D-52, I-48, O-19):

| Bloque | Fichero | Quién lo lee | ¿Tocarlo corre los bancos? | Por qué ahí |
| --- | --- | --- | --- | --- |
| `TIMELINE` | `packages/engine/src/constants.ts`, detrás de `STAGE` (hoy l. 2288-6372, el final del fichero); se exporta en `src/index.ts` (l. 9-19) | el grabador (`sim/timeline.ts`), `packages/db/src/timelines.ts` (gzip y topes) y B6 | sí | decide lo que se graba; que un cambio pase por I1, I3, B6 y B11 sobre las 24 etapas es lo que se quiere. Nace en el PR 4b, que ya paga los bancos |
| `BROADCAST` | `packages/shared/src/broadcast/constants.ts` | las funciones de lectura de `shared` (`instant.ts`, `cues.ts`, `pace.ts`, `names.ts`, `wire.ts`), que corren en la API y en la web, y `domain/broadcast/player.ts` | no | no cambia una carrera ni lo grabado (decisión 15-b) |
| `SPOILER` | el mismo fichero | `packages/db/src/horizon.ts`, `cast.ts`, la API y la web | no | ídem |

El motivo es de coste y está medido. El CI corre los ocho tramos de bancos cuando el diff toca `^packages/engine/` (`.github/workflows/ci.yml` l. 189), sin mirar la versión; los bancos suman 4.365 s de pruebas en serie, unos 73 min, que la matriz reparte en ocho tramos en paralelo (`ci.yml` l. 103-110, mapa 07 §4; D-52). Un PR que solo toca `packages/shared`, `apps/api` o `apps/web` corre `typecheck` (37,4 s) y `test:rapido` (562 y 529 s en dos corridas, mapa 07 §4). Con `BROADCAST` en el motor, como proponía `estado.md` §12, cada ajuste de ritmo o de rótulo pagaría los 73 min (O-19, O-motor-07). Ya hay precedentes de constantes de presentación junto a su código: `SIT_UP_WINDOW_KM` (`apps/api/src/chronicle.ts` l. 254), `NAMED_IN_SUMMARY` (`apps/web/src/domain/stageJournal.ts` l. 197) y `STALE_TIME` (`apps/web/src/queryClient.ts` l. 17). Queda resuelta la contradicción X-22: paga los bancos quien toca el camino `packages/engine/`, suba o no `ENGINE_VERSION`, y E2 solo lo toca en el paso 4 (PR 4a y 4b); la próxima migración libre es la `0043` (`packages/db/drizzle/meta/_journal.json`, 43 entradas; §13).

La desviación tiene tres costes, y cada uno tiene su defensa:
1. **Las copias.** `shared` no importa el motor (su única dependencia es `zod`, `packages/shared/package.json` l. 18-20), así que tres reglas del motor viven copiadas en `BROADCAST`, una cuarta en `photoBlocksOf` y una quinta en `chaseRefOf`; las ata un test de la suite rápida (§15.5).
2. **La deriva hacia la carrera.** El motor importa `@cyclingstar/shared` (`packages/engine/package.json` l. 18-20) y podría leer `BROADCAST`: entonces un ajuste cambiaría carreras sin bancos. Lo impide una regla de ESLint (decisión 15-b).
3. **Lo que se lee al grabar.** `packages/db` arma el reparto congelado al grabar y lee `SPOILER.expiryGameDays` para `knownWins` (§4.2): lo grabado queda con el valor de su día y cambiar la constante no reescribe líneas; la cuenta de `knownWins` es la de §7.5 (decisión 7-e).

Un cambio de valor en cualquiera de los tres bloques se anota en `docs/balance.md`, como las del motor, con la medida que lo justifica (B17, B22, B14 o la prueba de lectura), y no sube `ENGINE_VERSION` (D-09; decisión 15-h).

### 15.2 `TIMELINE`

```ts
// packages/engine/src/constants.ts (bloque nuevo, detrás de STAGE; se añade TIMELINE al export de src/index.ts l. 9-19)
/**
 * LA LÍNEA TEMPORAL QUE SE GRABA AL CORRER LA ETAPA (E2, docs/retransmision.md §5 y §15). No es una constante de
 * juego: la carrera no la lee. Vive aquí porque decide lo que se graba, y tocarla corre los ocho tramos de bancos
 * (ci.yml l. 189), que es lo que tiene que pasar: I1, I3, B6 y B11 se miden sobre las 24 etapas del mapa 07 §7.
 */
export const TIMELINE = {
  /** Versión del formato guardado (§4.3): un decodificador por versión, y lo guardado no se reescribe. El grabador la
   *  escribe en un campo de tipo literal 1: subirla sin escribir el formato 2 y su decodificador no compila. */
  format: 1,
  /** km entre fotos clave (la pertenencia completa, §4.2), más una al empezar el último km. Es el paso de I3 y la unidad
   *  del salto. Medido: 4,2-6,7 KB por etapa en fotos clave (estado.md §3.7). */
  keyPhotoKm: 10,
  /** Bloques del final en los que cada grupo vivo lleva marca de reloj en cada uno (el cuarto sitio de §3.4): con
   *  STAGE.dx 0,1 son el último km, el de los carteles de 500, 300, 200 y 100 m. Derivado, no medido. */
  lastKmMarkBlocks: 10,
  /** Nivel de gzip de stage_timelines.body (su tamaño va en stage_timelines.bytes); lo aplica packages/db (el motor no importa Node). Medido con 9: 17,5 KB de
   *  mediana por etapa en línea con el formato de datos (8-23, datos.md §10.5, 28 etapas), de 1,6 a 2,4 veces menos que jsonb
   *  (juez del motor, C8); con el formato de §4.3, de 20,9 a 70,0 KB, mediana 38,8 (§5.7, l3/grabador.mjs). */
  gzipLevel: 9,
  /** bytes. Tope de stage_timelines.bytes de una etapa en línea: 1,4 veces el máximo medido con el formato de §4.3 (70,0 KB;
   *  de 20,9 a 70,0, mediana 38,8; §5.7, 23 etapas × 2 semillas). D-11. */
  maxStoredBytes: 98_304,
  /** bytes. Tope del JSON antes de gzip: medido de 123 a 464 KB (§5.7). D-11. */
  maxJsonBytes: 655_360,
  /** bytes. Mediana exigida al JSON en las 24 etapas: medida, 222 KB (227.516 B, §5.7); 1,44 veces lo medido, el margen de maxStoredBytes.
   *  El 15 % de antes (256 KB) era menor que lo que cambia una etapa con la semilla (e18, 269,0 y 216,7 KB, §5.7), y B6 del JSON corre
   *  en cada PR del motor (en su tramo solo se imprime, 16-n). D-11, 15-l. */
  medianJsonBytes: 327_680,
  /** bytes. Tope de una crono en bytea: 1,5 veces el máximo medido, la e10 de race-italy (42 km, 176 corredores, la crono WorldTour
   *  más larga del calendario): 31.436 bytes, y 32.203 con checkClockDs (rcod/n/grab2.mjs). Las de 20 y 26 km, de 18,8 a 24,2 KB (§5.7). D-11, 15-i. */
  ttMaxStoredBytes: 49_152,
} as const
```

| Constante | Unidad | Procedencia | La vigila |
| --- | --- | --- | --- |
| `format` | versión | fijada | el tipo literal `1` de `StoredTimelineV1` (§4.3) al compilar; `codec.test.ts`: un `format` desconocido lanza `TimelineFormatError` |
| `keyPhotoKm` | km | medida | I3 (`clave(k + 10)` es la reducción de `clave(k)`) y B6 |
| `lastKmMarkBlocks` | bloques de `STAGE.dx` | derivada | `timeline.test.ts`: todo grupo vivo en el último km tiene marca en cada uno de esos bloques; I2 en el último km |
| `gzipLevel` | nivel de zlib, de 0 a 9 | medida | B6 |
| `maxStoredBytes`, `maxJsonBytes`, `medianJsonBytes`, `ttMaxStoredBytes` | bytes | topes sobre lo medido (D-11) | B6, en las 24 etapas (§16.4) y, para `ttMaxStoredBytes`, en la e10 de `race-italy`, que ninguna de las 24 iguala (15-i): los del `bytea` fallan en el banco de todo PR del motor; los del JSON fallan en el nocturno y en la rápida sobre las seis congeladas, y en el tramo del PR solo se imprimen (16-n) |

Los topes son umbrales de banco, no de escritura (decisión 15-g): en producción una línea que pase de `maxStoredBytes` (o de `ttMaxStoredBytes`, si es una crono) se escribe igual y el tick apunta `timeline size: <raceKey> e<N> <bytes>` en `tick_log.notes`, la columna que ya usa D-12 (`packages/db/src/schema.ts` l. 156-173). Perder la retransmisión de una etapa por 50 KB sería peor que guardarlos. Los tests del grabador viven en `packages/engine/src/sim/timeline.test.ts`, y ahí hay una trampa: `test:rapido` excluye `packages/engine/src/sim/**` (`package.json` l. 21) y la matriz de bancos lista sus ficheros uno a uno (`ci.yml` l. 150-175), así que un test nuevo en `sim/` no corre en ningún PR, solo por la noche en `cobertura.yml` (`pnpm test:coverage`, l. 64). El PR 4b lo añade al tramo `mundo y radio` (l. 166-175), el de `sim/raceRadio.test.ts`, que tardó 5,5 min en la corrida de seis tramos (l. 128) (decisión 15-d).

### 15.3 `BROADCAST`

Unidades: s de carrera es reloj de carrera (`RaceS`, §4.1) y s de pared, el tiempo del espectador; M es medida, E estimada y S/E sin evidencia de los jueces. Los grupos siguen el orden de §B: ritmo, mandos, rótulos (con la capa fija), tramos y progreso, nombres, racimos, reloj estimado, móvil y caché.

```ts
// packages/shared/src/broadcast/constants.ts (nuevo): BROADCAST y SPOILER. Las leen la API y la web; ni el motor ni los
// ficheros de shared que usa el grabador pueden importarlas (15-b). Tocarlas corre typecheck y test:rapido, no los bancos.
import type { StageKind } from '../contracts.js'
import type { CueClass, PaceZone } from './timeline.js' // los dos se declaran en timeline.ts (17-z)

export const BROADCAST = {
  // RITMO (§8.2, §9.4; D-19). Iniciales: B17 los mide en los pasos 0 y 10 y la prueba de lectura los acepta (D-60).
  /** Watch, sin pausas: s de carrera por s de pared mientras la cabeza tiene más de aboveKm km a meta.
   *  M: 7:39-19:59 por etapa en línea (ejecutabilidad §2.1, juez-ejec/ritmo.mjs, 5 etapas × semillas 0 y 1). */
  pace: [{ aboveKm: 50, x: 60 }, { aboveKm: 20, x: 30 }, { aboveKm: 5, x: 12 }, { aboveKm: 1, x: 4 }, { aboveKm: 0, x: 1.5 }] as const satisfies readonly PaceZone[],
  /** Highlights, la misma forma. M: 2:12-6:37 (el mismo script). */
  summaryPace: [{ aboveKm: 50, x: 300 }, { aboveKm: 20, x: 120 }, { aboveKm: 5, x: 40 }, { aboveKm: 1, x: 10 }, { aboveKm: 0, x: 3 }] as const satisfies readonly PaceZone[],
  /** s de pared por etapa en el digest de While you were away, por tipo de etapa: fijo, no mira lo que pasó. E (ver abajo). */
  digestBudgetS: { llana: 60, media: 90, reina: 150, cri: 120, clasica: 150 } as const satisfies Readonly<Record<StageKind, number>>,
  /** Crono: s de carrera por s de pared mientras la fracción de salidos (de 0 a 1) es ≤ upToStarted.
   *  M: 6:24-6:33 un prólogo de 176 a 60 s (6:55-7:06 con el último km real, §9.4), 11:21-11:23 una crono con general a 120 s
   *  (ejecutabilidad §2.1) y 5:20-5:52 las nacionales de 35 y 40 km, con 30 y 12 corredores (§9.4): de 5:20 a 11:23. */
  ttPace: [{ upToStarted: 0.6, x: 120 }, { upToStarted: 0.9, x: 40 }, { upToStarted: 1, x: 12 }] as const satisfies readonly { readonly upToStarted: number; readonly x: number }[],
  /** s de carrera por s de pared en el último km del último en salir. */
  ttLastKmX: 2,
  /** km/h nominales por pendiente media del km (%, de ProfileStrip.altM), para playbackEstimateS (About 9 min): nunca los de
   *  la carrera. Cada km toma la primera banda con upToPct ≥ su pendiente. M aquí (l2/estimacion.mjs): tabla de §15.3. */
  nominalKmh: [{ upToPct: -4, kmh: 56 }, { upToPct: -1.5, kmh: 47 }, { upToPct: 1.5, kmh: 44 }, { upToPct: 4, kmh: 37 }, { upToPct: 7, kmh: 22 }, { upToPct: Infinity, kmh: 16 }] as const satisfies readonly { readonly upToPct: number; readonly kmh: number }[],

  // MANDOS (§8.5; D-20)
  speeds: [0.5, 1, 2, 4],                      // ×½ ×1 ×2 ×4: multiplican el factor de la zona, no mueven las zonas
  nextActionSpeedup: 20,                       // Next action multiplica el factor por 20 hasta que se revela un Cue de clase ≥ nextActionMinClass: causal
  nextActionMinClass: 2 satisfies CueClass,    // clase de Cue: Next action se corta cuando entra en la cola el primero de clase ≥ esta que no sea de la ronda de la moto (6-m, §8.5)
  skippedMinClass: 2 satisfies CueClass,       // While you skipped enseña, al volver de un salto, los Cue saltados de clase ≥ esta
  seekStepKm: 5,                               // km de los saltos −5 km y +5 km
  seekFinalKm: 20,                             // km a meta del salto Final 20 km
  ttSeekStepS: 600,                            // s de carrera de los saltos −10 min y +10 min de la crono (9-g, §9.4)
  ttSeekLastStarters: 20,                      // corredores del salto Last 20 starters de la crono (9-g, §9.4)
  resumeBackS: 60,                             // s de carrera que se retrocede al reanudar, con Previously
  controlsHideS: 3,                            // s de pared sin tocar tras los que los mandos y la barra de progreso se esconden en playing; vuelven con
                                               // cualquier toque, movimiento o tecla, y no se esconden con el foco dentro (8-p, §18.8). S/E: la prueba de lectura

  // RÓTULOS Y CAPA FIJA (§6.2, §6.5, §7, §8.6; D-17, D-21, D-22). S/E salvo donde se dice: los acepta la prueba de lectura.
  cueHoldS: [3, 4, 5, 6] as const satisfies Readonly<Record<CueClass, number>>, // s de pared que ocupa un Cue según su clase 0-3; no paran el reloj
  cueQueueMax: 3,                              // Cue esperando como mucho; con la cola llena se descartan los de clase 0 y 1, salvo la presentación de
                                               // la fuga, que no cuenta (6-m): la carrera no se frena
  cueTopStart: 5,                              // puesto de salida hasta el que la caída o el abandono de un corredor es de clase 3
  crashNamesDelayS: 3,                         // s de pared entre CRASH y los nombres de los caídos
  breakRoundEveryS: 6,                         // s de pared entre dos rótulos de la moto que rodea la fuga, de clase 2 y reservados (6-m), uno por
                                               // escapado de breakRoundOf; solo en Watch a ×½, ×1 y ×2
  gapsTableEveryRealS: 25,                     // s de pared entre dos cuadros de diferencias generales
  quietFinalKm: 5,                             // km a meta desde los que ya no sale el cuadro de diferencias
  quietFinalM: 500,                            // m a meta desde los que no sale un rótulo de corredor: solo la distancia
  climbCardLeadKm: 3,                          // km antes del pie en que sale la ficha del puerto
  finishFreezeS: 3,                            // s de pared del plano del ganador antes del cierre
  previewCardS: 5,                             // s de pared de cada uno de los cuatro cuadros de la previa
  previewGcTop: 3,                             // favoritos de la previa: los 3 primeros de la general de salida...
  previewAttrTop: 3,                           // ...y los 3 mejores inscritos por el atributo del tipo de etapa (SPR, COL, MON, CRI, PAV)
  closingResultTop: 10,                        // puestos del resultado en el cierre, más el corredor propio
  closingCardS: 6,                             // s de pared de cada cuadro del cierre antes de pasar solo (§6.11, §8.6). S/E
  previewThreatsMax: 3,                        // corredores que el cuadro de maillots de la previa nombra por maillot (§8.6)
  recapMaxCues: 5,                             // rótulos de clase ≥ 2 que enseñan While you skipped y Previously (8-i, §8.5)
  cardRowsMax: 5,                              // filas de un cuadro de diferencias, de la general virtual o de la lista de una fuga (dos corredores
                                               // por fila) en el móvil (§6.7). S/E
  cardLinesMax: 3,                             // líneas del rótulo de corredor además del nombre (§4.8; lo exige riderCardSchema, §4.11)
  gcLineTop: 20,                               // puesto de salida hasta el que la general gana una línea del rótulo: 14th overall +4:02
  sameTimeS: 5,                                // s de carrera por debajo de los cuales la diferencia principal es s.t.
  trendWindowKm: 5, trendMinS: 5,              // tendencia: el hueco ahora menos el de 5 km antes; flecha solo si cambia más de 5 s de carrera
  mainGapTopStart: 3,                          // con el pelotón delante, la diferencia principal va contra el primero de detrás con maillot o top 3 de salida
  virtualGcTop: 10, virtualGcMaxS: 300,        // general virtual si uno de los 10 primeros de salida va en otro grupo que el líder a menos de 300 s de carrera

  // TRAMOS Y PROGRESO (§10, §14; D-06, D-55)
  chunkRaceS: 900,                             // s de carrera que cubre como mucho un BroadcastChunk
  prefetchRaceS: 900,                          // s de carrera por delante de lo alcanzado que se sirven como mucho; más allá, 409 (B18)
  progressEveryRealS: 15,                      // s de pared entre dos informes de lo alcanzado (y siempre al pausar, ocultarse y salir). S/E
  progressMinDeltaS: 60,                       // s de carrera que tiene que crecer lo alcanzado para escribir race_watch (o cambia el estado). S/E: B14, paso 7. PROGRESS_MIN_DELTA_S la sustituye sin desplegar (§15.8)

  // TOPES DE RED DE B6 (§14.8, §16.4; decisión 16-h): con gzip 6, el doble de lo estimado o medido. S/E
  maxHeadGzipBytes: 16_384,                    // bytes: la cabecera (BroadcastHead). M: 7,1-9,0 KB (§18.1)
  maxChunkGzipBytes: 12_288,                   // bytes: el tramo mayor. M: hasta 4,72 KB (§18.1)
  maxFinishGzipBytes: 40_960,                  // bytes: el paquete de meta (BroadcastFinish). E: 10-20 KB (§14.8)
  maxVeiledStageGzipBytes: 4_096,              // bytes: la ruta de etapa sin los opcionales de resultado. M: 0,46-2,1 KB (§14.8)
  maxKnownStageGzipBytes: 112_640,             // bytes: la ruta de etapa CONOCIDA (StageReplay entero, con la radio). M: de 22,2 a 100,1 KB con gzip
                                               // en las 22 en línea del banco (mapa 07 §7); el máximo más un 10 %, no el doble. Tope de banco (B6, 15-g)

  // NOMBRES (§6.3, §7.5, §7.7; D-18, D-26, D-27)
  nameWholeGroupUpTo: 12,                      // corredores: un grupo de hasta 12 se nombra entero. Copia de NAME_WHOLE_GROUP_UP_TO, atada (§15.5)
  byNamesUpTo: 3,                              // corredores: un grupo de 3 o menos se rotula por sus nombres (GroupLabel 'names'; SPEC §6.15)
  namedGcTop: 10,                              // puestos de salida que se nombran en un grupo mayor que nameWholeGroupUpTo
  breakNamedMax: 2,                            // corredores que nombra la frase de la fuga; el resto se cuenta (R23.4 admite tres)
  knownNameMinWins: 3,                         // victorias desde las que un corredor es nombre conocido (nivel 7 de NotorietyLevel)
  gcThreatTop: 10,                             // puesto de salida hasta el que un corredor amenaza la general (nivel 5 de NotorietyLevel)
  roleHysteresisKm: 1,                         // km que tiene que sostenerse la condición de un papel para que el papel del grupo cambie (4-q)
  bunchMinShare: 2 / 3,                        // fracción de los que corren desde la que el grupo con el título es Bunch. Copia de PELOTON_MIN_SHARE, atada
  chaseMinShare: 0.5,                          // fracción del mayor grupo de detrás de la cabeza para ser la persecución. Copia de STAGE.gapChaseMainFraction, atada

  // RACIMOS EN LA VOZ (§12.2; D-43, DD-18)
  liveClusters: false,                         // se enciende solo si B19 sigue en 0 con racimos: pide un banco verde, por eso no es interruptor (§15.8)
  liveClusterWindowKm: 5, liveClusterMin: 3,   // la ventana de groupRuns en km y los descuelgues de corredores sin rótulo que hacen un racimo

  // RELOJ ESTIMADO (§3, §14; D-07)
  estimatedClockMaxErrKm: 1,                   // km: si el p99 del error de la cabeza del adaptador pasa de esto (B22, paso 6), las etapas sin línea abren solo en Report. S/E

  // MÓVIL Y CACHÉ (§6.2, §10, §18; D-17, D-35, D-56)
  mobileGroupRows: 4,                          // filas de la barra de grupos en móvil; el resto, +N groups
  overlayHz: 10, barHz: 4,                     // repintados por segundo de la capa fija y de la barra. S/E: la medida a mano del paso 10 puede bajar barHz
  decodedCacheEntries: 16,                     // entradas del LRU de líneas decodificadas por (raceKey, stageDay) en la API. M: de 8 a 30 MB (con 64, de 33 a 121: §5.6, 18-d)
  chunkCacheMaxAgeS: 3600,                     // s de Cache-Control: private, max-age de un tramo: el dato es inmutable y solo se sirve dentro de lo permitido
} as const
```

Los tipos se comprueban al compilar, no en un test: `as const satisfies` conserva tuplas y literales (con `noUncheckedIndexedAccess`, `BROADCAST.cueHoldS[c]` con `c: CueClass` es `3 | 4 | 5 | 6`, sin `undefined`), `digestBudgetS` no compila si `stageKindSchema` (`contracts.ts` l. 1127) gana un tipo sin presupuesto, y `cueHoldS` no compila si `CueClass` (§4.9) gana una clase. `bunchMinShare` se escribe `2 / 3`, la misma expresión que `PELOTON_MIN_SHARE` (`raceRadio.ts` l. 91), para que el test de §15.5 compare con `toBe` el mismo doble.

**La estimación de duración** (`playbackEstimateS`, §8.2; `About 9 min` en la ficha, pantalla) solo mira el perfil: cada km a su velocidad nominal y la curva de su zona. `l2/estimacion.mjs` corre las 22 etapas en línea de las 24 del mapa 07 §7 (las 19 de `race-france` que no son crono, `race-flanders`, `race-tramuntana` y `race-colombia` e5) con las semillas 0 y 1 y el campo de `juez-ejec/ritmo.mjs` (176 corredores en las WorldTour, 140 o 126 en las demás); toma el reloj de la cabeza por km y la pendiente media de cada km, ajusta una velocidad por banda como km totales entre horas totales y compara la duración real de `Watch` (pantalla) con la estimada. El script reproduce las duraciones del juez (7:41 y 7:39 en la e7).

| Pendiente media del km | ≤ −4 % | de −4 a −1,5 | de −1,5 a 1,5 | de 1,5 a 4 | de 4 a 7 | > 7 % |
| --- | --- | --- | --- | --- | --- | --- |
| km en la muestra | 540 | 780 | 4.726 | 1.026 | 600 | 200 |
| km/h ajustados (semilla 0 · las dos) | 54,8 · 55,8 | 46,8 · 46,9 | 44,2 · 44,5 | 36,8 · 36,9 | 21,6 · 21,6 | 16,1 · 16,2 |
| `nominalKmh` | 56 | 47 | 44 | 37 | 22 | 16 |

Error de la estimación con los valores redondeados, en las 44 corridas: mediana 29 s (5,8 %), p90 55 s, sesgo medio −2 s; ajustando con la semilla 0 y midiendo en la 1, mediana 29 s y p90 54 s. El peor caso es `race-colombia` e5: estima 15:36 para 19:38-19:59 (−22 %), porque tras 222 km sube los últimos 10 al 5-8 % hasta 2.274 m y la cabeza va más despacio que la media de su banda. Con una sola velocidad de 44 km/h para todo, el p90 sube a 5:11 y el máximo a 10:31: por eso hay bandas. La pantalla nunca enseña cuánto queda (D-19), así que el error solo afecta a la ficha; B17 lo vuelve a medir.

**El digest** de `While you were away` (pantalla) no depende de lo que pasó, pero suma más de lo que dice D-39 («21 etapas son unos 30 min»). Medido aquí (`l2/digest.mjs`, los tipos del calendario): `race-italy` 34,5 min (7 llanas, 7 medias, 6 reinas, 1 crono), `race-france` 36,5 min y `race-spain` 39,5 min. El valor que fijó la síntesis se escribe como está, y el botón dice el número calculado con él y con los cuadros: 38, 40 y 43 min (decisión 8-b, §8.8; D-39 corregida, DD-22).

### 15.4 `SPOILER`

Los días de juego son cuatro por día real (el tick de 6 h: 21 etapas en 23 días de juego son 5,75 días reales, mapa 02 §1.1 y mapa 04 §2).

```ts
// packages/shared/src/broadcast/constants.ts (sigue): el modo sin destripe (§10, §11)
export const SPOILER = {
  /** Días de juego tras la ÚLTIMA etapa de una carrera en que se levanta su velo, todas sus etapas a la vez: 56 son 14 días
   *  reales, y quien vuelve tras dos semanas aún tiene en guardia la gran vuelta que dejó (D-31). Lo lee también el reparto al grabar (knownWins). */
  expiryGameDays: 56,
  /** En guardia por defecto (alcance guarded) aunque el espectador no corra en ellas: tres grandes vueltas y cinco monumentos,
   *  68 etapas por temporada. M (producto, e2prod/headline.mjs): quien no mira nada tiene alguna velada 260 días de 364,
   *  7 a la vez en la mediana, 29 en el p90 y 42 como máximo. Del dueño: DD-01. Los ids, atados al calendario (§15.5). */
  headlineRaces: ['race-italy', 'race-france', 'race-spain', 'race-sanremo', 'race-flanders', 'race-roubaix', 'race-liege', 'race-lombardy'],
  viewerCookieDays: 90,       // días reales de vida de cs_viewer: más que la sesión de 7 días de better-auth (D-34)
  lastSeenEveryMin: 60,       // minutos reales: como mucho una escritura de users.last_seen_at por hora (D-33; también la pide E7)
  newsGroupAbove: 3,          // etapas veladas de una carrera por encima de las cuales las noticias las juntan en una línea (D-45)
  adaptiveAskAfterRaces: 2,   // carreras de cabecera ignoradas (ni vistas ni reveladas) tras las que se ofrece own_only, una sola vez
  horizonMemoS: 60,           // s reales del memo de computeHorizon por (userId, currentDay, horizonRev) en el proceso (D-33). E
  /** entradas como mucho de cada memo del proceso (el del horizonte, el de veilDelta y el de la sesión; TtlMemo, §10.7, 10-m): en el
   *  peor caso, 500 mánagers distintos en un minuto, 17 y 88 MB (estimado por §10.7). S/E: pasarlo solo cuesta recalcular (3 a 9 ms, §18.2). */
  horizonMemoEntries: 500,
  /** ms: p95 de computeHorizon que exige B14 con 250.000 filas de race_rosters. M: la consulta por corredor tarda 0,11 ms con
   *  race_rosters_rider_idx y 19,6 ms sin él (juez del motor, C12, PGlite, 249.232 filas). */
  horizonBudgetMs: 5,
} as const
```

Los ocho ids existen hoy: los monumentos en `packages/engine/src/routes/calendar.ts` (l. 688, 742, 760, 787 y 904) y las tres grandes vueltas por `editionGrandTour` (l. 3675-3677). Que la guardia no se pierda en silencio si un id cambia lo comprueba el test de §15.5. `SPOILER` no se lee en el motor ni en el grabador; sí en `buildTimelineCast` (`packages/db/src/cast.ts`), que cuenta `knownWins` con `expiryGameDays` al grabar, de modo que cada línea lleva la cuenta con el valor de su día.

### 15.5 Las copias atadas por test

D-52 copia en `BROADCAST` las dos reglas del motor que la pantalla necesita: `bunchMinShare` = `PELOTON_MIN_SHARE` (`packages/engine/src/sim/raceRadio.ts` l. 91, exportada en `src/index.ts` l. 209-228) y `chaseMinShare` = `STAGE.gapChaseMainFraction` (`constants.ts` l. 2657). Esta sección ata con ellas tres copias más, y una cuarta con fecha de muerte. La primera es `nameWholeGroupUpTo` = `NAME_WHOLE_GROUP_UP_TO` (`raceRadio.ts` l. 611, hoy sin `export`: el PR 4a se lo añade, que no cambia ninguna carrera y ya paga los bancos; decisión 15-c), porque D-27 dice «el mismo umbral que la radio» y sin test nada lo sostiene. La segunda es `photoBlocksOf` (§4.5), que copia `radioKmPoints` (l. 230-237) llevado a bloques como `simulate.ts` l. 1944-1948 (decisión 4-o), y tiene una trampa medida: en 69 de las 1.418 etapas del calendario (27 de las 66 que miden X,1 km y 42 de las 82 que miden X,2 km, según el error de coma flotante de `stageLengthKm`; por ejemplo `race-castellon` e1, 157,2 km) los dos últimos puntos de `radioKmPoints` caen en el mismo bloque, y el motor toma una sola foto porque `probeAt` es un `Map` por bloque (`l2/bloquesCalendario.mjs`; en las 1.418, `Math.round(L / dx)` es el número de bloques de `sampleProfile` y el km entero k cae en el bloque 10k). `photoBlocksOf` devuelve bloques sin repetir. La tercera es `chaseRefOf` (§6.3), la copia de `chaseReferenceIndex` (`packages/engine/src/stage/group.ts` l. 235-245) con que `groupRoleOf` elige qué grupo de detrás es `Chase group` cuando no hay grueso (6-a): el PR 4a exporta la del motor (17-j) e `instant.ts` exporta la suya para que el test la llame. La de fecha de muerte es `PULLERS_KEPT` (`apps/api/src/chronicle.ts`, §11.16), que copia `STORED_PULLERS_MAX` (`raceRadio.ts` l. 591) desde el 3a porque el motor no la exporta hasta el 4b (§5.4): hasta entonces el test comprueba que vale 12, y en el 4b `chronicle.ts` importa la del motor y se borran la copia y su caso (decisión 15-k).

El test va en `apps/api` porque importa los dos paquetes, sus tests corren en `test:rapido` y allí vive ya el de `PullMotive` (`apps/api/src/raceRadio.test.ts` l. 148-152, que importa `PullMotive` de `@cyclingstar/shared` y `EnginePullMotive` de `@cyclingstar/engine`, l. 3-4). Aquel compara tipos; este compara valores, porque las copias son números o funciones puras (decisión 15-a). `chaseRefOf` se compara con `chaseReferenceIndex` sobre 10.000 carreteras generadas con semilla fija, de 0 a 20 grupos de 1 a 176 corredores con `racing` al azar, con la misma fracción para las dos:

```ts
// apps/api/src/broadcastConstants.test.ts (nuevo; suite rápida)
import { describe, expect, it } from 'vitest'
import { BROADCAST, SPOILER, chaseRefOf, photoBlocksOf, seededRng } from '@cyclingstar/shared'
import { NAME_WHOLE_GROUP_UP_TO, PELOTON_MIN_SHARE, SEASON_CALENDAR, STAGE, chaseReferenceIndex, radioKmPoints, sampleProfile, stageLengthKm } from '@cyclingstar/engine'
import { PULLERS_KEPT } from './chronicle.js'

/**
 * LAS COPIAS DEL MOTOR EN SHARED. packages/shared no importa el motor, así que las reglas del motor que la pantalla
 * necesita viven copiadas en BROADCAST (docs/retransmision.md §15.5). Una copia que diverge compila y no rompe ningún
 * banco: la barra llamaría Bunch a lo que la radio no llama pelotón. Este fichero es lo único que lo impide.
 */
describe('las copias del motor en BROADCAST', () => {
  it('bunchMinShare es PELOTON_MIN_SHARE (raceRadio.ts l. 91)', () => {
    expect(BROADCAST.bunchMinShare).toBe(PELOTON_MIN_SHARE)
  })
  it('chaseMinShare es STAGE.gapChaseMainFraction (constants.ts l. 2657)', () => {
    expect(BROADCAST.chaseMinShare).toBe(STAGE.gapChaseMainFraction)
  })
  it('nameWholeGroupUpTo es NAME_WHOLE_GROUP_UP_TO (raceRadio.ts l. 611)', () => {
    expect(BROADCAST.nameWholeGroupUpTo).toBe(NAME_WHOLE_GROUP_UP_TO)
  })
  it('chaseRefOf es chaseReferenceIndex (group.ts l. 235-245) en 10.000 carreteras generadas', () => {
    const rng = seededRng('broadcastConstants:chaseRefOf')
    for (let i = 0; i < 10_000; i++) {
      const behind = Array.from({ length: Math.floor(rng() * 21) }, () => ({ size: 1 + Math.floor(rng() * 176), racing: rng() < 0.5 }))
      expect(chaseRefOf(behind, BROADCAST.chaseMinShare), JSON.stringify(behind)).toBe(chaseReferenceIndex(behind, BROADCAST.chaseMinShare))
    }
  })
  it('PULLERS_KEPT es STORED_PULLERS_MAX (raceRadio.ts l. 591) hasta el 4b, que la importa y borra este caso', () => {
    expect(PULLERS_KEPT).toBe(12)
  })
  it('photoBlocksOf da los bloques de las fotos de km del motor en todas las etapas del calendario', () => {
    for (const race of SEASON_CALENDAR) for (const stage of race.stages) {
      const lengthKm = stageLengthKm(stage.profile)
      const n = sampleProfile(stage.profile).length
      // simulate.ts l. 1946-1948; probeAt es un Map: dos km en el mismo bloque dan una sola foto
      const delMotor = [...new Set(radioKmPoints(lengthKm).map((km) => Math.max(0, Math.min(n-1, Math.round((km / STAGE.dx)-0.5)))))]
      expect(photoBlocksOf(lengthKm, STAGE.dx), `${race.id} e${stage.index}`).toEqual(delMotor)
    }
  })
  it('las carreras de cabecera existen en el calendario', () => {
    for (const id of SPOILER.headlineRaces) expect(SEASON_CALENDAR.some((r) => r.id === id), id).toBe(true)
  })
})
```

La expresión de `simulate.ts` l. 1946-1948 se repite en el test porque `probeAt` es local de `simulateStage`; si el motor la cambiara, lo detectaría I1, que compara la foto reducida con la del motor en esos mismos bloques en los bancos y en `selfCheckI1` al grabar (D-12). Recorrer las 1.418 etapas cuesta 224 ms (medido en `l2/bloquesCalendario.mjs`), y las 10.000 carreteras de `chaseRefOf`, 40 ms, con 0 diferencias entre la copia de §6.3 y la función del motor de hoy, 451 de ellas sin nadie detrás (medido en `corr-l2/chaseref.mjs` con el `dist` de HEAD).

Por la misma razón, porque un cambio en `packages/shared/src/broadcast/reduce.ts` o `codec.ts` no dispara los bancos aunque cambie lo que el grabador escribe, I1 e I3 corren también en la suite rápida, sobre fotos sintéticas y una etapa congelada en `apps/api/src/__fixtures__/`; el test y su fixture los escribe §16.2.

### 15.6 Cuáles son iniciales y quién las acepta

Cambiar una constante de `shared` es un PR normal, sin bancos (`typecheck` y `test:rapido`, unos 10 min con las medidas del mapa 07 §4): por eso las que no tienen medida se aceptan con el banco o la prueba que las mide, y se ajustan sin tocar el motor.

| Constantes | Estado | Quién las acepta | Paso | Si no pasa |
| --- | --- | --- | --- | --- |
| `pace`, `summaryPace` | M (7:39-19:59; 2:12-6:37) | B17 y la prueba de lectura (PL) | 0 y 10 | se cambia el valor y se vuelve a medir |
| `ttPace`, `ttLastKmX` | M (5:20-11:23) | B17 | 0 y 10 | ídem |
| `nominalKmh` | M aquí (p90 55 s) | B17: `estimateS` contra la duración medida | 0 y 10 | ídem; nunca con datos de la carrera |
| `digestBudgetS` | E (34,5-39,5 min por gran vuelta) | B17 con el digest como una curva más | 10 | ídem; el botón dice siempre el número calculado (8-b) |
| `cueHoldS`, `cueQueueMax`, `crashNamesDelayS`, `breakRoundEveryS`, `gapsTableEveryRealS`, `previewCardS`, `finishFreezeS`, `controlsHideS` | S/E | PL | 10 | se ajustan antes de `BROADCAST_WATCH=on` |
| `estimatedClockMaxErrKm` | S/E (D-07) | B22 | 6 | las etapas sin línea abren solo en `Report` (pantalla) |
| `horizonBudgetMs`, `horizonMemoS`, `horizonMemoEntries` | M (C12), E y S/E (10-m) | B14; el tope, B12 (`TtlMemo.size`, §10.7) | 7 | `SPOILER_MODE=off` sin desplegar (D-53) |
| `progressEveryRealS`, `progressMinDeltaS` | S/E (D-55, 10-l) | B14, que mide `recordProgress` aparte (16-k) | 7 | se sube `PROGRESS_MIN_DELTA_S` en Railway, sin desplegar (§15.8, 15-j); el valor de la constante, en el PR siguiente |
| `overlayHz`, `barHz`, `mobileGroupRows` | S/E (D-56) | la medida a mano del móvil (§18.5) | 10 | se baja `barHz` y se simplifica el perfil antes de encender |
| `liveClusters` | apagada | B19 con racimos | 2 | sigue apagada (DD-18) |
| topes de `TIMELINE` (en el motor: cambiarlos paga los bancos) | sobre lo medido | B6 | 5 | se mira qué creció antes de subir el tope (decisión 15-g) |
| `expiryGameDays`, `headlineRaces` | M (coste, producto) | el dueño (DD-01) | 10 | se quedan los valores de §15.4 |
| `decodedCacheEntries` | M (16: de 8 a 30 MB; con 64, de 33 a 121) | la memoria de la API (§18.2) | 6 | se baja más o se topa por bytes |
| `cardRowsMax`, `closingCardS`, `previewThreatsMax`, `recapMaxCues`, `ttSeekStepS`, `ttSeekLastStarters` | S/E | PL | 10 | se ajustan antes de `BROADCAST_WATCH=on` |
| `maxHeadGzipBytes`, `maxChunkGzipBytes`, `maxFinishGzipBytes`, `maxVeiledStageGzipBytes` | S/E (16-h), con holgura sobre lo medido | B6 | 6 y 7 | se sube el tope con la cifra en el PR |
| `maxKnownStageGzipBytes` | M (22,2-100,1 KB), el máximo más un 10 % | B6, sobre la etapa corrida de `routes/broadcast.test.ts` y a mano en las 24 × 2 en el paso 6 | 6 | ídem |

### 15.7 Las constantes que E2 lee y no toca

| Constante | Fichero y línea | Valor | Para qué la lee E2 |
| --- | --- | --- | --- |
| `ENGINE_VERSION` | `packages/engine/src/constants.ts` l. 838 | 89 | se graba en `engineVersion`; no sube (D-09) |
| `STAGE.dx` | `constants.ts` l. 2290 | 0,1 km | el bloque, la unidad de `Block` (§4.1), `photoBlocksOf` |
| `STAGE.gapChaseMainFraction` | l. 2657 | 0,5 | copiada en `chaseMinShare` (§15.5) |
| `STAGE.tacticBreakGapSeconds` | l. 4272 | 45 s | fecha la fuga: el motor emite `breakaway_formed` cuando el hueco al grupo de origen pasa de 45 s y E2 lee ese `bEmit` (§4.7) |
| `STAGE.sprintPoints`, `finishPoints`, `climbPoints`, `timeBonuses` | l. 5032, 5035, 5036, 6285 | puntos y bonificaciones | los maillots en juego de la previa: quién puede quitarlo hoy (D-22) |
| `STAGE.ttStartIntervalGcS`, `ttStartIntervalBibS`, `ttSplitChecks`, `ttSplitMinKm` | l. 6168, 6172, 6177, 6179 | 120 s, 60 s, 2, 2 km | `TimeTrialTrace.intervalS` y `checksKm` (§4.2, §9) |
| `STAGE.radioMaxKmh` | l. 2518 | 75 km/h | techo de la velocidad de la capa de detalle (`GroupDetail.speedKmh`) |
| `radioKmPoints` | `packages/engine/src/sim/raceRadio.ts` l. 230-237 | cada km y `L − dx` | los km de la capa de detalle y de I1; copiada en `photoBlocksOf` |
| `PELOTON_MIN_SHARE` | l. 91 | 2/3 | copiada en `bunchMinShare` |
| `STORED_PULLERS_MAX`, `TURNO_KM` | l. 591, 597 | 12, 3 km | la capa de detalle guarda los relevistas que ellas deciden (`GroupDetail.pullers`); `STORED_PULLERS_MAX` la copia `PULLERS_KEPT` en la API del 3a al 4b, atada por test (§15.5, 15-k), y `TURNO_KM` no se copia |
| `NAME_WHOLE_GROUP_UP_TO` | l. 611 | 12 | copiada en `nameWholeGroupUpTo`; el PR 4a le añade `export` y nada más (15-c) |
| `NATIONALS_ROAD_DAY`, `NATIONALS_ROAD_OVERRIDE` | `packages/engine/src/routes/calendar.ts` l. 204, 211-234 | `doy(6, 28)`, día 179; 22 países con excepción, 17 de ellos antes (§7.4) | desde cuándo hay campeones en un mundo reiniciado (D-25, §7.4) |
| `SEASON_CALENDAR` | `packages/engine/src/index.ts` l. 96 | el calendario | los ids de `headlineRaces` (§15.5) |
| `JERSEY_PRIORITY` | `packages/shared/src/jerseys.ts` l. 22 | `gc`, `points`, `kom` | el orden de los maillots de líder y del grupo del maillot (D-18, D-24) |
| `DAYS_PER_SEASON` | `packages/shared/src/time.ts` l. 8 | 364 | la vigencia por defecto de un título (`ChampionTitle.validToDay`, §4.8) |

### 15.8 Los interruptores no son constantes

`BROADCAST_WATCH` y `SPOILER_MODE` (`off`, `admins`, `on`), `TIMELINE_RECORD` (`off`, `on`) y `AUTO_TICK` (`off`, `on`; `on` por defecto, como hoy: `index.ts` solo arranca `autoTick`, l. 56-85, con `on`, y Railway lo pone a `off` en `web` cuando existe el servicio `tick`, 18-k) viven en `apps/api/src/env.ts` (`envSchema` l. 20, `tickEnvSchema` l. 65) y se cambian en Railway sin desplegar (§14.6, D-53); los dos primeros viajan a la web en `/health.features`. Una constante cambia con un PR que pasa el CI; un interruptor, con una variable de entorno, en caliente. La regla para elegir: es interruptor lo que hay que poder apagar en minutos ante un fallo en producción (una pantalla rota, un destripe, un tick que se resiente) y constante todo lo demás. Por eso `BROADCAST.liveClusters` es constante: encenderlo exige B19 en verde con racimos (DD-18), un banco y no una decisión de operación.

Una variable de entorno más no apaga nada, pero se cambia igual: `PROGRESS_MIN_DELTA_S`, en el `envSchema` del servicio `web` (§14.6), un entero de segundos de carrera, opcional, que se lee al arrancar como `TICK_INTERVAL_MINUTES` (`apps/api/src/env.ts` l. 32). Si está, sustituye a `BROADCAST.progressMinDeltaS` en el umbral de escritura del progreso (§10.3, D-55); si no, manda la constante (decisión 15-j). Existe porque la carga de escritura del progreso es lo único de E2 que puede pesar en producción sin un freno propio: `SPOILER_MODE=off` deja funcionando las escrituras de `/api/me/*` a propósito (§10.13), `TIMELINE_RECORD` es del tick y `BROADCAST_WATCH=off` apaga la retransmisión entera, y la regla 9 de §17.1 pide que todo se apague sin desplegar (D-53). Con la curva de §8.2, un informe de 15 s de pared hace crecer lo alcanzado 900 s de carrera a ×60 y 450 a ×30, así que para escribir menos en esas zonas el valor tiene que pasar de esas cifras, y lo que se paga es que lo guardado pueda quedar hasta ese tanto por detrás de lo visto (cuenta, no medida).

---

**Injertos aplicados.** I-48 (§15.1: `BROADCAST` y `SPOILER` en `packages/shared`, `TIMELINE` en el motor; §15.3 y §15.4, los bloques).

**Objeciones resueltas.** O-19 (§15.1: nada de `BROADCAST` en el motor; 15-b impide que vuelva por importación).

**Huecos rellenados.** Ninguno (§B no asigna ninguno). Contradicción de hecho que queda resuelta: X-22 (§15.1).

**Decisión tomada aquí.**
- 15-a. El test de las copias es `apps/api/src/broadcastConstants.test.ts`, en la suite rápida, y ata cinco copias (`bunchMinShare`, `chaseMinShare`, `nameWholeGroupUpTo`, `photoBlocksOf` en las 1.418 etapas y `chaseRefOf` contra `chaseReferenceIndex` en 10.000 carreteras generadas), `PULLERS_KEPT` hasta el 4b (15-k) y los ids de `headlineRaces`. Descartado: `packages/engine/src/sim/` (fuera de `test:rapido` y de la matriz) y `packages/shared` (no importa el motor).
- 15-b. Ni el motor ni el lado del grabador de `shared` leen `BROADCAST` ni `SPOILER`. En `eslint.config.js`, el bloque del motor (l. 80-137) gana en los `paths` de `@typescript-eslint/no-restricted-imports` la entrada `{ name: '@cyclingstar/shared', importNames: ['BROADCAST', 'SPOILER'], message }`, y un bloque nuevo para `packages/shared/src/broadcast/{timeline,codec,reduce,reveal}.ts` prohíbe importar `./constants.js` y `./index.js`. Así, que tocarlas no corra los bancos es cierto por construcción. Descartado: confiarlo a la revisión.
- 15-c. `NAME_WHOLE_GROUP_UP_TO` se exporta en el PR 4a y se ata. Descartado: la copia sin atar que fijó la síntesis.
- 15-d. `packages/engine/src/sim/timeline.test.ts` entra en el tramo `mundo y radio` de `ci.yml` (l. 166-175) en el PR 4b. Descartado: dejarlo solo en el nocturno, que es lo que pasaría sin tocar la matriz.
- 15-e. Once constantes nuevas con el valor que ya daban sus decisiones (`mainGapTopStart` 3 de D-17; `seekStepKm` 5, `seekFinalKm` 20 y `skippedMinClass` 2 de D-20; `cueTopStart` 5 de D-21; `previewCardS` 5, `previewGcTop` 3 y `previewAttrTop` 3 de D-22; `gcThreatTop` 10 de D-26; `chunkCacheMaxAgeS` 3600 de D-35) y `nominalKmh`, medida aquí para las velocidades nominales de D-19. Descartado: literales en el código de cada sección.
- 15-f. Las tablas se tipan con `as const satisfies` (`PaceZone`, `Record<StageKind, number>`, `Record<CueClass, number>`): el compilador vigila que no falte un tipo de etapa ni una clase. Comprobado con TypeScript 5.9.3 en `l2/tipos/`, también en negativo.
- 15-g. Los topes de tamaño son umbrales de B6, no de escritura: una línea mayor se escribe y se apunta en `tick_log.notes`. Descartado: perder la etapa por su tamaño.
- 15-h. Un cambio de valor de los tres bloques se anota en `docs/balance.md` con su medida, sin subir `ENGINE_VERSION`. Descartado: anotar solo las del motor.
- 15-i. `TIMELINE.ttMaxStoredBytes` pasa de 32 a 48 KB (49.152 bytes): la e10 de `race-italy`, 42 km con 176 corredores, ocupa 31.436 y 31.178 bytes con el prototipo del grabador (`l3/grabador.mjs`, semillas 0 y 1) y 32.203 con `checkClockDs` (`rcod/n/grab2.mjs`), el 98 % del tope anterior, y B6 no lo veía porque ninguna de sus 24 etapas pasa de 26 km. Descartado: guardar `kmClockDs` por diferencias por km, que baja la e10 a 15.614 bytes (`l5c/deltas.mjs`, §9.2) pero cambia el formato 1 y su decodificador para ahorrar de 6.032 a 16.589 bytes por crono (las cuatro medidas de §9.2, con `checkClockDs`), menos de 1,3 MB en las 77 cronos por temporada fuera de los nacionales (cota: 77 veces los 16.589 bytes de la más larga). La traza sola por diferencias ocupa de 3.152 a 6.402 bytes en esas cuatro, y la línea entera de 13.853 a 19.037: los «unos 5 KB en 40 km» de `estado.md` §9 eran de la traza sola.
- 15-j. `PROGRESS_MIN_DELTA_S`, variable de entorno opcional del servicio `web`, sustituye a `BROADCAST.progressMinDeltaS` sin desplegar. Descartado: nombrar en la regla 9 de §17.1 una excepción, la escritura del progreso, que solo se frenaría apagando `Watch`.
- 15-k. `PULLERS_KEPT` se exporta y se ata a 12 desde el 3a; en el 4b la API importa `STORED_PULLERS_MAX`, que el motor exporta ese mismo PR (§5.4), y la copia muere. Descartado: la copia sin atar, que dejaría a la radio servida cortando a 12 lo que el motor guarde con otro tope.
- 15-l. (Coherencia, fase 6; cruzada de L3, Rcoste-008.) `TIMELINE.medianJsonBytes` pasa de 256 KB a 320 KB (327.680 bytes), 1,44 veces la mediana medida (227.516 B), el mismo margen que `maxStoredBytes`: con un 15 % bastaba que la táctica hiciera las carreras un poco más movidas para poner en rojo el B6 del JSON, cuando una misma etapa cambia un 20 % solo con la semilla (`race-france` e18, 269,0 y 216,7 KB, §5.7). Con 16-n (en el tramo del PR el JSON solo se imprime) es la salida que eligió §16.4. Descartado: sacar los topes de `TIMELINE` a `packages/shared`, que no quita el rojo (16-n).

**Propuesto para el glosario.**
- En `BROADCAST` (`packages/shared/src/broadcast/constants.ts`): `nominalKmh` (km/h por banda de pendiente para `playbackEstimateS`), `skippedMinClass` (clase mínima de `While you skipped`, pantalla), `seekStepKm` y `seekFinalKm` (los saltos de recorrido), `cueTopStart` (puesto de salida de las caídas de clase 3), `previewCardS`, `previewGcTop` y `previewAttrTop` (la previa), `mainGapTopStart` (la referencia de la diferencia principal), `gcThreatTop` (nivel 5 de notoriedad) y `chunkCacheMaxAgeS` (la caché de un tramo).
- El fichero `apps/api/src/broadcastConstants.test.ts` (las copias atadas).
- (corrección L2, fundido ya en el glosario) `PROGRESS_MIN_DELTA_S` (§15.8, 15-j); `TIMELINE.ttMaxStoredBytes` en 49_152 (15-i); `chaseRefOf` exportada y `PULLERS_KEPT` atada (15-k); `SPOILER.horizonMemoEntries` (500), que usa la corrección de §10 (10-m).

**Dudas para el ensamblador.**
- D-39 dice «21 etapas son unos 30 min» y §G.11 fija `Watch the race in 30 minutes` (pantalla), pero con `digestBudgetS` una gran vuelta suma 34,5, 36,5 y 39,5 min (`l2/digest.mjs`). O el texto se calcula con la suma de las etapas veladas (§8.8, §11.4) o cambian los presupuestos; aquí se escriben los de §G.7.
- D-26 dice que las victorias con `game_day ≤` día de la etapa − `expiryGameDays` no las puede ocultar ningún velo «por construcción». Es cierto para `kind = 'gc'`, pero no para una victoria de etapa en una vuelta: el velo se levanta 56 días después de la ÚLTIMA etapa, así que una etapa ganada el día w de una vuelta que acaba en w + 20 sigue velada hasta w + 76 y ya cuenta desde w + 56. La cuenta segura es la de las carreras cuya última etapa es ≤ día − `expiryGameDays`; lo decide §7.5 y cambiaría el comentario de `knownWins` en §4.2.
- §G.7 no tenía las once constantes de 15-e; §6, §7, §8, §10 y §14 deben usarlas por su nombre, y si otra sección necesita un número que no está aquí, se añade a §15 en vez de escribirlo como literal.
- `nominalKmh` se midió solo en etapas en línea; la estimación de una crono necesita además la salida del último y su tiempo (§9.4).
- 15-d y 15-b tocan `ci.yml` y `eslint.config.js`: §16.7 y el PR 4b de §17 deben decirlo.
