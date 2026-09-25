## 3. El modelo de tipos

Esta sección escribe los tipos que el resto del documento usa por nombre. Van en el orden en que el generador los consume: primero lo que no cambia (el contrato del motor), después las piezas (motivos), los moldes (esqueletos), el sitio (zonas, territorios, regiones), la composición de una vuelta, la petición y la salida de `generateStage`, la temporada, los vetos y la geometría que leen, el censo, y al final lo que ganan `StageSpec`, `CalendarStage`, `CalendarRace` y `race_routes`. Cada bloque TypeScript va seguido de por qué tiene esa forma y contra qué línea del código encaja. Los rangos numéricos que aparecen en comentarios salen del bloque `ARCH` (sección 12, Las constantes) y no se repiten aquí con su apoyo; los nombres de fichero son los de la tabla de la sección 15 (El plan de implementación por pasos, tests primero). Regla de lectura: cuando otra sección introduce un nombre exportado, su firma está aquí, en la fila de su fichero, tal como la sección que lo introduce la escribe; si una sección y esta discrepan, manda esta y la pasada de coherencia corrige la otra. Los ficheros de sello, el código legado y los ficheros de test nuevos que otras secciones nombran están en §3.12, con la forma de lo que exportan.

Una regla de importación que vale para todos los bloques y que ningún test de tipos ve: `constants.ts` no importa nada del motor (es hoja); ningún fuente de `routes/grammar/` que no sea test importa un VALOR de `routes/calendar.ts`; `calendar.ts` importa todos los `grammar/*.ts`. Dos cosas quedan fuera de la regla, y a propósito. La primera, la sentencia `import type { … } from '../calendar.js'` entera: `tsconfig.base.json` l. 23 activa `verbatimModuleSyntax`, con la que esa sentencia se borra al compilar y no carga el módulo, y hace falta porque `StageSpec` (que devuelve `composeTour`) y `RaceFormat` (que llevan `RouteContext` y `StageRequest`) viven en `calendar.ts` (l. 31 y l. 34-40 en HEAD). La forma mixta `import { type X } from '../calendar.js'` NO vale: con `verbatimModuleSyntax` se emite como `import {} from '../calendar.js'` y sí carga el módulo. La segunda, los `*.test.ts` de `grammar/` (`calendario.test.ts`, `regions.test.ts`, `edition.test.ts`, `skeletons.test.ts`), que importan `calendarForSeason`, `SEASON_CALENDAR` o `RACE_ROWS` con valor: nadie importa un test, así que un test no puede cerrar un ciclo de carga. Es lo que impide el ciclo que se explica en §3.8, y lo sella `routes/arranque.test.ts` con el `it` que se escribe allí.

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
  hijos?: Motif[]                              // `cadena`, `racimo`, `circuito`: SOLO dificultades, nunca enlaces
  separaciones?: number[]                      // km de enlace interno: hijos.length − 1 en `cadena` y `racimo`; hijos.length en `circuito` (sección 5)
  vueltas?: number                             // solo `circuito`
  meta?: MetaKind                              // solo `meta`
  cotaFinal?: { km: number; g: number }        // `meta` con cota
  firma?: boolean                              // motivo de FIRMA: no cambia entre ediciones
  nombre?: string                              // texto para la ficha ("Muro de 1,2 km al 11 %")
}

/** Fábrica de corrientes de azar por subflujo nominal, al estilo de `stageRng` (stage/rng.ts l. 26-29). */
export type RngFactory = (sub: string) => () => number

/** `null` si el motivo cumple los rangos de `ARCH.motivo` y `ARCH.meta` (y, con `geo`, los de la zona); si no, la regla violada. Puro. */
export function validateMotif(m: Motif, geo?: GeoSignature): string | null
/** Rinde UN motivo a segmentos con las primitivas de `profileGen.ts`; `geo` da la amplitud del relleno.
 *  `rng` es una fábrica: el motivo tira de `rng('')` y cada hijo h de `cadena`, `racimo` y `circuito` de `rng(`hijo${h}`)`.
 *  No cuadra km (`normalizeEnlaces`), no emite pancartas (`emitirPancartas`), no verifica (`verify`). Puro. */
export function renderMotif(m: Motif, rng: RngFactory, geo: GeoSignature): Segment[]

/** Un motivo instanciado y el hueco del que sale (índice en `sk.slots`, o 'meta'): `colocar` lo necesita para la ventana y `Motif` no lo lleva. */
export interface Instancia { slot: number | 'meta'; j: number; motif: Motif }
/** Paso 2 de generateStage (sección 8, §8.3): huecos con `firma: true` y la meta, una vez por etapa con `rand` = routeRng(semillaDe('firma', req)),
 *  dentro de ARCH.motivo ∩ (alternativa.slots?.[k] ?? slot.params) ∩ req.geo; con `opcion` > 0 lee los rangos de sk.alternativas[opcion − 1]. */
export function instanciarFirma(sk: Skeleton, opcion: number, req: StageRequest, rand: () => number): Instancia[]
/** Paso 4 (sección 8, §8.5): huecos no firma según plan.n con rngDe(slot, j) = routeRng(semillaDe('mot', req, { slot, j, intento })),
 *  degradación con degradarMotivo (geo.ts) y persecución del desnivel. Devuelve firma + no firma + meta, ordenados por slot y j, meta al final. */
export function instanciar(sk: Skeleton, firma: readonly Instancia[], plan: EditionPlan, req: StageRequest,
  rngDe: (slot: number, j: number) => () => number): Instancia[]
// Imports de tipo que estas dos firmas añaden (se borran al compilar, verbatimModuleSyntax): Skeleton de './skeletons.js',
// EditionPlan de './edition.js', StageRequest de './generate.js'. Los únicos valores nuevos que motifs.ts importa son degradarMotivo y firmeDe de './geo.js'.
```

Un motivo es una pieza de carretera con significado ciclista, y es la unidad que la semilla decide primero (principio 1, sección 2). Es un solo `interface` con campos opcionales y no una unión discriminada (banco e ingeniero la usaban) por dos razones prácticas: los esqueletos declaran `params?: Partial<Pick<Motif, ...>>` sobre un solo tipo, y la plantilla canónica de cada esqueleto es un `Motif[]` literal que se escribe a mano (sección 5); `validateMotif` es quien impone la coherencia entre `kind` y campos, con un test por motivo en `grammar/motifs.test.ts`, y con `geo` además comprueba que el motivo cabe en la zona (`validateMotif(m, ZONAS.alpes)`, sección 4). Todo está en km y % redondeado a 0,1, que es la resolución a la que `normalizeEnlaces` cuadra el total (V10 exige Σ km al 0,1).

`renderMotif` recibe una fábrica y no una sola corriente porque un `circuito` promete que sus `vueltas` pasos por la misma cota dibujen LO MISMO, y una `cadena` o un `racimo` necesitan una corriente por hijo para que añadir un hijo no desplace el dibujo de los demás (principio 7): con un único `rand` ninguna de las dos cosas es posible. La fábrica la construye `renderSkeleton` (sección 8) sobre el subflujo `dib|…` de §3.8, exactamente como `stageRng(seed)` devuelve `(subflow) => seededRng(...)` en `stage/rng.ts` l. 26-29.

Cómo se rinde cada motivo a `Segment[]` y qué lee el motor de él (rangos de `ARCH.motivo` copiados del bloque de la sección 12 §12.1, que es su única fuente y manda sobre esta tabla si alguna cifra discrepa; `[a; b)` marca un techo excluido; lecturas del mapa 03 §3 y §4):

| Motivo | `km` | `g` | Rinde a `Segment[]` como | Qué lee el motor |
| --- | --- | --- | --- | --- |
| `enlace` | [1; 300] (el enlace de aproximación de una clásica es UN motivo, sección 4 §4.2) | amplitud `geo.amplitud` ≤ 2,4 | `rolling(rand, km, amp, 0)` en trozos de 3 a 6 km (`profileGen.ts` l. 102): varios `llano` con tramos | pendiente en `costBase`; único terreno con abanico y acordeón (`simulate.ts` l. 1215, 4340-4408); `selectionFactor` 0 |
| `expuesto` | [5; 120] | amplitud `min(ARCH.motivo.expuesto.amp 0,5; geo.amplitud)` | `rolling(rand, km, min(ARCH.motivo.expuesto.amp, geo.amplitud), 0)` | igual; la ficha lo describe como llano abierto, sin prometer abanicos (decisión 17) |
| `tendida` | [5; 30] | [1,5; 3,5] | UN `llano` con 2 a 4 tramos a `g ± 0,7` | `costBase` 0,24 + 0,135·g; NO suma `kmSubida`; no selecciona |
| `descenso` | [2; 25] (`ARCH.motivo.descenso.km`); la bajada canónica mide [2; 10] y la calcula `colocar` (`place.ts`, sección 8) desde la dificultad precedente con `ARCH.motivo.descenso.kmPorDesnivel` (`clamp(len·g·10/55, 2, 10)`, la bajada canónica de `mountainClassicSegments` l. 467) y lo guarda en `Motif.km`; un `descenso` sin dificultad delante toma `kmRango` del `Slot` | [−8; −3]; la pendiente la fija la fracción `ARCH.colocacion.bajadaTrasPuerto` de lo subido (sección 8, §8.6) | `descent(rand, km, |g|)`: un `descenso` con tramos | selecciona solo con g ≤ −4 en su primer km o entero a ≤ 25 km de meta (l. 2427, 5083-5089); coste con suelo 0,10. `validateMotif` solo exige `km ∈ [2; 25]` y `g ∈ [−8; −3]` |
| `cota` | [2,5; 8,0] | [4; 8) (8 = `STAGE.wallMinGradient`, excluido) | `climb(rand, km, g)`: un `puerto` con tramos, pancarta `cima` si ≥ 1,5 km | `subida`: suma a `kmSubida`, deriva, `climbRaceKmToGo` 30, categoría por `deriveClimbCategory` |
| `puerto` | [9; 25] | [5; 12] (la zona estrecha, sección 6) | `climb`; `forma: 'irregular'` añade una rampa de [0,3; 0,8] km al [11; 13] % | igual; con COL bloque a bloque donde g ≥ 8 (`riderPerfil`, l. 434) |
| `muro` | [0,4; 2,5] (2,5 = `STAGE.wallMaxKm`) | [8; 16] | con `km < 1,0`, UNA rampa de `km` al `g` declarado; con `km ≥ 1,0`, `climb(rand, km, g, { gMin: 8, gMax: 16 })` con 2 rampas (sección 4 §4.2); `adoquin: true` sigue siendo `puerto` | COL en todos sus bloques; en meta y ≤ 1,0 km, `finishType` da `muro` (`finish.ts` l. 184-185) |
| `cadena` | Σ hijos + Σ `separaciones`, cada separación en `ARCH.motivo.cadena.enlace` [1,5; 6] km | | de 2 a 8 hijos (`muro` o `cota`); entre cada dos, su separación rendida con `rolling` a `geo.amplitud`, sin valle; el hijo h con `rng(`hijo${h}`)` y la separación h con `rng(`sep${h}`)` (sección 4 §4.5) | nada nuevo: n rachas de `subida` seguidas |
| `sector` | [0,3; 3,7] | 0 | `{ km, tipo: 'paves', estrellas }`; `firme: 'tierra'` se rinde como `paves` de 2 a 3★ (como Strade en `classicRoutes.ts` l. 594) | `estrellas` en `costBase` 0,55 + 0,06·e, selección y percances ×20 (`constants.ts` l. 4389) |
| `racimo` | [10; 60] = Σ hijos + Σ `separaciones` | | [4; 10] sectores; entre cada dos, su separación de [2; 6] km (`ARCH.motivo.racimo.separacion`) rendida con `rolling` a amplitud 0,7; el sector h con `rng(`hijo${h}`)` y la separación h con `rng(`sep${h}`)` | `kmToNextPaves` y el peaje de entrada en cada sector (l. 1628-1636, 2611) |
| `circuito` | vuelta [1,5; 30] × [2; 40] vueltas en `ARCH`; cada `Slot.params` lo estrecha con `kmRango` y `vueltasRango` (sección 5) | | `separaciones[h]` es el enlace ANTES del hijo h y el resto de la vuelta, ≥ 1,5 km, la cierra (sección 4 §4.5, regla 3); los `hijos` rendidos `vueltas` veces; el hijo h se rinde con `rng(`hijo${h}`)` y cada vuelta REUTILIZA la misma corriente (se vuelve a pedir `rng(`hijo${h}`)` por vuelta, que devuelve la misma secuencia) | n pasos por la misma cota; UNA sola pancarta por cota del circuito ≥ 1,5 km, en su último paso, nunca una por paso (decisión 25; sección 8 §8.10) |
| `meta` | según `MetaKind` | | sección 4 (tabla de los nueve finales) | `finishType` medido en el censo (V16) y `finalKindOf` garantizado (V7) |

Dos aclaraciones que las propuestas dejaban ambiguas. `tendida` y `expuesto` se tipan `llano` a propósito y no `rompepiernas`, porque el segundo pierde sus tramos en el muestreo (hecho 1 de §3.1). Y `muro` adoquinado sigue siendo `puerto` (regla de la casa de `fuentes-recorridos.md`, citada por arquitectura §3.1): `adoquin: true` solo cambia el nombre de la ficha y el requisito geográfico (`GeoSignature.muro.adoquin`), nunca `Segment.tipo`.

### 3.3 Esqueletos (`routes/grammar/skeletons.ts`)

```ts
// packages/engine/src/routes/grammar/skeletons.ts
import type { StageKind } from '../testTour.js'
import type { FinalKind } from '../finalKind.js'
import type { RouteTerrain } from '../featureProfile.js'
import type { RaceClass } from '../uci.js'
import type { EditionTerrain } from '../editions.js'           // l. 10: 'flat' | 'hilly' | 'mountain' | 'itt' | 'cobbles'
import type { GeoSignature, Relieve } from './geo.js'
import type { StageRole } from './tour.js'
import type { StageRequest } from './generate.js'

/** Lo que el esqueleto exige de la zona (sección 5, §5.1); `admite` (geo.ts, §3.4) es la única función que lo lee. Un campo ausente no exige nada. */
export interface Requiere {
  puerto?: true                                // geo.puerto !== null
  cota?: true                                  // geo.cota !== null
  muro?: true | { adoquin: true }              // geo.muro !== null; { adoquin: true } además geo.muro.adoquin
  cotaKmMin?: number                           // geo.cota !== null && geo.cota.km[1] >= n (3,3: una cota que saque de `clasica`)
  cotaCortaMax?: number                        // geo.cota !== null && geo.cota.km[0] <= n (2,9: una cota que siga siendo `clasica`; solo `ud_circuito`)
  adoquin?: 1 | 2 | 3                          // geo.adoquin >= n
  sterrato?: true                              // geo.sterrato
  viento?: 1 | 2 | 3                           // geo.viento >= n
  relieve?: Relieve                            // mínimo: orden(geo.relieve) >= orden(r), llano < ondulado < media < montana < alta
  finalesAlto?: 'corto' | 'largo'              // 'corto': geo.finalesAlto ∈ {corto, largo}; 'largo': === 'largo'
  altitud?: GeoSignature['altitud']            // igualdad: geo.altitud === a (una disyunción se escribe como lista de Requiere)
}

