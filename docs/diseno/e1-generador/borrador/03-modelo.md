## 3. El modelo de tipos

Esta sección escribe los tipos que el resto del documento usa por nombre. Van en el orden en que el generador los consume: primero lo que no cambia (el contrato del motor), después las piezas (motivos), los moldes (esqueletos), el sitio (zonas, territorios, regiones), la composición de una vuelta, la petición y la salida de `generateStage`, la temporada, los vetos y el censo, y al final lo que ganan `StageSpec`, `CalendarStage`, `CalendarRace` y `race_routes`. Cada bloque TypeScript va seguido de por qué tiene esa forma y contra qué línea del código encaja. Los rangos numéricos que aparecen en comentarios salen del bloque `ARCH` (sección 12, Las constantes) y no se repiten aquí con su apoyo; los nombres de fichero son los de la tabla de la sección 15 (El plan de implementación).

### 3.1 Lo que no cambia: el contrato del motor (`stage/types.ts` l. 12-48)

El motor de etapa no ve el generador. Ve un `StageProfile` (`types.ts` l. 44-47: `segments` y `banners?`), formado por `Segment` (l. 36-41: `km`, `tipo`, `tramos?`, `estrellas?`), `Ramp` (l. 18-21: `km`, `g` en %) y `Banner` (l. 24-30: `km`, `tipo: 'meta_volante' | 'cima'`, `cat?`), con cinco terrenos de autoría (`SegmentTerrain`, l. 12: `llano`, `rompepiernas`, `puerto`, `descenso`, `paves`). `sampleProfile` (`sample.ts` l. 68-125) lo colapsa a bloques de 100 m con cuatro campos físicos (`Block`, `types.ts` l. 50-61: `g`, `tipo`, `estrellas`, más `banner?` y `climbCategory?` para los puntos), y la física entera lee solo `g`, `tipo` y `estrellas` (mapa 03 §3, tabla de `physics.ts` l. 20-653). Cuatro hechos de ese mapa fijan la forma de todo lo que sigue:

1. `rompepiernas` muere en el muestreo: `sample.ts` l. 100-101 le pone `g = STAGE.rollingGradient` (1,5, `constants.ts` l. 1596) aunque traiga tramos, y los tramos se ignoran. El generador nunca lo emite (decisión 2 de la síntesis): lo que hoy sale como `rompepiernas` se escribe como `llano` con tramos.
2. `kmSubida` cuenta bloques de tipo `subida`, no pendiente (`simulate.ts` l. 1696-1702 vía mapa 03 §4.1). Un `llano` con tramos al 3 % no suma; un `puerto` con tramos al 1 % sí. Por eso el modelo distingue `tendida` (tipada `llano`: desgasta, no cuenta) de `cota` (tipada `puerto`: cuenta), y por eso `Segment.tipo` es una decisión del generador y no una consecuencia de la pendiente.
3. El contrato no tiene altitud, exposición al viento, anchura ni costa (mapa 03 §1, lista de lo que no está). Nada de eso puede llegar al motor desde el perfil; en el modelo viaja como metadato de la ficha (`GeneratedStage.arch.metadatos`, decisión 17) y nunca como física.
4. `finishType` (`finish.ts` l. 142) y `deriveFinishTerrain` (l. 71) leen bloques muestreados, no segmentos: el tipo de final es una propiedad del motor, no del perfil. Por eso el modelo promete `kind` y `finalKind` (que se leen del perfil con `stageKindOf`, `stageKind.ts` l. 71, y `finalKindOf`, `finalKind.ts` l. 78) y solo MIDE `finishType` en el censo (decisión 4).

Nada nuevo entra en `types.ts`. Todo tipo de esta sección vive aguas arriba del `StageProfile` y se traduce a él en `render.ts`.

### 3.2 Motivos (`routes/grammar/motifs.ts`)

```ts
// packages/engine/src/routes/grammar/motifs.ts
export type MotifKind =
  | 'enlace'
  | 'expuesto'
  | 'tendida'
  | 'descenso' // enlaces
  | 'cota'
  | 'puerto'
  | 'muro'
  | 'cadena'
  | 'sector'
  | 'racimo'
  | 'circuito' // dificultades
  | 'meta' // siempre el último

export type MetaKind =
  | 'esprint'
  | 'repecho'
  | 'muro_meta'
  | 'alto_corto'
  | 'alto_largo'
  | 'cima_cerca'
  | 'descenso_meta'
  | 'valle'
  | 'sector_meta'

export interface Motif {
  kind: MotifKind
  km: number // total del motivo; en `circuito`, el de una vuelta
  g?: number // dificultades y `tendida`: pendiente media en %
  forma?: 'regular' | 'progresiva' | 'irregular'
  adoquin?: boolean // `muro` adoquinado (sigue siendo `puerto`) o `sector` de adoquín (frente a tierra)
  firme?: 'adoquin' | 'tierra' // solo `sector`; tierra se rinde como `paves` 2-3★
  estrellas?: number // solo `sector`: 1..5
  hijos?: Motif[] // `cadena`, `racimo`, `circuito`
  vueltas?: number // solo `circuito`
  meta?: MetaKind // solo `meta`
  cotaFinal?: { km: number; g: number } // `meta` con cota
  firma?: boolean // motivo de FIRMA: no cambia entre ediciones
  nombre?: string // texto para la ficha («Muro de 1,2 km al 11 %»)
}

/** Devuelve `null` si el motivo cumple los rangos de `ARCH.motivo` y `ARCH.meta`; si no, la regla violada. */
export function validateMotif(m: Motif): string | null
/** Rinde un motivo a segmentos con las primitivas de `profileGen.ts`; `geo` da la amplitud del relleno. */
export function renderMotif(m: Motif, rand: () => number, geo: GeoSignature): Segment[]
```

