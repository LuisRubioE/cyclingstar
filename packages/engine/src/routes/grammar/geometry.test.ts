import { describe, expect, it } from 'vitest'
import { ARCH } from '../../constants.js'
import type { Segment, StageProfile } from '../../stage/types.js'
import { SEASON_CALENDAR } from '../calendar.js'
import { profileKm } from '../finalKind.js'
import { ZONAS } from './geo.js'
import { describeProfile, rachasDeSubida } from './geometry.js'
import { validateMotif, type MetaKind, type Motif } from './motifs.js'

/**
 * LA GEOMETRÍA QUE ENTRA EN EL PASO 4 (docs/generador.md §3.9, §9.2 y §13.5): `rachasDeSubida`, la
 * racha de V9, y `describeProfile`, un perfil de hoy leído como motivos. Las columnas del censo
 * (`dPlusDe`, `huellaDe`, `ultimaCota`…) las prueban `sim/routeCensus.test.ts` y el censo del paso 0.
 */

const r1 = (x: number): number => Math.round(x * 10) / 10
/** Segmentos literales: sin `tramos`, un segmento sube 0 m y es 0 % en `rachasDeSubida`. */
const llano = (km: number, g = 0): Segment => ({ km, tipo: 'llano', tramos: [{ km, g }] })
const sube = (tramos: [number, number][]): Segment => ({
  km: r1(tramos.reduce((a, [k]) => a + k, 0)),
  tipo: 'puerto',
  tramos: tramos.map(([km, g]) => ({ km, g })),
})
const perfil = (segments: Segment[]): StageProfile => ({ segments })

describe('rachasDeSubida (V9, §9.2)', () => {
  it('una racha de 2,8 km al 5,4 % con un rellano de 0,4 km cuenta entera y el rellano dentro', () => {
    // 1,2 km al 6 %, rellano de 0,4 al 2 %, 1,2 al 6,5: 2,8 km, media (7,2 + 0,8 + 7,8) / 2,8 = 5,64.
    const p = perfil([llano(100), sube([[1.2, 6]]), llano(0.4, 2), sube([[1.2, 6.5]]), llano(10)])
    const rs = rachasDeSubida(p)
    expect(rs).toHaveLength(1)
    expect(rs[0]!.km).toBeCloseTo(2.8, 9)
    expect(rs[0]!.g).toBeCloseTo((1.2 * 6 + 0.4 * 2 + 1.2 * 6.5) / 2.8, 9)
    expect(rs[0]!.finKmAMeta).toBeCloseTo(10, 9)
  })
  it('un rellano de 0,6 km corta la racha en dos', () => {
    const p = perfil([llano(100), sube([[1.2, 6]]), llano(0.6, 2), sube([[1.2, 6.5]]), llano(10)])
    const rs = rachasDeSubida(p)
    expect(rs.map((r) => r1(r.km))).toEqual([1.2, 1.2])
    expect(rs.map((r) => r1(r.finKmAMeta))).toEqual([11.8, 10])
  })
  it('cruza fronteras de segmento y de tipo, y un tramo bajo el 3 % al final no la alarga', () => {
    const p = perfil([
      llano(50),
      {
        km: 2,
        tipo: 'llano',
        tramos: [
          { km: 1, g: 1 },
          { km: 1, g: 3.5 },
        ],
      }, // tendida que se empina
      sube([
        [1.5, 7],
        [1, 2],
      ]),
      llano(20),
    ])
    const rs = rachasDeSubida(p)
    expect(rs).toHaveLength(1)
    expect(rs[0]!.km).toBeCloseTo(2.5, 9)
    expect(rs[0]!.finKmAMeta).toBeCloseTo(21, 9) // el final es el del último tramo ≥ 3 %
  })
  it('sin tramos un segmento es 0 %: no hay racha; los umbrales son los de ARCH.veto.llana', () => {
    expect(rachasDeSubida(perfil([{ km: 10, tipo: 'puerto' }]))).toEqual([])
    expect(ARCH.veto.llana.rachaGMin).toBe(3)
    expect(ARCH.veto.llana.rellanoKm).toBe(0.5)
    const p = perfil([llano(10), sube([[2, 2.5]]), llano(10)])
    expect(rachasDeSubida(p)).toEqual([])
    expect(rachasDeSubida(p, 2)).toHaveLength(1) // el umbral se puede pasar
  })
})

