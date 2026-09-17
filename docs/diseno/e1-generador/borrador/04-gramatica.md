## 4. La gramática de motivos completa

Un motivo es una pieza de carretera con significado ciclista: un puerto, un muro, un sector de adoquín, un circuito, el final. La sección 3 dio los tipos (`MotifKind`, `MetaKind`, `Motif` en `packages/engine/src/routes/grammar/motifs.ts`); esta sección dice qué es cada uno de los 12 motivos y de los 9 finales, con qué rango nace (los números viven en `ARCH`, sección 12, y aquí se repiten con su porqué), cómo se rinde a `Segment[]` con las primitivas de `profileGen.ts`, qué lee el motor de lo rendido (mapa 03 §3 y §4) y qué caso real lo motiva (mapa 07). Todo en km y % redondeado a 0,1. El contrato con el motor no cambia: `Segment { km, tipo, tramos?, estrellas? }`, `Ramp { km, g }`, `Banner { km, tipo, cat? }` de `stage/types.ts` l. 12-48 (decisión 2 de la sección 2).

### 4.1 Las tres familias y la regla de tipado

Los 12 `MotifKind` se reparten en enlaces (`enlace`, `expuesto`, `tendida`, `descenso`), dificultades (`cota`, `puerto`, `muro`, `cadena`, `sector`, `racimo`, `circuito`) y el final (`meta`, siempre el último motivo de un esqueleto). Lo que separa un enlace de una dificultad no es cuánto sube sino qué ve el motor: `sampleProfile` (`stage/sample.ts` l. 68-125) reduce los cinco terrenos de autoría a cuatro bloques (`llano`, `subida`, `descenso`, `paves`, l. 32-44), y a partir de ahí toda la táctica cuenta por tipo de bloque, no por pendiente: `kmSubida = Σ [tipo === 'subida']·dx` (`simulate.ts` l. 1696), `breakAppeal = clamp(4·kmSubida/total + 0,35·[final en alto], 0, 1)` (l. 1697-1702), `gcTerrain = kmSubida/total ≥ 0,05` (l. 1710), `selectionFactor('llano') = 0` con cualquier `g` (l. 517). De ahí la regla de tipado de la gramática, que `validateMotif` y `renderMotif` hacen cumplir:

1. Todo lo que tiene que contar como subida en la táctica se emite como `puerto`: `cota`, `puerto`, `muro` (adoquinado o no: regla 5 de `docs/fuentes-recorridos.md`, un muro adoquinado va como `puerto` porque el terreno es único por bloque) y la `cotaFinal` de un `meta`.
2. Todo lo que sube pero no debe seleccionar se emite como `llano` con `tramos`: `enlace`, `expuesto`, `tendida`. La pendiente sí se lee (`gradientAt`, `sample.ts` l. 47-57): cuesta por `costBase = 0,24 + 0,135·g` (`physics.ts` l. 239-249) y frena por `vRef`, pero no suma `kmSubida`, no selecciona y admite abanico (`simulate.ts` l. 1215).
3. `sector` se emite como `paves` con `estrellas` y sin tramos; `descenso` como `descenso` con tramos.
4. Nunca se emite `rompepiernas`: `sample.ts` l. 100-101 lo colapsa a `g` 1,5 fijo e ignora sus tramos, así que hoy el generador escribe pendientes que la física no lee (mapa 03 §2, punto 4). `rolling` conserva el parámetro `pRompepiernas` solo para los builders legado del paso 1 (sección 15); la gramática pasa siempre 0.

Lo que el motor lee de cada tipo de segmento, y por tanto lo que cada motivo compra al rendirse así (mapa 03 §3 y §4, con línea):

| `Segment.tipo` | Bloque     | Lo que lee la física                                                                                                                                                                                                                                           | Lo que lee la táctica                                                                                                                                                                                                                                                                                                                                              |
| -------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `puerto`       | `subida`   | `climbWeight = clamp((g − 2)/6, 0,15, 1)` reparte MON frente a LLA (`physics.ts` l. 20-22); `useCol` si `g ≥ wallMinGradient` 8 (`simulate.ts` l. 434, `constants.ts` l. 1594); `draftMax` baja con `g` (l. 252-267); `loadExponent` sube hacia 1 (l. 102-106) | suma `kmSubida`, `breakAppeal`, `gcTerrain`, `shortMountain` (l. 1696-1719); deriva integrada con `selectionFactor` 1 (l. 474-518, 5094-5130); solo se sube «de verdad» a ≤ `climbRaceKmToGo` 30 km de meta (l. 2497, `constants.ts` l. 3521); la pancarta `cima` puntúa por `climbCategory` derivada de los tramos del segmento (`sample.ts` l. 119-120, 131-143) |
| `llano`        | `llano`    | `vRef` 42, `draftMax` 0,42, `costBase` por `g` (l. 239-249)                                                                                                                                                                                                    | `selectionFactor` 0 (l. 517); único terreno del abanico y del acordeón (l. 1215, 3898, 4340-4408)                                                                                                                                                                                                                                                                  |
| `descenso`     | `descenso` | `vRef` 55, `draftMax` 0,25, `costBase` con suelo 0,10 en `g ≤ −3`                                                                                                                                                                                              | selecciona solo con `g ≤ −4` y solo en su primer km, o entero a ≤ 25 km de meta (l. 2427-2428, 5083-5089); `crashLambda` 0,0018/km (`crash.ts` l. 25-36)                                                                                                                                                                                                           |
| `paves`        | `paves`    | `costBase = 0,55 + 0,06·estrellas`, `draftMax` 0,18, `vRef` 38                                                                                                                                                                                                 | `selectionFactor = 0,6·estrellas/3·(1 + 0,5·lluvia)`; peaje de colocación al entrar (l. 2611) con `pavesApproachKm` 2 (l. 1628-1636); `crashLambda` 0,0025/km; percances ×20 (l. 7094-7108)                                                                                                                                                                        |

La consecuencia de diseño que el mapa 03 §3 deja escrita y que la gramática explota: «la misma subida escrita como un tramo de 10 km al 6 % o como diez tramos de 1 km al 6 % da bloques idénticos»; lo que cambia el resultado es la distribución de `g` por bloque. Por eso los motivos se definen por `km` y `g` medios más una `forma`, y no por cómo se troceen.

### 4.2 Los enlaces: `enlace`, `expuesto`, `tendida`, `descenso`

