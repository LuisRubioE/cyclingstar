## 12. La voz, el acta y las noticias

Esta sección escribe como hechos D-16, D-18 y de D-43 a D-48: la voz de `Watch` (pantalla), que nunca cuenta lo que todavía no ha pasado; el acta, que se lee después; el microscopio de la radio; las plantillas que faltan; un solo vocabulario de grupos; la semilla neutra, y las noticias con datos. Los tipos son de §4 (`LiveLine`, `NewsPayload`, `StageReadyItem`, `NameResolver`, `Variant`), las constantes de §15 (`BROADCAST.liveClusters`, `liveClusterWindowKm`, `liveClusterMin`, `crashNamesDelayS`, `trendWindowKm`, `trendMinS`, `bunchMinShare`), la ruta del tramo de §14.3 y la cola de rótulos de §6.5 y §6.6; aquí solo se citan. Las líneas son las de HEAD `9c21885`, y el código no ha cambiado desde entonces (`git diff --stat 9c21885 dc6cf4b -- apps packages scripts` vacío). Las medidas nuevas están en la carpeta `l8/` del scratchpad de la síntesis y no tocan el repositorio: `l8/voz.mjs` y `l8/voz2.mjs` miden la propiedad de prefijo con la hora de revelado real, sobre el prototipo del grabador de L3 (`l3/grabador.mjs`, copiado en `l8/grab.mjs`) y una copia del `dist` de `apps/api/src/chronicle.ts` con interruptores (`l8/chronicle.live.js`); `l8/rol.mjs` mide el papel del grupo del título en las líneas que dicen «the bunch», `l8/plantillas.mjs` cuenta con el AST de TypeScript las plantillas que emite el motor, y `l8/fuga.mjs` compara la regla de `breakaway_win` con la última foto de la radio (12.8). La corrección tras la refutación (fase 5, lote L8) volvió a comprobar cada línea de código citada en `21b36b1`, que solo añade `docs/` (`git diff --stat 9c21885 21b36b1 -- apps packages scripts .github` vacío), y compiló el bloque de 12.8 con el `tsconfig.base.json` del repositorio en `corr-l8/ws1`.

### 12.1 Un dato, tres productos y un nombre para cada uno

D-48, escrito como hecho. Del mismo dato de la etapa salen tres productos, y cada uno tiene un nombre en pantalla y solo uno. Hasta hoy la misma cosa se llamaba `Story`, «journal», «crónica» o «diario» según el fichero y la pantalla (contradicción 8 del mapa 05). La noticia es un cuarto producto, de otra forma: el titular de un hecho, no el relato de una etapa.

| Producto | En pantalla | Qué lee | Hasta dónde | Quién lo construye | Qué lo sella |
| --- | --- | --- | --- | --- | --- |
| la voz | las líneas de `Watch` (pantalla); la lista de lo ya dicho se despliega con `Commentary` | los sucesos de `stage_timelines` con su `revealS` (§4.2); en una etapa sin línea, los de `stage_snapshots.events` con el `revealS` del adaptador (§3.8) | lo revelado hasta el borde del tramo; lo de la meta, solo tras `BroadcastFinish` (D-06) | la ruta del tramo con `buildChronicle(…, { live })` (§14.3); el texto, la web con las plantillas de `apps/web/src/domain/stageJournal.ts` | B19, B7, B4 |
| el acta | `Report` (la pestaña `Story` se renombra) | los sucesos guardados de la etapa entera | todo, pero solo en una etapa conocida o dentro de `BroadcastFinish.report` | `buildChronicle` sin `live`, como hoy (`apps/api/src/routes/races.ts` l. 465-512) | `chronicle.test.ts` (62), `stageJournal.test.ts` (140), B4, B5 |
| el microscopio | `Race Radio` | `stage_snapshots.radio` con `buildRaceRadio` (`chronicle.ts` l. 1340) hasta el paso 11; desde el 11a, `radioFromTimeline` (12.10) | lo alcanzado (D-16) | la ruta de etapa y, desde el 11a, la línea | `raceRadio.test.ts` de la API (11), B16 |
| la noticia | `News`, `Recent news`, `History` | `news.data` y `news.seed` (§13.2); en las filas de antes de la `0043`, `news.text` | lo conocido: con velo, un `stage_ready` por etapa velada (§11.7) | `renderNews` al leer (12.8) | B4, B5 |

La voz y el acta comparten el renderizador: la misma `ChronicleEntry` pasa por `chronicleLine` (`stageJournal.ts` l. 307-309) con los 55 `case` de hoy y los de 12.5, así que una frase escrita para la voz queda escrita para el acta y B7 comprueba las dos a la vez. Lo que las separa es la entrada (truncada por `revealS`), el orden, cinco pasadas y lo que la web calla porque ya lo dice el estado (12.2). El microscopio no narra: enseña grupos, huecos y relevistas de un km de foto, y por eso su vocabulario de grupos es el de la barra (§6.3) y no el de las frases. D-48 habla de nombres de PANTALLA: en el código siguen `stageJournal.ts`, `chronicle.ts`, `ChronicleEntry` y `buildChronicle`, porque renombrarlos toca trece ficheros de `apps` y `packages` (grep) sin nada que ganar para quien juega; en la prosa de este documento, «la voz» y «el acta».

### 12.2 La voz causal

D-43, escrito como hecho (I-43, O-02). La voz es `buildChronicle(events, names, { live: { untilS, stageKm, revealS } })` y ninguna de sus pasadas se reescribe: se trunca la entrada, se ordena por la hora en que cada cosa se sabe, la longitud de la etapa entra como dato y se apagan exactamente cinco pasadas, las que cambian o borran una línea ya dicha por algo que pasa después. Hoy `buildChronicle` mira la etapa entera: `caughtLaterKm` es la captura de la fuga aunque ocurra ciento veinte kilómetros más tarde (l. 297), y el mapa 07 §5.2 (ceguera 2) lo resume así: un visionado que llame a `buildChronicle` con la etapa entera enseña en el km 10 lo que pasa en el 126.

```ts
// apps/api/src/chronicle.ts: lo que gana buildChronicle (hoy l. 268-377). Sin `live`, el acta, todo sigue como hoy.
import type { LiveLine, RaceS } from '@cyclingstar/shared'

/** LA VOZ (D-43): la crónica causal de lo revelado hasta untilS. */
export interface LiveChronicle {
  /** El borde de lo que se cuenta, en s de carrera: el final del tramo pedido (§14.3). */
  readonly untilS: RaceS
  /** StageTimeline.lengthKm: el «ahora» ya no es el último suceso, que truncado es cualquiera. */
  readonly stageKm: number
  /** La hora de revelado de cada suceso (§4.7). La ruta la ata por la identidad del objeto (§14.3). */
  readonly revealS: (e: ChronicleEvent) => RaceS
}

export interface BuildChronicleOptions {
  byClock?: boolean          // la crono (l. 270-279), para el acta; con `live` el orden es por revealS (12-a)
  live?: LiveChronicle
}

export function buildChronicle(events: readonly ChronicleEvent[], names: ChronicleNames, options: BuildChronicleOptions & { readonly live: LiveChronicle }): LiveLine[]
export function buildChronicle(events: readonly ChronicleEvent[], names: ChronicleNames, options?: BuildChronicleOptions): ChronicleEntry[]
// La implementación (hoy l. 289-293) devuelve la unión: con su `): ChronicleEntry[]` de hoy la primera sobrecarga no compila (TS2394).
export function buildChronicle(events: readonly ChronicleEvent[], names: ChronicleNames, options: BuildChronicleOptions = {}): ChronicleEntry[] | LiveLine[] { /* el cuerpo de hoy con los pasos de abajo */ }
```

Las dos sobrecargas no casan con la implementación de hoy si esta no cambia: allí `ChronicleEntry` es el tipo LOCAL de la API (`chronicle.ts` l. 32-39), y `LiveLine` es el `ChronicleEntry` de `@cyclingstar/shared` más `revealS` (§4.9), cuyo `mentions` sale de Zod como `?: … | undefined` y, con `exactOptionalPropertyTypes`, no es asignable al local (TS2375), ni el local a `LiveLine`, al que le falta `revealS`. Lo midió el refutador de código pegando los bloques de §12.2 y §11.16 en una copia del fichero real y compilando con los tipos de §4 (`rcod/n/ws`, `tsconfig.api4.json`). Por eso la implementación devuelve `ChronicleEntry[] | LiveLine[]` y construye cada línea en vivo como `{ ...entrada, revealS: live.revealS(e) }`, que sí es asignable a `LiveLine`, porque el `ChronicleEntry` local lo es al de `shared`.

```
buildChronicle(events, names, options), con options.live = L:
  1. entrada:   solo los e con L.revealS(e) ≤ L.untilS                 D-43.1; caughtLaterKm (l. 297) ya no ve capturas futuras
  2. cada línea lleva revealS ← L.revealS(e)                           la LiveLine de §4.9; las pasadas encendidas no crean líneas
  3. orden:     revealS, luego tS, luego EVENT_ORDER, luego km         12-a; sin live, el de hoy (l. 322-341)
  4. longitud:  followTheLeader, clockTheGaps y markReunion reciben lengthKm = L.stageKm
                en lugar de deducir lastKm del último suceso (l. 545, 637 y 945)
  5. apagadas:  markConcession (l. 319: datos tal cual), dropUndoneSelections (l. 361), groupGapRuns (l. 362),
                foldQuickAttacks (l. 371) y groupRuns (l. 375)
  las otras dieciséis pasadas corren igual que hoy
```

**Las pasadas, una a una.** D-43 habla de veintiuna pasadas: son las veinte llamadas de l. 353-375 más `markConcession`, que corre dentro del `map` (l. 319). Delante van dos filtros por línea que no son pasadas ni miran nada: `narra !== 0` (l. 302) y los duplicados exactos seguidos (l. 343-352). «Mira el futuro» quiere decir que el resultado de una línea depende de líneas que vienen después de ella en la etapa:

| # | Pasada (llamada · definición) | Qué hace | ¿Mira el futuro? | En vivo |
| --- | --- | --- | --- | --- |
| 1 | `markConcession` (l. 319 · l. 1171) | marca `cazada` la concesión del pelotón si la fuga acaba cogida | sí: `caughtLaterKm` es la captura de toda la etapa (l. 297) | apagada |
| 2 | `normalizeSplits` (l. 353 · l. 1127) | ordena la cadena de cortes de las crónicas viejas | no: mira el corte anterior (l. 1129-1152) | encendida |
| 3 | `normalizeKomLeads` (l. 353 · l. 1078) | `leads` con los puntos acumulados hasta esa cima | no: suma en orden | encendida |
| 4 | `dedupeSitUps` (l. 353 · l. 1186) | un corredor se descuelga una vez; tira la segunda mención | no | encendida |
| 5 | `dropImpossibleLines` (l. 354 · l. 872) | tres frases imposibles, cada una por sus propios datos | no | encendida |
| 6 | `dropRetiredWorkers` (l. 355 · l. 902) | el que se rindió no tira ni firma la caza | no: los rendidos de antes | encendida |
| 7 | `dropLoneChaseGaps` (l. 358 · l. 396-410) | quita el `time_gap` medido contra un suelto si hay pelotón | `field` es el máximo de toda la entrada; truncada, de lo revelado | encendida (B19) |
| 8 | `retellCatch` (l. 359 · l. 423) | la captura nombra a los que iban delante según el último parte | no: busca hacia atrás (l. 428) | encendida |
| 9 | `markReunion` (l. 360 · l. 937) | `juntos` si la captura reúne de verdad; `toGo` | solo la longitud (l. 945 y 958) | encendida, con `lengthKm` |
| 10 | `dropUndoneSelections` (l. 361 · l. 847) | borra la criba lejana que la carrera deshace | sí: recorre las líneas posteriores (l. 855-866) | apagada |
| 11 | `groupGapRuns` (l. 362 · l. 1007) | nueve partes de ventaja en dos líneas (`time_gap_run`) | sí: la racha crece con lo que viene | apagada |
| 12 | `followTheLeader` (l. 366 · l. 542) | `respecto` y `desenlace`, el hilo del líder | solo la longitud (l. 545 y 598) | encendida, con `lengthKm` |
| 13 | `clockTheGaps` (l. 367 · l. 636) | `toGo` en el parte de ventaja | solo la longitud (l. 637-642) | encendida, con `lengthKm` |
| 14 | `foldSameFailure` (l. 368 · l. 659) | un fracaso, una línea: tira la SEGUNDA | no | encendida |
| 15 | `markFrontDelta` (l. 369 · l. 475) | `entran` y `salen` contra el parte de cabeza anterior | no | encendida |
| 16 | `dropAttackEcho` (l. 370 · l. 682) | tira el parte de cabeza pegado a su propio ataque | no: mira la anterior | encendida |
| 17 | `foldQuickAttacks` (l. 371 · l. 703) | ataque y captura en 3 km, una línea `attack_short` | sí: BORRA la línea del ataque, ya dicha | apagada |
| 18 | `dropRepeatedPulls` (l. 372 · l. 733) | el mismo equipo tirando para el mismo, una vez | no | encendida |
| 19 | `markAgreement` (l. 373 · l. 767) | la concordancia (`solo`) | no: línea a línea | encendida |
| 20 | `markChaseWork` (l. 374 · l. 792) | `pegado` si el trabajo de caza va tras una captura | no: mira la anterior | encendida |
| 21 | `groupRuns` ×3 (l. 375 · l. 1204) | racimos de descuelgues, pájaras y abandonos | sí: una mención suelta pasa a racimo con las que vienen | apagada; los racimos en vivo son 12.3 |

`respecto`, `juntos` y `desenlace` son causales y siguen en la voz (X-14): `followTheLeader` solo usa el `front` de las líneas anteriores (l. 546-601), `markReunion` acumula `maxFront` hasta la propia captura (l. 937-1005) y `desenlace` solo necesita saber dónde está la meta. Mandarlos al acta dejaría al directo sin el hilo del líder que el dueño pidió: «si lees todo el Journal no SABES quién va ganando, quién va persiguiendo… es un lío los últimos mensajes» (`docs/balance.md` l. 5975-5976, v27). Es [DUEÑO 4], las cuatro preguntas en cualquier punto: la capa fija las contesta siempre (§6.2), la voz da el hilo y la prueba de lectura lo mide (§16.5).

**Lo que el directo cuenta distinto del acta, y por qué.** Las cinco pasadas apagadas son las que el registro de la v21 dejó en la crónica justamente porque miran el futuro: a «¿Se DESHIZO la criba cincuenta km después?» su tabla contesta «Crónica», porque «Eso sí es futuro. El motor emite en carretera; la crónica tiene la etapa entera delante, como en la concesión desmentida de la v13», y lo mismo a «¿Nueve partes de boquete son nueve noticias?» (`docs/balance.md` l. 4281-4282). En vivo no se pueden aplicar sin reescribir lo ya dicho, y cada hueco se cubre de otra manera: la concesión del pelotón que la v13 desmentía (`markConcession`) se dice tal cual y la desmiente la captura cuando llega; la criba lejana que la carrera deshace (`dropUndoneSelections`) queda dicha y la reunión se cuenta cuando pasa; los partes de ventaja seguidos (`groupGapRuns`) no los dice la voz, porque la capa fija enseña siempre la diferencia (`time_gap` es `report_only`, §6.6); el ataque cazado en 3 km (`foldQuickAttacks`) son dos líneas; y los descuelgues, la regla B3 de la v13 («No menciones uno a uno todos los ciclistas que se van descolgando: puedes mencionar muchos juntos con número», l. 1845-1846), los cuentan la barra y, con `liveClusters`, el racimo de 12.3: mientras siga apagada, los de corredores con rótulo salen uno a uno (DD-18). El acta, que se lee con la etapa entera delante, conserva las cinco.

