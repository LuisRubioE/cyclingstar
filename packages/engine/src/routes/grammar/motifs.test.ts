// El motor es puro y no toca disco (eslint.config.js); este test sí, porque el `it` de importaciones de
// `constants.ts` (§12.14) LEE su fuente como texto. Un test no lo importa nadie: no rompe la pureza.
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ARCH, STAGE } from '../../constants.js'
import { deriveFinishTerrain, finishType, type FinishType } from '../../stage/finish.js'
import { sampleProfile } from '../../stage/sample.js'
import type { Segment } from '../../stage/types.js'
import { CLIMB_MIN_KM, FINAL_KIND_CUTS } from '../finalKind.js'
import { routeRng } from '../profileGen.js'
import { PASS_MIN_KM, QUEEN_MIN_CLIMB_METRES, WALL_MAX_KM } from '../stageKind.js'
import { ZONAS, type GeoSignature } from './geo.js'
import { dPlusDe } from './geometry.js'
import {
  renderMotif,
  validateMotif,
  type MetaKind,
  type Motif,
  type MotifKind,
  type RngFactory,
} from './motifs.js'
import { SKELETONS } from './skeletons.js'

/**
 * LOS MOTIVOS (docs/generador.md sección 4, paso 3 del plan §15.5).
 *
 * `validateMotif` y `renderMotif` sobre 300 instancias por motivo y por meta, los bordes de la sección
 * 4 contra el motor real (`sampleProfile` → `deriveFinishTerrain` → `finishType`: es el ÚNICO test de
 * la gramática, con `routeCensus`, que los llama), la recalibración de `ARCH.reina.rellenoDplusPorKm`
 * y el test de coherencia de `ARCH` de §12.14, escrito por pasos (§15.1): sus cuatro `it` del paso 3,
 * el del paso 4 (referencias al motor y al clasificador), el del paso 5 (`ARCH.km` y `ARCH.veto`) y el
 * del paso 7 en `it.todo`.
 *
 * Reloj propio de 120 s en los `it` que muestrean perfiles (regla 3 de §15.1: ≥ 4× lo que cuestan).
 */
const RELOJ = { timeout: 120_000 }

const rngDe =
  (seed: string): RngFactory =>
  (sub) =>
    routeRng(`${seed}|${sub}`) // routeRng devuelve () => number: la fábrica mete el subflujo en la cadena
const E = (km: number): Motif => ({ kind: 'enlace', km })
const S = (km: number, estrellas = 3): Motif => ({
  kind: 'sector',
  km,
  estrellas,
  firme: 'adoquin',
})
const M = (km: number, g: number): Motif => ({ kind: 'muro', km, g })
const ft = (segs: Segment[]): FinishType =>
  finishType(deriveFinishTerrain(sampleProfile({ segments: segs })), 50)
const kmTotal = (segs: readonly Segment[]): number => segs.reduce((a, s) => a + s.km, 0)
const r1 = (x: number): number => Math.round(x * 10) / 10

