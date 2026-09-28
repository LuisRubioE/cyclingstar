## 8. El ritmo y el montaje

Esta sección dice a qué velocidad corre la hora de la retransmisión, cuánto dura una etapa y un día de seguir una vuelta, qué hace cada mando con lo que el espectador ha alcanzado y con la red, qué se enseña antes de la salida y después de la meta, y cómo se arma y se prueba el reproductor que lo hace. Escribe como hechos cinco decisiones cerradas (D-14, D-19, D-20, D-22 y D-39) y decide lo que dejan abierto en los bloques del final. Los tipos son los de §4 (`PaceZone`, `BroadcastHead`, `BroadcastChunk`, `BroadcastFinish`, `StagePreview` y `StageClosing` en §4.11; `Instant` en §4.5; `Cue` en §4.9); las constantes, las de §15, con su valor la primera vez. Lo que se ve en cada fotograma es §6; la crono, §9.4; la portada que ofrece el digest, §11.4. Las líneas de código son las de HEAD `9c21885`, comprobadas en `3fbd828`. Las duraciones son las que midió el juez de ejecutabilidad (`juicios/ejecutabilidad.md` §2.1, `juez-ejec/ritmo.mjs`: motor v89 del `dist`, campo del banco de `scripts/race-radio.mjs`, 176 corredores y 126 en `race-colombia`, semillas 0 y 1, la curva reproducida a pasos de 0,02 s de pared sobre el reloj de la cabeza en cada foto); lo que esta sección mide de nuevo, con el mismo banco, está en `l4/zonas.mjs` (el reparto por zona y el digest), que reproduce las cifras del juez al segundo en `Watch`, y en `l4/cronoDigest.mjs` (el digest de una crono).

### 8.1 Los modos

| Modo (pantalla) | Curva | Cómo se entra | Mandos | Letra al llegar a meta |
| --- | --- | --- | --- | --- |
| `Watch` | `BROADCAST.pace`, a ×1 | por defecto al entrar en una etapa que el espectador no conoce (DD-03) | todos (§8.5) | `W` |
| `Highlights` | `BROADCAST.summaryPace` | el conmutador de los mandos, o `Highlights of stage 6` (pantalla) en una puerta (§11.12) | todos | `S` |
| el digest | `digestPace`: `summaryPace` escalada para que cada etapa dure `BROADCAST.digestBudgetS` de su tipo (§8.2) | `Watch the race in 40 minutes` (pantalla) en `While you were away` (§8.8, §11.4) | pausa, `Show results` | `S` |
| la crono | `BROADCAST.ttPace` por fracción de salidos y el último km del último en salir a ×`BROADCAST.ttLastKmX` (2) (§9.4) | igual que `Watch` en una etapa `cri` | los de `Watch` salvo los saltos de recorrido, que en crono son de reloj (§9.4) | `W` o `S` |

En una crono, `Highlights` y el digest son una sola curva (decisión 8-m): `ttPaceAt` (§9.4) multiplicado por `ttPlaybackEstimateS(profile, plan) / BROADCAST.digestBudgetS.cri`, para que la estimación nominal dure 120 s. Medida con el motor real en las cuatro cronos de §9.4 y tres semillas (`l4/cronoDigest.mjs`, sobre el banco de `l5/crono2.mjs`): de 1:56 a 2:03. Una crono en `Watch` dura de 5:20 (una nacional de 40 km con 12 corredores) a 11:23 (la e16, 176 corredores a 120 s; §9.4), y una curva propia de `Highlights` entre ese digest y `Watch` no compraría nada que no den `×2` y `×4`.

La letra de lo visto (`KnowledgeLetter`, D-28) la pone el modo con el que lo alcanzado llega a meta, es decir el `mode` del informe de progreso que la cruza (`POST /api/me/watch/:raceKey/:day`, D-51): `play` da `W`; `summary` y `digest`, `S` (DD-20: el resumen cuenta como visto; decisión 8-e), con la tabla `LETTER_OF_MODE` de §10.3. Un informe `seek` no llega nunca a meta, porque ningún salto pasa de un km antes (decisión 8-j); si llegara, esa tabla lo anota `R`. Se puede cambiar de `Watch` a `Highlights` a mitad de etapa sin perder nada: cambia la curva, no la hora. Las cuatro velocidades de `BROADCAST.speeds` (`×½ ×1 ×2 ×4`, pantalla) valen en `Watch` y en `Highlights` y multiplican el factor de la zona; el digest va siempre a ×1 de su curva, porque su duración es su promesa.

### 8.2 La curva

D-19, escrito como hecho (I-38, O-12). `Watch` usa la curva de `producto.md` §5 SIN pausas: segundos de carrera por segundo de pared según la zona de km a meta de la cabeza, y los rótulos no paran el reloj (§6.5). `Highlights` usa la misma forma, más deprisa. Las dos son `as const satisfies readonly PaceZone[]` en §15.3:

| Km a meta de la cabeza | `pace` (`Watch`) | `summaryPace` (`Highlights`) | Un km a 45 km/h (80 s de carrera) dura en pantalla |
| --- | --- | --- | --- |
| más de 50 | ×60 | ×300 | 1,3 s · 0,3 s |
| de 50 a 20 | ×30 | ×120 | 2,7 s · 0,7 s |
| de 20 a 5 | ×12 | ×40 | 6,7 s · 2 s |
| de 5 a 1 | ×4 | ×10 | 20 s · 8 s |
| el último | ×1,5 | ×3 | 53 s · 27 s |

La duración depende solo del recorrido y del tiempo que la cabeza tarda en cada zona; nunca de lo que pasa (B9). La pantalla no enseña cuánto dura ni cuánto queda (D-17, §6.9); la ficha de la etapa dice `About 13 min` (pantalla) con `playbackEstimateS`, que usa velocidades nominales por pendiente y no las de la carrera, y así la duración que se anuncia no sabe nada de la etapa corrida:

```ts
// packages/shared/src/broadcast/pace.ts. Ninguna función recibe la línea ni los sucesos (B9).
import type { StageKind } from '../contracts.js'
import { BROADCAST } from './constants.js'
import type { PaceZone, ProfileStrip, RaceS } from './timeline.js'      // RaceS: la de ttPaceAt, que vive en este fichero (§9.4); PaceZone, de timeline.ts (17-z)

/** s de carrera por s de pared con la cabeza a toGoKm de meta: la primera zona con toGoKm > aboveKm (zonas por aboveKm decreciente, la última 0). */
export function paceAt(toGoKm: number, zones: readonly PaceZone[]): number {
  for (const z of zones) if (toGoKm > z.aboveKm) return z.x
  return zones[zones.length-1]!.x                               // en la línea: la del último km
}

/** La duración a ×1 que anuncia la ficha (`About 13 min`, pantalla). Cada km a su velocidad NOMINAL por pendiente
 *  (BROADCAST.nominalKmh, medida en §15.3), la curva por décimas de km. El último km parcial cuenta entero: error < 1 km. */
export function playbackEstimateS(profile: ProfileStrip, zones: readonly PaceZone[]): number {
  const km = profile.altM.length-1
  let wall = 0
  for (let k = 0; k < km; k++) {
    const pct = (profile.altM[k+1]!-profile.altM[k]!) / 10                 // pendiente media del km, en %
    const raceS = 3600 / BROADCAST.nominalKmh.find((b) => pct <= b.upToPct)!.kmh
    for (let j = 0; j < 10; j++) wall += raceS / 10 / paceAt(km-k-(j + 0.5) / 10, zones)
  }
  return wall
}

/** El digest de While you were away (decisión 8-a): summaryPace escalada para que la estimación NOMINAL dure
 *  digestBudgetS de su tipo. Causal: la escala sale del perfil, no de la carrera. En crono, ttPaceAt por la misma cuenta (8-m). */
export function digestPace(profile: ProfileStrip, kind: StageKind): readonly PaceZone[] {
  const k = playbackEstimateS(profile, BROADCAST.summaryPace) / BROADCAST.digestBudgetS[kind]
  return BROADCAST.summaryPace.map((z) => ({ aboveKm: z.aboveKm, x: z.x * k }))
}
```

El reloj de la reproducción vive en el reproductor (`apps/web/src/domain/broadcast/player.ts`) y avanza una vez por fotograma de pared:

```
cada fotograma, con dt segundos de pared desde el anterior:
  si hay pausa, previa, cierre, un salto en curso o no hay tramo que pintar: no avanza
  i ← instantAt(línea servida, t, ctx)                                  // el mismo instante que pintan todos los componentes (§6.2)
  x ← paceAt(i.toGoKm, zonas del modo) · velocidad · (Next action ? nextActionSpeedup : 1)
  t ← mín(t + x · dt, servido, borde de la meta)                        // nunca más allá de lo servido ni de la meta (D-06)
  alcanzado ← máx(alcanzado, t)                                         // lo alcanzado es lo pintado (D-57)
  cola ← cuesBetween(instante anterior, i, sucesos) y lo que programa el reproductor (§6.5)
```

La ficha redondea `BroadcastHead.estimateS` a minutos (`About ${Math.max(1, Math.round(estimateS / 60))} min`); `Highlights` enseña la suya en el conmutador (`Highlights · about 4 min`, pantalla). Medido en §15.3 (`l2/estimacion.mjs`, 22 etapas en línea, 44 corridas): mediana del error 29 s (5,8 %), p90 55 s, sesgo −2 s; en las etapas de §8.3, `About 8 min` para la llana e7 (estima 8:12, dura 7:39-7:41), `About 13 min` para la reina e18 (13:10 contra 13:21-13:35), `About 11 min` para Flandes (11:05 contra 10:54-11:07) y `About 16 min` para Colombia e5, el peor caso (15:36 contra 19:38-19:59, −22 %: tras 222 km sube los últimos 10 al 5-8 % y la cabeza va más despacio que la media de su banda). El pseudocódigo de arriba, con el último km parcial contado entero, da lo mismo que §15.3 salvo un segundo en Flandes (11:06) y estima `Highlights` de la e18 en 4:25 (dura 4:29-4:31), de ahí `about 4 min` (`l4/estHighlights.mjs`). La previa suma 20 s fijos que la ficha no cuenta; el cierre, lo que el espectador quiera quedarse en él.

### 8.3 Las duraciones medidas

La tabla entera de D-19 (X-18), con las cinco curvas que se propusieron sobre siete etapas y sus dos semillas. En negrita, la elegida. Procedencia: juez de ejecutabilidad, §2.1, `juez-ejec/ritmo.mjs`, `crono.mjs` y `crono_gc.mjs`, campo del banco de 176 corredores y sucesos narrables revelados en su `tS`; `television` sin su cola de rótulos ni su freno, que dependen de sucesos que no emite ningún código; `estado` con sus frenos aproximados por km (cota inferior: los suyos eran por bloque).

