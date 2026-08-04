/**
 * Generador de altimetrías: de un perfil de autoría a un SVG de la etapa (SPEC, Paso 28).
 * Puro y determinista. La elevación se integra de las pendientes de los tramos; los banners se
 * marcan sobre la curva y la categoría de cada cima se DERIVA de la dureza del puerto (SPEC 6.2).
 */
import { deriveClimbCategory } from '../stage/sample.js'
import { defaultGradient } from '../stage/sample.js'
import type { ClimbCategory, Ramp, StageProfile } from '../stage/types.js'

export interface ElevationPoint {
  km: number
  elevM: number
}

/** Perfil de elevación (m) integrando las pendientes de los tramos a lo largo del recorrido. */
export function elevationProfile(profile: StageProfile): ElevationPoint[] {
  const points: ElevationPoint[] = [{ km: 0, elevM: 0 }]
  let km = 0
  let elev = 0
  for (const segment of profile.segments) {
    const ramps: Ramp[] = segment.tramos ?? [{ km: segment.km, g: defaultGradient(segment.tipo) }]
    let covered = 0
    for (const ramp of ramps) {
      km += ramp.km
      // g% = g metros por cada 100 m = g·10 m por km.
      elev += ramp.g * ramp.km * 10
      points.push({ km, elevM: elev })
      covered += ramp.km
    }
    // Si los tramos no cubren el segmento, el resto rueda a la pendiente por defecto.
    const remainder = segment.km - covered
    if (remainder > 0.001) {
      km += remainder
      elev += defaultGradient(segment.tipo) * remainder * 10
      points.push({ km, elevM: elev })
    }
  }
  return points
}

/** Categoría de la cima que corona un banner en `bannerKm` (o null si no es puntuable). */
function climbCategoryAt(profile: StageProfile, bannerKm: number): ClimbCategory {
  let start = 0
  for (const segment of profile.segments) {
    const end = start + segment.km
    if (bannerKm <= end + 0.001) {
      return segment.tramos ? deriveClimbCategory(segment.tramos) : null
    }
    start = end
  }
  return null
}

/** Marca de un momento clave del replay sobre la altimetría (SPEC Paso 31). */
export interface AltimetryMarker {
  km: number
  label: string
}

export interface AltimetryOptions {
  width?: number
  height?: number
  /** Título opcional mostrado arriba a la izquierda. */
  title?: string
  /** Momentos clave del replay a marcar sobre la curva (fugas, capturas, meta…). */
  markers?: AltimetryMarker[]
}

const PAD = 24

/** Etiqueta de un banner (en inglés): meta volante = sprint intermedio; cima = KOM o su categoría. */
function bannerLabel(profile: StageProfile, kind: 'meta_volante' | 'cima', km: number): string {
  if (kind === 'meta_volante') return 'Sprint'
  const cat = climbCategoryAt(profile, km)
  return cat ?? 'Summit'
}

/**
 * Renderiza la altimetría de una etapa como un SVG autocontenido (SPEC Paso 28). El área bajo la
 * curva es el relieve; las líneas verticales marcan los banners con su categoría derivada.
 */
export function renderAltimetrySvg(profile: StageProfile, options: AltimetryOptions = {}): string {
  const width = options.width ?? 720
  const height = options.height ?? 200
  const points = elevationProfile(profile)
  const totalKm = points[points.length - 1]?.km ?? 1
  const minElev = Math.min(...points.map((p) => p.elevM), 0)
  const maxElev = Math.max(...points.map((p) => p.elevM), 1)
  // Escala vertical con un mínimo: si el desnivel de la etapa es pequeño (una llana ondula ~50-150 m)
  // NO se estira a toda la altura, para que una etapa llana se vea llana y no como una montaña. Solo
  // cuando el desnivel real supera este mínimo (media/alta montaña) crece el eje y se ve el relieve.
  const MIN_ELEV_SPAN = 900
  const spanElev = Math.max(MIN_ELEV_SPAN, maxElev - minElev)

  const toX = (km: number): number => PAD + (km / Math.max(1, totalKm)) * (width - 2 * PAD)
  const toY = (elev: number): number =>
    height - PAD - ((elev - minElev) / spanElev) * (height - 2 * PAD)

  const curve = points.map((p) => `${toX(p.km).toFixed(1)},${toY(p.elevM).toFixed(1)}`).join(' ')
  const area = `${toX(0).toFixed(1)},${(height - PAD).toFixed(1)} ${curve} ${toX(totalKm).toFixed(1)},${(height - PAD).toFixed(1)}`

  // Etiquetas de banners escalonadas: si dos caen muy juntas (p.ej. un sprint sobre un puerto) se
  // colocan en filas distintas para que no se solapen y se lean las dos.
  let prevX = -Infinity
  let row = 0
  const bannerMarks = (profile.banners ?? [])
    .slice()
    .sort((a, b) => a.km - b.km)
    .map((b) => {
      const xn = toX(b.km)
      const x = xn.toFixed(1)
      const label = bannerLabel(profile, b.tipo, b.km)
      const color = b.tipo === 'cima' ? '#dc2626' : '#16a34a'
      row = xn - prevX < 34 ? (row + 1) % 2 : 0
      prevX = xn
      const labelY = PAD - 6 + row * 13 // fila 0 encima del gráfico, fila 1 justo debajo
      return `<line x1="${x}" y1="${PAD}" x2="${x}" y2="${height - PAD}" stroke="${color}" stroke-width="1" stroke-dasharray="3 3" opacity="0.7"/><text x="${x}" y="${labelY}" fill="${color}" font-size="11" text-anchor="middle" font-family="sans-serif">${label}</text>`
    })
    .join('')

  const titleText = options.title
    ? `<text x="${PAD}" y="${PAD - 8}" fill="#334155" font-size="12" font-family="sans-serif" font-weight="600">${options.title}</text>`
    : ''

  // Elevación interpolada en un km, para posar los marcadores sobre la curva.
  const elevAtKm = (km: number): number => {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!
      const b = points[i]!
      if (km <= b.km) {
        const t = b.km === a.km ? 0 : (km - a.km) / (b.km - a.km)
        return a.elevM + (b.elevM - a.elevM) * t
      }
    }
    return points[points.length - 1]?.elevM ?? 0
  }

  const markerMarks = (options.markers ?? [])
    .map((m, i) => {
      const cx = toX(m.km).toFixed(1)
      const cy = toY(elevAtKm(m.km)).toFixed(1)
      // Etiquetas alternas arriba/abajo para que no se pisen.
      const ly = (Number(cy) + (i % 2 === 0 ? -8 : 14)).toFixed(1)
      return `<circle cx="${cx}" cy="${cy}" r="3.5" fill="#0f172a"/><text x="${cx}" y="${ly}" fill="#0f172a" font-size="10" text-anchor="middle" font-family="sans-serif">${m.label}</text>`
    })
    .join('')

  return [
    `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Altimetría${options.title ? ` ${options.title}` : ''}">`,
    `<polygon points="${area}" fill="#6366f1" opacity="0.18"/>`,
    `<polyline points="${curve}" fill="none" stroke="#4f46e5" stroke-width="2"/>`,
    bannerMarks,
    markerMarks,
    titleText,
    `<text x="${width - PAD}" y="${height - 6}" fill="#94a3b8" font-size="10" font-family="sans-serif" text-anchor="end">${Math.round(totalKm)} km</text>`,
    `</svg>`,
  ].join('')
}
