# Propuesta E1 (ángulo ingeniero): el camino más corto que no sea un parche

Propuesta de diseño para `docs/generador.md`. Parte de `packages/engine/src/routes/profileGen.ts` (514 l.) y `calendar.ts` (3.648 l.) tal como están a HEAD (`ENGINE_VERSION` 69, `constants.ts` l. 718) y busca la ruta incremental de menor riesgo que resuelva de verdad los tres hallazgos de `docs/agenda.md` §4.18 (arquitectura variable, geografía, identidad entre ediciones) sin reescribir ni el generador de rasgos reales (`featureProfile.ts`), ni el clasificador (`stageKind.ts`), ni el contrato del motor (`stage/types.ts`). Los siete mapas del scratchpad (`mapas/01` a `07`) son la base de hechos; donde cito una línea es de la versión actual del repositorio y la he leído.

La idea en una frase: **hoy cada función `xxxSegments` escribe segmentos; mañana cada una escribe un ESQUELETO (una lista de motivos con posición) y un único renderizador lo convierte en segmentos con las mismas primitivas de siempre (`climb`, `descent`, `rolling`, `split`, `normalize`, `garantizaPuerto`).** El esqueleto es donde entran la variedad de arquitectura, la geografía y la identidad; el renderizador es donde se queda todo lo que ya funciona. Es un cambio de una capa, no de tres.

---

## 1. Diagnóstico

### 1.1 Lo que falla, con el código delante

1. **La arquitectura la fija el nombre de la función y el kilometraje, no la semilla.** `hillySegments` (profileGen.ts l. 243-261): `nClimbs = km > 170 ? 3 : 2`, cotas `U(3,7)` × `U(4,5; 6,5)`, bajada solo entre cotas, y **siempre** `rolling` tras la última. `hillyUphillSegments` (l. 269-297): `nClimbs = km > 170 ? 2 : 1` más una cota final `U(4; 7,5)` × `U(5; 7,5)`. `classicSegments` (l. 473-490): `nWalls = km > 200 ? 5 : 4`. `cobblesSegments` (l. 493-507): `sectors = [3, 5, 4]`, literal. `mountainSegments` (l. 337-414) y `mountainClassicSegments` (l. 443-470): `midClimbs = km > 165 ? 3 : 2`. Medido en el mapa 01 §4: `hillySegments(170,'x')` tiene 2 puertos y `hillySegments(171,'x')` tiene 3, y la semilla no puede cambiarlo. Las únicas decisiones de forma sorteadas del generador entero son dos y viven en `mountainSegments`: el brazo de desnivel (l. 345) y `finalKind` (l. 355).
2. **El orden de los motivos es siempre el mismo**: relleno, dificultad, bajada, relleno, … (mapa 01 §4). No existe «dos puertos encadenados sin valle», ni «un solo puerto largo con 100 km de llano antes», ni «una cota subida cinco veces», ni «un muro en el último kilómetro»: `docs/balance.md` v60 §12 midió **0 de 1.075 etapas** con final `muro` porque las seis cotas de ≤ 1 km y ≥ 8 % coronan a 12-15 km de meta.
3. **Los rangos son literales en el cuerpo de las funciones.** De `ROUTE` (constants.ts l. 1151-1246) solo cuatro claves entran en `profileGen.ts` (`queenDplusRange`, `queenHighDplusShare`, `queenLowDplusRange`, `queenFinalMix`); todo lo demás (3-7 km de cota, 8-12 % de muro, 2-4 km de sector, 5-8 km de bajada, 13-22 km de run-in) está escrito en la función. Cambiar «una cota de media montaña mide de 3 a 7 km» es editar la l. 247.
4. **El país no llega a nadie.** `buildRace` (calendar.ts l. 886-929) calcula `country = row.country ?? RACE_COUNTRY[row.id]` (l. 889) y lo copia al resultado (l. 898); las tres ramas de construcción llaman a `stagesFromEdition(row.id, edition)` (l. 216), `oneDaySpec(terrain, km, row.id)` (l. 400) o `stageMix(row.stages, row.terrain ?? 'flat', row.id)` (l. 546), y ninguna recibe el país. `nationalChampionships(code, name)` (l. 316-367) construye los cuatro campeonatos de los 133 países con `itt(38, id)`, `itt(30, id)`, `classic(180, id)`, `classic(220, id)`: el de Bélgica y el de Colombia salen de la misma función con distinto hash.
5. **No hay ediciones.** `SEASON_CALENDAR` (l. 3643-3648) es una constante de módulo; `RACE_EDITIONS` (editions.ts l. 25) no lleva año; la semilla de una etapa de edición es `${from}|${to}|${km}` (calendar.ts l. 224) y la de una etapa compuesta `${row.id}|${i}` (l. 550). La carrera del año que viene es exactamente la de este año, y no por diseño sino porque no existe el concepto.
6. **El terreno es una etiqueta única por carrera** (`RaceRow.terrain`, l. 396) reducida a tres para componer (`mixTerrain`, l. 416-420: `hilly` y `classic` a `hilly`; `flat`, `cobbles` e `itt` a `flat`). Una vuelta «de adoquines» se compone como llana.
7. **Hay dos generadores de reina y solo uno está vigilado.** `oneDaySpec('mountain')` va a `mountainOneDay` → `mountainClassicSegments` (calendar.ts l. 149-152); `stagesFromEdition` usa `oneDaySpec` para toda etapa de edición sin rasgos (l. 225). De las 157 reinas del calendario, 52 salen de `mountainSegments`, 51 de `mountainClassicSegments` y 54 de rasgos reales (mapa 06 §1). `stageKind.test.ts` no importa `mountainClassicSegments` (l. 1-11), y el 14 % de sus salidas con los km de test se clasifica `media` (mapa 01 §2.6).

### 1.2 Lo que NO falla, y por eso se conserva

- `climb(rand, len, avg)` (l. 72-82): rampas de pendiente variable, más dura arriba, ruido ±1,2. `descent` (l. 85-93). `rolling` (l. 100-122): ondulación por trozos de 3-6 km, alternancia por paridad. `split` (l. 52-65): reparto con pesos `U(0,7; 1,3)`, redondeo a 0,1, cuadre del último. Son las primitivas «a escala humana» que el SPEC §6.2 pide y las que hacen que el altímetro se vea como una carretera.
- `normalize` (l. 141-177, v64): escala proporcional y reescala tramos; el residuo va al más largo. `garantizaPuerto` (l. 192-233): la garantía de clasificación después de cuadrar. Las dos son exactamente el tipo de invariante que un renderizador necesita al final de la cadena.
- `routeRng` (l. 30-44): FNV-1a + mulberry32, puro. Lo único que le falta es la disciplina de subflujos nominales que ya tiene el motor (`stage/rng.ts` l. 3: «cada fase pide su propio flujo por nombre»).
- `stageKindOf` (stageKind.ts l. 71-98) y `finalKindOf` (finalKind.ts l. 176-183): lectores puros del recorrido. Son la vara, no el problema. Sus umbrales (8,5 km, 3.200 m, 3 km de muro; cortes 0,5 / 5 / 20) se respetan (ver §9.3 para el único caso en que argumento ampliar, y no mover, un umbral).
- `auto(segments)` (calendar.ts l. 93-102): una `cima` al final de cada `puerto`, sin metas volantes inventadas. Se conserva; el esqueleto le añade lo que sí sabe (una cima por paso de circuito).
- `mixRoles` (calendar.ts l. 457-519): el orden «como lo decide un organizador» (crono, última, en medio, garantías) y sus tests de garantías (calendar.test.ts l. 184-246, 120 semillas). No se toca la lógica de papeles; se le añade contexto.

### 1.3 Por qué no basta con «más rangos» ni con «más funciones»

Añadir seis funciones más al estilo de las ocho actuales daría catorce moldes fijos: el dueño diría «ahora son siete» en vez de «tres o cuatro». Y meter el país como un multiplicador de rangos dentro de cada función deja la arquitectura donde está. El problema es estructural: la decisión de FORMA no tiene dónde vivir. Por eso el cambio mínimo que no es parche es introducir la representación intermedia que falta (el esqueleto) y mover a ella las tres decisiones (forma, geografía, identidad), dejando la traducción a segmentos en las primitivas de siempre.

---

## 2. Principios

1. **Una capa nueva, cero capas reescritas.** `Skeleton` entre «qué etapa quiero» y «qué segmentos salen». `featureProfile.ts`, `stageKind.ts`, `finalKind.ts`, `altimetry.ts`, `stage/sample.ts` y el contrato `Segment`/`Ramp` no cambian.
2. **El azar de forma y el azar de detalle van por subflujos distintos.** `rng(`${seed}|esqueleto`)`, `|motivos`, `|relleno`, `|edicion`. Añadir una tirada al esqueleto no redibuja el relleno; cambiar la amplitud del relleno no mueve un puerto. Es la separación que el mapa 01 §4 echa de menos, hecha explícita en el RNG.
3. **El esqueleto es declarativo y verificable ANTES de renderizar.** Las reglas de veto (§9) se comprueban sobre el esqueleto (posiciones, longitudes, pendientes) y sobre el perfil renderizado (`stageKindOf`, `finalKindOf`, `finishType` vía `deriveFinishTerrain`), con reintento determinista acotado.
4. **La geografía restringe y sesga; no dibuja.** Una `RouteGeo` dice qué motivos existen en un sitio, hasta dónde llegan (longitud, pendiente, adoquín, tierra, altitud) y qué familias son frecuentes. La forma concreta la sigue sorteando el esqueleto.
5. **Identidad por carrera, variación por edición, nunca al revés.** Lo que hace reconocible una carrera (familia, motivo firma, circuito, número de sectores) sale de `id`; lo que cambia de un año a otro sale de `id|temporada` y toca una lista corta y explícita de cosas.
6. **Lo real manda.** `STAGE_FEATURES` → `buildFeatureProfile` sin tocar; una etapa de edición sin rasgos hereda km y terreno de la edición y solo elige familia dentro de lo que ese terreno y esa geografía admiten. El calendario declara el origen de cada etapa y `race_routes.route_source` deja de escribir `'generado'` a mano (`packages/db/src/raceRoutes.ts` l. 48-51).
7. **El tipo se lee del recorrido.** `StageSpec.kind` de una etapa generada es `stageKindOf(profile, timeTrial).kind` (R28.1b de `docs/tactica.md`), nunca una etiqueta heredada del papel. La etiqueta (`label`) sí es de la familia. Así el centinela de `apps/api/src/stageHistory.test.ts` l. 175-200 («solo cambia la etiqueta, nunca el tipo») queda satisfecho por construcción.
8. **Todo rango con nombre e intención en `ROUTE`.** Ningún literal de forma en el cuerpo de una función (`docs/balance.md` es donde se anota cada cambio).
9. **Cada paso deja el banco en verde o re-sellado con causa escrita.** Ningún invariante se afloja; los que se muevan a propósito se remiden con más semillas que las del CI antes de mover la banda (regla de `targets.ts` l. 693-706).
10. **Se sacrifica lo que exige tocar el contrato del motor** (altitud, exposición al viento, anchura, circuitos como noción del simulador). Se deja un gancho y se dice por qué (§13).

---

## 3. El modelo

### 3.1 Los tipos nuevos (`packages/engine/src/routes/skeleton.ts`)

