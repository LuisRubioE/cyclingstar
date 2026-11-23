#!/usr/bin/env node
/* global process, console, document */
/**
 * E4, mapa 05: UNA SOLA CAPTURA DE PRODUCCIÓN, de una página pública y solo con GET (`00-encargo.md` §7,
 * regla 8): `/login` a 360 × 800, sin rellenar nada ni pulsar nada, para comparar sus textos con los de la
 * API local. Lo que pide la página al cargar (el HTML, sus JS, `get-session` y la salud) son lecturas; el
 * script corta cualquier petición que no sea GET o HEAD y lo dice.
 *
 * Uso: node <este-fichero> --out <carpeta-png> [--url https://www.cyclingstar.app/login]
 */
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name)
  return i < 0 ? fallback : (process.argv[i + 1] ?? fallback)
}
const OUT = resolve(arg('--out', 'png'))
const URL_ = arg('--url', 'https://www.cyclingstar.app/login')

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 360, height: 800 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
})
const peticiones = []
await context.route('**/*', (route) => {
  const m = route.request().method()
  peticiones.push(`${m} ${route.request().url()}`)
  return m === 'GET' || m === 'HEAD' ? route.continue() : route.abort()
})
const page = await context.newPage()
await page.goto(URL_, { waitUntil: 'networkidle', timeout: 30000 })
const main = await page.evaluate(() => document.querySelector('main')?.innerText ?? '')
await page.screenshot({ path: resolve(OUT, '80-produccion-login-360.png'), fullPage: true })
writeFileSync(
  resolve(OUT, 'produccion.json'),
  `${JSON.stringify({ url: URL_, fecha: new Date().toISOString(), main, peticiones }, null, 1)}\n`,
)
console.log(main)
console.log(peticiones.filter((p) => !p.startsWith('GET')).join('\n') || 'solo GET')
await browser.close()
