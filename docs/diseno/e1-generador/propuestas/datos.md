# Propuesta E1 (ángulo «aprender de lo real»): un generador de recorridos por ARQUETIPOS extraídos del corpus real

Propuesta de diseño para `docs/generador.md`. Escrita tras leer entero `packages/engine/src/routes/profileGen.ts` (514 l.), `stageKind.ts`, `finalKind.ts`, los tramos de `calendar.ts` que construyen etapas (l. 86-260, 370-560, 886-929), las cabeceras y tipos de `editions.ts`, `raceRoutes.ts`, `classicRoutes.ts`, `stageFeatures.ts` y `featureProfile.ts`, `stage/types.ts`, `stage/rng.ts`, `stage/sample.ts`, `stage/finish.ts` (l. 60-198), el bloque `ROUTE`/`RELIEF` de `constants.ts` (l. 1115-1246), y los siete mapas de `scratchpad/e1/mapas/`. Los números marcados «medido aquí» salen de un script propio (`scratchpad/e1/medir-real.mjs`) corrido contra el `dist` del motor de hoy (`ENGINE_VERSION` 69, `constants.ts` l. 718) sobre las 1.418 etapas de `SEASON_CALENDAR` y las 177 con rasgos reales de `STAGE_FEATURES`. Los demás números citan el mapa o la línea de donde salen.

La idea en una frase: **el repositorio ya tiene 177 etapas reales autorizadas y 41 carreras con procedencia; el generador nuevo no inventa formas, las aprende de ahí**. Cada carrera generada es una variación controlada de un arquetipo (una familia de recorridos reales con una arquitectura común), sorteada dentro de las bandas que el corpus real observa, colocada en la región geográfica que le toca, y estable de una edición a la siguiente. Lo que se mide para saber si el generador nuevo es mejor no es una etapa, es la distribución: la geometría de lo generado tiene que parecerse estadísticamente a la geometría de lo real.

---

## 1. Diagnóstico: qué falla hoy, con el código delante

### 1.1 La arquitectura es fija y la semilla solo mueve el detalle

`profileGen.ts` tiene ocho constructores (`flatSegments` l. 236, `hillySegments` l. 243, `hillyUphillSegments` l. 269, `mountainSegments` l. 337, `mountainClassicSegments` l. 443, `classicSegments` l. 473, `cobblesSegments` l. 493, `ittSegments` l. 510) y todos siguen el mismo esqueleto: sortear las dificultades, calcular el relleno, repartirlo con `split` (l. 52-65) en `n+1` huecos, intercalar `rolling`/`climb`/`descent`, y `normalize` (l. 141-177). Lo que **no** depende de la semilla:

- El **número** de dificultades: `nClimbs = km > 170 ? 3 : 2` (l. 245, 271), `midClimbs = km > 165 ? 3 : 2` (l. 339, 445), `nWalls = km > 200 ? 5 : 4` (l. 475), `sectors = [3, 5, 4]` literal (l. 495). Es un umbral de kilometraje, no una decisión de forma.
- El **orden**: relleno, dificultad, bajada, relleno. Nunca dos puertos encadenados sin valle, nunca un circuito, nunca un sector a 15 km de meta (el último de `cobblesSegments` cae a un cuarto del relleno de la meta: unos 40 km, mapa 01 §2.7).
- Los **rangos**, escritos como literales dentro de las funciones y no en `ROUTE` (mapa 01 §3: de `ROUTE` solo entran cuatro claves en `profileGen.ts`).
- Las **únicas dos decisiones de forma sorteadas** están en `mountainSegments`: el brazo de desnivel (l. 345) y el `finalKind` (l. 355). En las otras siete formas no se sortea ninguna.

Medido en el mapa 01 sobre 1.500 etapas por forma: `hillySegments` corona su última cota a 26-68 km de meta en el 100 % de los casos (`valle_largo` siempre), `flatSegments` e `ittSegments` son la misma función, y `classicSegments` produce 4-5 muros cuando una Ronde tiene 16-19 y una Amstel 33 (mapa 07 §1.3).

### 1.2 Los modelos son tres para componer y seis para un día

`type MixTerrain = 'flat' | 'hilly' | 'mountain'` (`calendar.ts` l. 410) con el comentario «los tres terrenos que sabe componer una vuelta por etapas (el resto se reduce a ellos)»; `mixTerrain` (l. 416-420) manda `cobbles` e `itt` a `flat` y `classic` a `hilly`. `oneDaySpec` (l. 400-408) es un `switch` de seis ramas. Medido aquí: las 72 vueltas compuestas por `stageMix` producen 47 secuencias de papeles distintas, la más repetida cinco veces (`[l m m^ c l]`), y las 158 carreras de un día generadas miden 210 km en la mediana de las tres clases (`row.km ?? 210`, `calendar.ts` l. 917): 66 de 66 carreras .1 de un día están en p10 = p50 = p90 = 210.

### 1.3 El país no llega al generador

Firmas leídas (mapa 02 §6): `oneDaySpec(terrain, km, seed)`, `stageMix(n, terrain, seedBase)`, `stagesFromEdition(id, edition)` con semilla `${s.from}|${s.to}|${s.km}` (l. 221), y los ocho `xxxSegments(km, seed)`. `buildRace` calcula `country` en l. 889 y lo copia a `common`, y de ahí no va a ninguna rama de construcción. Medido aquí: hay etapas generadas en 55 países, y en **41 de ellos no existe ni una etapa real** (VE, SA, CO, TR, RW, GR, HR, CY, TW, SI, TH, PL, BA, DZ, RS, GB, BJ, US, GT, AT, DK, JP, AZ, HU, LU, AL, LT, MU, CM, EE, CZ, AD, RO, BG, KR, XK, EC, MA, SK, MY, BF). Las 177 etapas reales caen en 15 países (ES 44, IT 37, FR 36, CH 11, BE 8, AE 7, AU 6, DE 6, IN 5, PT 5, OM 4, NO 4, CA 2, NL 1, CN 1).

### 1.4 Lo generado no se parece a lo real, y ahora está medido

Medido aquí sobre las 177 etapas con rasgos (146 con puertos publicados, 130 con altimetría muestreada, 6 con pavé, 101 con sprints):

| Rasgo                                      | Real (p10 / p50 / p90)                                         | Generador de hoy (mapa 01 §8)                                                                  |
| ------------------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Reina: nº de puertos publicados            | 2 / 4 / 6 (máx. 11)                                            | 3 o 4 fijos por km (`mountainSegments`)                                                        |
| Reina: puerto final (km)                   | 3,3 / 9,7 / 17,1                                               | 9-15 antes de escalar, suelo 8,6                                                               |
| Reina: `finalKindOf`                       | alto 37 · valle_largo 7 · valle_corto 6 · cima_cerca 4 (de 54) | 44 / 11 / 29 / 16 %                                                                            |
| Reina: km de puerto a más de 60 km de meta | 0 / 13,2 / 43,0                                                | «puerto a 60 km de meta y luego llano» no sale (mapa 01 §4)                                    |
| Media: km de la última cota a meta         | 0 / 15 / 59                                                    | 26-68 siempre (`hillySegments`)                                                                |
| Media: nº de puertos                       | 1 / 3 / 6 (máx. 36)                                            | 2 o 3 fijos                                                                                    |
| Un día: nº de cotas                        | 4 / 11 / 34 (18 carreras)                                      | 4 o 5 muros (`classicSegments`)                                                                |
| Un día: última cota (km) y km a meta       | 0,5 / 1,0 / 2,1 y 0 / 7,8 / 20,8                               | muro 1-2,5 km a ≥ 16 km (`classicSegments`); puerto 4-8 km a 13-22 (`mountainClassicSegments`) |
| Un día: puertos publicados ≤ 3 km          | 234 de 259                                                     | ninguno en `mountainClassicSegments`                                                           |
| Pavé: sectores por carrera                 | 5, 6, 8, 9, 15, 31                                             | 3 fijos                                                                                        |
| Llana real: km de la última cota a meta    | 20 / 43 / 149                                                  | no hay cota (`flatSegments` es `rolling` puro)                                                 |

Dos cosas más que el corpus dice y el generador no sabe: **el circuito existe** (18 de 54 reinas reales y 11 de 59 medias tienen al menos una cota repetida; Montréal repite 34 veces) y **la crono no es siempre llana** (13 cronos reales, entre ellas la de Barcelona de `race-france` e1 con altimetría muestreada y 100 m de desnivel en 20 km, `stageFeatures.ts` l. 19-31).

### 1.5 El clasificador está calibrado contra el generador y no contra la carretera

`stageKind.ts` l. 44-58 lo dice: los umbrales «se calibran contra los propios generadores». Medido aquí sobre las etapas reales: `stageKindOf` llama `media` a 11 de las 54 reinas reales y `reina` a 16 de las 59 medias reales; a 7 de 22 llanas reales con cota las llama `clasica` y a 3 `reina`. No es un defecto del clasificador de hoy (hace lo que promete), es la prueba de que las familias del generador y las de la realidad no coinciden. El comentario l. 49-54 además está desfasado desde la v64 (mapa 01 §5.1: reinas hasta 26,7 km de cota).

### 1.6 Lo que ya funciona y hay que conservar

`normalize` proporcional (l. 141-177), `climb`/`descent`/`rolling` como primitivas de dibujo (l. 72-122), `garantizaPuerto` como patrón de «garantía de clase después de normalizar» (l. 192-233), `MountainOptions` como precedente de arquitectura fijada desde fuera (l. 319-322), `finalKindOf` con sus cortes (`finalKind.ts` l. 30), `race_routes` como sello (mapa 03 §8), y la doctrina de `fuentes-recorridos.md` (nada se inventa, un puerto sin km+longitud+pendiente se descarta).

---

## 2. Principios

1. **Lo real manda y lo generado lo imita.** Una etapa con rasgos en `STAGE_FEATURES` no pasa por el generador (hoy ya es así, `calendar.ts` l. 223). Todo lo demás se genera como variación de un arquetipo cuyas bandas salen del corpus real; donde el corpus no llega, de una tabla manual con la fuente escrita (mapa 07).
2. **Primero la arquitectura, después el detalle.** El sorteo decide qué motivos tiene la etapa, cuántos, en qué orden y a qué distancia de meta, antes de dibujar una sola rampa. Las rampas siguen siendo `climb`/`descent`/`rolling`.
3. **El sitio decide qué puede existir.** La región (derivada del país y, cuando se conoce, de la ciudad de `raceRoutes.ts`) filtra los arquetipos permitidos y acota sus parámetros: no hay adoquín en Colombia ni cima a 2.500 m en Bélgica (mapa 07 §3, consecuencias 1-3).
4. **Identidad estable, variación deliberada.** La arquitectura de una carrera es función del `id` de la carrera; el detalle es función del `id` y de la temporada. La misma carrera el año que viene se parece a sí misma.
5. **Nada que el motor no vea.** La salida sigue siendo `StageProfile { segments: Segment[], banners }` (`stage/types.ts` l. 32-48). La metadata de origen y arquetipo va en `CalendarStage`, no en el perfil. El generador no emite `rompepiernas` (el muestreo lo colapsa a llano con g = 1,5 e ignora sus tramos, `sample.ts` l. 100-101).
6. **Se mide la distribución, no la etapa.** El criterio de «mejor» es que ocho rasgos geométricos por familia se parezcan a los del corpus real, y que dos etapas de la misma familia no sean la misma desplazada.
7. **Determinista, puro, con subflujos nominales.** Cada decisión pide su RNG por nombre (`routeRng(`${seed}::${nombre}`)`), como hace `stage/rng.ts` l. 26-29 con el motor. Añadir una decisión no rebaraja las demás, que es exactamente lo que `profileGen.ts` l. 316-317 hoy no puede prometer.
8. **Lo sellado no se toca.** El perfil de una etapa corrida vive en `stage_snapshots.input` y el de una carrera en `race_routes` (mapa 03 §8); el generador nuevo alcanza carreras futuras y sube `ENGINE_VERSION`.
9. **Toda constante con intención, en `constants.ts`.** Los literales de `profileGen.ts` (l. 247-248, 280-281, 359-363, 452-454, 477-478, 496) migran a `ARCHETYPES`/`ROUTE` con comentario.