```ts
import type { FinalKind } from './finalKind.js'
import type { StageKind } from './testTour.js'

/** Un motivo del recorrido: la unidad de ARQUITECTURA (lo que la semilla de forma decide). */
export type Motif =
  /** Puerto de verdad (≥ ROUTE.motif.puertoMinKm). Se renderiza con `climb`. */
  | { tipo: 'puerto'; lenKm: number; g: number }
  /** Muro corto y explosivo (≤ ROUTE.motif.muroMaxKm). `paved` lo marca adoquinado: sigue siendo `puerto` para el motor (fuentes-recorridos.md regla 5). */
  | { tipo: 'muro'; lenKm: number; g: number; paved?: boolean }
  /** Sector de pavé o de tierra: `paves` con estrellas. `tierra` es solo etiqueta (mismo bloque físico). */
  | { tipo: 'sector'; lenKm: number; estrellas: number; tierra?: boolean }
  /** Bajada explícita (si no se declara, el renderizador pone la bajada canónica tras un puerto). */
  | { tipo: 'bajada'; lenKm: number; g: number }
  /** Carretera anónima de amplitud dada; el renderizador la parte en `rolling`. */
  | { tipo: 'enlace'; lenKm: number; amp: number }

/** Un motivo colocado: dónde EMPIEZA, en km desde la salida. Los enlaces no se colocan: se deducen. */
export interface PlacedMotif {
  atKm: number
  motif: Motif
}

/** Familia de arquitectura: el «modelo» que el dueño echa de menos. Es dato, no código. */
export type FamilyId =
  // un día
  | 'llana_esprint'
  | 'llana_cota_lejana'
  | 'circuito_cotas'
  | 'muros_encadenados'
  | 'adoquin_densidad'
  | 'muro_final'
  | 'montana_un_dia'
  // vuelta por etapas (papeles de `mixRoles`)
  | 'llana'
  | 'media_valle'
  | 'media_muros'
  | 'media_circuito_final'
  | 'media_alto_corto'
  | 'media_muro_final'
  | 'reina_alto_largo'
  | 'reina_alto_corto'
  | 'reina_valle'
  | 'reina_encadenada'
  | 'reina_corta'
  | 'cri_llana'
  | 'cri_quebrada'
  | 'prologo'
  | 'cronoescalada'

/** El esqueleto: lo que hay ANTES de los segmentos. Es serializable (se puede congelar en un test). */
export interface Skeleton {
  family: FamilyId
  km: number
  timeTrial: boolean
  /** Motivos colocados en orden creciente de `atKm`; el último puede terminar en `km` (meta arriba). */
  motifs: PlacedMotif[]
  /** Amplitud del relleno entre motivos (la de `rolling`, por geografía y familia). */
  fillAmp: number
  /** Si la familia repite un bucle: km del bucle y vueltas. Solo informativo para el relato y los banners. */
  circuit?: { lapKm: number; laps: number }
  /** Lo que el esqueleto PROMETE del perfil renderizado; el verificador lo comprueba. */
  contract: SkeletonContract
}

/** Lo que el verificador exige del perfil renderizado (§4.5). */
export interface SkeletonContract {
  kind: StageKind
  finalKind?: FinalKind
  /** `muro`, `alto`, `puncheur`, `sprint` según `finishType`; solo se exige cuando la familia lo promete. */
  finish?: 'muro' | 'alto' | 'puncheur' | 'sprint'
  longestClimbKm: { min: number; max: number }
  dPlusM?: { min: number; max: number }
}
```

Cómo encaja con `Segment` y `Ramp` (`stage/types.ts` l. 12-42): un `Skeleton` no llega nunca al motor. `renderSkeleton(sk, seed): Segment[]` (§4.4) lo traduce con las primitivas actuales: `puerto` y `muro` → `climb(rand, lenKm, g)` (un `Segment` `puerto` con `tramos`), `bajada` → `descent`, `sector` → `{ km, tipo: 'paves', estrellas }`, `enlace` → `rolling`. Los huecos entre `atKm` consecutivos son enlaces implícitos. El resultado pasa por `normalize` y por las garantías. `auto()` de `calendar.ts` sigue poniendo la pancarta `cima` al final de cada `puerto`, así que los banners no cambian de forma.

### 3.2 El contexto que recibe el generador (`routes/routeContext.ts`)

```ts
import type { RaceClass } from './uci.js'
import type { RaceFormat } from './calendar.js'
import type { GeoKey } from './geo.js'

/** Lo que el generador sabe de la carrera. Hoy sabe km, terreno y semilla; esto es lo que falta. */
export interface RouteContext {
  geo: GeoKey
  raceClass: RaceClass
  format: RaceFormat
  /** Temporada del mundo; 0 es la edición canónica (la de `SEASON_CALENDAR`). */
  season: number
  /** Origen declarado (§10). El generador solo actúa con 'generado' y, acotado, con 'edicion'. */
  origen: 'real' | 'edicion' | 'generado'
}

export const DEFAULT_ROUTE_CONTEXT: RouteContext = {
  geo: 'default',
  raceClass: '2',
  format: 'un-dia',
  season: 0,
  origen: 'generado',
}
```

### 3.3 Lo que cambia en `StageSpec` y en `CalendarStage` (`calendar.ts` l. 33-45)

```ts
export interface StageSpec {
  kind: StageKind
  label: string
  profile: StageProfile
  timeTrial?: boolean
  /** NUEVO. De dónde sale el relieve: rasgos reales, edición real con relieve generado, o todo generado. */
  origen: 'real' | 'edicion' | 'generado'
  /** NUEVO. Solo en lo generado: la familia y el esqueleto, para la ficha, el banco y la depuración. */
  skeleton?: Skeleton
}
```

`skeleton` viaja en el objeto del calendario pero **no** se congela en `race_routes.profile` (que sigue siendo «exactamente el `StageProfile` que el motor recibe», `packages/db/src/schema.ts` l. 509); si la interfaz quiere enseñar la familia de una etapa corrida, la lee de la ficha del calendario o se añade una columna aparte (decisión de E12, §14).

---

## 4. El algoritmo

Entrada: `(km, seed, ctx: RouteContext, request)` donde `request` es `{ terrain }` para una carrera de un día o de edición y `{ role }` para una etapa de `stageMix`. Salida: `StageSpec`. Todo puro.

### 4.1 Subflujos del RNG

| Subflujo    | Semilla         | Qué decide   | Por qué separado                                                                             |
| ----------- | --------------- | ------------ | -------------------------------------------------------------------------------------------- |
| `identidad` | `rng(`${raceId} | identidad`)` | familia por etapa, motivo firma, circuito, nº de sectores (§6)                               | es lo que NO cambia entre ediciones       |
| `esqueleto` | `rng(`${seed}   | esqueleto`)` | nº de motivos, orden, posición relativa, longitudes y pendientes de cada motivo, `finalKind` | la arquitectura                           |
| `edicion`   | `rng(`${seed}   | edicion      | ${season}`)`                                                                                 | la lista corta de variaciones de §6.3     | para que la temporada 3 no redibuje lo que la 2 fijó |
| `relleno`   | `rng(`${seed}   | relleno`)`   | `rolling` (chunks, amplitud, signo), rampas internas de `climb` y `descent`                  | el detalle                                |
| `reintento` | `rng(`${seed}   | reintento    | ${k}`)`                                                                                      | el k-ésimo intento del verificador (§4.5) | acotado y determinista                               |

`seed` sigue siendo la de hoy (`row.id` para un día, `${row.id}|${i}` para `stageMix`, `${from}|${to}|${km}` para ediciones), así que **la identidad de la semilla no cambia**; lo que cambia es que se deriva en cinco flujos. Consecuencia asumida: todos los perfiles generados cambian una vez (subida de `ENGINE_VERSION`, §12 paso 1), igual que en la v64 (`profileGen.ts` l. 316-317).

### 4.2 Paso a paso

1. **Resolver la familia.** `pickFamily(request, ctx, rngIdentidad)`: tabla de pesos por papel o terreno (`ROUTE.families`, §8) multiplicada por el sesgo de la geografía (`geo.familyBias`, §5) y con las familias prohibidas en ese sitio a peso 0. Para una carrera de un día la familia es una propiedad de identidad (se sortea con `identidad`); para una etapa de vuelta también, pero por etapa (`${raceId}|identidad|${i}`).
2. **Construir el esqueleto.** `SKELETON_BUILDERS[family](km, ctx, rngEsqueleto)`: cada familia es una función pequeña (15-40 líneas) que sortea sus motivos DENTRO de los rangos de `ROUTE.motif` recortados por `geo.clamp`. Cada builder decide número, orden y posición. Ejemplos en §4.3.
3. **Aplicar la edición.** `applyEdition(sk, ctx.season, rngEdicion)` (§6.3). Con `season === 0` es la identidad.
4. **Renderizar.** `renderSkeleton(sk, rngRelleno): Segment[]` (§4.4).
5. **Verificar y, si hace falta, reintentar.** `verify(profile, sk.contract)` (§4.5). Si falla, se vuelve al paso 2 con `rng(`${seed}|reintento|${k}`)` hasta `ROUTE.verify.maxRetries` (4). Si todas fallan, se cae a la familia canónica del papel (la que hoy existe: `media_valle` para media, `reina_alto_largo` para reina…) y se anota en el esqueleto `fallback: true` para que el banco de geometría lo cuente (debe ser < 0,5 % del calendario).
6. **Etiquetar.** `kind = stageKindOf(profile, timeTrial).kind`; `label = FAMILY_LABEL[family]` (los rótulos actuales se conservan donde ya existen: `Flat`, `Hills`, `Uphill finish`, `Summit finish`, `Mountains`, `ITT`, `Cobbles`, `Classic`; se añaden `Circuit`, `Wall finish`, `Prologue`, `Hill climb`).

### 4.3 Tres builders, para que se vea la escala del código

Notación: `U(a,b)` es `between(rand, a, b)`; los rangos citados son los de `ROUTE.motif` (§8); `G` es la geografía (`geo.clamp`).

**`circuito_cotas`** (Québec, Montréal, campeonatos nacionales, Japan Cup; mapa 07 §1.1):

```
lapKm   = U(10, 30) recortado a [km/18, km/6]
laps    = round(km / lapKm)                     // 6..18
lineal  = km - laps·lapKm  (si > 0, un tramo de aproximación al principio: enlace)
cotas por vuelta: 1 (p 0,6) o 2 (p 0,4); cada una lenKm U(0,4; 2,5) al U(5, 11) %, muro si ≤ muroMaxKm
posición en la vuelta: cota A en U(0,25; 0,55)·lapKm, cota B (si hay) en U(0,65; 0,85)·lapKm
final: meta a U(1, 4) km de la última cota (cima_cerca), o meta EN la cota si G lo admite y p 0,15 (Emilia)
contract: kind = 'clasica' o 'media' (lo lee stageKindOf), finish = 'puncheur' o 'muro', longest ≤ 3
```

El circuito es solo una forma de colocar motivos repetidos; el motor no sabe de vueltas. Pero el jugador SÍ: en el altímetro y en el relato el mismo muro sale diez veces, y en la carrera las diez pasadas por el mismo `puerto` con `cima` acumulan selección, que es exactamente el mecanismo de la vida real (mapa 07 §1.1).

**`muros_encadenados`** (Flandes, Limburgo, Brabante, Strade; solo con `G.muros ≥ 0,5`):

```
nMuros  = round(U(8, 20)·G.muros)                 // hoy son 4-5
paved   = fracción U(0,3; 0,7) de los muros adoquinados si G.adoquin > 0; tierra si G.sterrato > 0
sectores llanos: n = round(U(3, 10)·G.adoquin), lenKm U(0,5; 2,5), estrellas U(2, 4)
distribución: 25 % de los muros en el primer 55 % de la etapa, 75 % en el resto; los tres últimos en los últimos 30 km
último muro a U(2, 15) km de meta (Paterberg a 13, Bosberg a 12, Schavei a 1)
muros: lenKm U(0,3; 2,5) al U(6, 13) %, con p 0,25 un «Kwaremont» de 2,2 km al 4 % adoquinado
contract: kind = 'clasica', longest ≤ 3, dPlus 1.400-3.600
```

