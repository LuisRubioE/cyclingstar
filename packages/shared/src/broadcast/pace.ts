/**
 * EL RITMO DE LA RETRANSMISIÓN (E2, docs/retransmision.md §8.2; D-19).
 *
 * `Watch` corre la hora de carrera a `paceAt(km a meta de la cabeza)` segundos de carrera por segundo
 * de pared, sin pausas: los rótulos no paran el reloj (§6.5). La duración depende solo del recorrido y
 * del tiempo que la cabeza tarda en cada zona; nunca de lo que pasa (B9). Por eso ninguna función de
 * este fichero recibe la línea ni los sucesos.
 *
 * Nace en el PR 3a con `paceAt` y `playbackEstimateS`; `ttPaceAt` y `ttPlaybackEstimateS` llegan en el
 * 6b y `digestPace`, `ttDigestScale` y `digestMinutes`, en el 10a (§17.20). `scripts/bench-pace.mjs`
 * (B17) la importa desde el 3a: hasta entonces llevaba su copia (decisión 17-c), y la cifra no se podía
 * mover al cambiar de una a otra.
 */
import type { StageKind } from '../contracts.js'
import { BROADCAST } from './constants.js'
import type { PaceZone, ProfileStrip, RaceS } from './timeline.js'

/**
 * Segundos de carrera por segundo de pared con la cabeza a `toGoKm` de meta: la primera zona con
 * `toGoKm > aboveKm` (las zonas van por `aboveKm` decreciente y la última es 0). En la línea, y más
 * allá, la del último km.
 */
export function paceAt(toGoKm: number, zones: readonly PaceZone[]): number {
  for (const z of zones) if (toGoKm > z.aboveKm) return z.x
  return zones[zones.length - 1]!.x
}

/**
 * LO QUE TARDA EL KM k A SU VELOCIDAD NOMINAL (§8.2), en s de carrera: la de su pendiente media
 * (`BROADCAST.nominalKmh`, la primera banda con `upToPct` ≥ su pendiente) y, desde el 10b, más despacio
 * si sube más de `nominalAltitude.abovePct` % por encima de `fromM` de cota media (B17: los km de subida
 * altos van más despacio que su banda, y el digest de una reina larga que acaba a más de 2.000 m se iba
 * un 41 % de su presupuesto). Solo el perfil, nunca la carrera.
 */
function nominalKmS(profile: ProfileStrip, k: number): number {
  const a = profile.altM[k]!
  const b = profile.altM[k + 1]!
  const pct = (b - a) / 10 // pendiente media del km, en %
  const band = BROADCAST.nominalKmh.find((x) => pct <= x.upToPct) ?? BROADCAST.nominalKmh.at(-1)!
  const { abovePct, fromM, slowdownPer1000M } = BROADCAST.nominalAltitude
  const over = (a + b) / 2 - fromM
  const altitude = pct > abovePct && over > 0 ? 1 + (slowdownPer1000M * over) / 1000 : 1
  return (3600 / band.kmh) * altitude
}

/**
 * La duración a ×1 que anuncia la ficha (`About 13 min`, pantalla). Cada km a su velocidad NOMINAL
 * (`nominalKmS`: por pendiente y, en las subidas altas, por altitud), nunca a la de la carrera, y la
 * curva aplicada por décimas de km. El último km parcial cuenta entero: el error es de menos de un km.
 */
export function playbackEstimateS(profile: ProfileStrip, zones: readonly PaceZone[]): number {
  const km = profile.altM.length - 1
  let wall = 0
  for (let k = 0; k < km; k++) {
    const raceS = nominalKmS(profile, k)
    for (let j = 0; j < 10; j++) wall += raceS / 10 / paceAt(km - k - (j + 0.5) / 10, zones)
  }
  return wall
}

// --------------------------------------------------------------------------- el digest (§8.8; 10a)

/**
 * LA CURVA DEL DIGEST de `While you were away` (§8.2, §8.8; decisión 8-a): `summaryPace` escalada para
 * que la estimación NOMINAL de la etapa (`playbackEstimateS`, velocidades por pendiente y, desde el 10b,
 * por altitud en las subidas altas) dure `digestBudgetS` de su tipo. Causal: la escala sale del perfil,
 * nunca de la carrera (B9), así que la duración real se aparta de su presupuesto lo que se aparta la
 * estimación (de −11 a +23 % sobre la línea grabada de las 24 × 2 y las seis congeladas, 10b), y B17 la
 * acota a menos de un 40 %. En una crono, `ttDigestScale` (8-m).
 */
