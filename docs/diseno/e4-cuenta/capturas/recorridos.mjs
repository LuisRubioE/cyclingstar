#!/usr/bin/env node
/* global process, console, window, document, getComputedStyle, Event, URL */
/**
 * E4, mapa 05: LOS RECORRIDOS DE LA CUENTA, contra el servidor de `servir.mjs`.
 *
 * Chromium de Playwright (el instalado en /opt/pw-browsers; nunca `playwright install`), 360 × 800 con
 * `deviceScaleFactor` 1, `isMobile` y táctil (`pointer: coarse`), y algunas a 1.280 × 800. Cada «persona»
 * es un contexto nuevo con su propia IP en `x-forwarded-for` (la API confía en el proxy, mapa 01 §4), para
 * que los límites de intento de una no gasten los de otra; la del 429 los gasta a propósito.
 *
 * Los enlaces de los correos se leen de `<mundo>/correos.jsonl`, que escribe el `Mailer` falso de
 * `servir.mjs`, y se abren en un contexto nuevo (el teléfono, sin sesión) o en el mismo (el navegador donde
 * se pidió), según el paso. En cada captura se apuntan en `<out>/medidas.json`: el texto de `main`, los
 * objetivos táctiles visibles con un lado por debajo de 44 px y la letra de los campos. El teclado del
 * teléfono se SIMULA (Chromium sin pantalla no abre ninguno): se enfoca el campo, se rebaja
 * `visualViewport.height` a `--teclado` px (470 por defecto, estimado para un Android de 360 × 800 con el
 * teclado abierto) con su evento `resize`, que es lo que mira `keyboard.ts`, y se captura solo lo visible.
 *
 * Uso (con `servir.mjs` escuchando; `--prod` apunta a otro `servir.mjs` con `NODE_ENV=production`):
 *   node <este-fichero> --base http://localhost:3005 --mundo <carpeta-de-servir> --out <carpeta-png> \
 *     [--prod http://localhost:3006] [--solo <regex>]
 */
import { createHmac } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name)
  return i < 0 ? fallback : (process.argv[i + 1] ?? fallback)
}
const BASE = arg('--base', 'http://localhost:3005')
const MUNDO = resolve(arg('--mundo', 'dev'))
const PROD = arg('--prod', null)
const OUT = resolve(arg('--out', 'png'))
const SOLO = arg('--solo', null) ? new RegExp(arg('--solo', '')) : null
const TECLADO = Number(arg('--teclado', '470'))
const SECRET = 's'.repeat(32)
const PASSWORD = 'contrasena-de-prueba-larga'
mkdirSync(OUT, { recursive: true })

const medidas = {}
const log = (m) => process.stderr.write(`${m}\n`)

let ipN = 0
const nextIp = () => {
  ipN += 1
  return `10.9.${Math.floor(ipN / 250)}.${(ipN % 250) + 1}`
}

