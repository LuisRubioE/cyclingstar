/**
 * LA RADIO DE CARRERA (v28): la carrera KILÓMETRO A KILÓMETRO.
 *
 * El journal cuenta la etapa DESPUÉS —frases, protagonistas, narración—. Esto es lo otro: qué
 * grupos hay en un punto del recorrido, quién va en cada uno, cuánto hueco llevan y quién va
 * tirando. Es lo que se anuncia por la radio de carrera mientras la etapa pasa.
 *
 * **Por qué vive aquí y no dentro del script.** El motor ya sabía todo esto —lo dice la foto de
 * `StageProbe`— pero repartido en corredores sueltos; lo que faltaba era la vuelta de tuerca que
 * agrupa una foto en «estado de carrera»: ordenar los grupos por carretera, medir los huecos y
 * nombrar a los que tiran. Esa cuenta es la misma para la herramienta de depuración de hoy y
 * para la vista recorrible de mañana, así que no puede vivir dentro de ninguna de las dos.
 *
 * **Y es OBSERVACIÓN, como la foto de la que sale**: aquí no se estima nada. El hueco entre dos
 * grupos es la RESTA de sus relojes en el mismo kilómetro —exacta, no aproximada—, que es
 * justamente lo que no se podía hacer reconstruyendo la carrera a mano desde el reguero de eventos.
 *
 * Puro y determinista: sin azar, sin reloj de pared y sin ordenaciones que dependan del orden de
 * inserción (todo empate se rompe por id).
 */
import { ENGINE_VERSION, STAGE } from '../constants.js'
import { mainGroupId } from '../stage/group.js'
import type { PullMotive, SnapshotRider, StageProbe } from '../stage/types.js'

/** ¿Se puede volver a correr una etapa YA CORRIDA y obtener la misma carrera? */
export interface ReplayCheck {
  /** true si el replay es FIEL: la etapa corrió con este mismo motor. */
  faithful: boolean
  /** Versión del motor con la que corrió (la de su `stage_snapshots.engineVersion`). */
  ranWith: number
  /** Versión del motor de este árbol. */
  today: number
}

/**
 * LA GUARDA DEL REPLAY, y es la regla más importante de todo esto.
 *
 * Una etapa ya corrida se puede reconstruir entera desde su snapshot —la semilla y la entrada están
 * guardadas y el motor es determinista—, pero SOLO si corrió con el motor de hoy. Con un motor
 * distinto la re-simulación cuenta una carrera diferente de la que quedó en el marcador: es
 * literalmente el defecto por el que el journal se congeló en `stage_snapshots.events` en vez de
 * re-simularse al vuelo (ver `apps/api/src/stageHistory.ts`).
 *
 * Así que hay dos respuestas y solo dos —replay fiel, o no se puede reconstruir—, y nunca una
 * tercera que enseñe una carrera que no pasó. La regla vive aquí, con la radio, porque el que
 * reconstruye una etapa es exactamente quien tiene que preguntarla: hoy la herramienta de
 * depuración, mañana la vista del jugador.
 */
export function checkReplay(snapshotEngineVersion: number): ReplayCheck {
  return {
    faithful: snapshotEngineVersion === ENGINE_VERSION,
    ranWith: snapshotEngineVersion,
    today: ENGINE_VERSION,
  }
}

/**
 * Qué es cada grupo en la carretera. Se deduce de dónde está respecto al PELOTÓN, y el pelotón es el
 * grupo que lleva la gente (v29, `mainGroupId`), no el que salió con ese id. Antes mandaba el id, y
 * por eso esta tabla llegó a imprimir «[3] pelotón 2 · [4] grupeto 15 … cola 100 en 4 grupos»: un
 * pelotón de dos corredores con cien detrás llamados grupeto.
 */
export type RadioGroupKind =
  /** Va en cabeza de carrera y salió como movimiento: la fuga. */
  | 'fuga'
  /** Otro movimiento por delante del pelotón, pero no el primero: contraataque o puente. */
  | 'contra'
  /** El pelotón, tenga el tamaño que tenga. */
  | 'peloton'
  /** Un movimiento que ha quedado POR DETRÁS del pelotón: tierra de nadie. */
  | 'tierra'
  /** Descolgados: el grupeto y sus astillas. */
  | 'grupeto'

