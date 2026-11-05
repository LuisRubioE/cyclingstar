import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * NADIE LEE LA SEMILLA DEL DIBUJO (E3, docs/visual.md §8.9 y §17.19; PR 19e). `teams.jersey_style_seed`, de la
 * 0050, guardaba la semilla que eligió un mánager antes de los maillots; desde el 17b se dibuja el maillot, y
 * desde el 19e nada la lee ni la escribe, ni siquiera el esquema de drizzle, que nombra todas sus columnas en
 * un `insert` y en un `select()` sin campos: la borra la `0053` del 19f. La web aplica las migraciones al
 * arrancar mientras el servicio viejo sigue sirviendo, y el tick se despliega aparte, así que el borrado solo
 * es seguro con un despliegue en medio en que ya nadie la nombra. Este barrido lo comprueba en el código que
 * corre; los tests y las migraciones quedan fuera.
 */

const ROOT = fileURLToPath(new URL('../../..', import.meta.url))
const DIRS = [
  'apps/api/src',
  'apps/web/src',
  'apps/web/e2e',
  'packages/db/src',
  'packages/shared/src',
  'packages/engine/src',
  'scripts',
]
const NAMES = /jerseyStyleSeed|jersey_style_seed/

function* files(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue
    const path = join(dir, e.name)
    if (e.isDirectory()) yield* files(path)
    else if (/\.(ts|tsx|mjs|js)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) yield path
  }
}

describe('db: nadie lee teams.jersey_style_seed (§8.9; 19e)', () => {
  it('ningún fichero que corre la nombra, tampoco schema.ts', () => {
    const readers = DIRS.flatMap((d) => [...files(join(ROOT, d))])
      .map((f) => relative(ROOT, f))
      .filter((f) => NAMES.test(readFileSync(join(ROOT, f), 'utf8')))
    expect(readers).toEqual([])
  })

  it('el barrido ve lo que tiene que ver: la migración que la creó la nombra, y recorre la base entera', () => {
    expect(
      NAMES.test(
        readFileSync(join(ROOT, 'packages/db/drizzle/0050_semilla_del_dibujo.sql'), 'utf8'),
      ),
    ).toBe(true)
    expect([...files(join(ROOT, 'packages/db/src'))].map((f) => relative(ROOT, f))).toContain(
      'packages/db/src/schema.ts',
    )
  })
})
