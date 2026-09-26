// El motor es puro y no toca disco (eslint.config.js); este test sí, porque el último `it` LEE el
// fuente de veto.ts como texto. Un test no lo importa nadie: no rompe la pureza.
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ARCH, STAGE } from '../../constants.js'
import type { RouteStats } from '../../sim/routeCensus.js'
import type { Banner, Segment, StageProfile } from '../../stage/types.js'
import { finalKindOf, kmAfterLastClimb } from '../finalKind.js'
import { routeRng } from '../profileGen.js'
import { climbSize, stageKindOf } from '../stageKind.js'
import type { RaceClass } from '../uci.js'
import { generateStage, type StageRequest } from './generate.js'
import { ZONAS, conFirmeDeZona, type GeoSignature } from './geo.js'
import { rachasDeSubida, subidaLejanaShare } from './geometry.js'
import type { MetaKind, Motif } from './motifs.js'
import { colocarPlantilla, type Placed } from './place.js'
import { emitirPancartas, garantizaClase, renderSkeleton } from './render.js'
import { SKELETONS, type Skeleton, type SkeletonId } from './skeletons.js'
import type { StageRole } from './tour.js'
import { V16, V5, V8, conjuntoV16, finalKindDe, verify, type VetoId } from './veto.js'

/**
 * LOS VETOS (docs/generador.md sección 9, paso 5 del plan §15.7).
 *
 * Por cada veto por etapa (V1 a V10 y V15) un perfil literal que lo dispara y otro que no, con los
 * fixtures de §9.8 (`colocados` por `colocarPlantilla`); V16 como predicado puro sobre filas literales
 * de `RouteStats`; los dos casos con nombre (el v40 de §9.3 y `reina-150` de §9.4). Ningún `routeRng`
 * en los fixtures: todo es literal. V11 y V12 se miden sobre el calendario en `sim/routeCensus.test.ts`
 * (paso 8) y V13 y V14 son del paso 7.
 */

// Constructores de motivo: copia de los de §5.4 (skeletons.ts no los exporta).
const E = (km: number): Motif => ({ kind: 'enlace', km })
const X = (km: number): Motif => ({ kind: 'expuesto', km })
const C = (km: number, g: number): Motif => ({ kind: 'cota', km, g })
const P = (km: number, g: number, firma = false): Motif => ({
  kind: 'puerto',
  km,
  g,
  forma: 'regular',
  firma,
})
const M = (km: number, g: number, adoquin = false): Motif => ({ kind: 'muro', km, g, adoquin })
const D = (km: number): Motif => ({ kind: 'descenso', km, g: -5 })
const S = (km: number, estrellas: number, firme: 'adoquin' | 'tierra' = 'adoquin'): Motif => ({
  kind: 'sector',
  km,
  estrellas,
  firme,
})
const META = (
  meta: MetaKind,
  km: number,
  cotaFinal?: { km: number; g: number },
  hijos?: Motif[],
): Motif => ({
  kind: 'meta',
  meta,
  km,
  ...(cotaFinal ? { cotaFinal } : {}),
  ...(hijos ? { hijos } : {}),
  firma: true,
})

// Segmentos literales. Sin `tramos`, un segmento sube 0 m para dPlusDe y climbMetres y es 0 % en rachasDeSubida.
const L = (km: number): Segment => ({ km, tipo: 'llano' })
const Lt = (km: number, ...t: [number, number][]): Segment => ({
  km,
  tipo: 'llano',
  tramos: t.map(([k, g]) => ({ km: k, g })),
})
const ond = (km: number, g: number): Segment => Lt(km, [km / 2, g], [km / 2, -g]) // sube (km / 2) · g · 10 m
const Pu = (km: number, ...t: [number, number][]): Segment => ({
  km,
  tipo: 'puerto',
  tramos: t.map(([k, g]) => ({ km: k, g })),
})
const Ds = (km: number, g = -6): Segment => ({ km, tipo: 'descenso', tramos: [{ km, g }] })
const Pv = (km: number, estrellas: number): Segment => ({ km, tipo: 'paves', estrellas })
const cimas = (...km: number[]): Banner[] => km.map((k) => ({ km: k, tipo: 'cima' as const }))

