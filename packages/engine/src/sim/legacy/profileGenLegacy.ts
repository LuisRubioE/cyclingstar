/**
 * EL GENERADOR DE RECORRIDOS VIEJO, COPIADO PARA EL PAREADO (docs/generador.md §3.10, §13.6 punto 3
 * y §15.10; decisión 29).
 *
 * Hasta `ENGINE_VERSION` 86 el calendario se dibujaba con los ocho `xxxSegments` de
 * `routes/profileGen.ts`, los constructores de `routes/calendar.ts` (`flat` a `classic`,
 * `oneDaySpec`), la composición de `stageMix` (`mixRoles`, `mixKm`) y las ramas viejas de
 * `buildRace`, `stagesFromEdition`, `editionGrandTour` y `nationalChampionships`. En la v87 el
 * calendario sale de la gramática (`routes/grammar/`) y todo eso deja el código de producción. Vive
 * aquí, copiado sin cambiar una tirada, por dos razones: `sim/legacy/golden.test.ts` exige que
 * `legacyCalendar()` reproduzca las 1.418 huellas selladas del calendario viejo (la prueba de que la
 * copia es el generador viejo y no otra cosa), y el paso 9 corre cada banco dos veces, con el
 * calendario viejo y con el nuevo, para medir la diferencia pareada.
 *
 * Es UN fichero y se borra con `sim/legacy/` al cerrar el paso 9. En producción solo lo lee la
 * transición E1 de `packages/db` (`transicionE1.ts`, v88), que corre una vez por mundo en el primer
 * tick tras el despliegue; cuando se borre este directorio ya habrá corrido y se borra con él.
 *
 * Los literales de `ROUTE` que la v87 retira (sin lector en producción, §12.10) se copian aquí con su
 * valor de la v86, con el nombre de la clave: el generador viejo los necesita y `constants.ts` ya no
 * los tiene. Lo que `calendar.ts` exporta para esta copia es solo lo que no depende del generador
 * (`RACE_TABLES`, `RACE_COUNTRY`, `auto`, `featureSpec`, `stagesFrom`, `doy`, `enrollmentFor`,
 * `ncHash`, `NATIONALS_ROAD_DAY`, `NATIONALS_ROAD_OVERRIDE`); lo que sí depende (las cuatro funciones
 * de carrera) se copia entero.
 */
import { COUNTRIES } from '@cyclingstar/shared'
import { ROUTE } from '../../constants.js'
import {
  NATIONALS_ROAD_DAY,
  NATIONALS_ROAD_OVERRIDE,
  RACE_COUNTRY,
  RACE_TABLES,
  auto,
  doy,
  enrollmentFor,
  featureSpec,
  ncHash,
  stagesFrom,
  type CalendarRace,
  type CalendarStage,
  type RaceLevel,
  type RaceRow,
  type StageSpec,
} from '../../routes/calendar.js'
import { type RaceEdition, RACE_EDITIONS } from '../../routes/editions.js'
import type { RouteTerrain } from '../../routes/featureProfile.js'
import type { FinalKind } from '../../routes/finalKind.js'
import { raceRouteSourceOf } from '../../routes/grammar/generate.js'
import { between, climb, descent, rolling, routeRng, split } from '../../routes/profileGen.js'
import { STAGE_FEATURES } from '../../routes/stageFeatures.js'
import type { Segment } from '../../stage/types.js'
import { routeSourceDe } from '../routeCensus.js'

/** Una etapa como la escribían los constructores viejos: sin origen ni ficha de la gramática. */
type LegacySpec = Omit<StageSpec, 'routeSource' | 'arch'>
type LegacyStage = LegacySpec & { index: number; name: string }
type LegacyRace = Omit<CalendarRace, 'stages' | 'routeSource'> & { stages: LegacyStage[] }
type Terrain = RouteTerrain

/** El mulberry32 de `profileGen.ts`: `rng` era privado allí y es el mismo que `routeRng`. */
const rng = routeRng

// ---------------------------------------------------------------------------------------------------
// Las claves de `ROUTE` que la v87 retira, con su valor de la v86 (docs/balance.md, v87 §1).
// ---------------------------------------------------------------------------------------------------