Un motivo es una pieza de carretera con significado ciclista, y es la unidad que la semilla decide primero (principio 1, sección 2). Es un solo `interface` con campos opcionales y no una unión discriminada (banco e ingeniero la usaban) por dos razones prácticas: los esqueletos declaran `params?: Partial<Pick<Motif, ...>>` sobre un solo tipo, y la plantilla canónica de cada esqueleto es un `Motif[]` literal que se escribe a mano (sección 5); `validateMotif` es quien impone la coherencia entre `kind` y campos, con un test por motivo en `grammar/motifs.test.ts`. Todo está en km y % redondeado a 0,1, que es la resolución a la que `normalizeEnlaces` cuadra el total (V10 exige Σ km al 0,1).

Cómo se rinde cada motivo a `Segment[]` y qué lee el motor de él (rangos de `ARCH.motivo`, sección 12; lecturas del mapa 03 §3 y §4):

| Motivo     | `km`                             | `g`                           | Rinde a `Segment[]` como                                                                                                         | Qué lee el motor                                                                                                      |
| ---------- | -------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `enlace`   | [1; 60]                          | amplitud `geo.amplitud` ≤ 2,4 | `rolling(rand, km, amp, 0)` en trozos de 3 a 6 km (`profileGen.ts` l. 102): varios `llano` con tramos                            | pendiente en `costBase`; único terreno con abanico y acordeón (`simulate.ts` l. 1215, 4340-4408); `selectionFactor` 0 |
| `expuesto` | [5; 60]                          | amplitud fija 1,0             | `rolling(rand, km, 1.0, 0)`                                                                                                      | igual; la ficha lo describe como llano abierto, sin prometer abanicos (decisión 17)                                   |
| `tendida`  | [5; 30]                          | [1,5; 3,5]                    | UN `llano` con 2 a 4 tramos a `g ± 0,7`                                                                                          | `costBase` 0,24 + 0,135·g; NO suma `kmSubida`; no selecciona                                                          |
| `descenso` | `clamp(len·g·10/55, 2, 10)`      | [−8; −3]                      | `descent(rand, km,                                                                                                               | g                                                                                                                     | )`: un `descenso` con tramos | selecciona solo con g ≤ −4 en su primer km o entero a ≤ 25 km de meta (l. 2427, 5083-5089); coste con suelo 0,10 |
| `cota`     | [2,5; 8,0]                       | [4; 7]                        | `climb(rand, km, g)`: un `puerto` con tramos, pancarta `cima` si ≥ 1,5 km                                                        | `subida`: suma a `kmSubida`, deriva, `climbRaceKmToGo` 30, categoría por `deriveClimbCategory`                        |
| `puerto`   | [9; 25]                          | [5; 9]                        | `climb`; `forma: 'irregular'` añade una rampa de [0,3; 0,8] km al [11; 13] %                                                     | igual; con COL bloque a bloque donde g ≥ 8 (`riderPerfil`, l. 434)                                                    |
| `muro`     | [0,4; 3,0]                       | [8; 16]                       | `climb(rand, km, g, { gMax: 16 })` con 2 rampas; `adoquin: true` sigue siendo `puerto`                                           | COL en todos sus bloques; en meta y ≤ 1,0 km, `finishType` da `muro` (`finish.ts` l. 184-185)                         |
| `cadena`   | Σ hijos + enlaces de [1; 6] km   |                               | hijos (`muro` o `cota`) intercalados con `rolling` corto, sin valle                                                              | nada nuevo: n rachas de `subida` seguidas                                                                             |
| `sector`   | [0,3; 3,7]                       | 0                             | `{ km, tipo: 'paves', estrellas }`; `firme: 'tierra'` se rinde como `paves` de 2 a 3★ (como Strade en `classicRoutes.ts` l. 594) | `estrellas` en `costBase` 0,55 + 0,06·e, selección y percances ×20 (`constants.ts` l. 4389)                           |
| `racimo`   | [20; 60]                         |                               | [4; 10] sectores separados por `rolling` de [2; 6] km con amplitud 0,7                                                           | `kmToNextPaves` y el peaje de entrada en cada sector (l. 1628-1636, 2611)                                             |
| `circuito` | vuelta [8; 30] × [3; 18] vueltas |                               | los `hijos` rendidos `vueltas` veces con la MISMA semilla de detalle (`dib                                                       | …                                                                                                                     | hijo{h}`)                    | n pasos por la misma cota; una pancarta por paso ≥ 1,5 km (decisión 25)                                          |
| `meta`     | según `MetaKind`                 |                               | sección 4 (tabla de los nueve finales)                                                                                           | `finishType` medido en el censo (V16) y `finalKindOf` garantizado (V7)                                                |

Dos aclaraciones que las propuestas dejaban ambiguas. `tendida` y `expuesto` se tipan `llano` a propósito y no `rompepiernas`, porque el segundo pierde sus tramos en el muestreo (hecho 1 de §3.1). Y `muro` adoquinado sigue siendo `puerto` (regla de la casa de `fuentes-recorridos.md`, citada por arquitectura §3.1): `adoquin: true` solo cambia el nombre de la ficha y el requisito geográfico (`GeoSignature.muro.adoquin`), nunca `Segment.tipo`.

### 3.3 Esqueletos (`routes/grammar/skeletons.ts`)

