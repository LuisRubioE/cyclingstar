# Propuesta E2 · lente del ingeniero incremental: la radio que ya existe, reproducida por el reloj, y un solo punto donde se corta el destripe

Árbol a 2026-09-27 (HEAD `151f0e7`, `ENGINE_VERSION` 89, `constants.ts` l. 838). La base de hechos son los siete mapas de `mapas/`; donde cito una línea la he leído. Código leído para esta lente: `packages/engine/src/sim/raceRadio.ts` entero; `stage/types.ts` l. 330-366 y 486-504; `stage/simulate.ts` l. 1255-1265, 4808-4822, 8720-8740, 9215-9225 y 9300-9316; `stage/timetrial.ts` l. 60-80, 219-348 y 492-614; `packages/db/src/stageRun.ts` l. 505-600 y 1060-1310, `news.ts`, `economy.ts` l. 128-190, `ranking.ts` l. 170-250 y 555-605; `apps/api/src/chronicle.ts` l. 250-1250, `routes/races.ts` l. 380-545, `app.ts`, `env.ts`; `packages/shared/src/contracts.ts` l. 1228-1533 y `jerseys.ts`; `apps/web/src/pages/StageReplay.tsx` l. 320-372, `components/RaceRadioPanel.tsx` l. 355-428, `domain/stageJournal.ts` l. 105-118, 300-330, 1080-1125 y 1595-1610, `queryClient.ts`; `railway.json`, `Claude.md`; `docs/tactica.md` l. 244-249, 312-324, 7595-7612 y 8636-8648; `docs/balance.md` l. 6492-6500, 14030-14040, 16316-16325, 16600-16608 y 16700-16712. **Medidas propias** en `scratchpad/e2ing/`, sin tocar el repositorio: `medir.mjs` (lo que propongo guardar, sobre el `dist` del motor, campo de 22 × 8 del banco de `scripts/race-radio.mjs`) y `prefijo.mjs` (la crónica en vivo, sobre una copia de `apps/api/dist/chronicle.js` con interruptores).

---

## 0. Resumen

Lo obvio para E2 sería escribir un modelo de estado nuevo que se reconstruye reduciendo sucesos, esconder en la web lo que no toca y parchear pantalla a pantalla. Esta propuesta hace lo contrario en las tres cosas.

1. **El estado de televisión ya existe: es la radio del motor.** `RadioGroup` lleva en memoria el `id` del grupo y su reloj `tS` (`sim/raceRadio.ts` l. 122 y 136) y `radioForStorage` los tira (l. 776-963); el colector sabe además en qué grupo va cada corredor en cada km y recibe la lista de percances. Guardar esas cuatro cosas como campos OPCIONALES de `StoredRaceRadio` resuelve el reloj y la identidad de los grupos (mapa 01 §2.4, puntos 1 a 3), no sube `ENGINE_VERSION` (doctrina de la v85: «no altera un segundo de ninguna carrera», `docs/balance.md` l. 16319-16323), no toca `StageOutput` (Frontera 3) y deja intactas la foto por km, `pullFor` y `scripts/race-radio.mjs`. **Medido**: +52 KB de JSON por llana y +64-74 KB por reina, sobre 148-310 KB de hoy.
2. **La crónica que ve el futuro se corrige truncando su ENTRADA, no reescribiéndola.** En modo vivo `buildChronicle` recibe solo los sucesos cuyo reloj ya pasó, la longitud de la etapa (tres pasadas la deducen hoy del último suceso) y apaga cinco pasadas retroactivas. **Medido** sobre 5 etapas × 3 semillas: la crónica en el instante T es prefijo exacto de la del instante T + 30 s en las 15 corridas; truncar sin más da 94 violaciones en otras 15. Las 55 plantillas y 272 redacciones de `stageJournal.ts` (mapa 03 §2.3) se reutilizan sin cambiar una frase, y el acta de siempre sigue siendo el acta.
3. **El destripe se corta en el servidor, en un punto.** Un tipo `Horizon` («visto hasta la etapa k» por carrera seguida), un único predicado SQL, un parámetro OBLIGATORIO en las funciones de `packages/db` que devuelven algo nacido de una etapa, una política por ruta que Fastify exige al arrancar y un test canario que recorre todas las rutas. Las 48 superficies del mapa 03 §4 caen en siete mecanismos (§7.3). La web no esconde nada: pinta lo que le llega.

La pantalla: al entrar en una etapa no vista se abre **Watch**, una retransmisión con capa fija (km a meta y diferencia principal con su tendencia), barra de grupos numerados con sus maillots, perfil con la posición de cada grupo y rótulos y sucesos encima, a un ritmo que depende SOLO del recorrido (así la duración no revela nada) y servida por tramos de 20 km que el servidor no adelanta más de uno. El acta de hoy (`Story`) pasa a llamarse **Report** y se abre tras la meta o con un «revelar» explícito.

El camino son 13 pasos y unos 16 PR. El **paso 3**, justo después de dos PR pequeños de API y sin tocar el motor ni la base, ya deja al dueño sentarse a ver una etapa con los datos que hay hoy y reloj estimado. El **paso 8**, tras las migraciones `0043` (noticias) y `0044` (visto), es el primero que cierra el destripe y lo demuestra con el canario. Solo dos PR tocan `packages/engine` y pagan los bancos del CI: el de almacenamiento (paso 4, sin subir versión) y uno opcional que sí la sube (paso 11). Todo lo demás llega a `main` detrás de dos interruptores (`BROADCAST_WATCH`, `SPOILER_MODE`) sin que el jugador note nada.

Lo que deja: el maillot de campeón sale como rótulo de texto provisional, derivado del palmarés, hasta que E3 y E12 lo creen; el presupuesto del equipo se enseña el de hoy (no hay libro de equipo al que restar premios); las cronos corridas antes del paso 4 no tienen parciales por corredor; el correo de aviso queda como plantilla neutra y probada, y lo envía E4.

---

## 1. Diagnóstico

### 1.1 Lo que falla

1. **Entrar es leer el acta.** La etapa abre en `Story` (mapa 03 §1.1, `StageReplay.tsx` l. 345-346) y, aunque la pantalla escondiera, el dato ya está en el navegador: una respuesta pública de 0,95-2,16 MB sin comprimir con resultado, general, crónica y radio (mapa 02 §4 y §7; `routes/races.ts` l. 519-537).
2. **La radio guardada no se puede reproducir a ritmo.** Pierde el reloj y la identidad de cada grupo (mapa 01 §2.3) y en una reina solo nombra al 47-64 % de quien va fuera del pelotón. Y destripa sola: la lista de seguimiento mete a los diez primeros DE LA ETAPA desde el km 0 (`stageRun.ts` l. 560-568; mapa 07 §5.2.1).
3. **La crónica ve el futuro** (mapa 07 §5.2.2): `caughtLaterKm` (`chronicle.ts` l. 297), la criba que se borra, la racha que se resume, el racimo que absorbe a los sueltos ya contados.
4. **Nadie sabe qué ha visto nadie** (mapa 04 §3) y el resultado sale por 48 superficies (mapa 03 §4), casi todas públicas.
5. **Las noticias se guardan redactadas y sin carrera** (mapa 02 §3, mapa 04 §1.2): no se pueden callar por etapa, ni traducir, ni enlazar sin adivinar (`newsFeed.ts` l. 17-24).
6. **El rótulo tiene tres de las cinco categorías** (mapa 03 §6) y el equipo viaja como nombre (`contracts.ts` l. 1247-1248), sin `teamId` ni `jerseySeed`.
7. **La crono no tiene estado**: ni radio ni fotos, y los parciales de cada corredor mueren dentro del motor (mapa 01 §4).

### 1.2 Lo que no falla, y por eso se conserva tal cual

- **La foto por km** y su semántica («la foto de la radio no es un instante, es 1 km entero», mapa 05 D2), con relevistas, motivo, destinatario, velocidad y percance. Es el microscopio del dueño (catorce tandas de defectos cazados, mapa 05 §2.8) y la lee `raceLearning` (`entrenamiento.md` l. 868-883).
- **`buildChronicle` con sus veinte pasadas**, para el acta; **`stageJournal.ts`** con sus 140 tests.
- **Las clasificaciones ya se cortan por etapa**: `getGcThroughStage`, `getPointsClassification`, `getKomClassification`, `getTeamClassifications` y `leadersThroughStage` reciben el día (mapa 03 §4.1).
- **Lo agregado ya lleva fecha**: `rider_points`, `palmares`, `transactions`, `rider_daily_log` tienen `game_day` (mapa 04 §1.3).
- **La tolerancia del contrato**: todos los campos pesados de `stageReplaySchema` son `.optional()` (`contracts.ts` l. 1499-1531). La API puede callarlos sin romper una pestaña que siga abierta con la web de ayer.
- **`assignLeaderJerseys`** y su «pasa al siguiente» (`jerseys.ts`).

### 1.3 Un matiz que abarata el reloj

El mapa 01 §0 dice que «no hay reloj absoluto». Es verdad que no hay instante, pero **todos los `tS` están en el mismo eje**: segundos desde la salida común, y el `tS` de un grupo en el km k es la hora de carrera a la que ese grupo pasa por k. Revelar un suceso por su `tS` es revelarlo a su hora. De las siete fechas trucadas del mapa 01 §1.2, cinco quedan bien solas si se revela por reloj: (b) `rider_defies_team` lleva el reloj de su primera aparición; (c) `bunch_sprint` y `final_km` llevan el de llegada; (d) `time_cut`, el del primer eliminado en meta; (f) `climb_kom`, el del primer grupo que corona, que es cuando la tele da la cima; (g) `peloton_concedes` lleva `peloton.tS` del momento de emitirse (`simulate.ts` l. 4814-4820). Quedan dos: (a) `breakaway_formed` y `break_cooperation`, fechados en `bornTs` (l. 8727-8733), y (e) los pinchazos de crono con el reloj propio (`timetrial.ts` l. 321-329). Las dos se arreglan en §3.6.

---

## 2. Principios

1. **El estado de televisión es la radio del motor, no un segundo modelo.** Consecuencia: no hay reductor de sucesos; el banco B2 compara estado y sucesos, no reconstruye uno con el otro.
2. **Al correr se guarda solo lo que el motor ya tiene en memoria y tira.** Consecuencia: el paso 4 son cuatro campos opcionales en `radioForStorage` y un gancho de observación en la crono, sin versión. Lo que exige cambiar el CONTENIDO de un suceso va aparte (paso 11), es opcional y sube versión (precedente v73, `balance.md` l. 14036-14038).
3. **Se revela por el reloj de carrera.** Consecuencia: un suceso aparece cuando el reloj de la reproducción alcanza su `tS` corregido (§3.6), no cuando la cabeza pasa por su km.
4. **La crónica en vivo es la crónica de siempre con la entrada truncada.** Consecuencia: una sola función, un flag, las mismas plantillas; la propiedad de prefijo es su test.
5. **El servidor decide lo que se ve; la web pinta.** Consecuencia: la web no lleva lógica de ocultación (salvo el título de la pestaña, §7.5) y el horizonte se aplica antes de serializar.
6. **Un punto de aplicación, obligado por el compilador y por el arranque.** Consecuencia: `Horizon` es un parámetro sin valor por defecto; una ruta GET sin política no arranca; el canario B1 recorre las rutas que Fastify registra, no una lista a mano.
7. **Añadir, no ensanchar.** Consecuencia: `JerseyKind` sigue con tres valores (lo sellan `leaderJerseys.test.tsx` y todo `Record<JerseyKind, …>`, mapa 07 §1.3); el maillot llevado es un tipo nuevo; `StoredRaceRadio` gana opcionales; `stageReplaySchema` no cambia de forma.
8. **Todo PR se fusiona a `main` sin que el jugador lo note.** Consecuencia: rutas nuevas, columnas `nullable`, `.nullish()` y dos interruptores de entorno; el primer comportamiento visible se enciende a mano.
9. **Revelar es un acto explícito, registrado y en orden.** Consecuencia: el visto por carrera es un prefijo contiguo (`seenThrough`); abrir la etapa 5 sin haber visto la 4 pide antes resolver la 4.
10. **El microscopio del dueño no pierde nada.** Consecuencia: `RaceRadioPanel` sigue, con tope en el punto visto hasta revelar; `race-radio.mjs` no se toca.

---

## 3. El estado de la retransmisión

### 3.1 El reloj y el instante