**La medida.** Una violación es un paso de 30 s de carrera en el que la voz anterior NO es prefijo exacto de la nueva (misma plantilla, km, protagonistas y datos, línea a línea). `ingeniero` midió 0 en 15 corridas revelando cada suceso en su `tS` (`prefijo.mjs`), y 94 truncando sin más. Pero el diseño revela por `revealS` (D-05, §4.7), que no es el `tS` en la fuga, las pancartas, la caída ni en quien cambia de grupo: de los 2.667 sucesos anteriores a la meta de la muestra, 1.794 se revelan más de un segundo después de su `tS`. `l8/voz.mjs` graba cada etapa con el prototipo del grabador (bloque de emisión por `onEvent`, pancartas por `onBanner`, caídas sintetizadas y `revealS` por la tabla de §4.7) y construye la voz cada 30 s hasta el borde de la meta, en seis etapas (`race-france` e7, e13, e18 y e20, `race-flanders` e1 y `race-colombia` e5) con las semillas 0, 1 y 2: 18 corridas y 12.083 pasos.

| Variante | Qué hace | Violaciones en 18 corridas | Las plantillas que más |
| --- | --- | --- | --- |
| V0 | el acta truncada: entrada por `revealS`, orden por km, las veintiuna pasadas | 574 | `riders_sit_up` 288, `time_gap` 57, `attack_go` 43, `crash` 37, `attack_sticks` 30 |
| V1 | el diseño: entrada y orden por `revealS`, longitud como dato, cinco apagadas | 0 | |
| V2 | V1 ordenando por `tS`, la rama `byClock` literal (l. 323-327) | 44 | `front_group` 13, `time_gap` 6, `crash` 5, `rider_sits_up` 5, `attack_reeled` 4 |
| V3 | V1 con `dropLoneChaseGaps` también apagada | 0 | |
| V4 | la de `ingeniero`: revelar en `tS` y ordenar por `tS` | 0 | |

V4 reproduce la cifra de `ingeniero`; V2 dice por qué no basta. Ordenada por `tS`, una línea que se sabe tarde pero ocurrió antes (con la regla `emit`, la hora del grupo de su protagonista al final del bloque de emisión; la caída, la del grupo del caído en su km; §4.7) se mete DELANTE de líneas ya dichas, y las pasadas que miran la línea anterior (`dropAttackEcho`, `markFrontDelta`, `foldSameFailure`) cambian su veredicto sobre algo que el espectador ya leyó. El reloj que ordena la voz es, por eso, el de revelado (decisión 12-a). `dropLoneChaseGaps`, que D-43 dejaba sin medir, no rompe el prefijo: V1, con ella encendida, y V3, apagada, dan 0; se queda encendida y B19 la sigue vigilando. En las etapas del adaptador de la radio el `revealS` es el de `REVEAL_RULES` sobre el reloj estimado (§3.8) y la propiedad es la misma, porque solo depende de que la entrada crezca por el final.

**Lo que la voz calla porque ya lo dice el estado** (D-43, punto 5). La web no dice en `Watch` las líneas `report_only` de `CUE_OF_TEMPLATE` (`front_group` y `time_gap`, §6.6), ni `time_gap_run`, que en vivo no nace porque `groupGapRuns` está apagada, ni el descuelgue suelto de un corredor sin rótulo: la barra ya lo cuenta (`GRUPPETTO · 23`, pantalla). «Sin rótulo» se decide con `namedRidersOf` (§7.7) sobre el grupo del que se descuelga, en el instante de la línea y con los sucesos revelados ANTES de ella; si contara el propio descuelgue, todo el que se descuelga estaría nombrado por ser protagonista de un suceso revelado. Todas esas líneas siguen en el acta.

**Cómo se pinta.** La voz y `Commentary` (pantalla) se pintan con `chronicleParts` (`stageJournal.ts` l. 286), como el journal de hoy: cada corredor con su dorsal, su equipo entre paréntesis y su bandera (`riderFull`, l. 233) y con la marca que lo enlaza a su ficha (`RiderName`), que el dueño pidió en la v58 («cuando salga el nombre de un ciclista, que tenga enlace a su ficha», `stageJournal.ts` l. 170-171). La identidad entera es la regla B1 del dueño («Cada vez que menciones un ciclista, pon su dorsal, su equipo entre paréntesis y su bandera», `docs/balance.md` l. 1842, v13), que reafirmó al rechazar un umbral que la recortaba desde el cuarto nombre («siguen saliendo entradas sin dorsal y nombre de equipo», `stageJournal.ts` l. 186-195). La barra es la única pieza de `Watch` que no la lleva entera, por espacio, y tocar una fila la da (§6.2, §6.3). Seguir el enlace pausa la reproducción e informa de lo alcanzado antes de salir (§8.5), y la ficha se sirve con el horizonte de quien mira (§11.14).

```ts
// apps/web/src/domain/voice.ts (nuevo): qué dice la voz de Watch (D-43, punto 5). Pura.
import { CUE_OF_TEMPLATE, type LiveLine } from '@cyclingstar/shared'

/** unnamed(id): el corredor no estaba nombrado en su grupo un instante antes de la línea (namedRidersOf, §7.7). */
export function inVoice(line: LiveLine, unnamed: (riderId: string) => boolean): boolean {
  if (CUE_OF_TEMPLATE[line.plantilla] === 'report_only') return false         // front_group, time_gap (§6.6)
  if (line.plantilla === 'time_gap_run') return false                         // solo lo crea groupGapRuns, apagada en vivo
  if (line.plantilla === 'rider_sits_up') return line.protagonists.some((p) => p.id == null || !unnamed(p.id))
  return true
}
```

**La meta.** Los sucesos con la regla `finish` de `REVEAL_RULES` (en la crono, de `TT_REVEAL_RULES`; §4.7) no entran nunca en un tramo, así que sus líneas no están en la voz construida por tramos (§14.3). Tras `BroadcastFinish` (§8.7), la web añade a `Commentary` (pantalla) las líneas de `report.chronicle` cuyas plantillas tienen la regla `finish`, en el orden del acta y con `revealS` igual a `finishS`: la voz de la meta es la del acta de ese paquete, como anticipa §6.6, y el rótulo `finish` sale a la vez (§6.5). Con eso, lo que la voz dijo durante la etapa sigue siendo prefijo de lo que queda escrito al final.

**Los tests de la voz** (paso 2; la suite rápida, porque `apps/api` y `apps/web` corren en `test:rapido`):

| Test | Qué fija |
| --- | --- |
| `apps/api/src/chronicle.test.ts`, `describe('la voz en vivo')` | un suceso con `revealS > untilS` no sale; una concesión seguida de una captura revelada después NO lleva `cazada`; `toGo` y `desenlace` salen de `stageKm` y no del último suceso; una criba lejana no se borra aunque la carrera se recomponga después; ataque y captura en 3 km son dos líneas; tres descuelgues en 5 km son tres líneas; a igual km, manda `revealS` |
| ídem, los 62 de hoy | sin `live` nada cambia: siguen en verde sin tocarlos, y son la prueba de que el acta es la de hoy |
| `apps/api/src/voicePrefix.test.ts` | B19 (§16.4): la voz de cada tramo es prefijo de la del siguiente sobre las etapas congeladas |
| `apps/web/src/domain/voice.test.ts` | `inVoice`: fuera `front_group`, `time_gap` y `time_gap_run`; el descuelgue de un corredor sin rótulo fuera, el de uno con rótulo dentro; el propio descuelgue no cuenta para nombrarle |

### 12.3 Los racimos en vivo

La regla B3 del dueño: «No menciones uno a uno todos los ciclistas que se van descolgando: puedes mencionar muchos juntos con número» (`docs/balance.md` l. 1845-1846, v13). En el acta la cumple `groupRuns` (l. 1204-1244): dentro de una ventana de `SIT_UP_WINDOW_KM` (5) km, tres o más descuelgues, pájaras o abandonos (`SIT_UP_GROUP_MIN`, l. 254-255; los tres pares de `CLUSTERED`, l. 262-266) son una línea con el número. En la voz esa pasada está apagada, porque convierte en racimo una mención que ya se dijo suelta. D-43 lo resuelve publicando el racimo UNA vez, cuando la ventana se cierra, y detrás de `BROADCAST.liveClusters`, que nace apagada (DD-18; I-44). Mientras esté apagada, los descuelgues sueltos de corredores con rótulo salen uno a uno y los de corredores sin rótulo los cuenta la barra (12.2).

```ts
// apps/api/src/liveClusters.ts (nuevo): los racimos en vivo (D-43, 12-d). Pura sobre la línea; solo con BROADCAST.liveClusters.
import type { RaceS, StageTimeline } from '@cyclingstar/shared'
import type { ChronicleEvent } from './chronicle.js'

/** Un racimo: su suceso nuevo (la plantilla racimo de su par de CLUSTERED), la hora a la que se publica y los sueltos que absorbe. */
export interface LiveCluster {
  readonly event: ChronicleEvent
  readonly revealS: RaceS
  readonly members: readonly ChronicleEvent[]
}
/** La ruta del tramo lo llama tras withGroupRoles y antes de buildChronicle (§14.3): ata cada racimo a su hora y quita sus sueltos. */
export function liveClusters(events: readonly ChronicleEvent[], tl: StageTimeline, revealS: (e: ChronicleEvent) => RaceS): readonly LiveCluster[]
```

```
liveClusters(events, tl, revealS)
  para cada par (suelto, racimo) de CLUSTERED (chronicle.ts l. 262-266):
    sueltos ← los sucesos `suelto` de corredores sin rótulo (12.2), por km
    ventanas voraces, como groupRuns: la primera empieza en el km del primer suelto y mide liveClusterWindowKm (5);
      la siguiente, en el primero que quedó fuera
    si una ventana tiene liveClusterMin (3) o más:
      último   ← el de mayor km
      cierreS  ← la hora en que el grupo de `último` cruza km(primero) + liveClusterWindowKm (su reloj en ese bloque, §4.4);
                 si ese grupo ya no existe allí, el revealS de `último`
      publicaS ← máx(cierreS, revealS de cada miembro)            nunca antes de que se sepa ninguno
      si publicaS ≥ finishS: nada en vivo; el racimo lo cuenta el acta
      si no: UN LiveCluster: event, el suceso `racimo` en km(último), con todos de protagonistas y datos { count, toGo, from }
             como groupRuns (l. 1225-1236); revealS ← publicaS; members, sus sueltos, que no entran en la voz
    con menos de liveClusterMin: no salen en la voz (la barra los cuenta)
```

Así la propiedad de prefijo se cumple por construcción: ningún miembro sale antes que su racimo y el racimo entra una sola vez, con una hora fija. Medido con `l8/voz2.mjs` sobre las mismas 18 corridas de 12.2, tratando a TODOS los corredores como sin rótulo, que es el peor caso: 0 violaciones; 38 racimos que juntan 800 descuelgues, pájaras y abandonos; 8 se cierran en la meta y quedan para el acta; 26 sueltos no llegan a racimo y no salen en la voz. Lo que cuesta es la espera: desde que se revela el primer miembro hasta que se publica el racimo pasan, en segundos de carrera, 1.493 de mediana, 2.016 en el p90 y 2.789 como máximo, porque el grupo del último, casi siempre un grupeto, cruza el final de la ventana mucho después que la cabeza. A ×60, la velocidad de `Watch` a más de 50 km de meta (§8.2), la mediana son unos 25 s de pared (derivado). Con la variante que espera al más lento de TODOS los grupos de los miembros, y no al del último, la mediana sube a 1.955 s y se cierran en meta 11. D-43 decía que esta regla no tenía medida de los jueces; ahora la tiene sin nombres, y no con la política de rótulo real. Por eso `liveClusters` sigue apagada (DD-18) y solo se enciende con B19 en 0 con racimos sobre las etapas congeladas y la política real de §7.7 (§16.4), y con la prueba de lectura aceptando la espera (§16.5).

### 12.4 El acta

El acta es `buildChronicle` sin `live`, con sus veintiuna pasadas y su orden por km (por reloj en la crono, `byClock`, l. 323-327), igual que hoy. Vive en `Report` (pantalla) y en `/world/races/:raceId/stages/:day/report`, que pide `GET /api/races/:raceId/stages/:day/report` (§14.2), y llega entera en `BroadcastFinish.report` al cruzar la meta (§8.7). `chronicle.test.ts` (62 tests) y `stageJournal.test.ts` (140) no se tocan por la voz: los cambios de 12.2 solo corren con `live`. El acta cambia en tres cosas, cada una en su paso y con su test: las frases que faltaban (12.5, paso 6b), el papel del grupo del título en las plantillas que decían «the bunch» (12.6, paso 6b) y la semilla neutra con la identidad del día (12.7, paso 12). Sigue contando lo que la voz calla: `front_group`, `time_gap`, las rachas de `time_gap_run`, las cribas que se deshicieron y los racimos.

### 12.5 Las plantillas que se escriben

D-44, escrito como hecho (O-24, X-21). La voz y el acta reutilizan las 55 plantillas y 272 redacciones de `stageJournal.ts`, pero cuatro que el motor emite caen hoy al `default`, que imprime la clave cruda (l. 1602-1603): `puncture`, `mechanical`, `truce_granted` y `truce_denied`. El mapa 07 §5.2 (ceguera 8) lo encontró en un test que lo sella como función («meteorito: Ana», `stageJournal.test.ts` l. 89-93). Además hay cuatro frases nuevas: `crash` y `crash_names` (la caída sintetizada de `incidents`, D-13), `break_presented` (la frase de la fuga, D-26) y `gap_trend`. Las seis primeras son `case` de `chronicleTemplate` (l. 318); las dos últimas son líneas de ESTADO que la web construye desde el instante y no pasan por `buildChronicle`. Se escriben en el PR 6b; sus filas de `GROUP_NOUNS` van en el 4a (12.6).

Lo que el motor manda en cada una: `puncture` y `mechanical` llevan `{ perdidaS, conCoche, toGo }` en carretera (`packages/engine/src/stage/simulate.ts` l. 8473-8484) y `{ perdidaS, conCoche: 1 }` en la crono, sin `toGo`, en `finishKm / 2` (`timetrial.ts` l. 321-327); `truce_granted` y `truce_denied`, con el jefe de filas caído como protagonista, llevan `{ equipo, porEquipo?, toGo, enJuego, motivo? }` (`simulate.ts` l. 8244-8258), y `motivo` es uno de los seis `TruceVerdict` negativos (`decisiva`, `cerca`, `abanico`, `cuesta`, `deuda`, `emboscada`, `truce.ts` l. 37-38); `crash` lleva a los caídos y `datos: null` (§5.4, paso 5), más el papel de su grupo y, si es el grupo de un maillot, ese maillot, que anota la API (12.6).