**`montana_un_dia`** (Lombardía, Lieja, San Sebastián; mapa 07 §1.6 y §4.3):

```
puertos grandes: n = 2 o 3 (p 0,5/0,5), lenKm U(5, 13)·G.puertoEscala al U(5,5; 7,5) %, todos entre el 35 % y el 85 % de la etapa
último puerto: lenKm U(1,3; 8) al U(7, 11) %, cima a runIn = U(3, 25) km de meta
remate opcional (p 0,4): cota U(1, 3) km al U(6, 8) % dentro del run-in, cima a U(3, 7) km de meta
contract: kind = 'reina' (por Ghisallo: longest ≥ 8,5) o 'media' si G recorta los puertos por debajo; finalKind ∈ {cima_cerca, valle_corto, valle_largo}; NUNCA 'alto' (veto V1)
```

Es `mountainClassicSegments` con las tres correcciones que el mapa 07 §1.6 pide (último puerto desde 1,3 km, run-in desde 3 km, cota de remate) y con la arquitectura sorteada.

Los demás builders siguen el mismo patrón y se listan con sus rangos en §8. `llana` y `cri_llana` son `rolling` puro (lo de hoy) con un motivo opcional «cota lejana» (p 0,3, U(2, 6) km al U(3, 5) %, cima a más de 60 km de meta).

### 4.4 El renderizador (`routes/render.ts`)

```
renderSkeleton(sk, rand):
  segs = []
  cursor = 0
  para cada PlacedMotif m en orden:
    hueco = m.atKm - cursor
    si hueco ≥ 0,5: segs += rolling(rand, hueco, sk.fillAmp)          // enlace implícito
    según m.motif.tipo:
      puerto / muro: segs += climb(rand, lenKm, g)
                     si NO es el último motivo y el siguiente no es 'bajada' y no empieza pegado (hueco siguiente ≥ 1):
                       segs += descent(rand, bajadaCanonica(lenKm, g), ROUTE.motif.bajadaG)   // como hoy, 5-8 km al 6 %
      sector:        segs += { km: lenKm, tipo: 'paves', estrellas }
      bajada:        segs += descent(rand, lenKm, g)
      enlace:        segs += rolling(rand, lenKm, amp)
    cursor = fin del motivo (+ bajada si la puso)
  si km - cursor ≥ 0,5: segs += rolling(rand, km - cursor, sk.fillAmp)  // llano final o nada si muere arriba
  segs = normalize(segs, km)
  segs = garantizaPuerto(segs, sk.contract.longestClimbKm.min, sk.contract.longestClimbKm.max)
  devuelve segs
```

Tres cambios respecto a hoy, todos pequeños:

- **`rolling` recibe la amplitud como número** (hoy `bumpy: boolean`, l. 100). `bumpy=false` equivale a 1,8 y `bumpy=true` a 3,2; la geografía y la familia la fijan (§5.2). Y **deja de emitir `rompepiernas`** (l. 119): `stage/sample.ts` l. 100-101 lo colapsa a llano con `g` fijo 1,5 ignorando los tramos, así que hoy el generador escribe pendientes que la física no lee. Se escribe `llano` con tramos, que sí se leen. `kmSubida` no se toca (cuenta bloques `subida`, o sea segmentos `puerto`).
- **`climb` acepta pendiente máxima explícita** para los muros: `climb(rand, len, avg, { gMax })`, porque el ruido ±1,2 y la progresión +1,6 sobre un muro al 12 % daban rampas al 14,8 % (mapa 01 §2.4); con `gMax` (`ROUTE.motif.muroGMax` 16) queda acotado y sigue siendo un muro.
- **La bajada canónica se calcula por desnivel**: `bajadaKm = clamp(lenKm·g·10 / 55, 2, 10)` (la regla de `mountainClassicSegments` l. 467, que pierde el 85 % de lo subido a ~5,5 %), en vez de `U(5, 8)` fijo. Dos puertos encadenados sin valle (`reina_encadenada`) se consiguen colocando el segundo motivo con `hueco < 1`.

`normalize` y `garantizaPuerto` se usan tal cual. Lo único que el verificador añade después es comprobar que la suma de tramos de cada `puerto` coincide con `segment.km` a 0,1 (el borde de 3 de 1.500 del mapa 01 §5.1: `garantizaPuerto` fija `segment.km` y `climbSize` suma tramos), y si no coincide, corregir el último tramo (mismo mecanismo que `normalize` l. 169-173).

### 4.5 El verificador (`routes/verify.ts`)

Puro, cuesta lo que cuesta recorrer segmentos. Comprueba, en este orden y devolviendo el primer fallo con nombre:

1. `Σ km` igual a `sk.km` con error < 0,05 (contrato con `calendar.test.ts` l. 162-174).
2. `stageKindOf(profile, timeTrial).kind === contract.kind`.
3. Si `contract.finalKind`: `finalKindOf(profile)` coincide. Como los cortes van con `≤` (finalKind.ts l. 179-182) y `auto()` redondea el km de la pancarta, el esqueleto coloca valles con **holgura de 0,7 km** respecto a los cortes 5 y 20 (`ROUTE.verify.finalKindMarginKm`), que es lo que hoy falta (4 de 6.000 cubetas cruzadas, mapa 01 §2.5).
4. Si `contract.finish`: `finishType(deriveFinishTerrain(sampleProfile(profile)), 30)` coincide. Es la única llamada al motor y es la que garantiza que un `media_muro_final` produce de verdad el `muro` que `stage/finish.ts` l. 180-188 define (cota ≤ `muroMaxKm` 1 km, ≥ `muroMinGradient` 8 %, cima a ≤ `finishSummitKm` 0,6 km) y no un `puncheur`.
5. Longitud del puerto más largo dentro de `contract.longestClimbKm` (medida con `climbSize`, la misma de `stageKind.ts` l. 36-42).
6. Las reglas de veto de §9 que se leen del perfil (V1, V2, V5, V6).

Reintento: hasta 4 con el subflujo `reintento`; el fallback a la familia canónica del papel es el último recurso y queda contado. En los tests de geometría (§11.3) `fallback` y `retries > 0` se miden por familia; el criterio es fallback < 0,5 % y reintentos < 10 %.

---

## 5. La geografía

### 5.1 Cómo entra el país por la firma

El país ya está en `buildRace` (l. 889). El cambio de firmas, en orden de llamada:

```ts
// calendar.ts
function buildRace(row: RaceRow): CalendarRace // igual; calcula ctx y lo pasa
function oneDaySpec(terrain: Terrain, km: number, seed: string, ctx: RouteContext): StageSpec
function featureSpec(terrain, km, features, seed): StageSpec // igual; añade origen: 'real'
export function stageMix(
  n: number,
  terrain: Terrain,
  seedBase: string,
  ctx: RouteContext = DEFAULT_ROUTE_CONTEXT,
): StageSpec[]
function stagesFromEdition(id: string, edition: RaceEdition, ctx: RouteContext): CalendarStage[]
function nationalChampionships(code: string, name: string): CalendarRace[] // igual; ctx = { geo: geoOfCountry(code), raceClass: 'NC', format: 'un-dia', … }
// profileGen.ts (fachada de compatibilidad, §12 paso 1)
export function flatSegments(km: number, seed: string, ctx?: RouteContext): Segment[] // y las otras siete igual
```

`stageMix` conserva el valor por defecto para que `calendar.test.ts` l. 184-277 y `stageKind.test.ts` compilen sin tocarlos en el paso 1; a partir del paso 3 los tests nuevos pasan `ctx` explícito. `RaceRow` gana `geo?: GeoKey` (override por carrera) y `buildRace` hace `geo = row.geo ?? geoOfCountry(country)`.

### 5.2 `RouteGeo` (`routes/geo.ts`)

Modelo deliberadamente pequeño, con la misma filosofía que `world/climate.ts` (l. 1-21: «cada país cae en una ZONA», «cuando el calendario sepa la REGIÓN de cada carrera, esto se afina sin tocar nada más»):

```ts
export type GeoKey =
  | 'flandes'
  | 'ardenas'
  | 'atlantico_colinas'
  | 'padana_prealpes'
  | 'apeninos'
  | 'alpes'
  | 'pirineos'
  | 'dolomitas'
  | 'cantabrico'
  | 'meseta'
  | 'sierras_sur'
  | 'levante'
  | 'centroeuropa'
  | 'nordico'
  | 'balcanes'
  | 'andes'
  | 'desierto'
  | 'tropical'
  | 'oceania'
  | 'norteamerica'
  | 'default'

export interface RouteGeo {
  /** Techo del puerto más largo que existe aquí (km) y de su pendiente media (%). */
  puertoMaxKm: number
  puertoGRange: { min: number; max: number }
  /** Escala de longitud de los puertos (1 = referencia alpina): Flandes 0, Andes 1,6. */
  puertoEscala: number
  /** Peso de los muros cortos (0 = no existen). */
  muros: number
  /** Peso del adoquín llano (0 = no existe) y de la tierra. */
  adoquin: number
  sterrato: number
  /** Amplitud del relleno (`rolling`): 1,2 pólder, 1,8 llanura, 3,2 media montaña, 3,8 valles alpinos. */
  fillAmp: number
  /** Techo de desnivel de una etapa en línea (m); veto V5. */
  dPlusMax: number
  /** Sesgo multiplicativo sobre las familias (las ausentes valen 1; 0 prohíbe). */
  familyBias: Partial<Record<FamilyId, number>>
}
```

Tabla inicial (valores de partida, de las 25 firmas del mapa 07 §3; el dueño los puede ajustar, y cada uno lleva su intención en el fichero):