const browser = await chromium.launch()
const VIEW = {
  360: { viewport: { width: 360, height: 800 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  1280: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
}
async function persona(width = 360, base = BASE) {
  const context = await browser.newContext({
    ...VIEW[width],
    baseURL: base,
    extraHTTPHeaders: { 'x-forwarded-for': nextIp() },
  })
  const page = await context.newPage()
  return { context, page }
}

/** SQL de preparación por la ruta del arnés. */
async function sql(q, base = BASE) {
  const res = await fetch(`${base}/__sql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ q }),
  })
  return res.json()
}

/** Los correos escritos por el Mailer falso desde `since`, para `to`. */
function correos(to, since = 0, mundo = MUNDO) {
  const file = resolve(mundo, 'correos.jsonl')
  if (!existsSync(file)) return []
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .filter((m) => m.t >= since && (to === null || m.to === to))
}
async function esperaCorreo(to, since, mundo = MUNDO) {
  for (let i = 0; i < 50; i += 1) {
    const list = correos(to, since, mundo)
    if (list.length > 0) return list[list.length - 1]
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`no llegó correo a ${to}`)
}
const enlace = (mail) => mail.text.split('\n').find((l) => l.startsWith('http'))
const correosVistos = []
function apunta(paso, mail) {
  correosVistos.push({ paso, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html })
}

/** Un JWT HS256 como el de better-auth, para fabricar un enlace caducado. */
function jwt(payload) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const head = `${b64({ alg: 'HS256' })}.${b64(payload)}`
  return `${head}.${createHmac('sha256', SECRET).update(head).digest('base64url')}`
}

async function quieto(page) {
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
  await page
    .waitForFunction(() => !document.querySelector('main')?.innerText.includes('Loading'), null, {
      timeout: 5000,
    })
    .catch(() => {})
  await page.waitForTimeout(150)
}

/** Lo que se mide en cada captura. */
async function medir(page) {
  return page.evaluate(() => {
    const SEL =
      'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=radio], [role=tab], [role=switch]'
    const vis = (el) => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none'
    }
    const zona = (el) =>
      el.closest('footer') ? 'pie' : el.closest('header') ? 'cabecera' : el.closest('nav') ? 'nav' : 'main'
    const pequeños = []
    for (const el of document.querySelectorAll(SEL)) {
      if (!vis(el)) continue
      const r = el.getBoundingClientRect()
      if (r.width >= 44 && r.height >= 44) continue
      pequeños.push({
        zona: zona(el),
        tag: el.tagName.toLowerCase(),
        texto: (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 50),
        w: Math.round(r.width),
        h: Math.round(r.height),
        enLinea: getComputedStyle(el).display === 'inline',
      })
    }
    const campos = [...document.querySelectorAll('input:not([type=hidden])')].filter(vis).map((el) => ({
      id: el.id,
      type: el.type,
      font: getComputedStyle(el).fontSize,
      h: Math.round(el.getBoundingClientRect().height),
      autocomplete: el.getAttribute('autocomplete'),
    }))
    return {
      url: location.pathname + location.search,
      main: document.querySelector('main')?.innerText ?? '',
      alertas: [...document.querySelectorAll('[role=alert],[role=status]')]
        .map((e) => e.innerText.trim())
        .filter(Boolean),
      pequeños,
      campos,
      alto: document.documentElement.scrollHeight,
    }
  })
}

async function shot(page, name, { full = true } = {}) {
  if (SOLO && !SOLO.test(name)) return
  await quieto(page)
  const w = page.viewportSize().width
  const file = `${name}-${w}.png`
  medidas[file] = await medir(page)
  await page.screenshot({ path: resolve(OUT, file), fullPage: full })
  log(`  ${file}`)
}

/**
 * EL TECLADO, SIMULADO: el foco al campo, el alto visible rebajado a `TECLADO` px con su `resize` (lo
 * que mira `keyboard.ts`), el campo llevado a lo visible como haría el navegador (lo mínimo), y la
 * captura de lo visible. Apunta si el botón de enviar se ve con el teclado abierto.
 */
async function teclado(page, name, campo, boton) {
  if (SOLO && !SOLO.test(name)) return
  await quieto(page)
  await page.focus(campo)
  const datos = await page.evaluate(
    ({ campo, boton, alto }) => {
      const vv = window.visualViewport
      Object.defineProperty(vv, 'height', { get: () => alto, configurable: true })
      vv.dispatchEvent(new Event('resize'))
      const el = document.querySelector(campo)
      const r = el.getBoundingClientRect()
      // lo mínimo para que el campo quede a la vista, con 16 px de margen
      if (r.bottom > alto - 16) window.scrollBy(0, r.bottom - (alto - 16))
      if (r.top < 0) window.scrollBy(0, r.top - 16)
      const b = document.querySelector(boton)?.getBoundingClientRect() ?? null
      const f = el.getBoundingClientRect()
      return {
        campo: { top: Math.round(f.top), bottom: Math.round(f.bottom) },
        boton: b ? { top: Math.round(b.top), bottom: Math.round(b.bottom) } : null,
        botonVisible: b ? b.bottom <= alto && b.top >= 0 : false,
        scrollY: Math.round(window.scrollY),
      }
    },
    { campo, boton, alto: TECLADO },
  )
  await page.waitForTimeout(200)
  // la barra inferior (`BottomNav`, `data-state` hidden o ready) y lo que queda fijo arriba
  datos.barraInferior = await page.evaluate(
    () => document.querySelector('nav[data-state]')?.getAttribute('data-state') ?? 'no está',
  )
  const file = `${name}-360.png`
  medidas[file] = { teclado: TECLADO, ...datos, ...(await medir(page)) }
  await page.screenshot({ path: resolve(OUT, file), clip: { x: 0, y: 0, width: 360, height: TECLADO } })
  log(`  ${file} ${JSON.stringify(datos)}`)
}

/** Registra una cuenta por la API y la confirma por SQL; con `entrar`, devuelve la persona con sesión. */
async function cuenta(email, { confirmada = true, width = 360 } = {}) {
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: BASE, 'x-forwarded-for': nextIp() },
    body: JSON.stringify({ name: email.split('@')[0], email, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`sign-up ${email}: ${res.status}`)
  if (confirmada) await sql(`update users set email_verified = true where email = '${email}'`)
  const p = await persona(width)
  return p
}
async function entrar(p, email, password = PASSWORD) {
  const res = await p.context.request.post('/api/auth/sign-in/email', {
    data: { email, password },
    headers: { origin: BASE },
  })
  if (!res.ok()) throw new Error(`sign-in ${email}: ${res.status()} ${await res.text()}`)
}
/** Los toques, con `tap` y no con `click`: tras un `click` (ratón) Chromium pasa a `pointer: fine` y los
 * campos bajan de 48 a 40 px (`fine:min-h-10`, Field.tsx l. 137), que no es lo que ve un dedo. */
async function rellenaYEnvia(page, valores, boton) {
  for (const [sel, v] of Object.entries(valores)) await page.fill(sel, v)
  await page.tap(boton)
  await page.waitForTimeout(400)
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
log('A. Quien no ha entrado: la portada, la navegación y el pie')
{
  for (const w of [360, 1280]) {
    const { context, page } = await persona(w)
    await page.goto('/')
    await shot(page, '01-portada-visitante')
    await page.goto('/privacy')
    await shot(page, '02-privacy')
    await page.goto('/account')
    await quieto(page)
    medidas[`03-account-sin-sesion-${w}.url`] = page.url()
    await context.close()
  }
}

log('B. Registrarse, CheckInbox y confirmar')
const NUEVO = 'nueva@example.com'
{
  for (const w of [360, 1280]) {
    const { context, page } = await persona(w)
    await page.goto('/register')
    await shot(page, '10-register')
    await context.close()
  }
  const { context, page } = await persona()
  await page.goto('/register')
  await quieto(page)
  await page.tap('button[type=submit]')
  await shot(page, '11-register-sin-correo')
  await page.fill('#register-email', 'no-es-un-correo')
  await page.fill('#register-password', 'larga-de-sobra')
  await page.tap('button[type=submit]')
  medidas['11b-register-correo-malformado.validationMessage'] = await page.evaluate(
    () => document.querySelector('#register-email').validationMessage,
  )
  await page.fill('#register-email', NUEVO)
  await page.fill('#register-password', 'corta')
  await page.tap('button[type=submit]')
  await shot(page, '12-register-corta')
  await teclado(page, '13-register-teclado', '#register-password', 'button[type=submit]')
  await page.reload()
  await quieto(page)
  const t0 = Date.now()
  await rellenaYEnvia(page, { '#register-email': NUEVO, '#register-password': PASSWORD }, 'button[type=submit]')
  await shot(page, '14-checkinbox')
  apunta('registro', await esperaCorreo(NUEVO, t0))
  const t1 = Date.now()
  await page.getByRole('button', { name: 'Send it again' }).tap()
  await page.waitForTimeout(600)
  await shot(page, '15-checkinbox-reenviado')
  const reenvio = await esperaCorreo(NUEVO, t1)
  apunta('reenviar desde CheckInbox', reenvio)
  // la sexta vez ya no: el límite de Fastify de diez cada cinco minutos por IP y ruta (mapa 01 §4)
  let fallo = null
  for (let i = 0; i < 12 && fallo === null; i += 1) {
    await page.getByRole('button', { name: 'Send it again' }).tap()
    await page.waitForTimeout(300)
    const alerta = await page.locator('[role=alert]').allInnerTexts()
    if (alerta.length > 0) fallo = { intento: i + 2, texto: alerta.join(' | ') }
  }
  medidas['16-checkinbox-limite'] = fallo
  await shot(page, '16-checkinbox-limite')
  await context.close()

  // el enlace, abierto en el teléfono (otro contexto, sin sesión)
  const tel = await persona()
  await tel.page.goto(enlace(reenvio))
  await shot(tel.page, '20-verify-ok')
  medidas['20-verify-ok.sesion'] = await (await tel.context.request.get('/api/auth/get-session')).json()
  await tel.page.getByRole('link', { name: 'Continue' }).tap()
  await shot(tel.page, '21-verify-continue')
  await tel.context.close()
  // el mismo enlace, abierto otra vez en un navegador sin sesión
  const otra = await persona()
  await otra.page.goto(enlace(reenvio))
  await shot(otra.page, '22-verify-otra-vez')
  medidas['22-verify-otra-vez.sesion'] = await (await otra.context.request.get('/api/auth/get-session')).json()
  await otra.context.close()
  // el primer enlace (del registro), después de haber confirmado con el segundo
  const primero = correosVistos.find((c) => c.paso === 'registro')
  const otra2 = await persona()
  await otra2.page.goto(enlace(primero))
  await quieto(otra2.page)
  medidas['22b-verify-primer-enlace'] = await medir(otra2.page)
  await otra2.context.close()

  // caducado y malo
  const ahora = Math.floor(Date.now() / 1000)
  const caducado = jwt({ email: NUEVO, iat: ahora - 7200, exp: ahora - 3600 })
  const v = await persona()
  await v.page.goto(`/api/auth/verify-email?token=${caducado}&callbackURL=%2Fverify-email`)
  await shot(v.page, '23-verify-caducado')
  await v.page.goto('/api/auth/verify-email?token=no-vale&callbackURL=%2Fverify-email')
  await shot(v.page, '24-verify-malo')
  await v.page.goto('/verify-email?step=approved')
  await shot(v.page, '25-verify-approved')
  await v.context.close()
}

log('C. Registrarse con un correo ya usado')
{
  const { context, page } = await persona()
  await page.goto('/register')
  await quieto(page)
  const t0 = Date.now()
  await rellenaYEnvia(page, { '#register-email': NUEVO, '#register-password': 'otra-contrasena-cualquiera' }, 'button[type=submit]')
  await shot(page, '17-register-correo-usado')
  await page.waitForTimeout(1000)
  medidas['17-register-correo-usado.correos'] = correos(NUEVO, t0).map((m) => m.subject)
  // una contraseña de más de 128 (el máximo de better-auth, mapa 01 §6)
  await page.goto('/register')
  await quieto(page)
  await rellenaYEnvia(page, { '#register-email': 'larga@example.com', '#register-password': 'x'.repeat(129) }, 'button[type=submit]')
  await shot(page, '18-register-demasiado-larga')
  await context.close()
}

log('D. Entrar: vacío, contraseña mala, sin confirmar, teclado y 429')
const SINCONF = 'sinconfirmar@example.com'
{
  for (const w of [360, 1280]) {
    const { context, page } = await persona(w)
    await page.goto('/login')
    await shot(page, '30-login')
    await context.close()
  }
  const { context, page } = await persona()
  await page.goto('/login')
  await quieto(page)
  await page.tap('button[type=submit]')
  await shot(page, '31-login-sin-correo')
  await rellenaYEnvia(page, { '#login-email': NUEVO, '#login-password': 'mala-mala-mala' }, 'button[type=submit]')
  await shot(page, '32-login-contrasena-mala')
  await rellenaYEnvia(page, { '#login-email': 'nadie@example.com', '#login-password': 'mala-mala-mala' }, 'button[type=submit]')
  medidas['32b-login-correo-inexistente'] = await page.locator('[role=alert]').allInnerTexts()
  await teclado(page, '33-login-teclado', '#login-password', 'button[type=submit]')
  await context.close()

  await cuenta(SINCONF, { confirmada: false }).then((p) => p.context.close())
  const s = await persona()
  await s.page.goto('/login')
  await quieto(s.page)
  const t0 = Date.now()
  await rellenaYEnvia(s.page, { '#login-email': SINCONF, '#login-password': PASSWORD }, 'button[type=submit]')
  await shot(s.page, '34-login-sin-confirmar')
  apunta('entrar sin confirmar', await esperaCorreo(SINCONF, t0))
  // con la contraseña mala, la cuenta sin confirmar: ¿avisa o no?
  await rellenaYEnvia(s.page, { '#login-email': SINCONF, '#login-password': 'mala-mala-mala' }, 'button[type=submit]')
  medidas['34b-login-sin-confirmar-mala'] = await s.page.locator('main').innerText()
  await s.context.close()

  // el 429 sin NODE_ENV: Fastify, diez cada cinco minutos por IP y ruta
  const r = await persona()
  await r.page.goto('/login')
  await quieto(r.page)
  const serie = []
  for (let i = 1; i <= 12; i += 1) {
    const [res] = await Promise.all([
      r.page.waitForResponse((x) => x.url().includes('/sign-in/email')),
      rellenaYEnvia(r.page, { '#login-email': NUEVO, '#login-password': `mala-${i}-xxxx` }, 'button[type=submit]'),
    ])
    serie.push({ i, status: res.status(), alerta: (await r.page.locator('[role=alert]').allInnerTexts()).join(' | ') })
  }
  medidas['35-login-429-fastify.serie'] = serie
  await shot(r.page, '35-login-429-fastify')
  // y con la buena, desde la misma IP
  await rellenaYEnvia(r.page, { '#login-email': NUEVO, '#login-password': PASSWORD }, 'button[type=submit]')
  medidas['35b-login-429-buena'] = { url: r.page.url(), alerta: await r.page.locator('[role=alert]').allInnerTexts() }
  await r.context.close()
}

if (PROD) {
  log('D2. El 429 con NODE_ENV=production (better-auth, tres cada diez segundos)')
  await fetch(`${PROD}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: PROD, 'x-forwarded-for': nextIp() },
    body: JSON.stringify({ name: 'p', email: NUEVO, password: PASSWORD }),
  })
  await sql(`update users set email_verified = true where email = '${NUEVO}'`, PROD)
  const r = await persona(360, PROD)
  await r.page.goto('/login')
  await quieto(r.page)
  const serie = []
  for (let i = 1; i <= 5; i += 1) {
    const [res] = await Promise.all([
      r.page.waitForResponse((x) => x.url().includes('/sign-in/email')),
      rellenaYEnvia(r.page, { '#login-email': NUEVO, '#login-password': `mala-${i}-xxxx` }, 'button[type=submit]'),
    ])
    serie.push({ i, status: res.status(), alerta: (await r.page.locator('[role=alert]').allInnerTexts()).join(' | ') })
  }
  medidas['36-login-429-better-auth.serie'] = serie
  await shot(r.page, '36-login-429-better-auth')
  await r.context.close()
}