```ts
// apps/web/src/domain/stageJournal.ts, chronicleTemplate (l. 318): los case que faltaban (D-44). PR 6b.
    case 'puncture':
    case 'mechanical': {
      // Sin el tiempo perdido, que es del microscopio (§6.6); la crono no manda toGo (timetrial.ts l. 321-327).
      const toGo = Number(e.datos?.toGo ?? 0)
      const where = toGo > 0 ? ` with ${toGo} km to go` : ' out on the course'
      const car = Number(e.datos?.conCoche ?? 1) === 1
      if (e.plantilla === 'puncture')
        return car
          ? pick([`Puncture for ${who}${where}. The team car is right there with a wheel.`, `${who} punctures${where} and waits for his team car.`])
          : pick([`Puncture for ${who}${where}, and no team car behind him.`, `${who} punctures${where}; his team car is nowhere near.`])
      return car
        ? pick([`Mechanical trouble for ${who}${where}. He stops for a new bike from the team car.`, `${who} has to stop with a mechanical${where}.`])
        : pick([`Mechanical trouble for ${who}${where}, and no team car in sight.`, `${who} stops with a mechanical${where}, with no car behind him.`])
    }
    case 'truce_granted': {
      const toGo = Number(e.datos?.toGo ?? 0)
      return pick([
        `Nobody attacks while ${who} gets back on: the race grants him a truce with ${toGo} km to go.`,
        `A truce for ${who}: the race eases off and waits for him.`,
      ])
    }
    case 'truce_denied': {
      // El motivo es lo que la crónica necesita «para no contarlas todas igual» (simulate.ts l. 8257-8258).
      const toGo = Number(e.datos?.toGo ?? 0)
      const stake = Number(e.datos?.enJuego ?? 0)
      switch (String(e.datos?.motivo ?? '')) {
        case 'decisiva': return `No truce for ${who}: the race is being decided and nobody waits.`
        case 'cerca': return `Too close to the line to wait: ${who} is on his own with ${toGo} km to go.`
        case 'abanico': return `No waiting in the crosswind: the echelons are formed and ${who} has to chase.`
        case 'cuesta': return `Nobody waits on a climb: ${who} has to chase on his own.`
        case 'deuda': return `${who} asks for a truce and does not get one: his team is owed no favours today.`
        case 'emboscada': return `No truce for ${who}: with ${fmtGap(stake)} at stake, his rivals press on.`
        default: return `No truce for ${who}: the race does not wait.`
      }
    }
    case 'crash': {
      // La caída sintetizada (D-13), sin nombres: su rótulo es CRASH (§6.5). groupRole y groupJersey los anota la API (12.6).
      const where = groupNounOf(e.datos?.groupRole, e.datos?.groupJersey)
      return pick([`Crash in ${where}!`, `There is a crash in ${where}.`, `Riders down in ${where}!`])
    }
    case 'crash_names': {
      // Los caídos, por dorsal: en la voz, crashNamesDelayS (3 s de pared) después de la anterior; en el acta, detrás.
      if (riders.length === 1) return pick([`${who} is on the ground.`, `It is ${who} who has gone down.`])
      const named = riders.slice(0, NAMED_IN_SUMMARY).map(riderFull)
      const rest = riders.length - named.length
      if (rest === 0) return `${listNames(named)} are on the ground.`
      return `${listNames([...named, `${rest} other${rest === 1 ? '' : 's'}`])} are among those down.`
    }
    default:
      return '' // D-44: nunca la clave cruda. La voz y el acta saltan la línea vacía, y B7 falla si una plantilla del motor llega aquí
```

`groupNounOf(role, jersey)` es la de 12.6: `GROUP_WORDS.jersey[jersey][1]` (§6.3) si el grupo lleva la etiqueta de un maillot, `GROUP_WORDS.role[role][1]` si no y `role` es un `GroupRole`, y `the bunch` sin anotación, como `mainNoun`. `crash` y `crash_names` son dos `case` sobre la MISMA línea: la voz dice la primera al revelarse y añade la segunda `BROADCAST.crashNamesDelayS` (3) segundos de pared después, a la vez que el rótulo con nombres (§6.5); el acta las escribe seguidas en el mismo párrafo. Así la voz no nombra a los caídos antes que el rótulo, que es la regla de la tele que D-13 copia (mapa 06 §3.1). El ayudante que lo hace es `linesOf(e): string[]` en `stageJournal.ts`, que devuelve las dos frases para `crash` y una para todo lo demás.

**Las dos líneas de estado.** No son sucesos del motor ni `case` del journal: la web las dice desde el instante (§4.5), y las dos funciones viven en `packages/shared/src/broadcast/names.ts` para que la voz y el rótulo usen la misma frase.

- `break_presented` es la frase de `breakHeadline('en', cards, ownIx)` (§7.6; el `locale` delante, 12.11). En `Watch`, la línea de `breakaway_formed` SE SUSTITUYE por ella: la del journal nombra a todos los escapados con dorsal y equipo, uno tras otro (`stageJournal.ts` l. 637-658), y la de la tele los ordena por notoriedad y cuenta al resto (`The mountains leader and the champion of Italy go clear with three others.`, pantalla). El acta conserva la de `breakaway_formed`, porque ahí la lista entera es lo que se busca.
- `gap_trend` es `gapTrendLine('en', trend)` sobre `MainGap.trend` (`GapTrend`, §4.5): una línea cuando la flecha pasa a `up` o a `down` (`|deltaS| ≥ BROADCAST.trendMinS`, 5 s, en `trendWindowKm`, 5 km), como mucho una por cada `trendWindowKm` que avanza la cabeza y nunca al reiniciarse la pareja de la diferencia principal (§6.2). Es la frase de D-44 con su número: `The gap has fallen by 40 seconds in five kilometres.` y `The gap has grown by 40 seconds in five kilometres.` (pantalla); desde un minuto, `by 1:10`; la ventana, en palabras hasta nueve (`five kilometres`). El acta no la lleva: su parte de ventaja son `time_gap` y `time_gap_run`.

| Plantilla | De dónde | Destino (§6.6) | La voz dice (pantalla) | Nombres de grupo (`GROUP_NOUNS`) |
| --- | --- | --- | --- | --- |
| `puncture` | motor, carretera y crono | `mishap` | `Puncture for 45 Julien Moreau (Team Gamma) with 42 km to go. The team car is right there with a wheel.` | ninguno |
| `mechanical` | motor, carretera y crono | `mishap` | `Mechanical trouble for 45 Julien Moreau (Team Gamma) with 42 km to go, and no team car in sight.` | ninguno |
| `truce_granted` | motor | `voice_only` | `A truce for 11 Sam Carter (Team Beta): the race eases off and waits for him.` | ninguno |
| `truce_denied` | motor, seis motivos | `voice_only` | `No truce for 11 Sam Carter (Team Beta): with 45s at stake, his rivals press on.` | ninguno |
| `crash` | grabador (D-13) | `crash` | `Crash in the gruppetto!` | los cuatro de D-18 y los tres del grupo del maillot (6-b) |
| `crash_names` | la misma línea | el segundo tiempo de `crash` | `45 Julien Moreau (Team Gamma) and 88 Iñigo Arrieta (Team Delta) are on the ground.` | ninguno |
| `break_presented` | estado: `breakHeadline` | `break_presented` | `The champion of Italy goes clear with four others.` | ninguno (usa `with four others`) |
| `gap_trend` | estado: `MainGap.trend` | solo la voz | `The gap has fallen by 40 seconds in five kilometres.` | ninguno |

Ninguna frase nueva usa una palabra de `WATCHED_GROUP_NOUNS` (`coherence.ts` l. 616-635) que su fila no declare: por eso la tregua habla de `the race` y no de `the favourites` ni de `the peloton`, y el abanico de `the echelons`. **El `default` deja de imprimir la clave**: devuelve la cadena vacía, la voz y el acta no pintan líneas vacías y B7 (§16.4) recorre las 54 plantillas que el motor emite, contadas con el AST en `l8/plantillas.mjs` (las 42 llamadas a `log.emit` de `simulate.ts` dan 44, `rider_defies_team` la inserta `events.ts` y `timetrial.ts` da 13, cuatro compartidas: 54 distintas y ninguna calculada en tiempo de ejecución), más `crash`, y falla si alguna da cadena vacía, no tiene destino en `CUE_OF_TEMPLATE` o su regla de revelado no es la que el test tiene escrita (la de `REVEAL_RULES`, o `emit` por defecto, apuntado a propósito). El test de hoy que sella el `default` crudo («meteorito: Ana», l. 89-93) se re-sella a propósito en el 6b: un suceso desconocido da una línea vacía y no la clave.

Los tres requisitos de [DOC 3] (`docs/tactica.md` l. 4859-4882, abiertos según el mapa 05 §5.2) pasan por aquí. R23.4, «hasta tres NOMBRES + conteo + equipos», es la forma de `break_presented`: nombra como mucho a `BROADCAST.breakNamedMax` (2) y cuenta al resto (§7.6). R23.7, el corredor propio siempre nombrado, es la política de nombres de §7.7, y por ella la voz dice siempre el descuelgue del corredor propio (12.2). R23.8 traerá la plantilla `card_changed`: mientras no tenga `case` cae en el `default`, que ya no imprime la clave, y B7 la pone en rojo hasta que tenga frase, destino en `CUE_OF_TEMPLATE` y regla de revelado (§4.7, §6.6).

### 12.6 Un vocabulario en la voz

D-18, escrito como hecho (I-07, O-10). El código es `GroupRole` y las palabras son las de `GROUP_WORDS` (§6.3): `the lead group`, `the chase group`, `the bunch` y `the gruppetto` en la voz; `Lead group`, `Chase group`, `Bunch` y `Gruppetto` en la barra (pantalla). Y el grupo del maillot se llama igual en las dos: `the race leader’s group`, `the points leader’s group` y `the mountains leader’s group` en la voz, `Race leader’s group`, `Points leader’s group` y `Mountains leader’s group` en la barra (6-b; D-18 corregida por L4, Rdueno-017): con la voz nombrándolo por su papel, el mismo grupo tenía dos nombres en la misma pantalla, que es lo que prohíbe la C7 del dueño. La lista cerrada de la voz la vigila hoy el motor: `GROUP_NOUNS` (`packages/engine/src/sim/coherence.ts` l. 571-600) dice qué nombres de grupo puede imprimir cada plantilla, `WATCHED_GROUP_NOUNS` (l. 616-635) es la lista de todos los que se buscan en el texto, y `stageJournal.test.ts` falla si una frase imprime uno que su plantilla no declara (l. 1523-1640) o si el conjunto no es exactamente el de tres palabras (l. 1646-1650). Como vive en el motor, todo cambio a esas dos tablas va en el PR 4a, el único de E2 que toca `packages/engine` y ya paga los bancos (D-54); las frases que las usan se escriben en el 6b.

**El conflicto medido.** La voz no calcula el papel: dice «the bunch» por el grupo que el motor titula pelotón, tenga la cuota que tenga, mientras la barra solo lo llama `Bunch` con dos tercios de los que corren (`bunchMinShare`, §6.3). L4 lo midió (`l4/bunch.mjs`, §6.3): con el grupo del título por debajo de 2/3, 0 de 41 líneas en la llana e7, 16 de 67 en la e13, 22 de 48 en la reina e18, 4 de 48 en Flandes y 8 de 22 en Colombia. `l8/rol.mjs` repite la muestra (las mismas cinco etapas, semillas 0 y 1) y mira qué papel le da `groupRoleOf` al grupo del título en la foto del km de la línea, en las ocho plantillas que dicen «the bunch» por el grupo principal (`attack_go`, `attack_short`, `attack_reeled`, `sprinters_chase`, `sprinters_give_up`, `peloton_concedes`, `peloton_pull` y `breakaway_caught`): de 210 líneas narradas, 170 son `bunch`, 40 `chase` y ninguna `lead`. Por etapa, `chase` en 14 de 24 y 6 de 22 en la e18, 4 de 36 y 8 de 27 en la e13, 4 de 9 y 2 de 11 en Colombia, 2 de 26 y 0 de 18 en Flandes, y 0 en la llana; por plantilla, 18 de 89 en `attack_go`, 18 de 72 en `attack_reeled`, 3 de 32 en `peloton_pull` y 1 de 7 en `peloton_concedes`. Una de cada cinco veces, la voz llamaría `the bunch` al grupo que la barra, en la misma pantalla, llama `Chase group`: lo que C7 prohíbe («Un solo concepto, con el mismo nombre, en el motor y en la Race Radio», `docs/balance.md` l. 6740-6741, v34).

**Cómo lee la voz el papel** (decisión 12-b). La API anota el dato y la web elige la palabra; ni el motor ni `buildChronicle` cambian:

```ts
// apps/api/src/voiceRoles.ts (nuevo): los papeles que la voz y el acta necesitan, sobre el instante (D-18). Pura sobre la línea.
import { instantAt, type GroupNow, type InstantContext, type StageTimeline, type RaceS } from '@cyclingstar/shared'
import type { ChronicleEvent } from './chronicle.js'

/** Las plantillas que dicen «the bunch» por el grupo que el motor titula pelotón: su palabra es la de su papel. */
export const MAIN_GROUP_TEMPLATES: ReadonlySet<string> = new Set([
  'attack_go', 'attack_short', 'attack_reeled', 'sprinters_chase', 'sprinters_give_up',
  'peloton_concedes', 'peloton_pull', 'breakaway_caught', 'time_gap', 'time_gap_run',
])

/**
 * Copia de los sucesos con datos.mainRole (el papel del grupo del título) y datos.mainJersey (el maillot que lo nombra, si su etiqueta
 * es `jersey_group`, §6.3) y, en `crash`, datos.groupRole y datos.groupJersey (los del grupo del caído). ctx: `own` vacío y
 * `start.leaders` los maillots con que se salió (del reparto congelado, §4.2), porque de ahí sale `GroupNow.jerseys` y con él la
 * etiqueta; ni `own` ni el resto de `start` cambian grupos, papeles ni etiquetas, así que la anotación no depende de quien mira.
 */
export function withGroupRoles(events: readonly ChronicleEvent[], tl: StageTimeline, revealS: (e: ChronicleEvent) => RaceS, ctx: InstantContext): ChronicleEvent[] {
  return events.map((e) => {
    if (!MAIN_GROUP_TEMPLATES.has(e.plantilla) && e.plantilla !== 'crash') return e
    const now = instantAt(tl, revealS(e), ctx)                                   // el instante de §4.5 en la hora de la línea
    const g: GroupNow | undefined = e.plantilla === 'crash'
      ? now.groups.find((x) => x.members.includes(tl.riderIds.indexOf(e.protagonistas[0] ?? '')))
      : now.groups.find((x) => x.kind === 'peloton')
    if (g === undefined) return e
    const [roleKey, jerseyKey] = e.plantilla === 'crash' ? ['groupRole', 'groupJersey'] : ['mainRole', 'mainJersey']
    return { ...e, datos: { ...e.datos, [roleKey]: g.role, ...(g.label.k === 'jersey_group' ? { [jerseyKey]: g.label.jersey } : {}) } }
  })
}
```

