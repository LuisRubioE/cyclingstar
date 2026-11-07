import { type ChronicleEntry, type ChronicleRider, TEMPLATE_REV, fnv1a } from '@cyclingstar/shared'
import { GROUP_NOUNS, WATCHED_GROUP_NOUNS } from '@cyclingstar/engine'
import { describe, expect, it } from 'vitest'
import {
  chronicleLine,
  chronicleParts,
  fmtGap,
  groupNounOf,
  listNames,
  mainNoun,
  ordinalSuffix,
  pickPhrasing,
  riderGroupNoun,
  variantSeed,
} from './stageJournal'

/**
 * LA REVISIÓN DE PLANTILLAS de las frases de este fichero (E2, docs/retransmision.md §12.7; paso 12): la
 * 0, la de toda etapa corrida hasta hoy. Va fija y no es `TEMPLATE_REV`: cuando una redacción nueva entre
 * con `since: 1`, estos casos siguen diciendo lo que dice el pasado, que no cambia.
 */
const REV = 0

/**
 * Un corredor de prueba. Los tres campos de identidad son opcionales a propósito: lo que se está
 * probando la mitad de las veces es justo que la frase aguante sin ellos (etapas congeladas).
 */
function rider(name: string, over: Partial<ChronicleRider> = {}): ChronicleRider {
  return { name, id: null, bib: null, team: null, country: null, ...over }
}

/** Atajo: una lista de corredores solo con nombre, para las frases donde la identidad no se prueba. */
const named = (...names: string[]): ChronicleRider[] => names.map((n) => rider(n))

function event(partial: Partial<ChronicleEntry> & { plantilla: string }): ChronicleEntry {
  return { km: 100, protagonists: [], ...partial } as ChronicleEntry
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
})

/**
 * LA SEMILLA NEUTRA Y EL PASADO ESTABLE (E2, docs/retransmision.md §12.7, D-46; paso 12). Hasta el 12 la
 * redacción de cada línea se elegía con `variantIndex` sobre `${plantilla}:${km}:${nombres}`, los
 * nombres unidos con el «and» inglés de `listNames`, y el mapa 07 §3 encontró tres fallas: traducir la
 * lista o renombrar a un corredor cambiaba la redacción, y añadir una re-sorteaba el pasado (`h % n`
 * cambia con `n`). Desde el 12 la semilla es la plantilla, el km en décimas y los ids ordenados, y la
 * redacción se elige con `pickVariant` entre las que existían en la revisión de la etapa.
 */
describe('la semilla neutra de las variantes (§12.7, D-46)', () => {
  const ana = rider('Ana Ruiz', { id: 'r-ana', bib: 41, team: 'Team Sol', country: 'ES' })
  const bea = rider('Bea Soler', { id: 'r-bea', bib: 12, team: 'Summit Squad', country: 'IT' })

  it('es la plantilla, el km en décimas y los ids ordenados: ni nombres ni el «and»', () => {
    const e = event({ plantilla: 'attack_reeled', km: 87, protagonists: [bea, ana] })
    expect(variantSeed(e)).toBe('attack_reeled:870:r-ana,r-bea')
    // el orden en que el motor apunta a los protagonistas no cuenta
    expect(variantSeed({ ...e, protagonists: [ana, bea] })).toBe(variantSeed(e))
    // ni el nombre, ni el dorsal, ni el equipo, ni la bandera, ni el maillot
    const otros = [
      { ...ana, name: 'Ana María Ruiz', bib: 7, team: 'Team Luna', country: 'MX', jersey: 'gc' },
      bea,
    ] satisfies ChronicleRider[]
    expect(variantSeed({ ...e, protagonists: otros })).toBe(variantSeed(e))
    // y sin protagonistas, la plantilla y el km
    expect(variantSeed(event({ plantilla: 'peloton_regroup', km: 166 }))).toBe(
      'peloton_regroup:1660:',
    )
  })

  it('el corredor que la API no resuelve llega sin id y con su id crudo por nombre: la semilla sigue siendo un id', () => {
    const e = event({ plantilla: 'rider_sits_up', km: 40, protagonists: named('r-sin-ficha') })
    expect(variantSeed(e)).toBe('rider_sits_up:400:r-sin-ficha')
  })

  it('renombrar a un corredor ya no cambia la redacción de una etapa vista', () => {
    // El texto como se pinta, con el nombre enlazado: `chronicleLine` quita la marca del enlace y con
    // ella el nombre de todo corredor con id (voice.test.ts). `attack_reeled` tiene tres redacciones, y
    // con la semilla de antes el nombre nuevo cambiaba la elegida en dos de cada tres líneas.
    const texto = (e: ChronicleEntry): string =>
      chronicleParts('en', e, REV)
        .map((p) => ('text' in p ? p.text : ''))
        .join('')
    const renombrada = { ...ana, name: 'Ana María Ruiz' }
    for (const km of [10, 40, 70, 100, 130, 160]) {
      const antes = texto(event({ plantilla: 'attack_reeled', km, protagonists: [ana] }))
      const despues = texto(event({ plantilla: 'attack_reeled', km, protagonists: [renombrada] }))
      expect(antes).toContain('Ana Ruiz')
      expect(despues).toBe(antes.replace('Ana Ruiz', 'Ana María Ruiz'))
    }
  })

  it('elige con FNV-1a de la semilla módulo las redacciones vivas, el hash de variantIndex', () => {
    const opts = ['a', 'b', 'c']
    for (const seed of ['attack_go:1600:r1', 'crash:1230:', 'stage_win:2160:r-ana']) {
      expect(pickPhrasing(seed, opts, REV)).toBe(opts[fnv1a(seed) % 3])
    }
  })

  it('añadir una redacción con un since nuevo no re-sortea el pasado; la nueva solo la elige su revisión', () => {
    const hoy = ['a', 'b', 'c']
    const mañana = [...hoy, { since: TEMPLATE_REV + 1, text: 'd' }]
    const elegidas = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const seed = `etapa-${i}`
      expect(pickPhrasing(seed, mañana, REV)).toBe(pickPhrasing(seed, hoy, REV))
      elegidas.add(pickPhrasing(seed, mañana, TEMPLATE_REV + 1))
    }
    expect(elegidas).toEqual(new Set(['a', 'b', 'c', 'd']))
  })
})

describe('crónica de la etapa', () => {
  it('cuenta la misma historia cada vez que se pinta el mismo evento', () => {
    const e = event({ plantilla: 'breakaway_formed', protagonists: named('Ana', 'Bea') })
    expect(chronicleLine('en', e, REV)).toBe(chronicleLine('en', e, REV))
  })

  it('nombra a los protagonistas y a su equipo en la victoria', () => {
    const linea = chronicleLine(
      'en',
      event({
        plantilla: 'stage_win',
        protagonists: [rider('Ana Ruiz', { bib: 41, team: 'Team Sol', country: 'ES' })],
        datos: { won: 'sprint' },
      }),
      REV,
    )
    expect(linea).toContain('Ana Ruiz')
    expect(linea).toContain('Team Sol')
  })

  it('la fuga sin nombres no deja la frase coja', () => {
    expect(chronicleLine('en', event({ plantilla: 'breakaway_formed' }), REV)).not.toMatch(
      /^\s|\s{2}/,
    )
  })

  it('un evento desconocido no revienta: da una línea vacía y nunca la clave cruda (D-44)', () => {
    // RE-SELLADO EN E2, PASO 6b (docs/retransmision.md §12.5), a propósito: hasta aquí el `default`
    // narraba «meteorito: Ana», y así salían en el acta `puncture`, `mechanical`, `truce_granted` y
    // `truce_denied`, que el motor emite. Ahora tienen frase, y lo desconocido no se pinta: la voz y el
    // acta saltan la línea vacía, y B7 (templateCoverage.test.ts) pone en rojo una plantilla del motor
    // que llegue aquí.
    expect(
      chronicleLine('en', event({ plantilla: 'meteorito', protagonists: named('Ana') }), REV),
    ).toBe('')
  })
})

// `timeTrialStory`, el relato de una crono a partir de los tiempos, se fue con la crónica en W4 (D-16
// revocada): solo lo pintaba `StageStory` en las cronos corridas antes de la v18.

// --- La crónica tiene que EXPLICAR la carrera (docs/motor.md §16) ---------------------------
// El dueño leyó dos crónicas y no se entendían: "de 81 corredores a 3 en tres kilómetros, con solo
// 2 descolgados narrados" y "hay 5 ciclistas, ¡podrías haber dicho cuáles!". Estos tests fijan lo
// que la frase tiene que decir para que eso no vuelva a pasar.

describe('la criba se cuenta de forma que se entienda', () => {
  const split = (datos: Record<string, number | string>, over: Partial<ChronicleEntry> = {}) =>
    chronicleLine(
      'en',
      event({
        plantilla: 'peloton_split',
        km: 137,
        protagonists: [rider('Iker Zabala', { team: 'Summit Squad' })],
        datos,
        ...over,
      }),
      REV,
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
      'en',
      event({
        plantilla: 'front_group',
        km: 199,
        protagonists: named('Ana Ruiz', 'Bea Soler', 'Cris Vega'),
        datos: { size: 3, gapS: 90, toGo: 11 },
      }),
      REV,
    )
    expect(linea).toContain('Ana Ruiz')
    expect(linea).toContain('Cris Vega')
    expect(linea).toContain('11 km to go')
    expect(linea).toContain('1:30')
  })

  it('un corredor solo en cabeza se narra como tal', () => {
    const linea = chronicleLine(
      'en',
      event({
        plantilla: 'front_group',
        protagonists: named('Fredrik Eriksen'),
        datos: { size: 1, gapS: 435, toGo: 10 },
      }),
      REV,
    )
    expect(linea).toContain('Fredrik Eriksen')
    expect(linea).toContain('alone')
    expect(linea).toContain('7:15')
  })

  it('el parte de boquete dice cuántos van delante', () => {
    // …y con el vocabulario de tres nombres de la v27: «the 5 out front», no «the 5 leaders».
    expect(
      chronicleLine(
        'en',
        event({ plantilla: 'time_gap', datos: { gapS: 90, trend: 0, leadSize: 5 } }),
        REV,
      ),
    ).toContain('5 out front')
    expect(
      chronicleLine(
        'en',
        event({ plantilla: 'time_gap', datos: { gapS: 435, trend: 1, leadSize: 1 } }),
        REV,
      ),
    ).toContain('lone leader')
  })

  it('un boquete guardado antes de v6 (sin `leadSize`) se sigue narrando como la fuga', () => {
    expect(
      chronicleLine('en', event({ plantilla: 'time_gap', datos: { gapS: 90, trend: 0 } }), REV),
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
      'en',
      event({
        plantilla: 'peloton_split',
        km: 190 + phase,
        protagonists: [rider('Iker Zabala', { team: 'Summit Squad' })],
        datos: { ...datos, phase },
      }),
      REV,
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
      'en',
      event({
        plantilla: 'peloton_split',
        protagonists: [rider('Iker Zabala', { team: 'Summit Squad' })],
        datos: { dropped: 41, remaining: 40, before: 81, chasing: 0 },
      }),
      REV,
    )
    expect(linea).toContain('Summit Squad')
  })
})