/** `QUEEN_DPLUS_RANGE`: el brazo alto del desnivel de una reina, uniforme en logaritmo. */
const QUEEN_DPLUS_RANGE = { min: 2600, max: 4600 }
/** `QUEEN_HIGH_DPLUS_SHARE`: qué parte de las reinas va al brazo alto. */
const QUEEN_HIGH_DPLUS_SHARE = 0.6
/** `QUEEN_LOW_DPLUS_RANGE`: la cola baja, lineal. */
const QUEEN_LOW_DPLUS_RANGE = { min: 1200, max: 2500 }
/** `ROUTE.queenFinalMix`: el reparto del tipo de final de una reina. */
const QUEEN_FINAL_MIX = { alto: 0.45, cima_cerca: 0.2, valle_corto: 0.25, valle_largo: 0.1 }
/** `GRAND_TOUR_LAST_DECISIVE_FACTOR`: la última etapa de una vuelta de 15 o más es menos decisiva. */
const GRAND_TOUR_LAST_DECISIVE_FACTOR = 0.4
/** `ROUTE.mixWeights`: pesos por terreno de [llana, media, media con final en alto, reina]. */
const MIX_WEIGHTS = {
  flat: [0.58, 0.27, 0.1, 0.05],
  hilly: [0.3, 0.36, 0.19, 0.15],
  mountain: [0.16, 0.26, 0.18, 0.4],
} as const
/** `ROUTE.kmFlat`, `kmHilly`, `kmUphill` y `kmSummit`: `[mínimo, amplitud]` por papel. */
const KM_FLAT = [165, 30] as const
const KM_HILLY = [160, 30] as const
const KM_UPHILL = [150, 30] as const
const KM_SUMMIT = [145, 35] as const