```ts
// packages/engine/src/routes/grammar/skeletons.ts
export interface Slot {
  motif: MotifKind
  n: [number, number] // cardinalidad; 0 en el mínimo = hueco opcional
  ventana: [number, number] // fracción de la etapa donde EMPIEZA el motivo
  params?: Partial<Pick<Motif, 'g' | 'forma' | 'adoquin' | 'estrellas' | 'vueltas'>> & {
    kmRango?: [number, number]
    gRango?: [number, number]
  }
  firma?: boolean
}

export interface Skeleton {
  id: SkeletonId
  kind: StageKind // lo que `stageKindOf` TIENE que devolver
  label: string
  finalKind?: FinalKind // reinas y medias: lo que `finalKindOf` TIENE que devolver
  meta: MetaKind
  slots: Slot[]
  dPlus: [number, number] // objetivo TOTAL, relleno incluido (ARCH.reina.dPlusIncluyeRelleno)
  km: [number, number] // rango bruto antes de ARCH.km.porClase
  requiere?: Partial<GeoSignature>
  pesoBase: number // peso del catálogo antes de zona y clase
  canonico: Motif[] // instancia fija escrita a mano: pasa todos los vetos por construcción
  alternativas?: Motif[][] // rotación DECLARADA (ARCH.edicion.nivel 2): la edición elige season % n
}

export type SkeletonId =
  // un día (15)
  | 'ud_esprint'
  | 'ud_esprint_capi'
  | 'ud_circuito'
  | 'ud_muro_final'
  | 'ud_muros'
  | 'ud_muros_adoquin'
  | 'ud_sterrato'
  | 'ud_adoquin'
  | 'ud_adoquin_ligero'
  | 'ud_montana'
  | 'ud_montana_media'
  | 'ud_montana_alto'
  | 'ud_criterium'
  | 'nc_ruta'
  | 'nc_crono'
  // etapa de vuelta (17)
  | 'et_llana'
  | 'et_llana_viento'
  | 'et_media_valle'
  | 'et_media_alto'
  | 'et_media_muro'
  | 'et_media_tendida'
  | 'et_reina_alto_largo'
  | 'et_reina_alto_corto'
  | 'et_reina_cima_cerca'
  | 'et_reina_valle'
  | 'et_reina_encadenada'
  | 'et_montana_corta'
  | 'et_reina_blanda'
  | 'et_crono'
  | 'et_prologo'
  | 'et_cronoescalada'

export const SKELETONS: Record<SkeletonId, Skeleton>
```

Un esqueleto es una secuencia de huecos con cardinalidad y ventana de posición, y es el molde que el dueño echa en falta cuando dice que siempre salen los mismos tres o cuatro modelos (agenda §4.18): 32 en vez de los siete de hoy (`ittSegments === flatSegments`, mapa 01 §2.1). Por qué cada campo:

- `kind` y `finalKind` son PROMESAS, no etiquetas: V6 exige `stageKindOf(profile, timeTrial).kind === sk.kind` (`stageKind.ts` l. 71-95, umbrales `PASS_MIN_KM` 8,5 l. 62 y `WALL_MAX_KM` 3 l. 60 sin tocar, decisión 26) y V7 exige `finalKindOf(profile) === sk.finalKind` (`finalKind.ts` l. 78-85 con los cortes 0,5 / 5 / 20 de `FINAL_KIND_CUTS` l. 30). Un esqueleto que no puede cumplir su promesa se corrige en el catálogo, no en el clasificador.
- `ventana` es la fracción de la etapa donde el motivo EMPIEZA, medida desde la salida (arquitectura §3.3). La propuesta de datos anclaba los huecos desde la meta; aquí lo que se ancla desde la meta es solo el final, y lo hace el motivo `meta` con `cotaFinal` y el rango de valle de cada `MetaKind` (`ARCH.meta.*.valle`), que es donde la identidad de una etapa real se decide (mapa 07 §4.3).
- `dPlus` es el desnivel TOTAL, relleno incluido (decisión 9): es lo que `calendarQueens.ts::desnivelDe` (l. 54) mide y lo que `calendarQueens.test.ts` acota, así que el objetivo se persigue sobre esa misma cifra y no sobre la suma de dificultades.
- `km` es el rango bruto; la clase lo recorta con `ARCH.km.porClase` y `ARCH.km.maxPorClase` (sección 7). La propuesta ganadora usaba un factor multiplicativo; la tabla lo sustituye (decisión 36).
- `requiere` es un `Partial<GeoSignature>` que se compara con la firma de la zona mediante `admite()` (sección 6): `{ adoquin: 2 }` exige `geo.adoquin ≥ 2`, `{ sterrato: true }` exige `sterrato`, `{ finalesAlto: 'largo' }` exige exactamente ese valor, y un campo que en la zona es `null` (por ejemplo `puerto`) hace indisponible cualquier esqueleto que tenga un `Slot` de ese motivo con `n[0] ≥ 1`.
- `pesoBase` existe porque el juez de ejecutabilidad señaló que la ganadora dejó los pesos base del catálogo sin escribir (`juicios/ejecutabilidad.md` §4); los valores van en la tabla de la sección 5 y se multiplican por `GeoSignature.pesos` y por `ARCH.pesoPorClase`.
- `canonico` es un `Motif[]` literal por esqueleto, escrito a mano y comprobado en `skeletons.test.ts` contra los 16 vetos: es la plantilla a la que cae `generateStage` tras `ARCH.colocacion.maxIntentos` 8 (con `degradado: true`, y cero veces en el calendario por `ARCH.veto.fallbackMaxShare.calendario` 0).
- `alternativas` es la rotación declarada de `ARCH.edicion.nivel` 2 (decisión 22): la edición elige `alternativas[season % n]` en vez de `canonico` como punto de partida. Solo la tienen los esqueletos que la sección 5 lista (`ud_montana` con Como y Bérgamo; `et_reina_alto_largo` con dos metas).

El tipo entero es serializable (solo literales, arrays y strings, sin funciones): es la propiedad que permite congelar las tres reinas de `REAL_QUEENS` como `Skeleton` literal en `sim/frozenSkeletons.ts` y renderizarlas con el renderizador nuevo (decisión 33), en vez de congelar `Segment[]`.

