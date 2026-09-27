# Glosario canónico de `docs/retransmision.md` (E2 · La retransmisión)

Este fichero es el vocabulario ÚNICO del documento final. Diez redactores escriben en paralelo y la única forma de que no inventen diez nombres para la misma cosa es que todos usen estos, tal cual, con su mayúscula y su forma. Reglas:

1. Todo lo que un redactor nombre (tipo, campo, función, fichero, tabla, columna, índice, migración, ruta, constante, interruptor, banco, paso del plan, texto de pantalla) está aquí. Si una propuesta usa otro nombre, se traduce con la tabla de alias de §G.13 y el alias no aparece en el documento final salvo en el apéndice A.
2. Si un redactor necesita un nombre que no está, lo escribe al final de su sección en un bloque «Propuesto para el glosario» (nombre, una línea de definición, fichero) y el ensamblador lo funde. No renombra nada de lo que ya está.
3. Los identificadores de código van en inglés (la casa mezcla, pero el motor de la radio, `raceRadio.ts`, y cuatro de las cinco propuestas los escriben en inglés); los códigos que ya existen en castellano en el motor se conservan tal cual (`caida`, `pinchazo`, `averia`, `fuga`, `contra`, `peloton`, `tierra`, `grupeto`, `plantilla`, `datos`, `protagonistas`, `llana`, `media`, `reina`, `cri`, `clasica`). La prosa, en castellano. La pantalla, en inglés y marcada «(pantalla)».
4. Los tipos canónicos de §G.3 fijan NOMBRES y FORMA de los campos. El redactor de §4 los escribe enteros con comentarios; ningún otro redactor añade, quita ni renombra campos: si le falta uno, lo propone.
5. Las decisiones que dan contenido a estos nombres están cerradas en `00-decisiones.md` (identificadores `D-nn`); los redactores no las reabren.

Base del documento: `propuestas/ingeniero.md` (suma de puntuaciones, 92,5 puntos; ver `juicios/veredicto.json`), fundida con el modelo de estado de `estado.md`, la propiedad sin destripe de `producto.md`, la codificación y las noticias de `datos.md` y la gramática de televisión de `television.md`.

---

## G.1 Palabras de la prosa (castellano)

| Término | Qué es, en una línea |
| --- | --- |
| la retransmisión | lo que el jugador ve en la pestaña `Watch`: el estado de la carrera a una hora de carrera, con sucesos encima, a un ritmo |
| el estado | la situación de la carrera (grupos, quién va en cada uno, relojes, huecos, pelotón) reconstruida de la línea temporal |
| la foto | el estado espacial canónico en un bloque `b`: todos los grupos al cruzar ese punto (`Photo`); la «foto de un km» del dueño es la foto de un bloque de `radioKmPoints` |
| el instante | el estado a una hora de carrera `T`, lo que pinta la tele: cada grupo donde está AHORA (`Instant`) |
| el corte diagonal | la regla que calcula el instante: cada grupo en el bloque donde su reloj vale `T`, con la composición de la foto de ese bloque |
| la línea temporal | lo que se graba de una etapa al correrla: catálogo de grupos, fotos clave, sucesos de estado, marcas de reloj, sucesos narrables fechados, capa de detalle, reparto congelado, pancartas, tiempo, crono y meta (`StageTimeline`) |
| la foto clave | la pertenencia completa cada `TIMELINE.keyPhotoKm` km (`KeyPhoto`): suma de control y acceso aleatorio en el servidor, nunca unidad de entrega |
| el suceso de estado | lo único que cambia la foto de un bloque al siguiente (`StateEvent`: `move`, `out`, `main`, `mishap`, `clock`) |
| el suceso narrable | un suceso del motor (`RaceEvent`) guardado con el bloque en que se emitió y la hora a la que se enseña (`TimelineEvent`) |
| la marca de reloj | el reloj exacto de un grupo en un bloque, grabado en cuatro sitios (§D-01); entre marcas, el reloj se interpola |
| la capa de detalle | lo que hoy guarda la radio por grupo y km: velocidad, quién tira, motivo, destinatario, percance (`GroupDetail`) |
| el reductor | la función pura que aplica un suceso de estado a una foto (`reducePhoto`) |
| en tránsito | el corredor que en el instante aparece en dos grupos o en ninguno, porque cambió de grupo en el tramo de carretera que los separa (`InTransit`) |
| el grabador | el módulo puro del motor que recibe las fotos de cada bloque y escribe la línea temporal (`timelineRecorder`) |
| la sonda | `StageProbe`, la observación sellada del motor (`types.ts` l. 487-504) |
| el colector aparte | la envoltura de la sonda en `stageRun.ts` que da a la radio y al aprendizaje SOLO las fotos de `radioKmPoints` y al grabador todas (§D-08) |
| el reparto congelado | el catálogo de corredores de la etapa con su equipo del día, maillot llevado, distinciones y general de salida, cada dato con su procedencia (`TimelineCast`) |
| la procedencia | la etapa de la que sale un dato del reparto (`StageRef`, campo `from`); si esa etapa está velada, el dato no viaja |
| la visibilidad | la hora de carrera a partir de la cual un dato se puede enseñar (`visibilityOf`); el servidor solo sirve lo que tiene visibilidad ≤ lo alcanzado más la precarga |
| el tramo | lo que el servidor manda de una vez: los datos con visibilidad en `(fromDs, toDs]` (`BroadcastChunk`) |
| el paquete de meta | llegadas, resultado, acta y clasificaciones de después; nunca va en un tramo, solo en `BroadcastFinish` |
| lo alcanzado | la hora de carrera hasta la que el jugador ha reproducido (la informa el cliente, `race_watch.reached_s`); convierte una etapa en vista |
| lo servido | la hora de carrera hasta la que el servidor ha entregado tramos; nunca pasa de lo alcanzado más `BROADCAST.prefetchRaceS` y NO cuenta como visto |
| el horizonte | lo que un espectador conoce de cada carrera en guardia, calculado en el servidor en cada petición (`Horizon`) |
| el velo | las etapas corridas que el horizonte oculta ahora mismo a ese espectador (`Horizon.veil`) |
| en guardia | una carrera cuyas etapas se protegen para ese espectador (propia, de su equipo, seguida o de cabecera, §D-30) |
| el alcance del velo | qué carreras están en guardia por defecto (`users.spoiler_scope`) |
| la caducidad | cuándo el velo de una carrera se levanta solo (`SPOILER.expiryGameDays` tras su última etapa) |
| etapa conocida | etapa vista (`W` directo, `S` resumen), revelada (`R`), arrastrada (`A`) o caducada (`X`); lo conocido de una carrera es siempre un prefijo 1..k |
| revelar | el acto explícito de conocer el resultado sin ver la etapa; no premia ni castiga |
| el arrastre | conocer la etapa N porque el jugador aceptó ver o revelar una posterior (letra `A`) |
| la puerta | la pantalla que sale en lugar de un resultado velado (`StageGate`) |
| el mecanismo | cómo aplica el servidor el velo a una superficie: P prefijo, R resta, F filtro, M máscara, G puerta, B tramos, N neutro por construcción, L libre con motivo (§D-32) |
| la voz | las líneas de comentario en vivo, la crónica causal truncada a la hora `T` (`LiveLine`) |
| el acta | la crónica entera con perspectiva, el podio, el resultado y las clasificaciones de después; en pantalla, `Report` |
| el rótulo | con qué presenta la tele a un corredor: dorsal, nombre, bandera, equipo, maillot llevado y hasta tres líneas (`RiderCard`) |
| el maillot llevado | el ÚNICO maillot que se ve (`WornJersey`) |
| las distinciones | lo que el rótulo dice además (`Distinction`) |
| la notoriedad | el orden de la frase del comentarista, sin `fame` (`NotorietyLevel`, §D-26) |
| la cola de rótulos | la cola de `Cue` que decide qué rótulo o tarjeta se ve, uno de corredor a la vez |
| la clase de rótulo | la importancia de un `Cue`, de 0 a 3 (`CueClass`) |
| la capa fija | km a meta y diferencia principal con su tendencia, siempre en pantalla |
| la barra de grupos | una fila por grupo en orden de carretera con número, nombre, tamaño, hueco y maillots dentro |
| el perfil con cursores | la altimetría con una marca por grupo en su km del instante y el puerto que viene |
| la previa | los cuatro cuadros que abren la emisión (`StagePreview`) |
| el cierre | los cuadros que la cierran tras la meta (`StageClosing`) |
| la curva de ritmo | segundos de carrera por segundo de pared según la zona de km a meta de la cabeza (`BROADCAST.pace`) |
| el resumen | la misma retransmisión a `BROADCAST.summaryPace` (`Highlights`); cuenta como vista (letra `S`) |
| el digest | cada etapa de una carrera en un presupuesto fijo de segundos por tipo (`BROADCAST.digestBudgetS`), para quien vuelve |
| el microscopio | la pestaña `Race Radio`, instrumento del dueño para cazar defectos |
| el modo diagnóstico | la vista del administrador que no aplica el velo ni cuenta como visto (`?diag=1`, §D-40) |
| el adaptador de la radio | la línea temporal degradada que la API construye desde `stage_snapshots.radio` para las etapas sin línea grabada, con reloj estimado |
| la prueba de lectura | el protocolo humano de aceptación (PL): un tercero entiende qué pasó sin ayuda (MVP paso 31) |

---

## G.2 Ficheros nuevos y tocados

