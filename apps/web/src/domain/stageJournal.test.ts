import type { ChronicleEntry, ChronicleRider, StageResultEntry } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  chronicleLine,
  chronicleParts,
  fmtGap,
  listNames,
  timeTrialStory,
  variantIndex,
} from './stageJournal'

/**
 * Un corredor de prueba. Los tres campos de identidad son opcionales a propósito: lo que se está
 * probando la mitad de las veces es justo que la frase aguante sin ellos (etapas congeladas).
 */
function rider(name: string, over: Partial<ChronicleRider> = {}): ChronicleRider {
  return { name, bib: null, team: null, country: null, ...over }
}

/** Atajo: una lista de corredores solo con nombre, para las frases donde la identidad no se prueba. */
const named = (...names: string[]): ChronicleRider[] => names.map((n) => rider(n))

function event(partial: Partial<ChronicleEntry> & { plantilla: string }): ChronicleEntry {
  return { km: 100, protagonists: [], ...partial } as ChronicleEntry
}

function result(name: string, puesto: number, tiempoS: number): StageResultEntry {
  return {
    riderId: `r${puesto}`,
    name,
    country: 'ES',
    teamName: null,
    isBot: true,
    puesto,
    tiempoS,
    bonificacionS: 0,
    puntosVolante: 0,
    puntosMontana: 0,
  }
}

describe('formato del journal', () => {
  it('las diferencias por debajo del minuto van en segundos', () => {
    expect(fmtGap(45)).toBe('45s')
    expect(fmtGap(90)).toBe('1:30')
    expect(fmtGap(725)).toBe('12:05')
  })

  it('enumera nombres como lo haría un narrador', () => {
    expect(listNames([])).toBe('')
    expect(listNames(['A'])).toBe('A')
    expect(listNames(['A', 'B'])).toBe('A and B')
    expect(listNames(['A', 'B', 'C'])).toBe('A, B and C')
  })

  it('la variante es determinista y cae dentro del rango', () => {
    expect(variantIndex('semilla', 4)).toBe(variantIndex('semilla', 4))
    expect(variantIndex('semilla', 4)).toBeLessThan(4)
    expect(variantIndex('semilla', 0)).toBe(0)
  })
})

describe('crónica de la etapa', () => {
  it('cuenta la misma historia cada vez que se pinta el mismo evento', () => {
    const e = event({ plantilla: 'breakaway_formed', protagonists: named('Ana', 'Bea') })
    expect(chronicleLine(e)).toBe(chronicleLine(e))
  })

  it('nombra a los protagonistas y a su equipo en la victoria', () => {
    const linea = chronicleLine(
      event({
        plantilla: 'stage_win',
        protagonists: [rider('Ana Ruiz', { bib: 41, team: 'Team Sol', country: 'ES' })],
        datos: { won: 'sprint' },
      }),
    )
    expect(linea).toContain('Ana Ruiz')
    expect(linea).toContain('Team Sol')
  })

  it('la fuga sin nombres no deja la frase coja', () => {
    expect(chronicleLine(event({ plantilla: 'breakaway_formed' }))).not.toMatch(/^\s|\s{2}/)
  })

  it('un evento desconocido no revienta: se narra en crudo', () => {
    expect(chronicleLine(event({ plantilla: 'meteorito', protagonists: named('Ana') }))).toBe(
      'meteorito: Ana',
    )
  })
})

describe('crónica de una contrarreloj', () => {
  it('sin resultados no hay nada que contar', () => {
    expect(timeTrialStory([])).toEqual([])
  })

  it('cuenta el mejor tiempo, quién se acercó y lo apretada que quedó', () => {
    const lineas = timeTrialStory([
      result('Ana', 1, 3600),
      result('Bea', 2, 3612),
      result('Cris', 3, 3700),
    ])
    expect(lineas[0]).toContain('Ana')
    expect(lineas[1]).toContain('+12s')
    expect(lineas[2]).toContain('+1:40')
    // Ana y Bea entran en el minuto; Cris no.
    expect(lineas[3]).toContain('2 riders')
  })
})

// --- La crónica tiene que EXPLICAR la carrera (docs/motor.md §16) ---------------------------
// El dueño leyó dos crónicas y no se entendían: "de 81 corredores a 3 en tres kilómetros, con solo
// 2 descolgados narrados" y "hay 5 ciclistas, ¡podrías haber dicho cuáles!". Estos tests fijan lo
// que la frase tiene que decir para que eso no vuelva a pasar.

