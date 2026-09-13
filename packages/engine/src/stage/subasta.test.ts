import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import type { CustomsMove, CustomsTeam } from './customs.js'
import { chaseTargetOf, desiredGapOf, frontClaimOf, sitsOut } from './frontAuction.js'

/**
 * EL PULSO POR EL FRENTE (docs/tactica.md R20, paso 9).
 *
 * Contiene **S-176, el contrario nº 1 de las veinte más graves**: «se persigue al grupo más
 * adelantado en vez de al que hace daño, así que toda la lógica de caza apunta al sitio
 * equivocado». La prueba central de este fichero es exactamente esa frase.
 */

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
    presentInPeloton: 8,
    convocados: 8,
    spentFraction: 0,
    quality: 90,
    leashSeconds: 300,
    ...over,
  }
}

describe('engine: a quién se persigue (R20.1, S-176)', () => {
  it('SE PERSIGUE AL QUE HACE DAÑO, NO AL QUE VA MÁS LEJOS', () => {
    // Delante van tres irrelevantes; más atrás, el segundo de la general. El motor de hoy apunta a
    // los tres irrelevantes porque van más lejos.
    const irrelevantes = {
      groupId: 'mov-1',
      move: movimiento([corredor('a', 'x', 4000, 40), corredor('b', 'y', 5000, 40)], 300),
      kmToGo: 60,
    }
    const peligroso = {
      groupId: 'mov-2',
      move: movimiento([corredor('riv', 'z', 30, 50)], 120),
      kmToGo: 62,
    }
    const equipoDeLaGeneral = equipo({
      cardGcId: 'mi-jefe',
      cardGcDeficitSeconds: 10,
      leashSeconds: 200,
    })
    expect(chaseTargetOf(equipoDeLaGeneral, [irrelevantes, peligroso])?.groupId).toBe('mov-2')
  })

  it('…y el equipo del sprinter, que no tiene hombre de general, TAMBIÉN apunta', () => {
    // Es la corrección que hace ejecutable el contrario nº 1: con `costToMyMan` —solo general— el
    // perseguidor normal de una llana mide 0 en todos los movimientos y el argmax queda en un
    // empate a cero sin desempate escrito.
    // Los dos por debajo de `tacticBreakGapSeconds`, para que decida el REMATE y no el hecho de que
    // una fuga consolidada gane remate quien remate (que es la otra rama, y es de `threatOf`).
    const conRematador = {
      groupId: 'mov-1',
      move: movimiento([corredor('a', 'x', 0, 88)], 30),
      kmToGo: 50,
    }
    const anonimos = {
      groupId: 'mov-2',
      move: movimiento([corredor('b', 'y', 0, 40)], 40),
      kmToGo: 45,
    }
    const equipoDeSprint = equipo({ cardStageId: 'spr', cardStageFinishScore: 90 })
    expect(chaseTargetOf(equipoDeSprint, [conRematador, anonimos])?.groupId).toBe('mov-1')
  })

  it('el desempate está escrito y es determinista', () => {
    // A igualdad de amenaza, el más cerca de meta; a igualdad de eso, el id menor. Sin esto la caza
    // dependería del orden de un array.
    const a = { groupId: 'mov-9', move: movimiento([corredor('a', 'x', 0, 40)]), kmToGo: 40 }
    const b = { groupId: 'mov-2', move: movimiento([corredor('b', 'y', 0, 40)]), kmToGo: 40 }
    const c = { groupId: 'mov-5', move: movimiento([corredor('c', 'z', 0, 40)]), kmToGo: 20 }
    expect(chaseTargetOf(equipo(), [a, b, c])?.groupId).toBe('mov-5')
    expect(chaseTargetOf(equipo(), [a, b])?.groupId).toBe('mov-2')
  })
})

describe('engine: el hueco que un equipo tolera (R20.1)', () => {
  it('con hombre de general, su correa; sin él, lo que todavía puede cerrar', () => {
    expect(desiredGapOf(equipo({ cardGcId: 'x', leashSeconds: 420 }), 100)).toBe(420)
    // A 120 km de meta tolera diez minutos; a 40, dos; a 20, nada.
    expect(desiredGapOf(equipo(), 120)).toBe(STAGE.front.closeRateSPerKm * 100)
    expect(desiredGapOf(equipo(), 40)).toBe(STAGE.front.closeRateSPerKm * 20)
    expect(desiredGapOf(equipo(), 20)).toBe(0)
  })
})

describe('engine: el derecho al frente (R20.2)', () => {
  it('LA NECESIDAD es lo que ata la subasta al objetivo', () => {
    // Sin ella, el equipo del sprinter pujaba por el frente a 120 km de meta con la fuga a 90 s
    // —aunque su hueco tolerable fuera de diez minutos— y se ponía a tirar en cuanto ganaba.
    const t = equipo()
    const lejos = frontClaimOf(t, 3, 90, 120)
    const cerca = frontClaimOf(t, 3, 90, 40)
    expect(lejos).toBeLessThan(cerca)
    expect(lejos).toBeLessThan(1)
  })

  it('…y satura en 1: con el hueco por encima de lo tolerable se puja entero', () => {
    expect(frontClaimOf(equipo(), 3, 5000, 120)).toBeCloseTo(3, 6)
  })

  it('el derecho baja con los hombres PRESENTES, normalizado por convocados', () => {
    // El equipo que tiene a todos los suyos aquí tiene derecho entero, sea de cuatro o de ocho. Con
    // un 6 fijo, un equipo de cuatro entero valía 0,67 el día que salía de casa; con un 8, dos bajas
    // de una gran vuelta no costaban nada.
    const deCuatroEntero = equipo({ presentInPeloton: 4, convocados: 4 })
    const deOchoConTres = equipo({ presentInPeloton: 3, convocados: 8 })
    expect(frontClaimOf(deCuatroEntero, 3, 5000, 120)).toBeCloseTo(3, 6)
    expect(frontClaimOf(deOchoConTres, 3, 5000, 120)).toBeCloseTo(3 * (3 / 8), 6)
  })

  it('el que ha gastado su presupuesto ya no puja', () => {
    expect(frontClaimOf(equipo({ spentFraction: 1 }), 3, 5000, 120)).toBe(0)
  })
})

describe('engine: el que se sienta (R20.5)', () => {
  const mov = movimiento([corredor('a', 'x', 0, 88)], 60)
  const conMotivo = equipo({ cardStageId: 'spr', cardStageFinishScore: 90 })

  it('sin otro pagador del mismo motivo, nadie se sienta', () => {
    expect(sitsOut(conMotivo, mov, 2, 3, false)).toBe(false)
  })

  it('«llego al sprint con dos hombres más si tiras tú»: con tren y parte pequeña, se sienta', () => {
    // La parte del cierre que le tocaría es pequeña (bote grande), así que ahorrarse el trabajo vale
    // más que su parte.
    expect(sitsOut(conMotivo, mov, 8, 3, true)).toBe(true)
  })

  it('…pero si el cierre es SUYO entero, paga', () => {
    // Escrito como «0,35 · lanzadores > objeción − payable», tres lanzadores daban 1,05 > 1 SIEMPRE:
    // «nada» todos los días, y cuanto más fresco el equipo antes se sentaba. Comparado contra la
    // parte que de verdad le toca, el número cierra.
    expect(sitsOut(conMotivo, mov, 0.5, 3, true)).toBe(false)
  })

  it('sin motivo no hay nada que sentarse a no hacer', () => {
    expect(sitsOut(equipo(), mov, 8, 3, true)).toBe(false)
  })
})
