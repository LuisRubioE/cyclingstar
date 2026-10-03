## 4. El modelo de tipos: la línea temporal, el instante y la red

Esta sección escribe enteros los tipos que el resto del documento usa por su nombre y los auxiliares que piden las firmas de las funciones (la lista final de firmas es la de §21.6, F.2); ninguna otra sección los redefine ni les añade un campo: si a otra le falta uno, lo pide y se escribe aquí, como los que pedían §8, §9 y §12 (decisión 4-u). Van en el orden en que el dato nace y se consume: las unidades (4.1), lo que se graba al correr la etapa (4.2), cómo se guarda (4.3), cómo se reduce y qué lo sella (4.4), el instante que pinta la tele (4.5), a qué hora se puede enseñar cada dato (4.6) y cada suceso (4.7), el rótulo (4.8), la pantalla (4.9), el horizonte (4.10), la red (4.11), las noticias (4.12) y en qué fichero vive cada tipo (4.13). Los auxiliares que esas firmas nombran (`InstantContext`, `TimelineVisibility`, `RecorderView`, `I1Mismatch`, `TimelineEventWire`, `RadioNames`) van junto a su función. Cada campo lleva en su comentario su procedencia con una de tres palabras: **existe** (el motor o la base ya lo tienen hoy, con su línea), **se graba** (se guarda al correr la etapa porque hoy se calcula y se tira, o no existe) y **se deriva** (se calcula al leer, en la API o en la web, de lo grabado y de la base). Las líneas son las de HEAD `9c21885`, comprobadas en `af953b9`, que solo añade ficheros de `docs/diseno/`. Los valores de constantes que salen en comentarios son los de §15, que es su única fuente.

Una regla de importación vale para todos los bloques: `packages/shared` no importa nada de `packages/engine` ni de `packages/db` (el motor ya importa `@cyclingstar/shared`, `packages/engine/package.json` l. 19; `coachView.ts` l. 1 lo hace; y la web no depende de `packages/db`, `apps/web/package.json` l. 13-23), así que todo tipo que la web o el reductor necesiten vive en `packages/shared`. Los vocabularios del motor que hacen falta en `shared` ya tienen allí su copia validada y atada por tipos: `PullMotive` (`contracts.ts` l. 1376-1413, atado al del motor por `apps/api/src/raceRadio.test.ts` l. 148-152), `RadioGroupKind` (`contracts.ts` l. 1346-1347), `StageKind` (l. 1127-1128), `JerseyKind` y `JERSEY_PRIORITY` (`jerseys.ts` l. 19 y 22). Los ciclos entre ficheros de `shared` (`timeline.ts` con `jerseys.ts`, `cues.ts` con `instant.ts`, `news.ts` con `render/variants.ts`) son solo de tipos: se escriben `import type`, que se borra al compilar.

### 4.1 Unidades

```ts
// packages/shared/src/broadcast/timeline.ts
export type Block = number   // bloque de 100 m del motor, entero desde 0: km = (b + 0,5) · dx (simulate.ts l. 1929)
export type Ds = number      // décimas de segundo de carrera, entero; desde la salida común; en crono, desde la primera salida
export type RaceS = number   // segundos de carrera en coma flotante: solo en memoria, nunca guardados ni servidos
export type RiderIx = number // posición en stage_snapshots.input.riders, que es orden de dorsal (stageRun.ts l. 257)
export type GroupIx = number // posición en StageTimeline.groups: orden de aparición (su marca de nacimiento), 0 = el pelotón de salida

/** Los únicos cuatro sitios donde un número del formato pierde precisión. Nadie redondea por su cuenta. */
export const toDs = (s: RaceS): Ds => Math.round(s * 10)
export const fromDs = (d: Ds): RaceS => d / 10
export const toKm10 = (km: number): number => Math.round(km * 10)
export const fromKm10 = (k10: number): number => k10 / 10
```

`Block` es el eje del motor: avanza bloque a bloque y en un bloque todos los grupos están en el mismo punto, cada uno con su reloj (`group.ts` l. 26-27, que nace en 0 en l. 56). La foto de un bloque se toma al final de ese bloque (`simulate.ts` l. 8996-9023), y el km que el motor le pone es el centro, `(b + 0,5) · dx` (l. 1929): toda la sección usa esa convención, también para posiciones fraccionarias. `Ds` y los km en décimas son la restricción de D-10: enteros que gzip comprime y que Zod valida barato (medido con este formato en §18.1, `l7/red.mjs`: parse y Zod de todos los tramos de una etapa, de 1,1 a 7,6 ms en Node). Una décima de segundo sobra para situar un grupo dentro de un bloque (a 60 km/h un bloque son 6 s) y es la resolución que las dos propuestas que guardaban reloj eligieron (`estado.md` §12, `relojResolucionS` 0,1; `ingeniero.md` §12, `RADIO_CLOCK_DECIMALS` 1). La ida y vuelta es exacta: medido en el scratchpad (`l2/dsidavuelta.mjs`), `toDs(fromDs(d)) = d` para los 400.001 relojes de 0 a 40.000 s, y (`l2/kmdecimas.mjs`) `toKm10(fromKm10(k)) = k` en los 3.000 centros de bloque de una etapa de 300 km. Lo que las décimas de km sí pierden es medio bloque: los centros acaban en ,x5 y `toKm10` los sube (12,45 pasa a 12,5), así que `Math.round` da otro km entero en 300 de esos 3.000 centros; la semilla de variante de la voz, que usa `Math.round(km * 10)` (D-46), no cambia en ninguno. Por eso la voz y el acta leen el km de `stage_snapshots.events` a través de `TimelineEvent.source`, y el km en décimas de la línea es solo de pantalla (decisión 4-h).

`RiderIx` es el orden en que `stageRun.ts` monta la entrada, dorsal y luego id (`stageRun.ts` l. 257), que es el que se congela en `stage_snapshots.input.riders`; `simulateStage` reordena su copia por id (`simulate.ts` l. 1257-1262) pero no la guardada. Así la lista de un grupo ordenada por `RiderIx` va por dorsal, que es como D-26 quiere la lista de la fuga. `GroupIx` numera por la hora de la marca de nacimiento (decisión 4-a): un corte por reloj deja siempre un prefijo del catálogo, y el grupo de salida, `peloton` (`simulate.ts` l. 185, creado con todos los corredores en l. 1698-1702), es siempre el 0.

Cinco nombres de este documento ya existen con otro significado en otro paquete. El nombre canónico no cambia; en un fichero que necesite los dos, uno se importa con alias local (`import type { Block as SampledBlock } from '@cyclingstar/engine'`). `Block` es aquí un índice y en el motor el bloque muestreado con pendiente y terreno (`stage/types.ts` l. 77-89, exportado en `engine/src/index.ts` l. 267): solo `packages/engine/src/sim/timeline.ts` podría necesitar los dos. `MishapKind` es aquí `'caida' | 'pinchazo' | 'averia'` y en `stage/mishap.ts` l. 16 `'pinchazo' | 'averia'`, que el índice del motor no exporta y el grabador no importa. `StageWeather` es aquí el tiempo congelado y en el motor el tiempo del día (`stage/weather.ts` l. 34-41, `engine/src/index.ts` l. 38): lo necesita quien congele el tiempo (§5.4). `NewsKind` son aquí los trece códigos de 4.12 y en el motor los once de hoy (`world/news.ts` l. 8-19, `engine/src/index.ts` l. 170), que `packages/db/src/news.ts` importa hasta el paso 4a; y `AbandonReason` repite la unión de `packages/db/src/stageRun.ts` l. 1017, que pasa a importar la de `shared` (decisión 4-p).

### 4.2 La línea temporal

La línea temporal es lo que se graba de una etapa al correrla (D-02): un catálogo de grupos, la pertenencia completa cada `TIMELINE.keyPhotoKm` (10) km, los sucesos de estado de cada bloque, las marcas de reloj, los sucesos narrables con el bloque en que se emitieron y la hora a la que se enseñan, la capa de detalle de la radio en los km de foto, las pancartas, el reparto congelado, el recorrido, el tiempo, la traza de la crono y la meta. Es el modelo de `estado.md` §3.2 con los nombres de este documento, la visibilidad y el reparto con procedencia de `datos.md` §3.3-3.4 y §6.1, y las pancartas y el tiempo de `television.md` §3.3.

```ts
// packages/shared/src/broadcast/timeline.ts (sigue)
import type { PullMotive } from '../contracts.js'           // l. 1376-1413, atado al del motor por raceRadio.test.ts l. 148-152
import type { Distinction, WornJersey } from '../jerseys.js' // §4.8; import type: el ciclo con jerseys.ts se borra al compilar

/** Cómo nació un grupo: el prefijo de su id en el motor (`peloton`, simulate.ts l. 185; `mov-N`, l. 7218; `shed-N`, l. 5836). */
export type GroupOrigin = 'start' | 'attack' | 'shed'

/** Un grupo de la etapa, de su primer a su último bloque con gente. Se graba: hoy el id se tira (raceRadio.ts l. 776-963). */
export interface GroupCatalogEntry {
  readonly id: string                // existe: SnapshotRider.groupId (types.ts l. 452), tal cual: 'peloton', 'mov-3', 'shed-7'
  readonly origin: GroupOrigin       // se graba: del prefijo del id; un prefijo que no sea de los tres hace fallar el grabado (§4.3)
  readonly bornB: Block              // se graba: primer bloque con gente; lleva marca de reloj (nacimiento y muerte son uno de los cuatro sitios de §3.4)
  readonly diedB: Block | null       // se graba: último bloque con gente, con marca; null si llega a meta
  readonly successor: GroupIx | null // se graba: el grupo al que fue la mayoría de los suyos en diedB (D-03; raceRadio.ts l. 614-632 y 694-712); null si llega a meta o abandonan todos
}

/** El percance de un corredor: `Incident['tipo']` del motor (types.ts l. 361), un código cerrado que se guarda como cadena. */
export type MishapKind = 'caida' | 'pinchazo' | 'averia'

/** LO ÚNICO QUE CAMBIA LA FOTO de un bloque al siguiente. Unión cerrada: `reducePhoto` tiene un `case` por variante.
 *  Orden dentro de un mismo bloque, fijo: out, move, main, clock, mishap. Todas se graban (hoy nada de esto se guarda). */
export type StateEvent =
  | { readonly t: 'move'; readonly b: Block; readonly to: GroupIx; readonly riders: readonly RiderIx[] } // cambian de grupo al final de b, por RiderIx creciente
  | { readonly t: 'out'; readonly b: Block; readonly rider: RiderIx }                                   // deja de estar en la foto: abandono (simulate.ts l. 9002)
  | { readonly t: 'main'; readonly b: Block; readonly group: GroupIx | null }                           // el título de pelotón pasa a group (regla por bloque, D-03)
  | { readonly t: 'clock'; readonly b: Block; readonly marks: readonly (readonly [GroupIx, Ds])[] }     // marcas de reloj exactas en b (los cuatro sitios de §3.4)
  | { readonly t: 'mishap'; readonly b: Block; readonly rider: RiderIx; readonly kind: MishapKind; readonly lostDs: Ds } // de output.incidents (D-13)

/** La pertenencia completa cada TIMELINE.keyPhotoKm km y al empezar el último km. Suma de control y acceso aleatorio del
 *  servidor (I3); NUNCA unidad de entrega (D-06): los tramos no la llevan. Se graba. */
export interface KeyPhoto {
  readonly b: Block                // el bloque de la foto de km (simulate.ts l. 1946-1948), estado al final del bloque
  readonly groupOf: Int16Array     // por RiderIx: su GroupIx, o −1 si ya no corre
  readonly main: GroupIx | null    // el título en b (lo repite la serie `main`: en el formato guardado no va aquí, §4.3)
}

/** Quién tira y por qué: lo de hoy de la radio (raceRadio.ts l. 497-572), sin `watching`, que es la lista que destripa (D-16). */
export interface Puller { readonly rider: RiderIx; readonly motive: PullMotive | null; readonly forRider: RiderIx | null } // existen: `pulling`, `motivos` y `paraQuien` (l. 543, 559, 565), re-indexados a RiderIx; forRider null si no tira por nadie

/** LA CAPA DE DETALLE de un grupo en un km de foto: el microscopio del dueño ([DUEÑO 10]). Existe: la calcula `radioForStorage`
 *  (raceRadio.ts l. 776-963) con las mismas funciones; se graba re-indexada, solo en los bloques de `radioKmPoints` (D-08). */
export interface GroupDetail {
  readonly g: GroupIx
  readonly speedKmh: number | null   // existe: mediana de sus hombres, techo 75 (groupSpeedKmh, l. 679-764); null si no se puede medir. Guardada a 0,1 km/h
  readonly pullingTotal: number      // existe: los que están en el turno de verdad (l. 553), aunque la lista se corte en 12
  readonly pullers: readonly Puller[] // existe: tope 12 (STORED_PULLERS_MAX, l. 591), turno de 3 km contado en fotos (TURNO_KM, l. 597)
  readonly mishap: { readonly kind: MishapKind; readonly lostS: number } | null // existe: `mishap` (l. 521), el más caro de los suyos en el km (mishapOf, l. 267-275)
}

/** LA FOTO: el estado espacial canónico al final del bloque b, lo que el dueño llama foto en la radio (D-01, §3.2).
 *  Se deriva: `photoAt` (§4.4) desde la foto clave anterior; nunca se guarda entera. */
export interface Photo {
  readonly b: Block
  readonly groupOf: Int16Array                    // por RiderIx: su GroupIx, o −1 si ya no corre. Nadie la muta: el reductor copia
  readonly main: GroupIx | null                   // el pelotón (título por bloque, D-03)
  readonly clock: ReadonlyMap<GroupIx, Ds>        // reloj de cada grupo vivo al cruzar b: exacto en una marca, interpolado entre dos
  readonly detail: readonly GroupDetail[] | null  // la capa de detalle, solo en los bloques de radioKmPoints
}

/** UN SUCESO NARRABLE fechado cuando se SUPO. El `RaceEvent` del motor (types.ts l. 330-337) viaja tal cual en
 *  stage_snapshots.events; esto añade el bloque de emisión y la hora de enseñarlo, y lo copia para no depender de él al cortar. */
export interface TimelineEvent {
  readonly source: number        // se graba: índice en stage_snapshots.events, la salida de announceRebels (simulate.ts l. 9081); −1 si es sintetizado (caída, D-13)
  readonly plantilla: string     // existe: la del motor, como cadena (D-10); nunca un índice
  readonly km: number            // existe: guardado en décimas; solo de pantalla (la voz lee el km original por `source`, 4-h)
  readonly tS: RaceS             // existe: la fecha del HECHO, el reloj que puso el motor (mapa 01 §1.2); guardado en Ds
  readonly bEmit: Block          // se graba: bloque en que el motor lo emitió (sonda onEvent, §5.2); `blocks` si fue tras el bucle
  readonly revealS: RaceS        // se graba: cuándo se enseña (revealSOf, §4.7); guardado en Ds
  readonly riders: readonly RiderIx[]  // existe: `protagonistas` como RiderIx, en su orden
  readonly datos: Readonly<Record<string, number | string>> | null // existe: tal cual; las claves `…Id` siguen siendo riderId
}

/** Lo que da `onBanner` en cada pancarta disputada (I-18): el orden y los puntos que hoy se reparten y no se emiten. Se graba. */
export interface BannerResult {
  readonly kind: 'meta_volante' | 'cima'  // existe: BannerType (types.ts l. 25)
  readonly km: number                     // existe: km del bloque de la pancarta
  readonly cat: string | null             // existe: ClimbCategory de la cima ('HC', 'cat1'…, types.ts l. 91); null en una volante
  readonly name: string | null            // existe: STAGE_FEATURES (routes/stageFeatures.ts) en etapas con rasgos reales; si no, null
  readonly revealS: RaceS                 // se graba: reloj del grupo del primero que puntúa (disputeClimb l. 9287, no groups[0].tS de l. 9310)
  readonly order: readonly { readonly rider: RiderIx; readonly points: number }[] // se graba: los que puntúan, por sprintPoints o climbPoints (constants.ts l. 5032-5036)
}

/** De qué etapa sale un dato del reparto (la procedencia, D-15): si esa etapa está velada, el dato no viaja (B13). */
export interface StageRef { readonly raceKey: string; readonly stageDay: number } // raceKey `${raceId}:s${season}` (raceKey.ts l. 1-19); stageDay desde 1 (stageRun.ts l. 92-93)

/** Lo que la cabecera sirve del recorrido: nunca un suceso ni una marca de dónde pasa algo (D-17). Se graba congelado. */
export interface ProfileStrip {
  readonly altM: readonly number[]   // existe: cota al final de cada km entero, de 0 a ceil(lengthKm), en metros enteros (altitudesDelPerfil, citas.ts l. 256-264, desde startM, types.ts l. 59)
  // footKm: inicio de la racha `subida` que acaba en la cima (tramosDelPerfil, citas.ts l. 35-65); topKm: km de la pancarta `cima`; cat: su ClimbCategory;
  // lenKm y avgPct se derivan al grabar (topKm − footKm; desnivel / (lenKm · 10), a 0,1); name: STAGE_FEATURES, o null sin rasgos reales. Todo existe hoy
  readonly climbs: readonly { readonly footKm: number; readonly topKm: number; readonly cat: string; readonly lenKm: number; readonly avgPct: number; readonly name: string | null }[]
  readonly sprintsKm: readonly number[] // existe: km de cada pancarta `meta_volante` del perfil
  readonly laps: number                 // existe: StageProfile.laps ?? 1 (types.ts l. 73)
}

/** El tiempo de la etapa, congelado sin tocar el motor (D-14, I-19): las mismas funciones puras que usa la carrera. Se graba. */
export interface StageWeather {
  readonly tempC: number   // existe: stageWeather(seed, input.lugar).grados (weather.ts l. 58-72), a 0,1 °C
  readonly rain: number    // existe: su `lluvia`, en [0, 1]
  // un tramo por STAGE.weather.roadTurnKm (5 km, constants.ts l. 5843), fundidos los iguales seguidos. rain, windDir (vueltas [0, 1)) y windKmh existen:
  // el segmento del parte (weatherPlan, weather.ts l. 251-287; segmentos de 30 km, constants.ts l. 5854; fuerza × windFullKmh 60, l. 5862).
  // crosswind se deriva al grabar: lateral contra el rumbo (windComponents, weather.ts l. 232-239; roadBearings, l. 188-216) ≥ echelonCloseThreshold 0,35 (l. 5829)
  readonly spans: readonly { readonly fromKm: number; readonly rain: number; readonly windDir: number; readonly windKmh: number; readonly crosswind: boolean }[]
}

/** El equipo con el que se corrió la etapa y su equipación de ESE día: un traspaso posterior no reescribe el pasado (D-15). */
export interface CastTeam { readonly teamId: string; readonly jerseySeed: string } // existen: input.riders[].teamId (types.ts l. 264) y teams.jersey_seed (schema.ts l. 234), leída al correr

/** Un corredor del reparto congelado: lo arma packages/db al correr (buildTimelineCast, D-15) y el grabador lo guarda. */
export interface CastRider {
  readonly rider: RiderIx                // igual a su posición en cast.riders; explícito para que un test lo compruebe
  readonly riderId: string               // existe: input.riders[].riderId
  readonly bib: number | null            // existe: input.riders[].bib (types.ts l. 215), de race_rosters.bib
  readonly team: number | null           // existe: índice en TimelineCast.teams, el equipo CON EL QUE CORRIÓ; null = individual
  readonly country: string               // existe: riders.country (schema.ts l. 280), ISO-2 en mayúsculas
  readonly gender: 'M' | 'F'             // existe: riders.gender (schema.ts l. 285); para la concordancia de E10
  readonly start: { readonly gcRank: number | null; readonly gcDeficitS: number | null; readonly from: StageRef | null } // existen: input.riders[].gcRank y gcDeficitSeconds (types.ts l. 205 y 189); from se graba: la N−1; los tres null sin general
  readonly worn: WornJersey              // se graba: wornJerseys (§4.8, regla en §7.2) sobre las clasificaciones tras la N−1 (stageRun.ts l. 551-557) y los títulos
  readonly distinctions: readonly Distinction[] // se graba: distinctions (§7.2), cada una con su `from`
  readonly knownWins: number             // se graba: victorias de palmares (kind gc o stage) de carreras cuya fila gc tiene game_day ≤ día de la etapa − SPOILER.expiryGameDays (D-26, 7-e)
}
/** El reparto congelado (D-15): riders por RiderIx; teams por primera aparición en riders. */
export interface TimelineCast {
  readonly riders: readonly CastRider[]
  readonly teams: readonly CastTeam[]
  // se graba (8-g, 4-u): los BROADCAST.previewAttrTop (3) mejores inscritos por el atributo del tipo de etapa (8-f): llana SPR 'sprint',
  // media COL 'hills', reina MON 'climb', crono CRI 'tt'; clásica, PAV 'cobbles' si tiene algún segmento `paves` (types.ts l. 13) y, sin
  // pavés, MON 'climb' con un puerto HC o de 1.ª y COL 'hills' sin él. Por valor decreciente y, a igual valor, por RiderIx. Los valores
  // son los públicos (publicRiderDetailSchema.attributes, contracts.ts l. 713-737) tal como los lee runOneStage al empezar la etapa
  // (attrsByRider, stageRun.ts l. 298-310), antes de que raceLearning (l. 790-805) los cambie y se escriban (l. 891-897): leídos al
  // servir, llevarían ya el aprendizaje de esta etapa y de las siguientes. Los de la general no van aquí: salen de StartState.gcTop
  readonly favourites: readonly { readonly rider: RiderIx; readonly why: 'sprint' | 'hills' | 'climb' | 'tt' | 'cobbles' }[]
}

/** La contrarreloj (I-08, D-23): lo que `simulateTimeTrial` calcula y tira; lo entrega la sonda onTimeTrialRide (§5.2). Se graba. */
export interface TimeTrialTrace {
  readonly order: 'gc' | 'bib'           // existe: timeTrialStartOrder(input.riders).mode, 'general' o 'dorsales' (startOrder.ts l. 69, 127)
  readonly intervalS: number             // existe: su intervalS, 120 con general o 60 por dorsales (constants.ts l. 6168-6172)
  readonly checksKm: readonly number[]   // existe: los controles de ttSplitChecks (2) a ⅓ y ⅔, sin los que caen a menos de ttSplitMinKm de salida o meta (timetrial.ts l. 521-527; constants.ts l. 6177-6179)
  readonly startDs: readonly Ds[]        // existe: por RiderIx, su startS del plan (startOrder.ts l. 72-79), en Ds
  readonly kmClockDs: readonly (readonly Ds[])[] // se graba: por RiderIx, reloj propio al acabar cada km entero (raw · noise, timetrial.ts l. 266-284 y 345-348); la última entrada es la meta, lleva la pérdida del percance, como results (4-f), y vale 10 · Math.round(tS), el tiempoS de results por diez (9-a)
  readonly checkClockDs: readonly (readonly Ds[])[] // se graba (9-b, 4-u): por RiderIx y control de checksKm, 10 · Math.round(raw[idx] · noise), el entero que compara bestChain y que tt_split escribe como splitS (timetrial.ts l. 143, 528 y 542), sin la pérdida del percance, como el motor; [] en un prólogo sin controles
  // existen: el percance de cada corredor; km, el que pone el motor, hoy siempre finishKm / 2 (timetrial.ts l. 306-329); lostDs, perdidaS · noise
  readonly mishaps: readonly { readonly rider: RiderIx; readonly km: number; readonly kind: MishapKind; readonly lostDs: Ds }[]
}

/** SOLO para el paquete de meta (D-06): nunca va en un tramo. Se graba. */
export interface FinishRecord {
  readonly finishS: RaceS  // en línea, la última marca de reloj de la cabeza (su paso por el último bloque); en crono, la última LLEGADA, máx de startDs[r] + kmClockDs[r].at(−1): la hora en que el motor da la crono por cerrada (lastHome.finishS, timetrial.ts l. 495, 596 y 614), a medio segundo como mucho porque la traza lleva cada llegada al segundo (9-a) (4-w)
  readonly arrivals: readonly (readonly [Ds, readonly RiderIx[]])[] // existe: results agrupados por tiempoS, en Ds de reloj de carrera, de menor a mayor (UCI 2.3.040)
}

/** LA LÍNEA TEMPORAL decodificada, en memoria (D-02). La guarda StoredTimelineV1 (§4.3) y la lee todo lo demás. */
export interface StageTimeline {
  readonly format: 1                    // TIMELINE.format: un decodificador por versión (§4.3)
  readonly engineVersion: number        // existe: ENGINE_VERSION con que corrió (constants.ts l. 838)
  readonly dx: number                   // existe: STAGE.dx con que se grabó (constants.ts l. 2290), 0,1
  readonly blocks: number               // existe: Math.round(lengthKm / dx) (sample.ts l. 70)
  readonly lengthKm: number             // existe: stageLengthKm(profile) (sample.ts l. 60-62)
  readonly timeTrial: boolean           // existe: input.timeTrial
  readonly clock: 'exact' | 'estimated' // 'exact' en toda línea grabada; 'estimated' solo en el adaptador de la radio (D-07)
  readonly riderIds: readonly string[]  // existe: por RiderIx
  readonly groups: readonly GroupCatalogEntry[] // se graba: por GroupIx (4-a)
  readonly keys: readonly KeyPhoto[]    // se graba: por b creciente; vacío en crono, en el adaptador y en la web
  readonly stateEvents: readonly StateEvent[] // se graba: por b y, dentro del bloque, en el orden de StateEvent
  readonly events: readonly TimelineEvent[]   // se graba: por revealS y, a igual hora, por source
  readonly detail: ReadonlyMap<Block, readonly GroupDetail[]> // se graba: solo bloques de radioKmPoints, filas por GroupIx
  readonly banners: readonly BannerResult[]  // se graba: por km
  readonly profile: ProfileStrip
  readonly cast: TimelineCast
  readonly weather: StageWeather
  readonly tt: TimeTrialTrace | null         // solo en crono
  readonly finish: FinishRecord
}

/** Lo que reciben las funciones que cortan y reducen (4.4-4.6) y lo que la web arma con la cabecera y los tramos: la línea sin el
 *  reparto congelado (se sirve degradado por el velo en la cabecera, B13), sin el tiempo (va en la cabecera) y sin la meta (D-06). */
export type TimelineCore = Omit<StageTimeline, 'cast' | 'weather' | 'finish'>
```

