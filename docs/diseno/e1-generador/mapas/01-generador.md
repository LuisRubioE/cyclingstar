# Mapa 01: el GENERADOR de recorridos (`packages/engine/src/routes/`)

Ficheros leídos enteros: `profileGen.ts` (514 l.), `stageKind.ts` (98 l.), `finalKind.ts` (85 l.), `featureProfile.ts` (442 l.), `altimetry.ts` (180 l.), y las cabeceras y claves de `stageFeatures.ts` (6.273 l., que es una tabla de datos). De `constants.ts` se han leído los bloques `ROUTE` (l. 1151-1246) y `RELIEF` (l. 1115-1134), y de `stage/sample.ts` la derivación de categoría (`deriveClimbCategory`, l. 131-143) y las pendientes por defecto (`DEFAULT_GRADIENT`, l. 18-24). Para saber quién llama a qué se ha leído el tramo de `calendar.ts` que construye las etapas (l. 86-170, 190-225, 480-560).

Los números marcados como «medidos» salen de correr los generadores tal cual (copiados al scratchpad con los tipos sin tocar) sobre **300 semillas × 5 kilometrajes (130, 155, 175, 195, 215 km) = 1.500 etapas por forma**, que es la misma rejilla de `stageKind.test.ts` con cinco veces más semillas. Versiones citadas (v10, v40, v64) son las de `docs/balance.md` y `docs/tactica.md`.

---

## 0. Resumen de la arquitectura

Hay DOS constructores de perfil, y no se parecen en nada:

1. **Por terreno** (`profileGen.ts`): ocho funciones `xxxSegments(km, seed)` que dibujan un relieve **inventado pero verosímil**. Alimentan las 1.083 continentales y 61 ProSeries sin dato curado (comentario de `ROUTE`, constants.ts l. 1137-1139) y también cualquier etapa de una edición real que no tenga rasgos en `STAGE_FEATURES` (`calendar.ts::stagesFromEdition`, l. 216-225).
2. **Por rasgos reales** (`featureProfile.ts::buildFeatureProfile`): reconstruye el perfil a partir de puertos con km de cima, longitud y pendiente, sprints, sectores de pavé y, si viene, altitud muestreada. Aquí la semilla solo pinta el relleno entre dificultades.

Los dos producen el mismo tipo `StageProfile` (`stage/types.ts` l. 45-48: `segments: Segment[]`, `banners?: Banner[]`), donde cada `Segment` es `{ km, tipo, tramos?, estrellas? }` con `tipo ∈ llano | rompepiernas | puerto | descenso | paves` y cada `Ramp` es `{ km, g }`. Ese perfil es lo que corre la física (`stage/sample.ts` muestrea bloques de 100 m de los tramos) y lo que dibuja `altimetry.ts`.

Encima de ambos hay dos **lectores** puros: `stageKindOf` (qué clase de etapa ES un recorrido, leído del propio recorrido) y `finalKindOf` (en qué cubeta cae el final de una etapa de montaña). Los dos existen porque el calendario puede cambiar y el perfil de una etapa corrida se congela en su snapshot (`stageKind.ts` l. 4-11).

```
calendar.ts::stageMix(n, terrain, seedBase)             ── vueltas generadas
   routeRng(`mix|${seedBase}|${n}|${terrain}`) → roles (llana/media/media-alto/reina/cri) y km
   seed de cada etapa = `${seedBase}|${i}`                                   (calendar.ts l. 550)
      → flatSegments / hillySegments / hillyUphillSegments / mountainSegments / ittSegments
calendar.ts::stagesFromEdition(id, edition)             ── ediciones reales
   seed = `${s.from}|${s.to}|${s.km}`                                        (calendar.ts l. 221)
      → STAGE_FEATURES[id][i] ? buildFeatureProfile : oneDaySpec(terrain) → cobbles/classic/mountainClassic/hilly/itt/flat
auto(segments) → una pancarta `cima` al final de cada `puerto`; NUNCA metas volantes (calendar.ts l. 88-101)
```

---

## 1. Las piezas comunes de `profileGen.ts`

