/**
 * Distribuciones de probabilidad puras sobre un RNG sembrado (SPEC 6.1). Sin Date.now ni
 * Math.random: todo el azar entra por la función `rng` inyectada.
 */

export type Rng = () => number

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x))
}

export function uniform(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min)
}

/** Entero uniforme en [minInclusive, maxInclusive]. */
export function uniformInt(rng: Rng, minInclusive: number, maxInclusive: number): number {
  return minInclusive + Math.floor(rng() * (maxInclusive - minInclusive + 1))
}

/** Normal(mean, sd) por transformación de Box-Muller. */
export function normal(rng: Rng, mean: number, sd: number): number {
  let u = 0
  let v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  return mean + sd * z
}

/** Gamma(shape, escala 1) por el método de Marsaglia-Tsang. */
export function gamma(rng: Rng, shape: number): number {
  if (shape < 1) {
    return gamma(rng, shape + 1) * Math.pow(rng(), 1 / shape)
  }
  const d = shape - 1 / 3
  const c = 1 / Math.sqrt(9 * d)
  for (;;) {
    let x = 0
    let v = 0
    do {
      x = normal(rng, 0, 1)
      v = 1 + c * x
    } while (v <= 0)
    v = v * v * v
    const u = rng()
    if (u < 1 - 0.0331 * x * x * x * x) return d * v
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v
  }
}

/** Beta(a, b) = Ga/(Ga+Gb) con Ga~Gamma(a), Gb~Gamma(b). */
export function beta(rng: Rng, a: number, b: number): number {
  const ga = gamma(rng, a)
  const gb = gamma(rng, b)
  return ga / (ga + gb)
}

/** LogNormal(mu, sigma) = exp(Normal(mu, sigma)). */
export function logNormal(rng: Rng, mu: number, sigma: number): number {
  return Math.exp(normal(rng, mu, sigma))
}
