import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import {
  type CustomsMove,
  type CustomsTeam,
  customsProbability,
  gcObjection,
  jerseyVetoes,
  leashOf,
  objectionOf,
  pHoy,
  payableOf,
  potOf,
  priceOf,
  recoverableSeconds,
  stageObjection,
  stageThreat,
  threatOf,
} from './customs.js'
import { type MoveContext, pelotonAllowsWithDie } from './tactics.js'
import type { MoveRider } from './tactics.js'

/**
 * LA ADUANA COMO SUBASTA (docs/tactica.md R03) y LA GENERAL VIRTUAL (R04), paso 6.
 *
 * Lo primero que hay que probar aquí **no es la regla nueva: es la hipótesis nula**. Con cero
 * objeciones la aduana tiene que devolver la conducta de hoy, y no «aproximadamente»: la FÓRMULA
 * entera de `pelotonAllows`, con su rampa de arranque, su castigo por tamaño y su techo. Sin ese
 * ancla, cualquier movimiento en `flat.breakawayWinPct` es inatribuible —¿el voto, o la rampa que se
 * cayó por el camino?— y este racimo es justo el que más mueve esa banda.
 */

function ctxDe(km: number, totalKm: number, breakAppeal: number): MoveContext {
  return {
    kind: 'fuga',
    km,
    kmToGo: totalKm - km,
    totalKm,
    groupSize: 100,
    fieldSize: 176,
    gcTerrain: false,
    onClimb: false,
    tension: 0,
    hasGcContext: false,
    breakAppeal,
    gcDefenderId: null,
    gcCushionSeconds: 0,
  }
}

function corredor(id: string, teamId: string | null, deficit: number, remate: number) {
  return { riderId: id, teamId, gcDeficitSeconds: deficit, finishScore: remate }
}

function movimiento(riders: ReturnType<typeof corredor>[], gapSeconds = 0): CustomsMove {
  return { riders, gapSeconds, kind: 'fuga' }
}

function equipo(over: Partial<CustomsTeam> = {}): CustomsTeam {
  return {
    teamId: 't1',
    memberIds: ['t1-a', 't1-b'],
    cardStageId: null,
    cardStageFinishScore: 0,
    cardGcId: null,
    cardGcDeficitSeconds: null,
    presentInPeloton: 5,
    convocados: 5,
    spentFraction: 0,
    // `finishScore`, escala 0-100: es lo que `TeamPlan.quality` guarda de verdad.
    quality: 90,
    leashSeconds: 300,
    ...over,
  }
}

describe('engine: la hipótesis nula de la aduana', () => {
  it('CON CERO OBJECIONES, `pHoy` es `pelotonAllows` término a término', () => {
    // Se comprueba contra la función de verdad, no contra una copia de sus números: para cada
    // combinación se busca el umbral de decisión de `pelotonAllows` con un dado de barrido fino y se
    // compara con `pHoy`. Si alguien toca la rampa de un lado, esto se pone rojo.
    for (const totalKm of [160, 180, 250]) {
      for (const km of [1, 5, 20, 60, 120]) {
        for (const appeal of [0, 0.2, 0.8]) {
          for (const party of [2, 3, 6, 9]) {
            const ctx = ctxDe(km, totalKm, appeal)
            const gente: MoveRider[] = Array.from({ length: party }, (_, i) => ({
              riderId: `r${i}`,
              role: 'libre',
              mentality: 'oportunista',
              perfil: 60,
              finishScore: 50,
              energyFraction: 1,
              matches: 2,
              tac: 50,
              spr: 50,
              gcDeficitSeconds: 0,
              teamAttack: 1,
              pulling: false,
              gastado: false,
            }))
            const p = pHoy(ctx, party)
            // Justo por debajo del umbral hay cuerda; justo por encima, no.
            if (p > 0.001) {
              expect(pelotonAllowsWithDie(gente, ctx, p - 0.001)).toBe(true)
            }
            if (p < 0.999) {
              expect(pelotonAllowsWithDie(gente, ctx, p + 0.001)).toBe(false)
            }
          }
        }
      }
    }
  })

  it('…y `customsProbability` sin equipos devuelve exactamente `pHoy`', () => {
    const ctx = ctxDe(30, 180, 0.2)
    const mov = movimiento([corredor('a', 'x', 0, 50), corredor('b', 'y', 0, 50)])
    expect(customsProbability(ctx, mov, [], 0)).toBe(pHoy(ctx, 2))
  })

  it('LA RAMPA DE ARRANQUE SIGUE VIVA: en el km 1 la cuerda es una fracción de la del km 60', () => {
    // Es el guardarraíl de la regresión de la v39 —«en el 99 % de los casos en el km 1 ataca
    // alguien»—, que este racimo podría deshacer sin que ninguna banda de hoy lo notara.
    const ctx = ctxDe(1, 180, 0.2)
    expect(pHoy(ctx, 3)).toBeLessThan(pHoy(ctxDe(60, 180, 0.2), 3) / 3)
  })
})