export interface SlotParams extends Partial<Pick<Motif, 'g' | 'forma' | 'adoquin' | 'estrellas' | 'vueltas' | 'firme'>> {
  kmRango?: [number, number]                   // km del motivo; en `circuito`, km de la vuelta
  gRango?: [number, number]
  estrellasRango?: [number, number]            // solo `sector`
  vueltasRango?: [number, number]              // solo `circuito`
  separacionRango?: [number, number]           // `cadena`, `racimo`, `circuito`: enlace entre hijos (defecto ARCH.motivo.cadena/racimo)
  adoquinShare?: [number, number]              // `cadena` de muros: fracción de hijos con `adoquin: true`
  firmaCount?: number                          // `racimo`: hijos 5★ de firma que el esqueleto reparte
}

export interface Slot {
  motif: MotifKind
  n: [number, number]                          // cardinalidad; 0 en el mínimo = hueco opcional
  ventana: [number, number]                    // fracción de la etapa (o de la vuelta o cadena, en `hijos`) donde EMPIEZA el motivo
  params?: SlotParams
  hijos?: Slot[]                               // solo `cadena`, `racimo`, `circuito`; `[]` en `circuito` es una vuelta de solo enlace
  firma?: boolean
}

/** Rotación declarada de nivel 2 (sección 10, §10.3): un juego de RANGOS por hueco de firma más una plantilla literal. */
export interface Alternativa {
  nombre: string                               // "Bérgamo", "Angliru", "Lagos": frase y diffMotivos
  meta?: MetaKind                              // si la opción cambia la meta; V7 exige finalKindDe(meta)
  metaParams?: { kmRango?: [number, number]; gRango?: [number, number] }   // rango de `cotaFinal` de la opción
  slots?: Record<number, SlotParams>           // por índice de hueco con firma: sustituyen a los `params` del hueco
  canonico: Motif[]                            // plantilla de la opción: galería, degradado y skeletons.test.ts
}

export interface Skeleton {
  id: SkeletonId
  kind: StageKind                              // lo que `stageKindOf` TIENE que devolver (V6)
  label: string                                // la etiqueta de la ficha; OBLIGATORIA y compatible con `kind` (test)
  timeTrial?: true                             // solo `et_crono`, `et_prologo`, `et_cronoescalada`, `nc_crono`
  finalKind?: FinalKind                        // reinas y medias con un solo final posible: lo que `finalKindOf` TIENE que devolver (V7)
  meta: MetaKind
  metaParams?: { aMeta?: [number, number]; cotaFinal?: { km: [number, number]; g: [number, number] } }   // columnas "Meta" de la sección 5
  slots: Slot[]
  dPlus: [number, number]                      // objetivo TOTAL, relleno incluido (ARCH.reina.dPlusIncluyeRelleno)
  km: [number, number]                         // rango bruto antes de ARCH.km.porClase
  requiere?: Requiere | Requiere[]             // lista = alternativas ("o bien"); lo lee solo admite (geo.ts, §3.4)
  pesoBase: number                             // peso del catálogo antes de zona y clase
  canonico: Motif[]                            // instancia fija escrita a mano: pasa todos los vetos por construcción
  alternativas?: Alternativa[]                 // rotación DECLARADA (ARCH.edicion.nivel 2): opcionDe elige (§3.8)
}

export type SkeletonId =
  // un día (16)
  | 'ud_esprint' | 'ud_esprint_capi' | 'ud_circuito' | 'ud_muro_final' | 'ud_muros'
  | 'ud_muros_adoquin' | 'ud_sterrato' | 'ud_adoquin' | 'ud_adoquin_ligero' | 'ud_montana'
  | 'ud_montana_media' | 'ud_repecho' | 'ud_montana_alto' | 'ud_criterium' | 'nc_ruta' | 'nc_crono'
  // etapa de vuelta (16)
  | 'et_llana' | 'et_llana_viento' | 'et_media_valle' | 'et_media_alto' | 'et_media_muro'
  | 'et_media_tendida' | 'et_reina_alto_largo' | 'et_reina_alto_corto' | 'et_reina_cima_cerca'
  | 'et_reina_valle' | 'et_reina_encadenada' | 'et_montana_corta' | 'et_reina_blanda'
  | 'et_crono' | 'et_prologo' | 'et_cronoescalada'

export const SKELETON_IDS: readonly SkeletonId[]              // la unión como lista literal (32); el test la compara con Object.keys(SKELETONS)
export const SKELETONS: Record<SkeletonId, Skeleton>
export const CANONICO: Record<SkeletonId, Motif[]>            // las 32 plantillas canónicas (Skeleton.canonico se rellena desde aquí)
export const NC_RUTA_CLASICA: Motif[]                         // plantilla de `nc_ruta` en zonas sin cota ≥ 3,3 km (sección 5)
/** Traducción de `RaceRow.terrain` a candidatos de un día con multiplicador; sesgo, nunca orden (sección 5, §5.6). */
export const SESGO_TERRENO: Record<RouteTerrain, Partial<Record<SkeletonId, number>>>
/** A qué terreno se baja cuando la zona no admite ningún candidato: cobbles → classic → hilly → flat; mountain → hilly; flat e itt no bajan. */
export const ESCALON_TERRENO: Record<RouteTerrain, RouteTerrain | null>
/** Escalón de papel de la decisión 12; la ÚNICA tabla de degradación de papeles del documento (valores: sección 5, §5.7). */
export const ESCALON_ROLE: Record<StageRole, StageRole | null>
/** = ESCALON_ROLE[role]: baja UN escalón, nunca sube; `null` en llana, cri y prologo. */
export function degradarPapel(role: StageRole): StageRole | null
/** Etapas de edición sin rasgos (sección 5, §5.8): candidatos por terreno de la edición y papel al que se degrada si ninguno cabe. */
export const POR_TERRENO_EDICION: Record<EditionTerrain, { ids: SkeletonId[]; papel: StageRole }>
/** `SKELETONS[id]`, salvo `nc_ruta` en zonas sin `cota` ≥ 3,3 km, que devuelve una copia `clasica / Classic` con `NC_RUTA_CLASICA` (sección 5, §5.7). */
export function skeletonFor(id: SkeletonId, geo: GeoSignature): Skeleton
export type Peticion = Pick<StageRequest, 'role' | 'terrain' | 'geo' | 'raceClass' | 'format' | 'km' | 'routeSource'>
/** Las tres condiciones de candidato (admite, pesoPorClase > 0, km[0] ≤ maxPorClase); la usan candidatos y la atadura de elegirEsqueleto (sección 8, §8.2 paso 1 bis). */
export function cabe(id: SkeletonId, req: Peticion): boolean
/** Candidatos con peso ya multiplicado (pesoBase × SESGO_TERRENO × ARCH.pesoPorClase × geo.pesos); pura (sección 5, §5.7). */
export function candidatos(req: Peticion): { id: SkeletonId; peso: number }[]
```

Tres nombres de esta lista se deciden aquí porque las secciones 5 y 6 los escribían distinto. `degradarPapel` es el nombre (el de la sección 6) y vive en `skeletons.ts`, junto a `ESCALON_ROLE`, cuyos valores escribe la sección 5 y ninguna otra: la sección 5 la llamaba `degradar(role)`, que choca con `degradar(relieve)` de `geo.ts`, y la sección 6 la ponía en `geo.ts`, lo que obligaría a `geo.ts` a importar un valor de `skeletons.ts` (que ya importa `admite` de `geo.ts`); `generate.ts` (sección 8, §8.1) no importa ni `degradarPapel` ni `degradarMotivo`: a la primera la llama `candidatos` y a la segunda `instanciar` (`motifs.ts`, §3.2). La tabla en prosa de §6.5 punto 2 (`media_alto → media`) cede ante la de §5.7 (`media_alto → media_muro`). `Requiere` es el de la sección 5 (§5.1) y vive aquí, en `skeletons.ts`, porque es un campo del esqueleto; `admite(requiere, geo)` vive en `geo.ts` (§3.4) y lo trae con `import type`. Y `Skeleton.alternativas` es `Alternativa[]` (sección 10, §10.3), no `Motif[][]`: una alternativa literal copiada a todas las carreras del esqueleto reintroduciría el clon que V12 caza.

Un esqueleto es una secuencia de huecos con cardinalidad y ventana de posición, y es el molde que el dueño echa en falta cuando dice que siempre salen los mismos tres o cuatro modelos (agenda §4.18): 32 en vez de los siete de hoy (`ittSegments === flatSegments`, mapa 01 §2.1): 16 de un día (`ud_*` y `nc_*`) y 16 de etapa (`et_*`), contados uno a uno en la unión de arriba. Arquitectura §3.3 y el esqueleto (decisión 1 de §C.1, §B.1, §B.2, §D) escribían "32 (15 de un día, 17 de etapa)", pero ninguna propuesta nombra un decimoséptimo esqueleto de etapa; el trigésimo segundo es `ud_repecho` (media / Uphill finish, meta `repecho`), que la sección 5 (§5.1 y §5.2) añade porque en las zonas con `muro: null` una carrera `hilly` de un día solo podía ser `ud_circuito` o `ud_montana_media`. El tipo es lo que compila: `SKELETONS` tendrá 32 claves, la galería 32 esqueletos y las bandas "esqueletos distintos por clase" se miden sobre 32; `skeletons.test.ts` sella `Object.keys(SKELETONS).sort()` igual a `SKELETON_IDS` (16 + 16). Por qué cada campo:

- `kind` es una PROMESA, no una etiqueta: V6 exige `stageKindOf(profile, sk.timeTrial ?? false).kind === skeletonFor(sk.id, req.geo).kind` (`stageKind.ts` l. 71-98, umbrales `PASS_MIN_KM` 8,5 l. 62 y `WALL_MAX_KM` 3 l. 60 sin tocar, decisión 26). Se compara contra `skeletonFor(...)` y no contra `SKELETONS[id]` porque `nc_ruta` es la única excepción a "un `kind` por esqueleto" (sección 5, §5.7). Un esqueleto que no puede cumplir su promesa se corrige en el catálogo, no en el clasificador.
- `timeTrial` es dato de entrada de `stageKindOf`, no algo que se lea del relieve (`stageKind.test.ts` l. 32-43: "una crono es una crono aunque su perfil sea el de una llana"), y ningún otro tipo lo lleva: ni `StageRequest` (el papel `cri` o el `terrain: 'itt'` de una fila de tabla eligen un esqueleto de crono, y la fila `itt` de un día y los 266 `nc-*-itt` entran con `role: 'un_dia'`), ni el `Slot`. Por eso lo declara el esqueleto (`true` en los cuatro de crono, ausente en el resto) y `GeneratedStage.timeTrial = sk.timeTrial ?? false` es lo que V6 usa.
- `label` es la etiqueta del CATÁLOGO; la de la ficha, la que se congela en `race_routes.label`, es `labelDe(sk, profile, timeTrial)` (§3.7, sección 11 §11.5 regla 3), calculada DESPUÉS de que V6 haya igualado el `kind`: devuelve `sk.label` si es una de las cinco etiquetas de esqueleto y `stageKindOf(profile, timeTrial).label` si es una de las ocho de hoy, y para toda instancia válida del catálogo las dos coinciden (lo sella `skeletons.test.ts`). No basta con `stageKindOf(...).label` porque las etiquetas nuevas de la decisión 38 (`Circuit`, `Wall finish`, `Prologue`, `Hill climb`, `Mountains classic`) no se deducen del perfil (`stageKindOf`, l. 71-98, solo devuelve `Flat`, `Hills`, `Uphill finish`, `Summit finish`, `Mountains`, `Classic`, `Cobbles`, `ITT`). `stageKindOf(...).label` queda solo para las etapas `real` (sección 11, §11.5 regla 3). `skeletons.test.ts` sella que cada `label` es compatible con su `kind` (tabla de la sección 5: `Circuit` y `Wall finish` con `clasica` o `media`, `Prologue` y `Hill climb` con `cri`, `Mountains classic` con `reina`, y las ocho de hoy con el `kind` que `stageKindOf` les da). La decisión 38 de §C.1 dice "el `label` de una etapa generada sale de `stageKindOf(...).label`"; la pasada de coherencia la reescribe con `labelDe`, que es la que la sección 11 ya implementa.
- `finalKind` es una promesa cuando está declarado: V7 exige `finalKindOf(profile) === sk.finalKind` (`finalKind.ts` l. 78-85 con los cortes 0,5 / 5 / 20 de `FINAL_KIND_CUTS` l. 30). Cuando NO está declarado (llanas, clásicas, cronos, y los esqueletos con más de un final posible, `ud_montana` y `et_reina_valle`, secciones 5 y 9), V7 se evalúa contra `finalKindDe(sk.meta)` (§3.9): nunca contra `undefined`, porque `finalKindOf` devuelve un valor no nulo en cuanto hay una pancarta `cima` y la comparación fallaría siempre. `skeletons.test.ts` sella que, cuando `finalKind` está declarado, coincide con `finalKindDe(sk.meta)`.
- `ventana` es la fracción de la etapa donde el motivo EMPIEZA, medida desde la salida (arquitectura §3.3). La propuesta de datos anclaba los huecos desde la meta; aquí lo que se ancla desde la meta es solo el final, y lo hace el motivo `meta` con `cotaFinal` y el rango de valle de cada `MetaKind` (`ARCH.meta.*.valle`), que es donde la identidad de una etapa real se decide (mapa 07 §4.3).
- `dPlus` es el desnivel TOTAL, relleno incluido (decisión 9), y se verifica con `dPlusDe(profile)` (Σ `climbMetres` de todos los segmentos, §3.9), que es la cifra `metres` que `stageKindOf` compara con 3.200 (`stageKind.ts` l. 80-90): el objetivo se persigue sobre lo que el clasificador mide y no sobre la suma de dificultades. NO es lo que mide `calendarQueens.ts::desnivelDe` (l. 54-58): esa función suma bloques `subida`, que `blockTerrain` (`stage/sample.ts` l. 32-44) solo da a los segmentos `puerto`, así que mide los puertos solos, sin relleno. Por eso `CalendarQueen.dPlus` pasa a `dPlusDe` en el paso 9 con cambio de población de las cubetas declarado (sección 13 §13.4 punto 2) y el censo imprime las dos cifras (`RouteStats.dPlus` y `dPlusBloques`, §3.10), cuya diferencia es el relleno y no un error (sección 8 §8.5).
- `km` es el rango bruto; la clase lo recorta con `ARCH.km.porClase` y `ARCH.km.maxPorClase` (sección 7). La propuesta ganadora usaba un factor multiplicativo; la tabla lo sustituye (decisión 36).
- `requiere` es un `Requiere` (o una lista de ellos, que son alternativas: basta con que una se cumpla), tipo propio declarado arriba y no `Partial<GeoSignature>`, porque este no puede decir "no nulo", un umbral ni una disyunción. Lo lee solo `admite(sk.requiere, geo)`: `{ adoquin: 2 }` exige `geo.adoquin ≥ 2`, `{ sterrato: true }` exige `sterrato`, `{ finalesAlto: 'largo' }` exige exactamente ese valor, `{ cota: true, cotaKmMin: 3.3 }` exige una cota de la zona que llegue a 3,3 km. `admite` no mira los `Slot`: que todo hueco obligatorio de `puerto`, `cota` o `muro` tenga su motivo en la zona es una propiedad de las dos tablas que sella el test (h) de §6.8, y por eso `requiere` tiene que decir todo lo que un hueco obligatorio necesita (sección 5, §5.1, consecuencia 2).
- `pesoBase` existe porque el juez de ejecutabilidad señaló que la ganadora dejó los pesos base del catálogo sin escribir (`juicios/ejecutabilidad.md` §4); los valores van en la tabla de la sección 5 y se multiplican por `SESGO_TERRENO` (un día), `GeoSignature.pesos` y `ARCH.pesoPorClase` en `candidatos`.
- `canonico` es un `Motif[]` literal por esqueleto, escrito a mano en `CANONICO` y comprobado en `skeletons.test.ts` contra los 16 vetos: es la plantilla a la que cae `generateStage` tras `ARCH.colocacion.maxIntentos` 8 (con `degradado: true`, y cero veces en el calendario por `ARCH.veto.fallbackMaxShare.calendario` 0).
- `alternativas` es la rotación declarada de `ARCH.edicion.nivel` 2 (decisión 22), como `Alternativa[]` (sección 10, §10.3): la opción de una temporada es `` opcionDe(sk, raceId, season) = (hashInt(`alt|${raceId}`) + season) % (1 + alternativas.length) `` sobre `[canonico, ...alternativas.map((a) => a.canonico)]`, sin consumir tirada; con `hashInt` delante dos carreras del mismo esqueleto no cambian de final el mismo año. La firma se instancia dentro de los RANGOS de la opción (`Alternativa.slots`, `metaParams`), no copiando su plantilla. Solo la tienen los esqueletos que la sección 5 lista (`ud_montana` con Como y Bérgamo; `et_reina_alto_largo` con Angliru y Lagos).

El tipo entero es serializable (solo literales, arrays y strings, sin funciones): es la propiedad que permite congelar las tres reinas de `REAL_QUEENS` como `Skeleton` literal en `sim/frozenSkeletons.ts` y renderizarlas con el renderizador nuevo (decisión 33), en vez de congelar `Segment[]`.

### 3.4 Geografía (`routes/grammar/geo.ts`)

```ts
// packages/engine/src/routes/grammar/geo.ts
import type { Motif, MotifKind } from './motifs.js'
import type { Requiere, SkeletonId } from './skeletons.js'   // solo tipos: skeletons.ts ya importa valores de aquí