/**
 * QUÉ PARTE DE LA CARRERA HAY QUE LLEVAR PARA LLAMARSE PELOTÓN. Dos tercios de los que siguen en
 * carrera. El número sale de las dos quejas que lo fijan, una por cada lado:
 *
 *  - un grupo de **129** con la carrera casi entera dentro salía como «grupo de cabeza» solo por
 *    haber perdido a alguien —el listón era el pelotón EN PLENO—, y un pelotón sigue siendo el
 *    pelotón aunque se le haya escapado una fuga y se le haya caído un grupeto;
 *  - y cuando la carrera se parte en **59 y 65**, el de 65 tampoco es «el pelotón»: es media
 *    carrera. Con mayoría simple (65 de 124 es un 52 %) se habría seguido llamando pelotón, así que
 *    la mayoría no vale como listón.
 *
 * VIVE AQUÍ DESDE LA v34, y no en la vista. Estaba escrita solo en `apps/web` y el radio de terminal
 * (`scripts/race-radio.mjs`) seguía llamando pelotón a lo que llevara la etiqueta, así que las dos
 * herramientas decían cosas distintas del MISMO grupo. La regla es una; los rótulos, cada uno en su
 * idioma.
 */
export const PELOTON_MIN_SHARE = 2 / 3

/**
 * ¿Es este grupo EL PELOTÓN, o solo lleva su etiqueta? La etiqueta (`kind`) la pone el motor por el
 * id con el que nació el grupo; esto pregunta por lo que ES: cuánta carrera lleva dentro.
 */
export function isTheBunch(kind: RadioGroupKind, size: number, racing: number): boolean {
  return kind === 'peloton' && size >= racing * PELOTON_MIN_SHARE
}

/** Un corredor de los que TIRAN, con lo que está poniendo y PARA QUÉ. */
export interface RadioPuller {
  riderId: string
  /** Trabajo al frente reciente (ventana con olvido). 0 fuera del pelotón. */
  pullWindow: number
  /**
   * PARA QUÉ está dando la cara (v47). Lo pidió el dueño al ver a un equipo relevando en el tercer
   * grupo mientras su líder iba en el segundo: «busca de algún modo dejar una evidencia que explique
   * por qué o para qué tira cada ciclista de un grupo». Ver `PullMotive` en el motor.
   */
  motivo: PullMotive | null
}

/** Un grupo de la carretera en un punto del recorrido. */
export interface RadioGroup {
  /** El id del motor, tal cual: `peloton`, `mov-3`, `shed-7`. Sirve para seguir un grupo km a km. */
  id: string
  kind: RadioGroupKind
  /** Su sitio en la carretera: 1 el que va delante del todo. */
  position: number
  size: number
  /** Quiénes van dentro, ordenados por su reloj (el que va más adelantado, primero). */
  riderIds: readonly string[]
  /**
   * …y el reloj de CADA UNO, en el mismo orden que `riderIds`. Es lo que permite medir la velocidad
   * del grupo por los HOMBRES y no por los relojes de dos grupos (ver `groupSpeedKmh`), que es de
   * donde salían los 62 km/h de un pelotón partido y los 56 de un descolgado solitario.
   */
  riderTs: readonly number[]
  /** Reloj del grupo en este punto, en segundos desde la salida: el del primero de los suyos. */
  tS: number
  /** Hueco al LÍDER DE CARRERA, en segundos. Exacto: es una resta de relojes, no una estimación. */
  gapS: number
  /** Depósito medio de los suyos, en % de con lo que salieron (SPEC 6.5). */
  energyPct: number
  /** Quiénes TIRAN, de más a menos trabajo reciente. */
  pulling: readonly RadioPuller[]
}

/** El estado de la carrera en un kilómetro. */
export interface RadioKm {
  /** Km REAL del bloque en que se tomó la foto (múltiplo de `STAGE.dx`). */
  km: number
  /** Los grupos, del primero de carretera al último. */
  groups: readonly RadioGroup[]
  /** Cuántos siguen en carrera aquí. */
  racing: number
  /** Cuántos de los que tomaron la salida ya no están (abandonos). */
  gone: number
  /** Qué grupo lleva el título de PELOTÓN en esta foto (v29). Se pasa a la siguiente por histéresis. */
  mainId: string | null
}

/** La etapa entera, kilómetro a kilómetro. */
export interface RaceRadio {
  /** Corredores que tomaron la salida (los de la primera foto más los que ya faltaban en ella). */
  starters: number
  kms: readonly RadioKm[]
}

export interface RaceRadioOptions {
  /**
   * Cuántos tomaron la salida. Si no se dice, se toma el máximo de corredores visto en una foto:
   * en el kilómetro 1 todavía no se ha caído nadie, así que en la práctica es el mismo número.
   */
  starters?: number
  /**
   * Cuántos relevistas se nombran como mucho por grupo. Por defecto, TODOS. Solo lo baja quien tiene
   * un ancho de columna que respetar; el dato guardado los lleva todos.
   */
  maxPullers?: number
}