**`enlace`** (`ARCH.motivo.enlace.km` [1; 60]). Es el relleno entre dificultades. Se rinde con `rolling(rand, km, amp, 0)`, donde `amp = min(geo.amplitud, ARCH.motivo.enlace.ampMax)` con `ampMax` 2,4: el relleno nunca alcanza el 3 % que `deriveFinishTerrain` lee como cota (`finishClimbMinGradient` 3, `constants.ts` l. 3977) ni cumple por accidente la regla del puerto. Hoy `rolling` en `bumpy` llega al 3,2 % (`profileGen.ts` l. 105) y una etapa `flat` de 130 a 215 km acumula de 661 a 1.413 m de desnivel solo con relleno (mapa 01 §1); con `amplitud` por zona (pólder [0,4; 0,9] contra los ~300 m de Brugge-De Panne en 200 km, mapa 07 §1.5; Macizo Central alta, porque sus «llanas» reales suman de 2.500 a 3.500 m, mapa 07 §3.14) el relleno pasa a ser un dato geográfico y no una constante de forma. Un `enlace` de nivel superior mide ≥ `ARCH.colocacion.enlaceMinimo` 1,5 km (dos dificultades nunca se tocan); dentro de una `cadena` el suelo es 1 km. Caso real: los 30 km de llano con viento tras el Kemmelberg en Gent-Wevelgem, los valles entre los puertos de Lombardía.

**`expuesto`** (km [5; 60], `ARCH.motivo.expuesto.amp` 1,0). Llano abierto: costa, pólder, desierto, meseta. Se rinde con `rolling(rand, km, 1,0, 0)`, amplitud fija, sin la ondulación de la zona. Solo lo pide un esqueleto (`et_llana_viento`, `ud_adoquin` en su primer tercio, sección 5) y solo donde `geo.viento ≥ 2`. El motor no distingue un `expuesto` de un `enlace` suave: el viento es una propiedad de la etapa, `vientoBruto = rng('viento')^2,2` con `windMin` 0,87, y muerde en cualquier bloque `llano` (`simulate.ts` l. 1148-1200, mapa 03 §5.1). Por eso `expuesto` vale para el dibujo y para la ficha (`arch.metadatos.viento`, texto «llano abierto» y nunca «abanicos», decisión 17) y no promete nada a la física. Caso real: Brugge-De Panne, la Crau en Paris-Nice, Tour of Qatar.

**`tendida`** (`ARCH.motivo.tendida.km` [5; 30], `.g` [1,5; 3,5]). Subida larga y suave que desgasta sin seleccionar. Se rinde como UN segmento `llano` con 2 a 4 tramos a `g ± 0,7`: tipado `llano` a propósito, no suma `kmSubida` (regla 2 de §4.1), pero cuesta `0,24 + 0,135·g` por bloque y baja `vRef`. Regla de posición, que es de la gramática y la colocación impone con la ventana del hueco (sección 8): una `tendida` termina como muy tarde a 20 km de meta, porque con `g` hasta 3,5 + 0,7 = 4,2 % sus bloques superan `finishClimbMinGradient` 3 y, dentro de `finishClimbSearchKm` 15 (`constants.ts` l. 3974), `deriveFinishTerrain` la leería como una cota de 10 km que tipa `alto` por `finishAltoMinMetres` 300 (l. 4008). Caso real: los 20-40 km al 3-4 % de Qinghai (mapa 07 §3.24), Mt Hamilton 30 km al 4 % (§3.22), Falls Creek 30 al 4 (§3.23); el Feldberg de Frankfurt (12 km al 4 %, §1.1) queda fuera por pendiente y sale como `puerto` de 9 km al 5 % en `centroeuropa`.

**`descenso`** (km [2; 25], `ARCH.motivo.descenso.g` [−8; −3]). Bajada explícita en rampas: `descent(rand, km, |g|)` (`profileGen.ts` l. 85-93, `max(2, round(km/3))` rampas a `−max(2, avg ± 1,5)`), así que con `g ≥ 3 el peor tramo es −9,5 y V15 (`g ≥ −14`) no se toca. Hay dos bajadas: la explícita, que un esqueleto pide como motivo (la bajada técnica del Poggio, la del Civiglio), y la canónica que la gramática pone sola tras cada `puerto`y cada`cota`que no sea la de meta, con`ARCH.motivo.descenso.kmPorDesnivel = { perdidaPorKm: 55, kmMin: 2, kmMax: 10 }`: `bajadaKm = clamp(km·g·10/55, 2, 10)`, la regla de `mountainClassicSegments`l. 467 (pierde el 85 % de lo subido a ~5,5 %), en vez del`U(5, 8)`fijo de hoy (decisión 11). Lo que el motor lee: selección solo con`g ≤ −4`y solo el primer km, o entera a ≤ 25 km de meta; un descenso al −3 % es coste barato y nada más (mapa 03 §10, punto 5). Un`descenso`explícito nunca es el último motivo: lo que hay tras la última cota lo describe el`meta` (§4.6).

### 4.3 Las dificultades simples: `cota`, `puerto`, `muro`, `sector`

| Motivo   | `km`       | `g`     | Rinde como                                                                                                                                          | Caso real (mapa 07)                                                                                                                                |
| -------- | ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cota`   | [2,5; 8,0] | [4; 7]  | `climb(rand, km, g, { gMax: 16, forma })`, tipo `puerto`                                                                                            | Cipressa 5,6 × 4,1; Jaizkibel 7,9 × 5,6; Rosier 4,4 × 5,9; Bocchetta 8,5 sale como 8,0                                                             |
| `puerto` | [9,0; 25]  | [5; 9]  | `climb(rand, km, g, { gMax: 16, forma })`; con `forma: 'irregular'` una rampa extra de `rampaIrregular` [0,3; 0,8] km al [11; 13] %                 | Alpe d'Huez 13,8 × 8,1; Tourmalet 17,1 × 7,3; Galibier 23 × 5,1; Angliru 12,5 × 9,8 (recortado a 9 por zona); Ghisallo 8,6 sale como 9,0           |
| `muro`   | [0,4; 3,0] | [8; 16] | `climb(rand, km, g, { gMax: 16, forma })` con 2 rampas como mínimo; `adoquin: true` sigue siendo `puerto`                                           | Paterberg 0,36 × 12,9; Koppenberg 0,6 × 11,6; Kwaremont 2,2 (adoquín); Sormano 1,9 × 15,8; Redoute 1,6 × 9,4                                       |
| `sector` | [0,3; 3,7] | 0       | `{ km, tipo: 'paves', estrellas }` sin tramos (como `cobblesSegments` l. 503); `firme: 'tierra'` se rinde `paves` con `estrellas` acotadas a [2; 3] | Arenberg 2,3 (5★), Mons-en-Pévèle 3,0 (5★), Carrefour de l'Arbre 2,1 (5★), Roubaix 0,3; Monte Sante Marie 11,5 de tierra se parte en tres sectores |

