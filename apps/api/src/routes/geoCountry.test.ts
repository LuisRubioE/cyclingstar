import { resolveCountry } from '@cyclingstar/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../app.js'
import {
  type GeoIpLookup,
  esIpNoEnrutable,
  limpiarCacheGeoIp,
  lookupCountryByIp,
} from '../geoIp.js'

/**
 * EL PAÍS POR IP, Y LO QUE PASA CUANDO NO SE SABE (v58).
 *
 * El dueño entró sin cuenta desde una IP española y la pantalla le dijo que el juego no estaba
 * disponible en su país. España está soportada; lo que falló fue la detección. Estas pruebas sellan
 * las dos mitades de la regla: un código que llega se resuelve a un país jugable, y uno que NO es un
 * país —lo que Cloudflare manda cuando no lo sabe— no se convierte en uno por el camino.
 */
describe('el país por IP', () => {
  it('un país soportado se queda como está', () => {
    expect(resolveCountry('ES')).toBe('ES')
    expect(resolveCountry('es')).toBe('ES')
  })

  it('un país sin datos cae en el más cercano, no en la nada', () => {
    // El Vaticano no tiene lista de nombres propia: sus corredores son italianos.
    expect(resolveCountry('VA')).toBe('IT')
  })

  it('sin código no hay país: es «no lo sé», y la pantalla tiene que preguntar', () => {
    expect(resolveCountry(null)).toBeNull()
    expect(resolveCountry('')).toBeNull()
  })
})

/**
 * LA RUTA, ENTERA (v59). Lo que el jugador veía en producción era esto:
 *
 *   «Your country: not detected — server: no geo headers · ipwho.is: Failed to fetch»
 *
 * Dos fallos encadenados: Railway no pone cabecera de país, y la llamada de reserva la hacía el
 * NAVEGADOR contra un tercero, cosa que nuestra propia CSP (`connect-src 'self'`) prohíbe. Ahora la
 * reserva la hace el servidor. Estas pruebas sellan las tres salidas: cabecera, IP y «no lo sé».
 */
