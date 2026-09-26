/**
 * LA GEOMETRÍA QUE LEEN EL CENSO Y LOS VETOS (docs/generador.md §3.9).
 *
 * Geometría de `routes/`: segmentos y tramos, NUNCA bloques. Nada de aquí llama a `sampleProfile`
 * ni a nada de `stage/` con valor (decisión 4): el motor lee el perfil a su manera y eso lo mide el
 * censo (`sim/routeCensus.ts`), no los vetos. Todo es puro y determinista.
 *
 * Paso 0: nacen las funciones que son columnas o bandas del censo. `describeProfile` y
 * `rachasDeSubida` llegan en el paso 4.
 */
import { ARCH } from '../../constants.js'
import type { Segment, StageProfile } from '../../stage/types.js'
import { CLIMB_MIN_KM, lastClimbKm, profileKm } from '../finalKind.js'
import { climbMetres, climbSize } from '../stageKind.js'

/** Desnivel positivo TOTAL por tramos (Σ g·km·10 de los tramos con g > 0), relleno incluido (decisión 9). */
export function dPlusDe(profile: StageProfile): number {
  return profile.segments.reduce((a, s) => a + climbMetres(s), 0)
}

/** Km de segmentos `puerto` sobre el km total de la etapa; 0 en un perfil vacío. */
export function kmSubidaShare(profile: StageProfile): number {
  const total = profileKm(profile)
  if (total <= 0) return 0
  const puertos = profile.segments.reduce((a, s) => a + (s.tipo === 'puerto' ? s.km : 0), 0)
  return puertos / total
}

/**
 * Km de subida (tramos con g > 0 de segmentos `puerto`) a más de `kmToGo` km de meta. Un tramo que
 * cruza la línea cuenta solo por la parte que queda más allá (sección 9, §9.4: la variable que
 * separó `reina-150` de las reinas reales). Los tramos se colocan uno tras otro desde el inicio de
 * su segmento, como hace `climbSize`.
 */
export function climbKmOutsideLast30(
  profile: StageProfile,
  kmToGo: number = ARCH.reina.subidaLejanaKm,
): number {
  const limite = profileKm(profile) - kmToGo // posición a partir de la cual queda ≤ kmToGo a meta
  let inicio = 0
  let km = 0
  for (const s of profile.segments) {
    if (s.tipo === 'puerto') {
      let a = inicio
      for (const r of s.tramos ?? []) {
        const b = a + r.km
        if (r.g > 0) km += Math.max(0, Math.min(b, limite) - a)
        a = b
      }
    }
    inicio += s.km
  }
  return km
}

/** `climbKmOutsideLast30` sobre Σ `climbSize(puerto).km`; 0 si la etapa no tiene subida en puertos. */
export function subidaLejanaShare(profile: StageProfile): number {
  const subida = profile.segments.reduce(
    (a, s) => a + (s.tipo === 'puerto' ? climbSize(s).km : 0),
    0,
  )
  if (subida <= 0) return 0
  return climbKmOutsideLast30(profile) / subida
}

/**
 * Pendiente media por kilómetro entero, con el índice 0 en el ÚLTIMO km (el eje nace en la meta, así
 * dos etapas de 235 y 255 km comparan el final con el final). Se integra por tramos: un segmento sin
 * tramos cuenta como llano (la misma lectura que `climbMetres`), y si los tramos no llegan al final
 * del segmento el último cubre la cola, como hace el muestreo del motor. El km más alejado de meta
 * puede ser parcial y se promedia sobre lo que cubre.
 */