El papel es el de `GroupNow.role`, con la histéresis de §4.5, y la etiqueta, la de `GroupNow.label`, así que la voz y la barra dicen la misma palabra por construcción en el instante de la línea, también cuando es el grupo del maillot. La ruta del tramo (§14.3) llama a `withGroupRoles` antes de `buildChronicle`, y la del acta también, con el `revealS` de cada suceso. Lo que no depende del tramo se calcula una vez por línea decodificada y se guarda en un `WeakMap` sobre ella: los pasos 1 a 3 del bloque de §14.3, es decir, los sucesos con su hora, los papeles y los racimos; solo el paso 4, `buildChronicle` hasta el final del tramo, se hace en cada petición. El coste es una llamada a `instantAt` por línea anotada: de 9 a 36 por etapa en la muestra de `l8/rol.mjs`, más los partes de ventaja del acta. Cada llamada es un instante entero con el paso 9 de §4.5 (el papel con histéresis), que pide además el instante en `s_g` de cada grupo vivo: sin memo, de 0,134 a 1,153 ms de p99 por instante en Node (`coste/instante-hist.mjs`, dos corridas, §18.1) y hasta unos 40 ms por línea decodificada (estimado: 36 anotaciones a 1,15 ms, sin contar los partes); con el paso 9 memorizado por `(g, k_g)`, que es como se implementa (18-l), el instante cuesta de 0,034 a 0,042 ms de p95 y la anotación de una etapa, del orden de 1 a 4 ms (estimado con esa cifra). Lo paga el servidor la primera vez que un proceso sirve la línea, encima de la lectura en frío (§14.4), y lo vigila B8 con umbral fijo (§16.4). Las etapas sin línea ni radio no llevan anotación y dicen `the bunch`, como hoy. `withGroupRoles` es un `map`: devuelve los sucesos en su orden, una copia en los que anota y el mismo objeto en los demás. La ruta del tramo ata cada suceso a su `revealS` por la identidad del objeto (`revealOf`, §14.3), así que anota ANTES de atar (decisión 12-n): llama a `withGroupRoles` con la hora que ya conoce de cada suceso (la de su `source`) y construye `revealOf` sobre lo que devuelve, posición a posición. Con el mapa de antes, una copia anotada no estaría en él, caería en `toS` y desordenaría la voz. En la web:

```ts
// packages/shared/src/broadcast/instant.ts (se amplía en el 3a, junto a GroupRole de §4.5): la guarda de lo que llega en `datos`
export const GROUP_ROLES = ['lead', 'chase', 'bunch', 'gruppetto'] as const satisfies readonly GroupRole[]
/** mainRole y groupRole viajan en `datos` de una línea, que no tiene tipo: sin la guarda, `role` es unknown y no indexa GROUP_WORDS. */
export function isGroupRole(x: unknown): x is GroupRole {
  return typeof x === 'string' && (GROUP_ROLES as readonly string[]).includes(x)
}

// packages/shared/src/jerseys.ts (se amplía en el 6b, con groupNounOf): la del maillot, sobre JERSEY_PRIORITY (l. 22), que ya los lista todos
/** mainJersey y groupJersey viajan igual, en `datos` (6-b): sin la guarda, `jersey` es unknown y no indexa GROUP_WORDS.jersey. */
export function isJerseyKind(x: unknown): x is JerseyKind {
  return typeof x === 'string' && (JERSEY_PRIORITY as readonly string[]).includes(x)
}
```

Sin esas guardas escritas, el bloque de abajo no compila: montados §12.5 y §12.6 sobre una copia de `stageJournal.ts` con los tipos de §4, tsc da `TS2724` (`@cyclingstar/shared` no exporta `isGroupRole`) y `TS2538` (`unknown` no indexa) en `groupNounOf` (medido por el refutador de código, `rcod/n/ws`, `tsconfig.web3.json`); con ellas compila (`corr-l8/ws2`; con el grupo del maillot y el `GROUP_WORDS` de §6.3, `cierre-l8/ws3`, donde la llamada de un solo argumento que quedaba en el `case 'crash'` de 12.5 daba `TS2554`). `isJerseyKind` no existe hoy en `jerseys.ts`.

```ts
// apps/web/src/domain/stageJournal.ts: la palabra del grupo del título (D-18). Sustituye a BUNCH en las ocho plantillas y en overWhom (l. 63-68)
import { GROUP_WORDS, isGroupRole, isJerseyKind } from '@cyclingstar/shared'

/** La palabra de la barra, en minúsculas y con artículo: la del grupo del maillot si lo hay, si no la del papel; sin anotación, «the bunch». */
export function groupNounOf(role: unknown, jersey: unknown): string {
  if (isJerseyKind(jersey)) return GROUP_WORDS.jersey[jersey][1]                   // the race leader’s group (6-b)
  return isGroupRole(role) ? GROUP_WORDS.role[role][1] : BUNCH
}
const mainNoun = (e: ChronicleEntry): string => groupNounOf(e.datos?.mainRole, e.datos?.mainJersey)
```

`BUNCH` sigue en `bunch_sprint` y `stage_win` (l. 1442-1475): son de meta, salen tras `BroadcastFinish` y hablan del grupo que esprinta, que por definición es el grueso. `overWhom` con `chaseKind` `peloton` pasa a `mainNoun`, así que `time_gap` y `time_gap_run` dejan de heredar en el acta el listón de la mitad de `chaseIsBunch` (`simulate.ts` l. 4142-4144) y usan el papel de la barra.

`isJerseyKind` es la guarda de `JerseyKind` (`gc`, `points`, `kom`) en `packages/shared/src/jerseys.ts`, como `isGroupRole`; en `crash`, `groupNounOf(e.datos?.groupRole, e.datos?.groupJersey)`.

**Las tablas del motor, en el PR 4a.** `GROUP_NOUNS` gana en cada fila las palabras que su plantilla puede decir ahora y las filas de las plantillas de 12.5; `WATCHED_GROUP_NOUNS` gana `the mountains leader’s group`, `the points leader’s group` y `the race leader’s group` en cabeza y `the gruppetto` entre `the favourites` y `the fast men`, porque la lista va de más larga a más corta (l. 612-613):

| Fila de `GROUP_NOUNS` | Hoy (l. 571-600) | Tras el PR 4a | Por qué |
| --- | --- | --- | --- |
| `attack_go`, `sprinters_chase`, `peloton_concedes`, `peloton_pull`, `breakaway_caught` | `the bunch`, `the lead group` | más `the chase group` y los tres del grupo del maillot | `mainNoun`: el grupo del título con papel `chase`, o con la etiqueta `jersey_group` |
| `attack_short`, `attack_reeled`, `sprinters_give_up` | `the bunch` | más `the chase group`, `the lead group` y los tres del grupo del maillot | `mainNoun` puede dar los tres papeles del título y su etiqueta de maillot; `lead`, 0 de 210 medido |
| `time_gap`, `time_gap_run` | los tres | más los tres del grupo del maillot | `overWhom` pasa a `mainNoun` |
| `puncture`, `mechanical`, `truce_granted`, `truce_denied`, `crash_names` | no existen | vacías | sus frases no nombran grupos |
| `crash` | no existe | `the lead group`, `the chase group`, `the bunch`, `the gruppetto` y los tres del grupo del maillot | la caída puede ser en cualquier grupo |
| `bunch_sprint`, `stage_win` y las demás | las de hoy | igual | |

El título de pelotón nunca tiene papel `gruppetto` (en `groupRoleOf` el grupo del título es `bunch`, `lead` o `chase`), así que `the gruppetto` solo entra por `crash`; los tres del grupo del maillot entran por el título con papel `chase` y un maillot dentro, y por `crash`. Con eso el test de los tres nombres (`stageJournal.test.ts` l. 1646-1650) se re-sella a propósito en el 4a con los siete: los cuatro papeles de D-18 y los tres del grupo del maillot; en el 4a solo cambian las filas de `GROUP_NOUNS`, que son un superconjunto de las de hoy, y el test de cada frase (l. 1624-1644) sigue en verde sin tocarse. Los casos con `mainRole` `chase`, con `mainJersey` para las ocho plantillas y con los cuatro papeles y los tres maillots para `crash` los gana en el 6b (§17.9), cuando la web ya pinta `mainRole` y `crash`: hasta entonces `crash` cae al `default` (l. 1602-1603) y esos casos fallarían.

**El test nocturno del vocabulario.** La medida de `storyMetrics` (`coherence.ts` l. 736-738, con `groupNounsOf`, l. 725-727) une las palabras DECLARADAS en `GROUP_NOUNS` de las plantillas que el MOTOR emite en la etapa; `crash` no es suceso del motor (D-13), pero los tres nombres del grupo del maillot entran en las filas de las ocho plantillas y de `time_gap`, que sí lo son. La unión pasa así de tres (`the bunch`, `the chase group`, `the lead group`) a seis, y el test «el vocabulario de grupos no pasa de tres nombres» (`coherence.test.ts` l. 347-360), que corre en el tramo «coherencia» de todo PR del motor, se pondría en rojo en el mismo 4a: se re-sella en él, a propósito y con la causa escrita, con el tope de seis (los tres papeles del título y los tres del maillot), y la cifra remedida sobre sus 60 etapas va en la descripción del PR. Ese test, en verde o en rojo, no dice nada de la pantalla: mira lo que emite el motor, no lo que ve el jugador. Lo que ve lo vigila `stageJournal.test.ts` («ninguna frase usa un nombre de grupo que no tenga declarado», l. 1624, y «los tres nombres que quedan…», l. 1646), que con los casos del 6b recorre cada plantilla de `MAIN_GROUP_TEMPLATES` con los cuatro papeles y los tres maillots, y `crash` con todos: la unión de lo que la voz servida puede decir queda dentro de los siete nombres, y B7 lo cita (§16.4). `raceRadioNames.test.tsx` (`apps/web/src/components/`, seis `it`) se re-sella en el paso 6 con las palabras de la barra (§6.3).

**Y cambia SPEC.** SPEC §6.15, que nació de la queja del dueño en la v27 («si lees todo el Journal no SABES quién va ganando, quién va persiguiendo… es un lío los últimos mensajes», `docs/balance.md` l. 5975-5976), dice «En la carretera hay TRES cosas, y por tanto hay tres nombres» y reparte `the chase group` y `the bunch` con `chaseKind` del motor (`SPEC.md` l. 604-615). D-18 añade un cuarto, `the gruppetto`, en la barra de todo grupo de detrás del grueso y en la voz de `crash`, y los tres del grupo del maillot en la barra y en la voz; y reparte los papeles con el corte de dos tercios de §6.3. SPEC es la fuente de verdad del diseño («Ante conflicto, SPEC.md manda», `Claude.md` l. 4), así que el cambio no puede quedar solo aquí: va al dueño con DD-04 (§20), con los siete nombres y el corte de §6.3 por defecto y, en contra, tres nombres con lo de detrás del grueso llamado `the bunch` o por su papel y el grupo del maillot nombrado por su papel, como dice SPEC; y el paso 12 (§17.15) reescribe SPEC §6.15 con lo que conteste (decisión 12-r).

### 12.7 La semilla neutra y el pasado estable

D-46, escrito como hecho (I-14, O-07; [DUEÑO 6], la coherencia en el tiempo: una etapa se sigue leyendo como el día en que se vio). Hoy la variante de una línea se elige con `variantIndex(seed, n)`, un FNV-1a módulo el número de redacciones (`stageJournal.ts` l. 111-115), sobre `${e.plantilla}:${e.km}:${plain}` (l. 325-326), donde `plain` son los NOMBRES unidos con el «and» inglés de `listNames` (l. 133-137, 272-274). El mapa 07 §3 encontró tres fallas: traducir `listNames` o renombrar a un corredor cambia la variante; añadir una redacción re-sortea el pasado, porque `h % n` cambia con `n`; y la identidad se resuelve con el equipo ACTUAL (`packages/db/src/results.ts` l. 191-207, el `leftJoin` sobre `riders.teamId` de l. 205), así que un traspaso reescribe crónicas viejas. Las tres se cierran en el paso 12, con un re-sello único.

```ts
// packages/shared/src/render/variants.ts (Variant es de §4.12)
/** La revisión de las plantillas. Sube en uno cuando un PR añade una redacción con `since` nuevo; nunca baja. Vale 0 al cerrar el paso 12. */
export const TEMPLATE_REV = 0

/** FNV-1a de 32 bits: la de variantIndex (stageJournal.ts l. 111-115), movida aquí sin cambiar un bit. */
export function fnv1a(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0
  return h
}

/** Elige SOLO entre las redacciones que ya existían en la revisión `rev` (D-46): añadir una no re-sortea el pasado. */
export function pickVariant<D>(seed: string, variants: readonly Variant<D>[], rev: number): Variant<D> {
  const alive = variants.filter((v) => v.since <= rev)
  const chosen = alive[fnv1a(seed) % alive.length]
  if (chosen === undefined) throw new Error(`pickVariant: ninguna redacción con since <= ${rev}`)
  return chosen
}
```

```ts
// apps/web/src/domain/stageJournal.ts (l. 325-326): la semilla y la elección, en el paso 12
/** LA SEMILLA NEUTRA (D-46): plantilla, km en décimas e ids ordenados; ni nombres ni el «and» inglés. */
export function variantSeed(e: ChronicleEntry): string {
  const ids = e.protagonists.map((p) => p.id ?? p.name).sort()
  return `${e.plantilla}:${Math.round(e.km * 10)}:${ids.join(',')}`
}
/** Una cadena es una redacción con since 0: las 272 de hoy lo son todas. Las nuevas se escriben { since, text }. */
type Phrasing = string | { readonly since: number; readonly text: string }
const asVariant = (o: Phrasing): Variant<null> => (typeof o === 'string' ? { since: 0, render: () => o } : { since: o.since, render: () => o.text })
// dentro de chronicleTemplate(e, rev): rev es la revisión de ESTA etapa, que llega con la cabecera o con el acta
const seed = variantSeed(e)
const pick = (opts: readonly Phrasing[]): string => pickVariant(seed, opts.map(asVariant), rev).render(null, NO_NAMES)
// y las dos de fuera la pasan, con el locale delante (12.11): hoy chronicleParts(e) y chronicleLine(e), l. 286 y 307
export function chronicleParts(_locale: 'en', e: ChronicleEntry, rev: number): ChroniclePart[]
export function chronicleLine(_locale: 'en', e: ChronicleEntry, rev: number): string
```

`rev` obliga a cambiar en el paso 12 la firma de `chronicleParts` y `chronicleLine`, que hoy solo reciben la línea: sus 102 llamadas de `stageJournal.test.ts` y la de `StageStory.tsx` (l. 114) cambian en ese mismo PR, que ya re-sella las variantes, y por eso el `locale` entra a la vez y no en E10 (contadas con `grep`).

`NO_NAMES` es un `NameResolver` que devuelve el id: las frases del journal ya llevan los nombres dentro y no lo usan. El km de una `ChronicleEntry` ya es entero (`Math.round(e.km)`, `chronicle.ts` l. 314), así que hoy la semilla lleva el km por diez; las décimas son para el día en que la línea lleve el km del motor sin redondear. `p.id ?? p.name` cubre al corredor que no se resuelve, que sale con `id` null y el id crudo por nombre (`unknownRider`, `chronicle.ts` l. 234-242): la semilla sigue siendo un id.

