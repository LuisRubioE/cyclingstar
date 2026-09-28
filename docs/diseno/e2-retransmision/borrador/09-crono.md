## 9. La contrarreloj

La crono es otro producto: no hay grupos ni pelotón, la jornada dura de tres a seis horas y media de reloj de carrera y el relato lo llevan los tiempos (mapa 01 §4, mapa 06 §4). Lo que pidió el dueño cuando se modeló es exactamente eso: «entonces en el Journal puedes ir diciendo quién hace el mejor tiempo y quién le supera… también cuando alguien de los primeros "dobla" a otro» (`docs/balance.md` l. 3340-3342, v18). Esta sección cuenta lo que el motor hace hoy (9.1), lo que se graba (9.2), el estado en cada instante (9.3), el ritmo (9.4), los rótulos (9.5), los percances (9.6), la previa y el cierre (9.7) y los tests (9.8). Los tipos son `TimeTrialTrace` (§4.2) y `TimeTrialInstant` (§4.5), y la firma del gancho `onTimeTrialRide`, §5.2 (D-23, I-08, O-11). Las líneas son las de HEAD `9c21885`, comprobadas en `3fbd828`, que solo añade `docs/diseno/`. Las medidas nuevas se hicieron en el scratchpad, sin tocar el repositorio, con la copia de `timetrial.js` que `estado` parcheó para sacar la traza (`e2p-estado/timetrial-traza.mjs`: resultados y sucesos idénticos a los del motor v89 en las seis corridas de `l5/crono.mjs`, que los compara) y los scripts `l5/crono.mjs`, `l5/crono2.mjs`, `l5/instante.mjs` y `l5/posicion.mjs`; en la corrección (fase 5), los tamaños de la línea entera con el prototipo del grabador de L3 (`rcod/n/grab2.mjs`, con `checkClockDs` y sin él) y `l5c/deltas.mjs`, y la cola de rótulos con las reglas enteras de §6.5 con `l5c/cola2.mjs`.

### 9.1 Lo que hay hoy

| Qué | Dónde | Lo que implica para E2 |
| --- | --- | --- |
| la sonda no llega | `simulate.ts` l. 1264 desvía la crono antes de mirar la sonda; `simulateTimeTrial(input, seed)` no la recibe (`packages/engine/src/stage/timetrial.ts` l. 219) | no hay radio ni fotos de una crono |
| la rampa | `timeTrialStartOrder` (`packages/engine/src/stage/startOrder.ts` l. 127-156): orden inverso de la general a 120 s si alguien llega con déficit y por dorsales a 60 s si no (`constants.ts` l. 6168 y 6172); `startS = i · intervalS` (l. 154) | el orden de salida es público: se sabe antes de salir |
| la traza | `raw`, el tiempo acumulado al final de cada bloque sin ruido (`timetrial.ts` l. 264-289); el ruido final (l. 345-347); el tiempo de meta es `(raw final + pérdida) · noise` (l. 312 y 347) | se calcula y se tira: es lo que entrega `onTimeTrialRide` |
| los parciales | dos controles (`STAGE.ttSplitChecks`, `constants.ts` l. 6177) en el bloque `⌊bloques · c / 3⌋ − 1`, si caen a 2 km o más de la salida y de la meta (`ttSplitMinKm`, l. 6179; `timetrial.ts` l. 523-526); el km del texto se redondea (l. 525) y el tiempo es el del bloque (l. 528) | solo se narran los cambios del mejor, como mucho 5 por control y a 120 s (l. 530-546; `constants.ts` l. 6191-6192): el parcial de cada corredor no sale del motor |
| el sillón | `bestChain` compara segundos enteros y a igual segundo no quita el puesto (`timetrial.ts` l. 128-158); `tt_first_time` y `tt_best_time` (l. 549-573) | el mejor tiempo en cada instante es exacto con la llegada de cada uno |
| los alcances | leídos de las trazas sin tocar ningún tiempo (l. 169-216 y 575-597) | se narran en la voz; la retransmisión no los recalcula |
| el desenlace | `tt_last_home` a la llegada del último en SALIR (l. 603-610); `stage_win_itt` a la del último en LLEGAR (l. 611-619) | los dos, al paquete de meta (§4.7) |
| el percance | del 1 al 4 % de los corredores (`ttLambda`, l. 300-306); `km = finishKm / 2` (l. 315 y 322); el `tS` del suceso es su tiempo propio en META con la pérdida y sin ruido (l. 312 y 323); la pérdida se suma después de la traza (l. 312) | ni el km ni la hora son los del percance: 9.6 |
| sin pancartas, puntos ni bonificaciones | `puntosVolante`, `puntosMontana` y `bonificacionS` a 0 (l. 357-366) | en una crono solo puede cambiar el maillot de la general |
| el corte | 25 % sobre el ganador, con las salvaguardas de carretera (l. 400-476) | al paquete de meta |

Las nueve plantillas propias de la crono, más las cuatro que comparte con la carretera (mapa 01 §1.1 y §4; líneas de `timetrial.ts`):

| Plantilla | km | `tS` | Cuántas | Línea |
| --- | --- | --- | --- | --- |
| `tt_start_order` | 0 | 0 | 1 | l. 505 |
| `tt_last_off` | 0 | salida del último | 1 | l. 514 |
| `tt_split` | el del control, redondeado | reloj al pasar | cambios del mejor, ≤ 5 por control | l. 540 |
| `tt_first_time` | meta | llegada | 1 | l. 557 |
| `tt_best_time` | meta | llegada | ≤ 12 (`ttBestNarrateMax`) | l. 568 |
| `tt_catch` | el del alcance | reloj | ≤ 10 | l. 589 |
| `tt_catches` | meta | llegada del último en llegar | 1 si hubo alcances | l. 596 |
| `tt_last_home` | meta | llegada del último en salir | 1 si no ganó | l. 605 |
| `stage_win_itt` | meta | llegada del último en llegar | 1 | l. 614 |
| `puncture`, `mechanical` | meta / 2 | tiempo propio en meta con la pérdida | 0-5 por crono (mapa 01 §4) | l. 321-328 |
| `time_cut`, `time_cut_readmitted` | meta | llegada | si toca | l. 443-473 |

**La crono por equipos no existe en el motor.** `race-france` e1 es en la realidad una crono por equipos y así lo dice un comentario de `packages/engine/src/routes/calendar.test.ts` (l. 91), pero `simulateTimeTrial` «simula una contrarreloj individual» (`timetrial.ts` l. 218) y sus constantes de equipo están marcadas «PENDIENTE DE IMPLEMENTAR» (`constants.ts` l. 6197-6202). Comprobado con el calendario del `dist`: la etapa se llama `Stage 1 · ITT` y su etiqueta es `ITT`, con `timeTrial: true`. Nada en el producto la llama por equipos, así que la retransmisión enseña lo que el motor corre, una crono individual de 176 corredores por dorsales a un minuto, y no tiene nada que explicar en pantalla; si algún día existe la de equipos, será otra traza (la de un grupo por equipo) y otra frontera (§19.2).

**La crono como modo de carrera tampoco está conectada.** `timeTrialMode.ts` (R27, paso 19 de la táctica: dosificación, riesgo según los parciales del rival, castigo al alcanzado, liebre, cambio de bici y lotería del horario) son funciones puras que solo importa su test. Cuando se conecten, cada corredor seguirá corriendo entero y aparte, así que la traza por corredor sigue valiendo; la condición para E2 es que `onTimeTrialRide` se llame con el tiempo final de cada uno, penalizaciones incluidas.

**Una crono sin línea** (corrida antes del paso 5) abre en `Report` con `Broadcast unavailable for this stage` (pantalla; decisión 3-d de §3.8): no hay radio de la que sacar nada, y situar a cada corredor a velocidad constante entre su salida y su llegada sería inventar parciales.

### 9.2 La traza

`onTimeTrialRide` es el tercer gancho opcional de `StageProbe` (§5.2): `simulateStage` le pasa la sonda a `simulateTimeTrial` y esta lo llama al cerrar cada corredor, después de sacar su ruido y su tiempo final (l. 345-347) y antes de devolverlo (l. 348), con el corredor, su salida, su traza `raw`, su ruido, su tiempo y su percance. No tira del RNG ni devuelve nada que el motor lea, así que la carrera no cambia (B11, §16.4). Las llamadas llegan en el orden de `input.riders`, que `simulateStage` reordena por id (`simulate.ts` l. 1257-1262); el grabador las lleva a `RiderIx` por el id. Con eso escribe `TimeTrialTrace` (§4.2):