| Función                               | Líneas  | Qué hace                                                                                                                                                                                                                                                                               | Lo que fija y lo que sortea                                                                                      |
| ------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `hashInt(s)`                          | 15-22   | FNV-1a de la cadena semilla                                                                                                                                                                                                                                                            | determinista                                                                                                     |
| `rng(seed)` / `routeRng`              | 30-44   | mulberry32; `routeRng` se exporta porque `calendar.ts::stageMix` necesita «el mismo azar sembrado que los perfiles» (l. 25-28)                                                                                                                                                         | una secuencia por cadena                                                                                         |
| `between(rand, min, max)`             | 47-49   | uniforme en `[min, max)`                                                                                                                                                                                                                                                               |                                                                                                                  |
| `split(rand, total, n)`               | 52-65   | reparte `total` km en `n` trozos con pesos `U(0,7; 1,3)`, redondea a 0,1 y cuadra el último; mínimo 0,5 km por trozo                                                                                                                                                                   | `n` lo pone el llamador; la semilla solo mueve las proporciones (cada trozo entre 0,7/1,3 y 1,3/0,7 de la media) |
| `climb(rand, len, avg)`               | 72-82   | un `puerto` de `len` km partido en `max(2, round(len/2,2))` rampas; pendiente `max(1, avg + prog·1,6 + U(−1,2; 1,2))` con `prog` de −1 (pie) a +1 (cima): **más dura arriba, siempre**                                                                                                 | `n` rampas y la progresión son función de `len` y `avg`; la semilla mueve el ruido ±1,2 y las longitudes         |
| `descent(rand, len, avg)`             | 85-93   | un `descenso` en `max(2, round(len/3))` rampas a `−max(2, avg + U(−1,5; 1,5))`                                                                                                                                                                                                         | nunca menos de −2 %                                                                                              |
| `rolling(rand, km, bumpy)`            | 100-122 | el relleno: `n = max(1, round(km / U(3,6)))` segmentos; cada uno sube la primera mitad a `U(0,8; amp)` (amp 1,8 llano, 3,2 «bumpy») y baja la segunda a entre el 60 y el 100 % de eso, alternando el signo por índice; en `bumpy` cada segmento es `rompepiernas` con p = 0,35         | la ALTERNANCIA sube/baja es por paridad del índice, no por semilla                                               |
| `normalize(segments, target)`         | 141-177 | cuadra los km **escalando todos los segmentos proporcionalmente** y reescalando sus tramos; el residuo del redondeo va al segmento MÁS LARGO y nunca al último (v64: antes iba todo al último, y en una reina eso era el puerto de meta: «un puerto de 12 km pasaba a 21», l. 127-134) | determinista; medido: la suma final coincide con `km` con error 0,00 en las 12.000 etapas                        |
| `garantizaPuerto(segments, min, max)` | 192-233 | tras `normalize`, si el `puerto` más largo está por debajo de `min` o por encima de `max` lo lleva al borde y compensa en el segmento no-puerto más largo (v64, l. 180-190)                                                                                                            | usa `s.km` del segmento, no la suma de tramos (ver §5.1: de ahí sale un fallo de borde)                          |

**El relleno pesa más de lo que parece.** Medido: una etapa `flat` de 130 a 215 km acumula **661 a 1.413 m de desnivel positivo** solo con `rolling` (nunca es «una línea recta», como dice la cabecera l. 3-5). En una reina de 175 km el relleno «bumpy» aporta de media **1.017 m** sobre 2.840 m de puertos. Esto importa para leer el objetivo de desnivel de §2.5: el objetivo se persigue solo con los puertos.

---

## 2. Función por función: qué produce cada forma

Todas siguen el mismo esqueleto: (a) sortear las dificultades, (b) calcular `used` y un `fill = max(km · fracción, km − used)`, (c) `split(fill, nDificultades + 1)` para los huecos, (d) intercalar `rolling`/`climb`/`descent`, (e) `normalize`. La fracción mínima de relleno (0,35 / 0,3 / 0,15 / 0,2 / 0,5 / 0,5) solo actúa cuando las dificultades no caben en el kilometraje; con los km del calendario (`ROUTE.kmFlat` 165-195, `kmHilly` 160-190, `kmUphill` 150-180, `kmSummit` 145-180, y ×0,85 si es la última, constants.ts l. 1233-1245) nunca se dispara en llana ni media.

### 2.1 `flatSegments(km, seed)` (l. 236-240) y `ittSegments` (l. 510-514)

`rolling(rand, km, false)` y `normalize`. **Son literalmente la misma función**: mismo cuerpo, mismo resultado para la misma semilla (medido: distribuciones idénticas, 22 a 72 segmentos, pendiente máxima 1,8 %). Lo único que separa una crono de una llana es `timeTrial` en el spec (`stageKind.ts` l. 66-72 lo dice y `stageKind.test.ts` l. 32-43 lo prueba). No hay ningún `puerto` ni `rompepiernas`: todo es `llano`.

### 2.2 `hillySegments(km, seed)` (l. 243-261): media montaña que acaba abajo

- `nClimbs = km > 170 ? 3 : 2` (**arquitectura fija por umbral de km**, no por semilla).
- Cada cota: `len ∈ U(3, 7)` km, `g ∈ U(4,5; 6,5)` %.
- Entre cotas (no tras la última) un `descent` de `U(3, 5)` km al 5 %.
- `fill = max(0,35·km, km − Σlen − 4·nClimbs)`, `gaps = split(fill, nClimbs+1)`, relleno `bumpy`.
- Tras la última cota va **siempre** `rolling(gaps[n])`: la última cota corona a un quinto/tercio del relleno de la meta. Medido: km tras la última cota **26 a 68** (media 42,8), así que `finalKindOf` da `valle_largo` en las 1.500. Cota más larga medida: 3,4 a 8,1 km; D+ 1.297 a 3.054 m.

### 2.3 `hillyUphillSegments(km, seed)` (l. 269-297): media montaña con final en alto (v10)

- `nClimbs = km > 170 ? 2 : 1` cotas intermedias (mismos rangos que hilly), cada una con su bajada `U(3,5)` km.
- Cota final `finalLen ∈ U(4; 7,5)`, `finalG ∈ U(5; 7,5)`, pegada a la meta sin nada detrás. El 7,5 y no 8 tiene comentario (l. 276-279): con el `normalize` proporcional un final de 8 km «podía cruzar la puerta y convertir una media montaña en reina. Medido: `hillyUphill 175 semilla-5`».
- `garantizaPuerto(…, null, 8.4)`: el puerto más largo se recorta a 8,4 km si se pasa.
- Medido: km tras la última cota 0 en las 1.500 (`alto` siempre); cota más larga 4,0 a 8,5 km; D+ 1.272 a 3.055 m. **2 de 1.500 salen clasificadas `reina`** (§5.1).

