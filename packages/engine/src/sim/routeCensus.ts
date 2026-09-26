/**
 * EL CENSO GEOMÉTRICO DEL CALENDARIO (docs/generador.md §3.10 y §13.3).
 *
 * Una fila por etapa del calendario que el juego corre (1.418 hoy), con lo que hoy nadie sabe sin
 * correr `balance.md` v60 §12 a mano: cuántos finales `muro`, `puncheur`, `alto` y `pave` produce el
 * calendario, con qué desnivel, con cuánta subida lejos de meta. Es el ÚNICO sitio del generador que
 * llama a `sampleProfile`, `deriveFinishTerrain` y `finishType` (decisión 4): los vetos leen solo
 * geometría de `routes/`, y lo que el motor lee de un final lo mide esto.
 *
 * Cuesta lo que una pasada de muestreo (0,57 s medidos por el juez del motor sobre las 1.418 etapas),
 * así que las bandas de `ROUTE_CENSUS_TARGETS` se afirman en cada push desde
 * `routes/grammar/calendario.test.ts`, que entra en `test:rapido`.
 *
 * Paso 0: ninguna etapa lleva `arch` todavía (llega en el paso 8), así que `zona`, `skeleton`,
 * `meta`, `cotaFinalKm` y `firmaMotivos` valen `null`, `intentos` y `garantiasClase` 0 y
 * `degradado` `false`. `arch` se lee con el tipo estructural `ArchLeido`, al que
 * `GeneratedStage['arch']` será asignable: el paso 8 no toca este fichero.
 */
import { ARCH, STAGE } from '../constants.js'
import { SEASON_CALENDAR } from '../routes/calendar.js'
import type { CalendarRace, CalendarStage, RaceFormat } from '../routes/calendar.js'
import { RACE_EDITIONS } from '../routes/editions.js'
import { finalKindOf, kmAfterLastClimb, profileKm, CLIMB_MIN_KM } from '../routes/finalKind.js'
import type { FinalKind } from '../routes/finalKind.js'
import {
  climbKmOutsideLast30,
  correlacionHuellas,
  dPlusDe,
  huellaDe,
  ultimaCota,
} from '../routes/grammar/geometry.js'
import type { GeoZone } from '../routes/grammar/geo.js'
import type { RouteSource } from '../routes/grammar/generate.js'
import type { MetaKind } from '../routes/grammar/motifs.js'
import type { SkeletonId } from '../routes/grammar/skeletons.js'
import { esParV12 } from '../routes/grammar/veto.js'
import { routeRng } from '../routes/profileGen.js'
import { STAGE_FEATURES } from '../routes/stageFeatures.js'
import { climbSize, stageKindOf, WALL_MAX_KM } from '../routes/stageKind.js'
import type { StageKind } from '../routes/testTour.js'
import type { RaceClass } from '../routes/uci.js'
import { deriveFinishTerrain, finishType, isUphillFinish } from '../stage/finish.js'
import type { FinishType } from '../stage/finish.js'
import { sampleProfile } from '../stage/sample.js'
import type { StageProfile } from '../stage/types.js'

export interface RouteStats {
  raceId: string
  stageIndex: number
  raceClass: RaceClass
  format: RaceFormat
  country: string | null // CalendarRace.country es opcional: el censo no inventa un país
  zona: GeoZone | null
  skeleton: SkeletonId | null
  routeSource: RouteSource
  kind: StageKind
  label: string
  finalKind: FinalKind | null
  meta: MetaKind | null // arch.motivos.at(-1)?.meta ?? null: la meta INSTANCIADA; null sin arch. V16
  cotaFinalKm: number | null // arch.motivos.at(-1)?.cotaFinal?.km ?? null. V16
  finishType: FinishType // finishType(deriveFinishTerrain(sampleProfile(profile)), 50): aquí sí
  km: number
  dPlus: number
  dPlusBloques: number // dPlusDe (total con relleno) y calendarQueens::desnivelDe (puertos solos): la diferencia es el relleno
  nPuertos: number
  nMuros: number
  longestClimbKm: number
  lastClimbKm: number | null // LONGITUD de la última cota: climbSize(ultimaCota(profile)).km; NO la posición de finalKind.ts::lastClimbKm
  lastClimbG: number | null // climbSize(ultimaCota(profile)).g: pendiente media de la parte que sube
  kmAfterLastClimb: number | null // finalKind.ts::kmAfterLastClimb tal cual
  climbKmOutsideLast30: number
  kmSubidaShare: number
  breakAppealEstimado: number
  pavesKm: number
  nSectores: number
  estrellas5: number
  nPancartas: number // profile.banners?.length ?? 0
  maxG: number
  huella: number[] // g por km, índice 0 en el último km (huellaDe)
  intentos: number
  degradado: boolean
  garantiasClase: number // 0 a 4 (sección 8, §8.9); 0 sin arch
  firmaMotivos: string | null // MotifKind de arch.motivos (hijos aplanados, sin enlace ni meta), sin repetir, ordenados, unidos por '+'
}
type NumericKey = {
  [K in keyof RouteStats]: RouteStats[K] extends number ? K : never
}[keyof RouteStats]
type CatKey =
  | 'kind'
  | 'finalKind'
  | 'meta'
  | 'finishType'
  | 'skeleton'
  | 'zona'
  | 'routeSource'
  | 'firmaMotivos'

export interface Cuantiles {
  n: number
  min: number
  p10: number
  p50: number
  p90: number
  p95: number
  max: number
  media: number
} // índice floor(n · p)
export interface Summary {
  n: number
  num: Partial<Record<NumericKey, Cuantiles>> // solo las columnas numéricas (el tipo lo impide en el resto)
  cat: Partial<Record<CatKey, Record<string, number>>> // fracción [0; 1] por valor
}

