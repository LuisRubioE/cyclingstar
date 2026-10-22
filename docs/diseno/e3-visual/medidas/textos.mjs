/* global console, document */
// E3, corrector L1: los anchos de los textos nuevos de D-00n en Scale5 (§4.8), en Inter (la letra del
// contenedor de diseño) y DejaVu Sans (la que fija §7.6 para la prueba), con el Chromium de
// /opt/pw-browsers, como <scratchpad>/refutador-uso/medir-textos.mjs. Uso: node textos.mjs
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('/opt/node22/lib/node_modules/playwright')
const FONTS = ['Inter', 'DejaVu Sans']
const T = [
  ['Undertrained', 12, 700],
  ['Under-', 12, 700],
  ['trained', 12, 700],
  ['Spot on', 12, 700],
  ['Undertrained', 12, 400],
  ['◀ Too much training', 12, 400],
  ['Too little training ▶', 12, 400],
  ['Racing now · stage 3 of 5, Gandia → Alcoi', 14, 400],
]
const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent('<html><body></body></html>')
for (const f of FONTS) {
  for (const [t, px, w] of T) {
    const ancho = await page.evaluate(
      ([t, px, w, f]) => {
        const s = document.createElement('span')
        s.style.cssText = `font: ${w} ${px}px "${f}"; white-space: nowrap; position: absolute`
        s.textContent = t
        document.body.append(s)
        const r = s.getBoundingClientRect().width
        s.remove()
        return r
      },
      [t, px, w, f],
    )
    console.log(`${f}\t${px}px ${w}\t${ancho.toFixed(1)}\t${t}`)
  }
}
await browser.close()