### 2.4 `classicSegments(km, seed)` (l. 473-490): clásica de muros

- `nWalls = km > 200 ? 5 : 4` (umbral de km).
- Muro: `len ∈ U(1; 2,5)` km, `g ∈ U(8, 12)` %. Sin bajadas modeladas: tras cada muro va relleno `bumpy` directamente.
- `fill = max(0,5·km, km − Σlen)`; los muros se reparten con `split(fill, nWalls+1)`, así que el último muro cae a ~1/5 o 1/6 del relleno de la meta: medido, **15,7 a 184 km** tras la última cota que cuente. El 184 es porque `finalKind.ts::lastClimbKm` solo cuenta puertos de ≥ 1,5 km (`CLIMB_MIN_KM`) y a veces el último de esa talla es el primero de la etapa. En 12 de 1.500 (semillas 91, 153, 202 en todos los km) **ningún muro llega a 1,5 km** y `finalKindOf` devuelve `null` («no es de montaña»), aunque `stageKindOf` la llame `clasica`.
- Medido: cota más larga 1,4 a 2,5 km; D+ 1.541 a 3.151 m; pendiente máxima 10,5 a 14,8 %.

### 2.5 `mountainSegments(km, seed, opts)` (l. 337-414): la reina (v64)

Orden de las tiradas, que importa porque una tirada de más desplaza todas las siguientes («todos los perfiles de montaña del calendario cambian», l. 316-317):

1. `midClimbs = km > 165 ? 3 : 2` (umbral de km, sin tirada).
2. `alto = rand() < ROUTE.queenHighDplusShare (0,6)`.
3. `dPlusTarget = opts.dPlusTarget ??` (si `alto`: `exp(U(ln 2600, ln 4600))`, **uniforme en logaritmo**; si no: `U(1200, 2500)`). La tirada se hace aunque `opts.dPlusTarget` venga dado.
4. `finalKind = opts.finalKind ?? sampleFinalKind(rand)` con `ROUTE.queenFinalMix = {alto 0,45, cima_cerca 0,20, valle_corto 0,25, valle_largo 0,10}` (l. 417-424). Si viene en `opts` **no se tira**, así que forzar el final SÍ cambia todas las tiradas posteriores.
5. `valleKm = valleyKmFor(finalKind)` (l. 330-335): `alto` 0; `cima_cerca` `U(1,5; 5)`; `valle_corto` `U(6, 20)`; `valle_largo` `U(22, 45)`.
6. Puertos intermedios `len ∈ U(6, 11)`, `g ∈ U(5,5; 7,5)`; puerto final `finalLen ∈ U(9, 15)`, `finalG ∈ U(7,5; 9,5)`.
7. **Persecución del objetivo**: `dPlusBase = Σ len·g·10` de todos los puertos; `escala = clamp(dPlusTarget / dPlusBase, 0,55, 1,8)`; se escala la LONGITUD de todos los puertos, nunca la pendiente (l. 365-374). `finalLenEsc = max(8,6, finalLen · escala)` (l. 387: el puerto final nunca baja de la puerta de reina).
8. `used = Σ midsEsc + 6·midClimbs + finalLenEsc + valleKm`; `fill = max(0,15·km, km − used)`; huecos con `split`; bajadas intermedias `U(5, 8)` km al 6 %.
9. Tras el puerto final, si `valleKm > 0,5`: un `descent` de `min(valleKm, U(4, 10))` km al 6 % y, si sobra más de 0,5 km, `rolling(llano, false)` (relleno NO bumpy, l. 406-411).
10. `garantizaPuerto(normalize(segs, km), 8.6, null)`.

Consecuencias medidas (1.500 reinas sin forzar):

| Medida                       | Valor                                                                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clasificación `stageKindOf`  | `reina/Summit finish` 660 · `reina/Mountains` 839 · **`media/Hills` 1**                                                                                    |
| `finalKindOf`                | alto 660 (44 %) · cima_cerca 235 (15,7 %) · valle_corto 435 (29 %) · valle_largo 170 (11,3 %)                                                              |
| Km tras la última cota       | 0 a 44,4                                                                                                                                                   |
| Cota más larga               | **8,4 a 26,7 km** (el comentario de `stageKind.ts` l. 53 aún dice «9,1 – 15,0», es anterior a la v64: con `escala` hasta 1,8 un final de 15 km llega a 27) |
| D+ total (puertos + relleno) | 1.908 a 5.906 m                                                                                                                                            |
| D+ solo de puertos (175 km)  | 1.525 a 4.647 m, media 2.840; el **59,0 %** de 3.000 reinas supera 2.600 m, que cuadra con el 60/40 de `ROUTE`                                             |

