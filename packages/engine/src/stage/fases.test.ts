import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import { PHASE_TABLE, type Phase, type PhaseInput, phaseOf } from './tactics.js'

/**
 * LAS FASES DE LA CARRERA (docs/tactica.md R19, paso 5).
 *
 * Lo que hay que probar aquí es **el ORDEN**, porque el orden ES la regla. Varias guardas se cumplen
 * a la vez y a menudo, y cada una da una cuerda y una aduana distintas: sin un orden probado, el
 * estado del que cuelga toda la conducta queda indeterminado.
 *
 * Y la otra mitad: **que ninguna guarda decida con un hueco**. Seis de las diez leen datos que otros
 * pasos todavía no producen, y una guarda cuyo dato no existe tiene que valer `false`, nunca
 * `undefined`.
 */

const base: PhaseInput = {
  km: 60,
  kmToGo: 120,
  bunchFinish: true,
  dayBreakFormed: true,
}

describe('engine: en qué fase está la carrera', () => {
  it('sin nada especial, la carrera está en CONTROL', () => {
    expect(phaseOf(base)).toBe('control')
  })

  it('EL ORDEN ES LA REGLA: `desenlace` gana a `decisivo` en un final agrupado', () => {
    // En un final en alto se cumplen los dos. Manda el que fija el suelo del tirón final, que es el
    // que la carrera obedece.
    const alFinal = { ...base, kmToGo: 8, onDecisiveClimb: true }
    expect(phaseOf(alFinal)).toBe('desenlace')
    // …y si el final NO admite llegada agrupada, la puerta de `desenlace` no se abre y manda el otro.
    expect(phaseOf({ ...alFinal, bunchFinish: false })).toBe('decisivo')
  })

  it('…y `caza` gana a `fuga`: mientras el pelotón cierra, ya no se está en fase de fuga', () => {
    // Es lo que evita que el km 20 de una etapa nerviosa se lea como `fuga` con la aduana abierta
    // de par en par.
    const nerviosa = { ...base, km: 20, dayBreakFormed: false, chasing: true }
    expect(phaseOf(nerviosa)).toBe('caza')
    expect(phaseOf({ ...nerviosa, chasing: false })).toBe('salida')
  })

  it('la tregua gana a todo menos a los km neutralizados', () => {
    const conTregua = { ...base, kmToGo: 3, truceAlive: true }
    expect(phaseOf(conTregua)).toBe('tregua')
    expect(phaseOf({ ...conTregua, km: 1, neutralKm: 4 })).toBe('neutralizado')
  })

  it('la captura dura lo que dice su constante, y ni un km más', () => {
    const tras = { ...base, lastCaptureKm: 59.5 }
    expect(phaseOf(tras)).toBe('captura')
    expect(phaseOf({ ...tras, lastCaptureKm: 60 - STAGE.phases.capturaKm - 0.1 })).toBe('control')
  })

  it('antes de que cuaje la fuga: `salida` primero y `fuga` después', () => {
    const sinFuga = { ...base, dayBreakFormed: false }
    expect(phaseOf({ ...sinFuga, km: STAGE.phases.settleKm - 1 })).toBe('salida')
    expect(phaseOf({ ...sinFuga, km: STAGE.phases.settleKm })).toBe('fuga')
  })

  it('NINGUNA GUARDA DECIDE CON UN HUECO: sin los datos de otros pasos, todas valen false', () => {
    // Es la mitad que impide que `phaseOf` se comporte de forma distinta según qué paso esté hecho.
    // Con el objeto MÍNIMO —solo lo que existe hoy— tiene que devolver una fase, no `undefined`.
    const minimo: PhaseInput = { km: 60, kmToGo: 120, bunchFinish: true, dayBreakFormed: true }
    expect(phaseOf(minimo)).toBe('control')
    // Y pasar los seis campos como `undefined` explícito da EXACTAMENTE lo mismo que no pasarlos.
    expect(
      phaseOf({
        ...minimo,
        neutralKm: undefined,
        truceAlive: undefined,
        lastCaptureKm: undefined,
        onDecisiveClimb: undefined,
        decisiveSector: undefined,
        kmToNextSummit: undefined,
        chasing: undefined,
      }),
    ).toBe('control')
  })

  it('la aproximación solo dispara si de verdad queda una cima cerca', () => {
    expect(phaseOf({ ...base, kmToNextSummit: STAGE.phases.approachKm - 1 })).toBe('aproximacion')
    expect(phaseOf({ ...base, kmToNextSummit: STAGE.phases.approachKm + 1 })).toBe('control')
    expect(phaseOf({ ...base, kmToNextSummit: null })).toBe('control')
  })
})