---

## 3. El modelo

### 3.1 Vocabulario

- **Motivo** (`Motif`): la unidad de arquitectura. Un puerto, un muro, un sector, un valle, un circuito. Tiene parámetros con bandas y se traduce a uno o varios `Segment`.
- **Esqueleto** (`Skeleton`): la lista ordenada de huecos (`Slot`) que una etapa de una familia tiene, cada uno con su motivo y su banda de posición medida **desde la meta**, porque la identidad de una etapa real se ancla en cómo acaba (mapa 07 §4.3).
- **Arquetipo** (`Archetype`): un esqueleto con bandas numéricas, su procedencia (qué etapas reales lo sostienen), sus regiones permitidas, su clase de etapa esperada y sus vetos propios.
- **Firma geográfica** (`GeoSignature`): lo que una región permite y prohíbe.
- **Identidad de carrera** (`RaceIdentity`): las decisiones de arquitectura fijadas para una carrera del calendario, que no cambian con la temporada.

### 3.2 Tipos

```ts
// packages/engine/src/routes/gen/types.ts

/** Región geográfica con firma propia (§5). `generico` es la red para países sin firma escrita. */
export type RegionId =
  | 'flandes'
  | 'ardenas'
  | 'bretana_normandia'
  | 'macizo_central_jura'
  | 'alpes'
  | 'provenza'
  | 'pirineos'
  | 'cantabrico'
  | 'meseta'
  | 'andalucia'
  | 'levante_baleares'
  | 'portugal'
  | 'italia_norte'
  | 'italia_centro'
  | 'dolomitas'
  | 'centroeuropa'
  | 'escandinavia'
  | 'islas_britanicas'
  | 'balcanes_turquia'
  | 'andes'
  | 'cono_sur'
  | 'norteamerica'
  | 'australia'
  | 'asia_oriental'
  | 'golfo_arabia_malasia'
  | 'generico'

/** Los motivos que sabe dibujar el generador. Cada uno se traduce a segmentos (§3.4). */
export type MotifKind =
  | 'puerto' // subida de 3 km o más, con forma interna (progresiva, irregular, tendida)
  | 'cota' // subida de 1,5 a 3 km: cuenta como puerto para el motor, categoría 4/3
  | 'muro' // 0,3 a 1,5 km a 8-14 %: tipo `puerto`, activa COL (g >= 8) y el final `muro`
  | 'repecho' // menos de 1,5 km a 3-7 %: tipo `llano` con tramos, NO suma kmSubida
  | 'sector_paves' // segmento `paves` con estrellas 1-5, pendiente 0
  | 'sector_tierra' // sterrato: `paves` con estrellas 2-4 (así lo codifica Strade, classicRoutes.ts l. 594)
  | 'bajada' // `descenso`, pierde una fracción de lo subido
  | 'valle' // relleno `llano` de amplitud regional
  | 'circuito' // repite un sub-esqueleto N veces al final de la etapa

/** Banda numérica cerrada, con su procedencia. */
export interface Band {
  min: number
  max: number
  /** p50 observado, para el arquetipo canónico (§4.7) y para el sorteo triangular. */
  mode: number
}

/** Un hueco del esqueleto. La posición es la de la CIMA o el FIN del motivo, en km desde meta. */
export interface Slot {
  motif: MotifKind
  /** km desde meta a los que acaba el motivo; `{min:0,max:0}` es «muere en la línea». */
  toFinishKm: Band
  lengthKm: Band
  /** Pendiente media (%); negativa en `bajada`. Ausente en sectores y valle. */
  gradient?: Band
  /** Estrellas de un sector. */
  stars?: Band
  /** Forma interna de un puerto: cómo se reparten las rampas. */
  shape?: 'progresiva' | 'irregular' | 'tendida' | 'pared_final'
  /** Probabilidad de que el hueco exista en una instancia (1 = obligatorio). */
  presence: number
  /** Sub-esqueleto de un `circuito` y cuántas vueltas. */
  loop?: { slots: Slot[]; laps: Band; lapKm: Band }
}

export type ArchFamily =
  // un día
  | 'muros_encadenados'
  | 'adoquin_densidad'
  | 'sterrato'
  | 'circuito_cotas'
  | 'muro_final'
  | 'montana_un_dia'
  | 'esprint_costa'
  | 'criterium'
  // vuelta por etapas
  | 'reina_alto_largo'
  | 'reina_alto_corto'
  | 'reina_cima_cerca'
  | 'reina_valle'
  | 'reina_corta'
  | 'media_valle'
  | 'media_alto'
  | 'media_circuito'
  | 'media_muro_final'
  | 'llana_pura'
  | 'llana_repecho'
  | 'llana_circuito'
  | 'cri_llana'
  | 'cri_ondulada'
  | 'cronoescalada'
  | 'prologo'

export interface Archetype {
  id: string
  family: ArchFamily
  /** La clase que `stageKindOf` TIENE que devolver para toda instancia (garantía de clase, §4.6). */
  kind: StageKind
  timeTrial?: boolean
  /** Etiqueta del calendario (`TERRAIN_KIND`), para no cambiar la web. */
  label: string
  kmBand: Band
  /** Desnivel total esperado (puertos + relleno), para el veto de plausibilidad. */
  dPlusBand: Band
  /** Cubetas de `finalKindOf` admitidas, con su peso. */
  finalMix: Partial<Record<FinalKind, number>>
  skeleton: Slot[]
  /** Amplitud del relleno (escala de `RELIEF.rollingAmplitude`), si el arquetipo la fija. */
  fillAmplitude?: number
  /** Regiones donde puede salir. Vacío = cualquiera cuya firma no lo vete. */
  regions: RegionId[]
  /** Clases de carrera (`RaceClass`) donde puede salir y con qué peso. */
  classWeight: Partial<Record<RaceClass, number>>
  /** De dónde salen las bandas. `extraido` exige >= 3 fuentes; `manual` cita el mapa o la doc. */
  provenance:
    | { kind: 'extraido'; sources: { raceId: string; stageIndex: number }[] }
    | { kind: 'manual'; cite: string }
}

export interface GeoSignature {
  region: RegionId
  /** Cota más larga que puede existir (km). Flandes 3, Ardenas 5, Alpes 30. */
  maxClimbKm: number
  /** Metros que puede sumar un solo puerto (proxy de altitud de cima: sin cima > 1.800 m no hay 1.500 m seguidos). */
  maxClimbGainM: number
  climbGradient: Band
  cobbles: 'no' | 'urbano' | 'sectores'
  sterrato: boolean
  /** Fracción de llano expuesto: sube el peso de arquetipos llanos y baja la amplitud del relleno. */
  wind: 'poco' | 'moderado' | 'fuerte'
  /** Altitud de base: en los Andes no hay etapa a nivel del mar. Solo veta arquetipos, no entra en la física. */
  baseAltitudeM: Band
  fillAmplitude: number
  /** Familias que la región no admite aunque el terreno de la fila lo pida. */
  forbids: ArchFamily[]
}

/** Lo que el generador necesita saber de la etapa que va a dibujar. */
export interface GenInput {
  raceId: string
  stageIndex: number
  nStages: number
  raceClass: RaceClass
  format: RaceFormat
  country: string
  /** Región resuelta (§5.2). */
  region: RegionId
  /** Papel dentro de la vuelta, o terreno de la fila si es un día. */
  role: MixRole | RouteTerrain
  km: number
  /** Temporada (0 = identidad pura; ver §6). */
  season: number
}

export interface RouteMeta {
  source: 'real' | 'mixto' | 'generado'
  archetypeId?: string
  region: RegionId
  /** Los motivos instanciados, con su km de fin: es lo que la ficha puede enseñar y el banco medir. */
  motifs?: { motif: MotifKind; endKm: number; lengthKm: number; gradient?: number }[]
}

export interface GeneratedStage {
  profile: StageProfile
  meta: RouteMeta
}
```

`CalendarStage` (`calendar.ts` l. 42-46) gana un campo `route: RouteMeta`. `StageProfile` no cambia: el motor sigue viendo solo `segments` y `banners` (mapa 03 §1).

### 3.3 Cómo encaja con `Segment` y `Ramp`

| Motivo                           | `Segment.tipo` | `tramos`                                                                     | Qué lee el motor (mapa 03 §3-4)                                                                                          |
| -------------------------------- | -------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `puerto`                         | `puerto`       | `climb(rand, len, g, shape)`: 2 a `round(len/2,2)` rampas, forma por `shape` | `subida`: suma a `kmSubida`, deriva, `climbRaceKmToGo`, categoría por `deriveClimbCategory`                              |
| `cota`                           | `puerto`       | idem, mínimo 2 rampas                                                        | igual; cat4/cat3                                                                                                         |
| `muro`                           | `puerto`       | 1-3 rampas con g ≥ 8 en al menos una                                         | `subida` con COL (`riderPerfil`, g ≥ 8); si muere en meta y mide ≤ 1 km, `finishType` da `muro` (`finish.ts` l. 183-188) |
| `repecho`                        | `llano`        | 1-2 rampas a 3-7 %                                                           | pendiente sí, selección no (`selectionFactor('llano')` = 0); no suma `kmSubida`                                          |
| `sector_paves` / `sector_tierra` | `paves`        | ninguno (g = 0)                                                              | `estrellas` en coste y selección; percances ×20                                                                          |
| `bajada`                         | `descenso`     | `descent(rand, len, g)`                                                      | selecciona solo si g ≤ −4 y en su primer km, o entera a ≤ 25 km de meta                                                  |
| `valle`                          | `llano`        | `rolling` con amplitud regional, sin `rompepiernas`                          | único terreno del abanico                                                                                                |
| `circuito`                       | (compuesto)    | repite los segmentos del sub-esqueleto N veces                               | nada especial: el motor ve N pasos por la misma cota                                                                     |

