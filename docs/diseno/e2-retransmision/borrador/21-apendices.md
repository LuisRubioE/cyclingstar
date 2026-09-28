## 21. Apéndices: injertos, objeciones, cobertura y vocabulario

Estos apéndices son la trazabilidad del documento y el material de partida de la fase adversaria. Nada de lo que hay aquí es nuevo respecto de las secciones 0 a 20: es el índice inverso, para que un refutador que llegue con una propuesta, un juicio, un requisito del dueño o una superficie en la mano encuentre en una fila dónde está resuelto y con qué decisión. Salen de `juicios/veredicto.json` (injertos, objeciones, huecos y contradicciones de hecho, con sus fuentes en los tres juicios), de las decisiones cerradas por la síntesis (`D-01` a `D-62`) y de las del dueño (`DD-01` a `DD-29`, §20), del mapa 05 §5 y §6, del mapa 03 §4 y de los bloques de cierre de cada sección, contrastados con el texto: cada injerto se ha buscado en el cuerpo de las secciones donde dice haber caído, no solo en su bloque «Injertos aplicados».

Son seis apéndices: A, los 49 injertos y dónde cayeron (21.1); B, las 32 objeciones y lo desestimado (21.2); C, los 23 huecos y las decisiones sin evidencia de los jueces (21.3); D, la cobertura del encargo, del dueño, de los documentos, de las superficies, de los maillots, de la crono y de E10 (21.4); E, las 24 contradicciones de hecho entre propuestas (21.5); y F, el vocabulario que no está en el cuerpo, con dónde queda cada parte del glosario de la síntesis (21.6).

### 21.1 Apéndice A · Los 49 injertos y dónde cayeron

**Cómo se lee.** La numeración `I-01` a `I-49` es la de `veredicto.json`, que fundió en 49 ideas sin repetidos los 51 injertos que pidieron los jueces (17 el de cobertura, 16 el del motor y 18 el de ejecutabilidad) y los que añadió el orquestador (once filas lo citan entre sus fuentes, y cinco solo a él). La columna Fuentes da los identificadores de los juicios (`cob 08` es `I-cobertura-08`, `mot` el juez del motor, `eje` el de ejecutabilidad). La columna Dónde cayó es la de los bloques de cierre de cada sección, comprobada en el cuerpo del texto buscando sus nombres (`reducePhoto`, `onBanner`, `veilSql`, `Pulling:`…) en las subsecciones que se citan: **los 49 están, y ninguno falta**. La última columna dice si entró entero o con qué cambio respecto de lo que pedía la propuesta, con la decisión que lo cambió.

Por propuesta de origen: 8 de `estado` (`I-01` a `I-08`), 9 de `datos` (`I-09` a `I-17`), 10 de `television` (`I-18` a `I-27`), 15 de `producto` (`I-28` a `I-42`) y 7 de la propia base, `ingeniero` (`I-43` a `I-49`), que los jueces pidieron conservar frente a las otras. Es la cuenta que explica por qué el documento es una fusión: la base aporta el plan y la voz, y el resto del cuerpo viene de las otras cuatro.

| I | Fuentes | De | Qué | Dónde cayó | Decisión | Entero o con cambio |
| --- | --- | --- | --- | --- | --- | --- |
| I-01 | orquestador, cob 08, cob 10 | `estado` §3.1-3.3, §3.7 | la línea temporal de estado (catálogo, fotos clave, sucesos de estado y narrables, capa de detalle), `reducePhoto`, `photoAt` y el corte diagonal `instantAt` | §3.1, §3.3; §4.2, §4.4, §4.5 | D-02 | con cambio: el corte extrapola desde la última marca en lugar de interpolar con la siguiente, que es futuro (D-04); el grupo recién nacido va a la velocidad de su origen (3-a); `GroupIx` por hora de nacimiento (4-a) |
| I-02 | cob 08, eje 05 | `estado` §3.9, §11 | invariantes I1, I2, I3 e I5 y la autocomprobación de I1 al grabar | §4.4; §5.5, §5.10; §16.2 | D-02, D-12 | con cambio: la tolerancia de reloj igual cubre el `kind` (5-i: 1 fallo en 8.656 fotos sin ella); I2 con p90 ≤ 15 por etapa y ≤ 4 en el conjunto, no ≤ 2 (16-b); I5 es igualdad exacta (16-c) |
| I-03 | cob 08, eje 06 | `estado` §3.6 | marcas de reloj en cuatro sitios | §3.4; §4.2, §4.4, §4.6; §5.4 | D-01 | entero |
| I-04 | cob 09 | `estado` §3.5 | identidad por el id del motor con sucesor, histéresis del papel y título de pelotón por bloque | §3.7; §6.2, §6.3 | D-03 | entero; la histéresis, sin estado de pantalla (4-q) |
| I-05 | cob 10 | `estado` §3.1, §8.1 | foto frente a instante; la radio desde el estado, con el contrato de hoy y sin lista de seguimiento | §3.2; §11.16; §12.10 | D-16 | con cambio: la `Race Radio` de una etapa no conocida enseña la puerta hasta el paso 10, y desde el 11 solo las fotos cerradas en lo alcanzado (11-i) |
| I-06 | orquestador, mot 07 | `estado` §11 | `StageProbe.onEvent` y el bloque de emisión `bEmit` | §4.2, §4.7; §5.2, §5.4 | D-05 | con cambio: `onEvent` recibe el índice del bucle y no cuenta fotos (5-a); la crono no lo llama |
| I-07 | eje 07 | `estado` §3.5, §8.1 | un código de papel de grupo, `GroupRole`, para barra, radio y voz | §6.3; §12.6 | D-18 | entero; la voz lee el papel que anota la API (`mainRole`, `groupRole`, 12-b) |
| I-08 | eje 08, cob 15 | `estado` §9 (y `datos` §9, `television` §9) | `TimeTrialTrace`, `TimeTrialInstant` y la traza por km con `onTimeTrialRide` | §9.2, §9.3, §9.5 | D-23 | con cambio: la última entrada de la traza es `10 · Math.round(tS)` (9-a), y `checkClockDs` guarda el reloj de cada control (9-b, escrito en §4.2 por 4-u) |
| I-09 | mot 01, mot 03 | `datos` §10.1, §10.5-10.6 | `stage_timelines.body` en `bytea` con gzip 9, `game_day`, `format`, `engine_version`, `finish_s`, `bytes` y el LRU de la API | §5.6; §13.3; §14.4 | D-10 | entero; el LRU es de 16 entradas desde que nace (18-d) |
| I-10 | mot 02, cob 06 | `datos` §3.4, §7.2, B9 | la visibilidad escrita en cada dato y el corte por visibilidad; B9 | §4.5, §4.6; §10.2, §10.11; §14.3; §16.4 | D-06 | con cambio: el tramo es de 900 s de reloj de carrera (`chunkRaceS`); un `main` se ve en el primero de sus dos cruces (4-d); `instantAt` se define sobre la línea cortada (4-c) |
| I-11 | cob 06 | `datos` §6.1, §7.4, B13 | la procedencia `from` del reparto congelado y su degradado al servir | §7.8; §10.10; §11.12 | D-15, D-37 | entero: `veilCast` en `packages/db` y `serveCast` en la API |
| I-12 | cob 05, mot 04 | `datos` §11 punto 2, B10, B11 | el colector aparte; B10 y B11 | §5.3, §5.10; §16.4 | D-08, D-09 | entero; medido, 18 de 18 corridas iguales, y la envoltura ingenua rompe 6 de 18 (§5.3) |
| I-13 | cob 07 | `datos` §8.3, §10.2, §10.7 | `NewsPayload` con el equipo del día, `breakaway_win` comprobado, `text` de compatibilidad y la migración de noticias primera | §12.8; §13.2; §17.4 | D-45 | con cambio: el equipo del día sale de `input.riders[].teamId` (17-r); `contract` gana `housingCovered` (12-j) |
| I-14 | cob 07, eje 17 | `datos` §8.2 | `pickVariant` con `since` y la semilla neutra | §12.7 | D-46 | entero; la revisión de cada etapa en `stage_timelines.tpl_rev` (12-c) |
| I-15 | eje 16 | `datos` §3.4, §10.3 | llegadas, resultado y acta solo por `POST …/broadcast/finish` | §8.7; §14.2, §14.3 | D-06 | entero; la meta lleva cuerpo `{ mode }` (14-f) |
| I-16 | eje 18 | `datos` §10.7 | `schema.parse` en el test y `satisfies` en el código; el contrato de hoy | §14.1, §14.7 | D-50 | entero; E2 no usa `schema.response` (14-o) |
| I-17 | orquestador, H-motor-04 | `datos` §10.4 | el formato plano de enteros por la red, `format` en cada fila y la guarda de tipos | §4.3, §4.11; §14.8 | D-10 | con cambio: lo guardado lleva los códigos como cadena y la red, como enteros de tablas explícitas que solo crecen (4-m) |
| I-18 | mot 05 | `television` §11.1 | `StageProbe.onBanner` | §5.2 | D-09 | entero; solo se llama si alguien puntúa (5-b) |
| I-19 | mot 06 | `television` §3.3, §11.2 | el tiempo congelado con `stageWeather`, `weatherPlan` y `roadBearings` | §5.4; §6.2, §6.8; §8.6 | D-14 | entero; sin punto cardinal (6-k) |
| I-20 | cob 12, mot 07, cob 13 | `television` §11.3 (y `estado` §11, `datos` §3.4) | `REVEAL_RULES` con regla por defecto y las caídas sacadas de `incidents` | §4.7; §5.4 | D-05, D-13 | con cambio: en carretera `revealS = máx(tS, regla)` (4-g); una caída sintetizada por montón (5-h); la caída, y el pinchazo y la avería de carretera, se revelan con el grupo en que iba el corredor al final del bloque anterior (4-v) |
| I-21 | eje 01 | `television` §3.5, §5.3, §12 | la cola de rótulos por clase, `Next action`, `While you skipped` y `Previously` | §6.5; §8.5, §8.11 | D-20, D-21 | con cambio: la cola no frena la carrera (D-21 quita el freno de `television`); los dos resúmenes paran el reloj mientras se ven (8-n) |
| I-22 | cob 11, eje 02 | `television` §5.2, §6.4, §8.3, §10.2 | la previa de cuatro cuadros, el cierre, la moto que rodea la fuga y el cuadro de diferencias | §6.7, §6.11; §8.6 | D-22 | con cambio: el cierre no tiene tabla por equipos (duda de §8) y `PHOTO FINISH` no se usa, porque `margin` es el hueco al grupo siguiente (8-h); la moto rodea la fuga con un rótulo de clase 2 por escapado, reservado en la cola con la lista y la frase, y solo en `Watch` a ×½, ×1 y ×2 (6-m; D-21 y D-22 en la fase 5) |
| I-23 | eje 03 | `television` §6.4 | la notoriedad sin fama y el corredor propio siempre nombrado | §7.5, §7.6 | D-26 | entero; `knownWins` cuenta solo carreras cerradas fuera de todo velo (7-e) |
| I-24 | orquestador, cob 14 | `television` §6.1-6.3 | la regla UCI completa del maillot llevado | §7.2 | D-24 | entero, con la tabla de 18 casos |
| I-25 | cob 16 | `television` §8.3 (y `estado` §8.2) | los titulares `gc_lead_taken` y `jersey_taken` | §12.8 | D-45 | entero; comparan el primero de cada clasificación, no el portador (12-h), y se escriben desde el 1a pero no se sirven hasta el 8a, con el velo (17-x) |
| I-26 | eje 04 | `television` §5.5 | esconder `BottomNav` mientras se reproduce, como propuesta a E6 | §18.6; §19.2 | D-56 | entero, con las fases de 18-f y `useHideBottomNav` |
| I-27 | orquestador | `television` §7.5 (y `producto` §7.10-7.11) | `PreStageInfo` como única entrada de títulos y avisos | §11.8, §11.9 | D-42 | con cambio: `stageReadyEmail` recibe además si el corredor propio está en la lista de salida (11-d) |
| I-28 | orquestador | `producto` §7.1-7.4 | el horizonte y el velo: grados de lo visto, prefijo y arrastre, guardia, alcances, caducidad de 56 días, `VeilDelta` y los mecanismos | §10.2, §10.4, §10.5, §10.6; §11.1 a §11.5 | D-28, D-30, D-31, D-32 | entero; el arrastre se escribe en el primer progreso (10-a) y los mecanismos pasan de cuatro a ocho (P, R, F, M, G, B, N y L) |
| I-29 | orquestador, eje 11 | `producto` §1.7, §7.5, §7.6 | las 48 superficies y las nueve puertas de fuera | §11.1, §11.2 | D-41 | con cambio: una décima puerta, `sup. X10` (11-b), y una undécima, `sup. X11` (11-r) |
| I-30 | mot 15, eje 12 | `producto` §13, §14 | B1b diferencial y B1c de dos desenlaces, con la lista de rutas pendientes | §16.3; §17.10, §17.11 | D-54 | entero; `PENDING_ROUTES` queda vacía al cerrar el 8b (17-n) |
| I-31 | mot 13, eje 09 | `producto` §7.8 | la cookie `cs_viewer` que solo restringe | §10.8 | D-34 | entero; formato `v1`, re-firmada como mucho una vez al día (10-g) |
| I-32 | mot 12 | `producto` §7.4, §7.5, §10.2 | `rev` en las claves, `clear()` al cambiar de cuenta y `private, no-store` con `Vary: Cookie` | §10.9; §14.9, §14.11 | D-35 | entero |
| I-33 | mot 16 | `producto` §7.4 (y `datos` §10.1) | el memo del horizonte y `users.last_seen_at` | §10.7; §13.4 | D-33 | entero; los memos del proceso tienen vida, barrido y tope (`TtlMemo`, 10-m) |
| I-34 | mot 14 | `producto` §10.1 | el rastro de etapa y `stage_team_results.prize` | §11.13; §13.5 | D-41, D-49 | entero; `prize` se escribe con un `update` de la fila de la etapa (13-f) |
| I-35 | eje 13 | `producto` §7.7 | revelar sin castigo, `Don't ask again` y `Watch anyway` | §11.11; §16.4, §16.6 | D-38 | entero |
| I-36 | eje 14 | `producto` §7.10, §7.12 | título y `og:` neutros por el fallback de la SPA, y las dos formas de compartir | §11.8, §11.10; §14.10 | D-36, D-42 | entero; el ganador en la vista previa, solo fuera del velo de quien pide (14-k), y como la pide un robot sin cookie y con el velo vacío, lo ve todo el que vea el enlace (DD-12) |
| I-37 | eje 10 | `producto` §7.8-7.9, §12 | la portada con `Continue watching`, `Ready to watch` y `While you were away` | §8.8; §11.4 | D-39 | con cambio: el digest dice sus minutos calculados, de 38 a 43 para una gran vuelta, y no 30 (8-b, DD-22) |
| I-38 | eje 15 | `producto` §5, §12 | el ritmo por zona de km a meta, sin pausas | §8.2, §8.3 | D-19 | entero; medido por el juez de ejecutabilidad |
| I-39 | orquestador | `producto` §2 principio 4, §7.4 | la existencia también informa | §11.6, §11.7 | D-32, D-45 | entero |
| I-40 | orquestador, H-cobertura-08 | `producto` §7.15 | lo que se ve de otros; la regla para E9 | §11.14; §19.2 | D-41 | entero; el sello es la posición del autor en segundos de carrera (`AuthorStamp`, 11-n) |
| I-41 | orquestador | `producto` §8.4 | los narradores sobrantes | §12.9 | D-47 | con cambio: `personalNarration` se sustituye por `moments`, las líneas del acta del corredor (12-k) |
| I-42 | orquestador | `producto` §7.14 | los agregados con su fecha de horizonte | §11.5 | D-32, D-41 | entero |
| I-43 | cob 01, mot 09 | `ingeniero` §8.2 (base) | la voz por truncado, con la longitud como dato y cinco pasadas apagadas | §12.2 | D-43 | con cambio: la voz se ordena por `revealS` y no por `tS` (12-a: 44 roturas del prefijo en 18 corridas ordenando por `tS`, ninguna por `revealS`) |
| I-44 | cob 02 | `ingeniero` §8.2 (base) | los racimos en vivo, publicados al cerrar su ventana | §12.3 | D-43 | con cambio: nunca antes del revelado de ninguno de sus miembros (12-d); apagados hasta B19; el racimo solo junta los descuelgues de corredores sin rótulo, y los de corredores con rótulo salen uno a uno (§12.3, DD-18) |
| I-45 | cob 03, mot 10 | `ingeniero` §7.4, §14 (base) | `BROADCAST_WATCH` y `SPOILER_MODE`, y `Watch` en el paso 3 con reloj estimado | §14.6; §17.6, §17.18 | D-07, D-53, D-54 | entero; `TIMELINE_RECORD` como tercer interruptor (D-12) |
| I-46 | cob 04 | `ingeniero` §4.2, §6.4 (base) | `Pulling:` en cada grupo que tira y a quién se nombra | §6.4; §7.7 | D-27 | con cambio: la línea sale de datos (`pullingLineOf`), con el porqué de cada equipo (`PULL_MOTIVE_WORDS`; 6-d), y el nombre va como está guardado, sin apellido en mayúsculas (7-a) |
| I-47 | cob 17 | `ingeniero` §6.3 (base) | el icono de campeón con forma, no solo color | §7.4 | D-25 | entero: `ChampionMark`, la silueta de maillot con una estrella en el pecho y la bandera al lado (7-h, corregida en la fase 5 por Rdueno-012) |
| I-48 | mot 08 | `ingeniero` §12 (base) | `BROADCAST`, `SPOILER` y el reductor en `packages/shared` | §15.1, §15.3, §15.4 | D-52 | entero; una regla de ESLint impide que el motor las lea (15-b) |
| I-49 | mot 11 | `ingeniero` §7.2, §7.4 (base) | `Horizon` obligatorio, `veilSql` y el registro que no arranca sin política | §10.6; §14.5 | D-32 | con cambio: `veilSql` gana `stageDay` (10-d); el registro recibe más dependencias (14-c) y cada ruta declara también `config.veil` (14-d) |

