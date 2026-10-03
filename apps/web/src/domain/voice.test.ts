import { describe, expect, it } from 'vitest'
import type { ChronicleRider, LiveLine } from '@cyclingstar/shared'
import { inVoice } from './voice'

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