Reglas de tipado que resuelven R28.1(c) (mapa 05 §9): toda subida de ≥ 1,5 km a ≥ 3 % se emite como `puerto`; de ≥ 0,3 km con algún tramo ≥ 8 % y ≤ 1,5 km, como `puerto` (muro); lo demás que sube, como `llano` con tramos. Y el relleno tiene la amplitud topada a 2,4 % de pendiente máxima para que **nunca** cumpla la regla del puerto por accidente (hoy `rolling` en `bumpy` llega a 3,2 %, l. 105).

---

## 4. El algoritmo

Todo vive en `packages/engine/src/routes/gen/` y es puro. Un solo punto de entrada:

```ts
export function generateStage(input: GenInput): GeneratedStage
```

### 4.1 Subflujos del RNG

```ts
// routes/gen/rng.ts
export function genRng(seed: string): (subflow: string) => () => number {
  return (subflow) => routeRng(`${seed}::${subflow}`) // mulberry32 sobre FNV-1a, profileGen.ts l. 15-44
}
```

Dos semillas por etapa:

- **Semilla de identidad** `idSeed = `${raceId}|${stageIndex}`` (para vueltas) o `raceId` (un día). Para las etapas de edición sin rasgos se conserva la de hoy, `${from}|${to}|${km}` (`calendar.ts` l. 221), concatenada con el `raceId` para que dos carreras con la misma salida y meta no dibujen lo mismo (defecto anotado en mapa 02 §7).
- **Semilla de edición** `edSeed = `${idSeed}|s${season}``.

| Decisión            | Subflujo   | Semilla   | Qué sortea                                                                             |
| ------------------- | ---------- | --------- | -------------------------------------------------------------------------------------- |
| Arquetipo           | `arch`     | identidad | uno entre los admitidos, con peso                                                      |
| Firma de la carrera | `firma`    | identidad | presencia de cada hueco opcional, número de vueltas de circuito, cubeta de `finalKind` |
| Posiciones          | `slots`    | edición   | `toFinishKm` de cada hueco dentro de su banda                                          |
| Parámetros          | `params`   | edición   | longitud, pendiente, estrellas, forma                                                  |
| Rampas              | `ramps`    | edición   | el ruido de `climb`/`descent`                                                          |
| Relleno             | `fill`     | edición   | `rolling` entre motivos                                                                |
| Reparación          | `repair:k` | edición   | reintento k-ésimo si un veto salta                                                     |

Con `season = 0` la semilla de edición es `idSeed|s0`: determinista y distinta de la identidad, pero fija. Nada del motor entra aquí (el perfil no entra en `stageSeed`, `stage/rng.ts` l. 22-24).

### 4.2 Paso 1: resolver el contexto

`region = regionOf(raceId, country)` (§5.2). `family` se deriva del papel: `reina` → una de las cinco `reina_*` según el peso de la firma regional y del formato; `media-alto` → `media_alto` o `media_muro_final`; `media` → `media_valle`, `media_circuito`; `llana` → `llana_*`; `cri` → `cri_llana`, `cri_ondulada`, `prologo` (si `km ≤ 8`), `cronoescalada` (solo si la firma tiene `maxClimbKm ≥ 8` y con peso bajo); un día → por `RouteTerrain` de la fila: `cobbles` → `adoquin_densidad` o `muros_encadenados` (si la región es `flandes`), `classic` → `muros_encadenados`, `circuito_cotas`, `muro_final`; `mountain` → `montana_un_dia`; `hilly` → `circuito_cotas`, `muros_encadenados`, `media_valle`; `flat` → `esprint_costa`, `llana_circuito`.

### 4.3 Paso 2: elegir el arquetipo

```ts
const candidatos = ARCHETYPES.filter(
  (a) =>
    familiesFor(input).includes(a.family) &&
    (a.regions.length === 0 || a.regions.includes(input.region)) &&
    !SIGNATURES[input.region].forbids.includes(a.family) &&
    a.classWeight[input.raceClass] !== undefined &&
    input.km >= a.kmBand.min * 0.85 &&
    input.km <= a.kmBand.max * 1.15,
)
const arch = pickWeighted(candidatos, (a) => a.classWeight[input.raceClass]!, rng('arch')())
```

Si `candidatos` queda vacío (una región muy restrictiva con un terreno de fila absurdo), se cae al arquetipo `generico` de la familia, y `RouteMeta` lo anota (`archetypeId: 'fallback:<family>'`) para que un test lo cuente y el calendario lo corrija a mano. Preferencia dentro de los candidatos: los arquetipos `extraido` con fuentes de la misma región pesan ×2 sobre los de otras regiones y ×3 sobre los `manual`.

### 4.4 Paso 3: instanciar el esqueleto (la arquitectura)

Con `rng('firma')` se decide qué huecos opcionales existen (`presence`), cuántas vueltas da un circuito y en qué cubeta de `finalMix` cae la etapa. Con `rng('slots')` se sortea la posición de cada hueco dentro de su banda, con sorteo triangular centrado en `mode`. Después se ordenan por `toFinishKm` decreciente y se aplican tres reglas de separación:

1. Entre el fin de un motivo y el inicio del siguiente hay al menos `ARCH.minGapKm` (0,8 km) salvo dentro de un `puerto` seguido de `bajada`, que van pegados.
2. Un `puerto` de más de `ARCH.linkedClimbMaxGapKm` (3 km) de hueco con el siguiente lleva `bajada` obligatoria (la regla del 85 % de `featureProfile.ts` l. 391-400, topada a −12 %).
3. Si la suma de longitudes supera `km · ARCH.maxDifficultyShare` (0,75), se recortan proporcionalmente las longitudes de los motivos no obligatorios y, si no basta, se elimina el hueco opcional más lejano de meta.

Con `rng('params')` se sortean longitud, pendiente, estrellas y forma dentro de las bandas, **topadas por la firma regional** (`min(slot.lengthKm.max, sig.maxClimbKm)`, pendiente dentro de `sig.climbGradient`).

### 4.5 Paso 4: dibujar (el detalle)

Cada motivo se traduce con las primitivas de `profileGen.ts`, que se conservan y se mueven a `routes/gen/draw.ts`: `climb` (l. 72-82) gana un parámetro `shape` (`progresiva`: la de hoy, más dura arriba; `irregular`: rampas con ruido ±2,5 y una al menos ≥ g+3, la del Cantábrico; `tendida`: ruido ±0,6; `pared_final`: último cuarto a g+4, los últimos 4 km al 12 % de Fedaia o Tre Cime), `descent` (l. 85-93) y `rolling` (l. 100-122) sin la rama `rompepiernas` y con amplitud `sig.fillAmplitude · arch.fillAmplitude`. Un `circuito` dibuja su sub-esqueleto `laps` veces con las **mismas** longitudes y pendientes (es el mismo asfalto) y distinto relleno.

Luego `normalize(segments, km)` (l. 141-177, sin cambios) y `garantizaClase` (§4.6).

### 4.6 Paso 5: garantías, vetos y reparación

`garantizaClase(segments, arch)` generaliza `garantizaPuerto` (l. 192-233): comprueba `stageKindOf(auto(segments), arch.timeTrial).kind === arch.kind` y `finalKindOf ∈ keys(arch.finalMix)`, y si no, mueve al puerto que decide (el más largo para `reina`, el final para `media_alto`) al borde con la holgura `ARCH.classMarginKm` (0,3 km, que cubre el borde sin holgura de 8,5 medido en mapa 01 §5.1), compensando en el llano más largo. Después corren los vetos de §9. Si alguno salta, se repite el paso 3 con `rng('repair:k')`, k = 1..`ARCH.maxRepairs` (4). Si los cuatro reintentos fallan, se instancia el **arquetipo canónico**: cada banda en su `mode`, sin sorteo, que por construcción pasa todos los vetos (test de §12 paso 5). Es determinista y siempre termina.

### 4.7 Paso 6: pancartas y salida

`auto(segments)` (`calendar.ts` l. 93-102) sigue poniendo una `cima` al final de cada `puerto`, porque `lastClimbKm` (`finalKind.ts` l. 46-48) mira primero las pancartas. Las metas volantes generadas son decisión del dueño (§14, D1): si se aprueban, cada arquetipo `extraido` lleva la banda de posiciones de los sprints de sus fuentes (101 de 177 etapas reales los publican) y se emiten con `rng('firma')`. `RouteMeta.motifs` recoge la lista instanciada con km de fin, longitud y pendiente: es lo que el banco de §11 mide sin simular.

### 4.8 Coste

Una Ronde generada tiene ~16 muros, ~6 sectores y ~70 tramos de relleno: 90-120 segmentos. `sampleProfile` es O(bloques × segmentos) una vez por etapa (mapa 03 §2), y con 2.700 bloques y 120 segmentos son 324.000 comparaciones, despreciable frente al bucle de simulación (mapa 03 §7). La generación del calendario entero (1.418 etapas) sigue en el arranque del módulo, como hoy.

---

## 5. La geografía

### 5.1 La firma regional

Los valores salen del mapa 07 §3 (25 firmas) fundidas en 25 regiones más `generico`. Tabla resumida; la completa va en `constants.ts::GEO_SIGNATURES` con la fila del mapa citada en el comentario.