### 3.4 Geografía (`routes/grammar/geo.ts`)

```ts
// packages/engine/src/routes/grammar/geo.ts
export type GeoZone =
  | 'flandes'
  | 'ardenas'
  | 'bretana'
  | 'francia_norte'
  | 'macizo_central'
  | 'alpes'
  | 'pirineos'
  | 'provenza'
  | 'italia_norte'
  | 'italia_centro'
  | 'dolomitas'
  | 'italia_sur'
  | 'cantabrico'
  | 'meseta'
  | 'andalucia'
  | 'levante'
  | 'portugal'
  | 'centroeuropa'
  | 'escandinavia'
  | 'britanicas'
  | 'balcanes'
  | 'anatolia'
  | 'andes'
  | 'cono_sur'
  | 'norteamerica'
  | 'australia'
  | 'asia_oriental'
  | 'golfo'
  | 'africa_llana'
  | 'generico'

export type Relieve = 'llano' | 'ondulado' | 'media' | 'montana' | 'alta'

/** `null` significa «aquí no existe» y los vetos V1 a V4 lo hacen cumplir. */
export interface GeoSignature {
  zona: GeoZone
  relieve: Relieve
  puerto: { km: [number, number]; g: [number, number]; forma: Motif['forma'] } | null
  cota: { km: [number, number]; g: [number, number] } | null
  muro: { km: [number, number]; g: [number, number]; adoquin: boolean } | null
  adoquin: 0 | 1 | 2 | 3 // 0 ninguno · 1 urbano · 2 sectores · 3 masivo
  sterrato: boolean
  viento: 0 | 1 | 2 | 3 // METADATO: no llega al motor (mapa 03 §5.1)
  altitud: 'mar' | 'colina' | 'media' | 'alta' | 'altiplano' // METADATO y veto V4; no hay altitud en `Segment`
  amplitud: number // ondulación del `enlace`, en % (tope ARCH.motivo.enlace.ampMax 2,4)
  finalesAlto: 'ninguno' | 'corto' | 'largo'
  pesos: Partial<Record<SkeletonId, number>> // multiplican `Skeleton.pesoBase`
}

export interface Territorio {
  ruta: readonly { zona: GeoZone; peso: number }[] // orden = recorrido plausible por el país
  cordillera: GeoZone | null // null = el país no tiene reina
  fallback?: boolean // país sin tabla: territorio genérico, contado en test
}

export const ZONAS: Record<GeoZone, GeoSignature>
export const TERRITORIOS: Record<string, Territorio> // ISO alpha-2, los 56 países con equipos explícitos
export function zonaDe(country: string): GeoZone // primera zona de la ruta por peso; `generico` si fallback
```

La firma de una zona dice qué existe y qué no, y la palabra para lo segundo es `null`, no un rango vacío ni un peso cero: `puerto: null` en `flandes` hace que ningún esqueleto con un `Slot` de `puerto` obligatorio esté disponible allí (V1), `cota: null` en el pólder y el desierto quita hasta la media montaña, y `muro: null` en `golfo` impide un `ud_muros` en Emiratos. La propuesta ganadora dejaba `cota` no anulable; la de geografía anulaba `cota`, `muro` y `puerto`, y esa es la forma que se toma, porque un pólder no tiene cotas de 2,5 km y decirlo con `null` es más honesto que con `[2,5; 2,5]`. `degradar()` va siempre hacia abajo (`montana → media → ondulado → llano`): una reina pedida en `flandes` sale `media_alto` y se anota, nunca al revés.

`amplitud` sustituye el `bumpy ? 3.2 : 1.8` literal de `rolling` (`profileGen.ts` l. 105) por un número de la zona, con tope `ARCH.motivo.enlace.ampMax` 2,4 para que el relleno nunca alcance el 3 % que `deriveFinishTerrain` lee como cota (`STAGE.finishClimbMinGradient` 3, `constants.ts` l. 3977); el pólder va en [0,4; 0,9]. `viento` y `altitud` son metadatos: `altitud` además veta (V4: `alto_largo` solo con `finalesAlto: 'largo'`, ningún puerto ≥ 15 km fuera de `media`, `alta` o `altiplano`), pero ninguno de los dos toca un `Segment`. `pesos` multiplica `Skeleton.pesoBase` y es donde la zona expresa lo que existe más o menos (Flandes sube `ud_muros` y `ud_muros_adoquin`; los Alpes suben `et_reina_alto_largo`).

`Territorio` es la forma en que un país entra en una vuelta (sección 7): `ruta` es una lista ORDENADA de zonas con peso, que un itinerario recorre como ventana contigua, y `cordillera` es la zona donde puede caer la reina, o `null` si el país no la tiene (Bélgica, Países Bajos, Dinamarca, Golfo, Australia: decisión D8, sección 18). `fallback: true` marca los 77 países de `COUNTRIES` sin fila propia, que reciben el territorio genérico y se cuentan en `geo.test.ts`; ninguna de las 310 carreras de equipos puede caer ahí (decisión 13). `zonaDe(country)` devuelve la zona de mayor peso de la ruta y es la última red de `regionOf` (§3.5): solo los 532 nacionales pasan por ella.

### 3.5 Regiones por carrera y por etapa (`routes/grammar/regions.ts`)

```ts
// packages/engine/src/routes/grammar/regions.ts
export interface RaceRegion {
  default: GeoZone
  stages?: Record<number, GeoZone>
} // stages: índice con base 1
export const RACE_REGION: Record<string, RaceRegion> // 310 carreras de equipos, curadas desde raceRoutes.ts
export function regionOf(raceId: string, stageIndex: number, country: string): GeoZone
// = RACE_REGION[raceId]?.stages?.[stageIndex] ?? RACE_REGION[raceId]?.default ?? zonaDe(country)
// Test: ninguna carrera de equipos cae a zonaDe(country); solo los 532 .NC pasan por ahí.
```