| Campo | Valor | De dónde |
| --- | --- | --- |
| `order` | `'gc'` si el plan es `general`, `'bib'` si es `dorsales` | `startOrder.ts` l. 69 y 152 |
| `intervalS` | 120 o 60 | l. 150 |
| `checksKm` | por cada control que el motor conserva, el km exacto del final de su bloque, `(idx + 1) · dx` en décimas: 6,6 y 13,3 en `race-france` e1; 8,6 y 17,3 en la e16 (`l5/crono.mjs`) | `timetrial.ts` l. 523-526 |
| `startDs[r]` | `toDs(startS)`, múltiplos de 600 o de 1.200 | `startOrder.ts` l. 154 |
| `kmClockDs[r]` | en cada km entero `k` (el bloque `10k − 1`), `toDs(raw · noise)`; la última entrada es la meta y vale `10 · Math.round(tS)`, con la pérdida dentro: el `tiempoS` de `results` por diez (decisión 9-a) | `timetrial.ts` l. 264-289, 312, 345-347 y 361 |
| `checkClockDs[r]` (9-b) | en cada control, `10 · Math.round(raw[idx] · noise)`: el mismo entero que compara `bestChain` y escribe `tt_split` | l. 143, 528 y 542 |
| `mishaps` | `{ rider, km: finishKm / 2, kind, lostDs: toDs(pérdida · noise) }`: el km es el del motor, el único que hay (9.6) | l. 306-320 |

La conversión, que hace el grabador al cerrar la etapa (§5.4 la implementa; aquí se fija qué número va en cada sitio):

```
ttTraceOf(llamadas, plan, bloques, dx, finishKm):          // llamadas: lo que entregó onTimeTrialRide, una por corredor
  kmB    ← [10k − 1 para k = 1 … ⌊bloques / 10⌋]; si el último no es bloques − 1, se añade bloques − 1 (la meta)
  checks ← los idx de timetrial.ts l. 523-526, con la misma regla y las mismas constantes
  por cada llamada (riderId, startS, raw, noise, tS, percance), en su RiderIx r:
    startDs[r]      ← toDs(startS)
    kmClockDs[r]    ← [toDs(raw[b] · noise) para b en kmB salvo el último] seguido de [10 · Math.round(tS)]
    checkClockDs[r] ← [10 · Math.round(raw[i] · noise) para i en checks]
    si hay percance: mishaps ← mishaps + { rider: r, km: finishKm / 2, kind, lostDs: toDs(pérdida · noise) }
  order ← plan.mode = 'general' ? 'gc' : 'bib';  intervalS ← plan.intervalS;  checksKm ← [toKm10((i + 1) · dx) / 10 para i en checks]
```

Una etapa de 26 km da 260 bloques y 26 entradas, la última en la meta; una de 26,3 km, 263 bloques y 27 (los 26 km enteros y la meta). `race-france` e16 mide `26.000000000000004` km por la coma flotante de `stageLengthKm` y da 260 bloques, como el motor (`Math.round(L / dx)`, `sample.ts` l. 70).

Los dos redondeos de la meta y de los controles no son un capricho: la pantalla enseña segundos enteros y tiene que enseñar los mismos que la voz y el acta. Medido en seis corridas de `race-france` e1 y e16 (`l5/crono.mjs`, `l5/crono2.mjs`): calcular el parcial interpolando `kmClockDs` entre los dos km enteros que rodean al control yerra hasta 0,05 s en la e1 y hasta 1,43 s en la e16, donde el control de 8,6 km cae en un km en que la velocidad cambia, y el segundo que se enseña sale distinto del del motor en 7-9 de 352 parciales en la e1 y en 177-180 de 352 en la e16; y aun guardando el reloj exacto en décimas, `Math.round(ds / 10)` no siempre da el `Math.round(x)` del motor (el doble redondeo de los valores entre n,45 y n,5): 13-22 de 352 parciales y 6-9 de 176 tiempos de meta. Con el entero del motor por diez, cero. Sin `checkClockDs`, el tablero diría `11:33` donde la voz dice «fastest so far in 11:32».

Tamaños de la línea ENTERA de una crono, que es lo que se guarda en `bytea` y lo que mide el tope, con los relojes absolutos de §4.2. Medidos con el prototipo del grabador de L3 más `checkClockDs` (`rcod/n/grab2.mjs`, con `CHECKS=1` y sin él, semillas 0 y 1; re-medido en la corrección con los mismos bytes), y la alternativa por diferencias con `l5c/deltas.mjs` sobre esas mismas líneas:

| Crono, 176 corredores | Traza sola, gzip 9: con `checkClockDs` (sin él) | Línea entera, gzip 9: con `checkClockDs` (sin él) | Línea entera con `kmClockDs` por diferencias por km, con `checkClockDs` |
| --- | --- | --- | --- |
| `race-france` e1, 20 km | 9.352 y 9.224 B (8.730 y 8.608) | 19.906 y 19.835 B (19.350 y 19.272) | 13.874 y 13.853 B |
| `race-france` e16, 26 km | 13.117 y 13.116 B (12.274 y 12.261) | 25.609 y 25.637 B (24.794 y 24.814) | 18.941 y 19.037 B |
| `race-spain` e18, 33 km | 15.432 y 15.309 B (14.699 y 14.579) | 27.692 y 27.821 B (26.987 y 27.113) | 15.283 y 15.511 B |
| `race-italy` e10, 42 km | 19.856 y 19.651 B (19.070 y 18.886) | 32.203 y 31.918 B (31.436 y 31.178) | 15.614 y 15.475 B |

Las cifras que esta sección daba antes miden otros objetos y se quedan como referencia: la traza sola en JSON (`l5/instante.mjs`: 22,1 KB en la e1 y 29,8 en la e16, con `checkClockDs`), la traza por deltas de `estado.md` §9 (14,7 y 20,3 KB de JSON; 2,4 y 5,0 KB de gzip) y la de `datos.md` §9 (de 2,5 a 10 KB en `bytea`, en cronos de 40 y de 176 corredores).

El tope `TIMELINE.ttMaxStoredBytes` (§15.2, D-11) es el de la línea entera, y es un umbral de B6, no de escritura (15-g): una línea mayor se guarda igual y deja su nota `timeline size:` en el tick (§5.7). Con los 32.768 B que D-11 le daba sobre las cronos del banco, esas dos quedaban por debajo del 79 %; pero ninguna de las 24 etapas del banco pasa de 26 km, y la crono más larga de 176 corredores del calendario, `race-italy` e10 (42 km, entre las 77 cronos de `SEASON_CALENDAR` que no son nacionales, `rcod/cronos2.mjs`), llegaba al 96 % sin `checkClockDs` y al 98,3 % con él: 565 B de margen. La más larga de todas, `race-chrono` e1 (47,6 km), corre con 126 corredores y ocupa 23.857 B sin `checkClockDs`. La estimación que esta sección daba (de 19 a 20 KB de traza para 40 km, a proporción de la e16) era la de la traza sola y se cumple, de 18.886 a 19.856 B en la e10; lo que no decía es que el resto de la línea (el reparto, los ids, la meta y los sucesos: unos 12 KB, la línea menos la traza, que no crecen con los km) la llevaba al borde del tope. Por eso §15.2 sube el tope a 49.152 B, 1,5 veces lo medido, sin tocar el formato (decisión 15-i, D-11): la e10 con `checkClockDs` queda en el 65,5 %. La otra salida, también medida, era guardar `kmClockDs` por diferencias por km en el formato de §4.3 y devolverlo en absolutos al decodificar, sin tocar el tipo de §4.2 ni nada de lo que lo lee: la traza de la e10 baja de 19.856 a 3.359 B, su línea a 15.614 B y la mayor de las cuatro pasa a ser la e16, con 19.037 B, a cambio de una suma acumulada por corredor al leer. 15-i la descarta porque cambia el formato 1 y su decodificador para ahorrar poco: de 6.032 a 16.589 B por crono en las cuatro medidas, en las 77 cronos de una temporada que no son nacionales. B6 mide la e10 en el banco, desde el 4b (9.8, 16-n).

