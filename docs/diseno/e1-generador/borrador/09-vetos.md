## 9. Los vetos y la plausibilidad

Un veto es un predicado puro con nombre que dice «esto no existe» o «esto no es lo que declara». Hay dieciséis (decisión 24) y viven en `packages/engine/src/routes/grammar/veto.ts` como `V1` a `V16`, con un punto de entrada `verify` que devuelve el primero que salta o `null`. Se dividen en tres capas según dónde se comprueban: once por etapa con reintento (V1 a V10 y V15: si saltan, `generateStage` repite desde la instanciación con `i{intento}` en `mot`, `pos` y `dib`, sección 8), tres de calendario medidos en `routeCensus` (V11, V12, V16: no reintentan, porque un fallo suyo es un defecto de rangos y se corrige en `ARCH`, no en una etapa) y dos de vuelta (V13, V14: se reparan en `composeTour` y se sellan en `tour.test.ts`, sección 7). La regla que ordena la capa es la del juez del motor (`juicios/motor.md` §5, riesgo 3): **un veto que se comprueba por intento solo puede leer `routes/`** (`stageKindOf`, `finalKindOf`, `climbSize`, `lastClimbKm`, `kmAfterLastClimb`, `dPlusDe` y la geometría del esqueleto), nunca `sampleProfile`, `deriveFinishTerrain`, `finishType` ni `costBase`. La razón es de acoplamiento: si `verify` llamara a `finishType` por intento, una recalibración de `STAGE.finish*` (`constants.ts` l. 3970-4017) o de `physics.ts` redibujaría perfiles generados sin que `routes/` cambiara, que es exactamente el acoplamiento inverso que el repositorio ya sufrió al revés (el perfil manda sobre el motor, mapa 03 §9). Lo que el motor lee del final se mide igual, pero en la capa de calendario (V16), donde un rojo mueve rangos y no dados.

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
} // «V5: última cota 6,1 km > 4,2 (ud_montana, alpes, intento 2)»

/** Por etapa, con reintento. Orden de coste creciente: V10, V15, V6, V7, V1..V4, V5, V8, V9. */
export function verify(
  profile: StageProfile,
  sk: Skeleton,
  req: StageRequest,
  motivos: Motif[],
): Veto | null

