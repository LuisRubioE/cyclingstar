/**
 * PETICIÓN Y SALIDA DE `generateStage` (docs/generador.md §3.7 y sección 8).
 *
 * `StageRequest` es todo lo que el generador sabe de la etapa; `GeneratedStage` es el perfil que ve
 * el motor más la ficha (`arch`) que ven la pantalla y el banco.
 *
 * Paso 0: nació `RouteSource`, porque `RouteStats` del censo la cita. Paso 1: el resto de tipos. Paso
 * 5: `generateStage` (los siete pasos de la sección 8 con el reintento sobre `mot`, `pos` y `dib`),
 * `labelDe`, `ETIQUETAS_DE_ESQUELETO` y `fraseDe`; paso 6: `raceRouteSourceOf`. Sin llamadores en
 * producción hasta el paso 8: `SEASON_CALENDAR` no cambia un byte.
 */
import { ARCH, type EdicionCfg } from '../../constants.js'
import type { StageProfile } from '../../stage/types.js'
import type { RaceFormat } from '../calendar.js' // solo tipo, sentencia `import type` entera (§3.8)
import type { EditionTerrain } from '../editions.js'
import type { RouteTerrain } from '../featureProfile.js'
import {
  FINAL_KIND_CUTS,
  finalKindOf,
  lastClimbKm,
  profileKm,
  type FinalKind,
} from '../finalKind.js'
import { routeRng } from '../profileGen.js'
import { stageKindOf } from '../stageKind.js'
import type { StageKind } from '../testTour.js'
import type { RaceClass } from '../uci.js'
import { opcionDe, planDeEdicion, seasonDe, semillaDe, type EditionPlan } from './edition.js'
import { ZONAS, admite, conFirmeDeZona, type GeoSignature, type GeoZone } from './geo.js'
import { dPlusDe } from './geometry.js'
import {
  instanciar,
  instanciarFirma,
  type Instancia,
  type MetaKind,
  type Motif,
  type MotifKind,
} from './motifs.js'
import { colocar, colocarPlantilla } from './place.js'
import { RACE_REGION } from './regions.js'
import { emitirPancartas, garantizaClase, normalizeEnlaces, renderSkeleton } from './render.js'
import {
  ESCALON_TERRENO,
  SESGO_TERRENO,
  SKELETONS,
  cabe,
  candidatos,
  skeletonFor,
  type Skeleton,
  type SkeletonId,
} from './skeletons.js'
import type { StageRole } from './tour.js'
import { verify, type Veto } from './veto.js'

/** De dónde sale el recorrido de UNA etapa: rasgos reales, edición real sin rasgos o inventado. */
export type RouteSource = 'real' | 'edicion' | 'generado'

/** Origen por CARRERA, agregado de sus etapas (§3.11): `mixto` si no son todas del mismo origen. */
export type RaceRouteSource = 'real' | 'mixto' | 'generado'

export interface StageRequest {
  raceId: string
  stageIndex: number // con base 1; 1 en un día
  season: number // BASE_SEASON = 0 es la canónica y tira sus propios dados
  km: number // contrato al 0,1 si `routeSource` es `edicion`
  role: StageRole | 'un_dia'
  terrain: RouteTerrain // sesgo, nunca orden
  geo: GeoSignature // un día y edición: ZONAS[regionOf(...)]; vuelta compuesta: ZONAS[itinerario.metas[i-1]]
  desde?: GeoZone // etapa de transición (40 % con la ondulación de `desde`)
  raceClass: RaceClass
  format: RaceFormat
  routeSource: 'edicion' | 'generado'
  editionKey?: string // `${from}|${to}|${km}` de editions.ts, para la semilla de edición
  edicion?: EdicionCfg // ARCH.edicion si falta; solo lo rellena buildRace cuando calendarForSeason recibe otro cfg (§10.5)
  fixed?: { skeleton?: SkeletonId; finalKind?: FinalKind; dPlus?: number } // bancos
}