La traza es monótona en las seis corridas, y con la meta en segundos enteros por diez I5 es una igualdad y no una tolerancia: `kmClockDs[r].at(−1) = 10 · results[r].tiempoS`, que con `toDs` difería hasta 5 décimas (medido, las seis corridas). La visibilidad de cada dato es la de §4.6: la salida de `r` en `startDs[r]`, su reloj en el km `k` en `startDs[r] + kmClockDs[r][k]` y su paso por un control en `startDs[r] + checkClockDs[r][c]` (`TimelineVisibility.ttCheckDs`), que es la hora de carrera en que la tele lo ve pasar.

### 9.3 El estado en `t`

Lo que la tele enseña de una crono en cada momento es un estado, igual que en carretera: quién está en ruta y dónde, quién está sentado en el sillón, cómo va cada control y la general virtual cuando corre el líder (mapa 06 §4). Lo calcula `timeTrialInstantAt` (`packages/shared/src/broadcast/timeTrial.ts`), con la misma regla que `instantAt`: solo lee lo visible a la hora `t` (§4.6), así que es causal por construcción.

```ts
// packages/shared/src/broadcast/timeTrial.ts (el tipo TimeTrialInstant es §4.5)
export function timeTrialInstantAt(tl: TimelineCore, t: RaceS, ctx: InstantContext): TimeTrialInstant
```

```
timeTrialInstantAt(tl, t, ctx):
  T ← toDs(t);  tt ← cutTimeline(tl, t).tt                 cada reloj de la traza, solo si startDs + reloj ≤ T
  para cada corredor r, por RiderIx:
    startDs[r] > T                     → por salir
    su entrada de meta es visible      → llegado: timeS ← kmClockDs[r].at(−1) / 10; su llegada, startDs[r] + esa entrada
    si no                              → en ruta
  en ruta, dónde (la regla de D-04 llevada a un corredor solo):
    k ← cuántos km enteros suyos son visibles;  c_k ← el último (0 si ninguno)
    v ← c_k − c_(k−1) si k ≥ 2;  c_1 si k = 1;  si k = 0, lo que tarda el km 1 a BROADCAST.nominalKmh por su pendiente (ProfileStrip.altM)
    km ← mín(k + 1, k + (T − startDs[r] − c_k) / v)        nunca pasa del siguiente km entero, donde tendrá reloj seguro
    km ← máx(km, lo ya pintado de r)                         la pantalla no retrocede
    lastSplitKm ← el último control con startDs[r] + checkClockDs[r][c] ≤ T; null si ninguno
    deltaS ← su tiempo en ese control menos el mejor visible en ese control (0 si es el mejor)
  arrivals  ← los llegados, por timeS y, a igualdad, por hora de llegada (bestChain, timetrial.ts l. 142-156: a igual segundo no quita el puesto)
  hotSeat   ← arrivals[0], o null si no ha llegado nadie
  splits    ← por control, los pasos visibles ordenados por tiempo y, a igualdad, por hora de paso
  virtualGc ← null, salvo con order = 'gc' y el líder de salida (ctx.start.leaders.gc) ya pasado por un control o llegado:
                p ← el último punto visible del líder (control o meta)
                por cada corredor de ctx.start.gcTop que ya pasó por p:
                  virtualS ← su gapS de salida + (su tiempo en p − el del líder en p);  group ← −1;  por virtualS
  toStart, finished ← las dos cuentas;  onCourse, en orden de salida
```

La posición en ruta es la de D-04 para un corredor solo: se extrapola desde su último km visible a la velocidad del km anterior y nunca pasa del siguiente km entero, donde su reloj existe seguro. Medido contra la traza bloque a bloque, muestreando cada 5 s de carrera a todos los que están en ruta (`l5/posicion.mjs`, `race-france` e1 y e16, semillas 0 a 2): error p50 de 0 m, p90 de 50 a 55 m, p99 de 248 a 466 m y máximo de 562 m; el p99 más alto es el de la e1, cuyo último km sube y cambia de velocidad dentro del km. Nunca un km, por construcción. El sillón es exacto porque cada llegada es un reloj guardado, y los parciales también (9.2): el tablero coincide segundo a segundo con los `tt_split` y los `tt_best_time` de la voz. La propiedad de §4.6 vale igual: `timeTrialInstantAt(cutTimeline(tl, T), T, ctx) = timeTrialInstantAt(tl, T, ctx)` para todo `T` anterior al borde de la meta de la crono (`finishDs`, §4.6). `arrivals` es el tablero de llegados de `TimeTrialInstant` (§4.5): de él salen el puesto de `FINISH` y la tabla de llegados de `TimeTrialBoard` (9.5).

Un instante calculado con esta regla sobre la e16, semilla 0, un segundo después de que el último en salir pase por el primer control (`l5/ejemplo.mjs`, campo del banco): son las 6:09:37, hay 12 en ruta, 164 llegados y ninguno por salir; en el sillón, el dorsal 71 con 38:04; el control 1 lo manda el 71 con 18:03, el 62 a 13 s y el 118 a 35 s, y el control 2, el 71 con 27:47, el 62 a 38 s y el 118 a 55 s. Los doce en ruta:

| Salió | Dorsal | km pintado | Último control | Diferencia en él |
| --- | --- | --- | --- | --- |
| 165.º | 63 | 25,1 | 2 | +3:24 |
| 166.º | 13 | 25,0 | 2 | +2:03 |
| 167.º | 212 | 21,4 | 2 | +4:24 |
| 168.º | 162 | 19,5 | 2 | +4:58 |
| 169.º | 112 | 19,4 | 2 | +3:03 |
| 170.º | 62 | 19,9 | 2 | +0:38 |
| 171.º | 12 | 16,2 | 1 | +2:03 |
| 172.º | 211 | 11,8 | 1 | +3:58 |
| 173.º | 161 | 10,5 | 1 | +3:19 |
| 174.º | 111 | 11,6 | 1 | +0:46 |
| 175.º | 61 | 8,8 | 1 | +3:11 |
| 176.º | 11 | 8,6 | 1 | +1:33 |

Los bordes que la función tiene que tratar, cada uno con su test en 9.8:

| Caso | Qué hace `timeTrialInstantAt` |
| --- | --- |
| el corredor aún no ha salido | cuenta en `toStart`; no está en `onCourse` ni en ningún tablero |
| lleva menos de un km | su km sale de la velocidad nominal del km 1 (el perfil es público) y nunca pasa de 1 |
| ha pasado un control | `lastSplitKm` y `deltaS` contra el mejor visible; si es el mejor, 0 y el rótulo dice `fastest at split 1` |
| ha pinchado | su posición sigue la traza, que no lleva la pérdida hasta la meta (9.6) |
| ha llegado fuera de control | es un llegado más, con su tiempo; el corte solo se sabe en el paquete de meta (§4.7) |
| un prólogo tan corto que el motor no pone controles (`timetrial.ts` l. 526; test de l. 309) | `checksKm` vacío: sin `SPLIT` ni `lastSplitKm`; el sillón y `ON COURSE` siguen |
| una crono de un solo corredor (test de l. 301) | sin sillón hasta que llega; nadie a quien comparar: `deltaS` null |
| un nacional de cinco corredores | igual que uno de 176: la curva de 9.4 se estira sobre la fracción de salidos |

La general virtual sale solo cuando el líder ha pasado por un punto, que es cuando la tele la da: «VIRTUAL GC after split 2» (mapa 06 §4). En una crono por dorsales (el prólogo, una carrera de un día) no hay general de salida y es null. Lo que la tele enseña permanentemente sale del mismo estado: el reloj de carrera, las tres cuentas y el sillón. Medido en `race-france` e16, semilla 0 (`l5/instante.mjs`), a mitad de la rampa: `2:55:00 · 22 on course · 66 finished · 88 to start` (pantalla) con el mejor tiempo en 39:27; el ganador, 38:04, se sienta en el sillón a las 5:06:04 y lo ocupa 1:25:38, hasta la última llegada.

### 9.4 El ritmo por fracción de salidos

