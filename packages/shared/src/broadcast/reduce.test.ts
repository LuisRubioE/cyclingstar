import { describe, expect, it } from 'vitest'
import { synthLine, toyStage } from './__fixtures__/syntheticLine.js'
import { clockMarksOf, photoAt, reducePhoto } from './reduce.js'
import type { Photo, TimelineCore } from './timeline.js'
import { toDs } from './timeline.js'

/**
 * EL REDUCTOR Y SUS INVARIANTES (E2, docs/retransmision.md §4.4 y §16.2; I-02, D-52).
 *
 * Un cambio en `shared` no corre los bancos aunque cambie lo que el grabador escribe, así que I1 y la
 * mitad de I3 corren también aquí, en la suite rápida, sobre fotos sintéticas: la etapa de juguete
 * de `__fixtures__/syntheticLine.ts`, grabada con las reglas de §5.4. I1 sobre el motor de verdad va en
 * los bancos (4b) y en las etapas congeladas (5); la vuelta del códec, en el 4b.
 */

const OPTS = { photoEvery: 10, keyEvery: 20, lastBlocks: 10 } as const

describe('reducePhoto · un suceso de estado sobre una foto (§4.4)', () => {
  const base: Photo = {
    b: 4,
    groupOf: Int16Array.from([0, 0, 1]),
    main: 0,
    clock: new Map([[0, 50]]),
    detail: null,
  }

  it('out saca al corredor de la foto, y move lo cambia de grupo, sin tocar la foto de antes', () => {
    const out = reducePhoto(base, { t: 'out', b: 5, rider: 2 })
    expect([...out.groupOf]).toEqual([0, 0, -1])
    const moved = reducePhoto(base, { t: 'move', b: 6, to: 3, riders: [0, 2] })
    expect([...moved.groupOf]).toEqual([3, 0, 3])
    expect(moved.b).toBe(6)
    expect([...base.groupOf]).toEqual([0, 0, 1]) // nadie la muta: el reductor copia
  })

  it('main cambia el título; clock deja la última marca de cada grupo; mishap no mueve a nadie', () => {
    expect(reducePhoto(base, { t: 'main', b: 5, group: 1 }).main).toBe(1)
    const clocked = reducePhoto(base, { t: 'clock', b: 5, marks: [[1, 61]] })
    expect([...clocked.clock]).toEqual([
      [0, 50],
      [1, 61],
    ])
    expect(base.clock.has(1)).toBe(false)
    const mishap = reducePhoto(base, { t: 'mishap', b: 5, rider: 1, kind: 'pinchazo', lostDs: 90 })
    expect(mishap.groupOf).toBe(base.groupOf) // sin copia: no cambia nada
    expect(mishap.b).toBe(5)
  })
})

describe('I1 · la foto reducida es la foto del motor (§4.4), sobre fotos sintéticas', () => {
  const { photos, riderIds } = toyStage()
  const { tl, ixOf } = synthLine(photos, riderIds, OPTS)
  const expected = (b: number) => {
    const p = photos[b]!
    return {
      groupOf: p.groupOf.map((g) => (g === null ? -1 : ixOf.get(g)!)),
      main: p.main === null ? null : ixOf.get(p.main)!,
      clock: Object.entries(p.clockS)
        .map(([id, s]) => [ixOf.get(id)!, toDs(s)] as const)
        .sort((x, y) => x[0] - y[0]),
    }
  }

  it('el catálogo numera por la hora de la marca de nacimiento, con el de salida el 0 (4-a)', () => {
    expect(tl.groups.map((g) => [g.id, g.origin, g.bornB, g.diedB, g.successor])).toEqual([
      ['peloton', 'start', 0, null, null],
      ['mov-1', 'attack', 12, null, null],
      ['shed-2', 'shed', 25, 46, 0], // cazado: su sucesor es el pelotón
    ])
  })

  it('en cada bloque de foto, la foto reducida es la del motor: pertenencia, título y reloj exacto', () => {
    for (let b = 0; b < photos.length; b++) {
      if (b % OPTS.photoEvery !== 0 && b !== photos.length - 1) continue
      const p = photoAt(tl, b)
      const want = expected(b)
      expect([...p.groupOf], `bloque ${b}`).toEqual(want.groupOf)
      expect(p.main, `bloque ${b}`).toBe(want.main)
      expect(
        [...p.clock].sort((x, y) => x[0] - y[0]),
        `bloque ${b}`,
      ).toEqual(want.clock)
    }
  })

  it('y en todo bloque, la pertenencia y el título; el reloj de cada grupo, entre sus dos marcas', () => {
    for (let b = 0; b < photos.length; b++) {
      const p = photoAt(tl, b)
      const want = expected(b)
      expect([...p.groupOf], `bloque ${b}`).toEqual(want.groupOf)
      expect(p.main, `bloque ${b}`).toBe(want.main)
      // el reloj interpolado entre dos marcas no se aparta del de la foto más que lo que se curva entre ellas
      for (const [g, ds] of want.clock)
        expect(Math.abs(p.clock.get(g)! - ds), `${b}/${g}`).toBeLessThan(80)
    }
  })

  it('las marcas cubren la vida entera de cada grupo: nacimiento, muerte y cada foto de km (§3.4)', () => {
    for (const [g, entry] of tl.groups.entries()) {
      const marks = clockMarksOf(tl, g).map(([b]) => b)
      expect(marks[0], entry.id).toBe(entry.bornB)
      if (entry.diedB !== null) expect(marks.at(-1), entry.id).toBe(entry.diedB)
      else expect(marks.at(-1), entry.id).toBe(photos.length - 1)
    }
  })
})

describe('I3 · las claves cuadran: cada una es la reducción de la anterior (§4.4)', () => {
  const { photos, riderIds } = toyStage()
  const { tl } = synthLine(photos, riderIds, OPTS)

  /** La línea sin fotos clave: photoAt reduce desde la salida, que es la mitad de I3 que se comprueba. */
  const withoutKeys: TimelineCore = { ...tl, keys: [] }

  it('hay fotos clave, y cada una (la primera desde la salida) es la reducción de los sucesos hasta ella', () => {
    expect(tl.keys.map((k) => k.b)).toEqual([0, 20, 40])
    for (const key of tl.keys) {
      const reduced = photoAt(withoutKeys, key.b)
      expect([...reduced.groupOf], `clave ${key.b}`).toEqual([...key.groupOf])
      expect(reduced.main, `clave ${key.b}`).toBe(key.main)
    }
  })

  it('reducir desde una clave o desde la salida da la misma foto en todos los bloques', () => {
    for (let b = 0; b < photos.length; b++) {
      const a = photoAt(tl, b)
      const z = photoAt(withoutKeys, b)
      expect([...a.groupOf], `bloque ${b}`).toEqual([...z.groupOf])
      expect(a.main, `bloque ${b}`).toBe(z.main)
      expect([...a.clock], `bloque ${b}`).toEqual([...z.clock])
    }
  })

  it('una clave de mentira se nota: photoAt la cree y no reduce desde la salida', () => {
    const forged: TimelineCore = {
      ...tl,
      keys: tl.keys.map((k) =>
        k.b === 20 ? { ...k, groupOf: Int16Array.from(k.groupOf).fill(0) } : k,
      ),
    }
    expect([...photoAt(forged, 20).groupOf]).not.toEqual([...photoAt(withoutKeys, 20).groupOf])
  })
})