// --- El reagrupamiento (v8) -----------------------------------------------------------------
// "About 51 left in front" y luego más de cien en el mismo tiempo. El reagrupamiento pasaba de
// verdad y no se contaba en ninguna parte.

describe('el reagrupamiento se cuenta', () => {
  const regroup = (datos: Record<string, number | string>) =>
    chronicleLine(
      'en',
      event({ plantilla: 'peloton_regroup', km: 166, protagonists: [], datos }),
      REV,
    )

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
      'en',
      event({
        plantilla: 'peloton_split',
        protagonists: [],
        datos: { dropped: 30, remaining: 0, before: 30, chasing: 0 },
      }),
      REV,
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
    chronicleLine('en', event({ plantilla, protagonists: named(...who), datos }), REV)

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
    chronicleLine(
      'en',
      event({ plantilla: 'peloton_pull', km: 90, protagonists: who, datos, ...over }),
      REV,
    )
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
    expect(chronicleLine('en', e, REV)).toBe(chronicleLine('en', e, REV))
  })
})

describe('quién hizo el trabajo para cerrar', () => {
  const work = (who: ChronicleRider[]): string =>
    chronicleLine(
      'en',
      event({
        plantilla: 'chase_work',
        km: 150,
        protagonists: who,
        datos: { closedS: 155, km: 32, work: 6.4 },
      }),
      REV,
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

  /*
   * ESTO SE SELLABA AL REVÉS (v28). El test decía «si cerraron varios equipos, se nombra a los
   * corredores» y comprobaba que salieran Ana y Bea: nombraba a un corredor por escuadra y la frase
   * se leía como si la caza la hubieran hecho dos señores, dos líneas después de haber contado que
   * tiraba un equipo. El dueño lo señaló varias veces. Una persecución la hacen EQUIPOS.
   */
  it('si cerraron varios equipos, se nombra a los EQUIPOS, no a un corredor de cada uno', () => {
    const l = work(twoTeams)
    expect(l).toContain('Summit Squad')
    expect(l).toContain('Team Sol')
    expect(l).not.toContain('Ana')
    expect(l).not.toContain('Bea')
  })

  const chased = (teamsCount: number): string =>
    chronicleLine(
      'en',
      event({
        plantilla: 'chase_work',
        km: 150,
        protagonists: twoTeams,
        datos: { closedS: 155, km: 32, work: 6.4, teams: teamsCount },
      }),
      REV,
    )

  it('los equipos que no caben en la frase se cuentan, no se esconden', () => {
    // El motor nombra tres como mucho, pero dice cuántos cazaron de verdad (`datos.teams`).
    const l = chased(4)
    expect(l).toContain('Summit Squad')
    expect(l).toContain('2 more teams')
  })

  it('cuando cazan cinco o más, la que tira es la carrera entera y así se cuenta', () => {
    // Medido en el banco: el 69 % de las cazas las hacen más equipos de los que caben en la frase,
    // hasta doce. «And 9 more teams» no es una crónica: eso es el pelotón entero tirando.
    // RE-SELLADO EN E2, PASO 12 (docs/retransmision.md §12.7, D-46), a propósito y una sola vez: con la
    // semilla neutra (plantilla, km en décimas e ids, no los nombres) esta línea elige la otra
    // redacción, «No single team owned this chase — 11 of them took turns…». Las dos dicen la cuenta.
    const l = chased(11)
    expect(l).toMatch(/11 (teams|of them)/)
    expect(l).toContain('Summit Squad') // los que más se vieron delante siguen con nombre
    expect(l).not.toContain('more teams')
  })

  it('con un agente libre entre medias se vuelve a los nombres: no hay equipo que nombrar', () => {
    const l = work([rider('Ana', { team: 'Summit Squad' }), rider('Bea')])
    expect(l).toContain('Ana')
    expect(l).toContain('Bea')
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
      'en',
      event({
        plantilla: 'break_share',
        km: 80,
        protagonists: named(...who),
        datos: { size: 5, passengers, toGo: 90 },
      }),
      REV,
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
      'en',
      event({ plantilla: 'stage_win', protagonists: [pucnik], datos: { won: 'sprint' } }),
      REV,
    )
    expect(l).toContain('42 Andrej Pucnik (Al Assad Cycling)')
  })

  it('la bandera NO va en el texto: va como trozo aparte, para pintarla con `<Flag/>`', () => {
    const partes = chronicleParts(
      'en',
      event({ plantilla: 'stage_win', protagonists: [pucnik], datos: { won: 'sprint' } }),
      REV,
    )
    expect(partes).toContainEqual({ flag: 'SI' })
    // Y el texto plano no arrastra marcas invisibles ni el código de país suelto.
    const plano = partes.map((p) => ('text' in p ? p.text : '')).join('')
    expect(plano).toBe(
      chronicleLine(
        'en',
        event({ plantilla: 'stage_win', protagonists: [pucnik], datos: { won: 'sprint' } }),
        REV,
      ),
    )
    expect(plano).not.toContain('SI')
  })

  // La compatibilidad hacia atrás es OBLIGATORIA: los eventos están congelados en base y se
  // resuelven contra el roster de hoy. Lo que falte, falta; la página no puede romperse por ello.
  it('sin dorsal, sin equipo y sin país la frase sigue en pie', () => {
    const l = chronicleLine(
      'en',
      event({
        plantilla: 'stage_win',
        protagonists: named('Ghost Rider'),
        datos: { won: 'solo', margin: 30 },
      }),
      REV,
    )
    expect(l).toContain('Ghost Rider')
    expect(l).not.toMatch(/null|undefined|\(\)/)
    expect(
      chronicleParts(
        'en',
        event({ plantilla: 'stage_win', protagonists: named('Ghost Rider') }),
        REV,
      ),
    ).not.toContainEqual(expect.objectContaining({ flag: expect.anything() }))
  })

  it('con dorsal pero sin país, sale el dorsal y no la bandera', () => {
    const l = chronicleLine(
      'en',
      event({ plantilla: 'stage_win', protagonists: [rider('Sin Bandera', { bib: 7 })] }),
      REV,
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
      'en',
      event({ plantilla: 'front_group', protagonists: ocho, datos: { size: 8, toGo: 20 } }),
      REV,
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
        'en',
        event({ plantilla: 'front_group', protagonists: tres, datos: { size: 3, toGo: 20 } }),
        REV,
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
      'en',
      event({ plantilla: 'riders_sit_up', protagonists: muchos, datos: { count: 20, toGo: 12 } }),
      REV,
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
    chronicleLine(
      'en',
      event({ plantilla: 'peloton_pull', km: 90, protagonists: who, datos, mentions }),
      REV,
    )

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
        'en',
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
        REV,
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
      'en',
      event({
        plantilla: 'peloton_pull',
        km: 90,
        protagonists: greg,
        datos: { size: 120, effort: 'firme', toGo: 60, chasing: 1 },
      }),
      REV,
    )
    expect(l).toContain('Summit Squad')
    expect(l).not.toContain('working for')
  })

  it('la persecución de los sprinters dice que tira SU equipo', () => {
    const l = chronicleLine(
      'en',
      event({
        plantilla: 'sprinters_chase',
        km: 120,
        protagonists: [
          rider('Marwan Al Maktoum', { bib: 21, team: 'Al Saqr Cycling', country: 'AE' }),
        ],
      }),
      REV,
    )
    expect(l).toContain('Al Saqr Cycling')
    expect(l).toContain('Marwan Al Maktoum')
  })
})

describe('A3 · los descuelgues se agrupan con número', () => {
  const grupo = (count: number, toGo: number) =>
    chronicleLine(
      'en',
      event({
        plantilla: 'riders_sit_up',
        km: 200,
        protagonists: Array.from({ length: count }, (_, i) =>
          rider(`Rider ${i}`, { country: 'ES' }),
        ),
        datos: { count, toGo, from: 195 },
      }),
      REV,
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
        'en',
        event({ plantilla: 'rider_sits_up', protagonists: named('Ana'), datos: { toGo: 18 } }),
        REV,
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
        'en',
        event({
          plantilla: 'peloton_split',
          km: 186 + variante,
          protagonists: [rider('Jean Thomas', { team: 'Éclair Équipe' })],
          datos: { dropped: 1315, remaining: 89, before: 115, chasing: 0 },
        }),
        REV,
      )
      expect(l).not.toContain('1315')
      expect(l).toContain('115')
      expect(l).toContain('89')
    }
  })

  it('un `dropped` coherente se respeta tal cual', () => {
    const l = chronicleLine(
      'en',
      event({
        plantilla: 'peloton_split',
        km: 137,
        protagonists: [rider('Iker Zabala', { team: 'Summit Squad' })],
        datos: { dropped: 26, remaining: 89, before: 115, chasing: 0 },
      }),
      REV,
    )
    expect(l).toMatch(/26|115/)
  })
})

