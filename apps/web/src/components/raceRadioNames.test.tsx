/**
 * CÓMO SE LLAMA CADA GRUPO EN LA RACE RADIO.
 *
 * Los casos vienen del parte del dueño mirando Race Sardegna e3, y son dos por los dos lados:
 * un pelotón de 129 al que se llamaba «Lead group» por haber perdido a alguien, y una carrera
 * partida en 59 y 65 en la que se seguía llamando «pelotón» a media carrera.
 */
import { describe, expect, it } from 'vitest'
import { groupName } from './RaceRadioPanel'

describe('groupName', () => {
  it('un pelotón de 129 es el PELOTÓN, aunque vaya en cabeza y haya perdido a alguien', () => {
    // La queja, textual: «tenemos el pelotón con 129 ciclistas, etiquetado como lead group y no
    // como pelotón». El listón era `size >= racing`, o sea el pelotón en pleno.
    expect(groupName('peloton', 0, 129, 130)).toBe('Peloton')
  })

  it('y si de verdad no se ha escapado nadie, van todos juntos', () => {
    expect(groupName('peloton', 0, 130, 130)).toBe('Bunch together')
  })

  it('sigue siendo el pelotón aunque no vaya en cabeza', () => {
    expect(groupName('peloton', 1, 110, 130)).toBe('Peloton')
  })

  it('pero media carrera NO es el pelotón: 59 y 65 son dos grupos, no uno y su cola', () => {
    // Con mayoría simple (65 de 124 es el 52 %) se habría seguido llamando pelotón al de 65.
    expect(groupName('fuga', 0, 59, 124)).toBe('Lead group')
    expect(groupName('peloton', 1, 65, 124)).toBe('2nd group')
  })

  it('los nombres de siempre se conservan cuando el pelotón sí manda', () => {
    expect(groupName('contra', 1, 8, 130)).toBe('Chase group')
    expect(groupName('tierra', 2, 1, 130)).toBe('No man’s land')
    expect(groupName('grupeto', 3, 12, 130)).toBe('Grupetto')
  })

  it('el ordinal no dice «3th»', () => {
    expect(groupName('peloton', 2, 40, 130)).toBe('3rd group')
  })
})
