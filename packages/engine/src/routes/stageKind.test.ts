import { describe, expect, it } from 'vitest'
import {
  classicSegments,
  cobblesSegments,
  flatSegments,
  hillySegments,
  hillyUphillSegments,
  ittSegments,
  mountainSegments,
} from './profileGen.js'
import { stageKindOf } from './stageKind.js'

/**
 * La calibración de `stageKindOf` NO se inventa: se comprueba contra los propios generadores de
 * recorridos. Cada generador sabe qué clase de etapa está dibujando —el calendario le pone la
 * etiqueta al lado—, así que el clasificador debe devolver esa misma clase para cualquier etapa que
 * salga de él, en todo el rango de kilómetros con que el calendario los llama y sobre muchas
 * semillas. Si algún día se toca un generador y deja de parecerse a lo que dice ser, esto se cae.
 */

const SEEDS = 60

function seeds(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `semilla-${i}`)
}

/** El rango de kilómetros con que `mixKm` llama a cada generador (constants.ts, ROUTE). */
const KM_ROAD = [130, 155, 175, 195, 215]
const KM_ITT = [8, 15, 22, 35, 45]

describe('routes: qué clase de etapa dibuja un recorrido', () => {
  it('una crono es una crono aunque su perfil sea el de una llana', () => {
    // `ittSegments` y `flatSegments` generan LO MISMO. Es el caso que obliga a que `timeTrial` sea
    // un dato de entrada y no algo que se lea del relieve: no está en el relieve.
    for (const km of KM_ITT) {
      for (const seed of seeds(SEEDS)) {
        const perfil = { segments: ittSegments(km, seed) }
        expect(stageKindOf(perfil, true).kind).toBe('cri')
        // …y el mismo perfil corrido en grupo es una etapa llana.
        expect(stageKindOf(perfil, false).kind).toBe('llana')
      }
    }
  })

  it('la llana se reconoce como llana', () => {
    for (const km of KM_ROAD) {
      for (const seed of seeds(SEEDS)) {
        expect(stageKindOf({ segments: flatSegments(km, seed) }, false).kind).toBe('llana')
      }
    }
  })

  it('la media montaña se reconoce como media, acabe abajo o arriba', () => {
    for (const km of KM_ROAD) {
      for (const seed of seeds(SEEDS)) {
        const llana = stageKindOf({ segments: hillySegments(km, seed) }, false)
        expect(llana.kind, `hilly ${km} ${seed}`).toBe('media')
        expect(llana.label).toBe('Hills')
        const alto = stageKindOf({ segments: hillyUphillSegments(km, seed) }, false)
        expect(alto.kind, `hillyUphill ${km} ${seed}`).toBe('media')
        expect(alto.label).toBe('Uphill finish')
      }
    }
  })

  it('la reina se reconoce como reina y con meta en alto', () => {
    for (const km of KM_ROAD) {
      for (const seed of seeds(SEEDS)) {
        const r = stageKindOf({ segments: mountainSegments(km, seed) }, false)
        expect(r.kind, `mountain ${km} ${seed}`).toBe('reina')
        expect(r.label).toBe('Summit finish')
      }
    }
  })

  it('la clásica de muros y la de adoquines se reconocen como clásicas', () => {
    for (const km of KM_ROAD) {
      for (const seed of seeds(SEEDS)) {
        expect(stageKindOf({ segments: classicSegments(km, seed) }, false).kind, `classic`).toBe(
          'clasica',
        )
        expect(stageKindOf({ segments: cobblesSegments(km, seed) }, false).label).toBe('Cobbles')
      }
    }
  })

  it('un recorrido sin segmentos no revienta: es una llana', () => {
    expect(stageKindOf({ segments: [] }, false)).toEqual({ kind: 'llana', label: 'Flat' })
  })
})