**Injertos no encontrados en el texto: ninguno.** Treinta entraron enteros y diecinueve con cambio; los cambios son precisiones que las secciones midieron (el orden de la voz, la tolerancia de I1, el umbral de I2, el número del digest) o decisiones que los encajan con otra pieza del documento, y ninguno deja sin hacer lo que el juez pedía.

**Los alias de las propuestas.** Es el único sitio del documento donde aparecen (la síntesis los tradujo con esta misma tabla en su glosario): a la izquierda, cómo lo llamaba cada propuesta; a la derecha, el nombre que usa el documento.

| En las propuestas | En este documento |
| --- | --- |
| `LineaTemporal` (`estado`), `StageTimeline` (`datos`), `StoredStageFeed` y `stage_feeds` (`television`), radio v2 (`producto`), `StoredRaceRadio` con opcionales (`ingeniero`) | `StageTimeline`, `StoredTimelineV1`, `stage_timelines` |
| `LineaTemporalGuardada`, `StoredTimelineV1` sin definir (`datos`) | `StoredTimelineV1` |
| `Foto` (`estado`), `BroadcastFrame` (`ingeniero`), `GroupFrame` y `StoredRadioKmV2` (`producto`), `TimelinePhoto` (`datos`), `StoredPaso` (`television`) | `Photo` y las marcas `clock` |
| `Instante` (`estado`), `BroadcastInstant` (`ingeniero`), `RaceMoment` (`producto`), `BroadcastState` (`datos`, `television`) | `Instant` |
| `GrupoEnPantalla`, `GroupNow`, `RoadGroup`, `BroadcastGroup` | `GroupNow` |
| `SucesoDeEstado` con `mueve`, `sale`, `titulo`, `percance`, `reloj` | `StateEvent` con `move`, `out`, `main`, `mishap`, `clock` |
| `SucesoNarrable` (`estado`), `TimelineEvent` (`datos`), `Overlay` (`ingeniero`) | `TimelineEvent` (dato) y `Cue` (pantalla) |
| `bEmision`, `tEmision` (`estado`), `knownS` (`ingeniero`), `aT` (`producto`), `reveal[]` (`television`), `revealS` (`datos`) | `TimelineEvent.bEmit`, `TimelineEvent.revealS` |
| `LiveLine` (`producto`), ticker (`ingeniero`), voz (`television`), journal en vivo (`estado`, `datos`), `Commentary` (`estado`) | `LiveLine`, la voz; en pantalla, `Commentary` es la lista de lo dicho |
| `RotuloCorredor` (`estado`), `RiderCard` (`ingeniero`, `television`), `RiderLabel` y `BroadcastRider` (`producto`), `CastRider` (`datos`) | `RiderCard` (servido), `CastRider` (congelado) |
| `MaillotLlevado` (`estado`), `WornKit` (`ingeniero`), `WornJersey` (`producto`, `datos`, `television`) | `WornJersey` |
| `Distincion` (`estado`), `RiderLine` (`ingeniero`), `Distinction` | `Distinction` |
| `Titulo`, `FuenteDeTitulos`, `titulosDesdePalmares` (`estado`), `TitlesPort` (`television`), `championTitles()` (`ingeniero`, `datos`), `ChampionTitleSource` (`producto`) | `ChampionTitle`, `ChampionTitleSource`, `palmaresTitleSource` |
| `Horizonte` (`estado`), `Horizon` (`ingeniero`, `producto`, `television`), `Veil` y `getVeil` (`datos`) | `Horizon`, `Horizon.veil`, `computeHorizon` |
| `HorizonDelta` (`producto`) | `VeilDelta` |
| `hiddenSql` (`ingeniero`) | `veilSql` |
| `stageHidden` (`ingeniero`), `isPending` (`television`) | `isVeiled` |
| `shownThrough` (`television`), `visibleHasta` (`estado`) | `throughStage` |
| `stage_views` (cuatro versiones), `race_follows` | `race_watch` |
| `spoiler_mode` de `users` (`producto`), `spoiler_scope` (`datos`) | `users.spoiler_scope` |
| `POLITICA_DE_RUTAS` (`estado`), `ROUTE_POLICY` (`producto`), `config.spoiler` (`ingeniero`, `television`) | `config.spoiler: SpoilerPolicy` y `RouteRegistry` |
| `PapelDeGrupo` (`estado`), `GroupName` (`producto`), `GroupLabel` (`datos`), `GroupRole` (`television`) | `GroupRole` y `GroupLabel` |
| `onRiderTrace` (`estado`), `onTimeTrial` (`ingeniero`), `onRide` (`datos`), `onTtCheck` (`producto`) | `onTimeTrialRide` |
| `LineaDeCrono`, `StoredTimeTrial`, `tt` | `TimeTrialTrace` |
| `InstanteDeCrono`, `TtMoment` | `TimeTrialInstant` |
| `Story`, «acta», «journal», «crónica», «diario» | `Report` en pantalla; el acta en la prosa |
| `NeutralStageNotice` | `stageReadyNotice` (texto) y `stageReadyEmail` (plantilla) |
| `useTituloDePestana`, `useDocumentTitle`, `tabTitle`, `NeutralTitle` | `pageTitle` (puro) y `usePageTitle` (gancho) |
| `StagePrevia` (`television`), `Preview` (`ingeniero`) | `StagePreview`; en pantalla, `Preview` |
| `Closing`, `StageActa` (`television`) | `StageClosing`, `StageReport` |
| `Backlog` (`television`), `ToWatch` (`datos`), `/api/views/pending` (`ingeniero`) | `HorizonSummary` y `GET /api/me/horizon` |
| `feed?chunk=` (`television`), `slice` (`datos`), el tramo de 20 km (`ingeniero`) o de 10 km (`estado`) | `BroadcastChunk` y `GET …/broadcast/chunk` |
| `BROADCAST.chunkKm` 20, `fotoClaveKm` 10, `chunkDs` 6.000 | `BROADCAST.chunkRaceS` 900 (y `TIMELINE.keyPhotoKm` 10, que no es unidad de entrega) |
| `staleRevealGameDays` 28, `caducidadDiasReales` 7, `pendingExpiryDays` 40, `VEIL.windowGameDays` 56 | `SPOILER.expiryGameDays` 56 |
| `ITA CHAMP` (`ingeniero`), `Italian Champion` (`television`, `datos`) | `Champion of Italy` (D-25) |
| `Peloton` (la radio de hoy, `producto`, `ingeniero`), `BUNCH` (`estado`) | `Bunch` (D-18, DD-04) |
| `Grupetto` (la radio de hoy), `grupeto` (el motor) | `Gruppetto` en pantalla; `grupeto` sigue siendo el `kind` del motor |
| `FRONT OF THE RACE`, `CHASERS` | `LEAD GROUP`, `CHASE GROUP` |
| `ticker-only` (`ingeniero`) | `voice_only` en `CUE_OF_TEMPLATE` |

### 21.2 Apéndice B · Las 32 objeciones y lo desestimado

**Las objeciones.** `veredicto.json` fundió las objeciones de los tres jueces a la base y a las otras propuestas en 32, numeradas `O-01` a `O-32` (fuentes: 13 del juez de cobertura, 12 del juez del motor y 14 del de ejecutabilidad; siete las pidieron dos jueces). Cada fila dice contra qué propuesta y sección iba, qué objetaba, qué responde el documento y dónde. Las 32 tienen respuesta en el texto, y ninguna se desestima: los jueces las respaldaron con código o medida, y las secciones las aplicaron.