| GeoKey                                            | puertoMaxKm | puertoG | escala | muros | adoquin | sterrato | fillAmp | dPlusMax | familyBias (lo que no es 1)                                                                                             |
| ------------------------------------------------- | ----------: | ------- | -----: | ----: | ------: | -------: | ------: | -------: | ----------------------------------------------------------------------------------------------------------------------- |
| flandes                                           |         2,5 | 4-13    |      0 |   1,0 |     1,0 |      0,1 |     1,2 |    2.600 | muros_encadenados 3, adoquin_densidad 2, llana_esprint 1,5, montana_un_dia 0, reina_* 0, media_muros 3, media_valle 0,3 |
| ardenas                                           |           5 | 5-11    |    0,4 |   1,0 |     0,1 |        0 |     3,0 |    4.500 | muros_encadenados 2, montana_un_dia 1,5 (con puertos ≤ 5), reina_alto_largo 0, media_muros 2                            |
| atlantico_colinas (Bretaña, GB, IE, DK, PT norte) |           9 | 5-10    |    0,5 |   0,8 |     0,2 |      0,3 |     2,6 |    3.500 | circuito_cotas 1,5, muros_encadenados 1,2, reina_alto_largo 0,2                                                         |
| padana_prealpes                                   |          13 | 5-9     |    0,9 |   0,7 |       0 |        0 |     2,2 |    4.900 | montana_un_dia 2, muro_final 1,3, reina_alto_largo 0,6                                                                  |
| apeninos                                          |          15 | 5-9     |    0,9 |   0,8 |     0,1 |      0,8 |     3,0 |    4.500 | muros_encadenados 1,2 (tierra), circuito_cotas 1,3, muro_final 1,5                                                      |
| alpes                                             |          25 | 5-9     |    1,3 |   0,2 |       0 |        0 |     3,8 |    5.500 | reina_alto_largo 2, reina_encadenada 1,5, reina_valle 1,3, llana_esprint 0,3, muros_encadenados 0                       |
| pirineos                                          |          17 | 6,5-8,5 |    1,1 |   0,2 |       0 |        0 |     3,4 |    5.200 | reina_encadenada 2, reina_alto_largo 1,5, muros_encadenados 0                                                           |
| dolomitas                                         |          14 | 7-12    |    1,0 |   0,3 |       0 |        0 |     3,6 |    5.400 | reina_alto_corto 2, reina_encadenada 1,5                                                                                |
| cantabrico                                        |          15 | 7-10    |    1,0 |   1,0 |       0 |        0 |     3,4 |    4.500 | reina_alto_corto 1,8, media_muros 1,5, llana_esprint 0,3                                                                |
| meseta                                            |          10 | 4-6     |    0,7 |   0,3 |       0 |        0 |     1,8 |    3.000 | llana_esprint 1,8, llana_cota_lejana 1,5, reina_alto_largo 0,3                                                          |
| sierras_sur                                       |          20 | 6-8     |    1,2 |   0,3 |       0 |        0 |     2,4 |    4.500 | reina_alto_largo 1,3, llana_esprint 1,2                                                                                 |
| levante                                           |          22 | 5-12    |    1,0 |   0,8 |       0 |        0 |     2,6 |    4.000 | media_alto_corto 1,5, muro_final 1,3                                                                                    |
| centroeuropa                                      |          12 | 4-8     |    0,8 |   0,4 |     0,2 |        0 |     2,6 |    3.800 | media_valle 1,3, circuito_cotas 1,2                                                                                     |
| nordico                                           |          10 | 6-9     |    0,6 |   0,6 |     0,2 |        0 |     1,8 |    3.000 | llana_esprint 1,5, muros_encadenados 0,5                                                                                |
| balcanes                                          |          23 | 5-7     |    1,2 |   0,2 |       0 |        0 |     2,4 |    4.200 | reina_alto_largo 1,3, llana_esprint 1,2                                                                                 |
| andes                                             |          40 | 4-7     |    1,8 |   0,1 |       0 |        0 |     3,4 |    5.500 | reina_alto_largo 2, reina_valle 1,5, llana_esprint 0,2, muros_encadenados 0, adoquin_densidad 0                         |
| desierto                                          |          20 | 5-7     |    1,0 |   0,3 |       0 |        0 |     1,2 |    2.500 | llana_esprint 3, llana_cota_lejana 0,5, media_valle 0,2, reina_alto_largo 0,8 (un jebel), reina_encadenada 0            |
| tropical                                          |          20 | 5-9     |    1,0 |   0,3 |       0 |        0 |     1,6 |    3.500 | llana_esprint 2, circuito_cotas 1,3, muros_encadenados 0                                                                |
| oceania                                           |         3,5 | 6-11    |    0,4 |   1,0 |       0 |        0 |     2,2 |    2.800 | circuito_cotas 2, media_alto_corto 1,5, reina_alto_largo 0                                                              |
| norteamerica                                      |          30 | 4-9     |    1,3 |   0,4 |       0 |      0,3 |     2,4 |    4.500 | circuito_cotas 1,5, reina_alto_largo 1,2                                                                                |
| default                                           |          12 | 5-8     |    0,9 |   0,5 |       0 |        0 |     2,6 |    4.000 | (todo 1)                                                                                                                |

`GEO_BY_COUNTRY: Record<string, GeoKey>` (BE → flandes, NL → flandes, LU → ardenas, FR → atlantico_colinas, IT → padana_prealpes, ES → meseta, PT → atlantico_colinas, CH/AT → alpes, SI/HR/RS/BA/XK/AL/BG/RO/GR/TR/CY → balcanes, DE/PL/CZ/SK/HU/EE/LT → centroeuropa, DK/NO/SE/FI → nordico, CO/EC/VE/GT → andes, AE/OM/SA/QA/DZ/MA/EG → desierto, MY/TH/IN/RW/CM/BJ/BF/MU/TW/CN(sur)/JP → tropical (Japón y China pueden ir a `default` si se prefiere), AU/NZ → oceania, US/CA → norteamerica, resto → default). Los países que no aparecen en el calendario de equipos solo pasan por los campeonatos nacionales (`COUNTRIES`, 133 entradas), y ahí el fallback `default` es honesto.

`RACE_GEO_OVERRIDE: Record<string, GeoKey>` por id, para los cuatro países que son dos o tres geografías (FR, IT, ES, BE): se rellena con las ciudades de `raceRoutes.ts` (que son reales para las 310 carreras de equipos, mapa 02 §8). Estimación: 40-60 entradas (ejemplos obligados: `race-liege` y `race-fleche` → ardenas; `race-lombardy` → padana_prealpes; las carreras alpinas y pirenaicas de Francia; las vascas y asturianas a cantabrico; Andalucía y Murcia a sierras_sur; Comunidad Valenciana y Baleares a levante). Es dato, va en `geo.ts` con comentario por fila, y lo vigila un test de sanidad (§11.3: ninguna carrera con `terrain: 'cobbles'` en una geo con `adoquin = 0`; hoy las 20 filas `cobbles` caen todas en flandes/atlantico_colinas/padana, mapa 07 §3 consecuencia 1).

### 5.3 Qué hace la geografía y qué no

Hace: (a) prohíbe y sesga familias; (b) recorta rangos de motivos (`min(ROUTE.motif.puertoLenKm.max, geo.puertoMaxKm)`, escala de longitud, pendiente); (c) fija la amplitud del relleno (la «perilla que falta» de `docs/balance.md` engine 3→4, que `RELIEF.rollingAmplitude` ya tiene para los perfiles reales y `profileGen` no); (d) pone techo de desnivel (veto V5); (e) decide si un muro va adoquinado o de tierra.

No hace: viento, altitud, temperatura, anchura. El motor no lee nada de eso del perfil (mapa 03 §5: el viento es un número por etapa y solo muerde en `llano`; el clima sale de `StageInput.lugar`). Un «llano de pólder con viento» es, para el perfil, `llana_esprint` con `fillAmp` 1,2 y sin `rompepiernas`, que es lo máximo que la geografía puede expresar sin tocar `Segment`. Se deja escrito el gancho (`geo.viento`, no consumido) y se cita en §13.

---

## 6. La identidad entre ediciones

### 6.1 Qué existe hoy

`editions.ts` es «una edición de un año concreto» sin clave de temporada (mapa 02 §7): 60 ediciones que se repiten idénticas. Las carreras sin edición se dibujan con `row.id` como semilla y son idénticas también. `race_routes` congela el recorrido el día de la etapa 1 (`calendarRun.ts` l. 1603) y es idempotente. No hay que migrar mundos (se reinician), pero sí conservar la promesa de `recorridoDelMundo.test.ts`: el generador nuevo solo alcanza carreras futuras.

### 6.2 El modelo de identidad

Una carrera generada se define en dos capas:

- **Identidad** (semilla `${id}|identidad`, no depende de la temporada): la familia de cada etapa, el «motivo firma» (el puerto o muro más importante: longitud y pendiente fijas, con nombre estable `Firma de {carrera}` en el relato si E2 lo quiere), el circuito (`lapKm`, `laps`) si la familia lo tiene, el número de sectores si es de adoquín, y la posición aproximada de la meta respecto al firma (`runIn` en una banda de ±3 km). Es lo que hace que «la clásica de Almería» sea reconocible: llana con la misma cota a 40 km de meta cada año.
- **Edición** (semilla `${seed}|edicion|${season}`): lo que cambia de un año a otro, con lista cerrada (§6.3). `season = 0` no aplica nada: es la edición canónica y es la que `SEASON_CALENDAR` sigue exportando, así que todo consumidor que no sabe de temporadas (bancos, tests, `apps/api` cuando no tiene mundo) ve una constante, como hoy.

### 6.3 Las variaciones de edición (todas o ninguna, con probabilidades por temporada)

| Variación                | p por temporada | Qué mueve                                                                                                                                                     | Qué NO mueve                                 |
| ------------------------ | --------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| kilometraje              |             0,6 | `km · U(0,93; 1,07)` (una vuelta: por etapa)                                                                                                                  | la familia, el firma                         |
| orden de los intermedios |            0,35 | permuta dos motivos intermedios que no sean el firma                                                                                                          | posiciones extremas (primer y último motivo) |
| un motivo entra o sale   |            0,25 | añade o quita UN motivo intermedio dentro de los rangos de la familia                                                                                         | el firma y el final                          |
| final                    |             0,2 | `finalKind` dentro del conjunto que la familia admite (una `reina_valle` puede pasar de `valle_corto` a `cima_cerca`; nunca a `alto`, que sería otra familia) | la familia                                   |
| firme de un muro         |            0,15 | un muro cambia de asfalto a adoquín o al revés, si la geo lo admite                                                                                           | número de muros                              |
| circuito                 |             0,3 | `laps ± 1` y `lapKm` recalculado para conservar km                                                                                                            | las cotas de la vuelta                       |

Todo se aplica sobre el `Skeleton` antes de renderizar; el relleno se sortea después con `relleno`, así que dos ediciones con el mismo esqueleto comparten también el ondulado (misma carretera, mismo año de asfalto). El resultado medible (§11.3): correlación de los vectores de pendiente por km entre la edición `s` y la `s+1` de la misma carrera **entre 0,55 y 0,9** (ni copia, ni carrera distinta), y entre dos carreras distintas de la misma familia y geografía **< 0,6**.

### 6.4 Cómo entra la temporada en el código

- `export function calendarForSeason(season: number): CalendarRace[]`, memoizada por temporada en un `Map`. `SEASON_CALENDAR = calendarForSeason(0)`. Las tablas y `buildRace` no cambian; `buildRace(row, season)` pasa `ctx.season`.
- En `packages/db`, `freezeRaceRoute(db, worldId, raceKey, raceId)` (raceRoutes.ts l. 33-56) pasa a `freezeRaceRoute(db, worldId, raceKey, raceId, season)` y busca la carrera en `calendarForSeason(season)`. Es la única llamada que cambia (`calendarRun.ts` l. 1603 ya tiene la temporada del mundo a mano). El fallback `?? stage.profile` (l. 1615) sigue leyendo `SEASON_CALENDAR`, que es la temporada 0; para un mundo nuevo no se da el caso (la tabla existe desde el principio).
- Las etapas con `origen: 'real'` no varían nunca. Las de `origen: 'edicion'` (ciudades reales, relieve generado) **tampoco varían por temporada**: varía solo su detalle de relleno, porque cambiarles la arquitectura conservando la misma salida y meta sería decir que la carrera real cambió de recorrido sin que nadie lo haya verificado (doctrina de `docs/fuentes-recorridos.md`, nada se inventa). Eso deja la variación de edición para las 1.015 etapas inventadas, que es donde el dueño la pide.

---

## 7. Vueltas por etapas (composición)

`mixRoles` (calendar.ts l. 457-519) se conserva entero: crono, última etapa, sorteo con `ROUTE.mixWeights`, garantías. Lo que cambia es lo que hay ANTES (contexto) y DESPUÉS (de papel a familia y km).

### 7.1 Kilometraje por clase

`mixKm` (l. 522-543) usa `ROUTE.kmFlat/kmHilly/kmUphill/kmSummit` sin mirar la clase: una .2 de 5 etapas sale con 165-195 km por etapa, «la vuelta .2 más larga de Europa» (mapa 07 §4.1). Se añade `ROUTE.kmScaleByClass = { WT: 1, Pro: 0,95, '1': 0,9, '2': 0,8, NC: 1 }` y un techo `ROUTE.kmMaxByClass = { '2': 175, '1': 200 }`. Cambia el kilometraje de las 72 vueltas compuestas y por tanto el de todas sus etapas; el contrato con `raceRoutes.test.ts` (número de etapas) no se toca.

### 7.2 De papel a familia