describe('validateMotif', () => {
  it('acepta un puerto de 12 km al 7 % en alpes y lo rechaza en flandes', () => {
    const m: Motif = { kind: 'puerto', km: 12, g: 7, forma: 'regular' }
    expect(validateMotif(m, ZONAS.alpes)).toBeNull()
    expect(validateMotif(m, ZONAS.flandes)).toMatch(/puerto/)
  })
  it('rechaza una cota de 8,5 km (hueco [8,0; 9,0]), un muro de 3,1 km y un enlace de 0,5; acepta un enlace de 259,1', () => {
    expect(validateMotif({ kind: 'cota', km: 8.5, g: 6 })).toMatch(/km/)
    expect(validateMotif({ kind: 'muro', km: 3.1, g: 10 })).toMatch(/km/)
    expect(validateMotif({ kind: 'enlace', km: 0.5 })).toMatch(/km/)
    expect(validateMotif({ kind: 'enlace', km: 259.1 })).toBeNull()
  })
  it('cota.g es [4; 8) con el techo excluido; un puerto de 15 km exige altitud media, alta o altiplano', () => {
    expect(validateMotif({ kind: 'cota', km: 5, g: 7.9 })).toBeNull()
    expect(validateMotif({ kind: 'cota', km: 5, g: 8 })).toMatch(/^g/)
    expect(validateMotif({ kind: 'puerto', km: 15, g: 7 }, ZONAS.alpes)).toBeNull()
    expect(validateMotif({ kind: 'puerto', km: 15, g: 7 }, ZONAS.centroeuropa)).toMatch(/puerto/) // colina
  })
  it('rechaza estrellas fuera de sector, un racimo con separaciones fuera de [2; 6], una cadena con dos muros a 0,5 km y un compuesto sin separaciones', () => {
    expect(validateMotif({ kind: 'muro', km: 1, g: 10, estrellas: 3 })).toMatch(/estrellas/)
    const racimo: Motif = {
      kind: 'racimo',
      km: 30,
      hijos: [S(2), S(2), S(2), S(2)],
      separaciones: [7.3, 7.3, 7.4],
    } // 8 + 22 = 30; 7,3 > 6
    expect(validateMotif(racimo, ZONAS.flandes)).toMatch(/separaci/)
    const cadena: Motif = {
      kind: 'cadena',
      km: 2.7,
      hijos: [M(1, 10), M(1.2, 9)],
      separaciones: [0.5],
    } // 0,5 < 1,5
    expect(validateMotif(cadena, ZONAS.flandes)).toMatch(/separaci/)
    expect(
      validateMotif({ kind: 'cadena', km: 2.2, hijos: [M(1, 10), M(1.2, 9)] }, ZONAS.flandes),
    ).toMatch(/separaciones/)
  })
  it('circuito: acepta la vuelta de Montréal y la del critérium; rechaza un cierre de menos de 1,5 km', () => {
    const montreal: Motif = {
      kind: 'circuito',
      km: 12.3,
      vueltas: 17,
      hijos: [M(1.8, 8), M(0.4, 9)],
      separaciones: [1.5, 6.1],
    } // cierre 2,5
    expect(validateMotif(montreal, ZONAS.norteamerica)).toBeNull()
    expect(
      validateMotif({ kind: 'circuito', km: 2.5, vueltas: 22, hijos: [], separaciones: [] }),
    ).toBeNull()
    expect(validateMotif({ ...montreal, separaciones: [1.5, 7.4] }, ZONAS.norteamerica)).toMatch(
      /cierre/,
    ) // 12,3 − 2,2 − 8,9 = 1,2
  })
  it('meta: esprint sin cotaFinal, sector_meta con un sector en hijos[0] y aMeta en [1; 8], muro_meta con km = aproxKm + cotaFinal.km', () => {
    expect(
      validateMotif({ kind: 'meta', meta: 'esprint', km: 4, cotaFinal: { km: 1, g: 5 } }),
    ).toMatch(/cotaFinal/)
    expect(validateMotif({ kind: 'meta', meta: 'sector_meta', km: 3.1 })).toMatch(/hijos/)
    expect(
      validateMotif({ kind: 'meta', meta: 'sector_meta', km: 3.1, hijos: [S(1.0, 1)] }),
    ).toBeNull()
    expect(
      validateMotif({ kind: 'meta', meta: 'sector_meta', km: 2.1, hijos: [S(0.3, 1)] }),
    ).toBeNull() // la de ud_adoquin (§5.4)
    expect(
      validateMotif({ kind: 'meta', meta: 'sector_meta', km: 12, hijos: [S(0.3, 1)] }),
    ).toMatch(/aMeta/) // 11,7 > 8
    expect(
      validateMotif({ kind: 'meta', meta: 'muro_meta', km: 2.0, cotaFinal: { km: 1.3, g: 9.6 } }),
    ).toMatch(/km/)
    expect(
      validateMotif({ kind: 'meta', meta: 'repecho', km: 1, cotaFinal: { km: 1, g: 5 } }),
    ).toBeNull()
    expect(
      validateMotif(
        { kind: 'meta', meta: 'alto_largo', km: 12, cotaFinal: { km: 12, g: 8 } },
        ZONAS.ardenas,
      ),
    ).toMatch(/meta/) // alto_largo solo con finalesAlto 'largo'
    expect(
      validateMotif({ kind: 'meta', meta: 'alto_largo', km: 20, cotaFinal: { km: 20, g: 8 } }),
    ).toMatch(/cotaFinal/) // > 17 km, como mucho al 7 %
    expect(
      validateMotif({
        kind: 'meta',
        meta: 'descenso_meta',
        km: 8.4,
        cotaFinal: { km: 2.7, g: 7.2 },
      }),
    ).toBeNull() // San Fermo, valle 5,7 (§4.7)
    expect(
      validateMotif({ kind: 'meta', meta: 'cima_cerca', km: 7.2, cotaFinal: { km: 2.7, g: 7.2 } }),
    ).toMatch(/valle/) // 4,5 cae en la franja (4,3; 5,7), que no se dibuja
  })
  it('las cuatro carreras de §4.7 caben en ARCH motivo a motivo', () => {
    const fleche: Motif[] = [
      E(100),
      { kind: 'cota', km: 3.0, g: 5.5, forma: 'progresiva' },
      E(34),
      {
        kind: 'circuito',
        km: 30,
        vueltas: 2,
        hijos: [
          { kind: 'muro', km: 1.3, g: 9.6, forma: 'progresiva', firma: true },
          { kind: 'muro', km: 1.3, g: 8.0 },
        ],
        separaciones: [1.5, 24],
      },
      { kind: 'meta', meta: 'muro_meta', km: 3.3, cotaFinal: { km: 1.3, g: 9.6 }, firma: true },
    ]
    for (const m of fleche) expect(validateMotif(m, ZONAS.ardenas), m.kind).toBeNull()
    const roubaixFinal: Motif[] = [
      { kind: 'expuesto', km: 96 },
      {
        kind: 'racimo',
        km: 27.3,
        hijos: [S(1.8), S(2.5), S(1.0, 2), S(2.1, 5), S(1.1, 2), S(1.4, 2)],
        separaciones: [4, 4, 3.5, 2, 3.9],
      },
      { kind: 'meta', meta: 'sector_meta', km: 1.4, hijos: [S(0.3, 1)] },
    ]
    for (const m of roubaixFinal) expect(validateMotif(m, ZONAS.francia_norte), m.kind).toBeNull()
    const lombardia: Motif[] = [
      { kind: 'puerto', km: 9.0, g: 6.2, forma: 'progresiva' },
      { kind: 'puerto', km: 13.0, g: 6.6, forma: 'irregular' },
      { kind: 'cota', km: 4.2, g: 7.0, forma: 'progresiva' },
    ]
    for (const m of lombardia) expect(validateMotif(m, ZONAS.italia_norte), m.kind).toBeNull()
  })
})

// --- Las 300 instancias por motivo y por meta, sorteadas dentro de ARCH ---------------------------

type Rango = readonly [number, number]
/** Uniforme sobre la rejilla de 0,1 de `[lo; hi]`, extremos incluidos. */
const U = (r: () => number, [lo, hi]: Rango): number =>
  r1(lo + Math.floor(r() * (Math.round((hi - lo) * 10) + 1)) / 10)
/** Entero uniforme de `[lo; hi]`. */
const N = (r: () => number, [lo, hi]: Rango): number => lo + Math.floor(r() * (hi - lo + 1))
const elige = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!
const FORMAS = ['regular', 'progresiva', 'irregular'] as const
const A = ARCH.motivo

const cota = (r: () => number): Motif => ({
  kind: 'cota',
  km: U(r, A.cota.km),
  g: U(r, [A.cota.g[0], A.cota.g[1] - 0.1]), // techo excluido
  forma: elige(r, FORMAS),
})
const muro = (r: () => number, adoquin = false): Motif => ({
  kind: 'muro',
  km: U(r, A.muro.km),
  g: U(r, A.muro.g),
  ...(adoquin ? { adoquin: true } : {}),
})
const sector = (r: () => number, firme: 'adoquin' | 'tierra' = 'adoquin'): Motif => ({
  kind: 'sector',
  km: U(r, A.sector.km),
  estrellas: N(r, A.sector.estrellas),
  firme,
})
const sumaKm = (ms: readonly Motif[], seps: readonly number[]): number =>
  r1(ms.reduce((a, m) => a + m.km, 0) + seps.reduce((a, b) => a + b, 0))

