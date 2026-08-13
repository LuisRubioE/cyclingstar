import type { ChronicleEntry, ChronicleRider, StageResultEntry } from '@cyclingstar/shared'
import { GROUP_NOUNS, WATCHED_GROUP_NOUNS } from '@cyclingstar/engine'
import { describe, expect, it } from 'vitest'
import {
  chronicleLine,
  chronicleParts,
  fmtGap,
  listNames,
  ordinalSuffix,
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
    // …y con el vocabulario de tres nombres de la v27: «the 5 out front», no «the 5 leaders».
    expect(
      chronicleLine(event({ plantilla: 'time_gap', datos: { gapS: 90, trend: 0, leadSize: 5 } })),
    ).toContain('5 out front')
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

  // «1 OF THEIR COMPANION SITS ON» (v25): la coletilla estaba escrita para varios y con uno se
  // rompía. El que va a rueda es UN compañero, no «uno de su compañero».
  it('con un solo pasajero la frase va en singular y concuerda', () => {
    const l = share(1, ['Ana', 'Bea'])
    expect(l).toContain('one of their companions sits on')
    expect(l).not.toContain('1 of their companion sits on')
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
    const plano = partes.map((p) => ('text' in p ? p.text : '')).join('')
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

  // Hubo un umbral: a partir del cuarto corredor la frase se quedaba en bandera y nombre, para no
  // hacer un muro. El dueño lo rechazó al verlo en producción («siguen saliendo entradas sin dorsal
  // y nombre de equipo»). La identidad va completa SIEMPRE; el muro se evita nombrando a menos en
  // los resúmenes (`NAMED_IN_SUMMARY`), no identificando peor.
  it('una lista de ocho lleva los ocho dorsales y los ocho equipos', () => {
    const ocho = Array.from({ length: 8 }, (_, i) =>
      rider(`Rider ${i}`, { bib: 10 + i, team: `Team ${i}`, country: 'ES' }),
    )
    const l = chronicleLine(
      event({ plantilla: 'front_group', protagonists: ocho, datos: { size: 8, toGo: 20 } }),
    )
    for (let i = 0; i < 8; i++) {
      expect(l).toContain(`${10 + i} Rider ${i} (Team ${i})`)
    }
  })

  it('y con tres también, que es lo que ya hacía', () => {
    const tres = Array.from({ length: 3 }, (_, i) =>
      rider(`Rider ${i}`, { bib: 10 + i, team: `Team ${i}`, country: 'ES' }),
    )
    expect(
      chronicleLine(
        event({ plantilla: 'front_group', protagonists: tres, datos: { size: 3, toGo: 20 } }),
      ),
    ).toContain('(Team 0)')
  })

  // El racimo de descuelgues nombra a tres de los muchos, y esos tres van IDENTIFICADOS: era el
  // segundo sitio donde se colaba el nombre pelado.
  it('el resumen de un racimo identifica a los que nombra', () => {
    const muchos = Array.from({ length: 20 }, (_, i) =>
      rider(`Rider ${i}`, { bib: 30 + i, team: `Team ${i}`, country: 'IT' }),
    )
    const l = chronicleLine(
      event({ plantilla: 'riders_sit_up', protagonists: muchos, datos: { count: 20, toGo: 12 } }),
    )
    expect(l).toContain('20 riders')
    expect(l).toContain('30 Rider 0 (Team 0)')
    // …pero no los veinte: para eso está el número.
    expect(l).not.toContain('Rider 19')
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

  // El motivo no va en las tres redacciones (repetirlo cuatro veces en una etapa cansa), así que se
  // comprueba sobre las variantes: al menos una lo dice, y ninguna habla de un jefe de filas único.
  it('con líderes distintos es una alianza, y se dice por qué coinciden', () => {
    const lineas = [90, 91, 92, 93, 94, 95, 96, 97].map((km) =>
      chronicleLine(
        event({
          plantilla: 'peloton_pull',
          km,
          protagonists: [
            rider('Ana', { team: 'Summit Squad' }),
            rider('Bea', { team: 'Team Sol' }),
          ],
          datos: {
            size: 120,
            effort: 'firme',
            toGo: 45,
            chasing: 1,
            forKind: 'alianza',
            forLeaders: 2,
          },
        }),
      ),
    )
    expect(lineas.some((l) => l.includes('the lead group has to come back'))).toBe(true)
    expect(lineas.every((l) => l.includes('Ana') && l.includes('Bea'))).toBe(true)
    expect(lineas.every((l) => !l.includes('working for'))).toBe(true)
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

// --- v14 · la pájara, el abandono y el fuera de control (docs/motor.md §15 y §VI.3) ----------
// El motor ejecutaba la pájara desde la v8 sin contarla y no emitía un solo abandono. Aquí se
// comprueba que las frases nuevas dicen lo que hace falta y que degradan igual que el resto.

describe('v14 · pájara, abandono y corte de tiempo', () => {
  it('la pájara dice quién revienta y a cuántos km de meta', () => {
    const l = chronicleLine(
      event({
        plantilla: 'rider_bonks',
        protagonists: [rider('Ana Soler', { bib: 42, team: 'Equipo Sol', country: 'ES' })],
        datos: { toGo: 55 },
      }),
    )
    expect(l).toContain('Ana Soler')
    expect(l).toContain('42')
    expect(l).toContain('Equipo Sol')
    expect(l).toContain('55')
  })

  it('varias pájaras a la vez se cuentan con número', () => {
    const l = chronicleLine(
      event({
        plantilla: 'riders_bonk',
        protagonists: Array.from({ length: 9 }, (_, i) => rider(`Rider ${i}`)),
        datos: { count: 9, toGo: 40 },
      }),
    )
    expect(l).toContain('9 riders')
    expect(l).toContain('40 km to go')
  })

  it('el abandono lleva la identidad completa: es el final de su carrera', () => {
    const l = chronicleLine(
      event({
        plantilla: 'rider_abandons',
        protagonists: [rider('Leo Marín', { bib: 7, team: 'Cumbre', country: 'ES' })],
        datos: { causa: 'colapso', toGo: 62 },
      }),
    )
    expect(l).toContain('Leo Marín')
    expect(l).toContain('Cumbre')
    expect(l).toContain('62')
  })

  it('varios abandonos en el mismo tramo se cuentan juntos', () => {
    const l = chronicleLine(
      event({
        plantilla: 'riders_abandon',
        protagonists: Array.from({ length: 5 }, (_, i) => rider(`Rider ${i}`)),
        datos: { count: 5 },
      }),
    )
    expect(l).toContain('5 riders abandon')
    expect(l).toContain('2 more')
  })

  it('el fuera de control dice el límite y a cuántos se lleva', () => {
    const uno = chronicleLine(
      event({
        plantilla: 'time_cut',
        protagonists: named('Ana'),
        datos: { count: 1, limitPct: 8, gapS: 1500 },
      }),
    )
    expect(uno).toContain('Ana')
    expect(uno).toContain('8%')
    const varios = chronicleLine(
      event({
        plantilla: 'time_cut',
        protagonists: named('Ana', 'Leo'),
        datos: { count: 4, limitPct: 18, gapS: 2000 },
      }),
    )
    expect(varios).toContain('4 riders')
    expect(varios).toContain('18%')
  })

  it('la readmisión con penalización se cuenta como lo que es', () => {
    const l = chronicleLine(
      event({ plantilla: 'time_cut_readmitted', datos: { count: 23, limitPct: 12 } }),
    )
    expect(l).toContain('23 riders')
    expect(l).toContain('12%')
    expect(l.toLowerCase()).toContain('points')
  })
})

/**
 * EL MAILLOT DE LÍDER EN LA CRÓNICA.
 *
 * El maillot va DENTRO de la identidad del corredor —igual que el dorsal, el equipo y la bandera—,
 * así que sale solo en TODAS las menciones y no hay una sola plantilla que lo nombre. Lo que se
 * prueba aquí es justo eso: que aparece sin tocar las frases, que `chronicleLine()` sigue
 * devolviendo el texto pelado de siempre, y que una crónica sin maillots no cambia en nada.
 */
describe('el maillot de líder en la crónica', () => {
  const lider = rider('Ole Andersen', { bib: 163, team: 'Aurora', country: 'NO', jersey: 'gc' })
  const raso = rider('Ana Ruiz', { bib: 41, team: 'Team Sol', country: 'ES' })

  it('el maillot NO va en el texto: va como trozo aparte, para pintarlo con `<LeaderJersey/>`', () => {
    const e = event({ plantilla: 'stage_win', protagonists: [lider], datos: { won: 'sprint' } })
    expect(chronicleParts(e)).toContainEqual({ jersey: 'gc' })
    // Y el texto pelado es EXACTAMENTE el mismo que sin maillot: los tests y cualquier contexto sin
    // DOM (informes, noticias) siguen leyendo la misma frase, sin marcas invisibles dentro.
    const sinMaillot = event({
      plantilla: 'stage_win',
      protagonists: [{ ...lider, jersey: null }],
      datos: { won: 'sprint' },
    })
    expect(chronicleLine(e)).toBe(chronicleLine(sinMaillot))
    // Sin marcas invisibles dentro: el texto pelado es texto y nada más. Se comprueba con
    // `String.fromCharCode` y no con una expresión regular, que con caracteres de control
    // literales es justo lo que prohíbe `no-control-regex`.
    for (const marca of [1, 2]) expect(chronicleLine(e)).not.toContain(String.fromCharCode(marca))
  })

  it('el maillot abre la mención, delante de la bandera y del dorsal', () => {
    const partes = chronicleParts(
      event({ plantilla: 'stage_win', protagonists: [lider], datos: { won: 'sprint' } }),
    )
    const iJersey = partes.findIndex((p) => 'jersey' in p)
    const iFlag = partes.findIndex((p) => 'flag' in p)
    expect(iJersey).toBeGreaterThanOrEqual(0)
    expect(iJersey).toBeLessThan(iFlag)
    const texto = partes.map((p) => ('text' in p ? p.text : '')).join('')
    expect(texto).toContain('163 Ole Andersen (Aurora)')
  })

  it('sale en TODAS las menciones: en las listas y en las frases que ya nombran al equipo', () => {
    const lista = chronicleParts(
      event({
        plantilla: 'front_group',
        protagonists: [raso, lider, rider('Bea', { jersey: 'kom' })],
        datos: { size: 3, toGo: 20 },
      }),
    )
    expect(lista.filter((p) => 'jersey' in p)).toEqual([{ jersey: 'gc' }, { jersey: 'kom' }])
    // `riderShort` —la versión sin equipo, para las frases que ya lo dicen aparte— también lo
    // lleva: es el mismo hombre, solo se calla el equipo.
    const tren = chronicleParts(
      event({
        plantilla: 'sprinters_chase',
        protagonists: [{ ...lider, jersey: 'points' }],
        datos: {},
      }),
    )
    expect(tren.some((p) => 'jersey' in p)).toBe(true)
  })

  it('cada maillot llega con su tipo, sin mezclarse', () => {
    for (const kind of ['gc', 'points', 'kom'] as const) {
      const partes = chronicleParts(
        event({ plantilla: 'stage_win', protagonists: [{ ...raso, jersey: kind }] }),
      )
      expect(partes).toContainEqual({ jersey: kind })
    }
  })

  // Compatibilidad hacia atrás: la etapa 1, una carrera de un día y cualquier crónica que la API
  // sirva sin maillots tienen que salir EXACTAMENTE como salían antes.
  it('sin maillots la crónica es la de siempre, trozo a trozo', () => {
    const e = event({ plantilla: 'stage_win', protagonists: [raso], datos: { won: 'sprint' } })
    expect(chronicleParts(e).some((p) => 'jersey' in p)).toBe(false)
    expect(chronicleParts(e)).toContainEqual({ flag: 'ES' })
  })

  it('un corredor que ya no está en el roster —sin nada— tampoco lleva maillot', () => {
    const e = event({ plantilla: 'stage_win', protagonists: named('Ghost Rider') })
    expect(chronicleParts(e).some((p) => 'jersey' in p)).toBe(false)
    expect(chronicleLine(e)).toContain('Ghost Rider')
  })
})

// --- LA CONTRARRELOJ (motor v18) ---------------------------------------------------------------
// «En el Journal puedes ir diciendo quién hace el mejor tiempo y quién le supera, etc… o sea como
// una crónica de una contrarreloj de verdad… también cuando alguien de los primeros "dobla" a otro».
// Hasta la v17 una crono entera era UNA línea; aquí se fija lo que cada frase nueva tiene que decir.

describe('v18 · la crónica de una contrarreloj', () => {
  const pucnik = rider('Andrej Pucnik', { bib: 11, team: 'Cumbre Escuadra', country: 'SI' })
  const moreau = rider('Hugo Moreau', { bib: 149, team: 'Delta Pro', country: 'FR' })
  const amarillo = { ...pucnik, jersey: 'gc' as const }

  it('la línea de salida explica el formato: general invertida y 2 minutos', () => {
    const line = chronicleLine(
      event({
        plantilla: 'tt_start_order',
        km: 0,
        protagonists: [moreau],
        datos: { mode: 'general', intervalS: 120, riders: 130, windowS: 15480 },
      }),
    )
    expect(line).toContain('130 riders')
    expect(line).toContain('2 minutes apart')
    expect(line).toContain('Hugo Moreau')
    // Y por qué el amarillo sale el último, que es lo que hace legible el resto de la crónica.
    expect(line.toLowerCase()).toContain('last')
  })

  it('…y por dorsales dice que el 1 cierra la crono', () => {
    const line = chronicleLine(
      event({
        plantilla: 'tt_start_order',
        km: 0,
        protagonists: [moreau],
        datos: { mode: 'dorsales', intervalS: 60, riders: 40 },
      }),
    )
    expect(line).toContain('one-minute intervals')
    expect(line).toMatch(/number 1|ending in 1/)
  })

  it('el último en tomar la rampa se cuenta en horas, no en minutos corridos', () => {
    const line = chronicleLine(
      event({
        plantilla: 'tt_last_off',
        km: 0,
        protagonists: [amarillo],
        datos: { afterS: 15480, riders: 130 },
      }),
    )
    // 15.480 s son 4:18:00. «258:00» es lo que salía antes, y no se lee.
    expect(line).toContain('4:18:00')
    expect(line).not.toContain('258:00')
  })

  it('el parcial dice el punto de control, el tiempo y a quién se lo quita', () => {
    const line = chronicleLine(
      event({
        plantilla: 'tt_split',
        km: 11,
        protagonists: [pucnik, moreau],
        datos: { checkKm: 11, splitS: 1060, gainS: 14 },
      }),
    )
    expect(line).toContain('11 km')
    expect(line).toContain('17:40')
    expect(line).toContain('Andrej Pucnik')
    expect(line).toContain('Hugo Moreau')
  })

  it('el primero en pasar por un control no se compara con nadie', () => {
    const line = chronicleLine(
      event({
        plantilla: 'tt_split',
        km: 11,
        protagonists: [moreau],
        datos: { checkKm: 11, splitS: 1100, gainS: 0 },
      }),
    )
    expect(line).toContain('First through')
    expect(line).not.toContain('undefined')
  })

  it('la silla del mejor tiempo: quién la estrena y quién se la queda', () => {
    const primero = chronicleLine(
      event({ plantilla: 'tt_first_time', km: 33, protagonists: [moreau], datos: { timeS: 3221 } }),
    )
    expect(primero).toContain('53:41')
    const mejor = chronicleLine(
      event({
        plantilla: 'tt_best_time',
        km: 33,
        protagonists: [pucnik, moreau],
        datos: { timeS: 3179, gainS: 42 },
      }),
    )
    expect(mejor).toContain('52:59')
    expect(mejor).toContain('42s')
    expect(mejor).toContain('Hugo Moreau')
  })

  it('el alcance dice dónde, con cuánta ventaja de salida, y que NO da rebufo', () => {
    const line = chronicleLine(
      event({
        plantilla: 'tt_catch',
        km: 24,
        protagonists: [pucnik, moreau],
        datos: { headStartS: 120 },
      }),
    )
    expect(line).toContain('km 24')
    expect(line).toContain('2:00')
    // La regla real, dicha en la frase: alcanzar no es ir a rueda.
    expect(line).toMatch(/shelter|pulls aside|swing wide|out of the way/)
  })

  it('el recuento de alcances se dice tal cual, sin maquillar', () => {
    expect(
      chronicleLine(event({ plantilla: 'tt_catches', km: 33, datos: { count: 117 } })),
    ).toContain('117 riders')
    expect(
      chronicleLine(event({ plantilla: 'tt_catches', km: 33, datos: { count: 1 } })),
    ).toContain('One rider')
  })

  it('el que salió el último cierra la historia con su diferencia y su puesto', () => {
    const line = chronicleLine(
      event({
        plantilla: 'tt_last_home',
        km: 33,
        protagonists: [amarillo],
        datos: { gapS: 95, timeS: 2383, puesto: 12 },
      }),
    )
    expect(line).toContain('+1:35')
    expect(line).toContain('12th')
  })

  it('el ganador se canta con su tiempo y su margen…', () => {
    const line = chronicleLine(
      event({
        plantilla: 'stage_win_itt',
        km: 33,
        protagonists: [pucnik],
        datos: { timeS: 2288, marginS: 35 },
      }),
    )
    expect(line).toContain('38:08')
    expect(line).toContain('35s')
  })

  it('…y una crono CONGELADA antes de la v18, sin datos, se sigue leyendo', () => {
    // Las etapas ya corridas tienen sus eventos congelados y solo traen el protagonista.
    expect(chronicleLine(event({ plantilla: 'stage_win_itt', protagonists: [pucnik] }))).toBe(
      '11 Andrej Pucnik (Cumbre Escuadra) sets the fastest time.',
    )
  })

  it('los sufijos ordinales son los ingleses de verdad, incluidas las excepciones', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map((n) => `${n}${ordinalSuffix(n)}`)).toEqual(
      ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st'],
    )
  })
})

// --- LA CRIBA LEJOS DE META (v21, docs/motor.md §16) ----------------------------------------
// `peloton_split` solo se narra en los últimos 30 km, y la etapa se decide a veces mucho antes: en
// Race Great Ocean el grupo de cabeza pasó de 116 a 80 a 50 km de meta y la crónica no dijo nada.

describe('la criba lejos de meta tiene frase propia (v21)', () => {
  const criba = (datos: Record<string, number | string>, who: ChronicleRider[] = []) =>
    chronicleLine(event({ plantilla: 'peloton_selection', km: 160, protagonists: who, datos }))

  it('dice de cuántos a cuántos y CUÁNTO FALTA: es lo que la hace noticia', () => {
    const linea = criba({
      before: 116,
      remaining: 80,
      dropped: 36,
      toGo: 50,
      fromKm: 152,
      chasing: 0,
    })
    expect(linea).toContain('116')
    expect(linea).toContain('80')
    expect(linea).toContain('50 km')
  })

  it('con el pelotón entero delante, quien fuerza la criba es un EQUIPO', () => {
    const linea = criba({ before: 116, remaining: 80, dropped: 36, toGo: 50, chasing: 0 }, [
      rider('Iker Zabala', { team: 'Summit Squad' }),
    ])
    expect(linea).toContain('Summit Squad')
  })

  it('con un grupo ya pequeño no tira un equipo, tira un corredor', () => {
    const linea = criba({ before: 8, remaining: 3, dropped: 5, toGo: 60, chasing: 0 }, [
      rider('Iker Zabala', { team: 'Summit Squad' }),
    ])
    expect(linea).toContain('Iker Zabala')
    expect(linea).not.toContain('Summit Squad force')
  })

  it('si delante queda uno solo, la frase no habla de "de N a 1"', () => {
    const linea = criba({ before: 40, remaining: 1, dropped: 39, toGo: 70, chasing: 0 }, [
      rider('Iker Zabala'),
    ])
    expect(linea).toContain('alone')
    expect(linea).toContain('39')
  })

  it('distingue el grupo de cabeza del de persecución', () => {
    expect(criba({ before: 90, remaining: 50, dropped: 40, toGo: 55, chasing: 1 })).toContain(
      'chase',
    )
  })
})

// --- LA RACHA DE PARTES DE BOQUETE (v21) ----------------------------------------------------
// Nueve frases seguidas para contar que una fuga se hunde son UNA noticia contada nueve veces. La
// crónica agrupa la racha y aquí se redacta el arco: de dónde venía, en qué se quedó y en cuántos km.

describe('la racha de partes de boquete se cuenta en una frase (v21)', () => {
  const run = (datos: Record<string, number | string>, km = 190) =>
    chronicleLine(event({ plantilla: 'time_gap_run', km, protagonists: [], datos }))

  it('la fuga que se hunde: de dónde a dónde y en cuántos km', () => {
    const linea = run({ gapS: 38, fromGapS: 179, fromKm: 154, trend: -1, leadSize: 1 })
    expect(linea).toContain('2:59')
    expect(linea).toContain('38s')
    expect(linea).toContain('36 km')
  })

  it('la ventaja que no para de crecer se cuenta igual, en el otro sentido', () => {
    const linea = run({ gapS: 4165, fromGapS: 1336, fromKm: 196, trend: 1, leadSize: 4 }, 223)
    expect(linea).toContain('22:16')
    expect(linea).toContain('69:25')
  })

  it('una ventaja clavada dice que no se mueve, y no repite el número diez veces', () => {
    const linea = run({ gapS: 420, fromGapS: 418, fromKm: 120, trend: 0, leadSize: 20 })
    expect(linea).toContain('7:00')
    expect(linea).toMatch(/barely moves|Stalemate/)
  })

  it('sabe de quién habla: un corredor solo, un puñado o la fuga', () => {
    expect(run({ gapS: 38, fromGapS: 179, fromKm: 154, trend: -1, leadSize: 1 })).toContain(
      'lone leader',
    )
    expect(run({ gapS: 38, fromGapS: 179, fromKm: 154, trend: -1, leadSize: 4 })).toContain(
      '4 out front',
    )
    // Con un grupo grande no hay nombres que dar y manda el vocabulario (v27): el grupo de cabeza
    // se llama igual toda la etapa, se llame fuga del día o trozo de pelotón.
    expect(run({ gapS: 38, fromGapS: 179, fromKm: 154, trend: -1, leadSize: 40 })).toContain(
      'the lead group',
    )
  })
})

// --- LO QUE EL DUEÑO CONTÓ EN UN JOURNAL DE PRODUCCIÓN (v21, Race Bességes e4) ----------------

describe('la captura de la fuga cuenta el desenlace (v21)', () => {
  const caught = (datos: Record<string, number | string>, who: ChronicleRider[] = []) =>
    chronicleLine(event({ plantilla: 'breakaway_caught', km: 164, protagonists: who, datos }))

  it('al escapado en solitario se le nombra, y se dice cuánto llevaba fuera', () => {
    const linea = caught({ size: 1, awayKm: 131, toGo: 0, juntos: 0 }, [rider('Nicolas Ferrari')])
    expect(linea).toContain('Nicolas Ferrari')
    expect(linea).toContain('131 km')
  })

  it('cazado en la línea de meta se cuenta como lo que es', () => {
    const linea = caught({ size: 1, awayKm: 131, toGo: 0, juntos: 0 }, [rider('Nicolas Ferrari')])
    expect(linea).toContain('within sight of the line')
  })

  it('cazado lejos de meta no dice que fue en la línea', () => {
    const linea = caught({ size: 2, awayKm: 90, toGo: 45, juntos: 1 }, named('A', 'B'))
    expect(linea).not.toContain('within sight of the line')
    expect(linea).toContain('90 km')
  })

  it('no dice «todos juntos otra vez» cuando la carrera está rota', () => {
    const linea = caught({ size: 12, awayKm: 100, toGo: 2, juntos: 0 })
    expect(linea).not.toMatch(/together/)
  })

  it('…y lo dice cuando de verdad se junta', () => {
    const linea = caught({ size: 12, awayKm: 100, toGo: 40, juntos: 1 })
    expect(linea).toMatch(/together|reeled back in|catches the breakaway/)
  })
})

describe('las frases que no pueden decir tonterías (v21)', () => {
  it('un solo fugado no lleva el verbo en plural', () => {
    const linea = chronicleLine(
      event({ plantilla: 'breakaway_formed', km: 33, protagonists: named('Nicolas Ferrari') }),
    )
    expect(linea).not.toMatch(/Ferrari go\b/)
    expect(linea).toMatch(/goes|slips away|lone one/)
  })

  it('con dos o más, la frase de siempre', () => {
    const linea = chronicleLine(
      event({ plantilla: 'breakaway_formed', km: 33, protagonists: named('A', 'B') }),
    )
    expect(linea).toContain('A and B')
  })

  it('uno no colabora consigo mismo', () => {
    const linea = chronicleLine(
      event({
        plantilla: 'break_cooperation',
        km: 33,
        protagonists: named('Nicolas Ferrari'),
        datos: { cooperating: 1 },
      }),
    )
    expect(linea).not.toContain('collaborate')
    expect(linea).toContain('on his own')
  })

  it('quién cerró la caza dice lo que el dato mide: la CÚSPIDE del boquete', () => {
    const linea = chronicleLine(
      event({
        plantilla: 'chase_work',
        km: 164,
        protagonists: [
          rider('Patrick Henry', { team: 'Phénix Cycling' }),
          rider('Philippe Roux', { team: 'Aigle Cyclisme' }),
        ],
        datos: { closedS: 140, km: 5, work: 27.4 },
      }),
    )
    expect(linea).toContain('2:20')
    expect(linea).toContain('5 km')
    expect(linea).toMatch(/peak|high point/)
  })
})

/**
 * El relleno regional de las continentales corre SIN equipo comercial —90 corredores del mundo, en
 * bloques de hasta 12 por carrera— y hasta ahora salía con el hueco del equipo vacío, que el jugador
 * lee como un fallo. La hoja de resultados de verdad los llama «Individual».
 */
describe('el corredor sin equipo se llama Individual, y solo cuando lo sabemos', () => {
  it('con dorsal y sin equipo: es un individual, y se dice', () => {
    const e = event({
      plantilla: 'attack_go',
      protagonists: [rider('Nicolás Gómez', { bib: 222, country: 'CO' })],
    })
    expect(chronicleLine(e)).toContain('222 Nicolás Gómez (Individual)')
  })

  it('con equipo, manda el equipo', () => {
    const e = event({
      plantilla: 'attack_go',
      protagonists: [rider('Carlo Lombardo', { bib: 11, country: 'IT', team: 'Welle Team' })],
    })
    const line = chronicleLine(e)
    expect(line).toContain('11 Carlo Lombardo (Welle Team)')
    expect(line).not.toContain('Individual')
  })

  it('SIN dorsal no se inventa nada: no sabemos su equipo, no que no tenga', () => {
    // Es el corredor de una crónica congelada que ya no está en el roster de hoy: llega sin dorsal,
    // sin equipo y sin bandera. Llamarlo «Individual» sería afirmar algo que no consta.
    const e = event({ plantilla: 'attack_go', protagonists: [rider('Un Fantasma')] })
    const line = chronicleLine(e)
    expect(line).toContain('Un Fantasma')
    expect(line).not.toContain('Individual')
  })

  it('y NUNCA actúa como equipo: «Individual» no tira del pelotón', () => {
    // `teamsOf` sigue descartando a quien no tiene equipo, así que las frases de equipo no lo
    // nombran: esos corredores son individuales, no una escuadra que pueda organizar una caza.
    const e = event({
      plantilla: 'chase_work',
      protagonists: [
        rider('Nicolás Gómez', { bib: 222, country: 'CO' }),
        rider('Edwin Cardenas', { bib: 223, country: 'CO' }),
      ],
    })
    expect(chronicleLine(e)).not.toContain('Individual hit the front')
  })
})

/**
 * V25 · LAS FRASES QUE SE CONTRADECÍAN (docs/balance.md «v25»). Todas salen del diario de Race Jaén
 * que el dueño leyó, y todas se cuentan sobre el mundo entero en `scripts/medir-defectos.mjs`.
 */
describe('v25 · el relato no se contradice', () => {
  it('con un solo atacante los que no aguantan la rueda van CON ÉL', () => {
    const l = chronicleLine(
      event({
        plantilla: 'attack_go',
        km: 28,
        protagonists: named('Álvaro'),
        datos: { saltan: 1, tierra: 3, cuerda: 0, toGo: 182, solo: 1 },
      }),
    )
    expect(l).toContain('3 more try to go with him')
    expect(l).not.toContain('with them')
  })

  it('cuando el grupo de cabeza CRECE la frase no dice «ya solo quedan N»', () => {
    const l = chronicleLine(
      event({
        plantilla: 'front_group',
        km: 156,
        protagonists: named('Taylor', 'Jereb', 'Moretti'),
        datos: { size: 3, gapS: 60, toGo: 54, entran: 2, salen: 1 },
      }),
    )
    expect(l).not.toContain('Only 3 riders left in front')
    expect(l).toMatch(/come across/)
    expect(l).toContain('Taylor')
  })

  it('…y cuando se deshace, sí', () => {
    const l = chronicleLine(
      event({
        plantilla: 'front_group',
        km: 120,
        protagonists: named('Taylor'),
        datos: { size: 1, gapS: 60, toGo: 30, salen: 2 },
      }),
    )
    expect(l).toContain('alone at the front')
  })

  it('la captura dice de cuántos había salido la fuga cuando ya no son los mismos', () => {
    const l = chronicleLine(
      event({
        plantilla: 'breakaway_caught',
        km: 190,
        protagonists: named('Taylor', 'Rus'),
        datos: { size: 2, deLos: 6, awayKm: 189, toGo: 20, juntos: 1 },
      }),
    )
    expect(l).toContain('started with 6')
  })

  it('una fuga que se apaga sola no se cuenta como una fuga cazada', () => {
    const l = chronicleLine(
      event({
        plantilla: 'breakaway_caught',
        km: 150,
        protagonists: named('Taylor'),
        datos: { size: 1, awayKm: 120, motivo: 'deshecha' },
      }),
    )
    expect(l).not.toMatch(/caught|catches/)
    expect(l).toMatch(/falls apart|comes undone/)
  })

  it('la cúspide del boquete se sitúa en la carretera y no repite la cuenta de la captura', () => {
    const l = chronicleLine(
      event({
        plantilla: 'chase_work',
        km: 190,
        protagonists: named('Muller'),
        datos: { closedS: 184, km: 172, peakKm: 26, work: 18.5, pegado: 1 },
      }),
    )
    expect(l).toContain('back at km 26')
    expect(l).not.toContain('172 km later')
  })

  it('el equipo que ya estaba tirando cuenta lo que ha cambiado, no otra presentación', () => {
    const l = chronicleLine(
      event({
        plantilla: 'peloton_pull',
        km: 94,
        protagonists: [rider('Fischer', { team: 'Fuego Escuadra' })],
        datos: {
          size: 128,
          effort: 'tempo',
          forKind: 'gregarios',
          chasing: 1,
          toGo: 116,
          repite: 1,
        },
      }),
    )
    expect(l).toMatch(/ease off|pace comes down/)
  })

  it('el manotazo que dura un kilómetro se cuenta entero en una línea', () => {
    const l = chronicleLine(
      event({
        plantilla: 'attack_short',
        km: 196,
        protagonists: named('Turk'),
        datos: { saltan: 1, solo: 1, km: 1, kind: 'contraataque' },
      }),
    )
    expect(l).toContain('Turk')
    expect(l).toMatch(/within the kilometre|snaps back/)
  })

  it('el movimiento que se apaga se cuenta como lo que fue: nadie le cazó', () => {
    const l = chronicleLine(
      event({
        plantilla: 'move_faded',
        km: 140,
        protagonists: named('Brown'),
        datos: { kind: 'puente', km: 26, toGo: 70 },
      }),
    )
    expect(l).toContain('Brown')
    expect(l).toMatch(/dies out|fade/)
  })

  it('un puente que engancha dice en cuántos queda la cabeza de carrera', () => {
    const l = chronicleLine(
      event({
        plantilla: 'bridge_made',
        km: 167,
        protagonists: named('Rus'),
        datos: { size: 4, entran: 1, toGo: 43 },
      }),
    )
    expect(l).toContain('4 in front now')
  })
})

// --- LA ESPINA DORSAL DEL RELATO (v27) ---------------------------------------------------------
// El dueño leyó la etapa 1 de Race Andalucía —ya sin contradicciones, la v25 las había quitado— y
// dijo que «si lees todo el Journal no SABES quién va ganando, quién va persiguiendo… es un lío los
// últimos mensajes». Estas pruebas son la regla que ordenó la tanda: en cualquier punto del diario
// se puede responder QUIÉN VA DELANTE, CON CUÁNTA VENTAJA, SOBRE QUIÉN y CUÁNTO QUEDA.

describe('el vocabulario de grupos: tres cosas, tres nombres (v27)', () => {
  /**
   * Las frases se leen buscando los nombres de grupo VIGILADOS, de más largo a más corto —«the chase
   * group» contiene «the chase», y quien no ordene contará dos donde hay uno—. Lo que aparezca tiene
   * que estar declarado en `GROUP_NOUNS` para esa plantilla: así la tabla que cuenta el vocabulario
   * sobre el mundo entero (`sim/coherence.ts`) y las frases de verdad no se pueden separar.
   */
  function nounsIn(line: string): string[] {
    let resto = line
    const found: string[] = []
    for (const noun of WATCHED_GROUP_NOUNS) {
      while (resto.toLowerCase().includes(noun)) {
        found.push(noun)
        resto = resto.replace(new RegExp(noun, 'i'), '·')
      }
    }
    return [...new Set(found)]
  }

  /**
   * Un ejemplar de cada plantilla, con datos plausibles y con las dos caras de cada bifurcación que
   * cambia el nombre del grupo (persiguiendo o en cabeza, grupo grande o pequeño). El km se varía
   * para recorrer TODAS las redacciones: la variante se elige por hash del km y los nombres.
   */
  const ejemplares: {
    plantilla: string
    datos: Record<string, number | string>
    who?: string[]
  }[] = [
    { plantilla: 'attack_go', datos: { kind: 'fuga', saltan: 2, tierra: 1, cuerda: 0, toGo: 100 } },
    { plantilla: 'attack_go', datos: { kind: 'ataque_final', saltan: 1, toGo: 8, solo: 1 } },
    { plantilla: 'attack_go', datos: { kind: 'ataque_grupo', saltan: 2, toGo: 30 } },
    { plantilla: 'attack_go', datos: { kind: 'puente', saltan: 1, toGo: 40, solo: 1 } },
    { plantilla: 'attack_short', datos: { saltan: 1, km: 2, solo: 1 } },
    { plantilla: 'attack_swarm', datos: { saltan: 14 } },
    { plantilla: 'attack_sticks', datos: { size: 1, gapS: 40, toGo: 20 } },
    { plantilla: 'attack_sticks', datos: { size: 3, gapS: 40, toGo: 20 } },
    { plantilla: 'attack_reeled', datos: {} },
    { plantilla: 'move_faded', datos: { km: 12 } },
    { plantilla: 'move_caught', datos: { km: 30, kind: 'puente' } },
    { plantilla: 'move_merge', datos: { entran: 2, size: 6 } },
    { plantilla: 'bridge_made', datos: { size: 4, entran: 1 } },
    { plantilla: 'bridge_failed', datos: { toGo: 28 } },
    { plantilla: 'breakaway_formed', datos: {}, who: ['Ana'] },
    { plantilla: 'breakaway_formed', datos: {}, who: ['Ana', 'Bea', 'Cris'] },
    { plantilla: 'break_cooperation', datos: { cooperating: 1 }, who: ['Ana', 'Bea'] },
    { plantilla: 'break_cooperation', datos: { cooperating: 0 }, who: ['Ana', 'Bea'] },
    { plantilla: 'break_share', datos: { passengers: 2 } },
    { plantilla: 'rider_sits_up', datos: { toGo: 30 } },
    { plantilla: 'riders_sit_up', datos: { count: 9, toGo: 30 } },
    { plantilla: 'rider_bonks', datos: { toGo: 30 } },
    { plantilla: 'sprinters_chase', datos: {} },
    { plantilla: 'sprinters_chase', datos: { porQue: 'maillot' } },
    { plantilla: 'sprinters_give_up', datos: {} },
    { plantilla: 'peloton_concedes', datos: {} },
    { plantilla: 'peloton_concedes', datos: { cazada: 1 } },
    { plantilla: 'peloton_pull', datos: { size: 120, effort: 'firme', toGo: 60, chasing: 1 } },
    { plantilla: 'peloton_pull', datos: { size: 4, effort: 'tope', toGo: 20, chasing: 1 } },
    { plantilla: 'peloton_pull', datos: { size: 120, effort: 'tope', toGo: 20, repite: 1 } },
    { plantilla: 'peloton_split', datos: { before: 80, remaining: 40, dropped: 40, chasing: 1 } },
    { plantilla: 'peloton_split', datos: { before: 80, remaining: 40, dropped: 40, chasing: 0 } },
    {
      plantilla: 'peloton_selection',
      datos: { before: 119, remaining: 13, dropped: 80, toGo: 125, chasing: 1 },
    },
    {
      plantilla: 'peloton_selection',
      datos: { before: 119, remaining: 13, dropped: 80, toGo: 125, chasing: 0 },
    },
    { plantilla: 'peloton_regroup', datos: { joined: 14, remaining: 19, before: 5, chasing: 1 } },
    { plantilla: 'peloton_regroup', datos: { joined: 14, remaining: 19, before: 5, chasing: 0 } },
    { plantilla: 'time_gap', datos: { gapS: 90, trend: 1, leadSize: 40, chaseSize: 60 } },
    {
      plantilla: 'time_gap',
      datos: { gapS: 90, trend: -1, leadSize: 3, chaseSize: 60, chaseKind: 'peloton', toGo: 40 },
    },
    {
      plantilla: 'time_gap',
      datos: { gapS: 90, trend: 0, leadSize: 3, chaseSize: 9, chaseKind: 'caza', toGo: 40 },
    },
    {
      plantilla: 'time_gap_run',
      datos: { gapS: 38, fromGapS: 179, fromKm: 90, trend: -1, leadSize: 40 },
    },
    {
      plantilla: 'time_gap_run',
      datos: { gapS: 380, fromGapS: 90, fromKm: 90, trend: 1, leadSize: 1, chaseKind: 'caza' },
    },
    { plantilla: 'front_group', datos: { size: 5, gapS: 90, toGo: 40 } },
    { plantilla: 'front_group', datos: { size: 5, gapS: 90, toGo: 40, entran: 2, salen: 1 } },
    { plantilla: 'chase_work', datos: { closedS: 180, km: 20, peakKm: 60 } },
    { plantilla: 'breakaway_caught', datos: { size: 6, awayKm: 120, toGo: 30, juntos: 1 } },
    { plantilla: 'breakaway_caught', datos: { size: 6, awayKm: 120, toGo: 30, juntos: 0 } },
    { plantilla: 'breakaway_caught', datos: { size: 6, awayKm: 120, motivo: 'deshecha' } },
    { plantilla: 'bunch_sprint', datos: { field: 90, ledOut: 1 } },
    { plantilla: 'final_km', datos: { margin: 16, field: 1, chaseSize: 5 } },
    { plantilla: 'stage_win', datos: { won: 'solo', margin: 16 } },
    { plantilla: 'stage_win', datos: { won: 'sprint', margin: 0 } },
    { plantilla: 'stage_win', datos: { won: 'group', margin: 4 } },
  ]

  it('ninguna frase usa un nombre de grupo que no tenga declarado', () => {
    const malas: string[] = []
    for (const caso of ejemplares) {
      const permitidos = GROUP_NOUNS[caso.plantilla] ?? []
      // Todas las redacciones: la variante se elige por hash del km y de los nombres.
      for (const km of [10, 40, 70, 100, 130, 160]) {
        const linea = chronicleLine(
          event({
            plantilla: caso.plantilla,
            km,
            protagonists: named(...(caso.who ?? ['Ana', 'Bea'])),
            datos: caso.datos,
          }),
        )
        for (const noun of nounsIn(linea)) {
          if (!permitidos.includes(noun)) malas.push(`${caso.plantilla}: «${noun}» en «${linea}»`)
        }
      }
    }
    expect(malas).toEqual([])
  })

  it('los tres nombres que quedan son los tres del vocabulario', () => {
    // Lo que la tabla declara, después de la v27, no puede ser más que las tres cosas que hay en la
    // carretera. Si alguien añade un cuarto nombre a una plantilla, esta prueba lo caza.
    const usados = new Set(Object.values(GROUP_NOUNS).flat())
    expect([...usados].sort()).toEqual(['the bunch', 'the chase group', 'the lead group'])
  })
})

describe('el parte de ventaja responde a las cuatro preguntas (v27)', () => {
  const gap = (datos: Record<string, number | string>, who: ChronicleRider[] = []) =>
    chronicleLine(event({ plantilla: 'time_gap', km: 137, protagonists: who, datos }))

  it('dice QUIÉN va delante cuando se sabe quién es', () => {
    const linea = gap(
      { gapS: 177, trend: 1, leadSize: 1, chaseSize: 6, chaseKind: 'caza', toGo: 14 },
      named('Alexander Schwarz'),
    )
    expect(linea).toContain('Alexander Schwarz')
    expect(linea).toContain('2:57')
    expect(linea).toContain('the chase group')
    expect(linea).toContain('14 km to go')
  })

  it('sin nombres se queda con el grupo, y concuerda', () => {
    expect(gap({ gapS: 90, trend: 0, leadSize: 40 })).toContain('The lead group holds')
    expect(gap({ gapS: 90, trend: 0, leadSize: 4 })).toContain('The 4 out front hold')
  })

  it('una crónica congelada sin `chaseKind` no se inventa la referencia', () => {
    const linea = gap({ gapS: 413, trend: 1, leadSize: 1 })
    expect(linea).not.toContain('over')
  })
})

describe('el desenlace converge en quien decide la etapa (v27)', () => {
  it('el que ataca en los últimos km se cuenta yendo a por el líder', () => {
    const linea = chronicleLine(
      event({
        plantilla: 'attack_go',
        km: 140,
        protagonists: named('Peter Schulz'),
        datos: { kind: 'ataque_final', saltan: 1, toGo: 11, solo: 1, respecto: 1 },
        mentions: { liderId: rider('Alexander Schwarz') },
      }),
    )
    expect(linea).toContain('Peter Schulz')
    expect(linea).toContain('going after')
    expect(linea).toContain('Alexander Schwarz')
  })

  it('el hueco del que no manda se cuenta contra su grupo y con el líder al lado', () => {
    const linea = chronicleLine(
      event({
        plantilla: 'attack_sticks',
        km: 150,
        protagonists: named('Oliver Bailey'),
        datos: { size: 1, gapS: 46, toGo: 1, respecto: 1 },
        mentions: { liderId: rider('Alexander Schwarz') },
      }),
    )
    expect(linea).toContain('Oliver Bailey')
    expect(linea).toContain('46s')
    expect(linea).toContain('the stage is up the road with')
    expect(linea).toContain('Alexander Schwarz')
  })

  it('el último kilómetro dice sobre cuántos va el margen', () => {
    const linea = chronicleLine(
      event({
        plantilla: 'final_km',
        km: 150,
        protagonists: named('Alexander Schwarz'),
        datos: { margin: 16, field: 1, chaseSize: 5 },
      }),
    )
    expect(linea).toContain('16s')
    expect(linea).toContain('next 5 on the road')
  })

  it('un corredor solo no «sit up»: concuerda en singular', () => {
    const lineas = [10, 40, 70, 100].map((km) =>
      chronicleLine(event({ plantilla: 'attack_reeled', km, protagonists: named('Markus Weber') })),
    )
    expect(lineas.every((l) => !/\bWeber\b.*\bsit up\b/.test(l))).toBe(true)
    expect(lineas.some((l) => l.includes('sits up'))).toBe(true)
  })
})