log('E. Recuperar la contraseña')
{
  for (const w of [360, 1280]) {
    const { context, page } = await persona(w)
    await page.goto('/forgot-password')
    await shot(page, '40-forgot')
    await context.close()
  }
  const { context, page } = await persona()
  await page.goto('/forgot-password')
  await quieto(page)
  await page.tap('button[type=submit]')
  await shot(page, '41-forgot-sin-correo')
  const t0 = Date.now()
  await rellenaYEnvia(page, { '#forgot-email': NUEVO }, 'button[type=submit]')
  await shot(page, '42-forgot-enviado')
  const mail = await esperaCorreo(NUEVO, t0)
  apunta('recuperar', mail)
  // otro, para ver si el primero se anula
  await page.goto('/forgot-password')
  await quieto(page)
  const t1 = Date.now()
  await rellenaYEnvia(page, { '#forgot-email': NUEVO }, 'button[type=submit]')
  const mail2 = await esperaCorreo(NUEVO, t1)
  // un correo que no existe: la misma pantalla
  await page.goto('/forgot-password')
  await quieto(page)
  await rellenaYEnvia(page, { '#forgot-email': 'nadie@example.com' }, 'button[type=submit]')
  medidas['42b-forgot-inexistente'] = await page.locator('main').innerText()
  await context.close()

  const tel = await persona()
  await tel.page.goto(enlace(mail))
  await shot(tel.page, '43-reset')
  await tel.page.tap('button[type=submit]')
  await shot(tel.page, '44-reset-corta')
  await rellenaYEnvia(tel.page, { '#reset-password': 'nueva-contrasena-1', '#reset-confirm': 'nueva-contrasena-2' }, 'button[type=submit]')
  await shot(tel.page, '45-reset-no-coinciden')
  await teclado(tel.page, '46-reset-teclado', '#reset-confirm', 'button[type=submit]')
  await tel.page.goto(enlace(mail))
  await quieto(tel.page)
  await rellenaYEnvia(tel.page, { '#reset-password': 'nueva-contrasena-1', '#reset-confirm': 'nueva-contrasena-1' }, 'button[type=submit]')
  await shot(tel.page, '47-reset-hecho')
  // el mismo enlace, otra vez
  await tel.page.goto(enlace(mail))
  await shot(tel.page, '48-reset-usado')
  // el segundo enlace, pedido antes de usar el primero
  await tel.page.goto(enlace(mail2))
  await quieto(tel.page)
  medidas['48b-reset-segundo-enlace'] = await medir(tel.page)
  // un token malo y la página sin nada
  await tel.page.goto('/api/auth/reset-password/no-vale-este-token?callbackURL=%2Freset-password')
  await shot(tel.page, '49-reset-token-malo')
  await tel.page.goto('/reset-password')
  await shot(tel.page, '49b-reset-sin-token')
  await tel.context.close()
  // vuelta a la contraseña de las demás pruebas
  const back = await persona()
  await back.page.goto('/forgot-password')
  await quieto(back.page)
  const t2 = Date.now()
  await rellenaYEnvia(back.page, { '#forgot-email': NUEVO }, 'button[type=submit]')
  const m3 = await esperaCorreo(NUEVO, t2)
  await back.page.goto(enlace(m3))
  await quieto(back.page)
  await rellenaYEnvia(back.page, { '#reset-password': PASSWORD, '#reset-confirm': PASSWORD }, 'button[type=submit]')
  await back.context.close()
}