export interface GeneratedStage {
  profile: StageProfile
  kind: StageKind // = stageKindOf(profile, timeTrial).kind, garantizado por V6
  label: string // = labelDe(sk, profile, timeTrial), tras V6 (§3.3; sección 11 §11.5)
  timeTrial: boolean // = sk.timeTrial ?? false
  arch: {
    skeleton: SkeletonId
    geo: GeoZone
    motivos: Motif[]
    finalKind: FinalKind | null
    dPlus: number // dPlusDe(profile), relleno incluido
    intentos: number
    degradado: boolean
    garantiasClase: number // cuántas reglas 1 a 4 de garantizaClase tocaron la etapa (§8.9)
    rechazos: Veto[] // uno por intento fallido, en orden; [] si el primero pasó (galería, sección 16)
    frase: string // "Circuito de 14 km × 9 vueltas con un muro de 1,1 km al 11 %; meta a 2 km del muro"
    metadatos: { viento: 0 | 1 | 2 | 3; altitud: GeoSignature['altitud'] } // ficha, no física
  }
  routeSource: 'edicion' | 'generado'
}

// ---------------------------------------------------------------------------------------------------
// La etiqueta (§3.7; sección 11 §11.5 regla 3).
// ---------------------------------------------------------------------------------------------------

/** Las cinco etiquetas que pone el esqueleto porque `stageKindOf` no puede deducirlas del perfil (decisión 38). */
export const ETIQUETAS_DE_ESQUELETO: ReadonlySet<string> = new Set([
  'Circuit',
  'Wall finish',
  'Prologue',
  'Hill climb',
  'Mountains classic',
])

/** La etiqueta de la ficha, calculada DESPUÉS de que V6 haya igualado el `kind`: la del esqueleto si es una de las cinco suyas; si no, la del perfil. */
export function labelDe(sk: Skeleton, profile: StageProfile, timeTrial: boolean): string {
  return ETIQUETAS_DE_ESQUELETO.has(sk.label) ? sk.label : stageKindOf(profile, timeTrial).label
}

// ---------------------------------------------------------------------------------------------------
// generateStage (§8.1): identidad, firma, edición e instancia, con reintento sobre `mot`, `pos`, `dib`.
// ---------------------------------------------------------------------------------------------------

/**
 * Una `StageRequest` a un `GeneratedStage` cuyo perfil pasa los once vetos por etapa (V1 a V10 y V15).
 * Siete pasos, cada uno con su subflujo (`semillaDe`): (1) el esqueleto en `arch`, (2) la firma en
 * `firma`, (3) el plan de edición en `ed`, y hasta `ARCH.colocacion.maxIntentos` veces (4) los motivos
 * en `mot`, (5) la colocación en `pos`, (6) el dibujo en `dib`, cuadrado, garantizado y con sus
 * pancartas, y (7) `verify`. `arch`, `firma` y `ed` no llevan intento: un reintento nunca cambia el
 * esqueleto, la firma ni cuántos motivos tiene la edición. Agotados los intentos, la plantilla canónica
 * de la opción con `degradado: true`. Pura: misma petición, misma etapa.
 */