describe('engine: el voto de los equipos', () => {
  it('el voto SOLO BAJA la cuerda, nunca la sube', () => {
    const ctx = ctxDe(60, 180, 0.2)
    const mov = movimiento([corredor('a', 'x', 200, 80), corredor('b', 'y', 300, 40)])
    const conVoto = customsProbability(
      ctx,
      mov,
      [equipo({ cardStageId: 'z', cardStageFinishScore: 82 })],
      0,
    )
    expect(conVoto).toBeLessThan(pHoy(ctx, 2))
  })

  it('una CARTA dentro anula la objeción, y un leal cualquiera solo la descuenta', () => {
    const mov = movimiento([corredor('t1-a', 't1', 200, 80)])
    const conCarta = equipo({ cardStageId: 't1-a', cardStageFinishScore: 82 })
    expect(objectionOf(conCarta, mov)).toBe(0)
    // Mismo movimiento, pero el que va dentro es un gregario: la objeción baja, no desaparece.
    const conGregario = equipo({ cardStageId: 't1-z', cardStageFinishScore: 82 })
    expect(objectionOf(conGregario, mov)).toBeCloseTo(1 - STAGE.customs.loyalInside, 6)
  })

  it('el equipo del sprinter NO paga la cuerda de cuatro anónimos, y SÍ la de una fuga hecha', () => {
    // Las dos ramas de `stageObjection`. Sin la segunda, contra nueve rodadores que rematan veinte
    // puntos por debajo de su velocista la objeción vale cero y el equipo no caza nunca: si la fuga
    // llega, no hay sprint, remate quien remate.
    const t = equipo({ cardStageId: 'spr', cardStageFinishScore: 90 })
    const anonimos = movimiento([corredor('a', 'x', 0, 60), corredor('b', 'y', 0, 58)])
    expect(stageObjection(t, anonimos)).toBe(0)
    const hecha = movimiento(anonimos.riders as ReturnType<typeof corredor>[], 90)
    // La segunda rama NO es de la aduana: es de `threatOf`, que decide a quién se persigue. Meterla
    // en la objeción hacía que el movimiento perdiera la cuerda en el kilómetro en que la ganaba.
    expect(stageObjection(t, hecha)).toBe(0)
    expect(stageThreat(t, hecha)).toBe(1)
    expect(threatOf(t, hecha)).toBe(1)
  })

  it('EL TIEMPO CUENTA, no solo los puestos: a 10 s casi nada, a 5 min la objeción máxima', () => {
    const t = equipo({ cardGcId: 'mi-jefe', cardGcDeficitSeconds: 20, leashSeconds: 72 })
    const rival = [corredor('riv', 'z', 0, 50)]
    expect(gcObjection(t, movimiento(rival, 10))).toBeLessThan(0.2)
    expect(gcObjection(t, movimiento(rival, 300))).toBeGreaterThanOrEqual(1)
  })

  it('CERRAR CUESTA (R19.4): el equipo ocupado tiene menos que ofrecer', () => {
    const mov = movimiento([corredor('a', 'x', 0, 50)])
    expect(payableOf(equipo({ closing: true }), mov)).toBeCloseTo(
      payableOf(equipo(), mov) * STAGE.customs.closingBusyDamp,
      6,
    )
  })

  it('un movimiento con el ganador de ayer dentro tiene MENOS cuerda que el mismo sin él', () => {
    // Es la prueba de que la memoria de la aduana no está muerta por construcción: va en la PUJA y
    // no en la objeción, porque con el recorte `min(objeción, payable)` un factor sobre una objeción
    // ya saturada no movía el bote un dígito.
    const ctx = ctxDe(60, 180, 0.2)
    const mov = movimiento([corredor('a', 'x', 0, 80)])
    const base = equipo({ cardStageId: 'z', cardStageFinishScore: 82, quality: 50 })
    const conMemoria = { ...base, hasYesterdayWinner: true }
    expect(potOf([conMemoria], mov)).toBeGreaterThan(potOf([base], mov))
    expect(customsProbability(ctx, mov, [conMemoria], 0)).toBeLessThan(
      customsProbability(ctx, mov, [base], 0),
    )
  })

  it('una fuga numerosa cuesta más de cerrar, y el viento también', () => {
    const tres = movimiento([1, 2, 3].map((i) => corredor(`r${i}`, 'x', 0, 50)))
    const nueve = movimiento(Array.from({ length: 9 }, (_, i) => corredor(`r${i}`, 'x', 0, 50)))
    expect(priceOf(nueve, 0) / priceOf(tres, 0)).toBeCloseTo(1.72, 2)
    expect(priceOf(tres, 1)).toBeGreaterThan(priceOf(tres, 0))
  })
})

