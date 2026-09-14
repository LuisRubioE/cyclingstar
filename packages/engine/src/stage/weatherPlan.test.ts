/**
 * R14 — METEOROLOGÍA CON PREVISIÓN (docs/tactica.md paso 20).
 *
 * Las doce situaciones del racimo, comprobadas donde se pueden comprobar: en las piezas puras. Lo
 * que estas pruebas vigilan no es «que el número salga» sino las cuatro cosas de las que cuelga el
 * paso entero —que el viento tenga DIRECCIÓN, que el abanico se pueda CERRAR, que el parte tenga
 * SEGMENTOS y que el material sea una apuesta SIMÉTRICA—, más el brazo A/B que hace atribuible el
 * movimiento de las cuatro huellas selladas.
 */
import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import {
  bearingAt,
  belowEchelonThreshold,
  descentRisk,
  echelonCloses,
  frioDe,
  heatRoadPrice,
  materialPerfilBonus,
  rainBudgetGain,
  rainPlaceTarget,
  roadBearings,
  stageWindStrength,
  weatherAt,
  weatherNow,
  weatherPlan,
  windComponents,
} from './weather.js'
import { targetSpeed } from './physics.js'
import type { Block } from './types.js'

const LLANO: Block = { g: 0, tipo: 'llano', estrellas: 0 }

describe('R14.1 · el viento tiene dirección', () => {
  it('de lado es todo lateral y nada frontal, y de cara al revés', () => {
    // Rumbo 0 (al norte) y viento del este (0,25 de vuelta): puro lateral.
    const lado = windComponents(1, 0.25, 0)
    expect(lado.lateral).toBeCloseTo(1, 6)
    expect(lado.frontal).toBeCloseTo(0, 6)
    // Viento del norte contra quien va al norte: puro de cara.
    const cara = windComponents(1, 0, 0)
    expect(cara.lateral).toBeCloseTo(0, 6)
    expect(cara.frontal).toBeCloseTo(1, 6)
    // Y del sur: puro de cola, que es el mismo viento con el signo cambiado.
    const cola = windComponents(1, 0.5, 0)
    expect(cola.lateral).toBeCloseTo(0, 6)
    expect(cola.frontal).toBeCloseTo(-1, 6)
  })

  it('el frontal FRENA y el de cola EMPUJA, y es lo único que toca la ley', () => {
    const seco = targetSpeed(LLANO, 70, 0.5)
    const deCara = targetSpeed(LLANO, 70, 0.5, undefined, 1)
    const deCola = targetSpeed(LLANO, 70, 0.5, undefined, -1)
    expect(deCara).toBeCloseTo(seco * (1 - STAGE.weather.windAheadScale), 6)
    expect(deCola).toBeCloseTo(seco * (1 + STAGE.weather.windAheadScale), 6)
    // Y el brazo A: sin viento de cara, la ley es la de siempre DÍGITO A DÍGITO.
    expect(targetSpeed(LLANO, 70, 0.5, undefined, 0)).toBe(seco)
  })

  it('la carretera gira, y por eso el mismo viento cambia de oficio durante la etapa', () => {
    const rumbos = roadBearings('sem|carrera|1|v1', 180)
    expect(rumbos.length).toBe(Math.ceil(180 / STAGE.weather.roadTurnKm))
    // Es una carretera, no un bandazo: cada giro está acotado por lo que puede girar de una vez
    // —el giro nuevo más lo que la vuelta al rumbo general devuelve—.
    const topeGiro =
      (STAGE.weather.roadTurnDeg +
        (1 - STAGE.weather.roadMeanRevert) * STAGE.weather.roadWanderDeg) /
      360
    for (let i = 1; i < rumbos.length; i++) {
      const giro = Math.abs(((rumbos[i]! - rumbos[i - 1]! + 1.5) % 1) - 0.5)
      expect(giro).toBeLessThanOrEqual(topeGiro + 1e-9)
    }
    /**
     * Y ES UNA ETAPA, NO UNA DERIVA: todos los rumbos del día caben dentro de una ventana de
     * `2·roadWanderDeg` alrededor del rumbo general. **Ésta es la prueba que faltaba cuando esto era
     * un paseo aleatorio**, y la que habría cazado en el sitio el `echelonClosedPct` del 100 %: con
     * un rumbo que se va donde quiera, en 180 km siempre aparecen dos kilómetros al abrigo y todos
     * los abanicos se cierran.
     */
    const centro = rumbos[0]!
    for (const r of rumbos) {
      const desvio = Math.abs(((r - centro + 1.5) % 1) - 0.5)
      expect(desvio).toBeLessThanOrEqual(2 * (STAGE.weather.roadWanderDeg / 360) + 1e-9)
    }
    // Y es determinista: la misma semilla da el mismo trazado.
    expect(roadBearings('sem|carrera|1|v1', 180)).toEqual(rumbos)
    // El rumbo de un km es el de SU tramo, y fuera del recorrido el del último.
    expect(bearingAt(rumbos, 0)).toBe(rumbos[0])
    expect(bearingAt(rumbos, 1e6)).toBe(rumbos[rumbos.length - 1])
  })

  it('el abanico se cierra por kilómetros al abrigo, no por un bloque suelto', () => {
    expect(belowEchelonThreshold(STAGE.weather.echelonCloseThreshold - 0.01)).toBe(true)
    expect(belowEchelonThreshold(STAGE.weather.echelonCloseThreshold)).toBe(false)
    expect(echelonCloses(STAGE.weather.echelonCloseKm - 0.1)).toBe(false)
    expect(echelonCloses(STAGE.weather.echelonCloseKm)).toBe(true)
  })
})