| Región               | `maxClimbKm`              | `maxClimbGainM` | `climbGradient`   | `cobbles` | `sterrato`   | `wind`   | `fillAmplitude` | `forbids`                                                              |
| -------------------- | ------------------------- | --------------- | ----------------- | --------- | ------------ | -------- | --------------- | ---------------------------------------------------------------------- |
| flandes              | 2,5                       | 150             | 4-13              | sectores  | no           | fuerte   | 0,7             | todas las `reina_*`, `montana_un_dia`, `cronoescalada`                 |
| ardenas              | 4,5                       | 350             | 5-12              | urbano    | no           | moderado | 1,0             | `reina_alto_largo`, `adoquin_densidad`                                 |
| bretana_normandia    | 2,5                       | 200             | 5-8               | urbano    | sí (ribinoù) | fuerte   | 0,8             | `reina_*`, `sterrato` fuera de `tro_bro`                               |
| macizo_central_jura  | 17                        | 1.100           | 5-9               | no        | no           | moderado | 1,1             | `adoquin_densidad`, `muros_encadenados`                                |
| alpes                | 30                        | 1.800           | 5-9               | no        | no           | poco     | 1,15            | `adoquin_densidad`, `muros_encadenados`, `sterrato`                    |
| pirineos             | 17                        | 1.400           | 6-8,5             | no        | no           | poco     | 1,15            | idem                                                                   |
| dolomitas            | 14                        | 1.300           | 7-12              | no        | no           | poco     | 1,15            | idem                                                                   |
| cantabrico           | 15                        | 1.200           | 7-10 (rampas 20+) | no        | no           | moderado | 1,0             | `adoquin_densidad`, `llana_pura` con más de 40 km seguidos de llano    |
| meseta               | 10                        | 700             | 4-6               | no        | no           | fuerte   | 0,55            | `muros_encadenados`, `adoquin_densidad`                                |
| andalucia            | 20                        | 1.500           | 6-8               | no        | no           | moderado | 0,85            | `adoquin_densidad`, `muros_encadenados`                                |
| levante_baleares     | 22                        | 1.200           | 5-12              | no        | no           | moderado | 0,85            | idem                                                                   |
| portugal             | 30                        | 1.400           | 5-7               | urbano    | no           | fuerte   | 0,85            | `adoquin_densidad`                                                     |
| italia_norte         | 13                        | 900             | 6-8 (muros 15+)   | no        | no           | poco     | 1,0             | `adoquin_densidad`, `reina_alto_largo`                                 |
| italia_centro        | 8                         | 600             | 6-12              | no        | sí           | moderado | 1,0             | `adoquin_densidad`, `reina_alto_largo`                                 |
| centroeuropa         | 12                        | 1.000           | 4-8               | urbano    | no           | moderado | 0,85            | `adoquin_densidad`, `sterrato`                                         |
| escandinavia         | 10                        | 800             | 5-9               | urbano    | no           | fuerte   | 0,6             | `reina_alto_largo`, `sterrato`                                         |
| islas_britanicas     | 9                         | 500             | 6-10 (rampas 25)  | urbano    | no           | fuerte   | 0,85            | `reina_alto_largo`, `sterrato`                                         |
| balcanes_turquia     | 23                        | 1.500           | 5-7               | no        | no           | fuerte   | 0,85            | `adoquin_densidad`, `muros_encadenados`                                |
| andes                | 80                        | 2.500           | 4-7               | no        | no           | poco     | 1,15            | `adoquin_densidad`, `muros_encadenados`, `esprint_costa`, `llana_pura` |
| cono_sur             | 30                        | 1.500           | 5-6               | no        | no           | fuerte   | 0,55            | `adoquin_densidad`, `muros_encadenados`                                |
| norteamerica         | 30                        | 1.800           | 4-9               | no        | no           | fuerte   | 0,85            | `adoquin_densidad`, `sterrato`                                         |
| australia            | 3 (30 en Falls Creek, .1) | 900             | 7-11              | no        | no           | fuerte   | 0,7             | `reina_alto_largo` salvo peso 0,05, `adoquin_densidad`                 |
| asia_oriental        | 20                        | 1.200           | 3-10              | no        | no           | poco     | 0,7             | `adoquin_densidad`, `muros_encadenados`                                |
| golfo_arabia_malasia | 20                        | 1.300           | 5-9               | no        | no           | fuerte   | 0,45            | `adoquin_densidad`, `muros_encadenados`, `media_circuito`              |
| generico             | 12                        | 900             | 4-8               | no        | no           | moderado | 0,85            | `adoquin_densidad`, `sterrato`                                         |

`maxClimbGainM` es el proxy de altitud: el perfil no lleva altitud (mapa 03 §1) y el motor no la usa, así que la firma solo prohíbe que una etapa belga acumule 1.500 m en un solo puerto. `wind` no entra en la física (el viento es un número por etapa desde la semilla, mapa 03 §5.1); aquí solo sube el peso de las familias llanas y baja la amplitud del relleno. Que el motor lea una exposición al viento del perfil es una promesa abierta de `motor.md` §19.5 y queda fuera de E1 (§13).

### 5.2 Del país a la región

Dos tablas en `routes/gen/regions.ts`:

1. `COUNTRY_REGION: Record<string, RegionId>`: un valor por defecto por país para los 136 códigos de `COUNTRIES` (`packages/shared/src/countries.ts`). FR → `macizo_central_jura`, ES → `meseta`, IT → `italia_norte`, BE → `flandes`, NL → `flandes`, GB/IE → `islas_britanicas`, CO/EC/VE → `andes`, AE/SA/OM/QA/MY → `golfo_arabia_malasia`, AU/NZ → `australia`, JP/CN/TW/KR/TH → `asia_oriental`, US/CA → `norteamerica`, AR/CL → `cono_sur`, TR/GR/HR/SI/RS/BA/AL/XK/RO/BG/CY → `balcanes_turquia`, DE/AT/CZ/SK/PL/HU/LU/CH → `centroeuropa`, DK/NO/SE/FI/EE/LT/LV → `escandinavia`, PT → `portugal`; el resto → `generico`. Test: los 136 resuelven.
2. `RACE_REGION: Record<string, RegionId>`: la región concreta de cada una de las 310 carreras de equipos, curada a mano a partir de las ciudades de `raceRoutes.ts` (que ya son reales aunque el relieve no lo sea, mapa 02 §8): `race-ain` → `macizo_central_jura` (Grand Colombier), `race-abruzzo` → `italia_centro` (Blockhaus), `race-alentejo` → `portugal`, `race-flanders` → `flandes`, y así las 310. Es contenido, no diseño: cabe en una tarde con `raceRoutes.ts` abierto, y el test exige que ninguna carrera de equipos caiga a `COUNTRY_REGION`. Los 532 nacionales usan `COUNTRY_REGION` (un nacional belga sale de `flandes`, uno colombiano de `andes`: lo que `motor.md` §V.3 pedía, mapa 05 §2).

`regionOf(raceId, country) = RACE_REGION[raceId] ?? COUNTRY_REGION[country] ?? 'generico'`.

### 5.3 Qué hace la región, en orden

1. **Filtra** arquetipos por `regions` y `forbids` (§4.3).
2. **Topa** longitud y pendiente de cada motivo (§4.4).
3. **Fija** la amplitud del relleno.
4. **Reparte** familias por defecto para los nacionales y para las filas con `terrain` ausente (`calendar.ts` l. 916, hoy `'flat'`): la región decide con `GEO_DEFAULT_TERRAIN[region]` (flandes → `cobbles`/`classic`, andes → `mountain`, golfo → `flat`).
5. **Acota** el kilometraje por clase (§7.4) con el factor regional `kmFactor` (andes 0,9 por la altitud, golfo 1,0).

---

## 6. La identidad entre ediciones

### 6.1 Lo que no existe hoy

`SEASON_CALENDAR` es una constante de módulo sin temporada (mapa 02 §11): la misma carrera es idéntica todos los años. Y `recorridoDelMundo.test.ts` ya prueba «clave por temporada» en `race_routes` (mapa 06 §3.5), así que el sello de base está preparado para que el recorrido cambie de año en año.

### 6.2 Qué es fijo y qué varía

`RaceIdentity` es lo que sale de los subflujos `arch` y `firma` con la semilla de identidad: arquetipo, presencia de cada hueco opcional, número de vueltas, cubeta de final. Es **la carrera**: si Race Ain tiene un final en alto largo en el Jura, lo tiene cada año.

Con la temporada, y solo con ella, varían (`rng('slots')`, `rng('params')`, `rng('ramps')`, `rng('fill')` sobre `edSeed`):

| Nivel            | Qué cambia                                                                                                                                             | Cuánto                                                                                                                                | Constante                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 0 (`season = 0`) | nada: identidad pura, es el comportamiento de hoy                                                                                                      | 0                                                                                                                                     |                                 |
| 1                | posiciones dentro de la banda, longitudes ±, rampas y relleno                                                                                          | posiciones ±`EDITION.slotJitter` (0,25 de la banda), longitudes ±`EDITION.lengthJitter` (0,15), km totales ±`EDITION.kmJitter` (0,05) | `EDITION.level` = 1 por defecto |
| 2                | además, **un hueco rotatorio**: el arquetipo puede declarar `alternates: Slot[][]` y la edición elige una alternativa por `season % alternates.length` | determinista por año                                                                                                                  | activado por arquetipo          |

El nivel 2 es lo que hace que Il Lombardia alterne Como y Bérgamo (mapa 07 §1.6) o que la Vuelta alterne Angliru y Lagos: el arquetipo lo declara y el año lo elige. Con `EDITION.level = 1` la arquitectura no cambia jamás; con 2 cambia según lo escrito, no según el azar.

### 6.3 Fontanería

`SEASON_CALENDAR` pasa a `seasonCalendar(season: number): CalendarRace[]` con memoización por temporada, y `SEASON_CALENDAR` queda como `seasonCalendar(0)` para no tocar a los ~40 consumidores de golpe. `packages/db/src/calendarRun.ts` pide `seasonCalendar(world.season)` cuando congela `race_routes` el día de la etapa 1 (mapa 03 §8). Las carreras reales (`RACE_EDITIONS` y `STAGE_FEATURES`) no varían con la temporada: son la edición que son.

Coste: 1.418 etapas por temporada generadas una vez y memoizadas; el arranque no cambia.

---

## 7. Vueltas por etapas: la composición

### 7.1 Lo que se conserva de `mixRoles`

El orden de decisión de `mixRoles` (`calendar.ts` l. 445-455: crono, última etapa, las de en medio, garantías) es correcto y las seis garantías que `calendar.test.ts` l. 184-246 sella (crono posible en 5 etapas, crono siempre en llana de 4+, cinco llanas no son cinco sprints, nadie sin crono ni final en alto, primera llana, última decisiva o paseo) se mantienen como invariantes.

### 7.2 Lo que cambia: plantillas de vuelta en vez de sorteo etapa a etapa

`pickRole` (l. 434-443) sortea cada etapa independientemente, y por eso ni sabe de bloques ni de dónde va la reina (mapa 07 §2.1). Se sustituye por `TOUR_TEMPLATES`, una tabla por número de etapas (3, 4, 5, 6, 7, 8, 9-11) y terreno dominante, extraída de las 54 ediciones de una semana de `editions.ts` (mapa 02 §7: 163 hilly, 95 flat, 95 mountain, 26 itt) más las 15 carreras del mapa 07 §2.2. Una plantilla es una lista de papeles con huecos flexibles:

```ts
interface TourTemplate {
  nStages: number
  terrain: MixTerrain
  /** Papel por etapa; `'*'` es «lo que el sorteo de pesos diga». */
  roles: (MixRole | '*')[]
  /** Reglas duras que el sorteo de los `'*'` tiene que cumplir. */
  rules: {
    maxConsecutive: Partial<Record<MixRole, number>> // reina 2, llana 3
    queenAfterFraction: number // la reina más dura a partir del 0,6 de la vuelta
    maxUphill: number // finales en alto totales (una semana: 3)
    ittKm: Band // 8-35 en una semana; prólogo 3-8 si `roles[0] === 'cri'`
  }
  provenance: Archetype['provenance']
  weight: number
}
```

Ejemplo (una semana, 7 etapas, terreno montaña, extraído de Catalunya, Dauphiné y Suiza): `['llana', '*', 'media-alto', 'reina', '*', 'cri', 'media']` con `maxConsecutive.reina = 2`, `queenAfterFraction = 0,4`, `maxUphill = 3`. Los `'*'` se sortean con `ROUTE.mixWeights` (que se conservan) y las garantías de §7.1 se aplican después, como hoy.

### 7.3 Arquetipo por etapa dentro de la vuelta

Cada etapa de la vuelta llama a `generateStage` con su papel, y dos reglas de diversidad por carrera, decididas con `rng('firma')` sobre la semilla de la carrera: no se repite el mismo `archetypeId` en dos etapas consecutivas, y como mucho una etapa de `media_circuito`/`llana_circuito` por vuelta (el circuito final de Niza o Montjuïc). La reina más dura de la vuelta (la de mayor `dPlusBand.mode`) es la que ocupa el hueco `queenAfterFraction`.

