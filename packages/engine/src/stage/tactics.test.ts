/**
 * La capa táctica, regla a regla (docs/motor.md §13.1). Son las nueve reglas de dominio que dictó
 * el dueño; aquí se prueba la DECISIÓN de cada una, que es lo que vive en `tactics.ts`. Que el
 * ataque se convierta en un grupo y que la carretera lo cace o no se prueba en `simulate.test.ts`.
 */
import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import {
  type MoveContext,
  type MoveRider,
  attackAppetite,
  chooseInstigator,
  followProbability,
  giveUpLambda,
  moveCooperation,
  moveLambda,
  pelotonAllows,
  rankOf,
  sustainsJump,
} from './tactics.js'
import type { Mentality, StageRole } from './types.js'

/** ¿Da el pelotón cuerda a este movimiento con este dado? Atajo para leer los casos de un vistazo. */
function allows(move: MoveRider[], c: MoveContext, dado: number): boolean {
  return pelotonAllows(move, c, fixedRng([dado]))
}

function ctx(over: Partial<MoveContext> = {}): MoveContext {
  return {
    kind: 'fuga',
    kmToGo: 150,
    totalKm: 180,
    groupSize: 40,
    fieldSize: 40,
    onClimb: false,
    tension: 0,
    hasGcContext: false,
    ...over,
  }
}

function moveRider(id: string, over: Partial<MoveRider> = {}): MoveRider {
  return {
    riderId: id,
    role: 'libre',
    mentality: 'oportunista',
    perfil: 65,
    finishScore: 60,
    energyFraction: 0.9,
    matches: 3,
    tac: 60,
    spr: 55,
    gcDeficitSeconds: 600,
    ...over,
  }
}

/** RNG determinista de valores prefijados, para fijar una decisión concreta. */
function fixedRng(values: number[]): () => number {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)] ?? 0
}

const ranks = { finishRank: 0.5, perfilRank: 0.5 }

describe('regla 1 — alguien lo intenta, y la intensidad depende del contexto', () => {
  it('sube si el grupo va JUNTO', () => {
    const junto = moveLambda(ctx({ groupSize: 40, fieldSize: 40 }))
    const roto = moveLambda(ctx({ groupSize: 6, fieldSize: 40 }))
    expect(junto).toBeGreaterThan(roto)
  })

  it('sube cuanto más CERCA está la meta', () => {
    const lejos = moveLambda(ctx({ kmToGo: 170 }))
    const cerca = moveLambda(ctx({ kmToGo: 30 }))
    expect(cerca).toBeGreaterThan(lejos)
  })

  it('la cohesión no puede apagar los ataques del todo (tiene suelo)', () => {
    const solo = moveLambda(ctx({ groupSize: 1, fieldSize: 176 }))
    expect(solo).toBeGreaterThan(0)
    expect(solo).toBeGreaterThanOrEqual(
      STAGE.lambdaBreakawayAttack * STAGE.tacticCohesionFloor * 0.99,
    )
  })

  it('una fuga TENSA ataca mucho más (SPEC 6.10: `Group.tension` deja de ser decorativa)', () => {
    const calma = moveLambda(ctx({ kind: 'ataque_grupo', groupSize: 6, tension: 0 }))
    const tensa = moveLambda(
      ctx({ kind: 'ataque_grupo', groupSize: 6, tension: STAGE.breakawayTensionThreshold }),
    )
    expect(tensa / calma).toBeCloseTo(STAGE.breakawayTensionAttackFactor, 5)
  })

  it('en la ventana de ataques tardíos la intensidad sube a `lambdaLateAttack`', () => {
    const antes = moveLambda(
      ctx({ kind: 'ataque_grupo', kmToGo: STAGE.lateAttackKm + 5, groupSize: 6 }),
    )
    const dentro = moveLambda(
      ctx({ kind: 'ataque_grupo', kmToGo: STAGE.lateAttackKm - 1, groupSize: 6 }),
    )
    expect(dentro).toBeGreaterThan(antes)
  })
})

