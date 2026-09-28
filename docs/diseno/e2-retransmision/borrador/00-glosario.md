# Glosario canónico de `docs/retransmision.md` (E2 · La retransmisión)

Este fichero es el vocabulario ÚNICO del documento final. Diez redactores escriben en paralelo y la única forma de que no inventen diez nombres para la misma cosa es que todos usen estos, tal cual, con su mayúscula y su forma. Reglas:

1. Todo lo que un redactor nombre (tipo, campo, función, fichero, tabla, columna, índice, migración, ruta, constante, interruptor, banco, paso del plan, texto de pantalla) está aquí. Si una propuesta usa otro nombre, se traduce con la tabla de alias de §G.13 y el alias no aparece en el documento final salvo en el apéndice A.
2. Si un redactor necesita un nombre que no está, lo escribe al final de su sección en un bloque «Propuesto para el glosario» (nombre, una línea de definición, fichero) y el ensamblador lo funde. No renombra nada de lo que ya está.
3. Los identificadores de código van en inglés (la casa mezcla, pero el motor de la radio, `raceRadio.ts`, y cuatro de las cinco propuestas los escriben en inglés); los códigos que ya existen en castellano en el motor se conservan tal cual (`caida`, `pinchazo`, `averia`, `fuga`, `contra`, `peloton`, `tierra`, `grupeto`, `plantilla`, `datos`, `protagonistas`, `llana`, `media`, `reina`, `cri`, `clasica`). La prosa, en castellano. La pantalla, en inglés y marcada «(pantalla)».
4. Los tipos canónicos de §G.3 fijan NOMBRES y FORMA de los campos. El redactor de §4 los escribe enteros con comentarios; ningún otro redactor añade, quita ni renombra campos: si le falta uno, lo propone.
5. Las decisiones que dan contenido a estos nombres están cerradas en `00-decisiones.md` (identificadores `D-nn`); los redactores no las reabren.

**Ensamblado v0.** Este glosario lleva fundidos los bloques «Propuesto para el glosario» de las veintidós secciones y las firmas que cambiaron al escribirlas; lo que se añadió va en filas o tablas marcadas con la sección o la decisión que lo trae, y el registro entero está en §G.14. Lo que una sección propone y §4, §13 o §15 aún no escriben va marcado «propuesto» (§G.3.8) y está en `dudas.md`.

**En el documento final** este glosario no viaja: cada una de sus partes G.1 a G.13 está en el sitio que dice la tabla del principio de §21.6 (apéndice F; decisión 21-f), y una remisión `§G.n` del cuerpo se escribe con ese sitio, o, donde contrasta una firma con la que fijó la síntesis, con la firma entera.

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
| etapa conocida | etapa vista (`W` directo, `S` resumen), revelada (`R`) o arrastrada (`A`): `WatchState.known` (10-e); la caducada (`X`) está fuera del velo pero no es conocida y abre en `Watch`, como la de una carrera fuera de guardia; lo conocido de una carrera es un prefijo 1..k, y `known_through` cuenta el prefijo de letras, `X` incluida |
| revelar | el acto explícito de conocer el resultado sin ver la etapa; no premia ni castiga |
| el arrastre | conocer la etapa N porque el jugador aceptó ver o revelar una posterior (letra `A`); la etapa arrastrada no se ha visto y abre en `Watch`, con `Report` a un toque, como la caducada (6-r) |
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
| la lápida | la fila de `stage_timelines` con `format = 0` de una etapa que se corrió con la grabación encendida y no dejó línea; la etapa abre en `Report` (5-k, §5.5) |
| la línea cortada | la línea con solo lo visible hasta una hora de carrera, sin reparto, tiempo ni meta (`TimelineCore`, lo que devuelve `cutTimeline`; 4-b) |
| el reparto servido | el reparto congelado ya degradado por el velo de quien mira (`veilCast`) y convertido en rótulos (`serveCast`; §7.8, §10.10) |
| la forma D | cómo consulta `computeHorizon`: los ids del espectador por delante, `rider_id = any(ids)` y la última etapa corrida de cada carrera una vez por día de juego (18-a, §18.2) |
| el sello | la posición del autor en una carrera, en segundos de carrera, que lleva el contenido de un jugador para E9 (`AuthorStamp`, 11-n) |
| la puerta de fuera | una pantalla o ruta que filtra un resultado sin estar entre las 48 superficies del mapa 03 (`sup. X1` a `sup. X11`, §11.2) |

---

## G.2 Ficheros nuevos y tocados

| Ruta | Qué contiene | Estado |
| --- | --- | --- |
| `packages/engine/src/stage/types.ts` | `StageProbe` gana tres métodos opcionales: `onEvent`, `onBanner`, `onTimeTrialRide` | tocado |
| `packages/engine/src/stage/events.ts` | `EventLog` gana un oyente opcional (`listen`) que ve cada `emit` con su bloque | tocado |
| `packages/engine/src/stage/simulate.ts` | cablea `onEvent`, llama a `onBanner` en `disputeBanner` (l. 9175) y `disputeClimb` (l. 9231) y pasa la sonda a `simulateTimeTrial` (hoy la ignora, l. 1264) | tocado |
| `packages/engine/src/stage/timetrial.ts` | llama a `onTimeTrialRide` al cerrar cada corredor | tocado |
| `packages/engine/src/sim/timeline.ts` | el grabador puro: `timelineRecorder`, `TimelineRecorderOptions`, `selfCheckI1`, `selfCheckI5`, `I1Mismatch`, `profileStripOf`, `freezeStageWeather`, `ttTraceOf` y la guarda de tipos (`SNAPSHOT_FIELDS`, `PROBE_HOOKS`, `CODES_MATCH`, `ORIGIN_OF_PREFIX`) (§4.3, §5.4) | nuevo |
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
| `packages/shared/src/broadcast/pageTitle.ts` | `pageTitle`, `stageReadyNotice`, `STAGE_KIND_WORDS` (`PreStageInfo` vive en `wire.ts`: 4-l) | nuevo |
| `packages/shared/src/jerseys.ts` | gana `ChampionTitle`, `WornJersey`, `Distinction`, `WornInput`, `wornJerseys`, `distinctions`, `notorietyOf`; `JerseyKind` sigue con tres valores | tocado |
| `packages/shared/src/news.ts` | `NewsPayload`, `newsPayloadSchema`, `renderNews`, `NEWS_VARIANTS` | nuevo |
| `packages/shared/src/render/variants.ts` | `Variant`, `pickVariant`, `TEMPLATE_REV` | nuevo |
| `packages/shared/src/contracts.ts` | `newsItemSchema` y `teamNewsItemSchema` ganan campos `.nullish()`; `stageReplaySchema` gana `watch`; `lastRaceResponseSchema` gana `ready`; `riderRaceReportSchema` gana `moments` (propuesto, 12-k); declara `stageGateSchema`, `watchStateSchema`, `preStageInfoSchema` y `switchModeSchema` detrás de `stageKindSchema`; NO reexporta `broadcast/wire.ts`: cualquier import de `wire.ts` en `contracts.ts` impide cargar el paquete (medido, 14-a) | tocado |
| `packages/shared/src/index.ts` | `healthSchema` (l. 20-28) gana `features`, opcional (14-l); reexporta `./broadcast/index.js`, `./news.js` y `./render/variants.js` (14-a) | tocado |
| `packages/db/src/schema.ts` | `stageTimelines`, `raceWatch`, `spoilerScopeEnum` y las columnas de §G.5 | tocado |
| `packages/db/src/timelines.ts` | el colector aparte y la escritura: `startStageTimeline`, `StageTimelineRun`, `recordStageTimeline` (no escribe), `stageTimelineRow`, `tombstoneRow`, `writeStageTimelineRows`, `TimelineTickLog` (con `recorded`, `failed`, `flush` y `summary`), `timelineTickLog`, `StageTimelineMeta` (con `tplRev`), `StageTimelineRow`, `TimelineFailure`, `TimelineFailureReason`, `TIMELINE_TOMBSTONE_FORMAT`, `TimelineUnavailableError`, `readStageTimeline`, `readStageTemplateRev` y `clearStageTimelineCache` (§5.3 a §5.6; salen en la corrección `StageTimelineRead`, 14-p, y `writeStageTimeline` y `writeStageTimelineFailure`, corrección de §5) | nuevo |
| `packages/db/src/cast.ts` | `buildTimelineCast` (el reparto congelado con procedencia) | nuevo |
| `packages/db/src/titles.ts` | `ChampionTitleSource`, `palmaresTitleSource` | nuevo |
| `packages/db/src/horizon.ts` | `Horizon`, `VeilDelta` y el resto de §4.10 salvo `GuardReason`, `SpoilerScope` y `StageGate`, que viven en `wire.ts` (4-k); `computeHorizon`, `horizonSummary`, `veilDelta`, `veilSql`, `throughStage`, `isVeiled`, `stageGateOf`, `stageGameDay`, `veilCast`, `worldHorizon`, `anonHorizon`, `lastRunStages` y `touchLastSeen` | nuevo |
| `packages/db/src/watch.ts` | `recordProgress`, `revealStage`, `setFollow`, `setSpoilerScope` | nuevo |
| `packages/db/src/stageRun.ts` | la envoltura de la sonda con el colector aparte; escribe `stage_timelines` en la misma transacción | tocado |
| `packages/db/src/news.ts` | `emitNews` guarda `seed`, `data`, `race_key`, `stage_day`, `tpl_rev` (y `text` hasta el reinicio) | tocado |
| `apps/api/src/spoiler.ts` | `SpoilerPolicy`, `SurfaceMechanism`, `RouteRegistry`, `registerSpoilerGuard` | nuevo |
| `apps/api/src/viewerCookie.ts` | `signViewerCookie`, `readViewerCookie` (`cs_viewer`) | nuevo |
| `apps/api/src/broadcastSource.ts` | `timelineForStage` (línea grabada o adaptador de la radio) | nuevo |
| `apps/api/src/routes/broadcast.ts` | cabecera, tramos, meta y acta | nuevo |
| `apps/api/src/routes/me.ts` | `/api/me/watch`, `/reveal`, `/follow`, `/spoiler-scope`, `/horizon` | nuevo |
| `apps/api/src/chronicle.ts` | `BuildChronicleOptions.live` | tocado |
| `apps/api/src/emails.ts` | `stageReadyEmail(p, ownRiderOnStartlist, url): MailBody` (11-d) | tocado |
| `apps/api/src/env.ts` | `BROADCAST_WATCH`, `SPOILER_MODE` (web) y `TIMELINE_RECORD` (web y tick); `PROGRESS_MIN_DELTA_S` (web, opcional: 15-j); `AUTO_TICK` (web, 18-k) | tocado |
| `apps/api/src/app.ts` | `@fastify/compress`; el fallback de la SPA inyecta título y `og:` neutros | tocado |
| `apps/web/src/pages/StageWatch.tsx` | la pantalla `Watch` | nuevo |
| `apps/web/src/components/broadcast/` | `FixedOverlay`, `GroupBar`, `ProfileStrip`, `CueCard`, `VoiceTicker`, `PlayerControls`, `StagePreviewCards`, `StageClosingCards`, `StageGateCard` | nuevos |
| `apps/web/src/domain/broadcast/player.ts` | reloj de reproducción, cola de rótulos, `Next action`, progreso | nuevo |
| `apps/web/src/domain/pageTitle.ts` | `usePageTitle` (único escritor de `document.title`) | nuevo |
| `apps/web/src/domain/stageJournal.ts` | gana los `case` de `puncture`, `mechanical`, `truce_granted`, `truce_denied` | tocado |
| `apps/web/src/queryClient.ts` | `rev` del horizonte en las claves; `clear()` al entrar y salir de la cuenta | tocado |

Añadidos al escribirse las secciones (fundidos en el ensamblado v0):

