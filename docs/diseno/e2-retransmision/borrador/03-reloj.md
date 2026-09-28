## 3. El reloj, el espacio y la identidad

Esta sección fija qué es la hora de una retransmisión, dónde está cada grupo a esa hora, qué hueco se enseña y cómo se sigue a un grupo de un punto de la carretera al siguiente. Escribe como hechos cuatro decisiones cerradas (D-01, D-03, D-04 y D-07) y decide lo que dejan abierto (al final, «Decisión tomada aquí»). Los tipos son de §4 (`Photo`, `StageTimeline`, `TimelineCore` y `GroupCatalogEntry` en §4.2; `Instant`, `GroupNow`, `GapReading`, `InTransit`, `InstantContext` e `instantAt` en §4.5) y aquí solo se citan. Las cifras tienen tres procedencias: el juez del motor (C1 a C4, `juicios/motor.md` §2); `estado.md` §3.5 y §3.6; y las medidas del redactor de esta sección, hechas en el scratchpad con los scripts de `l1/` que nombra cada cifra (el banco común es `l1/banco.mjs`) sobre el `dist` del motor v89, el campo de `scripts/race-radio.mjs` y quince corridas (`race-france` e7, e13 y e18, `race-flanders` y `race-colombia` e5, semillas 0 a 2), con la foto de la sonda en cada bloque y el despacho por índice a la radio de producción de D-08. Esas medidas replican las marcas de reloj de §3.4 sobre el reloj exacto de cada bloque; no son el grabador de §5.4, que medirá B21 en el paso 6.

### 3.1 Tres relojes y un eje

El motor avanza por DISTANCIA: en el bloque `b` (100 m, `km = (b + 0,5) · dx`, `simulate.ts` l. 1929) todos los grupos están en el mismo punto de la carretera, cada uno a su hora (§1.1). De ahí salen tres relojes, y los tres están en el mismo eje:

1. **El eje común, la hora de carrera.** Segundos desde la salida común: `Group.tS` es el «Cronómetro acumulado en segundos desde la salida» (`group.ts` l. 26-27) y nace en 0 (l. 56); un ataque nace con el reloj de su grupo de origen menos el salto (`simulate.ts` l. 7249) y una captura se queda con el menor de los dos (l. 8817). En el primer bloque nadie pasa de 9,2 s (C1). En memoria es `RaceS` (segundos, coma flotante) y guardado, `Ds` (décimas, entero; §4.1). En la crono el eje cuenta desde la salida del primero y cada corredor lleva además su reloj propio (§9).
2. **El reloj de un grupo en un bloque**, `r_g(b)`: la hora a la que el grupo `g` cruza el bloque `b`, que es el mínimo de los relojes de sus corredores (la cuenta de la radio: «El reloj del GRUPO es el de su primer hombre», `raceRadio.ts` l. 281-300). Dos grupos en el mismo bloque se restan y dan el hueco exacto (`gapSeconds`, `group.ts` l. 121-124). El reloj de la cabeza es `L(b) = min_g r_g(b)`.
3. **El reloj de un corredor.** En la foto es el de su grupo más lo que lleva cedido sin soltarse (`tS + s.markLossS + s.driftS`, `simulate.ts` l. 9012), y no es continuo: al entrar en un grupo adopta su reloj («El corredor que entra en un grupo adopta el reloj de ese grupo», l. 7863); la deriva vuelve a 0 en el llano (l. 5536); las fusiones de grupos, desde la v76.1, le devuelven en `driftS` lo que el cambio de referencia le daría o quitaría (l. 8146-8162), y la caza de un movimiento no lo hace (l. 8813-8818), que es el salto de §3.6.

**Lo que mueve el reloj de un corredor**, mecanismo a mecanismo (líneas de `simulate.ts`). Al instante solo le importan los que cambian a alguien de grupo, porque esos se graban como `move` (§4.2); los demás no se ven en pantalla:

| Qué pasa | Dónde | Qué hace con su reloj | ¿Se devuelve en `driftS`? | En el instante |
| --- | --- | --- | --- | --- |
| cede dentro de su grupo en una rampa (la deriva) | `driftS`; vuelve a 0 en el llano, l. 5536 | se separa del de su grupo y vuelve de golpe | no hace falta: no cambia de grupo | nada: la pantalla nunca enseña el reloj de un corredor (§3.5) |
| cede en un marcaje sin soltarse | `markLossS`, l. 5981 y 7079 | se separa y no vuelve; cuenta en meta (`lossOf`, l. 9619) | no hace falta | nada |
| ataca | el movimiento nace con el reloj de su origen menos el salto, l. 7249 | gana el salto | no: es carrera | un grupo nuevo (decisiones 3-a y 3-e) |
| vuelve al pelotón por la puerta (`caught`, o `rejoinGapSeconds`, 22 s) | l. 7843-7844 y 7898-7903 | adopta el del pelotón, a menos de 22 s del suyo | no, a propósito: «el hueco que perdona es su precio conocido» (l. 7911) | un `move`; en tránsito hasta que su grupo llega a ese bloque |
| se funde por contacto (v81) | l. 7923-7926 | adopta el del pelotón | sí | un `move`, sin salto |
| se funden dos grupos (v76.1) | l. 8146-8162 | el común, el menor de los dos | sí | un `move`, sin salto |
| el pelotón caza un movimiento | l. 8813-8818 | adopta el del pelotón, el menor | no | el salto de §3.6 si el movimiento iba detrás |

La hora de la retransmisión, `t`, corre sobre el eje común: la pantalla enseña el estado de la carrera a la hora `t`, y la curva de ritmo decide cuántos segundos de `t` pasan por cada segundo de pared (§8.2).

**D-01, escrito como hecho.** Todos los `tS` están en un eje común, y el reloj de un grupo en un bloque es la hora de carrera a la que ese grupo cruza ese bloque. Ese eje no es continuo por corredor. Seis consecuencias, todas obligatorias:

1. **El espacio es canónico y el instante es una proyección.** Lo que se graba y se reduce está en el bloque (la foto, §3.2); el instante se calcula encima con el corte diagonal (§3.3; D-02, D-04).
2. **Nunca se reducen cambios de corredor en orden de reloj.** `estado.md` lo probó ordenando los cambios por el reloj del corredor o del grupo de destino y reduciendo hasta `t`: discrepa de la foto en el 0,3-12,5 % de los grupo-km (cinco etapas, dos semillas, `estado.md` §3.3).
3. **El reloj de la cabeza se fuerza monótono con un máximo acumulado**: `L*(b) = max(L*(b − 1), L(b))`. Medido: 0 bajadas mirando por km y de 0 a 2 por bloque, de 2,8 s como mucho (C3; 0 y de 0 a 2, de 2,7 s como mucho, en las quince corridas de aquí).
4. **El hueco que se enseña es siempre la resta de los relojes de dos grupos en el MISMO bloque**, en el último km de foto que ha cruzado el de detrás, que es como lo mide la moto de cronometraje (mapa 06 §1.4). Nunca el reloj de un corredor. El de «tu corredor», el de su grupo en el último punto común (§3.5; H-17).
5. **Marcas de reloj en cuatro sitios** (§3.4). Entre dos marcas, el reloj de un grupo en un bloque se interpola en línea recta; es lo que hacen `photoAt` y el servidor, que tienen la línea entera. El instante no puede usar la marca siguiente, que aún no ha llegado: extrapola desde la última (§3.3).
6. **El motor llega a teletransportar a un corredor 138 s por delante** (C4): un ataque que sale de un grupo que va detrás del grupo `peloton` se da por cazado con hueco negativo. Es un defecto del motor que E2 no arregla, porque sería conducta y subiría la versión; lo tolera enseñando a ese corredor en tránsito y lo deja escrito para el dueño (§3.6; D-58).

**Las medidas en que se apoya** (el diagnóstico está en §1.2; la columna de la derecha es la réplica del redactor con `l1/reloj.mjs`):

| Medida | Qué mira | Juez del motor | Aquí, quince corridas | Qué obliga |
| --- | --- | --- | --- | --- |
| C1 | el reloj de todos al cruzar el primer bloque | nadie pasa de 9,2 s | 9,2 s en las quince, todos a la vez | hay eje común: la hora de carrera existe (consecuencia 1) |
| C2 | los pares de bloques consecutivos en que el reloj de un corredor baja | del 0,001 al 0,31 % | de 4 en 307.824 (e7, semilla 2) a 1.527 en 489.456 (Flandes, semilla 0) | nunca reducir en orden de reloj (consecuencia 2) |
| C3 | las bajadas del reloj de la cabeza | 0 por km; de 0 a 2 por bloque, hasta 2,8 s | 0 por km; de 0 a 2 por bloque, hasta 2,7 s | el máximo acumulado (consecuencia 3) |
| C4 | el mayor retroceso de un corredor en un bloque | 138 s (`race-colombia` e5, semilla 0, km 183,25) | 137,7 s, el mismo caso | el tránsito y D-58 (consecuencia 6; §3.6) |