| Ruta | Qué contiene | Estado |
| --- | --- | --- |
| `packages/engine/src/stage/types.ts` | `StageProbe` gana tres métodos opcionales: `onEvent`, `onBanner`, `onTimeTrialRide` | tocado |
| `packages/engine/src/stage/events.ts` | `EventLog` gana un oyente opcional (`listen`) que ve cada `emit` con su bloque | tocado |
| `packages/engine/src/stage/simulate.ts` | cablea `onEvent`, llama a `onBanner` en `disputeBanner` (l. 9175) y `disputeClimb` (l. 9231) y pasa la sonda a `simulateTimeTrial` (hoy la ignora, l. 1264) | tocado |
| `packages/engine/src/stage/timetrial.ts` | llama a `onTimeTrialRide` al cerrar cada corredor | tocado |
| `packages/engine/src/sim/timeline.ts` | `timelineRecorder`, `selfCheckI1` (el grabador puro) | nuevo |
| `packages/engine/src/constants.ts` | bloque `TIMELINE` | tocado |
| `packages/engine/src/world/news.ts` | se retiran `renderNews` y `NewsData` (paso 4a); quedan los códigos | reducido |
| `packages/shared/src/broadcast/timeline.ts` | los tipos de la línea temporal (§G.3.1) | nuevo |
| `packages/shared/src/broadcast/codec.ts` | `encodeTimeline`, `decodeTimeline` (un decodificador por `format`) | nuevo |
| `packages/shared/src/broadcast/reduce.ts` | `reducePhoto`, `photoAt` | nuevo |
| `packages/shared/src/broadcast/instant.ts` | `instantAt`, `groupRoleOf`, `mainGapOf` | nuevo |
| `packages/shared/src/broadcast/cut.ts` | `visibilityOf`, `cutTimeline`, `chunkOf` | nuevo |
| `packages/shared/src/broadcast/reveal.ts` | `REVEAL_RULES`, `revealSOf` | nuevo |
| `packages/shared/src/broadcast/cues.ts` | `Cue`, `CUE_CLASS`, `CUE_OF_TEMPLATE`, `cuesBetween` | nuevo |
| `packages/shared/src/broadcast/pace.ts` | `paceAt`, `playbackEstimateS`, `digestPace`, `ttPaceAt` | nuevo |
| `packages/shared/src/broadcast/timeTrial.ts` | `timeTrialInstantAt` | nuevo |
| `packages/shared/src/broadcast/radio.ts` | `radioFromTimeline` (contrato `RaceRadio` de hoy) | nuevo |
| `packages/shared/src/broadcast/names.ts` | `GROUP_WORDS`, `groupLabelText`, `breakHeadline`, `namedRidersOf` | nuevo |
| `packages/shared/src/broadcast/wire.ts` | esquemas Zod `broadcastHeadSchema`, `broadcastChunkSchema`, `broadcastFinishSchema`, `horizonSummarySchema` | nuevo |
| `packages/shared/src/broadcast/constants.ts` | `BROADCAST`, `SPOILER` | nuevo |
| `packages/shared/src/broadcast/pageTitle.ts` | `PreStageInfo`, `pageTitle`, `stageReadyNotice` | nuevo |
| `packages/shared/src/jerseys.ts` | gana `ChampionTitle`, `WornJersey`, `Distinction`, `WornInput`, `wornJerseys`, `distinctions`, `notorietyOf`; `JerseyKind` sigue con tres valores | tocado |
| `packages/shared/src/news.ts` | `NewsPayload`, `newsPayloadSchema`, `renderNews`, `NEWS_VARIANTS` | nuevo |
| `packages/shared/src/render/variants.ts` | `Variant`, `pickVariant`, `TEMPLATE_REV` | nuevo |
| `packages/shared/src/contracts.ts` | `newsItemSchema` gana campos `.nullish()`; `stageReplaySchema` gana `watch`; `healthSchema` gana `features`; reexporta `broadcast/wire.ts` | tocado |
| `packages/db/src/schema.ts` | `stageTimelines`, `raceWatch`, `spoilerScopeEnum` y las columnas de §G.5 | tocado |
| `packages/db/src/timelines.ts` | `writeStageTimeline`, `readStageTimeline` | nuevo |
| `packages/db/src/cast.ts` | `buildTimelineCast` (el reparto congelado con procedencia) | nuevo |
| `packages/db/src/titles.ts` | `ChampionTitleSource`, `palmaresTitleSource` | nuevo |
| `packages/db/src/horizon.ts` | `Horizon`, `computeHorizon`, `veilDelta`, `veilSql`, `throughStage`, `isVeiled`, `worldHorizon` | nuevo |
| `packages/db/src/watch.ts` | `recordProgress`, `revealStage`, `setFollow`, `setSpoilerScope` | nuevo |
| `packages/db/src/stageRun.ts` | la envoltura de la sonda con el colector aparte; escribe `stage_timelines` en la misma transacción | tocado |
| `packages/db/src/news.ts` | `emitNews` guarda `seed`, `data`, `race_key`, `stage_day`, `tpl_rev` (y `text` hasta el reinicio) | tocado |
| `apps/api/src/spoiler.ts` | `SpoilerPolicy`, `SurfaceMechanism`, `RouteRegistry`, `registerSpoilerGuard` | nuevo |
| `apps/api/src/viewerCookie.ts` | `signViewerCookie`, `readViewerCookie` (`cs_viewer`) | nuevo |
| `apps/api/src/broadcastSource.ts` | `timelineForStage` (línea grabada o adaptador de la radio) | nuevo |
| `apps/api/src/routes/broadcast.ts` | cabecera, tramos, meta y acta | nuevo |
| `apps/api/src/routes/me.ts` | `/api/me/watch`, `/reveal`, `/follow`, `/spoiler-scope`, `/horizon` | nuevo |
| `apps/api/src/chronicle.ts` | `BuildChronicleOptions.live` | tocado |
| `apps/api/src/emails.ts` | `stageReadyEmail` | tocado |
| `apps/api/src/env.ts` | `BROADCAST_WATCH`, `SPOILER_MODE` (web) y `TIMELINE_RECORD` (web y tick) | tocado |
| `apps/api/src/app.ts` | `@fastify/compress`; el fallback de la SPA inyecta título y `og:` neutros | tocado |
| `apps/web/src/pages/StageWatch.tsx` | la pantalla `Watch` | nuevo |
| `apps/web/src/components/broadcast/` | `FixedOverlay`, `GroupBar`, `ProfileStrip`, `CueCard`, `VoiceTicker`, `PlayerControls`, `StagePreviewCards`, `StageClosingCards`, `StageGateCard` | nuevos |
| `apps/web/src/domain/broadcast/player.ts` | reloj de reproducción, cola de rótulos, `Next action`, progreso | nuevo |
| `apps/web/src/domain/pageTitle.ts` | `usePageTitle` (único escritor de `document.title`) | nuevo |
| `apps/web/src/domain/stageJournal.ts` | gana los `case` de `puncture`, `mechanical`, `truce_granted`, `truce_denied` | tocado |
| `apps/web/src/queryClient.ts` | `rev` del horizonte en las claves; `clear()` al entrar y salir de la cuenta | tocado |

---

## G.3 Tipos canónicos

Los bloques siguientes fijan nombre y forma. `readonly` en todo lo guardado y servido. Los esquemas Zod de la red se escriben en `broadcast/wire.ts` y los tipos se infieren de ellos (política de `contracts.ts` l. 1-14).

### G.3.1 La línea temporal (`packages/shared/src/broadcast/timeline.ts`)