| Etapa | television `Highlights` / `Full` | estado curva · con frenos | producto base · con pausas · resumen | datos completo · resumen | ingeniero ×1 (último km) |
| --- | --- | --- | --- | --- | --- |
| `race-france` e7 llana, 175 km | 9:54-10:06 / 25:40-26:16 | 3:26 · 5:32 | **7:39** · 9:44-9:48 · **2:12** | 8:46-8:51 · 3:36-3:42 | 6:42 (×1,5) |
| e13 media, 206 km | 10:19-10:21 / 26:29-26:31 | 4:00-4:07 · 7:52 | **8:49-9:03** · 11:58-13:09 · **2:30-2:34** | 10:15-12:08 · 4:05-5:10 | 7:39 (×1,8-1,9) |
| e18 reina, 185 km | 12:52-12:55 / 29:02-29:05 | 5:22-5:30 · 9:11 | **13:21-13:35** · 16:57-17:35 · **4:29-4:31** | 14:31-15:00 · 6:20-6:32 | 7:51 (×5,7) |
| `race-flanders`, 278 km | 10:19-10:20 / 26:29-26:30 | 5:01-5:08 · 9:30 | **10:54-11:07** · 15:16-15:36 · **2:56-2:59** | 14:10-14:11 · 5:57-5:59 | 9:09 (×1,9) |
| `race-colombia` e5 reina, 232 km | 14:53-15:02 / 31:03-31:12 | 8:03-8:13 · 14:20 | **19:38-19:59** · 25:32-27:14 · **6:32-6:37** | 19:27-21:00 · 8:19-9:14 | 8:33 (×8,7-8,9) |
| crono e1, prólogo, 176 a 60 s | sin presupuesto | 2:31-2:34 | **6:24-6:33** (6:55-7:06 con el último km real, §9.4) | 2:51-2:54 | 2:51-2:54 |
| crono e16 con general, 176 a 120 s | sin presupuesto | 4:45 | **11:21-11:23** | 8:09-8:12 | 5:18-5:19 |

**Dónde se va el tiempo de la curva elegida.** Medido aquí con `l4/zonas.mjs`, que integra la curva por décimas de km sobre el reloj de la cabeza en cada foto de km (el mismo que usa el juez) y da sus mismas duraciones en `Watch`; en `Highlights`, a un segundo (Flandes, 2:57-3:00 contra 2:56-2:59):

| Etapa (semillas 0 y 1) | `Watch` | > 50 km | 50-20 | 20-5 | 5-1 | último km | los últimos 5 km, en % de la etapa | `Highlights` | el último km: carrera → pantalla a ×1,5 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| e7 llana | 7:39-7:41 | 2:49-2:51 | 1:24-1:25 | 1:34-1:35 | 1:10-1:11 | 0:41 | 24 | 2:12 | 61 s → 41 s |
| e13 media | 8:49-9:03 | 3:26-3:34 | 1:46-1:47 | 1:29-1:34 | 1:16-1:20 | 0:49-0:51 | 24 | 2:30-2:34 | 74-76 s → 49-51 s |
| e18 reina | 13:21-13:35 | 3:19-3:24 | 1:30-1:37 | 2:16-2:26 | 3:38-3:44 | 2:31-2:33 | 46-47 | 4:29-4:31 | 227-230 s → 151-153 s |
| Flandes | 10:54-11:07 | 5:24-5:27 | 1:34-1:45 | 1:51 | 1:15 | 0:50 | 18-19 | 2:57-3:00 | 75 s → 50 s |
| Colombia e5 reina | 19:38-19:59 | 5:17-5:22 | 2:27-2:46 | 2:47-2:51 | 5:04-5:12 | 3:52-3:58 | 45-46 | 6:32-6:37 | 348-358 s → 232-238 s |

Es lo que la curva compra: en una llana o en Flandes, la carrera de verdad son los últimos kilómetros y se ven en la quinta parte de la emisión; en un final en alto, el final ES la etapa, y la curva le da casi la mitad (46-47 % en la e18, 45-46 % en Colombia), con el último km, de seis minutos de carrera, en casi cuatro de pantalla. Con la curva de `ingeniero.md` §5.1 (segundos de pared por km) la misma reina duraba 7:51 y su último km iba a ×5,7; a ×8,7-8,9 en Colombia: las etapas más vistosas eran las más comprimidas (I-38; O-12). La hora muerta, en cambio, cuesta lo mismo en 150 km que en 250 en la tele, y aquí casi (de 2:49 en la llana a 5:27 en los 228 km de Flandes antes del km 50 a meta), porque a ×60 un km de 80 s pasa en 1,3 s de pared.

**Los descartes, con su cifra** (D-19). Los segundos de pared por km de `ingeniero.md` §5.1: duración fija y llevadera (6:42-9:09), pero el último km a ×1,5 en la llana, ×5,7 en la e18 y ×8,7-8,9 en Colombia. Los frenos tras cada hito de `estado.md` §5: del 35 al 45 % de la duración dependería de los sucesos (la curva sola, 3:26-8:13; con frenos, 5:32-14:20), y lo que mide la duración revela el final (mapa 06 §7.2, regla 3). El presupuesto por tramo de `television.md` §5.2: `Highlights` de 9:54-10:21 donde no hay final en alto, pero 15:02 en Colombia porque el último km va a 1:1 y es el 40 %, y `Full` de 25:40-31:12. Las pausas de 3 s por rótulo de `producto.md` §5: suben la duración un 27-37 %, hasta 27:14 en Colombia, y su estimación `About 9 min` no las cuenta. La regla de `datos.md` §5: 8:46-21:00 en completo, mediana 12,7 min, la más larga, con un `Next action` que sirve hasta el siguiente suceso y lo delata. En crono solo acierta la de `producto.md` §9 (el ritmo por fracción de salidos, §9.4): `ingeniero.md` §9 estimaba 4-6 min para lo que mide 2:51, y `television.md` §9 dejaba 5.760 y 15.120 s de carrera sin presupuesto.

### 8.4 El coste diario

Seguir una gran vuelta etapa a etapa (H-19; X-19). Una vuelta de 21 etapas dura 23 días de juego con dos descansos (Francia, días 185 a 207; España, 234 a 256) y 24 con tres (Italia, días 128 a 151: descansa tras las etapas 3, 9 y 15, `packages/engine/src/routes/editions.ts` l. 52-53, contra `[9, 15]` de Francia y España, l. 27 y 79; medido con `scheduledStageIndices` del `dist`, `rcod/n/gt2.mjs`; mapa 04 §2), y un día de juego son 6 h reales (`TICK_INTERVAL_MINUTES` 360, `apps/api/src/env.ts` l. 32; mapa 02 §1.1): de 5,75 a 6 días reales, unas 3,65 etapas por día real en Francia y en España y 3,5 en Italia. Con la curva elegida y las duraciones medidas de §8.3:

| Modo | Una llana (e7) | Una media (e13) | Una reina (e18) | Una reina larga (Colombia e5) | Un día real, de llanas a reinas como la e18 | Con reinas largas |
| --- | --- | --- | --- | --- | --- | --- |
| `Watch` | 7:39-7:41 | 8:49-9:03 | 13:21-13:35 | 19:38-19:59 | de 28 a 49 min | hasta 73 min |
| `Highlights` | 2:12 | 2:30-2:34 | 4:29-4:31 | 6:32-6:37 | de 8 a 16 min | hasta 24 min |
| el digest | 1:00 de presupuesto (0:54-0:55 medido) | 1:30 (1:26-1:28) | 2:30 (2:32-2:34) | 2:30 (3:19-3:21) | de 3 a 9 min | hasta 12 min |

Las cifras por día multiplican por 3,65 las de una etapa (una llana, 7:39 × 3,65 = 28 min; una reina como la e18, 13:28 × 3,65 = 49 min; Colombia, 19:59 × 3,65 = 73 min), como D-19; en Italia, por 3,5, de 27 a 47 min y hasta 70. Son un orden de magnitud, porque un día real mezcla tipos. El digest, medido con `l4/zonas.mjs` (la columna entre paréntesis), se desvía de su presupuesto del −9 % en la llana al +34 % en Colombia, porque la estimación nominal que lo escala (§8.2) se queda corta en los finales en alto largos; no depende de lo que pasa en la etapa, y así la promesa `Watch the race in 40 minutes` (§8.8) es una cuenta del recorrido.

