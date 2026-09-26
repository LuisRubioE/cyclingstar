/**
 * VETOS DEL GENERADOR (docs/generador.md §3.9 y sección 9).
 *
 * Los vetos son puros y solo leen `routes/` y la geometría de `grammar/geometry.ts`: NUNCA
 * `sampleProfile`, `finishType` ni `costBase` (decisión 4; lo sella el tercer `it` de
 * `routes/arranque.test.ts`). Lo que el motor lee de un perfil se mide en `sim/routeCensus.ts`, y por
 * eso V11, V12 y V16 leen filas de `RouteStats` ya medidas y no perfiles.
 *
 * Tres capas: once por etapa con reintento (V1 a V10 y V15, en `verify`), tres de calendario sobre el
 * censo (V11, V12, V16) y dos de vuelta (V13, V14). Paso 1: los tipos. Paso 5: `finalKindDe`,
 * `verify`, V1 a V12, V15, V16 y `conjuntoV16`. Paso 7: V13 y V14, que leen `ventanaReina` y los
 * predicados de papel de `tour.ts` dentro de la función (el ciclo `tour → generate → veto → tour` es
 * inocuo: nadie lee un valor del otro en el nivel superior del módulo, §15.8).
 */
import { ARCH, ROUTE, STAGE } from '../../constants.js'
import type { RouteStats } from '../../sim/routeCensus.js' // solo tipo: se borra al compilar
import type { FinishType } from '../../stage/finish.js' // solo tipo: la regla de §14.4 lo admite
import type { Segment, StageProfile } from '../../stage/types.js'
import { finalKindOf, kmAfterLastClimb, lastClimbKm, type FinalKind } from '../finalKind.js'
import { PASS_MIN_KM, climbMetres, climbSize, stageKindOf } from '../stageKind.js'
import type { RaceClass } from '../uci.js'
import type { StageRequest } from './generate.js'
import type { GeoSignature } from './geo.js'
import {
  correlacionHuellas,
  dPlusDe,
  rachasDeSubida,
  subidaLejanaShare,
  ultimaCota,
} from './geometry.js'
import type { MetaKind, Motif } from './motifs.js'
import { kmNoEnlace, type Placed } from './place.js'
import { SKELETONS, type Skeleton, type SkeletonId } from './skeletons.js'
import {
  acabaArriba,
  esCrono,
  esReina,
  huecoCorto,
  ventanaReina,
  type StageRole,
  type TourSkeletonId,
} from './tour.js'

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

/** El veto que falló y por qué, para el test y la galería ("Intentos y rechazos"). */
export interface Veto {
  id: VetoId
  detalle: string
}

/**
 * Un veto por etapa, puro. `kmObjetivo` es el km de la INSTANCIA (`EditionPlan.km`), no el de la
 * petición; `colocados` son los `Placed` rendidos (solo V10 lee estos dos).
 */
export type VetoFn = (
  profile: StageProfile,
  sk: Skeleton,
  req: StageRequest,
  motivos: Motif[],
  kmObjetivo: number,
  colocados: Placed[],
) => Veto | null

/** Toda comparación con un umbral la lleva: las sumas de tramos al 0,1 no son exactas en coma flotante (150 + 59,95). */
const EPS = 1e-9
const veto = (id: VetoId, detalle: string): Veto => ({ id, detalle: `${id}: ${detalle}` })
/** Motivos a cualquier profundidad: hijos de `cadena`, `racimo` y `circuito`, y el sector de `sector_meta`. */
const aplanar = (ms: readonly Motif[]): Motif[] => ms.flatMap((m) => [m, ...aplanar(m.hijos ?? [])])
/** La meta instanciada: la del último motivo; la del esqueleto solo si la lista viene vacía (perfiles literales de test). */
const metaDe = (sk: Skeleton, motivos: readonly Motif[]): MetaKind =>
  motivos.at(-1)?.meta ?? sk.meta
const puertos = (p: StageProfile): Segment[] => p.segments.filter((s) => s.tipo === 'puerto')

/** El `finalKindOf` que promete cada `MetaKind` (§9.2, V7); `null` en `esprint` y `sector_meta`, cuyo final varía. */
export function finalKindDe(meta: MetaKind): FinalKind | null {
  switch (meta) {
    case 'repecho':
    case 'muro_meta':
    case 'alto_corto':
    case 'alto_largo':
      return 'alto'
    case 'cima_cerca':
      return 'cima_cerca'
    case 'descenso_meta':
      return 'valle_corto'
    case 'valle':
      return 'valle_largo'
    case 'esprint':
    case 'sector_meta':
      return null
  }
}

