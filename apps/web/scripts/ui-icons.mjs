#!/usr/bin/env node
/**
 * LOS ICONOS DE LA INTERFAZ (E3, docs/visual.md §3.7 y §3.8; PR 9a, decisión 3-e). Los 26 son propios: sus
 * fuentes son `apps/web/scripts/icons/<nombre>.svg`, escritas a mano con las reglas de §3.7, y esto las
 * valida y escribe:
 *
 * - `src/components/ui/icons.tsx`, lo de dentro de cada icono en JSX, que pinta `Icon` (§4.6), con la
 *   huella de las fuentes;
 * - `docs/diseno/e3-visual/hojas/iconos.png`, la hoja de contactos que revisa una persona en el PR: los 26
 *   con su nombre, a 16, 20 y 24 px, sobre claro, en el ámbito oscuro y, cuando `tokens.json` lo tenga
 *   (PR 23), en el modo oscuro.
 *
 * LAS REGLAS, que paran con el nombre del icono y la regla que rompe. Una fuente por nombre de `IconName`
 * (`ui/types.ts`), ni una más. La raíz, exactamente la de `Icon`: `xmlns`, `viewBox="0 0 24 24"`,
 * `fill="none"`, `stroke="currentColor"`, `stroke-width="2"` y los extremos y las uniones redondeados.
 * Dentro, solo `path`, `circle`, `rect`, `line`, `polyline`, `polygon` y `ellipse`, cerrados en sí mismos
 * y sin `<text>`, con su geometría y, como mucho, `fill` y `stroke`: ningún `id`, `style`, `transform` ni
 * otro grosor. La pintura es `currentColor` o `none`, y `fill` solo va en `star-full` y `star-half`. Los
 * trazados van en comandos absolutos (mayúsculas), así que cada número de la geometría es una coordenada,
 * un radio, o el giro o una bandera de un arco, y todos caen entre 0 y 24. Al escribir, Chromium mide
 * además la caja de cada icono (`getBBox`): el trazo, 1 u alrededor de la geometría, no se sale de los 24.
 *
 * LAS SILUETAS DE TONO (Ruso-001). `check`, `warning`, `error` e `info` son el mecanismo de «ningún estado va
 * solo en color» (§3.2), así que no pueden parecerse. Chromium los pinta a 16 × 16 px con densidad 1, en
 * negro sobre transparente, y un píxel cuenta como pintado si su alfa pasa de 127 (más de media cobertura).
 * El solape de dos iconos A y B es |A∩B| / min(|A|, |B|): la parte del menos pintado que cae sobre el otro,
 * para que uno pequeño metido dentro de otro grande no pase por distinto. Si un par pasa del 75 %, para.
 *
 * `icons.tsx` sale con el formato de Prettier del repositorio, así que `pnpm format` no lo toca, y lleva el
 * sha256 de las fuentes: por cada nombre, en orden alfabético, `\n<nombre>\n` y los bytes de su `.svg`.
 * `src/components/ui/generados.test.ts` corre `--check`, que no necesita Chromium:
 *
 *   node apps/web/scripts/ui-icons.mjs           valida, mide, escribe icons.tsx y pinta la hoja
 *   node apps/web/scripts/ui-icons.mjs --check   sale con 1 si icons.tsx no es el de las fuentes de hoy
 */

/* global document, Image -- el medidor corre dentro de Chromium (page.evaluate) */

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { format, resolveConfig } from 'prettier'

const WEB = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const RAIZ = resolve(WEB, '..', '..')
const FUENTES = join(WEB, 'scripts', 'icons')
const TYPES = join(WEB, 'src', 'components', 'ui', 'types.ts')
const OUT = join(WEB, 'src', 'components', 'ui', 'icons.tsx')
const HOJA = join(RAIZ, 'docs', 'diseno', 'e3-visual', 'hojas', 'iconos.png')
const TOKENS = join(RAIZ, 'packages', 'shared', 'tokens.json')
const rel = (ruta) => relative(RAIZ, ruta)

