## 6. El estado en pantalla: lo permanente y lo eventual

Esta sección dice qué pinta `Watch` (pantalla) en cada fotograma y con qué dato: lo permanente, que está siempre y sale del instante (`Instant`, §4.5), y lo eventual, la cola de rótulos (`Cue`, §4.9), que entra y sale sin frenar nunca la carrera. Escribe como hechos nueve decisiones cerradas (D-03, D-14, D-17, D-18, D-21, D-22, D-27, D-48 y D-59) y decide lo que dejan abierto en los bloques del final. Los tipos son los de §4 y aquí solo se citan; las constantes son las de §15 y se nombran con su valor la primera vez. El ritmo, los mandos, la previa y el cierre por dentro son §8; la regla del maillot y el rótulo de corredor, §7. Las líneas de código son las de HEAD `9c21885`, comprobadas en `3fbd828`, que solo añade `docs/diseno/`. Las cifras nuevas de esta sección las ha medido su redactor en el scratchpad con el `dist` del motor v89 y el banco común de L1 (`l1/banco.mjs`, el campo de `scripts/race-radio.mjs`): `l4/instante.mjs` (el instante de §6.1) y `l4/bunch.mjs` (§6.3).

### 6.1 La pantalla `Watch` de arriba abajo

El instante que se dibuja es el de §3.3: `race-france` e18 (reina, 185 km), semilla 0, a las 2:09:00 de carrera. Son medidos la estructura, los tamaños, los huecos, los km y quién tira (`l1/ejemplo.mjs` y `l4/instante.mjs`, con la foto en cada bloque y la radio de producción por índice, D-08). Son inventados los nombres de corredores y equipos (el banco los llama `rq-<equipo>-<n>`) e ilustrativos los maillots y la línea del rótulo, porque el banco corre la etapa suelta, sin general de salida (`gcDeficitSeconds` 0 para todos). La cabeza, tres corredores, va por el km 86,51 subiendo la Côte de Monteynard (2.ª, pie en el km 83,2, cima en el 92; nombre de `STAGE_FEATURES`, `packages/engine/src/routes/stageFeatures.ts`); el pelotón, 124, está en el km 84,97; tres corredores se descuelgan del pelotón y aún no han llegado al grupo de detrás (§3.3, punto 4).

En un teléfono de 360 × 800 px, el caso principal (mapa 03 §7), con `BottomNav` escondido mientras se reproduce (propuesta a E6, §18.6):

```
(pantalla · Watch · 360 px · 2:09:00 de carrera)
┌──────────────────────────────────────────────┐
│ 98.5 km to go              +3:46 ▲ on the bunch│  FixedOverlay, 40 px
├──────────────────────────────────────────────┤
│  ▁▁▂▅▇▆▃▁▁▂▃▄▅①②③ ④         ▂▃▅▆▇█            │  ProfileStrip, 56 px
│  Côte de Monteynard · Cat. 2 · summit in 5.5 km│
├──────────────────────────────────────────────┤
│ 1  MORENO · LEROY · KAHN                       │  GroupBar, 4 filas de 32 px
│ 2  VOSS · SILVA · EKDAL                 +0:20  │
│ 3  NOWAK · BRANDT                       +0:40  │
│ 4  BUNCH · 124          [GC] [PTS]      +3:46  │
│    Pulling: Team Rho, Team Kappa (for 107 A. ROSSI) +4 teams
│    ↓ 3 dropping back                           │
│    +3 groups · 41 riders                   ▾   │
│ Your rider · in the bunch · +3:46              │
├──────────────────────────────────────────────┤
│ 15 N. MORENO · ESP · Team Alpha                │  CueCard, 72 px
│ 14th overall +4:02                             │
├──────────────────────────────────────────────┤
│ Voss, Silva and Ekdal chase at 20 seconds.     │  VoiceTicker, 24 px
├──────────────────────────────────────────────┤
│ ❚❚   ×1   Next action   Commentary          ⋯  │  PlayerControls, 48 px
│ ├───────────────●──────────────────────────┤   │  (barra en km: 86,5 de 185)
└──────────────────────────────────────────────┘
```

En escritorio (desde 1.024 px) cabe todo a la vez en dos columnas: a la izquierda, la capa fija con su segunda línea siempre abierta (`2:09:00 · 22.9 km/h · 5.0% · 21°C`), el perfil a todo el ancho y la barra con TODAS sus filas y su línea de quién tira; a la derecha, el rótulo arriba y debajo `Commentary` (pantalla) desplegado, con las líneas de la voz ya dichas; los mandos, abajo a lo ancho.

```
(pantalla · Watch · escritorio)
┌──────────────────────────────────────────────────────────┬──────────────────────────────────┐
│ 98.5 km to go                     +3:46 ▲ on the bunch   │ 15 N. MORENO · ESP · Team Alpha  │
│ 2:09:00 · 22.9 km/h · 5.0% · 21°C · ▲ 0:24 in 5 km       │ 14th overall +4:02               │
├──────────────────────────────────────────────────────────┼──────────────────────────────────┤
│ ▁▁▂▅▇▆▃▁▁▂▃▄▅①②③ ④ ⑤ ⑥    ⑦      ▂▃▅▆▇█                  │ Commentary                       │
│ Côte de Monteynard · Cat. 2 · 8.8 km at 5.0% · summit in 5.5 km │ km 62  Moreno, Leroy and Kahn…│
├──────────────────────────────────────────────────────────┤ km 81  Voss, Silva and Ekdal…    │
│ 1  MORENO · LEROY · KAHN                                  │ km 84  Team Rho take up the work…│
│    Pulling: all 3 in turn                                │                                  │
│ 2  VOSS · SILVA · EKDAL                           +0:20  │                                  │
│ 3  NOWAK · BRANDT                                 +0:40  │                                  │
│ 4  BUNCH · 124                [GC] [PTS]          +3:46  │                                  │
│    Pulling: Team Rho, Team Kappa (for 107 A. ROSSI) +4 teams │                                  │
│    ↓ 3 dropping back                                     │                                  │
│ 5  GRUPPETTO · 35                                 +4:16  │                                  │
│ 6  GRUPPETTO · 5                                  +8:45  │                                  │
│ 7  M. DUVAL                                      +13:23  │                                  │
│ Your rider · in the bunch · +3:46                        │                                  │
├──────────────────────────────────────────────────────────┴──────────────────────────────────┤
│ ▶/❚❚   ×½ ×1 ×2 ×4   Next action   −5 km   +5 km   Next climb   Final 20 km   Last km   ⋯   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

Los componentes viven en `apps/web/src/components/broadcast/` (§G.2) y la página en `apps/web/src/pages/StageWatch.tsx`. Ninguno lleva lógica de velo: pintan lo que les da el reproductor (`apps/web/src/domain/broadcast/player.ts`, §8.2), que solo tiene lo servido (D-06).

| Pieza (pantalla) | Componente | Lo que pinta | Dato (§4) | Repinta |
| --- | --- | --- | --- | --- |
| capa fija | `FixedOverlay` | km a meta, diferencia principal, tendencia y contra quién; al tocarla, reloj, velocidad, pendiente y tiempo | `Instant.toGoKm`, `lapsToGo`, `mainGap`; `t`; `GroupNow.detail.speedKmh` de la cabeza; `ProfileStrip.altM`; `StageWeather.spans` | `BROADCAST.overlayHz` (10) |
| perfil con cursores | `ProfileStrip` | la altimetría, los puertos, las volantes, un cursor por grupo y el puerto que viene | `ProfileStrip` (cabecera), `GroupNow.km`, `number`, `own` | `BROADCAST.barHz` (4) |
| barra de grupos | `GroupBar` | una fila por grupo con número, nombre, tamaño, hueco, maillots, quién tira, los que van en tránsito y el corredor propio | `Instant.groups`, `inTransit`; `RiderCard` del reparto | `barHz` |
| el plano | `CueCard` | el rótulo del momento, uno a la vez | la cola de `Cue` (§6.5) | al entrar y salir un `Cue` |
| la voz | `VoiceTicker` | la última línea dicha; `Commentary` despliega las anteriores | `LiveLine` con `revealS ≤ t` (§12.2) | al entrar una línea |
| mandos | `PlayerControls` | pausa, velocidad, `Next action`, saltos, `Commentary`, la barra de progreso en km y `Show result` en el menú | el reproductor (§8.5) | a cada toque |
| previa y cierre | `StagePreviewCards`, `StageClosingCards` | los cuadros de antes de la salida y de después de la meta | `StagePreview`, `StageClosing` (§6.11, §8.6) | por cuadro |
| puerta | `StageGateCard` | lo que sale en lugar de la etapa velada | `StageGate` (§11.12) | una vez |

El componente `ProfileStrip` y el tipo `ProfileStrip` de §4.2 comparten nombre por el glosario; el fichero del componente importa el tipo con alias (`import type { ProfileStrip as ProfileData } from '@cyclingstar/shared'`), como §4.1 hace con `Block`. Alturas en el teléfono, estimadas sobre las clases de hoy y sin medir en un navegador (la misma reserva del mapa 03 §7): 40 + 56 + 4 × 32 + 3 × 20 + 72 + 24 + 48, unos 430 px de 800; lo mide a mano el paso 10 (§18.5).

### 6.2 Lo permanente

D-17, escrito como hecho. Son permanentes la capa fija (km a meta de la cabeza, en metros dentro del último km y en vueltas si `laps > 1`, y la diferencia principal con su tendencia), la barra de grupos (hasta `BROADCAST.mobileGroupRows`, 4, filas en el móvil y `+N groups` para el resto, pantalla), el perfil con un cursor por grupo y el puerto que viene, y `Your rider · in the bunch · +2:14` (pantalla) si el espectador corre. Eventual es la cola de rótulos (D-21, §6.5). Es la jerarquía que la UCI exige por escrito al productor de la señal: «distance remaining to the finish and main time gap. This overlay should be permanently viewed on screen» (pliego de organizadores, §11.2, mapa 06 §1.1), más la capa de posiciones numeradas; y es la lista que el dueño dio como norte ([DUEÑO 1], `docs/agenda.md` l. 510-515: cuánto queda, «2' 14" y si sube o baja», quién va en cada grupo, dónde estamos del perfil, el rótulo del momento y «Nada más»). A ×60, que es el ritmo de la hora muerta (§8.2), un km de carrera pasa en poco más de un segundo de pantalla: por eso la barra es permanente y no un cuadro que se abre de vez en cuando (`estado.md` §4).

**La capa fija** (`FixedOverlay`, pantalla). Dos números a la izquierda y a la derecha, y contra quién:

- A la izquierda, los km a meta de la cabeza (`Instant.toGoKm`, que es la longitud menos el km pintado del grupo número 1): `98.5 km to go`, con un decimal. Dentro del último km, en metros redondeados hacia abajo a la decena: `850 m to go`. En un circuito (`ProfileStrip.laps > 1`), las vueltas delante: `3 laps to go · 42.5 km`, y en la última `Last lap · 8.2 km to go`.
- A la derecha, la diferencia principal (`Instant.mainGap`): `+3:46`, en minutos y segundos (`+1:02:10` desde la hora); por debajo de `BROADCAST.sameTimeS` (5 s de carrera), `s.t.`; con un solo grupo en carrera (`mainGap` nulo), `Bunch together`. Detrás, la flecha de la tendencia (`MainGap.trend.arrow`): `▲` si el hueco crece al menos `BROADCAST.trendMinS` (5 s) en los últimos `BROADCAST.trendWindowKm` (5 km), `▼` si baja lo mismo, nada si se mueve menos. Y contra quién, con la palabra de voz del grupo de detrás (§6.3): `on the bunch`, `on the chase group`, `on the race leader’s group`, `on CARTER` (un grupo de tres o menos se nombra por sus apellidos). La tele enseña solo el número, pero «sobre quién» es una de las cuatro preguntas del dueño ([DUEÑO 4]; «quién va delante, con cuánta ventaja, sobre quién y cuánto queda», `docs/balance.md` l. 6000-6002, v27) y la causa madre de aquel diario ilegible fue que «se medía contra el grupo equivocado» (l. 6004): la referencia se dice.
- Al tocarla en el móvil (en escritorio, siempre abierta), una segunda línea con lo que la UCI pide «regularly and systematically displayed» (mapa 06 §1.1, punto 5): el reloj de carrera `2:09:00` (es `t`), la velocidad de la cabeza en su último km de foto (`GroupDetail.speedKmh`; si es nula, no se escribe), la pendiente del km en que va (`ProfileStrip.altM`: la cota del km siguiente menos la de este, entre 10), la temperatura y, si toca, `rain` y `crosswind` del tramo del tiempo congelado en que va la cabeza (`StageWeather.spans`, D-14), y el detalle de la tendencia, `▲ 0:24 in 5 km`. En el ejemplo de §6.1 la tendencia es medida: el pelotón iba a 3:22 de la cabeza en el km 79 y a 3:46 en el 84 (`l4/instante3.mjs`), 24 s en 5 km.

La diferencia principal se calcula con `mainGapOf`, el paso 10 de `instantAt` (§4.5), que se escribe aquí entero:

```ts
// packages/shared/src/broadcast/instant.ts (privada de instantAt, exportada para sus tests). Pura.
import { BROADCAST } from './constants.js'
import type { GroupNow, MainGap } from './instant.js'
import type { StartState } from './wire.js'

