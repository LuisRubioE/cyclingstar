/**
 * LA HOJA DE REVISIÓN DE LOS MAILLOTS DE CAMPEÓN (E3, docs/visual.md §9.5; D-00f, D-00m; PR 16a). La pide
 * `node apps/web/scripts/flag-sprite.mjs --hoja <datos.json> <hoja.html>`, con los datos que escribe
 * `KIT_HOJA=<datos.json> pnpm exec vitest run packages/db/src/champion.test.ts`, y la mira el dueño una
 * vez, antes del 17a, que es el que pinta los nacionales: el mundial, el continental y los 133
 * nacionales a 28 px sobre `surface` y sobre `navy-dark` y a 72 px con sus dos letras, sin estrella;
 * primero las banderas con texto, luego las gemelas y después el resto, cada una con su maillot de
 * equipo más cercano, su gemela más cercana y su distancia a los tres líderes en las cinco vistas, con un
 * selector de visión (Machado 2009 en RGB lineal, y los grises).
 *
 * Escribe una página para publicar como artefacto (sin `<html>` ni `<body>`, que pone quien la publica).
 * Las banderas, de `flag-icons`, una vez cada una como `<symbol>`; el color de las dos letras, el de
 * `docs/diseno/e3-visual/medidas/medir-nacional2.json` (el de más contraste con el campo bajo la caja).
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  CHAMPION_RAINBOW,
  CHAMPION_SILVER,
  CHAMPION_STAR_EDGE,
  COLLAR,
  COUNTRIES,
  KIT_COLORS,
  KIT_FIGURE_PATHS,
  LOGO_STAR,
  NATIONAL_CODE,
  NATIONAL_FLAG_BOX,
  TORSO,
  WORLD_STAR,
  parseKit,
  starTransform,
} from '@cyclingstar/shared'
import { MACHADO_2009 } from '@cyclingstar/shared/colorMath'

const NAVY_DARK = '#0b2740'
const WHITE = '#ffffff'
/** Las banderas con texto, que van primero (§9.5). */
const WITH_TEXT = ['BR', 'SA']
const VIEW_NAMES = {
  normal: 'Normal',
  protan: 'Protanopía',
  deutan: 'Deuteranopía',
  tritan: 'Tritanopía',
  gray: 'Grises',
}
const LEADER_NAMES = { gc: 'Amarillo', points: 'Verde', kom: 'Azul' }

const es = (x) => x.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const escape = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  )

/** La bandera de `flag-icons` como `<symbol>`, con los ids con prefijo para que no choquen. */
function flagSymbol(flagIcons, code) {
  const source = readFileSync(join(flagIcons, 'flags', '4x3', `${code.toLowerCase()}.svg`), 'utf8')
  const m = /<svg([^>]*)>([\s\S]*)<\/svg>/.exec(source)
  const viewBox = /viewBox="([^"]+)"/.exec(m[1])[1]
  const prefix = `f-${code.toLowerCase()}-`
  const inner = m[2]
    .replace(/id="([^"]+)"/g, (_, id) => `id="${prefix}${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}${id})`)
    .replace(/href="#([^"]+)"/g, (_, id) => `href="#${prefix}${id}"`)
    .replace(/>\s+</g, '><')
    .trim()
  return `<symbol id="flag-${code.toLowerCase()}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid slice">${inner}</symbol>`
}

/** El filete de los líderes y los campeones: el oscuro sobre claro y el claro sobre `navy-dark`. */
const leaderEdge = (dark) => (dark ? 'rgb(255 255 255 / 0.6)' : 'rgb(0 0 0 / 0.35)')
const kitEdge = (dark) => (dark ? 'rgb(255 255 255 / 0.6)' : 'rgb(0 0 0 / 0.3)')

function svg(px, label, body) {
  return `<svg class="kit" width="${px}" height="${px}" viewBox="0 0 48 48" role="img" aria-label="${escape(label)}">${body}</svg>`
}

/** El nacional: la bandera recortada por el torso, el filete, el cuello y, desde 72 px, sus letras. */
function national(code, px, dark, letters) {
  const box = NATIONAL_FLAG_BOX
  let body =
    `<path d="${TORSO}" fill="${WHITE}"/>` +
    `<g clip-path="url(#torso)"><use href="#flag-${code.toLowerCase()}" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}"/></g>` +
    `<path d="${TORSO}" fill="none" stroke="${leaderEdge(dark)}" stroke-width="1.5"/>` +
    `<path d="${COLLAR}" fill="${WHITE}" fill-opacity="0.85"/>`
  if (letters && px >= NATIONAL_CODE.minPx) {
    const fill = letters
    const edge = fill === WHITE ? NAVY_DARK : WHITE
    body +=
      `<text x="${NATIONAL_CODE.x}" y="${NATIONAL_CODE.y}" text-anchor="middle" font-size="${NATIONAL_CODE.sizeU}" font-weight="700" ` +
      `letter-spacing="0.32" fill="${fill}" stroke="${edge}" stroke-width="${NATIONAL_CODE.edgeU}" paint-order="stroke" stroke-linejoin="round">${code}</text>`
  }
  return svg(px, `Champion of ${COUNTRY_NAME.get(code) ?? code}`, body)
}