/** Reintenta el sorteo con la MISMA corriente hasta que cabe (determinista); falla si no cabe nunca. */
function hasta(r: () => number, sortea: (r: () => number) => Motif | null): Motif {
  for (let k = 0; k < 10_000; k++) {
    const m = sortea(r)
    if (m !== null) return m
  }
  throw new Error('el sorteo del test no cabe en ARCH')
}

/** Una instancia del motivo `kind`, dentro de ARCH, con la zona compatible de §4.5. */
function instancia(kind: MotifKind, r: () => number, i: number): { m: Motif; geo: GeoSignature } {
  switch (kind) {
    case 'enlace':
      return { m: { kind, km: U(r, A.enlace.km) }, geo: ZONAS.generico }
    case 'expuesto':
      return { m: { kind, km: U(r, A.expuesto.km) }, geo: ZONAS.generico }
    case 'tendida':
      return { m: { kind, km: U(r, A.tendida.km), g: U(r, A.tendida.g) }, geo: ZONAS.meseta }
    case 'descenso':
      return { m: { kind, km: U(r, A.descenso.km), g: U(r, A.descenso.g) }, geo: ZONAS.generico }
    case 'cota':
      return { m: cota(r), geo: ZONAS.generico }
    case 'puerto':
      return {
        m: { kind, km: U(r, A.puerto.km), g: U(r, A.puerto.g), forma: elige(r, FORMAS) },
        geo: ZONAS.alpes,
      }
    case 'muro':
      return { m: muro(r, i % 2 === 1), geo: ZONAS.flandes }
    case 'sector':
      return i % 2 === 0
        ? { m: sector(r), geo: ZONAS.flandes }
        : { m: sector(r, 'tierra'), geo: ZONAS.italia_centro }
    case 'cadena': {
      const hijos = Array.from({ length: N(r, A.cadena.hijos) }, () =>
        r() < 0.5 ? cota(r) : muro(r),
      )
      const separaciones = hijos.slice(1).map(() => U(r, A.cadena.enlace))
      return {
        m: { kind, km: sumaKm(hijos, separaciones), hijos, separaciones },
        geo: ZONAS.ardenas,
      }
    }
    case 'racimo':
      return {
        m: hasta(r, (r) => {
          const hijos = Array.from({ length: N(r, A.racimo.sectores) }, () => sector(r))
          const separaciones = hijos.slice(1).map(() => U(r, A.racimo.separacion))
          const km = sumaKm(hijos, separaciones)
          return km >= A.racimo.km[0] && km <= A.racimo.km[1]
            ? { kind, km, hijos, separaciones }
            : null
        }),
        geo: ZONAS.francia_norte,
      }
    case 'circuito':
      // italia_centro tiene cota, muro y tierra: caben los cuatro hijos posibles de una vuelta.
      return {
        m: hasta(r, (r) => {
          const hijos = Array.from({ length: N(r, [0, 3]) }, (): Motif => {
            const k = elige(r, ['cota', 'muro', 'sector', 'tendida'] as const)
            if (k === 'cota') return cota(r)
            if (k === 'muro') return muro(r)
            if (k === 'sector') return sector(r, 'tierra')
            return { kind: 'tendida', km: U(r, A.tendida.km), g: U(r, A.tendida.g) }
          })
          const separaciones = hijos.map(() => U(r, [ARCH.colocacion.enlaceMinimo, 6]))
          const km = r1(sumaKm(hijos, separaciones) + U(r, [ARCH.colocacion.enlaceMinimo, 6]))
          const kmHijos = sumaKm(hijos, [])
          const cabe =
            km >= A.circuito.kmVuelta[0] &&
            km <= A.circuito.kmVuelta[1] &&
            kmHijos <= A.circuito.maxHijosShare * km
          return cabe ? { kind, km, vueltas: N(r, A.circuito.vueltas), hijos, separaciones } : null
        }),
        geo: ZONAS.italia_centro,
      }
    case 'meta':
      return instanciaMeta(elige(r, METAS), r, i)
  }
}

const METAS: readonly MetaKind[] = [
  'esprint',
  'repecho',
  'muro_meta',
  'alto_corto',
  'alto_largo',
  'cima_cerca',
  'descenso_meta',
  'valle',
  'sector_meta',
]
const MOTIVOS: readonly MotifKind[] = [
  'enlace',
  'expuesto',
  'tendida',
  'descenso',
  'cota',
  'puerto',
  'muro',
  'cadena',
  'sector',
  'racimo',
  'circuito',
  'meta',
]
const VALLE: Record<'cima_cerca' | 'descenso_meta' | 'valle', Rango> = {
  cima_cerca: ARCH.meta.cimaCerca.valle,
  descenso_meta: ARCH.meta.descensoMeta.valle,
  valle: ARCH.meta.valle.valle,
}

/**
 * Una meta del `MetaKind`, dentro de ARCH. En las tres con valle, la `cotaFinal` alterna entre la
 * última cota de un día (`unDiaUltimaCota`) y la columna Meta de un esqueleto de etapa (§4.3 nota 3:
 * el puerto de `et_reina_cima_cerca` [9; 16] × [6; 9] y la cota de `et_media_valle` [2,5; 8] × [4; 7]).
 */
