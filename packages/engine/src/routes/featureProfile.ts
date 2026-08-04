/**
 * Perfil de etapa construido a partir de sus RASGOS REALES: los puertos puntuables (posición de la
 * cima, longitud y pendiente media) y los sprints intermedios reales. A diferencia del generador por
 * terreno (profileGen), que dibuja un relieve verosímil pero inventado, aquí el relieve REPRODUCE la
 * etapa real: cada puerto se coloca donde de verdad está, con su longitud y dureza (de las que se
 * deriva su categoría, SPEC 6.2), y cada sprint intermedio cae en su kilómetro real.
 *
 * El resultado es un StageProfile normal —segmentos + banners— así que alimenta por igual la altimetría
 * y la FÍSICA de la carrera: los puertos reales cuentan para la montaña y el esfuerzo, no son decorado.
 * Puro y determinista (semilla por etapa para el relleno ondulado entre puertos).
 */
import { deriveClimbCategory } from '../stage/sample.js'
import type { Banner, ClimbCategory, Ramp, Segment, StageProfile } from '../stage/types.js'

/** Un puerto real de la etapa: su cima está en `summitKm`, mide `lengthKm` al `avgGradient` % medio. */
export interface StageClimb {
  name: string
  /** Kilómetro (desde la salida) en el que se corona. */
  summitKm: number
  /** Longitud de la subida en km. */
  lengthKm: number
  /** Pendiente media en % (positiva). */
  avgGradient: number
  /**
   * Categoría OFICIAL del puerto, si la carrera la publica (algunas usan su propio baremo). Si se da,
   * es la que se muestra y puntúa; si no, se deriva de la longitud y pendiente reales (SPEC 6.2).
   */
  category?: ClimbCategory
}

/** Un sprint intermedio real: cae en el kilómetro `km`. */
export interface StageSprint {
  name: string
  km: number
}

/**
 * Muestra de ALTITUD REAL: a `km` de la salida el recorrido está a `elevM` metros. Una serie de estas
 * (de PCS/La Flamme Rouge o de un GPX) define el trazado REAL: el motor integra la pendiente entre
 * muestras consecutivas, así el relieve deja de ser un relleno sintético y reproduce la etapa de verdad.
 */
export interface StageElevation {
  km: number
  elevM: number
}

/** Rasgos reales de una etapa (los que definen su altimetría puntuable). */
export interface StageFeatures {
  climbs?: StageClimb[]
  sprints?: StageSprint[]
  /**
   * Perfil de altitud REAL muestreado (km desde salida -> metros). Si viene (>= 2 muestras), el trazado
   * se construye integrando estas muestras en vez del relleno ondulado sintético; los puertos y sprints
   * siguen marcándose como banners. Las muestras deben ir en km creciente.
   */
  elevation?: StageElevation[]
}

const r2 = (n: number): number => Math.round(n * 100) / 100
const r1 = (n: number): number => Math.round(n * 10) / 10

