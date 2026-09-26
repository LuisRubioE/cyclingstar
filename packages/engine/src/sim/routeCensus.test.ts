/**
 * EL CENSO MIDE COMO LEE EL MOTOR (docs/generador.md §13.8 y §15.2).
 *
 * Unidad del censo sobre perfiles literales. Corre con `test:bancos` y en la entrada «mundo y radio»
 * de la matriz de `ci.yml`, porque `test:rapido` excluye `packages/engine/src/sim/**`. Las bandas
 * del calendario se afirman en `routes/grammar/calendario.test.ts`, que sí entra en cada push.
 */
import { describe, expect, it } from 'vitest'
import { lastClimbKm } from '../routes/finalKind.js'
import { ultimaCota } from '../routes/grammar/geometry.js'
import type { StageProfile } from '../stage/types.js'
import { aggregate, entropiaBits, raceDePrueba, routeCensus } from './routeCensus.js'
import type { RouteStats } from './routeCensus.js'
import { mediaScenario, queenScenario } from './scenarios.js'

/** Llano 100 km, puerto de 12 km al 7 % con la pancarta en su cima (km 112) y llano 8 km. Con tramos:
 *  sin ellos `climbSize` y `dPlusDe` darían 0. */
function perfilDePrueba(): StageProfile {
  return {
    segments: [
      { km: 100, tipo: 'llano', tramos: [{ km: 100, g: 0 }] },
      { km: 12, tipo: 'puerto', tramos: [{ km: 12, g: 7 }] },
      { km: 8, tipo: 'llano', tramos: [{ km: 8, g: 0 }] },
    ],
    banners: [{ km: 112, tipo: 'cima' }],
  }
}

describe('el censo mide como lee el motor', () => {
  it('lastClimbKm del censo es la LONGITUD de la última cota y no su posición (llano 100 + puerto 12 al 7 % + llano 8)', () => {
    const profile = perfilDePrueba()
    expect(lastClimbKm(profile)).toBe(112) // finalKind.ts: la POSICIÓN de la pancarta
    expect(ultimaCota(profile)).toBe(profile.segments[1]) // el segmento que esa pancarta cierra
    const r = routeCensus([raceDePrueba(profile)])[0]!
    expect(r.nPuertos).toBe(1)
    expect(r.longestClimbKm).toBe(12)
    expect(r.lastClimbKm).toBe(12)
    expect(r.lastClimbG).toBe(7)
    expect(r.kmAfterLastClimb).toBe(8)
    expect(r.finalKind).toBe('valle_corto')
    expect(r.dPlus).toBeCloseTo(840, 6)
    expect(r.kmSubidaShare).toBeCloseTo(0.1, 6) // 12 km de bloques `subida` en 120
    expect(r.climbKmOutsideLast30).toBe(0) // el puerto va del km 100 al 112 de 120: entero en los 30 últimos
    expect(r.routeSource).toBe('generado') // 'censo-prueba' no está en STAGE_FEATURES ni en RACE_EDITIONS
    expect(r.skeleton).toBeNull() // sin arch: null, 0 y false (§13.3)
    expect(r.zona).toBeNull()
    expect(r.meta).toBeNull()
    expect(r.firmaMotivos).toBeNull()
    expect(r.intentos).toBe(0)
    expect(r.garantiasClase).toBe(0)
    expect(r.degradado).toBe(false)
    expect(r.country).toBeNull()
    expect(r.km).toBe(120)
    expect(r.huella).toHaveLength(120)
    expect(r.huella[0]).toBe(0) // índice 0 = último km, llano
    expect(r.huella[10]).toBe(7) // el km 108-109, en pleno puerto
  })

  it('un perfil sin puertos da lastClimbKm null y no 0 (misma regla que finalKind.test.ts)', () => {
    const llana: StageProfile = {
      segments: [{ km: 150, tipo: 'llano', tramos: [{ km: 150, g: 0 }] }],
    }
    const r = routeCensus([raceDePrueba(llana, 'llana')])[0]!
    expect(r.lastClimbKm).toBeNull()
    expect(r.lastClimbG).toBeNull()
    expect(r.kmAfterLastClimb).toBeNull()
    expect(r.finalKind).toBeNull()
    expect(r.nPuertos).toBe(0)
    expect(r.longestClimbKm).toBe(0)
    expect(r.dPlus).toBe(0)
  })

  it('climbKmOutsideLast30 separa media-150 (la antigua reina-150) de una reina de verdad', () => {
    expect(
      routeCensus([raceDePrueba(mediaScenario().input.profile)])[0]!.climbKmOutsideLast30,
    ).toBe(0) // 135 km llanos y el puerto en meta
    expect(
      routeCensus([raceDePrueba(queenScenario().input.profile)])[0]!.climbKmOutsideLast30,
    ).toBeGreaterThan(0) // reina-canonica: 13 km de puerto que coronan en el km 63 de 158
  })

  it('aggregate por kind devuelve recuentos, cuantiles y repartos correctos', () => {
    const base = routeCensus([raceDePrueba(perfilDePrueba())])[0]!
    const filas: RouteStats[] = [
      { ...base, kind: 'reina', km: 100, finishType: 'alto' },
      { ...base, kind: 'reina', km: 200, finishType: 'sprint_masivo' },
      { ...base, kind: 'llana', km: 150 },
    ]
    const porKind = aggregate(filas, (r) => r.kind)
    expect(Object.keys(porKind).sort()).toEqual(['llana', 'reina'])
    const reina = porKind.reina!
    expect(reina.n).toBe(2)
    // Índice floor(n · p) sobre [100, 200]: p10 → 0, p50 → 1, p90 → 1.
    expect(reina.num.km).toEqual({
      n: 2,
      min: 100,
      p10: 100,
      p50: 200,
      p90: 200,
      p95: 200,
      max: 200,
      media: 150,
    })
    expect(reina.cat.finishType).toEqual({ alto: 0.5, sprint_masivo: 0.5 })
    expect(reina.cat.skeleton).toEqual({ null: 1 })
    expect(porKind.llana!.n).toBe(1)
    expect(porKind.llana!.num.km!.p50).toBe(150)
    expect(entropiaBits(reina.cat.finishType!)).toBeCloseTo(1, 9)
  })

  it('el censo de las 1.418 etapas de hoy cuesta menos de 2 s y es determinista', () => {
    const t0 = performance.now()
    const filas = routeCensus()
    const ms = performance.now() - t0
    expect(filas).toHaveLength(1418)
    expect(ms).toBeLessThan(2_000) // 0,41 s medidos en el paso 0 (0,57 s el juez del motor)
    expect(routeCensus()).toEqual(filas)
  })
})
