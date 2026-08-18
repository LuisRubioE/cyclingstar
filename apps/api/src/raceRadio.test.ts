import { describe, expect, it } from 'vitest'
import { buildRaceRadio, chronicleNames } from './chronicle.js'

/**
 * LA RADIO QUE SE GUARDA Y LA QUE SE PINTA. Lo que hay en `stage_snapshots.radio` son ids —es lo que
 * el motor conoce—; la vista necesita nombre, dorsal, equipo y país. Y lo que llega de la columna NO
 * se confía: una fila escrita por un motor anterior puede no tener esta forma, y ahí la respuesta
 * correcta es «esta etapa no tiene radio», no un 500.
 */
const names = chronicleNames([
  { riderId: 'a', name: 'Ana Solis', bib: 11, teamName: 'Summit Squad', country: 'es' },
  { riderId: 'b', name: 'Bea Roca', bib: 21, teamName: 'Team Sol', country: 'fr' },
  { riderId: 'c', name: 'Caro Ruiz', bib: 22, teamName: 'Team Sol', country: 'it' },
])

const stored = {
  starters: 120,
  riders: ['a', 'b', 'c', 'desconocido'],
  kms: [
    {
      km: 40,
      racing: 118,
      gone: 2,
      // a -> fuga; b, c y el desconocido -> pelotón.
      groups: [
        {
          kind: 'fuga',
          size: 6,
          gapS: 0,
          speedKmh: 41.2,
          pulling: [0],
          watching: [],
        },
        {
          kind: 'peloton',
          size: 112,
          gapS: 214,
          speedKmh: 39.8,
          pulling: [1, 3],
          watching: [2],
        },
      ],
    },
  ],
}

describe('buildRaceRadio', () => {
  it('resuelve a los relevistas con el MISMO índice que el journal', () => {
    const radio = buildRaceRadio(stored, names)
    expect(radio).not.toBeNull()
    expect(radio!.starters).toBe(120)
    expect(radio!.kms[0]!.groups[0]!.riders[0]).toMatchObject({
      name: 'Ana Solis',
      bib: 11,
      team: 'Summit Squad',
      country: 'es',
      role: 'pulling',
    })
  })

  it('al que no está en el índice lo DEJA FUERA en vez de inventarle un nombre', () => {
    const bunch = buildRaceRadio(stored, names)!.kms[0]!.groups[1]!
    expect(bunch.riders.map((r) => r.name)).toEqual(['Bea Roca', 'Caro Ruiz'])
  })

  it('cuenta a los que no nombra en vez de esconderlos', () => {
    const bunch = buildRaceRadio(stored, names)!.kms[0]!.groups[1]!
    expect(bunch.size).toBe(112)
    expect(bunch.unnamed).toBe(110)
  })

  it('el hueco va al LÍDER y también al grupo de delante: son dos preguntas distintas', () => {
    const gs = buildRaceRadio(stored, names)!.kms[0]!.groups
    expect(gs.map((g) => [g.gapS, g.gapToPrevS])).toEqual([
      [0, 0],
      [214, 214],
    ])
  })

  it('la velocidad viaja tal cual: es espacio partido por tiempo, no una estimación', () => {
    expect(buildRaceRadio(stored, names)!.kms[0]!.groups.map((g) => g.speedKmh)).toEqual([
      41.2, 39.8,
    ])
  })

  it('al que va A RUEDA y está en la lista de seguimiento se le nombra, marcado como tal', () => {
    // Es el «el equipo tira para X»: si X no aparece, la frase no se entiende. Va sin el símbolo de
    // relevo, porque no está tirando: está guardándose.
    const bunch = buildRaceRadio(stored, names)!.kms[0]!.groups[1]!
    const x = bunch.riders.find((r) => r.name === 'Caro Ruiz')
    expect(x?.role).toBe('sheltered')
  })

  it('los que TIRAN van primero, y después los que van a rueda', () => {
    const bunch = buildRaceRadio(stored, names)!.kms[0]!.groups[1]!
    expect(bunch.riders.map((r) => r.role)).toEqual(['pulling', 'sheltered'])
  })

  it('una etapa SIN radio guardada devuelve null, no revienta', () => {
    expect(buildRaceRadio(null, names)).toBeNull()
    expect(buildRaceRadio(undefined, names)).toBeNull()
  })

  it('una radio con otra forma —motor anterior— también devuelve null', () => {
    expect(buildRaceRadio({ starters: 'muchos' }, names)).toBeNull()
    expect(buildRaceRadio({ starters: 1, kms: [{ km: 1 }] }, names)).toBeNull()
    // La forma VIEJA (relevistas por id, sin `riders` ni `member`) tampoco cuela.
    expect(
      buildRaceRadio(
        {
          starters: 1,
          kms: [
            {
              km: 1,
              racing: 1,
              gone: 0,
              groups: [{ kind: 'fuga', size: 1, gapS: 0, energyPct: 90, pulling: ['a'] }],
            },
          ],
        },
        names,
      ),
    ).toBeNull()
  })
})