### 7.4 Kilometraje por clase

`mixKm` (l. 522-543) da 145-195 km a cualquier clase, y una .2 de cinco etapas sale con etapas de 165-195 km, «la vuelta .2 más larga de Europa» (mapa 07 §4.1). Nueva tabla `ROUTE.kmByClass`:

| Clase | llana   | media   | media-alto | reina   | cri (una semana) | un día                           |
| ----- | ------- | ------- | ---------- | ------- | ---------------- | -------------------------------- |
| WT    | 165-230 | 150-200 | 140-185    | 120-200 | 8-35             | 175-295                          |
| Pro   | 150-200 | 140-180 | 130-170    | 120-180 | 8-30             | 170-240                          |
| .1    | 140-190 | 130-170 | 120-165    | 110-170 | 8-25             | 160-220                          |
| .2    | 100-165 | 100-160 | 100-150    | 100-150 | 3-20             | 140-180                          |
| .NC   |         |         |            |         | 25-45            | 180-260 (ruta), 120-180 (sub-23) |

Con estas bandas desaparece el 210 fijo de las 142 carreras de un día sin `km` (mapa 02 §1): el km de una carrera de un día sin dato sale de `rng('firma')` sobre la banda de su clase, estable entre ediciones salvo el ±5 % del nivel 1. Las 36 carreras que declaran `km` lo conservan.

### 7.5 Lo que no pasa por aquí

Las tres grandes vueltas y las 57 vueltas con edición (`RACE_EDITIONS`) conservan su composición real: número de etapas, km, terreno y descansos. Solo el **dibujo** de sus 226 etapas sin rasgos pasa por `generateStage` con el papel derivado del `EditionTerrain` de la etapa (`mountain` → `reina_*` según posición y formato, `hilly` → `media_*`, `flat` → `llana_*`, `itt` → `cri_*`, `cobbles` → `adoquin_densidad`). La región se resuelve por `RACE_REGION`, así que la etapa 6 de `race-france` (Pau a Gavarnie-Gèdre, `editions.ts` l. 33) se dibuja con `pirineos` aunque el país sea `FR`. Esto exige que `RACE_REGION` admita una región por etapa para las grandes vueltas: `RACE_REGION['race-france'] = { default: 'macizo_central_jura', stages: { 6: 'pirineos', 10: 'macizo_central_jura', 14: 'macizo_central_jura', 15: 'alpes', 18: 'alpes', 19: 'alpes', 20: 'alpes' } }`. Es contenido de las 60 ediciones y se hace con `editions.ts` abierto.

---

## 8. Constantes

Todas en `constants.ts`, con comentario de intención. Los rangos que hoy son literales en `profileGen.ts` migran a las bandas de los arquetipos (`ARCHETYPES`, fichero generado más el manual) y los umbrales de mecanismo a `ARCH`, `GEO_SIGNATURES`, `EDITION` y `ROUTE.kmByClass`.