/** LA DIFERENCIA PRINCIPAL de la capa fija (D-17). groups: los de Instant.groups, ya en orden de carretera y con su papel. */
export function mainGapOf(groups: readonly GroupNow[], start: StartState, markAt: (g: GroupNow, photoKm: number) => number): MainGap | null {
  if (groups.length < 2) return null                                    // un solo grupo: `Bunch together` (pantalla)
  const head = groups[0]!
  // «El pelotón» de D-17: el grupo con papel bunch; si ninguno llega a los dos tercios, el del título (decisión 6-b)
  const pack = groups.find((g) => g.role === 'bunch') ?? groups.find((g) => g.kind === 'peloton') ?? null
  let behind: GroupNow
  let ref: MainGap['ref']
  if (pack !== null && pack.g !== head.g) {
    behind = pack; ref = 'bunch'                                        // la fuga contra el pelotón
  } else {
    const top = new Set(start.gcTop.filter((r) => r.rank <= BROADCAST.mainGapTopStart).map((r) => r.rider))
    const jg = groups.slice(1).find((g) => g.jerseys.length > 0 || g.members.some((r) => top.has(r)))
    if (jg !== undefined) { behind = jg; ref = 'jersey_group' }         // el pelotón en cabeza: contra el primer grupo con un maillot o un top 3
    else { behind = groups[1]!; ref = 'second' }                        // si no hay ninguno, contra el segundo
  }
  const k = behind.gap.atKm                                             // el último km de foto que ha cruzado el de detrás (§3.5)
  // la resta de las dos marcas en ese km; si la cabeza nació después (3-e), markAt da la de su origen
  const gapS = Math.max(0, (markAt(behind, k)-markAt(head, k)) / 10)
  return { ahead: head.g, behind: behind.g, gapS, trend: behind.gap.trend, ref }
}
```

`markAt` es la marca en Ds del grupo en ese km de foto, con el respaldo del grupo de origen de la decisión 3-e cuando el grupo nació después; la tendencia de `MainGap` es la de §4.5 (la pareja de antecesores por la cadena de `successor`, y solo se reinicia si cambia la identidad de verdad), así que una fuga cazada que se funde con su cazador no deja la flecha a cero. `BROADCAST.mainGapTopStart` (3) es el top de salida que convierte en referencia a un grupo sin maillot. El hueco nunca es un reloj de corredor: es la resta de dos grupos en el mismo punto (D-01, punto 4).

**La barra de grupos** (`GroupBar`, pantalla). Una fila por grupo de `Instant.groups`, en orden de carretera: el número de carretera (`GroupNow.number`, que renumera y no es identidad, UCI §11.2), el nombre (§6.3), el tamaño detrás del nombre cuando el nombre es una palabra de papel (`BUNCH · 124`; con nombres propios el tamaño se ve), el hueco a la cabeza en su último km de foto (`GroupNow.gap.toHeadS`: `+0:20`; `s.t.` por debajo de 5 s; la fila 1 no lleva hueco), los iconos de los maillots de líder que viajan dentro (`GroupNow.jerseys`, con los componentes de hoy, `LeaderJersey`, `apps/web/src/components/Jersey.tsx` l. 90, que distinguen por forma además de por color, `docs/navegacion.md` l. 455-457) y la marca del espectador. Tocar una fila despliega el grupo: sus corredores nombrables con dorsal, bandera, equipo y maillot llevado (la política de a quién se nombra es §7.7) y la cuenta del resto, `+118 riders` (pantalla); así se contesta «quién va en cada grupo, con nombre y equipo, y cuántos son» sin veinte datos a la vez. Debajo de cada fila, dos líneas pequeñas si hay de qué: quién tira (§6.4) y los que van en tránsito desde ese grupo (`InTransit` con `from` en él): `↓ 3 dropping back` si su destino va detrás y `↑ 2 bridging across` si va delante (pantalla). Un corredor en tránsito no está en ninguna fila, y enseñarlo así es lo que la tele llama tierra de nadie: en el ejemplo, los tres que se descuelgan del pelotón en el km 84,95 pasan 25 s de carrera sin grupo (§3.3). En el móvil caben `mobileGroupRows` (4) filas, que se eligen en este orden y se pintan en el de carretera: la 1, la del pelotón, las del espectador, las que llevan un maillot y después las siguientes por orden de carretera; el resto se pliega en una línea, `+3 groups · 41 riders` (pantalla), que se abre al tocarla (decisión 6-c).

**El perfil con cursores** (`ProfileStrip`, pantalla; [DOC 2]: «La serie `t_s` por grupo permite al replay dibujar el cursor de cada grupo sobre la altimetría SVG», SPEC l. 596). La cota por km de la cabecera (`ProfileStrip.altM`) dibujada a todo el ancho, con los puertos sombreados y su categoría en la cima, las volantes con una marca y un cursor por grupo en su km del instante (`GroupNow.km`, que nunca vuelve atrás, D-04) con su número de carretera; el del espectador, resaltado. Debajo, siempre, el puerto que viene: si la cabeza va por él, `Côte de Monteynard · Cat. 2 · summit in 5.5 km`; si no, `Next: Côte des Terrasses · Cat. 3 · in 26.5 km` (pantalla), con los km que le quedan a la cabeza hasta la cima, el nombre de `ProfileStrip.climbs[].name` y, sin nombre, solo la categoría. El perfil no lleva ninguna marca de dónde pasa algo (§6.9). En el móvil, 56 px de alto; con `prefers-reduced-motion` los cursores saltan de km en km sin animarse (D-57).

**Tu corredor** ([DUEÑO 5]: el corredor propio se ve aunque no sea noticia; R23.7 de la táctica, «pero no dice quién es, wey», `docs/balance.md` l. 9594, v57). Una línea fija bajo la barra, `Your rider · in the bunch · +3:46` (pantalla), con la palabra de voz del grupo en que va (§6.3) y su hueco, que es el de su grupo en el último punto común (H-17; §3.5): nunca su reloj de foto, que suma deriva y marcaje (`simulate.ts` l. 9012). Si va en tránsito, lo dice: `Your rider · dropping back from the bunch · +3:46` o `Your rider · bridging to the lead group`, con el hueco del grupo que dejó (decisión 3-c). Si abandonó, `Your rider · out of the race`. Con varios corredores propios (el mánager de un equipo), una línea por papel: `Your team · 1 in front · 5 in the bunch · 2 in the gruppetto` (decisión 6-l). Sin corredor en la etapa, no hay línea.

| Lo permanente | Dato | Repinta | Qué lo pide |
| --- | --- | --- | --- |
| km a meta (metros en el último km, vueltas en un circuito) | `Instant.toGoKm`, `lapsToGo` | `overlayHz` (10) | UCI §11.2, capa fija; agenda l. 510 |
| diferencia principal, `s.t.` o `Bunch together` | `Instant.mainGap.gapS` | `overlayHz` | UCI §11.2, capa fija |
| tendencia `▲ ▼` | `MainGap.trend` | `overlayHz` | agenda l. 511, «y si sube o baja» |
| contra quién, `on the bunch` | `MainGap.behind` y su etiqueta | `overlayHz` | [DUEÑO 4], «sobre quién» |
| reloj, velocidad, pendiente, tiempo (al tocar; en escritorio, siempre) | `t`, `GroupDetail.speedKmh`, `altM`, `StageWeather` | `overlayHz` | UCI §11.2, punto 5 del mapa 06 §1.1; D-14 |
| barra de grupos numerada | `Instant.groups` | `barHz` (4) | UCI §11.2, capa de posiciones |
| quién va en cada grupo (al tocar la fila) | `GroupNow.members`, `RiderCard` | `barHz` | agenda l. 512; UCI «composition regularly» |
| quién tira | `GroupNow.detail.pullers` | `barHz` | [DUEÑO 1] vía D-27; C1-C6 del mapa 05 §2.3 |
| perfil con cursor por grupo y puerto que viene | `ProfileStrip`, `GroupNow.km` | `barHz` | agenda l. 513; SPEC l. 596 ([DOC 2]) |
| tu corredor | `InstantContext.own`, `GroupNow.own`, `inTransit` | `barHz` | [DUEÑO 5]; R23.7 |

Los dos ritmos de repintado son iniciales y sin evidencia de los jueces: los mide a mano el paso 10 en 360 × 800 con la CPU a ×4 y, si no llegan a 30 fotogramas por segundo, se baja `barHz` y se simplifica el perfil antes de encender (D-56, §18.5). El instante se calcula una vez por fotograma y lo leen todos los componentes: no hay dos relojes en la misma pantalla.

### 6.3 Las cabeceras de grupo

D-18, escrito como hecho: un solo código, `GroupRole` (`lead`, `chase`, `bunch`, `gruppetto`), más `GroupLabel` (`role`, `names` para tres o menos, `jersey_group`, `together`), que leen la barra, la radio servida, la voz y el acta (I-07, O-10). Las palabras son las de SPEC §6.15 (l. 604-614), que ya usan el journal (140 tests) y `GROUP_NOUNS` del motor (`packages/engine/src/sim/coherence.ts` l. 571): `the lead group`, `the chase group`, `the bunch`, más `Gruppetto` / `the gruppetto` (DD-04). Es la regla C7 del dueño: «Binario: o tiras o no tiras. Se acabó el tercer estado intermedio. Un solo concepto, con el mismo nombre, en el motor y en la Race Radio.» (`docs/balance.md` l. 6740-6741, v34). Hoy la barra de la radio usa siete nombres (`groupName`, `apps/web/src/components/RaceRadioPanel.tsx` l. 58-79) y la voz tres (`apps/web/src/domain/stageJournal.ts` l. 52-54): el mismo grupo se llama `Peloton` en una y «the bunch» en otra (mapa 05 §6, contradicción 7).

**El papel, sobre el instante.** `groupRoleOf` recibe los grupos del instante en orden de carretera, cada uno con su tamaño y su `kind` (el del motor, con el título de pelotón de ESE instante, §4.5 paso 7), y el número de los que corren. Usa las dos reglas del motor que D-52 copia en `BROADCAST` y ata por test: `bunchMinShare` (2/3, `PELOTON_MIN_SHARE`, `packages/engine/src/sim/raceRadio.ts` l. 91 y 97-99: «¿Es este grupo EL PELOTÓN, o solo lleva su etiqueta?») y `chaseMinShare` (0,5, `STAGE.gapChaseMainFraction`, `packages/engine/src/constants.ts` l. 2657), con la misma cuenta con que el motor elige contra quién mide el boquete (`chaseReferenceIndex`, `packages/engine/src/stage/group.ts` l. 235-245, llamada en `simulate.ts` l. 4122-4133):

```ts
// packages/shared/src/broadcast/instant.ts: el papel CRUDO de §4.5 paso 9 (la histéresis va encima). Pura.
import type { RadioGroupKind } from '../contracts.js'
import { BROADCAST } from './constants.js'
import type { GroupRole } from './instant.js'

