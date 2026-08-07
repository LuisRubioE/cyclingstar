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
 * Un sector de PAVÉ real: empieza en `startKm`, mide `lengthKm` y su dureza publicada es `stars`
 * (1-5 estrellas, el baremo de la organización de Paris-Roubaix). El motor cobra el pavé por esas
 * estrellas (SPEC 6.5), así que este es el dato que convierte una clásica del Norte en una clásica
 * del Norte. OJO: solo va aquí el pavé LLANO; un muro adoquinado se modela como puerto (`climbs`),
 * porque el muestreo solo puede darle un terreno a cada bloque (ver stage/sample.ts).
 */
export interface StageCobbles {
  name: string
  /** Kilómetro (desde la salida) en el que EMPIEZA el sector. */
  startKm: number
  /** Longitud del sector en km. */
  lengthKm: number
  /** Dureza en estrellas (1-5). */
  stars: number
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
   * Sectores de pavé REALES (los de la tabla oficial de la carrera). Se superponen al trazado ya
   * construido: no cambian el relieve, cambian el firme y su coste (SPEC 6.5).
   */
  cobbles?: StageCobbles[]
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

/**
 * Sectores de pavé saneados: en km creciente, recortados al recorrido y SIN SOLAPARSE (si dos se
 * pisan —defecto habitual de las tablas publicadas— el segundo arranca donde acaba el primero, y si
 * con eso se queda sin longitud se descarta). Determinista y sin excepciones: un dato imperfecto no
 * puede reventar la construcción de una etapa.
 */
function sanitizeCobbles(cobbles: StageCobbles[], totalKm: number): StageCobbles[] {
  const out: StageCobbles[] = []
  let end = 0
  for (const c of [...cobbles].sort((a, b) => a.startKm - b.startKm)) {
    const start = Math.max(end, Math.min(totalKm, c.startKm))
    const stop = Math.min(totalKm, c.startKm + c.lengthKm)
    if (stop - start < 0.1) continue
    out.push({ name: c.name, startKm: r2(start), lengthKm: r2(stop - start), stars: c.stars })
    end = stop
  }
  return out
}

/** Trozo `[from, to)` (km dentro del segmento) de los tramos de un segmento, con su pendiente. */
function sliceRamps(ramps: Ramp[], from: number, to: number): Ramp[] {
  const out: Ramp[] = []
  let acc = 0
  for (const ramp of ramps) {
    const a = Math.max(from, acc)
    const b = Math.min(to, acc + ramp.km)
    if (b - a > 0.005) out.push({ km: r2(b - a), g: ramp.g })
    acc += ramp.km
  }
  return out
}

/**
 * Superpone los sectores de pavé sobre el trazado ya construido: parte los segmentos por las
 * fronteras de cada sector y marca los trozos resultantes como `paves` con sus `estrellas`,
 * conservando la pendiente (el adoquín no cambia el relieve; cambia el firme y su coste, SPEC 6.5).
 *
 * Un trozo que cae dentro de un PUERTO se deja como puerto: un muro adoquinado ya está modelado como
 * subida, y el muestreo solo da un terreno por bloque (el pavé solo se cobra en segmentos `paves`,
 * ver stage/sample.ts). Por eso en `cobbles` va únicamente el pavé llano.
 */
function applyCobbles(segments: Segment[], cobbles: StageCobbles[], totalKm: number): Segment[] {
  const sectors = sanitizeCobbles(cobbles, totalKm)
  if (sectors.length === 0) return segments
  const out: Segment[] = []
  let cursor = 0
  for (const seg of segments) {
    const segStart = cursor
    const segEnd = cursor + seg.km
    cursor = segEnd
    // Fronteras de sector que caen DENTRO de este segmento: dividen el segmento en trozos.
    const cuts = [segStart, segEnd]
    for (const s of sectors) {
      for (const km of [s.startKm, s.startKm + s.lengthKm])
        if (km > segStart + 0.005 && km < segEnd - 0.005) cuts.push(km)
    }
    if (cuts.length === 2) {
      out.push(cobbledOrSame(seg, seg, segStart, segEnd, sectors))
      continue
    }
    cuts.sort((a, b) => a - b)
    const pieces: Segment[] = []
    for (let i = 0; i < cuts.length - 1; i++) {
      const from = cuts[i]!
      const to = cuts[i + 1]!
      if (to - from < 0.005) continue
      const piece: Segment = {
        km: r2(to - from),
        tipo: seg.tipo,
        ...(seg.tramos ? { tramos: sliceRamps(seg.tramos, from - segStart, to - segStart) } : {}),
        ...(seg.estrellas != null ? { estrellas: seg.estrellas } : {}),
      }
      pieces.push(cobbledOrSame(piece, seg, from, to, sectors))
    }
    // El troceado redondea a 2 decimales: la cola absorbe la deriva para no mover la distancia total.
    const drift = seg.km - pieces.reduce((acc, p) => acc + p.km, 0)
    const last = pieces[pieces.length - 1]
    if (last && Math.abs(drift) > 0.001) {
      last.km = r2(last.km + drift)
      if (last.tramos && last.tramos.length === 1) last.tramos[0]!.km = last.km
    }
    out.push(...pieces)
  }
  return out
}

/** El trozo `[from, to)` convertido en pavé si cae dentro de un sector (y no es un puerto). */
function cobbledOrSame(
  piece: Segment,
  origin: Segment,
  from: number,
  to: number,
  sectors: StageCobbles[],
): Segment {
  if (origin.tipo === 'puerto') return piece
  const mid = (from + to) / 2
  const sector = sectors.find((s) => mid >= s.startKm && mid < s.startKm + s.lengthKm)
  if (!sector) return piece
  return { ...piece, tipo: 'paves', estrellas: sector.stars }
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
 * cima en cada puerto (categoría oficial o derivada) y un sprint en cada meta volante real, y al final
 * se superponen los sectores de pavé reales (`cobbles`), que marcan el firme sin tocar el relieve.
 */
export function buildFeatureProfile(
  totalKm: number,
  features: StageFeatures,
  seed: string,
): StageProfile {
  const profile = buildRelief(totalKm, features, seed)
  if (features.cobbles && features.cobbles.length > 0)
    profile.segments = normalizeTotal(
      applyCobbles(profile.segments, features.cobbles, totalKm),
      totalKm,
    )
  return profile
}

/** El relieve de la etapa: de la altitud real muestreada si la hay, o reconstruido de los puertos. */
function buildRelief(totalKm: number, features: StageFeatures, seed: string): StageProfile {
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