/** Las tres reinas congeladas por forma (decisión 33), tal como las dibuja hoy el calendario. */
function etapa(raceId: string, index: number): StageProfile {
  const st = SEASON_CALENDAR.find((r) => r.id === raceId)?.stages.find((s) => s.index === index)
  if (!st) throw new Error(`${raceId} e${index} no está en el calendario`)
  return st.profile
}
const E = (km: number): Motif => ({ kind: 'enlace', km })
const P = (km: number, g: number): Motif => ({ kind: 'puerto', km, g, forma: 'regular' })
const C = (km: number, g: number): Motif => ({ kind: 'cota', km, g })
const D = (km: number, g: number): Motif => ({ kind: 'descenso', km, g })
const META = (meta: MetaKind, km: number, cotaFinal: { km: number; g: number }): Motif => ({
  kind: 'meta',
  meta,
  km,
  cotaFinal,
})

describe('describeProfile (§13.5)', () => {
  // La salida esperada de §13.5, calculada para el documento con una réplica sobre `8585ca2`; el
  // paso 4 la comprueba con la función de verdad sobre el calendario de hoy (golden sellado).
  const ESPERADO: Record<string, Motif[]> = {
    'race-colombia:5': [
      E(38.7),
      P(10.0, 5.9),
      D(7.6, -6.1),
      E(49.5),
      C(6.4, 5.7),
      D(5.7, -6.0),
      E(40.6),
      C(8.0, 6.7),
      D(6.4, -6.7),
      E(36.5),
      META('descenso_meta', 22.6, { km: 4.1, g: 7.9 }),
    ],
    'race-guatemala:9': [
      E(39.8),
      C(6.9, 7.7),
      D(6.9, -5.8),
      E(28.9),
      P(9.0, 7.0),
      D(5.4, -5.3),
      E(31.9),
      C(7.3, 7.7),
      D(7.2, -5.2),
      E(32.4),
      META('descenso_meta', 24.3, { km: 6.6, g: 10.6 }),
    ],
    'race-tachira:6': [
      E(24.7),
      P(10.9, 7.3),
      D(6.0, -7.2),
      E(20.5),
      C(6.9, 5.6),
      D(7.8, -6.8),
      E(20.8),
      C(7.0, 5.9),
      D(7.4, -6.5),
      E(27.4),
      META('valle', 26.6, { km: 5.9, g: 9.9 }),
    ],
  }
  it.each(Object.keys(ESPERADO))(
    '%s: la salida de §13.5, Σ km al 0,1 y motivos válidos en andes',
    (clave) => {
      const [raceId, i] = clave.split(':') as [string, string]
      const profile = etapa(raceId, Number(i))
      const motivos = describeProfile(profile)
      expect(motivos).toEqual(ESPERADO[clave])
      expect(r1(motivos.reduce((a, m) => a + m.km, 0))).toBe(r1(profileKm(profile)))
      for (const m of motivos)
        expect(validateMotif(m, ZONAS.andes), `${clave} ${m.kind}`).toBeNull()
    },
  )
  it('lanza sin una subida de 1,5 km y con un paves; parte el hueco (8,0; 9,0) en PASS_MIN_KM', () => {
    expect(() => describeProfile(perfil([llano(100)]))).toThrow(/sin una subida/)
    expect(() =>
      describeProfile(
        perfil([llano(50), { km: 2, tipo: 'paves', estrellas: 3 }, sube([[5, 6]]), llano(10)]),
      ),
    ).toThrow(/paves/)
    const conHueco = (km: number) =>
      describeProfile(
        perfil([llano(60), sube([[km, 6]]), llano(40), sube([[5, 7]]), llano(10)]),
      )[1]!
    expect(conHueco(8.7)).toMatchObject({ kind: 'puerto', km: 9 }) // [8,5; 9,0) → puerto de 9,0
    expect(conHueco(8.3)).toMatchObject({ kind: 'cota', km: 8 }) // (8,0; 8,5) → cota de 8,0
    const m = describeProfile(
      perfil([llano(60), sube([[8.3, 6]]), llano(40), sube([[5, 7]]), llano(10)]),
    )
    expect(r1(m.reduce((a, x) => a + x.km, 0))).toBe(r1(60 + 8.3 + 40 + 5 + 10)) // la cima no se mueve: lo paga el relleno
  })
})