describe('la criba se cuenta de forma que se entienda', () => {
  const split = (datos: Record<string, number | string>, over: Partial<ChronicleEntry> = {}) =>
    chronicleLine(
      event({
        plantilla: 'peloton_split',
        km: 137,
        protagonists: [rider('Iker Zabala', { team: 'Summit Squad' })],
        datos,
        ...over,
      }),
    )

  it('dice de cuántos a cuántos ha quedado el grupo, no solo cuántos cayeron', () => {
    const linea = split({ dropped: 41, remaining: 40, before: 81, chasing: 0 })
    expect(linea).toContain('81')
    expect(linea).toContain('40')
  })

  it('con un pelotón grande nombra al equipo que tira', () => {
    expect(split({ dropped: 41, remaining: 40, before: 81, chasing: 0 })).toContain('Summit Squad')
  })

  it('con un grupo pequeño el sujeto es el CORREDOR: un equipo no tira con tres en cabeza', () => {
    const linea = split({ dropped: 2, remaining: 3, before: 5, chasing: 0 })
    expect(linea).toContain('Iker Zabala')
    // El equipo sigue estando (va en la identidad del corredor, encargo A1) pero NO es el sujeto:
    // la frase no puede decir «Summit Squad lift the pace» con tres corredores en cabeza.
    expect(linea).not.toMatch(/^Summit Squad/)
  })

  it('si la fuga sigue delante, el grupo que se parte es el que persigue, no la cabeza', () => {
    const linea = split({ dropped: 41, remaining: 40, before: 81, chasing: 1 })
    expect(linea).toContain('chase')
    expect(linea).not.toContain('lead group')
  })

  it('cuando solo queda uno, se dice que se ha quedado solo', () => {
    const linea = split({ dropped: 4, remaining: 1, before: 5, chasing: 0 })
    expect(linea).toContain('alone')
    expect(linea).toContain('Iker Zabala')
  })

  it('una crónica guardada antes de v6 (sin `before`) se sigue narrando', () => {
    const linea = split({ dropped: 2, remaining: 81 })
    expect(linea).toContain('81')
    expect(linea.length).toBeGreaterThan(20)
  })
})

describe('quién va delante y con cuánta ventaja', () => {
  it('nombra a los corredores del grupo de cabeza', () => {
    const linea = chronicleLine(
      event({
        plantilla: 'front_group',
        km: 199,
        protagonists: named('Ana Ruiz', 'Bea Soler', 'Cris Vega'),
        datos: { size: 3, gapS: 90, toGo: 11 },
      }),
    )
    expect(linea).toContain('Ana Ruiz')
    expect(linea).toContain('Cris Vega')
    expect(linea).toContain('11 km to go')
    expect(linea).toContain('1:30')
  })

  it('un corredor solo en cabeza se narra como tal', () => {
    const linea = chronicleLine(
      event({
        plantilla: 'front_group',
        protagonists: named('Fredrik Eriksen'),
        datos: { size: 1, gapS: 435, toGo: 10 },
      }),
    )
    expect(linea).toContain('Fredrik Eriksen')
    expect(linea).toContain('alone')
    expect(linea).toContain('7:15')
  })

  it('el parte de boquete dice cuántos van delante', () => {
    expect(
      chronicleLine(event({ plantilla: 'time_gap', datos: { gapS: 90, trend: 0, leadSize: 5 } })),
    ).toContain('5 leaders')
    expect(
      chronicleLine(event({ plantilla: 'time_gap', datos: { gapS: 435, trend: 1, leadSize: 1 } })),
    ).toContain('lone leader')
  })

  it('un boquete guardado antes de v6 (sin `leadSize`) se sigue narrando como la fuga', () => {
    expect(
      chronicleLine(event({ plantilla: 'time_gap', datos: { gapS: 90, trend: 0 } })),
    ).toContain('1:30')
  })
})

// --- La criba, contada como progresión (v8) -------------------------------------------------
// El dueño leyó diez avisos casi idénticos con el mismo equipo nombrado diez veces. El motor ya
// manda `phase`: el 0 presenta la criba y quién aprieta; los siguientes cuentan cómo sigue cayendo
// el grupo, sin volver a nombrar a nadie.