`ROUTE.families.byRole` (§8) da los pesos de familia por papel; `geo.familyBias` los multiplica. Ejemplo `media` en `flandes`: `media_valle` 0,3, `media_muros` 3, `media_circuito_final` 1 → casi siempre muros. Ejemplo `reina` en `andes`: `reina_alto_largo` 2, `reina_valle` 1,5, `reina_encadenada` 1, `reina_alto_corto` 0,3, `reina_corta` 0,5. La semilla es `${raceId}|identidad|${i}`: la etapa 4 de Race Tramuntana es siempre de la misma familia (identidad), aunque la edición mueva sus motivos.

### 7.3 Dos reglas de bloque (las únicas que se añaden a `mixRoles`)

Ambas actúan sobre la lista de papeles ya sorteada, antes de las garantías, y solo con `n ≥ 6`:

1. **La reina no cae antes de la mitad.** Si algún `reina` está en `i < floor(n/2)` y hay una `media` en la segunda mitad, se intercambian. Con `n < 6` no aplica (una .2 de 4 días pone su etapa dura donde puede).
2. **La montaña va en bloque.** Si hay dos o más `reina`/`media-alto` separados por una sola `llana`, con p 0,5 la llana se mueve al hueco anterior (dos etapas duras seguidas, mapa 07 §2.1 regla 4). Los tests de garantías (calendar.test.ts l. 184-246) miran cuenta de etiquetas, no posiciones, así que no se mueven; el test «primera etapa llana» (l. 493 del código) se respeta porque los intercambios no tocan `roles[0]`.

`ROUTE.mixWeights.mountain[reina] = 0,40` no se toca en esta propuesta (decisión del dueño, §14): las vueltas compuestas tienen 2-11 etapas y a esa escala el 40 % es «2-4 reinas en 8», que está en la banda real de una vuelta alpina.

### 7.4 Cronos

`cri` gana tres familias: `cri_llana` (lo de hoy), `cri_quebrada` (relleno con amplitud 3,2 y una cota de U(1, 3) km al U(4, 6) %; p 0,3 en geo con `puertoEscala ≥ 0,7`), `prologo` (3-8 km, solo si `i === 0` y `n ≥ 6`; requiere una tirada más en `mixRoles` para permitir crono en la etapa 0, que hoy nunca la lleva: `roles[0]` es siempre llana, l. 493). `cronoescalada` queda fuera de v1 (§14). El banco `timeTrials` (`sim/timeTrials.ts`, 3 de 5 cronos generadas) se remide (§11).

---

## 8. Constantes

Todas en `constants.ts`, bloque `ROUTE`, con comentario de intención, agrupadas en `ROUTE.motif`, `ROUTE.families`, `ROUTE.geo` (solo los pesos generales; las tablas por geo viven en `routes/geo.ts` como dato), `ROUTE.edition`, `ROUTE.verify`. Los rangos que hoy son literales en `profileGen.ts` se mueven aquí con el MISMO valor donde no hay razón medida para cambiarlo (columna «apoyo»).

| Nombre                                                                          | Valor propuesto                          | Intención                                                   | En qué se apoya                                                                                                                                |
| ------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `motif.puertoMinKm`                                                             | 1,5                                      | por debajo es cuesta, no puerto                             | `CLIMB_MIN_KM` (finalKind.ts l. 131)                                                                                                           |
| `motif.puertoLenKm`                                                             | {min 3, max 25}                          | rango bruto antes de recortar por geo                       | mapa 07 §3 (Alpes hasta 25-29 km)                                                                                                              |
| `motif.puertoG`                                                                 | {min 4, max 12}                          | idem                                                        | mapa 07 §4.2                                                                                                                                   |
| `motif.muroMaxKm`                                                               | 2,5                                      | un muro es corto                                            | `WALL_MAX_KM` 3 (stageKind.ts l. 60) con 0,5 de holgura para el `normalize`                                                                    |
| `motif.muroG`                                                                   | {min 6, max 13}                          | Paterberg 12,9, Cauberg 5,8                                 | mapa 07 §1.3                                                                                                                                   |
| `motif.muroGMax`                                                                | 16                                       | tope de rampa dentro de un muro                             | hoy salían 14,8 (mapa 01 §2.4); real 15-26 en puntas de 100 m, que un tramo de 0,5 km no debe promediar                                        |
| `motif.sectorKm`                                                                | {min 0,3, max 3,7}                       | longitudes de Roubaix                                       | mapa 07 §1.4                                                                                                                                   |
| `motif.sectorEstrellas`                                                         | {min 1, max 5}                           |                                                             | idem                                                                                                                                           |
| `motif.sectoresDensidad`                                                        | {min 8, max 30} por 200 km               | Roubaix 29-31, Le Samyn 12-30                               | idem; hoy 3 fijos                                                                                                                              |
| `motif.bajadaG`                                                                 | 6                                        | pendiente de la bajada canónica                             | hoy 5 y 6 literales (l. 257, 396)                                                                                                              |
| `motif.bajadaKm`                                                                | {min 2, max 10}                          | bajada por desnivel `len·g·10/55` acotada                   | `mountainClassicSegments` l. 467                                                                                                               |
| `motif.fillAmpFlat` / `fillAmpHilly`                                            | 1,8 / 3,2                                | los dos `bumpy` de hoy, ahora nombrados                     | `rolling` l. 105                                                                                                                               |
| `motif.fillChunkKm`                                                             | {min 3, max 6}                           | trozo de `rolling`                                          | l. 102                                                                                                                                         |
| `motif.finalAltoLargoKm`                                                        | {min 8,6, max 22}                        | puerto final de reina larga                                 | suelo de `garantizaPuerto` (l. 387); techo mapa 07 §4.3 (Loze, Bondone son excepciones)                                                        |
| `motif.finalAltoLargoG`                                                         | {min 6,5, max 9,5}                       |                                                             | mapa 07 §4.3 (8-22 km al 6,5-9 %)                                                                                                              |
| `motif.finalAltoCortoKm`                                                        | {min 4, max 7,5}                         | Planche, Xorret, Tre Cime                                   | idem; 7,5 y no 8 por la puerta de 8,5 (hoy l. 276-279)                                                                                         |
| `motif.finalAltoCortoG`                                                         | {min 8, max 12}                          |                                                             | idem                                                                                                                                           |
| `motif.oneDayFinalKm`                                                           | {min 1,3, max 8}                         | último puerto de una clásica de montaña                     | mapa 07 §1.6 (Roche-aux-Faucons 1,3, Civiglio 4,2, hoy 4-8)                                                                                    |
| `motif.oneDayRunInKm`                                                           | {min 3, max 25}                          | cima a meta en un día                                       | mapa 07 §4.3 (0-17 km WT); hoy 13-22                                                                                                           |
| `motif.oneDayRemateP`                                                           | 0,4                                      | cota de remate en el run-in                                 | Lombardía 3 de 4 ediciones (mapa 07 §1.6)                                                                                                      |
| `motif.circuitLapKm`                                                            | {min 10, max 30}                         |                                                             | mapa 07 §1.1                                                                                                                                   |
| `motif.circuitLaps`                                                             | {min 6, max 18}                          |                                                             | idem                                                                                                                                           |
| `motif.cotaLejanaP`                                                             | 0,3                                      | una llana con cota testimonial a > 60 km                    | Sanremo, Almería (mapa 07 §1.5)                                                                                                                |
| `families.byTerrain`                                                            | tabla FamilyId → peso por `RouteTerrain` | familias de un día                                          | §4.2; p. ej. `hilly`: circuito_cotas 1, muros_encadenados 1, muro_final 1, llana_cota_lejana 0,5                                               |
| `families.byRole`                                                               | tabla FamilyId → peso por `MixRole`      | familias de vuelta                                          | `reina`: alto_largo 0,4, alto_corto 0,2, valle 0,25, encadenada 0,1, corta 0,05 (reproduce `queenFinalMix` 0,45 `alto` sumando las dos `alto`) |
| `families.oneDaySummitMaxKm`                                                    | 5                                        | ninguna carrera de un día muere en un puerto de más de 5 km | veto V1, mapa 07 §4.3                                                                                                                          |
| `families.oneDaySummitRareP`                                                    | 0,02                                     | rareza tipo Ventoux, solo .1 y geo con `puertoMaxKm ≥ 15`   | mapa 07 §1.2 (tres carreras sobre doscientas)                                                                                                  |
| `queenDplusRange`, `queenHighDplusShare`, `queenLowDplusRange`, `queenFinalMix` | sin cambio                               |                                                             | v64; `calendarQueens.test.ts` exige la cola baja                                                                                               |
| `kmScaleByClass`                                                                | {WT 1, Pro 0,95, '1' 0,9, '2' 0,8, NC 1} | una .2 corre etapas más cortas                              | mapa 07 §4.1 (.2 por etapas 100-160 km)                                                                                                        |
| `kmMaxByClass`                                                                  | {'2': 175, '1': 200}                     | techo por reglamento                                        | idem (cifra a confirmar, mapa 07 §2.3)                                                                                                         |
| `edition.pKm`, `pOrden`, `pMotivo`, `pFinal`, `pFirme`, `pCircuito`             | 0,6 / 0,35 / 0,25 / 0,2 / 0,15 / 0,3     | §6.3                                                        | propuesta; se mide con la correlación entre ediciones                                                                                          |
| `edition.kmJitter`                                                              | 0,07                                     | ±7 % de km                                                  | Slovenia se desvía hasta 7 km entre ediciones (fuentes-recorridos.md, mapa 05 §6)                                                              |
| `verify.maxRetries`                                                             | 4                                        | reintentos deterministas                                    | coste: 4 renderizados como mucho, geometría pura                                                                                               |
| `verify.finalKindMarginKm`                                                      | 0,7                                      | holgura sobre los cortes 5 y 20                             | mapa 01 §2.5 (valles de 20 estirados a 20,3)                                                                                                   |
| `verify.fallbackMaxShare`                                                       | 0,005                                    | tope de fallbacks en el calendario (test)                   | criterio de diseño                                                                                                                             |
| `geo.blockRulesMinStages`                                                       | 6                                        | las reglas de bloque de §7.3                                | mapa 07 §2.1                                                                                                                                   |

---

## 9. Reglas de veto y plausibilidad

Se comprueban en dos sitios: sobre el esqueleto (baratas, antes de renderizar) y sobre el perfil (las que dependen de `stageKindOf`, `finalKindOf`, `finishType`). Cada una es un test de geometría sobre el calendario entero (§11.3) y una aserción del verificador.