**La revisión de cada etapa.** En una noticia es `news.tpl_rev`, que `emitNews` escribe con el `TEMPLATE_REV` del día (§13.2). En la voz y el acta es el `TEMPLATE_REV` vigente cuando se corrió la etapa, y se guarda (decisión 12-c) en la columna `stage_timelines.tpl_rev` (`smallint not null`, sin defecto: §13.3 y 13-j), que entra en la `0044` del paso 5 y no en una quinta migración (17-a): `recordStageTimeline` toma el `TEMPLATE_REV` del tick y `stageTimelineRow` lo pone en la fila de la etapa (§5.5), la lápida lleva 0, y `flush` escribe una u otra con las demás filas del día; la lee `readStageTemplateRev` (§5.6), y viaja como `BroadcastHead.tplRev` (§4.11) y como `tplRev` opcional en `stageReplaySchema` (§14.2; opcional por la web de ayer, D-50), que es el `StageReport` del acta (§4.11). Una etapa sin línea usa la revisión 0: sus variantes no cambian nunca, que es lo que importa. Así una redacción nueva con `since: 1` solo la pueden elegir las etapas corridas desde que existe, y las de antes se leen igual que el día en que se vieron.

**La identidad del día.** El equipo de cada mención es el del día de la etapa: el de `TimelineCast` (§4.2) en una etapa con línea y, sin ella, `stage_snapshots.input.riders[].teamId` (`RiderInput.teamId`, `packages/engine/src/stage/types.ts` l. 264). `getRaceRiderIdentities` (`results.ts` l. 191-207) gana un tercer parámetro con el equipo del día de cada corredor y resuelve el nombre de ESE equipo, y la ruta de etapa (`routes/races.ts` l. 501) y la del tramo se lo pasan. El nombre del corredor sigue siendo el de hoy (no cambia) y el del equipo es el nombre actual del equipo de aquel día.

**El re-sello único y B5.** Cambiar la semilla cambia la redacción elegida en parte de las líneas: los tests de `stageJournal.test.ts` que fijan una variante concreta se re-sellan UNA vez, en el paso 12, con la causa escrita en el propio test, y ese mismo PR congela B5 (§16.4): el hash de todas las líneas renderizadas de las etapas congeladas de `apps/api/src/__fixtures__/broadcast/`. Desde entonces una redacción nueva entra con `since` igual al `TEMPLATE_REV` nuevo y el hash no se mueve; si se mueve, alguien ha cambiado el pasado y el test lo dice.

### 12.8 Las noticias

D-45, escrito como hecho (I-13, I-25, O-06, O-07; punto 5 del encargo; [DOC 1]). El plazo sale de la decisión 2 del dueño («**Uno y para siempre**, con un **reset** al pasar de pruebas a juego de verdad», `docs/agenda.md` l. 35), y la agenda lo deduce y lo fija así: «El plazo queda en: **antes del reset**, añadir `seed` y `data` a `news` y mover el renderizado al momento de leer. Después del reset, cada noticia escrita sí es definitiva, porque a partir de ahí no habrá otro borrado.» (l. 131-133). Por eso la primera migración de E2 es `0043_noticias_con_datos` (§13.2) y el paso 1 va en paralelo a todo lo demás (§17.4). Hoy `emitNews` redacta al escribir y guarda solo `kind` y `text` (`packages/db/src/news.ts` l. 28-49); la semilla la calculan quienes llaman y se tira (`win:${seedBase}`, `stageRun.ts` l. 1195 y 1214). E2 es el dueño del arreglo: el mapa 05 lo daba a tres (Oleada 0, E2 y E10; contradicción 6) y el encargo lo resuelve a favor de E2 (`00-encargo.md` l. 27-29).

**Lo que se guarda.** `emitNews` recibe un `NewsPayload` (§4.12) con ids, códigos y números y nunca nombres ni inglés: `detail` desaparece y en su lugar van `reason`, `days`, `relocateCountry`, `housingCovered` y `age`. Guarda la semilla, los datos, `race_key`, `stage_day` y `tpl_rev`, y, hasta DD-19, `text` redactado con `renderNews` y los nombres del momento (la inserción entera es §13.2). `teamId` es el equipo del DÍA del hecho: en los titulares de etapa, el del corredor en la entrada de la etapa (`input.riders[].teamId`, la misma fuente que el reparto congelado y `teamOfDay`; decisión 17-r, que pasa esa entrada a `awardOutcome` en el PR 1a, porque hoy no la recibe, `packages/db/src/stageRun.ts` l. 1143-1149); en los demás, el de `riders.team_id` cuando el tick escribe. Al leer ya no se consulta: un traspaso posterior no reescribe el titular (O-07).

**Las once de hoy y las dos nuevas.** El texto de hoy va carácter a carácter; `\u2014` es la raya U+2014, que el código de hoy lleva literal y que aquí se escribe escapada.

| `kind` | Quién lo emite | `data` (además de `kind`) | Semilla | Hoy (`world/news.ts` l. 33-50) | Render nuevo (`en`) |
| --- | --- | --- | --- | --- | --- |
| `stage_win` | `stageRun.ts` l. 1210 (`awardOutcome`) | `raceId`, `season`, `stageDay`, `riderId`, `teamId` | `win:${raceKey}:${gameDay}:${stageDay}` | `${rider} wins stage ${stage} of the ${race}.` | igual |
| `tt_win` | ídem, crono de una vuelta | ídem | ídem | `${rider} wins the stage ${stage} time trial at the ${race}.` | igual |
| `breakaway_win` | ídem, con fuga | ídem | ídem | `${rider} wins stage ${stage} of the ${race} from the breakaway.` | igual; solo si el ganador iba en la fuga |
| `one_day_win` | ídem, carrera de un día | ídem, `stageDay` 1 | ídem | `${rider} wins the ${race}.` | igual |
| `one_day_tt_win` | ídem, crono de un día | ídem, `stageDay` 1 | ídem | `${rider} wins the ${race} time trial.` | igual |
| `kom` | `stageRun.ts` l. 1247, última etapa de una vuelta, con puntos | ídem, `stageDay` la última | `kom:${raceKey}` | `${rider} wins the mountains classification at the ${race}.` | igual |
| `gc_win` | `stageRun.ts` l. 1223, última etapa de una vuelta | ídem, `stageDay` la última | `gc:${raceKey}:${gameDay}:${stageDay}` | `${rider} wins the ${race} overall.` | igual |
| `contract` | `packages/db/src/contracts.ts` l. 332 | `riderId`, `toTeamId`, `fromTeamId`, `relocateCountry`, `housingCovered` | `contract:${offerId}` | `` ${rider} signs for ${team}${detail ? ` ${detail}` : ''}. ``, con `detail` = `, relocating to ${country}` más ` with housing covered` (l. 327-329): `R signs for T , relocating to Spain.` | `R signs for T, relocating to Spain.`: sin el espacio antes de la coma |
| `injury` | `stageRun.ts` l. 1131 (`applyIncidents`) | `raceId`, `season`, `stageDay`, `riderId`, `teamId`, `days`, `prevHealth`, `prevUntilDay` | `injury:${raceKey}:${gameDay}:${riderId}` | `` ${rider} injured${detail ? ` \u2014 out for ${detail}` : ''}. ``, con `detail` = `${Math.round(d / 7)} weeks` desde 14 días y `${d} day(s)` por debajo (l. 1127-1130) | igual, con `days` |
| `abandon` | `stageRun.ts` l. 1069 (`markAbandons`); `riderSchedule.ts` l. 299, entre etapas | `raceId`, `season`, `stageDay` (null entre etapas), `riderId`, `teamId`, `reason` | `abandon:${raceKey}:${gameDay}:${riderId}` | `` ${rider} abandons the ${race}${stage ? ` on stage ${stage}` : ''}${detail ? ` \u2014 ${detail}` : ''}. ``, con `ABANDON_DETAIL[reason]` (l. 1020-1026) | igual, con `reason` |
| `retirement` | `rollover.ts` l. 326 | `riderId`, `teamId`, `age` | `${worldSeed}:retire:${riderId}` | `` ${rider} retires${detail ? ` ${detail}` : ''}. ``, con `detail` = `at ${age}` | igual |
| `gc_lead_taken` | NUEVA: `awardOutcome`, de la etapa 2 a la penúltima | `raceId`, `season`, `stageDay`, `riderId`, `teamId` | `lead:${raceKey}:${gameDay}:${stageDay}` | no existe | `${rider} takes the overall lead at the ${race}.` |
| `jersey_taken` | NUEVA: ídem, puntos y montaña | ídem más `jersey` | `jersey:${jersey}:${raceKey}:${gameDay}:${stageDay}` | no existe | `${rider} takes the points lead at the ${race}.` y `${rider} takes the mountains lead at the ${race}.` |

`raceKey` es `${raceId}:s${season}` (`packages/shared/src/raceKey.ts`); la carrera viaja como `raceId` y `season` y no como nombre, y `raceOfHeadline` (`apps/web/src/domain/newsFeed.ts` l. 17-24), que buscaba el nombre de la carrera dentro del titular inglés, muere: el enlace sale de `raceId` (D-45). Las dos nuevas son un hecho por línea y caben en 70 caracteres con nombres cortos, como pide el test de hoy (`world/news.test.ts` l. 20-38). En la última etapa las cubren `gc_win` y `kom`; en la primera, el titular de la victoria (el primer líder casi siempre es el ganador). Las etiquetas del feed (`NEWS_KIND_LABEL`, `apps/web/src/domain/labels.ts` l. 167-181) ganan `gc_lead_taken: 'Leader'`, `jersey_taken: 'Jersey'` y `stage_ready: 'Watch'` (pantalla; el marcador de §11.7).

```ts
// packages/shared/src/news.ts (sigue a los tipos de §4.12). No importa contracts.ts (14-a): el esquema vive aquí y contracts.ts lo importa.
import { z } from 'zod'
import { HEALTH_STATES } from './rider.js'
import { pickVariant, type Variant } from './render/variants.js'

const ofRace = { raceId: z.string().min(1), season: z.number().int().min(0) }
const who = { riderId: z.string().min(1), teamId: z.string().min(1).nullable() }
const stageDay = z.number().int().min(1)
export const abandonReasonSchema = z.enum(['colapso', 'fuera_control', 'lesion', 'enfermedad', 'voluntario']) satisfies z.ZodType<AbandonReason>
/** Lo que lee la API de news.data. Una fila que no valida se pinta con su `text`, o no se pinta (§14.2). */
export const newsPayloadSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.enum(['stage_win', 'tt_win', 'breakaway_win', 'one_day_win', 'one_day_tt_win', 'gc_win', 'kom', 'gc_lead_taken']), ...ofRace, stageDay, ...who }),
  z.object({ kind: z.literal('jersey_taken'), ...ofRace, stageDay, ...who, jersey: z.enum(['points', 'kom']) }),
  z.object({ kind: z.literal('abandon'), ...ofRace, stageDay: stageDay.nullable(), ...who, reason: abandonReasonSchema }),
  z.object({ kind: z.literal('injury'), ...ofRace, stageDay, ...who, days: z.number().int().min(1), prevHealth: z.enum(HEALTH_STATES), prevUntilDay: z.number().int().nullable() }),
  z.object({ kind: z.literal('contract'), riderId: z.string().min(1), toTeamId: z.string().min(1), fromTeamId: z.string().min(1).nullable(), relocateCountry: z.string().length(2).nullable(), housingCovered: z.boolean() }),
  z.object({ kind: z.literal('retirement'), ...who, age: z.number().int().min(0) }),
]) satisfies z.ZodType<NewsPayload>

/** Lo que decía ABANDON_DETAIL (stageRun.ts l. 1020-1026), que se retira: el motivo es un código y la frase se pone al leer. */
const ABANDON_WORDS: Readonly<Record<AbandonReason, string>> = {
  colapso: 'climbs off, out of energy', fuera_control: 'eliminated on time', lesion: 'injured', enfermedad: 'ill', voluntario: 'withdraws',
}
/** La baja, como la contaba applyIncidents (l. 1127-1130): semanas desde 14 días, días por debajo. */
const outFor = (d: number): string => (d >= 14 ? `${Math.round(d / 7)} weeks` : `${d} day${d === 1 ? '' : 's'}`)

/** La variante de NewsPayload de cada kind. No `Extract<NewsPayload, { kind: K }>`: siete kinds comparten variante con una unión en `kind`
 *  (`stage_win | tt_win | breakaway_win` y `one_day_win | one_day_tt_win | gc_win | kom`) y para ellos Extract da `never` (17 TS2339,
 *  compilado en `corr-l8/ws1`); la intersección se reparte por la unión y solo anula las variantes cuyo `kind` no admite K. */
type Of<K extends NewsKind> = NewsPayload & { readonly kind: K }
/** Las redacciones de cada kind, con su `since`. Todas since 0: reproducen el inglés de hoy salvo la coma de `contract`. */
export const NEWS_VARIANTS: { readonly [K in NewsKind]: readonly Variant<Of<K>>[] } = {
  stage_win: [{ since: 0, render: (d, n) => `${n.rider(d.riderId)} wins stage ${d.stageDay} of the ${n.race(d.raceId)}.` }],
  tt_win: [{ since: 0, render: (d, n) => `${n.rider(d.riderId)} wins the stage ${d.stageDay} time trial at the ${n.race(d.raceId)}.` }],
  breakaway_win: [{ since: 0, render: (d, n) => `${n.rider(d.riderId)} wins stage ${d.stageDay} of the ${n.race(d.raceId)} from the breakaway.` }],
  one_day_win: [{ since: 0, render: (d, n) => `${n.rider(d.riderId)} wins the ${n.race(d.raceId)}.` }],
  one_day_tt_win: [{ since: 0, render: (d, n) => `${n.rider(d.riderId)} wins the ${n.race(d.raceId)} time trial.` }],
  kom: [{ since: 0, render: (d, n) => `${n.rider(d.riderId)} wins the mountains classification at the ${n.race(d.raceId)}.` }],
  gc_win: [{ since: 0, render: (d, n) => `${n.rider(d.riderId)} wins the ${n.race(d.raceId)} overall.` }],
  gc_lead_taken: [{ since: 0, render: (d, n) => `${n.rider(d.riderId)} takes the overall lead at the ${n.race(d.raceId)}.` }],
  jersey_taken: [{ since: 0, render: (d, n) => `${n.rider(d.riderId)} takes the ${d.jersey === 'points' ? 'points' : 'mountains'} lead at the ${n.race(d.raceId)}.` }],
  contract: [{ since: 0, render: (d, n) =>
    `${n.rider(d.riderId)} signs for ${n.team(d.toTeamId)}${d.relocateCountry === null ? '' : `, relocating to ${n.country(d.relocateCountry)}${d.housingCovered ? ' with housing covered' : ''}`}.` }],
  injury: [{ since: 0, render: (d, n) => `${n.rider(d.riderId)} injured \u2014 out for ${outFor(d.days)}.` }],
  abandon: [{ since: 0, render: (d, n) =>
    `${n.rider(d.riderId)} abandons the ${n.race(d.raceId)}${d.stageDay === null ? '' : ` on stage ${d.stageDay}`} \u2014 ${ABANDON_WORDS[d.reason]}.` }],
  retirement: [{ since: 0, render: (d, n) => `${n.rider(d.riderId)} retires at ${d.age}.` }],
}

/** EL TITULAR AL LEER (D-45). Semilla y revisión, las de la fila. `_locale`: el literal 'en' hasta E10, que ensancha el tipo y lo renombra
 *  cuando lo lea; con el nombre sin `_`, `noUnusedParameters` (tsconfig.base.json) da TS6133 y el 1a no pasaría `pnpm typecheck`. */
export function renderNews(_locale: 'en', p: NewsPayload, seed: string, rev: number, n: NameResolver): string {
  const variants = NEWS_VARIANTS[p.kind] as readonly Variant<NewsPayload>[]
  return pickVariant(`news:${p.kind}:${seed}`, variants, rev).render(p, n)
}
```