/** PRNG determinista (mulberry32) sembrado desde una cadena, para el relleno ondulado. */
function seededRand(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let a = h >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Tramos de un puerto de `lengthKm` km al `avgGradient` % medio. No es uniforme: arranca más suave,
 * se endurece en el centro y afloja arriba (como un puerto real). La media ponderada por km se ajusta
 * EXACTA al valor real (el desnivel coincide), y el perfil variado eleva un poco el score de dureza
 * —convexo en la pendiente— acercando la categoría derivada a la oficial en los puertos justos.
 */
function climbRamps(lengthKm: number, avgGradient: number): Ramp[] {
  const parts = [0.3, 0.4, 0.3]
  const shape = [0.8, 1.3, 0.85]
  const wmean = parts.reduce((acc, p, i) => acc + p * shape[i]!, 0)
  const k = avgGradient / wmean
  const ramps: Ramp[] = parts.map((p, i) => ({ km: r2(lengthKm * p), g: r1(shape[i]! * k) }))
  // Corrige la deriva de redondeo del último tramo para que el desnivel total sea el real.
  const targetRise = lengthKm * avgGradient
  const rise = ramps.reduce((acc, rp) => acc + rp.km * rp.g, 0)
  const last = ramps[ramps.length - 1]!
  if (last.km > 0) last.g = r1(last.g + (targetRise - rise) / last.km)
  return ramps
}

/** Un descenso de `lengthKm` km que pierde `dropM` metros (pendiente negativa media). */
function descentSegment(lengthKm: number, dropM: number): Segment {
  const g = -(dropM / (lengthKm * 10))
  return { km: r2(lengthKm), tipo: 'descenso', tramos: [{ km: r2(lengthKm), g: r1(g) }] }
}

/** Relleno ondulado (falsos llanos y toboganes suaves) de `lengthKm` km. Determinista por semilla. */
function rollingFill(lengthKm: number, seed: string): Segment[] {
  if (lengthKm <= 0.05) return []
  const rand = seededRand(seed)
  const segs: Segment[] = []
  let rem = lengthKm
  while (rem > 0.4) {
    const len = Math.min(rem, 1.4 + rand() * 2.2)
    const up = rand() < 0.5
    const g = r1((0.4 + rand() * 2.4) * (up ? 1 : -1))
    segs.push({ km: r2(len), tipo: 'llano', tramos: [{ km: r2(len), g }] })
    rem -= len
  }
  if (rem > 0.05) segs.push({ km: r2(rem), tipo: 'llano' })
  return segs
}

/** Ajusta la longitud total exacta estirando/encogiendo el último segmento (como en profileGen). */
function normalizeTotal(segments: Segment[], totalKm: number): Segment[] {
  const sum = segments.reduce((acc, s) => acc + s.km, 0)
  const diff = totalKm - sum
  if (Math.abs(diff) >= 0.05 && segments.length > 0) {
    const last = segments[segments.length - 1]!
    last.km = r2(Math.max(0.1, last.km + diff))
    if (last.tramos && last.tramos.length === 1) last.tramos[0]!.km = last.km
  }
  return segments
}

/** Terreno físico de un tramo según su pendiente real (SPEC 6.4): sube, baja o llanea/rompepiernas. */
function terrainForGradient(g: number): Segment['tipo'] {
  if (g >= 3) return 'puerto'
  if (g <= -3) return 'descenso'
  return 'llano'
}

/** Cima/meta_volante de cada puerto y sprint; la categoría es la oficial o la derivada de la subida. */
function bannersFromFeatures(climbs: StageClimb[], sprints: StageSprint[]): Banner[] {
  const banners: Banner[] = []
  for (const c of climbs)
    banners.push({
      km: Math.round(c.summitKm),
      tipo: 'cima',
      cat: c.category ?? deriveClimbCategory(climbRamps(c.lengthKm, c.avgGradient)),
    })
  for (const s of sprints) banners.push({ km: Math.round(s.km), tipo: 'meta_volante' })
  banners.sort((a, b) => a.km - b.km || (a.tipo === 'cima' ? -1 : 1))
  return banners
}

/**
 * Trazado REAL a partir de muestras de altitud: entre dos muestras consecutivas la pendiente es
 * (Δaltitud / Δdistancia), así el relieve reproduce el perfil de verdad (no un relleno inventado). Los
 * puertos y sprints se marcan igual como banners (su categoría es la oficial o la derivada de la subida).
 */
function profileFromElevation(
  totalKm: number,
  elevation: StageElevation[],
  climbs: StageClimb[],
  sprints: StageSprint[],
): StageProfile {
  // Muestras dentro de [0, totalKm], en km creciente, sin duplicados de km (se queda la última).
  const pts: StageElevation[] = []
  for (const p of [...elevation].sort((a, b) => a.km - b.km)) {
    const km = Math.min(totalKm, Math.max(0, p.km))
    const prev = pts[pts.length - 1]
    if (prev && km - prev.km < 0.02) prev.elevM = p.elevM
    else pts.push({ km, elevM: p.elevM })
  }
  // Ancla los extremos a la salida (0) y a la meta (totalKm) manteniendo su altitud.
  if (pts.length > 0 && pts[0]!.km > 0.02) pts.unshift({ km: 0, elevM: pts[0]!.elevM })
  const lastPt = pts[pts.length - 1]
  if (lastPt && lastPt.km < totalKm - 0.02) pts.push({ km: totalKm, elevM: lastPt.elevM })

  const segments: Segment[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!
    const b = pts[i + 1]!
    const dk = b.km - a.km
    if (dk < 0.02) continue
    const g = r1((b.elevM - a.elevM) / (dk * 10))
    segments.push({ km: r2(dk), tipo: terrainForGradient(g), tramos: [{ km: r2(dk), g }] })
  }

  return {
    segments: normalizeTotal(segments, totalKm),
    banners: bannersFromFeatures(climbs, sprints),
  }
}

/**
 * Construye el perfil real de una etapa. Si la etapa trae ALTITUD REAL muestreada (`elevation`), el
 * trazado se integra de esas muestras (fiel de verdad). Si no, se reconstruye a partir de los puertos
 * (cada uno en su km, con descenso y relleno ondulado entre unos y otros). En ambos casos se marca una
 * cima en cada puerto (categoría oficial o derivada) y un sprint en cada meta volante real.
 */
export function buildFeatureProfile(
  totalKm: number,
  features: StageFeatures,
  seed: string,
): StageProfile {
  if (features.elevation && features.elevation.length >= 2)
    return profileFromElevation(
      totalKm,
      features.elevation,
      features.climbs ?? [],
      features.sprints ?? [],
    )
  const climbs = [...(features.climbs ?? [])].sort((a, b) => a.summitKm - b.summitKm)
  const segments: Segment[] = []
  const banners: Banner[] = []
  let cursor = 0
  let prevGainM = 0

  climbs.forEach((c, idx) => {
    const baseKm = Math.max(cursor, c.summitKm - c.lengthKm)
    let gap = baseKm - cursor
    if (gap > 0) {
      // Tras un puerto, primero se baja parte del hueco; luego, terreno ondulado hasta el pie del siguiente.
      if (prevGainM > 0) {
        const descLen = Math.min(gap * 0.65, Math.max(1, prevGainM / 55))
        if (descLen > 0.3) {
          segments.push(descentSegment(descLen, prevGainM * 0.85))
          gap -= descLen
          prevGainM = 0
        }
      }
      segments.push(...rollingFill(gap, `${seed}:roll${idx}`))
    }
    const climbLen = Math.max(0.3, c.summitKm - Math.max(cursor, baseKm))
    const ramps = climbRamps(climbLen, c.avgGradient)
    segments.push({ km: r2(climbLen), tipo: 'puerto', tramos: ramps })
    // La categoría del banner se fija AQUÍ (oficial si la trae, o derivada de la subida real): así la
    // etiqueta y los puntos no dependen del redondeo del km del banner al localizar el segmento.
    banners.push({
      km: Math.round(c.summitKm),
      tipo: 'cima',
      cat: c.category ?? deriveClimbCategory(ramps),
    })
    prevGainM = climbLen * c.avgGradient * 10
    cursor = c.summitKm
  })

  // Cola hasta meta: si el último puerto no es final en alto, se baja y se llega en llano ondulado.
  let tail = totalKm - cursor
  if (tail > 0) {
    if (prevGainM > 0 && tail > 1.5) {
      const descLen = Math.min(tail * 0.6, Math.max(1, prevGainM / 55))
      segments.push(descentSegment(descLen, prevGainM * 0.85))
      tail -= descLen
    }
    segments.push(...rollingFill(tail, `${seed}:tail`))
  }

  for (const s of features.sprints ?? [])
    banners.push({ km: Math.round(s.km), tipo: 'meta_volante' })
  banners.sort((a, b) => a.km - b.km || (a.tipo === 'cima' ? -1 : 1))

  return { segments: normalizeTotal(segments, totalKm), banners }
}
