## 6. El estado en pantalla: lo permanente y lo eventual

Esta sección dice qué pinta `Watch` (pantalla) en cada fotograma y con qué dato: lo permanente, que está siempre y sale del instante (`Instant`, §4.5), y lo eventual, la cola de rótulos (`Cue`, §4.9), que entra y sale sin frenar nunca la carrera. Escribe como hechos nueve decisiones cerradas (D-03, D-14, D-17, D-18, D-21, D-22, D-27, D-48 y D-59) y decide lo que dejan abierto en los bloques del final. Los tipos son los de §4 y aquí solo se citan; las constantes son las de §15 y se nombran con su valor la primera vez. El ritmo, los mandos, la previa y el cierre por dentro son §8; la regla del maillot y el rótulo de corredor, §7. Las líneas de código son las de HEAD `9c21885`, comprobadas en `3fbd828`, que solo añade `docs/diseno/`. Las cifras nuevas de esta sección las ha medido su redactor en el scratchpad con el `dist` del motor v89 y el banco común de L1 (`l1/banco.mjs`, el campo de `scripts/race-radio.mjs`): `l4/instante.mjs` (el instante de §6.1) y `l4/bunch.mjs` (§6.3). La corrección (fase 5) añadió `l4c/cola.mjs` (la cola de §6.5 simulada entera, con la presentación de la fuga de §6.7, sobre el prototipo del grabador `l8/grab.mjs`), `l4c/motivos.mjs` (§6.4) y, del primer corrector de este lote, `c4/instante-voz.mjs` (la voz de §6.1) y `c4/cola.mjs`; y compiló el código de §6.3 a §6.7 contra los tipos de §4 con `tsc` estricto (`l4c/tsc`, el espacio de la corrección L2), sin errores; la auditoría L4 lo volvió a compilar con cada bloque en su fichero, detrás de los de §4.5 y §4.9 (`aud4/h`), quitó las importaciones que repetían las de §4.5 (`TS2300` y `TS2440`) y añadió la de `BROADCAST` en la cabecera de `names.ts`.

### 6.1 La pantalla `Watch` de arriba abajo

El instante que se dibuja es el de §3.3: `race-france` e18 (reina, 185 km), semilla 0, a las 2:09:00 de carrera. Son medidos la estructura, los tamaños, los huecos, los km, quién tira y por qué (`l1/ejemplo.mjs`, `l4/instante.mjs` y `l4c/motivos.mjs`, con la foto en cada bloque y la radio de producción por índice, D-08) y el suceso de la última línea de la voz (el `peloton_pull` del km 82,1, revelado a las 2:02:04, con tres relevistas de tres equipos que persiguen; `c4/instante-voz.mjs`). Son inventados los nombres de corredores y equipos (el banco los llama `rq-<equipo>-<n>`), escritos como están guardados, nombre y apellido (decisión 7-a), e ilustrativos los maillots y la línea del rótulo, porque el banco corre la etapa suelta, sin general de salida (`gcDeficitSeconds` 0 para todos). La línea de la voz es una de las tres redacciones que el journal tiene para ese caso (`apps/web/src/domain/stageJournal.ts` l. 968-981), con la identidad entera que pidió el dueño: «Cada vez que menciones un ciclista, pon su dorsal, su equipo entre paréntesis y su bandera» (`docs/balance.md` l. 1842, v13; `riderFull`, `stageJournal.ts` l. 233-248). En los dibujos, `[k]` es el `WornJerseyIcon` de cada corredor (aquí, la equipación de su equipo; un líder llevaría `[GC]` y un campeón `[IT*]`, §7.6) y `(IT)`, su bandera. La cabeza, tres corredores, va por el km 86,51 subiendo la Côte de Monteynard (2.ª, pie en el km 83,2, cima en el 92; nombre de `STAGE_FEATURES`, `packages/engine/src/routes/stageFeatures.ts`); el pelotón, 124, está en el km 84,97; tres corredores se descuelgan del pelotón y aún no han llegado al grupo de detrás (§3.3, punto 4).

En un teléfono de 360 × 800 px, el caso principal (mapa 03 §7), con `BottomNav` escondido mientras se reproduce (propuesta a E6, §18.6):

```
(pantalla · Watch · 360 px · 2:09:00 de carrera)
┌────────────────────────────────────────────────┐
│ 98.5 km to go               +3:46 ▲ on the bunch│  FixedOverlay, 40 px
├────────────────────────────────────────────────┤
│  ▁▁▂▅▇▆▃▁▁▂▃▄▅①②③ ④         ▂▃▅▆▇█             │  ProfileStrip, 56 px
│  Côte de Monteynard · Cat. 2 · summit in 5.5 km│
├────────────────────────────────────────────────┤
│ 1  [k]Nicolás Moreno · [k]Antoine Leroy · [k]J…│  GroupBar, 4 filas de 32 px
│ 2  [k]Erik Voss · [k]Rui Silva · [k]Pel…  +0:20│
│ 3  [k]Adam Nowak · [k]Felix Brandt        +0:40│
│ 4  BUNCH · 124            [GC] [PTS]      +3:46│
│    Pulling: Team Rho (chasing) +5 teams        │
│    ↓ 3 dropping back                           │
│    +3 groups · 41 riders                    ▾  │
│ Your rider · in the bunch · +3:46              │
├────────────────────────────────────────────────┤
│ [k] 15 Nicolás Moreno (ES)                     │  CueCard, 72 px
│     Team Alpha · 14th overall +4:02            │
├────────────────────────────────────────────────┤
│ An alliance on the front with 103 km to go: (… │  VoiceTicker, 24 px
├────────────────────────────────────────────────┤
│ ❚❚   ×1   Next action   Commentary           ⋯ │  PlayerControls, 48 px: se esconden a los 3 s sin tocar (8-p)
│ ├───────────────●──────────────────────────┤   │  (barra en km: 86,5 de 185)
└────────────────────────────────────────────────┘
```

Los nombres enteros no caben en la fila del teléfono (unos 336 px de ancho, §18.5): se escriben tal como están guardados, separados por `·`, y el último que no cabe se corta con `…`; tocar la fila abre el grupo con la identidad entera (§6.2). La línea de quién tira se queda con el primer equipo y `+N teams` cuando la de dos no cabe (6-d), y la voz, con lo que quepa: su línea entera está en `Commentary` (pantalla).

En escritorio (desde 1.024 px) cabe todo a la vez en dos columnas: a la izquierda, la capa fija, el perfil a todo el ancho y la barra con TODAS sus filas, su línea de quién tira y, bajo la fila de un grupo de cuatro a doce corredores, esos corredores con su maillot (§6.2); a la derecha, el rótulo arriba y debajo la última línea de la voz entera, con `Commentary` (pantalla) plegado, como en el móvil; los mandos, abajo a lo ancho, se esconden como en el móvil (8-p). La segunda línea de la capa fija (`2:09:00 · 22.9 km/h · 5.0% · 21°C · ▲ 0:24 in 5 km`) sale con cada cuadro de diferencias y al tocar la capa o pasarle el ratón (decisión 6-f). La versión anterior dejaba en escritorio la segunda línea siempre abierta y `Commentary` desplegado, la lista de lo ya dicho; una retransmisión «no es una lista» y lo que no ayuda a entender la carrera no está (`docs/agenda.md` l. 515-518, que desarrolla el norte que dio el dueño; Rdueno-014).

```
(pantalla · Watch · escritorio)
┌──────────────────────────────────────────────────────────────────┬──────────────────────────────────────┐
│ 98.5 km to go                             +3:46 ▲ on the bunch   │ [k] 15 Nicolás Moreno (ES)           │
├──────────────────────────────────────────────────────────────────┤     Team Alpha · 14th overall +4:02  │
│ ▁▁▂▅▇▆▃▁▁▂▃▄▅①②③ ④ ⑤ ⑥    ⑦      ▂▃▅▆▇█                          │                                      │
│ Côte de Monteynard · Cat. 2 · 8.8 km at 5.0% · summit in 5.5 km  ├──────────────────────────────────────┤
├──────────────────────────────────────────────────────────────────┤ An alliance on the front with 103 km │
│ 1  [k]Nicolás Moreno · [k]Antoine Leroy · [k]Jonas Kahn          │ to go: (IT) 215 Paolo Rota (Team     │
│    Pulling: all 3 in turn                                        │ Sigma), (FR) 95 Luc Martin (Team     │
│ 2  [k]Erik Voss · [k]Rui Silva · [k]Pelle Ekdal           +0:20  │ Theta) and (ES) 127 Mikel Sanz (Team │
│ 3  [k]Adam Nowak · [k]Felix Brandt                        +0:40  │ Iota) are the ones doing the pulling.│
│ 4  BUNCH · 124                    [GC] [PTS]              +3:46  │                                      │
│    Pulling: Team Rho (chasing), Team Kappa                       │ Commentary ▸                         │
│             (for 107 Andrea Rossi) +4 teams                      │                                      │
│    ↓ 3 dropping back                                             │                                      │
│ 5  GRUPPETTO · 35                                         +4:16  │                                      │
│ 6  GRUPPETTO · 5                                          +8:45  │                                      │
│    [k]Tom Reyes · [k]Olaf Berg · [k]Ian Moss · [k]Kai Lund · [k]…│                                      │
│ 7  [k]Mathis Duval                                       +13:23  │                                      │
│ Your rider · in the bunch · +3:46                                │                                      │
├──────────────────────────────────────────────────────────────────┴──────────────────────────────────────┤
│ ▶/❚❚   ×½ ×1 ×2 ×4   Next action   −5 km   +5 km   Next climb   Final 20 km   Last km   ⋯               │   se esconden a los 3 s (8-p)
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Los componentes viven en `apps/web/src/components/broadcast/` (§17.20) y la página en `apps/web/src/pages/StageWatch.tsx`. Ninguno lleva lógica de velo: pintan lo que les da el reproductor (`apps/web/src/domain/broadcast/player.ts`, §8.2), que solo tiene lo servido (D-06).

| Pieza (pantalla) | Componente | Lo que pinta | Dato (§4) | Repinta |
| --- | --- | --- | --- | --- |
| capa fija | `FixedOverlay` | km a meta, diferencia principal, tendencia y contra quién; con el cuadro de diferencias y al tocarla, reloj, velocidad, pendiente y tiempo | `Instant.toGoKm`, `lapsToGo`, `mainGap`; `t`; `GroupNow.detail.speedKmh` de la cabeza; `ProfileStrip.altM`; `StageWeather.spans` | `BROADCAST.overlayHz` (10) |
| perfil con cursores | `ProfileStrip` | la altimetría, los puertos, las volantes, un cursor por grupo y el puerto que viene | `ProfileStrip` (cabecera), `GroupNow.km`, `number`, `own` | `BROADCAST.barHz` (4) |
| barra de grupos | `GroupBar` | una fila por grupo con número, nombre, tamaño, hueco, maillots, el maillot de cada corredor de un grupo de hasta 12, quién tira, los que van en tránsito y el corredor propio | `Instant.groups`, `inTransit`; `RiderCard` del reparto por `RiderIx` (`worn`, `team.jerseySeed`) | `barHz` |
| el plano | `CueCard` | el rótulo del momento, uno a la vez | la cola de `Cue` (§6.5) | al entrar y salir un `Cue` |
| la voz | `VoiceTicker` | la última línea dicha; `Commentary` despliega las anteriores | `LiveLine` con `revealS ≤ t` (§12.2) | al entrar una línea |
| mandos | `PlayerControls` | pausa, velocidad, `Next action`, saltos, `Commentary`, la barra de progreso en km y `Show result` en el menú; se esconden a los 3 s sin tocar (8-p) | el reproductor (§8.5) | a cada toque |
| previa y cierre | `StagePreviewCards`, `StageClosingCards` | los cuadros de antes de la salida y de después de la meta | `StagePreview`, `StageClosing` (§6.11, §8.6) | por cuadro |
| puerta | `StageGateCard` | lo que sale en lugar de la etapa velada | `StageGate` (§11.12) | una vez |

El componente `ProfileStrip` y el tipo `ProfileStrip` de §4.2 comparten nombre por el glosario; el fichero del componente importa el tipo con alias (`import type { ProfileStrip as ProfileData } from '@cyclingstar/shared'`), como §4.1 hace con `Block`. Alturas en el teléfono, estimadas sobre las clases de hoy y sin medir en un navegador (la misma reserva del mapa 03 §7): 40 + 56 + 4 × 32 + 3 × 20 + 72 + 24 + 48, unos 430 px de 800 con los mandos a la vista y unos 380 con ellos escondidos (8-p); una fila 1 de cuatro a doce corredores suma los 20 px de su línea de maillots (§6.2). Lo mide a mano el paso 10 (§18.5), con los nombres enteros.

### 6.2 Lo permanente

D-17, escrito como hecho. Son permanentes la capa fija (km a meta de la cabeza, en metros dentro del último km y en vueltas si `laps > 1`, y la diferencia principal con su tendencia), la barra de grupos (hasta `BROADCAST.mobileGroupRows`, 4, filas en el móvil y `+N groups` para el resto, pantalla), el perfil con un cursor por grupo y el puerto que viene, y `Your rider · in the bunch · +2:14` (pantalla) si el espectador corre. Eventual es la cola de rótulos (D-21, §6.5). Es la jerarquía que la UCI exige por escrito al productor de la señal: «distance remaining to the finish and main time gap. This overlay should be permanently viewed on screen» (pliego de organizadores, §11.2, mapa 06 §1.1), más la capa de posiciones numeradas; y es la lista con que la agenda desarrolla el norte que dio el dueño ([DUEÑO 1]: el norte, la retransmisión de televisión, es suyo, commit `eee1b93`; la lista es de `docs/agenda.md` l. 505-515: cuánto queda, «2' 14" y si sube o baja», quién va en cada grupo, dónde estamos del perfil, el rótulo del momento y «Nada más»). `Watch` se aparta de esa lista en una cosa, y la dice: «quién va en cada grupo, con nombre y equipo, y cuántos son» (l. 512) sale en la fila, con el nombre y la equipación de cada uno, solo en los grupos de hasta tres; en los de cuatro a doce, la fila lleva el maillot de cada corredor (en escritorio, también su nombre), y el nombre de su equipo, y en el móvil el suyo, están a un toque, porque en 360 px no caben veinte datos a la vez (Rdueno-013). A ×60, que es el ritmo de la hora muerta (§8.2), un km de carrera pasa en poco más de un segundo de pantalla: por eso la barra es permanente y no un cuadro que se abre de vez en cuando (`estado.md` §4).

**La capa fija** (`FixedOverlay`, pantalla). Dos números a la izquierda y a la derecha, y contra quién:

- A la izquierda, los km a meta de la cabeza (`Instant.toGoKm`, que es la longitud menos el km pintado del grupo número 1): `98.5 km to go`, con un decimal. Dentro del último km, en metros redondeados hacia abajo a la decena: `850 m to go`. En un circuito (`ProfileStrip.laps > 1`), las vueltas delante: `3 laps to go · 42.5 km`, y en la última `Last lap · 8.2 km to go`.
- A la derecha, la diferencia principal (`Instant.mainGap`): `+3:46`, en minutos y segundos (`+1:02:10` desde la hora); por debajo de `BROADCAST.sameTimeS` (5 s de carrera), `s.t.`; con un solo grupo en carrera (`mainGap` nulo), `Bunch together`. Detrás, la flecha de la tendencia (`MainGap.trend.arrow`): `▲` si el hueco crece al menos `BROADCAST.trendMinS` (5 s) en los últimos `BROADCAST.trendWindowKm` (5 km), `▼` si baja lo mismo, nada si se mueve menos. Y contra quién, con la palabra de voz del grupo de detrás (§6.3): `on the bunch`, `on the chase group`, `on the race leader’s group`, `on Sam Carter` (un grupo de tres o menos se nombra por sus nombres, 7-a). La tele enseña solo el número, pero «sobre quién» es una de las cuatro preguntas de la regla del diario (SPEC §6.15, l. 598-600: «quién va delante, con cuánta ventaja, sobre quién y cuánto queda»), con la que la v27 contestó a la queja del dueño («si lees todo el Journal no SABES quién va ganando, quién va persiguiendo… es un lío los últimos mensajes», `docs/balance.md` l. 5975-5976; [DUEÑO 4]); y la v27 encontró que el hueco de aquel diario «se medía contra el grupo equivocado» (l. 6004): la referencia se dice.
- Con cada cuadro de diferencias (§6.7), mientras dura, y al tocarla (en escritorio, también al pasarle el ratón), una segunda línea con lo que la UCI pide «regularly and systematically displayed» (mapa 06 §1.1, punto 5): el reloj de carrera `2:09:00` (es `t`), la velocidad de la cabeza en su último km de foto (`GroupDetail.speedKmh`; si es nula, no se escribe), la pendiente del km en que va (`ProfileStrip.altM`: la cota del km siguiente menos la de este, entre 10), la temperatura y, si toca, `rain` y `crosswind` del tramo del tiempo congelado en que va la cabeza (`StageWeather.spans`, D-14), y el detalle de la tendencia, `▲ 0:24 in 5 km`. En el ejemplo de §6.1 la tendencia es medida: el pelotón iba a 3:22 de la cabeza en el km 79 y a 3:46 en el 84 (`l4/instante3.mjs`), 24 s en 5 km.

La diferencia principal se calcula con `mainGapOf`, el paso 10 de `instantAt` (§4.5), que se escribe aquí entero:

```ts
// packages/shared/src/broadcast/instant.ts (privada de instantAt, exportada para sus tests). Pura. Mismo fichero que el bloque de
// §4.5, que ya importa StartState y declara GroupNow y MainGap: repetirlos da TS2300 y TS2440. Este bloque añade:
import { BROADCAST } from './constants.js'

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