describe('regla 2 — algunos van atentos y saltan detrás: pueden ser 0 o 40', () => {
  const instigator = moveRider('atacante', { perfil: 70 })

  it('el que va atento (TAC alto) y combativo salta mucho más que el sprinter reservón', () => {
    const atento = followProbability(
      moveRider('a', { tac: 90, role: 'cazaetapas', mentality: 'combativo' }),
      instigator,
      ctx(),
    )
    const dormido = followProbability(
      moveRider('b', { tac: 30, role: 'sprinter', mentality: 'reservon' }),
      instigator,
      ctx(),
    )
    expect(atento).toBeGreaterThan(dormido)
    expect(dormido).toBeLessThan(0.05)
  })

  it('sin cerillos no se salta a ninguna rueda (SPEC 6.6)', () => {
    expect(followProbability(moveRider('a', { matches: 0 }), instigator, ctx())).toBe(0)
  })

  it('con el depósito por los suelos tampoco', () => {
    const p = followProbability(
      moveRider('a', { energyFraction: STAGE.tacticMinEnergyFraction - 0.01 }),
      instigator,
      ctx(),
    )
    expect(p).toBe(0)
  })

  it('en un grupo GORDO la atención se diluye: saltan tantos como en uno pequeño', () => {
    const enPequeno = followProbability(moveRider('a'), instigator, ctx({ groupSize: 20 }))
    const enGordo = followProbability(moveRider('a'), instigator, ctx({ groupSize: 176 }))
    expect(enGordo).toBeLessThan(enPequeno)
    // Lo que se conserva aproximadamente es el número ABSOLUTO de los que saltan.
    expect(enGordo * 176).toBeLessThan(enPequeno * 20 * 2)
  })

  it('un puente lo saltan muchos menos que un ataque: es un esfuerzo a tumba abierta', () => {
    const ataque = followProbability(moveRider('a'), instigator, ctx({ kind: 'fuga' }))
    const puente = followProbability(moveRider('a'), instigator, ctx({ kind: 'puente' }))
    expect(puente).toBeLessThan(ataque)
  })
})

describe('regla 3 — muchos de los que intentan seguir el ataque no lo consiguen', () => {
  const instigator = moveRider('atacante', { perfil: 75 })

  it('el que está a la altura del que ataca, aguanta siempre', () => {
    expect(sustainsJump(moveRider('a', { perfil: 75 }), instigator, fixedRng([0.999]))).toBe(true)
  })

  it('el que está muy por debajo no aguanta nunca', () => {
    const lejos = moveRider('a', { perfil: 75 + STAGE.markDropMargin - STAGE.markDraftTolerance })
    expect(sustainsJump(lejos, instigator, fixedRng([0.001]))).toBe(false)
  })

  it('el que está justo por debajo, a veces sí y a veces no', () => {
    const justo = moveRider('a', { perfil: 68 })
    expect(sustainsJump(justo, instigator, fixedRng([0.05]))).toBe(true)
    expect(sustainsJump(justo, instigator, fixedRng([0.95]))).toBe(false)
  })
})

describe('reglas 4 y 5 — muchos intentos fracasan, y hacen falta muchos antes de que cuaje', () => {
  const movida = [moveRider('a'), moveRider('b')]

  it('el pelotón da cuerda pocas veces al principio y más según avanza la etapa', () => {
    // Con un dado justo por encima de la base, al principio NO y en la segunda mitad SÍ: es lo que
    // hace que la fuga del día tarde varios intentos en cuajar en vez de salir a la primera.
    const dado = STAGE.tacticAllowBase + 0.1
    expect(allows(movida, ctx({ kmToGo: 175 }), dado)).toBe(false)
    expect(allows(movida, ctx({ kmToGo: 40 }), dado)).toBe(true)
  })

  it('y cuantos más van en el movimiento, menos', () => {
    const dado = STAGE.tacticAllowBase - 0.01
    const gordo = Array.from({ length: 12 }, (_, i) => moveRider(`m-${i}`))
    expect(allows(movida, ctx({ kmToGo: 180 }), dado)).toBe(true)
    expect(allows(gordo, ctx({ kmToGo: 180 }), dado)).toBe(false)
  })

  it('nunca da cuerda de buena gana a una AMENAZA para la general (SPEC 6.9)', () => {
    const amenaza = [
      moveRider('a', { gcDeficitSeconds: 10 }),
      moveRider('b', { gcDeficitSeconds: 900 }),
    ]
    const dado = STAGE.tacticAllowBase * (1 - STAGE.tacticAllowGcPenalty) + 0.01
    const base = ctx({ kmToGo: 180, totalKm: 180, hasGcContext: true })
    expect(allows(movida, base, dado)).toBe(true)
    expect(allows(amenaza, base, dado)).toBe(false)
  })

  it('sin general en juego, un `gcDeficitSeconds` de 0 no convierte a todos en amenaza', () => {
    // En la etapa 1 de una vuelta y en las carreras de un día TODOS llegan con 0. Leerlo literal
    // diría que el pelotón entero es el líder y que ningún movimiento puede irse jamás.
    const ceros = [moveRider('a', { gcDeficitSeconds: 0 }), moveRider('b', { gcDeficitSeconds: 0 })]
    const dado = STAGE.tacticAllowBase * (1 - STAGE.tacticAllowGcPenalty) + 0.01
    expect(allows(ceros, ctx({ kmToGo: 180, totalKm: 180 }), dado)).toBe(true)
  })
})

