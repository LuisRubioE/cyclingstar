import { describe, expect, it } from 'vitest'
import type { Attribute } from '@cyclingstar/shared'
import {
  blockCost,
  blockPerfil,
  blockSeconds,
  costBase,
  draftMax,
  effNow,
  erosion,
  matchCount,
  stepSpeed,
  targetSpeed,
  vRef,
} from './physics.js'
import { STAGE } from '../constants.js'
import type { Block } from './types.js'

/** eff0 uniforme de valor `v` para todos los atributos, salvo los que se sobreescriban. */
function eff(v: number, over: Partial<Record<Attribute, number>> = {}): Record<Attribute, number> {
  return {
    RES: v,
    REC: v,
    LLA: v,
    MON: v,
    COL: v,
    CRI: v,
    SPR: v,
    DES: v,
    PAV: v,
    TAC: v,
    ...over,
  }
}

const block = (tipo: Block['tipo'], g: number, estrellas = 0): Block => ({ tipo, g, estrellas })

describe('ley de velocidad (6.4)', () => {
  it('en subida mezcla escalada y llano según w(g)', () => {
    const climber = eff(40, { MON: 80, LLA: 40 })
    // g = 8 -> w = clamp((8-2)/6) = 1.0: manda la escalada.
    expect(blockPerfil(climber, block('subida', 8))).toBeCloseTo(80)
    // g = 2 -> w = 0.15: casi todo llano.
    expect(blockPerfil(climber, block('subida', 2))).toBeCloseTo(0.15 * 80 + 0.85 * 40)
  })

  it('en muros usa COL en vez de MON', () => {
    const puncheur = eff(40, { MON: 50, COL: 90 })
    expect(blockPerfil(puncheur, block('subida', 10), true)).toBeCloseTo(90)
  })

  it('vRef cae con la pendiente y satura en los extremos', () => {
    expect(vRef(0, 'llano')).toBe(STAGE.vRefFlat)
    // Subida hiperbólica A/(g+k): la velocidad va como el inverso de la pendiente, de modo que la
    // VAM sale sola en el rango real a cualquier pendiente (docs/motor.md §3-bis-c).
    expect(vRef(8, 'subida')).toBeCloseTo(190 / 11.5)
    expect(vRef(12, 'subida')).toBeCloseTo(190 / 15.5)
    expect(vRef(40, 'subida')).toBe(STAGE.vRefClimbMin) // saturado al mínimo
    expect(vRef(-6, 'descenso')).toBe(55)
  })

  it('la VAM del pelotón de cabeza cae en el rango real a cualquier pendiente', () => {
    // VAM (m/h) = v (km/h) · 1000 · g/100. Referencia: los punteros de una etapa reina (P75 86)
    // subiendo al compromiso de puerto decisivo. Real en el WorldTour: 1.500-1.800 m/h en puertos
    // sostenidos del 8 al 12%. Por encima del 12% ya no hay puertos largos —son muros de pocos
    // minutos, donde manda COL— y ahí la VAM real sí sube de 1.800, así que no se acota.
    for (const g of [8, 10, 12]) {
      const v = targetSpeed(block('subida', g), 86, STAGE.climbRaceCommit)
      const vam = v * 10 * g
      expect(vam).toBeGreaterThanOrEqual(1500)
      expect(vam).toBeLessThanOrEqual(1800)
    }
  })
})

describe('inercia (6.4)', () => {
  it('la coronación (14 -> 55 km/h) toma de 250 a 400 metros', () => {
    // Crest realista: la pendiente se inclina en 2-3 bloques (-1, -3, -6...).
    const gradients = [-1, -3, -6, -6, -6, -6]
    let v = 14
    let metros = 0
    for (const g of gradients) {
      if (v >= 54.5) break
      const dt = blockSeconds(v)
      v = stepSpeed(v, 55, g, dt)
      metros += 100
    }
    expect(metros).toBeGreaterThanOrEqual(250)
    expect(metros).toBeLessThanOrEqual(400)
  })

  it('una rampa del 8% embestida a 45 km/h desangra la velocidad en bloque y medio', () => {
    let v = 45
    let bloques = 0
    // vObj de la rampa ~ 22 km/h.
    while (v > 23 && bloques < 5) {
      const dt = blockSeconds(v)
      v = stepSpeed(v, 22, 8, dt)
      bloques += 1
    }
    expect(bloques).toBeLessThanOrEqual(2) // desangre casi inmediato: bloque y medio
    expect(v).toBeLessThanOrEqual(23)
  })

  it('frenar es más rápido que acelerar (asimetría de las cotas)', () => {
    const dt = 1
    const acelera = stepSpeed(30, 60, 0, dt) - 30 // limitado por ACC_PEDAL = 0.4
    const frena = 30 - stepSpeed(30, 0, 0, dt) // limitado por DEC_MAX = 3.0
    expect(frena).toBeGreaterThan(acelera)
  })

  it('el cerillo activo multiplica la aceleración por 2.5', () => {
    const dt = 1
    const sin = stepSpeed(30, 60, 0, dt) - 30
    const con = stepSpeed(30, 60, 0, dt, { matchActive: true }) - 30
    expect(con).toBeCloseTo(sin * 2.5)
  })

  it('un grupo comprometido rueda más rápido que uno a tempo', () => {
    const b = block('llano', 0)
    expect(targetSpeed(b, 75, 1)).toBeGreaterThan(targetSpeed(b, 75, 0))
    // A P75 = 75 (la referencia) y ritmo(0) = rhythmBase, la objetivo es rhythmBase·vRef.
    expect(targetSpeed(b, 75, 0)).toBeCloseTo(STAGE.rhythmBase * STAGE.vRefFlat)
  })
})