/** Copia de chaseReferenceIndex (group.ts l. 235-245), atada por test (decisión 6-a). -1 si no hay nadie detrás. */
function chaseRefOf(behind: readonly { readonly size: number; readonly racing: boolean }[], mainFraction: number): number {
  if (behind.length === 0) return -1
  const pool = behind.filter((x) => x.racing && x.size >= 2)
  const candidates = pool.length > 0 ? pool : behind
  const biggest = candidates.reduce((mx, x) => Math.max(mx, x.size), 0)
  const chosen = candidates.find((x) => x.size >= biggest * mainFraction) ?? candidates[0]!
  return behind.indexOf(chosen)
}

/** EL PAPEL de cada grupo, en orden de carretera (D-18). road[i].kind === 'peloton' es el grupo con el título. */
export function groupRoleOf(road: readonly { readonly size: number; readonly kind: RadioGroupKind }[], racing: number): readonly GroupRole[] {
  if (road.length === 1) return ['bunch']                                  // un solo grupo: `Bunch together`
  const main = road.findIndex((x) => x.kind === 'peloton')
  const bunch = main >= 0 && road[main]!.size >= racing * BROADCAST.bunchMinShare ? main : -1
  // sin grueso, la persecución que el motor nombra «the chase group» tras una criba (simulate.ts l. 4122-4144)
  const ref = bunch >= 0 ? -1 : 1 + chaseRefOf(road.slice(1).map((x, j) => ({ size: x.size, racing: main < 0 || j + 1 <= main })), BROADCAST.chaseMinShare)
  return road.map((_, i): GroupRole => {
    if (i === bunch) return 'bunch'                                        // el título con dos tercios de la carrera
    if (i === 0) return 'lead'                                             // el primero de la carretera, si no es el grueso
    if (bunch >= 0) return i < bunch ? 'chase' : 'gruppetto'               // entre la cabeza y el grueso persigue; detrás, descolgado
    if (main < 0 || i <= main) return 'chase'                              // sin grueso: todo lo que va con el título o por delante
    return i === ref ? 'chase' : 'gruppetto'
  })
}

/** CÓMO SE ROTULA la fila (GroupLabel, §4.5). jerseys va en JERSEY_PRIORITY: el primero es el que nombra al grupo. */
export function groupLabelOf(size: number, members: readonly number[], jerseys: readonly JerseyKind[], role: GroupRole, groupsCount: number): GroupLabel {
  if (groupsCount === 1) return { k: 'together' }
  if (size <= BROADCAST.byNamesUpTo) return { k: 'names', riders: members }          // tres o menos, por sus nombres (SPEC l. 612)
  if ((role === 'chase' || role === 'gruppetto') && jerseys.length > 0) return { k: 'jersey_group', jersey: jerseys[0]! }
  return { k: 'role' }
}
```

`groupLabelOf` importa además `JerseyKind` de `../jerseys.js` y `GroupLabel` de `./instant.js`; `BROADCAST.byNamesUpTo` vale 3. Las palabras viven en una tabla cerrada, atada a sus uniones por tipo, en `packages/shared/src/broadcast/names.ts`:

```ts
// packages/shared/src/broadcast/names.ts
import type { JerseyKind } from '../jerseys.js'
import type { GroupRole } from './instant.js'

/** EL VOCABULARIO ÚNICO de grupos (D-18). [barra, voz]. Un papel o un maillot nuevo no compila sin su palabra. */
export const GROUP_WORDS = {
  role: {
    lead: ['Lead group', 'the lead group'],
    chase: ['Chase group', 'the chase group'],
    bunch: ['Bunch', 'the bunch'],                      // DD-04: `Peloton` es la alternativa
    gruppetto: ['Gruppetto', 'the gruppetto'],
  },
  together: ['Bunch together', 'the bunch'],
  jersey: { gc: 'Race leader’s group', points: 'Points leader’s group', kom: 'KOM leader’s group' },   // solo barra y radio
} as const satisfies {
  readonly role: Readonly<Record<GroupRole, readonly [string, string]>>
  readonly together: readonly [string, string]
  readonly jersey: Readonly<Record<JerseyKind, string>>
}
```

La barra escribe las palabras en mayúsculas (`LEAD GROUP`, es presentación, no otra palabra); la voz, en minúsculas y con artículo. El grupo del maillot solo existe en la barra y en la radio servida: la voz nombra ese grupo por su papel (`the chase group`), porque su vocabulario vigilado son cuatro nombres (`WATCHED_GROUP_NOUNS`, `coherence.ts` l. 616) y D-18 solo le añade `the gruppetto` (decisión 6-b). Un grupo de tres o menos se nombra por sus corredores en las dos: en la barra, los apellidos en mayúsculas separados por `·` (`MORENO · LEROY · KAHN`), y en la voz, como ya hace el journal (`stageJournal.ts` l. 34: «Con tres o menos, sus nombres»).

**La lista cerrada, con su condición exacta** (pantalla, en inglés; `n` es el número de grupos en carretera y el grueso es el grupo con el título y al menos `bunchMinShare` de los que corren):

| Barra | Voz | Condición sobre el instante | Hoy en la radio |
| --- | --- | --- | --- |
| `Bunch together` | `the bunch` | `n = 1` | `Bunch together` (`RaceRadioPanel.tsx` l. 68) |
| `Lead group` | `the lead group` | el número 1, si no es el grueso, con más de tres | `Lead group` (l. 70) |
| `Chase group` | `the chase group` | entre la cabeza y el grueso; sin grueso, del 2 al grupo del título; y, sin grueso, el de referencia de `chaseReferenceIndex` aunque vaya detrás del título (el trozo de atrás de una criba) | `Chase group` (`contra`, l. 72), `2nd group` o `Group` |
| `Bunch` | `the bunch` | el grupo con el título y al menos 2/3 de los que corren | `Peloton` (l. 68) |
| `Gruppetto` | `the gruppetto` | detrás del grueso; sin grueso, detrás del título y no es la referencia | `Grupetto` (l. 74), `No man’s land` (l. 73) |
| `Race leader’s group` · `Points leader’s group` · `KOM leader’s group` | el de su papel | papel `chase` o `gruppetto`, más de tres corredores y un maillot de líder dentro; manda `JERSEY_PRIORITY` (gc, points, kom, `packages/shared/src/jerseys.ts` l. 22) | los mismos (l. 85-89), elegidos por el orden gc, kom, points de la radio (l. 102) |
| los apellidos | los nombres | tres corredores o menos, sea cual sea el papel | no: `No man’s land` o el papel |

**Casos, con lo que dice hoy la radio y lo que dirá la barra.** Los ocho primeros son los de `raceRadioNames.test.tsx` (`apps/web/src/components/`, seis `it`), que D-18 re-sella a propósito en el paso 6; los demás, nuevos, van a `packages/shared/src/broadcast/instant.test.ts` con `groupRoleOf` y `groupLabelOf`:

| Caso (orden de carretera; tamaño de los que corren) | Hoy, `groupName` | E2 |
| --- | --- | --- |
| el pelotón de 129 de 130 en cabeza, y uno suelto detrás | `Peloton` | `Bunch`; el suelto, por su apellido |
| 130 de 130 en un solo grupo | `Bunch together` | `Bunch together` |
| el pelotón de 110 de 130, segundo en carretera | `Peloton` | `Bunch` |
| la carrera partida en 59 (primero) y 65 (segundo, con el título) de 124 | `Lead group` y `2nd group` | `Lead group` y `Chase group`: 65 de 124 no llega a 2/3, y persigue |
| una contra de 8 entre la cabeza y el pelotón de 115 de 130 | `Chase group` | `Chase group` |
| un corredor suelto (`tierra`), tercero | `No man’s land` | su apellido |
| un grupeto de 12 detrás del pelotón | `Grupetto` | `Gruppetto` |
| el grupo del título con 40 de 130, tercero | `3rd group` | `Chase group` |
| el líder de la general en un grupo de 20, detrás del pelotón | `Race leader’s group` | `Race leader’s group` |
| una fuga de 5, el título con 100 de 176 (57 %) y 71 detrás | `Lead group`, `2nd group`, `Grupetto` | `Lead group`, `Chase group`, `Gruppetto` |
| el título con 100 de 176 en cabeza y 76 detrás, sin fuga | `Lead group`, `Grupetto` | `Lead group` y `Chase group`: los 76 son la referencia de `chaseReferenceIndex` |
| el instante de §6.1: 3, 3, 2, 124 (con el título), 35, 5 y 1 de 176 | `Lead group`, `Chase group`, `Chase group`, `Peloton`, `Grupetto`, `Grupetto`, `Grupetto` | tres filas con apellidos, `Bunch`, `Gruppetto`, `Gruppetto` y un apellido |

**Lo que se retira, y por qué.** `Peloton`, por DD-04 (la palabra de SPEC y del journal es `Bunch`). `No man’s land`, porque el `tierra` del motor es un movimiento que ha quedado DETRÁS del pelotón o a su altura (`kindOf`, `raceRadio.ts` l. 361-383) y la tierra de nadie de la tele es un suelto entre dos grupos de delante (mapa 06 §1.3): la misma palabra para dos cosas; el suelto, además, tiene tres o menos y se nombra por su apellido. `2nd group` y `3rd group`, porque el número de carretera no es identidad (la tele renumbera, UCI §11.2) y ya va delante de cada fila; era el remedio de la radio al caso del dueño en que «media carrera NO es el pelotón» (`raceRadioNames.test.tsx` l. 26-30), que ahora es `Chase group`. `Group`, porque no dice nada. Y la grafía `Grupetto`, que es `Gruppetto` en italiano y en la tele (mapa 06 §1.3).

**La histéresis del papel** (I-04, D-03, decisión 4-q de §4.5). El papel crudo de `groupRoleOf` se enseña si coincide con el de hace `BROADCAST.roleHysteresisKm` (1 km) de la marcha del grupo, o si un `move` de más de un corredor tocó ese grupo en ese km; si no, se queda el de entonces. Así la barra no parpadea cuando dos grupos se cruzan el papel en un par de bloques. La etiqueta sigue al tamaño sin espera: que un grupo pase de tres a cuatro corredores es un hecho, no una lectura. La identidad de cada fila es el id del motor con su sucesor por mayoría (§3.7): una fuga cazada no es una fila que desaparece y otra que aparece, es un cursor que se funde con el de su cazador.

**Lo que esto no arregla, medido.** La voz no calcula el papel: la dicen las plantillas del journal con nombres fijos por variante (`stageJournal.ts` l. 365-461, 688-702, 933-961), y el motor llama `the bunch` al grupo del título que corresponda sin mirar su cuota. En `time_gap` y `front_group` la elige con otro listón, la MITAD de los que corren y no los dos tercios (`chaseIsBunch`, `simulate.ts` l. 4142-4144), pero esas dos plantillas no están en la voz de `Watch` (D-43, punto 5). Las demás que dicen «the bunch» sí: medido con `l4/bunch.mjs` sobre las cinco etapas de §8.3 y las semillas 0 y 1, contando las líneas narradas cuyas plantillas tienen `the bunch` en `GROUP_NOUNS` (fuera `time_gap`, `time_gap_run` y `front_group`) y la cuota del grupo del título en la foto de su km, salen con el título por debajo de 2/3, es decir cuando la barra NO lo llama `Bunch`, 0 de 41 en la llana e7, 16 de 67 en la media e13, 22 de 48 en la reina e18, 4 de 48 en Flandes y 8 de 22 en Colombia e5 (sobre todo `attack_go` y `attack_reeled`, con cuotas de 0,11 a 0,66). En la reina, casi la mitad de las veces que la voz dice «the bunch» la barra dice `Chase group` o `Lead group` para ese mismo grupo. D-18 manda que la voz lea `GroupRole`; cómo (la plantilla recibe el papel del grupo de su protagonista en `instantAt(revealS)` y no el `kind` del motor) es §12.6, y queda anotado para su redactor con estas cifras.

**DD-04, la palabra del grupo principal.** Por defecto, `Bunch` (SPEC §6.15), con `Lead group`, `Chase group` y `Gruppetto`. `Peloton` es la palabra de la tele y la de la radio de hoy; cambiarla es cambiar una entrada de `GROUP_WORDS` y re-sellar `GROUP_NOUNS` y los 140 tests del journal (`stageJournal.test.ts`), que vigilan que ninguna frase imprima un nombre que su plantilla no declare (`coherence.ts` l. 565-571). La tele sigue llamando pelotón al grupo del líder aunque sea de 40 (mapa 06 §1.3); el motor se lo quita por debajo de dos tercios, y aquí manda el motor por C7.

### 6.4 Los que tiran

D-27, en lo que toca a la pantalla (la política entera de a quién se nombra es §7.7): cada grupo que tira lleva una línea, `Pulling: Team Beta (for 11 S. CARTER)` (pantalla; I-46). Es lo que el dueño pidió al journal y a la radio en seis tandas, del «quién tira del pelotón» de la v11 al «pero no dice quién es, wey» de la v57 (mapa 05 §2.3, C1 a C6), llevado a la pantalla por defecto: la radio lo tiene hoy en su foto de un km (`Pulling (12 of 27)`, `RaceRadioPanel.tsx`), y `Watch` lo resume en una línea por fila. El dato es la capa de detalle del último km de foto que el grupo ha cruzado (`GroupNow.detail`, §4.5): quién está en el turno, su motivo y para quién (`Puller`, §4.2), con el turno de tres km que fijó el dueño (`TURNO_KM`, `raceRadio.ts` l. 597) y el tope de doce guardados (`STORED_PULLERS_MAX`, l. 591). Se ve al pasar el grupo por ese km (D-06), así que la línea tiene como mucho un km de retraso, el mismo que la radio.

```ts
// packages/shared/src/broadcast/names.ts (sigue). Datos, no texto: el componente pone las palabras (E10).
import type { GroupDetail, RiderIx } from './timeline.js'
import type { RiderCard } from '../jerseys.js'

