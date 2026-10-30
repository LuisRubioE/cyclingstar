import { stageRouteText } from '@cyclingstar/shared'
import { plural } from './words'

/**
 * LO QUE DICE LA PANTALLA DE ÓRDENES (E3, docs/visual.md §4.10 y 3-d; PR 21i), en un módulo aparte para
 * probarlo sin pintar la página.
 */

/** El parte de una etapa, de `GET /api/my-orders` (v44). */
interface Parte {
  readonly lluvia: number
  readonly grados: number
  readonly fiabilidad: number
}

/** La palabra del parte, donde iban `🌧`, `🌦` y `☀` (3-d): `Rain` desde el 50 %, `Showers` desde el 20 %. */
export function forecastWord(lluvia: number): 'Rain' | 'Showers' | 'Dry' {
  if (lluvia >= 50) return 'Rain'
  if (lluvia >= 20) return 'Showers'
  return 'Dry'
}

/** `Rain 60% · 14°C` */
export function forecastText(f: Parte): string {
  return `${forecastWord(f.lluvia)} ${f.lluvia}% · ${f.grados}°C`
}

/**
 * Un parte a varios días es casi la climatología del sitio: por debajo del 60 % de fiabilidad se dice que es
 * una perspectiva (`outlook`) y se pinta más tenue, para no enseñar una conjetura como si fuera un dato.
 */
export function isOutlook(f: Parte): boolean {
  return f.fiabilidad < 60
}

/**
 * El título de una etapa, como toda etapa (§4.10): `Stage 3 · Gandia → Alcoi`. La de una carrera de un día va
 * por el nombre de su carrera, sin su `Stage 1`, como en el índice de carreras (21e).
 */
export function orderStageTitle(
  stage: {
    readonly name: string
    readonly from?: string | null | undefined
    readonly to?: string | null | undefined
  },
  raceName: string,
  oneDay: boolean,
): string {
  const nombre = oneDay ? raceName : stage.name
  const route = stageRouteText(stage.from, stage.to)
  return route === null ? nombre : `${nombre} · ${route}`
}

/** El resumen de arriba: si hay órdenes que chocan y dónde mirar, sin el `⚠` de antes. */
export function clashSummary(roadStages: number, clashing: number): string {
  const etapas = plural(roadStages, 'road stage')
  return clashing === 0
    ? `${etapas}, no clashing orders.`
    : `${etapas} · ${clashing} with orders that clash: look for the warnings below.`
}

/**
 * Lo que cambia al guardar, para la barra (§4.9; `ActionBar` le pone delante el recuento): la carrera y sus
 * etapas tocadas, hasta tres por su nombre (`Race France: Stage 2 and Stage 5`), y de cuatro en adelante por
 * su número; la de un día, la carrera sola.
 */
export function ordersConsequence(raceName: string, stages: readonly string[]): string {
  if (stages.length === 0) return raceName
  if (stages.length > 3) return `${raceName}: ${stages.length} stages`
  const ultima = stages[stages.length - 1]!
  const resto = stages.slice(0, -1)
  return `${raceName}: ${resto.length === 0 ? ultima : `${resto.join(', ')} and ${ultima}`}`
}