describe('coste y drafting (6.5)', () => {
  it('subir cuesta más que rodar en llano, y bajar cuesta poco', () => {
    expect(costBase(block('subida', 8))).toBeGreaterThan(costBase(block('llano', 0)))
    expect(costBase(block('descenso', -6))).toBeLessThan(costBase(block('llano', 0)))
  })

  it('el pavés cuesta más cuantas más estrellas de dureza', () => {
    expect(costBase(block('paves', 0, 5))).toBeGreaterThan(costBase(block('paves', 0, 1)))
  })

  it('el rebufo abarata el bloque; ir protegido gasta menos que ir solo', () => {
    const b = block('llano', 0)
    const protegido = blockCost(b, 0.5, 0.9)
    const solo = blockCost(b, 0.5, 0.0)
    expect(protegido).toBeLessThan(solo)
  })

  it('el rebufo mengua en subida', () => {
    expect(draftMax(block('subida', 8))).toBeLessThan(draftMax(block('llano', 0)))
  })
})

describe('cerillos (6.6)', () => {
  it('un corredor completo tiene más cerillos que uno modesto', () => {
    const fuerte = eff(90)
    const flojo = eff(40)
    expect(matchCount(fuerte, 0)).toBeGreaterThan(matchCount(flojo, 0))
  })

  it('llegar reventado (TSB < -25) resta un cerillo, con mínimo de 1', () => {
    const r = eff(90)
    expect(matchCount(r, -30)).toBe(matchCount(r, 0) - 1)
    expect(matchCount(eff(20), -30, true)).toBeGreaterThanOrEqual(1)
  })
})

describe('erosión (6.7)', () => {
  it('sin vaciar apreciablemente no hay erosión', () => {
    expect(erosion(95, 100, 50)).toBe(0)
  })

  it('el sprinter erosionado pierde punta antes que el rodador táctico', () => {
    const base = eff(80)
    const e = erosion(20, 100, 50) // muy vaciado
    expect(e).toBeGreaterThan(0)
    const now = effNow(base, e)

    // Ambos caen, pero el SPR (coef 0.45) mucho más que el TAC (coef 0.15).
    expect(now.SPR).toBeLessThan(base.SPR)
    const perdidaSpr = (base.SPR - now.SPR) / base.SPR
    const perdidaTac = (base.TAC - now.TAC) / base.TAC
    expect(perdidaSpr).toBeGreaterThan(perdidaTac)
  })

  it('la erosión tiene techo: con el tanque a cero sigue discriminando', () => {
    // docs/motor.md §VI.1: «≤ 0,92 — jamás 1,000». En 1,000 todos los corredores quedan igual de
    // degradados y el resultado vuelve a ser azar. El techo lo garantiza ahora la propia función,
    // no la calibración: medido, una etapa de montaña real en tercera semana vaciaba el 100% del
    // campo y la erosión llegaba a 1,000 (docs/balance.md).
    expect(erosion(0, 100, 50)).toBe(STAGE.erosionMax)
    expect(erosion(0, 100, 90)).toBe(STAGE.erosionMax)
    // Con el techo puesto, dos corredores distintos siguen llegando a meta distintos.
    const fuerte = effNow(eff(80), erosion(0, 100, 50))
    const flojo = effNow(eff(60), erosion(0, 100, 50))
    expect(fuerte.SPR).toBeGreaterThan(flojo.SPR)
  })

  it('la pájara hunde los atributos físicos pero no la táctica', () => {
    const base = eff(80)
    const now = effNow(base, 0, true)
    expect(now.SPR).toBeCloseTo(80 * 0.55)
    expect(now.TAC).toBeCloseTo(80) // la cabeza no se vacía
  })
})