En carretera el ritmo lo manda la distancia de la cabeza a la meta (§8.2); en una crono no hay cabeza, y el km no ordena nada. Lo manda el orden de salida, que es público: la primera hora es anónima y la última es la de la general (mapa 06 §4). La curva es la de `producto.md` §9, la única cuya duración midió bien el juez de ejecutabilidad (D-19, D-23):

```ts
// packages/shared/src/broadcast/pace.ts (sigue): ttPaceAt es el paceAt de la crono (§8.2). RaceS llega de ./timeline.js, con ProfileStrip, en las importaciones de §8.2
export function ttPaceAt(t: RaceS, plan: { readonly riders: number; readonly intervalS: number }, lastKmFromS: RaceS | null): number
```

```
ttPaceAt(t, plan, lastKmFromS):
  lastKmFromS ≠ null y t ≥ lastKmFromS → BROADCAST.ttLastKmX (2)              el último km del último en salir
  salidos ← mín(n, ⌊t / intervalS⌋ + 1) / n                                  startS = i · intervalS: público
  → la x de la primera zona de BROADCAST.ttPace con salidos ≤ upToStarted:   ×120 hasta el 60 %, ×40 hasta el 90 %, ×12 después
```

`lastKmFromS` es la hora a la que el último en salir pasa por su último km entero (`startDs + kmClockDs.at(−2)` del último), que se sabe cuando ocurre (es el ritmo, no el borde de la meta, que es §4.6): como `paceAt` con la cabeza, el ritmo lee la posición y nunca los sucesos (B9). Hay dos caras escritas: esta, la del último en salir, porque es el ritmo del final y no el borde (Rcobertura-007); y la de calcularlo sobre el corredor de la última llegada, que es el borde desde 4-w (Rcodigo-025). Se queda la primera: el borde ya es la última llegada (§4.6), y si la última llegada es de otro corredor, llega después de `lastKmFromS` y la reproducción la pinta a `ttLastKmX` hasta el borde (en 30 de 154 corridas alguien llega después que el último en salir, hasta 281 s, `rcod/n/ws/ttborde.mjs`). Los mandos multiplican el factor como en carretera (`×½ ×1 ×2 ×4`, `Next action` a ×20 hasta el siguiente `Cue` de clase 2 o más; §8.5). La implementación es corta y se escribe entera, porque dos detalles la hacen fácil de equivocar (el primero sale en `t = 0` y la última zona cubre también el borde):

```ts
// packages/shared/src/broadcast/pace.ts (sigue)
export function ttPaceAt(t: RaceS, plan: { readonly riders: number; readonly intervalS: number }, lastKmFromS: RaceS | null): number {
  if (lastKmFromS !== null && t >= lastKmFromS) return BROADCAST.ttLastKmX
  const started = Math.min(plan.riders, Math.floor(Math.max(0, t) / plan.intervalS) + 1) / plan.riders
  return (BROADCAST.ttPace.find((z) => started <= z.upToStarted) ?? BROADCAST.ttPace.at(-1)!).x   // la última zona llega a 1: el ?? no salta nunca
}
/** La duración que se anuncia (About 7 min): solo el plan y el perfil; nunca un tiempo de la carrera. */
export function ttPlaybackEstimateS(profile: ProfileStrip, plan: { readonly riders: number; readonly intervalS: number }): number
//   rodaje ← Σ por km del perfil 3600 / nominalKmh(su pendiente);  último ← 3600 / nominalKmh(pendiente del último km)
//   fin ← (riders − 1) · intervalS + rodaje;  devuelve ∫ de 0 a fin de 1 / ttPaceAt(s, plan, fin − último) ds
```

Las duraciones a ×1:

| Crono | Juez de ejecutabilidad (`juez-ejec/crono.mjs` y `crono_gc.mjs`; el último km, como el km medio del último en salir) | Este redactor (`l5/crono.mjs`: el último km de verdad; otro campo, semillas 0 a 2) |
| --- | --- | --- |
| `race-france` e1, 20 km, 176 a 60 s por dorsales | 6:24-6:33 | 6:55-7:06 |
| `race-france` e16, 26 km, 176 a 120 s con general | 11:21-11:23 | 11:14-11:19 |
| `nc-it-itt`, 35 km, 30 a 60 s | | 5:41-5:52 |
| `nc-es-itt`, 40 km, 12 a 60 s | | 5:20-5:24 |

Dónde se va ese tiempo, con la semilla 0 (`l5/desglose.mjs`): en la e1, 52 s a ×120, 1:20 a ×40, 3:30 a ×12 y 1:14 en el último km a ×2; en la e16, 1:45, 2:39, 6:11 y 0:39. La mitad larga es la de ×12, cuando ya ha salido el último 10 % y corren los que deciden la etapa, que es la hora que la tele no se salta nunca. La diferencia de la e1 es su último km, que sube: al último en salir le cuesta 146 s contra 82 de media en la semilla 0, y a ×2 son 73 s de pared en vez de 41. Las dos medidas usan la misma curva; B17 la vuelve a medir en las dos cronos de las 24 etapas (§16.4) y la prueba de lectura la acepta (D-60). Se descartan, con su cifra (D-23): los dos controles y la meta como único dato de `producto.md` §9 (se queda su curva, no su traza); el §9 de `ingeniero.md`, en prosa, sin tipo y con 4-6 min estimados para lo que mide 2:51; y los 5.760 y 15.120 s de carrera sin presupuesto de `television.md` §9.

**La duración que se anuncia** (`About 7 min`, pantalla; `BroadcastHead.estimateS`) tampoco puede mirar la carrera. En una crono la calcula el servidor con `ttPlaybackEstimateS(profile, plan)`: la última salida, `(n − 1) · intervalS`, más el rodaje del último a las velocidades nominales de `BROADCAST.nominalKmh` sobre la pendiente de cada km del perfil, integrado con `ttPace` y con su último km a `ttLastKmX`. Medido contra la duración real (`l5/crono2.mjs`, cuatro recorridos por tres semillas): de −9 a +15 s, un 4 % como mucho. Es la duda que §15.3 dejó abierta para la crono (decisión 9-h). En `Highlights` y en el digest una crono no tiene curva propia: es `ttPaceAt` escalada por `ttPlaybackEstimateS / digestBudgetS.cri`, una sola curva para los dos modos, medida con el motor real de 1:56 a 2:03 en cuatro cronos y tres semillas (decisión 8-m, §8.3).

**Los mandos de recorrido no sirven en una crono**: `−5 km`, `Next climb` o `Last km` no significan nada cuando cada corredor va por un km distinto. En su lugar (decisión 9-g), saltos por reloj de carrera y por orden de salida, que solo leen el plan público: `−10 min` y `+10 min` (`BROADCAST.ttSeekStepS`, 600 s de carrera), `Last 20 starters` (`BROADCAST.ttSeekLastStarters`) y `Last starter` (pantalla), con `mode: 'seek'` y `While you skipped` como en carretera. La barra de progreso tiene dos tramos: la rampa (salidos de `n`) y, cuando ha salido el último, su km. Nunca la duración. Como los saltos de carretera, ninguno cruza la meta: el `+10 min` se queda antes del borde de la meta (§4.6; 8-j, §8.5).

### 9.5 Los rótulos de la crono

La tele cuenta una crono con cuatro rótulos (mapa 06 §4; D-23): el corredor en ruta, el parcial, la meta con el sillón y la general virtual. Aquí son estado permanente (la capa fija de la crono) más `Cue` que salen del paso de un `TimeTrialInstant` al siguiente, con las mismas reglas de la cola de §6.5 (un rótulo de corredor a la vez, `cueHoldS` por clase, nunca se frena la carrera). Todo tiempo relativo lleva signo además de color (`+0:05`, `−0:03`; D-57): que el verde sea «por delante» es convención de la tele que nadie ha verificado como norma (mapa 06 §4) y el daltonismo no la lee.