function instanciaMeta(
  meta: MetaKind,
  r: () => number,
  i: number,
): { m: Motif; geo: GeoSignature } {
  const Mt = ARCH.meta
  const conCota = (km: Rango, g: Rango, total: (ck: number) => number) => {
    const cotaFinal = { km: U(r, km), g: U(r, g) }
    return { kind: 'meta' as const, meta, km: r1(total(cotaFinal.km)), cotaFinal }
  }
  switch (meta) {
    case 'esprint':
      return { m: { kind: 'meta', meta, km: U(r, [1, 20]) }, geo: ZONAS.generico }
    case 'repecho':
      return { m: conCota(Mt.repecho.km, Mt.repecho.g, (ck) => ck), geo: ZONAS.flandes }
    case 'muro_meta':
      return {
        m: conCota(Mt.muro.km, Mt.muro.g, (ck) => Mt.muro.aproxKm + ck),
        geo: ZONAS.ardenas,
      }
    case 'alto_corto':
      return { m: conCota(Mt.altoCorto.km, Mt.altoCorto.g, (ck) => ck), geo: ZONAS.generico }
    case 'alto_largo': {
      const m = conCota(Mt.altoLargo.km, Mt.altoLargo.g, (ck) => ck)
      if (m.cotaFinal.km > Mt.altoLargo.kmSuaveDesde)
        m.cotaFinal.g = Math.min(m.cotaFinal.g, Mt.altoLargo.gMaxSiMasDe17)
      return { m, geo: ZONAS.alpes }
    }
    case 'cima_cerca':
    case 'descenso_meta':
    case 'valle': {
      const valle = U(r, VALLE[meta])
      const [km, g]: [Rango, Rango] =
        i % 2 === 0
          ? [Mt.unDiaUltimaCota.km, Mt.unDiaUltimaCota.g]
          : meta === 'cima_cerca'
            ? [
                [9, 16],
                [6, 9],
              ]
            : [
                [2.5, 8],
                [4, 7],
              ]
      return { m: conCota(km, g, (ck) => ck + valle), geo: ZONAS.generico }
    }
    case 'sector_meta': {
      const s = sector(r)
      return {
        m: { kind: 'meta', meta, km: r1(s.km + U(r, Mt.sectorMeta.aMeta)), hijos: [s] },
        geo: ZONAS.francia_norte,
      }
    }
  }
}

/** Las comprobaciones comunes a toda instancia (§15.5, primer punto). */
function compruebaRendido(m: Motif, geo: GeoSignature, semilla: string): Segment[] {
  expect(validateMotif(m, geo), `${semilla}: ${JSON.stringify(m)}`).toBeNull()
  const segs = renderMotif(m, rngDe(semilla), geo)
  expect(kmTotal(segs), `${semilla}: Σ km`).toBeCloseTo(m.km * (m.vueltas ?? 1), 1)
  for (const s of segs) {
    expect(s.tipo, semilla).not.toBe('rompepiernas') // decisión 2
    if (s.tramos === undefined) continue
    const sumaTramos = s.tramos.reduce((a, t) => a + t.km, 0)
    expect(Math.abs(s.km - sumaTramos), `${semilla}: ${s.tipo} km ≠ Σ tramos`).toBeLessThan(0.005)
    for (const t of s.tramos) {
      expect(t.g, semilla).toBeLessThanOrEqual(20)
      expect(t.g, semilla).toBeGreaterThanOrEqual(-14)
    }
  }
  return segs
}

describe('300 instancias por motivo y por meta, dentro de ARCH', () => {
  for (const kind of MOTIVOS.filter((k) => k !== 'meta'))
    it(
      `${kind}: validateMotif acepta, Σ km = km al 0,1, km = Σ tramos, g en [−14; 20], sin rompepiernas`,
      RELOJ,
      () => {
        for (let i = 0; i < 300; i++) {
          const { m, geo } = instancia(kind, routeRng(`test|${kind}|${i}|sorteo`), i)
          const segs = compruebaRendido(m, geo, `test|${kind}|${i}`)
          if (i < 10) expect(renderMotif(m, rngDe(`test|${kind}|${i}`), geo)).toEqual(segs) // puro
        }
      },
    )
  for (const meta of METAS)
    it(
      `meta ${meta}: validateMotif acepta, Σ km = km al 0,1, km = Σ tramos, g en [−14; 20], sin rompepiernas`,
      RELOJ,
      () => {
        for (let i = 0; i < 300; i++) {
          const { m, geo } = instanciaMeta(meta, routeRng(`test|${meta}|${i}|sorteo`), i)
          compruebaRendido(m, geo, `test|${meta}|${i}`)
        }
      },
    )
})

