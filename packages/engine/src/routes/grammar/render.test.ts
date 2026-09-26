import { describe, expect, it } from 'vitest'
import { ARCH } from '../../constants.js'
import type { Segment } from '../../stage/types.js'
import { finalKindOf } from '../finalKind.js'
import { routeRng } from '../profileGen.js'
import { climbSize, stageKindOf, WALL_MAX_KM } from '../stageKind.js'
import { ZONAS, conFirmeDeZona, type GeoSignature } from './geo.js'
import { dPlusDe } from './geometry.js'
import type { Motif, RngFactory } from './motifs.js'
import { colocarPlantilla, type Placed } from './place.js'
import { emitirPancartas, garantizaClase, normalizeEnlaces, renderSkeleton } from './render.js'
import { SKELETONS, type Skeleton, type SkeletonId } from './skeletons.js'

/**
 * EL RENDIDO (docs/generador.md §8.7 a §8.10 y §8.14, paso 4 del plan §15.6).
 *
 * `generateStage` es del paso 5, así que las etapas de este fichero salen de plantillas literales
 * (las canónicas de `SKELETONS` y variantes escritas aquí) colocadas con `colocarPlantilla`, que es
 * la colocación de la canónica degradada (§8.11), y dibujadas con corrientes `dib` de prueba.
 */

const r1 = (x: number): number => Math.round(x * 10) / 10
/** Reloj de los barridos de este fichero: ≥ 4× lo medido (regla 3 de §15.1). */
const RELOJ = { timeout: 60_000 }
const semillas = (n: number): string[] => Array.from({ length: n }, (_, i) => `t${i}`)
const sum = (segs: readonly Segment[]): number => r1(segs.reduce((a, s) => a + s.km, 0))
const dificultades = (segs: readonly Segment[]): Segment[] => segs.filter((s) => s.tipo !== 'llano')
const rngDe =
  (seed: string): RngFactory =>
  (token) =>
    routeRng(`dib|${seed}|${token}`)
const kmPlantilla = (ms: readonly Motif[]): number =>
  r1(ms.reduce((a, m) => a + m.km * (m.vueltas ?? 1), 0))
const E = (km: number): Motif => ({ kind: 'enlace', km })
const C = (km: number, g: number): Motif => ({ kind: 'cota', km, g })
const M = (km: number, g: number): Motif => ({ kind: 'muro', km, g })
const D = (km: number): Motif => ({ kind: 'descenso', km, g: -5 })
/** El último segmento `puerto` y el km acumulado en que termina. */
function ultimoPuerto(segs: readonly Segment[]): { s: Segment; finKm: number } {
  let cum = 0
  let out: { s: Segment; finKm: number } | null = null
  for (const s of segs) {
    cum += s.km
    if (s.tipo === 'puerto') out = { s, finKm: cum }
  }
  if (out === null) throw new Error('sin puerto')
  return out
}
/** Plantilla → colocados, segmentos (sin cuadrar) y la etapa entera tras cuadrar, garantizar y pancartas. */
function dibuja(
  sk: Skeleton,
  plantilla: readonly Motif[],
  geo: GeoSignature,
  seed: string,
  km = kmPlantilla(plantilla),
) {
  const colocados = colocarPlantilla(conFirmeDeZona(plantilla, geo))
  const segs = renderSkeleton(colocados, kmPlantilla(plantilla), geo, rngDe(seed))
  const cuadrados = normalizeEnlaces(segs, km, colocados)
  const g = cuadrados === null ? null : garantizaClase(cuadrados, sk, colocados)
  return {
    colocados,
    segs,
    cuadrados,
    g,
    profile: g ? { segments: g.segs, banners: emitirPancartas(g.segs, colocados) } : null,
  }
}
const canonico = (id: SkeletonId) => SKELETONS[id].canonico
const ZONA: Partial<Record<SkeletonId, GeoSignature>> = {
  ud_montana: ZONAS.italia_norte,
  ud_muros: ZONAS.flandes,
  ud_adoquin: ZONAS.francia_norte,
  ud_circuito: ZONAS.norteamerica,
  et_reina_alto_largo: ZONAS.pirineos,
  et_media_valle: ZONAS.italia_sur,
  ud_muro_final: ZONAS.ardenas,
  nc_ruta: ZONAS.generico,
  ud_sterrato: ZONAS.italia_centro,
}
const zona = (id: SkeletonId): GeoSignature => ZONA[id]!

