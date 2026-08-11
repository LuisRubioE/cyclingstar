/**
 * EL ORDEN DE SALIDA DE UNA CONTRARRELOJ (motor v18, docs/balance.md «v18 — La contrarreloj»).
 *
 * Hasta la v17 una crono no tenía orden de salida: `simulateTimeTrial` recorría a cada corredor por
 * su cuenta, acumulaba su tiempo desde cero y ordenaba por tiempo. Nadie salía a una hora, así que
 * no existía la carretera compartida —ni la silla del mejor tiempo, ni los parciales, ni el alcance—.
 *
 * Aquí vive la REGLA, y solo la regla: una función pura que reparte los huecos de la rampa. Quién la
 * llama y qué hace con ellos es cosa de `stage/timetrial.ts`.
 *
 * **Dos casos, como en carretera:**
 *
 * 1. **Orden INVERSO de la general, 2 minutos** (`'general'`), cuando la crono es una etapa de una
 *    carrera por etapas que no es la primera. El último de la general sale primero y el líder,
 *    el último.
 * 2. **Por DORSALES, 1 minuto** (`'dorsales'`), en la primera etapa de una vuelta y en una carrera
 *    de un día. Se agrupa por la ÚLTIMA CIFRA del dorsal y dentro de cada grupo se sale del dorsal
 *    más alto al más bajo:
 *
 *    ```
 *    primero … 29, 19, 9 → … 28, 18, 8 → … → 22, 12, 2 → 21, 11, 1   (último: el dorsal 1)
 *    ```
 *
 *    Tiene sentido en este mundo porque los dorsales se asignan por equipos —1-9, 11-19, 21-29…,
 *    con el x1 para el de más fama (`packages/db/src/calendarRun.ts::assignBibs`)—, así que el
 *    acabado en 1 es el jefe de filas y todos los líderes salen al final.
 *
 * **CÓMO SE DISTINGUE UN CASO DEL OTRO, y por qué no hace falta una bandera nueva.** El motor es
 * puro y no sabe en qué etapa va: lo que sí sabe es si hay GENERAL con diferencias, porque
 * `gcDeficitSeconds` se lo dice corredor a corredor. En la primera etapa de una vuelta y en una
 * carrera de un día todos llegan con 0 —lo documenta el propio campo en `types.ts`— y no hay general
 * que invertir. Es exactamente el mismo criterio con el que `packages/db` decide si hay maillot de
 * líder al que dar alas (`stageRun.ts::hasLeaderJersey`), así que no pueden discrepar.
 *
 * **EL DORSAL VIAJA COMO DATO** (`StageRider.bib`), igual que `gcDeficitSeconds`: el motor no lo
 * inventa ni lo deduce del orden del array. Quien no lo traiga —roster antiguo, vuelta de prueba,
 * banco de simulación— sale al principio, que es el único sitio donde no le quita el hueco a nadie:
 * la propiedad que la regla promete es que el dorsal 1 CIERRA la crono, y eso se conserva.
 */
import { STAGE } from '../constants.js'

/** Lo que la regla necesita de cada corredor. Es un subconjunto de `StageRider`, a propósito. */
export interface StartOrderRider {
  riderId: string
  /**
   * Dorsal de la carrera (`race_rosters.bib`). Nulo o ausente = el roster no lo tiene.
   */
  bib?: number | null
  /** Desventaja en la general, en segundos. 0 en todos si no hay general (SPEC 6.9). */
  gcDeficitSeconds: number
}

/** Cómo se ha repartido la rampa. */
export type StartOrderMode = 'general' | 'dorsales'

/** El hueco de un corredor en la rampa de salida. */
export interface StartSlot {
  riderId: string
  /** Puesto en el orden de salida, 0-based: el 0 es el primero que toma la salida. */
  order: number
  /** Segundos desde que sale el primero. */
  startS: number
}

/** El reparto completo de la rampa. */
export interface StartOrderPlan {
  mode: StartOrderMode
  /** Segundos entre dos corredores consecutivos. */
  intervalS: number
  /** Los huecos, en orden de salida. */
  slots: StartSlot[]
}

/**
 * La clave de ordenación por dorsal, de menor a mayor «sale antes».
 *
 * - `[0, …]` para el que no tiene dorsal: sale al principio (ver la cabecera del módulo).
 * - Dentro de los que sí lo tienen, el grupo es la última cifra y se recorre de la más alta a la
 *   más baja, así que va NEGADO. La cifra 0 se cuenta como 10 —el dorsal 10 es el décimo de un
 *   bloque de equipo, no el primero—, así que los acabados en 0 salen por delante de los acabados
 *   en 9. En una vuelta por equipos no ocurre nunca (los bloques son x1..x9); en un campeonato
 *   nacional, donde se numera 1..N corrido, ocurre en cada decena.
 * - Y dentro del grupo, del dorsal más alto al más bajo, así que también va negado.
 */
function bibKey(bib: number | null | undefined): [number, number, number] {
  if (bib == null) return [0, 0, 0]
  const digit = ((Math.trunc(bib) % 10) + 10) % 10
  return [1, -(digit === 0 ? 10 : digit), -bib]
}

/** Compara dos claves de dorsal (orden lexicográfico). */
function compareBib(a: StartOrderRider, b: StartOrderRider): number {
  const ka = bibKey(a.bib)
  const kb = bibKey(b.bib)
  return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2]
}

/**
 * Reparte la rampa de salida de una contrarreloj. Pura y total: con el mismo campo devuelve siempre
 * el mismo orden, y no hay entrada —dorsales nulos, empates en la general, huecos en la numeración—
 * que la deje sin decidir, porque el último desempate es el `riderId`.
 */
export function timeTrialStartOrder(riders: readonly StartOrderRider[]): StartOrderPlan {
  // ¿Hay general que invertir? Basta con que UNO haya perdido tiempo: si todos están a 0 es la
  // primera etapa o una carrera de un día (ver la cabecera del módulo).
  const hasGc = riders.some((r) => r.gcDeficitSeconds > 0)
  const sorted = [...riders].sort((a, b) => {
    // Caso A: el último de la general sale primero, el líder el último.
    if (hasGc && a.gcDeficitSeconds !== b.gcDeficitSeconds) {
      return b.gcDeficitSeconds - a.gcDeficitSeconds
    }
    // Caso B —y el desempate del caso A—: el dorsal. Que la regla de dorsales desempate la general
    // no es un apaño: tras una etapa llana el pelotón entero comparte tiempo, y lo que decide
    // entonces es lo mismo que decidiría en la etapa 1, con los jefes de filas cerrando la crono.
    return compareBib(a, b) || (a.riderId < b.riderId ? -1 : a.riderId > b.riderId ? 1 : 0)
  })
  const intervalS = hasGc ? STAGE.ttStartIntervalGcS : STAGE.ttStartIntervalBibS
  return {
    mode: hasGc ? 'general' : 'dorsales',
    intervalS,
    slots: sorted.map((r, i) => ({ riderId: r.riderId, order: i, startS: i * intervalS })),
  }
}
