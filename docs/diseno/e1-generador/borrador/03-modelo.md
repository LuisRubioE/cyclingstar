## 3. El modelo de tipos

Esta sección es el contrato entre las demás: cada tipo que las secciones 4 a 13 usan está escrito aquí en TypeScript, con el fichero donde vive, la razón de su forma y la línea del código de hoy contra la que encaja. La regla de lectura es una sola: el motor de etapa no cambia (decisión 2 de la síntesis), así que todo lo que sigue vive AGUAS ARRIBA de `StageProfile` y termina rindiéndose a los mismos `Segment`, `Ramp` y `Banner` que hoy consume `sampleProfile`. Los nombres son los canónicos del documento; quien venga de una propuesta encuentra la traducción en la nota al pie de §3.12.

### 3.1 Lo que no cambia: el contrato del motor (`stage/types.ts` l. 12-48)

El motor lee exactamente esto y nada más (mapa 03 §1, tabla completa):

| Tipo                    | Línea        | Campos                                                           | Quién lo consume                                                                                                                     |
| ----------------------- | ------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `SegmentTerrain`        | l. 12        | `'llano' \| 'rompepiernas' \| 'puerto' \| 'descenso' \| 'paves'` | `blockTerrain()` de `sample.ts` l. 32-44; `rompepiernas` se colapsa a `llano` con g 1,5 e ignora los tramos (`sample.ts` l. 100-101) |
| `Ramp`                  | l. 18-21     | `km`, `g` (%)                                                    | `gradientAt()` de `sample.ts` l. 47-57                                                                                               |
| `BannerType` / `Banner` | l. 24, 26-31 | `km`, `tipo: 'meta_volante' \| 'cima'`, `cat?`                   | `sample.ts` l. 110-122; `lastClimbKm` mira PRIMERO las pancartas (`finalKind.ts` l. 46-48)                                           |
| `Segment`               | l. 37-42     | `km`, `tipo`, `tramos?`, `estrellas?`                            | `sampleProfile()`; «si trae `tramos`, la pendiente se muestrea de ellos; si no, se deriva del tipo»                                  |
| `StageProfile`          | l. 45-48     | `segments`, `banners?`                                           | `simulate.ts` l. 1218-1219, `timetrial.ts` l. 222                                                                                    |

Lo que NO está en el contrato y por tanto no puede afectar a la carrera: altitud absoluta, anchura, exposición al viento, firme mojado por tramos, sterrato como categoría propia (Strade se codifica `paves` con estrellas, `classicRoutes.ts` l. 594) y el tipo de etapa (`stage.kind`, que «el motor ni siquiera recibe», `simulate.ts` l. 1708). Esa lista es la razón de tres decisiones de este modelo: viento y altitud viajan como metadatos de la ficha (§3.7, decisión 17); `tendida` y `expuesto` se tipan `llano` con tramos porque no existe un terreno intermedio; y ningún motivo produce `rompepiernas`, porque el motor lo ignora.

Del clasificador se conservan tal cual `StageKind` (`testTour.ts` l. 8: `'llana' | 'media' | 'reina' | 'cri' | 'clasica'`), `StageShape` (`stageKind.ts` l. 20-24: `{ kind, label }`), `FinalKind` (`finalKind.ts` l. 20: `'alto' | 'cima_cerca' | 'valle_corto' | 'valle_largo'`), `FINAL_KIND_CUTS` (l. 30: 0,5 / 5 / 20) y `CLIMB_MIN_KM` (l. 33: 1,5). Dos funciones privadas de `stageKind.ts`, `climbMetres` (l. 27-33) y `climbSize` (l. 36-42), pasan a exportarse en el paso 1 sin tocar su cuerpo, porque `verify` y `routeCensus` las necesitan y la regla de vetos puros (decisión 4) prohíbe reimplementarlas. `FinishType` (`finish.ts` l. 22-40: `sprint_masivo`, `sprint_reducido`, `puncheur`, `muro`, `alto`, `pave`, `descenso`, `solitario`) se lee SOLO en `routeCensus` (§3.11), nunca en `verify`.

### 3.2 Motivos (`packages/engine/src/routes/grammar/motifs.ts`)

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