`RaceRow` (`calendar.ts` l. 381-398) no cambia. La propuesta ganadora añadía `geo?: GeoZone` a la fila y sorteaba la zona con `geo|${raceId}` cuando faltaba, para los 125 de 310 casos de FR, IT y ES; la síntesis retira el sorteo (decisión 14) porque una carrera no cambia de cordillera según la semilla, y saca la zona a una tabla aparte, curada a mano desde las ciudades de `raceRoutes.ts`, con dos niveles: `default` para la carrera y `stages` para las etapas de las 60 ediciones reales, donde el país es grueso de más (`race-france` e6 Pau → Gavarnie-Gèdre es `pirineos`, e15/18/19/20 son `alpes`; el resto de etapas caen a `default`). El índice de `stages` es el mismo `CalendarStage.index` con base 1 (`calendar.ts` l. 43-44) y el mismo orden de `RaceEdition.stages` (`editions.ts` l. 17-22). `regionOf` es una cadena de tres `??` y nada más; `regions.test.ts` sella que para todo `id` de `PRO_TABLE` y `CON_TABLE` el tercer eslabón no se alcanza.

### 3.6 Composición de una vuelta (`routes/grammar/tour.ts`)

```ts
// packages/engine/src/routes/grammar/tour.ts
export type StageRole =
  | 'llana'
  | 'llana_viento'
  | 'media'
  | 'media_alto'
  | 'media_muro'
  | 'reina_alto'
  | 'reina_valle'
  | 'reina_encadenada'
  | 'montana_corta'
  | 'cri'
  | 'prologo'
  | 'cronoescalada'

export type TourSkeletonId = 'vu_corta' | 'vu_semana' | 'vu_larga' | 'vu_gran_vuelta'

export interface BlockRule {
  id: string // 'reinaTarde', 'bloqueMontana', 'llanasEntreBloques', 'maxCronos', 'maxFinalesAlto', 'descansos'
  aplica: (n: number) => boolean
  repara: (roles: StageRole[], zonas: GeoZone[]) => StageRole[] // determinista, de atrás hacia delante
}
export type Weighted<T extends string> = Partial<Record<T, number>>

export interface TourSkeleton {
  id: TourSkeletonId
  n: [number, number]
  bloques: BlockRule[]
  primera: Weighted<StageRole>
  ultima: Weighted<StageRole> | 'ROUTE.lastDecisiveChance'
  pesos: Record<Relieve, Weighted<StageRole>> // ARCH.pesosComposicion
}

export interface Itinerario {
  metas: GeoZone[]
  papeles: StageRole[]
  km: number[]
  desde: GeoZone[]
}
export function itinerarioDe(
  raceId: string,
  country: string,
  n: number,
  terrain: RouteTerrain,
  raceClass: RaceClass,
  format: RaceFormat,
): Itinerario // subflujo `arch|raceId`, sin season
export function composeTour(
  n: number,
  terrain: RouteTerrain,
  seedBase: string,
  ctx: RouteContext,
): StageSpec[]
export function kmDe(
  role: StageRole | 'un_dia',
  raceClass: RaceClass,
  last: boolean,
  rand: () => number,
): number
```

`StageRole` amplía el `MixRole` de hoy (`calendar.ts` l. 410-561 vía mapa 02 §4: `cri`, `reina`, `media-alto`, `media`, `llana`) con los papeles que la carretera tiene y el generador no (`llana_viento`, `media_muro`, `reina_valle`, `reina_encadenada`, `montana_corta`, `prologo`, `cronoescalada`). El papel de cada etapa es IDENTIDAD (decisión 20): lo decide `itinerarioDe` en el subflujo `arch|raceId` sin `season`, y la edición no lo mueve.

El juez del motor objetó que `Weighted<StageRole>` y `BlockRule` estaban sin definir en la ganadora; aquí lo están. `Weighted<T>` es un mapa parcial de pesos relativos (no tienen que sumar 1: se normalizan al sortear, y una clave ausente pesa 0). `BlockRule` es una reparación determinista: `aplica(n)` dice si la regla se evalúa para una vuelta de `n` etapas, y `repara` recibe los papeles ya sorteados y las zonas de meta del itinerario y devuelve los papeles corregidos, recorriendo de atrás hacia delante para que la última etapa (la que `ROUTE.lastDecisiveChance` decide) no se toque. `ultima` admite el literal `'ROUTE.lastDecisiveChance'` como centinela: significa que la última etapa se sortea con la regla que `mixRoles` ya tiene hoy (`calendar.ts` l. 457-519, garantía de última decisiva), en vez de con pesos propios; es lo que conserva `calendar.test.ts` l. 184-246 sin tocar. `pesos` está indexado por `Relieve` y no por el `MixTerrain` de hoy (`flat | hilly | mountain`, l. 410), que desaparece: `ARCH.pesosComposicion` sustituye a `ROUTE.mixWeights`.

`Itinerario` lleva cuatro listas paralelas de longitud `n`: la zona de meta de cada etapa, su papel, sus km (ya por clase, con `kmDe`) y la zona de salida (`desde`, que difiere de `metas[i]` en las etapas de transición y es la que `StageRequest.desde` recibe). `composeTour` es lo que `stageMix` hace hoy por dentro; `stageMix(n, terrain, seedBase, ctx = DEFAULT_ROUTE_CONTEXT)` conserva su firma pública (`calendar.ts` l. 546) y delega en él (decisión 19), para que `calendar.test.ts` l. 184-277 y `stageKind.test.ts` compilen en todos los pasos del plan.

### 3.7 Petición y salida de `generateStage` (`routes/grammar/generate.ts`)