| #   | Regla                                                                                                                                                                                                               | Dónde se comprueba                                                                                           | Caso que la justifica                                                                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | **Una carrera de un día no muere en un puerto de más de 5 km** (`families.oneDaySummitMaxKm`), salvo rareza marcada (`oneDaySummitRareP`, solo `.1`, solo geo alpina o andina, y con etiqueta propia `Hill climb`). | esqueleto: último motivo `puerto` con `lenKm > 5` y `atKm + lenKm ≥ km` → veto                               | **v40**: Race Jura, un día `mountain`, salía de `mountainSegments` con final en alto de 9-15 km, «algo que no existe en el calendario real», 82 % del pelotón a cero (`profileGen.ts` l. 427-441; `docs/balance.md` l. 8102-8125). Hoy lo evita `mountainClassicSegments`; con el esqueleto es una regla y no una función |
| V2  | Una reina con `alto` tiene puerto final ≥ 8,6 km o (≥ 4 km al ≥ 8 % y otro puerto ≥ 8,5 km antes).                                                                                                                  | perfil: `climbSize` del último `puerto`                                                                      | mapa 07 §4.4 regla 2; `garantizaPuerto(…, 8.6)` hoy                                                                                                                                                                                                                                                                       |
| V3  | Adoquín llano solo con `geo.adoquin > 0`; tierra solo con `geo.sterrato > 0`; muro adoquinado solo con `geo.muros > 0 && geo.adoquin > 0`.                                                                          | esqueleto                                                                                                    | mapa 07 §3, consecuencias 1 y 2                                                                                                                                                                                                                                                                                           |
| V4  | Ningún puerto por encima de `geo.puertoMaxKm`; ninguna pendiente media fuera de `geo.puertoGRange`.                                                                                                                 | esqueleto                                                                                                    | mapa 07 §3 (Flandes culmina en 150 m)                                                                                                                                                                                                                                                                                     |
| V5  | Desnivel total ≤ `geo.dPlusMax`; y una `llana` nunca supera 1.800 m sin un puerto de ≥ 5 km.                                                                                                                        | perfil (`desnivelDe` de `calendarQueens.ts` l. 55-59, sumando bloques `subida`, que es lo que el banco mide) | mapa 07 §4.4 regla 10; hoy el relleno solo ya da 661-1.413 m (mapa 01 §1)                                                                                                                                                                                                                                                 |
| V6  | `stageKindOf(profile).kind === contract.kind` y, si la familia lo promete, `finalKindOf` y `finishType`.                                                                                                            | perfil                                                                                                       | los tres bordes sin holgura del mapa 01 §5.1 y el centinela de `stageHistory.test.ts`                                                                                                                                                                                                                                     |
| V7  | Dos motivos no se solapan; hueco mínimo entre sectores de 0,8 km; entre un muro y el siguiente 1 km salvo en `circuito_cotas`.                                                                                      | esqueleto                                                                                                    | `applyCobbles` de featureProfile.ts l. 196-207 ya sanea solapes en lo real                                                                                                                                                                                                                                                |
| V8  | Vuelta: crono ≤ 1 en `n < 15`; `prologo` solo en `i = 0`; sin reina en `i < floor(n/2)` para `n ≥ 6`; ≤ 3 finales en alto en `n ≤ 8`.                                                                               | `mixRoles` + §7.3                                                                                            | mapa 07 §4.4 reglas 6-8                                                                                                                                                                                                                                                                                                   |
| V9  | Ningún `rompepiernas` en la salida del generador.                                                                                                                                                                   | perfil                                                                                                       | `sample.ts` l. 100-101 lo ignora; escribirlo es mentir a la física                                                                                                                                                                                                                                                        |
| V10 | Los km de cada `puerto` coinciden con la suma de sus tramos a 0,1.                                                                                                                                                  | perfil                                                                                                       | borde `garantizaPuerto`/`climbSize` (mapa 01 §5.1)                                                                                                                                                                                                                                                                        |

### 9.1 El caso v40 como prueba de que la regla vive en el sitio correcto

Con el diseño actual, evitar la reina de un día exigió una función nueva y un `label` con nota de tres párrafos (`calendar.ts` l. 143-152). Con esqueletos, `montana_un_dia` no puede producir `alto` porque su `contract.finalKind` excluye `alto` y V1 lo veta antes de renderizar; y si alguien añade una familia nueva de un día, V1 la vigila igual. La regla existe una vez, no una por función.

### 9.2 Plausibilidad (no veto): lo que se mide y se imprime pero no se afirma

Distribución de puertos por etapa (2-5 en reina), posición del primer puerto (20-60 % de la etapa), subida fuera de los últimos 30 km (5-40 % en reinas; hoy la canónica tiene 0 %, mapa 04 §3.2), entropía de `finalKind` por vuelta, correlación entre etapas de la misma familia. Nacen sin banda (regla 4 de `targets.ts` l. 693-706) y se les pone cuando tengan sigma conocida.

### 9.3 Los umbrales del clasificador: por qué no se mueven y el único que se amplía

`PASS_MIN_KM` 8,5, `QUEEN_MIN_CLIMB_METRES` 3.200 y `WALL_MAX_KM` 3 (stageKind.ts l. 60-64) se conservan: son la vara con la que se calibró todo el banco y `stageKind.test.ts` los sella contra los generadores. Lo que se hace es al revés: cada familia declara en su `contract.longestClimbKm` de qué lado de 8,5 cae, y el verificador lo garantiza. El comentario desfasado de stageKind.ts l. 45-54 (banda de reina «9,1-15,0») se reescribe con la tabla nueva medida en el paso 2. El único umbral que se AMPLÍA es de documentación, no de código: `mountainClassicSegments` hoy produce reinas etiquetadas `Mountains` que un 14 % de las veces son `media` (mapa 01 §2.6); con el esqueleto, `montana_un_dia` declara `kind` leído del perfil, así que una clásica de montaña con puertos de 5-8 km en Ardenas será `media / Mountains classic` y una con Ghisallo será `reina / Mountains`, y las dos son correctas.

---

## 10. Lo real frente a lo generado

### 10.1 Prioridad (sin cambios de fondo, con un cambio de firma)

`buildRace` mantiene el orden: edición real (`RACE_EDITIONS`) > rasgos reales (`STAGE_FEATURES`) > generado. Dentro de `stagesFromEdition`, `featureSpec` gana `origen: 'real'`; la rama sin rasgos llama a `oneDaySpec(s.terrain, s.km, seed, { ...ctx, origen: 'edicion' })`, y con `origen: 'edicion'` el generador: conserva km exactos (contrato de `calendar.test.ts` l. 162-174), respeta el terreno de la edición como restricción de familia (un `mountain` de edición elige entre `reina_*`; un `hilly` entre `media_*`; un `cobbles` entre `adoquin_densidad` y `muros_encadenados` con adoquín), usa la geografía, y **no aplica variación de edición** (§6.4). Las tres reinas generadas de `REAL_QUEENS` (Colombia e5, Guatemala e9, Tachira e6, mapa 06 §3.2) pasan a la geo `andes`, lo que por sí solo las acerca al `why` que la lista declara (puertos largos, «47 km rodadores» son un `reina_valle` andino).

### 10.2 La distinción en la interfaz

- `StageSpec.origen` (§3.3) llega a `CalendarStage` y de ahí a `apps/api/src/routes/calendar.ts` (l. 57-66 y 94-107, que ya construyen la ficha con `label` y `kind`): se añade `origen` al JSON de la etapa y de la carrera (`origen` de carrera = `'real'` si todas sus etapas lo son, `'mixto'` si alguna, `'generado'` si ninguna).
- `freezeRaceRoute` (raceRoutes.ts l. 33-56) escribe `routeSource: stage.origen === 'real' ? 'real' : 'generado'` en vez del literal. Es la promesa pendiente del propio comentario (l. 48-51: «`routeSource` nace en el 1b con el campo que lo dice»). El tipo `RouteSource` de la base se conserva con dos valores; si E12 quiere tres, es una migración suya.
- La web enseña un distintivo por etapa: `Real` (rasgos verificados con fuente), `Edición` (ciudades y km reales, relieve generado) y `Generado` (todo inventado), con el mismo vocabulario que `docs/inventario-recorridos.md` (✅ / 🟡 / 🔴), que es «una promesa al jugador y no un detalle» (`docs/encargos.md` E12). La familia (`skeleton.family`) se enseña solo en lo generado, como subtítulo («Clásica de muros encadenados»).
- `scripts/inventario-recorridos.mjs` lee `origen` en vez de deducirlo de `STAGE_FEATURES`/`RACE_EDITIONS` (mapa 02 §9): una sola fuente de verdad.

---

## 11. El banco

### 11.1 Lo que NO se mueve (y no debe moverse)

Las 15 bandas sobre `llana-180`, `reina-150`, `cri-40` y `chronicle` (mapa 04 §4.1), las cuatro huellas selladas (`attribution.test.ts`, `timetrial.test.ts`, `raceRadio.test.ts`), los invariantes 6.17 sintéticos, `grandTour` (20 de 21 etapas de `race-france` reales; la e21 llana generada cambia de detalle y no de forma), los tests de perfiles reales (`featureProfile.test.ts`, `classicRoutes.test.ts`), `finalKind.test.ts`, `recorridoDelMundo.test.ts`. Si alguna se mueve, el cambio ha tocado el motor y no el generador, y se para.

### 11.2 Lo que se mueve a propósito y cómo se re-sella (con causa escrita en el test, como `stageHistory.test.ts` l. 185-190)