describe('renderMotif', () => {
  it('muro: 1 rampa si km < 1,0 y 2 si no; ninguna fuera de [gMin 8; gMax 16]; un solo segmento puerto; km = Σ tramos en 300 de 300', () => {
    for (let i = 0; i < 300; i++) {
      const r = routeRng(`test|muro|${i}|sorteo`)
      const km = r1(0.4 + Math.round(r() * 21) / 10),
        g = r1(8 + Math.round(r() * 80) / 10) // km en [0,4; 2,5] = ARCH.motivo.muro.km
      const segs = renderMotif({ kind: 'muro', km, g }, rngDe(`test|muro|${i}`), ZONAS.flandes)
      expect(segs).toHaveLength(1)
      const seg = segs[0]!
      expect(seg.tipo).toBe('puerto')
      expect(seg.tramos).toHaveLength(km < 1 ? 1 : 2)
      for (const t of seg.tramos!) {
        expect(t.g).toBeGreaterThanOrEqual(ARCH.motivo.muro.gMin)
        expect(t.g).toBeLessThanOrEqual(ARCH.motivo.muro.gMax)
      }
      expect(seg.tramos!.reduce((s, t) => s + t.km, 0)).toBeCloseTo(seg.km, 1)
      expect(seg.km).toBeCloseTo(km, 1)
    }
  })
  it('muro adoquinado: sigue siendo puerto, con el mismo dibujo que sin adoquín', () => {
    for (let i = 0; i < 50; i++) {
      const m: Motif = { kind: 'muro', km: 1.4, g: 11 }
      const liso = renderMotif(m, rngDe(`test|muroAdoquin|${i}`), ZONAS.flandes)
      const adoquinado = renderMotif(
        { ...m, adoquin: true },
        rngDe(`test|muroAdoquin|${i}`),
        ZONAS.flandes,
      )
      expect(adoquinado.every((s) => s.tipo === 'puerto')).toBe(true)
      expect(adoquinado).toEqual(liso)
    }
  })
  it('sector: el de adoquín lleva sus estrellas; el de tierra se rinde paves de 2 o 3 estrellas', () => {
    for (let e = 1; e <= 5; e++) {
      const adoquin = renderMotif(S(1.5, e), rngDe('test|sector'), ZONAS.flandes)
      expect(adoquin).toEqual([{ km: 1.5, tipo: 'paves', estrellas: e }])
      const tierra = renderMotif(
        { kind: 'sector', km: 1.5, estrellas: e, firme: 'tierra' },
        rngDe('test|sector'),
        ZONAS.italia_centro,
      )
      expect(tierra).toHaveLength(1)
      expect(tierra[0]!.tipo).toBe('paves')
      expect([2, 3]).toContain(tierra[0]!.estrellas)
    }
  })
  it('tendida y expuesto: llano con tramos; la tendida no tiene ningún bloque de subida', () => {
    const segs = renderMotif(
      { kind: 'tendida', km: 20, g: 2.5 },
      rngDe('test|tendida|0'),
      ZONAS.meseta,
    )
    expect(segs).toHaveLength(1)
    expect(segs.every((s) => s.tipo === 'llano' && (s.tramos?.length ?? 0) >= 2)).toBe(true)
    const blocks = sampleProfile({ segments: segs })
    expect(blocks.every((b) => b.tipo !== 'subida')).toBe(true)
    expect(blocks.some((b) => b.g >= 1.8)).toBe(true) // pero la pendiente sí se lee
    const expuesto = renderMotif(
      { kind: 'expuesto', km: 35 },
      rngDe('test|expuesto|0'),
      ZONAS.flandes,
    )
    expect(expuesto.every((s) => s.tipo === 'llano' && s.tramos !== undefined)).toBe(true)
    for (const s of expuesto)
      for (const t of s.tramos!) expect(Math.abs(t.g)).toBeLessThanOrEqual(ARCH.motivo.expuesto.amp)
  })
  it('enlace: ningún tramo alcanza el 3 % que deriveFinishTerrain lee como cota', () => {
    for (let i = 0; i < 300; i++) {
      const segs = renderMotif(E(30), rngDe(`test|enlace|${i}`), ZONAS.ardenas)
      expect(Math.max(...segs.flatMap((s) => s.tramos!.map((t) => t.g)))).toBeLessThan(
        STAGE.finishClimbMinGradient,
      )
    }
  })
  it('puerto irregular: una rampa de rampaIrregular en la mitad alta; regular: las mismas rampas que progresiva, barajadas', () => {
    const { km: rk, g: rg } = ARCH.motivo.puerto.rampaIrregular
    for (let i = 0; i < 100; i++) {
      const base: Motif = { kind: 'puerto', km: 13, g: 7 }
      const [irr] = renderMotif(
        { ...base, forma: 'irregular' },
        rngDe(`test|irr|${i}`),
        ZONAS.alpes,
      )
      const rampas = irr!.tramos!.filter((t) => t.g >= rg[0] && t.km >= rk[0] && t.km <= rk[1])
      expect(rampas.length, `semilla ${i}`).toBeGreaterThanOrEqual(1)
      const idx = irr!.tramos!.indexOf(rampas.at(-1)!)
      expect(idx).toBeGreaterThanOrEqual(Math.floor(irr!.tramos!.length / 2))
      const [prog] = renderMotif(
        { ...base, forma: 'progresiva' },
        rngDe(`test|irr|${i}`),
        ZONAS.alpes,
      )
      const [reg] = renderMotif({ ...base, forma: 'regular' }, rngDe(`test|irr|${i}`), ZONAS.alpes)
      const orden = (s: Segment) => s.tramos!.map((t) => `${t.km}|${t.g}`).sort()
      expect(orden(reg!)).toEqual(orden(prog!))
    }
  })
  it('circuito: 9 vueltas rinden 9 veces el MISMO Segment[] de la vuelta, y Σ km = vueltas × km de vuelta', () => {
    const vuelta: Motif = {
      kind: 'circuito',
      km: 14,
      vueltas: 9,
      hijos: [M(1.1, 11)],
      separaciones: [2],
    } // cierre 10,9
    const segs = renderMotif(vuelta, rngDe('test|circuito|0'), ZONAS.flandes)
    const muros = segs.filter((s) => s.tipo === 'puerto')
    expect(muros).toHaveLength(9)
    expect(muros[6]!.tramos).toEqual(muros[0]!.tramos) // la vuelta 7 tiene las mismas rampas que la 1
    expect(segs.length % 9).toBe(0)
    const n = segs.length / 9
    for (let v = 1; v < 9; v++) expect(segs.slice(v * n, (v + 1) * n)).toEqual(segs.slice(0, n))
    expect(segs[n]).not.toBe(segs[0]) // copias profundas, no la misma referencia
    expect(kmTotal(segs)).toBeCloseTo(126, 1)
    // La semilla de detalle del hijo es rng('hijo0'): el muro de la vuelta es el de un muro suelto.
    const suelto = renderMotif(
      M(1.1, 11),
      (sub) => rngDe('test|circuito|0')(`hijo0${sub}`),
      ZONAS.flandes,
    )
    expect(muros[0]).toEqual(suelto[0])
  })
  it('cadena y racimo: cambiar un hijo no mueve el dibujo de los demás', () => {
    const cadena = (g2: number): Motif => ({
      kind: 'cadena',
      km: 1.2 + 3 + 1.5 + 2 + 1.0,
      hijos: [M(1.2, 10), M(1.5, g2), M(1.0, 12)],
      separaciones: [3, 2],
    })
    const a = renderMotif(cadena(9), rngDe('test|cadena|0'), ZONAS.flandes)
    const b = renderMotif(cadena(13), rngDe('test|cadena|0'), ZONAS.flandes)
    const puertos = (s: Segment[]) => s.filter((x) => x.tipo === 'puerto')
    expect(puertos(a)[0]).toEqual(puertos(b)[0])
    expect(puertos(a)[2]).toEqual(puertos(b)[2])
    expect(puertos(a)[1]).not.toEqual(puertos(b)[1])
    expect(a.filter((x) => x.tipo === 'llano')).toEqual(b.filter((x) => x.tipo === 'llano'))
  })
  it('descenso canónico: clamp(len·g·10/55, 2, 10)', () => {
    expect(ARCH.motivo.descenso.kmPorDesnivel).toEqual({ perdidaPorKm: 55, kmMin: 2, kmMax: 10 })
    // 13,8 × 8,1 → 20,3 → 10 ; 5 × 5,5 → 5,0 ; 2,5 × 4 → 1,8 → 2 ; 2,7 × 7,2 → 3,5
    const sanFermo = renderMotif(
      { kind: 'meta', meta: 'descenso_meta', km: 8.4, cotaFinal: { km: 2.7, g: 7.2 } },
      rngDe('test|sanFermo'),
      ZONAS.italia_norte,
    )
    expect(sanFermo[0]!.tipo).toBe('puerto')
    expect(sanFermo[1]!.tipo).toBe('descenso')
    expect(sanFermo[1]!.km).toBeCloseTo(3.5, 1) // 3,5 km de bajada canónica y 2,2 de llano (§4.3)
    expect(kmTotal(sanFermo.slice(2))).toBeCloseTo(2.2, 1)
  })
  it('finishMuroMaxKm es el muroMaxKm del motor y muro.gMin es wallMinGradient', () => {
    expect(ARCH.meta.muro.finishMuroMaxKm).toBe(STAGE.muroMaxKm)
    expect(ARCH.motivo.muro.gMin).toBe(STAGE.wallMinGradient)
  })
})

