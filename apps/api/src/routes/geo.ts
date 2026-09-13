import { resolveCountry } from '@cyclingstar/shared'
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { type GeoIpLookup, lookupCountryByIp } from '../geoIp.js'

export interface GeoRouteContext {
  /** Resolución de país por IP; se inyecta en las pruebas para no salir a la red. */
  lookup?: GeoIpLookup
}

/**
 * Cabeceras de geolocalización que pone la red que tengamos delante. Tras Cloudflare llega en
 * `CF-IPCountry`, pero ése no es el único sitio: cada capa pone la suya. Se miran todas porque son
 * gratis e instantáneas; si alguna acierta, no hace falta molestar a nadie de fuera.
 *
 * `XX` es lo que Cloudflare manda cuando NO sabe de dónde viene (y `T1` para la red Tor): no es un
 * país, así que no se resuelve —si se dejara pasar, el fallback lo convertiría en Francia—.
 */
const CABECERAS = [
  'cf-ipcountry',
  'x-vercel-ip-country',
  'x-geo-country',
  'x-country-code',
  'fastly-client-country',
] as const

/** Lee las cabeceras de geolocalización: devuelve el primer código válido y todas las vistas. */
function leerCabeceras(request: FastifyRequest): {
  code: string | null
  fuente: string | null
  vistas: Record<string, string>
} {
  let code: string | null = null
  let fuente: string | null = null
  /**
   * …Y SE CUENTA QUÉ SE HA VISTO (v58). El dueño siguió viendo el mensaje del país después del
   * arreglo, y pidió que la pantalla diga qué país cree que es. Sin esto la respuesta es un `null`
   * mudo y no hay forma de saber si el despliegue no pone la cabecera, si la pone con `XX`, o si
   * la pone bien y quien falla es lo de después.
   *
   * Se devuelven SOLO las cabeceras de geolocalización, con su nombre y su valor. Ninguna de ellas
   * identifica a nadie —son un código de país de dos letras—, así que esto no expone al que mira.
   */
  const vistas: Record<string, string> = {}
  for (const nombre of CABECERAS) {
    const raw = request.headers[nombre]
    const valor = typeof raw === 'string' ? raw.toUpperCase().trim() : null
    if (valor) vistas[nombre] = valor
    if (valor && valor.length === 2 && valor !== 'XX' && valor !== 'T1' && code === null) {
      code = valor
      fuente = nombre
    }
  }
  return { code, fuente, vistas }
}

/**
 * PAÍS POR IP (Paso 14, arreglado en v59). Dos vías, en este orden:
 *
 *  1. Las cabeceras de la red de delante: gratis, instantáneas, sin terceros. Hoy Railway no pone
 *     ninguna, pero el día que haya un Cloudflare delante esto empieza a acertar solo.
 *  2. La consulta a un servicio de geolocalización por IP, HECHA DESDE EL SERVIDOR (ver geoIp.ts).
 *     Ésta es la que arregla el fallo: la versión anterior la hacía el navegador y nuestra propia
 *     CSP (`connect-src 'self'`) la cortaba siempre, con el resultado que veía el jugador:
 *     «not detected — server: no geo headers · ipwho.is: Failed to fetch».
 *
 * Si las dos fallan, se devuelve `country: null` y la pantalla pregunta el país a mano. Eso no es
 * un error: es la salida honesta cuando de verdad no se sabe.
 *
 * La ruta va FUERA de las rutas de juego (no necesita sesión ni base de datos): la pide la pantalla
 * de creación de corredor, que es de lo primero que ve alguien que aún no tiene nada.
 */
export const geoRoutes: FastifyPluginAsync<GeoRouteContext> = async (app, ctx) => {
  const lookup = ctx.lookup ?? lookupCountryByIp

  app.get('/api/geo/country', async (request) => {
    const { code, fuente, vistas } = leerCabeceras(request)
    if (code) {
      return { country: resolveCountry(code), detectado: code, fuente, cabeceras: vistas }
    }

    /**
     * La IP del cliente. `trustProxy` está activo (app.ts), así que Fastify ya la saca de
     * `X-Forwarded-For` en vez de darnos la del proxy de Railway. Es falsificable por quien quiera
     * molestarse, y da igual: esto solo PRESELECCIONA un desplegable que el jugador puede cambiar;
     * no es un control de acceso ni decide nada del juego.
     */
    const encontrado = await lookup(request.ip)
    return {
      country: resolveCountry(encontrado?.code ?? null),
      detectado: encontrado?.code ?? null,
      fuente: encontrado?.proveedor ?? null,
      cabeceras: vistas,
    }
  })
}
