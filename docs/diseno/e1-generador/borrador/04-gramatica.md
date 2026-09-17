## 4. La gramática de motivos completa

Un motivo es una pieza de carretera con significado ciclista: un puerto, un muro, un sector de adoquín, el llano que los separa, la meta. La sección 3 dio los tipos (`Motif`, `MotifKind`, `MetaKind` en `packages/engine/src/routes/grammar/motifs.ts`); esta sección dice, motivo a motivo, cuatro cosas que un implementador necesita y que ninguna propuesta escribió juntas: el rango (en `ARCH.motivo` y `ARCH.meta`, sección 12), cómo se rinde a `Segment[]` con las primitivas de `profileGen.ts`, qué lee de él el motor (mapa 03 §3 y §4, con línea) y qué carrera real lo motiva (mapa 07 §1 y §4.3). Cierra con `validateMotif` y `renderMotif` y sus tests, con los tres bordes sin holgura del diagnóstico (sección 1) y con la lista de lo que la gramática no produce nunca. Cómo se colocan y se cuadran los motivos es la sección 8; qué los veta, la 9.

Doce `MotifKind` en tres familias: cuatro enlaces (`enlace`, `expuesto`, `tendida`, `descenso`), siete dificultades (`cota`, `puerto`, `muro`, `cadena`, `sector`, `racimo`, `circuito`) y `meta`, que siempre es el último motivo del esqueleto y lleva uno de los nueve `MetaKind`.

### 4.1 Las primitivas sobre las que se rinde todo

`profileGen.ts` queda reducido a sus primitivas exportadas (§B.1, paso 1 del plan, sección 15). Son las mismas funciones que hoy dibujan bien (mapa 01 §1: «el llano ondula, cada puerto se parte en rampas de pendiente variable»), con tres cambios de firma decididos (decisión 11):

