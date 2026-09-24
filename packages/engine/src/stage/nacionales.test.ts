import { describe, expect, it } from 'vitest'
import { hayGeneralEnJuego } from './citas.js'
import { buildTeamPlans, teamStance, type TeamPlanRider } from './teamPlan.js'

/**
 * EL CAMPEONATO NACIONAL, Y POR QUÉ NO HACE FALTA UN `nationalBlocs` APARTE (paso 18c, R28.6).
 *
 * **Son 532 de las 1.418 etapas del calendario**, más de un tercio, y el diseño las describe así:
 * se convocan de uno en uno y sin escuadras, pero «el equipo que aporta seis de los diez mejores del
 * país corre como una selección y controla la carrera solo, y a su lado hay hombres que están solos
 * de verdad». La implementación que R28.6 pide es `nationalBlocs`: agrupar por EQUIPO DE ORIGEN
 * dentro del campo, para que el censo (R01) y la aduana (R03) los traten como equipos.
 *
 * **Y eso ya ocurre, por construcción.** `packages/db/src/stageRun.ts` pasa `teamId: rider.teamId ??
 * null` SIN EXCEPCIÓN: la convocatoria de un nacional es individual, pero cada corredor sigue
 * llevando encima su equipo comercial, así que `buildTeamPlans` los agrupa igual que en cualquier
 * otra carrera. No hay una pieza que construir; hay una propiedad que **fijar**, porque hoy nada
 * impide que alguien «arregle» un nacional poniendo `teamId: null` y se lleve por delante un tercio
 * del calendario sin que ninguna prueba se entere.
 *
 * Eso es lo que hacen estas medidas.
 */

const corredor = (riderId: string, teamId: string | null, finishScore = 50): TeamPlanRider => ({
  riderId,
  teamId,
  role: 'libre',
  mentality: 'reservon',
  spr: 50,
  finishScore,
  gcDeficitSeconds: 0,
})

/**
 * Un campo de nacional: el bloque grande de seis, uno de tres, dos parejas y cuatro hombres que
 * están solos de verdad. Desiguales POR NACIMIENTO, que es la frase del diseño: nadie los repartió.
 */
const campo: TeamPlanRider[] = [
  // El bloque grande, con los papeles que `autoStageOrders` reparte en cualquier carrera: uno al
  // que servir y cinco sirviéndole. Es lo que le deja «controlar la carrera solo».
  { ...corredor('gran-0', 'equipo-grande', 70), role: 'lider' },
  ...Array.from({ length: 5 }, (_, i) => ({
    ...corredor(`gran-${i + 1}`, 'equipo-grande', 64 - i),
    role: 'gregario' as const,
    targetRiderId: 'gran-0',
  })),
  ...Array.from({ length: 3 }, (_, i) => corredor(`med-${i}`, 'equipo-medio', 60 - i)),
  corredor('par-a0', 'equipo-par-a'),
  corredor('par-a1', 'equipo-par-a'),
  corredor('par-b0', 'equipo-par-b'),
  corredor('par-b1', 'equipo-par-b'),
  ...Array.from({ length: 4 }, (_, i) => corredor(`solo-${i}`, null)),
]

const ctx = { bunchFinish: true, hasGcContext: false }

