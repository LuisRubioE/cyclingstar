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

/**
 * QUÉ ÚLTIMA ETAPA ES ÉSTA (paso 18b, R28.4 · S-075, S-270).
 *
 * La última etapa de una vuelta no es un martes cualquiera, y son **dos etapas distintas** según
 * dónde acabe. El diseño las escribe una debajo de la otra:
 *
 * - **general DECIDIDA** — «paseo hasta el circuito (compromiso ≤ 0,45), sin fugas serias ni ataques
 *   de general durante ~80 km, y el sprint del circuito DE VERDAD».
 * - **última etapa DECISIVA** (final en alto o crono final) — «todo o nada: se ataca desde el
 *   PENÚLTIMO puerto, los equipos se funden enteros y el maillot no deja ir nada».
 *
 * Y LO QUE LAS SEPARA NO ES UN DATO NUEVO: es dónde acaba la etapa. Una última etapa que termina al
 * sprint no puede cambiar la general —por eso se pasea— y una que termina en alto es justamente la
 * que sí puede. El motor ya sabe las dos cosas: `race.stageDay`/`totalStages` desde el paso 2 y el
 * tipo de final desde que existe `deriveFinishTerrain`.
 *
 * En una carrera de un día no hay «última etapa»: hay una etapa. Devuelve `'ninguno'` y nada de esto
 * se enciende, que es lo que hace que ningún escenario canónico lo note.
 *
 * **Y LA CRONO FINAL NO SE OLVIDA: es que no pasa por aquí.** El diseño mete «final en alto o crono
 * final» en el mismo brazo, y una contrarreloj sale de `simulateStage` por su propia puerta antes de
 * que nada de esto exista. Tiene sentido: en una crono no hay pelotón al que dar o quitar cuerda, ni
 * ataques que dosificar. El «todo o nada» de una crono final es la crono.
 */
export type UltimoDia = 'ninguno' | 'paseo' | 'decisiva'

export function ultimoDiaDeVuelta(
  race: { stageDay?: number; totalStages?: number } | undefined,
  bunchFinish: boolean,
): UltimoDia {
  const total = race?.totalStages ?? 1
  if (total <= 1 || race?.stageDay !== total) return 'ninguno'
  return bunchFinish ? 'paseo' : 'decisiva'
}

/**
 * LA CUERDA DE UN CIRCUITO (R28.6, S-227 · paso 18b), que es una frase del diseño escrita en código:
 * **«la carrera arranca a dos vueltas»**.
 *
 * Un circuito no se corre como una etapa de un sitio a otro. El diseño lo dice en tres trozos y los
 * tres caben en la misma cuenta, porque los tres hablan de CUÁNTAS VUELTAS QUEDAN:
 *
 * - con más de dos por delante no pasa nada serio —es el «arranca a dos vueltas»—;
 * - en la penúltima **se caza la fuga**, o sea se corre normal: ni se frena ni se dispara;
 * - y en la última **sale el ataque decisivo**.
 *
 * «La criba se ACUMULA vuelta a vuelta» no necesita código: sale sola de pasar por los mismos
 * puertos varias veces, porque el recorrido ya los lleva desplegados.
 *
 * Sin `laps`, o con una sola, devuelve 1 y no toca nada: es el caso de todo el calendario de hoy.
 */
export function cuerdaDelCircuito(
  km: number,
  totalKm: number,
  laps: number | undefined,
  antesDeDosVueltas: number,
  ultimaVuelta: number,
): number {
  if (!laps || laps < 2 || totalKm <= 0) return 1
  const vuelta = totalKm / laps
  const quedan = totalKm - km
  if (quedan > 2 * vuelta) return antesDeDosVueltas
  if (quedan <= vuelta) return ultimaVuelta
  return 1
}

/**
 * DÓNDE EMPIEZA EL TODO O NADA de una última etapa decisiva, en km desde la salida (R28.4).
 *
 * «Se ataca desde el PENÚLTIMO puerto», dice el diseño. Y no dice qué pasa si la última etapa tiene
 * **un solo puerto**, que es un final en alto perfectamente normal y justo el caso más decisivo que
 * hay. Dejarlo en `null` —que es lo que hacía la primera versión— apagaba el brazo decisivo entero
 * en esas etapas **sin que nadie se enterara**: el hueco silencioso de siempre.
 *
 * Con un solo puerto, el penúltimo ES el último, porque la frase quiere decir «desde que empieza la
 * parte que decide» y con una sola subida esa parte empieza ahí. Sin ningún puerto no hay nada que
 * resolver y devuelve `null`: una última etapa decisiva sin puertos no existe —sería un sprint, o
 * sea un paseo—, pero si llegara, inventarle un kilómetro sería peor que no tocarla.
 *
 * Ojo con la diferencia respecto a `kmDeLaCita`, que para el penúltimo puerto de una etapa con uno
 * solo devuelve `null` a propósito. No se contradicen: allí es la ORDEN de un jugador, y una cita
 * que él no puede haber querido no se le inventa; aquí es una regla sobre la etapa.
 */
export function kmDelTodoONada(puertos: readonly { desdeKm: number }[]): number | null {
  if (puertos.length === 0) return null
  return (puertos.at(-2) ?? puertos.at(-1))!.desdeKm
}

/**
 * DÓNDE SE ACABA EL PASEO Y EMPIEZA EL CIRCUITO, en km desde la salida (R28.4, paso 18b).
 *
 * El diseño dice «sin fugas serias ni ataques de general durante ~80 km», y ese ~80 es **cuánto dura
 * el paseo**, no cuánto falta para meta: el paseo va del km 0 al circuito, y el circuito es el resto.
 *
 * Y SIEMPRE HAY CIRCUITO. Las últimas etapas son cortas —el calendario las acorta a propósito— y un
 * paseo de 80 km se comería entera una de 90. El paseo se para antes si hace falta, porque la otra
 * mitad de la frase del diseño es «y el sprint del circuito DE VERDAD».
 */
export function finDelPaseo(totalKm: number, paseoKm: number, circuitoMinKm: number): number {
  return Math.min(paseoKm, Math.max(0, totalKm - circuitoMinKm))
}

/**
 * LA ALTITUD DE CADA BLOQUE, integrando las pendientes desde la cota de salida (R28.7, paso 18d).
 *
 * Un bloque de `dx` km al `g` % sube `g · dx · 10` metros. Es aritmética, no un modelo: la única
 * decisión aquí es **de dónde se parte**, y de eso se encarga `startM` —0 por defecto, porque el
 * calendario guarda pendientes y no cotas—.
 *
 * Se devuelve la altitud AL FINAL de cada bloque, que es la que el corredor está respirando cuando
 * lo paga.
 */
export function altitudesDelPerfil(blocks: readonly Block[], dx: number, startM = 0): number[] {
  const out: number[] = []
  let m = startM
  for (const b of blocks) {
    m += b.g * dx * 10
    out.push(m)
  }
  return out
}
