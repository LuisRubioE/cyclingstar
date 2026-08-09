import { describe, expect, it } from 'vitest'
import {
  applyDailyLoad,
  fitnessFactor,
  formIndex,
  freshnessBar,
  illnessProbability,
  mForm,
  regressMorale,
  tauFatigue,
  tsbFactor,
} from './banister.js'
import { HEALTH } from './constants.js'

const near = (value: number, expected: number) => expect(value).toBeCloseTo(expected, 2)

describe('banister: constantes de tiempo (SPEC 4)', () => {
  it('tauFatiga es 5 con REC=100 y 10 con REC=0', () => {
    expect(tauFatigue(100)).toBe(5)
    expect(tauFatigue(0)).toBe(10)
    expect(tauFatigue(50)).toBe(7.5)
  })
})

describe('banister: aplicar carga diaria (SPEC 4)', () => {
  it('desde el estado inicial 45/45, TSS=90, REC=100', () => {
    const result = applyDailyLoad({ ctl: 45, atl: 45 }, 90, 100)
    // TSB se calcula antes de aplicar la carga.
    expect(result.tsb).toBe(0)
    // ATL = 45 + (90-45)/5 = 54
    near(result.atl, 54)
    // CTL = 45 + (90-45)/42 = 46.0714
    near(result.ctl, 46.0714)
  })

  it('un día de descanso (TSS=0) baja ATL más rápido que CTL', () => {
    const result = applyDailyLoad({ ctl: 60, atl: 80 }, 0, 100)
    expect(result.tsb).toBe(-20)
    near(result.atl, 64) // 80 + (0-80)/5
    near(result.ctl, 58.5714) // 60 + (0-60)/42
  })
})

describe('banister: forma (SPEC 4.1)', () => {
  it('tsbF cubre los tramos', () => {
    expect(tsbFactor(-40)).toBe(0)
    near(tsbFactor(-10), 0.55)
    near(tsbFactor(5), 0.95)
    expect(tsbFactor(10)).toBe(1) // meseta óptima
    near(tsbFactor(35), 0.65)
    expect(tsbFactor(40)).toBe(0.55)
  })

  it('formIndex y M_form en el estado inicial', () => {
    near(fitnessFactor(45), 0.4737)
    // tsbF(0) = lerp(0.55,0.95,(10)/15) = 0.8167
    near(formIndex(45, 0), 0.6622)
    near(mForm(45, 0), 1.006)
  })

  it('la barra de frescura se satura arriba y no toca el suelo abajo', () => {
    near(freshnessBar(0), 55)
    expect(freshnessBar(60)).toBe(100)
    // La zona lineal (por encima de la rodilla) es EXACTAMENTE la de siempre: es donde el jugador
    // afina el pico de forma y no debe cambiar ni un punto.
    near(freshnessBar(-20), 33)
    near(freshnessBar(20), 77)
  })

  it('la barra de frescura SIGUE moviéndose por debajo de TSB -50', () => {
    // Era `clamp(55 + 1.1·TSB, 0, 100)` y moría en -50, pero correr lleva el TSB a -80/-100: la
    // barra pasaba días clavada en 0 mientras el corredor SÍ se recuperaba. Esa era la queja del
    // dueño ("hice descanso activo y no mejoró mi frescura"). Ahora cada día de descanso se ve.
    const deep = [-50, -64, -80, -110]
    for (let i = 1; i < deep.length; i++) {
      expect(freshnessBar(deep[i - 1]!)).toBeGreaterThan(freshnessBar(deep[i]!))
    }
    expect(freshnessBar(-110)).toBeGreaterThan(0)
    expect(freshnessBar(-50)).toBeLessThan(20)
  })

  it('la cola de la frescura empalma con la recta sin escalón', () => {
    const knee = -20
    const eps = 0.001
    // Continua en valor y en pendiente: la rodilla no se nota al mirar el gráfico.
    expect(Math.abs(freshnessBar(knee + eps) - freshnessBar(knee - eps))).toBeLessThan(0.01)
    const slopeUp = (freshnessBar(knee + 1) - freshnessBar(knee)) / 1
    const slopeDown = (freshnessBar(knee) - freshnessBar(knee - 1)) / 1
    expect(Math.abs(slopeUp - slopeDown)).toBeLessThan(0.05)
  })
})

describe('banister: salud y moral (SPEC 4.3, 4.4)', () => {
  it('el riesgo de enfermar crece al hundirse el TSB', () => {
    // TSB=-40, fragilidad 1.4 -> ~2% diario (SPEC 4.3).
    near(illnessProbability(1.4, -40), 0.0202)
    // Con TSB alto el riesgo es mínimo.
    expect(illnessProbability(1.0, 10)).toBeCloseTo(0.002, 3)
  })

  it('el riesgo de enfermar tiene techo: nunca es una certeza', () => {
    // Sin techo la exponencial cruzaba 1,0 en TSB -78, que es territorio normal tras un par de
    // etapas de montaña: enfermar dejaba de ser un riesgo para ser un peaje seguro el primer día
    // que el corredor entrenase. Con techo sigue siendo malo, pero es una tirada, no una condena.
    expect(illnessProbability(1, -78)).toBeLessThan(0.2)
    expect(illnessProbability(2, -300)).toBeLessThanOrEqual(HEALTH.illnessMax)
    // Y la banda del ENTRENAMIENTO (-20 a -45), donde estaba calibrado el castigo al
    // sobreentrenamiento, no se toca: el techo solo corta la cola que produce competir.
    near(illnessProbability(1.4, -40), 0.0202)
  })

  it('la moral regresa hacia 60', () => {
    near(regressMorale(100), 98.8) // 100 + (60-100)*0.03
    near(regressMorale(20), 21.2) // 20 + (60-20)*0.03
  })
})