Y una más, del redactor (`l1/deriva.mjs`): en las fotos de km, el reloj de un corredor se separa del de su grupo por p99 de 6 a 19 s según la etapa, y hasta 118 s en Flandes y 60 s en la e18. X-01 y X-02 quedan resueltas así: el eje es absoluto y común, el instante no existe en el motor y el corredor no es continuo.

### 3.2 Foto contra instante

La **foto** es el estado en un punto de la carretera: todos los grupos al cruzar el bloque `b`. Es lo que el motor calcula y lo que la radio enseña, y el dueño la definió así: «es que la foto de la radio no es un instante, es 1 km entero… si fuera un instante, en el pelotón saldría solo ese 1 que da la cara. En el viento no caben 20» (`docs/balance.md` l. 16714-16715, nota de radio posterior a la v86). La foto de un km del dueño es la `Photo` de un bloque de `radioKmPoints`, con su capa de detalle, que cuenta el turno de relevos de los tres km anteriores (`TURNO_KM`, `raceRadio.ts` l. 597). El **instante** es el estado a una hora de carrera: dónde está cada grupo AHORA, que es lo que pinta la tele (mapa 06 §1.5). En el motor no existe (§1.2): se calcula (injerto I-05).

| | La foto (`Photo`, §4.2) | El instante (`Instant`, §4.5) |
| --- | --- | --- |
| Qué es | el estado en el bloque `b`: todos los grupos al cruzarlo | el estado a la hora `t`: cada grupo donde está en ese momento |
| Eje | el espacio | el tiempo de carrera |
| Dónde está cada grupo | todos en el mismo bloque | cada uno en el bloque donde su reloj vale `t` (§3.3) |
| A qué hora | cada grupo a la suya: una foto mezcla minutos de carrera (15:18 en el ejemplo de §3.3) | todos a la misma, `t` |
| Composición | exacta: `photoAt(tl, b)`, igual a la foto del motor en cada km (I1) | la de la foto del bloque de cada grupo, con lo visible hasta `t`; quien cambió de grupo en el tramo que los separa, en tránsito |
| Hueco | resta exacta de relojes en `b` | el del último km de foto que ha cruzado el grupo de detrás (§3.5) |
| Qué es exacto | todo | los relojes en las marcas y la composición; la posición entre marcas se extrapola |
| Qué ve de más | el futuro de los grupos de detrás, que aún no han llegado a `b` | nada: es causal por construcción (D-04; B9) |
| Cómo se calcula | foto clave anterior más los sucesos de estado hasta `b` (`photoAt`, §4.4) | el corte diagonal (`instantAt`, §4.5) |
| Quién la usa | la radio del dueño (`radioFromTimeline`, §12.10), I1 al grabar (`selfCheckI1`, §5.5), B2 y B16, el servidor para saltar y comprobar | `Watch` (pantalla): la capa fija, la barra de grupos, el perfil con cursores, la voz y la cola de rótulos (§6) |

La radio del dueño, por tanto, se construye desde el mismo estado: `radioFromTimeline` (§12.10) devuelve el contrato `RaceRadio` de hoy desde las fotos de los bloques de `radioKmPoints` y su capa de detalle, con la pertenencia completa y sin la lista de seguimiento que hoy nombra desde el km 0 a los diez primeros de la etapa (`stageRun.ts` l. 560-568) en una etapa no conocida; en una conocida y con `?diag=1`, la ruta añade al leer los diez primeros de la etapa (§12.10, 12-o). A quién se nombra lo decide la política de §7.7. Hasta el paso 11 la radio guardada se sigue escribiendo igual y lo que destripa se corta en lectura (D-16; §11.16).

### 3.3 El corte diagonal

**La regla (D-02, D-04).** `instantAt` es causal: solo usa datos con visibilidad ≤ `t` (D-06), y por eso se define sobre `cutTimeline(tl, t)` (§4.5, §4.6). Cada grupo está en el bloque donde su reloj vale `t`: desde su última marca de reloj con valor ≤ `t`, se extrapola a la velocidad entre sus dos últimas marcas, sin pasar el siguiente punto de foto de km (el calendario de fotos es público: sale de la longitud, `radioKmPoints`, `raceRadio.ts` l. 230-236) y sin volver nunca atrás en pantalla: se pinta lo más lejos que llegó a pintarse, que es una cuenta pura sobre la línea y no una memoria de la pantalla (§4.5). La composición de cada grupo es la de `photoAt` en el bloque al que llega la extrapolación desde su última marca, sin ese máximo, con lo visible. Un corredor que aparece en dos grupos se pinta en el de ATRÁS, porque en su punto el cambio aún no ha pasado; uno que no aparece en ninguno va a `inTransit` con su origen y su destino. El error de posición es menor que un km por construcción; el típico no está medido por los jueces (lo mide B21 en el paso 6; aquí va la medida del redactor).

**La posición de un grupo en `t`, en TypeScript.** Es el paso 2 de `instantAt` (§4.5), escrito aquí entero con las decisiones 3-a (un grupo con una sola marca) y 3-f (la salida). Recibe la línea cortada, que es un `TimelineCore` como el que recibe `instantAt` (4-b), y compila con el `tsconfig.base.json` del repositorio (`strict`, `noUncheckedIndexedAccess`) junto al bloque de §4.5 y los tipos de §4.1, §4.2 y §4.8, con `clockMarksOf(tl: TimelineCore, g)` declarada como la da F.2 (§21.6) y `originOf` y `lastTwoMarks` como dicen sus comentarios (comprobado en el scratchpad, `corr-l1/full`):

```ts
// packages/shared/src/broadcast/instant.ts, privada: el paso 2 de instantAt (§4.5) para un grupo. Mismo fichero que el bloque de §4.5,
// que ya importa Block, GroupIx, RaceS y TimelineCore de './timeline.js'; este bloque añade:
import { toDs, type Ds } from './timeline.js'
import { clockMarksOf } from './reduce.js'

// `cut` = cutTimeline(tl, t), un TimelineCore (4-b): solo lo visible a la hora t (D-06). Pura: no recuerda lo pintado.
function groupBlockAt(cut: TimelineCore, g: GroupIx, t: RaceS, ctx: InstantContext): { readonly real: number; readonly painted: number } | null {
  const T = toDs(t)
  const entry = cut.groups[g]!                                 // g sale de cut.groups (paso 1 de instantAt)
  if (entry.diedB !== null) return null                        // su muerte ya se ve (§4.6): sus corredores van en el sucesor
  const marks = clockMarksOf(cut, g)                           // [bloque, reloj en Ds] visibles, por bloque creciente
  if (marks.length === 0)                                      // antes de su primera marca: solo el de salida existe (decisión 3-f)
    return entry.origin === 'start' ? { real: 0, painted: -0.5 } : null
  const reach = (j: number, s: Ds): number => {                // E_j(s): desde la marca j, sin pasar el siguiente punto de foto
    const [bj, dj] = marks[j]!
    const cap = ctx.photoBlocks.find((p) => p > bj) ?? cut.blocks - 1
    return Math.min(cap, bj + speedFrom(cut, g, marks, j, s) * (s - dj))
  }
  const last = marks.length - 1
  const real = reach(last, T)                                  // donde está según lo visible: da su composición
  let painted = real
  for (let j = 0; j < last; j++) painted = Math.max(painted, reach(j, marks[j + 1]![1]))  // lo más lejos que llegó a pintarse
  return { real, painted }                                     // km en pantalla: máx(0, (painted + 0,5) · dx)
}

// Bloques por décima desde la marca j: los de sus marcas j − 1 y j; con una sola, los de su grupo de origen (decisión 3-a).
function speedFrom(cut: TimelineCore, g: GroupIx, marks: readonly (readonly [Block, Ds])[], j: number, s: Ds): number {
  const pair = j >= 1 ? ([marks[j - 1]!, marks[j]!] as const) : lastTwoMarks(cut, originOf(cut, g), s)
  if (pair === null) return 0                                  // sin origen o sin dos marcas suyas: se queda en su marca
  const [[b0, d0], [b1, d1]] = pair
  return d1 > d0 ? (b1 - b0) / (d1 - d0) : 0
}
// originOf(cut: TimelineCore, g: GroupIx): GroupIx | null
//   el grupo de la mayoría de los corredores de g en photoAt(cut, bornB − 1); null si g es el de salida.
// lastTwoMarks(cut: TimelineCore, o: GroupIx | null, s: Ds): readonly [readonly [Block, Ds], readonly [Block, Ds]] | null
//   las dos últimas marcas de o con reloj ≤ s, o null si o es null o no tiene dos.
```

La cabeza es el grupo pintado más adelante y los km a meta son la longitud menos su km; el reloj de la cabeza que se enseña es `t`. La composición y el tránsito son los pasos 3 y 4 de `instantAt`:

- Cada grupo lleva los corredores que `photoAt(cut, ⌊real⌋)` pone en él. En `t` igual a su marca en un km de foto, su composición es exactamente la de la foto (I2, §4.4).
- Un corredor que sale en dos grupos se pinta en el de atrás y se anota en `inTransit` con `from` el de atrás y `to` el de delante (decisión 3-b). Pasa cuando cambió hacia DELANTE en un bloque que el grupo de delante ya ha cruzado y el de atrás todavía no: un puente, o el salto de §3.6.
- Un corredor que sigue en carrera y no sale en ninguno va solo a `inTransit`, con `from` el grupo que dejó y `to` el que le espera (el `to` del `move`, ya visible, D-06). Pasa cuando cambió hacia ATRÁS: se ha descolgado y el grupo de detrás aún no ha llegado al bloque en que lo recoge.