Tres relojes, todos en segundos desde la salida: el del suceso (`RaceEvent.tS`), el de cada grupo en cada punto guardado (`RadioGroup.tS`, hoy tirado) y el de la reproducción, `t`. El instante que enseña la tele se obtiene invirtiendo la serie de cada grupo: en la hora `t`, el grupo G está en el km `k + (t − tS_G(k)) / (tS_G(k+1) − tS_G(k))`, con k el último punto que G ha pasado. La cabeza de carrera es el grupo de posición 1 en cada punto; `headS(k)` es su reloj y la capa fija dice `totalKm − headKm(t)`.

- **Con el paso 4** (reloj guardado, 0,1 s): exacto a la resolución de la foto (1 km, 80-180 s de carrera).
- **Antes del paso 4** (etapas ya corridas, o las del mundo de pruebas hasta el reinicio): `headS(k)` se estima integrando `speedKmh` del grupo de cabeza y reescalando para que la meta caiga en el `tiempoS` del ganador; cada grupo va en `headS(k) + gapS`, que es exacto en el punto. La posición de un grupo en un instante es entonces aproximada; la respuesta lo dice (`clock: 'estimated'`). El error no lo he medido.

### 3.2 La identidad de los grupos

La identidad es el `id` del motor (`peloton`, `mov-3`, `shed-7`): es el objeto grupo que avanza bloque a bloque, desaparece cuando lo absorben y nace con otro nombre cuando se parte. El nombre de pantalla NO es la identidad: `FRONT OF THE RACE`, `CHASERS`, `PELOTON`, `YELLOW JERSEY GROUP`, `GRUPPETTO` se deciden en cada punto por posición, `kind` (ya guardado, con la histéresis de `mainGroupId`) y ocupantes (§4.3). Con el `id` la web anima: una fila que se funde con la de delante, una que se parte. Sin él (antes del paso 4) cada punto es independiente (`gid = 'p' + posición`) y la barra cambia sin transición.

### 3.3 Los tipos

```ts
// packages/shared/src/broadcast.ts (nuevo). Contrato API-web: el fichero declara los esquemas Zod
// (objetos strip, opcionales con .nullish()) y exporta los tipos con z.infer; aquí van como interfaces.
import type { JerseyKind, RaceLeaders } from './jerseys.js'
import type { ChronicleEntry, PullMotive, RadioGroupKind, StageKind } from './contracts.js'

/** Segundos desde la salida (en crono, desde que sale el primero). */
export type RaceSeconds = number

/** Lo que no depende de la carrera: se puede enseñar antes de salir. Va solo en el primer tramo. */
export interface BroadcastStageHead {
  raceKey: string
  stageDay: number
  name: string
  km: number
  kind: StageKind
  timeTrial: boolean
  /** Altitud cada km (`altitudesDelPerfil`, citas.ts l. 256-264). Sin marcas de sucesos. */
  profile: readonly { km: number; altM: number }[]
  /** Puertos y sectores del recorrido (`tramosDelPerfil`, citas.ts l. 35-65). Recorrido, no sucesos. */
  climbs: readonly { footKm: number; topKm: number; cat: string; lenKm: number; avgPct: number }[]
  sprints: readonly { km: number }[]
  /** Maillots en la carretera: tras la N−1, o tras la última etapa vista si el jugador va detrás (§7.7). */
  leadersOnRoad: RaceLeaders
  clock: 'exact' | 'estimated'
  /** Duración de la reproducción a velocidad 1, en segundos de pared. Solo depende del recorrido (§5). */
  playbackS: number
}

/** EL RÓTULO: con qué presenta la tele a un corredor (§6). Catálogo de la etapa, uno por salida. */
export interface RiderCard {
  i: number // índice en el catálogo: lo usan `g`, `pulling`, `named`, `riders`
  id: string
  name: string
  bib: number | null
  country: string | null // ISO-2
  /** El equipo CON EL QUE CORRIÓ (`input.riders[].teamId`), no el de hoy. */
  team: { id: string; name: string; jerseySeed: string } | null
  worn: WornKit // lo que lleva puesto: uno
  lines: readonly RiderLine[] // lo que dice el rótulo: de 0 a 3 líneas
  gcAtStart: { rank: number; deficitS: number } | null
  mine: boolean // del jugador o de su equipo (R23.7)
}

export type WornKit =
  | { kind: 'leader'; jersey: JerseyKind }
  | { kind: 'champion'; title: ChampionTitle }
  | { kind: 'team' } // la equipación de `team`

/** Interfaz que E2 pide a E3 y E12 (§6.3). */
export interface ChampionTitle {
  scope: 'world' | 'continental' | 'national'
  country: string | null
  discipline: 'road' | 'itt'
  category: 'elite' | 'u23'
  season: number
  /** true mientras lo derive E2 del palmarés, sin la tabla de títulos de E3 y E12. */
  provisional: boolean
}

export type RiderLine =
  | { kind: 'leads'; jersey: JerseyKind; wearsIt: boolean } // «Also leads mountains»
  | { kind: 'wearsFor'; jersey: JerseyKind; rank: number } // lleva el delegado: «2nd in points»
  | { kind: 'champion'; title: ChampionTitle }
  | { kind: 'gc'; rank: number; deficitS: number }

/** Un punto de la carretera: lo que pasó por el km `km`, grupo a grupo. */
export interface BroadcastFrame {
  km: number
  headS: RaceSeconds // reloj de la cabeza en `km`
  racing: number
  gone: number
  groups: readonly GroupFrame[] // de cabeza a cola
  g: string | null // grupo de cada corredor del catálogo (§3.5); null antes del paso 4
}

export interface GroupFrame {
  gid: string // identidad (§3.2)
  pos: number // 1 = cabeza de carrera
  kind: RadioGroupKind
  size: number
  gapS: number // al primero, en el MISMO punto: resta exacta
  tS: RaceSeconds // = headS + gapS
  speedKmh: number | null
  mishap: { tipo: 'caida' | 'pinchazo' | 'averia'; lostS: number } | null
  pulling: readonly number[] // tope 12, como hoy
  pullingTotal: number
  motivos: readonly (PullMotive | null)[]
  paraQuien: readonly (number | null)[]
  named: readonly number[] // quién se nombra sin tirar, con lo sabido a esa hora (§6.4)
  jerseys: readonly JerseyKind[] // maillots de líder que van dentro
}

export type OverlayKind =
  | 'attack'
  | 'break_formed'
  | 'bridge'
  | 'caught'
  | 'regroup'
  | 'split'
  | 'echelon'
  | 'crash'
  | 'puncture'
  | 'mechanical'
  | 'dropped'
  | 'leader_dropped'
  | 'abandon'
  | 'climb_top'
  | 'sprint'
  | 'flamme_rouge'
  | 'finish'
  | 'tt_split'
  | 'tt_hot_seat'
  | 'tt_catch'

/** Un suceso encima del estado, con la hora en que se enseña. */
export interface Overlay {
  revealS: RaceSeconds // §3.6
  km: number
  kind: OverlayKind
  riders: readonly number[] // nombrados, como mucho 3 (R23.4)
  more: number // «and two more»
  data: Readonly<Record<string, number | string>>
}

/** Lo que el servidor manda de una vez. */
export interface BroadcastChunk {
  head: BroadcastStageHead | null // solo en el primer tramo
  field: readonly RiderCard[] | null // solo en el primer tramo
  fromKm: number
  toKm: number
  frames: readonly BroadcastFrame[]
  overlays: readonly Overlay[]
  ticker: readonly (ChronicleEntry & { revealS: RaceSeconds })[] // crónica en vivo (§8.2)
  last: boolean // `toKm` es la meta
}
```

```ts
// apps/web/src/domain/broadcast.ts (nuevo, puro, sin React): el INSTANTE, que no guarda nadie.
export interface BroadcastInstant {
  t: RaceSeconds
  headKm: number
  kmToGo: number
  /** Cabeza contra el pelotón (o contra el segundo grupo si no hay pelotón); null si van juntos. */
  mainGap: { s: number; trend: -1 | 0 | 1 } | null
  /** Cada grupo en su km AHORA, con el último punto que ha pasado. Solo usa puntos con tS ≤ t. */
  groups: readonly { gid: string; km: number; last: GroupFrame }[]
  nextClimb: { topKm: number; cat: string; toTopKm: number; avgPct: number } | null
  cards: readonly Overlay[] // sucesos en pantalla ahora
}
export function stateAt(
  t: RaceSeconds,
  head: BroadcastStageHead,
  frames: readonly BroadcastFrame[],
  overlays: readonly Overlay[],
): BroadcastInstant
```

### 3.4 De dónde sale cada campo

