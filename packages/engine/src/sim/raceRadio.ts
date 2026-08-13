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
 * nombrar el turno de relevos. Esa cuenta es la misma para la herramienta de depuración de hoy y
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
import type { SnapshotRider, StageProbe } from '../stage/types.js'

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

/** Un corredor en el turno de relevos, con lo que está poniendo. */
export interface RadioPuller {
  riderId: string
  /** Da la cara al viento en cabeza del pelotón (el equipo que lleva el frente). */
  onTheFront: boolean
  /** Trabajo al frente reciente (ventana con olvido). 0 fuera del pelotón. */
  pullWindow: number
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
  /** Reloj del grupo en este punto, en segundos desde la salida: el del primero de los suyos. */
  tS: number
  /** Hueco al LÍDER DE CARRERA, en segundos. Exacto: es una resta de relojes, no una estimación. */
  gapS: number
  /** Depósito medio de los suyos, en % de con lo que salieron (SPEC 6.5). */
  energyPct: number
  /** Quién va en el turno de relevos, de más a menos trabajo reciente. */
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
   * Cuántos relevistas se nombran como mucho por grupo. En una fuga de cuatro se nombran los
   * cuatro; en un pelotón de ciento veinte el turno son treinta hombres y nombrarlos a todos no es
   * un parte, es un volcado.
   */
  maxPullers?: number
}

/** Por defecto se nombran hasta tres, que es lo que cabe leído de un vistazo. */
const DEFAULT_MAX_PULLERS = 3

/** Km redondeado a la décima: el motor da múltiplos de `dx` y en coma flotante eso no es exacto. */
function roundKm(km: number): number {
  return Math.round(km / STAGE.dx) * STAGE.dx
}

/**
 * Los kilómetros que se le piden a la foto para una etapa: uno de cada `everyKm` más el último
 * bloque, que es donde se decide. `simulateStage` resuelve cada uno al bloque que le toca, así que
 * no hace falta que caigan en un múltiplo exacto de `dx`.
 */
export function radioKmPoints(totalKm: number, everyKm = 1): readonly number[] {
  const kms: number[] = []
  for (let km = everyKm; km < totalKm; km += everyKm) kms.push(Math.round(km * 10) / 10)
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
      .filter((m) => m.relaying)
      .sort(
        (a, b) =>
          Number(b.onTheFront) - Number(a.onTheFront) ||
          b.pullWindow - a.pullWindow ||
          (a.riderId < b.riderId ? -1 : 1),
      )
      .slice(0, maxPullers)
      .map((m) => ({ riderId: m.riderId, onTheFront: m.onTheFront, pullWindow: m.pullWindow }))
    return {
      id,
      tS: sorted[0]!.tS,
      size: sorted.length,
      riderIds: sorted.map((m) => m.riderId),
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
  const mainId = mainGroupId(raw, previousMainId, STAGE.mainGroupTakeoverRatio)
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
  const shots: { km: number; riders: SnapshotRider[] }[] = []
  return {
    probe: {
      atKm,
      onSnapshot: (km, riders) => {
        shots.push({ km, riders: [...riders] })
      },
    },
    radio: () => raceRadioFrom(shots, options),
  }
}

/** La carrera km a km a partir de las fotos ya tomadas. Función pura: se puede llamar dos veces. */
export function raceRadioFrom(
  shots: readonly { km: number; riders: readonly SnapshotRider[] }[],
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
      const row = radioKmFrom(s.km, s.riders, starters, maxPullers, mainId)
      mainId = row.mainId
      return row
    })
  return { starters, kms }
}
