import type { Block, DayGoal, Effort, TriggerCond } from './types.js'

/**
 * LAS CITAS DE R22, RESUELTAS SOBRE EL PERFIL (paso 17b).
 *
 * `StageOrders.triggerOn` lleva desde el paso 17a con sus seis formas de decir «cuándo», y el motor
 * solo leía la del tiempo (R14.3, paso 20). Las otras cinco eran letra muerta: el jugador las
 * rellenaba, la base las guardaba y en la carretera no pasaba nada — que es exactamente el defecto
 * de la v58 con otra cara.
 *
 * Aquí se resuelven las que dependen SOLO DEL RECORRIDO —el puerto y el sector— porque son
 * posicionales: se pueden convertir en un kilómetro antes de que empiece la carrera. Las que
 * dependen de lo que hagan los demás —el hueco y el ataque de Z— no se pueden, y viven en el bucle.
 *
 * El resultado siempre es un KILÓMETRO, que es lo que pedía el diseño: cuando la cita se cumple, el
 * km en que se cumplió pasa a ser la cita y de ahí manda la maquinaria de `triggerKm` de la v58, sin
 * un caso especial más en el bucle de carrera.
 */

/** Un tramo del recorrido, en kilómetros desde la salida. */
export interface Tramo {
  desdeKm: number
  hastaKm: number
  /** El bloque más duro del tramo, en km. Para «en lo más duro» de un puerto. */
  duroKm: number
}

/**
 * LOS PUERTOS Y LOS SECTORES DE PAVÉS de un perfil, cada uno como un tramo continuo.
 *
 * Un puerto es una tirada seguida de bloques `subida`, y un sector una tirada seguida de `paves`.
 * Se cuentan así y no por las pancartas porque una cima puede no tener pancarta —y porque el
 * jugador que dice «al pie del último puerto» habla de la subida, no del cartel.
 */
export function tramosDelPerfil(
  blocks: readonly Block[],
  dx: number,
): { puertos: Tramo[]; sectores: Tramo[] } {
  const saca = (esDelTipo: (b: Block) => boolean): Tramo[] => {
    const out: Tramo[] = []
    let i = 0
    while (i < blocks.length) {
      if (!esDelTipo(blocks[i]!)) {
        i += 1
        continue
      }
      const desde = i
      let duro = i
      while (i < blocks.length && esDelTipo(blocks[i]!)) {
        if (Math.abs(blocks[i]!.g) > Math.abs(blocks[duro]!.g)) duro = i
        i += 1
      }
      out.push({ desdeKm: desde * dx, hastaKm: i * dx, duroKm: duro * dx })
    }
    return out
  }
  return {
    puertos: saca((b) => b.tipo === 'subida'),
    sectores: saca((b) => b.tipo === 'paves'),
  }
}

/**
 * EL KILÓMETRO DE UNA CITA POSICIONAL, o `null` si esta cita no lo es (o no existe en este perfil).
 *
 * «Al pie» es el principio del puerto; «en lo más duro», su bloque de mayor pendiente; «cerca de la
 * cima», el último quinto. Pedir el penúltimo puerto de una etapa con uno solo devuelve `null`: la
 * cita no se puede cumplir y el hombre corre con su mentalidad, que es mejor que inventarle un
 * kilómetro que él no pidió.
 */
export function kmDeLaCita(
  cond: TriggerCond | null | undefined,
  tramos: { puertos: Tramo[]; sectores: Tramo[] },
): number | null {
  if (!cond) return null
  if (cond.at === 'km') return cond.km
  if (cond.at === 'sector') {
    const s = tramos.sectores[cond.index - 1]
    return s ? s.desdeKm : null
  }
  if (cond.at === 'climb') {
    const n = tramos.puertos.length
    const p = tramos.puertos[cond.which === 'last' ? n - 1 : n - 2]
    if (!p) return null
    if (cond.part === 'pie') return p.desdeKm
    if (cond.part === 'duro') return p.duroKm
    return p.desdeKm + 0.8 * (p.hastaKm - p.desdeKm)
  }
  return null
}

/**
 * A QUÉ SALE HOY ESTE HOMBRE, aplicado (paso 17b, R22 · S-216, S-024, S-030).
 *
 * `dayGoal` **declara, no negocia**: el jugador dice a qué va y el resto de su hoja se ordena
 * alrededor. Por eso no es un modificador más sino una derivación — «hoy voy a por la montaña»
 * implica disputar las cimas, y tener que marcar además la casilla sería pedirle al jugador que
 * diga dos veces lo mismo y castigarle si se le olvida una.
 *
 * LO QUE NO HACE: quitar nada que el jugador haya puesto. Las casillas solo se ENCIENDEN, nunca se
 * apagan, y el esfuerzo solo SUBE. Una declaración es una intención, no un veto sobre lo que el
 * mismo hombre pidió en la línea de al lado; si alguien dice «hoy al grupeto» y marca las cimas, el
 * motor no está para decidir cuál de las dos cosas quiso decir de verdad.
 *
 * El grupeto es la única que no enciende nada: ir al grupeto es precisamente no disputar.
 */
export function metasDelDia(orders: {
  dayGoal?: DayGoal | null
  effort?: Effort
  contestSprints: boolean
  contestClimbs: boolean
}): { contestSprints: boolean; contestClimbs: boolean; effort?: Effort } {
  const g = orders.dayGoal
  const aTope = g === 'ganar' || g === 'general'
  const effort: Effort | undefined = aTope ? 'a_tope' : orders.effort
  return {
    contestSprints: orders.contestSprints || g === 'puntos',
    contestClimbs: orders.contestClimbs || g === 'montana',
    // El esfuerzo va con propagación condicional y no como `effort: undefined`: escribirlo a
    // `undefined` BORRA la palanca en la hoja al fusionarla, que es lo contrario de no tocarla.
    ...(effort ? { effort } : {}),
  }
}

/**
 * ¿HAY GENERAL EN JUEGO HOY? (paso 18b, R28.5 · S-074, S-388, S-158).
 *
 * En la etapa 1 de una vuelta y en toda carrera de un día TODOS llegan con `gcDeficitSeconds` = 0,
 * así que mirando solo los déficits los dos casos son idénticos y el motor deducía «no hay general»
 * en ambos. En el día 1 de una vuelta eso **apaga los tres frenos del maillot justo cuando la cuerda
 * es la más larga de la carrera**: nadie controla, nadie se cuida y nadie mira a una fuga que, si
 * llega, se viste el primer maillot con minutos. Es lo contrario de lo que pasa en carretera.
 *
 * Lo que separa los dos casos no son los déficits: es **si mañana hay otra etapa**.
 */
export function hayGeneralEnJuego(
  riders: readonly { gcDeficitSeconds: number }[],
  race?: { stageDay?: number; totalStages?: number },
): boolean {
  if (riders.some((r) => r.gcDeficitSeconds > 0)) return true
  return race?.stageDay === 1 && (race?.totalStages ?? 1) > 1
}