/**
 * Por defecto se nombran TODOS los que están relevando, que es la verdad de la carretera: si en un
 * grupo se están pasando los relevos veinte hombres, están tirando veinte. El tope existe solo para
 * quien PINTA una tabla estrecha —la de terminal de `scripts/race-radio.mjs` pide dos— y nunca para
 * lo que se guarda: recortar ahí sería tirar un dato que luego no se puede recuperar.
 */
const DEFAULT_MAX_PULLERS = Number.POSITIVE_INFINITY

/** Km redondeado a la décima: el motor da múltiplos de `dx` y en coma flotante eso no es exacto. */
function roundKm(km: number): number {
  return Math.round(km / STAGE.dx) * STAGE.dx
}

/**
 * Los kilómetros que se le piden a la foto para una etapa: uno de cada `everyKm` **empezando por la
 * salida**, más el último bloque, que es donde se decide. `simulateStage` resuelve cada uno al
 * bloque que le toca, así que no hace falta que caigan en un múltiplo exacto de `dx`.
 *
 * EMPIEZA EN 0 Y NO EN `everyKm`: la primera foto de la tabla era la del km 1, y ahí la carrera ya
 * ha pasado por diez bloques de decisión —medido, un 73,5 % de las etapas llega al km 1 con más de
 * un grupo en carretera—, así que la radio abría SIEMPRE con una fuga ya hecha y el lector no veía
 * nunca el pelotón junto del que sale. La salida es un estado de carrera como cualquier otro y la
 * tabla tiene que poder enseñarlo.
 */
export function radioKmPoints(totalKm: number, everyKm = 1): readonly number[] {
  const kms: number[] = []
  for (let km = 0; km < totalKm; km += everyKm) kms.push(Math.round(km * 10) / 10)
  const last = Math.max(0, totalKm - STAGE.dx)
  if (kms.length === 0 || kms[kms.length - 1]! < last) kms.push(Math.round(last * 10) / 10)
  return kms
}

/** El estado de la carrera en UNA foto: los grupos, ordenados por carretera, con sus huecos. */
export function radioKmFrom(
  km: number,
  riders: readonly SnapshotRider[],
  starters: number,
  maxPullers: number = DEFAULT_MAX_PULLERS,
  /**
   * Quién llevaba el título de PELOTÓN en la foto anterior (v29). La radio se lee kilómetro a
   * kilómetro y el título se defiende por tamaño con histéresis: sin este dato, dos mitades
   * parecidas se lo intercambiarían de fila en fila y la tabla sería ilegible justo donde importa.
   * `null` en la primera foto: manda el tamaño.
   */
  previousMainId: string | null = null,
  /**
   * EL PELOTÓN SEGÚN EL MOTOR (v47). Si viene, manda: `mainGroupId` lleva histéresis y recalcularla
   * aquí abre una segunda verdad que puede divergir de la que la carrera está usando para decidir
   * quién tira. Solo se recalcula cuando no viene —las fotos a mano de un test—.
   */
  engineMainId?: string,
): RadioKm {
  const byGroup = new Map<string, SnapshotRider[]>()
  for (const r of riders) {
    const list = byGroup.get(r.groupId)
    if (list) list.push(r)
    else byGroup.set(r.groupId, [r])
  }
  // El reloj del GRUPO es el de su primer hombre: dentro de un grupo estirado por una rampa cada
  // corredor lleva encima su propia deriva, y el grupo va donde va su cabeza.
  const raw = [...byGroup.entries()].map(([id, members]) => {
    const sorted = [...members].sort((a, b) => a.tS - b.tS || (a.riderId < b.riderId ? -1 : 1))
    let fresh = 0
    for (const m of sorted)
      fresh += m.energy0 > 0 ? Math.max(0, Math.min(1, m.energy / m.energy0)) : 0
    const pulling = sorted
      .filter((m) => m.pulling)
      .sort((a, b) => b.pullWindow - a.pullWindow || (a.riderId < b.riderId ? -1 : 1))
      .slice(0, maxPullers)
      .map((m) => ({ riderId: m.riderId, pullWindow: m.pullWindow, motivo: m.pullMotive }))
    return {
      id,
      tS: sorted[0]!.tS,
      size: sorted.length,
      riderIds: sorted.map((m) => m.riderId),
      riderTs: sorted.map((m) => m.tS),
      energyPct: (100 * fresh) / sorted.length,
      pulling,
    }
  })
  // Orden de CARRETERA: manda el reloj, y el id desempata para que dos grupos clavados no bailen.
  raw.sort((a, b) => a.tS - b.tS || (a.id < b.id ? -1 : 1))
  const leadTs = raw.length > 0 ? raw[0]!.tS : 0
  /**
   * EL PELOTÓN ES EL QUE LLEVA LA GENTE (v29). Era el grupo con id `peloton`, y por eso esta misma
   * tabla llegó a imprimir «[3] pelotón 2 · [4] grupeto 15 … cola 100 en 4 grupos»: un pelotón de
   * dos corredores con cien detrás llamados grupeto. La regla vive en `stage/group.ts` y es la
   * MISMA que usa el motor para medir los boquetes, para que la radio y la carrera no discrepen.
   */
  const mainId =
    engineMainId != null && raw.some((g) => g.id === engineMainId)
      ? engineMainId
      : mainGroupId(raw, previousMainId, STAGE.mainGroupTakeoverRatio)
  const mainTs = raw.find((g) => g.id === mainId)?.tS ?? null
  let movesAhead = 0
  const groups: RadioGroup[] = raw.map((g, i) => {
    const kind = kindOf(g.id, g.tS, mainId, mainTs, movesAhead)
    if (kind === 'fuga' || kind === 'contra') movesAhead += 1
    return {
      id: g.id,
      kind,
      position: i + 1,
      size: g.size,
      riderIds: g.riderIds,
      riderTs: g.riderTs,
      tS: g.tS,
      gapS: g.tS - leadTs,
      energyPct: g.energyPct,
      pulling: g.pulling,
    }
  })
  const racing = riders.length
  return { km: roundKm(km), groups, racing, mainId, gone: Math.max(0, starters - racing) }
}