describe('la criba larga se cuenta como una progresión, no diez veces igual', () => {
  const at = (phase: number, datos: Record<string, number | string>) =>
    chronicleLine(
      event({
        plantilla: 'peloton_split',
        km: 190 + phase,
        protagonists: [rider('Iker Zabala', { team: 'Summit Squad' })],
        datos: { ...datos, phase },
      }),
    )

  it('el primer aviso presenta a quien aprieta', () => {
    expect(at(0, { dropped: 41, remaining: 40, before: 81, chasing: 0 })).toContain('Summit Squad')
  })

  it('los siguientes no vuelven a nombrar al mismo equipo', () => {
    for (const phase of [1, 2, 3]) {
      const linea = at(phase, { dropped: 16, remaining: 24, before: 40, chasing: 0 })
      expect(linea).not.toContain('Summit Squad')
      expect(linea).not.toContain('Iker Zabala')
      // Y sigue diciendo de cuántos a cuántos: la progresión es el contenido de la frase.
      expect(linea).toContain('40')
      expect(linea).toContain('24')
    }
  })

  it('una crónica anterior a v8 (sin `phase`) se narra como siempre', () => {
    const linea = chronicleLine(
      event({
        plantilla: 'peloton_split',
        protagonists: [rider('Iker Zabala', { team: 'Summit Squad' })],
        datos: { dropped: 41, remaining: 40, before: 81, chasing: 0 },
      }),
    )
    expect(linea).toContain('Summit Squad')
  })
})

// --- El reagrupamiento (v8) -----------------------------------------------------------------
// "About 51 left in front" y luego más de cien en el mismo tiempo. El reagrupamiento pasaba de
// verdad y no se contaba en ninguna parte.

describe('el reagrupamiento se cuenta', () => {
  const regroup = (datos: Record<string, number | string>) =>
    chronicleLine(event({ plantilla: 'peloton_regroup', km: 166, protagonists: [], datos }))

  it('dice cuántos vuelven y de cuántos a cuántos queda el grupo', () => {
    const linea = regroup({ joined: 27, remaining: 44, before: 17, chasing: 0 })
    expect(linea).toContain('44')
    expect(linea).toMatch(/17|27/)
  })

  it('si delante quedaba un solo corredor, la frase no habla de "de 1 a N"', () => {
    const linea = regroup({ joined: 14, remaining: 15, before: 1, chasing: 0 })
    expect(linea).toContain('15')
    expect(linea).toContain('14')
  })

  it('distingue el grupo de cabeza del de persecución', () => {
    expect(regroup({ joined: 20, remaining: 60, before: 40, chasing: 1 })).toContain('chase')
  })
})

describe('casos límite de la criba', () => {
  it('si el grupo se deshace entero, la frase no habla de "0 corredores restantes"', () => {
    const linea = chronicleLine(
      event({
        plantilla: 'peloton_split',
        protagonists: [],
        datos: { dropped: 30, remaining: 0, before: 30, chasing: 0 },
      }),
    )
    expect(linea).toContain('30')
    expect(linea).not.toMatch(/\b0\b/)
  })
})

// --- La capa táctica en la crónica (docs/motor.md §13) --------------------------------------
// Un ataque que ocurre y no se narra no existe para el jugador. El motor emite todos los intentos
// como telemetría y marca cuáles merecen frase; aquí se comprueba que cada clase de movimiento se
// cuenta como lo que es y que las cifras del evento llegan al texto.