De dónde sale cada campo, en una tabla (como `estado.md` §3.4 y `datos.md` §3.6). En la tabla, **grabador** es `timelineRecorder` (`packages/engine/src/sim/timeline.ts`, §5.4), que ve la foto de CADA bloque por el colector aparte (D-08); **db** es `packages/db` al correr la etapa (`stageRun.ts`); **lectura** es la API o la web.

| Campo | Existe hoy en | Se graba (quién) | Se deriva al leer |
| --- | --- | --- | --- |
| `riderIds`, `blocks`, `lengthKm`, `timeTrial`, `dx`, `engineVersion` | `stage_snapshots.input` y `.engine_version` (`schema.ts` l. 737-759) | grabador, copia | |
| `groups[].id` | `SnapshotRider.groupId` en cada foto (`types.ts` l. 452); la radio lo tira (`raceRadio.ts` l. 776-963) | grabador | |
| `groups[].origin`, `bornB`, `diedB`, `successor` | no | grabador, al ver aparecer y vaciarse cada id | |
| `stateEvents` `move`, `out` | no: la foto de cada bloque dice el grupo de cada uno; producción la pide por km y la adelgaza | grabador, diferencia entre dos fotos seguidas | |
| `stateEvents` `main` | el `mainGroupId` del motor en cada foto (`types.ts` l. 503; `simulate.ts` l. 9023) | grabador, con la regla por bloque de `raceRadio.ts` l. 317-320 (D-03) | |
| `stateEvents` `clock` | el reloj de cada corredor en la foto (`types.ts` l. 454: reloj del grupo más deriva y marcaje, `simulate.ts` l. 9012); el del grupo es el mínimo de los suyos (`raceRadio.ts` l. 284-300) | grabador, en los cuatro sitios de §3.4 | interpolado entre dos marcas (`photoAt`) o extrapolado (`instantAt`) |
| `stateEvents` `mishap` | `output.incidents` (`types.ts` l. 358-365), que `stageRun.ts` usa y tira (l. 586-590, 1098-1137) | grabador, sin `severidad` ni `diasBaja` (D-13) | |
| `keys` | no | grabador, cada `TIMELINE.keyPhotoKm` y al empezar el último km | |
| `events[].plantilla`, `km`, `tS`, `riders`, `datos` | `stage_snapshots.events` (`stageRun.ts` l. 580) | grabador, copia re-indexada | |
| `events[].bEmit` | no: el motor emite sin decir en qué bloque (`events.ts` l. 16-29) | grabador, sonda `onEvent` (§5.2) | |
| `events[].revealS` | no | grabador, `revealSOf` (§4.7) | |
| `detail` | `radioForStorage` lo calcula por km (`raceRadio.ts` l. 776-963) | grabador, con los índices de la línea | |
| `banners` | solo el ganador, en `sprint_intermediate` y `climb_kom` (`simulate.ts` l. 9221 y 9310) | grabador, sonda `onBanner` (§5.2) | `cat` y `name` por la red se casan con `profile.climbs` (4-n) |
| `profile` | `stage_snapshots.input.profile` y `STAGE_FEATURES` | db, congelado (se lee del `input` sin re-simular) | |
| `weather` | `stageWeather`, `weatherPlan`, `roadBearings`, `stageWindStrength` sobre la semilla (`weather.ts` l. 58, 169, 188, 251) | db, congelado (D-14) | el cuadro del parte (§8.6) |
| `cast` | `input.riders[]` (dorsal, equipo, general de salida), `riders.country`, `riders.gender`, `teams.jersey_seed`, clasificaciones tras la N−1 (`stageRun.ts` l. 278-292, 551-557), `palmares`; para `favourites`, los atributos de `rider_attrs` que `runOneStage` lee al empezar (l. 298-310) y el aprendizaje reescribe al acabar (l. 891-897) | db, `buildTimelineCast` (D-15; `favourites`, 8-g) | degradado por el velo al servirlo (§10.10); `StagePreview.favourites` (§4.11) |
| `tt` | la traza `raw` y el plan de salida dentro de `simulateTimeTrial` (`timetrial.ts` l. 249-348), tirados; el tiempo en cada control, que `bestChain` compara (l. 528) y solo se narra si cambia el mejor | grabador, sonda `onTimeTrialRide` (§5.2, §9.2) | `BroadcastHead.tt` (§4.11) |
| `finish` | `output.results` (`types.ts` l. 340-348) | grabador | `BroadcastFinish.arrivals` |
| `Photo`, `Instant`, `GroupNow`, huecos, tendencias, papel, nombres, general virtual, `RiderCard`, `Cue` | no | no | todo (§4.4, §4.5, §4.8, §4.9) |

Cinco razones de forma. La primera, el espacio es canónico (D-01): el motor avanza por bloques y en un bloque la foto es exacta, así que lo grabado es la foto bloque a bloque y el instante se deriva; reducir cambios de corredor en orden de reloj discrepa de la foto en el 0,3-12,5 % de los grupo-km (`estado.md` §3.3), porque el que salta a otro grupo adopta su reloj (`simulate.ts` l. 7863). La segunda, se guardan diferencias: el grabador tiene en memoria dos fotos y no la etapa (D-02), y reducir una etapa entera desde el km 0 cuesta de 0,02 a 0,22 ms en Node (`estado.md` §3.7, medido), así que las fotos clave no están por coste sino como suma de control (I3) y acceso aleatorio del servidor (la radio de un km, B2, B16). La tercera, la capa de detalle vive solo en los km de foto porque el turno de 3 km cuenta FOTOS y no km (`raceRadio.ts` l. 597 y 883): con fotos de 100 m el turno pasaría a 300 m, contra lo que fijó el dueño (D-08). La cuarta, `TimelineEvent` copia el `RaceEvent` para que la API pueda cortar y servir sin leer `stage_snapshots.events`, y conserva `source` para volver a él: el acta, la voz y el km exacto salen de allí (4-h). La quinta, `FinishRecord` va aparte y solo en el paquete de meta (D-06, I-15), y `TimelineCore` lo quita por tipo: un corte no puede llevar la meta ni el reparto sin velo porque su tipo no tiene esos campos (4-b).

Tres restricciones que el grabador cumple y los tests de §16 comprueban: `groupOf` usa `Int16Array` (de −32.768 a 32.767) pero el formato guardado solo admite 255 grupos por etapa, porque la foto clave guarda un byte por corredor (4-i; medido como mucho 140 ids en `race-colombia` e5, `estado.md` §3.5); todo número de la línea sale ya redondeado con los cuatro redondeos de §4.1, de modo que `decodeTimeline(encodeTimeline(tl))` es igual a `tl` sin tolerancia (I3); y las listas van en el orden que dice cada comentario, porque I3 compara listas y no conjuntos.

### 4.3 El formato guardado

`stage_timelines.body` guarda el gzip 9 del JSON de `StoredTimelineV1` (D-10; el `bytea` y el gzip los pone `packages/db`, porque el motor no importa Node, `eslint.config.js` l. 80-137). Es la definición que `datos.md` citaba en l. 663 y 809 sin escribirla nunca (X-23). Cinco restricciones: listas planas de enteros y cadenas; relojes en Ds y km en décimas, con los redondeos de §4.1; la pertenencia de cada foto clave en base64, un byte por corredor; los códigos (`PullMotive`, `MishapKind`, `plantilla`) como CADENA y nunca como índice de un enum, porque el orden de `pullMotiveSchema` (`contracts.ts` l. 1376) no es un contrato y R23.1 lo hizo crecer de diez a quince palabras con una radio entera perdida en producción (mapa 03 §8; O-14); y `format` en cada fila, con un decodificador por versión: lo guardado no se reescribe nunca.

