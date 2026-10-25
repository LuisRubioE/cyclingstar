import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { COUNTRIES } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { FLAG_CELLS, FLAG_SPRITE } from './components/ui/flagSprite.generated'

/**
 * LO GENERADO, AL DÍA (E3, docs/visual.md §12.2; PR 6, D-49). El sprite de las banderas y la copia de
 * sus SVG salen de `apps/web/scripts/flag-sprite.mjs`, que pinta con el Chromium de Playwright y no
 * corre en el CI: aquí se mira que lo que está en el repositorio es lo que el generador escribió y que
 * se hizo con lo de hoy, `flag-icons` y `COUNTRIES`. Si falla, se regenera:
 *
 *   node apps/web/scripts/flag-sprite.mjs
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ASSETS = join(HERE, 'assets')
const FLAG_ICONS = join(HERE, '..', 'node_modules', 'flag-icons')
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

  it('cada uno es el de flag-icons, sin tocar, y su huella es la apuntada', () => {
    const hash = createHash('sha256')
    for (const code of codes) {
      const copia = readFileSync(join(ASSETS, 'flags', `${code.toLowerCase()}.svg`))
      expect(sha256(copia), code).toBe(sha256(fuente(code)))
      hash.update(`\n${code}\n`).update(copia)
    }
    expect(hash.digest('hex')).toBe(FLAG_SPRITE.svgSha256)
  })
})