/** La raíz de cada fuente, tal cual: la misma que pone `Icon` alrededor de `ICONS[name]`. */
const RAIZ_SVG = new Map([
  ['xmlns', 'http://www.w3.org/2000/svg'],
  ['viewBox', '0 0 24 24'],
  ['fill', 'none'],
  ['stroke', 'currentColor'],
  ['stroke-width', '2'],
  ['stroke-linecap', 'round'],
  ['stroke-linejoin', 'round'],
])

/** Lo que puede ir dentro, con la geometría que lleva cada uno; `rect` puede llevar además `rx` y `ry`. */
const GEOMETRIA = {
  path: ['d'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  rect: ['x', 'y', 'width', 'height'],
  line: ['x1', 'y1', 'x2', 'y2'],
  polyline: ['points'],
  polygon: ['points'],
}
const OPCIONAL = { rect: ['rx', 'ry'] }
const PINTURA = ['fill', 'stroke']
const COLORES = new Set(['currentColor', 'none'])
/** Los únicos con relleno (§3.7): la estrella llena y la media. */
const CON_RELLENO = new Set(['star-full', 'star-half'])

/** Los cuatro de tono (§3.2), su tamaño de medida, el alfa que cuenta como pintado y el tope del solape. */
const TONOS = ['check', 'warning', 'error', 'info']
const LADO = 16
const UMBRAL = 127
const TOPE = 0.75

/** La hoja: los tamaños de §3.7, las columnas y la densidad de la captura. */
const TAMANOS = [16, 20, 24]
const COLUMNAS = 7
const DENSIDAD = 2

const ETIQUETA = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[\w:-]+\s*=\s*"[^"]*")*)\s*(\/?)>/g
const NUMERO = /-?(?:\d+(?:\.\d*)?|\.\d+)/g
const UN_NUMERO = /^\s*-?(?:\d+(?:\.\d*)?|\.\d+)\s*$/

/** Lo que no cumple, sin repetir: la etiqueta que cierra un `<g>` o el mismo número dos veces dan uno. */
const errores = new Set()
const falla = (nombre, regla) => errores.add(`icons/${nombre}.svg: ${regla}`)