export type PullingLine =
  | { readonly k: 'in_turn'; readonly pulling: number; readonly of: number }          // todos los equipos del grupo relevan
  | { readonly k: 'teams'; readonly teams: readonly { readonly teamId: string; readonly count: number; readonly forRider: RiderIx | null }[]; readonly moreTeams: number }

/** LA LÍNEA DE QUIÉN TIRA de una fila (D-27, I-46). null si nadie da la cara en su último km de foto. */
export function pullingLineOf(detail: GroupDetail | null, members: readonly RiderIx[], cast: readonly RiderCard[]): PullingLine | null {
  if (detail === null || detail.pullingTotal === 0) return null
  const teamOf = (r: RiderIx): string => cast[r]?.team?.id ?? `solo:${r}`
  const teamsIn = new Set(members.map(teamOf))
  const byTeam = new Map<string, RiderIx[]>()
  for (const p of detail.pullers) byTeam.set(teamOf(p.rider), [...(byTeam.get(teamOf(p.rider)) ?? []), p.rider])
  // Un grupo pequeño en el que dan relevos todos sus equipos es una fuga que colabora: `all 3 in turn` (pantalla)
  if (members.length <= BROADCAST.nameWholeGroupUpTo && [...teamsIn].every((t) => byTeam.has(t)))
    return { k: 'in_turn', pulling: detail.pullingTotal, of: members.length }
  const ranked = [...byTeam.entries()].sort((a, b) => b[1].length-a[1].length || (a[0] < b[0] ? -1 : 1))
  const forOf = (team: string): RiderIx | null => {             // el mismo destinatario en al menos dos de sus relevistas
    const n = new Map<RiderIx, number>()
    for (const p of detail.pullers) if (teamOf(p.rider) === team && p.forRider !== null) n.set(p.forRider, (n.get(p.forRider) ?? 0) + 1)
    const best = [...n.entries()].sort((a, b) => b[1]-a[1])[0]
    return best !== undefined && best[1] >= 2 ? best[0] : null
  }
  return { k: 'teams', teams: ranked.slice(0, 2).map(([teamId, rs]) => ({ teamId, count: rs.length, forRider: forOf(teamId) })), moreTeams: Math.max(0, ranked.length-2) }
}
```

`BROADCAST` se importa de `./constants.js`. El componente escribe (pantalla): con `in_turn`, `Pulling: all 3 in turn`, `Pulling: both in turn` con dos, y `Pulling: 4 of 5 in turn` si no están todos en el turno; con `teams`, el nombre de cada equipo (`RiderCard.team.name`) y, si lo tiene, `(for 107 A. ROSSI)` con el dorsal y el nombre corto de su destinatario, más `+2 teams` si tiran más de dos. El motivo de cada relevista no sale en `Watch`: es el microscopio del dueño y vive en `Race Radio` ([DUEÑO 10]). En el instante de §6.1, medido en la radio de producción del km 84 (`l4/instante2.mjs`): el pelotón tenía 20 corredores en el turno, de los que los doce guardados eran cuatro del equipo `rq-team-17`, tres del `rq-team-9` que tiraban para `rq-9-6` (motivo `equipo_etapa`), dos del `rq-team-0` y uno de otros tres; la línea es `Pulling: Team Rho, Team Kappa (for 107 A. ROSSI) +4 teams` con los nombres inventados de §6.1. La fuga de tres (dos del `rq-team-0` y uno del `rq-team-21`, motivo `fuga`) da `Pulling: all 3 in turn`.

En escritorio, la línea va debajo de toda fila que tire. En el móvil, solo debajo de la fila del pelotón y de las del espectador; las demás salen al tocar la fila (decisión 6-d): con cuatro filas de 32 px y 360 px de ancho, una línea más por fila deja la barra en dos grupos visibles. Cada nombre que la línea dice tiene rótulo: B3 exige que todo corredor de todo grupo lo tenga en todo instante (100 %), y hoy, en la radio guardada, fuera del pelotón en las reinas solo lo tiene del 47 al 64 % (mapa 01 §2.3); la línea de quién tira es la parte más visible de ese 100 %.

### 6.5 Lo eventual: la cola de rótulos

D-21, escrito como hecho. Cada `Cue` tiene una clase (`CUE_CLASS`): 3, meta, caza de la fuga, corte, cambio de líder virtual, caída o abandono de un maillot o de un top 5 de salida; 2, ataque, fuga formada, pancarta, caída, llama roja, fuera de control; 1, diferencias generales, grupo cambiado, percance, rótulo de corredor; 0, ronda de la moto, ficha del puerto, datos. Un rótulo de corredor a la vez (mapa 06 §5.3: nunca dos lower thirds de corredor a la vez). Cada `Cue` ocupa `BROADCAST.cueHoldS[clase]` segundos de pared (3, 4, 5 y 6 por clase de 0 a 3) SIN parar el reloj; con `BROADCAST.cueQueueMax` (3) esperando, se descartan los de clase 0 y 1. La carrera nunca se frena por la cola (I-21, O-27). Sin evidencia de los jueces: `television.md` §5.3 frenaba la carrera con la cola llena (`cueQueueBrake`, `cueBrakeFactor`) y aquí se quita por coherencia con I-38, para que la duración de una etapa no dependa de lo que pasa en ella (§8.2, B9). La mide la prueba de lectura (§16.5) y B17.

```ts
// packages/shared/src/broadcast/cues.ts (sigue a los tipos de §4.9)
import { BROADCAST } from './constants.js'
import type { StartState } from './wire.js'

/** LA CLASE DE CADA RÓTULO (D-21), por su CueKind. cueClassOf la sube en los casos que dependen de quién. */
export const CUE_CLASS = {
  finish: 3, caught: 3, split: 3,                                                   // meta, caza de la fuga, corte
  attack: 2, break_formed: 2, break_presented: 2, banner_result: 2, crash: 2, last_km: 2, time_cut: 2,
  time_check: 1, group_changed: 1, mishap: 1, rider: 1, dropped: 1, abandon: 1, virtual_gc: 1, group_finish: 1,
  climb_ahead: 0,                                                                    // la ficha del puerto
} as const satisfies Readonly<Record<CueKind, CueClass>>