**Un ejemplo, paso a paso.** `race-france` e18 (reina, 185 km), semilla 0, campo del banco, a la hora `t` = 7.740 s (2:09:00). Medido con `l1/ejemplo.mjs`, que reproduce la regla de arriba sobre el reloj exacto de cada bloque:

1. **La cabeza.** `mov-6`, tres corredores, pintado en el km 86,51: faltan 98,49 km.
2. **Cada grupo en su bloque.** El reloj de cada grupo vale `t` en un bloque distinto:

| # | Grupo | Km exacto a las 2:09:00 | Km pintado (error) | Última marca vista: bloque (reloj) | Velocidad de extrapolación | Tope: siguiente foto | Tamaño en su bloque | Hueco a la cabeza, en su última foto |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `mov-6` | 86,51 | 86,51 (−1 m) | 860, la foto del km 86,05 (2:07:49) | 23,3 km/h | bloque 870 | 3 | 0:00 en el km 86,05 |
| 2 | `mov-10` | 86,38 | 86,38 (+3 m) | 860 (2:08:09) | 23,5 km/h | bloque 870 | 3 | 0:20 en el km 86,05 |
| 3 | `shed-26` | 86,24 | 86,24 (0 m) | 860 (2:08:29) | 22,0 km/h | bloque 870 | 2 | 0:40 en el km 86,05 |
| 4 | `peloton` | 84,97 | 84,97 (−1 m) | 849, un cambio de composición (2:08:56) | 21,6 km/h | bloque 850 | 124 | 3:46 en el km 84,05 |
| 5 | `shed-10` | 84,82 | 84,86 (+41 m) | 840, la foto del km 84,05 (2:06:56) | 23,6 km/h | bloque 850 | 35 | 4:16 en el km 84,05 |
| 6 | `shed-7` | 83,08 | 83,08 (0 m) | 830 (2:08:58) | 43,1 km/h | bloque 840 | 5 | 8:45 en el km 83,05 |
| 7 | `shed-15` | 79,52 | 79,52 (0 m) | 790 (2:08:19) | 41,0 km/h | bloque 800 | 1 | 13:23 en el km 79,05 |

3. **La composición.** Suman 173 corredores; los otros tres van en tránsito.
4. **El tránsito.** `rq-12-0`, `rq-13-3` y `rq-2-7` se descuelgan del pelotón en el bloque 849 (km 84,95): el pelotón lo cruza a las 2:08:56 y ya no los lleva; `shed-10` lo cruzará a las 2:09:21 y aún no los tiene. A las 2:09:00 no están en ningún grupo y van en `inTransit` de `peloton` a `shed-10` durante 25 s de carrera: es la tierra de nadie de la tele, no un error.
5. **Lo que habría enseñado la foto.** La foto del km 86,05, la que enseña la radio, mezcla 15:18 de carrera: la cabeza pasa a las 2:07:49 y `shed-15` a las 2:23:07. Y lleva un grupo que a las 2:09:00 no existe: `mov-11`, cinco corredores que atacan del pelotón después de esa hora, pasa por el km 86,05 a las 2:11:40, y el pelotón llega a ese punto con 87 corredores y no con 124. El instante no los enseña: no ha pasado.

El caso contrario, un corredor en dos grupos, sale en la misma etapa a las 1:50:00 (6.600 s): `rq-17-3` y `rq-8-0` pasan de `shed-25` al pelotón en el bloque 738 (km 73,85). El pelotón cruza ese bloque a las 1:49:50 y `shed-25`, a las 1:51:13; entre las dos horas salen en el pelotón (km 73,96) y en `shed-25` (km 72,96). Se pintan en `shed-25` y se anotan en tránsito hacia el pelotón hasta las 1:51:13; entonces el pelotón va por el km 74,78, y ahí aparecen. Es un caso del defecto de §3.6.

**Lo medido.** La tabla junta tres medidas. Interpolando entre dos marcas, que exige la marca siguiente y por tanto el futuro (la medida de `estado.md` §3.6, reproducida aquí con las mismas cuatro clases de marca). Extrapolando de forma causal, la regla de D-04 con la decisión 3-a. Y el tránsito, contado cada 30 s de carrera. Error de posición contra la posición exacta con el reloj de cada bloque, cada 10 s de carrera y para todos los grupos en carretera:

| Etapa (3 semillas) | Marcas por etapa | Interpolando: p99 (máx.) | Extrapolando: p50 · p90 · p99 (máx.) | Pintado por detrás de su sitio | En dos grupos: p90 (máx.) | En ninguno: p90 (máx.) |
| --- | --- | --- | --- | --- | --- | --- |
| `race-france` e7, llana | 558-704 | 4-5 m (57) | 0 · 10-14 · 52-57 m (924) | 11-15 % | 0 (5) | 0 (5) |
| `race-france` e13, media | 1.224-1.528 | 68-72 m (185) | 0 · 13-14 · 276-295 m (925) | 10-12 % | 0 (93) | 2-3 (105) |
| `race-france` e18, reina | 1.597-2.254 | 85-86 m (183) | 0 · 19-24 · 319-332 m (923) | 8-9 % | 0 (49) | 3-5 (105) |
| `race-flanders` | 1.604-2.084 | 183-219 m (428) | 1 · 125-196 · 448-508 m (916) | 17-18 % | 0 (67) | 1 (113) |
| `race-colombia` e5, reina | 2.669-3.617 | 117-121 m (276) | 2 · 97-99 · 344-353 m (994) | 16-17 % | 0 (15) | 2-3 (86) |

Tres lecturas. (1) La interpolación reproduce la medida de `estado.md` §3.6 (llana p99 de 3-6 m y máximo 53; media 37-76, 183; reina e18 75-83, 195; Flandes 157-196, 422; Colombia 121-124, 271, con su campo y sus semillas): la réplica de las marcas es fiel. (2) Extrapolar cuesta de 2 a 14 veces más en el p99 que interpolar, pero la mediana es de 0 a 2 m y el máximo nunca llega a un km, porque el tope del siguiente punto de foto lo impide. En la altimetría del motor, 720 px de ancho (`packages/engine/src/routes/altimetry.ts` l. 95, mapa 03 §7), el p99 de 332 m de la e18 es 1,3 px y el de 508 m de Flandes, 1,3 px (estimado: la longitud entre el ancho). (3) La velocidad de un grupo recién nacido, que solo tiene su marca de nacimiento, pesa. Quieto en esa marca hasta la foto siguiente, el p99 sube a 208-435 m en la llana, 403-413 en la media, 372-383 en la e18, 506-564 en Flandes y 412-453 en Colombia (`l1/corte.mjs`); con la de su origen (decisión 3-a) es el de la tabla: entre un 7 y un 33 % menos fuera de la llana, y en ella de la cuarta a la octava parte. Contra la velocidad del grupo número 1, que es la que pone el borrador de §4.5 (paso 2), la diferencia solo se ve en las muestras de grupos recién nacidos (`l1/variantes.mjs`, que muestrea hasta la llegada del último grupo): en el p99 de todos los grupos las dos dan de 52 a 508 m; en los recién nacidos, la del origen tiene un p90 menor en 10 corridas, igual en 2 y mayor en 3, y en la e18 y Colombia es de 54 a 154 m contra 178 a 227 m. La cabeza es otro grupo en otro sitio de la carretera: sube un puerto mientras un grupo nace en el valle.

**Los casos del borde.** La regla de arriba los cubre todos; estos son los que un implementador tiene que probar uno a uno (§16):

- **La salida.** Los 176 corredores (126 en Colombia) cruzan el primer bloque a la vez, a los 9,2 s, y todos en `peloton` (`l1/salida.mjs`, las quince corridas; C1). Hasta esa primera marca no hay ninguna visible, y el grupo de salida se pinta en el km 0 con todo el reparto y `Bunch together` (pantalla): la salida es pública (decisión 3-f).
- **Un grupo que nace.** Aparece en el bloque de su marca de nacimiento, visible a su valor (§4.6), y avanza a la velocidad de su grupo de origen hasta su segunda marca (decisión 3-a); su hueco es el de su origen hasta que cruza su primer km de foto (§3.5, decisión 3-e).
- **Un grupo que muere.** Deja de pintarse cuando su marca de muerte es visible (§4.6: la muerte y el sucesor se ven a esa hora). Sus corredores están en el sucesor desde el bloque en que los toma: si el sucesor cruza ese bloque después (un grupo que se deja caer a otro de atrás), entre los dos cruces van en tránsito sin grupo; si lo cruza antes (un puente), salen en los dos y se pintan en el de atrás. Una fuga cazada apenas deja ventana: el pelotón que la caza se queda con el reloj menor, el de la fuga (`simulate.ts` l. 8817), así que sus corredores van en tránsito lo que se tarda en cruzar un bloque.
- **Un abandono** (`out`) saca al corredor al paso de su grupo por el bloque (D-06) y lo cuenta en `gone`. **Una caída o un pinchazo** (`mishap`) no mueve a nadie por sí solo: el que pierde tiempo cambia de grupo con un `move`, como cualquier otro.
- **La meta.** El último km tiene marca en cada bloque (§3.4, sitio d), así que ahí la posición es exacta cada 100 m. Lo que hace la pantalla cuando lo alcanzado llega a la última marca de la cabeza es §8.7 (D-06).
- **Saltar en la reproducción.** Como lo pintado es una cuenta pura sobre la línea cortada, saltar hacia delante o hacia atrás no necesita memoria: el mismo `t` da el mismo fotograma venga de donde venga (§4.5, decisiones 4-c y 4-e).