export type GeoZone =
  | 'flandes' | 'ardenas' | 'bretana' | 'francia_norte' | 'macizo_central' | 'alpes' | 'pirineos'
  | 'provenza' | 'italia_norte' | 'italia_centro' | 'dolomitas' | 'italia_sur'
  | 'cantabrico' | 'meseta' | 'andalucia' | 'levante' | 'portugal'
  | 'centroeuropa' | 'escandinavia' | 'britanicas' | 'balcanes' | 'anatolia'
  | 'andes' | 'cono_sur' | 'norteamerica' | 'australia' | 'asia_oriental' | 'golfo' | 'africa_llana'
  | 'montana_sur'                                // MY, RW, MA: sin fila en el mapa 07, juicio (sección 6 §6.2)
  | 'generico'

export type Relieve = 'llano' | 'ondulado' | 'media' | 'montana' | 'alta'

/** `null` significa "aquí no existe" y los vetos V1 a V4 lo hacen cumplir. */
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

export const ZONAS: Record<GeoZone, GeoSignature>           // 31 filas: 30 zonas con nombre más `generico`
export const TERRITORIOS: Record<string, Territorio>          // ISO alpha-2, 64 filas explícitas (56 obligatorias + 8 voluntarias)
export const FALLBACK: Territorio                             // { ruta: [{ zona: 'generico', peso: 1 }], cordillera: null, fallback: true }
/** = TERRITORIOS[country] ?? FALLBACK; `null` (banco sin país) da FALLBACK. */
export function territorioDe(country: string | null): Territorio
/** Zona de mayor peso de `territorioDe(country).ruta` (empate: la primera en `ruta`); `generico` si el país es fallback, es desconocido o `country` es null. */
export function zonaDe(country: string | null): GeoZone

/** (sección 5, §5.1) Cierto si `requiere` es `undefined` o si él (o, si es lista, alguna de sus alternativas) se cumple campo a campo con
 *  la semántica de los comentarios de `Requiere` (§3.3). Solo lee `requiere`: que el esqueleto además se pueda DIBUJAR en la zona
 *  (huecos obligatorios con motivo no nulo y rango efectivo no vacío, meta dentro de su rango) lo sella el test (h) de §6.8. */
export function admite(requiere: Requiere | Requiere[] | undefined, geo: GeoSignature): boolean
/** Siempre hacia abajo: alta → montana → media → ondulado → llano; `llano` se queda en `llano`. Nunca hacia arriba: un país llano no gana puertos. */
export function degradar(relieve: Relieve): Relieve
/** Hueco cuyo motivo no existe en la zona (sección 8, §8.5): puerto → cota → muro → enlace; cota → muro → enlace; muro → cota → enlace;
 *  sector y racimo sin adoquín ≥ 2 ni sterrato → enlace; `circuito` se devuelve a sí mismo (degrada a sus hijos). */
export function degradarMotivo(kind: MotifKind, geo: GeoSignature): MotifKind
/** El firme que la zona da a un `sector` (sección 6, §6.5 punto 5): 'adoquin' si geo.adoquin ≥ 2; si no, 'tierra' si geo.sterrato; si no, null. */
export function firmeDe(geo: GeoSignature): 'adoquin' | 'tierra' | null
/** Copia de una plantilla con todo `sector` (a cualquier profundidad de `hijos`) cuyo firme la zona no admite rehecho con firmeDe(geo); pura (§6.5 punto 5). */
export function conFirmeDeZona(motivos: readonly Motif[], geo: GeoSignature): Motif[]
```

`admite` recibe `(requiere, geo)` en ese orden en todo el documento, con el `Requiere` de la sección 5 (§5.1), que es como lo escriben las secciones 2, 5, 6 (dueña de `geo.ts`) y 16: las enmiendas de §6.5 caben en él (`relieve: 'alta'` como mínimo en `et_reina_encadenada`, `muro: { adoquin: true }`, `cotaKmMin: 3.3`, `cotaCortaMax: 2.9` y la lista de tres alternativas de `et_media_tendida`), así que no hacen falta `relieveMin`, `relieveEn`, `muro: 'adoquin'` ni `altitud` como lista, que una versión anterior de este bloque declaraba. Hay tres funciones de degradación con tres nombres: `degradar` (relieve, aquí), `degradarMotivo` (hueco, aquí) y `degradarPapel` (papel, `skeletons.ts`, §3.3). `firmeDe` y `conFirmeDeZona` son las dos funciones que la sección 6 (§6.5 punto 5) añade para que el `firme` de un `sector` lo decida la zona en un solo sitio; las llaman `instanciar` (§8.5) y `canonica` (§8.11).

La firma de una zona dice qué existe y qué no, y la palabra para lo segundo es `null`, no un rango vacío ni un peso cero: `puerto: null` en `flandes` hace que ningún esqueleto con un `Slot` de `puerto` obligatorio esté disponible allí (V1), `cota: null` en el pólder y el desierto quita hasta la media montaña, y `muro: null` en `golfo` impide un `ud_muros` en Emiratos. La propuesta ganadora dejaba `cota` no anulable; la de geografía anulaba `cota`, `muro` y `puerto`, y esa es la forma que se toma, porque un pólder no tiene cotas de 2,5 km y decirlo con `null` es más honesto que con `[2,5; 2,5]`. `admite` es la única función que lee `requiere`, y `degradar` va siempre hacia abajo por la cadena de los cinco valores de `Relieve` (`alta → montana → media → ondulado → llano`; la decisión 12 de la síntesis, §C.1 del esqueleto, escribía cuatro y omitía `alta`, y la sección 17, riesgo 2, dice ya los cinco): una reina pedida en `flandes` sale `media_alto` y se anota, nunca al revés.

`amplitud` sustituye el `bumpy ? 3.2 : 1.8` literal de `rolling` (`profileGen.ts` l. 105) por un número de la zona, con tope `ARCH.motivo.enlace.ampMax` 2,4 para que el relleno nunca alcance el 3 % que `deriveFinishTerrain` lee como cota (`STAGE.finishClimbMinGradient` 3, `constants.ts` l. 3977); el pólder va en [0,4; 0,9]. `viento` y `altitud` son metadatos: `altitud` además veta (V4: `alto_largo` solo con `finalesAlto: 'largo'`, ningún puerto ≥ 15 km fuera de `media`, `alta` o `altiplano`), pero ninguno de los dos toca un `Segment`. `pesos` multiplica `Skeleton.pesoBase` y es donde la zona expresa lo que existe más o menos (Flandes sube `ud_muros` y `ud_muros_adoquin`; los Alpes suben `et_reina_alto_largo`).

Las cifras de las dos tablas, que la sección 6 (dueña) fija y que aquí se repiten para que nadie las cuente distinto: `ZONAS` tiene 31 filas, porque `Record<GeoZone, GeoSignature>` exige una por miembro de la unión: las 30 zonas con nombre (las 29 del esqueleto más `montana_sur`, que la sección 6 §6.2 añade para Malasia, Ruanda y Marruecos) y `generico`, que es la firma del país sin territorio. `TERRITORIOS` tiene 64 filas explícitas: los 56 países con carreras de equipos (mapa 02 §10; la decisión 13 solo cuenta estos) más 8 voluntarias (AR, CL, NZ, IE, SE, FI, LV, QA) que existen porque su zona tiene nombre en `ZONAS` y porque el bug AR/CL de §D.6 exige filas para `cono_sur`. Los 69 países restantes de los 133 de `COUNTRIES` (`packages/shared/src/countries.ts`, medidos con grep en la sección 6; `datos.md` §5.2 decía 136) caen a `FALLBACK`, que es deliberadamente mediocre; `geo.test.ts` sella que ninguno de los 56 es fallback e imprime los 69 como máximo. La decisión 13 de §C.1 y §D dicen "56" y "77 restantes": este documento lo enmienda a 64 filas y 69 en `FALLBACK` (sección 6 §6.3), y así lo escriben todas las secciones.

`Territorio` es la forma en que un país entra en una vuelta (sección 7): `ruta` es una lista ORDENADA de zonas con peso, que un itinerario recorre como ventana contigua. `cordillera` lo lee `itinerarioDe` en dos sitios y solo en dos: (a) `null` es un veto estructural, el país no tiene reina y su etapa decisiva es `media_alto` (Bélgica, Países Bajos, Dinamarca, Golfo, Australia: decisión D8, sección 18); (b) cuando no es `null` y la fila pide `terrain: 'mountain'`, solo valen las ventanas de la ruta que la contienen (sección 7, §7.1 paso 1). La admisibilidad de la reina en una etapa concreta NO se limita a la cordillera: es `z === cordillera || ZONAS[z].relieve ∈ {montana, alta}` (sección 7, `admiteReina`), así que España con `cordillera: 'pirineos'` también pone reinas en `cantabrico` (montaña) y Francia con `alpes` en `pirineos` y `macizo_central`. Por eso el campo es un solo `GeoZone` y no una lista: no dice "dónde caben reinas" (eso lo dice `relieve`) sino "qué zona tiene que atravesar una vuelta de montaña", y para ES, FR e IT la sección 6 elige la que el mapa 07 §2 asocia a la gran vuelta (Pirineos, Alpes, Dolomitas). `zonaDe(country)` devuelve la zona de mayor peso de la ruta y es la última red de `regionOf` (§3.5): solo los 532 nacionales pasan por ella, y `null` (el `RouteContext.country` de un banco sin país) da `generico`.

### 3.5 Regiones por carrera y por etapa (`routes/grammar/regions.ts`)

```ts
// packages/engine/src/routes/grammar/regions.ts
export interface RaceRegion {
  default: GeoZone
  stages?: Record<number, GeoZone>             // índice con base 1; solo las 60 ediciones y solo donde difiere de default
  skeleton?: SkeletonId                        // carrera de un día con meta real en un puerto o muro: único candidato si admite() (sección 6, §6.4)
  duda?: true                                  // ciudad no reconocida o dato contradictorio: se imprime, no veta
}
export const RACE_REGION: Record<string, RaceRegion>          // 310 carreras de equipos, curadas desde raceRoutes.ts
export function regionOf(raceId: string, stageIndex: number, country: string | null): GeoZone
// = RACE_REGION[raceId]?.stages?.[stageIndex] ?? RACE_REGION[raceId]?.default ?? zonaDe(country)
// Test: ninguna carrera de equipos (WT_TABLE, PRO_TABLE, CON_TABLE) cae a zonaDe(country); solo los 532 .NC pasan por ahí.
export const COBBLES_IDS: readonly string[]                  // los 20 ids con terrain 'cobbles' (race-leon incluida): test (d) de §6.8 y galería (sección 16)
```

`RaceRow` (`calendar.ts` l. 381-397) no cambia: ni `geo` ni `paisaje` entran en la fila (la sección 6 lo decide igual, contra arquitectura §5.3 e ingeniero §5.2). La propuesta ganadora añadía `geo?: GeoZone` a la fila y sorteaba la zona con `geo|${raceId}` cuando faltaba, para los 125 de 310 casos de FR, IT y ES; la síntesis retira el sorteo (decisión 14) porque una carrera no cambia de cordillera según la semilla, y saca la zona a una tabla aparte, curada a mano desde las ciudades de `raceRoutes.ts`, con dos niveles: `default` para la carrera y `stages` para las etapas de las 60 ediciones reales, donde el país es grueso de más (`race-france` e6 Pau → Gavarnie-Gèdre es `pirineos`, e15/18/19/20 son `alpes`; el resto de etapas caen a `default`). El índice de `stages` es el mismo `CalendarStage.index` con base 1 (`calendar.ts` l. 43-44) y el mismo orden de `RaceEdition.stages` (`editions.ts` l. 17-22).

Quién llama a `regionOf` y quién no, porque de eso depende que una vuelta recorra el país: las 178 carreras de un día de tabla la llaman con `stageIndex` 1; las 60 ediciones, etapa a etapa; los 532 nacionales caen por construcción al tercer eslabón. Las 72 vueltas COMPUESTAS (325 etapas) no la llaman por etapa: su zona de meta la decide `itinerarioDe` (§3.6) como ventana de `TERRITORIOS[country].ruta`, y `composeTour` construye cada `StageRequest` con `geo: ZONAS[it.metas[i]]` y `desde: it.desde[i]`; `RACE_REGION[raceId].default` de una vuelta compuesta es la zona con la que la carrera se anota en el inventario y la galería, y `regions.test.ts` exige que pertenezca a `TERRITORIOS[country].ruta`. Sin esta regla, `regionOf` devolvería `default` en todas las etapas de una vuelta y las metas del itinerario no llegarían nunca a `generateStage`, que es justo la promesa central al dueño (la reina en la cordillera).

`regionOf` es una cadena de tres `??` y nada más. `regions.test.ts` sella que para todo `id` de las tres tablas de filas de `calendar.ts` (`WT_TABLE` l. 931, `PRO_TABLE` l. 1242 y `CON_TABLE` l. 1615: las 310 carreras de equipos, WorldTour y grandes vueltas incluidos) el tercer eslabón no se alcanza; en la práctica el test itera `SEASON_CALENDAR.filter((r) => !r.championshipCountry)` y comprueba `RACE_REGION[r.id] !== undefined`, para que una tabla nueva no se quede fuera. Y en una vuelta compuesta cuyo territorio tiene `cordillera`, al menos una etapa de `stagesForSeason(id, 0)` tiene `arch.geo === cordillera` cuando `terrain === 'mountain'` (misma prueba, para que la zona de meta viaje de verdad).

### 3.6 Composición de una vuelta (`routes/grammar/tour.ts`)

```ts
// packages/engine/src/routes/grammar/tour.ts
import { ARCH } from '../../constants.js'                      // BASE_SEASON = ARCH.edicion.baseSeason (§3.8); tour.ts NO importa edition.ts
import type { EdicionCfg } from '../../constants.js'           // RouteContext.edicion (sección 15, §15.8)
import type { StageSpec, RaceFormat } from '../calendar.js'    // SOLO tipos, sentencia `import type` entera: se borra al compilar (regla de importación, cabecera de §3)

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
/** Las garantías de `mixRoles` (`calendar.ts` l. 486-517) como función pura; solo endurece y solo por la cola. `zonas` = `Itinerario.metas`:
 *  el final en alto garantizado salta los huecos cuya zona no lo admite (`media_alto`, si no `media_muro`, si no la crono; sección 7, §7.3). */