**La barra de grupos** (`GroupBar`, pantalla). Una fila por grupo de `Instant.groups`, en orden de carretera: el número de carretera (`GroupNow.number`, que renumera y no es identidad, UCI §11.2), el nombre (§6.3), el tamaño detrás del nombre cuando el nombre es una palabra de papel (`BUNCH · 124`; con nombres propios el tamaño se ve), el hueco a la cabeza en su último km de foto (`GroupNow.gap.toHeadS`: `+0:20`; `s.t.` por debajo de 5 s; la fila 1 no lleva hueco), los iconos de los maillots de líder que viajan dentro (`GroupNow.jerseys`, con los componentes de hoy, `LeaderJersey`, `apps/web/src/components/Jersey.tsx` l. 90, que distinguen por forma además de por color, `docs/navegacion.md` l. 455-457) y la marca del espectador. **El maillot de cada corredor.** Cada corredor que la barra nombra lleva delante su `WornJerseyIcon` (§7.4): el maillot de líder, el de campeón o la equipación de su equipo, leídos de su `RiderCard` en `BroadcastHead.cast` por `RiderIx` (`worn` y `team.jerseySeed`, ya con el velo; `GroupNow` no gana campo, §4.5). En un grupo de tres o menos son los nombres de la propia fila; en uno de cuatro a `BROADCAST.nameWholeGroupUpTo` (12), la fila gana una línea debajo con sus corredores por dorsal, cada uno con su icono y, en escritorio, con su nombre; en el móvil, solo los iconos, y solo bajo la fila 1 y las del espectador (decisión 6-c). Así los maillots de una fuga se ven sin tocar nada mientras la fuga exista: es la parte permanente del requisito del dueño, «cuando se escapan cinco, que se vean sus maillots» (`docs/encargos.md` l. 153-154), cuya parte eventual es la presentación de la fuga (§6.7, 6-m). En un grupo de más de doce, los iconos de la fila son los de los maillots de líder que viajan dentro, como hoy. Tocar una fila despliega el grupo: sus corredores nombrables con la identidad entera que pidió el dueño, dorsal, nombre, equipo y bandera, y su maillot llevado (`docs/balance.md` l. 1842, v13; la política de a quién se nombra es §7.7), y la cuenta del resto, `+118 riders` (pantalla); así se contesta «quién va en cada grupo, con nombre y equipo, y cuántos son» sin veinte datos a la vez. La fila nombra sin dorsal ni equipo, por espacio, y lo mismo hacen, del todo o en parte, los cuadros de varias filas (el de diferencias, la general virtual, la pancarta, los parciales de la crono, los grupos que llegan y los de la previa); la identidad entera la llevan la voz (`riderFull`, §12.2) y el rótulo de corredor (§7.1), y la da cualquier nombre de la pantalla a un toque: la fila despliega su grupo y un nombre saca su rótulo (`rider 'focus'`, §6.5) (Rdueno-016). Debajo de cada fila, dos líneas pequeñas si hay de qué: quién tira (§6.4) y los que van en tránsito desde ese grupo (`InTransit` con `from` en él): `↓ 3 dropping back` si su destino va detrás y `↑ 2 bridging across` si va delante (pantalla). Un corredor en tránsito no está en ninguna fila, y enseñarlo así es lo que la tele llama tierra de nadie: en el ejemplo, los tres que se descuelgan del pelotón en el km 84,95 pasan 25 s de carrera sin grupo (§3.3). En el móvil caben `mobileGroupRows` (4) filas, que se eligen en este orden y se pintan en el de carretera: la 1, la del pelotón, las del espectador, las que llevan un maillot y después las siguientes por orden de carretera; el resto se pliega en una línea, `+3 groups · 41 riders` (pantalla), que se abre al tocarla (decisión 6-c).

**El perfil con cursores** (`ProfileStrip`, pantalla; [DOC 2]: «La serie `t_s` por grupo permite al replay dibujar el cursor de cada grupo sobre la altimetría SVG», SPEC l. 596). La cota por km de la cabecera (`ProfileStrip.altM`) dibujada a todo el ancho, con los puertos sombreados y su categoría en la cima, las volantes con una marca y un cursor por grupo en su km del instante (`GroupNow.km`, que nunca vuelve atrás, D-04) con su número de carretera; el del espectador, resaltado. Debajo, siempre, el puerto que viene: si la cabeza va por él, `Côte de Monteynard · Cat. 2 · summit in 5.5 km`; si no, `Next: Côte des Terrasses · Cat. 3 · in 26.5 km` (pantalla), con los km que le quedan a la cabeza hasta la cima, el nombre de `ProfileStrip.climbs[].name` y, sin nombre, solo la categoría. El perfil no lleva ninguna marca de dónde pasa algo (§6.9). En el móvil, 56 px de alto; con `prefers-reduced-motion` los cursores saltan de km en km sin animarse (D-57). Con el reloj estimado del adaptador (`BroadcastHead.clock` `estimated`, §3.8), el cursor de todo grupo que no sea la cabeza se pinta hueco, sin relleno, y la barra escribe su km con `~`; el aviso `Recorded before full race data` lleva debajo `Positions of the groups behind are estimated` (pantalla, las dos). Con la línea grabada (`exact`), nada de eso. Nace en el 3c con su caso en `GroupBar.test.tsx` (§17.6).

**Tu corredor** ([DUEÑO 5]: el corredor propio se ve aunque no sea noticia; R23.7 de la táctica, «pero no dice quién es, wey», `docs/balance.md` l. 9594, v57). Una línea fija bajo la barra, `Your rider · in the bunch · +3:46` (pantalla), con la palabra de voz del grupo en que va (§6.3) y su hueco, que es el de su grupo en el último punto común (H-17; §3.5): nunca su reloj de foto, que suma deriva y marcaje (`simulate.ts` l. 9012). Si va en tránsito, lo dice: `Your rider · dropping back from the bunch · +3:46` o `Your rider · bridging to the lead group`, con el hueco del grupo que dejó (decisión 3-c). Si abandonó, `Your rider · out of the race`. Con varios corredores propios (el mánager de un equipo), una línea por papel: `Your team · 1 in front · 5 in the bunch · 2 in the gruppetto` (decisión 6-l). Sin corredor en la etapa, no hay línea.

| Lo permanente | Dato | Repinta | Qué lo pide |
| --- | --- | --- | --- |
| km a meta (metros en el último km, vueltas en un circuito) | `Instant.toGoKm`, `lapsToGo` | `overlayHz` (10) | UCI §11.2, capa fija; agenda l. 510 |
| diferencia principal, `s.t.` o `Bunch together` | `Instant.mainGap.gapS` | `overlayHz` | UCI §11.2, capa fija |
| tendencia `▲ ▼` | `MainGap.trend` | `overlayHz` | agenda l. 511, «y si sube o baja» |
| contra quién, `on the bunch` | `MainGap.behind` y su etiqueta | `overlayHz` | [DUEÑO 4], «sobre quién» |
| reloj, velocidad, pendiente, tiempo (con el cuadro de diferencias y al tocar) | `t`, `GroupDetail.speedKmh`, `altM`, `StageWeather` | `overlayHz` | UCI §11.2, punto 5 del mapa 06 §1.1 («regularly and systematically»); D-14 |
| barra de grupos numerada | `Instant.groups` | `barHz` (4) | UCI §11.2, capa de posiciones |
| el maillot de cada corredor de un grupo de hasta 12 (en el móvil, en la fila 1 y en las del espectador) | `GroupNow.members`, `RiderCard.worn` y `team.jerseySeed` | `barHz` | encargo l. 153-154 ([DUEÑO 3]); Rcobertura-008 |
| quién va en cada grupo, con nombre y equipo (los de tres o menos, en la fila; los demás, al tocarla) | `GroupNow.members`, `RiderCard` | `barHz` | agenda l. 512; UCI «composition regularly» |
| quién tira | `GroupNow.detail.pullers` | `barHz` | [DUEÑO 1] vía D-27; C1-C6 del mapa 05 §2.3 |
| perfil con cursor por grupo y puerto que viene | `ProfileStrip`, `GroupNow.km` | `barHz` | agenda l. 513; SPEC l. 596 ([DOC 2]) |
| tu corredor | `InstantContext.own`, `GroupNow.own`, `inTransit` | `barHz` | [DUEÑO 5]; R23.7 |

Los dos ritmos de repintado son iniciales y sin evidencia de los jueces: los mide a mano el paso 10 en 360 × 800 con la CPU a ×4 y, si no llegan a 30 fotogramas por segundo, se baja `barHz` y se simplifica el perfil antes de encender (D-56, §18.5). El instante se calcula una vez por fotograma y lo leen todos los componentes: no hay dos relojes en la misma pantalla.

### 6.3 Las cabeceras de grupo

D-18, escrito como hecho: un solo código, `GroupRole` (`lead`, `chase`, `bunch`, `gruppetto`), más `GroupLabel` (`role`, `names` para tres o menos, `jersey_group`, `together`), que leen la barra, la radio servida, la voz y el acta (I-07, O-10). Las palabras son las de SPEC §6.15 (l. 604-614), que ya usan el journal (140 tests) y `GROUP_NOUNS` del motor (`packages/engine/src/sim/coherence.ts` l. 571): `the lead group`, `the chase group`, `the bunch`, más `Gruppetto` / `the gruppetto` (DD-04). Es la regla C7 del dueño, que la dijo del relevo y vale igual para los grupos: «Binario: o tiras o no tiras. Se acabó el tercer estado intermedio. Un solo concepto, con el mismo nombre, en el motor y en la Race Radio.» (`docs/balance.md` l. 6740-6741, v34). Hoy la barra de la radio usa once textos de nueve formas (`groupName` y `JERSEY_GROUP_NAME`, `apps/web/src/components/RaceRadioPanel.tsx` l. 58-89: `Bunch together` y `Peloton`, l. 68; `Lead group`, l. 70; los tres del grupo del maillot, l. 85-89; `Chase group`, l. 72; `No man’s land`, l. 73; `Grupetto`, l. 74; el ordinal `2nd group`, `3rd group`…, l. 77; y `Group`, l. 78) y la voz tres (`apps/web/src/domain/stageJournal.ts` l. 52-54): el mismo grupo se llama `Peloton` en una y «the bunch» en otra (mapa 05 §6, contradicción 7).