| O | Fuentes | Contra | Qué objetaron | Respuesta del documento | Dónde | Decisión |
| --- | --- | --- | --- | --- | --- | --- |
| O-01 | cob 01 | `producto` §11 cambio 2, §3.4 | las fotos cada 100 m de los últimos 3 km por la misma sonda y el mismo colector cambian el aprendizaje sin subir versión, y el turno del relevista, que cuenta fotos, pasa de 3 km a 300 m | un colector aparte despachado por índice de bloque: la radio y el aprendizaje ven las fotos de hoy (B10; 18 de 18 corridas iguales, la ingenua rompe 6 de 18) | §5.3 | D-08 |
| O-02 | cob 02 | `producto` §8.1 | la clasificación de las pasadas de la crónica queda a un test y sin la longitud de la etapa como dato | la lista de cinco pasadas apagadas y la longitud como dato; `respecto`, `juntos` y `desenlace` siguen en la voz; la tabla de las veintiuna | §12.2 | D-43 |
| O-03 | cob 03 | `producto` §6.1-6.2 | un campeón sub-23 vestiría de campeón en carreras élite | el título solo en su disciplina y su categoría; la expresión exacta y nunca `LIKE 'nc-%-road'` | §7.2, §7.4 | D-24, D-25 |
| O-04 | cob 04 | `producto` §6.3, decisión 10 | «Champion of Italy desde el primer día» es falso tras el reinicio | sin campeones hasta el día 179 de la temporada 0 salvo 17 países; ni marcador ni aviso; sembrarlos es de E12, o de una siembra en E2 detrás de la misma interfaz si el dueño los quiere antes del reinicio | §7.4; §20 (DD-06) | D-25 |
| O-05 | cob 05, mot 03 | `producto` §11 cambios 4-7; `estado` §11 | suben a v90 cambios que se pueden sacar al grabar, y toda subida antes del 17d cambia la «Last race» | `ENGINE_VERSION` no sube: `onEvent`, `onBanner`, `incidents` y `startS + tS` lo dan por observación; lo que cuesta una subida de otra línea antes del 17d, y qué se hace con ella, lo decide el dueño | §5.1; §19.1 (riesgo 4), §19.5; §20 (DD-25) | D-09, DD-25 |
| O-06 | cob 06, mot 11 | `producto` §14 paso 6; `estado` §10.1 | la migración de `news` va sexta o tercera y sin el plazo del reinicio | la `0043_noticias_con_datos` es la primera de E2, en el paso 1 y antes del reinicio | §12.8; §13.1, §13.2; §17.4 | D-45, D-49 |
| O-07 | cob 07 | `producto` §8.3 | `renderNews` resuelve nombre y equipo de hoy: un traspaso reescribe titulares viejos | el equipo del día en el `NewsPayload`, y la identidad del día también en la crónica | §12.7, §12.8 | D-45, D-46 |
| O-08 | cob 08 | `producto` §7.4, decisión 14 | el visitante abre la clásica «conocida» en el acta: para él entrar sería leer el acta | toda etapa que el espectador no conoce abre en `Watch`, visitante incluido; el acta a un toque y en `/report` | §11.10 | D-36 |
| O-09 | cob 09 | `producto` §7.3, decisiones 1 y 3 | las ocho carreras de cabecera protegidas para todos no son palabra del dueño | se implementan por defecto y se llevan al dueño con su cifra (DD-01) | §10.1, §10.4; §20 | D-30 |
| O-10 | cob 10, eje 02 | `producto` §3.3; `ingeniero` §4.3, §8.2 | dos vocabularios del mismo grupo (`no_mans_land` y `nth`; `PELOTON` en la barra y `the bunch` en la voz) | un código, `GroupRole`, y una lista cerrada de palabras para barra, radio, voz y acta; la voz lee el papel anotado (12-b), y el grupo del maillot se llama igual en la barra, la capa fija y la voz (6-b) | §6.3; §12.6 | D-18 |
| O-11 | cob 11, eje 10 | `producto` §9; `ingeniero` §9 | la crono con dos controles y meta, o en prosa sin tipo y con un prólogo que dura menos de lo que dice | `TimeTrialTrace` por km por la sonda, `TimeTrialInstant` y el ritmo por fracción de salidos, medido de 5:20 a 11:23 (el prólogo de 176 corredores, de 6:24 a 7:06; una nacional de 40 km con 12, de 5:20 a 5:24; §9.4) | §9.2, §9.4 | D-23 |
| O-12 | cob 12, eje 01 | `producto` §5; `ingeniero` §5.1, §12 | el ritmo estimado sin medir, o en segundos de pared por km, que comprime los finales en alto (el último km a ×5,7-8,9) | la curva de `producto` sin pausas, medida por el juez (7:39-19:59), con su reparto por zona; B17 la mide en las 24 etapas | §8.2, §8.3 | D-19 |
| O-13 | cob 13, eje 05 | `producto` §3.1; `ingeniero` §3.1, §11.1, paso 3 | el reloj solo por punto de km, sin marcas en los cambios de composición, y un reloj estimado sin medir | marcas de reloj en cuatro sitios; el adaptador lleva `clock: 'estimated'`, medido por §3.8 (0,69 km como mucho en la cabeza), y B22 decide si esas etapas abren en `Watch` | §3.4, §3.8; §4.2, §4.5 | D-01, D-07 |
| O-14 | mot 01 | `estado` §3.8 | el motivo de relevo guardado por índice de un enum se rompe con los motivos nuevos de R23.1 | los códigos se guardan como cadena; en la red, tablas explícitas que solo crecen | §4.3, §4.11 | D-10 |
| O-15 | mot 02 | `estado` §10.1 | `stage_timelines.linea` en `json` en lugar de `bytea` con gzip | `body bytea` con gzip 9 | §5.6; §13.3 | D-10 |
| O-16 | mot 04 | `estado` §3.9, §10.1 | I1 no cubre la capa de detalle: antes de dejar de escribir la radio hay que probar que la servida desde la línea es la de hoy | B16 en las 22 etapas en línea (en una crono la radio va vacía); la radio se escribe hasta que B16 esté en verde (DD-11) | §16.4; §17.14 | D-16 |
| O-17 | mot 05 | `estado` §7.2 | el horizonte no cuesta menos de 5 ms sin índice por corredor | `race_rosters_rider_idx` en la `0045`, memo de 60 s, la forma D de las consultas y B14 con p95 ≤ 5 ms | §10.7; §13.4; §16.4; §18.2 | D-33 |
| O-18 | mot 06, eje 06 | `estado` §5, §7; `ingeniero` §7 | no tratan la caché de React Query ni la sesión de 7 días: el que vuelve tras una semana llega sin sesión | `cs_viewer`, que solo restringe; `rev` en las claves, `clear()` al cambiar de cuenta y `private, no-store` | §10.8, §10.9 | D-34, D-35 |
| O-19 | mot 07 | `estado` §3.2, §12 | `BROADCAST` en el motor hace pagar los bancos por cada ajuste de ritmo o de rótulo | `BROADCAST`, `SPOILER` y el reductor en `packages/shared`; en el motor, solo ganchos, grabador y `TIMELINE` | §15.1 | D-52 |
| O-20 | mot 08 | `estado` §7.1, §10.2 | los tramos de 10 km por espacio entregan futuro, y lo entregado cuenta como visto | tramos por reloj de carrera cortados por la visibilidad de cada dato; lo servido no cuenta como visto | §10.2, §10.11; §14.3 | D-06, D-28 |
| O-21 | mot 09 | `estado` §3.3, §15 | I2 no acota el salto de un corredor: hasta 138 s | el corredor en tránsito, nunca su reloj como hueco; de 0 a 6 saltos de grupo de más de 60 s por etapa; el defecto va a `docs/balance.md` (DD-23) | §3.6; §19.1 (riesgo 3), §19.7 | D-01, D-58 |
| O-22 | mot 10 | `estado` §2, §11 | «una línea que no cumple I1 no se guarda» necesita nota, contador y salida | nota en `tick_log.notes`, contador del día, la lápida y la etapa en `Report`; el interruptor `TIMELINE_RECORD` | §5.5 | D-12 |
| O-23 | mot 12 | `estado` §11 | la cifra de CPU está inflada por el ruido y el presupuesto se sella con un banco del día pico | B15 sobre los días 176 y 179 enteros, con grabador, escritura, sub-23 y `buildTimelineCast`; proyectado de lo medido por nacional, de +0,7 a +0,8 s y de +15,5 a +18,9 s, y la escritura, medida aparte, de 0,07 a 0,15 s | §16.4; §18.3 | D-12 |
| O-24 | eje 03 | `ingeniero` §0, §8.2, §13 B7 | «ninguna frase nueva, ningún `case` nuevo» contradice su propio B7 | los cuatro `case` que faltaban, las frases nuevas de la tele y el `default` que ya no imprime la clave | §12.5 | D-44 |
| O-25 | eje 04 | `ingeniero` §10.2, §3.3 | el servidor adelanta un tramo de 20 km y el último lleva la meta | la meta nunca va en un tramo: solo por `POST …/broadcast/finish`; el tramo del borde lleva `atFinish` | §14.3 | D-06 |
| O-26 | eje 07 | `ingeniero` §7.8, §16.3 | `Catch up at ×4` no se puede ver, y revelar a los 28 días deja revelado el Tour a quien se fue dos semanas | caducidad de 56 días de juego; `While you were away` con el digest y `Key stages` | §10.5; §11.4 | D-31, D-39 |
| O-27 | eje 09 | `ingeniero` §3.3, §13 B7 | falta la tabla de plantilla a tipo de rótulo | `CUE_OF_TEMPLATE` con las 54 plantillas del motor más `crash`, vigilada por B7 | §6.6 | D-21 |
| O-28 | eje 11 | `ingeniero` §7.1, §10.2 | el progreso al cerrar va por `sendBeacon` a una ruta `PUT`, y `sendBeacon` solo hace `POST` | `POST /api/me/watch/:raceKey/:day` con `fetch` `keepalive` y `sendBeacon` con un `Blob` JSON, y `text/plain` de respaldo (14-g) | §14.2 | D-51 |
| O-29 | eje 12 | `ingeniero` §4.1, §7.7 | previa y cierre mínimos | la previa de cuatro cuadros y el cierre de la señal UCI, palabra por palabra | §8.6 | D-22 |
| O-30 | eje 13 | `ingeniero` §6.3 | `ITA CHAMP` no es texto de televisión | `Champion of Italy` (no hay gentilicios en `COUNTRIES`) y la forma en el icono | §7.1, §7.4 | D-25 |
| O-31 | eje 14 | `ingeniero` §7.4 | el registro solo clasifica `GET` bajo `/api`: las respuestas de escritura quedan fuera del canario | `config.spoiler` en toda ruta que devuelva cuerpo, sea del método que sea | §14.5 | D-32 |
| O-32 | eje 08 | `ingeniero` §7.3 | faltan puertas en la tabla de mecanismos y el presupuesto del equipo se acepta como fuga | las nueve puertas de `producto` y dos más, `sup. X10` y `sup. X11`, cada una con su mecanismo; el presupuesto, velado con `stage_team_results.prize` por defecto, y la elección, del dueño | §11.2, §11.13; §20 (DD-26) | D-41, DD-26 |

**Lo desestimado de las propuestas.** Lo que las propuestas decían y el documento no hace, agregado por decisión (los «Descartado» de las decisiones cerradas por la síntesis); lo que cada sección descartó al decidir está en su bloque «Decisión tomada aquí».

| Decisión | Lo que se descartó, y por qué | § |
| --- | --- | --- |
| D-01 | que los cambios de un corredor van al reloj de su grupo nuevo y son monótonos (`television.md` §3.4): falso, hasta 138 s por bloque (C4); que «no hay reloj absoluto» (mapa 01 §0): lo que no existe es el instante; interpolar con el km siguiente sin tránsito (`producto.md`, `ingeniero.md` §3.1) | §3 |
| D-02 | «el estado ES la radio» con cuatro campos opcionales (`ingeniero.md` §3): 1 km de resolución y +35-66 % en disco (C7); la radio v2 en `jsonb` (`producto.md` §3.3); `StoredPaso` por km (`television.md` §3.3) | §4 |
| D-03 | la identidad por posición (`ingeniero.md` §3.2) y el linaje derivado al leer (`producto.md` §3.2) | §3, §6 |
| D-05 | cambiar en el motor el reloj de `climb_kom` y añadir `aT` a la fuga (`producto.md`): sube versión; que la fecha (f) quede bien por su `tS` (`ingeniero.md` §1.3): falso (C9); la fuga visible cuando el hueco al `mainGroup` pasa de 45 s (`datos.md` §3.4): a medias (C10) | §4.7, §5 |
| D-06 | tramos por espacio de 10 km (`estado.md`) y de 20 km (`ingeniero.md`): entregan el futuro de los grupos de atrás y el último lleva la meta | §4.6, §14.3 |
| D-08 | las fotos finas por la misma sonda y el mismo colector (`producto.md` §11, cambio 2) | §5.3 |
| D-09 | v90 por el orden de las pancartas (`estado.md`), por `aT`, `climb_kom`, `crash` y los pinchazos de crono (`producto.md`) o como paso 11 opcional (`ingeniero.md`): lo dan los ganchos y `incidents` | §5.1 |
| D-10 | columnas en `stage_snapshots`, campos en la radio en `jsonb` (`ingeniero`, `producto`), `json` (`estado`), `stage_feeds` en `jsonb` (`television`) y el motivo por índice (`estado.md` §3.8) | §4.3, §13.3 |
| D-13 | el suceso `crash` en el motor (sube versión y empuja el tope de 100 líneas narrables) y guardar `severidad` y `diasBaja` para el acta (`television.md` §3.3) | §5.4 |
| D-18 | dos vocabularios en la misma pantalla (`ingeniero.md` §4.3, `datos.md`) | §6.3 |
| D-19 | segundos de pared por km (`ingeniero.md`), frenos tras cada hito (`estado.md`), presupuesto por tramo (`television.md`), pausas de 3 s por rótulo (`producto.md`) y la regla de `datos.md`, con su falso «unos 13 min al día» | §8.3 |
| D-20 | `Skip the quiet part` (`producto.md`) y el `Next action` de `datos.md`, que llevan hasta el siguiente suceso y así lo delatan | §8.5 |
| D-23 | dos controles y meta (`producto.md` §9), la crono en prosa y con 4-6 min estimados para lo que mide 2:51 (`ingeniero.md` §9), y 5.760 y 15.120 s de carrera sin presupuesto (`television.md` §9) | §9 |
| D-28 | «lo servido es lo visto» (`television`, `datos`, `estado`) | §10.2 |
| D-29 | `stage_views` por etapa (cuatro propuestas): basta una fila por carrera porque lo conocido es un prefijo | §10.3, §13.4 |
| D-31 | 7 días reales (`estado`), 40 de juego (`television`) y 28 de juego (`ingeniero`) | §10.5 |
| D-33 | leer `race_callups` en lugar de `race_rosters`: la guardia se define por la lista de salida | §10.7 |
| D-36 | el visitante que abre la clásica conocida en el acta (`producto.md` §7.4, §7.5) | §11.10 |
| D-39 | `Catch up at ×4` (`ingeniero.md` §7.8), `Highlights of all` (`television`: horas) y `Reveal all but the last 3` (`datos`: una gran vuelta en resumen, unas 2 h) | §8.8, §11.4 |
| D-41 | aceptar el presupuesto del equipo como fuga (`ingeniero.md` 16.8, `datos.md` decisión 5), que queda como la respuesta contraria de DD-26, del dueño | §11.13; §20 |
| D-43 | apagar `respecto`, `juntos` y `desenlace` o mandarlos al acta (`television`, `estado`, `datos`): son causales y el directo perdería el hilo del líder que el dueño pidió («si lees todo el Journal no SABES quién va ganando, quién va persiguiendo… es un lío los últimos mensajes», `docs/balance.md` l. 5975-5976, v27); dejar la lista a un test (`producto.md` §8.1) | §12.2 |
| D-44 | «ninguna frase nueva, ningún `case` nuevo» (`ingeniero.md` §8.2) | §12.5 |
| D-45 | `/api/news` sin `text` (`estado.md` §8.2), la migración de noticias tercera o sexta, y el nombre y el equipo de hoy al renderizar (`producto.md` §8.3) | §12.8, §13.2 |
| D-50 | `StageCard` en la ruta de hoy (`producto.md` §10.2), `/api/news` sin `text` (`estado`) y el acta con 403 sin interruptor (`television.md` §7.4): las tres rompen la web de ayer (X-20) | §14.1 |

### 21.3 Apéndice C · Los 23 huecos y las decisiones sin evidencia de los jueces

**Los huecos.** Lo que ninguna propuesta resolvía y los jueces señalaron (`H-01` a `H-23`: 9 del juez de cobertura, 9 del juez del motor y 8 del de ejecutabilidad, con tres coincidencias). Los 23 están rellenos en el texto; la última columna dice si la síntesis tuvo que decidir sin evidencia de los jueces y qué lo mide.