/**
 * Qué es cada grupo, decidido por DÓNDE ESTÁ y CUÁNTA GENTE LLEVA, no por su id (v29):
 *
 * - el grupo principal es el pelotón, se llame `peloton`, `shed-4` o `mov-2`;
 * - por DELANTE del pelotón se va escapado (la fuga y, tras ella, los contraataques);
 * - por DETRÁS del pelotón se va descolgado, aunque el grupo naciera con el nombre de pelotón;
 * - y `tierra` es lo de siempre: un movimiento que ya no va por delante y aún no ha sido absorbido.
 */
function kindOf(
  id: string,
  tS: number,
  mainId: string | null,
  mainTs: number | null,
  movesAhead: number,
): RadioGroupKind {
  if (id === mainId) return 'peloton'
  if (mainTs === null) return id.startsWith('shed-') ? 'grupeto' : 'fuga'
  if (tS > mainTs) {
    // Detrás del pelotón. El ORIGEN sí informa aquí, y es la única vez que lo hace: uno que atacó y
    // se quedó sin piernas está en tierra de nadie; uno que se descolgó —o lo que quede del grupo
    // que se llamaba pelotón y ha perdido el título— es grupeto.
    return id.startsWith('mov-') ? 'tierra' : 'grupeto'
  }
  // Un movimiento cuenta como escapado mientras vaya por delante del pelotón; a la misma altura, ni
  // una cosa ni la otra.
  if (tS === mainTs) return 'tierra'
  return movesAhead === 0 ? 'fuga' : 'contra'
}

/**
 * UN RECOLECTOR DE FOTOS listo para enchufar al motor. Se crea, se le pasa `.probe` a
 * `simulateStage` y al terminar `.radio()` devuelve la carrera km a km:
 *
 * ```ts
 * const radio = raceRadioCollector(radioKmPoints(151))
 * simulateStage(input, seed, radio.probe)
 * for (const row of radio.radio().kms) …
 * ```
 *
 * Guarda las fotos por km y las convierte al final: así el bucle del motor no paga más que un
 * `push`, que es lo que pide una observación que no debe pesar en la carrera.
 */
export function raceRadioCollector(
  atKm: readonly number[],
  options: RaceRadioOptions = {},
): { probe: StageProbe; radio: () => RaceRadio } {
  const shots: { km: number; riders: SnapshotRider[]; mainId: string | null }[] = []
  return {
    probe: {
      atKm,
      onSnapshot: (km, riders, mainId) => {
        shots.push({ km, riders: [...riders], mainId })
      },
    },
    radio: () => raceRadioFrom(shots, options),
  }
}