/**
 * LA EJECUTABILIDAD (riesgo 7, §15.5): cada meta, detrás de un enlace, rendida, muestreada y leída por
 * `finishType`, da el final que la sección 4 promete a V16. El muro en meta es el riesgo marcado del
 * paso: `deriveFinishTerrain` funde rachas con `finishClimbGapBlocks` 5 y `finishType` comprueba `alto`
 * antes que `muro` (finish.ts), y el diseño lo evita con una aproximación sin bloques al 3 % y `gMin`.
 */
describe('las metas contra el motor: finishType en 300 de 300', () => {
  it(
    'muro_meta: finishType muro en 300 de 300 con cotaFinal ≤ 1,0 km y puncheur en 300 de 300 por encima',
    RELOJ,
    () => {
      for (let i = 0; i < 600; i++) {
        const r = routeRng(`test|muro_meta|${i}|sorteo`)
        const km = r1(i < 300 ? 0.5 + Math.round(r() * 5) / 10 : 1.1 + Math.round(r() * 11) / 10)
        const g = r1(8 + Math.round(r() * 80) / 10)
        const meta: Motif = {
          kind: 'meta',
          meta: 'muro_meta',
          km: km + ARCH.meta.muro.aproxKm,
          cotaFinal: { km, g },
        }
        const segs = [
          ...renderMotif(E(60), rngDe(`test|muro_meta|${i}|enlace`), ZONAS.ardenas),
          ...renderMotif(meta, rngDe(`test|muro_meta|${i}|meta`), ZONAS.ardenas),
        ]
        expect(ft(segs), `muro ${km} km al ${g} %`).toBe(
          km <= ARCH.meta.muro.finishMuroMaxKm ? 'muro' : 'puncheur',
        )
      }
    },
  )
  it('repecho → puncheur en 300 de 300 (rampas en [gMin 4; gMax 7,9])', RELOJ, () => {
    for (let i = 0; i < 300; i++) {
      const r = routeRng(`test|repecho|${i}|sorteo`)
      const km = r1(1 + Math.round(r() * 19) / 10),
        g = r1(5 + Math.round(r() * 20) / 10)
      const segs = [
        ...renderMotif(E(40), rngDe(`test|repecho|${i}|enlace`), ZONAS.flandes),
        ...renderMotif(
          { kind: 'meta', meta: 'repecho', km, cotaFinal: { km, g } },
          rngDe(`test|repecho|${i}|meta`),
          ZONAS.flandes,
        ),
      ]
      const ultimo = segs.at(-1)!
      for (const t of ultimo.tramos!) {
        expect(t.g).toBeGreaterThanOrEqual(ARCH.meta.repecho.gMin)
        expect(t.g).toBeLessThanOrEqual(ARCH.meta.repecho.gMax)
      }
      expect(ft(segs), `repecho ${km} km al ${g} %`).toBe('puncheur')
    }
  })
  it('alto_corto y alto_largo → alto en 300 de 300', RELOJ, () => {
    for (const meta of ['alto_corto', 'alto_largo'] as const)
      for (let i = 0; i < 300; i++) {
        const { m, geo } = instanciaMeta(meta, routeRng(`test|ft|${meta}|${i}|sorteo`), i)
        const segs = [
          ...renderMotif(E(60), rngDe(`test|ft|${meta}|${i}|enlace`), geo),
          ...renderMotif(m, rngDe(`test|ft|${meta}|${i}|meta`), geo),
        ]
        expect(ft(segs), `${meta} ${JSON.stringify(m.cotaFinal)}`).toBe('alto')
      }
  })
  it('cima_cerca → puncheur en 300 de 300 (alto admitido solo con cotaFinal ≥ 3 km)', RELOJ, () => {
    for (let i = 0; i < 300; i++) {
      const { m, geo } = instanciaMeta('cima_cerca', routeRng(`test|ft|cima_cerca|${i}|sorteo`), i)
      const segs = [
        ...renderMotif(E(60), rngDe(`test|ft|cima_cerca|${i}|enlace`), geo),
        ...renderMotif(m, rngDe(`test|ft|cima_cerca|${i}|meta`), geo),
      ]
      const admitidos: FinishType[] = m.cotaFinal!.km >= 3 ? ['puncheur', 'alto'] : ['puncheur']
      expect(admitidos, `cima_cerca ${JSON.stringify(m)}`).toContain(ft(segs))
    }
  })
  it('descenso_meta → {descenso, sprint_*} y valle → {sprint_*} en 300 de 300', RELOJ, () => {
    const promesa = {
      descenso_meta: ['descenso', 'sprint_masivo', 'sprint_reducido'],
      valle: ['sprint_masivo', 'sprint_reducido'],
    } as const
    for (const meta of ['descenso_meta', 'valle'] as const)
      for (let i = 0; i < 300; i++) {
        const { m, geo } = instanciaMeta(meta, routeRng(`test|ft|${meta}|${i}|sorteo`), i)
        const segs = [
          ...renderMotif(E(60), rngDe(`test|ft|${meta}|${i}|enlace`), geo),
          ...renderMotif(m, rngDe(`test|ft|${meta}|${i}|meta`), geo),
        ]
        const leido: FinishType = ft(segs)
        expect(promesa[meta] as readonly FinishType[], `${meta} ${JSON.stringify(m)}`).toContain(
          leido,
        )
      }
  })
  it(
    'esprint: sprint_masivo si la última cota corona a > 5,7 km; puncheur si corona a ≤ 5 km',
    RELOJ,
    () => {
      for (let i = 0; i < 300; i++) {
        const r = routeRng(`test|esprint|${i}|sorteo`)
        const lejos = i < 150
        const valle = r1(lejos ? 5.7 + Math.round(r() * 93) / 10 : 1 + Math.round(r() * 40) / 10)
        const segs = [
          ...renderMotif(E(40), rngDe(`test|esprint|${i}|enlace`), ZONAS.flandes),
          ...renderMotif(M(0.8, 10), rngDe(`test|esprint|${i}|muro`), ZONAS.flandes),
          ...renderMotif(
            { kind: 'meta', meta: 'esprint', km: valle },
            rngDe(`test|esprint|${i}|meta`),
            ZONAS.flandes,
          ),
        ]
        expect(ft(segs), `esprint a ${valle} km del muro`).toBe(
          lejos ? 'sprint_masivo' : 'puncheur',
        )
      }
    },
  )
  it(
    'sector_meta → pave cuando el racimo anterior deja ≥ 3 km de paves en los últimos 30 km',
    RELOJ,
    () => {
      const racimo: Motif = {
        kind: 'racimo',
        km: 24,
        hijos: [S(2), S(1.5), S(2.5), S(3)],
        separaciones: [5, 5, 5],
      } // paves 9
      const meta: Motif = { kind: 'meta', meta: 'sector_meta', km: 6, hijos: [S(1.5, 1)] } // sector y 4,5 km a meta
      for (let i = 0; i < 300; i++) {
        const segs = [
          ...renderMotif(E(60), rngDe(`test|sector_meta|${i}|enlace`), ZONAS.francia_norte),
          ...renderMotif(racimo, rngDe(`test|sector_meta|${i}|racimo`), ZONAS.francia_norte),
          ...renderMotif(E(2), rngDe(`test|sector_meta|${i}|e2`), ZONAS.francia_norte),
          ...renderMotif(meta, rngDe(`test|sector_meta|${i}|meta`), ZONAS.francia_norte),
        ]
        expect(ft(segs)).toBe('pave') // 92 km; en los últimos 30 (del 62 al 92): 1,5 + 2,5 + 3 + 1,5 = 8,5 km de paves, fracción 0,28 ≥ 0,1
      }
    },
  )
})