Nota sobre el objetivo: el target se compara con `dPlusOf` de los puertos SIN el relleno, pero `calendarQueens.ts::desnivelDe` (l. 55-59) mide el desnivel sumando los bloques `subida` muestreados, que incluyen las rampas del relleno que superen el umbral de bloque. Las bandas `BANDAS_DESNIVEL` (<1500, 1500-2500, 2500-3500, >3500) se leen sobre esa segunda medida, no sobre el target.

Los cuatro finales, forzados con `opts.finalKind` (1.500 cada uno): `alto` da tras-cota 0 y etiqueta `Summit finish` (3 de 1.500 caen a `media/Uphill finish`); `cima_cerca` 1,5 a 5 km (1 de 1.500 cae a `valle_corto` por el redondeo de la bajada); `valle_corto` 5,7 a 20,3 km (3 caen a `valle_largo`); `valle_largo` 21,4 a 45,7 km. Los cortes de `FINAL_KIND_CUTS` (0,5 / 5 / 20, `finalKind.ts` l. 30) y los rangos de `valleyKmFor` están alineados pero **sin holgura**: `normalize` puede estirar un valle de 20 a 20,3 y cambiarle la cubeta.

### 2.6 `mountainClassicSegments(km, seed)` (l. 443-470): clásica de montaña de un día (v40)

Como la reina pre-v64 (sin objetivo de desnivel ni finalKind): `midClimbs = km > 165 ? 3 : 2`, intermedios `U(6,11)` × `U(5,5; 7,5)`, y el último puerto **corto y empinado** `U(4, 8)` km × `U(7,5; 10)` % seguido de `runIn ∈ U(13, 22)` km, de los que baja `min(0,6·runIn, max(2, finalLen·finalG·10/55))` km y el resto es `rolling` llano. Solo `normalize`, **sin `garantizaPuerto`**. Medido: cota más larga 6,6 a 12,2 km, tras-cota 12,8 a 22,8 km (`valle_corto` 80 %, `valle_largo` 20 %), y **210 de 1.500 (14 %) salen clasificadas `media/Hills`**, porque ni el intermedio más largo alcanza 8,5 km ni el desnivel llega a 3.200 m. Con los kilometrajes de una clásica real (200 a 260 km) baja a 21 de 1.200. `stageKind.test.ts` no la importa (l. 3-10), así que nadie lo vigila. La etiqueta del calendario para ella es `reina / Mountains` (`calendar.ts` l. 143-152).

### 2.7 `cobblesSegments(km, seed)` (l. 493-507): pavé

`sectors = [3, 5, 4]` estrellas, **fijo**: siempre tres sectores en ese orden. Cada uno `U(2, 4)` km. `fill = max(0,5·km, km − Σ)`, huecos con `split(fill, 4)`, relleno NO bumpy. Los sectores son `{ km, tipo: 'paves', estrellas }` sin tramos (pendiente 0 por `DEFAULT_GRADIENT`). Medido: D+ 605 a 1.332 m (todo del relleno), sin puertos, `Cobbles` en las 1.500. El último sector cae a ~1/4 del relleno de la meta (unos 40 km): no hay «Carrefour de l'Arbre a 15 de meta».

---

## 3. `ROUTE` en `constants.ts` (l. 1151-1246), de arriba abajo

| Clave                                                                                                                                                                            | Valor                                                                                                                            | Quién la usa                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `queenDplusRange`                                                                                                                                                                | {2600, 4600} m, muestreado en log                                                                                                | `mountainSegments` (brazo alto)                                                                                                                                                                                   |
| `queenHighDplusShare`                                                                                                                                                            | 0,6                                                                                                                              | idem; el 40 % restante es la cola baja porque `calendarQueens.test.ts` «afirma en tres líneas duras que la banda de <1.500 m NO se queda vacía» (comentario l. 1163-1167)                                         |
| `queenLowDplusRange`                                                                                                                                                             | {1200, 2500} m lineal                                                                                                            | idem                                                                                                                                                                                                              |
| `queenFinalMix`                                                                                                                                                                  | alto 0,45 · cima_cerca 0,20 · valle_corto 0,25 · valle_largo 0,10                                                                | `sampleFinalKind`. El comentario (l. 1175-1189) cita la medida del paso 0 sobre 157 reinas: 56,7 / 2,5 / 35,0 / 5,7 %, y la correlación «el escalador gana el 72,3 % en final en alto y el 50,0 % en valle largo» |
| `ittMinStages` 3, `ittChanceShort` 0,6, `ittChanceWeek` 0,9, `ittWeekStages` 6, `ittAlwaysFlatStages` 4, `ittEarlierChance` 0,35, `ittSecondStages` 15, `ittSecondPosition` 0,35 |                                                                                                                                  | `calendar.ts::mixRoles` (composición, no perfil)                                                                                                                                                                  |
| `ittKmMin` 14 + `ittKmRange` 12; `ittLongStages` 10, `ittLongKmMin` 26 + `ittLongKmRange` 18                                                                                     | crono de 14-26 km, o 26-44 en vueltas de ≥10 etapas                                                                              | `mixKm`                                                                                                                                                                                                           |
| `lastDecisiveChance` {flat 0,3, hilly 0,55, mountain 0,85}, `grandTourStages` 15, `grandTourLastDecisiveFactor` 0,4, `lastSummitShare` {0, 0,35, 0,8}                            |                                                                                                                                  | `mixRoles` (última etapa)                                                                                                                                                                                         |
| `mixWeights`                                                                                                                                                                     | flat [0,58 0,27 0,10 0,05] · hilly [0,30 0,36 0,19 0,15] · mountain [0,16 0,26 0,18 0,40] para [llana, media, media-alto, reina] | `mixRoles`                                                                                                                                                                                                        |
| `selectiveMinFraction` {0,35, 0,55, 0,7}, `uphillFinishMinStages` 4                                                                                                              | garantías                                                                                                                        | `mixRoles`                                                                                                                                                                                                        |
| `kmFlat` [165,30], `kmHilly` [160,30], `kmUphill` [150,30], `kmSummit` [145,35], `lastStageKmFactor` 0,85                                                                        | km por papel                                                                                                                     | `mixKm`                                                                                                                                                                                                           |