log('F. La cuenta')
const CTA = 'cuenta@example.com'
{
  for (const w of [360, 1280]) {
    const email = `cuenta${w}@example.com`
    const p = await cuenta(email, { width: w })
    await entrar(p, email)
    await p.page.goto('/account')
    await shot(p.page, '50-account')
    await p.context.close()
  }
  // la cuenta antigua: sesión viva y el correo sin confirmar
  const ANT = 'antigua@example.com'
  const a = await cuenta(ANT)
  await entrar(a, ANT)
  await sql(`update users set email_verified = false where email = '${ANT}'`)
  await a.page.goto('/account')
  await shot(a.page, '51-account-sin-confirmar')
  const t0 = Date.now()
  await a.page.getByRole('button', { name: 'Send me a confirmation link' }).tap()
  await a.page.waitForTimeout(600)
  await shot(a.page, '52-account-sin-confirmar-enviado')
  apunta('cuenta antigua sin confirmar', await esperaCorreo(ANT, t0))
  // cambiar el correo sin confirmar: el enlace va directo a la nueva (mapa 01 §2)
  const t0b = Date.now()
  await rellenaYEnvia(a.page, { '#new-email': 'antigua-nueva@example.com' }, 'form:has(#new-email) button[type=submit]')
  medidas['52b-account-sin-confirmar-cambio'] = await a.page.locator('form:has(#new-email)').innerText()
  await a.page.waitForTimeout(500)
  medidas['52b-account-sin-confirmar-cambio.correos'] = correos(null, t0b).map((m) => `${m.to}: ${m.subject}`)
  await a.context.close()

  // cambiar el correo, con los dos enlaces
  const c = await cuenta(CTA)
  await entrar(c, CTA)
  await c.page.goto('/account')
  await quieto(c.page)
  const formMail = 'form:has(#new-email) button[type=submit]'
  await c.page.tap(formMail)
  await shot(c.page, '53-account-correo-vacio')
  await rellenaYEnvia(c.page, { '#new-email': CTA }, formMail)
  medidas['53b-account-correo-igual'] = await c.page.locator('form:has(#new-email)').innerText()
  // a uno ocupado
  const tOc = Date.now()
  await rellenaYEnvia(c.page, { '#new-email': NUEVO }, formMail)
  medidas['53c-account-correo-ocupado'] = await c.page.locator('form:has(#new-email)').innerText()
  await c.page.waitForTimeout(600)
  medidas['53c-account-correo-ocupado.correos'] = correos(null, tOc).map((m) => `${m.to}: ${m.subject}`)
  await c.page.reload()
  await quieto(c.page)
  const NUEVA = 'cuenta-nueva@example.com'
  const t1 = Date.now()
  await rellenaYEnvia(c.page, { '#new-email': NUEVA }, formMail)
  await c.page.locator('#new-email').scrollIntoViewIfNeeded()
  await shot(c.page, '54-account-correo-pedido')
  const aviso = await esperaCorreo(CTA, t1)
  apunta('cambio de correo, aviso a la vieja', aviso)
  await teclado(c.page, '55-account-teclado', '#new-email', formMail)
  // primer enlace, en el mismo navegador (con sesión)
  const t2 = Date.now()
  await c.page.goto(enlace(aviso))
  await shot(c.page, '56-verify-approved-real')
  const verif = await esperaCorreo(NUEVA, t2)
  apunta('cambio de correo, enlace a la nueva', verif)
  // segundo enlace, también en el mismo navegador
  await c.page.goto(enlace(verif))
  await shot(c.page, '57-verify-cambio-hecho')
  await c.page.goto('/account')
  await shot(c.page, '58-account-correo-cambiado')

  // la contraseña
  const formPw = 'form:has(#cur-pw) button[type=submit]'
  await rellenaYEnvia(c.page, { '#cur-pw': PASSWORD, '#new-pw': 'corta', '#confirm-pw': 'corta' }, formPw)
  medidas['60-account-pw-corta'] = await c.page.locator('form:has(#cur-pw)').innerText()
  await rellenaYEnvia(c.page, { '#cur-pw': PASSWORD, '#new-pw': 'nueva-contrasena-1', '#confirm-pw': 'nueva-contrasena-2' }, formPw)
  medidas['60b-account-pw-no-coinciden'] = await c.page.locator('form:has(#cur-pw)').innerText()
  await rellenaYEnvia(c.page, { '#cur-pw': 'mala-mala-mala', '#new-pw': 'nueva-contrasena-1', '#confirm-pw': 'nueva-contrasena-1' }, formPw)
  await c.page.locator('#cur-pw').scrollIntoViewIfNeeded()
  await shot(c.page, '60-account-pw-actual-mala', { full: false })
  await rellenaYEnvia(c.page, { '#cur-pw': '', '#new-pw': 'nueva-contrasena-1', '#confirm-pw': 'nueva-contrasena-1' }, formPw)
  medidas['60c-account-pw-actual-vacia'] = await c.page.locator('form:has(#cur-pw)').innerText()
  // otra sesión abierta antes del cambio
  const otra = await persona()
  await entrar(otra, NUEVA)
  await rellenaYEnvia(c.page, { '#cur-pw': PASSWORD, '#new-pw': 'nueva-contrasena-1', '#confirm-pw': 'nueva-contrasena-1' }, formPw)
  await c.page.locator('#cur-pw').scrollIntoViewIfNeeded()
  await shot(c.page, '61-account-pw-cambiada', { full: false })
  medidas['61-account-pw-otra-sesion'] = await (await otra.context.request.get('/api/auth/get-session')).json()
  await otra.context.close()

  // borrar la cuenta
  await c.page.getByRole('button', { name: 'Delete my account…' }).tap()
  await c.page.waitForTimeout(200)
  await c.page.locator('#delete-pw').scrollIntoViewIfNeeded()
  await shot(c.page, '62-account-borrar-abierto', { full: false })
  await c.page.getByRole('button', { name: 'Delete my account for good' }).tap()
  await c.page.waitForTimeout(300)
  medidas['63-account-borrar-vacio'] = await c.page.locator('#delete-pw').evaluate((el) => el.closest('form').innerText)
  await c.page.fill('#delete-pw', 'mala-mala-mala')
  await c.page.getByRole('button', { name: 'Delete my account for good' }).tap()
  await c.page.waitForTimeout(500)
  await c.page.locator('#delete-pw').scrollIntoViewIfNeeded()
  await shot(c.page, '63-account-borrar-mala', { full: false })
  await teclado(c.page, '64-account-borrar-teclado', '#delete-pw', 'form:has(#delete-pw) button[type=submit]')
  await c.page.reload()
  await quieto(c.page)
  await c.page.getByRole('button', { name: 'Delete my account…' }).tap()
  await c.page.fill('#delete-pw', 'nueva-contrasena-1')
  const tDel = Date.now()
  await c.page.getByRole('button', { name: 'Delete my account for good' }).tap()
  await c.page.waitForURL((u) => new URL(u).pathname === '/', { timeout: 8000 }).catch(() => {})
  await shot(c.page, '65-account-borrada')
  await c.page.waitForTimeout(500)
  medidas['65-account-borrada.correos'] = correos(null, tDel).map((m) => `${m.to}: ${m.subject}`)
  await c.context.close()

  // cerrar la sesión
  const so = await cuenta('salir@example.com')
  await entrar(so, 'salir@example.com')
  await so.page.goto('/account')
  await quieto(so.page)
  await so.page.getByRole('button', { name: 'Sign out' }).tap()
  await so.page.waitForTimeout(800)
  medidas['66-sign-out'] = { url: so.page.url() }
  await so.context.close()
}

log('G. Los correos, pintados a 360')
{
  // sin `isMobile`: con él, un HTML sin `<meta viewport>` se pinta a 980 px y se encoge
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const vistos = new Set()
  let n = 0
  for (const c of correosVistos) {
    if (vistos.has(c.subject)) continue
    vistos.add(c.subject)
    n += 1
    await page.setContent(c.html)
    const file = `70-correo-${n}-360.png`
    if (!SOLO || SOLO.test(file)) await page.screenshot({ path: resolve(OUT, file), fullPage: true })
    medidas[file] = { subject: c.subject }
  }
  await context.close()
}

writeFileSync(resolve(OUT, 'medidas.json'), `${JSON.stringify(medidas, null, 1)}\n`)
writeFileSync(resolve(OUT, 'correos.json'), `${JSON.stringify(correosVistos, null, 1)}\n`)
await browser.close()
log('hecho')