describe('renderSkeleton', () => {
  // Reloj propio (regla 3 de §15.1): 1.800 etapas dibujadas, medido 5,2 s en local.
  it(
    'nunca emite rompepiernas ni un tramo con g > 20 o < −14 (300 semillas × 6 esqueletos)',
    RELOJ,
    () => {
      const ids: SkeletonId[] = [
        'ud_montana',
        'ud_muros',
        'ud_adoquin',
        'ud_circuito',
        'et_reina_alto_largo',
        'et_media_valle',
      ]
      for (const id of ids)
        for (const seed of semillas(300)) {
          const colocados = colocarPlantilla(conFirmeDeZona(canonico(id), zona(id)))
          const segs = renderSkeleton(colocados, kmPlantilla(canonico(id)), zona(id), rngDe(seed))
          for (const s of segs) {
            expect(s.tipo).not.toBe('rompepiernas')
            for (const t of s.tramos ?? []) {
              expect(t.g, `${id} ${seed}`).toBeLessThanOrEqual(20)
              expect(t.g, `${id} ${seed}`).toBeGreaterThanOrEqual(-14)
            }
          }
        }
    },
  )
  it('un muro al 12 % con gMax 16 no tiene rampa por encima de 16,0', () => {
    const colocados: Placed[] = [{ motif: M(2.4, 12), slot: 0, inicioKm: 10, finKm: 12.4 }]
    for (const seed of semillas(300)) {
      const segs = renderSkeleton(colocados, 20, ZONAS.flandes, rngDe(seed))
      const muro = segs.find((s) => s.tipo === 'puerto')!
      for (const t of muro.tramos!) {
        expect(t.g).toBeLessThanOrEqual(ARCH.motivo.muro.gMax)
        expect(t.g).toBeGreaterThanOrEqual(ARCH.motivo.muro.gMin)
      }
    }
  })
  it('un muro de 0,5 km cumple Σ tramos === km (una sola rampa) y uno de 1,0 lleva dos', () => {
    const dibujaMuro = (km: number) =>
      renderSkeleton(
        [{ motif: M(km, 11), slot: 0, inicioKm: 10, finKm: 10 + km }],
        20,
        ZONAS.flandes,
        rngDe('muro'),
      ).find((s) => s.tipo === 'puerto')!
    const corto = dibujaMuro(0.5)
    expect(corto.tramos).toHaveLength(1)
    expect(r1(corto.tramos!.reduce((a, t) => a + t.km, 0))).toBe(0.5)
    expect(dibujaMuro(1.0).tramos).toHaveLength(2)
  })
  it('un hueco de exactamente 0,5 km no se rinde y no se pierde: Σ km === km tras normalizeEnlaces', () => {
    const colocados: Placed[] = [
      { motif: C(4, 6), slot: 0, inicioKm: 30, finKm: 34 },
      { motif: C(3, 6), slot: 1, inicioKm: 34.5, finKm: 37.5 }, // hueco de 0,5
      { motif: { kind: 'meta', meta: 'esprint', km: 10 }, slot: 'meta', inicioKm: 50, finKm: 60 },
    ]
    for (const seed of semillas(50)) {
      const segs = renderSkeleton(colocados, 60, ZONAS.ardenas, rngDe(seed))
      expect(sum(segs)).toBeLessThan(60) // el hueco de 0,5 no se dibujó
      const idx = segs.findIndex((s) => s.tipo === 'puerto')
      expect(segs[idx + 1]!.tipo).toBe('puerto') // las dos cotas, seguidas
      const n = normalizeEnlaces(segs, 60, colocados)!
      expect(sum(n)).toBe(60)
    }
  })
  it('la vuelta 7 de un circuito es idéntica a la 1 (deepEqual de sus Segment[])', () => {
    const c = canonico('ud_circuito')[1]! // 12 km × 16 vueltas
    const colocados: Placed[] = [{ motif: c, slot: 0, inicioKm: 5, finKm: 5 + 12 * 16 }]
    const segs = renderSkeleton(colocados, 5 + 12 * 16, ZONAS.norteamerica, rngDe('vuelta'))
    const dentro = segs.slice(segs.findIndex((s) => s.tipo !== 'llano') - 1) // desde la separación inicial
    const vuelta = dentro.length / 16
    expect(Number.isInteger(vuelta)).toBe(true)
    expect(dentro.slice(6 * vuelta, 7 * vuelta)).toEqual(dentro.slice(0, vuelta))
  })
  it('tendida rinde UN llano con 2 a 4 tramos y no ningún puerto', () => {
    for (const seed of semillas(100)) {
      const colocados: Placed[] = [
        { motif: { kind: 'tendida', km: 12, g: 3 }, slot: 0, inicioKm: 20, finKm: 32 },
      ]
      const segs = renderSkeleton(colocados, 50, ZONAS.meseta, rngDe(seed))
      expect(segs.some((s) => s.tipo === 'puerto')).toBe(false)
      const t = segs.filter((s) => s.km === 12)
      expect(t).toHaveLength(1)
      expect(t[0]!.tipo).toBe('llano')
      expect(t[0]!.tramos!.length).toBeGreaterThanOrEqual(2)
      expect(t[0]!.tramos!.length).toBeLessThanOrEqual(4)
    }
  })
  it('en una transición el primer 40 % rueda con la amplitud de la zona de salida', () => {
    const colocados: Placed[] = [
      { motif: { kind: 'meta', meta: 'esprint', km: 5 }, slot: 'meta', inicioKm: 95, finKm: 100 },
    ]
    // Sin la meta (su llano final rueda con la zona de meta): el único hueco empieza en el km 0.
    const antesDeMeta = (segs: Segment[]) =>
      segs.slice(0, -1).filter((_, i, xs) => sum(xs.slice(0, i + 1)) <= 95)
    const conDesde = antesDeMeta(
      renderSkeleton(colocados, 100, ZONAS.alpes, rngDe('tr'), ZONAS.golfo),
    )
    const sinDesde = antesDeMeta(renderSkeleton(colocados, 100, ZONAS.alpes, rngDe('tr')))
    const maxG = (segs: Segment[]) =>
      Math.max(...segs.flatMap((s) => (s.tramos ?? []).map((t) => Math.abs(t.g))))
    expect(maxG(conDesde)).toBeLessThanOrEqual(ZONAS.golfo.amplitud) // un solo hueco, empieza en el km 0
    expect(maxG(sinDesde)).toBeGreaterThan(ZONAS.golfo.amplitud)
  })
})

