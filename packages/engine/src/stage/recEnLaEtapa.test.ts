import { ATTRIBUTES, type Attribute } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import {
  type Eff,
  deepDepletionThreshold,
  isDeepDepleted,
  matchCount,
  matchTsbPenaltyThreshold,
} from './physics.js'

/**
 * REC EN LA FÍSICA DE LA ETAPA, Y CRI EN EL SOLITARIO (v62, decisiones 4 y 5 del dueño;
 * docs/entrenamiento.md §6).
 *
 * Los tres cambios van juntos y por eso se prueban juntos. Lo que hay que comprobar de los dos de
 * REC no es que muevan algo —eso lo dicen los bancos— sino que estén **CENTRADOS en 50**: el REC
 * medio del campo es ≈ 50, así que redistribuyen cerillos entre corredores en vez de dárselos o
 * quitárselos al pelotón entero. Si no lo estuvieran, el cambio sería una subida o una bajada
 * encubierta del nivel de todo el mundo.
 */

const eff = (v: number, rec = 50): Eff =>
  Object.fromEntries(ATTRIBUTES.map((a) => [a, a === 'REC' ? rec : v])) as Record<Attribute, number>

describe('engine: el vaciado profundo sabe quién recupera', () => {
  it('REC 50 da EXACTAMENTE el umbral plano de antes, que es lo que lo hace un cambio y no un salto', () => {
    // 0,06 + 0,12·(1 − 50/100) = 0,12. El corredor medio no nota nada, y por eso lo que se mide
    // después es una redistribución y no un desplazamiento.
    expect(deepDepletionThreshold(50)).toBeCloseTo(0.12, 10)
  })

  it('al que recupera bien hay que vaciarlo MUCHO más para que lo pague mañana', () => {
    expect(deepDepletionThreshold(90)).toBeCloseTo(0.072, 10)
    expect(deepDepletionThreshold(20)).toBeCloseTo(0.156, 10)
    // El mismo final de etapa: el frágil arranca mañana con un cerillo menos y el otro no.
    expect(isDeepDepleted(13, 100, 20)).toBe(true)
    expect(isDeepDepleted(13, 100, 90)).toBe(false)
  })

  it('el `rec = 50` por defecto NO cambia la conducta de quien todavía no lo pasa', () => {
    // Importa: hay llamantes que no saben el REC del corredor. Tienen que comportarse como siempre,
    // no cambiar en silencio.
    expect(isDeepDepleted(11, 100)).toBe(isDeepDepleted(11, 100, 50))
    expect(isDeepDepleted(13, 100)).toBe(false)
  })

  it('un depósito de cero no revienta ni miente', () => {
    expect(isDeepDepleted(0, 0, 90)).toBe(false)
  })
})

describe('engine: el umbral de TSB de los cerillos sabe quién recupera', () => {
  it('está centrado en 50: el corredor medio sigue en −25', () => {
    expect(matchTsbPenaltyThreshold(50)).toBe(STAGE.matchTsbPenaltyBase)
    expect(matchTsbPenaltyThreshold(90)).toBeCloseTo(-33, 10)
    expect(matchTsbPenaltyThreshold(30)).toBeCloseTo(-21, 10)
  })

  it('con el MISMO TSB, el que recupera conserva su cerillo y el otro no', () => {
    // −28 está entre los dos umbrales: castiga al de REC 30 y no al de REC 90. Es exactamente la
    // decisión que el −25 plano no sabía tomar.
    const conRec = matchCount(eff(70, 90), -28)
    const sinRec = matchCount(eff(70, 30), -28)
    expect(`el que recupera aguanta más: ${conRec > sinRec}`).toBe(
      'el que recupera aguanta más: true',
    )
  })

  it('y a TSB normal los dos llevan los mismos: no es una subida encubierta de nivel', () => {
    expect(matchCount(eff(70, 90), 0)).toBe(matchCount(eff(70, 30), 0))
  })

  it('nunca se baja del mínimo, ni acumulando los dos castigos', () => {
    const peor = matchCount(eff(20, 20), -60, true)
    expect(peor).toBe(STAGE.matchMin)
  })
})

describe('engine: el que llega solo corre contra el crono', () => {
  it('CRI entra en el remate `solitario`, y sale de RES y LLA', () => {
    const w = STAGE.finishWeights.solitario as Record<string, number>
    expect(w.CRI).toBe(0.15)
    // Las dos que hacían de CRI sin llamarse CRI ceden lo que él ocupa.
    expect(w.RES).toBe(0.3)
    expect(w.LLA).toBe(0.2)
  })

  it('los pesos siguen sumando 1, que es lo que hace comparables los remates entre sí', () => {
    for (const [tipo, pesos] of Object.entries(STAGE.finishWeights)) {
      const suma = Object.values(pesos as Record<string, number>).reduce((a, b) => a + b, 0)
      expect(`${tipo}: ${Math.abs(suma - 1) < 1e-9} (${suma.toFixed(3)})`).toBe(
        `${tipo}: true (${suma.toFixed(3)})`,
      )
    }
  })
})