/** Las dos excepciones al suelo de 0,5 km: el muro de una rampa (§4.2) y el sector corto. */
const cortoAdmitido = (s: Segment): boolean =>
  (s.tipo === 'puerto' && s.tramos?.length === 1 && s.km >= ARCH.motivo.muro.km[0] - EPS) ||
  (s.tipo === 'paves' && s.km >= ARCH.motivo.sector.km[0] - EPS)

/** V10 cabe: (a) el enlace sobre `colocados` llega al 12 %; (b) ningún segmento bajo 0,5 km salvo las excepciones; (c) Σ km al 0,1. */
export const V10: VetoFn = (profile, _sk, _req, _motivos, kmObjetivo, colocados) => {
  const enlace = kmObjetivo - colocados.reduce((a, p) => a + kmNoEnlace(p), 0)
  if (enlace < ARCH.colocacion.enlaceMinimoTotal * kmObjetivo - EPS)
    return veto(
      'V10',
      `(a) enlace ${enlace.toFixed(1)} km < ${ARCH.colocacion.enlaceMinimoTotal} × ${kmObjetivo}`,
    )
  const corto = profile.segments.find(
    (s) => s.km < ARCH.veto.segmentoMinKm - EPS && !cortoAdmitido(s),
  )
  if (corto)
    return veto('V10', `(b) segmento ${corto.tipo} de ${corto.km} km < ${ARCH.veto.segmentoMinKm}`)
  const total = profile.segments.reduce((a, s) => a + s.km, 0)
  if (Math.abs(total - kmObjetivo) > ARCH.veto.kmTolerancia + EPS)
    return veto('V10', `(c) Σ km ${total.toFixed(2)} ≠ ${kmObjetivo}`)
  return null
}

/** V15 pendientes: ningún tramo por encima de `gMax` ni por debajo de `gMin`, ni uno de puerto bajo `subidaGMin`. */
export const V15: VetoFn = (profile) => {
  const { gMax, gMin, subidaGMin } = ARCH.veto.pendientes
  for (const s of profile.segments)
    for (const r of s.tramos ?? []) {
      if (r.g > gMax + EPS || r.g < gMin - EPS)
        return veto('V15', `tramo al ${r.g} % en un ${s.tipo}`)
      if (s.tipo === 'puerto' && r.g < subidaGMin - EPS)
        return veto('V15', `tramo al ${r.g} % dentro de un puerto`)
    }
  return null
}

/** V6 reina es reina: el `kind` que da el clasificador es el que el esqueleto promete. */
export const V6: VetoFn = (profile, sk) => {
  const kind = stageKindOf(profile, sk.kind === 'cri').kind
  return kind === sk.kind
    ? null
    : veto('V6', `stageKindOf dice ${kind}; ${sk.id} promete ${sk.kind}`)
}

/** V7 el final declarado: `finalKindOf` es el del esqueleto o, si no lo declara, el de la meta instanciada. */
export const V7: VetoFn = (profile, sk, _req, motivos) => {
  const debe = sk.finalKind ?? finalKindDe(metaDe(sk, motivos))
  if (debe === null) return null
  const es = finalKindOf(profile)
  return es === debe
    ? null
    : veto(
        'V7',
        `finalKindOf ${es} (${kmAfterLastClimb(profile)} km tras la última cota); se declara ${debe}`,
      )
}

/** V1 geografía, puerto: sin puertos donde la zona no los tiene, ni como motivo ni como segmento ≥ 8,5 km. */
export const V1: VetoFn = (profile, _sk, req, motivos) => {
  if (req.geo.puerto !== null) return null
  if (aplanar(motivos).some((m) => m.kind === 'puerto'))
    return veto('V1', `motivo puerto en ${req.geo.zona}`)
  const largo = puertos(profile).find((s) => climbSize(s).km >= PASS_MIN_KM - EPS)
  return largo
    ? veto('V1', `segmento puerto de ${climbSize(largo).km} km en ${req.geo.zona}`)
    : null
}

