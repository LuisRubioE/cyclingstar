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
])

const stored = {
  starters: 120,
  kms: [
    {
      km: 40,
      racing: 118,
      gone: 2,
      groups: [
        { kind: 'fuga', size: 6, gapS: 0, energyPct: 88, pulling: ['a'] },
        { kind: 'peloton', size: 112, gapS: 214, energyPct: 91, pulling: ['b', 'desconocido'] },
      ],
    },
  ],
}

describe('buildRaceRadio', () => {
  it('resuelve a los relevistas con el MISMO índice que el journal', () => {
    const radio = buildRaceRadio(stored, names)
    expect(radio).not.toBeNull()
    expect(radio!.starters).toBe(120)
    expect(radio!.kms[0]!.groups[0]!.pulling[0]).toMatchObject({
      name: 'Ana Solis',
      bib: 11,
      team: 'Summit Squad',
      country: 'es',
    })
  })

  it('al que no está en el índice lo DEJA FUERA en vez de inventarle un nombre', () => {
    const bunch = buildRaceRadio(stored, names)!.kms[0]!.groups[1]!
    expect(bunch.pulling).toHaveLength(1)
    expect(bunch.pulling[0]!.name).toBe('Bea Roca')
  })

  it('conserva huecos y tamaños tal cual: son medidas, no estimaciones', () => {
    expect(buildRaceRadio(stored, names)!.kms[0]!.groups.map((g) => [g.size, g.gapS])).toEqual([
      [6, 0],
      [112, 214],
    ])
  })

  it('una etapa SIN radio guardada devuelve null, no revienta', () => {
    expect(buildRaceRadio(null, names)).toBeNull()
    expect(buildRaceRadio(undefined, names)).toBeNull()
  })

  it('una radio con otra forma —motor anterior— también devuelve null', () => {
    expect(buildRaceRadio({ starters: 'muchos' }, names)).toBeNull()
    expect(buildRaceRadio({ starters: 1, kms: [{ km: 1 }] }, names)).toBeNull()
  })
})