| Nombre                                                                 | Valor                                                                                                                                                                                                                                                                       | Intención                                                                                | En qué se apoya                                                                                                                                                                                              |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ARCH.minGapKm`                                                        | 0,8                                                                                                                                                                                                                                                                         | separación mínima entre motivos: dos muros a menos de 800 m son un solo muro con rellano | Kwaremont-Paterberg (1,7 km entre cimas) es el par más pegado del corpus (`classicRoutes.ts` l. 451-452)                                                                                                     |
| `ARCH.linkedClimbMaxGapKm`                                             | 3                                                                                                                                                                                                                                                                           | por encima de este hueco tras un puerto hay bajada obligatoria                           | regla del 85 % de `featureProfile.ts` l. 391-400                                                                                                                                                             |
| `ARCH.descentLossShare`                                                | 0,85                                                                                                                                                                                                                                                                        | fracción de lo subido que pierde la bajada                                               | idem, y `MAX_DESCENT_GRADIENT` −12 (l. 142)                                                                                                                                                                  |
| `ARCH.maxDifficultyShare`                                              | 0,75                                                                                                                                                                                                                                                                        | los motivos no pueden sumar más de tres cuartos de la etapa                              | Catalunya e4 real: 38 de los últimos 50 km son puerto (`realQueens.ts` l. 75), y es el extremo                                                                                                               |
| `ARCH.fillMaxGradient`                                                 | 2,4                                                                                                                                                                                                                                                                         | el relleno nunca alcanza el 3 % que tipa puerto                                          | R28.1(c); hoy `rolling` bumpy llega a 3,2 (`profileGen.ts` l. 105)                                                                                                                                           |
| `ARCH.climbMinKm`                                                      | 1,5                                                                                                                                                                                                                                                                         | puerta de «esto es un puerto»                                                            | `CLIMB_MIN_KM` (`finalKind.ts` l. 33), R28.1(c)                                                                                                                                                              |
| `ARCH.wallMaxKm`                                                       | 1,5                                                                                                                                                                                                                                                                         | un muro mide hasta esto                                                                  | Huy 1,3, San Luca 2,1 (mapa 07 §1.2); `muroMaxKm` del motor es 1,0 (`constants.ts` l. 4462), así que un muro de 1,0-1,5 sale `puncheur`, que es lo que hoy hace Huy y «es correcto» (`finish.ts` l. 147-148) |
| `ARCH.wallMinGradient`                                                 | 8                                                                                                                                                                                                                                                                           | pendiente mínima de un muro                                                              | `STAGE.wallMinGradient` 8 (l. 1594)                                                                                                                                                                          |
| `ARCH.classMarginKm`                                                   | 0,3                                                                                                                                                                                                                                                                         | holgura sobre `PASS_MIN_KM` al garantizar clase                                          | 3 de 1.500 clasificaciones cruzadas en el borde de 8,5 (mapa 01 §5.1)                                                                                                                                        |
| `ARCH.maxRepairs`                                                      | 4                                                                                                                                                                                                                                                                           | reintentos deterministas antes del canónico                                              | presupuesto; un arquetipo bien acotado repara en 0-1                                                                                                                                                         |
| `ARCH.extractMinSources`                                               | 3                                                                                                                                                                                                                                                                           | fuentes mínimas para que el extractor cree un arquetipo                                  | evita la copia: una banda de una sola etapa ES esa etapa                                                                                                                                                     |
| `ARCH.regionalWeight` / `familyWeight` / `manualWeight`                | 3 / 2 / 1                                                                                                                                                                                                                                                                   | preferencia regional > familia > manual                                                  | §4.3                                                                                                                                                                                                         |
| `ARCH.cloneMaxCorrelation`                                             | 0,85 (provisional)                                                                                                                                                                                                                                                          | ninguna instancia puede correlacionar más con una fuente                                 | se calibra en §11.4 con pares reales de la misma familia                                                                                                                                                     |
| `ARCH.sprintBannerChance`                                              | 0 (D1)                                                                                                                                                                                                                                                                      | metas volantes generadas                                                                 | `auto()` no las fabrica a propósito (`calendar.ts` l. 88-91)                                                                                                                                                 |
| `EDITION.level`                                                        | 1                                                                                                                                                                                                                                                                           | cuánto varía una carrera de año en año                                                   | §6.2                                                                                                                                                                                                         |
| `EDITION.slotJitter`                                                   | 0,25                                                                                                                                                                                                                                                                        | fracción de la banda de posición que mueve un año                                        | Ronde: Paterberg a 13 km todos los años, cotas intermedias bailan 5-10 km                                                                                                                                    |
| `EDITION.lengthJitter`                                                 | 0,15                                                                                                                                                                                                                                                                        | idem longitud de motivo                                                                  | Omloop 202 → 207 km entre 2024 y 2026 (`fuentes-recorridos.md` regla 1)                                                                                                                                      |
| `EDITION.kmJitter`                                                     | 0,05                                                                                                                                                                                                                                                                        | idem km totales                                                                          | idem                                                                                                                                                                                                         |
| `ROUTE.kmByClass`                                                      | tabla §7.4                                                                                                                                                                                                                                                                  | km por clase y papel                                                                     | mapa 07 §4.1                                                                                                                                                                                                 |
| `ROUTE.mixWeights`                                                     | sin cambio                                                                                                                                                                                                                                                                  | pesos de los huecos `'*'`                                                                | v10                                                                                                                                                                                                          |
| `ROUTE.queenFinalMix`                                                  | pasa a `finalMix` por arquetipo: `reina_alto_largo` {alto 1}, `reina_alto_corto` {alto 1}, `reina_cima_cerca` {cima_cerca 1}, `reina_valle` {valle_corto 0,7, valle_largo 0,3}; pesos de familia por formato: gran vuelta 0,45/0,15/0,15/0,25, una semana 0,4/0,25/0,15/0,2 | el reparto es propiedad de la familia, no una tirada                                     | medido real aquí: 37/4/6/7 de 54 (69 % alto); mapa 07 §2.1: Vuelta 8-10 de 21                                                                                                                                |
| `ROUTE.queenDplusRange` / `queenLowDplusRange` / `queenHighDplusShare` | se retiran: el desnivel es consecuencia de las bandas del arquetipo (`dPlusBand`) y de su firma regional                                                                                                                                                                    | el objetivo dirigido nació para un test (mapa 06 §6.3)                                   | D5                                                                                                                                                                                                           |
| `GEO_SIGNATURES`                                                       | tabla §5.1                                                                                                                                                                                                                                                                  | qué existe en cada sitio                                                                 | mapa 07 §3                                                                                                                                                                                                   |
| `GEO_DEFAULT_TERRAIN`                                                  | por región                                                                                                                                                                                                                                                                  | terreno de fila ausente                                                                  | `calendar.ts` l. 916                                                                                                                                                                                         |
| `TOUR_TEMPLATES`                                                       | §7.2                                                                                                                                                                                                                                                                        | plantillas de vuelta                                                                     | `editions.ts`, mapa 07 §2.2                                                                                                                                                                                  |
| `RELIEF.rollingAmplitude`                                              | se conserva para `featureProfile.ts`                                                                                                                                                                                                                                        |                                                                                          |                                                                                                                                                                                                              |

Lo que **no** cambia: `FINAL_KIND_CUTS` (0,5 / 5 / 20), `CLIMB_MIN_KM` (1,5), `PASS_MIN_KM` (8,5), `QUEEN_MIN_CLIMB_METRES` (3.200), `WALL_MAX_KM` (3), `STAGE.dx` y todo `STAGE.finish*`. La razón: son la vara con que el banco lee las reinas y con que `stageHistory.ts` reetiqueta etapas corridas (mapa 06 §2.3 y §5); moverlas es una decisión aparte (§14, D2), y el generador nuevo se calibra para caer dentro de ellas con holgura.

---

## 9. Reglas de veto y plausibilidad

Cada veto es una función pura `(segments, arch, sig, input) → string | null` en `routes/gen/vetos.ts`, y el nombre del veto que salta se anota en el test de reparación para saber cuál dispara más. Un arquetipo canónico (§4.6) tiene que pasar los doce por construcción.

| #   | Veto                           | Regla                                                                                                                                                           | Por qué (caso real)                                                                                                                                                                                                                          |
| --- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | Final largo en un día          | en `format = 'un-dia'`, si el último segmento es `puerto`, mide ≤ 2,5 km; excepción: arquetipo `montana_un_dia:ventoux` con `classWeight` solo `.1` y peso 0,02 | **El caso v40**: Race Jura con final en alto de 14 km, 82 % del pelotón a cero (`profileGen.ts` l. 427-438; `balance.md` l. 8102-8125). En el WT de un día la última subida mide 0,4-4,2 km y muere arriba solo si es un muro (mapa 07 §4.3) |
| V2  | Reina que no es reina          | `kind = 'reina'` exige puerto ≥ 8,5 km **o** ≥ 3.200 m; y además al menos un puerto de ≥ 6 km a más de 30 km de meta                                            | regla negativa 2 del mapa 07 §4.4; v43 §7: subida fuera de los últimos 30 km separa canónica (0 %) de reales (6-38 %)                                                                                                                        |
| V3  | Adoquín fuera de sitio         | `sector_paves` solo si `sig.cobbles = 'sectores'`; `'urbano'` admite un sector ≤ 0,6 km                                                                         | mapa 07 §3 consecuencia 1; hoy las 20 filas `cobbles` ya caen bien (mapa 07 §3), el veto impide que un nacional lo estropee                                                                                                                  |
| V4  | Sterrato fuera de sitio        | `sector_tierra` solo si `sig.sterrato`                                                                                                                          | consecuencia 2                                                                                                                                                                                                                               |
| V5  | Altitud imposible              | ningún puerto sube más de `sig.maxClimbGainM` ni mide más de `sig.maxClimbKm`                                                                                   | consecuencia 3                                                                                                                                                                                                                               |
| V6  | Muros en Sanremo               | familia `esprint_costa` no admite `muro` ni pendiente > 5 % en los últimos 30 km                                                                                | mapa 07 §1.5                                                                                                                                                                                                                                 |
| V7  | Llana con demasiado desnivel   | `kind = 'llana'` con `dPlus` > 1.800 m sin `cota` de ≥ 3 km es media                                                                                            | regla negativa 10                                                                                                                                                                                                                            |
| V8  | Puertos encadenados sin bajada | dos `puerto` consecutivos con hueco > 3 km sin `bajada`                                                                                                         | `featureProfile.ts` l. 391-400                                                                                                                                                                                                               |
| V9  | Relleno que tipa               | ningún tramo de `valle` con g ≥ 3 en ≥ 1,5 km                                                                                                                   | `ARCH.fillMaxGradient`                                                                                                                                                                                                                       |
| V10 | Sector en la salida            | ningún `paves` en el primer tercio de la etapa salvo `adoquin_densidad` de más de 20 sectores                                                                   | Roubaix: primer sector en el km 96 de 258 (`classicRoutes.ts` l. 405)                                                                                                                                                                        |
| V11 | Demanda fuera de banda         | `Σ costBase·dx` (mapa 03 §4.1) dentro de `[0,6; 1,1] × arch.demandBand` (calculada al extraer sobre las fuentes)                                                | Lombardía 102,2 es el techo de un día y Jura lo superaba «sin ser más dura» (`profileGen.ts` l. 436)                                                                                                                                         |
| V12 | Clase y final                  | `stageKindOf(...).kind === arch.kind` y `finalKindOf ∈ arch.finalMix`                                                                                           | garantía de clase, `stageKind.test.ts`                                                                                                                                                                                                       |

Plausibilidad blanda (no veta, se mide en §11): distancia de cada rasgo de la instancia al p5-p95 de las fuentes del arquetipo.

Dos vetos que se aplican a la **composición** (§7): una vuelta de ≤ 5 etapas no lleva dos cronos ni etapas de más de 180 km en clase .2 (regla 8), y una gran vuelta generada (hoy ninguna: las tres son reales) no lleva reina en la primera semana ni más de 7 de alta montaña (regla 6).

---

## 10. Lo real frente a lo generado

### 10.1 Prioridad de fuentes, en orden

1. `STAGE_FEATURES[id][i]` con rasgos → `buildFeatureProfile` (sin cambios). `RouteMeta.source = 'real'`.
2. `RACE_EDITIONS[id]` sin rasgos para esa etapa → ciudades, km y terreno reales; relieve por `generateStage`. `source = 'mixto'` (el 🟡 del inventario, mapa 05 §7).
3. Fila de tabla sin edición, o nacional → todo por `generateStage`. `source = 'generado'`.

Ninguna regla de este diseño toca `featureProfile.ts`, `classicRoutes.ts` ni `editions.ts`. La doctrina de `fuentes-recorridos.md` (un puerto sin km+longitud+pendiente se descarta, nada se rellena a ojo) se hereda tal cual: el extractor de §11.1 lee **solo** lo publicado, y una etapa real sin `climbs` no aporta bandas de puertos aunque tenga `elevation`.

### 10.2 Cómo se evita la copia reconocible

- Un arquetipo `extraido` necesita ≥ 3 fuentes (`ARCH.extractMinSources`), y sus bandas son el p10-p90 **agregado** de las fuentes, no los valores de una. Una familia con menos de tres fuentes (Roubaix, Strade, Flèche) se completa con la tabla del mapa 07 (que da rangos de varias carreras de la misma familia) y se marca `manual` con la cita.
- Las posiciones se sortean dentro de bandas; las longitudes y pendientes también; los nombres no existen (las ciudades ya son neutras y vienen de `raceRoutes.ts`, y el nombre de la carrera es «Race + Geografía», `calendar.ts` l. 2-7).
- **Test anti-clon** (`routes/gen/clone.test.ts`): para cada instancia generada se muestrea `g` a 1 km, se normaliza el eje a [0,1] desde la meta, y se calcula la correlación de Pearson con cada fuente de su arquetipo; ninguna supera `ARCH.cloneMaxCorrelation`. El umbral se calibra antes de fijarlo (§11.4): se mide la misma correlación entre pares **reales** de la misma familia (Ronde contra E3, Amstel contra Brabant, Lombardía contra Lieja) y se pone el tope en el p90 de esos pares, que es «tan parecido como dos carreras reales distintas, no más».
- Un circuito generado no repite el número exacto de vueltas de una fuente concreta si el arquetipo tiene solo esa fuente para ese dato: `laps` es banda.

### 10.3 Distinción en la interfaz

`race_routes.route_source` ya existe y hoy todo entra como `generado` (`packages/db/src/raceRoutes.ts` l. 48-51, mapa 03 §9.5). Pasa a tomar `RouteMeta.source` con tres valores (`real`, `mixto`, `generado`) y se congela con el perfil. La API del calendario (`apps/api/src/routes/calendar.ts` l. 97) expone `route: { source, region, archetypeLabel }`, donde `archetypeLabel` es el nombre de la **familia** en lenguaje de aficionado («clásica de muros», «etapa de montaña con final en alto largo», «crono ondulada»), nunca el nombre de una carrera real. La web pinta la marca junto a la altimetría: ✅ Recorrido real (con la fuente, que `classicRoutes.ts` ya lleva), 🟡 Ciudades y distancia reales, relieve generado, 🔴 Recorrido generado. Es la promesa al jugador que E12 pide (mapa 05 §8) y que E1 puede cumplir porque el dato ya está en la fila.

---

## 11. El banco

### 11.1 El extractor: `scripts/extraer-arquetipos.mjs` → `routes/gen/extraidos.ts`

Determinista, sin RNG, regenerable como `inventario-recorridos.md` («si algo aquí no cuadra, el que miente es el documento y se regenera»). Pasos:

1. Para cada etapa real con `climbs` (146) o `cobbles` (6): calcular el vector de rasgos `F = { km, nClimbs, nWalls (≤1,5 km), nCotas (1,5-3), nPuertos (≥3), maxLen, lastLen, lastG, lastToFinish, climbKmLast30, climbKmBefore60, firstPos, repeats, nSectors, cobblesKm, lastSectorToFinish, dPlusPub, finalKindOf, stageKindOf }`. Es exactamente lo que `medir-real.mjs` ya calcula.
2. Asignar familia con reglas escritas: `format = un-dia` y `nSectors ≥ 15` → `adoquin_densidad`; `un-dia` y `cobbles` con estrellas 2-4 y sin puertos → `sterrato`; `un-dia` y `repeats ≥ 3` → `circuito_cotas`; `un-dia` y `lastToFinish ≤ 0,5` y `lastLen ≤ 2,5` → `muro_final`; `un-dia` y `maxLen ≥ 4` → `montana_un_dia`; `un-dia` y `nClimbs ≥ 8` → `muros_encadenados`; `un-dia` resto → `esprint_costa`. Para vueltas: `kind = reina` y `finalKindOf = alto` y `lastLen ≥ 8` → `reina_alto_largo`; `alto` y `lastLen < 8` → `reina_alto_corto`; `cima_cerca` → `reina_cima_cerca`; resto de reinas → `reina_valle`; `km < 140` y `reina` → también `reina_corta`; `media` con `alto` → `media_alto`; `media` con `repeats ≥ 2` → `media_circuito`; `media` con `lastToFinish ≤ 0,5` y `lastLen ≤ 1,5` → `media_muro_final`; resto de medias → `media_valle`; `llana` sin `climbs` → `llana_pura`; con cota a > 20 km → `llana_repecho`; con `repeats` → `llana_circuito`; cronos por `dPlus/km`: < 5 m/km `cri_llana`, 5-25 `cri_ondulada`, > 25 `cronoescalada`, `km ≤ 8` `prologo`.
3. Para cada (familia, formato) con ≥ 3 etapas: bandas p10/p50/p90 de cada rasgo y, para el esqueleto, las posiciones **por rango desde la meta** (la última cota, la penúltima, ...) con su longitud y pendiente. Los huecos más allá de la mediana de `nClimbs` reciben `presence` = fracción de fuentes que los tienen.
4. Anotar `provenance.sources` y la región de cada fuente (`RACE_REGION`); si ≥ 3 fuentes comparten región, se emite además un arquetipo regional.
5. Escribir `extraidos.ts` con un comentario de cabecera con la fecha, el número de fuentes y el hash del corpus.

Medido aquí, lo que el corpus da hoy: `reina_alto_largo` (≥ 20 fuentes: p50 de última subida 10 km al 7,1 %), `reina_valle` (13), `media_valle` (44), `media_alto` (9), `llana_repecho` (22), `muros_encadenados` (7: Ronde, Omloop, E3, Dwars, Amstel, Brabant, Wevelgem), `circuito_cotas` (5: Québec, Montréal, Hamburgo, Frankfurt, Great Ocean), `montana_un_dia` (3: Lombardía, Lieja, San Sebastián), `cri_*` (13). Quedan en `manual` con la cita del mapa 07: `adoquin_densidad` (1 fuente, §1.4), `sterrato` (1, §1.3), `muro_final` (1, §1.2), `esprint_costa` (§1.5), `criterium` (§1.7), `reina_corta` (§2.1 regla 5), `cronoescalada`, `prologo` (§2.2), y todo lo de regiones sin fuente.

### 11.2 Lo que cambia en los tests, y cómo

Del mapa 06 §4, con la decisión de este diseño para cada uno:

| Test                                                                                               | Qué pasa                                                                | Decisión                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.test.ts` l. 381                                                                             | `ENGINE_VERSION` 69 → 70                                                | se sube en el paso 8 de §12                                                                                                                                                                                                                                                                                                                                                     |
| `apps/api/src/stageHistory.test.ts` l. 199 (`cambian === 49`)                                      | la cifra cambia                                                         | se re-mide y se escribe la causa («el generador nuevo dibuja por arquetipos: N etapas de edición cambian de etiqueta»); la mitad que vigila (`spec.kind === stage.kind`) se mantiene en verde por la garantía de clase V12                                                                                                                                                      |
| `routes/stageKind.test.ts`                                                                         | los ocho generadores desaparecen                                        | se reescribe contra `ARCHETYPES`: 300 instancias por arquetipo (60 semillas × 5 km de su `kmBand`) devuelven `arch.kind`; incluye por fin `montana_un_dia` (hoy `mountainClassicSegments` no está vigilado, mapa 06 §6.1); y las reinas siguen exigiendo las dos etiquetas                                                                                                      |
| `routes/calendar.test.ts` l. 162-174 (km exactos de ediciones)                                     | `normalize` se conserva                                                 | sigue verde; se añade al test que `route.source === 'mixto'` en esas etapas                                                                                                                                                                                                                                                                                                     |
| `routes/calendar.test.ts` l. 269-277 (`Uphill finish` acaba en `puerto`)                           | `media_alto` lo garantiza (V12 con `finalMix {alto: 1}`)                | sigue verde                                                                                                                                                                                                                                                                                                                                                                     |
| `routes/calendar.test.ts` l. 184-246 (garantías de `mixRoles`)                                     | se conservan                                                            | siguen verdes; se añaden bloques, `queenAfterFraction`, km por clase                                                                                                                                                                                                                                                                                                            |
| `routes/raceRoutes.test.ts` (n etapas = n rutas)                                                   | la composición conserva `n`                                             | verde                                                                                                                                                                                                                                                                                                                                                                           |
| `routes/finalKind.test.ts`, `featureProfile.test.ts`, `classicRoutes.test.ts`, `altimetry.test.ts` | no leen el generador                                                    | sin tocar                                                                                                                                                                                                                                                                                                                                                                       |
| `sim/calendarQueens.test.ts`                                                                       | cambia la muestra (25 de 27 no reales) y el desnivel                    | se re-mide con 12 semillas fuera de CI antes de tocar bandas; el «desnivel decide» (`facil > dura + 10`) debe seguir, porque las reinas de `andes`/`generico` en .2 (`reina_valle`, `reina_corta`) pueblan la banda < 1.500 sin necesidad del 40 % dirigido (D5)                                                                                                                |
| `sim/invariants.test.ts` «carreras pequeñas»                                                       | 7 de 10 generadas                                                       | se re-miden las nueve bandas pareadas (viejo/nuevo, mismas semillas); `media.stages > 40` se conserva porque las plantillas mantienen la proporción de medias                                                                                                                                                                                                                   |
| `sim/invariants.test.ts` «reinas reales»                                                           | 3 de 9 son generadas y su `why` ya no describe el perfil (mapa 06 §3.2) | las tres (`race-colombia` e5, `race-guatemala` e9, `race-tachira` e6) se **congelan** como perfiles literales en `sim/frozenQueens.ts` con la instancia de hoy, para que el banco siga siendo comparable entre versiones; y se añaden tres instancias del generador nuevo de las familias `reina_valle` (andes), `reina_alto_largo` (andes) y `reina_corta` con su `why` medido |
| `sim/invariants.test.ts` «saturación de un día»                                                    | las 8 más duras cambian                                                 | se re-mide; el criterio (0 saturan, techo Lombardía) es el mismo                                                                                                                                                                                                                                                                                                                |
| `sim/coherence.test.ts` Jaén, `stage/journal.test.ts` Tramuntana                                   | listones de cero sobre perfiles generados                               | se re-corren; si aflora una contradicción, es del motor y se arregla, no se afloja (mapa 06 §4.10)                                                                                                                                                                                                                                                                              |
| `db/recorridoDelMundo.test.ts`                                                                     | auto-consistente                                                        | verde; garantiza que el generador nuevo solo alcanza carreras futuras                                                                                                                                                                                                                                                                                                           |

