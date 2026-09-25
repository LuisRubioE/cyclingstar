## 3. El modelo de tipos

Esta sección escribe los tipos que el resto del documento usa por nombre. Van en el orden en que el generador los consume: primero lo que no cambia (el contrato del motor), después las piezas (motivos), los moldes (esqueletos), el sitio (zonas, territorios, regiones), la composición de una vuelta, la petición y la salida de `generateStage`, la temporada, los vetos y la geometría que leen, el censo, y al final lo que ganan `StageSpec`, `CalendarStage`, `CalendarRace` y `race_routes`. Cada bloque TypeScript va seguido de por qué tiene esa forma y contra qué línea del código encaja. Los rangos numéricos que aparecen en comentarios salen del bloque `ARCH` (sección 12, Las constantes) y no se repiten aquí con su apoyo; los nombres de fichero son los de la tabla de la sección 15 (El plan de implementación). Regla de lectura: cuando otra sección introduce un nombre exportado, su firma está aquí, en la fila de su fichero, tal como la sección que lo introduce la escribe; si una sección y esta discrepan, manda esta y la pasada de coherencia corrige la otra.

Una regla de importación que vale para todos los bloques y que ningún test de tipos ve: `constants.ts` no importa nada del motor (es hoja); ningún fichero de `routes/grammar/` importa `routes/calendar.ts`; `calendar.ts` importa todos los `grammar/*.ts`. Es lo que impide el ciclo de carga que se explica en §3.8 y lo sella `routes/arranque.test.ts`.

### 3.1 Lo que no cambia: el contrato del motor (`stage/types.ts` l. 12-48)

El motor de etapa no ve el generador. Ve un `StageProfile` (`types.ts` l. 44-47: `segments` y `banners?`), formado por `Segment` (l. 36-41: `km`, `tipo`, `tramos?`, `estrellas?`), `Ramp` (l. 18-21: `km`, `g` en %) y `Banner` (l. 24-30: `km`, `tipo: 'meta_volante' | 'cima'`, `cat?`), con cinco terrenos de autoría (`SegmentTerrain`, l. 12: `llano`, `rompepiernas`, `puerto`, `descenso`, `paves`). `sampleProfile` (`sample.ts` l. 68-125) lo colapsa a bloques de 100 m con cuatro campos físicos (`Block`, `types.ts` l. 50-61: `g`, `tipo`, `estrellas`, más `banner?` y `climbCategory?` para los puntos), y la física entera lee solo `g`, `tipo` y `estrellas` (mapa 03 §3, tabla de `physics.ts` l. 20-653). Cuatro hechos de ese mapa fijan la forma de todo lo que sigue:

1. `rompepiernas` muere en el muestreo: `sample.ts` l. 100-101 le pone `g = STAGE.rollingGradient` (1,5, `constants.ts` l. 1596) aunque traiga tramos, y los tramos se ignoran. El generador nunca lo emite (decisión 2 de la síntesis): lo que hoy sale como `rompepiernas` se escribe como `llano` con tramos.
2. `kmSubida` cuenta bloques de tipo `subida`, no pendiente (`simulate.ts` l. 1696-1702 vía mapa 03 §4.1). Un `llano` con tramos al 3 % no suma; un `puerto` con tramos al 1 % sí. Por eso el modelo distingue `tendida` (tipada `llano`: desgasta, no cuenta) de `cota` (tipada `puerto`: cuenta), y por eso `Segment.tipo` es una decisión del generador y no una consecuencia de la pendiente.
3. El contrato no tiene altitud, exposición al viento, anchura ni costa (mapa 03 §1, lista de lo que no está). Nada de eso puede llegar al motor desde el perfil; en el modelo viaja como metadato de la ficha (`GeneratedStage.arch.metadatos`, decisión 17) y nunca como física.
4. `finishType` (`finish.ts` l. 142) y `deriveFinishTerrain` (l. 71) leen bloques muestreados, no segmentos: el tipo de final es una propiedad del motor, no del perfil. Por eso el modelo promete `kind` y `finalKind` (que se leen del perfil con `stageKindOf`, `stageKind.ts` l. 71, y `finalKindOf`, `finalKind.ts` l. 78) y solo MIDE `finishType` en el censo (decisión 4).

Nada nuevo entra en `types.ts`. Todo tipo de esta sección vive aguas arriba del `StageProfile` y se traduce a él en `render.ts`. `StageKind` (`'llana' | 'media' | 'reina' | 'cri' | 'clasica'`) no está en `stageKind.ts` sino en `packages/engine/src/routes/testTour.ts` l. 8, y `stageKind.ts` l. 18 lo importa de ahí; todos los bloques de esta sección que lo usan escriben `import type { StageKind } from '../testTour.js'` y el tipo no se mueve en E1 (moverlo cambiaría un fichero que el paso 1 promete no tocar).

### 3.2 Motivos (`routes/grammar/motifs.ts`)

```ts
// packages/engine/src/routes/grammar/motifs.ts
import type { Segment } from '../../stage/types.js'
import type { GeoSignature } from './geo.js'

export type MotifKind =
  | 'enlace' | 'expuesto' | 'tendida' | 'descenso'          // enlaces
  | 'cota' | 'puerto' | 'muro' | 'cadena' | 'sector' | 'racimo' | 'circuito'   // dificultades
  | 'meta'                                                  // siempre el último

export type MetaKind =
  | 'esprint' | 'repecho' | 'muro_meta' | 'alto_corto' | 'alto_largo'
  | 'cima_cerca' | 'descenso_meta' | 'valle' | 'sector_meta'

export interface Motif {
  kind: MotifKind
  km: number                                   // total del motivo; en `circuito`, el de una vuelta
  g?: number                                   // dificultades y `tendida`: pendiente media en %
  forma?: 'regular' | 'progresiva' | 'irregular'
  adoquin?: boolean                            // `muro` adoquinado (sigue siendo `puerto`) o `sector` de adoquín (frente a tierra)
  firme?: 'adoquin' | 'tierra'                 // solo `sector`; tierra se rinde como `paves` 2-3★
  estrellas?: number                           // solo `sector`: 1..5
  hijos?: Motif[]                              // `cadena`, `racimo`, `circuito`
  vueltas?: number                             // solo `circuito`
  meta?: MetaKind                              // solo `meta`
  cotaFinal?: { km: number; g: number }        // `meta` con cota
  firma?: boolean                              // motivo de FIRMA: no cambia entre ediciones
  nombre?: string                              // texto para la ficha («Muro de 1,2 km al 11 %»)
}

/** Fábrica de corrientes de azar por subflujo nominal, al estilo de `stageRng` (stage/rng.ts l. 26-29). */
export type RngFactory = (sub: string) => () => number

/** `null` si el motivo cumple los rangos de `ARCH.motivo` y `ARCH.meta` (y, con `geo`, los de la zona); si no, la regla violada. Puro. */
export function validateMotif(m: Motif, geo?: GeoSignature): string | null
/** Rinde UN motivo a segmentos con las primitivas de `profileGen.ts`; `geo` da la amplitud del relleno.
 *  `rng` es una fábrica: el motivo tira de `rng('')` y cada hijo h de `cadena`, `racimo` y `circuito` de `rng(`hijo${h}`)`.
 *  No cuadra km (`normalizeEnlaces`), no emite pancartas (`emitirPancartas`), no verifica (`verify`). Puro. */
export function renderMotif(m: Motif, rng: RngFactory, geo: GeoSignature): Segment[]
```

Un motivo es una pieza de carretera con significado ciclista, y es la unidad que la semilla decide primero (principio 1, sección 2). Es un solo `interface` con campos opcionales y no una unión discriminada (banco e ingeniero la usaban) por dos razones prácticas: los esqueletos declaran `params?: Partial<Pick<Motif, ...>>` sobre un solo tipo, y la plantilla canónica de cada esqueleto es un `Motif[]` literal que se escribe a mano (sección 5); `validateMotif` es quien impone la coherencia entre `kind` y campos, con un test por motivo en `grammar/motifs.test.ts`, y con `geo` además comprueba que el motivo cabe en la zona (`validateMotif(m, ZONAS.alpes)`, sección 4). Todo está en km y % redondeado a 0,1, que es la resolución a la que `normalizeEnlaces` cuadra el total (V10 exige Σ km al 0,1).

`renderMotif` recibe una fábrica y no una sola corriente porque un `circuito` promete que sus `vueltas` pasos por la misma cota dibujen LO MISMO, y una `cadena` o un `racimo` necesitan una corriente por hijo para que añadir un hijo no desplace el dibujo de los demás (principio 7): con un único `rand` ninguna de las dos cosas es posible. La fábrica la construye `renderSkeleton` (sección 8) sobre el subflujo `dib|…` de §3.8, exactamente como `stageRng(seed)` devuelve `(subflow) => seededRng(...)` en `stage/rng.ts` l. 26-29.

Cómo se rinde cada motivo a `Segment[]` y qué lee el motor de él (rangos de `ARCH.motivo`, sección 12; lecturas del mapa 03 §3 y §4):

| Motivo | `km` | `g` | Rinde a `Segment[]` como | Qué lee el motor |
| --- | --- | --- | --- | --- |
| `enlace` | [1; 60] | amplitud `geo.amplitud` ≤ 2,4 | `rolling(rand, km, amp, 0)` en trozos de 3 a 6 km (`profileGen.ts` l. 102): varios `llano` con tramos | pendiente en `costBase`; único terreno con abanico y acordeón (`simulate.ts` l. 1215, 4340-4408); `selectionFactor` 0 |
| `expuesto` | [5; 60] | amplitud fija 1,0 | `rolling(rand, km, 1.0, 0)` | igual; la ficha lo describe como llano abierto, sin prometer abanicos (decisión 17) |
| `tendida` | [5; 30] | [1,5; 3,5] | UN `llano` con 2 a 4 tramos a `g ± 0,7` | `costBase` 0,24 + 0,135·g; NO suma `kmSubida`; no selecciona |
| `descenso` | [2; 10]; lo calcula `colocar` (`place.ts`, sección 8) desde la dificultad precedente con `ARCH.motivo.descenso.kmPorDesnivel` (`clamp(len·g·10/55, 2, 10)`, la bajada canónica de `mountainClassicSegments` l. 467) y lo guarda en `Motif.km`; un `descenso` sin dificultad delante toma `kmRango` del `Slot` | [−8; −3]; la pendiente la fija la fracción `ARCH.colocacion.bajadaTrasPuerto` de lo subido (sección 8, §8.6) | `descent(rand, km, |g|)`: un `descenso` con tramos | selecciona solo con g ≤ −4 en su primer km o entero a ≤ 25 km de meta (l. 2427, 5083-5089); coste con suelo 0,10. `validateMotif` solo exige `km ∈ [2; 10]` y `g ∈ [−8; −3]` |
| `cota` | [2,5; 8,0] | [4; 7] | `climb(rand, km, g)`: un `puerto` con tramos, pancarta `cima` si ≥ 1,5 km | `subida`: suma a `kmSubida`, deriva, `climbRaceKmToGo` 30, categoría por `deriveClimbCategory` |
| `puerto` | [9; 25] | [5; 9] | `climb`; `forma: 'irregular'` añade una rampa de [0,3; 0,8] km al [11; 13] % | igual; con COL bloque a bloque donde g ≥ 8 (`riderPerfil`, l. 434) |
| `muro` | [0,4; 3,0] | [8; 16] | `climb(rand, km, g, { gMax: 16 })` con 2 rampas; `adoquin: true` sigue siendo `puerto` | COL en todos sus bloques; en meta y ≤ 1,0 km, `finishType` da `muro` (`finish.ts` l. 184-185) |
| `cadena` | Σ hijos + enlaces de [1; 6] km | | hijos (`muro` o `cota`) intercalados con `rolling` corto, sin valle; el hijo h con `rng(`hijo${h}`)` | nada nuevo: n rachas de `subida` seguidas |
| `sector` | [0,3; 3,7] | 0 | `{ km, tipo: 'paves', estrellas }`; `firme: 'tierra'` se rinde como `paves` de 2 a 3★ (como Strade en `classicRoutes.ts` l. 594) | `estrellas` en `costBase` 0,55 + 0,06·e, selección y percances ×20 (`constants.ts` l. 4389) |
| `racimo` | [20; 60] | | [4; 10] sectores separados por `rolling` de [2; 6] km con amplitud 0,7; el sector h con `rng(`hijo${h}`)` | `kmToNextPaves` y el peaje de entrada en cada sector (l. 1628-1636, 2611) |
| `circuito` | vuelta [8; 30] × [3; 18] vueltas | | los `hijos` rendidos `vueltas` veces; el hijo h se rinde con `rng(`hijo${h}`)` y cada vuelta REUTILIZA la misma corriente (se vuelve a pedir `rng(`hijo${h}`)` por vuelta, que devuelve la misma secuencia) | n pasos por la misma cota; una pancarta por paso ≥ 1,5 km (decisión 25) |
| `meta` | según `MetaKind` | | sección 4 (tabla de los nueve finales) | `finishType` medido en el censo (V16) y `finalKindOf` garantizado (V7) |

