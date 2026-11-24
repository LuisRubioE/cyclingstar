import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from './app.js'

/**
 * `sw.js` Y EL MANIFIESTO: LA FRONTERA CON D-00p (docs/cuenta.md §13.5; D-45, 13-g a 13-i; PR 14 de E4). El
 * service worker solo recibe avisos: sin manejador de peticiones, sin caché y sin `importScripts`; un aviso
 * que apunta a otro origen abre la propia web. El manifiesto es el mínimo, solo para que el iPhone abra la web
 * como app y reciba avisos: ocho claves y sin iconos, un solo `rel="manifest"` y ninguna meta de Apple. Los
 * dos se sirven con la CSP de siempre, sin ampliarla.
 */
const WEB = fileURLToPath(new URL('../../web/', import.meta.url))
const SW = readFileSync(`${WEB}public/sw.js`, 'utf8')
const MANIFEST = readFileSync(`${WEB}public/manifest.webmanifest`, 'utf8')
const INDEX = readFileSync(`${WEB}index.html`, 'utf8')
const ORIGEN = 'https://www.cyclingstar.app'

/** Carga `sw.js` en un contexto aislado con un `self` de mentira y devuelve sus oyentes y lo que hizo. */
function cargaSw(maxActions: number) {
  const oyentes = new Map<string, (e: unknown) => void>()
  const abiertas: string[] = []
  const peticiones: string[] = []
  const pintados: { title: string; options: Record<string, unknown> }[] = []
  const self = {
    location: { origin: ORIGEN },
    addEventListener: (tipo: string, fn: (e: unknown) => void) => oyentes.set(tipo, fn),
    skipWaiting: () => undefined,
    clients: {
      claim: async () => undefined,
      matchAll: async () => [],
      openWindow: async (url: string) => {
        abiertas.push(url)
        return null
      },
    },
    registration: {
      showNotification: async (title: string, options: Record<string, unknown>) =>
        void pintados.push({ title, options }),
    },
  }
  runInNewContext(SW, {
    self,
    URL,
    Notification: { maxActions },
    fetch: async (url: string) => {
      peticiones.push(url)
      return { ok: true }
    },
  })
  const dispara = async (tipo: string, evento: Record<string, unknown>) => {
    const esperas: Promise<unknown>[] = []
    oyentes.get(tipo)!({ ...evento, waitUntil: (p: Promise<unknown>) => esperas.push(p) })
    await Promise.all(esperas)
  }
  return { oyentes, abiertas, peticiones, pintados, dispara }
}
const clic = (data: Record<string, unknown>, action = '') => ({
  action,
  notification: { data, close: () => undefined },
})

describe('sw.js sin fetch, sin caché y sin importScripts (D-45)', () => {
  it('tres oyentes de avisos más install y activate, y nada más', () => {
    expect(SW).not.toMatch(/addEventListener\(\s*['"]fetch['"]/)
    expect(SW).not.toMatch(/\bcaches\b/)
    expect(SW).not.toMatch(/importScripts/)
    expect([...cargaSw(1).oyentes.keys()].sort()).toEqual([
      'activate',
      'install',
      'notificationclick',
      'push',
      'pushsubscriptionchange',
    ])
  })

  it('pinta siempre, con Turn off these solo si el aviso se apaga y el navegador pinta botones', async () => {
    const sw = cargaSw(2)
    const carga = (off: boolean) => ({
      data: {
        json: () => ({
          kind: 'plan_ending',
          title: 'T',
          body: 'B',
          path: '/me/training',
          tag: 'plan',
          off,
        }),
      },
    })
    await sw.dispara('push', carga(true))
    await sw.dispara('push', carga(false))
    expect(sw.pintados.map((p) => (p.options.actions as unknown[]).length)).toEqual([1, 0])
    expect(sw.pintados[0]!.options).toMatchObject({ body: 'B', tag: 'plan', renotify: true })
    expect(sw.pintados[0]!.options).not.toHaveProperty('icon')
    const safari = cargaSw(0)
    await safari.dispara('push', carga(true))
    expect(safari.pintados[0]!.options.actions).toEqual([])
  })

  it('notificationclick a otro origen abre la propia web; sin botones, con ?from=notice', async () => {
    const sw = cargaSw(0)
    await sw.dispara(
      'notificationclick',
      clic({ path: 'https://evil.example/x', kind: 'stage_ready', off: true }),
    )
    await sw.dispara(
      'notificationclick',
      clic({ path: '//evil.example/x', kind: 'away_over', off: true }),
    )
    await sw.dispara(
      'notificationclick',
      clic({ path: '/account/devices', kind: 'new_sign_in', off: false }),
    )
    expect(sw.abiertas).toEqual([
      `${ORIGEN}/?from=notice&kind=stage_ready`,
      `${ORIGEN}/?from=notice&kind=away_over`,
      `${ORIGEN}/account/devices`,
    ])
  })

  it('Turn off these llama a la baja de un toque sin abrir nada', async () => {
    const sw = cargaSw(2)
    await sw.dispara(
      'notificationclick',
      clic({ path: '/', kind: 'stage_digest', off: true }, 'off'),
    )
    expect(sw.peticiones).toEqual(['/api/me/notices/stage_digest/off'])
    expect(sw.abiertas).toEqual([])
  })
})

describe('el manifiesto mínimo (§13.5; 13-g)', () => {
  it('ocho claves, sin iconos, y un solo rel="manifest" sin metas de Apple', () => {
    const m = JSON.parse(MANIFEST) as Record<string, unknown>
    expect(Object.keys(m).sort()).toEqual(
      [
        'background_color',
        'display',
        'id',
        'name',
        'scope',
        'short_name',
        'start_url',
        'theme_color',
      ].sort(),
    )
    expect(m).toMatchObject({ name: 'Cycling Star', display: 'standalone', theme_color: '#123a5c' })
    expect(m).not.toHaveProperty('icons')
    expect(INDEX.match(/rel="manifest"/g)).toHaveLength(1)
    expect(INDEX).toContain('<link rel="manifest" href="/manifest.webmanifest" />')
    expect(INDEX).not.toMatch(/apple-mobile-web-app-capable|apple-touch-icon/)
    // ni ofrecer instalar
    expect(SW + INDEX).not.toMatch(/beforeinstallprompt/)
  })

  describe('servidos por la API, con la CSP de siempre', () => {
    let app: ReturnType<typeof buildApp>
    beforeAll(async () => {
      app = buildApp({ serveWeb: true, webRoot: `${WEB}public`, webIndexHtml: INDEX })
      await app.ready()
    })
    afterAll(async () => {
      await app?.close()
    })

    it('manifest.webmanifest como application/manifest+json y sw.js como JavaScript sin caché larga', async () => {
      const m = await app.inject({ method: 'GET', url: '/manifest.webmanifest' })
      expect(m.statusCode).toBe(200)
      expect(m.headers['content-type']).toMatch(/^application\/manifest\+json/)
      const s = await app.inject({ method: 'GET', url: '/sw.js' })
      expect(s.statusCode).toBe(200)
      expect(s.headers['content-type']).toMatch(/^(application|text)\/javascript/)
      expect(s.headers['cache-control']).toMatch(/max-age=0/)
      // `default-src 'self'` cubre `worker-src` y `manifest-src`: la CSP no se amplía
      const csp = String(s.headers['content-security-policy'])
      expect(csp).toContain("default-src 'self'")
      expect(csp).not.toMatch(/worker-src|manifest-src/)
    })
  })
})
