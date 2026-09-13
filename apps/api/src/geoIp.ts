import { z } from 'zod'

/**
 * PAÍS POR IP, RESUELTO EN EL SERVIDOR (v59).
 *
 * Antes esto vivía en el NAVEGADOR (una llamada a `https://ipwho.is` desde la SPA) y en producción
 * no funcionaba nunca. Dos causas encadenadas, ambas nuestras:
 *
 *  1. El despliegue (Railway, sin Cloudflare delante) no pone NINGUNA cabecera de geolocalización,
 *     así que la primera vía —`CF-IPCountry` y compañía— devolvía siempre `null` («no geo headers»).
 *  2. Nuestra propia CSP declara `connect-src 'self'` (ver app.ts), de modo que el navegador
 *     rechazaba la llamada al tercero antes de que saliera de la máquina: «ipwho.is: Failed to
 *     fetch». No era una caída del proveedor: era la política que nosotros mismos servimos.
 *
 * La solución es la del repositorio HIS, donde esto lleva funcionando sin fallos: la consulta la
 * hace el SERVIDOR con la IP del cliente. Desde aquí no hay CSP que valga, ni bloqueadores de
 * anuncios, ni extensiones de privacidad, y la web no necesita hablar con nadie más que con
 * nosotros. Se usan los mismos proveedores que HIS (ipinfo.io e ipapi.co) más ipwho.is, el que ya
 * teníamos, ahora del lado bueno del cortafuegos.
 *
 * EL ORDEN NO ES EL DE HIS, Y ES A PROPÓSITO. HIS pregunta a ipapi.co primero, pero lo hace desde
 * el navegador: allí cada jugador gasta SU cupo, porque el cupo gratuito se cuenta por IP del que
 * llama. Aquí el que llama es un servidor: una sola IP para todos, compartida además con el resto
 * de inquilinos de la plataforma. Comprobado desde una IP de centro de datos (sept. 2026),
 * ipapi.co responde `{ error: true, reason: 'RateLimited' }` de entrada, mientras que ipinfo.io e
 * ipwho.is contestan al instante. Así que ipapi.co pasa al final: sigue ahí como red de seguridad,
 * pero no se le pregunta primero para no gastar un viaje de ida y vuelta en un «no» previsible.
 *
 * ⚠️ Privacidad (asumido a propósito, ya declarado en /privacy): la IP del jugador se envía a un
 * tercero para traducirla a un código de país. No se persiste nada; la caché es en memoria y
 * caduca. El país solo PRESELECCIONA el desplegable, nunca decide nada del juego.
 */

/** Lo que devuelve un intento de resolución: código ISO de dos letras y quién lo dijo. */
export interface GeoIpResultado {
  code: string
  proveedor: string
}

/** Firma de la resolución, inyectable para poder probar las rutas sin salir a la red. */
export type GeoIpLookup = (ip: string) => Promise<GeoIpResultado | null>

/** ipapi.co: `{ country_code: 'ES' }`, o `{ error: true, reason: '...' }` cuando no puede. */
const ipapiSchema = z.object({
  country_code: z.string().optional(),
  error: z.boolean().optional(),
})

/** ipinfo.io: `{ country: 'ES' }`. */
const ipinfoSchema = z.object({ country: z.string().optional() })

/** ipwho.is: `{ success: true, country_code: 'ES' }`. */
const ipwhoisSchema = z.object({
  success: z.boolean().optional(),
  country_code: z.string().optional(),
})

/**
 * Proveedores en orden de preferencia (ver arriba por qué ipapi.co va el último). Los tres son
 * gratuitos y sin clave; si uno cae, cambia de formato o agota el cupo, el siguiente contesta.
 */