**El papel, sobre el instante.** `groupRoleOf` recibe los grupos del instante en orden de carretera, cada uno con su tamaño y su `kind` (el del motor, con el título de pelotón de ESE instante, §4.5 paso 7), y el número de los que corren. Usa las dos reglas del motor que D-52 copia en `BROADCAST` y ata por test: `bunchMinShare` (2/3, `PELOTON_MIN_SHARE`, `packages/engine/src/sim/raceRadio.ts` l. 91 y 97-99: «¿Es este grupo EL PELOTÓN, o solo lleva su etiqueta?») y `chaseMinShare` (0,5, `STAGE.gapChaseMainFraction`, `packages/engine/src/constants.ts` l. 2657), con la misma cuenta con que el motor elige contra quién mide el boquete (`chaseReferenceIndex`, `packages/engine/src/stage/group.ts` l. 235-245, llamada en `simulate.ts` l. 4122-4133):

```ts
// packages/shared/src/broadcast/instant.ts: el papel CRUDO de §4.5 paso 9 (la histéresis va encima). Pura. Mismo fichero: el
// bloque de §4.5 importa RadioGroupKind y JerseyKind y declara GroupRole y GroupLabel, y el de mainGapOf (§6.2) importa BROADCAST.

/** Copia de chaseReferenceIndex (group.ts l. 235-245), atada por test (decisión 6-a; §15.5, 15-k). -1 si no hay nadie detrás.
 *  Se exporta para ese test, y broadcast/index.ts la reexporta. */
export function chaseRefOf(behind: readonly { readonly size: number; readonly racing: boolean }[], mainFraction: number): number {
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

`groupLabelOf` usa `JerseyKind` y `GroupLabel`, que el bloque de §4.5 importa y declara en el mismo fichero; `BROADCAST.byNamesUpTo` vale 3. Las palabras viven en una tabla cerrada, atada a sus uniones por tipo, en `packages/shared/src/broadcast/names.ts`:

```ts
// packages/shared/src/broadcast/names.ts
import type { JerseyKind } from '../jerseys.js'
import { BROADCAST } from './constants.js'
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
  jersey: {                                             // el grupo del maillot, igual en la barra, la radio servida, la capa fija y la voz (6-b)
    gc: ['Race leader’s group', 'the race leader’s group'],
    points: ['Points leader’s group', 'the points leader’s group'],
    kom: ['Mountains leader’s group', 'the mountains leader’s group'], // «Mountains leader», como JERSEY_LABEL (jerseys.ts l. 133-137)
  },
} as const satisfies {
  readonly role: Readonly<Record<GroupRole, readonly [string, string]>>
  readonly together: readonly [string, string]
  readonly jersey: Readonly<Record<JerseyKind, readonly [string, string]>>
}
```

La barra escribe las palabras de papel en mayúsculas (`LEAD GROUP`, es presentación, no otra palabra); la voz, en minúsculas y con artículo. El texto de una etiqueta lo da `groupLabelText(_locale, …)` en `names.ts`, que nace con el `locale` delante, con el tipo literal `'en'` y el nombre `_locale` mientras no lo lea (`noUnusedParameters`; 12-q, D-62). El grupo del maillot se llama igual en la barra, la radio servida, la capa fija y la voz: `Race leader’s group` en la fila, `on the race leader’s group` en la capa fija y «the race leader’s group» en la voz (decisión 6-b). La versión anterior dejaba que la voz lo nombrara por su papel, `the chase group`, porque su vocabulario vigilado eran cuatro nombres (`WATCHED_GROUP_NOUNS`, `packages/engine/src/sim/coherence.ts` l. 616), y eso daba dos nombres al mismo grupo en la misma pantalla, que es lo que la C7 prohíbe (Rdueno-017). El PR 4a, que ya añade `the gruppetto` a `GROUP_NOUNS` y a `WATCHED_GROUP_NOUNS` (D-18), añade también las tres del grupo del maillot, y la voz las dice cuando el grupo de su protagonista lleva esa etiqueta en `instantAt(revealS)` (§12.6). El maillot de la montaña se llama `Mountains leader’s group` y no `KOM leader’s group`: `KOM` es en esta pantalla la pancarta de montaña (`KOM · Côte d'Engins`, §6.7), y el maillot se llama «Mountains leader» en su `aria-label` de hoy (`JERSEY_LABEL`, `packages/shared/src/jerseys.ts` l. 133-137), en el rótulo (`Leader, mountains classification`, §7.1) y en la frase de la fuga (`the mountains leader`, §7.5) (Rcobertura-019). Un grupo de tres o menos se nombra por sus corredores en las dos, con el nombre tal como está guardado (7-a): en la barra, separados por `·` y cada uno con su maillot (`[k]Nicolás Moreno · [k]Antoine Leroy · [k]Jonas Kahn`), y cortado con `…` el que no quepa; en la voz, con la identidad entera, como ya hace el journal (`stageJournal.ts` l. 34: «Con tres o menos, sus nombres»; `riderFull`, l. 233-248).

**La lista cerrada, con su condición exacta** (pantalla, en inglés; `n` es el número de grupos en carretera y el grueso es el grupo con el título y al menos `bunchMinShare` de los que corren):

| Barra | Voz | Condición sobre el instante | Hoy en la radio |
| --- | --- | --- | --- |
| `Bunch together` | `the bunch` | `n = 1` | `Bunch together` (`RaceRadioPanel.tsx` l. 68) |
| `Lead group` | `the lead group` | el número 1, si no es el grueso, con más de tres | `Lead group` (l. 70) |
| `Chase group` | `the chase group` | entre la cabeza y el grueso; sin grueso, del 2 al grupo del título; y, sin grueso, el de referencia de `chaseReferenceIndex` aunque vaya detrás del título (el trozo de atrás de una criba) | `Chase group` (`contra`, l. 72), `2nd group` o `Group` |
| `Bunch` | `the bunch` | el grupo con el título y al menos 2/3 de los que corren | `Peloton` (l. 68) |
| `Gruppetto` | `the gruppetto` | detrás del grueso; sin grueso, detrás del título y no es la referencia | `Grupetto` (l. 74), `No man’s land` (l. 73) |
| `Race leader’s group` · `Points leader’s group` · `Mountains leader’s group` | `the race leader’s group` y las otras dos (6-b) | papel `chase` o `gruppetto`, más de tres corredores y un maillot de líder dentro; manda `JERSEY_PRIORITY` (gc, points, kom, `packages/shared/src/jerseys.ts` l. 22) | los mismos (l. 85-89), con `KOM leader’s group` por el de la montaña, elegidos por el orden gc, kom, points de la radio (l. 102) |
| los nombres, cada uno con su maillot | los nombres, con la identidad entera | tres corredores o menos, sea cual sea el papel | no: `No man’s land` o el papel |

**Casos, con lo que dice hoy la radio y lo que dirá la barra.** Los ocho primeros son los de `raceRadioNames.test.tsx` (`apps/web/src/components/`, seis `it`), que D-18 re-sella a propósito en el paso 6; los demás, nuevos, van a `packages/shared/src/broadcast/instant.test.ts` con `groupRoleOf` y `groupLabelOf`:

| Caso (orden de carretera; tamaño de los que corren) | Hoy, `groupName` | E2 |
| --- | --- | --- |
| el pelotón de 129 de 130 en cabeza, y uno suelto detrás | `Peloton` | `Bunch`; el suelto, por su nombre |
| 130 de 130 en un solo grupo | `Bunch together` | `Bunch together` |
| el pelotón de 110 de 130, segundo en carretera | `Peloton` | `Bunch` |
| la carrera partida en 59 (primero) y 65 (segundo, con el título) de 124 | `Lead group` y `2nd group` | `Lead group` y `Chase group`: 65 de 124 no llega a 2/3, y persigue |
| una contra de 8 entre la cabeza y el pelotón de 115 de 130 | `Chase group` | `Chase group` |
| un corredor suelto (`tierra`), tercero | `No man’s land` | su nombre |
| un grupeto de 12 detrás del pelotón | `Grupetto` | `Gruppetto` |
| el grupo del título con 40 de 130, tercero | `3rd group` | `Chase group` |
| el líder de la general en un grupo de 20, detrás del pelotón | `Race leader’s group` | `Race leader’s group` |
| una fuga de 5, el título con 100 de 176 (57 %) y 71 detrás | `Lead group`, `2nd group`, `Grupetto` | `Lead group`, `Chase group`, `Gruppetto` |
| el título con 100 de 176 en cabeza y 76 detrás, sin fuga | `Lead group`, `Grupetto` | `Lead group` y `Chase group`: los 76 son la referencia de `chaseReferenceIndex` |
| el instante de §6.1: 3, 3, 2, 124 (con el título), 35, 5 y 1 de 176 | `Lead group`, `Chase group`, `Chase group`, `Peloton`, `Grupetto`, `Grupetto`, `Grupetto` | tres filas con nombres, `Bunch`, `Gruppetto`, `Gruppetto` y un nombre |

**Lo que se retira, y por qué.** `Peloton`, por DD-04 (la palabra de SPEC y del journal es `Bunch`). `No man’s land`, porque el `tierra` del motor es un movimiento que ha quedado DETRÁS del pelotón o a su altura (`kindOf`, `raceRadio.ts` l. 361-383) y la tierra de nadie de la tele es un suelto entre dos grupos de delante (mapa 06 §1.3): la misma palabra para dos cosas; el suelto, además, tiene tres o menos y se nombra por su nombre. `2nd group` y `3rd group`, porque el número de carretera no es identidad (la tele renumbera, UCI §11.2) y ya va delante de cada fila; era el remedio de la radio al caso del dueño en que «media carrera NO es el pelotón» (`raceRadioNames.test.tsx` l. 26-30), que ahora es `Chase group`. `Group`, porque no dice nada. Y la grafía `Grupetto`, que es `Gruppetto` en italiano y en la tele (mapa 06 §1.3).

**La histéresis del papel** (I-04, D-03, decisión 4-q de §4.5). El papel crudo de `groupRoleOf` se enseña si coincide con el de hace `BROADCAST.roleHysteresisKm` (1 km) de la marcha del grupo, o si un `move` de más de un corredor tocó ese grupo en ese km; si no, se queda el de entonces. Así la barra no parpadea cuando dos grupos se cruzan el papel en un par de bloques. La etiqueta sigue al tamaño sin espera: que un grupo pase de tres a cuatro corredores es un hecho, no una lectura. La identidad de cada fila es el id del motor con su sucesor por mayoría (§3.7): una fuga cazada no es una fila que desaparece y otra que aparece, es un cursor que se funde con el de su cazador.

**Lo que esto no arregla, medido.** La voz no calcula el papel: la dicen las plantillas del journal con nombres fijos por variante (`stageJournal.ts` l. 365-461, 688-702, 933-961), y el motor llama `the bunch` al grupo del título que corresponda sin mirar su cuota. En `time_gap` y `front_group` la elige con otro listón, la MITAD de los que corren y no los dos tercios (`chaseIsBunch`, `simulate.ts` l. 4142-4144), pero esas dos plantillas no están en la voz de `Watch` (D-43, punto 5). Las demás que dicen «the bunch» sí: medido con `l4/bunch.mjs` sobre las cinco etapas de §8.3 y las semillas 0 y 1, contando las líneas narradas cuyas plantillas tienen `the bunch` en `GROUP_NOUNS` (fuera `time_gap`, `time_gap_run` y `front_group`) y la cuota del grupo del título en la foto de su km, salen con el título por debajo de 2/3, es decir cuando la barra NO lo llama `Bunch`, 0 de 41 en la llana e7, 16 de 67 en la media e13, 22 de 48 en la reina e18, 4 de 48 en Flandes y 8 de 22 en Colombia e5 (sobre todo `attack_go` y `attack_reeled`, con cuotas de 0,11 a 0,66). En la reina, casi la mitad de las veces que la voz dice «the bunch» la barra dice `Chase group` o `Lead group` para ese mismo grupo. D-18 manda que la voz lea `GroupRole`; cómo (la plantilla recibe el papel del grupo de su protagonista en `instantAt(revealS)` y no el `kind` del motor) es §12.6, y queda anotado para su redactor con estas cifras.

**DD-04, la palabra del grupo principal.** Por defecto, `Bunch` (SPEC §6.15), con `Lead group`, `Chase group` y `Gruppetto`. `Peloton` es la palabra de la tele y la de la radio de hoy; cambiarla es cambiar una entrada de `GROUP_WORDS` y re-sellar `GROUP_NOUNS` y los 140 tests del journal (`stageJournal.test.ts`), que vigilan que ninguna frase imprima un nombre que su plantilla no declare (`coherence.ts` l. 565-571). La C7 del dueño pide una sola palabra, no cuál: «Un solo concepto, con el mismo nombre, en el motor y en la Race Radio» (`docs/balance.md` l. 6740-6741, v34), y trataba del relevo. `Bunch` es la de SPEC §6.15 y la del journal (140 tests); `Peloton` es la de la tele, la del código del motor (`kind: 'peloton'` en `radioGroupKindSchema`, `packages/shared/src/contracts.ts` l. 1346, y cinco plantillas: `peloton_pull`, `peloton_split`, `peloton_concedes`, `peloton_selection` y `peloton_regroup`), la de la radio de hoy y la del propio dueño («tenemos el pelotón con 129 ciclistas, etiquetado como lead group y no como pelotón», `apps/web/src/components/raceRadioNames.test.tsx` l. 13-14; «Cada vez que alguien tire del pelotón», `docs/balance.md` l. 1843). El corte de dos tercios decide cuándo un grupo es el grueso, no cómo se llama: la tele sigue llamando pelotón al grupo del líder aunque sea de 40 (mapa 06 §1.3). Por eso la palabra es del dueño (DD-04), con esto delante (Rdueno-018).

### 6.4 Los que tiran

D-27, en lo que toca a la pantalla (la política entera de a quién se nombra es §7.7): cada grupo que tira lleva una línea, `Pulling: Team Beta (for 11 Sam Carter)` (pantalla; I-46), con el porqué de cada equipo. Es lo que el dueño pidió al journal y a la radio en seis tandas, del «quién tira del pelotón» de la v11 al «pero no dice quién es, wey» de la v57 (mapa 05 §2.3, C1 a C6), llevado a la pantalla por defecto: la radio lo tiene hoy en su foto de un km (`Pulling (12 of 27)`, `RaceRadioPanel.tsx`), y `Watch` lo resume en una línea por fila. El dato es la capa de detalle del último km de foto que el grupo ha cruzado (`GroupNow.detail`, §4.5): quién está en el turno, su motivo y para quién (`Puller`, §4.2), con el turno de tres km que fijó el dueño (`TURNO_KM`, `raceRadio.ts` l. 597) y el tope de doce guardados (`STORED_PULLERS_MAX`, l. 591). Se ve al pasar el grupo por ese km (D-06), así que la línea tiene como mucho un km de retraso, el mismo que la radio.