describe('ARCH.reina.rellenoDplusPorKm es la medida del relleno (recalibración del paso 3, §15.5)', () => {
  it('mediana de dPlusDe por km de 1.000 enlaces por zona, redondeada al 0,5', RELOJ, () => {
    const porKm: number[] = []
    for (const [nombre, geo] of Object.entries(ZONAS))
      for (let i = 0; i < 1000; i++) {
        const km = U(routeRng(`test|relleno|${nombre}|${i}|km`), ARCH.motivo.enlace.km)
        const segs = renderMotif(E(km), rngDe(`test|relleno|${nombre}|${i}`), geo)
        porKm.push(dPlusDe({ segments: segs }) / km)
      }
    porKm.sort((a, b) => a - b)
    const mitad = porKm.length / 2
    const mediana =
      porKm.length % 2 === 1 ? porKm[Math.floor(mitad)]! : (porKm[mitad - 1]! + porKm[mitad]!) / 2
    expect(mediana).toBeGreaterThan(2.5) // medida al escribirlo: 2,86 m/km
    expect(mediana).toBeLessThan(3.25)
    expect(Math.round(mediana * 2) / 2).toBe(ARCH.reina.rellenoDplusPorKm)
  })
  it(
    'y zona a zona es rellenoPorAmplitud × amplitud: la mediana por zona, a ± 0,1 m/km por punto',
    RELOJ,
    () => {
      for (const [nombre, geo] of Object.entries(ZONAS)) {
        const porKm: number[] = []
        for (let i = 0; i < 201; i++) {
          const km = U(routeRng(`test|rellenoZona|${nombre}|${i}|km`), ARCH.motivo.enlace.km)
          const segs = renderMotif(E(km), rngDe(`test|rellenoZona|${nombre}|${i}`), geo)
          porKm.push(dPlusDe({ segments: segs }) / km)
        }
        porKm.sort((a, b) => a - b)
        const porAmplitud = porKm[100]! / geo.amplitud // medido al escribirlo: de 3,25 a 3,32
        expect(Math.abs(porAmplitud - ARCH.reina.rellenoPorAmplitud), nombre).toBeLessThanOrEqual(
          0.1,
        )
      }
    },
  )
})

