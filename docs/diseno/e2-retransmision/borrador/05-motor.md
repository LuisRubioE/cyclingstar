## 5. Lo que el motor guarda al correr la etapa: sonda, codificación y tamaños

Esta sección dice qué se toca del motor y de la capa de datos para que cada etapa deje, al correrse, la línea temporal de §4.2 guardada en `stage_timelines`: los tres ganchos nuevos de la sonda (5.2), la envoltura que reparte las fotos entre la radio de hoy y el grabador (5.3), el grabador (5.4), la autocomprobación que decide si la línea se guarda (5.5), la codificación y la escritura (5.6), lo que pesa y lo que cuesta (5.7 y 5.8), lo que el motor NO gana (5.9) y los dos bancos que lo sellan (5.10). Los tipos de la línea son los de §4 y aquí se usan por su nombre; el esquema de la tabla es §13.3; las constantes, §15.2. Las líneas de código son las de HEAD `9c21885`, comprobadas en `3fbd828`, que solo añade ficheros de `docs/` (`git diff --stat 9c21885 HEAD` fuera de `docs/` sale vacío). La envoltura de la sonda vive en `packages/db/src/stageRun.ts`; `apps/api/src/tick/` solo contiene `main.ts`, que llama a `runTick` (l. 11).

**Medidas nuevas de esta sección.** Todas en el scratchpad de la síntesis, carpeta `l3/`, sin tocar el repositorio, sobre el `dist` del motor v89 y el campo del banco del juez del motor (`juez-motor/campo.mjs`: 176 corredores en las carreras WorldTour, 126 en `race-colombia` y `race-tramuntana`, 40 en los nacionales). `l3/parchear.py` hace una copia del `dist` (`l3/eng/`) con los tres ganchos EXACTAMENTE como los escribe 5.2; sobre ella, `l3/huella.mjs` repite B11, `l3/b10.mjs` repite B10, `l3/i5.mjs` comprueba I5 y `l3/grabador.mjs` es un prototipo del grabador de 5.4 que escribe el formato `StoredTimelineV1` de §4.3, lo comprime con gzip 9 y comprueba I1 e I3 sobre lo codificado. `l3/lru.mjs` mide la memoria de una línea decodificada. Las etapas son las 24 del mapa 07 §7 (las 21 de `race-france`, `race-flanders`, `race-tramuntana` y `race-colombia` e5) más `race-italy` e9 y los dos nacionales de España, con las semillas 0 y 1.

### 5.1 Lo que no cambia

**`ENGINE_VERSION` sigue en 89 y ningún paso de E2 la sube** (D-09; `packages/engine/src/constants.ts` l. 838). Guardar lo que la sonda ya ve no cambia una carrera, y hay dos medidas que lo dicen. El juez del motor comparó 20 de 20 etapas (10 etapas por 2 semillas, un nacional incluido) con foto en cada bloque y sin ella, y salieron idénticas en `results`, `events`, `efforts` e `incidents` enteros (C5). Aquí se ha repetido con los tres ganchos de 5.2 puestos, que el juez no tenía: foto en cada bloque más `onEvent`, `onBanner` y `onTimeTrialRide`, contra el motor sin sonda, en 12 etapas por 2 semillas (seis de ellas cronos, de 176 y de 40 corredores): **24 de 24 idénticas** en los cuatro campos (`l3/huella.mjs`). En esas corridas `onEvent` se llamó tantas veces como sucesos devolvió la etapa, `onBanner` una por pancarta con puntos y `onTimeTrialRide` una por corredor de la crono.

La doctrina está escrita tres veces en `docs/balance.md` y la regla de la casa habla de comportamiento, no de observación. La v85: «Este cambio no altera un segundo de ninguna carrera: es la radio contando mejor lo que ya pasaba. `checkReplay` ata `ENGINE_VERSION` a que una re-simulación reproduzca la carrera guardada, así que subirlo marcaría todas las etapas pasadas como no reproducibles a cambio de nada.» (l. 16321-16323). La siguiente: «No cambia un segundo de ninguna carrera: es la radio contando mejor lo que ya pasaba.» (l. 16604-16605). La de `radioMaxKmh`: «`radioMaxKmh` sólo lo lee la radio (`groupSpeedKmh`); no toca una carrera.» (l. 16708). Y `Claude.md` l. 13: «Todo cambio de comportamiento del motor incrementa engine_version.» Lo que sí sube la versión es cambiar el CONTENIDO de un suceso: la v73 añadió un campo a `datos` y subió «porque la crónica emitida cambia y el replay se compara contra ella» (`docs/balance.md` l. 14035-14036).

Cada cambio del motor que las propuestas querían hacer subiendo la versión llega aquí por observación (O-05, X-03, X-04):

| Propuesta | Lo que subía la versión | Lo que lo da sin subirla |
| --- | --- | --- |
| `estado.md` §11 | el orden completo de volantes y cimas en `sprint_intermediate` y `climb_kom` (v90) | `onBanner` (5.2): el orden y los puntos de cada pancarta |
| `producto.md` §11, cambio 4 | `datos.aT` y `datos.aKm` en `breakaway_formed` y `break_cooperation` | `onEvent` (5.2): el bloque de emisión, y `REVEAL_RULES` (§4.7) |
| `producto.md` §11, cambio 5 | `climb_kom` con el reloj del grupo del ganador y `datos.orden` | `onBanner`: `ProbeBanner.tS` es el reloj del grupo del primero que puntúa |
| `producto.md` §11, cambio 6 | un suceso `crash` por caída | `output.incidents` al cerrar la línea (D-13, 5.4) |
| `producto.md` §11, cambio 7 | pinchazos y averías de crono con reloj de carrera | `onTimeTrialRide`: la salida más el reloj propio de la traza (§4.7, regla `tt_own_clock`) |
| `ingeniero.md` §11.2 (paso 11 opcional) | `datos.knownKm`, `knownS` en la fuga; `p2Id`, `p3Id` y `pts` en las pancartas | `onEvent` y `onBanner` |
| `datos.md` §11, punto 4 (paso 10 opcional) | los puestos 2.º a 8.º de volantes y cimas | `onBanner` |

**La regla para quien venga después** (H-02): toda subida de `ENGINE_VERSION`, de E2 o de otro documento, va DETRÁS del paso 17d de la táctica, porque `packages/db/src/raceReport.ts` l. 148 re-simula la «Last race» con `simulateStage(input, snap.seed)` sin comparar `engine_version` (C16): una subida anterior al 17d cambia lo que ese informe cuenta de las etapas ya corridas. Mientras la versión no cambie, `checkReplay` (`packages/engine/src/sim/raceRadio.ts` l. 49-55) sigue fiel para las etapas corridas con la v89, y `scripts/race-radio.mjs --db`, que re-simula desde la semilla y la entrada de `stage_snapshots` y se niega si la versión no coincide (cabecera del script, l. 19-38), sigue siendo el microscopio del dueño en producción ([DUEÑO 10]). La corrección de `docs/balance.md` l. 14684-14686 («moverla **tira todas las crónicas guardadas**»), que no es cierta porque la ruta de etapa lee las crónicas guardadas sin mirar la versión, la hace el paso 12 (D-58, §17.15).

Tampoco cambian `StageOutput` (5.9), `stage_snapshots` (§13.6) ni lo que se escribe en `stage_snapshots.radio` hasta el paso 11 (D-16).

### 5.2 Los tres ganchos de la sonda

`StageProbe` (`packages/engine/src/stage/types.ts` l. 487-504) gana tres métodos OPCIONALES y dos tipos de carga. Un método ausente es el motor de hoy: el código solo llama a `probe?.onEvent`, `probe?.onBanner` y `probe?.onTimeTrialRide` si existen. Ninguno de los tres devuelve nada, ninguno recibe un objeto que el motor vuelva a leer después de la llamada con otro valor y ninguno tira un dado, así que el orden de las tiradas de todos los subflujos (`rngSprint`, `rngNoise`, `rngPercance`…) es el de hoy: lo mide la huella de 5.1. La guarda `PROBE_HOOKS` de §4.3 obliga a quien añada un cuarto método a decidir qué hace el grabador con él.

```ts
// packages/engine/src/stage/types.ts: junto a StageProbe (l. 487-504). BannerType es l. 25; ClimbCategory, l. 91 (ya incluye null).

/** Lo que `onBanner` recibe de una pancarta DISPUTADA (E2 §5.2): el reparto que el motor hace y hoy no emite (solo el ganador). */
export interface ProbeBanner {
  readonly kind: BannerType            // 'meta_volante' | 'cima'
  readonly km: number                  // kmAt del bloque de la pancarta: el `km` del bucle (simulate.ts l. 3088)
  readonly cat: ClimbCategory          // la del bloque en una cima (`block.climbCategory`); null en una volante
  /** Reloj del grupo del PRIMERO QUE PUNTÚA: en la volante, el grupo de cabeza, el único que esprinta (simulate.ts l. 8940-8946);
   *  en la cima, el grupo de `disputan[0]`, que puede no ser el primero en coronar (l. 9287): no es `groups[0].tS` (l. 9310, C9). */
  readonly tS: number
  /** Los que puntúan, en su orden, con los puntos que suman: `STAGE.sprintPoints` o la tabla de la cima (constants.ts l. 5032 y 5036). */
  readonly order: readonly { readonly riderId: string; readonly points: number }[]
}

/** Lo que `onTimeTrialRide` recibe de cada corredor de una crono al cerrar su recorrido (E2 §5.2; su uso es §9). */
export interface ProbeTimeTrialRide {
  readonly riderId: string
  readonly startS: number              // su hora en la rampa (timeTrialStartOrder, startOrder.ts l. 127): reloj de carrera
  readonly raw: ArrayLike<number>      // su reloj propio al final de cada bloque, sin ruido ni percance (timetrial.ts l. 266-284): el array del motor, sin copiar; solo se lee
  readonly noise: number               // el ruido de su tiempo final (l. 345)
  readonly totalS: number              // su tiempo con percance y ruido, el que `results` redondea (l. 347)
  readonly mishap: { readonly kind: 'pinchazo' | 'averia'; readonly km: number; readonly lostS: number } | null // su percance (l. 306-331), km y pérdida sin ruido
}

export interface StageProbe {
  atKm: readonly number[]
  onSnapshot: (km: number, riders: readonly SnapshotRider[], mainGroupId: string | null) => void
  /** E2 §5.2. Cada suceso EN EL ORDEN EN QUE SE EMITE, con el bloque del bucle en que se emitió: 0 antes del bucle,
   *  `i` dentro del bloque `i`, `blocks` después (la meta de finishStage y el corte de applyStageTimeCut).
   *  Solo en carretera: la crono no lo llama. No debe mutar el suceso. */
  onEvent?: (event: Readonly<RaceEvent>, block: number) => void
  /** E2 §5.2. Cada pancarta en que alguien puntúa, justo después de repartir los puntos. */
  onBanner?: (banner: ProbeBanner) => void
  /** E2 §5.2. Cada corredor de una crono, después de sortear su ruido y antes de pasar al siguiente. */
  onTimeTrialRide?: (ride: ProbeTimeTrialRide) => void
}
```