| Ruta | Qué gana | Dónde |
| --- | --- | --- |
| `packages/engine/src/stage/types.ts` | gana también `ProbeBanner` (lo que recibe `onBanner`) y `ProbeTimeTrialRide` (lo que recibe `onTimeTrialRide`) | §5.2 |
| `packages/engine/src/sim/raceRadio.ts` | `RadioGroupDetail` y `radioGroupDetails` (la capa de detalle antes de indexar, 5-g); exporta `STORED_PULLERS_MAX` y `NAME_WHOLE_GROUP_UP_TO` (15-c) | §5.4, §15.5 |
| `packages/engine/src/index.ts` | exporta `TIMELINE`, el grabador y sus tipos (§5.9), `NAME_WHOLE_GROUP_UP_TO` y `chaseReferenceIndex` (4a), `realRaceScenario` (4b, 17-j); deja de exportar `NewsKind`, `renderNews` y `NewsData` (4-p) | §5.9, §17.7 |
| `packages/shared/src/broadcast/timeline.ts` | gana `TimelineCore` y los cuatro redondeos del formato, `toDs`, `fromDs`, `toKm10` y `fromKm10` | §4.1, §4.2 |
| `packages/shared/src/broadcast/codec.ts` | gana `TimelineFormatError`, `storedTimelineV1Schema`, `ORIGIN_CODE` y `BANNER_CODE`; en la corrección L2, `SchemaMatches` (el atado de un esquema con su tipo en los dos sentidos), `STORED_MATCH`, `fromStoredV1` (privada) y los seis esquemas que el formato comparte con la red, que `wire.ts` importa de aquí: `stageRefSchema`, `championTitleSchema`, `wornJerseySchema`, `distinctionSchema`, `profileStripSchema` y `stageWeatherSchema` (4-x) | §4.3 |
| `packages/shared/src/broadcast/reduce.ts` | gana `clockMarksOf` (las marcas de un grupo por bloque) | §3.3, §4.4 |
| `packages/shared/src/broadcast/instant.ts` | gana `InstantContext`, `photoBlocksOf`, `groupLabelOf`, `isGroupRole`, `chaseRefOf` (exportada para el test de §15.5, 15-k) y las privadas `groupBlockAt`, `speedFrom`, `lastTwoMarks` y `originOf` | §3.3, §4.5, §6.3 |
| `packages/shared/src/broadcast/cut.ts` | gana `TimelineVisibility` | §4.6 |
| `packages/shared/src/broadcast/reveal.ts` | gana `RevealRule`, `TT_REVEAL_RULES`, `RevealInput` y `RecorderView` | §4.7 |
| `packages/shared/src/broadcast/wire.ts` | gana `GuardReason`, `SpoilerScope`, `StageGate` y `PreStageInfo` (4-k, 4-l), `TimelineEventWire`, `MISHAP_CODE`, `PULL_MOTIVE_CODE`, `WatchMode` y `watchModeSchema`, y los esquemas de entrada de §14.2: `stageQuerySchema`, `chunkQuerySchema`, `watchProgressBodySchema`, `finishBodySchema`, `revealBodySchema`, `followBodySchema`, `spoilerScopeBodySchema`, `watchResponseSchema`, `revResponseSchema` y `stageGateErrorSchema`; en la corrección L2, `WIRE_MATCH` (el otro sentido del atado de las cuatro respuestas nuevas, 4-x) | §4.10, §4.11, §14.2 |
| `packages/shared/src/broadcast/radio.ts` | gana `RadioNames` (la forma de `ChronicleNames`) | §4.13 |
| `packages/shared/src/broadcast/names.ts` | gana `PullingLine` (`in_turn` o `teams`, con el `motive` de cada equipo), `pullingLineOf`, `cardCaption`, `cardLineText`, `championTitleText`, `ordinal`, `gapText`, `listAnd` y `gapTrendLine`; en la corrección de §6, `breakRoundOf` y `PULL_MOTIVE_WORDS` (6-d, 6-m) | §6.4, §6.7, §7, §12.6 |
| `packages/shared/src/broadcast/cues.ts` | gana `cueClassOf`; en la corrección de §6, `isPresentation` y `aheadOfPeloton` (6-m) | §6.5, §6.7 |
| `packages/shared/src/broadcast/pace.ts` | gana `digestMinutes`, `ttPaceAt` y `ttPlaybackEstimateS` | §8.8, §9.4 |
| `packages/shared/src/broadcast/index.ts` | nuevo: reexporta `broadcast/` | §4.13 |
| `packages/shared/src/jerseys.ts` | gana `staticNotoriety` | §7.5 |
| `packages/shared/src/news.ts` | gana `abandonReasonSchema`, `ABANDON_WORDS` y `outFor`; no importa `contracts.ts` (14-a) | §12.8 |
| `packages/shared/src/render/variants.ts` | gana `fnv1a` | §12.7 |
| `packages/db/src/titles.ts` | gana `Queryable` (`Database | Tx`) | §7.4 |
| `packages/db/src/watch.ts` | gana `LETTER_OF_MODE`, `WatchKey`, `WatchRow`, `ProgressResult` y `readWatch` | §10.3 |
| `packages/db/src/news.ts` | `emitNews` con la firma de §12.8 y `newsNames` | §12.8 |
| `packages/db/src/economy.ts` | tocado: `creditRider` gana `ref?: StageRef` y `awardRacePrizes`, `ref: StageRef` | §13.5 |
| `packages/db/src/riders.ts` | tocado: `veiledRaceDays` y `veilDailyLog` | §11.13 |
| `packages/db/src/schema.ts` | los nombres de Drizzle `stageTimelines`, `raceWatch` y `spoilerScopeEnum`, y las restricciones `news_text_or_data`, `race_watch_follow`, `race_watch_how` y `race_watch_watching` | §13.2 a §13.4 |
| `packages/db/src/index.ts` | exporta `runOneStage`, `StageRunSpec` y `timelineTickLog`, para el mundo de B1 (7a) | §16.3, §17.10 |
| `packages/db/src/stageRun.ts`, `calendarRun.ts`, `tick.ts` | `StageRunSpec.timeline`, `CalendarDayOptions.timeline` y `RunTickOptions.timelineRecord`: el diario de grabación del tick baja hasta `runOneStage` (5-m) | §5.5 |
| `localStorage` de la web | `cs.adaptiveAsked` (la oferta adaptativa ya hecha, 10-b) y `cs.watch.<raceKey>.<day>` (el progreso del visitante, 11-p), siempre dentro de `try/catch` | §10.4, §11.10 |
| `packages/db/src/columnasVivas.test.ts` | tocado: la expresión pasa a dos o cuatro espacios y a `smallint` (13-a) | §13.7 |
| `apps/api/src/spoiler.ts` | gana `VeilSpec`, `RouteEntry`, `SpoilerGuardDeps`, `STATIC_ROUTES`, `StageAccessInput` y `stageAccessOf`; los métodos `request.viewer()`, `request.horizon()`, `request.spoilerApplies()` y `request.broadcastOn()`; `app.spoilerRegistry`; y la clave de ruta `config.veil` | §14.1, §14.5 |
| `apps/api/src/broadcastSource.ts` | gana `serveCast` y `estimatedHeadClock`, que se exporta para su test (`apps/api/src/broadcastSource.test.ts`, PR 2; cruzada de L9) | §3.8, §7.8 |
| `apps/api/src/chronicle.ts` | gana `LiveChronicle` (`untilS`, `stageKm`, `revealS`), las dos firmas de `buildChronicle` y `veilStoredRadio`; `PULLERS_KEPT`, copia exportada de `STORED_PULLERS_MAX` del 3a al 4b, atada por test (15-k) | §11.16, §12.2, §15.5 |
| `apps/api/src/voiceRoles.ts` | nuevo: `withGroupRoles` y `MAIN_GROUP_TEMPLATES`; las claves de datos `mainRole` y `groupRole`, que se anotan al leer y nunca se guardan | §12.6 |
| `apps/api/src/liveClusters.ts` | nuevo: `liveClusters` y `LiveCluster` | §12.3 |
| `apps/api/src/http.ts` | tocado: `sendGate` | §14.2 |
| `apps/api/src/spaShell.ts` | nuevo: `ShellMeta`, `SHELL_PATH`, `preStageInfoFor`, `shellMetaFor` e `injectShellMeta` | §14.10 |
| `apps/api/src/app.ts`, `apps/api/src/routes/health.ts` | `AppDeps.switches`, `AppDeps.viewerSecret`, `AppDeps.secureCookies`; `HealthRouteContext.features` | §14.6 |
| `apps/api/src/broadcastConstants.test.ts` | nuevo: las copias atadas por test (cinco, más `PULLERS_KEPT` hasta el 4b; 15-a, 15-k) | §15.5 |
| `apps/web/src/domain/broadcast/player.ts` | `ViewMode` (`'watch' | 'highlights' | 'digest'`, la curva; distinto de `WatchMode`), `PlayerPhase`, `Speed`, `PlayerState`, `PlayerContext`, `PlayerAction`, `PlayerEffect`, `REPORT_MODE`, `playerInit` y `playerStep` | §8.11 |
| `apps/web/src/domain/voice.ts` | nuevo: `inVoice` | §12.2 |
| `apps/web/src/domain/stageJournal.ts` | gana `groupNounOf`, `linesOf`, `variantSeed` y el tipo `Phrasing` | §12.6 |
| `apps/web/src/domain/raceTabs.ts` | `RaceTabId` gana `watch` y `report` y pierde `story`; `raceTabs(status, stageCount, known)`, `defaultRaceTab(status, stageCount, known)`, `oneDayStageTab(stageTab)`, que da `null` sin pestaña pedida, y `LEGACY_TAB` | §11.17 |
| `apps/web/src/domain/raceStages.ts` | nuevo: `StageRowState` y `stageRowState` | §11.5 |
| `apps/web/src/components/Jersey.tsx`, `apps/web/src/components/broadcast/` | `ChampionMark` (la señal provisional de campeón: la silueta de maillot con una estrella en el pecho y la bandera al lado, 7-h, Rdueno-012); `WornJerseyIcon` y `TimeTrialBoard` | §7.4, §9.5 |
| `apps/web/src/components/BottomNav.tsx` | `useHideBottomNav` (propuesta a E6) | §18.6 |
| `apps/web/src/api/broadcast.ts`, `watch.ts`, `horizon.ts`; `request.ts`; `queryClient.ts` | las funciones de §14.11; `GateError` y `RequestOptions.keepalive`; `HORIZON_KEYS`, `horizonKey` y `useHorizonRev` | §14.11 |
| `scripts/broadcast-fixtures.mjs`, `bench-tick.mjs`, `bench-pace.mjs`, `pl-truth.mjs` | los fixtures (con `--sizes`), B15, B17 y la verdad de la prueba de lectura | §16 |
| `apps/api/src/__fixtures__/broadcast/`, `apps/api/src/__fixtures__/spoilerWorld.ts` | las seis etapas congeladas (`<etapa>.timeline.gz`, `.events.json.gz`, `.radio.json.gz`, `.i1.json.gz`, `.acta.json.gz`, `manifest.json` y `load.ts` con `FIXTURES` y `loadTimeline`); el mundo de B1 (`startSpoilerWorld`, `SpoilerWorld`, `Swept`, `sweep`, `strip` con su token `[veiledDay]`, `normalize`, `routeOf`, `pendingFor`, `PENDING_ROUTES`, `B1B_WHITELIST` y `B1C_WHITELIST`) | §16.2, §16.3 |
| tests nuevos de §14, §16 y §17 | `apps/api/src/routes/broadcast.test.ts`, `me.test.ts`, `yesterday.test.ts`, `stageRoute.test.ts`, `spoilerCanary.test.ts`, `spoilerDiff.test.ts`, `spoilerOutcomes.test.ts`, `spoilerRegistry.test.ts` (inventario desde el paso 0, 17-b), `broadcastCut.test.ts`, `broadcastFixtures.test.ts`, `broadcastPace.test.ts`, `voicePrefix.test.ts` y `radioAdapter.test.ts`; `packages/db/src/timelineCollector.test.ts`, `horizonLatency.test.ts`, `revealFree.test.ts`, `horizonReaders.test.ts` y `cast.test.ts`; `packages/engine/src/stage/probeHooks.test.ts`; `apps/web/src/domain/templateCoverage.test.ts`, `stageJournal.corpus.test.ts`, `broadcast/clientCost.test.ts`, `queryKeys.test.ts`, `components/broadcast/FixedOverlay.test.tsx` y `GroupBar.test.tsx` | §14.7, §16, §17 |
| `.github/workflows/ci.yml`, `cobertura.yml`, `eslint.config.js` | `timeline.test.ts` en el tramo «mundo y radio» (15-d); `CS_BANCOS: '1'` en el nocturno; la regla que impide al motor y al lado del grabador de `shared` leer `BROADCAST` y `SPOILER` (15-b) | §15.1, §16.7 |
| `packages/db/src/horizon.ts` (corrección) | `TtlMemo<V>`, el memo con vida, barrido y tope de los memos del proceso (10-m) | §10.7 |
| `apps/api/src/security.ts` | `PLAYER_RATE_LIMIT`, el límite propio del tramo y del progreso (14-q) | §14.5 |
| `apps/web/src/api/request.ts` (corrección) | `ApiError.retryAfterS`: el reproductor espera el `retry-after` de un 429 con `Loading` (14-q) | §14.11 |
| `apps/web/src/queryClient.ts` (corrección) | `<HorizonWatcher />`, `cacheOwnerChanged(prev, next)`, `SessionSeen` y `horizonKey(base, rev: string \| undefined)` (14-r) | §14.11 |
| `apps/web/src/api/results.ts`, `apps/web/src/api/results.test.ts` | `fetchCalendarStage(raceId, day, opts?: { readonly diag?: boolean })`, que reenvía `?diag=1` desde el 7b, y su test (14-s) | §14.11 |
| `packages/db/src/timelineCollectorBench.ts`, `timelineCollector.long1.test.ts`, `timelineCollector.long2.test.ts`, `watchConcurrency.test.ts`; `apps/web/src/domain/broadcast/breakPresentation.test.ts`; `apps/api/src/routes/lastRace.test.ts` | los bancos largos del colector, los dos dispositivos contra Postgres, la presentación de la fuga y la «Last race» a horizonte (corrección de §16) | §16.4, §17.21 |
| `apps/api/src/__fixtures__/spoilerWorld.ts` (corrección) | gana `serverErrors`, `SKIP`, `B1B_SKIP` y `B1B_VEIL` (§16.3); y `packages/db/src/testDb.ts`, `realTestDbFor(nombre)`, una base propia por test contra el Postgres de servicio | §16.3, §17.4 |