export function generateStage(req: StageRequest): GeneratedStage {
  const { sk, sufijo } = elegirEsqueleto(req, routeRng(semillaDe('arch', req))) // paso 1
  const opcion = opcionDe(sk, req.raceId, seasonDe(req, 'ed'), req.edicion ?? ARCH.edicion) // sin dados (§10.3)
  const firma = instanciarFirma(sk, opcion, req, routeRng(semillaDe('firma', req))) // paso 2
  const ed = planDeEdicion(
    sk,
    firma.map((f) => f.motif),
    req,
  ) // paso 3: tira dentro en semillaDe('ed', req); ed.opcion === opcion
  const timeTrial = sk.timeTrial ?? false
  const desde = req.desde !== undefined && req.desde !== req.geo.zona ? ZONAS[req.desde] : undefined
  const rechazos: Veto[] = []
  for (let intento = 0; intento < ARCH.colocacion.maxIntentos; intento++) {
    const motivos = instanciar(sk, firma, ed, req, (slot, j) =>
      routeRng(semillaDe('mot', req, { slot, j, intento })),
    ) // paso 4
    const colocados = colocar(motivos, ed.km, sk, req, routeRng(semillaDe('pos', req, { intento }))) // paso 5
    if (colocados === null) {
      rechazos.push({ id: 'V10', detalle: 'colocar: los enlaces no llegan' })
      continue
    }
    const rng = (token: string) => routeRng(semillaDe('dib', req, { token, intento })) // RngFactory de §3.2
    const segs = renderSkeleton(colocados, ed.km, req.geo, rng, desde) // paso 6
    const cuadrados = normalizeEnlaces(segs, ed.km, colocados)
    if (cuadrados === null) {
      rechazos.push({ id: 'V10', detalle: 'normalizeEnlaces: no absorben' })
      continue
    }
    const garantizados = garantizaClase(cuadrados, sk, colocados)
    if (garantizados === null) {
      rechazos.push({ id: 'V6', detalle: 'garantizaClase: sin enlace que compense' })
      continue
    }
    const profile: StageProfile = {
      segments: garantizados.segs,
      banners: emitirPancartas(garantizados.segs, colocados),
    }
    const veto = verify(
      profile,
      sk,
      req,
      motivos.map((m) => m.motif),
      ed.km,
      colocados,
    ) // paso 7
    if (veto === null)
      return salida(profile, sk, req, motivos, ed, {
        intentos: intento + 1,
        degradado: false,
        timeTrial,
        reglas: garantizados.reglas,
        rechazos,
        sufijo,
      })
    rechazos.push(veto)
  }
  return canonica(sk, ed, req, timeTrial, rechazos, sufijo) // plantilla canónica de la opción, `degradado: true`
}

/** Paso 1 (§8.2). `sufijo` es el texto que `fraseDe` añade al final: degradación de papel o de terreno, o atadura ignorada; null si no hay. */
function elegirEsqueleto(
  req: StageRequest,
  rand: () => number,
): { sk: Skeleton; sufijo: string | null } {
  if (req.fixed?.skeleton) return { sk: skeletonFor(req.fixed.skeleton, req.geo), sufijo: null } // 1
  const atado =
    req.role === 'un_dia' && req.routeSource === 'generado'
      ? RACE_REGION[req.raceId]?.skeleton
      : undefined
  let aviso: string | null = null
  if (atado !== undefined) {
    // 1 bis: sin tirada
    if (cabe(atado, req)) return { sk: skeletonFor(atado, req.geo), sufijo: null }
    aviso = `(atadura ${atado} ignorada: no cabe)`
  }
  const cs = candidatos(req) // 2
  const reinaBlanda =
    (req.role.startsWith('reina_') ||
      (req.routeSource === 'edicion' && req.terrain === 'mountain')) &&
    req.format !== 'gran-vuelta' &&
    admite(SKELETONS.et_reina_blanda.requiere, req.geo)
  const share = ARCH.reina.blandaShare[req.geo.relieve] ?? 0
  let id: SkeletonId
  if (reinaBlanda && share > 0 && rand() < share)
    id = 'et_reina_blanda' // 3: PRIMERA tirada de `arch`
  else {
    // 4: tirada acumulada, la de `pickRole` (calendar.ts)
    const u = rand() * cs.reduce((a, c) => a + c.peso, 0)
    let acc = 0
    id = cs[cs.length - 1]!.id
    for (const c of cs) {
      acc += c.peso
      if (u < acc) {
        id = c.id
        break
      }
    }
  }
  const sk = skeletonFor(id, req.geo) // 5
  return {
    sk,
    sufijo: [sufijoDegradado(sk, req), aviso].filter((x) => x !== null).join(' ') || null,
  }
}