```ts
// packages/shared/src/broadcast/codec.ts
import { z } from 'zod'
import { jerseyKindSchema, pullMotiveSchema, type PullMotive } from '../contracts.js' // l. 420 y 1376; contracts.ts no carga nada de broadcast/ (14-a)
import type { ChampionTitle, Distinction, WornJersey } from '../jerseys.js'
import type { BannerResult, Block, CastRider, Ds, GroupIx, GroupOrigin, MishapKind, ProfileStrip, RiderIx, StageRef, StageTimeline, StageWeather, TimelineCast, TimeTrialTrace } from './timeline.js'

export interface StoredTimelineV1 {
  readonly format: 1                      // igual a stage_timelines.format de su fila
  readonly engineVersion: number
  readonly dx: number
  readonly blocks: number
  readonly lengthKm: number
  readonly timeTrial: boolean
  readonly riderIds: readonly string[]    // por RiderIx
  readonly groupIds: readonly string[]    // por GroupIx
  readonly groupMeta: readonly number[]   // cuartetos por GroupIx: [origin (0 start, 1 attack, 2 shed), bornB, diedB o −1, successor o −1]
  readonly keys: readonly (readonly [Block, string])[] // [b, base64 de un byte por RiderIx: GroupIx + 1, 0 = fuera]; el título de la foto sale de `main`
  readonly moves: readonly number[]       // tríos [Δb, rider, to + 1]; Δb respecto del trío anterior (el primero, de 0); to + 1 = 0 es `out`; por b, en el bloque primero los `out`, luego por `to` y rider; un `move` de n corredores son n tríos
  readonly main: readonly number[]        // pares [b, group + 1]; group + 1 = 0 es null
  readonly clocks: readonly number[]      // tríos [b, g, Ds], por b y por g
  readonly mishaps: readonly (readonly [Block, RiderIx, MishapKind, Ds])[] // [b, corredor, código, pérdida]
  readonly events: readonly (readonly [number, string, number, Ds, Block, Ds, readonly RiderIx[], Readonly<Record<string, number | string>> | null])[] // [source, plantilla, km en décimas, tS, bEmit, revealS, protagonistas, datos]
  readonly detail: readonly (readonly [Block, GroupIx, number, number, readonly (readonly [RiderIx, PullMotive | null, number])[], MishapKind | null, number])[] // [b, g, velocidad en décimas de km/h o −1, pullingTotal, [relevista, motivo, para quién o −1], percance, pérdida en Ds (0 sin percance)]
  readonly banners: readonly (readonly [0 | 1, number, string | null, string | null, Ds, readonly number[]])[] // [0 volante o 1 cima, km en décimas, cat, nombre, revealS, orden plano [corredor, puntos, …]]
  readonly profile: ProfileStrip          // objetos tal cual, ya redondeados: km y porcentajes a 0,1, cotas a 1 m
  readonly cast: TimelineCast
  readonly weather: StageWeather
  readonly tt: TimeTrialTrace | null      // ya en Ds
  readonly finish: { readonly finishDs: Ds; readonly arrivals: readonly (readonly [Ds, readonly RiderIx[]])[] }
}

/** La tabla de los dos únicos códigos numéricos del formato: cerrados, atados a su unión por `satisfies` (un valor nuevo no compila). */
export const ORIGIN_CODE = { start: 0, attack: 1, shed: 2 } as const satisfies Record<GroupOrigin, 0 | 1 | 2>
export const BANNER_CODE = { meta_volante: 0, cima: 1 } as const satisfies Record<BannerResult['kind'], 0 | 1>

export class TimelineFormatError extends Error {}

/** El atado de un esquema con su tipo en los DOS sentidos (4-j, 4-x). `satisfies z.ZodType<T>` solo falla si al esquema le falta un
 *  campo de T o se lo da de otro tipo: un campo de más, una variante de más o un opcional donde T pide un nulo compilan (medido con
 *  tsc 5.9.3 y zod 4.4.3). SchemaMatches es true solo si la salida del esquema y T son asignables en los dos sentidos; DeepReadonly
 *  iguala los `readonly` a los dos lados (Zod no los pone, y los tipos de hoy por z.infer tampoco). Se usa como CODES_MATCH: una
 *  constante que solo lee el compilador. */
type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T
export type SchemaMatches<S extends z.ZodType, T> = [DeepReadonly<z.output<S>>] extends [DeepReadonly<T>] ? ([DeepReadonly<T>] extends [DeepReadonly<z.output<S>>] ? true : false) : false

const int = z.number().int()
const ix = int.min(0)          // RiderIx, GroupIx, Block, y un índice + 1 (0 = ninguno)
const ds = int.min(0)          // un reloj, una salida o una pérdida en Ds: nunca negativos
const orNone = int.min(-1)     // un índice o −1, que en memoria es null
const mishapKindSchema = z.enum(['caida', 'pinchazo', 'averia']) satisfies z.ZodType<MishapKind>

/** Las piezas que el formato comparte con la red: viven aquí y wire.ts las importa, para que codec.ts no cargue BROADCAST (15-b). */
export const stageRefSchema = z.object({ raceKey: z.string(), stageDay: int.min(1) }) satisfies z.ZodType<StageRef>
export const championTitleSchema = z.object({ scope: z.enum(['world', 'continental', 'national']), country: z.string().length(2).nullable(), discipline: z.enum(['road', 'itt']), category: z.enum(['elite', 'u23']), season: int, validFromDay: int, validToDay: int, source: stageRefSchema, provisional: z.boolean() }) satisfies z.ZodType<ChampionTitle>
export const wornJerseySchema = z.discriminatedUnion('kind', [z.object({ kind: z.literal('leader'), jersey: jerseyKindSchema, delegated: z.boolean(), from: stageRefSchema }), z.object({ kind: z.literal('champion'), title: championTitleSchema }), z.object({ kind: z.literal('team') })]) satisfies z.ZodType<WornJersey>
export const distinctionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('leads'), jersey: jerseyKindSchema, from: stageRefSchema }), z.object({ kind: z.literal('wears_for'), jersey: jerseyKindSchema, rank: int.min(1), from: stageRefSchema }),
  z.object({ kind: z.literal('champion'), title: championTitleSchema }), z.object({ kind: z.literal('gc'), rank: int.min(1), deficitS: z.number().min(0), from: stageRefSchema }),
  z.object({ kind: z.literal('stage_wins'), stages: z.array(stageRefSchema) }),
]) satisfies z.ZodType<Distinction>
export const profileStripSchema = z.object({ altM: z.array(int), sprintsKm: z.array(z.number()), laps: int.min(1), climbs: z.array(z.object({ footKm: z.number(), topKm: z.number(), cat: z.string(), lenKm: z.number(), avgPct: z.number(), name: z.string().nullable() })) }) satisfies z.ZodType<ProfileStrip>
export const stageWeatherSchema = z.object({ tempC: z.number(), rain: z.number().min(0).max(1), spans: z.array(z.object({ fromKm: z.number(), rain: z.number(), windDir: z.number(), windKmh: z.number(), crosswind: z.boolean() })) }) satisfies z.ZodType<StageWeather>
const castRiderSchema = z.object({
  rider: ix, riderId: z.string(), bib: int.nullable(), team: ix.nullable(), country: z.string().length(2), gender: z.enum(['M', 'F']),
  start: z.object({ gcRank: int.min(1).nullable(), gcDeficitS: z.number().min(0).nullable(), from: stageRefSchema.nullable() }),
  worn: wornJerseySchema, distinctions: z.array(distinctionSchema), knownWins: ix,
}) satisfies z.ZodType<CastRider>
const timelineCastSchema = z.object({
  riders: z.array(castRiderSchema), teams: z.array(z.object({ teamId: z.string(), jerseySeed: z.string() })),
  favourites: z.array(z.object({ rider: ix, why: z.enum(['sprint', 'hills', 'climb', 'tt', 'cobbles']) })),
}) satisfies z.ZodType<TimelineCast>
const timeTrialTraceSchema = z.object({
  order: z.enum(['gc', 'bib']), intervalS: int.min(1), checksKm: z.array(z.number()), startDs: z.array(ds),
  kmClockDs: z.array(z.array(ds)), checkClockDs: z.array(z.array(ds)),
  mishaps: z.array(z.object({ rider: ix, km: z.number(), kind: mishapKindSchema, lostDs: ds })),
}) satisfies z.ZodType<TimeTrialTrace>
const flat = (n: number) => z.array(ix).refine((a) => a.length % n === 0, `lista plana de ${n} en ${n}`)

/** EL FORMATO 1 AL LEERLO de la base (H-13): la forma, los tipos y el múltiplo de cada lista plana. Lo que cruza listas (que un GroupIx
 *  exista, que los b no bajen, que cada foto clave tenga un byte por corredor) lo comprueba fromStoredV1, que lanza TimelineFormatError.
 *  Un motivo que ya no esté en pullMotiveSchema se lee como null, como hoy chronicle.ts l. 1306: una palabra no tira la línea (O-14). */
export const storedTimelineV1Schema = z.object({
  format: z.literal(1), engineVersion: int.min(1), dx: z.number().positive(), blocks: int.min(1), lengthKm: z.number().positive(), timeTrial: z.boolean(),
  riderIds: z.array(z.string()), groupIds: z.array(z.string()),
  groupMeta: z.array(orNone).refine((a) => a.length % 4 === 0, 'groupMeta: cuartetos'),
  keys: z.array(z.tuple([ix, z.string()])), moves: flat(3), main: flat(2), clocks: flat(3),
  mishaps: z.array(z.tuple([ix, ix, mishapKindSchema, ds])),
  events: z.array(z.tuple([orNone, z.string(), ix, ds, ix, ds, z.array(ix), z.record(z.string(), z.union([z.number(), z.string()])).nullable()])),
  detail: z.array(z.tuple([ix, ix, orNone, ix, z.array(z.tuple([ix, pullMotiveSchema.nullable().catch(null), orNone])), mishapKindSchema.nullable(), ds])),
  banners: z.array(z.tuple([z.literal([0, 1]), ix, z.string().nullable(), z.string().nullable(), ds, flat(2)])),
  profile: profileStripSchema, cast: timelineCastSchema, weather: stageWeatherSchema, tt: timeTrialTraceSchema.nullable(),
  finish: z.object({ finishDs: ds, arrivals: z.array(z.tuple([ds, z.array(ix)])) }),
}) satisfies z.ZodType<StoredTimelineV1>
export const STORED_MATCH: SchemaMatches<typeof storedTimelineV1Schema, StoredTimelineV1> = true

/** Siempre escribe el formato vigente. Puro. Lanza TimelineFormatError si un GroupIx + 1 no cabe en un byte (más de 255 grupos:
 *  medido como mucho 140, estado §3.5) o si tl.format no es 1; el grabador lo trata como una autocomprobación fallida (D-12). */
export function encodeTimeline(tl: StageTimeline): StoredTimelineV1

/** La inversa exacta del formato 1 (el párrafo de abajo). Lanza TimelineFormatError si las listas no cruzan. Privada: se entra por decodeTimeline. */
function fromStoredV1(s: StoredTimelineV1): StageTimeline

/** El despacho por versión (H-13): valida con Zod, porque el cuerpo llega de la base, y convierte. */
export function decodeTimeline(s: unknown): StageTimeline {
  const format = typeof s === 'object' && s !== null && 'format' in s ? s.format : undefined
  if (format === 1) return fromStoredV1(storedTimelineV1Schema.parse(s))
  throw new TimelineFormatError(`stage_timelines: formato ${String(format)} desconocido`)
}
```

`fromStoredV1` es la inversa exacta: los cuartetos de `groupMeta` pasan a `GroupCatalogEntry` (−1 a null); cada foto clave decodifica su base64 a `Uint8Array` y resta 1 en un `Int16Array` nuevo, y su `main` es el del último par de `main` con `b ≤ key.b`; los tríos de `moves` acumulan `Δb`, los `to + 1 = 0` son `out` y los tríos seguidos con el mismo `b` y el mismo `to` se juntan en un `move` con sus corredores por `RiderIx` creciente; los tríos de `clocks` con el mismo `b` son un `clock`; y todo se ordena por `b` y por el orden de `StateEvent` (out, move, main, clock, mishap). `events`, `detail` y `banners` desanidan su tupla con `fromDs` y `fromKm10`; −1 y 0 vuelven a null donde el comentario lo dice; `clock` es siempre `'exact'` (el `'estimated'` solo lo construye el adaptador de la radio en memoria, D-07). `storedTimelineV1Schema` se ata a su tipo en los dos sentidos: con `satisfies z.ZodType<StoredTimelineV1>` (el patrón de `contracts.ts` l. 77) y con `STORED_MATCH` (4-x). Validar no sale gratis. Con este esquema, compilado del documento con Zod 4.4.3 y pasado 30 veces por las ocho líneas del prototipo en `l7/stored` (`corr-l2/zod-real.mjs`, dos corridas), el `parse` de Zod cuesta de 0,9 a 21 ms de mediana según la línea, de cinco a seis veces el `JSON.parse` en las pesadas (la e20: 18 ms de Zod sobre 3 de `JSON.parse` y 1 de gunzip, `coste/zod/decode.mjs`), y la primera llamada del proceso, 61 ms; con el esquema aproximado del refutador de coste eran de 0,4 a 18 ms y de 44 a 109 ms la primera. El LRU de `BROADCAST.decodedCacheEntries` (16, decisión 18-d) lo ahorra mientras las etapas que se miran quepan en él, y cada despliegue o reinicio lo vacía; su tasa de acierto un día pico no la ha medido nadie (§18.9). Un formato 2, el día que haga falta, es un `case 2` y un `fromStoredV2`; las filas de formato 1 se siguen leyendo con el suyo.

La guarda de tipos entre la sonda y el grabador (I-17, H-13): el motor cambia cada pocos días (de la v86 del 22-09 a la v89 del 26-09, juez del motor H-motor-04) y la línea guardada no se reescribe, así que un campo nuevo de la foto o de la sonda tiene que obligar a decidir qué hace el grabador con él. Se escribe con `satisfies` en el propio grabador, y falla al compilar, no en producción:

```ts
// packages/engine/src/sim/timeline.ts
import type { BannerResult, GroupOrigin, MishapKind, PullMotive, RadioGroupKind } from '@cyclingstar/shared'
import type { BannerType, Incident, PullMotive as EnginePullMotive, SnapshotRider, StageProbe } from '../stage/types.js'
import type { RadioGroupKind as EngineRadioGroupKind } from './raceRadio.js'

/** Qué hace el grabador con cada campo de la foto. Si SnapshotRider gana o pierde uno, esto no compila y quien lo toca decide
 *  aquí si la línea lo guarda (con TIMELINE.format nuevo y su decodificador) o lo ignora. */
export const SNAPSHOT_FIELDS = {
  riderId: 'rider',      // a RiderIx por riderIds
  groupId: 'group',      // a GroupIx por el catálogo: nacimientos, muertes, move y out
  tS: 'clock',           // la marca de reloj del grupo: el mínimo de los suyos (raceRadio.ts l. 284-300)
  energy: 'ignored',     // la tele no enseña depósitos; la radio guardada tampoco (energyPct no pasa a StoredRadioGroup)
  energy0: 'ignored',
  pulling: 'detail',     // capa de detalle, solo en los bloques de radioKmPoints (D-08)
  pullMotive: 'detail',
  pullFor: 'detail',
  pullWindow: 'detail',  // ordena a los relevistas (raceRadio.ts l. 286-289)
} as const satisfies Record<keyof SnapshotRider, 'rider' | 'group' | 'clock' | 'detail' | 'ignored'>

/** Cada método de StageProbe, con el uso que le da el grabador; uno nuevo en la sonda obliga a decidir aquí. */
export const PROBE_HOOKS = {
  atKm: 'every_block',       // el centro de CADA bloque, por el colector aparte (D-08, §5.3)
  onSnapshot: 'photo',
  onEvent: 'emit_block',     // §5.2
  onBanner: 'banner',        // §5.2
  onTimeTrialRide: 'tt_trace', // §5.2, §9.2
} as const satisfies Record<keyof StageProbe, string>

/** Los vocabularios que se guardan como cadena, iguales en el motor y en shared en los dos sentidos (el patrón de raceRadio.test.ts l. 148-152). */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
export const CODES_MATCH = { mishap: true, motive: true, kind: true, banner: true } as const satisfies {
  mishap: Same<MishapKind, Incident['tipo']>
  motive: Same<PullMotive, EnginePullMotive>
  kind: Same<RadioGroupKind, EngineRadioGroupKind>
  banner: Same<BannerResult['kind'], BannerType>
}

/** Del prefijo del id al origen. Un prefijo que no esté aquí hace lanzar TimelineFormatError al grabar, y B11 lo ve en los bancos. */
export const ORIGIN_OF_PREFIX: readonly (readonly [string, GroupOrigin])[] = [['peloton', 'start'], ['mov-', 'attack'], ['shed-', 'shed']]
```

`TIMELINE.format` (§15.2) vale `1 as const` y el grabador escribe `format: TIMELINE.format` en un campo de tipo literal `1`: subir la constante sin escribir el formato nuevo no compila. `CODES_MATCH` no se lee nunca en ejecución; existe para que `pnpm typecheck` compare las uniones, como el test de `PullMotive` de hoy, y por eso vive junto al código que depende de ellas y no en un test. Las cuatro constantes se exportan para que `no-unused-vars` no las marque y para que `timeline.test.ts` pueda comprobar que `ORIGIN_OF_PREFIX` reconoce los tres ids de `simulate.ts` (l. 185, 5836 y 7218).

### 4.4 El reductor y sus invariantes

```ts
// packages/shared/src/broadcast/reduce.ts
import type { Block, Photo, StateEvent, TimelineCore } from './timeline.js'

/** EL REDUCTOR: aplica un suceso de estado a una foto. Puro y total: un `case` por variante; copia `groupOf` solo si cambia.
 *  En `clock` deja la última marca vista de cada grupo; el reloj en `b` de cada grupo vivo lo pone `photoAt` al final. */
export function reducePhoto(p: Photo, e: StateEvent): Photo {
  switch (e.t) {
    case 'out': { const groupOf = p.groupOf.slice(); groupOf[e.rider] = -1; return { ...p, b: e.b, groupOf, detail: null } }
    case 'move': { const groupOf = p.groupOf.slice(); for (const r of e.riders) groupOf[r] = e.to; return { ...p, b: e.b, groupOf, detail: null } }
    case 'main': return { ...p, b: e.b, main: e.group, detail: null }
    case 'clock': { const clock = new Map(p.clock); for (const [g, ds] of e.marks) clock.set(g, ds); return { ...p, b: e.b, clock, detail: null } }
    case 'mishap': return { ...p, b: e.b, detail: null } // la pérdida ya está en las marcas; el percance lo leen la cola de rótulos y la radio
  }
}

/** La foto al final del bloque b: la foto clave anterior (o la de salida) y los sucesos de estado hasta b. Pura. */
export function photoAt(tl: TimelineCore, b: Block): Photo
```

`photoAt(tl, b)`, en pseudocódigo:

```
clave ← la última de tl.keys con clave.b ≤ b; si no hay ninguna (crono, adaptador, web, o b antes de la primera), fotoDeSalida(tl)
p ← { b: clave.b, groupOf: copia de clave.groupOf, main: clave.main, clock: vacío, detail: null }
para cada e de tl.stateEvents con clave.b < e.b ≤ b, en su orden:  p ← reducePhoto(p, e)
vivos ← { g : existe r con p.groupOf[r] = g }
clock ← para cada g de vivos:  relojEn(clockMarksOf(tl, g), b)
devolver { b, groupOf: p.groupOf, main: p.main, clock, detail: tl.detail.get(b) ?? null }

fotoDeSalida(tl) = { b: −1, groupOf: todo 0, main: 0, clock: { 0 → 0 }, detail: null }     // todos salen en `peloton` (simulate.ts l. 1698-1702)

relojEn(marcas de g por b creciente, b):
  m0 ← la última marca con bloque ≤ b;  m1 ← la primera con bloque ≥ b
  si m0.b = b:  m0.ds
  si hay m0 y m1:  toDs(m0.ds + (m1.ds − m0.ds) · (b − m0.b) / (m1.b − m0.b))        // interpolación lineal por bloque (D-01, punto 5)
  si solo hay m0 (línea cortada):  la extrapolación de instantAt (§4.5) evaluada en b
```

`clockMarksOf` (el nombre que usa §3.3) se construye una vez por línea (un `WeakMap` por objeto `tl`) recorriendo los `clock`; las marcas de cada grupo cubren su vida entera, porque hay una en su nacimiento, otra en su muerte y otra en cada foto de km (§3.4), así que en una línea entera nunca falta `m1` para un grupo vivo. `photoAt` es lo que usan el servidor para la radio de un km (`radioFromTimeline`, B16), los bancos B2 y la autocomprobación; la pantalla usa `instantAt` (4.5), que solo lee lo visible.

Los cuatro invariantes (I-02; D-02), como enunciados. La I4 de `estado.md` («mirar no cambia la carrera») es B11 en este documento.

**I1 · la foto reducida es la foto del motor.** Para toda etapa grabada y todo km `k` de `radioKmPoints` (`raceRadio.ts` l. 230-237), con `b` su bloque (`simulate.ts` l. 1946-1948) y `p = photoAt(tl, b)`: `proy(p) ≡ radioKmFrom(kmAt(b), fotoDelMotor(b), starters, ∞, null, idDe(p.main))` (`raceRadio.ts` l. 239-351). `proy(p)` es la radio de la foto: los grupos vivos ordenados por reloj en Ds y, a igual reloj, por id; cada uno con sus miembros, su tamaño, su hueco al primero y su `kind` por la regla de `kindOf` (l. 361-383) con el título de `p`; `racing` los que tienen grupo, `gone` los que no, `mainId` el id de `p.main`. `≡` es igualdad en orden de carretera (dos grupos con el mismo reloj en Ds pueden cambiar de puesto, y con el puesto su `kind`, que en cabeza depende de él: la tolerancia cubre también el `kind`, decisión 5-i), ids, miembros como conjuntos, tamaño, `kind` (como multiconjunto en cada tramo de igual reloj), `gapS` a 0,1 s, `racing`, `gone` y `mainId`. Sin la tolerancia del `kind` falla 1 foto de 8.656 (`race-italy` e9, semilla 1; §5.5). Medido: 0 discrepancias en 3.246 fotos (5 etapas × 3 semillas, `estado.md` §3.9). Exige la regla del título por bloque: el motor recalcula el pelotón una vez por km (`simulate.ts` l. 4095-4115) y en los bloques siguientes su `mainId` puede apuntar a un grupo ya vacío, que la radio recalcula (`raceRadio.ts` l. 317-320); copiado sin la regla, salen 69 discrepancias (`estado.md` §1, punto 11). Contra la radio guardada de hoy, que hereda el título del km anterior y no del bloque anterior, el título difiere en 4 de esas 3.246 fotos (D-03). Corre en `selfCheckI1` antes de escribir (D-12, §5.5), en los bancos sobre las 24 etapas del mapa 07 §7 y en la suite rápida sobre fotos sintéticas y una etapa congelada (D-52, §15.5).

**I2 · el instante coincide con la foto donde se mide.** Para toda foto de km `b` y todo grupo `g` vivo en ella, con `t = relojEn(clockMarksOf(tl, g), b) / 10`: los miembros de `g` en `instantAt(tl, t, ctx)` son los de `photoAt(tl, b)` menos los que el corte diagonal pinta en un grupo que va detrás (D-04). Además, muestreando cada 30 s de reloj de carrera, el número de corredores en tránsito tiene p90 ≤ 15 por etapa y p90 ≤ 4 en el conjunto, el umbral que fija §16.2 sobre su fixture (decisión 16-b, `l8/transito.mjs`). El p90 ≤ 2 que fijaba la síntesis falla en 23 de 44 corridas: describe las llanas (`estado.md` §3.9 midió p90 de 0 a 2 y máximo de 13 a 66 en una gran fusión) y no las reinas (§3.3: de 3 a 5 en la e18 con el campo de la radio, contando los que no van en ningún grupo).

**I3 · las claves y el empaquetado cuadran.** Para toda `i ≥ 1`, `keys[i].groupOf` y `keys[i].main` son los de reducir `keys[i − 1]` con los sucesos de estado de `(keys[i − 1].b, keys[i].b]`, y los de `keys[0]` los de reducir `fotoDeSalida`; y `decodeTimeline(encodeTimeline(tl))` es igual a `tl` campo a campo (los `Int16Array` por contenido, los `Map` por entradas en orden), sin tolerancia (§4.1).

**I5 · la traza de la crono cuadra con el resultado.** Para toda crono y todo corredor `r`: `tt.startDs[r] = toDs(startS)` de su hueco en `timeTrialStartOrder` (`startOrder.ts` l. 127); `tt.kmClockDs[r]` no decrece; y su última entrada, el reloj propio en meta con la pérdida del percance, cumple `kmClockDs[r].at(−1) = 10 · results[r].tiempoS`, una igualdad exacta: la última entrada se escribe como `10 · Math.round(tS)` (9-a) y `tiempoS` es `Math.round` del tiempo con percance y ruido (`timetrial.ts` l. 312, 347 y 361). La tolerancia de 5 Ds solo hacía falta con `toDs` (16-c). En reloj de carrera, `startDs[r] + kmClockDs[r].at(−1)` es su llegada. Y en cada control `c`, `checkClockDs[r][c]` es `10 · splitS` de todo `tt_split` del motor cuyo primer protagonista es `r` en ese control (9-b), también sin tolerancia, porque los dos salen del mismo `Math.round(raw[idx] · noise)` (`timetrial.ts` l. 528 y 542). Los casos los escribe §9.8.

