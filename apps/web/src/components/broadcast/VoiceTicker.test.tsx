import type { LiveLine } from '@cyclingstar/shared'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { unnamedFor } from '../../domain/broadcast/screen'
import { VoiceTicker } from './VoiceTicker'
import { castOf, headOf, leaderWorn } from './__fixtures__/screen'

/**
 * LA VOZ DE `Watch` (docs/retransmision.md §6.1, §6.10, §6.9 y §12.2; paso 3c): la última línea dicha a
 * la hora pintada, nunca una con `revealS` mayor que `t`; con `Commentary`, las anteriores, la más
 * reciente arriba; callada en los últimos `quietFinalM`. Y lo que calla `inVoice`: el descuelgue de
 * un corredor sin nombrar lo cuenta la barra (con el criterio provisional de `unnamedFor` hasta el 6b).
 */

const CAST = castOf(20, { 4: { worn: leaderWorn('gc') } })
const HEAD = headOf(CAST)
const UNNAMED = unnamedFor(CAST, HEAD.startState)

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
    expect(UNNAMED(CAST[7]!.id)).toBe(true)
    expect(UNNAMED(CAST[4]!.id)).toBe(false)
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