/** El mundial y el continental: blancos, con la estrella del logotipo de 18 u. */
function champion(id, px, dark) {
  const fill = id === 'champion:world' ? 'url(#rainbow)' : CHAMPION_SILVER
  const s = WORLD_STAR.widthU / 22
  const body =
    `<path d="${TORSO}" fill="${WHITE}"/>` +
    `<path d="${TORSO}" fill="none" stroke="${leaderEdge(dark)}" stroke-width="1.5"/>` +
    `<path d="${COLLAR}" fill="${WHITE}" fill-opacity="0.85"/>` +
    `<path d="${LOGO_STAR}" transform="${starTransform(WORLD_STAR.widthU, WORLD_STAR.cx, WORLD_STAR.cy)}" fill="${fill}" ` +
    `stroke="${CHAMPION_STAR_EDGE}" stroke-width="${WORLD_STAR.edgeU / s}" stroke-linejoin="round"/>`
  return svg(px, id === 'champion:world' ? 'World champion' : 'Continental champion', body)
}

/** Un maillot de equipo del vocabulario. */
function teamKit(code, px, dark = false) {
  const kit = parseKit(code)
  let body = `<path d="${TORSO}" fill="${KIT_COLORS[kit.base]}"/>`
  if (kit.figure !== 'plain')
    body += `<g clip-path="url(#torso)"><path d="${KIT_FIGURE_PATHS[kit.figure]}" fill="${KIT_COLORS[kit.secondary]}"/></g>`
  body +=
    `<path d="${TORSO}" fill="none" stroke="${kitEdge(dark)}" stroke-width="1"/>` +
    `<path d="${COLLAR}" fill="${WHITE}" fill-opacity="0.85"/>`
  return svg(px, code, body)
}

const flag21 = (code) =>
  `<svg class="flag" width="21" height="16" viewBox="0 0 21 16" role="img" aria-label="${escape(COUNTRY_NAME.get(code) ?? code)}"><use href="#flag-${code.toLowerCase()}" width="21" height="16"/></svg>`

/** Las cinco vistas frente a los tres líderes, con lo que baja de 10 marcado. */
function leadersTable(leaders) {
  const head = Object.values(VIEW_NAMES)
    .map((v) => `<th scope="col">${v.slice(0, 4)}.</th>`)
    .join('')
  const rows = Object.entries(LEADER_NAMES)
    .map(([key, name]) => {
      const cells = Object.keys(VIEW_NAMES)
        .map((v) => {
          const d = leaders[key][v]
          return `<td class="${d < 10 ? 'low' : ''}">${es(d)}</td>`
        })
        .join('')
      return `<tr><th scope="row">${name}</th>${cells}</tr>`
    })
    .join('')
  return `<table class="leaders"><thead><tr><th scope="col">Líder</th>${head}</tr></thead><tbody>${rows}</tbody></table>`
}