/** La carrera km a km a partir de las fotos ya tomadas. Función pura: se puede llamar dos veces. */
export function raceRadioFrom(
  shots: readonly {
    km: number
    riders: readonly SnapshotRider[]
    /**
     * CUÁL ES EL PELOTÓN según el MOTOR en esa foto (v47). Sin él la radio lo recalcula, y eso
     * arranca una segunda cadena de histéresis que acaba discrepando de la del motor —medido: 12
     * fotos sobre seis carreras del banco, y en ellas los relevos del pelotón se anotaban como de
     * un grupeto—. `undefined` solo en las fotos armadas a mano de un test.
     */
    mainId?: string | null
  }[],
  options: RaceRadioOptions = {},
): RaceRadio {
  const maxPullers = options.maxPullers ?? DEFAULT_MAX_PULLERS
  // Los que tomaron la salida no salen en ninguna foto: la primera ya es del km 1 y para entonces
  // puede faltar alguien. A falta de dato de fuera, el máximo visto es la mejor cota inferior.
  let seen = 0
  for (const s of shots) seen = Math.max(seen, s.riders.length)
  const starters = options.starters ?? seen
  // El título de PELOTÓN se hereda de una foto a la siguiente (v29): la histéresis de `mainGroupId`
  // necesita saber quién lo tenía, o dos mitades parecidas se lo intercambiarían fila sí, fila no.
  let mainId: string | null = null
  const kms = [...shots]
    .sort((a, b) => a.km - b.km)
    .map((s) => {
      // El del motor manda; solo si no viene se hereda el de la foto anterior y se recalcula.
      const row = radioKmFrom(s.km, s.riders, starters, maxPullers, mainId, s.mainId ?? undefined)
      mainId = row.mainId
      return row
    })
  return { starters, kms }
}

/*
 * ── LA RADIO QUE SE GUARDA ──────────────────────────────────────────────────────────────────────
 *
 * La radio de arriba es la foto COMPLETA y repite la lista de corredores de cada grupo en cada
 * kilómetro: en un pelotón de 176 eso son 176 identificadores por km, ~200 KB por etapa.
 *
 * Aquí se guarda lo mismo sin repetirlo: la LISTA DE CORREDORES una sola vez y, por kilómetro, un
 * vector de enteros que dice en qué grupo va cada uno. Con eso la vista lo sabe TODO —dónde está
 * cada maillot, dónde va cada favorito— por ~55 KB, y no hay que elegir a quién sacrificar.
 *
 * Y guardarla hay que guardarla, no re-simularla: es la razón por la que la crónica se congela en
 * `stage_snapshots.events`. Una etapa corrida con el motor de ayer no se puede reconstruir con el de
 * hoy (`checkReplay`), así que una radio al vuelo estaría vacía justo para las etapas ya corridas.
 */

/** Un grupo en la radio guardada. Los corredores van por ÍNDICE sobre `StoredRaceRadio.riders`. */
export interface StoredRadioGroup {
  kind: RadioGroupKind
  size: number
  /** Hueco al LÍDER DE CARRERA, en segundos. Exacto: resta de relojes. */
  gapS: number
  /**
   * Velocidad media del grupo en ESTE kilómetro (km/h), o `null` cuando no hay con qué medirla: el
   * último punto del recorrido, o un grupo del que no queda nadie en la foto siguiente.
   *
   * No es una estimación: es la MEDIANA de lo que tardaron SUS CORREDORES en cubrir el kilómetro,
   * medida en el reloj de cada uno. Hasta la v34 se restaban los relojes de dos GRUPOS —el de aquí
   * y el de donde fue a parar su gente—, y como el reloj de un grupo es el mínimo de sus miembros,
   * un cambio de composición lo hacía saltar: de ahí salían los 62 km/h de un pelotón recién
   * partido y los 56 de un descolgado al que estaban cazando. Ver `groupSpeedKmh`.
   */
  speedKmh: number | null
  /**
   * Quiénes TIRAN del grupo, de más a menos trabajo reciente. Una sola lista desde la v34: o tiras
   * o no tiras, y los que tiran se reparten el viento entre ellos (`shelterOf`).
   *
   * El tope sigue estando por lo mismo de siempre —una lista larga no es un parte de radio— aunque
   * desde la v34 la rotación ya no puede pasar de `relayRotationMax`, así que rara vez se llega.
   * El número entero del grupo está en `size`.
   */
  pulling: readonly number[]
  /**
   * PARA QUÉ tira cada uno de `pulling`, en el MISMO orden y con la misma longitud (v47). Va como
   * lista paralela y no dentro de cada entrada porque `pulling` son índices y esto tiene que poder
   * guardarse igual de barato. `null` en una posición = la etapa se corrió antes de la v47.
   */
  motivos: readonly (PullMotive | null)[]
  /**
   * Los de la LISTA DE SEGUIMIENTO que van en este grupo y NO están en `pulling`: maillots, jefes de
   * filas y favoritos. Es lo que permite decir «el equipo tira para X» y que X aparezca, en vez de
   * quedar enterrado en un «+56 more». Quien llama decide a quién sigue; el motor solo los coloca.
   */
  watching: readonly number[]
}

