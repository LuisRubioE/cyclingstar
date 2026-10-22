/* global process, console, document */
// Corrector L2: anchos de los textos de Scale5 con D-00n, y de nombres de equipo en la espalda, a 12 px.
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const fonts = ['Inter', 'DejaVu Sans', 'Liberation Sans']
const T = [
  ['Undertrained', 600],
  ['Undertrained', 700],
  ['Under-', 700],
  ['trained', 700],
  ['Under-', 600],
  ['trained', 600],
  ['Spot on', 600],
  ['Spot on', 700],
  ['Cooked', 700],
  ['Loaded', 700],
  ['Fine', 700],
  ['◀ Too much training', 400],
  ['Too little training ▶', 400],
  ['MISTRAL RACING', 700],
  ['NOORD CYCLING', 700],
  ['AL FARIS VELO', 700],
]
const b = await chromium.launch()
const p = await b.newPage()
await p.setContent(
  `<body>${fonts.map((f) => T.map(([s, w]) => `<span data-f="${f}" data-s="${s}|${w}" style="font:${w} 12px '${f}';white-space:nowrap;display:inline-block">${s}</span>`).join('')).join('<br>')}</body>`,
)
const r = await p.evaluate(() =>
  [...document.querySelectorAll('span')].map((e) => [
    e.dataset.f,
    e.dataset.s,
    Math.round(e.getBoundingClientRect().width * 10) / 10,
  ]),
)
const out = {}
for (const [f, s, w] of r) (out[s] ??= {})[f] = w
for (const [s, v] of Object.entries(out)) console.log(s, JSON.stringify(v))
await b.close()
process.exit(0)