/** V2 geografía, adoquín: sectores de adoquín solo con `adoquin ≥ 2`, muros adoquinados solo con `adoquin > 0`. */
export const V2: VetoFn = (_profile, _sk, req, motivos) => {
  const ms = aplanar(motivos)
  if (req.geo.adoquin < 2 && ms.some((m) => m.kind === 'sector' && m.firme !== 'tierra'))
    // sin `firme`, adoquín
    return veto('V2', `sector de adoquín en ${req.geo.zona} (adoquin ${req.geo.adoquin})`)
  if (req.geo.adoquin === 0 && ms.some((m) => m.kind === 'muro' && m.adoquin === true))
    return veto('V2', `muro adoquinado en ${req.geo.zona}`)
  return null
}

/** V3 geografía, sterrato: sectores de tierra solo con `geo.sterrato`. */
export const V3: VetoFn = (_profile, _sk, req, motivos) =>
  !req.geo.sterrato && aplanar(motivos).some((m) => m.kind === 'sector' && m.firme === 'tierra')
    ? veto('V3', `sector de tierra en ${req.geo.zona}`)
    : null

const ALTITUD_PUERTO_LARGO: readonly GeoSignature['altitud'][] = ['media', 'alta', 'altiplano']
/** V4 geografía, altitud: (a) `alto_largo` solo con `finalesAlto: 'largo'`; (b) puertos de 15 km solo en altura; (c) techo de desnivel de un puerto. */
export const V4: VetoFn = (profile, sk, req, motivos) => {
  const { altitud, finalesAlto, zona } = req.geo
  if (metaDe(sk, motivos) === 'alto_largo' && finalesAlto !== 'largo')
    return veto('V4', `(a) alto_largo en ${zona} (finalesAlto ${finalesAlto})`)
  for (const s of puertos(profile)) {
    const km = climbSize(s).km
    if (km >= ARCH.veto.puertoLargoKm - EPS && !ALTITUD_PUERTO_LARGO.includes(altitud))
      return veto('V4', `(b) puerto de ${km} km en altitud ${altitud}`)
    const m = climbMetres(s)
    if (m > ARCH.veto.puertoDplusMax[altitud] + EPS)
      return veto(
        'V4',
        `(c) puerto de ${Math.round(m)} m > ${ARCH.veto.puertoDplusMax[altitud]} (${altitud})`,
      )
  }
  return null
}

/**
 * V5 el caso v40: en un día (salvo `ud_montana_alto`, la rareza de D1) la última cota mide ≤ 4,2 km;
 * si muere arriba, ≤ 2,2; si no, corona dentro del `aMeta` del esqueleto ([3; 17] por defecto). No
 * mira las cronos (paso 5): es la regla del final de una carrera EN LÍNEA de un día; `nc_crono` pide
 * `un_dia` para su km y su cota de [2,5; 5] km no es el final de nadie (`et_crono` tampoco la pasa).
 */
export const V5: VetoFn = (profile, sk, req) => {
  if (
    req.role !== 'un_dia' ||
    sk.kind === 'cri' ||
    sk.id === 'ud_montana_alto' ||
    lastClimbKm(profile) === null
  )
    return null
  const ultima = ultimaCota(profile) // el puerto de la última pancarta (§3.9; cuerpo en §13.3)
  const km = ultima ? climbSize(ultima).km : 0 // LONGITUD: lastClimbKm es la posición de la pancarta
  if (km > ARCH.meta.unDiaUltimaCota.km[1] + EPS)
    return veto('V5', `(a) última cota ${km} km > ${ARCH.meta.unDiaUltimaCota.km[1]}`)
  if (finalKindOf(profile) === 'alto')
    return km > ARCH.meta.muro.km[1] + EPS
      ? veto('V5', `(b) muere arriba en ${km} km > ${ARCH.meta.muro.km[1]}`)
      : null
  const tras = kmAfterLastClimb(profile)!
  const [a, b] = sk.metaParams?.aMeta ?? ARCH.meta.unDiaUltimaCota.aMeta
  return tras >= a - EPS && tras <= b + EPS
    ? null
    : veto('V5', `(c) última cota a ${tras} km de meta, fuera de [${a}; ${b}]`)
}

