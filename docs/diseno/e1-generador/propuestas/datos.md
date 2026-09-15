# Propuesta E1 (ángulo «aprender de lo real»): un generador de recorridos por ARQUETIPOS extraídos de los recorridos reales del repositorio

Lo que sigue es un diseño completo e implementable del generador de recorridos, escrito desde una sola idea: **el repositorio ya tiene 177 etapas con relieve real y 384 etapas de edición con distancia, ciudades y terreno verificados; que lo generado sea una variación controlada de lo real, y que se pueda medir cuánto se le parece.** Se ha escrito tras leer los siete mapas de `scratchpad/e1/mapas/` y comprobando en el código todo lo que aquí se afirma de él. Donde se cita una línea es de la versión actual (`ENGINE_VERSION` 69, `constants.ts` l. 718).

Convención: «real» es una etapa con rasgos en `STAGE_FEATURES` (`routes/stageFeatures.ts` l. 15); «edición» es una etapa de `RACE_EDITIONS` sin rasgos (`routes/editions.ts` l. 25); «generada» es todo lo demás. El inventario cuenta 177, 226 y 1.015 respectivamente (`docs/inventario-recorridos.md` l. 20-26).

---

## 1. Diagnóstico: qué falla hoy, con citas al código

### 1.1 Los moldes son ocho y la semilla no elige ninguno

`routes/profileGen.ts` tiene ocho constructores `xxxSegments(km, seed)` (l. 236-514) y `routes/calendar.ts` los reparte por un `switch` de seis terrenos (`oneDaySpec`, l. 400-408) o por tres papeles de vuelta (`stageMix`, l. 546-561, sobre `type MixTerrain = 'flat' | 'hilly' | 'mountain'`, l. 411). Dentro de cada constructor la ARQUITECTURA es una constante del kilometraje, no de la semilla:

- `hillySegments` (l. 243-261): `nClimbs = km > 170 ? 3 : 2`; siempre relleno tras la última cota, que corona a 26-68 km de meta (medido en el mapa 01 §2.2: `valle_largo` en 1.500 de 1.500).
- `hillyUphillSegments` (l. 269-297): `nClimbs = km > 170 ? 2 : 1` más una cota final de 4-7,5 km al 5-7,5 %, recortada a 8,4 km por `garantizaPuerto` (l. 296).
- `mountainSegments` (l. 337-414): `midClimbs = km > 165 ? 3 : 2`, final de 9-15 km al 7,5-9,5 %, nunca por debajo de 8,6 (l. 381). Es el único constructor que sortea dos decisiones de forma: el brazo de desnivel (`ROUTE.queenHighDplusShare`, `constants.ts` l. 1169) y el `finalKind` (`sampleFinalKind`, l. 417-424).
- `mountainClassicSegments` (l. 443-470): mismos intermedios, final 4-8 km al 7,5-10 % y `runIn` 13-22 km. Ningún test de `routes/` lo importa (`stageKind.test.ts` l. 2-10) y dibuja 51 de las 157 reinas del calendario (mapa 06 §1).
- `classicSegments` (l. 473-490): `nWalls = km > 200 ? 5 : 4` muros de 1-2,5 km al 8-12 %, sin adoquín, con el último a 16 km o más de meta.
- `cobblesSegments` (l. 493-507): `sectors = [3, 5, 4]` estrellas, literal y fijo: tres sectores siempre, en ese orden, el último a unos 40 km de meta.
- `flatSegments` (l. 236-240) e `ittSegments` (l. 510-514): el mismo cuerpo, `rolling` y `normalize`.

Todos los rangos (3-7 km, 4,5-6,5 %, 6-11, 9-15, 1-2,5, 8-12, 2-4…) son literales dentro de las funciones; de `ROUTE` solo entran cuatro claves (`queenDplusRange`, `queenHighDplusShare`, `queenLowDplusRange`, `queenFinalMix`, `constants.ts` l. 1167-1189). Cambiar «una cota de media montaña mide de 3 a 7 km» es editar `profileGen.ts` l. 247. El dueño no percibe tres o cuatro modelos: los cuenta bien (`docs/agenda.md` §4.18, hallazgo 1).

### 1.2 El azar mueve el detalle, la arquitectura es del nombre de la función

`split` (l. 52-65) reparte el relleno con pesos `U(0,7; 1,3)`, así que cada hueco vale entre 0,54 y 1,86 veces la media: las dificultades caen siempre repartidas «a intervalos parecidos». `climb` (l. 72-82) pone la rampa más dura arriba en todos los puertos (`prog · 1,6`), cuando el Kwaremont es más duro abajo y el Angliru tiene su rampa a tres kilómetros de la cima. `rolling` (l. 100-122) alterna subida y bajada por paridad del índice. Lo que ninguna semilla dará hoy (mapa 01 §4): un puerto largo con cien kilómetros de llano antes, dos puertos encadenados sin valle, un circuito, un muro en el último kilómetro (0 finales `muro` en 1.075 etapas, `docs/balance.md` v60 §12), treinta sectores de adoquín, una reina de 130 km con cinco puertos.

### 1.3 El generador no sabe dónde está

`CalendarRace.country` existe (`calendar.ts` l. 69-72) y lo llevan las 842 carreras (`calendar.test.ts` l. 197-201), pero las tres ramas de `buildRace` (l. 899-929) pasan al generador `row.stages`, `row.terrain`, `row.km` y `row.id`; `oneDaySpec(terrain, km, seed)` (l. 400) y `stageMix(n, terrain, seedBase)` (l. 546) no tienen dónde recibirlo. El país solo llega a `stagePlace` para el clima (`schedule.ts` l. 27-32, `world/climate.ts` l. 165) y a `packages/db` para viajes. Consecuencia literal: `nc-nl-road` y `nc-co-road` salen los dos de `classic(220, id)` (`calendar.ts` l. 316-367); Race Rutland (`terrain: 'cobbles'`, l. 2390) y una hipotética .2 andaluza de adoquín se dibujarían igual.

### 1.4 El generador es la entrada de la calibración, y ya ha calibrado en falso

`docs/epics.md` E3 pasos 3-4: `mountain.breakawayWinPct` (25-45 %) estuvo cinco versiones en verde sobre `reina-150` (135 km de llano y un puerto de 15 km al 8 %, 1.200 m) mientras las reinas reales daban 3,3 % y la gran vuelta 0 %; después el paso 7 midió que el calendario generado tiene reinas de mediana 2.023 m (hoy 2.053 tras la v64, `balance.md` v60 §1b) contra 3.500-5.000 reales, y la fuga gana el 18,1 %. El caso v40 (`balance.md` l. 8102-8125): `mountainSegments` dio a Race Jura (`calendar.ts` l. 2303, un día, `.1`, `terrain: 'mountain'`) un final en alto de 9-15 km, «algo que no existe en el calendario real», y el 82 % del pelotón acabó a cero. Se arregló ese caso con un noveno molde; el problema de fondo (el generador inventa formas que la carretera no tiene) sigue.

### 1.5 Lo que sí funciona y hay que conservar

- `Segment`/`Ramp`/`StageProfile` (`stage/types.ts` l. 17-47) son un buen contrato de autoría y el motor solo lee de ellos `g`, `tipo`, `estrellas` y `banner` por bloque de 100 m (mapa 03 §1.1). Todo lo que se diseñe tiene que terminar en eso.
- `stageKindOf` (`stageKind.ts` l. 71-98) y `finalKindOf` (`finalKind.ts` l. 78-85) son lectores puros del perfil; sus umbrales (`WALL_MAX_KM` 3, `PASS_MIN_KM` 8,5, `QUEEN_MIN_CLIMB_METRES` 3.200, `FINAL_KIND_CUTS` 0,5/5/20, `CLIMB_MIN_KM` 1,5) son la vara del banco y no hay razón para moverlos.
- `buildFeatureProfile` (`featureProfile.ts` l. 362-375) reconstruye bien un recorrido real desde `climbs`, `cobbles`, `sprints` y `elevation`. La forma interna de un puerto real (`climbRamps`, l. 121-133: 30/40/30 % con 0,8/1,3/0,85) es un buen punto de partida para las piezas.
- `normalize` (l. 141-177) cuadra los km sin deformar la forma, `garantizaPuerto` (l. 192-233) sujeta las puertas del clasificador, y `race_routes` (`packages/db/src/raceRoutes.ts` l. 17-55) congela el recorrido de una carrera el día de su etapa 1, de modo que cambiar el generador solo alcanza a carreras futuras.
- `routeRng` (`profileGen.ts` l. 30-44, FNV-1a más mulberry32) es determinista y puro.

---

## 2. Principios

1. **Lo real manda y lo generado imita lo real.** La distribución de lo generado, familia a familia, tiene que parecerse a la de las etapas reales que ya están en el repositorio; donde no hay dato real, a las bandas del mapa 07, marcadas como curadas y no como medidas.
2. **La arquitectura se elige, el detalle se sortea.** Cada etapa generada nace de un ARQUETIPO (un esqueleto de motivos con bandas de posición y tamaño) elegido por tipo, formato, clase y región; la semilla decide qué arquetipo y cómo se realiza, no solo cuánto mide cada rampa.
3. **La geografía es una firma, no un adorno.** El país (y, cuando se sepa, la región) decide qué familias de arquetipo son posibles, cuánto miden los puertos, si hay adoquín o tierra y hasta dónde sube la carretera.
4. **Una carrera se parece a sí misma.** Los motivos ancla de una carrera son estables para siempre; lo que cambia de temporada en temporada es una variación deliberada (una variante entre dos o tres, más un desplazamiento pequeño), nunca un rearranque del sorteo.
5. **Nada copia una carrera real.** Ni nombres, ni posiciones exactas: bandas anchas, jitter obligatorio y una prueba geométrica que lo vigila.
6. **Todo lo que salga tiene que poder existir.** Reglas de veto escritas y comprobadas por test, con el caso v40 como primer ejemplo.
7. **Determinista, puro y con subflujos nominales**, como el motor de etapa (`stage/rng.ts` l. 27-29).
8. **Contrato intacto hacia abajo**: el resultado es `StageProfile`; ni `sample.ts`, ni `stageKind.ts`, ni `finalKind.ts` cambian de umbrales.
9. **Se mide antes de sellar.** Ninguna banda nueva nace en rojo; las que se muevan a propósito se remiden y se anotan en `docs/balance.md`.

---

## 3. El modelo

### 3.1 Piezas, motivos, arquetipos

Tres niveles. Una **pieza** es lo que se dibuja (un puerto, un muro, un sector, una bajada, un tramo de valle). Un **motivo** es una pieza con bandas: dónde cae, cuánto mide, cuánto pica, y si es opcional. Un **arquetipo** es una lista ordenada de motivos más el tipo de final, el kilometraje y desnivel esperados, las regiones y clases donde existe y su procedencia (extraído de datos reales o curado a mano).