/** La StageRequest de un día de §9.3: race-jura (.1, Francia, `terrain: 'mountain'`) en `macizo_central`. */
const reqUnDia: StageRequest = {
  raceId: 'test-jura',
  stageIndex: 1,
  season: 0,
  km: 210,
  role: 'un_dia',
  terrain: 'mountain',
  geo: ZONAS.macizo_central,
  raceClass: '1',
  format: 'un-dia',
  routeSource: 'generado',
  fixed: { skeleton: 'ud_montana' },
}
/** Auxiliar local (§15.7): la StageRequest completa (§3.7) que §9.4 llama `reqReina(km)`. */
const reqReina = (km: number): StageRequest => ({
  raceId: 'test-reina',
  stageIndex: 15,
  season: 0,
  km,
  role: 'reina_alto',
  terrain: 'mountain',
  geo: ZONAS.pirineos,
  raceClass: 'WT',
  format: 'gran-vuelta',
  routeSource: 'generado',
  fixed: { skeleton: 'et_reina_alto_largo' },
})
const unDia = (id: SkeletonId, geo: GeoSignature, km: number): StageRequest => ({
  ...reqUnDia,
  raceId: `test-${id}`,
  km,
  geo,
  terrain: 'classic',
  fixed: { skeleton: id },
})
const etapa = (id: SkeletonId, role: StageRole, geo: GeoSignature, km: number): StageRequest => ({
  raceId: `test-${id}`,
  stageIndex: 5,
  season: 0,
  km,
  role,
  terrain: role === 'llana' ? 'flat' : 'mountain',
  geo,
  raceClass: 'WT',
  format: 'gran-vuelta',
  routeSource: 'generado',
  fixed: { skeleton: id },
})

/** La plantilla colocada por acumulación y rendida en su zona, como `canonica` (§8.11); auxiliar local, como en skeletons.test.ts. */
function renderCanonico(id: SkeletonId, geo: GeoSignature): StageProfile {
  const sk = SKELETONS[id]
  const colocados: Placed[] = colocarPlantilla(conFirmeDeZona(sk.canonico, geo))
  const km = sk.canonico.reduce((a, m) => a + m.km * (m.vueltas ?? 1), 0)
  const segs = renderSkeleton(colocados, km, geo, (token) =>
    routeRng(`canonico|${id}|dib|${token}`),
  )
  const g = garantizaClase(segs, sk, colocados)
  if (!g) throw new Error(`${id}: garantizaClase devuelve null sobre la canónica`)
  return { segments: g.segs, banners: emitirPancartas(g.segs, colocados) }
}

interface Fixture {
  profile: StageProfile
  sk: Skeleton
  req: StageRequest
  motivos: Motif[]
  colocados: Placed[]
  km: number
}
const fx = (
  id: SkeletonId,
  req: StageRequest,
  km: number,
  segments: Segment[],
  banners: Banner[],
  motivos: Motif[],
): Fixture => ({
  profile: { segments, banners },
  sk: SKELETONS[id],
  req,
  motivos,
  colocados: colocarPlantilla(motivos),
  km,
})
const corre = (f: Fixture) => verify(f.profile, f.sk, f.req, f.motivos, f.km, f.colocados)

// Lombardía por Como: la canónica de ud_montana de §5.4 con un tramo por segmento. 245 km; San Fermo 2,7 km al 7,2 % corona en 239,3.
const COMO: Segment[] = [
  L(98),
  Pu(9, [9, 6.2]),
  Ds(10, -5),
  L(20),
  Pu(13, [13, 6.6]),
  Ds(10, -5),
  L(37),
  Pu(4, [4, 7]),
  Ds(5.1, -5),
  L(19.5),
  Pu(4.2, [4.2, 7]),
  Ds(5.3, -5),
  L(1.5),
  Pu(2.7, [2.7, 7.2]),
  Ds(3.5, -5.5),
  L(2.2),
]
const COMO_CIMAS = cimas(107, 150, 201, 230, 239)
const COMO_MOT: Motif[] = [
  E(98),
  P(9.0, 6.2),
  D(10),
  E(20),
  P(13, 6.6, true),
  D(10),
  E(37),
  C(4, 7),
  D(5.1),
  E(19.5),
  C(4.2, 7),
  D(5.3),
  E(1.5),
  META('descenso_meta', 8.4, { km: 2.7, g: 7.2 }),
]

