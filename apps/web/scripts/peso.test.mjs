/**
 * LOS PRESUPUESTOS DE PESO (E3, docs/visual.md §12.2; PR 6, D-50). Lo que la web compilada hace bajar
 * antes de pintar, medido sobre `dist/` con el gzip de Node a nivel 9 (X-26), como lo comprime el
 * servidor. Corre con `node --test` tras `vite build`, en el trabajo `Build` del CI (16-b):
 *
 *   node --test apps/web/scripts/peso.test.mjs
 *
 * `PESO_DIST` mide otra carpeta compilada. Los KB son de 1.000 bytes, los del informe de Vite.
 *
 * - `CSS_BLOCKING_MAX_GZ`: la hoja que bloquea la primera pintura (las `<link rel="stylesheet">` de
 *   `index.html`). Las banderas de `flag-icons` eran el 91 %; desde el sprite, fuera.
 * - `ENTRY_JS_MAX_GZ`: el JS de arranque, el módulo de entrada y sus `modulepreload`.
 * - `FLAG_SPRITE_MAX`: el sprite de las banderas tal cual, que el WebP ya va comprimido.
 */

import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const KB = 1000
export const CSS_BLOCKING_MAX_GZ = 15 * KB
export const ENTRY_JS_MAX_GZ = 160 * KB
export const FLAG_SPRITE_MAX = 60 * KB

const DIST = resolve(
  process.env.PESO_DIST ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'dist'),
)
const html = readFileSync(join(DIST, 'index.html'), 'utf8')

/** Las rutas de `dist/` que pide una etiqueta de `index.html`, con su atributo. */
function pide(etiqueta, atributo, filtro) {
  const fuera = []
  for (const m of html.matchAll(new RegExp(`<${etiqueta}\\b[^>]*>`, 'g'))) {
    if (!filtro.test(m[0])) continue
    const ruta = new RegExp(`${atributo}="/?([^"]+)"`).exec(m[0])?.[1]
    if (ruta !== undefined) fuera.push(ruta)
  }
  return fuera
}

const gz = (ruta) => gzipSync(readFileSync(join(DIST, ruta)), { level: 9 }).length
const suma = (rutas) => rutas.reduce((total, ruta) => total + gz(ruta), 0)
const kb = (bytes) => `${(bytes / KB).toFixed(1)} KB`

test('la hoja que bloquea la primera pintura', () => {
  const hojas = pide('link', 'href', /rel="stylesheet"/)
  assert.ok(hojas.length > 0, 'index.html no enlaza ninguna hoja')
  const peso = suma(hojas)
  console.log(`la hoja que bloquea: ${kb(peso)} (${hojas.join(', ')})`)
  assert.ok(
    peso <= CSS_BLOCKING_MAX_GZ,
    `${kb(peso)} con gzip, y el tope es ${kb(CSS_BLOCKING_MAX_GZ)}`,
  )
})

test('el JS de arranque: la entrada y sus modulepreload', () => {
  const entrada = pide('script', 'src', /type="module"/)
  const precargas = pide('link', 'href', /rel="modulepreload"/)
  assert.equal(entrada.length, 1, 'index.html tiene que tener un módulo de entrada')
  const peso = suma([...entrada, ...precargas])
  const barril = precargas.find((ruta) => /\/request-[^/]+\.js$/.test(ruta))
  console.log(
    `el JS de arranque: ${kb(peso)} en ${entrada.length + precargas.length} ficheros` +
      (barril === undefined ? '' : `; el de request.js, ${kb(gz(barril))}`),
  )
  assert.ok(peso <= ENTRY_JS_MAX_GZ, `${kb(peso)} con gzip, y el tope es ${kb(ENTRY_JS_MAX_GZ)}`)
})

test('el sprite de las banderas', () => {
  const sprites = readdirSync(join(DIST, 'assets')).filter((f) => /^flags-[\w-]+\.webp$/.test(f))
  assert.equal(sprites.length, 1, 'dist/assets tiene que tener un sprite de banderas, y uno')
  const peso = readFileSync(join(DIST, 'assets', sprites[0])).length
  console.log(`el sprite: ${kb(peso)}`)
  assert.ok(peso <= FLAG_SPRITE_MAX, `${kb(peso)}, y el tope es ${kb(FLAG_SPRITE_MAX)}`)
})
