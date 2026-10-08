/**
 * CÓMO SE LLAMA CADA GRUPO EN LA RACE RADIO.
 *
 * Los casos vienen del parte del dueño mirando Race Sardegna e3, y son dos por los dos lados:
 * un pelotón de 129 al que se llamaba «Lead group» por haber perdido a alguien, y una carrera
 * partida en 59 y 65 en la que se seguía llamando «pelotón» a media carrera.
 *
 * RE-SELLADO EN E2, PASO 6b (docs/retransmision.md §6.3, D-18), a propósito: la radio dice las palabras
 * de la barra de `Watch`, sobre la carretera entera del km (`radioGroupNames`): `Bunch` y no `Peloton`
 * (DD-04), `Chase group` para el grupo del título que no llega a dos tercios (antes `2nd group`), el
 * suelto por su nombre (antes `No man’s land`) y `Gruppetto`. Son los ocho primeros casos de la tabla
 * de §6.3, en los mismos seis `it`; los demás van a `packages/shared/src/broadcast/instant.test.ts`.
 */
import type { RadioGroup, RadioGroupKind } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { radioGroupNames } from './RaceRadioPanel'

/** Un grupo de la radio de un km: su `kind`, su tamaño y los que nombra (todos, si son tres o menos). */
const g = (kind: RadioGroupKind, size: number, names: string[] = []) =>
  ({
    kind,
    size,
    riders: names.map((name) => ({
      id: null,
      name,
      bib: null,
      team: null,
      country: null,
      role: 'sheltered' as const,
      motivo: null,
      para: null,
    })),
  }) satisfies Pick<RadioGroup, 'kind' | 'size' | 'riders'>

describe('radioGroupNames', () => {
  it('un pelotón de 129 es el BUNCH, aunque vaya en cabeza y haya perdido a alguien', () => {
    // La queja, textual: «tenemos el pelotón con 129 ciclistas, etiquetado como lead group y no
    // como pelotón». El listón son los dos tercios de los que corren (`bunchMinShare`); el suelto de
    // detrás, por su nombre.
    expect(radioGroupNames([g('peloton', 129), g('tierra', 1, ['Ana Ruiz'])], 130)).toEqual([
      'Bunch',
      'Ana Ruiz',
    ])
  })

  it('y si de verdad no se ha escapado nadie, van todos juntos', () => {
    expect(radioGroupNames([g('peloton', 130)], 130)).toEqual(['Bunch together'])
  })

  it('sigue siendo el bunch aunque no vaya en cabeza', () => {
    expect(radioGroupNames([g('fuga', 20), g('peloton', 110)], 130)).toEqual([
      'Lead group',
      'Bunch',
    ])
  })

  it('pero media carrera NO es el pelotón: 59 y 65 son dos grupos, y el de 65 persigue', () => {
    // Con mayoría simple (65 de 124 es el 52 %) se habría seguido llamando pelotón al de 65; con el
    // ordinal de antes, `2nd group`. No llega a dos tercios, va detrás de la cabeza: persigue.
    expect(radioGroupNames([g('fuga', 59), g('peloton', 65)], 124)).toEqual([
      'Lead group',
      'Chase group',
    ])
  })

  it('una contra entre la cabeza y el bunch, un suelto por su nombre y el gruppetto detrás', () => {
    expect(
      radioGroupNames(
        [
          g('fuga', 4),
          g('contra', 8),
          g('tierra', 1, ['Bea Roca']),
          g('peloton', 105),
          g('grupeto', 12),
        ],
        130,
      ),
    ).toEqual(['Lead group', 'Chase group', 'Bea Roca', 'Bunch', 'Gruppetto'])
  })

  it('el grupo del título con 40 de 130, tercero, persigue; ningún «3rd group»', () => {
    expect(radioGroupNames([g('fuga', 50), g('contra', 40), g('peloton', 40)], 130)).toEqual([
      'Lead group',
      'Chase group',
      'Chase group',
    ])
  })
})
