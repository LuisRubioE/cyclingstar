import { describe, expect, it } from 'vitest'
import { buildTeamPlans, type TeamPlanRider } from './teamPlan.js'

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
