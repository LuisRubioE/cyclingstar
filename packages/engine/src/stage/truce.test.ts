import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import {
  type RescueBid,
  feedStarveFactor,
  mateSeesTrouble,
  pullerCollapsed,
  rescueBranch,
  rescueMen,
  taponLossS,
  taponVictim,
  threeKmRule,
  truceGranted,
} from './truce.js'

const bid = {
  phase: 'control' as const,
  kmToGo: 90,
  abanicoAbierto: false,
  onClimb: false,
  goodwill: 0,
  mejorGananciaS: 0,
}

describe('la tregua se pide, no se dispara (R12.2)', () => {
  it('con la carrera tranquila y el que pide sin deudas, se concede', () => {
    expect(truceGranted(bid)).toBe(true)
  })

  it('y NO se concede cuando la carrera ya se está decidiendo', () => {
    expect(truceGranted({ ...bid, phase: 'decisivo' })).toBe(false)
    expect(truceGranted({ ...bid, phase: 'desenlace' })).toBe(false)
    expect(truceGranted({ ...bid, kmToGo: 10 })).toBe(false)
  })

  it('ni en pleno abanico ni cuesta arriba: ahí no hay tregua que valga', () => {
    expect(truceGranted({ ...bid, abanicoAbierto: true })).toBe(false)
    expect(truceGranted({ ...bid, onClimb: true })).toBe(false)
  })

  it('al que se portó mal no se la conceden, y eso se cobra al día siguiente', () => {
    expect(truceGranted({ ...bid, goodwill: -1 })).toBe(false)
  })

  it('Y CON MEDIO MINUTO SOBRE LA MESA, NADIE LEVANTA EL PIE: eso es la emboscada', () => {
    expect(truceGranted({ ...bid, mejorGananciaS: 29 })).toBe(true)
    expect(truceGranted({ ...bid, mejorGananciaS: 30 })).toBe(false)
  })
})

describe('el rescate es UNA función con cuatro ramas (R12.4)', () => {
  const base: RescueBid = {
    gapS: 40,
    leales: 5,
    esGcLeader: false,
    esCartaDeEtapa: false,
    huboPercance: false,
    granFavorito: false,
    cotaDeSprinter: false,
    tercerHombreDeEquipos: false,
  }

  it('por la general se baja con el hueco de siempre', () => {
    expect(rescueBranch({ ...base, esGcLeader: true })).toBe('general')
    expect(rescueBranch({ ...base, esGcLeader: true, gapS: 10 })).toBeNull()
  })

  it('POR LA ETAPA CASI NUNCA: hacen falta las cuatro puertas', () => {
    const carta = {
      ...base,
      esCartaDeEtapa: true,
      huboPercance: true,
      granFavorito: true,
      gapS: 50,
    }
    expect(rescueBranch(carta)).toBe('etapa-percance')
    expect(rescueBranch({ ...carta, huboPercance: false })).toBeNull()
    expect(rescueBranch({ ...carta, granFavorito: false })).toBeNull()
    expect(rescueBranch({ ...carta, gapS: 120 })).toBeNull()
  })

  it('al velocista descolgado en una cota no le hace falta percance: la cota ES la causa', () => {
    expect(rescueBranch({ ...base, cotaDeSprinter: true, gapS: 80 })).toBe('cota-sprinter')
    expect(rescueBranch({ ...base, cotaDeSprinter: true, gapS: 120 })).toBeNull()
  })

  it('y por el tercer hombre de la clasificación por equipos baja UNO, y cerca', () => {
    expect(rescueBranch({ ...base, tercerHombreDeEquipos: true, gapS: 40 })).toBe('equipos')
    expect(rescueBranch({ ...base, tercerHombreDeEquipos: true, gapS: 60 })).toBeNull()
    expect(rescueMen('equipos', { ...base, tercerHombreDeEquipos: true })).toBe(1)
  })

  it('SI NO SE CUMPLE NINGUNA, NO BAJA NADIE. Ésa es la parte que no se generaliza', () => {
    expect(rescueBranch(base)).toBeNull()
    expect(rescueBranch({ ...base, esGcLeader: true, leales: 0 })).toBeNull()
  })

  it('bajan más cuanto más lejos está, pero NUNCA todos', () => {
    const jefe = { ...base, esGcLeader: true, leales: 5 }
    expect(rescueMen('general', { ...jefe, gapS: 30 })).toBe(1)
    expect(rescueMen('general', { ...jefe, gapS: 100 })).toBe(3)
    expect(rescueMen('general', { ...jefe, gapS: 600 })).toBe(4)
    expect(rescueMen('general', { ...jefe, gapS: 600, leales: 1 })).toBe(1)
  })
})

