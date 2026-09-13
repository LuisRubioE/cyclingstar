/**
 * Generador de perfiles de etapa realistas y deterministas (Paso 34+). Los constructores antiguos
 * daban un perfil tosco (relleno llano + uno o dos puertos de pendiente constante), que se dibujaba
 * como dos o tres triángulos. Aquí generamos terreno DETALLADO: el llano nunca es una línea recta
 * sino que ondula suavemente, y cada puerto se parte en varias rampas de pendiente variable (más
 * suave abajo, más dura arriba), con sus bajadas — como un perfil de etapa de verdad. Todo es puro y
 * determinista (semilla por etapa), así que la misma etapa dibuja siempre el mismo perfil, y el motor
 * corre exactamente lo que se ve (los tramos alimentan la física, SPEC 6.2/6.4).
 */
import { ROUTE } from '../constants.js'
import type { Ramp, Segment } from '../stage/types.js'
import type { FinalKind } from './finalKind.js'

/** Hash entero estable (FNV-1a) de una cadena, para sembrar de forma determinista. */
function hashInt(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * PRNG determinista (mulberry32). Se exporta porque la COMPOSICIÓN de una vuelta por etapas
 * (`routes/calendar.ts::stageMix`) necesita el mismo azar sembrado que los perfiles: qué etapas
 * tiene una carrera es tan de autoría como el dibujo de cada una, y las dos cosas deben salir
 * siempre iguales para la misma carrera.
 */
export function routeRng(seed: string): () => number {
  return rng(seed)
}

/** PRNG determinista (mulberry32). */
function rng(seed: string): () => number {
  let a = hashInt(seed) >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Número real en [min, max). */
function between(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min)
}

/** Reparte `total` km en `n` trozos positivos con algo de variación (suman exactamente `total`). */
function split(rand: () => number, total: number, n: number): number[] {
  if (n <= 1) return [total]
  const weights = Array.from({ length: n }, () => between(rand, 0.7, 1.3))
  const sum = weights.reduce((a, b) => a + b, 0)
  const parts = weights.map((w) => (w / sum) * total)
  // Redondea a 1 decimal y ajusta el último para cuadrar la suma exacta.
  const rounded = parts.map((p) => Math.max(0.5, Math.round(p * 10) / 10))
  const diff = Math.round((total - rounded.reduce((a, b) => a + b, 0)) * 10) / 10
  rounded[rounded.length - 1] = Math.max(
    0.5,
    Math.round((rounded[rounded.length - 1]! + diff) * 10) / 10,
  )
  return rounded
}

/**
 * Un puerto de `len` km a una pendiente media `avg`%: se parte en varias rampas de pendiente variable
 * alrededor de la media (nunca por debajo de 1%), más duras hacia la cima. Devuelve el segmento tipo
 * 'puerto' con sus tramos (de ahí sale la categoría de la cima y la física del motor).
 */
function climb(rand: () => number, len: number, avg: number): Segment {
  const n = Math.max(2, Math.round(len / 2.2))
  const lens = split(rand, len, n)
  const tramos: Ramp[] = lens.map((km, i) => {
    // Rampa más dura hacia el final del puerto (progresión típica) + ruido.
    const prog = (i / Math.max(1, n - 1) - 0.5) * 2 // -1..+1
    const g = Math.max(1, avg + prog * 1.6 + between(rand, -1.2, 1.2))
    return { km, g: Math.round(g * 10) / 10 }
  })
  return { km: Math.round(len * 10) / 10, tipo: 'puerto', tramos }
}

/** Una bajada de `len` km a una pendiente media `avg`% (negativa), en varias rampas. */
function descent(rand: () => number, len: number, avg: number): Segment {
  const n = Math.max(2, Math.round(len / 3))
  const lens = split(rand, len, n)
  const tramos: Ramp[] = lens.map((km) => ({
    km,
    g: -Math.round(Math.max(2, avg + between(rand, -1.5, 1.5)) * 10) / 10,
  }))
  return { km: Math.round(len * 10) / 10, tipo: 'descenso', tramos }
}

/**
 * Terreno ondulado suave a lo largo de `km`: una sucesión de tramos llanos con pendientes pequeñas
 * (±1..3%) que sube y baja, para que el perfil nunca sea una línea recta. Reparte en segmentos de
 * ~3-6 km. `bumpy` (media montaña) sube un poco la amplitud.
 */
function rolling(rand: () => number, km: number, bumpy = false): Segment[] {
  if (km <= 0.5) return []
  const chunk = between(rand, 3, 6)
  const n = Math.max(1, Math.round(km / chunk))
  const lens = split(rand, km, n)
  const amp = bumpy ? 3.2 : 1.8
  return lens.map((segKm, i): Segment => {
    const half = Math.round((segKm / 2) * 10) / 10
    const rest = Math.round((segKm - half) * 10) / 10
    const g = between(rand, 0.8, amp) * (i % 2 === 0 ? 1 : -1)
    const gg = Math.round(g * 10) / 10
    const tramos: Ramp[] =
      rest > 0.1
        ? [
            { km: half, g: gg },
            { km: rest, g: -Math.round(gg * between(rand, 0.6, 1) * 10) / 10 },
          ]
        : [{ km: segKm, g: gg }]
    // Algún repecho marcado como rompepiernas en media montaña, para dureza y variedad.
    const tipo: Segment['tipo'] = bumpy && rand() < 0.35 ? 'rompepiernas' : 'llano'
    return { km: Math.round(segKm * 10) / 10, tipo, tramos }
  })
}

/**
 * CUADRA LOS KM SIN ESTIRAR UN SEGMENTO (v64, docs/tactica.md paso 1b).
 *
 * **Lo que hacía antes era meter TODA la diferencia en el ÚLTIMO segmento**, y en una etapa reina el
 * último segmento es el PUERTO FINAL. O sea que una reina de 180 km cuyos segmentos suman 171 se
 * cuadraba alargando nueve kilómetros la subida de meta: un puerto de 12 km pasaba a 21, con las
 * mismas rampas repartidas, y la etapa dejaba de ser la que el generador había decidido.
 *
 * No era un redondeo: era hasta un 5 % de la etapa entera cayendo siempre en el sitio donde más
 * decide. Y los `tramos` del puerto NO se reescalaban, así que el segmento acababa declarando 21 km
 * con 12 km de rampas dentro, que es una incoherencia que el muestreo se tragaba en silencio.
 *
 * Ahora el ajuste se reparte **proporcionalmente entre todos los segmentos** (`km_i · target/sum`) y
 * los `tramos` de cada uno se reescalan con él, así que la FORMA del perfil se conserva y solo
 * cambia su escala. El residuo del redondeo va al segmento **más largo** —donde un decimal no
 * cambia nada— y nunca al último, que es justo el que no hay que tocar.
 */
function normalize(segments: Segment[], target: number): Segment[] {
  const sum = segments.reduce((a, s) => a + s.km, 0)
  if (segments.length === 0 || sum <= 0) return segments
  const factor = target / sum
  const escalados = segments.map((s): Segment => {
    const km = Math.max(0.5, Math.round(s.km * factor * 10) / 10)
    if (s.tramos === undefined) return { ...s, km }
    // Los tramos se reescalan con el segmento: un puerto que declara 13 km tiene que llevar 13 km
    // de rampas dentro, no los 12 con los que nació.
    const k = s.km > 0 ? km / s.km : 1
    return { ...s, km, tramos: s.tramos.map((t) => ({ ...t, km: Math.round(t.km * k * 10) / 10 })) }
  })
  const tras = escalados.reduce((a, s) => a + s.km, 0)
  const residuo = Math.round((target - tras) * 10) / 10
  if (Math.abs(residuo) >= 0.1) {
    // Al MÁS LARGO: un decimal sobre doce kilómetros no cambia nada; sobre el puerto de meta, sí.
    let iMax = 0
    for (let i = 1; i < escalados.length; i++) {
      if (escalados[i]!.km > escalados[iMax]!.km) iMax = i
    }
    const s = escalados[iMax]!
    const km = Math.max(0.5, Math.round((s.km + residuo) * 10) / 10)
    escalados[iMax] =
      s.tramos === undefined
        ? { ...s, km }
        : {
            ...s,
            km,
            tramos: s.tramos.map((t, i) =>
              i === s.tramos!.length - 1
                ? { ...t, km: Math.max(0.1, Math.round((t.km + residuo) * 10) / 10) }
                : t,
            ),
          }
  }
  return escalados
}

/**
 * GARANTIZA QUE EL PUERTO MÁS LARGO CAIGA DONDE EL GENERADOR PROMETE (v64).
 *
 * `stageKindOf` decide el tipo de etapa con un umbral duro: un puerto de **8,5 km o más** es alta
 * montaña. O sea que el generador de reinas tiene que producir una reina y el de media montaña una
 * media, y con el `normalize()` proporcional eso dejó de estar garantizado: el reescalado mueve las
 * longitudes y un puerto puede cruzar el umbral en cualquiera de los dos sentidos. Medido en
 * `stageKind.test.ts` con `mountain 130` y `hillyUphill 175`.
 *
 * **Va DESPUÉS de `normalize()` a propósito**: ponerlo antes no sirve de nada, porque el reescalado
 * se lo lleva por delante. Los km que se le dan o se le quitan al puerto se le quitan o se le dan al
 * segmento LLANO más largo, así que la etapa conserva su longitud exacta.
 */
function garantizaPuerto(segments: Segment[], min: number | null, max: number | null): Segment[] {
  const iPuerto = segments.reduce(
    (mx, s, i) => (s.tipo === 'puerto' && s.km > (segments[mx]?.km ?? -1) ? i : mx),
    -1,
  )
  if (iPuerto < 0) return segments
  const puerto = segments[iPuerto]!
  const objetivo =
    min !== null && puerto.km < min ? min : max !== null && puerto.km > max ? max : null
  if (objetivo === null) return segments

  const delta = Math.round((objetivo - puerto.km) * 10) / 10
  // El llano más largo es de donde salen (o a donde van) los kilómetros: es el único sitio donde
  // mover un kilómetro no cambia la carrera.
  let iLlano = -1
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i]!
    if (s.tipo === 'puerto') continue
    if (iLlano < 0 || s.km > segments[iLlano]!.km) iLlano = i
  }
  if (iLlano < 0 || segments[iLlano]!.km - delta < 1) return segments

  const escalaTramos = (s: Segment, km: number): Segment =>
    s.tramos === undefined
      ? { ...s, km }
      : {
          ...s,
          km,
          tramos: s.tramos.map((t) => ({
            ...t,
            km: Math.max(0.1, Math.round(t.km * (km / s.km) * 10) / 10),
          })),
        }

  const out = [...segments]
  out[iPuerto] = escalaTramos(puerto, objetivo)
  out[iLlano] = escalaTramos(
    segments[iLlano]!,
    Math.round((segments[iLlano]!.km - delta) * 10) / 10,
  )
  return out
}

