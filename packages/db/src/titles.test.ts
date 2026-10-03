import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { palmares, riders, worlds } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'
import { palmaresTitleSource } from './titles.js'

/**
 * LOS CAMPEONES DE PALMARES (docs/retransmision.md §7.4, D-25; E2, paso 5): el proveedor provisional de
 * títulos, con filas de `palmares` escritas a mano. Un título vale el día `d` si `validFromDay < d ≤
 * validToDay` (7-c), con `validToDay = validFromDay + 364`: el campeón defensor corre su nacional con
 * su maillot y el nuevo lo estrena al día siguiente.
 */

const idDe = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`

describe('db: palmaresTitleSource, los campeones nacionales de palmares (§7.4)', () => {
  let t: TestDb
  let mundo: string
  let otroMundo: string

  beforeAll(async () => {
    t = await startTestDb()
    const [a, b] = await t.db
      .insert(worlds)
      .values([
        { worldSeed: 'semilla-titulos', engineVersion: 91 },
        { worldSeed: 'semilla-otro-mundo', engineVersion: 91 },
      ])
      .returning({ id: worlds.id })
    mundo = a!.id
    otroMundo = b!.id
    await t.db.insert(riders).values(
      Array.from({ length: 6 }, (_, i) => ({
        id: idDe(i + 1),
        worldId: i < 5 ? mundo : otroMundo,
        name: `Corredor ${i + 1}`,
        country: 'IT',
        gender: 'M' as const,
        birthSeason: -5,
        archetype: 'fondo' as const,
        faceSeed: `cara-${i + 1}`,
      })),
    )
  }, 120_000)

  afterAll(async () => {
    await t?.close()
  })

  beforeEach(async () => {
    await t.db.delete(palmares)
  })

  /** Una victoria de palmarés: por defecto, la general del nacional de ruta de Italia del día 179. */
  const gana = (
    rider: number,
    o: {
      raceId?: string
      gameDay?: number
      season?: number
      kind?: 'gc' | 'stage'
      world?: string
    } = {},
  ) =>
    t.db.insert(palmares).values({
      worldId: o.world ?? mundo,
      riderId: idDe(rider),
      season: o.season ?? 0,
      raceId: o.raceId ?? 'nc-it-road',
      raceName: 'Campeonato',
      kind: o.kind ?? 'gc',
      gameDay: o.gameDay ?? 179,
    })
  const titulos = (dia: number) => palmaresTitleSource.titlesOn(t.db, mundo, dia)

  it('sin filas, nadie es campeón', async () => {
    expect((await titulos(200)).size).toBe(0)
  })

  it('el ganador del día 179 no es campeón el 179 y sí el 180, con su vigencia, su etapa y provisional', async () => {
    await gana(1)
    expect((await titulos(179)).size).toBe(0)
    const el180 = await titulos(180)
    expect([...el180.keys()]).toEqual([idDe(1)])
    expect(el180.get(idDe(1))).toEqual([
      {
        scope: 'national',
        country: 'IT',
        discipline: 'road',
        category: 'elite',
        season: 0,
        validFromDay: 179,
        validToDay: 543,
        source: { raceKey: 'nc-it-road:s0', stageDay: 1 },
        provisional: true,
      },
    ])
  })

  it('el día 543, con un ganador nuevo ese mismo día, vale el anterior; el 544, solo el nuevo', async () => {
    await gana(1)
    await gana(2, { gameDay: 543, season: 1 })
    expect([...(await titulos(543)).keys()]).toEqual([idDe(1)])
    const el544 = await titulos(544)
    expect([...el544.keys()]).toEqual([idDe(2)])
    expect(el544.get(idDe(2))?.[0]).toMatchObject({
      season: 1,
      validFromDay: 543,
      validToDay: 907,
      source: { raceKey: 'nc-it-road:s1', stageDay: 1 },
    })
  })

  it('sin edición nueva, el título caduca al año: el 544 ya no hay campeón', async () => {
    await gana(1)
    expect((await titulos(543)).size).toBe(1)
    expect((await titulos(544)).size).toBe(0)
  })

  it('el nacional sub-23 da un título sub-23 y nunca uno de élite (la trampa de LIKE)', async () => {
    await gana(3, { raceId: 'nc-it-u23-road' })
    await gana(4, { raceId: 'nc-it-u23-itt', gameDay: 175 })
    const t180 = await titulos(180)
    expect(t180.get(idDe(3))).toEqual([
      expect.objectContaining({ discipline: 'road', category: 'u23', country: 'IT' }),
    ])
    expect(t180.get(idDe(4))).toEqual([
      expect.objectContaining({ discipline: 'itt', category: 'u23', country: 'IT' }),
    ])
    for (const titles of t180.values())
      for (const title of titles) expect(title.category).toBe('u23')
  })

  it('un race_id que no casa la expresión entera no da título', async () => {
    await gana(1, { raceId: 'nc-ita-road' })
    await gana(2, { raceId: 'nc-it-road2' })
    await gana(3, { raceId: 'xnc-it-road' })
    await gana(4, { raceId: 'race-italy' })
    expect((await titulos(180)).size).toBe(0)
  })

  it('las filas de otro mundo y las que no son de general no dan título', async () => {
    await gana(6, { world: otroMundo })
    await gana(1, { kind: 'stage' })
    expect((await titulos(180)).size).toBe(0)
    expect((await palmaresTitleSource.titlesOn(t.db, otroMundo, 180)).size).toBe(1)
  })

  it('un corredor con ruta y crono tiene los dos títulos', async () => {
    await gana(5, { raceId: 'nc-it-itt', gameDay: 176 })
    await gana(5)
    const titles = (await titulos(180)).get(idDe(5)) ?? []
    expect(titles.map((x) => x.discipline).sort()).toEqual(['itt', 'road'])
    expect(titles.find((x) => x.discipline === 'itt')).toMatchObject({
      validFromDay: 176,
      validToDay: 540,
      source: { raceKey: 'nc-it-itt:s0', stageDay: 1 },
    })
  })

  it('el país sale del id de la carrera, en mayúsculas', async () => {
    await gana(1, { raceId: 'nc-nl-road' })
    expect((await titulos(180)).get(idDe(1))?.[0]?.country).toBe('NL')
  })
})