**El oyente de `EventLog`** (`packages/engine/src/stage/events.ts` l. 9-49). El motor emite por `EventLog` desde muchas funciones que reciben el registro como parámetro (`finishStage`, `applyStageTimeCut`, `disputeBanner`, `disputeClimb`…), así que el único sitio que ve TODAS las emisiones es el propio registro:

```ts
// packages/engine/src/stage/events.ts
export class EventLog {
  private readonly events: RaceEvent[] = []
  /** Observación (E2 §5.2): ve cada suceso al añadirse, en el orden de emisión. Uno como mucho; sin él, el registro de hoy. */
  private listener: ((event: Readonly<RaceEvent>) => void) | null = null
  listen(fn: (event: Readonly<RaceEvent>) => void): void {
    this.listener = fn
  }
  add(event: RaceEvent): void {
    this.events.push(event)
    this.listener?.(event)
  }
  emit(km: number, tS: number, tipo: string, plantilla: string, protagonistas: string[] = [], datos?: Record<string, number | string>): void {
    const event: RaceEvent = datos ? { km, tS, tipo, plantilla, protagonistas, datos } : { km, tS, tipo, plantilla, protagonistas }
    this.events.push(event)
    this.listener?.(event)
  }
  // sameKm y toArray, sin cambios (l. 35-48)
}
```

El oyente recibe el MISMO objeto que queda en el registro: `toArray` (l. 46-48) ordena una copia del array con los mismos objetos y `announceRebels` (l. 71-99) los vuelve a empujar tal cual, así que el grabador reconoce cada suceso de `output.events` por identidad (5.4) aunque la salida lo haya reordenado por reloj. Los únicos objetos de la salida que el oyente no ha visto son los `rider_defies_team` que `announceRebels` inserta al cerrar (`simulate.ts` l. 9081): el grabador les da el bloque del siguiente suceso de su protagonista, que es el caso (b) de D-05.

**Dónde se cablea cada gancho** (el diff, sobre `simulate.ts` y `timetrial.ts`):

```ts
// packages/engine/src/stage/simulate.ts
if (input.timeTrial) return simulateTimeTrial(input, seed, probe)             // l. 1264: la crono deja de ignorar la sonda

const log = new EventLog()                                                   // l. 1571
let bloqueDeEmision = 0                                                      // el bloque en curso para onEvent
if (probe?.onEvent) { const onEvent = probe.onEvent; log.listen((e) => onEvent(e, bloqueDeEmision)) }

for (let i = 0; i < n; i++) {                                                // l. 3058
  bloqueDeEmision = i  // … y el bloque, sin cambios …
}
bloqueDeEmision = n                                                          // tras l. 9025: finishStage y applyStageTimeCut emiten después

disputeBanner(front, block, km, frontTs, log, rngSprint, probe?.onBanner)     // l. 8946
disputeClimb(groups, block, km, log, rngSprint, komLead, probe?.onBanner)     // l. 8955

function disputeBanner(members: RiderSim[], block: Block, km: number, tS: number, log: EventLog, rngSprint: Rng,
  onBanner?: StageProbe['onBanner']): void {                                  // l. 9175
  // … hasta el reparto de puntos (l. 9213-9218), sin cambios …
  if (onBanner) {
    const order: { riderId: string; points: number }[] = []
    ranked.forEach(({ m }, idx) => { const points = table[idx] ?? 0; if (points > 0) order.push({ riderId: m.input.riderId, points }) })
    if (order.length > 0) onBanner({ kind: block.banner!, km, cat: isSprint ? null : (block.climbCategory ?? null), tS, order })
  }
  // … el log.emit de l. 9221, sin cambios …
}

function disputeClimb(groups: { tS: number; members: RiderSim[] }[], block: Block, km: number, log: EventLog, rngSprint: Rng,
  kom: { proclaimed: string | null }, onBanner?: StageProbe['onBanner']): void { // l. 9231
  const table = climbTable(block)
  const ordered: RiderSim[] = []
  const relojDe = new Map<RiderSim, number>()                                // el grupo de cada uno, para el reloj del primero que puntúa
  for (const g of groups) {
    for (const m of g.members) relojDe.set(m, g.tS)
    // … el orden dentro del grupo y sus tiradas (l. 9246-9261), sin cambios …
  }
  // … `interesados`, `disputan` y el reparto (l. 9273-9283), sin cambios …
  if (onBanner) {
    const order: { riderId: string; points: number }[] = []
    disputan.forEach((m, idx) => { const points = table[idx] ?? 0; if (points > 0) order.push({ riderId: m.input.riderId, points }) })
    if (order.length > 0) onBanner({ kind: 'cima', km, cat: block.climbCategory ?? null, tS: relojDe.get(disputan[0]!) ?? 0, order })
  }
  // … el winner y el log.emit de l. 9310, sin cambios …
}

// packages/engine/src/stage/timetrial.ts
export function simulateTimeTrial(input: StageInput, seed: string, probe?: StageProbe): StageOutput {   // l. 219
  // … dentro de input.riders.map, por corredor:
  let percance: { kind: 'pinchazo' | 'averia'; km: number; lostS: number } | null = null
  if (cronoOn && rngPercance() < STAGE.mishap.ttLambda) {                   // l. 306
    // … kind y perdida, sin cambios …
    tS += perdida                                                            // l. 312
    percance = { kind, km: finishKm(input) / 2, lostS: perdida }
    // … incidents.push y log.emit, sin cambios …
  }
  // … workUnits, tank, efforts, sin cambios …
  const noise = normal(rngNoise, 1, STAGE.ttNoiseSd)                         // l. 345
  const startS = startOf.get(rider.riderId) ?? 0
  const total = tS * noise
  probe?.onTimeTrialRide?.({ riderId: rider.riderId, startS, raw, noise, totalS: total, mishap: percance })
  return { riderId: rider.riderId, raw, noise, tS: total, startS, finishS: startS + total }   // l. 348
}
```

Por qué cada uno tiene esa forma:

- **`onEvent` recibe el bloque del bucle, no una cuenta de fotos.** `estado.md` §11 fechaba cada suceso contando las fotos recibidas; eso ata el bloque a qué bloques se fotografían, y el colector aparte (5.3) puede cambiar de parecer sobre eso. `bloqueDeEmision` es el índice del bucle y no depende de nada más. Un suceso emitido dentro del bloque `i` llega ANTES que la foto de `i`, que se toma al final del bloque (l. 8996-9024): es lo que el grabador necesita para saber que en la foto de `i` ese suceso ya ha pasado.
- **La crono no llama a `onEvent`**: en una crono cada corredor corre su recorrido entero antes que el siguiente (`timetrial.ts` l. 249-349) y no hay un bloque común. El grabador pone `bEmit = blocks` a todos sus sucesos y sus reglas de revelado no lo usan (`tt_race_clock`, `tt_own_clock` y `finish`, §4.7).
- **`onBanner` lleva ids y no `RiderIx`**: el motor no conoce el orden congelado de `stage_snapshots.input.riders` (lo reordena por id, `simulate.ts` l. 1257-1262); el grabador traduce. Solo se llama si alguien puntúa, que es cuando el motor emite `sprint_intermediate` o `climb_kom` (l. 9219-9225 y 9287-9311): la primera casilla de cada tabla da puntos.
- **`onTimeTrialRide` no copia la traza**: el grabador lee `raw` durante la llamada y se queda con lo que necesita (el reloj al final de cada km entero, §4.2 `TimeTrialTrace.kmClockDs`). El reloj propio en km `k` es `raw[round(k / dx) − 1] · noise` y en meta `totalS`, con el percance dentro; medido (`l3/i5.mjs`, `race-france` e1 y e16 y `nc-es-itt`, semillas 0 a 2): la última entrada cuadra con `10 · results.tiempoS` en **1.176 de 1.176** corredores, con un error máximo de 5 Ds (el redondeo de `tiempoS`), 19 de ellos con percance, y la traza nunca decrece. Es I5 (§4.4); su pantalla es §9.

### 5.3 El colector aparte

La envoltura de la sonda de `packages/db/src/stageRun.ts` (hoy l. 515-536) cambia así (D-08, I-12, O-01): pide `atKm` con el centro de CADA bloque, reconoce por el ÍNDICE de bloque las fotos que caen en un punto de `radioKmPoints` y hace con ellas EXACTAMENTE lo de hoy (anotar `trabajaronParaOtro` y dárselas a `raceRadioCollector`), y da todas al grabador. El despacho es por índice y no por km porque el motor no devuelve el km pedido sino el centro del bloque que le corresponde: construye `probeAt` con `Math.round(target / STAGE.dx − 0,5)` (`simulate.ts` l. 1946-1948) y llama a `onSnapshot` con `probeAt.get(i)` (l. 9023). La envoltura hace la misma cuenta con `photoBlocksOf` (§4.5; la ata al motor el test de §15.5 en las 1.418 etapas del calendario).

```ts
// packages/db/src/stageRun.ts, en lugar de l. 515-536
const lengthKm = stageLengthKm(spec.profile)
const radio = raceRadioCollector(radioKmPoints(lengthKm))
const trabajaronParaOtro = new Set<string>()
/** Una foto de un km de radio, tratada EXACTAMENTE como hoy (l. 528-535): el aprendizaje y la radio. */
const fotoDeRadio: StageProbe['onSnapshot'] = (km, riders, mainId) => {
  for (const r of riders) if (r.pullFor != null) trabajaronParaOtro.add(r.riderId)
  radio.probe.onSnapshot(km, riders, mainId)
}
// spec.timeline existe si el tick corre con TIMELINE_RECORD=on (§5.5); si no, la envoltura es byte a byte la de hoy.
const grabacion = spec.timeline
  ? startStageTimeline({ lengthKm, timeTrial: spec.timeTrial, riderIds: stageRiders.map((r) => r.riderId), radioShot: fotoDeRadio })
  : null
const output = simulateStage(input, seed, grabacion?.probe ?? { atKm: radio.probe.atKm, onSnapshot: fotoDeRadio })
```