describe('el campeonato nacional agrupa por equipo de origen (R28.6)', () => {
  const planes = buildTeamPlans(campo, ctx)

  it('el bloque grande existe y es el más numeroso', () => {
    expect(planes.get('equipo-grande')?.memberIds).toHaveLength(6)
    expect(planes.get('equipo-medio')?.memberIds).toHaveLength(3)
    expect(planes.get('equipo-par-a')?.memberIds).toHaveLength(2)
  })

  /**
   * LA MITAD QUE DA SENTIDO A LA OTRA: los que están solos siguen solos. Si el agrupado los metiera
   * en un bloque cualquiera —o si `teamId` nulo dejara de significar «agente libre»— la frase del
   * diseño se rompería por el lado contrario: ya no habría «hombres que están solos de verdad».
   */
  it('los que están solos no entran en ningún bloque', () => {
    const conPlan = new Set([...planes.values()].flatMap((p) => p.memberIds))
    for (let i = 0; i < 4; i++) expect(conPlan.has(`solo-${i}`)).toBe(false)
    expect(planes.has('')).toBe(false)
  })

  it('los bloques son desiguales, que es lo que hace distinto a un nacional', () => {
    const tamanos = [...planes.values()].map((p) => p.memberIds.length).sort((a, b) => b - a)
    expect(tamanos).toEqual([6, 3, 2, 2])
    // Y el grande NO es el campo entero: a su lado corre gente que no es suya. Un nacional en el que
    // un solo bloque fuera todo el pelotón no sería un nacional, sería una carrera por equipos.
    expect(tamanos[0]).toBeLessThan(campo.length)
  })

  /**
   * Y EL BLOQUE GRANDE TIENE JEFE, que es lo que le deja «controlar la carrera solo»: con seis
   * hombres hay a quién servir, y el censo y la aduana ven un equipo de seis donde la convocatoria
   * solo vio cuarenta individuos.
   */
  it('el bloque grande tiene un jefe de filas al que servir', () => {
    const grande = planes.get('equipo-grande')!
    expect(grande.leaderId).toBe('gran-0')
    expect(grande.memberIds).toContain(grande.leaderId)
  })

  /**
   * Y LA CONDICIÓN QUE HACE FALTA PARA ESO, medida aparte porque me costó una prueba en rojo
   * descubrirla: un bloque cuyos hombres corren todos `libre` **no tiene jefe**. `pickLeader` elige
   * por votos de los gregarios o por rol y calidad, y un campo entero sin papeles no vota ni se
   * postula. En una carrera de verdad no pasa —los papeles los reparte `autoStageOrders`— pero es el
   * eslabón del que depende que un bloque de seis se comporte como una selección y no como seis
   * corredores que casualmente comparten patrocinador.
   */
  it('un bloque sin papeles no es una selección: no tiene a quién servir', () => {
    const sinPapeles = buildTeamPlans(
      Array.from({ length: 6 }, (_, i) => corredor(`x-${i}`, 'equipo-mudo', 70 - i)),
      ctx,
    )
    expect(sinPapeles.get('equipo-mudo')?.memberIds).toHaveLength(6)
    expect(sinPapeles.get('equipo-mudo')?.leaderId).toBeNull()
  })
})

/**
 * LA ETAPA 1 DE UNA VUELTA SÍ TIENE GENERAL (paso 18b, R28.5 · S-074, S-388, S-158).
 *
 * En la etapa 1 y en una carrera de un día todos llegan con `gcDeficitSeconds` = 0, así que el motor
 * deducía «no hay general» en los dos casos. En el día 1 de una vuelta eso **apagaba los tres frenos
 * del maillot justo cuando la cuerda es la más larga de la carrera**: nadie controlaba, nadie se
 * cuidaba y nadie miraba a una fuga que, si llega, se viste el primer maillot con minutos. Es lo
 * contrario de lo que pasa en carretera, donde el día 1 se corre nerviosísimo precisamente porque la
 * general está por estrenar.
 *
 * La diferencia entre los dos casos no está en los déficits —son idénticos— sino en **si mañana hay
 * otra etapa**, y eso el motor ya lo sabía: `race.stageDay` y `race.totalStages` viajan desde el
 * paso 2 y nadie los miraba para esto.
 */
describe('la etapa 1 de una vuelta tiene general, y la de un día no', () => {
  /** Nadie tiene diferencia todavía: es el caso que importa, y el que los dos formatos comparten. */
  const todosACero = [{ gcDeficitSeconds: 0 }, { gcDeficitSeconds: 0 }]

  it('el día 1 de una vuelta de 21 etapas: hay general que estrenar', () => {
    expect(hayGeneralEnJuego(todosACero, { stageDay: 1, totalStages: 21 })).toBe(true)
  })

  it('una carrera de un día: no hay general, y no la puede haber', () => {
    expect(hayGeneralEnJuego(todosACero, { stageDay: 1, totalStages: 1 })).toBe(false)
    expect(hayGeneralEnJuego(todosACero, undefined)).toBe(false)
  })

  /**
   * Y NO SE ENCIENDE SOLA EN CUALQUIER ETAPA SIN DIFERENCIAS: a partir del día 2 la general existe
   * porque hay déficits de verdad, no porque el motor se la invente. Esta rama es solo para el día
   * en que todavía no los hay.
   */
  it('a partir del día 2 esta rama no interviene', () => {
    expect(hayGeneralEnJuego(todosACero, { stageDay: 2, totalStages: 21 })).toBe(false)
  })

  it('con diferencias de verdad hay general, venga de donde venga la etapa', () => {
    const conDiferencias = [{ gcDeficitSeconds: 0 }, { gcDeficitSeconds: 42 }]
    expect(hayGeneralEnJuego(conDiferencias, { stageDay: 9, totalStages: 21 })).toBe(true)
    expect(hayGeneralEnJuego(conDiferencias, undefined)).toBe(true)
  })
})