describe('regla 6 — dentro de una fuga atacan los que peor rematarían', () => {
  it('el peor rematador del grupo tiene bastantes más ganas que el mejor', () => {
    const c = ctx({ kind: 'ataque_grupo', groupSize: 5 })
    const peor = attackAppetite(moveRider('a'), c, { finishRank: 0, perfilRank: 0.5 })
    const mejor = attackAppetite(moveRider('b'), c, { finishRank: 1, perfilRank: 0.5 })
    expect(peor / mejor).toBeCloseTo(1 + STAGE.tacticWorstFinisherWeight, 5)
  })

  it('y en una fuga de cinco, el que se va casi nunca es el que ganaría el sprint', () => {
    const group: MoveRider[] = [
      moveRider('rematador', { finishScore: 90 }),
      moveRider('flojo-1', { finishScore: 50 }),
      moveRider('flojo-2', { finishScore: 52 }),
      moveRider('flojo-3', { finishScore: 54 }),
      moveRider('flojo-4', { finishScore: 56 }),
    ]
    const c = ctx({ kind: 'ataque_grupo', groupSize: 5 })
    let rematador = 0
    for (let i = 0; i < 100; i++) {
      const pick = chooseInstigator(group, c, fixedRng([i / 100]))
      if (pick?.riderId === 'rematador') rematador += 1
    }
    // Su cuota justa sería 20 de 100; con la regla 6 baja claramente de ahí.
    expect(rematador).toBeLessThan(15)
  })
})

describe('regla 9 — en el final en alto atacan los fuertes, y los que se juegan la general', () => {
  it('el más fuerte del grupo tiene muchas más ganas que el más flojo', () => {
    const c = ctx({ kind: 'ataque_final', kmToGo: 5, groupSize: 8, onClimb: true })
    const fuerte = attackAppetite(moveRider('a'), c, { finishRank: 0.5, perfilRank: 1 })
    const flojo = attackAppetite(moveRider('b'), c, { finishRank: 0.5, perfilRank: 0 })
    expect(fuerte / flojo).toBeCloseTo(1 / STAGE.tacticStrongFloor, 5)
  })

  it('el que anda cerca en la general ataca más que el que ya la perdió', () => {
    const c = ctx({ kind: 'ataque_final', kmToGo: 5, groupSize: 8, hasGcContext: true })
    const cerca = attackAppetite(moveRider('a', { gcDeficitSeconds: 20 }), c, ranks)
    const lejos = attackAppetite(moveRider('b', { gcDeficitSeconds: 5000 }), c, ranks)
    expect(cerca / lejos).toBeCloseTo(1 + STAGE.tacticGcStakeWeight, 5)
  })

  it('…y no le deja marchar: el rival cercano salta detrás mucho más', () => {
    const c = ctx({ kind: 'ataque_final', kmToGo: 5, groupSize: 8, hasGcContext: true })
    const instigator = moveRider('lider', { perfil: 75, gcDeficitSeconds: 0 })
    const rival = followProbability(moveRider('r', { gcDeficitSeconds: 30 }), instigator, c)
    const turista = followProbability(moveRider('t', { gcDeficitSeconds: 4000 }), instigator, c)
    expect(rival).toBeGreaterThan(turista)
  })
})