```ts
// packages/engine/src/routes/archetypes/types.ts

/** Banda cerrada [min, max]; se muestrea uniforme salvo que se diga lo contrario. */
export type Band = readonly [min: number, max: number]

/** Regiones geográficas con firma propia (§5). No es el país: Francia tiene seis. */
export type GeoRegion =
  | 'flandes'
  | 'ardenas'
  | 'norte-fr'
  | 'bretana'
  | 'macizo-central'
  | 'vosgos-jura'
  | 'alpes'
  | 'pirineos'
  | 'provenza'
  | 'dolomitas'
  | 'prealpes-it'
  | 'italia-centro'
  | 'cantabrico'
  | 'meseta'
  | 'andalucia'
  | 'levante'
  | 'portugal'
  | 'mittelgebirge'
  | 'alpes-este'
  | 'escandinavia'
  | 'islas-britanicas'
  | 'balcanes'
  | 'andes'
  | 'cono-sur'
  | 'norteamerica'
  | 'australia'
  | 'asia-oriental'
  | 'golfo'
  | 'tropico'

export type MotifKind =
  | 'puerto' // subida de >= 3 km: segmento `puerto` con tramos
  | 'muro' // subida de 0,3-3 km al >= 7 %: segmento `puerto` con 1-3 tramos
  | 'cota' // repecho de 0,4-3 km al 3-7 %: segmento `puerto` corto
  | 'sector' // pavé o sterrato llano: segmento `paves` con estrellas
  | 'bajada' // segmento `descenso`
  | 'valle' // relleno entre dificultades: `llano` con tramos, amplitud por región
  | 'circuito' // un bucle de `lapKm` repetido `vueltas` veces con sus motivos por vuelta
  | 'remate' // cota tardía dentro del run-in (San Fermo, Colle Aperto)

/** Forma interna de una subida (SPEC 6.17 exige que la irregular seleccione más que la regular). */
export type ClimbShape = 'regular' | 'progresivo' | 'irregular' | 'muro-arriba' | 'muro-abajo'

export interface Motif {
  kind: MotifKind
  /**
   * Dónde acaba el motivo (cima, fin del sector, fin del valle). Fracción de la etapa en [0,1],
   * o km hasta meta si `desdeMeta` (los finales se anclan a la meta, no a la salida).
   */
  at: Band
  desdeMeta?: boolean
  /** Longitud en km. Para `circuito` es la longitud de UNA vuelta. */
  km: Band
  /** Pendiente media en %. Ausente en `sector`, `valle`, `circuito`. */
  g?: Band
  shape?: ClimbShape
  /** Estrellas del pavé (1-5). Solo `sector`. */
  estrellas?: Band
  /** Cuántas veces se repite el motivo dentro de su ventana `at` (cadena de muros, ristra de sectores). */
  n?: Band
  /** Solo `circuito`: vueltas y motivos por vuelta, con `at` medido desde la línea de cada vuelta. */
  vueltas?: Band
  porVuelta?: Motif[]
  /** Probabilidad de que el motivo aparezca (1 si falta). Los opcionales son lo que varía entre ediciones. */
  p?: number
  /** Ancla: se fija en la identidad de la carrera y no cambia entre ediciones (§6). */
  ancla?: boolean
}

export type ArchetypeFamily =
  | 'llana'
  | 'llana-cota'
  | 'circuito'
  | 'muro-final'
  | 'muros'
  | 'adoquin'
  | 'ardenas'
  | 'montana-un-dia'
  | 'media'
  | 'media-alto'
  | 'reina-alto'
  | 'reina-alto-corto'
  | 'reina-valle'
  | 'reina-corta'
  | 'cri'
  | 'cri-cuesta'
  | 'prologo'

export type FinalShape =
  'sprint' | 'muro' | 'alto' | 'cima_cerca' | 'valle_corto' | 'valle_largo' | 'sector'

export interface Archetype {
  id: string
  family: ArchetypeFamily
  /** Lo que el calendario etiqueta: `kind` para `StageSpec.kind` y `label` para la web. */
  kind: StageKind
  label: string
  km: Band
  /** Desnivel positivo esperado de la etapa entera (puertos más relleno), para el veto y la fidelidad. */
  dPlus: Band
  motifs: Motif[]
  final: FinalShape
  formats: ('un-dia' | 'etapa' | 'gran-vuelta')[]
  classes: RaceClass[] | 'todas'
  regions: GeoRegion[] | 'todas'
  /** Peso relativo dentro de su familia al sortear. */
  peso: number
  /** `extraido`: sale del extractor sobre etapas reales; `curado`: escrito a mano desde el mapa 07. */
  origen: 'extraido' | 'curado'
  /** Ids de carrera (y etapa) reales de las que se extrajo, o «mapa-07 §x.y». Solo documentación. */
  refs: string[]
}
```

### 3.2 La petición y el resultado

```ts
// packages/engine/src/routes/archetypes/generate.ts

export interface StageRequest {
  raceId: string
  /** 1-based, como `CalendarStage.index`. */
  stageIndex: number
  /** Temporada del mundo. 0 para el calendario canónico de tests. */
  season: number
  format: 'un-dia' | 'etapa' | 'gran-vuelta'
  raceClass: RaceClass
  country: string
  /** Regiones declaradas en la fila (`RaceRow.geo`); si faltan, las del país (§5.2). */
  geo?: GeoRegion[]
  /** Papel pedido por la composición o terreno de la fila; `auto` deja elegir a la geografía. */
  role: MixRole | 'prologo' | RouteTerrain | 'auto'
  /** Km pedidos; si faltan, los da el arquetipo dentro de su banda y de la clase (§8). */
  km?: number
  last?: boolean
  timeTrial?: boolean
}

export interface RouteIdentity {
  archetypeId: string
  geo: GeoRegion
  /** Realización fijada de los motivos ancla: índice en `archetype.motifs`, posición y tamaño. */
  anclas: { motif: number; at: number; km: number; g?: number }[]
  /** Cuántas variantes rota la carrera entre temporadas (1..3). */
  variantes: number
}

export interface GeneratedStage extends StageSpec {
  routeSource: 'generado'
  identity: RouteIdentity
  /** Qué motivos opcionales entraron y con qué desplazamiento: para la ficha y para los tests. */
  variante: number
}
```

`StageSpec` (`calendar.ts` l. 33-39) gana dos campos opcionales que también se ponen para lo real:

```ts
export interface StageSpec {
  kind: StageKind
  label: string
  profile: StageProfile
  timeTrial?: boolean
  /** De dónde sale el recorrido (§10). `real` = rasgos en STAGE_FEATURES; `edicion` = km y ciudades reales, relieve generado. */
  routeSource?: 'real' | 'edicion' | 'generado'
  /** Solo si `routeSource !== 'real'`: qué arquetipo y región lo dibujaron. */
  archetypeId?: string
  geo?: GeoRegion
}
```

### 3.3 Cómo una pieza se convierte en `Segment` y `Ramp`

Cada motivo instanciado produce uno o varios `Segment` (`stage/types.ts` l. 36-41), y solo cuatro tipos de segmento: `puerto`, `descenso`, `paves`, `llano`. **Nunca `rompepiernas`**: el muestreo lo colapsa a llano con `g` fijo de 1,5 % e ignora sus tramos (`stage/sample.ts` l. 100-101, mapa 03 §2), así que hoy es un tipo muerto que solo estorba a la altimetría.

| Motivo                   | Segmentos                                            | Tramos                                                                 | Por qué así                                                                                                                                                               |
| ------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `puerto` (≥ 3 km)        | un `puerto`                                          | `n = max(2, round(km / 2,2))` rampas; la forma la da `shape` (§4.5)    | `climbSize` de `stageKind.ts` (l. 36-42) suma los tramos con `g > 0` del segmento: un puerto es UN segmento para que su longitud se lea entera                            |
| `muro` (0,3-3 km, ≥ 7 %) | un `puerto`                                          | 1-3 rampas, la más dura donde diga `shape` (`muro-arriba` por defecto) | `finish.ts` decide muro por bloque (`g >= 8`, mapa 03 §2); `auto()` le pone pancarta `cima` (l. 93-102) y así cuenta como última cota aunque mida menos de `CLIMB_MIN_KM` |
| `cota` (0,4-3 km, 3-7 %) | un `puerto`                                          | 1-2 rampas                                                             | mide ≥ 0,4 km al ≥ 3 % para que `deriveFinishTerrain` la vea (mapa 03 §10.4) y cuenta en `kmSubida`                                                                       |
| `sector`                 | un `paves` con `estrellas`                           | sin tramos si es llano; con tramos si la región es ondulada            | `sample.ts` l. 105 solo cobra estrellas en `paves`                                                                                                                        |
| `bajada`                 | un `descenso`                                        | `round(km / 3)` rampas a `−max(2, g ± 1,5)`                            | igual que `descent` hoy (l. 85-93); pendiente topada a −12 % como `featureProfile.ts` l. 142                                                                              |
| `valle`                  | 1..k `llano`                                         | rampas de `1,4 + U·2,2` km a `±(0,4 + U·2,4) · amplitud`               | es `rollingFill` (`featureProfile.ts` l. 158-176) con la amplitud de la REGIÓN, no del terreno                                                                            |
| `circuito`               | la concatenación de sus `porVuelta`, `vueltas` veces | los de cada motivo                                                     | el motor no sabe qué es un circuito; le basta el patrón periódico                                                                                                         |
| `remate`                 | un `puerto` corto                                    | 1-2 rampas                                                             | es una `cota` con `desdeMeta`                                                                                                                                             |

Los banners los sigue poniendo `auto()`: una `cima` al final de cada `puerto`. Un muro de 400 m a 300 m de meta produce una pancarta en `Math.round(cum)`; `finalKindOf` mide desde ella y con el corte 0,5 (`FINAL_KIND_CUTS.alto`) lo lee como `alto`, que es lo que hoy hace con cualquier final en cota (mapa 01 §5.2).

### 3.4 La firma geográfica

```ts
// packages/engine/src/routes/archetypes/geo.ts

export interface GeoSignature {
  region: GeoRegion
  /** Longitud y pendiente de un puerto normal aquí. Recorta las bandas de los motivos `puerto`. */
  puertoKm: Band
  puertoG: Band
  /** Muros: si no existen aquí, `null`. */
  muroKm: Band | null
  muroG: Band | null
  /** Altitud máxima verosímil de una cima. Veto de plausibilidad (§9), no física. */
  cimaMaxM: number
  adoquin: 'nunca' | 'urbano' | 'masivo'
  sterrato: 'nunca' | 'raro' | 'masivo'
  /** Amplitud del valle (multiplica `RELIEF.rollingAmplitude`, `constants.ts` l. 1127-1134). */
  valle: number
  /** Forma típica de las subidas: qué `shape` sale si el motivo no lo fija. */
  shape: ClimbShape
  /** Familias que NO existen en esta región. Veto duro. */
  veta: ArchetypeFamily[]
  /** Peso del viento en llano, 0..1. Hoy solo documenta; ver §5.4. */
  viento: number
}
```

### 3.5 El esqueleto de una vuelta

```ts
// packages/engine/src/routes/archetypes/tours.ts

export type SlotRole = MixRole | 'prologo' | 'muros' | 'circuito-final'

export interface TourSlot {
  role: SlotRole
  /** Familias admitidas para dibujar esta etapa; si falta, la familia por defecto del papel. */
  families?: ArchetypeFamily[]
  /** Km de la etapa; si falta, la banda de la clase (§8). */
  km?: Band
  p?: number
}

export interface TourSkeleton {
  id: string
  n: Band
  formats: ('etapa' | 'gran-vuelta')[]
  classes: RaceClass[] | 'todas'
  /** Terreno dominante de la fila al que sirve. */
  terrains: MixTerrain[]
  slots: TourSlot[]
  /** Descansos, solo gran vuelta: `[9, 15]` como `editions.ts` l. 27. */
  restAfter?: number[]
  peso: number
  origen: 'extraido' | 'curado'
  refs: string[]
}
```

### 3.6 Dónde vive cada cosa