De todo `ROUTE`, **solo cuatro claves entran en `profileGen.ts`** (las cuatro primeras); el resto es composición del calendario. Los rangos de longitud y pendiente de cotas, muros, bajadas y relleno (§2) están **escritos en el cuerpo de las funciones**, no en constantes: cambiar «una cota de media es de 3 a 7 km» es editar `profileGen.ts` l. 247.

`RELIEF` (l. 1115-1134) es solo para `featureProfile.ts`: `rollingMinGradient` 0,4 + `rollingGradientRange` 2,4, `rollingMinKm` 1,4 + `rollingKmRange` 2,2, y `rollingAmplitude` por terreno {flat 0,55, itt 0,55, cobbles 0,7, hilly 0,85, classic 1,0, mountain 1,15}, default 1,0. Comentario: con amplitud única «el desnivel reconstruido se iba un +49 % en Paris-Roubaix» (featureProfile.ts l. 153-156).

---

## 4. Qué mueve la semilla y qué no mueve NUNCA

Esta es la distinción que un diseñador necesita: la semilla mueve el **detalle**, la **arquitectura** la fijan el nombre de la función y el kilometraje.

**Arquitectura (no depende de la semilla):**

- El NÚMERO de dificultades: 0 en flat/itt/cobbles, 2 o 3 cotas en hilly (umbral 170 km), 1 o 2 + final en hillyUphill (170), 2 o 3 + final en mountain y mountainClassic (165), 4 o 5 muros en classic (200), exactamente 3 sectores [3,5,4] estrellas en cobbles. Medido: `hillySegments(170,'x')` tiene 2 puertos y `hillySegments(171,'x')` tiene 3.
- El ORDEN: relleno, dificultad, (bajada), relleno, …, y en hilly/classic/cobbles siempre relleno detrás de la última dificultad; en hillyUphill y mountain `alto` la meta está en la cima; en mountain no-alto y mountainClassic va bajada + llano. La bajada intermedia va SIEMPRE justo tras la cota, nunca hay dos cotas encadenadas sin relleno.
- Los RANGOS de cada dificultad (longitud, pendiente) y del relleno; la progresión «más dura arriba» de `climb`; la alternancia sube/baja del relleno por paridad.
- Que el final de hilly es a 26-68 km de la última cota (proporción `split`), que el de classic es a ≥16 km, que el de cobbles no tiene sector cerca de meta.
- Los mínimos duros: puerto final de reina ≥ 8,6 km (`finalLenEsc`, `garantizaPuerto`), puerto de hillyUphill ≤ 8,4, `escala ∈ [0,55; 1,8]`.
- Las pancartas: una `cima` al final de cada `puerto` y nada más (`calendar.ts::auto`). No hay metas volantes en ningún perfil generado.
- La longitud total: `normalize` la cuadra a `km` exacto (error medido 0,00).

**Detalle (lo mueve la semilla):**

- Las longitudes y pendientes concretas dentro de sus rangos, el ruido ±1,2 % rampa a rampa, cuántas rampas y de qué tamaño (vía `split`).
- Dónde caen exactamente las cotas (los `gaps` de `split`, cada uno entre ~0,54 y ~1,86 veces la media).
- Cuánto ondula el relleno (amplitud, chunk 3-6 km) y qué segmentos son `rompepiernas` (p 0,35 en bumpy).
- En la reina, y solo en la reina, **dos decisiones de arquitectura**: el brazo de desnivel (60/40) con su objetivo, y el `finalKind` con su valle. Son las únicas decisiones de forma que el generador sortea; en el resto de formas no hay ninguna.
- La categoría de las cimas (`deriveClimbCategory`, sample.ts l. 131-143: `score = Σ km·g²` con g > 2; cat4 40, cat3 120, cat2 300, cat1 600, HC 1000, constants.ts l. 3946-3947), que es consecuencia de la longitud y pendiente sorteadas.

**Ejemplo concreto, `mountainSegments(175, 'semilla-3')`** (medido): 6 segmentos de relleno, `puerto 4,8`, `descenso 5,1`, 8 de relleno, `puerto 3,6`, `descenso 6,1`, 10 de relleno, `puerto 6,0`, `descenso 6,3`, 7 de relleno, `puerto 9,1`, meta (`alto`). Es un brazo bajo con `escala` 0,55: los tres intermedios se quedaron en 3,6-6 km (sorteados en 6-11) y el final aguanta en 9,1 porque `max(8,6, …)` lo sujeta. Otra semilla del brazo alto tendrá los mismos tres intermedios + final, pero de 11 a 20 km cada uno. Lo que ninguna semilla dará: un solo puerto largo con 100 km de llano antes, dos puertos encadenados sin valle, una reina de 130 km con cinco puertos, o un final en alto de 6 km.