/** Un kilómetro de la radio guardada. */
export interface StoredRadioKm {
  km: number
  groups: readonly StoredRadioGroup[]
  racing: number
  gone: number
}

/** La etapa entera, lista para guardar en `stage_snapshots.radio`. */
export interface StoredRaceRadio {
  starters: number
  /** Los corredores nombrados en algún punto, en orden fijo. `pulling` y `watching` indexan aquí. */
  riders: readonly string[]
  kms: readonly StoredRadioKm[]
}

/** Cuántos se guardan como «llevan el grupo». Ver el porqué del tope en `StoredRadioGroup.pulling`. */
const STORED_PULLERS_MAX = 12

/**
 * HASTA ESTE TAMAÑO SE NOMBRA AL GRUPO ENTERO, tire quien tire y lleve maillot quien lo lleve.
 *
 * `watch` resuelve «a quién hay que poder seguir SIEMPRE» —maillots y jefes de filas— y está pensado
 * para el pelotón, donde nombrar a ciento veinte no es información sino ruido. Pero aplicado a un
 * grupo pequeño daba justo lo contrario de lo que se quería: en una escapada de DOS, con uno
 * relevando y el otro a rueda, se nombraba a uno y el otro salía como «+1 rider more». Y en un grupo
 * de once perseguidores, seis tirando y el maillot, los otros cuatro se contaban en vez de decirse.
 *
 * En carretera, de un grupo pequeño se sabe quién va: son pocos y se les ve. El «+N more» es para
 * cuando de verdad no se puede nombrar a todos.
 */
const NAME_WHOLE_GROUP_UP_TO = 12

/**
 * DÓNDE ESTÁ ESTE GRUPO UN KILÓMETRO MÁS ALLÁ, para poder medirle la velocidad.
 *
 * Se buscaba por `id`, y así un grupo que se fundía o se rompía **desaparecía** y se quedaba sin
 * velocidad: en la tabla salían huecos justo en los kilómetros más interesantes —los de la reunión
 * de dos grupos—, que es exactamente donde el lector quiere saber a qué iban.
 *
 * Y no hacía falta rendirse, porque **el dato existe igual**: el reloj de un grupo es el tiempo de
 * carrera de su gente al pasar por ahí, así que el tiempo que tardan en cubrir el kilómetro se puede
 * restar aunque por el camino se hayan juntado con otros. Se sigue a LA GENTE, no a la etiqueta:
 *
 *  - si el grupo sigue existiendo, es él;
 *  - si se **fundió**, es el grupo en el que han acabado sus corredores;
 *  - si se **rompió**, es el trozo que se lleva a más de ellos (el mayor), que es el que hereda la
 *    identidad del grupo del que hablábamos.
 *
 * Solo se devuelve `undefined` cuando no queda ni uno —abandonos, o la última foto—, y ahí sí que no
 * hay nada que medir.
 */
/**
 * LA VELOCIDAD DE UN GRUPO SE MIDE POR SUS HOMBRES, NO POR DOS RELOJES DE GRUPO (v34).
 *
 * Aquí había un defecto de OBSERVACIÓN que el dueño vio en pantalla tres veces seguidas: «2nd group
 * 31 riders — 62,2 km/h», «Grupetto 1 rider — 56,8 km/h mientras el de delante va a 40». Nadie
 * pedalea a eso, y no lo pedaleaba nadie: la cuenta era mala.
 *
 * Lo que se hacía era buscar «dónde fue a parar la gente de este grupo» y restar el reloj de AQUEL
 * grupo menos el de ESTE. Los dos relojes son el MÍNIMO de sus miembros (el grupo va donde va su
 * cabeza), así que mientras la composición no cambie la resta es tiempo de carretera… y en cuanto
 * cambia, no lo es: es el salto del mínimo al cambiar de población. Y cambia justo en los momentos
 * en que uno mira la radio —un pelotón que se parte en dos, un descolgado al que cazan, un hombre
 * que entra en otro grupo—, porque el destino trae gente que iba por delante y el mínimo se
 * desploma. Un descolgado SOLO era el peor caso: su propio reloj es exacto y aun así se le medía
 * contra el mínimo del grupo que se lo comía.
 *
 * Medido antes del arreglo (3 carreras × 3 semillas, 17.982 grupo-kilómetro): la cifra coincidía
 * con la carretera en la mediana (0,03 km/h) y en el p90 (0,05), pero **el 2,18 % enseñaba 55 km/h
 * o más y el 0,57 % pasaba de 60**, y el peor caso decía 48,9 km/h donde la carretera hizo 13,1.
 * O sea: bien en el 98 % de los kilómetros y basura en uno de cada 175.
 *
 * Ahora se mide con el dato que ya estaba y no se usaba: el reloj de CADA hombre en las dos fotos.
 * La velocidad del grupo es la MEDIANA de lo que tardaron los suyos en cubrir el kilómetro, vayan
 * después al grupo que vayan. Es la misma pregunta hecha a quien la puede contestar, no puede
 * saltar por un cambio de composición, y la mediana aguanta a los dos o tres que se descuelgan.
 *
 * Si no queda ni uno de los suyos en la foto siguiente —todos han llegado a meta o se han
 * retirado—, no hay velocidad que dar y se devuelve `null`, que es lo honesto.
 */