Las cifras de `ARCH.motivo.*` vienen de §B.3 del esqueleto y la sección 12 las apoya una a una; aquí lo que importa es el borde y la intención:

- **Por qué la `cota` acaba en 8,0 y el `puerto` empieza en 9,0.** `stageKindOf` (`stageKind.ts` l. 71-98) llama `reina` a un perfil con `climbSize ≥ PASS_MIN_KM` 8,5 (l. 62) y `media` al que se queda por debajo; `climbSize` (l. 36-42) suma los tramos con `g > 0`, y hoy `garantizaPuerto` fija `segment.km` y reescala tramos redondeando a 0,1, de donde salen 1 y 2 casos de 1.500 con segmento 8,6 y tramos 8,4 o al revés (mapa 01 §5.1). La gramática no se acerca al corte: la `cota` más larga posible mide 8,0 y el `puerto` más corto 9,0, medio kilómetro a cada lado, y `garantizaClase` (sección 8, decisión 10) mueve con `margenClaseKm` 0,3 lo que aun así roce el borde. El hueco [8,0; 9,0] se asume y se documenta: no existe una subida de 8,6 km en la gramática; el Ghisallo sale como puerto de 9,0 y la Bocchetta como cota de 8,0 (riesgo 6 de la sección 17).
- **Por qué el `muro` va al [8; 16] con `gMax` 16.** El motor decide «muro» bloque a bloque: `riderPerfil` usa COL en vez de MON cuando `block.g ≥ wallMinGradient` 8 (`simulate.ts` l. 434), sin mirar la longitud (`isWall` existe y no se llama, mapa 03 §2). El 8 es la frontera física de la gramática, y el 16 es el techo de `climb` con `gMax`: hoy el ruido ±1,2 y la progresión +1,6 sobre un muro sorteado al 12 % dan rampas medidas de hasta 14,8 % (mapa 01 §2.4); con `gMax` 16 las rampas del Koppenberg (máximo real 22 %) se quedan en lo que el motor distingue, porque `climbWeight` satura en 1 desde `g = 8` (`physics.ts` l. 20-22) y por encima solo sube `loadExponent`. Un berg al 6 % (Cauberg 5,8, Bosberg 6, Taaienberg 6,6) no cabe en `muro` ni en `cota` (por longitud): en la gramática sale como muro al 8 %, y ese hueco queda anotado en las dudas de esta sección para la pasada de coherencia. El techo 3,0 es `WALL_MAX_KM` (`stageKind.ts` l. 60): un perfil cuya cota más larga es ≤ 3 y no muere arriba es `clasica`, y así se garantiza V6 en `ud_muros`. V10 exige segmentos ≥ 0,5 km, así que el sorteo de `muro.km` usa [0,5; 3,0] como suelo efectivo y el 0,4 de `ARCH` queda como suelo de validación (un esqueleto congelado con un Paterberg de 0,4 se admite).
- **Por qué el `sector` no lleva tramos.** `sample.ts` l. 105 pone `estrellas` a 0 en todo terreno que no sea `paves`, y `paves` sin tramos muestrea `g` 0 (l. 18-24): el sector es llano por contrato. Las 20 filas `terrain: 'cobbles'` del calendario están todas en zonas con adoquín (mapa 07 §3, consecuencia 1), y el sterrato toscano ya se codifica como `paves` con estrellas en `classicRoutes.ts` l. 594: `firme: 'tierra'` conserva esa convención y la acota a 2-3★ porque la selección de un 5★ (`dropPavesStarsReference` 3, `constants.ts` l. 2776) casi dobla la de la referencia y la tierra de Strade no llega a lo de Arenberg.

**`forma`** vale para `cota`, `puerto` y `muro` y decide cómo `climb` reparte la pendiente alrededor de la media (§4.5): `regular` es el `climb` de hoy (progresión +1,6 hacia la cima y ruido ±1,2, `profileGen.ts` l. 78); `progresiva` pone el último 25 % de las rampas a `g + 3` y baja el resto para que la media siga siendo `g` (el `final_duro` de banco §3.3: Fedaia con los últimos 5 km al 12 %, Tre Cime con los últimos 4 al 12 %); `irregular` sube el ruido a ±2,5 y, solo en `puerto`, inserta una rampa de `ARCH.motivo.puerto.rampaIrregular` ([0,3; 0,8] km al [11; 13] %) en una posición sorteada que nunca es la primera rampa. Lo que compra `irregular` es lo que SPEC §6.17 exige y hoy ningún generador produce a propósito: un puerto irregular abre ≥ 1,5× la brecha del regular, porque tres bloques al 12 % dentro de un puerto al 6 % son tres bloques con `useCol`, `vRef` más bajo y `draftMax` menor (mapa 03 §3, último párrafo). `GeoSignature.puerto.forma` fija la forma por zona (`cantabrico` irregular, `alpes` regular, `dolomitas` progresiva, sección 6).

### 4.4 Las dificultades compuestas: `cadena`, `racimo`, `circuito`

Las tres llevan `hijos: Motif[]` y se rinden concatenando los hijos con enlaces internos que la gramática pone sola. Los hijos no son huecos del esqueleto: los sortea el motivo padre en el subflujo `mot|…` (sección 8) dentro de los rangos de §4.3 y de la firma de la zona, y `normalizeEnlaces` nunca los toca (solo cuadra con los enlaces de nivel superior, decisión 10).

**`cadena`**: de 3 a 8 hijos `muro` o `cota` (la cardinalidad la fija el hueco, sección 5) con un `enlace` de [1; 6] km entre cada dos, sin valle. Tras cada hijo `cota` va su bajada canónica (§4.2); tras cada hijo `muro` va una bajada de `clamp(km·g·10/55, 2, 10)` km, que con un muro de 0,6 km al 12 % es el mínimo de 2 km al −3 %: lo que se baja del Koppenberg antes del siguiente berg. Lo que la `cadena` compra: densidad. Hoy `classicSegments` (`profileGen.ts` l. 473-491) sortea 4 o 5 muros por etapa contra los 16-19 de la Ronde, los 33-34 de Amstel y los 24-26 de Brabantse (mapa 07 §1.3); `ud_muros` lleva de 2 a 4 cadenas con 3 a 8 muros cada una, de 6 a 32 en total. Cada muro ≥ 1,5 km recibe pancarta `cima` (§4.7); los de menos no, salvo el último de la etapa.