**Efecto del kilometraje con la misma semilla**: `mountainSegments(150,'x')` y `(151,'x')` tienen los mismos 3 puertos pero el relleno cambia de dibujo (`rolling` recalcula `n` con `km/chunk`), así que un km de diferencia redibuja el detalle entero. Esto es lo que hace que la semilla `${from}|${to}|${km}` de las ediciones sea estable solo mientras no cambie el km.

---

## 5. `stageKindOf` y `finalKindOf`: cómo se lee un recorrido

### 5.1 `stageKindOf(profile, timeTrial)` (`stageKind.ts` l. 71-98)

Orden de decisión, con sus umbrales (l. 60-64) y por qué:

1. `timeTrial` → `cri / ITT` (no se lee del relieve: es idéntico al de una llana).
2. Algún segmento `paves` → `clasica / Cobbles`.
3. Ningún `puerto` → `llana / Flat` (también con `segments: []`, test l. 106-108).
4. `summitFinish = último segmento es puerto`.
5. Si NO muere arriba y la cota más larga ≤ `WALL_MAX_KM` (3) → `clasica / Classic`. Si muere arriba ya no es de muros: «manda el final» (l. 86-87).
6. Si cota más larga ≥ `PASS_MIN_KM` (8,5) **o** metros de subida ≥ `QUEEN_MIN_CLIMB_METRES` (3.200) → `reina`, con etiqueta `Summit finish` o `Mountains` según `summitFinish`.
7. Si no → `media`, `Uphill finish` o `Hills`.

Los umbrales están justificados en l. 44-58 con una medida sobre 10.800 etapas: la cota más larga separa las familias sin solape (classic 1,4-2,5; hilly 3,3-7,0; hillyUphill 4,0-8,0; mountain 9,1-15,0), mientras el desnivel «se solapa DE PARTE A PARTE» (una media de 2.955 m contra una reina de 2.303) y por eso solo entra como red para recorridos reales. **La banda de mountain de ese comentario es anterior a la v64**: hoy va de 8,4 a 26,7 km (§2.5), y la de hillyUphill llega a 8,5.

`climbSize` (l. 36-42) mide la cota sumando los `tramos` con g > 0, no `segment.km`. `garantizaPuerto` en cambio fija `segment.km` y reescala los tramos redondeando cada uno a 0,1: la suma de tramos puede quedar 0,1 o 0,2 por debajo o por encima del segmento. Medido en el borde: `mountain 175 semilla-167` tiene segmento 8,6 y tramos 8,4 → `media/Hills`; `hillyUphill 155 semilla-149` y `215 semilla-209` tienen segmento 8,4 y tramos 8,5 → `reina/Summit finish`. Son 1 y 2 de 1.500; `stageKind.test.ts` corre 60 semillas (l. 21) y no los ve. El mismo mecanismo con `finalKind: 'alto'` forzado da 3 de 1.500 (`130 semilla-266`, `175 semilla-114`, `195 semilla-24`).

Consumidores: `index.ts` l. 75 lo exporta (lo usa la web para la ficha de una etapa corrida); `profileGen.ts` y `finalKind.ts` solo lo citan en comentarios.

### 5.2 `finalKindOf(profile)` (`finalKind.ts` l. 78-85) y auxiliares

- `lastClimbKm` (l. 46-57): primero la última pancarta `cima` de `banners` (con los perfiles generados siempre hay, por `auto`); si no hay, el final del último `puerto` de ≥ `CLIMB_MIN_KM` (1,5). `null` si nada: «una llana no tiene última cota, y eso es null y no cero» (test l. 61-71).
- `kmAfterLastClimb` = `Σ km − lastClimbKm`, y `finalKindOf` corta con `≤` en `FINAL_KIND_CUTS` {alto 0,5, cimaCerca 5, valleCorto 20}.
- Como `auto` redondea el km de la pancarta al entero (`Math.round(cum)`), la distancia tras la cota se mide contra un km redondeado: un final en alto real puede dar hasta 0,5 de valle y sigue siendo `alto` gracias al corte 0,5.
- Consumidor real: `sim/calendarQueens.ts` l. 73, que calcula `finalKind` y `kmTrasUltimaCota` sobre las ~157 reinas del calendario para el banco de §7.5.

---

## 6. `featureProfile.ts`: el perfil a partir de rasgos reales

`buildFeatureProfile(totalKm, features, seed, terrain?)` (l. 362-375) → `buildRelief` y luego, si hay `cobbles`, `applyCobbles` + `normalizeTotal`.

**Entrada (`StageFeatures`, l. 79-93)**: `climbs[]` {name, summitKm, lengthKm, avgGradient, category?}, `sprints[]` {name, km}, `cobbles[]` {name, startKm, lengthKm, stars}, `elevation[]` {km, elevM}. En `stageFeatures.ts` hay 26 carreras por etapas (de `race-france` l. 19 a `race-pune` l. 6225) con 142 etapas con `climbs`, 130 con `elevation` y 10 `null` (perfil por terreno); `classicRoutes.ts` aporta 15 clásicas más con 14 `climbs` y 6 `cobbles`, y ninguna `elevation`.