describe('la regla de los 3 km (R12.5)', () => {
  it('se aplica en un final llano y no en uno en alto ni en la crono', () => {
    expect(threeKmRule(2, 'sprint_masivo')).toBe(true)
    expect(threeKmRule(2, 'alto')).toBe(false)
    expect(threeKmRule(2, 'crono')).toBe(false)
    expect(threeKmRule(2, 'solitario')).toBe(false)
  })

  it('y el jurado la puede declarar más lejos en un final peligroso', () => {
    expect(threeKmRule(4, 'sprint_masivo')).toBe(false)
    expect(threeKmRule(4, 'sprint_masivo', 5)).toBe(true)
  })
})

describe('el tapón (R12.6)', () => {
  it('atrapa a los de DETRÁS del caído, no a los de delante', () => {
    expect(taponVictim(0.5, 0.4)).toBe(true)
    expect(taponVictim(0.3, 0.4)).toBe(false)
    expect(taponVictim(0.9, 0.4)).toBe(false)
  })

  it('y el que va justo detrás se lo come entero', () => {
    expect(taponLossS(0.4, 0.4)).toBe(STAGE.truce.taponLossMaxS)
    expect(taponLossS(0.65, 0.4)).toBe(STAGE.truce.taponLossMinS)
    expect(taponLossS(0.5, 0.4)).toBeGreaterThan(STAGE.truce.taponLossMinS)
  })
})

describe('el hundimiento observable (R13)', () => {
  it('el gregario se aparta al VER, antes de que el hueco exista', () => {
    expect(mateSeesTrouble(STAGE.truce.mateWatchDriftS)).toBe(true)
    expect(mateSeesTrouble(1)).toBe(false)
    // Y el disparador salta ANTES que el hueco de 22 s, que es toda la gracia.
    expect(STAGE.truce.mateWatchDriftS).toBeLessThan(STAGE.regroupGapSeconds)
  })

  it('el que tira hasta apagarse sale del turno', () => {
    expect(pullerCollapsed(10, 100)).toBe(true)
    expect(pullerCollapsed(20, 100)).toBe(false)
    expect(pullerCollapsed(0, 0)).toBe(true)
  })

  it('y no comer multiplica el dado de la pájara', () => {
    expect(feedStarveFactor(30)).toBe(1)
    expect(feedStarveFactor(80)).toBe(STAGE.truce.feedStarveGain)
  })
})

/**
 * ————— EL VALOR DE `ambushGainShare` QUEDA ATADO A SU MEDIDA (v82) —————
 *
 * Este sello no vigila una conducta: vigila que **el número y su bitácora no se separen**, y existe
 * por un error concreto que conviene dejar escrito.
 *
 * La v82 midió esta constante contra `truceGrantedPct` —que hubo que construir, porque el ancla que
 * la constante citaba no existía en el repositorio— y la movió de 0,50 a 0,35. El commit se hizo, se
 * empujó, y **no contenía el cambio**: un barrido que corría en segundo plano hace copia de
 * `constants.ts` al empezar y la RESTAURA al acabar, y la edición cayó dentro de esa ventana. El
 * mensaje del commit afirmaba un cambio que el commit no traía, y las dos suites pasaron en verde
 * porque ninguna miraba este valor.
 *
 * La propia `docs/balance.md` ya tenía anotado el riesgo —«los dos no pueden correr a la vez: se
 * pisan el fichero»— y la nota no bastó, porque una nota no falla. Un test sí.
 *
 * NO se sella el porcentaje: con 34 treguas por celda arrastra ±15 puntos, y eso está dicho en
 * `constants.ts`. Lo que se sella es la celda de la curva que se eligió, que es lo que se puede
 * perder en silencio.
 */
describe('la emboscada está donde su medida dice (R12)', () => {
  it('`ambushGainShare` vale la celda que el barrido eligió', () => {
    expect(STAGE.truce.ambushGainShare).toBe(0.35)
  })

  it('…y esa celda está en el tramo que concede treguas, no en el que las niega', () => {
    // Las celdas medidas: 0,20 → 85,3 % · 0,30 → 79,4 % · 0,35 → 70,6 % · 0,40 → 47,2 % ·
    // 0,50 → 31,6 % · 0,70 → 15,4 %, contra una banda de 50-85 %. Por debajo de 0,40 se concede
    // dentro de banda; de 0,40 en adelante, no. Esto sella el LADO, que es lo que la curva sostiene
    // sin discusión, y deja el valor exacto al sello de arriba.
    expect(STAGE.truce.ambushGainShare).toBeLessThan(0.4)
    expect(STAGE.truce.ambushGainShare).toBeGreaterThan(0.15)
  })
})