| Campo                                                     | Existe hoy en el motor                                                                   | Se guarda al correr (paso)              | Se deriva al leer, en la API                                        | Se deriva en la web                                                                                                                                             |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frame.km`, `racing`, `gone`                              | sí, radio guardada                                                                       |                                         |                                                                     |                                                                                                                                                                 |
| `group.pos`, `kind`, `size`, `gapS`, `speedKmh`, `mishap` | sí                                                                                       |                                         |                                                                     |                                                                                                                                                                 |
| `pulling`, `pullingTotal`, `motivos`, `paraQuien`         | sí (índices sobre `riders`)                                                              |                                         | se reindexan al catálogo                                            |                                                                                                                                                                 |
| `group.gid`                                               | en memoria (`RadioGroup.id`, l. 122), se tira                                            | paso 4                                  | `'p' + pos` sin él                                                  |                                                                                                                                                                 |
| `group.tS`, `frame.headS`                                 | en memoria (l. 136), se tira                                                             | paso 4                                  | estimados sin él (§3.1)                                             |                                                                                                                                                                 |
| `frame.g`                                                 | en memoria (`riderIds` por grupo), se tira                                               | paso 4                                  |                                                                     |                                                                                                                                                                 |
| `group.named`                                             |                                                                                          |                                         | política §6.4 sobre `g`, o `watching` filtrado sin él               |                                                                                                                                                                 |
| `group.jerseys`                                           |                                                                                          |                                         | `leadersOnRoad` × composición                                       |                                                                                                                                                                 |
| `RiderCard`                                               | dorsal, `teamId`, `gcRank`, `gcDeficitSeconds` en `input.riders[]` (types.ts l. 189-215) |                                         | identidad, `teams.jersey_seed`, maillots tras N−1, títulos (§6.3)   |                                                                                                                                                                 |
| `mine`                                                    |                                                                                          |                                         | de la sesión (corredor y equipo del jugador)                        |                                                                                                                                                                 |
| `head.profile`, `climbs`, `sprints`                       | derivables del `input` guardado                                                          |                                         | `sampleProfile`, `altitudesDelPerfil`, `tramosDelPerfil`, pancartas |                                                                                                                                                                 |
| `Overlay`                                                 | los sucesos de `events`                                                                  | percances con corredor: paso 4          | de `events`, percances y recorrido                                  |                                                                                                                                                                 |
| `Overlay.revealS`                                         | `tS` del suceso                                                                          | `knownS` de la fuga: paso 11 (opcional) | excepciones de §3.6                                                 |                                                                                                                                                                 |
| `ticker`                                                  | los sucesos                                                                              |                                         | `buildChronicle` en vivo (§8.2)                                     | se redacta con `stageJournal.ts`                                                                                                                                |
| instante, `kmToGo`, posiciones                            |                                                                                          |                                         |                                                                     | `stateAt`                                                                                                                                                       |
| `mainGap.trend`                                           |                                                                                          |                                         |                                                                     | `gapS` del grupo que persigue en los últimos `BROADCAST.trendWindowKm`                                                                                          |
| general virtual                                           |                                                                                          |                                         |                                                                     | `gcAtStart.deficitS` + diferencia en carretera con el grupo del amarillo (en línea solo hay bonificación de meta, `timeBonuses` 10/6/4, `constants.ts` l. 6285) |

### 3.5 El grupo de cada corredor: una cadena por kilómetro

`StoredRaceRadio` gana `field: string[]` (todos los que tomaron la salida, en orden de dorsal) y cada `StoredRadioKm` gana `g: string`, donde el carácter j es la posición del grupo del corredor `field[j]` en ese punto, en el alfabeto `0-9a-zA-Z` (62 grupos), y `.` si ya no corre. Si un punto tuviera más de 62 grupos, ese punto se guarda sin `g` y la lectura cae a `watching`, que es la degradación de hoy. **Medido** (`medir.mjs`, 176 corredores): máximo de 5-6 grupos por punto en llana y 10-19 en reina; la cadena ocupa 30,8 KB de JSON en llana y 32,5 KB en reina, 0,5-3,2 KB en gzip, porque el pelotón es una racha del mismo carácter; el catálogo, 6,6 KB. Se elige una cadena y no un vector de números porque en `jsonb` cada número es un `numeric` y la cadena comprime con TOAST. El comentario de `raceRadio.ts` l. 483-490 que prometía «un vector de enteros… por ~55 KB» deja de mentir.

### 3.6 Cuándo se revela cada suceso

| Suceso                                  | `revealS`                                                                                                                                                                                                      | Por qué                                                                                                                        |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| todos salvo los de abajo                | su `tS`                                                                                                                                                                                                        | es la hora de carrera a la que pasó (§1.3)                                                                                     |
| `breakaway_formed`, `break_cooperation` | `datos.knownS` si existe (paso 11); si no, el `tS` del primer punto de radio con km ≥ `bornKm` en que un grupo con la mayoría de los protagonistas va a `STAGE.tacticBreakGapSeconds` (45 s) o más del pelotón | hoy se fechan donde nació el ataque (`simulate.ts` l. 8727-8733): leído a ritmo, anuncian la fuga del día antes de que se sepa |
| pinchazo y avería de crono              | `startS` del corredor + su `tS`                                                                                                                                                                                | el `tS` es su reloj propio (`timetrial.ts` l. 321-329); `startS` se deriva exacto del `input` (`timeTrialStartOrder`, pura)    |
| percance guardado (paso 4)              | `tS` del grupo del corredor en ese punto                                                                                                                                                                       | los `incidents` no llevan segundo (types.ts l. 358-365)                                                                        |
| días de baja de una caída               | nunca en la retransmisión                                                                                                                                                                                      | la tele no sabe el diagnóstico en carretera (mapa 06 §3.1); sale en la noticia `injury`, detrás del horizonte                  |
| resultado, clasificaciones, podio       | al revelar (meta alcanzada o «Reveal»)                                                                                                                                                                         |                                                                                                                                |

---

## 4. Lo permanente y lo eventual

La UCI obliga a DOS datos fijos, km a meta y diferencia principal (mapa 06 §1.1); lo demás es periódico o va atado a un cambio. La pantalla copia esa jerarquía y no enseña veinte datos a la vez.

### 4.1 La tabla

| Elemento (pantalla, inglés)                                                                  | Cuándo                                                                                                                      | De dónde                      | Referencia                                      |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------- |
| `54.3 km to go`                                                                              | siempre                                                                                                                     | `kmToGo`                      | capa fija UCI §11.2                             |
| `+2:14 ▲` (diferencia principal y tendencia)                                                 | siempre que no vayan juntos                                                                                                 | `mainGap`                     | capa fija UCI; agenda l. 511 «y si sube o baja» |
| reloj de carrera `3:12:40` y controles                                                       | siempre                                                                                                                     | `t`                           | [O] mapa 06 §1.2                                |
| barra de grupos: `1 · FRONT OF THE RACE · 5`, tamaño, `+0:45` al de delante, maillots dentro | siempre (hasta 4 filas en móvil, el resto plegado)                                                                          | `groups`                      | capa de posiciones UCI                          |
| perfil con una marca por grupo y el puerto que viene                                         | siempre en escritorio; en móvil, franja de 48 px                                                                            | `head.profile`, `groups[].km` | UCI §11.3, SPEC §6.15 l. 596                    |
| `Your rider · Peloton · +2:14`                                                               | siempre, si el jugador corre (solo con `g`)                                                                                 | `mine`, `g`                   | R23.7                                           |
| lista de corredores de un grupo                                                              | al formarse una fuga, al cambiar de gente, y al tocar la fila                                                               | `named`, `g`                  | UCI «composition regularly»                     |
| rótulo de corredor                                                                           | al atacar, al entrar en la fuga, al descolgarse un maillot o un favorito                                                    | `RiderCard`                   | UCI «as often as possible»                      |
| ficha del puerto `Cat. 1 · 12.4 km at 7.8% · summit in 3.2 km`                               | de 5 km antes del pie a la cima                                                                                             | `head.climbs`                 | mapa 06 §3.1                                    |
| suceso (`ATTACK`, `CRASH`, `CAUGHT`, `SPLIT`, `KOM`, `SPRINT`)                               | cuando llega su `revealS`, `BROADCAST.cardHoldMs`                                                                           | `Overlay`                     | mapa 06 §3.1                                    |
| `VIRTUAL GC`                                                                                 | cada `BROADCAST.virtualGcEveryS` de carrera mientras un top 10 de salida vaya en otro grupo que el amarillo con más de 30 s | `gcAtStart`, `g`              | mapa 06 §3.3                                    |
| `1 KM` y la cuenta de la meta                                                                | último km                                                                                                                   | recorrido                     | mapa 06 §5.2                                    |
| línea de crónica (ticker)                                                                    | cuando llega su `revealS`                                                                                                   | `ticker`                      | la voz del narrador (mapa 06 §6)                |
| `STAGE WINNER`, resultado, general con cambios                                               | solo tras la meta o «Reveal»                                                                                                | `GET …/stages/:day`           | mapa 06 §8.2                                    |

### 4.2 Reglas de convivencia

Nunca dos rótulos de corredor a la vez; un suceso nuevo sustituye al anterior (la tele corta). La capa fija no se tapa nunca. En los últimos 500 m solo queda la distancia (mapa 06 §5.3). Lo que no ayuda a entender la carrera no sale: energía, velocidad de cada grupo y motivo de cada relevista viven en la pestaña `Race Radio`, que es el microscopio, no en Watch (`Pulling: Team Beta (for 11 S. CARTER)` sí sale, una línea por grupo que tira).

### 4.3 Cómo se nombra cada fila

`FRONT OF THE RACE` a la posición 1 si no es el pelotón; `CHASERS` a las de delante del pelotón que no son la 1; `PELOTON` a `kind === 'peloton'` que cumple `isTheBunch` (raceRadio.ts l. 97-99, la misma regla del motor, principio C7 del dueño); `YELLOW JERSEY GROUP` y sus equivalentes de los otros dos maillots (`JERSEY_GROUP_NAME`, `RaceRadioPanel.tsx` l. 85-89) al grupo de detrás del pelotón o partido que lleva un maillot (la petición B6 del dueño, mapa 05 §2.2); `GRUPPETTO` a `grupeto`; `IN NO MAN'S LAND` a `tierra`. Es la tabla de `groupName` (`RaceRadioPanel.tsx` l. 58-79) movida a `domain/broadcast.ts` y reutilizada por las dos pantallas, así que no nace un tercer vocabulario (mapa 05 §6, contradicción 7).

---

## 5. El ritmo de la reproducción

### 5.1 El reloj de pared se ata al recorrido, no a la carrera

Lo que mide la duración revela el final (mapa 06 §7.2, regla 3). Por eso el ritmo se define en **segundos de pared por km de la cabeza**, según la zona del RECORRIDO, y nunca según los sucesos: la duración es la misma pase lo que pase y se puede anunciar antes de empezar (`head.playbackS`).

| Zona (la más lenta que aplique)              | Pared por km, velocidad 1       | Compresión aproximada |
| -------------------------------------------- | ------------------------------- | --------------------- |
| rodaje: más de 40 km a meta, fuera de puerto | `BROADCAST.pace.cruise` = 1,2 s | ≈ 1:65                |
| puerto categorizado, o 2 km antes de su pie  | `pace.climb` = 3,0 s            | ≈ 1:50                |
| aproximación: de 40 a 10 km                  | `pace.approach` = 3,0 s         | ≈ 1:27                |
| final: de 10 km a 1 km                       | `pace.final` = 12 s             | ≈ 1:7                 |
| último km                                    | `pace.lastKm` = 40 s            | ≈ 1:2                 |

**Estimado** con esas cifras: una llana de 175 km dura unos 6,5 minutos a velocidad 1 y una reina de 185 km con 55 km de puerto, unos 8. Es la proporción del resumen de televisión (mapa 06 §5.4: el 80 % del recorrido en 3-4 min, los últimos 20-30 km en 3-6).

### 5.2 Controles