```ts
// packages/db/src/timelines.ts
import { STAGE, type StageProbe, type TimelineRecorder, timelineRecorder } from '@cyclingstar/engine'
import { type Block, photoBlocksOf } from '@cyclingstar/shared'

/** Una etapa que se está grabando: la sonda que se le pasa al motor y lo que queda para cerrarla. */
export interface StageTimelineRun {
  readonly probe: StageProbe
  readonly recorder: TimelineRecorder
  /** El primer error del grabador, si lo hubo: desde él el grabador no recibe nada más y la etapa se queda sin línea (§5.5). */
  readonly failure: () => unknown
}

/** El bloque cuyo centro es `km`, con la cuenta del motor (simulate.ts l. 1946-1948). */
const blockOf = (km: number, blocks: number): Block => Math.max(0, Math.min(blocks-1, Math.round((km / STAGE.dx)-0.5)))

/**
 * EL COLECTOR APARTE (D-08). Pide la foto de CADA bloque y despacha por índice: la de un bloque de radioKmPoints va a
 * `radioShot`, que es la radio y el aprendizaje de hoy; todas van al grabador. El grabador va envuelto: un fallo suyo
 * lo apaga y se apunta, y nunca llega al motor ni a la transacción del día. La radio va fuera de la envoltura, como hoy.
 */
export function startStageTimeline(opts: {
  readonly lengthKm: number
  readonly timeTrial: boolean
  readonly riderIds: readonly string[]                       // el orden de stage_snapshots.input.riders (stageRun.ts l. 257)
  readonly radioShot: StageProbe['onSnapshot']
}): StageTimelineRun {
  const blocks = Math.round(opts.lengthKm / STAGE.dx)       // los de sampleProfile (sample.ts l. 70)
  const radioBlocks: ReadonlySet<Block> = new Set(photoBlocksOf(opts.lengthKm, STAGE.dx))
  const recorder = timelineRecorder({ blocks, dx: STAGE.dx, lengthKm: opts.lengthKm, timeTrial: opts.timeTrial, radioBlocks, riderIds: opts.riderIds })
  let failure: unknown
  const safe = <A extends unknown[]>(fn: (...args: A) => void) => (...args: A): void => {
    if (failure !== undefined) return
    try { fn(...args) } catch (err) { failure = err ?? new Error('el grabador falló sin error') }
  }
  const snapshot = safe(recorder.onSnapshot)
  return {
    recorder,
    failure: () => failure,
    probe: {
      atKm: Array.from({ length: blocks }, (_, b) => (b + 0.5) * STAGE.dx),
      onSnapshot: (km, riders, mainId) => {
        if (radioBlocks.has(blockOf(km, blocks))) opts.radioShot(km, riders, mainId)
        snapshot(km, riders, mainId)
      },
      onEvent: safe(recorder.onEvent),
      onBanner: safe(recorder.onBanner),
      onTimeTrialRide: safe(recorder.onTimeTrialRide),
    },
  }
}
```

**Qué ve cada uno.** `trabajaronParaOtro` y `raceRadioCollector` ven las mismas fotos que hoy, una por bloque de `radioKmPoints`; el grabador las ve todas, de 1.280 a 2.782 por etapa en las medidas (una por bloque de 100 m). En las 69 etapas del calendario en que los dos últimos puntos de `radioKmPoints` caen en el mismo bloque (§15.5), el motor toma una sola foto porque `probeAt` es un `Map` por bloque, y la envoltura también: `radioBlocks` es un conjunto de bloques.

**Por qué no por km, y por qué aparte.** Con todas las fotos por la misma envoltura cambian dos cosas que no deben cambiar sin subir la versión. El aprendizaje: `trabajaronParaOtro` apunta a quien tira para otro en CUALQUIER foto que vea (`stageRun.ts` l. 527-535) y alimenta `raceLearning` (l. 791-802); el juez del motor midió que con fotos por bloque cambian de 0 a 2 corredores en 3 de 12 corridas (C11), y aquí, con la envoltura ingenua, cambia el conjunto en **6 de 18 corridas y hasta en 20 corredores** (`race-france` e20, semilla 0; `l3/b10.mjs`). Y el turno de relevo de la radio: `TURNO_KM` cuenta FOTOS y no km (`raceRadio.ts` l. 597, usado en l. 883), así que con fotos de 100 m el turno que el dueño dio por bueno («hay 3 escapados… todos parece que colaboran, pero en vez de salir que tiran todos, sale cada km que tira uno diferente», `docs/balance.md` l. 16615-16616) pasaría de 3 km a 300 m. Con el colector aparte, **18 de 18 corridas** dan el mismo `trabajaronParaOtro` y la misma radio guardada, byte a byte, que la envoltura de hoy (`l3/b10.mjs`, nueve etapas por dos semillas). Es B10 (5.10; X-10).

**`TIMELINE_RECORD=off`.** Sin `spec.timeline` no hay grabador, `atKm` es `radioKmPoints` y la envoltura es la de hoy; el motor no recibe ningún gancho y sale la carrera de hoy. El interruptor y el camino por el que llega a `runOneStage` son §5.5.

### 5.4 El grabador puro

`timelineRecorder` vive en `packages/engine/src/sim/timeline.ts`, el fichero nuevo que ya lleva la guarda de tipos de §4.3 (`SNAPSHOT_FIELDS`, `PROBE_HOOKS`, `CODES_MATCH`, `ORIGIN_OF_PREFIX`) y el informe de I1 (`I1Mismatch`, §4.4). Es puro como `raceRadio.ts`: no lee reloj ni azar, no importa Node (el gzip es de `packages/db`, `eslint.config.js` l. 80-137) y usa de `@cyclingstar/shared`, que el motor ya importa (`packages/engine/package.json` l. 19), los tipos de §4, `photoAt` y `revealSOf`. Nace en el PR 4b, que es el que paga los ocho tramos de bancos (D-54). Guarda en memoria la foto anterior y la actual, no la etapa (D-02): lo que acumula son las diferencias, que es lo que se escribe, más un reloj de cabeza por bloque (un `Float64Array` de `blocks`, de 12 a 22 KB en las etapas medidas) para la vista de revelado.

```ts
// packages/engine/src/sim/timeline.ts (sigue a la guarda de §4.3)
import type { Block, ProfileStrip, RiderIx, StageTimeline, StageWeather, TimelineCast } from '@cyclingstar/shared'
import type { RaceRadio } from './raceRadio.js'
import type { SnapshotRider, StageInput, StageOutput, StageProbe, StageProfile } from '../stage/types.js'

/** Lo que el grabador necesita saber de la etapa antes de que corra. */
export interface TimelineRecorderOptions {
  readonly blocks: number                    // Math.round(lengthKm / dx), los de sampleProfile (sample.ts l. 70)
  readonly dx: number                        // STAGE.dx (constants.ts l. 2290)
  readonly lengthKm: number                  // stageLengthKm(profile): las fotos clave y el último km
  readonly timeTrial: boolean                // en crono no llegan fotos (simulate.ts l. 1264): solo la traza
  readonly radioBlocks: ReadonlySet<Block>   // photoBlocksOf(lengthKm, dx): la capa de detalle y las fotos de I1
  readonly riderIds: readonly string[]       // por RiderIx: el orden de stage_snapshots.input.riders (stageRun.ts l. 257)
}

/** Lo que el cierre necesita y el motor no ve. Lo arma packages/db con lo que ya tiene al correr la etapa (5.5). */
export interface RecorderFinishInput {
  readonly input: StageInput                 // la entrada congelada: el orden de salida de la crono (timeTrialStartOrder)
  readonly output: StageOutput               // events, results e incidents, tal cual
  readonly radio: RaceRadio | null           // la radio COMPLETA que stageRun ya construye (radio.radio({ incidents })); null en crono
  readonly cast: TimelineCast                // buildTimelineCast (packages/db/src/cast.ts, D-15; su contenido es §7)
  readonly profile: ProfileStrip             // profileStripOf, abajo
  readonly weather: StageWeather             // freezeStageWeather, abajo: el StageWeather de §4.2, no el del motor
}

/** EL GRABADOR (D-02). Sus cuatro métodos son cierres sin `this`: el colector aparte (5.3) los pasa sueltos. */
export interface TimelineRecorder extends Required<Omit<StageProbe, 'atKm'>> {
  /** Las fotos del motor en los bloques de radioKmPoints, por referencia (la radio ya las retiene): las que compara selfCheckI1. */
  readonly kmPhotos: ReadonlyMap<Block, readonly SnapshotRider[]>
  /** Cierra la línea. Lanza TimelineFormatError (§4.3) si faltó la foto de un bloque, si un id de grupo no tiene prefijo
   *  conocido, si hay más de 255 grupos o si la radio no casa con los bloques de foto. No escribe nada: eso es 5.6. */
  finish(input: RecorderFinishInput): StageTimeline
}
export function timelineRecorder(opts: TimelineRecorderOptions): TimelineRecorder

/** El recorrido congelado (§4.2 ProfileStrip): cotas al final de cada km (altitudesDelPerfil, citas.ts l. 256-264), puertos
 *  (tramosDelPerfil, l. 35-65, y las pancartas `cima`), volantes y vueltas; el nombre de un puerto sale de
 *  STAGE_FEATURES[raceId][stageDay − 1] (routes/stageFeatures.ts l. 15) si su cima está a menos de un bloque; si no, null. */
export function profileStripOf(profile: StageProfile, at: { readonly raceId: string; readonly stageDay: number } | null): ProfileStrip
/** El tiempo del día congelado (D-14, I-19): stageWeather, stageWindStrength, weatherPlan, roadBearings y windComponents
 *  (weather.ts l. 58, 169, 188, 232, 251) sobre la semilla y el lugar, con el interruptor del clima de la carrera
 *  (`input.flags?.weather ?? STAGE.weather.enabled`, simulate.ts l. 1435): sin clima, un solo tramo sin viento. */
export function freezeStageWeather(input: StageInput, seed: string): StageWeather
/** I1 (§4.4) sobre las fotos del motor que guardó el grabador, con la tolerancia de 5.5. Vacío si se cumple. */
export function selfCheckI1(tl: StageTimeline, kmPhotos: ReadonlyMap<Block, readonly SnapshotRider[]>): readonly I1Mismatch[]
/** I5 (§4.4) en una crono: la última entrada de cada traza contra `results.tiempoS`. Vacío si se cumple (5.5). */
export function selfCheckI5(tl: StageTimeline, output: StageOutput): readonly { readonly rider: RiderIx; readonly expectedDs: number; readonly gotDs: number }[]
```