describe('B4 · «el pelotón concede» no puede contradecir a la captura', () => {
  it('si la fuga acaba cazada, la concesión se cuenta como provisional', () => {
    const l = chronicleLine(
      'en',
      event({ plantilla: 'peloton_concedes', km: 10, datos: { cazada: 1 } }),
      REV,
    )
    expect(l.toLowerCase()).toMatch(/for now|for the moment/)
    expect(l).not.toContain('fight for the win')
  })

  it('si la fuga llega, la concesión se cuenta como lo que fue', () => {
    const l = chronicleLine('en', event({ plantilla: 'peloton_concedes', km: 60 }), REV)
    expect(l.toLowerCase()).not.toMatch(/for now|for the moment/)
  })
})

describe('B5 · el liderato de la montaña solo se canta cuando existe', () => {
  const kom = (leads: number) =>
    chronicleLine(
      'en',
      event({
        plantilla: 'climb_kom',
        km: 111,
        protagonists: [
          rider('Ahmed Al Rashidi', { bib: 121, team: 'Al Saqr Cycling', country: 'AE' }),
        ],
        datos: { category: 'cat3', points: 1, leads },
      }),
      REV,
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
      'en',
      event({
        plantilla: 'rider_bonks',
        protagonists: [rider('Ana Soler', { bib: 42, team: 'Equipo Sol', country: 'ES' })],
        datos: { toGo: 55 },
      }),
      REV,
    )
    expect(l).toContain('Ana Soler')
    expect(l).toContain('42')
    expect(l).toContain('Equipo Sol')
    expect(l).toContain('55')
  })

  it('varias pájaras a la vez se cuentan con número', () => {
    const l = chronicleLine(
      'en',
      event({
        plantilla: 'riders_bonk',
        protagonists: Array.from({ length: 9 }, (_, i) => rider(`Rider ${i}`)),
        datos: { count: 9, toGo: 40 },
      }),
      REV,
    )
    expect(l).toContain('9 riders')
    expect(l).toContain('40 km to go')
  })

  it('el abandono lleva la identidad completa: es el final de su carrera', () => {
    const l = chronicleLine(
      'en',
      event({
        plantilla: 'rider_abandons',
        protagonists: [rider('Leo Marín', { bib: 7, team: 'Cumbre', country: 'ES' })],
        datos: { causa: 'colapso', toGo: 62 },
      }),
      REV,
    )
    expect(l).toContain('Leo Marín')
    expect(l).toContain('Cumbre')
    expect(l).toContain('62')
  })

  it('varios abandonos en el mismo tramo se cuentan juntos', () => {
    const l = chronicleLine(
      'en',
      event({
        plantilla: 'riders_abandon',
        protagonists: Array.from({ length: 5 }, (_, i) => rider(`Rider ${i}`)),
        datos: { count: 5 },
      }),
      REV,
    )
    expect(l).toContain('5 riders abandon')
    expect(l).toContain('2 more')
  })

  it('el fuera de control dice el límite y a cuántos se lleva', () => {
    const uno = chronicleLine(
      'en',
      event({
        plantilla: 'time_cut',
        protagonists: named('Ana'),
        datos: { count: 1, limitPct: 8, gapS: 1500 },
      }),
      REV,
    )
    expect(uno).toContain('Ana')
    expect(uno).toContain('8%')
    const varios = chronicleLine(
      'en',
      event({
        plantilla: 'time_cut',
        protagonists: named('Ana', 'Leo'),
        datos: { count: 4, limitPct: 18, gapS: 2000 },
      }),
      REV,
    )
    expect(varios).toContain('4 riders')
    expect(varios).toContain('18%')
  })

  it('la readmisión con penalización se cuenta como lo que es', () => {
    const l = chronicleLine(
      'en',
      event({ plantilla: 'time_cut_readmitted', datos: { count: 23, limitPct: 12 } }),
      REV,
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
    expect(chronicleParts('en', e, REV)).toContainEqual({ jersey: 'gc' })
    // Y el texto pelado es EXACTAMENTE el mismo que sin maillot: los tests y cualquier contexto sin
    // DOM (informes, noticias) siguen leyendo la misma frase, sin marcas invisibles dentro.
    const sinMaillot = event({
      plantilla: 'stage_win',
      protagonists: [{ ...lider, jersey: null }],
      datos: { won: 'sprint' },
    })
    expect(chronicleLine('en', e, REV)).toBe(chronicleLine('en', sinMaillot, REV))
    // Sin marcas invisibles dentro: el texto pelado es texto y nada más. Se comprueba con
    // `String.fromCharCode` y no con una expresión regular, que con caracteres de control
    // literales es justo lo que prohíbe `no-control-regex`.
    for (const marca of [1, 2])
      expect(chronicleLine('en', e, REV)).not.toContain(String.fromCharCode(marca))
  })

  // Re-sellado en el 17a (E3, docs/visual.md §14.1 y §16.3; D-00c): hasta entonces el maillot abría la
  // mención, delante de la bandera y del dorsal; el dueño fijó que la bandera, el nombre y el maillot
  // van siempre juntos y en ese orden, así que el maillot cierra la identidad, tras el nombre.
  it('el maillot cierra la identidad: el dorsal, la bandera, el nombre y el maillot (D-00c)', () => {
    const partes = chronicleParts(
      'en',
      event({ plantilla: 'stage_win', protagonists: [lider], datos: { won: 'sprint' } }),
      REV,
    )
    const iJersey = partes.findIndex((p) => 'jersey' in p)
    const iFlag = partes.findIndex((p) => 'flag' in p)
    const iName = partes.findIndex(
      (p) => 'riderId' in p || ('text' in p && p.text.includes('Ole Andersen')),
    )
    expect(iFlag).toBeGreaterThanOrEqual(0)
    expect(iFlag).toBeLessThan(iName)
    expect(iName).toBeLessThan(iJersey)
    const texto = partes.map((p) => ('text' in p ? p.text : '')).join('')
    expect(texto).toContain('163 Ole Andersen (Aurora)')
  })

  it('sale en TODAS las menciones: en las listas y en las frases que ya nombran al equipo', () => {
    const lista = chronicleParts(
      'en',
      event({
        plantilla: 'front_group',
        protagonists: [raso, lider, rider('Bea', { jersey: 'kom' })],
        datos: { size: 3, toGo: 20 },
      }),
      REV,
    )
    expect(lista.filter((p) => 'jersey' in p)).toEqual([{ jersey: 'gc' }, { jersey: 'kom' }])
    // `riderShort` —la versión sin equipo, para las frases que ya lo dicen aparte— también lo
    // lleva: es el mismo hombre, solo se calla el equipo.
    const tren = chronicleParts(
      'en',
      event({
        plantilla: 'sprinters_chase',
        protagonists: [{ ...lider, jersey: 'points' }],
        datos: {},
      }),
      REV,
    )
    expect(tren.some((p) => 'jersey' in p)).toBe(true)
  })

  it('cada maillot llega con su tipo, sin mezclarse', () => {
    for (const kind of ['gc', 'points', 'kom'] as const) {
      const partes = chronicleParts(
        'en',
        event({ plantilla: 'stage_win', protagonists: [{ ...raso, jersey: kind }] }),
        REV,
      )
      expect(partes).toContainEqual({ jersey: kind })
    }
  })

  // Compatibilidad hacia atrás: la etapa 1, una carrera de un día y cualquier crónica que la API
  // sirva sin maillots tienen que salir EXACTAMENTE como salían antes.
  it('sin maillots la crónica es la de siempre, trozo a trozo', () => {
    const e = event({ plantilla: 'stage_win', protagonists: [raso], datos: { won: 'sprint' } })
    expect(chronicleParts('en', e, REV).some((p) => 'jersey' in p)).toBe(false)
    expect(chronicleParts('en', e, REV)).toContainEqual({ flag: 'ES' })
  })

  it('un corredor que ya no está en el roster —sin nada— tampoco lleva maillot', () => {
    const e = event({ plantilla: 'stage_win', protagonists: named('Ghost Rider') })
    expect(chronicleParts('en', e, REV).some((p) => 'jersey' in p)).toBe(false)
    expect(chronicleLine('en', e, REV)).toContain('Ghost Rider')
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
      'en',
      event({
        plantilla: 'tt_start_order',
        km: 0,
        protagonists: [moreau],
        datos: { mode: 'general', intervalS: 120, riders: 130, windowS: 15480 },
      }),
      REV,
    )
    expect(line).toContain('130 riders')
    expect(line).toContain('2 minutes apart')
    expect(line).toContain('Hugo Moreau')
    // Y por qué el amarillo sale el último, que es lo que hace legible el resto de la crónica.
    expect(line.toLowerCase()).toContain('last')
  })

  it('…y por dorsales dice que el 1 cierra la crono', () => {
    const line = chronicleLine(
      'en',
      event({
        plantilla: 'tt_start_order',
        km: 0,
        protagonists: [moreau],
        datos: { mode: 'dorsales', intervalS: 60, riders: 40 },
      }),
      REV,
    )
    expect(line).toContain('one-minute intervals')
    expect(line).toMatch(/number 1|ending in 1/)
  })

  it('el último en tomar la rampa se cuenta en horas, no en minutos corridos', () => {
    const line = chronicleLine(
      'en',
      event({
        plantilla: 'tt_last_off',
        km: 0,
        protagonists: [amarillo],
        datos: { afterS: 15480, riders: 130 },
      }),
      REV,
    )
    // 15.480 s son 4:18:00. «258:00» es lo que salía antes, y no se lee.
    expect(line).toContain('4:18:00')
    expect(line).not.toContain('258:00')
  })

  it('el parcial dice el punto de control, el tiempo y a quién se lo quita', () => {
    const line = chronicleLine(
      'en',
      event({
        plantilla: 'tt_split',
        km: 11,
        protagonists: [pucnik, moreau],
        datos: { checkKm: 11, splitS: 1060, gainS: 14 },
      }),
      REV,
    )
    expect(line).toContain('11 km')
    expect(line).toContain('17:40')
    expect(line).toContain('Andrej Pucnik')
    expect(line).toContain('Hugo Moreau')
  })

  it('el primero en pasar por un control no se compara con nadie', () => {
    const line = chronicleLine(
      'en',
      event({
        plantilla: 'tt_split',
        km: 11,
        protagonists: [moreau],
        datos: { checkKm: 11, splitS: 1100, gainS: 0 },
      }),
      REV,
    )
    expect(line).toContain('First through')
    expect(line).not.toContain('undefined')
  })

  it('la silla del mejor tiempo: quién la estrena y quién se la queda', () => {
    const primero = chronicleLine(
      'en',
      event({ plantilla: 'tt_first_time', km: 33, protagonists: [moreau], datos: { timeS: 3221 } }),
      REV,
    )
    expect(primero).toContain('53:41')
    const mejor = chronicleLine(
      'en',
      event({
        plantilla: 'tt_best_time',
        km: 33,
        protagonists: [pucnik, moreau],
        datos: { timeS: 3179, gainS: 42 },
      }),
      REV,
    )
    expect(mejor).toContain('52:59')
    expect(mejor).toContain('42s')
    expect(mejor).toContain('Hugo Moreau')
  })

  it('el alcance dice dónde, con cuánta ventaja de salida, y que NO da rebufo', () => {
    const line = chronicleLine(
      'en',
      event({
        plantilla: 'tt_catch',
        km: 24,
        protagonists: [pucnik, moreau],
        datos: { headStartS: 120 },
      }),
      REV,
    )
    expect(line).toContain('km 24')
    expect(line).toContain('2:00')
    // La regla real, dicha en la frase: alcanzar no es ir a rueda.
    expect(line).toMatch(/shelter|pulls aside|swing wide|out of the way/)
  })

  it('el recuento de alcances se dice tal cual, sin maquillar', () => {
    expect(
      chronicleLine('en', event({ plantilla: 'tt_catches', km: 33, datos: { count: 117 } }), REV),
    ).toContain('117 riders')
    expect(
      chronicleLine('en', event({ plantilla: 'tt_catches', km: 33, datos: { count: 1 } }), REV),
    ).toContain('One rider')
  })

  it('el que salió el último cierra la historia con su diferencia y su puesto', () => {
    const line = chronicleLine(
      'en',
      event({
        plantilla: 'tt_last_home',
        km: 33,
        protagonists: [amarillo],
        datos: { gapS: 95, timeS: 2383, puesto: 12 },
      }),
      REV,
    )
    expect(line).toContain('+1:35')
    expect(line).toContain('12th')
  })

  it('el ganador se canta con su tiempo y su margen…', () => {
    const line = chronicleLine(
      'en',
      event({
        plantilla: 'stage_win_itt',
        km: 33,
        protagonists: [pucnik],
        datos: { timeS: 2288, marginS: 35 },
      }),
      REV,
    )
    expect(line).toContain('38:08')
    expect(line).toContain('35s')
  })

  it('…y una crono CONGELADA antes de la v18, sin datos, se sigue leyendo', () => {
    // Las etapas ya corridas tienen sus eventos congelados y solo traen el protagonista.
    expect(
      chronicleLine('en', event({ plantilla: 'stage_win_itt', protagonists: [pucnik] }), REV),
    ).toBe('11 Andrej Pucnik (Cumbre Escuadra) sets the fastest time.')
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
  const criba = (datos: Record<string, number | string>, who: ChronicleRider[] = [], km = 160) =>
    chronicleLine(
      'en',
      event({ plantilla: 'peloton_selection', km, protagonists: who, datos }),
      REV,
    )

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

  /*
   * RE-SELLADO EN E2, PASO 12 (docs/retransmision.md §12.7, D-46), a propósito y una sola vez: con la
   * semilla neutra, el km 160 de estos dos casos elige la tercera redacción («This is the selection of
   * the day…»), que no dice quién aprieta. Lo que fijan no es una redacción, es la regla: en todas las
   * que dicen quién fuerza la criba, con el pelotón entero es el EQUIPO y con un grupo pequeño, el
   * corredor. Se miran cinco km, para que salgan las tres.
   */
  const KMS = [140, 150, 160, 170, 180, 190, 200]

  it('con el pelotón entero delante, quien fuerza la criba es un EQUIPO', () => {
    const lineas = KMS.map((km) =>
      criba(
        { before: 116, remaining: 80, dropped: 36, toGo: 50, chasing: 0 },
        [rider('Iker Zabala', { team: 'Summit Squad' })],
        km,
      ),
    )
    const conQuien = lineas.filter((l) => l.includes('the selection') && l.includes('force'))
    expect(conQuien.length).toBeGreaterThan(0)
    for (const l of conQuien) expect(l).toContain('Summit Squad force the selection')
  })

  it('con un grupo ya pequeño no tira un equipo, tira un corredor', () => {
    const lineas = KMS.map((km) =>
      criba(
        { before: 8, remaining: 3, dropped: 5, toGo: 60, chasing: 0 },
        [rider('Iker Zabala', { team: 'Summit Squad' })],
        km,
      ),
    )
    const conQuien = lineas.filter((l) => l.includes('force'))
    expect(conQuien.length).toBeGreaterThan(0)
    for (const l of conQuien) {
      expect(l).toContain('Iker Zabala')
      expect(l).not.toContain('Summit Squad force')
    }
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
    chronicleLine('en', event({ plantilla: 'time_gap_run', km, protagonists: [], datos }), REV)

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
    chronicleLine(
      'en',
      event({ plantilla: 'breakaway_caught', km: 164, protagonists: who, datos }),
      REV,
    )

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
      'en',
      event({ plantilla: 'breakaway_formed', km: 33, protagonists: named('Nicolas Ferrari') }),
      REV,
    )
    expect(linea).not.toMatch(/Ferrari go\b/)
    expect(linea).toMatch(/goes|slips away|lone one/)
  })

  it('con dos o más, la frase de siempre', () => {
    const linea = chronicleLine(
      'en',
      event({ plantilla: 'breakaway_formed', km: 33, protagonists: named('A', 'B') }),
      REV,
    )
    expect(linea).toContain('A and B')
  })

  it('uno no colabora consigo mismo', () => {
    const linea = chronicleLine(
      'en',
      event({
        plantilla: 'break_cooperation',
        km: 33,
        protagonists: named('Nicolas Ferrari'),
        datos: { cooperating: 1 },
      }),
      REV,
    )
    expect(linea).not.toContain('collaborate')
    expect(linea).toContain('on his own')
  })

  it('quién cerró la caza dice lo que el dato mide: la CÚSPIDE del boquete', () => {
    const linea = chronicleLine(
      'en',
      event({
        plantilla: 'chase_work',
        km: 164,
        protagonists: [
          rider('Patrick Henry', { team: 'Phénix Cycling' }),
          rider('Philippe Roux', { team: 'Aigle Cyclisme' }),
        ],
        datos: { closedS: 140, km: 5, work: 27.4 },
      }),
      REV,
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
    expect(chronicleLine('en', e, REV)).toContain('222 Nicolás Gómez (Individual)')
  })

  it('con equipo, manda el equipo', () => {
    const e = event({
      plantilla: 'attack_go',
      protagonists: [rider('Carlo Lombardo', { bib: 11, country: 'IT', team: 'Welle Team' })],
    })
    const line = chronicleLine('en', e, REV)
    expect(line).toContain('11 Carlo Lombardo (Welle Team)')
    expect(line).not.toContain('Individual')
  })

  it('SIN dorsal no se inventa nada: no sabemos su equipo, no que no tenga', () => {
    // Es el corredor de una crónica congelada que ya no está en el roster de hoy: llega sin dorsal,
    // sin equipo y sin bandera. Llamarlo «Individual» sería afirmar algo que no consta.
    const e = event({ plantilla: 'attack_go', protagonists: [rider('Un Fantasma')] })
    const line = chronicleLine('en', e, REV)
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
    expect(chronicleLine('en', e, REV)).not.toContain('Individual hit the front')
  })
})