**`racimo`**: de `ARCH.motivo.racimo.sectores` [4; 10] hijos `sector` separados por `enlace` de `ARCH.motivo.racimo.separacion` [2; 6] km con amplitud 0,7 fija (asfalto entre sectores: impide reagrupar, mapa 07 §1.4). Longitud del racimo = Σ sectores + Σ separaciones, de 12 a 90 km. Hoy `cobblesSegments` (l. 493-508) mete 3 sectores de 2 a 4 km sobre llano, un décimo de la densidad de Roubaix (29-31 sectores, 54-57 km de adoquín), y la v40 midió que «127 de 176 llegaban en el mismo segundo» hasta que subió `dropPavesFactor`; `ud_adoquin` lleva de 3 a 6 racimos con 15 a 30 sectores en total y 3 de 5★. Lo que el motor lee de cada sector está en la tabla de §4.1 (`paves`): el peaje de colocación a la entrada de cada uno (`simulate.ts` l. 2611) hace que diez sectores separados por 3 km seleccionen mucho más que uno de 30 km.

**`circuito`**: una vuelta de `ARCH.motivo.circuito.kmVuelta` [8; 30] km repetida `ARCH.motivo.circuito.vueltas` [3; 18] veces. Los hijos de una vuelta pueden ser `muro`, `cota`, `sector`, `enlace`, `tendida` o `descenso`; nunca `puerto` (mapa 07 §1.1: un circuito de un día no tiene subida de más de 3 km, y el Feldberg va lejos de meta), nunca otra dificultad compuesta ni `meta`. Reglas de rendido, que son las que hacen reconocible un circuito:

1. Las `vueltas` copias de cada hijo se rinden con la MISMA semilla de detalle `dib|{raceId}|{i}|{season}|{slot}|i{intento}|hijo{h}`: la vuelta 7 tiene las mismas rampas que la 1. Test: `circuito repite literalmente el mismo Segment[] N veces`.
2. `kmVuelta` se recalcula a 0,1 antes de rendir para que `vueltas × kmVuelta` cuadre con lo que la colocación le dejó; el residuo (menor que `0,1 × vueltas`, como mucho 1,8 km) va al `enlace` exterior al circuito, que por eso todo esqueleto con `circuito` lleva siempre (≥ 1,5 km de salida hasta el circuito: la neutralizada de Québec, la salida de Montréal). Ninguna vuelta se corta.
3. El motivo `meta` va después de la última vuelta y describe los últimos km (un `repecho` en Québec, un `esprint` en Hamburgo, un `muro_meta` en `nc_ruta` cuando la zona tiene muro).
4. Pancartas: una `cima` por paso de cota ≥ `ARCH.pancarta.cimaMinKm` 1,5 km; los muros de circuito por debajo de 1,5 km no puntúan, salvo el último de la etapa (decisión 25). Con 16 vueltas por Camillien-Houde (1,8 km) son 16 pancartas, y cada una cuesta 2 de depósito a quien la disputa y abre 5 km de alivio (`constants.ts` l. 3944, 4131-4134): `routeCensus` mide `kmSubidaShare` y `breakAppealEstimado` por esqueleto con la banda informativa `ud_circuito` ≤ 0,20 (sección 13). El motor no tiene noción de vuelta: solo ve N pasos por la misma cota, y eso es exactamente lo que la selección por acumulación necesita.

`ud_criterium` (vuelta de 1,5 a 3 km × 20 a 40, peso 0 hasta D5) no cabe en los rangos de `circuito`; `validateMotif` lo admite solo cuando `ctx.skeleton === 'ud_criterium'` (§4.8).

### 4.5 Las primitivas de `profileGen.ts` con su firma nueva

Las primitivas ya existen y se conservan (`hashInt` l. 15-22, `routeRng` l. 30-44, `between` l. 47-49, `split` l. 52-65, `climb` l. 72-82, `descent` l. 85-93, `rolling` l. 100-122; mapa 01 §1); el paso 1 del plan las exporta con esta firma y `legacy.ts` demuestra con `golden.test.ts` que con los valores de hoy (`gMax` ∞, `amp` 1,8 o 3,2, `pRompepiernas` 0 o 0,35) dibujan bit a bit lo mismo. Lo único que cambia es lo que la gramática necesita y hoy está cerrado en el cuerpo de la función (decisión 11):

```ts
// packages/engine/src/routes/profileGen.ts (primitivas exportadas desde el paso 1)
export interface ClimbOptions {
  gMax?: number // techo de cada rampa tras ruido y progresión; ARCH.motivo.muro.gMax 16
  forma?: 'regular' | 'progresiva' | 'irregular' // regular = el climb de hoy (l. 72-82)
  rampaIrregular?: { km: [number, number]; g: [number, number] } // solo con forma 'irregular' y solo puerto
}
export function climb(
  rand: () => number,
  len: number,
  avg: number,
  opts: ClimbOptions = {},
): Segment
// n = max(2, round(len / 2,2)) rampas; g_i = clamp(avg + prog_i·1,6 + U(−1,2; 1,2), 1, gMax) en 'regular';
// 'progresiva': el último 25 % de las rampas a avg + 3 y el resto a avg − 1 (media ≈ avg);
// 'irregular': ruido ±2,5 y, si hay rampaIrregular, una rampa extra sorteada en [1; n−1] con su km y g.

export function descent(rand: () => number, len: number, avg: number): Segment // sin cambios: l. 85-93

export function rolling(rand: () => number, km: number, amp: number, pRompepiernas = 0): Segment[]
// amp numérica en vez de `bumpy` (1,8 llano, 3,2 bumpy: l. 105); la gramática pasa geo.amplitud ≤ 2,4 y pRompepiernas 0

export function bajadaCanonica(km: number, g: number): number // clamp(km·g·10/55, 2, 10)
```

`renderMotif` traduce un `Motif` a `Segment[]` con esas cuatro funciones y nada más; su firma, que la sección 8 usa desde `renderSkeleton`:

```ts
// packages/engine/src/routes/grammar/motifs.ts
export function renderMotif(
  m: Motif,
  rng: (sub: string) => () => number, // sub = '' para el motivo, `hijo${h}` para cada hijo
  geo: GeoSignature,
): Segment[]
```

`renderMotif` garantiza por construcción tres cosas que `verify` no tiene que comprobar por intento: `Σ tramos.km === segment.km` al 0,1 en todo `puerto` (la guarda de I-8; `split` ya cuadra el último trozo, l. 52-65), ningún tramo con `g > gMax` ni `g < 1` en subida, y ningún segmento `rompepiernas`.

### 4.6 El motivo `meta`: los nueve `MetaKind` contra `finish.ts`