describe('engine: la tabla de fase', () => {
  const fases = Object.keys(PHASE_TABLE) as Phase[]

  it('las diez fases tienen fila, y `phaseOf` no puede devolver una que no esté', () => {
    expect(fases.length).toBe(10)
  })

  it('LA ADUANA CERRADA NO ES «TODO PASA»: las fases sin aduana son las de atacar', () => {
    // «no» significa que la cara `fuga` NO NACE, no que nada la vete. Las fases donde la aduana está
    // cerrada son justamente aquellas en las que ya no se va nadie en la fuga del día: se ataca.
    for (const f of ['aproximacion', 'decisivo', 'desenlace'] as Phase[]) {
      expect(`${f} sin aduana: ${!PHASE_TABLE[f].aduana}`).toBe(`${f} sin aduana: true`)
      expect(`${f} con ataque: ${PHASE_TABLE[f].ataqueDentro}`).toBe(`${f} con ataque: true`)
    }
  })

  it('el cupo de movimientos CRECE con la carrera, que es lo que el 3 fijo impedía', () => {
    // `tacticMaxMoves = 3` era un contador global por encima de toda la táctica: «cuatro intentos
    // hasta el km 19 y ni uno más en los 190 restantes». Aquí el desenlace admite el doble.
    expect(PHASE_TABLE.salida.maxMoves).toBeLessThan(PHASE_TABLE.fuga.maxMoves)
    expect(PHASE_TABLE.fuga.maxMoves).toBeLessThan(PHASE_TABLE.decisivo.maxMoves)
    expect(PHASE_TABLE.neutralizado.maxMoves).toBe(0)
  })

  it('la captura es la fase de la cuerda larga, y la tregua la de la corta', () => {
    // Tras cazar una fuga, el contraataque es lo que más se ve en la carretera y lo que el motor
    // nunca dejaba salir.
    expect(PHASE_TABLE.captura.lambdaScale).toBe(
      Math.max(...fases.map((f) => PHASE_TABLE[f].lambdaScale)),
    )
    expect(PHASE_TABLE.tregua.lambdaScale).toBeLessThan(0.2)
    expect(PHASE_TABLE.neutralizado.lambdaScale).toBe(0)
  })

  it('nadie baja a rescatar cuando la carrera está decidiéndose', () => {
    for (const f of ['aproximacion', 'decisivo', 'desenlace'] as Phase[]) {
      expect(`${f}: ${PHASE_TABLE[f].rescate}`).toBe(`${f}: false`)
    }
  })

  it('LA ETAPA CORTA DE MONTAÑA no añade una guarda: TACHA dos', () => {
    // Por debajo de `shortMountainKm` con más de media etapa en cuesta no hay día para cazar nada,
    // así que la carrera pasa de `salida` a `decisivo` sin `fuga` ni `control` por medio.
    const corta = { ...base, shortMountain: true }
    expect(phaseOf(corta)).toBe('decisivo')
    expect(phaseOf({ ...corta, dayBreakFormed: false })).toBe('decisivo')
    // …pero la SALIDA se conserva: lo que se salta son las fases de espera, no el arranque.
    expect(phaseOf({ ...corta, km: 10, dayBreakFormed: false })).toBe('salida')
    // …y lo que la carretera esté haciendo sigue mandando por encima.
    expect(phaseOf({ ...corta, kmToGo: 8 })).toBe('desenlace')
  })

  it('el interruptor se queda APAGADO, y lo está con su medida delante', () => {
    /**
     * R19 está entero, escrito y medido. Encendido, hace lo que promete —los intentos suben de 15,0
     * a 16,9, los de después del km 100 de 8,3 a 9,1 y el contraataque tras la captura de 16 % a
     * 34 %— y **se lleva por delante el guardarraíl de saturación de las clásicas**: las pájaras de
     * Il Lombardia pasan de 11,2 % a 17,7 % con doce semillas, contra un techo de 12 %.
     *
     * No es una columna mal calibrada: quitando una a una las cuatro de la tabla el destrozo sigue
     * ahí. El paso 5 retira cuatro vetos, y la primera explicación fue que **su precio llega en el
     * paso 6** (`payable` y `closingBusyDamp`, R19.4, escrito así en el propio diseño).
     *
     * **El paso 6 la desmintió**: con ese precio puesto, las pájaras de Lombardia se quedan en
     * 17,0 % contra el 17,7 % sin él. Siete décimas. Así que el interruptor sigue apagado y lo que
     * falta por probar es la subasta del frente de R20 (paso 9), que decide **quién hace el
     * trabajo** en vez de cuánto estaría dispuesto a pagar. Ver docs/balance.md «v60 §6».
     *
     * Se aplica la regla de la casa —«si el cambio saca un objetivo de banda, el que está mal es el
     * cambio»— y el interruptor se queda apagado hasta el paso 6. La medida entera está en
     * docs/balance.md «v60 §5».
     */
    expect(STAGE.phases.enabled).toBe(false)
  })
})