/** Lo que el censo lee de `arch`, como tipo estructural propio: `GeneratedStage['arch']` (§3.7) no
 *  existe hasta el paso 1 y `StageSpec.arch` hasta el paso 8 (§3.11). `GeneratedStage['arch']` es
 *  asignable a este tipo, así que el paso 8 no toca `routeCensus.ts`. */
interface MotivoLeido {
  kind: string
  meta?: MetaKind
  cotaFinal?: { km: number; g: number }
  hijos?: readonly MotivoLeido[]
}
interface ArchLeido {
  skeleton: SkeletonId
  geo: GeoZone
  motivos: readonly MotivoLeido[]
  intentos: number
  degradado: boolean
  garantiasClase: number
}
/** Una etapa tal como la lee el censo en cualquier paso: antes del 8 estos dos campos no existen en el tipo. */
type EtapaLeida = CalendarStage & { routeSource?: RouteSource; arch?: ArchLeido }

/**
 * El `groupSize` con que el censo tipa el final: solo separa `sprint_masivo` de `sprint_reducido` y
 * aparta `solitario` (`finish.ts::finishType`). Es un parámetro de medida y no de juego: se fija
 * aquí y solo aquí (§13.3).
 */
const GRUPO_CENSO = 50

/** El censo de un calendario: una fila por etapa, en el orden del calendario. */
export function routeCensus(calendar: CalendarRace[] = SEASON_CALENDAR): RouteStats[] {
  const filas: RouteStats[] = []
  for (const race of calendar) for (const stage of race.stages) filas.push(filaDe(race, stage))
  return filas
}

function filaDe(race: CalendarRace, stage: CalendarStage): RouteStats {
  const profile = stage.profile
  const arch = (stage as EtapaLeida).arch
  const blocks = sampleProfile(profile)
  const ft = finishType(deriveFinishTerrain(blocks), GRUPO_CENSO)
  const totalKmRuta = blocks.length * STAGE.dx
  // Km de bloques `subida` sobre el total: la MISMA cuenta que `simulate.ts` hace para `breakAppeal`.
  const kmSubida = blocks.reduce((a, b) => a + (b.tipo === 'subida' ? STAGE.dx : 0), 0)
  const kmSubidaShare = kmSubida / Math.max(1e-9, totalKmRuta)
  // `calendarQueens::desnivelDe`: los bloques `subida`, que solo dan los segmentos `puerto`.
  const dPlusBloques = blocks
    .filter((b) => b.tipo === 'subida')
    .reduce((a, b) => a + (b.g / 100) * STAGE.dx * 1000, 0)

  const puertos = profile.segments.filter((s) => s.tipo === 'puerto').map(climbSize)
  const u = ultimaCota(profile)
  const ultima = u === null ? null : climbSize(u)
  const paves = profile.segments.filter((s) => s.tipo === 'paves')
  const maxG = profile.segments.reduce(
    (mx, s) => (s.tramos ?? []).reduce((m, r) => Math.max(m, r.g), mx),
    0,
  )
  const ultimoMotivo = arch?.motivos.at(-1)

  return {
    raceId: race.id,
    stageIndex: stage.index,
    raceClass: race.raceClass,
    format: race.format,
    country: race.country ?? null,
    zona: arch?.geo ?? null,
    skeleton: arch?.skeleton ?? null,
    routeSource: routeSourceDe(race, stage),
    kind: stage.kind,
    label: stage.label,
    finalKind: finalKindOf(profile),
    meta: ultimoMotivo?.meta ?? null,
    cotaFinalKm: ultimoMotivo?.cotaFinal?.km ?? null,
    finishType: ft,
    km: profileKm(profile),
    dPlus: dPlusDe(profile),
    dPlusBloques,
    nPuertos: puertos.filter((c) => c.km >= CLIMB_MIN_KM).length,
    nMuros: puertos.filter((c) => c.km > 0 && c.km <= WALL_MAX_KM && c.g >= STAGE.wallMinGradient)
      .length,
    longestClimbKm: puertos.reduce((mx, c) => Math.max(mx, c.km), 0),
    lastClimbKm: ultima?.km ?? null,
    lastClimbG: ultima?.g ?? null,
    kmAfterLastClimb: kmAfterLastClimb(profile),
    climbKmOutsideLast30: climbKmOutsideLast30(profile),
    kmSubidaShare,
    breakAppealEstimado: Math.min(
      1,
      Math.max(
        0,
        STAGE.breakAppealClimbWeight * kmSubidaShare +
          (isUphillFinish(ft) ? STAGE.breakAppealUphillBonus : 0),
      ),
    ),
    pavesKm: paves.reduce((a, s) => a + s.km, 0),
    nSectores: paves.length,
    estrellas5: paves.filter((s) => (s.estrellas ?? 0) >= 5).length,
    nPancartas: profile.banners?.length ?? 0,
    maxG,
    huella: huellaDe(profile),
    intentos: arch?.intentos ?? 0,
    degradado: arch?.degradado ?? false,
    garantiasClase: arch?.garantiasClase ?? 0,
    firmaMotivos: arch ? firmaDe(arch.motivos) : null,
  }
}

/** Los `MotifKind` presentes (hijos aplanados), sin `enlace` ni `meta`, sin repetir, ordenados. */
function firmaDe(motivos: readonly MotivoLeido[]): string {
  const kinds = new Set<string>()
  const visitar = (ms: readonly MotivoLeido[]): void => {
    for (const m of ms) {
      if (m.kind !== 'enlace' && m.kind !== 'meta') kinds.add(m.kind)
      if (m.hijos) visitar(m.hijos)
    }
  }
  visitar(motivos)
  return [...kinds].sort().join('+')
}