/**
 * LA VELOCIDAD DE UN GRUPO ES LA DE LOS HOMBRES QUE SIGUEN EN ÉL (v49).
 *
 * Se medía con el reloj de TODOS los que estaban en el grupo en esta foto, mirados en la foto
 * siguiente, sin comprobar si seguían juntos. Y el que se cae de un grupo trae un Δt enorme —ha
 * perdido tiempo, para eso se ha caído—, así que se colaba en la mediana del grupo que acababa de
 * abandonar y lo pintaba frenando en seco.
 *
 * El dueño lo fotografió en la etapa 9 del Giro: cabeza de carrera **a 14,3 km/h** con la caza a
 * 35,9 y el pelotón a 41,8, en el mismo trozo de carretera —1:17 son unos 750 m, la misma
 * pendiente—. Y descartó él mismo la pájara: «mira el siguiente km», donde el mismo grupo va a 42,4.
 * Un pico de un solo punto de radio, no una carrera lenta.
 *
 * La corrección es quedarse con los que SIGUEN JUNTOS: de este grupo, los que en la foto siguiente
 * comparten el grupo más poblado. Se hace por mayoría y no por id de grupo porque los grupos se
 * funden y se renombran —un grupo cazado deja de existir con su id— y lo que define «el mismo
 * grupo» es la gente, no la etiqueta.
 */
function groupSpeedKmh(
  g: RadioGroup,
  clockAhead: ReadonlyMap<string, number>,
  dKm: number,
  groupAhead: ReadonlyMap<string, string> = new Map(),
): number | null {
  if (dKm <= 0) return null
  // Dónde acaba la MAYORÍA de este grupo: ése es «el mismo grupo» en la foto siguiente.
  const cuenta = new Map<string, number>()
  for (const id of g.riderIds) {
    const dónde = groupAhead.get(id)
    if (dónde !== undefined) cuenta.set(dónde, (cuenta.get(dónde) ?? 0) + 1)
  }
  let mayoria: string | null = null
  let mejor = 0
  for (const [id, n] of cuenta) {
    if (n <= mejor) continue
    mejor = n
    mayoria = id
  }
  const dts: number[] = []
  for (let i = 0; i < g.riderIds.length; i++) {
    const rider = g.riderIds[i]!
    const then = clockAhead.get(rider)
    if (then === undefined) continue
    // …y si sabemos dónde acaba cada uno, solo cuentan los que se quedan con la mayoría.
    if (mayoria !== null && groupAhead.get(rider) !== mayoria) continue
    const dt = then - g.riderTs[i]!
    if (dt > 0) dts.push(dt)
  }
  if (dts.length === 0) return null
  dts.sort((a, b) => a - b)
  const mid =
    dts.length % 2
      ? dts[(dts.length - 1) / 2]!
      : (dts[dts.length / 2 - 1]! + dts[dts.length / 2]!) / 2
  return Math.round((10 * (3600 * dKm)) / mid) / 10
}

/**
 * De la radio completa a la que se guarda.
 *
 * `watch` son los corredores que hay que poder nombrar SIEMPRE, vayan o no tirando. El motor no sabe
 * quién lleva maillot ni quién es favorito —eso vive en la base—, así que lo recibe de fuera y se
 * limita a decir en qué grupo está cada uno en cada kilómetro.
 *
 * La VELOCIDAD se calcula aquí, mirando el reloj del mismo grupo en la foto siguiente: es el único
 * sitio donde están las dos fotos a la vez.
 */