```ts
export type Block = number     // bloque de 100 m del motor: km = (b + 0,5) · dx (simulate.ts l. 1929)
export type Ds = number        // décimas de segundo de carrera, entero; desde la salida real, en crono desde la primera salida
export type RaceS = number     // segundos de carrera, coma flotante, en memoria
export type RiderIx = number   // posición en `stage_snapshots.input.riders` (el orden congelado)
export type GroupIx = number   // posición en `StageTimeline.groups`, por orden de aparición en la etapa

export type GroupOrigin = 'start' | 'attack' | 'shed'          // prefijo del id del motor (group.ts l. 164-193)
export interface GroupCatalogEntry {
  readonly id: string                // 'peloton', 'mov-3', 'shed-7': el del motor, tal cual
  readonly origin: GroupOrigin
  readonly bornB: Block
  readonly diedB: Block | null       // null si llega a meta
  readonly successor: GroupIx | null // adonde fue la mayoría de los suyos al morir
}

export type MishapKind = 'caida' | 'pinchazo' | 'averia'       // `Incident['tipo']` (types.ts l. 358-365)
export type StateEvent =                                        // orden dentro de un bloque: out, move, main, clock, mishap
  | { readonly t: 'move'; readonly b: Block; readonly to: GroupIx; readonly riders: readonly RiderIx[] }
  | { readonly t: 'out'; readonly b: Block; readonly rider: RiderIx }
  | { readonly t: 'main'; readonly b: Block; readonly group: GroupIx | null }
  | { readonly t: 'clock'; readonly b: Block; readonly marks: readonly (readonly [GroupIx, Ds])[] }
  | { readonly t: 'mishap'; readonly b: Block; readonly rider: RiderIx; readonly kind: MishapKind; readonly lostDs: Ds }

export interface KeyPhoto { readonly b: Block; readonly groupOf: Int16Array; readonly main: GroupIx | null }

export interface Puller { readonly rider: RiderIx; readonly motive: PullMotive | null; readonly forRider: RiderIx | null }
export interface GroupDetail {
  readonly g: GroupIx
  readonly speedKmh: number | null
  readonly pullingTotal: number
  readonly pullers: readonly Puller[]              // tope 12, como hoy (raceRadio.ts l. 591)
  readonly mishap: { readonly kind: MishapKind; readonly lostS: number } | null
}

export interface Photo {                           // LA FOTO: el estado espacial canónico en el bloque b
  readonly b: Block
  readonly groupOf: Int16Array                     // por RiderIx: su GroupIx, o −1 si ya no corre
  readonly main: GroupIx | null                    // el pelotón (título, con la regla de la radio por bloque)
  readonly clock: ReadonlyMap<GroupIx, Ds>         // reloj de cada grupo vivo al cruzar b
  readonly detail: readonly GroupDetail[] | null   // solo en los bloques de `radioKmPoints`
}

export interface TimelineEvent {                   // un suceso narrable, fechado cuando se SUPO
  readonly source: number                          // índice en `stage_snapshots.events`; −1 si es sintetizado (caída)
  readonly plantilla: string
  readonly km: number
  readonly tS: RaceS                               // fecha del HECHO, el reloj que puso el motor
  readonly bEmit: Block                            // bloque en que el motor lo emitió (sonda `onEvent`)
  readonly revealS: RaceS                          // cuándo se enseña (`REVEAL_RULES`)
  readonly riders: readonly RiderIx[]
  readonly datos: Readonly<Record<string, number | string>> | null
}

export interface BannerResult {                    // lo que da `onBanner`
  readonly kind: 'meta_volante' | 'cima'
  readonly km: number
  readonly cat: string | null                      // categoría de la cima tal como la da el motor
  readonly name: string | null                     // `STAGE_FEATURES` en etapas reales; null si no hay
  readonly revealS: RaceS                          // reloj del grupo del primero que puntúa
  readonly order: readonly { readonly rider: RiderIx; readonly points: number }[]
}

export interface StageRef { readonly raceKey: string; readonly stageDay: number }

export interface ProfileStrip {                    // lo que la cabecera sirve del recorrido: nunca sucesos
  readonly altM: readonly number[]                 // cota por km (`altitudesDelPerfil`, citas.ts l. 256-264)
  readonly climbs: readonly { readonly footKm: number; readonly topKm: number; readonly cat: string; readonly lenKm: number; readonly avgPct: number; readonly name: string | null }[]
  readonly sprintsKm: readonly number[]
  readonly laps: number
}

export interface StageWeather {                    // `stageWeather`, `weatherPlan`, `roadBearings` sobre la semilla (I-19)
  readonly tempC: number
  readonly rain: number
  readonly spans: readonly { readonly fromKm: number; readonly rain: number; readonly windDir: number; readonly windKmh: number; readonly crosswind: boolean }[]
}

export interface CastTeam { readonly teamId: string; readonly jerseySeed: string }   // el equipo y la semilla de ESE día
export interface CastRider {
  readonly rider: RiderIx
  readonly riderId: string
  readonly bib: number | null
  readonly team: number | null                     // índice en `TimelineCast.teams`: el equipo CON EL QUE CORRIÓ
  readonly country: string
  readonly gender: 'M' | 'F'
  readonly start: { readonly gcRank: number | null; readonly gcDeficitS: number | null; readonly from: StageRef | null }
  readonly worn: WornJersey
  readonly distinctions: readonly Distinction[]
  readonly knownWins: number                       // victorias en `palmares` fuera del alcance de cualquier velo (§D-26)
}
export interface TimelineCast { readonly riders: readonly CastRider[]; readonly teams: readonly CastTeam[] }

export interface TimeTrialTrace {                  // la crono (I-08); `onTimeTrialRide`
  readonly order: 'gc' | 'bib'
  readonly intervalS: number
  readonly checksKm: readonly number[]             // los de `ttSplitChecks` (constants.ts l. 6177-6179)
  readonly startDs: readonly Ds[]                  // por RiderIx
  readonly kmClockDs: readonly (readonly Ds[])[]   // por RiderIx: reloj propio en cada km entero y en meta, percance incluido
  readonly mishaps: readonly { readonly rider: RiderIx; readonly km: number; readonly kind: MishapKind; readonly lostDs: Ds }[]
}

export interface FinishRecord {                    // SOLO para el paquete de meta
  readonly finishS: RaceS                          // llegada del primero (crono: del último en salir)
  readonly arrivals: readonly (readonly [Ds, readonly RiderIx[]])[]   // grupos en meta por tiempo (UCI 2.3.040)
}

export interface StageTimeline {                   // decodificada, en memoria
  readonly format: 1
  readonly engineVersion: number
  readonly dx: number
  readonly blocks: number
  readonly lengthKm: number
  readonly timeTrial: boolean
  readonly clock: 'exact' | 'estimated'            // 'estimated' solo en el adaptador de la radio
  readonly riderIds: readonly string[]
  readonly groups: readonly GroupCatalogEntry[]
  readonly keys: readonly KeyPhoto[]
  readonly stateEvents: readonly StateEvent[]      // ordenados por b y por el orden del bloque
  readonly events: readonly TimelineEvent[]
  readonly detail: ReadonlyMap<Block, readonly GroupDetail[]>
  readonly banners: readonly BannerResult[]
  readonly profile: ProfileStrip
  readonly cast: TimelineCast
  readonly weather: StageWeather
  readonly tt: TimeTrialTrace | null
  readonly finish: FinishRecord
}

/** El formato guardado: JSON de listas planas de enteros y cadenas, gzip 9, en `stage_timelines.body`.
 *  Lo escribe entero el redactor de §4 con estas restricciones (§D-10): códigos como cadena, nunca como
 *  índice de un enum; relojes en Ds; km en décimas; pertenencia de las fotos clave en base64 de un byte
 *  por corredor (GroupIx + 1, 0 = fuera); `decodeTimeline(encodeTimeline(tl))` = `tl` (invariante I3). */
export interface StoredTimelineV1 {
  readonly format: 1
  readonly engineVersion: number
  readonly dx: number
  readonly blocks: number
  readonly lengthKm: number
  readonly timeTrial: boolean
  readonly riderIds: readonly string[]
  readonly groupIds: readonly string[]
  readonly groupMeta: readonly number[]      // cuartetos [origin 0|1|2, bornB, diedB o −1, successor o −1]
  readonly keys: readonly (readonly [Block, string])[]
  readonly moves: readonly number[]          // tríos [Δb, rider, to + 1]; to + 1 = 0 es `out`
  readonly main: readonly number[]           // pares [b, group + 1]
  readonly clocks: readonly number[]         // tríos [b, g, Ds]
  readonly mishaps: readonly (readonly [Block, RiderIx, MishapKind, Ds])[]
  readonly events: readonly (readonly [number, string, number, Ds, Block, Ds, readonly RiderIx[], Readonly<Record<string, number | string>> | null])[]
  readonly detail: readonly (readonly [Block, GroupIx, number, number, readonly (readonly [RiderIx, PullMotive | null, number])[], MishapKind | null, number])[]
  readonly banners: readonly (readonly [0 | 1, number, string | null, string | null, Ds, readonly number[]])[]
  readonly profile: ProfileStrip
  readonly cast: TimelineCast
  readonly weather: StageWeather
  readonly tt: TimeTrialTrace | null
  readonly finish: { readonly finishDs: Ds; readonly arrivals: readonly (readonly [Ds, readonly RiderIx[]])[] }
}
```

### G.3.2 El instante (`packages/shared/src/broadcast/instant.ts`)

```ts
export type GroupRole = 'lead' | 'chase' | 'bunch' | 'gruppetto'     // UN código para barra, radio y voz (§D-18)
export type GroupLabel =
  | { readonly k: 'role' }                                             // la palabra del papel
  | { readonly k: 'names'; readonly riders: readonly RiderIx[] }      // tres o menos: se nombra por ellos
  | { readonly k: 'jersey_group'; readonly jersey: JerseyKind }       // lleva un maillot y no es cabeza ni pelotón
  | { readonly k: 'together' }                                         // un solo grupo en carrera
export interface GapTrend { readonly deltaS: number; readonly windowKm: number; readonly arrow: 'up' | 'down' | 'flat' }
export interface GapReading {
  readonly toHeadS: number                 // hueco a la cabeza en el último km de foto que este grupo ha cruzado
  readonly toAheadS: number | null
  readonly atKm: number                    // dónde se midió
  readonly trend: GapTrend | null
}
export interface GroupNow {
  readonly g: GroupIx
  readonly number: number                  // 1 = el primero de la carretera en T; renumera, no es identidad
  readonly role: GroupRole
  readonly label: GroupLabel
  readonly kind: RadioGroupKind            // el `kind` del motor: fuga, contra, peloton, tierra, grupeto
  readonly km: number                      // dónde está en T (§D-04)
  readonly size: number
  readonly members: readonly RiderIx[]
  readonly gap: GapReading
  readonly detail: GroupDetail | null      // la del último km de foto cruzado
  readonly jerseys: readonly JerseyKind[]  // maillots de líder que viajan dentro
  readonly own: boolean                    // lleva un corredor del espectador
}
export interface InTransit { readonly rider: RiderIx; readonly from: GroupIx; readonly to: GroupIx }
export interface MainGap {
  readonly ahead: GroupIx
  readonly behind: GroupIx
  readonly gapS: number
  readonly trend: GapTrend | null
  readonly ref: 'bunch' | 'jersey_group' | 'second'   // contra quién se mide (§D-17)
}
export interface VirtualGcRow { readonly rider: RiderIx; readonly group: GroupIx; readonly startRank: number; readonly virtualS: number }
export interface Instant {
  readonly t: RaceS
  readonly headKm: number
  readonly toGoKm: number
  readonly lapsToGo: number | null
  readonly groups: readonly GroupNow[]            // orden de carretera
  readonly inTransit: readonly InTransit[]
  readonly mainGap: MainGap | null                // null: `Bunch together`
  readonly banners: readonly BannerResult[]       // solo los ya revelados
  readonly virtualGc: readonly VirtualGcRow[] | null
  readonly racing: number
  readonly gone: number
}

export interface TimeTrialInstant {
  readonly t: RaceS
  readonly onCourse: readonly { readonly rider: RiderIx; readonly km: number; readonly lastSplitKm: number | null; readonly deltaS: number | null }[]
  readonly hotSeat: { readonly rider: RiderIx; readonly timeS: number } | null
  readonly splits: readonly { readonly km: number; readonly board: readonly { readonly rider: RiderIx; readonly timeS: number }[] }[]
  readonly virtualGc: readonly VirtualGcRow[] | null
  readonly toStart: number
  readonly finished: number
}
```

### G.3.3 El rótulo y los maillots (`packages/shared/src/jerseys.ts`, ampliado)

```ts
// JerseyKind sigue siendo 'gc' | 'points' | 'kom' (l. 19) y JERSEY_PRIORITY ['gc', 'points', 'kom'] (l. 22).
export interface ChampionTitle {
  readonly scope: 'world' | 'continental' | 'national'
  readonly country: string | null          // ISO-2; null en el del mundo
  readonly discipline: 'road' | 'itt'
  readonly category: 'elite' | 'u23'
  readonly season: number
  readonly validFromDay: number            // día de juego absoluto del campeonato
  readonly validToDay: number              // el de la edición siguiente, o validFromDay + 364
  readonly source: StageRef                // la etapa que lo dio: si está velada, el título no viaja
  readonly provisional: boolean            // true mientras lo derive E2 de `palmares`
}
export type WornJersey =
  | { readonly kind: 'leader'; readonly jersey: JerseyKind; readonly delegated: boolean; readonly from: StageRef }
  | { readonly kind: 'champion'; readonly title: ChampionTitle }
  | { readonly kind: 'team' }
export type Distinction =
  | { readonly kind: 'leads'; readonly jersey: JerseyKind; readonly from: StageRef }                       // lidera sin llevarlo
  | { readonly kind: 'wears_for'; readonly jersey: JerseyKind; readonly rank: number; readonly from: StageRef } // lo lleva delegado
  | { readonly kind: 'champion'; readonly title: ChampionTitle }                                           // título que no lleva puesto
  | { readonly kind: 'gc'; readonly rank: number; readonly deficitS: number; readonly from: StageRef }
  | { readonly kind: 'stage_wins'; readonly stages: readonly StageRef[] }                                  // en ESTA carrera, hasta la N−1
export interface WornInput {
  readonly firstDay: boolean               // etapa 1 de vuelta o carrera de un día: sin maillots de líder (UCI 2.6.018)
  readonly discipline: 'road' | 'itt'
  readonly category: 'elite' | 'u23'
  readonly standings: JerseyInput          // general, puntos y montaña de SALIDA (jerseys.ts l. 51-58)
  readonly standingsFrom: StageRef | null  // la N−1
  readonly titles: ReadonlyMap<string, readonly ChampionTitle[]>
}
export type NotorietyLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
export interface RiderCard {                // el rótulo servido (tras el velo)
  readonly ix: RiderIx
  readonly id: string
  readonly name: string
  readonly bib: number | null
  readonly country: string
  readonly team: { readonly id: string; readonly name: string; readonly jerseySeed: string } | null
  readonly worn: WornJersey
  readonly lines: readonly Distinction[]   // como mucho `BROADCAST.cardLinesMax`
  readonly notoriety: NotorietyLevel
  readonly own: boolean
}
```