export function validateMotif(m: Motif, geo: GeoSignature): Veto | null // V1 a V4 y V15 sobre UN motivo
export function renderMotif(m: Motif, rand: () => number, geo: GeoSignature): Segment[]
```

Por qué esta forma. Un motivo es la unidad de ARQUITECTURA: lo que la semilla `arch|raceId` decide antes de que ninguna rampa exista. Hoy esa unidad no existe: `mountainSegments` (`profileGen.ts` l. 337-414) decide cuántos puertos hay por umbrales de km y en orden fijo (mapa 01 §4 y §8), así que la semilla mueve las rampas y no la carrera. Con `Motif` la etapa es primero una lista corta (≤ 12 motivos, sección 14) y después unos segmentos. Es un objeto plano y serializable a propósito: `GeneratedStage.arch.motivos` viaja a la API para la frase de la ficha y `diffMotivos` (§3.9) compara dos ediciones motivo a motivo. Los campos opcionales se aplican por `kind` y `validateMotif` rechaza lo que no corresponde: `g` solo en dificultades y `tendida`; `hijos` solo en `cadena`, `racimo` y `circuito`; `vueltas` solo en `circuito`; `meta` y `cotaFinal` solo en `meta`; `firme` y `estrellas` solo en `sector`. En un `sector`, `firme` es la verdad y `adoquin`, si viene, tiene que valer `firme === 'adoquin'` (contradicción = veto). Los rangos numéricos no están en el tipo sino en `ARCH.motivo.*` (sección 12), y `validateMotif` los comprueba contra la intersección con `GeoSignature` (sección 6).

Cómo rinde cada motivo a `Segment[]` (tabla de arquitectura §3.1 con las decisiones 2, 11 y 12 aplicadas; las primitivas son las de `profileGen.ts`: `climb` l. 72-82, `descent` l. 85-93, `rolling` l. 100-122, exportadas en el paso 1 con la firma nueva de la decisión 11):

| Motivo     | `Segment.tipo`   | Rinde como                                                                                                                                                                                                                 | Qué lee el motor (mapa 03 §3-§4)                                                     |
| ---------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `enlace`   | `llano`          | `rolling(rand, km, geo.amplitud, 0)`; `amplitud ≤ ARCH.motivo.enlace.ampMax` 2,4                                                                                                                                           | único terreno donde `rng('viento')` abre abanico; no suma `kmSubida`                 |
| `expuesto` | `llano`          | `rolling(rand, km, ARCH.motivo.expuesto.amp 1,0, 0)`                                                                                                                                                                       | igual; la ficha dice «llano abierto», nunca «abanicos»                               |
| `tendida`  | `llano`          | UN segmento con 2 a 4 tramos a `g ± 0,7`                                                                                                                                                                                   | pendiente sí (frena y cuesta), selección no; no suma `kmSubida`                      |
| `descenso` | `descenso`       | `descent(rand, km,                                                                                                                                                                                                         | g                                                                                    | )`       | selecciona solo si g ≤ −4 en su primer km o entera a ≤ 25 km de meta                       |
| `cota`     | `puerto`         | `climb(rand, km, g, {})`, km ≤ 8,0                                                                                                                                                                                         | `subida`: `kmSubida`, `climbRaceKmToGo`, categoría derivada                          |
| `puerto`   | `puerto`         | `climb(rand, km, g, {})`, km ≥ 9,0; `forma: 'irregular'` añade una rampa de `ARCH.motivo.puerto.rampaIrregular`                                                                                                            | igual; la rampa irregular abre brecha (SPEC §6.17)                                   |
| `muro`     | `puerto`         | `climb(rand, km, g, { gMax: ARCH.motivo.muro.gMax 16 })` con 2 rampas; `adoquin: true` NO cambia el tipo (regla 5 de `fuentes-recorridos.md`)                                                                              | `subida` con COL (g ≥ 8); si muere en meta y mide ≤ 1,0 km, `finishType` dice `muro` |
| `cadena`   | (compuesto)      | hijos (`muro` o `cota`) intercalados con `rolling` de [1; 6] km; sin `descenso` entre ellos                                                                                                                                | el motor ve n pasos por cotas seguidas                                               |
| `sector`   | `paves`          | `{ km, tipo: 'paves', estrellas }`, sin tramos; `firme: 'tierra'` fuerza `estrellas ∈ [2; 3]` (como Strade, `classicRoutes.ts` l. 594)                                                                                     | `estrellas` en coste y selección; percances ×20                                      |
| `racimo`   | (compuesto)      | sectores separados por `rolling` de `ARCH.motivo.racimo.separacion` [2; 6] km, amp 0,7                                                                                                                                     | nada especial                                                                        |
| `circuito` | (compuesto)      | los hijos rendidos `vueltas` veces con la MISMA semilla de detalle `dib                                                                                                                                                    | …                                                                                    | hijo{h}` | n pasos por la misma cota; pancarta `cima` por paso si el hijo mide ≥ 1,5 km (decisión 25) |
| `meta`     | según `MetaKind` | tabla completa en la sección 4; aquí solo la regla de tipo: `cotaFinal` obligatorio en `repecho`, `muro_meta`, `alto_corto`, `alto_largo`, `cima_cerca`, `descenso_meta` y `valle`; prohibido en `esprint` y `sector_meta` | lo que `deriveFinishTerrain` y `finalKindOf` leen de los últimos km                  |

Tres notas de tipo que resuelven bordes medidos. `cota` tiene techo 8,0 y `puerto` suelo 9,0 (`ARCH.motivo`), de modo que ningún motivo nace en el borde `PASS_MIN_KM` 8,5 de `stageKind.ts` l. 61; el hueco [8,0; 9,0] se asume (sección 17, riesgo 6). `muro` lleva `gMax` 16 porque hoy `classicSegments` produce rampas al 14,8 % de media con picos por encima (mapa 01 §2.4). Y `firme: 'tierra'` no es un terreno nuevo: el motor no tiene sterrato (§3.1), así que el tipo lo dice honradamente como etiqueta de ficha sobre un `paves` de 2 a 3 estrellas.

### 3.3 Esqueletos (`packages/engine/src/routes/grammar/skeletons.ts`)

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

Por qué esta forma. Un esqueleto es una secuencia de huecos con cardinalidad, ventana y motivo permitido, y DECLARA lo que promete: `kind` es lo que `stageKindOf(profile, timeTrial)` (`stageKind.ts` l. 71-98) tiene que devolver y `finalKind` lo que `finalKindOf` (`finalKind.ts` l. 78-85) tiene que devolver; V6 y V7 lo comprueban por etapa y reintentan (sección 9). Eso invierte la relación de hoy, donde `kind` y `label` se escriben a mano en `calendar.ts` y 72 etapas declaran una cosa mientras el perfil dibuja otra (sección 1). `ventana` es fracción y no km porque el mismo esqueleto sirve a 120 y a 230 km: `place.ts` la convierte con el km ya cuadrado. `params` sobrescribe rangos de motivo pero nunca `km` directamente (`kmRango`), porque el km de un motivo lo sortea la instanciación dentro de la intersección esqueleto × zona. `dPlus` es objetivo TOTAL con relleno (decisión 9): es lo que `calendarQueens::desnivelDe` mide y lo que `calendarQueens.test.ts` l. 62-63 exige por cubetas.

Tres campos son injertos y llevan su razón. `pesoBase` existe porque la ganadora dejó los pesos sin escribir (juez de ejecutabilidad); la sección 5 los da enteros y `arch|raceId` multiplica `pesoBase × geo.pesos[id] × ARCH.pesoPorClase[id][raceClass]`. `canonico` es un `Motif[]` literal por esqueleto, escrito a mano y comprobado en `skeletons.test.ts` contra los dieciséis vetos: es el fallback determinista tras `ARCH.colocacion.maxIntentos` 8 (`degradado: true`) y también la instancia que la galería (sección 16) enseña primero. `alternativas` es la rotación declarada del nivel 2 de edición (decisión 22): Como y Bérgamo son dos `Motif[]` completos de `ud_montana`, y la edición elige `alternativas[season % alternativas.length]` sin sorteo. `et_reina_blanda` está en el catálogo con `dPlus` [1.500; 2.500] y `finalKind: 'alto'` (decisión 8): la cola baja de desnivel se decide aquí y no la fabrica ningún test.

`Skeleton` es serializable por construcción: ningún campo es función, ninguna referencia a otro esqueleto, `requiere` es un `Partial<GeoSignature>` de datos planos. Es la condición para `sim/frozenSkeletons.ts` (decisión 33), donde las tres reinas de `REAL_QUEENS` viven como literales de este tipo y se rinden con `renderSkeleton`, y para que `fixed.skeleton` de los bancos (§3.7) no tenga que reconstruir nada. Test en `skeletons.test.ts`:

```ts
it('los 32 esqueletos sobreviven a JSON sin perder nada', () => {
  for (const sk of Object.values(SKELETONS)) expect(JSON.parse(JSON.stringify(sk))).toEqual(sk)
})
it('canonico pasa verify con la zona más restrictiva que lo admite', () => {
  for (const sk of Object.values(SKELETONS)) {
    const zona = zonasQueAdmiten(sk).sort(porRestriccion)[0]
    const req = requestCanonico(sk, zona)
    expect(verify(renderSkeleton(sk.canonico, req), sk, req, sk.canonico)).toBeNull()
  }
})
```

### 3.4 Geografía (`packages/engine/src/routes/grammar/geo.ts`)

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

Por qué esta forma. La firma es lo que hoy no existe: `oneDaySpec(terrain, km, seed)` (`calendar.ts` l. 400-407) no recibe país y `buildRace` lo calcula en l. 889 sin pasarlo a ninguna rama (mapa 02 §6). `GeoSignature` no es una tabla de estilos sino de EXISTENCIA: `puerto`, `cota` y `muro` admiten `null`, y `null` significa «aquí no existe», no «poco probable». Es lo que separa un pólder de una zona con cotas raras: en `flandes` `puerto` es `null` y V1 rechaza cualquier esqueleto con `puerto` obligatorio antes de sortear nada; en `golfo` lo son los tres y solo quedan `ud_esprint`, `et_llana_viento`, `et_llana`, `et_crono` y `et_prologo`. `admite()` y `degradar()` (sección 6) solo bajan (`montana → media → ondulado → llano`), nunca inventan hacia arriba. `relieve` es el techo de los esqueletos disponibles y la clave de `TourSkeleton.pesos`. `amplitud` sustituye a los dos literales de `rolling` (1,8 y 3,2, `profileGen.ts` l. 105) y va topada a 2,4 para que el relleno nunca alcance el 3 % que `finish.ts` lee como cota (`finishClimbMinGradient`). `viento` y `altitud` están en el tipo con la misma honradez que `null`: son METADATO (llegan a `arch.metadatos` y a la ficha, decisión 17) y `altitud` es además el criterio de V4; ninguno llega a `Segment`, porque `Segment` no tiene dónde ponerlos (§3.1).

`Territorio` es la respuesta a la composición: un país no es una zona sino una RUTA ordenada de zonas con peso, y una vuelta recorre una ventana contigua de esa ruta (sección 7). `cordillera: null` es un veto estructural sellado en test (decisión 13): «0 reinas en BE, NL, DK, AE, AU» (valor por defecto de D8, sección 18). `fallback` marca los 77 países de `COUNTRIES` (`packages/shared/src/countries.ts` l. 13) que no tienen fila y caen a un territorio genérico; el test cuenta que ninguna carrera de equipos pasa por ahí. `zonaDe(country)` devuelve la primera zona de la ruta por peso y solo la usan los 532 nacionales (decisión 15) y el contexto por defecto de §3.6.

### 3.5 Regiones (`packages/engine/src/routes/grammar/regions.ts`)

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

Por qué esta forma y no un campo en la fila. `RaceRow` (`calendar.ts` l. 381-398) tiene `country?` que nadie rellena en las 213 filas continentales (mapa 02 §1: 0 de 213; todas caen a `RACE_COUNTRY`), y las 60 ediciones de `RACE_EDITIONS` (`editions.ts` l. 25) ni siquiera tienen fila en las tres grandes vueltas. Añadir `geo?` a `RaceRow` habría dejado la zona en dos sitios y sin cubrir las ediciones. `RACE_REGION` es una tabla aparte, de contenido curado a mano con `raceRoutes.ts` abierto (decisión 14), con `default` por carrera y `stages` por etapa para las que lo necesitan: `race-france` con `stages: { 6: 'pirineos', 15: 'alpes', 18: 'alpes', 19: 'alpes', 20: 'alpes' }` es el ejemplo obligado (sección 6). `regionOf` es la única puerta: tres niveles en cascada y el tercero prohibido para carreras de equipos por test. Ningún sorteo de zona: el `geo|raceId` de la ganadora se retira (decisión 14), porque un sorteo que manda una Lieja a Provenza es exactamente el tipo de error que el dueño ve y no perdona.

### 3.6 Composición (`packages/engine/src/routes/grammar/tour.ts`)

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

/** Lo que `stageMix` sabe de la carrera además de n, terreno y semilla. Hoy no sabe nada de esto. */
export interface RouteContext {
  raceId: string | null // null: `seedBase` hace de raceId en los subflujos
  country: string // ISO alpha-2; sin fila en TERRITORIOS cae a `fallback`
  raceClass: RaceClass
  format: RaceFormat
  season: number
  routeSource: 'edicion' | 'generado'
}
export const DEFAULT_ROUTE_CONTEXT: RouteContext = {
  raceId: null,
  country: 'ZZ',
  raceClass: '2',
  format: 'una-semana',
  season: BASE_SEASON,
  routeSource: 'generado',
}
```

