import { COUNTRIES } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { ARCH } from '../../constants.js'
import type { StageProfile } from '../../stage/types.js'
import { RACE_ROWS, SEASON_CALENDAR, type RaceRow } from '../calendar.js'
import type { RouteTerrain } from '../featureProfile.js'
import { finalKindOf, kmAfterLastClimb, profileKm, type FinalKind } from '../finalKind.js'
import { routeRng } from '../profileGen.js'
import { stageKindOf } from '../stageKind.js'
import type { StageKind } from '../testTour.js'
import { RACE_CLASSES, type RaceClass } from '../uci.js'
import { ZONAS, admite, conFirmeDeZona, zonaDe, type GeoSignature, type GeoZone } from './geo.js'
import { dPlusDe } from './geometry.js'
import { validateMotif, type MetaKind, type Motif } from './motifs.js'
import type { Placed } from './place.js'
import { regionOf } from './regions.js'
import { emitirPancartas, garantizaClase, renderSkeleton } from './render.js'
import {
  CANONICO,
  ESCALON_ROLE,
  NC_RUTA_CLASICA,
  SKELETONS,
  SKELETON_IDS,
  candidatos,
  cabe,
  degradarPapel,
  skeletonFor,
  type Peticion,
  type Requiere,
  type Skeleton,
  type SkeletonId,
  type Slot,
} from './skeletons.js'
import type { StageRole } from './tour.js'

/**
 * EL CATÁLOGO DE ESQUELETOS (docs/generador.md §5.9, paso 4 del plan §15.6).
 *
 * Catálogo bien formado, plantillas canónicas rendidas en su zona de referencia contra la vara que ya
 * existe (`stageKindOf`, `finalKindOf`, `admite`, la geometría) y la elección (`candidatos`, `cabe`,
 * `skeletonFor`, `ESCALON_ROLE`). Ningún test de este paso importa `veto.ts`: lo que llama a `verify`,
 * a `generateStage`, a `instanciarFirma` o a las funciones de la `cotaFinal` (paso 5) queda en
 * `it.todo` y se enciende en el paso 5 (regla 1 de §15.1). `finalKindDe` es de `veto.ts`: aquí va su
 * tabla literal de §9.2, `FINAL_DE_META`.
 */

/** La zona de la columna «Referencia» de cada esqueleto (§5.9). */
const ZONA_DE_REFERENCIA: Record<SkeletonId, GeoZone> = {
  ud_esprint: 'flandes',
  ud_esprint_capi: 'italia_norte',
  ud_circuito: 'norteamerica',
  ud_muro_final: 'ardenas',
  ud_muros: 'flandes',
  ud_muros_adoquin: 'flandes',
  ud_sterrato: 'italia_centro',
  ud_adoquin: 'francia_norte',
  ud_adoquin_ligero: 'francia_norte',
  ud_montana: 'italia_norte',
  ud_montana_media: 'italia_norte',
  ud_repecho: 'italia_centro',
  ud_montana_alto: 'provenza',
  ud_criterium: 'generico',
  nc_ruta: 'generico',
  nc_crono: 'generico',
  et_llana: 'centroeuropa',
  et_llana_viento: 'golfo',
  et_media_valle: 'italia_sur',
  et_media_alto: 'cantabrico',
  et_media_muro: 'italia_centro',
  et_media_tendida: 'meseta',
  et_reina_alto_largo: 'pirineos',
  et_reina_alto_corto: 'cantabrico',
  et_reina_cima_cerca: 'alpes',
  et_reina_valle: 'alpes',
  et_reina_encadenada: 'dolomitas',
  et_montana_corta: 'pirineos',
  et_reina_blanda: 'portugal',
  et_crono: 'generico',
  et_prologo: 'generico',
  et_cronoescalada: 'pirineos',
}

const LABELS_POR_KIND: Record<StageKind, string[]> = {
  llana: ['Flat'],
  clasica: ['Classic', 'Cobbles', 'Circuit'],
  media: ['Hills', 'Uphill finish', 'Wall finish', 'Circuit'],
  reina: ['Mountains', 'Summit finish', 'Mountains classic'],
  cri: ['ITT', 'Prologue', 'Hill climb'],
}