### G.3.4 La pantalla (`packages/shared/src/broadcast/cues.ts`)

```ts
export type CueClass = 0 | 1 | 2 | 3
export type RiderCueContext = 'attack' | 'break_round' | 'dropped' | 'banner' | 'focus' | 'own'
export interface TimeCheckRow { readonly number: number; readonly group: GroupIx; readonly size: number; readonly gapS: number; readonly jerseys: readonly JerseyKind[]; readonly names: readonly RiderIx[] | null }
export type Cue =
  | { readonly kind: 'attack'; readonly t: RaceS; readonly riders: readonly RiderIx[]; readonly fromGroup: GroupIx }
  | { readonly kind: 'break_formed'; readonly t: RaceS; readonly group: GroupIx; readonly riders: readonly RiderIx[]; readonly gapS: number }
  | { readonly kind: 'break_presented'; readonly t: RaceS; readonly group: GroupIx; readonly named: readonly RiderIx[]; readonly others: number }
  | { readonly kind: 'rider'; readonly t: RaceS; readonly rider: RiderIx; readonly context: RiderCueContext }
  | { readonly kind: 'time_check'; readonly t: RaceS; readonly rows: readonly TimeCheckRow[] }
  | { readonly kind: 'group_changed'; readonly t: RaceS; readonly group: GroupIx; readonly gained: readonly RiderIx[]; readonly lost: readonly RiderIx[] }
  | { readonly kind: 'split'; readonly t: RaceS; readonly parts: readonly GroupIx[]; readonly cause: string | null }
  | { readonly kind: 'caught'; readonly t: RaceS; readonly caught: GroupIx; readonly by: GroupIx; readonly toGoKm: number }
  | { readonly kind: 'climb_ahead' | 'banner_result'; readonly t: RaceS; readonly banner: number }
  | { readonly kind: 'crash'; readonly t: RaceS; readonly group: GroupIx; readonly riders: readonly RiderIx[] | null }
  | { readonly kind: 'mishap'; readonly t: RaceS; readonly rider: RiderIx; readonly mishap: 'pinchazo' | 'averia'; readonly lostS: number }
  | { readonly kind: 'dropped' | 'abandon'; readonly t: RaceS; readonly rider: RiderIx; readonly gapS: number | null }
  | { readonly kind: 'virtual_gc'; readonly t: RaceS; readonly rows: readonly VirtualGcRow[] }
  | { readonly kind: 'last_km'; readonly t: RaceS; readonly leadGapS: number | null }
  | { readonly kind: 'finish' | 'group_finish' | 'time_cut'; readonly t: RaceS; readonly finishIx: number }   // solo tras `BroadcastFinish`
export type CueKind = Cue['kind']
export type TemplateTarget = CueKind | 'voice_only' | 'report_only'
export type LiveLine = ChronicleEntry & { readonly revealS: RaceS }         // una línea de la voz
```

### G.3.5 El horizonte y el velo (`packages/db/src/horizon.ts`)

```ts
export type GuardReason = 'own_rider' | 'own_team' | 'follow' | 'headline'
export type KnowledgeLetter = 'W' | 'S' | 'R' | 'A' | 'X'    // directo, resumen, revelada, arrastrada, caducada
export type SpoilerScope = 'guarded' | 'own_only' | 'off'   // `users.spoiler_scope`
export interface VeiledStage { readonly raceKey: string; readonly stageDay: number; readonly gameDay: number; readonly reason: GuardReason }
export type HorizonKind = 'world' | 'anon' | 'viewer'
export interface Horizon {
  readonly kind: HorizonKind
  readonly userId: string | null
  readonly readOnly: boolean                                // viene de la cookie `cs_viewer`, sin sesión
  readonly rev: string                                      // `${currentDay}.${horizonRev}`: clave de caché de la web
  readonly knownThrough: ReadonlyMap<string, number>        // raceKey → k, solo carreras en guardia
  readonly veil: readonly VeiledStage[]                     // EL VELO
  readonly watching: ReadonlyMap<string, { readonly stageDay: number; readonly reachedS: number }>
}
export interface VeilDelta {                                // lo que las etapas veladas cambiaron en el mundo
  readonly points: ReadonlyMap<string, { readonly season: number; readonly window: number }>   // riderId → puntos
  readonly money: ReadonlyMap<string, number>               // riderId → premios (transactions)
  readonly budget: ReadonlyMap<string, number>              // teamId → premios de equipo (stage_team_results.prize)
  readonly palmares: ReadonlySet<string>                    // ids de filas de palmarés veladas
  readonly health: ReadonlyMap<string, { readonly health: HealthState; readonly untilDay: number | null }>
  readonly abandons: ReadonlySet<string>                    // `${raceKey}|${riderId}`
  readonly raceDays: ReadonlyMap<string, readonly number[]> // riderId → días de juego de carrera velados
}
export type Viewer = { readonly userId: string; readonly readOnly: boolean } | null
export interface WorldRef { readonly worldId: string; readonly currentDay: number }
export type StageGate = { readonly k: 'not_seen' } | { readonly k: 'previous_unseen'; readonly firstUnseen: number }
```

### G.3.6 La red y el contrato (`packages/shared/src/broadcast/wire.ts`)

```ts
export interface StartState {
  readonly leaders: { readonly gc: RiderIx | null; readonly points: RiderIx | null; readonly kom: RiderIx | null }   // tras la N−1
  readonly gcTop: readonly { readonly rider: RiderIx; readonly rank: number; readonly gapS: number }[]
  readonly racingAtStart: number
}
export interface PaceZone { readonly aboveKm: number; readonly x: number }
export interface BroadcastHead {                  // `GET …/broadcast`
  readonly stage: { readonly raceKey: string; readonly raceId: string; readonly day: number; readonly name: string; readonly km: number; readonly kind: StageKind; readonly timeTrial: boolean; readonly label: string }
  readonly profile: ProfileStrip
  readonly weather: StageWeather
  readonly cast: readonly RiderCard[]              // por RiderIx, con el velo aplicado a la procedencia (B13)
  readonly startState: StartState
  readonly pace: readonly PaceZone[]
  readonly estimateS: number                       // duración a ×1 con velocidades nominales: nunca con la carrera
  readonly clock: 'exact' | 'estimated'
  readonly source: 'timeline' | 'radio'
  readonly preview: StagePreview
  readonly view: { readonly reachedS: number | null; readonly known: boolean } | null
  readonly gate: StageGate | null
}
export interface BroadcastChunk {                 // `GET …/broadcast/chunk`: listas planas de enteros (formato de datos §10.4)
  readonly fromDs: Ds
  readonly toDs: Ds
  readonly groupsBorn: readonly (readonly [GroupIx, string, GroupOrigin])[]
  readonly moves: readonly number[]                // tríos [b, rider, to + 1]
  readonly main: readonly number[]
  readonly clocks: readonly number[]               // tríos [b, g, Ds]
  readonly mishaps: readonly number[]
  readonly details: readonly number[]
  readonly events: readonly TimelineEventWire[]
  readonly lines: readonly LiveLine[]              // la voz del tramo, ya construida
  readonly banners: readonly number[]
  readonly tt: { readonly starts: readonly number[]; readonly km: readonly number[] } | null
  readonly atFinish: boolean                       // el tramo llega al borde de la meta: lo siguiente es `POST …/finish`
}
export interface BroadcastFinish {                // `POST …/broadcast/finish`
  readonly arrivals: readonly { readonly gapS: number; readonly riders: readonly RiderIx[] }[]
  readonly result: readonly StageResultEntry[]     // con DNF y motivo, como hoy
  readonly closing: StageClosing
  readonly report: StageReport
  readonly news: readonly NewsItem[]
}
export type StageReport = StageReplay              // el acta: el `stageReplaySchema` de hoy (contracts.ts l. 1482-1533)
export interface StagePreview {                   // la previa: cuatro cuadros (I-22)
  readonly route: ProfileStrip
  readonly weather: StageWeather
  readonly jerseysInPlay: readonly { readonly jersey: JerseyKind; readonly holder: RiderIx; readonly threats: readonly RiderIx[] }[]
  readonly favourites: readonly { readonly rider: RiderIx; readonly why: 'gc' | 'sprint' | 'hills' | 'climb' | 'tt' | 'cobbles' }[]
}
export interface StageClosing {                   // el cierre (I-22)
  readonly podium: readonly RiderIx[]
  readonly gcAfter: readonly { readonly rider: RiderIx; readonly rank: number; readonly gapS: number; readonly move: number }[]
  readonly jerseysTomorrow: readonly { readonly jersey: JerseyKind; readonly rider: RiderIx; readonly changed: boolean }[]
  readonly mostKmOutFront: { readonly rider: RiderIx; readonly km: number } | null
  readonly outOfRace: readonly { readonly rider: RiderIx; readonly reason: 'abandon' | 'time_cut' }[]
  readonly tomorrow: PreStageInfo | null
}
export interface HorizonSummary {                 // `GET /api/me/horizon`
  readonly rev: string
  readonly scope: SpoilerScope
  readonly ready: readonly { readonly raceKey: string; readonly raceName: string; readonly stages: readonly number[]; readonly reason: GuardReason; readonly expiresOnDay: number }[]
  readonly watching: readonly { readonly raceKey: string; readonly stageDay: number; readonly reachedS: number; readonly toGoKm: number }[]
  readonly expiredSinceLastVisit: readonly string[]
}
export interface PreStageInfo {                   // lo ÚNICO que un título, un aviso o una miniatura saben de una etapa
  readonly raceName: string
  readonly season: number
  readonly stageDay: number
  readonly stageCount: number
  readonly km: number
  readonly label: string
  readonly stageKind: StageKind
}
export interface WatchState { readonly known: boolean; readonly reachedS: number | null; readonly gate: StageGate | null }   // `StageReplay.watch`
```