const V8A: readonly SkeletonId[] = [
  'et_reina_alto_largo',
  'et_reina_alto_corto',
  'et_reina_cima_cerca',
  'et_reina_valle',
  'et_reina_encadenada',
  'et_montana_corta',
  'ud_montana',
  'ud_montana_alto',
] // todo `reina` salvo et_reina_blanda
/**
 * V8 reina de verdad (§9.4): (a) salvo `et_reina_blanda`, puerto de meta ≥ 9 km con final en alto, o
 * dos puertos ≥ 9, o ≥ 3.400 m; (b) en toda reina, ≥ 25 % de la subida a más de 30 km de meta. Es la
 * lección de `reina-150` hecha regla.
 */
export const V8: VetoFn = (profile, sk) => {
  if (sk.kind !== 'reina') return null
  if (V8A.includes(sk.id)) {
    const minKm = ARCH.reina.verdad.puertoMetaMinKm
    const ult = puertos(profile).at(-1)
    const puertoMeta =
      finalKindOf(profile) === 'alto' && ult !== undefined && climbSize(ult).km >= minKm - EPS
    const dos = puertos(profile).filter((s) => climbSize(s).km >= minKm - EPS).length >= 2
    const d = dPlusDe(profile)
    if (!puertoMeta && !dos && d < ARCH.reina.verdad.dPlusMin - EPS)
      return veto(
        'V8',
        `(a) sin puerto de meta ≥ ${minKm}, sin dos puertos ≥ ${minKm} y ${Math.round(d)} m < ${ARCH.reina.verdad.dPlusMin}`,
      )
  }
  const share = subidaLejanaShare(profile)
  return share >= ARCH.reina.subidaLejanaMin - EPS
    ? null
    : veto(
        'V8',
        `(b) subida lejana ${Math.round(share * 100)} % < ${ARCH.reina.subidaLejanaMin * 100} %`,
      )
}

/** V9 llana es llana: (a) D+ ≤ 1.800 m; (b) ninguna racha de ≥ 2,5 km a ≥ 5 % que acabe en los últimos 15 km. */
export const V9: VetoFn = (profile, sk) => {
  if (sk.kind !== 'llana') return null
  const L = ARCH.veto.llana
  const d = dPlusDe(profile)
  if (d > L.dPlusMax + EPS) return veto('V9', `(a) D+ ${Math.round(d)} m > ${L.dPlusMax}`)
  const r = rachasDeSubida(profile).find(
    (x) => x.km >= L.cotaKm - EPS && x.g >= L.cotaG - EPS && x.finKmAMeta <= L.ventanaKm + EPS,
  )
  return r
    ? veto(
        'V9',
        `(b) racha de ${r.km.toFixed(1)} km al ${r.g.toFixed(1)} % a ${r.finKmAMeta.toFixed(1)} km de meta`,
      )
    : null
}

/** Orden de coste creciente (§9.1): lo que cuesta menos va antes y un intento cae en el primero. */
const ORDEN: readonly VetoFn[] = [V10, V15, V6, V7, V1, V2, V3, V4, V5, V8, V9]

/**
 * Por etapa, con reintento: el primer veto que salta, o `null`. `kmObjetivo` es el km de la INSTANCIA
 * (`ed.km`, §8.4): en `generado` difiere de `req.km` hasta un ± 6 %; en `edicion` es `req.km`.
 * `colocados` son los `Placed` que se rindieron (`colocar` en el camino sorteado, `colocarPlantilla`
 * en la canónica y en los tests). Solo V10 lee `kmObjetivo` y `colocados`.
 */
export function verify(
  profile: StageProfile,
  sk: Skeleton,
  req: StageRequest,
  motivos: Motif[],
  kmObjetivo: number,
  colocados: Placed[],
): Veto | null {
  for (const v of ORDEN) {
    const r = v(profile, sk, req, motivos, kmObjetivo, colocados)
    if (r !== null) return { id: r.id, detalle: `${r.detalle} (${sk.id}, ${req.geo.zona})` }
  }
  return null
}

// ---------------------------------------------------------------------------------------------------
// Los de calendario: sobre filas de `RouteStats` medidas en `routeCensus`, sin reintento. Un rojo aquí
// es un rango mal puesto y se corrige en ARCH o en el catálogo, nunca en una etapa (§9.2).
// ---------------------------------------------------------------------------------------------------

/** Las filas en línea generadas: ni `real` ni crono (las cronos no llegan a `finishType`, §9.2). */
const enLineaGeneradas = (rows: readonly RouteStats[]): RouteStats[] =>
  rows.filter((r) => r.routeSource !== 'real' && r.kind !== 'cri')