```ts
// packages/engine/src/sim/timeline.ts: lo que devuelve selfCheckI1 (§5.5); vacío si I1 se cumple
export interface I1Mismatch {
  readonly b: Block        // bloque de la foto de km
  readonly km: number      // su km, para la nota de tick_log `timeline I1: <raceKey> e<N> km <k>` (D-12)
  readonly field: 'order' | 'members' | 'size' | 'kind' | 'gapS' | 'racing' | 'gone' | 'mainId'
  readonly group: string | null // id del motor del grupo afectado; null en racing, gone y mainId
  readonly expected: string     // lo que da radioKmFrom sobre la foto del motor, en pocas letras
  readonly got: string          // lo que da la línea reducida
}
```

### 4.5 El instante

El instante es lo que pinta la tele a una hora de carrera `t`: cada grupo donde está AHORA (D-01, D-04). No lo guarda nadie; lo calcula `instantAt` sobre la línea, en la web cada fotograma y en el servidor para la cabecera y los avisos (`42 km to go`, §11.4).

```ts
// packages/shared/src/broadcast/instant.ts
import type { RadioGroupKind } from '../contracts.js'
import type { JerseyKind } from '../jerseys.js'
import type { BannerResult, Block, GroupDetail, GroupIx, RaceS, RiderIx, TimelineCore } from './timeline.js'
import type { StartState } from './wire.js'

/** UN código de papel para la barra, la radio servida, la voz y el acta (D-18); las palabras y sus condiciones son de §6.3. */
export type GroupRole = 'lead' | 'chase' | 'bunch' | 'gruppetto'
// GROUP_ROLES y la guarda isGroupRole(x: unknown): x is GroupRole viven en este fichero y se escriben en §12.6: mainRole y groupRole
// llegan a la voz en `datos`, sin tipo.
/** Cómo se rotula una fila (§6.3). */
export type GroupLabel =
  | { readonly k: 'role' }                                        // la palabra de su papel: `Lead group`, `Chase group`, `Bunch`, `Gruppetto` (pantalla)
  | { readonly k: 'names'; readonly riders: readonly RiderIx[] } // BROADCAST.byNamesUpTo (3) o menos: se nombra por ellos (SPEC §6.15)
  | { readonly k: 'jersey_group'; readonly jersey: JerseyKind }  // lleva un maillot de líder y no es cabeza ni pelotón: `Race leader’s group` (pantalla)
  | { readonly k: 'together' }                                    // un solo grupo en carrera: `Bunch together` (pantalla)
/** La tendencia de un hueco (D-17): el hueco ahora menos el de BROADCAST.trendWindowKm (5) km antes, del mismo grupo o de su antecesor por la cadena de successor (D-03). */
export interface GapTrend { readonly deltaS: number; readonly windowKm: number; readonly arrow: 'up' | 'down' | 'flat' } // deltaS > 0: crece; windowKm: trendWindowKm; up si deltaS ≥ trendMinS (5), down si ≤ −trendMinS, flat (sin flecha) entre medias
export interface GapReading {
  readonly toHeadS: number         // a la cabeza, en el último km de foto que ESTE grupo ha cruzado: resta de dos marcas del mismo bloque (D-01, punto 4); si no ha cruzado ninguno, el de su origen (3-e)
  readonly toAheadS: number | null // al grupo de número anterior en ese mismo bloque; null si ese grupo no tenía marca allí
  readonly atKm: number            // el km de foto donde se midió: la moto de cronometraje (mapa 06 §1.4)
  readonly trend: GapTrend | null  // null si ni él ni un antecesor suyo por la cadena de successor tenía marca trendWindowKm antes, o en el caso 3-e
}
/** UN GRUPO EN PANTALLA en la hora t. Todo se deriva. */
export interface GroupNow {
  readonly g: GroupIx                  // la identidad: el id del motor (D-03)
  readonly number: number              // 1 = el primero de la carretera en t; renumera, no es identidad (UCI §11.2)
  readonly role: GroupRole             // con histéresis de BROADCAST.roleHysteresisKm (4-q)
  readonly label: GroupLabel
  readonly kind: RadioGroupKind        // kindOf (raceRadio.ts l. 361-383) sobre el orden y el pelotón de ESTE instante
  readonly km: number                  // dónde se pinta: el máximo de lo pintado, nunca hacia atrás (D-04, 4-e)
  readonly size: number                // members.length
  readonly members: readonly RiderIx[] // por RiderIx creciente (orden de dorsal); el que sale en dos grupos cuenta solo en el de atrás (3-b)
  readonly gap: GapReading
  readonly detail: GroupDetail | null  // su fila de la capa de detalle en el último km de foto cruzado
  readonly jerseys: readonly JerseyKind[] // maillots de líder que llevan sus miembros (ctx.start.leaders), en JERSEY_PRIORITY: para la etiqueta jersey_group y el cuadro de diferencias.
                                       // El maillot llevado y la equipación de cada nombrado de la fila no se copian aquí: son los de su RiderCard (worn, team.jerseySeed; §4.8), ya con el velo, por RiderIx
  readonly own: boolean                // lleva un corredor del espectador (ctx.own)
}
/** Un corredor que en t sale en dos grupos (se pinta en el de atrás, `from`) o en ninguno: cambió de grupo en el tramo que los separa (D-01, punto 6; 3-b). */
export interface InTransit { readonly rider: RiderIx; readonly from: GroupIx; readonly to: GroupIx; readonly gap: GapReading } // gap: el de from en el último km de foto en que iba en él (3-c)
/** La diferencia principal de la capa fija (D-17). */
export interface MainGap {
  readonly ahead: GroupIx; readonly behind: GroupIx
  readonly gapS: number              // marca de `behind` menos la de `ahead` en el último km de foto que ha cruzado `behind`
  readonly trend: GapTrend | null    // la pareja de antecesores por la cadena de successor trendWindowKm antes; null si `behind` no tiene antecesor allí: solo se reinicia si cambia la identidad de verdad (con el id, de 10 a 19 veces por etapa en Colombia, §3.7)
  readonly ref: 'bunch' | 'jersey_group' | 'second' // contra el pelotón; contra el primero de detrás con maillot o un top BROADCAST.mainGapTopStart (3) de salida; contra el segundo
}
/** Una fila de la general virtual (mapa 06 §3.3). */
export interface VirtualGcRow { // group: −1 en crono; startRank: StartState.gcTop; virtualS: déficit de salida + hueco de su grupo al del líder en su último km de foto común
  readonly rider: RiderIx; readonly group: GroupIx; readonly startRank: number; readonly virtualS: number
}
/** EL INSTANTE (D-04). */
export interface Instant {
  readonly t: RaceS
  readonly headKm: number              // el km pintado del grupo número 1
  readonly toGoKm: number              // máx(0, lengthKm − headKm)
  readonly lapsToGo: number | null     // si profile.laps > 1, ceil(toGoKm / (lengthKm / laps)); si no, null
  readonly groups: readonly GroupNow[] // en orden de carretera
  readonly inTransit: readonly InTransit[]
  readonly mainGap: MainGap | null     // null: un solo grupo, `Bunch together` (pantalla)
  readonly banners: readonly BannerResult[] // solo las ya reveladas
  readonly virtualGc: readonly VirtualGcRow[] | null // solo si un top BROADCAST.virtualGcTop (10) de salida va en otro grupo que el líder a menos de virtualGcMaxS (300 s)
  readonly racing: number              // sin un `out` visible
  readonly gone: number                // riderIds.length − racing
}
/** La crono en la hora t (D-23; su algoritmo es §9.3). Se deriva de TimeTrialTrace. */
export interface TimeTrialInstant {
  readonly t: RaceS
  // en ruta: su km por su traza, el último control de checksKm que ha pasado (null si ninguno) y su diferencia con el mejor paso por él antes de t
  readonly onCourse: readonly { readonly rider: RiderIx; readonly km: number; readonly lastSplitKm: number | null; readonly deltaS: number | null }[]
  readonly hotSeat: { readonly rider: RiderIx; readonly timeS: number } | null // el mejor tiempo llegado antes de t: exacto; es arrivals[0]
  // los llegados antes de t, por timeS y, a igualdad, por hora de llegada (a igual segundo no se quita el puesto, bestChain, timetrial.ts
  // l. 128-158); timeS = kmClockDs[r].at(−1) / 10, el tiempoS de results. El puesto de FINISH y la tabla de llegados (§9.3, §9.5; 9-i)
  readonly arrivals: readonly { readonly rider: RiderIx; readonly timeS: number }[]
  readonly splits: readonly { readonly km: number; readonly board: readonly { readonly rider: RiderIx; readonly timeS: number }[] }[] // por control, los pasados antes de t, por tiempo
  readonly virtualGc: readonly VirtualGcRow[] | null
  readonly toStart: number               // los que no han salido en t
  readonly finished: number              // los que han llegado en t
}

/** Lo que el instante necesita además de la línea: el reparto servido, ya con el velo, y el calendario público de fotos. */
export interface InstantContext {
  readonly own: ReadonlySet<RiderIx>     // corredores del espectador y de su equipo; vacío para el visitante
  readonly start: StartState             // maillots y general de salida (§4.11), degradados por el velo como el reparto (B13)
  readonly photoBlocks: readonly Block[] // photoBlocksOf(lengthKm, dx): los bloques de radioKmPoints, públicos porque salen de la longitud
}
/** radioKmPoints (raceRadio.ts l. 230-237) llevado a bloques como simulate.ts l. 1946-1948; copia atada por test (§15.5). */
export function photoBlocksOf(lengthKm: number, dx: number): readonly Block[]
/** EL CORTE DIAGONAL, causal: solo lee datos con visibilidad ≤ t (§4.6). */
export function instantAt(tl: TimelineCore, t: RaceS, ctx: InstantContext): Instant
```

`instantAt` se especifica sobre lo visible (decisión 4-c): `instantAt(tl, t, ctx)` es, por definición, `instanteDeLoVisible(cutTimeline(tl, t), t, ctx)`. Como `cutTimeline` es idempotente (§4.6), B9 (`instantAt(cutTimeline(tl, T), T) = instantAt(tl, T)`) es cierta por construcción, y lo que B9 prueba en la práctica es que la implementación, que no copia la línea sino que recorre sus listas saltándose lo que tiene visibilidad mayor que `t` (`TimelineVisibility`, §4.6), es igual a esa especificación. El algoritmo, con `v` la línea visible y `T = toDs(t)`:

```
1. Grupos vivos: los de v.groups (todos nacidos a la vista) con diedB = null en v (la muerte aún no se ve, o no la hay)
2. Posición (D-04). Para cada grupo g, con sus marcas visibles (b_0, d_0) … (b_n, d_n) por bloque:
     v_j ← (b_j − b_{j−1}) / (d_j − d_{j−1}) bloques por Ds si j ≥ 1; v_0(s) ← la de originOf(g) (el grupo de la mayoría de los suyos en
       photoAt(v, bornB − 1)) entre sus dos últimas marcas con reloj ≤ s, o 0 si no las tiene o g es el de salida (3-a)
     tope(b) ← el primer bloque de ctx.photoBlocks mayor que b, o blocks − 1: el siguiente punto donde g tendrá marca seguro
     E_j(s) ← mín(tope(b_j), b_j + v_j · (s − d_j))                         para s ≥ d_j
     real_g ← E_n(T)                                                         el bloque donde está según lo visible: da su composición
     pintado_g ← máx(E_n(T), máx_{j < n} E_j(d_{j+1}))                       lo más lejos que se llegó a pintar: la pantalla no retrocede
     km_g ← máx(0, (pintado_g + 0,5) · dx);  sin marcas visibles, el de salida tiene real 0 y pintado −0,5: el km 0, con todo el reparto (3-f)
3. Composición: para cada g, los r con groupOf[r] = g en photoAt(v, ⌊real_g⌋) (una pasada, por ⌊real_g⌋ creciente)
4. Tránsito (3-b): un corredor en dos grupos se pinta en el de ATRÁS (en su punto el cambio aún no ha pasado), sale del otro y va a
     inTransit { from: el de atrás, to: el de delante }; uno sin `out` visible y sin grupo, a inTransit { from: su grupo antes de su
     último move visible, to: el de ese move }. gap ← el GapReading de from en el último km de foto en que iba en él (3-c)
5. Orden: por km pintado decreciente; a igual km, por marca en su último km de foto y por id. number ← 1, 2, …
6. Pelotón: el grupo del último `main` visible; si ya no vive, el primero vivo de su cadena de successor
7. kind: la regla de kindOf con este orden y este pelotón (delante, fuga el primero y contra los demás; detrás, tierra si su origen es attack, grupeto si no)
8. Huecos: k_g ← el último bloque de ctx.photoBlocks ≤ b_n (el último km de foto que g ha cruzado: su marca allí es visible)
     cabeza(k) ← la menor marca visible en k, con máximo acumulado sobre los k anteriores (C3: 0 bajadas mirando por km)
     toHeadS ← (d_g(k_g) − cabeza(k_g)) / 10;  toAheadS con el grupo de número anterior si tiene marca en k_g
     trend ← toHeadS en k_g menos el de la foto trendWindowKm antes, de g o de su antecesor por la cadena de successor (el mayor)
     si g no tiene marca en k_g (nació después): el GapReading de originOf(g) en su último km de foto antes de bornB, trend null (3-e);
       el de salida sin marcas: toHeadS 0, toAheadS null, atKm 0 (3-f)
     detail ← la fila de g en v.detail.get(k_g)
9. Papel (4-q): crudo(g, s) es el papel por las condiciones de §6.3 sobre el instante en s; s_g ← la marca de g, o de su antecesor por
     la cadena de successor, en la foto roleHysteresisKm antes de k_g. role ← crudo(g, t) si crudo(g, t) = crudo(g, s_g), si no hay s_g,
     o si un move de más de un corredor tocó g en (s_g, t]; si no, crudo(g, s_g). label por §6.3.
     crudo(g, s_g) se guarda por (g, k_g): s_g solo cambia cuando g cruza un punto de foto, así que el instante en s_g se calcula
     una vez por grupo y km, no en cada fotograma (§18.1)
10. mainGap por D-17 (ref bunch, jersey_group o second); virtualGc por mapa 06 §3.3; banners de v; racing, gone, jerseys, own
```

Tres propiedades salen del algoritmo y las comprueban tests de §16. La posición nunca va por delante de la verdad más allá del siguiente punto de foto, porque ahí el grupo tiene marca y `tope` no deja pasarlo: el error por construcción es menor que un km; el típico no lo midieron los jueces (D-04): el redactor de §3 midió un p99 de 52 a 508 m con 3-a (`l1/corte.mjs`, 15 corridas), y B21 lo mide con el grabador real en el paso 6. La composición se toma en `real_g` y no en `pintado_g` para que I2 sea exacta: en `t = d_g(k)` el grupo está en `k` y su composición es la de la foto. Y el instante no usa nunca un reloj de corredor como hueco (su reloj de foto suma deriva y marcaje, `simulate.ts` l. 9012): el hueco del corredor del espectador es el de su grupo y, en tránsito, `InTransit.gap` (D-01, punto 4; H-17; 3-c; su pantalla es §3.5 y §6.2). `RaceS` es coma flotante solo aquí: `t` viene del reloj de reproducción de la web (§8), y todo lo que se compara con la línea pasa antes por `toDs`. El paso 9 es el más caro, porque pide el instante en otra hora por cada grupo vivo: con la aproximación de §18.1, sin el memo por `(g, k_g)` el fotograma cuesta un p95 de 0,064 a 0,804 ms, y con él, de 0,017 a 0,052 ms (medido, `coste/instante-hist.mjs` y `corr-l7/instante-memo.mjs`).

### 4.6 La visibilidad y el corte

Cada dato de la línea tiene una hora a partir de la cual se puede enseñar (D-06, I-10; `datos.md` §3.4 con los relojes de estado), y el servidor solo sirve lo que la tiene ≤ lo alcanzado más `BROADCAST.prefetchRaceS` (900). Se calcula UNA vez por línea, en el servidor y sobre la línea entera, y siempre de marcas exactas o de un `revealS` ya grabado: así sale igual sobre una línea cortada y el corte es idempotente.

| Dato | Visible desde | Por qué |
| --- | --- | --- |
| una marca de reloj `[g, d]` | `d` | la tele ve pasar al grupo |
| el nacimiento de un grupo (su entrada en `groupsBorn`) | su marca en `bornB`; el de salida, 0 (3-f: la salida es pública, y todos cruzan el primer bloque a los 9,2 s, C1) | antes no existe; el catálogo entero no se sirve nunca (su tamaño cuenta cuánto se rompe la etapa, `estado.md` §10.2) |
| su muerte y su sucesor | su marca en `diedB` | |
| `move` de A a B en `b` | el primero de los dos cruces, `mín(d_A(b), d_B(b))` | el primero que pasa ya enseña que el corredor no va, o que ya va; las dos marcas existen (cambio de composición, §3.4) |
| `out` en `b` | la marca de su grupo en `b` | abandono visto al pasar su grupo |
| `main` en `b` | el primero de los dos cruces del grupo que pierde el título y del que lo gana; sin grupos, la cabeza (4-d) | el título solo cambia en un bloque de decisión, que es siempre un bloque de foto de km (`simulate.ts` l. 3428; medido en `l2/bloquefoto.mjs`: el bloque de la foto del km `k` es `10k` para todo `k` de 0 a 400), o al vaciarse su grupo: en los dos casos hay marca |
| `mishap` en `b` | el `revealS` del suceso que lo cuenta (la caída sintetizada o el `puncture` o `mechanical` del motor) | D-05: el reloj, en su bloque, del grupo en que iba el caído (4-v), calculado al grabar |
| la capa de detalle de g en `b` | la marca de g en `b` | se sabe quién tira al verlo pasar |
| un suceso narrable, una pancarta | su `revealS` (§4.7) | |
| crono: la salida de `r` | `startDs[r]` | el orden de salida es público; lo que se sabe en `t` es que ya salió |
| crono: el reloj de `r` en el km `k` | `startDs[r] + kmClockDs[r][k]` | reloj de carrera; la última entrada, la llegada |
| crono: el paso de `r` por el control `c` | `startDs[r] + checkClockDs[r][c]` | la tele lo ve pasar; con el tiempo exacto del motor (9-b) |
| llegadas, resultado, acta, clasificaciones de después, noticias | nunca en un tramo: solo `POST …/broadcast/finish` (I-15) | D-06 |
| recorrido, reparto servido, tiempo, ritmo, `estimateS`, calendario de fotos, preparación de la crono (`BroadcastHead.tt`) | siempre, en la cabecera | son recorrido y previa, no carrera |

El borde de la meta, `finishDs`, es en línea la última marca de la cabeza (su paso por el último bloque, que lleva marca por `TIMELINE.lastKmMarkBlocks`) y en crono la última llegada, `máx(startDs[r] + kmClockDs[r].at(−1))` (4-w): nada con visibilidad ≥ `finishDs` va en un tramo, y el tramo que lo toca lleva `atFinish: true`, que solo dice lo que ya dicen los km a meta. En crono no es la llegada del último en salir: el motor cierra la crono con la última llegada (`lastHome`, `timetrial.ts` l. 495, y `stage_win_itt` y `tt_catches` a su hora, l. 596 y 614), y en 30 de 154 corridas (las 77 cronos del calendario fuera de los nacionales, semillas 0 y 1) alguien llega después que el último en salir, hasta 281 s después (`race-ain` e2, semilla 1; `rcod/n/ws/ttborde.mjs`). Con aquel borde, ese corredor seguiría en ruta cuando la pantalla pide la meta.