/** Las columnas numéricas, como registro para que el compilador exija la lista completa. */
const NUMERICAS: Record<NumericKey, true> = {
  stageIndex: true,
  km: true,
  dPlus: true,
  dPlusBloques: true,
  nPuertos: true,
  nMuros: true,
  longestClimbKm: true,
  climbKmOutsideLast30: true,
  kmSubidaShare: true,
  breakAppealEstimado: true,
  pavesKm: true,
  nSectores: true,
  estrellas5: true,
  nPancartas: true,
  maxG: true,
  intentos: true,
  garantiasClase: true,
}
const CATEGORICAS: readonly CatKey[] = [
  'kind',
  'finalKind',
  'meta',
  'finishType',
  'skeleton',
  'zona',
  'routeSource',
  'firmaMotivos',
]

/** Cuantiles de una lista (orden ascendente, índice `floor(n · p)`); `null` si está vacía. */
export function cuantilesDe(valores: readonly number[]): Cuantiles | null {
  const n = valores.length
  if (n === 0) return null
  const s = [...valores].sort((a, b) => a - b)
  const q = (p: number): number => s[Math.min(n - 1, Math.floor(n * p))]!
  return {
    n,
    min: s[0]!,
    p10: q(0.1),
    p50: q(0.5),
    p90: q(0.9),
    p95: q(0.95),
    max: s[n - 1]!,
    media: s.reduce((a, v) => a + v, 0) / n,
  }
}

/** Resumen por grupo: cuantiles de las columnas numéricas y reparto de las categóricas. */
export function aggregate(
  rows: RouteStats[],
  by: (r: RouteStats) => string,
): Record<string, Summary> {
  const grupos = new Map<string, RouteStats[]>()
  for (const r of rows) {
    const k = by(r)
    const g = grupos.get(k)
    if (g) g.push(r)
    else grupos.set(k, [r])
  }
  const out: Record<string, Summary> = {}
  for (const [k, g] of grupos) {
    const num: Summary['num'] = {}
    for (const col of Object.keys(NUMERICAS) as NumericKey[]) {
      const c = cuantilesDe(g.map((r) => r[col]))
      if (c) num[col] = c
    }
    const cat: Summary['cat'] = {}
    for (const col of CATEGORICAS) {
      const reparto: Record<string, number> = {}
      for (const r of g) {
        const v = String(r[col])
        reparto[v] = (reparto[v] ?? 0) + 1 / g.length
      }
      cat[col] = reparto
    }
    out[k] = { n: g.length, num, cat }
  }
  return out
}

/** Entropía de Shannon en bits de un reparto (fracciones o recuentos: se normaliza por la suma). */
export function entropiaBits(reparto: Record<string, number>): number {
  const valores = Object.values(reparto).filter((v) => v > 0)
  const total = valores.reduce((a, v) => a + v, 0)
  if (total <= 0) return 0
  return -valores.reduce((a, v) => a + (v / total) * Math.log2(v / total), 0)
}

/** Pearson sobre dos `huella`, remuestreada a la más corta (la misma cuenta que `profileCorrelation`). */
export function correlacion(a: number[], b: number[]): number {
  return correlacionHuellas(a, b)
}

/**
 * El origen de una etapa. Desde el paso 8 es el campo de la etapa; antes se deduce con la MISMA regla
 * que `scripts/inventario-recorridos.mjs::provenance`: rasgos reales en `STAGE_FEATURES` (clave de
 * CARRERA, array por etapa con base 0) → 'real'; si no, fila en `RACE_EDITIONS` → 'edicion'; si no,
 * 'generado'. Con el calendario de hoy da 177 / 226 / 1.015.
 */
export function routeSourceDe(race: CalendarRace, stage: CalendarStage): RouteSource {
  const propio = (stage as EtapaLeida).routeSource
  if (propio !== undefined) return propio
  if (STAGE_FEATURES[race.id]?.[stage.index - 1]) return 'real'
  if (RACE_EDITIONS[race.id]) return 'edicion'
  return 'generado'
}

/** Una carrera de una etapa para los tests del censo. Su id no está en `STAGE_FEATURES` ni en
 *  `RACE_EDITIONS`, así que `routeSourceDe` la leería 'generado'; desde el paso 8 el campo es
 *  obligatorio y se escribe con ese mismo valor. */
export function raceDePrueba(profile: StageProfile, kind: StageKind = 'reina'): CalendarRace {
  const timeTrial = kind === 'cri'
  const stage: CalendarStage = {
    index: 1,
    name: 'Etapa de prueba',
    kind,
    label: stageKindOf(profile, timeTrial).label,
    profile,
    routeSource: 'generado',
  }
  if (timeTrial) stage.timeTrial = true // exactOptionalPropertyTypes: el campo se omite, no se pone a false
  return {
    id: 'censo-prueba',
    name: 'Censo de prueba',
    level: 'CON',
    raceClass: '1',
    format: 'un-dia',
    startDay: 100,
    openTo: [],
    stages: [stage],
    routeSource: 'generado',
  }
}

// ---------------------------------------------------------------------------------------------
// LAS BANDAS DE REALISMO Y DE VARIEDAD (§13.3, tablas «Realismo» y «Variedad»)
// ---------------------------------------------------------------------------------------------

export interface CensusTarget {
  id: string // una fila por MEDIDA
  label: string
  poblacion: (r: RouteStats) => boolean // subconjunto sobre el que se mide
  medida: (rows: RouteStats[]) => number // UN número; una banda con dos medidas son dos filas
  min?: number
  max?: number
  hoy: number | null // columna "hoy (medido)" del paso 0; null si la población no existía
  fuente: string // mapa, propuesta o juicio de donde sale la banda
  estado: 'sellada' | 'informativa' // informativa = se imprime, no afirma
  nMin: number // población mínima para afirmar; por debajo se imprime "n insuficiente"
}
export const CENSUS_N_MIN = 10