---

## G.3 Tipos canónicos

Los bloques siguientes fijan nombre y forma. `readonly` en todo lo guardado y servido. Los tipos de la red se escriben a mano, con `readonly`, y cada esquema Zod se ata a su tipo con `satisfies z.ZodType<T>` (decisión 4-j; `contracts.ts` l. 77 y 431); los esquemas viven en `broadcast/wire.ts`, salvo cuatro que declara `contracts.ts` (14-a). §4 escribe los tipos enteros y, donde este bloque y §4 difieren, manda §4; lo que las secciones proponen y §4 aún no escribe va marcado «propuesto» y está en §G.3.8.

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
  readonly knownWins: number                       // victorias (gc o stage) de carreras cuya fila gc de `palmares` tiene game_day ≤ día − `SPOILER.expiryGameDays`: fuera de todo velo (§D-26, 7-e)
}
export interface TimelineCast {
  readonly riders: readonly CastRider[]
  readonly teams: readonly CastTeam[]
  readonly favourites: readonly { readonly rider: RiderIx; readonly why: 'sprint' | 'hills' | 'climb' | 'tt' | 'cobbles' }[]   // los previewAttrTop mejores por el atributo del tipo de etapa, con los de rider_attrs antes del aprendizaje de la etapa (8-g, 4-u)
}

export interface TimeTrialTrace {                  // la crono (I-08); `onTimeTrialRide`
  readonly order: 'gc' | 'bib'
  readonly intervalS: number
  readonly checksKm: readonly number[]             // los de `ttSplitChecks` (constants.ts l. 6177-6179)
  readonly startDs: readonly Ds[]                  // por RiderIx
  readonly kmClockDs: readonly (readonly Ds[])[]   // por RiderIx: reloj propio en cada km entero y en meta, percance incluido; la de meta vale 10 · Math.round(tS) (9-a)
  readonly checkClockDs: readonly (readonly Ds[])[] // por RiderIx, reloj propio en cada control de checksKm, 10 · Math.round(raw[idx] · noise): el splitS de tt_split (9-b, 4-u)
  readonly mishaps: readonly { readonly rider: RiderIx; readonly km: number; readonly kind: MishapKind; readonly lostDs: Ds }[]
}