/** Los nombres de `IconName`, en el orden de `types.ts`, que es el de §3.7 por uso: el de la hoja. */
function nombresDeIconName() {
  const m = /export type IconName =((?:\s*\|?\s*'[^']+')+)/.exec(readFileSync(TYPES, 'utf8'))
  if (m === null) throw new Error(`${rel(TYPES)} no tiene la unión IconName`)
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
}

/** Los atributos de una etiqueta, en su orden. */
function atributos(nombre, crudo) {
  const fuera = new Map()
  for (const [, clave, valor] of crudo.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) {
    if (fuera.has(clave)) falla(nombre, `repite el atributo ${clave}`)
    fuera.set(clave, valor)
  }
  return fuera
}

/** Los números de un valor de geometría, que han de caer en la rejilla. */
function enRejilla(nombre, el, clave, valor) {
  for (const [n] of valor.matchAll(NUMERO)) {
    const x = Number(n)
    if (!(x >= 0 && x <= 24))
      falla(nombre, `<${el}> ${clave}: ${n} se sale de la rejilla (de 0 a 24)`)
  }
}

/** La geometría de un hijo: el formato de cada atributo y sus números. */
function geometria(nombre, el, clave, valor) {
  if (clave === 'd') {
    if (/[mlhvcsqtaz]/.test(valor))
      falla(nombre, `<path> d usa comandos relativos: solo absolutos (M L H V C S Q T A Z)`)
    else if (!/^\s*M[MLHVCSQTAZ\d\s.,-]*$/.test(valor))
      falla(nombre, `<path> d no es un trazado de comandos absolutos que empieza por M`)
  } else if (clave === 'points') {
    const n = valor.match(NUMERO) ?? []
    if (!/^[\d\s.,-]+$/.test(valor) || n.length < 4 || n.length % 2 !== 0)
      falla(nombre, `<${el}> points no es una lista de pares de números`)
  } else if (!UN_NUMERO.test(valor)) {
    falla(nombre, `<${el}> ${clave}="${valor}" no es un número`)
  }
  enRejilla(nombre, el, clave, valor)
}

/** Un nombre de atributo de SVG en JSX: `stroke-width` es `strokeWidth`. */
const enJsx = (clave) => clave.replace(/-([a-z])/g, (_, letra) => letra.toUpperCase())

/** Una fuente, validada: sus hijos, con su marcado (para Chromium) y su JSX; o null si no se lee. */
function lee(nombre) {
  const bytes = readFileSync(join(FUENTES, `${nombre}.svg`))
  const texto = bytes.toString('utf8')
  if (/<text[\s>/]/.test(texto)) {
    falla(nombre, 'lleva <text>: ningún texto, la palabra va al lado del icono (§3.7)')
    return null
  }
  const etiquetas = []
  let fin = 0
  for (const m of texto.matchAll(ETIQUETA)) {
    const suelto = texto.slice(fin, m.index).trim()
    if (suelto !== '') falla(nombre, `lleva algo que no es una etiqueta: «${suelto.slice(0, 40)}»`)
    fin = m.index + m[0].length
    etiquetas.push({
      cierra: m[1] === '/',
      el: m[2],
      crudo: m[3],
      sola: m[4] === '/',
      marcado: m[0],
    })
  }
  const resto = texto.slice(fin).trim()
  if (resto !== '') falla(nombre, `lleva algo que no es una etiqueta: «${resto.slice(0, 40)}»`)

  const [raiz, ...dentro] = etiquetas
  const cierre = dentro.pop()
  if (raiz?.el !== 'svg' || raiz.cierra || raiz.sola || cierre?.el !== 'svg' || !cierre.cierra) {
    falla(nombre, 'no es un único <svg> con sus hijos dentro')
    return null
  }
  const attrsRaiz = atributos(nombre, raiz.crudo)
  for (const [clave, valor] of RAIZ_SVG)
    if (attrsRaiz.get(clave) !== valor)
      falla(
        nombre,
        `la raíz lleva ${clave}="${attrsRaiz.get(clave) ?? ''}" y ha de llevar ${clave}="${valor}"`,
      )
  for (const clave of attrsRaiz.keys())
    if (!RAIZ_SVG.has(clave)) falla(nombre, `la raíz lleva ${clave}, que no es de la raíz de §3.7`)

  const hijos = []
  for (const { cierra, el, crudo, sola, marcado } of dentro) {
    if (!Object.hasOwn(GEOMETRIA, el)) {
      falla(nombre, `<${el}> no es de la lista: ${Object.keys(GEOMETRIA).join(', ')}`)
      continue
    }
    if (cierra || !sola) {
      falla(nombre, `<${el}> ha de cerrarse en sí mismo (<${el} … />), sin nada dentro`)
      continue
    }
    const attrs = atributos(nombre, crudo)
    const admitidos = [...GEOMETRIA[el], ...(OPCIONAL[el] ?? []), ...PINTURA]
    for (const [clave, valor] of attrs) {
      if (!admitidos.includes(clave)) {
        falla(nombre, `<${el}> lleva ${clave}: solo geometría y pintura (${admitidos.join(', ')})`)
      } else if (PINTURA.includes(clave)) {
        if (!COLORES.has(valor))
          falla(nombre, `<${el}> pinta ${clave}="${valor}": solo currentColor o none`)
        if (clave === 'fill' && !CON_RELLENO.has(nombre))
          falla(nombre, `<${el}> lleva fill: el relleno solo va en star-full y star-half`)
      } else {
        geometria(nombre, el, clave, valor)
      }
    }
    for (const clave of GEOMETRIA[el])
      if (!attrs.has(clave)) falla(nombre, `<${el}> no lleva ${clave}`)
    const jsx = [...attrs].map(([k, v]) => `${enJsx(k)}="${v.trim().replace(/\s+/g, ' ')}"`)
    hijos.push({ marcado, jsx: `<${el} ${jsx.join(' ')} />` })
  }
  if (dentro.length === 0) falla(nombre, 'no dibuja nada')
  return { nombre, bytes, hijos, marcado: hijos.map((h) => h.marcado).join('') }
}

/** El texto de `icons.tsx`, ya con el formato de Prettier. */
async function iconsTsx(fuentes, huella) {
  const cuerpo = fuentes
    .map((f) => `  '${f.nombre}': <>${f.hijos.map((h) => h.jsx).join('')}</>,`)
    .join('\n')
  const texto = `/* GENERADO por apps/web/scripts/ui-icons.mjs (E3, docs/visual.md §3.7 y §3.8; PR 9a): no se edita a mano. */

import type { ReactElement } from 'react'
import type { IconName } from './types'

/** El sha256 de las fuentes, \`apps/web/scripts/icons/<nombre>.svg\`: \`\\n<nombre>\\n\` y sus bytes, en orden alfabético. */
export const ICONS_SHA256 = '${huella}'

/**
 * Lo de dentro de cada icono, sobre la rejilla de 24 u. El \`svg\` lo pone \`Icon\`: \`viewBox="0 0 24 24"\`,
 * \`fill="none"\`, \`stroke="currentColor"\`, \`strokeWidth={2}\` y los extremos y las uniones redondeados.
 */
export const ICONS: Readonly<Record<IconName, ReactElement>> = {
${cuerpo}
}
`
  const opciones = (await resolveConfig(OUT, { editorconfig: true })) ?? {}
  return format(texto, { ...opciones, filepath: OUT })
}

/** Un icono como SVG suelto, a un tamaño: el de la hoja y el que se mide. */
const svgDe = (marcado, lado) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${marcado}</svg>`

/** En Chromium: la caja de la geometría de cada icono y la máscara de cada tono a `lado` px. */
function medir({ marcados, tonos, lado, umbral }) {
  const cajas = {}
  for (const [nombre, marcado] of Object.entries(marcados)) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.innerHTML = marcado
    document.body.append(svg)
    const b = svg.getBBox()
    cajas[nombre] = [b.x, b.y, b.x + b.width, b.y + b.height]
    svg.remove()
  }
  return Promise.all(
    Object.entries(tonos).map(async ([nombre, base64]) => {
      const img = new Image()
      img.src = `data:image/svg+xml;base64,${base64}`
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = lado
      canvas.height = lado
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, lado, lado)
      const { data } = ctx.getImageData(0, 0, lado, lado)
      const mascara = []
      for (let i = 3; i < data.length; i += 4) mascara.push(data[i] > umbral ? 1 : 0)
      return [nombre, mascara]
    }),
  ).then((mascaras) => ({ cajas, mascaras: Object.fromEntries(mascaras) }))
}

/** El HTML de la hoja de contactos. */
function hojaHtml(porNombre, orden, tokens, solapes, huella) {
  const claro = tokens.light.color
  const superficies = [
    { titulo: 'Claro: ink sobre canvas', color: claro, fondo: claro.canvas },
    {
      titulo: "Ámbito oscuro ([data-surface='dark']): ink sobre surface",
      color: { ...claro, ...tokens.darkScope.color },
      fondo: tokens.darkScope.color.surface ?? claro.surface,
    },
  ]
  if (tokens.dark !== undefined) {
    const oscuro = { ...claro, ...tokens.dark.color }
    superficies.push({
      titulo: 'Modo oscuro: ink sobre canvas',
      color: oscuro,
      fondo: oscuro.canvas,
    })
  }
  const celda = (nombre) =>
    `<div class="celda"><div class="tamanos">${TAMANOS.map((t) => svgDe(porNombre.get(nombre).marcado, t)).join('')}</div><div class="nombre">${nombre}</div></div>`
  const paneles = superficies
    .map(
      (s) =>
        `<section style="--fondo:${s.fondo};--tinta:${s.color.ink};--rotulo:${s.color['ink-2']}"><h2>${s.titulo}</h2><div class="rejilla">${orden.map(celda).join('')}</div></section>`,
    )
    .join('')
  const medidas = solapes.map((s) => `${s.a} y ${s.b}, ${s.texto}`).join('; ')
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
* { box-sizing: border-box; margin: 0 }
body { background: ${claro.surface} }
#hoja { display: inline-block; padding: 20px; font-family: ${tokens.light.font.sans}; color: ${claro.ink}; background: ${claro.surface} }
h1 { font-size: 16px; line-height: 24px; font-weight: 600 }
p { font-size: 12px; line-height: 16px; color: ${claro['ink-2']}; max-width: ${COLUMNAS * 128}px }
section { margin-top: 16px; padding: 12px 16px 8px; border-radius: 8px; background: var(--fondo); color: var(--tinta) }
h2 { font-size: 13px; line-height: 20px; font-weight: 600; color: var(--rotulo) }
.rejilla { display: grid; grid-template-columns: repeat(${COLUMNAS}, 120px); column-gap: 8px }
.celda { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 0 8px }
.tamanos { display: flex; align-items: center; gap: 12px; height: 24px }
.nombre { font-size: 12px; line-height: 16px; color: var(--rotulo) }
</style></head><body><div id="hoja">
<h1>Los ${orden.length} iconos de la interfaz, a ${TAMANOS.join(', ').replace(/, (\d+)$/, ' y $1')} px (docs/visual.md §3.7)</h1>
<p>De apps/web/scripts/icons por apps/web/scripts/ui-icons.mjs; fuentes ${huella.slice(0, 12)}. Siluetas de tono a ${LADO} px, |A∩B| / min(|A|, |B|), con tope del ${TOPE * 100} %: ${medidas}.${tokens.dark === undefined ? ' Sin modo oscuro: llega con el PR 23.' : ''}</p>
${paneles}
</div></body></html>`
}