export function huellaDe(profile: StageProfile): number[] {
  const total = profileKm(profile)
  const n = Math.max(1, Math.ceil(total - EPS))
  const suma = new Array<number>(n).fill(0)
  const cubierto = new Array<number>(n).fill(0)
  // Reparte un trozo [a, b] (posiciones desde la salida) a pendiente g entre los km contados desde meta.
  const repartir = (a: number, b: number, g: number): void => {
    let x = a
    while (x < b - EPS) {
      const i = Math.min(n - 1, Math.max(0, Math.floor(total - x - EPS))) // km desde meta que contiene x
      const finDelKm = total - i // borde del km i más cercano a la meta
      const y = Math.min(b, finDelKm)
      const largo = y - x
      if (largo <= 0) break
      suma[i]! += g * largo
      cubierto[i]! += largo
      x = y
    }
  }
  let inicio = 0
  for (const s of profile.segments) {
    const fin = inicio + s.km
    const tramos = s.tramos ?? []
    if (tramos.length === 0) repartir(inicio, fin, 0)
    else {
      let a = inicio
      for (const r of tramos) {
        const b = Math.min(fin, a + r.km)
        if (b > a) repartir(a, b, r.g)
        a = b
      }
      if (a < fin) repartir(a, fin, tramos[tramos.length - 1]!.g)
    }
    inicio = fin
  }
  return suma.map((m, i) => (cubierto[i]! > 0 ? m / cubierto[i]! : 0))
}

/**
 * Pearson entre dos huellas (vectores de `huellaDe`, índice 0 en meta), remuestreando la más larga a
 * la longitud de la más corta sobre el eje normalizado [0; 1] desde meta. 0 si alguna es constante o
 * tiene menos de dos puntos: una llana sin relieve no se parece a nada, ni a otra llana.
 */
export function correlacionHuellas(a: readonly number[], b: readonly number[]): number {
  const m = Math.min(a.length, b.length)
  if (m < 2) return 0
  const x = remuestrear(a, m)
  const y = remuestrear(b, m)
  const mx = x.reduce((s, v) => s + v, 0) / m
  const my = y.reduce((s, v) => s + v, 0) / m
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < m; i++) {
    const dx = x[i]! - mx
    const dy = y[i]! - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  if (sxx <= 0 || syy <= 0) return 0
  return sxy / Math.sqrt(sxx * syy)
}

/** Pearson sobre la pendiente por km de los dos perfiles, eje normalizado desde meta (V12). */
export function profileCorrelation(a: StageProfile, b: StageProfile): number {
  return correlacionHuellas(huellaDe(a), huellaDe(b))
}

/**
 * El SEGMENTO de la última cota, el que `finalKind.ts::lastClimbKm` señala por posición: con
 * pancartas `cima`, el `puerto` cuyo final está a ≤ 0,5 km de la última (el último si hay dos); sin
 * pancartas, el último `puerto` ≥ `CLIMB_MIN_KM`. `null` si la etapa no tiene cotas (cuerpo en §13.3).
 */
export function ultimaCota(profile: StageProfile): Segment | null {
  const km = lastClimbKm(profile) // pancarta o, sin pancartas, último puerto ≥ 1,5 km
  if (km === null) return null
  const conCimas = (profile.banners ?? []).some((b) => b.tipo === 'cima')
  let fin = 0
  let elegido: Segment | null = null
  for (const s of profile.segments) {
    fin += s.km
    if (s.tipo !== 'puerto') continue
    if (conCimas ? Math.abs(fin - km) <= TOLERANCIA_CIMA_KM : s.km >= CLIMB_MIN_KM) elegido = s // el último que cumple
  }
  if (elegido !== null || !conCimas) return elegido
  // Pancarta sin `puerto` a ≤ 0,5 km: solo pasa en perfiles `real` (los de `featureProfile`). Se toma
  // el segmento, de cualquier tipo, que contiene el km de la pancarta.
  let ini = 0
  for (const s of profile.segments) {
    if (km <= ini + s.km + EPS) return s
    ini += s.km
  }
  return profile.segments.at(-1) ?? null
}

/** Remuestrea `v` a `m` puntos tomando el índice más cercano en el eje normalizado. */
function remuestrear(v: readonly number[], m: number): number[] {
  if (v.length === m) return [...v]
  const out: number[] = []
  for (let j = 0; j < m; j++) out.push(v[Math.round((j * (v.length - 1)) / (m - 1))]!)
  return out
}

/** No es una constante de intención: el error del redondeo al entero con que `auto()` y
 *  `emitirPancartas` ponen la cima (≤ 0,5 km), más el épsilon de coma flotante. */
const TOLERANCIA_CIMA_KM = 0.5 + 1e-6
/** Épsilon de coma flotante para comparar posiciones acumuladas. */
const EPS = 1e-9