/** Etapa llana: ondula suavemente con algún repecho, final para esprínter. */
export function flatSegments(km: number, seed: string): Segment[] {
  const rand = rng(seed)
  const segs = rolling(rand, km, false)
  return normalize(segs, km)
}

/** Media montaña: base ondulada con 2-3 cotas (cat 3/2) y sus bajadas, final quebrado. */
export function hillySegments(km: number, seed: string): Segment[] {
  const rand = rng(seed)
  const nClimbs = km > 170 ? 3 : 2
  const climbs = Array.from({ length: nClimbs }, () => ({
    len: between(rand, 3, 7),
    g: between(rand, 4.5, 6.5),
  }))
  const used = climbs.reduce((a, c) => a + c.len, 0) + climbs.length * 4 // + bajadas ~4km
  const fill = Math.max(km * 0.35, km - used)
  const gaps = split(rand, fill, nClimbs + 1)
  const segs: Segment[] = []
  segs.push(...rolling(rand, gaps[0]!, true))
  climbs.forEach((c, i) => {
    segs.push(climb(rand, c.len, c.g))
    if (i < nClimbs - 1) segs.push(descent(rand, between(rand, 3, 5), 5))
    segs.push(...rolling(rand, gaps[i + 1]!, true))
  })
  return normalize(segs, km)
}