| Primitiva                                          | Líneas hoy (mapa 01 §1)       | Qué hace                                                                                                                                                         | Qué cambia en E1                                                                                                                                                                  |
| -------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hashInt(s)`, `routeRng(seed)`                     | 15-22, 30-44                  | FNV-1a y mulberry32; una secuencia por cadena de semilla                                                                                                         | nada; todos los subflujos de la gramática (`arch`, `firma`, `ed`, `mot`, `pos`, `dib`) pasan por `routeRng`                                                                       |
| `between(rand, min, max)`, `split(rand, total, n)` | 47-49, 52-65                  | uniforme en `[min, max)`; reparto con pesos `U(0,7; 1,3)`, redondeo a 0,1, mínimo 0,5 km por trozo                                                               | nada                                                                                                                                                                              |
| `climb(rand, len, avg, opts?)`                     | 72-82                         | UN `puerto` de `len` km en `max(2, round(len / 2,2))` rampas a `max(1, avg + prog·1,6 + U(−1,2; 1,2))`, con `prog` de −1 al pie a +1 en la cima: más dura arriba | gana `opts.gMax`: cada rampa se recorta a `min(gMax, …)`. Sin `opts` se comporta como hoy (el golden de 1.418 del paso 1 lo exige)                                                |
| `descent(rand, len, avg)`                          | 85-93                         | UN `descenso` en `max(2, round(len / 3))` rampas a `−max(2, avg + U(−1,5; 1,5))`                                                                                 | nada; el suelo de −2 % se conserva                                                                                                                                                |
| `rolling(rand, km, amp, pRompepiernas = 0)`        | 100-122                       | relleno en trozos de `U(3, 6)` km que suben la primera mitad a `U(0,8; amp)` y bajan la segunda a entre el 60 y el 100 % de eso, alternando por paridad          | `amp` pasa de `bumpy: boolean` a número (`false` era 1,8 y `true` 3,2, ingeniero §4.4) y `pRompepiernas` vale 0 por defecto: la gramática nunca emite `rompepiernas` (decisión 2) |
| sector literal                                     | como `cobblesSegments` l. 503 | `{ km, tipo: 'paves', estrellas }` sin tramos (pendiente 0)                                                                                                      | se emite desde `renderMotif`, no desde una función propia                                                                                                                         |

Una regla de tipado atraviesa todo el rendido y la fija `datos.md` §3.3 (resuelve R28.1(c) del mapa 05 §9): **todo lo que quiere contar como subida en la táctica se escribe `puerto`**, porque `kmSubida`, `breakAppeal`, `gcTerrain` y `shortMountain` cuentan bloques por tipo y no por pendiente (`simulate.ts` l. 1696-1719, mapa 03 §4.1); lo que sube y no debe contar (la `tendida`, el relleno) se escribe `llano` con tramos, que la física sí lee por `g` (`sample.ts` l. 32-44 y 50-54). Y el relleno tiene la amplitud topada en `ARCH.motivo.enlace.ampMax` 2,4 para que ningún tramo suyo alcance el 3 % que `deriveFinishTerrain` funde en una racha de subida (`finishClimbMinGradient` 3, `constants.ts` l. 3977; juicio motor §1): hoy `rolling` en modo `bumpy` llega a 3,2 (l. 105) y por eso un muro de meta podía salir `puncheur` o `alto`.

Cada `cota`, `puerto` y `muro` se rinde como UN solo `Segment` de tipo `puerto`. Importa por dos lecturas del motor: `climbSize` (`stageKind.ts` l. 36-42) suma los tramos con `g > 0` del segmento, y `deriveClimbCategory` (`sample.ts` l. 131-143) puntúa `Σ km·g²` sobre los tramos del segmento que contiene la pancarta, no del puerto entero si estuviera partido (mapa 03 §2). Un puerto en un segmento se mide y se categoriza entero.

### 4.2 Los doce `MotifKind`, uno a uno

La tabla resume; los párrafos que siguen dan el detalle por familia. Los rangos son los de `ARCH` (§B.3, sección 12); «lo que lee el motor» sale del mapa 03 §3 (`physics.ts`) y §4 (`simulate.ts`).

| Motivo     | `km`                                 | `g` (%)                    | Rinde como                                                                                                | Lo que lee el motor                                                                                                                                                                          | Caso real (mapa 07)                                                                    |
| ---------- | ------------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `enlace`   | [1; 60]                              | amp = `geo.amplitud` ≤ 2,4 | `rolling(rand, km, geo.amplitud, 0)`: `llano` con tramos                                                  | `vRef` 42 km/h, `draftMax` 0,42, `selectionFactor` 0 (l. 517); único terreno del abanico y el acordeón (l. 1215, 3898)                                                                       | el llano entre cotas de cualquier carrera                                              |
| `expuesto` | [5; 60]                              | amp 1,0 fija               | `rolling(rand, km, 1,0, 0)`                                                                               | idéntico a `enlace`: es metadato de ficha, no física                                                                                                                                         | Brugge-De Panne (~300 m de D+ en 200 km, §1.5), pólder, Crau, desierto del Golfo       |
| `tendida`  | [5; 30]                              | [1,5; 3,5]                 | UN `llano` con 2 a 4 tramos a `g ± 0,7`                                                                   | `costBase` 0,24 + 0,135·g (l. 239-249): a 2,5 % cuesta 2,4 veces el llano; no suma a `kmSubida`, no selecciona                                                                               | Feldberg 12 km al 4 % (§1.1), altiplano andino, meseta                                 |
| `descenso` | [2; 25]                              | [−8; −3]                   | `descent(rand, km,                                                                                        | g                                                                                                                                                                                            | )`                                                                                     | selecciona solo con `g ≤ −4` y solo su primer km, o entera a ≤ 25 km de meta (l. 2427, 5083-5089); caída 0,0018/km (`crash.ts` l. 25-36); coste con suelo 0,10 a `g ≤ −3` | Poggio, Civiglio, San Fermo |
| `cota`     | [2,5; 8,0]                           | [4; 7]                     | `climb(rand, km, g)` → `puerto`                                                                           | `subida`: `climbWeight`, deriva, `kmSubida`; pancarta cat3 o cat2                                                                                                                            | Rosier 4,4 × 5,9; Jaizkibel 7,9 × 5,6; Cipressa 5,6 × 4,1                              |
| `puerto`   | [9,0; 25]                            | [5; 9]                     | `climb(rand, km, g)`; con `forma: 'irregular'`, una rampa de [0,3; 0,8] km al [11; 13] %                  | `subida`; a ≤ 30 km de meta se sube a tope (`climbRaceKmToGo`, l. 2497); en la rampa ≥ 8 el perfil usa COL (l. 434); cat1 o HC                                                               | Alpe d'Huez 13,8 × 8,1; Tourmalet 17,1 × 7,3; Galibier 23 × 5,1                        |
| `muro`     | [0,4; 3,0]                           | [8; 16], `gMax` 16         | `climb(rand, km, g, { gMax: 16 })` con 2 rampas; adoquinado sigue siendo `puerto`                         | `subida` con COL en cada bloque `g ≥ 8` (`wallMinGradient`, `constants.ts` l. 1594); pancarta solo si ≥ 1,5 km o si es el último puerto                                                      | Paterberg 0,36 × 12,9; Koppenberg 0,6 × 11,6; Mur de Huy 1,3 × 9,6; Sormano 1,9 × 15,8 |
| `cadena`   | Σ hijos + enlaces de [1,5; 6] km     | (de los hijos)             | hijos `cota` o `muro` intercalados con `rolling` corto de `geo.amplitud`; sin bajada canónica entre ellos | n subidas sin valle; nada especial: el motor ve n segmentos `puerto` seguidos                                                                                                                | Ronde [16; 19] cotas, Amstel [33; 34], el tríptico final de Lieja (§1.3, §1.6)         |
| `sector`   | [0,3; 3,7]                           | 0                          | `{ km, tipo: 'paves', estrellas }`; `firme: 'tierra'` se rinde `paves` de 2 o 3★                          | `costBase` 0,55 + 0,06·★; `selectionFactor` 0,6·★/3·(1 + 0,5·lluvia); percances ×20 (l. 7094-7108); caída 0,0025/km; aproximación de 2 km (`pavesApproachKm`, l. 1628-1636); `draftMax` 0,18 | Arenberg 2,3 km 5★, Carrefour de l'Arbre 2,1 km, Roubaix 0,3 km (§1.4)                 |
| `racimo`   | [20; 60]                             |                            | [4; 10] sectores separados por `rolling` de [2; 6] km con amp 0,7                                         | lo mismo que `sector`, sin reagrupar entre uno y otro                                                                                                                                        | Roubaix: de 29 a 31 sectores en 3 a 6 racimos (§1.4)                                   |
| `circuito` | [8; 30] por vuelta × [3; 18] vueltas |                            | los hijos rendidos `vueltas` veces con la MISMA semilla de detalle                                        | n pasos por la misma cota; una pancarta por paso de cota ≥ 1,5 km                                                                                                                            | Québec 12,6 × 16; Montréal 12,3 × [17; 18]; Mundial [12; 27] × [7; 14] (§1.1)          |
| `meta`     | §4.3                                 |                            |                                                                                                           |                                                                                                                                                                                              |                                                                                        |

#### Enlaces: `enlace`, `expuesto`, `tendida`, `descenso`

**`enlace`** es el relleno de hoy con la amplitud puesta por la geografía y no por la función: `geo.amplitud` (columna de `GeoSignature`, sección 6) entra como `amp` de `rolling`. Dos consecuencias medidas. La primera: el relleno pesa. Una llana de 130 a 215 km acumula hoy de 661 a 1.413 m de desnivel positivo solo con `rolling` (mapa 01 §1), y una reina de 175 km suma 1.017 m de relleno sobre 2.840 m de puertos; por eso el objetivo de desnivel de un esqueleto incluye el relleno (decisión 9) y se persigue con `ARCH.reina.rellenoDplusPorKm` 5,5 m/km antes de dibujar. La segunda: el pólder belga y neerlandés lleva `amplitud` en [0,4; 0,9] (I-38, `geografia.md` §5), un cuarto de los 1,8 de hoy, y con eso una llana de Flandes baja a [300; 700] m, que es lo que Brugge-De Panne acumula (unos 300, mapa 07 §1.5). La ondulación de una llana del Macizo Central (2.500 a 3.500 m reales, mapa 07 §3.14) no sale del relleno sino de las `cota` que la zona pone en el esqueleto. El tope `ARCH.motivo.enlace.ampMax` 2,4 vale para toda zona: por encima, un tramo de relleno se convierte en cota a ojos de `deriveFinishTerrain`.

**`expuesto`** es un `enlace` con amplitud fija 1,0 (`ARCH.motivo.expuesto.amp`) y existe por dos razones que conviene no confundir. La honesta: hoy el viento es una propiedad de la etapa, no del perfil. `simulate.ts` sortea `rng('viento')` una vez y el abanico puede caer en cualquier bloque de tipo `llano` (mapa 03 §5.1; `docs/motor.md` l. 1317-1318: «cualquier kilómetro de llano puede ser el del corte»). Escribir `expuesto` no coloca el abanico ni lo hace más probable. La de diseño: el motivo queda en `arch.motivos` con `nombre` («llano abierto de 35 km») para que la ficha lo cuente sin prometer abanicos (decisión 17: nunca la palabra «abanicos» en el texto generado) y para que un motor futuro con exposición por tramo lo lea sin tocar la gramática. Un esqueleto pide `expuesto` solo en zonas con `viento ≥ 2` (`et_llana_viento`, `ud_esprint`; sección 5).

**`tendida`** es la subida larga y suave que en carretera desgasta sin seleccionar: los 20 km al 2,5 % de un altiplano, el Feldberg de Frankfurt (12 km al 4 %). Se rinde como UN `llano` con 2 a 4 tramos a `g ± 0,7` y esa tipificación es una decisión, no un descuido (`ARCH.motivo.tendida`, arquitectura §13.5): tipada `puerto` contaría en `kmSubida` y en `breakAppeal` (`clamp(4·kmSubida/total + 0,35·[alto], 0, 1)`, l. 1696-1702) como si fuera un puerto de 20 km, y una vuelta de meseta saldría «de montaña» para la fuga y para `gcTerrain` (l. 1710). Tipada `llano`, cuesta lo que dice su pendiente (`costBase` 0,24 + 0,135·g: 0,58 por bloque al 2,5 % contra 0,24 en llano) y no selecciona (`selectionFactor('llano')` = 0 con cualquier `g`, l. 517). Si el motor gana tipado por pendiente (táctica R28.1(c)), la `tendida` se retipa en `renderMotif` y nada más cambia.

**`descenso`** es la bajada declarada en el esqueleto (la del Poggio, la de Civiglio, la de una `meta` de tipo `cima_cerca`). No hay que confundirla con la bajada canónica que el rendido añade tras cada `puerto` y cada `cota` que no sea de meta (sección 8): esa no es un motivo, es `ARCH.motivo.descenso.kmPorDesnivel`, `clamp(len·g·10 / 55, 2, 10)` km, la regla de `mountainClassicSegments` l. 467 que pierde el 85 % de lo subido a unos 5,5 % (I-43; hoy la reina usa `U(5, 8)` fijo, mapa 01 §2.5). Con ella, tras un Alpe d'Huez (13,8 × 8,1) se bajan 10 km (tope) y tras una cota de 5 km al 5,5 % se bajan 5,0. Lo que el motor hace con una bajada es poco y conviene tenerlo delante: selecciona solo si `g ≤ −4` (`constants.ts` l. 2784) y solo en su primer km (`descentSelectKm` 1), o entera si la meta está a ≤ 25 km (`placement.descentFinalKmToGo`); a −3 % es coste barato (suelo 0,10) y nada más (mapa 03 §10.5). La gramática no promete que una bajada seleccione: promete dónde está y cuánto mide.

#### Dificultades: `cota`, `puerto`, `muro`

**`cota` y `puerto`** se separan en el 8,5 km de `PASS_MIN_KM` (`stageKind.ts` l. 62) con medio kilómetro a cada lado: `cota.km` [2,5; 8,0] y `puerto.km` [9,0; 25]. El hueco [8,0; 9,0] se asume y se documenta (§4.4): un Ghisallo de 8,6 km o una Bocchetta de 8,5 salen como puertos de 9,0. El techo de 25 deja fuera la Croix de Fer (29) y la Loze (28) como rarezas; el `alto_largo` de meta llega a 22 con la misma lógica (§4.3). Pendientes: `cota.g` [4; 7] (hoy [4,5; 6,5], `profileGen.ts` l. 248; Jaizkibel 5,6, Arrate 7,4), `puerto.g` [5; 9] (Galibier 5,1, Angliru 9,8 recortado por zona). La intersección con `geo.cota` y `geo.puerto` de la zona estrecha ambos (sección 6): en `dolomitas` un puerto nace en [9; 14] × [7,5; 9], en `alpes` en [12; 25] × [6; 9]. Lo que el motor lee de una `cota` y de un `puerto` es lo mismo, subida bloque a bloque (`climbWeight` `clamp((g − 2) / 6, 0,15, 1)`, `vRef` hiperbólica, `loadExponent` hacia 1,0, `draftMax` que cae con `g`; `physics.ts` l. 20-106 y 252-267), y la diferencia táctica la hace la posición: solo el puerto a ≤ 30 km de meta se sube «de verdad» (`climbRaceKmToGo`, l. 2497; `climbTempoFraction` 0,5 contra `climbPaceFraction` 0,12). De ahí V8b (sección 9): una reina de verdad tiene ≥ 25 % de sus km de subida a más de 30 km de meta, porque lo que se sube a tempo también deja gente atrás por deriva acumulada (mapa 03 §10.3).

La pancarta `cima` de una `cota` o un `puerto` la emite `emitirPancartas` (decisión 25) y su categoría la deriva el motor de los tramos del segmento (`deriveClimbCategory`: `Σ km·g²` sobre tramos con `g > 2`, umbrales cat4 40, cat3 120, cat2 300, cat1 600, HC 1.000; `constants.ts` l. 3946-3947). En números, para que el implementador sepa qué verá el jugador: una cota de 5 km al 5,5 % puntúa 151 (cat3); una de 8 km al 7 %, 392 (cat2); un puerto de 12 km al 7 %, 588 (cat2 raspando); uno de 15 km al 8 %, 960 (cat1); uno de 20 km al 8 %, 1.280 (HC). La categoría solo alimenta puntos y relato, nunca la física (`sample.ts` l. 129; `grep climbCategory physics.ts` = 0, mapa 03 §3).

**`forma`** decide cómo `renderMotif` usa `climb`: `progresiva` es `climb` tal cual (la progresión +1,6 de hoy, «más dura arriba, siempre»); `regular` es `climb` con las rampas barajadas por el mismo `rand` (mismo conjunto de pendientes, la dureza no siempre al final); `irregular` es `progresiva` más una rampa de `ARCH.motivo.puerto.rampaIrregular` ([0,3; 0,8] km al [11; 13] %) sustituyendo tramo en la mitad alta del puerto, en posición sorteada en `dib`. La rampa importa porque a `g ≥ 8` el perfil efectivo del corredor usa COL en vez de MON (`riderPerfil`, `simulate.ts` l. 425-448) y porque tres a ocho bloques con `vRef` más bajo, exponente más alto y `draftMax` menor «sí se notan» (mapa 03 §3): es la forma de que un puerto irregular abra ≥ 1,5 veces la brecha de uno regular, que SPEC §6.17 exige y que hoy ningún generador produce a propósito (banco §3.3).

**`muro`** mide [0,4; 3,0] km al [8; 16] % (`WALL_MAX_KM` 3, `stageKind.ts` l. 60; Kwaremont 2,2 km es el más largo de Flandes) y se rinde con `climb` y `gMax` 16: para `len ≤ 3` la primitiva da `round(len / 2,2) ≤ 1`, o sea 2 rampas, y sin tope un muro declarado al 16 % llegaría a 18,8 en la cima (16 + 1,6 + 1,2). Hoy, con muros `U(8, 12)`, la pendiente máxima medida es 14,8 (mapa 01 §2.4), que sigue por debajo del tope: `gMax` no cambia lo que hoy existe, acota lo que el rango nuevo permite. Un muro adoquinado (`adoquin: true`) sigue siendo `puerto` (regla 5 de `fuentes-recorridos.md`; banco §3.3): el bloque tiene un solo terreno y se elige la subida, que es lo que selecciona; el adoquín del muro queda para la ficha, para V2 y para `arch.motivos`. Lo que el motor lee: COL en cada bloque `g ≥ 8`, y nada de la longitud (`isWall` existe y no se llama, mapa 03 §2). Pancartas: un muro de menos de 1,5 km no lleva `cima` salvo que sea el último `puerto` de la etapa (decisión 25), y por esa segunda cláusula `lastClimbKm` (`finalKind.ts` l. 46-57, que mira primero las pancartas) ve el muro de meta aunque mida 0,8 km, cerrando el borde de `CLIMB_MIN_KM` (§4.4). En esqueletos de `kind: 'clasica'` el `Slot.params.kmRango` de los muros se cierra en 2,9 y `garantizaClase` lo vigila (decisión 10): `WALL_MAX_KM` es 3 y el redondeo de tramos a 0,1 podía cruzarlo. El suelo 8 de `muro.g` es `wallMinGradient` (a partir de ahí el motor cambia MON por COL) y tiene un precio que hay que escribir: los bergs de Flandes y Limburgo al [5; 8) % (Cauberg 1,2 × 5,8; Bosberg 1 × 6; Taaienberg 0,53 × 6,6; Polytechnique 0,78 × 6; Nokereberg 0,35 × 6, mapa 07 §1.1 y §1.3) no caben como dificultad intermedia, porque `cota` exige ≥ 2,5 km y `muro` exige ≥ 8 %, y la fila `flandes` de `ZONAS` (sección 6) intersecta con `muro.g` solo en su mitad dura. Como meta sí caben (`repecho` [1; 2,9] × [4; 7]). Se anota en la sección 17 junto a los otros huecos.

Hay una cota que la gramática no tiene como dificultad intermedia y se dice aquí para que nadie la busque: la subida de 3 a 5 km al [8; 11] % (Civiglio 4,2 × 9,7, Superga 4,9 × 9,1, Murgil está en muro). Como última cota de un día está cubierta por `ARCH.meta.unDiaUltimaCota` ([1,3; 4,2] × [7; 11]) y como meta por `alto_corto` ([3; 7] × [6; 11]); como cota intermedia la intersección de `cota.g` [4; 7] con la zona la deja fuera. Se acepta en E1 como se acepta el hueco [8,0; 9,0] (sección 17).

#### Dificultades compuestas: `cadena`, `sector`, `racimo`, `circuito`

**`cadena`** es lo que hoy no existe en ningún molde: n cotas o muros seguidos sin valle. `hijos` son `cota` o `muro`, de 2 a 8 (Ronde: de 16 a 19 cotas en 2 a 4 cadenas; Amstel: de 33 a 34), separados por `rolling` de [1,5; 6] km con la amplitud de la zona; el suelo 1,5 es `ARCH.colocacion.enlaceMinimo` (dos dificultades nunca se tocan; `finishClimbGapBlocks` 5 son 0,5 km y el margen es ×3, arquitectura §8) y el techo 6 es el de `ARCH.motivo.racimo.separacion`, que cumple la misma función en adoquín. Dentro de una cadena NO se emite la bajada canónica: lo que baja entre muro y muro es el propio `rolling` (Paterberg a 13 km de meta con llano detrás, no una bajada de 5 km). El motor no distingue una cadena de n muros sueltos; la distingue el jugador, porque la cadena garantiza la densidad que mapa 07 §1.3 mide (de 12 a 34 cotas en los últimos [100; 130] km) frente a los 4 o 5 muros de `classicSegments` (l. 473-491).

**`sector`** es el literal de `cobblesSegments` l. 503, `{ km, tipo: 'paves', estrellas }`, con `km` en [0,3; 3,7] (Roubaix) y `estrellas` 1 a 5. `firme: 'tierra'` (sterrato, ribinoù, chemins de vigne) se rinde como `paves` de 2 o 3★, que es exactamente lo que `classicRoutes.ts` l. 594 ya hace con Strade Bianche (banco §3.3): el motor no tiene tierra, tiene adoquín con estrellas, y 2 o 3★ es la selección de una pista de tierra (referencia 3★ en `dropPavesStarsReference`; 5★ casi dobla la selección, mapa 03 §10.6). Lo que el motor lee de un sector está todo en su tipo y sus estrellas (mapa 03 §3 y §4.2): coste `0,55 + 0,06·★`, selección `0,6·★/3·(1 + 0,5·lluvia)`, percances ×20 (`mishapLambda`, `constants.ts` l. 4389), caídas 0,0025/km, `draftMax` 0,18, peaje de colocación al entrar (l. 2611) y una aproximación de 2 km en la que el pelotón no rueda a tempo (`kmToNextPaves`, l. 1628-1636). Fuera de `paves` las estrellas se ponen a 0 (`sample.ts` l. 105): un `muro` con `estrellas` no existe en el tipo y `validateMotif` lo rechaza.

**`racimo`** es la unidad de Roubaix: [4; 10] sectores en una ventana de [20; 60] km, separados por `rolling` de [2; 6] km a amplitud 0,7 (`ARCH.motivo.racimo.sectores` y `.separacion`). La separación es la que impide reagrupar (mapa 07 §1.4: 3 a 6 km de asfalto en el tramo central), y es lo que a `cobblesSegments` le falta: 3 sectores de 2 a 4 km repartidos con `split` en 4 huecos, el último a unos 40 km de meta, «un décimo de la densidad real» (mapa 01 §2.7, mapa 07 §1.4). `km` del racimo es `Σ sectores + Σ separaciones`; `validateMotif` lo comprueba al 0,1. El racimo de 5★ de `ud_adoquin` es motivo de firma (`firma: true`): el Arenberg está donde está todas las ediciones.

**`circuito`** es la arquitectura que hoy no existe en absoluto (mapa 01 §8: «nunca un circuito»). `km` es el de UNA vuelta, en [8; 30]; `vueltas` en [3; 18]; `hijos` son las dificultades de la vuelta (`cota`, `muro`, `sector`, `tendida`) con su ventana relativa a la vuelta. Se rinde copiando los hijos `vueltas` veces con la MISMA semilla de detalle, `dib|${raceId}|${stageIndex}|${season}|${slot}|hijo${h}|i${intento}` (arquitectura §4.6; la lista cerrada de subflujos es de la sección 8): la vuelta 7 tiene las mismas rampas que la 1, que es lo que hace reconocible un circuito y lo que el test «`circuito` repite rampas vuelta a vuelta» sella. La `meta` no forma parte del circuito: es el motivo siguiente y consume la cola de la última vuelta (sección 8); la última vuelta se corta donde empieza la meta (banco §3.3). El motor no tiene noción de vuelta (`ejecutabilidad.md` riesgo 4): ve n pasos por la misma cota, y eso es lo que Québec y Montréal son (Camillien-Houde 1,8 km al 8 % diecisiete veces). Dos números que hay que tener delante porque son la razón de la banda informativa de `routeCensus` (decisión 25): con una cota de 1,8 km al 8 % y 17 vueltas, `kmSubida` son 30,6 km sobre 209 (0,15 de la etapa) y `breakAppeal` sube a 0,59 sin final en alto; y cada pancarta `cima` cuesta 2 de depósito a quien la disputa y abre 5 km de alivio del ritmo (`bannerCost`, `reliefKm`, mapa 03 §10.8), de modo que 17 pancartas son 85 km de etapa con el ritmo amortiguado. Por eso la pancarta va solo en los pasos de cota ≥ 1,5 km (`ARCH.pancarta.cimaMinKm`) y los muros de circuito de menos no puntúan salvo el último paso, y por eso `kmSubidaShare` de `ud_circuito` tiene banda informativa ≤ 0,20 y el banco de saturación lo vigila (sección 13).

### 4.3 Los nueve `MetaKind`: el modelo de final del motor

`meta` es siempre el último motivo. Cada `MetaKind` está definido por tres lecturas del motor y por la regla que las garantiza: `deriveFinishTerrain` (`finish.ts` l. 94-123: media de `g` en los últimos 5 km, última racha de subida de los últimos 15 km con `g ≥ 3` y hasta 5 bloques de respiro, fracción de descenso de los últimos 3 km, fracción de pavé de los últimos 30), `finishType` (l. 165-189: decide `alto`, `puncheur`, `muro`, `descenso`, `pave`, `sprint_masivo`, `sprint_reducido`, en ese orden de comprobación, con `alto` ANTES que `muro`; juicio motor §1) y `finalKindOf` (`finalKind.ts` l. 78-85: `kmAfterLastClimb` contra `FINAL_KIND_CUTS` {alto 0,5; cimaCerca 5; valleCorto 20}, l. 30). Las constantes citadas son de `constants.ts`. La columna `finalKindOf` es lo que V7 garantiza por etapa con reintento; la columna `finishType` es lo que V16 mide en `routeCensus` y en `motifs.test.ts`, nunca por intento (decisión 4).

| `MetaKind`      | Cómo se rinde (últimos km)                                                                                                                      | `finishType` esperado                                                                                    | `finalKindOf`                         | Regla que lo garantiza                                                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `esprint`       | `enlace` o `expuesto` con amp ≤ 1,5 en los últimos 5 km                                                                                         | `sprint_masivo` o `sprint_reducido` (el tamaño del grupo solo cambia entre esos dos, `finish.ts` l. 142) | `null` (llana) o el de la última cota | media de `g` en los últimos 5 km (`finishWindowKm`, l. 3971) < 2: con amp ≤ 1,5 y alternancia sube/baja la media queda cerca de 0                                               |
| `repecho`       | `climb([1; 2,9], [4; 7])` como último segmento, tipo `puerto` (`ARCH.meta.repecho`)                                                             | `puncheur`                                                                                               | `alto` (0 km tras la cima)            | cota < `finishAltoMinKm` 3 (l. 3989); `g < 8` la aparta de `muro`                                                                                                               |
| `muro_meta`     | 2 km de `enlace` con amp ≤ 2,5 (`aproxKm`, `aproxAmp`) + `climb([0,5; 2,2], [8; 16], { gMax: 16 })` (`ARCH.meta.muro`)                          | `muro` si `km ≤ 1,0` (`finishMuroMaxKm`); `puncheur` por encima de 1,0                                   | `alto`                                | `climbKm ≤ muroMaxKm` 1 y `climbGradient ≥ muroMinGradient` 8 (l. 4462-4463); la aproximación evita que `finishClimbGapBlocks` 5 (l. 3980) una la racha con un repecho anterior |
| `alto_corto`    | `climb([3; 7], [6; 11])` último (`ARCH.meta.altoCorto`)                                                                                         | `alto`                                                                                                   | `alto`                                | ≥ 3 km y ≥ 4 % (`finishAltoMinGradient`, l. 4007)                                                                                                                               |
| `alto_largo`    | `climb([9; 22], [6; 9])` último; si `km > 17`, `g ≤ 7` (`gMaxSiMasDe17`)                                                                        | `alto`                                                                                                   | `alto`                                | idem; y `stageKindOf` reina por `PASS_MIN_KM` 8,5 con 0,5 de margen; solo con `geo.finalesAlto === 'largo'` (V4)                                                                |
| `cima_cerca`    | `cotaFinal` (cota, puerto o, en un día, `unDiaUltimaCota`) + `descent` + `rolling`, con valle total en [1,2; 4,3] (`ARCH.meta.cimaCerca.valle`) | `descenso` o `puncheur`, según lo que quede                                                              | `cima_cerca`                          | holgura 0,7 sobre los cortes 0,5 y 5 (`ARCH.veto.margenValleKm`)                                                                                                                |
| `descenso_meta` | `cotaFinal` + `descent([4; 12])` + `rolling([0; 8])`, valle en [5,7; 19,3] (`ARCH.meta.descensoMeta.valle`)                                     | `descenso` o `sprint_reducido`                                                                           | `valle_corto`                         | holgura 0,7 sobre 5 y 20                                                                                                                                                        |
| `valle`         | `cotaFinal` + `descent([4; 10])` + `rolling`, valle en [20,7; 45] (`ARCH.meta.valle.valle`)                                                     | `sprint_*`                                                                                               | `valle_largo`                         | holgura 0,7 sobre 20                                                                                                                                                            |
| `sector_meta`   | `sector` de [1; 2,5] km + `rolling([1; 8])` (`ARCH.meta.sectorMeta.aMeta`)                                                                      | `pave`                                                                                                   | `null`                                | fracción de pavé en los últimos 30 km (`finishPaveKm`, l. 4024) > 0                                                                                                             |

Tres notas sobre la tabla, porque son las que un implementador va a discutir.

**`muro_meta` está diseñado contra `deriveFinishTerrain`, no solo comprobado después** (I-21, I-35). El riesgo medido por el juez del motor (§1): un muro de 0,8 km al 12 % precedido de relleno `bumpy` (amp 3,2) puede salir con `climbKm > muroMaxKm` 1 porque la racha ascendente funde todo bloque `g ≥ 3` tolerando 5 de respiro, y como `finishType` mira `alto` antes que `muro`, el resultado es `puncheur` o `alto`. Cuatro propuestas lo comprobaban y reintentaban; esta sección lo evita: los 2 km previos al muro (`ARCH.meta.muro.aproxKm`) se rinden con amplitud ≤ 2,5 (`aproxAmp`), o sea ningún tramo al 3 %, y la racha empieza exactamente al pie del muro. El rango [0,5; 2,2] es más ancho que `muroMaxKm` a propósito: Huy mide 1,3 y San Luca 2,1, y no existen en la gramática si el muro de meta se limita a 1,0. Por encima de 1,0 km `finishType` dice `puncheur` (`climbKm > 1`, cota < 3 km), y la tabla lo declara; `routeCensus` mide las dos cubetas con V11 (`muro` ≥ 1 % y `puncheur` ≥ 8 % del calendario) y para que la cubeta `muro` exista de verdad los esqueletos con `muro_meta` sortean `cotaFinal.km` en todo el rango y no solo en su mitad alta (sección 5). Una cautela que V16 admite y el test del paso 3 imprime: mapa 03 §10.4 cita `docs/motor.md` §12.1 con una segunda vía a `alto` («últimos 3 km al ≥ 5 %»); un muro de 2,2 km al 14 % con 0,8 km de aproximación puede caer en ella. Por eso el conjunto que `muro_meta` promete a V16 es `{muro}` para `km ≤ 1,0` y `{puncheur, alto}` para `km > 1,0`, y el test de 300 instancias del paso 3 exige `muro` en 300 de 300 en la primera banda y pertenencia en la segunda, imprimiendo el reparto.

**Las holguras son 0,7 y no 0,5** (decisión 10, I-43). Arquitectura §3.2 proponía 0,5 sobre los cortes 5 y 20; `garantizaClase` mueve el valle al borde con `ARCH.veto.margenValleKm` 0,7 compensando en el enlace más largo, y los rangos de `ARCH.meta` nacen ya con esa holgura ([1,2; 4,3], [5,7; 19,3], [20,7; 45]) para que la guarda no tenga que actuar casi nunca (su cuenta de intervenciones se imprime en `routeCensus`). Hay un detalle de medida que justifica que la holgura sea mayor que el redondeo: `emitirPancartas` redondea el km de la cima al entero, como `auto()` l. 98, y `kmAfterLastClimb` se mide contra ese entero (mapa 01 §5.2), así que un valle dibujado de 4,6 km puede leerse como 5,0; con 4,3 de techo no cruza el corte.

**`cotaFinal` es la última cota, no un motivo aparte.** En todo `MetaKind` con subida (los siete que no son `esprint` ni `sector_meta`) la subida se instancia dentro del motivo `meta` (`Motif.cotaFinal = { km, g }`) y no como un `slot` más, y `Motif.km` es el total del motivo con aproximación, subida, bajada y valle: así V5 y V7 miran un solo objeto y `emitirPancartas` sabe dónde está la última cima. En un día, `cotaFinal` sale de `ARCH.meta.unDiaUltimaCota` ({[1,3; 4,2] km al [7; 11] %, cima a [3; 17] km}), que es el caso v40 escrito en positivo: San Fermo 2,7 × 7,2 a 5,5; Roche-aux-Faucons 1,3 × 11 a 13,5; Murgil 2,1 × 10 a 7; Civiglio 4,2 × 9,7 a 17 (mapa 07 §4.3). En etapa, `cotaFinal` es una `cota` o un `puerto` con los rangos de zona. La segunda cota de remate que Lombardía tiene en 3 de 4 ediciones (San Fermo después de Civiglio) no es de la meta: es la última `cota` del esqueleto `ud_montana` (sección 5).

### 4.4 Los tres bordes sin holgura y cómo se cierran

El diagnóstico (sección 1, mapa 01 §9 punto 4) midió tres cruces de clasificación que no son azar sino falta de holgura entre quien dibuja y quien lee. La gramática los cierra por construcción, no con reintentos:

| Borde                         | Lo medido hoy (mapa 01)                                                                                                                                         | Quién dibuja y quién lee                                                                                                   | Cómo se cierra en la gramática                                                                                                                                                                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8,5 km (`PASS_MIN_KM`)        | 3 de 1.500 con `finalKind: 'alto'` forzado (§5.1): `garantizaPuerto` fija `segment.km` a 8,6 y `climbSize` suma tramos que dan 8,4, o al revés (8,4 contra 8,5) | `garantizaPuerto` l. 192-233 escribe `s.km`; `climbSize` `stageKind.ts` l. 36-42 suma tramos redondeados a 0,1             | `cota.km ≤ 8,0` y `puerto.km ≥ 9,0` (0,5 a cada lado); `normalizeEnlaces` no toca dificultades (decisión 10); la guarda `segment.km === Σ tramos` de I-8 en `renderMotif`; `garantizaClase` con `margenClaseKm` 0,3 como red. El hueco [8,0; 9,0] se asume: Ghisallo 8,6 sale 9,0 |
| 5 y 20 km (`FINAL_KIND_CUTS`) | 4 de 6.000 cubetas cruzadas (§2.5): `valleyKmFor` daba [1,5; 5] y [6; 20] y `normalize` estiraba un valle de 20 a 20,3                                          | `normalize` escala todos los segmentos; `finalKindOf` corta con `≤` en 5 y 20 sobre un km de pancarta redondeado al entero | rangos de `ARCH.meta.*.valle` con holgura 0,7; el valle es parte del motivo `meta` y `normalizeEnlaces` no lo toca; `garantizaClase` con `margenValleKm` 0,7                                                                                                                      |
| 1,5 km (`CLIMB_MIN_KM`)       | 12 de 1.500 clásicas (semillas 91, 153, 202) con `finalKindOf` `null` porque ningún muro llega a 1,5 y `lastClimbKm` no ve pancarta (§2.4)                      | `auto()` l. 93-102 ponía `cima` en todo `puerto`; `lastClimbKm` l. 46-57 mira pancartas y, si no, puertos ≥ 1,5            | `emitirPancartas` pone `cima` en todo `puerto` ≥ 1,5 km y SIEMPRE en el último `puerto` de la etapa (decisión 25): el muro de meta de 0,8 km tiene pancarta, `lastClimbKm` lo ve y `finalKindOf` dice `alto`                                                                      |

La guarda `segment.km === Σ tramos` (I-8) vive en `renderMotif` y no en una pasada posterior: `climb` reparte `len` en rampas con `split`, que redondea a 0,1 y cuadra el último trozo (mapa 01 §1), así que la suma coincide por construcción; la guarda es un `assert` en desarrollo y una corrección del último tramo en producción (mismo mecanismo que `normalize` l. 169-173, ingeniero §4.4). `sampleProfile` avisa de por qué importa: si los tramos suman más que `km`, la cola nunca se muestrea; si menos, el último se estira (`sample.ts` l. 55-56, mapa 03 §2).

### 4.5 `validateMotif`, `renderMotif` y sus tests

Las dos funciones de `motifs.ts` además de los tipos:

```ts
// packages/engine/src/routes/grammar/motifs.ts