| Rótulo (pantalla) | Cuándo | Dato | Clase (`Cue`) |
| --- | --- | --- | --- |
| `2:55:00 · 22 on course · 66 finished · 88 to start` y `HOT SEAT · Jan Novák 39:27` | siempre: es la capa fija de la crono | `toStart`, `finished`, `onCourse`, `hotSeat` | permanente |
| `Start order: reverse general classification, every 2:00 · 176 riders` o `Start order: race numbers, every 1:00 · 176 riders` | en `t = 0`, con `tt_start_order` en la voz | `BroadcastHead.tt` (§4.11, 9-i) | 1 (`tt_start_order`) |
| `ON COURSE · 62 Iñigo Arrieta (ES) · km 19.9 · +0:38 at split 2`; `… · fastest at split 1` si es el mejor | uno cada `BROADCAST.breakRoundEveryS` (6 s) entre los candidatos en ruta, en orden de salida | `onCourse` | 0 (`rider` con contexto `tt_round`); 1 si es del espectador (`rider` con contexto `own`) |
| `SPLIT 1 · km 9 · 1. Mads Olsen 18:03 · 2. Iñigo Arrieta +0:13 · 3. Luca Bertolini +0:35`, y la fila del que pasa si no está entre los tres (`35. Sam Carter +1:33`) | pasa un candidato, o cualquiera bate el mejor | `splits` | 2 si bate el mejor (`rank` 1); 1 si no (`tt_split`) |
| `FINISH · 62 Iñigo Arrieta 39:12 · 2nd · +1:08` | llega un candidato | `arrivals` y `hotSeat` | 1 (`tt_finish`) |
| `FINISH · HOT SEAT · 71 Mads Olsen 38:04 · −1:23 on Jan Novák` | cualquiera bate el mejor tiempo | ídem | 3 (`tt_finish` con `hotSeat`) |
| `VIRTUAL GC · after split 1 · 1. Sam Carter · 2. Jonas Verhoeven +0:25 · 3. Pierre Lambert +0:50` | el líder pasa un control o llega | `virtualGc` | 2; 3 si cambia el líder virtual (`virtual_gc`; D-21, 9-n) |
| `PUNCTURE · 132 Tom Hargreaves · km 13` | su `revealS` (9.6) | el suceso `puncture` o `mechanical` | 1 (`mishap`) |
| `TIME CUT` | tras `BroadcastFinish` | el paquete de meta | 2 (`time_cut`, como en carretera: §6.5, D-21) |

El km de un parcial se escribe redondeado como el `checkKm` del motor (`timetrial.ts` l. 525), para que el rótulo diga `SPLIT 1 · km 9` donde la voz dice «At the 9 km check» (`apps/web/src/domain/stageJournal.ts` l. 1522 y 1530); el tiempo es el del bloque exacto (9.2). Son candidatos, en ruta, en un parcial o en la meta: los del espectador, los de notoriedad 5 o menos (llevan un maillot, un título de la categoría o amenazan la general, §7.5) y, en una crono por la general, los `BROADCAST.namedGcTop` (10) últimos en salir, que son los diez primeros de la general. En un prólogo por dorsales solo hay campeones y propios, y cualquiera que bata el mejor tiempo sale igual. Los rótulos de parcial y de meta son las variantes `tt_split` y `tt_finish` de `Cue` (§4.9; decisión 9-d), porque las de carretera son de grupos; `tt_split` lleva su `rank` en el control y `tt_finish`, `hotSeat`, que es lo que `cueClassOf` mira para subirlas. Y como en la primera hora a ×120 un mejor parcial puede caer cada medio segundo de pared, un `tt_split` que espera en la cola se sustituye por el siguiente del mismo control, y un `tt_finish` por el siguiente `tt_finish`, y el que queda lleva la clase mayor de los dos: el que espera ya no es noticia. La cola sigue sin frenar la carrera.

Los programa el reproductor (`apps/web/src/domain/broadcast/player.ts`) y no `cuesBetween`, porque la mitad depende de quién es candidato y el espectador es cosa del reproductor (decisión 6-i). Al pasar de un `TimeTrialInstant` al siguiente:

```
reproductor, en una crono, de prev a next:
  tt_start_order    en t = 0, con BroadcastHead.tt
  rider 'tt_round'  cada breakRoundEveryS (6 s) de pared, el siguiente candidato de next.onCourse en orden de salida; 'own' si es del espectador
  tt_split          por cada paso nuevo por un control (en next.splits y no en prev.splits) de un candidato, o con rank 1
  tt_finish         por cada llegada nueva (en next.arrivals y no en prev.arrivals) de un candidato, o con hotSeat
  virtual_gc        cuando el líder de salida (StartState.leaders.gc) pasa por un punto nuevo, un control de next.splits o
                    next.arrivals: con las filas de next.virtualGc
  mishap            el puncture o el mechanical revelados en (prev.t, next.t], por CUE_OF_TEMPLATE (§6.6), como hace cuesBetween
  time_cut          tras POST …/broadcast/finish (§8.7)
```

La clase de `VIRTUAL GC` es la única que la crono no toma tal cual de §6.5 (decisión 9-n). En carretera la general virtual sale con el cuadro de diferencias cada 25 s de pared y es de clase 1, y 3 si cambia el líder virtual (D-21); en una crono sale solo cuando el líder pasa por un control o llega, dos o tres veces por crono, y es el rótulo de la hora que decide. Con la clase 1, la cola de §6.5 perdió 1 de los 7 `VIRTUAL GC` de la e16 en tres semillas (el del primer control de la semilla 2, con el líder aún líder virtual: caducó en la espera, detrás de rótulos de clase mayor); con la 2, ninguno (`l5c/cola2.mjs`). Por eso `cueClassOf` recibe si la etapa es crono y le da 2, y 3 si cambia el líder virtual, igual que en carretera (§6.5).

La carga, medida con estas reglas, con las de la cola de §6.5 enteras (la admisión, la caducidad de 6-h a los 6 s de pared y el corte de un rótulo de clase 0 o 1 por uno de clase 3) y con el ritmo de 9.4 (`l5c/cola2.mjs`, semillas 0 a 2, con los diez últimos en salir como candidatos porque el campo del banco no tiene maillots ni campeones; incluye las rondas de `ON COURSE`):

| Crono | Rótulos generados | Mostrados | Sustituidos en la cola | Descartados o caducados, de clase 0 o 1 | Caducados, de clase 2 | Cola máxima |
| --- | --- | --- | --- | --- | --- | --- |
| `race-france` e1 | 83-89 (41-43 rondas) | 64-67 | 4-12 | 9-12 | 2-3 | 3 |
| `race-france` e16 | 99-106 (56 rondas) | 80-90 | 4-11 | 9-10 | 0-2 | 3 |

La cola no pasa de `BROADCAST.cueQueueMax` (3), no se pierde ningún rótulo de clase 3 ni ningún `VIRTUAL GC`, y la duración es la de la curva: la cola no frena la crono (D-21). Los de clase 2 que caducan son todos `SPLIT` a ×120, mientras sale el primer 60 %: llevan 6 s de pared esperando, que son 12 minutos de carrera, y el tablero ya enseña ese control (6-h). La medida anterior de esta sección (`l5/cola.mjs`, de 85 a 106 rótulos y ninguno de clase 2 o 3 perdido) no aplicaba la caducidad de 6-h y daba dos `VIRTUAL GC` al prólogo por dorsales, que no tiene general virtual.

El perfil de §6.2 lleva en una crono un cursor por corredor en ruta y no por grupo: los candidatos siempre y, hasta completar `BROADCAST.nameWholeGroupUpTo` (12), los que salieron más tarde, que son los que la tele sigue. Los demás en ruta se cuentan en la capa fija. El tablero sustituye a la barra de grupos: arriba el sillón, debajo el control más reciente con sus tres primeros y, al tocarlo, la tabla entera de ese control o la de llegados, `arrivals` (`TimeTrialBoard`).

Las plantillas de crono van a la voz y no son rótulos, porque el rótulo sale del estado y el estado ya lo sabe todo a su hora. Su destino es el de `CUE_OF_TEMPLATE` (§6.6, decisión 6-j): `tt_start_order`, `tt_last_off`, `tt_split`, `tt_first_time`, `tt_best_time` y `tt_catch`, `voice_only`; `tt_catches` y `tt_last_home`, `voice_only`, y su línea llega con el paquete de meta, porque las dos van con la regla `finish` de §4.7, como `bunch_sprint` (`tt_catches` lleva la hora de la última llegada, que es el borde de la crono); `stage_win_itt`, `finish`; `puncture` y `mechanical`, `mishap`; `time_cut`, `time_cut`; `time_cut_readmitted`, `voice_only`. Un momento de la e16, semilla 0, un segundo después de que el último en salir, el líder de la general, pase por el primer control (`l5/ejemplo.mjs`; los números son los medidos en el campo del banco y los nombres, inventados, se ponen a sus dorsales):