```
packages/engine/src/routes/
  profileGen.ts            → queda con las primitivas (rng, split, normalize, garantizaPuerto) y con los ocho
                              constructores hasta el paso 7 del plan, en que se borran
  archetypes/
    types.ts               → §3.1-3.2
    geo.ts                 → GeoRegion, GeoSignature, GEO_SIGNATURES, COUNTRY_GEO (§5)
    pieces.ts              → puerto(), muro(), cota(), sector(), bajada(), valle(), circuito() → Segment[]
    catalog.ts             → ARCHETYPES: los extraídos (regenerados por script) y los curados (a mano)
    catalog.extracted.ts   → SALIDA del extractor, «NO editar a mano», como editions.ts l. 8
    tours.ts               → TOUR_SKELETONS y composeTour()
    identity.ts            → routeIdentity(), variantOf() (§6)
    generate.ts            → generateStage(req): GeneratedStage (§4)
    vetoes.ts              → las reglas de §9, cada una como función pura con nombre
    reference.ts           → REFERENCE_STATS: cuantiles por familia de lo real (extractor) y del mapa 07 (curado)
scripts/
  extraer-arquetipos.mjs   → lee STAGE_FEATURES/CLASSIC_FEATURES/RACE_EDITIONS, escribe catalog.extracted.ts y reference.ts
```

---

## 4. El algoritmo, paso a paso

### 4.1 Semillas y subflujos

Toda la generación de una etapa sale de UNA semilla de identidad y UNA de temporada, con subflujos nominales como hace `stageRng` (`stage/rng.ts` l. 27-29):

```
idSeed   = `${raceId}|e${stageIndex}`                      // no lleva temporada: es la identidad
varSeed  = `${raceId}|e${stageIndex}|t${season}`            // lleva temporada: es la variación
rng(seed)(subflow) = routeRng(`${seed}::${subflow}`)
```

Para las etapas de edición (`stagesFromEdition`, `calendar.ts` l. 216-231) la semilla de hoy es `${from}|${to}|${km}` (l. 224); se conserva como `idSeed` de esas etapas (dos etapas de carreras distintas con la misma salida, meta y km seguirían dibujándose igual, lo que hoy ya pasa y no ha molestado) y se le añade `|t${season}` para la variación.

| Decisión                               | Subflujo     | Semilla | Por qué ahí                         |
| -------------------------------------- | ------------ | ------- | ----------------------------------- |
| región geográfica de la etapa          | `geo`        | idSeed  | una carrera no cambia de cordillera |
| arquetipo                              | `arquetipo`  | idSeed  | la arquitectura es la identidad     |
| realización de los motivos ancla       | `anclas`     | idSeed  | lo que se reconoce de un año a otro |
| cuántas variantes rota (1..3)          | `variantes`  | idSeed  |                                     |
| qué motivos opcionales entran          | `opcionales` | varSeed | es la variación deliberada          |
| posiciones y tamaños de los no ancla   | `motivos`    | varSeed |                                     |
| desplazamiento de las anclas (±jitter) | `deriva`     | varSeed |                                     |
| rampas de cada subida                  | `rampas`     | varSeed |                                     |
| relleno de los valles                  | `relleno`    | varSeed |                                     |
| reintentos tras un veto                | `reintento`  | varSeed | contador por intento, ver §4.7      |

Cada subflujo es un RNG independiente, así que añadir una tirada en `relleno` no mueve las rampas ni el arquetipo (la lección del comentario de `profileGen.ts` l. 316-317: «una tirada más y todos los perfiles de montaña cambian»).

### 4.2 Paso 1: región

`geoOf(req, rng('geo'))`: si `req.geo` trae regiones, se sortea una con pesos iguales; si no, `COUNTRY_GEO[country]` da la lista con pesos del país (§5.2); si el país no está en la tabla, la región es `'tropico'`, `'norteamerica'`, `'asia-oriental'`, `'cono-sur'` o `'balcanes'` según su continente (`packages/shared/src/regions.ts` l. 7-12) con la firma más conservadora de cada continente. Sin excepciones: toda etapa tiene región.

### 4.3 Paso 2: familia y arquetipo

`familyFor(role, format, signature)`: el papel pedido se traduce a familias admitidas:

| `role`              | Familias                                                                       | Nota                                                                                |
| ------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `llana` / `flat`    | `llana`, `llana-cota`                                                          | `llana-cota` (Sanremo, Copenhague: una cota testimonial lejos de meta) con peso 0,3 |
| `media` / `hilly`   | `media`, `muros` (solo si `signature.muroKm`), `circuito` (un día)             |                                                                                     |
| `media-alto`        | `media-alto`, `muro-final`                                                     | `muro-final` solo si `signature.muroKm`                                             |
| `reina` (etapa)     | `reina-alto`, `reina-alto-corto`, `reina-valle`, `reina-corta`                 | reparto por `ROUTE.queenFinalMix` reinterpretado (§8)                               |
| `mountain` (un día) | `montana-un-dia`; `reina-alto` solo como rareza (§9 veto 1)                    | el caso v40                                                                         |
| `classic`           | `muros`, `ardenas`, `circuito`, `muro-final`                                   | según región: Flandes → `muros`; Ardenas → `ardenas`; resto → `circuito`            |
| `cobbles`           | `adoquin` (solo si `signature.adoquin !== 'nunca'` o `sterrato !== 'nunca'`)   | si la región lo veta, cae a `muros` con log de veto                                 |
| `cri` / `itt`       | `cri`, `cri-cuesta` (p 0,15 si la región tiene puertos), `prologo` (si km ≤ 8) |                                                                                     |
| `auto`              | todas las que la firma admita                                                  | los campeonatos nacionales y las filas sin terreno                                  |

Después `pickArchetype(families, req, signature, rng('arquetipo'))` filtra `ARCHETYPES` por familia, formato, clase y región (`regions === 'todas'` o contiene la región) y sortea por `peso`. Si el filtro se queda vacío (una `.2` de `cri-cuesta` en `golfo`), se relaja en este orden: clase → región → familia siguiente de la lista. Nunca devuelve nada: el último recurso es `llana` con `regions: 'todas'`, que existe por construcción.

### 4.4 Paso 3: kilometraje

`kmOf(req, archetype, signature)`: si `req.km` viene (una fila con `km`, una edición, o la composición ya lo decidió), se usa tal cual y se cuadra al décimo con `normalize`. Si no, uniforme en `archetype.km ∩ ROUTE.kmByClass[raceClass][format]` (§8); si la intersección es vacía, manda la clase (una `.2` no corre 240 km aunque el arquetipo de Sanremo lo pida).

### 4.5 Paso 4: instanciar los motivos

Para cada motivo `m` del arquetipo, en orden:

1. **¿Entra?** Si `m.p < 1`: entra si el arquetipo lo marca en la variante activa (§6) y, si no está en ninguna variante, con `rng('opcionales') < m.p`.
2. **Cuántos**: `n = round(U(m.n))` si hay `n`, si no 1.
3. **Dónde**: para cada repetición, `at = U(m.at)` en fracción de etapa (o km desde meta si `desdeMeta`), con `rng('motivos')`; si el motivo es ancla, `at` viene de la identidad y solo se desplaza `±ARCHETYPE.anchorJitter` con `rng('deriva')`. Las `n` repeticiones se ordenan y se separan al menos `ARCHETYPE.minGapKm` (por defecto 1,5 km, en `muros` 0,8); si no caben, se reduce `n`.
4. **Cuánto**: `km = U(m.km)` y `g = U(m.g)`, recortados a la firma: para `puerto`, `km` se recorta a `signature.puertoKm` y `g` a `signature.puertoG`; para `muro`, a `muroKm` y `muroG` (si son `null`, el motivo se convierte en `cota`); para `sector`, si `adoquin === 'nunca'` y `sterrato === 'nunca'`, el motivo se descarta.
5. **Forma**: `shape = m.shape ?? signature.shape`. Las rampas salen de `rampsFor(km, g, shape, rng('rampas'))`:
   - `regular`: `n` rampas a `g ± 0,6`;
   - `progresivo`: lo que hoy hace `climb` (l. 72-82), `prog · 1,6 ± 1,2`;
   - `irregular`: alterna rampas a `g − 2,5` y `g + 3`, con una al `g + 5` en posición sorteada (Angliru, Machucos);
   - `muro-arriba` / `muro-abajo`: 2-3 rampas, la más dura (`g + 4`) en la cima o en el pie.
     Todas cuadran la media ponderada a `g` exacto como `climbRamps` (`featureProfile.ts` l. 129-132), así el desnivel del motivo es `km · g · 10` sin deriva.
6. **Circuito**: `vueltas = round(U(m.vueltas))`, `lapKm = U(m.km)`; los `porVuelta` se instancian una vez (son las mismas cotas cada vuelta, con `at` medido desde la línea) y se repiten `vueltas` veces al final de la etapa; la parte lineal previa es un `valle`.

Resultado: una lista de **dificultades colocadas** `{ kind, fin: km absoluto, km, g, shape, estrellas }` ordenada por `fin`. Una cota real sale entera de aquí; ningún paso posterior le cambia longitud ni pendiente, solo `normalize` la escala con toda la etapa (factor ≈ 1 porque `kmOf` ya cuadró).

### 4.6 Paso 5: tender la carretera

`layout(dificultades, km, signature, archetype.final, rng('relleno'))` recorre las dificultades y rellena:

- Entre dos dificultades: si la anterior era `puerto` o `muro`, primero una `bajada` que pierde el 85 % de lo subido con pendiente topada a −12 % (la regla de `featureProfile.ts` l. 391-435 y l. 142, ya calibrada contra Lombardía) y como mucho el 65 % del hueco; el resto, un `valle` con amplitud `RELIEF.rollingAmplitude[terreno] · signature.valle`. Dos puertos encadenados (hueco < 1,5 km) no llevan valle: solo la bajada corta o nada (Stelvio-Gavia, Crocetta-Zambla).
- Tras la última dificultad, según `archetype.final`: `alto` nada (el último segmento es el `puerto`); `muro` nada (el muro es la meta); `cima_cerca` bajada de 1,5-5 km; `valle_corto` bajada más valle hasta 6-20; `valle_largo` 22-45; `sprint` valle hasta meta; `sector` el sector es lo último y detrás quedan ≤ 1,5 km de `llano`. Las bandas van con la holgura que el mapa 01 §2.5 echa en falta: `cima_cerca` 1,5-4,6, `valle_corto` 6-19,5, `valle_largo` 21-45, para que un estirón de `normalize` no cruce un corte de `FINAL_KIND_CUTS`.
- Antes de la primera dificultad: `valle`.

Después `normalize(segs, km)` (l. 141-177, sin cambios) y, si el arquetipo es de familia `reina-*`, `garantizaPuerto(…, 8.6, null)`; si es `media-alto`, `garantizaPuerto(…, null, 8.0)` (8,0 y no 8,4: el mapa 01 §5.1 midió 2 de 1.500 cruces con 8,4 porque `climbSize` suma tramos redondeados y `garantizaPuerto` mira `segment.km`).

### 4.7 Paso 6: vetos y reintento

`vetoes(profile, req, archetype, signature)` devuelve la lista de reglas de §9 que fallan. Si está vacía, fin. Si no, se reintenta con los mismos subflujos de identidad y con `rng('reintento')` mezclado en `motivos`, `rampas` y `relleno` (`routeRng(`${varSeed}::motivos::${intento}`)`), hasta `ARCHETYPE.maxAttempts` (6). Si sigue fallando, se pasa al siguiente arquetipo de la lista filtrada (§4.3) y se anota en `GeneratedStage.identity` el `archetypeId` final. Nunca se devuelve un perfil vetado: el último recurso (`llana`, `regions: 'todas'`) no tiene vetos que puedan fallar salvo los estructurales (km > 0, banners en rango), que se cumplen por construcción.

