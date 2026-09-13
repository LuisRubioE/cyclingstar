import { type TrainingChoice, sessionTss } from '@cyclingstar/shared'
import { applyDailyLoad, type Load } from '../banister.js'

/**
 * «¿CÓMO VOY A LLEGAR?» — LA PROYECCIÓN DEL PLAN (docs/entrenamiento.md §5.3, paso 11).
 *
 * Es lo que convierte veintiocho desplegables en una decisión. Hasta ahora el jugador elegía sesión
 * e intensidad para un mes y **no veía absolutamente nada** hasta que los días pasaban de uno en uno:
 * la consecuencia de apretar tres semanas seguidas llegaba cuando ya no se podía deshacer.
 *
 * VIVE EN EL MOTOR, y ésa es la decisión que importa de este fichero. La tentación era escribirla en
 * `apps/web` —es una pantalla— o en `packages/db`, y cualquiera de las dos habría sido una SEGUNDA
 * implementación del Banister: la proyección diría una cosa y el tick al día siguiente otra, y el
 * jugador tendría razón al no fiarse de ninguna. Aquí llama a `applyDailyLoad`, la misma función que
 * corre el tick, así que la promesa de la pantalla es la única que el motor puede cumplir.
 *
 * Es PURA: no sabe qué día es hoy ni consulta nada. Se le dan el estado de partida y la lista de
 * sesiones, y devuelve la curva.
 */

export interface ProjectedDay {
  /** Índice dentro del plan: 0 es el primer día proyectado, no un día de juego. */
  day: number
  ctl: number
  atl: number
  tsb: number
  tss: number
}

/**
 * La curva de carga y frescura de un plan, día a día.
 *
 * `recovery` es el REC del corredor, que es lo que decide cuánto tarda en irse la fatiga: dos
 * corredores con el mismo plan NO llegan igual, y eso es justo lo que la pantalla tiene que enseñar.
 *
 * Ojo al desfase, que es del modelo y no de aquí: `applyDailyLoad` devuelve el TSB de ANTES de
 * aplicar la carga del día (es la frescura con la que uno se levanta). La proyección lo respeta tal
 * cual en vez de «arreglarlo», porque si lo arreglara dejaría de coincidir con el diario real.
 */
export function projectLoad(
  start: Load,
  plan: readonly TrainingChoice[],
  recovery: number,
): ProjectedDay[] {
  const out: ProjectedDay[] = []
  let estado: Load = { ctl: start.ctl, atl: start.atl }
  for (let i = 0; i < plan.length; i++) {
    const tss = sessionTss(plan[i]!)
    const siguiente = applyDailyLoad(estado, tss, recovery)
    estado = { ctl: siguiente.ctl, atl: siguiente.atl }
    out.push({
      day: i,
      ctl: siguiente.ctl,
      atl: siguiente.atl,
      // El TSB con el que AMANECE el día siguiente, que es el que el jugador quiere leer cuando
      // señala una fecha del calendario y pregunta «¿cómo llego a ésta?».
      tsb: siguiente.ctl - siguiente.atl,
      tss,
    })
  }
  return out
}

/**
 * CÓMO VAS A LLEGAR, en una palabra (docs/entrenamiento.md §5.3).
 *
 * Los cortes no son redondos: son los del `tsbFactor` del SPEC 4.1, que es la curva con la que el
 * TSB se convierte en rendimiento dentro de la carrera. `+18` es donde el rendimiento empieza a
 * caer por pasarse de fresco, `+5` donde llega al 95 %, `−10` donde se queda en el 55 %, y `−35`
 * donde el motor considera que ya no queda nada. Si esta escala usara sus propios números, la
 * pantalla diría «perfecto» de un TSB que la carrera castiga.
 */
export type ArrivalLabel = 'oxidado' | 'perfecto' | 'bien' | 'cargado' | 'fundido'

export function arrivalLabel(tsb: number): ArrivalLabel {
  if (tsb > 25) return 'oxidado'
  if (tsb >= 5) return 'perfecto'
  if (tsb >= -10) return 'bien'
  if (tsb >= -30) return 'cargado'
  return 'fundido'
}

/**
 * El rango de lo que un plan puede DAR, no lo que dará: «entre +1,2 y +2,1 en montaña».
 *
 * Se expresa como rango a propósito. La ganancia real depende de `kAge`, `kDim`, el talento, la
 * salud del día, el gimnasio del equipo y el grupo, y prometer una cifra exacta sería prometer algo
 * que el tick puede desmentir. Lo que sí es exacto es el TSS: eso es función pura del plan.
 */
export function planTss(plan: readonly TrainingChoice[]): number {
  return plan.reduce((a, c) => a + sessionTss(c), 0)
}
