#!/usr/bin/env node
/**
 * LOS TOKENS PARA LA APP (E3, docs/visual.md §12.3; PR 7, D-00p). La app que hará el dueño usará este
 * mismo sistema, y para que no copie valores a mano esto lee el `@theme` de `apps/web/src/index.css` y los
 * bloques que redefinen tokens, el ámbito oscuro (`[data-surface='dark']`, §3.3) y, desde el PR 23, el
 * modo oscuro (`:root[data-theme='dark']`), y escribe `packages/shared/tokens.json`, que el paquete exporta
 * como `@cyclingstar/shared/tokens.json` (12-b).
 *
 * Una clave por token, con el nombre sin el prefijo de su espacio (`--color-canvas` es `color.canvas`;
 * `--text-body--line-height`, `text.body--line-height`; el que es su espacio entero, como `--spacing`,
 * `spacing.DEFAULT`) y el valor tal como está en el CSS. Los heredados (`brand-*`), que borra el paso 22,
 * no van: la app no los usará. En `dark` y `darkScope`, solo lo que esos bloques redefinen.
 *
 * Lo lee también `tokens.test.ts`, que comprueba cada pareja del tema, y `generados.test.ts` falla si
 * `index.css` cambia y esto no se ha vuelto a correr:
 *
 *   node apps/web/scripts/tokens-json.mjs           escribe packages/shared/tokens.json
 *   node apps/web/scripts/tokens-json.mjs --check   sale con 1 si no está al día
 */

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CSS = join(WEB, 'src', 'index.css')
const OUT = join(WEB, '..', '..', 'packages', 'shared', 'tokens.json')

/** Los espacios de Tailwind 4 que usa el tema, los más largos antes: `--font-weight-` antes que `--font-`. */
const NAMESPACES = [
  'font-weight',
  'breakpoint',
  'container',
  'tracking',
  'leading',
  'animate',
  'spacing',
  'shadow',
  'radius',
  'color',
  'text',
  'font',
]

/** Las declaraciones `--nombre: valor` del primer bloque que abre con esa cabecera, o null si no está. */
export function declaraciones(css, cabecera) {
  const limpio = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const inicio = limpio.indexOf(`${cabecera} {`)
  if (inicio === -1) return null
  const fin = limpio.indexOf('}', inicio)
  const cuerpo = limpio.slice(inicio + cabecera.length + 2, fin)
  const fuera = new Map()
  for (const d of cuerpo.split(';')) {
    const m = /^\s*--([\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(d)
    if (m) fuera.set(m[1], m[2].replace(/\s+/g, ' '))
  }
  return fuera
}

/** Las declaraciones, por espacio: `{ color: { canvas: '#eef2f6' }, text: { body: '1rem' } }`. */
function porEspacio(decls) {
  const fuera = {}
  for (const [nombre, valor] of decls) {
    const ns = NAMESPACES.find((n) => nombre === n || nombre.startsWith(`${n}-`))
    if (ns === undefined) throw new Error(`--${nombre}: no es de ningún espacio del tema`)
    const clave = nombre === ns ? 'DEFAULT' : nombre.slice(ns.length + 1)
    if (ns === 'color' && clave.startsWith('brand-')) continue
    ;(fuera[ns] ??= {})[clave] = valor
  }
  return fuera
}

/** `tokens.json` de un `index.css`. */
export function tokensJson(css) {
  const tema = declaraciones(css, '@theme')
  const ambito = declaraciones(css, "[data-surface='dark']")
  if (tema === null || ambito === null)
    throw new Error('index.css no tiene @theme o el ámbito oscuro')
  const oscuro = declaraciones(css, ":root[data-theme='dark']")
  return {
    version: 1,
    source: 'apps/web/src/index.css',
    sha256: createHash('sha256').update(css).digest('hex'),
    light: porEspacio(tema),
    ...(oscuro === null ? {} : { dark: porEspacio(oscuro) }),
    darkScope: porEspacio(ambito),
  }
}

const texto = (json) => `${JSON.stringify(json, null, 2)}\n`

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const esperado = texto(tokensJson(readFileSync(CSS, 'utf8')))
  if (process.argv.includes('--check')) {
    let actual = ''
    try {
      actual = readFileSync(OUT, 'utf8')
    } catch {
      // sin fichero, no está al día
    }
    if (actual !== esperado) {
      console.error(
        'packages/shared/tokens.json no está al día: node apps/web/scripts/tokens-json.mjs',
      )
      process.exit(1)
    }
  } else {
    writeFileSync(OUT, esperado)
    console.log(`packages/shared/tokens.json, de ${CSS.slice(WEB.length + 1)}`)
  }
}