```ts
// packages/engine/src/routes/grammar/generate.ts
export type RouteSource = 'real' | 'edicion' | 'generado' // por ETAPA; por carrera: 'real' | 'mixto' | 'generado'

/** Lo que `stageMix` y `composeTour` saben de la carrera; `StageRequest` lo extiende por etapa. */
export interface RouteContext {
  country: string // ISO alpha-2; '' cae a `TERRITORIOS` genérico (fallback)
  raceClass: RaceClass
  format: RaceFormat
  season: number
  routeSource: 'edicion' | 'generado'
}
export const DEFAULT_ROUTE_CONTEXT: RouteContext = {
  country: '',
  raceClass: '2',
  format: 'una-semana',
  season: BASE_SEASON,
  routeSource: 'generado',
}

export interface StageRequest {
  raceId: string
  stageIndex: number // con base 1; 1 en un día
  season: number // BASE_SEASON = 0 es la canónica y tira sus propios dados
  km: number // contrato al 0,1 (calendar.test.ts l. 162-174) si viene de edición
  role: StageRole | 'un_dia'
  terrain: RouteTerrain // sesgo, nunca orden
  geo: GeoSignature // ZONAS[regionOf(...)]
  desde?: GeoZone // etapa de transición (40 % con la ondulación de `desde`)
  raceClass: RaceClass
  format: RaceFormat
  routeSource: 'edicion' | 'generado'
  editionKey?: string // `${from}|${to}|${km}` de editions.ts, para la semilla de edición
  fixed?: { skeleton?: SkeletonId; finalKind?: FinalKind; dPlus?: number } // bancos
}

export interface GeneratedStage {
  profile: StageProfile
  kind: StageKind // = stageKindOf(profile, timeTrial).kind, garantizado por V6
  label: string // = stageKindOf(...).label
  timeTrial?: boolean
  arch: {
    skeleton: SkeletonId
    geo: GeoZone
    motivos: Motif[]
    finalKind: FinalKind | null
    dPlus: number // dPlusDe(profile), relleno incluido
    intentos: number
    degradado: boolean
    frase: string // «Circuito de 14 km × 9 vueltas con un muro de 1,1 km al 11 %; meta a 2 km del muro»
    metadatos: { viento: 0 | 1 | 2 | 3; altitud: GeoSignature['altitud'] } // ficha, no física
  }
  routeSource: 'edicion' | 'generado'
}

export function generateStage(req: StageRequest): GeneratedStage
```

`StageRequest` es todo lo que el generador sabe de la etapa, y es la lista de lo que hoy no le llega: el generador actual recibe `km` y `seed` (`flatSegments(km, seed)` y hermanos, `profileGen.ts` l. 236-514) y ni siquiera el país que `buildRace` calcula en l. 889 (mapa 02 §1, diagnóstico de la sección 1). Por qué cada campo:

- `km` es un CONTRATO cuando `routeSource` es `edicion`: `calendar.test.ts` l. 162-174 exige que la distancia de una etapa de edición real coincida al 0,1 con la fila de `editions.ts`, y por eso `ARCH.edicion.kmJitter` no se aplica a esas etapas (decisión 20).
- `terrain` es el `RouteTerrain` de la fila (`featureProfile.ts` l. 21: `flat | hilly | mountain | cobbles | classic | itt`) y entra como sesgo de pesos, nunca como orden: un `terrain: 'mountain'` en `flandes` no produce una reina, produce `media_alto` anotado.
- `geo` es la firma ya resuelta (`ZONAS[regionOf(raceId, stageIndex, country)]`) y no la clave, para que `generateStage` sea pura y un banco pueda pasarle una firma sintética.
- `desde` solo va en etapas de transición de una vuelta (sección 7) y da la ondulación del primer 40 % (`ARCH.itinerario.transicion`).
- `editionKey` es la respuesta al defecto del mapa 02 §7: hoy dos carreras con la misma salida, meta y km dibujan lo mismo porque la semilla de edición es `${from}|${to}|${km}` sin `raceId`. La semilla nueva es `raceId|e{i}|{editionKey}` (decisión 22), separada de la de identidad.
- `fixed` es para los bancos (sección 13): `fixed.skeleton` fuerza el esqueleto (galería y `stageKind.test.ts` por esqueleto), `fixed.finalKind` y `fixed.dPlus` acotan lo que `calendarQueens` estratifica. En el calendario nunca va.

`GeneratedStage.kind` y `label` no son campos que el generador rellene a su criterio: son el resultado de `stageKindOf(profile, timeTrial)` (`stageKind.ts` l. 71, con la etiqueta `Summit finish` decidida por `SUMMIT_RUN_IN_KM` 5, decisión 23) y V6 lo garantiza; `arch` es lo que la ficha enseña y el banco mide, y `frase` es la única descripción textual (decisión 39, D10). `metadatos` lleva `viento` y `altitud` de la firma para el texto de la ficha, que dice llano abierto y nunca promete abanicos (decisión 17).

`RouteContext` es el subconjunto de `StageRequest` que se conoce a nivel de carrera; `DEFAULT_ROUTE_CONTEXT` existe para que `stageMix(n, terrain, seedBase)` siga compilando con tres argumentos entre el paso 1 y el 8 del plan, y produce una vuelta `.2` de `una-semana` en el territorio genérico con la temporada canónica.

### 3.8 Temporada e identidad (`routes/grammar/edition.ts`)