| Test / banda                                                                                | Qué pasa                                                                                                                               | Qué se hace                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.test.ts` l. 381 (`ENGINE_VERSION`)                                                   | sube en cada paso que cambie perfiles                                                                                                  | un incremento por paso (§12)                                                                                                                                                                                                                                                                                                                                                                                                       |
| `stageHistory.test.ts` l. 199 (`cambian === 49`)                                            | la cifra cambia                                                                                                                        | re-sellar con la cifra nueva y su causa; con `kind` leído del perfil la cifra debería BAJAR (hoy 49 son etiquetas que contradicen al recorrido)                                                                                                                                                                                                                                                                                    |
| `stageKind.test.ts`                                                                         | hoy sella 8 funciones × 300 perfiles                                                                                                   | se reescribe por familia: cada `FamilyId` × 5 km × 60 semillas × 3 geografías (la más restrictiva, la más permisiva y `default`) debe dar el `kind` de su contrato; se añade `mountainClassicSegments`/`montana_un_dia`, que hoy nadie vigila; se exige que aparezcan las dos etiquetas de reina (l. 87-91)                                                                                                                        |
| `calendar.test.ts` l. 162-174 (km exactos) y l. 269-277 (`Uphill finish` acaba en `puerto`) | se conservan como contrato; el segundo se generaliza a «toda etapa con `contract.finish = 'alto'` o `'muro'` termina en `puerto`»      |                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `calendarQueens.test.ts`                                                                    | la muestra de 27 cambia (25 de 27 no reales redibujadas); la banda 6-30 es vigilancia                                                  | ANTES de mover nada: remedir con 12 semillas (no 4) y anotar en `targets.ts` (que aún cita 2.023 m, mapa 04 §3.4); añadir banda por cubeta de desnivel (el test ya afirma `facil > dura + 10`); si el reparto 60/40 cambia por la geografía (menos reinas blandas en `alpes`, más en `atlantico_colinas`), se comprueba que la cola < 1.500 m sigue poblada por construcción (hoy 32 de 157) y si no, se decide con el dueño (§14) |
| `realQueens` (`invariants.test.ts` l. 770-844)                                              | 3 de 9 son generadas y su `why` ya no describe el perfil (Colombia e5: «47 km rodadores» contra 18 medidos)                            | congelar las tres como `Skeleton` literal en `sim/frozenSkeletons.ts` y renderizarlas desde ahí (`renderSkeleton` es puro): la lista pasa a ser cerrada de verdad, por forma y no por nombre (mapa 04 §4.3 punto 3); se remide `lastGroupPct` y `worstStagePct` con 6 semillas                                                                                                                                                     |
| `smallTours` (l. 855-955; 7 de 10 carreras generadas)                                       | cambia todo: composición, familia, km por clase                                                                                        | remedir las nueve bandas con 8 semillas; separar en el informe la parte de composición (pares de llegadas agrupadas) de la de motor, como la propia banda reconoce (`targets.ts` l. 574-577); `media.stages > 40` se recuenta                                                                                                                                                                                                      |
| saturación de un día (l. 511-552; hoy 3 reinas de un día generadas + 5 nacionales)          | el conjunto de las 8 más duras cambia                                                                                                  | remedir; el criterio (vaciado ≤ 0,96, pájaras ≤ 14 %) se conserva, y V1 hace que ninguna sea un final en alto largo                                                                                                                                                                                                                                                                                                                |
| `timeTrials` (l. 222-273; 3 de 5 generadas)                                                 | `cri_quebrada` y `prologo` mueven longitud y relieve                                                                                   | remedir `tailPct` y `worstStagePct`; nc-co-itt con geo `andes` puede ser `cri_quebrada`                                                                                                                                                                                                                                                                                                                                            |
| `coherence.test.ts` Race Jaén, `journal.test.ts` Race Tramuntana                            | listones de cero sobre perfiles generados                                                                                              | correr; lo que aflore es del motor, se arregla y no se afloja                                                                                                                                                                                                                                                                                                                                                                      |
| `raceRoutes.test.ts`                                                                        | número de etapas                                                                                                                       | no cambia (`mixRoles` conserva `n`)                                                                                                                                                                                                                                                                                                                                                                                                |
| `world.test.ts`                                                                             | lee `kind`; con `kind` leído del perfil algunas `media` de Flandes pasan a `clasica` (`RACE_DAY_TSS.clasica` 160 frente a `media` 145) | correr; si una banda de población se mueve por esto, se anota                                                                                                                                                                                                                                                                                                                                                                      |

### 11.3 El banco de geometría (nuevo, `routes/geometry.test.ts`, corre en `test:rapido` en cada push)

Coste ≈ 0 (recorrer 1.418 perfiles). Afirma sobre `calendarForSeason(0)` y sobre 1 y 2:

Realismo (contra las referencias del mapa 07 y del mapa 04 §5.1):

- V1-V10 se cumplen en las 1.418 etapas; `fallback` < 0,5 %; reintentos < 10 % por familia.
- Mix de `finalKind` por familia dentro de ±0,08 del que declara `families.byRole` (lo que `docs/tactica.md` R28.2 pedía y nadie selló, mapa 06 §6.2).
- Reinas: subida fuera de los últimos 30 km en 5-40 % de los km, ninguna en 0 %.
- Km tras la última cota: p90 de `montana_un_dia` en 15-25; `reina_alto_*` en 0.
- Distribución de desnivel de reinas por formato: la cubeta < 1.500 m no vacía; p50 por encima de 2.400 en geo `alpes`/`pirineos`/`andes`.
- Finales `muro` existentes: ≥ 1 % del calendario en línea (hoy 0 de 1.075).

Variedad (mapa 04 §5.2):

- Entropía de familia por papel y por geo: ninguna familia por encima del 60 % dentro de un papel en `default`.
- Correlación de los vectores `g` por km entre pares de etapas de la misma familia, misma geo y km ±10 %: mediana < 0,6 (una reina no es otra reina desplazada).
- Entre edición 0 y 1 de la misma carrera: mediana en [0,55; 0,9].
- Nº de puertos por reina 2-5; posición del primero repartida (ningún decil de la etapa con más del 35 % de los primeros puertos).
- Vueltas de 5: ninguna secuencia de papeles por encima del 25 % (ya sugerido en mapa 04 §5.2).

Sanidad de dato: ninguna fila `terrain: 'cobbles'` en una geo con `adoquin = 0`; todos los ids de `RACE_GEO_OVERRIDE` existen; toda geo de `GEO_BY_COUNTRY` existe en `ROUTE_GEO`.

### 11.4 Cómo se decide que el generador nuevo es MEJOR y no solo distinto

Pareado (mismo `worldSeed`, mismo campo, misma semilla de etapa, `engineVersion: 1` fijo en la semilla como hace `realQueens.ts` l. 179-182), viejo contra nuevo, sobre las tres muestras que ya existen (`calendarQueens` 27 × 12, `smallTours` 10 × 8, saturación 8 × 3) más la geometría del calendario entero. El generador es mejor si: (a) todas las métricas de realismo de §11.3 pasan (hoy fallan al menos cinco: finales `muro` 0, subida fuera de 30 km 0 % en muchas reinas, 3 sectores en toda clásica de adoquín, 4-5 muros en toda flamenca, mismo kilometraje por clase); (b) las de variedad pasan (hoy la correlación intra-familia es alta por construcción); (c) las bandas de §11.2 se remiden y se mueven en la dirección que la carretera dice (colas más cortas con más valle, fuga más viva en montaña blanda, más grupos en media con muros) y ninguna canónica de §11.1 se mueve; (d) `distinctWinnerPct` de `winShare` no baja. Todo se anota en `docs/balance.md` con la tabla pareada, como hizo la v49 con la brecha 1.º-10.º.

---

## 12. Plan de implementación

Regla común a todos los pasos (Claude.md § Tests y § Código): tests primero; `pnpm typecheck && pnpm test` en verde antes de cerrar; todo cambio de conducta sube `ENGINE_VERSION` y re-sella `index.test.ts` l. 381; cada paso deja una sección `v70 §k` (o la versión que toque) en `docs/balance.md` con lo medido antes y después; los bancos (`test:bancos`) corren en cada push que toque `packages/engine/` (ci.yml l. 112), así que cada paso paga su remedición. Nada de `Math.random` ni `Date.now`. Orden pensado para que cada paso sea entregable y reversible por sí solo.

### Paso 0 · Medida de base (sin cambio de conducta, sin subir versión)

- Tests primero: `routes/geometry.test.ts` con TODAS las métricas de §11.3 escritas pero marcadas `it.todo` las que hoy fallan, y verdes las que hoy pasan (km exactos, V10 con tolerancia 0,2 para documentar los 3 de 1.500).
- Código: `routes/geometry.ts` (puro): `describeProfile(profile)` → {kind, longest, dPlus, kmAfterLastClimb, nClimbs, firstClimbFrac, climbKmOutside30, pavesKm, muroFinish}; `profileCorrelation(a, b)`; `calendarGeometry(calendar)`.
- Entregable: tabla de base en `docs/balance.md` («v70 §0») con las cifras de hoy por familia actual (las del mapa 01 §8 recalculadas desde el repositorio).
- Coste: 1 sesión. Riesgo: ninguno.

### Paso 1 · Esqueleto y renderizador con la arquitectura de HOY (sube versión)

- Tests primero: `routes/skeleton.test.ts` (los ocho builders «legado» producen esqueletos con el mismo número y orden de motivos que la función actual para 300 semillas × 5 km; `renderSkeleton` es determinista y puro; subflujos: cambiar la semilla de `relleno` no mueve `atKm` de ningún motivo, cambiar la de `esqueleto` no cambia la ondulación de un enlace dado); `stageKind.test.ts` sin tocar debe seguir verde (los ocho exports de `profileGen.ts` se conservan como fachada); `verify.test.ts` (V6, V9, V10 con perfiles literales).
- Código: `skeleton.ts` (tipos), `render.ts` (§4.4), `verify.ts` (§4.5), `families/legacy.ts` (ocho builders que reproducen las formas actuales, rangos leídos de `ROUTE.motif` con los valores de hoy), `profileGen.ts` reducido a la fachada y a las primitivas (`climb` con `gMax`, `descent`, `rolling(rand, km, amp)` sin `rompepiernas`, `split`, `normalize`, `garantizaPuerto`); `constants.ts` gana `ROUTE.motif` y `ROUTE.verify`.
- Qué cambia de conducta: todos los perfiles generados (subflujos y sin `rompepiernas`); ninguna forma. `ENGINE_VERSION` 69 → 70. Se re-sellan `stageHistory.test.ts` (cifra), `calendarQueens` (remedida con 12 semillas), `smallTours`, saturación, `timeTrials`, `realQueens` (aún por nombre; el congelado llega en el paso 6).
- `docs/balance.md` «v70 §1»: tabla pareada viejo/nuevo de §11.4, que aquí debe dar «igual dentro del ruido» (es la prueba de que la fontanería no cambia la forma).
- Coste: 2 sesiones. Riesgo: bajo; es el paso que hace posible todo lo demás sin cambiar aún lo que el dueño ve.

### Paso 2 · Familias de un día y `kind` leído del perfil (sube versión)

- Tests primero: en `stageKind.test.ts`, un bloque por familia nueva (`circuito_cotas`, `muros_encadenados`, `adoquin_densidad`, `muro_final`, `llana_cota_lejana`, `montana_un_dia`) × 5 km × 60 semillas, con `kind` de contrato; en `geometry.test.ts` pasan a verdes: finales `muro` ≥ 1 %, densidad de sectores, V1 sobre todo el calendario; `calendar.test.ts` gana «`kind` de toda etapa generada es `stageKindOf(profile)`».
- Código: `families/oneDay.ts` (seis builders), `ROUTE.families.byTerrain`, `oneDaySpec` elige familia con `identidad` (todavía sin geo: `ctx = DEFAULT_ROUTE_CONTEXT`), `kind` leído del perfil, `label` por familia. `mountainOneDay` y su comentario largo (calendar.ts l. 143-152) desaparecen: lo sustituye `montana_un_dia` con V1.
- Conducta: cambian 158 carreras de un día y las 226 etapas de edición sin rasgos (que usan `oneDaySpec`), y los 532 campeonatos (`classic(220, id)` pasa a elegir entre `circuito_cotas` y `muros_encadenados`, que es lo que un nacional es). `ENGINE_VERSION` → 71. Se re-sellan los mismos que en el paso 1 más `coherence` Jaén y `journal` Tramuntana.
- Coste: 2-3 sesiones. Riesgo: medio; es el primer paso que mueve las bandas de verdad, y por eso va ANTES de la geografía: así la remedición separa «familia nueva» de «geo nueva».

### Paso 3 · Geografía (sube versión)

- Tests primero: `geo.test.ts` (toda clave existe; `GEO_BY_COUNTRY` cubre los 56 países del calendario de equipos; sanidad de `RACE_GEO_OVERRIDE`; V3, V4, V5 sobre el calendario entero; las 20 filas `cobbles` en geo con adoquín); en `stageKind.test.ts` cada familia se prueba en tres geos; en `geometry.test.ts`, p50 de desnivel de reinas por geo y entropía de familia por geo.
- Código: `geo.ts` (tabla §5.2 y las dos de país e id), `RouteContext` (§3.2), firmas de §5.1, `RaceRow.geo?`, `nationalChampionships` con geo, `fillAmp` por geo en el renderizador.
- Conducta: cambia lo generado en todos los países cuya geo no sea `default`. `ENGINE_VERSION` → 72. Remedición: `calendarQueens` (aquí es donde el reparto de desnivel puede moverse: decisión del dueño si la cola < 1.500 se vacía, §14), `smallTours`, saturación, `timeTrials` (Colombia).
- Coste: 2 sesiones más 1 de datos (rellenar `RACE_GEO_OVERRIDE` desde `raceRoutes.ts`). Riesgo: medio; el dato de geo es opinable, por eso cada fila lleva comentario y el dueño la puede corregir sin tocar código.

### Paso 4 · Familias de vuelta y composición (sube versión)

- Tests primero: `calendar.test.ts` conserva sus garantías (l. 184-246) y gana: reglas de bloque V8 sobre 120 semillas × n ∈ {6, 8, 10}; `kmScaleByClass` (una .2 de 5 etapas no supera 175 km por etapa); `prologo` solo en `i = 0`; `stageKind.test.ts` por familia de vuelta.
- Código: `families/stageRace.ts` (`llana`, `media_*`, `reina_*`, `cri_*`), `ROUTE.families.byRole`, `mixRoles` con las dos reglas de §7.3 y el hueco de prólogo, `mixKm` con clase, `stageMix` pasa `ctx`.
- Conducta: cambian las 72 vueltas compuestas (325 etapas). `ENGINE_VERSION` → 73. Remedición: `smallTours` (4 de sus 10 carreras son `stageMix`), `calendarQueens` (52 reinas), `world.test.ts` (reparto de `kind`).
- Coste: 2 sesiones. Riesgo: medio-bajo; `mixRoles` no se reescribe.

### Paso 5 · Identidad y edición (sube versión)

- Tests primero: `edition.test.ts`: `calendarForSeason(0)` es idéntico a `SEASON_CALENDAR` (referencia); etapas `real` iguales en toda temporada; etapas `edicion` con mismo esqueleto en toda temporada; etapas generadas: mismo `family` y mismo motivo firma entre temporadas, correlación entre 0 y 1 en [0,55; 0,9], y entre carreras distintas < 0,6; `recorridoDelMundo.test.ts` con temporada.
- Código: `applyEdition` (§6.3), `calendarForSeason` memoizada, `ROUTE.edition`, `freezeRaceRoute(…, season)` y su llamada en `calendarRun.ts` l. 1603.
- Conducta: la temporada 0 no cambia respecto al paso 4 (se afirma en el test), así que el motor no cambia de conducta en la edición canónica; sube igualmente `ENGINE_VERSION` → 74 porque `freezeRaceRoute` cambia qué recorrido congela un mundo en temporada ≥ 1. Remedición: ninguna banda (los bancos corren la temporada 0); se añade al informe de `pnpm sim` la geometría de las temporadas 1 y 2.
- Coste: 1-2 sesiones. Riesgo: bajo; es aditivo.

### Paso 6 · El banco cerrado por forma y la interfaz (sube versión solo si toca el motor; no debería)

- Tests primero: `frozenSkeletons.test.ts` (los tres esqueletos congelados renderizan al `kind` y `finalKind` que su `why` dice); `raceRoutes.test.ts` de db: `route_source` real/generado según `origen`; test de API: la ficha lleva `origen`.
- Código: `sim/frozenSkeletons.ts` (Colombia e5, Guatemala e9, Tachira e6 como `Skeleton` literal, con el `why` reescrito para que describa el perfil); `realQueens.ts` los renderiza; `freezeRaceRoute` escribe `routeSource` desde `origen`; API y web enseñan `origen` y familia; `scripts/inventario-recorridos.mjs` lee `origen`.
- Conducta del motor: ninguna (si la hubiera, es un error y se para). Remedición: `realQueens` con 6 semillas (la lista ya es cerrada por forma).
- Coste: 1-2 sesiones. Riesgo: bajo.

### Paso 7 · Documentación y cierre

- `docs/generador.md` (este diseño convertido en documento de referencia con las tablas finales medidas), `docs/balance.md` con las siete secciones, `docs/motor.md` §V.3 y §10 actualizados (el «generador consciente de la identidad» existe; el 87,5 % sin relieve real sigue, pero ya no es «nunca validado contra nada»: está validado contra las reglas de §9 y las métricas de §11.3), comentario de cabecera de `stageKind.ts` l. 45-54 reescrito con la tabla nueva, comentario de `calendar.ts` l. 2 («28 carreras») corregido.
- Coste: 1 sesión.

Total estimado: 12-15 sesiones, seis subidas de versión, ninguna reescritura de fichero existente salvo `profileGen.ts` (que se reduce) y `mixRoles` (que gana dos reglas).

---

## 13. Riesgos y lo que sacrifico frente a un rediseño completo

### 13.1 Lo que sacrifico, a sabiendas

1. **El contrato del motor no cambia.** Sin altitud, exposición al viento, anchura, curvas ni tierra como terreno propio (`Segment` l. 33-42 sigue con cinco tipos y `sample.ts` lo colapsa a cuatro). Un rediseño completo pondría `roadClass`, `exposure`, `altitudeM` en el perfil (lo que R28.1 «extra» pide) y haría que el abanico pegue donde no hay setos. Compensa no hacerlo aquí porque exigiría tocar `simulate.ts` (8.420 l.), `physics.ts`, `weather.ts` y todos los bancos de viento y clima a la vez que el generador, y el mapa 03 deja claro que el motor no leería nada de eso sin ese trabajo. El gancho queda: `geo.viento` y `Skeleton` son extensibles sin romper nada.
2. **El circuito no existe para el simulador.** `circuito_cotas` es un patrón de colocación; el motor no sabe que la vuelta 12 es la misma carretera que la 3 (no hay «trazado aprendido», ni meta cruzada N veces, ni metas volantes por paso). Compensa porque el efecto que importa (acumulación por repetición de la misma cota) sí se produce con `puerto` + `cima` repetidos.
3. **Geografía por país con override por carrera, no por etapa.** Un Tour que sale de Barcelona lleva `FR` en todas las etapas (mapa 02 §11); sus etapas son reales y no les afecta, pero una vuelta generada de 8 etapas en `FR` tiene una sola geo. Compensa porque el 87 % de las carreras generadas son de un día o de 3-5 etapas en un solo territorio; y `RaceRow.geo` se puede convertir en `geo: GeoKey[]` por etapa más adelante sin tocar el generador (solo `stageMix`).
4. **`stageKindOf` no cambia de umbrales.** Una clásica de montaña con Ghisallo (8,6 km) es `reina` aunque sea de un día. Compensa porque el clasificador es la vara de todo el banco y cambiarla obliga a remedir todo; y la etiqueta sí distingue (`Mountains classic`).
5. **`featureProfile.ts` no se toca.** Su `normalizeTotal` (l. 179-188) sigue estirando el último segmento (lo que `normalize` de profileGen dejó de hacer en v64) y su `rollingFill` tiene amplitud por terreno pero no por geo. Compensa porque son 177 etapas reales con sus propios tests y la deuda está anotada; unificar los dos rellenos es un paso propio (§14).
6. **Sin validación externa de forma.** PCS está vetado (fuentes-recorridos.md); las referencias son las tablas del mapa 07 (conocimiento del calendario, no dato descargado). Las reglas de §9 y las métricas de §11.3 validan contra ESAS referencias, y así se dice en `docs/generador.md`.
7. **Sin Mundial, sin critérium, sin cronoescalada, sin contrarreloj por equipos.** Son familias que el esqueleto admite (una línea en `FamilyId`) y que necesitan decisiones de calendario (E12) o de motor (CRE) que no son de E1.
8. **Los perfiles generados cambian seis veces** (una por paso con versión). Alternativa: un solo paso grande con una sola remedición. No compensa: la remedición pareada por paso es lo que permite atribuir cada movimiento de banda a su causa (familia, geo, composición), que es la lección de E3 (`epics.md` l. 215-237) y del mapa 04 §3.

### 13.2 Riesgos y su mitigación

| Riesgo                                                                                                                                                                                             | Probabilidad      | Mitigación                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El verificador reintenta demasiado y una familia cae en `fallback` con frecuencia (rangos y geo incompatibles, p. ej. `montana_un_dia` en `ardenas` con `puertoMaxKm` 5 no puede llegar a `reina`) | alta en el paso 3 | el contrato de esa familia en esa geo declara `kind: 'media'`; el test por familia × geo lo caza antes de llegar al calendario; `fallbackMaxShare` 0,5 % en el banco de geometría |
| La cola baja de reinas (< 1.500 m) se vacía por la geografía y `calendarQueens.test.ts` l. 62-63 se pone rojo                                                                                      | media             | el 60/40 se conserva en `reina_*`; la geo solo recorta longitudes; si aun así se vacía, es decisión del dueño (§14) y no del test (mapa 06 §6.3)                                  |
| `kind` leído del perfil cambia el reparto de `kind` del calendario y mueve `world.test.ts` o `RACE_DAY_TSS`                                                                                        | media             | se mide en el paso 2 antes de la geo; el reparto esperado es pequeño (las `media` flamencas pasan a `clasica`)                                                                    |
| Las bandas de `smallTours` se mueven por composición y se leen como motor                                                                                                                          | alta              | informe partido composición/motor (§11.2) y tabla pareada por paso                                                                                                                |
| Coste de CI: seis remediciones de bancos de minutos                                                                                                                                                | cierta            | los pasos 1, 5 y 6 no deberían mover bandas (se afirma); los pasos 2, 3 y 4 sí, y son tres, no seis                                                                               |
| `RACE_GEO_OVERRIDE` con errores de dato                                                                                                                                                            | media             | comentario por fila, test de sanidad, y el dueño lo corrige como dato                                                                                                             |
| Regresión de rendimiento por perfiles con más segmentos (30 sectores, 20 muros, 14 pasos de circuito)                                                                                              | baja              | el muestreo es O(n·segmentos) una vez por etapa (mapa 03 §7); 300 segmentos × 2.600 bloques es despreciable frente a bloques × corredores                                         |
| Un consumidor externo de los ocho exports de `profileGen.ts` (la fachada) los llama sin `ctx`                                                                                                      | baja              | la fachada conserva firma y usa `DEFAULT_ROUTE_CONTEXT`; se marca `@deprecated` y se retira en el paso 7 si nadie fuera de tests la usa (`index.ts` no los exporta hoy, l. 20-91) |

---

## 14. Decisiones que son del dueño

1. **El reparto de familias por papel y por terreno** (`ROUTE.families.byRole`, `byTerrain`): los pesos de §8 son propuesta. En particular, cuánta `reina_valle` frente a `reina_alto_*` (hoy `queenFinalMix` 0,45 `alto`, medido real 38,2 % tras v64 y 56,7 % antes; la Vuelta real lleva 8-10 finales en alto de 21 y el Tour 4-5).
2. **La cola baja de reinas** (`queenHighDplusShare` 0,6, `queenLowDplusRange` 1.200-2.500): si con la geografía las reinas alpinas suben y la cola queda solo en `atlantico_colinas` y `centroeuropa`, ¿se conserva el 40 % global o se acepta que sea por geo? `calendarQueens.test.ts` hoy decide esto por el dueño (mapa 06 §6.3).
3. **`mixWeights.mountain[reina] = 0,40`**: se deja; el mapa 07 §2.1 dice que dobla lo real para 21 etapas, pero las vueltas compuestas tienen ≤ 11.
4. **La rareza de final en alto largo en un día** (`oneDaySummitRareP` 0,02, solo `.1`): ¿se admite (Ventoux, Mercan'Tour) o se prohíbe del todo (V1 sin excepción)? Propongo admitirla con etiqueta `Hill climb` porque existe y porque es lo que Race Mercantour del calendario es.
5. **Variación de edición**: ¿deben variar las carreras `edicion` (ciudades reales, relieve generado)? Propongo que no (§6.4). Y las probabilidades de §6.3 son propuesta; el dueño puede pedir «casi nunca» (todas a la mitad) o «cada año algo» (como está).
6. **La geografía como dato público**: la tabla de §5.2 lleva juicios (Bélgica es `flandes` salvo override; `JP` y `CN` a `tropical` o `default`). Es dato editable; conviene que el dueño la lea una vez.
7. **Kilometraje por clase** (`kmScaleByClass`, `kmMaxByClass`): las cifras del reglamento UCI están «a confirmar» (mapa 07 §2.3 y §4.1).
8. **Etiquetas nuevas visibles** (`Circuit`, `Wall finish`, `Prologue`, `Hill climb`, `Mountains classic`) y el distintivo `Real / Edición / Generado` en la web: vocabulario de interfaz, y E12 tiene voz.
9. **Unificar `rollingFill` de `featureProfile.ts` con `rolling` del renderizador** (misma amplitud por geo, mismo `normalize`): mejora los 177 perfiles reales y mueve `erosion.longClassicFresh` y `hardestClassicFresh`. Propongo dejarlo como paso 8 opcional, fuera de E1.
10. **Qué hacer con `mountain.breakawayWinPct` y `mountain.top10GapSeconds`** (control de forma sobre `reina-150`): renombrar la clave a `canonicalQueen.*` para que nadie vuelva a leerla como montaña (mapa 04 §4.3 punto 1). No es del generador, pero es el momento.
11. **Presupuesto de CI**: aceptar tres remediciones de bancos (pasos 2, 3, 4) o comprimir 2+3 en una. Propongo tres, por atribución.
