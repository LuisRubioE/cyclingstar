import type { Gender, PublicRider, Vocation } from '@cyclingstar/shared'

export interface GeneratedName {
  firstName: string
  surname: string
  fullName: string
}

/** País preseleccionado por IP (Paso 14), o null si no hay cabecera de país. */
export async function fetchGeoCountry(): Promise<string | null> {
  const res = await fetch('/api/geo/country')
  if (!res.ok) return null
  const data = (await res.json()) as { country: string | null }
  return data.country
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
