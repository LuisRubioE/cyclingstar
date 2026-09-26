/**
 * LA GEOMETRÍA QUE LEEN EL CENSO Y LOS VETOS (docs/generador.md §3.9).
 *
 * Geometría de `routes/`: segmentos y tramos, NUNCA bloques. Nada de aquí llama a `sampleProfile`
 * ni a nada de `stage/` con valor (decisión 4): el motor lee el perfil a su manera y eso lo mide el
 * censo (`sim/routeCensus.ts`), no los vetos. Todo es puro y determinista.
 *
 * Paso 0: nacen las funciones que son columnas o bandas del censo. Paso 4: `rachasDeSubida` (V9, la
 * leen `verify` en el paso 5 y `veto.test.ts`) y `describeProfile` (un perfil de hoy leído como
 * motivos, §13.5: solo la llaman `sim/frozenSkeletons.ts` en el paso 9 y su test).
 */
import { ARCH } from '../../constants.js'
import type { Segment, StageProfile } from '../../stage/types.js'
import { CLIMB_MIN_KM, FINAL_KIND_CUTS, lastClimbKm, profileKm } from '../finalKind.js'
import { climbMetres, climbSize, PASS_MIN_KM } from '../stageKind.js'
import type { MetaKind, Motif } from './motifs.js'

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

/**
 * Rachas de subida de V9 (§9.2). Se aplanan los tramos de todos los segmentos en orden (un segmento
 * sin `tramos` cuenta como un tramo de su km a 0 %, que es lo que le suman `dPlusDe` y
 * `climbMetres`: nada). Una racha empieza en un tramo con `g ≥ gMin` y sigue mientras los tramos
 * siguientes cumplan lo mismo; un grupo de tramos seguidos con `g < gMin` cuyo km sume `≤ rellanoKm`
 * y tras el que vuelva un tramo de la racha es un rellano: no la corta y cuenta en su km y en su
 * media, como el respiro de `finish.ts`. La media es ponderada por km; `finKmAMeta` es la distancia
 * del final del último tramo con `g ≥ gMin` a la meta. No hay longitud mínima: la filtra V9.
 */
export function rachasDeSubida(
  profile: StageProfile,
  gMin: number = ARCH.veto.llana.rachaGMin,
  rellanoKm: number = ARCH.veto.llana.rellanoKm,
): { km: number; g: number; finKmAMeta: number }[] {
  const t: { ini: number; km: number; g: number }[] = []
  let cum = 0
  for (const s of profile.segments) {
    let c = cum
    for (const r of s.tramos && s.tramos.length > 0 ? s.tramos : [{ km: s.km, g: 0 }]) {
      t.push({ ini: c, km: r.km, g: r.g })
      c += r.km
    }
    cum += s.km
  }
  const out: { km: number; g: number; finKmAMeta: number }[] = []
  let i = 0
  while (i < t.length) {
    if (t[i]!.g < gMin) {
      i++
      continue
    }
    let j = i // último tramo de la racha con g ≥ gMin
    let k = i + 1
    while (k < t.length) {
      if (t[k]!.g >= gMin) {
        j = k
        k++
        continue
      }
      let r = k
      let kmRellano = 0
      while (r < t.length && t[r]!.g < gMin) {
        kmRellano += t[r]!.km
        r++
      }
      if (r < t.length && kmRellano <= rellanoKm + EPS) {
        k = r // rellano absorbido: la racha sigue en t[r]
        continue
      }
      break
    }
    const seq = t.slice(i, j + 1)
    const km = seq.reduce((a, x) => a + x.km, 0)
    out.push({
      km,
      g: seq.reduce((a, x) => a + x.km * x.g, 0) / km,
      finKmAMeta: cum - (t[j]!.ini + t[j]!.km),
    })
    i = j + 1
  }
  return out
}