```ts
// packages/shared/src/broadcast/cut.ts
import type { BroadcastChunk } from './wire.js'
import type { Block, Ds, RaceS, TimelineCore } from './timeline.js'

export interface TimelineVisibility {
  readonly groupBornDs: readonly Ds[]             // por GroupIx
  readonly groupDiedDs: readonly (Ds | null)[]    // por GroupIx; null si llega a meta
  readonly stateEventDs: readonly Ds[]            // por índice de stateEvents; en un `clock`, la menor de sus marcas (cada marca se corta sola)
  readonly eventDs: readonly Ds[]                 // por índice de events: toDs(revealS)
  readonly bannerDs: readonly Ds[]                // por índice de banners
  readonly detailDs: ReadonlyMap<Block, readonly Ds[]> // por bloque de foto, fila a fila
  readonly ttKmDs: readonly (readonly Ds[])[] | null   // crono: por RiderIx y km, startDs + kmClockDs
  readonly ttCheckDs: readonly (readonly Ds[])[] | null // crono: por RiderIx y control, startDs + checkClockDs (9-b)
  readonly finishDs: Ds                           // el borde de la meta
}
export function visibilityOf(tl: TimelineCore): TimelineVisibility
/** La línea con solo lo visible hasta toS (B9). Pura e idempotente: cutTimeline(cutTimeline(tl, T), T) = cutTimeline(tl, T). */
export function cutTimeline(tl: TimelineCore, toS: RaceS): TimelineCore
/** El tramo (fromDs, toDs]: los datos con visibilidad en ese intervalo y < finishDs, en el formato plano de §4.11. La voz la añade la ruta (§14.3). */
export function chunkOf(tl: TimelineCore, fromDs: Ds, toDs: Ds): Omit<BroadcastChunk, 'lines'>
```

```
cutTimeline(tl, toS):
  T ← toDs(toS);  vis ← visibilityOf(tl)
  groups       ← el prefijo de tl.groups con groupBornDs ≤ T (es prefijo por 4-a); en cada uno, si groupDiedDs > T: diedB ← null, successor ← null
  stateEvents  ← los de stateEventDs ≤ T; en un `clock`, solo sus marcas ≤ T
  events       ← los de vis.eventDs ≤ T;  banners ← los de vis.bannerDs ≤ T;  detail ← las filas con su marca ≤ T
  keys         ← []                     una foto clave lleva pertenencias que aún no se ven
  tt           ← kmClockDs[r] cortado a sus entradas con startDs[r] + reloj ≤ T, y checkClockDs[r] igual; mishaps con su suceso revelado; startDs entero
  lo demás (format, engineVersion, dx, blocks, lengthKm, timeTrial, clock, riderIds, profile) igual
```

Todo el corte va por `Ds`, con el mismo `toDs` que `chunkOf`: un suceso se compara por `vis.eventDs`, no por su `revealS` en coma flotante. Por eso el adaptador de la radio redondea a décimas los `revealS` que calcula sobre el reloj estimado (`toDs(revealS) / 10`) al construir la línea, como la línea grabada (§4.3, §3.8); sin eso, B9 (§16.4) fallaría por redondeo con un suceso del adaptador cuyo `revealS` cayera entre `to / 10` y `to / 10 + 0,05` s. `chunkOf` es el mismo filtro con dos bordes, `fromDs < vis ≤ toDs` y `vis < finishDs`, con los grupos nacidos en el tramo en `groupsBorn` y, en crono, los pasos por control en `tt.checks`; lo que la web junta tramo a tramo es exactamente `cutTimeline(tl, lo servido)`. La propiedad sellada (B9, I-10), para todo `T` anterior a `finishDs`: `instantAt(cutTimeline(tl, T), T, ctx) = instantAt(tl, T, ctx)`; todo dato de un tramo tiene visibilidad en su intervalo; la unión de los tramos `(0, T]` es `cutTimeline(tl, T)`; y el ritmo no depende de los sucesos (`paceAt` y `playbackEstimateS` no reciben la línea, §8.2). Los tramos son por reloj de carrera y no por espacio porque un grupo a 5 min pasa por el final de un tramo de km 5 min después que la cabeza (`group.ts` l. 121-124): un tramo por km entregaría su futuro (D-06, O-20).

### 4.7 Cuándo se enseña cada suceso

El `tS` de un suceso no significa lo mismo en todas las plantillas: el 48 % lleva el reloj de un bloque antes que la foto y siete casos llevan una fecha trucada (mapa 01 §1.2; `estado.md` §1, punto 3, medido sobre 1.815 sucesos). `revealS` los fecha al grabar, sin tocar el motor (D-05, I-06, I-20): con el bloque en que el motor los emitió (`bEmit`, sonda `onEvent`) y el reloj de quien protagoniza. La tabla de D-05, entera, con el caso del mapa 01 §1.2 que resuelve cada fila:

| Plantillas | Regla | `revealS` | Caso |
| --- | --- | --- | --- |
| por defecto, y toda plantilla desconocida (R23.8 traerá `card_changed`, [DOC 3]) | `emit` | el reloj del grupo de su primer protagonista (o de la cabeza, si no tiene) al final de `bEmit` | |
| `breakaway_formed`, `break_cooperation` | `emit` | igual, con su `bEmit`: el bloque en que el hueco pasó de `tacticBreakGapSeconds` (45 s) sobre el grupo de ORIGEN, no `bornKm`/`bornTs` (`simulate.ts` l. 8693, 8708, 8727-8733) | (a) |
| `rider_defies_team` | `next_emit` | el `bEmit` del siguiente suceso de su protagonista (`announceRebels` lo inserta al cerrar, `simulate.ts` l. 9081) | (b) |
| `climb_kom`, `sprint_intermediate` | `banner` | el `revealS` de su `BannerResult`: el reloj del grupo del primero que puntúa, no `groups[0].tS` (`simulate.ts` l. 9287 y 9310) | (f) |
| `peloton_concedes` | `emit` | por defecto (ya va en `máx(km, breakFormedKm)`, l. 4814) | (g) |
| crono: `puncture`, `mechanical` | `tt_own_clock` | `startS` del corredor más su reloj propio en el km del suceso, de la traza (`timetrial.ts` l. 306-329; 4-f) | (e) |
| crono: el resto de `tt_*` | `tt_race_clock` | su `tS`, que ya es reloj de carrera (`clockAt`, `timetrial.ts` l. 78-80; `bestChain`, l. 146) | |
| `crash` (caída sintetizada de `incidents`, D-13) | `incident` | el reloj en su bloque del grupo en que iba el caído al final del bloque anterior: el motor lo saca de ese grupo en el mismo bloque (`dropOut`, `simulate.ts` l. 8291) | |
| `puncture`, `mechanical` (carretera) | `incident` | igual, con `máx(tS, …)`: si la pérdida pasa de `driftDropGapSeconds`, el motor también lo saca de su grupo en ese bloque (l. 8471) | |
| `bunch_sprint`, `final_km`, `stage_win`, `stage_win_itt`, `tt_last_home`, `tt_catches`, `time_cut`, `time_cut_readmitted` | `finish` | NUNCA en un tramo: `máx(finishS, tS)`, que los manda al paquete de meta (`tt_catches` lleva la hora de la última llegada, l. 596, que es el borde de la crono) | (c), (d) |

Con esto quedan resueltas las dos fechas discutidas (X-15): la (f) no queda bien revelada por su `tS`, como decía `ingeniero.md` §1.3 (C9), y la (a) no se sabe cuando el hueco al `mainGroup` pasa de 45 s, como decía `datos.md` §3.4, sino sobre el grupo de origen (C10); `bEmit` da las dos exactas. Los días de baja de una caída no se enseñan nunca en la retransmisión: van en la noticia `injury`, atada a su etapa y velada con ella (D-13). En carretera, la regla nunca adelanta el suceso a su propio `tS` (decisión 4-g): se toma `máx(tS, regla)`, porque el primer protagonista no es siempre el grupo que actúa (`peloton_concedes` lo protagoniza la fuga y lleva el reloj del pelotón, 199 s después según `estado.md` §1, punto 3). En crono no, porque el `tS` de un pinchazo es reloj propio y no de carrera.

```ts
// packages/shared/src/broadcast/reveal.ts
import type { BannerResult, Block, GroupIx, RaceS, RiderIx } from './timeline.js'

export type RevealRule = 'emit' | 'next_emit' | 'banner' | 'incident' | 'finish' | 'tt_race_clock' | 'tt_own_clock'

/** En carretera, por plantilla; lo que no esté aquí es 'emit'. B7 exige que toda plantilla que emite el motor tenga fila de voz, de acta y de CUE_OF_TEMPLATE. */
export const REVEAL_RULES: Readonly<Record<string, RevealRule>> = {
  breakaway_formed: 'emit', break_cooperation: 'emit', peloton_concedes: 'emit',
  rider_defies_team: 'next_emit',
  climb_kom: 'banner', sprint_intermediate: 'banner',
  crash: 'incident', puncture: 'incident', mechanical: 'incident',
  bunch_sprint: 'finish', final_km: 'finish', stage_win: 'finish', time_cut: 'finish', time_cut_readmitted: 'finish',
}
/** En crono, por plantilla; lo que no esté aquí es 'tt_race_clock'. */
export const TT_REVEAL_RULES: Readonly<Record<string, RevealRule>> = {
  puncture: 'tt_own_clock', mechanical: 'tt_own_clock',
  stage_win_itt: 'finish', tt_last_home: 'finish', tt_catches: 'finish', time_cut: 'finish', time_cut_readmitted: 'finish',
}

/** Lo que revealSOf necesita de la etapa: el grabador la tiene entera al cerrar (§5.4). RaceEvent (types.ts l. 330-337) cabe en RevealInput. */
export interface RevealInput { readonly plantilla: string; readonly km: number; readonly tS: RaceS; readonly protagonistas: readonly string[] }
export interface RecorderView {
  readonly timeTrial: boolean
  readonly finishS: RaceS                                          // el borde de la meta (§4.6)
  readonly riderIx: (riderId: string) => RiderIx | null
  readonly blockOfKm: (km: number) => Block                        // simulate.ts l. 1946-1948
  readonly groupAt: (rider: RiderIx, b: Block) => GroupIx | null   // su grupo al final de b; con b = −1, el de salida (0, fotoDeSalida, §4.4); null si ya no corría
  readonly clockAt: (g: GroupIx, b: Block) => RaceS | null         // relojEn (§4.4) sobre la línea entera; null si g no vivía en b
  readonly headClockAt: (b: Block) => RaceS                        // la menor marca en b, con máximo acumulado (C3)
  readonly bannerAt: (kind: BannerResult['kind'], km: number) => BannerResult | null // la pancarta de ese tipo a menos de un bloque de km
  readonly nextEmitOf: (rider: RiderIx, afterSource: number) => Block | null        // el bEmit de su siguiente suceso
  readonly ttStartS: (rider: RiderIx) => RaceS
  readonly ttOwnClockAt: (rider: RiderIx, km: number) => RaceS     // de la traza, interpolado entre km enteros
}
export function revealSOf(e: RevealInput, source: number, bEmit: Block, tl: RecorderView): RaceS
```

```
revealSOf(e, source, bEmit, v):
  regla ← v.timeTrial ? (TT_REVEAL_RULES[e.plantilla] ?? 'tt_race_clock') : (REVEAL_RULES[e.plantilla] ?? 'emit')
  r0 ← v.riderIx(e.protagonistas[0]) si lo hay, si no null
  emit(b) ← g ← (r0 ≠ null ? v.groupAt(r0, b) : null);  g ≠ null y v.clockAt(g, b) ≠ null ? v.clockAt(g, b) : v.headClockAt(b)
  según regla:
    'emit'           → máx(e.tS, emit(bEmit))
    'next_emit'      → máx(e.tS, emit(r0 ≠ null ? v.nextEmitOf(r0, source) ?? bEmit : bEmit))
    'banner'         → máx(e.tS, v.bannerAt(e.plantilla = 'climb_kom' ? 'cima' : 'meta_volante', e.km)?.revealS ?? emit(bEmit))
    'incident'       → b ← v.blockOfKm(e.km);  g ← (r0 ≠ null ? v.groupAt(r0, b − 1) : null)     el grupo en que iba (4-v)
                       máx(e.tS, g ≠ null ? (v.clockAt(g, b) ?? v.clockAt(g, b − 1) ?? v.headClockAt(b)) : v.headClockAt(b))
                       (b − 1 si su grupo murió en b: iba solo). La caída sintetizada entra con tS 0 y se graba con tS = revealS
    'finish'         → máx(v.finishS, e.tS)
    'tt_race_clock'  → e.tS
    'tt_own_clock'   → v.ttStartS(r0) + v.ttOwnClockAt(r0, e.km)
```

`revealSOf` recibe `source` porque `next_emit` necesita saber qué suceso es para buscar el siguiente del mismo corredor, y `RaceEvent` no lleva índice. La regla `incident` toma el grupo del protagonista al final del bloque ANTERIOR (decisión 4-v): el motor saca al caído de su grupo en el mismo bloque de la caída (`alSuelo` apunta el incidente y llama a `dropOut`, `simulate.ts` l. 8266-8291), y al final de ese bloque ya va en un grupo nuevo, detrás, con el reloj del que dejó más lo perdido. Con el grupo del final del bloque, el prototipo del grabador (`l3/grabador.mjs`, 627 caídas de 13 etapas por 3 semillas) sacaba `CRASH` 70,6 s de carrera tarde de mediana (p90 136 s, máximo 290 s), cuando ya había pasado el grupo en que iba el caído; y los pinchazos y averías de carretera, que caían en `emit` con el mismo defecto (su `tS` es el reloj del grupo que deja, l. 8475), 141,6 s (p90 329, máximo 373). Es el grupo con el que §5.4 junta un montón de caídas en un solo suceso. La plantilla que el motor estrene y nadie haya decidido cae en `emit`, que es la regla sin excepciones de lo que se sabe al pasar el grupo; B7 la hace fallar hasta que tenga voz, acta y destino en `CUE_OF_TEMPLATE` (§6.6).

### 4.8 El rótulo y los maillots

El maillot LLEVADO (uno, el que se ve) no es lo mismo que las DISTINCIONES (varias, en el rótulo) (mapa 06 §2.3). La regla UCI que los calcula, `wornJerseys` y `distinctions`, es §7.2; la fuente de títulos, §7.4; la notoriedad, §7.5. `JerseyKind` no crece: sigue siendo `'gc' | 'points' | 'kom'` (`jerseys.ts` l. 19), lo sellan `leaderJerseys.test.tsx` y todo `Record<JerseyKind, …>` (`JERSEY_LABEL`, l. 133-137).

```ts
// packages/shared/src/jerseys.ts (se amplía; lo de hoy, l. 1-137, no cambia)
import type { RiderIx, StageRef } from './broadcast/timeline.js' // import type: ciclo solo de tipos

/** Un título de campeón (§7.4). Lo deriva hoy E2 de palmares; E12 lo dará de su tabla detrás de la misma interfaz (D-25, D-62). */
export interface ChampionTitle {
  readonly scope: 'world' | 'continental' | 'national' // hoy solo 'national': no hay Mundial ni continentales en el calendario (mapa 04 §4)
  readonly country: string | null        // ISO-2 en mayúsculas, como riders.country; el id de carrera la lleva en minúsculas (`nc-it-road`, calendar.ts l. 3654); null en el del mundo
  readonly discipline: 'road' | 'itt'
  readonly category: 'elite' | 'u23'     // de la carrera que lo dio (`championshipCategory`, calendar.ts l. 3648)
  readonly season: number
  readonly validFromDay: number          // día de juego absoluto del campeonato (palmares.game_day)
  readonly validToDay: number            // el de la edición siguiente, o validFromDay + DAYS_PER_SEASON (364, time.ts l. 8)
  readonly source: StageRef              // la etapa que lo dio: si está velada para el espectador, el título no viaja (B13)
  readonly provisional: boolean          // true mientras lo derive E2 de palmares
}
/** EL maillot que se ve. Se graba en CastRider.worn al correr la etapa (D-15, D-24). */
export type WornJersey =
  | { readonly kind: 'leader'; readonly jersey: JerseyKind; readonly delegated: boolean; readonly from: StageRef } // delegated: no es el primero de su tabla; from: la N−1
  | { readonly kind: 'champion'; readonly title: ChampionTitle }  // su título vigente de la disciplina y la categoría del día (1.3.063, 1.3.068)
  | { readonly kind: 'team' }                                      // la equipación de su equipo del día (CastTeam.jerseySeed)
/** Lo que el rótulo dice además, como mucho BROADCAST.cardLinesMax (3), en este orden (§7.2). Cada una con su procedencia. */
export type Distinction =
  | { readonly kind: 'leads'; readonly jersey: JerseyKind; readonly from: StageRef }                         // lidera sin llevarlo: `Also leads the mountains` (pantalla)
  | { readonly kind: 'wears_for'; readonly jersey: JerseyKind; readonly rank: number; readonly from: StageRef } // lo lleva delegado: `Points jersey (2nd in the classification)`
  | { readonly kind: 'champion'; readonly title: ChampionTitle }                                             // un título que no lleva puesto
  | { readonly kind: 'gc'; readonly rank: number; readonly deficitS: number; readonly from: StageRef }        // puesto de salida ≤ BROADCAST.gcLineTop (20) y no líder: `14th overall +4:02`
  | { readonly kind: 'stage_wins'; readonly stages: readonly StageRef[] }                                    // etapas ganadas en ESTA carrera hasta la N−1
/** La entrada de wornJerseys: todo de SALIDA, es decir, de tras la N−1. */
export interface WornInput {
  readonly firstDay: boolean            // etapa 1 de vuelta o carrera de un día: nadie lleva maillot de líder (UCI 2.6.018; hoy NO_LEADERS, routes/races.ts l. 468-469)
  readonly discipline: 'road' | 'itt'   // 'itt' si la etapa es crono (input.timeTrial)
  readonly category: 'elite' | 'u23'    // la de la carrera (championshipCategory ?? 'elite')
  readonly standings: JerseyInput       // general, puntos y montaña de salida (l. 51-58), como las arma buildTimelineCast (7-b): gcRows y, en puntos y montaña, solo las filas con más de cero puntos, como la API y el acta; no la lista del tick de stageRun.ts l. 551-557
  readonly standingsFrom: StageRef | null // la N−1; null el primer día
  readonly titles: ReadonlyMap<string, readonly ChampionTitle[]> // riderId → títulos vigentes el día de la etapa (palmaresTitleSource.titlesOn, §7.4)
}
/** El orden de la frase del comentarista, de menor a mayor (D-26, §7.5): 0 lleva el maillot de la general … 8 el resto. */
export type NotorietyLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
/** EL RÓTULO SERVIDO, ya pasado por el velo del espectador (D-15, B13). Se deriva al servir la cabecera de CastRider y los nombres. */
export interface RiderCard {
  readonly ix: RiderIx
  readonly id: string                    // riderId
  readonly name: string                  // riders.name, resuelto al leer
  readonly bib: number | null
  readonly country: string               // ISO-2 en mayúsculas
  readonly gender: 'M' | 'F'             // CastRider.gender (`Gender`, rider.ts l. 159-160): la concordancia de E10 se hace en la web, que recibe esto y no el reparto (D-62)
  readonly team: { readonly id: string; readonly name: string; readonly jerseySeed: string } | null // el equipo CON EL QUE CORRIÓ y su equipación de ese día; el nombre, el de hoy: lo da NameResolver.team al servir, porque CastTeam no lo guarda (§7.8)
  readonly worn: WornJersey              // degradado: un `leader` cuyo `from` está velado pasa a { kind: 'team' }
  readonly lines: readonly Distinction[] // como mucho cardLinesMax; sin las de `from` velado
  readonly notoriety: NotorietyLevel     // staticNotoriety (§7.5) al servir, tras el velo y el corte, con lo que el espectador conoce; notorietyOf(card, instant) lo ajusta durante la carrera
  readonly own: boolean                  // del espectador o de su equipo (R23.7)
}
```