```ts
// packages/shared/src/broadcast/names.ts (sigue). Datos, no texto: el componente pone las palabras (E10).
import type { PullMotive } from '../contracts.js'
import type { GroupDetail, RiderIx } from './timeline.js'
import type { RiderCard } from '../jerseys.js'

export type PullingLine =
  | { readonly k: 'in_turn'; readonly pulling: number; readonly of: number }          // todos los equipos del grupo relevan
  | { readonly k: 'teams'; readonly teams: readonly { readonly teamId: string; readonly count: number; readonly forRider: RiderIx | null; readonly motive: PullMotive | null }[]; readonly moreTeams: number }

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
  const motiveOf = (team: string): PullMotive | null => {       // el motivo de más relevistas del equipo; a igualdad, el que sale antes en detail.pullers
    const n = new Map<PullMotive, number>()
    for (const p of detail.pullers) if (teamOf(p.rider) === team && p.motive !== null) n.set(p.motive, (n.get(p.motive) ?? 0) + 1)
    let best: PullMotive | null = null
    let most = 0
    for (const [m, c] of n) if (c > most) { best = m; most = c }  // el Map guarda el orden de inserción: el primero en llegar gana el empate
    return best
  }
  return { k: 'teams', teams: ranked.slice(0, 2).map(([teamId, rs]) => ({ teamId, count: rs.length, forRider: forOf(teamId), motive: motiveOf(teamId) })), moreTeams: Math.max(0, ranked.length-2) }
}

/** El porqué de un equipo en la línea, en pocas palabras (pantalla): las frases de la radio sin destinatario (motiveLabel,
 *  RaceRadioPanel.tsx l. 162-213), acortadas para una línea. Un motivo nuevo no compila sin su palabra. */
export const PULL_MOTIVE_WORDS = {
  solo: 'alone', abanico: 'in the echelon', tren: 'lead-out', fuga: 'working the break', persecucion: 'chasing', grupeto: 'just riding',
  equipo_etapa: 'for the stage', equipo_maillot: 'defending the jersey', equipo_general: 'for the GC', rol: 'team duty', propio: 'own tempo',
  equipo_puntos: 'for the points jersey', equipo_montana: 'for the mountains jersey', infiltrado: 'sitting on', colocando: 'guarding the leader',
} as const satisfies Readonly<Record<PullMotive, string>>
```

`BROADCAST` lo importa la cabecera de `names.ts` (§6.3). El componente escribe (pantalla): con `in_turn`, `Pulling: all 3 in turn`, `Pulling: both in turn` con dos, y `Pulling: 4 of 5 in turn` si no están todos en el turno; con `teams`, el nombre de cada equipo (`RiderCard.team.name`) y, entre paréntesis, por qué tira: si al menos dos de sus relevistas comparten destinatario, `(for 107 Andrea Rossi)`, con el dorsal y el nombre de ese corredor tal como está guardado (7-a); si no, el motivo del equipo en las palabras de `PULL_MOTIVE_WORDS`, `(chasing)`, `(for the GC)`, `(defending the jersey)`; sin motivo, nada; y `+2 teams` si tiran más de dos. Es lo que el dueño pidió para lo que se lee de la carrera, que ahora es `Watch`: «Cada vez que alguien tire del pelotón, tienes que mencionar por qué: está trabajando para alguien, ¿no? Si no, no debería desgastarse a lo wey» (`docs/balance.md` l. 1843-1844, v13) y «no es solo saber qué equipo(s) participan de la persecución... también es saber POR QUÉ!!» (l. 2571-2574, v15). La versión anterior dejaba el porqué en la voz, que lo dice una vez (`peloton_pull` y `chase_work` son `voice_only`, y `dropRepeatedPulls` quita la repetición), mientras la línea seguía en pantalla kilómetro tras kilómetro sin él (Rdueno-015). El motivo de CADA relevista, uno a uno, sigue siendo del microscopio del dueño, `Race Radio` ([DUEÑO 10]); aquí va el del equipo. En el instante de §6.1, medido en la radio de producción del km 84 (`l4/instante2.mjs`): el pelotón tenía 20 corredores en el turno, de los que los doce guardados eran cuatro del equipo `rq-team-17`, tres del `rq-team-9` que tiraban para `rq-9-6` (motivo `equipo_etapa`), dos del `rq-team-0` y uno de otros tres; los cuatro del `rq-team-17` tiraban dos por `persecucion` y dos por `rol`, y en el orden guardado sale antes un `persecucion` (`l4c/motivos.mjs`); la línea es `Pulling: Team Rho (chasing), Team Kappa (for 107 Andrea Rossi) +4 teams` con los nombres inventados de §6.1, y en el móvil, donde no cabe, `Pulling: Team Rho (chasing) +5 teams`. La fuga de tres (dos del `rq-team-0` y uno del `rq-team-21`, motivo `fuga`) da `Pulling: all 3 in turn`.

En escritorio, la línea va debajo de toda fila que tire. En el móvil, solo debajo de la fila del pelotón y de las del espectador, y con un solo equipo y `+N teams` si la de dos no cabe en el ancho; las demás salen al tocar la fila (decisión 6-d): con cuatro filas de 32 px y 360 px de ancho, una línea más por fila deja la barra en dos grupos visibles. Cada nombre que la línea dice tiene rótulo: B3 exige que todo corredor de todo grupo lo tenga en todo instante (100 %), y hoy, en la radio guardada, fuera del pelotón en las reinas solo lo tiene del 47 al 64 % (mapa 01 §2.3); la línea de quién tira es la parte más visible de ese 100 %.

### 6.5 Lo eventual: la cola de rótulos

D-21, escrito como hecho, con lo que la corrección le cambió (D-21 corregida en la fase 5 con la medida de §6.7). Cada `Cue` tiene una clase (`CUE_CLASS`): 3, meta, caza de la fuga, corte, cambio de líder virtual, caída o abandono de un maillot o de un top 5 de salida y, en crono, el que se sienta en el sillón; 2, ataque, fuga formada y su frase, pancarta, caída, llama roja, fuera de control, la ronda de la moto (6-m) y, en crono, el mejor paso por un control y la general virtual (9-n); 1, diferencias generales, grupo cambiado, percance, rótulo de corredor y los demás rótulos de la crono; 0, ficha del puerto y la ronda `ON COURSE` de la crono (9-k). Un rótulo de corredor a la vez (mapa 06 §5.3: nunca dos lower thirds de corredor a la vez). Cada `Cue` ocupa `BROADCAST.cueHoldS[clase]` segundos de pared (3, 4, 5 y 6 por clase de 0 a 3) SIN parar el reloj, salvo la ronda de la moto, que ocupa `cueHoldS[0]` (6-m); con `BROADCAST.cueQueueMax` (3) esperando, se descartan los de clase 0 y 1. La presentación de la fuga (la lista, la frase y la ronda) va reservada: no cuenta para `cueQueueMax` y no se descarta, ni se desplaza, ni caduca por esperar (6-m, §6.7). La carrera nunca se frena por la cola (I-21, O-27). Sin evidencia de los jueces: `television.md` §5.3 frenaba la carrera con la cola llena (`cueQueueBrake`, `cueBrakeFactor`) y aquí se quita por coherencia con I-38, para que la duración de una etapa no dependa de lo que pasa en ella (§8.2, B9). La miden la prueba de lectura (§16.5), B17 y, la presentación de la fuga, la segunda parte de B3 (§6.7, §16.4).

```ts
// packages/shared/src/broadcast/cues.ts (sigue a los tipos de §4.9)
import { BROADCAST } from './constants.js'
import type { StartState } from './wire.js'

/** LA CLASE DE CADA RÓTULO (D-21), por su CueKind. cueClassOf la sube o la baja en los casos que dependen de quién o de qué ronda. */
export const CUE_CLASS = {
  finish: 3, caught: 3, split: 3,                                                   // meta, caza de la fuga, corte
  attack: 2, break_formed: 2, break_presented: 2, banner_result: 2, crash: 2, last_km: 2, time_cut: 2,
  time_check: 1, group_changed: 1, mishap: 1, rider: 1, dropped: 1, abandon: 1, virtual_gc: 1, group_finish: 1,
  tt_start_order: 1, tt_split: 1, tt_finish: 1,                                     // la crono (§9.5): cueClassOf sube el mejor paso y el sillón
  climb_ahead: 0,                                                                    // la ficha del puerto
} as const satisfies Readonly<Record<CueKind, CueClass>>

/** Sube a 3 lo que D-21 pone en 3 por su protagonista; la ronda de la moto va a 2 (6-m) y la de la crono a 0 (9-k). Pura.
 *  lastVirtualLeader: el primero del último VIRTUAL GC que salió; antes del primero de la etapa, start.leaders.gc, para que «cambia
 *  el líder virtual» se mida contra el líder de la general y no contra nada (9-n). timeTrial: BroadcastHead.stage.timeTrial. */
export function cueClassOf(cue: Cue, start: StartState, lastVirtualLeader: RiderIx | null, timeTrial: boolean): CueClass {
  const top = new Set<RiderIx>([
    ...[start.leaders.gc, start.leaders.points, start.leaders.kom].filter((r): r is RiderIx => r !== null),
    ...start.gcTop.filter((r) => r.rank <= BROADCAST.cueTopStart).map((r) => r.rider),
  ])
  switch (cue.kind) {
    case 'rider': return cue.context === 'break_round' ? 2 : cue.context === 'tt_round' ? 0 : CUE_CLASS.rider
    case 'crash': return cue.riders !== null && cue.riders.some((r) => top.has(r)) ? 3 : CUE_CLASS.crash   // sin nombres, 2 siempre
    case 'dropped': case 'abandon': return top.has(cue.rider) ? 3 : CUE_CLASS[cue.kind]
    case 'virtual_gc': return cue.rows[0] !== undefined && cue.rows[0].rider !== lastVirtualLeader ? 3 : timeTrial ? 2 : CUE_CLASS.virtual_gc
    case 'tt_split': return cue.rank === 1 ? 2 : CUE_CLASS.tt_split
    case 'tt_finish': return cue.hotSeat ? 3 : CUE_CLASS.tt_finish
    default: return CUE_CLASS[cue.kind]
  }
}

/** LA PRESENTACIÓN DE LA FUGA (6-m, §6.7): la lista, la frase y la ronda de la moto, que la cola lleva reservadas. Pura. */
export function isPresentation(cue: Cue): boolean {
  return cue.kind === 'break_formed' || cue.kind === 'break_presented' || (cue.kind === 'rider' && cue.context === 'break_round')
}
```

`BROADCAST.cueTopStart` vale 5 y `start` es la salida servida, ya degradada por el velo (B13): un maillot que viene de una etapa velada no sube la clase de nadie. `CUE_CLASS` lleva las tres claves de la crono porque `satisfies Readonly<Record<CueKind, CueClass>>` no compila sin ellas con los `Cue` de §4.9 (TS1360, compilado por la corrección L2), y `timeTrial` es el cuarto parámetro que pide la general virtual de la crono (9-n). La caída sin nombres (el primer tiempo de `CRASH`, D-13) es siempre de clase 2, aunque haya caído el líder: si fuera de clase 3, el tiempo que el rótulo dura en pantalla delataría quién está en el suelo antes de que la tele lo sepa (mapa 06 §3.1). El descolgado de un maillot o de un top 5 sube a 3 igual que su caída y su abandono (decisión 6-g): D-21 no lo nombra, y `Yellow jersey in difficulty` es de lo que más para una retransmisión (mapa 06 §3.1).

| `CueKind` | Clase | De dónde sale | Rótulo (pantalla) |
| --- | --- | --- | --- |
| `finish` | 3 | el reproductor, tras `BroadcastFinish` (§8.7) | `STAGE WINNER · 21 Luca Bertolini · Team Alpha · 4:12:33` |
| `caught` | 3 | `breakaway_caught` | `CAUGHT · the lead group · 12.4 km to go` |
| `split` | 3 | `peloton_split`, `peloton_selection`, `echelon_split` | `SPLIT IN THE BUNCH · in the crosswind`; `ECHELONS` |
| `attack` | 2 | `attack_sticks` | `ATTACK` con el rótulo de corredor del primer atacante por notoriedad (§7.1, §7.5): `ATTACK · [IT*] 21 Luca Bertolini (IT) · Team Alpha · Champion of Italy`; con más, `and 2 others` (hasta tres, R23.4; 6-p) |
| `break_formed` | 2, reservado (6-m) | `breakaway_formed` | `BREAKAWAY · 5 riders · +0:48 on the bunch`, con la lista por dorsal y el maillot de cada uno (§6.7) |
| `break_presented` | 2, reservado (6-m) | el reproductor, tras `break_formed` | la frase de la fuga de `breakHeadline` (§7.6) |
| `banner_result` | 2 | `climb_kom`, `sprint_intermediate` | `KOM · Côte d'Engins (Cat. 1) · 1. Antoine Leroy 10 pts · 2. Jonas Kahn 8 · 3. Nicolás Moreno 6` |
| `crash` | 2 (3 con nombres de un maillot o un top 5) | la caída sintetizada de `incidents` (D-13) | `CRASH`, y `BROADCAST.crashNamesDelayS` (3 s) después, `CRASH · 45 Jules Moreau · 88 Iñigo Arrieta` |
| `last_km` | 2 | el estado: la cabeza cruza 1 km a meta | `FLAMME ROUGE · 1 KM · 2 in front · +0:08` |
| `time_cut` | 2 | el reproductor, tras `BroadcastFinish` | `TIME CUT · 12 riders outside the limit` |
| `time_check` | 1 | el reproductor, cada `BROADCAST.gapsTableEveryRealS` (25 s de pared) | el cuadro de diferencias (§6.7) |
| `group_changed` | 1 | el estado (grupos de hasta 12) y `peloton_regroup` | `CONTACT · 2 riders bridge across`; `3 of the 5 remain`; `BACK TOGETHER · 38 riders rejoin the bunch` |
| `mishap` | 1 | `puncture`, `mechanical` | `PUNCTURE · 45 Jules Moreau`; `MECHANICAL · 45 Jules Moreau` |
| `rider` | 1 (2 y reservado en la ronda de la moto, 6-m; 0 en la ronda `ON COURSE` de la crono, 9-k) | el reproductor: la ronda de la moto, tras una pancarta, al tocar un nombre, el corredor propio y la ronda de la crono (§9.5) | el rótulo de corredor de §7.1 |
| `dropped` | 1 (3 un maillot o un top 5) | `leader_dropped`, `rider_bonks` | `DROPPED · 11 Sam Carter · Race leader · +0:25` |
| `abandon` | 1 (3 un maillot o un top 5) | `rider_abandons` | `ABANDON · 45 Jules Moreau · Team Gamma` |
| `virtual_gc` | 1 (2 en crono, 9-n; 3 si cambia el líder virtual) | el reproductor, con el cuadro de diferencias; en crono, al paso del líder por un control o por la meta (§9.5) | `VIRTUAL GC · after 128.0 km` (§6.7) |
| `group_finish` | 1 | el reproductor, tras `BroadcastFinish` | `BUNCH · +2:14` |
| `climb_ahead` | 0 | el reproductor: `BROADCAST.climbCardLeadKm` (3 km) antes del pie de un puerto | `Côte de Monteynard · Cat. 2 · 8.8 km at 5.0% · summit in 11.8 km` |
| `tt_start_order` | 1 | el reproductor, en `t = 0`, con `BroadcastHead.tt` (§9.5) | `Start order: reverse general classification, every 2:00 · 176 riders` |
| `tt_split` | 1 (2 si es el mejor paso por ese control, 9-d) | el reproductor, del paso de un `TimeTrialInstant` al siguiente (§9.5) | `SPLIT 1 · km 9 · 1. Mads Olsen 18:03 · 2. Iñigo Arrieta +0:13 · …` |
| `tt_finish` | 1 (3 si se sienta en el sillón) | ídem | `FINISH · HOT SEAT · 71 Mads Olsen 38:04 · −1:23 on Jan Novák` |

