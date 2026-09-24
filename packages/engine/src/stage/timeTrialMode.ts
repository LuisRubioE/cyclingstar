/**
 * LA CRONO COMO MODO DE CARRERA (R27, docs/tactica.md paso 19).
 *
 * Montado **encima** de `timetrial.ts`, que no se toca: la ley de la crono, el compuesto CRI, el
 * pacing y la rampa de salida se quedan como están, y sus dos bandas mejor ancladas —`tailPct` 8-15
 * y `worstStagePct` 0-17— no se mueven. Lo que falta no es física: es **que una crono sea una
 * carrera y no un examen**.
 *
 * Hoy un contrarreloj es un hombre solo contra un cronómetro, y eso deja fuera todo lo que de verdad
 * decide una crono de vuelta: cómo la dosificas, con qué parciales corres, quién te marca el tiempo,
 * a qué hora te toca salir y si el cielo cambia entre el primero y el último.
 */
import { STAGE } from '../constants.js'

/** Cómo se reparte el esfuerzo en la crono. Lo ordena el jugador o lo pone su director. */
export type TtPacing = 'a_tope' | 'progresivo' | 'conservador'

/**
 * LA DOSIFICACIÓN, Y ES UNA APUESTA (R27.1, S-143/S-125/S-382).
 *
 * Salir a tope gana doce segundos esperados **y más que duplica** la probabilidad de hundirse en el
 * último tercio; salir conservador pierde diez y no arriesga nada. Eso es una decisión, y hasta hoy
 * no existía: todo el mundo corría igual.
 *
 * Devuelve el ajuste en segundos —negativo es más rápido— para que el que lo aplique no tenga que
 * saber el signo de memoria.
 */
export function pacingTimeDeltaS(pacing: TtPacing): number {
  if (pacing === 'a_tope') return -STAGE.timeTrial.allOutS
  if (pacing === 'conservador') return STAGE.timeTrial.saveS
  return 0
}

/** …y lo que esa apuesta multiplica el riesgo de reventar en el último tercio. */
export function pacingBlowUpGain(pacing: TtPacing): number {
  return pacing === 'a_tope' ? STAGE.timeTrial.blowUpGain : 1
}

/**
 * EL GREGARIO SIN NADA QUE JUGARSE (R27.1, S-125, y es un **contrario** del catálogo): corre al 70 %
 * **dentro del corte**, y eso le deja depósito para mañana. Hoy el motor le hace vaciarse en una
 * crono que no le sirve para nada, que es exactamente lo que ningún equipo hace.
 *
 * Y su hermano (S-382): el que ya va a perder tres minutos tampoco se vacía. Su director le pone
 * conservador, porque la crono de hoy ya está perdida y la etapa de mañana no.
 */
export function domestiqueShare(sinNadaQueJugarse: boolean): number {
  return sinNadaQueJugarse ? STAGE.timeTrial.domestiqueShare : 1
}

/**
 * LAS REFERENCIAS DEL RIVAL (R27.2, S-332/S-039/S-036). El maillot corre con los parciales del
 * segundo en el oído: si pierde más de ocho segundos en un parcial **sube el riesgo** —y con él la
 * probabilidad de hundirse—; si gana, lo baja y no arriesga en las curvas.
 *
 * Es lo que convierte el orden de salida en algo que IMPLICA: el que sale pronto dosifica para
 * mañana y el que sale último corre con la carrera hecha delante.
 */
export function riskFromSplits(diferenciaEnElParcialS: number): number {
  if (diferenciaEnElParcialS > STAGE.timeTrial.panicSplitS) return STAGE.timeTrial.panicRiskGain
  if (diferenciaEnElParcialS < -STAGE.timeTrial.panicSplitS) return STAGE.timeTrial.safeRiskDamp
  return 1
}

/**
 * EL ALCANCE ES UN CASTIGO ASIMÉTRICO (R27.2). El alcanzado no puede coger la rueda —está prohibido,
 * hay distancia mínima y el comisario la vigila—, así que se hunde; el que alcanza **no gana nada**
 * salvo la referencia. Esa asimetría es la regla: si alcanzar diera ventaja, la crono estaría rota.
 */
export function caughtPenaltyS(alcanzado: boolean): number {
  return alcanzado ? STAGE.timeTrial.caughtPenaltyS : 0
}

/**
 * MARCAR TIEMPO PARA EL JEFE (R27.4, S-021): un leal sale antes con la orden de marcar tiempo, y su
 * parcial le vale al jefe cinco segundos. Es «con lo que eso implica», la fila literal — y es la
 * única forma que tiene un equipo de hacer trabajo de equipo en una prueba individual.
 */
export function pacerGainS(tieneLiebre: boolean): number {
  return tieneLiebre ? STAGE.timeTrial.pacerGainS : 0
}

/**
 * EL CAMBIO DE BICI PLANEADO (R27.3, S-436). El equipo decide ANTES el punto del cambio: cuesta
 * dieciocho segundos y gana medio segundo por kilómetro en el terreno adecuado.
 *
 * **A veces la decisión correcta es no cambiar, y por eso es una decisión.** Con menos de unos
 * cincuenta kilómetros de terreno favorable el cambio no se amortiza, y el director que lo hace
 * igualmente pierde la crono en el arcén.
 */
export function bikeSwapNetS(kmFavorables: number): number {
  return STAGE.timeTrial.bikeSwapS - STAGE.timeTrial.bikeGainPerKm * Math.max(0, kmFavorables)
}

/** Y por eso se puede contestar con un sí o un no: ¿sale a cuenta cambiar? */
export function worthSwapping(kmFavorables: number): boolean {
  return bikeSwapNetS(kmFavorables) < 0
}

/**
 * LA LOTERÍA DEL HORARIO (R27.5, S-462). El parte va por FRANJA, y los últimos —que son los
 * favoritos, por el orden inverso— pueden coger la lluvia que los primeros no vieron. Veinte
 * segundos de media por franja, que en una general de tres semanas es una carrera entera.
 *
 * No es azar gratuito: es azar **con aviso**, porque el equipo lo sabe antes y puede adelantar el
 * calentamiento, cambiar material o asumir que hoy la general la reparte el cielo.
 */
export function slotWeatherS(franja: number, z: number): number {
  return STAGE.timeTrial.weatherSpreadS * z * (franja > 0 ? 1 : 0)
}