### G.3.7 Las noticias (`packages/shared/src/news.ts`)

```ts
export type AbandonReason = 'colapso' | 'fuera_control' | 'lesion' | 'enfermedad' | 'voluntario'   // race_rosters.abandoned_reason
interface OfRace { readonly raceId: string; readonly season: number }
export type NewsPayload =
  | (OfRace & { readonly kind: 'stage_win' | 'tt_win' | 'breakaway_win'; readonly stageDay: number; readonly riderId: string; readonly teamId: string | null })
  | (OfRace & { readonly kind: 'one_day_win' | 'one_day_tt_win' | 'gc_win' | 'kom'; readonly stageDay: number; readonly riderId: string; readonly teamId: string | null })
  | (OfRace & { readonly kind: 'gc_lead_taken'; readonly stageDay: number; readonly riderId: string; readonly teamId: string | null })
  | (OfRace & { readonly kind: 'jersey_taken'; readonly stageDay: number; readonly riderId: string; readonly teamId: string | null; readonly jersey: 'points' | 'kom' })
  | (OfRace & { readonly kind: 'abandon'; readonly stageDay: number | null; readonly riderId: string; readonly teamId: string | null; readonly reason: AbandonReason })
  | (OfRace & { readonly kind: 'injury'; readonly stageDay: number; readonly riderId: string; readonly teamId: string | null; readonly days: number; readonly prevHealth: HealthState; readonly prevUntilDay: number | null })
  | { readonly kind: 'contract'; readonly riderId: string; readonly toTeamId: string; readonly fromTeamId: string | null; readonly relocateCountry: string | null }
  | { readonly kind: 'retirement'; readonly riderId: string; readonly teamId: string | null; readonly age: number }
export type NewsKind = NewsPayload['kind']                  // los 11 de hoy más `gc_lead_taken` y `jersey_taken`
export interface StageReadyItem { readonly kind: 'stage_ready'; readonly raceId: string; readonly season: number; readonly stageDay: number; readonly gameDay: number }   // solo en lectura
export interface NameResolver { rider(id: string): string; team(id: string): string; race(raceId: string): string; country(iso2: string): string }
export interface Variant<D> { readonly since: number; readonly render: (d: D, n: NameResolver) => string }
```

---

## G.4 Funciones canónicas

| Firma | Fichero | Qué hace |
| --- | --- | --- |
| `timelineRecorder(opts: { blocks: number; dx: number; radioBlocks: ReadonlySet<Block>; riderIds: readonly string[] }): TimelineRecorder` | `engine/src/sim/timeline.ts` | recibe `onSnapshot` de cada bloque, `onEvent`, `onBanner`, `onTimeTrialRide` y los percances; guarda dos fotos a la vez y emite sucesos de estado |
| `TimelineRecorder.finish(input: RecorderFinishInput): StageTimeline` | idem | cierra la línea con el reparto, el tiempo, el perfil y la meta |
| `selfCheckI1(tl: StageTimeline, kmPhotos: ReadonlyMap<Block, RadioKm>): readonly I1Mismatch[]` | idem | autocomprobación al grabar (§D-12) |
| `encodeTimeline(tl: StageTimeline): StoredTimelineV1` y `decodeTimeline(s: unknown): StageTimeline` | `shared/src/broadcast/codec.ts` | inversas; `decodeTimeline` despacha por `format` |
| `reducePhoto(p: Photo, e: StateEvent): Photo` | `shared/src/broadcast/reduce.ts` | el reductor, un `case` por variante |
| `photoAt(tl: StageTimeline, b: Block): Photo` | idem | foto clave anterior más los sucesos hasta `b` |
| `instantAt(tl: StageTimeline, t: RaceS, ctx: InstantContext): Instant` | `shared/src/broadcast/instant.ts` | el corte diagonal, causal: solo usa datos con visibilidad ≤ `t` |
| `timeTrialInstantAt(tl: StageTimeline, t: RaceS, ctx: InstantContext): TimeTrialInstant` | `shared/src/broadcast/timeTrial.ts` | el estado de la crono en `t` |
| `visibilityOf(tl: StageTimeline): TimelineVisibility` | `shared/src/broadcast/cut.ts` | la hora de visibilidad de cada dato (§D-06) |
| `cutTimeline(tl: StageTimeline, toS: RaceS): StageTimeline` | idem | la línea con solo lo visible hasta `toS` (B9) |
| `chunkOf(tl: StageTimeline, fromDs: Ds, toDs: Ds): BroadcastChunk` | idem | el tramo |
| `revealSOf(e: RaceEvent, bEmit: Block, tl: RecorderView): RaceS` | `shared/src/broadcast/reveal.ts` | aplica `REVEAL_RULES` |
| `cuesBetween(prev: Instant, next: Instant, events: readonly TimelineEvent[]): readonly Cue[]` | `shared/src/broadcast/cues.ts` | los rótulos que produce el paso de un instante al siguiente |
| `paceAt(toGoKm: number, zones: readonly PaceZone[]): number` y `playbackEstimateS(profile: ProfileStrip, zones: readonly PaceZone[]): number` | `shared/src/broadcast/pace.ts` | la curva; la estimación usa velocidades nominales, nunca las de la carrera |
| `radioFromTimeline(tl: StageTimeline, names: RadioNames): RaceRadio` | `shared/src/broadcast/radio.ts` | el microscopio desde la línea, con el contrato de hoy (B16) |
| `groupRoleOf`, `groupLabelText`, `breakHeadline(cards: readonly RiderCard[], ownIx: ReadonlySet<RiderIx>): string` | `shared/src/broadcast/names.ts` | vocabulario único y frase de la fuga |
| `wornJerseys(input: WornInput): ReadonlyMap<string, WornJersey>`, `distinctions(…)`, `notorietyOf(card, instant): NotorietyLevel` | `shared/src/jerseys.ts` | la regla UCI (§D-24) |
| `pageTitle(p: PreStageInfo \| null, page: PageKind): string`, `stageReadyNotice(p: PreStageInfo, ownRiderOnStartlist: boolean): { subject: string; text: string }` | `shared/src/broadcast/pageTitle.ts` | títulos y avisos que no pueden llevar resultado por tipo |
| `renderNews(locale: 'en', p: NewsPayload, seed: string, rev: number, n: NameResolver): string` | `shared/src/news.ts` | la noticia al leer |
| `pickVariant<D>(seed: string, variants: readonly Variant<D>[], rev: number): Variant<D>` | `shared/src/render/variants.ts` | solo elige entre variantes con `since ≤ rev` |
| `buildTimelineCast(db, stage, input): Promise<TimelineCast>` | `db/src/cast.ts` | el reparto congelado con procedencia |
| `palmaresTitleSource: ChampionTitleSource` con `titlesOn(worldId: string, gameDay: number): Promise<ReadonlyMap<string, readonly ChampionTitle[]>>` | `db/src/titles.ts` | el proveedor provisional de títulos (§D-25) |
| `writeStageTimeline(tx, tl, meta)`, `readStageTimeline(db, raceKey, stageDay): Promise<StageTimeline \| null>` | `db/src/timelines.ts` | gzip 9 y `bytea`; la API guarda un LRU de decodificadas |
| `computeHorizon(db, viewer: Viewer, world: WorldRef): Promise<Horizon>` | `db/src/horizon.ts` | memorizado por `(userId, currentDay, horizonRev)` `SPOILER.horizonMemoS` |
| `veilDelta(db, h: Horizon): Promise<VeilDelta>` | idem | una consulta por fuente, solo filas veladas |
| `veilSql(h: Horizon, raceKey: SQLWrapper, gameDay: SQLWrapper): SQL` | idem | EL predicado único del velo |
| `throughStage(h: Horizon, raceKey: string, lastRun: number): number` e `isVeiled(h: Horizon, raceKey: string, stageDay: number): boolean` | idem | sus gemelos para lo que va por número de etapa |
| `worldHorizon: Horizon` | idem | el del tick, la administración y los bancos, siempre explícito |
| `recordProgress`, `revealStage`, `setFollow`, `setSpoilerScope` | `db/src/watch.ts` | las escrituras de `race_watch` y `users` |
| `registerSpoilerGuard(app, deps: { db; mode: SwitchMode }): RouteRegistry` | `apps/api/src/spoiler.ts` | exige `config.spoiler` en TODA ruta con cuerpo; lanza al arrancar si falta |
| `timelineForStage(db, raceKey, stageDay): Promise<StageTimeline \| null>` | `apps/api/src/broadcastSource.ts` | la grabada o el adaptador de la radio |
| `buildChronicle(events, names, { byClock?, live?: { untilS, stageKm, revealS } })` | `apps/api/src/chronicle.ts` | la voz (con `live`) y el acta (sin él) |
| `stageReadyEmail(p: PreStageInfo, url: string): Email` | `apps/api/src/emails.ts` | la plantilla del correo; el envío es de E4 |
| `usePageTitle(p: PreStageInfo \| null, page: PageKind): void` | `apps/web/src/domain/pageTitle.ts` | el único escritor de `document.title` |

`PageKind` = `'watch' | 'report' | 'race' | 'rider' | 'team' | 'news' | 'rankings' | 'home' | 'other'`.

---

## G.5 Tablas, columnas, índices y migraciones

