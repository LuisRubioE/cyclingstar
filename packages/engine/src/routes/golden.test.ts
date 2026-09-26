import { describe, expect, it } from 'vitest'
import { SEASON_CALENDAR } from './calendar.js'
import { GOLDEN } from './golden.sealed.js' // literal TypeScript, 1.418 entradas
import { hashInt } from './profileGen.js'

/**
 * EL CALENDARIO DE HOY NO SE MUEVE HASTA EL PASO 8 (docs/generador.md §15.1 regla 2 y §15.3).
 *
 * Los pasos 1 a 7 del generador por gramática no cambian ni un byte de `SEASON_CALENDAR`: extraen
 * primitivas, declaran tipos y construyen la gramática al lado, sin llamadores. Este test lo
 * demuestra con una huella por etapa, sellada ANTES de tocar `profileGen.ts`. Se borra en el paso 8,
 * cuando sus huellas pasan a `sim/legacy/golden.test.ts`.
 */
describe('el calendario de hoy no se mueve hasta el paso 8', () => {
  it('las 1.418 etapas de SEASON_CALENDAR no cambian ni un byte', () => {
    let n = 0
    for (const race of SEASON_CALENDAR)
      for (const st of race.stages) {
        const clave = `${race.id}:${st.index}`
        expect(hashInt(JSON.stringify(st.profile)), clave).toBe(GOLDEN[clave])
        n++
      }
    expect(n).toBe(1418)
    expect(Object.keys(GOLDEN).length).toBe(1418)
  })
})