/** V11 muro en meta existe: `muro` en ≥ `muroMin` y `puncheur` en ≥ `puncheurMin` de las etapas en línea generadas. */
export const V11 = (rows: RouteStats[]): Veto | null => {
  const filas = enLineaGeneradas(rows)
  if (filas.length === 0) return null
  const share = (t: FinishType): number =>
    filas.filter((r) => r.finishType === t).length / filas.length
  const { muroMin, puncheurMin } = ARCH.veto.calendario
  if (share('muro') < muroMin - EPS)
    return veto(
      'V11',
      `muro en ${(share('muro') * 100).toFixed(1)} % < ${muroMin * 100} % de ${filas.length}`,
    )
  if (share('puncheur') < puncheurMin - EPS)
    return veto(
      'V11',
      `puncheur en ${(share('puncheur') * 100).toFixed(1)} % < ${puncheurMin * 100} % de ${filas.length}`,
    )
  return null
}

/**
 * V12 no se repite (§9.5): ningún par de filas con el mismo esqueleto, la misma zona y km a ± 10 % se
 * parece más que `maxCorrelacion` (Pearson de `RouteStats.huella`, la pendiente por km desde meta).
 */
export const V12 = (rows: RouteStats[], maxCorrelacion: number): Veto | null => {
  const tolerancia = 0.1 // ± 10 % de km (mapa 04 §5.2), la misma de `correlacionesIntraEsqueleto`
  const grupos = new Map<string, RouteStats[]>()
  for (const r of rows) {
    if (r.skeleton === null || r.zona === null) continue
    const k = `${r.skeleton}|${r.zona}`
    const g = grupos.get(k)
    if (g) g.push(r)
    else grupos.set(k, [r])
  }
  for (const [k, g] of grupos)
    for (let i = 0; i < g.length; i++)
      for (let j = i + 1; j < g.length; j++) {
        const a = g[i]!
        const b = g[j]!
        if (Math.abs(a.km - b.km) > tolerancia * Math.min(a.km, b.km)) continue
        const c = correlacionHuellas(a.huella, b.huella)
        if (c >= maxCorrelacion - EPS)
          return veto(
            'V12',
            `${a.raceId} e${a.stageIndex} y ${b.raceId} e${b.stageIndex} (${k}): correlación ${c.toFixed(2)} ≥ ${maxCorrelacion}`,
          )
      }
  return null
}

const ESPRINT: readonly FinishType[] = ['sprint_masivo', 'sprint_reducido']
/**
 * La tabla de V16 (§9.2): el conjunto de `finishType` que admite una fila por su meta instanciada,
 * `cotaFinalKm`, `kmAfterLastClimb` y `pavesKm`; `null` si la fila no entra (real, crono o sin meta).
 */
export function conjuntoV16(r: RouteStats): readonly FinishType[] | null {
  if (r.routeSource === 'real' || r.kind === 'cri' || r.meta === null) return null
  const meta = r.meta
  const base = ((): readonly FinishType[] => {
    const cf = r.cotaFinalKm ?? 0 // toda meta con subida la trae; 0 solo si falta
    switch (meta) {
      case 'esprint': {
        const tras = r.kmAfterLastClimb
        if (tras !== null && tras <= ARCH.meta.cimaCerca.valle[1] + EPS) return ['puncheur']
        if (tras === null || tras >= ARCH.meta.descensoMeta.valle[0] - EPS) return ESPRINT
        return ['puncheur', ...ESPRINT]
      }
      case 'repecho':
        return ['puncheur']
      case 'muro_meta':
        return cf <= ARCH.meta.muro.finishMuroMaxKm + EPS ? ['muro'] : ['puncheur']
      case 'alto_corto':
      case 'alto_largo':
        return ['alto']
      case 'cima_cerca':
        return cf >= STAGE.finishAltoMinKm - EPS ? ['puncheur', 'alto'] : ['puncheur']
      case 'descenso_meta':
        return ['descenso', ...ESPRINT]
      case 'valle':
        return ESPRINT
      case 'sector_meta':
        return ['pave']
    }
  })()
  return r.pavesKm > 0 && base.includes('sprint_masivo') ? [...base, 'pave'] : base
}