**Qué produce `cuesBetween` y qué el reproductor.** `cuesBetween(prev, next, events)` (la firma de §21.6 F.2) es pura y solo conoce la línea: los rótulos de los sucesos revelados en `(prev.t, next.t]` (por `CUE_OF_TEMPLATE`, §6.6) y los de los cambios de estado entre los dos instantes. Lo que depende del espectador, del recorrido o del reloj de pared lo añade el reproductor (`apps/web/src/domain/broadcast/player.ts`), que tiene el reparto servido, la salida, el perfil y el reloj de pared (decisión 6-i):

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
  rider 'break_round'      tras break_presented, uno por corredor de breakRoundOf (§6.7), por dorsal, cada breakRoundEveryS (6 s)
                           de pared; solo en Watch a ×½, ×1 y ×2: al pasar a ×4 o a Highlights, lo que queda de la ronda se tira (6-m)
  la presentación otra vez tras While you skipped o Previously, la de cada fuga que siga por delante del pelotón y cuya lista
                           no se haya pintado en esta reproducción (6-m)
  rider 'banner'           tras banner_result, el que ganó la pancarta
  rider 'own'              cuando un corredor del espectador cambia de grupo (un move visible)
  rider 'focus'            al tocar un nombre: sale enseguida, fuera de la cola
  la crono (§9.5)          Start order en t = 0; SPLIT y FINISH del paso de un TimeTrialInstant al siguiente; la ronda ON COURSE
                           (rider 'tt_round')
  crash con nombres        crashNamesDelayS (3 s) de pared después del CRASH sin nombres
  climb_ahead              cuando la cabeza pasa por footKm − climbCardLeadKm de un puerto de ProfileStrip.climbs
  finish, group_finish, time_cut   tras POST …/broadcast/finish (§8.7)
```

**La cola**, en el reproductor, por fotograma de pared. Sus dos pasos, `admitir` y el fotograma, son funciones puras sobre el estado de la cola (lo que espera, cada uno con su hora de admisión en pared, y lo que está en pantalla, con la hora en que sale) y viven en `packages/shared/src/broadcast/cues.ts`, junto a `cueClassOf` e `isPresentation`: el reproductor guarda ese estado y las llama en cada fotograma, `cues.test.ts` prueba sus reglas (§16.6) y la segunda parte de B3 las corre desde la web (§16.4). Todo lo que entra se ordena por clase y, a igual clase, por hora de carrera:

```
admitir(c):                                                        // c ya con su clase k = cueClassOf(c, …)
  si la cabeza está a menos de quietFinalM (500 m) y c es un rider: descartar           // solo la distancia (D-17)
  si isPresentation(c): meter c, reservado                                             // 6-m: ni cuenta ni se descarta
  si los no reservados que esperan son menos de cueQueueMax: meter c
  si no, si k ≤ 1: descartar c                                                          // D-21
  si no, si hay alguno no reservado esperando de clase ≤ 1: sacar el de menor clase y más viejo; meter c
  si no, si k = 2 y hay alguno no reservado de clase 2 esperando: sacar el más viejo; meter c   (decisión 6-h)
  si no: meter c                                                    // solo clase 3: la cola crece; la meta nunca se tira
orden de la espera: por clase; a igual clase, la ronda de la moto detrás de los demás; después, por hora de carrera
cada fotograma:
  quitar de la espera los reservados que ya no presentan nada (6-m): el rider 'break_round' cuyo corredor ya no va,
    en el instante, en un grupo por delante del que lleva el título de pelotón; la lista y la frase de una fuga de la que ya no va ninguno
  quitar de la espera los no reservados de clase ≤ 2 que llevan más de cueHoldS[3] (6 s) de pared esperando   (decisión 6-h)
  si hay uno en pantalla y se le acabó su tiempo (cueHoldS[su clase]; la ronda de la moto, cueHoldS[0]): quitarlo
  si hay uno en pantalla de clase ≤ 1 y el primero de la espera es de clase 3: cortarlo      // la tele corta
  si no hay ninguno en pantalla, la cabeza está a más de quietFinalM y hay espera: sacar el primero
```

Lo que la cola tira no se pierde para quien quiere leerlo: su suceso tiene línea en la voz y queda en `Commentary`. Y tira mucho, medido con la cola entera (`l4c/cola.mjs`, las 22 etapas en línea del mapa 07 §7 por dos semillas, §6.7): en `Watch` a ×1, fuera de la presentación de la fuga, salen enteros el 69 % de los rótulos de clase 2 (el ataque, 98 de 123; la pancarta, 189 de 210), el 35 % de los de clase 1 (el cuadro de diferencias, 437 de 706; `group_changed`, 1.110 de 3.636) y el 52 % de las fichas de puerto, y casi todos los de clase 3 (la caza, 18 de 18; el corte, 95 de 96); en `Highlights`, el 38 %, el 9,5 % y el 11 %. La prueba de lectura (§16.5) dice si con eso se entiende la carrera; si no, lo que se toca es `cueHoldS` y `cueQueueMax`, no el motor. La caducidad de seis segundos es lo que mantiene la tele a su hora: a ×60, un rótulo que espera 18 s de pared llega 18 minutos de carrera tarde, y un `ATTACK` de un corredor al que ya han cazado contradice la barra. A ×300 (`Highlights`, §8.1), la cola descarta mucho más y se queda con las clases 2 y 3, que es lo que un resumen tiene que conservar (mapa 06 §5.4). `Next action` acelera ×`BROADCAST.nextActionSpeedup` (20) hasta que ENTRA en la cola un `Cue` de clase ≥ `nextActionMinClass` (2) que no sea de la ronda de la moto (§8.5; la ronda presenta un suceso, no lo es): como el `Cue` solo existe cuando se ha revelado, el mando no puede saber dónde está el siguiente (D-20). Los rótulos van en una región `aria-live="polite"` (D-57, §18.8).

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
| 3 | `attack_sticks` | l. 8759 | `attack` | 2 | `ATTACK · [IT*] 21 Luca Bertolini (IT) · Team Alpha · Champion of Italy`, el rótulo del primer atacante; con más, `and 2 others` (6-p) |
| 4 | `attack_reeled` | l. 8600, 8827 | `voice_only` | | el cierre de un intento; la barra enseña la fusión |
| 5 | `move_caught` | l. 8827 | `voice_only` | | un movimiento que no es la fuga del día; la barra enseña la fusión |
| 6 | `move_faded` | l. 8921 | `voice_only` | | se queda sin gente: la fila desaparece |
| 7 | `bridge_made` | l. 8616 | `voice_only` | | el rótulo lo da el estado: `group_changed`, `CONTACT · 2 riders bridge across` |
| 8 | `move_merge` | l. 8616 | `voice_only` | | ídem |
| 9 | `bridge_failed` | l. 8536 | `voice_only` | | |
| 10 | `breakaway_formed` | l. 8727 | `break_formed` | 2 | `BREAKAWAY · 5 riders · +0:48 on the bunch` y la lista con el maillot de cada uno; luego `break_presented` y la moto, las tres reservadas (6-m, §6.7) |
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
| 30 | `leader_dropped` | l. 5804 | `dropped` | 1 o 3 | `DROPPED · 11 Sam Carter · Race leader · +0:25` |
| 31 | `rider_bonks` | l. 6046 | `dropped` | 1 o 3 | `DROPPED · …` |
| 32 | `rider_sits_up` | l. 6269 | `voice_only` | | uno a uno, no (regla B3 del dueño, §12.3): los cuenta la barra |
| 33 | `rider_abandons` | l. 6310 | `abandon` | 1 o 3 | `ABANDON · 45 Jules Moreau · Team Gamma` |
| 34 | `puncture` | l. 8473; `timetrial.ts` l. 321-327 | `mishap` | 1 | `PUNCTURE · 45 Jules Moreau`; sin el tiempo perdido, que es del microscopio |
| 35 | `mechanical` | ídem | `mishap` | 1 | `MECHANICAL · 45 Jules Moreau` |
| 36 | `crash` | sintetizada de `output.incidents` (`types.ts` l. 358-365; D-13) | `crash` | 2 o 3 | `CRASH`; los nombres, 3 s después |
| 37 | `truce_granted` | l. 8244 | `voice_only` | | frase nueva de §12.5 |
| 38 | `truce_denied` | l. 8244 | `voice_only` | | ídem |
| 39 | `rain_front` | l. 3133 | `voice_only` | | el tiempo se ve al tocar la capa fija (§6.2) |
| 40 | `sprint_intermediate` | l. 9221 | `banner_result` | 2 | `INTERMEDIATE SPRINT · km 129 · 1. Erik Voss 20 pts · 2. Rui Silva 15 · 3. Pelle Ekdal 12` |
| 41 | `climb_kom` | l. 9221, 9310 | `banner_result` | 2 | `KOM · Côte d'Engins (Cat. 1) · 1. Antoine Leroy 10 pts · 2. Jonas Kahn 8 · 3. Nicolás Moreno 6` |
| 42 | `bunch_sprint` | l. 9662 | `voice_only` | | regla `finish`: la voz de la llegada, en el paquete de meta |
| 43 | `final_km` | l. 9689 | `voice_only` | | ídem; el rótulo del último km es `last_km`, del estado |
| 44 | `stage_win` | l. 9695 | `finish` | 3 | `STAGE WINNER · …` (§8.7) |
| 45 | `time_cut` | l. 9135; `timetrial.ts` l. 443-447 | `time_cut` | 2 | `TIME CUT · 12 riders outside the limit` |
| 46 | `time_cut_readmitted` | l. 9153; `timetrial.ts` l. 462-466 | `voice_only` | | la readmisión se cuenta, no se rotula |
| 47 | `tt_start_order` | `timetrial.ts` l. 505 | `voice_only` | | el orden de salida es público: el rótulo `Start order` (el `Cue` `tt_start_order`) lo programa el reproductor en `t = 0` con `BroadcastHead.tt` (§9.5), además del cuadro de la previa de crono (§9.7) |
| 48 | `tt_last_off` | l. 514 | `voice_only` | | |
| 49 | `tt_split` | l. 540 | `voice_only` | | el rótulo `SPLIT 1` (el `Cue` `tt_split`) sale del estado de la crono (§9.5) |
| 50 | `tt_first_time` | l. 557 | `voice_only` | | el sillón, `HOT SEAT` (el `Cue` `tt_finish` con `hotSeat`), sale del estado (§9.5) |
| 51 | `tt_best_time` | l. 568 | `voice_only` | | ídem |
| 52 | `tt_catch` | l. 589 | `voice_only` | | |
| 53 | `tt_catches` | l. 596 | `voice_only` | | |
| 54 | `tt_last_home` | l. 605 | `voice_only` | | regla `finish` (§4.7): en el paquete de meta |
| 55 | `stage_win_itt` | l. 614 | `finish` | 3 | `STAGE WINNER · …` |

Los campos de cada `Cue` salen del suceso y del instante siguiente: `attack.riders`, los protagonistas (como mucho tres, R23.4) y `fromGroup`, su grupo en el instante anterior; `break_formed.group`, el grupo de los protagonistas (todos los de la fuga, mapa 01 §1.3) y `gapS`, la diferencia principal si ese grupo es la cabeza; `caught.caught`, el grupo que tenían los protagonistas antes y `by`, su sucesor; `split.parts`, los grupos del instante que llevan a alguien que iba en el grupo del título antes, y `cause`, `datos.causa` (en `echelon_split`, `viento`); `banner_result.banner`, el índice de la pancarta revelada en ese km en `Instant.banners`; `mishap.lostS`, `datos.perdidaS`; `dropped.gapS`, el hueco del grupo en que se pinta al corredor (H-17), o nulo si va en tránsito. B7 (§16.4) recorre la lista de plantillas de `simulate.ts`, `events.ts` y `timetrial.ts` y falla si una no tiene fila aquí, frase de voz y de acta y regla de `REVEAL_RULES`: la `card_changed` que traerá R23.8 de la táctica ([DOC 3]) entra por la regla por defecto de §4.7 y su redactor tiene que darle fila antes de fusionar (decisión 6-j para la crono).