/**
 * Media montaña con FINAL EN ALTO: la misma base ondulada con sus cotas intermedias, pero la etapa
 * NO baja al valle: muere arriba de una cota de 4-8 km al 5-7,5%. Es la etapa que faltaba en el
 * generador —toda la media montaña acababa en llano, así que se resolvía al sprint igual que una
 * llana— y la que da algo que morder a una vuelta corta sin alta montaña (docs/balance.md, v10).
 */
export function hillyUphillSegments(km: number, seed: string): Segment[] {
  const rand = rng(seed)
  const nClimbs = km > 170 ? 2 : 1
  const climbs = Array.from({ length: nClimbs }, () => ({
    len: between(rand, 3, 7),
    g: between(rand, 4.5, 6.5),
  }))
  // 7,5 y no 8: `stageKindOf` llama REINA a todo lo que tenga un puerto de 8,5 km, y con el
  // `normalize()` proporcional de la v64 los segmentos se reescalan —hacia arriba cuando la suma se
  // queda corta por redondeo—, así que un final de 8 km podía cruzar la puerta y convertir una media
  // montaña en reina. Medido: `hillyUphill 175 semilla-5`. Un kilómetro de holgura lo impide.
  const finalLen = between(rand, 4, 7.5)
  const finalG = between(rand, 5, 7.5)
  const used = climbs.reduce((a, c) => a + c.len, 0) + nClimbs * 4 + finalLen
  const fill = Math.max(km * 0.3, km - used)
  const gaps = split(rand, fill, nClimbs + 1)
  const segs: Segment[] = []
  segs.push(...rolling(rand, gaps[0]!, true))
  climbs.forEach((c, i) => {
    segs.push(climb(rand, c.len, c.g))
    segs.push(descent(rand, between(rand, 3, 5), 5))
    segs.push(...rolling(rand, gaps[i + 1]!, true))
  })
  // La cota final: sin bajada ni llano detrás, la meta está en su cima.
  segs.push(climb(rand, finalLen, finalG))
  // …y una media montaña tiene que seguir siendo media: por encima de 8,5 km `stageKindOf` la
  // llamaría reina, y el calendario se quedaría sin la etapa que pidió.
  return garantizaPuerto(normalize(segs, km), null, 8.4)
}