| Objeto | Columnas y claves | Migración |
| --- | --- | --- |
| `news` (existe) | gana `seed text`, `data jsonb` (`$type<NewsPayload>`), `race_key text`, `stage_day smallint`, `tpl_rev smallint`, todas nullable; `text` pasa a nullable; índice `news_race_stage_idx (world_id, race_key, stage_day)` | `0043_noticias_con_datos` |
| `stage_timelines` (nueva) | `race_id text` (la `raceKey`), `stage_day integer`, `game_day integer not null`, `format smallint not null`, `engine_version integer not null`, `finish_s integer not null`, `bytes integer not null`, `body bytea not null`, `created_at timestamptz default now()`; PK `(race_id, stage_day)`; índice `stage_timelines_day_idx (game_day)` | `0044_linea_temporal` |
| `race_watch` (nueva) | `user_id uuid` FK `users` cascade, `world_id uuid` FK `worlds` cascade, `race_key text`, `follow smallint not null default 0` (1 seguida, −1 soltada, 0 la regla), `known_through smallint not null default 0`, `how text not null default ''` (una `KnowledgeLetter` por etapa conocida), `watching_stage smallint`, `reached_s integer`, `updated_at timestamptz default now()`; PK `(user_id, world_id, race_key)` | `0045_lo_visto` |
| `spoiler_scope` (enum nuevo) | `guarded`, `own_only`, `off` | `0045_lo_visto` |
| `users` (existe) | gana `spoiler_scope spoiler_scope not null default 'guarded'`, `horizon_rev integer not null default 0`, `last_seen_at timestamptz`, `reveal_confirm boolean not null default true` | `0045_lo_visto` |
| `race_rosters` (existe) | gana el índice `race_rosters_rider_idx (rider_id)` | `0045_lo_visto` |
| `rider_points` (existe) | gana `stage_day smallint` nullable e índice `rider_points_race_stage_idx (race_id, stage_day)` | `0046_rastro_de_etapa` |
| `palmares` (existe) | gana `stage_day smallint` nullable | `0046_rastro_de_etapa` |
| `transactions` (existe) | gana `race_key text` y `stage_day smallint` nullable e índice `transactions_race_stage_idx (race_key, stage_day)` | `0046_rastro_de_etapa` |
| `stage_team_results` (existe) | gana `prize integer not null default 0` (lo escribe `awardRacePrizes`) | `0046_rastro_de_etapa` |
| `stage_snapshots` (existe) | NO gana columnas (`tactica.md` l. 7589-7591); `radio` se sigue escribiendo hasta `DD-11` | ninguna |

Los números son los que tocan hoy (la última es `0042_transicion_e1`, `_journal.json` con 43 entradas); si otro documento llega antes, `drizzle-kit generate` desplaza el número y manda el nombre.

---

## G.6 Rutas

| Método y ruta | `config.spoiler` | Entra | Sale |
| --- | --- | --- | --- |
| `GET /api/races/:raceId/stages/:day` | `horizon` | `?season=`, `?diag=1` (solo administradores) | `StageReplay` de hoy; con la etapa velada, sin sus campos opcionales de resultado y con `watch: WatchState` |
| `GET /api/races/:raceId/stages/:day/broadcast` | `watch` | `?season=` | `BroadcastHead` |
| `GET /api/races/:raceId/stages/:day/broadcast/chunk` | `watch` | `?season=&fromDs=&toDs=` | `BroadcastChunk`; 409 `beyond_reached` si `toDs` pasa de lo alcanzado más la precarga |
| `POST /api/races/:raceId/stages/:day/broadcast/finish` | `watch` | `?season=` | `BroadcastFinish`; marca la etapa como vista o revelada |
| `GET /api/races/:raceId/stages/:day/report` | `watch` | `?season=` | `StageReport`; 403 `{ gate: StageGate }` si está velada para ese espectador |
| `POST /api/me/watch/:raceKey/:day` | `watch` | `{ reachedS: number; mode: 'play' \| 'seek' \| 'summary' \| 'digest' }` (acepta `sendBeacon`) | `{ status: 'watching' \| 'known'; rev: string }`; 403 `previous_unseen` |
| `POST /api/me/reveal/:raceKey/:day` | `watch` | `{}` | `{ rev: string }` |
| `PUT /api/me/follow/:raceKey` | `safe` | `{ follow: 'follow' \| 'drop' \| 'default' }` | `{ rev: string }` |
| `PUT /api/me/spoiler-scope` | `safe` | `{ scope: SpoilerScope; revealConfirm?: boolean }` | `{ rev: string }` |
| `GET /api/me/horizon` | `horizon` | | `HorizonSummary` |
| `GET /api/news`, `GET /api/teams/:id/news` | `horizon` | | `newsItemSchema` con `payload`, `seed`, `tplRev`, `raceId`, `raceKey`, `stageDay` nuevos y `text` de compatibilidad |
| `GET /api/riders/me/last-race` | `horizon` | | la última etapa CONOCIDA; si la última corrida está velada, la tarjeta `Ready to watch` |
| `GET /health` | `safe` | | gana `features: { broadcastWatch: SwitchMode; spoilerMode: SwitchMode }` |

Rutas web: `/world/races/:raceId/stages/:day` (abre `Watch` si la etapa no es conocida, `Report` si lo es) y `/world/races/:raceId/stages/:day/report` (el acta, pública e indexable, con la puerta si está velada).

---

## G.7 Constantes

### `TIMELINE` (`packages/engine/src/constants.ts`: la lee el grabador; tocarla corre los bancos)

| Nombre | Valor | Intención |
| --- | --- | --- |
| `TIMELINE.format` | 1 | versión del formato guardado; un decodificador por versión, lo guardado no se reescribe |
| `TIMELINE.keyPhotoKm` | 10 | una foto clave cada 10 km (estado §3.7: 4,2-6,7 KB por etapa) |
| `TIMELINE.lastKmMarkBlocks` | 10 | marca de reloj en cada bloque del último km (carteles de 500, 300, 200 y 100 m) |
| `TIMELINE.gzipLevel` | 9 | lo que mide datos §10.5 y el juez del motor (1,6-2,4 veces menos que `jsonb`) |
| `TIMELINE.maxStoredBytes` | 49_152 | tope de `stage_timelines.bytes` en línea (B6); el doble del máximo medido en `bytea` (23 KB, datos) |
| `TIMELINE.maxJsonBytes` | 131_072 | tope del JSON antes de gzip (estado midió 24-104 KB) |
| `TIMELINE.medianJsonBytes` | 65_536 | mediana exigida en el banco de 24 etapas |
| `TIMELINE.ttMaxStoredBytes` | 16_384 | tope de una crono en `bytea` (datos: 2,5-10 KB) |

### `BROADCAST` (`packages/shared/src/broadcast/constants.ts`: la leen la API y la web; tocarla NO corre los bancos)

| Nombre | Valor | Intención |
| --- | --- | --- |
| `BROADCAST.pace` | `[{ aboveKm: 50, x: 60 }, { aboveKm: 20, x: 30 }, { aboveKm: 5, x: 12 }, { aboveKm: 1, x: 4 }, { aboveKm: 0, x: 1.5 }]` | la curva de `Watch` (producto §5); medida sin pausas 7:39-19:59 (§D-19) |
| `BROADCAST.summaryPace` | `[{ aboveKm: 50, x: 300 }, { aboveKm: 20, x: 120 }, { aboveKm: 5, x: 40 }, { aboveKm: 1, x: 10 }, { aboveKm: 0, x: 3 }]` | `Highlights`; medida 2:12-6:37 |
| `BROADCAST.digestBudgetS` | `{ llana: 60, media: 90, reina: 150, cri: 120, clasica: 150 }` | el digest de `While you were away`; fijo, no depende de lo que pasó |
| `BROADCAST.ttPace` | `[{ upToStarted: 0.6, x: 120 }, { upToStarted: 0.9, x: 40 }, { upToStarted: 1, x: 12 }]` | la crono por fracción de salidos; medida 6:24-11:23 |
| `BROADCAST.ttLastKmX` | 2 | el último km del último en salir |
| `BROADCAST.speeds` | `[0.5, 1, 2, 4]` | cuatro velocidades y ninguna más |
| `BROADCAST.nextActionSpeedup` | 20 | `Next action` acelera ×20 hasta el siguiente `Cue` de clase ≥ `nextActionMinClass` |
| `BROADCAST.nextActionMinClass` | 2 | |
| `BROADCAST.cueHoldS` | `[3, 4, 5, 6]` | segundos de pared por clase 0-3; no paran el reloj |
| `BROADCAST.cueQueueMax` | 3 | con la cola llena, los de clase 0 y 1 se descartan; nunca se frena la carrera |
| `BROADCAST.chunkRaceS` | 900 | un tramo cubre como mucho 15 min de carrera |
| `BROADCAST.prefetchRaceS` | 900 | lo servido nunca pasa de lo alcanzado más esto |
| `BROADCAST.progressEveryRealS` | 15 | cada cuánto informa el cliente de lo alcanzado |
| `BROADCAST.progressMinDeltaS` | 60 | el servidor solo escribe si lo alcanzado creció al menos esto o cambia de estado |
| `BROADCAST.resumeBackS` | 60 | al reanudar se vuelve 60 s de carrera |
| `BROADCAST.trendWindowKm`, `trendMinS` | 5, 5 | «y si sube o baja»: flecha solo si el hueco se mueve más de 5 s en 5 km |
| `BROADCAST.sameTimeS` | 5 | por debajo, `s.t.` |
| `BROADCAST.gapsTableEveryRealS` | 25 | cuadro de diferencias generales cada 25 s de pared |
| `BROADCAST.quietFinalKm` | 5 | sin cuadro de diferencias en los últimos 5 km |
| `BROADCAST.quietFinalM` | 500 | sin rótulos de corredor en los últimos 500 m |
| `BROADCAST.virtualGcTop`, `virtualGcMaxS` | 10, 300 | general virtual si uno de los 10 primeros de salida va en otro grupo que el líder a menos de 5 min |
| `BROADCAST.nameWholeGroupUpTo` | 12 | como `NAME_WHOLE_GROUP_UP_TO` (raceRadio.ts l. 611) |
| `BROADCAST.byNamesUpTo` | 3 | un grupo de tres o menos se nombra por sus corredores (SPEC §6.15) |
| `BROADCAST.namedGcTop` | 10 | en un grupo mayor se nombra al top 10 de salida |
| `BROADCAST.breakNamedMax` | 2 | la frase de la fuga nombra a dos y cuenta al resto (tope de R23.4: tres) |
| `BROADCAST.cardLinesMax` | 3 | líneas del rótulo |
| `BROADCAST.gcLineTop` | 20 | puestos de la general de salida que se ganan la línea `14th overall +4:02` en el rótulo |
| `BROADCAST.closingResultTop` | 10 | puestos del resultado en el cierre, más el corredor propio |
| `BROADCAST.knownNameMinWins` | 3 | nivel 7 de notoriedad |
| `BROADCAST.breakRoundEveryS` | 6 | la moto rodea la fuga: un rótulo de clase 0 por escapado |
| `BROADCAST.crashNamesDelayS` | 3 | primero `CRASH`, luego los nombres |
| `BROADCAST.climbCardLeadKm` | 3 | la ficha del puerto, 3 km antes del pie |
| `BROADCAST.finishFreezeS` | 3 | el plano del ganador |
| `BROADCAST.roleHysteresisKm` | 1 | un papel de grupo no cambia si la condición no se sostiene un km |
| `BROADCAST.bunchMinShare` | 2/3 | copia de `PELOTON_MIN_SHARE` (raceRadio.ts l. 91), atada por un test |
| `BROADCAST.chaseMinShare` | 0.5 | copia de `STAGE.gapChaseMainFraction` (constants.ts l. 2657), atada por un test |
| `BROADCAST.liveClusters` | false | racimos en la voz; pasa a true solo si B19 sigue en 0 con ellos (§D-43) |
| `BROADCAST.liveClusterWindowKm`, `liveClusterMin` | 5, 3 | la ventana de `groupRuns` |
| `BROADCAST.estimatedClockMaxErrKm` | 1 | si el adaptador de la radio yerra más (B22), esas etapas solo abren en `Report` |
| `BROADCAST.mobileGroupRows` | 4 | filas de la barra en móvil; el resto, `+N groups` |
| `BROADCAST.overlayHz`, `barHz` | 10, 4 | repintado de la capa fija y de la barra |
| `BROADCAST.decodedCacheEntries` | 64 | LRU de líneas decodificadas en la API |