### 6.7 Las diferencias y la presentación de la fuga

Lo que la UCI pide de forma periódica y no permanente (mapa 06 §1.1, puntos 3 y 4): las diferencias generales «at least once every 3-5 minutes», con los maillots de líder en su fila, y los nombres de cada grupo «regularly». D-22 lo trae a `Watch` con dos rótulos que programa el reproductor (§6.5) y uno que dan los sucesos.

**El cuadro de diferencias** (`time_check`, clase 1; pantalla). Sale cada `BROADCAST.gapsTableEveryRealS` (25 s de pared), nunca con la cabeza a menos de `BROADCAST.quietFinalKm` (5 km) de meta, y además en cuanto se vuelve de un salto o se reanuda (§8.5), que es cuando el espectador necesita recolocarse (mapa 06 §5.4: «al volver de un corte el espectador lee `42 km to go · +1:10` y se recoloca solo»). A ×60 son 25 minutos de carrera entre dos cuadros, dentro de lo que pide la UCI en tiempo de espectador, que es el que cuenta (`television.md` §12). Sus filas (`TimeCheckRow`, §4.9) son todos los grupos del instante hasta el pelotón incluido, más el del espectador y los que lleven un maillot; lo que va detrás sin maillot ni corredor propio se junta en una fila, `+3 groups behind · 41 riders`. Cada fila, con el número de carretera, el nombre de §6.3 (los nombres si son tres o menos, cada uno con su maillot, como en la barra), el tamaño, el hueco a la cabeza y los iconos de los maillots de líder; en el móvil, como mucho `BROADCAST.cardRowsMax` (5, propuesta) filas y el resto en la última. Mientras el cuadro está en pantalla, la capa fija abre su segunda línea (reloj, velocidad, pendiente y tiempo, §6.2, 6-f):

```
(pantalla · time_check · el instante de §6.1)
TIME CHECK · 98.5 km to go
1  [k]Nicolás Moreno · [k]Antoine Leroy · [k]Jonas Kahn     0:00
2  [k]Erik Voss · [k]Rui Silva · [k]Pelle Ekdal            +0:20
3  [k]Adam Nowak · [k]Felix Brandt                         +0:40
4  BUNCH · 124                          [GC] [PTS]         +3:46
+3 groups behind · 41 riders
```

A diferencia de la barra, que en el móvil pliega grupos, el cuadro enseña de una vez todo lo que decide la carrera; en escritorio, donde la barra ya lo enseña todo, el cuadro es el mismo y sirve de corte.

**La general virtual** (`virtual_gc`, clase 1; 3 si cambia el líder virtual; en crono, 2, §9.5; pantalla). Sale con el cuadro de diferencias mientras `Instant.virtualGc` no sea nulo, es decir mientras uno de los `BROADCAST.virtualGcTop` (10) primeros de la general de salida vaya en otro grupo que el líder a menos de `BROADCAST.virtualGcMaxS` (300 s) (§4.5; mapa 06 §3.3). Cada fila es la general de salida más el hueco de su grupo al del líder en su último km de foto común; las bonificaciones de meta se tratan como posibles y no se suman (mapa 06 §3.3). La montaña o los puntos virtuales no se enseñan: la salida servida no lleva los puntos de esas clasificaciones (`StartState`, §4.11).

```
(pantalla · virtual_gc)
VIRTUAL GC · after 128.0 km
1  Iñigo Arrieta             (in the break)      0:00
2  [GC] Sam Carter           (bunch)            +0:47
3  Mads Olsen                (bunch)            +1:02
```

**La presentación de la fuga** (decisión 6-m; pantalla). Es el requisito del dueño que el encargo llama «puro lenguaje de televisión»: «cuando se escapan cinco, que se vean sus maillots» (`docs/encargos.md` l. 153-154; la agenda lo transcribe sin comillas del dueño, `docs/agenda.md` l. 736-739), que es «exactamente el rótulo con el que la televisión presenta a cada corredor» (l. 157) y la diferencia entre «se escapan cinco» y «se escapa el campeón de Italia con cuatro más» (§7.6). La tele lo resuelve con una lista, una frase y la moto; aquí son tres rótulos que salen seguidos en cuanto se revela `breakaway_formed`:

1. **La lista** (`break_formed`, clase 2): `BREAKAWAY · 5 riders · +0:48 on the bunch` y, debajo, los escapados por dorsal, cada uno con su `WornJerseyIcon` (el maillot de líder, el de campeón o la equipación de su equipo: `RiderCard.worn` y `team.jerseySeed`), su dorsal y su nombre. Son los cinco maillots a la vez, en todos los modos. En una fuga de más de `nameWholeGroupUpTo` (12), los de la ronda y `+N riders`; en el móvil, dos por renglón y como mucho `cardRowsMax` (5) renglones.
2. **La frase** (`break_presented`, clase 2): la de `breakHeadline` (§7.6), que ordena por notoriedad y cuenta al resto.
3. **La ronda de la moto** (`rider` con contexto `break_round`): un rótulo de corredor (§7.1) por cada corredor de `breakRoundOf`, por dorsal, uno cada `BROADCAST.breakRoundEveryS` (6 s de pared) y `cueHoldS[0]` (3 s) en pantalla: la moto 1 que la UCI manda rodear la fuga «para que se vea a cada corredor» (pliego §11.4, mapa 06 §5.1). Solo en `Watch` a ×½, ×1 y ×2: a ×4, en `Highlights` y en el digest, seis segundos de pared son de 12 a 30 minutos de carrera en la hora muerta (×240 a ×4, ×300 en `Highlights`, ×120 de media en el digest de una reina, §18.7) y la fuga cambia antes de que la moto acabe (medido a ×4 y en `Highlights`, 6-m); ahí la presentan la lista, la frase y la barra.

```ts
// packages/shared/src/broadcast/names.ts (sigue)
/** A QUIÉNES PRESENTA LA MOTO (6-m): todos, por dorsal, si son hasta nameWholeGroupUpTo; si no, los que llevan un maillot que no
 *  es el de su equipo, después los del espectador y después por nivel de notoriedad (§7.5), hasta nameWholeGroupUpTo, por dorsal. */
export function breakRoundOf(riders: readonly RiderIx[], cast: readonly RiderCard[]): readonly RiderIx[] {
  const byBib = [...riders].sort((a, b) => a-b)
  if (byBib.length <= BROADCAST.nameWholeGroupUpTo) return byBib
  const tier = (r: RiderIx): number => {
    const c = cast[r]
    return c === undefined ? 30 : (c.worn.kind !== 'team' ? 0 : c.own ? 10 : 20) + c.notoriety   // NotorietyLevel va de 0 a 8
  }
  return [...byBib].sort((a, b) => tier(a)-tier(b) || a-b).slice(0, BROADCAST.nameWholeGroupUpTo).sort((a, b) => a-b)
}

// packages/shared/src/broadcast/cues.ts (sigue). `Instant` ya lo importa el bloque de §4.9.
/** ¿Sigue r por delante del grupo con el título de pelotón en el instante? (6-m) En tránsito cuenta el grupo que dejó (3-b); sin
 *  grupo con el título, sí. Es lo que decide si un rótulo reservado de la presentación todavía presenta algo. */
export function aheadOfPeloton(i: Instant, r: RiderIx): boolean {
  const pack = i.groups.find((g) => g.kind === 'peloton')
  if (pack === undefined) return true
  const from = i.inTransit.find((x) => x.rider === r)?.from
  const g = i.groups.find((x) => x.members.includes(r) || x.g === from)
  return g !== undefined && g.number < pack.number
}
```

**La garantía.** Las tres piezas van reservadas en la cola (§6.5): entran siempre, no cuentan para `cueQueueMax`, no las desplaza nadie y no caducan por esperar. La lista y la frase se ordenan como cualquier otro rótulo de clase 2; la ronda, de clase 2, espera detrás de los demás de clase 2 que haya (un ataque o una pancarta pasan antes que el siguiente escapado) y delante de las clases 1 y 0. Solo se tiran cuando ya no presentan nada: el rótulo de un escapado, cuando `aheadOfPeloton` deja de ser cierto para él, porque lo han cazado o se ha quedado; la lista y la frase, cuando no queda ninguno. Si después la fuga gana o pierde a alguien, sale `group_changed` (`CONTACT · 2 riders bridge across` o `3 of the 5 remain`, pantalla) y no otra ronda. La ronda no apaga `Next action` (§8.5): presenta un suceso, no lo es. Tras un salto o al reanudar, la fuga que sigue por delante del pelotón y cuya lista no se ha pintado en esta reproducción se presenta entera después de `While you skipped` o de `Previously` (§8.5). Y los maillots de la fuga no dependen solo de los rótulos: su fila de la barra los lleva mientras exista (§6.2).

**Medido** (`l4c/cola.mjs`). La cola de §6.5 entera, a 60 fotogramas por segundo de pared, sobre las 22 etapas en línea de las 24 del mapa 07 §7 por dos semillas, con el prototipo del grabador (`l8/grab.mjs`, sobre el motor v89) y su reparto sintético; como el prototipo no tiene campeones, cuentan como «de maillot o título» los tres líderes y el 1.º y el 3.º de cada fuga por dorsal. Parte de `c4/cola.mjs`, el simulador que dejó el primer corrector de este lote, con la regla de arriba en lugar de la caza como fin de la fuga. Son 34 fugas; la ronda, con el tope de doce, suma 166 rótulos (203 sin él). «Tocaba» quiere decir que el escapado seguía por delante del pelotón cuando le llegaba su turno.

| `Watch`, en las 44 corridas | la cola de antes (ronda de clase 0, sin reserva), ×1 | 6-m, ×½ | 6-m, ×1 | 6-m, ×2 |
| --- | --- | --- | --- | --- |
| la lista, entera | 31 de 34 | 33 de 34 | 33 de 34 | 33 de 34 |
| la frase, entera | 20 de 34 | 33 de 34 | 33 de 34 | 33 de 34 |
| rótulos de la moto de los escapados a los que tocaba | 102 de 189 (54 %) | 166 de 166 | 157 de 158 | 145 de 153 |
| rondas enteras | 4 de 34 | 34 de 34 | 30 de 34 (33 contando solo a los que tocaba) | 28 de 34 |
| los de maillot o título | 29 de 60 | 60 de 60 | 59 de 60 | 56 de 60 |
| rótulos de escapados ya cazados | 5 | 0 | 0 | 0 |
| el resto de la clase 2 / de la clase 1 que sale entero | 70,0 % / 35,8 % | 78,7 % / 55,4 % (antes, 79,0 % / 55,5 %) | 69,2 % / 35,3 % | 55,6 % / 18,5 % (antes, 56,7 % / 19,5 %) |

La fuga que falta en las tres columnas de 6-m vivió un segundo de pared (`race-france` e20, semilla 1: un corredor, revelado a las 1:20:00 de carrera y cazado 64 s después, tras caerse): la cazaron antes de que salieran su lista y su frase, y su `CAUGHT` sí salió; a ×½ salió además su rótulo de la moto, porque poco después volvió a irse con otro corredor (`attack_go`, km 41,3) y, cuando le tocó, iba por delante del pelotón. A ×1 el último de la ronda sale a 30 s de pared de la lista en la mediana (p90, 67 s; máximo, 75 s), y un rótulo espera como mucho 39 s. En `Highlights` a ×1, sin ronda, salen 33 listas y 33 frases de 34, contra 22 y 14 con la cola de antes, y el resto de la clase 2 baja del 41,0 al 38,3 %. En las cinco etapas en línea congeladas de los tests (§16.4), la cola de antes enseñaba 9 de los 21 rótulos de la moto y 2 de las 5 frases a ×1; con 6-m, los 21 y las 5 a ×½ y a ×1, y 20 de 21 a ×2. Lo sella la segunda parte de B3 (§16.4).

**Las pancartas** (`banner_result`, clase 2; pantalla). Con el orden y los puntos de `BannerResult` (§4.2), que da la sonda `onBanner` (I-18, §5.2) y se revela con el reloj del grupo del primero que puntúa (D-05, regla `banner`): `KOM · Côte d'Engins (Cat. 1) · 1. Antoine Leroy 10 pts · 2. Jonas Kahn 8 · 3. Nicolás Moreno 6`, con el nombre y la categoría que la web casa con `ProfileStrip.climbs` por km (decisión 4-n), y `INTERMEDIATE SPRINT · km 129 · 1. Erik Voss 20 pts · 2. Rui Silva 15 · 3. Pelle Ekdal 12`. Tres puestos en el rótulo; los ocho que puntúan (`STAGE.sprintPoints`, `climbPoints`, `constants.ts` l. 5032-5042) quedan en la radio y en el acta. El rótulo no lleva el hueco en la cima que la tele da del segundo grupo (mapa 06 §9, fila 23): la pancarta se revela con el reloj del grupo del primero que puntúa (D-05, regla `banner`), y el paso de un grupo de detrás por la cima es una marca suya que se ve más tarde (D-06), así que ponerlo en el rótulo adelantaría un dato; ese hueco sale en la barra y en el cuadro de diferencias cuando ese grupo pasa (decisión 6-n). Sin bonificaciones en las volantes: el motor solo las da en meta (`STAGE.timeBonuses` 10, 6 y 4 s, l. 6285) y una carrera de un día no las lleva (SPEC §6.15). Antes del puerto, `BROADCAST.climbCardLeadKm` (3 km) antes de su pie, la ficha (`climb_ahead`, clase 0): `Côte de Monteynard · Cat. 2 · 8.8 km at 5.0% · summit in 11.8 km`.

### 6.8 Lo que no es suceso