// V1 · puerto donde no hay puertos
const perfilPuertoEnFlandes = fx(
  'ud_montana',
  unDia('ud_montana', ZONAS.flandes, 245),
  245,
  COMO,
  COMO_CIMAS,
  COMO_MOT,
)
const perfilPuertoEnAlpes = fx(
  'ud_montana',
  unDia('ud_montana', ZONAS.alpes, 245),
  245,
  COMO,
  COMO_CIMAS,
  COMO_MOT,
)
// V2 · adoquín donde no hay adoquín: un Roubaix mínimo de 200 km, sin pancartas
const ROUBAIX: Segment[] = [L(150), Pv(2.4, 5), L(20), Pv(3, 4), L(21.5), Pv(1, 2), L(2.1)]
const ROUBAIX_MOT: Motif[] = [
  X(150),
  S(2.4, 5),
  E(20),
  S(3, 4),
  E(21.5),
  META('sector_meta', 3.1, undefined, [S(1, 2)]),
]
const perfilAdoquinEnAndes = fx(
  'ud_adoquin',
  unDia('ud_adoquin', ZONAS.andes, 200),
  200,
  ROUBAIX,
  [],
  ROUBAIX_MOT,
)
const perfilAdoquinEnFranciaNorte = fx(
  'ud_adoquin',
  unDia('ud_adoquin', ZONAS.francia_norte, 200),
  200,
  ROUBAIX,
  [],
  ROUBAIX_MOT,
)
// V3 · tierra donde no hay sterrato: dos sectores de tierra y un muro de meta de 0,8 km al 14 %
const STRADE: Segment[] = [L(150), Pv(3, 3), L(20), Pv(3.5, 3), L(20.7), L(2), Pu(0.8, [0.8, 14])]
const STRADE_MOT: Motif[] = [
  E(150),
  S(3, 3, 'tierra'),
  E(20),
  S(3.5, 3, 'tierra'),
  E(20.7),
  META('muro_meta', 2.8, { km: 0.8, g: 14 }),
]
const perfilTierraEnFlandes = fx(
  'ud_sterrato',
  unDia('ud_sterrato', ZONAS.flandes, 200),
  200,
  STRADE,
  cimas(200),
  STRADE_MOT,
)
const perfilTierraEnItaliaCentro = fx(
  'ud_sterrato',
  unDia('ud_sterrato', ZONAS.italia_centro, 200),
  200,
  STRADE,
  cimas(200),
  STRADE_MOT,
)
// V4 · un puerto de 20 km al 8 % (1.600 m) en una reina de valle; la zona es pirineos con la altitud forzada
const VALLE_20: Segment[] = [
  L(40),
  Pu(20, [10, 7.5], [10, 8.5]),
  Ds(10),
  L(86),
  Pu(10, [5, 7], [5, 8]),
  Ds(10),
  L(9),
]
const VALLE_20_MOT: Motif[] = [
  E(40),
  P(20, 8),
  D(10),
  E(86),
  META('descenso_meta', 29, { km: 10, g: 7.5 }),
]
const perfilPuerto20kmEnColina = fx(
  'et_reina_valle',
  etapa('et_reina_valle', 'reina_valle', { ...ZONAS.pirineos, altitud: 'colina' }, 185),
  185,
  VALLE_20,
  cimas(60, 166),
  VALLE_20_MOT,
)
const perfilPuerto20kmEnAlta = fx(
  'et_reina_valle',
  etapa('et_reina_valle', 'reina_valle', { ...ZONAS.pirineos, altitud: 'alta' }, 185),
  185,
  VALLE_20,
  cimas(60, 166),
  VALLE_20_MOT,
)
// V5 · el caso v40: el generador viejo (14 km al 8 % muriendo en meta) contra Lombardía, en la zona de race-jura
const perfilJura14km = fx('ud_montana', reqUnDia, 210, [L(196), Pu(14, [14, 8])], cimas(210), [
  E(196),
  META('alto_largo', 14, { km: 14, g: 8 }),
])
const perfilLombardiaSanFermo = fx(
  'ud_montana',
  { ...reqUnDia, km: 245 },
  245,
  COMO,
  COMO_CIMAS,
  COMO_MOT,
)
// V6 · reina que no es reina: el puerto de meta mide 8,4 (media) o 9,0 (reina); relleno en tramos para acercarse a 3.200 m
const perfilReinaCon84 = fx(
  'et_reina_alto_largo',
  reqReina(175),
  175,
  [ond(60, 2), Pu(8, [4, 7], [4, 8]), Ds(10), ond(88.6, 2.3), Pu(8.4, [4.2, 7.5], [4.2, 8.5])],
  cimas(68, 175),
  [E(60), C(8, 7.5), D(10), E(88.6), META('alto_largo', 8.4, { km: 8.4, g: 8 })],
) // 2.891 m
const perfilReinaCon90 = fx(
  'et_reina_alto_largo',
  reqReina(175),
  175,
  [ond(60, 2), Pu(8, [4, 7], [4, 8]), Ds(10), ond(88, 2.3), Pu(9, [4.5, 7.5], [4.5, 8.5])],
  cimas(68, 175),
  [E(60), C(8, 7.5), D(10), E(88), META('alto_largo', 9, { km: 9, g: 8 })],
) // 2.932 m
// V7 · un descenso_meta cuyo valle se lee 21 km (valle_largo) o 19 km (valle_corto)
const perfilValle21 = fx(
  'et_reina_valle',
  etapa('et_reina_valle', 'reina_valle', ZONAS.pirineos, 185),
  185,
  [L(50), Pu(10, [5, 7], [5, 8]), Ds(10), L(84), Pu(10, [5, 7], [5, 8]), Ds(10), L(11)],
  cimas(60, 164),
  [E(50), P(10, 7.5), D(10), E(84), META('descenso_meta', 31, { km: 10, g: 7.5 })],
)
const perfilValle19 = fx(
  'et_reina_valle',
  etapa('et_reina_valle', 'reina_valle', ZONAS.pirineos, 185),
  185,
  [L(50), Pu(10, [5, 7], [5, 8]), Ds(10), L(86), Pu(10, [5, 7], [5, 8]), Ds(10), L(9)],
  cimas(60, 166),
  [E(50), P(10, 7.5), D(10), E(86), META('descenso_meta', 29, { km: 10, g: 7.5 })],
)
// V8 · reina-150 (hoy media-150, sim/scenarios.ts mediaScenario) contra la canónica de et_reina_alto_largo (plantilla 3 del mapa 07 §5)
const reina150 = fx(
  'et_reina_alto_largo',
  reqReina(150),
  150,
  [L(135), Pu(15, [15, 8])],
  cimas(150),
  [E(135), META('alto_largo', 15, { km: 15, g: 8 })],
)
const reina175_4800 = fx(
  'et_reina_alto_largo',
  reqReina(175),
  175,
  [
    L(52.5),
    Pu(12, [12, 7]),
    Ds(10),
    L(20),
    Pu(17, [17, 7.3]),
    Ds(10),
    L(8),
    Pu(10, [10, 7.8]),
    Ds(10),
    L(9.7),
    Pu(15.8, [15.8, 7.9]),
  ],
  cimas(65, 112, 140, 175),
  [
    E(52.5),
    P(12, 7),
    D(10),
    E(20),
    P(17, 7.3),
    D(10),
    E(8),
    P(10, 7.8),
    D(10),
    E(9.7),
    META('alto_largo', 15.8, { km: 15.8, g: 7.9 }),
  ],
) // 4.109 m sin relleno
// V9 · llana con 2.100 m o con 900 m de relleno, y las rachas
const llana = (segs: Segment[], km = 180) =>
  fx(
    'et_llana',
    etapa('et_llana', 'llana', ZONAS.francia_norte, km),
    km,
    segs,
    [],
    [E(km - 4), META('esprint', 4)],
  )