// LAS FUENTES
const orden = nombresDeIconName()
const nombres = [...orden].sort()
if (new Set(nombres).size !== nombres.length)
  throw new Error(`${rel(TYPES)}: IconName repite un nombre`)
const hay = readdirSync(FUENTES)
  .filter((f) => f.endsWith('.svg'))
  .map((f) => f.slice(0, -'.svg'.length))
for (const nombre of nombres)
  if (!hay.includes(nombre)) falla(nombre, `falta, y ${nombre} es de IconName`)
for (const nombre of hay)
  if (!nombres.includes(nombre)) falla(nombre, `sobra, ${nombre} no es de IconName (ui/types.ts)`)
const fuentes = nombres.filter((n) => hay.includes(n)).map(lee)
if (errores.size > 0) {
  console.error(`Las fuentes de los iconos no cumplen §3.7:\n  ${[...errores].join('\n  ')}`)
  process.exit(1)
}

const huella = createHash('sha256')
for (const f of fuentes) huella.update(`\n${f.nombre}\n`).update(f.bytes)
const sha256 = huella.digest('hex')
const esperado = await iconsTsx(fuentes, sha256)

if (process.argv.includes('--check')) {
  let actual = ''
  try {
    actual = readFileSync(OUT, 'utf8')
  } catch {
    // sin fichero, no está al día
  }
  if (actual !== esperado) {
    console.error(`${rel(OUT)} no está al día con sus fuentes: node apps/web/scripts/ui-icons.mjs`)
    process.exit(1)
  }
} else {
  const porNombre = new Map(fuentes.map((f) => [f.nombre, f]))
  const tokens = JSON.parse(readFileSync(TOKENS, 'utf8'))
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch()
  let png = null
  const solapes = []
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 })
    const medidas = await page.evaluate(medir, {
      marcados: Object.fromEntries(fuentes.map((f) => [f.nombre, f.marcado])),
      tonos: Object.fromEntries(
        TONOS.map((t) => [
          t,
          Buffer.from(svgDe(porNombre.get(t).marcado, LADO)).toString('base64'),
        ]),
      ),
      lado: LADO,
      umbral: UMBRAL,
    })

    // La caja: la geometría más 1 u de trazo, dentro de los 24.
    for (const [nombre, [x0, y0, x1, y1]] of Object.entries(medidas.cajas))
      if (x0 < 1 - 1e-6 || y0 < 1 - 1e-6 || x1 > 23 + 1e-6 || y1 > 23 + 1e-6)
        falla(
          nombre,
          `el trazo se sale de la caja de 24: la geometría va de (${x0.toFixed(2)}, ${y0.toFixed(2)}) a (${x1.toFixed(2)}, ${y1.toFixed(2)}) y, para que quepa su trazo, ha de quedar entre 1 y 23`,
        )

    // Las siluetas de tono, par a par.
    const pintados = (m) => m.reduce((s, v) => s + v, 0)
    for (const [i, a] of TONOS.entries())
      for (const b of TONOS.slice(i + 1)) {
        const [ma, mb] = [medidas.mascaras[a], medidas.mascaras[b]]
        const comun = ma.reduce((s, v, k) => s + (v & mb[k]), 0)
        const menor = Math.min(pintados(ma), pintados(mb))
        const solape = menor === 0 ? 1 : comun / menor
        solapes.push({ a, b, solape, texto: `${Math.round(solape * 100)} %`, comun, menor })
        if (solape > TOPE)
          falla(
            a,
            `${a} y ${b} comparten el ${Math.round(solape * 100)} % de sus píxeles pintados a ${LADO} px, y el tope es el ${TOPE * 100} % (§3.7, Ruso-001)`,
          )
      }
    console.log(
      `Las siluetas de tono a ${LADO} px (alfa > ${UMBRAL}; |A∩B| / min(|A|, |B|), tope ${TOPE * 100} %):`,
    )
    for (const t of TONOS)
      console.log(`  ${t.padEnd(8)} ${pintados(medidas.mascaras[t])} px pintados`)
    for (const s of solapes)
      console.log(
        `  ${`${s.a} y ${s.b}`.padEnd(18)} ${s.texto.padStart(5)}  (${s.comun} de ${s.menor})`,
      )

    // La hoja de contactos, si todo cumple.
    if (errores.size === 0) {
      if (tokens.dark === undefined)
        console.log(`${rel(TOKENS)} no tiene modo oscuro (llega con el PR 23): la hoja no lo pinta`)
      const hoja = await browser.newPage({ deviceScaleFactor: DENSIDAD })
      await hoja.setContent(hojaHtml(porNombre, orden, tokens, solapes, sha256))
      png = await hoja.locator('#hoja').screenshot()
    }
  } finally {
    await browser.close()
  }
  if (errores.size > 0 || png === null) {
    console.error(`Los iconos no cumplen §3.7:\n  ${[...errores].join('\n  ')}`)
    process.exit(1)
  }

  writeFileSync(OUT, esperado)
  mkdirSync(dirname(HOJA), { recursive: true })
  writeFileSync(HOJA, png)
  console.log(
    `${fuentes.length} iconos de ${rel(FUENTES)}: ${rel(OUT)}; ${rel(HOJA)}, ${(png.length / 1000).toFixed(0)} KB`,
  )
}