/** `finalKindDe` de `veto.ts` (paso 5), escrita como la tabla de §9.2 para no importar `veto.ts`. */
const FINAL_DE_META: Record<MetaKind, FinalKind | null> = {
  repecho: 'alto',
  muro_meta: 'alto',
  alto_corto: 'alto',
  alto_largo: 'alto',
  cima_cerca: 'cima_cerca',
  descenso_meta: 'valle_corto',
  valle: 'valle_largo',
  esprint: null,
  sector_meta: null,
}

/** Copia de `POR_PAPEL` (privada de `skeletons.ts`, §5.7) para el test de `degradarPapel`. */
const POR_PAPEL: Record<StageRole, SkeletonId[]> = {
  llana: ['et_llana'],
  llana_viento: ['et_llana_viento'],
  media: ['et_media_valle', 'et_media_tendida'],
  media_alto: ['et_media_alto'],
  media_muro: ['et_media_muro'],
  reina_alto: ['et_reina_alto_largo', 'et_reina_alto_corto'],
  reina_valle: ['et_reina_valle', 'et_reina_cima_cerca'],
  reina_encadenada: ['et_reina_encadenada'],
  montana_corta: ['et_montana_corta'],
  cri: ['et_crono'],
  prologo: ['et_prologo'],
  cronoescalada: ['et_cronoescalada'],
}

const requiereDe = (id: SkeletonId): Requiere[] => [SKELETONS[id].requiere ?? {}].flat()
const tieneAlto = (role: StageRole): boolean =>
  POR_PAPEL[role].some((id) => FINAL_DE_META[SKELETONS[id].meta] === 'alto')
const tienePuerto = (role: StageRole): boolean =>
  POR_PAPEL[role].some((id) => requiereDe(id).some((r) => r.puerto))

/** Todos los motivos de una plantilla, hijos de compuestos y de `sector_meta` incluidos. */
const motivosPlanos = (ms: readonly Motif[]): Motif[] =>
  ms.flatMap((m) => [m, ...motivosPlanos(m.hijos ?? [])])
const kmPlantilla = (ms: readonly Motif[]): number =>
  Math.round(ms.reduce((a, m) => a + m.km * (m.vueltas ?? 1), 0) * 10) / 10
/** Fracción de la etapa en la que EMPIEZA `m` dentro de su plantilla (vueltas incluidas). */
function inicioFraccion(plantilla: readonly Motif[], m: Motif): number {
  let cum = 0
  for (const x of plantilla) {
    if (x === m) return cum / kmPlantilla(plantilla)
    cum += x.km * (x.vueltas ?? 1)
  }
  throw new Error('inicioFraccion: el motivo no está en la plantilla')
}
/** El hueco de primer nivel de un motivo de la plantilla; null para enlaces, bajadas y meta. */
const slotDe = (sk: Skeleton, m: Motif): Slot | null =>
  m.kind === 'enlace' || m.kind === 'descenso' || m.kind === 'meta'
    ? null
    : (sk.slots.find((s) => s.motif === m.kind) ?? null)

// Auxiliares de §15.6: la plantilla canónica colocada por acumulación, como `canonica` (§8.11).
function renderPlantilla(
  sk: Skeleton,
  plantilla: readonly Motif[],
  geo: GeoSignature,
): StageProfile {
  const id = sk.id
  const colocados: Placed[] = []
  let cum = 0
  let k = 0 // índice corrido de dificultad
  for (const motif of conFirmeDeZona(plantilla, geo)) {
    // como `canonica` (§8.11): el firme de los sectores lo pone la zona
    const kmTotal = motif.km * (motif.vueltas ?? 1) // en `circuito`, km es el de una vuelta
    if (motif.kind === 'enlace' || motif.kind === 'expuesto') {
      cum += kmTotal
      continue
    }
    if (motif.kind === 'descenso' && colocados.length > 0) {
      colocados[colocados.length - 1]!.bajada = motif
      cum += kmTotal
      continue // `!`: noUncheckedIndexedAccess (tsconfig.base.json l. 13)
    }
    colocados.push({
      motif,
      slot: motif.kind === 'meta' ? 'meta' : k++,
      inicioKm: cum,
      finKm: cum + kmTotal,
    })
    cum += kmTotal
  }
  const segs = renderSkeleton(colocados, cum, geo, (token) =>
    routeRng(`canonico|${id}|dib|${token}`),
  )
  const g = garantizaClase(segs, sk, colocados)
  if (!g)
    throw new Error(`${id}: garantizaClase devuelve null sobre la canónica (fallo de catálogo)`)
  return { segments: g.segs, banners: emitirPancartas(g.segs, colocados) }
}
const renderCanonico = (id: SkeletonId, geo: GeoSignature): StageProfile =>
  renderPlantilla(SKELETONS[id], SKELETONS[id].canonico, geo)