Coste: cada intento es O(motivos + segmentos); con 1.418 etapas al cargar el módulo y una media medida de intentos que el paso 4 del plan tiene que dejar por debajo de 1,3, el arranque no se nota. El coste de simulación no cambia: `sampleProfile` produce los mismos `round(km / 0,1)` bloques (`sample.ts` l. 70), y el número de segmentos solo encarece el muestreo, que es O(n · segmentos) una vez por etapa (mapa 03 §7). Se pone un tope de seguridad, `ARCHETYPE.maxSegments` = 120, como veto estructural (Roubaix real tiene 31 sectores y unos 70 segmentos tras `applyCobbles`).

### 4.8 Paso 7: etiquetar

`kind` y `label` NO se copian del arquetipo: se derivan con `stageKindOf(profile, timeTrial)` (`stageKind.ts` l. 71) y se comprueba que coinciden con lo que el arquetipo prometió; si no, es un veto (§9, regla 12) y se reintenta. Así el calendario y `apps/api/src/stageHistory.ts` dicen lo mismo de la misma etapa por construcción, y la cifra literal de `stageHistory.test.ts` l. 199 (49 etapas cuya etiqueta cambia) baja a las que cambien SOLO por `SUMMIT_RUN_IN_KM` (l. 73): un final `cima_cerca` de ≤ 5 km sigue etiquetado «Summit finish» por el etiquetador y «Mountains» por el calendario, y ésa es la única fuente de diferencia que queda. Es lo que R28.1(b) pedía (`docs/tactica.md`, según mapa 05 §9) y no se hizo.

---

## 5. La geografía: cómo entra el país

### 5.1 Las firmas

`GEO_SIGNATURES: Record<GeoRegion, GeoSignature>` se escribe a mano desde el mapa 07 §3 (25 filas) y se marca `curado`: no hay dato del repositorio que la sustituya y el mapa 07 lo dice («los números son orientativos y se dan siempre como rangos»). Extracto, con los valores propuestos:

| Región           | `puertoKm` | `puertoG` | `muroKm` × `muroG`   | `cimaMaxM` | adoquín | sterrato       | `valle` | `shape`     | `veta`                                                            |
| ---------------- | ---------- | --------- | -------------------- | ---------- | ------- | -------------- | ------- | ----------- | ----------------------------------------------------------------- |
| flandes          | [1, 2,5]   | [3, 6]    | [0,3; 2,2] × [5, 13] | 350        | masivo  | raro           | 0,7     | muro-abajo  | reina-*, montana-un-dia, media-alto, cri-cuesta                   |
| ardenas          | [1, 4,5]   | [5, 9]    | [0,8; 2] × [8, 12]   | 700        | urbano  | nunca          | 1,0     | progresivo  | reina-*, adoquin                                                  |
| norte-fr         | [0,5; 2]   | [3, 6]    | [0,3; 1,5] × [5, 10] | 250        | masivo  | raro           | 0,55    | regular     | reina-*, montana-un-dia, media-alto                               |
| bretana          | [0,5; 2]   | [4, 8]    | [0,5; 2] × [6, 10]   | 400        | urbano  | raro (ribinoù) | 0,85    | muro-arriba | reina-*, montana-un-dia                                           |
| macizo-central   | [5, 13]    | [5, 8]    | [1, 2] × [8, 12]     | 1.900      | nunca   | nunca          | 1,15    | progresivo  | adoquin, llana (una llana del Macizo suma 2.500 m, mapa 07 §3.14) |
| vosgos-jura      | [5, 17]    | [6, 9]    | [1, 2] × [8, 14]     | 1.900      | nunca   | nunca          | 1,15    | irregular   | adoquin                                                           |
| alpes            | [12, 25]   | [5,5; 9]  | null                 | 2.800      | nunca   | nunca          | 1,15    | regular     | adoquin, muros, muro-final                                        |
| pirineos         | [10, 17]   | [7, 8,7]  | null                 | 2.400      | nunca   | nunca          | 1,15    | progresivo  | adoquin, muros, muro-final                                        |
| provenza         | [8, 22]    | [6, 8]    | [1, 2] × [7, 9]      | 1.900      | nunca   | nunca          | 1,0     | regular     | adoquin                                                           |
| dolomitas        | [7, 14]    | [7,5; 12] | null                 | 2.300      | nunca   | nunca          | 1,15    | muro-arriba | adoquin, muros, llana                                             |
| prealpes-it      | [4, 13]    | [6, 8]    | [1, 2] × [10, 16]    | 1.400      | nunca   | nunca          | 1,0     | irregular   | adoquin, reina-alto (largo)                                       |
| italia-centro    | [1, 6]     | [6, 12]   | [0,5; 2] × [10, 20]  | 1.700      | urbano  | masivo         | 1,0     | muro-arriba | adoquin                                                           |
| cantabrico       | [5, 15]    | [7, 10]   | [1, 4] × [10, 15]    | 1.800      | nunca   | nunca          | 1,15    | irregular   | adoquin, llana (> 40 km de llano)                                 |
| meseta           | [3, 8]     | [4, 6]    | null                 | 2.250      | nunca   | nunca          | 0,55    | regular     | adoquin, muros                                                    |
| andalucia        | [7, 20]    | [6, 8]    | null                 | 2.500      | nunca   | nunca          | 0,85    | regular     | adoquin, muros                                                    |
| levante          | [3, 22]    | [5, 12]   | [1, 4] × [10, 12]    | 1.550      | nunca   | nunca          | 0,85    | irregular   | adoquin                                                           |
| portugal         | [3, 30]    | [5, 7]    | [1, 2,6] × [8, 10]   | 2.000      | urbano  | nunca          | 1,0     | regular     | adoquin                                                           |
| mittelgebirge    | [2, 12]    | [4, 7,5]  | [0,5; 1,5] × [7, 10] | 1.600      | urbano  | nunca          | 0,85    | regular     | reina-alto (largo), adoquin                                       |
| alpes-este       | [7, 20]    | [6, 11]   | null                 | 2.700      | nunca   | nunca          | 1,15    | progresivo  | adoquin, muros                                                    |
| escandinavia     | [0,3; 10]  | [5, 9]    | [0,3; 1] × [5, 8]    | 1.200      | urbano  | nunca          | 0,7     | regular     | reina-*, adoquin (masivo)                                         |
| islas-britanicas | [1, 9]     | [6, 10]   | [0,25; 2] × [10, 20] | 650        | urbano  | nunca          | 1,0     | muro-arriba | reina-alto, adoquin                                               |
| balcanes         | [10, 25]   | [5,5; 7]  | null                 | 2.100      | nunca   | nunca          | 1,0     | regular     | adoquin, muros                                                    |
| andes            | [15, 40]   | [4, 7]    | null                 | 3.700      | nunca   | nunca          | 1,15    | regular     | adoquin, muros, llana (a nivel del mar)                           |
| cono-sur         | [10, 30]   | [4, 6]    | null                 | 2.600      | nunca   | nunca          | 0,55    | regular     | adoquin, muros, media (húmeda)                                    |
| norteamerica     | [5, 30]    | [4, 9]    | [1, 2] × [8, 12]     | 3.700      | nunca   | raro (gravel)  | 0,85    | regular     | adoquin                                                           |
| australia        | [1,5; 3]   | [7, 11]   | [1, 3] × [7, 11]     | 1.600      | nunca   | nunca          | 0,85    | muro-arriba | reina-*, adoquin                                                  |
| asia-oriental    | [5, 40]    | [3, 10]   | [1, 2] × [6, 8]      | 3.800      | nunca   | nunca          | 0,7     | regular     | adoquin, muros                                                    |
| golfo            | [5, 20]    | [5, 10]   | [1, 3] × [6, 8]      | 1.900      | nunca   | nunca          | 0,4     | regular     | adoquin, muros, media, ardenas                                    |
| tropico          | [5, 20]    | [4, 8]    | [1, 2] × [6, 9]      | 2.000      | nunca   | nunca          | 0,85    | regular     | adoquin, muros                                                    |

`veta` recoge las reglas negativas 3, 4, 5 y 9 del mapa 07 §4.4 como datos y no como código. `cimaMaxM` no entra en la física (el perfil no tiene altitud, mapa 03 §1) pero sí en un veto: un arquetipo de reina con `dPlus` > `cimaMaxM · 2,2` no se instancia en esa región (una etapa de 4.800 m en Flandes no existe ni encadenando todos los bergs).

### 5.2 Del país a la región

`COUNTRY_GEO: Record<string, [GeoRegion, peso][]>` se escribe a mano para los 56 países de las carreras de equipos (mapa 02 §10) y los 133 de `COUNTRIES` (`packages/shared/src/countries.ts` l. 13), siguiendo el patrón de `PAIS_ZONA` en `world/climate.ts` l. 63-135, que hoy ya es la única tabla país → zona del motor. Ejemplos:

```ts
FR: [
  ['norte-fr', 2],
  ['bretana', 2],
  ['macizo-central', 2],
  ['vosgos-jura', 1],
  ['alpes', 2],
  ['pirineos', 1],
  ['provenza', 1],
]
BE: [
  ['flandes', 3],
  ['ardenas', 2],
]
ES: [
  ['cantabrico', 2],
  ['meseta', 2],
  ['andalucia', 1],
  ['levante', 2],
  ['pirineos', 1],
]
IT: [
  ['prealpes-it', 2],
  ['italia-centro', 2],
  ['dolomitas', 1],
  ['alpes', 1],
]
NL: [['flandes', 1]] // Limburgo es «flandes» a estos efectos: bergs de 1-2 km y pólder
CO: [['andes', 1]]
AE: [['golfo', 1]]
```

Con un solo país por carrera (`CalendarRace.country`, l. 69-72: «se abstrae a un solo país») la región se sortea UNA vez por carrera con `rng('geo')` sobre `${raceId}` y se hereda en todas sus etapas, salvo gran vuelta, donde se sortea por bloques de etapas (§7.3). Además `RaceRow` (l. 381-398) gana un campo opcional `geo?: GeoRegion[]` para curar a mano las carreras cuyo nombre lo dice (`race-jura` → `['vosgos-jura']`, `race-tramuntana` → `['levante']`, `race-mercantour` → `['alpes']`, `race-jaen` → `['andalucia']`, `race-rutland` → `['islas-britanicas']`). Es una tabla de 310 filas que se rellena en el paso 1 del plan para las que sean obvias y se deja vacía en el resto (cae a `COUNTRY_GEO`). Las ciudades de `RACE_ROUTES` (`raceRoutes.ts`) no se parsean: es un dato de presentación sin fuente (mapa 02 §8) y sacar geografía de un nombre sería inventar.

### 5.3 Qué hace la región, en concreto

1. Recorta las bandas de longitud y pendiente de cada motivo `puerto` y `muro` (§4.5.4). Una `reina-alto` en `andes` sale con puertos de 15-40 km al 4-7 %; la misma en `pirineos`, 10-17 km al 7-8,7 %; en `cantabrico`, 5-15 al 7-10 % e `irregular`.
2. Filtra las familias (`veta`) antes de sortear el arquetipo. `nc-nl-road` ya no puede ser una clásica de muros de 2,5 km al 12 %: será `circuito` o `muros` flamencos con `muroKm` ≤ 2,2.
3. Decide si hay `sector` y de qué: `adoquin: 'masivo'` admite `adoquin` completo (Roubaix, Flandes); `urbano` solo 1-2 sectores cortos en un `circuito` o `muros`; `sterrato: 'masivo'` (Toscana) convierte los sectores en tierra (mismo `paves` con estrellas; el motor no distingue firmes, `classicRoutes.ts` l. 594 ya codifica Strade así).
4. Da la amplitud del valle y la forma por defecto de las subidas.
5. Da el prior de composición de una vuelta (§7.2): en `golfo` los esqueletos con dos finales en alto y cuatro llanas; en `andes`, ninguno con etapa llana.