export function radioForStorage(
  radio: RaceRadio,
  watch: ReadonlySet<string> = new Set(),
  /**
   * LOS QUE NO SE PUEDEN CAER DEL CORTE, en orden de importancia (v47). Son los tres maillots, y
   * existen porque la vista nombra como mucho a 24 por grupo (`MAX_NAMED_PER_GROUP`) poniendo
   * primero a los que tiran: con doce tirando y la lista de seguimiento detrás EN ORDEN DE
   * CARRETERA, el corte caía justo encima de los maillots y qué maillot sobrevivía era azar. El
   * dueño lo reportó dos veces —«te dije que SIEMPRE se vean los 3 maillots y solo sale uno»— y no
   * era que faltara el dato: es que iba en el sitio equivocado de la cola.
   */
  priority: readonly string[] = [],
): StoredRaceRadio {
  const index = new Map<string, number>()
  const riders: string[] = []
  const idx = (id: string): number => {
    const found = index.get(id)
    if (found !== undefined) return found
    index.set(id, riders.length)
    riders.push(id)
    return riders.length - 1
  }

  const kms = radio.kms.map((k, i) => {
    const next = radio.kms[i + 1]
    // El reloj de cada corredor en la foto SIGUIENTE, una vez por kilómetro: es lo que necesita
    // `groupSpeedKmh` para medir la velocidad por los hombres en vez de por dos relojes de grupo.
    const clockAhead = new Map<string, number>()
    // …y EN QUÉ GRUPO acaba cada uno, que es lo que permite descartar al que se cayó del nuestro.
    const groupAhead = new Map<string, string>()
    if (next) {
      for (const g of next.groups)
        for (let j = 0; j < g.riderIds.length; j++) {
          clockAhead.set(g.riderIds[j]!, g.riderTs[j]!)
          groupAhead.set(g.riderIds[j]!, g.id)
        }
    }
    const groups = k.groups.map((g) => {
      /**
       * A QUIÉN SE GUARDA COMO QUE TIRA. El tope existe porque en un pelotón el turno son cuarenta
       * hombres y no caben; pero al que se cae del corte hay que dejarlo FUERA de los nombrados, no
       * moverlo a la otra lista: `inPull` se calculaba sobre el corte, así que un corredor que
       * estaba relevando y no entraba en los doce reaparecía entre los que van «a rueda», con el
       * icono de ir guarecido. Era el «símbolo de tirar que no sale en algunos que tiran»: no es que
       * faltara el icono, es que le poníamos el contrario.
       *
       * Y a los que hay que poder seguir SIEMPRE —los maillots— se les guarda tiren donde tiren,
       * aunque el corte los dejara fuera: si el maillot está dando la cara, eso es la noticia.
       */
      const keep = new Set(g.pulling.slice(0, STORED_PULLERS_MAX).map((p) => p.riderId))
      for (const p of g.pulling) if (watch.has(p.riderId)) keep.add(p.riderId)
      // Se filtra conservando el orden, que viene con los que dan la cara al viento primero.
      const pull = g.pulling.filter((p) => keep.has(p.riderId))
      const pulling = pull.map((p) => idx(p.riderId))
      // TODO el que tira queda excluido de los que van a rueda, entre en el corte o no.
      const pullingAll = new Set(g.pulling.map((p) => p.riderId))
      // En un grupo pequeño se nombra a todos; en el pelotón, a los que hay que poder seguir.
      const nameAll = g.size <= NAME_WHOLE_GROUP_UP_TO
      // …Y LOS MAILLOTS PRIMEROS (v47). El orden de esta lista es el que sobrevive al corte de la
      // vista, así que los que no se pueden caer van delante; el resto conserva el orden de
      // carretera, que es el que hace legible una tabla de radio.
      const rank = new Map(priority.map((id, i) => [id, i]))
      const watching = g.riderIds
        .filter((id) => (nameAll || watch.has(id)) && !pullingAll.has(id))
        .sort(
          (a, b) =>
            (rank.get(a) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b) ?? Number.MAX_SAFE_INTEGER),
        )
        .map(idx)
      // La velocidad del grupo en este km, medida por los suyos (ver `groupSpeedKmh`).
      const speedKmh = groupSpeedKmh(g, clockAhead, next ? next.km - k.km : 0, groupAhead)
      return {
        kind: g.kind,
        size: g.size,
        gapS: Math.round(g.gapS),
        speedKmh,
        pulling,
        motivos: pull.map((p) => p.motivo),
        watching,
      }
    })
    return { km: k.km, groups, racing: k.racing, gone: k.gone }
  })
  return { starters: radio.starters, riders, kms }
}