/** null = válido; texto = por qué no (se guarda en arch para el censo y para el test). Puro. */
export function validateMotif(m: Motif, geo?: GeoSignature): string | null

/** Rinde UN motivo a segmentos con las primitivas de profileGen.ts. Puro: mismo rand, mismos segmentos.
 *  No cuadra km (eso es normalizeEnlaces, sección 8), no emite pancartas (emitirPancartas), no verifica (verify). */
export function renderMotif(m: Motif, rand: () => number, geo: GeoSignature): Segment[]
```

Lo que `validateMotif` comprueba, en este orden, y devuelve con el primer fallo:

1. Rango por tipo: `km` y `g` dentro de `ARCH.motivo[kind]` (o `ARCH.meta[meta]` en `meta`), redondeados a 0,1. `enlace` [1; 60]; `expuesto` [5; 60]; `tendida` [5; 30] × [1,5; 3,5]; `descenso` [2; 25] × [−8; −3]; `cota` [2,5; 8,0] × [4; 7]; `puerto` [9,0; 25] × [5; 9]; `muro` [0,4; 3,0] × [8; 16]; `sector` [0,3; 3,7] con `estrellas` entero en [1; 5]; `circuito` [8; 30] por vuelta con `vueltas` entero en [3; 18]; `racimo` [20; 60].
2. Campos que no pertenecen al tipo: `estrellas` fuera de `sector`; `firme` fuera de `sector`; `vueltas` fuera de `circuito`; `hijos` fuera de `cadena`, `racimo`, `circuito`; `meta` y `cotaFinal` fuera de `meta`; `g` en `enlace`, `expuesto`, `sector`; `adoquin` fuera de `muro` y `sector`.
3. Compuestos: `cadena` con 2 a 8 hijos, todos `cota` o `muro`; `racimo` con [4; 10] hijos, todos `sector`, y `km = Σ hijos + Σ separaciones` con cada separación en [2; 6]; `circuito` con hijos en {`cota`, `muro`, `sector`, `tendida`} y `Σ km de hijos ≤ 0,8 · km` de la vuelta (queda enlace para cerrarla).
4. Geografía, si se pasa `geo` (los mismos hechos que V1 a V4, aquí como validación temprana del motivo y no del perfil): `puerto` exige `geo.puerto !== null`; `cota` exige `geo.cota !== null`; `muro` exige `geo.muro !== null`, y `adoquin: true` exige `geo.muro.adoquin`; `sector` con `firme: 'adoquin'` exige `geo.adoquin ≥ 2` y con `firme: 'tierra'` exige `geo.sterrato`; `puerto.km ≥ 15` exige `geo.altitud ∈ {media, alta, altiplano}`; `meta: 'alto_largo'` exige `geo.finalesAlto === 'largo'`.
5. Meta: `meta` nunca lleva `g`; todo `MetaKind` con subida (`repecho`, `muro_meta`, `alto_corto`, `alto_largo`, `cima_cerca`, `descenso_meta`, `valle`) lleva la subida en `cotaFinal = { km, g }` dentro de su `ARCH.meta.*` (o de `ARCH.meta.unDiaUltimaCota` en un día para los tres con valle), y `Motif.km` es el total del motivo (aproximación + subida + bajada + valle), nunca menor que `cotaFinal.km`; `esprint` y `sector_meta` no llevan `cotaFinal`; `sector_meta` lleva su sector en `hijos[0]`.

Lo que `renderMotif` hace por tipo está en la tabla de §4.2; las reglas transversales: un solo `Segment` por `cota`, `puerto` y `muro`; `tendida` como un `llano` con tramos; `enlace` y `expuesto` con `rolling(…, amp, 0)`; `descenso` con `descent`; `sector` literal; `cadena` y `racimo` concatenan hijos y `rolling` intermedios; `circuito` concatena `vueltas` copias de la vuelta usando un `rand` derivado por hijo y reutilizado en cada vuelta (la semilla la construye `renderSkeleton`, sección 8; `renderMotif` recibe una fábrica `randDe(h)` para los hijos, que en el test es `routeRng` sobre una cadena fija). Ningún segmento de menos de 0,5 km (umbral de `rolling`, l. 101, y de V10). Todo `km` de segmento igual a la suma de sus tramos al 0,1 (guarda de §4.4).

Tests de `grammar/motifs.test.ts` (paso 3 del plan, sección 15), escritos antes que el código. Trescientas instancias por motivo con `routeRng(`test|${kind}|${i}`)`, rangos muestreados uniformes dentro de `ARCH` y una `GeoSignature` compatible (`ZONAS.alpes` para `puerto`, `ZONAS.flandes` para `muro` y `sector`, `ZONAS.italia_centro` para `sector` de tierra, `ZONAS.generico` para el resto):

```ts
import { describe, it, expect } from 'vitest'
import { validateMotif, renderMotif } from '../grammar/motifs'
import { ZONAS } from '../grammar/geo'
import { routeRng } from '../profileGen'
import { sampleProfile } from '../../stage/sample'
import { deriveFinishTerrain, finishType } from '../../stage/finish'
import { ARCH } from '../../constants'