/**
 * V25 · LAS FRASES QUE SE CONTRADECÍAN (docs/balance.md «v25»). Todas salen del diario de Race Jaén
 * que el dueño leyó, y todas se cuentan sobre el mundo entero en `scripts/medir-defectos.mjs`.
 */
describe('v25 · el relato no se contradice', () => {
  it('con un solo atacante los que no aguantan la rueda van CON ÉL', () => {
    const l = chronicleLine(
      'en',
      event({
        plantilla: 'attack_go',
        km: 28,
        protagonists: named('Álvaro'),
        datos: { saltan: 1, tierra: 3, cuerda: 0, toGo: 182, solo: 1 },
      }),
      REV,
    )
    expect(l).toContain('3 more try to go with him')
    expect(l).not.toContain('with them')
  })

  it('cuando el grupo de cabeza CRECE la frase no dice «ya solo quedan N»', () => {
    const l = chronicleLine(
      'en',
      event({
        plantilla: 'front_group',
        km: 156,
        protagonists: named('Taylor', 'Jereb', 'Moretti'),
        datos: { size: 3, gapS: 60, toGo: 54, entran: 2, salen: 1 },
      }),
      REV,
    )
    expect(l).not.toContain('Only 3 riders left in front')
    expect(l).toMatch(/come across/)
    expect(l).toContain('Taylor')
  })

  it('…y cuando se deshace, sí', () => {
    const l = chronicleLine(
      'en',
      event({
        plantilla: 'front_group',
        km: 120,
        protagonists: named('Taylor'),
        datos: { size: 1, gapS: 60, toGo: 30, salen: 2 },
      }),
      REV,
    )
    expect(l).toContain('alone at the front')
  })

  it('la captura dice de cuántos había salido la fuga cuando ya no son los mismos', () => {
    const l = chronicleLine(
      'en',
      event({
        plantilla: 'breakaway_caught',
        km: 190,
        protagonists: named('Taylor', 'Rus'),
        datos: { size: 2, deLos: 6, awayKm: 189, toGo: 20, juntos: 1 },
      }),
      REV,
    )
    expect(l).toContain('started with 6')
  })

  it('una fuga que se apaga sola no se cuenta como una fuga cazada', () => {
    const l = chronicleLine(
      'en',
      event({
        plantilla: 'breakaway_caught',
        km: 150,
        protagonists: named('Taylor'),
        datos: { size: 1, awayKm: 120, motivo: 'deshecha' },
      }),
      REV,
    )
    expect(l).not.toMatch(/caught|catches/)
    expect(l).toMatch(/falls apart|comes undone/)
  })

  it('la cúspide del boquete se sitúa en la carretera y no repite la cuenta de la captura', () => {
    const l = chronicleLine(
      'en',
      event({
        plantilla: 'chase_work',
        km: 190,
        protagonists: named('Muller'),
        datos: { closedS: 184, km: 172, peakKm: 26, work: 18.5, pegado: 1 },
      }),
      REV,
    )
    expect(l).toContain('back at km 26')
    expect(l).not.toContain('172 km later')
  })

  it('el equipo que ya estaba tirando cuenta lo que ha cambiado, no otra presentación', () => {
    const l = chronicleLine(
      'en',
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
      REV,
    )
    expect(l).toMatch(/ease off|pace comes down/)
  })

  it('el manotazo que dura un kilómetro se cuenta entero en una línea', () => {
    const l = chronicleLine(
      'en',
      event({
        plantilla: 'attack_short',
        km: 196,
        protagonists: named('Turk'),
        datos: { saltan: 1, solo: 1, km: 1, kind: 'contraataque' },
      }),
      REV,
    )
    expect(l).toContain('Turk')
    expect(l).toMatch(/within the kilometre|snaps back/)
  })

  it('el movimiento que se apaga se cuenta como lo que fue: nadie le cazó', () => {
    const l = chronicleLine(
      'en',
      event({
        plantilla: 'move_faded',
        km: 140,
        protagonists: named('Brown'),
        datos: { kind: 'puente', km: 26, toGo: 70 },
      }),
      REV,
    )
    expect(l).toContain('Brown')
    expect(l).toMatch(/dies out|fade/)
  })

  it('un puente que engancha dice en cuántos queda la cabeza de carrera', () => {
    const l = chronicleLine(
      'en',
      event({
        plantilla: 'bridge_made',
        km: 167,
        protagonists: named('Rus'),
        datos: { size: 4, entran: 1, toGo: 43 },
      }),
      REV,
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
          'en',
          event({
            plantilla: caso.plantilla,
            km,
            protagonists: named(...(caso.who ?? ['Ana', 'Bea'])),
            datos: caso.datos,
          }),
          REV,
        )
        for (const noun of nounsIn(linea)) {
          if (!permitidos.includes(noun)) malas.push(`${caso.plantilla}: «${noun}» en «${linea}»`)
        }
      }
    }
    expect(malas).toEqual([])
  })

  /**
   * LOS PAPELES DE LA VOZ (E2, paso 6b; §12.6, B7): las diez plantillas que dicen el grupo del título
   * (`MAIN_GROUP_TEMPLATES`, apps/api/src/voiceRoles.ts) con los cuatro papeles de `mainRole` y los
   * tres maillots de `mainJersey`, y `crash` con los de `groupRole` y `groupJersey`: cada frase dentro
   * de su fila de `GROUP_NOUNS`, y la unión dentro de los siete nombres.
   */
  const MAIN_GROUP_TEMPLATES = [
    'attack_go',
    'attack_short',
    'attack_reeled',
    'sprinters_chase',
    'sprinters_give_up',
    'peloton_concedes',
    'peloton_pull',
    'breakaway_caught',
    'time_gap',
    'time_gap_run',
  ]
  const ROLES = ['lead', 'chase', 'bunch', 'gruppetto', undefined] as const
  const JERSEYS = ['gc', 'points', 'kom', undefined] as const

  it('las diez del título con los cuatro papeles y los tres maillots, y la caída con todos, en su fila', () => {
    const malas: string[] = []
    const dichos = new Set<string>()
    const casos = [
      ...ejemplares
        .filter((c) => MAIN_GROUP_TEMPLATES.includes(c.plantilla))
        .flatMap((c) =>
          ROLES.flatMap((role) =>
            JERSEYS.map((jersey) => ({
              plantilla: c.plantilla,
              who: c.who,
              datos: {
                ...c.datos,
                // el parte de ventaja nombra al título solo sobre el pelotón
                ...(c.plantilla.startsWith('time_gap') ? { chaseKind: 'peloton' } : {}),
                ...(role === undefined ? {} : { mainRole: role }),
                ...(jersey === undefined ? {} : { mainJersey: jersey }),
              },
            })),
          ),
        ),
      ...ROLES.flatMap((role) =>
        JERSEYS.map((jersey) => ({
          plantilla: 'crash',
          who: undefined,
          datos: {
            ...(role === undefined ? {} : { groupRole: role }),
            ...(jersey === undefined ? {} : { groupJersey: jersey }),
          },
        })),
      ),
    ]
    expect(new Set(casos.map((c) => c.plantilla)).size).toBe(MAIN_GROUP_TEMPLATES.length + 1)
    for (const caso of casos) {
      const permitidos = GROUP_NOUNS[caso.plantilla] ?? []
      for (const km of [10, 40, 70, 100, 130, 160]) {
        const linea = chronicleLine(
          'en',
          event({
            plantilla: caso.plantilla,
            km,
            protagonists: named(...(caso.who ?? ['Ana', 'Bea'])),
            datos: caso.datos,
          }),
          REV,
        )
        expect(linea, `${caso.plantilla} ${JSON.stringify(caso.datos)}`).not.toBe('')
        for (const noun of nounsIn(linea)) {
          dichos.add(noun)
          if (!permitidos.includes(noun)) malas.push(`${caso.plantilla}: «${noun}» en «${linea}»`)
        }
      }
    }
    expect(malas).toEqual([])
    // la unión, los siete: el título nunca dice the gruppetto, la caída sí
    expect([...dichos].sort()).toEqual([
      'the bunch',
      'the chase group',
      'the gruppetto',
      'the lead group',
      'the mountains leader’s group',
      'the points leader’s group',
      'the race leader’s group',
    ])
  })

  it('la palabra es la de la barra: el maillot antes que el papel; sin anotación, the bunch', () => {
    expect(groupNounOf('chase', undefined)).toBe('the chase group')
    expect(groupNounOf('chase', 'kom')).toBe('the mountains leader’s group')
    expect(groupNounOf(undefined, undefined)).toBe('the bunch')
    expect(groupNounOf('peloton', 'yellow')).toBe('the bunch') // lo que no es un papel ni un maillot
    expect(mainNoun({ datos: { mainRole: 'gruppetto' } })).toBe('the bunch')
    expect(groupNounOf('gruppetto', undefined)).toBe('the gruppetto')
    const reeled = (datos: Record<string, string>) =>
      chronicleLine(
        'en',
        event({ plantilla: 'attack_reeled', km: 10, protagonists: named('Ana'), datos }),
        REV,
      )
    expect(reeled({})).toContain('he bunch')
    expect(reeled({ mainRole: 'chase' })).toMatch(
      /the chase group|The chase group|swept up|elastic/,
    )
  })

  /**
   * EL GRUPO DE LOS PROTAGONISTAS, POR SU MAILLOT (W1, la revisión de `Watch` del dueño, su punto 4; D-18): en
   * las siete plantillas cuyo grupo es el de sus protagonistas (`RIDER_GROUP_TEMPLATES`, apps/api/src/
   * voiceRoles.ts, la misma lista), la API anota el maillot que lo nombra en la barra (`groupJersey`), y
   * cada sitio que lo nombra dice la misma frase con la palabra del maillot donde decía su sitio, declarada
   * en su fila de `GROUP_NOUNS`.
   */
  const sameTeam = [rider('Ana', { team: 'Summit Squad' }), rider('Bea', { team: 'Summit Squad' })]
  const twoTeams = [rider('Ana', { team: 'Summit Squad' }), rider('Bea', { team: 'Team Sol' })]
  const DE_SUS_PROTAGONISTAS: {
    plantilla: string
    datos: Record<string, number | string>
    who?: ChronicleRider[]
  }[] = [
    { plantilla: 'bridge_made', datos: { size: 6, entran: 1 } },
    { plantilla: 'break_cooperation', datos: { cooperating: 1 } },
    { plantilla: 'break_cooperation', datos: { cooperating: 0 } },
    { plantilla: 'break_share', datos: { passengers: 2 } },
    {
      plantilla: 'peloton_selection',
      datos: { before: 119, remaining: 13, dropped: 80, toGo: 125, chasing: 0 },
    },
    {
      plantilla: 'peloton_selection',
      datos: { before: 119, remaining: 13, dropped: 80, toGo: 125, chasing: 1 },
    },
    { plantilla: 'peloton_split', datos: { before: 80, remaining: 40, dropped: 40, chasing: 0 } },
    {
      plantilla: 'peloton_split',
      datos: { before: 80, remaining: 40, dropped: 40, chasing: 1, phase: 1 },
    },
    { plantilla: 'echelon_split', datos: { before: 80, remaining: 40, dropped: 40 } },
    {
      plantilla: 'echelon_split',
      datos: { before: 80, remaining: 40, dropped: 40, grupo: 'caza' },
    },
    {
      plantilla: 'front_group',
      datos: { size: 7, gapS: 90, toGo: 40, entran: 2, salen: 1 },
      who: named('Ana', 'Bea', 'Cris', 'Dani', 'Eva', 'Fer', 'Gus'),
    },
  ]
  const KMS = [10, 40, 70, 100, 130, 160, 11, 41, 71, 101]
  const lineOf = (
    caso: { plantilla: string; who?: ChronicleRider[] },
    km: number,
    datos: Record<string, number | string>,
  ): string =>
    chronicleLine(
      'en',
      event({
        plantilla: caso.plantilla,
        km,
        protagonists: caso.who ?? named('Ana', 'Bea'),
        datos,
      }),
      REV,
    )
  const WORD = {
    gc: 'the race leader’s group',
    points: 'the points leader’s group',
    kom: 'the mountains leader’s group',
  } as const
  /** La frase de siempre con la palabra del maillot donde decía el sitio del grupo, en cualquier caja. */
  const withWord = (line: string, word: string): string =>
    line
      .replace(/the (lead|chase) group/g, word)
      .replace(/The (lead|chase) group/g, word.charAt(0).toUpperCase() + word.slice(1))

  it('las siete del grupo de sus protagonistas, con su maillot, dicen su palabra donde decían su sitio', () => {
    expect([...new Set(DE_SUS_PROTAGONISTAS.map((c) => c.plantilla))].sort()).toEqual([
      'break_cooperation',
      'break_share',
      'bridge_made',
      'echelon_split',
      'front_group',
      'peloton_selection',
      'peloton_split',
    ])
    const malas: string[] = []
    const sinCambio: string[] = []
    DE_SUS_PROTAGONISTAS.forEach((caso, n) => {
      const permitidos = GROUP_NOUNS[caso.plantilla] ?? []
      let cambia = false
      for (const jersey of ['gc', 'points', 'kom'] as const)
        for (const km of KMS) {
          const sin = lineOf(caso, km, caso.datos)
          const con = lineOf(caso, km, { ...caso.datos, groupJersey: jersey })
          expect(con, `${caso.plantilla} ${jersey} km ${km}`).toBe(withWord(sin, WORD[jersey]))
          if (con !== sin) cambia = true
          if (con !== sin && !permitidos.includes(WORD[jersey]))
            malas.push(`${caso.plantilla}: «${WORD[jersey]}» en «${con}»`)
        }
      // cada caso llega a un sitio que nombra a su grupo en alguna de sus redacciones
      if (!cambia) sinCambio.push(`${n} ${caso.plantilla} ${JSON.stringify(caso.datos)}`)
    })
    expect(malas).toEqual([])
    expect(sinCambio).toEqual([])
  })

  it('el parte de ventaja nombra a la cabeza con la palabra del título, si la barra lo pone en cabeza', () => {
    // una cabeza de más de tres llega sin nombres (el motor solo los manda hasta `frontNamesMaxRiders`)
    const partes = [
      { plantilla: 'time_gap', datos: { gapS: 90, trend: 1, leadSize: 40, chaseSize: 60 } },
      { plantilla: 'time_gap', datos: { gapS: 90, trend: -1, leadSize: 40, chaseSize: 60 } },
      { plantilla: 'time_gap', datos: { gapS: 90, trend: 0, leadSize: 40, chaseSize: 60 } },
      {
        plantilla: 'time_gap_run',
        datos: { gapS: 38, fromGapS: 179, fromKm: 90, trend: -1, leadSize: 40 },
      },
      {
        plantilla: 'time_gap_run',
        datos: { gapS: 380, fromGapS: 90, fromKm: 90, trend: 1, leadSize: 40 },
      },
      {
        plantilla: 'time_gap_run',
        datos: { gapS: 90, fromGapS: 92, fromKm: 90, trend: 0, leadSize: 40 },
      },
    ]
    for (const caso of partes)
      for (const km of KMS) {
        const parte = { ...caso, who: [] }
        const sin = lineOf(parte, km, caso.datos)
        expect(sin).toMatch(/the lead group/i)
        // el título en cabeza con el amarillo: su palabra
        const enCabeza = lineOf(parte, km, { ...caso.datos, mainRole: 'lead', mainJersey: 'gc' })
        expect(enCabeza).toBe(withWord(sin, WORD.gc))
        // el título detrás, aunque lleve el amarillo: la cabeza es otro grupo, y dice su sitio
        expect(lineOf(parte, km, { ...caso.datos, mainRole: 'chase', mainJersey: 'gc' })).toMatch(
          /the lead group/i,
        )
      }
  })

  it('el título pequeño en cabeza dice su palabra; detrás o sin anotación, the lead group', () => {
    const pull = (datos: Record<string, number | string>) =>
      KMS.map((km) =>
        chronicleLine(
          'en',
          event({ plantilla: 'peloton_pull', km, protagonists: [rider('Ana')], datos }),
          REV,
        ),
      )
    const small = { size: 6, effort: 'firme', toGo: 20, chasing: 0 }
    const enCabeza = pull({ ...small, mainRole: 'lead', mainJersey: 'gc' })
    expect(enCabeza.some((l) => l.includes('the race leader’s group'))).toBe(true)
    expect(enCabeza.every((l) => !/the lead group/i.test(l))).toBe(true)
    expect(pull(small).some((l) => /the lead group/i.test(l))).toBe(true)
    expect(pull({ ...small, mainRole: 'chase' }).some((l) => /the lead group/i.test(l))).toBe(true)
  })

  it('las que hablan de otro grupo no cambian con el maillot de un protagonista', () => {
    // la fuga que se persigue, la que se caza, el grupo del que se sale, la fuga del día al nacer, la meta y
    // el reagrupamiento, que el motor emite sin protagonistas
    const OTRAS = [
      {
        plantilla: 'peloton_regroup',
        datos: { joined: 14, remaining: 19, before: 5, chasing: 0 },
        who: [],
      },
      {
        plantilla: 'peloton_regroup',
        datos: { joined: 14, remaining: 19, before: 5, chasing: 1 },
        who: [],
      },
      { plantilla: 'sprinters_chase', datos: { porQue: 'general' } },
      { plantilla: 'sprinters_chase', datos: {}, who: sameTeam },
      {
        plantilla: 'peloton_pull',
        datos: { size: 120, effort: 'firme', toGo: 60, chasing: 1, porQue: 'general' },
        who: sameTeam,
      },
      {
        plantilla: 'peloton_pull',
        datos: { size: 120, effort: 'firme', toGo: 45, chasing: 1 },
        who: twoTeams,
      },
      { plantilla: 'peloton_concedes', datos: { cazada: 1 } },
      { plantilla: 'peloton_concedes', datos: {} },
      { plantilla: 'breakaway_caught', datos: { size: 6, awayKm: 120, toGo: 30, juntos: 1 } },
      { plantilla: 'attack_go', datos: { kind: 'ataque_grupo', saltan: 2, toGo: 30 } },
      { plantilla: 'breakaway_formed', datos: {}, who: named('Ana', 'Bea', 'Cris') },
      { plantilla: 'stage_win', datos: { won: 'group', margin: 4 } },
    ]
    for (const caso of OTRAS) {
      let dice = false
      for (const km of KMS) {
        const sin = lineOf(caso, km, caso.datos)
        expect(lineOf(caso, km, { ...caso.datos, groupJersey: 'gc' }), caso.plantilla).toBe(sin)
        // y nombran un grupo por su sitio en alguna redacción: si no, la prueba no miraría nada
        if (/the (lead|chase) group/i.test(sin)) dice = true
      }
      expect(dice, caso.plantilla).toBe(true)
    }
  })

  it('la palabra del grupo de un protagonista: la del maillot, si la anota la API; si no, su sitio', () => {
    expect(riderGroupNoun({ datos: { groupJersey: 'gc' } }, 'the lead group')).toBe(
      'the race leader’s group',
    )
    expect(riderGroupNoun({ datos: { groupJersey: 'kom' } }, 'the chase group')).toBe(
      'the mountains leader’s group',
    )
    expect(riderGroupNoun({ datos: {} }, 'the lead group')).toBe('the lead group')
    expect(riderGroupNoun({}, 'the chase group')).toBe('the chase group')
    expect(riderGroupNoun({ datos: { groupJersey: 'yellow' } }, 'the lead group')).toBe(
      'the lead group',
    )
  })

  it('los siete nombres que quedan son los siete del vocabulario', () => {
    // Lo que la tabla declara no puede ser más que el vocabulario cerrado. Si alguien añade un nombre
    // a una plantilla, esta prueba lo caza.
    //
    // RE-SELLADO EN E2, PASO 4a (docs/retransmision.md §12.6 y §16.1), y a propósito: eran los tres de
    // la v27 —`the bunch`, `the chase group`, `the lead group`— y pasan a siete. La voz de la
    // retransmisión dice la misma palabra que la barra de grupos por el mismo grupo (D-18, con el
    // valor por defecto de DD-04): los cuatro papeles, con `the gruppetto` para lo que va detrás del
    // grueso, y los tres del grupo del maillot de líder (6-b). En el 4a solo crecen las filas de
    // `GROUP_NOUNS`; las frases que dicen las palabras nuevas llegan en el 6b, y con ellas sus casos.
    const usados = new Set(Object.values(GROUP_NOUNS).flat())
    expect([...usados].sort()).toEqual([
      'the bunch',
      'the chase group',
      'the gruppetto',
      'the lead group',
      'the mountains leader’s group',
      'the points leader’s group',
      'the race leader’s group',
    ])
  })
})