```
(pantalla)
6:09:37 · 12 on course · 164 finished · 0 to start                    HOT SEAT · Mads Olsen 38:04
SPLIT 1 · km 9 · 1. Mads Olsen 18:03 · 2. Iñigo Arrieta +0:13 · 3. Luca Bertolini +0:35 · 35. Sam Carter +1:33
VIRTUAL GC · after split 1 · 1. Sam Carter · 2. Jonas Verhoeven +0:25 · 3. Pierre Lambert +0:50
ON COURSE · 11 Sam Carter (GB) · km 8.6 · +1:33 at split 1
```

El líder pierde 1:33 con el mejor en el control pero sigue siendo líder virtual por 25 s, que es exactamente la historia que la tele cuenta en ese momento. En un teléfono de 360 px la capa fija va en dos renglones (el reloj y las tres cuentas; el sillón) y cada rótulo en uno o dos, como en carretera (§6.1); la tabla completa de un control y la de llegados se abren al tocar el sillón o el control, y el componente que las dibuja es `TimeTrialBoard`.

### 9.6 Los percances

Un pinchazo o una avería de crono llevan en el motor dos datos que no son los del percance (mapa 01 §1.2, caso e): el km, que es siempre la mitad de la meta (`timetrial.ts` l. 315 y 322), y el `tS`, que es el tiempo propio del corredor en META más la pérdida, sin ruido (l. 312 y 323), porque la pérdida se suma cuando la traza ya está entera (l. 312). El motor no decide dónde pinchó: solo que pinchó y cuánto perdió. D-23 dice que su «km verdadero sale de la traza»; no es así, y lo que la traza da es otra cosa: la HORA a la que el corredor pasa por ese km, que es la que §4.7 usa para revelarlo (`tt_own_clock`: su salida más su reloj propio en `finishKm / 2`, interpolado en `kmClockDs`; decisión 4-f). Así el rótulo sale a mitad de su recorrido y no a su llegada, que es lo que haría revelarlo por su `tS`.

Un caso medido (`l5/desglose.mjs`, e16, semilla 0): el dorsal 132 pincha, el motor lo apunta en el km 13 (la mitad de 26) con 22 s de pérdida y un `tS` de 2.483 s, que es su tiempo en meta con la pérdida; sale a las 2:58:00, pasa por el km 13 a las 3:23:25 y llega a las 3:39:01. Revelado por su salida más su `tS`, el rótulo saldría a las 3:39:23, cuando ya ha llegado; revelado por la regla de §4.7, sale a las 3:23:25, a mitad de su crono.

La pérdida entra solo en su tiempo de meta, como en `results` (4-f): sus parciales posteriores no la llevan, igual que no la llevan los `tt_split` del motor (l. 528, sin pérdida), y su posición en ruta sale de una traza que no se para, así que la pérdida se ve en su llegada y no en el km en que se anunció. Por eso el rótulo no da segundos (decisión 9-e): `PUNCTURE · 132 Tom Hargreaves · km 13` (pantalla), y su tiempo en `FINISH` lleva la pérdida entera. Poner `lost 0:35` a mitad de recorrido y enseñar después un parcial en que no ha perdido nada sería contradecirse en pantalla. Medido: de 1 a 4 percances por crono de 176 en las seis corridas de `l5/crono.mjs` (el mapa 01 §4 da de 0 a 5).

### 9.7 La previa y el cierre de una crono

La previa son los cuatro cuadros de §8.6 (D-22), con lo que cambia en una crono. Primero, el perfil y los puertos, con los dos controles marcados (`Split 1 · km 9`, `Split 2 · km 17`, pantalla), que son recorrido y no carrera, y la regla de salida (`Start order: reverse general classification, every 2:00`). Segundo, el parte, que en una crono pesa más: el viento lateral de §6.8 decide medio minuto. Tercero, los maillots en juego: en una crono no hay puntos ni bonificaciones (`timetrial.ts` l. 357-366), así que solo está en juego el de la general, con sus amenazas (los `BROADCAST.previewThreatsMax` (3) siguientes de la general de salida, como en §8.6); en la etapa 1 nadie lo lleva y el cuadro dice `The first leader’s jersey is decided today` (pantalla). Cuarto, los favoritos: los `previewGcTop` (3) primeros de la general de salida y los `previewAttrTop` (3) mejores inscritos por CRI (`publicRiderDetailSchema.attributes`, `contracts.ts` l. 713-737), con `why: 'tt'`.

Los cuatro cuadros de la e16 (pantalla; la forma de cada cuadro es §8.6, los nombres son los de 9.5 y el parte y los huecos, de ejemplo):

```
(pantalla)
[1] Stage 16 · ITT · 26 km · Split 1 · km 9 · Split 2 · km 17 · Start order: reverse general classification, every 2:00
[2] 21 °C · crosswind from km 4 to km 11
[3] Leader’s jersey: Sam Carter · Pierre Lambert at 0:20 · Jonas Verhoeven at 0:40 · Rafał Nowak at 1:00
[4] Favourites: Sam Carter · Pierre Lambert · Jonas Verhoeven (GC) · Mads Olsen · Jan Novák · Luca Bertolini (time trial)
```

El cierre es el de §8.6 con dos cambios. `Most kilometres out front` no sale: en una crono nadie va en fuga (`kmEnFuga` vale 0, `timetrial.ts` l. 335) y `mostKmOutFront` es null. Y sale el sillón, con el tiempo que lo ocupó el ganador, que se calcula de las llegadas del paquete de meta: `Mads Olsen held the hot seat for 1:25:38` (pantalla; en la e16 medida, del 5:06:04 al 6:31:42).

### 9.8 Tests

I5 se comprueba con su forma exacta (decisión 9-a; §4.4): para todo corredor `r` de toda crono, `tt.startDs[r] = toDs(startS)` de su hueco en `timeTrialStartOrder`, `tt.kmClockDs[r]` no decrece y `tt.kmClockDs[r].at(−1) = 10 · results[r].tiempoS`. Los casos:

| Caso | Lo que se comprueba |
| --- | --- |
| sin percance | `kmClockDs[r].at(−1) = 10 · tiempoS` y cada entrada anterior es `toDs(raw · noise)` de su km |
| con pinchazo o avería | la última entrada lleva la pérdida y las anteriores no; `mishaps` tiene su km (`finishKm / 2`) y su `lostDs` |
| fuera de control | tiene tiempo y `estado: 'dnf'` en `results`; I5 vale igual |
| longitud no entera (26,3 km) | 27 entradas: 26 km enteros y la meta |
| longitud con coma flotante (`26.000000000000004`) | 26 entradas, como los 260 bloques del motor |
| prólogo por dorsales | `order: 'bib'`, `intervalS: 60`, `startDs` múltiplos de 600 |
| crono por la general | `order: 'gc'`, `intervalS: 120`, el líder de salida con el `startDs` mayor |
| prólogo sin controles | `checksKm` y `checkClockDs` vacíos |

Los tests, por fichero, escritos antes que el código (el paso de cada uno es §17):