describe('validateMotif', () => {
  it('acepta un puerto de 12 km al 7 % en alpes y lo rechaza en flandes', () => {
    const m = { kind: 'puerto', km: 12, g: 7, forma: 'regular' } as const
    expect(validateMotif(m, ZONAS.alpes)).toBeNull()
    expect(validateMotif(m, ZONAS.flandes)).toMatch(/puerto/)
  })
  it('rechaza una cota de 8,5 km (hueco [8,0; 9,0]) y un muro de 3,1 km', () => {
    expect(validateMotif({ kind: 'cota', km: 8.5, g: 6 })).toMatch(/km/)
    expect(validateMotif({ kind: 'muro', km: 3.1, g: 10 })).toMatch(/km/)
  })
  it('rechaza estrellas fuera de sector y un racimo cuyos km no cuadran', () => {
    expect(validateMotif({ kind: 'muro', km: 1, g: 10, estrellas: 3 } as any)).toMatch(/estrellas/)
    const hijos = Array.from(
      { length: 4 },
      () => ({ kind: 'sector', km: 2, estrellas: 3, firme: 'adoquin' }) as const,
    )
    expect(validateMotif({ kind: 'racimo', km: 8, hijos }, ZONAS.flandes)).toMatch(/separaci/)
  })
})

describe('renderMotif', () => {
  it('muro: 2 rampas, ninguna por encima de gMax 16, un solo segmento puerto, km = Σ tramos', () => {
    for (let i = 0; i < 300; i++) {
      const rand = routeRng(`test|muro|${i}`)
      const km = 0.4 + Math.round(rand() * 26) / 10,
        g = 8 + Math.round(rand() * 80) / 10
      const segs = renderMotif({ kind: 'muro', km, g }, rand, ZONAS.flandes)
      expect(segs).toHaveLength(1)
      expect(segs[0].tipo).toBe('puerto')
      expect(segs[0].tramos).toHaveLength(2)
      expect(Math.max(...segs[0].tramos!.map((t) => t.g))).toBeLessThanOrEqual(
        ARCH.motivo.muro.gMax,
      )
      expect(segs[0].tramos!.reduce((s, t) => s + t.km, 0)).toBeCloseTo(segs[0].km, 1)
    }
  })
  it('tendida: un llano con tramos; ningún bloque muestreado es subida (no cuenta en kmSubida)', () => {
    const segs = renderMotif(
      { kind: 'tendida', km: 20, g: 2.5 },
      routeRng('test|tendida|0'),
      ZONAS.meseta,
    )
    expect(segs.every((s) => s.tipo === 'llano')).toBe(true)
    const blocks = sampleProfile({ segments: segs })
    expect(blocks.every((b) => b.tipo !== 'subida')).toBe(true)
    expect(blocks.some((b) => b.g >= 1.8)).toBe(true) // pero la pendiente sí se lee
  })
  it('enlace: ningún tramo alcanza el 3 % que deriveFinishTerrain lee como cota', () => {
    for (let i = 0; i < 300; i++) {
      const segs = renderMotif(
        { kind: 'enlace', km: 30 },
        routeRng(`test|enlace|${i}`),
        ZONAS.ardenas,
      )
      expect(Math.max(...segs.flatMap((s) => s.tramos!.map((t) => t.g)))).toBeLessThan(3)
    }
  })
  it('muro_meta ≤ 1,0 km: finishType muro en 300 de 300; por encima, puncheur o alto (reparto impreso)', () => {
    const cuenta: Record<string, number> = {}
    for (let i = 0; i < 600; i++) {
      const rand = routeRng(`test|muro_meta|${i}`)
      const km = i < 300 ? 0.5 + Math.round(rand() * 5) / 10 : 1.1 + Math.round(rand() * 11) / 10
      const meta = {
        kind: 'meta',
        meta: 'muro_meta',
        km: km + ARCH.meta.muro.aproxKm,
        cotaFinal: { km, g: 8 + rand() * 8 },
      } as const
      const segs = [
        ...renderMotif({ kind: 'enlace', km: 60 }, rand, ZONAS.ardenas),
        ...renderMotif(meta, rand, ZONAS.ardenas),
      ]
      const ft = finishType(deriveFinishTerrain(sampleProfile({ segments: segs })), 50)
      if (km <= ARCH.meta.muro.finishMuroMaxKm) expect(ft).toBe('muro')
      else expect(['puncheur', 'alto']).toContain(ft)
      cuenta[`${km <= 1 ? 'corto' : 'largo'}:${ft}`] =
        (cuenta[`${km <= 1 ? 'corto' : 'largo'}:${ft}`] ?? 0) + 1
    }
    console.info('muro_meta finishType', cuenta)
  })
  it('circuito: la vuelta 7 tiene las mismas rampas que la 1', () => {
    const hijo = { kind: 'muro', km: 1.1, g: 11 } as const
    const segs = renderMotif(
      { kind: 'circuito', km: 14, vueltas: 9, hijos: [hijo] },
      routeRng('test|circuito|0'),
      ZONAS.flandes,
    )
    const muros = segs.filter((s) => s.tipo === 'puerto')
    expect(muros).toHaveLength(9)
    expect(muros[6].tramos).toEqual(muros[0].tramos)
  })
  it('descenso canónico: clamp(len·g·10/55, 2, 10)', () => {
    expect(ARCH.motivo.descenso.kmPorDesnivel).toEqual({ perdidaPorKm: 55, kmMin: 2, kmMax: 10 })
    // 13,8 × 8,1 → 20,3 → 10 ; 5 × 5,5 → 5,0 ; 2,5 × 4 → 1,8 → 2
  })
})
```

Los tests de `repecho → puncheur`, `alto_corto` y `alto_largo → alto`, `sector_meta → pave`, y de rangos por motivo (300 instancias dentro de `ARCH`) siguen el mismo patrón y se listan en la sección 15. La regla que separa este fichero del resto: `motifs.test.ts` es el ÚNICO test de la gramática que llama a `sampleProfile` y a `finishType` (aparte de `routeCensus`); `verify` no lo hace nunca (decisión 4), y por eso una recalibración de `STAGE.finish*` mueve este test y no un solo perfil del calendario.

Las constantes de esta sección que no están en la tabla de §B.3 y que la sección 12 recoge en el bloque `ARCH.motivo` con estos valores: `cadena.hijos` [2; 8] y `cadena.enlace` [1,5; 6] (los números de arquitectura §3.1 y §3.3 con el suelo de `colocacion.enlaceMinimo`), `descenso.km` [2; 25] y `expuesto.km` [5; 60] (arquitectura §3.1), `circuito.maxHijosShare` 0,8 (fracción máxima de la vuelta que ocupan las dificultades, para que quede enlace que la cierre; juicio de esta sección, se recalibra en el paso 3 si un circuito real no cabe).

### 4.6 Lo que la gramática NO produce

Dicho en lista para que nadie lo busque en el catálogo ni lo eche en falta en un test:

1. **`rompepiernas`.** Ningún motivo lo emite: `sample.ts` l. 100-101 lo colapsa a `g` 1,5 e ignora los tramos, así que hoy el generador escribe pendientes que la física no lee. Lo que ondula es `llano` con tramos. `golden.test.ts` del paso 1 sella que los builders legado (que sí lo emiten, `rolling` l. 119) siguen produciendo lo de hoy hasta el paso 8.
2. **Metas volantes.** Ninguna `meta_volante` generada (regla de la casa, `calendar.ts` l. 89-91): cada una cuesta 2 de depósito a quien la disputa y abre 5 km de alivio (mapa 03 §10.8). Es la decisión D4 del dueño con valor por defecto «no» (sección 18).
3. **Altitud, viento, costa y meseta como física.** `GeoSignature.altitud` y `.viento` viajan en `arch.metadatos` y en la ficha (decisión 17); `Segment` no tiene altitud ni exposición (`types.ts` l. 12-48) y el abanico sigue saliendo de `rng('viento')` en cualquier km de llano. `expuesto` y `tendida` son la parte honesta de esa frontera (§4.2).
4. **Puertos de más de 25 km, cotas entre 8,0 y 9,0 km, cotas intermedias de 3 a 5 km al [8; 11] % y bergs intermedios de menos de 2,5 km al [5; 8) %.** Los cuatro huecos están escritos en §4.2 y en la sección 17, con lo que la realidad pone en cada uno (Croix de Fer, Ghisallo, Civiglio y Cauberg como intermedias).
5. **Finales en alto de un día de más de 4,2 km.** V5 (decisión 5): la última cota de un día mide ≤ 4,2 y corona a [3; 17] km, o muere en meta como `muro_meta` ≤ 2,2; la única excepción es `ud_montana_alto` (peso 0,02, solo .1, solo `finalesAlto: 'largo'`; D1). Es el caso del encargo: «un final en alto de catorce kilómetros, algo que no existe en el calendario real».
6. **Adoquín y sterrato donde no existen.** `sector` con `firme: 'adoquin'` solo con `geo.adoquin ≥ 2`; con `firme: 'tierra'` solo con `geo.sterrato` (V2, V3). Las 20 filas `terrain: 'cobbles'` de hoy caen todas en zonas con adoquín (mapa 07 §3), así que ningún dato del calendario se pierde.
7. **Pendientes imposibles.** Ningún tramo con `g > 20` ni `g < −14`, ningún bloque de `subida` con `g < 1` (V15); `muro.gMax` 16 y el suelo 1 de `climb` lo garantizan antes de que V15 lo mire.
8. **Dos dificultades pegadas.** Salvo dentro de una `cadena`, entre dos dificultades hay ≥ 1,5 km de enlace (`ARCH.colocacion.enlaceMinimo`), porque `deriveFinishTerrain` funde rachas separadas por menos de 5 bloques y porque un puerto pegado a otro es, para `climbSize`, dos segmentos y no uno.
9. **Segmentos de menos de 0,5 km y kilómetros con más de un decimal.** `rolling` los elimina (l. 101), V10 los veta, y `sampleProfile` los pierde de todos modos (`n = round(totalKm / dx)`, `sample.ts` l. 70: un segmento de 40 m puede no tener ningún bloque).
10. **Kilómetros de subida por la puerta de atrás.** Una `tendida` de 30 km al 3,5 % no suma a `kmSubida`, y una `cota` de 2,5 km al 4 % sí. Es la regla de tipado de §4.1, y `routeCensus` la mide por esqueleto como `kmSubidaShare` (sección 13) para que nadie descubra tarde que un circuito de muros ha convertido una clásica en «montaña» para la fuga.

### 4.7 Cuatro carreras reales escritas como `Motif[]`

Para que el implementador vea la gramática entera en una etapa y no motivo a motivo, cuatro carreras del mapa 07 escritas como instancias de `Motif[]`. Son ejemplos y no las plantillas canónicas (esas, una por esqueleto, las escribe la sección 5); las bajadas canónicas tras cada `cota` y `puerto` no de meta las añade el rendido (sección 8) y aquí van anotadas entre paréntesis para que los kilómetros cuadren. Los kilómetros de cada motivo suman el total al 0,1, que es lo que V10 exige.

**Il Lombardia por Como, 240 km, `ud_montana` en `italia_norte`** (mapa 07 §1.6). Ghisallo entra como puerto de 9,0 (es 8,6: el hueco de §4.4); Civiglio entra como `cota` con la pendiente recortada al techo 7 (es 9,7: el hueco de §4.2); San Fermo va en la meta, con el valle a 4,0 km en vez de los 5,5 reales para caer en `cima_cerca` con holgura (5,5 está entre 4,3 y 5,7, la franja que la gramática no dibuja a propósito).

```ts
const lombardia: Motif[] = [
  { kind: 'enlace', km: 116.8 },
  { kind: 'puerto', km: 9.0, g: 6.2, forma: 'progresiva', nombre: 'Ghisallo 9,0 km al 6,2 %' }, // (+ bajada canónica 10,0)
  { kind: 'enlace', km: 30 },
  {
    kind: 'puerto',
    km: 13.0,
    g: 6.6,
    forma: 'irregular',
    nombre: 'Colma di Sormano 13 km al 6,6 % con muro',
  }, // (+ bajada 10,0)
  { kind: 'enlace', km: 30 },
  { kind: 'cota', km: 4.2, g: 7.0, forma: 'progresiva', nombre: 'Civiglio 4,2 km al 7 %' }, // (+ bajada 5,3)
  { kind: 'enlace', km: 5 },
  {
    kind: 'meta',
    meta: 'cima_cerca',
    km: 6.7,
    cotaFinal: { km: 2.7, g: 7.2 },
    firma: true,
    nombre: 'San Fermo della Battaglia 2,7 km al 7,2 %, cima a 4 km',
  },
]
// Σ = 116,8 + 9 + 10 + 30 + 13 + 10 + 30 + 4,2 + 5,3 + 5 + 6,7 = 240,0. Enlaces 181,8 km (76 % ≥ 12 %).
// Cimas a 114,2 (Ghisallo), 61,2 (Sormano), 17,0 (Civiglio) y 4,0 km (San Fermo) de meta: V5 en positivo.
```

Lo que el motor lee: Sormano se sube a tempo (a 61 km, `climbRaceKmToGo` 30) pero su rampa irregular al [11; 13] % pone COL tres a ocho bloques; Civiglio y San Fermo se suben a tope; `kmSubida` = 28,9 km (0,12 de la etapa), `breakAppeal` 0,48; D+ de motivos 1.904 m más 1.000 de relleno estimado (181,8 × 5,5), o sea unos 2.900 m: la plantilla canónica de `ud_montana` (sección 5) lleva una o dos `cota` más para acercarse a los [4.400; 4.900] reales. `finalKindOf` = `cima_cerca`; `finishType` esperado `descenso` o `puncheur`; con un puerto de 13 km `stageKindOf` dice `reina` por `PASS_MIN_KM`, y qué `kind` y qué `label` declara `ud_montana` lo fija la sección 5 con V6.

**Paris-Roubaix, 257 km, `ud_adoquin` en `francia_norte`** (mapa 07 §1.4). Tres racimos con un 5★ cada uno; el de Arenberg es firma. Veinticinco sectores y unos 50 km de adoquín contra los 29 a 31 y [54; 57] km reales; la plantilla canónica llega a 30 con un cuarto racimo.

```ts
const sector = (km: number, estrellas: number, nombre?: string): Motif => ({
  kind: 'sector',
  km,
  estrellas,
  firme: 'adoquin',
  nombre,
})
const roubaix: Motif[] = [
  { kind: 'expuesto', km: 96, nombre: 'Llano abierto de Compiègne a Troisvilles' },
  {
    kind: 'racimo',
    km: 50,
    hijos: [
      sector(2.2, 3),
      sector(1.6, 3),
      sector(2.5, 4),
      sector(1.4, 2),
      sector(2.0, 3),
      sector(1.8, 3),
      sector(1.7, 3),
      sector(2.3, 5, 'Trouée d’Arenberg'),
    ],
    firma: true,
  }, // Σ sectores 15,5; separaciones 34,5
  { kind: 'enlace', km: 8 },
  {
    kind: 'racimo',
    km: 55,
    hijos: [
      sector(1.2, 2),
      sector(2.4, 3),
      sector(1.0, 2),
      sector(3.7, 4),
      sector(1.4, 3),
      sector(2.6, 3),
      sector(1.1, 2),
      sector(2.0, 3),
      sector(3.0, 5, 'Mons-en-Pévèle'),
      sector(1.5, 3),
    ],
  }, // Σ 19,9; sep. 35,1
  { kind: 'enlace', km: 6 },
  {
    kind: 'racimo',
    km: 30,
    hijos: [
      sector(1.8, 3),
      sector(2.6, 4),
      sector(1.4, 2),
      sector(2.5, 3),
      sector(1.0, 2),
      sector(2.1, 5, 'Carrefour de l’Arbre'),
    ],
  }, // Σ 11,4; sep. 18,6
  {
    kind: 'meta',
    meta: 'sector_meta',
    km: 12,
    hijos: [sector(0.3, 1, 'Roubaix')],
    nombre: 'Último sector a 1,1 km de meta',
  },
]
// Σ = 96 + 50 + 8 + 55 + 6 + 30 + 12 = 257,0. Arenberg a 111 km de meta, Mons-en-Pévèle a 48, Carrefour a 12.
```

Lo que el motor lee: 25 entradas a `paves` con peaje de colocación, 25 aproximaciones de 2 km sin tempo, tres sectores 5★ que casi doblan la selección de los 3★, percances ×20 durante 47 km; ningún bloque `subida`, `kmSubida` 0, `breakAppeal` 0. `finishType` `pave`; `finalKindOf` `null`; `stageKindOf` `clasica` / `Cobbles`. D+ solo del relleno: con `amplitud` de `francia_norte` cerca de 0,9, unos [600; 900] m (Roubaix real: [700; 1.100]).

**GP de Montréal, `ud_circuito` en `norteamerica`** (mapa 07 §1.1). Diecisiete vueltas de 12,3 km con Camillien-Houde y un muro corto; Polytechnique (0,78 km al 6 %) se queda fuera por el hueco de §4.2. La meta es `esprint` y consume la cola de la última vuelta: total 16 vueltas enteras más la última cortada en la cima del segundo muro más 4 km de meta.

```ts
const montreal: Motif[] = [
  {
    kind: 'circuito',
    km: 12.3,
    vueltas: 17,
    firma: true,
    hijos: [
      {
        kind: 'muro',
        km: 1.8,
        g: 8.0,
        forma: 'progresiva',
        nombre: 'Camillien-Houde 1,8 km al 8 %',
      }, // ventana 0,15 de la vuelta
      { kind: 'muro', km: 0.4, g: 9.0, nombre: 'Pagnuelo 400 m al 9 %' }, // ventana 0,55
    ],
  },
  { kind: 'meta', meta: 'esprint', km: 4.0, nombre: 'Meta a 4 km del último muro' },
]
// Σ = 16 × 12,3 + 7,2 (última vuelta hasta la cima de Pagnuelo) + 4,0 = 208,0.
```

Lo que el motor lee: 34 pasos por `puerto` con las mismas rampas cada vuelta; `kmSubida` = 17 × 2,2 = 37,4 km (0,18 de la etapa, dentro de la banda informativa 0,20 de `ud_circuito`), `breakAppeal` 0,72; 18 pancartas `cima` (17 de Camillien-Houde, que mide ≥ 1,5, y una sola de Pagnuelo en su último paso, decisión 25), cada una con 2 de depósito para quien la dispute y 5 km de alivio; `lastClimbKm` es el último Pagnuelo, `kmAfterLastClimb` 4,0, `finalKindOf` `cima_cerca` (que es lo que `esprint` admite: «`null` o el que dé la última cota»), `finishType` `sprint_reducido` o `puncheur`.

**Flèche Wallonne, 203,3 km, `ud_muro_final` en `ardenas`** (mapa 07 §1.2). El Mur de Huy es firma y aparece tres veces: dos dentro de un circuito y la tercera como `cotaFinal` de un `muro_meta` de 1,3 km, que está por encima de `finishMuroMaxKm` 1,0 y por tanto se declara `puncheur` (§4.3).

```ts
const fleche: Motif[] = [
  { kind: 'enlace', km: 140 },
  {
    kind: 'circuito',
    km: 30,
    vueltas: 2,
    hijos: [
      {
        kind: 'muro',
        km: 1.3,
        g: 9.6,
        forma: 'progresiva',
        firma: true,
        nombre: 'Mur de Huy 1,3 km al 9,6 %',
      }, // ventana 0,05
      { kind: 'muro', km: 1.3, g: 8.0, nombre: 'Côte de Cherave 1,3 km al 8 %' }, // ventana 0,85
    ],
  },
  {
    kind: 'meta',
    meta: 'muro_meta',
    km: 3.3,
    cotaFinal: { km: 1.3, g: 9.6 },
    firma: true,
    nombre: 'Mur de Huy 1,3 km al 9,6 %, meta en la cima',
  }, // 2,0 km de aproximación a amp ≤ 2,5 + 1,3 de muro
]
// Σ = 140 + 60 + 3,3 = 203,3. Huy a 60, 30 y 0 km de meta, como en la carrera real.
```

Lo que el motor lee: seis pasos por muro con COL en cada bloque al ≥ 8 %; `kmSubida` 6,5 km (0,03), `breakAppeal` 0,13 más 0,35 por final en alto = 0,48; `finalKindOf` `alto` (0 km tras la cima, con pancarta en el último Huy aunque mida menos de 1,5 km); `finishType` esperado `puncheur` (`climbKm` 1,3 > `muroMaxKm` 1, cota < `finishAltoMinKm` 3), con `alto` admitido por V16 si la media de los últimos 3 km supera el umbral (§4.3); `stageKindOf` `clasica` porque ninguna cota pasa de 3 km (`WALL_MAX_KM`). La frase de arquitectura de la ficha: «Circuito de 30 km × 2 con el Mur de Huy (1,3 km al 9,6 %) y Cherave; meta en la cima del Mur de Huy».