/** El país de una fila (el de la fila o el del calendario construido: `RACE_COUNTRY` es privada). */
const paisDe = (row: RaceRow): string | null =>
  row.country ?? SEASON_CALENDAR.find((r) => r.id === row.id)?.country ?? null
/** El papel con que una etapa de vuelta de la fila entraría por `candidatos` (un día: `un_dia`). */
const PAPEL_DE_TERRENO: Record<RouteTerrain, StageRole> = {
  flat: 'llana',
  cobbles: 'llana',
  hilly: 'media',
  classic: 'media',
  mountain: 'reina_alto',
  itt: 'cri',
}
function requestDeFila(row: RaceRow, raceClass: RaceClass): Peticion {
  const terrain = row.terrain ?? 'flat'
  const unDia = (row.stages ?? 1) <= 1
  return {
    role: unDia ? 'un_dia' : PAPEL_DE_TERRENO[terrain],
    terrain,
    geo: ZONAS[regionOf(row.id, 1, paisDe(row))],
    raceClass,
    format: unDia ? 'un-dia' : 'una-semana',
    km: row.km ?? 210,
    routeSource: 'generado',
  }
}

describe('catálogo', () => {
  it('tiene exactamente los identificadores de SkeletonId', () => {
    expect(Object.keys(SKELETONS).sort()).toEqual([...SKELETON_IDS].sort()) // 16 ud_/nc_ + 16 et_
    expect(Object.keys(CANONICO).sort()).toEqual([...SKELETON_IDS].sort())
    for (const id of SKELETON_IDS) {
      expect(SKELETONS[id].id).toBe(id)
      expect(SKELETONS[id].canonico).toBe(CANONICO[id])
    }
  })
  it.each(Object.values(SKELETONS))('$id está bien formado', (sk) => {
    const slots = (ss: Slot[]): Slot[] => ss.flatMap((s) => [s, ...slots(s.hijos ?? [])])
    for (const s of slots(sk.slots)) {
      expect(s.n[0]).toBeLessThanOrEqual(s.n[1])
      expect(s.ventana[0]).toBeLessThanOrEqual(s.ventana[1])
      expect(s.ventana[0]).toBeGreaterThanOrEqual(0)
      expect(s.ventana[1]).toBeLessThanOrEqual(1)
      if (s.hijos) expect(['cadena', 'racimo', 'circuito']).toContain(s.motif)
      expect(s.motif).not.toBe('meta') // la meta no es un hueco: vive en `sk.meta` (§5.2)
    }
    // Huecos de primer nivel en el orden de su ventana: el que usa `colocar`.
    for (let i = 1; i < sk.slots.length; i++)
      expect(sk.slots[i]!.ventana[0]).toBeGreaterThanOrEqual(sk.slots[i - 1]!.ventana[0])
    expect(sk.dPlus[0]).toBeLessThan(sk.dPlus[1])
    expect(sk.km[0]).toBeLessThan(sk.km[1])
    expect(sk.pesoBase).toBeGreaterThan(0) // ud_criterium pesa 1 y la clase lo pone a 0 en todas (D5)
    // `km` dentro de `ARCH.km.maxPorClase` para alguna clase: la condición de `cabe` (su `km[0]`).
    expect(RACE_CLASSES.some((cls) => sk.km[0] <= ARCH.km.maxPorClase[cls])).toBe(true)
    if (sk.kind === 'llana')
      expect(
        sk.slots.every(
          (s) =>
            ['enlace', 'expuesto', 'tendida'].includes(s.motif) ||
            (s.motif === 'circuito' && (s.hijos ?? []).length === 0),
        ),
      ).toBe(true)
    if (sk.kind === 'media') expect(sk.dPlus[1]).toBeLessThanOrEqual(2900) // regla 1 de §5.1: 300 bajo QUEEN_MIN_CLIMB_METRES
    expect(LABELS_POR_KIND[sk.kind]).toContain(sk.label)
    expect(sk.timeTrial === true).toBe(sk.kind === 'cri')
    // V7 (§9.2): si el esqueleto declara finalKind y su meta tiene uno, coinciden.
    const deMeta = FINAL_DE_META[sk.meta]
    if (sk.finalKind && deMeta !== null) expect(deMeta).toBe(sk.finalKind)
    for (const alt of sk.alternativas ?? []) {
      const m = FINAL_DE_META[alt.meta ?? sk.meta]
      if (sk.finalKind && m !== null) expect(m).toBe(sk.finalKind)
    }
    expect(Object.keys(ARCH.pesoPorClase[sk.id]).sort()).toEqual([...RACE_CLASSES].sort()) // Object.keys ordena '1' y '2' delante
    for (const cls of RACE_CLASSES)
      if (sk.km[0] > ARCH.km.maxPorClase[cls]) expect(ARCH.pesoPorClase[sk.id][cls]).toBe(0) // V13 y el dato dicen lo mismo
    for (const s of sk.slots)
      if (s.n[0] >= 1 && (s.motif === 'puerto' || s.motif === 'cota' || s.motif === 'muro'))
        expect(requiereDe(sk.id).every((r) => r[s.motif as 'puerto' | 'cota' | 'muro'])).toBe(true) // todo hueco obligatorio está en `requiere`
    // `requiere` solo cita claves de `GeoSignature` (o las dos de rango de cota, que leen `geo.cota`).
    const claves = new Set([...Object.keys(ZONAS.generico), 'cotaKmMin', 'cotaCortaMax'])
    for (const r of requiereDe(sk.id)) for (const k of Object.keys(r)) expect(claves).toContain(k)
    // La cotaFinal declarada es la de una meta que la tiene; `esprint` y `sector_meta` no la llevan.
    if (sk.meta === 'esprint' || sk.meta === 'sector_meta')
      expect(sk.metaParams?.cotaFinal).toBeUndefined()
    const conValle = ['cima_cerca', 'descenso_meta', 'valle'].includes(sk.meta)
    if (sk.id.startsWith('et_') && conValle) expect(sk.metaParams?.cotaFinal).toBeDefined() // ARCH.meta.<clave> no trae km ni g
  })
  it('las alternativas solo existen en ud_montana y et_reina_alto_largo (§5.5)', () => {
    expect(
      Object.values(SKELETONS)
        .filter((sk) => sk.alternativas)
        .map((sk) => sk.id)
        .sort(),
    ).toEqual(['et_reina_alto_largo', 'ud_montana'])
    expect(SKELETONS.ud_montana.slots[1]!.firma).toBe(true) // `slots: { 1: … }` de Bérgamo es el puerto de firma
    expect(SKELETONS.et_reina_alto_largo.alternativas!.map((a) => a.nombre)).toEqual([
      'Angliru',
      'Lagos',
    ])
  })
})