Por qué esta forma. `StageRole` amplía el `MixRole` de hoy (`calendar.ts` l. 413: `'llana' | 'media' | 'media-alto' | 'reina' | 'cri'`) de cinco a doce papeles, y los papeles son IDENTIDAD de la carrera (decisión 20): se sortean en `arch|raceId` sin `season`, y la edición jamás cambia el papel, el `timeTrial` ni el número de etapas. `TourSkeleton` sustituye a `MixTerrain` (l. 410) por un esqueleto de composición con reglas de bloque; `BlockRule.repara` es una función determinista que corre DESPUÉS de las cuatro garantías de `mixRoles` (l. 457-519), de atrás hacia delante, y por eso el tipo lleva funciones y no datos: es la única estructura del modelo que no se serializa, y no hace falta porque nunca se congela. `Weighted<T>` y `BlockRule` estaban sin definir en la ganadora (juez de ejecutabilidad); aquí quedan cerrados. `ultima` admite el literal `'ROUTE.lastDecisiveChance'` porque esa constante se conserva (sección 12) y la última etapa de una vuelta sigue decidiéndose con ella. `pesos` va por `Relieve` de la zona de meta y no por `MixTerrain`, que es lo que hace que una vuelta belga no sortee reinas aunque su fila diga `mountain`.