export function digestPace(profile: ProfileStrip, kind: StageKind): readonly PaceZone[] {
  const k = playbackEstimateS(profile, BROADCAST.summaryPace) / BROADCAST.digestBudgetS[kind]
  return BROADCAST.summaryPace.map((z) => ({ aboveKm: z.aboveKm, x: z.x * k }))
}

/**
 * LOS MINUTOS DE `Watch the race in 40 minutes` (pantalla; decisión 8-b): los presupuestos de las etapas
 * veladas por su tipo y los cuadros fijos (el recorrido y el ganador de cada una, y el cierre final de
 * seis cuadros); nunca la carrera. Con las 21 etapas de cada gran vuelta, 38 (Italia), 40 (Francia) y 43
 * (España).
 */
export function digestMinutes(kinds: readonly StageKind[]): number {
  const race = kinds.reduce((s, k) => s + BROADCAST.digestBudgetS[k], 0)
  const cards =
    (BROADCAST.previewCardS + BROADCAST.finishFreezeS) * kinds.length + 6 * BROADCAST.closingCardS
  return Math.max(1, Math.round((race + cards) / 60))
}

// ---------------------------------------------------------------------------- la crono (§9.4; 6b)

/** El plan público de una crono: cuántos salen y cada cuánto (`BroadcastHead.tt`, 9-i). */
export interface TimeTrialPlan {
  readonly riders: number
  readonly intervalS: number
}

/**
 * EL RITMO DE LA CRONO (§9.4; D-19, D-23): en una crono no hay cabeza y el km no ordena nada; lo manda
 * el orden de salida, que es público. ×120 mientras ha salido hasta el 60 %, ×40 hasta el 90 % y ×12
 * después (`BROADCAST.ttPace`), y `ttLastKmX` en el último km del último en salir, desde `lastKmFromS`:
 * la hora a la que pasa por su último km entero, que se sabe cuando ocurre (como `paceAt` con la cabeza:
 * el ritmo lee la posición y nunca los sucesos, B9). El primero sale en `t = 0`, y la última zona cubre
 * también el borde.
 */
export function ttPaceAt(t: RaceS, plan: TimeTrialPlan, lastKmFromS: RaceS | null): number {
  if (lastKmFromS !== null && t >= lastKmFromS) return BROADCAST.ttLastKmX
  const started =
    Math.min(plan.riders, Math.floor(Math.max(0, t) / plan.intervalS) + 1) / plan.riders
  return (BROADCAST.ttPace.find((z) => started <= z.upToStarted) ?? BROADCAST.ttPace.at(-1)!).x // la última zona llega a 1: el ?? no salta nunca
}

/**
 * LA DURACIÓN QUE SE ANUNCIA DE UNA CRONO (`About 7 min`, §9.4; 9-h): solo el plan y el perfil, nunca un
 * tiempo de la carrera. El último sale a `(riders − 1) · intervalS` y rueda el perfil entero a las
 * velocidades nominales de cada km (`nominalKmS`, con la altitud); su último km, a `ttLastKmX`. Se integra la curva de `ttPaceAt` por
 * tramos en que es constante: una salida tras otra y, después, hasta el último km del último.
 */
export function ttPlaybackEstimateS(profile: ProfileStrip, plan: TimeTrialPlan): number {
  const km = profile.altM.length - 1
  let ride = 0
  for (let k = 0; k < km; k++) ride += nominalKmS(profile, k)
  const last = km > 0 ? nominalKmS(profile, km - 1) : 0
  const lastStartS = (plan.riders - 1) * plan.intervalS
  const lastKmFromS = lastStartS + ride - last
  let wall = 0
  let t = 0
  for (let i = 0; t < lastKmFromS; i++) {
    const to = i < plan.riders - 1 ? Math.min((i + 1) * plan.intervalS, lastKmFromS) : lastKmFromS
    wall += (to - t) / ttPaceAt(t, plan, lastKmFromS)
    t = to
  }
  return wall + last / BROADCAST.ttLastKmX
}

/**
 * EL RESUMEN Y EL DIGEST DE UNA CRONO (decisión 8-m): una sola curva, `ttPaceAt` multiplicado por esta
 * escala, para que la estimación nominal (`ttPlaybackEstimateS`) dure `digestBudgetS.cri` (120 s). Solo el
 * plan público y el perfil. Medido con el motor real en cuatro cronos y tres semillas: de 1:56 a 2:03.
 */
export function ttDigestScale(profile: ProfileStrip, plan: TimeTrialPlan): number {
  return ttPlaybackEstimateS(profile, plan) / BROADCAST.digestBudgetS.cri
}