- `packages/engine/src/stage/timetrial.test.ts` (se amplía; los de hoy no cambian): la sonda se llama una vez por corredor, en orden de id; `results`, `events`, `incidents` y `efforts` son idénticos con y sin sonda (B11 con la crono); lo que recibe cada llamada reproduce `results[r].tiempoS` al redondear.
- `packages/engine/src/sim/timeline.test.ts` (el grabador, §5.4): la traza de `race-france` e1 y e16 cumple I5 exacta; `checksKm` son 6,6 y 13,3 en la e1 y 8,6 y 17,3 en la e16; `checkClockDs` es `10 · splitS` para cada `tt_split` que emite el motor; `mishaps[].km` es `finishKm / 2`.
- `packages/shared/src/broadcast/timeTrial.test.ts` (nuevo, suite rápida, sobre una crono congelada en `apps/api/src/__fixtures__/`): `toStart + onCourse + finished = n` en todo `t`; la secuencia de dueños del sillón es la de `tt_first_time`, los `tt_best_time` y `stage_win_itt` del motor; todo `tt_split` del motor, con su corredor y su `splitS`, es el mejor de su control a su hora; B9 para la crono; la posición de un corredor en ruta no decrece y no pasa de su siguiente km entero; `virtualGc` es null por dorsales y, por la general, ordena al líder virtual delante cuando va por delante; un pinchazo se revela entre la salida y la llegada de su corredor; `arrivals` va por `timeS` y, a igualdad, por hora de llegada, y su primero es `hotSeat`; y en la e16, semilla 0, un corredor que llega 17 s después del último en salir cruza la meta en pantalla antes de `atFinish`, y `finishDs` es su llegada (4-w; `rcod/n/ws/ttborde.mjs`: 30 de 154 corridas, hasta +281 s).
- `packages/shared/src/broadcast/pace.test.ts`: `ttPaceAt` da ×120, ×40 y ×12 en los bordes del 60 y el 90 % de salidos y ×2 en el último km del último; `ttPlaybackEstimateS` no recibe la línea (B9) y cae a menos de un 5 % de la duración de B17 en las dos cronos del banco.
- B6 con las dos cronos de las 24 etapas: `bytes` por debajo de `TIMELINE.ttMaxStoredBytes` (§16.4). Y, en el mismo banco (`timeline.test.ts`, desde el 4b; 16-n), la crono más larga de `SEASON_CALENDAR` entre las carreras de 176 corredores, con las semillas 0 y 1, que el test elige en el calendario y no por su nombre (hoy `race-italy` e10, 42 km: 32.203 B con `checkClockDs`, 9.2): es la que se acerca al tope, y ninguna de las 24 pasa de 26 km. B17 mide la duración de `ttPace` en las dos cronos del banco (§16.4).
- `packages/shared/src/broadcast/cues.test.ts` (§6.5; los casos de la crono): `rider` con contexto `tt_round` es de clase 0 y con `own`, de 1; `tt_start_order`, de 1; `tt_split`, de 1, y de 2 con `rank` 1; `tt_finish`, de 1, y de 3 con `hotSeat`; `virtual_gc` en crono, de 2, y de 3 si cambia el líder virtual, y en carretera sigue en 1 y 3; `time_cut`, de 2; y `CUE_OF_TEMPLATE` da a las trece plantillas de la crono el destino de 9.5.
- `apps/web/src/domain/broadcast/player.test.ts` (§8.12): en la e16 congelada, con los diez últimos en salir como candidatos, el reproductor emite un `tt_split` por cada paso de un candidato y por cada mejor parcial, un `tt_finish` por cada llegada de un candidato y por cada cambio del sillón, y un `virtual_gc` por cada punto nuevo del líder; y con la cola de §6.5 no se pierde ningún rótulo de clase 3 ni ningún `virtual_gc`, la cola no pasa de `cueQueueMax` y la duración es la de `ttPaceAt` (la medida de 9.5).

### 9.9 Lo que la crono no hace

- **No hay crono por equipos**: el motor no la tiene (9.1) y la retransmisión no la simula con la individual. Cuando exista será otra traza y otra entrada de §19.2.
- **No hay general provisional sin el líder**: la virtual sale cuando el líder pasa por un punto (9.3, 9-j). Antes, la historia la cuentan el sillón y los controles.
- **Los alcances no tienen rótulo**: `tt_catch` va a la voz (9.5), que es donde el dueño lo pidió («también cuando alguien de los primeros "dobla" a otro», `docs/balance.md` l. 3341-3342); en el tablero, el alcance no cambia nada que se vea.
- **No se sirve la lista de salida por adelantado**: cada salida se ve a su hora (§4.6); lo que la pantalla necesita antes, la regla, el intervalo y el número de corredores, va en la cabecera (9-i). Con la N−1 velada, el orden inverso de la general diría la general, y por eso la puerta de D-37 va antes.
- **La pestaña `Race Radio` de una crono sigue vacía**: la sonda no llega hoy (9.1) y la radio desde la línea (paso 11, §12.10) sale de fotos que una crono no tiene. El microscopio de una crono es la traza, que se lee en `Watch` y, entera, en el acta.
- **No hay bonificaciones ni puntos** que enseñar: el motor no los da en una crono (`timetrial.ts` l. 357-366), y la previa y el cierre lo dicen callándolos (9.7).

---

**Injertos aplicados.** I-08 (§9.2: `onTimeTrialRide` y `TimeTrialTrace` campo a campo, con la conversión, los tamaños e I5 exacta; §9.3: `timeTrialInstantAt` en pseudocódigo, medido; §9.5: los cuatro rótulos de la tele).

**Objeciones resueltas.** O-11 (§9.2: la crono tiene tipo y traza por km, no dos controles y meta ni prosa; §9.4: el ritmo por fracción de salidos, con la duración medida por dos scripts y los descartes con su cifra).

**Huecos rellenados.** Ninguno (§B no asigna ninguno). Contradicciones de hecho: ninguna.

**Decisión tomada aquí.**
- 9-a. La última entrada de `kmClockDs` es `10 · Math.round(tS)`, el `tiempoS` de `results` por diez: el sillón que se ve es el del acta e I5 pasa a ser una igualdad. Con `toDs`, de 6 a 9 de 176 tiempos saldrían un segundo distintos del acta. Descartado: `toDs(tS)`.
- 9-b. `TimeTrialTrace` lleva `checkClockDs` (§4.2), con `10 · Math.round(raw[idx] · noise)` en cada control, y `TimelineVisibility`, la hora de cada paso (`ttCheckDs`, §4.6): el tablero coincide con `bestChain` y con cada `tt_split`. Descartados: interpolar el parcial en `kmClockDs` (hasta 1,43 s de error; 177-180 de 352 segundos distintos en la e16) y guardar el reloj exacto en décimas (13-22 de 352 por el doble redondeo).
- 9-c. `checksKm` guarda el km exacto del bloque del control (6,6; 8,6) y el rótulo lo redondea como el `checkKm` del motor, para que `SPLIT 1 · km 9` y «At the 9 km check» digan lo mismo.
- 9-d. Los rótulos de parcial y de meta son las variantes `tt_split` y `tt_finish` de `Cue` (§4.9), que llevan `rank` y `hotSeat` para que `cueClassOf` las suba, y los programa el reproductor (6-i); son candidatos los propios, los de notoriedad 5 o menos y, por la general, los `namedGcTop` últimos en salir; un `tt_split` que espera se sustituye por el siguiente del mismo control y un `tt_finish` por el siguiente, con la clase mayor de los dos. Medido con la cola de §6.5 entera (`l5c/cola2.mjs`): no pasa de 3 y no pierde ningún rótulo de clase 3 ni ningún `VIRTUAL GC`; caducan de 0 a 3 `SPLIT` de clase 2 a ×120 (6-h). Descartado: meter la crono en las variantes de grupo de §4.9 (`time_check` y `split` son de grupos).
- 9-e. `PUNCTURE` y `MECHANICAL` en crono no dan segundos: la pérdida se ve en la llegada, que es donde el motor la apunta. Descartado: `lost 0:22` a mitad de recorrido seguido de un parcial sin pérdida.
- 9-f. La posición en ruta se extrapola desde el último km visible a la velocidad del anterior, con tope en el siguiente km entero y el km 1 a la velocidad nominal de su pendiente; la pantalla no retrocede. Medido: p99 de 248 a 466 m. Descartado: interpolar entre salida y llegada, que exige la llegada (futuro).
- 9-g. En crono los saltos son por reloj y por orden de salida: `−10 min`, `+10 min`, `Last 20 starters` y `Last starter`, con dos constantes nuevas, `ttSeekStepS` y `ttSeekLastStarters` (§15.3); la barra de progreso va por la rampa y, después, por el km del último. Descartado: los saltos de recorrido de §8.5, que no significan nada con 176 corredores en 176 km distintos.
- 9-h. La duración anunciada de una crono la calcula el servidor con `ttPlaybackEstimateS(profile, plan)`: plan público, velocidades nominales y la misma curva. Medido: de −9 a +15 s en doce corridas. Cierra la duda de §15.3.
- 9-i. `BroadcastHead.tt` lleva la preparación pública de la crono (`order`, `intervalS`, `checksKm`; §4.11), porque la previa, la barra, el ritmo (`ttPaceAt` necesita `intervalS` desde `t = 0`) y el primer rótulo la necesitan antes de que salga nadie; `BroadcastChunk.tt.checks` lleva los pasos por control, visibles a su hora (`ttCheckDs`, §4.6); y `TimeTrialInstant.arrivals`, el tablero de llegados (§4.5), del que salen el puesto de `FINISH` y la tabla de llegados.
- 9-j. La general virtual de una crono sale solo por la general y desde que el líder pasa por un control, comparando en su último punto visible (`virtualS` = hueco de salida más la diferencia en ese punto; `group` −1). Descartado: una general provisional sin el líder, que la tele no da.
- 9-k. `ON COURSE` es una rotación de clase 0 cada `breakRoundEveryS` entre los candidatos en ruta, en orden de salida (el `rider` con contexto `tt_round`, que `cueClassOf` pone en 0; la ronda de la fuga es de clase 2 y va reservada, 6-m y §6.7, porque es el requisito del dueño de los maillots de la fuga y con la clase 0 salían enteras 4 de 34 rondas), y de clase 1 si el corredor es del espectador (`own`). Descartado: una constante propia de crono, que no mide nada distinto; y el contexto `focus`, que es el de tocar un nombre y es de clase 1.
- 9-l. En la previa de una crono solo está en juego el maillot de la general (no hay puntos ni bonificaciones); el primer día el cuadro dice que se decide el primer líder. El cierre enseña el tiempo en el sillón del ganador y no enseña `Most kilometres out front`.
- 9-m. La crono por equipos que el calendario real tiene en `race-france` e1 se enseña como lo que el motor corre, una individual, sin rótulo que lo aclare: el producto la llama `ITT` en todas partes.
- 9-n. En una crono, `VIRTUAL GC` es de clase 2, y 3 si cambia el líder virtual; en carretera sigue en 1 y 3 (D-21, §6.5). `cueClassOf` recibe si la etapa es crono. Medido (`l5c/cola2.mjs`, e16, semillas 0 a 2): con la clase 1 la cola pierde 1 de los 7 `VIRTUAL GC`; con la 2, ninguno. Descartado: la clase 1 de carretera, pensada para un cuadro que sale cada 25 s de pared y no para un rótulo que sale dos o tres veces por crono; y la regla que escribía esta sección, «2, y 3 si el líder virtual no es el líder», que citaba D-21 sin ser la de D-21.