// ---------------------------------------------------------------------------------------------------
// describeProfile (§13.5): un perfil ya dibujado leído como Motif[]. Seis reglas.
// ---------------------------------------------------------------------------------------------------

const r1 = (x: number): number => Math.round(x * 10) / 10
const acota = (x: number, [a, b]: readonly [number, number]): number => Math.min(b, Math.max(a, x))
/** La pendiente de una cota en `describeProfile`: `ARCH.motivo.cota.g` con el techo EXCLUIDO (al 8 % empieza el muro), a la resolución de 0,1. */
const COTA_G: readonly [number, number] = [ARCH.motivo.cota.g[0], r1(ARCH.motivo.cota.g[1] - 0.1)]
/** La de la `cotaFinal` de una meta con valle: de la cota más suave al puerto más duro (`validateMotif`, §4.5 regla 5). */
const COTA_FINAL_G: readonly [number, number] = [ARCH.motivo.cota.g[0], ARCH.motivo.puerto.g[1]]

/** Reglas 1 y 2: la subida de un segmento `puerto` como motivo; el hueco (8,0; 9,0) se parte en `PASS_MIN_KM`. */
function motivoDeSubida(s: Segment): Motif {
  const c = climbSize(s)
  const km = r1(c.km)
  const g = r1(c.g)
  const { puerto, cota, muro } = ARCH.motivo
  if (km >= puerto.km[0]) return { kind: 'puerto', km, g: acota(g, puerto.g), forma: 'regular' }
  if (km >= PASS_MIN_KM)
    return { kind: 'puerto', km: puerto.km[0], g: acota(g, puerto.g), forma: 'regular' } // [8,5; 9,0) → 9,0
  if (km > cota.km[1]) return { kind: 'cota', km: cota.km[1], g: acota(g, COTA_G) } // (8,0; 8,5) → 8,0
  if (km >= cota.km[0]) return { kind: 'cota', km, g: acota(g, COTA_G) }
  if (g >= muro.g[0]) return { kind: 'muro', km, g: acota(g, muro.g) }
  return { kind: 'cota', km: cota.km[0], g: acota(g, COTA_G) }
}

/** Regla 3: el valle de hoy decide el `MetaKind` con los cortes de `FINAL_KIND_CUTS`, llevado al rango de `ARCH.meta`. */
function metaDeValle(
  cota: { km: number; g: number },
  valleHoy: number,
): { meta: MetaKind; valle: number } {
  const C = FINAL_KIND_CUTS
  const M = ARCH.meta
  if (valleHoy <= C.alto) {
    if (cota.km >= M.altoLargo.km[0]) return { meta: 'alto_largo', valle: 0 }
    if (cota.km >= M.altoCorto.km[0] && cota.km <= M.altoCorto.km[1])
      return { meta: 'alto_corto', valle: 0 }
    throw new Error(
      `describeProfile: final en alto de ${cota.km} km fuera de alto_corto y de alto_largo`,
    )
  }
  if (valleHoy <= C.cimaCerca)
    return { meta: 'cima_cerca', valle: acota(valleHoy, M.cimaCerca.valle) }
  if (valleHoy <= C.valleCorto)
    return { meta: 'descenso_meta', valle: acota(valleHoy, M.descensoMeta.valle) }
  return { meta: 'valle', valle: acota(valleHoy, M.valle.valle) }
}

/** Regla 4: media de los tramos ponderada por km. */
function mediaG(s: Segment): number {
  const t = s.tramos ?? []
  const km = t.reduce((a, r) => a + r.km, 0)
  if (km <= 0) throw new Error('describeProfile: descenso sin tramos')
  return t.reduce((a, r) => a + r.g * r.km, 0) / km
}