`ChampionTitle` lleva `source` y no una fecha suelta porque el velo corta por etapa: el campeonato nacional que el espectador sigue y no ha visto no puede ponerle a nadie un maillot de campeón en la etapa de mañana (D-37). `WornJersey` es una unión cerrada de tres casos y no un `JerseyKind` ampliado para que ni `JERSEY_LABEL` ni los `Record<JerseyKind, …>` de hoy cambien; el maillot joven, si la táctica lo crea (`tactica.md` l. 6966), sería un cuarto valor de `JerseyKind` en el puesto «others» de 2.6.018, y el compilador obligaría a tratarlo en cada `Record` (D-24); E2 no lo crea. El dorsal amarillo del equipo líder (`leadingTeam`, `jerseys.ts` l. 116-118) no es un maillot y no entra (DD-13).

### 4.9 La pantalla

Lo eventual (D-17, D-21): la cola de rótulos por clase, que nunca frena la carrera. `CUE_CLASS`, `CUE_OF_TEMPLATE` (las 54 plantillas del motor más `crash`) y `cuesBetween` son §6.5 y §6.6; aquí, los tipos. Todo `Cue` se deriva al leer, en la web: del paso de un instante al siguiente y de los sucesos revelados entre los dos (`cuesBetween`), o lo programa el reproductor cuando depende del espectador, del recorrido o del reloj de pared (decisión 6-i, §6.5). Los tres de la crono (`tt_start_order`, `tt_split`, `tt_finish`; 9-d, 4-u) salen del plan público y del paso de un `TimeTrialInstant` al siguiente (§9.5), y sus plantillas del motor siguen yendo solo a la voz (§6.6).

```ts
// packages/shared/src/broadcast/timeline.ts (sigue a §4.2). CueClass se declara aquí y no en cues.ts, porque la importan constants.ts,
// cues.ts y el reproductor, y el tipo nace en el PR 2 antes que la cola (decisión 17-z).
/** Importancia de un rótulo (D-21): 3 meta, caza de la fuga, corte, cambio de líder virtual, caída, descolgado o abandono de un maillot o
 *  de un top BROADCAST.cueTopStart (5) de salida (6-g); 2 ataque, fuga, su frase, pancarta, caída, llama roja, fuera de control y la
 *  ronda de la moto, reservada (6-m); 1 diferencias, grupo cambiado, percance, rótulo de corredor; 0 ficha del puerto, la ronda ON COURSE
 *  de la crono (9-k) y datos. Dura cueHoldS[clase] s de pared sin parar el reloj (la ronda de la moto, cueHoldS[0]). */
export type CueClass = 0 | 1 | 2 | 3
```

```ts
// packages/shared/src/broadcast/cues.ts
import type { ChronicleEntry } from '../contracts.js' // l. 1262-1276: la entrada de la crónica, sin texto redactado
import type { JerseyKind } from '../jerseys.js'
import type { Instant, VirtualGcRow } from './instant.js' // Instant, para aheadOfPeloton (§6.7)
import type { CueClass, GroupIx, RaceS, RiderIx } from './timeline.js'

/** Por qué sale un rótulo de corredor (uno a la vez, mapa 06 §5.3); los cinco los programa el reproductor (§6.5). No hay contexto
 *  'attack': el rótulo ATTACK lleva la ficha del primer atacante y no se programa un rider aparte (6-p); ni 'dropped': el descolgado
 *  es su propio Cue (DROPPED, de clase 1, o 3 con un maillot o un top cueTopStart, 6-g) y un rider aparte lo repetiría. */
export type RiderCueContext = 'break_round' | 'banner' | 'focus' | 'own' | 'tt_round' // tt_round: la ronda ON COURSE de la crono, de clase 0 (§9.5, 9-k)
/** Una fila del cuadro de diferencias generales (`gapsTableEveryRealS`). */
export interface TimeCheckRow { // number: el de carretera en t; gapS: GroupNow.gap.toHeadS; names: los que se nombran (§7.7), null si el grupo solo se cuenta
  readonly number: number; readonly group: GroupIx; readonly size: number; readonly gapS: number; readonly jerseys: readonly JerseyKind[]; readonly names: readonly RiderIx[] | null
}
export type Cue =
  | { readonly kind: 'attack'; readonly t: RaceS; readonly riders: readonly RiderIx[]; readonly fromGroup: GroupIx }        // attack_sticks
  | { readonly kind: 'break_formed'; readonly t: RaceS; readonly group: GroupIx; readonly riders: readonly RiderIx[]; readonly gapS: number } // breakaway_formed
  | { readonly kind: 'break_presented'; readonly t: RaceS; readonly group: GroupIx; readonly named: readonly RiderIx[]; readonly others: number } // la frase de la fuga (breakHeadline, §7.6)
  | { readonly kind: 'rider'; readonly t: RaceS; readonly rider: RiderIx; readonly context: RiderCueContext }
  | { readonly kind: 'time_check'; readonly t: RaceS; readonly rows: readonly TimeCheckRow[] }
  | { readonly kind: 'group_changed'; readonly t: RaceS; readonly group: GroupIx; readonly gained: readonly RiderIx[]; readonly lost: readonly RiderIx[] }
  | { readonly kind: 'split'; readonly t: RaceS; readonly parts: readonly GroupIx[]; readonly cause: string | null } // peloton_split, echelon_split; cause = datos.causa (caida, viento, sector, puerto, caza)
  | { readonly kind: 'caught'; readonly t: RaceS; readonly caught: GroupIx; readonly by: GroupIx; readonly toGoKm: number }
  | { readonly kind: 'climb_ahead' | 'banner_result'; readonly t: RaceS; readonly banner: number } // climb_ahead: índice en profile.climbs; banner_result: índice en Instant.banners
  | { readonly kind: 'crash'; readonly t: RaceS; readonly group: GroupIx; readonly riders: readonly RiderIx[] | null } // null primero; los nombres, crashNamesDelayS (3) después
  | { readonly kind: 'mishap'; readonly t: RaceS; readonly rider: RiderIx; readonly mishap: 'pinchazo' | 'averia'; readonly lostS: number }
  | { readonly kind: 'dropped' | 'abandon'; readonly t: RaceS; readonly rider: RiderIx; readonly gapS: number | null }
  | { readonly kind: 'virtual_gc'; readonly t: RaceS; readonly rows: readonly VirtualGcRow[] }
  | { readonly kind: 'last_km'; readonly t: RaceS; readonly leadGapS: number | null } // FLAMME ROUGE; null si van juntos
  | { readonly kind: 'finish' | 'group_finish' | 'time_cut'; readonly t: RaceS; readonly finishIx: number } // solo tras BroadcastFinish: índice en arrivals (time_cut: el primer grupo fuera de control)
  // LA CRONO (§9.5, 9-d). tt_start_order: en t = 0, del plan público: la regla y el intervalo de BroadcastHead.tt y cuántos salen (startState.racingAtStart)
  | { readonly kind: 'tt_start_order'; readonly t: RaceS }
  // tt_split, al pasar r por el control check (índice en checksKm) a la hora t = (startDs[r] + checkClockDs[r][check]) / 10:
  // timeS = checkClockDs[r][check] / 10, segundos enteros como el splitS del motor; board = TimeTrialInstant.splits[check].board en t
  // (por tiempo y, a igualdad, por hora de paso); rank, su puesto en board; deltaS, timeS menos el mejor antes de su paso (negativo si
  // lo bate, null si pasa el primero)
  | { readonly kind: 'tt_split'; readonly t: RaceS; readonly check: number; readonly rider: RiderIx; readonly timeS: number; readonly rank: number; readonly deltaS: number | null; readonly board: readonly { readonly rider: RiderIx; readonly timeS: number }[] }
  // tt_finish, al llegar r en t = (startDs[r] + kmClockDs[r].at(−1)) / 10: timeS = kmClockDs[r].at(−1) / 10, el tiempoS de results (9-a);
  // rank entre los llegados en t; deltaS, timeS menos el del sillón antes de su llegada (null si llega el primero); hotSeat, se sienta
  // en el sillón (rank = 1: a igual segundo no lo quita, bestChain, timetrial.ts l. 128-158); prev, quien lo ocupaba (null si nadie)
  | { readonly kind: 'tt_finish'; readonly t: RaceS; readonly rider: RiderIx; readonly timeS: number; readonly rank: number; readonly deltaS: number | null; readonly hotSeat: boolean; readonly prev: RiderIx | null }
export type CueKind = Cue['kind']
/** El destino de una plantilla en CUE_OF_TEMPLATE (§6.6): un rótulo, solo la voz, o solo el acta. B7 exige que toda plantilla tenga uno. */
export type TemplateTarget = CueKind | 'voice_only' | 'report_only'
/** Una línea de la voz: la entrada de buildChronicle con live (§12.2) y la hora a la que se dice. La construye la API para cada tramo. */
export type LiveLine = ChronicleEntry & { readonly revealS: RaceS }
```

`Cue` lleva índices (`GroupIx`, `RiderIx`) y ninguna palabra: la palabra la pone el componente con el vocabulario de §6.3 y los textos de pantalla de §21.6 (F.3), que es lo que E10 necesita (D-62). `t` es la hora de carrera en que el rótulo se pudo saber (el `revealS` de su suceso o la hora del instante que lo produjo), así que un rótulo nunca precede a su hecho; `Next action` acelera hasta que entra en la cola el siguiente `Cue` de clase ≥ `BROADCAST.nextActionMinClass` (2) que no sea de la ronda de la moto (§8.5, 6-m), sin saber dónde está, porque el `Cue` solo existe cuando se ha revelado (D-20).

### 4.10 El horizonte y el velo

Lo que un espectador conoce de cada carrera en guardia, calculado en el servidor en cada petición y en un solo punto (D-28 a D-32; la semántica es §10). Tres de estos tipos viajan por la red y la web no puede importar `packages/db` (`apps/web/package.json` l. 13-23), así que viven en `shared` (decisión 4-k); el resto, en `packages/db/src/horizon.ts`.

```ts
// packages/shared/src/broadcast/wire.ts (los tres que viajan)
export type GuardReason = 'own_rider' | 'own_team' | 'follow' | 'headline' // por qué una carrera está en guardia (D-30)
export type SpoilerScope = 'guarded' | 'own_only' | 'off'                  // users.spoiler_scope (0045); por defecto 'guarded' (DD-01)
export type StageGate =                                                     // la puerta que sale en lugar de un resultado velado (D-37)
  | { readonly k: 'not_seen' }                                              // esta etapa no la conoce
  | { readonly k: 'previous_unseen'; readonly firstUnseen: number }         // la N+1 con la N (o antes) sin conocer: firstUnseen es la primera

// packages/db/src/horizon.ts (el resto, solo en el servidor)
import type { GuardReason, HealthState } from '@cyclingstar/shared' // SpoilerScope lo importa §10.6, que es quien lo usa (ViewerRow)

export type KnowledgeLetter = 'W' | 'S' | 'R' | 'A' | 'X' // vista en directo, en resumen o digest, revelada, arrastrada, caducada (D-28): una por etapa en race_watch.how
export interface VeiledStage { readonly raceKey: string; readonly stageDay: number; readonly gameDay: number; readonly reason: GuardReason } // gameDay: stage_timelines.game_day, o el calendario si no hay línea
export type HorizonKind = 'world' | 'anon' | 'viewer' // el del tick, la administración y los bancos; el visitante; un espectador
export interface Horizon {
  readonly kind: HorizonKind
  readonly userId: string | null                          // null en 'world' y 'anon'
  readonly readOnly: boolean                              // viene de la cookie cs_viewer sin sesión: no escribe progreso (D-34)
  readonly rev: string                                    // `${currentDay}.${users.horizon_rev}`: va en las claves de React Query (D-35)
  readonly knownThrough: ReadonlyMap<string, number>      // raceKey → k: lo conocido es el prefijo 1..k (D-28); solo carreras en guardia
  readonly veil: readonly VeiledStage[]                   // EL VELO: las etapas corridas que este espectador no conoce
  readonly watching: ReadonlyMap<string, { readonly stageDay: number; readonly reachedS: number }> // raceKey → la etapa a medias
}
/** Lo que las etapas veladas cambiaron en el mundo: lo que el mecanismo R resta (D-32). Una consulta por fuente, solo filas veladas. */
export interface VeilDelta {
  readonly points: ReadonlyMap<string, { readonly season: number; readonly window: number }> // riderId → rider_points de etapas veladas
  readonly money: ReadonlyMap<string, number>             // riderId → premios de transactions veladas (race_key, stage_day, 0046)
  readonly budget: ReadonlyMap<string, number>            // teamId → stage_team_results.prize velados (0046, D-41)
  readonly palmares: ReadonlySet<string>                  // ids de filas de palmares veladas
  readonly health: ReadonlyMap<string, { readonly health: HealthState; readonly untilDay: number | null }> // la salud de antes, de la noticia injury velada (prevHealth, prevUntilDay)
  readonly abandons: ReadonlySet<string>                  // `${raceKey}|${riderId}` con race_rosters.abandoned_day velado
  readonly raceDays: ReadonlyMap<string, readonly number[]> // riderId → días de juego de carrera velados (parte y aprendizaje, sup. H4 y X1)
}
export type Viewer = { readonly userId: string; readonly readOnly: boolean } | null // de la sesión, o de cs_viewer; null sin nada
export interface WorldRef { readonly worldId: string; readonly currentDay: number } // game_state (schema.ts l. 138-150)
```

`Horizon` no se serializa nunca; lo que viaja es `HorizonSummary` (4.11) y `Horizon.rev`. Es parámetro obligatorio y sin defecto de toda lectura de `packages/db` que toque una fuente de D-32, y el tick, la administración y los bancos pasan `worldHorizon` explícito, de modo que una llamada nueva no compila sin decidir (I-49). `knownThrough` y `veil` dicen lo mismo de dos formas porque las usan dos mecanismos: P corta por número de etapa (`throughStage`) y F y R filtran por `(raceKey, gameDay)` (`veilSql`, §10.6). `VeilDelta` es vacío cuando `veil` lo es, que es el caso de todo visitante y de todo jugador con `spoiler_scope = 'off'`.

### 4.11 La red y el contrato

Lo que viaja entre la API y la web (D-06, D-50, D-51; las rutas son §14.2). De la política de `contracts.ts` (l. 1-14) se conserva lo que dice de la red: objetos *strip*, y un campo nuevo no rompe la web. De una cosa se aparta a sabiendas (decisión 4-j): su cabecera (l. 4-5) manda derivar los tipos del esquema con `z.infer` y no declararlos a mano, y aquí se escriben a mano, con `readonly`, porque `z.infer` no da `readonly` y `.readonly()` de Zod 4 congela cada tramo con `Object.freeze`. Cada esquema se ata a su tipo en los dos sentidos. Con `satisfies z.ZodType<T>`, como `PublicRider` (`contracts.ts` l. 77; `RaceLeaders`, l. 431, usa una anotación, que además ensancha el tipo del esquema), que solo falla si al esquema le falta un campo obligatorio de `T` o se lo da de otro tipo: un campo de más compila (medido con tsc 5.9.3 y zod 4.4.3). Y con `WIRE_MATCH`, que exige con `SchemaMatches` (§4.3) que la salida de cada esquema de respuesta y su tipo sean asignables en los dos sentidos, en todos los niveles: un campo de más, una variante de más o un opcional donde el tipo pide un nulo no compilan (decisión 4-x).

```ts
// packages/shared/src/broadcast/timeline.ts (sigue): PaceZone se declara aquí y no en wire.ts, porque la importan constants.ts, pace.ts
// y wire.ts, y nace en el PR 2, antes que la red (decisión 17-z).
export interface PaceZone { readonly aboveKm: number; readonly x: number } // s de carrera por s de pared mientras quedan más de aboveKm (§8.2)
```