describe('la crónica cuenta los ataques', () => {
  const line = (plantilla: string, datos: Record<string, number | string>, who: string[] = []) =>
    chronicleLine(event({ plantilla, protagonists: named(...who), datos }))

  it('un ataque de salida se cuenta con quién va y quién se queda a medias', () => {
    const l = line('attack_go', { kind: 'fuga', saltan: 3, tierra: 2, cuerda: 1, toGo: 160 }, [
      'Ana',
      'Bea',
      'Cris',
    ])
    expect(l).toContain('Ana')
    expect(l).toContain('2 more')
  })

  it('si el pelotón no da cuerda, la frase lo dice', () => {
    const l = line('attack_go', { kind: 'fuga', saltan: 2, tierra: 0, cuerda: 0, toGo: 150 }, [
      'Ana',
      'Bea',
    ])
    expect(l).toContain('reacts at once')
  })

  it('un ataque del último puerto dice a cuántos km de meta se lanza', () => {
    const l = line('attack_go', { kind: 'ataque_final', saltan: 1, tierra: 0, toGo: 8 }, ['Ana'])
    expect(l).toContain('8 km')
  })

  it('un puente se cuenta como lo que es, no como una fuga', () => {
    const l = line('attack_go', { kind: 'puente', saltan: 1, tierra: 0, toGo: 60 }, ['Ana'])
    expect(l).toMatch(/across/)
  })

  it('cuando salta medio grupo, la frase explica que no se abre hueco', () => {
    const l = line('attack_swarm', { kind: 'ataque_grupo', saltan: 14, grupo: 25 }, ['Ana'])
    expect(l).toContain('14')
  })

  it('el ataque que cuaja trae su ventaja y los km que faltan', () => {
    expect(line('attack_sticks', { kind: 'fuga', size: 1, gapS: 75, toGo: 40 }, ['Ana'])).toContain(
      '1:15',
    )
  })

  it('el que se queda en tierra de nadie no se narra como cazado', () => {
    const l = line('bridge_failed', { toGo: 30 }, ['Ana'])
    expect(l.toLowerCase()).toMatch(/no man's land|between the two groups/)
  })

  it('el que se deja ir dice cuántos km le quedaban', () => {
    expect(line('rider_sits_up', { toGo: 18 }, ['Ana'])).toContain('18')
  })
})

// --- La atribución del trabajo (v11, docs/motor.md §16) -------------------------------------
// «El Journal me gustaría que tuviera aún más detalle: por ejemplo quién tira del pelotón […] y no
// sé quién hizo el trabajo para reducir la distancia.» El motor ya sabía las dos cosas y las tiraba;
// aquí se comprueba que la frase las dice, y que dice EQUIPO o CORREDORES según toque.

describe('quién tira del pelotón', () => {
  const pull = (
    datos: Record<string, number | string>,
    who: ChronicleRider[],
    over: Partial<ChronicleEntry> = {},
  ): string =>
    chronicleLine(event({ plantilla: 'peloton_pull', km: 90, protagonists: who, datos, ...over }))
  const sameTeam = [rider('Ana', { team: 'Summit Squad' }), rider('Bea', { team: 'Summit Squad' })]
  const twoTeams = [rider('Ana', { team: 'Summit Squad' }), rider('Bea', { team: 'Team Sol' })]

  it('con un pelotón grande y un solo equipo al frente, manda el EQUIPO', () => {
    const l = pull({ size: 120, effort: 'firme', toGo: 60, chasing: 1 }, sameTeam)
    expect(l).toContain('Summit Squad')
    // Con un equipo tirando no se enumeran sus corredores: sería la misma información dos veces.
    expect(l).not.toContain('Ana')
    expect(l).toContain('60 km')
  })

  it('a tope, la frase dice que el pelotón va en fila india', () => {
    const l = pull({ size: 120, effort: 'tope', toGo: 20, chasing: 1 }, sameTeam)
    expect(l).toMatch(/line/)
  })

  it('a tempo no se cuenta como si estuvieran matándose', () => {
    const l = pull({ size: 120, effort: 'tempo', toGo: 100, chasing: 1 }, sameTeam)
    expect(l).toMatch(/tempo|manageable/)
  })

  it('si los que tiran son de EQUIPOS DISTINTOS, se nombran los corredores: es una alianza', () => {
    const l = pull({ size: 120, effort: 'firme', toGo: 45, chasing: 1 }, twoTeams)
    expect(l).toContain('Ana')
    expect(l).toContain('Bea')
    // Los dos equipos salen, pero como identidad de cada corredor: ninguno manda sobre la frase.
    expect(l).toContain('(Summit Squad)')
    expect(l).toContain('(Team Sol)')
    expect(l).not.toMatch(/^Summit Squad/)
  })

  it('con un grupo pequeño no tira un equipo: tira un corredor', () => {
    const l = pull({ size: 4, effort: 'firme', toGo: 12, chasing: 0 }, [
      rider('Ana', { team: 'Summit Squad' }),
    ])
    expect(l).toContain('Ana')
    expect(l).not.toMatch(/^Summit Squad/)
  })

  it('cuenta la misma historia cada vez que se pinta el mismo evento', () => {
    const e = event({
      plantilla: 'peloton_pull',
      protagonists: [rider('Ana', { team: 'A' }), rider('Bea', { team: 'B' })],
      datos: { size: 100, effort: 'firme', toGo: 30, chasing: 1 },
    })
    expect(chronicleLine(e)).toBe(chronicleLine(e))
  })
})

describe('quién hizo el trabajo para cerrar', () => {
  const work = (who: ChronicleRider[]): string =>
    chronicleLine(
      event({
        plantilla: 'chase_work',
        km: 150,
        protagonists: who,
        datos: { closedS: 155, km: 32, work: 6.4 },
      }),
    )
  const oneTeam = [rider('Ana', { team: 'Summit Squad' }), rider('Bea', { team: 'Summit Squad' })]
  const twoTeams = [rider('Ana', { team: 'Summit Squad' }), rider('Bea', { team: 'Team Sol' })]

  it('dice cuántos segundos se cerraron y en cuántos km', () => {
    const l = work(oneTeam)
    expect(l).toContain('2:35')
    expect(l).toContain('32 km')
  })

  it('un solo equipo detrás de la caza se lleva el crédito por su nombre', () => {
    expect(work(oneTeam)).toContain('Summit Squad')
  })

  it('si cerraron varios equipos, se nombra a los corredores', () => {
    const l = work(twoTeams)
    expect(l).toContain('Ana')
    expect(l).toContain('Bea')
    expect(l).not.toMatch(/^The work was Summit Squad|^Summit Squad did/)
  })

  it('sin equipo conocido la frase sigue siendo una frase', () => {
    const l = work(named('Ana'))
    expect(l).toContain('Ana')
    expect(l).not.toMatch(/^\s|\s{2}|undefined/)
  })
})

describe('quién colabora en la fuga', () => {
  const share = (passengers: number, who: string[]): string =>
    chronicleLine(
      event({
        plantilla: 'break_share',
        km: 80,
        protagonists: named(...who),
        datos: { size: 5, passengers, toGo: 90 },
      }),
    )

  it('nombra a los que tiran y cuenta cuántos van a rueda', () => {
    const l = share(2, ['Ana', 'Bea'])
    expect(l).toContain('Ana')
    expect(l).toContain('2 of their companions sit on')
  })

  it('con un solo pasajero la frase va en singular', () => {
    expect(share(1, ['Ana', 'Bea'])).toContain('1 of their companion sits on')
  })

  it('sin pasajeros no se inventa la coletilla', () => {
    const l = share(0, ['Ana'])
    expect(l).not.toContain('sit')
    expect(l).toContain('Ana')
  })
})

// --- v13: identidad, motivo y ruido ----------------------------------------------------------
// Los cuatro encargos del dueño sobre el journal y los defectos que se midieron en producción.
// Cada bloque de aquí abajo sella uno.

describe('A1 · cada mención de un ciclista lleva dorsal, equipo y bandera', () => {
  const pucnik = rider('Andrej Pucnik', { bib: 42, team: 'Al Assad Cycling', country: 'SI' })

  it('la victoria trae la identidad completa', () => {
    const l = chronicleLine(
      event({ plantilla: 'stage_win', protagonists: [pucnik], datos: { won: 'sprint' } }),
    )
    expect(l).toContain('42 Andrej Pucnik (Al Assad Cycling)')
  })

  it('la bandera NO va en el texto: va como trozo aparte, para pintarla con `<Flag/>`', () => {
    const partes = chronicleParts(
      event({ plantilla: 'stage_win', protagonists: [pucnik], datos: { won: 'sprint' } }),
    )
    expect(partes).toContainEqual({ flag: 'SI' })
    // Y el texto plano no arrastra marcas invisibles ni el código de país suelto.
    const plano = partes.map((p) => ('flag' in p ? '' : p.text)).join('')
    expect(plano).toBe(
      chronicleLine(
        event({ plantilla: 'stage_win', protagonists: [pucnik], datos: { won: 'sprint' } }),
      ),
    )
    expect(plano).not.toContain('SI')
  })

  // La compatibilidad hacia atrás es OBLIGATORIA: los eventos están congelados en base y se
  // resuelven contra el roster de hoy. Lo que falte, falta; la página no puede romperse por ello.
  it('sin dorsal, sin equipo y sin país la frase sigue en pie', () => {
    const l = chronicleLine(
      event({
        plantilla: 'stage_win',
        protagonists: named('Ghost Rider'),
        datos: { won: 'solo', margin: 30 },
      }),
    )
    expect(l).toContain('Ghost Rider')
    expect(l).not.toMatch(/null|undefined|\(\)/)
    expect(
      chronicleParts(event({ plantilla: 'stage_win', protagonists: named('Ghost Rider') })),
    ).not.toContainEqual(expect.objectContaining({ flag: expect.anything() }))
  })

  it('con dorsal pero sin país, sale el dorsal y no la bandera', () => {
    const l = chronicleLine(
      event({ plantilla: 'stage_win', protagonists: [rider('Sin Bandera', { bib: 7 })] }),
    )
    expect(l).toContain('7 Sin Bandera')
  })

  // El muro de ocho nombres con dorsal y equipo era el riesgo del encargo: en una lista larga la
  // identidad se recorta a bandera y nombre.
  it('en una lista larga no se repiten ocho dorsales y ocho equipos', () => {
    const ocho = Array.from({ length: 8 }, (_, i) =>
      rider(`Rider ${i}`, { bib: 10 + i, team: `Team ${i}`, country: 'ES' }),
    )
    const l = chronicleLine(
      event({ plantilla: 'front_group', protagonists: ocho, datos: { size: 8, toGo: 20 } }),
    )
    expect(l).toContain('Rider 0')
    expect(l).toContain('Rider 7')
    expect(l).not.toContain('(Team 0)')
    // …y con tres o menos sí cabe la identidad completa.
    const tres = ocho.slice(0, 3)
    expect(
      chronicleLine(
        event({ plantilla: 'front_group', protagonists: tres, datos: { size: 3, toGo: 20 } }),
      ),
    ).toContain('(Team 0)')
  })
})

describe('A2 · quién tira, y POR QUÉ tira', () => {
  const greg = [
    rider('Tom Becker', { bib: 12, team: 'Summit Squad', country: 'DE' }),
    rider('Jean Taylor', { bib: 13, team: 'Summit Squad', country: 'FR' }),
  ]
  const jefe = rider('Iker Zabala', { bib: 11, team: 'Summit Squad', country: 'ES' })

  const pull = (
    datos: Record<string, number | string>,
    who = greg,
    mentions: Record<string, ChronicleRider> = { forId: jefe },
  ) =>
    chronicleLine(event({ plantilla: 'peloton_pull', km: 90, protagonists: who, datos, mentions }))

  it('los gregarios de un líder trabajan PARA él, y se dice', () => {
    const l = pull({ size: 120, effort: 'firme', toGo: 60, chasing: 1, forKind: 'gregarios' })
    expect(l).toContain('Summit Squad')
    expect(l).toContain('11 Iker Zabala')
  })

  it('el tren de un sprinter se cuenta como un tren, no como un control', () => {
    const l = pull({ size: 120, effort: 'tope', toGo: 4, chasing: 0, forKind: 'tren' })
    expect(l.toLowerCase()).toMatch(/lead-out|train/)
    expect(l).toContain('Iker Zabala')
  })

  it('con líderes distintos es una alianza, y se dice por qué coinciden', () => {
    const l = chronicleLine(
      event({
        plantilla: 'peloton_pull',
        km: 90,
        protagonists: [rider('Ana', { team: 'Summit Squad' }), rider('Bea', { team: 'Team Sol' })],
        datos: {
          size: 120,
          effort: 'firme',
          toGo: 45,
          chasing: 1,
          forKind: 'alianza',
          forLeaders: 2,
        },
      }),
    )
    expect(l).toContain('different leaders')
    expect(l).toContain('the break has to come back')
  })

  // El «desgastarse a lo wey» del dueño: si no hay nadie detrás del esfuerzo, no se maquilla.
  it('quien tira sin jefe de filas no recibe un motivo inventado', () => {
    const l = pull({ size: 120, effort: 'firme', toGo: 60, chasing: 0, forKind: 'libre' }, greg, {})
    expect(l).toMatch(/no leader to work for|on their own account/)
    expect(l).not.toContain('working for')
  })

  it('una crónica anterior a la v13 (sin `forKind`) se narra como siempre', () => {
    const l = chronicleLine(
      event({
        plantilla: 'peloton_pull',
        km: 90,
        protagonists: greg,
        datos: { size: 120, effort: 'firme', toGo: 60, chasing: 1 },
      }),
    )
    expect(l).toContain('Summit Squad')
    expect(l).not.toContain('working for')
  })

  it('la persecución de los sprinters dice que tira SU equipo', () => {
    const l = chronicleLine(
      event({
        plantilla: 'sprinters_chase',
        km: 120,
        protagonists: [
          rider('Marwan Al Maktoum', { bib: 21, team: 'Al Saqr Cycling', country: 'AE' }),
        ],
      }),
    )
    expect(l).toContain('Al Saqr Cycling')
    expect(l).toContain('Marwan Al Maktoum')
  })
})

describe('A3 · los descuelgues se agrupan con número', () => {
  const grupo = (count: number, toGo: number) =>
    chronicleLine(
      event({
        plantilla: 'riders_sit_up',
        km: 200,
        protagonists: Array.from({ length: count }, (_, i) =>
          rider(`Rider ${i}`, { country: 'ES' }),
        ),
        datos: { count, toGo, from: 195 },
      }),
    )

  it('dice cuántos son y a cuántos km de meta', () => {
    const l = grupo(6, 10)
    expect(l).toContain('6 riders')
    expect(l).toContain('10 km to go')
  })

  it('con muchos no se enumeran los quince: se nombran unos pocos y se cuenta el resto', () => {
    const l = grupo(15, 8)
    expect(l).toContain('15 riders')
    expect(l).toContain('Rider 0')
    expect(l).not.toContain('Rider 9')
  })

  it('con tres se nombran los tres', () => {
    const l = grupo(3, 12)
    expect(l).toContain('Rider 0')
    expect(l).toContain('Rider 2')
  })

  it('el descuelgue individual sigue teniendo su frase', () => {
    expect(
      chronicleLine(
        event({ plantilla: 'rider_sits_up', protagonists: named('Ana'), datos: { toGo: 18 } }),
      ),
    ).toContain('Ana')
  })
})

describe('B1 · el número de descolgados nunca puede pasarse del grupo', () => {
  // Producción, Race Great Ocean: «1315 riders are shelled» en una carrera de 147. Son eventos
  // congelados de antes de la v8, cuando `dropped` traía el recuento bruto de la goma.
  it('un `dropped` imposible se corrige con `before` y `remaining`, que sí cuadran', () => {
    for (const variante of [0, 1, 2]) {
      const l = chronicleLine(
        event({
          plantilla: 'peloton_split',
          km: 186 + variante,
          protagonists: [rider('Jean Thomas', { team: 'Éclair Équipe' })],
          datos: { dropped: 1315, remaining: 89, before: 115, chasing: 0 },
        }),
      )
      expect(l).not.toContain('1315')
      expect(l).toContain('115')
      expect(l).toContain('89')
    }
  })

  it('un `dropped` coherente se respeta tal cual', () => {
    const l = chronicleLine(
      event({
        plantilla: 'peloton_split',
        km: 137,
        protagonists: [rider('Iker Zabala', { team: 'Summit Squad' })],
        datos: { dropped: 26, remaining: 89, before: 115, chasing: 0 },
      }),
    )
    expect(l).toMatch(/26|115/)
  })
})

describe('B4 · «el pelotón concede» no puede contradecir a la captura', () => {
  it('si la fuga acaba cazada, la concesión se cuenta como provisional', () => {
    const l = chronicleLine(event({ plantilla: 'peloton_concedes', km: 10, datos: { cazada: 1 } }))
    expect(l.toLowerCase()).toMatch(/for now|for the moment/)
    expect(l).not.toContain('fight for the win')
  })

  it('si la fuga llega, la concesión se cuenta como lo que fue', () => {
    const l = chronicleLine(event({ plantilla: 'peloton_concedes', km: 60 }))
    expect(l.toLowerCase()).not.toMatch(/for now|for the moment/)
  })
})

describe('B5 · el liderato de la montaña solo se canta cuando existe', () => {
  const kom = (leads: number) =>
    chronicleLine(
      event({
        plantilla: 'climb_kom',
        km: 111,
        protagonists: [
          rider('Ahmed Al Rashidi', { bib: 121, team: 'Al Saqr Cycling', country: 'AE' }),
        ],
        datos: { category: 'cat3', points: 1, leads },
      }),
    )

  it('con el liderato, se dice', () => {
    expect(kom(1)).toContain('lead in the mountains')
  })

  it('sin él, no se inventa', () => {
    const l = kom(0)
    expect(l).not.toContain('lead in the mountains')
    expect(l).toContain('1 KOM point')
  })
})