`injury` siempre tiene días (`applyIncidents` salta las de `diasBaja ≤ 0`, l. 1114) y `abandon` siempre tiene motivo (`ABANDON_DETAIL` es total), así que los condicionales de hoy sobre `detail` se quedan en su rama con texto. La semilla de `pickVariant` es la de hoy, `news:${kind}:${seed}` (`world/news.ts` l. 55); con una redacción por `kind`, que la función de elección pase de `seededRng` a FNV-1a no cambia ningún titular. `country(iso2)` resuelve con `COUNTRIES` (`packages/shared/src/countries.ts`), como hoy `contracts.ts` l. 326.

**Las piezas que cambian con esto.** (1) `renderNews` y `NewsData` salen del motor en el PR 4a (`packages/engine/src/world/news.ts` l. 21-58; quedan los códigos) y su test pasa a `packages/shared/src/news.test.ts` con los mismos casos sobre `NewsPayload` y un resolutor de prueba (D-45). (2) `emitNews` recibe el payload y la semilla y, hasta DD-19, redacta `text` con `renderNews('en', p, seed, TEMPLATE_REV, n)` y un `NameResolver` leído de la base en la misma transacción. (3) `getGlobalNews`, `getTeamNews` y `getRiderNews` (`news.ts` l. 67-146) redactan al LEER: con `data` válido, `renderNews` con la semilla y el `tpl_rev` de la fila; sin él, `text`, que es una fila anterior a la `0043`; el resolutor carga en dos consultas los nombres de los corredores, equipos y carreras de la página (se propone `newsNames(db, payloads)` en `packages/db/src/news.ts`). (4) `abandon.test.ts` l. 232-237 deja de leer `news.text` y comprueba el render. (5) `ABANDON_DETAIL` y el `outFor` de `applyIncidents` se retiran de `stageRun.ts`: su texto vive en `ABANDON_WORDS` y `outFor`.

La firma nueva de `emitNews`, que §13.2 da por escrita aquí (la inserción, con sus columnas, es §13.2, que llama `p` al payload):

```ts
// packages/db/src/news.ts (PR 1a)
export async function emitNews(
  tx: NewsWriter,                  // Tx | Database, como hoy (news.ts l. 14-20): la retirada voluntaria escribe fuera de una transacción
  opts: {
    worldId: string
    gameDay: number
    seed: string                   // la que ya calcula quien llama: la de la columna Semilla de la tabla de las trece
    payload: NewsPayload           // §4.12; sustituye a `kind` y a `data: NewsData`: el kind de la fila es payload.kind
    raceKey?: string | null        // spec.raceKey de quien llama; null en contract y retirement (§13.2)
    riderId?: string | null        // el protagonista, como hoy
    personal?: boolean
  },
): Promise<void>
// text, hasta DD-19: renderNews('en', opts.payload, opts.seed, TEMPLATE_REV, await newsNames(tx, [opts.payload]))
```

**`breakaway_win`, comprobado.** Hoy basta con que haya habido `fuga_formada` y ninguna `fuga_cazada` (`stageRun.ts` l. 1184-1186); D-45 exige además que el ganador vaya en la fuga, es decir, que su grupo en la última foto de la radio del colector tenga `kind` `fuga`. `awardOutcome` recibe esa radio, que el tick ya construye (`stageRun.ts` l. 515) antes de guardarla (l. 586). Medido con `l8/fuga.mjs` en las 22 etapas en línea de las 24 del mapa 07 §7 con las semillas 0 y 1: la regla de hoy dice «desde la fuga» en 16 de 44, y en las 16 el ganador va en un grupo `fuga` en la última foto; la foto sola lo diría en 10 más, que son ataques del final después de cazada la fuga del día. Por eso la condición se AÑADE a la de hoy y no la sustituye: en la muestra no cambia ningún titular, y deja escrito en el código lo que el titular afirma.

**`injury` con la salud de antes.** `applyIncidents` conoce la salud previa antes de escribir la nueva (l. 1117-1123: `health` y `healthUntilDay` del corredor), y la guarda en `prevHealth` y `prevUntilDay`: es lo que la máscara de salud de la ficha (sup. P5, mecanismo M de §10.6) enseña mientras la etapa de la caída esté velada.

**Los dos titulares nuevos** (I-25). Hoy no hay titular de cambio de líder (mapa 02 §3), y el MVP lo pide: «tras una etapa reina, el feed cuenta la historia sin repetirse» (`MVP.md` l. 160, paso 39). `awardOutcome` los escribe tras el de la victoria, en una vuelta y de la etapa 2 a la penúltima, comparando el PRIMERO de cada clasificación tras la etapa con el de tras la anterior. Se usa el primero de la clasificación y no el portador del maillot, que puede ser otro por la delegación (`assignLeaderJerseys`, `jerseys.ts`), porque el titular dice quién manda en la clasificación. Las lecturas son las de la ficha de la etapa (`getGcThroughStage`, `getPointsClassification` y `getKomClassification` de `packages/db/src/results.ts`, que tiran a los de cero puntos, l. 344 y 403), como el reparto de 7-b. Las tres reciben hoy `db: Database` (l. 236-239, 320-323 y 379-382), que la transacción del tick no satisface (`PgTransaction` no es asignable a `PostgresJsDatabase<…> & { $client }`, `client.ts` l. 34-35: TS2379, medido por el refutador de código en `rcod/n/ws/packages/db/src/zz_probe.ts`), y hoy ninguna se llama desde el tick. Por eso el PR 1a les cambia el primer parámetro a `q: Queryable` (`Database | Tx`, el de `titles.ts`, §7.4), que las rutas siguen llamando con `db`; y el 8a les añade `worldHorizon` detrás de `q`, como a toda lectura del tick (§10.6, punto 1):

```ts
// packages/db/src/stageRun.ts, awardOutcome (l. 1143), tras la noticia de la victoria (l. 1210-1217). Tal como queda tras el 8a;
// en el 1a, las mismas llamadas sin `worldHorizon`.
if (!isOneDay && !spec.isFinal && spec.stageDay >= 2) {
  const firstOf = async (day: number) => ({                              // tx es la transacción del día: `q: Queryable` (§7.4)
    gc: (await getGcThroughStage(tx, worldHorizon, spec.raceKey, day))[0]?.riderId ?? null,
    points: (await getPointsClassification(tx, worldHorizon, spec.raceKey, day))[0]?.riderId ?? null,
    kom: (await getKomClassification(tx, worldHorizon, spec.raceKey, day))[0]?.riderId ?? null,
  })
  const [before, after] = [await firstOf(spec.stageDay - 1), await firstOf(spec.stageDay)]
  const race = { raceId: spec.raceId, season: spec.season, stageDay: spec.stageDay }
  if (after.gc !== null && after.gc !== before.gc)
    await emitNews(tx, { worldId, gameDay, raceKey: spec.raceKey, riderId: after.gc, seed: `lead:${seedBase}`,
      payload: { kind: 'gc_lead_taken', ...race, riderId: after.gc, teamId: teamOfDay(after.gc) } })
  for (const jersey of ['points', 'kom'] as const) {
    const rider = after[jersey]
    if (rider === null || rider === before[jersey]) continue
    await emitNews(tx, { worldId, gameDay, raceKey: spec.raceKey, riderId: rider, seed: `jersey:${jersey}:${seedBase}`,
      payload: { kind: 'jersey_taken', ...race, riderId: rider, teamId: teamOfDay(rider), jersey } })
  }
}
```

`teamOfDay` es el `teamId` del corredor en la entrada de la etapa (`input.riders`). Son seis lecturas más por etapa de vuelta, las mismas que ya hace la ficha de la etapa; entran en B15 (§16.4).

**El orden dentro del día.** Hoy todas las noticias de un día comparten `created_at` y el orden es el que devuelva Postgres (mapa 04 §1.2; `news.ts` l. 87 ordena por `game_day desc, created_at desc`). El orden nuevo es `game_day desc`, `race_key` (nulos al final), `stage_day desc` (nulos al final), la prioridad del `kind` y `id`. Un `StageReadyItem` ocupa el sitio de las filas de su etapa con prioridad 0 (§11.7).

| Prioridad | `kind` | Por qué ese sitio |
| --- | --- | --- |
| 1 | `gc_win` | la general final es la noticia de la carrera |
| 2 | `gc_lead_taken`, `jersey_taken` | quién manda ahora, lo que cambia mañana |
| 3 | `stage_win`, `tt_win`, `breakaway_win`, `one_day_win`, `one_day_tt_win` | la etapa |
| 4 | `kom` | la montaña final |
| 5 | `abandon` | quién se va |
| 6 | `injury` | quién se hace daño |
| 7 | `contract` | fuera de carrera |
| 8 | `retirement` | fuera de carrera |

```sql
-- packages/db/src/news.ts: el orden de getGlobalNews, getTeamNews y getRiderNews (hoy l. 87, 112 y 140)
order by game_day desc, race_key asc nulls last, stage_day desc nulls last,
  case kind when 'gc_win' then 1 when 'gc_lead_taken' then 2 when 'jersey_taken' then 2
    when 'stage_win' then 3 when 'tt_win' then 3 when 'breakaway_win' then 3 when 'one_day_win' then 3
    when 'one_day_tt_win' then 3 when 'kom' then 4 when 'abandon' then 5 when 'injury' then 6
    when 'contract' then 7 when 'retirement' then 8 else 9 end, id
```

**`text` de compatibilidad** (DD-19). La web cargada valida `text: z.string()` (`packages/shared/src/contracts.ts` l. 790) y, si llega null, lanza `ContractError` y la pestaña de noticias se rompe (`apps/web/src/api/request.ts` l. 91-111; X-20). Por eso la API sigue mandando `text` redactado además de `payload` (§14.2) hasta una versión de la web posterior al reinicio (DD-19), y `emitNews` lo sigue escribiendo hasta entonces. El único cambio de texto que ve un jugador es la coma de `contract`: hoy `R signs for T , relocating to Spain with housing covered.`, porque `detail` empieza por la coma y la plantilla le pone un espacio delante (`contracts.ts` l. 327-329 y `world/news.ts` l. 41; mapa 02 §3); desde el PR 1a, `R signs for T, relocating to Spain with housing covered.`, y el PR lo dice en su descripción.

**Los tests de las noticias** (paso 1, suite rápida):

| Test | Qué fija |
| --- | --- |
| `packages/shared/src/news.test.ts` (sustituye a `packages/engine/src/world/news.test.ts` en el 4a) | un golden por `kind`, los trece, con un resolutor de prueba; el de hoy carácter a carácter salvo `contract`; menos de 70 caracteres con nombres cortos; `newsPayloadSchema` rechaza un payload sin `prevHealth` o con un `reason` desconocido |
| `packages/db/src/news.test.ts` (nuevo, PGlite) | `emitNews` escribe `data`, `seed`, `race_key`, `stage_day`, `tpl_rev` y `text`; leer da el mismo texto que se escribió (B4); una fila anterior a la `0043`, solo con `text`, se sigue leyendo; el orden del día es el de la tabla de prioridades |
| `packages/db/src/abandon.test.ts` l. 232-237 | re-sellado: el titular se comprueba renderizando `data`, no leyendo `news.text` |
| `packages/db/src/stageRun.test.ts` | `breakaway_win` solo con el ganador en un grupo `fuga`; `gc_lead_taken` y `jersey_taken` cuando cambia el primero, nunca en la primera ni en la última etapa; `injury` con la salud de antes |
| `apps/web/src/domain/newsFeed.test.ts` l. 32-44 | re-sellado: el enlace sale de `raceId` y `raceOfHeadline` desaparece |

### 12.9 Los narradores sobrantes

D-47, escrito como hecho (I-41; contradicción 9 del mapa 05). Hoy hay dos fraseos de las mismas plantillas: el journal (`stageJournal.ts`) y `apps/web/src/domain/narration.ts`, con tres piezas que se tratan una a una.

