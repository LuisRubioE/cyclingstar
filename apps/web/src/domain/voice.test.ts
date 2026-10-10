import { describe, expect, it } from 'vitest'
import type { ChronicleRider, Instant, LiveLine } from '@cyclingstar/shared'
import { instantOf } from '../components/broadcast/__fixtures__/screen'
import { linesOf, mainNoun } from './stageJournal'
import { GAP_TREND_INIT, type VoiceItem, gapTrendStep, inVoice, voiceItemsOf } from './voice'

/**
 * LO QUE LA VOZ CALLA PORQUE YA LO DICE EL ESTADO (docs/retransmision.md §12.2; D-43, punto 5; 12-m).
 * En `Watch` la barra y la capa fija enseñan siempre quién va dónde y con cuánto; la voz no repite
 * lo que ya está en pantalla: ni el parte de cabeza ni el de ventaja, ni la racha de partes (que en
 * vivo no nace), ni el descuelgue suelto de un corredor sin rótulo, que la barra cuenta
 * (`GRUPPETTO · 23`). Todo eso sigue en el acta.
 */

const rider = (id: string | null): ChronicleRider => ({
  id,
  name: id ?? 'desconocido',
  bib: null,
  team: null,
  country: null,
})

const line = (plantilla: string, revealS: number, ids: (string | null)[] = []): LiveLine => ({
  km: 100,
  tS: revealS - 30,
  plantilla,
  protagonists: ids.map(rider),
  revealS,
})

const nadieNombrado = () => true

describe('inVoice', () => {
  it('deja fuera lo que ya dice el estado: el parte de cabeza, el de ventaja y la racha de partes', () => {
    for (const plantilla of ['front_group', 'time_gap', 'time_gap_run'])
      expect(inVoice(line(plantilla, 1000), nadieNombrado), plantilla).toBe(false)
  })

  it('el resto de la voz sale, se nombre o no a sus protagonistas', () => {
    for (const plantilla of ['attack_go', 'breakaway_caught', 'rider_bonks', 'rider_abandons'])
      expect(inVoice(line(plantilla, 1000, ['r1']), nadieNombrado), plantilla).toBe(true)
  })

  it('el descuelgue de un corredor sin rótulo, fuera (lo cuenta la barra); el de uno con rótulo, dentro', () => {
    const conRotulo = new Set(['r2'])
    const sinRotulo = (id: string) => !conRotulo.has(id)
    expect(inVoice(line('rider_sits_up', 1000, ['r1']), sinRotulo)).toBe(false)
    expect(inVoice(line('rider_sits_up', 1000, ['r2']), sinRotulo)).toBe(true)
    // Con alguno de sus protagonistas con rótulo, o uno que no se pudo resolver, la línea se dice.
    expect(inVoice(line('rider_sits_up', 1000, ['r1', 'r2']), sinRotulo)).toBe(true)
    expect(inVoice(line('rider_sits_up', 1000, [null]), sinRotulo)).toBe(true)
  })

  it('el propio descuelgue no cuenta para nombrarle: «sin rótulo» se decide con lo revelado ANTES de la línea (12-m)', () => {
    // Así arma `unnamed` quien llama (§7.7 desde el 6b): con los protagonistas de las líneas ya
    // dichas. Ana atacó antes y tiene rótulo; Bea solo sale en su propio descuelgue.
    const voz = [
      line('attack_go', 900, ['ana']),
      line('rider_sits_up', 1000, ['ana']),
      line('rider_sits_up', 1000, ['bea']),
    ]
    const sinRotuloAntesDe = (l: LiveLine) => (id: string) =>
      !voz.some((o) => o.revealS < l.revealS && o.protagonists.some((p) => p.id === id))
    expect(voz.map((l) => inVoice(l, sinRotuloAntesDe(l)))).toEqual([true, true, false])
    // Si contara su propia línea, todo el que se descuelga estaría nombrado por descolgarse.
    const contandoLaPropia = (l: LiveLine) => (id: string) =>
      !voz.some((o) => o.revealS <= l.revealS && o.protagonists.some((p) => p.id === id))
    expect(inVoice(voz[2]!, contandoLaPropia(voz[2]!))).toBe(true)
  })
})

