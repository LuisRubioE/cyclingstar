import { describe, expect, it } from 'vitest'
import { buildRaceRadio, chronicleNames } from './chronicle.js'
import type { PullMotive } from '@cyclingstar/shared'
import type { PullMotive as EnginePullMotive } from '@cyclingstar/engine'

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

describe('el vocabulario de motivos del MOTOR y el del CONTRATO no pueden separarse', () => {
  /**
   * EL DEFECTO QUE ANCLA ESTA PRUEBA, visto en producción (Race Solidarnosc, cuatro etapas).
   *
   * El paso 17c amplió `PullMotive` en `packages/engine` de diez palabras a quince —`propio`,
   * `equipo_puntos`, `equipo_montana`, `infiltrado`, `colocando`— y **no amplió el contrato**. Como
   * `buildRaceRadio` VALIDA lo guardado contra ese enum, en cuanto un corredor tiraba con uno de los
   * cinco nuevos el `safeParse` fallaba entero, devolvía `null`, y la pantalla decía «esta etapa se
   * corrió antes de que se grabara la radio».
   *
   * Que además era **mentira**: la radio estaba guardada con sus ciento ochenta y siete kilómetros.
   * Y explicaba lo que parecía un misterio —unas carreras con radio y otras sin ella, el mismo
   * día—: solo se rompen las etapas donde alguno de los cinco llega a dispararse. En Solidarnosc
   * `propio` sale en las cuatro.
   *
   * Esta comprobación es de TIPOS y no de datos a propósito: falla al compilar, no en una etapa de
   * producción seis meses después. Si el motor añade una palabra y el contrato no, `pnpm typecheck`
   * se pone rojo aquí.
   */
  it('todo motivo del motor cabe en el contrato, y al revés', () => {
    const delMotorAlContrato: PullMotive = null as unknown as EnginePullMotive
    const delContratoAlMotor: EnginePullMotive = null as unknown as PullMotive
    expect(delMotorAlContrato).toBe(delContratoAlMotor)
  })

  /**
   * …Y AUNQUE SE SEPAREN, QUE NO CUESTE LA ETAPA. El enum volverá a quedarse corto el día que el
   * motor crezca otra vez, así que lo que de verdad hay que arreglar es la fragilidad: un motivo
   * desconocido se degrada a «no lo sé» y el corredor sale sin frase, en vez de llevarse por delante
   * los ciento ochenta y siete kilómetros de radio.
   */
  it('un motivo que el contrato no conoce NO tira abajo la radio entera', () => {
    const conMotivoRaro = {
      ...stored,
      kms: stored.kms.map((k) => ({
        ...k,
        // `stored` no trae `motivos` (es una fila vieja, y por eso el esquema le pone `[]`); aquí se
        // le pone uno por relevista, con una palabra que el contrato NO conoce.
        groups: k.groups.map((g) => ({
          ...g,
          motivos: g.pulling.map(() => 'motivo_del_futuro'),
        })),
      })),
    }
    const radio = buildRaceRadio(conMotivoRaro, names)
    expect(radio).not.toBeNull()
    expect(radio!.kms[0]!.groups.length).toBe(stored.kms[0]!.groups.length)
    // El corredor sigue ahí y sigue tirando; lo único que se pierde es la frase del motivo.
    const pulling = radio!.kms[0]!.groups.flatMap((g) =>
      g.riders.filter((r) => r.role === 'pulling'),
    )
    expect(pulling.length).toBeGreaterThan(0)
    expect(pulling.every((r) => r.motivo === null)).toBe(true)
  })
})