export function garantias(roles: StageRole[], terrain: RouteTerrain, n: number, zonas: GeoZone[]): StageRole[]

export interface Itinerario {
  metas: GeoZone[]                             // zona de la meta de cada etapa
  papeles: StageRole[]
  km: number[]                                 // ya con ARCH.km.porClase, maxPorClase y ROUTE.lastStageKmFactor
  desde: GeoZone[]                             // desde[0] = metas[0]; desde[i] = metas[i-1]; desde[i] !== metas[i] es transición
  notas: string[]                              // reparaciones anotadas ("e5: reina → media_alto, ventana sin cordillera"), decisión 18
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
  edicion?: EdicionCfg                         // ARCH.edicion si falta; composeTour lo copia a cada StageRequest (sección 15, §15.8); DEFAULT_ROUTE_CONTEXT no lo lleva
}
export const DEFAULT_ROUTE_CONTEXT: RouteContext = {
  country: null, raceClass: '2', format: 'una-semana', season: ARCH.edicion.baseSeason,
}

/** Lo que hoy hace `stageMix` por dentro. `raceId` es la clave de `arch|raceId`, de `itinerarioDe` y de `RACE_REGION`. */
export function composeTour(raceId: string, n: number, terrain: RouteTerrain, ctx: RouteContext): StageSpec[]
export type KmRole = StageRole | 'un_dia' | 'un_dia_u23' | 'cri_u23'   // los tres extra solo los usan buildRace y nationalChampionships
/** n = etapas de la vuelta (1 en un día y en los nacionales), lo que mixKm(role, n, last, rand) recibe hoy (calendar.ts l. 522-540). */
export function kmDe(role: KmRole, raceClass: RaceClass, n: number, last: boolean, rand: () => number): number
/** Ventana 0-based de la reina en vu_gran_vuelta: [14; 19] con n = 21 (sección 7, §7.2). */
export const ventanaReina = (n: number): [number, number] => [Math.max(ARCH.bloques.gv.descansos[0], Math.floor((2 * n) / 3)), n - 2]

// packages/engine/src/routes/calendar.ts: firma pública conservada (decisión 19); delega en composeTour
export function stageMix(n: number, terrain: RouteTerrain, seedBase: string, ctx: RouteContext = DEFAULT_ROUTE_CONTEXT): StageSpec[]
```

`StageRole` amplía el `MixRole` de hoy (`calendar.ts` l. 410-558 vía mapa 02 §4: `cri`, `reina`, `media-alto`, `media`, `llana`) con los papeles que la carretera tiene y el generador no (`llana_viento`, `media_muro`, `reina_valle`, `reina_encadenada`, `montana_corta`, `prologo`, `cronoescalada`). El papel de cada etapa es IDENTIDAD (decisión 20): lo decide `itinerarioDe` en el subflujo `arch|raceId` sin `season`, y la edición no lo mueve.

El juez del motor objetó que `Weighted<StageRole>` y `BlockRule` estaban sin definir en la ganadora; aquí lo están. `Weighted<T>` es un mapa parcial de pesos relativos (no tienen que sumar 1: se normalizan al sortear, y una clave ausente pesa 0). `BlockRule` es una reparación determinista con `id` cerrado a los seis nombres que `tour.test.ts` comprueba uno a uno (sección 7, §7.2): `aplica(n)` dice si la regla se evalúa para una vuelta de `n` etapas, y `repara` recibe los papeles ya sorteados y las zonas de meta del itinerario y devuelve los papeles corregidos, recorriendo de atrás hacia delante para que la última etapa (la que `ROUTE.lastDecisiveChance` decide) no se toque. `ultima` admite el literal `'ROUTE.lastDecisiveChance'` como centinela: significa que la última etapa se sortea con la regla que `mixRoles` ya tiene hoy (`calendar.ts` l. 457-519, garantía de última decisiva), en vez de con pesos propios; es lo que conserva `calendar.test.ts` l. 168-266 sin tocar (salvo l. 211-221, que pasa a admitir prólogo: sección 7). `pesos` está indexado por `Relieve` y no por el `MixTerrain` de hoy (`flat | hilly | mountain`, l. 410), que desaparece como modelo de composición: `ARCH.pesosComposicion` sustituye a `ROUTE.mixWeights`. `TOUR_SKELETONS` es el catálogo de cuatro entradas (datos en `tour.ts`, reexportados desde `constants.ts` por referencia, §B.3) y `tourSkeletonDe` lo consulta sin dado.

`Itinerario` lleva cinco listas, cuatro paralelas de longitud `n` (la zona de meta de cada etapa, su papel, sus km ya por clase con `kmDe`, y la zona de salida `desde`, que difiere de `metas[i]` en las etapas de transición y es la que `StageRequest.desde` recibe) y `notas`, con una frase por reparación aplicada (la degradación de la reina que la decisión 18 exige anotar, y cada `BlockRule` que cambió un papel): es lo que la galería (sección 16) y `tour.test.ts` leen para explicar por qué una vuelta belga cierra con `media_alto`.

`kmDe` admite tres papeles fuera de `StageRole` (`KmRole`, sección 7 §7.4), que solo usan `buildRace` y `nationalChampionships`: `'un_dia'` (la fila de un día; en `NC` lee la columna `ruta` de `ARCH.km.porClase.NC`), `'un_dia_u23'` (solo `NC`, columna `rutaU23`) y `'cri_u23'` (solo `NC`, columna `cronoU23`); `cri` con `NC` lee la columna `crono`. `nationalChampionships` elige entre los cuatro por `championshipCategory` (`calendar.ts` l. 70), y un papel sub-23 con otra clase, o un papel de vuelta con `NC`, lanza. Recibe `n` porque el km de hoy ya depende de él (`mixKm(role, n, last, rand)`, `calendar.ts` l. 522-540) y `kmDe` lo conserva; en un día y en los nacionales `n` es 1. `ARCH.km.porClase.NC` es `{ ruta, rutaU23, crono, cronoU23 }` en las secciones 6, 7 y 12.

`RouteContext` vive aquí y no en `generate.ts` porque es `composeTour` quien lo consume y `generateStage` no lo ve (recibe un `StageRequest` completo). Es el subconjunto de `StageRequest` que se conoce a nivel de carrera, sin `routeSource`: `composeTour` fija `routeSource: 'generado'` él mismo en cada petición, y la rama de edición de `buildRace` no pasa por `composeTour`. `country: null` (y no `''`) es el valor de un banco sin país y cae a `FALLBACK` por `zonaDe`. `raceId?` existe para que `buildRace` pase el contexto entero y para que `stageMix` pueda seguir con tres argumentos. `composeTour(raceId, n, terrain, ctx)` es lo que `stageMix` hace hoy por dentro, y `raceId` es a la vez identidad (`arch|${raceId}`) y clave de `itinerarioDe` y de `RACE_REGION`: hoy `stageMix(row.stages, row.terrain ?? 'flat', row.id)` (`calendar.ts` l. 923) pasa el id de la fila como `seedBase`, y `calendar.test.ts` l. 170 pasa `mix-test-${i}`, que no está en `RACE_REGION` ni en ningún territorio y por eso cae a `generico`. `stageMix(n, terrain, seedBase, ctx = DEFAULT_ROUTE_CONTEXT)` conserva su firma pública (`calendar.ts` l. 546) y delega con `composeTour(ctx.raceId ?? seedBase, n, terrain, ctx)` (decisión 19), para que `calendar.test.ts` l. 168-266 y `stageKind.test.ts` compilen en todos los pasos del plan. `buildRace` (la rama de vuelta generada, l. 920-924) NO usa el valor por defecto: llama a `composeTour(row.id, row.stages, row.terrain ?? 'flat', { raceId: row.id, country, raceClass: row.raceClass, format: 'una-semana', season })` con el `country` que hoy calcula en l. 889 y no pasa a nadie (sección 7, §7.5). `DEFAULT_ROUTE_CONTEXT` queda para los tests, y `calendario.test.ts` sella que ninguna etapa de `calendarForSeason(0)` con `raceClass !== 'NC'` tiene `arch.geo === 'generico'`: es la prueba de que el generador no vuelve a quedar ciego a la geografía por la puerta de atrás. Las secciones 7 y 15 (paso 1) usan exactamente esta forma y este valor por defecto.

### 3.7 Petición y salida de `generateStage` (`routes/grammar/generate.ts`)

```ts
// packages/engine/src/routes/grammar/generate.ts
import type { StageKind } from '../testTour.js'
import type { StageProfile } from '../../stage/types.js'
import type { RaceFormat } from '../calendar.js'              // solo tipo (regla de importación, cabecera de §3)
import type { EdicionCfg } from '../../constants.js'
import { stageKindOf } from '../stageKind.js'

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
  edicion?: EdicionCfg                         // ARCH.edicion si falta; solo lo rellena buildRace cuando calendarForSeason recibe otro cfg (sección 10, §10.5)
  fixed?: { skeleton?: SkeletonId; finalKind?: FinalKind; dPlus?: number }   // bancos
}

export interface GeneratedStage {
  profile: StageProfile
  kind: StageKind                              // = stageKindOf(profile, timeTrial).kind, garantizado por V6
  label: string                                // = labelDe(sk, profile, timeTrial), tras V6 (decisión 38 reescrita; §3.3; sección 11 §11.5)
  timeTrial: boolean                           // = sk.timeTrial ?? false
  arch: {
    skeleton: SkeletonId
    geo: GeoZone
    motivos: Motif[]
    finalKind: FinalKind | null
    dPlus: number                              // dPlusDe(profile), relleno incluido
    intentos: number
    degradado: boolean
    garantiasClase: number                     // cuántas reglas 1 a 4 de garantizaClase tocaron la etapa (sección 8, §8.9)
    rechazos: Veto[]                           // uno por intento fallido, en orden; [] si el primero pasó (galería, sección 16)
    frase: string                              // "Circuito de 14 km × 9 vueltas con un muro de 1,1 km al 11 %; meta a 2 km del muro"
    metadatos: { viento: 0|1|2|3; altitud: GeoSignature['altitud'] }   // ficha, no física
  }
  routeSource: 'edicion' | 'generado'
}

export function generateStage(req: StageRequest): GeneratedStage