/** Sube a 3 lo que D-21 pone en 3 por su protagonista, y baja a 0 la ronda de la moto. Pura. */
export function cueClassOf(cue: Cue, start: StartState, lastVirtualLeader: RiderIx | null): CueClass {
  const top = new Set<RiderIx>([
    ...[start.leaders.gc, start.leaders.points, start.leaders.kom].filter((r): r is RiderIx => r !== null),
    ...start.gcTop.filter((r) => r.rank <= BROADCAST.cueTopStart).map((r) => r.rider),
  ])
  switch (cue.kind) {
    case 'rider': return cue.context === 'break_round' ? 0 : CUE_CLASS.rider
    case 'crash': return cue.riders !== null && cue.riders.some((r) => top.has(r)) ? 3 : CUE_CLASS.crash   // sin nombres, 2 siempre
    case 'dropped': case 'abandon': return top.has(cue.rider) ? 3 : CUE_CLASS[cue.kind]
    case 'virtual_gc': return cue.rows[0] !== undefined && cue.rows[0].rider !== lastVirtualLeader ? 3 : CUE_CLASS.virtual_gc
    default: return CUE_CLASS[cue.kind]
  }
}
```

`BROADCAST.cueTopStart` vale 5 y `start` es la salida servida, ya degradada por el velo (B13): un maillot que viene de una etapa velada no sube la clase de nadie. La caída sin nombres (el primer tiempo de `CRASH`, D-13) es siempre de clase 2, aunque haya caído el líder: si fuera de clase 3, el tiempo que el rótulo dura en pantalla delataría quién está en el suelo antes de que la tele lo sepa (mapa 06 §3.1). El descolgado de un maillot o de un top 5 sube a 3 igual que su caída y su abandono (decisión 6-g): D-21 no lo nombra, y `Yellow jersey in difficulty` es de lo que más para una retransmisión (mapa 06 §3.1).

| `CueKind` | Clase | De dónde sale | Rótulo (pantalla) |
| --- | --- | --- | --- |
| `finish` | 3 | el reproductor, tras `BroadcastFinish` (§8.7) | `STAGE WINNER · 21 L. BERTOLINI · Team Alpha · 4:12:33` |
| `caught` | 3 | `breakaway_caught` | `CAUGHT · the lead group · 12.4 km to go` |
| `split` | 3 | `peloton_split`, `peloton_selection`, `echelon_split` | `SPLIT IN THE BUNCH · in the crosswind`; `ECHELONS` |
| `attack` | 2 | `attack_sticks` | `ATTACK · 21 L. BERTOLINI · Team Alpha` (hasta tres nombres, R23.4) |
| `break_formed` | 2 | `breakaway_formed` | `BREAKAWAY · 5 riders · +0:48 on the bunch`, con la lista por dorsal (§7.6) |
| `break_presented` | 2 | el reproductor, tras `break_formed` | la frase de la fuga de `breakHeadline` (§7.6) |
| `banner_result` | 2 | `climb_kom`, `sprint_intermediate` | `KOM · Côte d'Engins (Cat. 1) · 1. LEROY 10 pts · 2. KAHN 8 · 3. MORENO 6` |
| `crash` | 2 (3 con nombres de un maillot o un top 5) | la caída sintetizada de `incidents` (D-13) | `CRASH`, y `BROADCAST.crashNamesDelayS` (3 s) después, `CRASH · 45 J. MOREAU · 88 I. ARRIETA` |
| `last_km` | 2 | el estado: la cabeza cruza 1 km a meta | `FLAMME ROUGE · 1 KM · 2 in front · +0:08` |
| `time_cut` | 2 | el reproductor, tras `BroadcastFinish` | `TIME CUT · 12 riders outside the limit` |
| `time_check` | 1 | el reproductor, cada `BROADCAST.gapsTableEveryRealS` (25 s de pared) | el cuadro de diferencias (§6.7) |
| `group_changed` | 1 | el estado (grupos de hasta 12) y `peloton_regroup` | `CONTACT · 2 riders bridge across`; `3 of the 5 remain`; `BACK TOGETHER · 38 riders rejoin the bunch` |
| `mishap` | 1 | `puncture`, `mechanical` | `PUNCTURE · 45 J. MOREAU`; `MECHANICAL · 45 J. MOREAU` |
| `rider` | 1 (0 en la ronda de la moto) | el reproductor: tras un ataque, la ronda de la moto, tras una pancarta, al tocar un nombre y el corredor propio | el rótulo de corredor de §7.1 |
| `dropped` | 1 (3 un maillot o un top 5) | `leader_dropped`, `rider_bonks` | `DROPPED · 11 S. CARTER · Race leader · +0:25` |
| `abandon` | 1 (3 un maillot o un top 5) | `rider_abandons` | `ABANDON · 45 J. MOREAU · Team Gamma` |
| `virtual_gc` | 1 (3 si cambia el líder virtual) | el reproductor, con el cuadro de diferencias | `VIRTUAL GC · after 128.0 km` (§6.7) |
| `group_finish` | 1 | el reproductor, tras `BroadcastFinish` | `BUNCH · +2:14` |
| `climb_ahead` | 0 | el reproductor: `BROADCAST.climbCardLeadKm` (3 km) antes del pie de un puerto | `Côte de Monteynard · Cat. 2 · 8.8 km at 5.0% · summit in 11.8 km` |

**Qué produce `cuesBetween` y qué el reproductor.** `cuesBetween(prev, next, events)` (§G.4) es pura y solo conoce la línea: los rótulos de los sucesos revelados en `(prev.t, next.t]` (por `CUE_OF_TEMPLATE`, §6.6) y los de los cambios de estado entre los dos instantes. Lo que depende del espectador, del recorrido o del reloj de pared lo añade el reproductor (`apps/web/src/domain/broadcast/player.ts`), que tiene el reparto servido, la salida, el perfil y el reloj de pared (decisión 6-i):

```
cuesBetween(prev, next, events):                                   // packages/shared/src/broadcast/cues.ts
  para cada e de events con prev.t < e.revealS ≤ next.t, por revealS y source:
    d ← CUE_OF_TEMPLATE[e.plantilla] ?? 'voice_only'               // en producción, lo desconocido solo va a la voz; B7 lo hace fallar en test
    si d es un CueKind: emitir el Cue de d con t = e.revealS y sus campos (tabla de §6.6)
  last_km        ← si prev.toGoKm > 1 ≥ next.toGoKm: { t: next.t, leadGapS: next.mainGap?.gapS ?? null }
  group_changed  ← por cada grupo de next con tamaño ≤ nameWholeGroupUpTo (12) cuyo conjunto de miembros cambió
                   respecto de prev (mismo GroupIx, o su antecesor por successor): { gained, lost }
reproductor, cada fotograma, además:
  time_check y virtual_gc  cada gapsTableEveryRealS (25 s) de pared, salvo con la cabeza a menos de quietFinalKm (5 km), y al volver de un salto
  break_presented          en cuanto sale break_formed: breakHeadline sobre los RiderCard de la fuga (§7.6)
  rider 'break_round'      tras break_presented, uno por escapado por dorsal, cada breakRoundEveryS (6 s) de pared
  rider 'attack'           tras attack, el primer atacante con notoriedad menor que 8 (§7.5)
  rider 'banner'           tras banner_result, el que ganó la pancarta
  rider 'own'              cuando un corredor del espectador cambia de grupo (un move visible)
  rider 'focus'            al tocar un nombre: sale enseguida, fuera de la cola
  crash con nombres        crashNamesDelayS (3 s) de pared después del CRASH sin nombres
  climb_ahead              cuando la cabeza pasa por footKm − climbCardLeadKm de un puerto de ProfileStrip.climbs
  finish, group_finish, time_cut   tras POST …/broadcast/finish (§8.7)
```

**La cola**, en el reproductor, por fotograma de pared. Todo lo que entra se ordena por clase y, a igual clase, por hora de carrera:

```
admitir(c):                                                        // c ya con su clase k = cueClassOf(c, …)
  si la cabeza está a menos de quietFinalM (500 m) y c es un rider: descartar           // solo la distancia (D-17)
  si esperando < cueQueueMax: meter c
  si no, si k ≤ 1: descartar c                                                          // D-21
  si no, si hay alguno esperando de clase ≤ 1: sacar el de menor clase y más viejo; meter c
  si no, si k = 2 y hay alguno de clase 2 esperando: sacar el de clase 2 más viejo; meter c   (decisión 6-h)
  si no: meter c                                                    // solo clase 3: la cola crece; la meta nunca se tira
cada fotograma:
  quitar de la espera los de clase ≤ 2 que llevan más de cueHoldS[3] (6 s) de pared esperando   (decisión 6-h)
  si hay uno en pantalla y se le acabó cueHoldS[su clase]: quitarlo
  si hay uno en pantalla de clase ≤ 1 y el primero de la espera es de clase 3: cortarlo      // la tele corta
  si no hay ninguno en pantalla, la cabeza está a más de quietFinalM y hay espera: sacar el primero
```

Lo que la cola tira no se pierde para quien quiere leerlo: su suceso tiene línea en la voz y queda en `Commentary`. La caducidad de seis segundos es lo que mantiene la tele a su hora: a ×60, un rótulo que espera 18 s de pared llega 18 minutos de carrera tarde, y un `ATTACK` de un corredor al que ya han cazado contradice la barra. A ×300 (`Highlights`, §8.1), la cola descarta mucho más y se queda con las clases 2 y 3, que es lo que un resumen tiene que conservar (mapa 06 §5.4). `Next action` acelera ×`BROADCAST.nextActionSpeedup` (20) hasta que ENTRA en la cola un `Cue` de clase ≥ `nextActionMinClass` (2) (§8.5): como el `Cue` solo existe cuando se ha revelado, el mando no puede saber dónde está el siguiente (D-20). Los rótulos van en una región `aria-live="polite"` (D-57, §18.8).

### 6.6 La tabla `CUE_OF_TEMPLATE`

Cada plantilla que el motor emite tiene un destino: un `CueKind` (un rótulo en el plano y su línea en la voz), `voice_only` (solo la voz) o `report_only` (solo el acta) (D-21, O-27). Son 54 plantillas, contadas en el código de hoy: las 42 llamadas a `log.emit` de `packages/engine/src/stage/simulate.ts` dan 44 plantillas de carretera, `rider_defies_team` la inserta `announceRebels` al cerrar (`packages/engine/src/stage/events.ts` l. 80-88), y las 12 llamadas de `packages/engine/src/stage/timetrial.ts` dan 9 propias de la crono más cuatro que comparte con la carretera (`puncture`, `mechanical`, `time_cut`, `time_cut_readmitted`); coincide con el mapa 01 §1.1 y §1.3. Más `crash`, la caída sintetizada de `incidents` (D-13): 55 filas. Las plantillas con la regla `finish` de `REVEAL_RULES` (§4.7) no entran nunca en un tramo: su destino solo existe tras `BroadcastFinish` (§8.7), y su línea de voz es la del acta de ese paquete (§12.2).