/**
 * ETAPA REINA, CON EL DESNIVEL Y EL FINAL DECIDIDOS (v64, docs/tactica.md R28.1 y R28.2).
 *
 * **Antes el desnivel era una consecuencia**: se sorteaban dos o tres puertos con su longitud y su
 * pendiente, y lo que subiera la etapa era lo que saliera. Y el final era SIEMPRE en alto, porque el
 * último segmento era el puerto y detrás no había nada.
 *
 * Ahora las dos cosas se deciden, que es como se diseña una vuelta de verdad: el director elige
 * cuánto va a subir la etapa y dónde corona el último puerto, y después dibuja por dónde.
 *
 * - **`dPlusTarget`**: el 60 % de las reinas sale del rango alto (2.600-4.600 m) **muestreado
 *   uniforme EN LOGARITMO** —no en lineal— para que la densidad no se acumule arriba; el otro 40 %
 *   sale de la cola baja (1.200-2.500 m), que existe porque `calendarQueens.test.ts` afirma en tres
 *   líneas duras que la banda de <1.500 m no se queda vacía.
 * - **`finalKind`**: sorteado de `ROUTE.queenFinalMix`. Con `alto` la etapa muere en la cima, como
 *   siempre; con los otros tres, detrás del último puerto van una bajada y el valle que toque.
 *
 * Una tirada más de `routeRng` por reina, así que **todos los perfiles de montaña del calendario
 * cambian**. Es a propósito, y por eso este paso sube `ENGINE_VERSION`.
 */
export interface MountainOptions {
  dPlusTarget?: number
  finalKind?: FinalKind
}

/** Cuánto sube un puerto de `len` km al `g` %: es la cuenta con la que se persigue el objetivo. */
function dPlusOf(lenKm: number, gradient: number): number {
  return lenKm * 1000 * (gradient / 100)
}

/** Los km de valle que toca dejar tras la última cima, según el tipo de final. */
function valleyKmFor(kind: FinalKind, rand: () => number): number {
  if (kind === 'alto') return 0
  if (kind === 'cima_cerca') return between(rand, 1.5, 5)
  if (kind === 'valle_corto') return between(rand, 6, 20)
  return between(rand, 22, 45)
}