describe('normalizeEnlaces', () => {
  it('Σ km === km con error 0,0 en 1.000 semillas y solo cambian los enlaces', () => {
    const ids: SkeletonId[] = [
      'ud_montana',
      'ud_muros',
      'et_reina_alto_largo',
      'et_media_valle',
      'ud_adoquin',
    ]
    for (const [n, seed] of semillas(1000).entries()) {
      const id = ids[n % ids.length]!
      const plantilla = canonico(id)
      const colocados = colocarPlantilla(conFirmeDeZona(plantilla, zona(id)))
      const antes = renderSkeleton(colocados, kmPlantilla(plantilla), zona(id), rngDe(seed))
      const objetivo = r1(kmPlantilla(plantilla) * (0.94 + 0.12 * routeRng(`km|${seed}`)())) // el ± 6 % del plan
      const despues = normalizeEnlaces(antes, objetivo, colocados)
      expect(despues, `${id} ${seed}`).not.toBeNull()
      expect(sum(despues!)).toBe(objetivo)
      expect(dificultades(despues!)).toEqual(dificultades(antes))
      // Los llanos que no son enlace (valles de meta, tendidas) tampoco cambian: mismas referencias.
      const noEnlaces = antes.filter((s) => despues!.includes(s)).length
      expect(noEnlaces).toBeGreaterThanOrEqual(dificultades(antes).length)
      for (const s of despues!)
        expect(r1((s.tramos ?? []).reduce((a, t) => a + t.km, 0) || s.km)).toBe(s.km)
    }
  })
  it('devuelve null si un enlace quedaría < 0,5 km, o si no hay enlaces y hay que cuadrar', () => {
    const colocados: Placed[] = [
      { motif: C(5, 6), slot: 0, inicioKm: 1, finKm: 6 },
      { motif: { kind: 'meta', meta: 'esprint', km: 4 }, slot: 'meta', inicioKm: 6, finKm: 10 },
    ]
    const segs = renderSkeleton(colocados, 10, ZONAS.ardenas, rngDe('corto')) // un enlace de 1 km
    expect(normalizeEnlaces(segs, 9.2, colocados)).toBeNull() // el enlace de 1 bajaría a 0,2
    expect(normalizeEnlaces(segs, 10.4, colocados)).not.toBeNull()
    const sinEnlace = segs.filter((s) => s.tipo === 'puerto')
    expect(normalizeEnlaces(sinEnlace, 6, colocados)).toBeNull()
    expect(normalizeEnlaces(sinEnlace, sum(sinEnlace), colocados)).toEqual(sinEnlace)
  })
})