const perfilLlana2100m = llana([ond(100, 2.1), Lt(80, [50, 2.1], [30, -3.5])]) // 1.050 + 1.050
const perfilLlana900m = llana([ond(100, 0.9), Lt(80, [50, 0.9], [30, -1.5])]) // 450 + 450
const perfilRachaRellano04 = llana([
  ond(100, 1),
  ond(67.2, 1),
  Lt(1.6, [1.2, 6], [0.4, 2]),
  Lt(1.2, [1.2, 6]),
  ond(10, 0.5),
]) // 2,8 km al 5,43 %, acaba a 10
const perfilRachaRellano06 = llana([
  ond(100, 1),
  ond(67, 1),
  Lt(1.8, [1.2, 6], [0.6, 2]),
  Lt(1.2, [1.2, 6]),
  ond(10, 0.5),
]) // dos rachas de 1,2
const perfilRachaA20km = llana([
  ond(100, 1),
  ond(57.2, 1),
  Lt(1.6, [1.2, 6], [0.4, 2]),
  Lt(1.2, [1.2, 6]),
  ond(20, 0.5),
]) // la de 0,4, acaba a 20
// V10 · cabe: segmento corto, muro de una rampa, km y enlace
const perfilSegmento03 = llana([L(100), L(79.7), L(0.3)])
const perfilSegmento05 = llana([L(100), L(79.5), L(0.5)])
/** Una clásica de muros de 200 km en flandes con un solo muro a 188 km; `mot` es el motivo del muro. */
const muros = (muro: Segment, mot: Motif, cima: number) =>
  fx(
    'ud_muros',
    unDia('ud_muros', ZONAS.flandes, 200),
    200,
    [L(188), muro, L(12 - muro.km)],
    cimas(cima),
    [E(188), mot, E(10 - mot.km), META('esprint', 2)],
  )