El motivo `meta` es siempre el último del esqueleto y empieza en `km − meta.km`. Describe los últimos kilómetros enteros, no solo la línea: incluye la última cota (`cotaFinal`) cuando la hay y lo que queda hasta meta (bajada, llano). Cada `MetaKind` está definido por lo que el motor va a leer, en tres capas: `deriveFinishTerrain` (`stage/finish.ts` l. 71-135) mide en los bloques los últimos 15 km (`finishClimbSearchKm`) buscando la última racha ascendente de bloques con `g ≥ finishClimbMinGradient` 3, tolerando `finishClimbGapBlocks` 5 bloques de respiro (500 m) y descartando rachas de menos de `finishClimbMinKm` 0,4; `finishType` (l. 142-194) decide el tipo con ese `FinishTerrain`, y comprueba `alto` (l. 165-170) ANTES que `muro` (l. 180-188) y `muro` antes que `puncheur` (l. 191-193): «el primero que se cumple manda»; y `finalKindOf` (`finalKind.ts` l. 78-85) corta `kmAfterLastClimb` con `≤` en `FINAL_KIND_CUTS = { alto: 0,5, cimaCerca: 5, valleCorto: 20 }` (l. 30), midiendo la última cota por la última pancarta `cima` (l. 46-57). Las constantes son de `constants.ts` con su línea.

| `MetaKind`      | Cómo se rinde (últimos km)                                                                                                                                                                  | `finishType` esperado                                                                                                                              | `finalKindOf`                                  | Regla que lo garantiza                                                                                                                                                                                                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `esprint`       | `enlace` o `expuesto` de 5 a 15 km con `amp ≤ 1,5` en los últimos 5 km                                                                                                                      | `sprint_masivo` / `sprint_reducido`                                                                                                                | `null`, o el que dé la última cota de la etapa | media de `g` en los últimos 5 km (`finishWindowKm` l. 3971) < `finishDragGradient` 2,5 (l. 4017); ningún bloque ≥ 3 % en los últimos 15 km porque `ampMax` 2,4                                                                                                                                                                               |
| `repecho`       | `cotaFinal` de `ARCH.meta.repecho` { km [1; 2,9], g [4; 7] } rendida con `climb`, tipo `puerto`, muriendo en meta                                                                           | `puncheur`                                                                                                                                         | `alto`                                         | `climbKm < finishAltoMinKm` 3 (l. 3989) impide `alto`; `climbGradient < muroMinGradient` 8 (l. 4463) impide `muro`; `climbScore = km·g² ≥ finishPuncheurScore` 15 (l. 4013, `finish.ts` l. 130) con `climbKmToFinish ≤ finishPuncheurKmToGo` 5 da `puncheur`; `validateMotif` exige `km·g² ≥ 15` (en el suelo del rango, 1 km al 4 %, es 16) |
| `muro_meta`     | 2 km de aproximación (`ARCH.meta.muro.aproxKm`) con `rolling(amp ≤ 2,5)` (`aproxAmp`) + `cotaFinal` de `ARCH.meta.muro` { km [0,5; 2,2], g [8; 16] } con `climb(gMax 16)`, muriendo en meta | `muro` si `km ≤ 1,0`; `puncheur` si `km ∈ (1,0; 2,2]`                                                                                              | `alto`                                         | `climbKm ≤ muroMaxKm` 1 y `climbGradient ≥ muroMinGradient` 8 (l. 4462-4463) con `climbKmToFinish ≤ finishSummitKm` 0,6 (l. 3986) dan `muro`; por encima de 1,0 el mismo `finish.ts` dice del Muro de Huy «1,4 km al 8,5 % en la línea, sale puncheur y eso es correcto» (comentario l. 147-148); nunca `alto` porque `climbKm < 3`          |
| `alto_corto`    | `cotaFinal` de `ARCH.meta.altoCorto` { km [3; 7], g [6; 11] }, tipo `puerto`, muriendo en meta                                                                                              | `alto`                                                                                                                                             | `alto`                                         | `climbKm ≥ 3` y `climbGradient ≥ finishAltoMinGradient` 4 (l. 4007) y `climbKmToFinish ≤ 0,6`                                                                                                                                                                                                                                                |
| `alto_largo`    | `cotaFinal` de `ARCH.meta.altoLargo` { km [9; 22], g [6; 9], gMaxSiMasDe17: 7 }, tipo `puerto`, muriendo en meta                                                                            | `alto`                                                                                                                                             | `alto`                                         | como `alto_corto`; además `climbSize ≥ 9,0 > PASS_MIN_KM` 8,5 garantiza `reina` (V6); por encima de 17 km la media se acota a 7 (Loze 28,1 × 6, Bondone 21,4 × 6,7: «siempre con pendiente media inferior al 7 %», mapa 07 §4.3)                                                                                                             |
| `cima_cerca`    | `cotaFinal` (cota o puerto; en un día, `ARCH.meta.unDiaUltimaCota` { km [1,3; 4,2], g [7; 11] }) + `descent` + `rolling` que suman `ARCH.meta.cimaCerca.valle` [1,2; 4,3] km                | `descenso` si la bajada ocupa ≥ `finishDescentFraction` 0,5 de los últimos 3 km (l. 4019-4020); si no, `puncheur` (cota a ≤ 5 km con `score ≥ 15`) | `cima_cerca`                                   | `kmAfterLastClimb ∈ (0,5; 5]`, con holgura 0,7 a cada lado sobre los cortes 0,5 y 5                                                                                                                                                                                                                                                          |
| `descenso_meta` | `cotaFinal` + `descent(4 a 12 km)` + `rolling(0 a 8 km)` que suman `ARCH.meta.descensoMeta.valle` [5,7; 19,3]                                                                               | `descenso` o `sprint_reducido`                                                                                                                     | `valle_corto`                                  | `kmAfterLastClimb ∈ (5; 20]` con holgura 0,7                                                                                                                                                                                                                                                                                                 |
| `valle`         | `cotaFinal` + `descent(4 a 10)` + `rolling(12 a 40)` que suman `ARCH.meta.valle.valle` [20,7; 45]                                                                                           | `sprint_masivo` / `sprint_reducido`                                                                                                                | `valle_largo`                                  | `kmAfterLastClimb > 20` con holgura 0,7; el `rolling` final con `amp ≤ 2,4` no crea cota                                                                                                                                                                                                                                                     |
| `sector_meta`   | `sector` de 1 a 2,5 km + `rolling` de `ARCH.meta.sectorMeta.aMeta` [1; 8] km                                                                                                                | `pave`                                                                                                                                             | `null` (o el de la última cota, si la hubo)    | fracción de `paves` en los últimos 30 km (`finishPaveKm` l. 4024) ≥ `finishPaveFraction` 0,1 (l. 4025): 3 km de sector sobre 30 lo cumplen; Carrefour de l'Arbre a 17 y Roubaix a 1,1                                                                                                                                                        |

Tres decisiones de esta tabla se argumentan aparte porque son las que resuelven objeciones de los jueces.