Dos aclaraciones que las propuestas dejaban ambiguas. `tendida` y `expuesto` se tipan `llano` a propósito y no `rompepiernas`, porque el segundo pierde sus tramos en el muestreo (hecho 1 de §3.1). Y `muro` adoquinado sigue siendo `puerto` (regla de la casa de `fuentes-recorridos.md`, citada por arquitectura §3.1): `adoquin: true` solo cambia el nombre de la ficha y el requisito geográfico (`GeoSignature.muro.adoquin`), nunca `Segment.tipo`.

### 3.3 Esqueletos (`routes/grammar/skeletons.ts`)

```ts
// packages/engine/src/routes/grammar/skeletons.ts
import type { StageKind } from '../testTour.js'
import type { FinalKind } from '../finalKind.js'
import type { RouteTerrain } from '../featureProfile.js'
import type { RaceClass } from '../uci.js'

export interface Slot {
  motif: MotifKind
  n: [number, number]                          // cardinalidad; 0 en el mínimo = hueco opcional
  ventana: [number, number]                    // fracción de la etapa donde EMPIEZA el motivo
  params?: Partial<Pick<Motif, 'g' | 'forma' | 'adoquin' | 'estrellas' | 'vueltas'>> & {
    kmRango?: [number, number]
    gRango?: [number, number]
  }
  firma?: boolean
}

export interface Skeleton {
  id: SkeletonId
  kind: StageKind                              // lo que `stageKindOf` TIENE que devolver (V6)
  label: string                                // la etiqueta de la ficha; OBLIGATORIA y compatible con `kind` (test)
  timeTrial?: true                             // solo `et_crono`, `et_prologo`, `et_cronoescalada`, `nc_crono`
  finalKind?: FinalKind                        // reinas y medias con un solo final posible: lo que `finalKindOf` TIENE que devolver (V7)
  meta: MetaKind
  slots: Slot[]
  dPlus: [number, number]                      // objetivo TOTAL, relleno incluido (ARCH.reina.dPlusIncluyeRelleno)
  km: [number, number]                         // rango bruto antes de ARCH.km.porClase
  requiere?: Partial<GeoSignature>
  pesoBase: number                             // peso del catálogo antes de zona y clase
  canonico: Motif[]                            // instancia fija escrita a mano: pasa todos los vetos por construcción
  alternativas?: Motif[][]                     // rotación DECLARADA (ARCH.edicion.nivel 2): la edición elige season % n
}

export type SkeletonId =
  // un día (15)
  | 'ud_esprint' | 'ud_esprint_capi' | 'ud_circuito' | 'ud_muro_final' | 'ud_muros'
  | 'ud_muros_adoquin' | 'ud_sterrato' | 'ud_adoquin' | 'ud_adoquin_ligero' | 'ud_montana'
  | 'ud_montana_media' | 'ud_montana_alto' | 'ud_criterium' | 'nc_ruta' | 'nc_crono'
  // etapa de vuelta (16)
  | 'et_llana' | 'et_llana_viento' | 'et_media_valle' | 'et_media_alto' | 'et_media_muro'
  | 'et_media_tendida' | 'et_reina_alto_largo' | 'et_reina_alto_corto' | 'et_reina_cima_cerca'
  | 'et_reina_valle' | 'et_reina_encadenada' | 'et_montana_corta' | 'et_reina_blanda'
  | 'et_crono' | 'et_prologo' | 'et_cronoescalada'

export const SKELETON_IDS: readonly SkeletonId[]              // la unión como lista literal (31); el test la compara con Object.keys(SKELETONS)
export const SKELETONS: Record<SkeletonId, Skeleton>
export const CANONICO: Record<SkeletonId, Motif[]>            // las 31 plantillas canónicas (Skeleton.canonico se rellena desde aquí)
export const NC_RUTA_CLASICA: Motif[]                         // plantilla de `nc_ruta` en zonas sin cota ≥ 3,3 km (sección 5)
/** Traducción de `RaceRow.terrain` a candidatos de un día con multiplicador; sesgo, nunca orden (sección 5, §5.6). */
export const SESGO_TERRENO: Record<RouteTerrain, Partial<Record<SkeletonId, number>>>
/** A qué terreno se baja cuando la zona no admite ningún candidato: cobbles → classic → hilly → flat; mountain → hilly; flat e itt no bajan. */
export const ESCALON_TERRENO: Partial<Record<RouteTerrain, RouteTerrain>>
/** `SKELETONS[id]`, salvo `nc_ruta` en zonas sin `cota` ≥ 3,3 km, que devuelve una copia `clasica / Classic` con `NC_RUTA_CLASICA` (sección 5, §5.7). */
export function skeletonFor(id: SkeletonId, geo: GeoSignature): Skeleton
/** Candidatos con peso ya multiplicado (pesoBase × SESGO_TERRENO × ARCH.pesoPorClase × geo.pesos); pura (sección 5, §5.7). */
export function candidatos(req: Pick<StageRequest, 'role' | 'terrain' | 'geo' | 'raceClass' | 'format' | 'km'>): { id: SkeletonId; peso: number }[]
```

Un esqueleto es una secuencia de huecos con cardinalidad y ventana de posición, y es el molde que el dueño echa en falta cuando dice que siempre salen los mismos tres o cuatro modelos (agenda §4.18): 31 en vez de los siete de hoy (`ittSegments === flatSegments`, mapa 01 §2.1). Son 31 y no los 32 que prometía arquitectura §3.3 y que repiten la cabecera (§0.4), §2.1, la decisión 1 de §C.1 y §B.1 y §B.2 del esqueleto: la unión de arriba tiene 15 identificadores `ud_*`/`nc_*` y 16 `et_*`, contados uno a uno, y las propuestas no nombran ningún decimoséptimo esqueleto de etapa. El tipo es lo que compila: `SKELETONS` tendrá 31 claves, la galería 31 esqueletos y las bandas «esqueletos distintos por clase» se miden sobre 31; la sección 5 ya escribe 31 y `skeletons.test.ts` sella `Object.keys(SKELETONS).sort()` igual a `SKELETON_IDS` (15 + 16). Por qué cada campo:

- `kind` es una PROMESA, no una etiqueta: V6 exige `stageKindOf(profile, sk.timeTrial ?? false).kind === skeletonFor(sk.id, req.geo).kind` (`stageKind.ts` l. 71-95, umbrales `PASS_MIN_KM` 8,5 l. 62 y `WALL_MAX_KM` 3 l. 60 sin tocar, decisión 26). Se compara contra `skeletonFor(...)` y no contra `SKELETONS[id]` porque `nc_ruta` es la única excepción a «un `kind` por esqueleto» (sección 5, §5.7). Un esqueleto que no puede cumplir su promesa se corrige en el catálogo, no en el clasificador.
- `timeTrial` es dato de entrada de `stageKindOf`, no algo que se lea del relieve (`stageKind.test.ts` l. 32-43: «una crono es una crono aunque su perfil sea el de una llana»), y ningún otro tipo lo lleva: ni `StageRequest` (el papel `cri` o el `terrain: 'itt'` de una fila de tabla eligen un esqueleto de crono, y la fila `itt` de un día y los 266 `nc-*-itt` entran con `role: 'un_dia'`), ni el `Slot`. Por eso lo declara el esqueleto (`true` en los cuatro de crono, ausente en el resto) y `GeneratedStage.timeTrial = sk.timeTrial ?? false` es lo que V6 usa.
- `label` es la etiqueta que la ficha enseña y la que se congela en `race_routes.label`. Para una etapa generada es `sk.label`, puesta DESPUÉS de que V6 haya igualado el `kind`, y no `stageKindOf(...).label`: las etiquetas nuevas de la decisión 38 (`Circuit`, `Wall finish`, `Prologue`, `Hill climb`, `Mountains classic`) no se deducen del perfil (`stageKindOf`, l. 71-98, solo devuelve `Flat`, `Hills`, `Uphill finish`, `Summit finish`, `Mountains`, `Classic`, `Cobbles`, `ITT`). `stageKindOf(...).label` queda solo para las etapas `real` (sección 11, §11.5 regla 3). `skeletons.test.ts` sella que cada `label` es compatible con su `kind` (tabla de la sección 5: `Circuit` y `Wall finish` con `clasica` o `media`, `Prologue` y `Hill climb` con `cri`, `Mountains classic` con `reina`, y las ocho de hoy con el `kind` que `stageKindOf` les da). La decisión 38 de §C.1 dice «el `label` de una etapa generada sale de `stageKindOf(...).label»; la pasada de coherencia la reescribe con esta regla, que es la que la sección 11 ya implementa.
- `finalKind` es una promesa cuando está declarado: V7 exige `finalKindOf(profile) === sk.finalKind` (`finalKind.ts` l. 78-85 con los cortes 0,5 / 5 / 20 de `FINAL_KIND_CUTS` l. 30). Cuando NO está declarado (llanas, clásicas, cronos, y los esqueletos con más de un final posible, `ud_montana` y `et_reina_valle`, secciones 5 y 9), V7 se evalúa contra `finalKindDe(sk.meta)` (§3.9): nunca contra `undefined`, porque `finalKindOf` devuelve un valor no nulo en cuanto hay una pancarta `cima` y la comparación fallaría siempre. `skeletons.test.ts` sella que, cuando `finalKind` está declarado, coincide con `finalKindDe(sk.meta)`.
- `ventana` es la fracción de la etapa donde el motivo EMPIEZA, medida desde la salida (arquitectura §3.3). La propuesta de datos anclaba los huecos desde la meta; aquí lo que se ancla desde la meta es solo el final, y lo hace el motivo `meta` con `cotaFinal` y el rango de valle de cada `MetaKind` (`ARCH.meta.*.valle`), que es donde la identidad de una etapa real se decide (mapa 07 §4.3).
- `dPlus` es el desnivel TOTAL, relleno incluido (decisión 9): es lo que `calendarQueens.ts::desnivelDe` (l. 54) mide y lo que `calendarQueens.test.ts` acota, así que el objetivo se persigue sobre esa misma cifra y no sobre la suma de dificultades.
- `km` es el rango bruto; la clase lo recorta con `ARCH.km.porClase` y `ARCH.km.maxPorClase` (sección 7). La propuesta ganadora usaba un factor multiplicativo; la tabla lo sustituye (decisión 36).
- `requiere` es un `Partial<GeoSignature>` que se compara con la firma de la zona mediante `admite(geo, sk)` (§3.4 y sección 6): `{ adoquin: 2 }` exige `geo.adoquin ≥ 2`, `{ sterrato: true }` exige `sterrato`, `{ finalesAlto: 'largo' }` exige exactamente ese valor, y un campo que en la zona es `null` (por ejemplo `puerto`) hace indisponible cualquier esqueleto que tenga un `Slot` de ese motivo con `n[0] ≥ 1`.
- `pesoBase` existe porque el juez de ejecutabilidad señaló que la ganadora dejó los pesos base del catálogo sin escribir (`juicios/ejecutabilidad.md` §4); los valores van en la tabla de la sección 5 y se multiplican por `SESGO_TERRENO` (un día), `GeoSignature.pesos` y `ARCH.pesoPorClase` en `candidatos`.
- `canonico` es un `Motif[]` literal por esqueleto, escrito a mano en `CANONICO` y comprobado en `skeletons.test.ts` contra los 16 vetos: es la plantilla a la que cae `generateStage` tras `ARCH.colocacion.maxIntentos` 8 (con `degradado: true`, y cero veces en el calendario por `ARCH.veto.fallbackMaxShare.calendario` 0).
- `alternativas` es la rotación declarada de `ARCH.edicion.nivel` 2 (decisión 22): la edición elige `[canonico, ...alternativas][season % (1 + alternativas.length)]` como punto de partida (sección 5 y sección 10 escriben la misma fórmula). Solo la tienen los esqueletos que la sección 5 lista (`ud_montana` con Como y Bérgamo; `et_reina_alto_largo` con dos metas).

El tipo entero es serializable (solo literales, arrays y strings, sin funciones): es la propiedad que permite congelar las tres reinas de `REAL_QUEENS` como `Skeleton` literal en `sim/frozenSkeletons.ts` y renderizarlas con el renderizador nuevo (decisión 33), en vez de congelar `Segment[]`.

### 3.4 Geografía (`routes/grammar/geo.ts`)

```ts
// packages/engine/src/routes/grammar/geo.ts
export type GeoZone =
  | 'flandes' | 'ardenas' | 'bretana' | 'francia_norte' | 'macizo_central' | 'alpes' | 'pirineos'
  | 'provenza' | 'italia_norte' | 'italia_centro' | 'dolomitas' | 'italia_sur'
  | 'cantabrico' | 'meseta' | 'andalucia' | 'levante' | 'portugal'
  | 'centroeuropa' | 'escandinavia' | 'britanicas' | 'balcanes' | 'anatolia'
  | 'andes' | 'cono_sur' | 'norteamerica' | 'australia' | 'asia_oriental' | 'golfo' | 'africa_llana'
  | 'generico'

export type Relieve = 'llano' | 'ondulado' | 'media' | 'montana' | 'alta'

/** `null` significa «aquí no existe» y los vetos V1 a V4 lo hacen cumplir. */
export interface GeoSignature {
  zona: GeoZone
  relieve: Relieve
  puerto: { km: [number, number]; g: [number, number]; forma: Motif['forma'] } | null
  cota: { km: [number, number]; g: [number, number] } | null
  muro: { km: [number, number]; g: [number, number]; adoquin: boolean } | null
  adoquin: 0 | 1 | 2 | 3                       // 0 ninguno · 1 urbano · 2 sectores · 3 masivo
  sterrato: boolean
  viento: 0 | 1 | 2 | 3                        // METADATO: no llega al motor (mapa 03 §5.1)
  altitud: 'mar' | 'colina' | 'media' | 'alta' | 'altiplano'   // METADATO y veto V4; no hay altitud en `Segment`
  amplitud: number                             // ondulación del `enlace`, en % (tope ARCH.motivo.enlace.ampMax 2,4)
  finalesAlto: 'ninguno' | 'corto' | 'largo'
  pesos: Partial<Record<SkeletonId, number>>   // multiplican `Skeleton.pesoBase`
}

export interface Territorio {
  ruta: readonly { zona: GeoZone; peso: number }[]   // orden = recorrido plausible por el país
  cordillera: GeoZone | null                   // null = el país no tiene reina; si no, la zona que una vuelta `mountain` tiene que contener
  fallback?: boolean                           // país sin tabla: territorio genérico, contado en test
}

export const ZONAS: Record<GeoZone, GeoSignature>           // 30 filas: 29 zonas con nombre más `generico`
export const TERRITORIOS: Record<string, Territorio>          // ISO alpha-2, 64 filas explícitas (56 obligatorias + 8 voluntarias)
export const FALLBACK: Territorio                             // { ruta: [{ zona: 'generico', peso: 1 }], cordillera: null, fallback: true }
/** Zona de mayor peso de `TERRITORIOS[country].ruta`; `generico` si el país es fallback, es desconocido o `country` es null. */
export function zonaDe(country: string | null): GeoZone
/** Un esqueleto cabe en una zona si todo lo que `requiere` existe: números ≥ (`adoquin`), booleanos `true` (`sterrato`),
 *  enums igualdad (`finalesAlto`, `relieve`, `altitud`), y `puerto`/`cota`/`muro` no `null` si algún `Slot` del esqueleto los pide con n[0] ≥ 1. */
export function admite(geo: GeoSignature, sk: Skeleton): boolean
/** Siempre hacia abajo: alta → montana → media → ondulado → llano; `llano` se queda en `llano`. Nunca hacia arriba: un país llano no gana puertos. */
export function degradar(relieve: Relieve): Relieve
```

La firma de una zona dice qué existe y qué no, y la palabra para lo segundo es `null`, no un rango vacío ni un peso cero: `puerto: null` en `flandes` hace que ningún esqueleto con un `Slot` de `puerto` obligatorio esté disponible allí (V1), `cota: null` en el pólder y el desierto quita hasta la media montaña, y `muro: null` en `golfo` impide un `ud_muros` en Emiratos. La propuesta ganadora dejaba `cota` no anulable; la de geografía anulaba `cota`, `muro` y `puerto`, y esa es la forma que se toma, porque un pólder no tiene cotas de 2,5 km y decirlo con `null` es más honesto que con `[2,5; 2,5]`. `admite` es la única función que lee `requiere`, y `degradar` va siempre hacia abajo por la cadena de los cinco valores de `Relieve` (`alta → montana → media → ondulado → llano`; la decisión 12 de §C.1 escribía cuatro y omitía `alta`, y la sección 17 riesgo 2 la copia: las dos deben decir cinco): una reina pedida en `flandes` sale `media_alto` y se anota, nunca al revés.

`amplitud` sustituye el `bumpy ? 3.2 : 1.8` literal de `rolling` (`profileGen.ts` l. 105) por un número de la zona, con tope `ARCH.motivo.enlace.ampMax` 2,4 para que el relleno nunca alcance el 3 % que `deriveFinishTerrain` lee como cota (`STAGE.finishClimbMinGradient` 3, `constants.ts` l. 3977); el pólder va en [0,4; 0,9]. `viento` y `altitud` son metadatos: `altitud` además veta (V4: `alto_largo` solo con `finalesAlto: 'largo'`, ningún puerto ≥ 15 km fuera de `media`, `alta` o `altiplano`), pero ninguno de los dos toca un `Segment`. `pesos` multiplica `Skeleton.pesoBase` y es donde la zona expresa lo que existe más o menos (Flandes sube `ud_muros` y `ud_muros_adoquin`; los Alpes suben `et_reina_alto_largo`).

Las cifras de las dos tablas, que la sección 6 (dueña) fija y que aquí se repiten para que nadie las cuente distinto: `ZONAS` tiene 30 filas, porque `Record<GeoZone, GeoSignature>` exige una por miembro de la unión y `generico` es la firma del país sin territorio (la cabecera dice «29 zonas»: son 29 con nombre y 30 filas). `TERRITORIOS` tiene 64 filas explícitas: los 56 países con carreras de equipos (mapa 02 §10; la decisión 13 solo cuenta estos) más 8 voluntarias (AR, CL, NZ, IE, SE, FI, LV, QA) que existen porque su zona tiene nombre en `ZONAS` y porque el bug AR/CL de §D.6 exige filas para `cono_sur`. Los 69 países restantes de los 133 de `COUNTRIES` (`packages/shared/src/countries.ts`, medidos con grep en la sección 6; `datos.md` §5.2 decía 136) caen a `FALLBACK`, que es deliberadamente mediocre; `geo.test.ts` sella que ninguno de los 56 es fallback e imprime los 69 como máximo. La decisión 13 de §C.1 y §D dicen «56» y «77 restantes»: la pasada de coherencia pone 64 y 69 en §0.4, §C.1, y en las secciones 7, 15, 16 y 17, que copian el 77.

`Territorio` es la forma en que un país entra en una vuelta (sección 7): `ruta` es una lista ORDENADA de zonas con peso, que un itinerario recorre como ventana contigua. `cordillera` lo lee `itinerarioDe` en dos sitios y solo en dos: (a) `null` es un veto estructural, el país no tiene reina y su etapa decisiva es `media_alto` (Bélgica, Países Bajos, Dinamarca, Golfo, Australia: decisión D8, sección 18); (b) cuando no es `null` y la fila pide `terrain: 'mountain'`, solo valen las ventanas de la ruta que la contienen (sección 7, §7.1 paso 1). La admisibilidad de la reina en una etapa concreta NO se limita a la cordillera: es `z === cordillera || ZONAS[z].relieve ∈ {montana, alta}` (sección 7, `admiteReina`), así que España con `cordillera: 'pirineos'` también pone reinas en `cantabrico` (montaña) y Francia con `alpes` en `pirineos` y `macizo_central`. Por eso el campo es un solo `GeoZone` y no una lista: no dice «dónde caben reinas» (eso lo dice `relieve`) sino «qué zona tiene que atravesar una vuelta de montaña», y para ES, FR e IT la sección 6 elige la que el mapa 07 §2 asocia a la gran vuelta (Pirineos, Alpes, Dolomitas). `zonaDe(country)` devuelve la zona de mayor peso de la ruta y es la última red de `regionOf` (§3.5): solo los 532 nacionales pasan por ella, y `null` (el `RouteContext.country` de un banco sin país) da `generico`.

### 3.5 Regiones por carrera y por etapa (`routes/grammar/regions.ts`)

```ts
// packages/engine/src/routes/grammar/regions.ts
export interface RaceRegion { default: GeoZone; stages?: Record<number, GeoZone> }   // stages: índice con base 1
export const RACE_REGION: Record<string, RaceRegion>          // 310 carreras de equipos, curadas desde raceRoutes.ts
export function regionOf(raceId: string, stageIndex: number, country: string | null): GeoZone
// = RACE_REGION[raceId]?.stages?.[stageIndex] ?? RACE_REGION[raceId]?.default ?? zonaDe(country)
// Test: ninguna carrera de equipos (WT_TABLE, PRO_TABLE, CON_TABLE) cae a zonaDe(country); solo los 532 .NC pasan por ahí.
```

`RaceRow` (`calendar.ts` l. 381-398) no cambia: ni `geo` ni `paisaje` entran en la fila (la sección 6 lo decide igual, contra arquitectura §5.3 e ingeniero §5.2). La propuesta ganadora añadía `geo?: GeoZone` a la fila y sorteaba la zona con `geo|${raceId}` cuando faltaba, para los 125 de 310 casos de FR, IT y ES; la síntesis retira el sorteo (decisión 14) porque una carrera no cambia de cordillera según la semilla, y saca la zona a una tabla aparte, curada a mano desde las ciudades de `raceRoutes.ts`, con dos niveles: `default` para la carrera y `stages` para las etapas de las 60 ediciones reales, donde el país es grueso de más (`race-france` e6 Pau → Gavarnie-Gèdre es `pirineos`, e15/18/19/20 son `alpes`; el resto de etapas caen a `default`). El índice de `stages` es el mismo `CalendarStage.index` con base 1 (`calendar.ts` l. 43-44) y el mismo orden de `RaceEdition.stages` (`editions.ts` l. 17-22).

Quién llama a `regionOf` y quién no, porque de eso depende que una vuelta recorra el país: las 178 carreras de un día de tabla la llaman con `stageIndex` 1; las 60 ediciones, etapa a etapa; los 532 nacionales caen por construcción al tercer eslabón. Las 72 vueltas COMPUESTAS (325 etapas) no la llaman por etapa: su zona de meta la decide `itinerarioDe` (§3.6) como ventana de `TERRITORIOS[country].ruta`, y `composeTour` construye cada `StageRequest` con `geo: ZONAS[it.metas[i]]` y `desde: it.desde[i]`; `RACE_REGION[raceId].default` de una vuelta compuesta es la zona con la que la carrera se anota en el inventario y la galería, y `regions.test.ts` exige que pertenezca a `TERRITORIOS[country].ruta`. Sin esta regla, `regionOf` devolvería `default` en todas las etapas de una vuelta y las metas del itinerario no llegarían nunca a `generateStage`, que es justo la promesa central al dueño (la reina en la cordillera).

`regionOf` es una cadena de tres `??` y nada más. `regions.test.ts` sella que para todo `id` de las tres tablas de filas de `calendar.ts` (`WT_TABLE` l. 931, `PRO_TABLE` l. 1242 y `CON_TABLE` l. 1615: las 310 carreras de equipos, WorldTour y grandes vueltas incluidos) el tercer eslabón no se alcanza; en la práctica el test itera `SEASON_CALENDAR.filter((r) => !r.championshipCountry)` y comprueba `RACE_REGION[r.id] !== undefined`, para que una tabla nueva no se quede fuera. Y en una vuelta compuesta cuyo territorio tiene `cordillera`, al menos una etapa de `stagesForSeason(id, 0)` tiene `arch.geo === cordillera` cuando `terrain === 'mountain'` (misma prueba, para que la zona de meta viaje de verdad).

### 3.6 Composición de una vuelta (`routes/grammar/tour.ts`)

```ts
// packages/engine/src/routes/grammar/tour.ts
import { ARCH } from '../../constants.js'                      // BASE_SEASON = ARCH.edicion.baseSeason (§3.8); tour.ts NO importa edition.ts ni calendar.ts

