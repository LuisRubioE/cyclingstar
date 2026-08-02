import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { type Gender, seededRng } from '@cyclingstar/shared'

/**
 * Servicio de nombres (SPEC 3.6). Genera nombre y apellido de forma determinista a partir
 * de una semilla, ponderando por rango (los datasets están ordenados por frecuencia), y
 * evita colisiones con la lista de bloqueo de profesionales reales. Función regenerar
 * incluida. Node-only (lee JSON de packages/db/data); usa el RNG puro de @cyclingstar/shared.
 */

export interface CountryNames {
  country: string
  male: string[]
  female: string[]
  surnames: string[]
}

export interface GeneratedName {
  firstName: string
  surname: string
  fullName: string
}

const MAX_ATTEMPTS = 20

const countryCache = new Map<string, CountryNames>()
let blocklistCache: Set<string> | null = null

function dataPath(relative: string): string {
  return fileURLToPath(new URL(`../data/${relative}`, import.meta.url))
}

function loadCountry(country: string): CountryNames {
  const cc = country.toLowerCase()
  const cached = countryCache.get(cc)
  if (cached) return cached
  const parsed = JSON.parse(readFileSync(dataPath(`names/${cc}.json`), 'utf8')) as CountryNames
  countryCache.set(cc, parsed)
  return parsed
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function loadBlocklist(): Set<string> {
  if (blocklistCache) return blocklistCache
  const parsed = JSON.parse(readFileSync(dataPath('pro_blocklist.json'), 'utf8')) as {
    names: string[]
  }
  blocklistCache = new Set(parsed.names.map(normalize))
  return blocklistCache
}

/** ¿El nombre completo coincide con un profesional real de la lista de bloqueo? */
export function isBlockedName(fullName: string): boolean {
  return loadBlocklist().has(normalize(fullName))
}

/**
 * Índice ponderado por rango: los primeros elementos (más comunes) salen más. Peso 1/(i+1)
 * (Zipf), usando el RNG sembrado.
 */
function weightedIndex(rng: () => number, length: number, exp: number): number {
  let total = 0
  for (let i = 0; i < length; i++) total += 1 / (i + 1) ** exp
  let threshold = rng() * total
  for (let i = 0; i < length; i++) {
    threshold -= 1 / (i + 1) ** exp
    if (threshold <= 0) return i
  }
  return length - 1
}

function pick(list: string[], rng: () => number, exp: number): string {
  const value = list[weightedIndex(rng, list.length, exp)]
  if (value === undefined) {
    throw new Error('lista de nombres vacía')
  }
  return value
}

/** Genera un nombre determinista para una semilla, país y género, evitando la lista de bloqueo. */
export function generateName(
  seed: string,
  opts: { country: string; gender: Gender },
): GeneratedName {
  const data = loadCountry(opts.country)
  const firstNames = opts.gender === 'M' ? data.male : data.female

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = seededRng(`${seed}:${opts.country}:${opts.gender}:${attempt}`)
    // Nombre con algo de concentración (hay nombres comunes); apellido casi plano (más variedad,
    // menos colisiones de nombre completo entre los ~1.600 corredores).
    const firstName = pick(firstNames, rng, 0.7)
    const surname = pick(data.surnames, rng, 0.35)
    const fullName = `${firstName} ${surname}`
    if (!isBlockedName(fullName)) {
      return { firstName, surname, fullName }
    }
  }

  throw new Error('no se pudo generar un nombre fuera de la lista de bloqueo')
}

/** Regenera con una variante de la semilla (SPEC 3.6: botón "regenerar"). */
export function regenerateName(
  seed: string,
  opts: { country: string; gender: Gender },
  iteration: number,
): GeneratedName {
  return generateName(`${seed}#${iteration}`, opts)
}

/**
 * Genera un nombre único frente a `used` (nombre completo normalizado), reintentando con
 * variantes de la semilla. Muta `used` con el elegido. Puro; el espacio de nombres por país
 * es enorme, así que unas pocas decenas de intentos bastan para cientos de corredores.
 */
export function generateUniqueName(
  seed: string,
  opts: { country: string; gender: Gender },
  used: Set<string>,
): GeneratedName {
  for (let iteration = 0; iteration < 80; iteration++) {
    const generated =
      iteration === 0 ? generateName(seed, opts) : regenerateName(seed, opts, iteration)
    const key = normalize(generated.fullName)
    if (!used.has(key)) {
      used.add(key)
      return generated
    }
  }
  throw new Error('no se pudo generar un nombre único')
}