| H | Fuentes | Qué faltaba | Cómo se rellena | Dónde | Decisión | Sin evidencia de los jueces: quién lo mide |
| --- | --- | --- | --- | --- | --- | --- |
| H-01 | cob 01 | los campeones antes del primer nacional de un mundo reiniciado | no hay hasta el día 179 de la temporada 0, salvo en los 17 países que lo corren antes; ni marcador ni aviso; E12 puede sembrarlos (DD-06) | §7.4; §20 | D-25 | no |
| H-02 | cob 02 | la contradicción 5 del mapa 05 y el 17d | ninguna subida de versión en E2; lo que cuesta una subida de otra línea antes del 17d lo decide el dueño (DD-25); el paso 12 corrige `docs/balance.md` l. 14684-14686 | §5.1; §17.15; §19.5; §20 | D-09, D-58, DD-25 | no |
| H-03 | cob 03 | la criba lejana aparcada ([DUEÑO 7]) | la barra la enseña como estado aunque la voz no la narre; `peloton_selection` tiene rótulo y entra en B2 | §6.8 | D-59 | no |
| H-04 | cob 04, eje 07 | una prueba de lectura ([DOC 7]) | el protocolo PL: tres etapas, tres puntos cada una, las cuatro preguntas (y dos más, qué lleva cada uno de los de delante y quién tira detrás y por qué, donde el grupo de delante es de 4 a 12) y nueve de nueve | §16.5; §17.13 | D-60 | sí: el propio protocolo, en el 10b |
| H-05 | cob 05 | la notoriedad sin `fame` | `knownWins`, las victorias de carreras cerradas fuera de todo velo (7-e) | §7.5 | D-26 | sí: los tests de la frase de la fuga (§7.6) fijan el orden que sale de ella; que sea el bueno lo juzga el dueño al verla tras el 6b (D-26, en la tabla de abajo) |
| H-06 | cob 06, eje 03 | el dueño como espectador y como depurador | el modo diagnóstico `?diag=1`, sin horizonte y sin escribir `race_watch` | §11.15 | D-40 | sí: el test de la ruta |
| H-07 | cob 07 | lugares, avituallamiento y tiempo | el tiempo sí, congelado y sin punto cardinal; lugares y avituallamiento no, porque el motor no los tiene | §6.8 | D-14, D-59 | no |
| H-08 | cob 08 | dos jugadores en km distintos de la misma etapa (E9) | el contenido de un jugador lleva sellado el horizonte de su autor (`AuthorStamp`) | §11.14; §19.2 | D-41 | no |
| H-09 | cob 09, eje 02 | el móvil, medido | protocolo a mano en el paso 10 (360 × 800, CPU ×4, `Fast 4G`) con umbrales escritos | §18.5 | D-56 | sí: la medida a mano, en el 10b |
| H-10 | mot 01 | el índice y el presupuesto del horizonte | `race_rosters_rider_idx`, memo de 60 s, la forma D y B14 con p95 ≤ 5 ms | §10.7; §13.4; §16.4 | D-33 | no; el mánager, DD-21 |
| H-11 | mot 02 | el reinicio frente a las tablas por usuario sin `world_id` | `race_watch` lleva `world_id` en la clave y el reinicio la borra | §10.3; §13.4, §13.9 | D-29 | no |
| H-12 | mot 03 | el salto de hasta 138 s | E2 lo tolera en tránsito y lo anota para el dueño (DD-23) | §3.6; §19.7 | D-01, D-58 | no |
| H-13 | mot 04 | la guarda de tipos entre la sonda y el grabador, y el decodificador por `format` | el mapeo exhaustivo con `satisfies`; `decodeTimeline` despacha por `format` | §4.3; §5.4, §5.6 | D-10 | no |
| H-14 | mot 05 | el banco del tick en los días 176 y 179 | B15 en el paso 5, con la regla de 16-l | §16.4 | D-12 | no |
| H-15 | mot 06 | la versión de Postgres de producción y su compresión TOAST | con `bytea` gzip deja de importar para la línea; queda sin comprobar para la radio de hoy | §5.6; §19.1 (riesgo 12), §19.6 | D-10 | no |
| H-16 | mot 07 | las etapas corridas entre el despliegue y el reinicio | el adaptador de la radio con reloj estimado; B22 decide si abren en `Watch` o en `Report` | §3.8; §17.19 | D-07, D-61 | sí: B22, en el 6a |
| H-17 | mot 08 | qué segundo es la diferencia de un corredor | la de su grupo en el último punto común, nunca su reloj de foto | §3.5; §6.2 | D-01, D-27 | no |
| H-18 | mot 09 | la carga de escritura del progreso | una escritura cada 15 s de pared por usuario y carrera como mucho, y solo si lo alcanzado crece 60 s o cambia el estado (10-l) | §10.3; §18.4 | D-55 | sí: B14 con `recordProgress`, en el 7a |
| H-19 | eje 01 | cuánto cuesta al día seguir una vuelta | de 28 a 49 min en `Watch` y hasta 73 (en el Giro, que descansa tres días, de 27 a 47 y hasta 70); de 8 a 24 en `Highlights`; el modo por defecto es DD-03 | §8.4; §20 | D-19 | no |
| H-20 | eje 04 | ver una cola seguida | `Next: Stage 8 · Watch` sin reproducción automática, la más antigua primero, carreras del mismo día en filas separadas; el digest sí encadena (8-c) | §8.8; §11.4 | D-39 | sí: la prueba de lectura y el paso 9 |
| H-21 | eje 05 | fallos de red a mitad de etapa | pausa y `Connection lost · Retry` (pantalla); lo alcanzado es lo pintado, nunca lo descargado | §10.12; §18.7 | D-57 | sí: los tests de pantalla, pasos 9 y 10 |
| H-22 | eje 06 | la accesibilidad de la pantalla viva | `aria-live="polite"` por rótulo admitido, `prefers-reduced-motion`, parciales con signo y maillots por forma | §18.8 | D-57 | sí: los tests de pantalla |
| H-23 | eje 08 | dos dispositivos viendo la misma etapa | gana el máximo, `rev` al enfocar y un aviso en la segunda pestaña | §10.12 | D-57 | sí: los tests de pantalla |

**Las catorce decisiones sin evidencia de los jueces.** `veredicto.json` las lista (`decisiones_sin_evidencia_de_los_jueces`): la síntesis las tomó sin que ningún juez las midiera o las pidiera con mecanismo. El documento lo dice en cada una, y el plan las mide antes de encender lo que dependen de ellas:

| Decisión | Qué se decidió sin juez | Quién lo mide o lo acepta, y cuándo | Lo que ya midieron las secciones | § |
| --- | --- | --- | --- | --- |
| D-04 | la posición extrapolada del instante | B21, informativo, en el 4b (17-i) | p50 de 0 a 2 m y p99 de 52 a 508 m en 15 corridas, nunca 1 km (§3.3) | §3.3, §18.9 |
| D-07 | el umbral de 1 km del reloj estimado | B22, en el 6a | 0,69 km como mucho en la cabeza contra la radio (§3.8) | §3.8, §14.4 |
| D-12 | el interruptor `TIMELINE_RECORD` | B15, en el paso 5 y en el 10b | los días pico con el prototipo (§18.3) | §5.5 |
| D-21 | la cola de rótulos sin freno | B17 y la segunda parte de B3, la presentación de la fuga entera (6-m, §16.4), con la medida de la cola de §6.5 y §6.7; si con lo que la cola deja se entiende la etapa, lo dice la prueba de lectura | la cola de la crono no pasa de 3 (9-d); en `Watch` a ×1, la lista y la frase de 33 de 34 fugas y 157 de 158 rótulos de la ronda de la moto salen enteros, y del resto, el 69 % de los de clase 2 y el 35 % de los de clase 1 (`l4c/cola.mjs`, 22 etapas por dos semillas) | §6.5, §6.7 |
| D-24 | la delegación que salta al campeón | `jerseys.test.ts` fija la regla elegida con la tabla de §7.2, y B3 que cada maillot se resuelve; que la regla sea la buena lo juzga el dueño con el rótulo delante tras el 6b (DD-05, §20.7), porque la prueba de lectura pregunta qué lleva cada uno de los de delante, no a quién pasa el delegado | nada: el reglamento no dice qué pasa después (mapa 06 §2.2) | §7.2 |
| D-25 | `Champion of Italy` en lugar de un gentilicio | B3, con su cláusula de no vacío (un campeón de Italia sintético en la fuga, que `breakHeadline` nombra por su título, §16.4), y la pregunta de los maillots de la prueba de lectura donde salga un campeón (§16.5, punto 6), en el 10b; E10, al traducirlo | nada: `COUNTRIES` no tiene gentilicios (§7.4) | §7.4 |
| D-26 | `knownWins` como notoriedad | los tests de la frase de la fuga (§7.6) fijan el orden que sale de ella, y ni B3 (que todo corredor se nombre o se cuente) ni la prueba de lectura (qué lleva cada uno) miran ese orden; que sea el bueno lo juzga el dueño al ver la frase de la fuga tras el 6b (§20.5) | nada | §7.5 |
| D-39 | la cola seguida (H-20) | la prueba de lectura y el paso 9 | el digest, de −9 a +34 % sobre su presupuesto (§8.4) | §8.8, §11.4 |
| D-40 | el modo diagnóstico `?diag=1` | el test de la ruta: no escribe `race_watch` | nada | §11.15 |
| D-43 | la regla del racimo en vivo | B19 con la política de nombres real, antes de encender `liveClusters` (DD-18) | 0 violaciones sin rótulos en 18 corridas (§12.3) | §12.3 |
| D-55 | el umbral de escritura del progreso | B14 con `recordProgress`, en el 7a | `recordProgress`, p95 de 3,05 ms en PGlite (§18.4) | §10.3, §18.4 |
| D-56 | los umbrales del móvil | la medida a mano, en el 10b | la primera visita, 334 KB comprimidos (§18.5) | §18.5 |
| D-57 | la red, dos dispositivos y la accesibilidad | los tests de pantalla, pasos 9 y 10 | nada | §10.12, §18.7-18.8 |
| D-60 | nueve de nueve en la prueba de lectura | el propio protocolo, en el 10b | nada | §16.5 |

### 21.4 Apéndice D · Cobertura

Dónde contesta el documento cada cosa que se le pidió: los seis puntos del encargo, los requisitos del dueño y de los documentos del mapa 05 §5, sus quince contradicciones, las superficies, las cinco categorías de maillot, la contrarreloj y lo que necesita E10. Las secciones citadas se han comprobado en el texto: donde un requisito aparece con su etiqueta (`[DUEÑO 4]`, `[DOC 3]`), la columna lo dice.

**D.1 Los seis puntos del encargo** (`00-encargo.md` §1; `docs/encargos.md` l. 138-157):

| Punto | Dónde | Cómo se contesta |
| --- | --- | --- |
| 1. Rehacer lo que el jugador lee de una carrera, con la televisión como norte | §6, §7, §8, §12; el diagnóstico, §1 | la radio, el journal, la crónica y las noticias pasan a ser la retransmisión (`Watch`), la voz, el acta (`Report`), el microscopio (`Race Radio`) y las noticias con datos |
| 2. Un estado que evoluciona, con tipos; qué es permanente y qué eventual | §3, §4; §6.2 (lo permanente), §6.5 (lo eventual) | la línea temporal, el reductor y el instante (§4.2-4.5); la capa fija, la barra y el perfil siempre; los rótulos por clase cuando pasa algo |
| 3. Sin destripe por defecto, como propiedad del producto entero | §10, §11, §14 | el horizonte en un solo punto (§10.6), las 48 superficies y once puertas (§11.1-11.2); la portada (§11.4), el ranking (§11.5), las clasificaciones (`sup. C2`, `sup. E5`), el feed (§11.7), el correo (§11.9) y el título de la pestaña (§11.8) |
| 4. «El motor ya guarda los sucesos fechados», comprobado contra el código | §1.1, §4.7, §5.2 | a medias: km y `tS` en cada suceso sí, pero siete fechas trucadas (casos a a g), la radio sin reloj ni identidad y la crono sin traza (§1.1); `REVEAL_RULES` y los tres ganchos lo arreglan sin subir versión |
| 5. El defecto de `news` | §12.8, §13.2, §17.4 | `seed`, `data`, `race_key`, `stage_day` y `tpl_rev` en la `0043`, la primera migración, antes del reinicio; `renderNews` al leer |
| 6. Los maillots de la escapada, las cinco categorías y la interfaz para E3 y E12 | §7.2-7.9, §19.2 | la regla UCI del maillot llevado, los campeones de `palmares`, la frase de la fuga y `ChampionTitleSource` |

**D.2 Los requisitos del dueño** (mapa 05 §5.1):

| Requisito | Dónde | Con su etiqueta en |
| --- | --- | --- |
| [DUEÑO 1] El norte de la televisión como estado permanente | §6.2 (capa fija, barra y perfil), §2.1 | §6.2, §17.17 |
| [DUEÑO 2] Sin destripe | §10, §11 | §8.5, §10.1, §17.17 |
| [DUEÑO 3] Cuando se escapan cinco, que se vean sus maillots | §7.2-7.6; §6.2 (el maillot de cada corredor en la barra) y §6.7 (la presentación de la fuga, 6-m); se prueba en la segunda parte de B3 (§16.4) y con la pregunta de los maillots de la prueba de lectura (§16.5) | §7.3, §17.17 |
| [DUEÑO 4] Las cuatro preguntas en cualquier punto | §6.2 (la capa fija contesta tres: cuánto queda, cuánta ventaja y sobre quién), §12.2, §16.5 (la prueba de lectura las pregunta) | §3.5, §6.2, §12.2, §16.5 |
| [DUEÑO 5] El corredor propio se ve aunque no sea noticia | §6.2 (`Your rider · in the bunch · +2:14`, pantalla), §7.6-7.7 (siempre nombrado) | §6.2, §7.6 |
| [DUEÑO 6] Coherencia en el tiempo | §12.7 (la identidad del día), §11.5 (los agregados a horizonte), §11.12 (la previa de la N+1) | §12.7 |
| [DUEÑO 7] La criba lejana, aparcada | §6.8, §20.4; subirla en el acta es DD-29 (§20.2) | §6.8 |
| [DUEÑO 8] El visitante sin cuenta | §11.10, §10.6 (horizonte `anon`), §20.4 | §10.2, §10.6, §11.10 |
| [DUEÑO 9] Nada de decidir en vivo | §2.13, §8.10, §19.4, §20.4 | §2.13, §8.10, §19.4 |
| [DUEÑO 10] La radio sigue siendo el microscopio | §1.9, §5.1, §11.15-11.16, §12.10, §19.5 | §1.9, §4.2, §5.1, §6.4, §11.15, §12.10, §17.6, §19.5 |

**D.3 Los requisitos de los documentos** (mapa 05 §5.2):

| Requisito | Dónde | Con su etiqueta en |
| --- | --- | --- |
| [DOC 1] `news` con `seed` y `data`, antes del reinicio | §12.8, §13.2, §17.4, §17.19 | §12.8, §17.4, §17.17, §17.19, §19.8 |
| [DOC 2] Un cursor por grupo sobre la altimetría | §6.2 | §6.2 |
| [DOC 3] R23.4, R23.7 y R23.8 de la táctica | R23.4 en §7.6 (`breakHeadline`); R23.7 en §6.2 y §7.7; R23.8 en §4.7 y §6.6 (regla por defecto y B7); los tres, en §1.10 y §19.3 | §4.7, §6.6, §7.6, §12.5 |
| [DOC 4] Las dos preguntas abiertas de `docs/navegacion.md` §9 | la vista de espectador es `Watch` (§6.10); las etapas futuras se siguen enseñando con `Not raced yet` (§11.5); la corrección de la navegación, §11.17 | §6.10, §11.5, §11.17 |
| [DOC 5] «La API no puede mandar lo que la pantalla no enseña» | §2.4, §10.11, §14.1, §14.3 | §1.3, §2.4, §10.2, §14.1, §17.17 |
| [DOC 6] El móvil como plataforma y los maillots distinguibles por forma | §18.5, §18.8, §7.4 (`ChampionMark`) | §18.8 |
| [DOC 7] El criterio del paso 31 del MVP como prueba de lectura | §16.5, §17.13 | §16.5, §17.13 |