export type StageRole =
  | 'llana' | 'llana_viento' | 'media' | 'media_alto' | 'media_muro'
  | 'reina_alto' | 'reina_valle' | 'reina_encadenada' | 'montana_corta'
  | 'cri' | 'prologo' | 'cronoescalada'

export type TourSkeletonId = 'vu_corta' | 'vu_semana' | 'vu_larga' | 'vu_gran_vuelta'

export interface BlockRule {
  id: 'reinaTarde' | 'bloqueMontana' | 'llanasEntreBloques' | 'maxCronos' | 'maxFinalesAlto' | 'descansos'
  aplica: (n: number) => boolean
  repara: (roles: StageRole[], zonas: GeoZone[]) => StageRole[]   // pura; devuelve copia; de atrás hacia delante
}
export type Weighted<T extends string> = Partial<Record<T, number>>

export interface TourSkeleton {
  id: TourSkeletonId
  n: [number, number]
  bloques: BlockRule[]
  primera: Weighted<StageRole>                 // `primera.prologo` es la p del prólogo (0,25; D3)
  ultima: Weighted<StageRole> | 'ROUTE.lastDecisiveChance'
  pesos: Record<Relieve, Weighted<StageRole>>  // ARCH.pesosComposicion
}
export const TOUR_SKELETONS: Record<TourSkeletonId, TourSkeleton>
/** Elige el esqueleto de composición por `n` y clase, sin dado (sección 7, §7.2). */
export function tourSkeletonDe(n: number, raceClass: RaceClass): TourSkeleton
/** Las cuatro garantías de `mixRoles` (`calendar.ts` l. 486-517, cuerpo sin tocar) como función pura; solo endurece y solo por la cola. */
export function garantias(roles: StageRole[], terrain: RouteTerrain, n: number): StageRole[]

export interface Itinerario {
  metas: GeoZone[]                             // zona de la meta de cada etapa
  papeles: StageRole[]
  km: number[]                                 // ya con ARCH.km.porClase, maxPorClase y ROUTE.lastStageKmFactor
  desde: GeoZone[]                             // desde[0] = metas[0]; desde[i] = metas[i-1]; desde[i] !== metas[i] es transición
  notas: string[]                              // reparaciones anotadas («e5: reina → media_alto, ventana sin cordillera»), decisión 18
}
export function itinerarioDe(raceId: string, country: string | null, n: number, terrain: RouteTerrain,
  raceClass: RaceClass, format: RaceFormat): Itinerario           // subflujo `arch|raceId`, sin season

/** Lo que `stageMix` y `composeTour` saben de la carrera; `StageRequest` lo extiende por etapa. */
export interface RouteContext {
  raceId?: string                              // si falta, `stageMix` usa `seedBase` como raceId
  country: string | null                       // ISO alpha-2; null → FALLBACK (zona `generico`)
  raceClass: RaceClass
  format: RaceFormat
  season: number
}
export const DEFAULT_ROUTE_CONTEXT: RouteContext = {
  country: null, raceClass: '2', format: 'una-semana', season: ARCH.edicion.baseSeason,
}

/** Lo que hoy hace `stageMix` por dentro. `raceId` es la clave de `arch|raceId`, de `itinerarioDe` y de `RACE_REGION`. */
export function composeTour(raceId: string, n: number, terrain: RouteTerrain, ctx: RouteContext): StageSpec[]
export function kmDe(role: StageRole | 'un_dia' | 'un_dia_u23', raceClass: RaceClass, last: boolean,
  rand: () => number): number
```

`StageRole` amplía el `MixRole` de hoy (`calendar.ts` l. 410-561 vía mapa 02 §4: `cri`, `reina`, `media-alto`, `media`, `llana`) con los papeles que la carretera tiene y el generador no (`llana_viento`, `media_muro`, `reina_valle`, `reina_encadenada`, `montana_corta`, `prologo`, `cronoescalada`). El papel de cada etapa es IDENTIDAD (decisión 20): lo decide `itinerarioDe` en el subflujo `arch|raceId` sin `season`, y la edición no lo mueve.

El juez del motor objetó que `Weighted<StageRole>` y `BlockRule` estaban sin definir en la ganadora; aquí lo están. `Weighted<T>` es un mapa parcial de pesos relativos (no tienen que sumar 1: se normalizan al sortear, y una clave ausente pesa 0). `BlockRule` es una reparación determinista con `id` cerrado a los seis nombres que `tour.test.ts` comprueba uno a uno (sección 7, §7.2): `aplica(n)` dice si la regla se evalúa para una vuelta de `n` etapas, y `repara` recibe los papeles ya sorteados y las zonas de meta del itinerario y devuelve los papeles corregidos, recorriendo de atrás hacia delante para que la última etapa (la que `ROUTE.lastDecisiveChance` decide) no se toque. `ultima` admite el literal `'ROUTE.lastDecisiveChance'` como centinela: significa que la última etapa se sortea con la regla que `mixRoles` ya tiene hoy (`calendar.ts` l. 457-519, garantía de última decisiva), en vez de con pesos propios; es lo que conserva `calendar.test.ts` l. 184-246 sin tocar (salvo l. 211-221, que pasa a admitir prólogo: sección 7). `pesos` está indexado por `Relieve` y no por el `MixTerrain` de hoy (`flat | hilly | mountain`, l. 410), que desaparece como modelo de composición: `ARCH.pesosComposicion` sustituye a `ROUTE.mixWeights`. `TOUR_SKELETONS` es el catálogo de cuatro entradas (datos en `tour.ts`, reexportados desde `constants.ts` por referencia, §B.3) y `tourSkeletonDe` lo consulta sin dado.

`Itinerario` lleva cinco listas, cuatro paralelas de longitud `n` (la zona de meta de cada etapa, su papel, sus km ya por clase con `kmDe`, y la zona de salida `desde`, que difiere de `metas[i]` en las etapas de transición y es la que `StageRequest.desde` recibe) y `notas`, con una frase por reparación aplicada (la degradación de la reina que la decisión 18 exige anotar, y cada `BlockRule` que cambió un papel): es lo que la galería (sección 16) y `tour.test.ts` leen para explicar por qué una vuelta belga cierra con `media_alto`.

`kmDe` admite tres papeles fuera de `StageRole`: `'un_dia'` (la fila de un día; en `NC` lee `ARCH.km.porClase.NC.ruta`) y `'un_dia_u23'` (solo `NC`, lee `.NC.sub23`; lo elige `nationalChampionships` por `championshipCategory`, `calendar.ts` l. 70), porque la tabla de la sección 12 tiene `NC` como `{ ruta, sub23 }` y sin el segundo papel la fila `sub23` no tendría quien la leyera. Secciones 7 y 12 usan esta misma firma.

`RouteContext` vive aquí y no en `generate.ts` porque es `composeTour` quien lo consume y `generateStage` no lo ve (recibe un `StageRequest` completo). Es el subconjunto de `StageRequest` que se conoce a nivel de carrera, sin `routeSource`: `composeTour` fija `routeSource: 'generado'` él mismo en cada petición, y la rama de edición de `buildRace` no pasa por `composeTour`. `country: null` (y no `''`) es el valor de un banco sin país y cae a `FALLBACK` por `zonaDe`. `raceId?` existe para que `buildRace` pase el contexto entero y para que `stageMix` pueda seguir con tres argumentos. `composeTour(raceId, n, terrain, ctx)` es lo que `stageMix` hace hoy por dentro, y `raceId` es a la vez identidad (`arch|${raceId}`) y clave de `itinerarioDe` y de `RACE_REGION`: hoy `stageMix(row.stages, row.terrain ?? 'flat', row.id)` (`calendar.ts` l. 923) pasa el id de la fila como `seedBase`, y `calendar.test.ts` l. 175 pasa `mix-test-${i}`, que no está en `RACE_REGION` ni en ningún territorio y por eso cae a `generico`. `stageMix(n, terrain, seedBase, ctx = DEFAULT_ROUTE_CONTEXT)` conserva su firma pública (`calendar.ts` l. 546) y delega con `composeTour(ctx.raceId ?? seedBase, n, terrain, ctx)` (decisión 19), para que `calendar.test.ts` l. 184-277 y `stageKind.test.ts` compilen en todos los pasos del plan. `buildRace` (l. 926-929) NO usa el valor por defecto: llama a `composeTour(row.id, row.stages, row.terrain ?? 'flat', { raceId: row.id, country, raceClass: row.raceClass, format: 'una-semana', season })` con el `country` que hoy calcula en l. 889 y no pasa a nadie (sección 7, §7.5). `DEFAULT_ROUTE_CONTEXT` queda para los tests, y `calendario.test.ts` sella que ninguna etapa de `calendarForSeason(0)` con `raceClass !== 'NC'` tiene `arch.geo === 'generico'`: es la prueba de que el generador no vuelve a quedar ciego a la geografía por la puerta de atrás. Las secciones 7 y 15 (paso 1) usan exactamente esta forma y este valor por defecto.

### 3.7 Petición y salida de `generateStage` (`routes/grammar/generate.ts`)

```ts
// packages/engine/src/routes/grammar/generate.ts
import type { StageKind } from '../testTour.js'
import type { StageProfile } from '../../stage/types.js'

