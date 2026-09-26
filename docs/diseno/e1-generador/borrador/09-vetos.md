## 9. Los vetos y la plausibilidad

Un veto es un predicado puro con nombre que dice "esto no existe" o "esto no es lo que declara". Hay dieciséis (decisión 24) y viven en `packages/engine/src/routes/grammar/veto.ts` como `V1` a `V16`, con un punto de entrada `verify` que devuelve el primero que salta o `null`. Se dividen en tres capas según dónde se comprueban: once por etapa con reintento (V1 a V10 y V15: si saltan, `generateStage` repite desde la instanciación con `i{intento}` en `mot`, `pos` y `dib`, sección 8), tres de calendario medidos en `routeCensus` (V11, V12, V16: no reintentan, porque un fallo suyo es un defecto de rangos y se corrige en `ARCH`, no en una etapa) y dos de vuelta (V13, V14: se reparan en `composeTour` y se sellan en `tour.test.ts`, sección 7). La regla que ordena la capa es la del juez del motor (`juicios/motor.md` §5, riesgo 3): **un veto que se comprueba por intento solo puede leer `routes/`** (`stageKindOf`, `finalKindOf`, `climbSize`, `lastClimbKm`, `kmAfterLastClimb`, `dPlusDe` y la geometría del esqueleto), nunca `sampleProfile`, `deriveFinishTerrain`, `finishType` ni `costBase`. La razón es de acoplamiento: si `verify` llamara a `finishType` por intento, una recalibración de `STAGE.finish*` (`constants.ts` l. 3970-4017) o de `physics.ts` redibujaría perfiles generados sin que `routes/` cambiara, que es exactamente el acoplamiento inverso que el repositorio ya sufrió al revés (el perfil manda sobre el motor, mapa 03 §9). Lo que el motor lee del final se mide igual, pero en la capa de calendario (V16), donde un rojo mueve rangos y no dados.

### 9.1 La firma de `verify` y lo que puede leer

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
} // "V5: (a) última cota 6,1 km > 4,2 (ud_montana, macizo_central)"

/** Por etapa, con reintento. Orden de coste creciente: V10, V15, V6, V7, V1..V4, V5, V8, V9.
 *  `kmObjetivo` es el km de la INSTANCIA (`ed.km`, sección 8 §8.4): en `generado` difiere de `req.km` hasta un ± 6 %
 *  (`ARCH.edicion.kmJitter`); en `edicion` es `req.km`. `colocados` son los `Placed` que se rindieron: los que devuelve
 *  `colocar` en el camino sorteado y `colocarPlantilla(plantilla)` en la canónica, las alternativas, las congeladas y los
 *  tests. Solo V10 lee `kmObjetivo` y `colocados`. */
export function verify(
  profile: StageProfile,
  sk: Skeleton,
  req: StageRequest,
  motivos: Motif[],
  kmObjetivo: number,
  colocados: Placed[],
): Veto | null

/** Cada veto por etapa es también exportable y puro, para el test literal "uno que dispara y uno que no". */
export type VetoFn = (
  profile: StageProfile,
  sk: Skeleton,
  req: StageRequest,
  motivos: Motif[],
  kmObjetivo: number,
  colocados: Placed[],
) => Veto | null
export const V1: VetoFn // … V2 a V10 y V15 con el mismo tipo
export const V11: (rows: RouteStats[]) => Veto | null
export const V12: (rows: RouteStats[], maxCorrelacion: number) => Veto | null
export const V13: (
  roles: StageRole[],
  km: number[],
  raceClass: RaceClass,
  tour: TourSkeletonId,
) => Veto | null
export const V14: (roles: StageRole[], n: number) => Veto | null
export const V16: (rows: RouteStats[]) => Veto | null
export function conjuntoV16(r: RouteStats): readonly FinishType[] | null // la tabla de V16 de §9.2; null = la fila no entra

// packages/engine/src/routes/grammar/place.ts
export function kmNoEnlace(p: Placed): number // lo que no es enlace: kmDif de colocar (§8.6) y V10(a) (§9.2)
/** Colocación por acumulación de una plantilla literal, sin dados: la regla de `canonica` (§8.11) y de `renderPlantilla`
 *  (§15.6) escrita una sola vez. `enlace` y `expuesto` suman su km y no se colocan (son huecos); un `descenso` se cuelga
 *  como `bajada` del `Placed` anterior; todo lo demás da un `Placed` con `slot: 'meta'` o el índice corrido de dificultad. */
export function colocarPlantilla(plantilla: readonly Motif[]): Placed[]

// packages/engine/src/routes/grammar/geometry.ts
/** Rachas de subida de V9 (§9.2): km, media ponderada por km y distancia de su final a la meta. */
export function rachasDeSubida(
  profile: StageProfile,
): { km: number; g: number; finKmAMeta: number }[]
```

El quinto parámetro no estaba en §B.2 del esqueleto (`verify(profile, sk, req, motivos)`) y hace falta por una razón concreta: la sección 8 (§8.4, paso 1) fija en `generado` `km = round1(req.km × U(0,94; 1,06))`, y `colocar` y `normalizeEnlaces` cuadran los enlaces a ese `ed.km` (las llamadas a `colocar` y a `normalizeEnlaces` del pseudocódigo de §8.1), no a `req.km`; un V10 que comparara con `req.km` dispararía en casi toda etapa generada y agotaría los ocho intentos contra `fallbackMaxShare.calendario` 0. El sexto, `colocados`, tampoco estaba, y se decide añadirlo porque V10(a) no se puede medir sin él: sobre un `StageProfile` un enlace, una `tendida`, una separación de cadena, la aproximación de un `muro_meta` y el llano de un valle son todos segmentos `llano`, y los enlaces no están en `motivos` en el camino sorteado (son los huecos que `renderSkeleton` rinde entre `Placed`, §8.7), ni tampoco las bajadas canónicas (las calcula `colocar` y viajan en `Placed.bajada`, §8.6 punto 1). Con `colocados` la cuenta es exacta y es la misma de `colocar` (§8.6 punto 2), en los dos caminos: el sorteado pasa lo que devolvió `colocar`, y todo el que verifica una plantilla literal (la canónica degradada de §8.11, `skeletons.test.ts` de §5.9, `frozenSkeletons.test.ts` de §13.5 y los fixtures de §9.8) pasa `colocarPlantilla(plantilla)`, que es la acumulación que §8.11 y §15.6 ya describían en prosa, ahora exportada de `place.ts` para que nadie la reescriba. La llamada de §8.1 es `verify(profile, sk, req, motivos.map((m) => m.motif), ed.km, colocados)` y la sección 3 (§3.9) escribe la firma con los seis parámetros.

`timeTrial` no viaja en la firma porque se deduce del esqueleto: `sk.kind === 'cri'` (los cuatro esqueletos `et_crono`, `et_prologo`, `et_cronoescalada` y `nc_crono`). `verify` corre DESPUÉS de `normalizeEnlaces`, `garantizaClase` y `emitirPancartas` (sección 8), de modo que `lastClimbKm` (`finalKind.ts` l. 46-57) lee pancartas y no segmentos: como `emitirPancartas` pone `cima` en el último `puerto` de la etapa aunque mida menos de 1,5 km (decisión 25), un muro de meta de 0,8 km es "última cota" para V5 y V7, que es lo que hoy falla en 12 de 1.500 clásicas (mapa 01 §9, borde 3). Dos funciones de `stageKind.ts` que `verify` necesita no están exportadas hoy: `climbMetres` (l. 27-33) y `climbSize` (l. 36-42). El paso 0 del plan (sección 15, §15.2) añade `export` a las dos sin tocar su cuerpo (es la única modificación de `stageKind.ts` además de `SUMMIT_RUN_IN_KM`, decisión 23; las cinco etiquetas nuevas de la decisión 38, `Circuit`, `Wall finish`, `Prologue`, `Hill climb` y `Mountains classic`, NO salen de `stageKindOf`, que hoy solo devuelve ocho etiquetas fijas en l. 72-97 y no puede deducir un circuito del perfil: las pone `generateStage` desde `Skeleton.label` después de que V6 haya igualado el `kind`, sección 5 y §11.5, así que `stageKindOf` no gana reglas de etiqueta), para que el veto mida la cota exactamente como la mide el clasificador: suma de los `tramos` con `g > 0`, no `segment.km`. Ese es el borde de 8,5 km del mapa 01 §5.1 (`garantizaPuerto` fijaba `segment.km` y `climbSize` leía tramos, 3 de 1.500 cruzadas): con la guarda `segment.km === Σ tramos` de `garantizaClase` (decisión 10) y con V6 midiendo con la misma función, el borde desaparece por construcción y además se comprueba.

Las constantes que leen los vetos y que no estaban en la tabla de §B.3 del esqueleto se agrupan en `ARCH.veto` (la sección 12 las incorpora a la tabla con estas cuatro columnas):

| Constante                  | Valor                                                                                   | Intención                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Apoyo                               |
| -------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `ARCH.veto.segmentoMinKm`  | 0,5                                                                                     | ningún segmento por debajo salvo dos excepciones escritas en V10(b): el muro de UNA rampa de [0,4; 0,5) (`ARCH.motivo.muro.km[0]` 0,4; Paterberg, Pagnuelo, sección 4 §4.2 y §4.7) y el sector de [0,3; 0,5) (`ARCH.motivo.sector.km[0]` 0,3; el de Roubaix a 1,1 km de meta, la meta de `ud_adoquin`). Fuera de ellas es el suelo que `split` impone a cada trozo (`profileGen.ts` l. 52-65, `Math.max(0.5, …)` en l. 58) y el umbral con que `rolling` descarta huecos (l. 101, `if (km <= 0.5) return []`, vía arquitectura §4.5). El test de hoy (`calendar.test.ts` l. 92-108, "cada etapa tiene un perfil con segmentos de km positivos") solo exige `seg.km > 0` (l. 98) y pancartas dentro del recorrido (l. 100-105): el 0,5 es una exigencia nueva de V10 que `calendario.test.ts` (sección 13) sella sobre el calendario                                                                                                                                                                                                                             | mapa 06 §2.2                        |
| `ARCH.veto.kmTolerancia`   | 0,05                                                                                    | `Σ km` igual al km objetivo al 0,1. Es una exigencia del diseño, más fina que el contrato de hoy: `calendar.test.ts` l. 140-152 ("las carreras con recorrido REAL no pasan por la mezcla") afirma `Math.round(km) === edition.stages[i].km` (l. 148-149), o sea al ENTERO; el 0,1 lo sella `calendario.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | ingeniero §4.5                      |
| `ARCH.veto.pendientes`     | { gMax: 20, gMin: −14, subidaGMin: 1 }                                                  | salidas del ruido de `climb`: `Math.max(1, …)` en `profileGen.ts` l. 78 ya lo garantiza por abajo; por arriba `gMax` 16 de `muro` deja margen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | mapa 01 §2.4                        |
| `ARCH.veto.puertoLargoKm`  | 15                                                                                      | un `puerto` de 15 km o más solo existe con `altitud ∈ {media, alta, altiplano}`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | mapa 07 §4.4 regla 5                |
| `ARCH.veto.puertoDplusMax` | { mar: 500, colina: 800, media: 1.300, alta: 2.100, altiplano: 1.500 }                  | techo de desnivel de UN puerto, integrado por tramos: 1.ª es [700; 1.100] m y HC > 1.100 (mapa 07 §4.2); Alpe d'Huez 13,8 × 8,1 = 1.118, Loze 28,1 × 6 = 1.686, Sierra Nevada 19,3 × 7,9 = 1.525 (mapa 07 §4.3). Una intersección de rangos acota `km` y `g` por separado y nunca su producto (con `ARCH.motivo.puerto` [9; 25] × [5; 9] el máximo es 25 × 9 × 10 = 2.250 > 2.100, y en `colina` 9 × 9 × 10 = 810 > 800), así que el techo lo hace cumplir la instanciación (8.5): tras sortear `km` en `[km[0]; min(km[1], techo / (g[0] · 10))]`, `g` se sortea en `[g[0]; min(g[1], techo / (km · 10))]`; los dos rangos son no vacíos si y solo si `km[0] · g[0] · 10 ≤ techo`, y `geo.test.ts` (sección 6) lo sella para las 19 zonas con `puerto !== null` (de las 31 filas de `ZONAS`, sección 6 §6.2) contra `puertoDplusMax[altitud]` (`centroeuropa` y `asia_oriental`, `colina`: 9 × 5 × 10 = 450 y 9 × 6 × 10 = 540 ≤ 800; `macizo_central`, `media`: 540 ≤ 1.300). Si un `params.kmRango` de hueco rompe el sello, el hueco degrada a `cota` (8.5) | mapa 07 §3 consecuencia 3           |
| `ARCH.veto.llana`          | { dPlusMax: 1.800, cotaKm: 2,5, cotaG: 5, ventanaKm: 15, rachaGMin: 3, rellanoKm: 0,5 } | V9: una llana de 2.500 m es media (mapa 07 §4.4 regla 10); hoy el relleno solo ya da de 661 a 1.413 m (mapa 01 §1). `rachaGMin`, `rellanoKm` y `ventanaKm` son la racha de `deriveFinishTerrain` escrita sobre tramos: un tramo sube si `g ≥ 3` (`finishClimbMinGradient`, `constants.ts` l. 3977; `finish.ts` l. 110), un rellano de hasta 5 bloques de 0,1 km no corta la racha (`finishClimbGapBlocks` l. 3980 × `dx` l. 1584; `finish.ts` l. 116) y la cota se busca en los últimos 15 km (`finishClimbSearchKm` l. 3974). `grammar/veto.test.ts` sella las tres igualdades con `STAGE`, como `subidaLejanaKm` con `climbRaceKmToGo`                                                                                                                                                                                                                                                                                                                                                                                                                        | mapa 07 §4.4; `finish.ts` l. 94-123 |
| `ARCH.veto.calendario`     | { muroMin: 0,01, puncheurMin: 0,08 }                                                    | V11 sobre etapas en línea generadas: hoy 0 de 1.075 tipan `muro` (balance v60 §12, vía arquitectura §9)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | decisión 7                          |

Con los ya decididos en §B.3: `ARCH.veto.margenClaseKm` 0,3 y `.margenValleKm` 0,7 (los usa `garantizaClase`, no `verify`; aquí solo se explica por qué V6 y V7 casi nunca saltan), `ARCH.veto.fallbackMaxShare` { calendario: 0, testPorEsqueleto: 0,005 } e `.intentosP95` 3. Y una lectura de `ARCH.meta.unDiaUltimaCota.aMeta` [3; 17] que la tabla de §B.3 no hace explícita: es la ventana de V5(c) POR DEFECTO, la de `ud_montana` (el caso v40); los demás esqueletos de un día declaran la suya en `Skeleton.metaParams.aMeta` (sección 5: `ud_circuito` y `nc_ruta` [1,2; 4,3], `ud_muros` y `ud_muros_adoquin` [1,2; 15], `ud_esprint_capi` [5,7; 8], `ud_montana_media` [5,7; 17]) y V5(c) lee esa antes que la constante.

### 9.2 La tabla de los dieciséis