**D.4 Las quince contradicciones del mapa 05 §6:**

| Contradicción | Dónde se resuelve |
| --- | --- |
| 1. Sin destripe contra la navegación (ganador en la cabecera, en `Stages`, `Result` por defecto en la clásica, portada con el puesto) | §11.17 y §11.10; la corrección de `docs/navegacion.md` §7.1-7.4, en el paso 12 (§17.15) |
| 2. Sin destripe contra la vista de espectador pública y la crónica que se comparte | §11.10: el acta pública vive en `/report` y la puerta de entrada es `Watch` |
| 3. La crónica ve el futuro | §12.2: la voz trunca su entrada y apaga cinco pasadas; el acta es la de hoy |
| 4. La tabla que no existe (`stages.radio`, `stage_runs`) | §1.6, §13.6 |
| 5. «Traducible y re-renderizable», con matices, y subir la versión no tira las crónicas | §4.3 (`format`), §12.7-12.8, §17.19, §19.5 |
| 6. Tres dueños para el arreglo de `news` | §1.5, §12.8: es de E2 |
| 7. Dos vocabularios del mismo grupo | §6.3, §12.6 |
| 8. Cuatro nombres para un artefacto | §1.4, §6.10, §12.1, §0.6 |
| 9. `narration.ts` medio muerto | §1.4, §12.9 |
| 10. «El del equipo» son dos cosas | §1.7, §7.3 |
| 11. «El mánager no elige nada» frente a las 12 semillas | §1.7, §7.3 |
| 12. El arcoíris y el Mundial | §7.4 (`ChampionMark` no imita el arcoíris), §19.2 (el Mundial es de E12) |
| 13. Códigos que chocan | §0.6 |
| 14. El feed personal | §11.7: sigue global, con marca |
| 15. Estado falso en los rectores (los correos existen) | §1.6, §11.9 |

**D.5 Las 48 superficies del mapa 03 §4 y las once puertas de fuera.** Una fila por superficie, con el mecanismo que la cierra (P prefijo, R resta, F filtro, M máscara, G puerta, B tramos, N neutro por construcción, L libre con motivo; §10.6), el PR que la cierra (el del servidor y, tras el punto, el de la web) y el banco que la vigila. La fila entera, con la ruta, la línea y lo que ve quien no conoce la etapa, está en §11.1 y §11.2. Siete no destripan hoy (`sup. C6`, `sup. T1`, `sup. T2`, `sup. T4`, `sup. T5`, `sup. T6` y `sup. W6`), y `sup. X10` y `sup. X11` no estaban en ninguna propuesta: las encontraron §11.2, leyendo las rutas, y su corrección, midiendo la ficha de un rival antes y después de correr una etapa velada.

| Sup. | Qué es | Mecanismo | Cierra | Banco |
| --- | --- | --- | --- | --- |
| `sup. E1` | la pestaña por defecto `Story` y la crónica entera | B y G | 7b · 9a | B1a, B1c |
| `sup. E2` | el podio de `Story` | G | 7b · 9a | B1a |
| `sup. E3` | «On the road today», los maillots tras la N−1 | G en la ruta de hoy; P en la cabecera (`veilCast`) | 7b · 9a | B13, B1c |
| `sup. E4` | la pestaña `Result` | G | 7b · 9a | B1a |
| `sup. E5` | la pestaña `Classifications` | G | 7b · 9a | B1a, B1b |
| `sup. E6` | `Finish` y el deslizador de la radio | G; desde el paso 11, B sobre lo alcanzado | 7b · 9a | B1a, B16 |
| `sup. E7` | la pestaña `Profile` con marcas | N: el perfil sin marcas | 7b | B1c |
| `sup. E8` | una sola respuesta con todo y la caché de 30 min | B y G; `rev` y `private, no-store` | 7b · 9a | B1a, B18 |
| `sup. E9` | `?tab=` y `?cls=` en la URL | G: la pestaña pedida no salta la puerta | 7b · 9a y 9b | `stageTables.test.tsx` (9a) y `raceTabs.test.ts` (9b) |
| `sup. C1` | la cabecera `Winner` de la carrera | P | 8a · 9b | B1a |
| `sup. C2` | las clasificaciones por defecto de la carrera | P (`throughStage`) | 8a · 9b | B1b, B1c |
| `sup. C3` | la clásica terminada que abre en `Result` | G y P | 8a · 9b | B1a |
| `sup. C4` | la pestaña `Stages` | P | 8a · 9b | B1a |
| `sup. C5` | `Roll of honour` | F | 8a | B1a, B1c |
| `sup. C6` | `Finished` y `Under way, X of N stages raced` | L: es calendario | 8a | lista blanca de B1b |
| `sup. I1` | el ganador de cada carrera en World → Races | P | 8a · 9b | B1a |
| `sup. I2` | los campeonatos con `Winner: X` | P | 8a · 9b | B1a |
| `sup. I3` | el buscador por ganador | P | 8a | B1a |
| `sup. I4` | el calendario del equipo, vista de miembro | P | 8a · 9b | B1a |
| `sup. N1` | los titulares de `News` | F | 8a · 9b | B1a, B1c |
| `sup. N2` | la familia de cada titular | F | 8a · 9b | B1c |
| `sup. N3` | los desplegables de filtro | F | 9b | B1c |
| `sup. N4` | `Recent news` e `History` del equipo | F | 8a · 9b | B1c |
| `sup. H1` | `Last race` de la portada | P y G | 8a · 9b | B1a |
| `sup. H2` | `Season points` y `Money` de la portada | R | 8b | B1b |
| `sup. H3` | la condición y la salud del corredor propio | L para la condición (DD-08); M para la salud | 8b | lista blanca de B1b; B1c |
| `sup. H4` | «Where the energy went» | F | 8b | B1a, B1c |
| `sup. H5` | `LastRaceReport` de la ficha propia | P y G | 8a · 9b | B1a |
| `sup. H6` | `Finances` | F y R | 8b | B1a, B1b |
| `sup. H7` | My races → Results | F y P | 8a · 9b | B1a, B1c |
| `sup. P1` | `Season rank` y `Season points` de la ficha | R | 8b | B1b |
| `sup. P2` | los logros | R | 8b | B1b |
| `sup. P3` | `Palmarès` | F | 8a | B1a |
| `sup. P4` | `Recent results` de cualquiera | F y P | 8a · 9b | B1c |
| `sup. P5` | `Injured · until GD N` | M | 8b | B1c |
| `sup. P6` | puntos, presupuesto y puesto del equipo | R, con `stage_team_results.prize` (el presupuesto, DD-26) | 8b | B1b |
| `sup. W1` | los rankings mundial y sub-23 | R | 8b · 9b | B1b, B1c |
| `sup. W2` | `Season awards` | R | 8b | B1b |
| `sup. W3` | el palmarés de la vuelta de prueba | L: nunca en guardia | 8a | B1d (L con motivo; su respuesta no cambia con la etapa, §11.18) |
| `sup. W4` | `Hall of Fame` y los récords | R | 8b | B1b |
| `sup. W5` | las naciones y la lista de equipos | R | 8b | B1b |
| `sup. W6` | los rivales por fama en las órdenes | L: `fame` no se escribe | 8a | B1d (L con motivo; su respuesta no cambia con la etapa, §11.18) |
| `sup. T1` | el título de la pestaña | N: `usePageTitle` con `PreStageInfo` | 9a | `pageTitle.test.ts`, B1a |
| `sup. T2` | el favicon | N | 9a | revisión |
| `sup. T3` | los `<title>` del maillot, la bandera, el logro y `Winner: X` | el de su tabla | con su tabla | el de su tabla |
| `sup. T4` | el `badge` de las pestañas | N: cuenta etapas por ver | 9b | B1c |
| `sup. T5` | el correo | N: `stageReadyEmail` con `PreStageInfo` | 9a (el envío es de E4) | B1a |
| `sup. T6` | notificaciones, service worker, Badging API | N: no existen; la regla del correo | | |
| `sup. X1` | el informe del bloque y la tendencia | F sobre lo aprendido en carrera de los días velados | 8b | B1a, B1c |
| `sup. X2` | `upcoming-races`, que delata el abandono | M (`VeilDelta.abandons`) | 8b | B1c |
| `sup. X3` | la sesión de 7 días | `cs_viewer`, que solo restringe | 7a · 9a | B12 |
| `sup. X4` | `free-agents` y toda lista con `seasonPoints` | R, con el orden rehecho | 8b | B1b |
| `sup. X5` | la caché de React Query entre cuentas | `rev`, `clear()`, `private, no-store` y `Vary: Cookie` | 9a | `queryKeys.test.ts` |
| `sup. X6` | el historial y el autocompletado del navegador | títulos y URL neutros | 9a | `pageTitle.test.ts`, B1a |
| `sup. X7` | la vista previa de un enlace compartido | título y `og:` de `shellMetaFor`, neutros salvo el acta fuera del velo (DD-12) | 9a | B1a |
| `sup. X8` | el calendario del equipo con el presupuesto | R, con `stage_team_results.prize` (DD-26) | 8b | B1b |
| `sup. X9` | `alreadyOut` de la retirada | M: `alreadyOut: false` sin escribir nada | 8b | B1c |
| `sup. X10` | el planificador y su proyección, que delatan el abandono | M (`VeilDelta.abandons`) | 8b | B1c |
| `sup. X11` | los atributos de la ficha de cualquier corredor | L (DD-08) | 8a | lista blanca de B1b; B1c |

**D.6 Las cinco categorías de maillot** (punto 6 del encargo; [DUEÑO 3]; mapa 05 §4). La tabla entera, con lo que hay hoy y lo que añaden E3 y E12, es la de §7.3:

| Categoría | Lo que enseña E2 | Dónde | Lo que queda fuera |
| --- | --- | --- | --- |
| 1. La general (amarillo) | el maillot llevado con `delegated` y `from`, `Race leader’s group` (pantalla) en la barra y la línea del rótulo | §7.1, §7.2, §6.3 | el dibujo definitivo, de E3 |
| 2. Los puntos (verde) | ídem, con `wears_for` y `leads` | §7.2 | ídem |
| 3. La montaña (azul) | ídem | §7.2 | ídem |
| 4. El campeón | `ChampionTitle` provisional derivado de `palmares`, solo en su disciplina y su categoría; `ChampionMark`; `Champion of Italy` (pantalla) | §7.4, §7.9 | la señal de E3; la tabla de títulos, el Mundial y la siembra, de E12 (DD-06) |
| 5a. El equipo: la equipación | la del equipo con el que corrió, con su semilla del día congelada (`CastTeam.jerseySeed`) | §7.3 | el editor, de E3; el patrocinador, de E8 |
| 5b. El equipo: el dorsal amarillo del equipo líder | fuera del rótulo (DD-13); en la clasificación por equipos de `Report` | §7.3, §20 | el dibujo, de E3 |

**D.7 La contrarreloj:**

| Qué | Dónde |
| --- | --- |
| la crono tiene tipo y traza por km de cada corredor (`TimeTrialTrace`, `onTimeTrialRide`; I-08, O-11) | §9.2 |
| el estado en `t`: en ruta, el sillón, los parciales en cualquier km y la general virtual | §9.3 |
| el ritmo por fracción de salidos, medido de 5:20 a 11:23 (el prólogo de 176 corredores, de 6:24 a 7:06; una nacional de 40 km con 12, de 5:20 a 5:24), y el digest de una crono (8-m) | §9.4, §8.3 |
| los rótulos de la tele: `ON COURSE`, `SPLIT 1`, `FINISH` con `HOT SEAT` y `VIRTUAL GC` (pantalla), y los parciales con signo | §9.5 |
| lo que pidió el dueño, «quién hace el mejor tiempo y quién le supera… también cuando alguien de los primeros "dobla" a otro» (`docs/balance.md` l. 3337-3342, v18; mapa 05, F1): el sillón en pantalla y los alcances en la voz (`tt_catch`) | §9.3, §9.5, §9.9 |
| los percances, revelados en la salida del corredor más su reloj en el km del suceso | §9.6 |
| la previa (favoritos por CRI, orden de salida) y el cierre (el sillón del ganador) | §9.7 |
| I5 exacta y B11 con la crono | §9.8, §16.2, §16.4 |
| la crono por equipos del calendario real, que el motor corre como individual (9-m) | §9.1 |
| la crono sin línea abre en `Report` (3-d) | §3.8 |

**D.8 Lo que E10 necesita** (`docs/encargos.md` l. 528-549; mapa 07 §3; D-62). La tabla entera, con lo que sigue en inglés y por qué, es §12.11:

| Qué | Dónde |
| --- | --- |
| todo lo que E2 escribe como plantilla, datos y semilla, nunca como texto; en el tick, cero texto | la voz y el acta (§12.2), `NewsPayload` (§12.8), los rótulos como `Cue` (§6.5), el título y el aviso (§11.8, §11.9) |
| una semilla de variante neutra de idioma | `variantSeed` y `pickVariant` con `since` (§12.7) |
| `locale` en cada punto de render | `renderNews(locale, …)` y los demás renders, con el literal `'en'` hasta el segundo idioma (§12.11) |
| los datos que pide la concordancia | el género en el reparto (`CastRider.gender`, §4.2); las cuentas como números |
| el vocabulario de grupos como código | `GroupRole` y `GROUP_WORDS` (§6.3), `mainRole` y `groupRole` en la voz (§12.6) |
| la noticia con su carrera y su etapa | `NewsPayload` y la `0043` (§12.8, §13.2); `text` hasta DD-19 |

### 21.5 Apéndice E · Las 24 contradicciones de hecho entre propuestas

Dos propuestas que afirmaban cosas incompatibles sobre el código, con el veredicto que dieron los jueces al comprobarlo y la decisión que lo cierra (`veredicto.json`, `contradicciones`; `00-decisiones.md`). Ninguna sección las reabre; donde una sección midió de nuevo y precisó la cifra, la última columna lo dice.