export type RouteSource = 'real' | 'edicion' | 'generado'        // por ETAPA
export type RaceRouteSource = 'real' | 'mixto' | 'generado'      // por CARRERA: agregado de sus etapas (§3.11)
/** `real` si todas las etapas son `real`; `generado` si todas son `generado`; `mixto` en cualquier otro caso (una carrera toda `edicion` es `mixto`). */
export function raceRouteSourceOf(stages: readonly { routeSource: RouteSource }[]): RaceRouteSource

export interface StageRequest {
  raceId: string
  stageIndex: number                           // con base 1; 1 en un día
  season: number                               // BASE_SEASON = 0 es la canónica y tira sus propios dados
  km: number                                   // contrato al 0,1 si `routeSource` es `edicion` (ver abajo)
  role: StageRole | 'un_dia'
  terrain: RouteTerrain                        // sesgo, nunca orden
  geo: GeoSignature                            // un día y edición: ZONAS[regionOf(...)]; vuelta compuesta: ZONAS[itinerario.metas[i-1]]
  desde?: GeoZone                              // etapa de transición (40 % con la ondulación de `desde`)
  raceClass: RaceClass
  format: RaceFormat
  routeSource: 'edicion' | 'generado'
  editionKey?: string                          // `${from}|${to}|${km}` de editions.ts, para la semilla de edición
  fixed?: { skeleton?: SkeletonId; finalKind?: FinalKind; dPlus?: number }   // bancos
}

export interface GeneratedStage {
  profile: StageProfile
  kind: StageKind                              // = stageKindOf(profile, timeTrial).kind, garantizado por V6
  label: string                                // = skeletonFor(sk.id, req.geo).label, puesta tras V6 (decisión 38 reescrita; §3.3)
  timeTrial: boolean                           // = sk.timeTrial ?? false
  arch: {
    skeleton: SkeletonId
    geo: GeoZone
    motivos: Motif[]
    finalKind: FinalKind | null
    dPlus: number                              // dPlusDe(profile), relleno incluido
    intentos: number
    degradado: boolean
    rechazos: Veto[]                           // uno por intento fallido, en orden; [] si el primero pasó (galería, sección 16)
    frase: string                              // «Circuito de 14 km × 9 vueltas con un muro de 1,1 km al 11 %; meta a 2 km del muro»
    metadatos: { viento: 0|1|2|3; altitud: GeoSignature['altitud'] }   // ficha, no física
  }
  routeSource: 'edicion' | 'generado'
}

export function generateStage(req: StageRequest): GeneratedStage
```

`StageRequest` es todo lo que el generador sabe de la etapa, y es la lista de lo que hoy no le llega: el generador actual recibe `km` y `seed` (`flatSegments(km, seed)` y hermanos, `profileGen.ts` l. 236-514) y ni siquiera el país que `buildRace` calcula en l. 889 (mapa 02 §1, diagnóstico de la sección 1). Por qué cada campo:

- `km` es un CONTRATO cuando `routeSource` es `edicion`. El contrato de hoy está en `calendar.test.ts` l. 140-152 («las carreras con recorrido REAL no pasan por la mezcla: sus km son los de la edición»): `expect(Math.round(km)).toBe(edition.stages[i]!.km)`, es decir, al KILÓMETRO ENTERO redondeado (el `km` de `editions.ts` l. 15 es entero). El diseño lo endurece a 0,1 como decisión propia, no como cita: `normalizeEnlaces` cuadra Σ km al 0,1 (V10), así que una etapa `edicion` sale con Σ km igual al `km` de la fila con esa resolución, y `calendario.test.ts` lo afirma («Σ km de una etapa `edicion` = `editions.ts` al 0,1»), lo que deja el test viejo verde por inclusión. Por eso `ARCH.edicion.kmJitter` no se aplica a esas etapas (decisión 20). El esqueleto §B.2 y §1.1.2 citan «`calendar.test.ts` l. 162-174» y «al 0,1» como si fuera el contrato de hoy: l. 162-174 son el `it('cubre los tres niveles…')` y la cabecera del `describe` de `stageMix`; la pasada de coherencia cambia las dos citas por l. 140-152 y `Math.round`.
- `terrain` es el `RouteTerrain` de la fila (`featureProfile.ts` l. 21: `flat | hilly | mountain | cobbles | classic | itt`) y entra como sesgo de pesos, nunca como orden: un `terrain: 'mountain'` en `flandes` no produce una reina, produce `media_alto` anotado.
- `geo` es la firma ya resuelta y no la clave, para que `generateStage` sea pura y un banco pueda pasarle una firma sintética. Quién la resuelve depende de la rama de `buildRace` (§3.5): un día y edición, `ZONAS[regionOf(raceId, stageIndex, country)]`; vuelta compuesta, `ZONAS[it.metas[i - 1]]` con `desde = it.desde[i - 1]` cuando difiere de la meta, construidas por `composeTour`.
- `desde` solo va en etapas de transición de una vuelta (sección 7) y da la ondulación del primer 40 % (`ARCH.itinerario.transicion`).
- `editionKey` es la respuesta al defecto del mapa 02 §7: hoy dos carreras con la misma salida, meta y km dibujan lo mismo porque la semilla de edición es `${from}|${to}|${km}` sin `raceId`. La semilla nueva es `raceId|e{i}|{editionKey}` (decisión 22), separada de la de identidad.
- `fixed` es para los bancos (sección 13): `fixed.skeleton` fuerza el esqueleto (galería y `stageKind.test.ts` por esqueleto), `fixed.finalKind` y `fixed.dPlus` acotan lo que `calendarQueens` estratifica. En el calendario nunca va.

`GeneratedStage.kind` no es un campo que el generador rellene a su criterio: es el resultado de `stageKindOf(profile, timeTrial)` (`stageKind.ts` l. 71, con la etiqueta `Summit finish` decidida por `SUMMIT_RUN_IN_KM` 5, decisión 23) y V6 lo garantiza. `label` es `Skeleton.label` puesta después de V6 (§3.3), y `timeTrial` sale del esqueleto y nunca del perfil. `arch` es lo que la ficha enseña y el banco mide, y `frase` es la única descripción textual (decisión 39, D10). `rechazos` es la lista de `Veto` que `verify` devolvió en los intentos fallidos (sección 8, `salida(...)` la rellena): cuesta cero porque `verify` ya lo produce, y es lo que la galería enseña en «Intentos y rechazos» (sección 16, §16.4). `metadatos` lleva `viento` y `altitud` de la firma para el texto de la ficha, que dice llano abierto y nunca promete abanicos (decisión 17).

### 3.8 Temporada e identidad (`routes/grammar/edition.ts` y `routes/calendar.ts`)

```ts
// packages/engine/src/constants.ts (bloque ARCH, sección 12)
//   ARCH.edicion.baseSeason = 0            // calendarRun.ts l. 135: season = floor(gameDay / SEASON_DAYS); el primer día de un mundo es la temporada 0

// packages/engine/src/routes/grammar/edition.ts   (NO importa calendar.ts)
export const BASE_SEASON = ARCH.edicion.baseSeason   // 0; reexportado aquí porque es el nombre que el resto del documento usa
export interface EditionPlan {
  km: number                                   // ya con jitter y acotado; = req.km si routeSource === 'edicion'
  n: Record<number, number>                    // cardinalidad por índice de hueco no firma
  vueltas?: number                             // circuito de firma, tras vueltasJitter
  opcion: number                               // 0 = canonico; índice en [canonico, ...alternativas]
}
export function editionOf(sk: Skeleton, firma: readonly Motif[], req: StageRequest): EditionPlan   // sección 10
export function diffMotivos(prev: readonly Motif[], actual: readonly Motif[]): string[]             // sección 10, §10.8
// Subflujos (lista CERRADA; `i` es stageIndex con base 1, 1 en un día):
//   `arch|raceId`                       composición de la vuelta (itinerarioDe), una corriente por carrera
//   `firma|raceId`                      km de una carrera de un día (kmDe en buildRace, decisión 36)
//   `arch|raceId|i`, `firma|raceId|i`   identidad de la etapa i: esqueleto y motivos firma (sin season)
//   `arch|raceId|e{i}|{editionKey}`, `firma|raceId|e{i}|{editionKey}`   lo mismo para una etapa de edición real
//   `ed|raceId|season`                  plan de edición, consumido en orden de i; en edición real `ed|raceId|e{i}|{editionKey}|0`
//   `mot|raceId|i|season|slot|j|i{intento}`, `pos|raceId|i|season|i{intento}`,
//   `dib|raceId|i|season|{slot|e{k}}[|hijo{h}]|i{intento}`   (e{k}: k-ésimo enlace; hijo{h}: hijo de cadena/racimo/circuito)
//   En una etapa de edición real, `raceId|e{i}|{editionKey}` sustituye a `raceId|i` en mot, pos y dib.