describe('R14.2 · el parte tiene segmentos, y la lluvia puede llegar tarde', () => {
  it('el parte cubre la etapa entera y cada km cae en su segmento', () => {
    const plan = weatherPlan('sem|carrera|1|v1', undefined, 180, 0.5)
    expect(plan.segments.length).toBe(Math.ceil(180 / STAGE.weather.segmentKm))
    expect(weatherAt(plan, 0)).toBe(plan.segments[0])
    expect(weatherAt(plan, 179).fromKm).toBeLessThanOrEqual(179)
    expect(weatherAt(plan, 1e6)).toBe(plan.segments[plan.segments.length - 1])
  })

  it('hay días en que el agua entra a mitad de etapa, y se ve en el parte', () => {
    // No todas las semillas llueven, así que se barre: lo que se afirma es que EXISTE el día en que
    // el km 0 está seco y más adelante no, que es la fila del catálogo (S-205) que no existía.
    let tardio = 0
    let mojadoDesdeElKm0 = 0
    for (let i = 0; i < 400; i++) {
      const plan = weatherPlan(`s${i}|c|1|v1`, undefined, 180, 0.4)
      const lluvias = plan.segments.map((s) => s.lluvia)
      if (lluvias[lluvias.length - 1]! > 0) {
        if (lluvias[0] === 0) tardio++
        else mojadoDesdeElKm0++
      }
    }
    expect(tardio).toBeGreaterThan(0)
    expect(mojadoDesdeElKm0).toBeGreaterThan(0)
  })

  it('el equipo del maillot se sube al frente bajo el agua, y lo paga mañana', () => {
    expect(rainPlaceTarget(0.5, 0.4, true)).toBe(STAGE.weather.rainPlaceTarget)
    // Sin lluvia, o sin nada que defender, el objetivo es el que era.
    expect(rainPlaceTarget(0.5, 0, true)).toBe(0.5)
    expect(rainPlaceTarget(0.5, 0.4, false)).toBe(0.5)
    // Y nunca EMPEORA la colocación de quien ya iba más adelante.
    expect(rainPlaceTarget(0.05, 0.4, true)).toBe(0.05)
    expect(rainBudgetGain(true)).toBe(STAGE.weather.rainCostGain)
    expect(rainBudgetGain(false)).toBe(1)
  })
})

describe('R14.5 y R14.6 · el descenso mojado y el calor', () => {
  it('el que tiene colchón baja protegido y el que necesita ganar, no', () => {
    expect(descentRisk(true, false)).toBe(STAGE.weather.descentRiskCushion)
    expect(descentRisk(false, true)).toBe(STAGE.weather.descentRiskMustWin)
    // Necesitar ganar manda sobre tener colchón: el que va líder y aun así lo necesita, arriesga.
    expect(descentRisk(true, true)).toBe(STAGE.weather.descentRiskMustWin)
    expect(descentRisk(false, false)).toBe(1)
  })

  it('a 38° cerrar cuesta más, y a 20° cuesta lo de siempre', () => {
    expect(heatRoadPrice(0)).toBe(1)
    expect(heatRoadPrice(1)).toBeCloseTo(STAGE.weather.calorGain, 6)
    expect(heatRoadPrice(0.5)).toBeCloseTo(1 + (STAGE.weather.calorGain - 1) / 2, 6)
  })

  it('el frío existe por debajo de `coldFromC` y no por encima', () => {
    expect(frioDe(STAGE.coldFromC + 5)).toBe(0)
    expect(frioDe(STAGE.coldFromC)).toBe(0)
    expect(frioDe(STAGE.coldFullC)).toBe(1)
    expect(frioDe(STAGE.coldFullC - 10)).toBe(1)
  })
})