const perfilMuro04UnaRampa = muros(Pu(0.4, [0.4, 12]), M(0.4, 12), 188) // Paterberg, Pagnuelo
const perfilMuro04DosRampas = muros(Pu(0.4, [0.2, 12], [0.2, 12]), M(0.4, 12), 188)
const perfilKm209_8 = llana([L(150), L(59.8)], 210)
const perfilKm209_95 = llana([L(150), L(59.95)], 210)
const perfilSinEnlace = fx(
  'et_reina_alto_largo',
  reqReina(100),
  100,
  [L(100)],
  [],
  [E(5), P(25, 7), D(10), P(25, 7), D(10), META('alto_largo', 20, { km: 20, g: 7 })],
) // 90 de 100 km no son enlace
// V15 · pendientes: un muro de 1,0 km cuya segunda rampa va al 21 % o al 16 %
const perfilTramo21 = muros(Pu(1, [0.5, 12], [0.5, 21]), M(1, 14), 189)
const perfilTramo16 = muros(Pu(1, [0.5, 12], [0.5, 16]), M(1, 14), 189)

describe.each([
  ['V1', perfilPuertoEnFlandes, perfilPuertoEnAlpes],
  ['V2', perfilAdoquinEnAndes, perfilAdoquinEnFranciaNorte],
  ['V3', perfilTierraEnFlandes, perfilTierraEnItaliaCentro],
  ['V4', perfilPuerto20kmEnColina, perfilPuerto20kmEnAlta],
  ['V5', perfilJura14km, perfilLombardiaSanFermo],
  ['V6', perfilReinaCon84, perfilReinaCon90],
  ['V7', perfilValle21, perfilValle19],
  ['V8', reina150, reina175_4800],
  ['V9', perfilLlana2100m, perfilLlana900m],
  ['V9', perfilRachaRellano04, perfilRachaRellano06],
  ['V10', perfilSegmento03, perfilSegmento05],
  ['V10', perfilMuro04DosRampas, perfilMuro04UnaRampa],
  ['V10', perfilKm209_8, perfilKm209_95],
  ['V15', perfilTramo21, perfilTramo16],
] as const)(
  '%s: un perfil que dispara y otro que no',
  (id: VetoId, dispara: Fixture, calla: Fixture) => {
    it('dispara', () => expect(corre(dispara)?.id).toBe(id))
    it('calla', () => expect(corre(calla)).toBeNull())
  },
)

