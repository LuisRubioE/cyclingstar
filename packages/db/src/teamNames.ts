import { seededRng } from '@cyclingstar/shared'

/**
 * Nombres de equipo (SPEC 10). Generación determinista y sin colisiones: dos palabras
 * (prefijo + sufijo) y, si el hueco ya está ocupado, un topónimo delante como reserva que
 * garantiza unicidad. Se usa tanto en la génesis como en la reparación de duplicados.
 */

export const TEAM_PREFIX = [
  'Alpe',
  'Vento',
  'Astra',
  'Borealis',
  'Corsa',
  'Meridian',
  'Solaris',
  'Zenith',
  'Aquila',
  'Ferro',
  'Lumen',
  'Verde',
  'Onda',
  'Tramo',
  'Cima',
  'Rueda',
  'Nimbus',
  'Falco',
  'Orbita',
  'Sirocco',
] as const

export const TEAM_SUFFIX = [
  'Racing',
  'Cycling',
  'ProTeam',
  'Squadra',
  'Collective',
  'Continental',
  'Devo',
  'Sport',
] as const

/** Topónimos de reserva: si los dos-palabras chocan, se antepone uno para garantizar unicidad. */
const TEAM_CITY = [
  'Roubaix',
  'Bergamo',
  'Girona',
  'Innsbruck',
  'Utrecht',
  'Nantes',
  'Trento',
  'Bilbao',
  'Aarhus',
  'Bergen',
  'Porto',
  'Ljubljana',
  'Boulder',
  'Medellin',
  'Adelaide',
  'Freiburg',
  'Namur',
  'Sheffield',
  'Lucca',
  'Pamplona',
  'Grenoble',
  'Maastricht',
  'Como',
  'Vitoria',
  'Odense',
  'Trondheim',
  'Coimbra',
  'Kranj',
  'Asheville',
  'Cali',
] as const

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!
}

/**
 * Nombre de equipo único y con aspecto real, determinista a partir de `seed` y garantizado
 * fuera de `used` (comparación sin distinción de mayúsculas). Muta `used` con el nombre elegido.
 */
export function makeUniqueTeamName(seed: string, used: Set<string>): string {
  // 1) Dos palabras, reintentando con la semilla si el hueco está ocupado.
  for (let attempt = 0; attempt < 60; attempt++) {
    const rng = seededRng(`${seed}:team:${attempt}`)
    const name = `${pick(TEAM_PREFIX, rng)} ${pick(TEAM_SUFFIX, rng)}`
    if (!used.has(name.toLowerCase())) {
      used.add(name.toLowerCase())
      return name
    }
  }
  // 2) Reserva con topónimo delante: espacio mucho mayor, prácticamente siempre libre.
  for (const city of TEAM_CITY) {
    const rng = seededRng(`${seed}:teamcity:${city}`)
    const name = `${city} ${pick(TEAM_SUFFIX, rng)}`
    if (!used.has(name.toLowerCase())) {
      used.add(name.toLowerCase())
      return name
    }
  }
  // 3) Último recurso (inalcanzable en la práctica): sufijo numérico.
  let n = 2
  const rng = seededRng(`${seed}:teamlast`)
  const base = `${pick(TEAM_PREFIX, rng)} ${pick(TEAM_SUFFIX, rng)}`
  while (used.has(`${base} ${n}`.toLowerCase())) n++
  const name = `${base} ${n}`
  used.add(name.toLowerCase())
  return name
}