Por eso el modo con que se entra es una decisión del dueño con esa cifra delante, DD-03: por defecto, `Watch` a ×1 con `BROADCAST.pace`; la alternativa es `Highlights` por defecto, de 8 a 24 min al día. `datos.md` §16.3 decía «unos 13 min al día» con su mediana de 12,7 min por etapa, y es falso: son unos 46 (ejecutabilidad #15).

### 8.5 Los mandos

D-20, escrito como hecho (I-21). Pausa, cuatro velocidades, `Next action`, saltos de RECORRIDO, atrás libre dentro de lo reproducido, `Show result` con confirmación, reanudar con `Previously` y pausa al ocultar la pestaña (pantalla). Nunca un «siguiente suceso» como destino: diría que lo hay y dónde (mapa 06 §7.2, regla 3; por eso se descartan `Skip the quiet part` de `producto.md` §5 y el `Next action` de `datos.md` §5, que servían hasta el siguiente suceso). La barra de progreso va en km, uniforme hacia delante, con marcas solo del recorrido (los puertos con su categoría y las volantes, de `ProfileStrip`), la posición pintada de la cabeza y, más clara, lo alcanzado; nunca un suceso.

| Mando (pantalla) | Gesto | Qué hace con `t` | Qué hace con lo alcanzado | Red |
| --- | --- | --- | --- | --- |
| `▶` / `❚❚` | el botón, tocar el plano (8-p) o la barra espaciadora | para o sigue; los rótulos en pantalla se quedan | nada; al pausar se informa | un `POST /api/me/watch/:raceKey/:day` con el `mode` del modo |
| `×½ ×1 ×2 ×4` | el selector | multiplica el factor de la zona (`BROADCAST.speeds`); no mueve las zonas | nada | ninguna; el colchón de tramos, en pared, se divide (tabla de abajo) |
| `Next action` | un toque | multiplica por `BROADCAST.nextActionSpeedup` (20) hasta que ENTRA en la cola un `Cue` de clase ≥ `BROADCAST.nextActionMinClass` (2) que no sea de la ronda de la moto (6-m: la ronda presenta un suceso, no lo es); luego vuelve a la velocidad anterior. Apagado desde `last_km`: el último km no se acelera (8-o) | crece con lo pintado | tramos a ×20 (tabla de abajo) |
| `−5 km` | un toque | vuelve a la hora en que la cabeza estaba 5 km antes (bisección sobre la línea en memoria) | nada: lo alcanzado no baja | ninguna |
| `+5 km`, `Next climb`, `Final 20 km`, `Last km` | un toque | salta a la hora en que la cabeza llega al km destino | pasa al destino (`mode: 'seek'`) | los tramos intermedios (algoritmo de abajo) |
| tocar la barra de progreso o el perfil | un toque en un km | delante: como un salto a ese km; detrás: como `−5 km` a ese km | delante, al destino; detrás, nada | delante, los tramos intermedios |
| `Highlights` / `Watch` | el conmutador | cambia la curva de la zona | nada; la letra la pone el modo con que se llega a meta (§8.1) | ninguna |
| `Commentary` | un toque | despliega las líneas ya dichas (`revealS ≤ t`) | nada | ninguna |
| `Show result` | el menú `⋯` | la confirmación (DD-17) y, aceptada, la meta y el cierre | la etapa pasa a revelada (`R`) y arrastra las anteriores (`A`, D-28) | `POST /api/me/reveal/:raceKey/:day` y `POST …/broadcast/finish` |
| ocultar la pestaña | `visibilitychange` | pausa | se informa | `fetch(…, { method: 'POST', keepalive: true })` |
| cerrar o salir | `pagehide` | | se informa | `navigator.sendBeacon` con un `Blob` de tipo `application/json` (D-51) |
| volver a una etapa a medias | entrar | `t ← alcanzado − BROADCAST.resumeBackS` (60 s de carrera) y `Previously` | nada | los tramos de 0 a lo alcanzado más la precarga, de cuatro en cuatro |

**Los destinos de los saltos** son todos del recorrido, que es público, y ninguno pasa de un km antes de meta: `+5 km` es el km pintado de la cabeza más `BROADCAST.seekStepKm` (5); `Next climb`, el pie del siguiente puerto de `ProfileStrip.climbs` menos `BROADCAST.climbCardLeadKm` (3 km), para que salga su ficha (§6.7), y está apagado si no quedan puertos; `Final 20 km`, la longitud menos `BROADCAST.seekFinalKm` (20), apagado si la cabeza ya los ha pasado; `Last km`, la longitud menos 1. La meta solo se alcanza viéndola o con `Show result`: ningún salto la cruza, así que ninguno puede revelar el final por accidente (decisión 8-j). En una crono los saltos son de reloj y de orden de salida (`−10 min`, `+10 min`, `Last 20 starters` y `Last starter`; §9.4, decisión 9-g), con el algoritmo de abajo y la misma regla: ninguno cruza la meta.

**Un salto, paso a paso.** La hora a la que la cabeza llega al km destino es futuro: no está en lo servido ni en la cabecera (D-06). Se va a buscar tramo a tramo, y cada tramo que se pide por delante exige que lo alcanzado informado lo permita (409 `beyond_reached` si `toDs` pasa de lo alcanzado más `BROADCAST.prefetchRaceS`, 900 s; B18):

```
saltar(kmDestino):                                                        // apps/web/src/domain/broadcast/player.ts
  kmDestino ← mín(kmDestino, longitud − 1)
  mientras el km de la cabeza al final de lo servido < kmDestino y el último tramo no lleva atFinish:
    POST /api/me/watch { reachedS: servido, mode: 'seek' }                // saltar es alcanzar: el tramo saltado cuenta como pasado
    GET …/broadcast/chunk?fromDs=toDs(servido)&toDs=toDs(servido + chunkRaceS)   // permitido: alcanzado + chunkRaceS ≤ alcanzado + prefetchRaceS
  tDestino ← la primera hora de lo servido en que el km pintado de la cabeza llega a kmDestino (bisección sobre instantAt)
  saltados ← los Cue de (t, tDestino] con clase ≥ skippedMinClass (2), de cuesBetween y del reproductor
  t ← tDestino; alcanzado ← máx(alcanzado, tDestino); POST { reachedS: tDestino, mode: 'seek' }
  enseñar While you skipped con los recapMaxCues (5) de saltados, en orden de carrera, y después el cuadro de diferencias (§6.7)
  y, si una fuga formada en lo saltado sigue por delante del pelotón, su presentación entera: la lista, la frase y la ronda (6-m, §6.7)
```

Lo alcanzado durante el salto es lo servido y no lo pintado, y es a propósito: el salto es el acto explícito de dar esos km por pasados (D-20: los saltos «mueven lo alcanzado al destino»). Si la pestaña se cierra a mitad, lo alcanzado se queda en un punto anterior al destino y la etapa sigue a medias, que para el resto del producto es oculta (D-28): el salto no puede convertir una etapa en vista, porque nunca pasa de un km antes de meta. `While you skipped` (pantalla) es el corte de la tele (mapa 06 §5.4): lo que ha cambiado mientras no mirabas, y enseguida dónde estamos. Un salto de 125 km (`Final 20 km` desde el km 30 de la llana e7) son unos 12 tramos, 24 peticiones seguidas, porque cada tramo espera al informe que lo permite (§10.11): con `Fast 4G`, a unos 0,17 s cada una, unos 4 s; con `Slow 4G`, a unos 0,6 s (560 ms de latencia, §18.7), de 13 a 15 s (estimado), con `Skipping to 20 km to go…` (pantalla) en el plano. Lo mide el paso 10 con `Slow 4G`, con umbral de 5 s (§18.9). Si no lo cumple, no sirve informar de una vez la hora de destino y pedir los tramos en paralelo: esa hora es futuro y el cliente no la tiene (D-06), y una estimada que se pasara de la meta revelaría la etapa con un salto, que es lo que 8-j prohíbe. Sirve que el salto lo haga el servidor, que tiene la línea entera: un `POST …/broadcast/seek` con el km destino, que calcula la hora con la misma bisección, escribe lo alcanzado con `mode: 'seek'` y devuelve los tramos intermedios en una respuesta, una ida y vuelta en lugar de 24. Es una ruta más en §14.2 y en el registro de §14.5, y se decide con la cifra del paso 10 (decisión 8-t).

```
(pantalla · While you skipped · tras Final 20 km en la e18; los sucesos son ilustrativos)
WHILE YOU SKIPPED
km 37   KOM · Côte d'Engins · 1. LEROY
km 62   BREAKAWAY · 3 riders
km 92   KOM · Côte de Monteynard · 1. MORENO
km 141  CAUGHT · the chase group
km 164  KOM · Côte de Saint-Léger-les-Mélèzes · 1. KAHN
```

`Previously` (pantalla) es lo mismo al reanudar: los `recapMaxCues` (5, propuesta) últimos `Cue` de clase ≥ 2 anteriores a lo alcanzado, en orden de carrera, y después el cuadro de diferencias y, si hay una fuga por delante del pelotón cuya lista no se ha pintado en esta reproducción, su presentación entera (6-m, §6.7). Los dos se quedan `BROADCAST.cueHoldS[3]` (6 s) o hasta que se tocan, fuera de la cola. Hacia atrás, en cambio, no hay red ni cuenta nueva: el reproductor guarda en memoria la línea servida (`cutTimeline(tl, servido)`, §4.6), vuelve a calcular el instante, vacía la cola y lo que se vuelve a ver se vuelve a rotular, como una repetición.

**La red al reproducir** (decisión 8-d). Fuera de un salto, el reproductor mantiene servida la carrera por delante de lo que pinta, dentro de lo que el servidor permite (D-06, D-55):

```
cada fotograma:
  si servido − t < chunkRaceS / 2 (450 s de carrera), no hay petición en vuelo y el último tramo no lleva atFinish:
    si informado + prefetchRaceS − servido < chunkRaceS / 2: POST { reachedS: alcanzado, mode } (informado ← alcanzado)   // lo pintado, no lo servido
    GET chunk (servido, mín(servido + chunkRaceS, informado + prefetchRaceS)]
  además, cada progressEveryRealS (15 s de pared), al pausar, al ocultarse y al salir: POST { reachedS: alcanzado, mode }
  si t llega a servido sin tramo nuevo: el reloj espera en el último fotograma pintado, con `Loading` en los mandos
  si una petición falla (red caída, 5xx): pausa con `Connection lost · Retry` (pantalla; D-57)
  si responde 429: espera los segundos de su `retry-after` con `Loading` en los mandos y la repite; no es un fallo (§10.12, 14-q)
```

El servidor escribe `race_watch` solo si lo alcanzado creció al menos `BROADCAST.progressMinDeltaS` (60 s de carrera) o cambia el estado (D-55; §10.3); pedir un tramo no escribe nada. Lo que da de sí la precarga depende del modo: son 900 s de carrera, y en pared duran 900 / (factor · velocidad):

| Modo | > 50 km | 50-20 | 20-5 | 5-1 | último km |
| --- | --- | --- | --- | --- | --- |
| `Watch` ×1 | 15 s | 30 s | 75 s | 225 s | 600 s |
| `Watch` ×4 | 3,8 s | 7,5 s | 19 s | 56 s | 150 s |
| `Highlights` ×1 | 3 s | 7,5 s | 22,5 s | 90 s | 300 s |
| `Highlights` ×4 | 0,75 s | 1,9 s | 5,6 s | 22,5 s | 75 s |
| `Next action` desde `Watch` ×1 | 0,75 s | 1,5 s | 3,8 s | 11 s | 600 s (apagado, 8-o: va a `Watch` ×1) |

En los tres casos más rápidos, cada recarga (un `POST` y un `GET`) tiene menos de un segundo, y con una red lenta la imagen se queda quieta un momento en el último fotograma pintado: nunca se adelanta nada ni se salta un rótulo, porque el reloj espera. Una etapa son de 16 a 32 tramos (medido, `l4/zonas.mjs`: la llana e7, 16; Colombia e5, 31-32). El móvil con «Fast 4G» lo mide a mano el paso 10 (§18.5, §18.7).

**`Show result`** ([DUEÑO 2] y «dame el resultado», D-38): en el menú `⋯` de los mandos y en toda puerta. La primera vez confirma, `Show the result of Stage 18? You won't be able to watch it without knowing.`, con `Don't ask again` (pantalla; DD-17, que guarda `users.reveal_confirm = false`); aceptado, el reproductor llama a `POST /api/me/reveal/:raceKey/:day`, después a `POST …/broadcast/finish`, y enseña el ganador, el fuera de control si lo hay y el cierre, sin los grupos que llegan (§8.7). Revelar no cuesta ni da nada (B20, §11.11), y la etapa revelada se puede ver igual (`Watch anyway`, pantalla).

### 8.6 El montaje

D-22, escrito como hecho (I-22, O-29): la previa y el cierre son parte de la emisión, en el orden de la señal internacional (mapa 06 §8.1: «map and profile, weather, live coverage, finish + slow motion replays, … classifications, interviews, podium ceremony»). La señal de la UCI abre además con «finish of the previous stage + classifications», que para quien no ha visto la anterior es su destripe (mapa 06 §7.2, regla 6); aquí no hace falta, porque quien ve la N conoce la N−1 (lo conocido es un prefijo, D-28) y las clasificaciones de salida ya están en los cuadros 3 y 4. Cómo se pintan es §6.11; lo que dicen, aquí.

**La previa: cuatro cuadros de `BROADCAST.previewCardS` (5 s de pared)**, de `BroadcastHead.preview` (`StagePreview`, §4.11). Los ejemplos son de la e18: el recorrido y los puertos, medidos (`l4/perfil.mjs`, con los nombres de `STAGE_FEATURES`); el tiempo, los maillots y los favoritos, ilustrativos, porque el banco corre la etapa suelta.

```
(pantalla · previa, cuadro 1 · el recorrido)
STAGE 18 · SUMMIT FINISH · 185 km
[el perfil, con los puertos sombreados]
Côte d'Engins · Cat. 1 · 16.9 km at 4.0% · km 37
Côte de Monteynard · Cat. 2 · 8.8 km at 5.0% · km 92
Côte des Terrasses · Cat. 3 · km 113
Intermediate sprint · km 129
Côte de Saint-Léger-les-Mélèzes · Cat. 3 · km 164
Orcières-Merlette · Cat. 1 · 15.1 km at 4.7% · finish
```

El título es `BroadcastHead.stage.name` en mayúsculas y la longitud, `stage.km`. Cada puerto, de `ProfileStrip.climbs`: su nombre (sin nombre, `Cat. 2 climb`), su categoría (`HC` o `Cat. 1` a `Cat. 4`), su longitud y su media si tiene pie, y el km de la cima o `finish` si corona en meta; cada volante de `sprintsKm`, `Intermediate sprint · km 129`; en un circuito, `3 laps of 14.2 km`. En orden de km y como mucho seis líneas, el resto en `+2 more climbs`.

```
(pantalla · previa, cuadro 2 · el parte)
WEATHER
21°C · dry
Wind 18 km/h
Crosswind: km 40-65 · km 120-135
```

De `StageWeather` (D-14, I-19): la temperatura, `dry` si ningún tramo lleva lluvia, `rain` si llueve desde la salida y `rain from km 120` si entra después (el primer tramo con `rain > 0`); el viento del día (`windKmh`, el mismo en todos los tramos, `weather.ts` l. 279), o `No wind`; y los tramos de viento lateral, fundidos los seguidos, que es donde puede haber abanicos. Ni punto cardinal ni rumbo (decisión 6-k): el recorrido del motor no tiene geometría (`weather.ts` l. 175-181).

```
(pantalla · previa, cuadro 3 · los maillots en juego)
JERSEYS IN PLAY
[GC]  11 Sam Carter · closest: Iñigo Arrieta +0:04 · Mads Olsen +0:09 · Pierre Lambert +0:31
      Finish bonus: 10, 6, 4 s
[PTS] 7 Rafael Díaz · 45 points at stake today · within reach: Erik Voss, Pelle Ekdal
[KOM] 45 Jonas Verhoeven · 29 points at stake today · within reach: Antoine Leroy
```

`StagePreview.jerseysInPlay` lo arma la API al servir la cabecera, con las clasificaciones tras la N−1, que ya se cortan por etapa (`getPointsClassification`, `getKomClassification`, `leadersThroughStage`; mapa 02 §9, punto 5): quién LLEVA cada maillot (`StartState.leaders`) y quién puede quitárselo hoy (decisión 8-f). En la general, los `BROADCAST.previewThreatsMax` (3, propuesta) siguientes de la general de salida con su diferencia (`StartState.gcTop`), y la bonificación de meta (`STAGE.timeBonuses`, 10, 6 y 4 s, `constants.ts` l. 6285) si es una etapa en línea de una vuelta: la crono no bonifica (`timetrial.ts` l. 362). En los puntos y en la montaña, los puntos en juego hoy, que salen del recorrido (la meta, `STAGE.finishPoints[0]`, 25, más `STAGE.sprintPoints[0]`, 20, por volante: 45 en la e18; en la montaña, el primer premio de cada cima por su categoría en `STAGE.climbPoints`, l. 5036-5042: 10 + 5 + 2 + 2 + 10 = 29 en la e18), y como mucho tres corredores de esa clasificación a menos de esos puntos del líder; sin puertos, `No mountain points today`. En la primera etapa de una vuelta nadie lleva maillot (UCI 2.6.018, D-24): el cuadro dice `Stage 1 · the stage winner takes the first leader’s jersey` y los puntos en juego. En una carrera de un día no hay maillots y el cuadro no sale: la previa tiene tres (15 s).

```
(pantalla · previa, cuadro 4 · los favoritos)
FAVOURITES
General classification: Sam Carter · Iñigo Arrieta · Mads Olsen
Climbers: Nicolás Moreno · Antoine Leroy · Jonas Kahn
```

Sin `fame` (D-22, D-26: `riders.fame` no se escribe en ninguna parte). Los `BROADCAST.previewGcTop` (3) primeros de la general de salida (`why: 'gc'`; no hay en la primera etapa ni en una carrera de un día) y los `BROADCAST.previewAttrTop` (3) mejores inscritos por el atributo del tipo de etapa, que es público (`publicRiderDetailSchema.attributes`, `packages/shared/src/contracts.ts` l. 713-737): llana SPR (`Sprinters`), media COL (`Puncheurs`), reina MON (`Climbers`), crono CRI (`Time triallists`) y clásica PAV (`Cobbles specialists`) si su recorrido tiene algún segmento `paves` (`SegmentTerrain`, `types.ts` l. 13), MON si tiene un puerto HC o de 1.ª y COL si no (decisión 8-f; D-22 no decía qué hacer con una clásica sin pavés, como Lieja o Lombardía). El atributo que se ordena es el del día de la etapa, congelado al grabarla, y no el de hoy: el aprendizaje de carrera cambia los atributos de todos los que corren después de cada etapa, con el puesto y el abandono dentro (`raceLearning`, llamada en `packages/db/src/stageRun.ts` l. 791-805; el abandono y el puesto pesan en `packages/engine/src/world/learning.ts` l. 99-111), así que ordenar con los de hoy haría depender la previa de la N de cómo acabó la N y de las siguientes (B1c, §16.3). Congelarlo es `TimelineCast.favourites` (§4.2, 4-u): cada favorito con el atributo que lo puso ahí (`why`: `sprint`, `hills`, `climb`, `tt` o `cobbles`), leído por `buildTimelineCast` antes del aprendizaje de la etapa (decisión 8-g). La API arma `StagePreview.favourites` con los `previewGcTop` de `StartState.gcTop` (`why: 'gc'`) seguidos de los de `cast.favourites`; en las etapas del adaptador de la radio, sin línea, solo salen los de la general, y con la anterior velada la cabecera no sirve ninguno (8-f).

Con la anterior velada (`BroadcastHead.gate`, `previous_unseen`), la previa no se pinta (§6.11), y la cabecera la sirve solo con `route` y `weather`: los maillots, la general de salida y los atributos de después de la N−1 dependen de cómo acabó (decisión 8-f). En el digest, solo sale el cuadro 1 (§8.8). El horario de paso a tres medias, que la previa de la tele enseña (mapa 06 §9, fila 35), no sale: la etapa ya está corrida y cada espectador la reproduce cuando entra (DD-15, §8.10), así que una hora de reloj no le dice nada; su equivalente es la duración que anuncia la ficha, `About 13 min` (§8.2) (decisión 8-r).

**El cierre**, tras la llegada (§8.7), cuadros de `BROADCAST.closingCardS` (6 s de pared, propuesta, sin evidencia de los jueces) que pasan solos o con el dedo; el último se queda. De `BroadcastFinish.result` y `BroadcastFinish.closing` (`StageClosing`, §4.11):

```
(pantalla · cierre)
STAGE 18 · RESULT                                  GENERAL CLASSIFICATION · after stage 18
1   15 Nicolás Moreno  Team Alpha   4:59:38        1  ▲2  15 Nicolás Moreno        78:12:04
2  225 Jonas Kahn      Team Omega     +0:12        2  ▼1  11 Sam Carter              +0:21
3   18 Antoine Leroy   Team Alpha     +0:31        3  ▼1  88 Iñigo Arrieta           +0:48
…                                                  …
10 152 Pelle Ekdal     Team Nu        +2:02        10  =  152 Pelle Ekdal            +6:40
64  88 Iñigo Arrieta (your rider)    +14:10

JERSEYS TOMORROW                                   MOST KILOMETRES OUT FRONT
[GC]  15 Nicolás Moreno · new                      15 Nicolás Moreno · 142 km
[PTS]  7 Rafael Díaz
[KOM] 18 Antoine Leroy · new                       OUT OF THE RACE
                                                   ABANDON · 45 Jules Moreau
Next: Stage 19 · 204 km · Hills · [Watch]          TIME CUT · 12 riders
[Report]
```

1. **El resultado**: los `BROADCAST.closingResultTop` (10) primeros y los corredores del espectador con su puesto; el podio resaltado; con los que no acabaron y su motivo al final, como hoy (`StageResultEntry`, `contracts.ts` l. 1278-1306). El corredor al que la regla de los 3 km dejó con el tiempo de su grupo lleva `same time (3 km rule)` (pantalla) junto a su tiempo (§6.8, decisión 6-o).
2. **La general tras la etapa**, con flechas (`StageClosing.gcAfter.move`: `▲2`, `▼1`, `=`) y el corredor propio. No sale en una carrera de un día: su general es una copia del resultado (SPEC §6.15).
3. **Los maillots de mañana**, con `new` donde cambian (`jerseysTomorrow.changed`); tras la última etapa, `FINAL JERSEYS`. No sale en una carrera de un día.
4. **`Most kilometres out front`**: el mayor `kmEnFuga` de `StageEffort` (`packages/engine/src/stage/types.ts` l. 549: «Kilómetros rodando por DELANTE del grupo principal»), un hecho y no el premio de un jurado (DD-14, por defecto sí). No sale si nadie rodó delante.
5. **Fuera de carrera**: abandonos y fuera de control (`StageClosing.outOfRace`). No sale si no hay.
6. **La siguiente**: `Next: Stage 19 · 204 km · Hills` (pantalla) de `StageClosing.tomorrow` (`PreStageInfo`) con `Watch` si ya se ha corrido o `Tomorrow` si no; tras la última, `Final stage`. Y siempre `Report`: la etapa ya es conocida y el acta está a un toque (§8.8).

La clasificación por equipos no tiene cuadro: vive en `Report` → `Classifications` (pantalla), como hoy. Las tablas de puntos y de montaña tampoco lo tienen: el cuadro 3 dice quién lleva cada maillot mañana y si cambia (`jerseysTomorrow`), y las tablas enteras, con sus cambios, están a un toque en `Report` → `Classifications`. El mapa 06 §9 (fila 34) pide en el cierre la general, los puntos, la montaña y los equipos con sus cambios; aquí solo la general tiene tabla, porque el cierre ya son seis cuadros, 36 s si pasan solos, y el que sube en los puntos sin llevar el maillot no sale en ninguno (decisión 8-s, sin evidencia de los jueces). Si el dueño las quiere, `StageClosing` gana `pointsAfter` y `komAfter` con la forma de `gcAfter` y dos cuadros detrás del 3.

### 8.7 La llegada

Nada de la llegada viaja antes de tiempo (D-06, I-15). Los tramos solo llevan datos con visibilidad menor que el borde de la meta (`finishDs`, la última marca de la cabeza, §4.6); el tramo que lo toca lleva `atFinish: true`, que solo dice lo que ya dicen los km a meta. Llegadas, resultado, acta, clasificaciones de después y noticias van en `BroadcastFinish`, que la web pide con `POST …/broadcast/finish` y nunca con un `GET` (D-51).

La secuencia, en el reproductor:

1. **Los últimos 500 m** (`BROADCAST.quietFinalM`): solo la distancia (§6.9). La capa fija baja en metros, el plano se vacía, la voz calla.
2. **La línea.** Cuando el último tramo trae `atFinish` y el km pintado de la cabeza llega a su último bloque (el tope de su extrapolación, §4.5, porque su marca de meta es `finishDs` y no se sirve), el reloj se para con `0 m` en la capa fija y el reproductor informa (`POST /api/me/watch` con `reachedS` en el borde), que devuelve `{ status: 'watching', rev }` con el `rev` de antes, porque el último tramo acaba en `finishDs − 1` y el borde no es la meta (`recordProgress` solo escribe la letra con `reachedS ≥ finishS`, §10.3); después llama a `POST …/broadcast/finish` con `{ mode: REPORT_MODE[view] }` (14-f, §8.11), y es esa llamada la que marca la etapa como vista con la letra del modo (§8.1). Como su paquete no lleva `rev` (§4.11), la web invalida `['horizon']` al recibirlo y lo pide otra vez (regla 3 de §10.9, §14.11). Si falla, `Connection lost · Retry` (pantalla; D-57), y la etapa sigue a medias hasta que llegue.
3. **El ganador** (`finish`, clase 3): `STAGE WINNER · 15 Nicolás Moreno · Team Alpha · 4:59:38` (pantalla), `BROADCAST.finishFreezeS` (3 s) de pared, el plano del ganador de la tele. La voz dice las líneas de la llegada (`bunch_sprint`, `final_km`, `stage_win`), que vienen en el acta del paquete (§12.2, §6.6).
4. **Los grupos que llegan** (`group_finish`, clase 1): uno por cada grupo de `BroadcastFinish.arrivals` detrás del ganador que lleve un corredor del espectador, un maillot de líder o a uno de los `BROADCAST.namedGcTop` (10) primeros de la general de salida, en orden de llegada, cada uno `cueHoldS[1]` (4 s): `BUNCH · +2:14`, `GRUPPETTO · +27:40`, `Sam Carter · Andrea Rossi · +0:47` (pantalla), con la palabra de §6.3 del grupo que llevaba a la mayoría de los suyos en el último instante. Los demás grupos están en el resultado; la tele tampoco espera al último. Si en uno de esos grupos llega un corredor al que la regla de los 3 km le dejó el tiempo del grupo tras caerse, su nombre lleva `same time (3 km rule)` (§6.8, 6-o).
5. **El fuera de control** (`time_cut`, clase 2), si lo hay: `TIME CUT · 12 riders outside the limit`.
6. **El cierre** (§8.6).

`PHOTO FINISH` (los textos de §21.6 F.3) no sale: el motor no mide lo ajustado de una llegada dentro de un grupo. El `margin` de `stage_win` es el hueco al grupo SIGUIENTE en segundos enteros (`simulate.ts` l. 9675-9676), y la cercanía entre el primero y el segundo de un mismo grupo no existe (mapa 06 §9, fila 27; decisión 8-h). Tras `Show result` (§8.5), la secuencia empieza en el paso 3 y se salta el 4: quien revela quiere el resultado, no la llegada.

### 8.8 Ver una cola seguida

D-39, en lo que toca al ritmo (la portada entera es §11.4; H-20, I-37). Quien entra una vez al día encuentra cuatro etapas nuevas de su vuelta, y quien entra los domingos, la vuelta acabada (mapa 04 §2). Tres reglas, sin evidencia de los jueces (el juez de ejecutabilidad vio el hueco, H-ejecutabilidad-04, y ninguna propuesta lo resolvía):

1. **Sin reproducción automática.** Al acabar una etapa, el último cuadro del cierre ofrece `Next: Stage 8 · Watch` (pantalla) y espera un toque. Una etapa son de 8 a 20 minutos (§8.3): encadenarlas sola dejaría al espectador que se duerme con tres etapas «vistas» sin haberlas visto, y la tele tampoco lo hace. Entrar en la siguiente pasa por su puerta si hace falta (§11.12).
2. **La más antigua primero.** `Next` ofrece la siguiente etapa no conocida de la MISMA carrera si ya se ha corrido; si no queda ninguna, la etapa lista para ver más antigua de otra carrera en guardia, por el día de juego en que se corrió.
3. **Dos carreras del mismo día, en filas separadas.** Un día de juego corre de 2 etapas en la mediana a 6 en el p90 (mapa 04 §2); la portada las enseña en una fila por carrera, sin intercalarlas (§11.4), y `Next` no salta de una carrera a otra mientras la primera tenga etapas listas.

**El digest** (`Watch the race in 40 minutes`, pantalla; D-39, I-37). Para quien vuelve con una carrera en guardia terminada y etapas veladas, `While you were away` ofrece verla entera deprisa: cada etapa velada, en orden, a `digestPace` (§8.2), que escala `summaryPace` para que su estimación nominal dure `BROADCAST.digestBudgetS` de su tipo (llana 60 s, media 90, reina 150, crono 120, clásica 150), y cada una cuenta como vista con `S` al cruzar su meta (DD-20). Aquí sí se encadena (decisión 8-c): el espectador ha pedido la carrera entera en un acto, y 21 toques la romperían; entre etapa y etapa sale el cuadro 1 de la previa de la siguiente (el recorrido, `previewCardS`, 5 s) y, tras cada meta, el ganador (`finishFreezeS`, 3 s); el cierre completo, solo tras la última, con la general final. `❚❚` para el digest en cualquier momento, `Show results` revela lo que queda sin castigo (D-38), y lo ya cruzado queda visto. En una crono, el digest es la curva de 8-m (§8.1), que dura de 1:56 a 2:03.

El número del botón no es una promesa redonda: se calcula, con lo que cuestan las etapas veladas por su tipo (decisión 8-b), y no mira la carrera:

```ts
// packages/shared/src/broadcast/pace.ts (sigue)
/** Los minutos de `Watch the race in 40 minutes` (decisión 8-b): los tipos de las etapas veladas y los cuadros fijos; nunca la carrera. */
export function digestMinutes(kinds: readonly StageKind[]): number {
  const race = kinds.reduce((s, k) => s + BROADCAST.digestBudgetS[k], 0)
  const cards = (BROADCAST.previewCardS + BROADCAST.finishFreezeS) * kinds.length + 6 * BROADCAST.closingCardS // el cierre final: seis cuadros
  return Math.max(1, Math.round((race + cards) / 60))
}
```

Con las 21 etapas de cada gran vuelta y los presupuestos de §15.3 (`l2/digest.mjs`: Italia 2.070 s, con 7 llanas, 7 medias, 6 reinas y 1 crono; Francia 2.190 s; España 2.370 s), el botón dice `Watch the race in 38 minutes` para Italia, `40` para Francia y `43` para España. La primera versión de D-39 contaba «21 etapas son unos 30 min»; con los presupuestos de §15.3 son de 34,5 a 39,5 min de carrera más 3,4 min de cuadros, y D-39 dice ya el número calculado (si el dueño quiere 30, DD-22). La duración real de cada etapa se desvía de su presupuesto porque lo escala la estimación nominal y no la carrera (medido con `l4/zonas.mjs`: de −9 % en la llana e7 a +34 % en Colombia e5, §8.4); como el error sale del recorrido y del reloj de la cabeza y no de los sucesos, no destripa. `Key stages` (las que marca el perfil: reinas, cronos y la última) y `Continue from stage 4` (pantalla) son §11.4.

### 8.9 La aceptación del ritmo

Los valores de `BROADCAST.pace`, `summaryPace`, `ttPace`, `ttLastKmX`, `nominalKmh` y `digestBudgetS` son iniciales (§15.6). Viven en `packages/shared`, así que ajustarlos es un PR sin bancos (`typecheck` y `test:rapido`, D-52), y se aceptan con dos pruebas antes de encender (D-19, D-60):

- **B17** (§16.4) corre la curva en las 24 etapas del mapa 07 §7 en el paso 0, como línea base con un script que lleva su propia copia de la curva y su propio reloj estimado de la cabeza, porque `paceAt` y el adaptador de la radio aún no existen (decisión 17-c), y otra vez en el paso 10 con la línea grabada, y falla si una duración sale de su banda. Las bandas (decisión 8-k, su única fuente escrita, que §16.4 cita: 16-v), con margen sobre lo medido en §8.3: `Watch` de toda etapa en línea entre 6:00 y 22:00 (medido, 7:39-19:59); `Highlights`, entre 1:45 y 7:30 (2:12-6:37); los últimos 5 km, al menos el 15 % de la duración de `Watch` en toda etapa y el 35 % en los finales en alto (medido, 18-24 % y 45-47 %); una crono, entre 5:00 y 13:00 (medido de 5:20 a 11:23: el prólogo de 176 corredores, de 6:24 a 7:06; la e16, de 11:14 a 11:23; las nacionales de 35 y 40 km con 30 y 12 corredores, de 5:20 a 5:52; §9.4); el digest de cada etapa, a menos del 40 % de su presupuesto (de −9 a +34 %); y el error de `estimateS`, con p90 por debajo de 60 s fuera de los finales en alto (55 s, §15.3).
- **La prueba de lectura** (PL, §16.5): el dueño y una persona que no conozca el diseño ven tres etapas (una llana, una reina y una clásica) con `BROADCAST_WATCH=admins` y, en tres puntos al azar de cada una, contestan sin ayuda las cuatro preguntas de SPEC §6.15 y, con una fuga de hasta 12 delante del pelotón, qué lleva cada uno, contestado mirando la barra, y quién tira detrás y por qué (§16.5, 16-w). Aceptación, nueve de nueve. Es el criterio del MVP paso 31, «un tercero entiende qué pasó en la etapa sin que nadie se lo explique» (`MVP.md` l. 140), y valida también el ritmo: si la carrera pasa demasiado deprisa para contestar, se baja la curva y se vuelve a medir con B17; nunca se toca el motor.

### 8.10 Lo que no se hace

**Un estreno a hora fija para todos** (DD-15, retirada como decisión del dueño en la fase 5: la impone el tick, §20.2). El tick corre todas las etapas de un día de juego en una transacción que no se trocea («NO se trocea: la atomicidad por día es un requisito de diseño», `packages/db/src/tick.ts` l. 259-261; la transacción, l. 262-284), y la hora real de cada día la marca el ancla del mundo, no un horario (mapa 02 §9, puntos 1 y 2). Estrenar a las 18:00 para todos obligaría a retener un resultado que ya existe o a partir esa transacción. Con la etapa entera guardada, «ver la etapa a ritmo es una decisión de presentación sobre datos ya cerrados» (mapa 02 §9, punto 1), y cada espectador tiene su hora.

**Decidir en vivo** ([DUEÑO 9]). La retransmisión se mira, no se juega: ningún mando cambia la carrera, que ya está corrida. El dueño tumbó decidir durante la carrera por incompatible con avanzar un día cada seis horas, y pidió lo contrario: «lo que hay que hacer si acaso es mejorar la granularidad de las instrucciones, con más escenarios hipotéticos quizás» (`docs/epics.md` l. 701-702); la táctica lo mantiene, «no como radio en vivo, que sigue prohibida» (`docs/tactica.md` l. 6323). Las órdenes de la etapa siguiente se dan antes, desde su página (§11.12).

Tampoco se enseña la duración ni lo que queda (§6.9), ni se ve una etapa «a la vez» con otros jugadores: lo visto es privado y la regla para lo que un jugador cuelgue de una etapa es de E9 (D-41, §11.14).

### 8.11 El reproductor por dentro

Todo lo anterior vive en un reductor puro, `playerStep`, en `apps/web/src/domain/broadcast/player.ts` (§17.20), como las demás piezas de `apps/web/src/domain/`, que llevan su prueba de vitest al lado (`raceTimeline.ts` y `raceTimeline.test.ts`, por ejemplo). No sabe de React ni de la red: recibe una acción y devuelve el estado siguiente y las peticiones que hay que hacer. `StageWatch.tsx` le da los fotogramas con `requestAnimationFrame`, calcula el instante (`instantAt`, §4.5) que pintan todos los componentes y ejecuta las peticiones en orden, cada una tras la respuesta de la anterior: un tramo que sigue a un informe no sale hasta que el informe ha respondido, porque el servidor autoriza el tramo con lo último informado (§10.11, §14.3). Así se prueba entero sin navegador (§8.12), y se ve de un vistazo que la hora no lee los sucesos: la única acción que los mira es `cueAdmitted`, y solo apaga `Next action` (B9), salvo con un rótulo de la ronda de la moto (6-m).

```ts
// apps/web/src/domain/broadcast/player.ts (nuevo). Puro: sin React, sin fetch, sin Date.now.
import { BROADCAST, type CueClass, type CueKind, type RaceS, type WatchMode } from '@cyclingstar/shared'

export type ViewMode = 'watch' | 'highlights' | 'digest'   // la curva: pace, summaryPace o digestPace; en crono, ttPaceAt y la de 8-m
export type PlayerPhase = 'preview' | 'playing' | 'paused' | 'waiting' | 'seeking' | 'recap' | 'arrival' | 'closing'
export type Speed = (typeof BROADCAST.speeds)[number]       // 0.5 | 1 | 2 | 4

export interface PlayerState {
  readonly phase: PlayerPhase
  readonly view: ViewMode
  readonly speed: Speed                   // en el digest, siempre 1
  readonly nextAction: boolean            // ×nextActionSpeedup hasta que entra un Cue de clase ≥ nextActionMinClass que no sea de la ronda (6-m)
  readonly t: RaceS                       // la hora pintada, la del instante de este fotograma
  readonly reachedS: RaceS                // lo alcanzado: máx. de lo pintado y de los destinos de salto; nunca baja (D-57)
  readonly reportedS: RaceS               // lo último informado; más prefetchRaceS, el tope de lo que se puede pedir (§10.11)
  readonly servedS: RaceS                 // el toDs del último tramo recibido, en s; el reloj no lo pasa
  readonly atFinish: boolean              // ese tramo llevaba atFinish: lo que sigue es POST …/finish
  readonly seekKm: number | null          // el km destino del salto en curso, ya recortado a lengthKm − 1
  readonly inFlight: boolean              // una petición de tramo o de meta en vuelo
  readonly notice: 'loading' | 'offline' | null // `Loading`, `Connection lost · Retry` (pantalla)
  readonly idleS: number                  // s de pared desde el último toque, movimiento o tecla; en playing, con idleS ≥ BROADCAST.controlsHideS los mandos se esconden (8-p)
  readonly stageDay: number               // la etapa que se reproduce; en el digest cambia al encadenar (8-c)
  readonly loaded: readonly number[]      // las etapas con tramos y línea en memoria; en el digest, como mucho dos (18-e)
}

/** Lo que el reductor no puede saber solo: la curva del modo, la longitud y, en el digest, la etapa siguiente. En carretera, baseX es
 *  paceAt(toGoKm, zonas del modo); en crono, ttPaceAt (§9.4). digestNext: la siguiente etapa velada del digest, o null en la última y fuera de él. */
export interface PlayerContext { readonly baseX: (view: ViewMode, t: RaceS, toGoKm: number) => number; readonly lengthKm: number; readonly digestNext: number | null }

export type PlayerAction =
  | { readonly k: 'frame'; readonly dtS: number; readonly toGoKm: number; readonly atLine: boolean } // del instante pintado
  | { readonly k: 'play' } | { readonly k: 'pause' } | { readonly k: 'hidden' } | { readonly k: 'leave' } | { readonly k: 'retry' }
  | { readonly k: 'touch' }                                                     // un toque, el ratón o una tecla: idleS vuelve a 0 y los mandos salen (8-p)
  | { readonly k: 'speed'; readonly x: Speed } | { readonly k: 'view'; readonly view: ViewMode } | { readonly k: 'nextAction' }
  | { readonly k: 'cueAdmitted'; readonly cls: CueClass; readonly kind: CueKind; readonly round: boolean } // round: un rider de la ronda de la moto, que no apaga Next action (6-m)
  | { readonly k: 'seek'; readonly km: number; readonly headKmAtEnd: number }  // headKmAtEnd: el km de la cabeza en servedS
  | { readonly k: 'back'; readonly toS: RaceS }                               // el hook biseca en la línea servida, sin red
  | { readonly k: 'chunk'; readonly toS: RaceS; readonly atFinish: boolean; readonly headKmAtEnd: number }
  | { readonly k: 'landed'; readonly toS: RaceS; readonly skipped: number }   // fin de un salto: la hora destino y los Cue de clase ≥ 2 saltados
  | { readonly k: 'failed' } | { readonly k: 'finished' } | { readonly k: 'cardDone' } | { readonly k: 'showResult' }
  | { readonly k: 'throttled'; readonly retryAfterS: number }                 // un 429: waiting con `Loading`; el hook repite la petición a los retryAfterS de pared (14-q); no es failed

export type PlayerEffect =
  | { readonly k: 'report'; readonly reachedS: RaceS; readonly mode: WatchMode; readonly beacon: boolean } // POST /api/me/watch; beacon en pagehide
  | { readonly k: 'chunk'; readonly fromS: RaceS; readonly toS: RaceS }                                   // GET …/broadcast/chunk
  | { readonly k: 'finish'; readonly mode: WatchMode }                                                     // POST …/broadcast/finish con { mode }: es la que escribe la letra (14-f)
  | { readonly k: 'reveal' }                                                                               // POST /api/me/reveal/:raceKey/:day
  | { readonly k: 'release'; readonly stageDay: number }                                                   // soltar los tramos (removeQueries) y la línea decodificada de esa etapa (18-e)

export const REPORT_MODE = { watch: 'play', highlights: 'summary', digest: 'digest' } as const satisfies Record<ViewMode, WatchMode> // en un salto, 'seek'

/** La entrada: la previa en 0, o lo alcanzado menos resumeBackS con `Previously` y los tramos de 0 a lo alcanzado más la precarga (8-l). */
export function playerInit(view: ViewMode, stageDay: number, reachedS: RaceS | null, known: boolean): { readonly next: PlayerState; readonly effects: readonly PlayerEffect[] }
export function playerStep(s: PlayerState, a: PlayerAction, ctx: PlayerContext): { readonly next: PlayerState; readonly effects: readonly PlayerEffect[] }
```

Los informes llevan siempre `reachedS`, nunca `t`: tras volver atrás, `t` está por debajo de lo alcanzado, y el servidor se queda con el mayor (`greatest`, §10.3), pero el tope de lo que se puede pedir lo calcula el reproductor con lo que informó (decisión 8-q). Las fases, con lo que hace el reloj en cada una:

| Fase | Se entra | El reloj | Pinta | Se sale a |
| --- | --- | --- | --- | --- |
| `preview` | al abrir una etapa sin lo alcanzado (`BroadcastHead.view` nulo o con `reachedS` nulo) o ya conocida | quieto en 0 | los cuadros de la previa (§8.6); por debajo ya se piden los primeros tramos, y la previa tapa esa espera | `playing` tras el último cuadro (20 s; 15 en una carrera de un día) o con `▶` |
| `playing` | `▶`, `Retry`, fin de la previa, del resumen o de la espera | avanza (§8.2) | todo (§6) | `paused`, `waiting`, `seeking`, `arrival` |
| `paused` | `❚❚`, tocar el plano, ocultar la pestaña, un fallo de red | quieto | lo mismo, con el rótulo quieto | `playing` con `▶` o `Retry` |
| `waiting` | el reloj llega a lo servido con un tramo en vuelo, o a la línea con `POST …/finish` en vuelo | quieto en el último fotograma | `Loading` en los mandos | `playing` al llegar el tramo; `arrival` al llegar `BroadcastFinish`; `paused` con `Connection lost · Retry` si falla |
| `seeking` | un salto hacia delante (§8.5) | quieto | `Skipping to 20 km to go…` sobre el último fotograma | `recap` al aterrizar, o `playing` si no se saltó ningún `Cue` de clase ≥ 2 |
| `recap` | tras un salto con rótulos saltados (`While you skipped`) o al reanudar (`Previously`) | quieto | el resumen, fuera de la cola (8-i) | `playing` tras `cueHoldS[3]` (6 s) o un toque |
| `arrival` | `BroadcastFinish` recibido en la línea, o tras `Show result` | quieto en `0 m` | los rótulos de llegada (§8.7) | `closing` tras el último; en el digest, `preview` de la etapa siguiente con su cuadro 1 |
| `closing` | fin de la llegada; en el digest, solo tras la última etapa | quieto | los cuadros del cierre (§8.6) | ninguna: el último cuadro se queda y `Next` abre otra etapa (§8.8) |

**Por qué el resumen para el reloj** (decisión 8-n). La cola no frena nunca (D-21), pero `While you skipped` y `Previously` no son rótulos de la cola: salen solo tras un acto del espectador, duran lo mismo pase lo que pase y no alargan la etapa por ningún suceso (B9). Con el reloj en marcha no servirían. A ×60, seis segundos de pared son 360 s de carrera, unos 4,4 km en llano a los 44 km/h nominales: `Next climb` aterriza 3 km antes del pie (`climbCardLeadKm`) para que salga la ficha del puerto, y la ficha, que entraría en la cola bajo el resumen, caducaría en su espera de 6 s con la cabeza ya subiendo. Al reanudar, los 60 s de `resumeBackS` pasarían en un segundo, y el espectador saldría del resumen cinco minutos de carrera más allá de lo que había visto.

**Lo que las pruebas comprueban en cada paso del reductor** (§8.12):

1. `reachedS` no baja nunca, y `t ≤ servedS`.
2. Con la etapa no conocida, `servedS ≤ reportedS + prefetchRaceS`: ningún efecto `chunk` pide más allá, porque antes sale el `report` que lo permite, y el 409 `beyond_reached` (B18) no salta nunca.
3. `t` solo avanza en `playing`.
4. Un salto aterriza como mucho en la hora en que la cabeza pasa por `lengthKm − 1`; ningún salto emite `finish`, y ningún `report` con `mode: 'seek'` lleva la hora de la meta.
5. `finish` solo sale con `atFinish` y `atLine`, o tras `reveal`; `arrival` y `closing`, solo tras `finished`.
6. El `finish` lleva `REPORT_MODE[view]` en su cuerpo, y con él la letra (§8.1); el `report` del borde, justo antes, no la escribe, porque su `reachedS` es el borde (`finishDs − 1`) y no la meta (§10.3, §14.11).
7. En el digest, `speed` es 1 y `nextAction` es falso; en `watch` y `highlights`, desde `closing` no se pide nunca otra etapa (§8.8, regla 1).
8. En el digest, al empezar la etapa k + 1 sale `release` de la k − 1, y `loaded` nunca tiene más de dos etapas (18-e).
9. Un `cueAdmitted` con `round` no apaga `nextAction` (6-m), y un `throttled` deja la fase en `waiting` con `Loading`, nunca en `paused` con `Connection lost` (14-q).
10. `touch` pone `idleS` a 0; los mandos solo se esconden en `playing` (8-p).

**Dónde está cada mando** (decisión 8-p). En el teléfono, la fila de los mandos de §6.1 lleva `❚❚`, la velocidad (`×1`; cada toque pasa a la siguiente de `×½ ×1 ×2 ×4`), `Next action`, `Commentary` y `⋯`, y debajo la barra de progreso en km. `⋯` abre una hoja desde abajo con los saltos (`−5 km`, `+5 km`, `Next climb`, `Final 20 km` y `Last km`; en crono, los de §9.4), el conmutador `Highlights` / `Watch` y, separado al final, `Show result`. En escritorio todo va en la fila (§6.1); además de la barra espaciadora de D-20, `←` y `→` son `−5 km` y `+5 km`, como los segundos de un reproductor de vídeo (sin evidencia de los jueces). **Los mandos se esconden**, como en un reproductor de vídeo: a los `BROADCAST.controlsHideS` (3 s de pared) sin tocar la pantalla, mover el ratón ni pulsar una tecla, la fila de los mandos y la barra de progreso se desvanecen y la pantalla queda para la carrera; la capa fija, el perfil, la barra de grupos, el rótulo y la voz no se esconden nunca (D-17). Vuelven con cualquier toque, movimiento o tecla, y no se esconden mientras la hora no avanza (`paused`, `waiting`, `seeking`, `recap`, la previa, la llegada y el cierre), con la hoja de `⋯` abierta ni con el foco del teclado dentro de ellos. Se esconden con opacidad y siguen en el árbol de accesibilidad, así que el lector de pantalla y el tabulador los encuentran siempre (D-57, §18.8). Con los mandos escondidos, el primer toque en el plano pausa, como fija D-20, y los enseña. La versión anterior los dejaba fijos porque «la pantalla es de datos y no de vídeo», que contradice el norte que dio el dueño, la retransmisión de televisión (commit `eee1b93`; «La pantalla es televisión», §0.4, punto 4), y dejaba 48 px de los 800 del teléfono ocupados toda la etapa (§6.1). «Tocar la pantalla» (D-20) es tocar el plano, el rótulo y la voz, porque las demás zonas tienen su toque propio: la capa fija abre su segunda línea (§6.2), una fila abre su grupo (§6.3), un nombre saca su rótulo (§6.5) y el nombre del rótulo abre su ficha (§7.1; antes de salir, el reproductor pausa e informa de lo alcanzado), y la barra y el perfil saltan (§8.5). En `recap` y en los cuadros de la previa y del cierre, un toque en el plano pasa al siguiente en vez de pausar.

### 8.12 Las pruebas

Tests primero: cada fila se escribe en el paso que la necesita (§17), antes que el código que la pone en verde. Todas corren en `test:rapido` con vitest y sin dependencias nuevas: las secuencias al azar salen de un generador con semilla fija, y el render de los mandos es estático con `renderToStaticMarkup`, como `apps/web/src/components/leaderJerseys.test.tsx` (l. 2), sin un DOM de mentira. `pace.test.ts` va en `packages/shared/src/broadcast/` y `player.test.ts` en `apps/web/src/domain/broadcast/`.

| Qué afirma | Fichero | Paso |
| --- | --- | --- |
| `paceAt` en los bordes de cada zona (a 50,0 km, ×30; a 50,01 km, ×60; en la línea, la del último km) y que `pace` y `summaryPace` bajan por `aboveKm` hasta 0 | `pace.test.ts` | 3a |
| `playbackEstimateS`, con los `altM` de las cinco etapas de §8.3 congelados en un fixture, da al segundo lo medido con `l4/estHighlights.mjs` (8:12, 9:08, 13:10, 11:06 y 15:36; §8.2), y la de `Highlights` de la e18, 4:25 | `pace.test.ts` | 3a |
| `digestPace` multiplica todas las zonas por un mismo factor y `playbackEstimateS(p, digestPace(p, kind))` da `digestBudgetS[kind]` con menos de 1 s de error; `digestMinutes` da 38, 40 y 43 con los tipos de las tres grandes vueltas | `pace.test.ts` | 10 |
| La parte del ritmo de B9: la misma línea con sus sucesos y con `events` vacío da la misma `t` fotograma a fotograma, a 60 fotogramas por segundo y con `Next action` apagado | `player.test.ts` | 3b |
| Las diez comprobaciones de §8.11, en cada paso de 1.000 secuencias de acciones al azar | `player.test.ts` | 3b (y 10 para los saltos, los modos, el digest y los mandos) |
| La red al reproducir (8-d): con un servidor falso que aplica la admisión de §10.11 y responde a los 150 ms, las cinco etapas de §8.3 enteras a `Watch` ×1 y ×4 sin un solo 409, y el reloj en `waiting` solo cuando el colchón de la tabla de §8.5 es menor que la respuesta | `player.test.ts` | 3b (y 10 para `Highlights` y `Next action`) |
| Los saltos: `Final 20 km` desde el km 30 de la e7 emite sus `report` con `mode: 'seek'` y sus `chunk` de 900 s en orden, cada `chunk` tras su `report`, y aterriza en el km 155; `Last km` aterriza en el 174 y no emite `finish`; `Next climb` sin puertos por delante no hace nada | `player.test.ts` | 10 |
| El resumen para el reloj (8-n): tras `Next climb`, el primer fotograma de `playing` está a `climbCardLeadKm` del pie y `climb_ahead` entra en la cola; al reanudar, `resumeBackS` antes de lo alcanzado | `player.test.ts` | 10 |
| `Next action` se apaga al entrar un `Cue` de clase ≥ 2 y vuelve a la velocidad de antes; con uno de clase 1 sigue, y con uno de la ronda de la moto también (6-m); desde `last_km` no se enciende (8-o) | `player.test.ts` | 10 |
| Un 429 en un tramo (`throttled` con `retryAfterS`): la fase queda en `waiting` con `Loading` y el hook repite a los `retryAfterS` de pared; nunca `Connection lost` (14-q). En el 3b, no en el 10: `PLAYER_RATE_LIMIT` existe desde el 3a y el dueño ve `Watch` desde el 3c, así que el reproductor espera un 429 desde que nace | `player.test.ts` | 3b |
| Los mandos (8-p): en `playing`, tras `controlsHideS` de `frame` sin `touch`, quedan escondidos; un `touch` los enseña; en `paused`, `recap`, la previa y el cierre no se esconden | `player.test.ts` | 10 |
| La letra: el `finish` de la línea lleva `mode: 'play'` en `watch`, `'summary'` en `highlights` y `'digest'` en el digest, y el `report` del borde, justo antes, no llega a `finishS` (Rcobertura-030); un digest de tres etapas emite tres `finish` con `mode: 'digest'` en orden, con el cuadro 1 de la siguiente entre ellas, y al empezar la tercera sale `release` de la primera (18-e) | `player.test.ts` | 10 |
| `PlayerControls` a 360 px: `❚❚`, `×1`, `Next action`, `Commentary` y `⋯` en la fila; con `view: 'digest'`, solo `❚❚` y `Show results` | `apps/web/src/components/broadcast/PlayerControls.test.tsx` | 10 |
| La segunda parte de B3, la presentación de la fuga (6-m): el reproductor de verdad sin navegador (`cuesBetween`, la programación de §6.5, `admitir` y el fotograma de la cola, `isPresentation`, `aheadOfPeloton` y `breakRoundOf`) a 60 fotogramas por segundo de pared, sobre una fuga sintética con el campeón y el líder y sobre las cinco en línea congeladas en `Watch` a ×½, ×1 y ×2 y en `Highlights` a ×1; los umbrales son los de §16.4 (16-p) | `apps/web/src/domain/broadcast/breakPresentation.test.ts` | 6b (a mano en el 10b, sobre las 24 × 2) |

Lo que estas pruebas no ven, lo ven otras: B17 las duraciones de las 24 etapas dentro de las bandas de 8-k (§8.9, §16.4), B18 el 409 del servidor (§16.4) y el paso 10 el móvil con «Fast 4G», a mano (§18.5). Ninguna mira el motor: el ritmo se ajusta cambiando constantes de `packages/shared` y volviendo a medir (§8.9).

---

**Injertos aplicados.** I-15 (§8.7: la llegada, el resultado y el acta solo por `POST …/broadcast/finish`, nunca en un tramo), I-19 (§8.6: el cuadro del parte con el tiempo congelado), I-21 (§8.5: `Next action` a ×20 hasta un `Cue` de clase ≥ 2, `While you skipped` y `Previously`; §8.11, el reductor que los hace; la cola es §6.5), I-22 (§8.6: los cuatro cuadros de la previa y los seis del cierre, palabra por palabra), I-37 (§8.8: el digest de `While you were away` con `digestBudgetS` y el texto calculado; la portada es §11.4), I-38 (§8.2 y §8.3: la curva por zona de km a meta, sin pausas, con su reparto medido).

**Objeciones resueltas.** O-12 (§8.2 y §8.3: la curva de `producto` sin pausas, medida por el juez, con el reparto por zona medido aquí y las bandas de B17 para fijarla), O-29 (§8.6: la previa de cuatro cuadros y el cierre de la señal UCI como parte de la emisión).

**Huecos rellenados.** H-19 (§8.4: de 28 a 49 min al día en `Watch`, hasta 73 con reinas largas; de 8 a 24 en `Highlights`; de 3 a 12 en el digest; el modo por defecto es DD-03), H-20 (§8.8: sin reproducción automática, la más antigua primero y dos carreras del mismo día en filas separadas; el digest sí se encadena). Contradicciones de hecho que quedan resueltas: X-18 (§8.3) y X-19 (§8.4).

**Decisión tomada aquí.**
- 8-a. `digestPace` escala `summaryPace` con la estimación NOMINAL de la etapa (`playbackEstimateS`), no con el reloj de la cabeza: es causal y no necesita saber lo que tarda la carrera. Medido: de −9 a +34 % sobre el presupuesto. Descartado: escalar con el reloj real, que exige el futuro de la carrera en la cabecera (D-06).
- 8-b. El botón del digest calcula sus minutos con los presupuestos de las etapas veladas y los cuadros fijos (38, 40 y 43 para las tres grandes vueltas enteras) en lugar del «30» que llevaban D-39 y los textos de §21.6 F.3 (D-39 ya está corregida). Descartado: un número redondo que no se cumple.
- 8-c. El digest encadena las etapas solo, con el cuadro del recorrido entre una y otra; `Watch` y `Highlights` no encadenan nunca. El digest es un acto explícito sobre la carrera entera.
- 8-d. La red al reproducir: el reproductor pide el tramo siguiente cuando le quedan menos de `chunkRaceS / 2` de carrera servida, e informa antes de lo alcanzado (lo pintado) si el último informe no le deja pedirlo; si el tramo no llega a tiempo, el reloj espera en el último fotograma. En `Highlights` ×4 y en `Next action` el colchón es de 0,75 s de pared en la hora muerta; lo mide el paso 10 en el móvil.
- 8-e. La letra de lo visto la pone el `mode` del informe que cruza la meta, con `LETTER_OF_MODE` (§10.3): `play`, `W`; `summary` y `digest`, `S`. Un `seek` no cruza nunca la meta (8-j); si un cliente lo informara, la tabla lo anota `R`.
- 8-f. Los maillots en juego: en la general, los tres siguientes con su diferencia y la bonificación de meta si la hay; en puntos y montaña, los puntos en juego hoy según el recorrido y quién está a menos de ellos; la primera etapa y la carrera de un día tienen su texto o no tienen cuadro. Una clásica sin pavés ordena sus favoritos por MON si tiene un puerto HC o de 1.ª y por COL si no. Con la anterior velada, la cabecera lleva la previa solo con recorrido y parte.
- 8-g. Los favoritos por atributo se ordenan con los atributos del día de la etapa, congelados al grabarla, y no con los de hoy, que ya llevan el aprendizaje de esa etapa y de las siguientes. Es `TimelineCast.favourites` (§4.2, 4-u: `{ rider, why }`), que la API sirve detrás de los `previewGcTop` de la general de salida (`why: 'gc'`); sin línea, solo los de la general; con la anterior velada, ninguno (8-f).
- 8-h. La llegada: el ganador, los grupos que llevan un corredor propio, un maillot o un top 10 de salida, el fuera de control y el cierre, con cuadros de `closingCardS` que pasan solos. `PHOTO FINISH` no se usa: el motor no mide lo ajustado dentro de un grupo.
- 8-i. `While you skipped` y `Previously` enseñan como mucho `recapMaxCues` (5) rótulos de clase ≥ 2, en orden de carrera, y después el cuadro de diferencias; salen fuera de la cola y duran `cueHoldS[3]` o hasta un toque.
- 8-j. Ningún salto pasa de un km antes de meta; durante un salto, lo alcanzado que se informa es lo servido, porque saltar es dar los km por pasados, y aun así una etapa solo pasa a vista cruzando la meta. Los destinos (`+5 km`, `Next climb`, `Final 20 km`, `Last km`, un toque en la barra o en el perfil) son siempre del recorrido.
- 8-k. Las bandas de B17 de §8.9, con margen sobre lo medido. La de la crono empieza en 5:00 para que quepan las nacionales que midió §9.4 (5:20-5:52; Rcobertura-026). Descartado: fijarlas sin margen, que haría fallar el banco por una semilla.
- 8-l. Al reanudar, el reproductor pide los tramos de 0 a lo alcanzado más la precarga de cuatro en cuatro, porque `Previously` y `Commentary` necesitan lo anterior.
- 8-m. En una crono, `Highlights` y el digest son una sola curva: `ttPaceAt` por `ttPlaybackEstimateS / digestBudgetS.cri`, medida con el motor real de 1:56 a 2:03 en cuatro cronos y tres semillas. Descartado: una curva de `Highlights` propia de la crono, que no compra nada que no den `×2` y `×4` sobre sus 5:20 a 11:23.
- 8-n. `While you skipped` y `Previously` paran el reloj mientras están en pantalla. A ×60, seis segundos son 4,4 km: la ficha del puerto de `Next climb` caducaría bajo el resumen y el espectador saldría de `Previously` cinco minutos de carrera más allá de lo visto. No es un freno de la cola (D-21): solo sigue a un acto del espectador y dura lo mismo pase lo que pase.
- 8-o. `Next action` se apaga desde el rótulo `last_km`: el último km se ve a su ritmo, como en la tele, y para ir más deprisa quedan `×2` y `×4`.
- 8-p. En el móvil, la fila lleva `❚❚`, la velocidad, `Next action`, `Commentary` y `⋯`, y la hoja de `⋯` los saltos, el conmutador de modo y `Show result`. Los mandos se esconden a los `BROADCAST.controlsHideS` (3 s de pared) sin tocar, como en un reproductor de vídeo, y vuelven con cualquier toque, movimiento o tecla; no se esconden mientras la hora no avanza ni con el foco dentro, y siguen en el árbol de accesibilidad. «Tocar la pantalla» de D-20 es tocar el plano: pausa y enseña los mandos. En escritorio, `←` y `→` son `−5 km` y `+5 km`. Sin evidencia de los jueces. Descartado: los mandos fijos de la versión anterior («la pantalla es de datos y no de vídeo»), que contradice el norte de la televisión (Rdueno-014).
- 8-q. El reproductor es un reductor puro, `playerStep`, cuyos efectos ejecuta el hook en orden y cada uno tras la respuesta del anterior; los informes llevan siempre lo alcanzado y nunca `t`; la meta la escribe el efecto `finish` con su `mode`, no el informe del borde. Descartado: la lógica dentro del componente, que no se prueba sin navegador.
- 8-r. La previa no enseña el horario de paso a tres medias de la tele (mapa 06 §9, fila 35): la etapa está corrida y cada uno la ve cuando entra (§8.10: la impone el tick), así que una hora de reloj no dice nada; lo que se anuncia es la duración de la reproducción en la ficha (§8.2).
- 8-s. El cierre no tiene cuadro de puntos ni de montaña (mapa 06 §9, fila 34): dice quién lleva cada maillot mañana, y las tablas con sus cambios están en `Report` → `Classifications`. Sin evidencia de los jueces; si el dueño las quiere, `StageClosing` gana `pointsAfter` y `komAfter`.
- 8-t. El salto de recorrido va tramo a tramo, un informe y un tramo por vuelta, porque la hora de destino es futuro y el cliente no la tiene (D-06). Si el paso 10 mide más de 5 s con `Slow 4G` para un salto de 125 km (§18.9), el salto pasa al servidor: `POST …/broadcast/seek` con el km destino, que calcula la hora, escribe lo alcanzado con `mode: 'seek'` y devuelve los tramos intermedios en una respuesta (§14.2). Descartado: informar de una vez una hora de destino estimada y pedir los tramos en paralelo (Rcoste-009), que con una estimación larga pasaría de la meta y revelaría la etapa (8-j).

**Propuesto para el glosario.**
- `BROADCAST.recapMaxCues` (5): rótulos que enseñan `While you skipped` y `Previously`; `BROADCAST.previewThreatsMax` (3): corredores que el cuadro de maillots nombra por maillot; `BROADCAST.closingCardS` (6 s de pared, también propuesta en §6): lo que dura cada cuadro del cierre. En `packages/shared/src/broadcast/constants.ts`.
- `TimelineCast.favourites` ya está en §4.2 con su forma final, `readonly { rider, why }[]` (4-u), leída por `buildTimelineCast` antes del aprendizaje de la etapa (§5.4; `packages/db/src/cast.ts`); la versión anterior de este bloque la proponía como `RiderIx[]`.
- `digestPace(profile: ProfileStrip, kind: StageKind): readonly PaceZone[]`, la firma de la función que la síntesis nombraba en `packages/shared/src/broadcast/pace.ts`, y a su lado `digestMinutes(kinds: readonly StageKind[]): number` (8-b).
- `BROADCAST.controlsHideS` (3): s de pared sin tocar tras los que los mandos se esconden en `playing` (8-p); sin evidencia de los jueces.
- En `player.ts`: `PlayerState.idleS`, `stageDay` y `loaded`; `PlayerContext.digestNext`; las acciones `touch` y `throttled` y el campo `round` de `cueAdmitted`; los efectos `finish` con `mode` y `release` (18-e); `playerInit` gana `stageDay`.
- `POST …/broadcast/seek`, solo si el paso 10 lo pide (8-t).
- En `apps/web/src/domain/broadcast/player.ts` (§8.11): `ViewMode` (`'watch' | 'highlights' | 'digest'`, la curva, distinta de `WatchMode`, que es el modo del informe), `PlayerPhase`, `Speed`, `PlayerState`, `PlayerContext`, `PlayerAction`, `PlayerEffect`, `REPORT_MODE`, `playerInit` y `playerStep`.
- Textos de pantalla: `Highlights · about 4 min`, `Watch the race in 40 minutes` (calculado), `Skipping to 20 km to go…`, `Loading`, `WHILE YOU SKIPPED`, `PREVIOUSLY`, `STAGE 18 · SUMMIT FINISH · 185 km`, `Cat. 2 climb`, `Intermediate sprint · km 129`, `3 laps of 14.2 km`, `+2 more climbs`, `WEATHER`, `dry`, `rain`, `rain from km 120`, `Wind 18 km/h`, `No wind`, `Crosswind: km 40-65`, `JERSEYS IN PLAY`, `closest:`, `Finish bonus: 10, 6, 4 s`, `45 points at stake today`, `within reach:`, `No mountain points today`, `Stage 1 · the stage winner takes the first leader’s jersey`, `FAVOURITES`, `General classification:`, `Sprinters`, `Puncheurs`, `Climbers`, `Time triallists`, `Cobbles specialists`, `STAGE 18 · RESULT`, `(your rider)`, `GENERAL CLASSIFICATION · after stage 18`, `JERSEYS TOMORROW`, `FINAL JERSEYS`, `new`, `MOST KILOMETRES OUT FRONT`, `OUT OF THE RACE`, `Tomorrow`, `Final stage`, `same time (3 km rule)`.

**Dudas para el ensamblador.** (estado tras la corrección L4, fase 5)
- Cerradas: el «30» de D-39 (D-39 corregida, `dudas.md` C-33); la carga de escritura de D-55 (10-l, D-55 corregida); las bandas de B17 (§16.4 usa las de 8-k; la de la crono baja a 5:00, cruzada a §16.4); `TimelineCast.favourites` (4-u, §4.2, corrección L2); la curva de la crono en §9.4 y su `+10 min` (C-37, C-135); y la tabla por equipos de DD-13 (20-c).
- Para §14.3: en `Highlights` ×4 y en `Next action`, cada tramo cuesta un `POST` de progreso y un `GET` con 0,75 s de colchón (8-d). Un `GET` que llevara lo alcanzado ahorraría la mitad de las idas y vueltas, pero D-51 prohíbe que un `GET` cambie estado; aquí se deja como está.
- Para §14.2 y §18.9: el salto de 125 km con `Slow 4G` (umbral 5 s) y, si no lo cumple, la ruta `POST …/broadcast/seek` de 8-t.
- Para §15.3 y el glosario: `BROADCAST.controlsHideS` (3, 8-p).
- Para §17: las pruebas de §8.12 se reparten entre los pasos 3a, 3b y 10; la lista de tests primero de esos pasos debería llevarlas, con las filas nuevas de la corrección (el 429, los mandos que se esconden, el `finish` con su modo y el `release` del digest).