describe('la cooperación del movimiento (regla 2, segunda mitad)', () => {
  it('cuantos más van, menos colaboran', () => {
    const pocos = moveCooperation(3, 0.5, 0, fixedRng([0.5]))
    const muchos = moveCooperation(20, 0.5, 0, fixedRng([0.5]))
    expect(muchos).toBeLessThan(pocos)
  })

  it('los que peor rematan colaboran más: es su única opción', () => {
    const hambrientos = moveCooperation(5, 0, 0, fixedRng([0.5]))
    const rematadores = moveCooperation(5, 1, 0, fixedRng([0.5]))
    expect(hambrientos).toBeGreaterThan(rematadores)
  })

  it('la tensión rompe el pacto y la fuga deja de rodar (SPEC 6.10)', () => {
    const avenida = moveCooperation(5, 0.5, 0, fixedRng([0.5]))
    const rota = moveCooperation(5, 0.5, STAGE.breakawayTensionThreshold, fixedRng([0.5]))
    expect(rota).toBeLessThan(avenida)
  })
})

describe('el filtro de candidatos a la fuga (SPEC 6.10, dos constantes que no se leían)', () => {
  it('un sprinter puro no se va a la fuga del día: espera su llegada', () => {
    const c = ctx({ kind: 'fuga' })
    const sprinter = moveRider('s', { spr: STAGE.breakawaySkipSprThreshold })
    expect(attackAppetite(sprinter, c, ranks)).toBe(0)
    // Pero sí puede atacar en el final de una etapa que se le escapa.
    expect(attackAppetite(sprinter, ctx({ kind: 'ataque_final' }), ranks)).toBeGreaterThan(0)
  })

  it('ni el que llega a la etapa con el depósito por debajo del 40%', () => {
    const vaciado = moveRider('v', {
      energyFraction: STAGE.breakawaySkipEnergyFraction - 0.01,
    })
    expect(attackAppetite(vaciado, ctx({ kind: 'fuga' }), ranks)).toBe(0)
  })

  it('sin cerillos no hay ataque, sea del tipo que sea (SPEC 6.6)', () => {
    for (const kind of [
      'fuga',
      'contraataque',
      'puente',
      'ataque_grupo',
      'ataque_final',
    ] as const) {
      expect(attackAppetite(moveRider('a', { matches: 0 }), ctx({ kind }), ranks)).toBe(0)
    }
  })
})

describe('regla 8 — el agotado sin nada que jugarse se deja ir', () => {
  const empty = { role: 'gregario' as StageRole, mentality: 'reservon' as Mentality }

  it('lejos de meta nadie administra: quedan kilómetros para recuperarse', () => {
    expect(
      giveUpLambda({ ...empty, energyFraction: 0.05, inFrontGroup: false }, STAGE.giveUpKm + 1),
    ).toBe(0)
  })

  it('el que va entero tampoco', () => {
    expect(giveUpLambda({ ...empty, energyFraction: 0.9, inFrontGroup: false }, 10)).toBe(0)
  })

  it('el vaciado sí, y cuanto más vacío, antes', () => {
    const justo = giveUpLambda(
      { ...empty, energyFraction: STAGE.giveUpEnergyFraction * 0.9, inFrontGroup: false },
      10,
    )
    const seco = giveUpLambda({ ...empty, energyFraction: 0, inFrontGroup: false }, 10)
    expect(justo).toBeGreaterThan(0)
    expect(seco).toBeGreaterThan(justo)
  })

  it('pero el que se juega algo aprieta los dientes', () => {
    const vacio = { energyFraction: 0.02, inFrontGroup: false }
    expect(giveUpLambda({ ...vacio, role: 'lider', mentality: 'reservon' }, 10)).toBe(0)
    expect(giveUpLambda({ ...vacio, role: 'sprinter', mentality: 'reservon' }, 10)).toBe(0)
    expect(giveUpLambda({ ...vacio, role: 'cazaetapas', mentality: 'reservon' }, 10)).toBe(0)
    expect(giveUpLambda({ ...vacio, role: 'gregario', mentality: 'supercombativo' }, 10)).toBe(0)
    // …y el que va en el grupo de cabeza, jugándose la etapa, tampoco.
    expect(giveUpLambda({ ...empty, energyFraction: 0.02, inFrontGroup: true }, 10)).toBe(0)
  })
})

describe('utilidades', () => {
  it('el rango normaliza a [0,1] y da 1 cuando todos valen lo mismo', () => {
    expect(rankOf(5, [5, 10])).toBe(0)
    expect(rankOf(10, [5, 10])).toBe(1)
    expect(rankOf(7, [7, 7, 7])).toBe(1)
    expect(rankOf(1, [1])).toBe(1)
  })
})