| Veto                            | Regla (predicado)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Dónde                                                           | Solo lee                                                                                      | Caso que impide                                                                                                                           | Test que lo dispara                                                                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **V1 geografía: puerto**        | ningún motivo `puerto` si `req.geo.puerto === null`; y ningún segmento `puerto` con `climbSize(s).km ≥ PASS_MIN_KM` 8,5 si `geo.puerto === null` (una `cota` de 8,0 que el dibujo estire no puede convertirse en puerto)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | etapa, reintento                                                | `motivos`, `climbSize`                                                                        | un puerto de 12 km en `flandes`, `escandinavia`, `golfo`, `australia`                                                                     | `veto.test.ts`: `ud_montana` con `geo = ZONAS.flandes` forzada → `V1`; con `ZONAS.alpes` → `null`                                                                                                                         |
| **V2 geografía: adoquín**       | ningún `sector` con `firme: 'adoquin'` si `geo.adoquin < 2`; ningún `muro` con `adoquin: true` si `geo.adoquin === 0`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | etapa, reintento                                                | `motivos`, `geo`                                                                              | Roubaix en `andes` (mapa 07 §4.4 regla 3)                                                                                                 | `ud_adoquin` con `ZONAS.andes` → `V2`; con `ZONAS.francia_norte` → `null`                                                                                                                                                 |
| **V3 geografía: sterrato**      | ningún `sector` con `firme: 'tierra'` si `!geo.sterrato` (y `ud_sterrato` ya lo exige en `requiere`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | etapa, reintento                                                | `motivos`, `geo`                                                                              | Strade en `flandes` (regla 4)                                                                                                             | `ud_sterrato` con `ZONAS.flandes` → `V3`; con `ZONAS.italia_centro` → `null`                                                                                                                                              |
| **V4 geografía: altitud**       | (a) la meta instanciada (`metaDe(sk, motivos)` = `motivos.at(-1)?.meta ?? sk.meta`) es `alto_largo` solo si `geo.finalesAlto === 'largo'`; (b) ningún segmento `puerto` con `climbSize(s).km ≥ ARCH.veto.puertoLargoKm` 15 si `geo.altitud ∉ {media, alta, altiplano}`; (c) para todo segmento `puerto`, `climbMetres(s) ≤ ARCH.veto.puertoDplusMax[geo.altitud]` (integración `g·km·10` por tramo, como `altimetry.ts::elevationProfile`); (c) es cero por construcción solo porque 8.5 acota `g` tras sortear `km` (§9.1)                                                                                                                                                                                                                                                                                                                                                                                                                | etapa, reintento                                                | `motivos`, `climbSize`, `climbMetres`                                                         | cima a 2.500 m en `ardenas` (regla 5); un puerto de 25 km al 9 % (2.250 m) en `cantabrico`                                                | perfil literal con un `puerto` de 20 km × 8 % y `geo.altitud: 'colina'` → `V4`; el mismo con `'alta'` → `null`                                                                                                            |
| **V5 el caso v40**              | en `req.role === 'un_dia'` (incluidos `nc_ruta`) y `sk.id !== 'ud_montana_alto'`, si la etapa tiene alguna cota (`lastClimbKm !== null`): (a) la última cota mide `climbSize(ultimaCota(profile)).km ≤ ARCH.meta.unDiaUltimaCota.km[1]` 4,2 (`ultimaCota`, `geometry.ts` §3.9, cuerpo en §13.3: el segmento `puerto` que cierra la pancarta de `lastClimbKm`, que es una POSICIÓN y no una longitud); (b) si `finalKindOf(profile) === 'alto'`, esa misma longitud `≤ ARCH.meta.muro.km[1]` 2,2; (c) si `finalKindOf(profile) !== 'alto'`, `kmAfterLastClimb ∈ (sk.metaParams?.aMeta ?? ARCH.meta.unDiaUltimaCota.aMeta)`: [3; 17] en `ud_montana`, la ventana declarada del esqueleto en los demás (§9.1)                                                                                                                                                                                                                                 | etapa, reintento                                                | `lastClimbKm`, `kmAfterLastClimb`, `finalKindOf`, `climbSize`                                 | `race-jura`: final en alto de 14 km en un día (`profileGen.ts` l. 426-442; epics G6); regla 1 del mapa 07 §4.4                            | "una carrera de un día no muere en un puerto de 14 km" (§9.3)                                                                                                                                                             |
| **V6 reina es reina**           | `stageKindOf(profile, sk.kind === 'cri').kind === sk.kind` (solo `kind`; la etiqueta la pone el esqueleto, §9.1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | etapa, reintento                                                | `stageKindOf`                                                                                 | el 14 % de `mountainClassicSegments` clasificado `media` (mapa 01 §2.6); las 2 de 1.500 de `hillyUphill` clasificadas `reina` (§5.1)      | `et_reina_alto_largo` con perfil literal cuyo puerto de meta mide 8,4 km y suma 2.891 m → `V6`; con 9,0 km → `null` (§9.8)                                                                                                |
| **V7 el final declarado**       | `finalKindOf(profile) === (sk.finalKind ?? finalKindDe(metaInstanciada))`, con `metaInstanciada = motivos.at(-1)?.meta ?? sk.meta` (la del esqueleto solo si la lista viene vacía, como en los perfiles literales de §9.3 y §9.4) y `finalKindDe`: `repecho`, `muro_meta`, `alto_corto`, `alto_largo` → `alto`; `cima_cerca` → `cima_cerca`; `descenso_meta` → `valle_corto`; `valle` → `valle_largo`; `esprint`, `sector_meta` → `null` (sin comprobación si `sk.finalKind` tampoco está declarado: cronos, `ud_esprint`, `ud_adoquin`, `ud_muros` y `ud_muros_adoquin`, cuyo final "varía" en la sección 5). Un esqueleto con `finalKind` declarado y meta `esprint` (`ud_circuito` y `nc_ruta`: `cima_cerca` por su `aMeta` [1,2; 4,3]) se comprueba contra `sk.finalKind`. `skeletons.test.ts` sella que, si `sk.finalKind` está declarado y `finalKindDe(sk.meta) !== null`, coinciden, y lo mismo para la meta de cada `alternativa` | etapa, reintento                                                | `finalKindOf`                                                                                 | un `cima_cerca` que sale `valle_corto` por 0,3 km (4 de 6.000, mapa 01 §2.5)                                                              | `et_reina_valle` cuya pancarta deja 21 km de valle → `V7`; 19 km → `null` (un valle dibujado de 20,3 km se lee 20 y no dispara: §9.8)                                                                                     |
| **V8 reina de verdad**          | (a) en todo `sk.kind === 'reina'` salvo `et_reina_blanda`, lista literal: `et_reina_alto_largo`, `et_reina_alto_corto`, `et_reina_cima_cerca`, `et_reina_valle`, `et_reina_encadenada`, `et_montana_corta`, `ud_montana`, `ud_montana_alto`: puerto de meta con `climbSize ≥ ARCH.reina.verdad.puertoMetaMinKm` 9 y `finalKindOf === 'alto'`, o dos segmentos `puerto` con `climbSize ≥ 9`, o `dPlusDe(profile) ≥ ARCH.reina.verdad.dPlusMin` 3.400; (b) en TODO `sk.kind === 'reina'` (los ocho de (a) más `et_reina_blanda`): `subidaLejanaShare(profile) ≥ ARCH.reina.subidaLejanaMin` 0,25 (§9.4)                                                                                                                                                                                                                                                                                                                                      | etapa, reintento                                                | `climbSize`, `finalKindOf`, `dPlusDe`, `climbKmOutsideLast30`                                 | "reina con puerto final de menos de 8 km al 6 % y sin otro puerto HC antes" (regla 2); el perfil de `media-150`, antes `reina-150` (§9.4) | "`reina-150` expresada como esqueleto no pasa `verify`"                                                                                                                                                                   |
| **V9 llana es llana**           | en `sk.kind === 'llana'`: (a) `dPlusDe(profile) ≤ ARCH.veto.llana.dPlusMax` 1.800; (b) ninguna racha de `rachasDeSubida(profile)` con `km ≥ cotaKm` 2,5, media ponderada por km `≥ cotaG` 5 y final a `≤ ventanaKm` 15 km de meta. Racha: secuencia maximal de tramos consecutivos, cruzando fronteras de segmento y de cualquier `tipo`, con `g ≥ rachaGMin` 3; un rellano (tramos seguidos con `g < 3` que suman `≤ rellanoKm` 0,5 km) entre dos tramos de la racha no la corta y cuenta en su km y en su media (definición completa en el bloque de abajo)                                                                                                                                                                                                                                                                                                                                                                              | etapa, reintento                                                | `dPlusDe`, `rachasDeSubida`                                                                   | una llana de 2.500 m es media (regla 10); una `tendida` de 3,5 % que el dibujo empine                                                     | `et_llana` con relleno literal de 2.100 m → `V9`; con 900 m → `null`; racha de 2,8 km al 5,4 % con un rellano de 0,4 km a 10 km de meta → `V9`; con el rellano de 0,6 km → `null`; la misma racha a 20 km → `null` (§9.8) |
| **V10 cabe**                    | (a) `kmObjetivo − Σ kmNoEnlace(p)` sobre `colocados` `≥ ARCH.colocacion.enlaceMinimoTotal × kmObjetivo` 0,12, contado sobre el plan y no sobre el perfil (en el perfil enlace, `tendida`, separación, aproximación y valle son todos `llano`); (b) todo segmento `≥ ARCH.veto.segmentoMinKm` 0,5 salvo `cortoAdmitido(s)`: `s.tipo === 'puerto' && s.tramos?.length === 1 && s.km >= ARCH.motivo.muro.km[0]` (el muro de una rampa, §4.2) o `s.tipo === 'paves' && s.km >= ARCH.motivo.sector.km[0]` (el sector corto); (c) `                                                                                                                                                                                                                                                                                                                                                                                                              | Σ km − kmObjetivo                                               | ≤ ARCH.veto.kmTolerancia`0,05, con`kmObjetivo = ed.km`(§9.1; en`edicion`coincide con`req.km`) | etapa, reintento (y antes de dibujar, en `colocar` y `normalizeEnlaces`, sección 8)                                                       | segmentos, `kmObjetivo`, `colocados`                                                                                                                                                                                      | segmentos a cero (`calendar.test.ts` l. 92-108 solo exige `> 0`); km de las ediciones (l. 140-152, al entero; aquí al 0,1); dos dificultades pegadas sin enlace | perfil con un segmento de 0,3 km → `V10`; con 0,5 → `null`; muro de 0,4 km en dos tramos → `V10`, en una rampa → `null`; 209,8 km con `kmObjetivo` 210 → `V10`, 209,95 → `null`; `colocados` que dejan 10 km de enlace en 100 → `V10` (§9.8) |
| **V11 muro en meta existe**     | sobre las filas en línea generadas (`routeSource !== 'real'`, `kind !== 'cri'`): `finishType === 'muro'` en `≥ 1 %` y `'puncheur'` en `≥ 8 %`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | calendario, `routeCensus`                                       | `RouteStats.finishType`                                                                       | hoy 0 de 1.075 (balance v60 §12)                                                                                                          | `routeCensus.test.ts` sobre la temporada 0; `it.todo` en el paso 0 con la cifra de hoy                                                                                                                                    |
| **V12 no se repite**            | para todo par de filas con el mismo `skeleton`, la misma `zona` y `km` dentro de ± 10 %: `profileCorrelation(a, b) < ARCH.anticlon.maxCorrelacion` (provisional 0,85; calibrado en el paso 9, §9.5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | calendario, `routeCensus`                                       | `RouteStats.huella`                                                                           | dos "clásicas" que son la misma desplazada (agenda §4.18, hallazgo 2)                                                                     | `routeCensus.test.ts`: máximo por par < tope; mediana < 0,8 (sección 13)                                                                                                                                                  |
| **V13 clase**                   | `km[i] ≤ ARCH.km.maxPorClase[raceClass]` para toda etapa; si `roles[i] === 'prologo'`, `km[i] ∈ SKELETONS.et_prologo.km` [3; 8], y si `roles[i] === 'cronoescalada'`, `km[i] ∈ SKELETONS.et_cronoescalada.km` (sección 5; es lo que §7.3 cita como "V13 exige [3; 8]"); en `vu_corta` ≤ 1 crono; en `vu_semana` ≤ 3 finales en alto y ≤ 2 seguidos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | vuelta, `tour.test.ts`; reparado en `composeTour`               | `StageRole[]`, `km[]`                                                                         | reglas 7 y 8 del mapa 07 §4.4; un prólogo de 20 km                                                                                        | `tour.test.ts`: 120 semillas × n × 5 relieves, 0 violaciones tras reparar                                                                                                                                                 |
| **V14 gran vuelta**             | `ARCH.bloques.gv`: descansos tras las etapas 9 y 15, reina dentro de `ventanaReina(n)` (sección 7 §7.2; índices 0-based [14; 19] con n = 21, es decir, etapas 15 a 20; `ARCH.bloques.gv` no tiene clave `reina`, sección 12 §12.8), ≤ 1 final en alto en la primera semana, ≤ 7 de alta montaña, ≥ 2 llanas entre bloques                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | vuelta, `tour.test.ts`; reparado en `composeTour`               | `StageRole[]`                                                                                 | regla 6 del mapa 07 §4.4                                                                                                                  | `tour.test.ts`: `vu_gran_vuelta` con n de 15 a 21 (`vu_larga` cubre de 9 a 14, sección 7, que aparta el "9-21" de §D.7)                                                                                                   |
| **V15 pendientes**              | ningún tramo con `g > 20` ni `g < −14`; ningún segmento `puerto` con un tramo `g < 1`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | etapa, reintento                                                | tramos                                                                                        | salidas del ruido de `climb` (`profileGen.ts` l. 78)                                                                                      | tramo literal al 21 % → `V15`; al 16 % → `null`                                                                                                                                                                           |
| **V16 el final según el motor** | `r.finishType ∈ conjuntoV16(r)` para toda fila `r` con `routeSource !== 'real'`, `kind !== 'cri'` y `meta !== null`, con `finishType(deriveFinishTerrain(sampleProfile(profile)), 50)` calculado en `routeCensus`. El conjunto sale de UNA tabla, la de V16 de abajo (copiada literal en la sección 4, §4.3), que lee cuatro campos de la fila: `meta` y `cotaFinalKm` (de `arch.motivos.at(-1)`, §3.10 y §13.3: la meta instanciada, que con una alternativa de nivel 2 puede no ser `sk.meta`), `kmAfterLastClimb` (la rama de `esprint`) y `pavesKm` (la regla de `pave`). El octavo valor de `FinishType`, `solitario` (`finish.ts` l. 40), no está en ningún conjunto porque `finishType` solo lo devuelve con `groupSize <= 1` (l. 143) y el censo fija 50                                                                                                                                                                           | calendario, `routeCensus` y `motifs.test.ts`; nunca por intento | `RouteStats.finishType`, `.meta`, `.cotaFinalKm`, `.kmAfterLastClimb`, `.pavesKm`             | un `muro_meta` que sale `puncheur` por relleno al 3 % pegado a la racha (juicio motor §1)                                                 | `veto.test.ts`: filas literales (§9.8); `motifs.test.ts` 300 de 300 por `MetaKind` (paso 3); `routeCensus.test.ts` 100 % sobre la temporada 0                                                                             |

**Los predicados, escritos.** La tabla dice qué impide cada veto; el bloque siguiente dice exactamente qué compara, para que el implementador no tenga que elegir entre dos lecturas de una frase. Toda comparación con un umbral lleva `EPS` porque las sumas de tramos redondeados a 0,1 no son exactas en coma flotante (150 + 59,95 = 209,95000000000002, que sin `EPS` dispararía V10(c) sobre el fixture que tiene que callar).

```ts
// packages/engine/src/routes/grammar/veto.ts (núcleo por etapa; paso 5 del plan)
import { ARCH, STAGE } from '../../constants.js'
import type { Segment, StageProfile } from '../../stage/types.js'
import type { FinishType } from '../../stage/finish.js' // solo tipo: la regla de §14.4 lo admite
import type { RouteStats } from '../../sim/routeCensus.js' // solo tipo: se borra al compilar
import { PASS_MIN_KM, climbMetres, climbSize, stageKindOf } from '../stageKind.js'
import { finalKindOf, kmAfterLastClimb, lastClimbKm, type FinalKind } from '../finalKind.js'
import { dPlusDe, rachasDeSubida, subidaLejanaShare, ultimaCota } from './geometry.js'
import type { MetaKind, Motif } from './motifs.js'
import { kmNoEnlace, type Placed } from './place.js'
import type { Skeleton, SkeletonId } from './skeletons.js'
import type { GeoSignature } from './geo.js'
import type { StageRequest } from './generate.js'

const EPS = 1e-9
const veto = (id: VetoId, detalle: string): Veto => ({ id, detalle: `${id}: ${detalle}` })
/** Motivos a cualquier profundidad: hijos de `cadena`, `racimo` y `circuito`, y el sector de `sector_meta`. */
const aplanar = (ms: readonly Motif[]): Motif[] => ms.flatMap((m) => [m, ...aplanar(m.hijos ?? [])])
/** La meta instanciada: la del último motivo; la del esqueleto solo si la lista viene vacía (perfiles literales de test). */
const metaDe = (sk: Skeleton, motivos: readonly Motif[]): MetaKind =>
  motivos.at(-1)?.meta ?? sk.meta
const puertos = (p: StageProfile): Segment[] => p.segments.filter((s) => s.tipo === 'puerto')

export function finalKindDe(meta: MetaKind): FinalKind | null {
  switch (meta) {
    case 'repecho':
    case 'muro_meta':
    case 'alto_corto':
    case 'alto_largo':
      return 'alto'
    case 'cima_cerca':
      return 'cima_cerca'
    case 'descenso_meta':
      return 'valle_corto'
    case 'valle':
      return 'valle_largo'
    case 'esprint':
    case 'sector_meta':
      return null
  }
}

/** Las dos excepciones al suelo de 0,5 km: el muro de una rampa (§4.2) y el sector corto. */
const cortoAdmitido = (s: Segment): boolean =>
  (s.tipo === 'puerto' && s.tramos?.length === 1 && s.km >= ARCH.motivo.muro.km[0] - EPS) ||
  (s.tipo === 'paves' && s.km >= ARCH.motivo.sector.km[0] - EPS)

export const V10: VetoFn = (profile, _sk, _req, _motivos, kmObjetivo, colocados) => {
  const enlace = kmObjetivo - colocados.reduce((a, p) => a + kmNoEnlace(p), 0)
  if (enlace < ARCH.colocacion.enlaceMinimoTotal * kmObjetivo - EPS)
    return veto(
      'V10',
      `(a) enlace ${enlace.toFixed(1)} km < ${ARCH.colocacion.enlaceMinimoTotal} × ${kmObjetivo}`,
    )
  const corto = profile.segments.find(
    (s) => s.km < ARCH.veto.segmentoMinKm - EPS && !cortoAdmitido(s),
  )
  if (corto)
    return veto('V10', `(b) segmento ${corto.tipo} de ${corto.km} km < ${ARCH.veto.segmentoMinKm}`)
  const total = profile.segments.reduce((a, s) => a + s.km, 0)
  if (Math.abs(total - kmObjetivo) > ARCH.veto.kmTolerancia + EPS)
    return veto('V10', `(c) Σ km ${total.toFixed(2)} ≠ ${kmObjetivo}`)
  return null
}

export const V15: VetoFn = (profile) => {
  const { gMax, gMin, subidaGMin } = ARCH.veto.pendientes
  for (const s of profile.segments)
    for (const r of s.tramos ?? []) {
      if (r.g > gMax + EPS || r.g < gMin - EPS)
        return veto('V15', `tramo al ${r.g} % en un ${s.tipo}`)
      if (s.tipo === 'puerto' && r.g < subidaGMin - EPS)
        return veto('V15', `tramo al ${r.g} % dentro de un puerto`)
    }
  return null
}

export const V6: VetoFn = (profile, sk) => {
  const kind = stageKindOf(profile, sk.kind === 'cri').kind
  return kind === sk.kind
    ? null
    : veto('V6', `stageKindOf dice ${kind}; ${sk.id} promete ${sk.kind}`)
}

export const V7: VetoFn = (profile, sk, _req, motivos) => {
  const debe = sk.finalKind ?? finalKindDe(metaDe(sk, motivos))
  if (debe === null) return null
  const es = finalKindOf(profile)
  return es === debe
    ? null
    : veto(
        'V7',
        `finalKindOf ${es} (${kmAfterLastClimb(profile)} km tras la última cota); se declara ${debe}`,
      )
}

export const V1: VetoFn = (profile, _sk, req, motivos) => {
  if (req.geo.puerto !== null) return null
  if (aplanar(motivos).some((m) => m.kind === 'puerto'))
    return veto('V1', `motivo puerto en ${req.geo.zona}`)
  const largo = puertos(profile).find((s) => climbSize(s).km >= PASS_MIN_KM - EPS)
  return largo
    ? veto('V1', `segmento puerto de ${climbSize(largo).km} km en ${req.geo.zona}`)
    : null
}

export const V2: VetoFn = (_profile, _sk, req, motivos) => {
  const ms = aplanar(motivos)
  if (req.geo.adoquin < 2 && ms.some((m) => m.kind === 'sector' && m.firme !== 'tierra'))
    // sin `firme`, adoquín
    return veto('V2', `sector de adoquín en ${req.geo.zona} (adoquin ${req.geo.adoquin})`)
  if (req.geo.adoquin === 0 && ms.some((m) => m.kind === 'muro' && m.adoquin === true))
    return veto('V2', `muro adoquinado en ${req.geo.zona}`)
  return null
}

export const V3: VetoFn = (_profile, _sk, req, motivos) =>
  !req.geo.sterrato && aplanar(motivos).some((m) => m.kind === 'sector' && m.firme === 'tierra')
    ? veto('V3', `sector de tierra en ${req.geo.zona}`)
    : null

const ALTITUD_PUERTO_LARGO: readonly GeoSignature['altitud'][] = ['media', 'alta', 'altiplano']
export const V4: VetoFn = (profile, sk, req, motivos) => {
  const { altitud, finalesAlto, zona } = req.geo
  if (metaDe(sk, motivos) === 'alto_largo' && finalesAlto !== 'largo')
    return veto('V4', `(a) alto_largo en ${zona} (finalesAlto ${finalesAlto})`)
  for (const s of puertos(profile)) {
    const km = climbSize(s).km
    if (km >= ARCH.veto.puertoLargoKm - EPS && !ALTITUD_PUERTO_LARGO.includes(altitud))
      return veto('V4', `(b) puerto de ${km} km en altitud ${altitud}`)
    const m = climbMetres(s)
    if (m > ARCH.veto.puertoDplusMax[altitud] + EPS)
      return veto(
        'V4',
        `(c) puerto de ${Math.round(m)} m > ${ARCH.veto.puertoDplusMax[altitud]} (${altitud})`,
      )
  }
  return null
}

export const V5: VetoFn = (profile, sk, req) => {
  if (req.role !== 'un_dia' || sk.id === 'ud_montana_alto' || lastClimbKm(profile) === null)
    return null
  const ultima = ultimaCota(profile) // el puerto de la última pancarta (§3.9; cuerpo en §13.3)
  const km = ultima ? climbSize(ultima).km : 0 // LONGITUD: lastClimbKm es la posición de la pancarta
  if (km > ARCH.meta.unDiaUltimaCota.km[1] + EPS)
    return veto('V5', `(a) última cota ${km} km > ${ARCH.meta.unDiaUltimaCota.km[1]}`)
  if (finalKindOf(profile) === 'alto')
    return km > ARCH.meta.muro.km[1] + EPS
      ? veto('V5', `(b) muere arriba en ${km} km > ${ARCH.meta.muro.km[1]}`)
      : null
  const tras = kmAfterLastClimb(profile)!
  const [a, b] = sk.metaParams?.aMeta ?? ARCH.meta.unDiaUltimaCota.aMeta
  return tras >= a - EPS && tras <= b + EPS
    ? null
    : veto('V5', `(c) última cota a ${tras} km de meta, fuera de [${a}; ${b}]`)
}

const V8A: readonly SkeletonId[] = [
  'et_reina_alto_largo',
  'et_reina_alto_corto',
  'et_reina_cima_cerca',
  'et_reina_valle',
  'et_reina_encadenada',
  'et_montana_corta',
  'ud_montana',
  'ud_montana_alto',
] // todo `reina` salvo et_reina_blanda
export const V8: VetoFn = (profile, sk) => {
  if (sk.kind !== 'reina') return null
  if (V8A.includes(sk.id)) {
    const minKm = ARCH.reina.verdad.puertoMetaMinKm
    const ult = puertos(profile).at(-1)
    const puertoMeta =
      finalKindOf(profile) === 'alto' && ult !== undefined && climbSize(ult).km >= minKm - EPS
    const dos = puertos(profile).filter((s) => climbSize(s).km >= minKm - EPS).length >= 2
    const d = dPlusDe(profile)
    if (!puertoMeta && !dos && d < ARCH.reina.verdad.dPlusMin - EPS)
      return veto(
        'V8',
        `(a) sin puerto de meta ≥ ${minKm}, sin dos puertos ≥ ${minKm} y ${Math.round(d)} m < ${ARCH.reina.verdad.dPlusMin}`,
      )
  }
  const share = subidaLejanaShare(profile)
  return share >= ARCH.reina.subidaLejanaMin - EPS
    ? null
    : veto(
        'V8',
        `(b) subida lejana ${Math.round(share * 100)} % < ${ARCH.reina.subidaLejanaMin * 100} %`,
      )
}

export const V9: VetoFn = (profile, sk) => {
  if (sk.kind !== 'llana') return null
  const L = ARCH.veto.llana
  const d = dPlusDe(profile)
  if (d > L.dPlusMax + EPS) return veto('V9', `(a) D+ ${Math.round(d)} m > ${L.dPlusMax}`)
  const r = rachasDeSubida(profile).find(
    (x) => x.km >= L.cotaKm - EPS && x.g >= L.cotaG - EPS && x.finKmAMeta <= L.ventanaKm + EPS,
  )
  return r
    ? veto(
        'V9',
        `(b) racha de ${r.km.toFixed(1)} km al ${r.g.toFixed(1)} % a ${r.finKmAMeta.toFixed(1)} km de meta`,
      )
    : null
}

const ORDEN: readonly VetoFn[] = [V10, V15, V6, V7, V1, V2, V3, V4, V5, V8, V9]
export function verify(
  profile: StageProfile,
  sk: Skeleton,
  req: StageRequest,
  motivos: Motif[],
  kmObjetivo: number,
  colocados: Placed[],
): Veto | null {
  for (const v of ORDEN) {
    const r = v(profile, sk, req, motivos, kmObjetivo, colocados)
    if (r !== null) return { id: r.id, detalle: `${r.detalle} (${sk.id}, ${req.geo.zona})` }
  }
  return null
}
```

```ts
// packages/engine/src/routes/grammar/place.ts (lo que V10 comparte con colocar)
/** Lo que NO es enlace en un Placed: la cuenta `kmDif` de `colocar` (§8.6 punto 2). Las separaciones internas de un compuesto
 *  y el cierre de cada vuelta son enlace (§8.6 punto 3: "cuentan como kmEnl"); de la meta solo cuenta su subida. */
export function kmNoEnlace(p: Placed): number {
  const m = p.motif
  const dificultad = (h: Motif): number => (h.kind === 'tendida' ? 0 : h.km)
  let propio: number
  switch (m.kind) {
    case 'enlace':
    case 'expuesto':
    case 'tendida':
      propio = 0
      break
    case 'meta':
      propio = (m.cotaFinal?.km ?? 0) + (m.meta === 'sector_meta' ? (m.hijos?.[0]?.km ?? 0) : 0)
      break
    case 'cadena':
    case 'racimo':
    case 'circuito':
      propio = (m.vueltas ?? 1) * (m.hijos ?? []).reduce((a, h) => a + dificultad(h), 0)
      break
    default:
      propio = m.km // cota, puerto, muro, sector, descenso sin puerto delante
  }
  return propio + (p.bajada?.km ?? 0)
}

export function colocarPlantilla(plantilla: readonly Motif[]): Placed[] {
  const colocados: Placed[] = []
  let cum = 0
  let k = 0 // índice corrido de dificultad: solo es token de `dib`
  for (const motif of plantilla) {
    const kmTotal = motif.km * (motif.vueltas ?? 1) // en `circuito`, km es el de una vuelta
    if (motif.kind === 'enlace' || motif.kind === 'expuesto') {
      cum += kmTotal
      continue
    }
    if (motif.kind === 'descenso' && colocados.length > 0) {
      colocados[colocados.length - 1]!.bajada = motif
      cum += kmTotal
      continue
    }
    colocados.push({
      motif,
      slot: motif.kind === 'meta' ? 'meta' : k++,
      inicioKm: cum,
      finKm: cum + kmTotal,
    })
    cum += kmTotal
  }
  return colocados
}
```

```ts
// packages/engine/src/routes/grammar/geometry.ts (V9)
/** Rachas de subida. Se aplanan los tramos de todos los segmentos en orden (un segmento sin `tramos` cuenta como un tramo
 *  de su km a 0 %, que es lo que le suman `dPlusDe` y `climbMetres`: nada). Una racha empieza en un tramo con
 *  `g ≥ rachaGMin` y sigue mientras los tramos siguientes cumplan lo mismo; un grupo de tramos seguidos con `g < rachaGMin`
 *  cuyo km sume `≤ rellanoKm` y tras el que vuelva un tramo de la racha es un rellano: no la corta y cuenta en su km y en su
 *  media, como el respiro de `finish.ts` l. 109-122. La media es ponderada por km; `finKmAMeta` es la distancia del final
 *  del último tramo con `g ≥ rachaGMin` a la meta. No hay longitud mínima: la filtra V9 con `cotaKm`. */
export function rachasDeSubida(
  profile: StageProfile,
  gMin = ARCH.veto.llana.rachaGMin,
  rellanoKm = ARCH.veto.llana.rellanoKm,
): { km: number; g: number; finKmAMeta: number }[] {
  const t: { ini: number; km: number; g: number }[] = []
  let cum = 0
  for (const s of profile.segments) {
    let c = cum
    for (const r of s.tramos && s.tramos.length > 0 ? s.tramos : [{ km: s.km, g: 0 }]) {
      t.push({ ini: c, km: r.km, g: r.g })
      c += r.km
    }
    cum += s.km
  }
  const out: { km: number; g: number; finKmAMeta: number }[] = []
  let i = 0
  while (i < t.length) {
    if (t[i]!.g < gMin) {
      i++
      continue
    }
    let j = i // último tramo de la racha con g ≥ gMin
    let k = i + 1
    while (k < t.length) {
      if (t[k]!.g >= gMin) {
        j = k
        k++
        continue
      }
      let r = k,
        kmRellano = 0
      while (r < t.length && t[r]!.g < gMin) {
        kmRellano += t[r]!.km
        r++
      }
      if (r < t.length && kmRellano <= rellanoKm + 1e-9) {
        k = r
        continue
      } // rellano absorbido: la racha sigue en t[r]
      break
    }
    const seq = t.slice(i, j + 1)
    const km = seq.reduce((a, x) => a + x.km, 0)
    out.push({
      km,
      g: seq.reduce((a, x) => a + x.km * x.g, 0) / km,
      finKmAMeta: cum - (t[j]!.ini + t[j]!.km),
    })
    i = j + 1
  }
  return out
}
```

Tres decisiones del bloque que no son de estilo. La racha cruza fronteras de segmento y de `tipo` porque `deriveFinishTerrain` trabaja sobre bloques y no sabe dónde acaba un segmento (`finish.ts` l. 109-122): una `tendida` pegada a un `llano` empinado es una sola cota para el motor, y para V9 también. El umbral por tramo es el 3 de `finishClimbMinGradient` y no el 5 de la media, porque lo que V9 protege es lo que el motor leería como última cota; con umbral 5, dos tramos de 1,4 km al 6 % separados por uno de 0,3 al 4 % serían dos rachas cortas para el veto y una cota de 3,1 km para `finish.ts`. Y los rellanos se absorben con el mismo tope que el motor (5 bloques de 0,1 km), así que un tramo de 0,6 km al 2 % corta la racha en los dos sitios y uno de 0,4 no la corta en ninguno. La única diferencia con el motor es a propósito y en el sentido estricto: una racha que empieza antes de los últimos 15 km cuenta entera para V9, mientras `deriveFinishTerrain` solo ve la parte que cae en su ventana (l. 94). En el catálogo, V9(b) no puede disparar: los esqueletos `llana` (`ud_esprint`, `et_llana`, `et_llana_viento`, `ud_criterium`) solo llevan `enlace` a amplitud ≤ 2,4 (ningún tramo llega al 3), `expuesto` a ≤ 0,5 y `tendida` de g ≤ 3,5 con tramos a ± 0,7 (la media nunca llega a 5); es la red contra un `gRango` de `tendida` mal escrito o un rendido que empine, y por eso se prueba con perfiles literales (§9.8). Esto responde a la duda de la sección 5 sobre la "cota testimonial": V9 se queda como está, con su cláusula (b) escrita sobre tramos de cualquier tipo, y no se reescribe sobre `tendida`.

**La tabla de V16.** Es la única tabla `MetaKind` → conjunto de `finishType` del documento: la columna "`finishType` prometido a V16" de la sección 4 (§4.3) es copia literal de esta, y si difieren manda esta. Sale de la tabla razonada de §4.3 contra `finish.ts`, con la rama `esprint` completada en la franja que aquella dejaba sin conjunto.

| `r.meta`                   | Condición sobre la fila                                                 | Conjunto admitido                            | Por qué (orden de `finishType`, `finish.ts` l. 165-196)                                                                                                                                                                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `esprint`                  | `r.kmAfterLastClimb !== null` y `≤ ARCH.meta.cimaCerca.valle[1]` 4,3    | `{puncheur}`                                 | la cota corona a ≤ 5 km (4,3 más los 0,5 del redondeo de la pancarta) y la dificultad más pequeña de la gramática, un muro de 0,4 km al 8 %, puntúa 25,6 ≥ `finishPuncheurScore` 15; `puncheur` se mira antes que el esprint (l. 191). Montréal con el Pagnuelo a 4,0 (§4.7), `ud_circuito`, `nc_ruta`                                                        |
| `esprint`                  | `r.kmAfterLastClimb === null` o `≥ ARCH.meta.descensoMeta.valle[0]` 5,7 | `{sprint_masivo, sprint_reducido}`           | la cota queda fuera de `finishPuncheurKmToGo` 5 (5,7 menos 0,5 > 5), los últimos 5 km son enlace a amplitud ≤ 2,4 (ni racha al 3 %, ni arrastre ≥ `finishDragGradient` 2,5) y ninguna bajada llega a cubrir la mitad de los últimos 3 km                                                                                                                      |
| `esprint`                  | `4,3 < r.kmAfterLastClimb < 5,7`                                        | `{puncheur, sprint_masivo, sprint_reducido}` | franja de medida: `kmAfterLastClimb` sale de una pancarta redondeada al entero (± 0,5) y `climbKmToFinish` de bloques de 0,1 km, y el corte del motor (5) cae dentro. Ningún rango de meta la pisa salvo los `aMeta` anchos de `ud_muros`, `ud_muros_adoquin` ([1,2; 15]) y `ud_adoquin_ligero` ([2; 8]), cuyo `finalKind` "varía" y que ningún otro veto ata |
| `repecho`                  | (ninguna)                                                               | `{puncheur}`                                 | `gMin` 4 mete toda rampa en la racha, `climbScore ≥ 1 × 4,7² > 15`; `gMax` 7,9 lo aparta de `muro`; `km < 3` de `alto` (§4.3)                                                                                                                                                                                                                                 |
| `muro_meta`                | `r.cotaFinalKm ≤ ARCH.meta.muro.finishMuroMaxKm` 1,0                    | `{muro}`                                     | `climbKm ≤ muroMaxKm` 1, media ≥ 8 por `gMin` y corona en la línea (l. 182-189)                                                                                                                                                                                                                                                                               |
| `muro_meta`                | `r.cotaFinalKm > 1,0`                                                   | `{puncheur}`                                 | sin cautela (decisión 7): la vía de los últimos 3 km a `alto` está dentro del `if` de l. 168 y exige racha ≥ 3 km, que un muro de ≤ 2,2 km con 2 km de aproximación a ≤ 2,5 % no tiene (§4.3, nota 1)                                                                                                                                                         |
| `alto_corto`, `alto_largo` | (ninguna)                                                               | `{alto}`                                     | ≥ 3 km, media ≥ 4, muere en la línea (l. 168-169)                                                                                                                                                                                                                                                                                                             |
| `cima_cerca`               | `r.cotaFinalKm < STAGE.finishAltoMinKm` 3                               | `{puncheur}`                                 | corona a ≤ 4,3 km con `climbScore ≥ 1,3 × 7² = 64`; `descenso` (l. 194) va después y es inalcanzable                                                                                                                                                                                                                                                          |
| `cima_cerca`               | `r.cotaFinalKm ≥ 3`                                                     | `{puncheur, alto}`                           | con racha ≥ 3 km la vía de los últimos 3 km al ≥ 5 % (l. 170) puede dar `alto` si el valle está en el suelo (§4.3)                                                                                                                                                                                                                                            |
| `descenso_meta`            | (ninguna)                                                               | `{descenso, sprint_masivo, sprint_reducido}` | corona a ≥ 5,7 km (fuera de `puncheur`); `descenso` si la bajada cubre ≥ 1,5 de los últimos 3 km, y si no el esprint del grupo que llegue                                                                                                                                                                                                                     |
| `valle`                    | (ninguna)                                                               | `{sprint_masivo, sprint_reducido}`           | la cota queda fuera de los 15 km de `finishClimbSearchKm` y los últimos 3 km son llano                                                                                                                                                                                                                                                                        |
| `sector_meta`              | (ninguna)                                                               | `{pave}`                                     | ≥ 3,0 km de pavé en los últimos 30 (`finishPaveFraction` 0,1 × `finishPaveKm` 30), que garantiza el último `racimo` del esqueleto (§4.3)                                                                                                                                                                                                                      |

Dos reglas generales completan la tabla. Primera: todo conjunto que contiene `sprint_masivo` gana `pave` si la etapa tiene algún sector (`r.pavesKm > 0`), porque `pave` se comprueba justo antes del esprint (l. 195) y solo puede salir con pavé en los últimos 30 km; es lo que hace que `ud_muros_adoquin` y `ud_adoquin_ligero`, con meta `esprint` y sectores hasta el 90 % y el 95 % de la etapa, no salgan en rojo por un `pave` legítimo. Segunda: quedan fuera las filas `real` (sin `arch`), las de `kind === 'cri'` (`simulate.ts` l. 1041 en `8585ca2` desvía toda crono a `simulateTimeTrial` antes de cualquier llamada a `finishType`, así que el final de una crono no lo lee nadie) y las de `meta === null`.

```ts
// packages/engine/src/routes/grammar/veto.ts (V16)
const ESPRINT: readonly FinishType[] = ['sprint_masivo', 'sprint_reducido']
export function conjuntoV16(r: RouteStats): readonly FinishType[] | null {
  if (r.routeSource === 'real' || r.kind === 'cri' || r.meta === null) return null
  const base = ((): readonly FinishType[] => {
    const cf = r.cotaFinalKm ?? 0 // toda meta con subida la trae; 0 solo si falta
    switch (r.meta) {
      case 'esprint': {
        const tras = r.kmAfterLastClimb
        if (tras !== null && tras <= ARCH.meta.cimaCerca.valle[1] + EPS) return ['puncheur']
        if (tras === null || tras >= ARCH.meta.descensoMeta.valle[0] - EPS) return ESPRINT
        return ['puncheur', ...ESPRINT]
      }
      case 'repecho':
        return ['puncheur']
      case 'muro_meta':
        return cf <= ARCH.meta.muro.finishMuroMaxKm + EPS ? ['muro'] : ['puncheur']
      case 'alto_corto':
      case 'alto_largo':
        return ['alto']
      case 'cima_cerca':
        return cf >= STAGE.finishAltoMinKm - EPS ? ['puncheur', 'alto'] : ['puncheur']
      case 'descenso_meta':
        return ['descenso', ...ESPRINT]
      case 'valle':
        return ESPRINT
      case 'sector_meta':
        return ['pave']
    }
  })()
  return r.pavesKm > 0 && base.includes('sprint_masivo') ? [...base, 'pave'] : base
}
export const V16 = (rows: RouteStats[]): Veto | null => {
  for (const r of rows) {
    const c = conjuntoV16(r)
    if (c === null || c.includes(r.finishType)) continue
    return veto(
      'V16',
      `${r.raceId} e${r.stageIndex} (${r.skeleton}, ${r.meta}, cotaFinal ${r.cotaFinalKm ?? 'ninguna'}, ` +
        `${r.kmAfterLastClimb ?? 'sin cota'} km tras la última): ${r.finishType} fuera de {${c.join(', ')}}`,
    )
  }
  return null
}
```

`conjuntoV16` necesita dos campos que `RouteStats` no tenía y que las secciones 3 (§3.10) y 13 (§13.3) declaran ahora: `meta: MetaKind | null` y `cotaFinalKm: number | null`, leídos de `arch.motivos.at(-1)` (el motivo `meta` instanciado: `.meta` y `.cotaFinal?.km ?? null`), `null` los dos en las etapas `real`. No sirve leer `SKELETONS[r.skeleton].meta`: con `ARCH.edicion.nivel` 2 una alternativa puede cambiar la meta (sección 5 §5.5; la opción "Angliru" de `et_reina_alto_largo`, la "Bérgamo" de `ud_montana`), y `cotaFinal.km` es un sorteo de la instancia que decide entre `muro` y `puncheur`. `kmAfterLastClimb` y `pavesKm` ya estaban.

Cuatro notas de lectura. Primera: V1 a V4 son redundantes con `requiere` y con la instanciación de la sección 8 (§8.5), y su tasa de disparo en el calendario es cero por construcción con una condición que hay que escribir: la intersección de rangos acota `km` y `g` por separado, y V4(c) mide su producto, así que solo es cero porque 8.5 sortea `g` DESPUÉS de `km` con el techo `puertoDplusMax[altitud] / (km · 10)` (§9.1); sin ese recorte, un `puerto` de 9 km al 9 % (810 m) dispararía V4(c) en toda zona `colina` y uno de 20 km al 7 % (1.400 m) en toda zona `media`, de forma rutinaria y a costa del p95 de intentos. Siguen existiendo porque son la única defensa contra un `params.kmRango` mal escrito en un hueco o contra una fila nueva de `ZONAS` con `puerto.km` fuera de `ARCH.motivo.puerto.km`, y `geo.test.ts` (sección 6) las comprueba en frío sobre las 31 filas de `ZONAS` (las 30 zonas con nombre y `generico`), incluido el sello `puerto.km[0] · puerto.g[0] · 10 ≤ puertoDplusMax[altitud]`. Segunda: V6 es el sello que hoy da `stageKind.test.ts` por generador (mapa 06 §2.1) llevado dentro del generador, con `mountainClassicSegments` por fin vigilada (hoy no se importa en ese test, l. 1-11, y 210 de 1.500 salen `media`): a partir del paso 8 el test por esqueleto × zona lo mide como estadística y `verify` lo garantiza etapa a etapa. Tercera: V9 no se solapa con V6 aunque lo parezca: `stageKindOf` llama `llana` a cualquier perfil sin segmento `puerto` (`stageKind.ts` l. 77-78), así que una `tendida` de 8 km al 4,5 % tipada `llano` sigue siendo `llana` para el clasificador y para `kmSubida` (mapa 03 §4.1) y sin embargo el motor la sube por `g` (`gradientAt`, `sample.ts` l. 46-54); V9 impide que ese llano acumule 2.000 m o coloque una rampa que `deriveFinishTerrain` (`finish.ts` l. 71-135, racha con `g ≥ 3`) leería como cota de meta. Cuarta: los vetos no reparan, y por eso `garantizaClase` (sección 8, decisión 10, I-24) corre antes que `verify` y hace tres cosas que hoy nadie hace: mueve el motivo que decide la clase al lado correcto del borde (puerto más largo a ≥ 9,0 en reina y a ≤ 8,0 en media, con `margenClaseKm` 0,3 sobre 8,5), recorta o alarga el valle de la meta a su cubeta con `margenValleKm` 0,7 sobre los cortes 5 y 20 de `FINAL_KIND_CUTS` (`finalKind.ts` l. 30), y guarda "toda cota ≤ 2,9 km en clásica" para que un `ud_muros` cuyo dibujo estire un muro de 2,5 a 3,1 km no cruce `WALL_MAX_KM` 3 (hoy `normalize` lo hace y `classicSegments` no lo vigila, banco §4.5). Con esas tres guardas V6 y V7 son redes que casi nunca se usan; sin ellas serían la causa principal de reintento, y el p95 de `intentos` de §9.8 lo mediría.

### 9.3 V5, el caso v40, recorrido paso a paso

El caso que el dueño citó (epics G6: «para las que no se puedan nunca reproducir, el generador es una basura. Hay que arreglarlo, está pésimo») es `race-jura`: un día, Francia, clase .1, `terrain: 'mountain'` (`calendar.ts` l. 2303-2309), y antes de la v40 salía de `mountainSegments` con un final en alto de 9 a 15 km al [7,5; 9,5] % (`profileGen.ts` l. 362-363, `finalLen` y `finalG`; los puertos intermedios de 6 a 11 km están en l. 358-361; mapa 01 §2.5), _algo que no existe en el calendario real_, con el 82 % del pelotón a cero (`balance.md` l. 8102-8125, vía `juicios/cobertura.md` §1). La v40 lo arregló con una función más (`mountainClassicSegments`, `profileGen.ts` l. 443-470, con su comentario en l. 426-442) y una nota en `calendar.ts` l. 137-152 (el comentario de cabecera de `mountainOneDay`, l. 138-141, más el de su etiqueta, l. 145-149). Con la gramática la regla existe una vez, en V5, y vigila igual cualquier esqueleto de un día que alguien añada después (ingeniero §9.1). El recorrido con el diseño, de principio a fin en la misma zona:

1. **Zona.** `regionOf('race-jura', 1, 'FR')` devuelve `RACE_REGION['race-jura'].default`, que la sección 6 (§6.4, fila `race-jura`, Lons-le-Saunier → Les Rousses) cura como `macizo_central`; no hay sorteo de zona (decisión 14). El macizo del Jura no es el Macizo Central, y la sección 6 lo dice con esas palabras: Jura y Vosgos van a `macizo_central` como proxy de media montaña continental porque E1 no abre una zona propia (§D.6 del esqueleto lo fija como uno de los veinte ejemplos obligados). Lo que importa para V5 es la firma: `puerto` [9; 17] × [6; 8] irregular, `relieve: 'montana'`, `altitud: 'media'`, `finalesAlto: 'largo'` (tabla `ZONAS`, sección 6 §6.2).
2. **Esqueleto** (`arch|race-jura`, sección 8). Candidatos con `role: 'un_dia'` y `requiere` satisfecho por `ZONAS.macizo_central`: `ud_montana` (`puerto`, `relieve: 'montana'`), `ud_montana_media`, `ud_montana_alto` (`finalesAlto: 'largo'`) y `ud_circuito` (`muro !== null`). Con la fórmula de peso de la sección 5 (`pesoBase × SESGO_TERRENO × pesoPorClase × geo.pesos`): `terrain: 'mountain'` multiplica `ud_montana` ×4 (12 × 4 = 48), `ud_montana_media` 12 × 1,5 de zona = 18, `ud_circuito` 20 × 0,25 = 5, y `ud_montana_alto` 60 × 0,02 = 1,2 porque `race-jura` es .1 (en cualquier otra clase pesa 0 y no puede ni sortearse; el 1,2 sobre 72,2 es la rareza del 2 % de la decisión 37). El recorrido sigue la rama de `ud_montana`: `kind: 'reina'`, `enlace`@[0; 0,4], `puerto`×[2; 3]@[0,4; 0,85], `cota`×[1; 2]@[0,8; 0,97], meta `descenso_meta` (la de `canonico`, Como) o `cima_cerca` (la `alternativa`, Bérgamo, sección 5 §5.5) con `cotaFinal` de `ARCH.meta.unDiaUltimaCota` (km [1,3; 4,2], g [7; 11]) y `metaParams.aMeta` [3; 17].
3. **Km.** `kmDe('un_dia', '1', …)` con `ARCH.km.porClase` .1 un día [160, 40] (decisión 36; sección 12 §12.7: con 170 el máximo pasaba del techo 200): el 210 fijo de hoy (`calendar.ts` l. 915, `row.km ?? 210`; 66 de 66 carreras .1 en p10 = p50 = p90 = 210, datos §1.3) desaparece desde la temporada 0.
4. **Instanciación** (`mot|…`). Cada `puerto` toma `km` uniforme en la intersección de `ARCH.motivo.puerto.km` [9; 25] con `ZONAS.macizo_central.puerto.km` [9; 17], y `g` en `ARCH.motivo.puerto.g` [5; 12] ∩ [6; 8] = [6; 8] recortado por `puertoDplusMax.media` 1.300 (a 17 km, `g ≤ 7,6`; §9.1); la `cotaFinal` de la meta se sortea en [1,3; 4,2] km al [7; 11] %, y su valle en la intersección del `MetaKind` con `aMeta`: `cima_cerca` en [3; 4,3] y `descenso_meta` en [5,7; 17].
5. **Colocación, rendido, cuadre, garantías, pancartas** (sección 8). `garantizaClase` mueve, si hace falta, el puerto más largo al borde 9,0 con `margenClaseKm` 0,3 y recorta el valle a su cubeta con `margenValleKm` 0,7; `emitirPancartas` marca `cima` en cada puerto y en la última cota.
6. **`verify`**, en su orden. V10 y V15 pasan por construcción del rendido. V6: `stageKindOf` dice `reina/Mountains` porque el puerto más largo mide ≥ 9,0 > `PASS_MIN_KM` 8,5 (`stageKind.ts` l. 90-93) y no muere arriba. V7: `ud_montana` no declara `finalKind` ("varía", sección 5), así que compara con `finalKindDe(metaInstanciada)`: `valle_corto` con `descenso_meta`, `cima_cerca` con `cima_cerca`. V1 a V4: `macizo_central` tiene `puerto`, sin adoquín ni sterrato en juego, un puerto de 17 km cabe en `altitud: 'media'` (V4b) y sus metros en 1.300 por el recorte de `g` (V4c). **V5**: (a) la última cota es la `cotaFinal` de la meta, ≤ 4,2 km; (b) `finalKindOf ≠ 'alto'`, así que la cláusula del muro no aplica; (c) `kmAfterLastClimb` ∈ [3; 17], el `aMeta` del esqueleto. V8: (a) aplica a `ud_montana` y la cumple por sus dos o tres segmentos `puerto` de ≥ 9 km; (b) los puertos empiezan antes del 85 % de la etapa y sus tramos que acaban a más de 30 km de meta suman, con 18 a 51 km de puerto contra 1,3 a 4,2 de última cota, mucho más del 25 %. V9 no aplica.

Lo que el generador viejo hacía (9 a 15 km muriendo en meta) dispara V5 dos veces: (a) por longitud y (b) por final en alto. Y lo que `mountainClassicSegments` hace hoy (último puerto de 4 a 8 km con `runIn` de 13 a 22, mapa 01 §2.6) dispara (a) en la mitad superior de su rango y deja fuera, por abajo, la Roche-aux-Faucons de 1,3 km a 13,5 y el Murgil de 2,1 a 7 (mapa 07 §1.6). V5 es la regla del WorldTour de un día del mapa 07 §4.3 escrita en positivo: última subida de 0,4 a 4,2 km, cima a [0; 17] km, y meta arriba solo si es un muro de 1,3 a 2,1 (Huy, San Luca); el 2,2 es el techo de `ARCH.meta.muro.km` (decisión 7). Hay que decir lo que recorta a sabiendas: el mismo mapa (§1.2) lista Milano-Torino con meta en Superga (4,9 km al 9,1 %) y da para la familia "final en alto corto" de un día un rango de 0,3 a 5 km, y su regla negativa 1 (§4.4) prohíbe el final en un puerto "de más de 6 km", no de más de 2,2. La decisión 5 fija el techo en 2,2 (muro) y deja fuera del juego la arquitectura Superga (y con ella `alto_corto` [3; 7] en cualquier `ud_*`: la sección 5 solo lo da a `et_media_alto`); es una decisión del dueño con valor por defecto "queda fuera" que la sección 18 recoge como D13 (§18.14), y si el dueño la abre, el sitio es un esqueleto `ud_alto_corto` con `alto_corto` de [3; 5] km, peso bajo y la cláusula (b) leyendo `sk.meta` (≤ 5 si `alto_corto`, ≤ 2,2 si `muro_meta` o `repecho`), no un techo general más alto. Consecuencia sobre `repecho` en un día: la cláusula (b) obliga a que la meta `repecho` de un esqueleto `ud_*` (`ud_repecho`, sección 5) se instancie en [1; 2,2] km (intersección de `ARCH.meta.repecho.km` [1; 2,9] con V5b); en etapa sigue en [1; 2,9]. La sección 4 lo recoge en la tabla del `MetaKind`.

El test con nombre, en `grammar/veto.test.ts` (paso 5 del plan), en las dos zonas que importan (`reqUnDia` es la `StageRequest` de un día que el bloque de fixtures de §9.8 declara al principio del fichero; V5 no lee `req.km`): la de `race-jura` y la de puertos más largos del catálogo (`alpes`, [12; 25], el caso que §D.9 nombra):

```ts
describe.each([
  ['macizo_central', ZONAS.macizo_central, '1' as RaceClass, 205], // race-jura: la zona que la sección 6 le cura
  ['alpes', ZONAS.alpes, 'WT' as RaceClass, 235], // puertos [12; 25]: el peor caso para V5
] as const)(
  'una carrera de un día no muere en un puerto de 14 km (caso v40, ud_montana en %s)',
  (zona, geo, raceClass, km) => {
    const req = (i: number): StageRequest => ({
      raceId: `test-jura-${zona}-${i}`,
      stageIndex: 1,
      season: 0,
      km,
      role: 'un_dia',
      terrain: 'mountain',
      geo,
      raceClass,
      format: 'un-dia',
      routeSource: 'generado',
      fixed: { skeleton: 'ud_montana' },
    })
    it('2.000 semillas, cero finales en alto, cero degradadas', () => {
      let ultimaMayor = 0,
        muereArriba = 0,
        fueraDeVentana = 0,
        degradadas = 0
      for (let i = 0; i < 2000; i++) {
        const g = generateStage(req(i))
        const ultima = climbSize(g.profile.segments.filter((s) => s.tipo === 'puerto').at(-1)!)
        if (ultima.km > ARCH.meta.unDiaUltimaCota.km[1]) ultimaMayor++
        if (finalKindOf(g.profile) === 'alto') muereArriba++
        const tras = kmAfterLastClimb(g.profile)!
        if (tras < 3 || tras > 17) fueraDeVentana++
        if (g.arch.degradado) degradadas++
        expect(g.kind).toBe('reina') // V6 en las 2.000
      }
      expect(ultimaMayor).toBe(0)
      expect(muereArriba).toBe(0)
      expect(fueraDeVentana).toBe(0)
      expect(degradadas).toBe(0) // ARCH.veto.fallbackMaxShare.calendario
    })
  },
)

it('V5 dispara sobre el perfil literal del generador viejo y calla sobre Lombardía', () => {
  const jura: StageProfile = {
    segments: [
      { km: 196, tipo: 'llano' },
      { km: 14, tipo: 'puerto', tramos: [{ km: 14, g: 8 }] },
    ],
    banners: [{ km: 210, tipo: 'cima' }],
  }
  expect(V5(jura, SKELETONS.ud_montana, reqUnDia, [], 210, [])?.id).toBe('V5')
  const como = SKELETONS.ud_montana.canonico // 245 km; San Fermo 2,7 km al 7,2 % a 5,7 (pancarta 239: 6,0 leídos)
  const lombardia = renderCanonico('ud_montana', ZONAS.italia_norte)
  expect(
    V5(lombardia, SKELETONS.ud_montana, reqUnDia, como, 245, colocarPlantilla(como)),
  ).toBeNull()
})
```

### 9.4 V8, la lección de `reina-150` como regla

El perfil que fue `reina-150` se llama hoy `media-150`: `mediaScenario` (`sim/scenarios.ts` l. 448-462, con la nota "LA QUE ERA `reina-150`, con su nombre de verdad", l. 440-447) son 135 km de `llano` y un `puerto` de 15 km al 8 % con la pancarta en la meta. Sobre ese perfil `TARGETS.mountain.breakawayWinPct` [25; 45] estuvo cinco versiones en verde con un 27 a 30 %, mientras sobre las nueve reinas reales de `realQueens` la fuga ganaba el 3,3 % y en gran vuelta el 0 % (epics E3, pasos 2 a 4, mapa 04 §3.1). La lectura que cerró el caso (balance v43 §7, l. 8618-8631) mide una sola columna: **subida fuera de los últimos 30 km**. La canónica de entonces tiene 0 %; las nueve reales, del 6 al 38 % (Colombia e5 13, Tachira e6 18, Spain e7 8, Guatemala e9 13, Catalonia e4 6, Two Seas e4 16, Rhône-Alpes e8 28, Italy e19 33, France e20 38). La conclusión escrita en E3 es que `reina-150` _no es una etapa reina fácil: es media montaña con la etiqueta cambiada_, y el patrón se repitió seis veces (mapa 04 §3.3). El repositorio ya sacó la lección en el BANCO (paso 21, decisión 5 del dueño): `queenScenario` se llama `reina-canonica` (l. 303-329) y corre sobre `REINA_CANONICA_PROFILE` (l. 380-437: 158 km, 2.933 m, un puerto de 13 km al 7 % que corona en el km 63, uno de 12 km al 7,5 % que muere en meta, con el remate al 9 %), `targets.ts` l. 93-106 declara la banda vieja "INVÁLIDA" y re-ancla `mountain.breakawayWinPct` en [15; 40] (l. 107-112) sobre esa reina (25,8 % medido sobre 120 semillas), y `media-150` sigue solo como banco de forma. Lo que E1 añade es la misma lección en el GENERADOR (I-5, I-18, I-32): V8 es la regla que impide que el calendario vuelva a contener la forma `media-150` con `kind: 'reina'`, que es lo que el banco corrigió por decisión y el generador sigue pudiendo producir hoy (`mountainClassicSegments` con un solo puerto largo al final de su rango, mapa 01 §2.6). Si el generador pudiera producir esa forma como reina, el motor se calibraría otra vez contra algo que no existe.

Por qué 30 km y no otro número: `STAGE.climbRaceKmToGo` es 30 (`constants.ts` l. 3521) y `simulate.ts` l. 2497 lo lee como `raceThisClimb = totalKm − km <= 30`: solo el puerto a 30 km o menos de meta se sube "de verdad" (`climbPaceFraction` 0,12); los de antes se suben a tempo (`climbTempoFraction` 0,5, mapa 03 §4.2). La subida fuera de esa ventana es donde el pelotón no caza a la fuga sino que la sube (mapa 04 §3.1, paso 5), y donde la deriva acumulada deja gente atrás sin que la carrera se rompa por la cota (mapa 03 §10, hecho 3). Es la variable correcta porque es la que el motor usa para cambiar de régimen, y por eso `ARCH.reina.subidaLejanaKm` se define igual a `STAGE.climbRaceKmToGo` y `grammar/veto.test.ts` sella la igualdad ("`ARCH.reina.subidaLejanaKm === STAGE.climbRaceKmToGo`"): si el motor mueve la ventana, el veto se mueve con él.

La medida, en `geometry.ts`:

```ts
// packages/engine/src/routes/grammar/geometry.ts
/** Km de subida (tramos g > 0 de segmentos `puerto`) cuyo final está a más de `kmToGo` km de meta.
 *  Un tramo que cruza la línea de los 30 km cuenta solo por la parte que queda más allá. */
export function climbKmOutsideLast30(
  profile: StageProfile,
  kmToGo = ARCH.reina.subidaLejanaKm,
): number
/** climbKmOutsideLast30 / Σ climbSize(puerto).km; 0 si la etapa no tiene puertos. */
export function subidaLejanaShare(profile: StageProfile): number
```

V8b exige `subidaLejanaShare ≥ ARCH.reina.subidaLejanaMin` 0,25 en todo esqueleto con `kind: 'reina'`: `et_reina_alto_largo`, `et_reina_alto_corto`, `et_reina_cima_cerca`, `et_reina_valle`, `et_reina_encadenada`, `et_montana_corta`, `et_reina_blanda` (la cola baja de la decisión 8, con su `cota`×[1; 2]@[0,15; 0,6] de 5 a 8 km contra un `alto_largo` de 9 a 12: la peor combinación, una cota de 5 y una meta de 12, da 0,29), `ud_montana` y `ud_montana_alto` (cuyo hueco `puerto` es obligatorio, `n: [1; 1]`, en la fila de la sección 5 precisamente por V8b: con `puerto`×0 sería literalmente `media-150` con 100 km de enlace; `skeletons.test.ts` lo sella en general, "todo esqueleto `kind: 'reina'` tiene al menos una dificultad obligatoria fuera de la meta", para que nadie pueda volver a abrir ese hueco por catálogo). El denominador es el km de subida de la etapa y no el km total: separa "toda la subida está al final" de "la subida está repartida" con independencia de si la etapa mide 120 o 220 km, que es lo que distingue una reina de una media con la etiqueta cambiada. La columna de v43 §7 usa otro denominador (el km de etapa) y `routeCensus` imprime las dos, `climbKmOutsideLast30` en km y como fracción del km total, para que la tabla de v43 siga siendo comparable; la banda de calendario de la sección 13 ("ninguna reina en 0 %, p10 ≥ 5 %") se lee sobre la fracción del km total, como v43. V8a es la definición de reina que `stageKindOf` no puede dar (la red de 3.200 m "existe para los recorridos REALES", `stageKind.ts` l. 56-58): puerto de meta ≥ 9 km, o dos puertos ≥ 9, o 3.400 m con relleno (`dPlusDe`, decisión 9). `et_reina_blanda` queda fuera de (a) por la decisión 6 y dentro de (b) a propósito: es una reina de una semana con un solo puerto, y no puede ser una reina con todo el puerto en la meta (la exención de (a) no abre nada: con su `alto_largo` de [9; 12] km la cumpliría de todos modos por la primera cláusula). La reina canónica del motor pasa las dos: (a) por su puerto de meta de 12 km con `finalKindOf === 'alto'` (y por sus dos puertos ≥ 9), (b) porque los 13 km del primer puerto acaban a 95 km de meta, `subidaLejanaShare` = 13 / 25 = 0,52; si una recalibración del banco moviera esa reina a una forma que V8 vetara, sería una contradicción entre el motor y el generador que se abre al dueño (sección 18) y no se resuelve aflojando el veto.

Los tests con nombre (los perfiles son literales copiados de `scenarios.ts`, con la línea en el comentario; `veto.test.ts` no importa de `sim/`, §9.8):

```ts
it('reina-150 expresada como esqueleto no pasa verify (la lección de E3 como regla)', () => {
  const reina150: StageProfile = {
    segments: [
      { km: 135, tipo: 'llano' },
      { km: 15, tipo: 'puerto', tramos: [{ km: 15, g: 8 }] },
    ],
    banners: [{ km: 150, tipo: 'cima' }],
  } // sim/scenarios.ts l. 455-460 (media-150, antes reina-150)
  const sk = SKELETONS.et_reina_alto_largo
  expect(stageKindOf(reina150, false).kind).toBe('reina') // el clasificador la deja pasar: 15 ≥ 8,5
  expect(V8(reina150, sk, reqReina(150), [], 150, [])).toEqual({
    id: 'V8',
    detalle: expect.stringContaining('lejana 0 %'),
  })
  expect(subidaLejanaShare(reina150)).toBe(0)
  // La plantilla 3 del mapa 07 §5 (el `canonico` de `et_reina_alto_largo`, sección 5 §5.4) sí pasa: 12 + 17 + 10 km de puerto a 45, 95 y 130 → 39 de 54,8 = 0,71
  expect(
    V8(
      renderCanonico('et_reina_alto_largo', ZONAS.pirineos),
      sk,
      reqReina(175),
      sk.canonico,
      175,
      colocarPlantilla(sk.canonico),
    ),
  ).toBeNull()
})

it('la reina canónica del motor (scenarios.ts l. 380-437, targets.ts l. 107-112) pasa V8a y V8b', () => {
  const canonica: StageProfile = {
    segments: [
      { km: 50, tipo: 'llano' }, // los dos rompepiernas de apertura, que la gramática no emite
      {
        km: 13,
        tipo: 'puerto',
        tramos: [
          { km: 5.2, g: 6.2 },
          { km: 4.55, g: 7 },
          { km: 3.25, g: 8.2 },
        ],
      },
      { km: 18, tipo: 'descenso', tramos: [{ km: 18, g: -8 }] },
      { km: 65, tipo: 'llano' },
      {
        km: 12,
        tipo: 'puerto',
        tramos: [
          { km: 4.8, g: 6.5 },
          { km: 3.96, g: 7.5 },
          { km: 3.24, g: 9 },
        ],
      },
    ],
    banners: [
      { km: 63, tipo: 'cima' },
      { km: 158, tipo: 'cima' },
    ],
  }
  expect(V8(canonica, SKELETONS.et_reina_alto_largo, reqReina(158), [], 158, [])).toBeNull()
  expect(subidaLejanaShare(canonica)).toBeCloseTo(0.52, 2) // 13 de 25 km de puerto a más de 30 km
})
```

### 9.5 V12, el anti-clon calibrado sobre pares reales

El hallazgo 2 de agenda §4.18 es que "dos clásicas distintas se parecen aunque sus rampas no coincidan en un solo número", y el mapa 04 §5.2 propone medirlo con la correlación de los vectores de `g` por km entre pares de etapas del mismo tipo y longitud ± 10 %, con criterio "mediana < 0,8". Ese 0,8, y el 0,9 de arquitectura §9, son números sin dueño; el diseño toma el método de datos §10.2 (I-12, I-39): **el tope es tan parecido como dos carreras reales distintas de la misma familia, no más**. `profileCorrelation(a, b)` (`geometry.ts`) construye para cada perfil el vector de `g` medio por kilómetro a partir de los tramos (integración por km, sin `sampleProfile`: es geometría de `routes/`), normaliza el eje a [0; 1] desde la meta (así dos etapas de 235 y 255 km comparan el final con el final) y devuelve la correlación de Pearson. `RouteStats.huella` es ese vector, así que V12 corre sobre el censo sin volver a leer perfiles.

Calibración (paso 9 del plan, con `scripts/medir-real.mjs` como instrumento, decisión 40). Primero lo que hay: `STAGE_FEATURES` (`stageFeatures.ts`, claves l. 19-6225) contiene 26 carreras, de las que cinco son de un día (`race-sanremo`, `race-san-sebastian`, `race-laigueglia`, `race-wevelgem`, `race-brabant`); de los seis nombres de los tres pares que datos §10.2 y §B.3 citan (Ronde y E3, Amstel y Brabant, Lombardía y Lieja) solo existe `race-brabant`, así que a HEAD ninguno de los tres pares existe y la "comprobación de sentido" sobre ellos es vacía; el script lo imprime como aviso y no sustituye el par por otro. La población de calibración se define para medir lo que el principio promete, dos carreras DISTINTAS de la misma familia: todos los pares de etapas de las 177 reales con `raceId` distinto, el mismo `stageKindOf().kind`, el mismo `finalKindOf()` y km dentro de ± 10 % (los pares de etapas de una MISMA gran vuelta quedan fuera: medirían el parecido de un mismo recorrido consigo mismo un día después, no el de dos carreras). El p90 de su correlación es `ARCH.anticlon.maxCorrelacion`, y el script imprime cuántos pares hay por familia (`kind` × `finalKind`) y la lista queda en la sección 13. Como casi todas las 177 son etapas de vuelta, la cifra puede ser pequeña: si la población total queda por debajo de 30 pares, o si la familia de las clásicas (`clasica` y `media` de un día) tiene menos de 5, el valor se queda en el provisional 0,85 y el comentario de `constants.ts` escribe la cifra de pares con la que no se calibró ("provisional hasta vN §9: N pares reales, < 30"). Hasta esa medida el valor provisional es 0,85, entre el 0,8 de la mediana del mapa 04 y el 0,9 de arquitectura. V12 exige que ningún par (mismo `skeleton`, misma `zona`, km ± 10 %) lo supere; la banda de variedad de la sección 13 añade la mediana < 0,8 y la correlación entre ediciones consecutivas de una misma carrera en [0,55; 0,9] (sección 10), que no son vetos sino bandas.

### 9.6 V16, medido en el censo y no por intento

V16 es el V7 de arquitectura §9 partido en dos (regla de numeración de §B.4): la mitad que lee `finalKindOf` es V7 y reintenta; la mitad que lee `finishType` es V16 y no reintenta. `finishType(deriveFinishTerrain(sampleProfile(profile)), 50)` decide, con `alto` antes que `muro` (`finish.ts` l. 165-189), el tipo de final que gobierna el remate; el `groupSize` 50 solo separa `sprint_masivo` de `sprint_reducido` (`finish.ts` l. 142, vía arquitectura §4.7) y aparta `solitario` (l. 143, solo con `groupSize <= 1`), y se fija en `routeCensus` y solo ahí. El conjunto que se exige es el de la tabla de V16 de §9.2 (`conjuntoV16`), leído de la fila con la meta instanciada y no con la del esqueleto. Si V16 sale en rojo para un `MetaKind` (por ejemplo `muro_meta` ≤ 1,0 km que no da `muro` en el 100 %), lo que se corrige es un rango de `ARCH.meta.*` (`aproxKm`, `aproxAmp`, `gRango`), y se corrige una vez para todo el calendario; no se reintenta una etapa. Es la consecuencia práctica de la decisión 4: `verify` pasa hoy y pasará igual tras cualquier recalibración de `STAGE.finish*`, y si esa recalibración cambia lo que el motor lee de un final, lo dirá V16 en el siguiente `test:rapido` (0,57 s medidos, juicio motor §1) y no un calendario que cambia de dibujo en silencio.

### 9.7 Plausibilidad blanda: se imprime, no veta

Lo que no puede ser regla porque no tiene sigma conocida se mide en `routeCensus` y se imprime sin banda (regla 4 del mapa 04 §5.3: ninguna banda nueva nace en rojo; se le pone banda cuando la cifra tenga dueño). Todas se calculan con `routes/` y la geometría del esqueleto:

| Métrica                                           | Cómo se calcula                                                                                                     | Referencia real                                                                               | Estado                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Puertos por reina                                 | `nPuertos` = segmentos `puerto` con `climbSize ≥ CLIMB_MIN_KM` 1,5                                                  | 3 a 5 en gran vuelta, 2 a 4 en una semana (mapa 07 §4.2); real p10/p50/p90 2/4/6 (datos §1.4) | se imprime por esqueleto                                             |
| Posición del primer puerto                        | km del primer `puerto` como fracción de la etapa                                                                    | 20 a 60 % (mapa 04 §5.2)                                                                      | se imprime                                                           |
| Km de puerto a más de 60 km de meta               | como `climbKmOutsideLast30` con `kmToGo` 60                                                                         | real 0/13,2/43,0 (datos §1.4)                                                                 | se imprime                                                           |
| Entropía de `finalKind` por vuelta con ≥ 2 reinas | Shannon sobre las cubetas de `finalKindOf` de la carrera                                                            | ninguna gran vuelta con todas sus reinas `alto` (mapa 04 §5.2)                                | se imprime por carrera                                               |
| Correlación intra-esqueleto                       | mediana y p90 de `profileCorrelation` por `skeleton` × `zona`                                                       | mediana < 0,8 (mapa 04 §5.2); tope de V12                                                     | mediana con banda en la sección 13; el resto se imprime              |
| Distancia al p10/p90 real                         | por rasgo de `RouteStats` (última cota, km a meta, sectores) contra `scripts/medir-real.mjs` donde haya ≥ 3 fuentes | datos §1.4                                                                                    | se imprime; pasa a banda en la sección 13 solo donde hay ≥ 3 fuentes |
| Qué veto dispara más                              | histograma de `Veto.id` por `skeleton` × `zona`, con `intentos` p50/p95                                             | `ARCH.veto.intentosP95` 3                                                                     | se imprime; p95 sí tiene banda (§9.8)                                |

Lo que no se mide porque el motor no lo ve (decisión 17): altitud como frío, viento por tramo, anchura, exposición. Viajan en `arch.metadatos` y en la ficha, no en un veto ni en una métrica.

### 9.8 Fallback y su contador

Agotados `ARCH.colocacion.maxIntentos` 8, `generateStage` instancia `sk.canonico` con `degradado: true` e `intentos: 8` (sección 8). Que la canónica pasa `verify` en toda zona compatible y en los cinco km de prueba lo sella `skeletons.test.ts` ("la plantilla canónica de cada uno de los 32 esqueletos pasa `verify` en cada zona donde `requiere` se cumple", con `fixed.skeleton` y el `Motif[]` literal de la sección 5), y por eso en producción no se vuelve a verificar. El contador vive en `RouteStats.intentos` y `.degradado`, y `ARCH.veto.fallbackMaxShare` fija dos exigencias distintas a propósito: `calendario: 0` (ningún degradado en las 1.418 etapas de las temporadas 0 a 3, en `calendario.test.ts`: un degradado en el calendario es un defecto de parametrización, no un resultado aceptable, banco §4.6) y `testPorEsqueleto: 0,005` (en `skeletons.test.ts`, 300 semillas × zona compatible × 5 km por esqueleto, donde una combinación de borde puede tocar el tope sin que el catálogo esté mal). `ARCH.veto.intentosP95` 3 es la tercera exigencia: si el p95 de `intentos` de un (esqueleto, zona) supera 3, lo que se hace es estrechar los rangos del hueco que dispara (el histograma de §9.7 dice cuál), nunca subir `maxIntentos` (sección 17, riesgo 9), porque más intentos esconden el mismo defecto a más coste de arranque (sección 14).

Los tests de la capa por etapa, todos en `grammar/veto.test.ts` y todos con perfiles literales sin RNG salvo los dos con nombre de §9.3 y §9.4. Cada fixture es `{ profile, sk, req, motivos, colocados, km }`: `km` es el `kmObjetivo` con el que se "rindió" y `colocados` sale siempre de `colocarPlantilla(motivos)` (§9.1), así que un fixture solo escribe segmentos, pancartas, motivos y petición. Como `verify` devuelve el PRIMER veto en el orden V10, V15, V6, V7, V1 a V4, V5, V8, V9, cada fixture que dispara tiene que pasar todos los anteriores al suyo, y cada uno que calla tiene que pasar los once; la tabla que sigue al bloque dice, fixture por fixture, por qué. Las pancartas son las que pondría `emitirPancartas`: `cima` al `Math.round` del final de cada `puerto` de ≥ 1,5 km y siempre del último (§8.10).

```ts
// grammar/veto.test.ts (paso 5): auxiliares y fixtures. Ningún routeRng: todo es literal.
import { describe, expect, it } from 'vitest'
import type { Banner, Segment, StageProfile } from '../../stage/types.js'
import type { RouteStats } from '../../sim/routeCensus.js'
import { ARCH, STAGE } from '../../constants.js'
import { SKELETONS, type Skeleton, type SkeletonId } from './skeletons.js'
import { ZONAS, type GeoSignature } from './geo.js'
import { colocarPlantilla, type Placed } from './place.js'
import type { MetaKind, Motif } from './motifs.js'
import type { StageRequest } from './generate.js'
import type { StageRole } from './tour.js'
import { rachasDeSubida } from './geometry.js'
import { V5, V8, V16, verify, type VetoId } from './veto.js' // V5 y V8 los llaman los tests con nombre de §9.3 y §9.4, que añaden sus propios imports

// Constructores de motivo: copia de los de §5.4 (skeletons.ts no los exporta).
const E = (km: number): Motif => ({ kind: 'enlace', km })
const X = (km: number): Motif => ({ kind: 'expuesto', km })
const C = (km: number, g: number): Motif => ({ kind: 'cota', km, g })
const P = (km: number, g: number, firma = false): Motif => ({
  kind: 'puerto',
  km,
  g,
  forma: 'regular',
  firma,
})
const M = (km: number, g: number, adoquin = false): Motif => ({ kind: 'muro', km, g, adoquin })
const D = (km: number): Motif => ({ kind: 'descenso', km, g: -5 })
const S = (km: number, estrellas: number, firme: 'adoquin' | 'tierra' = 'adoquin'): Motif => ({
  kind: 'sector',
  km,
  estrellas,
  firme,
})
const META = (
  meta: MetaKind,
  km: number,
  cotaFinal?: { km: number; g: number },
  hijos?: Motif[],
): Motif => ({ kind: 'meta', meta, km, cotaFinal, hijos, firma: true })

// Segmentos literales. Sin `tramos`, un segmento sube 0 m para dPlusDe y climbMetres (stageKind.ts l. 27-33) y es 0 % en rachasDeSubida.
const L = (km: number): Segment => ({ km, tipo: 'llano' })
const Lt = (km: number, ...t: [number, number][]): Segment => ({
  km,
  tipo: 'llano',
  tramos: t.map(([k, g]) => ({ km: k, g })),
})
const ond = (km: number, g: number): Segment => Lt(km, [km / 2, g], [km / 2, -g]) // sube (km / 2) · g · 10 m
const Pu = (km: number, ...t: [number, number][]): Segment => ({
  km,
  tipo: 'puerto',
  tramos: t.map(([k, g]) => ({ km: k, g })),
})
const Ds = (km: number, g = -6): Segment => ({ km, tipo: 'descenso', tramos: [{ km, g }] })
const Pv = (km: number, estrellas: number): Segment => ({ km, tipo: 'paves', estrellas })
const cimas = (...km: number[]): Banner[] => km.map((k) => ({ km: k, tipo: 'cima' as const }))

/** La StageRequest de un día de §9.3: race-jura (.1, Francia, `terrain: 'mountain'`) en `macizo_central`, la zona que le cura la sección 6. */
const reqUnDia: StageRequest = {
  raceId: 'test-jura',
  stageIndex: 1,
  season: 0,
  km: 210,
  role: 'un_dia',
  terrain: 'mountain',
  geo: ZONAS.macizo_central,
  raceClass: '1',
  format: 'un-dia',
  routeSource: 'generado',
  fixed: { skeleton: 'ud_montana' },
}
/** La de §9.4 y §15.7, con el mismo cuerpo. */
const reqReina = (km: number): StageRequest => ({
  raceId: 'test-reina',
  stageIndex: 15,
  season: 0,
  km,
  role: 'reina_alto',
  terrain: 'mountain',
  geo: ZONAS.pirineos,
  raceClass: 'WT',
  format: 'gran-vuelta',
  routeSource: 'generado',
  fixed: { skeleton: 'et_reina_alto_largo' },
})
const unDia = (id: SkeletonId, geo: GeoSignature, km: number): StageRequest => ({
  ...reqUnDia,
  raceId: `test-${id}`,
  km,
  geo,
  terrain: 'classic',
  fixed: { skeleton: id },
})
const etapa = (id: SkeletonId, role: StageRole, geo: GeoSignature, km: number): StageRequest => ({
  raceId: `test-${id}`,
  stageIndex: 5,
  season: 0,
  km,
  role,
  terrain: role === 'llana' ? 'flat' : 'mountain',
  geo,
  raceClass: 'WT',
  format: 'gran-vuelta',
  routeSource: 'generado',
  fixed: { skeleton: id },
})

interface Fixture {
  profile: StageProfile
  sk: Skeleton
  req: StageRequest
  motivos: Motif[]
  colocados: Placed[]
  km: number
}
const fx = (
  id: SkeletonId,
  req: StageRequest,
  km: number,
  segments: Segment[],
  banners: Banner[],
  motivos: Motif[],
): Fixture => ({
  profile: { segments, banners },
  sk: SKELETONS[id],
  req,
  motivos,
  colocados: colocarPlantilla(motivos),
  km,
})
const corre = (f: Fixture) => verify(f.profile, f.sk, f.req, f.motivos, f.km, f.colocados)

// Lombardía por Como: la canónica de ud_montana (§5.4) con un tramo por segmento. 245 km; San Fermo 2,7 km al 7,2 % corona en 239,3.
const COMO: Segment[] = [
  L(98),
  Pu(9, [9, 6.2]),
  Ds(10, -5),
  L(20),
  Pu(13, [13, 6.6]),
  Ds(10, -5),
  L(37),
  Pu(4, [4, 7]),
  Ds(5.1, -5),
  L(19.5),
  Pu(4.2, [4.2, 7]),
  Ds(5.3, -5),
  L(1.5),
  Pu(2.7, [2.7, 7.2]),
  Ds(3.5, -5.5),
  L(2.2),
]
const COMO_CIMAS = cimas(107, 150, 201, 230, 239)
const COMO_MOT: Motif[] = [
  E(98),
  P(9.0, 6.2),
  D(10),
  E(20),
  P(13, 6.6, true),
  D(10),
  E(37),
  C(4, 7),
  D(5.1),
  E(19.5),
  C(4.2, 7),
  D(5.3),
  E(1.5),
  META('descenso_meta', 8.4, { km: 2.7, g: 7.2 }),
]

// V1 · puerto donde no hay puertos
const perfilPuertoEnFlandes = fx(
  'ud_montana',
  unDia('ud_montana', ZONAS.flandes, 245),
  245,
  COMO,
  COMO_CIMAS,
  COMO_MOT,
)
const perfilPuertoEnAlpes = fx(
  'ud_montana',
  unDia('ud_montana', ZONAS.alpes, 245),
  245,
  COMO,
  COMO_CIMAS,
  COMO_MOT,
)
// V2 · adoquín donde no hay adoquín: un Roubaix mínimo de 200 km, sin pancartas
const ROUBAIX: Segment[] = [L(150), Pv(2.4, 5), L(20), Pv(3, 4), L(21.5), Pv(1, 2), L(2.1)]
const ROUBAIX_MOT: Motif[] = [
  X(150),
  S(2.4, 5),
  E(20),
  S(3, 4),
  E(21.5),
  META('sector_meta', 3.1, undefined, [S(1, 2)]),
]
const perfilAdoquinEnAndes = fx(
  'ud_adoquin',
  unDia('ud_adoquin', ZONAS.andes, 200),
  200,
  ROUBAIX,
  [],
  ROUBAIX_MOT,
)
const perfilAdoquinEnFranciaNorte = fx(
  'ud_adoquin',
  unDia('ud_adoquin', ZONAS.francia_norte, 200),
  200,
  ROUBAIX,
  [],
  ROUBAIX_MOT,
)
// V3 · tierra donde no hay sterrato: dos sectores de tierra y un muro de meta de 0,8 km al 14 %
const STRADE: Segment[] = [L(150), Pv(3, 3), L(20), Pv(3.5, 3), L(20.7), L(2), Pu(0.8, [0.8, 14])]
const STRADE_MOT: Motif[] = [
  E(150),
  S(3, 3, 'tierra'),
  E(20),
  S(3.5, 3, 'tierra'),
  E(20.7),
  META('muro_meta', 2.8, { km: 0.8, g: 14 }),
]
const perfilTierraEnFlandes = fx(
  'ud_sterrato',
  unDia('ud_sterrato', ZONAS.flandes, 200),
  200,
  STRADE,
  cimas(200),
  STRADE_MOT,
)
const perfilTierraEnItaliaCentro = fx(
  'ud_sterrato',
  unDia('ud_sterrato', ZONAS.italia_centro, 200),
  200,
  STRADE,
  cimas(200),
  STRADE_MOT,
)
// V4 · un puerto de 20 km al 8 % (1.600 m) en una reina de valle; la zona es pirineos con la altitud forzada
const VALLE_20: Segment[] = [
  L(40),
  Pu(20, [10, 7.5], [10, 8.5]),
  Ds(10),
  L(86),
  Pu(10, [5, 7], [5, 8]),
  Ds(10),
  L(9),
]
const VALLE_20_MOT: Motif[] = [
  E(40),
  P(20, 8),
  D(10),
  E(86),
  META('descenso_meta', 29, { km: 10, g: 7.5 }),
]
const perfilPuerto20kmEnColina = fx(
  'et_reina_valle',
  etapa('et_reina_valle', 'reina_valle', { ...ZONAS.pirineos, altitud: 'colina' }, 185),
  185,
  VALLE_20,
  cimas(60, 166),
  VALLE_20_MOT,
)
const perfilPuerto20kmEnAlta = fx(
  'et_reina_valle',
  etapa('et_reina_valle', 'reina_valle', { ...ZONAS.pirineos, altitud: 'alta' }, 185),
  185,
  VALLE_20,
  cimas(60, 166),
  VALLE_20_MOT,
)
// V5 · el caso v40: el generador viejo (14 km al 8 % muriendo en meta) contra Lombardía, los dos en la zona de race-jura
const perfilJura14km = fx('ud_montana', reqUnDia, 210, [L(196), Pu(14, [14, 8])], cimas(210), [
  E(196),
  META('alto_largo', 14, { km: 14, g: 8 }),
])
const perfilLombardiaSanFermo = fx(
  'ud_montana',
  { ...reqUnDia, km: 245 },
  245,
  COMO,
  COMO_CIMAS,
  COMO_MOT,
)
// V6 · reina que no es reina: el puerto de meta mide 8,4 (media) o 9,0 (reina); relleno en tramos para acercarse a 3.200 m
const perfilReinaCon84 = fx(
  'et_reina_alto_largo',
  reqReina(175),
  175,
  [ond(60, 2), Pu(8, [4, 7], [4, 8]), Ds(10), ond(88.6, 2.3), Pu(8.4, [4.2, 7.5], [4.2, 8.5])],
  cimas(68, 175),
  [E(60), C(8, 7.5), D(10), E(88.6), META('alto_largo', 8.4, { km: 8.4, g: 8 })],
) // 2.891 m
const perfilReinaCon90 = fx(
  'et_reina_alto_largo',
  reqReina(175),
  175,
  [ond(60, 2), Pu(8, [4, 7], [4, 8]), Ds(10), ond(88, 2.3), Pu(9, [4.5, 7.5], [4.5, 8.5])],
  cimas(68, 175),
  [E(60), C(8, 7.5), D(10), E(88), META('alto_largo', 9, { km: 9, g: 8 })],
) // 2.932 m
// V7 · un descenso_meta cuyo valle se lee 21 km (valle_largo) o 19 km (valle_corto)
const perfilValle21 = fx(
  'et_reina_valle',
  etapa('et_reina_valle', 'reina_valle', ZONAS.pirineos, 185),
  185,
  [L(50), Pu(10, [5, 7], [5, 8]), Ds(10), L(84), Pu(10, [5, 7], [5, 8]), Ds(10), L(11)],
  cimas(60, 164),
  [E(50), P(10, 7.5), D(10), E(84), META('descenso_meta', 31, { km: 10, g: 7.5 })],
)
const perfilValle19 = fx(
  'et_reina_valle',
  etapa('et_reina_valle', 'reina_valle', ZONAS.pirineos, 185),
  185,
  [L(50), Pu(10, [5, 7], [5, 8]), Ds(10), L(86), Pu(10, [5, 7], [5, 8]), Ds(10), L(9)],
  cimas(60, 166),
  [E(50), P(10, 7.5), D(10), E(86), META('descenso_meta', 29, { km: 10, g: 7.5 })],
)
// V8 · reina-150 (hoy media-150, sim/scenarios.ts mediaScenario) contra la canónica de et_reina_alto_largo (plantilla 3 del mapa 07 §5)
const reina150 = fx(
  'et_reina_alto_largo',
  reqReina(150),
  150,
  [L(135), Pu(15, [15, 8])],
  cimas(150),
  [E(135), META('alto_largo', 15, { km: 15, g: 8 })],
)
const reina175_4800 = fx(
  'et_reina_alto_largo',
  reqReina(175),
  175,
  [
    L(52.5),
    Pu(12, [12, 7]),
    Ds(10),
    L(20),
    Pu(17, [17, 7.3]),
    Ds(10),
    L(8),
    Pu(10, [10, 7.8]),
    Ds(10),
    L(9.7),
    Pu(15.8, [15.8, 7.9]),
  ],
  cimas(65, 112, 140, 175),
  [
    E(52.5),
    P(12, 7),
    D(10),
    E(20),
    P(17, 7.3),
    D(10),
    E(8),
    P(10, 7.8),
    D(10),
    E(9.7),
    META('alto_largo', 15.8, { km: 15.8, g: 7.9 }),
  ],
) // 4.109 m sin relleno
// V9 · llana con 2.100 m o con 900 m de relleno, y las rachas
const llana = (segs: Segment[], km = 180) =>
  fx(
    'et_llana',
    etapa('et_llana', 'llana', ZONAS.francia_norte, km),
    km,
    segs,
    [],
    [E(km - 4), META('esprint', 4)],
  )
const perfilLlana2100m = llana([ond(100, 2.1), Lt(80, [50, 2.1], [30, -3.5])]) // 1.050 + 1.050
const perfilLlana900m = llana([ond(100, 0.9), Lt(80, [50, 0.9], [30, -1.5])]) // 450 + 450
const perfilRachaRellano04 = llana([
  ond(100, 1),
  ond(67.2, 1),
  Lt(1.6, [1.2, 6], [0.4, 2]),
  Lt(1.2, [1.2, 6]),
  ond(10, 0.5),
]) // 2,8 km al 5,43 %, acaba a 10
const perfilRachaRellano06 = llana([
  ond(100, 1),
  ond(67, 1),
  Lt(1.8, [1.2, 6], [0.6, 2]),
  Lt(1.2, [1.2, 6]),
  ond(10, 0.5),
]) // dos rachas de 1,2
const perfilRachaA20km = llana([
  ond(100, 1),
  ond(57.2, 1),
  Lt(1.6, [1.2, 6], [0.4, 2]),
  Lt(1.2, [1.2, 6]),
  ond(20, 0.5),
]) // la de 0,4, acaba a 20
// V10 · cabe: segmento corto, muro de una rampa, km y enlace
const perfilSegmento03 = llana([L(100), L(79.7), L(0.3)])
const perfilSegmento05 = llana([L(100), L(79.5), L(0.5)])
/** Una clásica de muros de 200 km en flandes con un solo muro a 188 km; `mot` es el motivo del muro. */
const muros = (muro: Segment, mot: Motif, cima: number) =>
  fx(
    'ud_muros',
    unDia('ud_muros', ZONAS.flandes, 200),
    200,
    [L(188), muro, L(12 - muro.km)],
    cimas(cima),
    [E(188), mot, E(10 - mot.km), META('esprint', 2)],
  )
const perfilMuro04UnaRampa = muros(Pu(0.4, [0.4, 12]), M(0.4, 12), 188) // Paterberg, Pagnuelo
const perfilMuro04DosRampas = muros(Pu(0.4, [0.2, 12], [0.2, 12]), M(0.4, 12), 188)
const perfilKm209_8 = llana([L(150), L(59.8)], 210)
const perfilKm209_95 = llana([L(150), L(59.95)], 210)
const perfilSinEnlace = fx(
  'et_reina_alto_largo',
  reqReina(100),
  100,
  [L(100)],
  [],
  [E(5), P(25, 7), D(10), P(25, 7), D(10), META('alto_largo', 20, { km: 20, g: 7 })],
) // 90 de 100 km no son enlace
// V15 · pendientes: un muro de 1,0 km cuya segunda rampa va al 21 % o al 16 %
const perfilTramo21 = muros(Pu(1, [0.5, 12], [0.5, 21]), M(1, 14), 189)
const perfilTramo16 = muros(Pu(1, [0.5, 12], [0.5, 16]), M(1, 14), 189)

describe.each([
  ['V1', perfilPuertoEnFlandes, perfilPuertoEnAlpes],
  ['V2', perfilAdoquinEnAndes, perfilAdoquinEnFranciaNorte],
  ['V3', perfilTierraEnFlandes, perfilTierraEnItaliaCentro],
  ['V4', perfilPuerto20kmEnColina, perfilPuerto20kmEnAlta],
  ['V5', perfilJura14km, perfilLombardiaSanFermo],
  ['V6', perfilReinaCon84, perfilReinaCon90],
  ['V7', perfilValle21, perfilValle19],
  ['V8', reina150, reina175_4800],
  ['V9', perfilLlana2100m, perfilLlana900m],
  ['V9', perfilRachaRellano04, perfilRachaRellano06],
  ['V10', perfilSegmento03, perfilSegmento05],
  ['V10', perfilMuro04DosRampas, perfilMuro04UnaRampa],
  ['V10', perfilKm209_8, perfilKm209_95],
  ['V15', perfilTramo21, perfilTramo16],
] as const)(
  '%s: un perfil que dispara y otro que no',
  (id: VetoId, dispara: Fixture, calla: Fixture) => {
    it('dispara', () => expect(corre(dispara)?.id).toBe(id))
    it('calla', () => expect(corre(calla)).toBeNull())
  },
)

it('V10(a): el enlace se cuenta sobre colocados, no sobre el perfil', () => {
  expect(corre(perfilSinEnlace)?.detalle).toMatch(/^V10: \(a\) enlace 10\.0 km/)
})
it('V9(b): la racha que acaba fuera de los 15 km no cuenta, y la racha cruza segmentos', () => {
  expect(corre(perfilRachaA20km)).toBeNull()
  const rs = rachasDeSubida(perfilRachaRellano04.profile)
  expect(rs).toHaveLength(1)
  const r = rs[0]
  expect(r!.km).toBeCloseTo(2.8, 6)
  expect(r!.g).toBeCloseTo(15.2 / 2.8, 6)
  expect(r!.finKmAMeta).toBeCloseTo(10, 6)
})
it('ARCH.veto.llana es la racha de deriveFinishTerrain', () => {
  expect(ARCH.veto.llana.rachaGMin).toBe(STAGE.finishClimbMinGradient)
  expect(ARCH.veto.llana.rellanoKm).toBeCloseTo(STAGE.finishClimbGapBlocks * STAGE.dx, 9)
  expect(ARCH.veto.llana.ventanaKm).toBe(STAGE.finishClimbSearchKm)
})

// V16 sobre filas literales: el predicado puro, sin censo (el censo lo mide sim/routeCensus.test.ts)
const fila = (o: Partial<RouteStats>): RouteStats => ({
  raceId: 'test',
  stageIndex: 1,
  raceClass: 'WT',
  format: 'un-dia',
  country: null,
  zona: 'flandes',
  skeleton: 'ud_muros',
  routeSource: 'generado',
  kind: 'clasica',
  label: 'Classic',
  finalKind: null,
  meta: 'esprint',
  cotaFinalKm: null,
  finishType: 'sprint_masivo',
  km: 200,
  dPlus: 0,
  dPlusBloques: 0,
  nPuertos: 0,
  nMuros: 0,
  longestClimbKm: 0,
  lastClimbKm: null,
  lastClimbG: null,
  kmAfterLastClimb: null,
  climbKmOutsideLast30: 0,
  kmSubidaShare: 0,
  breakAppealEstimado: 0,
  pavesKm: 0,
  nSectores: 0,
  estrellas5: 0,
  nPancartas: 0,
  maxG: 0,
  huella: [],
  intentos: 1,
  degradado: false,
  garantiasClase: 0,
  firmaMotivos: null,
  ...o,
})
it('V16 lee meta, cotaFinalKm, kmAfterLastClimb y pavesKm de la fila', () => {
  expect(V16([fila({ meta: 'muro_meta', cotaFinalKm: 0.8, finishType: 'muro' })])).toBeNull()
  expect(V16([fila({ meta: 'muro_meta', cotaFinalKm: 0.8, finishType: 'puncheur' })])?.id).toBe(
    'V16',
  )
  expect(V16([fila({ meta: 'muro_meta', cotaFinalKm: 1.3, finishType: 'puncheur' })])).toBeNull() // Huy
  expect(V16([fila({ meta: 'esprint', kmAfterLastClimb: 4, finishType: 'puncheur' })])).toBeNull() // Montréal, §4.7
  expect(V16([fila({ meta: 'esprint', kmAfterLastClimb: 13, finishType: 'puncheur' })])?.id).toBe(
    'V16',
  )
  expect(
    V16([fila({ meta: 'esprint', kmAfterLastClimb: 5, finishType: 'sprint_reducido' })]),
  ).toBeNull() // franja (4,3; 5,7)
  expect(
    V16([fila({ meta: 'esprint', kmAfterLastClimb: 13, pavesKm: 9, finishType: 'pave' })]),
  ).toBeNull()
  expect(V16([fila({ meta: 'cima_cerca', cotaFinalKm: 2.7, finishType: 'alto' })])?.id).toBe('V16')
  expect(V16([fila({ meta: 'cima_cerca', cotaFinalKm: 3.2, finishType: 'alto' })])).toBeNull()
  expect(V16([fila({ kind: 'cri', finishType: 'puncheur', kmAfterLastClimb: 12 })])).toBeNull() // crono: fuera
  expect(V16([fila({ routeSource: 'real', meta: null, finishType: 'solitario' })])).toBeNull() // real: fuera
})
```

Por qué cada fixture da lo que da. "Pasa X" significa que el veto X devuelve `null`; en la columna de los anteriores solo se nombra lo que no es evidente.

| Fixture                       | `verify` da | Por qué no dispara ningún veto anterior (orden V10, V15, V6, V7, V1..V4, V5, V8, V9)                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `perfilPuertoEnFlandes`       | `V1`        | V10: Σ 245, ningún segmento < 1,5, enlace 245 − 63,3 (dos puertos y dos cotas con sus bajadas, más 2,7 de San Fermo) = 181,7 ≥ 29,4. V15: pendientes de −5,5 a 7,2, ningún tramo de puerto < 1. V6: puerto más largo 13 ≥ 8,5 y no muere arriba, `reina`. V7: `ud_montana` no declara `finalKind`, la meta es `descenso_meta` (`valle_corto`) y la pancarta 239 deja 6,0 km. V1 dispara: `flandes.puerto` es `null` y hay dos motivos `puerto` |
| `perfilPuertoEnAlpes`         | `null`      | Lo mismo hasta V1, que pasa porque `alpes` tiene puerto. V2 y V3: ni sectores ni muros. V4: meta no `alto_largo`; 13 < 15; el mayor suma 858 m ≤ 2.100 (`alta`). V5: última cota 2,7 ≤ 4,2; no muere arriba; 6,0 ∈ [3; 17]. V8: (a) dos puertos ≥ 9 (9,0 y 13); (b) 26 de 32,9 km de subida acaban a más de 30 km, 0,79. V9 no aplica                                                                                                          |
| `perfilAdoquinEnAndes`        | `V2`        | V10: enlace 200 − 6,4 (sectores 2,4 y 3, y el de meta 1,0). V15: sin tramos. V6: hay `paves`, `clasica` (`stageKind.ts` l. 75). V7: `ud_adoquin` no declara y `sector_meta` da `null`. V1: `andes` tiene puerto y no hay segmentos `puerto`. V2 dispara: sector de adoquín con `andes.adoquin` 0                                                                                                                                               |
| `perfilAdoquinEnFranciaNorte` | `null`      | V2 pasa (`adoquin` 2). V3: sectores de adoquín. V4: sin puertos, meta `sector_meta`. V5: sin pancartas ni puertos, `lastClimbKm` es `null` y V5 no aplica. V8 y V9 no aplican                                                                                                                                                                                                                                                                  |
| `perfilTierraEnFlandes`       | `V3`        | V10: enlace 200 − 7,3. V15: 14 %. V6: `paves`, `clasica`. V7: `ud_sterrato` declara `alto`; pancarta 200, 0 km. V1: ningún motivo `puerto` y el único segmento `puerto` mide 0,8 < 8,5. V2: los sectores son de tierra y no hay muro adoquinado. V3 dispara: tierra con `flandes.sterrato` falso                                                                                                                                               |
| `perfilTierraEnItaliaCentro`  | `null`      | V3 pasa (`sterrato`). V4: 0,8 × 14 × 10 = 112 m ≤ 800 (`colina`). V5: (a) 0,8 ≤ 4,2; (b) muere arriba con 0,8 ≤ 2,2                                                                                                                                                                                                                                                                                                                            |
| `perfilPuerto20kmEnColina`    | `V4`        | V10: enlace 185 − 40. V15: de −6 a 8,5. V6: 20 ≥ 8,5 y no muere arriba, `reina`. V7: `valle_corto` declarado; pancarta 166, 19 km. V1 a V3: `pirineos` tiene puerto, sin sectores. V4 dispara por (b): 20 ≥ 15 en `colina` (y por (c), 1.600 m > 800, si (b) no estuviera antes)                                                                                                                                                               |
| `perfilPuerto20kmEnAlta`      | `null`      | V4: 20 km en `alta` y 1.600 y 750 m ≤ 2.100. V5 no aplica. V8: (a) dos puertos ≥ 9 (20 y 10); (b) 20 de 30 km lejos de meta, 0,67                                                                                                                                                                                                                                                                                                              |
| `perfilJura14km`              | `V5`        | V10: enlace 210 − 14. V15: 8 %. V6: 14 ≥ 8,5, `reina`. V7: la meta instanciada es `alto_largo` (`alto`) y la pancarta en 210 deja 0 km. V1: `macizo_central` tiene puerto. V4: (a) `finalesAlto` es `'largo'`; (b) 14 < 15; (c) 1.120 ≤ 1.300 (`media`). V5 dispara por (a): 14 > 4,2                                                                                                                                                          |
| `perfilLombardiaSanFermo`     | `null`      | Como `perfilPuertoEnAlpes` en la zona de `race-jura`: V4(c) con el techo de `media`, 858 y 558 m ≤ 1.300; V5 y V8 igual                                                                                                                                                                                                                                                                                                                        |
| `perfilReinaCon84`            | `V6`        | V10: enlace 175 − 26,4. V15: de −6 a 8,5, tramos de puerto ≥ 7. V6 dispara: el puerto más largo mide 8,4 < 8,5 y el perfil suma 2.891 m < 3.200: `stageKindOf` dice `media`                                                                                                                                                                                                                                                                    |
| `perfilReinaCon90`            | `null`      | V6: 9,0 ≥ 8,5 y muere arriba, `reina`. V7: declara `alto`; pancarta 175. V1 a V3: `pirineos`. V4: (a) `'largo'`; (c) 600 y 720 m ≤ 2.100. V8: (a) puerto de meta de 9,0 con `alto`; (b) los 8 km del primero acaban a 107 km, 8 de 17 = 0,47                                                                                                                                                                                                   |
| `perfilValle21`               | `V7`        | V10: enlace 185 − 30. V15. V6: dos puertos de 10, `reina`. V7 dispara: la pancarta en 164 deja 21 km, `valle_largo`, y `et_reina_valle` declara `valle_corto`. Un valle dibujado de 20,3 km NO dispararía: su cima en 164,7 se redondea a 165 y se lee 20,0 (`≤ 20`, `valle_corto`); es el borde que la holgura 0,7 de `ARCH.meta.descensoMeta.valle` aparta (§4.3)                                                                            |
| `perfilValle19`               | `null`      | V7: pancarta 166, 19 km, `valle_corto`. V4: 750 m. V8: (a) dos puertos ≥ 9; (b) 10 de 20, 0,5                                                                                                                                                                                                                                                                                                                                                  |
| `reina150`                    | `V8`        | V10: enlace 150 − 15. V15. V6: 15 ≥ 8,5, `reina`. V7: `alto`, pancarta 150. V4: (a) `'largo'`; (b) 15 en `alta`; (c) 1.200 ≤ 2.100. V8(a) pasa (puerto de meta de 15 con `alto`) y V8(b) dispara: subida lejana 0 %                                                                                                                                                                                                                            |
| `reina175_4800`               | `null`      | V10: enlace 175 − 84,8 = 90,2. V4: (b) 17 y 15,8 en `alta`; (c) el mayor, 1.248 m. V8: (a) puerto de meta de 15,8; (b) 12 + 17 + 10 de 54,8 km acaban a más de 30 km, 0,71                                                                                                                                                                                                                                                                     |
| `perfilLlana2100m`            | `V9`        | V10: enlace 180. V15: de −3,5 a 2,1. V6: ningún `puerto`, `llana`. V7: `et_llana` no declara y `esprint` da `null`. V1 a V4: sin puertos ni sectores; meta `esprint`. V5 y V8 no aplican. V9 dispara por (a): 2.100 > 1.800                                                                                                                                                                                                                    |
| `perfilLlana900m`             | `null`      | V9: 900 m y ningún tramo ≥ 3                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `perfilRachaRellano04`        | `V9`        | Lo mismo que las llanas hasta V9 (el 6 % no es de `puerto`, V15 no lo mira; `llano`, así que V6 sigue diciendo `llana`). V9(a): 1.013 m. V9(b) dispara: 1,2 al 6, rellano de 0,4 al 2 y 1,2 al 6, en dos segmentos, 2,8 km al 5,43 % que acaban a 10 km                                                                                                                                                                                        |
| `perfilRachaRellano06`        | `null`      | El rellano de 0,6 > 0,5 corta: dos rachas de 1,2 km                                                                                                                                                                                                                                                                                                                                                                                            |
| `perfilRachaA20km`            | `null`      | La misma racha que `perfilRachaRellano04`, acabando a 20 km > 15                                                                                                                                                                                                                                                                                                                                                                               |
| `perfilSegmento03`            | `V10`       | Es el primero. V10(a) pasa (enlace 180); V10(b) dispara: un `llano` de 0,3                                                                                                                                                                                                                                                                                                                                                                     |
| `perfilSegmento05`            | `null`      | V10(b): 0,5 no es < 0,5. El resto, como `perfilLlana900m` con 0 m                                                                                                                                                                                                                                                                                                                                                                              |
| `perfilMuro04DosRampas`       | `V10`       | V10(b) dispara: 0,4 km en DOS tramos no es la excepción                                                                                                                                                                                                                                                                                                                                                                                        |
| `perfilMuro04UnaRampa`        | `null`      | V10(b): muro de una rampa de 0,4 ≥ `ARCH.motivo.muro.km[0]`. V15: 12 %. V6: cota más larga 0,4 ≤ 3 y no muere arriba, `clasica`. V7: `ud_muros` no declara y `esprint` da `null`. V1: el motivo es `muro` y el segmento mide 0,4 < 8,5. V2: muro sin adoquín. V4: 48 m ≤ 500 (`mar`). V5: (a) 0,4; (c) pancarta 188, 12 km ∈ [1,2; 15] (el `aMeta` de `ud_muros`)                                                                              |
| `perfilKm209_8`               | `V10`       | V10(c): 209,8 contra 210                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `perfilKm209_95`              | `null`      | V10(c): diferencia 0,05 ≤ 0,05 (con `EPS`)                                                                                                                                                                                                                                                                                                                                                                                                     |
| `perfilSinEnlace`             | `V10`       | V10(a): 25 + 10 + 25 + 10 + 20 = 90 km que no son enlace, 10 < 12                                                                                                                                                                                                                                                                                                                                                                              |
| `perfilTramo21`               | `V15`       | V10: enlace 200 − 1,0. V15 dispara: tramo al 21 % (fuera de `ARCH.veto.pendientes.gMax` 20; el motivo declara 14 % y el dibujo lo empinó, que es el caso que V15 existe para cazar)                                                                                                                                                                                                                                                            |
| `perfilTramo16`               | `null`      | V15: 16 %. V6: 1,0 ≤ 3, `clasica`. V4: 60 + 80 = 140 m ≤ 500. V5: (a) 1,0; (c) pancarta 189, 11 km ∈ [1,2; 15]. El resto como `perfilMuro04UnaRampa`                                                                                                                                                                                                                                                                                           |

```ts
it('veto.ts no importa valores de sim/ (solo el import type de RouteStats)', async () => {
  const src = await readFile(new URL('./veto.ts', import.meta.url), 'utf8')
  expect(src).not.toMatch(/^import (?!type )[^\n]*from '[^']*\/sim\//m)
})
```

El último test es la mitad de la decisión 4 que el de `routes/arranque.test.ts` no cubre: ningún `import` con valor de `sim/` en `veto.ts`. La otra mitad (ningún `import` con valor de `stage/` y ninguna llamada a `sampleProfile`, `deriveFinishTerrain`, `finishType` o `costBase` en todo `grammar/`, con los comentarios quitados, porque el comentario de `verify` las nombra) la sella el tercer `it` de `routes/arranque.test.ts` (§14.4), y no se repite aquí: `import type { StageProfile } from '../../stage/types.js'` está permitido y es obligatorio en `veto.ts` (sección 2, principio 8; §3.9). Y las dos capas restantes tienen su test en su sitio: el predicado puro de V16 sobre filas literales está arriba, en este mismo fichero, y V11, V12 y V16 sobre el calendario en `sim/routeCensus.test.ts` sobre la temporada 0 (con `it.todo` y la cifra de hoy en el paso 0 del plan para V11 y V16, que hoy están en rojo por definición: 0 de 1.075 muros), y V13 y V14 en `grammar/tour.test.ts` sobre 120 semillas × n × 5 relieves, donde lo que se sella no es que el sorteo acierte sino que la reparación determinista de `composeTour` deje 0 violaciones (sección 7).