```ts
// packages/shared/src/broadcast/cues.ts (sigue). B7 exige que toda plantilla que emite el motor tenga fila aquí.
export const CUE_OF_TEMPLATE: Readonly<Record<string, TemplateTarget>> = {
  // carretera: ataques y movimientos
  attack_go: 'voice_only', attack_swarm: 'voice_only', attack_sticks: 'attack', attack_reeled: 'voice_only',
  move_caught: 'voice_only', move_faded: 'voice_only', bridge_made: 'voice_only', move_merge: 'voice_only', bridge_failed: 'voice_only',
  // la fuga
  breakaway_formed: 'break_formed', break_cooperation: 'voice_only', break_share: 'voice_only', breakaway_caught: 'caught',
  peloton_concedes: 'voice_only',
  // el estado que ya dice la barra (D-43, punto 5)
  front_group: 'report_only', time_gap: 'report_only',
  // quién tira y por qué
  peloton_pull: 'voice_only', chase_work: 'voice_only', sprinters_chase: 'voice_only', sprinters_give_up: 'voice_only',
  no_help_for_leader: 'voice_only', domestiques_drop_back: 'voice_only', rider_defies_team: 'voice_only',
  // cortes y reagrupamientos
  peloton_split: 'split', peloton_selection: 'split', echelon_split: 'split', echelon_close: 'voice_only',
  peloton_regroup: 'group_changed', group_overtake: 'voice_only',
  // corredores
  leader_dropped: 'dropped', rider_bonks: 'dropped', rider_sits_up: 'voice_only', rider_abandons: 'abandon',
  puncture: 'mishap', mechanical: 'mishap', crash: 'crash', truce_granted: 'voice_only', truce_denied: 'voice_only', rain_front: 'voice_only',
  // pancartas
  sprint_intermediate: 'banner_result', climb_kom: 'banner_result',
  // meta: solo tras BroadcastFinish
  bunch_sprint: 'voice_only', final_km: 'voice_only', stage_win: 'finish', time_cut: 'time_cut', time_cut_readmitted: 'voice_only',
  // crono (sus rótulos de estado, ON COURSE, SPLIT, HOT SEAT, son §9.5)
  tt_start_order: 'voice_only', tt_last_off: 'voice_only', tt_split: 'voice_only', tt_first_time: 'voice_only',
  tt_best_time: 'voice_only', tt_catch: 'voice_only', tt_catches: 'voice_only', tt_last_home: 'voice_only', stage_win_itt: 'finish',
}
```

| # | Plantilla | La emite | Destino | Clase | Rótulo (pantalla) o por qué no lo tiene |
| --- | --- | --- | --- | --- | --- |
| 1 | `attack_go` | `simulate.ts` l. 7324 | `voice_only` | | cada intento: 87 emitidos y 30 narrados en cinco llanas (mapa 01 §3); el rótulo espera al hueco (`attack_sticks`) |
| 2 | `attack_swarm` | l. 7122, 7203 | `voice_only` | | varios a la vez, casi siempre `narra: 0` |
| 3 | `attack_sticks` | l. 8759 | `attack` | 2 | `ATTACK · 21 L. BERTOLINI · Team Alpha`; con más, `and 2 others` |
| 4 | `attack_reeled` | l. 8600, 8827 | `voice_only` | | el cierre de un intento; la barra enseña la fusión |
| 5 | `move_caught` | l. 8827 | `voice_only` | | un movimiento que no es la fuga del día; la barra enseña la fusión |
| 6 | `move_faded` | l. 8921 | `voice_only` | | se queda sin gente: la fila desaparece |
| 7 | `bridge_made` | l. 8616 | `voice_only` | | el rótulo lo da el estado: `group_changed`, `CONTACT · 2 riders bridge across` |
| 8 | `move_merge` | l. 8616 | `voice_only` | | ídem |
| 9 | `bridge_failed` | l. 8536 | `voice_only` | | |
| 10 | `breakaway_formed` | l. 8727 | `break_formed` | 2 | `BREAKAWAY · 5 riders · +0:48 on the bunch` y la lista; luego `break_presented` y la moto |
| 11 | `break_cooperation` | l. 8733 | `voice_only` | | la línea de quién tira (§6.4) lo enseña |
| 12 | `break_share` | l. 4476 | `voice_only` | | ídem |
| 13 | `breakaway_caught` | l. 8889 | `caught` | 3 | `CAUGHT · the lead group · 12.4 km to go` |
| 14 | `peloton_concedes` | l. 4814 | `voice_only` | | la tendencia de la capa fija ya dice que el hueco crece |
| 15 | `front_group` | l. 4215 | `report_only` | | lo dice la barra (D-43, punto 5) |
| 16 | `time_gap` | l. 4296 | `report_only` | | lo dice la capa fija (D-43, punto 5) |
| 17 | `peloton_pull` | l. 4425 | `voice_only` | | la línea de quién tira (§6.4) |
| 18 | `chase_work` | l. 2068 | `voice_only` | | el balance de la caza: voz |
| 19 | `sprinters_chase` | l. 4546 | `voice_only` | | |
| 20 | `sprinters_give_up` | l. 4591 | `voice_only` | | |
| 21 | `no_help_for_leader` | l. 4017 | `voice_only` | | |
| 22 | `domestiques_drop_back` | l. 4047 | `voice_only` | | |
| 23 | `rider_defies_team` | `events.ts` l. 80-88 | `voice_only` | | revelado con el siguiente suceso de su protagonista (§4.7) |
| 24 | `peloton_split` | l. 6640 | `split` | 3 | `SPLIT IN THE BUNCH`, con la causa de `datos.causa`: `after a crash`, `in the crosswind`, `on the cobbles`, `on the climb`, `in the chase` |
| 25 | `peloton_selection` | l. 6762 | `split` | 3 | `SPLIT IN THE BUNCH`; la criba lejana, que la barra enseña como estado (§6.8) |
| 26 | `echelon_split` | l. 6492 | `split` | 3 | `ECHELONS` |
| 27 | `echelon_close` | l. 3156 | `voice_only` | | la barra enseña cómo se cierra |
| 28 | `peloton_regroup` | l. 6684 | `group_changed` | 1 | `BACK TOGETHER · 38 riders rejoin the bunch` |
| 29 | `group_overtake` | l. 8020 | `voice_only` | | la barra renumera |
| 30 | `leader_dropped` | l. 5804 | `dropped` | 1 o 3 | `DROPPED · 11 S. CARTER · Race leader · +0:25` |
| 31 | `rider_bonks` | l. 6046 | `dropped` | 1 o 3 | `DROPPED · …` |
| 32 | `rider_sits_up` | l. 6269 | `voice_only` | | uno a uno, no (regla B3 del dueño, §12.3): los cuenta la barra |
| 33 | `rider_abandons` | l. 6310 | `abandon` | 1 o 3 | `ABANDON · 45 J. MOREAU · Team Gamma` |
| 34 | `puncture` | l. 8473; `timetrial.ts` l. 321-327 | `mishap` | 1 | `PUNCTURE · 45 J. MOREAU`; sin el tiempo perdido, que es del microscopio |
| 35 | `mechanical` | ídem | `mishap` | 1 | `MECHANICAL · 45 J. MOREAU` |
| 36 | `crash` | sintetizada de `output.incidents` (`types.ts` l. 358-365; D-13) | `crash` | 2 o 3 | `CRASH`; los nombres, 3 s después |
| 37 | `truce_granted` | l. 8244 | `voice_only` | | frase nueva de §12.5 |
| 38 | `truce_denied` | l. 8244 | `voice_only` | | ídem |
| 39 | `rain_front` | l. 3133 | `voice_only` | | el tiempo se ve al tocar la capa fija (§6.2) |
| 40 | `sprint_intermediate` | l. 9221 | `banner_result` | 2 | `INTERMEDIATE SPRINT · km 129 · 1. VOSS 20 pts · 2. SILVA 15 · 3. EKDAL 12` |
| 41 | `climb_kom` | l. 9221, 9310 | `banner_result` | 2 | `KOM · Côte d'Engins (Cat. 1) · 1. LEROY 10 pts · 2. KAHN 8 · 3. MORENO 6` |
| 42 | `bunch_sprint` | l. 9662 | `voice_only` | | regla `finish`: la voz de la llegada, en el paquete de meta |
| 43 | `final_km` | l. 9689 | `voice_only` | | ídem; el rótulo del último km es `last_km`, del estado |
| 44 | `stage_win` | l. 9695 | `finish` | 3 | `STAGE WINNER · …` (§8.7) |
| 45 | `time_cut` | l. 9135; `timetrial.ts` l. 443-447 | `time_cut` | 2 | `TIME CUT · 12 riders outside the limit` |
| 46 | `time_cut_readmitted` | l. 9153; `timetrial.ts` l. 462-466 | `voice_only` | | la readmisión se cuenta, no se rotula |
| 47 | `tt_start_order` | `timetrial.ts` l. 505 | `voice_only` | | el orden de salida es público; su cuadro es de la previa de crono (§9.7) |
| 48 | `tt_last_off` | l. 514 | `voice_only` | | |
| 49 | `tt_split` | l. 540 | `voice_only` | | el rótulo `SPLIT 1` sale del estado de la crono (§9.5) |
| 50 | `tt_first_time` | l. 557 | `voice_only` | | el sillón, `HOT SEAT`, sale del estado (§9.5) |
| 51 | `tt_best_time` | l. 568 | `voice_only` | | ídem |
| 52 | `tt_catch` | l. 589 | `voice_only` | | |
| 53 | `tt_catches` | l. 596 | `voice_only` | | |
| 54 | `tt_last_home` | l. 605 | `voice_only` | | regla `finish` (§4.7): en el paquete de meta |
| 55 | `stage_win_itt` | l. 614 | `finish` | 3 | `STAGE WINNER · …` |

Los campos de cada `Cue` salen del suceso y del instante siguiente: `attack.riders`, los protagonistas (como mucho tres, R23.4) y `fromGroup`, su grupo en el instante anterior; `break_formed.group`, el grupo de los protagonistas (todos los de la fuga, mapa 01 §1.3) y `gapS`, la diferencia principal si ese grupo es la cabeza; `caught.caught`, el grupo que tenían los protagonistas antes y `by`, su sucesor; `split.parts`, los grupos del instante que llevan a alguien que iba en el grupo del título antes, y `cause`, `datos.causa` (en `echelon_split`, `viento`); `banner_result.banner`, el índice de la pancarta revelada en ese km en `Instant.banners`; `mishap.lostS`, `datos.perdidaS`; `dropped.gapS`, el hueco del grupo en que se pinta al corredor (H-17), o nulo si va en tránsito. B7 (§16.4) recorre la lista de plantillas de `simulate.ts`, `events.ts` y `timetrial.ts` y falla si una no tiene fila aquí, frase de voz y de acta y regla de `REVEAL_RULES`: la `card_changed` que traerá R23.8 de la táctica ([DOC 3]) entra por la regla por defecto de §4.7 y su redactor tiene que darle fila antes de fusionar (decisión 6-j para la crono).