describe('ARCH es coherente con routes/ y STAGE', () => {
  it('cota y puerto rodean PASS_MIN_KM con margenClaseKm', () => {
    expect(ARCH.motivo.cota.km[1] + ARCH.veto.margenClaseKm).toBeLessThanOrEqual(PASS_MIN_KM)
    expect(ARCH.motivo.puerto.km[0] - ARCH.veto.margenClaseKm).toBeGreaterThanOrEqual(PASS_MIN_KM)
    expect(ARCH.meta.altoLargo.km[0]).toBe(ARCH.motivo.puerto.km[0])
    expect(ARCH.meta.altoCorto.km[1] + ARCH.veto.margenClaseKm).toBeLessThanOrEqual(PASS_MIN_KM)
  })
  it('muro, cota y repecho respetan los umbrales del clasificador y del motor', () => {
    expect(ARCH.motivo.muro.km[1]).toBe(STAGE.wallMaxKm) // 2,5: longitud máxima de muro de SPEC 6.4 (isWall)
    expect(ARCH.motivo.muro.km[1]).toBeLessThanOrEqual(WALL_MAX_KM) // 3: la frontera clásica/media queda por encima
    expect(ARCH.motivo.muro.km[1]).toBeLessThanOrEqual(WALL_MAX_KM - 0.1) // 2,9: la regla 3 de garantizaClase (§8.9) nunca recorta un muro
    expect(ARCH.motivo.muro.km[0]).toBe(STAGE.finishClimbMinKm)
    expect(ARCH.motivo.muro.g[0]).toBe(STAGE.wallMinGradient)
    expect(ARCH.motivo.muro.gMin).toBe(STAGE.wallMinGradient)
    expect(ARCH.motivo.cota.g[1]).toBeLessThanOrEqual(STAGE.wallMinGradient) // 8: una cota nunca se lee como muro
    expect(ARCH.motivo.cota.km[0]).toBe(ARCH.motivo.muro.km[1]) // muro o cota, nunca las dos
    expect(ARCH.meta.muro.km[1]).toBeLessThanOrEqual(ARCH.motivo.muro.km[1])
    expect(ARCH.meta.muro.finishMuroMaxKm).toBe(STAGE.muroMaxKm)
    expect(ARCH.meta.repecho.km[1]).toBeLessThan(STAGE.finishAltoMinKm)
    expect(ARCH.meta.repecho.gMax).toBeLessThan(STAGE.wallMinGradient)
    expect(ARCH.meta.muro.aproxAmp).toBeLessThan(STAGE.finishClimbMinGradient)
    expect(ARCH.motivo.enlace.ampMax).toBeLessThan(STAGE.finishClimbMinGradient)
    expect(ARCH.motivo.expuesto.amp).toBeLessThan(ARCH.motivo.enlace.ampMax)
  })
  it('los valles llevan margenValleKm sobre FINAL_KIND_CUTS', () => {
    const m = ARCH.veto.margenValleKm
    expect(ARCH.meta.cimaCerca.valle[0]).toBeGreaterThanOrEqual(FINAL_KIND_CUTS.alto + m)
    expect(ARCH.meta.cimaCerca.valle[1]).toBeLessThanOrEqual(FINAL_KIND_CUTS.cimaCerca - m)
    expect(ARCH.meta.descensoMeta.valle[0]).toBeGreaterThanOrEqual(FINAL_KIND_CUTS.cimaCerca + m)
    expect(ARCH.meta.descensoMeta.valle[1]).toBeLessThanOrEqual(FINAL_KIND_CUTS.valleCorto - m)
    expect(ARCH.meta.valle.valle[0]).toBeGreaterThanOrEqual(FINAL_KIND_CUTS.valleCorto + m)
  })
  it('constants.ts no importa valores de routes/grammar/ (solo tipos) ni reexporta sus tablas', () => {
    const src = readFileSync(new URL('../../constants.ts', import.meta.url), 'utf8')
    const deGrammar = src.match(/^(import|export) .* from '\.\/routes\/grammar\/.*'$/gm) ?? []
    for (const linea of deGrammar) expect(linea.startsWith('import type ')).toBe(true)
  })
  // Paso 4 (pancarta, reina, veto.margenClaseMetros, SKELETONS, CLIMB_MIN_KM, QUEEN_MIN_CLIMB_METRES).
  it('las referencias al motor y al clasificador no se separan de su fuente', () => {
    expect(ARCH.pancarta.cimaMinKm).toBe(CLIMB_MIN_KM)
    expect(ARCH.reina.subidaLejanaKm).toBe(STAGE.climbRaceKmToGo)
    expect(ARCH.reina.verdad.dPlusMin).toBeGreaterThan(QUEEN_MIN_CLIMB_METRES)
    const techoMedia = QUEEN_MIN_CLIMB_METRES - ARCH.veto.margenClaseMetros // 2.900
    for (const sk of Object.values(SKELETONS))
      if (sk.kind === 'media') expect(sk.dPlus[1], sk.id).toBeLessThanOrEqual(techoMedia)
    expect(ARCH.reina.blandaShare.alta).toBeLessThan(ARCH.reina.blandaShare.montana!) // sacada del último it de §12.14
  })
  // Paso 5 (ARCH.km y el resto de ARCH.veto).
  it('km por clase, fallback y desnivel máximo de puerto bien formados', () => {
    // min + rango ≤ techo: el jitter de edición (× 1,06) se recorta a maxPorClase ANTES de V13 (12.6), por
    // eso aquí no hace falta holgura sobre el techo; lo que sí falla es una fila que lo supere sin jitter.
    for (const clase of ['WT', 'Pro', '1', '2'] as const)
      for (const [col, [min, rango]] of Object.entries(ARCH.km.porClase[clase]))
        expect(min + rango, `${clase} ${col}`).toBeLessThanOrEqual(ARCH.km.maxPorClase[clase])
    for (const [col, [min, rango]] of Object.entries(ARCH.km.porClase.NC))
      expect(min + rango, `NC ${col}`).toBeLessThanOrEqual(ARCH.km.maxPorClase.NC)
    expect(ARCH.veto.fallbackMaxShare.calendario).toBe(0)
    expect(ARCH.veto.puertoDplusMax.alta).toBeGreaterThanOrEqual(
      ARCH.motivo.puerto.km[1] * ARCH.meta.altoLargo.gMaxSiMasDe17 * 10,
    ) // 25 km al 7 % caben en `alta`
  })
  // Paso 7 (ARCH.pesosComposicion).
  it.todo('pesosComposicion suma 1 por relieve')
})