/**
 * W2b · LA VOZ DICE LA PALABRA DE LA BARRA DE CADA GRUPO DEL QUE HABLA (la revisión de `Watch` del dueño;
 * D-18). La API anota el papel y el maillot de cada grupo que la línea nombra, en la hora de la línea: el de
 * los protagonistas, si es el de la frase, con si va en cabeza (`groupRole`, `groupJersey`, `groupHead`); el
 * que caza un ataque (`groupRole`, `groupJersey` en `attack_reeled`); y en los partes, la cabeza que no es el
 * título y la referencia de una caza (`leadRole`, `leadJersey`, `chaseRole`, `chaseJersey`). La voz dice esa
 * palabra donde decía su sitio, y fuera de cabeza no dice «in front», «at the front» ni «clear».
 */
describe('W2b · la palabra de la barra para cada grupo de la línea (D-18)', () => {
  const KMS = [10, 40, 70, 100, 130, 160, 11, 41, 71, 101]
  const ROLE_WORD = {
    lead: 'the lead group',
    chase: 'the chase group',
    bunch: 'the bunch',
  } as const
  const lineOf = (
    plantilla: string,
    km: number,
    datos: Record<string, number | string>,
    who: ChronicleRider[] = named('Ana', 'Bea'),
  ): string => chronicleLine('en', event({ plantilla, km, protagonists: who, datos }), REV)
  const all = (
    plantilla: string,
    datos: Record<string, number | string>,
    who?: ChronicleRider[],
  ): string[] => KMS.map((km) => lineOf(plantilla, km, datos, who))
  const withWord = (line: string, word: string): string =>
    line
      .replace(/the (lead|chase) group/g, word)
      .replace(/The (lead|chase) group/g, word.charAt(0).toUpperCase() + word.slice(1))
  const FRONT = /at the front|in front|up front| clear/

  const GRUPO_DE_LA_FRASE: {
    plantilla: string
    datos: Record<string, number | string>
    who?: ChronicleRider[]
  }[] = [
    { plantilla: 'bridge_made', datos: { size: 6, entran: 1 } },
    { plantilla: 'break_cooperation', datos: { cooperating: 1 } },
    { plantilla: 'break_share', datos: { passengers: 2 } },
    {
      plantilla: 'peloton_selection',
      datos: { before: 119, remaining: 13, dropped: 80, toGo: 125, chasing: 0 },
    },
    { plantilla: 'peloton_split', datos: { before: 80, remaining: 40, dropped: 40, chasing: 0 } },
    { plantilla: 'echelon_split', datos: { before: 80, remaining: 40, dropped: 40 } },
    {
      plantilla: 'front_group',
      datos: { size: 7, gapS: 90, toGo: 40, entran: 2, salen: 1 },
      who: named('Ana', 'Bea', 'Cris', 'Dani', 'Eva', 'Fer', 'Gus'),
    },
  ]

  it('el grupo de la frase, en cabeza, con la palabra de su papel donde decía su sitio, dentro de su fila', () => {
    const malas: string[] = []
    for (const caso of GRUPO_DE_LA_FRASE)
      for (const role of ['lead', 'chase', 'bunch'] as const) {
        const permitidos = GROUP_NOUNS[caso.plantilla] ?? []
        if (!permitidos.includes(ROLE_WORD[role]))
          malas.push(`${caso.plantilla}: falta ${ROLE_WORD[role]}`)
        KMS.forEach((km) => {
          const sin = lineOf(caso.plantilla, km, caso.datos, caso.who)
          const con = lineOf(
            caso.plantilla,
            km,
            { ...caso.datos, groupRole: role, groupHead: 1 },
            caso.who,
          )
          expect(con, `${caso.plantilla} ${role} km ${km}`).toBe(withWord(sin, ROLE_WORD[role]))
        })
      }
    expect(malas).toEqual([])
  })

  it('el maillot manda sobre el papel, como en la barra', () => {
    for (const caso of GRUPO_DE_LA_FRASE)
      KMS.forEach((km) => {
        const solo = lineOf(
          caso.plantilla,
          km,
          { ...caso.datos, groupJersey: 'gc', groupHead: 1 },
          caso.who,
        )
        const ambos = lineOf(
          caso.plantilla,
          km,
          { ...caso.datos, groupJersey: 'gc', groupRole: 'chase', groupHead: 1 },
          caso.who,
        )
        expect(ambos, `${caso.plantilla} km ${km}`).toBe(solo)
      })
  })

  it('fuera de cabeza, la cabeza que crece no dice «at the front», «in front» ni «clear»', () => {
    const cabezas = [
      { size: 7, gapS: 90, toGo: 40, entran: 2, salen: 1 },
      { size: 5, gapS: 90, toGo: 40, salen: 2 },
      { size: 1, gapS: 90, toGo: 40, salen: 2 },
      { size: 1, gapS: 90, toGo: 40 },
      { size: 2, gapS: 90, toGo: 40 },
      { size: 6, gapS: 90, toGo: 40 },
    ]
    for (const datos of cabezas) {
      const who = named('Ana', 'Bea', 'Cris', 'Dani', 'Eva', 'Fer', 'Gus').slice(
        0,
        Math.max(1, datos.size),
      )
      const dentro = all('front_group', { ...datos, groupHead: 1 }, who)
      const fuera = all('front_group', { ...datos, groupRole: 'chase', groupHead: 0 }, who)
      expect(
        dentro.some((l) => FRONT.test(l)),
        JSON.stringify(datos),
      ).toBe(true)
      for (const l of fuera) {
        expect(l, JSON.stringify(datos)).not.toMatch(FRONT)
        expect(l).not.toMatch(/the lead group/i)
      }
      // sin papel que decir (el del gruppetto), fuera de cabeza tampoco es la cabeza: the chase group
      for (const l of all('front_group', { ...datos, groupHead: 0 }, who))
        expect(l).not.toMatch(/the lead group/i)
    }
  })

  it('el puente fuera de cabeza: «together now» y el grupo por su papel; y «make the junction and join» con varios', () => {
    const fuera = all('bridge_made', { size: 6, entran: 1, groupRole: 'chase', groupHead: 0 })
    for (const l of fuera) {
      expect(l).not.toMatch(FRONT)
      expect(l).not.toMatch(/the lead group/i)
      expect(l).toMatch(/— 6 together now\./)
    }
    const dentro = all('bridge_made', { size: 6, entran: 1, groupHead: 1 })
    for (const l of dentro) expect(l).toMatch(/— 6 in front now\./)
    // la concordancia: varios «make … and join», uno «makes … and joins»
    const varios = all('bridge_made', { size: 6 })
    expect(varios.some((l) => l.includes('make the junction and join '))).toBe(true)
    expect(varios.every((l) => !l.includes('and joins'))).toBe(true)
    const uno = all('bridge_made', { size: 6 }, named('Ana'))
    expect(uno.some((l) => l.includes('makes the junction and joins '))).toBe(true)
  })

  it('las cribas fuera de cabeza dicen dónde quedan por la palabra de su grupo, no «in front»', () => {
    for (const plantilla of ['peloton_selection', 'peloton_split'])
      for (const datos of [
        { before: 119, remaining: 13, dropped: 80, toGo: 125, chasing: 0 },
        { before: 80, remaining: 40, dropped: 40, chasing: 0 },
        { dropped: 12, remaining: 40, chasing: 0 },
      ]) {
        const fuera = all(plantilla, { ...datos, groupRole: 'bunch', groupHead: 0 })
        for (const l of fuera) {
          expect(l, plantilla).not.toMatch(/in front/)
          expect(l, plantilla).not.toMatch(/the lead group/i)
        }
      }
  })

  it('la criba de un grupo pequeño fuera de cabeza, o con la fuga en carretera, no llama «leaders» a los suyos', () => {
    const pequena = { before: 8, remaining: 5, dropped: 3, chasing: 0 }
    const dentro = all('peloton_split', { ...pequena, groupHead: 1 })
    expect(dentro.some((l) => l.includes('3 of the 8 leaders let go'))).toBe(true)
    const fuera = all('peloton_split', { ...pequena, groupRole: 'chase', groupHead: 0 })
    // la misma frase, con su grupo por su papel y sus corredores sin «leaders»
    fuera.forEach((l, i) =>
      expect(l).toBe(
        withWord(dentro[i]!, 'the chase group').replace(
          '3 of the 8 leaders let go',
          '3 of the 8 riders let go',
        ),
      ),
    )
    for (const l of all('peloton_split', { ...pequena, chasing: 1 }))
      expect(l).not.toMatch(/leaders/)
  })

  it('la fuga que se entiende o no y quien carga con ella, fuera de cabeza: ni «up front» ni «up the road»', () => {
    // fuera de cabeza, la misma frase con su grupo donde decía «up front» o «up the road»
    const fueraDe = (l: string): string =>
      withWord(l, 'the chase group')
        .replace(/^(Up front|Up the road)/, 'In the chase group')
        .replace(/ up front/g, ' in the chase group')
    const casos = [
      { plantilla: 'break_cooperation', datos: { cooperating: 1 } },
      { plantilla: 'break_cooperation', datos: { cooperating: 0 } },
      { plantilla: 'break_share', datos: { passengers: 0 } },
      { plantilla: 'break_share', datos: { passengers: 1 } },
      { plantilla: 'break_share', datos: { passengers: 2 } },
    ]
    for (const { plantilla, datos } of casos) {
      const dentro = all(plantilla, { ...datos, groupHead: 1 })
      expect(
        dentro.some((l) => /up front|up the road/i.test(l)),
        plantilla,
      ).toBe(true)
      const fuera = all(plantilla, { ...datos, groupRole: 'chase', groupHead: 0 })
      fuera.forEach((l, i) => {
        expect(l, plantilla).toBe(fueraDe(dentro[i]!))
        expect(l, plantilla).not.toMatch(/up front|up the road/i)
      })
    }
    // y la de «up the road» sale en los km de la prueba
    expect(
      all('break_share', { passengers: 1, groupHead: 1 }).some((l) => l.startsWith('Up the road')),
    ).toBe(true)
    // uno solo, que no colabora consigo mismo, tampoco va «up front» si va detrás
    for (const l of all('break_cooperation', { cooperating: 1, groupHead: 0 }, named('Ana')))
      expect(l).toBe('No wheels to share: he is on his own.')
    for (const l of all('break_cooperation', { cooperating: 1, groupHead: 1 }, named('Ana')))
      expect(l).toBe('No wheels to share up front: he is on his own.')
  })

  it('«hit the front» con varios y sin equipo, en el abanico', () => {
    const varios = all('echelon_split', { before: 80, remaining: 40, dropped: 40 })
    expect(varios.some((l) => l.includes('Ana and Bea hit the front'))).toBe(true)
    expect(varios.every((l) => !l.includes('hits the front'))).toBe(true)
    const uno = all('echelon_split', { before: 80, remaining: 40, dropped: 40 }, named('Ana'))
    expect(uno.some((l) => l.includes('Ana hits the front'))).toBe(true)
  })

  it('el ataque cazado: lo cierra el grupo que lo caza, si no es el del título', () => {
    const datos = { mainRole: 'chase' }
    const delTitulo = all('attack_reeled', datos)
    expect(delTitulo.some((l) => l.startsWith('The chase group closes it down'))).toBe(true)
    const porLaCabeza = all('attack_reeled', { ...datos, groupRole: 'lead' })
    expect(porLaCabeza.some((l) => l.startsWith('The lead group closes it down'))).toBe(true)
    expect(porLaCabeza.every((l) => !l.startsWith('The chase group'))).toBe(true)
    const porElLider = all('attack_reeled', { ...datos, groupRole: 'lead', groupJersey: 'gc' })
    expect(porElLider.some((l) => l.startsWith('The race leader’s group closes it down'))).toBe(
      true,
    )
    // el grupo que caza, también un grupo del maillot sin papel que decir
    const soloMaillot = all('attack_reeled', { ...datos, groupJersey: 'kom' })
    expect(
      soloMaillot.some((l) => l.startsWith('The mountains leader’s group closes it down')),
    ).toBe(true)
  })

  it('el parte: la cabeza que no es el título, con su palabra; y la referencia de la caza, con la suya', () => {
    const partes = [
      { plantilla: 'time_gap', datos: { gapS: 90, trend: 1, leadSize: 40, chaseSize: 60 } },
      { plantilla: 'time_gap', datos: { gapS: 90, trend: -1, leadSize: 40, chaseSize: 60 } },
      { plantilla: 'time_gap', datos: { gapS: 90, trend: 0, leadSize: 40, chaseSize: 60 } },
      {
        plantilla: 'time_gap_run',
        datos: { gapS: 38, fromGapS: 179, fromKm: 90, trend: -1, leadSize: 40, chaseSize: 60 },
      },
      {
        plantilla: 'time_gap_run',
        datos: { gapS: 380, fromGapS: 90, fromKm: 90, trend: 1, leadSize: 40, chaseSize: 60 },
      },
      {
        plantilla: 'time_gap_run',
        datos: { gapS: 90, fromGapS: 92, fromKm: 90, trend: 0, leadSize: 40, chaseSize: 60 },
      },
    ]
    for (const { plantilla, datos } of partes) {
      const base = { ...datos, mainRole: 'chase' }
      // la cabeza con el amarillo, que no es el título
      for (const l of all(plantilla, { ...base, leadJersey: 'gc' }, [])) {
        expect(l, plantilla).toMatch(/the race leader’s group/i)
        expect(l, plantilla).not.toMatch(/the lead group/i)
      }
      // la referencia de una caza: «over the race leader’s group», y por su papel si no es la de siempre
      // (las redacciones de una racha que baja no dicen sobre quién: se miran las que lo dicen)
      const caza = { ...datos, mainRole: 'bunch', chaseKind: 'caza' }
      const sobre = (ls: string[]) => ls.filter((l) => / over the (?!last)/.test(l))
      const conMaillot = sobre(all(plantilla, { ...caza, chaseJersey: 'gc' }, []))
      expect(conMaillot.length, plantilla).toBe(sobre(all(plantilla, caza, [])).length)
      if (Number(datos.trend) >= 0 || plantilla === 'time_gap')
        expect(conMaillot.length, plantilla).toBeGreaterThan(0)
      for (const l of conMaillot) {
        expect(l, plantilla).toMatch(/over the race leader’s group/)
        expect(l, plantilla).not.toMatch(/over the chase group/)
      }
      for (const l of sobre(all(plantilla, { ...caza, chaseRole: 'bunch' }, [])))
        expect(l, plantilla).toMatch(/over the bunch/)
      // sin anotación, como antes
      for (const l of sobre(all(plantilla, caza, [])))
        expect(l, plantilla).toMatch(/over the chase group/)
    }
  })
})