/** Las cinco etiquetas de la decisión 38, que `stageKindOf` no puede deducir de un perfil (sección 11, §11.5 regla 3). */
export const ETIQUETAS_DE_ESQUELETO: ReadonlySet<string>   // 'Circuit', 'Wall finish', 'Prologue', 'Hill climb', 'Mountains classic'
export function labelDe(sk: Skeleton, profile: StageProfile, timeTrial: boolean): string
// = ETIQUETAS_DE_ESQUELETO.has(sk.label) ? sk.label : stageKindOf(profile, timeTrial).label
```

`StageRequest` es todo lo que el generador sabe de la etapa, y es la lista de lo que hoy no le llega: el generador actual recibe `km` y `seed` (`flatSegments(km, seed)` y hermanos, `profileGen.ts` l. 236-514) y ni siquiera el país que `buildRace` calcula en l. 889 (mapa 02 §1, diagnóstico de la sección 1). Por qué cada campo:

- `km` es un CONTRATO cuando `routeSource` es `edicion`. El contrato de hoy está en `calendar.test.ts` l. 140-152 ("las carreras con recorrido REAL no pasan por la mezcla: sus km son los de la edición"): `expect(Math.round(km)).toBe(edition.stages[i]!.km)`, es decir, al KILÓMETRO ENTERO redondeado (el `km` de `editions.ts` l. 15 es entero). El diseño lo endurece a 0,1 como decisión propia, no como cita: `normalizeEnlaces` cuadra Σ km al 0,1 (V10), así que una etapa `edicion` sale con Σ km igual al `km` de la fila con esa resolución, y `calendario.test.ts` lo afirma ("Σ km de una etapa `edicion` = `editions.ts` al 0,1"), lo que deja el test viejo verde por inclusión. Por eso `ARCH.edicion.kmJitter` no se aplica a esas etapas (decisión 20). El esqueleto (§B.2) citaba "`calendar.test.ts` l. 162-174" y "al 0,1" como si fuera el contrato de hoy: l. 162-174 son el `it('cubre los tres niveles…')` y la cabecera del `describe` de `stageMix`; el contrato de hoy es l. 140-152 con `Math.round`, que es lo que cita la sección 1.
- `terrain` es el `RouteTerrain` de la fila (`featureProfile.ts` l. 21: `flat | hilly | mountain | cobbles | classic | itt`) y entra como sesgo de pesos, nunca como orden: un `terrain: 'mountain'` en `flandes` no produce una reina, produce `media_alto` anotado.
- `geo` es la firma ya resuelta y no la clave, para que `generateStage` sea pura y un banco pueda pasarle una firma sintética. Quién la resuelve depende de la rama de `buildRace` (§3.5): un día y edición, `ZONAS[regionOf(raceId, stageIndex, country)]`; vuelta compuesta, `ZONAS[it.metas[i - 1]]` con `desde = it.desde[i - 1]` cuando difiere de la meta, construidas por `composeTour`.
- `desde` solo va en etapas de transición de una vuelta (sección 7) y da la ondulación del primer 40 % (`ARCH.itinerario.transicion`).
- `editionKey` es la respuesta al defecto del mapa 02 §7: hoy dos carreras con la misma salida, meta y km dibujan lo mismo porque la semilla de edición es `${from}|${to}|${km}` sin `raceId`. La semilla nueva es `raceId|e{i}|{editionKey}` (decisión 22), separada de la de identidad.
- `fixed` es para los bancos (sección 13): `fixed.skeleton` fuerza el esqueleto (galería y `stageKind.test.ts` por esqueleto), `fixed.finalKind` y `fixed.dPlus` acotan lo que `calendarQueens` estratifica. En el calendario nunca va.

`GeneratedStage.kind` no es un campo que el generador rellene a su criterio: es el resultado de `stageKindOf(profile, timeTrial)` (`stageKind.ts` l. 71, con la etiqueta `Summit finish` decidida por `SUMMIT_RUN_IN_KM` 5, decisión 23) y V6 lo garantiza. `label` es `labelDe(sk, profile, timeTrial)` después de V6 (§3.3), y `timeTrial` sale del esqueleto y nunca del perfil. `garantiasClase` es el `reglas` que devuelve `garantizaClase` (§3.9) y `routeCensus` lo copia tal cual en `RouteStats.garantiasClase`. `arch` es lo que la ficha enseña y el banco mide, y `frase` es la única descripción textual (decisión 39, D10). `rechazos` es la lista de `Veto` que `verify` devolvió en los intentos fallidos (sección 8, `salida(...)` la rellena): cuesta cero porque `verify` ya lo produce, y es lo que la galería enseña en "Intentos y rechazos" (sección 16, §16.4). `metadatos` lleva `viento` y `altitud` de la firma para el texto de la ficha, que dice llano abierto y nunca promete abanicos (decisión 17).

### 3.8 Temporada e identidad (`routes/grammar/edition.ts` y `routes/calendar.ts`)

```ts
// packages/engine/src/constants.ts (bloque ARCH, sección 12; constants.ts no importa nada)
//   ARCH.edicion.baseSeason = 0            // calendarRun.ts l. 135: season = floor(gameDay / SEASON_DAYS); el primer día de un mundo es la temporada 0
//   ARCH.arranque.maxTemporadasEnMemoria = 8   // tope del memo de calendarForSeason (sección 14, §14.5)
/** Tipo ANCHO a propósito (activa: boolean): un test o el banco pasan `{ ...ARCH.edicion, activa: false }` sin mutar ARCH (sección 12). */
export interface EdicionCfg { readonly baseSeason: 0; activa: boolean; nivel: 0 | 1 | 2; kmJitter: number; vueltasJitter: number; motivoNuevo: number }   // la de sección 12 §12.1, única

// packages/engine/src/routes/grammar/edition.ts   (NO importa valores de calendar.ts)
export const BASE_SEASON = ARCH.edicion.baseSeason   // 0; reexportado aquí porque es el nombre que el resto del documento usa
export interface EditionPlan {
  km: number                                   // al 0,1, ya con jitter y acotado; = req.km si routeSource === 'edicion'; derivado en circuitos de firma
  n: Record<number, number>                    // cardinalidad por índice de hueco no firma
  vueltas?: number                             // circuito de firma, tras vueltasJitter
  opcion: number                               // = opcionDe(sk, req.raceId, season): 0 canonico, k la alternativa k − 1
  dPlusObjetivo: number                        // metros, TOTAL con relleno (sección 8, §8.4)
}
/** Pura, sin dados: nivel efectivo 2 ? (hashInt(`alt|${raceId}`) + season) % (1 + sk.alternativas.length) : 0 (sección 10, §10.3).
 *  nivelEfectivo = cfg.nivel === 0 ? 0 : (sk.alternativas ? 2 : cfg.nivel). */
export function opcionDe(sk: Skeleton, raceId: string, season: number, cfg: EdicionCfg = ARCH.edicion): number
/** Lee req.edicion ?? ARCH.edicion y tira en semillaDe('ed', req). Único nombre de la función (`editionOf` era alias de banco). */
export function planDeEdicion(sk: Skeleton, firma: readonly Motif[], req: StageRequest): EditionPlan

export type Subflujo = 'arch' | 'firma' | 'ed' | 'mot' | 'pos' | 'dib'
/** `${raceId}|${stageIndex}` en lo generado (stageIndex 1 en un día); `${raceId}|e${stageIndex}|${editionKey}` en edición real. */
export function claveEtapa(req: Pick<StageRequest, 'raceId' | 'stageIndex' | 'routeSource' | 'editionKey'>): string
/** req.season, o BASE_SEASON en ed/mot/pos con nivel 0 o en edición real, y en todo con activa false (tabla de §8.1). */
export function seasonDe(req: StageRequest, sub: 'ed' | 'mot' | 'pos' | 'dib'): number
/** TODA semilla de generateStage sale de aquí (sección 8, §8.1 la llama en vez de concatenar). */
export function semillaDe(sub: Subflujo, req: StageRequest, x: { slot?: number; j?: number; token?: string; intento?: number } = {}): string
// Subflujos (lista CERRADA; tabla completa en la sección 10, §10.4; `id` = claveEtapa(req), `season` = seasonDe(req, sub)):
//   `arch|${raceId}`                          composición de la vuelta (itinerarioDe), una corriente por carrera
//   `firma|${raceId}|km`                      km base de una carrera de un día (kmDe en buildRace; sección 7, §7.4)
//   `arch|${id}`, `firma|${id}`               identidad de la etapa: esqueleto y parámetros de firma (sin season)
//   `ed|${id}|${season}`                      plan de edición de ESA etapa (una corriente por etapa, no por carrera)
//   `mot|${id}|${season}|${slot}|${j}|i${intento}`, `pos|${id}|${season}|i${intento}`
//   `dib|${id}|${season}|${token}|i${intento}`  token = `${slot}`, `e${k}` (k-ésimo enlace) o `${slot}|hijo${h}`

/** Lo que diffMotivos compara de una etapa: el km viaja aparte porque no es un campo de Motif (sección 10, §10.8). */
export interface DiffInput {
  km: number                                   // Σ segment.km del perfil
  motivos: readonly Motif[]                    // arch.motivos
  opcion?: string                              // Alternativa.nombre de la opción de nivel 2; undefined en la canónica
}
export function diffMotivos(prev: DiffInput, actual: DiffInput): string[]   // [] en 'edicion' siempre

// packages/engine/src/routes/calendar.ts   (importa todos los grammar/*.ts; ningún fuente de grammar/ le importa un valor)
export function calendarForSeason(season: number, cfg: EdicionCfg = ARCH.edicion): CalendarRace[]
// memoizada: Map<EdicionCfg, Map<number, CalendarRace[]>> por REFERENCIA de cfg; el mapa de ARCH.edicion tiene tope
// ARCH.arranque.maxTemporadasEnMemoria (8) sin contar BASE_SEASON, expulsión por último acceso (LRU), y la 0 nunca se expulsa (§14.5)
export function raceForSeason(raceId: string, season: number, cfg?: EdicionCfg): CalendarRace   // lanza Error('carrera desconocida') si no existe
export function stagesForSeason(raceId: string, season: number, cfg?: EdicionCfg): CalendarStage[]   // = raceForSeason(raceId, season, cfg).stages
export const SEASON_CALENDAR: CalendarRace[] = calendarForSeason(BASE_SEASON)   // el MISMO array memoizado de la temporada 0, no una copia
```

`BASE_SEASON` vale 0 porque es lo que el mundo calcula: `calendarRun.ts` l. 135 hace `season = Math.floor(gameDay / SEASON_DAYS)`, y el primer día de un mundo es la temporada 0. La propuesta de banco proponía `calendarFor(1)` y la de geografía dejaba la pregunta abierta; la síntesis cierra que `SEASON_CALENDAR = calendarForSeason(BASE_SEASON)` y que la temporada 0 tira sus propios dados con `ed|${id}|0` como cualquier otra (decisión 21), corrigiendo la objeción del juez de ejecutabilidad a la mediana de cardinalidades.

Dónde vive cada cosa, y por qué no donde §B.1 lo ponía. §B.1 sitúa `calendarForSeason`, `raceForSeason` y `stagesForSeason` en `edition.ts` y `BASE_SEASON` allí también, con `calendar.ts` haciendo `SEASON_CALENDAR = calendarForSeason(BASE_SEASON)` y `generate.ts` importando `BASE_SEASON` de `edition.ts`. Eso dibuja un ciclo con evaluación en la carga: `calendar.ts` importa `edition.ts`; `edition.ts` necesita las tablas y `buildRace` de `calendar.ts` para construir un `CalendarRace[]`; y `SEASON_CALENDAR` se evalúa al cargar el módulo (`calendar.ts` l. 3643 en `8585ca2`, l. 3657 en HEAD). Si un test importa primero `grammar/edition.ts` (`edition.test.ts` lo hará), ESM evalúa `calendar.ts` antes de terminar `edition.ts`, la llamada de nivel superior `calendarForSeason(BASE_SEASON)` toca el `Map` memo y `BASE_SEASON` de `edition.ts` en zona muerta temporal, y el proceso arranca con `ReferenceError`. La dirección se fija así: el valor 0 es una constante de intención (`ARCH.edicion.baseSeason`) en `constants.ts`, que no importa nada (comprobado: `constants.ts` no tiene una sola línea `import`), y `edition.ts` y `tour.ts` lo leen de ahí; las tres funciones de temporada, su memo y `SEASON_CALENDAR` viven en `calendar.ts`, que es quien tiene las tablas y `buildRace(row, season)`; `edition.ts` se queda con lo que es suyo (el plan de edición, las semillas y `diffMotivos`) y no importa ningún valor de `calendar.ts`. Los `grammar/*.ts` que necesitan un TIPO de `calendar.ts` (`tour.ts`: `StageSpec` y `RaceFormat`; `generate.ts`: `RaceFormat`) lo traen con la sentencia `import type` entera, que `verbatimModuleSyntax` borra al compilar: no carga el módulo y no puede cerrar el ciclo. Las secciones 10, 13, 14 y 15 sitúan las tres funciones y el memo en `calendar.ts`, y el tope del memo es la constante `ARCH.arranque.maxTemporadasEnMemoria` 8 con expulsión por último acceso (secciones 10 §10.5, 12, 14 §14.5 y 17); no hay un literal `MAX_TEMPORADAS_EN_MEMORIA` en `edition.ts`.

El sello es un `it` de `routes/arranque.test.ts` además de los tres de la sección 14 (§14.4), escrito en el paso 1 junto con los tipos de `grammar/`, que distingue sentencias y no líneas: un `grep` por líneas no ve las importaciones de varias líneas (`import {` con los nombres debajo y `} from '../calendar.js'` al final), que en `packages/engine/src` son 53 hoy. Lee cada fuente con el analizador de TypeScript (`typescript` es dependencia de desarrollo de la raíz, `package.json` l. 36) y falla si alguna sentencia de nivel superior importa o reexporta `'../calendar.js'` sin ser `import type` o `export type` enteras; después importa cada fuente de `grammar/` el primero, con el registro de módulos vacío, y exige que cargue:

```ts
// packages/engine/src/routes/arranque.test.ts (el it de importaciones; los otros tres son los de §14.4)
import ts from 'typescript'                    // CJS con default: el paquete es ESM ("type": "module") y esModuleInterop está activo
// y `vi` se añade al `import { describe, expect, it } from 'vitest'` de §14.4

const FUENTES_GRAMMAR = readdirSync(join(import.meta.dirname, 'grammar')).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))

function importaValorDeCalendar(fichero: string, src: string): boolean {
  return ts.createSourceFile(fichero, src, ts.ScriptTarget.Latest).statements.some((st) => {
    if (!ts.isImportDeclaration(st) && !ts.isExportDeclaration(st)) return false
    if (!st.moduleSpecifier || !ts.isStringLiteral(st.moduleSpecifier) || st.moduleSpecifier.text !== '../calendar.js') return false
    const soloTipo = ts.isImportDeclaration(st) ? st.importClause?.isTypeOnly === true : st.isTypeOnly
    return !soloTipo                          // `import '../calendar.js'`, `import { type X }` y `export * from` cuentan como valor
  })
}

it('ningún fuente de grammar/ importa un valor de calendar.ts, y cada uno carga el primero', async () => {
  for (const f of FUENTES_GRAMMAR) {
    expect(importaValorDeCalendar(f, readFileSync(join(import.meta.dirname, 'grammar', f), 'utf8')), f).toBe(false)
  }
  for (const f of FUENTES_GRAMMAR) {
    vi.resetModules()                          // registro vacío: `f` es de verdad el primer módulo que se evalúa
    await expect(import(`./grammar/${f.replace(/\.ts$/, '.js')}`), f).resolves.toBeDefined()
  }
})
```

Los `*.test.ts` de `grammar/` quedan fuera de las dos comprobaciones (el filtro de `FUENTES_GRAMMAR`) porque importan `calendarForSeason`, `SEASON_CALENDAR` o `RACE_ROWS` con valor y no pueden cerrar un ciclo: nadie los importa. La segunda mitad cubre lo que el análisis no ve, un ciclo transitivo a través de otro módulo de `routes/`; hoy el único fichero de `routes/` que importa `calendar.js` es `schedule.ts`, y solo con `import type` (l. 5). El `it` nace en el paso 1 y no espera al paso 8: es en el paso 1 cuando `tour.ts` y `generate.ts` escriben por primera vez su `import type` de `calendar.js` (sección 15, paso 1, "los TIPOS de la sección 3").

Los subflujos son una lista cerrada porque el principio 7 (puro y determinista con subflujos nominales) solo se cumple si añadir una tirada en un sitio no desplaza las demás: es el defecto de `profileGen.ts` l. 316-317 que el diagnóstico mide. Los subflujos sin `season` (`arch`, `firma`) son la identidad; los cuatro con `season` (`ed`, `mot`, `pos`, `dib`) son la edición; el sufijo `i{intento}` solo existe en `mot`, `pos` y `dib` (sección 8). La clave de etapa separa la composición de la vuelta (`arch|${raceId}`, que consume `itinerarioDe` de una vez) de la elección de esqueleto de cada etapa (`arch|${id}`): sin ella, una tirada más en la composición movería el esqueleto de todas las etapas. `ed` es una corriente POR ETAPA (`ed|${id}|${season}`) y no una por carrera consumida en orden de etapa, que es lo que este bloque decía antes: con una por carrera, añadir un hueco al esqueleto de la etapa 1 movería las cardinalidades de todas las siguientes (sección 10, §10.4). El km base de un día va en `firma|${raceId}|km` y no en `firma|${raceId}` porque `routeRng` da la misma secuencia a la misma cadena, y el km quedaría correlacionado con la primera tirada de la firma (sección 7, §7.4). Un día usa `stageIndex` 1 (`arch|${raceId}|1`, no `arch|raceId` a secas), como escriben las secciones 5 (§5.7), 8 y 10. Las tres funciones de temporada se memoizan (sección 14) y son la ÚNICA puerta por la que `calendarRun.ts`, `callups.ts` y `raceContext.ts` leen una etapa no congelada (decisión 23); `stagesForSeason(id, 0)` devuelve por referencia las etapas del propio `SEASON_CALENDAR` (sección 10 lo exige con `toBe`).

### 3.9 Vetos y la geometría que leen (`veto.ts`, `geometry.ts`, `place.ts`, `render.ts`, `stageKind.ts`)

```ts
// packages/engine/src/routes/grammar/veto.ts
export type VetoId = 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6' | 'V7' | 'V8' | 'V9' | 'V10'
  | 'V11' | 'V12' | 'V13' | 'V14' | 'V15' | 'V16'
export interface Veto { id: VetoId; detalle: string }
/** MetaKind → FinalKind que V7 exige cuando `sk.finalKind` no está declarado: repecho, muro_meta, alto_corto, alto_largo → 'alto';
 *  cima_cerca → 'cima_cerca'; descenso_meta → 'valle_corto'; valle → 'valle_largo'; esprint, sector_meta → null (sin comprobación). */