**Lo no medido.** El error con el grabador real de §5.4 y sus marcas, que es lo que B21 mide en el paso 6 contra `instantAt` de la línea entera y escribe en §18.9; el efecto en pantalla de pintar un grupo hasta 1 km por detrás o por delante de su sitio (la prueba de lectura, §16.5); y el tránsito con la regla exacta de visibilidad de los `move` de D-06, que aquí se ha contado con la composición del bloque exacto de cada grupo. Ningún juez midió la extrapolación: la decisión D-04 lo dice («Sin evidencia de los jueces») y esta medida es del redactor.

### 3.4 Las marcas de reloj

Una marca es el reloj exacto de un grupo en un bloque, grabado como suceso de estado `clock` (§4.2) con visibilidad igual a su valor (D-06). Se graban en cuatro sitios (injerto I-03, de `estado.md` §3.6), y cada uno resuelve algo que los otros no:

| Sitio | Qué resuelve | Sin él (medido) | Cuántas |
| --- | --- | --- | --- |
| (a) cada foto de km, para cada grupo vivo | el hueco exacto en el punto, que es el que se enseña (§3.5); I1 al grabar; la radio del dueño | no hay hueco exacto que enseñar ni foto con que comparar | una por grupo y km: 176 fotos en 175 km, 186 en 185 |
| (b) el nacimiento y la muerte de cada grupo | el cursor aparece donde el grupo nace y desaparece donde muere; la cadena de sucesores (§3.7) | un grupo nuevo no tendría reloj hasta la foto siguiente, a un km | dos por grupo: de 14 a 140 grupos por etapa (§3.7) |
| (c) el bloque de cada cambio de composición y el anterior | el mínimo de los relojes de un grupo salta cuando entra o sale alguien, y una recta entre dos fotos no lo ve | la llana pasa a p99 de 12-29 m y Flandes llega a 3,5 km de error máximo (`estado.md` §3.6, primera pasada) | las que más pesan en montaña: el grupeto se deshace de dos en dos |
| (d) cada bloque del último km | la tele pone carteles a 500, 300, 200, 150, 100 y 50 m (mapa 06 §1.5; UCI 2.3.004), y el último km dura de un minuto a seis | el último km tendría dos puntos | `TIMELINE.lastKmMarkBlocks` (10) por grupo vivo |

El último km de la cabeza tarda 61 s en la llana e7, de 227 a 230 en la e18 y de 348 a 357 en Colombia e5 (medido por el juez de ejecutabilidad, §2.1): diez marcas en él son de 6 a 36 s entre una y otra. En total, de 518 a 3.392 marcas por etapa según `estado.md` §3.6, y de 558 a 3.617 en las quince corridas de aquí; lo que ocupan en la línea es §5.7.

**Cuántas pone cada sitio**, medido (`l1/extra.mjs`, las quince corridas). Cada marca se cuenta en el primero de los cuatro sitios que la pone, en el orden de la tabla de arriba:

| Etapa (3 semillas) | Marcas | (a) fotos de km | (b) nacimiento y muerte | (c) cambios de composición | (d) último km |
| --- | --- | --- | --- | --- | --- |
| `race-france` e7, llana | 558-704 | 476-602 | 22-27 | 36-51 (6-9 %) | 16-24 |
| `race-france` e13, media | 1.224-1.528 | 704-895 | 72-88 | 376-510 (31-35 %) | 55-72 |
| `race-france` e18, reina | 1.597-2.254 | 795-1.229 | 105-115 | 629-793 (35-39 %) | 59-120 |
| `race-flanders` | 1.604-2.084 | 929-1.316 | 145-155 | 482-571 (27-30 %) | 40-57 |
| `race-colombia` e5, reina | 2.669-3.617 | 1.772-2.404 | 134-204 | 658-859 (24-26 %) | 105-150 |

Las de (c), contadas aparte de las que ya ponen (a) y (b), son la cuarta parte o más de todas fuera de la llana, y son las que no se pueden quitar: sin ellas Flandes llega a 3,5 km de error interpolando (`estado.md` §3.6). Las de (d) son unas ocho por grupo que llega a meta: los diez bloques del último km menos las dos fotos de km que lo abren y lo cierran (`radioKmPoints` añade la de `totalKm − dx`, `raceRadio.ts` l. 233-234).

El reloj de la cabeza se fuerza monótono con un máximo acumulado (D-01, punto 3): si en un bloque el mínimo de los relojes baja, la cabeza no retrocede en pantalla. Por bloque pasa de 0 a 2 veces por etapa y cuesta 2,8 s como mucho (C3); por km, nunca. Las causas son las vueltas al grupo que perdonan un hueco (`simulate.ts` l. 7844 y 7903-7912, `estado.md` §3.1).

### 3.5 El hueco que se enseña

El hueco entre dos grupos es la resta de sus relojes en el mismo bloque, y se enseña el del último km de foto que ha cruzado el de detrás: la moto de cronometraje para el cronómetro cuando llega el grupo de detrás al punto en que lo arrancó la cabeza, y la tele lo mide con transpondedores en ese mismo punto (mapa 06 §1.4). Es exacto porque es una resta de dos relojes en el mismo punto (`gapSeconds`, `group.ts` l. 121-124), y es causal porque el de detrás ya ha pasado por ahí. Nunca se interpola un hueco (`estado.md` §3.6).

En el ejemplo de §3.3, a las 2:09:00 la cabeza lleva `+3:46` (pantalla) al pelotón: la resta en el km 84,05, el último que el pelotón ha cruzado (2:06:26 contra 2:02:40). En el km 86,05 la diferencia será de 4:03 (2:11:52 contra 2:07:49), pero ese número no existe para quien mira hasta que el pelotón llega a ese punto, a las 2:11:52: enseñarlo antes sería enseñar el futuro. Contra quién se mide la diferencia principal de la capa fija (el pelotón, el grupo del maillot o el segundo) es D-17 (§6.2).

Es la respuesta a dos de las cuatro preguntas de la regla del diario (SPEC §6.15, l. 598-600), con la que la v27 contestó a la queja del dueño ([DUEÑO 4]). Tras «si lees todo el Journal no SABES quién va ganando, quién va persiguiendo… es un lío los últimos mensajes» (`docs/balance.md` l. 5975-5976, v27), la regla quedó en que el lector tiene que poder responder «quién va delante, con cuánta ventaja, sobre quién y cuánto queda» (l. 6000-6002; SPEC 6.15). «Cuánta ventaja» es esta resta. «Sobre quién» es la referencia de la diferencia principal (el pelotón, el grupo del maillot o el segundo; D-17, §6.2), y la misma v27 encontró que la causa madre de aquel diario era que «se medía contra el grupo equivocado» (l. 6004).

El hueco de un corredor (H-17) es el de su grupo en el último punto común con el grupo de referencia: el `GapReading` del grupo en que se pinta (§4.5). Si va en tránsito sin grupo, el del grupo que dejó (`from`) en el último km de foto en que iba en él (decisión 3-c). Nunca su reloj de foto: ese reloj suma la deriva y el marcaje (`simulate.ts` l. 9012) y se separa del de su grupo por p99 de 6 a 19 s y hasta 118 s en Flandes (§3.1), y además es el que salta en §3.6.

**Qué hueco lleva cada sitio de la pantalla.** Todos son la misma resta en un km de foto; cambia el par de grupos y el punto:

| Dónde | Qué hueco | Medido en |
| --- | --- | --- |
| la capa fija (`MainGap`, §6.2) | el del grupo de referencia de D-17 al de delante; `s.t.` por debajo de `BROADCAST.sameTimeS` (5 s) y `Bunch together` con un solo grupo (pantalla) | el último km de foto que ha cruzado el de detrás |
| la barra de grupos (`GapReading`) | `toHeadS` a la cabeza y `toAheadS` al de delante, con su tendencia (`BROADCAST.trendWindowKm`, 5 km; `BROADCAST.trendMinS`, 5 s) | el último km de foto que ha cruzado ESTE grupo |
| un grupo recién nacido | el de su grupo de origen, sin tendencia, hasta que cruza su primer km de foto (decisión 3-e) | el último km de foto que cruzó su origen antes de que él naciera |
| «tu corredor», `Your rider · in the bunch · +2:14` (pantalla) | el de su grupo (H-17) | como su grupo |
| un corredor en tránsito | el del grupo que dejó (decisión 3-c) | el último km de foto en que iba en él |
| la general virtual (`VirtualGcRow`, §6.7) | el déficit de salida más el hueco de su grupo al del líder | el último km de foto común |
| la radio del dueño (`radioFromTimeline`, §12.10) | `gapS` de cada grupo, la misma resta | ese km, exacto |
| la meta | el tiempo oficial de `results`, solo en `POST …/broadcast/finish` (D-06) | la línea |