```ts
// packages/engine/src/routes/grammar/edition.ts
export const BASE_SEASON = 0 // calendarRun.ts l. 135: season = floor(gameDay / SEASON_DAYS)
export function calendarForSeason(season: number): CalendarRace[] // memoizada por season
export function raceForSeason(raceId: string, season: number): CalendarRace
export function stagesForSeason(raceId: string, season: number): CalendarStage[]
// Subflujos: `arch|raceId`, `firma|raceId` (sin season); `ed|raceId|season`; `mot|raceId|i|season|slot|j|i{intento}`,
// `pos|raceId|i|season|i{intento}`, `dib|raceId|i|season|slot|i{intento}`. Etapa de edición: raceId|e{i}|{editionKey} en lugar de raceId|i.
```

`BASE_SEASON` vale 0 porque es lo que el mundo calcula: `calendarRun.ts` l. 135 hace `season = Math.floor(gameDay / SEASON_DAYS)`, y el primer día de un mundo es la temporada 0. La propuesta de banco proponía `calendarFor(1)` y la de geografía dejaba la pregunta abierta; la síntesis cierra que `SEASON_CALENDAR = calendarForSeason(BASE_SEASON)` y que la temporada 0 tira sus propios dados con `ed|raceId|0` como cualquier otra (decisión 21), corrigiendo la objeción del juez de ejecutabilidad a la mediana de cardinalidades. Los tres subflujos sin `season` (`arch`, `firma`) son la identidad; los tres con `season` son la edición; el sufijo `i{intento}` solo existe en `mot`, `pos` y `dib` (sección 8). Las tres funciones se memoizan (sección 14) y son la ÚNICA puerta por la que `calendarRun.ts`, `callups.ts` y `raceContext.ts` leen una etapa no congelada (decisión 23).

### 3.9 Vetos (`routes/grammar/veto.ts`)

```ts
// packages/engine/src/routes/grammar/veto.ts
export type VetoId =
  | 'V1'
  | 'V2'
  | 'V3'
  | 'V4'
  | 'V5'
  | 'V6'
  | 'V7'
  | 'V8'
  | 'V9'
  | 'V10'
  | 'V11'
  | 'V12'
  | 'V13'
  | 'V14'
  | 'V15'
  | 'V16'
export interface Veto {
  id: VetoId
  detalle: string
}
export function verify(
  profile: StageProfile,
  sk: Skeleton,
  req: StageRequest,
  motivos: Motif[],
): Veto | null
// Solo lee routes/ (stageKindOf, finalKindOf, climbSize, dPlusDe) y geometría del esqueleto. NUNCA sampleProfile,
// finishType ni costBase (regla del juez del motor, riesgo 3): eso se mide en routeCensus.
```

`verify` devuelve el primer veto que falla, con `detalle` para el test y la galería, o `null`. La firma recibe las cuatro cosas que un veto puede necesitar (el perfil rendido, el esqueleto elegido, la petición y los motivos instanciados) y nada del motor: la regla de vetos puros (decisión 4) es que `verify` importe solo de `routes/` y de `grammar/geometry.ts`, y el test `veto.test.ts` lo comprueba con un `grep` de imports. La consecuencia es la que el juez del motor pidió: recalibrar `STAGE.finish*` o `physics.ts` no redibuja ningún perfil. De los dieciséis, V1 a V10 y V15 se evalúan por etapa y disparan reintento; V11 a V14 y V16 son de calendario o de vuelta y se miden en `routeCensus` y `tour.test.ts` (tabla completa en la sección 9).

### 3.10 El censo (`sim/routeCensus.ts`)

```ts
// packages/engine/src/sim/routeCensus.ts
export interface RouteStats {
  raceId: string
  stageIndex: number
  raceClass: RaceClass
  format: RaceFormat
  country: string
  zona: GeoZone | null
  skeleton: SkeletonId | null
  routeSource: RouteSource
  kind: StageKind
  label: string
  finalKind: FinalKind | null
  finishType: FinishType // finishType(deriveFinishTerrain(sampleProfile(profile)), 50): aquí sí
  km: number
  dPlus: number
  dPlusBloques: number // dPlusDe y calendarQueens::desnivelDe, para ver el delta
  nPuertos: number
  nMuros: number
  longestClimbKm: number
  lastClimbKm: number | null
  lastClimbG: number | null
  kmAfterLastClimb: number | null
  climbKmOutsideLast30: number
  kmSubidaShare: number
  breakAppealEstimado: number
  pavesKm: number
  nSectores: number
  estrellas5: number
  maxG: number
  huella: number[] // g por km
  intentos: number
  degradado: boolean
}

/** Resumen de un grupo de filas: cuantiles de las columnas numéricas y reparto de las categóricas. */
export interface Summary {
  n: number
  cuantiles: Partial<
    Record<keyof RouteStats, { p10: number; p50: number; p90: number; min: number; max: number }>
  >
  reparto: Partial<Record<keyof RouteStats, Record<string, number>>> // fracción por valor (kind, finalKind, finishType, skeleton, zona)
}

export function routeCensus(calendar?: CalendarRace[]): RouteStats[]
export function aggregate(
  rows: RouteStats[],
  by: (r: RouteStats) => string,
): Record<string, Summary>
```

`RouteStats` es una fila por etapa del calendario que el juego corre (1.418 hoy), y es el único sitio del diseño donde se llama a `sampleProfile`, `deriveFinishTerrain` y `finishType` (con `groupSize` 50, `finish.ts` l. 142): por eso `zona` y `skeleton` admiten `null` (las 177 etapas `real` no tienen esqueleto) y por eso lleva `dPlus` y `dPlusBloques` a la vez, para imprimir el delta entre la integración por tramos de `dPlusDe` y la de bloques de `calendarQueens::desnivelDe` (esperado < 5 %, decisión 9). `huella` es la pendiente media por km y alimenta la correlación de V12. `Summary` es lo que `aggregate` devuelve por grupo (`by` suele ser `r => r.skeleton ?? 'real'` o `r => r.raceClass`), y es la forma de las bandas de `ROUTE_CENSUS_TARGETS` de la sección 13: cada banda se escribe sobre un cuantil o sobre una fracción de reparto. Coste medido: 0,57 s sobre las 1.418 etapas (juez del motor §1), de ahí que corra en `test:rapido` (decisión 31).