const signalName = (id) => {
  if (id === null) return null
  if (id.startsWith('leader:')) return `el líder ${LEADER_NAMES[id.slice(7)].toLowerCase()}`
  if (id === 'champion:world') return 'el mundial'
  if (id === 'champion:continental') return 'el continental'
  return `el nacional de ${COUNTRY_NAME.get(id.slice(9)) ?? id.slice(9)}`
}

function samples(draw) {
  return (
    `<div class="samples">` +
    `<figure><div class="swatch light">${draw(28, false)}</div><figcaption>28 · surface</figcaption></figure>` +
    `<figure><div class="swatch dark">${draw(28, true)}</div><figcaption>28 · navy-dark</figcaption></figure>` +
    `<figure><div class="swatch light big">${draw(72, false)}</div><figcaption>72</figcaption></figure>` +
    `</div>`
  )
}

function nationalCard(n, letters) {
  const reserved = n.nearestKit.reservedBy
  const own = reserved === `champion:${n.code}`
  const kitNote =
    reserved === null
      ? 'permitido'
      : own
        ? 'reservado por este nacional (D-00h)'
        : `reservado por ${escape(signalName(reserved))}`
  return (
    `<article class="card" id="n-${n.code.toLowerCase()}">` +
    `<h3>${flag21(n.code)}<span class="code">${n.code}</span> Champion of ${escape(n.name)}</h3>` +
    samples((px, dark) => national(n.code, px, dark, px >= NATIONAL_CODE.minPx ? letters : null)) +
    `<dl>` +
    `<dt>El maillot de equipo más cercano</dt><dd class="row"><span class="swatch light">${teamKit(n.nearestKit.code, 28)}</span>` +
    `<span><code>${n.nearestKit.code}</code>, a ${es(n.nearestKit.d)} (${VIEW_NAMES[n.nearestKit.vision].toLowerCase()}); ${kitNote}</span></dd>` +
    `<dt>Su gemela más cercana</dt><dd class="row">${flag21(n.twin.code)}<span>${escape(COUNTRY_NAME.get(n.twin.code) ?? n.twin.code)}, a ${es(n.twin.d)}${n.twin.d < 10 ? ' <strong class="low">por debajo de 10</strong>' : ''}</span></dd>` +
    `</dl>` +
    leadersTable(n.leaders) +
    `</article>`
  )
}

function championCard(c) {
  const title = c.id === 'champion:world' ? 'World champion' : 'Continental champion'
  const note = c.id === 'champion:world' ? 'lo correrá E12' : 'la plata, provisional hasta E12'
  return (
    `<article class="card">` +
    `<h3>${title}</h3><p class="note">${note}</p>` +
    samples((px, dark) => champion(c.id, px, dark)) +
    `<dl><dt>El maillot permitido más cercano</dt><dd class="row"><span class="swatch light">${teamKit(c.nearestKit.code, 28)}</span>` +
    `<span><code>${c.nearestKit.code}</code>, a ${es(c.nearestKit.d)} (${VIEW_NAMES[c.nearestKit.vision].toLowerCase()})</span></dd></dl>` +
    leadersTable(c.leaders) +
    `</article>`
  )
}

/** Las matrices del selector de visión: Machado 2009 en RGB lineal, y la luminancia de Rec. 709. */
function visionFilters() {
  const matrix = (m) => m.map((row) => `${row.join(' ')} 0 0`).join(' ') + ' 0 0 0 1 0'
  const gray = [
    [0.2126, 0.7152, 0.0722],
    [0.2126, 0.7152, 0.0722],
    [0.2126, 0.7152, 0.0722],
  ]
  return Object.entries({ ...MACHADO_2009, gray })
    .map(
      ([v, m]) =>
        `<filter id="v-${v}" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="${matrix(m)}"/></filter>`,
    )
    .join('')
}

