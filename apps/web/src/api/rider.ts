import {
  type Gender,
  type GeneratedName,
  type PublicRider,
  type RiderSummary,
  type UpcomingRace,
  type Vocation,
  createdRiderResponseSchema,
  generatedNameSchema,
  geoCountryResponseSchema,
  myRiderResponseSchema,
  okResponseSchema,
  resolveCountry,
  riderSummaryResponseSchema,
  upcomingRacesResponseSchema,
} from '@cyclingstar/shared'
import { z } from 'zod'
import { request, requestOptionalAuth } from './request'

export type { GeneratedName, RiderSummary, UpcomingRace }

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
export async function fetchGeoCountry(): Promise<string | null> {
  // 1) Cabecera del servidor (CF-IPCountry) si existe.
  try {
    const data = await request('/api/geo/country', geoCountryResponseSchema)
    if (data.country) return resolveCountry(data.country)
  } catch {
    // sigue con la API pública
  }

  // 2) API pública de geolocalización por IP, desde el navegador (ver aviso de arriba).
  try {
    const res = await fetch('https://ipwho.is/?fields=success,country_code')
    if (!res.ok) return null
    const parsed = ipWhoIsSchema.safeParse(await res.json())
    if (!parsed.success) return null
    const data = parsed.data
    if (data.success === false || !data.country_code) return null
    return resolveCountry(data.country_code.toUpperCase())
  } catch {
    return null
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