export function finalKindDe(meta: MetaKind): FinalKind | null
/** kmObjetivo = km de la INSTANCIA (EditionPlan.km): difiere de req.km hasta ± 6 % en 'generado'; V10 compara contra él (sección 9, §9.1).
 *  colocados = los Placed rendidos (los de `colocar`, o `colocarPlantilla(plantilla)` para una plantilla literal): V10(a) cuenta el enlace sobre ellos. */
export function verify(profile: StageProfile, sk: Skeleton, req: StageRequest, motivos: Motif[], kmObjetivo: number, colocados: Placed[]): Veto | null
// Solo lee routes/ (stageKindOf, finalKindOf, climbSize, dPlusDe) y geometría del esqueleto. NUNCA sampleProfile,
// finishType ni costBase (regla del juez del motor, riesgo 3): eso se mide en routeCensus.
/** Cada veto por etapa, exportado y puro, para el test "uno que dispara y uno que no" (sección 9). */
export type VetoFn = (profile: StageProfile, sk: Skeleton, req: StageRequest, motivos: Motif[], kmObjetivo: number, colocados: Placed[]) => Veto | null
export const V1: VetoFn
// … V2 a V10 y V15 con el mismo tipo (solo V10 lee kmObjetivo y colocados)
export const V11: (rows: RouteStats[]) => Veto | null
export const V12: (rows: RouteStats[], maxCorrelacion: number) => Veto | null
export const V13: (roles: StageRole[], km: number[], raceClass: RaceClass, tour: TourSkeletonId) => Veto | null
export const V14: (roles: StageRole[], n: number) => Veto | null
export const V16: (rows: RouteStats[]) => Veto | null
export function conjuntoV16(r: RouteStats): readonly FinishType[] | null   // la tabla de V16 (sección 9, §9.2); null = la fila no entra
// RouteStats es un `import type` de '../../sim/routeCensus.js' y FinishType de '../../stage/finish.js': se borran al compilar, y veto.ts no importa ningún valor de sim/ ni de stage/

// packages/engine/src/routes/grammar/geometry.ts   (geometría de routes/: tramos, nunca bloques)
export function dPlusDe(profile: StageProfile): number                       // Σ g·km·10 de los tramos con g > 0 (decisión 9)
export function kmSubidaShare(profile: StageProfile): number                 // km de segmentos `puerto` / km total
export function climbKmOutsideLast30(profile: StageProfile, kmToGo = ARCH.reina.subidaLejanaKm): number   // sección 9
export function subidaLejanaShare(profile: StageProfile): number             // climbKmOutsideLast30 / Σ climbSize(puerto).km; 0 sin puertos
export function profileCorrelation(a: StageProfile, b: StageProfile): number // Pearson sobre g por km, eje normalizado desde meta (V12)
export function describeProfile(profile: StageProfile): Motif[]              // perfil de hoy → Motif[] con las seis reglas y el cuerpo de la sección 13 (§13.5); solo frozenSkeletons
export function ultimaCota(profile: StageProfile): Segment | null          // el `puerto` cuyo final está a ≤ 0,5 km de finalKind.ts::lastClimbKm (el último si hay dos); sin pancartas, el último `puerto` ≥ CLIMB_MIN_KM; cuerpo en §13.3
export function huellaDe(profile: StageProfile): number[]                    // g medio por km entero, índice 0 = último km; la leen profileCorrelation y edition.test.ts (sección 10, §10.9)
export function rachasDeSubida(profile: StageProfile): { km: number; g: number; finKmAMeta: number }[]   // V9(b), sección 9 §9.2

// packages/engine/src/routes/grammar/place.ts
export interface Placed { motif: Motif; slot: number | 'meta'; inicioKm: number; finKm: number; bajada?: Motif }
export function colocar(motivos: readonly Instancia[], km: number, sk: Skeleton, req: StageRequest, rand: () => number): Placed[] | null
export function colocarPlantilla(plantilla: readonly Motif[]): Placed[]      // acumulación sin dados de una plantilla literal (canónica §8.11, §15.6, §13.5, fixtures §9.8)
export function kmNoEnlace(p: Placed): number                              // lo que no es enlace: kmDif de colocar (§8.6 punto 2) y V10(a) (sección 9, §9.2)

// packages/engine/src/routes/grammar/render.ts
export function renderSkeleton(colocados: Placed[], km: number, geo: GeoSignature, rng: RngFactory, desde?: GeoSignature): Segment[]
export function normalizeEnlaces(segs: Segment[], km: number, colocados: Placed[]): Segment[] | null
export function garantizaClase(segs: Segment[], sk: Skeleton, colocados: Placed[]): { segs: Segment[]; reglas: number } | null   // reglas → arch.garantiasClase
export function emitirPancartas(segs: Segment[], colocados: Placed[]): Banner[]

// packages/engine/src/routes/stageKind.ts   (paso 0: se añade `export` sin tocar cuerpos, sección 15 §15.2; paso 8: lo de la sección 11, §11.5 regla 2)
export const WALL_MAX_KM = 3; export const PASS_MIN_KM = 8.5; export const QUEEN_MIN_CLIMB_METRES = 3200   // hoy const sin export, l. 60-64
export function climbMetres(segment: Segment): number                        // l. 27-33
export function climbSize(segment: Segment): { km: number; g: number }       // l. 36-42
export const SUMMIT_RUN_IN_KM = 5                                            // paso 8: sale de apps/api/src/stageHistory.ts (decisión 23)
export function runInAfterLastClimb(segments: readonly Segment[]): number    // paso 8: cuerpo de stageHistory.ts l. 76-88 movido sin cambios; Infinity sin puertos
// paso 8, dentro de stageKindOf: el booleano de l. 84 se parte en `meteEnAlto` (decide la rama clasica, como hoy) y
// `cimaCerca = runInAfterLastClimb(segments) <= SUMMIT_RUN_IN_KM` (decide SOLO la etiqueta); `kind` no cambia de regla (decisión 26)
```

`verify` devuelve el primer veto que falla, con `detalle` para el test y la galería, o `null`. La firma recibe lo que un veto puede necesitar (el perfil rendido, el esqueleto elegido, la petición, los motivos instanciados, el km de la instancia y los `Placed` rendidos) y nada del motor: la regla de vetos puros (decisión 4) es que `verify` importe solo de `routes/` y de `grammar/geometry.ts`, y lo comprueba el tercer `it` de `routes/arranque.test.ts` (§14.4) sobre todo `grammar/`, más la aserción de `veto.test.ts` de que `veto.ts` no importa valores de `sim/` (sección 2, principio 8). El quinto parámetro, `kmObjetivo`, es el km de la instancia y no el de la petición: en lo generado `planDeEdicion` lo mueve hasta un ± 6 % y `normalizeEnlaces` cuadra contra él, así que un V10 contra `req.km` dispararía en casi toda etapa y agotaría los intentos (sección 9, §9.1). El sexto, `colocados`, es lo que permite medir V10(a) (enlace ≥ 12 %): en el perfil un enlace, una `tendida`, una separación y un valle son todos `llano`, y ni los enlaces ni las bajadas canónicas están en `motivos` en el camino sorteado; todo el que verifica una plantilla literal pasa `colocarPlantilla(plantilla)`. La consecuencia es la que el juez del motor pidió: recalibrar `STAGE.finish*` o `physics.ts` no redibuja ningún perfil. De los dieciséis, V1 a V10 y V15 se evalúan por etapa y disparan reintento; V11 a V14 y V16 son de calendario o de vuelta y se miden en `routeCensus` y `tour.test.ts` (tabla completa en la sección 9). V7 se evalúa contra `sk.finalKind` si está declarado y contra `finalKindDe(sk.meta)` si no (§3.3); `finalKindDe` vive en `veto.ts` porque es una regla de veto, no del catálogo.

El resto del bloque son los nombres que las secciones 8, 9, 10, 11 y 13 introducen y que §B.1 no listaba: `geometry.ts` gana `climbKmOutsideLast30` y `subidaLejanaShare` (V8b, sección 9), `huellaDe` (sección 10) y las tres funciones que §B.1 nombraba sin firma; `garantizaClase` devuelve también `reglas` (sección 8, §8.9); `renderSkeleton` recibe la fábrica `rng` de §3.2 (construida sobre `dib|…`) y la firma de `desde` para el 40 % de transición; `stageKind.ts` exporta sus tres umbrales y `climbSize`/`climbMetres` (que `verify`, `routeCensus` y el test de coherencia de `ARCH` en `motifs.test.ts` necesitan) sin tocar un cuerpo (decisión 26), y en el paso 8 recibe `runInAfterLastClimb` de `stageHistory.ts`, que lo importa de `@cyclingstar/engine` (sección 11). Las secciones 8, 9 y 11 copian estas firmas tal cual.

### 3.10 El censo (`sim/routeCensus.ts`) y los bancos que lo rodean

```ts
// packages/engine/src/sim/routeCensus.ts
export interface RouteStats {
  raceId: string; stageIndex: number; raceClass: RaceClass; format: RaceFormat; country: string | null   // CalendarRace.country es opcional (calendar.ts l. 898)
  zona: GeoZone | null; skeleton: SkeletonId | null; routeSource: RouteSource
  kind: StageKind; label: string; finalKind: FinalKind | null
  meta: MetaKind | null                        // arch.motivos.at(-1)?.meta ?? null: la meta INSTANCIADA (una alternativa de nivel 2 puede cambiarla); null en las `real`. V16
  cotaFinalKm: number | null                   // arch.motivos.at(-1)?.cotaFinal?.km ?? null; decide muro/puncheur en muro_meta y alto en cima_cerca (V16, sección 9 §9.2)
  finishType: FinishType                       // finishType(deriveFinishTerrain(sampleProfile(profile)), 50): aquí sí
  km: number; dPlus: number; dPlusBloques: number   // dPlusDe (total con relleno) y calendarQueens::desnivelDe (puertos solos): la diferencia es el relleno
  nPuertos: number; nMuros: number; longestClimbKm: number
  lastClimbKm: number | null; lastClimbG: number | null   // climbSize(ultimaCota(profile)).km y .g: LONGITUD y pendiente, no la posición de finalKind.ts::lastClimbKm (§13.3)
  kmAfterLastClimb: number | null              // finalKind.ts::kmAfterLastClimb tal cual
  climbKmOutsideLast30: number; kmSubidaShare: number; breakAppealEstimado: number
  pavesKm: number; nSectores: number; estrellas5: number
  nPancartas: number                           // profile.banners?.length ?? 0 (sección 8, §8.10; banda informativa ≤ 6 en un día generado)
  maxG: number; huella: number[]               // g por km
  intentos: number; degradado: boolean
  garantiasClase: number                       // 0 a 4: = arch.garantiasClase (sección 8, §8.9); 0 en las `real`
  firmaMotivos: string | null                  // MotifKind de arch.motivos (hijos aplanados, sin enlace ni meta), sin repetir, ordenados, unidos por '+'; null en las `real`
}
type NumericKey = { [K in keyof RouteStats]: RouteStats[K] extends number ? K : never }[keyof RouteStats]
type CatKey = 'kind' | 'finalKind' | 'meta' | 'finishType' | 'skeleton' | 'zona' | 'routeSource' | 'firmaMotivos'

export interface Cuantiles { n: number; min: number; p10: number; p50: number; p90: number; p95: number; max: number; media: number }   // índice floor(n · p)
export interface Summary {
  n: number
  num: Partial<Record<NumericKey, Cuantiles>>                   // solo las columnas numéricas (el tipo lo impide en el resto)
  cat: Partial<Record<CatKey, Record<string, number>>>         // fracción [0; 1] por valor
}
export function routeCensus(calendar: CalendarRace[] = SEASON_CALENDAR): RouteStats[]
export function aggregate(rows: RouteStats[], by: (r: RouteStats) => string): Record<string, Summary>
export function entropiaBits(reparto: Record<string, number>): number      // Shannon en bits sobre fracciones
export function correlacion(a: number[], b: number[]): number              // Pearson sobre `huella`, remuestreada a la más corta
export function raceDePrueba(profile: StageProfile, kind: StageKind = 'reina'): CalendarRace   // una etapa, sin arch; no escribe routeSource hasta el paso 8 (routeSourceDe la lee 'generado'); cuerpo en §13.3
export function routeSourceDe(race: CalendarRace, stage: CalendarStage): RouteSource   // stage.routeSource si existe; si no, la regla de inventario-recorridos.mjs::provenance (l. 50-55); cuerpo en §13.3

export interface CensusTarget {
  id: string
  label: string
  poblacion: (r: RouteStats) => boolean       // subconjunto sobre el que se mide
  medida: (rows: RouteStats[]) => number
  min?: number; max?: number
  hoy: number | null                          // columna "hoy (medido)" del paso 0; null si la población no existía
  fuente: string                              // mapa, propuesta o juicio de donde sale la banda
  estado: 'sellada' | 'informativa'           // informativa = se imprime, no afirma
  nMin: number                                // población mínima para afirmar; por debajo se imprime "n insuficiente"
}
export const ROUTE_CENSUS_TARGETS: readonly CensusTarget[]   // la sección 13 rellena los valores
export const CENSUS_N_MIN = 10