```ts
// packages/shared/src/broadcast/wire.ts (sigue)
import { z } from 'zod'
import { chronicleEntrySchema, genderSchema, jerseyKindSchema, newsItemSchema, preStageInfoSchema, stageGateSchema, stageKindSchema, stageReplaySchema, stageResultEntrySchema } from '../contracts.js'
// stageGateSchema, preStageInfoSchema, watchStateSchema y switchModeSchema se declaran en contracts.ts (§14.2); aquí se importan los
// dos que usa este fichero. contracts.ts no puede importar wire.ts, ni por reexportación (medido, 14-a). Sus tipos siguen aquí.
import type { NewsItem, PullMotive, StageKind, StageReplay, StageResultEntry } from '../contracts.js'
import type { JerseyKind, RiderCard } from '../jerseys.js'
import { distinctionSchema, profileStripSchema, stageWeatherSchema, wornJerseySchema, type SchemaMatches, type StoredTimelineV1 } from './codec.js' // 4-x
import { BROADCAST } from './constants.js'
import type { LiveLine } from './cues.js'
import type { Ds, GroupIx, GroupOrigin, MishapKind, PaceZone, ProfileStrip, RiderIx, StageWeather } from './timeline.js'

export type SwitchMode = 'off' | 'admins' | 'on' // BROADCAST_WATCH y SPOILER_MODE (§14.6), publicados en /health.features
export interface StartState {                     // la salida, tras la N−1, degradada por el velo como el reparto (B13)
  readonly leaders: { readonly gc: RiderIx | null; readonly points: RiderIx | null; readonly kom: RiderIx | null } // quién LLEVA cada maillot; todo null el primer día
  readonly gcTop: readonly { readonly rider: RiderIx; readonly rank: number; readonly gapS: number }[]           // los BROADCAST.virtualGcTop (10) primeros de salida
  readonly racingAtStart: number
}
export interface BroadcastHead {                  // GET …/broadcast: recorrido, reparto y salida; nada de la carrera
  readonly stage: { readonly raceKey: string; readonly raceId: string; readonly day: number; readonly name: string; readonly km: number; readonly kind: StageKind; readonly timeTrial: boolean; readonly label: string } // label: la del recorrido (stageHistory.ts l. 73-91)
  readonly profile: ProfileStrip
  readonly weather: StageWeather
  readonly cast: readonly RiderCard[]             // por RiderIx
  readonly startState: StartState
  readonly pace: readonly PaceZone[]
  readonly estimateS: number                      // playbackEstimateS: velocidades nominales, nunca las de la carrera (D-19)
  readonly clock: 'exact' | 'estimated'
  readonly source: 'timeline' | 'radio'           // línea grabada o adaptador de la radio (D-07)
  readonly preview: StagePreview
  readonly view: { readonly reachedS: number | null; readonly known: boolean } | null // null para el visitante
  readonly gate: StageGate | null
  // la preparación PÚBLICA de la crono (9-i, 4-u): TimeTrialTrace.order, intervalS y checksKm (§4.2), sin un solo reloj; null en línea
  // y con el adaptador (una crono sin línea abre en Report, §9.1). Con cast.length da el plan de ttPaceAt (§9.4), el cuadro Start order,
  // los controles de la previa (§9.7) y los saltos Last 20 starters y Last starter: la salida i sale en i · intervalS (startOrder.ts l. 154)
  readonly tt: { readonly order: 'gc' | 'bib'; readonly intervalS: number; readonly checksKm: readonly number[] } | null
  readonly tplRev: number                         // stage_timelines.tpl_rev: el TEMPLATE_REV del tick que la corrió (12-c); 0 con el adaptador. pickVariant elige con él (§12.7)
}
export type TimelineEventWire = StoredTimelineV1['events'][number] // la misma tupla que se guarda (I-17)
export interface BroadcastChunk {                 // GET …/broadcast/chunk: los datos con visibilidad en (fromDs, toDs], planos
  readonly fromDs: Ds
  readonly toDs: Ds
  readonly groupsBorn: readonly (readonly [GroupIx, string, GroupOrigin])[] // los nacidos en el tramo, por GroupIx
  readonly moves: readonly number[]               // tríos [b, rider, to + 1], b absoluto; to + 1 = 0 es out
  readonly main: readonly number[]                // pares [b, group + 1]
  readonly clocks: readonly number[]              // tríos [b, g, Ds]
  readonly mishaps: readonly number[]             // cuartetos [b, rider, MISHAP_CODE, lostDs]
  readonly details: readonly number[]             // registros [b, g, velocidad·10 o −1, pullingTotal, MISHAP_CODE o 0, lostDs, n, (rider, PULL_MOTIVE_CODE o 0, forRider o −1) × n]
  readonly events: readonly TimelineEventWire[]
  readonly lines: readonly LiveLine[]             // la voz del tramo, construida por la ruta (§12.2, §14.3)
  readonly banners: readonly number[]             // registros [BANNER_CODE, km·10, revealDs, n, (rider, points) × n]; cat y name, de profile.climbs (4-n)
  // crono: pares [rider, startDs]; tríos [rider, índice de km, kmClockDs[rider][k]] y [rider, índice de control, checkClockDs[rider][c]] (9-i),
  // relojes propios; cada uno viaja en el tramo donde cae su visibilidad (startDs, startDs + reloj; §4.6). null en línea
  readonly tt: { readonly starts: readonly number[]; readonly km: readonly number[]; readonly checks: readonly number[] } | null
  readonly atFinish: boolean                      // el tramo llega al borde de la meta: lo siguiente es POST …/finish
}
export interface BroadcastFinish {                // POST …/broadcast/finish: el paquete de meta (D-06, I-15). arrivals: FinishRecord.arrivals en huecos al primero;
  readonly arrivals: readonly { readonly gapS: number; readonly riders: readonly RiderIx[] }[] // result: con DNF y motivo como hoy (contracts.ts l. 1278-1306)
  readonly result: readonly StageResultEntry[]; readonly closing: StageClosing; readonly report: StageReport; readonly news: readonly NewsItem[] // news: las de esta etapa
  // los que se cayeron dentro de STAGE.truce.threeKmRuleKm de una etapa en que el motor aplica la regla y llegan con el tiempo de su
  // grupo: `same time (3 km rule)` (pantalla) en group_finish y en el cierre (6-o). Lo arma la ruta con threeKmRule del motor (§14.1)
  readonly threeKmRule: readonly RiderIx[]
}
export type StageReport = StageReplay             // el acta: el stageReplaySchema de hoy (contracts.ts l. 1482-1533), con watch y tplRev, que gana en §14.2 (12-c)
export interface StagePreview {                   // la previa: cuatro cuadros de BROADCAST.previewCardS (5) s (D-22, I-22)
  readonly route: ProfileStrip; readonly weather: StageWeather
  readonly jerseysInPlay: readonly { readonly jersey: JerseyKind; readonly holder: RiderIx; readonly threats: readonly RiderIx[] }[]
  readonly favourites: readonly { readonly rider: RiderIx; readonly why: 'gc' | 'sprint' | 'hills' | 'climb' | 'tt' | 'cobbles' }[]
}
export interface StageClosing {                   // el cierre (D-22, I-22)
  readonly podium: readonly RiderIx[]
  readonly gcAfter: readonly { readonly rider: RiderIx; readonly rank: number; readonly gapS: number; readonly move: number }[] // move: puestos ganados (+) o perdidos
  readonly jerseysTomorrow: readonly { readonly jersey: JerseyKind; readonly rider: RiderIx; readonly changed: boolean }[]
  readonly mostKmOutFront: { readonly rider: RiderIx; readonly km: number } | null // el mayor kmEnFuga (types.ts l. 549), un hecho (DD-14)
  readonly outOfRace: readonly { readonly rider: RiderIx; readonly reason: 'abandon' | 'time_cut' }[]
  readonly tomorrow: PreStageInfo | null
}
export interface HorizonSummary {                 // GET /api/me/horizon
  readonly rev: string; readonly scope: SpoilerScope
  readonly ready: readonly { readonly raceKey: string; readonly raceName: string; readonly stages: readonly number[]; readonly reason: GuardReason; readonly expiresOnDay: number }[]
  readonly watching: readonly { readonly raceKey: string; readonly stageDay: number; readonly reachedS: number; readonly toGoKm: number }[]
  readonly expiredSinceLastVisit: readonly string[] // raceKey
}
/** Lo ÚNICO que un título, un aviso o una miniatura saben de una etapa: por tipo no cabe un resultado (D-42, I-27). */
export interface PreStageInfo { readonly raceName: string; readonly season: number; readonly stageDay: number; readonly stageCount: number; readonly km: number; readonly label: string; readonly stageKind: StageKind }
export interface WatchState { // StageReplay.watch (D-50)
  readonly known: boolean; readonly reachedS: number | null; readonly gate: StageGate | null
  readonly seen: boolean   // true con W, S o R; false con A (arrastrada), que abre en Watch como la caducada (6-r, §6.10)
}

/** Los tres códigos numéricos de los tramos: tablas explícitas que solo crecen, atadas a su unión (4-m). 0 significa que no hay dato. */
export const MISHAP_CODE = { caida: 1, pinchazo: 2, averia: 3 } as const satisfies Record<MishapKind, number>
export const PULL_MOTIVE_CODE = {
  solo: 1, abanico: 2, tren: 3, fuga: 4, persecucion: 5, grupeto: 6, equipo_etapa: 7, equipo_maillot: 8,
  equipo_general: 9, rol: 10, propio: 11, equipo_puntos: 12, equipo_montana: 13, infiltrado: 14, colocando: 15,
} as const satisfies Record<PullMotive, number>
// BANNER_CODE (0 volante, 1 cima) es el del formato guardado (§4.3). Un código que la web no conozca se lee como null (como chronicle.ts l. 1306).
```

Los esquemas (se exportan los cuatro de las respuestas nuevas; los que comparte con el formato guardado vienen de `codec.ts`, 4-x):

```ts
const int = z.number().int()
const ints = z.array(int)
const ix = int.min(0)
const riderCardSchema = z.object({ ix, id: z.string(), name: z.string(), bib: int.nullable(), country: z.string().length(2), gender: genderSchema, team: z.object({ id: z.string(), name: z.string(), jerseySeed: z.string() }).nullable(), worn: wornJerseySchema, lines: z.array(distinctionSchema).max(BROADCAST.cardLinesMax), notoriety: z.literal([0, 1, 2, 3, 4, 5, 6, 7, 8]), own: z.boolean() }) satisfies z.ZodType<RiderCard>
const startStateSchema = z.object({ leaders: z.object({ gc: ix.nullable(), points: ix.nullable(), kom: ix.nullable() }), gcTop: z.array(z.object({ rider: ix, rank: int.min(1), gapS: z.number() })), racingAtStart: int }) satisfies z.ZodType<StartState>
const stagePreviewSchema = z.object({ route: profileStripSchema, weather: stageWeatherSchema, jerseysInPlay: z.array(z.object({ jersey: jerseyKindSchema, holder: ix, threats: z.array(ix) })), favourites: z.array(z.object({ rider: ix, why: z.enum(['gc', 'sprint', 'hills', 'climb', 'tt', 'cobbles']) })) }) satisfies z.ZodType<StagePreview>
const stageClosingSchema = z.object({
  podium: z.array(ix), gcAfter: z.array(z.object({ rider: ix, rank: int.min(1), gapS: z.number(), move: int })), jerseysTomorrow: z.array(z.object({ jersey: jerseyKindSchema, rider: ix, changed: z.boolean() })),
  mostKmOutFront: z.object({ rider: ix, km: z.number() }).nullable(), outOfRace: z.array(z.object({ rider: ix, reason: z.enum(['abandon', 'time_cut']) })), tomorrow: preStageInfoSchema.nullable(),
}) satisfies z.ZodType<StageClosing>
const liveLineSchema = chronicleEntrySchema.extend({ revealS: z.number() }) satisfies z.ZodType<LiveLine>
const timelineEventWireSchema = z.tuple([int, z.string(), int, int, int, int, z.array(ix), z.record(z.string(), z.union([z.number(), z.string()])).nullable()]) satisfies z.ZodType<TimelineEventWire>

export const broadcastHeadSchema = z.object({
  stage: z.object({ raceKey: z.string(), raceId: z.string(), day: int.min(1), name: z.string(), km: z.number(), kind: stageKindSchema, timeTrial: z.boolean(), label: z.string() }),
  profile: profileStripSchema, weather: stageWeatherSchema, cast: z.array(riderCardSchema), startState: startStateSchema, pace: z.array(z.object({ aboveKm: z.number(), x: z.number().positive() })).min(1),
  estimateS: z.number().min(0), clock: z.enum(['exact', 'estimated']), source: z.enum(['timeline', 'radio']), preview: stagePreviewSchema, view: z.object({ reachedS: z.number().nullable(), known: z.boolean() }).nullable(), gate: stageGateSchema.nullable(),
  tt: z.object({ order: z.enum(['gc', 'bib']), intervalS: int.min(1), checksKm: z.array(z.number()) }).nullable(), tplRev: int.min(0),
}) satisfies z.ZodType<BroadcastHead>
export const broadcastChunkSchema = z.object({
  fromDs: int, toDs: int, groupsBorn: z.array(z.tuple([ix, z.string(), z.enum(['start', 'attack', 'shed'])])), moves: ints, main: ints, clocks: ints, mishaps: ints, details: ints,
  events: z.array(timelineEventWireSchema), lines: z.array(liveLineSchema), banners: ints, tt: z.object({ starts: ints, km: ints, checks: ints }).nullable(), atFinish: z.boolean(),
}) satisfies z.ZodType<BroadcastChunk>
export const broadcastFinishSchema = z.object({ arrivals: z.array(z.object({ gapS: z.number().min(0), riders: z.array(ix) })), result: z.array(stageResultEntrySchema), closing: stageClosingSchema, report: stageReplaySchema, news: z.array(newsItemSchema), threeKmRule: z.array(ix) }) satisfies z.ZodType<BroadcastFinish>
export const horizonSummarySchema = z.object({
  rev: z.string(), scope: z.enum(['guarded', 'own_only', 'off']), expiredSinceLastVisit: z.array(z.string()),
  ready: z.array(z.object({ raceKey: z.string(), raceName: z.string(), stages: z.array(int.min(1)), reason: z.enum(['own_rider', 'own_team', 'follow', 'headline']), expiresOnDay: int })),
  watching: z.array(z.object({ raceKey: z.string(), stageDay: int.min(1), reachedS: z.number().min(0), toGoKm: z.number().min(0) })),
}) satisfies z.ZodType<HorizonSummary>
/** El otro sentido del atado (4-x): cada respuesta nueva, con su tipo, en todos los niveles. Solo lo lee el compilador. */
export const WIRE_MATCH = { head: true, chunk: true, finish: true, horizon: true } as const satisfies {
  head: SchemaMatches<typeof broadcastHeadSchema, BroadcastHead>; chunk: SchemaMatches<typeof broadcastChunkSchema, BroadcastChunk>
  finish: SchemaMatches<typeof broadcastFinishSchema, BroadcastFinish>; horizon: SchemaMatches<typeof horizonSummarySchema, HorizonSummary>
}
```

El formato de los tramos es de enteros planos (I-17): la línea por la red comprime y valida barato (medido por §18.1 sobre las líneas del prototipo del grabador, `l7/red.mjs`: la etapa entera, cabecera y tramos sin la meta, de 27,9 a 81,5 KB con gzip; un tramo, de 0,23 a 4,72 KB; y parse y Zod del tramo mayor, de 0,11 a 0,54 ms en Node, contra 2,8-9,3 más 4,1-24,9 ms de la etapa de hoy de una vez, mapa 07 §7). Los identificadores de grupo viajan una vez, al nacer (`groupsBorn`), y el reparto resuelto una vez, en la cabecera; los tramos llevan solo índices. Las pancartas no llevan `cat` ni `name` porque son recorrido y la web los casa con `profile.climbs` por km (4-n). `watchStateSchema` es el campo `watch` que gana `stageReplaySchema` (§14.1) y `switchModeSchema` el de `healthSchema.features` (§14.6); los dos se declaran en `contracts.ts` (14-a, §14.2), donde los usa `stageReplaySchema` y de donde lo toma `healthSchema` en `index.ts`, y sus tipos siguen en `wire.ts`: así `contracts.ts` sigue sin cargar nada de `broadcast/` y nadie los declara dos veces.

### 4.12 Las noticias

`news` guarda hoy `kind` y `text` ya redactado, sin `seed` ni `data` (`schema.ts` l. 792-811; `db/src/news.ts` l. 28-50), al revés que la crónica: el punto 5 del encargo. D-45 lo arregla con la primera migración de E2, antes del reinicio; los renders y la tabla de las once plantillas son §12.8.

```ts
// packages/shared/src/news.ts
import type { HealthState } from './rider.js' // l. 163-164

/** race_rosters.abandoned_reason (schema.ts l. 607); la misma unión que packages/db/src/stageRun.ts l. 1017, que pasa a importar esta (4-p). */
export type AbandonReason = 'colapso' | 'fuera_control' | 'lesion' | 'enfermedad' | 'voluntario'
interface OfRace { readonly raceId: string; readonly season: number } // la carrera como dato: la raceKey es `${raceId}:s${season}`; raceOfHeadline muere
/** Los DATOS de un titular: ids, códigos y números; nunca nombres ni inglés (D-45). Se graban en news.data (0043) con su seed. teamId: el equipo del DÍA del hecho. */
export type NewsPayload =
  | (OfRace & { readonly kind: 'stage_win' | 'tt_win' | 'breakaway_win'; readonly stageDay: number; readonly riderId: string; readonly teamId: string | null }) // stageRun.ts l. 1199-1217; breakaway_win exige que el ganador fuera en la fuga (hoy no, l. 1184-1186)
  | (OfRace & { readonly kind: 'one_day_win' | 'one_day_tt_win' | 'gc_win' | 'kom'; readonly stageDay: number; readonly riderId: string; readonly teamId: string | null }) // l. 1199-1258; stageDay: la etapa que lo cerró
  | (OfRace & { readonly kind: 'gc_lead_taken'; readonly stageDay: number; readonly riderId: string; readonly teamId: string | null }) // NUEVA: cambia el líder de la general (I-25)
  | (OfRace & { readonly kind: 'jersey_taken'; readonly stageDay: number; readonly riderId: string; readonly teamId: string | null; readonly jersey: 'points' | 'kom' }) // NUEVA: cambia el de puntos o montaña
  | (OfRace & { readonly kind: 'abandon'; readonly stageDay: number | null; readonly riderId: string; readonly teamId: string | null; readonly reason: AbandonReason }) // l. 1069-1080 y riderSchedule.ts l. 299; null: se retira entre etapas
  | (OfRace & { readonly kind: 'injury'; readonly stageDay: number; readonly riderId: string; readonly teamId: string | null; readonly days: number; readonly prevHealth: HealthState; readonly prevUntilDay: number | null }) // l. 1131-1138; prev*: la salud de antes, que applyIncidents conoce (l. 1117-1123), para la máscara de sup. P5
  | { readonly kind: 'contract'; readonly riderId: string; readonly toTeamId: string; readonly fromTeamId: string | null; readonly relocateCountry: string | null; readonly housingCovered: boolean } // db/src/contracts.ts l. 325-339; housingCovered: offer.payHousing (l. 328), que el titular solo dice con traslado (12-j)
  | { readonly kind: 'retirement'; readonly riderId: string; readonly teamId: string | null; readonly age: number } // rollover.ts l. 326-333
export type NewsKind = NewsPayload['kind'] // los once de hoy (world/news.ts l. 8-19) más gc_lead_taken y jersey_taken
/** Lo que una lista enseña en lugar de las noticias de una etapa velada: UNO por etapa, se escribiera una noticia o cinco (D-45, I-39). Solo en lectura. */
export interface StageReadyItem { readonly kind: 'stage_ready'; readonly raceId: string; readonly season: number; readonly stageDay: number; readonly gameDay: number }
/** Cómo resuelve un render los ids a texto, al LEER (D-46); E10 añadirá el idioma en cada punto de render. */
export interface NameResolver { rider(id: string): string; team(id: string): string; race(raceId: string): string; country(iso2: string): string }

// packages/shared/src/render/variants.ts
import type { NameResolver } from '../news.js' // import type: verbatimModuleSyntax (tsconfig.base.json) lo exige, y se borra al compilar

/** Una redacción y la revisión desde la que existe: pickVariant solo elige entre las de since ≤ rev (D-46), y añadir una no re-sortea el pasado. */
export interface Variant<D> { readonly since: number; readonly render: (d: D, n: NameResolver) => string }
```

`NewsPayload` es una unión discriminada por `kind` y no un `NewsData` de campos opcionales (`world/news.ts` l. 21-27) porque cada titular necesita campos distintos y el compilador tiene que obligar a darlos: `injury` sin `prevHealth` no compila, y la máscara de la salud (mecanismo M, D-32) no puede quedarse sin el estado previo. `stageDay` va en todo titular de carrera, también en los de un día (su etapa es la 1) y en `gc_win` y `kom` (la última), porque el velo corta por etapa (D-45). `OfRace` no se exporta: es la mitad común de las uniones y nadie la nombra fuera. El esquema `newsPayloadSchema` y los renders, en §12.8; el `newsItemSchema` que gana `payload`, `seed`, `tplRev`, `raceId`, `raceKey` y `stageDay`, en §14.2.

### 4.13 Dónde vive cada tipo