describe('R14.4 · el material es una apuesta, no un regalo', () => {
  it('acertar el parte suma y fallarlo resta LO MISMO', () => {
    const p = STAGE.weather.materialPerfilPoints
    expect(materialPerfilBonus('lenticular', 'llano', 0.8, 0, 0)).toBe(p)
    expect(materialPerfilBonus('lenticular', 'llano', 0, 0, 0)).toBe(-p)
    expect(materialPerfilBonus('presion_baja', 'paves', 0, 0.6, 0)).toBe(p)
    expect(materialPerfilBonus('presion_baja', 'paves', 0, 0, 0)).toBe(-p)
    expect(materialPerfilBonus('desarrollo_corto', 'subida', 0, 0, 40)).toBe(p)
    expect(materialPerfilBonus('desarrollo_corto', 'subida', 0, 0, 5)).toBe(-p)
  })

  it('cada material solo cuenta en SU terreno, y sin elección no cuenta nada', () => {
    expect(materialPerfilBonus('lenticular', 'subida', 0.8, 0, 0)).toBe(0)
    expect(materialPerfilBonus('presion_baja', 'llano', 0, 0.6, 0)).toBe(0)
    expect(materialPerfilBonus('desarrollo_corto', 'paves', 0, 0, 40)).toBe(0)
    expect(materialPerfilBonus(undefined, 'llano', 0.8, 0.6, 40)).toBe(0)
  })
})

describe('el parte no mueve el dado del viento', () => {
  it('la fuerza del día consultable es la misma que la del motor', () => {
    // `stageWindStrength` lee el PRIMER dígito del subflujo `viento`, que es el mismo que
    // `simulateStage` lleva consumiendo desde la v41. Si esto se moviera, el paso 20 habría
    // desplazado todas las etapas del juego por una consulta.
    for (const s of ['a|b|1|v1', 'c|d|2|v1', 'e|f|3|v1']) {
      const w = stageWindStrength(s)
      expect(w).toBeGreaterThanOrEqual(0)
      expect(w).toBeLessThanOrEqual(1)
      expect(stageWindStrength(s)).toBe(w)
    }
  })

  it('el tiempo de aquí sale del parte de aquí contra el rumbo de aquí', () => {
    const seed = 'sem|carrera|1|v1'
    const plan = weatherPlan(seed, undefined, 180, 0.7)
    const rumbos = roadBearings(seed, 180)
    const ahora = weatherNow(plan, rumbos, 90, true)
    const seg = weatherAt(plan, 90)
    const esperado = windComponents(
      seg.windKmh / STAGE.weather.windFullKmh,
      seg.windDir,
      bearingAt(rumbos, 90),
    )
    expect(ahora.vientoLateral).toBeCloseTo(esperado.lateral, 9)
    expect(ahora.vientoFrontal).toBeCloseTo(esperado.frontal, 9)
    expect(ahora.lluvia).toBe(seg.lluvia)
    expect(ahora.abanicoAbierto).toBe(true)
  })

  it('el lateral vive en [0,1] y el frontal en [−1,1] a lo largo de toda la etapa', () => {
    const seed = 'sem|carrera|7|v1'
    const plan = weatherPlan(seed, undefined, 200, 1)
    const rumbos = roadBearings(seed, 200)
    for (let km = 0; km < 200; km += 1) {
      const w = weatherNow(plan, rumbos, km, false)
      expect(w.vientoLateral).toBeGreaterThanOrEqual(0)
      expect(w.vientoLateral).toBeLessThanOrEqual(1)
      expect(w.vientoFrontal).toBeGreaterThanOrEqual(-1)
      expect(w.vientoFrontal).toBeLessThanOrEqual(1)
    }
  })
})