/**
 * Un perfil ya dibujado leído como `Motif[]` (§13.5): lo usan `sim/frozenSkeletons.ts` (paso 9) y su
 * test, nada más. Seis reglas: (1) una subida es un `puerto` con `climbSize ≥ CLIMB_MIN_KM`, medido
 * con `climbSize` y con la pendiente recortada al rango de su motivo; (2) el hueco (8,0; 9,0) se parte
 * en `PASS_MIN_KM` y la cima no se mueve (el km ganado o perdido lo paga el relleno previo); (3) la
 * última subida es la `cotaFinal` de la meta y su valle decide el `MetaKind`; (4) el `descenso` tras
 * una subida que no es la última es un `descenso`; (5) todo lo demás es relleno, y el relleno entre
 * dos dificultades es UN `enlace` (uno de menos de 1 km, o un `paves`, lanza); (6) la deriva del
 * redondeo va al `enlace` más largo, de modo que Σ km es el km de hoy al 0,1.
 */
export function describeProfile(profile: StageProfile): Motif[] {
  const segs = profile.segments
  const esSubida = (s: Segment): boolean => s.tipo === 'puerto' && climbSize(s).km >= CLIMB_MIN_KM
  let iUlt = -1
  segs.forEach((s, i) => {
    if (esSubida(s)) iUlt = i
  })
  if (iUlt < 0)
    throw new Error('describeProfile: sin una subida de 1,5 km o más no hay meta que describir')
  const out: Motif[] = []
  let relleno = 0 // km de relleno aún sin cerrar en un enlace
  let trasSubida = false
  const cerrar = (): void => {
    if (Math.abs(relleno) < 0.05) {
      relleno = 0
      return
    }
    if (relleno < ARCH.motivo.enlace.km[0])
      throw new Error(`describeProfile: enlace de ${r1(relleno)} km`)
    out.push({ kind: 'enlace', km: r1(relleno) })
    relleno = 0
  }
  for (let i = 0; i < iUlt; i++) {
    const s = segs[i]!
    if (esSubida(s)) {
      const m = motivoDeSubida(s)
      relleno -= m.km - s.km // regla 2: la cima no se mueve
      cerrar()
      out.push(m)
      trasSubida = true
    } else if (s.tipo === 'descenso' && trasSubida) {
      cerrar()
      out.push({ kind: 'descenso', km: r1(s.km), g: acota(r1(mediaG(s)), ARCH.motivo.descenso.g) })
      trasSubida = false
    } else if (s.tipo === 'paves') {
      throw new Error('describeProfile: paves sin regla')
    } else {
      relleno += s.km // llano, rompepiernas, puerto < 1,5, descenso suelto
      trasSubida = false
    }
  }
  const ult = segs[iUlt]!
  const m = motivoDeSubida(ult)
  relleno -= m.km - ult.km
  let finUlt = 0
  for (let i = 0; i <= iUlt; i++) finUlt += segs[i]!.km
  const valleHoy = r1(profileKm(profile) - finUlt)
  // La pendiente de la cotaFinal se recorta a la envolvente de la subida de meta, cota o puerto ([4;
  // 12], la de `validateMotif` para una meta con valle) y no a la de la cota suelta: un final de 6,6 km
  // al 10,6 % (Guatemala e9) es una `cotaFinal` válida y congelar por forma es conservarlo (§13.5).
  const cotaFinal = { km: m.km, g: acota(r1(climbSize(ult).g), COTA_FINAL_G) }
  const { meta, valle } = metaDeValle(cotaFinal, valleHoy)
  relleno -= valle - valleHoy // regla 3: el valle corregido lo paga el relleno previo
  cerrar()
  out.push({ kind: 'meta', meta, km: r1(cotaFinal.km + valle), cotaFinal })
  const resto = r1(profileKm(profile) - out.reduce((a, x) => a + x.km, 0)) // regla 6
  const enlaces = out.filter((x) => x.kind === 'enlace')
  if (resto !== 0 && enlaces.length > 0) {
    const e = enlaces.reduce((a, b) => (b.km > a.km ? b : a))
    e.km = r1(e.km + resto)
  }
  return out
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