| Fichero | Tipos (y lo que otras secciones escriben en él) | Importa |
| --- | --- | --- |
| `packages/shared/src/broadcast/timeline.ts` | las unidades y los cuatro redondeos (4.1), toda la línea (4.2), `TimelineCore`; `CueClass` (4.9) y `PaceZone` (4.11), que se declaran aquí porque los importan `constants.ts`, `pace.ts`, `wire.ts`, `cues.ts` y el reproductor (17-z) | tipos de `contracts.ts` y `jerseys.ts` |
| `…/broadcast/codec.ts` | `StoredTimelineV1`, `ORIGIN_CODE`, `BANNER_CODE`, `TimelineFormatError`, `encodeTimeline`, `decodeTimeline`, `storedTimelineV1Schema`, `STORED_MATCH`, `SchemaMatches` y los seis esquemas que el formato comparte con la red (`stageRefSchema`, `championTitleSchema`, `wornJerseySchema`, `distinctionSchema`, `profileStripSchema`, `stageWeatherSchema`; 4-x) | `zod`, `contracts.ts`; tipos de `timeline.ts` y `jerseys.ts` |
| `…/broadcast/reduce.ts`, `cut.ts`, `reveal.ts` | `reducePhoto`, `photoAt`; `TimelineVisibility`, `visibilityOf`, `cutTimeline`, `chunkOf`; `RevealRule`, `REVEAL_RULES`, `TT_REVEAL_RULES`, `RevealInput`, `RecorderView`, `revealSOf` | `timeline.ts`; `cut.ts` el tipo de `wire.ts` |
| `…/broadcast/instant.ts`, `timeTrial.ts` | 4.5 entero, `photoBlocksOf`, `instantAt`, `groupRoleOf`, `groupLabelOf`, `mainGapOf` y `chaseRefOf`, exportada para el test de §15.5 (§6.2, §6.3); `GROUP_ROLES` e `isGroupRole` (§12.6); `timeTrialInstantAt` (§9.3) | `timeline.ts`, `reduce.ts`, `cut.ts`, `constants.ts`; tipos de `contracts.ts`, `jerseys.ts` y `wire.ts` |
| `…/broadcast/cues.ts` | 4.9 entero salvo `CueClass`; `CUE_CLASS`, `CUE_OF_TEMPLATE`, `cuesBetween`, `cueClassOf`, `isPresentation`, `aheadOfPeloton` (§6.5, §6.6, §6.7) | `constants.ts`; tipos de `contracts.ts`, `jerseys.ts`, `instant.ts` (`Instant`, `VirtualGcRow`), `timeline.ts` (`CueClass`, 17-z) y `wire.ts` |
| `…/broadcast/wire.ts` | `SwitchMode`, `GuardReason`, `SpoilerScope`, `StageGate` y 4.11 entero con sus esquemas y `WIRE_MATCH`, salvo cuatro esquemas que declara `contracts.ts` (`stageGateSchema`, `preStageInfoSchema`, `watchStateSchema` y `switchModeSchema`; este fichero importa los dos primeros, 14-a, §14.2) y los seis que comparte con el formato guardado, que importa de `codec.ts` (4-x); `WatchMode`, `watchModeSchema` y los esquemas de entrada y de error de las rutas nuevas (§14.2) | `zod`, `contracts.ts`, `codec.ts`, `constants.ts`; tipos de `jerseys.ts`, `cues.ts` y `timeline.ts` (con `PaceZone`, 17-z) |
| `…/broadcast/radio.ts` | `export interface RadioNames { readonly riderOf: ReadonlyMap<string, ChronicleRider> /* la forma de ChronicleNames, apps/api/src/chronicle.ts l. 193-195, que cabe en ella */; readonly own: ReadonlySet<RiderIx> /* los del espectador, nombrados siempre en su grupo (R23.7) */; readonly nameableAt: (km: number) => ReadonlySet<RiderIx> /* los nombrables en la foto de ese km: la política de §7.7 y, en una etapa conocida o con ?diag=1, además los diez primeros de la etapa */ }` (12-o) y `radioFromTimeline(tl: TimelineCore, names: RadioNames): RaceRadio` (§12.10) | `contracts.ts`, `timeline.ts`, `reduce.ts` |
| `…/broadcast/constants.ts`, `pace.ts`, `names.ts`, `pageTitle.ts` | `BROADCAST`, `SPOILER` (§15); `paceAt`, `playbackEstimateS` (§8.2); `GROUP_WORDS`, `breakHeadline` (§6.3, §7.6); `pageTitle`, `stageReadyNotice` (§11.8, §11.9) | `constants.ts`: tipos de `timeline.ts` (`CueClass`, `PaceZone`; 17-z) y `contracts.ts` (`StageKind`); `pace.ts`: `constants.ts` y tipos de `timeline.ts` y `contracts.ts` (no importa `cues.ts` ni `wire.ts`); `names.ts`, los de sus bloques de §6.3, §6.4, §7.1 y §7.7: `constants.ts` y tipos de `jerseys.ts`, `contracts.ts`, `news.ts` (`NameResolver`), `instant.ts` y `timeline.ts`; `pageTitle.ts`, los de §11.8 |
| `…/broadcast/index.ts` | reexporta los anteriores; `packages/shared/src/index.ts` (l. 8-17) gana `./broadcast/index.js`, `./news.js` y `./render/variants.js` | |
| `packages/shared/src/jerseys.ts` | 4.8 entero; `wornJerseys`, `distinctions`, `notorietyOf`, `staticNotoriety` (§7.2, §7.5); `isJerseyKind` (§12.6) | tipos de `broadcast/timeline.ts` |
| `packages/shared/src/news.ts`, `render/variants.ts` | 4.12 entero; `newsPayloadSchema`, `renderNews`, `NEWS_VARIANTS` (§12.8); `pickVariant`, `TEMPLATE_REV` (§12.7) | `news.ts`: `zod`, `rider.ts` y `render/variants.ts` (`pickVariant`, §12.8); `variants.ts`: el tipo `NameResolver` de `news.ts`, un ciclo solo de tipos |
| `packages/db/src/horizon.ts` | el resto de 4.10; `computeHorizon`, `veilDelta`, `veilSql`, `throughStage`, `isVeiled`, `worldHorizon` (§10.6) | `@cyclingstar/shared` |
| `packages/engine/src/sim/timeline.ts` | `I1Mismatch`, `SNAPSHOT_FIELDS`, `PROBE_HOOKS`, `CODES_MATCH`, `ORIGIN_OF_PREFIX`; `timelineRecorder`, `TimelineRecorder`, `RecorderFinishInput`, `selfCheckI1` (§5.4, §5.5) | `@cyclingstar/shared`, `../stage/types.js`, `./raceRadio.js` |

El grafo no cambia de forma: `shared` no importa nada de fuera (su única dependencia es `zod`, `packages/shared/package.json` l. 18-20); el motor ya importa `@cyclingstar/shared` (`packages/engine/package.json` l. 18-20; lo hacen `coachView.ts` l. 1 y `world/news.ts` l. 6, entre otros) y lo usa el grabador para los tipos, `reducePhoto`, `photoAt` y `revealSOf`; `packages/db` importa los dos y pone el gzip, porque el motor no importa Node (`eslint.config.js` l. 80-137); la web importa motor y `shared` pero no `packages/db` (`apps/web/package.json` l. 13-23). Comprobado con grep: ningún nombre que estos ficheros exportan choca con uno que `packages/shared/src/index.ts` ya reexporta, así que los `export *` no son ambiguos. Un cambio en `shared` no dispara los bancos (`ci.yml` l. 189 mira solo `^packages/engine/`) aunque cambie lo que el grabador escribe; por eso I1 e I3 corren también en la suite rápida (D-52, §15.5).

---

**Injertos aplicados.** I-01 (§4.2, §4.4, §4.5), I-02 (§4.4), I-03 (§4.2 `clock`, §4.4 `relojEn`, §4.6), I-06 (§4.2 `bEmit`, §4.7), I-10 (§4.6, §4.5), I-17 (§4.3, §4.11), I-20 (§4.7).

**Objeciones resueltas.** O-13 (§4.2: marcas en los cuatro sitios; §4.5: posición con cota de un km; `clock: 'estimated'` en §4.2 y §4.11, que B22 mide), O-14 (§4.3: códigos como cadena en lo guardado; §4.11: tablas explícitas en la red).

**Huecos rellenados.** H-13 (§4.3: `decodeTimeline` por `format` y la guarda con `satisfies`). Contradicciones de hecho que quedan resueltas: X-15 (§4.7) y X-23 (§4.3).

**Decisiones de esta sección.**
- 4-a. `GroupIx` numera por la hora de la marca de nacimiento (desempate por `bornB` e id), con `peloton` siempre 0; el grabador renumera al cerrar. Un corte por reloj deja así un prefijo del catálogo y el tramo reparte los nacidos sin huecos. Descartado: por bloque de nacimiento, que deja huecos al cortar.
- 4-b. `TimelineCore = Omit<StageTimeline, 'cast' | 'weather' | 'finish'>` es lo que reciben `photoAt`, `instantAt`, `visibilityOf` y `chunkOf` y lo que devuelve `cutTimeline`: la web arma su línea con cabecera y tramos y no tiene el reparto congelado, y un corte no puede llevar la meta por tipo (D-06). Toda llamada con una `StageTimeline` sigue compilando. Descartado: rellenar en la web un reparto y una meta falsos.
- 4-c. `instantAt(tl, t)` se define como el instante de `cutTimeline(tl, t)`: B9 es cierta por construcción y lo que prueba es que la implementación sin copias coincide con su definición.
- 4-d. Un `main` se ve en el primero de los dos cruces (el grupo que pierde el título y el que lo gana); D-06 no lo listaba. Descartado: la hora de la cabeza (`datos.md` §3.4), que anunciaría el corte de un pelotón minutos antes de que llegue al punto.
- 4-e. La composición de un grupo se toma en su bloque sin pintar y el km que se pinta es el máximo de lo pintado: I2 es exacta y la pantalla no retrocede (D-04).
- 4-f. Crono: la pérdida del percance entra solo en la última entrada de `kmClockDs` (meta), como en `results`; `mishaps[].km` es el del motor (hoy `finishKm / 2`) y el suceso se revela en `startS` más el reloj de la traza en ese km. El motor suma la pérdida después de la traza (`timetrial.ts` l. 312) y no tiene otro km. Descartado: repartir la pérdida desde `finishKm / 2`, que descuadraría los parciales de la traza contra los `tt_split` del motor (`timetrial.ts` l. 528-529, sin pérdida).
- 4-g. En carretera `revealS = máx(tS, regla)`; en crono no. `peloton_concedes` lo protagoniza la fuga y con la regla sola se revelaría 199 s antes de que el pelotón llegue al km.
- 4-h. El km de un suceso va en décimas (D-10) y es solo de pantalla; la voz y el acta leen el km original por `source` (medido, `l2/kmdecimas.mjs`: en décimas, `Math.round(km)` cambia en 300 de 3.000 centros de bloque; la semilla de D-46, en ninguno).
- 4-i. Más de 255 grupos no caben en la base64 de un byte: `encodeTimeline` lanza y el grabador lo trata como una autocomprobación fallida (D-12). Medido, como mucho 140. Descartado: dos bytes por corredor, que cambiaría D-10.
- 4-j. Los tipos de la red se escriben a mano, con `readonly`, y cada esquema se ata con `satisfies z.ZodType<T>` (`contracts.ts` l. 77; l. 431 es una anotación) y con `SchemaMatches` en el otro sentido (4-x): `.readonly()` de Zod 4 congela cada tramo con `Object.freeze` y `z.infer` sin él no da `readonly`. Se aparta a sabiendas de `contracts.ts` l. 4-5, que manda derivar los tipos con `z.infer`. Descartado: tipos solo por `z.infer`, como decía la cabecera de los tipos de la síntesis.
- 4-k. `GuardReason`, `SpoilerScope` y `StageGate` viven en `shared/src/broadcast/wire.ts` y no en `packages/db/src/horizon.ts`: viajan por la red y la web no importa `packages/db`.
- 4-l. `PreStageInfo` vive en `wire.ts` (viaja en `StageClosing.tomorrow`) y `pageTitle.ts` lo importa; `Variant` vive en `render/variants.ts`, con `pickVariant`.
- 4-m. En los tramos, los códigos son enteros de tablas explícitas que solo crecen (`MISHAP_CODE`, `PULL_MOTIVE_CODE`, `BANNER_CODE`), atadas con `satisfies Record<…>`; lo desconocido se lee como null. Lo guardado lleva cadenas (D-10); la red, enteros, porque el contrato que fijó la síntesis lleva listas de números (I-17). Descartado: el orden de `pullMotiveSchema` (O-14).
- 4-n. Las pancartas viajan sin `cat` ni `name`; la web los casa con `profile.climbs` por km.
- 4-o. `InstantContext` lleva los corredores del espectador, la salida servida y el calendario de fotos; `photoBlocksOf` copia `radioKmPoints` porque `shared` no importa el motor, y un test la ata (§15.5).
- 4-p. El `NewsKind` del motor deja de exportarse en `engine/src/index.ts` en el paso 4a, con `renderNews` y `NewsData`; `stageRun.ts` importa `AbandonReason` de `shared` y borra el suyo (l. 1017).
- 4-q. Histéresis del papel sin estado: el papel crudo en `t` se enseña si coincide con el de hace `roleHysteresisKm` de su marcha o si un `move` de más de un corredor tocó el grupo; si no, el de entonces. Descartado: recordar lo pintado, que haría depender `instantAt` de la historia de la pantalla.
- 4-r. Cambian tres firmas de las que fijó la síntesis (§21.6, F.2): `chunkOf` devuelve `Omit<BroadcastChunk, 'lines'>` (la voz la pone la ruta con `buildChronicle`, que vive en la API), `revealSOf` gana `source` (lo pide `next_emit`) y `cutTimeline` devuelve `TimelineCore`. La tabla de D-05 lleva además `crash` (`incident`) y `tt_last_home` (`finish`: llega antes del borde de la meta de una crono o en él, 4-w).
- 4-s. Un `mishap` de estado se ve con el `revealS` del suceso que lo cuenta, calculado al grabar: el corte es idempotente sin interpolar sobre una línea cortada.
- 4-t. El instante adopta las decisiones 3-a, 3-b, 3-c, 3-e y 3-f de §3, medidas por su redactor en 15 corridas (§3.3, §3.5): un grupo con una sola marca va a la velocidad de su origen (`originOf`); el que sale en dos grupos se pinta atrás y va también en tránsito; `InTransit` gana `gap`, el de su origen; un grupo que aún no ha cruzado un km de foto lleva el hueco de su origen; la salida se ve desde `t = 0`. La tendencia y la histéresis del papel siguen la cadena de `successor` (duda 6 de §3). Descartado lo que decía antes este borrador: la velocidad del grupo número 1 (p90 de 178 a 227 m en los recién nacidos de la e18 y Colombia, contra 54 a 154 m), el tránsito solo sin grupo (el salto de §3.6 no saldría nunca en tránsito) y la marca en `k_g` sin más (deja sin hueco al 1-4 % de los grupos).
- 4-u. Se escriben aquí, enteros y con su procedencia, los campos que pedían otras secciones y la síntesis dejó propuestos: `TimelineCast.favourites` (8-g), `TimeTrialTrace.checkClockDs` y `TimelineVisibility.ttCheckDs` (9-b), `BroadcastHead.tt` y `BroadcastChunk.tt.checks` (9-i), los `Cue` `tt_start_order`, `tt_split` y `tt_finish` (9-d), con `TimeTrialInstant.arrivals` y el contexto `tt_round` de `RiderCueContext` que añadió la corrección de §9 (9-i, 9-k), `BroadcastHead.tplRev` (12-c), `housingCovered` en `contract` (12-j) y `RiderCard.gender` (D-62). Los dos que se guardan (`favourites` y `checkClockDs`) entran en el formato 1 en el 4b (17-a). Descartado: dejarlos propuestos, que dejaba B1c en rojo en el 7a (los favoritos se leerían con los atributos de hoy, `stageRun.ts` l. 790-805 y 891-897), el tablero de la crono hasta 1,43 s lejos del acta (9-b), el titular de hoy sin ` with housing covered` (`packages/db/src/contracts.ts` l. 328) y `NEWS_VARIANTS` sin compilar.
- 4-v. La regla `incident` toma el grupo del protagonista al final de `b − 1` y su reloj en `b` (o en `b − 1` si ese grupo murió en `b`), con `máx(tS, …)`; `puncture` y `mechanical` de carretera pasan a `incident`. El motor saca al caído de su grupo en el mismo bloque (`simulate.ts` l. 8291 y 8471), y con el grupo del final de `b` el rótulo salía 70,6 s tarde de mediana en las caídas y 141,6 s en los pinchazos (`l3/grabador.mjs`, 627 caídas). Descartado: `groupAt(r, b)`, que es la regla `emit`.
- 4-w. El borde de la meta de una crono es la última llegada, `máx(startDs[r] + kmClockDs[r].at(−1))`, que es la hora de `lastHome` en el motor (`timetrial.ts` l. 495, 596 y 614) a medio segundo como mucho; `tt_catches`, fechado a esa hora, va al paquete de meta. Medido: en 30 de 154 corridas alguien llega después que el último en salir, hasta 281 s después (`rcod/n/ws/ttborde.mjs`). Descartado: la llegada del último en salir, que dejaba en ruta a quien aún no había llegado cuando la pantalla pedía la meta.
- 4-x. Los esquemas que el formato guardado comparte con la red (`stageRefSchema`, `championTitleSchema`, `wornJerseySchema`, `distinctionSchema`, `profileStripSchema`, `stageWeatherSchema`) viven en `codec.ts` y `wire.ts` los importa de ahí: `wire.ts` carga `BROADCAST` (`riderCardSchema`) y `codec.ts` es del lado del grabador, que no lo lee (15-b). `storedTimelineV1Schema` se escribe entero, y los esquemas se atan a su tipo en los dos sentidos con `SchemaMatches` (`STORED_MATCH`, `WIRE_MATCH`), porque `satisfies` solo ve lo que le falta al esquema (medido con tsc 5.9.3 y zod 4.4.3). Descartado: que `codec.ts` importe de `wire.ts`; y el test de claves por niveles con `expectTypeOf`, que dice lo mismo en más líneas y solo corre con los tests.

**Propuesto para el glosario.**
- (corrección L2, fundido ya en el glosario) `TimelineCast.favourites`, `TimeTrialTrace.checkClockDs`, `TimelineVisibility.ttCheckDs`, `BroadcastHead.tt` y `tplRev`, `BroadcastChunk.tt.checks`, los `Cue` `tt_start_order`, `tt_split` y `tt_finish`, `RiderCard.gender` y `contract.housingCovered` con su forma final (4-u); en `broadcast/codec.ts`, `SchemaMatches`, `STORED_MATCH`, `fromStoredV1` (privada) y los seis esquemas compartidos con la red (4-x); en `broadcast/wire.ts`, `WIRE_MATCH`.
- `TimelineCore` (la línea sin reparto, tiempo ni meta) y `toDs`, `fromDs`, `toKm10`, `fromKm10` (los únicos redondeos del formato), en `broadcast/timeline.ts`; `TimelineFormatError`, `storedTimelineV1Schema`, `ORIGIN_CODE` y `BANNER_CODE` (error, validación de lo guardado y los dos códigos cerrados), en `broadcast/codec.ts`.
- `SNAPSHOT_FIELDS`, `PROBE_HOOKS`, `CODES_MATCH`, `ORIGIN_OF_PREFIX` (la guarda de tipos del grabador) e `I1Mismatch` (el informe de I1), en `engine/src/sim/timeline.ts`; `InstantContext` y `photoBlocksOf` (lo que el instante necesita además de la línea), en `broadcast/instant.ts`; `TimelineVisibility`, en `broadcast/cut.ts`; `RevealRule`, `TT_REVEAL_RULES`, `RevealInput` y `RecorderView`, en `broadcast/reveal.ts`.
- `TimelineEventWire`, `MISHAP_CODE` y `PULL_MOTIVE_CODE`, en `broadcast/wire.ts`; `stageGateSchema`, `preStageInfoSchema`, `watchStateSchema` y `switchModeSchema`, en `contracts.ts` (14-a); `RadioNames` (la forma de `ChronicleNames`), en `broadcast/radio.ts`; y el fichero `packages/shared/src/broadcast/index.ts`, que reexporta `broadcast/`.

**Dudas para el ensamblador.**
- §G.9 escribe I5 como «salida + traza final + pérdida = `results.tiempoS`», que mezcla relojes: `tiempoS` es reloj propio con la pérdida ya dentro (`timetrial.ts` l. 312, 347, 361). §4.4 da la forma exacta; §9.8 y §16 deberían usarla.
- §G.3.5 pone todo el horizonte en `packages/db/src/horizon.ts` y §G.2 pone `PreStageInfo` en `pageTitle.ts`; con 4-k y 4-l, esas filas del glosario cambian.
- Las firmas de §G.4 de `instantAt`, `photoAt`, `visibilityOf`, `cutTimeline`, `chunkOf` y `revealSOf` cambian (4-b, 4-r); la cabecera de §G.3 dice «los tipos se infieren» (4-j). El `cut` del pseudocódigo de §3.3, tipado `StageTimeline`, es aquí un `TimelineCore`, que tiene todo lo que usa.
- D-23 dice que el km verdadero del pinchazo de crono «sale de la traza»; el motor no tiene otro que `finishKm / 2` (4-f): §9.6 debería decirlo así.
- §5.4 (el grabador) tiene que usar la tabla de §4.7 con sus dos filas explícitas y el `máx(tS, …)` de 4-g, y renumerar el catálogo (4-a).