describe('api: /api/geo/country', () => {
  function buildGeoApp(lookup: GeoIpLookup) {
    return buildApp({ migrationsApplied: true, serveWeb: false, geoLookup: lookup })
  }

  it('la cabecera de la red de delante manda, y no se consulta a nadie de fuera', async () => {
    let consultas = 0
    const app = buildGeoApp(async () => {
      consultas += 1
      return { code: 'FR', proveedor: 'ipapi.co' }
    })
    const res = await app.inject({
      method: 'GET',
      url: '/api/geo/country',
      headers: { 'cf-ipcountry': 'ES' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ country: 'ES', detectado: 'ES', fuente: 'cf-ipcountry' })
    expect(consultas).toBe(0)
    await app.close()
  })

  it('sin cabecera, el país sale de la IP: esto es lo que estaba roto', async () => {
    const app = buildGeoApp(async () => ({ code: 'PT', proveedor: 'ipapi.co' }))
    const res = await app.inject({ method: 'GET', url: '/api/geo/country' })
    expect(res.json()).toMatchObject({ country: 'PT', detectado: 'PT', fuente: 'ipapi.co' })
    await app.close()
  })

  it('`XX` de Cloudflare no es un país: se pasa a la IP en vez de inventarse uno', async () => {
    const app = buildGeoApp(async () => ({ code: 'IT', proveedor: 'ipinfo.io' }))
    const res = await app.inject({
      method: 'GET',
      url: '/api/geo/country',
      headers: { 'cf-ipcountry': 'XX' },
    })
    expect(res.json()).toMatchObject({
      country: 'IT',
      fuente: 'ipinfo.io',
      cabeceras: { 'cf-ipcountry': 'XX' },
    })
    await app.close()
  })

  it('si nadie sabe el país, se dice que no se sabe (la pantalla lo pregunta)', async () => {
    const app = buildGeoApp(async () => null)
    const res = await app.inject({ method: 'GET', url: '/api/geo/country' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ country: null, detectado: null, fuente: null })
    await app.close()
  })
})

/** La criba de IPs que no tiene sentido preguntar (misma que hace HIS antes de llamar). */
describe('la IP que se consulta', () => {
  it('no se pregunta por IPs locales ni privadas: solo gastaría cupo', () => {
    for (const ip of [
      '',
      '127.0.0.1',
      '::1',
      '10.0.0.4',
      '192.168.1.9',
      '172.20.3.1',
      '::ffff:127.0.0.1',
    ]) {
      expect(esIpNoEnrutable(ip)).toBe(true)
    }
  })

  it('una IP pública sí se pregunta', () => {
    expect(esIpNoEnrutable('81.44.12.9')).toBe(false)
    expect(esIpNoEnrutable('::ffff:81.44.12.9')).toBe(false)
    expect(esIpNoEnrutable('2a02:26f7::1')).toBe(false)
  })
})

/** El proveedor: orden, caché y qué se considera una respuesta creíble. */
describe('la consulta al servicio de geolocalización', () => {
  const original = globalThis.fetch

  beforeEach(() => {
    limpiarCacheGeoIp()
  })

  afterEach(() => {
    globalThis.fetch = original
  })

  function stubFetch(respuestas: Record<string, unknown>) {
    const llamadas: string[] = []
    globalThis.fetch = (async (url: string | URL) => {
      const href = String(url)
      llamadas.push(href)
      const clave = Object.keys(respuestas).find((k) => href.includes(k))
      if (clave === undefined) throw new Error('red caída')
      return new Response(JSON.stringify(respuestas[clave]), {
        headers: { 'content-type': 'application/json' },
      })
    }) as typeof fetch
    return llamadas
  }

  it('el primero que contesta gana y no se molesta a los demás', async () => {
    const llamadas = stubFetch({ 'ipinfo.io': { country: 'es' } })
    expect(await lookupCountryByIp('81.44.12.9')).toEqual({ code: 'ES', proveedor: 'ipinfo.io' })
    expect(llamadas).toHaveLength(1)
  })

  it('si uno falla se pasa al siguiente, hasta agotar los tres', async () => {
    stubFetch({ 'ipinfo.io': {}, 'ipwho.is': { success: true, country_code: 'PT' } })
    expect(await lookupCountryByIp('81.44.12.9')).toEqual({ code: 'PT', proveedor: 'ipwho.is' })

    limpiarCacheGeoIp()
    // `{ error: true }` con HTTP 200 es lo que devuelve ipapi.co cuando agota el cupo: no es un país.
    stubFetch({
      'ipinfo.io': {},
      'ipwho.is': { success: false },
      'ipapi.co': { country_code: 'IT' },
    })
    expect(await lookupCountryByIp('81.44.12.9')).toEqual({ code: 'IT', proveedor: 'ipapi.co' })

    limpiarCacheGeoIp()
    stubFetch({ 'ipinfo.io': {}, 'ipwho.is': {}, 'ipapi.co': { error: true } })
    expect(await lookupCountryByIp('81.44.12.9')).toBeNull()
  })

  it('la misma IP no se pregunta dos veces: el cupo gratuito es del que llama, o sea nuestro', async () => {
    const llamadas = stubFetch({ 'ipinfo.io': { country: 'ES' } })
    await lookupCountryByIp('81.44.12.9')
    await lookupCountryByIp('81.44.12.9')
    expect(llamadas).toHaveLength(1)
  })

  it('si todos fallan, es null y no se rompe la petición', async () => {
    stubFetch({})
    expect(await lookupCountryByIp('81.44.12.9')).toBeNull()
  })

  /**
   * `X-Forwarded-For` es falsificable, así que rotarla salta la caché y nos gasta el cupo del
   * proveedor. El techo por hora corta eso: se deja de preguntar y la pantalla pregunta a mano.
   */
  it('hay un techo de consultas por hora: pasado, se responde «no lo sé» en vez de gastar cupo', async () => {
    const llamadas = stubFetch({ 'ipinfo.io': { country: 'ES' } })
    // Cada IP distinta es una consulta real; el presupuesto es de 500 por hora.
    for (let i = 0; i < 500; i += 1) {
      expect(await lookupCountryByIp(`81.44.12.${i % 256}.${i}`)).not.toBeNull()
    }
    expect(llamadas).toHaveLength(500)
    expect(await lookupCountryByIp('90.1.2.3')).toBeNull()
    expect(llamadas).toHaveLength(500)
    // Lo ya cacheado sigue respondiendo: el techo solo frena las consultas NUEVAS.
    expect(await lookupCountryByIp('81.44.12.0.0')).toEqual({ code: 'ES', proveedor: 'ipinfo.io' })
    expect(llamadas).toHaveLength(500)
  })
})