| Pieza | Hoy | E2 | Paso |
| --- | --- | --- | --- |
| `narrate()` y su tabla `CHRONICLE` (l. 16-124; la tabla, l. 16-107) | 19 plantillas y 56 redacciones (medido evaluando la tabla; el mapa 07 §3 dice 57 porque cuenta también la línea de la declaración, l. 16), con cero llamadas en producción: solo la usa su test (`narration.test.ts`, ejecutabilidad #5) | se borra, con sus casos de `narration.test.ts` | 12 |
| `personalNarration(plantilla)` (l. 127-149) | segunda persona para siete plantillas y, en las demás, la clave cruda (`default`, l. 146-147) en `LastRaceReport.tsx` (l. 4 y 97) | se sustituye por las líneas del acta en las que el corredor es protagonista, redactadas con `chronicleLine`: lo que no tiene frase no se imprime | 12 |
| `raceVerdict(r)` (l. 152-164) | el veredicto por prioridades, sobre la última etapa CORRIDA, que pinta `LastRaceReport.tsx` l. 32 | la misma lógica, sobre la última etapa CONOCIDA | 8a |

**Los momentos del corredor.** `riderRaceReportSchema` (`contracts.ts` l. 1554-1569) gana `moments`, opcional: las `ChronicleEntry` del acta de esa etapa (`buildChronicle` sin `live` sobre `stage_snapshots.events`, con los nombres del día de 12.7) en las que el corredor es protagonista o su `forId` (`mentions`). Los produce el manejador de `GET /api/riders/me/last-race` (`apps/api/src/routes/riders.ts` l. 198-204), y no `getRiderLastRaceReport` (`packages/db/src/raceReport.ts` l. 78): `packages/db` no puede llamar a `buildChronicle`, que vive en `apps/api` (sus dependencias son `@cyclingstar/engine`, `@cyclingstar/shared`, `drizzle-orm` y `postgres`, `packages/db/package.json`). Con la etapa del informe, el manejador lee `stage_snapshots.events` y los nombres del día (`getRaceRiderIdentities` con el equipo del día, 12.7) y filtra `buildChronicle(events, names)` por `protagonists` y `mentions` del corredor; el esquema es el de §14.2 (`riderRaceReportSchema` + `moments`), y el PR 12 toca la ruta (§17.15, §17.20). Como `moments` es opcional, nada fallaría al compilar si nadie lo escribiera y la tarjeta `Last race` se quedaría sin los momentos del corredor; por eso el PR 12 lo fija con un test nuevo, `apps/api/src/routes/lastRace.test.ts` (PGlite, con una etapa corrida por `runOneStage`): con la etapa conocida, `report.moments` lleva las líneas del acta en que el corredor es protagonista o destinatario, en el orden del acta; y si la última corrida está velada, el informe es el de la anterior conocida y `ready` lleva la velada (§14.2). La web los pinta con `chronicleLine`; `personalEvents`, que solo trae `{ km, plantilla }`, se sigue mandando mientras haya una web que lo lea (DD-19) y deja de pintarse. El racimo de `groupRuns` en el que va el corredor cuenta como momento suyo: es la línea que dice que se descolgó.

**La última etapa conocida.** `/api/riders/me/last-race` (`apps/api/src/routes/riders.ts` l. 198-204) llama a `getRiderLastRaceReport` (`packages/db/src/raceReport.ts` l. 78), que hoy elige la última etapa corrida por día absoluto. Gana el `Horizon` como segundo parámetro (§10.6) y elige la última que NO está en el velo; si la última corrida está velada, la respuesta lleva además `ready` (`lastRaceResponseSchema`, §14.2) y la portada dice `Your last race · Race France, Stage 8 · Ready to watch` (pantalla; sup. H1 y H5, §11). Lo que no se toca: `raceReport.ts` re-simula la etapa (l. 148) y escribe su `story` en inglés (l. 157-170). Reescribirlo para que lea los sucesos guardados es el paso 17d de la táctica; E2 no lo hace y, como no sube `ENGINE_VERSION` (D-09), tampoco lo rompe: la re-simulación sigue contando la misma carrera.

### 12.10 La radio guardada

D-16, escrito como hecho (I-05; [DUEÑO 10], la radio sigue siendo el microscopio). Hay dos maneras de mirar la misma etapa y las dos se quedan. La FOTO es la del dueño: un km de la carretera, con los grupos que pasan por él y sus huecos como resta de relojes en ese punto, que es lo que enseña `Race Radio` (pantalla). El INSTANTE es la de la tele: la carretera entera en una hora, cada grupo donde está en ese momento, que es lo que enseña `Watch` (§4.5). La foto no se sustituye por el instante porque sirven para cosas distintas: el microscopio compara un km con otro, la retransmisión sigue una hora.

**Hasta el paso 11, la radio se escribe igual.** `stage_snapshots.radio` sigue saliendo de `radioForStorage` (`stageRun.ts` l. 586) y la pestaña la sigue leyendo con `buildRaceRadio` (`chronicle.ts` l. 1340). Lo que destripa de ella, la lista de seguimiento que mete a los diez primeros DE LA ETAPA desde el km 0 (`stageRun.ts` l. 558-568; mapa 07 §5.2, ceguera 1), se corta al LEER con `veilStoredRadio` (§11.16): la radio servida de una etapa no conocida pasa por la política de nombres de §7.7, y el deslizador llega solo hasta lo alcanzado.

**En el paso 11, la radio sale de la línea.** Desde el 11a, el primero de sus dos PR (17-v), `radioFromTimeline(tl, names): RaceRadio` (`packages/shared/src/broadcast/radio.ts`, §4.13) construye el contrato de hoy (de `radioGroupSchema` a `raceRadioSchema`, `contracts.ts` l. 1427-1480) desde la línea grabada: por cada bloque de foto (`photoBlocksOf`, §4.5), los grupos de `photoAt` (§4.4) con su `kind`, tamaño y huecos (`gapS`, `gapToPrevS`), y de la capa de detalle (§4.2) la velocidad, el percance, los que tiran con su motivo y destinatario y `pullingTotal`; `racing` y `gone` salen de los `out`. En una crono (`tl.timeTrial`) devuelve la radio vacía (`kms: []`), que es la que la envoltura guarda hoy: la crono ignora la sonda (`simulate.ts` l. 1264) y solo llama a `onTimeTrialRide` (§5.2). Lo midió el refutador de código con el `dist` del motor v89 y la envoltura de hoy (`rcod/n/ws/ttradio.mjs`): `race-france` e1 pide 21 km de radio y guarda 0, y la e16 pide 27 y guarda 0 (la duda 1.10 queda cerrada). Acepta también una línea cortada (`TimelineCore`, 4-b): desde el paso 11, la pestaña de una etapa no conocida la construye la web con los tramos ya descargados y solo enseña las fotos cerradas en lo pintado (11-i, §11.16, §17.14).

**A quién nombra cada grupo** (decisión 12-o). Lo decide `names`, que no puede ser solo la identidad: `RadioNames` (§4.13) lleva `riderOf`, la forma de `ChronicleNames` (`chronicle.ts` l. 193-195) con que se pone cara a un id; `own`, los corredores del espectador; y `nameableAt(km)`, los nombrables en la foto de ese km. Un grupo de hasta `BROADCAST.nameWholeGroupUpTo` (12) va entero en `riders`, como en la radio guardada (`NAME_WHOLE_GROUP_UP_TO`, `raceRadio.ts` l. 611); en uno mayor, `riders` son los que tiran, con su motivo y su destinatario, los de `own` en todas las fotos en que corren (R23.7: «EL CORREDOR PROPIO SIEMPRE APARECE NOMBRADO EN SU RADIO», `docs/tactica.md` l. 4875) y los de `nameableAt(km)`, y `unnamed` es el resto, que se cuenta. Con una firma que solo trajera `riderOf` no se podría aplicar la política de §7.7, que necesita saber quién es del espectador y qué se ha revelado. Quien construye `names` elige la política:

| Quién llama | `own` | `nameableAt(km)` |
| --- | --- | --- |
| la pestaña de una etapa NO conocida, en la web, sobre la línea cortada en lo pintado (11-i) | los del espectador (`RiderCard.own`) | la política de §7.7 sobre el reparto servido, que ya viene con el velo: los que llevan un maillot que no es el de su equipo, los `namedGcTop` (10) primeros de la general de salida y los protagonistas de los sucesos revelados antes de esa foto |
| la ruta de etapa de una etapa CONOCIDA (letras `W`, `S`, `R` o `A`) y `?diag=1` (§11.15) | los del espectador | lo mismo, más los diez primeros de la etapa (de `stage_results`), los que mete hoy la lista de seguimiento (`stageRun.ts` l. 558-568): en una etapa conocida no destripan nada, y es a quien el dueño sigue por la radio aunque no tire («pero no dice quién es, wey», `docs/balance.md` l. 9594, v57; «Hay un ciclista suelto que se quedó descolgado del pelotón… ¿cómo es posible que vaya tan rápido como el pelotón?», l. 7898-7899) |
| B16 (§16.4) | vacío, salvo en su caso de R23.7 | la lista que recibe `radioForStorage` en el otro lado: vacía, o los diez primeros de la etapa |

No hay lista de seguimiento guardada: con la pertenencia completa en cada instante, nombrar ya no depende de lo que se guardó (§7.7), y la de la etapa conocida se pone al leer. Sin la fila de la etapa conocida, desde el paso 11 la radio dejaría de nombrar, km a km, al ganador que viajó escondido en el pelotón hasta que hiciera algo, que es justo lo que el microscopio del dueño enseña hoy.

**B16 antes de dejar de escribir** (O-16). I1 compara la foto reducida con la del motor, pero no cubre la capa de detalle; antes de dejar de escribir la radio hay que probar que la servida desde la línea es la de hoy. B16 (§16.4) compara `radioFromTimeline(tl, names)` con `buildRaceRadio(radioForStorage(radio, lista, []), chronicleNames)`, con el mismo `riderOf` en los dos lados (en la rápida, el que arma `load.ts` desde `manifest.json`; en la larga, uno sintético `Rider <índice>` por cada `riderId` de la entrada) y `own` vacío, en las 22 etapas en línea del mapa 07 §7: con la lista vacía, que es la radio de una etapa no conocida, igualdad km a km en grupos, tamaños, huecos, velocidades, percances, relevistas con su motivo y su destinatario, `pullingTotal`, `racing` y `gone`, en el conjunto de los nombrados a rueda y en `unnamed`; con los diez primeros de la etapa, que es la conocida, que cada uno de ellos va en `riders` de su grupo en toda foto en que corre, en las dos radios, y que `unnamed` es igual (no la igualdad entera: la guardada conserva como relevista a uno de la lista que tira por detrás de los doce de `STORED_PULLERS_MAX`, `raceRadio.ts` l. 912-913, y la línea solo guarda esos doce, §5.4). En las dos cronos, las dos radios son vacías (`kms.length === 0`).

**DD-11.** Con B16 en verde, en el 11b, el segundo PR del paso 11 (17-v), se deja de escribir `stage_snapshots.radio` (el valor por defecto de DD-11); la columna se queda para las etapas viejas, que la pestaña sigue leyendo con `buildRaceRadio`, y `stageRun.test.ts` l. 322-339, que exige radio guardada con más de 10 km, grupos no vacíos y primer hueco 0, se re-sella para exigir lo mismo de `radioFromTimeline` sobre la fila de `stage_timelines`. `scripts/race-radio.mjs --db` no cambia de fuente mientras pueda ser fiel (decisión 12-p): si `stage_snapshots.engine_version` es la de hoy, re-simula como hasta ahora, con lo que la radio guardada nunca tuvo y el dueño usa para cazar defectos: el depósito medio de cada grupo (su leyenda, «[n] grupo · tamaño · depósito medio», l. 347, y `g.energyPct`, l. 368), una foto cada `--every` km aunque sea menos de uno (l. 45 y 92) y todos los relevistas, no los doce de `STORED_PULLERS_MAX` (`raceRadio.ts` l. 591). `radioFromTimeline` devuelve el contrato `raceRadioSchema`, que no tiene `energyPct`, con una foto por km, así que cambiarle la fuente en las etapas de la versión de hoy, que es cuando la re-simulación es fiel, le quitaría el instrumento: es el microscopio del dueño en producción (D-09; [DUEÑO 10], mapa 05 §5.1: «Rehacerla para el espectador sin conservar ese detalle deja al dueño sin su instrumento»; «si lo que hace el motor está bien ahí, no cambies el motor, cambia el race radio», `docs/balance.md` l. 16557-16558). Lo que el 11a le añade es una salida para cuando hoy se niega (su cabecera, l. 19-28): si la versión no coincide y la etapa tiene fila en `stage_timelines`, pinta `radioFromTimeline` y lo dice en su cabecera (`fuente: línea grabada · sin depósitos · una foto por km`); sin fila, se sigue negando.

### 12.11 Lo que E10 recibe

D-62, en la parte de E10 (`docs/encargos.md` l. 528-549: plantillas por idioma sobre sucesos estructurados y «nunca una tabla de cadenas traducidas»). Lo que el mapa 07 §3 pedía para E10, y dónde queda:

| Lo que E10 necesita | Dónde queda en E2 |
| --- | --- |
| todo lo que E2 escribe, como plantilla, datos con códigos, números e ids, y semilla, nunca como texto; en el tick, cero texto | la voz y el acta, `ChronicleEntry` (12.2); las noticias, `NewsPayload` con `seed` (12.8); los rótulos, `Cue` (§6.5); el título y el aviso, `pageTitle` y `stageReadyNotice` (§11.8, §11.9) |
| una semilla de variante neutra de idioma | `variantSeed` (12.7) y la semilla de la noticia, que ya era neutra (`win:${seedBase}`); `pickVariant` con `since` por idioma |
| `locale` en cada punto de render | desde que nace, cada render recibe `locale` como primer parámetro, con el tipo literal `'en'` y el nombre `_locale` mientras no lo lea (`noUnusedParameters`, `tsconfig.base.json`; decisión 12-q): `renderNews` y `gapTrendLine` (12.5, 12.8); `breakHeadline`, `groupLabelText` y `championTitleText` (§6.3, §7.4, §7.6); `pageTitle`, `stageReadyNotice` y `stageReadyEmail` (§11.8, §11.9); y `chronicleParts` y `chronicleLine`, que lo ganan en el paso 12 junto con `rev` (12.7). E10 solo ensancha el tipo y renombra el parámetro: añadirlo después cambiaría la firma de cada render y todas sus llamadas en la web, la API y `shared`, que es el trabajo que D-62 quería ahorrarle |
| los datos que la concordancia exige | el género en el rótulo servido (`RiderCard.gender`, §4.8), que es lo que recibe la web, copiado del reparto (`CastRider.gender`, §4.2) por `serveCast` (§7.8); las cuentas como números (`count`, `others`, `days`, `age`); `ChronicleRider` no lleva género y E10 lo añade desde el reparto |
| el vocabulario de grupos como código | `GroupRole`, `JerseyKind` y `GROUP_WORDS` (§6.3), con `mainRole` y `groupRole`, y `mainJersey` y `groupJersey` para el grupo del maillot, en los datos de la línea (12.6); `GROUP_NOUNS` sigue en el motor como vigilancia del inglés |
| la noticia con carrera y etapa en los datos | `raceId`, `season` y `stageDay` en `NewsPayload`; `raceOfHeadline` muere (12.8) |

**Lo que sigue en inglés, y por qué.** Nada de esto es de E2 ni lo cuenta la retransmisión; se deja escrito para que E10 lo encuentre:

- `palmares.detail` (`Stage ${spec.stageDay}`, `stageRun.ts` l. 1287): la fila del palmarés guarda texto; la `0046` le da `stage_day` (§13.5) y con eso E10 puede redactarlo al leer.
- Las notas del libro de cuentas (`${raceName} · stage win` y `${raceName} · GC #${i + 1}`, `packages/db/src/economy.ts` l. 171 y 181): `transactions` gana `race_key` y `stage_day` en la `0046`, que es lo que E10 necesita para redactarlas.
- La `story` de `raceReport.ts` (l. 157-170), que es del paso 17d de la táctica (12.9).
- Los tres correos de cuenta (`apps/api/src/emails.ts` l. 64-135), que no son de carrera.
- Las 272 redacciones del journal y las frases nuevas de 12.5, que son el golden del inglés: se traducen como un fichero de plantillas por idioma, no como tabla de cadenas, que es lo que el encargo de E10 pide.

---

**Injertos aplicados.** I-05 (§12.10: la foto frente al instante, escrito; la radio desde la línea con el contrato `RaceRadio` de hoy y sin lista de seguimiento guardada, tras B16; a quién nombra, con `own` y `nameableAt`, 12-o), I-07 (§12.6: la voz lee `GroupRole` con `mainRole` y `groupRole` sobre el instante, y la etiqueta del grupo del maillot con `mainJersey` y `groupJersey`; `GROUP_NOUNS` y `WATCHED_GROUP_NOUNS` con `the gruppetto` y los tres nombres del grupo del maillot en el PR 4a), I-13 (§12.8: `NewsPayload` con el equipo del día, `breakaway_win` comprobado y medido, `text` de compatibilidad hasta DD-19 y la `0043` como primera migración), I-14 (§12.7: `pickVariant` con `since` y `TEMPLATE_REV`, `variantSeed` neutra, la revisión de cada etapa), I-25 (§12.8: `gc_lead_taken` y `jersey_taken`, con carrera y etapa y bajo el velo por `race_key` y `stage_day`), I-41 (§12.9: `narrate()` se borra; `moments` y `raceVerdict` sobre la última etapa conocida), I-43 (§12.2: truncado por `revealS`, orden por revealado, longitud como dato y las cinco pasadas apagadas, medido en 18 corridas), I-44 (§12.3: la regla de publicación al cerrar la ventana, medida, detrás de `liveClusters`).

**Objeciones resueltas.** O-02 (§12.2: la lista de cinco pasadas, escrita con las veintiuna, y la longitud como dato; `respecto`, `juntos` y `desenlace` siguen en la voz), O-06 (§12.8, con §13.2: la migración de noticias es la primera y va antes del reinicio), O-07 (§12.7 y §12.8: el equipo del día en la crónica y en el titular), O-10 (§12.6: una palabra por papel en barra, radio, voz y acta, con el conflicto de «the bunch» medido y resuelto, y el grupo del maillot con el mismo nombre en la barra y en la voz), O-24 (§12.5: los cuatro `case` que faltaban, las cuatro frases nuevas y el `default` que no imprime la clave).

**Huecos rellenados.** Ninguno asignado. Contradicciones de hecho que quedan resueltas: X-14 (§12.2: las cinco pasadas que miran el futuro, con la tabla de las veintiuna), X-20 (§12.8: `/api/news` sigue mandando `text` hasta DD-19) y X-21 (§12.5: las cuatro plantillas que caían al `default`; §12.9: `narrate()` sin llamadas). Contradicciones 6 (§12.8), 8 (§12.1) y 9 (§12.9) del mapa 05.

**Decisión tomada aquí.**
- 12-a. El reloj que ordena la voz es el de revelado: `revealS`, y a igualdad `tS`, `EVENT_ORDER` y km. Con `live`, `byClock` no ordena. D-43 decía «orden por reloj» con la rama `byClock` porque `ingeniero` revelaba cada suceso en su `tS` y los dos relojes coincidían; con el `revealS` real, ordenar por `tS` rompe el prefijo 44 veces en 18 corridas y por `revealS`, ninguna (`l8/voz.mjs`). Descartado: el orden por `tS`.
- 12-b. La voz dice la palabra que la barra enseña en la hora de la línea: la API anota `datos.mainRole` (el papel del grupo del título) en las diez plantillas de `MAIN_GROUP_TEMPLATES` y `datos.groupRole` (el del grupo del caído) en `crash`, y, si ese grupo lleva la etiqueta `jersey_group`, su maillot en `datos.mainJersey` o `datos.groupJersey`, con `instantAt` en el `revealS` de la línea; la web elige la palabra en `GROUP_WORDS`, la del grupo del maillot antes que la del papel (6-b; cruzada de L4, Rdueno-017); `bunch_sprint` y `stage_win` siguen diciendo `the bunch`. Medido: 40 de 210 líneas pasan a `the chase group` y ninguna a `the lead group`. Descartado: calcular el papel en la web al pintar, porque el acta no tiene instante, y aceptar por escrito la contradicción con la barra, que C7 prohíbe.
- 12-c. La revisión de plantillas de cada etapa se guarda en `stage_timelines.tpl_rev`, `smallint not null` sin defecto, en la `0044` (§13.3, 13-j, 17-a): la fila lleva el `TEMPLATE_REV` del tick que toma `recordStageTimeline` y la lápida, 0; la lee `readStageTemplateRev` (§5.6) y viaja como `tplRev` en `BroadcastHead` (§4.11) y, opcional, en `stageReplaySchema` (§14.2), que es el `StageReport`; una etapa sin línea usa la revisión 0. Descartado: deducirla del día de juego, que el reinicio vuelve a empezar; y `default 0`, con el que un escritor que la olvidara dejaría todas las etapas en la revisión 0 sin que nada fallara (13-j; cruzada de L3, Rcobertura-044).
- 12-d. Los racimos en vivo siguen la regla de D-43 (la hora en que el grupo del ÚLTIMO miembro cruza el final de la ventana) con una guarda: nunca antes del revelado de ninguno de sus miembros. Medido sin rótulos: 0 violaciones y una espera de 1.493 s de carrera de mediana. `liveClusters` sigue apagada hasta B19 con la política de nombres real y la prueba de lectura. Descartado: esperar al grupo más lento de todos los miembros (mediana de 1.955 s).
- 12-e. En `Watch`, la línea de `breakaway_formed` es la frase de `breakHeadline`; el acta conserva la suya, con la lista entera. Descartado: decir las dos, que es la misma noticia dos veces.
- 12-f. `crash` y `crash_names` son dos `case` sobre la misma línea (`linesOf`): la voz dice la segunda `crashNamesDelayS` después, con el rótulo de nombres; el acta las escribe seguidas. `gap_trend` sale solo cuando la flecha cambia a subir o bajar, como mucho una vez por `trendWindowKm` de la cabeza.
- 12-g. `breakaway_win` AÑADE la comprobación del grupo `fuga` en la última foto a la regla de hoy. Medido en 44 etapas: la regla de hoy acierta en sus 16 y la foto sola añadiría 10 ataques del final. Descartado: la foto como única regla.
- 12-h. `gc_lead_taken` y `jersey_taken` comparan el PRIMERO de cada clasificación tras la etapa con el de tras la anterior, de la etapa 2 a la penúltima de una vuelta; frases `takes the overall lead`, `takes the points lead` y `takes the mountains lead` (pantalla). Descartado: comparar portadores de maillot, que la delegación cambia sin que cambie el líder.
- 12-i. El orden de los `kind` dentro de un día y una etapa es el de la tabla de 12.8, con los dos titulares de líder juntos en el segundo puesto.
- 12-j. `contract` guarda `housingCovered`: hoy el titular dice ` with housing covered` (`contracts.ts` l. 328) y el `NewsPayload` de §4.12 no tiene dónde guardarlo.
- 12-k. `personalNarration` se sustituye por `moments`, las líneas del acta de la última etapa conocida en las que el corredor es protagonista, redactadas con `chronicleLine`.
- 12-l. La voz de la meta son las líneas con regla `finish` de `BroadcastFinish.report`, en el orden del acta y con `revealS` igual a `finishS`.
- 12-m. El descuelgue suelto se calla si su corredor no estaba nombrado en su grupo con los sucesos revelados ANTES de la línea: contando el propio descuelgue, todos estarían nombrados.
- 12-n. La ruta anota los papeles ANTES de atar las horas: `withGroupRoles` recibe los sucesos con su `revealS` y la ruta construye su mapa de horas sobre lo que devuelve, posición a posición, porque una copia anotada es otro objeto (12.6, §14.3). Descartado: anotar dentro de `buildChronicle`, que no conoce la línea ni el instante.
- 12-o. (Corrección L8; Rcobertura-042 y Rdueno-008.) `radioFromTimeline` recibe en `RadioNames` (§4.13), además de `riderOf`, los corredores del espectador (`own`, nombrados siempre: R23.7) y `nameableAt(km)`, que construye quien llama: la política de §7.7 en una etapa no conocida y, en una conocida y en `?diag=1`, esa política más los diez primeros de la etapa, la lista de seguimiento de hoy aplicada al leer. En una crono devuelve la radio vacía, como la guardada. Descartado: una firma con solo `riderOf`, que no puede aplicar la política que dice aplicar, y nombrar en la etapa conocida solo por §7.7, que dejaría al microscopio sin el ganador escondido en el pelotón.
- 12-p. (Corrección L8; Rdueno-001.) `scripts/race-radio.mjs --db` sigue re-simulando las etapas corridas con la versión de hoy, con el depósito por grupo, `--every` y todos los relevistas, y solo con otra versión pinta `radioFromTimeline` sobre la fila de `stage_timelines`, diciéndolo en su cabecera. Es lo que ya decían D-09 y la síntesis de DD-11 («no se entera (re-simula)»), que esta sección había cambiado sin evidencia nueva. Descartado: leer siempre la línea, que le quita al dueño lo que la radio guardada nunca tuvo.
- 12-q. (Corrección L8; Rcobertura-043 y Rcodigo-006.) Todo render recibe `locale` como primer parámetro desde que nace, `_locale: 'en'` mientras no lo lea; `chronicleParts` y `chronicleLine` lo ganan en el paso 12 con `rev`. Es D-62 al pie de la letra. Descartado: añadirlo cuando E10 traiga la segunda lengua, que cambia entonces la firma de cada render y todas sus llamadas.
- 12-r. (Corrección L8; Rdueno-019; en el cierre, con Rdueno-017.) El cuarto nombre de grupo, los tres del grupo del maillot en la voz y el corte de dos tercios de §6.3 cambian SPEC §6.15: van al dueño con DD-04 y el paso 12 reescribe SPEC con lo que conteste. La vigilancia de lo que dice la voz servida es `stageJournal.test.ts` con los cuatro papeles y los tres maillots, no `coherence.test.ts`, que solo mira el motor y se re-sella en el 4a con el tope de seis.

**Propuesto para el glosario.**
- `LiveChronicle` (`untilS`, `stageKm`, `revealS`), las dos firmas de `buildChronicle` y la de su implementación, que devuelve `ChronicleEntry[] | LiveLine[]`, en `apps/api/src/chronicle.ts`; `liveClusters(events, tl, revealS): readonly LiveCluster[]` y `LiveCluster` (`event`, `revealS`, `members`) en `apps/api/src/liveClusters.ts`.
- `withGroupRoles(events, tl, revealS, ctx)` y `MAIN_GROUP_TEMPLATES` en `apps/api/src/voiceRoles.ts`; las claves de datos `mainRole`, `groupRole`, `mainJersey` y `groupJersey`, que se anotan al leer y nunca se guardan.
- `inVoice(line, unnamed)` en `apps/web/src/domain/voice.ts`; `groupNounOf(role, jersey)`, `linesOf(e)`, `variantSeed(e)` y el tipo `Phrasing` en `apps/web/src/domain/stageJournal.ts`; `GROUP_ROLES` e `isGroupRole(x): x is GroupRole` (guarda de tipo) en `packages/shared/src/broadcast/instant.ts`, e `isJerseyKind(x): x is JerseyKind` en `packages/shared/src/jerseys.ts`; `gapTrendLine(_locale, trend)` en `packages/shared/src/broadcast/names.ts`; `chronicleParts(_locale, e, rev)` y `chronicleLine(_locale, e, rev)` desde el paso 12; `fnv1a` en `packages/shared/src/render/variants.ts`.
- `abandonReasonSchema`, `ABANDON_WORDS` y `outFor` en `packages/shared/src/news.ts`; `newsNames(db, payloads): Promise<NameResolver>` en `packages/db/src/news.ts`.
- `NewsPayload` de `contract` gana `housingCovered: boolean`; `stage_timelines.tpl_rev` (`smallint not null`, sin defecto, 13-j); `BroadcastHead.tplRev` y `StageReport.tplRev`; `riderRaceReportSchema.moments` (`ChronicleEntry[]`, opcional).
- Textos de pantalla: las frases de 12.5 (`Puncture for …`, `Mechanical trouble for …`, `A truce for …`, `No truce for …` con sus seis motivos, `Crash in the gruppetto!`, `… are on the ground.`, `The gap has fallen by 40 seconds in five kilometres.`); los titulares `takes the overall lead`, `takes the points lead` y `takes the mountains lead`; las etiquetas del feed `Leader`, `Jersey` y `Watch`.
- La firma nueva de `emitNews` (`opts.seed`, `opts.payload: NewsPayload`, `opts.raceKey`), en `packages/db/src/news.ts` (12.8).
- (Corrección L8.) `RadioNames` gana `own: ReadonlySet<RiderIx>` y `nameableAt: (km: number) => ReadonlySet<RiderIx>` (12-o, §4.13); `getGcThroughStage`, `getPointsClassification` y `getKomClassification` reciben `q: Queryable` desde el 1a (12.8); el test `apps/api/src/routes/lastRace.test.ts` (PR 12, 12.9); la cabecera `fuente: línea grabada · sin depósitos · una foto por km` de `scripts/race-radio.mjs` (12-p).

**Dudas para el ensamblador.**
- D-43, punto 2, dice «orden por reloj: la rama `byClock`». Medido, la voz tiene que ordenarse por `revealS` (12-a); no reabre la decisión, la precisa. §14.3 pasa `byClock: tl.timeTrial` junto a `live`: con 12-a es inocuo, pero conviene decirlo allí, y su cifra de B19 («0 violaciones en 15 corridas revelando por reloj») debería citar además las 18 corridas con el `revealS` real de 12.2.
- D-43 habla de «veinte pasadas»: son veinte llamadas en l. 353-375 más `markConcession` dentro del `map` (l. 319), veintiuna funciones. La tabla de 12.2 las lista todas; el esqueleto y D-43 dicen veinte. (Cerrada: D-43 dice veintiuna desde el ensamblado, y 12.2 también desde la corrección L8.)
- §4.11 no tiene `BroadcastHead.tplRev` ni `StageReport.tplRev`, y §4.12 y §G.3.7 no tienen `housingCovered` en `contract` (12-j). §14.2 no tiene `moments` en `riderRaceReportSchema` (12-k). (En la corrección L8: §4.11 y §4.12 ya los llevan, 4-u, y §14.2 lleva `moments`. En el cierre: §13.3 ya tiene `tpl_rev` en la `0044`, 13-j; falta `tplRev` en `stageReplaySchema` de §14.2, que va por cruzada.)
- §6.3 dejaba para aquí cómo lee la voz el papel: 12-b lo cierra. §6.6 no tiene fila para `crash_names`, y no le hace falta: es el segundo tiempo de `crash`.
- §G.9 dice que B19 midió «0 en 15 corridas»; ahora hay además 0 en 18 con el `revealS` real y 0 con racimos sin rótulos (12.2, 12.3). (Cerrada: §G.9 ya dice las 18.)
- §17 (paso 4a) tiene que llevar, además de `the gruppetto`, las filas de 12.6 y la remedición de `storyMetrics` sobre las 60 etapas de `coherence.test.ts`. (Cerrada: §17.7 ya las lleva; que el re-sello de `coherence.test.ts` con el tope de seis deje de ser condicional va por cruzada.)

**Dudas del cierre (lote L8).** Lo que el cierre no puede arreglar desde esta sección:
- §14.3 no llama a `withGroupRoles` ni a `liveClusters`: su código tiene que anotar los papeles antes de construir `revealOf` (12-n), porque ata cada suceso a su hora por la identidad del objeto, y, con `BROADCAST.liveClusters` encendida, meter los racimos antes de `buildChronicle` (12.3). (Cerrada en el cierre de L8: §14.3 ya los llama en ese orden, corrección L6. Queda que su `rolesCtx` lleve los maillots de salida y no todo `null`, o `mainJersey` y `groupJersey` no saldrían nunca: va por cruzada.)
- §13.2 llama `p` al payload de `emitNews` y remite su firma a §12.7 y §12.8; la que vale es la de 12.8 (`opts.seed`, `opts.payload`, `opts.raceKey`), que §G.2 y §G.4 no recogen. (Cerrada: §13.2 usa la de 12.8, corrección L3, y §G.2 y §G.4 la llevan.)
- 12.8 da dos fuentes para el equipo del día: `riders.team_id` al escribir (en «Lo que se guarda») e `input.riders[].teamId` en `teamOfDay`. Dentro del tick valen lo mismo, pero `awardOutcome` (`packages/db/src/stageRun.ts` l. 1143-1149) no recibe hoy la entrada de la etapa: el PR 1a tiene que elegir una y pasársela. (Cerrada: 17-r elige `input.riders[].teamId` y se la pasa en el 1a, y «Lo que se guarda» ya lo dice.)
- [DUEÑO 4], [DUEÑO 6], [DUEÑO 10] y [DOC 3], que el esqueleto asigna a §12, no estaban nombrados en el borrador: ahora van en 12.2, 12.7, 12.10 y 12.5, y el apéndice de cobertura (§21.3) tiene que apuntar ahí. (Cerrada: la tabla de cobertura de §21 ya apunta a §12.2, §12.7, §12.10 y §12.5.)
