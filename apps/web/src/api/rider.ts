import {
  type Gender,
  type GeneratedName,
  type PublicRider,
  type RetireFromRaceResponse,
  type RiderSummary,
  type UpcomingRace,
  type Vocation,
  createdRiderResponseSchema,
  generatedNameSchema,
  geoCountryResponseSchema,
  myRiderResponseSchema,
  okResponseSchema,
  resolveCountry,
  retireFromRaceResponseSchema,
  riderSummaryResponseSchema,
  upcomingRacesResponseSchema,
} from '@cyclingstar/shared'
import { z } from 'zod'
import { request, requestOptionalAuth } from './request'

export type { GeneratedName, RetireFromRaceResponse, RiderSummary, UpcomingRace }

/** Lo que ipwho.is devuelve y nos interesa (validado igual que cualquier otro borde de entrada). */
const ipWhoIsSchema = z.object({
  success: z.boolean().optional(),
  country_code: z.string().optional(),
})

/**
 * País preseleccionado por geolocalización de IP (Paso 14, SPEC 3.6).
 *
 * ⚠️ RIESGO CONOCIDO (funcionalidad de producto, se mantiene a propósito): el segundo intento
 * llama desde el NAVEGADOR a un tercero (https://ipwho.is), lo que implica:
 *  - Privacidad: la IP del jugador llega a un servicio externo sobre el que no tenemos control ni
 *    acuerdo de tratamiento. No persistimos nada, pero el tercero sí puede.
 *  - Disponibilidad: si el servicio cae, cambia de formato o mete rate-limit, esto falla.
 *  - CSP: cualquier `connect-src` restrictivo (o un bloqueador de anuncios) corta la petición.
 * Por eso TODO fallo es silencioso: se devuelve null y el selector de país queda editable, que es
 * el comportamiento correcto. Alternativa futura: resolver el país solo en el servidor (cabecera
 * CF-IPCountry o una base GeoIP propia) y eliminar la llamada del navegador.
 */
/**
 * Lo que la detección ha visto, para poder decirlo en pantalla. El dueño, después del arreglo:
 * «sigue saliéndome esto… ahora con IP de Portugal… puedes poner que diga: Your country: … y que
 * diga cuál es tu country según la IP». Sin esto, «no te he detectado» es un callejón sin salida:
 * no se sabe si el despliegue no pone cabecera, si la pone en blanco, o si el que falla es el
 * tercero del navegador.
 */
export interface GeoDiagnosis {
  /** País jugable resuelto, o null si no se ha podido. */
  country: string | null
  /** De dónde salió: la cabecera del servidor o la API pública del navegador. */
  via: 'cabecera' | 'navegador' | null
  /** Texto corto para la pantalla, ya legible. */
  detalle: string
}

export async function fetchGeoCountry(): Promise<GeoDiagnosis> {
  const notas: string[] = []

  // 1) Cabecera del servidor (CF-IPCountry) si existe.
  try {
    const data = await request('/api/geo/country', geoCountryResponseSchema)
    const cabeceras = data.cabeceras ?? {}
    const listadas = Object.entries(cabeceras)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')
    notas.push(`server: ${listadas === '' ? 'no geo headers' : listadas}`)
    if (data.country) {
      return {
        country: resolveCountry(data.country),
        via: 'cabecera',
        detalle: `${data.fuente ?? 'header'}=${data.detectado ?? '?'} → ${data.country}`,
      }
    }
  } catch (err) {
    notas.push(`server: ${err instanceof Error ? err.message : 'failed'}`)
  }

  // 2) API pública de geolocalización por IP, desde el navegador (ver aviso de arriba).
  try {
    const res = await fetch('https://ipwho.is/?fields=success,country_code')
    if (!res.ok) {
      notas.push(`ipwho.is: HTTP ${res.status}`)
      return { country: null, via: null, detalle: notas.join(' · ') }
    }
    const parsed = ipWhoIsSchema.safeParse(await res.json())
    if (!parsed.success) {
      notas.push('ipwho.is: unexpected response')
      return { country: null, via: null, detalle: notas.join(' · ') }
    }
    const data = parsed.data
    if (data.success === false || !data.country_code) {
      notas.push('ipwho.is: no country')
      return { country: null, via: null, detalle: notas.join(' · ') }
    }
    const code = data.country_code.toUpperCase()
    return {
      country: resolveCountry(code),
      via: 'navegador',
      detalle: `ipwho.is=${code} → ${resolveCountry(code) ?? '?'} · ${notas.join(' · ')}`,
    }
  } catch (err) {
    notas.push(`ipwho.is: ${err instanceof Error ? err.message : 'blocked'}`)
    return { country: null, via: null, detalle: notas.join(' · ') }
  }
}

export async function fetchGeneratedName(params: {
  country: string
  gender: Gender
  seed: string
}): Promise<GeneratedName> {
  const query = new URLSearchParams(params)
  return request(`/api/names/generate?${query.toString()}`, generatedNameSchema, {
    errorMessage: 'Could not generate a name.',
  })
}

/** El ciclista del usuario. Sin sesión (401) devuelve null: la home pública también lo pide. */
export async function fetchMyRider(): Promise<PublicRider | null> {
  const data = await requestOptionalAuth('/api/riders/me', myRiderResponseSchema, {
    errorMessage: 'Could not load your rider.',
  })
  return data?.rider ?? null
}

/** Próximas carreras (y en curso) del ciclista del jugador. */
export async function fetchMyUpcomingRaces(): Promise<UpcomingRace[]> {
  const data = await requestOptionalAuth(
    '/api/riders/me/upcoming-races',
    upcomingRacesResponseSchema,
    { errorMessage: 'Could not load your upcoming races.' },
  )
  return data?.races ?? []
}

/**
 * RETIRARSE de una carrera por etapas en marcha (docs/motor.md §V.5). No se deshace, así que quien
 * llame tiene que haber pedido confirmación antes.
 */
export async function retireFromRace(raceKey: string): Promise<RetireFromRaceResponse> {
  return await request(
    `/api/riders/me/races/${encodeURIComponent(raceKey)}/retire`,
    retireFromRaceResponseSchema,
    { method: 'POST', errorMessage: 'Could not withdraw from the race.' },
  )
}

export async function fetchRiderSummary(): Promise<RiderSummary | null> {
  const data = await requestOptionalAuth('/api/riders/me/summary', riderSummaryResponseSchema, {
    errorMessage: 'Could not load your rider summary.',
  })
  return data?.summary ?? null
}

export interface CreateRiderBody {
  vocation: Vocation
  gender: Gender
  country: string
  nameSeed: string
}

export async function createRider(body: CreateRiderBody): Promise<{ id: string }> {
  const data = await request('/api/riders', createdRiderResponseSchema, {
    method: 'POST',
    json: body,
    errorMessage: 'Could not create your rider.',
  })
  return { id: data.id }
}

/** Cambia la vocación declarada del corredor (la etiqueta). */
export async function setArchetype(archetype: Vocation): Promise<void> {
  await request('/api/riders/me/archetype', okResponseSchema, {
    method: 'PUT',
    json: { archetype },
    errorMessage: 'Could not change your role.',
  })
}