/** Cada veto por etapa es también exportable y puro, para el test literal «uno que dispara y uno que no». */
export const V1: (
  profile: StageProfile,
  sk: Skeleton,
  req: StageRequest,
  motivos: Motif[],
) => Veto | null
// … V2 a V10 y V15 con la misma firma. V11, V12, V16 reciben RouteStats[]; V13 y V14 reciben StageRole[] y km[].
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
```

`timeTrial` no viaja en la firma porque se deduce del esqueleto: `sk.kind === 'cri'` (los cuatro esqueletos `et_crono`, `et_prologo`, `et_cronoescalada` y `nc_crono`). `verify` corre DESPUÉS de `normalizeEnlaces`, `garantizaClase` y `emitirPancartas` (sección 8), de modo que `lastClimbKm` (`finalKind.ts` l. 46-57) lee pancartas y no segmentos: como `emitirPancartas` pone `cima` en el último `puerto` de la etapa aunque mida menos de 1,5 km (decisión 25), un muro de meta de 0,8 km es «última cota» para V5 y V7, que es lo que hoy falla en 12 de 1.500 clásicas (mapa 01 §9, borde 3). Dos funciones de `stageKind.ts` que `verify` necesita no están exportadas hoy: `climbMetres` (l. 27-33) y `climbSize` (l. 36-42). El paso 5 del plan añade `export` a las dos sin tocar su cuerpo (es la única modificación de `stageKind.ts` además de `SUMMIT_RUN_IN_KM`, decisión 23), para que el veto mida la cota exactamente como la mide el clasificador: suma de los `tramos` con `g > 0`, no `segment.km`. Ese es el borde de 8,5 km del mapa 01 §5.1 (`garantizaPuerto` fijaba `segment.km` y `climbSize` leía tramos, 3 de 1.500 cruzadas): con la guarda `segment.km === Σ tramos` de `garantizaClase` (decisión 10) y con V6 midiendo con la misma función, el borde desaparece por construcción y además se comprueba.

Las constantes que leen los vetos y que no estaban en la tabla de §B.3 del esqueleto se agrupan en `ARCH.veto` (la sección 12 las incorpora a la tabla con estas cuatro columnas):

| Constante                  | Valor                                                                  | Intención                                                                                                                                                                                                                                                         | Apoyo                     |
| -------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `ARCH.veto.segmentoMinKm`  | 0,5                                                                    | ningún segmento por debajo: es el umbral con que `rolling` descarta huecos (`profileGen.ts` l. 101, vía arquitectura §4.5) y el que `calendar.test.ts` l. 108-121 sella                                                                                           | mapa 06 §2.2              |
| `ARCH.veto.kmTolerancia`   | 0,05                                                                   | `Σ km` igual al pedido al 0,1: contrato de `calendar.test.ts` l. 162-174                                                                                                                                                                                          | ingeniero §4.5            |
| `ARCH.veto.pendientes`     | { gMax: 20, gMin: −14, subidaGMin: 1 }                                 | salidas del ruido de `climb`: `Math.max(1, …)` en `profileGen.ts` l. 78 ya lo garantiza por abajo; por arriba `gMax` 16 de `muro` deja margen                                                                                                                     | mapa 01 §2.4              |
| `ARCH.veto.puertoLargoKm`  | 15                                                                     | un `puerto` de 15 km o más solo existe con `altitud ∈ {media, alta, altiplano}`                                                                                                                                                                                   | mapa 07 §4.4 regla 5      |
| `ARCH.veto.puertoDplusMax` | { mar: 500, colina: 800, media: 1.300, alta: 2.100, altiplano: 1.500 } | techo de desnivel de UN puerto, integrado por tramos: 1.ª es [700; 1.100] m y HC > 1.100 (mapa 07 §4.2); Alpe d'Huez 13,8 × 8,1 = 1.118, Loze 28,1 × 6 = 1.686, Sierra Nevada 19,3 × 7,9 = 1.525 (mapa 07 §4.3); el máximo de la gramática es 25 × 9 × 10 = 2.250 | mapa 07 §3 consecuencia 3 |
| `ARCH.veto.llana`          | { dPlusMax: 1.800, cotaKm: 2,5, cotaG: 5, ventanaKm: 15 }              | V9: una llana de 2.500 m es media (mapa 07 §4.4 regla 10); hoy el relleno solo ya da de 661 a 1.413 m (mapa 01 §1)                                                                                                                                                | mapa 07 §4.4              |
| `ARCH.veto.calendario`     | { muroMin: 0,01, puncheurMin: 0,08 }                                   | V11 sobre etapas en línea generadas: hoy 0 de 1.075 tipan `muro` (balance v60 §12, vía arquitectura §9)                                                                                                                                                           | decisión 7                |

Con los ya decididos en §B.3: `ARCH.veto.margenClaseKm` 0,3 y `.margenValleKm` 0,7 (los usa `garantizaClase`, no `verify`; aquí solo se explica por qué V6 y V7 casi nunca saltan), `ARCH.veto.fallbackMaxShare` { calendario: 0, testPorEsqueleto: 0,005 } e `.intentosP95` 3.

### 9.2 La tabla de los dieciséis

| Veto                            | Regla (predicado)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Dónde                                                           | Solo lee                                                      | Caso que impide                                                                                                                      | Test que lo dispara                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **V1 geografía: puerto**        | ningún motivo `puerto` si `req.geo.puerto === null`; y ningún segmento `puerto` con `climbSize(s).km ≥ PASS_MIN_KM` 8,5 si `geo.puerto === null` (una `cota` de 8,0 que el dibujo estire no puede convertirse en puerto)                                                                                                                                                                                                                                                                                                   | etapa, reintento                                                | `motivos`, `climbSize`                                        | un puerto de 12 km en `flandes`, `escandinavia`, `golfo`, `australia`                                                                | `veto.test.ts`: `ud_montana` con `geo = ZONAS.flandes` forzada → `V1`; con `ZONAS.alpes` → `null`                   |
| **V2 geografía: adoquín**       | ningún `sector` con `firme: 'adoquin'` si `geo.adoquin < 2`; ningún `muro` con `adoquin: true` si `geo.adoquin === 0`                                                                                                                                                                                                                                                                                                                                                                                                      | etapa, reintento                                                | `motivos`, `geo`                                              | Roubaix en `andes` (mapa 07 §4.4 regla 3)                                                                                            | `ud_adoquin` con `ZONAS.andes` → `V2`; con `ZONAS.francia_norte` → `null`                                           |
| **V3 geografía: sterrato**      | ningún `sector` con `firme: 'tierra'` si `!geo.sterrato` (y `ud_sterrato` ya lo exige en `requiere`)                                                                                                                                                                                                                                                                                                                                                                                                                       | etapa, reintento                                                | `motivos`, `geo`                                              | Strade en `flandes` (regla 4)                                                                                                        | `ud_sterrato` con `ZONAS.flandes` → `V3`; con `ZONAS.italia_centro` → `null`                                        |
| **V4 geografía: altitud**       | (a) `meta === 'alto_largo'` solo si `geo.finalesAlto === 'largo'`; (b) ningún segmento `puerto` con `climbSize(s).km ≥ ARCH.veto.puertoLargoKm` 15 si `geo.altitud ∉ {media, alta, altiplano}`; (c) para todo segmento `puerto`, `climbMetres(s) ≤ ARCH.veto.puertoDplusMax[geo.altitud]` (integración `g·km·10` por tramo, como `altimetry.ts::elevationProfile`)                                                                                                                                                         | etapa, reintento                                                | `motivos`, `climbSize`, `climbMetres`                         | cima a 2.500 m en `ardenas` (regla 5); un puerto de 25 km al 9 % (2.250 m) en `cantabrico`                                           | perfil literal con un `puerto` de 20 km × 8 % y `geo.altitud: 'colina'` → `V4`; el mismo con `'alta'` → `null`      |
| **V5 el caso v40**              | en `req.role === 'un_dia'` (incluidos `nc_ruta`) y `sk.id !== 'ud_montana_alto'`: (a) la última cota (`lastClimbKm`, con pancartas) mide `climbSize ≤ ARCH.meta.unDiaUltimaCota.km[1]` 4,2; (b) si `finalKindOf(profile) === 'alto'`, mide `≤ ARCH.meta.muro.km[1]` 2,2; (c) si `sk.id === 'ud_montana'`, `kmAfterLastClimb ∈ ARCH.meta.unDiaUltimaCota.aMeta` [3; 17]                                                                                                                                                     | etapa, reintento                                                | `lastClimbKm`, `kmAfterLastClimb`, `finalKindOf`, `climbSize` | `race-jura`: final en alto de 14 km en un día (`profileGen.ts` l. 430-438; epics G6); regla 1 del mapa 07 §4.4                       | «una carrera de un día no muere en un puerto de 14 km» (§9.3)                                                       |
| **V6 reina es reina**           | `stageKindOf(profile, sk.kind === 'cri').kind === sk.kind`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | etapa, reintento                                                | `stageKindOf`                                                 | el 14 % de `mountainClassicSegments` clasificado `media` (mapa 01 §2.6); las 2 de 1.500 de `hillyUphill` clasificadas `reina` (§5.1) | `et_reina_alto_largo` con perfil literal cuyo puerto de meta mide 8,4 km y suma 2.900 m → `V6`; con 9,0 km → `null` |
| **V7 el final declarado**       | `finalKindOf(profile) === finalKindDe(meta)` con `finalKindDe`: `repecho`, `muro_meta`, `alto_corto`, `alto_largo` → `alto`; `cima_cerca` → `cima_cerca`; `descenso_meta` → `valle_corto`; `valle` → `valle_largo`; `esprint`, `sector_meta` → sin comprobación. Si `sk.finalKind` está declarado, `skeletons.test.ts` sella que coincide con `finalKindDe(sk.meta)`                                                                                                                                                       | etapa, reintento                                                | `finalKindOf`                                                 | un `cima_cerca` que sale `valle_corto` por 0,3 km (4 de 6.000, mapa 01 §2.5)                                                         | `descenso_meta` con valle literal de 20,3 km → `V7`; con 19,3 → `null`                                              |
| **V8 reina de verdad**          | (a) en `et_reina_*` salvo `et_reina_blanda`: puerto de meta con `climbSize ≥ ARCH.reina.verdad.puertoMetaMinKm` 9 y `finalKindOf === 'alto'`, o dos segmentos `puerto` con `climbSize ≥ 9`, o `dPlusDe(profile) ≥ ARCH.reina.verdad.dPlusMin` 3.400; (b) en TODO `sk.kind === 'reina'`: `subidaLejanaShare(profile) ≥ ARCH.reina.subidaLejanaMin` 0,25 (§9.4)                                                                                                                                                              | etapa, reintento                                                | `climbSize`, `finalKindOf`, `dPlusDe`, `climbKmOutsideLast30` | «reina con puerto final de menos de 8 km al 6 % y sin otro puerto HC antes» (regla 2); `reina-150` (§9.4)                            | «`reina-150` expresada como esqueleto no pasa `verify`»                                                             |
| **V9 llana es llana**           | en `sk.kind === 'llana'`: `dPlusDe(profile) ≤ ARCH.veto.llana.dPlusMax` 1.800 y ninguna racha de tramos (de cualquier tipo de segmento) de `≥ 2,5 km` a `g medio ≥ 5` que termine en los últimos 15 km                                                                                                                                                                                                                                                                                                                     | etapa, reintento                                                | `dPlusDe`, tramos                                             | una llana de 2.500 m es media (regla 10); una `tendida` de 3,5 % que el dibujo empine                                                | `et_llana` con `expuesto` literal de 2.100 m → `V9`; con 900 m → `null`                                             |
| **V10 cabe**                    | `Σ km(enlace ∪ expuesto) ≥ ARCH.colocacion.enlaceMinimoTotal × km` 0,12; todo segmento `≥ ARCH.veto.segmentoMinKm` 0,5; `                                                                                                                                                                                                                                                                                                                                                                                                  | Σ km − req.km                                                   | ≤ ARCH.veto.kmTolerancia` 0,05                                | etapa, reintento (y antes de dibujar, en `colocar` y `normalizeEnlaces`, sección 8)                                                  | segmentos                                                                                                           | segmentos a cero (`calendar.test.ts` l. 108-121); km de las ediciones (l. 162-174) | perfil con un segmento de 0,3 km → `V10`; con 0,5 → `null` |
| **V11 muro en meta existe**     | sobre las filas en línea generadas (`routeSource !== 'real'`, `kind !== 'cri'`): `finishType === 'muro'` en `≥ 1 %` y `'puncheur'` en `≥ 8 %`                                                                                                                                                                                                                                                                                                                                                                              | calendario, `routeCensus`                                       | `RouteStats.finishType`                                       | hoy 0 de 1.075 (balance v60 §12)                                                                                                     | `routeCensus.test.ts` sobre la temporada 0; `it.todo` en el paso 0 con la cifra de hoy                              |
| **V12 no se repite**            | para todo par de filas con el mismo `skeleton`, la misma `zona` y `km` dentro de ± 10 %: `profileCorrelation(a, b) < ARCH.anticlon.maxCorrelacion` (provisional 0,85; calibrado en el paso 9, §9.5)                                                                                                                                                                                                                                                                                                                        | calendario, `routeCensus`                                       | `RouteStats.huella`                                           | dos «clásicas» que son la misma desplazada (agenda §4.18, hallazgo 2)                                                                | `routeCensus.test.ts`: máximo por par < tope; mediana < 0,8 (sección 13)                                            |
| **V13 clase**                   | `km ≤ ARCH.km.maxPorClase[raceClass]`; en `vu_corta` ≤ 1 crono; en `vu_semana` ≤ 3 finales en alto y ≤ 2 seguidos                                                                                                                                                                                                                                                                                                                                                                                                          | vuelta, `tour.test.ts`; reparado en `composeTour`               | `StageRole[]`, `km[]`                                         | reglas 7 y 8 del mapa 07 §4.4                                                                                                        | `tour.test.ts`: 120 semillas × n × 5 relieves, 0 violaciones tras reparar                                           |
| **V14 gran vuelta**             | `ARCH.bloques.gv`: descansos tras las etapas 9 y 15, reina en [15; 20], ≤ 1 final en alto en la primera semana, ≤ 7 de alta montaña, ≥ 2 llanas entre bloques                                                                                                                                                                                                                                                                                                                                                              | vuelta, `tour.test.ts`; reparado en `composeTour`               | `StageRole[]`                                                 | regla 6 del mapa 07 §4.4                                                                                                             | `tour.test.ts`: `vu_gran_vuelta` con n de 9 a 21                                                                    |
| **V15 pendientes**              | ningún tramo con `g > 20` ni `g < −14`; ningún segmento `puerto` con un tramo `g < 1`                                                                                                                                                                                                                                                                                                                                                                                                                                      | etapa, reintento                                                | tramos                                                        | salidas del ruido de `climb` (`profileGen.ts` l. 78)                                                                                 | tramo literal al 21 % → `V15`; al 16 % → `null`                                                                     |
| **V16 el final según el motor** | `finishType(deriveFinishTerrain(sampleProfile(profile)), 50)` pertenece al conjunto que promete el `MetaKind` instanciado (tabla de la sección 4): `esprint` → {`sprint_masivo`, `sprint_reducido`}; `repecho` → {`puncheur`}; `muro_meta` → {`muro`} si `cotaFinal.km ≤ 1,0` y {`puncheur`, `alto`} si > 1,0; `alto_corto`, `alto_largo` → {`alto`}; `cima_cerca` → {`descenso`, `puncheur`}; `descenso_meta` → {`descenso`, `sprint_reducido`}; `valle` → {`sprint_masivo`, `sprint_reducido`}; `sector_meta` → {`pave`} | calendario, `routeCensus` y `motifs.test.ts`; nunca por intento | `RouteStats.finishType`                                       | un `muro_meta` que sale `puncheur` por relleno al 3 % pegado a la racha (juicio motor §1)                                            | `motifs.test.ts` 300 de 300 por `MetaKind` (paso 3); `routeCensus.test.ts` 100 % sobre la temporada 0               |

Cuatro notas de lectura. Primera: V1 a V4 son en teoría redundantes con `requiere` y con la intersección de rangos del paso de instanciación (sección 8), y por eso su tasa de disparo en el calendario es cero por construcción; siguen existiendo porque son la única defensa contra un `params.kmRango` mal escrito en un hueco o contra una fila nueva de `ZONAS` con `puerto.km` fuera de `ARCH.motivo.puerto.km`, y `geo.test.ts` (sección 6) las comprueba en frío sobre las 29 zonas. Segunda: V6 es el sello que hoy da `stageKind.test.ts` por generador (mapa 06 §2.1) llevado dentro del generador, con `mountainClassicSegments` por fin vigilada (hoy no se importa en ese test, l. 1-11, y 210 de 1.500 salen `media`): a partir del paso 8 el test por esqueleto × zona lo mide como estadística y `verify` lo garantiza etapa a etapa. Tercera: V9 no se solapa con V6 aunque lo parezca: `stageKindOf` llama `llana` a cualquier perfil sin segmento `puerto` (`stageKind.ts` l. 77-78), así que una `tendida` de 8 km al 4,5 % tipada `llano` sigue siendo `llana` para el clasificador y para `kmSubida` (mapa 03 §4.1) y sin embargo el motor la sube por `g` (`gradientAt`, `sample.ts` l. 46-54); V9 impide que ese llano acumule 2.000 m o coloque una rampa que `deriveFinishTerrain` (`finish.ts` l. 71-135, racha con `g ≥ 3`) leería como cota de meta. Cuarta: los vetos no reparan, y por eso `garantizaClase` (sección 8, decisión 10, I-24) corre antes que `verify` y hace tres cosas que hoy nadie hace: mueve el motivo que decide la clase al lado correcto del borde (puerto más largo a ≥ 9,0 en reina y a ≤ 8,0 en media, con `margenClaseKm` 0,3 sobre 8,5), recorta o alarga el valle de la meta a su cubeta con `margenValleKm` 0,7 sobre los cortes 5 y 20 de `FINAL_KIND_CUTS` (`finalKind.ts` l. 30), y guarda «toda cota ≤ 2,9 km en clásica» para que un `ud_muros` cuyo dibujo estire un muro de 2,5 a 3,1 km no cruce `WALL_MAX_KM` 3 (hoy `normalize` lo hace y `classicSegments` no lo vigila, banco §4.5). Con esas tres guardas V6 y V7 son redes que casi nunca se usan; sin ellas serían la causa principal de reintento, y el p95 de `intentos` de §9.8 lo mediría.

### 9.3 V5, el caso v40, recorrido paso a paso

El caso que el dueño citó (epics G6: «para las que no se puedan nunca reproducir, el generador es una basura. Hay que arreglarlo, está pésimo») es `race-jura`: un día, Francia, `terrain: 'mountain'`, y antes de la v40 salía de `mountainSegments` con un final en alto de 9 a 15 km (`profileGen.ts` l. 359-360, mapa 01 §2.5), «algo que no existe en el calendario real», con el 82 % del pelotón a cero (`balance.md` l. 8102-8125, vía `juicios/cobertura.md` §1). La v40 lo arregló con una función más (`mountainClassicSegments`) y una nota de tres párrafos en `calendar.ts` l. 143-152. Con la gramática la regla existe una vez, en V5, y vigila igual cualquier esqueleto de un día que alguien añada después (ingeniero §9.1). El recorrido con el diseño:

1. **Zona.** `regionOf('race-jura', 1, 'FR')` devuelve `RACE_REGION['race-jura'].default`, que la sección 6 cura como `macizo_central`; no hay sorteo de zona (decisión 14).
2. **Esqueleto** (`arch|race-jura`, sección 8). Candidatos con `role: 'un_dia'` y `requiere` satisfecho por `ZONAS.macizo_central` (`puerto !== null`); `terrain: 'mountain'` multiplica `ud_montana` ×4 (sección 5). `ud_montana_alto` pesa `ARCH.pesoPorClase` 0,02 solo en `.1` y solo si `finalesAlto === 'largo'`; en cualquier otra clase pesa 0 y no puede ni sortearse. Sale `ud_montana`: `kind: 'reina'`, `enlace`@[0; 0,4], `puerto`×[2; 3]@[0,4; 0,85], `cota`×[1; 2]@[0,8; 0,97], meta `descenso_meta` o `cima_cerca` con `cotaFinal` de `ARCH.meta.unDiaUltimaCota` (km [1,3; 4,2], g [7; 11], a meta [3; 17]).
3. **Km.** `kmDe('un_dia', raceClass, …)` con `ARCH.km.porClase` (decisión 36): el 210 fijo de hoy (`calendar.ts` l. 917, 66 de 66 carreras .1 en p10 = p50 = p90 = 210, datos §1.3) desaparece desde la temporada 0.
4. **Instanciación** (`mot|…`). Cada `puerto` toma `km` uniforme en la intersección de `ARCH.motivo.puerto.km` [9; 25] con `ZONAS.macizo_central.puerto.km` (el rango exacto lo escribe la sección 6; en `alpes`, que es el caso del test, es [12; 25]); la `cotaFinal` de la meta se sortea en [1,3; 4,2] km al [7; 11] %, y su valle en la intersección del `MetaKind` con `aMeta`: `cima_cerca` en [3; 4,3] y `descenso_meta` en [5,7; 17].
5. **Colocación, rendido, cuadre, garantías, pancartas** (sección 8). `garantizaClase` mueve, si hace falta, el puerto más largo al borde 9,0 con `margenClaseKm` 0,3 y recorta el valle a su cubeta con `margenValleKm` 0,7; `emitirPancartas` marca `cima` en cada puerto y en la última cota.
6. **`verify`**, en su orden. V10 y V15 pasan por construcción del rendido. V6: `stageKindOf` dice `reina/Mountains` porque el puerto más largo mide ≥ 9,0 > `PASS_MIN_KM` 8,5 (`stageKind.ts` l. 90-93) y no muere arriba. V7: `finalKindOf` es `cima_cerca` o `valle_corto`, según la meta instanciada (`finalKindDe`). V1 a V4: `macizo_central` tiene `puerto`, sin adoquín ni sterrato en juego, cimas dentro de `puertoDplusMax.media`. **V5**: (a) la última cota es la `cotaFinal` de la meta, ≤ 4,2 km; (b) `finalKindOf ≠ 'alto'`, así que la cláusula del muro no aplica; (c) `kmAfterLastClimb` ∈ [3; 17]. V8: (a) no aplica (`ud_*`); (b) los dos o tres puertos empiezan antes del 85 % de la etapa y sus tramos que acaban a más de 30 km de meta suman, con 24 a 75 km de puerto contra 1,3 a 4,2 de última cota, mucho más del 25 %. V9 no aplica.

Lo que el generador viejo hacía (9 a 15 km muriendo en meta) dispara V5 dos veces: (a) por longitud y (b) por final en alto. Y lo que `mountainClassicSegments` hace hoy (último puerto de 4 a 8 km con `runIn` de 13 a 22, mapa 01 §2.6) dispara (a) en la mitad superior de su rango y deja fuera, por abajo, la Roche-aux-Faucons de 1,3 km a 13,5 y el Murgil de 2,1 a 7 (mapa 07 §1.6). V5 es el mapa 07 §4.3 escrito en positivo: última subida de 0,4 a 4,2 km, cima a [0; 17] km, y meta arriba solo si es un muro de 1,3 a 2,1 (Huy, San Luca); el 2,2 es el techo de `ARCH.meta.muro.km` (decisión 7). Consecuencia sobre `repecho` en un día: la cláusula (b) obliga a que la meta `repecho` de un esqueleto `ud_*` se instancie en [1; 2,2] km (intersección de `ARCH.meta.repecho.km` [1; 2,9] con V5b); en etapa sigue en [1; 2,9]. La sección 4 lo recoge en la tabla del `MetaKind`.

El test con nombre, en `grammar/veto.test.ts` (paso 5 del plan):

```ts
it('una carrera de un día no muere en un puerto de 14 km (caso v40, ud_montana en alpes)', () => {
  const req = (i: number): StageRequest => ({
    raceId: `test-jura-${i}`,
    stageIndex: 1,
    season: 0,
    km: 235,
    role: 'un_dia',
    terrain: 'mountain',
    geo: ZONAS.alpes,
    raceClass: 'WT',
    format: 'un-dia',
    routeSource: 'generado',
    fixed: { skeleton: 'ud_montana' },
  })
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

it('V5 dispara sobre el perfil literal del generador viejo y calla sobre Lombardía', () => {
  const jura: StageProfile = {
    segments: [
      { km: 196, tipo: 'llano' },
      { km: 14, tipo: 'puerto', tramos: [{ km: 14, g: 8 }] },
    ],
    banners: [{ km: 210, tipo: 'cima' }],
  }
  expect(V5(jura, SKELETONS.ud_montana, reqUnDia, [])?.id).toBe('V5')
  const lombardia = renderCanonico('ud_montana', ZONAS.italia_norte) // San Fermo 2,7 km a 5,5 km
  expect(V5(lombardia, SKELETONS.ud_montana, reqUnDia, SKELETONS.ud_montana.canonico)).toBeNull()
})
```

### 9.4 V8, la lección de `reina-150` como regla

`reina-150` (`sim/scenarios.ts` l. 329-336) son 135 km de `llano` y un `puerto` de 15 km al 8 % con la pancarta en la meta. Sobre ese perfil `TARGETS.mountain.breakawayWinPct` [25; 45] estuvo cinco versiones en verde con un 27 a 30 %, mientras sobre las nueve reinas reales de `realQueens` la fuga ganaba el 3,3 % y en gran vuelta el 0 % (epics E3, pasos 2 a 4, mapa 04 §3.1). La lectura que cerró el caso (balance v43 §7, l. 8618-8631) mide una sola columna: **subida fuera de los últimos 30 km**. La canónica tiene 0 %; las nueve reales, del 6 al 38 % (Colombia e5 13, Tachira e6 18, Spain e7 8, Guatemala e9 13, Catalonia e4 6, Two Seas e4 16, Rhône-Alpes e8 28, Italy e19 33, France e20 38). La conclusión escrita en E3 es que `reina-150` «no es una etapa reina fácil: es media montaña con la etiqueta cambiada», y el patrón se repitió seis veces (mapa 04 §3.3). El diseño la convierte en veto (I-5, I-18, I-32) y no solo en banda: si el generador pudiera producir esa forma con `kind: 'reina'`, el calendario volvería a contener etapas sobre las que el motor se calibra contra algo que no existe.

Por qué 30 km y no otro número: `STAGE.climbRaceKmToGo` es 30 (`constants.ts` l. 3521) y `simulate.ts` l. 2497 lo lee como `raceThisClimb = totalKm − km <= 30`: solo el puerto a 30 km o menos de meta se sube «de verdad» (`climbPaceFraction` 0,12); los de antes se suben a tempo (`climbTempoFraction` 0,5, mapa 03 §4.2). La subida fuera de esa ventana es donde el pelotón no caza a la fuga sino que la sube (mapa 04 §3.1, paso 5), y donde la deriva acumulada deja gente atrás sin que la carrera se rompa por la cota (mapa 03 §10, hecho 3). Es la variable correcta porque es la que el motor usa para cambiar de régimen, y por eso `ARCH.reina.subidaLejanaKm` se define igual a `STAGE.climbRaceKmToGo` y `grammar/veto.test.ts` sella la igualdad («`ARCH.reina.subidaLejanaKm === STAGE.climbRaceKmToGo`»): si el motor mueve la ventana, el veto se mueve con él.

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

V8b exige `subidaLejanaShare ≥ ARCH.reina.subidaLejanaMin` 0,25 en todo esqueleto con `kind: 'reina'`: `et_reina_alto_largo`, `et_reina_alto_corto`, `et_reina_cima_cerca`, `et_reina_valle`, `et_reina_encadenada`, `et_montana_corta`, `et_reina_blanda` (la cola baja de la decisión 8, con su `cota`×[1; 2]@[0,15; 0,6] de 5 a 8 km contra un `alto_largo` de 9 a 12: la peor combinación, una cota de 5 y una meta de 12, da 0,29), `ud_montana` y `ud_montana_alto` (que por eso lleva su `puerto` con `n: [1; 1]` y no `[0; 1]`: con `puerto`×0 sería literalmente `reina-150` con 100 km de enlace, y la sección 5 lo fija así). El denominador es el km de subida de la etapa y no el km total: separa «toda la subida está al final» de «la subida está repartida» con independencia de si la etapa mide 120 o 220 km, que es lo que distingue una reina de una media con la etiqueta cambiada. La columna de v43 §7 usa otro denominador (el km de etapa) y `routeCensus` imprime las dos, `climbKmOutsideLast30` en km y como fracción del km total, para que la tabla de v43 siga siendo comparable; la banda de calendario de la sección 13 («ninguna reina en 0 %, p10 ≥ 5 %») se lee sobre la fracción del km total, como v43. V8a es la definición de reina que `stageKindOf` no puede dar (la red de 3.200 m «existe para los recorridos REALES», `stageKind.ts` l. 56-58): puerto de meta ≥ 9 km, o dos puertos ≥ 9, o 3.400 m con relleno (`dPlusDe`, decisión 9). `et_reina_blanda` queda fuera de (a) a propósito y dentro de (b) a propósito: es una reina de una semana con un solo puerto, y no puede ser una reina con todo el puerto en la meta.

El test con nombre:

```ts
it('reina-150 expresada como esqueleto no pasa verify (la lección de E3 como regla)', () => {
  const reina150: StageProfile = {
    segments: [
      { km: 135, tipo: 'llano' },
      { km: 15, tipo: 'puerto', tramos: [{ km: 15, g: 8 }] },
    ],
    banners: [{ km: 150, tipo: 'cima' }],
  } // sim/scenarios.ts l. 332-336
  const sk = SKELETONS.et_reina_alto_largo
  expect(stageKindOf(reina150, false).kind).toBe('reina') // el clasificador la deja pasar: 15 ≥ 8,5
  expect(V8(reina150, sk, reqReina(150), [])).toEqual({
    id: 'V8',
    detalle: expect.stringContaining('lejana 0 %'),
  })
  expect(subidaLejanaShare(reina150)).toBe(0)
  // La plantilla 3 del mapa 07 §5 (reina-175-4800, sección 13) sí pasa: 12 + 17 + 10 km de puerto a 45, 95 y 130 → 39 de 54,8 = 0,71
  expect(
    V8(renderCanonico('et_reina_alto_largo', ZONAS.pirineos), sk, reqReina(175), sk.canonico),
  ).toBeNull()
})
```

### 9.5 V12, el anti-clon calibrado sobre pares reales

El hallazgo 2 de agenda §4.18 es que «dos clásicas distintas se parecen aunque sus rampas no coincidan en un solo número», y el mapa 04 §5.2 propone medirlo con la correlación de los vectores de `g` por km entre pares de etapas del mismo tipo y longitud ± 10 %, con criterio «mediana < 0,8». Ese 0,8, y el 0,9 de arquitectura §9, son números sin dueño; el diseño toma el método de datos §10.2 (I-12, I-39): **el tope es tan parecido como dos carreras reales distintas de la misma familia, no más**. `profileCorrelation(a, b)` (`geometry.ts`) construye para cada perfil el vector de `g` medio por kilómetro a partir de los tramos (integración por km, sin `sampleProfile`: es geometría de `routes/`), normaliza el eje a [0; 1] desde la meta (así dos etapas de 235 y 255 km comparan el final con el final) y devuelve la correlación de Pearson. `RouteStats.huella` es ese vector, así que V12 corre sobre el censo sin volver a leer perfiles.

Calibración (paso 9 del plan, con `scripts/medir-real.mjs` como instrumento, decisión 40): sobre las 177 etapas reales se forman todos los pares con el mismo `stageKindOf().kind`, el mismo `finalKindOf()` y km dentro de ± 10 %; el p90 de su correlación es `ARCH.anticlon.maxCorrelacion`. Los tres pares nombrados por datos (Ronde y E3, Amstel y Brabant, Lombardía y Lieja) se imprimen aparte como comprobación de sentido si existen en `STAGE_FEATURES`, y si alguno no existe se imprime el aviso y no se sustituye por otro. Hasta esa medida el valor provisional es 0,85, entre el 0,8 de la mediana del mapa 04 y el 0,9 de arquitectura, y se escribe en `constants.ts` con el comentario «provisional hasta v61 §9». V12 exige que ningún par (mismo `skeleton`, misma `zona`, km ± 10 %) lo supere; la banda de variedad de la sección 13 añade la mediana < 0,8 y la correlación entre ediciones consecutivas de una misma carrera en [0,55; 0,9] (sección 10), que no son vetos sino bandas.

### 9.6 V16, medido en el censo y no por intento

V16 es el V7 de arquitectura §9 partido en dos (regla de numeración de §B.4): la mitad que lee `finalKindOf` es V7 y reintenta; la mitad que lee `finishType` es V16 y no reintenta. `finishType(deriveFinishTerrain(sampleProfile(profile)), 50)` decide, con `alto` antes que `muro` (`finish.ts` l. 165-189), el tipo de final que gobierna el remate; el `groupSize` 50 solo separa `sprint_masivo` de `sprint_reducido` (`finish.ts` l. 142, vía arquitectura §4.7) y se fija en `routeCensus` y solo ahí. Si V16 sale en rojo para un `MetaKind` (por ejemplo `muro_meta` ≤ 1,0 km que no da `muro` en el 100 %), lo que se corrige es un rango de `ARCH.meta.*` (`aproxKm`, `aproxAmp`, `gRango`), y se corrige una vez para todo el calendario; no se reintenta una etapa. Es la consecuencia práctica de la decisión 4: `verify` pasa hoy y pasará igual tras cualquier recalibración de `STAGE.finish*`, y si esa recalibración cambia lo que el motor lee de un final, lo dirá V16 en el siguiente `test:rapido` (0,57 s medidos, juicio motor §1) y no un calendario que cambia de dibujo en silencio.

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

Agotados `ARCH.colocacion.maxIntentos` 8, `generateStage` instancia `sk.canonico` con `degradado: true` e `intentos: 8` (sección 8). Que la canónica pasa `verify` en toda zona compatible y en los cinco km de prueba lo sella `skeletons.test.ts` («la plantilla canónica de cada uno de los 32 esqueletos pasa `verify` en cada zona donde `requiere` se cumple», con `fixed.skeleton` y el `Motif[]` literal de la sección 5), y por eso en producción no se vuelve a verificar. El contador vive en `RouteStats.intentos` y `.degradado`, y `ARCH.veto.fallbackMaxShare` fija dos exigencias distintas a propósito: `calendario: 0` (ningún degradado en las 1.418 etapas de las temporadas 0 a 3, en `calendario.test.ts`: un degradado en el calendario es un defecto de parametrización, no un resultado aceptable, banco §4.6) y `testPorEsqueleto: 0,005` (en `skeletons.test.ts`, 300 semillas × zona compatible × 5 km por esqueleto, donde una combinación de borde puede tocar el tope sin que el catálogo esté mal). `ARCH.veto.intentosP95` 3 es la tercera exigencia: si el p95 de `intentos` de un (esqueleto, zona) supera 3, lo que se hace es estrechar los rangos del hueco que dispara (el histograma de §9.7 dice cuál), nunca subir `maxIntentos` (sección 17, riesgo 9), porque más intentos esconden el mismo defecto a más coste de arranque (sección 14).

Los tests de la capa por etapa, todos en `grammar/veto.test.ts` y todos con perfiles literales sin RNG salvo los dos con nombre de §9.3 y §9.4:

```ts
describe.each([
  ['V1', perfilPuertoEnFlandes, perfilPuertoEnAlpes],
  ['V2', perfilAdoquinEnAndes, perfilAdoquinEnFranciaNorte],
  ['V3', perfilTierraEnFlandes, perfilTierraEnItaliaCentro],
  ['V4', perfilPuerto20kmEnColina, perfilPuerto20kmEnAlta],
  ['V5', perfilJura14km, perfilLombardiaSanFermo],
  ['V6', perfilReinaCon84, perfilReinaCon90],
  ['V7', perfilValle203, perfilValle193],
  ['V8', reina150, reina175_4800],
  ['V9', perfilLlana2100m, perfilLlana900m],
  ['V10', perfilSegmento03, perfilSegmento05],
  ['V15', perfilTramo21, perfilTramo16],
] as const)('%s: un perfil que dispara y otro que no', (id, dispara, calla) => {
  it('dispara', () =>
    expect(verify(dispara.profile, dispara.sk, dispara.req, dispara.motivos)?.id).toBe(id))
  it('calla', () => expect(verify(calla.profile, calla.sk, calla.req, calla.motivos)).toBeNull())
})

it('verify solo importa de routes/: ningún símbolo de stage/ ni de sim/', async () => {
  const src = await readFile(new URL('./veto.ts', import.meta.url), 'utf8')
  expect(src).not.toMatch(/from '\.\.\/\.\.\/stage\//)
  expect(src).not.toMatch(/sampleProfile|deriveFinishTerrain|finishType|costBase/)
})
```

El último test es la decisión 4 escrita como aserción: la forma más barata de garantizar que ningún cambio futuro cuele `finishType` en un veto por intento es leer el fichero. Y las dos capas restantes tienen su test en su sitio: V11, V12 y V16 en `sim/routeCensus.test.ts` sobre la temporada 0 (con `it.todo` y la cifra de hoy en el paso 0 del plan para V11 y V16, que hoy están en rojo por definición: 0 de 1.075 muros), y V13 y V14 en `grammar/tour.test.ts` sobre 120 semillas × n × 5 relieves, donde lo que se sella no es que el sorteo acierte sino que la reparación determinista de `composeTour` deje 0 violaciones (sección 7).