describe('linesOf · la caída y luego sus nombres (§12.5, D-13)', () => {
  // sin id: chronicleLine quita la marca del enlace a la ficha, y con ella el nombre
  const ana = { id: null, name: 'Ana', bib: 4, team: 'Team Sol', country: null }
  const bea = { id: null, name: 'Bea', bib: 9, team: 'Team Luna', country: null }
  const e = (plantilla: string, protagonists: ChronicleRider[]) => ({
    km: 50,
    tS: 3000,
    plantilla,
    protagonists,
  })

  it('dos frases para crash, sin nombres la primera; una para lo demás; ninguna para lo que no tiene frase', () => {
    const [crash, names] = linesOf('en', e('crash', [ana, bea]), 0)
    expect(crash).toMatch(/[Cc]rash|Riders down/)
    expect(crash).not.toContain('Ana')
    expect(names).toBe('4 Ana (Team Sol) and 9 Bea (Team Luna) are on the ground.')
    expect(linesOf('en', e('attack_reeled', [ana]), 0)).toHaveLength(1)
    expect(linesOf('en', e('meteorito', [ana]), 0)).toEqual([])
    // una caída sin caídos conocidos: solo la primera
    expect(linesOf('en', e('crash', []), 0)).toHaveLength(1)
  })
})

describe('mainNoun · la palabra de la barra para el grupo del título (D-18, 12-b)', () => {
  it('los cuatro papeles y los tres maillots; sin anotación, the bunch', () => {
    const noun = (datos: Record<string, string>) => mainNoun({ datos })
    expect(noun({})).toBe('the bunch')
    expect(noun({ mainRole: 'lead' })).toBe('the lead group')
    expect(noun({ mainRole: 'chase' })).toBe('the chase group')
    expect(noun({ mainRole: 'bunch' })).toBe('the bunch')
    // el título nunca es the gruppetto: su fila de GROUP_NOUNS no lo tiene (voiceRoles.ts)
    expect(noun({ mainRole: 'gruppetto' })).toBe('the bunch')
    expect(noun({ mainRole: 'chase', mainJersey: 'gc' })).toBe('the race leader’s group')
    expect(noun({ mainRole: 'chase', mainJersey: 'points' })).toBe('the points leader’s group')
    expect(noun({ mainRole: 'gruppetto', mainJersey: 'kom' })).toBe('the mountains leader’s group')
  })
})