### 3.11 Lo que ganan `StageSpec`, `CalendarStage`, `CalendarRace` y `race_routes`

```ts
// packages/engine/src/routes/calendar.ts (hoy l. 33-46)
export interface StageSpec {
  kind: StageKind
  label: string
  profile: StageProfile
  timeTrial?: boolean
  routeSource: RouteSource // NUEVO: 'real' | 'edicion' | 'generado'
  arch?: GeneratedStage['arch'] // NUEVO: solo cuando routeSource !== 'real'
}
export interface CalendarStage extends StageSpec {
  index: number
  name: string
} // sin cambios

export interface CalendarRace {
  // ...los campos de hoy (l. 48-79) sin cambios: id, name, level, raceClass, format, startDay, openTo,
  // region?, championshipCountry?, championshipCategory?, country?, stages, restAfter?
  routeSource: 'real' | 'mixto' | 'generado' // NUEVO: agregado de sus etapas
}
```

```ts
// packages/db/src/raceRoutes.ts (hoy l. 29: `'real' | 'generado'`)
export type RouteSource = 'real' | 'edicion' | 'generado'
export async function freezeRaceRoute(
  db: Conn,
  worldId: string,
  raceKey: string,
  raceId: string,
  season: number,
): Promise<void>
// escribe, por etapa: profile, route_source, kind, label, time_trial (migración 00NN_race_routes_kind.sql)
```

`routeSource` por etapa toma tres valores porque hay tres ramas en `buildRace` (sección 11): rasgos reales en `STAGE_FEATURES` dan `real`; una etapa de `RACE_EDITIONS` sin rasgos (ciudades y km reales, relieve generado) da `edicion`; tabla y nacionales dan `generado`. Hoy `freezeRaceRoute` escribe `'generado'` a ciegas (`db/raceRoutes.ts` l. 47-50, con el comentario que lo reconoce) y el tipo de l. 29 es binario; pasa a copiar `stage.routeSource`. La columna `route_source` es `text` (`schema.ts` l. 523), así que el tercer valor no necesita migración; `kind`, `label` y `time_trial` sí (columnas nuevas), y `freezeRaceRoute` gana `season` porque el recorrido que se congela es el de `stagesForSeason(raceId, season)` y no el de `SEASON_CALENDAR` (decisión 23). `arch` NO se congela: `race_routes.profile` sigue siendo exactamente el `StageProfile` que el motor recibe (comentario de `schema.ts` l. 509), y la ficha de una etapa generada recompone `arch` llamando a `stagesForSeason(raceId, season)`, que es determinista y memoizada, con el `season` de la `raceKey` (`calendarRun.ts` l. 783: `${race.id}:s${season}`).

El agregado por carrera sigue la regla de I-40 traducida: `real` si todas sus etapas son `real`, `generado` si todas son `generado`, `mixto` en cualquier otro caso (una gran vuelta con 18 etapas de edición y 3 con rasgos es `mixto`). Es un valor de carrera, nunca de etapa: por eso `RouteSource` de etapa no lo incluye y `scripts/inventario-recorridos.mjs` lo calcula desde las etapas. `RaceRow` (l. 381-398) no cambia: ni `geo` ni `paisaje` entran en la fila, porque la zona vive en `RACE_REGION` (§3.5) y el km de las 142 carreras de un día sin `km` explícito lo sortea `kmDe` con `firma|raceId` (decisión 36).

Un test corto fija las dos reglas de esta subsección en `routes/calendario.test.ts`:

```ts
it('routeSource de carrera es el agregado de sus etapas', () => {
  for (const race of calendarForSeason(BASE_SEASON)) {
    const set = new Set(race.stages.map((s) => s.routeSource))
    const esperado = set.size > 1 ? 'mixto' : set.has('real') ? 'real' : 'generado'
    expect(race.routeSource).toBe(esperado)
    for (const s of race.stages) {
      if (s.routeSource === 'real') expect(s.arch).toBeUndefined()
      else expect(s.arch?.skeleton).toBeDefined()
    }
  }
})
```

### 3.12 Nota al pie: cómo leer las propuestas con estos nombres

Quien venga de las cinco propuestas encontrará otros nombres para las mismas cosas; la tabla completa está en el apéndice A. Las traducciones que más se usan al leer esta sección: `Motivo` y la unión discriminada `Motif` de banco e ingeniero son `Motif`; `RouteBrief`/`ArchetypeId`, `Esqueleto`/`Arquitectura`, `Skeleton`/`FamilyId` y `Archetype`/`ArchFamily` son `Skeleton`/`SkeletonId`; `GeoKey`/`RouteGeo`, `Paisaje`/`PaisajeSpec` y `RegionId` son `GeoZone`/`GeoSignature`; `RACE_GEO`, `RACE_GEO_OVERRIDE`, `RaceRow.paisaje` y `RaceRow.geo` son `RACE_REGION`; `Papel` y `MixRole` son `StageRole`; `RouteRequest`, `ContextoEtapa` y `GenInput` son `StageRequest`; `brief`, `paisaje` + `arquitectura`, `skeleton` y `RouteMeta` son `GeneratedStage.arch`; `source` y `origen` son `routeSource`, con el `mixto` de datos solo como agregado de carrera; `desnivelDe` y `climbMetres` son `dPlusDe`; y los V de cada propuesta se renumeran a los V1 a V16 de la sección 9 (V5 es el V1 de banco, geografía, ingeniero y datos; V8 reúne V6 + V8 de banco y V2 de geografía, ingeniero y datos).