### 5.4 Lo que la geografía NO hace en E1, y queda dicho

El viento y el clima son propiedades de la etapa sorteadas de la semilla y de `StageInput.lugar` (mapa 03 §5), no del perfil: `signature.viento` se guarda en `GeneratedStage.geo` para que un encargo posterior (el de táctica que trate el abanico) pueda darle al motor un prior de viento por etapa, pero en E1 no cambia nada del motor. La altitud tampoco: no hay campo en `Segment` y no se propone añadirlo aquí (§13).

---

## 6. La identidad entre ediciones

### 6.1 Qué es la identidad de una carrera generada

`routeIdentity(req)` calcula, solo con `idSeed`, la región, el arquetipo, la realización de los motivos ancla y cuántas variantes rota la carrera. Los ancla los declara el arquetipo (`Motif.ancla`): en `montana-un-dia` son el puerto largo del día y el muro final; en `adoquin`, los sectores de cinco estrellas; en `reina-alto`, el puerto de meta; en `circuito`, el circuito entero. Es lo que el aficionado reconoce: «la carrera del muro a cinco de meta», «la del puerto de 18 km a sesenta».

### 6.2 Qué cambia de temporada en temporada

`variantOf(identity, season)`: `variante = season % identity.variantes` decide qué motivos opcionales (`p < 1`) entran (cada variante lleva una máscara fija sorteada con `rng('variantes')` en la identidad); `rng('deriva')` desplaza las anclas `±ARCHETYPE.anchorJitter` (0,02 de la etapa: 4 km en 200) y `rng('motivos')` recoloca los no ancla dentro de su banda. El kilometraje se mueve `±ARCHETYPE.kmSeasonJitter` (3 %) salvo que venga fijado por edición o fila. Nunca cambia el arquetipo, la región, ni el número ni el orden de las anclas.

Con `identity.variantes = 1` la carrera es idéntica cada año salvo la deriva pequeña, que es el caso de Roubaix o Huy; con 3, rota tres trazados como hacen Lombardía (Como / Bérgamo) o el Amstel. El sorteo de `variantes` da 1 con 0,5, 2 con 0,3 y 3 con 0,2 (`ARCHETYPE.variantMix`).

### 6.3 Cómo entra la temporada en el calendario

`SEASON_CALENDAR` es una constante de módulo (`calendar.ts` l. 3643-3648) y no hay temporada en ningún sitio del motor (mapa 02 §11). Propuesta mínima:

```ts
export function calendarFor(season: number): CalendarRace[] // memoizado por temporada
export const SEASON_CALENDAR = calendarFor(0) // lo que todos los consumidores importan hoy
```

`buildRace(row, season)` pasa `season` a `generateStage`; las etapas reales y de edición con rasgos no dependen de ella. `freezeRaceRoute` (`db/raceRoutes.ts` l. 35-55) recibe la temporada del mundo (el implementador la toma donde `calendarRun.ts` l. 1603 la llama; la clave `race_key` ya la lleva según `recorridoDelMundo.test.ts`, mapa 06 §3.5) y congela `calendarFor(season)`. Todo lo que hoy lee `SEASON_CALENDAR` (bancos, tests, `world.ts`, la API para etapas no corridas) sigue leyendo la temporada 0 y no cambia de conducta. La API de la ficha (`apps/api/src/routes/calendar.ts` l. 91-105) pasa a leer `calendarFor(temporadaDelMundo)` para etapas no corridas, con lo que además se cierra el punto 4 del mapa 03 §9 (la altimetría de una etapa futura enseñaba el código de hoy y no lo congelado).

### 6.4 Lo real no varía

Una etapa con rasgos en `STAGE_FEATURES` es la edición que se cargó (`classicRoutes.ts` l. 15-22: «la edición usada se anota siempre») y se repite temporada tras temporada tal cual. Las de edición sin rasgos conservan km, ciudades y terreno, y varían solo el relieve generado con la regla de arriba. Cambiar esto (por ejemplo, rotar entre dos ediciones cargadas de Lombardía) es contenido y va a E12.

---

## 7. Vueltas por etapas: la composición

### 7.1 Lo que se extrae de `RACE_EDITIONS`

Las 57 ediciones por etapas de `editions.ts` (3 grandes vueltas y 54 de una semana, mapa 02 §7) son secuencias verificadas de `EditionTerrain` por etapa (l. 10-17), con `km` y `restAfter`. El extractor (§11.4) las agrupa por `(n, terreno dominante)` y produce `TOUR_SKELETONS` con `origen: 'extraido'`: para cada `n` observado, la lista de secuencias con su frecuencia, traducida a `SlotRole` (`itt` → `cri` o `prologo` si km ≤ 8; `mountain` → `reina`; `hilly` con última etapa → `media-alto` si la fila lo era; `cobbles` → `muros`). Ejemplo real (Race France 2026, l. 26-48): `cri(20) · media · media · media · llana · reina · llana · llana · media │ reina · llana · llana · media · reina · reina · cri(26) · media · reina · reina · reina · llana`, descansos tras la 9 y la 15.

Para los `n` sin edición (2, 9, 11: mapa 02 §2) y para las `.2` de 3-5 días, se curan esqueletos desde el mapa 07 §2.2-2.3 con `origen: 'curado'`: por ejemplo `.2` de 4 etapas: `[prologo|llana, media, media-alto|reina-corta, llana|circuito-final]`, con crono el día 1 o ninguna, nunca dos.

### 7.2 `composeTour(req)`: cómo se elige y se realiza

1. Filtrar `TOUR_SKELETONS` por `n`, formato, clase y terreno de la fila; sortear por `peso` con `rng('esqueleto')` sobre `${raceId}` (identidad: una vuelta no cambia de estructura entre temporadas).
2. Cada `slot` con `p < 1` entra o no por la variante de la temporada (§6.2), con la regla de que la crono y el último día no son opcionales.
3. Km por slot: `slot.km ?? ROUTE.kmByClass[raceClass].etapa[role]` (§8), última etapa × `lastStageKmFactor` como hoy.
4. Cada slot llama a `generateStage` con `role`, `families` del slot y la región de la carrera. En gran vuelta las regiones se sortean por bloques: el esqueleto marca `bloques` (semana 1, semana 2, semana 3) y cada bloque recibe una región de `COUNTRY_GEO` distinta si el país tiene varias (Bretaña, Macizo, Alpes en Francia).
5. **Garantías, ahora como vetos de composición** (§9, reglas 13-16): las de `mixRoles` (l. 457-519) se conservan como comprobación y no como constructor: ninguna vuelta sin crono ni final en alto; mínimo de selectivas por terreno; una vuelta de 4+ con al menos un final en alto; la primera etapa no es `reina` (se relaja «siempre llana»: Limone 2025 fue la 2 y Tagliacozzo la 7, mapa 07 §2.1, y los esqueletos extraídos empiezan a veces por `cri` o `media`). Un esqueleto que las viole no entra en el catálogo: `tours.test.ts` lo comprueba sobre el catálogo entero, no sobre 120 semillas.

### 7.3 Lo que corrige respecto a `stageMix`

- `mixWeights.mountain = [0,16; 0,26; 0,18; 0,40]` (`constants.ts` l. 1224) da un 40 % de reinas; una gran vuelta real lleva 4-6 de alta montaña con final en alto sobre 21 (mapa 07 §2.1). Los esqueletos extraídos dan la proporción real por construcción; `mixWeights` deja de usarse.
- Existen bloques de montaña de 2-3 días con transiciones, la reina en la 15-20 y el descanso tras la 9 y la 15 (`restAfter` del esqueleto, hoy solo lo llevan cuatro ediciones, mapa 02 §1).
- Una vuelta `cobbles` deja de componerse como `flat` (`mixTerrain`, l. 416-420): tiene esqueleto propio (`benelux`: llanas con viento, crono corta, final en muros).
- Km por clase: una `.2` de 5 etapas hoy sale con etapas de 165-195 km (`kmFlat` [165, 30], l. 1240), «la vuelta .2 más larga de Europa» (mapa 07 §4.1). Con `kmByClass` una `.2` corre 100-160.
- Las 142 carreras de un día sin `km` en la fila miden 210 clavados (`row.km ?? 210`, l. 917): pasan a la banda del arquetipo cortada por la clase.

---

## 8. Constantes

Todas en `constants.ts`, bloque nuevo `ARCHETYPE` junto a `ROUTE` (l. 1151), cada una con su comentario de intención. Las de `ROUTE` que dejan de usarse (`mixWeights`, `selectiveMinFraction`, `lastDecisiveChance`, `lastSummitShare`, `kmFlat/kmHilly/kmUphill/kmSummit`) se borran en el paso 7 del plan con nota en `balance.md`; las de la crono (`ittMinStages`, `ittChance*`, `ittKm*`) pasan a ser vetos y bandas de esqueleto.