- **Velocidad**: `×0.5` (unos 15 min), `×1`, `×2`, `×4` (unos 2 min). Cambia el factor, no las zonas.
- **Pausa**: tocar la pantalla o la barra espaciadora. Los rótulos se quedan.
- **Saltos**: `−5 km`, `+5 km` y tres saltos de RECORRIDO: `Next climb`, `Final 20 km`, `Last km`. **Nunca** «siguiente suceso»: diría que lo hay.
- **La barra de progreso va en km**, con las marcas del recorrido (puertos, volantes), nunca de sucesos (mapa 03 E7).
- **«Ir al final»** es `Reveal result`, con confirmación («You'll see the finish and every classification»), y queda registrado (§7.1).
- **Reanudar**: desde el punto guardado en el servidor (con sesión) o en `localStorage` (visitante; si el almacenamiento falla, desde la salida). La primera vez, desde la salida: no hay directo (mapa 05, DUEÑO 9).
- **Avanzar más allá de lo servido**: el servidor da un tramo más del punto visto; un salto más largo es un `PUT` de progreso explícito antes del `GET` (§10.2).
- **Lo que se conserva a cualquier velocidad**: la capa fija, cada tarjeta de suceso (`cardHoldMs` es tiempo de pared, no de carrera), el orden, y el último km, que va siempre a ×1. Es lo que el resumen de televisión no pierde nunca: dónde estamos, por qué y en qué orden (mapa 06 §5.4).

### 5.3 El móvil

Pantalla de 360 px con margen de 16: arriba, pegada, la capa fija en una línea (`54.3 km to go · +2:14 ▲ · ⏸`); debajo, la franja del perfil de 48 px con las marcas; luego la barra de grupos con cuatro filas visibles y el resto en `+2 groups`; la lista de un grupo se despliega al tocar su fila; el suceso entra como tarjeta sobre la barra de grupos; el ticker es una sola línea al pie, por encima de `BottomNav`; los controles viven en una hoja inferior. La tabla de un grupo usa la fila de la radio de hoy con el nombre abreviado (`L. BERTOLINI`), que no necesita los 176 px (`max-w-[11rem]`) que hoy puede ocupar el nombre sin encoger y deja sitio al equipo (mapa 03 §7). Rendimiento: `stateAt` se calcula por fotograma (una búsqueda binaria por grupo sobre como mucho 19 grupos), la barra se repinta a 4 Hz y la capa fija a 10 Hz; con 20 puntos por tramo no hay nada caro que pintar (mapa 07 §7).

---

## 6. Los rótulos

### 6.1 El maillot que se LLEVA y lo que el rótulo DICE

La tele enseña dos cosas que no hay que confundir (mapa 06 §2.3): el maillot llevado (uno, el que se ve) y las distinciones (varias, en el rótulo). `wornKit(rider, ctx)` es una función pura en `packages/shared/src/broadcast.ts` que aplica la prelación de la UCI (art. 1.3.071 y 2.6.018, mapa 06 §2.2):

1. **Maillot de líder de la carrera**, con el reparto de hoy: `assignLeaderJerseys` sobre las clasificaciones tras la N−1, orden amarillo, verde, azul (`JERSEY_PRIORITY`) y «pasa al siguiente». En la etapa 1 y en una carrera de un día no hay ninguno, que es lo que ya devuelve la API (`routes/races.ts` l. 465-473). La radio nombra hoy el grupo por amarillo, azul, verde (`RaceRadioPanel.tsx` l. 102); se unifica en `JERSEY_PRIORITY`.
2. **Título vigente de su disciplina**: el de ruta en una etapa en línea, el de crono en una crono individual; mundial antes que continental antes que nacional.
3. **La equipación de su equipo**.

Delegación con campeones (2.6.018: el campeón que recibiría un maillot delegado lleva el suyo): el maillot pasa al siguiente que no sea campeón. Hoy no hay campeones, así que no cambia nada hasta E3 y E12 (decisión 16.6).

Las líneas del rótulo, tres como mucho y en este orden: el maillot delegado que lleva (`Points jersey · 2nd in the classification`), la clasificación que lidera sin llevar su maillot (`Also leads the mountains`), su título si no lo lleva puesto (`Italian Champion`) y, si fue top 20 de la general de salida y no es el líder, su puesto (`14th GC · +4:02`).

### 6.2 Las cinco categorías del dueño

| Categoría                               | Dato hoy                                                                                                                            | Dibujo hoy                                              | En E2                                                                   | Cuando lleguen E3 y E12                                                     |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1. General                              | `assignLeaderJerseys` tras N−1                                                                                                      | `LeaderJersey` (Jersey.tsx l. 71-117)                   | `worn` y líneas, paso 2                                                 | nada                                                                        |
| 2. Puntos                               | ídem                                                                                                                                | ídem                                                    | ídem                                                                    | nada                                                                        |
| 3. Montaña                              | ídem                                                                                                                                | ídem                                                    | ídem                                                                    | nada                                                                        |
| 4. Campeón                              | no existe; derivable del palmarés (`kind 'gc'`, `race_id 'nc-<cc>-road'` o `'nc-<cc>-itt'`, índice `palmares_race_idx`, mapa 04 §4) | no existe                                               | `ChampionTitle` con `provisional: true`, chip de texto, paso 10         | E12 da la tabla de títulos y el Mundial; E3, la señal; `provisional: false` |
| 5. Equipo                               | `teams.jersey_seed` por el `teamId` con el que corrió (`input.riders[]`)                                                            | `<Jersey seed>` (Jersey.tsx l. 15-52), nunca en carrera | icono junto al equipo en cada rótulo, paso 10                           | E3: editor y vocabulario                                                    |
| fuera: dorsal amarillo del equipo líder | `leadingTeam` (jerseys.ts l. 116-118)                                                                                               | retirado a propósito                                    | no entra (decisión 16.7)                                                |                                                                             |
| fuera: joven                            | `docs/tactica.md` lo promete (l. 6966) y no existe                                                                                  |                                                         | entra como cuarto maillot de líder si la táctica lo crea; E2 no lo crea |                                                                             |

### 6.3 Mientras E3 y E12 no existan

La interfaz que E2 pide es el tipo `ChampionTitle` (§3.3) y un proveedor con esta firma, que E12 sustituye sin tocar a quien lo llama:

```ts
// packages/db/src/titles.ts (nuevo, solo lectura). Provisional de E2; E12 lo reemplaza por su tabla.
export async function championTitles(
  db: Database,
  worldId: string,
  onGameDay: number,
): Promise<ReadonlyMap<string, readonly ChampionTitle[]>>
```

La versión de E2 lee el palmarés de los campeonatos nacionales (`nc-<cc>-road`, `nc-<cc>-itt`, `nc-<cc>-u23-road`, `nc-<cc>-u23-itt`, `calendar.ts` l. 3655-3660) y da por vigente el de la última edición cuyo día de juego es anterior al de la etapa, hasta la edición siguiente (un año, mapa 06 §2.2 punto 8). Mundial y continental no salen nunca: no existen en el calendario (mapa 04 §4). En pantalla, mientras E3 no dibuje la señal, un chip de texto con forma (no solo color, regla de daltonismo de `navegacion.md` l. 455-457): (pantalla) `ITA CHAMP`, `ITA TT CHAMP`. SPEC §8 prohíbe imitar el arcoíris, así que ni siquiera el chip lo usa.

### 6.4 A quién se nombra en cada grupo, y a qué hora

Con el grupo de cada corredor guardado (paso 4), nombrar es una decisión de presentación y no de almacenamiento. La política, en `domain/broadcast.ts`:

- **Grupo de hasta 12**: todos (el mismo umbral que la radio, `NAME_WHOLE_GROUP_UP_TO`, raceRadio.ts l. 611). Una fuga de cinco va siempre completa.
- **Grupo mayor**: los que tiran (guardados), los que llevan un maillot que no es el de su equipo, el top 10 de la general de salida, los del jugador, y los protagonistas de sucesos YA revelados (el que ataca en el km 40 se nombra en el pelotón desde el km 40, no antes). El resto se cuenta: (pantalla) `+143 riders`.
- **Etapas sin `g`** (antes del paso 4): el mismo filtro sobre `watching`. Quita la fuga de la lista de seguimiento, que desde el km 0 nombra a los diez primeros de la etapa.

### 6.5 El caso literal: «cuando se escapan cinco, que se vean sus maillots»

Cuando se revela `break_formed` (o un grupo de cabeza de 12 o menos cambia de gente), la tele rodea la fuga con la moto y presenta a cada uno (mapa 06 §2.4). La tarjeta:

```
(pantalla)
1 · BREAKAWAY · 5 riders                                     +0:48 on the peloton
  [ITA CHAMP]   21  L. BERTOLINI    ITA  [kit] Team Alpha     Italian Champion
  [KOM]         45  J. VERHOEVEN    BEL  [kit] Team Gamma     Mountains leader
                63  P. LAMBERT      FRA  [kit] Team Epsilon
                88  I. ARRIETA      ESP  [kit] Team Delta     14th GC · +4:02
               112  T. HARGREAVES   GBR  [kit] Team Zeta
Italian champion Luca Bertolini goes clear with the mountains leader and three more.
```

La lista va en orden de carretera; la frase va en orden de notoriedad (mapa 06 §2.4): maillot de líder, campeón del mundo, campeones nacionales y continentales, amenaza para la general (top 10 de salida a menos de 5 min), y el resto contado. Nombra como mucho a tres y cuenta a los demás, que es exactamente R23.4 («hasta tres nombres + conteo», `tactica.md` l. 4859-4864). Se escribe en `breakHeadline(cards)`, con sus variantes en inglés (pantalla): `{A} goes clear with {n} others.`, `{A} and {B} go clear with {n} more.`, y sin nadie notable `Five riders go clear: {teams}.`. Mientras no haya campeones, la misma fuga dice `The mountains leader Jonas Verhoeven goes clear with four others.`, y eso ya es la diferencia que pide el dueño. La fila de la fuga en la barra lleva desde ese momento los iconos de los maillots que van dentro (mapa 06 §1.6), y la fila del pelotón los suyos (`[GC] [PTS]`).

---

## 7. El modo sin destripe como propiedad del producto

### 7.1 El visto por jugador

- **Qué es visto.** Por jugador y carrera, `seenThrough`: la mayor k tal que las etapas 1 a k corridas están `finished` (llegó a la meta en Watch) o `revealed` (pulsó `Reveal` o abrió el acta a través del aviso). Es un prefijo contiguo (principio 9): revelar la 5 revela también la 3 y la 4, y se dice antes de confirmar (pantalla: `This also reveals stages 3 and 4.`). Además, por etapa, `watchedKm` para reanudar.
- **Qué carreras se siguen.** Las de su corredor (está en `race_rosters` de la temporada), las de los corredores de su equipo si es mánager, las que marcó con ★ y las que abrió en Watch (`race_follows`). Solo las carreras seguidas tienen horizonte: el resto del mundo se ve al día, que es lo único viable con 11 etapas nuevas al día y 94 a la semana (mapa 04 §2).
- **Dónde vive.** Dos tablas nuevas en la base (§10.1), escritas por la API: `stage_views` y `race_follows`. Nada en el tick.
- **Cómo avanza.** La web manda su progreso (`PUT /api/views/…`) cada `BROADCAST.progressEveryS` de pared, antes de pedir cada tramo, al pausar y al cerrar (`sendBeacon`); el servidor guarda el máximo. Mirar otras pantallas no avanza nada; ver media etapa solo mueve `watchedKm`.
- **Visitante sin sesión**: no tiene horizonte (todo público, como hoy); Watch sigue siendo la puerta por defecto y el progreso va a `localStorage`, envuelto en `try/catch`.

### 7.2 El horizonte y su único predicado

```ts
// packages/db/src/horizon.ts (nuevo)
export interface RaceCut {
  raceKey: string
  seenThrough: number // 0 = no ha visto ninguna
  firstHiddenGameDay: number // día de juego de la etapa seenThrough + 1 (calendario, puro)
}
export type Horizon =
  | { kind: 'all' } // visitante, admin, tick
  | { kind: 'viewer'; userId: string; cuts: readonly RaceCut[] } // solo carreras seguidas con algo oculto

export async function loadHorizon(db: Database, userId: string, today: number): Promise<Horizon>

/** EL predicado: la fila atada a (raceKey, gameDay) es posterior a lo que el jugador ha visto. */
export function hiddenSql(h: Horizon, raceKey: SQLWrapper, gameDay: SQLWrapper): SQL {
  if (h.kind === 'all' || h.cuts.length === 0) return sql`false`
  const keys = h.cuts.map((c) => c.raceKey)
  const days = h.cuts.map((c) => c.firstHiddenGameDay)
  return sql`exists (select 1 from unnest(${keys}::text[], ${days}::int[]) as c(k, d)
                     where c.k = ${raceKey} and ${gameDay} >= c.d)`
}
/** Su gemelo para las tablas que van por número de etapa. */
export function throughStage(h: Horizon, raceKey: string, lastRun: number): number
export function stageHidden(h: Horizon, raceKey: string, stageDay: number): boolean
```

El corte va por día de juego porque cada carrera corre como mucho una etapa por día (ninguna declara `doubleAfter`, mapa 02 §1.3): `(raceKey, gameDay)` identifica la etapa, y así sirven sin columna nueva `rider_points` (`race_id` es la `raceKey`), `palmares` (`race_id || ':s' || season`), `rider_daily_log`, `race_rosters.abandoned_day` y, tras la `0043`, `news` y `transactions`. El día de juego de una etapa sale del calendario (`season · 364 + stageDayOfSeason`, como `raceReport.ts` l. 52-59). `loadHorizon` es una consulta por petición autenticada (rosters del corredor, seguidas, etapas corridas y vistas); se decora perezosa en la petición y no se pide en las rutas que no la usan.

**El punto único no es una línea, son cuatro piezas que se vigilan entre sí**: el tipo (`Horizon` es parámetro OBLIGATORIO, sin valor por defecto, de las lecturas de `packages/db` que la tabla de §7.3 reparte: las de la etapa y la carrera por `throughStage`, `getSeasonWinners`, `getRaceHistory`, las tres de noticias de `news.ts`, las de ranking, jóvenes, premios, naciones y equipos de `ranking.ts` y `browse.ts`, palmarés e insignias, y las del jugador: resumen, libro, parte, resultados y ficha; unas trece. Una llamada nueva no compila sin decidir); el predicado (`hiddenSql` es la única forma de escribir el corte); el registro de rutas (§7.4); y el canario B1 (§13), que recorre lo que Fastify registra.

### 7.3 Las 48 superficies en siete mecanismos

| Mecanismo                     | Superficies (mapa 03 §4)        | Dónde se aplica                                                                                                                          | Qué ve el jugador en su lugar                                                                                                                                                                           |
| ----------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. La etapa                   | E1-E9                           | `stageHidden` en `GET …/stages/:day`; tramos en `…/broadcast`; `…/report`                                                                | Watch por defecto; `Report`, `Result`, `Classifications` con (pantalla) `Watch the stage or reveal the result`; radio con tope en `watchedKm`; perfil sin marcas; `?tab=` ignorado mientras esté oculta |
| B. La carrera a mi etapa      | C1-C6                           | `throughStage` en la ficha de carrera (`getGcThroughStage` y compañía, `leadersThroughStage`, `stageWinners`, `history`)                 | cabecera `Winner` y ganadores de etapa solo de lo visto; clasificaciones tras `seenThrough`; clásica abre en Watch; C6 (`Under way, 7 of 21 raced`) no es resultado y se queda                          |
| C. El ganador de cada carrera | I1-I4                           | `getSeasonWinners(h)`                                                                                                                    | sin ganador (pantalla: `Finished · not watched`); el buscador no casa con lo que no llega                                                                                                               |
| D. Filas con día y carrera    | N1-N4, P2, P3, W3, W4, H6       | `not hiddenSql` en noticias, palmarés, insignias, historial, récords y libro de cuentas                                                  | la fila no existe; los desplegables de News se construyen con lo que llega                                                                                                                              |
| E. Sumas a mi horizonte       | W1, W2, W5, P1, P6 (puntos), H2 | puntos desde `rider_points` con el corte en vez de `riders.season_points`; dinero = saldo − premios ocultos                              | cifras de antes de la etapa                                                                                                                                                                             |
| F. Lo mío a mi horizonte      | H1, H3, H4, H5, H7, P4, P5      | resultados por `throughStage`; forma de `rider_daily_log` hasta el corte; salud de un corredor de una carrera seguida con etapas ocultas | (pantalla) `Stage 7 · Race France · Ready to watch`; forma de antes; salud `Racing`                                                                                                                     |
| G. Reglas estáticas           | T1-T6                           | §7.5                                                                                                                                     | título neutro, correo neutro, contadores de etapas por ver, nunca de resultados                                                                                                                         |

Quedan dos casos con nombre. **W6** (rivales por fama en las órdenes) no destripa: `fame` no se escribe en ninguna parte (`rollover.ts` l. 60 y 293). **El presupuesto del equipo** (parte de P6) se enseña el de hoy: `teams.budget` se suma en el sitio sin libro (`economy.ts` l. 154-161), no hay a qué restarle el premio, y es una fuga residual que se acepta y se dice (decisión 16.8).

### 7.4 La API: política por ruta, arranque y un interruptor

```ts
// apps/api/src/spoiler.ts (nuevo)
export type SpoilerPolicy = 'safe' | 'horizon' | 'watch' | 'admin'
export type SpoilerMode = 'off' | 'admins' | 'on' // SPOILER_MODE, en env.ts
export type RouteRegistry = readonly { url: string; policy: SpoilerPolicy }[]
declare module 'fastify' {
  interface FastifyContextConfig {
    spoiler?: SpoilerPolicy
  }
  interface FastifyRequest {
    horizon: () => Promise<Horizon>
  }
}
export function registerSpoilerGuard(
  app: FastifyInstance,
  deps: { db: Database; mode: SpoilerMode },
): RouteRegistry {
  const registry: { url: string; policy: SpoilerPolicy }[] = []
  app.addHook('onRoute', (r) => {
    const methods = Array.isArray(r.method) ? r.method : [r.method]
    if (!methods.includes('GET') || !r.url.startsWith('/api')) return
    const policy = r.config?.spoiler
    if (policy == null) throw new Error(`ruta sin política de destripe: GET ${r.url}`)
    registry.push({ url: r.url, policy })
  })
  app.decorateRequest('horizon', null) // perezosa: una consulta como mucho por petición
  return registry
}
```

`safe` = no devuelve nada nacido de una etapa (salud del servidor, estructura del calendario, geo, nombres, órdenes propias); `horizon` = lo devuelve y pasa `request.horizon()` a `packages/db`; `watch` = las tres rutas que leen o mueven el visto (retransmisión, visto, acta); `admin` = sin horizonte. Las rutas ya usan `config` (el `rateLimit` de `authProxy.ts` l. 47), así que no hay patrón nuevo. Hoy hay unas 50 rutas GET (contadas con grep en `routes/`); clasificarlas es un PR.

`SPOILER_MODE` en `env.ts` (enum Zod): `off` (el horizonte es siempre `all`: lo de hoy), `admins` (solo para `users.is_admin`: el dueño lo vive primero), `on`. Se cambia en Railway sin desplegar. `BROADCAST_WATCH` (`off | admins | on`) enciende la pestaña Watch; los dos viajan a la web en `/health.features`.

### 7.5 Título de pestaña, correos y avisos

- **Título.** `usePageTitle(parts)` en la web, con `TitlePart = { race: string } | { stage: number } | { page: 'Watch' | 'Report' | 'Results' }`: no admite texto libre, así que no puede llevar un nombre de corredor. Un test prohíbe `document.title` fuera del gancho. (pantalla) `Stage 7 · Race France · Cycling Star`. Nunca los km a meta ni un nombre.
- **Contadores.** El `badge` de `Tabs.tsx` (l. 78-79, hoy sin uso) puede contar etapas por ver, nunca resultados.
- **Correo.** `stageReadyEmail({ raceName, stageDay, km, stageKind, url })` en `apps/api/src/emails.ts`: el tipo no tiene sitio para un resultado. (pantalla) asunto `Stage 7 of Race France is ready to watch`, cuerpo con el tipo de etapa y el enlace a Watch. Se prueba como los otros tres (`emails.test.ts`) y entra en el canario. **Cuándo, a quién y con qué baja se manda es de E4** (mapa 05 §7); el proceso del tick no tiene mailer (mapa 02 §5). Decisión 16.9.
- **Notificaciones web, service worker, Badging**: no existen; la que llegue usa la misma plantilla.

### 7.6 Rutas públicas, el visitante y el acta que se comparte

- **Visitante**: `/world/races/:raceId/stages/:day` abre también en Watch (el modo por defecto es del producto, no de la cuenta), con `Report` a un toque: el «Requisito recogido» de ver el resultado sin cuenta (mapa 05, DUEÑO 8) se cumple con un toque, no con la pantalla por defecto.
- **El acta compartible**: ruta web nueva `/world/races/:raceId/stages/:day/report`, que abre el acta directamente. Es la captura que vende el juego (`captacion.md` l. 39-42) y la que «se comparte sola» (MVP l. 21). El botón `Share` de Report copia esa URL.
- **El que la recibe y sigue esa carrera sin haberla visto** ve un aviso (pantalla): `You haven't watched this stage yet.` [`Watch from the start`] [`Show the report`]. Lo segundo es un Reveal registrado.
- **Enlaces viejos con `?tab=result`**: mientras la etapa esté oculta, la pestaña pedida no se salta Watch (E9).

### 7.7 La previa de N+1, que destripa N, y las órdenes

- **La página de una etapa aún no corrida** (Preview: perfil, puertos, volantes, maillots en juego) pide los maillots a `leadersThroughStage(min(N, seenThrough))`. Si el jugador no ha visto la N, lo dice (pantalla): `You haven't watched stage 6 yet · Watch · Reveal`.
- **Watch de N+1 con N sin ver**: la tele abre cada etapa con «el final de la anterior y las clasificaciones» (mapa 06 §7.2 regla 6), así que Watch de N+1 pide antes resolver N (principio 9).
- **Órdenes** (`/api/my-orders`, `RaceOrders`): si la carrera del corredor tiene una etapa corrida sin ver, la página abre con un aviso (pantalla) `Stage 6 is waiting for you` [`Watch (≈7 min)`] [`Reveal results`] [`Give orders anyway`]; lo tercero mantiene el horizonte y sirve las clasificaciones hasta `seenThrough`. Las órdenes no necesitan el resultado; necesitarlo es decisión del jugador.

### 7.8 Volver tras una semana

Quien entra los domingos encuentra la vuelta acabada (mapa 04 §2). La portada abre con un bloque (pantalla) `Ready to watch`, una fila por carrera seguida: `Race France · 15 stages to watch (7-21)` con [`Watch stage 7`], [`Catch up at ×4`] y [`Reveal all`]. Mientras no se resuelva, la general final, las noticias y el palmarés de esa carrera no aparecen en ninguna pantalla. Para que un seguimiento olvidado no congele el mundo, las etapas pendientes de una carrera terminada hace más de `BROADCAST.staleRevealGameDays` (28 días de juego, 7 reales) se revelan en la siguiente visita, con una línea que lo dice (decisión 16.3).

---

## 8. El journal, la crónica y las noticias rehechos

### 8.1 Un dato, dos productos, tres nombres

El journal, la crónica, el diario y la pestaña `Story` son el mismo artefacto (mapa 05 §6, contradicción 8). E2 fija el vocabulario de pantalla: **Watch** es la retransmisión (estado, sucesos y crónica en vivo, para quien no la ha visto), **Report** es el acta (la crónica entera, podio, resultado y clasificaciones, para quien ya la vio o la recibe compartida) y **Race Radio** es el microscopio km a km. Los tres leen `stage_snapshots.events` y `stage_snapshots.radio`; ninguno guarda texto.

### 8.2 La crónica en vivo, sin reescribir la crónica

```ts
// apps/api/src/chronicle.ts: una opción más; ninguna pasada se reescribe.
export interface BuildChronicleOptions {
  byClock?: boolean
  /** La crónica tal como se podía contar a la hora `untilS` de carrera. */
  live?: { untilS: number; stageKm: number; revealS: (e: ChronicleEvent) => number }
}
```

La receta, en cinco puntos:

1. **Se trunca la entrada**: solo entran los sucesos con `revealS(e) ≤ untilS` (§3.6). Una pasada que no ve el futuro no puede contarlo; así se neutralizan `caughtLaterKm` (l. 297) y toda mirada hacia delante.
2. **Orden por reloj**: la rama `byClock` que ya existe para la crono (l. 323-327).
3. **La longitud de la etapa entra como dato**: hoy `followTheLeader` (l. 545), `clockTheGaps` (l. 637) y `markReunion` (l. 945) la deducen del último suceso, que truncado es «ahora».
4. **Se apagan cinco pasadas retroactivas**, las que cambian o borran una línea ya contada por algo que pasa después: `markConcession` (l. 319), `dropUndoneSelections` (l. 361), `groupGapRuns` (l. 362), `foldQuickAttacks` (l. 371) y los racimos de `groupRuns` (l. 375).
5. **El ticker filtra en la web** lo que ya dice el estado (`time_gap`, `time_gap_run` y `front_group` los cuenta la barra) y los descuelgues sueltos de corredores sin nombrar (los cuenta la fila `GRUPPETTO · 23`). El «puedes mencionar muchos juntos con número» del dueño (mapa 05 B3) lo cumplen la cuenta de la barra y el Report, que conserva los racimos.

**Medido** (`prefijo.mjs`: la crónica a la hora t tiene que ser prefijo exacto, línea y datos, de la de t + 30 s, o del km k de la del k + 1):

| Variante                                                                              | Revela por | Corridas | Violaciones |
| ------------------------------------------------------------------------------------- | ---------- | -------: | ----------: |
| truncar sin más                                                                       | km         |       15 |          94 |
| + longitud de etapa                                                                   | km         |       15 |          40 |
| + apagar `markConcession`, `dropUndoneSelections`, `groupGapRuns`, `foldQuickAttacks` | km         |       15 |          17 |
| + km redondeado y racimo publicado al cerrar su ventana de 5 km                       | km         |       30 |           0 |
| por reloj, racimo por ventana de 1.200 s                                              | reloj      |       15 |          17 |
| **por reloj, sin racimos en vivo (la elegida)**                                       | reloj      |       15 |       **0** |

Etapas: race-france e5, e7, e13, e15, e18 y e20, race-flanders y race-colombia e5, 3 semillas, campo del banco de 176 corredores; 54 a 296 sucesos por etapa. Se elige revelar por reloj aunque por km también llega a cero: por km, el descuelgue de un grupeto a 20 minutos se contaría cuando la cabeza pasa por su km, 20 minutos antes de que ocurra. El precio es que en vivo no hay racimos; el Report los tiene.

Las plantillas no cambian: sin `cazada`, `peloton_concedes` usa su otra redacción (`stageJournal.ts` l. 1085-1100); `juntos` lo sigue calculando `markReunion` con lo ya contado; `desenlace` sale bien con la longitud real. Ninguna frase nueva, ningún `case` nuevo.

### 8.3 El acta

Report es `buildChronicle` sin `live`, como hoy, con sus veinte pasadas, el podio y la altimetría con marcas. Se enseña al revelar y es lo que se comparte. Sus tests (`chronicle.test.ts`, 62; `stageJournal.test.ts`, 140) no se tocan.

### 8.4 Las noticias, con `seed`, `data`, carrera y etapa

La `0043` añade a `news` cuatro columnas nullable (`seed`, `data jsonb`, `race_key`, `stage_day`), un índice `(world_id, race_key, stage_day)`, y deja `text` nullable. `emitNews` guarda la semilla que ya calcula y hoy tira (`win:${raceKey}:${gameDay}:${stageDay}`, `stageRun.ts` l. 1195 y 1214) y datos que son ids y códigos, nunca inglés:

```ts
// packages/shared/src/news.ts (nuevo): los datos de un titular y su render, fuera del motor.
export type NewsDataV2 =
  | {
      v: 2
      kind: 'stage_win' | 'tt_win' | 'breakaway_win'
      riderId: string
      raceId: string
      raceKey: string
      stageDay: number
    }
  | {
      v: 2
      kind: 'one_day_win' | 'one_day_tt_win' | 'gc_win' | 'kom'
      riderId: string
      raceId: string
      raceKey: string
    }
  | {
      v: 2
      kind: 'abandon'
      riderId: string
      raceId: string | null
      raceKey: string | null
      stageDay: number | null
      reason: 'colapso' | 'fuera_control' | 'lesion' | 'enfermedad' | 'voluntario'
    }
  | {
      v: 2
      kind: 'injury'
      riderId: string
      raceKey: string | null
      stageDay: number | null
      days: number
    }
  | { v: 2; kind: 'contract'; riderId: string; teamId: string; relocatesTo: string | null }
  | { v: 2; kind: 'retirement'; riderId: string; age: number }

export interface NewsNames {
  rider: string
  race?: string
  team?: string
  country?: string
}
export function renderNewsItem(data: NewsDataV2, seed: string, names: NewsNames): string // inglés hoy
```

Los motivos de abandono son los de `race_rosters.abandoned_reason` (mapa 04 §1). Las plantillas se COPIAN de `engine/src/world/news.ts` a `shared` con el mismo inglés (redactar no es del motor); la copia del motor sigue escribiendo `text` y se borra en el paso 11, que ya paga los bancos, así que el paso 6 no toca `packages/engine`. B4 vigila que las dos copias digan lo mismo mientras convivan. La API resuelve nombres al leer y devuelve `text` renderizado más `raceId`, `raceKey` y `stageDay`, así que `newsItemSchema` solo gana opcionales. La web enlaza por `raceId` y **`raceOfHeadline` muere** (`newsFeed.ts` l. 17-24). Hasta el reinicio del mundo se sigue escribiendo también `text` (red para la web de ayer); las filas viejas sin `data` se leen por su `text`. `transactions` gana en la misma migración `race_key` y `stage_day`, para el corte del libro de cuentas y del saldo (§7.3, mecanismos D y E).

### 8.5 Re-render idéntico, y lo que E10 recibe

- **Noticias**: `render(seed, data)` es puro y sin base; B4 comprueba que coincide con el `text` guardado mientras convivan.
- **Crónica**: la variante se siembra hoy con `${plantilla}:${km}:${nombres}` (`stageJournal.ts` l. 327), con los nombres y el «and» inglés (mapa 07 §3): renombrar a un corredor cambia la frase de etapas viejas. E2 la cambia a los ids de los protagonistas en un PR propio antes del reinicio, re-sellando una vez las variantes fijadas en los tests, y desde entonces B5 (huella del corpus) impide cambios silenciosos.
- **Para E10** (mapa 07 §3, cinco puntos): cero texto escrito por el tick en `news` (sí quedan `palmares.detail` y las notas del libro, que con `race_key` y `stage_day` ya se pueden redactar al leer); semilla neutra de idioma; un punto de render por superficie (`renderNewsItem`, `chronicleParts`, las tarjetas de §4 en `domain/broadcast.ts`); nombres de grupo como códigos (`front`, `chasers`, `peloton`, `jersey_group`, `gruppetto`, `no_mans_land`) y no como texto; el género del corredor cabe en `RiderCard` cuando E10 lo pida.

---

## 9. Las contrarrelojes

La crono es otro producto (mapa 01 §8.5): no hay grupos, el reloj de carrera dura 3,4-6,5 h y el relato lo llevan los tiempos (mapa 06 §4).

- **El estado en la hora t**: en ruta, los que ya salieron y no han llegado (`startS ≤ t < startS + tiempoS`); en meta, los llegados, con el mejor tiempo provisional (el «hot seat»); por salir, el resto. `startS` se deriva exacto del `input` (`timeTrialStartOrder`, pura, startOrder.ts l. 127) y la llegada, de `results`. Todo eso existe hoy.
- **Lo que falta y guarda el paso 4**: el tiempo de cada corredor en cada km. La crono ya lo tiene en `rides[].raw` (`timetrial.ts` l. 266-284) y lo tira. `simulateStage` pasa la sonda a `simulateTimeTrial` (hoy la ignora, `simulate.ts` l. 1264) y esta llama al final a un método opcional nuevo de `StageProbe`, `onTimeTrial(riders: { riderId: string; startS: number; atKm: readonly number[] }[])`, después de haber simulado a todos: no puede tocar la carrera, y el test «la sonda no toca la carrera» se extiende a la crono. Se guarda en `stage_snapshots.radio` como `tt: { field: string[]; startS: number[]; atKm: number[]; t: string[] }` (una cadena por corredor con los décimos de segundo por km). **Estimado**: 176 corredores × 26 km, unos 30 KB de JSON.
- **Antes del paso 4**: la posición en ruta se interpola entre salida y llegada a velocidad constante, y los parciales son solo los `tt_split` (cambios del mejor, `constants.ts` l. 6177-6192). La respuesta dice `clock: 'estimated'`.
- **La pantalla** (pantalla): capa fija `1:42:10 · 38 on course · 71 finished · 67 to start`; tarjeta `HOT SEAT · M. OLSEN 32:15`, que cambia con cada nuevo mejor tiempo (derivado de `results`, exacto); `ON COURSE`: el top 10 de salida, los del jugador y los diez últimos en salir, con su diferencia en el último parcial; tarjetas `SPLIT 1` y `SPLIT 2` en los dos controles de `ttSplitChecks`; `VIRTUAL GC` cuando corren los de la general (déficit de salida más la diferencia provisional). El ticker usa las nueve plantillas `tt_*` de siempre.
- **El ritmo va por reloj de carrera**, no por km: la parte anónima a `BROADCAST.pace.ttEarly` y, desde que sale el primero de los `ttLateStarters` últimos, a `pace.ttLate`. `playbackS` se calcula con la salida del último y una velocidad nominal, sin mirar un resultado; la llegada real lo mueve unos segundos de pared. **Estimado**: 4-6 min para una jornada de 3,4-6,5 h.
- **Pinchazos y averías**: se revelan a `startS + tS` (§3.6).

---

## 10. El esquema y la API

### 10.1 Migraciones (solo `drizzle-kit generate`; la próxima libre es la `0043`)

```ts
// packages/db/src/schema.ts, 0043: news y transactions ganan columnas nullable (catálogo, sin reescritura)
//   news:         seed text, data jsonb.$type<NewsDataV2>(), race_key text, stage_day integer; text pasa a nullable
//                 + index('news_race_stage_idx').on(t.worldId, t.raceKey, t.stageDay)
//   transactions: race_key text, stage_day integer

// 0044: lo visto
export const stageViews = pgTable(
  'stage_views',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    raceKey: text('race_key').notNull(),
    stageDay: integer('stage_day').notNull(),
    /** Hasta dónde ha llegado (reanudar). Lo escribe la API con el máximo de lo que manda la web. */
    watchedKm: real('watched_km').notNull().default(0),
    state: text('state', { enum: ['watching', 'finished', 'revealed'] }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.raceKey, t.stageDay] })],
)
export const raceFollows = pgTable(
  'race_follows',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    raceKey: text('race_key').notNull(),
    source: text('source', { enum: ['manual', 'opened'] }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.raceKey] })],
)
```

Claves por `race_key` sin `world_id`, como `stage_results`, y FK a `users` con cascada, como `sessions` (mapa 04 §6, punto 6). **Coste estimado** con la cuenta del mapa 04 §3: unos 150 B por fila de `stage_views`, 260-500 filas por jugador y año real; con 10.000 jugadores, del orden de 0,4-0,75 GB al año, despreciable frente a `rider_daily_log`. `columnasVivas.test.ts` exige que `watched_km` se escriba: lo escribe el `PUT`. Si un paso de táctica o de entrenamiento toma antes la `0043`, E2 renumera: `drizzle-kit` numera solo.

`stage_snapshots` **no gana columnas** (`tactica.md` l. 7589-7591): la radio es `jsonb` y los campos del paso 4 viajan dentro, opcionales.

### 10.2 Rutas

| Ruta                                           | Política            | Entrada                                                          | Salida                                                                                                                                                                                    | Nota                                                                                                                                   |
| ---------------------------------------------- | ------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/races/:raceId/stages/:day`           | horizon             | `?season=` opcional                                              | `StageReplay` de hoy; con la etapa oculta, sin `results`, `chronicle`, `gc`, `kom`, `points`, `teamStage`, `teamGc`, `radio` ni `leaders.afterStage`, y con `watch: { state, watchedKm }` | la web de ayer ve pestañas vacías y no se rompe: todo lo omitido ya es `.optional()`                                                   |
| `GET /api/races/:raceId/stages/:day/broadcast` | watch               | `?from=<km>&season=`                                             | `BroadcastChunk` de (from, from + 20]                                                                                                                                                     | con sesión, sirve si `from ≤ watchedKm`; si no, 409 con `watchedKm`. Así nunca hay más de un tramo servido por delante del punto visto |
| `GET /api/races/:raceId/stages/:day/report`    | watch               |                                                                  | la parte de acta de `StageReplay`                                                                                                                                                         | con sesión y etapa oculta registra el Reveal; sin sesión, público                                                                      |
| `PUT /api/views/:raceKey/:stageDay`            | (escritura)         | `{ km: number } \| { finished: true } \| { reveal: true }` (Zod) | `{ seenThrough, watchedKm }`                                                                                                                                                              | el máximo gana; `reveal` revela también las anteriores                                                                                 |
| `GET /api/views/pending`                       | horizon             |                                                                  | `{ raceKey, raceName, stages: { day, km, kind }[] }[]`                                                                                                                                    | el bloque `Ready to watch`                                                                                                             |
| `PUT` y `DELETE /api/follows/:raceKey`         | (escritura)         |                                                                  | `{ following: boolean }`                                                                                                                                                                  | la ★                                                                                                                                   |
| el resto de GET                                | la que diga su fila |                                                                  | igual que hoy, cortado por el horizonte                                                                                                                                                   | §7.3                                                                                                                                   |

Se mantiene `:raceId` + `?season=` y no `raceKey` en la ruta pública para no cambiar las URL de hoy; `?season=` arregla de paso que una etapa de la temporada anterior no se pueda abrir (mapa 02 §4).

### 10.3 Presupuesto de peso

| Qué                                | Hoy (medido)                                                              | Con esta propuesta                                                             | Presupuesto (B6)   |
| ---------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------ |
| `stage_snapshots.radio` en JSON    | 148-149 KB llana, 229-310 KB reina (`medir.mjs`); 102-514 KB (mapa 07 §7) | +id y tS 14-34 KB, +`g` 31-33 KB, +catálogo 6,6 KB, +percances ≤ 1 KB (medido) | ≤ 600 KB por etapa |
| un tramo de 20 km                  | no existe                                                                 | 21-34 KB de JSON, 1,2-2,9 KB gzip (medido, km 60-80, sin catálogo)             | ≤ 60 KB            |
| primer tramo con catálogo          | no existe                                                                 | unos 45-70 KB de JSON (estimado: tramo más 176 rótulos de 150-200 B)           | ≤ 100 KB           |
| la etapa entera vista              | 0,95-2,16 MB en una respuesta (mapa 02 §7)                                | 9-10 tramos, unos 250-400 KB de JSON (estimado)                                |                    |
| `GET …/stages/:day` con compresión | 871-2.949 KB sin comprimir; 22-100 KB gzip (mapa 07 §7)                   | igual, servido con `@fastify/compress` desde el paso 0                         |                    |

La API no comprime hoy (no hay `@fastify/compress` en `apps/api/package.json`); añadirlo es el cambio más barato de todo E2 y el jugador solo nota que carga antes.

---

## 11. Lo que el motor tiene que guardar al correr la etapa, y lo que se deriva al leer

### 11.1 Paso 4: cuatro cosas que el motor ya tiene y tira (sin subir versión)

```ts
// packages/engine/src/sim/raceRadio.ts: todo OPCIONAL; lo de hoy no cambia de forma ni de orden.
export interface StoredRadioGroup {
  // …los campos de hoy (l. 497-572)…
  /** El id del motor: identidad del grupo de un punto al siguiente. Ausente antes del paso 4. */
  id?: string
  /** Reloj del grupo en este punto, s desde la salida, a la décima. Ausente antes del paso 4. */
  tS?: number
}
export interface StoredRadioKm {
  // …km, groups, racing, gone…
  /** Carácter j = posición (alfabeto `RADIO_GROUP_ALPHABET`) del grupo de `field[j]`; '.' = ya no corre. */
  g?: string
}
export interface StoredRaceRadio {
  // …starters, riders, kms…
  /** Todos los que tomaron la salida, en orden de dorsal. Indexa `g` e `incidents`. */
  field?: readonly string[]
  /** Los percances con su corredor (hoy solo se ven como `mishap` del grupo, sin nombre). Sin días de baja. */
  incidents?: readonly { r: number; km: number; tipo: Incident['tipo']; lostS: number }[]
  /** Crono: salida y reloj propio en cada km de cada corredor, en décimas, como cadena por corredor. */
  tt?: {
    field: readonly string[]
    startS: readonly number[]
    atKm: readonly number[]
    t: readonly string[]
  }
}
export function radioForStorage(
  radio: RaceRadio,
  watch?: ReadonlySet<string>,
  priority?: readonly string[],
  /** Nuevo, opcional: el campo en orden de dorsal. Sin él, no se escriben `field` ni `g`. */
  field?: readonly string[],
  /** Nuevo, opcional: los percances, para guardarlos con su corredor (sin severidad ni días de baja). */
  incidents?: readonly Incident[],
): StoredRaceRadio
```

`stageRun.ts` pasa el campo ordenado por dorsal (tiene `input.riders[].bib`; `simulateStage` reordena su copia por id, `simulate.ts` l. 1257-1262, así que el orden no puede salir del motor) y los `incidents`, que ya entrega a la radio (l. 586-590). La crono gana el método opcional `StageProbe.onTimeTrial` (§9), llamado al final de `simulateTimeTrial`.

**Por qué respeta cada frontera**:

- **Frontera 3** (`tactica.md` l. 246-249, 314-322): `StageOutput` no gana nada; lo nuevo va por la sonda, que es observación sellada («la radio no toca la carrera», `raceRadio.test.ts` l. 748-799, huella `puesto:id:tiempo` idéntica con y sin sonda). Es el mismo camino que §9.8e usó para `pullFor` (l. 8643: «cero campos nuevos, cero eventos nuevos»).
- **`ENGINE_VERSION` no sube**: ni un segundo de ninguna carrera cambia. Es la doctrina escrita tres veces: `radioMaxKmh` (`balance.md` l. 16707-16710), la v85 (l. 16319-16323) y la siguiente (l. 16604-16606). Y tiene un premio: mientras la versión no cambie, `checkReplay` sigue siendo fiel para las etapas ya corridas con la v89.
- **La foto por km y `pullFor` no se tocan**: el colector sigue recibiendo el mismo `SnapshotRider` y `stageRun` sigue envolviendo la sonda para `trabajaronParaOtro` (l. 527-535), de donde bebe `raceLearning`.
- **El microscopio no se rompe**: `scripts/race-radio.mjs` pinta la `RaceRadio` completa, que no cambia; `buildRaceRadio` valida lo guardado con un `z.object` sin `.strict()` (`chronicle.ts` l. 1257), así que las claves nuevas se ignoran hasta que alguien las lea.

### 11.2 Paso 11: lo único que exige cambiar sucesos (sube versión, opcional)

- `breakaway_formed` y `break_cooperation` ganan `datos.knownKm` y `datos.knownS` (el bloque en que la fuga se confirma); arregla la fecha trucada (a) sin derivarla de la radio.
- `sprint_intermediate` y `climb_kom` ganan `datos.p2Id`, `datos.p3Id` y `datos.pts` (`'20,15,12'`): el podio de cada volante y cada cima que enseña la tele (mapa 06 §3.1). Los `…Id` se resuelven solos a mención (`chronicle.ts` l. 303-313).
- Sube `ENGINE_VERSION` porque cambia el contenido de un suceso (precedente v73, `balance.md` l. 14036-14038). Antes del reinicio no cuesta nada que importe (mapa 04 §8); después, cada subida deja sin replay lo anterior. Sin este paso E2 funciona igual: la fuga se revela con la regla derivada de §3.6 y las pancartas enseñan solo al ganador, como hoy.

### 11.3 Lo que se deriva al leer y no se guarda nunca

El instante y la posición de cada grupo; la diferencia entre dos grupos cualesquiera (resta en el mismo punto); la tendencia; el nombre de cada fila; a quién se nombra; los rótulos, los maillots de la carretera y los títulos; la general virtual; el orden de salida y el mejor tiempo provisional de la crono; el perfil, los puertos y las volantes; la hora de revelado; la crónica en vivo y el acta. Todo es función pura de lo guardado más la base, y cambiarlo es un despliegue, no una versión del motor.

---

## 12. Constantes

Las de E2 **no son constantes de juego**: no cambian una carrera. Viven en `BROADCAST`, en `packages/shared/src/broadcast.ts`, que leen la API y la web, como hoy viven junto a su código `NAMED_IN_SUMMARY` (`stageJournal.ts`), `SIT_UP_WINDOW_KM` (`chronicle.ts` l. 254) y `STALE_TIME` (`queryClient.ts`). Ponerlas en `packages/engine/src/constants.ts` haría que cada ajuste de ritmo disparase los ocho tramos de bancos del CI (mapa 07 §4). Las dos de almacenamiento van en `raceRadio.ts`, junto a `STORED_PULLERS_MAX` (l. 591).

| Constante                                  | Valor                                                         | Intención                                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `BROADCAST.chunkKm`                        | 20                                                            | un tramo son unos 25 s de pared en rodaje a ×1 y 21-34 KB de JSON (medido); es también lo más que se adelanta el servidor |
| `pace.cruise`                              | 1,2 s/km                                                      | la hora muerta pasa a unos 1:65, dentro de lo que hace un resumen (mapa 06 §5.4)                                          |
| `pace.climb`                               | 3,0 s/km                                                      | un puerto se ve subir; `pace.climbLeadInKm` = 2 km antes del pie                                                          |
| `pace.approach`, `approachKm`              | 3,0 s/km desde 40 km                                          | la aproximación, cuando se colocan los equipos                                                                            |
| `pace.final`, `finalKm`                    | 12 s/km desde 10 km                                           | cerca del 1:5 del final televisado                                                                                        |
| `pace.lastKm`                              | 40 s                                                          | el último km casi a tiempo real                                                                                           |
| `pace.ttEarly`, `ttLate`, `ttLateStarters` | 120 y 30 s de carrera por s de pared; los 20 últimos en salir | la primera hora de crono es anónima; la última es la general                                                              |
| `speeds`                                   | 0,5 · 1 · 2 · 4                                               | cuatro velocidades y ninguna más                                                                                          |
| `cardHoldMs`                               | 4.000                                                         | lo que dura un suceso en pantalla; no para el reloj (así la duración no depende de lo que pasa)                           |
| `trendWindowKm`, `trendDeadbandS`          | 5 km, 5 s                                                     | «y si sube o baja»: flecha solo si la diferencia se mueve más de 5 s en 5 km                                              |
| `virtualGcEveryS`, `virtualGcMinGapS`      | 300 s de carrera, 30 s                                        | la UCI da las diferencias generales cada 3-5 min (mapa 06 §1.1)                                                           |
| `namedGcTop`, `gcThreatMaxS`               | 10, 300 s                                                     | a quién se nombra en el pelotón y quién es «amenaza» en el titular de una fuga                                            |
| `headlineMaxNames`                         | 3                                                             | R23.4: tres nombres y la cuenta                                                                                           |
| `progressEveryS`                           | 10 s de pared                                                 | cada cuánto manda la web su punto                                                                                         |
| `staleRevealGameDays`                      | 28                                                            | un seguimiento olvidado no congela el mundo más de 7 días reales                                                          |
| `RADIO_GROUP_ALPHABET` (motor)             | `0-9a-zA-Z`                                                   | 62 grupos por punto; medido un máximo de 19                                                                               |
| `RADIO_CLOCK_DECIMALS` (motor)             | 1                                                             | el reloj guardado a la décima: 0,1 s sobra para situar un grupo a 1 km                                                    |

---

## 13. Bancos y tests

| Banco                        | Qué afirma                                          | Cómo                                                                                                                                                                                                                                                                                                                                                                                                 | Dónde corre                                                            | Listón                                                                  |
| ---------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **B1 canario**               | nada de una etapa no vista sale del servidor        | PGlite: carrera con 3 etapas corridas, jugador que la sigue con `seenThrough` 1; la etapa 2 deja fichas únicas (tiempo 31.337 s, premio 424.242, noticia, fila de palmarés, 777 puntos); se piden TODAS las rutas del registro de `onRoute` con parámetros de una tabla (una ruta sin fila en la tabla hace fallar el test) y se buscan las fichas en cada JSON, en `stageReadyEmail` y en el título | `apps/api`, rápida                                                     | 0 apariciones                                                           |
| **B2 estado contra sucesos** | los sucesos y la foto dicen lo mismo                | por cada `front_group`, `time_gap`, `breakaway_formed`, `breakaway_caught` y `peloton_split`, tamaño, hueco y protagonistas contra el punto siguiente (con `g`)                                                                                                                                                                                                                                      | `packages/engine/src/sim/`, bancos                                     | se mide primero y se sella lo medido: no nace en rojo                   |
| **B3 rótulo**                | cada escapado lleva rótulo                          | todo miembro de un grupo de 12 o menos está en `named` con su `RiderCard`; en uno mayor, todo maillot y todo top 10 de salida                                                                                                                                                                                                                                                                        | `apps/api`, rápida, sobre fixtures con `g` (se generan tras el paso 4) | 100 % (hoy 47-64 % fuera del pelotón en reina, mapa 01 §2.3)            |
| **B4 re-render**             | la noticia se redacta igual desde `seed + data`     | `renderNewsItem` contra `text` de las filas con ambos; goldens por tipo                                                                                                                                                                                                                                                                                                                              | `packages/shared` y `packages/db`                                      | igualdad exacta                                                         |
| **B5 estabilidad**           | añadir una redacción no reescribe el pasado         | huella de todas las líneas (Report y ticker) de las 5 etapas fijadas                                                                                                                                                                                                                                                                                                                                 | `apps/web`                                                             | huella fija; se re-sella con causa escrita                              |
| **B6 tamaño**                | cabe en su presupuesto                              | 24 etapas del calendario (las del mapa 07 §7): radio guardada, tramo y primer tramo                                                                                                                                                                                                                                                                                                                  | `sim/` para la radio guardada; `apps/api` para los tramos              | 600, 60 y 100 KB de JSON                                                |
| **B7 cobertura**             | toda plantilla que el motor emite se enseña         | lista de plantillas de `simulate.ts` y `timetrial.ts` contra los `case` de `stageJournal.ts` y la tabla plantilla → `OverlayKind` (o marca explícita `ticker-only`)                                                                                                                                                                                                                                  | `apps/web`, rápida                                                     | 0 huecos; hoy fallan `puncture`, `mechanical`, `truce_*` (mapa 01 §3 c) |
| **B8 cliente**               | parsear un tramo es barato                          | `JSON.parse` + `safeParse` del mayor tramo de B6                                                                                                                                                                                                                                                                                                                                                     | `apps/web`                                                             | < 5 ms en Node (hoy la etapa entera: 7-34 ms, mapa 07 §7)               |
| **P prefijo**                | la crónica en vivo nunca borra ni cambia lo contado | `live(t)` prefijo de `live(t + 30)` en las 5 etapas fijadas como JSON en `apps/api/src/__fixtures__/` (congeladas: no dependen de la versión del motor)                                                                                                                                                                                                                                              | `apps/api`, rápida                                                     | 0 (medido 0 en 15 corridas, §8.2)                                       |
| **R futuro**                 | lo pintado no depende de lo que aún no pasó         | `stateAt(t)` idéntico al añadir puntos con todo `tS > t`; `playbackS` idéntico con cualquier conjunto de sucesos                                                                                                                                                                                                                                                                                     | `apps/web`, rápida                                                     | igualdad                                                                |
| **S sonda en crono**         | observar la crono no la cambia                      | huella con y sin `onTimeTrial`                                                                                                                                                                                                                                                                                                                                                                       | `packages/engine`, bancos                                              | igualdad                                                                |
| **T no adelanta**            | el servidor no sirve más de un tramo por delante    | con `watchedKm` 40: `from=60` da 409 y `from=40` da un tramo que acaba en el 60                                                                                                                                                                                                                                                                                                                      | `apps/api`, rápida                                                     | exacto                                                                  |

**Se re-sellan a propósito**, con la causa escrita en el test: `newsFeed.test.ts` l. 32-44 (`raceOfHeadline` muere), `world/news.test.ts` y `db/abandon.test.ts` l. 232-237 (el texto se comprueba renderizando), las variantes fijadas de `stageJournal.test.ts` al cambiar la semilla (paso 12) e `index.test.ts` l. 465 en el paso 11. **Siguen en verde sin tocarlos**: `raceTimeline.test.ts` l. 120-128 (el buscador casa con lo que llega, y lo oculto no llega: el corte es del servidor), «la radio no toca la carrera», `checkReplay`, `coherence.test.ts`, `journal.test.ts`, todo `chronicle.test.ts` (el modo vivo es una opción nueva), `leaderJerseys` y `stageTables` (`JerseyKind` no crece) y `sim/raceRadio.test.ts` l. 174-728 (los campos nuevos son opcionales y los viejos no cambian).

---

## 14. Plan por pasos, tests primero

Coste por PR medido en el CI de hoy (mapa 07 §4): `typecheck` 37 s y `test:rapido` unos 9 min en todo PR; los que tocan `packages/engine/` suman los ocho tramos de bancos, unos 73 min según `ci.yml`. Tamaño: S hasta 300 líneas de diff, M hasta 800, L más.

| Paso | Qué                                                                                                                                                    | Tests primero                                                                                                               | PR                     | ¿Motor?         | Visible                       | Se revierte con                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ---------------------- | --------------- | ----------------------------- | ------------------------------------ |
| 0    | Red y compresión: contratos de `stageReplaySchema` y noticias en `contracts.test.ts`, inventario de rutas, línea base de B6, `@fastify/compress`       | los contratos que faltan (mapa 07 §5.2, punto 5)                                                                            | 1 S                    | no              | carga más rápida              | quitar el plugin                     |
| 1    | Crónica en vivo (`live`, `revealS`)                                                                                                                    | P con 5 etapas fijadas                                                                                                      | 1 S                    | no              | nada                          | nadie la llama                       |
| 2    | Ruta `…/broadcast` con lo guardado hoy (reloj estimado, `named` filtrado, rótulos de líder y equipo)                                                   | contrato de `broadcast.ts`, T sin sesión, B6 de tramo                                                                       | 1 M                    | no              | nada                          | nadie la llama                       |
| 3    | **Watch en la web**: `domain/broadcast.ts` (`stateAt`, ritmo, nombres de fila) y la pantalla                                                           | R; render estático de capa fija, barra y tarjeta                                                                            | 2 M                    | no              | solo `BROADCAST_WATCH=admins` | el interruptor                       |
| 4    | El motor guarda lo que tira (`id`, `tS`, `field`, `g`, percances, crono)                                                                               | casos nuevos en `sim/raceRadio.test.ts` (la cuenta de `g` por grupo es `size`; `tS = headS + gapS` a ±0,1; `id` estable), S | 1 M                    | sí, sin versión | nada                          | revertir el PR; lo escrito se ignora |
| 5    | Retransmisión exacta y crono (reloj guardado, continuidad, composición completa, `Your rider`)                                                         | B3 al 100 %, hot seat contra `results`                                                                                      | 1 M                    | no              | solo admins                   | el interruptor                       |
| 6    | Noticias con datos (`0043`, `renderNewsItem` en `shared`, `raceOfHeadline` fuera)                                                                      | B4; migración dos veces en CI                                                                                               | 1 M                    | no              | nada: mismo texto             | el código; la migración es inerte    |
| 7    | Visto (`0044`), vistas y seguidas, la etapa cerrada                                                                                                    | T con sesión; `stageHidden` en la ruta de etapa                                                                             | 1 M                    | no              | `SPOILER_MODE=admins`         | `SPOILER_MODE=off`                   |
| 8    | **El horizonte en toda la API**: tipo, predicado, registro obligatorio, mecanismos A a F                                                               | B1 en rojo primero (lista las fugas de hoy) y en verde al cerrar                                                            | 2 L (8a: A-C; 8b: D-F) | no              | `admins`, luego `on`          | `SPOILER_MODE=off`, sin desplegar    |
| 9    | La web del sin destripe: `Ready to watch`, avisos, previa y órdenes, `/report`, `usePageTitle`, `Story` pasa a `Report`, cachés invalidadas al revelar | test contra `document.title`; render de los avisos                                                                          | 2 M                    | no              | con los interruptores         | los interruptores                    |
| 10   | Rótulos completos: `wornKit`, `championTitles` provisional, icono de equipo, `breakHeadline`                                                           | `jerseys.test.ts` ampliado (no re-sellado), titular del caso de §6.5                                                        | 1 M                    | no              | con Watch                     | el código                            |
| 11   | Sucesos bien fechados y podios (opcional); se borra `renderNews` del motor                                                                             | `knownS` y podios en tests del motor; `index.test.ts` re-sella la versión                                                   | 1 S                    | sí, sube        | podios en volantes y cimas    | no se revierte: se deja de leer      |
| 12   | Semilla neutra de la crónica y cierre: B5, `narrate` muerto fuera, documentos                                                                          | B5 re-sellado una vez                                                                                                       | 1 S                    | no              | nada                          | el código                            |

**Orden y dependencias.** 0 → 1 → 2 → 3 es la columna de la sensación; 4 se puede hacer en paralelo con 3 y alimenta 5; 6 y 7 en paralelo con 4 y 5; 8 exige 6 y 7; 9 exige 8; 10 después de 2; 11 cuando se quiera, antes del reinicio; 12 al final. Son unos 16 PR, de ellos dos que pagan bancos.

**El primer paso que ya le da al dueño la sensación de sentarse a ver la etapa es el 3**, justo después de los dos PR de API de los pasos 1 y 2, sin motor ni base: abre una etapa de producción, pulsa play y ve la capa fija, la barra de grupos, el perfil y los sucesos a su hora, con la crónica en vivo debajo. Con reloj estimado y sin continuidad de grupos, que llegan con el 4 y el 5. **El primero que cierra el destripe de verdad es el 8** (8b), porque es el que pone el canario B1 en verde sobre todas las rutas; el 7 ya cierra la pantalla de la etapa, pero no la portada, el feed ni el ranking.

**Encendido.** `BROADCAST_WATCH=admins` desde el 3 (el dueño lo usa y caza defectos como con la radio); `SPOILER_MODE=admins` desde el 7; los dos a `on` cuando el 9 esté dentro y B1 en verde. Mientras tanto, `main` lleva el código entero y el jugador ve la web de siempre, salvo que carga antes.

**Qué se hace si algo sale mal.** Un defecto de pantalla se apaga con `BROADCAST_WATCH`; uno de destripe o de rendimiento del horizonte, con `SPOILER_MODE=off`, sin desplegar. Las migraciones solo añaden columnas nullable y dos tablas: son inertes si el código no las lee. El paso 4 se revierte como cualquier PR y deja datos opcionales que nadie lee. Solo el 11 es irreversible, y por eso es opcional y va antes del reinicio.

---

## 15. Riesgos y fronteras

### 15.1 Riesgos, con su defensa

1. **La táctica mueve el motor a la vez** (la v89 de hoy vino de la v66 en unas semanas, mapa 01 §6). El paso 4 toca `raceRadio.ts`, que R23.7 también quería tocar: se hace pequeño y aditivo, y R23.7 queda resuelto sin tocar la lista de seguimiento, porque con `g` se sitúa a cualquier corredor.
2. **Plantillas nuevas de la táctica** (R23.8 `card_changed`, mapa 01 §6): hoy caerían al `default` que imprime la clave (`stageJournal.ts` l. 1602-1603). B7 falla en cuanto el motor emita una plantilla sin redacción ni `OverlayKind`, y obliga a darle una antes de fusionar.
3. **El coste del horizonte**: una consulta por petición autenticada más un `exists` por fila. Hay índices por `game_day` en `rider_points` y `news`, y la `0043` añade `(world_id, race_key, stage_day)`. Se mide en el paso 8 con PGlite; si pesa, el conjunto oculto se materializa como CTE una vez por petición.
4. **`unnest` de dos listas en PGlite**: Postgres 18 lo admite; lo prueba el propio B1.
5. **La numeración de migraciones**: si otro documento toma la `0043`, `drizzle-kit` renumera; no hay SQL a mano.
6. **Pestañas abiertas con la web de ayer**: la ruta de etapa omite campos que ya son opcionales; ven pestañas vacías, no un error. Las rutas nuevas no las llama nadie hasta que la web nueva está servida.
7. **Saltar hacia delante con la regla del tramo**: la web hace el `PUT` antes del `GET` sin que el jugador lo note; el visitante no tiene regla.
8. **El reloj estimado** (paso 3, etapas anteriores al 4) sitúa mal los grupos sobre el perfil; lo dice la respuesta y desaparece con el reinicio.
9. **Móvil**: los anchos y el coste por fotograma son estimados sobre clases de Tailwind, no medidos en un navegador (la misma reserva del mapa 03 §7).
10. **Fugas residuales, dichas**: el presupuesto del equipo (16.8), `palmares.detail` y las notas del libro en inglés (E10), la salud de corredores de carreras que el jugador no sigue.

### 15.2 Fronteras

| Encargo                | Lo que E2 hace                                                                                                                                                                                   | Lo que deja                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| E3 · sistema visual    | qué se enseña y cuándo; usa los componentes de hoy (`LeaderJersey`, `Jersey`, `Flag`) y el chip de texto del campeón; hace cumplir «la API no manda lo que la pantalla no enseña» con los tramos | cómo se ve todo, la señal de campeón, el editor del maillot de equipo |
| E4 · cuenta y contacto | la propiedad «ningún aviso destripa» y la plantilla `stageReadyEmail` probada                                                                                                                    | cuándo se avisa, por dónde, con qué baja                              |
| E5 · transparencia     | cuenta la carrera                                                                                                                                                                                | cruzar la orden con lo hecho (R23.6)                                  |
| E6 · experiencia       | dos pestañas con nombre nuevo (`Watch`, `Report`), la ruta `/report` y el bloque `Ready to watch`                                                                                                | dónde viven en el menú                                                |
| E10 · multiidioma      | `news` con `seed` y `data` sin inglés, plantillas fuera del motor, semilla neutra, vocabulario de grupos como código (§8.5)                                                                      | las lenguas, `users.locale`, quién mantiene                           |
| E12 · calendario       | la interfaz `ChampionTitle` y `championTitles()` provisional                                                                                                                                     | la tabla de títulos, el Mundial, las selecciones                      |
| E13 · enciclopedia     | el horizonte también corta el palmarés y los récords                                                                                                                                             | las historias acumuladas del mundo                                    |
| Táctica                | R23.7 resuelto con `g`; R23.4 en el titular de la fuga; B7 vigila R23.8                                                                                                                          | el 17d (`last-race` sin re-simular): E2 solo lo tapa con el horizonte |

---

## 16. Decisiones que son del dueño

| #     | Decisión                                                        | Por defecto                                                                    | Consecuencia                                                                       |
| ----- | --------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 16.1  | ¿Watch por defecto también para el visitante sin cuenta?        | sí; `Report` a un toque                                                        | lo que se comparte para captar tiene que ser el enlace `/report`                   |
| 16.2  | ¿Qué carreras se siguen solas?                                  | las del corredor, las de su equipo, las abiertas en Watch y las marcadas con ★ | el resto del mundo se ve al día; seguir otra es un toque                           |
| 16.3  | ¿Se revela solo lo olvidado?                                    | sí, a los 28 días de juego (7 reales) de acabar la carrera, con aviso          | el mundo no se congela; quien vuelve a los dos meses ya no ve esas etapas en Watch |
| 16.4  | ¿La forma y la salud del corredor propio van al horizonte?      | sí: forma del parte hasta el corte, salud `Racing`                             | se planifica con la forma de antes de la etapa; ver o revelar la pone al día       |
| 16.5  | ¿Hay que ver la N para dar órdenes de la N+1?                   | no: aviso con tres salidas                                                     | quien tiene prisa ordena sin saber; nadie queda bloqueado                          |
| 16.6  | ¿Delegación de maillots con campeones como la UCI?              | sí, cuando existan títulos                                                     | hoy no cambia nada; con E12, el verde puede pasar al tercero                       |
| 16.7  | ¿Dorsal amarillo del equipo líder en el rótulo?                 | no, como en la crónica (`navegacion.md` §7.4)                                  | el equipo líder sigue solo en las tablas                                           |
| 16.8  | ¿Presupuesto del equipo al horizonte?                           | no: el de hoy                                                                  | fuga residual pequeña; cerrarla pide un libro de equipo y otra migración           |
| 16.9  | ¿Correo de «lista para ver» en E2?                              | no: plantilla lista, envío de E4                                               | nadie recibe correo de juego hasta E4                                              |
| 16.10 | ¿Duración por defecto?                                          | ×1, unos 6-8 min                                                               | una etapa se ve en lo que dura un resumen; ×2 la deja en 3-4                       |
| 16.11 | ¿Descuelgues sueltos en la crónica en vivo?                     | solo de corredores con rótulo; los racimos, en Report                          | la regla B3 del dueño se cumple con la cuenta del grupeto                          |
| 16.12 | ¿Paso 11 (subir versión por la fuga bien fechada y los podios)? | sí, antes del reinicio                                                         | podios en volantes y cimas; una subida de versión más                              |
| 16.13 | ¿Se deja de escribir `news.text` tras el reinicio?              | sí: solo `seed` y `data`                                                       | E10 traduce todo el feed desde el primer día del mundo nuevo                       |