export function mountainSegments(km: number, seed: string, opts: MountainOptions = {}): Segment[] {
  const rand = rng(seed)
  const midClimbs = km > 165 ? 3 : 2

  /**
   * El objetivo de desnivel y el tipo de final, sorteados ANTES que los puertos: son las dos
   * decisiones de las que todo lo demás cuelga.
   */
  const alto = rand() < ROUTE.queenHighDplusShare
  const dPlusTarget =
    opts.dPlusTarget ??
    (alto
      ? // Uniforme en LOGARITMO: en lineal, la mitad de las reinas caería por encima de 3.600 m y la
        // distribución del calendario se iría toda al extremo duro.
        Math.exp(
          between(rand, Math.log(ROUTE.queenDplusRange.min), Math.log(ROUTE.queenDplusRange.max)),
        )
      : between(rand, ROUTE.queenLowDplusRange.min, ROUTE.queenLowDplusRange.max))
  const finalKind = opts.finalKind ?? sampleFinalKind(rand)
  const valleKm = valleyKmFor(finalKind, rand)

  const mids = Array.from({ length: midClimbs }, () => ({
    len: between(rand, 6, 11),
    g: between(rand, 5.5, 7.5),
  }))
  const finalLen = between(rand, 9, 15)
  const finalG = between(rand, 7.5, 9.5)

  /**
   * PERSEGUIR EL OBJETIVO SIN DEFORMAR LA ETAPA: se escala la longitud de los puertos, no su
   * pendiente. Un puerto de 8 km al 6 % alargado a 11 km sigue siendo un puerto creíble; el mismo
   * puerto llevado al 9 % para cuadrar metros, no.
   *
   * El factor se recorta a [0,55; 1,8]: fuera de ahí el generador estaría inventando una etapa que
   * no se parece a la que sorteó, y es mejor quedarse corto de desnivel que producir un monstruo.
   */
  const dPlusBase = mids.reduce((a, c) => a + dPlusOf(c.len, c.g), 0) + dPlusOf(finalLen, finalG)
  const escala = Math.min(1.8, Math.max(0.55, dPlusTarget / Math.max(1, dPlusBase)))
  const midsEsc = mids.map((c) => ({ len: c.len * escala, g: c.g }))
  /**
   * EL PUERTO FINAL NUNCA BAJA DE LA PUERTA DE «ALTA MONTAÑA», y hay que garantizarlo aquí.
   *
   * `stageKindOf` llama reina a lo que tenga un puerto de **8,5 km o más** (o 3.200 m acumulados).
   * Con el brazo de desnivel bajo, `escala` puede llegar a 0,55, y entonces un puerto final de 9 km
   * se quedaba en 5 y la etapa **dejaba de clasificarse como reina**: el generador de reinas
   * produciendo una media montaña. Medido en `stageKind.test.ts` con `mountain 130 semilla-7`.
   *
   * La etapa puede ser blanda —eso es lo que el brazo bajo quiere—, pero tiene que seguir siendo una
   * reina, porque es lo que el calendario le pidió.
   */
  const finalLenEsc = Math.max(8.6, finalLen * escala)

  const used = midsEsc.reduce((a, c) => a + c.len, 0) + midClimbs * 6 + finalLenEsc + valleKm
  const fill = Math.max(km * 0.15, km - used)
  const gaps = split(rand, fill, midClimbs + 1)
  const segs: Segment[] = []
  segs.push(...rolling(rand, gaps[0]!, true))
  midsEsc.forEach((c, i) => {
    segs.push(climb(rand, c.len, c.g))
    segs.push(descent(rand, between(rand, 5, 8), 6))
    segs.push(...rolling(rand, gaps[i + 1]!, true))
  })
  segs.push(climb(rand, finalLenEsc, finalG))

  /**
   * …Y DETRÁS DEL ÚLTIMO PUERTO, LO QUE EL TIPO DE FINAL PIDA. Con `alto` no va nada y la etapa
   * muere arriba, como hasta ahora. Con los otros tres, una bajada y —si queda valle— la carretera
   * hasta meta, que es donde el escalador pierde lo que ganó arriba.
   */
  if (valleKm > 0.5) {
    const bajada = Math.min(valleKm, between(rand, 4, 10))
    segs.push(descent(rand, bajada, 6))
    const llano = valleKm - bajada
    if (llano > 0.5) segs.push(...rolling(rand, llano, false))
  }
  // Una reina tiene que seguir siendo una reina después de cuadrar los km (ver `garantizaPuerto`).
  return garantizaPuerto(normalize(segs, km), 8.6, null)
}

/** Sortea el tipo de final con el reparto de `ROUTE.queenFinalMix`. */
function sampleFinalKind(rand: () => number): FinalKind {
  const m = ROUTE.queenFinalMix
  const x = rand()
  if (x < m.alto) return 'alto'
  if (x < m.alto + m.cima_cerca) return 'cima_cerca'
  if (x < m.alto + m.cima_cerca + m.valle_corto) return 'valle_corto'
  return 'valle_largo'
}