export interface FinishRecord {                    // SOLO para el paquete de meta
  readonly finishS: RaceS                          // llegada del primero (crono: la última llegada, 4-w)
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
export interface InTransit { readonly rider: RiderIx; readonly from: GroupIx; readonly to: GroupIx; readonly gap: GapReading }   // gap: el de from en el último km de foto en que iba en él (3-c, 4-t)
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
  readonly arrivals: readonly { readonly rider: RiderIx; readonly timeS: number }[]   // los llegados antes de t, por tiempo y hora de llegada (9-i, §4.5)
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
  readonly gender: 'M' | 'F'               // CastRider.gender: la concordancia de E10 en la web (D-62, 4-u)
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
export type RiderCueContext = 'attack' | 'break_round' | 'dropped' | 'banner' | 'focus' | 'own' | 'tt_round'   // tt_round: la ronda ON COURSE de la crono (9-k)
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
  | { readonly kind: 'tt_start_order'; readonly t: RaceS }                                                                                                              // crono, en t = 0, del plan público (9-d, 4-u)
  | { readonly kind: 'tt_split'; readonly t: RaceS; readonly check: number; readonly rider: RiderIx; readonly timeS: number; readonly rank: number; readonly deltaS: number | null; readonly board: readonly { readonly rider: RiderIx; readonly timeS: number }[] }   // 9-d, 4-u
  | { readonly kind: 'tt_finish'; readonly t: RaceS; readonly rider: RiderIx; readonly timeS: number; readonly rank: number; readonly deltaS: number | null; readonly hotSeat: boolean; readonly prev: RiderIx | null }   // 9-d, 4-u
export type CueKind = Cue['kind']
export type TemplateTarget = CueKind | 'voice_only' | 'report_only'
export type LiveLine = ChronicleEntry & { readonly revealS: RaceS }         // una línea de la voz
```

### G.3.5 El horizonte y el velo (`packages/db/src/horizon.ts`; `GuardReason`, `SpoilerScope` y `StageGate` viajan y viven en `broadcast/wire.ts`, 4-k)

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
  readonly tt: { readonly order: 'gc' | 'bib'; readonly intervalS: number; readonly checksKm: readonly number[] } | null   // la preparación pública de la crono, sin relojes (9-i, 4-u)
  readonly tplRev: number                          // la revisión de plantillas de la etapa: stage_timelines.tpl_rev; 0 con el adaptador (12-c, 4-u)
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
  readonly tt: { readonly starts: readonly number[]; readonly km: readonly number[]; readonly checks: readonly number[] } | null   // checks: tríos [rider, control, checkClockDs] (9-i, 4-u)
  readonly atFinish: boolean                       // el tramo llega al borde de la meta: lo siguiente es `POST …/finish`
}
export interface BroadcastFinish {                // `POST …/broadcast/finish`
  readonly arrivals: readonly { readonly gapS: number; readonly riders: readonly RiderIx[] }[]
  readonly result: readonly StageResultEntry[]     // con DNF y motivo, como hoy
  readonly closing: StageClosing
  readonly report: StageReport
  readonly news: readonly NewsItem[]
}
export type StageReport = StageReplay              // el acta: el `stageReplaySchema` de hoy (contracts.ts l. 1482-1533), con `watch` y `tplRev`, que gana en §14.2 (12-c)
export type WatchMode = 'play' | 'seek' | 'summary' | 'digest'   // el modo con que se llega a un punto: la letra de lo visto sale de él (LETTER_OF_MODE, §10.3; §14.2)
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
  | { readonly kind: 'contract'; readonly riderId: string; readonly toTeamId: string; readonly fromTeamId: string | null; readonly relocateCountry: string | null; readonly housingCovered: boolean }   // housingCovered: offer.payHousing, db/src/contracts.ts l. 328 (12-j, 4-u)
  | { readonly kind: 'retirement'; readonly riderId: string; readonly teamId: string | null; readonly age: number }
export type NewsKind = NewsPayload['kind']                  // los 11 de hoy más `gc_lead_taken` y `jersey_taken`
export interface StageReadyItem { readonly kind: 'stage_ready'; readonly raceId: string; readonly season: number; readonly stageDay: number; readonly gameDay: number }   // solo en lectura
export interface NameResolver { rider(id: string): string; team(id: string): string; race(raceId: string): string; country(iso2: string): string }
export interface Variant<D> { readonly since: number; readonly render: (d: D, n: NameResolver) => string }
```

### G.3.8 Lo que proponían las secciones y dónde quedó

Son campos y variantes que una sección necesitaba y no podía escribir en el bloque de otra. El ensamblado v0 los fundió aquí como propuestos; en la corrección (lote L2, decisión 4-u) §4 escribe enteros, con su procedencia, los que son de §4, y la última columna dice dónde está cada uno. Las formas de arriba (§G.3.1 a §G.3.7) son ya las finales.

| Nombre | Forma final | Lo pedía | Por qué | Dónde está |
| --- | --- | --- | --- | --- |
| `TimelineCast.favourites` | `readonly { rider: RiderIx; why: 'sprint' \| 'hills' \| 'climb' \| 'tt' \| 'cobbles' }[]` (la síntesis la proponía `RiderIx[]`) | §8 (8-g) | la previa de la N con los atributos de la N congelados antes del aprendizaje; sin él B1c nace en rojo | §4.2 y su esquema en §4.3 (formato 1, PR 4b); lo llena `buildTimelineCast` (§5.4, §7.8; PR 5) |
| `TimeTrialTrace.checkClockDs` | `readonly (readonly Ds[])[]` | §9 (9-b) | el tablero de la crono igual a `bestChain` y a cada `tt_split` | §4.2, §4.3, I5 en §4.4; PR 4b |
| `TimelineVisibility.ttCheckDs` | `readonly (readonly Ds[])[] \| null` | §9 | la hora de visibilidad de cada paso por control | §4.6 |
| `BroadcastHead.tt` | `{ order; intervalS; checksKm } \| null` | §9 (9-i) | la previa, el ritmo y los saltos de la crono antes de que salga nadie | §4.11 |
| `BroadcastChunk.tt.checks` | tríos `[rider, control, checkClockDs]` | §9 (9-i) | los pasos por control, visibles a su hora | §4.11; los llena `chunkOf` (§4.6) |
| `Cue` `tt_start_order`, `tt_split` y `tt_finish` | las tres de §G.3.4, con `timeS`, `board` y `prev` además de lo que se proponía | §9 (9-d) | los rótulos de la crono en la misma cola que los de carretera | §4.9; su clase, en `CUE_CLASS` y `cueClassOf` de §6.5 |
| `TimeTrialInstant.arrivals`, `RiderCueContext` `tt_round` | `readonly { rider; timeS }[]`; `'tt_round'` | la corrección de §9 (9-i, 9-k) | el tablero de llegados, el puesto de `FINISH` y la ronda `ON COURSE` de clase 0 | §4.5, §4.9 |
| `stage_timelines.tpl_rev` | `smallint not null`, sin defecto (13-j) | §12 (12-c) | la revisión de plantillas de cada etapa, para la semilla neutra; la escribe `recordStageTimeline` y la lee `readStageTemplateRev` | §13.3, escrita ya en la `0044` (no es de §4) |
| `BroadcastHead.tplRev` | `number` | §12 (12-c) | ídem, por la red | §4.11 |
| `StageReport.tplRev` | `stageReplaySchema` + `tplRev` | §12 (12-c) | la revisión con que se redacta el acta | §14.2 (`StageReport` es `StageReplay`, §4.11) |
| `NewsPayload` `contract.housingCovered` | `boolean` | §12 (12-j) | el titular de hoy dice ` with housing covered` (`contracts.ts` l. 328) | §4.12 |
| `RiderCard.gender` | `'M' \| 'F'` | D-62 (la concordancia de E10) | la web recibe `RiderCard`, no `CastRider` | §4.8; lo copia `serveCast` (§7.8) |
| `riderRaceReportSchema.moments` | `ChronicleEntry[]`, opcional | §12 (12-k) | sustituye a `personalNarration` | §14.2 (no es de §4) |
| `riderRaceResultSchema.stagesToWatch` | un número, opcional | la corrección de §16 | la cuenta de etapas por ver de una carrera velada en los resultados de un corredor (`Race France · 3 stages to watch`, `sup. P4`); B1b la quita con el token `[toWatch]` | §14.2, §16.3 (no es de §4) |

---

## G.4 Funciones canónicas

Las firmas finales, como quedaron al escribirse las secciones: donde la síntesis fijó otra, manda la de la sección, y la columna «Cambió» dice qué decisión la cambió (fundido en el ensamblado v0; el apéndice F de §21.6 lleva las principales).

| Firma | Fichero | Qué hace | Cambió |
| --- | --- | --- | --- |
| `timelineRecorder(opts: TimelineRecorderOptions): TimelineRecorder`, con `lengthKm` y `timeTrial` además de `blocks`, `dx`, `radioBlocks` y `riderIds` | `engine/src/sim/timeline.ts` | recibe `onSnapshot` de cada bloque, `onEvent`, `onBanner`, `onTimeTrialRide` y los percances; guarda dos fotos a la vez y emite sucesos de estado | 5-e |
| `TimelineRecorder.finish(input: RecorderFinishInput): StageTimeline` | ídem | cierra la línea con el reparto, el tiempo, el perfil y la meta | no |
| `selfCheckI1(tl: StageTimeline, kmPhotos: ReadonlyMap<Block, readonly SnapshotRider[]>): readonly I1Mismatch[]` | ídem | autocomprobación al grabar contra las fotos del motor, con la tolerancia de igual reloj extendida al `kind` (§D-12) | 5-i (antes recibía `RadioKm`) |
| `selfCheckI5(tl, output)` | ídem | I5 al grabar una crono: `kmClockDs[r].at(−1) = 10 · tiempoS` y `checkClockDs[r][c] = 10 · splitS` de cada `tt_split` de su primer protagonista; su elemento es `{ rider, check: number \| null, expectedDs, gotDs }` (null en la meta) | nueva (5-j) |
| `profileStripOf(profile, at)`, `freezeStageWeather(input, seed)` y `ttTraceOf(…)` | ídem | el perfil y el tiempo congelados; la traza de la crono | nuevas (5-o, §9.2) |
| `radioGroupDetails(…)` | `engine/src/sim/raceRadio.ts` | la capa de detalle antes de indexar, compartida por la radio y el grabador | nueva (5-g) |
| `encodeTimeline(tl: StageTimeline): StoredTimelineV1` y `decodeTimeline(s: unknown): StageTimeline` | `shared/src/broadcast/codec.ts` | inversas; `decodeTimeline` despacha por `format`, valida con `storedTimelineV1Schema` y lanza `TimelineFormatError`; la conversión del formato 1 es la privada `fromStoredV1(s: StoredTimelineV1): StageTimeline` | no (`fromStoredV1`, escrita en la corrección L2, 4-x) |
| `reducePhoto(p: Photo, e: StateEvent): Photo` | `shared/src/broadcast/reduce.ts` | el reductor, un `case` por variante | no |
| `photoAt(tl: TimelineCore, b: Block): Photo` | ídem | foto clave anterior más los sucesos hasta `b` | 4-b (`TimelineCore`) |
| `clockMarksOf(tl, g: GroupIx): readonly (readonly [Block, Ds])[]` | ídem | las marcas de reloj de un grupo por bloque creciente; se construye una vez por línea (§3.3, §4.4) | nueva (el primer borrador de §4.4 la llamaba `marcasDe`) |
| `instantAt(tl: TimelineCore, t: RaceS, ctx: InstantContext): Instant` | `shared/src/broadcast/instant.ts` | el corte diagonal, causal: solo usa datos con visibilidad ≤ `t` (adopta 3-a, 3-b, 3-c, 3-e y 3-f, decisión 4-t) | 4-b |
| `photoBlocksOf(lengthKm: number, dx: number): readonly Block[]` | ídem | los bloques de las fotos de km, sin repetidos (copia de `radioKmPoints`, atada por test, §15.5) | nueva (4-o) |
| `groupRoleOf(road, racing): readonly GroupRole[]`, `groupLabelOf(size, members, jerseys, role, groupsCount): GroupLabel` y `mainGapOf(…, markAt)` | ídem | el papel, la etiqueta y la diferencia principal | 6-a; `mainGapOf` gana `markAt(g, photoKm)` |
| `isGroupRole(x: unknown): x is GroupRole` y `GROUP_ROLES` | ídem | guarda de tipo del papel que llega en `datos` | nueva (§12.6) |
| `timeTrialInstantAt(tl: TimelineCore, t: RaceS, ctx: InstantContext): TimeTrialInstant` | `shared/src/broadcast/timeTrial.ts` | el estado de la crono en `t` | 4-b |
| `visibilityOf(tl: TimelineCore): TimelineVisibility` | `shared/src/broadcast/cut.ts` | la hora de visibilidad de cada dato (§D-06) | 4-b |
| `cutTimeline(tl: TimelineCore, toS: RaceS): TimelineCore` | ídem | la línea cortada: solo lo visible hasta `toS`, sin reparto, tiempo ni meta (B9) | 4-b, 4-r |
| `chunkOf(tl: TimelineCore, fromDs: Ds, toDs: Ds): Omit<BroadcastChunk, 'lines'>` | ídem | el tramo sin la voz, que pone la ruta (§14.3) | 4-r |
| `revealSOf(e: RevealInput, source: number, bEmit: Block, tl: RecorderView): RaceS` | `shared/src/broadcast/reveal.ts` | aplica `REVEAL_RULES` (`TT_REVEAL_RULES` en crono); `incident` (la caída, y el pinchazo y la avería de carretera) con el grupo en que iba el corredor al final de `b − 1` | 4-r (gana `source`); 4-v (`incident`) |
| `cuesBetween(prev: Instant, next: Instant, events: readonly TimelineEvent[]): readonly Cue[]`, `cueClassOf(cue, start, lastVirtualLeader, timeTrial): CueClass`, `isPresentation(cue: Cue): boolean` y `aheadOfPeloton(i: Instant, r: RiderIx): boolean` | `shared/src/broadcast/cues.ts` | los rótulos que produce el paso de un instante al siguiente (los demás los programa el reproductor, 6-i) y su clase; si un rótulo es de la presentación de la fuga, que va reservada en la cola, y si un escapado sigue por delante del grupo con el título de pelotón (6-m) | `cueClassOf` nueva (6-g); gana `timeTrial` (9-n); `isPresentation` y `aheadOfPeloton`, nuevas en la corrección de §6 (6-m) |
| `paceAt(toGoKm, zones)`, `playbackEstimateS(profile, zones)`, `digestPace(profile: ProfileStrip, kind: StageKind): readonly PaceZone[]`, `digestMinutes(kinds: readonly StageKind[]): number`, `ttPaceAt(t, plan, lastKmFromS)` y `ttPlaybackEstimateS(profile, plan): number` | `shared/src/broadcast/pace.ts` | las curvas y las duraciones, siempre con velocidades nominales | `digestMinutes`, `ttPaceAt` y `ttPlaybackEstimateS`, nuevas (8-b, 9-h) |
| `radioFromTimeline(tl, names: RadioNames): RaceRadio` | `shared/src/broadcast/radio.ts` | el microscopio desde la línea, con el contrato de hoy (B16); acepta una línea cortada (11-i); en una crono, la radio vacía | `RadioNames` gana los corredores del espectador y `nameableAt` (12-o) |
| `groupLabelText(_locale, …)`, `breakHeadline(_locale, cards: readonly RiderCard[], ownIx: ReadonlySet<RiderIx>): string`, `namedRidersOf(g, cast, revealed, …)`, `pullingLineOf(detail, members, cast): PullingLine` (con el `motive` de cada equipo), `breakRoundOf(riders: readonly RiderIx[], cast: readonly RiderCard[]): readonly RiderIx[]`, `championTitleText(_locale, t, n)`, `cardCaption(worn, n)`, `cardLineText(d, n)`, `ordinal(n)`, `gapText(s)`, `listAnd(xs: readonly string[]): string` y `gapTrendLine(_locale, trend)`; `GROUP_WORDS` (el maillot en pares [barra, voz]) y `PULL_MOTIVE_WORDS` | `shared/src/broadcast/names.ts` | el vocabulario único, la frase de la fuga, la ronda de la moto, a quién se nombra, los que tiran y los textos del rótulo | nuevas las de §6.4, §7 y §12.6; `_locale` delante (12-q); `breakRoundOf`, `PULL_MOTIVE_WORDS` y el `motive` (corrección de §6) |
| `wornJerseys(input: WornInput): ReadonlyMap<string, WornJersey>`, `distinctions(riderId, input, worn, start, …, gcLineTop)`, `notorietyOf(card, instant): NotorietyLevel` y `staticNotoriety(worn, lines, knownWins, category)` | `shared/src/jerseys.ts` | la regla UCI (§D-24) y la notoriedad | `distinctions` recibe `gcLineTop` (7-g); `staticNotoriety` nueva |
| `pageTitle(_locale, p: PreStageInfo \| null, page: PageKind): string` y `stageReadyNotice(_locale, p: PreStageInfo, ownRiderOnStartlist: boolean): { subject: string; text: string }` | `shared/src/broadcast/pageTitle.ts` | títulos y avisos que no pueden llevar resultado por tipo | `_locale` delante (12-q); `PreStageInfo` vive en `wire.ts` (4-l) |
| `renderNews(locale: 'en', p: NewsPayload, seed: string, rev: number, n: NameResolver): string` | `shared/src/news.ts` | la noticia al leer | no |
| `pickVariant<D>(seed: string, variants: readonly Variant<D>[], rev: number): Variant<D>` y `fnv1a` | `shared/src/render/variants.ts` | solo elige entre variantes con `since ≤ rev`; el hash de la semilla | `fnv1a`, nueva |
| `buildTimelineCast(tx, …): Promise<TimelineCast>` | `db/src/cast.ts` | el reparto congelado con procedencia, en el tick; lee además los ganadores de etapa hasta la N−1 y usa `gcLineTop`; congela `favourites` con los atributos de antes del aprendizaje de la etapa (8-g, 4-u) | la de §5.4 y §7.8 |
| `palmaresTitleSource: ChampionTitleSource` con `titlesOn(q: Queryable, worldId: string, gameDay: number): Promise<ReadonlyMap<string, readonly ChampionTitle[]>>` | `db/src/titles.ts` | el proveedor provisional de títulos (§D-25) | 7-k (`q: Queryable`) |
| `startStageTimeline(…)`, `recordStageTimeline(tx, run, log, ctx)` (no escribe), `stageTimelineRow(tl, meta): { row, bytes, jsonBytes }`, `tombstoneRow(meta, failure): StageTimelineRow`, `writeStageTimelineRows(tx, rows)`, `readStageTimeline(db, _h: Horizon, raceKey, stageDay): Promise<StageTimeline \| null>`, `readStageTemplateRev(db, _h: Horizon, raceKey, stageDay): Promise<number>` y `clearStageTimelineCache()` | `db/src/timelines.ts` | el colector aparte, la fila con gzip 9 y la lápida, su escritura de una vez por día y la lectura con el LRU; la lectura lanza `TimelineUnavailableError` ante una lápida | 5-d, 5-k, 5-p (`Horizon`); sin `StageTimelineRead` (14-p) |
| `computeHorizon(db, viewer: Viewer, world: WorldRef): Promise<Horizon>` y `horizonSummary(db, viewer, world): Promise<HorizonSummary>` | `db/src/horizon.ts` | en la forma D (18-a), memorizado por `(userId, currentDay, horizonRev)` `SPOILER.horizonMemoS` | forma D (18-a); `horizonSummary` nueva |
| `veilDelta(db, h: Horizon): Promise<VeilDelta>` | ídem | una consulta por fuente, solo filas veladas; memorizado con la clave del horizonte (18-c) | no |
| `clearHorizonCaches()` | ídem | vacía los memos del proceso (horizonte, `veilDelta` y la cuenta del día) para los tests y el reinicio | nueva (§10.6, corrección de §16) |
| `veilSql(h: Horizon, raceKey: SQLWrapper, gameDay: SQLWrapper \| null, stageDay?: SQLWrapper): SQL` | ídem | EL predicado único del velo; enlaza las listas con `sql.param` | 10-d |
| `throughStage(h, raceKey, lastRun): number`, `isVeiled(h, raceKey, stageDay): boolean`, `stageGateOf(h, raceKey, stageDay): StageGate \| null` y `stageGameDay(raceKey, stageDay): number` | ídem | sus gemelos para lo que va por número de etapa; la puerta; el día de juego de una etapa | `stageGateOf` y `stageGameDay`, nuevas |
| `veilCast(cast: TimelineCast, h: Horizon): TimelineCast` | ídem | el reparto degradado por el velo | nueva (§10.10) |
| `worldHorizon: Horizon` y `anonHorizon(): Horizon` | ídem | el del tick, la administración y los bancos; el del visitante | `anonHorizon`, nueva |
| `lastRunStages(db, world: WorldRef): Promise<ReadonlyMap<string, number>>` y `touchLastSeen(db, userId)` | ídem | la última etapa corrida de cada carrera, una vez por día de juego, como promesa que comparten las peticiones de ese día (18-a, 11-s); `users.last_seen_at`, como mucho una vez por hora | nuevas |
| `recordProgress(db, k, stageDay, reachedS, mode, finishS)`, `revealStage(db, k, stageDay, expired)`, `setFollow(db, k, follow)`, `setSpoilerScope(db, userId, scope, revealConfirm)` y `readWatch(db, k)`; `LETTER_OF_MODE` | `db/src/watch.ts` | las escrituras de `race_watch` y `users` (con `.set` de Drizzle, 13-a; como mucho una cada 15 s, 10-l) y la fila de una carrera | `readWatch`, nueva |
| `veiledRaceDays(h: Horizon, d: VeilDelta, riderId: string): ReadonlyMap<number, string>` y `veilDailyLog(rows, veiled): DailyLogRow[]` | `db/src/riders.ts` | los días de carrera velados y la serie de forma enmascarada | nuevas (§11.13) |
| `emitNews(tx: NewsWriter, opts: { worldId; gameDay; seed; payload: NewsPayload; raceKey?; riderId?; personal? }): Promise<void>` y `newsNames(db, payloads): Promise<NameResolver>` | `db/src/news.ts` | la noticia con semilla y datos; los nombres al leer | la de §12.8 |
| `creditRider(…, note, ref?: StageRef)` y `awardRacePrizes(…, gcOrder, ref: StageRef)` | `db/src/economy.ts` | el rastro de etapa del dinero | 13-e, 13-g |
| `registerSpoilerGuard(app, deps: SpoilerGuardDeps \| null): RouteRegistry` y `stageAccessOf(a: StageAccessInput): { serveResult: boolean; watch: WatchState \| undefined }` | `apps/api/src/spoiler.ts` | exige `config.spoiler` y `config.veil` en TODA ruta y lanza al arrancar si falta; qué sirve la ruta de etapa | 14-c, 14-d, 14-e (antes `deps: { db; mode }`) |
| `signViewerCookie` y `readViewerCookie` | `apps/api/src/viewerCookie.ts` | la cookie `cs_viewer` | no |
| `timelineForStage(db, h: Horizon, raceKey, stageDay): Promise<StageTimeline \| null>` y `serveCast(cast, h, names, ctx): readonly RiderCard[]` | `apps/api/src/broadcastSource.ts` | la grabada o el adaptador de la radio (la lápida da null y 404); el reparto servido | 14-p (`Horizon`); `serveCast`, nueva |
| `buildChronicle(events, names, options & { live: LiveChronicle }): LiveLine[]`; sin `live`, `ChronicleEntry[]` (la implementación devuelve `ChronicleEntry[] \| LiveLine[]`); y `veilStoredRadio(stored, nameableAt)` | `apps/api/src/chronicle.ts` | la voz (con `live`, ordenada por `revealS`, 12-a) y el acta (sin él); la radio guardada sin su lista de seguimiento | dos firmas (§12.2); `veilStoredRadio`, nueva (11-l) |
| `withGroupRoles(events, tl, revealS, ctx): ChronicleEvent[]` y `liveClusters(events, tl, revealS): readonly LiveCluster[]`, con `LiveCluster` = `{ event; revealS; members }` (el racimo, su hora de publicación y los sueltos que absorbe) | `apps/api/src/voiceRoles.ts`, `apps/api/src/liveClusters.ts` | el papel de cada grupo en la voz (antes de atar las horas, 12-n) y los racimos en vivo | nuevas |
| `stageReadyEmail(_locale, p: PreStageInfo, ownRiderOnStartlist: boolean, url: string): MailBody` | `apps/api/src/emails.ts` | la plantilla del correo; el envío es de E4 | 11-d (antes `(p, url): Email`); `_locale` delante (12-q) |
| `preStageInfoFor(db, raceId, stageDay, season)`, `shellMetaFor(db, h, url)`, `injectShellMeta(html, meta)` y `sendGate(reply, gate)` | `apps/api/src/spaShell.ts`, `apps/api/src/http.ts` | el título y las `og:` del fallback de la SPA; el 403 de la puerta | nuevas (§14.10, 14-h) |
| `usePageTitle(p: PreStageInfo \| null, page: PageKind): void` | `apps/web/src/domain/pageTitle.ts` | el único escritor de `document.title` | no |
| `playerInit(view, stageDay, reachedS, known)` y `playerStep(s, a, ctx)` | `apps/web/src/domain/broadcast/player.ts` | el reproductor, un reductor puro (8-q), con `PlayerState.idleS`, `stageDay` y `loaded`, `PlayerContext.digestNext`, las acciones `touch` y `throttled`, `cueAdmitted.round` y los efectos `finish` con `mode` y `release` | nuevas; `stageDay` y lo demás, en la corrección de §8 |
| `raceTabs(status, stageCount, known)`, `defaultRaceTab(status, stageCount, known)`, `oneDayStageTab(stageTab)`, que da `null` sin pestaña pedida, y `stageRowState(stage, winnerOf, runDays): StageRowState` | `apps/web/src/domain/raceTabs.ts`, `apps/web/src/domain/raceStages.ts` | las pestañas de carrera y qué enseña cada fila de `Stages` | nuevas (11-o) |
| `inVoice(line, unnamed)`, `groupNounOf(role)`, `linesOf(e)` y `variantSeed(e)` | `apps/web/src/domain/voice.ts`, `apps/web/src/domain/stageJournal.ts` | qué dice la voz y con qué palabra | nuevas (§12.2, §12.6) |
| `chronicleParts(_locale: 'en', e: ChronicleEntry, rev: number): ChroniclePart[]` y `chronicleLine(_locale: 'en', e: ChronicleEntry, rev: number): string` | `apps/web/src/domain/stageJournal.ts` | el renderizador común de la voz, `Commentary` y el acta, con la revisión de plantillas de la etapa | ganan `_locale` y `rev` en el paso 12 (12-q) |
| `useHideBottomNav(hidden: boolean): void` | `apps/web/src/components/BottomNav.tsx` | esconde la barra inferior mientras se reproduce; propuesta a E6 | nueva (18-f) |
| `stampReached(s: AuthorStamp, h: Horizon): boolean` | `packages/shared/src/broadcast/` | el sello de E9; se propone, no se implementa en E2 | nueva (11-n) |

Privadas que las secciones nombran: `groupBlockAt(cut, g, t, ctx)`, `speedFrom`, `lastTwoMarks` y `originOf(cut, g)` (el paso 2 de `instantAt` y sus auxiliares, en `instant.ts`, §3.3); `chaseRefOf(behind, mainFraction)` (copia de `chaseReferenceIndex`, en `instant.ts`, 6-a; deja de ser privada: se exporta para el test de §15.5, 15-k); `estimatedHeadClock(kms, totalKm, winnerS)` (el reloj de la cabeza del adaptador de la radio, en `broadcastSource.ts`, §3.8; deja de ser privada: se exporta para su test, `apps/api/src/broadcastSource.test.ts`, en el PR 2).

`PageKind` = `'watch' | 'report' | 'race' | 'rider' | 'team' | 'news' | 'rankings' | 'home' | 'other'`.

---

## G.5 Tablas, columnas, índices y migraciones

| Objeto | Columnas y claves | Migración |
| --- | --- | --- |
| `news` (existe) | gana `seed text`, `data jsonb` (`$type<NewsPayload>`), `race_key text`, `stage_day smallint`, `tpl_rev smallint`, todas nullable; `text` pasa a nullable; índice `news_race_stage_idx (world_id, race_key, stage_day)` | `0043_noticias_con_datos` |
| `stage_timelines` (nueva) | `race_id text` (la `raceKey`), `stage_day integer`, `game_day integer not null`, `format smallint not null`, `engine_version integer not null`, `finish_s integer not null`, `bytes integer not null`, `body bytea not null`, `created_at timestamptz default now()`; PK `(race_id, stage_day)`; índice `stage_timelines_day_idx (game_day)` | `0044_linea_temporal` |
| `race_watch` (nueva) | `user_id uuid` FK `users` cascade, `world_id uuid` FK `worlds` cascade, `race_key text`, `follow smallint not null default 0` (1 seguida, −1 soltada, 0 la regla), `known_through smallint not null default 0`, `how text not null default ''` (una `KnowledgeLetter` por etapa del prefijo, la caducada `X` incluida; 21-g), `watching_stage smallint`, `reached_s integer`, `updated_at timestamptz default now()`; PK `(user_id, world_id, race_key)` | `0045_lo_visto` |
| `spoiler_scope` (enum nuevo) | `guarded`, `own_only`, `off` | `0045_lo_visto` |
| `users` (existe) | gana `spoiler_scope spoiler_scope not null default 'guarded'`, `horizon_rev integer not null default 0`, `last_seen_at timestamptz`, `reveal_confirm boolean not null default true` | `0045_lo_visto` |
| `race_rosters` (existe) | gana el índice `race_rosters_rider_idx (rider_id)` | `0045_lo_visto` |
| `rider_points` (existe) | gana `stage_day smallint` nullable e índice `rider_points_race_stage_idx (race_id, stage_day)` | `0046_rastro_de_etapa` |
| `palmares` (existe) | gana `stage_day smallint` nullable | `0046_rastro_de_etapa` |
| `transactions` (existe) | gana `race_key text` y `stage_day smallint` nullable e índice `transactions_race_stage_idx (race_key, stage_day)` | `0046_rastro_de_etapa` |
| `stage_team_results` (existe) | gana `prize integer not null default 0` (lo escribe `awardRacePrizes`) | `0046_rastro_de_etapa` |
| `stage_timelines` | gana `tpl_rev smallint not null`, sin defecto (12-c, 13-j), escrita en la `0044` de §13.3 | `0044_linea_temporal` |
| nombres y restricciones | Drizzle: `stageTimelines`, `raceWatch`, `spoilerScopeEnum`; restricciones `news_text_or_data` (`0043`), `race_watch_follow`, `race_watch_how` y `race_watch_watching` (`0045`) (13-b) | |
| `stage_snapshots` (existe) | NO gana columnas (`tactica.md` l. 7589-7591); `radio` se sigue escribiendo hasta `DD-11` | ninguna |

Los números son los que tocan hoy (la última es `0042_transicion_e1`, `_journal.json` con 43 entradas); si otro documento llega antes, `drizzle-kit generate` desplaza el número y manda el nombre.

---

## G.6 Rutas

| Método y ruta | `config.spoiler` | Entra | Sale |
| --- | --- | --- | --- |
| `GET /api/races/:raceId/stages/:day` | `horizon` | `?season=`, `?diag=1` (solo administradores) | `StageReplay` de hoy; con la etapa velada, sin sus campos opcionales de resultado y con `watch: WatchState` |
| `GET /api/races/:raceId/stages/:day/broadcast` | `watch` | `?season=` | `BroadcastHead` |
| `GET /api/races/:raceId/stages/:day/broadcast/chunk` | `watch` | `?season=&fromDs=&toDs=` | `BroadcastChunk`; 409 `beyond_reached` si `toDs` pasa de lo alcanzado más la precarga |
| `POST /api/races/:raceId/stages/:day/broadcast/finish` | `watch` | `?season=`; cuerpo `{ mode: WatchMode }` (14-f) | `BroadcastFinish`; marca la etapa como vista o revelada con la letra de su modo (`LETTER_OF_MODE`) |
| `GET /api/races/:raceId/stages/:day/report` | `watch` | `?season=` | `StageReport`; 403 si está velada para ese espectador, con el formato único de error: `error` igual a la `k` de la puerta y `gate` al lado (`sendGate`, 14-h) |
| `POST /api/me/watch/:raceKey/:day` | `watch` | `{ reachedS: number; mode: WatchMode }` (acepta `sendBeacon`, y el mismo JSON en `text/plain`, 14-g) | `{ status: 'watching' \| 'known'; rev: string }`; 403 `previous_unseen` |
| `POST /api/me/reveal/:raceKey/:day` | `watch` | `{}` | `{ rev: string }` |
| `PUT /api/me/follow/:raceKey` | `safe` | `{ follow: 'follow' \| 'drop' \| 'default' }` | `{ rev: string }` |
| `PUT /api/me/spoiler-scope` | `safe` | `{ scope: SpoilerScope; revealConfirm?: boolean }` | `{ rev: string }` |
| `GET /api/me/horizon` | `horizon` | | `HorizonSummary` |
| `GET /api/news`, `GET /api/teams/:id/news` | `horizon` | | `newsItemSchema` con `payload`, `seed`, `tplRev`, `raceId`, `raceKey`, `stageDay` nuevos y `text` de compatibilidad |
| `GET /api/riders/me/last-race` | `horizon` | | la última etapa CONOCIDA; si la última corrida está velada, la tarjeta `Ready to watch` |
| `GET /health` | `safe` | | gana `features: { broadcastWatch: SwitchMode; spoilerMode: SwitchMode }` |

Toda ruta declara además su mecanismo, `config.veil` (`VeilSpec`, 14-d), y `GET /api/teams/me/race-plan` es `safe` (11-k). Códigos de error nuevos: `broadcast_off`, `broadcast_unavailable`, `not_seen`, `previous_unseen` y `beyond_reached` (§14.2).

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
| `TIMELINE.maxStoredBytes` | 98_304 | tope de `stage_timelines.bytes` en línea (B6): 1,4 veces el máximo medido con el formato de §4.3 (70,0 KB; §5.7). D-11 corregida; antes 49_152 |
| `TIMELINE.maxJsonBytes` | 655_360 | tope del JSON antes de gzip: medido de 123 a 464 KB (§5.7). D-11 corregida; antes 131_072 |
| `TIMELINE.medianJsonBytes` | 262_144 | mediana exigida en el banco de 24 etapas: medida, 222 KB (§5.7). D-11 corregida; antes 65_536 |
| `TIMELINE.ttMaxStoredBytes` | 49_152 | tope de una crono en `bytea`: 1,5 veces el máximo medido, la e10 de `race-italy` (42 km, 176 corredores): 31.436 bytes, y 32.203 con `checkClockDs` (15-i). Antes 32_768 (D-11 corregida en el v0) y 16_384 (síntesis) |

### `BROADCAST` (`packages/shared/src/broadcast/constants.ts`: la leen la API y la web; tocarla NO corre los bancos)

| Nombre | Valor | Intención |
| --- | --- | --- |
| `BROADCAST.pace` | `[{ aboveKm: 50, x: 60 }, { aboveKm: 20, x: 30 }, { aboveKm: 5, x: 12 }, { aboveKm: 1, x: 4 }, { aboveKm: 0, x: 1.5 }]` | la curva de `Watch` (producto §5); medida sin pausas 7:39-19:59 (§D-19) |
| `BROADCAST.summaryPace` | `[{ aboveKm: 50, x: 300 }, { aboveKm: 20, x: 120 }, { aboveKm: 5, x: 40 }, { aboveKm: 1, x: 10 }, { aboveKm: 0, x: 3 }]` | `Highlights`; medida 2:12-6:37 |
| `BROADCAST.digestBudgetS` | `{ llana: 60, media: 90, reina: 150, cri: 120, clasica: 150 }` | el digest de `While you were away`; fijo, no depende de lo que pasó; una gran vuelta son 38, 40 o 43 min con los cuadros, y el botón dice el número calculado (8-b, DD-22) |
| `BROADCAST.ttPace` | `[{ upToStarted: 0.6, x: 120 }, { upToStarted: 0.9, x: 40 }, { upToStarted: 1, x: 12 }]` | la crono por fracción de salidos; medida de 5:20 a 11:23 (una nacional de 40 km con 12 corredores, de 5:20 a 5:24; el prólogo de 176, de 6:24 a 6:33, y de 6:55 a 7:06 con el último km real; §9.4) |
| `BROADCAST.ttLastKmX` | 2 | el último km del último en salir |
| `BROADCAST.speeds` | `[0.5, 1, 2, 4]` | cuatro velocidades y ninguna más |
| `BROADCAST.nextActionSpeedup` | 20 | `Next action` acelera ×20 hasta el siguiente `Cue` de clase ≥ `nextActionMinClass` |
| `BROADCAST.nextActionMinClass` | 2 | |
| `BROADCAST.cueHoldS` | `[3, 4, 5, 6]` | segundos de pared por clase 0-3; no paran el reloj |
| `BROADCAST.cueQueueMax` | 3 | con la cola llena, los de clase 0 y 1 se descartan, salvo la presentación de la fuga, que no cuenta (6-m); nunca se frena la carrera |
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
| `BROADCAST.breakRoundEveryS` | 6 | la moto rodea la fuga: un rótulo de clase 2, reservado con la lista y la frase (6-m), por corredor de `breakRoundOf`, solo en `Watch` a ×½, ×1 y ×2 |
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
| `BROADCAST.nominalKmh` | seis bandas de km/h por pendiente, de 56 a 16 | velocidades nominales de `playbackEstimateS`; nunca las de la carrera (15-e, §15.3) |
| `BROADCAST.skippedMinClass` | 2 | clase mínima de los rótulos de `While you skipped` (15-e) |
| `BROADCAST.seekStepKm`, `seekFinalKm` | 5, 20 | los saltos de recorrido (15-e) |
| `BROADCAST.ttSeekStepS`, `ttSeekLastStarters` | 600, 20 | los saltos de la crono: `−10 min`, `+10 min` y `Last 20 starters` (9-g) |
| `BROADCAST.cueTopStart` | 5 | puesto de salida hasta el que la caída o el abandono son de clase 3 (15-e, 6-g) |
| `BROADCAST.previewCardS`, `previewGcTop`, `previewAttrTop` | 5, 3, 3 | la previa (15-e) |
| `BROADCAST.previewThreatsMax` | 3 | corredores que el cuadro de maillots de la previa nombra por maillot (§8.6) |
| `BROADCAST.closingCardS` | 6 | s de pared de cada cuadro del cierre (§6.11, §8.6); sin evidencia de los jueces |
| `BROADCAST.recapMaxCues` | 5 | rótulos de `While you skipped` y `Previously` (8-i) |
| `BROADCAST.cardRowsMax` | 5 | filas de un cuadro de diferencias, de la general virtual o de la lista de una fuga (dos corredores por fila) en el móvil (§6.7) |
| `BROADCAST.maxKnownStageGzipBytes` | 112.640 | tope de B6 para la respuesta de una etapa conocida con gzip (corrección de §16) |
| `BROADCAST.controlsHideS` | 3 | s de pared sin tocar tras los que los mandos y la barra de progreso se esconden mientras se reproduce; vuelven con cualquier toque, movimiento o tecla (8-p); sin evidencia de los jueces, la acepta la prueba de lectura |
| `BROADCAST.mainGapTopStart` | 3 | la referencia de la diferencia principal con el pelotón delante (15-e) |
| `BROADCAST.gcThreatTop` | 10 | nivel 5 de notoriedad (15-e) |
| `BROADCAST.chunkCacheMaxAgeS` | 3600 | `Cache-Control: private, max-age` de un tramo (15-e) |
| `BROADCAST.maxHeadGzipBytes`, `maxChunkGzipBytes`, `maxFinishGzipBytes`, `maxVeiledStageGzipBytes` | 16_384, 12_288, 40_960, 4_096 | los topes de red de B6, con gzip 6: umbrales de banco, no de escritura (16-h, §14.8) |
| `BROADCAST.decodedCacheEntries` | 16 | LRU de líneas decodificadas en la API: de 8 a 30 MB; con 64 eran de 33 a 121 (18-d) |

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
| `SPOILER.horizonMemoEntries` | 500 | tope de entradas de cada memo del proceso (`TtlMemo`: horizonte, `veilDelta` y sesión); sin evidencia de los jueces (10-m, §15.4) |
| `SPOILER.horizonBudgetMs` | 5 | p95 de `computeHorizon` en B14 |

---

## G.8 Interruptores (`apps/api/src/env.ts`, se cambian en Railway sin desplegar)

| Nombre | Valores | Defecto | Qué enciende |
| --- | --- | --- | --- |
| `BROADCAST_WATCH` | `off`, `admins`, `on` | `off` | la pestaña `Watch` y las rutas de retransmisión (`admins`: quien `isUserAdmin` da por administrador, `users.is_admin` o el correo de `ADMIN_EMAIL`, `adminUsers.ts` l. 53-61; §14.6) |
| `SPOILER_MODE` | `off`, `admins`, `on` | `off` | el velo (`off`: `Horizon` es siempre `world` o `anon`, como hoy) |
| `TIMELINE_RECORD` | `off`, `on` | `on` | que el tick grabe `stage_timelines` (en `envSchema` y `tickEnvSchema`) |
| `AUTO_TICK` | `off`, `on` | `on` | que el servicio `web` avance el mundo en su propio proceso, como hoy; `off` en `web` cuando existe el servicio `tick` (18-k) |
| `PROGRESS_MIN_DELTA_S` | entero, s de carrera | sin definir: manda `BROADCAST.progressMinDeltaS` | no apaga nada: sustituye al umbral de escritura del progreso, para frenar esa carga sin desplegar (en `envSchema`, servicio `web`; §15.8, 15-j) |

Los dos primeros viajan a la web en `/health.features`. `SwitchMode` = `'off' | 'admins' | 'on'`. No confundir `SPOILER_MODE` (del servidor) con `users.spoiler_scope` (del jugador).

---

## G.9 Bancos e invariantes

| Id | Nombre | Qué afirma |
| --- | --- | --- |
| I1 | la foto reducida es la foto del motor | en cada km de `radioKmPoints`, `photoAt` proyectada = `radioKmFrom` de la foto del motor, con la tolerancia de igual reloj en Ds extendida al `kind` (5-i: sin ella, 1 fallo en 8.656); medido 0 en 3.246 (estado) y en 8.656 (§5.5) |
| I2 | el instante coincide con la foto donde se mide | la igualdad en el km de foto, exacta; en tránsito, p90 ≤ 15 por etapa y ≤ 4 en el conjunto (16-b; el p90 ≤ 2 de la síntesis fallaba en 23 de 44 corridas) |
| I3 | claves y empaquetado | `clave(k + 10) = reducción de clave(k)`; `decodeTimeline(encodeTimeline(tl)) = tl` |
| I5 | la traza de la crono cuadra con el resultado | `kmClockDs[r].at(−1) = 10 · results[r].tiempoS`, igualdad exacta (9-a, 16-c); la salida en `startDs[r]`; y `checkClockDs[r][c] = 10 · splitS` de cada `tt_split` del motor (9-b, §4.4) |
| B1a | canario | ningún valor plantado en campos que la API sirve (el tiempo, un premio insertado, los puntos, el `detail` del palmarés y la etapa de las noticias) sale en ninguna respuesta, y ninguna da un 5xx; el nombre del ganador no sale en el título, las `og:`, el correo ni el aviso (16-d) |
| B1b | diferencial | correr la etapa no cambia un byte para quien no la ha visto, salvo la lista blanca con motivo |
| B1c | dos desenlaces | dos semillas con desenlaces distintos dan respuestas idénticas byte a byte |
| B1d | política completa | toda ruta declara `config.spoiler` y `config.veil`; si no, no arranca; el fichero nace en el paso 0 como inventario y es B1d en el 8a (17-b) |
| B2 | estado contra sucesos | tamaño, hueco y protagonistas de `front_group`, `time_gap`, `breakaway_formed`, `breakaway_caught`, `peloton_split`, `peloton_selection` contra `instantAt(revealS)` |
| B3 | el rótulo y los maillots de la fuga | todo grupo de hasta 12 se nombra entero, cada nombrado con su maillot resuelto, con cláusula de no vacío; en los mayores, nombrados más contados son el tamaño; y la presentación de la fuga, entera (100 %) |
| B4 | re-render | noticia, voz y acta idénticas desde `seed + data` |
| B5 | estabilidad | hash de un corpus congelado; añadir una variante no reescribe el pasado |
| B6 | tamaño | `stage_timelines.bytes` (el `bytea` del banco) y el JSON contra `TIMELINE` (D-11); cabecera, tramo, meta, etapa velada y etapa conocida contra los cinco topes de red de `BROADCAST` (16-h) |
| B7 | cobertura | toda plantilla que emite el motor tiene render de voz y de acta, regla de `REVEAL_RULES` y destino en `CUE_OF_TEMPLATE` |
| B8 | cliente | parse y Zod: mediana ≤ 2 ms el tramo mayor y ≤ 3 ms la cabecera; `instantAt`, con el paso 9 memorizado por `(g, k_g)`, p95 ≤ 0,25 ms en la etapa entera a pasos de 1 s y en el tramo de más grupos de la e20; umbrales fijos (16-m, 18-l); mide también `withGroupRoles` y la ruta de una etapa conocida |
| B9 | corte causal | `instantAt(cutTimeline(tl, T), T) = instantAt(tl, T)`; todo dato de un tramo tiene visibilidad ≤ su `toDs`; el ritmo no depende de los sucesos |
| B10 | foto por km y aprendizaje | `trabajaronParaOtro` y la radio ven las mismas fotos que hoy, en las 22 etapas en línea de las 24 |
| B11 | observar no toca la carrera | huella idéntica en `results`, `events`, `efforts`, `incidents` con sonda en cada bloque, `onEvent`, `onBanner` y `onTimeTrialRide` |
| B12 | aritmética del horizonte | prefijo, arrastre, caducidad, fuentes de guardia, alcances, cookie que solo restringe; veinte casos, y dos dispositivos contra Postgres |
| B13 | procedencia | ningún campo del reparto con `from` velado viaja |
| B14 | latencia del horizonte | `computeHorizon` y `recordProgress` por separado, p95 ≤ `SPOILER.horizonBudgetMs` con 250.000 filas de `race_rosters`; contra el Postgres de servicio del CI (base propia con `TEST_DATABASE_URL`): el jugador y `recordProgress`, puerta en la rápida; en PGlite, solo informa y falla por encima de 15 ms; el mánager de un equipo de 30, desde Railway contra una copia de producción en el paso 7 (16-k, 18-j, DD-21) |
| B15 | coste del tick | los días 176 (187 cronos nacionales) y 179 (153 nacionales en línea) enteros, sub-23 incluidos, con grabador, `buildTimelineCast` y escritura: falla con más de un 25 % y más de 15 s a la vez, o con una lápida (16-l) |
| B16 | radio desde la línea | `radioFromTimeline` = `buildRaceRadio(radioForStorage(radio, ∅, []))` en la capa de detalle (5-g), en las 22 etapas en línea; con la lista de la etapa conocida y los propios (R23.7); en una crono, la radio vacía; la larga, en el nocturno de `apps/api` (17-l) |
| B17 | ritmo medido | la duración de cada curva en las 24 etapas, dentro de sus bandas |
| B18 | el servidor no adelanta | un tramo más allá de lo alcanzado más la precarga da 409 |
| B19 | la voz es prefijo | la voz en `t` es prefijo exacto de la voz en `t + 30 s` (0 en 15 corridas, ingeniero; 0 en 18 con el `revealS` real, §12.2) |
| B20 | revelar sin castigo | ningún premio, logro, moral ni dinero lee `race_watch` |
| B21 | posición del instante | error de la posición extrapolada contra la línea entera (informativo, §D-04) |
| B22 | reloj estimado | error del adaptador de la radio contra la línea grabada en las mismas etapas: la cabeza, puerta; todos los grupos, informativo (16-s) |
| PL | prueba de lectura | un tercero responde sin ayuda las cuatro preguntas de SPEC §6.15 en tres puntos de tres etapas, y con una fuga de 4 a 12 delante, dos más: qué lleva cada uno y quién tira detrás y por qué (16-w) |

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
| Paso 11 | La radio desde la línea | 11a (`radioFromTimeline`, B16 y la pestaña que lee la línea) y 11b (deja de escribirse `stage_snapshots.radio`), 17-v |
| Paso 12 | Cierre: semilla neutra, narradores y documentos | 12 |

Los PR con nombre propio (§17.2): 8a (mecanismos P, F, G y N) y 8b (R y M), el horizonte en toda la API; 9a, la web de la etapa; 9b, la web del mundo; 10a, montaje y modos; 10b, aceptación y encendido.

---

## G.11 Términos de pantalla (inglés, «(pantalla)»)

| Contexto | Texto |
| --- | --- |
| Pestañas de una etapa vista o revelada | `Report` (por defecto), `Result`, `Classifications`, `Race Radio`, `Profile`, `Watch` |
| Pestañas de una etapa no conocida, o arrastrada | `Watch` (por defecto), `Profile` (sin marcas); en el velo, las demás enseñan la puerta; fuera del velo, o con la letra `A`, a un toque (6-r) |
| Etapa aún no corrida | `Preview`, `Profile` |
| Portada | `Continue watching`, `Ready to watch`, `While you were away` |
| Grupos (vocabulario único, §D-18) | `Lead group`, `Chase group`, `Bunch`, `Gruppetto`, `Bunch together`, `Race leader’s group`, `Points leader’s group`, `Mountains leader’s group`; tres o menos, por sus nombres |
| Voz (mismo vocabulario) | `the lead group`, `the chase group`, `the bunch`, `the gruppetto`, `the race leader’s group`, `the points leader’s group`, `the mountains leader’s group` |
| Capa fija | `54.3 km to go`, `3 laps to go`, `+2:14 ▲`, `s.t.`, `Bunch together`, reloj `3:12:40` |
| Barra | `1 · LEAD GROUP · 5`, `+0:45`, `+143 riders`, `+2 groups`, `Pulling: Team Beta (for 11 Sam Carter)` (el nombre, tal como está guardado, 7-a) |
| Tu corredor | `Your rider · in the bunch · +2:14`; con varios, `Your team · 1 in front · 5 in the bunch` (6-l) |
| Rótulos de suceso | `ATTACK`, `CRASH`, `PUNCTURE`, `MECHANICAL`, `CAUGHT`, `SPLIT IN THE BUNCH`, `ECHELONS`, `DROPPED`, `ABANDON`, `KOM`, `INTERMEDIATE SPRINT`, `VIRTUAL GC`, `FLAMME ROUGE`, `1 KM`, `STAGE WINNER`, `TIME CUT` (`PHOTO FINISH` no se usa: el motor no mide lo ajustado dentro de un grupo, 8-h) |
| Crono | `ON COURSE`, `SPLIT 1`, `SPLIT 2`, `FINISH`, `HOT SEAT`, `38 on course · 71 finished · 67 to start` |
| Rótulo de corredor | `Leader, general classification`, `Also leads the mountains`, `Points jersey (2nd in the classification)`, `Champion of Italy`, `Time trial champion of Italy`, `14th overall +4:02` |
| Frase de la fuga | `The mountains leader and the champion of Italy go clear with three others.`, `…with your rider Iñigo Arrieta and two others.`, `Five riders go clear.` |
| Mandos | `▶`, `❚❚`, `×½ ×1 ×2 ×4`, `Next action`, `−5 km`, `+5 km`, `Next climb`, `Final 20 km`, `Last km`, `Show result` |
| Saltos | `While you skipped`, `Previously` |
| Modos | `Watch`, `Highlights`, `Watch the race in 40 minutes` (el número se calcula: 38, 40 o 43 según la vuelta, 8-b, DD-22), `Key stages`, `Continue from stage 4`, `Show results` |
| Revelar | `Show the result of Stage 7? You won't be able to watch it without knowing.`, `Don't ask again`, `Watch anyway` |
| Puertas | `You haven't watched stage 6 yet` · `Watch stage 6` · `Highlights of stage 6` · `Show result of stage 6 and continue`; `This page shows the result of Stage 7. Watch it instead?` |
| Órdenes | `Stage 6 is waiting for you` · `Watch (about 9 min)` · `Show result` · `Give orders anyway` |
| Seguir | `Follow without spoilers`, `Stop protecting this race` |
| Agregados y listas | `World ranking · as you know it · 3 stages hidden · Manage`, `Results from 3 stages you haven't watched are hidden · Manage`, `Stage 7 of Race France is ready to watch`, `Race France · 4 stages ready to watch`, `Finished · ready to watch`, `After stage 9 of 21 · stages 10-12 ready to watch` |
| Caducidad y cookie | `Results of Race Italy are now shown (finished 16 days ago) · Watch the digest anyway`, `Sign in to see results as you know them` |
| Sin línea | `Recorded before full race data`, `Positions of the groups behind are estimated` (debajo del aviso, con el km de esos grupos escrito con `~`; §3.8, §6.2), `Broadcast unavailable for this stage` |
| Diagnóstico | `Diagnostic view · not counted as watched`; en la cabecera de `scripts/race-radio.mjs --db` con otra versión, `fuente: línea grabada · sin depósitos · una foto por km` (12-p) |
| Cierre | `Most kilometres out front`, `Next: Stage 8 · Watch` |
| Compartir | `Share to watch`, `Share the report` (marcado `Spoiler` en `og:description`) |
| Título de pestaña | `Stage 7 · Race France · Cycling Star`; `Stage 7 report · Race France · Cycling Star` |
| Correo | asunto `Stage 7 of Race France is ready to watch`; `187 km · mountain stage · your rider is on the start list`; botón `Watch` |
| Red | `Connection lost · Retry`; `You finished this stage on another device · Watch anyway · Show report` |
| Capa fija (§6.2) | `on the bunch` (y las demás referencias: `on the race leader’s group`, `on the chase group`), `Last lap · 8.2 km to go`, `850 m to go`, `Next: Côte des Terrasses · Cat. 3 · in 26.5 km` |
| Barra (§6.3, §6.4) | `↓ 3 dropping back`, `↑ 2 bridging across`, `+3 groups · 41 riders`, `Pulling: all 3 in turn`, `Pulling: both in turn`, `Pulling: 4 of 5 in turn`, `+2 teams`; los motivos de `PULL_MOTIVE_WORDS`: `alone`, `in the echelon`, `lead-out`, `working the break`, `chasing`, `just riding`, `for the stage`, `defending the jersey`, `for the GC`, `team duty`, `own tempo`, `for the points jersey`, `for the mountains jersey`, `sitting on`, `guarding the leader` |
| Tu corredor (§6.2, 6-l) | `Your rider · dropping back from the bunch`, `Your rider · bridging to the lead group`, `Your rider · out of the race` |
| Rótulos y cuadros de carretera (§6.5, §6.7) | `BREAKAWAY · 5 riders · +0:48 on the bunch`, `TIME CHECK · 98.5 km to go`, `+3 groups behind · 41 riders`, `CONTACT · 2 riders bridge across`, `3 of the 5 remain`, `BACK TOGETHER · 38 riders rejoin the bunch`, `FLAMME ROUGE · 1 KM`; causas del corte: `after a crash`, `in the crosswind`, `on the cobbles`, `on the climb`, `in the chase` |
| Rótulo de corredor (§7.1, §7.4) | `Leader, points classification`, `Leader, mountains classification`, `Also leads the points classification`, `Mountains jersey (3rd in the classification)`, `U23 time trial champion of Italy`, `Champion of the Netherlands`, `Won stage 3`, `Won stages 3 and 7` |
| Frase de la fuga (§7.6) | `The champion of Italy goes clear with four others.`, `Five riders go clear, two of them from Team Delta.`, `Your rider Iñigo Arrieta goes clear with four others.`, `Tom Hargreaves and Pierre Lambert go clear.`; `+143 riders` abre la lista del grupo |
| Modos y saltos (§8.1, §8.5) | `Highlights · about 4 min`, `Skipping to 20 km to go…`, `Loading`, `WHILE YOU SKIPPED`, `PREVIOUSLY` |
| Previa (§8.6) | `STAGE 18 · SUMMIT FINISH · 185 km`, `Cat. 2 climb`, `Intermediate sprint · km 129`, `3 laps of 14.2 km`, `+2 more climbs`, `WEATHER`, `dry`, `rain`, `rain from km 120`, `Wind 18 km/h`, `No wind`, `Crosswind: km 40-65`, `JERSEYS IN PLAY`, `closest:`, `Finish bonus: 10, 6, 4 s`, `45 points at stake today`, `within reach:`, `No mountain points today`, `Stage 1 · the stage winner takes the first leader’s jersey`, `FAVOURITES`, `General classification:`, `Sprinters`, `Puncheurs`, `Climbers`, `Time triallists`, `Cobbles specialists` |
| Llegada (§6.5, 6-o) | `same time (3 km rule)` |
| Cierre (§8.6) | `STAGE 18 · RESULT`, `(your rider)`, `GENERAL CLASSIFICATION · after stage 18`, `JERSEYS TOMORROW`, `FINAL JERSEYS`, `new`, `MOST KILOMETRES OUT FRONT`, `OUT OF THE RACE`, `Tomorrow`, `Final stage` |
| Crono (§9.4, §9.5, §9.7) | `2:55:00 · 22 on course · 66 finished · 88 to start`, `HOT SEAT · Jan Novák 39:27`, `Start order: reverse general classification, every 2:00 · 176 riders`, `Start order: race numbers, every 1:00 · 176 riders`, `ON COURSE · 62 Iñigo Arrieta (ES) · km 19.9 · +0:38 at split 2`, `fastest at split 1`, `SPLIT 1 · km 9 · …`, `FINISH · 62 Iñigo Arrieta 39:12 · 2nd · +1:08`, `FINISH · HOT SEAT · 71 Mads Olsen 38:04 · −1:23 on Jan Novák`, `VIRTUAL GC · after split 1 · …`, `PUNCTURE · 132 Tom Hargreaves · km 13`, `−10 min`, `+10 min`, `Last 20 starters`, `Last starter`, `Split 1 · km 9`, `The first leader’s jersey is decided today`, `Mads Olsen held the hot seat for 1:25:38` |
| Alcance del velo (§10.4, DD-16) | `Only protect your own races?`, `Switch`, `Keep protecting` |
| Superficies bajo el velo (§11) | `Race Radio · up to km 142 · as far as you've watched`, `Standings after stage 5 · Watch stage 6 to update`, `Your last race · Race France, Stage 8 · Ready to watch`, `Race France is under way · Stage 10 of 21 · Watch from the start`, `Your rider raced`, `Watch stage 10`, `Watch →`, `Report →`, `This also reveals stages 3 and 4.`, `Results stay hidden until you watch the stage.`, `Watch it here:`, `Stage 8 · Race France · Watch the race`, `Spoiler · Winner: …`, `Diagnostic view` |
| Títulos de pestaña de otras páginas (§11.8) | `Rider · Cycling Star`, `Team · Cycling Star`, `News · Cycling Star`, `Rankings · Cycling Star`; la ficha de carrera, `Race France · Cycling Star` y `21 stages` en la vista previa (14-k) |
| Voz (§12.5) | `Puncture for …`, `Mechanical trouble for …`, `A truce for …`, `No truce for …` (con sus seis motivos), `Crash in the gruppetto!`, `… are on the ground.`, `The gap has fallen by 40 seconds in five kilometres.` |
| Noticias (§12.8) | titulares `takes the overall lead`, `takes the points lead` y `takes the mountains lead`; etiquetas del feed `Leader`, `Jersey` y `Watch` |

---

## G.12 Identificadores del proceso

| Prefijo | Qué nombra | Dónde vive |
| --- | --- | --- |
| `I-01` a `I-49` | injertos únicos | `juicios/veredicto.json` → `injertos` |
| `O-01` a `O-32` | objeciones fundidas | `veredicto.json` → `objeciones` |
| `H-01` a `H-23` | huecos | `veredicto.json` → `huecos` |
| `X-01` a `X-24` | contradicciones de hecho entre propuestas, con la resolución de los jueces | `veredicto.json` → `contradicciones` |
| `D-01` a `D-62` | decisiones cerradas | `borrador/00-decisiones.md` |
| `DD-01` a `DD-29` | decisiones del dueño, con valor por defecto que es el que se implementa; `DD-21` a `DD-25` las dejaron las secciones y `DD-26` a `DD-29` la fase adversaria (§20.6); `DD-15` y `DD-19` se retiraron en la fase 5 y sus números no se reutilizan (20-g) | `00-decisiones.md` §DD y §20 del documento |
| `§0` a `§21` | secciones del documento final | `borrador/00-esqueleto.md` |
| `L1` a `L10` | lotes de redacción | `00-esqueleto.md` |
| `[DUEÑO n]`, `[DOC n]`, contradicción n | requisitos y contradicciones del mapa 05 §5 y §6 | `mapas/05-dueno-docs.md` |
| E1-E9, C1-C6, I1-I4, N1-N4, H1-H7, P1-P6, W1-W6, T1-T6 | las 48 superficies (en el documento se escriben `sup. E1`, etc., para no confundir `I1` con el invariante) | `mapas/03-web-superficie-destripe.md` §4 |
| X1-X11 | las once puertas fuera del inventario (en el documento, `sup. X1`); la décima, `sup. X10`, la añadió §11.2 (11-b), y la undécima, `sup. X11`, su corrección (11-r) | `propuestas/producto.md` §1.7 y §7.5; §11.2 |
| `0-a` a `21-g` | las decisiones que tomó cada sección en su bloque de cierre (234 al escribirse: 218 de §3 a §19 y 16 de §0, §20 y §21; más las de la fase adversaria) | el bloque «Decisión tomada aquí» de cada sección |
| `Rcodigo-nnn`, `Rcobertura-nnn`, `Rdueno-nnn`, `Rcoste-nnn` | los hallazgos de los cuatro refutadores de la fase adversaria | `refutaciones/hallazgos-*.json`; `correcciones-*.json` dice qué hizo con cada uno su lote |
| A1 a G3 | las citas y reglas del dueño del mapa 05 §2 (la B3 de los racimos, la C7 del vocabulario, la D7 de «cambia el race radio»); se citan por su letra y número, sin prefijo | `mapas/05-dueno-docs.md` §2; §0.6 |

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
| `marcasDe` (primer borrador de §4.4) | `clockMarksOf` |

---

## G.14 Lo que fundió el ensamblado v0

Los bloques «Propuesto para el glosario» de las secciones, uno por uno, y dónde quedó cada nombre. El ensamblado los quita del documento (`ensamblar.sh`) y los ficheros de sección los conservan como registro.

| Sección | Lo que proponía | Dónde quedó |
| --- | --- | --- |
| §0 | `DD-21` a `DD-25`; las reglas del dueño A1 a G3 como identificadores | §G.12 |
| §1, §2, §19 | nada | |
| §3 | `groupBlockAt`, `speedFrom`, `lastTwoMarks`, `originOf` (privadas); `clockMarksOf`, antes `marcasDe`; `estimatedHeadClock` (privada) | §G.2, §G.4, §G.13 |
| §4 | `TimelineCore` y los cuatro redondeos; `TimelineFormatError`, `storedTimelineV1Schema`, `ORIGIN_CODE`, `BANNER_CODE`; la guarda de tipos e `I1Mismatch`; `InstantContext`, `photoBlocksOf`; `TimelineVisibility`; `RevealRule`, `TT_REVEAL_RULES`, `RevealInput`, `RecorderView`; `TimelineEventWire`, `MISHAP_CODE`, `PULL_MOTIVE_CODE` y cuatro esquemas (que 14-a lleva a `contracts.ts`); `RadioNames`; `broadcast/index.ts` | §G.2, §G.4 |
| §5 | `ProbeBanner`, `ProbeTimeTrialRide`; `TimelineRecorderOptions`, `profileStripOf`, `freezeStageWeather`, `selfCheckI5`; `RadioGroupDetail`, `radioGroupDetails`, el `export` de `STORED_PULLERS_MAX`; los nombres de `timelines.ts`; `StageRunSpec.timeline`, `CalendarDayOptions.timeline`, `RunTickOptions.timelineRecord`; «la lápida» | §G.1, §G.2, §G.4 |
| §6 | `groupLabelOf`, `chaseRefOf` (privada), `markAt` de `mainGapOf`; `PullingLine`, `pullingLineOf`; `cueClassOf`; `cardRowsMax`, `closingCardS`; textos de la capa fija, la barra, tu corredor y los rótulos | §G.2, §G.4, §G.7, §G.11 |
| §7 | `cardCaption`, `cardLineText`, `championTitleText`, `ordinal`, `gapText`, `listAnd`; `staticNotoriety`; `Queryable`; `serveCast`; `ChampionMark`, `WornJerseyIcon`; textos del rótulo y de la frase de la fuga | §G.2, §G.4, §G.11 |
| §8 | `recapMaxCues`, `previewThreatsMax`, `closingCardS`; `TimelineCast.favourites` (propuesto); `digestPace` con su firma y `digestMinutes`; los tipos del reproductor; textos de modos, previa y cierre | §G.2, §G.3.8, §G.4, §G.7, §G.11 |
| §9 | `checkClockDs` y `ttCheckDs` (propuestos); `BroadcastHead.tt` y `BroadcastChunk.tt.checks` (propuestos); `tt_split` y `tt_finish` (propuestos); `ttPaceAt`, `ttPlaybackEstimateS`, `ttTraceOf`; `ttSeekStepS`, `ttSeekLastStarters`; `TimeTrialBoard`; textos de la crono | §G.2, §G.3, §G.3.8, §G.4, §G.7, §G.11 |
| §10 | `LETTER_OF_MODE`, `WatchKey`, `WatchRow`, `ProgressResult`, `readWatch`; `WatchMode`; `anonHorizon`, `stageGameDay`, `stageGateOf`, `horizonSummary`, `veilCast`, `touchLastSeen`; `horizonReaders.test.ts`; textos de la oferta adaptativa (la clave `cs.adaptiveAsked` de `localStorage`) | §G.2, §G.3.6, §G.4, §G.11 |
| §11 | `sup. X10`; `STAGE_KIND_WORDS`; `veiledRaceDays`, `veilDailyLog`; `veilStoredRadio`; `AuthorStamp`, `stampReached`; `RaceTabId`, `raceTabs`, `LEGACY_TAB`; `StageRowState`, `stageRowState`; la firma de `stageReadyEmail`; textos | §G.1, §G.2, §G.4, §G.11, §G.12 |
| §12 | `LiveChronicle` y las dos firmas de `buildChronicle`; `liveClusters`; `withGroupRoles`, `MAIN_GROUP_TEMPLATES`, `mainRole`, `groupRole`; `inVoice`, `groupNounOf`, `linesOf`, `variantSeed`, `Phrasing`, `isGroupRole`, `gapTrendLine`, `fnv1a`; `abandonReasonSchema`, `ABANDON_WORDS`, `outFor`, `newsNames`; `housingCovered`, `tpl_rev`, `tplRev` y `moments` (propuestos); la firma de `emitNews`; textos de la voz y del feed | §G.2, §G.3.7, §G.3.8, §G.4, §G.5, §G.11 |
| §13 | `stageTimelines`, `raceWatch`, `spoilerScopeEnum` y las cuatro restricciones; `creditRider` y `awardRacePrizes` con `ref` | §G.2, §G.4, §G.5 |
| §14 | los esquemas de entrada de `wire.ts`; `VeilSpec`, `RouteEntry`, `SpoilerGuardDeps`, `STATIC_ROUTES`, `StageAccessInput`, `stageAccessOf`, los métodos de la petición, `app.spoilerRegistry`, `config.veil`; `sendGate`; `spaShell.ts`; `AppDeps` y `HealthRouteContext.features`; los ficheros de la web; los tests; los códigos de error (sus scripts de medida, `l6/…`, son del scratchpad y no entran) | §G.2, §G.4, §G.6 |
| §15 | once constantes de `BROADCAST` (15-e) y `broadcastConstants.test.ts` | §G.2, §G.7 |
| §16 | los fixtures y los scripts; `spoilerWorld.ts`; los cuatro topes de red; `CS_BANCOS` y las exportaciones de `packages/db`; el token `[veiledDay]`; los ficheros de test | §G.2, §G.7, §G.9 |
| §17 | los nombres de los PR 8a a 10b; `cast.test.ts`; `FixedOverlay.test.tsx` y `GroupBar.test.tsx`; `spoilerRegistry.test.ts` como inventario desde el paso 0 | §G.2, §G.10 |
| §18 | `useHideBottomNav`; `lastRunStages` | §G.2, §G.4 |
| §20 | `DD-01` a `DD-25`; en la fase 5, `DD-26` a `DD-29` y la retirada de `DD-15` y `DD-19` | §G.12 |
| §21 | «la lápida», «la línea cortada», «el reparto servido», «la forma D» y «el sello»; las decisiones `3-a` a `21-e`; A1 a G3 | §G.1, §G.12 |

Firmas que cambiaron al escribirse y que este glosario ya lleva (§G.4): `timelineRecorder` (5-e), `selfCheckI1` (5-i), `readStageTimeline` y `timelineForStage` con `Horizon` (5-p, 14-p), `emitNews` (§12.8), `titlesOn` (7-k), `veilSql` (10-d), `registerSpoilerGuard` (14-c), `stageReadyEmail` (11-d), `chunkOf`, `cutTimeline` y `revealSOf` (4-b, 4-r), y `clockMarksOf` (antes `marcasDe`). Campos y constantes: `checkClockDs` (9-b, propuesto), `ttSeekStepS` y `ttSeekLastStarters` (9-g), los topes de `TIMELINE` (D-11 corregida) y `decodedCacheEntries` en 16 (18-d).

**Corrección L2 (fase 5, §4 y §15).** Tipos escritos con su forma final en §4 y aquí: `TimelineCast.favourites` (con `why`), `TimeTrialTrace.checkClockDs`, `TimelineVisibility.ttCheckDs`, `BroadcastHead.tt` y `tplRev`, `BroadcastChunk.tt.checks`, los `Cue` `tt_start_order`, `tt_split` y `tt_finish`, `TimeTrialInstant.arrivals`, el contexto `tt_round`, `RiderCard.gender` y `contract.housingCovered` (4-u); `SchemaMatches`, `STORED_MATCH`, `WIRE_MATCH`, `fromStoredV1` y los seis esquemas compartidos en `codec.ts` (4-x); la regla `incident` con el grupo de `b − 1`, también para `puncture` y `mechanical` de carretera (4-v); el borde de la meta de una crono en la última llegada y `tt_catches` en `finish` (4-w). Constantes y variables: `TIMELINE.ttMaxStoredBytes` en 49_152 (15-i), `PROGRESS_MIN_DELTA_S` (15-j), `chaseRefOf` exportada y `PULLERS_KEPT` atada (15-k); y `SPOILER.horizonMemoEntries` (500), que pide 10-m, escrita en §15.4.

**Corrección L10 (fase 5, §0, §20 y §21).** Fundidas aquí las cruzadas al glosario de L5, L6 y L7: `cueClassOf` con `timeTrial` (9-n), `listAnd(xs: readonly string[]): string`, `ChampionMark` como silueta con estrella (Rdueno-012), `readStageTimeline` y `timelineForStage` con `Promise<StageTimeline | null>` y sin `StageTimelineRead` (14-p), `liveClusters` con `LiveCluster`, `RadioNames` con los propios y `nameableAt` (12-o), `TtlMemo<V>`, `PLAYER_RATE_LIMIT`, `ApiError.retryAfterS`, `<HorizonWatcher />`, `cacheOwnerChanged`, `SessionSeen`, `horizonKey` con `rev` opcional y `fetchCalendarStage` con `diag` (G.2, G.4); los scripts de medida de la corrección (`c-l6/…`, `l10/…`) son del scratchpad y no entran. Y de L10: «etapa conocida» sin la caducada (10-e, 21-g), las pestañas de una etapa arrastrada (6-r), el nombre como está guardado en `Pulling:` (7-a), `DD-01` a `DD-29` con DD-15 y DD-19 retiradas (20-g), `sup. X11`, los identificadores de los hallazgos, y al principio de este fichero la regla de §21.6 para las remisiones `§G.n` en el documento final (21-f).

**Cierre de L10 (fase 5).** Las cruzadas al glosario que llegaron tarde, de L3, L4, L8 y L9, comprobadas una a una contra el texto de hoy: de L3, `stage_timelines.tpl_rev` `smallint not null` sin defecto (13-j, G.3.8 y G.5), las funciones de `timelines.ts` de la corrección de §5 (G.2 y G.4) y el `selfCheckI5` con `checkClockDs` (G.4); de L4, `isPresentation(cue)` y `aheadOfPeloton(i, r)` en `cues.ts`, que faltaban en G.4 y en G.2, `breakRoundOf` y `PULL_MOTIVE_WORDS` en `names.ts` (G.2), `PullingLine` con `motive`, `GROUP_WORDS.jersey` en pares, `playerInit` con `stageDay` y lo nuevo de `player.ts` (G.4), `controlsHideS` y los comentarios de `breakRoundEveryS`, `cueQueueMax` y `cardRowsMax` (G.7), y `Mountains leader’s group`, las tres palabras del grupo del maillot en la voz, las quince de `PULL_MOTIVE_WORDS` y `same time (3 km rule)` (G.11); de L8, lo del bloque de arriba (G.2, G.3.8, G.4, G.7, G.9 y G.11); y de L9, `Positions of the groups behind are estimated` (G.11), `estimatedHeadClock` exportada, también en la fila de `broadcastSource.ts` de G.2, que aún la llamaba privada, y el paso 11 en dos PR (G.10). Y para que el glosario diga lo mismo que las secciones de hoy: `BROADCAST.ttPace` medida de 5:20 a 11:23 con las nacionales de §9.4 (G.7; §15.3 lo recibe por cruzada), `race_watch.how` con una letra por etapa del prefijo, `X` incluida (G.5, 21-g), y «el arrastre» con la etapa arrastrada que abre en `Watch` (G.1, 6-r).