// packages/engine/src/sim/frozenSkeletons.ts   (decisión 33; sección 13, §13.5)
export interface FrozenQueen {
  raceId: string; stageIndex: number          // la entrada de REAL_QUEENS a la que sustituye
  skeleton: Skeleton                          // literal: `id` de los 32, `canonico` propio, sin `alternativas`
  motivos: Motif[]                            // la instancia fija (posiciones incluidas: colocación ya hecha)
  km: number                                  // 232, 200, 166
  geo: GeoZone                                // `andes` las tres
  role: StageRole; raceClass: RaceClass; format: RaceFormat   // lo que `verify` necesita en el StageRequest
  seedDibujo: string                          // `frozen|race-colombia|5`: solo alimenta `dib`
  huellaFNV: number                           // del perfil rendido; se re-sella con causa si `renderSkeleton` cambia
  why: string                                 // empieza por "CONGELADA POR FORMA (E1, decisión 33; sustituir por dato real en E12): …"
}
export const FROZEN_QUEENS: readonly FrozenQueen[]   // exactamente 3
export function frozenProfile(q: FrozenQueen): StageProfile
export function frozenRequest(q: FrozenQueen): StageRequest
// = { raceId, stageIndex, season: BASE_SEASON, km, role, terrain: 'mountain', geo: frozenGeo(q), raceClass, format,
//     routeSource: 'edicion', fixed: { skeleton: q.skeleton.id } }   ('edicion': las tres tienen fila en RACE_EDITIONS)
export function frozenGeo(q: FrozenQueen): GeoSignature   // { ...ZONAS[q.geo], amplitud: ARCH.motivo.enlace.ampMax }: relleno a 2,4 (sección 13, §13.5, regla 6)
export const GENERATED_QUEENS: readonly { raceId: string; stageIndex: number; skeleton: SkeletonId; finalKind: FinalKind }[]   // 3, sin banda

// Bancos que ganan un último parámetro opcional `calendar: CalendarRace[] = SEASON_CALENDAR` (sección 13, §13.6 punto 3), sin cambio de conducta:
//   sim/calendarQueens.ts analyzeCalendarQueens(runs, calendar?); sim/realQueens.ts findStage(raceId, i, calendar?) (pasa a exportarse);
//   las funciones de sim/smallTours.ts y sim/timeTrials.ts que leen SEASON_CALENDAR

// packages/engine/src/sim/saturation.ts
export function hardestOneDay(calendar: CalendarRace[] = SEASON_CALENDAR, n = 8): CalendarRace[]   // extraída de invariantsClasicas.test.ts l. 119-132

// packages/engine/src/sim/preRegistro.ts   (sección 13, §13.6 punto 2)
export const PRE_REGISTRO: readonly { banda: string; direccion: 'sube' | 'baja' | 'igual' | 'igual_ruido'; porQue: string; previsto?: [number, number] }[]
export const BANDAS_SOBRE_GENERADO: readonly string[]   // las 20 claves LITERALES de TARGETS que leen perfiles generados; cada una con fila en PRE_REGISTRO

// packages/engine/src/sim/pareado.ts   script `pnpm sim:pareado [semillas=12]`: cada banco con SEASON_CALENDAR y con legacyCalendar(),
//   tabla banda | viejo | nuevo | Δ mediana | previsto | cumple. No exporta nada.

// packages/engine/src/sim/legacy/profileGenLegacy.ts   UN fichero, del paso 8 al final del paso 9 (decisión 29; sección 13 §13.6 punto 3)
//   los ocho xxxSegments, normalize y garantizaPuerto movidos de profileGen.ts, más copias de oneDaySpec, del stageMix viejo
//   (mixRoles, mixKm) y de la rama vieja de buildRace:
export function legacyCalendar(): CalendarRace[]   // el calendario de antes del paso 8; sim/legacy/golden.test.ts exige sus 1.418 huellas (§3.12)
```

`RouteStats` es una fila por etapa del calendario que el juego corre (1.418 hoy), y es el único sitio del diseño donde se llama a `sampleProfile`, `deriveFinishTerrain` y `finishType` (con `groupSize` 50, `finish.ts` l. 142): por eso `zona` y `skeleton` admiten `null` (las 177 etapas `real` no tienen esqueleto) y por eso lleva `dPlus` y `dPlusBloques` a la vez, para imprimir las dos: `dPlusDe` es el total por tramos, relleno incluido, y `calendarQueens::desnivelDe` solo suma bloques `subida`, que `blockTerrain` (`sample.ts` l. 32-44) solo da a segmentos `puerto`; su diferencia es el relleno, no un error (decisión 9; sección 8 §8.5; sección 13 §13.3). `country` admite `null` porque `CalendarRace.country?` es opcional (`calendar.ts` l. 898 solo lo copia si existe) y el censo no inventa un país. `huella` es la pendiente media por km y alimenta la correlación de V12. `garantiasClase` cuenta cuántas de las reglas 1 a 4 de `garantizaClase` tocaron la etapa (es el `reglas` de §8.9, que viaja en `arch.garantiasClase`; no se llama `garantias` para no chocar con `garantias(roles, terrain, n, zonas)` de `tour.ts`), y la banda de la sección 13 es "etapas con `garantiasClase > 0` < 2 %", porque una red que trabaja mucho es un rango mal puesto. `nPancartas` es `profile.banners?.length ?? 0` y alimenta la banda informativa "≤ 6 en toda etapa generada de un día" de la sección 8 (§8.10), que es la que dice si `ARCH.pancarta.cimaMinKm` tiene que subir.

`Summary` es lo que `aggregate` devuelve por grupo (`by` suele ser `r => r.skeleton ?? 'real'` o `r => r.raceClass`), con la forma que la sección 13 (dueña del censo) escribe: `num` para los cuantiles de las columnas numéricas y `cat` para el reparto de las categóricas; `NumericKey` existe para que el tipo no admita cuantiles de `huella` ni de `kind`. Cada banda de `ROUTE_CENSUS_TARGETS` es un `CensusTarget` con población, medida, banda, la columna "hoy (medido)" del paso 0 y su dirección pre-registrada (decisión 30, `PRE_REGISTRO`); la sección 13 rellena los valores y ninguna nace en rojo. Coste medido: 0,57 s sobre las 1.418 etapas (juez del motor §1). Dónde corre: las bandas se afirman en `routes/grammar/calendario.test.ts` (bajo `routes/`, así que entra en `test:rapido`), y `sim/routeCensus.test.ts` prueba el censo sobre perfiles literales con `test:bancos`, porque `test:rapido` excluye `packages/engine/src/sim/**` (`package.json` l. 20; secciones 13 y 15); es lo que la decisión 31 quiere decir con "`routeCensus` en `test:rapido`". `Cuantiles` lleva `p95` porque `ARCH.veto.intentosP95` es un p95 y con un tipo que solo tuviera p90 no se podría afirmar, y `firmaMotivos` es la columna categórica con la que la sección 13 mide la variedad de motivos (para `nc_ruta`: `circuito+muro` en `flandes`, `circuito+cota` en `andes`); las dos son de la sección 13 y este bloque las copia. `RouteStats.country` sigue siendo `string | null` aunque la sección 13 escriba `string`, por la razón de arriba.

El generador viejo vive durante el paso 9 en UN fichero, `sim/legacy/profileGenLegacy.ts`, con `legacyCalendar()`, como escriben las secciones 13 (§13.6 punto 3) y 15; no hay un segundo fichero `sim/legacy/calendarLegacy.ts`. Para construirlo sin copiar 2.700 líneas de tablas, `calendar.ts` exporta en el paso 8 lo que hoy es privado (§3.11). Todo `sim/legacy/` se borra en el mismo cambio que cierra "vN §2" (decisión 29).

### 3.11 Lo que ganan `StageSpec`, `CalendarStage`, `CalendarRace` y `race_routes`

```ts
// packages/engine/src/routes/calendar.ts (hoy l. 33-46); los dos campos nuevos entran OPCIONALES en el PASO 7 y `routeSource` es obligatorio desde el PASO 8 (sección 15, §15.8)
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

// Exportaciones nuevas de calendar.ts, sin cambio de conducta (hoy son `const` o `function` privadas):
export const RACE_ROWS: readonly RaceRow[]   // = [...WT_TABLE, ...PRO_TABLE, ...CON_TABLE]; paso 4, para skeletons.test.ts (sección 5, §5.9)
export const RACE_TABLES: { WT_TABLE: RaceRow[]; PRO_TABLE: RaceRow[]; CON_TABLE: RaceRow[] }   // paso 8, para legacyCalendar (sección 13, §13.6)
export const RACE_COUNTRY: Record<string, string>   // paso 8, ídem (hoy l. 580 en HEAD)
export function auto(segments: Segment[]): StageProfile   // paso 8, ídem (hoy l. 107 en HEAD)
// y, paso 8, ídem: featureSpec, stagesFrom, doy, enrollmentFor, ncHash, NATIONALS_ROAD_DAY y NATIONALS_ROAD_OVERRIDE. NO se exportan para el legado
// NATIONAL_CHAMPIONSHIPS ni editionGrandTour: tras el renombre del paso 8 son los de la gramática, y profileGenLegacy.ts copia los viejos (sección 15, §15.10).
// RaceRow (l. 395 en el árbol vivo) se exporta en el paso 4 con RACE_ROWS
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
export async function getRaceRoute(db: Conn, worldId: string, raceKey: string, stageDay: number): Promise<StageProfile | null>   // sin cambios
export async function raceStagesForWorld(db: Conn, worldId: string, raceKey: string, raceId: string, season: number): Promise<FrozenStage[]>
// filas congeladas ordenadas por stage_day; si no hay ninguna, stagesForSeason(raceId, season) proyectado a FrozenStage;
// una fila con kind/label/time_trial a null (anterior a la migración) se completa desde stagesForSeason(raceId, season)[stageDay − 1]
export async function backfillRaceRoutes(db: Conn, worldId: string, raceKeys: readonly string[]): Promise<number>
// saca season de raceKey con seasonOfRaceKey y llama a freezeRaceRoute con ella
/** La temporada del sufijo `:s{n}` del raceKey (`${id}:s${season}`, calendarRun.ts l. 783); 0 si no lo lleva (sección 11, §11.4). */
export function seasonOfRaceKey(raceKey: string): number
/** JSON con claves ordenadas: el jsonb no conserva el orden. Se mueve aquí desde recorridoDelMundo.test.ts l. 28-34, que pasa a importarla. */
export function canonico(x: unknown): string
export const huellaCanonica: (p: StageProfile) => number   // = hashInt(canonico(p.segments))
/** Una vez por mundo, tras el backfill: reescribe SOLO route_source ('real' si la huella canónica coincide con la etapa real del calendario,
 *  'edicion' si la carrera está en RACE_EDITIONS, si no 'generado') y devuelve la cuenta por valor (sección 11, §11.4). */
export async function reclassifyRouteSource(db: Conn, worldId: string): Promise<Record<RouteSource, number>>

// packages/db/src/schema.ts, tabla raceRoutes (l. 512-524): columnas nuevas, todas nullable para las filas ya congeladas
//   kind: text('kind')   label: text('label')   timeTrial: boolean('time_trial')   arch: jsonb('arch').$type<GeneratedStage['arch']>()
// La migración la genera `pnpm --filter @cyclingstar/db db:generate --name race_routes_kind` (drizzle-kit generate, packages/db/package.json l. 21)
//   a partir de schema.ts: packages/db/drizzle/00NN_race_routes_kind.sql + drizzle/meta/00NN_snapshot.json + la entrada en drizzle/meta/_journal.json,
//   con NN el siguiente número libre al abrir el paso 10 (hoy 0041: ya existe 0040_ordenes_del_paso_17a.sql; los mapas leyeron 8585ca2, donde la última era 0039).
//   Nunca un .sql escrito a mano: sin snapshot ni journal, `db:migrate` (drizzle-kit migrate, l. 22) no lo aplica.