const ORDEN_KIND: Record<StageKind, number> = { llana: 0, cri: 0, clasica: 1, media: 2, reina: 3 }
const KIND_TEXTO: Record<StageKind, string> = {
  llana: 'llana',
  cri: 'crono',
  clasica: 'clásica',
  media: 'media',
  reina: 'reina',
}
/** El `kind` de los esqueletos de cada papel (columna «Papel» de §5.3: todos los ids de un papel comparten `kind`). */
const KIND_DE_PAPEL: Record<StageRole, StageKind> = {
  llana: 'llana',
  llana_viento: 'llana',
  media: 'media',
  media_alto: 'media',
  media_muro: 'media',
  reina_alto: 'reina',
  reina_valle: 'reina',
  reina_encadenada: 'reina',
  montana_corta: 'reina',
  cri: 'cri',
  prologo: 'cri',
  cronoescalada: 'cri',
}
const KIND_DE_TERRENO_EDICION: Record<EditionTerrain, StageKind> = {
  flat: 'llana',
  hilly: 'media',
  mountain: 'reina',
  itt: 'cri',
  cobbles: 'clasica',
}
const TERRENO_TEXTO: Record<RouteTerrain, string> = {
  cobbles: 'adoquín',
  classic: 'clásica',
  hilly: 'colinas',
  flat: 'llano',
  mountain: 'montaña',
  itt: 'crono',
}

/** Si el paso 1 bajó el papel o el terreno (§8.2): sin dados. Una bajada dentro del mismo `kind` no lleva sufijo. */
function sufijoDegradado(sk: Skeleton, req: StageRequest): string | null {
  if (req.fixed?.skeleton || req.raceClass === 'NC') return null
  if (req.routeSource === 'generado' && req.role === 'un_dia') {
    if (sk.id in SESGO_TERRENO[req.terrain]) return null
    let t = ESCALON_TERRENO[req.terrain] // el primer escalón que contiene el id es el terreno al que bajó
    while (t !== null && !(sk.id in SESGO_TERRENO[t])) t = ESCALON_TERRENO[t]
    return `(degradado a ${TERRENO_TEXTO[t ?? 'flat']})`
  }
  const pedido: StageKind | undefined =
    req.routeSource === 'edicion'
      ? KIND_DE_TERRENO_EDICION[req.terrain as EditionTerrain]
      : req.role === 'un_dia'
        ? undefined
        : KIND_DE_PAPEL[req.role]
  if (pedido === undefined) return null
  return ORDEN_KIND[sk.kind] < ORDEN_KIND[pedido] ? `(degradado a ${KIND_TEXTO[sk.kind]})` : null
}

/** Lo que `salida` recibe del bucle además del perfil. */
interface Cierre {
  intentos: number
  degradado: boolean
  timeTrial: boolean
  reglas: number
  rechazos: readonly Veto[]
  sufijo: string | null
}

/** §8.13: el `GeneratedStage` campo a campo. `kind` y `finalKind` salen del perfil (V6 y V7 garantizan que son los prometidos). */
function salida(
  profile: StageProfile,
  sk: Skeleton,
  req: StageRequest,
  motivos: readonly Instancia[],
  ed: EditionPlan,
  c: Cierre,
): GeneratedStage {
  const ms = motivos.map((m) => m.motif)
  const ult = lastClimbKm(profile)
  const dUltima = ult === null ? null : Math.round((profileKm(profile) - ult) * 10) / 10
  return {
    profile,
    kind: stageKindOf(profile, c.timeTrial).kind,
    label: labelDe(sk, profile, c.timeTrial),
    timeTrial: c.timeTrial,
    arch: {
      skeleton: sk.id,
      geo: req.geo.zona,
      motivos: ms,
      finalKind: finalKindOf(profile),
      dPlus: dPlusDe(profile),
      intentos: c.intentos,
      degradado: c.degradado,
      garantiasClase: c.reglas,
      rechazos: [...c.rechazos],
      frase: fraseDe(sk, ed.km, ms, dUltima, ed.opcion, c.sufijo, c.degradado),
      metadatos: { viento: req.geo.viento, altitud: req.geo.altitud },
    },
    routeSource: req.routeSource,
  }
}

/**
 * §8.11: agotados los intentos, la plantilla canónica de la opción (`conFirmeDeZona`), colocada por
 * acumulación, rendida con `dib` en el intento `maxIntentos`, cuadrada contra `ed.km` (sus enlaces
 * absorben el ± 6 % del plan; si no pueden, la plantilla queda con su km), garantizada y con pancartas.
 * No se vuelve a verificar: que la canónica pasa `verify` en toda zona compatible lo sella
 * `skeletons.test.ts`, y un fallo ahí es de catálogo.
 */