**Dos caminos en `buildRelief` (l. 378-442):**

A. Con `elevation` de ≥ 2 muestras → `profileFromElevation` (l. 317-350): ordena, recorta a [0, totalKm], funde muestras a < 0,02 km, ancla salida y meta, y hace **un segmento por par de muestras** con `g = Δalt / (Δkm·10)` y `tipo = terrainForGradient(g)` (l. 292-296: ≥ 3 % `puerto`, ≤ −3 % `descenso`, si no `llano`). Aquí la semilla **no interviene en nada**: es el único perfil del motor totalmente determinista sin azar. Las pancartas salen de `bannersFromFeatures` (l. 299-310) con el km redondeado y la categoría oficial o derivada de `climbRamps(lengthKm, avgGradient)`. Ojo: en este camino un `puerto` es cualquier tramo entre muestras a ≥ 3 %, así que la «cota más larga» que ve `stageKindOf` depende del espaciado de las muestras, no de la longitud publicada del puerto; y `lastClimbKm` usará la pancarta, que sí es la oficial.

B. Sin `elevation` → reconstrucción por puertos (l. 391-435): puertos ordenados por `summitKm`; para cada uno, el pie es `max(cursor, summitKm − lengthKm)`; en el hueco anterior, si venía de un puerto, primero un `descentSegment` de `min(0,65·hueco, max(1, prevGainM/55))` km que pierde el 85 % de lo subido con pendiente topada a −12 % (`MAX_DESCENT_GRADIENT`, l. 142, por el caso Crocetta-Zambla Alta a −29,6 %), y luego `rollingFill(gap, `${seed}:roll${idx}`, amplitud)`. El puerto se dibuja con `climbRamps` (l. 121-133): tres tramos 30/40/30 % con forma 0,8/1,3/0,85 de la media, corregido el último para que el desnivel sea exacto. Cola: bajada del 85 % si queda > 1,5 km y `rollingFill(tail, `${seed}:tail`)`. Sprints como `meta_volante` en su km redondeado. `normalizeTotal` (l. 179-188) estira o encoge **el último segmento** (como hacía `profileGen` antes de la v64; aquí el último es relleno de cola, salvo final en alto, donde es el puerto).

**`rollingFill` (l. 158-176)**: tramos de `1,4 + U·2,2` km a `±(0,4 + U·2,4)·amplitud` %, signo al 50 %. Aquí es donde la semilla pinta, y solo aquí: qué ondula la carretera entre dificultades. Sus semillas son `${seed}:roll${idx}` y `${seed}:tail`, derivadas de la de la etapa.

**`applyCobbles` (l. 231-289)**: sanea sectores (orden, recorte, sin solape, l. 196-207), parte los segmentos por las fronteras de cada sector y marca `paves` con sus `estrellas` conservando la pendiente; un trozo dentro de un `puerto` se queda puerto (l. 284: «un muro adoquinado ya está modelado como subida»).

Lo que `featureProfile` NO hace: no usa `ROUTE`; no garantiza clasificación (`stageKindOf` sobre un perfil real usa la red de 3.200 m para eso, l. 56-58 de stageKind.ts); no inventa sprints ni cotas; no toca la pendiente de los puertos publicados (solo su forma interna 0,8/1,3/0,85).

---

## 7. `altimetry.ts`: lo que se ve

`elevationProfile` (l. 16-39) integra `g·km·10` por tramo (o `defaultGradient` del tipo si no hay tramos: llano 0, rompepiernas 1,5, puerto 6, descenso −6, paves 0; sample.ts l. 18-24). `renderAltimetrySvg` (l. 94-180): SVG 720×200 con `MIN_ELEV_SPAN = 900` m (l. 101-104: «una etapa llana se vea llana y no como una montaña»); pancartas con categoría real si la trae el banner o `climbCategoryAt` (l. 42-52: la categoría del **segmento** que contiene el km, derivada de sus tramos); las cimas sin categoría se pintan con línea tenue y sin texto (l. 130-135, por el Amstel). Los banners se anclan al recorrido si se salen (l. 122-125, «el HC en el km 187 de una etapa de 185»). No tiene azar ni umbrales que afecten a la carrera.

---

## 8. Tabla final: qué varía con la semilla / qué es fijo, por forma