Lo que sigue verde sin tocar: las cuatro huellas selladas, los 6.17 sintéticos, `grandTour` (20 de 21 reales), los perfiles reales (mapa 06 §5).

### 11.3 Lo que se mueve a propósito

1. `mountain.breakawayWinPct` y `mountain.top10GapSeconds` sobre `reina-150`: no se mueven (no ven el generador) y se les cambia la clave a `canonQueen.*` para que nadie vuelva a leerlas como «la montaña» (mapa 04 §4.3.1).
2. `calendarQueens.breakawayWinPct` 6-30: se re-mide con el calendario nuevo; se propone al dueño una banda por cubeta de desnivel (D5), como el mapa 04 §4.3.2 pide.
3. `grandTour.queenLastGroupPct`: las siete reinas de `race-france` son reales; no se mueve. Se añade la partición por `finalKindOf` como impresión sin banda.
4. `smallTours.photoRepeat*`: se separa la parte de composición (pares de agrupadas) de la de motor, imprimiendo ambas.

### 11.4 Métricas de fidelidad y de variedad (nuevo `sim/routeFidelity.ts`, geométrico, corre en `test:rapido`)

**Fidelidad** (por familia con ≥ 5 fuentes reales; sobre todas las instancias del calendario generado de esa familia, o 300 semillas si son menos de 30):

| Rasgo                                                  | Criterio de banda (nace impreso; se sella cuando tenga σ)                    | Referencia real medida aquí                                      |
| ------------------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `nClimbs`                                              | p10-p90 generado dentro de p5-p95 real ±1                                    | reina 2-6, media 1-6, un día 4-34                                |
| `lastLen`                                              | idem ±20 %                                                                   | reina alto 5,0-17,1; media 1,0-14,2; un día 0,5-2,1              |
| `lastToFinish`                                         | idem ±3 km                                                                   | reina 0-21; media 0-59; un día 0-21                              |
| `maxLen`                                               | idem ±20 %                                                                   | reina 7,3-24; media 2,5-26,5                                     |
| `climbKmBefore60`                                      | idem                                                                         | reina 0-43; nunca 0 en el 100 % de una familia de reina (v43 §7) |
| `dPlus` (`desnivelDe` de `calendarQueens.ts` l. 55-59) | p50 de reina de gran vuelta ≥ 3.000 m; cubeta < 1.500 no vacía               | mapa 04 §5.1                                                     |
| `finalKindOf` por familia                              | dentro de ±0,08 del `finalMix` del arquetipo (por fin sellado, mapa 06 §6.2) | real 69 % alto                                                   |
| `nSectors`, `cobblesKm`                                | `adoquin_densidad` 20-31 sectores y 40-57 km                                 | Roubaix 31 / 54,8                                                |
| distancia de Kolmogorov `D` por rasgo                  | se imprime; se sella cuando `D` tenga dueño                                  |                                                                  |

**Variedad**:

| Métrica                                                                                       | Criterio                                                    |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Arquetipos distintos usados por familia en el calendario                                      | ≥ 3 donde existan ≥ 3                                       |
| Correlación mediana de `g` por km entre pares de instancias de la misma familia y ±10 % de km | < 0,8 (mapa 04 §5.2)                                        |
| Correlación máxima instancia-fuente                                                           | < `ARCH.cloneMaxCorrelation`, calibrado sobre pares reales  |
| Secuencias de papeles en vueltas de 5                                                         | ninguna > 15 % (hoy 7 %)                                    |
| Entropía de `finalKind` por vuelta con ≥ 2 reinas                                             | ninguna con todas `alto`                                    |
| Km de un día por clase                                                                        | desviación típica > 15 km en .1 y .2 (hoy 0)                |
| Cobertura regional                                                                            | ninguna región con `fallback:` en más del 2 % de sus etapas |

**Método** (mapa 04 §5.3): todo pareado con las mismas semillas, geometría en `test:rapido`, simulación en `test:bancos`, y ninguna banda nueva nace en rojo: primero se imprime en `pnpm sim`, después se sella.

---

## 12. Plan de implementación

Regla de la casa: tests primero, `typecheck && test` en verde antes de cerrar cada paso, presupuesto de reloj ≥ 4× el coste medido en CI. `ENGINE_VERSION` sube **una sola vez**, en el paso 8, que es cuando cambia lo que el juego corre; los pasos 1-7 construyen en paralelo sin tocar `calendar.ts`. Cada paso deja su nota en `docs/balance.md` bajo «v70», con las tablas pareadas.