**Cuánto tiene de viejo el hueco que se enseña**, medido (`l1/extra.mjs`, las quince corridas, cada 10 s de carrera, todos los grupos que no son la cabeza de su foto). La antigüedad es `t` menos la hora a la que el grupo cruzó el km de foto donde se midió; el cambio es cuánto distinto sale en la foto siguiente:

| Etapa (3 semillas) | Antigüedad, todos: p50 · p90 (máx.) | Antigüedad, el pelotón: p50 · p90 (máx.) | Cambio en la foto siguiente: p50 · p90 · p99 (máx.) | Grupos aún sin foto propia |
| --- | --- | --- | --- | --- |
| `race-france` e7, llana | 41-42 · 75-76 s (91) | 40-41 · 73-74 s (91) | 2,8-4,4 · 8,9-12 · 11,8-14,8 s (17,9) | 1,0-1,8 % |
| `race-france` e13, media | 45-47 · 110-114 s (234) | 41-45 · 75-86 s (195) | 1,9-7,3 · 17,9-27,3 · 38,8-63 s (64,3) | 3,2-3,7 % |
| `race-france` e18, reina | 48-52 · 99-118 s (282) | 47-49 · 88-94 s (183) | 5,3-7,9 · 16,2-23,6 · 27,4-90,1 s (113,8) | 3,2-3,7 % |
| `race-flanders` | 43-47 · 80-91 s (252) | 43-44 · 78-81 s (206) | 3,5-5,1 · 12-15,7 · 21,9-50 s (95,3) | 2,8-3,1 % |
| `race-colombia` e5, reina | 72-74 · 181-188 s (372) | 58-59 · 140-153 s (249) | 8,3-9,1 · 29,3-34,7 · 57,2-69,2 s (93,8) | 2,3-2,9 % |

El hueco que se enseña tiene de mediana de 40 a 75 s de carrera, lo que tarda el grupo de detrás en hacer medio km, y en el p90 de un minuto y cuarto a algo más de tres: es el precio de medirlo en un punto y sin futuro, el mismo que paga la tele con la moto. En la llana apenas se mueve de una foto a la siguiente (p99 de 15 s); en montaña se mueve de 16 a 35 s en el p90, y eso es la carrera: por eso la tendencia (`GapTrend`) mira cinco km hacia atrás y no uno. Un grupo nuevo espera a su primera foto de 30 a 59 s en la mediana y de 54 a 172 s en el p90 (máximo 281 s), y de 0 a 37 grupos por etapa mueren sin haber cruzado ninguna (§3.7): de ahí que su hueco sea el de su origen (decisión 3-e), porque `GapReading.toHeadS` no admite nulo.

### 3.6 El salto de hasta 138 s

**Qué es.** Un ataque que sale de un grupo que va DETRÁS del grupo `peloton` se da por cazado en el mismo bloque. El movimiento nace con el reloj de su grupo de origen menos el salto (`simulate.ts` l. 7249); el hueco con que el pelotón lo caza es el reloj del pelotón menos el del movimiento (l. 8678), negativo si el movimiento va detrás; la condición de captura, que ese hueco no pase de `STAGE.captureGapSeconds` (5 s, `constants.ts` l. 2388; la condición, l. 8783), se cumple con hueco negativo; y los atacantes pasan al pelotón (l. 8813), que conserva su reloj, el menor (l. 8817). Sin devolución en `driftS`, al revés que las fusiones de la v76.1 (l. 8146-8162) y el contacto (l. 7923-7926): el corredor adopta el reloj del pelotón y salta todo el hueco que había entre los dos grupos. Deja un `attack_go` y un `attack_reeled` de tipo `puente` con `narra: 0` en el mismo km, que la crónica no cuenta (`l1/eventos.mjs`).

**Los casos.** El mayor: `race-colombia` e5, semilla 0, km 183,25, `rq-6-5` pasa de `shed-56` al pelotón y su reloj salta 137,7 s (medido por el juez del motor y reproducido aquí). El de §3.3: `race-france` e18, semilla 0, km 73,85, `rq-17-3` y `rq-8-0` pasan de `shed-25` al pelotón, 83 s por delante en ese bloque; su reloj salta 75 s.

**Cuántas veces pasa.** El juez contó de 0 a 36 retrocesos de más de 60 s por etapa (C4), pero esa cifra junta dos cosas. Separadas (`l1/saltos.mjs` y `l1/saltos2.mjs`, las quince corridas):

| Etapa (3 semillas) | Saltos de grupo de más de 60 s | Saltos de grupo de 22 a 60 s | De ellos, con un `attack_reeled` de tipo `puente` del mismo corredor en ese bloque | Retrocesos de más de 60 s sin cambiar de grupo |
| --- | --- | --- | --- | --- |
| `race-france` e7, llana | 0 | 0 | ninguno que buscar | 0 |
| `race-france` e13, media | 1-2 | 1-5 | 13 de 13 | 0 |
| `race-france` e18, reina | 2-5 | 3-5 | 23 de 24 | 0 |
| `race-flanders` | 0-3 | 0-3 | 12 de 12 | 0-33 |
| `race-colombia` e5, reina | 3-6 | 0-4 | 18 de 18 | 0 |

Todos los saltos de grupo de más de 22 s van de un `shed` al `peloton`, y 66 de 67 coinciden con la caza de un ataque de tipo `puente` del mismo corredor en el mismo bloque: los 35 de más de 60 s y 31 de los 32 de entre 22 y 60 s. Ninguna puerta legítima los explica: la de `rejoinGapSeconds` perdona como mucho 22 s (`constants.ts` l. 2519; su factor `shutFor` no pasa de 1, `simulate.ts` l. 7764-7776), y el contacto y las fusiones devuelven la diferencia en `driftS`. El defecto pasa, pues, de 0 a 6 veces por etapa por encima de 60 s y de 0 a 10 por encima de 22 s. Los otros 33 retrocesos de más de 60 s de Flandes, semilla 0, que con sus 3 saltos de grupo hacen el 36 del juez, son la deriva que vuelve a 0 en el llano dentro del mismo grupo (l. 5536): no mueven a nadie de grupo y no se ven en la pantalla, que nunca enseña el reloj de un corredor (§3.5).

**Cómo se tolera.** Sin tocar el motor y sin inventar nada: el corredor sale en dos grupos durante la ventana entre los dos cruces del bloque del salto, se pinta en el de atrás y se anota en tránsito hacia el de delante (§3.3, decisión 3-b); cuando el grupo de atrás llega al bloque, aparece en el de delante. En el ejemplo de la e18 la ventana dura 83 s de carrera y el salto en pantalla es de 0,93 km, del km 73,85 al 74,78. Ninguna cifra de la pantalla sale de su reloj: su hueco es el de su grupo (§3.5), y la barra solo cambia de tamaño dos filas.

**Por qué E2 no lo arregla.** Sería cambiar la conducta del motor, y eso sube `ENGINE_VERSION` (D-09; precedente v73, `docs/balance.md` l. 14036-14038), que E2 no sube en ningún paso. Lo deja escrito para el dueño en `docs/balance.md` en el paso 12, con el caso de Colombia y las líneas (D-58; §17.15), como hallazgo abierto (objeción O-21; hueco H-12).

### 3.7 La identidad de los grupos

Cuatro reglas (D-03; injerto I-04, de `estado.md` §3.5):

1. **La identidad es el id del motor mientras el grupo tenga gente.** El motor nombra los grupos por su ORIGEN y ese nombre no caduca: `peloton` es el que salió del pelotón, `mov-N` el que atacó, `shed-N` el que se descolgó (`group.ts` l. 164-193). Las fusiones reasignan `groupId` y no crean ids (`mergeGroups`, `group.ts` l. 135-147, no la llama nadie en `simulate.ts`). Medido: de 14 a 22 ids por llana, de 53 a 71 por media, de 67 a 102 por reina, de 83 a 103 en Flandes y de 116 a 140 en Colombia (`estado.md` §3.5); de 14 a 130 en las quince corridas de aquí. Es la entrada `GroupCatalogEntry` de §4.2, con su origen, su bloque de nacimiento y el de muerte.
2. **El sucesor de un grupo que muere es el grupo al que fue la mayoría de sus corredores en el bloque de su muerte.** Es la regla con que la radio sigue a un grupo para medirle la velocidad: «si se fundió, es el grupo en el que han acabado sus corredores» y «si se rompió, es el trozo que se lleva a más de ellos (el mayor)» (`raceRadio.ts` l. 625-626; el código, l. 694-706). Con ella el cursor de la fuga cazada se funde con el del grupo que la caza y la tendencia del hueco sigue la cadena (`GroupCatalogEntry.successor`). La muerte y el sucesor se ven a la hora de la marca de muerte, no antes (§4.6).
3. **El número de carretera y el papel se derivan en cada instante.** El número es el orden en la carretera a la hora `t` (1 el primero) y no es identidad: la tele renumera. El papel (`GroupRole`, §4.5; su vocabulario y sus condiciones son §6.3) tiene una histéresis de `BROADCAST.roleHysteresisKm` (1 km): no cambia si la condición no se sostiene un km, salvo que un `move` de más de un corredor toque ese grupo. Así la barra no parpadea en los bloques en que dos grupos se cruzan el papel.
4. **El título de pelotón se graba por bloque con la regla de la radio.** El motor recalcula el pelotón una vez por km, en el bloque de decisión (`mainGroupId`, `simulate.ts` l. 4112-4116), con histéresis (`STAGE.mainGroupTakeoverRatio` 1,25, `constants.ts` l. 2672); en los bloques siguientes su `mainId` puede apuntar a un grupo que se ha vaciado. La radio lo resuelve así (`raceRadio.ts` l. 317-320): el `mainId` del motor si ese grupo tiene gente en la foto; si no, `mainGroupId` sobre los grupos de la foto, con el título anterior como el que se defiende (se conserva si sigue teniendo gente y nadie lo supera por 1,25; si no, manda el tamaño). El grabador aplica la misma regla en cada bloque con el título del bloque anterior, y lo guarda como suceso de estado `main`.