describe('los detalles', () => {
  it('el detalle empieza por el id y acaba con el esqueleto y la zona', () => {
    expect(corre(perfilPuertoEnFlandes)?.detalle).toBe(
      'V1: motivo puerto en flandes (ud_montana, flandes)',
    )
    expect(corre(perfilJura14km)?.detalle).toMatch(/^V5: \(a\) última cota 14 km > 4\.2/)
    expect(corre(perfilValle21)?.detalle).toMatch(/^V7: finalKindOf valle_largo \(21 km/)
    expect(corre(perfilPuerto20kmEnColina)?.detalle).toMatch(/^V4: \(b\) puerto de 20 km/)
  })
  it('V10(a): el enlace se cuenta sobre colocados, no sobre el perfil', () => {
    expect(corre(perfilSinEnlace)?.detalle).toMatch(/^V10: \(a\) enlace 10\.0 km/)
  })
  it('V9(b): la racha que acaba fuera de los 15 km no cuenta, y la racha cruza segmentos', () => {
    expect(corre(perfilRachaA20km)).toBeNull()
    const rs = rachasDeSubida(perfilRachaRellano04.profile)
    expect(rs).toHaveLength(1)
    const r = rs[0]
    expect(r!.km).toBeCloseTo(2.8, 6)
    expect(r!.g).toBeCloseTo(15.2 / 2.8, 6)
    expect(r!.finKmAMeta).toBeCloseTo(10, 6)
  })
  it('ARCH.veto.llana es la racha de deriveFinishTerrain', () => {
    expect(ARCH.veto.llana.rachaGMin).toBe(STAGE.finishClimbMinGradient)
    expect(ARCH.veto.llana.rellanoKm).toBeCloseTo(STAGE.finishClimbGapBlocks * STAGE.dx, 9)
    expect(ARCH.veto.llana.ventanaKm).toBe(STAGE.finishClimbSearchKm)
  })
  it('ARCH.reina.subidaLejanaKm === STAGE.climbRaceKmToGo: si el motor mueve la ventana, V8b se mueve con él', () => {
    expect(ARCH.reina.subidaLejanaKm).toBe(STAGE.climbRaceKmToGo)
  })
  it('finalKindDe es la tabla de §9.2', () => {
    expect(finalKindDe('repecho')).toBe('alto')
    expect(finalKindDe('muro_meta')).toBe('alto')
    expect(finalKindDe('alto_corto')).toBe('alto')
    expect(finalKindDe('alto_largo')).toBe('alto')
    expect(finalKindDe('cima_cerca')).toBe('cima_cerca')
    expect(finalKindDe('descenso_meta')).toBe('valle_corto')
    expect(finalKindDe('valle')).toBe('valle_largo')
    expect(finalKindDe('esprint')).toBeNull()
    expect(finalKindDe('sector_meta')).toBeNull()
  })
})

// §9.3: el caso v40 con nombre, en las dos zonas que importan.
describe.each([
  ['macizo_central', ZONAS.macizo_central, '1' as RaceClass, 205], // race-jura: la zona que la sección 6 le cura
  ['alpes', ZONAS.alpes, 'WT' as RaceClass, 235], // puertos [12; 25]: el peor caso para V5
] as const)(
  'una carrera de un día no muere en un puerto de 14 km (caso v40, ud_montana en %s)',
  (zona, geo, raceClass, km) => {
    const req = (i: number): StageRequest => ({
      raceId: `test-jura-${zona}-${i}`,
      stageIndex: 1,
      season: 0,
      km,
      role: 'un_dia',
      terrain: 'mountain',
      geo,
      raceClass,
      format: 'un-dia',
      routeSource: 'generado',
      fixed: { skeleton: 'ud_montana' },
    })
    it('2.000 semillas, cero finales en alto, cero degradadas', () => {
      let ultimaMayor = 0
      let muereArriba = 0
      let fueraDeVentana = 0
      let degradadas = 0
      for (let i = 0; i < 2000; i++) {
        const g = generateStage(req(i))
        const ultima = climbSize(g.profile.segments.filter((s) => s.tipo === 'puerto').at(-1)!)
        if (ultima.km > ARCH.meta.unDiaUltimaCota.km[1]) ultimaMayor++
        if (finalKindOf(g.profile) === 'alto') muereArriba++
        const tras = kmAfterLastClimb(g.profile)!
        if (tras < 3 || tras > 17) fueraDeVentana++
        if (g.arch.degradado) degradadas++
        expect(g.kind).toBe('reina') // V6 en las 2.000
      }
      expect(ultimaMayor).toBe(0)
      expect(muereArriba).toBe(0)
      expect(fueraDeVentana).toBe(0)
      expect(degradadas).toBe(0) // ARCH.veto.fallbackMaxShare.calendario
    })
  },
)

it('V5 dispara sobre el perfil literal del generador viejo y calla sobre Lombardía', () => {
  const jura: StageProfile = {
    segments: [
      { km: 196, tipo: 'llano' },
      { km: 14, tipo: 'puerto', tramos: [{ km: 14, g: 8 }] },
    ],
    banners: [{ km: 210, tipo: 'cima' }],
  }
  expect(V5(jura, SKELETONS.ud_montana, reqUnDia, [], 210, [])?.id).toBe('V5')
  const como = SKELETONS.ud_montana.canonico // 245 km; San Fermo 2,7 km al 7,2 % a 5,7
  const lombardia = renderCanonico('ud_montana', ZONAS.italia_norte)
  expect(
    V5(lombardia, SKELETONS.ud_montana, reqUnDia, como, 245, colocarPlantilla(como)),
  ).toBeNull()
})

// §9.4: la lección de reina-150 como regla.
it('reina-150 (hoy media-150) expresada como esqueleto no pasa verify (V8b)', () => {
  const reina150Literal: StageProfile = {
    segments: [
      { km: 135, tipo: 'llano' },
      { km: 15, tipo: 'puerto', tramos: [{ km: 15, g: 8 }] },
    ],
    banners: [{ km: 150, tipo: 'cima' }],
  } // sim/scenarios.ts, mediaScenario (antes reina-150)
  const sk = SKELETONS.et_reina_alto_largo
  expect(stageKindOf(reina150Literal, false).kind).toBe('reina') // el clasificador la deja pasar: 15 ≥ 8,5
  expect(subidaLejanaShare(reina150Literal)).toBe(0)
  expect(V8(reina150Literal, sk, reqReina(150), [], 150, [])).toEqual({
    id: 'V8',
    detalle: expect.stringContaining('lejana 0 %'),
  })
  // La plantilla 3 del mapa 07 §5 (el `canonico` de et_reina_alto_largo) sí pasa.
  expect(
    V8(
      renderCanonico('et_reina_alto_largo', ZONAS.pirineos),
      sk,
      reqReina(175),
      sk.canonico,
      175,
      colocarPlantilla(sk.canonico),
    ),
  ).toBeNull()
})

it('la reina canónica del motor (sim/scenarios.ts, REINA_CANONICA_PROFILE) pasa V8a y V8b', () => {
  const canonica: StageProfile = {
    segments: [
      { km: 50, tipo: 'llano' }, // los dos rompepiernas de apertura, que la gramática no emite
      {
        km: 13,
        tipo: 'puerto',
        tramos: [
          { km: 5.2, g: 6.2 },
          { km: 4.55, g: 7 },
          { km: 3.25, g: 8.2 },
        ],
      },
      { km: 18, tipo: 'descenso', tramos: [{ km: 18, g: -8 }] },
      { km: 65, tipo: 'llano' },
      {
        km: 12,
        tipo: 'puerto',
        tramos: [
          { km: 4.8, g: 6.5 },
          { km: 3.96, g: 7.5 },
          { km: 3.24, g: 9 },
        ],
      },
    ],
    banners: [
      { km: 63, tipo: 'cima' },
      { km: 158, tipo: 'cima' },
    ],
  }
  expect(V8(canonica, SKELETONS.et_reina_alto_largo, reqReina(158), [], 158, [])).toBeNull()
  expect(subidaLejanaShare(canonica)).toBeCloseTo(0.52, 2) // 13 de 25 km de puerto a más de 30 km
})

// V16 sobre filas literales: el predicado puro, sin censo (el censo lo mide sim/routeCensus.test.ts).
const fila = (o: Partial<RouteStats>): RouteStats => ({
  raceId: 'test',
  stageIndex: 1,
  raceClass: 'WT',
  format: 'un-dia',
  country: null,
  zona: 'flandes',
  skeleton: 'ud_muros',
  routeSource: 'generado',
  kind: 'clasica',
  label: 'Classic',
  finalKind: null,
  meta: 'esprint',
  cotaFinalKm: null,
  finishType: 'sprint_masivo',
  km: 200,
  dPlus: 0,
  dPlusBloques: 0,
  nPuertos: 0,
  nMuros: 0,
  longestClimbKm: 0,
  lastClimbKm: null,
  lastClimbG: null,
  kmAfterLastClimb: null,
  climbKmOutsideLast30: 0,
  kmSubidaShare: 0,
  breakAppealEstimado: 0,
  pavesKm: 0,
  nSectores: 0,
  estrellas5: 0,
  nPancartas: 0,
  maxG: 0,
  huella: [],
  intentos: 1,
  degradado: false,
  garantiasClase: 0,
  firmaMotivos: null,
  ...o,
})
it('V16 lee meta, cotaFinalKm, kmAfterLastClimb y pavesKm de la fila', () => {
  expect(V16([fila({ meta: 'muro_meta', cotaFinalKm: 0.8, finishType: 'muro' })])).toBeNull()
  expect(V16([fila({ meta: 'muro_meta', cotaFinalKm: 0.8, finishType: 'puncheur' })])?.id).toBe(
    'V16',
  )
  expect(V16([fila({ meta: 'muro_meta', cotaFinalKm: 1.3, finishType: 'puncheur' })])).toBeNull() // Huy
  expect(V16([fila({ meta: 'esprint', kmAfterLastClimb: 4, finishType: 'puncheur' })])).toBeNull() // Montréal, §4.7
  expect(V16([fila({ meta: 'esprint', kmAfterLastClimb: 13, finishType: 'puncheur' })])?.id).toBe(
    'V16',
  )
  expect(
    V16([fila({ meta: 'esprint', kmAfterLastClimb: 5, finishType: 'sprint_reducido' })]),
  ).toBeNull() // franja (4,3; 5,7)
  expect(
    V16([fila({ meta: 'esprint', kmAfterLastClimb: 13, pavesKm: 9, finishType: 'pave' })]),
  ).toBeNull()
  expect(V16([fila({ meta: 'cima_cerca', cotaFinalKm: 2.7, finishType: 'alto' })])?.id).toBe('V16')
  expect(V16([fila({ meta: 'cima_cerca', cotaFinalKm: 3.2, finishType: 'alto' })])).toBeNull()
  expect(V16([fila({ kind: 'cri', finishType: 'puncheur', kmAfterLastClimb: 12 })])).toBeNull() // crono: fuera
  expect(V16([fila({ routeSource: 'real', meta: null, finishType: 'solitario' })])).toBeNull() // real: fuera
  expect(conjuntoV16(fila({ meta: 'valle' }))).toEqual(['sprint_masivo', 'sprint_reducido'])
  expect(conjuntoV16(fila({ meta: 'sector_meta' }))).toEqual(['pave'])
  expect(conjuntoV16(fila({ meta: 'descenso_meta', pavesKm: 2 }))).toEqual([
    'descenso',
    'sprint_masivo',
    'sprint_reducido',
    'pave',
  ])
})

it('veto.ts no importa valores de sim/ (solo el import type de RouteStats)', () => {
  const src = readFileSync(new URL('./veto.ts', import.meta.url), 'utf8')
  expect(src).not.toMatch(/^import (?!type )[^\n]*from '[^']*\/sim\//m)
})