/**
 * UN MINUTO EN LA ETAPA 3 NO ES UN MINUTO EN LA 18 (v76.2).
 *
 * El dueño, mirando el Tour: «en la etapa 3, con todos muy cerca, se escapa un ciclista peligroso
 * para la general pero solo tiene 1 minuto… y veo tirando a gente que va por la general. No veo que
 * alguien que quizás acabe luchando por el podio tenga que desgastar a su equipo por eso. Otra cosa
 * sería si va sacando 20 minutos, o si es la etapa 18».
 *
 * La causa eran **dos preguntas distintas metidas en una**. `isThreatened` preguntaba «¿se me
 * acerca?», y eso vale mientras el de delante siga POR DETRÁS de nuestro hombre en la general
 * virtual. En cuanto le PASA, esa misma cuenta responde que sí para cualquier hueco —de un minuto o
 * de veinte— y en la etapa 3, con la general comprimida a SEGUNDOS, cualquier fuga que se lleve un
 * minuto adelanta a media parrilla. De ahí medio pelotón tirando.
 *
 * Cuando te pasa, la pregunta ya no es cuánto se te acerca: es **cuánto te saca y si puedes
 * devolvérselo**.
 */
describe('perseguir una fuga depende de qué día de la carrera es', () => {
  const plan = {
    teamId: 't1',
    memberIds: ['a', 'b', 'c', 'd', 'e'],
    leaderId: 'a',
    gcLeaderId: 'a',
    purposes: ['general' as const],
    stageCandidateId: null,
    quality: 60,
    gcDeficitSeconds: 30,
    sprintFinish: true,
    budget: 100,
    form: 1,
    rebelIds: [],
  }
  /** Una fuga con un hombre a 45 s en la general que se lleva `gap` segundos. */
  const sit = (gap: number, stageDay: number) => ({
    manUpTheRoad: false,
    leaderUpTheRoad: false,
    kmToGo: 60,
    frontThreatDeficit: 45,
    gapSeconds: gap,
    stageDay,
    totalStages: 21,
  })
  const persigue = (gap: number, dia: number) => teamStance(plan, sit(gap, dia)).threatened

  it('un minuto en la etapa 3 no vale quemar al equipo', () => {
    expect(persigue(60, 3)).toBe(false)
    expect(persigue(180, 3)).toBe(false)
  })

  it('…pero veinte minutos sí, desde el primer día', () => {
    expect(persigue(1200, 3)).toBe(true)
    expect(persigue(600, 3)).toBe(true)
  })

  it('y en la última etapa se persigue hasta por un minuto', () => {
    expect(persigue(60, 21)).toBe(true)
  })

  /**
   * LA RAMPA, que es lo que hace que esto sea una regla y no dos casos: el mismo hueco va cambiando
   * de respuesta según se acaba la carrera, porque lo que queda por recuperar mengua.
   */
  it('el mismo hueco cambia de respuesta según avanza la carrera', () => {
    const tresMinutos = [3, 8, 11, 15, 18, 21].map((d) => persigue(180, d))
    // Empieza en «me quedo» y acaba en «persigo», y no vuelve atrás.
    expect(tresMinutos[0]).toBe(false)
    expect(tresMinutos[tresMinutos.length - 1]).toBe(true)
    const primerSi = tresMinutos.indexOf(true)
    expect(tresMinutos.slice(primerSi).every(Boolean)).toBe(true)
  })

  /** Y en una carrera de un día no hay nada que recuperar mañana: la cuenta es la de siempre. */
  it('una carrera de un día no descuenta nada', () => {
    const unDia = { ...sit(60, 1), totalStages: 1 }
    expect(teamStance(plan, unDia).threatened).toBe(true)
  })
})
