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
  carriesGcLeader,
  chooseInstigator,
  followProbability,
  gcChallengeShare,
  gcDefence,
  giveUpLambda,
  moveCooperation,
  moveLambda,
  noChanceToWin,
  pelotonAllows,
  rankOf,
  sustainsJump,
} from './tactics.js'
import type { Attribute } from '@cyclingstar/shared'
import { finishScore } from './finish.js'
import type { Mentality, StageRole } from './types.js'

/** ¿Da el pelotón cuerda a este movimiento con este dado? Atajo para leer los casos de un vistazo. */
function allows(move: MoveRider[], c: MoveContext, dado: number): boolean {
  return pelotonAllows(move, c, fixedRng([dado]))
}

/**
 * LA PROBABILIDAD DE CUERDA, MEDIDA (v39). `pelotonAllows` concede si `dado < p`, así que buscando
 * el dado que separa el sí del no se recupera la `p` exacta sin duplicar la fórmula en el test.
 *
 * Estos casos comparaban antes contra `STAGE.tacticAllowBase` a pelo, y eso los ataba a la FORMA de
 * la fórmula y no a lo que quieren decir: al añadir la rampa de arranque de la v39 —el pelotón no
 * concede la fuga del día en el kilómetro uno— se cayeron cinco de golpe sin que ninguna de las
 * reglas que vigilan hubiera cambiado. Medir la probabilidad y comparar RELACIONES («al de cerca en
 * la general se le da menos cuerda que al de lejos») dice lo mismo y no se rompe con la siguiente
 * perilla.
 */