describe('cotaFinal (regla 2 de §5.1)', () => {
  // `envolventeCotaFinal`, `rangoCotaFinal`, `techoKmCotaFinal` y `techoGCotaFinal` son del paso 5:
  // las importa `instanciarFirma` y leen `ARCH.veto.puertoDplusMax`, que entra en ese paso.
  it.todo('$id: rango de ARCH ∩ metaParams, igual al de la tabla (paso 5: rangoCotaFinal)')
  it.todo('las opciones de nivel 2 resuelven su cotaFinal campo a campo (paso 5)')
  it.todo(
    'un esqueleto de etapa con valle y sin metaParams.cotaFinal lanza, y uno de un día cae a unDiaUltimaCota (paso 5)',
  )
  it.todo('los techos de altitud no vacían el rango en ninguna zona admitida (paso 5)')
  it.todo(
    'la zona no estrecha la meta: et_reina_alto_corto en cantabrico sortea g ≥ 8 (paso 5: instanciarFirma)',
  )
  it.todo('et_reina_blanda en cono_sur no queda clavada en 6,0 (paso 5: instanciarFirma)')
})

/**
 * La canónica rendida en su zona de referencia, MEDIDA con `dPlusDe`, en los esqueletos donde queda
 * bajo el suelo de `sk.dPlus`. El documento escribió los `dPlus` del catálogo estimando el relleno a
 * 5,5 m/km (§5.1 regla 3); el paso 3 lo recalibró a 3,0 con la amplitud de cada zona (§15.5), y las
 * plantillas de un día de poco relieve y las medias quedan de 67 a 305 m por debajo. Se sella la cifra
 * y el `it.todo` de abajo lleva la deuda: el suelo se re-deriva con 3,0 m/km o la plantilla se endurece
 * (decisión de catálogo del paso 5, que es el que persigue `dPlusObjetivo` en `sk.dPlus`).
 */