`RouteContext` y `DEFAULT_ROUTE_CONTEXT` existen por una razón mecánica: `stageMix(n, terrain, seedBase)` (`calendar.ts` l. 546) está exportada y la usan `calendar.test.ts` l. 184-277 y `stageKind.test.ts`. La decisión 19 conserva la firma añadiendo `ctx = DEFAULT_ROUTE_CONTEXT` como cuarto parámetro con valor por defecto, de modo que esos tests compilan en cada paso del plan sin reescribirse hasta el paso 8. El país por defecto `'ZZ'` (código de usuario en ISO 3166, no asignado a ningún país) cae a `fallback` y a `generico`; el test que exige «ninguna carrera de equipos en fallback» cuenta llamadas desde `buildRace`, no desde `stageMix` directo. Un aviso que la sección 7 desarrolla: `stageMix` tira hoy `mix|seedBase|n|terrain` (l. 547) y cualquier tirada añadida a `mixRoles` desplaza las 72 composiciones (juez del motor §1).

Colisión de nombre, resuelta: `stage/types.ts` l. 66 ya exporta un `StageRole` (`'lider' | 'sprinter' | …`, las órdenes de etapa) y `packages/engine/src/index.ts` l. 242 lo reexporta. El `StageRole` de la gramática conserva el nombre del glosario dentro de `routes/grammar/*` y NO se reexporta desde `index.ts`; fuera del paquete nadie lo necesita (la API expone `arch.frase` y `routeSource`, §3.8), y ningún fichero importa los dos a la vez (lint de import duplicado en `tour.test.ts`).

