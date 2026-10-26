import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  LEGACY_JERSEY_COLORS,
  LEGACY_JERSEY_PATTERNS,
  type LegacyJerseyStyle,
  legacyJerseyStyle,
} from './legacyJersey.js'

/**
 * EL MAILLOT DE HOY, CONGELADO (E3, docs/visual.md §8.6 y §17.9; PR 9b). `legacyJersey.golden.json` es lo
 * que daba el `jerseyStyle` de la web (`apps/web/src/components/visuals.ts`, en `a71c673`) para las 219
 * semillas de la génesis, sacado de él antes de moverlo aquí: `packages/shared` no puede importar de la
 * web, así que la tabla es la única forma de comprobar que el aspecto de hoy no cambia. Las semillas son
 * las de `seedWorld` (`packages/db/src/world.ts`): `cyclingstar-2:team:<división>:<n>:jersey`, con 18
 * equipos WorldTour, 16 ProTeam y 185 continentales.
 */

interface Golden {
  readonly fuente: string
  readonly semillas: Readonly<Record<string, LegacyJerseyStyle>>
}

const golden = JSON.parse(
  readFileSync(new URL('./legacyJersey.golden.json', import.meta.url), 'utf8'),
) as Golden
const semillas = Object.keys(golden.semillas)

describe('legacyJerseyStyle, contra el de hoy', () => {
  it('las 219 semillas de la génesis, una a una', () => {
    expect(semillas).toHaveLength(219)
    for (const seed of semillas)
      expect(legacyJerseyStyle(seed), seed).toEqual(golden.semillas[seed])
  })

  it('las semillas son las de seedWorld: 18 WorldTour, 16 ProTeam y 185 continentales', () => {
    const por = (div: string) =>
      semillas.filter((s) => new RegExp(`^cyclingstar-2:team:${div}:\\d+:jersey$`).test(s)).length
    expect([por('WT'), por('PRS'), por('CON')]).toEqual([18, 16, 185])
  })

  it('la tabla pasa por los cinco patrones y los 14 colores', () => {
    const estilos = Object.values(golden.semillas)
    expect(new Set(estilos.map((s) => s.pattern))).toEqual(new Set(LEGACY_JERSEY_PATTERNS))
    expect(new Set(estilos.map((s) => s.base))).toEqual(new Set(LEGACY_JERSEY_COLORS))
  })

  it('el sorteo vuelve a tirar una sola vez: dos equipos de la génesis repiten color, como hoy', () => {
    expect(Object.values(golden.semillas).filter((s) => s.secondary === s.base)).toHaveLength(2)
  })

  it('el mismo objeto para la misma semilla (la barra de Watch lo pide cuatro veces por segundo)', () => {
    expect(legacyJerseyStyle('rq-team-3')).toBe(legacyJerseyStyle('rq-team-3'))
    expect(legacyJerseyStyle('rq-team-3')).not.toBe(legacyJerseyStyle('rq-team-4'))
  })
})

describe('legacyJersey, fuera del barril', () => {
  it('con su entrada en exports, como colorMath', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
      exports: Record<string, unknown>
    }
    expect(pkg.exports['./legacyJersey']).toEqual({
      types: './dist/legacyJersey.d.ts',
      default: './dist/legacyJersey.js',
    })
  })

  it('y no en index.ts', () => {
    expect(readFileSync(new URL('./index.ts', import.meta.url), 'utf8')).not.toMatch(/legacyJersey/)
  })
})