/** Lo que genera el calendario: todo lo que no es recorrido real (ediciones sin rasgos incluidas). */
const generada = (r: RouteStats): boolean => r.routeSource !== 'real'
/** Las etapas en línea generadas: `RouteStats` no lleva `timeTrial`, la crono es `kind` 'cri'. */
const enLinea = (r: RouteStats): boolean => generada(r) && r.kind !== 'cri'
const unDia = (r: RouteStats): boolean => generada(r) && r.format === 'un-dia'
const reinaGenerada = (r: RouteStats): boolean => generada(r) && r.kind === 'reina'
const deEsqueleto =
  (...ids: SkeletonId[]) =>
  (r: RouteStats): boolean =>
    r.skeleton !== null && ids.includes(r.skeleton)

const fraccion = (rows: readonly RouteStats[], pred: (r: RouteStats) => boolean): number =>
  rows.length === 0 ? 0 : rows.filter(pred).length / rows.length
const cuantil = (valores: readonly number[], p: keyof Cuantiles): number =>
  cuantilesDe(valores)?.[p] ?? 0
const sigma = (valores: readonly number[]): number => {
  if (valores.length < 2) return 0
  const m = valores.reduce((a, v) => a + v, 0) / valores.length
  return Math.sqrt(valores.reduce((a, v) => a + (v - m) ** 2, 0) / valores.length)
}
/** Esqueletos distintos. Sin `arch` (hasta el paso 8) cuenta la FORMA (`label`) de cada etapa, que
 *  es lo que hoy distingue un molde de otro: así la banda mide también el calendario de hoy. */
const formasDistintas = (rows: readonly RouteStats[]): number =>
  new Set(rows.map((r) => r.skeleton ?? `forma:${r.label}`)).size

/** Etapas agrupadas por carrera, en orden de etapa. */
function porCarrera(rows: readonly RouteStats[]): RouteStats[][] {
  const m = new Map<string, RouteStats[]>()
  for (const r of rows) {
    const g = m.get(r.raceId)
    if (g) g.push(r)
    else m.set(r.raceId, [r])
  }
  return [...m.values()].map((g) => [...g].sort((a, b) => a.stageIndex - b.stageIndex))
}

/** Tope de pares por grupo de la banda de correlación (§13.3, tabla «Variedad»). */
const PARES_POR_ESQUELETO = 200
/** Tolerancia de km para emparejar dos etapas de la misma forma sin `arch` (± 10 %, mapa 04 §5.2). */
const PAR_KM_TOLERANCIA = 0.1

/**
 * Correlación de `huella` entre los pares de V12 (`esParV12`: mismo esqueleto, misma zona, carreras
 * distintas y km ± 10 %; §9.2 fila V12, §9.5 y §12.9), con a lo sumo 200 pares deterministas por
 * grupo esqueleto × zona (`routeRng('censo|' + grupo)`); los circuitos quedan fuera del par porque sus
 * vueltas idénticas se parecen por construcción (§13.3). Sin `arch` (el calendario de la v86) el grupo
 * es la FORMA (`label`), con el mismo km y carreras distintas.
 *
 * Paso 9 (balance v87 §2): hasta aquí el grupo era solo el esqueleto y entraban pares de una misma
 * vuelta y de zonas distintas, que no son los pares que V12 prohíbe ni los que calibran su tope.
 */
export function correlacionesIntraEsqueleto(rows: readonly RouteStats[]): number[] {
  const grupos = new Map<string, RouteStats[]>()
  for (const r of rows) {
    if (r.firmaMotivos?.split('+').includes('circuito')) continue
    const k = r.skeleton !== null ? `${r.skeleton}|${r.zona ?? ''}` : `forma:${r.label}`
    const g = grupos.get(k)
    if (g) g.push(r)
    else grupos.set(k, [r])
  }
  const esPar = (a: RouteStats, b: RouteStats): boolean =>
    a.skeleton !== null
      ? esParV12(a, b)
      : a.raceId !== b.raceId && Math.abs(a.km - b.km) <= PAR_KM_TOLERANCIA * Math.min(a.km, b.km)
  const out: number[] = []
  for (const k of [...grupos.keys()].sort()) {
    const g = grupos.get(k)!
    const pares: [number, number][] = []
    for (let i = 0; i < g.length; i++)
      for (let j = i + 1; j < g.length; j++) if (esPar(g[i]!, g[j]!)) pares.push([i, j])
    // Fisher-Yates parcial con el dado del grupo: los mismos pares en cada corrida.
    const rand = routeRng(`censo|${k}`)
    const n = Math.min(PARES_POR_ESQUELETO, pares.length)
    for (let t = 0; t < n; t++) {
      const s = t + Math.floor(rand() * (pares.length - t))
      ;[pares[t], pares[s]] = [pares[s]!, pares[t]!]
      const [i, j] = pares[t]!
      out.push(correlacionHuellas(g[i]!.huella, g[j]!.huella))
    }
  }
  return out
}

/**
 * Las bandas. Regla de nacimiento (mapa 04 §5.3 regla 4): ninguna nace en rojo; las rojas de hoy van
 * en `it.todo` con la cifra medida en el nombre (`calendario.test.ts`) y se encienden en el paso 8.
 * `hoy` es la medida sobre la POBLACIÓN de la banda en el calendario del paso 0 (`ENGINE_VERSION` 86):
 * `null` si esa población está vacía (las que se filtran por `skeleton`, `zona` o `meta`, que no
 * existen hasta el paso 8). Los umbrales que dependen de claves de `ARCH` que aún no existen se
 * escriben con su valor de la sección 12 y el paso que los trae los sustituye por la clave.
 */
