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
import { request, requestOptionalAuth } from './request'

export type { GeneratedName, RetireFromRaceResponse, RiderSummary, UpcomingRace }

/**
 * País preseleccionado por geolocalización de IP (Paso 14, SPEC 3.6).
 *
 * TODO lo hace el SERVIDOR (`/api/geo/country`). Antes había aquí una segunda vía que llamaba desde
 * el NAVEGADOR a `https://ipwho.is`, y en producción no funcionaba nunca: nuestra propia CSP
 * declara `connect-src 'self'`, así que el navegador cortaba la llamada antes de que saliera y el
 * jugador leía «ipwho.is: Failed to fetch». Un bloqueador de anuncios habría hecho lo mismo. Desde
 * el servidor no hay CSP que valga y la web no necesita hablar con nadie más que con nosotros
 * (misma solución que usa el repositorio HIS, donde esto no falla).
 *
 * Si el servidor tampoco lo sabe se devuelve `country: null` y el selector de país queda editable,
 * que es el comportamiento correcto: no es un error, es «no lo sé».
 */
/**
 * Lo que la detección ha visto, para poder decirlo en pantalla. El dueño, después del arreglo:
 * «sigue saliéndome esto… ahora con IP de Portugal… puedes poner que diga: Your country: … y que
 * diga cuál es tu country según la IP». Sin esto, «no te he detectado» es un callejón sin salida:
 * no se sabe si el despliegue no pone cabecera, si la pone en blanco, o si el que falla es el
 * servicio de geolocalización.
 */
export interface GeoDiagnosis {
  /** País jugable resuelto, o null si no se ha podido. */
  country: string | null
  /** De dónde salió: la cabecera de la red de delante o el servicio de geolocalización por IP. */
  via: 'cabecera' | 'servidor' | null
  /** Texto corto para la pantalla, ya legible. */
  detalle: string
}

export async function fetchGeoCountry(): Promise<GeoDiagnosis> {
  try {
    const data = await request('/api/geo/country', geoCountryResponseSchema)
    const cabeceras = data.cabeceras ?? {}
    const listadas = Object.entries(cabeceras)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')
    if (data.country) {
      // `fuente` es el nombre de la cabecera que acertó, o el del servicio que respondió.
      const porCabecera = listadas !== '' && data.fuente != null && data.fuente in cabeceras
      return {
        country: resolveCountry(data.country),
        via: porCabecera ? 'cabecera' : 'servidor',
        detalle: `${data.fuente ?? 'ip'}=${data.detectado ?? '?'} → ${data.country}`,
      }
    }
    const notas = listadas === '' ? 'no geo headers' : listadas
    return { country: null, via: null, detalle: `server: ${notas} · ip lookup: no country` }
  } catch (err) {
    return {
      country: null,
      via: null,
      detalle: `server: ${err instanceof Error ? err.message : 'failed'}`,
    }
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