### 3.7 Petición y salida (`packages/engine/src/routes/grammar/generate.ts`)

```ts
// packages/engine/src/routes/grammar/generate.ts
export type RouteSource = 'real' | 'edicion' | 'generado' // por ETAPA; por carrera: 'real' | 'mixto' | 'generado'
export type RaceRouteSource = 'real' | 'mixto' | 'generado'

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
export function raceRouteSource(stages: readonly { routeSource: RouteSource }[]): RaceRouteSource
// todas 'real' → 'real'; todas 'generado' → 'generado'; cualquier otra mezcla (incluida toda 'edicion') → 'mixto'
```

Por qué esta forma. `StageRequest` es la firma nueva del generador, contra la de hoy `oneDaySpec(terrain, km, seed)` y `stageMix(n, terrain, seedBase)`: entra por fin quién es la carrera (`raceId`), dónde está (`geo`, ya resuelta por `regionOf`), qué papel hace la etapa (`role`), en qué clase corre (`raceClass`, para `ARCH.km.porClase` y `ARCH.pesoPorClase`) y en qué temporada (`season`). `terrain` sigue entrando, pero como sesgo de pesos y nunca como orden: es lo que permite que la fila `mountain` de `race-colombia` (mapa 02 §7, «el `terrain` de esas filas es ruido») no fuerce un molde. `km` es contrato al 0,1 cuando la etapa es de edición porque `calendar.test.ts` l. 162-174 vigila que los km por etapa de cada edición sean exactamente los de `RACE_EDITIONS`; en lo generado lo sortea `kmDe`. `desde` es la zona de la etapa anterior y solo lo trae una etapa de transición (sección 7). `routeSource` en la petición solo admite dos valores porque una etapa `real` nunca pasa por `generateStage` (sección 11).

`editionKey` es el injerto de semillas separadas: hoy `stagesFromEdition` (`calendar.ts` l. 216-231) siembra con `${from}|${to}|${km}` (l. 224), así que «dos etapas de carreras distintas con la misma salida, meta y distancia dibujarían el mismo relieve» (mapa 02 §7). Con `editionKey` la semilla de dibujo es `raceId|e{i}|{editionKey}` (decisión 22): la clave conserva la información de la edición (dos ediciones de la misma carrera con la misma etapa siguen dibujando lo mismo, que es lo deseado) y añade `raceId` (dos carreras distintas ya no). `fixed` es la puerta de los bancos: `sim/frozenSkeletons.ts` y la galería piden un esqueleto concreto sin recorrer `arch|raceId`, y `calendarQueens` estratificada pide `finalKind` y cubeta de desnivel (sección 13).

`GeneratedStage` lleva lo que el motor consume (`profile`) y, aparte, lo que el motor NO consume: `arch`. `kind` y `label` no se escriben a mano nunca más: son `stageKindOf(profile, timeTrial)` y V6 garantiza que coinciden con `Skeleton.kind` (decisión 23). `arch.dPlus` es `dPlusDe(profile)` (integración de tramos con g > 0, como `altimetry.ts::elevationProfile`), no el objetivo del esqueleto: el objetivo se persigue en la instanciación y aquí se anota lo medido. `arch.frase` es texto ya compuesto porque la API (sección 11) no debe conocer la gramática para enseñarla. `arch.metadatos` es el único sitio por donde `viento` y `altitud` salen del generador, y salen como datos de ficha (decisión 17). `arch` viaja con la etapa en memoria y en la API, pero NO se congela en `race_routes.profile`, que sigue siendo «exactamente el `StageProfile` que el motor recibe» (`schema.ts` l. 509 según ingeniero §3.3); lo que se congela aparte son `kind`, `label` y `time_trial` (§3.8).

### 3.8 Lo que ganan `StageSpec`, `CalendarStage` y `CalendarRace` (`calendar.ts` l. 33-46, 48-79)