**Propuesto para el glosario.**
- `TimeTrialTrace.checkClockDs: readonly (readonly Ds[])[]` (§4.2): por `RiderIx`, reloj propio en cada control de `checksKm`, `10 · Math.round(raw[idx] · noise)`; y `TimelineVisibility.ttCheckDs: readonly (readonly Ds[])[] | null` (§4.6), `startDs + checkClockDs`, con `cutTimeline` y `chunkOf` cortándolo como `kmClockDs`.
- `BroadcastHead.tt: { readonly order: 'gc' | 'bib'; readonly intervalS: number; readonly checksKm: readonly number[] } | null` y `BroadcastChunk.tt.checks: readonly number[]` (tríos `[rider, índice de control, relojDs]`), en `packages/shared/src/broadcast/wire.ts` (§4.11).
- Dos variantes de `Cue` (§4.9), clases de §9.5: `{ readonly kind: 'tt_split'; readonly t: RaceS; readonly check: number; readonly rider: RiderIx; readonly rank: number; readonly deltaS: number }` y `{ readonly kind: 'tt_finish'; readonly t: RaceS; readonly rider: RiderIx; readonly rank: number; readonly deltaS: number; readonly hotSeat: boolean }`.
- `ttPaceAt(t, plan, lastKmFromS)` con la firma de §9.4 y `ttPlaybackEstimateS(profile, plan): number`, en `packages/shared/src/broadcast/pace.ts`; `ttTraceOf` (la conversión de §9.2), en `packages/engine/src/sim/timeline.ts`.
- `BROADCAST.ttSeekStepS` (600, s de carrera de los saltos `−10 min` y `+10 min`) y `BROADCAST.ttSeekLastStarters` (20, el salto `Last 20 starters`), para §15.3.
- `TimeTrialBoard` (el tablero de la crono: capa fija, controles, llegados), en `apps/web/src/components/broadcast/`.
- Textos de pantalla para §G.11: `2:55:00 · 22 on course · 66 finished · 88 to start`, `HOT SEAT · Jan Novák 39:27`, `Start order: reverse general classification, every 2:00 · 176 riders`, `Start order: race numbers, every 1:00 · 176 riders`, `ON COURSE · 62 Iñigo Arrieta (ES) · km 19.9 · +0:38 at split 2`, `fastest at split 1`, `SPLIT 1 · km 9 · …`, `FINISH · 62 Iñigo Arrieta 39:12 · 2nd · +1:08`, `FINISH · HOT SEAT · 71 Mads Olsen 38:04 · −1:23 on Jan Novák`, `VIRTUAL GC · after split 1 · …`, `PUNCTURE · 132 Tom Hargreaves · km 13`, `−10 min`, `+10 min`, `Last 20 starters`, `Last starter`, `Split 1 · km 9`, `The first leader’s jersey is decided today`, `Mads Olsen held the hot seat for 1:25:38`.
- Corrección (fase 5): `RiderCueContext` gana `'tt_round'` (la ronda `ON COURSE` de la crono, clase 0; §4.9, §6.5); `TimeTrialInstant.arrivals: readonly { readonly rider: RiderIx; readonly timeS: number }[]` (los llegados antes de `t`, por tiempo y, a igualdad, por hora de llegada; §4.5); `cueClassOf(cue, start, lastVirtualLeader, timeTrial)` (9-n, §6.5); `tt_start_order` como `CueKind` (el cuadro `Start order`, §4.9); `BroadcastHead.tt`, `BroadcastChunk.tt.checks`, `checkClockDs`, `ttCheckDs`, `tt_split` y `tt_finish` dejan de ser propuestas (9-b, 9-d, 9-i).

**Dudas para el ensamblador.**
- §4.2 y §4.6 ponen el borde de la meta de una crono en la llegada del último en SALIR. En 1 de las 6 corridas medidas (e16, semilla 0) un corredor llega después que él, y el motor cierra la crono con la última llegada (`stage_win_itt`, `timetrial.ts` l. 611-619): con el borde de §4.6, ese corredor sigue en ruta cuando la pantalla pide la meta y su llegada solo viaja en el paquete. Propuesta: el borde es la última llegada.
- D-23 dice que el km verdadero del pinchazo «sale de la traza»; el motor no tiene otro que `finishKm / 2` (§9.6, y la duda que ya dejó §4). La fila de D-05 («`startS` del corredor + su reloj propio») tiene que decir «su reloj propio en el km del suceso», como §4.7: con el `tS` del suceso, el rótulo del dorsal 132 saldría 22 s después de su llegada (medido, §9.6).
- La frase de la voz para `puncture` y `mechanical` (§12.5) no debería dar los segundos en una crono, por la misma razón que el rótulo (9-e); `datos.perdidaS` existe y la tentación es usarlo.
- Con relojes absolutos, la traza de una crono de 26 km ocupa 12,8 KB de gzip y una de 40 km se estima en 19-20 KB, por encima de `TIMELINE.ttMaxStoredBytes` (16 KB); por deltas por km son unos 5 KB (`estado.md` §9). §4.3 puede guardar `tt` por deltas y decodificarlo a absolutos, o §15.2 subir el tope; ninguna de las 24 etapas del banco pasa de 26 km, así que B6 no lo cazaría.
- `CUE_OF_TEMPLATE` (§6.6) tiene que dar a las plantillas de crono el destino de §9.5, y §8.5 remitir a los saltos de crono de §9.4.
- D-19 y D-23 citan 6:24-6:33 para el prólogo (el juez de ejecutabilidad, con el último km aproximado); con el último km real salen 6:55-7:06 (§9.4). B17 decide; §8.3 debería citar las dos.