/** V16 el final según el motor (§9.6): toda fila generada con meta cae en su conjunto. Se mide en el censo, nunca por intento. */
export const V16 = (rows: RouteStats[]): Veto | null => {
  for (const r of rows) {
    const c = conjuntoV16(r)
    if (c === null || c.includes(r.finishType)) continue
    return veto(
      'V16',
      `${r.raceId} e${r.stageIndex} (${r.skeleton}, ${r.meta}, cotaFinal ${r.cotaFinalKm ?? 'ninguna'}, ` +
        `${r.kmAfterLastClimb ?? 'sin cota'} km tras la última): ${r.finishType} fuera de {${c.join(', ')}}`,
    )
  }
  return null
}

// ---------------------------------------------------------------------------------------------------
// Los de vuelta (paso 7): sobre los papeles y los km de un itinerario. `composeTour` los repara por
// construcción (reglas de bloque de §7.2) y `tour.test.ts` sella cero violaciones; no hay reintento.
// ---------------------------------------------------------------------------------------------------

/**
 * V13 clase (§9.2): ningún km por encima de `ARCH.km.maxPorClase`; el prólogo y la cronoescalada miden
 * lo de su esqueleto; en `vu_corta` a lo sumo una crono; en `vu_semana` a lo sumo tres finales en alto
 * y dos seguidos.
 */
export const V13 = (
  roles: StageRole[],
  km: number[],
  raceClass: RaceClass,
  tour: TourSkeletonId,
): Veto | null => {
  const max = ARCH.km.maxPorClase[raceClass]
  for (let i = 0; i < roles.length; i++) {
    const k = km[i]!
    if (k > max + EPS) return veto('V13', `e${i + 1} de ${k} km > ${max} (${raceClass})`)
    const rango =
      roles[i] === 'prologo'
        ? SKELETONS.et_prologo.km
        : roles[i] === 'cronoescalada'
          ? SKELETONS.et_cronoescalada.km
          : null
    if (rango !== null && (k < rango[0] - EPS || k > rango[1] + EPS))
      return veto('V13', `e${i + 1} ${roles[i]} de ${k} km fuera de [${rango[0]}; ${rango[1]}]`)
  }
  if (tour === 'vu_corta' && roles.filter(esCrono).length > 1)
    return veto('V13', `vu_corta con ${roles.filter(esCrono).length} cronos`)
  if (tour === 'vu_semana') {
    const arriba = roles.filter(acabaArriba).length
    if (arriba > 3) return veto('V13', `vu_semana con ${arriba} finales en alto`)
    for (let i = 2; i < roles.length; i++)
      if (acabaArriba(roles[i]!) && acabaArriba(roles[i - 1]!) && acabaArriba(roles[i - 2]!))
        return veto('V13', `vu_semana con tres finales en alto seguidos hasta la e${i + 1}`)
  }
  return null
}

/**
 * V14 gran vuelta (§9.2), sobre `ARCH.bloques.gv`: toda reina dentro de `ventanaReina(n)` (y por tanto
 * ninguna antes del primer descanso); a lo sumo `primeraSemanaFinalesAlto` final en alto antes de él;
 * a lo sumo `maxAltaMontana` reinas; y al menos `minLlanasEntreBloques` etapas entre dos bloques de
 * montaña. Los descansos mismos (`descansosDe`) no están en los papeles: los sella `tour.test.ts`.
 * Fuera de `vu_gran_vuelta` (n < `ROUTE.grandTourStages`) no dice nada.
 */
export const V14 = (roles: StageRole[], n: number): Veto | null => {
  if (n < ROUTE.grandTourStages) return null
  const gv = ARCH.bloques.gv
  const [a, b] = ventanaReina(n)
  for (let i = 0; i < roles.length; i++)
    if (esReina(roles[i]!) && (i < a || i > b))
      return veto('V14', `reina en la e${i + 1}, fuera de las etapas ${a + 1} a ${b + 1}`)
  const primera = roles.slice(0, gv.descansos[0]).filter(acabaArriba).length
  if (primera > gv.primeraSemanaFinalesAlto)
    return veto('V14', `${primera} finales en alto antes del primer descanso`)
  const reinas = roles.filter(esReina).length
  if (reinas > gv.maxAltaMontana) return veto('V14', `${reinas} etapas de alta montaña`)
  const h = huecoCorto(roles, gv.minLlanasEntreBloques)
  if (h !== null)
    return veto(
      'V14',
      `solo ${h[1] - h[0] - 1} etapa entre los bloques de montaña de las e${h[0] + 1} y e${h[1] + 1}`,
    )
  return null
}