```ts
// packages/engine/src/routes/calendar.ts (los campos de hoy, l. 34-40 y 42-46, más los nuevos)
export interface StageSpec {
  kind: StageKind
  label: string
  profile: StageProfile
  timeTrial?: boolean
  routeSource: RouteSource // NUEVO: 'real' | 'edicion' | 'generado'
  arch?: GeneratedStage['arch'] // NUEVO: solo si routeSource !== 'real'
}

export interface CalendarStage extends StageSpec {
  index: number // con base 1
  name: string
}

export interface CalendarRace {
  // ... los doce campos de hoy (l. 48-79: id, name, level, raceClass, format, startDay, openTo,
  //     region?, championshipCountry?, championshipCategory?, country?, stages, restAfter?) sin cambios
  routeSource: RaceRouteSource // NUEVO: raceRouteSource(stages)
}
```

Por qué en `StageSpec` y no solo en `CalendarStage`. `composeTour` y `stageMix` devuelven `StageSpec[]` (l. 546) y `buildRace` los numera después; si `routeSource` y `arch` vivieran solo en `CalendarStage`, el paso de numeración tendría que inventarlos. `arch` es opcional porque una etapa `real` (rasgos en `STAGE_FEATURES`, `featureProfile.ts` intacto en E1, decisión 27) no tiene arquitectura declarada: tiene la de verdad. `routeSource` es obligatorio: cada una de las 1.418 etapas del calendario dice de dónde sale, y `scripts/inventario-recorridos.mjs` lo lee en lugar de deducirlo. El agregado de carrera es `raceRouteSource`: una edición sin rasgos (ciudades y km reales, relieve generado) es `mixto` aunque todas sus etapas sean `edicion`, porque para el jugador «Ciudades y distancia reales, relieve generado» es una mezcla y así lo dice la interfaz (decisión 39). Los textos de la ficha por valor de etapa: `real` «Recorrido real (fuente citada)», `edicion` «Ciudades y distancia reales, relieve generado», `generado` «Recorrido generado».

En la base: `packages/db/src/raceRoutes.ts` l. 29 declara hoy `export type RouteSource = 'real' | 'generado'` y pasa a los tres valores; la columna `race_routes.route_source` es `text` con `default('generado')` (`schema.ts` l. 523), así que el tipo cambia sin migración. Lo que sí es migración (`00NN_race_routes_kind.sql`) son las tres columnas nuevas `kind`, `label` y `time_trial`, porque `calendarRun.ts` l. 516 y 1603-1616, `world/callups.ts` l. 98 y `raceContext.ts` l. 56-59 leen hoy `kind` y `timeTrial` de `SEASON_CALENDAR` y no del congelado (juez del motor, riesgo 1): con la edición por temporada, el `kind` de una carrera corrida tiene que vivir donde vive su perfil (decisión 23, sección 10). `freezeRaceRoute(db, worldId, raceKey, raceId, season)` gana `season` porque `raceKey` ya la lleva (`calendarRun.ts` l. 783: `${race.id}:s${season}`) y el congelado tiene que leer `stagesForSeason(raceId, season)` y no `SEASON_CALENDAR`.

### 3.9 Edición (`packages/engine/src/routes/grammar/edition.ts`)

```ts
// packages/engine/src/routes/grammar/edition.ts
export const BASE_SEASON = 0 // calendarRun.ts l. 135: season = floor(gameDay / SEASON_DAYS)
export function calendarForSeason(season: number): CalendarRace[] // memoizada por season
export function raceForSeason(raceId: string, season: number): CalendarRace
export function stagesForSeason(raceId: string, season: number): CalendarStage[]
export function diffMotivos(prev: Motif[], actual: Motif[]): string[] // motivos no firma que difieren; para `cambiosRespectoAnterior`
// Subflujos: `arch|raceId`, `firma|raceId` (sin season); `ed|raceId|season`; `mot|raceId|i|season|slot|j|i{intento}`,
// `pos|raceId|i|season|i{intento}`, `dib|raceId|i|season|slot|i{intento}`. Etapa de edición: raceId|e{i}|{editionKey} en lugar de raceId|i.
```

Por qué esta forma. `BASE_SEASON` vale 0 y no 1 porque `calendarRun.ts` l. 135 calcula `season = Math.floor(gameDay / SEASON_DAYS)` y el primer día del mundo es la temporada 0; la propuesta de banco usaba `calendarFor(1)` y era un error (§B.4). `SEASON_CALENDAR` (`calendar.ts` l. 3643) pasa a ser `calendarForSeason(BASE_SEASON)`, y la temporada 0 tira sus propios dados con `ed|raceId|0` (decisión 21): no es «la mediana» de nada, es una edición más, la primera. La lista de subflujos está cerrada aquí para que la sección 8 la aplique y la sección 10 la selle: `arch` y `firma` no llevan `season` (identidad), `ed` sí (edición), y `mot`, `pos`, `dib` llevan además el intento, de modo que un reintento cambia motivos, colocación y dibujo pero jamás la identidad. Las tres funciones se memoizan (`Map` por `season`; `raceForSeason` por `(raceId, season)`), y `routes/arranque.test.ts` mide que una temporada adicional cuesta ≤ `ARCH.arranque.porTemporadaMs` 1.000 ms (sección 14). `diffMotivos` compara dos `Motif[]` por posición y devuelve una frase por motivo no firma que difiere («Cota de 5,2 km al 6 % en vez de 4,1 km al 5 %»); es lo que la ficha enseña como `cambiosRespectoAnterior` (decisión 39) y por eso `Motif.firma` y `Motif.nombre` están en el tipo.