// ---------------------------------------------------------------------------------------------------
// Los ocho `xxxSegments` de `profileGen.ts` (v86), con `normalize` y `garantizaPuerto`.
// ---------------------------------------------------------------------------------------------------

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
  const segs = rolling(rand, km, 1.8, 0)
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
  segs.push(...rolling(rand, gaps[0]!, 3.2, 0.35))
  climbs.forEach((c, i) => {
    segs.push(climb(rand, c.len, c.g))
    if (i < nClimbs - 1) segs.push(descent(rand, between(rand, 3, 5), 5))
    segs.push(...rolling(rand, gaps[i + 1]!, 3.2, 0.35))
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
  segs.push(...rolling(rand, gaps[0]!, 3.2, 0.35))
  climbs.forEach((c, i) => {
    segs.push(climb(rand, c.len, c.g))
    segs.push(descent(rand, between(rand, 3, 5), 5))
    segs.push(...rolling(rand, gaps[i + 1]!, 3.2, 0.35))
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
  const alto = rand() < QUEEN_HIGH_DPLUS_SHARE
  const dPlusTarget =
    opts.dPlusTarget ??
    (alto
      ? // Uniforme en LOGARITMO: en lineal, la mitad de las reinas caería por encima de 3.600 m y la
        // distribución del calendario se iría toda al extremo duro.
        Math.exp(between(rand, Math.log(QUEEN_DPLUS_RANGE.min), Math.log(QUEEN_DPLUS_RANGE.max)))
      : between(rand, QUEEN_LOW_DPLUS_RANGE.min, QUEEN_LOW_DPLUS_RANGE.max))
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
  segs.push(...rolling(rand, gaps[0]!, 3.2, 0.35))
  midsEsc.forEach((c, i) => {
    segs.push(climb(rand, c.len, c.g))
    segs.push(descent(rand, between(rand, 5, 8), 6))
    segs.push(...rolling(rand, gaps[i + 1]!, 3.2, 0.35))
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
    if (llano > 0.5) segs.push(...rolling(rand, llano, 1.8, 0))
  }
  // Una reina tiene que seguir siendo una reina después de cuadrar los km (ver `garantizaPuerto`).
  return garantizaPuerto(normalize(segs, km), 8.6, null)
}

/** Sortea el tipo de final con el reparto de `ROUTE.queenFinalMix`. */
function sampleFinalKind(rand: () => number): FinalKind {
  const m = QUEEN_FINAL_MIX
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
  segs.push(...rolling(rand, gaps[0]!, 3.2, 0.35))
  mids.forEach((c, i) => {
    segs.push(climb(rand, c.len, c.g))
    segs.push(descent(rand, between(rand, 5, 8), 6))
    segs.push(...rolling(rand, gaps[i + 1]!, 3.2, 0.35))
  })
  segs.push(climb(rand, finalLen, finalG))
  // …y detrás del último puerto, la bajada y los kilómetros de carretera hasta la línea.
  const bajada = Math.min(runIn * 0.6, Math.max(2, (finalLen * finalG * 10) / 55))
  segs.push(descent(rand, bajada, 6), ...rolling(rand, runIn - bajada, 1.8, 0))
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
  segs.push(...rolling(rand, gaps[0]!, 3.2, 0.35))
  walls.forEach((w, i) => {
    segs.push(climb(rand, w.len, w.g))
    segs.push(...rolling(rand, gaps[i + 1]!, 3.2, 0.35))
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
  segs.push(...rolling(rand, gaps[0]!, 1.8, 0))
  sectors.forEach((estrellas, i) => {
    segs.push({ km: Math.round(sectorKm[i]! * 10) / 10, tipo: 'paves', estrellas })
    segs.push(...rolling(rand, gaps[i + 1]!, 1.8, 0))
  })
  return normalize(segs, km)
}

/** Contrarreloj: casi llana con leve ondulación (sin puertos categorizados). */
export function ittSegments(km: number, seed: string): Segment[] {
  const rand = rng(seed)
  const segs = rolling(rand, km, 1.8, 0)
  return normalize(segs, km)
}

// ---------------------------------------------------------------------------------------------------
// Los constructores, la composición y las ramas de carrera de `calendar.ts` (v86).
// ---------------------------------------------------------------------------------------------------

// --- Constructores de etapa (km total + semilla -> perfil realista y detallado, ver profileGen). ---
// La semilla hace que cada etapa dibuje siempre el mismo perfil, pero etapas distintas se vean
// distintas. Los banners (una cima por puerto) los pone auto() a partir del terreno.

const flat = (km: number, seed: string): LegacySpec => ({
  kind: 'llana',
  label: 'Flat',
  profile: auto(flatSegments(km, seed)),
})

const hilly = (km: number, seed: string): LegacySpec => ({
  kind: 'media',
  label: 'Hills',
  profile: auto(hillySegments(km, seed)),
})

/**
 * Media montaña que MUERE ARRIBA: mismo tipo (y color) que una etapa de cotas, pero la meta está en
 * la cima de la última. Es lo que distingue una etapa que se resuelve al sprint de una que reparte
 * tiempos sin necesidad de alta montaña.
 */
const hillyUphill = (km: number, seed: string): LegacySpec => ({
  kind: 'media',
  label: 'Uphill finish',
  profile: auto(hillyUphillSegments(km, seed)),
})

const mountain = (km: number, seed: string): LegacySpec => ({
  kind: 'reina',
  label: 'Summit finish',
  profile: auto(mountainSegments(km, seed)),
})

/**
 * …Y LA DE UN DÍA NO MUERE ARRIBA (v40). Una clásica de montaña corona su último puerto antes de
 * meta; la que termina en la cima de un puerto de catorce kilómetros es una etapa reina de gran
 * vuelta, y meterle ese perfil a una carrera de un día reventaba el pelotón entero (ver
 * `mountainClassicSegments`).
 */
const mountainOneDay = (km: number, seed: string): LegacySpec => ({
  kind: 'reina',
  // La etiqueta es «Mountains» y no «Summit finish» porque el recorrido ya NO muere arriba, y quien
  // manda aquí es el etiquetador de `stageHistory.ts`: para una reina con más de cinco kilómetros
  // tras la última cima, esto es una etapa de montaña y no un final en alto. Ponerle nombre propio
  // —«Mountain classic»— hacía que el calendario y el etiquetador dijeran cosas distintas de la
  // misma etapa, y eso lo caza el banco que vigila que solo cambie la etiqueta y nunca el tipo.
  label: 'Mountains',
  profile: auto(mountainClassicSegments(km, seed)),
})

const itt = (km: number, seed: string): LegacySpec => ({
  kind: 'cri',
  label: 'ITT',
  timeTrial: true,
  profile: { segments: ittSegments(km, seed) },
})

const cobbles = (km: number, seed: string): LegacySpec => ({
  kind: 'clasica',
  label: 'Cobbles',
  profile: auto(cobblesSegments(km, seed)),
})

const classic = (km: number, seed: string): LegacySpec => ({
  kind: 'clasica',
  label: 'Classic',
  profile: auto(classicSegments(km, seed)),
})

/** Perfil de una carrera de un día según su terreno (semilla para el perfil detallado determinista). */
function oneDaySpec(terrain: Terrain, km: number, seed: string): LegacySpec {
  if (terrain === 'cobbles') return cobbles(km, seed)
  if (terrain === 'classic') return classic(km, seed)
  if (terrain === 'mountain') return mountainOneDay(km, seed)
  if (terrain === 'hilly') return hilly(km, seed)
  if (terrain === 'itt') return itt(km, seed)
  return flat(km, seed)
}

/** Los tres terrenos que sabe componer una vuelta por etapas (el resto se reduce a ellos). */
type MixTerrain = 'flat' | 'hilly' | 'mountain'

/** El PAPEL de cada etapa dentro de la vuelta, antes de darle kilómetros y dibujarle el perfil. */
type MixRole = 'llana' | 'media' | 'media-alto' | 'reina' | 'cri'

/** Reduce el terreno de la ficha de la carrera a uno de los tres que compone `stageMix`. */
function mixTerrain(terrain: Terrain): MixTerrain {
  if (terrain === 'mountain') return 'mountain'
  if (terrain === 'hilly' || terrain === 'classic') return 'hilly'
  return 'flat'
}

/** ¿Es una etapa con puertos (algo que morder) o una llana más? */
function isSelective(role: MixRole): boolean {
  return role === 'media' || role === 'media-alto' || role === 'reina'
}

/** ¿Muere la etapa cuesta arriba? Es lo que reparte tiempos sin depender de una crono. */
function isUphill(role: MixRole): boolean {
  return role === 'media-alto' || role === 'reina'
}

/** Sorteo con pesos: devuelve el papel cuyo tramo de probabilidad contiene `u` ∈ [0,1). */
function pickRole(weights: readonly number[], u: number): MixRole {
  const roles: MixRole[] = ['llana', 'media', 'media-alto', 'reina']
  const total = weights.reduce((a, b) => a + b, 0)
  let acc = 0
  for (let i = 0; i < roles.length; i++) {
    acc += (weights[i] ?? 0) / total
    if (u < acc) return roles[i]!
  }
  return 'llana'
}

/**
 * QUÉ ETAPAS tiene una vuelta generada de `n` etapas con un terreno dominante (docs/balance.md,
 * «v10 — Composición y caza»). Determinista por carrera: la misma carrera compone siempre la misma
 * vuelta. Las proporciones viven en `ROUTE`.
 *
 * El orden en que se decide importa, porque es el orden en que lo decide un organizador:
 *   1. la CRONO (cuántas y dónde),
 *   2. la ÚLTIMA etapa (¿se cierra arriba o al sprint?),
 *   3. las de EN MEDIO, por sorteo con pesos del terreno,
 *   4. y las GARANTÍAS: un mínimo de etapas con puertos y, en vueltas de 4+, al menos un final en
 *      alto. Son las dos que impiden que el sorteo devuelva una carrera que no existe.
 * La primera etapa es siempre llana: es la de los sprinters, y ninguna vuelta empieza por el muro.
 */
function mixRoles(n: number, terrain: MixTerrain, rand: () => number): MixRole[] {
  const roles: MixRole[] = Array.from({ length: n }, () => 'llana')
  if (n <= 1) return roles

  // 1. Crono(s).
  const alwaysItt = terrain === 'flat' && n >= ROUTE.ittAlwaysFlatStages
  const ittChance = n >= ROUTE.ittWeekStages ? ROUTE.ittChanceWeek : ROUTE.ittChanceShort
  if (n >= ROUTE.ittMinStages && (alwaysItt || rand() < ittChance)) {
    const back = rand() < ROUTE.ittEarlierChance ? 2 : 1
    roles[Math.min(n - 2, Math.max(1, n - 1 - back))] = 'cri'
    if (n >= ROUTE.ittSecondStages) {
      const early = Math.min(n - 3, Math.max(1, Math.round(ROUTE.ittSecondPosition * n)))
      if (roles[early] !== 'cri') roles[early] = 'cri'
    }
  }

  // 2. La última etapa: decisiva o de trámite.
  const lastIdx = n - 1
  if (roles[lastIdx] !== 'cri') {
    const factor = n >= ROUTE.grandTourStages ? GRAND_TOUR_LAST_DECISIVE_FACTOR : 1
    if (rand() < ROUTE.lastDecisiveChance[terrain] * factor) {
      roles[lastIdx] = rand() < ROUTE.lastSummitShare[terrain] ? 'reina' : 'media-alto'
    }
  }

  // 3. Las de en medio, por sorteo con los pesos del terreno.
  for (let i = 1; i < lastIdx; i++) {
    if (roles[i] === 'cri') continue
    roles[i] = pickRole(MIX_WEIGHTS[terrain], rand())
  }

  // 4. Garantías. Los huecos que se pueden endurecer son todos menos la primera etapa y las cronos;
  // se recorren de atrás hacia delante porque una vuelta se pone más dura según avanza. La ÚLTIMA va
  // al final de la cola: si el paso 2 la dejó de trámite fue una decisión, y solo se toca si no
  // queda otro hueco donde meter los puertos que faltan.
  const slots: number[] = []
  for (let i = n - 2; i >= 1; i--) if (roles[i] !== 'cri') slots.push(i)
  if (roles[lastIdx] !== 'cri') slots.push(lastIdx)
  const minSelective = Math.min(
    Math.ceil(ROUTE.selectiveMinFraction[terrain] * n),
    Math.max(0, slots.length),
  )
  for (const i of slots) {
    if (roles.filter(isSelective).length >= minSelective) break
    if (!isSelective(roles[i]!)) roles[i] = 'media'
  }
  const uphillTarget = (): number | undefined =>
    slots.find((i) => isSelective(roles[i]!)) ?? slots[0]
  if (n >= ROUTE.uphillFinishMinStages && !roles.some(isUphill)) {
    // La más tardía de las que ya tienen puertos pasa a morir arriba; si no hubiera ninguna, el
    // último hueco disponible.
    const target = uphillTarget()
    if (target != null) roles[target] = 'media-alto'
  }
  // Y la garantía de fondo, la que cierra la queja del dueño: NINGUNA vuelta por etapas se queda sin
  // algo con que hacer la general. Si el sorteo no ha dejado ni crono ni final en alto —solo puede
  // pasar en las vueltas más cortas—, la última cota disponible pasa a morir arriba.
  if (!roles.some((r) => r === 'cri' || isUphill(r))) {
    const target = uphillTarget()
    if (target != null) roles[target] = 'media-alto'
  }
  return roles
}

/** Kilometraje de una etapa según su papel, con variación determinista dentro de su rango. */
function mixKm(role: MixRole, n: number, last: boolean, rand: () => number): number {
  if (role === 'cri') {
    const [min, range] =
      n >= ROUTE.ittLongStages
        ? [ROUTE.ittLongKmMin, ROUTE.ittLongKmRange]
        : [ROUTE.ittKmMin, ROUTE.ittKmRange]
    return Math.round(min + rand() * range)
  }
  const [min, range] =
    role === 'llana'
      ? KM_FLAT
      : role === 'media'
        ? KM_HILLY
        : role === 'media-alto'
          ? KM_UPHILL
          : KM_SUMMIT
  const km = (min ?? 160) + rand() * (range ?? 30)
  return Math.round(last ? km * ROUTE.lastStageKmFactor : km)
}

/**
 * Mezcla determinista de etapas para una vuelta de n etapas con sesgo de terreno (autoría propia).
 * Es el `stageMix` de la v86; el de producción delega en `composeTour` desde la v87.
 */
export function stageMix(n: number, terrain: Terrain, seedBase: string): LegacySpec[] {
  const rand = routeRng(`mix|${seedBase}|${n}|${terrain}`)
  const roles = mixRoles(n, mixTerrain(terrain), rand)
  return roles.map((role, i) => {
    const seed = `${seedBase}|${i}`
    const km = mixKm(role, n, i === n - 1, rand)
    if (role === 'cri') return itt(km, seed)
    if (role === 'reina') return mountain(km, seed)
    if (role === 'media-alto') return hillyUphill(km, seed)
    if (role === 'media') return hilly(km, seed)
    return flat(km, seed)
  })
}
/**
 * Etapas de una edición real: el terreno y la distancia de cada etapa vienen de la edición verificada.
 * Si la etapa tiene RASGOS reales autorizados (STAGE_FEATURES: puertos y sprints de verdad), su perfil
 * se construye a partir de ellos (altimetría fiel); si no, se genera por terreno (verosímil, no real).
 */
function stagesFromEdition(id: string, edition: RaceEdition): LegacyStage[] {
  const features = STAGE_FEATURES[id]
  // Semilla estable por etapa (salida-meta-km): el perfil detallado es siempre el mismo para esa etapa.
  return stagesFrom(
    edition.stages.map((s, i) => {
      const seed = `${s.from}|${s.to}|${s.km}`
      const f = features?.[i]
      return f ? featureSpec(s.terrain, s.km, f, seed) : oneDaySpec(s.terrain, s.km, seed)
    }),
  )
}

/**
 * Gran vuelta reconstruida a su edición REAL (Tour/Giro/Vuelta 2026): perfil de cada etapa según el
 * terreno real y los días de descanso reales (el Giro lleva tres por la salida desde Bulgaria). El
 * "de dónde a dónde" de cada etapa sale de la misma edición (ver raceRoutes), así no se desincronizan.
 */
function editionGrandTour(id: string, name: string, startDay: number, country: string): LegacyRace {
  const edition = RACE_EDITIONS[id]
  if (!edition) throw new Error(`Falta la edición real de ${id}`)
  return {
    id,
    name,
    level: 'WT',
    raceClass: 'WT',
    format: 'gran-vuelta',
    startDay,
    openTo: enrollmentFor('WT'),
    country,
    stages: stagesFromEdition(id, edition),
    restAfter: edition.restAfter,
  }
}
/**
 * Campeonatos nacionales de un país: hasta 4 pruebas (Elite y Sub-23, en Crono y en Ruta) durante la
 * semana del campeonato. Cada una es de un día con pelotón individual del país (lo arma la capa de
 * datos con los mejores; el Sub-23 filtra por edad).
 *
 * Como en la realidad, la semana del campeonato reparte las CRONOS entre semana y las RUTAS el fin de
 * semana, con hueco entre unas y otras (no cuatro pruebas en cuatro días seguidos). Que el Sub-23
 * comparta día con la Elite o tenga el suyo propio VARÍA por país (las grandes federaciones lo
 * separan; muchas pequeñas lo juntan): la RUTA Elite es el domingo ancla, y según el país las cronos
 * y la ruta Sub-23 caen el mismo día que la Elite o un día antes. Determinista por código de país.
 */
function nationalChampionships(code: string, name: string): LegacyRace[] {
  const override = NATIONALS_ROAD_OVERRIDE[code]
  const roadDay = override ? doy(override[0], override[1]) : NATIONALS_ROAD_DAY
  // Tres patrones reales de reparto de la semana (por país):
  //  0 → todo doblado: Elite y Sub-23 comparten día por disciplina (crono jueves, ruta domingo) = 2 días.
  //  1 → ruta Sub-23 el sábado; cronos juntas el jueves = 3 días.
  //  2 → todo separado: crono Elite miércoles, crono Sub-23 jueves, ruta Sub-23 sábado, ruta Elite domingo = 4 días.
  const pattern = ncHash(code) % 3
  const eliteIttDay = pattern === 2 ? roadDay - 4 : roadDay - 3 // crono Elite: jueves (miércoles si todo separado)
  const u23IttDay = roadDay - 3 // crono Sub-23: jueves (casi siempre el mismo día que la Elite)
  const u23RoadDay = pattern === 0 ? roadDay : roadDay - 1 // ruta Sub-23: domingo (con Elite) o sábado
  const base = (
    id: string,
    label: string,
    startDay: number,
    category: 'elite' | 'u23',
    spec: LegacySpec,
  ): LegacyRace => {
    const raceName = `${name} ${label}`
    return {
      id,
      name: raceName,
      level: 'CON',
      raceClass: 'NC',
      format: 'un-dia',
      startDay,
      openTo: [],
      championshipCountry: code,
      championshipCategory: category,
      country: code,
      stages: [{ ...spec, index: 1, name: raceName }],
    }
  }
  const cc = code.toLowerCase()
  return [
    base(`nc-${cc}-itt`, 'ITT Championship', eliteIttDay, 'elite', itt(38, `nc-${cc}-itt`)),
    base(`nc-${cc}-u23-itt`, 'U23 ITT Championship', u23IttDay, 'u23', itt(30, `nc-${cc}-u23-itt`)),
    base(
      `nc-${cc}-u23-road`,
      'U23 Road Championship',
      u23RoadDay,
      'u23',
      classic(180, `nc-${cc}-u23-road`),
    ),
    base(`nc-${cc}-road`, 'Road Championship', roadDay, 'elite', classic(220, `nc-${cc}-road`)),
  ]
}

/** Construye una carrera del calendario viejo desde su fila de datos. */
function buildRace(row: RaceRow): LegacyRace {
  const startDay = doy(row.m, row.d)
  const level: RaceLevel = row.raceClass === 'WT' ? 'WT' : row.raceClass === 'Pro' ? 'PRS' : 'CON'
  const country = row.country ?? RACE_COUNTRY[row.id]
  const common = {
    id: row.id,
    name: row.name,
    level,
    raceClass: row.raceClass,
    startDay,
    openTo: enrollmentFor(level),
    ...(row.region ? { region: row.region } : {}),
    ...(country ? { country } : {}),
  }
  // Carrera por etapas reconstruida a su edición real (p.ej. la Volta a Portugal, con su día de
  // descanso): el perfil y los descansos salen de la edición verificada, no de la mezcla genérica.
  const edition = RACE_EDITIONS[row.id]
  if (edition) {
    return {
      ...common,
      format: 'una-semana',
      stages: stagesFromEdition(row.id, edition),
      restAfter: edition.restAfter,
    }
  }
  if (!row.stages || row.stages <= 1) {
    // Una clásica con rasgos reales autorizados (puertos y cotas de verdad) usa su altimetría fiel;
    // el resto se genera por terreno. Sigue siendo una prueba de un día.
    const terrain = row.terrain ?? 'flat'
    const km = row.km ?? 210
    const f = STAGE_FEATURES[row.id]?.[0]
    const spec = f ? featureSpec(terrain, km, f, row.id) : oneDaySpec(terrain, km, row.id)
    return { ...common, format: 'un-dia', stages: [{ ...spec, index: 1, name: row.name }] }
  }
  return {
    ...common,
    format: 'una-semana',
    stages: stagesFrom(stageMix(row.stages, row.terrain ?? 'flat', row.id)),
  }
}

// ---------------------------------------------------------------------------------------------------
// El calendario viejo entero.
// ---------------------------------------------------------------------------------------------------

/**
 * El calendario de la v86, construido por el generador viejo en el orden de entonces (WT con las tres
 * grandes vueltas, Pro, continentales y nacionales, ordenado por `startDay` con el mismo `sort`
 * estable). Cada etapa lleva `routeSource` sellado con `routeSourceDe` (§13.3), que sin el campo lo
 * deduce con la regla de hoy, y cada carrera `raceRouteSourceOf` de sus etapas; `arch` no existe.
 * Cada llamada construye un calendario nuevo.
 */
export function legacyCalendar(): CalendarRace[] {
  const { WT_TABLE, PRO_TABLE, CON_TABLE } = RACE_TABLES
  const viejas: LegacyRace[] = [
    ...WT_TABLE.map(buildRace),
    editionGrandTour('race-italy', 'Race Italy', doy(5, 8), 'IT'),
    editionGrandTour('race-spain', 'Race Spain', doy(8, 22), 'ES'),
    editionGrandTour('race-france', 'Race France', doy(7, 4), 'FR'),
    ...PRO_TABLE.map(buildRace),
    ...CON_TABLE.map(buildRace),
    ...COUNTRIES.flatMap((c) => nationalChampionships(c.code, c.name)),
  ].sort((a, b) => a.startDay - b.startDay)
  return viejas.map((race): CalendarRace => {
    // `routeSourceDe` lee el campo si está (las etapas con rasgos, por `featureSpec`) y si no lo
    // deduce de `STAGE_FEATURES` y `RACE_EDITIONS`; solo lee `race.id` y `stage.index`.
    const stages = race.stages.map((st): CalendarStage => ({
      ...st,
      routeSource: routeSourceDe(race as CalendarRace, st as CalendarStage),
    }))
    return { ...race, stages, routeSource: raceRouteSourceOf(stages) }
  })
}