// packages/engine/src/routes/calendar.ts   (importa todos los grammar/*.ts; nadie de grammar/ lo importa a él)
export function calendarForSeason(season: number): CalendarRace[]   // memoizada: Map<number, CalendarRace[]> con tope MAX_TEMPORADAS_EN_MEMORIA
export function raceForSeason(raceId: string, season: number): CalendarRace   // índice por temporada; lanza Error('carrera desconocida') si no existe
export function stagesForSeason(raceId: string, season: number): CalendarStage[]   // = raceForSeason(raceId, season).stages
export const MAX_TEMPORADAS_EN_MEMORIA = 8   // literal, no ARCH: límite de proceso (sección 14); se expulsa la más antigua
export const SEASON_CALENDAR: CalendarRace[] = calendarForSeason(BASE_SEASON)   // el MISMO array memoizado de la temporada 0, no una copia
```

`BASE_SEASON` vale 0 porque es lo que el mundo calcula: `calendarRun.ts` l. 135 hace `season = Math.floor(gameDay / SEASON_DAYS)`, y el primer día de un mundo es la temporada 0. La propuesta de banco proponía `calendarFor(1)` y la de geografía dejaba la pregunta abierta; la síntesis cierra que `SEASON_CALENDAR = calendarForSeason(BASE_SEASON)` y que la temporada 0 tira sus propios dados con `ed|raceId|0` como cualquier otra (decisión 21), corrigiendo la objeción del juez de ejecutabilidad a la mediana de cardinalidades.

Dónde vive cada cosa, y por qué no donde §B.1 lo ponía. §B.1 sitúa `calendarForSeason`, `raceForSeason` y `stagesForSeason` en `edition.ts` y `BASE_SEASON` allí también, con `calendar.ts` haciendo `SEASON_CALENDAR = calendarForSeason(BASE_SEASON)` y `generate.ts` importando `BASE_SEASON` de `edition.ts`. Eso dibuja un ciclo con evaluación en la carga: `calendar.ts` importa `edition.ts`; `edition.ts` necesita las tablas y `buildRace` de `calendar.ts` para construir un `CalendarRace[]`; y `SEASON_CALENDAR` se evalúa al cargar el módulo (`calendar.ts` l. 3643). Si un test importa primero `grammar/edition.ts` (`edition.test.ts` lo hará), ESM evalúa `calendar.ts` antes de terminar `edition.ts`, la llamada de nivel superior `calendarForSeason(BASE_SEASON)` toca el `Map` memo y `BASE_SEASON` de `edition.ts` en zona muerta temporal, y el proceso arranca con `ReferenceError`. La dirección se fija así: el valor 0 es una constante de intención (`ARCH.edicion.baseSeason`) en `constants.ts`, que no importa nada (comprobado: `constants.ts` no tiene una sola línea `import`), y `edition.ts` y `tour.ts` lo leen de ahí; las tres funciones de temporada, su memo y `SEASON_CALENDAR` viven en `calendar.ts`, que es quien tiene las tablas y `buildRace(row, season)`; `edition.ts` se queda con lo que es suyo, el plan de edición (`editionOf`, `EditionPlan`, `diffMotivos`) y la lista de subflujos, y no importa `calendar.ts`. `routes/arranque.test.ts` lo sella de dos formas: un `grep` de que ningún fichero de `routes/grammar/` importa `../calendar.js`, y una importación dinámica de cada `grammar/*.ts` en primer lugar (con `vi.resetModules()` entre una y otra) que no lanza. Las secciones 10 y 14 (que sitúan las tres funciones y `MAX_TEMPORADAS_EN_MEMORIA` en `edition.ts`) y §B.1 se corrigen a esta ubicación; sus tests importan de `../calendar.js`.

Los subflujos son una lista cerrada porque el principio 7 (puro y determinista con subflujos nominales) solo se cumple si añadir una tirada en un sitio no desplaza las demás: es el defecto de `profileGen.ts` l. 316-317 que el diagnóstico mide. Los dos subflujos sin `season` (`arch`, `firma`) son la identidad; los cuatro con `season` (`ed`, `mot`, `pos`, `dib`) son la edición; el sufijo `i{intento}` solo existe en `mot`, `pos` y `dib` (sección 8). La clave de etapa (`|i`) separa la composición de la vuelta (`arch|raceId`, que consume `itinerarioDe` de una vez) de la elección de esqueleto de cada etapa (`arch|raceId|i`): sin ella, una tirada más en la composición movería el esqueleto de todas las etapas. Un día usa `i = 1` (y no `arch|raceId` a secas, como escribe la sección 5, §5.7: la pasada de coherencia la alinea con esta lista, igual que la 8 y la 10). Las tres funciones de temporada se memoizan (sección 14) y son la ÚNICA puerta por la que `calendarRun.ts`, `callups.ts` y `raceContext.ts` leen una etapa no congelada (decisión 23); `stagesForSeason(id, 0)` devuelve por referencia las etapas del propio `SEASON_CALENDAR` (sección 10 lo exige con `toBe`).

### 3.9 Vetos y la geometría que leen (`veto.ts`, `geometry.ts`, `place.ts`, `render.ts`, `stageKind.ts`)

```ts
// packages/engine/src/routes/grammar/veto.ts
export type VetoId = 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6' | 'V7' | 'V8' | 'V9' | 'V10'
  | 'V11' | 'V12' | 'V13' | 'V14' | 'V15' | 'V16'
export interface Veto { id: VetoId; detalle: string }
/** MetaKind → FinalKind que V7 exige cuando `sk.finalKind` no está declarado: repecho, muro_meta, alto_corto, alto_largo → 'alto';
 *  cima_cerca → 'cima_cerca'; descenso_meta → 'valle_corto'; valle → 'valle_largo'; esprint, sector_meta → null (sin comprobación). */
export function finalKindDe(meta: MetaKind): FinalKind | null
export function verify(profile: StageProfile, sk: Skeleton, req: StageRequest, motivos: Motif[]): Veto | null
// Solo lee routes/ (stageKindOf, finalKindOf, climbSize, dPlusDe) y geometría del esqueleto. NUNCA sampleProfile,
// finishType ni costBase (regla del juez del motor, riesgo 3): eso se mide en routeCensus.

// packages/engine/src/routes/grammar/geometry.ts   (geometría de routes/: tramos, nunca bloques)
export function dPlusDe(profile: StageProfile): number                       // Σ g·km·10 de los tramos con g > 0 (decisión 9)
export function kmSubidaShare(profile: StageProfile): number                 // km de segmentos `puerto` / km total
export function climbKmOutsideLast30(profile: StageProfile, kmToGo = ARCH.reina.subidaLejanaKm): number   // sección 9
export function subidaLejanaShare(profile: StageProfile): number             // climbKmOutsideLast30 / Σ climbSize(puerto).km; 0 sin puertos
export function profileCorrelation(a: StageProfile, b: StageProfile): number // Pearson sobre g por km, eje normalizado desde meta (V12)
export function describeProfile(profile: StageProfile): Motif[]              // puertos con km, g y posición → `puerto`/`cota`, el resto `enlace` (sección 13, §13.5)

// packages/engine/src/routes/grammar/place.ts
export interface Placed { motif: Motif; slot: number | 'meta'; inicioKm: number; finKm: number; bajada?: Motif }
export function colocar(motivos: Motif[], km: number, sk: Skeleton, req: StageRequest, rand: () => number): Placed[] | null

// packages/engine/src/routes/grammar/render.ts
export function renderSkeleton(colocados: Placed[], km: number, geo: GeoSignature, rng: RngFactory, desde?: GeoSignature): Segment[]
export function normalizeEnlaces(segs: Segment[], km: number, colocados: Placed[]): Segment[] | null
export function garantizaClase(segs: Segment[], sk: Skeleton, colocados: Placed[]): Segment[] | null
export function emitirPancartas(segs: Segment[], colocados: Placed[]): Banner[]

// packages/engine/src/routes/stageKind.ts   (paso 3 y paso 5: se añade `export`, no cambia ningún cuerpo)
export const WALL_MAX_KM = 3; export const PASS_MIN_KM = 8.5; export const QUEEN_MIN_CLIMB_METRES = 3200   // hoy const sin export, l. 60-64
export const SUMMIT_RUN_IN_KM = 5                                            // nueva (decisión 23)
export function climbMetres(segment: Segment): number                        // l. 27-33
export function climbSize(segment: Segment): { km: number; g: number }       // l. 36-42
```

`verify` devuelve el primer veto que falla, con `detalle` para el test y la galería, o `null`. La firma recibe las cuatro cosas que un veto puede necesitar (el perfil rendido, el esqueleto elegido, la petición y los motivos instanciados) y nada del motor: la regla de vetos puros (decisión 4) es que `verify` importe solo de `routes/` y de `grammar/geometry.ts`, y el test `veto.test.ts` lo comprueba con un `grep` de imports. La consecuencia es la que el juez del motor pidió: recalibrar `STAGE.finish*` o `physics.ts` no redibuja ningún perfil. De los dieciséis, V1 a V10 y V15 se evalúan por etapa y disparan reintento; V11 a V14 y V16 son de calendario o de vuelta y se miden en `routeCensus` y `tour.test.ts` (tabla completa en la sección 9). V7 se evalúa contra `sk.finalKind` si está declarado y contra `finalKindDe(sk.meta)` si no (§3.3); `finalKindDe` vive en `veto.ts` porque es una regla de veto, no del catálogo.

El resto del bloque son los nombres que las secciones 8, 9 y 13 introducen y que §B.1 no listaba: `geometry.ts` gana `climbKmOutsideLast30` y `subidaLejanaShare` (V8b, sección 9) y las tres funciones que §B.1 nombraba sin firma; `renderSkeleton` recibe la fábrica `rng` de §3.2 (construida sobre `dib|…`) y la firma de `desde` para el 40 % de transición; `stageKind.ts` exporta sus tres umbrales y `climbSize`/`climbMetres` (que `verify`, `routeCensus` y el test de coherencia de `ARCH` en `motifs.test.ts` necesitan), sin tocar un cuerpo (decisión 26). Las secciones 8 y 9 copian estas firmas tal cual.

### 3.10 El censo (`sim/routeCensus.ts`) y los bancos que lo rodean

```ts
// packages/engine/src/sim/routeCensus.ts
export interface RouteStats {
  raceId: string; stageIndex: number; raceClass: RaceClass; format: RaceFormat; country: string | null   // CalendarRace.country es opcional (calendar.ts l. 898)
  zona: GeoZone | null; skeleton: SkeletonId | null; routeSource: RouteSource
  kind: StageKind; label: string; finalKind: FinalKind | null
  finishType: FinishType                       // finishType(deriveFinishTerrain(sampleProfile(profile)), 50): aquí sí
  km: number; dPlus: number; dPlusBloques: number   // dPlusDe y calendarQueens::desnivelDe, para ver el delta
  nPuertos: number; nMuros: number; longestClimbKm: number
  lastClimbKm: number | null; lastClimbG: number | null; kmAfterLastClimb: number | null
  climbKmOutsideLast30: number; kmSubidaShare: number; breakAppealEstimado: number
  pavesKm: number; nSectores: number; estrellas5: number
  maxG: number; huella: number[]               // g por km
  intentos: number; degradado: boolean
  garantiasClase: number                       // 0 a 4: cuántas reglas de `garantizaClase` tocaron la etapa (sección 8, §8.8); 0 en las `real`
}
type NumericKey = { [K in keyof RouteStats]: RouteStats[K] extends number ? K : never }[keyof RouteStats]
type CatKey = 'kind' | 'finalKind' | 'finishType' | 'skeleton' | 'zona' | 'routeSource'