**La aproximación al muro está diseñada contra `deriveFinishTerrain`, no comprobada después.** Un muro de 0,8 km al 12 % precedido de relleno `bumpy` (tramos de hasta 3,2 %, `profileGen.ts` l. 105) puede salir con `climbKm > 1` porque la racha ascendente funde todo bloque `≥ 3 %` tolerando 5 bloques de respiro, y entonces tipa `puncheur` o `alto` (juicio del motor §1, hecho 1). De ahí `ARCH.meta.muro.aproxKm` 2 y `aproxAmp` 2,5: los 2 km previos al muro se rinden con `rolling(rand, 2, 2,5, 0)`, cuyo tramo más empinado es 2,5 < 3, así que la racha del muro empieza donde empieza el muro; y 2 km son 20 bloques, cuatro veces `finishClimbGapBlocks`, así que un repecho anterior (la `cota`×1-3 de `ud_muro_final`, o el paso previo por el mismo muro en un circuito: Huy ×3 a 60, 30 y 0 km) no se pega a la racha final. Es lo que hace que «`muro_meta` → `finishType` `muro` en 300 de 300 con ≤ 1,0 km» sea un test del paso 3 y no un reintento por intento (riesgo 7 de ejecutabilidad, sección 17).

**`muro_meta` mide [0,5; 2,2] y declara `puncheur` por encima de 1,0.** El [0,5; 1,0] original dejaba sin nombre todo final en alto entre 1,0 y 3,0 km: San Luca 2,1 × 10,8 (Emilia), el Muro de Huy 1,3 × 9,6, Nokereberg, Santa Caterina. Con el rango ampliado (decisión 7) existen, y la tabla dice la verdad sobre el motor: por encima de `muroMaxKm` 1 `finishType` dirá `puncheur`, y eso es lo que `finish.ts` quiere del Muro de Huy. `finalKindOf` dice `alto` en los dos casos (0 km tras la pancarta), y `stageKindOf` dice `media / Uphill finish` (último segmento `puerto`, cota más larga ≤ 8). V11 se mide en el calendario y no por etapa: `muro` ≥ 1 % y `puncheur` ≥ 8 % de las etapas en línea generadas (hoy `muro` 0 de 1.075, `alto` 111, `puncheur` 51: juicio del motor §1), y V16 comprueba en `routeCensus` que cada `MetaKind` produce el `finishType` que esta tabla promete, con `sampleProfile` una sola vez por etapa y nunca dentro de `generateStage` (decisión 4).

**Las holguras son 0,7 y no 0,5.** `emitirPancartas` escribe la `cima` al km acumulado redondeado al entero, como `auto()` (`calendar.ts` l. 98) y por la misma razón (las pancartas reales vienen al km entero): la distancia tras la cota se mide contra un km que puede desviarse hasta 0,5 del real (mapa 01 §5.2). Con una holgura de 0,5 un `cima_cerca` de valle 1,0 podía quedar en 0,5 y ser `alto`; con 0,7 (decisión 10, `ARCH.veto.margenValleKm`) los 0,5 del redondeo de la pancarta y los 0,2 del redondeo a 0,1 de tramos y `normalizeEnlaces` caben a la vez. El precio se declara: no existe un `cima_cerca` que corone entre 4,3 y 5,7 km ni un `descenso_meta` entre 19,3 y 20,7; San Fermo della Battaglia a 5,5 km de Como sale a 4,3 o a 5,7. Los rangos de arquitectura §3.2 ([1,0; 4,5], [6; 19], [21; 45]) se sustituyen por los de §B.3.

Sobre la `cotaFinal` de un día: `ARCH.meta.unDiaUltimaCota` { km [1,3; 4,2], g [7; 11], aMeta [3; 17] } es el caso v40 escrito en positivo (mapa 07 §4.3: en el WorldTour de un día la última subida mide de 0,4 a 4,2 km y corona de 0 a 17 km de meta; Civiglio 4,2 × 9,7 a 17, Roche-aux-Faucons 1,3 × 11 a 13,5, Murgil 2,1 × 10 a 7). Cuando `format === 'un-dia'` y el `MetaKind` es `cima_cerca` o `descenso_meta`, la `cotaFinal` se sortea en ese rango y no en el de `cota` o `puerto`; el valle queda acotado a [3; 17] por intersección con el rango del `MetaKind`. La regla que lo veta si no se cumple es V5 (sección 9); la que hace que se cumpla por construcción es esta.

### 4.7 Cómo se cierran los tres bordes sin holgura

El diagnóstico (sección 1) midió tres bordes donde el generador de hoy cae del lado equivocado por décimas: 3 de 1.500 en `PASS_MIN_KM` 8,5, 4 de 6.000 en los cortes 5 y 20 de `FINAL_KIND_CUTS`, y 12 de 1.500 en `CLIMB_MIN_KM` 1,5. La gramática cierra los tres sin tocar `stageKind.ts` ni `finalKind.ts` (decisión 26):