### `SPOILER` (`packages/shared/src/broadcast/constants.ts`)

| Nombre | Valor | Intención |
| --- | --- | --- |
| `SPOILER.expiryGameDays` | 56 | el velo de una carrera se levanta 56 días de juego (14 reales) tras su última etapa |
| `SPOILER.headlineRaces` | `['race-italy', 'race-france', 'race-spain', 'race-sanremo', 'race-flanders', 'race-roubaix', 'race-liege', 'race-lombardy']` | las de cabecera en `guarded` (68 etapas por temporada, medido por producto) |
| `SPOILER.viewerCookieDays` | 90 | vida de `cs_viewer`, más que la sesión de 7 días |
| `SPOILER.lastSeenEveryMin` | 60 | como mucho una escritura de `users.last_seen_at` por hora |
| `SPOILER.newsGroupAbove` | 3 | con más etapas veladas de una carrera, una sola línea en noticias |
| `SPOILER.adaptiveAskAfterRaces` | 2 | tras dos carreras de cabecera ignoradas, ofrecer `own_only` una vez |
| `SPOILER.horizonMemoS` | 60 | memo del horizonte por `(userId, currentDay, horizonRev)` |
| `SPOILER.horizonBudgetMs` | 5 | p95 de `computeHorizon` en B14 |

---

## G.8 Interruptores (`apps/api/src/env.ts`, se cambian en Railway sin desplegar)

| Nombre | Valores | Defecto | Qué enciende |
| --- | --- | --- | --- |
| `BROADCAST_WATCH` | `off`, `admins`, `on` | `off` | la pestaña `Watch` y las rutas de retransmisión (`admins`: solo `users.is_admin`) |
| `SPOILER_MODE` | `off`, `admins`, `on` | `off` | el velo (`off`: `Horizon` es siempre `world` o `anon`, como hoy) |
| `TIMELINE_RECORD` | `off`, `on` | `on` | que el tick grabe `stage_timelines` (en `envSchema` y `tickEnvSchema`) |

Los dos primeros viajan a la web en `/health.features`. `SwitchMode` = `'off' | 'admins' | 'on'`. No confundir `SPOILER_MODE` (del servidor) con `users.spoiler_scope` (del jugador).

---

## G.9 Bancos e invariantes

| Id | Nombre | Qué afirma |
| --- | --- | --- |
| I1 | la foto reducida es la foto del motor | en cada km de `radioKmPoints`, `photoAt` proyectada = `radioKmFrom` de la foto del motor (estado midió 0 discrepancias en 3.246) |
| I2 | el instante coincide con la foto donde se mide | en tránsito, p90 ≤ 2 corredores |
| I3 | claves y empaquetado | `clave(k + 10) = reducción de clave(k)`; `decodeTimeline(encodeTimeline(tl)) = tl` |
| I5 | la traza de la crono cuadra con el resultado | salida + traza final + pérdida = `results.tiempoS` |
| B1a | canario | ninguna respuesta lleva el ganador canario de una etapa velada (JSON, título, `og:`, correo, aviso) |
| B1b | diferencial | correr la etapa no cambia un byte para quien no la ha visto, salvo la lista blanca con motivo |
| B1c | dos desenlaces | dos semillas con desenlaces distintos dan respuestas idénticas byte a byte |
| B1d | política completa | toda ruta con cuerpo declara `config.spoiler`; si no, no arranca |
| B2 | estado contra sucesos | tamaño, hueco y protagonistas de `front_group`, `time_gap`, `breakaway_formed`, `breakaway_caught`, `peloton_split`, `peloton_selection` contra `instantAt(revealS)` |
| B3 | rótulo | todo corredor de todo grupo tiene rótulo en todo instante (100 %) |
| B4 | re-render | noticia, voz y acta idénticas desde `seed + data` |
| B5 | estabilidad | hash de un corpus congelado; añadir una variante no reescribe el pasado |
| B6 | tamaño | `stage_timelines.bytes`, JSON, tramo, cabecera y etapa servida caben en su tope |
| B7 | cobertura | toda plantilla que emite el motor tiene render de voz y de acta, regla de `REVEAL_RULES` y destino en `CUE_OF_TEMPLATE` |
| B8 | cliente | parse y Zod del tramo mayor, y `instantAt` por fotograma, baratos |
| B9 | corte causal | `instantAt(cutTimeline(tl, T), T) = instantAt(tl, T)`; todo dato de un tramo tiene visibilidad ≤ su `toDs`; el ritmo no depende de los sucesos |
| B10 | foto por km y aprendizaje | `trabajaronParaOtro` y la radio ven las mismas fotos que hoy |
| B11 | observar no toca la carrera | huella idéntica en `results`, `events`, `efforts`, `incidents` con sonda en cada bloque, `onEvent`, `onBanner` y `onTimeTrialRide` |
| B12 | aritmética del horizonte | prefijo, arrastre, caducidad, fuentes de guardia, alcances, cookie que solo restringe |
| B13 | procedencia | ningún campo del reparto con `from` velado viaja |
| B14 | latencia del horizonte | `computeHorizon` p95 ≤ `SPOILER.horizonBudgetMs` con 250.000 filas de `race_rosters` |
| B15 | coste del tick | los días 176 (187 cronos nacionales) y 179 (153 nacionales en línea) con grabador y escritura, dentro del presupuesto |
| B16 | radio desde la línea | `radioFromTimeline` = la radio de `radioForStorage` en la capa de detalle, en las 24 etapas |
| B17 | ritmo medido | la duración de cada curva en las 24 etapas, dentro de sus bandas |
| B18 | el servidor no adelanta | un tramo más allá de lo alcanzado más la precarga da 409 |
| B19 | la voz es prefijo | la voz en `t` es prefijo exacto de la voz en `t + 30 s` (medido 0 en 15 corridas por ingeniero) |
| B20 | revelar sin castigo | ningún premio, logro, moral ni dinero lee `race_watch` |
| B21 | posición del instante | error de la posición extrapolada contra la línea entera (informativo, §D-04) |
| B22 | reloj estimado | error del adaptador de la radio contra la línea grabada en las mismas etapas |
| PL | prueba de lectura | un tercero responde sin ayuda las cuatro preguntas de SPEC §6.15 en tres puntos de tres etapas |

---

## G.10 Pasos del plan

| Paso | Nombre | PR |
| --- | --- | --- |
| Paso 0 | Red y línea base | 0 |
| Paso 1 | Noticias con datos (antes del reinicio) | 1a, 1b |
| Paso 2 | La voz causal | 2 |
| Paso 3 | Watch para el dueño sobre la radio de hoy | 3a API, 3b dominio web, 3c pantalla |
| Paso 4 | Los ganchos del motor y el grabador puro (único que toca `packages/engine`) | 4a ganchos, 4b grabador |
| Paso 5 | Grabar la línea temporal | 5 |
| Paso 6 | La retransmisión exacta | 6a línea, 6b rótulos y crono |
| Paso 7 | Lo visto y la etapa cerrada | 7a datos y rutas, 7b ruta de etapa |
| Paso 8 | El horizonte en toda la API | 8a, 8b |
| Paso 9 | La web sin destripe | 9a, 9b |
| Paso 10 | Previa, cierre, modos y encendido | 10a, 10b |
| Paso 11 | La radio desde la línea | 11 |
| Paso 12 | Cierre: semilla neutra, narradores y documentos | 12 |

---

## G.11 Términos de pantalla (inglés, «(pantalla)»)