describe('garantizaClase', () => {
  it('en clásica ninguna subida supera WALL_MAX_KM − 0,1 (2,9) y ningún muro supera ARCH.motivo.muro.km[1], sin que la regla 3 cuente por un muro', () => {
    const sk = SKELETONS.ud_circuito
    // La variante con cotas (zonas sin muro): una cota de 3,4 km en la vuelta sería media; se recorta.
    const plantilla: Motif[] = [
      E(5.5),
      { kind: 'circuito', km: 12, vueltas: 10, hijos: [C(3.4, 5)], separaciones: [6], firma: true },
      { kind: 'meta', meta: 'esprint', km: 1.5 }, // cierre 2,6 + 1,5: la cima a 4,1 de meta (cima_cerca)
    ]
    for (const seed of semillas(100)) {
      const { g, profile } = dibuja(sk, plantilla, ZONAS.golfo, seed)
      expect(g, seed).not.toBeNull()
      expect(g!.reglas).toBeGreaterThanOrEqual(1)
      for (const s of g!.segs.filter((x) => x.tipo === 'puerto'))
        expect(climbSize(s).km).toBeLessThanOrEqual(WALL_MAX_KM - 0.1 + 1e-9)
      expect(stageKindOf(profile!, false).kind).toBe('clasica')
    }
    for (const seed of semillas(100)) {
      const { g } = dibuja(SKELETONS.ud_muros, canonico('ud_muros'), ZONAS.flandes, seed)
      for (const s of g!.segs.filter((x) => x.tipo === 'puerto'))
        expect(climbSize(s).km).toBeLessThanOrEqual(ARCH.motivo.muro.km[1] + 1e-9)
      expect(g!.reglas).toBe(0) // la regla 3 nunca actúa sobre un muro
    }
  })
  it('en media Σ climbMetres queda por debajo de 2.900 o devuelve null (regla 2b)', () => {
    const sk = SKELETONS.et_media_valle
    // Tres cotas largas y duras y un final de 4 km al 7 %: por encima de 2.900 sin recortar.
    const plantilla: Motif[] = [
      E(30),
      C(8, 7.9),
      D(9),
      E(15),
      C(8, 7.9),
      D(9),
      E(15),
      C(8, 7.9),
      D(9),
      E(15),
      C(7.5, 7.9),
      D(9),
      E(10),
      { kind: 'meta', meta: 'valle', km: 30, cotaFinal: { km: 4, g: 7 } },
    ]
    let recortadas = 0
    for (const seed of semillas(200)) {
      const { segs, g, profile } = dibuja(sk, plantilla, ZONAS.italia_sur, seed)
      const antes = segs.reduce(
        (a, s) => a + (s.tramos ?? []).reduce((b, t) => b + (t.g > 0 ? t.g * t.km * 10 : 0), 0),
        0,
      )
      if (g === null) continue
      expect(dPlusDe(profile!)).toBeLessThan(2900)
      expect(stageKindOf(profile!, false).kind).toBe('media')
      if (antes >= 2900) {
        recortadas++
        expect(g.reglas).toBeGreaterThanOrEqual(1)
      }
    }
    expect(recortadas).toBeGreaterThan(0)
  })
  it('cima_cerca: el valle queda en [1,2; 4,3] y finalKindOf dice cima_cerca en 1.000 de 1.000', () => {
    const sk = SKELETONS.ud_circuito
    // Circuito con el último muro a 1,5 km de cerrar la vuelta, un enlace de x km y 1 km de esprint:
    // valle = 2,5 + x. Con x de 0,6 a 6,5 el valle va de 3,1 a 9: la regla 4 lo trae a ≤ 4,3.
    let movidas = 0
    for (const [i, seed] of semillas(1000).entries()) {
      const x = r1(0.6 + (i % 60) * 0.1)
      const plantilla: Motif[] = [
        E(20),
        {
          kind: 'circuito',
          km: 12,
          vueltas: 10,
          hijos: [M(1.1, 11)],
          separaciones: [9.4],
          firma: true,
        },
        E(x),
        { kind: 'meta', meta: 'esprint', km: 1 },
      ]
      const { g, profile } = dibuja(sk, plantilla, ZONAS.norteamerica, seed)
      expect(profile, `${seed} x ${x}`).not.toBeNull()
      if (g!.reglas > 0) movidas++
      expect(finalKindOf(profile!), `${seed} x ${x}`).toBe('cima_cerca')
      const u = ultimoPuerto(profile!.segments)
      const valle = r1(sum(profile!.segments) - u.finKm)
      expect(valle, `${seed} x ${x}`).toBeGreaterThanOrEqual(1.2 - 1e-9)
      expect(valle, `${seed} x ${x}`).toBeLessThanOrEqual(4.3 + 1e-9)
      expect(sum(profile!.segments)).toBe(kmPlantilla(plantilla)) // la regla 4 compensa: Σ km no cambia
    }
    expect(movidas).toBeGreaterThan(0)
  })
  it('todo segmento cumple Σ tramos === km al 0,1, y la regla 1 alarga la reina sin puerto largo', () => {
    for (const id of ['ud_montana', 'et_reina_alto_largo', 'ud_sterrato', 'nc_ruta'] as const)
      for (const seed of semillas(100)) {
        const { g } = dibuja(SKELETONS[id], canonico(id), zona(id), seed)
        for (const s of g!.segs)
          if (s.tramos && s.tramos.length > 0)
            expect(r1(s.tramos.reduce((a, t) => a + t.km, 0)), `${id} ${seed}`).toBe(s.km)
      }
    // Una reina de un solo puerto de 8,6 km y poco desnivel: la regla 1 lo lleva a 8,8 km de subida.
    const sk = SKELETONS.et_reina_valle
    const plantilla: Motif[] = [
      E(80),
      { kind: 'puerto', km: 9, g: 5 },
      D(8),
      E(50),
      { kind: 'meta', meta: 'descenso_meta', km: 20, cotaFinal: { km: 8.6, g: 5 } },
    ]
    for (const seed of semillas(50)) {
      const { g, profile } = dibuja(sk, plantilla, ZONAS.alpes, seed)
      const largos = g!.segs.filter((s) => s.tipo === 'puerto' && climbSize(s).km >= 8.8 - 1e-9)
      expect(largos.length, seed).toBeGreaterThan(0)
      expect(stageKindOf(profile!, false).kind).toBe('reina')
    }
  })
  it('reglas cuenta las reglas 1 a 4 que tocaron la etapa (0 en las canónicas)', () => {
    for (const id of Object.keys(ZONA) as SkeletonId[])
      for (const seed of semillas(20)) {
        const { g } = dibuja(SKELETONS[id], canonico(id), zona(id), seed)
        expect(g!.reglas, `${id} ${seed}`).toBe(0)
      }
  })
})

