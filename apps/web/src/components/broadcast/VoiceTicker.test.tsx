import type { LiveLine } from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { VoiceTicker } from './VoiceTicker'
import { castOf, leaderWorn } from './__fixtures__/screen'

/**
 * LA VOZ DE `Watch` (docs/retransmision.md §6.1, §6.10, §6.9, §12.2 y §12.5; pasos 3c y 6b): la última
 * línea dicha a la hora pintada, nunca una con `revealS` mayor que `t`; con `Commentary`, las
 * anteriores, la más reciente arriba; callada en los últimos `quietFinalM`. Lo que calla `inVoice`: el
 * descuelgue de un corredor sin nombrar lo cuenta la barra (la política de `namedRidersOf` antes de la
 * línea, `unnamedBefore`, que aquí se escribe a mano). Y lo que pone la web (6b): la frase de la fuga
 * en lugar de la línea de `breakaway_formed`, la tendencia del hueco y los nombres de una caída en un
 * segundo tiempo.
 */

const CAST = castOf(20, { 4: { worn: leaderWorn('gc') } })
/** Con nombre, el líder: lo que `namedRidersOf` nombraría en un grupo grande. */
const UNNAMED = () => (id: string) => id !== CAST[4]!.id

const rider = (ix: number) => ({
  id: CAST[ix]!.id,
  name: CAST[ix]!.name,
  country: 'ES',
  bib: ix + 1,
  team: CAST[ix]!.team?.name ?? null,
})
const line = (revealS: number, plantilla: string, riders: number[], km = 10): LiveLine => ({
  km,
  tS: revealS - 5,
  plantilla,
  protagonists: riders.map(rider),
  revealS,
})

const LINES = [
  line(100, 'attack_go', [1, 2], 3),
  line(400, 'rider_sits_up', [7], 9),
  line(700, 'rider_sits_up', [4], 15),
  line(900, 'attack_go', [3], 20),
]

const textOf = (markup: string): string =>
  markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

describe('VoiceTicker · la voz a su hora (§12.2)', () => {
  it('dice la última línea con revealS hasta t, nunca una de después', () => {
    const at = (t: number) =>
      textOf(
        renderToStaticMarkup(<VoiceTicker lines={LINES} t={t} open={false} unnamed={UNNAMED} />),
      )
    expect(at(50)).toBe('')
    expect(at(100)).toContain(CAST[1]!.name)
    expect(at(899.9)).toContain(CAST[4]!.name) // el líder se descuelga: se dice
    expect(at(899.9)).not.toContain(CAST[3]!.name)
    expect(at(900)).toContain(CAST[3]!.name)
  })

  it('el descuelgue de un corredor sin nombrar lo cuenta la barra; el de un líder, la voz', () => {
    const open = textOf(
      renderToStaticMarkup(<VoiceTicker lines={LINES} t={1000} open unnamed={UNNAMED} />),
    )
    expect(open).not.toContain(CAST[7]!.name)
    expect(open).toContain(CAST[4]!.name)
  })

  it('Commentary: las anteriores, la más reciente arriba, sin repetir la que dice ahora', () => {
    const markup = renderToStaticMarkup(
      <VoiceTicker lines={LINES} t={1000} open unnamed={UNNAMED} />,
    )
    const list = markup.slice(markup.indexOf('<ol'))
    expect(list.indexOf(CAST[4]!.name)).toBeLessThan(list.indexOf(CAST[1]!.name))
    expect(list).not.toContain(CAST[3]!.name)
    expect(markup.slice(0, markup.indexOf('<ol'))).toContain(CAST[3]!.name)
  })

  it('en los últimos quietFinalM calla (§6.9): ninguna línea arriba', () => {
    const markup = renderToStaticMarkup(
      <VoiceTicker lines={LINES} t={1000} open={false} quiet unnamed={UNNAMED} />,
    )
    expect(textOf(markup)).toBe('')
  })
})

describe('VoiceTicker · lo que pone la web en la voz (§12.5; 6b)', () => {
  const at = (lines: LiveLine[], t: number, extras = {}) =>
    textOf(
      renderToStaticMarkup(
        <VoiceTicker lines={lines} t={t} open unnamed={UNNAMED} extras={extras} />,
      ),
    )

  it('la frase de la fuga sustituye a la línea de breakaway_formed (12-e)', () => {
    const lines = [line(500, 'breakaway_formed', [1, 2, 3], 30)]
    const phrase = 'The race leader goes clear with two others.'
    const text = at(lines, 600, { present: () => phrase })
    expect(text).toContain(phrase)
    expect(text).not.toContain(CAST[2]!.name)
    // sin frase (sin cartas), la del acta
    expect(at(lines, 600)).toContain(CAST[2]!.name)
  })

  it('la caída, sin nombres al revelarse; sus nombres, crashNamesDelayS después', () => {
    const lines = [line(500, 'crash', [5, 6], 30)]
    expect(at(lines, 500, { namesDelayS: 30 })).toMatch(/[Cc]rash|Riders down/)
    expect(at(lines, 529, { namesDelayS: 30 })).not.toContain(CAST[5]!.name)
    expect(at(lines, 530, { namesDelayS: 30 })).toContain(CAST[5]!.name)
  })

  it('las líneas de estado, a su hora y en su sitio', () => {
    const state = [
      { revealS: 300, km: 8, text: 'The gap has fallen by 40 seconds in five kilometres.' },
    ]
    expect(at(LINES, 200, { state })).not.toContain('The gap has fallen')
    const text = at(LINES, 1000, { state })
    expect(text).toContain('The gap has fallen')
    // en Commentary, entre la de 100 y la de 700
    expect(text.indexOf('The gap has fallen')).toBeLessThan(text.indexOf(CAST[1]!.name))
  })
})
