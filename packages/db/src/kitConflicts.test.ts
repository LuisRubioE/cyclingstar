import { writeFileSync } from 'node:fs'
import { KIT_CODES, type KitCode, canonicalKit } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  buildKitConflicts,
  kitAllowedCounts,
  kitConflictEntry,
  kitConflictsSource,
  kitContrastOk,
  kitGeometryHash,
} from './kitConflicts.js'
import { KIT_ALLOWED, KIT_CONFLICTS, KIT_GEOMETRY_HASH } from './kitConflicts.generated.js'

/**
 * LA TABLA DE CHOQUES, AL DÍA (E3, docs/visual.md §8.4 y §16.2; I-07; PR 16a). Generarla entera cuesta
 * de 1 a 2 minutos, así que en cada CI se mira la huella de la geometría y se recalculan 50 entradas de
 * una semilla fija; de noche (`CS_BANCOS=1`), la tabla entera. Si la huella no casa, se regenera:
 *
 *   KIT_CONFLICTS_WRITE=1 pnpm exec vitest run packages/db/src/kitConflicts.test.ts
 */

const WRITE = process.env.KIT_CONFLICTS_WRITE === '1'
const NIGHTLY = process.env.CS_BANCOS === '1'

/** 50 códigos de una semilla fija: mulberry32 sobre los 1.105, sin repetir. */
function sample(n: number, seed: number): KitCode[] {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const pool = [...KIT_CODES]
  const out: KitCode[] = []
  while (out.length < n) out.push(pool.splice(Math.floor(next() * pool.length), 1)[0]!)
  return out
}

describe.runIf(WRITE)('db: la tabla de choques, reescrita (KIT_CONFLICTS_WRITE=1)', () => {
  it('buildKitConflicts escribe kitConflicts.generated.ts', () => {
    const started = performance.now()
    const table = buildKitConflicts()
    writeFileSync(
      new URL('./kitConflicts.generated.ts', import.meta.url),
      kitConflictsSource(table),
    )
    const { allowed, distinct } = kitAllowedCounts(table.allowed)
    console.info(
      `kitConflicts: ${allowed} permitidos, ${distinct} distintos, en ${((performance.now() - started) / 1000).toFixed(1)} s`,
    )
  }, 600_000)
})

describe.skipIf(WRITE)('db: la tabla de choques (E3, §8.4)', () => {
  it('se hizo con la geometría de hoy', () => {
    expect(KIT_GEOMETRY_HASH, 'KIT_CONFLICTS_WRITE=1 y regenerar').toBe(kitGeometryHash())
  })

  it('una entrada por código; el contraste, el de colorMath; los permitidos, los que no reserva nadie', () => {
    expect(Object.keys(KIT_CONFLICTS)).toEqual([...KIT_CODES])
    let contrast = 0
    for (const code of KIT_CODES) {
      const e = KIT_CONFLICTS[code]
      expect(e.contrastOk, code).toBe(kitContrastOk(code))
      if (e.contrastOk) contrast++
      else expect(e.reserved, code).toBeNull()
    }
    expect(contrast).toBe(547)
    expect(KIT_ALLOWED).toEqual(
      KIT_CODES.filter((c) => KIT_CONFLICTS[c].contrastOk && KIT_CONFLICTS[c].reserved === null),
    )
  })

  it('los vecinos son de los permitidos y se corresponden: si a está cerca de b, b lo está de a', () => {
    const allowed = new Set(KIT_ALLOWED)
    for (const code of KIT_CODES) {
      for (const [other, vision] of KIT_CONFLICTS[code].near) {
        expect(allowed.has(other), `${code} → ${other}`).toBe(true)
        if (allowed.has(code))
          expect(KIT_CONFLICTS[other].near, `${other} → ${code}`).toContainEqual([code, vision])
      }
    }
  })

  it('las cuentas de §8.1: los permitidos y los distintos, contando cada halves y su espejo como uno', () => {
    const { allowed, distinct } = kitAllowedCounts(KIT_ALLOWED)
    console.info(`kitConflicts: ${allowed} permitidos, ${distinct} distintos`)
    expect(distinct).toBe(new Set(KIT_ALLOWED.map(canonicalKit)).size)
    // hay sitio de sobra para los 219 equipos del mundo
    expect(distinct).toBeGreaterThan(219)
  })

  it('50 entradas de una semilla fija, calculadas de nuevo, son las de la tabla', () => {
    for (const code of sample(50, 16)) {
      expect(kitConflictEntry(code, KIT_ALLOWED), code).toEqual(KIT_CONFLICTS[code])
    }
  }, 120_000)

  it.runIf(NIGHTLY)(
    'de noche: la tabla entera, regenerada, es la misma',
    () => {
      const table = buildKitConflicts()
      expect(table.allowed).toEqual(KIT_ALLOWED)
      expect(table.conflicts).toEqual(KIT_CONFLICTS)
    },
    600_000,
  )
})