// apps/api/src/routes/calendar.ts: campos que gana cada etapa de `planFrom` (l. 91-105) (sección 10, §10.8)
interface StageCardRoute {
  routeSource: 'real' | 'edicion' | 'generado'
  edicion: number                              // season + 1: el primer año de un mundo es "Edición 1"
  arch: { frase: string; skeleton: SkeletonId; geo: GeoZone } | null   // null en 'real'
  cambiosRespectoAnterior: string[]            // diffMotivos(prev, actual); [] en 'real', en 'edicion', en season === BASE_SEASON y si nada cambió
}
// la ficha lee `frozen.arch ?? stagesForSeason(raceId, season)[i - 1].arch`, y `prev` = stagesForSeason(raceId, season - 1)[i - 1]
// packages/shared/src/contracts.ts: el esquema zod de etapa (l. 379-382 `label`/`timeTrial`; l. 1042-1043 `stageKindSchema`; l. 1067-1068; l. 1362-1364)
//   gana los cuatro campos de StageCardRoute con la misma forma; `skeleton` y `geo` se tipan z.string() (shared no importa engine)
// apps/api/src/stageHistory.ts l. 27: `StageSpecHead` gana `routeSource: RouteSource`
```

`routeSource` por etapa toma tres valores porque hay tres ramas en `buildRace` (sección 11): rasgos reales en `STAGE_FEATURES` dan `real`; una etapa de `RACE_EDITIONS` sin rasgos (ciudades y km reales, relieve generado) da `edicion`; tabla y nacionales dan `generado`. Hoy `freezeRaceRoute` escribe `'generado'` a ciegas (`db/raceRoutes.ts` l. 48-51, con el comentario que lo reconoce) y el tipo de l. 29 es binario; pasa a copiar `stage.routeSource`. La columna `route_source` es `text` (`schema.ts` l. 523), así que el tercer valor no necesita migración; `kind`, `label`, `time_trial` y `arch` sí (columnas nuevas, en `schema.ts` y de ahí a `packages/db/drizzle/00NN_race_routes_kind.sql` por `db:generate`, con el procedimiento de arriba, que las secciones 0, 10, 11 y 15 escriben igual; el directorio `packages/db/migrations/` no existe). `freezeRaceRoute` gana `season` porque el recorrido que se congela es el de `stagesForSeason(raceId, season)` y no el de `SEASON_CALENDAR` (decisión 23), con el `season` de la `raceKey` (`calendarRun.ts` l. 783: `${race.id}:s${season}`).

`arch` SÍ se congela, en la misma migración y en la misma fila, como `jsonb` nullable. El borrador de esta sección decía que no, apoyado en que `stagesForSeason(raceId, season)` es determinista y memoizada y podría recomponerlo; es determinista para un código dado, no entre versiones, y `race_routes` existe precisamente para eso (`schema.ts` l. 505-511: "cambiar el generador cambia las carreras FUTURAS"). El propio diseño prevé cambiar los datos que `stagesForSeason` lee: cada respuesta negativa del dueño a la galería se corrige editando `ZONAS`, `RACE_REGION` o `ARCH.pesoPorClase` (§2.10, sección 16), y cualquier `ENGINE_VERSION` posterior toca `ARCH` o el catálogo. Tras una de esas ediciones, una ficha que recompusiera `arch` enseñaría la frase de arquitectura y los `cambiosRespectoAnterior` de un recorrido distinto del `profile` congelado que el jugador corrió, y `race_routes.kind`/`label` congelados podrían contradecir `arch.skeleton`: la deriva retroactiva que la tabla impide, y la obligación 9 a medias. El coste es una columna y una línea en `freezeRaceRoute` (`arch: stage.arch ?? null`); `race_routes.profile` sigue siendo exactamente el `StageProfile` que el motor recibe (comentario de `schema.ts` l. 509), y `arch` viaja al lado sin partirse en tablas. La ficha lee `frozen.arch ?? stagesForSeason(raceId, season)[i - 1].arch`: la segunda rama solo para etapas aún no congeladas (una carrera futura que la web enseña antes de crearse). Las secciones 10 (`FrozenStage`, `raceStagesForWorld`) y 11 y el paso 10 del plan lo recogen así. Lo que la API y la web tipan con zod en `contracts.ts` y lo que `stageHistory.ts::StageSpecHead` compone son coste de implementación reconocido aquí y en el paso 10: sin tocarlos, `routeSource`, `arch.frase` y `edicion` no llegan a la pantalla.

`routeSource` y `arch` entran en `StageSpec` como OPCIONALES en el paso 7, porque `composeTour` ya los devuelve (y `CalendarRace.routeSource` también, opcional), y `routeSource` pasa a obligatorio en el paso 8, cuando `buildRace` los pone en sus tres ramas (sección 15, §15.8): hacerlo obligatorio antes rompería la compilación de todo lo que construye un `StageSpec` a mano sin que el paso lo cableara. Lo que hay que retipar en el paso 8, medido con grep (`StageSpec` o `CalendarStage` construidos): los ocho constructores de `calendar.ts` l. 108-172 en `8585ca2` (l. 122-186 en HEAD: `flat`, `hilly`, `hillyUphill`, `mountain`, `mountainOneDay`, `itt`, `cobbles`, `classic`), `featureSpec` (l. 196; l. 210 en HEAD), `base()` de los nacionales y `stagesFrom` (l. 174; l. 188 en HEAD), que en ese paso se retiran o pasan a llamar a `generateStage`; las fixtures de `calendar.test.ts`; y `apps/api/src/stageHistory.test.ts::fichaDe` (l. 106-114), que devuelve `{ index, kind, label, name, profile }` tipado `CalendarStage` y gana `routeSource: 'generado'`. Ningún otro fichero del monorepo construye el tipo (`testTour.ts`, `autoOrders.ts`, `tactics.ts`, `cli.ts`, `learning.test.ts` e `invariants.test.ts` llevan un `kind` propio en tipos suyos, no un `StageSpec`). `routeSource` es obligatorio y no opcional para que el compilador sea el test: `calendario.test.ts` no necesita comprobar que ninguna etapa lo tiene indefinido. Si el paso 8 activa el modo perezoso de la sección 14 (`profile`, `arch` y `label` como propiedades de acceso), el tipo no cambia: un getter cumple la interfaz.

El agregado por carrera sigue la regla de I-40 traducida, con un solo enunciado que la prosa, `raceRouteSourceOf` y el test comparten: `real` si todas sus etapas son `real`; `generado` si todas son `generado`; `mixto` en cualquier otro caso, INCLUIDA la carrera cuyas etapas son todas `edicion` (ciudades y distancia reales, relieve generado, que no es ni `real` ni `generado`). No es un caso teórico: medido sobre `editions.ts` y `stageFeatures.ts` en HEAD, 39 de las 60 entradas de `RACE_EDITIONS` no tienen ninguna fila en `STAGE_FEATURES` (`race-portugal`, `race-alentejo`, `race-arabia`, `race-asturias`, `race-belgium`, `race-benelux`, `race-bretagne`, `race-britain`…), así que 39 carreras del calendario son `mixto` por esta vía; el borrador anterior las llamaba `mixto` en la prosa y `generado` en el test. `raceRouteSourceOf` se escribe sobre el conjunto de valores y no contando `real` (una versión anterior de la sección 11, `reales === 0 → 'generado'`, devolvía `generado` a esas 39; la sección 11 §11.1 escribe ya esta misma función y cuenta 41 carreras con alguna etapa `real` más las 39 `mixto` de toda `edicion`):

```ts
export function raceRouteSourceOf(stages: readonly { routeSource: RouteSource }[]): RaceRouteSource {
  const set = new Set(stages.map((s) => s.routeSource))
  if (set.size === 1 && set.has('real')) return 'real'
  if (set.size === 1 && set.has('generado')) return 'generado'
  return 'mixto'
}
```

Es un valor de carrera, nunca de etapa: por eso `RouteSource` de etapa no lo incluye, la marca de la interfaz sigue siendo por etapa (los tres textos de la decisión 39) y el texto de carrera `mixto` lo escribe la sección 11; `scripts/inventario-recorridos.mjs` y la sección 16 aplican `raceRouteSourceOf`. `RaceRow` (l. 381-397) no cambia: ni `geo` ni `paisaje` entran en la fila, porque la zona vive en `RACE_REGION` (§3.5) y el km de las 142 carreras de un día sin `km` explícito lo sortea `kmDe` con `firma|raceId` (decisión 36).

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

### 3.12 Sellos, código legado y ficheros de test nuevos

Lo que las secciones 11, 13 y 15 introducen fuera de `grammar/` y del censo, con la forma de lo que exporta. Son ficheros de vida corta o de sello, pero tienen tipos que otros ficheros importan, y un implementador que no los viera aquí tendría que deducirlos de un test.

```ts
// packages/engine/src/routes/profileGen.ts   (paso 1: se exportan sin tocar cuerpos, salvo `climb` y `rolling`; sección 15 §15.3 y sección 8 §8.7)
export function hashInt(s: string): number                                   // hoy l. 15, privada: FNV-1a de una cadena
export function routeRng(seed: string): () => number                         // l. 30, ya exportada; se conserva (decisión 11)
export function between(rand: () => number, min: number, max: number): number   // hoy l. 47, privada
export function split(rand: () => number, total: number, n: number): number[]   // hoy l. 52, privada
export function climb(rand: () => number, len: number, avg: number, opts: { gMin?: number; gMax?: number } = {}): Segment   // hoy l. 72; gMin/gMax por defecto −Infinity/Infinity; recorte tras el suelo 1 de l. 78 y antes del redondeo a 0,1, sin tiradas nuevas (cuerpo en §8.7)
export function descent(rand: () => number, len: number, avg: number): Segment  // hoy l. 85, privada
export function rolling(rand: () => number, km: number, amp: number, pRompepiernas = 0): Segment[]   // hoy l. 100 `(rand, km, bumpy = false)`
/** Huella de perfil que sella lo real y lo congelado: FNV-1a de JSON.stringify(profile.segments), sin reordenar claves (sección 11, §11.3). */
export function huellaFNV(profile: StageProfile): number

// packages/engine/src/routes/golden.sealed.ts   (paso 1 → paso 8; literal generado por script y pegado, nunca .json)
export const GOLDEN: Record<string, number>   // 1.418 entradas `${raceId}:${index}` → hashInt(JSON.stringify(stage.profile)), perfil entero con pancartas
// En el paso 8 se mueve con `git mv` a sim/legacy/golden.sealed.ts, junto a sim/legacy/golden.test.ts, y se borra con sim/legacy/ en el paso 9.

// packages/engine/src/routes/realFingerprint.sealed.ts   (paso 1; sobrevive para siempre; sección 11 §11.3)
export interface Sellada { km: number; nSegmentos: number; huella: number }   // km al 0,1; huella = huellaFNV(profile)
export const SELLADAS: Record<string, Sellada>   // exactamente 177 claves `${raceId}:${index}`, las etapas con rasgos de STAGE_FEATURES
export interface EtapaSellada { kind: StageKind; label: string; timeTrial: boolean; km: number; huella: number | null }   // null: etapa `edicion`
export const GRANDES_VUELTAS: Record<'race-france' | 'race-italy' | 'race-spain', { restAfter: number[]; etapas: EtapaSellada[] }>   // 21 etapas cada una

// packages/engine/src/routes/grammar/legacy.ts   (paso 1 → paso 8; sección 15 §15.3)
export type LegacyId = 'lg_flat' | 'lg_hilly' | 'lg_hilly_uphill' | 'lg_mountain' | 'lg_mountain_classic' | 'lg_classic' | 'lg_cobbles' | 'lg_itt'
export type LegacySkeleton = Omit<Skeleton, 'id'> & { id: LegacyId }   // NO es un Skeleton: no entra en SKELETONS, candidatos ni la galería
export const LEGACY: Record<LegacyId, LegacySkeleton>   // rangos de hoy (mapa 01 §8); lg_itt es lg_flat, como ittSegments === flatSegments
/** La secuencia COMPLETA del generador viejo para (id, km, seed): dificultades, bajadas y enlaces con su km, en su orden fijo,
 *  con la cardinalidad por umbral de km de hoy. Pura. */
export function legacyMotivos(id: LegacyId, km: number, seed: string): Motif[]
/** Pone los motivos uno detrás de otro en el orden de legacyMotivos (inicioKm = Σ km anteriores), sin ventanas ni tirada `pos`;
 *  `slot` = índice en esa lista, 'meta' el último. Es lo que la tabla pareada del paso 4 pasa a renderSkeleton. */
export function colocarLegado(motivos: readonly Motif[]): Placed[]
```

Cuatro decisiones que las secciones dejaban abiertas. `huellaFNV` vive en `profileGen.ts`, junto a `hashInt`, y no en `realFingerprint.test.ts` como exportación de un test (sección 11, §11.3): `edition.test.ts` y `frozenSkeletons.test.ts` también la usan, y importar un fichero de test registraría sus `describe` en el fichero que lo importa. Es la misma función que `FrozenQueen.huellaFNV` guarda y que la sección 13 llama `fnv(profile)`. `GOLDEN` no es la misma huella: cifra el perfil ENTERO (pancartas incluidas) porque su trabajo es demostrar que el paso 1 no mueve nada, y la de lo real cifra solo `segments`, que es lo que §11.3 fija (las pancartas de una etapa real salen de los mismos rasgos por `bannersFromFeatures`, `featureProfile.ts` l. 299, así que no añaden información que sellar). `LegacySkeleton` deja fuera `id: SkeletonId` a propósito, para que el compilador impida que un esqueleto legado se cuele en el catálogo; por eso la tabla pareada no llama a `colocar`, que decide las bajadas por el `id` del esqueleto (§8.6 punto 1), sino a `colocarLegado`, que no decide nada porque `legacyMotivos` ya trae las bajadas y los enlaces del generador viejo. Y `EtapaSellada.label` se sella porque §11.3 punto 2 lo lista en la estructura, y el test escrito en §11.3 lo compara junto a `kind`, `timeTrial` y `km`.

Los ficheros de test nuevos, con el paso en que nacen (sección 15) y la sección que escribe sus aserciones:

| Fichero | Nace | Muere | Aserciones en |
| --- | --- | --- | --- |
| `routes/grammar/calendario.test.ts` | 0 (con `it.todo`) | no | 13 (§13.8) y §3.11 |
| `sim/routeCensus.test.ts` | 0 | no | 13 |
| `routes/golden.test.ts` | 1 | 8 (sus huellas pasan a `sim/legacy/golden.test.ts`) | 15 (§15.3) |
| `routes/realFingerprint.test.ts` | 1 | no | 11 (§11.3) |
| `routes/profileGen.test.ts` | 1 (`rolling` y `climb` con sus firmas nuevas) | no | 8 (§8.14) |
| `routes/arranque.test.ts` | 1, con el `it` de importaciones de §3.8; el 5 añade el de `stage/` y el 8 los de coste (§14.4) | no | 3, 14 |
| `routes/grammar/legacy.test.ts` | 1; gana la tabla pareada en el 4 | 8, con `legacy.ts` | 15 (§15.3 y §15.6) |
| `routes/grammar/geo.test.ts`, `routes/grammar/regions.test.ts` | 2 | no | 6 (§6.8), 15 (§15.4) |
| `routes/grammar/motifs.test.ts` | 3 | no | 4, 15 (§15.5) |
| `routes/grammar/skeletons.test.ts`, `place.test.ts`, `render.test.ts`, `geometry.test.ts` | 4 | no | 5 (§5.9), 8, 15 (§15.6) |
| `routes/grammar/veto.test.ts`, `generate.test.ts`, `sim/stageKind.completo.test.ts` | 5 | no | 9, 8, 15 (§15.7) |
| `routes/grammar/tour.test.ts` | 7 | no | 7, 15 (§15.8) |
| `routes/grammar/edition.test.ts` | 6 | no | 10 (§10.9) |
| `sim/legacy/golden.test.ts` | 8 | 9, con `sim/legacy/` | 15 (§15.10): `legacyCalendar()` reproduce `GOLDEN` |
| `sim/frozenSkeletons.test.ts`, `sim/preRegistro.test.ts` | 9 | no | 13 (§13.5 y §13.6) |

`routes/arranque.test.ts` nace en el paso 1 y no en el 5, porque el `import type` de `calendar.js` que su primer `it` vigila aparece en el paso 1; §15.7 (paso 5) le añade el tercer `it` y §15.10 (paso 8) los de coste.

No existe `routes/grammar/index.ts` (sección 15, §15.1): la lista pública del motor es `packages/engine/src/index.ts`, que gana sus líneas en los pasos 8 y 10, y quien necesita un símbolo de la gramática lo importa de su fichero (los scripts, del `dist` por ruta profunda).

### 3.13 Nota al pie: cómo leer las propuestas con estos nombres

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
| `frozenSkeletons` | "perfiles literales" | "cerrar por brief" | `frozenQueens` | `frozenSkeletons` | `frozenQueens` |
| `dPlusDe` | `desnivelDe` | `desnivelDe` | `climbMetres` | `desnivelDe` | `dPlus` |
| V8 (reina de verdad, dos cláusulas) | V8 | V6 + V8 | V2 | V2 + §9.2 | V2 |
| V5 (caso v40) | V5 | V1 | V1 | V1 | V1 |

Regla de numeración de vetos: los V del documento son los de arquitectura §9 con dos cambios: V7 se parte en V7 (`finalKindOf` por etapa, con reintento) y V16 (`finishType` medido en `routeCensus`, sin reintento); y V8 gana la cláusula (b) de banco (subida fuera de los últimos 30 km). La lista completa está en la sección 9 (decisión 24 de la síntesis). Dos matices que la tabla no puede decir: el `mixto` de datos era un valor de etapa y aquí es solo agregado de carrera (`RaceRouteSource`, §3.11), y `RouteContext` de ingeniero era la petición entera mientras aquí es el contexto de carrera que `composeTour` recibe (§3.6).