```ts
// Al grabar, en cada bloque b (packages/engine/src/sim/timeline.ts, §5.4). raw: los grupos de la foto de b con gente.
main(b) = raw.some((x) => x.id === engineMainId(b))
  ? engineMainId(b)
  : mainGroupId(raw.map((x) => ({ id: x.id, size: x.size })), main(b - 1), STAGE.mainGroupTakeoverRatio)
```

Medido por `estado.md` §3.5 y §3.9: con esta regla por bloque, el título coincide con el de la radio de hoy en 3.242 de 3.246 fotos de km (15 corridas), y la foto reducida es la del motor en las 3.246 (I1, que proyecta la foto con este título); copiando el `mainId` del motor sin la regla, I1 da 69 discrepancias, de 8 a 27 en cada semilla de Colombia e5. Las cuatro fotos en que difiere de la radio son mejores con la regla por bloque: la radio hereda el título de la foto del km anterior, un km de memoria; el grabador, del bloque anterior, que es el que tenía la carrera 100 m antes. Es la misma regla con la memoria correcta.

**Tres casos medidos** (`l1/titulo.mjs` y `l1/renombres.mjs`):

- **La cadena del ejemplo de §3.3** (`race-france` e18, semilla 0). `mov-6` nace en el km 62,35 del pelotón con cuatro corredores y llega a meta con uno. `mov-10` sale de `mov-7` en el km 81,65 con uno y muere en el km 177,75 con dos, que se van a `mov-6`: su sucesor es `mov-6` y su cursor se funde con el de la cabeza. `shed-26`, el que se descuelga de `mov-6` en el km 84,75, muere en el km 92,15 y su sucesor es el pelotón, que lo caza; `mov-11`, el ataque del km 85,65, igual en el km 87,75.
- **El cambio de etiqueta.** A veces un grupo muere sin que cambie su gente: todos sus corredores pasan juntos a un id que nace en el bloque siguiente. En Colombia pasa de 10 a 19 veces por etapa (casi siempre con cinco corredores o más), y de 0 a 2 en las demás. En la semilla 0, los 11 de `shed-349` pasan a `shed-432` en el km 225,15, y de ahí, ya con 17, a `shed-465`, `shed-467` y `shed-468`, un id nuevo en cada uno de los tres últimos km. Con el sucesor es un solo cursor y una sola tendencia: cada eslabón se lleva a todos los del anterior.
- **El título cuando su grupo se vacía.** En esa misma corrida, en el bloque 2250 el `mainId` del motor es `shed-349`, el mayor. En el 2251 `shed-349` ya no tiene a nadie, y el motor no lo corrige hasta su siguiente bloque de decisión, el 2260 (km 226,05). La regla da `shed-78` (16 corredores, ahora el mayor) desde el 2251, nueve bloques antes que el motor. En Colombia la regla y el `mainId` del motor difieren en 67 a 98 de los 2.320 bloques de cada semilla, siempre, por construcción, en bloques en que el del motor apunta a un grupo vacío. Y el id `peloton` no es el pelotón: en las tres semillas de Colombia se queda con un corredor y muere entre el km 200,75 y el 226,45.

**El catálogo, medido** (`l1/extra.mjs`, las quince corridas):

| Etapa (3 semillas) | Ids: de ataque (`mov`) · de descolgados (`shed`) | Vida mediana, km: `mov` · `shed` | Llegan a meta | Sucesor: el `peloton` · un `shed` · un `mov` | Viven menos de 1 km | No cruzan ninguna foto |
| --- | --- | --- | --- | --- | --- | --- |
| `race-france` e7, llana | 9-14 · 2-4 | 2,7-10,8 · 38-110 | 2-3 | 7-11 · 0-1 · 2-5 | 0-3 | 0-2 |
| `race-france` e13, media | 11-18 · 33-38 | 3,1-4,7 · 1,4-3,3 | 7-9 | 19-29 · 13-19 · 1-3 | 10-14 | 4-6 |
| `race-france` e18, reina | 11-13 · 55-61 | 3,1-6,2 · 1,1-2,1 | 10-17 | 17-23 · 34-41 · 0-3 | 16-27 | 7-13 |
| `race-flanders` | 12-19 · 76-87 | 6,4-26,2 · 0,9-1,0 | 5-8 | 53-59 · 26-30 · 6-9 | 39-46 | 24-37 |
| `race-colombia` e5, reina | 5-9 · 83-120 | 8,1-53,1 · 5,0-6,4 | 13-20 | 6-10 · 69-94 · 1-9 | 17-24 | 8-11 |

Los `shed` de la e18 y de Flandes viven de mediana uno o dos km: el grupeto se hace y se deshace, y la barra lo enseña tal cual, porque la identidad es la del motor mientras tenga gente (regla 1) y solo el papel lleva histéresis (regla 3). De 0 a 37 grupos por etapa no cruzan ninguna foto de km: la radio no los ha visto nunca y el instante sí los pinta, con las marcas de su nacimiento, su muerte y sus cambios de composición.

### 3.8 El reloj estimado de las etapas sin línea

Las etapas corridas antes de que se grabe la línea (paso 5) no tienen reloj de grupo ni identidad (§1.1): el mundo de pruebas entre el despliegue y el reinicio, y todas las que el dueño mira en el paso 3 (hueco H-16). Para ellas, la API sirve la retransmisión con el mismo formato que para las demás (`BroadcastHead`, `BroadcastChunk`) desde el **adaptador de la radio**: `timelineForStage` (`apps/api/src/broadcastSource.ts`, §14.4) devuelve la línea grabada si existe y, si no, una `StageTimeline` degradada que construye desde `stage_snapshots.radio` y `.events` (D-07):

- **El reloj de la cabeza, estimado.** Se integra la velocidad del grupo en cabeza de cada foto (`speedKmh`, medida por sus hombres, con techo de 75 km/h y `null` si no se puede medir; `raceRadio.ts` l. 679-764 y 940-944) y se reescala para que la meta caiga en el tiempo del ganador. Una foto sin velocidad toma la última conocida, y las anteriores a la primera que la tiene, la de ésa; si ninguna la tiene no hay reloj que estimar: `estimatedHeadClock` da null, el adaptador no construye la línea y la etapa abre en `Report` con `Broadcast unavailable for this stage` (pantalla), como toda etapa para la que `timelineForStage` da null (§14.4). El bloque compila con el `tsconfig.base.json` del repositorio contra `StoredRadioKm` (`raceRadio.ts` l. 575-580), y da el mismo reloj que el de `l1/corte.mjs`, el de la tabla de abajo, en toda radio con alguna velocidad (comprobado en el scratchpad, `corr-l1/ehc`, sobre 19.999 radios sintéticas con huecos de velocidad):

```ts
// apps/api/src/broadcastSource.ts (§14.4). kms: StoredRaceRadio.kms, una foto por km; winnerS: `results` del ganador.
import type { StoredRadioKm } from '@cyclingstar/engine'        // exportado en engine/src/index.ts l. 222

/** El reloj de la cabeza en cada foto y en meta; null si ninguna foto tiene velocidad de cabeza: no hay reloj que estimar.
 *  Exportada para su test, apps/api/src/broadcastSource.test.ts (PR 2, §17.5). */
export function estimatedHeadClock(kms: readonly StoredRadioKm[], totalKm: number, winnerS: number): number[] | null {
  let v = firstKnownSpeed(kms)                                   // antes de la primera foto con velocidad, la de ésa
  if (v === null) return null
  const raw: number[] = [0]
  for (let k = 0; k < kms.length; k++) {
    const here = kms[k]!
    const nextKm = k + 1 < kms.length ? kms[k + 1]!.km : totalKm
    v = headSpeed(here) ?? v                                     // sin velocidad: la última conocida
    raw.push(raw[raw.length - 1]! + ((nextKm - here.km) / v) * 3600)
  }
  const scale = winnerS / raw[raw.length - 1]!                   // la meta, en el tiempo del ganador
  return raw.map((s) => s * scale)                               // el índice k es la foto kms[k]; el último, la meta
}

/** La velocidad del grupo en cabeza de una foto, o null si la radio no pudo medirla; 0 no se acepta. */
function headSpeed(photo: StoredRadioKm): number | null {
  const v = photo.groups[0]?.speedKmh ?? null
  return v !== null && v > 0 ? v : null
}

/** La primera velocidad de cabeza de la etapa, o null si ninguna foto la tiene. */
function firstKnownSpeed(kms: readonly StoredRadioKm[]): number | null {
  for (const photo of kms) {
    const v = headSpeed(photo)
    if (v !== null) return v
  }
  return null
}
```