### 6.7 Las diferencias y la moto

Lo que la UCI pide de forma periódica y no permanente (mapa 06 §1.1, puntos 3 y 4): las diferencias generales «at least once every 3-5 minutes», con los maillots de líder en su fila, y los nombres de cada grupo «regularly». D-22 lo trae a `Watch` con dos rótulos que programa el reproductor (§6.5) y uno que dan los sucesos.

**El cuadro de diferencias** (`time_check`, clase 1; pantalla). Sale cada `BROADCAST.gapsTableEveryRealS` (25 s de pared), nunca con la cabeza a menos de `BROADCAST.quietFinalKm` (5 km) de meta, y además en cuanto se vuelve de un salto o se reanuda (§8.5), que es cuando el espectador necesita recolocarse (mapa 06 §5.4: «al volver de un corte el espectador lee `42 km to go · +1:10` y se recoloca solo»). A ×60 son 25 minutos de carrera entre dos cuadros, dentro de lo que pide la UCI en tiempo de espectador, que es el que cuenta (`television.md` §12). Sus filas (`TimeCheckRow`, §4.9) son todos los grupos del instante hasta el pelotón incluido, más el del espectador y los que lleven un maillot; lo que va detrás sin maillot ni corredor propio se junta en una fila, `+3 groups behind · 41 riders`. Cada fila, con el número de carretera, el nombre de §6.3 (los apellidos si son tres o menos), el tamaño, el hueco a la cabeza y los iconos de los maillots; en el móvil, como mucho `BROADCAST.cardRowsMax` (5, propuesta) filas y el resto en la última:

```
(pantalla · time_check · el instante de §6.1)
TIME CHECK · 98.5 km to go
1  MORENO · LEROY · KAHN                   0:00
2  VOSS · SILVA · EKDAL                   +0:20
3  NOWAK · BRANDT                         +0:40
4  BUNCH · 124            [GC] [PTS]      +3:46
+3 groups behind · 41 riders
```

A diferencia de la barra, que en el móvil pliega grupos, el cuadro enseña de una vez todo lo que decide la carrera; en escritorio, donde la barra ya lo enseña todo, el cuadro es el mismo y sirve de corte.

**La general virtual** (`virtual_gc`, clase 1; 3 si cambia el líder virtual; pantalla). Sale con el cuadro de diferencias mientras `Instant.virtualGc` no sea nulo, es decir mientras uno de los `BROADCAST.virtualGcTop` (10) primeros de la general de salida vaya en otro grupo que el líder a menos de `BROADCAST.virtualGcMaxS` (300 s) (§4.5; mapa 06 §3.3). Cada fila es la general de salida más el hueco de su grupo al del líder en su último km de foto común; las bonificaciones de meta se tratan como posibles y no se suman (mapa 06 §3.3). La montaña o los puntos virtuales no se enseñan: la salida servida no lleva los puntos de esas clasificaciones (`StartState`, §4.11).

```
(pantalla · virtual_gc)
VIRTUAL GC · after 128.0 km
1  I. ARRIETA            (in the break)      0:00
2  [GC] S. CARTER        (bunch)            +0:47
3  M. OLSEN              (bunch)            +1:02
```

**La moto rodea la fuga** (pantalla). En cuanto sale `break_formed` y tras él la frase de `break_presented` (§7.6), el reproductor programa un rótulo de corredor por escapado, por dorsal, cada `BROADCAST.breakRoundEveryS` (6 s de pared), de clase 0: la moto 1 que la UCI manda rodear la fuga «para que se vea a cada corredor» (pliego §11.4, mapa 06 §5.1). Una vez por fuga: si después gana o pierde a alguien, sale `group_changed` (`CONTACT · 2 riders bridge across` o `3 of the 5 remain`, pantalla) y no otra ronda. Con la cola llena, la ronda es lo primero que se descarta (clase 0).

**Las pancartas** (`banner_result`, clase 2; pantalla). Con el orden y los puntos de `BannerResult` (§4.2), que da la sonda `onBanner` (I-18, §5.2) y se revela con el reloj del grupo del primero que puntúa (D-05, regla `banner`): `KOM · Côte d'Engins (Cat. 1) · 1. LEROY 10 pts · 2. KAHN 8 · 3. MORENO 6`, con el nombre y la categoría que la web casa con `ProfileStrip.climbs` por km (decisión 4-n), y `INTERMEDIATE SPRINT · km 129 · 1. VOSS 20 pts · 2. SILVA 15 · 3. EKDAL 12`. Tres puestos en el rótulo; los ocho que puntúan (`STAGE.sprintPoints`, `climbPoints`, `constants.ts` l. 5032-5042) quedan en la radio y en el acta. Sin bonificaciones en las volantes: el motor solo las da en meta (`STAGE.timeBonuses` 10, 6 y 4 s, l. 6285) y una carrera de un día no las lleva (SPEC §6.15). Antes del puerto, `BROADCAST.climbCardLeadKm` (3 km) antes de su pie, la ficha (`climb_ahead`, clase 0): `Côte de Monteynard · Cat. 2 · 8.8 km at 5.0% · summit in 11.8 km`.

### 6.8 Lo que no es suceso

**La criba lejana** ([DUEÑO 7]; D-59, H-03). El dueño la aparcó para el diario: «es solo un tema del journal, no me preocupa de momento» (`docs/balance.md` l. 8094-8095, v39, con una cobertura del 58 % contra el 75 % pedido). En `Watch` no depende del diario: la barra la enseña como estado, porque una criba es el pelotón que se encoge y dos o tres filas nuevas de `Gruppetto` que aparecen detrás, se narre o no. Cuando el motor la emite (`peloton_selection`, `simulate.ts` l. 6762, criba de al menos 20 corredores y el 25 % lejos de meta), sale además el rótulo `SPLIT IN THE BUNCH` (§6.6, fila 25). B2 (§16.4) incluye `peloton_selection` entre los sucesos que contrasta con el estado.

**El tiempo, congelado** (D-14, I-19, H-07). `StageWeather` se graba con la línea desde `stageWeather`, `weatherPlan` y `roadBearings` sobre la semilla (`packages/engine/src/stage/weather.ts` l. 58-72, 188-216 y 251-287; §5.4), sin tocar el motor, y se enseña en dos sitios: la segunda línea de la capa fija (la temperatura y, del tramo en que va la cabeza, `rain` y `crosswind`, §6.2) y el cuadro del parte de la previa (§8.6). Nunca un punto cardinal: el rumbo de la carretera del motor es una «Suposición declarada, no dato» (`weather.ts` l. 175-181), así que lo que existe es el viento contra la carretera (lateral o no, `crosswind`), no si sopla del noroeste (decisión 6-k).

**Lugares y avituallamiento, no** (H-07). El motor no los tiene: `Banner` es `{ km, tipo, cat? }` (`packages/engine/src/stage/types.ts` l. 27-32) y no hay pueblos por km ni zona de avituallamiento en ninguna parte (mapa 06 §9, filas 13 y 25). El nombre de una volante existe en `STAGE_FEATURES` para las etapas con recorrido real (`sprints[].name`: `Corps`, km 129, en la e18), pero `ProfileStrip` solo guarda su km (§4.2); E2 no lo añade y la volante se rotula por su km.

### 6.9 Lo que nunca sale en pantalla

D-17: la duración de la reproducción y lo que queda de ella; cuántos sucesos o rótulos quedan; marcas en el perfil donde va a pasar algo; y la lista de llegada antes de la línea. En los últimos `BROADCAST.quietFinalM` (500 m), solo la distancia: la capa fija enseña los metros y nada más, el plano se queda vacío (los rótulos esperan y caducan, §6.5), la voz calla y la barra sigue con sus grupos y sin huecos. Es la regla de la tele (mapa 06 §5.3: en los últimos 300-500 m «solo queda la distancia») y la de los productos que ya lo resuelven: «Lo que mide la duración revela el final» (mapa 06 §7.2, regla 3; Tennis TV esconde la duración y las extensiones de YouTube, la barra de progreso). La única duración que se enseña es la estimación de la ficha, `About 13 min` (pantalla), antes de entrar, con velocidades nominales y no las de la carrera (§8.2). La barra de progreso de los mandos va en km y lleva marcas solo del recorrido (puertos y volantes, §8.5). Hoy la altimetría de una etapa corrida sí lleva marcas de sucesos (`MARKER_LABEL`, `apps/api/src/chronicle.ts` l. 169-175: `attack`, `break`, `caught`, `banner`, `finish`; `buildMarkers(storedEvents)`, `apps/api/src/routes/races.ts` l. 514): la de `Watch` y la de la pestaña `Profile` de una etapa no conocida se piden sin ellas (`renderAltimetrySvg(profile)`, como ya hace la ruta con una etapa sin correr, l. 432).

### 6.10 Las pestañas y los nombres

D-48, escrito como hecho: `Watch` es la retransmisión; `Report` es el acta, la pestaña que hoy se llama `Story` (`apps/web/src/pages/StageReplay.tsx` l. 29-45, la primera y la de defecto de una etapa corrida, l. 345-346); `Race Radio` es el microscopio del dueño (pantalla, las tres). «journal», «crónica», «diario» y `Story` dejan de ser nombres de pantalla; en la prosa de este documento son «la voz» y «el acta» (mapa 05 §6, contradicción 8). Dentro de `Watch`, la lista de lo que la voz ya ha dicho se despliega con `Commentary` (pantalla), y nunca enseña una línea con `revealS` mayor que `t`.

| La etapa, para ese espectador | Pestañas (pantalla), la primera por defecto |
| --- | --- |
| no conocida (a medias o sin tocar) | `Watch`, `Profile` sin marcas; `Report`, `Result`, `Classifications` y `Race Radio` enseñan la puerta (§11) |
| conocida (vista, revelada, arrastrada o caducada, D-28) | `Report`, `Result`, `Classifications`, `Race Radio`, `Profile`, `Watch` |
| aún no corrida | `Preview`, `Profile` |

[DOC 4], pregunta 4 de `docs/navegacion.md` §9 (l. 494-495: «Vista de espectador de la etapa: cuánto de la telemetría nueva del motor cabe aquí sin abrumar»): la vista de espectador es `Watch`, y la respuesta es la de esta sección, dos números, la barra, el perfil y un rótulo; la telemetría entera (motivo de cada relevista, velocidades, los dos huecos por grupo) sigue en `Race Radio`. La carrera de un día, que hoy abre en `Result` con el ganador en la cabecera (`raceTabs.ts` l. 47-51; `Race.tsx` l. 720-729), es §11.5 y §11.17.

### 6.11 La previa y el cierre en pantalla