function canonica(
  sk: Skeleton,
  ed: EditionPlan,
  req: StageRequest,
  timeTrial: boolean,
  rechazos: readonly Veto[],
  sufijo: string | null,
): GeneratedStage {
  const plantillas = [sk.canonico, ...(sk.alternativas ?? []).map((a) => a.canonico)]
  const plantilla = conFirmeDeZona(plantillas[ed.opcion] ?? sk.canonico, req.geo)
  const colocados = colocarPlantilla(plantilla)
  const kmPlantilla =
    Math.round(plantilla.reduce((a, m) => a + m.km * (m.vueltas ?? 1), 0) * 10) / 10
  const intento = ARCH.colocacion.maxIntentos
  const desde = req.desde !== undefined && req.desde !== req.geo.zona ? ZONAS[req.desde] : undefined
  const segs = renderSkeleton(
    colocados,
    kmPlantilla,
    req.geo,
    (token) => routeRng(semillaDe('dib', req, { token, intento })),
    desde,
  )
  const cuadrados = normalizeEnlaces(segs, ed.km, colocados) ?? segs
  const g = garantizaClase(cuadrados, sk, colocados) ?? { segs: cuadrados, reglas: 0 }
  const profile: StageProfile = { segments: g.segs, banners: emitirPancartas(g.segs, colocados) }
  const motivos: Instancia[] = colocados.map((p) => ({ slot: p.slot, j: 0, motif: p.motif }))
  return salida(profile, sk, req, motivos, ed, {
    intentos: intento,
    degradado: true,
    timeTrial,
    reglas: g.reglas,
    rechazos,
    sufijo,
  })
}

// ---------------------------------------------------------------------------------------------------
// La frase de arquitectura (§8.13): sin dados, pura. Se exporta solo para `generate.test.ts`.
// ---------------------------------------------------------------------------------------------------

const PALABRA = [
  'cero',
  'uno',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
]
const r1 = (x: number): number => Math.round(x * 10) / 10
/** Coma decimal sin Intl: `x` ya viene redondeado, y String(4.2) es "4.2". Así la frase no depende de la ICU del proceso. */
const num = (x: number): string => String(x).replace('.', ',')
/** Km redondeados al entero desde 10 y al 0,1 por debajo: 17,1 → "17"; 4,2 → "4,2"; 2,0 → "2". */
const kmTxt = (x: number): string => num(x >= 10 ? Math.round(x) : r1(x))
/** Pendientes al entero desde el 4 % y al 0,1 por debajo: 11,3 → "11"; 2,4 → "2,4". */
const gTxt = (g: number): string => num(g >= 4 ? Math.round(g) : r1(g))
const cuenta = (n: number, fem: boolean): string =>
  n === 1 ? (fem ? 'una' : 'un') : n <= 10 ? PALABRA[n]! : String(n)