**La criba lejana** ([DUEÑO 7]; D-59, H-03). El dueño la aparcó para el diario, «es solo un tema del journal, no me preocupa de momento», y la v39 la dejó «para cuando se mejore el diario» (`docs/balance.md` l. 8094-8095, con una cobertura del 58 % contra el 75 % pedido); E2 es esa mejora del diario (`docs/encargos.md` l. 138-139). En `Watch` no depende del diario: la barra la enseña como estado, porque una criba es el pelotón que se encoge y dos o tres filas nuevas de `Gruppetto` que aparecen detrás, se narre o no. Cuando el motor la emite (`peloton_selection`, `simulate.ts` l. 6762, criba de al menos 20 corredores y el 25 % lejos de meta), sale además el rótulo `SPLIT IN THE BUNCH` (§6.6, fila 25). B2 (§16.4) incluye `peloton_selection` entre los sucesos que contrasta con el estado. En el acta, que es lo que se comparte y se lee después, la cobertura sigue en el 58 % de la v39 (no se remide aquí): E2 no la toca, porque subirla pide una frase del motor, que sube la versión (D-09), o una pasada de `buildChronicle` que la lea del estado de la línea grabada. Lo decide el dueño (DD-29, §20, «La criba lejana en el acta», por defecto no; Rdueno-037).

**La regla de los 3 km** (mapa 06 §9, fila 29). En un final que la admite, el que se cae dentro de los últimos `STAGE.truce.threeKmRuleKm` (3) km no suma la pérdida de la caída (`threeKmRule`, `packages/engine/src/stage/truce.ts` l. 136-143; `dropOut(m, group, reglaTresKm ? 0 : perdidaS)`, `simulate.ts` l. 8289-8291), pero el motor no emite ningún suceso y `incidents` guarda la pérdida nominal (l. 8269). En carrera no tiene rótulo: la pantalla enseña `CRASH` y al corredor con lo que le dé la carretera. Se explica en la llegada: el corredor con una caída de `incidents` dentro de esos km, en una etapa en que el motor aplica la regla (la condición de `simulate.ts` l. 8289-8290), y con el tiempo de su grupo en el resultado, lleva `same time (3 km rule)` (pantalla) en `group_finish` y en el resultado del cierre (§8.7, §8.6). Lo marca la API al armar `BroadcastFinish` (`threeKmRule: readonly RiderIx[]`, §4.11) con la función del motor, que el PR 4a exporta sin tocar su conducta; el caso va a `routes/broadcast.test.ts` (§14.7) (decisión 6-o).

**El fuera de control, en vivo, no** (mapa 06 §9, fila 30). La tele cuenta el límite al grupeto en la montaña; aquí no se enseña, porque el límite sale del tiempo del ganador, que solo existe en la meta (`time_cut` es de la regla `finish`, §4.7, y el motor lo emite al cerrar, `simulate.ts` l. 9135), y adelantarlo destriparía la llegada. El corte sale tras `BroadcastFinish` (§8.7) (decisión 6-q).

**El tiempo, congelado** (D-14, I-19, H-07). `StageWeather` se graba con la línea desde `stageWeather`, `weatherPlan` y `roadBearings` sobre la semilla (`packages/engine/src/stage/weather.ts` l. 58-72, 188-216 y 251-287; §5.4), sin tocar el motor, y se enseña en dos sitios: la segunda línea de la capa fija (la temperatura y, del tramo en que va la cabeza, `rain` y `crosswind`, §6.2) y el cuadro del parte de la previa (§8.6). Nunca un punto cardinal: el rumbo de la carretera del motor es una «Suposición declarada, no dato» (`weather.ts` l. 175-181), así que lo que existe es el viento contra la carretera (lateral o no, `crosswind`), no si sopla del noroeste (decisión 6-k).

**Lugares y avituallamiento, no** (H-07). El motor no los tiene: `Banner` es `{ km, tipo, cat? }` (`packages/engine/src/stage/types.ts` l. 27-32) y no hay pueblos por km ni zona de avituallamiento en ninguna parte (mapa 06 §9, filas 13 y 25). El nombre de una volante existe en `STAGE_FEATURES` para las etapas con recorrido real (`sprints[].name`: `Corps`, km 129, en la e18), pero `ProfileStrip` solo guarda su km (§4.2); E2 no lo añade y la volante se rotula por su km.

### 6.9 Lo que nunca sale en pantalla

D-17: la duración de la reproducción y lo que queda de ella; cuántos sucesos o rótulos quedan; marcas en el perfil donde va a pasar algo; y la lista de llegada antes de la línea. En los últimos `BROADCAST.quietFinalM` (500 m), solo la distancia: la capa fija enseña los metros y nada más, el plano se queda vacío (los rótulos esperan y caducan, §6.5), la voz calla y la barra sigue con sus grupos y sin huecos. Es la regla de la tele (mapa 06 §5.3: en los últimos 300-500 m «solo queda la distancia») y la de los productos que ya lo resuelven: «Lo que mide la duración revela el final» (mapa 06 §7.2, regla 3; Tennis TV esconde la duración y las extensiones de YouTube, la barra de progreso). La única duración que se enseña es la estimación de la ficha, `About 13 min` (pantalla), antes de entrar, con velocidades nominales y no las de la carrera (§8.2). La barra de progreso de los mandos va en km y lleva marcas solo del recorrido (puertos y volantes, §8.5). Hoy la altimetría de una etapa corrida sí lleva marcas de sucesos (`MARKER_LABEL`, `apps/api/src/chronicle.ts` l. 169-175: `attack`, `break`, `caught`, `banner`, `finish`; `buildMarkers(storedEvents)`, `apps/api/src/routes/races.ts` l. 514): la de `Watch` y la de la pestaña `Profile` de una etapa no conocida se piden sin ellas (`renderAltimetrySvg(profile)`, como ya hace la ruta con una etapa sin correr, l. 432).

### 6.10 Las pestañas y los nombres

D-48, escrito como hecho: `Watch` es la retransmisión; `Report` es el acta, la pestaña que hoy se llama `Story` (`apps/web/src/pages/StageReplay.tsx` l. 29-45, la primera y la de defecto de una etapa corrida, l. 345-346); `Race Radio` es el microscopio del dueño (pantalla, las tres). «journal», «crónica», «diario» y `Story` dejan de ser nombres de pantalla; en la prosa de este documento son «la voz» y «el acta» (mapa 05 §6, contradicción 8). Los nombres de pantalla son de producto, y el dueño llama a esa pieza «Journal» en todas sus peticiones («el Journal me gustaría que tuviera aún más detalle», `docs/balance.md` l. 1431-1432, v11; «si lees todo el Journal no SABES quién va ganando», l. 5975, v27; «es solo un tema del journal», l. 8095, v39): D-48 los fija por defecto y la elección pasa al dueño (DD-28, §20, «Los nombres de pantalla», con `Journal` como alternativa para el acta; Rdueno-036), cuyo último momento barato es el 9a, que renombra `Story` en todas las etapas. Dentro de `Watch`, la lista de lo que la voz ya ha dicho se despliega con `Commentary` (pantalla), y nunca enseña una línea con `revealS` mayor que `t`.

| La etapa, para ese espectador | Pestañas (pantalla), la primera por defecto |
| --- | --- |
| no conocida y en el velo (a medias o sin tocar) | `Watch`, `Profile` sin marcas; `Report`, `Result`, `Classifications` y `Race Radio` enseñan la puerta (§11) |
| no conocida y fuera del velo (caducada, o de una carrera fuera de guardia; §10.2, decisión 10-e) | `Watch`, sin puerta; las demás, a un toque y sin confirmación |
| vista o revelada (letras `W`, `S` y `R`, D-28, 10-e) | `Report`, `Result`, `Classifications`, `Race Radio`, `Profile`, `Watch` |
| arrastrada (letra `A`: conocida por deducción al ver o revelar una posterior, D-28, 10-a) | `Watch`, sin puerta; `Report` y las demás, a un toque y sin confirmación, como la caducada (decisión 6-r) |
| aún no corrida | `Preview`, `Profile` |

Una etapa con `A` no se ha visto: se conoce por deducción, porque la N+1 sale con la general de la N (D-28), y el espectador sabe de ella lo mismo que de una caducada. Quien descubre una carrera fuera de guardia por la etapa 5, pulsa `▶` y vuelve después a la 1 para verla desde el principio, la encuentra en `Watch`, como antes de pulsar, y no en `Report` con el ganador arriba: entrar en una etapa es sentarse a verla, no leer el acta (`docs/encargos.md` l. 144; Rdueno-021). Para distinguirla, `WatchState` gana `seen: boolean` (`true` con `W`, `S` o `R`), que la ruta de etapa rellena (§4.11, §14.1); `raceTabs` y su test (9b, §11) ganan el caso.

[DOC 4], pregunta 4 de `docs/navegacion.md` §9 (l. 494-495: «Vista de espectador de la etapa: cuánto de la telemetría nueva del motor cabe aquí sin abrumar»): la vista de espectador es `Watch`, y la respuesta es la de esta sección, dos números, la barra, el perfil y un rótulo; la telemetría entera (motivo de cada relevista, velocidades, los dos huecos por grupo) sigue en `Race Radio`. La carrera de un día, que hoy abre en `Result` con el ganador en la cabecera (`raceTabs.ts` l. 47-51; `Race.tsx` l. 720-729), es §11.5 y §11.17.

### 6.11 La previa y el cierre en pantalla

La emisión abre con la previa y cierra con el cierre (D-22, I-22): no son páginas aparte sino parte de `Watch`, con el orden de la señal internacional de la UCI (mapa 06 §8.1). `StagePreviewCards` pinta, antes de `t = 0`, los cuatro cuadros de `BroadcastHead.preview` (`StagePreview`, §4.11), de `BROADCAST.previewCardS` (5 s de pared) cada uno, sobre la zona de la barra y del plano; la capa fija ya enseña `185.0 km to go` y el perfil, sus cursores en el km 0. Un toque pasa al siguiente cuadro y `▶` empieza la carrera: saltarse la previa no revela nada. `StageClosingCards` pinta, tras la meta y los rótulos de llegada (§8.7), los cuadros de `BroadcastFinish.closing` (`StageClosing`, §4.11), que pasan solos cada `BROADCAST.closingCardS` (6 s, propuesta) o con el dedo, y el último se queda: `Next: Stage 19 · Watch` (pantalla). Con la etapa anterior velada, la retransmisión no empieza: sale la puerta (`StageGateCard`, `gate: previous_unseen`, D-37, §11.12) y la previa no se pinta. Qué dice cada cuadro, en inglés y palabra por palabra, es §8.6.

---

**Injertos aplicados.** I-04 (§6.3: la histéresis del papel y la identidad por el id con sucesor; §6.2: un cursor por grupo que no retrocede), I-07 (§6.3: `GroupRole`, `groupRoleOf`, `GROUP_WORDS` y la lista cerrada), I-19 (§6.2: la segunda línea de la capa fija; §6.8: el tiempo congelado), I-21 (§6.5: la cola por clase, un rótulo a la vez, `cueHoldS`, `Next action` hasta un `Cue` de clase ≥ 2; `While you skipped` y `Previously` son §8.5), I-22 (§6.7: la presentación de la fuga y el cuadro de diferencias; §6.11: la previa y el cierre en pantalla, con su contenido en §8.6), I-46 (§6.4: `Pulling:` en cada grupo que tira, con el porqué de cada equipo; la política de nombres es §7.7).

**Objeciones resueltas.** O-10 (§6.3: un solo código de papel y una lista cerrada de palabras para barra, radio, voz y acta, con `raceRadioNames.test.tsx` re-sellado y el conflicto medido que queda para §12.6), O-27 (§6.6: `CUE_OF_TEMPLATE` con las 54 plantillas del motor más `crash`, cada una a un `CueKind`, a `voice_only` o a `report_only`).

**Huecos rellenados.** H-03 (§6.8: la criba lejana la enseña la barra como estado y `peloton_selection` tiene rótulo; en el acta sigue en el 58 %, y lo decide el dueño), H-07 (§6.8: el tiempo sí, congelado y sin punto cardinal; lugares y avituallamiento no, porque el motor no los tiene), H-17 (§6.2: el hueco de tu corredor es el de su grupo en el último punto común, también en tránsito). De la corrección (fase 5): el requisito del dueño de los maillots de la fuga, con garantía y medida (§6.2, §6.7, 6-m); la regla de los 3 km (6-o), el fuera de control en vivo (6-q) y el hueco en la cima (6-n), que el mapa 06 §9 pedía y nadie decidía.