| X | Tema | Qué se afirmaba | Veredicto de los jueces | Resolución y evidencia | Decisión | § |
| --- | --- | --- | --- | --- | --- | --- |
| X-01 | ¿Hay reloj absoluto? | el mapa 01 §0: no lo hay; `producto`, `ingeniero`, `datos` y `television`: `tS` es tiempo de carrera absoluto | cierta, con matiz (juez del motor C1; ejecutabilidad §2.3) | hay un eje común, segundos desde la salida común; lo que no existe es el instante (`group.ts` l. 26-27 y 56; `simulate.ts` l. 7249 y 8817) | D-01 | §1.2, §3.1 |
| X-02 | La monotonía del reloj | `television`: la cabeza y los cambios de corredor son monótonos; `estado`: la cabeza sí salvo 0-2 bloques, el corredor no | la cabeza, a medias las dos; el corredor, falsa la de `television` (C2, C3, C4) | por km la cabeza no baja; por bloque, de 0 a 2 veces y 2,8 s como mucho; un corredor retrocede hasta 77 s por km y 138 s por bloque (`race-colombia` e5, semilla 0, km 183,25) | D-01 | §1.2, §3.1, §3.6 |
| X-03 | ¿Guardar desde la sonda sube `ENGINE_VERSION`? | cuatro propuestas: no; `producto`: no, pero sus fotos finas cambian el aprendizaje | cierta, con una condición (C5, C11; cobertura §2.6) | no sube, si el aprendizaje y la radio ven las mismas fotos que hoy; 20 de 20 etapas idénticas con sonda en cada bloque | D-08, D-09 | §5.1 |
| X-04 | ¿Hace falta subir `ENGINE_VERSION`? | `estado`: v90 por las pancartas; `producto`: v90 con cuatro cambios; `ingeniero` y `datos`: opcional; `television`: nunca | nada de E2 la necesita (C16; cobertura §2.8) | con `onBanner`, `onEvent`, `incidents` y `startS + tS` no hace falta; cambiar el contenido de un suceso sí sube (la v73) y, antes del 17d, cambia la «Last race» | D-09 | §5.1, §19.5 |
| X-05 | ¿Subir la versión tira las crónicas guardadas? | `docs/balance.md` l. 14684-14686: sí; `routes/races.ts` l. 474-477 las lee sin mirar la versión | falsa (cobertura §2.8) | la crónica guardada no se tira; lo que se rompe es la «Last race», que re-simula (`raceReport.ts` l. 148) | D-58 | §17.15, §19.5 |
| X-06 | El tamaño de la línea temporal | `datos`: 17,5 KB en disco; `estado`: 5,5-39 KB; `ingeniero`: +52-74 KB de JSON; `producto`: 106-178 KB, y 3-9 KB en disco | ciertas, miden objetos distintos; falsa la de `producto` en disco (C7) | cada cifra con lo que mide; la radio v2 en `jsonb` añade de 4,7 a 53 KB. Después, §5.7 midió el formato que se guarda: de 20,9 a 70,0 KB en `bytea` (mediana 38,8) | D-11 | §1.8, §5.7 |
| X-07 | `json`, `jsonb` o `bytea` | `estado`: `json` ocupa un 26-32 % menos que `jsonb`; `datos`: por eso `bytea` con gzip | ciertas (C8) | `json`, de un 15 a un 44 % menos que `jsonb`; `bytea` gzip, de 1,6 a 2,4 veces menos; PGlite no admite `lz4` | D-10 | §5.6, §13.3 |
| X-08 | El coste de CPU de la sonda en cada bloque | `estado`: de +4 a +27 %, mediana +10 %; el mapa 01: de +1,5 a +4 %; `datos`: 59-81 ms por etapa | a medias (C6) | de −7,7 a +11,6 %, mediana +3,8 %; el grabador, de 38 a 51 ms por etapa grande; §18.3 midió después un 3,1-3,2 % en los nacionales | D-12 | §5.8, §16.4, §18.3 |
| X-09 | ¿La carrera sale idéntica con la sonda en cada bloque? | `estado`: 15 de 15; `datos`: 4 etapas | cierta (C5) | 20 de 20 (10 etapas por 2 semillas) en `results`, `events`, `efforts` e `incidents`; §5.1 midió 24 de 24 con los tres ganchos | D-09 | §5.1, §5.10, §16.4 |
| X-10 | ¿Las fotos finas por la misma sonda son inocuas? | `producto`: es observación y no toca nada; `estado` y `datos`: cambian el aprendizaje | falsa la de `producto` (cobertura §2.6; C11) | `trabajaronParaOtro` apunta en cada foto y `TURNO_KM` cuenta fotos (`stageRun.ts` l. 515-536; `raceRadio.ts` l. 597 y 883); §5.3 midió la envoltura ingenua: 6 de 18 corridas cambian | D-08 | §5.3, §16.4 |
| X-11 | ¿El horizonte cuesta menos de 5 ms? | `estado` §7.2: sí (estimado) | falsa sin índice (C12) | 19,6 ms recorriendo `race_rosters` (249.232 filas) y 0,11 ms con índice por `rider_id`; después, §18.2 midió la forma D: en PGlite, 3,1-3,7 ms el jugador y 8,6-9,3 el mánager, y en PostgreSQL 16 sin red, 2,16 y 3,88 (DD-21) | D-33 | §1.6, §10.7, §13.4, §16.4 |
| X-12 | `riders.fame` | `producto` e `ingeniero`: no se escribe; `television`: notoriedad por percentil de fama; `datos`: `CastRider.fame` | cierta, no se escribe (C14; cobertura §2.7; ejecutabilidad #10) | todos empatan a 0 (`rollover.ts` l. 58-60 y 291-295; `columnasVivas.test.ts` l. 34-38); la notoriedad cuenta victorias | D-26 | §1.7, §7.5 |
| X-13 | El campeón nacional | cuatro: derivable de `palmares`, «desde el primer día»; `television`: de `race_gc` con el dorsal 1; `estado`: `LIKE 'nc-%-road'` | `palmares`, cierta; `race_gc`, a medias; «desde el primer día» y el `LIKE`, falsas (cobertura §2.1-2.2; C18; ejecutabilidad #12) | una consulta a `palmares` para todos; `race_gc` no tiene `world_id` ni `game_day`; tras el reinicio no hay campeones hasta el día 179; el `LIKE` casa con `nc-it-u23-road` | D-25 | §1.7, §7.4 |
| X-14 | ¿Qué pasadas de la crónica miran el futuro? | `ingeniero`: cinco exactas y la longitud de la etapa; `television`, `estado` y `datos`: también `respecto` y `juntos`; `producto`: que lo fije un test | cierta la de `ingeniero`; falsa la otra (cobertura §2.3; ejecutabilidad #8) | `markConcession`, `dropUndoneSelections`, `groupGapRuns`, `foldQuickAttacks` y `groupRuns` miran el futuro; `respecto` y `juntos` son causales; `desenlace` solo necesita la longitud (`chronicle.ts` l. 319, 361, 362, 371, 375, 545, 637, 945) | D-43 | §1.4, §12.2 |
| X-15 | Las fechas trucadas (a) y (f) | `ingeniero` §1.3: (f) queda bien por su `tS`; `datos` §3.4: (a) visible cuando el hueco al `mainGroup` pasa de 45 s; `estado`: `bEmit` por `onEvent` | (f), falsa; (a), a medias; `bEmit`, exacto (C9, C10) | `climb_kom` lleva el reloj del primer grupo que corona y el ganador puede ir en otro; la fuga se emite contra su grupo de origen, que no siempre es el `mainGroup` (`simulate.ts` l. 9287, 9310, 8693, 8708, 8727) | D-05 | §4.7, §5.2, §5.4 |
| X-16 | La sesión de 7 días y la caché | `producto`: la sesión caduca a los 7 días, la caché sobrevive al cambio de cuenta y la portada de invitado, las noticias y el ranking destripan | sesión y caché, ciertas; la portada de invitado, a medias (cobertura §2.5; C13; ejecutabilidad #7) | `GuestHome` no enseña resultados; la fuga son `/news`, `/world` y los rankings, públicos (`create-context.mjs` l. 146-147; `Account.tsx` l. 311-314; `queryClient.ts` l. 17-46) | D-34, D-35 | §1.6, §10.8, §10.9 |
| X-17 | Las 48 superficies y las rutas | las cinco: el destripe está en las 48 del mapa 03; `ingeniero`: unas 50 rutas `GET` | a medias; cierta la cuenta de rutas (cobertura §2.4; ejecutabilidad #11, #14) | 48 filas exactas, pero siete no destripan, y hay fugas fuera (`upcoming-races`, `report` y `trend`, `free-agents`, `alreadyOut`); 52 rutas `GET`. §11.3 contó después 87 rutas propias, §11.2 añadió `sup. X10` y su corrección, `sup. X11` | D-32, D-41 | §1.6, §11.1, §11.3, §14.5 |
| X-18 | La duración de la reproducción | `television`: unos 10 min y 30; `estado`: de 5:02 a 15:03; `producto`: unos 8 y 14; `datos`: 7,8-20,4, mediana 12,7; `ingeniero`: unos 6,5 y 8, el último km a ×1 | `datos`, cierta; `producto`, cierta sin pausas; las demás, a medias; en crono, solo `producto` (ejecutabilidad §2.1, §2.3) | medido en siete etapas y dos semillas: la tabla de D-19 (§8.3) | D-19 | §8.3 |
| X-19 | El coste diario de seguir una gran vuelta | `datos` §16.3: unos 13 min al día | falsa (ejecutabilidad #15) | 21 etapas en 23 días de juego de 6 h son unas 3,65 etapas por día real: unos 46 min con su propia mediana; de 28 a 49 con la curva elegida; el Giro, con tres descansos, corre en 24 días y 3,5 etapas por día real, de 27 a 47 (§8.4, D-19 en la fase 5) | D-19 | §8.4, §20 |
| X-20 | Qué plan rompe la web de hoy | `producto`: `StageCard` en la ruta de etapa; `estado`: `/api/news` sin `text`; `television`: 403 sin interruptor; `datos` e `ingeniero`: nada | rompen `producto`, `estado` y `television` (ejecutabilidad §2.3, #1, #2, #3) | `StageCard` no trae `run` y la web valida con `stageReplaySchema` (`ContractError`); una SPA cargada valida `text: z.string()`; los opcionales de `stageReplaySchema` sí se pueden omitir | D-50, D-45 | §12.8, §14.1 |
| X-21 | Las plantillas y los narradores | `ingeniero`: 55 plantillas y 272 redacciones sin cambiar una frase ni añadir un `case`; `producto`: `narrate()` no tiene llamadas | `ingeniero`, a medias; `producto`, cierta (ejecutabilidad #5, #6) | cuatro plantillas caen al `default` que imprime la clave (`stageJournal.ts` l. 1602-1603) y su propio B7 exige frase; `narrate` solo lo usa su test | D-44, D-47 | §1.4, §12.5, §12.9 |
| X-22 | Qué PR pagan los bancos y cuál es la próxima migración | `ingeniero`: solo los que tocan `packages/engine/`; las cinco: la próxima es la `0043` | ciertas (ejecutabilidad #9; C17) | el filtro de `ci.yml` l. 189 mira `^packages/engine/`, se suba o no la versión; `_journal.json` tiene 43 entradas, la última `0042_transicion_e1` | D-52, D-49 | §13.1, §15.1, §17.1, §17.7 |
| X-23 | El formato guardado de la línea | `datos`: `StoredTimelineV1` (citado en sus l. 663 y 809) | falsa: nunca se define (ejecutabilidad) | lo definió el glosario de la síntesis y lo escribe entero §4.3 | D-10 | §4.3 |
| X-24 | Los picos del tick | los mapas 02 y 04: hasta 187 etapas en un día | cierta (C15) | día 176, 187 cronos nacionales; día 179, 153 nacionales en línea; E2 les suma de 2 a 8 s (estimado por el juez); §18.3 lo proyectó después de lo medido por nacional, de +0,7 a +0,8 s el 176 y de +15,5 a +18,9 s el 179, sin los sub-23, sin `buildTimelineCast` y sin escribir | D-12 | §16.4, §18.3 |

### 21.6 Apéndice F · El vocabulario

La parte del glosario que no está en el cuerpo del documento, para que se lea sin los ficheros de trabajo del diseño: las palabras de la prosa, dónde vive cada familia de nombres, las funciones con su firma final, los textos de pantalla y los identificadores del proceso. Los tipos están enteros en §4, las constantes en §15, las tablas y columnas en §13, las rutas en §14.2 y §11.3, los interruptores en §14.6, los bancos en §16.9, los pasos y los PR en §17.2 y los ficheros, PR a PR, en §17.20. El glosario que escribió la síntesis (en `docs/diseno/e2-retransmision/`) no viaja con el documento. Tenía trece partes de vocabulario, y cada una está en este documento donde dice la tabla; ese sitio es el que se escribe donde una sección remitía a una parte del glosario, y donde una frase contrasta una firma o un nombre con el que fijó la síntesis, lo escribe entero y dice que es el que fijó la síntesis (decisión 21-f):

| Parte del glosario de la síntesis | Qué nombraba | Dónde está en este documento |
| --- | --- | --- |
| G.1 | las palabras de la prosa | F.1 |
| G.2 | los ficheros nuevos y tocados | §17.20, PR a PR; los de los tipos, en §4.13 |
| G.3, de G.3.1 a G.3.8 | los tipos canónicos | §4: la línea temporal, §4.2 y §4.3; el instante, §4.5; el rótulo y los maillots, §4.8; la pantalla, §4.9; el horizonte y el velo, §4.10; la red y el contrato, §4.11; las noticias, §4.12; lo que proponían las secciones, escrito ya en su sitio (4-u) |
| G.4 | las funciones | F.2 |
| G.5 | las tablas, las columnas, los índices y las migraciones | §13 |
| G.6 | las rutas | §14.2, y §11.3 con su política |
| G.7 | las constantes | §15 |
| G.8 | los interruptores | §14.6 |
| G.9 | los bancos y los invariantes | §16.9; los invariantes, en §4.4 y §16.2 |
| G.10 | los pasos del plan | §17.2 |
| G.11 | los textos de pantalla | F.3 |
| G.12 | los identificadores del proceso | F.4 |
| G.13 | los alias de las propuestas | la tabla de alias de §21.1 |

Los nombres que las secciones añadieron al escribirse, y los que añadió la corrección, están fundidos en ese glosario; aquí se recogen los que cambian una firma, una palabra de la prosa o un texto de pantalla.

**F.1 Las palabras de la prosa** (las de la síntesis, más las seis que acuñaron las secciones, al final):

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
| la marca de reloj | el reloj exacto de un grupo en un bloque, grabado en cuatro sitios (D-01); entre marcas, el reloj se interpola |
| la capa de detalle | lo que hoy guarda la radio por grupo y km: velocidad, quién tira, motivo, destinatario, percance (`GroupDetail`) |
| el reductor | la función pura que aplica un suceso de estado a una foto (`reducePhoto`) |
| en tránsito | el corredor que en el instante aparece en dos grupos o en ninguno, porque cambió de grupo en el tramo de carretera que los separa (`InTransit`) |
| el grabador | el módulo puro del motor que recibe las fotos de cada bloque y escribe la línea temporal (`timelineRecorder`) |
| la sonda | `StageProbe`, la observación sellada del motor (`types.ts` l. 487-504) |
| el colector aparte | la envoltura de la sonda en `stageRun.ts` que da a la radio y al aprendizaje SOLO las fotos de `radioKmPoints` y al grabador todas (D-08) |
| el reparto congelado | el catálogo de corredores de la etapa con su equipo del día, maillot llevado, distinciones y general de salida, cada dato con su procedencia (`TimelineCast`) |
| la procedencia | la etapa de la que sale un dato del reparto (`StageRef`, campo `from`); si esa etapa está velada, el dato no viaja |
| la visibilidad | la hora de carrera a partir de la cual un dato se puede enseñar (`visibilityOf`); el servidor solo sirve lo que tiene visibilidad ≤ lo alcanzado más la precarga |
| el tramo | lo que el servidor manda de una vez: los datos con visibilidad en `(fromDs, toDs]` (`BroadcastChunk`) |
| el paquete de meta | llegadas, resultado, acta y clasificaciones de después; nunca va en un tramo, solo en `BroadcastFinish` |
| lo alcanzado | la hora de carrera hasta la que el jugador ha reproducido (la informa el cliente, `race_watch.reached_s`); convierte una etapa en vista |
| lo servido | la hora de carrera hasta la que el servidor ha entregado tramos; nunca pasa de lo alcanzado más `BROADCAST.prefetchRaceS` y NO cuenta como visto |
| el horizonte | lo que un espectador conoce de cada carrera en guardia, calculado en el servidor en cada petición (`Horizon`) |
| el velo | las etapas corridas que el horizonte oculta ahora mismo a ese espectador (`Horizon.veil`) |
| en guardia | una carrera cuyas etapas se protegen para ese espectador (propia, de su equipo, seguida o de cabecera, D-30) |
| el alcance del velo | qué carreras están en guardia por defecto (`users.spoiler_scope`) |
| la caducidad | cuándo el velo de una carrera se levanta solo (`SPOILER.expiryGameDays` tras su última etapa) |
| etapa conocida | etapa vista (`W` directo, `S` resumen), revelada (`R`) o arrastrada (`A`): `WatchState.known` (10-e); la caducada (`X`) está fuera del velo pero no es conocida y abre en `Watch`, como la de una carrera fuera de guardia; lo conocido de una carrera es un prefijo 1..k, y `known_through` cuenta el prefijo de letras, `X` incluida |
| revelar | el acto explícito de conocer el resultado sin ver la etapa; no premia ni castiga |
| el arrastre | conocer la etapa N porque el jugador aceptó ver o revelar una posterior (letra `A`); la etapa arrastrada no se ha visto y abre en `Watch`, con `Report` a un toque, como la caducada (6-r) |
| la puerta | la pantalla que sale en lugar de un resultado velado (`StageGate`) |
| el mecanismo | cómo aplica el servidor el velo a una superficie: P prefijo, R resta, F filtro, M máscara, G puerta, B tramos, N neutro por construcción, L libre con motivo (D-32) |
| la voz | las líneas de comentario en vivo, la crónica causal truncada a la hora `T` (`LiveLine`) |
| el acta | la crónica entera con perspectiva, el podio, el resultado y las clasificaciones de después; en pantalla, `Report` |
| el rótulo | con qué presenta la tele a un corredor: dorsal, nombre, bandera, equipo, maillot llevado y hasta tres líneas (`RiderCard`) |
| el maillot llevado | el ÚNICO maillot que se ve (`WornJersey`) |
| las distinciones | lo que el rótulo dice además (`Distinction`) |
| la notoriedad | el orden de la frase del comentarista, sin `fame` (`NotorietyLevel`, D-26) |
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
| el modo diagnóstico | la vista del administrador que no aplica el velo ni cuenta como visto (`?diag=1`, D-40) |
| el adaptador de la radio | la línea temporal degradada que la API construye desde `stage_snapshots.radio` para las etapas sin línea grabada, con reloj estimado |
| la prueba de lectura | el protocolo humano de aceptación (PL): un tercero entiende qué pasó sin ayuda (MVP paso 31) |
| la lápida | la fila de `stage_timelines` con `format = 0` de una etapa que se corrió con la grabación encendida y no dejó línea; la etapa abre en `Report` (5-k) |
| la línea cortada | la línea con solo lo visible hasta una hora de carrera, sin reparto, tiempo ni meta (`TimelineCore`, lo que devuelve `cutTimeline`; 4-b) |
| el reparto servido | el reparto congelado ya degradado por el velo de quien mira (`veilCast`) y convertido en rótulos (`serveCast`; §7.8, §10.10) |
| la forma D | cómo consulta `computeHorizon`: los ids del espectador por delante, `rider_id = any(ids)` y la última etapa corrida de cada carrera una vez por día de juego (18-a) |
| el sello | la posición del autor en una carrera, en segundos de carrera, que lleva el contenido de un jugador para E9 (`AuthorStamp`, 11-n) |
| la puerta de fuera | una pantalla o ruta que filtra un resultado sin estar entre las 48 superficies del mapa 03 (`sup. X1` a `sup. X11`, §11.2) |

**F.2 Las funciones, con su firma final.** La síntesis fijó las firmas antes de escribir las secciones; varias cambiaron al escribirse, y manda la de la sección, que es la que se lista aquí con la decisión que la cambió. Los parámetros se abrevian con `…` cuando no cambian.

| Firma | Fichero | Qué hace | § |
| --- | --- | --- | --- |
| `timelineRecorder(opts: TimelineRecorderOptions): TimelineRecorder` (con `lengthKm` y `timeTrial`, 5-e) y `TimelineRecorder.finish(input: RecorderFinishInput): StageTimeline` | `packages/engine/src/sim/timeline.ts` | el grabador puro: fotos de cada bloque, ganchos y percances; guarda dos fotos a la vez | §5.4 |
| `selfCheckI1(tl, kmPhotos: ReadonlyMap<Block, readonly SnapshotRider[]>): readonly I1Mismatch[]` (5-i) y `selfCheckI5(tl, output)` (5-j), cuyo elemento es `{ rider, check: number \| null, expectedDs, gotDs }` | ídem | las autocomprobaciones al grabar; I5 en una crono: `kmClockDs[r].at(−1) = 10 · tiempoS` y `checkClockDs[r][c] = 10 · splitS` de cada `tt_split` de su primer protagonista (null en la meta) | §5.5 |
| `profileStripOf(profile, at)`, `freezeStageWeather(input, seed)` y `ttTraceOf` | ídem | el perfil y el tiempo congelados; la traza de la crono | §5.4, §9.2 |
| `radioGroupDetails` | `packages/engine/src/sim/raceRadio.ts` | la capa de detalle, compartida por la radio y el grabador (5-g) | §5.4 |
| `encodeTimeline(tl): StoredTimelineV1` y `decodeTimeline(s: unknown): StageTimeline` | `packages/shared/src/broadcast/codec.ts` | inversas; `decodeTimeline` despacha por `format` | §4.3 |
| `reducePhoto(p: Photo, e: StateEvent): Photo`, `photoAt(tl: TimelineCore, b: Block): Photo` y `clockMarksOf(tl, g: GroupIx): readonly (readonly [Block, Ds])[]` | `packages/shared/src/broadcast/reduce.ts` | el reductor, la foto de un bloque y las marcas de reloj de un grupo por bloque creciente (la `marcasDe` del primer borrador, §3.3) | §3.3, §4.4 |
| `instantAt(tl: TimelineCore, t: RaceS, ctx: InstantContext): Instant`, `groupRoleOf`, `groupLabelOf`, `mainGapOf`; `GROUP_ROLES` y `isGroupRole(x: unknown): x is GroupRole` | `packages/shared/src/broadcast/instant.ts` | el corte diagonal, causal; el papel, la etiqueta y la diferencia principal; la guarda del papel que llega en `datos` | §4.5, §6.2, §6.3, §12.6 |
| `timeTrialInstantAt(tl: TimelineCore, t, ctx): TimeTrialInstant` | `packages/shared/src/broadcast/timeTrial.ts` | el estado de la crono en `t` | §9.3 |
| `visibilityOf(tl: TimelineCore)`, `cutTimeline(tl, toS): TimelineCore` y `chunkOf(tl, fromDs, toDs): Omit<BroadcastChunk, 'lines'>` (4-b, 4-r) | `packages/shared/src/broadcast/cut.ts` | la visibilidad de cada dato, la línea cortada y el tramo sin la voz, que pone la ruta | §4.6 |
| `revealSOf(e: RevealInput, source: number, bEmit: Block, tl: RecorderView): RaceS` (4-r) | `packages/shared/src/broadcast/reveal.ts` | aplica `REVEAL_RULES` | §4.7 |
| `cuesBetween(prev, next, events)`, `cueClassOf(cue, start, lastVirtualLeader, timeTrial): CueClass` (9-n), `isPresentation(cue: Cue): boolean` y `aheadOfPeloton(i: Instant, r: RiderIx): boolean` | `packages/shared/src/broadcast/cues.ts` | los rótulos que produce el paso de un instante al siguiente, su clase, la presentación de la fuga (6-m) y si un escapado sigue por delante del pelotón | §6.5 |
| `paceAt`, `playbackEstimateS`, `digestPace(profile, kind)`, `digestMinutes(kinds)`, `ttPaceAt(t, plan, lastKmFromS)` y `ttPlaybackEstimateS(profile, plan)` | `packages/shared/src/broadcast/pace.ts` | las curvas y las duraciones, siempre con velocidades nominales | §8.2, §8.8, §9.4 |
| `radioFromTimeline(tl: TimelineCore, names: RadioNames): RaceRadio`, con `RadioNames` = `{ riderOf; own: ReadonlySet<RiderIx>; nameableAt: (km: number) => ReadonlySet<RiderIx> }` (12-o) | `packages/shared/src/broadcast/radio.ts` | el microscopio desde la línea, con el contrato de hoy; en una crono, la radio vacía | §12.10 |
| `groupLabelText(_locale, …)`, `breakHeadline(_locale, cards, ownIx)`, `namedRidersOf(g, cast, revealed, …)`, `pullingLineOf(detail, members, cast): PullingLine` (con el `motive` de cada equipo), `breakRoundOf(riders: readonly RiderIx[], cast: readonly RiderCard[]): readonly RiderIx[]`, `championTitleText(_locale, t, n)`, `cardCaption(worn, n)`, `cardLineText(d, n)`, `ordinal(n)`, `gapText(s)`, `listAnd(xs: readonly string[]): string` y `gapTrendLine(_locale, trend)`; `GROUP_WORDS` (el maillot, en pares [barra, voz]) y `PULL_MOTIVE_WORDS` | `packages/shared/src/broadcast/names.ts` | el vocabulario, la frase de la fuga, a quién se nombra, los que tiran y los textos del rótulo | §6.3, §6.4, §7.4, §7.6, §7.7 |
| `wornJerseys(input: WornInput)`, `distinctions(riderId, input, worn, start, …)`, `notorietyOf(card, instant)` y `staticNotoriety(worn, lines, knownWins, category)` | `packages/shared/src/jerseys.ts` | la regla UCI del maillot llevado y la notoriedad | §7.2, §7.5 |
| `pageTitle(_locale, p: PreStageInfo \| null, page: PageKind)` y `stageReadyNotice(_locale, p, ownRiderOnStartlist)` (12-q) | `packages/shared/src/broadcast/pageTitle.ts` | títulos y avisos que no pueden llevar un resultado por tipo | §11.8, §11.9 |
| `renderNews(locale: 'en', p: NewsPayload, seed, rev, n: NameResolver)` y `pickVariant(seed, variants, rev)` | `packages/shared/src/news.ts`, `packages/shared/src/render/variants.ts` | la noticia al leer; la variante con `since ≤ rev` | §12.7, §12.8 |
| `chronicleParts(_locale: 'en', e: ChronicleEntry, rev: number): ChroniclePart[]` y `chronicleLine(_locale: 'en', e: ChronicleEntry, rev: number): string` (12-q) | `apps/web/src/domain/stageJournal.ts` | el renderizador común de la voz, `Commentary` y el acta, con la revisión de plantillas de la etapa | §12.1, §12.7 |
| `buildTimelineCast(tx, …)` | `packages/db/src/cast.ts` | el reparto congelado con procedencia, en el tick | §5.4, §7.8 |
| `palmaresTitleSource.titlesOn(q: Queryable, worldId, gameDay)` (7-k) | `packages/db/src/titles.ts` | el proveedor provisional de títulos | §7.4 |
| `startStageTimeline(…)`, `recordStageTimeline(tx, run, log, ctx)` (no escribe), `stageTimelineRow(tl, meta): { row, bytes, jsonBytes }`, `tombstoneRow(meta, failure): StageTimelineRow`, `writeStageTimelineRows(tx, rows)`, `readStageTimeline(db, _h: Horizon, raceKey, stageDay): Promise<StageTimeline \| null>`, `readStageTemplateRev(db, _h: Horizon, raceKey, stageDay): Promise<number>` y `clearStageTimelineCache()`; el diario `TimelineTickLog`, con `recorded(row, sizeNote)`, `failed(tombstone, note)`, `flush(tx)` y `summary()` (5-d, 5-k, 5-p; sin `StageTimelineRead`, `writeStageTimeline` ni `writeStageTimelineFailure`, 14-p y la corrección de §5) | `packages/db/src/timelines.ts` | el colector aparte, la fila con gzip 9 y la lápida, su escritura de una vez por día, y la lectura con el LRU | §5.3, §5.6 |
| `computeHorizon(db, viewer, world)`, `horizonSummary`, `veilDelta`, `veilSql(h, raceKey, gameDay, stageDay?)` (10-d), `throughStage`, `isVeiled`, `stageGateOf`, `veilCast(cast, h)`, `worldHorizon`, `anonHorizon()`, `lastRunStages(db, world)` y `touchLastSeen`; `TtlMemo<V>`, el memo con vida, barrido y tope de los tres memos del proceso (10-m) | `packages/db/src/horizon.ts` | el horizonte en un solo punto y todo lo que lo lee | §10.6, §10.7, §10.10, §18.2 |
| `recordProgress`, `revealStage`, `setFollow`, `setSpoilerScope`, `readWatch` y `LETTER_OF_MODE` | `packages/db/src/watch.ts` | las escrituras de `race_watch` y `users` | §10.3 |
| `veiledRaceDays(h, d, riderId)` y `veilDailyLog(rows, veiled)` | `packages/db/src/riders.ts` | los días de carrera velados y la serie de forma enmascarada | §11.13 |
| `emitNews(tx, { …, seed, payload, raceKey })` y `newsNames(db, payloads)` | `packages/db/src/news.ts` | la noticia con semilla y datos; los nombres al leer | §12.8 |
| `creditRider(…, note, ref?: StageRef)` y `awardRacePrizes(…, gcOrder, ref: StageRef)` | `packages/db/src/economy.ts` | el rastro de etapa del dinero (13-e, 13-g) | §13.5 |
| `registerSpoilerGuard(app, deps: SpoilerGuardDeps \| null): RouteRegistry` (14-c) y `stageAccessOf(a: StageAccessInput)` (14-e) | `apps/api/src/spoiler.ts` | el registro que no deja arrancar sin política; qué sirve la ruta de etapa | §14.1, §14.5 |
| `signViewerCookie` y `readViewerCookie` | `apps/api/src/viewerCookie.ts` | la cookie `cs_viewer` | §10.8 |
| `timelineForStage(db, h: Horizon, raceKey, stageDay): Promise<StageTimeline \| null>` (14-p) y `serveCast(cast, h, names, ctx)` | `apps/api/src/broadcastSource.ts` | la línea grabada o el adaptador de la radio; el reparto servido | §14.4, §7.8 |
| `buildChronicle(events, names, options & { live: LiveChronicle }): LiveLine[]` y, sin `live`, `ChronicleEntry[]`; `veilStoredRadio(stored, nameableAt)` | `apps/api/src/chronicle.ts` | la voz y el acta; la radio guardada sin su lista de seguimiento | §12.2, §11.16 |
| `withGroupRoles(events, tl, revealS, ctx)` y `liveClusters(events, tl, revealS): readonly LiveCluster[]` (el racimo, su hora de publicación y los sueltos que absorbe) | `apps/api/src/voiceRoles.ts`, `apps/api/src/liveClusters.ts` | el papel de cada grupo en la voz y los racimos en vivo | §12.3, §12.6 |
| `stageReadyEmail(_locale, p: PreStageInfo, ownRiderOnStartlist: boolean, url: string): MailBody` (11-d, 12-q) | `apps/api/src/emails.ts` | la plantilla del correo; el envío es de E4 | §11.9 |
| `shellMetaFor`, `injectShellMeta` y `sendGate(reply, gate)` | `apps/api/src/spaShell.ts`, `apps/api/src/http.ts` | el título y las `og:` del fallback de la SPA; el 403 de la puerta | §14.10, §14.2 |
| `usePageTitle(p, page)`, `playerInit(view, stageDay, reachedS, known)` y `playerStep(s, a, ctx)` (con `PlayerState.idleS`, `stageDay` y `loaded`, `PlayerContext.digestNext`, las acciones `touch` y `throttled`, `cueAdmitted.round` y los efectos `finish` con `mode` y `release`, §8.11), `raceTabs(status, stageCount, known)` y `useHideBottomNav(hidden)` | `apps/web/src/domain/pageTitle.ts`, `domain/broadcast/player.ts`, `domain/raceTabs.ts`, `components/BottomNav.tsx` | el único escritor del título, el reproductor, las pestañas y la barra inferior (propuesta a E6) | §11.8, §8.11, §11.17, §18.6 |
| `fetchCalendarStage(raceId, day, opts?: { readonly diag?: boolean })` (14-s); `horizonKey(base, rev: string \| undefined)` y `cacheOwnerChanged(prev, next)`, con `<HorizonWatcher />` (14-r) | `apps/web/src/api/results.ts`, `apps/web/src/queryClient.ts` | el `?diag=1` de la página, reenviado desde el 7b; las claves con horizonte, que esperan al `rev`; el vigilante que limpia la caché solo cuando cambia la cuenta | §14.11 |

**F.3 Los textos de pantalla** (los que fijó la síntesis, en inglés). Los que añadieron las secciones al escribirse van en las filas del final, con la sección que los fija.

| Contexto | Texto |
| --- | --- |
| Pestañas de una etapa vista o revelada | `Report` (por defecto), `Result`, `Classifications`, `Race Radio`, `Profile`, `Watch` |
| Pestañas de una etapa no conocida, o arrastrada | `Watch` (por defecto), `Profile` (sin marcas); en el velo, las demás enseñan la puerta; fuera del velo, o con la letra `A`, a un toque (6-r) |
| Etapa aún no corrida | `Preview`, `Profile` |
| Portada | `Continue watching`, `Ready to watch`, `While you were away` |
| Grupos (vocabulario único, D-18 y DD-04) | `Lead group`, `Chase group`, `Bunch`, `Gruppetto`, `Bunch together`, `Race leader’s group`, `Points leader’s group`, `Mountains leader’s group`; tres o menos, por sus nombres |
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
| Modos | `Watch`, `Highlights`, `Watch the race in 40 minutes` (el número se calcula: 8-b, DD-22), `Key stages`, `Continue from stage 4`, `Show results` |
| Revelar | `Show the result of Stage 7? You won't be able to watch it without knowing.`, `Don't ask again`, `Watch anyway` |
| Puertas | `You haven't watched stage 6 yet` · `Watch stage 6` · `Highlights of stage 6` · `Show result of stage 6 and continue`; `This page shows the result of Stage 7. Watch it instead?` |
| Órdenes | `Stage 6 is waiting for you` · `Watch (about 9 min)` · `Show result` · `Give orders anyway` |
| Seguir | `Follow without spoilers`, `Stop protecting this race` |
| Agregados y listas | `World ranking · as you know it · 3 stages hidden · Manage`, `Results from 3 stages you haven't watched are hidden · Manage`, `Stage 7 of Race France is ready to watch`, `Race France · 4 stages ready to watch`, `Finished · ready to watch`, `After stage 9 of 21 · stages 10-12 ready to watch` |
| Caducidad y cookie | `Results of Race Italy are now shown (finished 16 days ago) · Watch the digest anyway`, `Sign in to see results as you know them` |
| Sin línea | `Recorded before full race data`, `Positions of the groups behind are estimated` (debajo del aviso, con el km de esos grupos escrito con `~`; §3.8, §6.2), `Broadcast unavailable for this stage` |
| Diagnóstico | `Diagnostic view · not counted as watched` |
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

**F.4 Los identificadores del proceso** (al día tras la fase 5):

| Se escribe | Qué nombra | Dónde vive |
| --- | --- | --- |
| `I-01` a `I-49` | los injertos | `juicios/veredicto.json`; §21.1 |
| `O-01` a `O-32` | las objeciones | ídem; §21.2 |
| `H-01` a `H-23` | los huecos | ídem; §21.3 |
| `X-01` a `X-24` | las contradicciones de hecho entre propuestas | ídem; §21.5 |
| `D-01` a `D-62` | las decisiones cerradas por la síntesis | el fichero de decisiones de `docs/diseno/e2-retransmision/`; cada sección las escribe como hechos |
| `DD-01` a `DD-29` | las decisiones del dueño, con su valor por defecto; DD-15 y DD-19, retiradas con su número | §20 |
| `0-a` a `21-g` | las decisiones que tomaron las secciones en su bloque de cierre: 234 al escribirse (218 de §3 a §19 y 16 de §0, §20 y §21), más las que añadió la fase adversaria | el bloque de cierre de cada sección |
| `§0` a `§21`; `L1` a `L10` | las secciones del documento; los lotes que las escribieron | §0.5; el esqueleto de la síntesis, en `docs/diseno/e2-retransmision/` |
| `[DUEÑO 1]` a `[DUEÑO 10]`, `[DOC 1]` a `[DOC 7]`, contradicción 1 a 15 | los requisitos y las contradicciones del mapa 05 §5 y §6 | §21.4 |
| A1 a G3 | las citas y reglas del dueño del mapa 05 §2 (la B3 de los racimos, la C7 del vocabulario, la D7 de «cambia el race radio») | `mapas/05-dueno-docs.md` §2 |
| `C1` a `C18` | las comprobaciones del juez del motor | `juicios/motor.md` §2 |
| `Rcodigo-nnn`, `Rcobertura-nnn`, `Rdueno-nnn`, `Rcoste-nnn` | los hallazgos de los cuatro refutadores de la fase adversaria (contra el código, por cobertura, contra el dueño y por coste) | `docs/diseno/e2-retransmision/refutaciones/` |
| `sup. E1` a `sup. T6`; `sup. X1` a `sup. X11` | las 48 superficies del mapa 03 §4; las once puertas de fuera | §11.1; §11.2 |
| I1, I2, I3, I5; B1a a B22; PL | los invariantes, los bancos y la prueba de lectura | §4.4, §16.2; §16.9; §16.5 |
| paso 0 a paso 12; PR 0 a 12 | los pasos y los veintitrés PR del plan (el paso 11 son dos, 11a y 11b, 17-v) | §17.2 |

---

**Injertos aplicados.** Ninguno propio (§B del esqueleto no asigna ninguno a esta sección): §21.1 traza los 49, comprobados uno a uno en el cuerpo de sus secciones, y no falta ninguno.

**Objeciones resueltas.** Ninguna propia: §21.2 traza las 32 con su respuesta y su sección.

**Huecos rellenados.** Ninguno propio: §21.3 traza los 23. Contradicciones de hecho: §21.5 traza las 24 con su veredicto y su decisión. Del dueño: todos los [DUEÑO n] y [DOC n], como tabla, en §21.4 (D.2 y D.3).

**Decisión tomada aquí.**
- 21-a. Los apéndices siguen el orden que pide el encargo de este lote (A, los injertos; B, las objeciones; C, los huecos; D, la cobertura; E, las contradicciones de hecho) y el vocabulario, que §B del esqueleto ponía como apéndice D, pasa a F. Lo que el esqueleto juntaba se reparte así: las objeciones y los descartes de `00-decisiones.md` en B; los huecos y las catorce decisiones sin evidencia de los jueces en C; la cobertura en D; las contradicciones de hecho, que el esqueleto ponía en B, en E. Descartado: el orden del esqueleto, que mezclaba en un apéndice las objeciones y las contradicciones, que son cosas distintas (unas son defectos de diseño y otras afirmaciones sobre el código).
- 21-b. La columna «Dónde cayó» del apéndice A no copia los bloques de cierre: cada injerto se ha buscado por sus nombres en el cuerpo de las secciones que cita (el script `l10/check_grafts.py` del scratchpad, que excluye los bloques de cierre). Los 49 aparecen; la columna da las subsecciones exactas de los bloques de cierre, comprobadas.
- 21-c. La tabla de funciones del apéndice F da la firma final de cada sección, no la que fijó la síntesis, porque varias cambiaron al escribirse (4-b, 4-r, 5-e, 5-i, 5-p, 7-k, 10-d, 11-d, 14-c, 14-p); cada fila dice qué decisión la cambió.
- 21-d. El texto de pantalla que fijó la síntesis, `Watch the race in 30 minutes`, se escribe con el número calculado (`Watch the race in 40 minutes`), por 8-b y DD-22.
- 21-e. La tabla de las superficies del apéndice D (D.5) es la de §11.1 y §11.2 comprimida (qué es, mecanismo, PR y banco); la fila entera, con la ruta, la línea y lo que ve quien no conoce la etapa, se queda en §11 para no tener dos fuentes.
- 21-f. El glosario de la síntesis no viaja con el documento, y una remisión a una de sus partes (`§G.4`, `§G.11`…) no llevaría a ninguna parte (Rcobertura-010): se escribe con el sitio del documento donde vive esa parte, según la tabla del principio de §21.6, y donde la frase contrasta una firma o un nombre con el que fijó la síntesis, se escribe entero y se dice que es el de la síntesis. La tabla va en el apéndice F porque F es lo que queda del glosario en el documento. Descartado: ensamblar el glosario como apéndice, que duplicaría §4, §13, §14.2 y §15 y tendría dos fuentes para cada tipo; y dejar las remisiones con su parte, que ningún lector del documento podría seguir.
- 21-g. «Etapa conocida» es la de 10-e, la que usan `WatchState.known`, §6.10 y `stageAccessOf`: vista, revelada o arrastrada; la caducada está fuera del velo y no es conocida (Rcobertura-060). F.1 lo dice, y dice que `known_through` cuenta también las `X`, que es lo que hace el prefijo de §10.3.

**Propuesto para el glosario.** En G.1, cinco palabras de la prosa que usan las secciones y el glosario no tenía: «la lápida» (5-k), «la línea cortada» (`TimelineCore`, 4-b), «el reparto servido» (`serveCast`, §7.8), «la forma D» (18-a) y «el sello» (`AuthorStamp`, 11-n), y «etapa conocida» sin la caducada (10-e, 21-g) (`21-apendices.md` §21.6). En G.12, `DD-01` a `DD-29` sin DD-15 ni DD-19, las decisiones de las secciones (`0-a` a `21-g`), las reglas del dueño del mapa 05 §2 (A1 a G3), `sup. X11` y los identificadores de los hallazgos de la fase adversaria (`Rcodigo`, `Rcobertura`, `Rdueno`, `Rcoste`). Y al principio del glosario, la tabla de §21.6 que dice dónde queda cada una de sus partes en el documento (21-f).

**Dudas para el ensamblador.**
- La duda de cierre de §12 pide que «el apéndice de cobertura (§21.3)» apunte a §12.2, §12.7, §12.10 y §12.5 para [DUEÑO 4], [DUEÑO 6], [DUEÑO 10] y [DOC 3]: con el orden de este lote la cobertura es §21.4, y las cuatro filas ya apuntan ahí (D.2, D.3).
- `veredicto.json` tiene los 49 injertos, las 32 objeciones y los 23 huecos marcados `aplicado` desde el ensamblado v0 (`03-fase-sintesis.md` §3c); este apéndice los traza con lo que cambió la fase 5.
- Las remisiones `§G.n` que quedan en el cuerpo de las demás secciones las cambia la coherencia con la tabla de §21.6 (21-f; cruzadas de L2 y de L10).
- Las firmas de F.2 siguen a las secciones tras la fase 5: `readStageTimeline` sin `StageTimelineRead` es la de §14.4 (14-p) y la cruzada de L6 a §5.6; si la coherencia la deja de otro modo, F.2 la sigue.
