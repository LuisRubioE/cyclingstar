/**
 * EL RITMO DE LA RETRANSMISIÓN (E2, docs/retransmision.md §8.2; D-19).
 *
 * `Watch` corre la hora de carrera a `paceAt(km a meta de la cabeza)` segundos de carrera por segundo
 * de pared, sin pausas: los rótulos no paran el reloj (§6.5). La duración depende solo del recorrido y
 * del tiempo que la cabeza tarda en cada zona; nunca de lo que pasa (B9). Por eso ninguna función de
 * este fichero recibe la línea ni los sucesos.
 *
 * Nace en el PR 3a con `paceAt` y `playbackEstimateS`; `ttPaceAt` y `ttPlaybackEstimateS` llegan en el
 * 6b y `digestPace`, en el 10a (§17.20). `scripts/bench-pace.mjs` (B17) la importa desde el 3a: hasta
 * entonces llevaba su copia (decisión 17-c), y la cifra no se podía mover al cambiar de una a otra.
 */
import { BROADCAST } from './constants.js'
import type { PaceZone, ProfileStrip } from './timeline.js'

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
 * La duración a ×1 que anuncia la ficha (`About 13 min`, pantalla). Cada km a su velocidad NOMINAL por
 * pendiente (`BROADCAST.nominalKmh`, la primera banda con `upToPct` ≥ su pendiente), nunca a la de la
 * carrera, y la curva aplicada por décimas de km. El último km parcial cuenta entero: el error es de
 * menos de un km.
 */
export function playbackEstimateS(profile: ProfileStrip, zones: readonly PaceZone[]): number {
  const km = profile.altM.length - 1
  let wall = 0
  for (let k = 0; k < km; k++) {
    const pct = (profile.altM[k + 1]! - profile.altM[k]!) / 10 // pendiente media del km, en %
    const band = BROADCAST.nominalKmh.find((b) => pct <= b.upToPct) ?? BROADCAST.nominalKmh.at(-1)!
    const raceS = 3600 / band.kmh
    for (let j = 0; j < 10; j++) wall += raceS / 10 / paceAt(km - k - (j + 0.5) / 10, zones)
  }
  return wall
}