export interface Cuantiles { n: number; min: number; p10: number; p50: number; p90: number; max: number; media: number }
export interface Summary {
  n: number
  num: Partial<Record<NumericKey, Cuantiles>>                   // solo las columnas numéricas (el tipo lo impide en el resto)
  cat: Partial<Record<CatKey, Record<string, number>>>         // fracción [0; 1] por valor
}
export function routeCensus(calendar: CalendarRace[] = SEASON_CALENDAR): RouteStats[]
export function aggregate(rows: RouteStats[], by: (r: RouteStats) => string): Record<string, Summary>
export function entropiaBits(reparto: Record<string, number>): number      // Shannon en bits sobre fracciones
export function correlacion(a: number[], b: number[]): number              // Pearson sobre `huella`, remuestreada a la más corta

export interface CensusTarget {
  id: string
  label: string
  poblacion: (r: RouteStats) => boolean       // subconjunto sobre el que se mide
  medida: (rows: RouteStats[]) => number
  min?: number; max?: number
  hoy: number | null                          // columna «hoy (medido)» del paso 0; null si la población no existía
  fuente: string                              // mapa, propuesta o juicio de donde sale la banda
  estado: 'sellada' | 'informativa'           // informativa = se imprime, no afirma
  nMin: number                                // población mínima para afirmar; por debajo se imprime «n insuficiente»
}
export const ROUTE_CENSUS_TARGETS: readonly CensusTarget[]   // la sección 13 rellena los valores
export const CENSUS_N_MIN = 10

// packages/engine/src/sim/frozenSkeletons.ts   (decisión 33; sección 13, §13.5)
export interface FrozenQueen {
  raceId: string; stageIndex: number          // la entrada de REAL_QUEENS a la que sustituye
  skeleton: Skeleton                          // literal: `id` de los 31, `canonico` propio, sin `alternativas`
  motivos: Motif[]                            // la instancia fija (posiciones incluidas: colocación ya hecha)
  km: number; geo: GeoZone; seedDibujo: string   // `frozen|race-colombia|5`: solo alimenta `dib`
  huellaFNV: number                           // del perfil rendido; se re-sella con causa si `renderSkeleton` cambia
  why: string
}
export const FROZEN_QUEENS: readonly FrozenQueen[]   // exactamente 3
export function frozenProfile(q: FrozenQueen): StageProfile
export const GENERATED_QUEENS: readonly { raceId: string; stageIndex: number; skeleton: SkeletonId; finalKind: FinalKind }[]   // 3, sin banda