export const ROUTE_CENSUS_TARGETS: readonly CensusTarget[] = [
  // --- Vetos y red de clase ---------------------------------------------------------------
  {
    id: 'vetos.degradado',
    label: 'ninguna etapa generada degradada',
    poblacion: generada,
    medida: (rows) => rows.filter((r) => r.degradado).length,
    max: 0, // ARCH.veto.fallbackMaxShare.calendario (paso 5)
    hoy: 0,
    fuente: 'sección 9; §12.5',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'vetos.intentosP95',
    label: 'p95 de intentos ≤ 3',
    poblacion: (r) => generada(r) && r.skeleton !== null,
    medida: (rows) =>
      cuantil(
        rows.map((r) => r.intentos),
        'p95',
      ),
    max: 3, // ARCH.veto.intentosP95 (paso 5)
    hoy: null,
    fuente: 'sección 9; §12.5',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'garantias.clase',
    label: 'etapas con garantiasClase > 0 por debajo del 2 %',
    poblacion: generada,
    medida: (rows) => fraccion(rows, (r) => r.garantiasClase > 0),
    max: 0.0199, // estricta, < 0,02: el bucle de calendario.test.ts compara con ≤
    hoy: 0,
    fuente: 'sección 8 §8.9',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  // --- Esqueletos ---------------------------------------------------------------------------
  {
    id: 'esqueletos.clase.udWTPro',
    label: 'esqueletos distintos en los un día WT/Pro ≥ 8',
    poblacion: (r) => unDia(r) && (r.raceClass === 'WT' || r.raceClass === 'Pro'),
    medida: formasDistintas,
    min: 8,
    hoy: 3,
    fuente: 'agenda §4.18; arquitectura §11.3',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'esqueletos.clase.ud12',
    label: 'esqueletos distintos en los un día .1/.2 ≥ 10',
    poblacion: (r) => unDia(r) && (r.raceClass === '1' || r.raceClass === '2'),
    medida: formasDistintas,
    min: 10,
    hoy: 6,
    fuente: 'agenda §4.18; arquitectura §11.3',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'esqueletos.clase.papeles',
    label: 'esqueletos distintos en las etapas de vuelta ≥ 9',
    poblacion: (r) => generada(r) && r.format !== 'un-dia',
    medida: formasDistintas,
    min: 9,
    hoy: 7,
    fuente: 'agenda §4.18; arquitectura §11.3',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'esqueletos.entropia',
    label: 'entropía de esqueleto ≥ 1,5 bits en toda zona con ≥ 8 carreras de equipos',
    // Paso 9: sin los campeonatos nacionales. Llevan dos esqueletos por país por construcción
    // (`nc_crono` y `nc_ruta`, decisión 15), así que una zona poblada solo de nacionales (`cono_sur`,
    // 1,00 bits; `generico`, 1,09) no puede pasar de 1 bit; §13.3 los saca de las bandas de esqueletos
    // («los nacionales NO entran aquí») y mide su variedad en `nacionales.*`.
    poblacion: (r) => generada(r) && r.zona !== null && r.raceClass !== 'NC',
    medida: (rows) => {
      const porZona = new Map<string, RouteStats[]>()
      for (const r of rows) porZona.set(r.zona!, [...(porZona.get(r.zona!) ?? []), r])
      let peor = Infinity
      for (const g of porZona.values()) {
        if (new Set(g.map((r) => r.raceId)).size < 8) continue
        const reparto: Record<string, number> = {}
        for (const r of g) reparto[r.skeleton ?? '-'] = (reparto[r.skeleton ?? '-'] ?? 0) + 1
        peor = Math.min(peor, entropiaBits(reparto))
      }
      return peor
    },
    min: 1.5,
    hoy: null,
    fuente: 'arquitectura §11.3',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  // --- Finales de las reinas ----------------------------------------------------------------
  {
    id: 'finales.reparto.alto',
    label: 'fracción de reinas generadas con final alto en [0,45; 0,70]',
    poblacion: reinaGenerada,
    medida: (rows) => fraccion(rows, (r) => r.finalKind === 'alto'),
    min: 0.45,
    max: 0.7,
    hoy: 0.223,
    fuente: 'datos.md §1.4 (69 % real); mapa 07 §2.1',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'finales.reparto.cimaCerca',
    label: 'fracción de reinas generadas con final cima_cerca ≥ 0,05',
    poblacion: reinaGenerada,
    medida: (rows) => fraccion(rows, (r) => r.finalKind === 'cima_cerca'),
    min: 0.05,
    hoy: 0.097,
    fuente: 'datos.md §1.4',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'finales.reparto.valleCorto',
    label: 'fracción de reinas generadas con final valle_corto ≥ 0,05',
    poblacion: reinaGenerada,
    medida: (rows) => fraccion(rows, (r) => r.finalKind === 'valle_corto'),
    min: 0.05,
    hoy: 0.583,
    fuente: 'datos.md §1.4',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'finales.reparto.valleLargo',
    label: 'fracción de reinas generadas con final valle_largo ≥ 0,05',
    poblacion: reinaGenerada,
    medida: (rows) => fraccion(rows, (r) => r.finalKind === 'valle_largo'),
    min: 0.05,
    hoy: 0.097,
    fuente: 'datos.md §1.4',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  // --- Desnivel de las reinas ---------------------------------------------------------------
  {
    id: 'reina.dplus.semana',
    label: 'p50 de dPlus de las reinas generadas de una semana ≥ 2.400',
    poblacion: (r) => reinaGenerada(r) && r.format === 'una-semana',
    medida: (rows) =>
      cuantil(
        rows.map((r) => r.dPlus),
        'p50',
      ),
    min: 2400,
    hoy: 3146,
    fuente: 'mapa 04 §5.1; mapa 07 §4.1',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'reina.dplus.granVuelta',
    label: 'p50 de dPlus de las reinas generadas de gran vuelta ≥ 3.000',
    poblacion: (r) => reinaGenerada(r) && r.format === 'gran-vuelta',
    medida: (rows) =>
      cuantil(
        rows.map((r) => r.dPlus),
        'p50',
      ),
    min: 3000,
    hoy: null,
    fuente: 'mapa 04 §5.1; mapa 07 §4.1',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'reina.dplus.blanda',
    label: 'reinas generadas con dPlus en [1.500; 2.500) ≥ 15 %',
    poblacion: reinaGenerada,
    medida: (rows) => fraccion(rows, (r) => r.dPlus >= 1500 && r.dPlus < 2500),
    min: 0.15,
    hoy: 0.184,
    fuente: 'decisión 8; mapa 06 §1',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'reina.dplus.minimo',
    label: 'dPlus mínimo de las reinas generadas < 1.700',
    poblacion: reinaGenerada,
    medida: (rows) => Math.min(...rows.map((r) => r.dPlus)),
    max: 1699.99, // estricta, < 1.700
    hoy: 1973,
    fuente: 'decisión 8; calendarQueens.test.ts',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'reina.subidaLejana.cero',
    label: 'reinas generadas con 0 km de subida a más de 30 km de meta: ninguna',
    poblacion: reinaGenerada,
    medida: (rows) => rows.filter((r) => r.climbKmOutsideLast30 === 0).length,
    max: 0,
    hoy: 0,
    fuente: 'V8b; banco.md §11.2; balance.md v43 §7',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'reina.subidaLejana.p10',
    label: 'p10 de la subida a más de 30 km de meta, sobre el km de etapa, ≥ 0,05',
    poblacion: reinaGenerada,
    medida: (rows) =>
      cuantil(
        rows.map((r) => r.climbKmOutsideLast30 / r.km),
        'p10',
      ),
    min: 0.05,
    hoy: 0.102,
    fuente: 'V8b; balance.md v43 §7 (fracción del km total, sección 9 §9.4)',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'reina.puertoFinal.p50',
    label: 'p50 de la longitud del puerto final de las reinas generadas con final alto',
    poblacion: (r) => reinaGenerada(r) && r.finalKind === 'alto',
    medida: (rows) =>
      cuantil(
        rows.map((r) => r.lastClimbKm ?? 0),
        'p50',
      ),
    hoy: 13.4,
    fuente: 'datos.md §1.4 (real 3,3 / 9,7 / 17,1)',
    estado: 'informativa',
    nMin: CENSUS_N_MIN,
  },
  // --- Tipo de final que lee el motor -------------------------------------------------------
  {
    id: 'finales.muro',
    label: 'finales muro ≥ 1 % de las etapas en línea generadas',
    poblacion: enLinea,
    medida: (rows) => fraccion(rows, (r) => r.finishType === 'muro'),
    min: 0.01,
    hoy: 0,
    fuente: 'V11, V16; decisión 7',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'finales.puncheur',
    label: 'finales puncheur ≥ 8 % de las etapas en línea generadas',
    poblacion: enLinea,
    medida: (rows) => fraccion(rows, (r) => r.finishType === 'puncheur'),
    min: 0.08,
    hoy: 0.033,
    fuente: 'V11, V16; decisión 7',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  // --- Un día -------------------------------------------------------------------------------
  {
    id: 'unDia.ultimaCota.km',
    label: 'última cota ≤ 4,2 km en el 100 % de ud_montana, ud_montana_media y ud_esprint_capi',
    poblacion: (r) =>
      unDia(r) && deEsqueleto('ud_montana', 'ud_montana_media', 'ud_esprint_capi')(r),
    medida: (rows) => fraccion(rows, (r) => r.lastClimbKm !== null && r.lastClimbKm <= 4.2),
    min: 1,
    hoy: null,
    fuente: 'V5; mapa 07 §4.3; datos.md §1.4',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'unDia.ultimaCota.aMeta',
    label:
      'última cota a [3; 21] km de meta en el 98 % de ud_montana, ud_montana_media y ud_esprint_capi',
    poblacion: (r) =>
      unDia(r) && deEsqueleto('ud_montana', 'ud_montana_media', 'ud_esprint_capi')(r),
    medida: (rows) =>
      fraccion(
        rows,
        (r) => r.kmAfterLastClimb !== null && r.kmAfterLastClimb >= 3 && r.kmAfterLastClimb <= 21,
      ),
    min: 0.98,
    hoy: null,
    fuente: 'V5; mapa 07 §4.3; datos.md §1.4',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'unDia.murosMeta',
    label: 'último muro a [1; 15] km de meta en ud_muros y ud_muros_adoquin',
    poblacion: (r) => unDia(r) && deEsqueleto('ud_muros', 'ud_muros_adoquin')(r),
    medida: (rows) =>
      fraccion(
        rows,
        (r) => r.kmAfterLastClimb !== null && r.kmAfterLastClimb >= 1 && r.kmAfterLastClimb <= 15,
      ),
    min: 1,
    hoy: null,
    fuente: 'sección 5 (Roubaix a 1,1 km, Ronde a 13)',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'unDia.finalLargo',
    label: 'un día con final alto y última cota > 6 km ≤ 2 %',
    poblacion: unDia,
    medida: (rows) =>
      fraccion(rows, (r) => r.finishType === 'alto' && r.lastClimbKm !== null && r.lastClimbKm > 6),
    max: 0.02,
    hoy: 0,
    fuente: 'mapa 07 §4.4 regla 1; D1',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'muros.cotas.p10',
    label: 'p10 de muros en ud_muros y ud_muros_adoquin ≥ 10',
    poblacion: (r) => unDia(r) && deEsqueleto('ud_muros', 'ud_muros_adoquin')(r),
    medida: (rows) =>
      cuantil(
        rows.map((r) => r.nMuros),
        'p10',
      ),
    min: 10,
    hoy: null,
    fuente: 'datos.md §1.4 (real 4 / 11 / 34 cotas)',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'muros.cotas.p90',
    label: 'p90 de muros en ud_muros y ud_muros_adoquin ≤ 20',
    poblacion: (r) => unDia(r) && deEsqueleto('ud_muros', 'ud_muros_adoquin')(r),
    medida: (rows) =>
      cuantil(
        rows.map((r) => r.nMuros),
        'p90',
      ),
    max: 20,
    hoy: null,
    fuente: 'datos.md §1.4',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'adoquin.sectores.p10',
    label: 'p10 de sectores de ud_adoquin ≥ 15',
    poblacion: deEsqueleto('ud_adoquin'),
    medida: (rows) =>
      cuantil(
        rows.map((r) => r.nSectores),
        'p10',
      ),
    min: 15,
    hoy: null,
    fuente: 'Roubaix 31 sectores; real 5, 6, 8, 9, 15, 31',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'adoquin.sectores.p90',
    label: 'p90 de sectores de ud_adoquin ≤ 30',
    poblacion: deEsqueleto('ud_adoquin'),
    medida: (rows) =>
      cuantil(
        rows.map((r) => r.nSectores),
        'p90',
      ),
    max: 30,
    hoy: null,
    fuente: 'Roubaix 31 sectores',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'adoquin.km.p10',
    label: 'p10 de km de pavés de ud_adoquin ≥ 40',
    poblacion: deEsqueleto('ud_adoquin'),
    medida: (rows) =>
      cuantil(
        rows.map((r) => r.pavesKm),
        'p10',
      ),
    min: 40,
    hoy: null,
    fuente: 'Roubaix 54,8 km',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'adoquin.km.p90',
    label: 'p90 de km de pavés de ud_adoquin ≤ 60',
    poblacion: deEsqueleto('ud_adoquin'),
    medida: (rows) =>
      cuantil(
        rows.map((r) => r.pavesKm),
        'p90',
      ),
    max: 60,
    hoy: null,
    fuente: 'Roubaix 54,8 km',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  // --- Desnivel y km por clase -------------------------------------------------------------
  {
    id: 'llana.dplus',
    label: 'p90 de dPlus de las llanas generadas ≤ 1.500',
    poblacion: (r) => generada(r) && r.kind === 'llana',
    medida: (rows) =>
      cuantil(
        rows.map((r) => r.dPlus),
        'p90',
      ),
    max: 1500,
    hoy: 1253,
    fuente: 'V9 (≤ 1.800 duro); mapa 01 §1',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'km.clase.p90dosVuelta',
    label: 'p90 de km de las etapas de vuelta .2 ≤ 155',
    poblacion: (r) => enLinea(r) && r.raceClass === '2' && r.format !== 'un-dia',
    medida: (rows) =>
      cuantil(
        rows.map((r) => r.km),
        'p90',
      ),
    max: 155,
    hoy: 189,
    fuente: 'decisión 36; §12.7',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'km.clase.p50dosUnDia',
    label: 'p50 de km de los un día .2 en [150; 170]',
    poblacion: (r) => unDia(r) && r.raceClass === '2',
    medida: (rows) =>
      cuantil(
        rows.map((r) => r.km),
        'p50',
      ),
    min: 150,
    max: 170,
    hoy: 210,
    fuente: 'decisión 36; §12.7',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'km.clase.max',
    label: 'etapas generadas por encima del máximo de km de su clase: ninguna',
    // Paso 9: solo lo que la gramática SORTEA (`routeSource === 'generado'`). Una etapa de edición
    // lleva el km de la edición real, que es un contrato (§3.7) y no pasa por el techo, como las filas
    // con km explícito (D9: «no pasan por el techo», decisión 36): `race-colombia` e5 son 232 km de
    // verdad en una .1. V13, que es lo que la banda vigila, solo mira el km tras el jitter.
    poblacion: (r) => r.routeSource === 'generado',
    medida: (rows) => rows.filter((r) => r.km > ARCH.km.maxPorClase[r.raceClass] + 1e-9).length,
    max: 0,
    hoy: 176,
    fuente: 'decisión 36; D9; V13',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'dplus.relleno',
    label: 'p50 de (dPlus − dPlusBloques) / km en las llanas generadas (m/km)',
    poblacion: (r) => generada(r) && r.kind === 'llana',
    medida: (rows) =>
      cuantil(
        rows.map((r) => (r.dPlus - r.dPlusBloques) / r.km),
        'p50',
      ),
    hoy: 5.9,
    fuente: 'decisión 9; recalibra ARCH.reina.rellenoDplusPorKm 5,5',
    estado: 'informativa',
    nMin: CENSUS_N_MIN,
  },
  // --- Nacionales -------------------------------------------------------------------------
  {
    id: 'nacionales.zona',
    label: 'entropía de zona entre los nacionales en ruta ≥ 2,5 bits',
    poblacion: deEsqueleto('nc_ruta'),
    medida: (rows) => {
      const reparto: Record<string, number> = {}
      for (const r of rows) reparto[r.zona ?? '-'] = (reparto[r.zona ?? '-'] ?? 0) + 1
      return entropiaBits(reparto)
    },
    min: 2.5,
    hoy: null,
    fuente: 'decisión 15; motor.md §V.3',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'nacionales.firmas',
    label: 'firmas de motivos distintas entre los nacionales en ruta ≥ 5',
    poblacion: deEsqueleto('nc_ruta'),
    medida: (rows) => new Set(rows.map((r) => r.firmaMotivos)).size,
    min: 5,
    hoy: null,
    fuente: 'decisión 15',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'nacionales.adoquin',
    label: 'nacionales BE/NL con sector o muro adoquinado ≥ 60 %',
    poblacion: (r) => deEsqueleto('nc_ruta')(r) && (r.country === 'BE' || r.country === 'NL'),
    medida: (rows) => fraccion(rows, (r) => r.pavesKm > 0),
    min: 0.6,
    hoy: null,
    fuente: 'decisión 15',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'nacionales.cota',
    label: 'nacionales CO/EC con cota ≥ 5 km: todos',
    poblacion: (r) => deEsqueleto('nc_ruta')(r) && (r.country === 'CO' || r.country === 'EC'),
    medida: (rows) => fraccion(rows, (r) => r.longestClimbKm >= 5),
    min: 1,
    hoy: null,
    fuente: 'decisión 15',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'nacionales.expuesto',
    label: 'nacionales DK/AE con tramo expuesto: todos',
    poblacion: (r) => deEsqueleto('nc_ruta')(r) && (r.country === 'DK' || r.country === 'AE'),
    medida: (rows) => fraccion(rows, (r) => (r.firmaMotivos ?? '').split('+').includes('expuesto')),
    min: 1,
    hoy: null,
    fuente: 'decisión 15',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  // --- Táctica y pancartas (informativas) --------------------------------------------------
  {
    id: 'tactica.kmSubida.circuito',
    label: 'kmSubidaShare de ud_circuito ≤ 0,20',
    poblacion: deEsqueleto('ud_circuito'),
    medida: (rows) =>
      cuantil(
        rows.map((r) => r.kmSubidaShare),
        'p50',
      ),
    max: 0.2,
    hoy: null,
    fuente: 'decisión 25; juicios/motor.md §5 riesgo 4',
    estado: 'informativa',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'tactica.kmSubida.muros',
    label: 'kmSubidaShare de ud_muros ≤ 0,15',
    poblacion: deEsqueleto('ud_muros'),
    medida: (rows) =>
      cuantil(
        rows.map((r) => r.kmSubidaShare),
        'p50',
      ),
    max: 0.15,
    hoy: null,
    fuente: 'decisión 25; juicios/motor.md §5 riesgo 4',
    estado: 'informativa',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'pancartas.unDia',
    label: 'máximo de pancartas en un día generado ≤ 6',
    poblacion: unDia,
    medida: (rows) => Math.max(...rows.map((r) => r.nPancartas)),
    max: 6,
    hoy: 5,
    fuente: 'sección 8 §8.10; decisión 25',
    estado: 'informativa',
    nMin: CENSUS_N_MIN,
  },
  // --- Variedad (§13.3, tabla «Variedad») ---------------------------------------------------
  {
    id: 'variedad.correlacion.mediana',
    label: 'mediana de la correlación de huella intra-esqueleto < 0,8',
    poblacion: (r) => generada(r) && r.skeleton !== null,
    medida: (rows) => cuantil(correlacionesIntraEsqueleto(rows), 'p50'),
    max: 0.7999, // estricta, < 0,8
    hoy: null,
    fuente: 'mapa 04 §5.2; arquitectura §11.3',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'variedad.correlacion.max',
    label: `máximo de la correlación de huella intra-esqueleto < ${String(ARCH.anticlon.maxCorrelacion).replace('.', ',')} (ARCH.anticlon.maxCorrelacion)`,
    poblacion: (r) => generada(r) && r.skeleton !== null,
    medida: (rows) => cuantil(correlacionesIntraEsqueleto(rows), 'max'),
    max: ARCH.anticlon.maxCorrelacion - 1e-4, // estricta, < ARCH.anticlon.maxCorrelacion (calibrado en el paso 9, §9.5)
    hoy: null,
    fuente: 'V12; §9.5',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'variedad.dplusCubetaAlta',
    label: 'σ de dPlus de las reinas generadas en [2.600; 4.600] > 500 m',
    poblacion: (r) => reinaGenerada(r) && r.dPlus >= 2600 && r.dPlus <= 4600,
    medida: (rows) => sigma(rows.map((r) => r.dPlus)),
    min: 500,
    hoy: 521,
    fuente: 'mapa 04 §5.2',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'variedad.secuencias',
    label: 'frecuencia máxima de una secuencia de tipos en las vueltas de 5 etapas ≤ 25 %',
    poblacion: (r) => generada(r) && r.format !== 'un-dia',
    medida: (rows) => {
      const vueltas = porCarrera(rows).filter((g) => g.length === 5)
      if (vueltas.length === 0) return 0
      const cuenta = new Map<string, number>()
      for (const g of vueltas) {
        const s = g.map((r) => r.kind).join(' ')
        cuenta.set(s, (cuenta.get(s) ?? 0) + 1)
      }
      return Math.max(...cuenta.values()) / vueltas.length
    },
    max: 0.25,
    hoy: 0.122,
    fuente: 'datos.md §11.4',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'variedad.finalesPorVuelta',
    label: 'vueltas con ≥ 3 reinas y todas con final alto: ninguna',
    poblacion: (r) => generada(r) && r.format !== 'un-dia',
    medida: (rows) =>
      porCarrera(rows).filter((g) => {
        const reinas = g.filter((r) => r.kind === 'reina')
        return reinas.length >= 3 && reinas.every((r) => r.finalKind === 'alto')
      }).length,
    max: 0,
    hoy: 1,
    fuente: 'mapa 04 §5.2',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'variedad.kmUnDia.uno',
    label: 'σ de km de los un día .1 > 15 km',
    poblacion: (r) => unDia(r) && r.raceClass === '1',
    medida: (rows) => sigma(rows.map((r) => r.km)),
    min: 15,
    hoy: 20.4,
    fuente: 'decisión 36',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
  {
    id: 'variedad.kmUnDia.dos',
    label: 'σ de km de los un día .2 > 15 km',
    poblacion: (r) => unDia(r) && r.raceClass === '2',
    medida: (rows) => sigma(rows.map((r) => r.km)),
    min: 15,
    hoy: 6.8,
    fuente: 'decisión 36',
    estado: 'sellada',
    nMin: CENSUS_N_MIN,
  },
]