function cuerda(move: MoveRider[], c: MoveContext): number {
  let lo = 0
  let hi = 1
  for (let i = 0; i < 40; i++) {
    const medio = (lo + hi) / 2
    if (pelotonAllows(move, c, fixedRng([medio]))) lo = medio
    else hi = medio
  }
  return lo
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
    // Nadie defiende, salvo que el caso lo ponga (v46): es el estado neutro y el que deja el motor
    // comportándose como antes de que la apuesta de la general tuviera signo.
    gcDefenderId: null,
    gcCushionSeconds: 0,
    // Una llana: a la fuga del día no se apunta nadie más que cuatro anónimos (v39).
    breakAppeal: 0,
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
    // Por defecto va A RUEDA: el que salta viene de la rueda, y el caso del que ataca desde el
    // relevo se prueba aparte (v41).
    pulling: false,
    // …y entero: el caso del que viene de que le cacen tras un día delante se prueba aparte (v42).
    gastado: false,
    gcDeficitSeconds: 600,
    // Sin plan de equipo que le condicione: es lo que vale un agente libre (v15, §V.1).
    teamAttack: 1,
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
    const gordo = Array.from({ length: 12 }, (_, i) => moveRider(`m-${i}`))
    const c = ctx({ kmToGo: 180 })
    expect(cuerda(gordo, c)).toBeLessThan(cuerda(movida, c))
  })

  /**
   * …Y NO SE CONCEDE LA FUGA DEL DÍA EN EL KILÓMETRO UNO (v39). El dueño, leyendo la radio de
   * carrera: «yo veo que en el 99 % de los casos en el km 1 ataca alguien». Los INTENTOS del km 1
   * están bien —una fuga sale del disparo—; lo que estaba mal es que el pelotón se la CONCEDÍA ahí
   * mismo, con `tacticAllowBase` valiendo 0,3 desde el metro cero.
   */
  it('el pelotón no concede la fuga del día en el kilómetro uno', () => {
    const salida = ctx({ kmToGo: 179, totalKm: 180 })
    const asentada = ctx({ kmToGo: 180 - STAGE.tacticAllowSettleFlatKm - 10, totalKm: 180 })
    expect(cuerda(movida, salida)).toBeLessThan(cuerda(movida, asentada))
    // Y en el metro cero queda muy poca: no es imposible —una fuga puede salir del disparo— pero es
    // la excepción y no la regla.
    expect(cuerda(movida, salida)).toBeLessThan(0.1)
  })

  it('nunca da cuerda de buena gana a una AMENAZA para la general (SPEC 6.9)', () => {
    const amenaza = [
      moveRider('a', { gcDeficitSeconds: 10 }),
      moveRider('b', { gcDeficitSeconds: 900 }),
    ]
    // El mismo movimiento, mismo tamaño, pero sin nadie cerca de la general: es la referencia.
    const inocuo = [
      moveRider('a', { gcDeficitSeconds: 900 }),
      moveRider('b', { gcDeficitSeconds: 900 }),
    ]
    const base = ctx({ kmToGo: 180, totalKm: 180, hasGcContext: true })
    // Al que lleva a un hombre a diez segundos del maillot se le da MUCHA menos cuerda: el castigo
    // es casi entero, y «casi» porque la rampa lo mide en segundos y diez no son cero.
    const ventana = STAGE.gcThreatFraction * STAGE.gcControlLeash
    expect(cuerda(amenaza, base)).toBeLessThan(cuerda(inocuo, base))
    expect(cuerda(amenaza, base) / cuerda(inocuo, base)).toBeCloseTo(
      1 - STAGE.tacticAllowGcPenalty * (1 - 10 / ventana),
      3,
    )
  })

  it('sin general en juego, un `gcDeficitSeconds` de 0 no convierte a todos en amenaza', () => {
    // En la etapa 1 de una vuelta y en las carreras de un día TODOS llegan con 0. Leerlo literal
    // diría que el pelotón entero es el líder y que ningún movimiento puede irse jamás.
    const ceros = [moveRider('a', { gcDeficitSeconds: 0 }), moveRider('b', { gcDeficitSeconds: 0 })]
    const c = ctx({ kmToGo: 180, totalKm: 180 })
    expect(cuerda(ceros, c)).toBeCloseTo(cuerda(movida, c), 5)
  })

  // --- v32: el maillot es VETO, y la amenaza se mide en segundos ---------------------------

  it('LA FUGA DEL DÍA NO SE LLEVA AL LÍDER DE LA GENERAL, por bueno que sea el dado', () => {
    // El caso del parte de producción (Race Sardegna e2): el maillot en la fuga de una etapa llana.
    // No es «poco probable»: con el dado más favorable posible sigue siendo NO.
    const conMaillot = [
      moveRider('lider', { gcDeficitSeconds: 0 }),
      moveRider('b', { gcDeficitSeconds: 900 }),
    ]
    for (const kind of ['fuga', 'contraataque', 'puente'] as const) {
      const c = ctx({ kind, kmToGo: 20, totalKm: 180, hasGcContext: true })
      expect(allows(conMaillot, c, 0)).toBe(false)
    }
  })

  it('…pero el líder SÍ puede atacar en el desenlace: `ataque_final` no lleva veto', () => {
    // El maillot atacando en el puerto decisivo es la carrera, no una fuga que se le escapa al
    // pelotón. El veto es de la fuga del día, no del líder.
    const conMaillot = [
      moveRider('lider', { gcDeficitSeconds: 0 }),
      moveRider('b', { gcDeficitSeconds: 900 }),
    ]
    const c = ctx({ kind: 'ataque_final', kmToGo: 20, totalKm: 180, hasGcContext: true })
    expect(allows(conMaillot, c, 0)).toBe(true)
  })

  it('la amenaza ESCALA con la distancia real en la general, no es un escalón', () => {
    // El defecto de fondo: a 10 s y a 250 s cobraban EXACTAMENTE el mismo castigo plano, así que el
    // motor no distinguía al que se juega la general del que no.
    const ventana = STAGE.gcThreatFraction * STAGE.gcControlLeash
    const cerca = [moveRider('a', { gcDeficitSeconds: 10 })]
    const lejos = [moveRider('a', { gcDeficitSeconds: ventana - 10 })]
    const c = ctx({ kmToGo: 180, totalKm: 180, hasGcContext: true })
    // Con el escalón de antes las dos cuerdas eran EXACTAMENTE la misma. Ahora la del que anda a
    // diez segundos del maillot es mucho menor que la del que está en el borde de la ventana.
    expect(cuerda(cerca, c)).toBeLessThan(cuerda(lejos, c))
    expect(cuerda(lejos, c)).toBeLessThan(cuerda([moveRider('x')], c) * 1.001)
  })

  it('y en el borde de la ventana ya no queda castigo', () => {
    const ventana = STAGE.gcThreatFraction * STAGE.gcControlLeash
    const fuera = [moveRider('a', { gcDeficitSeconds: ventana + 1 })]
    const c = ctx({ kmToGo: 180, totalKm: 180, hasGcContext: true })
    const sinGeneral = ctx({ kmToGo: 180, totalKm: 180 })
    expect(cuerda(fuera, c)).toBeCloseTo(cuerda([moveRider('a')], sinGeneral), 5)
  })

  it('«va el maillot aquí» lo contesta UNA sola función, que usan la cuerda y la corona', () => {
    // La misma regla la aplican dos capas —`pelotonAllows` niega la cuerda y `simulate.ts` niega la
    // corona de fuga del día—, así que vive en un solo sitio y no puede desincronizarse.
    expect(carriesGcLeader([0, 900], true)).toBe(true)
    expect(carriesGcLeader([30, 900], true)).toBe(false)
    // Empatar a cero es ir de co-líder: ese tampoco se va.
    expect(carriesGcLeader([0, 0], true)).toBe(true)
    // Y sin general en juego no hay maillot: en la e1 de una vuelta y en un día TODOS llevan 0.
    expect(carriesGcLeader([0, 0], false)).toBe(false)
  })

  it('EL VETO NO SE AHORRA EL DADO: `rngTactics` es un flujo compartido', () => {
    // Si el veto volviera sin tirar, el flujo se correría y con él TODAS las etapas del juego (el
    // motivo por el que la v21 quitó la FRASE del ataque del km 0 y no el movimiento). Es la
    // propiedad que mantiene el cambio acotado a donde se quiere mover.
    let tiradas = 0
    const contando = (): number => {
      tiradas += 1
      return 0
    }
    const conMaillot = [moveRider('lider', { gcDeficitSeconds: 0 })]
    const c = ctx({ kmToGo: 20, totalKm: 180, hasGcContext: true })
    expect(pelotonAllows(conMaillot, c, contando)).toBe(false)
    expect(tiradas).toBe(1)
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

  it('el que anda cerca en la general ataca más que el que ya la perdió, CUESTA ARRIBA', () => {
    // `onClimb` desde la v39: el extra de la general vale donde el ataque GANA TIEMPO. En un final
    // llano el favorito no se juega nada arrancando a doce kilómetros, y ahí no se le empuja.
    const c = ctx({
      kind: 'ataque_final',
      kmToGo: 5,
      groupSize: 8,
      hasGcContext: true,
      onClimb: true,
    })
    const cerca = attackAppetite(moveRider('a', { gcDeficitSeconds: 20 }), c, ranks)
    const lejos = attackAppetite(moveRider('b', { gcDeficitSeconds: 5000 }), c, ranks)
    expect(cerca / lejos).toBeCloseTo(1 + STAGE.tacticGcStakeWeight, 5)
  })

  /**
   * …Y EN UN FINAL LLANO MANDA OTRA COSA (v39). El dueño: «lo de `ataque_final` dependerá: si es un
   * final en llano no haría sentido que un escalador ataque al final ahí». Cuesta arriba atacan los
   * fuertes; en llano ataca el que sabe que pierde la llegada, igual que dentro de una fuga.
   */
  it('en un final LLANO ataca el que pierde la llegada, no el más fuerte', () => {
    const c = ctx({ kind: 'ataque_final', kmToGo: 5, groupSize: 8, hasGcContext: true })
    const peor = attackAppetite(moveRider('a'), c, { finishRank: 0, perfilRank: 0.2 })
    const mejor = attackAppetite(moveRider('b'), c, { finishRank: 1, perfilRank: 1 })
    expect(peor / mejor).toBeCloseTo(1 + STAGE.tacticWorstFinisherWeight, 5)
    // Y el favorito de la general NO se lanza por lanzarse: ahí no saca tiempo.
    const favorito = attackAppetite(moveRider('c', { gcDeficitSeconds: 20 }), c, ranks)
    const perdido = attackAppetite(moveRider('d', { gcDeficitSeconds: 5000 }), c, ranks)
    expect(favorito).toBeCloseTo(perdido, 5)
  })

  /**
   * EL QUE VA TIRANDO NO SALTA (v41). Defecto que el dueño encontró en una carrera de producción:
   * el corredor que se escapó iba, en el bloque anterior, dando relevos en el pelotón. El que ataca
   * viene de la rueda: acaba de NO pagar el viento y por eso puede poner el hueco.
   */
  /**
   * AL QUE ACABAN DE CAZAR TRAS UNA FUGA LARGA NO SE LE OCURRE NADA (v42). El dueño, sobre una etapa
   * de producción: un corredor se escapó en solitario, le cazaron, se volvió a escapar, le cazaron
   * otra vez, se escapó una tercera **y ganó la etapa**.
   */
  it('al que acaban de cazar tras un día delante no le quedan ni ganas ni rueda', () => {
    const c = ctx()
    expect(attackAppetite(moveRider('a', { gastado: true }), c, ranks)).toBe(0)
    const instigador = moveRider('i')
    expect(followProbability(moveRider('b', { gastado: true }), instigador, c)).toBe(0)
    // Y no es el depósito: con el mismo 45 % de tanque, el que no viene de ahí sí ataca.
    const entero = moveRider('c', { energyFraction: 0.45 })
    expect(attackAppetite(entero, c, ranks)).toBeGreaterThan(0)
    expect(attackAppetite(moveRider('d', { energyFraction: 0.45, gastado: true }), c, ranks)).toBe(
      0,
    )
  })

  it('el que va dando la cara tiene diez veces menos ganas de atacar', () => {
    const c = ctx()
    const rueda = attackAppetite(moveRider('a'), c, ranks)
    const tirando = attackAppetite(moveRider('b', { pulling: true }), c, ranks)
    expect(tirando / rueda).toBeCloseTo(STAGE.tacticPullingAppetite, 5)
    // Y no es un veto: de un relevo se arranca, solo que es la excepción.
    expect(tirando).toBeGreaterThan(0)
  })

  it('…y no le deja marchar: el rival cercano salta detrás mucho más', () => {
    const c = ctx({ kind: 'ataque_final', kmToGo: 5, groupSize: 8, hasGcContext: true })
    const instigator = moveRider('lider', { perfil: 75, gcDeficitSeconds: 0 })
    const rival = followProbability(moveRider('r', { gcDeficitSeconds: 30 }), instigator, c)
    const turista = followProbability(moveRider('t', { gcDeficitSeconds: 4000 }), instigator, c)
    expect(rival).toBeGreaterThan(turista)
  })
})