### 3.10 Vetos (`packages/engine/src/routes/grammar/veto.ts`)

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

Por qué esta forma. `verify` devuelve el PRIMER veto que falla o `null`, y `Veto.detalle` es texto para el test y para `arch.intentos` (la galería enseña «costó 2 intentos: V7 finalKind valle_corto ≠ cima_cerca»). Lee cuatro cosas y solo cuatro, todas de `routes/`: `stageKindOf` (`stageKind.ts` l. 71), `finalKindOf` (`finalKind.ts` l. 78), `climbSize` (l. 36, exportada en el paso 1) y `dPlusDe` (`geometry.ts`). No importa nada de `stage/`: ni `sampleProfile`, ni `finishType`, ni `costBase`. La razón es el riesgo 3 del juez del motor: si el generador reintentara hasta que `finishType` dijera `muro`, una recalibración de `STAGE.finish*` redibujaría perfiles y movería huellas; con vetos puros, recalibrar el motor deja los perfiles quietos y lo que cambia se ve en el censo (V16 vive allí). V11 a V14 y V16 no se comprueban por etapa sino en `routeCensus` y `tour.test.ts` (sección 9), pero comparten `VetoId` para que el informe hable un solo idioma.

### 3.11 Censo (`packages/engine/src/sim/routeCensus.ts`)

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
export function routeCensus(calendar?: CalendarRace[]): RouteStats[]
export function aggregate(
  rows: RouteStats[],
  by: (r: RouteStats) => string,
): Record<string, Summary>

type NumericKey = {
  [K in keyof RouteStats]: RouteStats[K] extends number | null ? K : never
}[keyof RouteStats]
type CategoricalKey =
  'kind' | 'label' | 'finalKind' | 'finishType' | 'skeleton' | 'zona' | 'routeSource' | 'raceClass'