**La capa de detalle sale de las mismas cuentas que la radio.** Hoy la calcula `radioForStorage` (`raceRadio.ts` l. 776-963) con tres cosas que solo existen ahí: la velocidad por los hombres con su medida hacia atrás (`groupSpeedKmh`, l. 679; su uso, l. 933-944), el turno de `TURNO_KM` fotos (l. 882-886) y el corte en `STORED_PULLERS_MAX` (l. 591, 911-912). El PR 4b las saca a una función exportada que las dos piezas leen, y `radioForStorage` pasa a construirse sobre ella sin cambiar un byte de lo que guarda (lo vigilan `stageRun.test.ts` l. 322-339, los tests de `sim/raceRadio.test.ts` y, en el paso 11, B16):

```ts
// packages/engine/src/sim/raceRadio.ts (PR 4b: se extrae, no cambia lo que se guarda)
export const STORED_PULLERS_MAX = 12     // l. 591, hoy sin export: el grabador corta a lo mismo
/** La capa de detalle de un grupo en una foto de km, ANTES de indexar y de cortar. */
export interface RadioGroupDetail {
  readonly id: string                         // el id del motor en esa foto
  readonly speedKmh: number | null            // groupSpeedKmh, con la medida del km anterior si el siguiente no da (v85)
  readonly relevan: readonly RadioPuller[]    // los que dan la cara y los del turno, en el orden de hoy (l. 906-911), SIN cortar
  readonly mishap: RadioGroup['mishap']
}
/** Por foto de `radio.kms` y por grupo en orden de carretera: el cuerpo de radioForStorage de l. 799-960 sin `watching` ni índices. */
export function radioGroupDetails(radio: RaceRadio): readonly (readonly RadioGroupDetail[])[]
```

El grabador toma de cada grupo `pullingTotal = relevan.length`, los `STORED_PULLERS_MAX` primeros de `relevan` con su motivo y su destinatario, la velocidad y el percance. No guarda la lista de seguimiento (`watching`), que es la que mete a los diez primeros de la etapa desde el km 0 (`stageRun.ts` l. 560-568; D-16): por eso la radio que se reconstruya de la línea (`radioFromTimeline`, §12.10) es la de `radioForStorage` con la lista de seguimiento vacía.

**El grabador, en pseudocódigo.** Las marcas son las de los cuatro sitios de §3.4 (I-03); el título, la regla de la radio aplicada por bloque (D-03, `raceRadio.ts` l. 317-320); los sucesos de estado, los de §4.2 en el orden `out`, `move`, `main`, `clock`, `mishap`.

```
timelineRecorder(opts):
  N ← riderIds.length;  ix ← riderId → RiderIx
  catálogo ← [pelotón de salida: id 'peloton', origin start, bornB 0]      todos salen en él (simulate.ts l. 1698-1702)
  vivos ← id → entrada del catálogo                                        una entrada por VIDA: un id que reaparece tras morir abre otra
  prev ← { b: −1, grupoDe: Int16Array(N) a 0, reloj: {pelotón → 0}, tamaño: {pelotón → N}, título: pelotón }
  claves ← { blockOf(10k) : 10k < lengthKm } ∪ { blockOf(lengthKm − 1) }  cada TIMELINE.keyPhotoKm (10) km y al empezar el último km

onSnapshot(km, riders, mainId):                                            una vez por bloque, en orden
  b ← blockOf(km);  si b ≠ prev.b + 1: falla («falta la foto del bloque prev.b + 1»)
  para cada r de riders:                                                   una pasada
    g ← vivos[r.groupId], o nace: origen por ORIGIN_OF_PREFIX (§4.3; uno desconocido falla), bornB ← b
    grupoDe[ix(r)] ← g;  reloj[g] ← mín(reloj[g], r.tS);  tamaño[g] += 1  el reloj del grupo es el de su primero (raceRadio.ts l. 284-300)
  quien no está en riders: grupoDe = −1                                    abandonó: el motor no lo fotografía (simulate.ts l. 9002)
  para cada r con prev.grupoDe[r] ≠ grupoDe[r]: en b, `out` si grupoDe[r] = −1; si no, `move` a grupoDe[r];  cambian ← sus dos grupos
  para cada g vivo en prev y sin nadie en b:                               muere en b − 1
    diedB ← b − 1;  successor ← el grupo de b adonde fue la mayoría de sus corredores de b − 1 (desempate por id; null si ninguno sigue)
    marca (b − 1, g, prev.reloj[g]);  vivos.borra(g)
  marcas:  (a) si b ∈ radioBlocks, todo grupo vivo en b                    el hueco exacto que se enseña y la foto de I1
           (b) todo g con bornB = b                                        la muerte se marcó arriba
           (c) todo g de cambian: en b si vive y en b − 1 si vivía        el mínimo de sus relojes salta al entrar o salir alguien
           (d) si b ≥ blocks − TIMELINE.lastKmMarkBlocks, todo grupo vivo en b
  título ← el grupo de mainId si tiene gente en b; si no, mainGroupId(grupos de b, id de prev.título, STAGE.mainGroupTakeoverRatio)
  si título ≠ prev.título: `main` en b
  si b ∈ claves: foto clave { b, grupoDe (copia), título }
  si b ∈ radioBlocks: kmPhotos[b] ← riders                                 la referencia, sin copiar
  cabeza[b] ← máx(cabeza[b − 1], mín de los relojes de b)                  C3: la cabeza no retrocede
  se cierran los sucesos de b − 1 (ya no pueden ganar marcas);  prev ← b

onEvent(e, bloque): bloqueDe[e] ← bloque                                   por identidad del objeto (5.2)
onBanner(x): pancartas += x
onTimeTrialRide(x): trazas[ix(x.riderId)] ← el reloj al final de cada km entero (raw[round(k / dx) − 1] · noise) y, en meta, 10 · Math.round(totalS) (9-a); x.mishap

finish(fin):
  1. catálogo renumerado (4-a): el pelotón de salida el 0; los demás por (marca de nacimiento en Ds, bornB, id); todo GroupIx se traduce
  2. sucesos de estado: los grabados más un `mishap` por incidente de fin.output.incidents con pérdida (b = blockOf(km), el km del
     motor es el centro del bloque; lostDs = toDs(perdidaS); sin severidad ni diasBaja, D-13)
  3. meta: en línea, finishS ← cabeza[blocks − 1]; en crono, la llegada del último en salir. arrivals ← results con estado distinto
     de 'abandon' agrupados por tiempoS en Ds (en crono, startS + tiempoS), de menor a mayor
  4. pancartas: cada ProbeBanner a BannerResult (§4.2): revealS ← su tS; name ← el del puerto de fin.profile.climbs con la cima a menos
     de un bloque; order por RiderIx
  5. sucesos narrables, uno por fin.output.events[i] (source = i):
       bEmit ← bloqueDe[ese objeto]; si no lo vio (rider_defies_team), el bEmit del siguiente suceso que nombra a su protagonista;
       en crono, blocks
       revealS ← revealSOf(e, i, bEmit, vista) (§4.7), con la vista de abajo
     y un suceso sintetizado por MONTÓN de caídas (D-13): las de incidents con tipo 'caida' del mismo bloque b cuyos corredores iban en
     el mismo grupo al final de b − 1 → { source: −1, plantilla: 'crash', km: kmAt(b), bEmit: b, riders por RiderIx, datos: null },
     con tS = revealS (regla `incident`, §4.7). Todos, por revealS y, a igual hora, por source
  6. capa de detalle: la foto i de fin.radio.kms es la del i-ésimo bloque de radioBlocks (si no casan en número, falla); cada grupo j
     de radioGroupDetails(fin.radio)[i][j] a GroupDetail con el GroupIx del id que vivía en ese bloque
  7. crono: TimeTrialTrace (§4.2, §9) de las trazas, con order e intervalS de timeTrialStartOrder(fin.input.riders) (startOrder.ts
     l. 69 y 127) y checksKm de STAGE.ttSplitChecks (timetrial.ts l. 521-527); sus sucesos de percance, con la regla tt_own_clock
  8. devuelve la StageTimeline de §4.2: format TIMELINE.format, engineVersion ENGINE_VERSION, clock 'exact', cast, profile, weather

vista (RecorderView, §4.7) sobre lo grabado:
  groupAt(r, b): el grupo de r al final de b, por búsqueda binaria en sus `move` y `out`
  clockAt(g, b): relojEn(marcas de g, b) (§4.4); null si g no vivía en b
  headClockAt(b): cabeza[b];  finishS: el del paso 3;  blockOfKm: blockOf
  bannerAt(kind, km): la pancarta de ese tipo a menos de un bloque;  nextEmitOf(r, i): el bEmit del siguiente suceso de r tras el i
  ttStartS(r), ttOwnClockAt(r, km): de las trazas, interpolando entre km enteros
```

**Medido con el prototipo** (`l3/grabador.mjs`, 23 etapas en línea por 2 semillas, 176 o 126 corredores): el catálogo tiene de 11 a 157 grupos por etapa (mediana 64,5; estado midió como mucho 140), lejos del tope de 255 de la foto clave (4-i); de 5 a 24 vivos a la vez; ningún id reaparece tras morir en las 54 corridas (la regla de una entrada por vida queda para el caso que no se ha visto); de 418 a 3.617 marcas (mediana 1.624, las mismas cifras que §3.4) y de 40 a 3.836 cambios de grupo; I3 (las fotos clave son la reducción del estado) se cumple en todas, sobre lo ya codificado y descomprimido; y ningún suceso de `output.events` se queda sin bloque de emisión. El reparto, el perfil y el tiempo del prototipo son sintéticos con la forma de §4.2 (el reparto real es §7).

