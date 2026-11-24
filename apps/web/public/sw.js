/*
 * El service worker de Cycling Star (docs/cuenta.md §13.5; D-45): solo recibe los avisos que manda el servidor
 * (apps/api/src/push/deliver.ts) y, al tocarlos, abre su página. Lo registra `Turn on`
 * (apps/web/src/notifications/push.ts), con ámbito `/`, y nada más.
 *
 * SIN manejador de peticiones, SIN caché y SIN funcionar sin red: las páginas cargan como siempre (lo que
 * quitó D-00p sigue quitado). Siempre pinta: un aviso recibido y no pintado hace que Chrome pinte uno
 * genérico, y ningún aviso es de algo que se esté mirando en ese instante (13-i). Sin icono propio: el
 * navegador pone el suyo (13-h).
 *
 * JavaScript plano, sin importaciones y sin nada en línea: la CSP de la página se aplica.
 */

self.addEventListener('install', () => {
  self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

/** Si el navegador pinta botones en los avisos (Chrome, Edge, Firefox; Safari no). */
function hayAcciones() {
  return typeof Notification !== 'undefined' && Notification.maxActions > 0
}

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }
  const title = typeof data.title === 'string' ? data.title : 'Cycling Star'
  const actions =
    data.off === true && hayAcciones() ? [{ action: 'off', title: 'Turn off these' }] : []
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === 'string' ? data.body : '',
      tag: typeof data.tag === 'string' ? data.tag : undefined,
      renotify: typeof data.tag === 'string',
      data: { path: data.path, kind: data.kind, off: data.off === true },
      actions,
    }),
  )
})

/**
 * La página de un aviso, siempre del propio origen (I-02: una clave VAPID filtrada no lleva al jugador a otra
 * web). Donde no hay botones, con `?from=notice&kind=` para que la página ofrezca `Don't want these?`.
 */
function destino(data, origin, conBotones) {
  let url
  try {
    url = new URL(typeof data.path === 'string' ? data.path : '/', origin)
  } catch {
    url = new URL('/', origin)
  }
  if (url.origin !== origin) url = new URL('/', origin)
  if (!conBotones && data.off === true && typeof data.kind === 'string') {
    url.searchParams.set('from', 'notice')
    url.searchParams.set('kind', data.kind)
  }
  return url
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  if (event.action === 'off' && typeof data.kind === 'string') {
    // la baja de un toque: sin abrir nada ni pedir contraseña
    event.waitUntil(
      fetch('/api/me/notices/' + encodeURIComponent(data.kind) + '/off', {
        method: 'POST',
        credentials: 'same-origin',
      }).catch(() => undefined),
    )
    return
  }
  const url = destino(data, self.location.origin, hayAcciones())
  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const misma = ventanas.find((c) => c.url === url.href)
      if (misma) return misma.focus()
      // una ventana del propio origen ya abierta va allí; si no, una nueva
      const propia = ventanas.find((c) => new URL(c.url).origin === url.origin && 'navigate' in c)
      if (propia) {
        try {
          const c = await propia.navigate(url.href)
          if (c) return c.focus()
        } catch {
          /* no la controla este service worker: se abre otra */
        }
      }
      return self.clients.openWindow(url.href)
    })(),
  )
})

/** El servicio de push renovó la suscripción: se vuelve a suscribir con la misma clave y se guarda. */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const vieja = event.oldSubscription
      const key = vieja && vieja.options ? vieja.options.applicationServerKey : null
      if (!key) return
      const nueva = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      })
      const json = nueva.toJSON()
      let timeZone = 'UTC'
      try {
        timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      } catch {
        /* UTC */
      }
      // sin sesión (401) se pierde, y la fila vieja muere por 404 o 410 (§13.6)
      await fetch('/api/me/push-targets', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          channel: 'webpush',
          endpoint: nueva.endpoint,
          keys: json.keys,
          timeZone,
        }),
      }).catch(() => undefined)
    })(),
  )
})
