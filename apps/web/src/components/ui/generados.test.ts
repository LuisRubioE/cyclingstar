import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { COUNTRIES } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { FLAG_CELLS, FLAG_SPRITE } from './flagSprite.generated'
import { ICONS } from './icons'
import type { IconName } from './types'

/**
 * LO GENERADO DE LA WEB, AL DÍA (E3, docs/visual.md §16.2; 16-e). Una sola prueba de huellas: cada
 * fichero generado lleva la de sus entradas y aquí se recalcula; lo que no tiene cabecera donde
 * escribirla (la copia de los SVG de las banderas y, desde el PR 20, `og-default.png`) la lleva en
 * `apps/web/scripts/huellas.json`. Si algo falla, se regenera:
 *
 *   node apps/web/scripts/flag-sprite.mjs    el sprite de las banderas y su copia de SVG (PR 6)
 *   node apps/web/scripts/tokens-json.mjs    packages/shared/tokens.json (PR 7)
 *   node apps/web/scripts/ui-icons.mjs       los iconos de la interfaz (PR 9a)
 *
 * El del sprite pinta con el Chromium de Playwright y no corre en el CI: aquí se mira que lo que está en
 * el repositorio es lo que escribió y que se hizo con lo de hoy, `flag-icons` y `COUNTRIES`.
 */

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const ASSETS = join(WEB, 'src', 'assets')
const FLAG_ICONS = join(WEB, 'node_modules', 'flag-icons')
const HUELLAS = JSON.parse(readFileSync(join(WEB, 'scripts', 'huellas.json'), 'utf8')) as Readonly<
  Record<string, string>
>
const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex')
const codes = COUNTRIES.map((c) => c.code).sort()
const fuente = (code: string) =>
  readFileSync(join(FLAG_ICONS, 'flags', '4x3', `${code.toLowerCase()}.svg`))

describe('el sprite de las banderas (generado)', () => {
  it('flags.webp es el que escribió el generador', () => {
    expect(sha256(readFileSync(join(ASSETS, 'flags.webp')))).toBe(FLAG_SPRITE.sha256)
  })

  it('se hizo con los SVG de flag-icons de hoy y los países de hoy, como lo hace el generador', () => {
    const version = (
      JSON.parse(readFileSync(join(FLAG_ICONS, 'package.json'), 'utf8')) as { version: string }
    ).version
    const { cols, width, height, margin, quality } = FLAG_SPRITE
    const hash = createHash('sha256').update(
      JSON.stringify({ flagIcons: version, cols, width, height, margin, quality, codes }),
    )
    for (const code of codes) hash.update(`\n${code}\n`).update(fuente(code))
    expect(hash.digest('hex'), 'node apps/web/scripts/flag-sprite.mjs').toBe(
      FLAG_SPRITE.sourceSha256,
    )
  })

  it('cada país del juego tiene su celda, y solo ellos, cada una en su sitio del sprite', () => {
    expect(Object.keys(FLAG_CELLS).sort()).toEqual(codes)
    const sitios = new Set<string>()
    for (const [col, row] of Object.values(FLAG_CELLS)) {
      expect(col).toBeGreaterThanOrEqual(0)
      expect(col).toBeLessThan(FLAG_SPRITE.cols)
      expect(row).toBeGreaterThanOrEqual(0)
      expect(row).toBeLessThan(FLAG_SPRITE.rows)
      sitios.add(`${col},${row}`)
    }
    expect(sitios.size).toBe(codes.length)
  })
})

describe('la copia de los SVG de las banderas (generada)', () => {
  it('src/assets/flags tiene un SVG por país del juego, y nada más', () => {
    expect(readdirSync(join(ASSETS, 'flags')).sort()).toEqual(
      codes.map((c) => `${c.toLowerCase()}.svg`),
    )
  })

  it('cada uno es el de flag-icons, sin tocar, y su huella es la de huellas.json', () => {
    const hash = createHash('sha256')
    for (const code of codes) {
      const copia = readFileSync(join(ASSETS, 'flags', `${code.toLowerCase()}.svg`))
      expect(sha256(copia), code).toBe(sha256(fuente(code)))
      hash.update(`\n${code}\n`).update(copia)
    }
    expect(hash.digest('hex')).toBe(HUELLAS['src/assets/flags'])
  })
})

describe('los tokens para la app (generado)', () => {
  it('packages/shared/tokens.json es el del index.css de hoy', () => {
    // sale con 1, y lanza, si no está al día
    expect(() =>
      execFileSync(process.execPath, [join(WEB, 'scripts', 'tokens-json.mjs'), '--check'], {
        stdio: 'pipe',
      }),
    ).not.toThrow()
  })
})

/**
 * Los 26 de §3.7, en el orden de su tabla. Con `satisfies`, tsc falla si a `IconName` le falta o le sobra
 * uno respecto a esta lista.
 */
// prettier-ignore
const ICON_NAMES = {
  home: true, rider: true, team: true, world: true, news: true, account: true,
  travel: true, race: true, check: true, warning: true, error: true, info: true,
  offline: true, retry: true, close: true, more: true, play: true, pause: true,
  'chevron-left': true, 'chevron-right': true, 'chevron-down': true,
  'star-full': true, 'star-half': true, 'star-empty': true, trend: true, share: true,
} satisfies Record<IconName, true>

describe('los iconos (generados)', () => {
  it('icons.tsx es el de las fuentes de scripts/icons de hoy, que cumplen §3.7', () => {
    // valida las fuentes y sale con 1, y lanza, si no cumplen o si icons.tsx no está al día
    expect(() =>
      execFileSync(process.execPath, [join(WEB, 'scripts', 'ui-icons.mjs'), '--check'], {
        stdio: 'pipe',
      }),
    ).not.toThrow()
  })

  it('ICONS tiene los 26 de §3.7, ni uno más', () => {
    expect(Object.keys(ICONS).sort()).toEqual(Object.keys(ICON_NAMES).sort())
    expect(Object.keys(ICONS)).toHaveLength(26)
  })
})