### 5.5 La autocomprobación al grabar

El grabador comprueba I1 en cada foto de km antes de que la línea se escriba, y si no se cumple la línea no se escribe (D-12, O-22, I-02). Es la defensa contra lo que el juez del motor señaló (O-motor-10): el motor cambia cada pocos días, sin aviso, y una etapa se quedaría sin retransmisión, o con una que miente, en silencio.

**`selfCheckI1` compara con la foto del motor, no con la radio guardada.** Para cada bloque `b` de `kmPhotos` calcula `photoAt(tl, b)` (§4.4) y la compara con `radioKmFrom(kmAt(b), kmPhotos[b], riderIds.length, ∞, null, id de p.main)` (`raceRadio.ts` l. 239-351), que es la definición de I1 en §4.4: la foto del motor proyectada con el TÍTULO DE LA LÍNEA. La radio que ya construye el colector no sirve de referencia: hereda el título del km anterior y la línea el del bloque anterior, y difieren en 4 de 3.246 fotos en las que la línea tiene razón (D-03). Por eso `selfCheckI1` recibe las fotos del motor (`readonly SnapshotRider[]`) y no un `RadioKm` ya hecho, como decía §G.4 (decisión 5-i).

**La tolerancia del reloj igual se extiende al `kind`.** §4.4 admite que dos grupos con el mismo reloj en Ds cambien de puesto. Pero el `kind` de un grupo por delante del pelotón depende del puesto (`kindOf`, `raceRadio.ts` l. 361-383: el primero es `fuga` y los demás `contra`), así que un empate en décimas cambia también su `kind`. Medido con el prototipo: sin esta tolerancia, **1 discrepancia en 8.656 fotos** (`race-italy` e9, semilla 1, km 161,05: `mov-18` y `shed-3` pasan a 13.368,05 y 13.368,02 s, los dos 133.680 Ds; la radio ordena por el reloj en coma flotante y llama `fuga` a `shed-3`, y la proyección, por Ds e id, al revés); con ella, **0 de 8.656**. Esa sola foto habría dejado la etapa sin retransmisión. `selfCheckI1` compara por TRAMOS de igual reloj en Ds: en cada tramo, los mismos ids; en cada id, los miembros como conjunto, el tamaño y `gapS` a 0,1 s; los `kind` del tramo, como multiconjunto; y `racing`, `gone` y `mainId` iguales. Cada diferencia es un `I1Mismatch` (§4.4). Cuesta de 6 a 25 ms por etapa (mediana 14, prototipo; `estado.md` §11 midió de 15 a 24).

**En crono, I5.** Una crono no tiene fotos, y lo que puede desviarse sin aviso es la traza: si el motor sumara al tiempo algo fuera de `raw · noise` (hoy solo el percance, `timetrial.ts` l. 312), la traza dejaría de cuadrar con `results`. `selfCheckI5` exige `kmClockDs[r].at(−1) = 10 · tiempoS` para todo corredor, una igualdad porque la última entrada de la traza es `10 · Math.round(tS)` (9-a, 16-c; 1.176 de 1.176 medidos, 5.2) y, si falla, el camino es el mismo que el de I1 (decisión 5-j).

**Si falla, la etapa se queda sin línea y lo dice.** El cierre y la escritura van en `recordStageTimeline` (`packages/db/src/timelines.ts`), que `runOneStage` llama justo después de escribir `stage_snapshots` (hoy l. 570-595), dentro de la transacción del día y en un punto de guardado propio (`tx.transaction`, que drizzle 0.45 con postgres.js hace con `SAVEPOINT`): un fallo de la grabación deshace solo la grabación y nunca la transacción del día, que es atómica por diseño (`tick.ts` l. 259-262).

```
recordStageTimeline(tx, run, log, ctx):                                    ctx: spec, input, output, seed, gameDay, radio completa
  en un punto de guardado:
    si run.failure(): lanza ese error
    cast ← buildTimelineCast(tx, …)                                        §7 (D-15)
    tl ← run.recorder.finish({ input, output, radio: crono ? null : radio, cast,
                               profile: profileStripOf(input.profile, { raceId, stageDay }), weather: freezeStageWeather(input, seed) })
    fallos ← crono ? selfCheckI5(tl, output) : selfCheckI1(tl, run.recorder.kmPhotos)
    si fallos: writeStageTimelineFailure(sp, meta, { reason: crono ? 'I5' : 'I1', mismatches: los 20 primeros })
               log.failed(`timeline I1: ${raceKey} e${stageDay} km ${km del primero}`)          (I5: `timeline I5: … rider …`)
    si no:     { bytes } ← writeStageTimeline(sp, tl, meta)
               log.recorded(bytes > TIMELINE.maxStoredBytes ? `timeline size: ${raceKey} e${stageDay} ${bytes}` : null)   (15-g)
  si algo lanza (TimelineFormatError del grabador o de encodeTimeline, o cualquier otro error):
    en otro punto de guardado, writeStageTimelineFailure(sp, meta, { reason: 'format' | 'error', message: los 200 primeros caracteres })
    log.failed(`timeline error: ${raceKey} e${stageDay} ${mensaje}`)
```

La fila que se escribe cuando falla es una **lápida**: una fila de `stage_timelines` con `format = 0` y, en `body`, el gzip del motivo y de las primeras discrepancias, que el dueño puede leer (§13.3). Sin ella, la API no podría distinguir «esta etapa falló al grabarse» de «esta etapa se corrió antes del paso 5», y por D-07 serviría la segunda con el adaptador de la radio: D-12 dice lo contrario, que la etapa abre solo en `Report` con `Broadcast unavailable for this stage` (pantalla). Con la lápida, `readStageTimeline` lanza `TimelineUnavailableError` y la ruta de §14.4 hace exactamente eso; sin fila, sirve el adaptador (decisión 5-k).

**La nota y el contador van a `tick_log.notes`** (`packages/db/src/schema.ts` l. 156-173), la columna que el panel de administración ya enseña (`adminStats.ts` l. 61). `runTick` escribe una fila por ejecución al final (`tick.ts` l. 333-348) y `runOneStage` no la ve, así que el camino es un diario por tick que baja hasta la etapa por el mismo sitio que `cargaDelDia` (`stageRun.ts` l. 107-128), el acumulador con que la semietapa cruza de una llamada a otra:

```ts
// packages/db/src/timelines.ts
/** El diario de grabación de un tick (D-12). Lo crea runTick si TIMELINE_RECORD=on; baja por CalendarDayOptions.timeline y por
 *  StageRunSpec.timeline hasta runOneStage. Sin él, la etapa se corre con la envoltura de hoy y no se graba. */
export interface TimelineTickLog {
  recorded(sizeNote: string | null): void
  failed(note: string): void
  /** Para tick_log.notes: `timeline: 312 grabadas, 1 sin línea` y detrás las notas, 20 como mucho (`… y 7 más`); null si no hubo etapas. */
  summary(): string | null
}
export function timelineTickLog(): TimelineTickLog

// packages/db/src/tick.ts
export interface RunTickOptions { /* … lo de hoy (l. 60-72) … */ readonly timelineRecord: 'off' | 'on' }
// en runTick: const timelineLog = opts.timelineRecord === 'on' ? timelineTickLog() : undefined
//   raceWorldDay(tx, worldId, next, seed, timelineLog) y runCalendarDay(tx, worldId, next, seed, { repairWorld, timeline: timelineLog })
//   notas de l. 337-347: [notaE1, timelineLog?.summary() ?? null, capped ? … : …]
// packages/db/src/stageRun.ts: StageRunSpec gana `timeline?: TimelineTickLog`; packages/db/src/calendarRun.ts: CalendarDayOptions también
```

Los cuatro sitios que llaman a `runTick` pasan `timelineRecord` desde su entorno: `apps/api/src/tick/main.ts` l. 11 (el cron) y `apps/api/src/index.ts` l. 38, 45 y 67 (el avance a mano de `/admin/tick`), que es por lo que el interruptor vive en `envSchema` y en `tickEnvSchema` (`apps/api/src/env.ts` l. 20 y 65; su cableado entero es §14.6). **`TIMELINE_RECORD=off`** apaga la grabación sin desplegar si el tick se resiente: no se crea el diario, la envoltura es la de hoy y las etapas de esos días quedan sin fila, con lo que abren con el adaptador de la radio (D-07), no con la lápida. El interruptor no tiene evidencia de los jueces (D-12): lo justifica el coste de 5.8 y lo mide B15 en el paso 5.

### 5.6 La codificación y la escritura

La línea se guarda en la tabla nueva `stage_timelines` (su DDL es §13.3), una fila por etapa, 1:1 con `stage_snapshots` y en la misma transacción (D-10, I-09). `body` es el gzip de nivel `TIMELINE.gzipLevel` (9) del JSON de `StoredTimelineV1` (§4.3), en `bytea`; el gzip lo pone `packages/db` porque el motor no importa Node. Todo lo de esta subsección vive en `packages/db/src/timelines.ts`:

```ts
// packages/db/src/timelines.ts (sigue a 5.3 y 5.5)
import { gunzipSync, gzipSync } from 'node:zlib'
import { ENGINE_VERSION, TIMELINE } from '@cyclingstar/engine'
import { BROADCAST, decodeTimeline, encodeTimeline, type StageTimeline } from '@cyclingstar/shared'
import { and, eq } from 'drizzle-orm'
import type { Database } from './client.js'
import { type Horizon, isVeiled } from './horizon.js'
import { stageTimelines } from './schema.js'

/** La etapa de la fila y el día de juego en que se corrió: ninguna otra tabla de etapa lo guarda (mapa 04 §0, punto 2). */
export interface StageTimelineMeta { readonly raceKey: string; readonly stageDay: number; readonly gameDay: number }
/** `format` de una LÁPIDA: la etapa se corrió con la grabación encendida y no dejó línea (5.5). Las líneas llevan TIMELINE.format (1). */
export const TIMELINE_TOMBSTONE_FORMAT = 0
export type TimelineFailureReason = 'I1' | 'I5' | 'format' | 'error'
export interface TimelineFailure {
  readonly reason: TimelineFailureReason
  readonly message?: string                    // los 200 primeros caracteres del error, en 'format' y 'error'
  readonly mismatches?: readonly unknown[]     // los 20 primeros I1Mismatch, o los de I5
}

/** Escribe la línea. Devuelve lo que ocupa, para la nota de tamaño (15-g) y para B6. Idempotente como stage_snapshots. */
export async function writeStageTimeline(tx: Tx, tl: StageTimeline, meta: StageTimelineMeta): Promise<{ readonly bytes: number; readonly jsonBytes: number }> {
  const json = Buffer.from(JSON.stringify(encodeTimeline(tl)))
  const body = gzipSync(json, { level: TIMELINE.gzipLevel })
  await tx.insert(stageTimelines).values({
    raceId: meta.raceKey, stageDay: meta.stageDay, gameDay: meta.gameDay,
    format: tl.format, engineVersion: tl.engineVersion,
    finishS: Math.ceil(tl.finish.finishS),     // en segundos enteros y hacia arriba: nada de la carrera pasa de aquí
    bytes: body.length, body,
  }).onConflictDoNothing()
  return { bytes: body.length, jsonBytes: json.length }
}

/** Escribe la lápida: el motivo y las primeras discrepancias, legibles por el dueño con `gunzip` (5.5). */
export async function writeStageTimelineFailure(tx: Tx, meta: StageTimelineMeta, failure: TimelineFailure): Promise<void> {
  const body = gzipSync(Buffer.from(JSON.stringify({ format: TIMELINE_TOMBSTONE_FORMAT, ...failure })), { level: TIMELINE.gzipLevel })
  await tx.insert(stageTimelines).values({
    raceId: meta.raceKey, stageDay: meta.stageDay, gameDay: meta.gameDay,
    format: TIMELINE_TOMBSTONE_FORMAT, engineVersion: ENGINE_VERSION, finishS: 0, bytes: body.length, body,
  }).onConflictDoNothing()
}

/** La etapa tiene lápida o su cuerpo no se deja decodificar: abre solo en `Report` (D-12, §14.4). */
export class TimelineUnavailableError extends Error {
  constructor(readonly raceKey: string, readonly stageDay: number, readonly reason: TimelineFailureReason | 'decode') {
    super(`stage_timelines: ${raceKey} e${stageDay} sin línea (${reason})`)
  }
}

/** Lo que devuelve una lectura: la línea entera y si ESTE espectador conoce la etapa. El corte lo hace quien sirve (D-06, §14.3). */
export interface StageTimelineRead { readonly timeline: StageTimeline; readonly known: boolean }

/** LRU de líneas decodificadas en el proceso de la API (D-10): el dato es inmutable, así que no se invalida nunca. */
const decoded = new Map<string, StageTimeline | TimelineUnavailableError>()

/** `stage_timelines` es una fuente de D-32: el Horizon es obligatorio y la respuesta lleva el velo de esa etapa. null: la etapa no
 *  tiene fila, que es una etapa corrida antes del paso 5 o con TIMELINE_RECORD=off: quien llama sirve el adaptador (D-07). */
export async function readStageTimeline(db: Database, h: Horizon, raceKey: string, stageDay: number): Promise<StageTimelineRead | null> {
  const key = `${raceKey}|${stageDay}`
  let tl = decoded.get(key)
  if (tl === undefined) {
    const [row] = await db.select({ format: stageTimelines.format, body: stageTimelines.body }).from(stageTimelines)
      .where(and(eq(stageTimelines.raceId, raceKey), eq(stageTimelines.stageDay, stageDay)))
    if (!row) return null
    if (row.format === TIMELINE_TOMBSTONE_FORMAT) {
      const { reason } = JSON.parse(gunzipSync(row.body).toString('utf8')) as { readonly reason: TimelineFailureReason }
      tl = new TimelineUnavailableError(raceKey, stageDay, reason)
    } else {
      try { tl = decodeTimeline(JSON.parse(gunzipSync(row.body).toString('utf8'))) }   // Zod y un decodificador por format (§4.3, H-13)
      catch { tl = new TimelineUnavailableError(raceKey, stageDay, 'decode') }
    }
    decoded.set(key, tl)
    if (decoded.size > BROADCAST.decodedCacheEntries) decoded.delete(decoded.keys().next().value!)   // el más antiguo
  } else {
    decoded.delete(key); decoded.set(key, tl)                                                       // el más reciente al final
  }
  if (tl instanceof TimelineUnavailableError) throw tl
  return { timeline: tl, known: h.kind === 'world' || !isVeiled(h, raceKey, stageDay) }
}
/** Solo para los tests: cada base de PGlite reutiliza claves de carrera. */
export function clearStageTimelineCache(): void { decoded.clear() }
```

**Por qué `bytea` con gzip.** Con el mismo contenido, `bytea` gzip ocupa de 1,6 a 2,4 veces menos que `jsonb` y de 1,3 a 1,6 menos que `json`, porque `jsonb` guarda cada número como `numeric` y `pglz` comprime mal las listas de enteros (C8; O-15, X-07). Y es la única codificación que no depende de la compresión del servidor: PGlite (los tests, `testDb.ts`) no admite `lz4`, el CI usa `postgres:17-alpine` (`.github/workflows/ci.yml` l. 35 y 241) y la versión y la compresión TOAST de producción no están en el repositorio. Un `bytea` ya comprimido no lo recomprime TOAST, así que el tamaño de la línea es el que mide B6 en cualquier Postgres; eso deja de importar para la línea, pero no para la radio de hoy, que sigue en `jsonb` hasta DD-11 (H-15). Comprobado aquí (`l3/aplicar.mjs`): con las migraciones de §13 aplicadas sobre PGlite por el mismo socket y el mismo postgres.js que `testDb.ts`, el `bytea` vuelve como `Buffer` y byte a byte igual, que es lo que declara el tipo de la columna (§13.3).

**El LRU.** `BROADCAST.decodedCacheEntries` (16, decisión 18-d) líneas decodificadas por proceso de la API (D-10). Medido (`l3/lru.mjs`, sobre las líneas del prototipo): descomprimir, parsear y decodificar una línea cuesta de 2,7 ms (`race-france` e7) a 7,1 ms (e20), sin el `parse` de Zod, que `datos.md` §10.5 midió de 0,8 a 6 ms para el corte entero; y una línea decodificada, con la forma de §4.2 (`Int16Array` en las fotos clave, un objeto por suceso, `Map` por bloque de detalle), ocupa de 534 KB a 1,9 MB de memoria. Con 64 entradas serían de 33 a 121 MB, no los «unos 20 MB» que se estimaban; por eso son 16, de 8 a 30 MB (18-d, §15.3, §18.2). La lápida también se guarda en el LRU, para no volver a leerla en cada petición.

### 5.7 Los tamaños, cada cifra con lo que mide

Las cuatro cifras de las propuestas son ciertas y miden objetos distintos, salvo la de producto en disco (D-11, C7, X-06). Ninguna mide el formato que este documento guarda, que es el de §4.3 (el modelo de estado de `estado.md` con la codificación en enteros de `datos.md`), así que aquí se ha medido con el prototipo de 5.4 (las filas nuevas):

| Cifra | De | Qué mide | Veredicto |
| --- | --- | --- | --- |
| 17,5 KB de mediana (8 a 23) | `datos.md` §10.5 | la línea de `datos` (pertenencia en carreras por corredor, estado por series de grupo, relevo crudo) en `bytea` gzip, en disco, 28 etapas en línea | cierta (C7) |
| 5,5 a 39 KB | `estado.md` §3.8 | la línea de `estado` con capa de detalle, como `json` en disco (PGlite, `pglz`), 5 etapas × 3 semillas | cierta |
| +52 a 74 KB | `ingeniero.md` §10.3 | el JSON que se añadiría a la radio de hoy | cierta; en disco la radio crecería un 35-66 % |
| 106 a 178 KB | `producto.md` §3.5 | la retransmisión SERVIDA entera en JSON, no lo guardado | cierta como red; su «3-9 KB en disco» es falsa: +4,7 a +53 KB en `jsonb` |
| 126-559 KB en JSON, 10,7-146,4 KB en `jsonb` | juez del motor §2.1 | la radio de hoy | referencia |
| **20,9 a 70,0 KB; mediana 38,8, p90 53,3** | medido aquí, `l3/grabador.mjs` | **`StoredTimelineV1` (§4.3) en `bytea` gzip 9**, 23 etapas en línea × 2 semillas, 176 o 126 corredores | nueva |
| 123 a 464 KB; mediana 222 | idem | el mismo `StoredTimelineV1` en JSON, antes del gzip | nueva |
| 18,8 a 23,0 KB | idem | la línea de un nacional en línea de 40 corredores (`nc-es-road`) | nueva |
| 18,8 a 24,2 KB (176) y 7,2 a 7,5 KB (40) | idem | la línea de una crono, con su traza (`race-france` e1 y e16, `nc-es-itt`) | nueva |

Por tipo de etapa (mediana de `bytea` gzip, 176 corredores): llana 22,7 KB, media 35,6, reina 47,7 y clásica 44,9. Dónde se va el peso, en `bytea` gzip y con la semilla 0:

| Etapa | JSON (s0 / s1) | `bytea` gzip (s0 / s1) | Marcas | Cambios de grupo | Grupos | Marcas `clocks` | Detalle | Reparto | `moves` | Sucesos | `riderIds` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `race-france` e7, llana | 148,6 / 144,9 | 22,5 / 23,5 | 585 | 73 | 17 | 2,9 | 3,7 | 7,6 | 0,2 | 2,2 | 3,5 |
| `race-france` e13, media | 214,0 / 202,0 | 36,6 / 34,7 | 1.460 | 1.109 | 57 | 7,4 | 7,2 | 7,6 | 2,5 | 3,9 | 3,5 |
| `race-france` e18, reina | 269,0 / 216,7 | 48,4 / 39,3 | 2.254 | 2.475 | 73 | 11,5 | 10,6 | 7,6 | 5,6 | 3,7 | 3,5 |
| `race-france` e20, reina | 463,7 / 443,9 | 70,0 / 67,5 | 3.350 | 3.836 | 157 | 17,2 | 18,3 | 7,6 | 9,4 | 6,0 | 3,5 |
| `race-flanders`, clásica | 268,0 / 254,9 | 46,4 / 43,4 | 1.992 | 3.602 | 96 | 10,3 | 9,1 | 6,2 | 7,0 | 4,6 | 3,5 |
| `race-colombia` e5, 126 c. | 411,0 / 364,6 | 62,3 / 50,7 | 3.617 | 1.790 | 130 | 18,8 | 18,7 | 5,6 | 4,4 | 5,3 | 2,5 |
| `nc-es-road`, 40 c. | 125,4 / 90,3 | 23,0 / 18,8 | 1.446 | 810 | 60 | 7,3 | 6,1 | 1,6 | 1,7 | 2,3 | 0,8 |

