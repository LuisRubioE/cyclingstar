/**
 * Muestreo del recorrido: de tramos de autoría a bloques de 100 metros (SPEC 6.2).
 * Puro y determinista. La categoría de una cima se DERIVA del score de dureza, solo para
 * puntos y relato (SPEC 6.2).
 */
import { STAGE } from '../constants.js'
import type {
  Block,
  BlockTerrain,
  ClimbCategory,
  Ramp,
  Segment,
  SegmentTerrain,
  StageProfile,
} from './types.js'

/** Pendiente por defecto de un tipo de terreno cuando el segmento no trae tramos (SPEC 6.4). */
const DEFAULT_GRADIENT: Record<SegmentTerrain, number> = {
  llano: 0,
  rompepiernas: STAGE.rollingGradient,
  puerto: 6,
  descenso: -6,
  paves: 0,
}

/** Mapa del terreno de autoría al terreno físico de la ley de velocidad (SPEC 6.4). */
function blockTerrain(tipo: SegmentTerrain): BlockTerrain {
  switch (tipo) {
    case 'puerto':
      return 'subida'
    case 'descenso':
      return 'descenso'
    case 'paves':
      return 'paves'
    case 'llano':
    case 'rompepiernas':
      return 'llano'
  }
}

/** Pendiente en el punto `kmInSegment` de un segmento, muestreada de sus tramos. */
function gradientAt(segment: Segment, kmInSegment: number): number {
  const ramps = segment.tramos
  if (!ramps || ramps.length === 0) return DEFAULT_GRADIENT[segment.tipo]
  let acc = 0
  for (const ramp of ramps) {
    acc += ramp.km
    if (kmInSegment < acc) return ramp.g
  }
  // Redondeos: el último tramo cubre la cola del segmento.
  return ramps[ramps.length - 1]?.g ?? DEFAULT_GRADIENT[segment.tipo]
}

/** Longitud total del recorrido en km (suma de segmentos). */
export function stageLengthKm(profile: StageProfile): number {
  return profile.segments.reduce((sum, s) => sum + s.km, 0)
}

/**
 * Muestrea el recorrido a bloques de `dx` km (SPEC 6.2). El bloque `i` se evalúa en su punto
 * medio `(i + 0.5)·dx`; un banner en el km X cae en el bloque que lo cruza, `floor(X / dx)`.
 */
export function sampleProfile(profile: StageProfile, dx: number = STAGE.dx): Block[] {
  const totalKm = stageLengthKm(profile)
  const n = Math.round(totalKm / dx)

  // Fronteras acumuladas de cada segmento para localizar un km en O(segmentos).
  const bounds: number[] = []
  let acc = 0
  for (const s of profile.segments) {
    acc += s.km
    bounds.push(acc)
  }

  const locate = (km: number): { segment: Segment; kmInSegment: number } => {
    for (let s = 0; s < profile.segments.length; s++) {
      if (km < (bounds[s] ?? Infinity)) {
        const segment = profile.segments[s]!
        const segStart = s === 0 ? 0 : bounds[s - 1]!
        return { segment, kmInSegment: km - segStart }
      }
    }
    // Cola del recorrido: pertenece al último segmento.
    const last = profile.segments.length - 1
    const segment = profile.segments[last]!
    const segStart = last === 0 ? 0 : bounds[last - 1]!
    return { segment, kmInSegment: km - segStart }
  }

  const blocks: Block[] = []
  for (let i = 0; i < n; i++) {
    const midKm = (i + 0.5) * dx
    const { segment, kmInSegment } = locate(midKm)
    const tipo = blockTerrain(segment.tipo)
    const g =
      segment.tipo === 'rompepiernas' ? STAGE.rollingGradient : gradientAt(segment, kmInSegment)
    blocks.push({
      g,
      tipo,
      estrellas: segment.tipo === 'paves' ? (segment.estrellas ?? 0) : 0,
    })
  }

  // Banners: al bloque que cruza su km (SPEC 6.2, 6.11).
  for (const banner of profile.banners ?? []) {
    const idx = Math.min(n - 1, Math.max(0, Math.floor(banner.km / dx)))
    const block = blocks[idx]
    if (block) block.banner = banner.tipo
  }

  return blocks
}

/**
 * Categoría de una cima derivada de sus tramos: score = sum(km_i·g_i^2) con g_i > 2 (SPEC 6.2).
 * Solo alimenta puntos y relato, nunca la física.
 */
export function deriveClimbCategory(ramps: Ramp[]): ClimbCategory {
  let score = 0
  for (const ramp of ramps) {
    if (ramp.g > STAGE.climbScoreMinGradient) score += ramp.km * ramp.g * ramp.g
  }
  const t = STAGE.climbCatThresholds
  if (score >= t.hc) return 'HC'
  if (score >= t.cat1) return 'cat1'
  if (score >= t.cat2) return 'cat2'
  if (score >= t.cat3) return 'cat3'
  if (score >= t.cat4) return 'cat4'
  return null
}

/** Detecta un muro: subida total <= 2,5 km con g >= 8 (SPEC 6.4): usa COL en vez de MON. */
export function isWall(ramps: Ramp[]): boolean {
  let km = 0
  let steepKm = 0
  for (const ramp of ramps) {
    km += ramp.km
    if (ramp.g >= STAGE.wallMinGradient) steepKm += ramp.km
  }
  return km <= STAGE.wallMaxKm && steepKm > 0
}