| Borde                                           | Hoy                                                                                                                                   | En la gramática                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PASS_MIN_KM` 8,5 (`stageKind.ts` l. 62)        | `garantizaPuerto` fija `segment.km` y `climbSize` suma tramos: 8,6 contra 8,4 (mapa 01 §5.1)                                          | `cota.km ≤ 8,0` y `puerto.km ≥ 9,0` (§4.3); `renderMotif` garantiza `Σ tramos === km`; `garantizaClase` con `margenClaseKm` 0,3 como red (sección 8); `alto_largo` nace en 9                                                                                                                                |
| `FINAL_KIND_CUTS` 5 y 20 (`finalKind.ts` l. 30) | `runIn` sorteado en [1,5; 5], [6; 20], [22; 45] (`profileGen.ts` l. 332-334) contra una pancarta redondeada al km                     | valles [1,2; 4,3], [5,7; 19,3], [20,7; 45] (§4.6): holgura 0,7 sobre cada corte                                                                                                                                                                                                                             |
| `CLIMB_MIN_KM` 1,5 (`finalKind.ts` l. 46-57)    | en 12 de 1.500 clásicas ningún muro llega a 1,5 km y `finalKindOf` devuelve `null` aunque `stageKindOf` diga `clasica` (mapa 01 §2.4) | `emitirPancartas` pone `cima` en todo `puerto` con `climbSize ≥ ARCH.pancarta.cimaMinKm` 1,5 y SIEMPRE en el último `puerto` de la etapa, mida lo que mida (decisión 25); `lastClimbKm` mira primero las pancartas (l. 47-48), así que un `muro_meta` de 0,5 km es la última cota y `finalKindOf` da `alto` |

La segunda cláusula de la tercera fila es la que corrige el `pancartaCimaMinKm` de geografía §4.5: con un mínimo de 1,5 a secas, la última pancarta de una etapa con `muro_meta` de 0,8 km era el `puerto` anterior, quizá a 30 km, y `finalKindOf` decía `valle_largo` de un final en alto (juicio del motor §1, hecho sobre `auto()`).

### 4.8 `validateMotif` y sus tests

`validateMotif` es un predicado puro sobre un `Motif` aislado: no conoce la posición ni la etapa (eso es `verify`, sección 9) y no sortea nada. Lo llaman la instanciación de motivos (sección 8) antes de rendir, `skeletons.test.ts` sobre las 32 plantillas canónicas y sus alternativas, y `frozenSkeletons.test.ts` sobre los tres esqueletos congelados.

```ts
// packages/engine/src/routes/grammar/motifs.ts
export type ValidacionMotivo = { ok: true } | { ok: false; regla: string; detalle: string }
export function validateMotif(m: Motif, ctx: { skeleton?: SkeletonId } = {}): ValidacionMotivo
```

Reglas, en el orden en que se comprueban (la primera que falla es la que se devuelve como `regla`):

1. `km` y `g` redondeados a 0,1 y dentro del rango de `ARCH.motivo.<kind>` (`enlace` [1; 60]; `expuesto` [5; 60]; `tendida` [5; 30] × [1,5; 3,5]; `descenso` [2; 25] × [−8; −3]; `cota` [2,5; 8,0] × [4; 7]; `puerto` [9,0; 25] × [5; 9]; `muro` [0,4; 3,0] × [8; 16]; `sector` [0,3; 3,7]). Un `puerto` de 8,6 no existe: `regla: 'puerto.km'`.
2. Campos por tipo: `g` solo en dificultades simples, `tendida` y `cotaFinal`; `forma` solo en `cota`, `puerto`, `muro`; `adoquin` solo en `muro` y `sector`; `firme` y `estrellas` (entero en [1; 5]; con `firme: 'tierra'`, en [2; 3]) solo en `sector`; `hijos` solo en `cadena`, `racimo`, `circuito`; `vueltas` solo en `circuito`; `meta` y `cotaFinal` solo en `meta`. Un campo fuera de sitio es `regla: 'campo.<nombre>'`.
3. `cadena`: de 3 a 8 hijos, todos `muro` o `cota`, cada uno válido. `racimo`: de 4 a 10 hijos `sector` válidos. `circuito`: `km` (la vuelta) en [8; 30], `vueltas` entero en [3; 18], hijos válidos de tipo `muro`, `cota`, `sector`, `enlace`, `tendida` o `descenso`, y `Σ hijos.km ≤ km` (el resto de la vuelta es enlace implícito). Con `ctx.skeleton === 'ud_criterium'`, la vuelta admite [1,5; 3] y las vueltas [20; 40].
4. `meta`: `meta` presente; `cotaFinal` obligatoria en `repecho`, `muro_meta`, `alto_corto`, `alto_largo`, `cima_cerca`, `descenso_meta`, `valle`, y prohibida en `esprint` y `sector_meta`; `cotaFinal` dentro del rango de su `MetaKind` (tabla de §4.6), con `km·g² ≥ 15` en `repecho` y `g ≤ 7` si `km > 17` en `alto_largo`; `km` del motivo ≥ `cotaFinal.km` + el valle mínimo del `MetaKind`.
5. `firma` y `nombre` son libres; `nombre`, si viene, no está vacío.

Los tests del paso 3 (`grammar/motifs.test.ts`), con las aserciones que el plan de la sección 15 exige, en esta forma:

```ts
import { describe, it, expect } from 'vitest'
import { validateMotif, renderMotif } from './motifs'
import { routeRng } from '../profileGen'
import { ZONAS } from './geo'
import { ARCH } from '../../constants'
import { sampleProfile } from '../../stage/sample'
import { deriveFinishTerrain, finishType } from '../../stage/finish'

const rngDe = (base: string) => (sub: string) => routeRng(sub ? `${base}|${sub}` : base)
const semillas = Array.from({ length: 300 }, (_, i) => `motifs|${i}`)

describe('validateMotif', () => {
  it('el hueco [8,0; 9,0] no existe: ni cota ni puerto de 8,6 km', () => {
    expect(validateMotif({ kind: 'cota', km: 8.6, g: 6.2 })).toMatchObject({
      ok: false,
      regla: 'cota.km',
    })
    expect(validateMotif({ kind: 'puerto', km: 8.6, g: 6.2 })).toMatchObject({
      ok: false,
      regla: 'puerto.km',
    })
    expect(validateMotif({ kind: 'puerto', km: 9.0, g: 6.2 })).toEqual({ ok: true })
  })
  it('un circuito no lleva puertos dentro y un critérium solo existe como ud_criterium', () => {
    const c = {
      kind: 'circuito',
      km: 12.6,
      vueltas: 16,
      hijos: [{ kind: 'puerto', km: 9, g: 6 }],
    } as const
    expect(validateMotif(c)).toMatchObject({ ok: false, regla: 'circuito.hijos' })
    const crit = { kind: 'circuito', km: 2.3, vueltas: 20, hijos: [] } as const
    expect(validateMotif(crit).ok).toBe(false)
    expect(validateMotif(crit, { skeleton: 'ud_criterium' })).toEqual({ ok: true })
  })
  it('una meta muro_meta de 2,3 km no es muro_meta; un repecho de 1 km al 3,5 % no puntúa como puncheur', () => {
    expect(
      validateMotif({ kind: 'meta', km: 4.3, meta: 'muro_meta', cotaFinal: { km: 2.3, g: 10 } }).ok,
    ).toBe(false)
    expect(
      validateMotif({ kind: 'meta', km: 3, meta: 'repecho', cotaFinal: { km: 1, g: 3.5 } }).ok,
    ).toBe(false)
  })
})