describe('emitirPancartas', () => {
  it('pone cima en todo puerto ≥ 1,5 km y SIEMPRE en el último puerto aunque mida 0,5', () => {
    for (const id of ['ud_muro_final', 'ud_sterrato'] as const)
      for (const seed of semillas(50)) {
        const { profile } = dibuja(SKELETONS[id], canonico(id), zona(id), seed)
        const u = ultimoPuerto(profile!.segments)
        expect(profile!.banners!.at(-1)).toEqual({ km: Math.round(u.finKm), tipo: 'cima' })
        expect(finalKindOf(profile!)).toBe('alto')
      }
    // Fuera de circuitos: una cima por puerto ≥ 1,5 y ninguna por los muros cortos de una cadena.
    const { profile } = dibuja(SKELETONS.ud_muros, canonico('ud_muros'), ZONAS.flandes, 't0')
    const muros = profile!.segments.filter((s) => s.tipo === 'puerto')
    const largos = muros.filter((s) => climbSize(s).km >= 1.5).length
    const ultimoCorto = climbSize(muros.at(-1)!).km < 1.5 ? 1 : 0
    expect(profile!.banners!.length).toBe(largos + ultimoCorto)
  })
  it('un circuito con muro de 1,1 km × 9 lleva UNA pancarta, la del último paso', () => {
    const plantilla: Motif[] = [
      E(5.5),
      {
        kind: 'circuito',
        km: 14,
        vueltas: 9,
        hijos: [M(1.1, 11)],
        separaciones: [11],
        firma: true,
      },
      { kind: 'meta', meta: 'esprint', km: 2 }, // cierre 1,9 + 2: la cima del último paso a 3,9 de meta
    ]
    const { profile } = dibuja(SKELETONS.ud_circuito, plantilla, ZONAS.norteamerica, 't1')
    expect(profile!.banners).toHaveLength(1)
    expect(profile!.banners![0]!.km).toBe(Math.round(ultimoPuerto(profile!.segments).finKm))
  })
  it('un circuito con cota de 2 km × 9 lleva UNA, la del último paso; nc_ruta con cota de 2 km y muro de 1 km lleva dos', () => {
    const cota: Motif[] = [
      E(5.5),
      { kind: 'circuito', km: 14, vueltas: 9, hijos: [C(2, 6)], separaciones: [10.5], firma: true },
      { kind: 'meta', meta: 'esprint', km: 2 },
    ]
    const a = dibuja(SKELETONS.ud_circuito, cota, ZONAS.golfo, 't2').profile!
    expect(a.banners).toHaveLength(1)
    expect(a.banners![0]!.km).toBe(Math.round(ultimoPuerto(a.segments).finKm))
    const nc: Motif[] = [
      E(20),
      {
        kind: 'circuito',
        km: 16,
        vueltas: 9,
        hijos: [C(2, 6), M(1, 9)],
        separaciones: [3, 8.5],
        firma: true,
      },
      { kind: 'meta', meta: 'esprint', km: 2 },
    ]
    const b = dibuja(SKELETONS.nc_ruta, nc, ZONAS.generico, 't3').profile!
    expect(b.banners).toHaveLength(2)
    expect(b.banners![1]!.km).toBe(Math.round(ultimoPuerto(b.segments).finKm))
    expect(b.banners![1]!.km - b.banners![0]!.km).toBeLessThan(16) // las dos en la última vuelta
  })
  it('ninguna meta_volante', () => {
    for (const id of Object.keys(ZONA) as SkeletonId[]) {
      const { profile } = dibuja(SKELETONS[id], canonico(id), zona(id), 't4')
      expect(profile!.banners!.every((b) => b.tipo === 'cima')).toBe(true)
    }
  })
})