const pron = (n: number): string => (n <= 10 ? PALABRA[n]! : String(n)) // "uno", "dos": tras coma, sin sustantivo
const lista = (xs: readonly string[]): string =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)!}`
const mayus = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1)
const firmeTxt = (m: Motif): string => (m.firme === 'tierra' ? 'de tierra' : 'de adoquín')

type Nombrable = Exclude<MotifKind, 'enlace' | 'descenso' | 'meta'>
const NOMBRE: Record<Nombrable, { s: string; p: string; fem: boolean }> = {
  cota: { s: 'cota', p: 'cotas', fem: true },
  puerto: { s: 'puerto', p: 'puertos', fem: false },
  muro: { s: 'muro', p: 'muros', fem: false },
  sector: { s: 'sector', p: 'sectores', fem: false },
  expuesto: { s: 'tramo abierto', p: 'tramos abiertos', fem: false }, // "abierto", nunca "abanico" (decisión 17)
  tendida: { s: 'subida tendida', p: 'subidas tendidas', fem: true },
  cadena: { s: 'cadena', p: 'cadenas', fem: true },
  racimo: { s: 'racimo', p: 'racimos', fem: false },
  circuito: { s: 'circuito', p: 'circuitos', fem: false },
}

/** Motivos CONSECUTIVOS del mismo kind forman un grupo (en `sector`, además del mismo firme); `cadena`, `racimo` y `circuito` van siempre solos; `enlace`, `descenso` y `meta` no se nombran. */
function grupos(ms: readonly Motif[]): Motif[][] {
  const out: Motif[][] = []
  for (const m of ms) {
    if (m.kind === 'enlace' || m.kind === 'descenso' || m.kind === 'meta') continue
    const ult = out.at(-1)
    const agrupable = m.kind !== 'cadena' && m.kind !== 'racimo' && m.kind !== 'circuito'
    if (
      ult &&
      agrupable &&
      ult[0]!.kind === m.kind &&
      (m.kind !== 'sector' || ult[0]!.firme === m.firme)
    )
      ult.push(m)
    else out.push([m])
  }
  return out
}

/** `inicio`: el grupo abre la frase (sin artículo en singular, con mayúscula). */
function textoGrupo(g: readonly Motif[], inicio: boolean): string {
  const m = g[0]!
  const n = g.length
  const N = NOMBRE[m.kind as Nombrable]
  const adoq = m.kind === 'muro' && n === 1 && m.adoquin ? ' adoquinado' : ''
  const cabeza =
    n === 1
      ? inicio
        ? `${N.s}${adoq}`
        : `${cuenta(1, N.fem)} ${N.s}${adoq}`
      : `${cuenta(n, N.fem)} ${N.p}`
  let det = ''
  switch (m.kind) {
    case 'cota':
    case 'puerto':
    case 'muro':
    case 'tendida':
      det =
        n === 1
          ? ` de ${kmTxt(m.km)} km al ${gTxt(m.g!)} %`
          : n <= 4
            ? ` de ${lista(g.map((x) => kmTxt(x.km)))} km`
            : ''
      if (m.kind === 'muro' && n > 1) {
        const k = g.filter((x) => x.adoquin).length
        if (k > 0) det += `, ${pron(k)} adoquinado${k > 1 ? 's' : ''}`
      }
      break
    case 'expuesto':
      det = n === 1 ? ` de ${kmTxt(m.km)} km` : ` (${kmTxt(g.reduce((a, x) => a + x.km, 0))} km)`
      break
    case 'sector': {
      const k5 = g.filter((x) => x.estrellas === 5).length
      det =
        n === 1
          ? ` ${firmeTxt(m)} de ${kmTxt(m.km)} km (${m.estrellas}★)`
          : ` ${firmeTxt(m)}${k5 > 0 ? `, ${pron(k5)} de 5★` : ''}`
      break
    }
    case 'cadena': {
      const hs = m.hijos!
      det = ` de ${hs.length} ${hs.every((h) => h.kind === hs[0]!.kind) ? NOMBRE[hs[0]!.kind as Nombrable].p : 'subidas'}`
      break
    }
    case 'racimo': {
      const k5 = m.hijos!.filter((h) => h.estrellas === 5).length
      det = ` de ${m.hijos!.length} sectores${k5 > 0 ? `, ${pron(k5)} de 5★` : ''}`
      break
    }
    case 'circuito': {
      const hs = grupos(m.hijos ?? []).map((h) => textoGrupo(h, false))
      det = ` de ${kmTxt(m.km)} km × ${m.vueltas} vueltas${hs.length > 0 ? ` con ${lista(hs)}` : ''}`
      break
    }
    default:
      break
  }
  return inicio ? mayus(cabeza + det) : cabeza + det
}

/** "del muro", "de la cota", "del puerto": la última subida nombrable antes de la meta (en `cadena` y `circuito`, su último hijo que sube). */
function delUltimaSubida(motivos: readonly Motif[]): string {
  const sube = (m: Motif): boolean => m.kind === 'cota' || m.kind === 'puerto' || m.kind === 'muro'
  for (let i = motivos.length - 1; i >= 0; i--) {
    const m = motivos[i]!
    const c =
      m.kind === 'cadena' || m.kind === 'circuito'
        ? [...(m.hijos ?? [])].reverse().find(sube)
        : sube(m)
          ? m
          : undefined
    if (c) return c.kind === 'cota' ? 'de la cota' : c.kind === 'puerto' ? 'del puerto' : 'del muro'
  }
  return 'de la última subida'
}

function cierre(meta: Motif, motivos: readonly Motif[], dUltima: number | null): string {
  const cf = meta.cotaFinal
  const sube = cf ? ` de ${kmTxt(cf.km)} km al ${gTxt(cf.g)} %` : ''
  const ultimo = cf && cf.km >= ARCH.motivo.puerto.km[0] ? 'último puerto' : 'última cota' // cota ≤ 8,0 y puerto ≥ 9,0 no se solapan
  const v = cf ? r1(meta.km - cf.km) : 0 // el valle: Motif.km = cotaFinal.km + valle (§4.5 regla 5)
  const m: MetaKind = meta.meta ?? 'esprint'
  switch (m) {
    case 'esprint':
      return dUltima !== null && dUltima <= FINAL_KIND_CUTS.valleCorto
        ? `meta a ${kmTxt(dUltima)} km ${delUltimaSubida(motivos)}`
        : 'esprint'
    case 'repecho':
      return `llegada en repecho${sube}`
    case 'muro_meta':
      return `llegada en muro${sube}`
    case 'alto_corto':
    case 'alto_largo':
      return `llegada en alto${sube}`
    case 'cima_cerca':
      return `${ultimo}${sube} a ${kmTxt(v)} km de meta`
    case 'descenso_meta':
      return `${ultimo}${sube}, bajada y llano hasta meta (${kmTxt(v)} km)`
    case 'valle':
      return `${ultimo}${sube} y ${kmTxt(v)} km de valle hasta meta`
    case 'sector_meta': {
      const h = meta.hijos![0]!
      return `sector ${firmeTxt(h)} de ${kmTxt(h.km)} km (${h.estrellas}★) a ${kmTxt(r1(meta.km - h.km))} km de meta`
    }
  }
}

/**
 * La frase de arquitectura de la ficha (§8.13; decisión 39): `cuerpo; cierre[; final en X] [sufijos]`.
 * Sale de los campos numéricos de `arch.motivos` (en orden de carretera), de `dUltima` y de dos
 * cadenas; no lee `Motif.nombre` de las dificultades ni el perfil.
 */
export function fraseDe(
  sk: Skeleton,
  km: number,
  motivos: readonly Motif[],
  dUltima: number | null,
  opcion: number,
  sufijo: string | null,
  degradado: boolean,
): string {
  const gs = grupos(motivos)
  const con = gs.length > 0 ? ` con ${lista(gs.map((g) => textoGrupo(g, false)))}` : ''
  const cuerpo = sk.timeTrial
    ? `${sk.label === 'Prologue' ? 'Prólogo' : 'Contrarreloj'} de ${kmTxt(km)} km${con}`
    : sk.kind === 'llana'
      ? `Llano${con}`
      : gs.length > 0
        ? lista(gs.map((g, i) => textoGrupo(g, i === 0)))
        : 'Sin dificultades'
  const meta: Motif = motivos.find((m) => m.kind === 'meta') ?? {
    kind: 'meta',
    km: 0,
    meta: sk.meta,
  }
  const partes = [cuerpo, cierre(meta, motivos, dUltima)]
  if (opcion > 0) partes.push(`final en ${sk.alternativas![opcion - 1]!.nombre}`)
  const sinSitio = [
    ...new Set(
      motivos
        .filter((m) => m.kind === 'enlace' && m.nombre !== undefined)
        .map((m) => `(${m.nombre})`),
    ),
  ]
  const cola = [sufijo, ...sinSitio, degradado ? '(plantilla canónica)' : null].filter(
    (x): x is string => x !== null,
  )
  return partes.join('; ') + (cola.length > 0 ? ` ${cola.join(' ')}` : '')
}
