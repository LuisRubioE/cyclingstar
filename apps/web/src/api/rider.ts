import { type Gender, type PublicRider, type Vocation, isKnownCountry } from '@cyclingstar/shared'

export interface GeneratedName {
  firstName: string
  surname: string
  fullName: string
}

/**
 * País preseleccionado por geolocalización de IP (Paso 14, SPEC 3.6). Se resuelve desde el
 * navegador con una API pública gratuita (sin Cloudflare); si nuestro servidor recibe la
 * cabecera CF-IPCountry (por si algún día hay proxy delante), se usa como primera opción.
 * La IP no se persiste. Devuelve null si no se puede determinar (el selector es editable).
 */
export async function fetchGeoCountry(): Promise<string | null> {
  // 1) Cabecera del servidor (CF-IPCountry) si existe.
  try {
    const res = await fetch('/api/geo/country')
    if (res.ok) {
      const data = (await res.json()) as { country: string | null }
      if (data.country && isKnownCountry(data.country)) return data.country.toUpperCase()
    }
  } catch {
    // sigue con la API pública
  }

  // 2) API pública de geolocalización por IP (país + coordenadas), desde el navegador.
  try {
    const res = await fetch('https://ipwho.is/?fields=success,country_code')
    if (!res.ok) return null
    const data = (await res.json()) as { success?: boolean; country_code?: string }
    if (data.success === false || !data.country_code) return null
    const code = data.country_code.toUpperCase()
    return isKnownCountry(code) ? code : null
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
  const res = await fetch(`/api/names/generate?${query.toString()}`)
  if (!res.ok) throw new Error('Could not generate a name.')
  return (await res.json()) as GeneratedName
}

export async function fetchMyRider(): Promise<PublicRider | null> {
  const res = await fetch('/api/riders/me')
  if (res.status === 401) return null
  if (!res.ok) throw new Error('Could not load your rider.')
  const data = (await res.json()) as { rider: PublicRider | null }
  return data.rider
}

export interface CreateRiderBody {
  vocation: Vocation
  gender: Gender
  country: string
  nameSeed: string
}

export async function createRider(body: CreateRiderBody): Promise<{ id: string }> {
  const res = await fetch('/api/riders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as { id?: string; error?: string }
  if (!res.ok || !data.id) {
    throw new Error(data.error ?? 'Could not create your rider.')
  }
  return { id: data.id }
}