| Nombre                            | Valor                                                                                                                                                               | Intención                                                                            | En qué se apoya                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `ARCHETYPE.maxAttempts`           | 6                                                                                                                                                                   | reintentos por veto antes de pasar al siguiente arquetipo                            | coste de arranque acotado; el paso 4 mide la media                                                     |
| `ARCHETYPE.maxSegments`           | 120                                                                                                                                                                 | tope estructural de segmentos por etapa                                              | Roubaix real ≈ 70 tras `applyCobbles`; no hay tope hoy (mapa 03 §7)                                    |
| `ARCHETYPE.minGapKm`              | 1,5 (`muros`: 0,8)                                                                                                                                                  | separación mínima entre dificultades repetidas                                       | Flandes tiene bergs a 1,7 km (Kwaremont-Paterberg, `classicRoutes.ts` l. 456-457)                      |
| `ARCHETYPE.anchorJitter`          | 0,02                                                                                                                                                                | deriva de una ancla entre temporadas, en fracción de etapa                           | 4 km en 200: se reconoce y no se repite al metro                                                       |
| `ARCHETYPE.kmSeasonJitter`        | 0,03                                                                                                                                                                | variación del kilometraje entre temporadas                                           | Omloop 202,2 → 207,2 entre ediciones (`fuentes-recorridos.md` regla 1)                                 |
| `ARCHETYPE.variantMix`            | {1: 0,5; 2: 0,3; 3: 0,2}                                                                                                                                            | cuántas variantes rota una carrera                                                   | Roubaix/Huy fijas, Lombardía y Amstel rotan                                                            |
| `ARCHETYPE.oneDaySummitMaxKm`     | 5                                                                                                                                                                   | subida final máxima de una carrera de un día que muera arriba                        | mapa 07 §1.2: 0,3-5 km, «ninguna llega a 6»; caso v40                                                  |
| `ARCHETYPE.oneDayLongSummitShare` | 0,02                                                                                                                                                                | frecuencia con que una `.1` de un día puede morir en un puerto largo                 | Ventoux, Mercan'Tour: «tres carreras sobre doscientas»                                                 |
| `ARCHETYPE.wallMaxKm`             | 3                                                                                                                                                                   | un muro mide como mucho esto                                                         | `WALL_MAX_KM` de `stageKind.ts` l. 60; se cita, no se duplica                                          |
| `ARCHETYPE.wallMinGrade`          | 7                                                                                                                                                                   | pendiente media mínima de un muro                                                    | Kemmelberg 9, Kwaremont 4 (ése es `cota`); `finish.ts` cuenta muro por bloque ≥ 8                      |
| `ARCHETYPE.queenFinalKm`          | [8,6; 22]                                                                                                                                                           | banda del puerto de meta de una reina larga                                          | gran vuelta 8-22 km al 6,5-9 % en el 70-80 % (mapa 07 §4.3); suelo 8,6 de `garantizaPuerto`            |
| `ARCHETYPE.queenShortFinalKm`     | [4, 7]                                                                                                                                                              | banda del puerto de meta de `reina-alto-corto`                                       | Planche 5,9 × 8,5; Xorret 3,9 × 11,4; Tre Cime 7,2                                                     |
| `ARCHETYPE.queenShortFinalG`      | [8, 12]                                                                                                                                                             | idem pendiente                                                                       | ídem                                                                                                   |
| `ARCHETYPE.queenShortFinalShare`  | 0,25                                                                                                                                                                | qué parte de las `reina-alto` es corta y empinada                                    | «el resto» del 70-80 %                                                                                 |
| `ARCHETYPE.queenFamilyMix`        | {alto: 0,45; cima_cerca: 0,20; valle_corto: 0,25; valle_largo: 0,10}                                                                                                | reparto de familias de reina en etapa                                                | es `ROUTE.queenFinalMix` (l. 1189) trasladado; se conserva porque `docs/tactica.md` l. 5580 lo compara |
| `ARCHETYPE.queenDplus`            | gran vuelta [3.200; 5.200], una semana [2.400; 4.200], `.2` [2.000; 3.500]                                                                                          | desnivel objetivo por formato y clase, uniforme en logaritmo                         | mapa 07 §4.1; sustituye `queenDplusRange` 60/40 (§11.2 explica qué pasa con la cola baja)              |
| `ARCHETYPE.fillDplusShare`        | 0,25                                                                                                                                                                | qué parte del `dPlus` objetivo se deja al relleno                                    | medido hoy: el relleno «bumpy» pone ~1.017 m sobre 2.840 de puertos (mapa 01 §1)                       |
| `ROUTE.kmByClass`                 | WT {unDia [200, 260], etapa [150, 200]}, Pro {[180, 230], [140, 185]}, 1 {[160, 210], [130, 175]}, 2 {[140, 180], [100, 160]}, NC {road [180, 240], u23 [140, 180]} | bandas de kilometraje por clase y formato                                            | mapa 07 §4.1; hoy no hay banda por clase                                                               |
| `ROUTE.ittByClass`                | WT [14, 40], Pro [12, 32], 1 [10, 28], 2 [5, 20], NC [30, 45]                                                                                                       | crono por clase                                                                      | Dauphiné 30-35, prólogos 3-8, NC 38 hoy                                                                |
| `ARCHETYPE.prologueMaxKm`         | 8                                                                                                                                                                   | por debajo, la crono es prólogo                                                      | Romandía, Dauphiné                                                                                     |
| `ARCHETYPE.cobbleSectorsByFamily` | adoquin {n [18, 31], km [0,3; 3,7], estrellas [1, 5]}, muros {n [3, 8], km [0,5; 2,5], estrellas [2, 3]}                                                            | densidad de sectores                                                                 | Roubaix 29-31 y 54-57 km; Flandes 5-7 (mapa 07 §1.3-1.4); hoy `[3, 5, 4]` fijo                         |
| `ARCHETYPE.copyMaxCorr`           | 0,85                                                                                                                                                                | correlación máxima admitida entre una generada y cualquier real de su familia (test) | §11.5; no es runtime                                                                                   |
| `ARCHETYPE.copyMaxPositionHits`   | 0,6                                                                                                                                                                 | fracción máxima de dificultades a ±1 % de las de una misma real                      | ídem                                                                                                   |
| `ARCHETYPE.fidelityTol`           | 0,15                                                                                                                                                                | tolerancia relativa por cuantil entre generado y referencia                          | §11.4                                                                                                  |
| `ARCHETYPE.minRealForExtracted`   | 3                                                                                                                                                                   | etapas reales necesarias para que una familia tenga arquetipo `extraido`             | por debajo se cura a mano y se ensancha ±25 %                                                          |

---

## 9. Reglas de veto y plausibilidad

Cada regla es una función pura en `vetoes.ts` con nombre, y `vetoes.test.ts` la prueba con un perfil que la viola y otro que no. Las de perfil se evalúan sobre el `StageProfile` ya normalizado; las de composición, sobre la lista de `StageSpec` de la vuelta.

**De perfil (una etapa):**

1. **`unDiaNoMuereEnPuertoLargo`** (el caso v40): si `format === 'un-dia'` y el último segmento es `puerto` con `climbSize(...).km > ARCHETYPE.oneDaySummitMaxKm` (5), veto, salvo que el arquetipo sea `reina-alto` marcado `rareza` y la carrera sea `.1` y `rng('arquetipo')` lo haya admitido con `oneDayLongSummitShare` (0,02). Con el catálogo de hoy Race Jura (`.1`, `mountain`, un día) saldría `montana-un-dia` con muro final de 1,3-4,2 km a 5-17 km de meta el 98 % de las veces, y una vez cada cincuenta un Ventoux declarado como tal.
2. **`reinaEsReina`**: familia `reina-*` ⇒ `stageKindOf(profile, false).kind === 'reina'`. Sujeta lo que hoy sujetan `garantizaPuerto(…, 8.6, null)` (l. 413) y el test de `stageKind.test.ts` l. 66-92. En `reina-alto-corto` obliga a un intermedio ≥ 9 km o a ≥ 3.200 m; el arquetipo lo declara y el veto lo comprueba.
3. **`mediaEsMedia`**: familia `media`, `media-alto` ⇒ `kind === 'media'`, ninguna cota ≥ 8,5 km y < 3.200 m acumulados. Es la regla negativa 2 del mapa 07 §4.4 leída al revés.
4. **`muroEsMuro`**: todo motivo `muro` instanciado mide ≤ 3 km (`WALL_MAX_KM`) y ≥ 7 % de media; `clasica` de muros ⇒ cota más larga ≤ 3 km (`stageKind.ts` l. 86).
5. **`adoquinDondeLoHay`**: ningún `paves` si `signature.adoquin === 'nunca' && signature.sterrato === 'nunca'`. Las 20 filas `cobbles` del calendario caen en BE, FR, GB e IT (mapa 07 §3, consecuencia 1), así que hoy no se dispara; existe para las filas futuras.
6. **`cimaVerosimil`**: `dPlus` de la etapa ≤ `signature.cimaMaxM · 2,2` y cota más larga ≤ `signature.puertoKm[1] · 1,2`. Una reina de 25 km de puerto no sale en `cantabrico`; una de 4.800 m no sale en `flandes`.
7. **`finalDeclarado`**: `finalKindOf(profile)` coincide con `archetype.final` cuando éste es `alto`, `cima_cerca`, `valle_corto` o `valle_largo`; `sprint` ⇒ `finalKindOf === null` o `valle_largo`; `muro` ⇒ último segmento `puerto` de ≤ 1,5 km al ≥ 8 %; `sector` ⇒ último `paves` a ≤ 1,5 km de meta.
8. **`sinRompepiernas`**: ningún segmento `rompepiernas` (tipo muerto, mapa 03 §2 punto 4).
9. **`kmExactos`**: `Σ km === req.km` al décimo (lo que `calendar.test.ts` l. 162-174 exige para las ediciones) y todo segmento ≥ 0,5 km, todo banner en `[0, round(total)]` (l. 108-121).
10. **`segmentosAcotados`**: ≤ `ARCHETYPE.maxSegments`.
11. **`valleConHolgura`**: km tras la última cota a más de 0,3 km de cualquier corte de `FINAL_KIND_CUTS` (0,5 / 5 / 20): cierra los cruces de cubeta medidos en el mapa 01 §2.5.
12. **`etiquetaCoherente`**: `stageKindOf(profile, timeTrial)` da el `kind` y `label` que el arquetipo promete (§4.8).
13. **`llanaEsLlana`**: familia `llana` ⇒ `dPlus` ≤ 1.800 m y ningún `puerto` ≥ 3 km (regla negativa 10); `llana-cota` admite una `cota` ≤ 6 km a ≥ 40 km de meta (Cipressa).
14. **`cronoSinPuertoSalvoCuesta`**: `cri` ⇒ ningún `puerto`; `cri-cuesta` ⇒ exactamente uno, el último, ≤ 12 km.

**De composición (una vuelta):**

15. **`algoQueMorder`**: crono o final en alto (`isUphill`) en toda vuelta de ≥ 3 etapas; en 4+, al menos un final en alto (`uphillFinishMinStages` hoy, l. 1236).
16. **`sinDosCronosLargas`**: ≤ 1 crono > 20 km en una semana; `.2` de 3-5: ≤ 1 crono y ninguna > 20; gran vuelta: 1-2 cronos, la segunda ≥ 8 km y fuera de la etapa 1 solo si es prólogo (regla negativa 6).
17. **`bloquesDeMontana`**: ninguna racha de > 3 reinas seguidas ni de > 4 llanas seguidas (mapa 07 §2.1 regla 4); gran vuelta: ≤ 7 etapas de alta montaña, reina de más desnivel en la 13-20, descansos tras la 9 y la 15.
18. **`primeraNoReina`** y **`ultimaCoherente`**: la etapa 1 no es `reina`; la última de una gran vuelta es `llana` o `cri` salvo esqueleto que declare lo contrario.
19. **`kmPorClase`**: toda etapa dentro de `ROUTE.kmByClass` y ninguna `.2` > 180 km (regla negativa 8).

Los vetos se comprueban también sobre el catálogo entero en `catalog.test.ts`: cada arquetipo se instancia 300 veces en su banda de km y en cada región que admite, y ninguna instancia puede fallar más de `maxAttempts` veces seguidas. Un arquetipo que no pase no entra.

---

## 10. Lo real frente a lo generado

### 10.1 Prioridad, sin cambios de fondo

`buildRace` (l. 899-929) conserva el orden: (1) rasgos en `STAGE_FEATURES` ⇒ `buildFeatureProfile`, `routeSource: 'real'`; (2) edición sin rasgos ⇒ km, ciudades y terreno de `RACE_EDITIONS`, relieve por arquetipo con el terreno como `role` y la región de la carrera, `routeSource: 'edicion'`; (3) resto ⇒ arquetipo, `routeSource: 'generado'`. Lo real no pasa por ningún veto ni recorte de firma: la carretera manda sobre la tabla (Sassotetto es 13 km al 7,7 % en la fuente y 10,4 al 3,3 % cargado, `balance.md` v22 §4 según mapa 05 §5; si hay que arreglarlo, se arregla el dato).

### 10.2 El campo llega a la base y a la interfaz

`freezeRaceRoute` (`db/raceRoutes.ts` l. 43-52) escribe hoy `routeSource: 'generado'` para todo, con un comentario que espera «el campo que lo dice». Ese campo es `StageSpec.routeSource` (§3.2); el tipo `RouteSource` de la base (l. 29) gana el valor `'edicion'`. La API de la ficha (`apps/api/src/routes/calendar.ts` l. 91-105, `planFrom`) añade a cada etapa `routeSource`, `archetypeId` y `geo`; la web (`apps/web/src/pages/Race.tsx`, que ya dibuja la altimetría) muestra tres marcas con el mismo significado que el inventario: «Recorrido real (fuente citada)», «Ciudades y distancia reales, relieve generado», «Recorrido generado». Es la promesa de `docs/encargos.md` E12 («se distingue en la interfaz lo real de lo generado, que es una promesa al jugador y no un detalle», mapa 05 §8), y E1 pone el dato para que E12 solo tenga que dibujarlo.

### 10.3 Lo generado no nombra