let COUNTRY_NAME = new Map()

/** Escribe la hoja: `flagIcons`, la carpeta de `flag-icons`; `repo`, la raíz del repositorio. */
export function writeSheet(dataPath, outPath, { flagIcons, repo }) {
  if (!dataPath || !outPath) throw new Error('uso: flag-sprite.mjs --hoja <datos.json> <hoja.html>')
  COUNTRY_NAME = new Map(COUNTRIES.map((c) => [c.code, c.name]))
  const data = JSON.parse(readFileSync(dataPath, 'utf8'))
  const letters = JSON.parse(
    readFileSync(join(repo, 'docs/diseno/e3-visual/medidas/medir-nacional2.json'), 'utf8'),
  ).paises
  const letterOf = (code) => letters[code]?.letras?.relleno ?? WHITE
  const codes = data.nationals.map((n) => n.code)
  const byCode = new Map(data.nationals.map((n) => [n.code, n]))
  const twinned = data.nationals
    .filter((n) => n.twin.d < 10 && !WITH_TEXT.includes(n.code))
    .sort((a, b) => a.twin.d - b.twin.d || a.code.localeCompare(b.code))
  const rest = data.nationals
    .filter((n) => n.twin.d >= 10 && !WITH_TEXT.includes(n.code))
    .sort((a, b) => a.code.localeCompare(b.code))
  const reservedKits = data.reservedByNationals ?? []
  const reservedCountries = new Set(reservedKits.map(([, cc]) => cc))
  const underLeaders = data.nationals.filter((n) =>
    Object.values(n.leaders).some((l) =>
      ['normal', 'protan', 'deutan', 'tritan'].some((v) => l[v] < 10),
    ),
  )
  const pairs = data.twins
    .map(
      ([a, b, d]) =>
        `<li><span class="swatch light">${national(a, 28, false, null)}</span><span class="swatch light">${national(b, 28, false, null)}</span>` +
        `<span><a href="#n-${a.toLowerCase()}">${a}</a> y <a href="#n-${b.toLowerCase()}">${b}</a>, a <strong>${es(d)}</strong></span></li>`,
    )
    .join('')
  const html = `<title>Maillots de campeón</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
/* Una hoja de trabajo, no un cartel: los tokens del juego (apps/web/src/index.css) y su letra del
   sistema; una cabecera con el selector de visión y, debajo, las fichas en rejilla. */
:root {
  --canvas: #eef2f6; --surface: #ffffff; --surface-2: #f5f7fa; --line: #d8dee6; --line-strong: #7b8794;
  --ink: #10202f; --ink-2: #435266; --ink-3: #566579; --accent: #0b6e8a; --warn: #8f4e00; --warn-bg: #fff3d6;
  --navy-dark: #0b2740; --focus: #1d4ed8;
  --font: system-ui, -apple-system, "Segoe UI", Roboto, "DejaVu Sans", sans-serif;
  --mono: ui-monospace, "SFMono-Regular", Menlo, "DejaVu Sans Mono", monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --canvas: #08192a; --surface: #0b2740; --surface-2: #123a5c; --line: #2c5274; --line-strong: #7f97b0;
  --ink: #ffffff; --ink-2: rgb(255 255 255 / 0.78); --ink-3: rgb(255 255 255 / 0.7); --accent: #35bdda;
  --warn: #ffd166; --warn-bg: #3a2c05; --focus: #ffd166; color-scheme: dark } }
:root[data-theme="dark"] {
  --canvas: #08192a; --surface: #0b2740; --surface-2: #123a5c; --line: #2c5274; --line-strong: #7f97b0;
  --ink: #ffffff; --ink-2: rgb(255 255 255 / 0.78); --ink-3: rgb(255 255 255 / 0.7); --accent: #35bdda;
  --warn: #ffd166; --warn-bg: #3a2c05; --focus: #ffd166; color-scheme: dark }
body { background: var(--canvas); color: var(--ink); font-family: var(--font); font-size: 15px; line-height: 1.5;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 0 48px; }
body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--canvas); }
header.top { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: var(--canvas); padding-block: 8px;
  border-bottom: 1px solid var(--line); display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; justify-content: space-between; }
header.top h1 { font-size: 18px; margin: 0; text-wrap: balance; }
.views { display: flex; flex-wrap: wrap; gap: 4px; }
.views label { border: 1px solid var(--line-strong); border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 13px; background: var(--surface); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.note { margin: -6px 0 0; font-size: 13px; color: var(--ink-3); }
.views input { position: absolute; opacity: 0; pointer-events: none; }
.views input:checked + span { font-weight: 700; color: var(--accent); }
.views label:has(input:checked) { border-color: var(--accent); }
.views label:has(input:focus-visible) { outline: 2px solid var(--focus); outline-offset: 2px; }
.intro { max-width: 68ch; }
.intro p { margin: 8px 0; }
.facts { display: flex; flex-wrap: wrap; gap: 8px; padding: 0; margin: 12px 0; list-style: none; }
.facts li { background: var(--surface); border: 1px solid var(--line); border-radius: 6px; padding: 6px 10px; font-variant-numeric: tabular-nums; }
h2 { font-size: 18px; margin: 32px 0 4px; text-wrap: balance; }
h2 + p { margin: 0 0 12px; color: var(--ink-2); max-width: 68ch; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 12px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 12px; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.card h3 { font-size: 15px; margin: 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.code { font-family: var(--mono); font-size: 13px; color: var(--ink-2); }
.muted { color: var(--ink-3); font-weight: 400; }
.samples { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; }
.samples figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.samples figcaption { font-size: 12px; color: var(--ink-3); }
.swatch { display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; flex: none; }
.swatch.light { background: #ffffff; border: 1px solid #d8dee6; padding: 6px; }
.swatch.dark { background: #0b2740; border: 1px solid #0b2740; padding: 6px; }
.swatch.big { padding: 4px; }
svg.kit, svg.flag { display: block; }
dl { margin: 0; display: grid; gap: 4px; }
dt { font-size: 12px; color: var(--ink-3); letter-spacing: 0.02em; }
dd { margin: 0; }
dd.row { display: flex; gap: 8px; align-items: center; min-width: 0; }
dd.row > span:last-child { min-width: 0; }
code { font-family: var(--mono); font-size: 13px; }
.low { color: var(--warn); background: var(--warn-bg); border-radius: 4px; padding: 0 4px; }
table.leaders { border-collapse: collapse; font-size: 13px; font-variant-numeric: tabular-nums; width: 100%; }
table.leaders th, table.leaders td { padding: 2px 4px; text-align: right; border-bottom: 1px solid var(--line); }
table.leaders th:first-child { text-align: left; }
table.leaders thead th { color: var(--ink-3); font-weight: 600; }
ol.pairs { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr)); gap: 6px; }
ol.pairs li { display: flex; align-items: center; gap: 6px; background: var(--surface); border: 1px solid var(--line); border-radius: 6px; padding: 4px 8px; font-variant-numeric: tabular-nums; }
a { color: var(--accent); }
main[data-vision="protan"] .swatch, main[data-vision="protan"] svg.flag { filter: url(#v-protan); }
main[data-vision="deutan"] .swatch, main[data-vision="deutan"] svg.flag { filter: url(#v-deutan); }
main[data-vision="tritan"] .swatch, main[data-vision="tritan"] svg.flag { filter: url(#v-tritan); }
main[data-vision="gray"] .swatch, main[data-vision="gray"] svg.flag { filter: url(#v-gray); }
</style>
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
<defs>
<clipPath id="torso"><path d="${TORSO}"/></clipPath>
<linearGradient id="rainbow" x1="0" y1="0" x2="1" y2="1">${CHAMPION_RAINBOW.map((c, i) => `<stop offset="${i / (CHAMPION_RAINBOW.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient>
${visionFilters()}
${codes.map((c) => flagSymbol(flagIcons, c)).join('\n')}
</defs>
</svg>
<main data-vision="normal">
<header class="top">
<h1>Maillots de campeón</h1>
<fieldset class="views" style="border:0;margin:0;padding:0">
<legend class="sr-only">Visión</legend>
${Object.entries(VIEW_NAMES)
  .map(
    ([v, name], i) =>
      `<label><input type="radio" name="vision" id="vision-${v}" value="${v}"${i === 0 ? ' checked' : ''}><span>${name}</span></label>`,
  )
  .join('')}
</fieldset>
</header>
<section class="intro">
<p>La hoja de revisión del PR 16a (D-00f): el mundial, el continental y los ${codes.length} nacionales, como los pintará el juego desde el PR 17a. El nacional viste su bandera entera, sin estrella (D-00m), y desde 72 px lleva las dos letras de su país; por debajo, la bandera junto al nombre y el texto dicen el resto.</p>
<p>Todo está medido a 28 px con la distancia dibujada del servidor (<code>kitDistance.ts</code>): la media de ΔE00 píxel a píxel, con Machado 2009 para las tres dicromacias. Por debajo de 10, dos maillots se confunden. Cada ficha dice el maillot de equipo más cercano y si la reserva de D-00h se lo quita a los equipos, su gemela más cercana y su distancia a los tres líderes. El selector de arriba pinta los maillots como los ve cada visión.</p>
<p><strong>Qué te pido:</strong> mírala una vez. Si quieres cambiar una bandera, dime cuál y por qué, y entra con su porqué antes del 17a. Si no dices nada, ninguna cambia.</p>
<ul class="facts">
<li>${codes.length + 2} maillots de campeón</li>
<li>${data.twins.length} parejas de nacionales a menos de 10</li>
<li>${reservedKits.length} maillots de equipo reservados por parecerse a ${reservedCountries.size} nacionales (D-00h)</li>
<li>${underLeaders.length} nacional${underLeaders.length === 1 ? '' : 'es'} a menos de 10 de un líder en alguna visión</li>
</ul>
</section>
<h2>El mundial y el continental</h2>
<p>Blancos, con la estrella del logotipo en arcoíris o en plata, y su filo navy-dark. Sin letras: no son de un país.</p>
<div class="grid">${data.champions.map(championCard).join('')}</div>
<h2>Las banderas con texto</h2>
<p>Brasil y Arabia Saudí llevan letras en la bandera; a 28 px no se leen, y desde 72 px se leen junto a las dos del código.</p>
<div class="grid">${WITH_TEXT.map((c) => nationalCard(byCode.get(c), letterOf(c))).join('')}</div>
<h2>Las gemelas</h2>
<p>Las ${data.twins.length} parejas de nacionales a menos de 10 en alguna de las cuatro visiones, de la más cercana a la menos. Ni una bandera ni un líder se cambian sin tu palabra: por debajo de 72 px las separan la bandera junto al nombre y el texto, y desde 72, sus letras.</p>
<ol class="pairs">${pairs}</ol>
<h2>Los nacionales con gemela</h2>
<p>Primero los que tienen la gemela más cercana.</p>
<div class="grid">${twinned.map((n) => nationalCard(n, letterOf(n.code))).join('')}</div>
<h2>El resto</h2>
<div class="grid">${rest.map((n) => nationalCard(n, letterOf(n.code))).join('')}</div>
</main>
<script>
for (const input of document.querySelectorAll('input[name="vision"]'))
  input.addEventListener('change', () => { document.querySelector('main').dataset.vision = input.value })
</script>
`
  writeFileSync(outPath, html)
  return { bytes: Buffer.byteLength(html), twins: data.twins.length, nationals: codes.length }
}