describe('voiceItemsOf · la voz hasta t, con lo que pone la web (§12.5)', () => {
  const all = () => () => false
  it('ordena por hora las líneas, sus nombres y las de estado, y nunca pasa de t', () => {
    const lines = [line('crash', 100, ['r1']), line('attack_go', 120, ['r2'])]
    const state = [
      { revealS: 110, km: 30, text: 'The gap has grown by 40 seconds in five kilometres.' },
    ]
    const items = voiceItemsOf(lines, 200, all, { state, namesDelayS: 15 })
    expect(
      items.map((x) => [x.revealS, x.k === 'entry' ? x.e.plantilla : x.text.slice(0, 7)]),
    ).toEqual([
      [100, 'crash'],
      [110, 'The gap'],
      [115, 'crash_names'],
      [120, 'attack_go'],
    ])
    expect(voiceItemsOf(lines, 114, all, { state, namesDelayS: 15 })).toHaveLength(2)
  })

  /**
   * LO DICHO HASTA t, SIN REHACERLO A CADA PINTURA (10b, los arreglos; §18.5). La voz se pinta a
   * `overlayHz` y cada pintura recorría y ordenaba toda la voz de la etapa y pedía la frase de cada fuga:
   * lo dicho hasta t es el principio de lo dicho en toda la línea servida, por hora, y se guarda mientras
   * no cambien sus líneas ni lo demás que lo decide.
   */
  it('a cualquier hora, lo mismo que contarlo de nuevo; la frase de cada fuga se pide una vez por línea', () => {
    const plantillas = ['attack_go', 'crash', 'breakaway_formed', 'rider_sits_up', 'front_group']
    const lines = Array.from({ length: 120 }, (_, i) =>
      line(plantillas[i % plantillas.length]!, 100 + 7 * i + (i % 3), [`r${i % 9}`]),
    )
    const state = [10, 300, 301, 650].map((revealS) => ({
      revealS,
      km: 1,
      text: `estado ${revealS}`,
    }))
    const unnamed = (l: LiveLine) => (id: string) => id !== 'r4' || l.revealS > 500
    const asked = new Map<LiveLine, number>()
    const present = (l: LiveLine): string | null => {
      asked.set(l, (asked.get(l) ?? 0) + 1)
      return l.revealS % 2 === 0 ? `fuga ${l.revealS}` : null
    }
    /** Lo de antes del 10b: contar y ordenar lo dicho hasta t. */
    const counted = (t: number) => {
      const out: { revealS: number; key: string }[] = []
      for (const l of lines) {
        if (l.revealS > t || !inVoice(l, unnamed(l))) continue
        const phrase = l.plantilla === 'breakaway_formed' ? (present(l) ?? null) : null
        if (phrase !== null) out.push({ revealS: l.revealS, key: phrase })
        else {
          out.push({ revealS: l.revealS, key: `${l.plantilla}@${l.revealS}` })
          if (l.plantilla === 'crash' && l.revealS + 15 <= t)
            out.push({ revealS: l.revealS + 15, key: `crash_names@${l.revealS}` })
        }
      }
      for (const x of state) if (x.revealS <= t) out.push({ revealS: x.revealS, key: x.text })
      return out
        .map((x, i) => ({ x, i }))
        .sort((a, b) => a.x.revealS - b.x.revealS || a.i - b.i)
        .map(({ x }) => x)
    }
    const keyOf = (x: VoiceItem) =>
      x.k === 'text'
        ? x.text
        : `${x.e.plantilla}@${x.e.plantilla === 'crash_names' ? x.revealS - 15 : x.revealS}`
    const ts = [0, 10, 99, 100, 101, 300, 300.5, 301, 455, 500, 650, 700, 949, 2000]
    const expected = ts.map((t) => counted(t).map((x) => [x.revealS, x.key]))
    asked.clear()
    const got = ts.map((t) =>
      voiceItemsOf(lines, t, unnamed, { present, state, namesDelayS: 15 }).map((x) => [
        x.revealS,
        keyOf(x),
      ]),
    )
    expect(got).toEqual(expected)
    // la frase de cada fuga, una vez en las catorce pinturas
    expect([...asked.values()].every((n) => n === 1)).toBe(true)
    expect(asked.size).toBe(lines.filter((l) => l.plantilla === 'breakaway_formed').length)
  })
})

describe('gapTrendStep · la tendencia del hueco en la voz (§12.5)', () => {
  const at = (t: number, headKm: number, deltaS: number, behind = 1): Instant => {
    const arrow = deltaS >= 5 ? 'up' : deltaS <= -5 ? 'down' : 'flat'
    return instantOf(
      [
        { members: [1, 2], km: headKm },
        { members: [3, 4, 5, 6], km: headKm - 1, gapS: 60 },
      ],
      {
        t,
        mainGap: {
          ahead: 0,
          behind,
          gapS: 60,
          trend: { deltaS, windowKm: 5, arrow },
          ref: 'second',
        },
      },
    )
  }

  it('una línea al pasar a subir o a bajar, como mucho una cada 5 km, y no al cambiar la pareja', () => {
    let s = GAP_TREND_INIT
    s = gapTrendStep(s, at(100, 10, 0)) // flat
    s = gapTrendStep(s, at(200, 12, -40)) // baja: línea
    expect(s.lines.map((l) => l.text)).toEqual([
      'The gap has fallen by 40 seconds in five kilometres.',
    ])
    s = gapTrendStep(s, at(300, 13, 0))
    s = gapTrendStep(s, at(400, 14, 40)) // sube, pero a 2 km de la anterior: no
    expect(s.lines).toHaveLength(1)
    s = gapTrendStep(s, at(500, 18, 0))
    s = gapTrendStep(s, at(600, 19, 70)) // sube a 7 km: sí
    expect(s.lines.map((l) => l.text).at(-1)).toBe('The gap has grown by 1:10 in five kilometres.')
    s = gapTrendStep(s, at(700, 30, -30, 2)) // otra pareja: la flecha vuelve a empezar, sin línea
    expect(s.lines).toHaveLength(2)
    // hacia atrás, se queda con lo de antes de esa hora
    expect(gapTrendStep(s, at(250, 12, 0)).lines).toHaveLength(1)
  })
})