describe('renderMotif', () => {
  const geo = ZONAS.flandes
  it('muro con gMax: ninguna rampa por encima del 16 %, media a ± 1,0 del g pedido, tipo puerto', () => {
    for (const s of semillas) {
      const [seg] = renderMotif({ kind: 'muro', km: 1.2, g: 14 }, rngDe(s), geo)
      expect(seg.tipo).toBe('puerto')
      expect(Math.max(...seg.tramos!.map((t) => t.g))).toBeLessThanOrEqual(ARCH.motivo.muro.gMax)
      const media = seg.tramos!.reduce((a, t) => a + t.km * t.g, 0) / seg.km
      expect(Math.abs(media - 14)).toBeLessThanOrEqual(1.0)
      expect(seg.tramos!.reduce((a, t) => a + t.km, 0)).toBeCloseTo(seg.km, 1)
    }
  })
  it('tendida es UN llano con 2 a 4 tramos y no suma kmSubida', () => {
    const segs = renderMotif({ kind: 'tendida', km: 18, g: 2.5 }, rngDe('t'), ZONAS.meseta)
    expect(segs).toHaveLength(1)
    expect(segs[0]!.tipo).toBe('llano')
    const bloques = sampleProfile({ segments: segs })
    expect(bloques.filter((b) => b.tipo === 'subida')).toHaveLength(0)
  })
  it('un enlace nunca produce un bloque al 3 % o más, en ninguna zona', () => {
    for (const zona of Object.values(ZONAS)) {
      const segs = renderMotif({ kind: 'enlace', km: 40 }, rngDe(`e|${zona.zona}`), zona)
      for (const b of sampleProfile({ segments: segs })) expect(b.g).toBeLessThan(3)
    }
  })
  it('circuito: las vueltas repiten literalmente los mismos tramos', () => {
    const vuelta = {
      kind: 'circuito',
      km: 12.3,
      vueltas: 17,
      hijos: [
        { kind: 'muro', km: 1.8, g: 8 },
        { kind: 'muro', km: 0.8, g: 6 },
      ],
    } as const
    const segs = renderMotif(vuelta, rngDe('mtl'), ZONAS.norteamerica)
    const porVuelta = segs.length / 17
    expect(Number.isInteger(porVuelta)).toBe(true)
    expect(segs.slice(porVuelta * 6, porVuelta * 7)).toEqual(segs.slice(0, porVuelta))
  })
  it('muro_meta ≤ 1,0 km tipa muro en 300 de 300; (1,0; 2,2] tipa puncheur en 300 de 300', () => {
    const tipa = (km: number, s: string) => {
      const previo = renderMotif({ kind: 'cota', km: 4, g: 6 }, rngDe(`${s}|c`), ZONAS.ardenas) // un repecho antes, como en ud_muro_final
      const meta = renderMotif(
        { kind: 'meta', km: km + 2, meta: 'muro_meta', cotaFinal: { km, g: 11 } },
        rngDe(s),
        ZONAS.ardenas,
      )
      const bloques = sampleProfile({
        segments: [
          ...renderMotif({ kind: 'enlace', km: 20 }, rngDe(`${s}|e`), ZONAS.ardenas),
          ...previo,
          ...meta,
        ],
      })
      return finishType(deriveFinishTerrain(bloques), 50)
    }
    expect(semillas.map((s) => tipa(0.9, s)).every((t) => t === 'muro')).toBe(true)
    expect(semillas.map((s) => tipa(1.8, s)).every((t) => t === 'puncheur')).toBe(true)
  })
  it('nunca sale rompepiernas y ningún segmento mide menos de 0,5 km', () => {
    for (const s of semillas) {
      const segs = renderMotif(
        {
          kind: 'cadena',
          km: 0,
          hijos: [
            { kind: 'muro', km: 0.6, g: 12 },
            { kind: 'cota', km: 3, g: 5 },
            { kind: 'muro', km: 1.1, g: 9 },
          ],
        },
        rngDe(s),
        ZONAS.flandes,
      )
      for (const seg of segs) {
        expect(seg.tipo).not.toBe('rompepiernas')
        expect(seg.km).toBeGreaterThanOrEqual(0.5)
      }
    }
  })
})
```

Este fichero es el único test de la gramática que llama a `sampleProfile`, `deriveFinishTerrain` y `finishType`, y lo hace para sellar la promesa de la tabla de §4.6 sobre motivos aislados (300 semillas por caso, coste de milisegundos); `verify` no los llama nunca (decisión 4). Para `cadena` la longitud `km` del motivo es la que resulta de rendir (hijos + enlaces + bajadas), así que `validateMotif` ignora `km` en `cadena` y `racimo` y `renderMotif` la devuelve sumando.

### 4.9 Lo que la gramática no produce

Lista cerrada, para que ni un esqueleto ni un test la den por supuesta:

- **Ningún `rompepiernas`** (decisión 2). Lo que hoy es «media montaña bumpy» con p 0,35 de `rompepiernas` (`profileGen.ts` l. 119) es un `enlace` con `amplitud` de zona, y lo que hoy es un repecho de arrastre es una `tendida` o un `repecho`.
- **Ninguna `meta_volante`.** La regla de la casa de `calendar.ts` l. 89-91 se mantiene: `emitirPancartas` solo escribe `cima`; cada meta volante costaría 2 de depósito por contendiente y 5 km de alivio (mapa 03 §10, punto 8), y eso es una decisión del dueño (D4, sección 18: no).
- **Ninguna altitud, viento, costa ni meseta como física.** No hay altitud en `Segment` (`types.ts` l. 12-48; mapa 03 §5.2: «el perfil no puede decir “este puerto está a 2.000 m y hace frío”») y el viento no se coloca. `GeoSignature.altitud` y `.viento` viajan en `arch.metadatos` y en la ficha (decisión 17); V4 los usa para vetar un `alto_largo` donde `finalesAlto !== 'largo'` y un `puerto` ≥ 15 km fuera de `altitud ∈ {alta, altiplano, media}`.
- **Ninguna subida entre 8,0 y 9,0 km**, ni cota intermedia de menos de 2,5 km a menos del 8 %, ni final en alto de más de 22 km ni de menos de 0,5: son los huecos que los rangos de `ARCH` dejan y que la sección 17 lista como riesgo 6.
- **Ningún segmento de menos de 0,5 km** (V10; el mismo umbral con que `rolling` descarta un hueco, l. 101) ni **ningún tramo con `g > 20` o `g < −14`**, ni bloque `subida` con `g < 1` (V15; `climb` ya lo garantiza por abajo con `Math.max(1, …)`, l. 78, y `gMax` por arriba).
- **Ningún `puerto` dentro de un `circuito`, ningún `circuito` dentro de otro, ninguna `meta` que no sea el último motivo.**
- **Ningún `sector` donde `geo.adoquin < 2`, ningún muro adoquinado donde `adoquin === 0`, ningún `firme: 'tierra'` donde `!geo.sterrato`, ningún `puerto` donde `geo.puerto === null`** (V1 a V3, sección 9): la gramática es la misma en Flandes y en los Alpes; lo que cambia es lo que la firma de la zona admite (sección 6), y `null` significa «aquí no existe».
- **Nada que dependa de `sampleProfile` para existir.** Un motivo se valida y se rinde con `routes/` y `profileGen.ts`; lo que el motor haga con él se mide una vez, en `routeCensus` y en `motifs.test.ts`, y si una recalibración de `STAGE.finish*` o de `physics.ts` cambia esa medida, cambian las bandas del censo y no los perfiles.