(KB; las seis últimas columnas, el gzip de cada campo por separado.) Tres partes pesan casi igual: las marcas de reloj, porque `clocks` guarda relojes absolutos en Ds (números de cinco y seis cifras que gzip no comprime) y hay de 500 a 3.600; la capa de detalle de la radio; y el reparto con sus ids, porque un uuid de 36 caracteres no comprime y va dos veces (en `riderIds` y en cada `CastRider.riderId`, más de 32 KB de JSON más atrás, fuera de la ventana de gzip). Medidas dos variantes que no cambian lo que se guarda: con las marcas en diferencias por grupo, la mediana baja de 38,8 a 33,9 KB; sin repetir el id en el reparto, a 34,9; con las dos, a 29,8, pero el máximo sigue en 56,6 KB (`race-france` e20).

**Los topes** (§15.2, D-11): `TIMELINE.maxStoredBytes` 98.304 (96 KB) por etapa en línea, 1,4 veces el máximo medido; `maxJsonBytes` 655.360 (640 KB) de JSON como máximo y `medianJsonBytes` 262.144 (256 KB) de mediana; `ttMaxStoredBytes` 32.768 (32 KB) por crono. Son umbrales de B6 y no de escritura (15-g): una línea mayor se escribe igual y deja `timeline size: <raceKey> e<N> <bytes>` en la nota del tick. Se fijaron con lo medido aquí, porque el formato de §4.3 no cabía en los de la síntesis (48, 128, 64 y 16 KB), que salían de las cifras de `datos.md` y `estado.md` y medían otros formatos: 10 de las 46 corridas en línea pasaban de 48 KB (hasta 70,0), 45 de 46 de 128 KB de JSON (hasta 464), la mediana del JSON es 222 KB y no 64, y las cuatro cronos de 176 corredores pasaban de 16 KB (hasta 24,2). Con aquellos, B6 habría nacido en rojo y el tick habría apuntado una nota de tamaño en una de cada cinco etapas grandes.

**Por temporada.** La primera versión de D-11 estimaba de 11 a 20 MB de `stage_timelines` con las medianas de `datos.md` y las 1.418 etapas, contra unos 40 MB de radio en disco (mapa 04 §5). Con las medianas medidas del formato de §4.3 por tipo, suponiendo 176 corredores en todas las etapas que no son nacionales (cota superior: los campos .2 son de 112, mapa 04 §5), sale del orden de **36 MB**: 233 llanas × 22,7 KB, 373 medias × 35,6, 140 reinas × 47,7, 63 clásicas × 44,9, 77 cronos × 21,5, 266 nacionales en línea × 20,9 y 266 cronos nacionales × 7,2 (estimado). Es del orden de la radio de hoy, no la mitad: dejar de escribir la radio (DD-11) ahorra sus 40 MB, pero la línea los vuelve a ocupar casi enteros.

### 5.8 El coste de CPU

| Pieza | Medida | Fuente |
| --- | --- | --- |
| la sonda en cada bloque, sin grabador | de −7,7 a +11,6 % del tiempo de simular, mediana +3,8 % (máquina compartida) | juez del motor, C6 |
| el grabador por foto (`onSnapshot`), etapa de 176 o 126 | de 30 a 73 ms por etapa, mediana 49 | aquí, `l3/grabador.mjs`, 46 corridas |
| el cierre (`finish`: catálogo, sucesos, detalle, reparto y paso a JSON) | de 17 a 57 ms, mediana 33 | idem |
| el gzip 9 | de 2,8 a 27,8 ms, mediana 7,1 (C6: de 3 a 15) | idem y C6 |
| `selfCheckI1` | de 6 a 25 ms, mediana 14 (`estado.md` §11: de 15 a 24) | idem |
| un nacional de 40 corredores | grabador de 11 a 14 ms y cierre de 9 a 12 | idem |
| simular la etapa con todo lo anterior | de 1,36 a 3,77 s, mediana 2,41 | idem |

En una etapa grande, E2 suma del orden de 100 ms a unos 2,4 s de simular (un 4 %). El juez del motor midió un grabador de diferencias más sencillo, sin cierre, en 38-51 ms por etapa grande y 8 ms por nacional (C6); el prototipo es JavaScript sin optimizar, así que las cifras de producción deberían ser de ese orden o menores. **Los días pico** son los de C15: el día 176 corre 187 cronos nacionales (de 11 a 30 ms cada una) y el 179, 153 nacionales en línea (de 0,3 a 0,8 s cada uno). Con las medidas de aquí, el 179 gana del orden de 40 a 65 ms por nacional (grabador, cierre, gzip, I1 y el sobrecoste de la sonda), de 6 a 10 s ese día; el 176, unos milisegundos por crono (solo la traza), menos de un segundo (estimado; el juez estimó de 2 a 8 s). Medido después con el prototipo por §18.3 (`l7/tick.mjs`, dos corridas): el 179 suma de 15,5 a 18,9 s (de un 15 a un 17 % del día), casi el doble de lo estimado aquí, porque en un nacional de 40 corredores el grabador, el cierre e I1 pesan más en proporción; el 176, de 0,7 a 0,8 s. Lo mide B15 en el paso 5 con el grabador y la escritura reales (§16.4, §18.3), y `TIMELINE_RECORD=off` es el freno sin desplegar (5.5).

### 5.9 Lo que el motor no gana

- **Ningún suceso nuevo ni ningún campo nuevo en un suceso**: ni `crash` (las caídas salen de `output.incidents`, D-13), ni `aT` o `knownS` en la fuga (lo da `onEvent`), ni un reloj nuevo para `climb_kom` ni podios en las pancartas (lo da `onBanner`), ni pinchazos de crono con reloj de carrera (lo da `onTimeTrialRide`). Por eso no hay que re-sellar ningún test de sucesos ni tocar el tope de 100 líneas narrables (`simulate.test.ts` l. 1383-1410; D-13).
- **`StageOutput` no gana campos** (Frontera 3 de la táctica: «Ninguna pieza nueva escribe estado que sobreviva a la etapa.», `docs/tactica.md` l. 246-247): lo nuevo sale por la sonda, que es observación, igual que salió `pullFor` (`tactica.md` l. 8643).
- **La radio guardada se escribe igual hasta el paso 11** (D-16): el único cambio en `raceRadio.ts` es la extracción de `radioGroupDetails` y dos `export` (`STORED_PULLERS_MAX` aquí y `NAME_WHOLE_GROUP_UP_TO` en 15-c), que no cambian un byte de `stage_snapshots.radio`.
- **El índice del motor** (`packages/engine/src/index.ts`) gana las exportaciones que `packages/db` necesita: `TIMELINE` (l. 9-19), `timelineRecorder`, `selfCheckI1`, `selfCheckI5`, `profileStripOf`, `freezeStageWeather`, `radioGroupDetails`, `STORED_PULLERS_MAX` y los tipos `StageProbe`, `SnapshotRider`, `ProbeBanner`, `ProbeTimeTrialRide`, `TimelineRecorder` y `RecorderFinishInput`; hoy `StageProbe` y `SnapshotRider` no están en su lista de tipos (l. 267-296). Gana además `realRaceScenario` (hoy sin exportar, `sim/scenarios.ts` l. 518), que B10 importa desde `packages/db` (decisión 17-j).
- **Los ganchos no se usan para nada más**: la radio de hoy no recibe `onEvent`, `onBanner` ni `onTimeTrialRide`, y el aprendizaje sigue mirando solo las fotos de radio (5.3).

### 5.10 Las condiciones que lo sellan

Dos bancos, enunciados aquí; los tests enteros son §16.4.

- **B10 · la foto por km y el aprendizaje.** Con la envoltura de 5.3 y la grabación encendida, `trabajaronParaOtro` y la radio guardada (`radioForStorage` de la radio del colector) son iguales, byte a byte, a los de la envoltura de hoy, en las 22 etapas en línea de las 24 del mapa 07 §7 (una crono no tiene fotos de radio). Medido aquí en 18 de 18 corridas (5.3); la envoltura ingenua lo rompe en 6 de 18.
- **B11 · observar no toca la carrera.** Con foto en cada bloque, `onEvent`, `onBanner` y `onTimeTrialRide`, `results`, `events`, `efforts` e `incidents` son iguales, enteros, a los de la etapa sin sonda, cronos incluidas. Medido: 20 de 20 por el juez sin los ganchos (C5) y 24 de 24 aquí con ellos (5.1). Es la extensión del test «la radio no toca la carrera» (`packages/engine/src/sim/raceRadio.test.ts` l. 748-799), que hoy solo compara la huella `puesto:id:tiempo` con la sonda de la radio.

Y tres invariantes que el grabador cumple y §16.2 prueba: I1 (0 discrepancias en 8.656 fotos con la tolerancia de 5.5), I3 (0 en las 46 corridas) e I5 (1.176 de 1.176 corredores). Como `packages/engine/src/sim/**` no corre en `test:rapido` (`package.json` l. 21), `timeline.test.ts` entra en el tramo de bancos «mundo y radio» (15-d), y un cambio en `packages/shared/src/broadcast/` que cambie lo grabado lo cazan I1 e I3 en la suite rápida (D-52, §15.5).

---

**Injertos aplicados.** I-02 (§5.5: `selfCheckI1` al grabar, con la tolerancia medida; §5.10), I-03 (§5.4: las marcas de los cuatro sitios en el grabador), I-06 (§5.2: `onEvent` y el oyente de `EventLog`; §5.4: `bEmit` por identidad), I-09 (§5.6: `stage_timelines.body` en `bytea` con gzip 9, `game_day`, `format`, `engine_version`, `finish_s`, `bytes` y el LRU), I-12 (§5.3: el colector aparte, medido; §5.10: B10 y B11), I-18 (§5.2: `onBanner` en `disputeBanner` y `disputeClimb`), I-19 (§5.4: `freezeStageWeather`), I-20 (§5.4: `revealSOf` con `REVEAL_RULES` al cerrar, y las caídas sintetizadas desde `incidents` sin días de baja).

