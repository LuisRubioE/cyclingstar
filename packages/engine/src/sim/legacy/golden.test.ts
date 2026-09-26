import { describe, expect, it } from 'vitest'
import { hashInt } from '../../routes/profileGen.js'
import { GOLDEN } from './golden.sealed.js' // literal TypeScript, 1.418 entradas
import { legacyCalendar } from './profileGenLegacy.js'

/**
 * LA COPIA LEGADO ES EL GENERADOR VIEJO (docs/generador.md §15.10, test 2).
 *
 * Hasta el paso 8 este sello vivía en `routes/golden.test.ts` y demostraba que los pasos 1 a 7 no
 * movían un byte de `SEASON_CALENDAR`. En la v87 el calendario sale de la gramática y el sello cambia
 * de trabajo: las mismas 1.418 huellas, `hashInt(JSON.stringify(stage.profile))` con pancartas, las
 * tiene que reproducir `legacyCalendar()`. Es la prueba de que `sim/legacy/profileGenLegacy.ts` es el
 * generador de la v86 y no otra cosa, que es lo que el pareado del paso 9 necesita. Se borra con
 * `sim/legacy/` al final del paso 9.
 */
describe('sim/legacy: el calendario viejo se reproduce byte a byte', () => {
  it('legacyCalendar() da las 1.418 huellas selladas antes del paso 1', () => {
    const cal = legacyCalendar()
    let n = 0
    for (const race of cal)
      for (const st of race.stages) {
        const clave = `${race.id}:${st.index}`
        expect(hashInt(JSON.stringify(st.profile)), clave).toBe(GOLDEN[clave])
        n++
      }
    expect(n).toBe(1418)
    expect(Object.keys(GOLDEN).length).toBe(1418)
    expect(cal).toHaveLength(842)
  })

  it('el origen de cada etapa es el de la regla de hoy: 177 real, 226 edicion y 1.015 generado', () => {
    const n = { real: 0, edicion: 0, generado: 0 }
    for (const race of legacyCalendar()) for (const st of race.stages) n[st.routeSource]++
    expect(n).toEqual({ real: 177, edicion: 226, generado: 1015 })
  })
})