describe('el parte de ventaja responde a las cuatro preguntas (v27)', () => {
  const gap = (datos: Record<string, number | string>, who: ChronicleRider[] = []) =>
    chronicleLine('en', event({ plantilla: 'time_gap', km: 137, protagonists: who, datos }), REV)

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
      'en',
      event({
        plantilla: 'attack_go',
        km: 140,
        protagonists: named('Peter Schulz'),
        datos: { kind: 'ataque_final', saltan: 1, toGo: 11, solo: 1, respecto: 1 },
        mentions: { liderId: rider('Alexander Schwarz') },
      }),
      REV,
    )
    expect(linea).toContain('Peter Schulz')
    expect(linea).toContain('going after')
    expect(linea).toContain('Alexander Schwarz')
  })

  it('los suyos se dejan caer a por él, y la línea dice a por quién y por qué (v36)', () => {
    // La conducta nueva de la v36: hasta la v35 el lector veía desaparecer a dos hombres del
    // pelotón sin explicación, porque el motor no tenía esta decisión y nadie se dejaba caer nunca.
    const porLaEtapa = chronicleLine(
      'en',
      event({
        plantilla: 'domestiques_drop_back',
        km: 60,
        protagonists: named('Peter Schulz', 'Oliver Bailey'),
        datos: { cuantos: 2, gapS: 34, porQue: 'etapa', toGo: 90 },
        mentions: { jefeId: rider('Alexander Schwarz') },
      }),
      REV,
    )
    expect(porLaEtapa).toContain('Alexander Schwarz')
    expect(porLaEtapa).toContain('34s')
    const porLaGeneral = chronicleLine(
      'en',
      event({
        plantilla: 'domestiques_drop_back',
        km: 60,
        protagonists: named('Peter Schulz', 'Oliver Bailey'),
        datos: { cuantos: 4, gapS: 120, porQue: 'general', toGo: 90 },
        mentions: { jefeId: rider('Alexander Schwarz') },
      }),
      REV,
    )
    // Por la general la frase dice lo que el equipo está haciendo: renunciar al día entero.
    expect(porLaGeneral).toContain('general classification')
    expect(porLaGeneral).toContain('4 riders')
    expect(porLaGeneral).toContain('Alexander Schwarz')
  })

  it('el hueco del que no manda se cuenta contra su grupo y con el líder al lado', () => {
    const linea = chronicleLine(
      'en',
      event({
        plantilla: 'attack_sticks',
        km: 150,
        protagonists: named('Oliver Bailey'),
        datos: { size: 1, gapS: 46, toGo: 1, respecto: 1, desenlace: 1 },
        mentions: { liderId: rider('Alexander Schwarz') },
      }),
      REV,
    )
    expect(linea).toContain('Oliver Bailey')
    expect(linea).toContain('46s')
    expect(linea).toContain('the stage is up the road with')
    expect(linea).toContain('Alexander Schwarz')
  })

  it('a mitad de etapa la subtrama va detrás del líder, sin dar la etapa por decidida', () => {
    const linea = chronicleLine(
      'en',
      event({
        plantilla: 'attack_sticks',
        km: 40,
        protagonists: named('Peter Schulz'),
        datos: { size: 1, gapS: 46, toGo: 111, respecto: 1 },
        mentions: { liderId: rider('Alexander Schwarz') },
      }),
      REV,
    )
    expect(linea).toContain('Behind Alexander Schwarz')
    expect(linea).not.toContain('the stage is up the road')
  })

  it('el último kilómetro dice sobre cuántos va el margen', () => {
    const linea = chronicleLine(
      'en',
      event({
        plantilla: 'final_km',
        km: 150,
        protagonists: named('Alexander Schwarz'),
        datos: { margin: 16, field: 1, chaseSize: 5 },
      }),
      REV,
    )
    expect(linea).toContain('16s')
    expect(linea).toContain('next 5 on the road')
  })

  it('un corredor solo no «sit up»: concuerda en singular', () => {
    const lineas = [10, 40, 70, 100].map((km) =>
      chronicleLine(
        'en',
        event({ plantilla: 'attack_reeled', km, protagonists: named('Markus Weber') }),
        REV,
      ),
    )
    expect(lineas.every((l) => !/\bWeber\b.*\bsit up\b/.test(l))).toBe(true)
    expect(lineas.some((l) => l.includes('sits up'))).toBe(true)
  })
})