| Forma                            | Fijo por función o por km                                                                                                               | Lo mueve la semilla                                                                                                                       | Rangos medidos (1.500 etapas)                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `flat`                           | 0 puertos, todo `llano`, alternancia sube/baja                                                                                          | amplitud 0,8-1,8 %, chunks 3-6 km, `split`                                                                                                | D+ 661-1.413 m; 22-72 segmentos                                                             |
| `itt`                            | idéntica a flat                                                                                                                         | idéntica a flat                                                                                                                           | idéntico                                                                                    |
| `hilly`                          | 2 cotas (≤170 km) o 3; bajada solo entre cotas; relleno tras la última                                                                  | cota 3-7 km × 4,5-6,5 %, bajadas 3-5 km, posiciones, rompepiernas                                                                         | cota más larga 3,4-8,1; D+ 1.297-3.054; tras última cota 26-68 km (siempre `valle_largo`)   |
| `hillyUphill`                    | 1 (≤170) o 2 intermedias + final en alto; puerto ≤ 8,4 km                                                                               | intermedias como hilly, final 4-7,5 km × 5-7,5 %                                                                                          | cota 4,0-8,5; D+ 1.272-3.055; `alto` 100 %; 2/1.500 clasificadas reina                      |
| `mountain`                       | 2 (≤165) o 3 intermedios + final; final ≥ 8,6 km; `escala ∈ [0,55; 1,8]`; bajada 5-8 km tras cada intermedio; relleno de valle NO bumpy | brazo 60/40 y objetivo D+, `finalKind` (45/20/25/10) y valle, intermedios 6-11 km × 5,5-7,5 %, final 9-15 km × 7,5-9,5 % antes de escalar | cota 8,4-26,7; D+ 1.908-5.906; finales medidos 44/15,7/29/11,3 %; 1/1.500 clasificada media |
| `mountain alto` (forzado)        | como mountain, valle 0                                                                                                                  | como mountain menos el finalKind (una tirada menos)                                                                                       | tras cota 0; 3/1.500 clasificadas media                                                     |
| `mountain cima_cerca`            | valle 1,5-5 km                                                                                                                          | idem                                                                                                                                      | tras cota 1,5-5,0                                                                           |
| `mountain valle_corto`           | valle 6-20 km, bajada 4-10                                                                                                              | idem                                                                                                                                      | tras cota 5,7-20,3                                                                          |
| `mountain valle_largo`           | valle 22-45 km                                                                                                                          | idem                                                                                                                                      | tras cota 21,4-45,7                                                                         |
| `mountainClassic`                | 2 (≤165) o 3 intermedios + final corto 4-8 km × 7,5-10 % + runIn 13-22 km; sin `garantizaPuerto`                                        | longitudes, pendientes, runIn, bajada                                                                                                     | cota 6,6-12,2; D+ 1.903-4.133; tras cota 12,8-22,8; **14 % clasificadas media**             |
| `classic`                        | 4 muros (≤200 km) o 5, 1-2,5 km × 8-12 %, sin bajadas, relleno tras el último                                                           | muros y huecos                                                                                                                            | cota 1,4-2,5; D+ 1.541-3.151; tras cota 16-184 km; 12/1.500 sin cota ≥1,5 km                |
| `cobbles`                        | 3 sectores [3,5,4] estrellas, 2-4 km, sin puertos, relleno no bumpy                                                                     | longitud de cada sector y huecos                                                                                                          | D+ 605-1.332; último sector a ~40 km de meta                                                |
| `featureProfile` con `elevation` | todo                                                                                                                                    | nada                                                                                                                                      | depende del dato                                                                            |
| `featureProfile` sin `elevation` | puertos (km, longitud, pendiente, forma 30/40/30), bajadas del 85 % topadas a −12 %, sprints, pavé                                      | solo `rollingFill` entre dificultades (amplitud por `RELIEF`)                                                                             | depende del dato                                                                            |

---

## 9. Lo que un diseñador debería saber antes de tocar esto

1. **La variedad de arquitectura del calendario generado es de 8 moldes y 2 sorteos.** Todas las vueltas generadas se construyen con `flat / hilly / hillyUphill / mountain / itt`; las únicas decisiones de forma que se sortean viven en `mountainSegments` (brazo de desnivel y tipo de final). Todo lo demás que cambia entre etapas es detalle.
2. **Los rangos están en el código, no en `ROUTE`.** Solo cuatro claves de `ROUTE` llegan a `profileGen.ts`; las longitudes y pendientes de cotas, muros, bajadas, relleno y valle son literales en las funciones.
3. **El objetivo de desnivel de la reina es solo de puertos**; el relleno añade de media otros ~1.000 m que `calendarQueens` sí cuenta. La banda `<1500` de `BANDAS_DESNIVEL` se alcanza solo cuando el brazo bajo y el `escala` 0,55 coinciden.
4. **Tres bordes sin holgura**: 8,5 km entre `garantizaPuerto` (mide `segment.km`) y `climbSize` (mide tramos redondeados) produce 3 de 1.500 clasificaciones cruzadas; los cortes 5 y 20 km de `finalKindOf` contra los rangos 1,5-5 y 6-20 de `valleyKmFor` producen 4 de 6.000 cubetas cruzadas; `CLIMB_MIN_KM` 1,5 contra muros de 1-2,5 km deja 12 de 1.500 clásicas sin «última cota».
5. **`mountainClassicSegments` no está vigilada** por `stageKind.test.ts` y el 14 % de sus salidas (con los km de test) no se clasifica como reina aunque el calendario la etiquete así.
6. **El comentario de umbrales de `stageKind.ts` (l. 45-54) está desfasado** respecto a la v64: las reinas ya llegan a 26,7 km de cota y las medias con final en alto a 8,5.
7. **`ittSegments === flatSegments`** en la práctica; si algún día una crono necesita su propio relieve (una cronoescalada), no hay dónde ponerlo sin crear otra función.
8. **`auto()` no fabrica metas volantes** (calendar.ts l. 88-91, a propósito), así que ningún perfil generado tiene sprint intermedio; solo los reales con `sprints`.