const PROVEEDORES: {
  nombre: string
  url: (ip: string) => string
  leer: (json: unknown) => string | null
}[] = [
  {
    nombre: 'ipinfo.io',
    url: (ip) => `https://ipinfo.io/${encodeURIComponent(ip)}/json`,
    leer: (json) => {
      const parsed = ipinfoSchema.safeParse(json)
      return parsed.success ? (parsed.data.country ?? null) : null
    },
  },
  {
    nombre: 'ipwho.is',
    url: (ip) => `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code`,
    leer: (json) => {
      const parsed = ipwhoisSchema.safeParse(json)
      if (!parsed.success || parsed.data.success === false) return null
      return parsed.data.country_code ?? null
    },
  },
  {
    nombre: 'ipapi.co',
    url: (ip) => `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
    leer: (json) => {
      const parsed = ipapiSchema.safeParse(json)
      if (!parsed.success || parsed.data.error === true) return null
      return parsed.data.country_code ?? null
    },
  },
]

/** Corte de la espera por proveedor: más que esto y la pantalla de creación se queda colgada. */
const TIMEOUT_MS = 5_000

/**
 * Caché en memoria por IP. Los planes gratuitos de estos servicios cuentan por IP DEL QUE LLAMA, y
 * el que llama ahora somos nosotros: sin caché, un puñado de jugadores recargando la pantalla agota
 * el cupo diario de todos. Un acierto dura 6 h (la IP de un jugador no cambia de país cada minuto)
 * y un fallo 10 min (para reintentar pronto si el proveedor estaba caído, pero no en bucle).
 */
const TTL_ACIERTO_MS = 6 * 60 * 60 * 1000
const TTL_FALLO_MS = 10 * 60 * 1000
/** Tope de entradas: es un mapa en memoria de un proceso largo, no puede crecer sin freno. */
const MAX_ENTRADAS = 1_000

interface Entrada {
  valor: GeoIpResultado | null
  expiraEnMs: number
}
const cache = new Map<string, Entrada>()

function leerCache(
  ip: string,
  ahoraMs: number,
): { hit: true; valor: GeoIpResultado | null } | { hit: false } {
  const entrada = cache.get(ip)
  if (!entrada) return { hit: false }
  if (entrada.expiraEnMs <= ahoraMs) {
    cache.delete(ip)
    return { hit: false }
  }
  return { hit: true, valor: entrada.valor }
}

function guardarCache(ip: string, valor: GeoIpResultado | null, ahoraMs: number): void {
  // Map conserva el orden de inserción: la primera clave es la más antigua.
  if (cache.size >= MAX_ENTRADAS) {
    const masVieja = cache.keys().next()
    if (!masVieja.done) cache.delete(masVieja.value)
  }
  cache.set(ip, { valor, expiraEnMs: ahoraMs + (valor ? TTL_ACIERTO_MS : TTL_FALLO_MS) })
}

/**
 * PRESUPUESTO DE CONSULTAS POR HORA. La caché protege del uso normal, no del abuso: `request.ip`
 * sale de `X-Forwarded-For`, que cualquiera puede inventarse, así que basta con rotar esa cabecera
 * para que cada petición sea una IP «nueva», atraviese la caché y nos gaste una consulta de verdad.
 * Con el cupo agotado, la detección deja de funcionar para TODOS los jugadores, que es exactamente
 * el fallo que este cambio viene a arreglar.
 *
 * Por eso hay un techo global de consultas salientes por hora. Al pasarlo, la resolución por IP
 * devuelve `null` y la pantalla pregunta el país a mano: se degrada, no se rompe. El número es
 * holgado para el tráfico real de un MVP (cada jugador gasta UNA consulta cada 6 h) y ridículo
 * comparado con los cupos gratuitos de los proveedores.
 */
const MAX_CONSULTAS_POR_HORA = 500
const VENTANA_MS = 60 * 60 * 1000
let consultasEnVentana = 0
let ventanaAbiertaEnMs = 0

/** Consume una consulta del presupuesto; false si ya no queda para esta hora. */
function hayPresupuesto(ahoraMs: number): boolean {
  if (ahoraMs - ventanaAbiertaEnMs >= VENTANA_MS) {
    ventanaAbiertaEnMs = ahoraMs
    consultasEnVentana = 0
  }
  if (consultasEnVentana >= MAX_CONSULTAS_POR_HORA) return false
  consultasEnVentana += 1
  return true
}

/** Solo para pruebas: deja la caché y el presupuesto limpios entre casos. */
export function limpiarCacheGeoIp(): void {
  cache.clear()
  consultasEnVentana = 0
  ventanaAbiertaEnMs = 0
}

/**
 * IPs que no tiene sentido preguntar: bucle local, redes privadas y enlace local. En desarrollo la
 * IP del cliente es `127.0.0.1` y preguntar por ella solo gasta cupo para que nos digan que no.
 * (Misma criba que hace HIS antes de llamar al proveedor.)
 */
export function esIpNoEnrutable(ip: string): boolean {
  const limpia = ip.trim().toLowerCase()
  if (limpia === '') return true
  // IPv6 mapeada a IPv4 (`::ffff:8.8.8.8`): se juzga por la parte IPv4.
  const v4 = limpia.startsWith('::ffff:') ? limpia.slice(7) : limpia
  if (v4 === 'localhost' || v4 === '::1' || v4 === '::') return true
  if (v4.startsWith('127.') || v4.startsWith('10.') || v4.startsWith('192.168.')) return true
  if (v4.startsWith('169.254.') || v4.startsWith('100.64.')) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(v4)) return true
  // IPv6 privada (fc00::/7) y enlace local (fe80::/10).
  if (/^f[cd]/.test(v4) || v4.startsWith('fe80:')) return true
  return false
}

/**
 * Pregunta a los proveedores, en orden, hasta que uno conteste un código de país plausible. Cada
 * fallo es silencioso a propósito: si NADIE contesta, la pantalla pregunta el país a mano, que es
 * el comportamiento correcto y no un error que merezca romper la petición.
 */
export const lookupCountryByIp: GeoIpLookup = async (ip) => {
  if (esIpNoEnrutable(ip)) return null

  const ahoraMs = Date.now()
  const enCache = leerCache(ip, ahoraMs)
  if (enCache.hit) return enCache.valor
  // Sin presupuesto no se pregunta NI se cachea el «no»: la hora siguiente vuelve a haber cupo.
  if (!hayPresupuesto(ahoraMs)) return null

  for (const proveedor of PROVEEDORES) {
    try {
      const res = await fetch(proveedor.url(ip), {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept: 'application/json' },
      })
      if (!res.ok) continue
      const code = proveedor.leer(await res.json())
      // `XX` (desconocido) y `T1` (red Tor) no son países: se tratan como «no lo sé».
      if (code == null) continue
      const normalizado = code.toUpperCase().trim()
      if (normalizado.length !== 2 || normalizado === 'XX' || normalizado === 'T1') continue
      const resultado = { code: normalizado, proveedor: proveedor.nombre }
      guardarCache(ip, resultado, ahoraMs)
      return resultado
    } catch {
      // Tiempo agotado, DNS, corte de red o JSON ilegible: se prueba el siguiente proveedor.
    }
  }

  guardarCache(ip, null, ahoraMs)
  return null
}