describe('las plantillas que imprimían su clave cruda y la caída de la línea (E2, D-44; §12.5)', () => {
  const ana = [rider('Ana Ruiz', { bib: 45, team: 'Team Sol' })]
  const line = (plantilla: string, datos: Record<string, number | string> = {}, who = ana) =>
    [10, 40, 70, 100].map((km) =>
      chronicleLine('en', event({ plantilla, km, protagonists: who, datos }), REV),
    )

  it('el pinchazo y la avería: con coche o sin él, y en la crono sin km a meta', () => {
    for (const l of line('puncture', { perdidaS: 30, conCoche: 1, toGo: 42 })) {
      expect(l).toMatch(/punctur/i)
      expect(l).toContain('with 42 km to go')
      expect(l).toContain('team car')
    }
    for (const l of line('puncture', { perdidaS: 30, conCoche: 0, toGo: 42 }))
      expect(l).toMatch(/no team car|nowhere near/)
    for (const l of line('mechanical', { perdidaS: 30, conCoche: 1 }))
      expect(l).toContain('out on the course')
    for (const l of line('mechanical', { perdidaS: 30, conCoche: 0, toGo: 12 }))
      expect(l).toMatch(/no team car|no car behind/)
    // nunca el tiempo perdido: es del microscopio (§6.6)
    for (const l of line('puncture', { perdidaS: 30, conCoche: 1, toGo: 42 }))
      expect(l).not.toMatch(/30s|0:30/)
  })

  it('la tregua: concedida, y negada con cada uno de sus seis motivos', () => {
    for (const l of line('truce_granted', { toGo: 80 })) expect(l).toMatch(/truce/)
    const why = ['decisiva', 'cerca', 'abanico', 'cuesta', 'deuda', 'emboscada', '']
    const frases = why.map((motivo) => line('truce_denied', { toGo: 9, enJuego: 45, motivo })[0]!)
    expect(new Set(frases).size).toBe(why.length)
    expect(frases[1]).toContain('9 km to go')
    expect(frases[5]).toContain('45s at stake')
    for (const f of frases) expect(f).toContain('Ana Ruiz')
  })

  it('la caída: sin nombres, en el grupo de su papel; y sus nombres en un segundo tiempo', () => {
    for (const l of line('crash', { groupRole: 'gruppetto' })) expect(l).toContain('the gruppetto')
    for (const l of line('crash', { groupRole: 'chase', groupJersey: 'gc' }))
      expect(l).toContain('the race leader’s group')
    for (const l of line('crash')) {
      expect(l).toContain('the bunch')
      expect(l).not.toContain('Ana') // el rótulo CRASH sale sin nombres: la voz tampoco los dice
    }
    const cuatro = ['Ana', 'Bea', 'Cris', 'Dora'].map((n, i) =>
      rider(n, { bib: i + 1, team: `Team ${n}` }),
    )
    expect(line('crash_names', {}, cuatro.slice(0, 1))[0]).toMatch(/Ana/)
    expect(line('crash_names', {}, cuatro.slice(0, 2))[0]).toBe(
      '1 Ana (Team Ana) and 2 Bea (Team Bea) are on the ground.',
    )
    expect(line('crash_names', {}, cuatro)[0]).toBe(
      '1 Ana (Team Ana), 2 Bea (Team Bea), 3 Cris (Team Cris) and 1 other are among those down.',
    )
    expect(line('crash_names', {}, [])[0]).toBe('')
  })
})