| Paso | Qué                                                                                                                                                                                                                                                                                   | Tests primero                                                                                                                                                                                                                                                    | Ficheros                                                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 0    | Confirmar que no hay mundos vivos que necesiten `backfillRaceRoutes` (el mundo se reinicia antes del lanzamiento; si hubiera, correrlo ANTES de cambiar el generador, `raceRoutes.ts` l. 88-89)                                                                                       | ninguno                                                                                                                                                                                                                                                          | `packages/db`                                                                                                                              |
| 1    | `routes/gen/rng.ts`: `genRng(seed)(subflow)`                                                                                                                                                                                                                                          | determinista; dos subflujos independientes (cambiar el número de tiradas de uno no mueve el otro); misma cadena que `routeRng` para `subflow = ''`                                                                                                               | nuevo                                                                                                                                      |
| 2    | `routes/gen/draw.ts`: mover `climb`, `descent`, `rolling`, `normalize`, `split`, `between` desde `profileGen.ts`; `climb` gana `shape`; `rolling` pierde `rompepiernas` y gana amplitud; nuevo `wall`, `sector`, `loop`                                                               | km exactos al décimo; suma de tramos = km del segmento; ningún `rompepiernas`; `fillMaxGradient`; `pared_final` produce al menos un tramo ≥ g+3; `isWall` (`sample.ts` l. 146-154) verdadero para todo `wall`                                                    | nuevo, `profileGen.ts` importa de aquí (sin cambio de conducta: prueba de huella sobre 300 semillas de cada `xxxSegments` antes y después) |
| 3    | `routes/gen/regions.ts` + `constants.ts::GEO_SIGNATURES`, `GEO_DEFAULT_TERRAIN`, `COUNTRY_REGION`, `RACE_REGION`                                                                                                                                                                      | los 136 códigos resuelven; las 310 carreras de equipos tienen `RACE_REGION`; las 20 filas `cobbles` caen en regiones con `cobbles = 'sectores'` o `'urbano'`; toda firma tiene `min < max`                                                                       | nuevo                                                                                                                                      |
| 4    | `scripts/extraer-arquetipos.mjs` → `routes/gen/extraidos.ts`; `routes/gen/manual.ts`; `routes/gen/archetypes.ts` los une                                                                                                                                                              | el extractor es idempotente (dos corridas, mismo fichero); todo `extraido` tiene ≥ 3 fuentes; todo `manual` cita; cada familia tiene ≥ 1 arquetipo; el canónico de cada arquetipo pasa los doce vetos; `kmBand` compatible con `ROUTE.kmByClass` de alguna clase | nuevo, `package.json` script `arquetipos`                                                                                                  |
| 5    | `routes/gen/skeleton.ts` + `vetos.ts` + `garantizaClase`                                                                                                                                                                                                                              | por arquetipo, 60 semillas × 5 km: V1-V12 en verde, `stageKindOf` = `arch.kind`, `finalKindOf ∈ finalMix`, km exacto, ≤ 1 reparación en el p90, 0 canónicos forzados en el p99; registro de qué veto dispara                                                     | nuevo                                                                                                                                      |
| 6    | `routes/gen/generate.ts`: `generateStage`; `sim/routeFidelity.ts` + `routes/gen/fidelity.test.ts` + `clone.test.ts`                                                                                                                                                                   | determinismo; `season` 0 y 1 comparten `archetypeId`, `finalKind` y número de motivos y difieren en posiciones; fidelidad §11.4 impresa, variedad §11.4 sellada donde ya se cumpla; anti-clon con el umbral calibrado sobre pares reales                         | nuevo                                                                                                                                      |
| 7    | `routes/gen/tour.ts`: `TOUR_TEMPLATES`, `composeTour(n, terrain, region, raceClass, seed)`                                                                                                                                                                                            | todas las garantías de `calendar.test.ts` l. 184-246 portadas; `maxConsecutive`; `queenAfterFraction`; `kmByClass`; ninguna secuencia > 15 % en 72 vueltas; `n` se conserva (para `raceRoutes.test.ts`)                                                          | nuevo                                                                                                                                      |
| 8    | **El cambio**: `calendar.ts` usa `generateStage` y `composeTour` en `oneDaySpec`, `stageMix`, `stagesFromEdition` (rama sin rasgos) y `nationalChampionships`; `CalendarStage.route`; `ENGINE_VERSION` 70; `profileGen.ts` queda exportado como `legacy/` una versión para el pareado | `stageKind.test.ts` reescrito; `stageHistory.test.ts` re-sellado con causa; `calendar.test.ts` ampliado (`route.source`); `index.test.ts` 70; `recorridoDelMundo` verde                                                                                          | `calendar.ts`, `constants.ts`, `index.ts`                                                                                                  |
| 9    | Bancos: re-medir pareado `calendarQueens` (12 semillas), `smallTours`, `realQueens` (congelar las tres generadas en `sim/frozenQueens.ts` y añadir tres nuevas), saturación top-8, Jaén, Tramuntana, cronos reales (3 de 5 generadas)                                                 | los del mapa 06 §4.5-4.10, con las bandas que el dueño decida en D5                                                                                                                                                                                              | `sim/*`                                                                                                                                    |
| 10   | Interfaz: `race_routes.route_source` toma `RouteMeta.source`; API expone `route`; web pinta la marca                                                                                                                                                                                  | `apps/api` test de que cada etapa del calendario lleva `route.source` y que las de `STAGE_FEATURES` son `real`; `db/raceRoutes.test` congela `mixto`                                                                                                             | `packages/db/src/raceRoutes.ts` l. 48-51, `apps/api/src/routes/calendar.ts`, web                                                           |
| 11   | Temporada: `seasonCalendar(season)`, `calendarRun.ts` congela con la temporada del mundo; `EDITION.level` 1                                                                                                                                                                           | dos temporadas de la misma carrera: misma identidad, distinto detalle; `race_routes` sella por temporada; `SEASON_CALENDAR === seasonCalendar(0)`                                                                                                                | `calendar.ts`, `packages/db`                                                                                                               |
| 12   | Limpieza: borrar `legacy/profileGen.ts`, actualizar `stageKind.ts` l. 45-58 con la tabla re-medida, `motor.md` §V.3 y §10, `SPEC.md` §8 (nota), regenerar `inventario-recorridos.md` con la columna de arquetipo, escribir `docs/generador.md` a partir de este documento             | la suite entera                                                                                                                                                                                                                                                  | docs                                                                                                                                       |

Pasos 1-7 caben sin subir versión y sin riesgo; el 8 es una tarde con los tests ya escritos; el 9 es el más largo (cada re-medida cuesta minutos de banco) y el 11 puede ir en una versión posterior si el dueño prefiere lanzar sin temporada (D4).

---

## 13. Riesgos y lo que se sacrifica

1. **El corpus es pequeño y sesgado al WorldTour europeo**: 177 etapas, 15 países, 41 carreras. Los arquetipos `extraido` cubren bien reinas, medias y clásicas del norte; todo lo demás es `manual` con la cita del mapa 07, que a su vez es conocimiento de calendario y no dato verificado. El diseño lo dice en la procedencia de cada arquetipo y la interfaz nunca presenta lo generado como real; pero un jugador colombiano verá una `reina_valle` de familia, no de los Andes, hasta que E12 cargue una Vuelta a Colombia. Mitigación: `regionalWeight` favorece lo regional en cuanto exista, y el extractor se re-corre con cada carga.
2. **El clasificador no se recalibra** en E1 (D2): `stageKindOf` seguirá llamando `media` a 11 de 54 reinas reales. Los arquetipos se acotan para caer en su clase, así que lo generado será coherente con la etiqueta; lo real seguirá con la discrepancia que ya tiene hoy.
3. **Más segmentos, más dificultades, más demanda en un día**: una `muros_encadenados` generada con 14 muros y 6 sectores es más dura que la `classicSegments` de hoy, y la saturación (`SATURATION_DEPLETION` 0,96) puede saltar en carreras .1 flamencas con campo continental. V11 acota la demanda a la banda de las fuentes y el paso 9 la mide; si salta, es el motor (dosificación) el que tiene que aguantar una Ronde de .1, no el generador el que tiene que ablandarla.
4. **Las bandas de `smallTours` y `calendarQueens` se moverán**, y hay que decidirlas con el dueño (D5), no dejar que un test las decida (mapa 06 §6.3). El riesgo es repetir la v60 §1b: bandas que siguen verdes sin remedición anotada. Por eso el paso 9 exige tablas pareadas en `balance.md`.
5. **`RACE_REGION` es contenido curado a mano** (310 carreras + regiones por etapa de 60 ediciones): cuesta una o dos tardes y puede tener errores; el test solo comprueba que existe, no que sea correcto. Un error de región produce una etapa plausible en un sitio equivocado, que es el defecto de hoy en todas partes.
6. **El viento sigue sin estar en el perfil**: `wind` de la firma solo cambia pesos y amplitud. Una «clásica de viento» generada en Flandes es llana y el abanico lo decide la semilla del motor (mapa 03 §5.1). Se sacrifica a propósito: meter exposición en el perfil es un cambio del contrato del motor (`Block`), fuera de E1.
7. **Las metas volantes generadas** quedan a 0 (D1): los perfiles generados siguen sin sprints intermedios, como hoy. El corpus permitiría hacerlo (101 de 177 los publican) y el motor las consume (2 de depósito y 5 km de alivio por pancarta, mapa 03 §4.2), pero cambia el ritmo de todas las llanas generadas y merece su propia medida.
8. **Se retira el objetivo de desnivel dirigido** (`queenDplusRange`, 60/40) a favor de las bandas de cada familia. Si el dueño quiere conservar la palanca explícita, el `dPlusBand` del arquetipo la sustituye (D5).
9. **Coste de arranque**: 1.418 etapas por temporada con reparaciones; con `maxRepairs` 4 y p90 ≤ 1 reparación, el orden de magnitud es el de hoy multiplicado por dos. Se mide en el paso 8.
10. **El anti-clon mide correlación de pendiente**, no forma «reconocible» para un aficionado: una Ronde con Kwaremont-Paterberg al final a 17 y 13 km es reconocible aunque las 14 cotas anteriores bailen. Se acepta: el sitio de las dos últimas cotas es la familia, no la copia, y el nombre no existe.

---

## 14. Decisiones que son del dueño

- **D1 · Metas volantes generadas.** `ARCH.sprintBannerChance` 0 (hoy) o bandas por arquetipo. Cambia el ritmo de las llanas y hay que medirlo; recomendación: 0 en E1, medir en una versión aparte.
- **D2 · Recalibrar `stageKindOf` a la realidad.** Los umbrales 8,5 km / 3.200 m / 3 km están calibrados contra el generador viejo y clasifican mal 27 de 113 reinas y medias reales (medido aquí). Mover los umbrales cambia la etiqueta de etapas corridas (`stageHistory.ts`) y la muestra de `calendarQueens`. Recomendación: no en E1; abrir tras el paso 12 con la tabla re-medida.
- **D3 · Peso de las familias por clase.** Cuántas .2 de montaña, cuántos nacionales de circuito, si el critérium existe como carrera puntuable (mapa 07 §1.7 recomienda que no). La tabla `classWeight` de cada arquetipo nace del corpus y del mapa 07, y el dueño la ajusta.
- **D4 · Identidad entre ediciones.** `EDITION.level` 0 (idéntica cada año, lo de hoy), 1 (detalle) o 2 (rotación declarada). Recomendación: 1, y 2 solo en los arquetipos que declaren alternativas. Y si el paso 11 entra antes del lanzamiento o después.
- **D5 · Las bandas de montaña.** Con el desnivel como consecuencia de la familia, `calendarQueens.breakawayWinPct` 6-30 se re-mide y se propone partirla por cubeta; el «está bien así» del 18,1 % (balance v44 cierre) se midió sobre el generador viejo. Hay que decidir si la cola < 1.500 m se mantiene por diseño (`reina_corta`, `reina_valle` en .2) o si se retira el test que la exige.
- **D6 · Qué se enseña.** «Recorrido generado (clásica de muros, Flandes)» o solo la marca de origen. Recomendación: la familia y la región, nunca una carrera real.
- **D7 · Kilometraje de un día por clase.** Romper el 210 fijo (`ROUTE.kmByClass`) cambia 142 carreras de golpe. Recomendación: sí, es el defecto más visible después de la arquitectura.
- **D8 · Prólogos y cronoescaladas.** Hoy no existen (`ittSegments` = `flatSegments`). `prologo` (3-8 km) y `cronoescalada` (peso bajo, solo en regiones con `maxClimbKm ≥ 8`) tocan `timeTrials.*` del banco (3 de 5 cronos son generadas).
- **D9 · Composición de los nacionales por región.** Que el nacional belga sea de adoquín y el colombiano de montaña (`GEO_DEFAULT_TERRAIN`), o que sigan siendo cuatro `classic`/`itt` iguales con distinta semilla. Recomendación: por región; es literalmente lo que `motor.md` §V.3 aceptó.
- **D10 · Excepciones nombradas.** Si existe el arquetipo `montana_un_dia:ventoux` (final en alto largo en un día, clase .1, peso 0,02), que es la única forma en que la regla V1 admite excepción.