| Contexto | Texto |
| --- | --- |
| Pestañas de una etapa conocida | `Report` (por defecto), `Result`, `Classifications`, `Race Radio`, `Profile`, `Watch` |
| Pestañas de una etapa no conocida | `Watch` (por defecto), `Profile` (sin marcas); las demás enseñan la puerta |
| Etapa aún no corrida | `Preview`, `Profile` |
| Portada | `Continue watching`, `Ready to watch`, `While you were away` |
| Grupos (vocabulario único, §D-18) | `Lead group`, `Chase group`, `Bunch`, `Gruppetto`, `Bunch together`, `Race leader’s group`, `Points leader’s group`, `KOM leader’s group`; tres o menos, por sus nombres |
| Voz (mismo vocabulario) | `the lead group`, `the chase group`, `the bunch`, `the gruppetto` |
| Capa fija | `54.3 km to go`, `3 laps to go`, `+2:14 ▲`, `s.t.`, `Bunch together`, reloj `3:12:40` |
| Barra | `1 · LEAD GROUP · 5`, `+0:45`, `+143 riders`, `+2 groups`, `Pulling: Team Beta (for 11 S. CARTER)` |
| Tu corredor | `Your rider · in the bunch · +2:14` |
| Rótulos de suceso | `ATTACK`, `CRASH`, `PUNCTURE`, `MECHANICAL`, `CAUGHT`, `SPLIT IN THE BUNCH`, `ECHELONS`, `DROPPED`, `ABANDON`, `KOM`, `INTERMEDIATE SPRINT`, `VIRTUAL GC`, `FLAMME ROUGE`, `1 KM`, `STAGE WINNER`, `PHOTO FINISH`, `TIME CUT` |
| Crono | `ON COURSE`, `SPLIT 1`, `SPLIT 2`, `FINISH`, `HOT SEAT`, `38 on course · 71 finished · 67 to start` |
| Rótulo de corredor | `Leader, general classification`, `Also leads the mountains`, `Points jersey (2nd in the classification)`, `Champion of Italy`, `Time trial champion of Italy`, `14th overall +4:02` |
| Frase de la fuga | `The mountains leader and the champion of Italy go clear with three others.`, `…with your rider Iñigo Arrieta and two others.`, `Five riders go clear.` |
| Mandos | `▶`, `❚❚`, `×½ ×1 ×2 ×4`, `Next action`, `−5 km`, `+5 km`, `Next climb`, `Final 20 km`, `Last km`, `Show result` |
| Saltos | `While you skipped`, `Previously` |
| Modos | `Watch`, `Highlights`, `Watch the race in 30 minutes`, `Key stages`, `Continue from stage 4`, `Show results` |
| Revelar | `Show the result of Stage 7? You won't be able to watch it without knowing.`, `Don't ask again`, `Watch anyway` |
| Puertas | `You haven't watched stage 6 yet` · `Watch stage 6` · `Highlights of stage 6` · `Show result of stage 6 and continue`; `This page shows the result of Stage 7. Watch it instead?` |
| Órdenes | `Stage 6 is waiting for you` · `Watch (about 9 min)` · `Show result` · `Give orders anyway` |
| Seguir | `Follow without spoilers`, `Stop protecting this race` |
| Agregados y listas | `World ranking · as you know it · 3 stages hidden · Manage`, `Results from 3 stages you haven't watched are hidden · Manage`, `Stage 7 of Race France is ready to watch`, `Race France · 4 stages ready to watch`, `Finished · ready to watch`, `After stage 9 of 21 · stages 10-12 ready to watch` |
| Caducidad y cookie | `Results of Race Italy are now shown (finished 16 days ago) · Watch the digest anyway`, `Sign in to see results as you know them` |
| Sin línea | `Recorded before full race data`, `Broadcast unavailable for this stage` |
| Diagnóstico | `Diagnostic view · not counted as watched` |
| Cierre | `Most kilometres out front`, `Next: Stage 8 · Watch` |
| Compartir | `Share to watch`, `Share the report` (marcado `Spoiler` en `og:description`) |
| Título de pestaña | `Stage 7 · Race France · Cycling Star`; `Stage 7 report · Race France · Cycling Star` |
| Correo | asunto `Stage 7 of Race France is ready to watch`; `187 km · mountain stage · your rider is on the start list`; botón `Watch` |
| Red | `Connection lost · Retry`; `You finished this stage on another device · Watch anyway · Show report` |

---

## G.12 Identificadores del proceso

| Prefijo | Qué nombra | Dónde vive |
| --- | --- | --- |
| `I-01` a `I-49` | injertos únicos | `juicios/veredicto.json` → `injertos` |
| `O-01` a `O-32` | objeciones fundidas | `veredicto.json` → `objeciones` |
| `H-01` a `H-23` | huecos | `veredicto.json` → `huecos` |
| `X-01` a `X-24` | contradicciones de hecho entre propuestas, con la resolución de los jueces | `veredicto.json` → `contradicciones` |
| `D-01` a `D-62` | decisiones cerradas | `borrador/00-decisiones.md` |
| `DD-01` a `DD-20` | decisiones del dueño, con valor por defecto que es el que se implementa | `00-decisiones.md` §DD y §20 del documento |
| `§0` a `§21` | secciones del documento final | `borrador/00-esqueleto.md` |
| `L1` a `L10` | lotes de redacción | `00-esqueleto.md` |
| `[DUEÑO n]`, `[DOC n]`, contradicción n | requisitos y contradicciones del mapa 05 §5 y §6 | `mapas/05-dueno-docs.md` |
| E1-E9, C1-C6, I1-I4, N1-N4, H1-H7, P1-P6, W1-W6, T1-T6 | las 48 superficies (en el documento se escriben `sup. E1`, etc., para no confundir `I1` con el invariante) | `mapas/03-web-superficie-destripe.md` §4 |
| X1-X9 | las nueve puertas fuera del inventario (en el documento, `sup. X1`) | `propuestas/producto.md` §1.7 y §7.5 |

---

## G.13 Alias de las propuestas (solo para leer las fuentes)

| En las propuestas | Canónico |
| --- | --- |
| `LineaTemporal` (estado), `StageTimeline` (datos), `StoredStageFeed` y `stage_feeds` (television), radio v2 (producto), `StoredRaceRadio` con opcionales (ingeniero) | `StageTimeline`, `StoredTimelineV1`, `stage_timelines` |
| `LineaTemporalGuardada`, `StoredTimelineV1` sin definir (datos) | `StoredTimelineV1` |
| `Foto` (estado), `BroadcastFrame` (ingeniero), `GroupFrame` y `StoredRadioKmV2` (producto), `TimelinePhoto` (datos), `StoredPaso` (television) | `Photo` y las marcas `clock` |
| `Instante` (estado), `BroadcastInstant` (ingeniero), `RaceMoment` (producto), `BroadcastState` (datos, television) | `Instant` |
| `GrupoEnPantalla`, `GroupNow`, `RoadGroup`, `BroadcastGroup` | `GroupNow` |
| `SucesoDeEstado` con `mueve`, `sale`, `titulo`, `percance`, `reloj` | `StateEvent` con `move`, `out`, `main`, `mishap`, `clock` |
| `SucesoNarrable` (estado), `TimelineEvent` (datos), `Overlay` (ingeniero) | `TimelineEvent` (dato) y `Cue` (pantalla) |
| `bEmision`, `tEmision` (estado), `knownS` (ingeniero), `aT` (producto), `reveal[]` (television), `revealS` (datos) | `TimelineEvent.bEmit`, `TimelineEvent.revealS` |
| `LiveLine` (producto), ticker (ingeniero), voz (television), journal en vivo (estado, datos), `Commentary` (estado) | `LiveLine`, «la voz»; en pantalla, la lista de líneas dichas se llama `Commentary` |
| `RotuloCorredor` (estado), `RiderCard` (ingeniero, television), `RiderLabel` y `BroadcastRider` (producto), `CastRider` (datos) | `RiderCard` (servido), `CastRider` (congelado) |
| `MaillotLlevado` (estado), `WornKit` (ingeniero), `WornJersey` (producto, datos, television) | `WornJersey` |
| `Distincion` (estado), `RiderLine` (ingeniero), `Distinction` | `Distinction` |
| `Titulo`, `FuenteDeTitulos`, `titulosDesdePalmares` (estado), `TitlesPort` (television), `championTitles()` (ingeniero, datos), `ChampionTitleSource` (producto) | `ChampionTitle`, `ChampionTitleSource`, `palmaresTitleSource` |
| `Horizonte` (estado), `Horizon` (ingeniero, producto, television), `Veil` y `getVeil` (datos) | `Horizon`, `Horizon.veil`, `computeHorizon` |
| `HorizonDelta` (producto) | `VeilDelta` |
| `hiddenSql` (ingeniero) | `veilSql` |
| `stageHidden` (ingeniero), `isPending` (television) | `isVeiled` |
| `shownThrough` (television), `visibleHasta` (estado) | `throughStage` |
| `stage_views` (cuatro versiones), `race_follows`, `race_watch` | `race_watch` |
| `spoiler_mode` de `users` (producto), `spoiler_scope` (datos) | `users.spoiler_scope` |
| `POLITICA_DE_RUTAS` (estado), `ROUTE_POLICY` (producto), `config.spoiler` (ingeniero, television) | `config.spoiler: SpoilerPolicy` y `RouteRegistry` |
| `PapelDeGrupo` (estado), `GroupName` (producto), `GroupLabel` (datos), `GroupRole` (television) | `GroupRole` y `GroupLabel` |
| `onRiderTrace` (estado), `onTimeTrial` (ingeniero), `onRide` (datos), `onTimeTrialRide` (television), `onTtCheck` (producto) | `onTimeTrialRide` |
| `LineaDeCrono`, `StoredTimeTrial`, `tt` | `TimeTrialTrace` |
| `InstanteDeCrono`, `TtMoment` | `TimeTrialInstant` |
| `Story`, «acta», «journal», «crónica», «diario» | `Report` en pantalla; «el acta» en la prosa |
| `stageReadyEmail`, `stageReadyNotice`, `NeutralStageNotice` | `stageReadyNotice` (texto) y `stageReadyEmail` (plantilla) |
| `usePageTitle`, `useTituloDePestana`, `useDocumentTitle`, `tabTitle`, `NeutralTitle` | `pageTitle` (puro) y `usePageTitle` (gancho) |
| `StagePrevia` (television), `Preview` (ingeniero) | `StagePreview`; en pantalla `Preview` |
| `Closing`, `StageActa` (television) | `StageClosing`, `StageReport` |
| `Backlog` (television), `ToWatch` (datos), `/api/views/pending` (ingeniero) | `HorizonSummary` y `GET /api/me/horizon` |
| `feed?chunk=` (television), `slice` (datos), tramo de 20 km (ingeniero), de 10 km (estado) | `BroadcastChunk`, `GET …/broadcast/chunk` |
| `BROADCAST.chunkKm` 20, `fotoClaveKm` 10, `chunkDs` 6.000 | `BROADCAST.chunkRaceS` 900 (y `TIMELINE.keyPhotoKm` 10, que no es unidad de entrega) |
| `staleRevealGameDays` 28, `caducidadDiasReales` 7, `pendingExpiryDays` 40, `VEIL.windowGameDays` 56, `expiryGameDays` 56 | `SPOILER.expiryGameDays` 56 |
| `ITA CHAMP` (ingeniero), `Italian Champion` (television, datos), `Champion of Italy` (producto) | `Champion of Italy` (§D-25) |
| `Peloton` (radio de hoy, producto, ingeniero), `BUNCH` (estado), `Bunch` (television) | `Bunch` (§D-18, DD-04) |
| `Grupetto` (radio de hoy), `grupeto` (motor) | `Gruppetto` en pantalla; `grupeto` sigue siendo el `kind` del motor |
| `FRONT OF THE RACE`, `CHASERS` | `LEAD GROUP`, `CHASE GROUP` |
| `ticker-only` (ingeniero) | `voice_only` en `CUE_OF_TEMPLATE` |