const DPLUS_BAJO_EL_SUELO: Partial<Record<SkeletonId, number>> = {
  ud_muro_final: 1365,
  ud_muros_adoquin: 1377,
  ud_sterrato: 1314,
  ud_adoquin: 450,
  ud_adoquin_ligero: 495,
  ud_montana: 2732,
  ud_montana_media: 1925,
  ud_repecho: 1386,
  et_llana_viento: 220,
  et_media_valle: 1533,
  et_media_muro: 1366,
  et_reina_alto_corto: 2529,
  et_reina_cima_cerca: 2913,
}

describe('plantilla canónica', () => {
  it.each(Object.values(SKELETONS))(
    '$id: pasa validateMotif, respeta sus ventanas y da su kind y su finalKind sin RNG',
    (sk) => {
      const geo = ZONAS[ZONA_DE_REFERENCIA[sk.id]]
      expect(admite(sk.requiere, geo), `${sk.id} en ${geo.zona}`).toBe(true)
      for (const m of motivosPlanos(sk.canonico)) expect(validateMotif(m, geo)).toBeNull()
      for (const m of sk.canonico) {
        const s = slotDe(sk, m)
        if (s) {
          expect(inicioFraccion(sk.canonico, m), `${sk.id} ${m.kind}`).toBeGreaterThanOrEqual(
            s.ventana[0],
          )
          expect(inicioFraccion(sk.canonico, m), `${sk.id} ${m.kind}`).toBeLessThanOrEqual(
            s.ventana[1],
          )
        }
      }
      expect(sk.canonico.at(-1)!.kind).toBe('meta')
      expect(sk.canonico.at(-1)!.meta).toBe(sk.meta)
      const kmCanonico = kmPlantilla(sk.canonico)
      expect(kmCanonico).toBeGreaterThanOrEqual(sk.km[0])
      expect(kmCanonico).toBeLessThanOrEqual(sk.km[1])
      const profile = renderCanonico(sk.id, geo) // auxiliar de §15.6: coloca por acumulación
      expect(Math.abs(profileKm(profile) - kmCanonico)).toBeLessThan(0.05)
      expect(stageKindOf(profile, sk.timeTrial ?? false).kind).toBe(sk.kind) // V6 compara kind
      if (sk.finalKind) expect(finalKindOf(profile)).toBe(sk.finalKind)
      const dPlus = dPlusDe(profile)
      expect(dPlus, `${sk.id}: D+ ${Math.round(dPlus)}`).toBeLessThanOrEqual(sk.dPlus[1])
      if (!(sk.id in DPLUS_BAJO_EL_SUELO))
        expect(dPlus, `${sk.id}: D+ ${Math.round(dPlus)}`).toBeGreaterThanOrEqual(sk.dPlus[0])
      else expect(Math.round(dPlus)).toBe(DPLUS_BAJO_EL_SUELO[sk.id]) // la cifra medida, sellada
      for (const { canonico: alt, nombre } of sk.alternativas ?? []) {
        for (const m of motivosPlanos(alt)) expect(validateMotif(m, geo)).toBeNull()
        const p2 = renderPlantilla(sk, alt, geo)
        expect(Math.abs(profileKm(p2) - kmPlantilla(alt))).toBeLessThan(0.05)
        expect(stageKindOf(p2, sk.timeTrial ?? false).kind, nombre).toBe(sk.kind)
        if (sk.finalKind) expect(finalKindOf(p2), nombre).toBe(sk.finalKind)
      }
    },
  )
  it.todo('la canónica y cada alternativa pasan verify en su zona de referencia (paso 5: verify)')
  it.todo(
    `dPlusDe de la canónica ≥ sk.dPlus[0] también en ${Object.keys(DPLUS_BAJO_EL_SUELO).length} esqueletos cuyo suelo supone 5,5 m/km de relleno (paso 3: 3,0); hoy ${Object.entries(
      DPLUS_BAJO_EL_SUELO,
    )
      .map(([id, d]) => `${id} ${d} < ${SKELETONS[id as SkeletonId].dPlus[0]}`)
      .join(', ')}`,
  )
  it('la pancarta redondea al entero: el Poggio canónico corona a 6,0 leídos, no a 5,4', () => {
    const sk = SKELETONS.ud_esprint_capi
    const profile = renderCanonico(sk.id, ZONAS.italia_norte)
    expect(profile.banners!.at(-1)).toEqual({ km: 284, tipo: 'cima' })
    expect(kmAfterLastClimb(profile)).toBeCloseTo(6, 9)
    expect(finalKindOf(profile)).toBe('valle_corto')
  })
  it('nc_ruta en flandes es clasica / Circuit con NC_RUTA_CLASICA; en generico, media', () => {
    const sk = skeletonFor('nc_ruta', ZONAS.flandes)
    expect(sk.kind).toBe('clasica')
    expect(sk.label).toBe('Circuit')
    expect(sk.finalKind).toBeUndefined()
    expect(sk.canonico).toBe(NC_RUTA_CLASICA)
    expect(sk.slots[1]!.hijos!.find((h) => h.motif === 'cota')!.n).toEqual([0, 0])
    expect(stageKindOf(renderPlantilla(sk, sk.canonico, ZONAS.flandes), false).kind).toBe('clasica')
    for (const m of motivosPlanos(NC_RUTA_CLASICA))
      expect(validateMotif(m, ZONAS.flandes)).toBeNull()
    expect(skeletonFor('nc_ruta', ZONAS.generico)).toBe(SKELETONS.nc_ruta) // cota hasta 6 km
    expect(skeletonFor('nc_ruta', ZONAS.bretana).kind).toBe('clasica') // cota hasta 3,0
    expect(skeletonFor('ud_montana', ZONAS.flandes)).toBe(SKELETONS.ud_montana)
  })
})