export interface Quantiles {
  n: number
  min: number
  p10: number
  p50: number
  p90: number
  max: number
  media: number
}
export interface Summary {
  n: number
  num: Partial<Record<NumericKey, Quantiles>> // `null` no cuenta en n
  cat: Partial<Record<CategoricalKey, Record<string, number>>> // valor → recuento
}
```

Por qué esta forma. `RouteStats` es una fila por etapa del calendario (1.418 hoy) con todo lo que las bandas de realismo y variedad necesitan (sección 13), y es el ÚNICO sitio del diseño que llama a `sampleProfile` y `finishType` (con `groupSize` 50, lo que el motor lee de verdad): por eso `finishType` está aquí y no en `verify`. `zona` y `skeleton` son `null` para las etapas `real`, que no tienen `arch`. `dPlus` y `dPlusBloques` van los dos para imprimir el delta entre la integración de tramos y la medida por bloques de `calendarQueens` (esperado < 5 %, decisión 9). `huella` es la pendiente media por km, y es lo que `profileCorrelation` usa para V12 (anti-clon) y para la identidad entre ediciones (sección 10). `routeCensus()` sin argumento censa `SEASON_CALENDAR`; con argumento, una temporada cualquiera o el calendario del generador viejo (`sim/legacy/`) para la tabla pareada (decisión 29). Coste medido por el juez del motor con `coste-motor.mjs`: 0,57 s para las 1.418, y por eso corre en `test:rapido` en cada push (decisión 31). `Summary` separa numéricas de categóricas porque las bandas son de las dos clases: «p90 de km en .2 ≤ 170» es un cuantil; «`muro` ≥ 1 % de los finales» es un recuento.

### 3.12 Nota al pie: la traducción desde las propuestas

Quien lea una de las cinco propuestas encontrará otros nombres para lo mismo. La tabla canónica de alias es esta y el documento no usa ninguno de los alias fuera de aquí y del apéndice A:

| Canónico                                    | arquitectura                                    | banco                            | geografia                    | ingeniero                             | datos                                    |
| ------------------------------------------- | ----------------------------------------------- | -------------------------------- | ---------------------------- | ------------------------------------- | ---------------------------------------- |
| `Motif` / `MotifKind`                       | igual                                           | `Motif` (unión discriminada)     | `Motivo`                     | `Motif` (unión)                       | `MotifKind`                              |
| `Skeleton` / `SkeletonId`                   | igual                                           | `RouteBrief` / `ArchetypeId`     | `Esqueleto` / `Arquitectura` | `Skeleton` / `FamilyId`               | `Archetype` / `ArchFamily`               |
| `MetaKind`                                  | igual                                           | `FinalBrief`                     | (en `aMeta` de `Hueco`)      | `contract.finish`                     | `finalMix`                               |
| `GeoZone` / `GeoSignature`                  | igual                                           | `GeoKey` / `GeoSignature`        | `Paisaje` / `PaisajeSpec`    | `GeoKey` / `RouteGeo`                 | `RegionId` / `GeoSignature`              |
| `Territorio` / `TERRITORIOS`                | (no existe)                                     | (no existe)                      | igual                        | (no existe)                           | (no existe)                              |
| `RACE_REGION`                               | `RaceRow.geo` + `RACE_PLACE` (sorteo: retirado) | `RACE_GEO`                       | `RaceRow.paisaje`            | `RACE_GEO_OVERRIDE`                   | `RACE_REGION`                            |
| `zonaDe(country)`                           | `zonaDe`                                        | `COUNTRY_GEO`                    | `territorioDe`               | `GEO_BY_COUNTRY`                      | `COUNTRY_REGION`                         |
| `StageRole`                                 | igual                                           | `Papel`                          | `Papel`                      | `MixRole`                             | `MixRole`                                |
| `TourSkeleton`                              | igual                                           | `TourCharacter` + `TourTemplate` | `Itinerario`                 | `mixRoles` + reglas                   | `TourTemplate`                           |
| `routeSource` (`real`/`edicion`/`generado`) | igual                                           | `source`                         | `origen`                     | `origen`                              | `RouteMeta.source` (`mixto` = `edicion`) |
| `StageRequest` / `RouteContext`             | igual                                           | `RouteRequest`                   | `ContextoEtapa`              | `RouteContext` + request              | `GenInput`                               |
| `GeneratedStage.arch`                       | igual                                           | `brief`                          | `paisaje` + `arquitectura`   | `skeleton`                            | `RouteMeta`                              |
| `generateStage`                             | igual                                           | `stageFor`                       | `trazarEtapa`                | (builders + render)                   | `generateStage`                          |
| `renderSkeleton`                            | (paso 6)                                        | `render`                         | `dibujar`                    | `renderSkeleton`                      | (draw.ts)                                |
| `normalizeEnlaces` + `garantizaClase`       | `normalizeEnlaces`                              | `normalize` + guardas            | `normalize`                  | `normalize` + `garantizaPuerto`       | `garantizaClase`                         |
| `verify` / `V1..V16`                        | V1-V15                                          | `vetoesOf` / V1-V18              | `vetos` / V1-V14             | `verify` / V1-V10                     | `vetos` / V1-V12                         |
| `ARCH`                                      | igual                                           | `GEN`                            | `ROUTE.*` + `VETO` + `GEO`   | `ROUTE.motif/families/edition/verify` | `ARCH` + `EDITION` + `GEO_SIGNATURES`    |
| `BASE_SEASON` (0)                           | `season: 0`                                     | `calendarFor(1)` (error)         | `BASE_SEASON` (pregunta)     | `season 0`                            | `season 0`                               |
| `calendarForSeason`                         | `raceForSeason`/`stagesForSeason`               | `calendarFor`                    | `calendarForSeason`          | `calendarForSeason`                   | `seasonCalendar`                         |
| `ARCH.edicion.nivel`                        | (jitter)                                        | `editionOf`                      | `ROUTE.edicion.activa`       | `ROUTE.edition.p*`                    | `EDITION.level`                          |
| `routeCensus`                               | `calendario.test.ts`                            | `routeCensus`                    | `calendarGeometry.test.ts`   | `geometry.ts`                         | `routeFidelity.ts`                       |
| `frozenSkeletons`                           | «perfiles literales»                            | «cerrar por brief»               | `frozenQueens`               | `frozenSkeletons`                     | `frozenQueens`                           |
| `dPlusDe`                                   | `desnivelDe`                                    | `desnivelDe`                     | `climbMetres`                | `desnivelDe`                          | `dPlus`                                  |
| V8 (reina de verdad, dos cláusulas)         | V8                                              | V6 + V8                          | V2                           | V2 + §9.2                             | V2                                       |
| V5 (caso v40)                               | V5                                              | V1                               | V1                           | V1                                    | V1                                       |

Dos diferencias de fondo que la tabla no puede expresar y conviene saber: el `Motif` de banco e ingeniero era una unión discriminada por `tipo` con `lenKm` y `atKm` (motivo ya colocado); aquí el motivo NO lleva posición, porque la colocación es un paso propio con su subflujo `pos` (sección 8) y la ventana vive en el `Slot`. Y el `Slot` de datos medía la posición «en km desde meta» con bandas triangulares (`Band` con `mode`); aquí es fracción de la etapa desde la salida, y el p50 real que datos quería como moda vive en `ROUTE_CENSUS_TARGETS` como vara de medida (decisión 40), no dentro del tipo.