// packages/engine/src/sim/saturation.ts     export function hardestOneDay(calendar: CalendarRace[] = SEASON_CALENDAR, n = 8): CalendarRace[]
// packages/engine/src/sim/preRegistro.ts    export const PRE_REGISTRO: readonly { banda: string; direccion: 'sube' | 'baja' | 'igual' | 'igual_ruido'; porQue: string }[]
// packages/engine/src/sim/pareado.ts        script `pnpm sim:pareado [semillas=12]`: cada banco dos veces (viejo y nuevo), tabla banda | viejo | nuevo | Δ mediana | previsto | cumple
// packages/engine/src/sim/legacy/profileGenLegacy.ts y sim/legacy/calendarLegacy.ts   el generador y el calendario viejos, SOLO durante el paso 9 (decisión 29)
```

`RouteStats` es una fila por etapa del calendario que el juego corre (1.418 hoy), y es el único sitio del diseño donde se llama a `sampleProfile`, `deriveFinishTerrain` y `finishType` (con `groupSize` 50, `finish.ts` l. 142): por eso `zona` y `skeleton` admiten `null` (las 177 etapas `real` no tienen esqueleto) y por eso lleva `dPlus` y `dPlusBloques` a la vez, para imprimir el delta entre la integración por tramos de `dPlusDe` y la de bloques de `calendarQueens::desnivelDe` (esperado < 5 %, decisión 9). `country` admite `null` porque `CalendarRace.country?` es opcional (`calendar.ts` l. 898 solo lo copia si existe) y el censo no inventa un país. `huella` es la pendiente media por km y alimenta la correlación de V12. `garantiasClase` cuenta cuántas de las reglas 1 a 4 de `garantizaClase` tocaron la etapa (sección 8, §8.8, que la llamaba `garantias`: el nombre cambia para no chocar con `garantias(roles, terrain, n)` de `tour.ts`), y la banda de la sección 13 es «etapas con `garantiasClase > 0` < 2 %», porque una red que trabaja mucho es un rango mal puesto.

`Summary` es lo que `aggregate` devuelve por grupo (`by` suele ser `r => r.skeleton ?? 'real'` o `r => r.raceClass`), con la forma que la sección 13 (dueña del censo) escribe: `num` para los cuantiles de las columnas numéricas y `cat` para el reparto de las categóricas; `NumericKey` existe para que el tipo no admita cuantiles de `huella` ni de `kind`. Cada banda de `ROUTE_CENSUS_TARGETS` es un `CensusTarget` con población, medida, banda, la columna «hoy (medido)» del paso 0 y su dirección pre-registrada (decisión 30, `PRE_REGISTRO`); la sección 13 rellena los valores y ninguna nace en rojo. Coste medido: 0,57 s sobre las 1.418 etapas (juez del motor §1). Dónde corre: las bandas se afirman en `routes/grammar/calendario.test.ts` (bajo `routes/`, así que entra en `test:rapido`), y `sim/routeCensus.test.ts` prueba el censo sobre perfiles literales con `test:bancos`, porque `test:rapido` excluye `packages/engine/src/sim/**` (`package.json` l. 20; secciones 13 y 15); es lo que la decisión 31 quiere decir con «`routeCensus` en `test:rapido`».

### 3.11 Lo que ganan `StageSpec`, `CalendarStage`, `CalendarRace` y `race_routes`

```ts
// packages/engine/src/routes/calendar.ts (hoy l. 33-46); los dos campos nuevos entran en el PASO 8
export interface StageSpec {
  kind: StageKind
  label: string
  profile: StageProfile
  timeTrial?: boolean
  routeSource: RouteSource                     // NUEVO: 'real' | 'edicion' | 'generado'; obligatorio
  arch?: GeneratedStage['arch']                // NUEVO: solo cuando routeSource !== 'real'
}
export interface CalendarStage extends StageSpec { index: number; name: string }   // sin cambios

export interface CalendarRace {
  // ...los campos de hoy (l. 48-79) sin cambios: id, name, level, raceClass, format, startDay, openTo,
  // region?, championshipCountry?, championshipCategory?, country?, stages, restAfter?
  routeSource: RaceRouteSource                 // NUEVO: raceRouteSourceOf(stages), calculado en buildRace
}
```

```ts
// packages/db/src/raceRoutes.ts (hoy l. 29: `'real' | 'generado'`)
export type RouteSource = 'real' | 'edicion' | 'generado'
export interface FrozenStage {
  stageDay: number; profile: StageProfile; kind: StageKind; label: string; timeTrial: boolean; routeSource: RouteSource
  arch: GeneratedStage['arch'] | null          // null en las `real` y en las filas anteriores a la migración
}
export async function freezeRaceRoute(db: Conn, worldId: string, raceKey: string, raceId: string, season: number): Promise<void>
// escribe, por etapa, desde stagesForSeason(raceId, season): profile, route_source, kind, label, time_trial, arch; idempotente (onConflictDoNothing, l. 54)
export async function raceStagesForWorld(db: Conn, worldId: string, raceKey: string, raceId: string, season: number): Promise<FrozenStage[]>
// filas congeladas ordenadas por stage_day; si no hay ninguna, stagesForSeason(raceId, season) proyectado a FrozenStage
export async function backfillRaceRoutes(db: Conn, worldId: string, raceKeys: readonly string[]): Promise<number>
// saca season de raceKey (`${id}:s${season}`, calendarRun.ts l. 783) y llama a freezeRaceRoute con ella

// packages/db/src/schema.ts, tabla raceRoutes (l. 512-524): columnas nuevas, todas nullable para las filas ya congeladas
//   kind: text('kind')   label: text('label')   timeTrial: boolean('time_trial')   arch: jsonb('arch').$type<GeneratedStage['arch']>()
// La migración la genera `pnpm --filter db db:generate` (drizzle-kit generate, packages/db/package.json l. 17) a partir de schema.ts:
//   packages/db/drizzle/0041_race_routes_kind.sql + drizzle/meta/0041_snapshot.json + la entrada en drizzle/meta/_journal.json
//   (0041 es el siguiente número libre en HEAD 02b032d, donde ya existe 0040_ordenes_del_paso_17a.sql; los mapas leyeron 8585ca2, donde la última era 0039).
//   Nunca un .sql escrito a mano: sin snapshot ni journal, `db:migrate` (drizzle-kit migrate, l. 18) no lo aplica.

// packages/shared/src/contracts.ts: el esquema zod de etapa (l. 379-382 `label`/`timeTrial`; l. 1042-1043 `stageKindSchema`; l. 1067-1068; l. 1362-1364)
//   gana `routeSource`, `edicion`, `arch: { frase, skeleton, geo } | null` y `cambiosRespectoAnterior` (StageCardRoute, sección 10, §10.8)
// apps/api/src/stageHistory.ts l. 27: `StageSpecHead` gana `routeSource: RouteSource`
// apps/api/src/routes/calendar.ts l. 91-105: expone StageCardRoute; la ficha lee `frozen.arch ?? stagesForSeason(raceId, season)[i - 1].arch`
```

`routeSource` por etapa toma tres valores porque hay tres ramas en `buildRace` (sección 11): rasgos reales en `STAGE_FEATURES` dan `real`; una etapa de `RACE_EDITIONS` sin rasgos (ciudades y km reales, relieve generado) da `edicion`; tabla y nacionales dan `generado`. Hoy `freezeRaceRoute` escribe `'generado'` a ciegas (`db/raceRoutes.ts` l. 47-50, con el comentario que lo reconoce) y el tipo de l. 29 es binario; pasa a copiar `stage.routeSource`. La columna `route_source` es `text` (`schema.ts` l. 523), así que el tercer valor no necesita migración; `kind`, `label`, `time_trial` y `arch` sí (columnas nuevas, en `schema.ts` y de ahí a `drizzle/` por `db:generate`: el esqueleto §B.1 escribía `packages/db/migrations/00NN_race_routes_kind.sql`, un directorio que no existe, y las secciones 10, 11 y 15 lo citan con «0039» como última; la pasada de coherencia pone la ruta y el procedimiento de arriba en las cuatro). `freezeRaceRoute` gana `season` porque el recorrido que se congela es el de `stagesForSeason(raceId, season)` y no el de `SEASON_CALENDAR` (decisión 23), con el `season` de la `raceKey` (`calendarRun.ts` l. 783: `${race.id}:s${season}`).

`arch` SÍ se congela, en la misma migración y en la misma fila, como `jsonb` nullable. El borrador de esta sección decía que no, apoyado en que `stagesForSeason(raceId, season)` es determinista y memoizada y podría recomponerlo; es determinista para un código dado, no entre versiones, y `race_routes` existe precisamente para eso (`schema.ts` l. 505-511: «cambiar el generador cambia las carreras FUTURAS»). El propio diseño prevé cambiar los datos que `stagesForSeason` lee: cada respuesta negativa del dueño a la galería se corrige editando `ZONAS`, `RACE_REGION` o `ARCH.pesoPorClase` (§2.10, sección 16), y cualquier `ENGINE_VERSION` posterior toca `ARCH` o el catálogo. Tras una de esas ediciones, una ficha que recompusiera `arch` enseñaría la frase de arquitectura y los `cambiosRespectoAnterior` de un recorrido distinto del `profile` congelado que el jugador corrió, y `race_routes.kind`/`label` congelados podrían contradecir `arch.skeleton`: la deriva retroactiva que la tabla impide, y la obligación 9 a medias. El coste es una columna y una línea en `freezeRaceRoute` (`arch: stage.arch ?? null`); `race_routes.profile` sigue siendo exactamente el `StageProfile` que el motor recibe (comentario de `schema.ts` l. 509), y `arch` viaja al lado sin partirse en tablas. La ficha lee `frozen.arch ?? stagesForSeason(raceId, season)[i - 1].arch`: la segunda rama solo para etapas aún no congeladas (una carrera futura que la web enseña antes de crearse). Las secciones 10 (`FrozenStage`, `raceStagesForWorld`) y 11 y el paso 10 del plan lo recogen así. Lo que la API y la web tipan con zod en `contracts.ts` y lo que `stageHistory.ts::StageSpecHead` compone son coste de implementación reconocido aquí y en el paso 10: sin tocarlos, `routeSource`, `arch.frase` y `edicion` no llegan a la pantalla.

`routeSource` y `arch` entran en `StageSpec` en el paso 8, cuando `buildRace` los pone en sus tres ramas, y hasta entonces no existen en el tipo: hacerlos obligatorios antes rompería la compilación de todo lo que construye un `StageSpec` a mano sin que el paso lo cableara. Lo que hay que retipar en el paso 8, medido con grep (`StageSpec` o `CalendarStage` construidos): los seis constructores de `calendar.ts` l. 108-172 (`flat`, `hilly`, `hillyUphill`, `mountain`, `mountainOneDay`, `itt`, `cobbles`, `classic`), `featureSpec` (l. 196), `base()` de los nacionales y `stagesFrom` (l. 174), que en ese paso se retiran o pasan a llamar a `generateStage`; las fixtures de `calendar.test.ts`; y `apps/api/src/stageHistory.test.ts::fichaDe` (l. 106-114), que devuelve `{ index, kind, label, name, profile }` tipado `CalendarStage` y gana `routeSource: 'generado'`. Ningún otro fichero del monorepo construye el tipo (`testTour.ts`, `autoOrders.ts`, `tactics.ts`, `cli.ts`, `learning.test.ts` e `invariants.test.ts` llevan un `kind` propio en tipos suyos, no un `StageSpec`). `routeSource` es obligatorio y no opcional para que el compilador sea el test: `calendario.test.ts` no necesita comprobar que ninguna etapa lo tiene indefinido. Si el paso 8 activa el modo perezoso de la sección 14 (`profile`, `arch` y `label` como propiedades de acceso), el tipo no cambia: un getter cumple la interfaz.

El agregado por carrera sigue la regla de I-40 traducida, con un solo enunciado que la prosa, `raceRouteSourceOf` y el test comparten: `real` si todas sus etapas son `real`; `generado` si todas son `generado`; `mixto` en cualquier otro caso, INCLUIDA la carrera cuyas etapas son todas `edicion` (ciudades y distancia reales, relieve generado, que no es ni `real` ni `generado`). No es un caso teórico: medido sobre `editions.ts` y `stageFeatures.ts` en HEAD, 39 de las 60 entradas de `RACE_EDITIONS` no tienen ninguna fila en `STAGE_FEATURES` (`race-portugal`, `race-alentejo`, `race-arabia`, `race-asturias`, `race-belgium`, `race-benelux`, `race-bretagne`, `race-britain`…), así que 39 carreras del calendario son `mixto` por esta vía; el borrador anterior las llamaba `mixto` en la prosa y `generado` en el test. `raceRouteSourceOf` se escribe sobre el conjunto de valores y no contando `real` (la versión de la sección 11, `reales === 0 → 'generado'`, devuelve `generado` a esas 39 y la pasada de coherencia la sustituye por esta; su recuento «`real` + `mixto` = 41» se remide con la regla nueva):

```ts
export function raceRouteSourceOf(stages: readonly { routeSource: RouteSource }[]): RaceRouteSource {
  const set = new Set(stages.map((s) => s.routeSource))
  if (set.size === 1 && set.has('real')) return 'real'
  if (set.size === 1 && set.has('generado')) return 'generado'
  return 'mixto'
}
```

Es un valor de carrera, nunca de etapa: por eso `RouteSource` de etapa no lo incluye, la marca de la interfaz sigue siendo por etapa (los tres textos de la decisión 39) y el texto de carrera `mixto` lo escribe la sección 11; `scripts/inventario-recorridos.mjs` y la sección 16 aplican `raceRouteSourceOf`. `RaceRow` (l. 381-398) no cambia: ni `geo` ni `paisaje` entran en la fila, porque la zona vive en `RACE_REGION` (§3.5) y el km de las 142 carreras de un día sin `km` explícito lo sortea `kmDe` con `firma|raceId` (decisión 36).

Un test corto fija las reglas de esta subsección en `routes/grammar/calendario.test.ts`:

```ts
it('routeSource de carrera es el agregado de sus etapas', () => {
  let todasEdicion = 0
  for (const race of calendarForSeason(BASE_SEASON)) {
    const set = new Set(race.stages.map((s) => s.routeSource))
    const esperado = set.size > 1 || set.has('edicion') ? 'mixto' : set.has('real') ? 'real' : 'generado'
    expect(race.routeSource).toBe(esperado)
    expect(race.routeSource).toBe(raceRouteSourceOf(race.stages))
    if (set.size === 1 && set.has('edicion')) todasEdicion += 1
    for (const s of race.stages) {
      if (s.routeSource === 'real') expect(s.arch).toBeUndefined()
      else expect(s.arch?.skeleton).toBeDefined()
    }
  }
  expect(todasEdicion).toBe(39)   // medido sobre editions.ts y stageFeatures.ts; solo un dato real nuevo puede moverlo
})
```

### 3.12 Nota al pie: cómo leer las propuestas con estos nombres

Quien venga de las cinco propuestas encontrará otros nombres para las mismas cosas. Esta es la tabla completa (§B.4 del esqueleto), y es el único sitio del documento donde aparece: el apéndice A (sección 19) es la tabla de los 45 injertos, no la de alias.

| Canónico | arquitectura | banco | geografia | ingeniero | datos |
| --- | --- | --- | --- | --- | --- |
| `Motif` / `MotifKind` | igual | `Motif` (unión discriminada) | `Motivo` | `Motif` (unión) | `MotifKind` |
| `Skeleton` / `SkeletonId` | igual | `RouteBrief` / `ArchetypeId` | `Esqueleto` / `Arquitectura` | `Skeleton` / `FamilyId` | `Archetype` / `ArchFamily` |
| `MetaKind` | igual | `FinalBrief` | (en `aMeta` de `Hueco`) | `contract.finish` | `finalMix` |
| `GeoZone` / `GeoSignature` | igual | `GeoKey` / `GeoSignature` | `Paisaje` / `PaisajeSpec` | `GeoKey` / `RouteGeo` | `RegionId` / `GeoSignature` |
| `Territorio` / `TERRITORIOS` | (no existe) | (no existe) | igual | (no existe) | (no existe) |
| `RACE_REGION` | `RaceRow.geo` + `RACE_PLACE` (sorteo: retirado) | `RACE_GEO` | `RaceRow.paisaje` | `RACE_GEO_OVERRIDE` | `RACE_REGION` |
| `zonaDe(country)` | `zonaDe` | `COUNTRY_GEO` | `territorioDe` | `GEO_BY_COUNTRY` | `COUNTRY_REGION` |
| `StageRole` | igual | `Papel` | `Papel` | `MixRole` | `MixRole` |
| `TourSkeleton` | igual | `TourCharacter` + `TourTemplate` | `Itinerario` | `mixRoles` + reglas | `TourTemplate` |
| `routeSource` (`real`/`edicion`/`generado`) | igual | `source` | `origen` | `origen` | `RouteMeta.source` (`mixto` = `edicion`) |
| `StageRequest` | igual | `RouteRequest` | `ContextoEtapa` | `RouteContext` + request | `GenInput` |
| `GeneratedStage.arch` | igual | `brief` | `paisaje` + `arquitectura` | `skeleton` | `RouteMeta` |
| `generateStage` | igual | `stageFor` | `trazarEtapa` | (builders + render) | `generateStage` |
| `renderSkeleton` | (paso 6) | `render` | `dibujar` | `renderSkeleton` | (draw.ts) |
| `normalizeEnlaces` + `garantizaClase` | `normalizeEnlaces` | `normalize` + guardas | `normalize` | `normalize` + `garantizaPuerto` | `garantizaClase` |
| `verify` / `V1..V16` | V1-V15 | `vetoesOf` / V1-V18 | `vetos` / V1-V14 | `verify` / V1-V10 | `vetos` / V1-V12 |
| `ARCH` | igual | `GEN` | `ROUTE.*` + `VETO` + `GEO` | `ROUTE.motif/families/edition/verify` | `ARCH` + `EDITION` + `GEO_SIGNATURES` |
| `BASE_SEASON` (0) | `season: 0` | `calendarFor(1)` (error) | `BASE_SEASON` (pregunta) | `season 0` | `season 0` |
| `calendarForSeason` | `raceForSeason`/`stagesForSeason` | `calendarFor` | `calendarForSeason` | `calendarForSeason` | `seasonCalendar` |
| `ARCH.edicion.nivel` | (jitter) | `editionOf` | `ROUTE.edicion.activa` | `ROUTE.edition.p*` | `EDITION.level` |
| `routeCensus` | `calendario.test.ts` | `routeCensus` | `calendarGeometry.test.ts` | `geometry.ts` | `routeFidelity.ts` |
| `frozenSkeletons` | «perfiles literales» | «cerrar por brief» | `frozenQueens` | `frozenSkeletons` | `frozenQueens` |
| `dPlusDe` | `desnivelDe` | `desnivelDe` | `climbMetres` | `desnivelDe` | `dPlus` |
| V8 (reina de verdad, dos cláusulas) | V8 | V6 + V8 | V2 | V2 + §9.2 | V2 |
| V5 (caso v40) | V5 | V1 | V1 | V1 | V1 |

Regla de numeración de vetos: los V del documento son los de arquitectura §9 con dos cambios: V7 se parte en V7 (`finalKindOf` por etapa, con reintento) y V16 (`finishType` medido en `routeCensus`, sin reintento); y V8 gana la cláusula (b) de banco (subida fuera de los últimos 30 km). La lista completa está en la sección 9 (decisión 24 de la síntesis). Dos matices que la tabla no puede decir: el `mixto` de datos era un valor de etapa y aquí es solo agregado de carrera (`RaceRouteSource`, §3.11), y `RouteContext` de ingeniero era la petición entera mientras aquí es el contexto de carrera que `composeTour` recibe (§3.6).