La emisión abre con la previa y cierra con el cierre (D-22, I-22): no son páginas aparte sino parte de `Watch`, con el orden de la señal internacional de la UCI (mapa 06 §8.1). `StagePreviewCards` pinta, antes de `t = 0`, los cuatro cuadros de `BroadcastHead.preview` (`StagePreview`, §4.11), de `BROADCAST.previewCardS` (5 s de pared) cada uno, sobre la zona de la barra y del plano; la capa fija ya enseña `185.0 km to go` y el perfil, sus cursores en el km 0. Un toque pasa al siguiente cuadro y `▶` empieza la carrera: saltarse la previa no revela nada. `StageClosingCards` pinta, tras la meta y los rótulos de llegada (§8.7), los cuadros de `BroadcastFinish.closing` (`StageClosing`, §4.11), que pasan solos cada `BROADCAST.closingCardS` (6 s, propuesta) o con el dedo, y el último se queda: `Next: Stage 19 · Watch` (pantalla). Con la etapa anterior velada, la retransmisión no empieza: sale la puerta (`StageGateCard`, `gate: previous_unseen`, D-37, §11.12) y la previa no se pinta. Qué dice cada cuadro, en inglés y palabra por palabra, es §8.6.

---

**Injertos aplicados.** I-04 (§6.3: la histéresis del papel y la identidad por el id con sucesor; §6.2: un cursor por grupo que no retrocede), I-07 (§6.3: `GroupRole`, `groupRoleOf`, `GROUP_WORDS` y la lista cerrada), I-19 (§6.2: la segunda línea de la capa fija; §6.8: el tiempo congelado), I-21 (§6.5: la cola por clase, un rótulo a la vez, `cueHoldS`, `Next action` hasta un `Cue` de clase ≥ 2; `While you skipped` y `Previously` son §8.5), I-22 (§6.7: la moto y el cuadro de diferencias; §6.11: la previa y el cierre en pantalla, con su contenido en §8.6), I-46 (§6.4: `Pulling:` en cada grupo que tira; la política de nombres es §7.7).

**Objeciones resueltas.** O-10 (§6.3: un solo código de papel y una lista cerrada de palabras para barra, radio, voz y acta, con `raceRadioNames.test.tsx` re-sellado y el conflicto medido que queda para §12.6), O-27 (§6.6: `CUE_OF_TEMPLATE` con las 54 plantillas del motor más `crash`, cada una a un `CueKind`, a `voice_only` o a `report_only`).

**Huecos rellenados.** H-03 (§6.8: la criba lejana la enseña la barra como estado y `peloton_selection` tiene rótulo), H-07 (§6.8: el tiempo sí, congelado y sin punto cardinal; lugares y avituallamiento no, porque el motor no los tiene), H-17 (§6.2: el hueco de tu corredor es el de su grupo en el último punto común, también en tránsito).

**Decisión tomada aquí.**
- 6-a. `groupRoleOf` aplica `bunchMinShare` para `Bunch` y, sin grueso, la referencia de `chaseReferenceIndex` con `chaseMinShare` para el trozo de atrás de una criba, que el motor llama «the chase group»; con grueso, todo lo de detrás es `Gruppetto`. La función del motor se copia en `shared` (`chaseRefOf`) porque `shared` no importa el motor, y se ata por test como las copias de §15.5. Descartado: todo lo que va detrás del título como `Gruppetto` (llamaría grupeta al trozo de 76 de una criba) y la referencia del motor también con grueso (llamaría `Chase group` a tres descolgados detrás de un pelotón que va en cabeza).
- 6-b. «El pelotón» de D-17 es el grupo con papel `bunch` y, si ninguno llega a dos tercios, el grupo del título. El grupo del maillot (`jersey_group`) solo existe en la barra y en la radio servida; la voz nombra ese grupo por su papel, porque su vocabulario vigilado son cuatro nombres. La referencia de la capa fija (`on the race leader’s group`) usa la palabra de la barra en minúsculas.
- 6-c. Las `mobileGroupRows` filas del móvil se eligen por prioridad (la 1, el pelotón, las del espectador, las que llevan un maillot, y luego por carretera) y se pintan en orden de carretera; el resto se pliega en `+N groups · M riders`. Descartado: las cuatro primeras sin más, que dejaría fuera al pelotón en cuanto hay tres grupos delante.
- 6-d. La línea `Pulling:` sale de `pullingLineOf` (datos, no texto): `in_turn` cuando en un grupo de hasta `nameWholeGroupUpTo` relevan todos sus equipos, y si no, los dos equipos con más relevistas, cada uno con su destinatario si lo comparten al menos dos. En el móvil va solo bajo el pelotón y las filas del espectador; las demás, al tocar. Descartado: el motivo de cada relevista en `Watch`, que es del microscopio.
- 6-e. Los corredores en tránsito se cuentan en una línea bajo la fila del grupo que dejaron (`↓ 3 dropping back`, `↑ 2 bridging across`); no se pintan en ninguna fila.
- 6-f. La capa fija lleva, además de los dos números, contra quién (`on the bunch`), por la pregunta «sobre quién» de [DUEÑO 4]; los km con un decimal y, en el último, metros a la decena; en un circuito, `3 laps to go · 42.5 km` y `Last lap`. El reloj, la velocidad, la pendiente y el tiempo van en una segunda línea que se abre al tocar (siempre abierta en escritorio). Descartado: el reloj como tercer dato permanente, que la UCI no pide (mapa 06 §1.2).
- 6-g. `cueClassOf` sube a 3 la caída con nombres, el abandono y el descolgado de un maillot o de un top `cueTopStart` de salida, y el cuadro de la general virtual cuando cambia su primero; baja a 0 la ronda de la moto. La caída sin nombres es siempre 2. El descolgado no está en D-21; se añade por coherencia con la caída y el abandono.
- 6-h. La cola, además de lo que fija D-21: con la cola llena de clases 2 y 3, un `Cue` de clase 2 desplaza al de clase 2 más viejo; un `Cue` de clase ≤ 2 que ha esperado más de `cueHoldS[3]` (6 s) de pared caduca; la clase 3 no se descarta nunca y corta al de clase ≤ 1 que esté en pantalla. Sin evidencia de los jueces, como D-21; lo acepta la prueba de lectura. Descartado: dejar que la cola se alargue sin límite, que a ×60 enseñaría rótulos de hace veinte minutos.
- 6-i. `cuesBetween` produce los rótulos de los sucesos y de los cambios de estado (`last_km`, `group_changed`); el reproductor, los que dependen del espectador, del recorrido o del reloj de pared (`time_check`, `virtual_gc`, `break_presented`, los `rider`, el segundo tiempo de `crash`, `climb_ahead` y los de meta). Así `cuesBetween` conserva la firma de §G.4 y sigue siendo pura sobre la línea.
- 6-j. En la crono, sus nueve plantillas propias van a `voice_only` salvo `stage_win_itt` (`finish`); `puncture` y `mechanical` van a `mishap` y `time_cut` a `time_cut`, como en carretera. Sus rótulos de estado (`ON COURSE`, `SPLIT 1`, `HOT SEAT`, `VIRTUAL GC`) salen de `TimeTrialInstant` y son §9.5.
- 6-k. El tiempo se enseña sin punto cardinal: el rumbo del motor es una suposición (`weather.ts` l. 175-181) y lo que tiene sentido es el viento contra la carretera.
- 6-l. `Your rider` con un solo corredor propio; con varios, `Your team · 1 in front · 5 in the bunch · 2 in the gruppetto`; en tránsito, `dropping back from …` o `bridging to …`; fuera de carrera, `out of the race`.

**Propuesto para el glosario.**
- `groupLabelOf(size, members, jerseys, role, groupsCount): GroupLabel` y la privada `chaseRefOf` (copia de `chaseReferenceIndex`), en `packages/shared/src/broadcast/instant.ts`; `mainGapOf` gana un tercer parámetro, `markAt(g, photoKm)`, la marca en Ds de un grupo en un km de foto con el respaldo de 3-e.
- `PullingLine` (`in_turn` o `teams`) y `pullingLineOf(detail, members, cast)`, en `packages/shared/src/broadcast/names.ts`.
- `cueClassOf(cue, start, lastVirtualLeader): CueClass`, en `packages/shared/src/broadcast/cues.ts`.
- `BROADCAST.cardRowsMax` (5): filas de un cuadro de diferencias o de la general virtual en el móvil; `BROADCAST.closingCardS` (6 s de pared, sin evidencia de los jueces): lo que dura cada cuadro del cierre antes de pasar solo.
- Textos de pantalla: `on the bunch` (y las demás referencias de la capa fija), `Last lap · 8.2 km to go`, `850 m to go`, `Next: Côte des Terrasses · Cat. 3 · in 26.5 km`, `↓ 3 dropping back`, `↑ 2 bridging across`, `+3 groups · 41 riders`, `Pulling: all 3 in turn`, `Pulling: both in turn`, `Pulling: 4 of 5 in turn`, `+2 teams`, `Your team · 1 in front · 5 in the bunch`, `Your rider · dropping back from the bunch`, `Your rider · bridging to the lead group`, `Your rider · out of the race`, `BREAKAWAY · 5 riders · +0:48 on the bunch`, `TIME CHECK · 98.5 km to go`, `+3 groups behind · 41 riders`, `CONTACT · 2 riders bridge across`, `3 of the 5 remain`, `BACK TOGETHER · 38 riders rejoin the bunch`, `FLAMME ROUGE · 1 KM`, y las causas del corte (`after a crash`, `in the crosswind`, `on the cobbles`, `on the climb`, `in the chase`).

**Dudas para el ensamblador.**
- Para §12.6 (la voz): medido con `l4/bunch.mjs`, de las líneas narradas que dicen «the bunch» salen con el grupo del título por debajo de dos tercios, cuando la barra no lo llama `Bunch`, 0 de 41 en la llana, 16 de 67 en la media, 22 de 48 en la reina e18, 4 de 48 en Flandes y 8 de 22 en Colombia (sobre todo `attack_go` y `attack_reeled`). D-18 manda que la voz lea `GroupRole`; §12.6 tiene que decir cómo (propuesta: el renderizador recibe el papel del grupo del protagonista en `instantAt(revealS)` para las plantillas cuyo `GROUP_NOUNS` tiene más de un nombre) o aceptar la contradicción por escrito. El `chaseIsBunch` del motor usa la mitad de los que corren y no los dos tercios (`simulate.ts` l. 4142-4144); solo afecta a `time_gap` y `front_group`, fuera de la voz de `Watch`, y al acta.
- Para §15.5 y el PR 4a de §17: `chaseReferenceIndex` no se exporta hoy en `packages/engine/src/index.ts` (l. 229-238 exporta otras seis de `group.ts`); el PR 4a la exporta, como a `NAME_WHOLE_GROUP_UP_TO` (15-c), y `apps/api/src/broadcastConstants.test.ts` compara `chaseRefOf` con ella sobre entradas generadas.
- Para §9.5: `Cue` (§4.9) no tiene variantes de crono. Si los rótulos de la crono entran en la cola de §6.5 (lo que aquí se recomienda, para que tampoco haya dos a la vez), §9 los propone como `CueKind` nuevos.
- Para §4.9 y §G.4: `cuesBetween` conserva su firma, pero la mitad de los rótulos los programa el reproductor (6-i); el comentario de §4.9 («Todo `Cue` se deriva al leer, en la web, del paso de un instante al siguiente») debería decir «o del reproductor».