describe('engine: el veto del maillot (R03.0)', () => {
  const conLider = movimiento([corredor('lider', 'x', 0, 50), corredor('otro', 'y', 100, 50)])

  it('el maillot NO se va en la fuga, y no es un descuento: es un `return`', () => {
    expect(jerseyVetoes(conLider, true, true)).toBe(true)
  })

  it('…salvo que no le quede un hombre para ejercerlo', () => {
    expect(jerseyVetoes(conLider, true, false)).toBe(false)
  })

  it('…y sin general en juego no hay maillot que valga', () => {
    // En una clásica y en la etapa 1 todos llegan con déficit 0: leerlo literal diría que el pelotón
    // entero lleva el maillot.
    expect(jerseyVetoes(conLider, false, true)).toBe(false)
  })
})

describe('engine: la correa sobre el terreno que queda (R04.2)', () => {
  it('con montaña por delante se deja ir; con la carrera hecha, se caza', () => {
    const dia3 = leashOf(30, {
      kmSubidaRestante: 300,
      kmCronoRestante: 40,
      etapasEnLineaRestantes: 15,
      diasRestantes: 18,
    })
    const dia19 = leashOf(30, {
      kmSubidaRestante: 0,
      kmCronoRestante: 15,
      etapasEnLineaRestantes: 1,
      diasRestantes: 2,
    })
    expect(dia3).toBeGreaterThan(dia19 * 3)
  })

  it('el colchón que la carta YA tiene entra en la correa', () => {
    const shape = {
      kmSubidaRestante: 40,
      kmCronoRestante: 0,
      etapasEnLineaRestantes: 4,
      diasRestantes: 5,
    }
    // Sin esto —y es el defecto medido de la regla— en una carrera pequeña sin crono y con poca
    // subida la correa vivía clavada en su suelo toda la carrera, y la fuga no pasaba de minuto y
    // medio en ninguna etapa: el extremo contrario de «se deja ir a quince minutos».
    expect(leashOf(400, shape)).toBeGreaterThan(leashOf(0, shape))
  })

  it('el suelo se escala con los días que quedan', () => {
    const shape = {
      kmSubidaRestante: 0,
      kmCronoRestante: 0,
      etapasEnLineaRestantes: 0,
      diasRestantes: 1,
    }
    expect(leashOf(0, shape)).toBeCloseTo(STAGE.customs.gcLeashMinS * 0.5, 6)
    expect(leashOf(0, { ...shape, diasRestantes: 20 })).toBeCloseTo(STAGE.customs.gcLeashMinS, 6)
  })

  it('sin terreno que quede no se recupera nada', () => {
    expect(
      recoverableSeconds({
        kmSubidaRestante: 0,
        kmCronoRestante: 0,
        etapasEnLineaRestantes: 0,
        diasRestantes: 1,
      }),
    ).toBe(0)
  })
})

describe('engine: el interruptor del paso 6', () => {
  it('nace apagado: la aduana nueva no cambia nada por sí sola', () => {
    expect(STAGE.customs.enabled).toBe(false)
  })
})