/**
 * CLÁSICA DE MONTAÑA DE UN DÍA (v40): los mismos puertos que una reina, pero **la última cima NO es
 * la meta**.
 *
 * Una carrera de un día de terreno `mountain` se generaba con `mountainSegments`, o sea con el
 * perfil de una etapa reina de gran vuelta: final en alto de nueve a quince kilómetros. Eso no
 * existe en el calendario real —Il Lombardia, Lieja y San Sebastián coronan su último puerto a
 * quince o veinte kilómetros de meta y bajan o llanean hasta la línea— y el motor lo pagaba caro:
 * medido con campo heterogéneo, Race Jura dejaba al **82 % del pelotón con el tanque a cero y el
 * vaciado mediano en 1,000**, con la erosión topada y el resultado convertido en azar. Y no era
 * dureza: Jura es MÁS FÁCIL que Il Lombardia (210 km contra 241, 39 km de subida contra 55, 2.942 m
 * contra 2.995), pero moría arriba, así que los descolgados se soltaban DENTRO del último puerto y
 * les quedaban catorce kilómetros de rampa por delante.
 *
 * Aquí el último puerto corona y detrás quedan una bajada y unos kilómetros de carretera: el mismo
 * relieve, la misma selección, y un final que se puede terminar.
 */
export function mountainClassicSegments(km: number, seed: string): Segment[] {
  const rand = rng(seed)
  const midClimbs = km > 165 ? 3 : 2
  const mids = Array.from({ length: midClimbs }, () => ({
    len: between(rand, 6, 11),
    g: between(rand, 5.5, 7.5),
  }))
  // El último puerto de una clásica es CORTO y empinado —Civiglio, la Redoute, el Jaizkibel—, no el
  // puerto de nueve a quince kilómetros de una reina: lo que decide es la rampa, no la resistencia.
  const finalLen = between(rand, 4, 8)
  const finalG = between(rand, 7.5, 10)
  const runIn = between(rand, 13, 22)
  const used = mids.reduce((a, c) => a + c.len, 0) + midClimbs * 6 + finalLen + runIn
  const fill = Math.max(km * 0.2, km - used)
  const gaps = split(rand, fill, midClimbs + 1)
  const segs: Segment[] = []
  segs.push(...rolling(rand, gaps[0]!, true))
  mids.forEach((c, i) => {
    segs.push(climb(rand, c.len, c.g))
    segs.push(descent(rand, between(rand, 5, 8), 6))
    segs.push(...rolling(rand, gaps[i + 1]!, true))
  })
  segs.push(climb(rand, finalLen, finalG))
  // …y detrás del último puerto, la bajada y los kilómetros de carretera hasta la línea.
  const bajada = Math.min(runIn * 0.6, Math.max(2, (finalLen * finalG * 10) / 55))
  segs.push(descent(rand, bajada, 6), ...rolling(rand, runIn - bajada))
  return normalize(segs, km)
}

/** Clásica dura: ondulada con una sucesión de muros cortos y explosivos, final quebrado. */
export function classicSegments(km: number, seed: string): Segment[] {
  const rand = rng(seed)
  const nWalls = km > 200 ? 5 : 4
  const walls = Array.from({ length: nWalls }, () => ({
    len: between(rand, 1, 2.5),
    g: between(rand, 8, 12),
  }))
  const used = walls.reduce((a, w) => a + w.len, 0)
  const fill = Math.max(km * 0.5, km - used)
  const gaps = split(rand, fill, nWalls + 1)
  const segs: Segment[] = []
  segs.push(...rolling(rand, gaps[0]!, true))
  walls.forEach((w, i) => {
    segs.push(climb(rand, w.len, w.g))
    segs.push(...rolling(rand, gaps[i + 1]!, true))
  })
  return normalize(segs, km)
}

/** Etapa de pavé: llano ondulado con sectores de adoquines (dureza por estrellas). */
export function cobblesSegments(km: number, seed: string): Segment[] {
  const rand = rng(seed)
  const sectors = [3, 5, 4] // estrellas de dureza, hacia el final
  const sectorKm = sectors.map(() => between(rand, 2, 4))
  const used = sectorKm.reduce((a, b) => a + b, 0)
  const fill = Math.max(km * 0.5, km - used)
  const gaps = split(rand, fill, sectors.length + 1)
  const segs: Segment[] = []
  segs.push(...rolling(rand, gaps[0]!, false))
  sectors.forEach((estrellas, i) => {
    segs.push({ km: Math.round(sectorKm[i]! * 10) / 10, tipo: 'paves', estrellas })
    segs.push(...rolling(rand, gaps[i + 1]!, false))
  })
  return normalize(segs, km)
}

/** Contrarreloj: casi llana con leve ondulación (sin puertos categorizados). */
export function ittSegments(km: number, seed: string): Segment[] {
  const rand = rng(seed)
  const segs = rolling(rand, km, false)
  return normalize(segs, km)
}
