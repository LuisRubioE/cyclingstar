import { describe, expect, it } from 'vitest'
import {
  PULLERS_KEPT,
  buildRaceRadio,
  chronicleNames,
  storedRaceRadioSchema,
  veilStoredRadio,
} from './chronicle.js'
import { BROADCAST, type PullMotive } from '@cyclingstar/shared'
import type { PullMotive as EnginePullMotive } from '@cyclingstar/engine'
import {
  ROAD_FIXTURES,
  fixtureStage,
  loadEvents,
  loadRadio,
  loadStoredRadio,
} from './__fixtures__/broadcast/load.js'

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

/**
 * LA RADIO GUARDADA BAJO EL VELO (docs/retransmision.md §11.16 y §11.19, decisión 11-l; D-16; nace en
 * el 3a con el adaptador, 17-f). La lista de seguimiento que escribe el tick mete en cada grupo grande,
 * desde el km 0, a los diez primeros DE LA ETAPA: quien los ve nombrados en el pelotón del km 20 sabe
 * que acabarán entre los diez primeros. `veilStoredRadio` la corta al construir la línea del adaptador,
 * para todos: en un grupo de más de doce, los doce primeros que tiran y, del resto, los nombrables.
 */
describe('veilStoredRadio · la lista de seguimiento, cortada (11-l)', () => {
  const ids = Array.from({ length: 20 }, (_, i) => `x${i}`)
  /** Un grupo grande de 20: tiran los catorce primeros y van a rueda, nombrados, x14 a x16. */
  const grande = {
    kind: 'peloton' as const,
    size: 20,
    gapS: 0,
    speedKmh: 40,
    pulling: ids.slice(0, 14).map((_, i) => i),
    pullingTotal: 27,
    motivos: ids.slice(0, 14).map((_, i) => (i === 13 ? ('equipo_general' as const) : null)),
    paraQuien: ids.slice(0, 14).map((_, i) => (i === 13 ? 5 : null)),
    watching: [14, 15, 16],
  }
  const radio = storedRaceRadioSchema.parse({
    starters: 32,
    riders: ids,
    kms: [{ km: 20, racing: 32, gone: 0, groups: [grande, { ...grande, size: 12, gapS: 30 }] }],
  })
  /** Nombrables: x13 (tira el decimocuarto) y x15 (a rueda). */
  const nameable = (): ReadonlySet<string> => new Set(['x13', 'x15'])

  it('un grupo de 13 o más se queda con los doce primeros que tiran y los nombrables', () => {
    const g = veilStoredRadio(radio, nameable).kms[0]!.groups[0]!
    expect(g.pulling).toEqual([...ids.slice(0, PULLERS_KEPT).map((_, i) => i), 13])
    expect(g.motivos).toEqual([...ids.slice(0, PULLERS_KEPT).map(() => null), 'equipo_general'])
    expect(g.paraQuien).toEqual([...ids.slice(0, PULLERS_KEPT).map(() => null), 5])
    expect(g.watching).toEqual([15])
    expect([g.size, g.pullingTotal]).toEqual([20, 27])
  })

  it('uno de 12 no cambia: su composición es estado y se nombra entero (§7.7)', () => {
    const before = radio.kms[0]!.groups[1]!
    expect(veilStoredRadio(radio, nameable).kms[0]!.groups[1]).toBe(before)
  })

  it('tras buildRaceRadio, size, pullingTotal y unnamed cuadran', () => {
    const everyone = chronicleNames(
      ids.map((riderId) => ({ riderId, name: riderId, bib: null, teamName: null, country: 'es' })),
    )
    const shown = buildRaceRadio(veilStoredRadio(radio, nameable), everyone)!.kms[0]!.groups[0]!
    expect(shown.size).toBe(20)
    expect(shown.pullingTotal).toBe(27)
    expect(shown.riders).toHaveLength(14) // doce que tiran, el decimocuarto nombrable y x15
    expect(shown.unnamed).toBe(20 - 14)
  })

  it.each(ROAD_FIXTURES)(
    '%s: ningún corredor del top 10 de la etapa que no sea nombrable sale en un grupo grande por estar en la lista',
    (name) => {
      const stage = fixtureStage(name)
      const events = loadEvents(name)
      // El top 10 de la etapa: el reloj de cada uno en la foto de la meta de la radio completa.
      const last = loadRadio(name).kms.at(-1)!
      const top10 = new Set(
        last.groups
          .flatMap((g) => g.riderIds.map((id, j) => ({ id, t: g.riderTs[j]! })))
          .sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : 1))
          .slice(0, 10)
          .map((x) => x.id),
      )
      // Lo nombrable sin quien mira: los maillots y los protagonistas de lo ya contado (11-l).
      const nameableAt = (km: number): ReadonlySet<string> =>
        new Set([
          ...stage.priority,
          ...events.filter((e) => e.km <= km + 1e-4).flatMap((e) => e.protagonistas),
        ])
      const stored = storedRaceRadioSchema.parse(loadStoredRadio(name))
      /** Los del top 10 no nombrables que salen en un grupo grande sin estar entre los doce que tiran. */
      const leaks = (r: typeof stored): number =>
        r.kms.reduce((n, k) => {
          const ok = nameableAt(k.km)
          const bad = (i: number): boolean => {
            const id = r.riders[i]!
            return top10.has(id) && !ok.has(id)
          }
          return (
            n +
            k.groups
              .filter((g) => g.size > BROADCAST.nameWholeGroupUpTo)
              .reduce(
                (m, g) =>
                  m +
                  g.watching.filter(bad).length +
                  g.pulling.slice(PULLERS_KEPT).filter(bad).length,
                0,
              )
          )
        }, 0)
      expect(leaks(stored)).toBeGreaterThan(0) // sin cortar, la lista los nombra
      expect(leaks(veilStoredRadio(stored, nameableAt))).toBe(0)
    },
  )
})