**Decisión tomada aquí.**
- 6-a. `groupRoleOf` aplica `bunchMinShare` para `Bunch` y, sin grueso, la referencia de `chaseReferenceIndex` con `chaseMinShare` para el trozo de atrás de una criba, que el motor llama «the chase group»; con grueso, todo lo de detrás es `Gruppetto`. La función del motor se copia en `shared` (`chaseRefOf`) porque `shared` no importa el motor; se exporta, `broadcast/index.ts` la reexporta y `broadcastConstants.test.ts` la compara con la del motor en 10.000 carreteras generadas (§15.5, 15-a, 15-k; cierra la duda 1.7). Descartado: todo lo que va detrás del título como `Gruppetto` (llamaría grupeta al trozo de 76 de una criba) y la referencia del motor también con grueso (llamaría `Chase group` a tres descolgados detrás de un pelotón que va en cabeza).
- 6-b. «El pelotón» de D-17 es el grupo con papel `bunch` y, si ninguno llega a dos tercios, el grupo del título. El grupo del maillot (`jersey_group`) se llama igual en la barra, la radio servida, la capa fija y la voz (`Race leader’s group`, `on the race leader’s group`, «the race leader’s group»): el PR 4a añade sus tres nombres a `GROUP_NOUNS` y a `WATCHED_GROUP_NOUNS`, como `the gruppetto`, y la voz los dice cuando el grupo de su protagonista lleva esa etiqueta (§12.6). El de la montaña es `Mountains leader’s group`, como el `aria-label` de hoy (`JERSEY_LABEL`, `jerseys.ts` l. 133-137), y `KOM` queda para la pancarta. Descartado: la voz con el nombre del papel (la versión anterior), que daba dos nombres al mismo grupo en la misma pantalla (Rdueno-017), y `KOM leader’s group` (Rcobertura-019).
- 6-c. Las `mobileGroupRows` filas del móvil se eligen por prioridad (la 1, el pelotón, las del espectador, las que llevan un maillot, y luego por carretera) y se pintan en orden de carretera; el resto se pliega en `+N groups · M riders`. Cada corredor que la barra nombra lleva su `WornJerseyIcon`, leído del reparto por `RiderIx`; la fila de un grupo de cuatro a doce lleva debajo sus corredores con su maillot (en escritorio, con nombre; en el móvil, solo los iconos, bajo la fila 1 y las del espectador). Los nombres, tal como están guardados (7-a), cortados con `…` si no caben. Descartado: las cuatro primeras sin más, que dejaría fuera al pelotón en cuanto hay tres grupos delante; y los apellidos en mayúsculas, que el esquema no guarda (7-a; cierra la duda 1.5).
- 6-d. La línea `Pulling:` sale de `pullingLineOf` (datos, no texto): `in_turn` cuando en un grupo de hasta `nameWholeGroupUpTo` relevan todos sus equipos, y si no, los dos equipos con más relevistas, cada uno con su destinatario si lo comparten al menos dos y, si no, con su motivo mayoritario (`PULL_MOTIVE_WORDS`; a igualdad, el que sale antes en los relevistas guardados). En el móvil va solo bajo el pelotón y las filas del espectador, con un equipo y `+N teams` si la de dos no cabe; las demás, al tocar. El motivo de cada relevista, uno a uno, sigue en `Race Radio`. Descartado: la línea sin porqué de la versión anterior, contra lo que el dueño pidió en la v13 y la v15 (Rdueno-015).
- 6-e. Los corredores en tránsito se cuentan en una línea bajo la fila del grupo que dejaron (`↓ 3 dropping back`, `↑ 2 bridging across`); no se pintan en ninguna fila.
- 6-f. La capa fija lleva, además de los dos números, contra quién (`on the bunch`), por la pregunta «sobre quién» de la regla del diario de la v27, que contestó a la queja del dueño ([DUEÑO 4]); los km con un decimal y, en el último, metros a la decena; en un circuito, `3 laps to go · 42.5 km` y `Last lap`. El reloj, la velocidad, la pendiente y el tiempo van en una segunda línea que sale con cada cuadro de diferencias y al tocar la capa (en escritorio, también al pasarle el ratón): lo que la UCI pide «regularly and systematically». Descartado: el reloj como tercer dato permanente, que la UCI no pide (mapa 06 §1.2); y la segunda línea siempre abierta en escritorio de la versión anterior, con `Commentary` desplegado, que convertía la pantalla en una lista (Rdueno-014).
- 6-g. `cueClassOf` sube a 3 la caída con nombres, el abandono y el descolgado de un maillot o de un top `cueTopStart` de salida, el cuadro de la general virtual cuando cambia su primero (contra `start.leaders.gc` el primero de la etapa) y el que se sienta en el sillón de la crono; sube a 2 el mejor paso por un control de la crono y la general virtual de la crono (9-n); pone en 2 la ronda de la moto (6-m) y en 0 la ronda `ON COURSE` de la crono (9-k). La caída sin nombres es siempre 2. El descolgado no está en D-21; se añade por coherencia con la caída y el abandono.
- 6-h. La cola, además de lo que fija D-21: con la cola llena de clases 2 y 3, un `Cue` de clase 2 desplaza al de clase 2 más viejo; un `Cue` de clase ≤ 2 que ha esperado más de `cueHoldS[3]` (6 s) de pared caduca; la clase 3 no se descarta nunca y corta al de clase ≤ 1 que esté en pantalla. Nada de eso vale para la presentación de la fuga (6-m). Sin evidencia de los jueces, como D-21. La prueba de lectura no la mide: pregunta quién va delante, con cuánta ventaja, sobre quién y cuánto queda y, con 16-w, qué maillot lleva cada escapado y quién tira detrás y por qué (§16.5), y todo eso lo contestan la capa fija y la barra aunque la cola tire un rótulo. Lo que mide la cola es la medida de `l4c/cola.mjs` de §6.5, los tests de §6.7 (`cues.test.ts` y la segunda parte de B3, §16.4) y el dueño al verla desde el 6a. Descartado: dejar que la cola se alargue sin límite, que a ×60 enseñaría rótulos de hace veinte minutos.
- 6-i. `cuesBetween` produce los rótulos de los sucesos y de los cambios de estado (`last_km`, `group_changed`); el reproductor, los que dependen del espectador, del recorrido o del reloj de pared (`time_check`, `virtual_gc`, `break_presented`, los `rider`, el segundo tiempo de `crash`, `climb_ahead`, los de la crono y los de meta). Así `cuesBetween` conserva la firma que fijó la síntesis (§21.6 F.2) y sigue siendo pura sobre la línea.
- 6-j. En la crono, sus nueve plantillas propias van a `voice_only` salvo `stage_win_itt` (`finish`); `puncture` y `mechanical` van a `mishap` y `time_cut` a `time_cut`, como en carretera. Sus rótulos de estado (`Start order`, `ON COURSE`, `SPLIT 1`, `HOT SEAT`, `VIRTUAL GC`) son los `Cue` `tt_start_order`, `tt_split`, `tt_finish`, `rider` con `tt_round` y `virtual_gc`, que salen del plan y de `TimeTrialInstant` (§9.5) y entran en la misma cola.
- 6-k. El tiempo se enseña sin punto cardinal: el rumbo del motor es una suposición (`weather.ts` l. 175-181) y lo que tiene sentido es el viento contra la carretera.
- 6-l. `Your rider` con un solo corredor propio; con varios, `Your team · 1 in front · 5 in the bunch · 2 in the gruppetto`; en tránsito, `dropping back from …` o `bridging to …`; fuera de carrera, `out of the race`.
- 6-m. **La presentación de la fuga.** Al revelarse `breakaway_formed` salen la lista (`break_formed`, con el `WornJerseyIcon`, el dorsal y el nombre de cada escapado), la frase (`break_presented`) y, en `Watch` a ×½, ×1 y ×2, la ronda de la moto (un `rider` con `break_round` por cada corredor de `breakRoundOf`, cada `breakRoundEveryS`, de clase 2 y `cueHoldS[0]` en pantalla). Las tres van reservadas: no cuentan para `cueQueueMax`, no se descartan, no se desplazan ni caducan por esperar; la ronda espera detrás de los demás de clase 2; y se tiran solo cuando ya no presentan nada (el escapado ya no va por delante del grupo con el título de pelotón; la fuga, sin ninguno). Tras un salto o al reanudar, la fuga viva cuya lista no se ha pintado se presenta entera. La ronda no apaga `Next action`. En una fuga de más de doce, la ronda la hacen los de maillot o título, los del espectador y, hasta doce, los de menor nivel de notoriedad. Medido con la cola entera (`l4c/cola.mjs`): en `Watch` a ×1 salen 33 listas y 33 frases de 34 fugas (la que falta vivió un segundo de pared) y 157 de los 158 escapados que seguían delante cuando les tocaba; con la ronda de clase 0 y sin reserva de antes, 31 listas, 20 frases y 102 de 189; el resto de la cola pierde menos de un punto. La sella la segunda parte de B3 (§16.4). Descartado, con la misma medida: la ronda de clase 2 solo para los de maillot o título (Rcobertura-023), que salva 58 de sus 60 rótulos pero deja enteras 12 de 34 rondas y la frase en 20 de 34; la ronda de clase 2 que no caduca (Rdueno-003), que las da todas pero enseña 15 rótulos de escapados ya cazados, deja la frase en 20 de 34 y quita casi seis puntos al resto de la clase 2 (del 70,0 al 64,3 %); un carril aparte que solo sale con la pantalla libre (`c4/cola.mjs`: esperas de hasta 212 s); y la ronda a ×4, en `Highlights` y en el digest, donde presentaba al 80 % (×4) y al 83 % (`Highlights`) de los que seguían delante y en Flandes, con la semilla 0, a ninguno (el digest, que va más deprisa que `Highlights`, no se midió).
- 6-n. El rótulo de una pancarta no lleva el hueco en la cima del segundo grupo: es una marca de ese grupo que se ve después de la pancarta (D-05, D-06). El hueco sale en la barra y en el cuadro de diferencias cuando ese grupo pasa.
- 6-o. La regla de los 3 km no tiene rótulo en carrera, porque el motor no la emite y `incidents` guarda la pérdida nominal; se explica en la llegada con `same time (3 km rule)`, que marca la API en `BroadcastFinish.threeKmRule` con la función del motor, exportada en el 4a sin tocar su conducta.
- 6-p. El rótulo `ATTACK` lleva el rótulo de corredor del primer atacante por notoriedad (§7.5), sea cual sea su nivel, y no hay un `rider` con contexto `attack` aparte: la agenda que desarrolla el norte del dueño quiere que «quien ataca sale en pantalla con su nombre y su ficha» (`docs/agenda.md` l. 514). Medido (`l4c/cola.mjs`, `Watch` ×1): el `ATTACK` de clase 2 sale entero en 98 de 123 ataques, y el rótulo aparte de clase 1 salía en 16 de 62 con el filtro de notoriedad de antes y en 30 de 123 sin él. Descartado: quitar solo el filtro (Rcobertura-022), que dobla los rótulos que se tiran, y mantenerlo, que deja sin ficha al atacante de nivel 8, que es el de la mayoría del pelotón.
- 6-q. El fuera de control no se enseña en vivo: el límite sale del tiempo del ganador, que solo existe en la meta, y adelantarlo destriparía la llegada. El corte sale tras `BroadcastFinish` (§8.7).
- 6-r. Una etapa arrastrada (`A`) abre en `Watch`, sin puerta y con `Report` a un toque, como la caducada: no se ha visto, se conoce por deducción. `WatchState` gana `seen: boolean` para distinguirla (§4.11). Descartado: abrirla en `Report`, que pone el ganador delante a quien vuelve a la etapa 1 tras ver la 5 de una carrera fuera de guardia (Rdueno-021).

**Propuesto para el glosario.**
- `groupLabelOf(size, members, jerseys, role, groupsCount): GroupLabel` y `chaseRefOf` (copia de `chaseReferenceIndex`, exportada para el test de §15.5), en `packages/shared/src/broadcast/instant.ts`; `mainGapOf` gana un tercer parámetro, `markAt(g, photoKm)`, la marca en Ds de un grupo en un km de foto con el respaldo de 3-e.
- `PullingLine` (`in_turn` o `teams`, cada equipo con `forRider` y `motive`), `pullingLineOf(detail, members, cast)` y `PULL_MOTIVE_WORDS` (el porqué de un equipo en pocas palabras, `Record<PullMotive, string>`), en `packages/shared/src/broadcast/names.ts`; `GROUP_WORDS.jersey` pasa a pares [barra, voz].
- `cueClassOf(cue, start, lastVirtualLeader, timeTrial): CueClass`, `isPresentation(cue): boolean` y `aheadOfPeloton(i, r): boolean` (6-m), y las dos funciones de la cola de §6.5 (`admitir` y el fotograma, puras sobre su estado), en `packages/shared/src/broadcast/cues.ts`; `breakRoundOf(riders, cast): readonly RiderIx[]` (la ronda de la moto: todos por dorsal hasta doce; en una fuga mayor, los de maillot o título, los del espectador y por notoriedad, 6-m), en `names.ts`.
- `BROADCAST.cardRowsMax` (5): filas de un cuadro de diferencias, de la general virtual o de la lista de una fuga en el móvil; `BROADCAST.closingCardS` (6 s de pared, sin evidencia de los jueces): lo que dura cada cuadro del cierre antes de pasar solo.
- Textos de pantalla: `on the bunch` (y las demás referencias de la capa fija), `Last lap · 8.2 km to go`, `850 m to go`, `Next: Côte des Terrasses · Cat. 3 · in 26.5 km`, `↓ 3 dropping back`, `↑ 2 bridging across`, `+3 groups · 41 riders`, `Pulling: all 3 in turn`, `Pulling: both in turn`, `Pulling: 4 of 5 in turn`, `+2 teams`, las quince de `PULL_MOTIVE_WORDS` (`chasing`, `for the GC`, `defending the jersey`…), `Mountains leader’s group`, `the race leader’s group` y las otras dos en la voz, `Your team · 1 in front · 5 in the bunch`, `Your rider · dropping back from the bunch`, `Your rider · bridging to the lead group`, `Your rider · out of the race`, `BREAKAWAY · 5 riders · +0:48 on the bunch`, `TIME CHECK · 98.5 km to go`, `+3 groups behind · 41 riders`, `CONTACT · 2 riders bridge across`, `3 of the 5 remain`, `BACK TOGETHER · 38 riders rejoin the bunch`, `FLAMME ROUGE · 1 KM`, `same time (3 km rule)`, y las causas del corte (`after a crash`, `in the crosswind`, `on the cobbles`, `on the climb`, `in the chase`).

**Dudas para el ensamblador.** (estado tras la corrección L4, fase 5)
- Para §12.6 (la voz): medido con `l4/bunch.mjs`, de las líneas narradas que dicen «the bunch» salen con el grupo del título por debajo de dos tercios, cuando la barra no lo llama `Bunch`, 0 de 41 en la llana, 16 de 67 en la media, 22 de 48 en la reina e18, 4 de 48 en Flandes y 8 de 22 en Colombia (sobre todo `attack_go` y `attack_reeled`). D-18 manda que la voz lea `GroupRole`, y ahora también `GroupLabel` para el grupo del maillot (6-b); §12.6 tiene que decir cómo (propuesta: el renderizador recibe el papel y la etiqueta del grupo del protagonista en `instantAt(revealS)` para las plantillas cuyo `GROUP_NOUNS` tiene más de un nombre) o aceptar la contradicción por escrito. El `chaseIsBunch` del motor usa la mitad de los que corren y no los dos tercios (`simulate.ts` l. 4142-4144); solo afecta a `time_gap` y `front_group`, fuera de la voz de `Watch`, y al acta.
- Cerradas en la corrección: la exportación de `chaseReferenceIndex` y el test de `chaseRefOf` (15-k, §15.5; duda 1.7); los `Cue` de crono (4-u, §4.9; las tres claves de `CUE_CLASS` están arriba); y el comentario de §4.9 sobre quién produce los `Cue` (C-14).
- Para §4.11: `BroadcastFinish.threeKmRule: readonly RiderIx[]` (6-o) y `WatchState.seen: boolean` (6-r). Para §4.9: `RiderCueContext` deja de usar `attack` (6-p).
- Para §16.4 y §16.5: la segunda parte de B3 (la presentación de la fuga, 6-m) y la pregunta de los maillots en la prueba de lectura.