`estimatedHeadClock` se exporta, aunque solo la usa el adaptador, para que su test la pruebe sola (`apps/api/src/broadcastSource.test.ts`, PR 2, §17.5) en sus tres casos: con huecos de velocidad, una foto sin ella toma la última conocida y las anteriores a la primera que la tiene, la de ésa; la meta cae en `winnerS`; y una radio sin ninguna velocidad de cabeza da null. Probarla a través del `revealS` de los sucesos no distingue los tres.

- **Cada grupo, en `headS(k) + gapS`**: exacto en el punto, porque `gapS` es la resta de relojes que la radio guardó redondeada.
- **Sin identidad ni tránsito**: el grupo de la foto `k` se identifica por su posición (`p` más la posición) y no hay transiciones de un punto al siguiente.
- **Los `revealS`, en décimas.** El adaptador redondea a décimas los `revealS` que calcula sobre el reloj estimado (`toDs(revealS) / 10`) al construir la línea, como la línea grabada (§4.3), para que el corte de §4.6 vaya entero por `Ds` con el mismo `toDs` que `chunkOf`. Sin eso, B9 (§16.4) falla por redondeo con un suceso del adaptador cuyo `revealS` cae entre `to / 10` y `to / 10 + 0,05` s.
- **Un reparto provisional** (decisión 17-k). `BroadcastHead.cast` es un `RiderCard[]` obligatorio (§4.11), así que el adaptador también sirve uno: los corredores de `snap.input` con su dorsal, su país, su género y el equipo del día (`input.riders[].teamId`) con la `jerseySeed` de hoy, y `worn` de `jerseyOf(leadersThroughStage(N − 1), riderId)` (el de líder, con `from` en la N − 1) o la equipación; sin títulos, distinciones ni `knownWins`, que son del reparto congelado del paso 5. `leadersThroughStage` sale de `routes/races.ts` (l. 108-121, hoy privada) a `apps/api/src/broadcastSource.ts`, exportada, y `serveCast` nace en el 3a sin velo; el 6b le da las líneas y la notoriedad, y el 7b el velo (§7.8, §14.4). Con él, en el 3c la fila de una fuga de hasta `BROADCAST.nameWholeGroupUpTo` corredores dice ya quién va y con qué maillot ([DUEÑO 3] en parte, §17.17).
- **La pertenencia, solo de los nombrados** en la radio guardada; la lista de seguimiento se filtra en lectura con la política de D-27, así que nunca nombra a los diez primeros de la etapa (§7.7, §11.16).
- **`clock: 'estimated'`, `source: 'radio'`** y el aviso `Recorded before full race data` (pantalla), con debajo `Positions of the groups behind are estimated` (pantalla). Con `clock: 'estimated'`, `ProfileStrip` pinta hueco (sin relleno) el cursor de todo grupo que no sea la cabeza y la barra escribe su km con `~` (§6.2, §6.3); con la línea grabada (`clock: 'exact'`), nada de eso. Nace en el 3c con su caso en `GroupBar.test.tsx` (§17.6).

**Medido por el redactor** (`l1/corte.mjs`, las quince corridas; la radio guardada que produce el despacho por índice, igual a la de producción; la posición de la cabeza cada 10 s de carrera contra la exacta):

| Etapa (3 semillas) | Error de la cabeza: p50 | p90 | p99 | máx. | Factor de reescalado |
| --- | --- | --- | --- | --- | --- |
| `race-france` e7, llana | 0,03-0,15 km | 0,09-0,36 km | 0,11-0,40 km | 0,41 km | 0,9972-0,9992 |
| `race-france` e13, media | 0,10-0,25 km | 0,18-0,51 km | 0,30-0,68 km | 0,69 km | 0,9947-0,9974 |
| `race-france` e18, reina | 0,08-0,18 km | 0,19-0,36 km | 0,24-0,44 km | 0,45 km | 0,9964-0,9966 |
| `race-flanders` | 0,01-0,16 km | 0,09-0,39 km | 0,20-0,49 km | 0,64 km | 0,9962-0,9995 |
| `race-colombia` e5, reina | 0,04-0,09 km | 0,10-0,18 km | 0,13-0,38 km | 0,39 km | 0,9982-0,9991 |

La integral sale entre un 0,05 y un 0,53 % más larga que el tiempo del ganador, y el error de la cabeza no pasa de 0,69 km en ninguna corrida: por debajo del umbral de `BROADCAST.estimatedClockMaxErrKm` (1 km). Dos límites de esta medida: es sobre el campo del banco y no sobre etapas de producción, y mide solo la cabeza. Los demás grupos suman el error de interpolar entre dos fotos sin marcas de cambio de composición, que con identidad llega a 3,5 km en Flandes (`estado.md` §3.6), y el adaptador no tiene identidad. Medido por el refutador de código sobre el adaptador (`rcod/n/adapt.mjs`, cuatro corridas: `race-flanders`, `race-france` e18 y `race-colombia` e5 y e13): la cabeza, p99 de 0,32 a 0,60 km; todos los grupos, p99 de 0,84 a 0,89 km y máximos de 2,17 y 2,62 km; y la misma posición es otro grupo del motor en el 15 al 30 % de los pares de fotos seguidas. B22 lo informa sin ser puerta, y lo que se hace con ello es 16-s (§16.4): si el p99 de todos los grupos pasa de 1 km decide el dueño (§20.6), y si pasa de 2 km esas etapas pintan en el perfil solo la cabeza y el grupo del título.

**B22 decide en el paso 6** (D-07, objeción O-13). Compara el reloj del adaptador con la línea grabada de las mismas etapas; si el p99 de la posición de la cabeza pasa de 1 km, las etapas sin línea abren solo en `Report` con `Broadcast unavailable for this stage` (pantalla, los dos). El umbral de 1 km no tiene evidencia de los jueces; la medida de arriba es la del redactor y B22 es la que manda.

**Qué abre cada etapa según lo que guardó** (D-07, D-12, D-61):

| Lo que tiene la etapa | Se sirve con | `clock` | Abre en | Aviso (pantalla) |
| --- | --- | --- | --- | --- |
| línea grabada (`stage_timelines`) | la línea | `exact` | `Watch` (pantalla) si el espectador no la conoce | ninguno |
| radio y sucesos, sin línea (de la `0029` al paso 5), en línea, con B22 en verde | el adaptador de la radio | `estimated` | `Watch` | `Recorded before full race data` |
| ídem con B22 en rojo | nada | | `Report` | `Broadcast unavailable for this stage` |
| una crono sin línea | nada (decisión 3-d) | | `Report` | `Broadcast unavailable for this stage` |
| una línea que no pasó I1 al grabar (D-12) | nada | | `Report` | `Broadcast unavailable for this stage` |
| sin radio: corrida antes de la `0029` | nada | | `Report` a secas | |
| sin sucesos: corrida antes de la `0024` | nada | | `Report`, con el `journalUnavailable` de hoy (`routes/races.ts` l. 477-497) | |

Lo que no se guardó no se inventa: «una crónica que miente es peor que una muda» (`docs/balance.md` l. 13274, v60 §20). Las etapas corridas entre el despliegue y el reinicio, y qué pasa con ellas en el plan, son §17.19 (D-61).

---

**Injertos aplicados:** I-01 (§3.1, §3.3: la línea temporal de estado, el espacio canónico y el corte diagonal; los tipos, en §4); I-03 (§3.4: las marcas de reloj en cuatro sitios, con lo que pone cada uno); I-04 (§3.7: identidad con sucesor, histéresis del papel y título por bloque); I-05 (§3.2: foto frente a instante, y la radio del dueño desde el estado).

**Objeciones resueltas:** O-13 (§3.4 y §3.8: marcas de reloj en los cuatro sitios; el reloj estimado, medido por el redactor, con `clock: 'estimated'` y B22 como puerta); O-21 (§3.6: el salto, acotado con su mecanismo y su cuenta, tolerado en tránsito y escrito para el dueño).

**Huecos rellenados:** H-12 (§3.6: el salto de 138 s); H-16 (§3.8: las etapas sin línea, con el adaptador y su tabla de qué abre cada una); H-17 (§3.5: el hueco de un corredor es el de su grupo en el último punto común).

**Contradicciones de hecho resueltas:** X-01 (§3.1); X-02 (§3.1).

**Decisión tomada aquí:**