describe('esqueleto × km × semillas × zonas (V6 y V7)', () => {
  // test:rapido: 5 km × 20 semillas × TRES_ZONAS(sk); test:bancos: 60 semillas × toda zona admitida.
  it.todo('$id en $zona con $km km: kind, label, finalKind y dPlus (paso 5: generateStage)')
})

describe('candidatos y pesos', () => {
  it('nunca devuelve vacío ni lanza para ninguna (fila, clase) del calendario', () => {
    expect(RACE_ROWS.length).toBeGreaterThan(0)
    for (const row of RACE_ROWS)
      for (const cls of RACE_CLASSES) {
        const cs = candidatos(requestDeFila(row, cls))
        expect(cs.length, `${row.id} ${cls}`).toBeGreaterThan(0)
        for (const c of cs) expect(c.peso, `${row.id} ${cls} ${c.id}`).toBeGreaterThan(0)
      }
  })
  it('todo candidato cabe: la zona lo admite, la clase no lo veta y su km[0] no pasa del techo', () => {
    for (const row of RACE_ROWS)
      for (const cls of ['WT', 'Pro', '1', '2'] as const) {
        const req = requestDeFila(row, cls)
        for (const c of candidatos(req)) expect(cabe(c.id, req), `${row.id} ${c.id}`).toBe(true)
      }
  })
  it('mountain en una zona sin puerto nunca da ud_montana: en flandes sale ud_circuito sin bajar de terreno', () => {
    // §5.6 y §8.2: `ud_circuito` está en SESGO_TERRENO.mountain (×0,25), así que un `mountain` en una
    // zona con muros tiene candidato sin escalón («un mountain en Dinamarca da ud_circuito con muros»).
    // Donde ni el circuito cabe (sin muro ni cota corta), baja a hilly.
    const ids = candidatos({
      role: 'un_dia',
      terrain: 'mountain',
      geo: ZONAS.flandes,
      raceClass: 'Pro',
      format: 'un-dia',
      km: 200,
      routeSource: 'generado',
    }).map((c) => c.id)
    expect(ids).not.toContain('ud_montana')
    expect(ids).toEqual(['ud_circuito'])
    const enMeseta = candidatos({
      role: 'un_dia',
      terrain: 'mountain',
      geo: ZONAS.meseta, // sin puerto, sin muro y con la cota desde 3 km: ni el circuito cabe
      raceClass: 'Pro',
      format: 'un-dia',
      km: 200,
      routeSource: 'generado',
    }).map((c) => c.id)
    expect(enMeseta).toEqual(['ud_montana_media']) // su cota llega a 8 km: la media del terreno mountain
  })
  it('hilly en una zona sin muro: tres candidatos desde .1, y en .2 donde la cota baja de 2,9 km', () => {
    const sinMuro: GeoZone[] = [
      'alpes',
      'pirineos',
      'dolomitas',
      'meseta',
      'balcanes',
      'anatolia',
      'andes',
      'cono_sur',
      'golfo',
      'africa_llana',
    ]
    const ids = (zona: GeoZone, raceClass: RaceClass) =>
      candidatos({
        role: 'un_dia',
        terrain: 'hilly',
        geo: ZONAS[zona],
        raceClass,
        format: 'un-dia',
        km: 160,
        routeSource: 'generado',
      }).map((c) => c.id)
    expect(
      Object.values(ZONAS)
        .filter((g) => g.muro === null)
        .map((g) => g.zona)
        .sort(),
    ).toEqual([...sinMuro].sort())
    for (const zona of sinMuro) {
      expect(ids(zona, '1')).toEqual(
        expect.arrayContaining(['ud_montana_media', 'ud_repecho', 'ud_esprint_capi']),
      )
      expect(ids(zona, '2')).toEqual(expect.arrayContaining(['ud_montana_media', 'ud_repecho']))
      expect(ids(zona, '2').includes('ud_circuito')).toBe(ZONAS[zona].cota!.km[0] <= 2.9) // andes, golfo, africa_llana
    }
  })
  it('ud_montana_alto pesa 60 × 0,02 y solo en .1 (D1)', () => {
    expect(ARCH.pesoPorClase.ud_montana_alto).toEqual({ WT: 0, Pro: 0, '1': 0.02, '2': 0, NC: 0 })
    expect(SKELETONS.ud_montana_alto.pesoBase).toBe(60)
  })
  it('ud_criterium no sale nunca (D5): pesa 0 en las cinco clases', () => {
    for (const cls of RACE_CLASSES) expect(ARCH.pesoPorClase.ud_criterium[cls]).toBe(0)
  })
  it('la clase decide el candidato: ninguna .2 recibe un esqueleto de km[0] > 180', () => {
    for (const row of RACE_ROWS.filter((r) => (r.stages ?? 1) <= 1))
      for (const c of candidatos(requestDeFila(row, '2')))
        expect(SKELETONS[c.id].km[0]).toBeLessThanOrEqual(ARCH.km.maxPorClase['2'])
  })
  it('las filas cobbles reciben adoquín; las que bajan a classic se imprimen', () => {
    const bajan = RACE_ROWS.filter((r) => r.terrain === 'cobbles').filter(
      (row) =>
        !candidatos(requestDeFila(row, row.raceClass)).some((c) =>
          ['ud_adoquin', 'ud_adoquin_ligero', 'ud_muros_adoquin'].includes(c.id),
        ),
    )
    console.info(
      `[skeletons] filas cobbles sin candidato de adoquín en su zona: ${bajan.length} (${bajan.map((r) => r.id).join(' ')})`,
    )
    expect(bajan.length).toBeLessThanOrEqual(1) // race-leon en meseta (duda de dato, §6.3)
  })
  it('un nacional solo sale de nc_ruta o nc_crono, y ninguna carrera de equipos sale de nc_ruta', () => {
    for (const { code } of COUNTRIES) {
      const geo = ZONAS[zonaDe(code)]
      const base = { role: 'un_dia', geo, raceClass: 'NC', format: 'un-dia' } as const
      expect(
        candidatos({ ...base, terrain: 'classic', km: 210, routeSource: 'generado' }).map(
          (c) => c.id,
        ),
      ).toEqual(['nc_ruta'])
      expect(
        candidatos({ ...base, terrain: 'itt', km: 38, routeSource: 'generado' }).map((c) => c.id),
      ).toEqual(['nc_crono'])
    }
    for (const cls of ['WT', 'Pro', '1', '2'] as const)
      expect(
        candidatos({
          role: 'un_dia',
          terrain: 'hilly',
          geo: ZONAS.ardenas,
          raceClass: cls,
          format: 'un-dia',
          km: 200,
          routeSource: 'generado',
        }).map((c) => c.id),
      ).not.toContain('nc_ruta')
    const chrono = RACE_ROWS.find((r) => r.id === 'race-chrono')! // .1, itt, 45 km
    expect(candidatos(requestDeFila(chrono, chrono.raceClass)).map((c) => c.id)).toEqual([
      'nc_crono',
    ])
  })
  it('degradarPapel nunca añade un final en alto ni un puerto que el papel de origen no tuviera', () => {
    for (const [origen, destino] of Object.entries(ESCALON_ROLE) as [
      StageRole,
      StageRole | null,
    ][]) {
      expect(degradarPapel(origen)).toBe(destino)
      if (!destino) continue
      if (tieneAlto(destino)) expect(tieneAlto(origen), `${origen} → ${destino}`).toBe(true)
      if (tienePuerto(destino)) expect(tienePuerto(origen), `${origen} → ${destino}`).toBe(true)
    }
  })
  it('los papeles de etapa dan esqueletos de etapa, y de su kind cuando la zona los admite', () => {
    for (const role of Object.keys(POR_PAPEL) as StageRole[]) {
      const ids = candidatos({
        role,
        terrain: 'hilly',
        geo: ZONAS.alpes,
        raceClass: 'WT',
        format: 'una-semana',
        km: 160,
        routeSource: 'generado',
      }).map((c) => c.id)
      expect(ids.every((id) => id.startsWith('et_'))).toBe(true)
    }
  })
  it('la edición real va por EditionTerrain: mountain en flandes acaba en et_media_muro, cobbles en ud_adoquin_ligero', () => {
    const ed = (terrain: RouteTerrain, geo: GeoSignature, km: number) =>
      candidatos({
        role: 'reina_alto',
        terrain,
        geo,
        raceClass: 'WT',
        format: 'gran-vuelta',
        km,
        routeSource: 'edicion',
      }).map((c) => c.id)
    expect(ed('mountain', ZONAS.flandes, 170)).toEqual(['et_media_muro'])
    expect(ed('mountain', ZONAS.alpes, 170)).not.toContain('et_montana_corta') // km > 140
    expect(ed('mountain', ZONAS.pirineos, 130)).toContain('et_montana_corta')
    expect(ed('itt', ZONAS.generico, 6)).toEqual(['et_prologo'])
    expect(ed('itt', ZONAS.generico, 20)).toEqual(['et_crono'])
    expect(ed('cobbles', ZONAS.francia_norte, 180)).toEqual(['ud_adoquin_ligero'])
    for (const zona of Object.values(ZONAS))
      for (const t of ['flat', 'hilly', 'mountain', 'itt'] as const)
        expect(ed(t, zona, 160).every((id) => id.startsWith('et_'))).toBe(true)
  })
  it.todo(
    'la reina blanda sale con la cuota de ARCH.reina.blandaShare (paso 5: generateStage, 4.000 semillas)',
  )
})

describe('etapas de edición', () => {
  it.todo(
    'reciben esqueletos de etapa, salvo cobbles → ud_adoquin_ligero, con km al 0,1 (paso 6: stagesForSeason)',
  )
  it.todo('una etapa mountain de edición en flandes acaba en et_media_muro (paso 5: generateStage)')
  it.todo('Colombia e5 de REAL_QUEENS ya no es una clásica de montaña (paso 6: stagesForSeason)')
})