/**
 * REGLA 9-BIS — LA APUESTA DE LA GENERAL TIENE DOS LADOS (v46).
 *
 * Toda la conciencia de general del motor colgaba de UNA pregunta —«¿estás dentro de la ventana de
 * amenaza?»— que dice si te juegas algo pero **no de qué lado**. Medido sobre estas mismas
 * funciones antes de tocarlas: el líder (déficit 0) y el rival a 419 s salían con el MISMO apetito
 * de ataque en el puerto final (0,0816 los dos, contra 0,0454 del que está fuera de la ventana), y
 * con la MISMA probabilidad de saltar (0,4870). O sea que al maillot se le daba entero el bonus de
 * «tengo que ganar tiempo», que es justo el signo contrario del suyo.
 *
 * En carretera son dos carreras distintas. El que va a 30 s tiene que atacar. El de amarillo no: le
 * basta con no perderlo. Y cuánto no lo necesita depende de su ventaja, que es la deuda que E3 dejó
 * escrita —«no existe *el líder gestiona su ventaja*»— y que estos tests cierran.
 */
describe('regla 9-bis — el que defiende la general no corre como el que la persigue (v46)', () => {
  const finalEnAlto = (over: Partial<MoveContext> = {}): MoveContext =>
    ctx({
      kind: 'ataque_final',
      kmToGo: 5,
      groupSize: 8,
      hasGcContext: true,
      onClimb: true,
      ...over,
    })

  it('quién defiende y con cuánto colchón: es el LÍDER, y se mide contra los que van con él', () => {
    const conRivales = gcDefence([
      { riderId: 'L', gcDeficitSeconds: 0 },
      { riderId: 'a', gcDeficitSeconds: 45 },
      { riderId: 'b', gcDeficitSeconds: 300 },
    ])
    expect(conRivales).toEqual({ gcDefenderId: 'L', gcCushionSeconds: 45 })

    // El mejor de un grupo SIN el líder no defiende nada: está GANANDO tiempo, como los demás. Es la
    // fuga con el 8.º, el 9.º y el 10.º dentro, y los tres tienen que atacar igual.
    expect(
      gcDefence([
        { riderId: 'a', gcDeficitSeconds: 45 },
        { riderId: 'b', gcDeficitSeconds: 300 },
      ]),
    ).toEqual({ gcDefenderId: null, gcCushionSeconds: 0 })

    // Empate en cabeza: no hay líder con ventaja. Es el caso de la etapa 1 y el de una carrera de un
    // día, donde TODO el campo entra con déficit 0, y por eso devuelve null y no un colchón de cero.
    expect(
      gcDefence([
        { riderId: 'L', gcDeficitSeconds: 0 },
        { riderId: 'M', gcDeficitSeconds: 0 },
      ]),
    ).toEqual({ gcDefenderId: null, gcCushionSeconds: 0 })

    // Y el líder metido en un grupo sin ninguna amenaza cerca defiende con el colchón que tenga: ya
    // está ganando tiempo, no necesita atacar a nadie.
    expect(
      gcDefence([
        { riderId: 'L', gcDeficitSeconds: 0 },
        { riderId: 'a', gcDeficitSeconds: 900 },
      ]),
    ).toEqual({ gcDefenderId: 'L', gcCushionSeconds: 900 })
  })

  it('con COLCHÓN el líder deja de atacar, y con la ventaja pegada corre como antes', () => {
    const lider = moveRider('L', { gcDeficitSeconds: 0 })
    const pegado = attackAppetite(
      lider,
      finalEnAlto({ gcDefenderId: 'L', gcCushionSeconds: 0 }),
      ranks,
    )
    const holgado = attackAppetite(
      lider,
      finalEnAlto({ gcDefenderId: 'L', gcCushionSeconds: 10 * STAGE.gcDefendCushionS }),
      ranks,
    )
    // Con el colchón a cero vale el bonus entero: el motor se comporta EXACTAMENTE como antes, que
    // es lo que hace que esto sea una corrección de signo y no una calibración nueva.
    const sinDefensa = attackAppetite(lider, finalEnAlto({ gcDefenderId: null }), ranks)
    expect(pegado).toBeCloseTo(sinDefensa, 10)
    // Y con colchón de sobra pierde el bonus ENTERO, ni más ni menos.
    expect(pegado / holgado).toBeCloseTo(1 + STAGE.tacticGcStakeWeight, 5)
    // A mitad de rampa, a mitad de camino: es una rampa y no un escalón.
    const medio = attackAppetite(
      lider,
      finalEnAlto({ gcDefenderId: 'L', gcCushionSeconds: STAGE.gcDefendCushionS / 2 }),
      ranks,
    )
    expect(medio).toBeGreaterThan(holgado)
    expect(medio).toBeLessThan(pegado)
  })

  it('…y a cambio SALTA más: el que defiende no puede dejar marchar ni un ataque', () => {
    // EL PERFIL DEL MAILLOT DE VERDAD, y esto importa: `autoOrders` le pone `lider` + `reservon` al
    // que lleva la camiseta (v42), y no es lo mismo que un corredor genérico. Medido, con el
    // corredor por defecto de este fichero —`libre` + `oportunista`— la ganancia se la come entera
    // el tope de `tacticFollowMax`, porque ése ya venía saltando en 0,697 y no le caben 0,27 más.
    const lider = moveRider('L', { gcDeficitSeconds: 0, role: 'lider', mentality: 'reservon' })
    const instigador = moveRider('i', { gcDeficitSeconds: 30 })
    const pegado = followProbability(
      lider,
      instigador,
      finalEnAlto({ gcDefenderId: 'L', gcCushionSeconds: 0 }),
    )
    const holgado = followProbability(
      lider,
      instigador,
      finalEnAlto({ gcDefenderId: 'L', gcCushionSeconds: 10 * STAGE.gcDefendCushionS }),
    )
    // Contra el que ya está FUERA de la ventana, que es la referencia sin nada de general. Se mide
    // así y no contra la constante a pelo porque `followProbability` multiplica la suma entera por
    // la dilución del grupo: la diferencia cruda sale escalada y ataría el test a la FORMA de la
    // fórmula, que es justo lo que este fichero lleva escrito que no hay que hacer.
    const sinGeneral = followProbability(
      moveRider('t', { gcDeficitSeconds: 4000, role: 'lider', mentality: 'reservon' }),
      instigador,
      finalEnAlto({ gcDefenderId: 'L', gcCushionSeconds: 10 * STAGE.gcDefendCushionS }),
    )
    expect(holgado).toBeGreaterThan(pegado)
    expect((holgado - pegado) / (pegado - sinGeneral)).toBeCloseTo(STAGE.tacticFollowDefendGain, 5)
    // Y EL TECHO ES REAL, no un detalle: el maillot defendiendo se queda en 0,847 contra un tope de
    // 0,85. Cabe justo, y quien suba `tacticFollowDefendGain` tiene que saber que a partir de aquí
    // el número deja de significar nada porque lo absorbe el clamp.
    expect(holgado).toBeLessThanOrEqual(STAGE.tacticFollowMax)
    expect(holgado).toBeGreaterThan(0.9 * STAGE.tacticFollowMax)
  })

  /**
   * …Y ELLOS ATACAN MÁS, que es lo que hace que la defensa sea correcta (v46).
   *
   * Este test decía lo contrario —«a sus rivales no les cambia nada»— y se INVIERTE a propósito,
   * porque medirlo enseñó que aquella versión estaba incompleta: quitarle al líder las ganas de
   * atacar dejó la montaña MENOS SELECTIVA (el peor día de una reina pasó de 17,65 % de cola a
   * 13,75 %). Parte de la carrera la hacía él.
   *
   * La lectura equivocada de ese dato sería devolverle el ataque al maillot. La correcta es la de la
   * carretera: si el líder se sienta, son SUS RIVALES los que tienen que moverle, porque a ellos se
   * les acaba la carrera y a él no.
   */
  it('a sus RIVALES sí les cambia: si el líder se sienta, tienen que moverle ellos', () => {
    const c = finalEnAlto({ gcDefenderId: 'L', gcCushionSeconds: 240 })
    const ventana = STAGE.gcThreatFraction * STAGE.gcControlLeash
    const dentro = moveRider('a', { gcDeficitSeconds: ventana - 1 })
    const fuera = moveRider('b', { gcDeficitSeconds: ventana + 1 })
    // Con el líder cómodo, el rival dentro de la ventana ataca con el bonus de siempre MÁS el del
    // reto. El de fuera no recibe ninguno de los dos: el escalón de la ventana sigue donde estaba.
    expect(attackAppetite(dentro, c, ranks) / attackAppetite(fuera, c, ranks)).toBeCloseTo(
      1 + STAGE.tacticGcStakeWeight + STAGE.tacticGcChallengeWeight,
      5,
    )
    // Y con el líder PEGADO —sin colchón— no hay reto que valga: ahí ya se ataca solo, y el motor
    // vuelve a comportarse exactamente como antes de todo esto.
    const pegado = finalEnAlto({ gcDefenderId: 'L', gcCushionSeconds: 0 })
    expect(
      attackAppetite(dentro, pegado, ranks) / attackAppetite(fuera, pegado, ranks),
    ).toBeCloseTo(1 + STAGE.tacticGcStakeWeight, 5)
    // El reto es del RIVAL, no del que defiende: el líder nunca se lo cobra a sí mismo.
    expect(gcChallengeShare(moveRider('L', { gcDeficitSeconds: 0 }), c)).toBe(0)
    // …ni nadie, cuando no hay quien defienda.
    expect(gcChallengeShare(dentro, finalEnAlto({ gcDefenderId: null }))).toBe(0)
  })

  it('y en un final LLANO no se defiende nada: ahí el ataque no quita tiempo', () => {
    // La regla de la v39 se mantiene entera. Si en llano el favorito no gana nada arrancando, el
    // líder tampoco pierde nada dejándole marchar, y no hay defensa que aplicar al ataque.
    const c = ctx({ kind: 'ataque_final', kmToGo: 5, groupSize: 8, hasGcContext: true })
    const lider = moveRider('L', { gcDeficitSeconds: 0 })
    expect(
      attackAppetite(lider, { ...c, gcDefenderId: 'L', gcCushionSeconds: 0 }, ranks),
    ).toBeCloseTo(
      attackAppetite(lider, { ...c, gcDefenderId: 'L', gcCushionSeconds: 600 }, ranks),
      10,
    )
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

describe('el que no tiene nada que ganar aquí no colabora (v39)', () => {
  const eff = (
    base: number,
    over: Partial<Record<Attribute, number>> = {},
  ): Record<Attribute, number> => ({
    RES: base,
    REC: base,
    LLA: base,
    MON: base,
    COL: base,
    CRI: base,
    SPR: base,
    DES: base,
    PAV: base,
    TAC: base,
    ...over,
  })

  it('el que manda en el remate de su grupo colabora del todo, esté donde esté', () => {
    // Desventaja cero: él SÍ quiere que esto llegue, y a un kilómetro de meta más que nunca.
    expect(noChanceToWin(70, 70, 1)).toBe(0)
    expect(noChanceToWin(70, 70, 150)).toBe(0)
    // …y el que va POR ENCIMA del mejor que se le ha pasado tampoco resta (no hay gap negativo).
    expect(noChanceToWin(75, 70, 5)).toBe(0)
  })

  it('lejos de meta la fuga es de todos: aunque no puedas ganar, tiras', () => {
    // Si la fuga no llega no gana nadie, así que lejos queda solo el suelo. Sin esta mitad no
    // saldría ninguna fuga con un fuera de serie dentro.
    const lejos = noChanceToWin(50, 90, STAGE.coopSelfishFarKm + 50)
    expect(lejos).toBeCloseTo(STAGE.coopSelfishFloor, 5)
    expect(lejos).toBeLessThan(0.5)
  })

  it('y cerca de meta el que no puede ganar se planta', () => {
    expect(noChanceToWin(50, 90, STAGE.coopSelfishKm - 1)).toBeCloseTo(1, 5)
    // La rampa es monótona: cuanto más cerca, menos colabora.
    const serie = [150, 80, 40, 20, 5].map((km) => noChanceToWin(50, 90, km))
    for (let i = 1; i < serie.length; i++) expect(serie[i]!).toBeGreaterThanOrEqual(serie[i - 1]!)
  })

  it('la desventaja satura: doce puntos de remate ya son «no tengo nada que hacer»', () => {
    const cerca = STAGE.coopSelfishKm - 1
    expect(noChanceToWin(70 - STAGE.coopNoChanceGap, 70, cerca)).toBeCloseTo(1, 5)
    expect(noChanceToWin(70 - 2 * STAGE.coopNoChanceGap, 70, cerca)).toBeCloseTo(1, 5)
    // Y a media distancia de remate, colabora a medias.
    expect(noChanceToWin(70 - STAGE.coopNoChanceGap / 2, 70, cerca)).toBeCloseTo(0.5, 5)
  })

  /**
   * LOS DOS CASOS DEL DUEÑO SON EL MISMO, y este test es el que lo demuestra: la misma función, con
   * el mismo rodador, dice «no colabores» ante un escalador en un alto y «colabora» ante el mismo
   * escalador en un sprint. Lo que cambia no es la regla, son los pesos del final —y eso lo sabe
   * `finishScore`—.
   */
  it('vale igual para el que pierde el sprint y para el mal escalador', () => {
    const escalador = eff(58, { MON: 88, COL: 84 })
    const rodador = eff(58, { MON: 56, LLA: 70 })
    const enAlto = (e: Record<Attribute, number>): number => finishScore(e, 'alto')
    const alSprint = (e: Record<Attribute, number>): number => finishScore(e, 'sprint_reducido')

    // Etapa de montaña: el rodador no tiene nada que hacer y a diez kilómetros deja de tirar.
    expect(noChanceToWin(enAlto(rodador), enAlto(escalador), 10)).toBeCloseTo(1, 5)
    // La misma pareja en una llegada al sprint: ahí el mejor es el rodador, así que TIRA él…
    expect(noChanceToWin(alSprint(rodador), alSprint(escalador), 10)).toBe(0)
    // …y el que se planta es el escalador.
    expect(noChanceToWin(alSprint(escalador), alSprint(rodador), 10)).toBeGreaterThan(0)
  })
})