- **3-a. Un grupo recién nacido se extrapola a la velocidad de su grupo de origen.** D-04 dice «a la velocidad entre sus dos últimas marcas» y no dice qué hacer con un grupo que solo tiene una, la de su nacimiento. Aquí: la velocidad del grupo de origen, el de la mayoría de sus corredores en `photoAt(cut, bornB − 1)`, entre sus dos últimas marcas visibles; si tampoco la tiene, el grupo se queda en su marca. Solo usa la línea cortada, así que es causal (B9). Por qué: medido (§3.3), baja el p99 del error de todos los grupos de 208-564 m a 52-508 m (`l1/corte.mjs`), y en los recién nacidos el p50 de 104-371 m a 6-21 m (`l1/variantes.mjs`). Se descarta quedarse quieto, y la velocidad del grupo número 1, que es la del borrador de §4.5 (paso 2): da el mismo p99 en todos los grupos, pero en los recién nacidos de la e18 y de Colombia su p90 es de 178 a 227 m contra 54 a 154 m, porque la cabeza es otro grupo en otro sitio de la carretera.
- **3-b. Un corredor en dos grupos se pinta en el de atrás y además se anota en `inTransit`**, con `from` el de atrás y `to` el de delante; uno en ninguno va solo a `inTransit`, con `from` el grupo que dejó y `to` el del `move` visible. Por qué: el glosario de la síntesis (hoy §21.6 F.1) define «en tránsito» como el corredor que en el instante aparece en dos grupos o en ninguno, D-01 (punto 6) dice que el salto de §3.6 se enseña en tránsito, y ese salto es justamente el caso de dos grupos. D-04 fija dónde se pinta (atrás) y no lo contradice. Se descarta dejarlo solo pintado atrás, como hace el borrador de §4.5 (paso 4): el salto de 138 s no saldría nunca en tránsito.
- **3-c. El hueco de un corredor en tránsito sin grupo es el del grupo que dejó**, en el último km de foto en que iba en él. Por qué: es el último punto común verdadero de H-17; el grupo al que va aún no lo lleva.
- **3-d. Una crono sin línea abre en `Report`** con `Broadcast unavailable for this stage` (pantalla). Por qué: la crono no tiene radio (la sonda se ignora, `simulate.ts` l. 1264), así que el adaptador de D-07 no tiene de dónde sacar nada, y posicionar a cada corredor a velocidad constante entre su salida y su llegada (`ingeniero.md` §9) sería inventar parciales; son pocas etapas (las cronos del mundo de pruebas antes del paso 5). Se descarta esa interpolación. §9 puede afinarlo sin cambiar esta regla.
- **3-e. Un grupo que aún no ha cruzado ningún km de foto lleva el hueco de su grupo de origen**: el `GapReading` del origen en el último km de foto que cruzó antes de que naciera (`toHeadS`, `toAheadS` y `atKm`), con `trend` nulo, hasta que el grupo cruza su primer km de foto. Por qué: `GapReading.toHeadS` no admite nulo, el paso 8 del borrador de §4.5 busca la marca del grupo en un km en que no la tiene, y sus corredores iban en el origen en ese punto, que es su último punto común verdadero (la razón de H-17 y de 3-c). Pasa en el 1-4 % de las muestras de grupo, con esperas de 30 a 59 s de mediana (§3.5). Se descarta dejar el hueco vacío hasta la primera foto: obliga a un tipo nulo y deja sin cifra al ataque justo cuando más se mira.
- **3-f. El grupo de salida es visible desde `t = 0` y se pinta en el km 0 hasta su primera marca**, con todo el reparto. Por qué: todos cruzan el primer bloque a los 9,2 s (C1; las quince corridas), hasta entonces la línea cortada no tiene ninguna marca, y la regla de §4.6 (un grupo se ve desde su marca de nacimiento) dejaría sin grupos el primer fotograma de toda retransmisión. La salida es pública: `visibilityOf` da 0 a ese nacimiento. Se descarta esperar a la primera marca.

**Propuesto para el glosario:**

- `groupBlockAt(cut: TimelineCore, g: GroupIx, t: RaceS, ctx: InstantContext): { readonly real: number; readonly painted: number } | null`: el paso 2 de `instantAt` para un grupo, con el bloque real (da la composición) y el pintado (lo más lejos que llegó); privada de `packages/shared/src/broadcast/instant.ts`. Fichero: `borrador/03-reloj.md` §3.3.
- `speedFrom` y `lastTwoMarks`: sus dos auxiliares privadas (la velocidad desde una marca; las dos últimas marcas de un grupo hasta una hora). Fichero: `borrador/03-reloj.md` §3.3.
- `originOf(cut: TimelineCore, g: GroupIx): GroupIx | null`: el grupo de la mayoría de los corredores de `g` en el bloque anterior a su nacimiento, sobre la línea cortada; privada del mismo fichero. Fichero: `borrador/03-reloj.md` §3.3.
- `clockMarksOf(tl: TimelineCore, g: GroupIx): readonly (readonly [Block, Ds])[]`: las marcas de reloj de `g` por bloque creciente; es la `marcasDe` del borrador de §4.4, con nombre en inglés como el resto del código. Fichero: `borrador/03-reloj.md` §3.3.
- `estimatedHeadClock(kms, totalKm, winnerS): number[] | null`: el reloj de la cabeza del adaptador de la radio (D-07), null si ninguna foto tiene velocidad de cabeza; privada de `apps/api/src/broadcastSource.ts`, con sus dos auxiliares, `headSpeed(photo: StoredRadioKm): number | null` (la velocidad de cabeza de una foto, positiva) y `firstKnownSpeed(kms: readonly StoredRadioKm[]): number | null` (la primera de la etapa). Fichero: `borrador/03-reloj.md` §3.8.

**Dudas para el ensamblador:**

1. **B22 (§16.4) mide solo la cabeza.** D-07 fija la puerta en el p99 de la posición de la cabeza, y así se deja. Pero el adaptador pinta los demás grupos interpolando entre fotos sin marcas de composición ni identidad, que es lo que la objeción O-13 teme («el primer Watch del dueño enseñará cursores mal puestos»), y ese error puede llegar a km (`estado.md` §3.6: 3,5 km en Flandes con identidad). Propuesta para §16.4: que B22 informe además del p99 del cursor de todos los grupos, sin que sea puerta.
2. **`InTransit` y el paso 4 del borrador de §4.5 contra la decisión 3-b.** El borrador comenta `InTransit` como «Un corredor que en t no está en ningún grupo» y en el paso 4 pinta atrás al que sale en dos grupos sin anotarlo; el glosario (§G.1) y D-01 (punto 6) piden que salga en tránsito. Propuesta: el comentario dice «en dos grupos (pintado en el de atrás) o en ninguno», y el paso 4 lo anota.
3. **La velocidad de un grupo con una sola marca.** El paso 2 del borrador de §4.5 usa la del grupo número 1; la decisión 3-a, la del origen. Medido (§3.3, `l1/variantes.mjs`): iguales en el p99 de todos los grupos; en los recién nacidos, la del origen tiene un p90 menor en 10 de las 15 corridas, y en la e18 y Colombia es del 30 al 70 % del de la cabeza. Una de las dos tiene que ceder; la evidencia está del lado del origen.
4. **El umbral de I2** (§4.4 y §16.2: en tránsito, p90 ≤ 2). Con la definición de `estado` (`medir-corte.mjs`: posición por suelo, solo los que acaban) sobre el campo de la radio (`l1/extra.mjs`), el p90 de corredores en ningún grupo es de 3 a 5 en las tres semillas de la e18, de 2 a 3 en Colombia y 2 en la e13; `estado` midió de 0 a 2 con otro campo y solo la semilla 0. Con ese umbral, el test fallaría en la reina según el campo. Propuesta: que §16.2 lo fije después de medirlo sobre su fixture (las 24 etapas del mapa 07 §7), o que lo suba a p90 ≤ 5.
5. **La cifra del salto en §19.1.** Para el tamaño del defecto conviene citar la de §3.6 (de 0 a 6 saltos de grupo de más de 60 s por etapa y de 0 a 10 de más de 22 s, 66 de 67 con su `attack_reeled` de tipo `puente`), no el «0-36» de C4, que incluye la deriva dentro del mismo grupo (la misma duda que en §1).
6. **La tendencia y los cambios de etiqueta.** D-17 reinicia la tendencia «si cambia la identidad del grupo de detrás» y D-03 dice que «sigue la cadena»; el borrador de §4.5 la anula «si `behind` no existía entonces». Si «existir» se lee por id, en Colombia la tendencia se reiniciaría de 10 a 19 veces por etapa sin que cambie nadie de grupo (§3.7, `l1/renombres.mjs`). Propuesta: §4.5 y §6.2 dicen que el grupo de hace `trendWindowKm` es el antecesor por la cadena de `successor`.
7. **Lo que 3-e y 3-f piden a §4.** El paso 8 del borrador de §4.5 toma la marca del grupo en `k_g`, y un grupo nacido después de `k_g` no la tiene (3-e); la tabla de §4.6 hace visible el nacimiento de un grupo a su marca, y el de salida la tiene a los 9,2 s (3-f: a 0).