Ningún motivo lleva nombre real. Las pancartas generadas se llaman por su km («Cota km 143»); un arquetipo cita en `refs` de qué carrera real se extrajo, y eso vive en el código y en `docs/generador.md`, nunca en la ficha del jugador. Si un día se quieren nombres inventados, es un generador de topónimos y va aparte.

---

## 11. El banco: qué cambia, qué se mueve a propósito, cómo se mide que es mejor

### 11.1 Lo que se rompe seguro y se re-sella con la causa escrita (mapa 06 §4)

| Test                                                                       | Qué se hace                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.test.ts` l. 381 (`ENGINE_VERSION` 69)                               | 69 → 70 en el paso 6, una sola subida para toda la sustitución                                                                                                                                                                                                                                                                                                                                                                                       |
| `routes/stageKind.test.ts`                                                 | se reescribe por familia: 300 instancias por arquetipo (60 semillas × 5 km de `KM_ROAD`) y por región admitida; se añaden `montana-un-dia` (hoy sin vigilar, mapa 06 §6.1) y `cri-cuesta`; la exigencia «existen las dos etiquetas de reina» pasa a «cada familia `reina-*` produce su `finalKind`». El comentario de umbrales de `stageKind.ts` l. 44-58 se re-mide con la tabla nueva (hoy dice 9,1-15,0 y las reinas llegan a 26,7, mapa 01 §5.1) |
| `routes/calendar.test.ts` l. 162-174 (km exactos)                          | sigue igual: `normalize` no cambia                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `routes/calendar.test.ts` l. 184-277 (`stageMix`)                          | los tests de garantías pasan a `tours.test.ts` sobre el catálogo de esqueletos; el de «primera etapa llana» se relaja a «no reina»; el de `race-sharjah` (crono y final en alto, l. 260-277) se conserva sobre `composeTour`                                                                                                                                                                                                                         |
| `apps/api/src/stageHistory.test.ts` l. 199 (`cambian === 49`)              | se re-mide y se sella la cifra nueva; por §4.8 debería bajar a las `cima_cerca` de ≤ 5 km, y el test anota por qué                                                                                                                                                                                                                                                                                                                                   |
| `sim/calendarQueens.test.ts`                                               | ver §11.2                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `sim/invariants.test.ts` «carreras PEQUEÑAS» (l. 855-955)                  | re-medir las nueve bandas de `smallTours` con 8 semillas; 7 de las 10 carreras son generadas (mapa 06 §3.2)                                                                                                                                                                                                                                                                                                                                          |
| `sim/invariants.test.ts` «cola en las reinas REALES» (l. 770-844)          | las tres generadas (`race-colombia` e5, `race-guatemala` e9, `race-tachira` e6) se sustituyen por perfiles LITERALES congelados en `realQueens.ts` con la forma que su `why` describe (Colombia: «último puerto a 62 km de meta y 47 rodadores», que hoy ya no es lo que corre, mapa 06 §3.2); así la lista cerrada vuelve a ser cerrada de verdad                                                                                                   |
| `sim/invariants.test.ts` saturación (l. 511-552)                           | se re-eligen las 8 más exigentes del calendario nuevo (`costBase` integrado) y se re-mide; el techo 0,96 / 14 % no se toca                                                                                                                                                                                                                                                                                                                           |
| `sim/coherence.test.ts` Race Jaén, `stage/journal.test.ts` Race Tramuntana | se re-corren; si aflora una contradicción es del motor y se arregla, no se afloja el cero                                                                                                                                                                                                                                                                                                                                                            |
| `routes/raceRoutes.test.ts`                                                | rompe si un esqueleto cambia el `n` de una carrera: no lo hace (`n` viene de la fila)                                                                                                                                                                                                                                                                                                                                                                |

### 11.2 Lo que se mueve a propósito

1. **`calendarQueens`**: la muestra se recalcula sola (`calendarQueens.ts` l. 22-27) y el desnivel de 25 de sus 27 reinas cambia. Con `ARCHETYPE.queenDplus` la mediana de las reinas del calendario sube (hoy 2.053 m) y la cola < 1.500 m se vacía, que es lo que `calendarQueens.test.ts` l. 62-64 prohíbe («facil.races > 0» y «facil > dura + 10»). **Decisión de diseño, no del test**: la cola blanda de montaña existe en la realidad como `media-alto` y `reina-corta` de `.2`, no como reina de gran vuelta; las reinas de `.2` y una semana tienen banda [2.000; 3.500] y [2.400; 4.200], así que la cubeta 1.500-2.500 sigue poblada y la < 1.500 se queda con las `reina-corta` (120-140 km, 2-3 puertos, `dPlus` [1.800; 3.000]) de clase `.2`. El test se reescribe con cubetas por FORMATO (gran vuelta / una semana / un día / `.2`) y la afirmación «el desnivel decide» se mide entre la cubeta más blanda y la más dura que sigan pobladas, con 12 semillas y no 4 antes de sellar. La banda 6-30 % se re-mide; si sale fuera se lleva al dueño con la cifra (su «está bien así» era sobre el 18,1 %).
2. **`mountain.breakawayWinPct` y `top10GapSeconds`** sobre `reina-150`: no se tocan (son control de forma, `targets.ts` l. 79-85); se añade en `scenarios.ts` una `reina-real-175` generada con el arquetipo `reina-alto` fijado (`archetypeId` y `identity` literales) de 3.800 m y se imprime sin banda hasta tener sigma.
3. **`REAL_QUEENS`**: además de congelar las tres generadas (§11.1), se añade un test barato: `finalKindOf(stage.profile)` y `desnivelDe` contra lo que cada `why` dice, para que el nombre no sobreviva a la forma.
4. **`grandTour.queenLastGroupPct`**: no se mueve (20 de 21 etapas de `race-france` son reales, mapa 06 §1) pero se parte por `finalKindOf` como el mapa 04 §4.3 pide, porque ahora hay reinas generadas de todas las cubetas para compararlo.
5. **`smallTours.photoRepeat*`**: se separa la parte de composición: se imprime cuántos pares de llegadas agrupadas trae cada carrera del esqueleto y se compara pareado viejo/nuevo.
6. **`medianLeadGroupRiders`** (sin banda): se mide por `finalKind` sobre la muestra sistemática y se le pone banda solo donde no nazca en rojo.

### 11.3 Invariantes que NO deben moverse (la red)

Las cuatro huellas selladas (`attribution.test.ts`, `timetrial.test.ts`, `raceRadio.test.ts`), los 6.17 sintéticos, `grandTour`, `featureProfile.test.ts`, `classicRoutes.test.ts`, `finalKind.test.ts`, `altimetry`, `schedule`, `uci`, `recorridoDelMundo.test.ts` (mapa 06 §5). Si alguna se mueve, el cambio ha tocado el motor y no el generador, y se para.

### 11.4 Métricas de realismo (fidelidad estadística)

`reference.ts` guarda, por familia, los cuantiles p10/p50/p90 de siete medidas sobre las etapas REALES de esa familia (`origen: 'extraido'`) o del mapa 07 (`origen: 'curado'`, con la fila citada):

| Medida                                                   | Cómo se calcula (función pura, sin simular)                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `dPlus`                                                  | `desnivelDe` de `calendarQueens.ts` l. 55-59 (bloques `subida`)                 |
| cota más larga                                           | `climbSize` de `stageKind.ts` l. 36-42                                          |
| km tras la última cota                                   | `kmAfterLastClimb` (`finalKind.ts` l. 69-73)                                    |
| nº de dificultades (`puerto` ≥ 0,4 km o `paves`)         | recuento de segmentos                                                           |
| posición de la primera dificultad (fracción)             | acumulado                                                                       |
| km de `subida` fuera de los últimos 30 km sobre el total | la variable que separó canónica de reales en `balance.md` v43 §7 (mapa 04 §3.2) |
| km de `paves` y nº de sectores                           | suma                                                                            |

`fidelity.test.ts` (rápido, en cada push) instancia 300 etapas por familia y región admitida y exige, para cada medida con referencia `extraido`, `|q_gen − q_ref| ≤ ARCHETYPE.fidelityTol · (p90_ref − p10_ref)` en p10, p50 y p90; para las `curado`, solo que p10 y p90 generados caigan dentro de la banda del mapa. Además, sobre el CALENDARIO entero (`calendarFor(0)`), imprime la tabla por familia y formato (como `queenGeometry`, l. 184-200) y sella: mediana de `dPlus` de reina de gran vuelta generada ≥ 3.200; p90 de km tras la última cota en `montana-un-dia` en [12, 25]; ninguna reina generada con 0 % de subida fuera de los últimos 30 km; `queenFamilyMix` del calendario dentro de ±0,08 (lo que `docs/tactica.md` l. 5580 quería y nunca se selló, mapa 06 §6.2).

Lo que la fidelidad NO puede afirmar, y se escribe en el test: solo hay 177 etapas reales y 139 son WorldTour; para `.1`, `.2` y nacionales la referencia es curada, así que «se parece a lo real» significa «se parece a lo que el mapa 07 dice de lo real».

### 11.5 Métricas de variedad y de no copia

En el mismo `fidelity.test.ts`, sobre el calendario entero:

- **No copia**: para cada etapa generada de una familia `extraido`, correlación de Pearson entre su vector de `g` remuestreado a 200 puntos (fracción de etapa) y el de cada etapa real de la familia ≤ `copyMaxCorr` (0,85); y fracción de dificultades a ±1 % de posición de las de una misma real ≤ `copyMaxPositionHits` (0,6). Coste: 1.241 × 177 × 200 ≈ 44 millones de multiplicaciones, menos de 2 s; se corre en test, nunca al cargar el módulo (§4.7).
- **Distancia entre iguales**: mediana de correlación entre pares de etapas generadas del mismo `kind` y km ±10 % < 0,8 (mapa 04 §5.2); con los moldes de hoy este número es alto por construcción (mismo esqueleto, mismas proporciones de `split`), y es la medida que responde al dueño.
- **Entropía de arquetipo** por `(kind, clase)`: ninguna combinación con un solo arquetipo que pese > 60 % de sus etapas.
- **Entropía de `finalKind` dentro de cada vuelta** con ≥ 2 reinas: ninguna gran vuelta generada con todas sus reinas `alto`.
- **Composición**: ninguna secuencia de papeles > 25 % de las vueltas de 5 etapas.
- **Pareado con el motor**: `distinctWinnerPct` por `kind` y `photoRepeatTopFive` sobre `smallTours`, mismo `worldSeed`, generador viejo contra nuevo (el viejo se conserva en el scratchpad de la tanda hasta cerrar el paso 8, como hizo el mapa 01 para medir). Un generador que baje la variedad de ganadores con el mismo motor ha empeorado.

---

## 12. Plan de implementación

Reglas comunes a todos los pasos: tests primero; `pnpm typecheck && pnpm test:rapido` en verde antes de cerrar cada paso; los bancos (`test:bancos`) se corren al cerrar los pasos 6 y 7; toda constante nueva con comentario de intención; una sola subida de `ENGINE_VERSION` (paso 6); una sola nota en `docs/balance.md` («v70 §1: el generador por arquetipos», con subsecciones por paso, como v60 §1b) que se va escribiendo paso a paso; `docs/generador.md` se escribe con el paso 9 y cita este diseño. Nada de `Date.now` ni `Math.random`: todo azar sale de `routeRng` con subflujo nominal.

**Paso 0. Congelar lo vivo.** Correr `backfillRaceRoutes` (`db/raceRoutes.ts` l. 91-109) en todo mundo vivo ANTES de tocar `routes/` (mapa 03 §9, caso 3). El mundo se reinicia antes del lanzamiento, así que no hay migración de perfiles, pero el backfill cuesta un comando y evita que una vuelta a medias cambie de recorrido en el entorno de pruebas.

**Paso 1. Geografía.** Tests: `geo.test.ts` (todo país de `COUNTRIES` y de `RACE_COUNTRY` resuelve a ≥ 1 región; toda región tiene firma; las 20 filas `cobbles` caen en región con adoquín o sterrato; `veta` no deja a ninguna combinación `(role, región)` sin familia posible). Código: `archetypes/geo.ts` con `GEO_SIGNATURES`, `COUNTRY_GEO`, `geoOf`; `RaceRow.geo` opcional y su relleno para las filas obvias. Sin `engine_version` (no cambia ningún perfil todavía).

**Paso 2. Extractor y catálogo.** Tests: `catalog.test.ts` (todo arquetipo tiene `refs`, bandas con `min ≤ max`, `at` creciente entre motivos no `desdeMeta`, `final` coherente con el último motivo; todo `extraido` cita ≥ `minRealForExtracted` etapas; `reference.ts` tiene cuantiles para toda familia). Código: `scripts/extraer-arquetipos.mjs`, que lee `STAGE_FEATURES` y `RACE_EDITIONS`, clasifica cada etapa real en una familia (por `stageKindOf`, `finalKindOf`, formato, y nº y talla de dificultades), calcula posiciones normalizadas y talla de cada dificultad, agrupa por familia y escribe `catalog.extracted.ts` (motivos con bandas p10-p90 de cada grupo, ensanchadas ±25 % si el grupo tiene < 3 etapas de carreras distintas) y `reference.ts`. `catalog.ts` une lo extraído con lo curado (las familias sin dato: `circuito` nacional, `.2` de 3-5 días, `golfo`, `andes`, `prologo`, `cri-cuesta`, `reina-corta`, `llana-cota`), cada uno con su fila del mapa 07 en `refs`. El extractor es determinista y se documenta como `editions.ts` l. 8 («NO editar a mano»).

**Paso 3. Piezas.** Tests: `pieces.test.ts` (un `puerto` de 12 km al 7 % produce un `Segment` `puerto` cuya `climbSize` es 12,0 y cuya media ponderada de `g` es 7,0 ± 0,05 con las cinco `shape`; un `muro` mide ≤ 3 km y `deriveFinishTerrain` lo ve; un `sector` es `paves` con estrellas; una `bajada` no baja de −12 %; un `valle` de 30 km con amplitud 0,55 suma < 250 m; un `circuito` de 12 km × 8 con una cota produce 8 pancartas separadas 12 km; ningún `rompepiernas`). Código: `archetypes/pieces.ts`, reutilizando `split`, `descent`, la lógica de `rollingFill` y `climbRamps`, que se exportan desde donde viven.

**Paso 4. Generación de una etapa.** Tests: `generate.test.ts` (determinismo: misma `StageRequest` ⇒ mismo perfil, byte a byte; independencia de subflujos: cambiar `season` no cambia `identity`; 300 instancias por familia y región ⇒ cero vetos tras `maxAttempts`, media de intentos < 1,3; `stageKindOf` coincide con la promesa; el caso v40 explícito: `format: 'un-dia', role: 'mountain', raceClass: '1', country: 'FR'` × 300 semillas ⇒ ninguna muere en un puerto > 5 km salvo ≤ 2 % marcadas `rareza`); `vetoes.test.ts` (cada regla con un perfil que la viola y otro que no). Código: `archetypes/generate.ts`, `vetoes.ts`, `identity.ts`. Todavía no se conecta al calendario.

**Paso 5. Composición.** Tests: `tours.test.ts` (los esqueletos del catálogo cumplen los vetos 15-19 para todo `n` de su banda y toda clase; `composeTour` es determinista; `race-sharjah` sigue con crono y final en alto; ninguna secuencia > 25 % en `n = 5`). Código: `archetypes/tours.ts` con el extractor de secuencias añadido al script del paso 2.

**Paso 6. Conectar y subir versión.** Tests primero: re-sellar `stageKind.test.ts`, `calendar.test.ts` (km exactos se mantienen; garantías a `tours.test.ts`; «primera llana» → «primera no reina»), `stageHistory.test.ts` (cifra nueva con causa), `index.test.ts` (`ENGINE_VERSION` 70), `fidelity.test.ts` (§11.4-11.5) nuevo. Código: `calendar.ts` pasa a `calendarFor(season)` y `buildRace(row, season)` llama a `generateStage`/`composeTour`; `StageSpec.routeSource/archetypeId/geo`; `stagesFromEdition` conserva `idSeed = from|to|km`; `nationalChampionships` pide `role: 'auto'` con `format: 'un-dia'` y la clase `NC`; `freezeRaceRoute` escribe `routeSource` real y recibe `season`. Nota en `balance.md` con la tabla de fidelidad y variedad antes/después sobre el calendario entero.

**Paso 7. El banco.** Re-medir con las semillas de `pnpm sim` (no las de CI) y anotar cifra a cifra en `balance.md`: `calendarQueens` con cubetas por formato (12 semillas), `smallTours` (8), `realQueens` con las tres congeladas (6), saturación de las 8 más duras (12 si salta), `timeTrials` (la crono sigue siendo `cri` llana salvo `cri-cuesta`, que hoy no entra en el banco), coherencia Jaén y diario Tramuntana. Mover bandas solo con la medida delante y con el dueño donde §14 lo diga. Actualizar los comentarios de `targets.ts` que citan cifras del generador viejo (l. 79-84 «mediana de 2.023»).

**Paso 8. Borrar lo viejo.** Quitar los ocho `*Segments` y `mountainClassicSegments` de `profileGen.ts` y las claves muertas de `ROUTE` (§8); `profileGen.ts` queda como `routes/rng.ts` + primitivas o se funde en `pieces.ts`. Test: `grep` en CI de que nadie importa los nombres borrados. Sin `engine_version` (los perfiles ya cambiaron en el paso 6).

**Paso 9. Interfaz y documento.** API: `routeSource`, `archetypeId`, `geo` en la ficha; web: las tres marcas de §10.2. `docs/generador.md` con: el catálogo (tabla de arquetipos con familia, regiones, `refs`), las firmas, los vetos, cómo se regenera el catálogo, la tabla de fidelidad medida y qué decidió el dueño de §14.

Orden y dependencias: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9; el 0 antes de todo; el 9 puede solaparse con el 7.

---

## 13. Riesgos y lo que se sacrifica

1. **La referencia real está sesgada al WorldTour** (139 de 177 etapas reales; `.1` 4, `.2` 5, NC 0, mapa 02 §9). Los arquetipos de `.2` y nacionales son curados; la fidelidad allí es fidelidad al mapa 07, no a un dato. Mitigación: marcar `origen` en el catálogo y en el test; E12 sustituye curado por extraído a medida que cargue.
2. **El extractor agrupa por familia con un criterio escrito, y ese criterio puede meter Lieja y Lombardía en el mismo saco.** Mitigación: las familias `ardenas` y `montana-un-dia` se separan por cota más larga (≤ 4,5 km contra ≥ 8) y el test del paso 2 imprime la asignación etapa a etapa para revisarla a mano una vez.
3. **Coste de arranque.** 1.418 etapas con vetos y reintentos al cargar el módulo; con media de intentos < 1,3 es comparable a hoy, pero un catálogo mal calibrado (bandas que chocan con firmas) dispara reintentos. Mitigación: la media de intentos es un test (paso 4) y `maxAttempts` acota el peor caso.
4. **Los bancos se mueven en bloque.** `smallTours`, `calendarQueens`, saturación y coherencia cambian de contenido a la vez; el paso 7 será largo y hay que aceptar que alguna banda salga fuera y haya que decidir. Se sacrifica la comparabilidad directa con v69 de esas bandas; se recupera con las medidas pareadas de §11.5 sobre el generador viejo guardado.
5. **La cola < 1.500 m de `calendarQueens` se vacía a propósito** (§11.2.1). Se pierde una afirmación del test tal cual está («facil.races > 0» en < 1.500) a cambio de reinas de gran vuelta con desnivel de gran vuelta. Es una decisión del dueño (§14.3).
6. **La temporada entra en el calendario** y toca `db` (`freezeRaceRoute`) y la API. Es poco código pero es el único punto del diseño fuera de `packages/engine/src/routes/`. Si se quiere posponer, `variantes = 1` y `season = 0` siempre reproducen el diseño sin variación entre ediciones y todo lo demás sigue en pie.
7. **El motor no sabe de circuitos ni de viento por tramo.** Un `circuito` es un patrón periódico y nada más; la geografía guarda `viento` y no lo usa. Se sacrifica a sabiendas para no tocar `stage/` en E1.
8. **`rompepiernas` deja de escribirse.** La altimetría de las medias montañas generadas pierde el tono «rompepiernas» del relleno (hoy con p 0,35); la física no lo notará porque ya lo colapsaba (mapa 03 §2 punto 4).
9. **Ediciones sin rasgos.** Conservan `idSeed = from|to|km`, así que su identidad no gana geografía por semilla sino por región de la carrera; dos etapas de carreras distintas con la misma salida, meta y km seguirán iguales. Es el comportamiento de hoy y no se arregla aquí.
10. **Sobreajuste al catálogo**: los tests de fidelidad comparan lo generado con la referencia de la que salen las bandas; una fidelidad alta es en parte tautológica. Lo que no es tautológico, y es lo que vale, son los vetos, la no copia, la variedad y las medidas de simulación pareadas.

---

## 14. Decisiones que son del dueño

1. **¿Se cierra el catálogo de firmas geográficas con los valores del §5.1?** Son curados desde el mapa 07; el dueño conoce el ciclismo mejor que el mapa y puede querer otra banda para el Cantábrico o para Colombia.
2. **¿Cuántas variantes rota una carrera generada y con qué mezcla?** Propuesto {1: 0,5; 2: 0,3; 3: 0,2}. Alternativa: todas con 1 (calendario fijo como hoy, solo deriva pequeña) o todas con 3.
3. **La cola blanda de la montaña.** ¿Reinas de gran vuelta siempre ≥ 3.200 m (vaciando la cubeta < 1.500 de `calendarQueens` y reescribiendo su test por formato), o se conserva el 60/40 de hoy con reinas «que no son reinas» para que el test siga igual? El diseño propone lo primero.
4. **La rareza del final en puerto largo en un día** (`oneDayLongSummitShare` 0,02, solo `.1`): ¿se admite o se prohíbe del todo (0)?
5. **Metas volantes generadas.** `auto()` no las fabrica a propósito (l. 88-91). Los arquetipos podrían declararlas (1-2 por etapa, a 40-120 km de meta) porque mueven puntos, coste y alivio (mapa 03 §4.2). Propuesto: no, hasta que E12 decida qué carreras las tienen.
6. **Nombres.** ¿Pancartas «Cota km 143» o un generador de topónimos por región? Propuesto: sin nombres en E1.
7. **La banda 6-30 % de `calendarQueens`** se re-mide sobre el calendario nuevo; si sale fuera, ¿se recentra con la cifra nueva («está bien así» era sobre 18,1) o se calibra el motor hacia 18?
8. **Km de las carreras de un día sin `km` en la fila** (142 de 178 a 210 km hoy): ¿banda por clase y arquetipo (propuesto) o se mantienen los 210 hasta que E12 cargue distancias reales?
9. **`primera etapa llana`** se relaja a «no reina» para que los esqueletos extraídos (Tour 2026 abre con crono; Giro con llana en Bulgaria) quepan. ¿De acuerdo?
10. **¿Se expone `archetypeId` al jugador** (como texto tipo «clásica de muros flamenca») o solo la marca real/edición/generado? Propuesto: solo la marca en E1; el texto es de E12.