**Objeciones resueltas.** O-01 (§5.3: fotos finas por un canal aparte; la envoltura ingenua cambia el aprendizaje en 6 de 18 corridas), O-05 (§5.1: la tabla de lo que subía la versión y el gancho que lo da sin subirla; la regla del 17d), O-15 (§5.6: `bytea` gzip y por qué), O-22 (§5.5: nota en `tick_log.notes`, contador, lápida y `Report`).

**Huecos rellenados.** H-02 (§5.1: ninguna subida en E2 y toda subida detrás del 17d; la corrección de `balance.md` es del paso 12), H-13 (§5.4: el grabador usa la guarda de §4.3; §5.6: `readStageTimeline` decodifica por `format` con `decodeTimeline`), H-15 (§5.6: con `bytea` gzip la compresión TOAST deja de importar para la línea; queda sin comprobar para la radio de hoy). Contradicciones de hecho que quedan resueltas: X-03 y X-04 (§5.1), X-06 (§5.7), X-07 (§5.6), X-08 (§5.8), X-09 (§5.1, §5.10), X-10 (§5.3) y X-15 (§5.2 y §5.4: `bEmit` por `onEvent` para la fecha (a) y el reloj del primero que puntúa por `onBanner` para la (f)).

**Decisión tomada aquí.**
- 5-a. `onEvent` recibe el índice del bucle (`bloqueDeEmision`): 0 antes del bucle, `i` en el bloque `i`, `blocks` después. Descartado: contar fotos (`estado.md` §11), que ata el bloque a qué bloques se fotografían. La crono no lo llama; sus sucesos llevan `bEmit = blocks`.
- 5-b. `onBanner` recibe `ProbeBanner`: ids, solo los que puntúan, y el reloj del grupo del primero que puntúa (en la cima, el de `disputan[0]`, con un mapa que se llena al ordenar y no tira dados). Solo se llama si alguien puntúa.
- 5-c. `onTimeTrialRide` recibe `ProbeTimeTrialRide` con la traza sin copiar, el ruido, el tiempo final y el percance; el grabador calcula `kmClockDs` como `raw · noise` al final de cada km entero y `totalS` en meta (I5 medido, 1.176 de 1.176).
- 5-d. El colector aparte es `startStageTimeline` en `packages/db/src/timelines.ts`, con el despacho por índice sobre `photoBlocksOf`; el grabador va envuelto y un fallo suyo lo apaga, sin llegar nunca al motor; la radio va fuera de la envoltura, como hoy.
- 5-e. `timelineRecorder` recibe también `lengthKm` y `timeTrial` (`TimelineRecorderOptions`); las fotos clave van en `blockOf(10k)` para `10k < lengthKm` y en `blockOf(lengthKm − 1)`.
- 5-f. El catálogo tiene una entrada por VIDA de un grupo: un id que reaparece tras morir abre otra (0 casos en 54 corridas, pero el motor no lo prohíbe).
- 5-g. La capa de detalle sale de `radioGroupDetails`, extraída de `radioForStorage` en el PR 4b sin cambiar lo guardado; la línea guarda los `STORED_PULLERS_MAX` primeros de `relevan` y nunca la lista de seguimiento.
- 5-h. Una caída sintetizada por montón: los de un mismo bloque que iban en el mismo grupo al final del bloque anterior, con `datos: null`.
- 5-i. `selfCheckI1` recibe las fotos del motor (`SnapshotRider[]`) y calcula lo esperado con el título de la línea; la tolerancia de igual reloj en Ds se extiende al `kind` (medido: 1 fallo en 8.656 fotos sin ella, 0 con ella). Cambia la firma de §G.4.
- 5-j. En crono, `selfCheckI5` por el mismo camino. Descartado: guardar una crono sin comprobar nada.
- 5-k. La lápida: una fila de `stage_timelines` con `format = 0` cuando la grabación falla, y `readStageTimeline` lanza `TimelineUnavailableError`; sin fila, el adaptador (D-07). Es lo que hace cierta la salida de D-12.
- 5-l. Todo lo que la grabación escribe va en un punto de guardado (`tx.transaction`) dentro de la transacción del día.
- 5-m. `TimelineTickLog` baja de `runTick` a `runOneStage` como `cargaDelDia`; `RunTickOptions.timelineRecord`; las notas `timeline I1:`, `timeline I5:`, `timeline error:` y `timeline size:`, 20 como mucho por tick, y el resumen `timeline: N grabadas, M sin línea`.
- 5-n. `FinishRecord.arrivals` incluye a los fuera de control (`estado` `dnf`), que cruzaron la línea; `finish_s` es `Math.ceil(finishS)`.
- 5-o. `profileStripOf` y `freezeStageWeather` son funciones puras del motor, en `sim/timeline.ts`, porque usan `STAGE_FEATURES`, las funciones de `weather.ts` y el interruptor del clima; las llama `packages/db` al cerrar y las puede llamar la API para el adaptador de la radio.
- 5-p. `readStageTimeline` recibe el `Horizon` (D-32 pone `stage_timelines` entre sus fuentes) y devuelve la línea con `known`; el LRU de D-10 vive en `packages/db/src/timelines.ts`, dentro del proceso de la API, con `clearStageTimelineCache` para los tests. Cambia la firma de §G.4.

**Propuesto para el glosario.**
- En `packages/engine/src/stage/types.ts`: `ProbeBanner` (lo que recibe `onBanner`) y `ProbeTimeTrialRide` (lo que recibe `onTimeTrialRide`).
- En `packages/engine/src/sim/timeline.ts`: `TimelineRecorderOptions` (las opciones de `timelineRecorder`), `profileStripOf` (el perfil congelado), `freezeStageWeather` (el tiempo congelado) y `selfCheckI5` (I5 al grabar una crono).
- En `packages/engine/src/sim/raceRadio.ts`: `RadioGroupDetail` y `radioGroupDetails` (la capa de detalle antes de indexar, compartida por la radio y el grabador) y el `export` de `STORED_PULLERS_MAX`.
- En `packages/db/src/timelines.ts`: `startStageTimeline` y `StageTimelineRun` (el colector aparte), `recordStageTimeline` (cierre, autocomprobación y escritura), `TimelineTickLog` y `timelineTickLog` (el diario de grabación del tick), `StageTimelineMeta`, `writeStageTimelineFailure`, `TimelineFailure`, `TimelineFailureReason`, `TIMELINE_TOMBSTONE_FORMAT`, `TimelineUnavailableError`, `StageTimelineRead` y `clearStageTimelineCache`.
- Campos nuevos: `StageRunSpec.timeline`, `CalendarDayOptions.timeline` y `RunTickOptions.timelineRecord`.
- En la prosa, «la lápida»: la fila de `stage_timelines` con `format = 0` de una etapa que se corrió con la grabación encendida y no dejó línea.

**Dudas para el ensamblador.**
1. **Los topes de D-11 no casan con el formato de §4.3.** Medido: `bytea` gzip de 20,9 a 70,0 KB en línea (mediana 38,8; 10 de 46 corridas por encima de 48 KB), JSON de 123 a 464 KB (mediana 222; 45 de 46 por encima de 128 KB) y cronos de 176 corredores de 18,8 a 24,2 KB (todas por encima de 16 KB). Propuesta para §15.2: `maxStoredBytes` 98.304 (96 KB, 1,4 veces el máximo medido), `maxJsonBytes` 655.360 (640 KB), `medianJsonBytes` 262.144 (256 KB) y `ttMaxStoredBytes` 32.768 (32 KB). Aligerar §4.3 (marcas en diferencias por grupo, el reparto sin repetir el id) baja la mediana a 29,8 KB pero no el máximo por debajo de 48.
2. **El volumen por temporada**: con el formato medido, del orden de 36 MB (cota superior), no de 11 a 20 (D-11, §13.8, DD-11 en §20).
3. **La memoria del LRU**: 64 líneas decodificadas son de 33 a 121 MB, no unos 20 MB (§15.3). Propuesta: `decodedCacheEntries` 16 (de 8 a 30 MB), o un tope por bytes; lo mide §18.2.
4. **La regla `emit` de §4.7 y la `incident` retrasan los sucesos de quien cambia de grupo en su bloque**, porque `groupAt(r, b)` es su grupo AL FINAL del bloque. Medido (`l3/grabador.mjs`): las 627 caídas de 13 etapas por 3 semillas sacan al caído de su grupo en el mismo bloque, y el rótulo `CRASH` saldría 70,6 s tarde de mediana (p90 136 s, máximo 290 s) respecto del paso del grupo en que iba; 70 de 74 pinchazos y averías de carretera, lo mismo, 141,6 s de mediana (p90 329 s, máximo 373 s). Propuesta: en `emit` e `incident`, el grupo de `r` al final de `b − 1`, el que llevaba al empezar el bloque; en un ataque la diferencia es de segundos.
5. **I1 en §4.4 y en §16.2** necesita la tolerancia de 5.5: con la definición literal, `race-italy` e9 (semilla 1) se queda sin línea por dos grupos a 28 ms.
6. **Firmas de §G.4 que cambian aquí**: `timelineRecorder(opts: TimelineRecorderOptions)` (con `lengthKm` y `timeTrial`), `selfCheckI1(tl, kmPhotos: ReadonlyMap<Block, readonly SnapshotRider[]>)` y `readStageTimeline(db, h, raceKey, stageDay): Promise<StageTimelineRead | null>`, que además lanza `TimelineUnavailableError`. §14.4 (`timelineForStage`) debe pasarle el horizonte del espectador (o `worldHorizon` en el modo diagnóstico) y tratar la excepción como `Broadcast unavailable for this stage`.
7. **B16 (§16.4) compara con `radioForStorage(radio, ∅, [])`**, sin lista de seguimiento, porque la línea no la guarda (5-g, D-16).
8. El encargo del lote nombra `apps/api/src/tick/stageRun.ts`, que no existe: la etapa se corre en `packages/db/src/stageRun.ts` y `apps/api/src/tick/main.ts` solo llama a `runTick`.
