import type { AltimetryMarker } from '@cyclingstar/engine'
import {
  type ChronicleRider,
  type RaceLeaders,
  type RaceRadio,
  type RadioRider,
  jerseyOf,
  radioGroupKindSchema,
} from '@cyclingstar/shared'
import { z } from 'zod'

/**
 * Construcción de la crónica de una etapa. La comparten las dos rutas que la sirven —el replay de
 * la vuelta de prueba (re-simulando desde el snapshot sellado) y el journal de una etapa del
 * calendario (leyendo los eventos congelados)—, que antes repetían ~120 líneas idénticas: el mapa
 * de orden narrativo, el ordenado, el deduplicado y los marcadores de la altimetría. Duplicar eso
 * significaba que cualquier evento nuevo del motor había que darlo de alta en dos sitios.
 */

/** Un evento de carrera, tal como lo devuelve el motor o como quedó congelado en el snapshot. */
export interface ChronicleEvent {
  km: number
  tS: number
  tipo: string
  plantilla: string
  protagonistas: string[]
  datos?: Record<string, number | string>
}

/** Una entrada de la crónica ya lista para la web (identidades resueltas, sin ids). */
export interface ChronicleEntry {
  km: number
  tS: number
  plantilla: string
  protagonists: ChronicleRider[]
  mentions?: Record<string, ChronicleRider>
  datos: Record<string, number | string> | undefined
}

/**
 * Orden narrativo dentro de un mismo kilómetro: primero se forma la fuga, luego la reacción del
 * pelotón, los sprints y las cimas, después la caza, y la victoria siempre al final.
 */
const EVENT_ORDER: Record<string, number> = {
  // Quién sale hoy por su cuenta contra las órdenes de su equipo (v15, docs/motor.md §VI.2). Se
  // emite en el km 0 y abre la crónica: es contexto de salida, no un suceso de carrera.
  rider_defies_team: -1,
  // Un ataque va ANTES que su consecuencia: primero salta alguien, luego se forma la fuga, lo
  // cazan o engancha con los de delante (docs/motor.md §13).
  attack_go: 0,
  attack_swarm: 0,
  breakaway_formed: 0,
  break_cooperation: 0,
  attack_sticks: 1,
  attack_reeled: 1,
  move_caught: 1,
  bridge_made: 1,
  bridge_failed: 1,
  move_merge: 1,
  rider_sits_up: 4,
  riders_sit_up: 4,
  // La pájara va JUSTO ANTES del descuelgue que provoca: primero se revienta, luego se cae del
  // grupo. Y el abandono, después de todo: es el final de la historia de ese corredor (v14).
  rider_bonks: 3.5,
  riders_bonk: 3.5,
  rider_abandons: 4.5,
  riders_abandon: 4.5,
  sprinters_chase: 1,
  peloton_concedes: 1,
  sprinters_give_up: 1,
  time_gap: 2,
  // El resumen de una racha de partes de boquete ocupa el sitio del parte que resume (v21).
  time_gap_run: 2,
  // Quién tira del pelotón va DESPUÉS del parte de ventaja: primero cuánto hay, luego quién está
  // trabajando para cerrarlo. Y cómo se reparte el trabajo en la fuga, con lo demás de la fuga.
  break_share: 2,
  peloton_pull: 2.5,
  sprint_intermediate: 2,
  climb_kom: 3,
  peloton_split: 4,
  // El abanico ocupa el mismo sitio que la criba (v41): es un corte del grupo, contado por el
  // viento en vez de por la rampa, y las dos no coinciden nunca en el mismo kilómetro.
  echelon_split: 4,
  // La criba LEJOS de meta (v21) va en el sitio del corte: es la misma noticia contada en el tramo
  // de carretera donde el desenlace todavía no ha empezado.
  peloton_selection: 4,
  // El reagrupamiento comparte sitio con el corte: son la misma cuenta (de cuántos a cuántos ha
  // pasado el grupo) contada en las dos direcciones, y nunca coinciden en el mismo kilómetro.
  peloton_regroup: 4,
  // Los que se dejan caer a por su jefe (v36) van en el sitio del corte: es la misma noticia —gente
  // que sale del grupo de cabeza— contada por su motivo, y nunca coincide en el mismo kilómetro.
  domestiques_drop_back: 4,
  // El parte de quién va en cabeza va DESPUÉS de lo que lo ha producido —el corte del grupo o la
  // captura de la fuga—: primero se cuenta qué ha pasado y luego quiénes han quedado delante.
  breakaway_caught: 5,
  // «Quién hizo el trabajo para cerrar» va pegado a la captura que lo motiva, sea la de la fuga
  // del día (5) o la de un intento cualquiera (1): siempre justo detrás, nunca suelto.
  chase_work: 5.5,
  front_group: 6,
  final_km: 7,
  bunch_sprint: 7,
  stage_win: 8,
  // LA CONTRARRELOJ (v18). Una crono se ordena por RELOJ y no por kilómetro (ver `buildChronicle`),
  // así que estos números solo deciden los empates dentro del mismo segundo: la rampa antes que la
  // carretera, la carretera antes que la meta, y la victoria siempre al final.
  tt_start_order: -1,
  tt_last_off: -1,
  tt_catch: 2,
  tt_split: 3,
  tt_first_time: 6,
  tt_best_time: 6,
  tt_catches: 6.5,
  tt_last_home: 7,
  stage_win_itt: 8,
}

/**
 * La VICTORIA cierra el relato de su kilómetro pase lo que pase (v21). Es la única excepción a que
 * dentro de un km mande el reloj: el que cruza la meta minutos después del ganador puede tener un
 * `tS` mayor, y su frase no puede ir detrás del final de la etapa.
 */
const finalRank = (plantilla: string): number =>
  plantilla === 'stage_win' || plantilla === 'stage_win_itt' ? 1 : 0

/**
 * …Y LA FUGA ABRE EL SUYO (v25). La otra excepción a que dentro de un km mande el reloj, y por la
 * razón simétrica: un RESUMEN no puede leerse antes del SUCESO que lo produce. En Race Jaén el
 * kilómetro 1 dice «ya solo quedan dos delante» y a continuación «saltan del pelotón», porque
 * `breakaway_formed` se fecha en el km en que la fuga SALIÓ pero se emitía con el reloj del km en
 * que se confirma que ha cuajado (77 contra 341). El motor de la v25 ya lo emite con el reloj bueno;
 * esto lo arregla también en las 73 crónicas ya congeladas, que son las que el dueño está leyendo.
 */
const openingRank = (plantilla: string): number =>
  plantilla === 'breakaway_formed' || plantilla === 'break_cooperation' ? 0 : 1

/**
 * Lo que DESPEJA LA CARRETERA: después de esto no hay «grupo de cabeza» en la cabeza del lector, y
 * el siguiente parte de cabeza habla de un grupo que NACE, no de uno que ha perdido gente. Es el
 * mismo olvido que hace el motor con su lista de los que van delante.
 */
const CLEARS_THE_ROAD = new Set([
  'attack_reeled',
  'attack_short',
  'move_faded',
  'move_caught',
  'breakaway_caught',
  'peloton_regroup',
  'bunch_sprint',
])

/** Lo que hace CRECER al grupo de cabeza: un puente que llega, dos grupos que se juntan. */
const GROWS_THE_FRONT = new Set(['move_merge', 'bridge_made', 'attack_sticks'])

/** Tipos de evento que se pintan como hito sobre la altimetría, con su etiqueta en la web. */
const MARKER_LABEL: Record<string, string> = {
  ataque: 'attack',
  fuga_formada: 'break',
  fuga_cazada: 'caught',
  banner: 'banner',
  meta: 'finish',
}

/**
 * De dónde salen las identidades: el ROSTER de la carrera (que tiene dorsal, equipo y país de todos
 * los inscritos, hayan acabado o no) y, como respaldo, los resultados de la etapa. Los dos se pasan
 * a `chronicleNames` en una sola lista y se funden campo a campo, quedándose con el primer valor no
 * nulo de cada uno: así un corredor que está en los resultados pero no en el roster (o al revés)
 * sale con toda la información que se pueda reunir.
 */
export interface ChronicleRiderSource {
  riderId: string
  name: string
  teamName?: string | null
  country?: string | null
  bib?: number | null
}

/** Identidad de cada corredor de la etapa, para resolver los ids de los eventos congelados. */
export interface ChronicleNames {
  riderOf: Map<string, ChronicleRider>
}

/**
 * Construye el índice de identidades. Todo lo que no sea el nombre puede faltar (roster antiguo sin
 * dorsales, agente libre sin equipo, país vacío) y se guarda como `null`: la crónica degrada sola.
 *
 * `leaders` son los maillots de la CARRETERA de ese día (la clasificación tras la etapa N−1). El
 * maillot entra en la identidad, junto al dorsal y la bandera, y no como un dato aparte del evento:
 * así sale en todas las menciones sin tocar ninguna de las cincuenta plantillas del journal. Sin
 * `leaders` —vuelta de prueba, etapa 1, carrera de un día— nadie lleva ninguno.
 */
export function chronicleNames(
  sources: readonly ChronicleRiderSource[],
  leaders?: RaceLeaders,
): ChronicleNames {
  const riderOf = new Map<string, ChronicleRider>()
  for (const s of sources) {
    const prev = riderOf.get(s.riderId)
    const jersey = jerseyOf(leaders, s.riderId)
    riderOf.set(s.riderId, {
      name: prev?.name ?? s.name,
      bib: prev?.bib ?? s.bib ?? null,
      team: prev?.team ?? s.teamName ?? null,
      country: prev?.country ?? s.country ?? null,
      ...(jersey ? { jersey } : {}),
    })
  }
  return { riderOf }
}

/**
 * Un corredor que la crónica no sabe resolver. Pasa de verdad: los eventos están CONGELADOS en
 * `stage_runs.events` y se renderizan al vuelo, así que quien ya no esté ni en el roster ni en los
 * resultados llega aquí como un id suelto. No se inventa nada —se enseña el id, que al menos es
 * estable— y los tres campos de identidad se quedan vacíos: sin dorsal y sin bandera.
 */
const unknownRider = (id: string): ChronicleRider => ({
  name: id,
  bib: null,
  team: null,
  country: null,
})

/**
 * Ventana y umbral con los que se AGRUPAN los descuelgues (encargo A3 del dueño: «no menciones uno a
 * uno todos los ciclistas que se van descolgando… puedes mencionar muchos juntos con número»).
 *
 * El criterio, medido sobre producción y sobre 56 etapas del banco: los descuelgues del final llegan
 * en racimos (medidos racimos de 50, 34, 20 y 17 corredores en 5 km), y Race Muscat gastaba 15 de sus
 * 40 líneas en nombrarlos de uno en uno. Dentro de una ventana de 5 km, tres o más descuelgues se
 * cuentan en UNA frase con el número; uno o dos siguen teniendo su mención individual, porque un
 * corredor que se deja ir solo sí es una noticia.
 */
const SIT_UP_WINDOW_KM = 5
const SIT_UP_GROUP_MIN = 3

/**
 * Qué se agrupa en racimo y con qué nombre (v14). La pájara y el abandono llegan igual que los
 * descuelgues —en tandas, en el mismo tramo de carretera— y merecen el mismo trato: con uno o dos,
 * mención propia; con tres o más en la misma ventana, una frase con el número.
 */
const CLUSTERED: readonly { single: string; many: string }[] = [
  { single: 'rider_sits_up', many: 'riders_sit_up' },
  { single: 'rider_bonks', many: 'riders_bonk' },
  { single: 'rider_abandons', many: 'riders_abandon' },
]

/** Cómo se arma la crónica de ESTA etapa. */
export interface BuildChronicleOptions {
  /**
   * CONTRARRELOJ (v18): la crónica se ordena por el RELOJ DE CARRERA y no por el kilómetro.
   *
   * En una etapa en línea las dos cosas son la misma —el pelotón va junto, avanzar en el km es
   * avanzar en el tiempo— y ordenar por km es lo natural. En una crono no: el primero en salir está
   * cruzando la meta mientras el último todavía no ha tomado la rampa, así que ordenar por km
   * pondría todas las llegadas juntas al final y todos los parciales juntos al principio, con el
   * relato mezclando dos horas distintas de la tarde. El reloj es el hilo de la historia.
   */
  byClock?: boolean
}

/**
 * Traduce los eventos a la crónica que consume la web: resuelve ids a identidades completas, ordena
 * por km (y dentro del km por orden narrativo; por RELOJ si es una crono, ver `byClock`), quita
 * duplicados y agrupa lo que en bruto sería una lista. Es la frontera entre TELEMETRÍA y NARRATIVA
 * (docs/motor.md §16): los eventos guardados no se tocan nunca, y todo lo que se decide aquí vale
 * también para las etapas ya congeladas.
 */
export function buildChronicle(
  events: readonly ChronicleEvent[],
  names: ChronicleNames,
  options: BuildChronicleOptions = {},
): ChronicleEntry[] {
  const riderOf = (id: string): ChronicleRider => names.riderOf.get(id) ?? unknownRider(id)
  // ¿Se acaba cazando la fuga? Se sabe aquí y no en el motor, que emite en carretera sin ver el
  // futuro. Sirve para que «el pelotón concede» no contradiga a la captura de treinta km después.
  const caughtLaterKm = events.find((e) => e.plantilla === 'breakaway_caught')?.km ?? null
  const ordered = events
    // TELEMETRÍA frente a NARRATIVA (docs/motor.md §16): el motor emite TODOS los intentos de
    // movimiento porque son dato de carrera, y marca con `narra` cuáles merecen una frase. Una
    // etapa tiene una docena de intentos y la crónica no puede ser su inventario.
    .filter((e) => e.datos?.narra !== 0)
    .map((e): ChronicleEntry => {
      // Los corredores citados por `datos` (hoy `forId`) se resuelven igual que los protagonistas:
      // la convención es el sufijo `Id`, para que un dato nuevo del motor no haya que darlo de alta
      // aquí. Si el id no se resuelve, la mención simplemente no viaja y la frase se apaña sin ella.
      const mentions: Record<string, ChronicleRider> = {}
      for (const [k, v] of Object.entries(e.datos ?? {})) {
        if (k.endsWith('Id') && typeof v === 'string' && names.riderOf.has(v)) {
          mentions[k] = names.riderOf.get(v)!
        }
      }
      return {
        km: Math.round(e.km),
        tS: Math.round(e.tS),
        plantilla: e.plantilla,
        protagonists: e.protagonistas.map(riderOf),
        ...(Object.keys(mentions).length > 0 ? { mentions } : {}),
        datos: markConcession(e, caughtLaterKm),
      }
    })
    .sort((a, b) =>
      options.byClock === true
        ? a.tS - b.tS ||
          (EVENT_ORDER[a.plantilla] ?? 9) - (EVENT_ORDER[b.plantilla] ?? 9) ||
          a.km - b.km
        : // DENTRO DEL MISMO KILÓMETRO MANDA EL RELOJ DE CARRERA (v21). El orden narrativo
          // (`EVENT_ORDER`) es una tabla de prioridades fija y se estrenó para desempatar eventos
          // que ocurren a la vez; en el último kilómetro de una etapa caen seis y NO ocurren a la
          // vez. Medido en producción, Race Bességes e4: la captura de la fuga y quién la cerró
          // llevan `tS` 13713 y la victoria 13735 —la caza fue ANTES—, y la crónica imprimía
          // primero la victoria. El motor tenía razón y el ordenador no lo miraba.
          //
          // El reloj va por delante de la tabla y la tabla queda para lo que de verdad comparte
          // segundo. Solo la VICTORIA se queda fija al final de su kilómetro: es el cierre del
          // relato y ningún parte del pelotón que cruce la meta después le quita ese sitio.
          a.km - b.km ||
          openingRank(a.plantilla) - openingRank(b.plantilla) ||
          finalRank(a.plantilla) - finalRank(b.plantilla) ||
          a.tS - b.tS ||
          (EVENT_ORDER[a.plantilla] ?? 9) - (EVENT_ORDER[b.plantilla] ?? 9),
    )
    // Quita duplicados exactos consecutivos (misma frase, mismos protagonistas y km).
    .filter((e, i, arr) => {
      const prev = arr[i - 1]
      return (
        !prev ||
        prev.km !== e.km ||
        prev.plantilla !== e.plantilla ||
        prev.protagonists.map((p) => p.name).join() !== e.protagonists.map((p) => p.name).join()
      )
    })
  let out = dedupeSitUps(normalizeKomLeads(normalizeSplits(ordered)))
  out = dropImpossibleLines(out)
  out = dropRetiredWorkers(out)
  // LA COHERENCIA DEL RELATO (v25). Todas estas pasadas valen también para las 73 crónicas ya
  // CONGELADAS, que es lo que el dueño está leyendo hoy y lo único que el motor no puede arreglar.
  out = dropLoneChaseGaps(out)
  out = retellCatch(out)
  out = markReunion(out)
  out = dropUndoneSelections(out)
  out = groupGapRuns(out)
  // LA ESPINA DORSAL DEL RELATO (v27). Las tres pasadas que hacen que en cualquier punto del diario
  // se pueda responder quién va delante, con cuánto, sobre quién y cuánto queda. Van DESPUÉS de
  // `groupGapRuns` porque el resumen de una racha es una línea nueva y también necesita su líder.
  out = followTheLeader(out)
  out = clockTheGaps(out)
  out = foldSameFailure(out)
  out = markFrontDelta(out)
  out = dropAttackEcho(out)
  out = foldQuickAttacks(out)
  out = dropRepeatedPulls(out)
  out = markAgreement(out)
  out = markChaseWork(out)
  for (const kind of CLUSTERED) out = groupRuns(out, kind.single, kind.many)
  return out
}

/**
 * Con menos gente que esto en carrera, que el perseguidor inmediato sea uno no es un defecto: es la
 * carrera. El defecto es decir «la caza» de un corredor suelto mientras detrás hay un pelotón.
 */
const BUNCH_MIN_RIDERS = 8

/**
 * EL BOQUETE MEDIDO CONTRA UN CORREDOR SUELTO (v25). El motor daba el parte de ventaja contra el
 * primer reloj que viniera por detrás, fuera quien fuera: en Race Jaén, el puente en solitario de
 * Frédéric Muller dejó un grupo intermedio de UN corredor y el km 152 salió con «la caza se está
 * comiendo la ventaja» sobre un dato que no era el del pelotón —que eran 127 y estaba tirando—.
 *
 * El motor de la v25 ya mide contra el grueso de la carrera. En lo congelado no hay forma de
 * recalcular el número, y un número que no se puede arreglar es mejor no contarlo: la línea se cae.
 * No se pierde información —la ventaja de verdad la cuentan los partes de al lado—, se pierde una
 * contradicción.
 */
function dropLoneChaseGaps(entries: ChronicleEntry[]): ChronicleEntry[] {
  const field = entries.reduce((mx, e) => {
    const n = Number(
      e.datos?.field ??
        e.datos?.chaseSize ??
        (e.plantilla === 'peloton_pull' ? e.datos?.size : 0) ??
        0,
    )
    return Number.isFinite(n) ? Math.max(mx, n) : mx
  }, 0)
  if (field < BUNCH_MIN_RIDERS) return entries
  return entries.filter(
    (e) => !(e.plantilla === 'time_gap' && Number(e.datos?.chaseSize ?? 0) === 1),
  )
}

/**
 * LA CAPTURA NOMBRA A QUIEN IBA DELANTE (v25). `breakaway_caught` viajaba con `dayBreakRiders`, la
 * lista congelada del kilómetro en que la fuga se formó: en Race Jaén, el km 190 anuncia que «Carlos
 * Pinho y Alex Taylor vuelven al pelotón» cuando Pinho no iba delante desde el km 150 y los de
 * delante eran CINCO. El motor de la v25 emite a los que iban delante en ese momento; aquí se
 * arregla lo congelado con lo que la propia crónica sabe —el último parte de cabeza—.
 *
 * Con una guarda, porque el último parte de cabeza puede estar CADUCADO: si entre él y la captura el
 * grupo de delante creció (un puente que llega, dos grupos que se juntan) ya no sabemos quiénes
 * eran, y entonces no se toca nada. Inventarse una lista es peor que dejar la vieja.
 */
function retellCatch(entries: ChronicleEntry[]): ChronicleEntry[] {
  return entries.map((e, i) => {
    if (e.plantilla !== 'breakaway_caught') return e
    let front: ChronicleEntry | null = null
    let stale = false
    for (let j = i - 1; j >= 0; j--) {
      const o = entries[j]!
      if (o.plantilla === 'front_group') {
        front = o
        break
      }
      // Un ataque que sale del grupo de cabeza, una criba del pelotón o una fusión caducan el parte
      // igual: después de cualquiera de esas cosas ya no dice quiénes van delante.
      if (
        GROWS_THE_FRONT.has(o.plantilla) ||
        CLEARS_THE_ROAD.has(o.plantilla) ||
        o.plantilla === 'attack_go' ||
        o.plantilla === 'attack_swarm' ||
        o.plantilla === 'peloton_split' ||
        o.plantilla === 'peloton_selection' ||
        o.plantilla === 'echelon_split'
      ) {
        stale = true
      }
    }
    if (!front || stale) return e
    const iban = front.protagonists.map((p) => p.name).join()
    if (e.protagonists.map((p) => p.name).join() === iban) return e
    return {
      ...e,
      protagonists: front.protagonists,
      datos: {
        ...e.datos,
        size: front.protagonists.length,
        // De cuántos salió la fuga: la otra mitad de la historia cuando el grupo ha cambiado.
        ...(e.datos?.deLos == null
          ? { deLos: Number(e.datos?.size ?? e.protagonists.length) }
          : {}),
      },
    }
  })
}

/**
 * EL GRUPO DE CABEZA CAMBIA DE GENTE, Y SE DICE (v25). «Only N riders left in front» con N
 * CRECIENDO —3, luego 4, luego 5— es el segundo defecto más numeroso de los doce: 69 veces en 31
 * etapas del día de juego 46. La plantilla daba por hecho que una fuga solo se deshace.
 *
 * El motor de la v25 manda `entran` y `salen`. Aquí se reconstruyen para las crónicas congeladas,
 * comparando con el parte de cabeza anterior. Solo cuando los dos partes comparten a alguien: si no
 * hay un solo nombre en común, lo de delante no es el mismo grupo que ha cambiado, es otro grupo.
 */
function markFrontDelta(entries: ChronicleEntry[]): ChronicleEntry[] {
  let prev: string[] | null = null
  return entries.map((e) => {
    if (CLEARS_THE_ROAD.has(e.plantilla)) {
      prev = null
      return e
    }
    if (e.plantilla !== 'front_group') return e
    const ids = e.protagonists.map((p) => p.name)
    const before = prev
    prev = ids
    if (before === null) return e
    if (e.datos?.entran != null || e.datos?.salen != null) return e
    if (!ids.some((r) => before.includes(r))) return e
    const entran = ids.filter((r) => !before.includes(r)).length
    const salen = before.filter((r) => !ids.includes(r)).length
    if (entran === 0 && salen === 0) return e
    return {
      ...e,
      datos: {
        ...e.datos,
        ...(entran > 0 ? { entran } : {}),
        ...(salen > 0 ? { salen } : {}),
      },
    }
  })
}

/**
 * Cuántos protagonistas puede nombrar una línea de situación. Tres es el límite de siempre de los
 * eventos del motor, y por encima de eso una lista deja de ser una frase.
 */
const NAMED_IN_FRONT = 3

/** Los últimos kilómetros que deciden la etapa: donde el relato tiene que converger (v27). */
const FINALE_KM = 15

/**
 * Lo que hace que el último parte de cabeza deje de decir quién va delante SIN nombrar a nadie: la
 * carrera se junta y ya no hay grupo de cabeza que seguir.
 */
const REGROUPS_THE_RACE = new Set(['peloton_regroup', 'bunch_sprint'])

/**
 * EL HILO DEL LÍDER (v27). El dueño leyó la etapa 1 de Race Andalucía y dijo que «si lees todo el
 * Journal no SABES quién va ganando, quién va persiguiendo». La causa, en la crónica, es que el
 * relato PIERDE al protagonista por el camino: el parte de ventaja se emitía sin un solo nombre
 * —«the lead grows and grows for the lone leader»— y en los últimos quince kilómetros las líneas
 * hablaban de tres carreras distintas sin decir cuál era la de la etapa.
 *
 * Esta pasada lleva el hilo: quién va delante AHORA, según lo último que se le ha contado al lector.
 * Y hace dos cosas con él.
 *
 * **(1) El parte de ventaja NOMBRA a quien va delante**, y solo cuando no hay duda: el motor dice
 * cuántos van en cabeza (`leadSize`) y esta pasada solo pone nombres si son EXACTAMENTE los mismos
 * que la última línea que los presentó. Si el grupo ha crecido, si alguien ha atacado de él o si el
 * número no cuadra, la frase se queda como estaba. Nombrar de más sería inventar una carrera.
 *
 * **(2) En el desenlace, lo que no es la carrera se cuenta RESPECTO DE LA CARRERA.** En el último
 * kilómetro de Andalucía conviven «Schwarz lidera en solitario por 16s» y «Bailey tiene 46s»: el
 * lector no puede saber quién va ganando. Las subtramas de quien no va a ganar no se borran —Peter
 * Schulz, que ataca a 11 km, acabó SEGUNDO— pero se cuentan como lo que son: alguien que va detrás
 * del líder, con el líder nombrado en la misma frase.
 *
 * Vive aquí y no en el motor porque es lo único que llega a las etapas YA CORRIDAS, que son las que
 * el dueño está leyendo: el motor de la v27 ya nombra a los suyos, pero los eventos congelados no.
 */
function followTheLeader(entries: ChronicleEntry[]): ChronicleEntry[] {
  /** Quiénes van delante según lo último que se ha contado; `null` cuando ya no se sabe. */
  let front: ChronicleRider[] | null = null
  const lastKm = entries.reduce((mx, e) => Math.max(mx, e.km), 0)
  return entries.map((e) => {
    const names = new Set((front ?? []).map((p) => p.name))
    const tocaAlLider = e.protagonists.some((p) => names.has(p.name))
    if (e.plantilla === 'breakaway_formed' || e.plantilla === 'front_group') {
      front = e.protagonists
      return e
    }
    // Al líder se le pierde de vista por dos vías: porque la línea diga que se acabó lo suyo (le
    // cazan, se sienta, revienta, abandona) o porque la carrera se junte y deje de haber cabeza.
    // Lo que le pasa a OTROS no le quita el sitio: que cacen a un puente de detrás no cambia quién
    // va delante, y tratarlo como si lo cambiara es lo que dejaba mudo el resto de la etapa.
    if (
      front &&
      ((CLEARS_THE_ROAD.has(e.plantilla) && tocaAlLider) ||
        (EXITS_THE_RACE.has(e.plantilla) && tocaAlLider))
    ) {
      front = null
      return e
    }
    if (front && REGROUPS_THE_RACE.has(e.plantilla) && Number(e.datos?.chasing ?? 0) !== 1) {
      front = null
      return e
    }
    if (e.plantilla === 'time_gap' || e.plantilla === 'time_gap_run') {
      const size = Number(e.datos?.leadSize ?? 0)
      if (
        e.protagonists.length === 0 &&
        front !== null &&
        size > 0 &&
        size <= NAMED_IN_FRONT &&
        size === front.length
      ) {
        return { ...e, protagonists: front }
      }
      return e
    }
    /**
     * LA SUBTRAMA SE CUENTA RESPECTO DE LA CARRERA. Mientras se sepa quién va delante, el hueco de
     * quien NO va delante se cuenta con el líder nombrado al lado: es la única forma de que dos
     * hombres «con hueco» a la vez no dejen al lector sin saber quién va ganando. `desenlace` marca
     * las de los últimos kilómetros, que son las que además pueden decir que la etapa ya está
     * decidida: a 100 km de meta eso no se puede afirmar, y la frase se escribe de otra manera.
     */
    if (front !== null && front.length > 0 && SUBPLOT.has(e.plantilla) && !tocaAlLider) {
      const lider = front[0]!
      return {
        ...e,
        mentions: { ...e.mentions, liderId: lider },
        datos: {
          ...e.datos,
          respecto: 1,
          liderId: lider.name,
          ...(e.km >= lastKm - FINALE_KM ? { desenlace: 1 } : {}),
        },
      }
    }
    return e
  })
}

/**
 * Lo que saca a un corredor de la carrera de cabeza: si le pasa al que iba delante, deja de ir
 * delante. `attack_go` no está —el que ataca desde la cabeza sigue delante— y su caso lo resuelve
 * la cuenta de `leadSize`, que deja de cuadrar en cuanto el grupo se parte.
 */
const EXITS_THE_RACE = new Set([
  // El que se deja caer a por su jefe sale del grupo de cabeza por su propio pie (v36).
  'domestiques_drop_back',
  'rider_sits_up',
  'riders_sit_up',
  'rider_bonks',
  'riders_bonk',
  'rider_abandons',
  'riders_abandon',
  'move_faded',
])

/**
 * Las líneas que RECLAMAN LA CARRETERA para alguien: un ataque, un hueco que se abre. Son las que,
 * contadas sueltas, hacen que el lector no sepa cuál de los dos o tres hombres con ventaja va
 * ganando la etapa —y en el último kilómetro de Race Andalucía eran literalmente dos—.
 */
const SUBPLOT = new Set(['attack_go', 'attack_sticks', 'attack_short', 'bridge_made'])

/**
 * CUÁNTO QUEDA (v27). La cuarta pregunta de la regla, y la más barata: una ventaja sin el punto de
 * la carretera en el que se lee no sitúa nada («the lead grows to 6:53» — ¿a 100 km de meta o a
 * 14?). El motor de la v27 manda `toGo` en el parte de ventaja; en las etapas ya corridas se
 * reconstruye con lo que la crónica sabe de sobra: dónde está la meta.
 */
function clockTheGaps(entries: ChronicleEntry[]): ChronicleEntry[] {
  const lastKm = entries.reduce((mx, e) => Math.max(mx, e.km), 0)
  if (lastKm <= 0) return entries
  return entries.map((e) => {
    if (e.plantilla !== 'time_gap' && e.plantilla !== 'time_gap_run') return e
    if (e.datos?.toGo != null) return e
    return { ...e, datos: { ...e.datos, toGo: Math.max(0, lastKm - e.km) } }
  })
}

/** Km dentro de los cuales dos desenlaces del mismo hombre son el MISMO fracaso. */
const SAME_FAILURE_KM = 5

/**
 * UN FRACASO, UNA LÍNEA (v27). En Race Andalucía, Markus Weber se queda en tierra de nadie en el km
 * 123 («runs out of legs in no man's land») y le reabsorben en el 125 («the elastic snaps back»).
 * Son la misma historia contada dos veces, y en un tramo en el que el diario tiene tres líneas la
 * repetición se lleva un tercio del relato.
 *
 * Se queda la PRIMERA, que es la que cuenta por qué falló; la segunda no añade nada que el lector no
 * haya entendido ya. Es el mismo criterio que la v25 aplicó al eco del ataque y al manotazo de un
 * kilómetro: el arco se cierra igual y ocupa la mitad.
 */
function foldSameFailure(entries: ChronicleEntry[]): ChronicleEntry[] {
  /** Quién ya tiene contado su fracaso, y en qué km. */
  const failed = new Map<string, number>()
  return entries.filter((e) => {
    if (e.plantilla === 'bridge_failed' || e.plantilla === 'move_faded') {
      for (const p of e.protagonists) failed.set(p.name, e.km)
      return true
    }
    if (e.plantilla !== 'attack_reeled' && e.plantilla !== 'move_caught') return true
    const repetido = e.protagonists.every((p) => {
      const km = failed.get(p.name)
      return km != null && e.km - km <= SAME_FAILURE_KM
    })
    return !(repetido && e.protagonists.length > 0)
  })
}

/**
 * EL MISMO ATAQUE, DOS LÍNEAS SEGUIDAS (v25). En Race Jaén el km 207 dice «Rafael Teixeira ataca a
 * 3 km» y justo después «solo queda uno delante: Rafael Teixeira»: son la misma noticia con otras
 * palabras. El parte de cabeza existe para contar QUIÉNES van delante cuando el lector no lo sabe;
 * pegado al ataque que acaba de leer, no cuenta nada.
 */
function dropAttackEcho(entries: ChronicleEntry[]): ChronicleEntry[] {
  return entries.filter((e, i) => {
    if (e.plantilla !== 'front_group') return true
    const prev = entries[i - 1]
    if (!prev || prev.km !== e.km) return true
    if (prev.plantilla !== 'attack_go' && prev.plantilla !== 'bridge_made') return true
    const mine = e.protagonists.map((p) => p.name)
    const his = prev.protagonists.map((p) => p.name)
    return !(mine.length === his.length && mine.every((r) => his.includes(r)))
  })
}

/** Km dentro de los cuales un ataque y su captura son UNA noticia y no dos. */
const QUICK_ATTACK_KM = 3

/**
 * EL MANOTAZO QUE DURA UN KILÓMETRO, EN UNA LÍNEA (v25). La v25 retira el umbral que dejaba a 184
 * ataques narrados sin desenlace, y el precio de contarlos todos es un «ataca» seguido a un
 * kilómetro de un «le cazan». Cuando las dos líneas son seguidas y del mismo corredor, se cuentan
 * juntas: el arco se cierra igual y ocupa la mitad.
 */
function foldQuickAttacks(entries: ChronicleEntry[]): ChronicleEntry[] {
  const drop = new Set<number>()
  const out = entries.map((e, i) => {
    if (e.plantilla !== 'attack_reeled' && e.plantilla !== 'move_caught') return e
    const prev = entries[i - 1]
    if (!prev || prev.plantilla !== 'attack_go') return e
    if (e.km - prev.km > QUICK_ATTACK_KM) return e
    const mine = e.protagonists.map((p) => p.name)
    const his = prev.protagonists.map((p) => p.name)
    if (!(mine.length === his.length && mine.every((r) => his.includes(r)))) return e
    drop.add(i - 1)
    return {
      ...e,
      plantilla: 'attack_short',
      datos: { ...prev.datos, ...e.datos, km: Math.max(1, e.km - prev.km) },
    }
  })
  return out.filter((_, i) => !drop.has(i))
}

/**
 * EL MISMO EQUIPO TIRANDO PARA EL MISMO HOMBRE, SEIS VECES (v25). En Race Jaén, Fuego Escuadra tira
 * para Sergio Gómez en los km 21, 57, 70, 94, 130 y 192, y las seis frases dicen lo mismo. El motor
 * tiene un acelerador (`pullReportKmGap`) y no basta: si el equipo y el líder no cambian, la segunda
 * vez y las siguientes o cuentan algo NUEVO —que aprietan, que aflojan, que ya no persiguen— o se
 * callan.
 *
 * Lo que se conserva es el CAMBIO, que es la noticia; y va marcado con `repite` para que la frase se
 * lea como lo que es —«siguen ahí, y ahora a tope»— y no como una presentación repetida.
 */
function dropRepeatedPulls(entries: ChronicleEntry[]): ChronicleEntry[] {
  let prev: string | null = null
  const out: ChronicleEntry[] = []
  for (const e of entries) {
    if (e.plantilla !== 'peloton_pull') {
      out.push(e)
      continue
    }
    // La identidad del parte es QUIÉN tira y PARA QUIÉN, no qué tres gregarios concretos están al
    // frente: en un pelotón que se releva, el tercer nombre no repite nunca y sin esto la frase
    // volvería a salir seis veces con otro reparto.
    // …y en una ALIANZA no hay un equipo del que hablar: lo que la frase cuenta es que varios
    // equipos con líderes distintos coinciden en tirar, y eso no cambia porque roten los nombres.
    const alianza = e.datos?.forKind === 'alianza'
    const who = [
      e.datos?.forId ?? '',
      alianza ? '' : [...new Set(e.protagonists.map((p) => p.team ?? p.name))].join('/'),
    ].join('|')
    const key = `${who}|${e.datos?.forKind ?? ''}|${e.datos?.effort ?? ''}|${e.datos?.chasing ?? ''}`
    if (prev === key) continue
    const sameCrew = prev !== null && prev.startsWith(`${who}|`)
    prev = key
    out.push(sameCrew ? { ...e, datos: { ...e.datos, repite: 1 } } : e)
  }
  return out
}

/**
 * LA CONCORDANCIA, DECIDIDA DONDE SE VE LA ENTRADA ENTERA (v25). Dos frases de producción con la
 * gramática rota: «3 more try to go with them and cannot hold the wheel» con UN solo protagonista, y
 * «1 of their companion sits on». La plantilla tiene los números para saberlo, pero el medidor de
 * coherencia trabaja sobre DATOS y no sobre texto: marcarlo aquí es lo que permite comprobar que la
 * frase concuerda sin tener que leerla, igual que `juntos` y `cazada` hacen con la captura.
 */
function markAgreement(entries: ChronicleEntry[]): ChronicleEntry[] {
  return entries.map((e) => {
    if (
      e.plantilla === 'attack_go' ||
      e.plantilla === 'attack_swarm' ||
      e.plantilla === 'attack_short'
    ) {
      const saltan = Number(e.datos?.saltan ?? e.protagonists.length)
      return { ...e, datos: { ...e.datos, solo: saltan === 1 ? 1 : 0 } }
    }
    if (e.plantilla === 'break_share') {
      return { ...e, datos: { ...e.datos, solo: Number(e.datos?.passengers ?? 0) === 1 ? 1 : 0 } }
    }
    return e
  })
}

/**
 * DOS NÚMEROS QUE DICEN LO MISMO Y NO COINCIDEN (v25). En Race Jaén, dos líneas seguidas: «189 km up
 * the road» (los que llevaba fuera la fuga) y «172 km later» (los que han pasado desde la cúspide
 * del boquete). Las dos son ciertas y miden cosas distintas, y juntas se leen como un error.
 *
 * `pegado` dice que la frase de quién cerró va justo detrás de la captura, y entonces se calla su
 * cuenta de kilómetros: la de la captura ya está dicha y es la que el lector necesita.
 */
function markChaseWork(entries: ChronicleEntry[]): ChronicleEntry[] {
  return entries.map((e, i) => {
    if (e.plantilla !== 'chase_work') return e
    const prev = entries[i - 1]
    if (!prev) return e
    if (prev.plantilla !== 'breakaway_caught' && prev.plantilla !== 'move_caught') return e
    return { ...e, datos: { ...e.datos, pegado: 1 } }
  })
}

/**
 * Tamaño del grupo de CABEZA que anuncia una entrada, si es que anuncia alguno. Es lo único que
 * hace falta para saber si una criba se deshizo: todos estos eventos dicen, cada uno a su manera,
 * cuánta gente va delante en ese kilómetro.
 */
function frontSizeOf(e: ChronicleEntry): number | null {
  const n = (k: string): number | null => (e.datos?.[k] == null ? null : Number(e.datos[k]))
  switch (e.plantilla) {
    case 'peloton_pull':
      return n('size')
    case 'peloton_split':
    case 'peloton_selection':
    case 'peloton_regroup':
      return n('remaining')
    // El abanico solo dice quién va en cabeza cuando lo que se ha partido es el PELOTÓN: un corte
    // en un grupo de detrás no cuenta cuánta gente va delante, cuenta cómo se deshace la caza.
    case 'echelon_split':
      return e.datos?.grupo === 'peloton' ? n('remaining') : null
    case 'bunch_sprint':
      return n('field')
    default:
      return null
  }
}

/**
 * Cuánto de lo perdido basta con que vuelva para que la criba no haya sido una criba. La mitad: si
 * el grupo de cabeza recupera más de la mitad de los corredores que perdió, lo que pasó fue un
 * estirón y no una selección, y contarlo como si hubiera decidido la etapa es peor que callarse.
 * Se mira hasta META y no en una ventana de km, porque la pregunta es justamente esa: ¿siguió rota
 * la carrera? Una criba que aguanta ochenta kilómetros y se deshace antes de la línea no decidió
 * nada — y el lector lo va a ver en el resultado.
 */
const SELECTION_UNDONE_FRACTION = 0.5

/**
 * LA CRIBA QUE SE DESHACE (v21). El motor emite la selección lejana cuando ocurre y con el tamaño
 * del grupo antes y después, porque en carretera es lo único que puede saber. Pero una criba que se
 * recompone treinta kilómetros después NO decidió nada, y anunciarla como si hubiera decidido la
 * etapa es peor que callarse: el lector se queda con un grupo de 80 que en meta son 140.
 *
 * Eso solo lo puede ver esta capa, que tiene la etapa entera delante —el mismo reparto de papeles
 * que la v13 hizo con la concesión que luego se desmiente—. Si en lo que queda de etapa el grupo de
 * cabeza recupera más de la mitad de lo que perdió, la frase se cae.
 */
function dropUndoneSelections(entries: ChronicleEntry[]): ChronicleEntry[] {
  if (!entries.some((e) => e.plantilla === 'peloton_selection')) return entries
  return entries.filter((e, i) => {
    if (e.plantilla !== 'peloton_selection') return true
    const before = Number(e.datos?.before ?? 0)
    const remaining = Number(e.datos?.remaining ?? 0)
    if (before <= remaining) return false
    const recovered = remaining + (before - remaining) * SELECTION_UNDONE_FRACTION
    for (let j = i + 1; j < entries.length; j++) {
      const size = frontSizeOf(entries[j]!)
      if (size !== null && size >= recovered) return false
    }
    return true
  })
}

/**
 * TRES FRASES QUE NO PUEDEN EXISTIR, TIRADAS DE LAS ETAPAS YA CORRIDAS (v21).
 *
 * RENDIRSE EN LA LÍNEA DE META NO ES RENDIRSE. El motor de hoy ya no lo hace —dentro del
 * último kilómetro no se sortea—, pero las etapas corridas tienen sus eventos congelados: en Race
 * Bességes e4 hay un «8 riders give up the fight» con `toGo: 0` en el km 164 de 164. Dejarse ir
 * cuando ya has llegado no es una noticia, y con el orden por reloj esa frase caía DESPUÉS de la
 * victoria y cerraba la crónica.
 */
function dropImpossibleLines(entries: ChronicleEntry[]): ChronicleEntry[] {
  return entries.filter(
    (e) =>
      !(
        (e.plantilla === 'rider_sits_up' || e.plantilla === 'riders_sit_up') &&
        e.datos?.toGo != null &&
        Number(e.datos.toGo) <= 0
      ) &&
      // UNO NO COLABORA CONSIGO MISMO: el parte de cooperación de una fuga de un solo corredor.
      !(e.plantilla === 'break_cooperation' && e.protagonists.length <= 1) &&
      // Y NADIE ATACA EN EL KM 0: la crónica de Race Bességes e4 abría con «Attack: … force the pace
      // and open a gap» antes de que bajara la bandera. El movimiento existe —en carretera las fugas
      // salen del disparo— pero la FRASE, en el kilómetro cero, no.
      !((e.plantilla === 'attack_go' || e.plantilla === 'attack_swarm') && e.km < ATTACK_MIN_KM),
  )
}

/** Km por debajo del cual un intento de ataque no tiene frase. El mismo que usa el motor. */
const ATTACK_MIN_KM = 1

/**
 * EL QUE SE RINDIÓ NO TIRA NI FIRMA LA CAZA, TAMPOCO EN LAS ETAPAS YA CORRIDAS (v21). El motor de
 * hoy ya no lo permite —el rendido sale del turno de relevos y no entra en el reparto de la
 * captura—, pero en producción está congelado y es lo que el dueño ha leído: en Race Bességes e4,
 * Christophe Morin se deja ir en el km 147 y en el 157 «tira del pelotón», y Patrick Henry, que se
 * dejó ir en el mismo racimo, firma la caza del km 164.
 *
 * Aquí se quitan de la frase los que ya se habían rendido ANTES de ella. Si no queda nadie, la frase
 * entera se cae: un parte de relevos sin relevistas, o una captura sin autor, no dicen nada.
 */
function dropRetiredWorkers(entries: ChronicleEntry[]): ChronicleEntry[] {
  const goneBy = new Set<string>()
  const out: ChronicleEntry[] = []
  for (const e of entries) {
    if (e.plantilla === 'peloton_pull' || e.plantilla === 'chase_work') {
      const left = e.protagonists.filter((p) => !goneBy.has(p.name))
      if (left.length === 0) continue
      out.push(left.length === e.protagonists.length ? e : { ...e, protagonists: left })
      continue
    }
    if (e.plantilla === 'rider_sits_up' || e.plantilla === 'riders_sit_up') {
      for (const p of e.protagonists) goneBy.add(p.name)
    }
    out.push(e)
  }
  return out
}

/**
 * Cuánto tiene que quedar del grupo de cabeza, respecto de su máximo, para que la captura de la
 * fuga se pueda contar como que la carrera VUELVE A ESTAR JUNTA.
 */
const REUNION_MIN_FRACTION = 0.75

/**
 * «THE BREAK IS CAUGHT; THE RACE IS ALL TOGETHER AGAIN» — y no era verdad (v21). En Race Bességes
 * e4 la fuga se caza en la línea de meta con la carrera hecha pedazos: seis grupos de tiempo y 76
 * corredores a 1:51. El motor emite la captura sin más —en carretera es lo que ve—, y quien puede
 * saber si eso reunió a alguien es esta capa, que tiene delante todos los tamaños de grupo que se
 * han ido narrando.
 *
 * `juntos` viaja con el evento: 1 si el grupo que caza sigue siendo casi todo el pelotón, 0 si lo
 * que caza es un pedazo de carrera. La web escribe una frase distinta en cada caso, y así también se
 * arreglan las etapas ya corridas.
 */
function markReunion(entries: ChronicleEntry[]): ChronicleEntry[] {
  let maxFront = 0
  let lastFront: number | null = null
  // Y los dos números que hacen que la captura sea una historia y no un trámite: desde cuándo
  // estaba fuera la fuga y a cuánto de meta se la comieron. El motor los manda desde la v21; en las
  // etapas ya corridas se RECONSTRUYEN de la propia crónica, que sabe en qué km se formó la fuga y
  // en cuál acabó la etapa. Es el mismo apaño que la v13 hizo con el `before` de los cortes.
  const formedKm = entries.find((e) => e.plantilla === 'breakaway_formed')?.km ?? null
  const lastKm = entries.reduce((mx, e) => Math.max(mx, e.km), 0)
  return entries.map((e) => {
    // El grupo que persigue: el tamaño que anuncian los eventos que lo dicen, y el `chaseSize` del
    // parte de boquete, que es justo el del grupo que va a cazar.
    const size = frontSizeOf(e) ?? (e.datos?.chaseSize == null ? null : Number(e.datos.chaseSize))
    if (size != null) {
      maxFront = Math.max(maxFront, size)
      lastFront = size
    }
    if (e.plantilla !== 'breakaway_caught') return e
    const juntos =
      lastFront == null || maxFront <= 0 || lastFront >= maxFront * REUNION_MIN_FRACTION
    const datos: Record<string, number | string> = { ...e.datos, juntos: juntos ? 1 : 0 }
    if (datos.toGo == null) datos.toGo = Math.max(0, lastKm - e.km)
    if (datos.awayKm == null && formedKm != null && e.km > formedKm) datos.awayKm = e.km - formedKm
    return { ...e, datos }
  })
}

/**
 * Cuántos partes de boquete seguidos hacen falta para que la racha se resuma, y cuánto tiene que
 * moverse la ventaja para considerar que la historia CAMBIA de dirección. Tres es el mismo suelo
 * que el racimo de descuelgues de la v13: con dos partes no hay racha, hay un antes y un después.
 */
const GAP_RUN_MIN = 3
const GAP_TREND_SECONDS = 3

/**
 * …Y A QUÉ DISTANCIA DEJA DE SER RUIDO (v27). El resumen de la v21 se comió el HILO de la etapa 1 de
 * Race Andalucía: el motor da el parte de ventaja cada 25 km fuera del desenlace
 * (`gapReportKmGap`), así que los partes de los km 62, 87 y 112 no eran una racha repetitiva —eran
 * las tres únicas líneas de situación de sesenta y cinco kilómetros— y la racha se los llevó a los
 * tres, dejando el diario mudo del km 72 al 137.
 *
 * Una línea que es la única en más de doce kilómetros no es ruido: es el hilo. La racha solo se come
 * partes que vienen PEGADOS, que es el caso para el que se escribió —la fuga que se hunde en el
 * desenlace, donde el parte sale cada 4 km (`gapReportFinalKmGap`) y nueve líneas seguidas cuentan
 * una sola noticia—. El listón está entre los dos ritmos del motor y no toca ninguno.
 */
const GAP_RUN_DENSE_KM = 12

/**
 * LA FUGA QUE SE HUNDE, EN DOS LÍNEAS Y NO EN NUEVE (v21). El caso es literal de producción:
 *
 * ```
 * The advantage is down to 3:36 and falling.
 * The advantage is down to 2:59 and falling.
 * The advantage is down to 2:29 and falling.
 * …
 * ```
 *
 * Es el mismo ruido que los descuelgues uno a uno («puedes mencionar muchos juntos con número»),
 * pero aquí no se agrupa por número sino por NARRATIVA: una ventaja que se derrumba de forma
 * sostenida es UNA noticia. Se cuenta el ARRANQUE —el primer parte, que es el que da la novedad— y
 * el DESENLACE —un resumen con el de dónde a dónde y en cuántos km—, y desaparece todo lo que hay
 * en medio, que solo repite la misma frase con otro número.
 *
 * Lo que ROMPE la racha es exactamente lo que cambia la historia: que la ventaja se estabilice, que
 * vuelva a crecer, o que cambie el grupo del que se habla (la fuga de cuatro que pasa a ser un
 * corredor solo no es la misma noticia). Y como se hace aquí y no en el motor, arregla también los
 * journals YA CORRIDOS, que es lo que el dueño está leyendo.
 */
function groupGapRuns(entries: ChronicleEntry[]): ChronicleEntry[] {
  const idx = entries.flatMap((e, i) => (e.plantilla === 'time_gap' ? [i] : []))
  if (idx.length < GAP_RUN_MIN) return entries
  const gapOf = (e: ChronicleEntry): number => Number(e.datos?.gapS ?? 0)
  const leadOf = (e: ChronicleEntry): number | null =>
    e.datos?.leadSize == null ? null : Number(e.datos.leadSize)
  /**
   * Hacia dónde va la ventaja respecto del parte anterior. Se prefiere el `trend` del motor y, si
   * no viaja (crónicas anteriores a la v6), se deduce de los dos números: los journals viejos son
   * justo los que más ruido tienen.
   */
  const dirOf = (e: ChronicleEntry, prev: ChronicleEntry): number => {
    if (e.datos?.trend != null) return Math.sign(Number(e.datos.trend))
    const d = gapOf(e) - gapOf(prev)
    return Math.abs(d) < GAP_TREND_SECONDS ? 0 : Math.sign(d)
  }
  const replacement = new Map<number, ChronicleEntry | null>()
  for (let a = 0; a < idx.length;) {
    let b = a
    let dir: number | null = null
    while (b + 1 < idx.length) {
      const prev = entries[idx[b]!]!
      const next = entries[idx[b + 1]!]!
      // La racha es de UNA dirección, de UN grupo de cabeza y de partes PEGADOS: en cuanto una de
      // las tres cambia, lo que viene es otra noticia y merece su frase.
      if (next.km - prev.km >= GAP_RUN_DENSE_KM) break
      const d = dirOf(next, prev)
      if (dir === null) dir = d
      else if (d !== dir) break
      if (leadOf(next) !== leadOf(prev)) break
      b += 1
    }
    const run = idx.slice(a, b + 1)
    if (run.length >= GAP_RUN_MIN) {
      const last = entries[idx[b]!]!
      const first = entries[idx[a]!]!
      for (let k = a + 1; k < b; k++) replacement.set(idx[k]!, null)
      replacement.set(idx[b]!, {
        km: last.km,
        tS: last.tS,
        plantilla: 'time_gap_run',
        protagonists: [],
        datos: {
          ...last.datos,
          // De dónde venía la ventaja: la del PRIMER parte de la racha, que es el que el lector
          // acaba de leer. Así el arco engancha con la línea anterior en vez de empezar en una
          // cifra que no ha visto nunca («la ventaja crece a 2:11» / «de 1:51 a 49s»).
          fromGapS: gapOf(first),
          fromKm: first.km,
          count: run.length - 1,
        },
      })
    }
    a = b + 1
  }
  if (replacement.size === 0) return entries
  return entries.flatMap((e, i) => {
    if (!replacement.has(i)) return [e]
    const r = replacement.get(i)
    return r ? [r] : []
  })
}

/**
 * El liderato de la montaña, recalculado sobre la etapa entera. Desde la v13 el motor solo pone
 * `leads` a 1 si el ganador está ESTRICTAMENTE por delante de todos los demás, pero las crónicas
 * guardadas se emitieron con la comparación vieja (`>=` contra un máximo que se incluía a sí mismo)
 * y por eso en Race Great Ocean tres corredores distintos «now lead the mountains classification»
 * con UN punto cada uno. Aquí se rehace la cuenta con los puntos que los propios eventos traen: si
 * el que corona no manda en solitario, no se canta el liderato.
 */
function normalizeKomLeads(entries: ChronicleEntry[]): ChronicleEntry[] {
  const puntos = new Map<string, number>()
  /** A quién se ha PROCLAMADO ya líder en esta etapa. Es lo que distingue ganar de conservar. */
  let proclamado: string | null = null
  return entries.map((e) => {
    if (e.plantilla !== 'climb_kom') return e
    const quien = e.protagonists[0]?.name ?? ''
    puntos.set(quien, (puntos.get(quien) ?? 0) + Number(e.datos?.points ?? 0))
    const mios = puntos.get(quien) ?? 0
    let mejorAjeno = 0
    for (const [otro, pts] of puntos) if (otro !== quien) mejorAjeno = Math.max(mejorAjeno, pts)
    if (e.datos?.leads !== 1) return e
    /**
     * `leads` DICE «PASA A LIDERAR», NO «LIDERA» (v25). Con la lectura vieja el que ya mandaba se
     * proclamaba líder otra vez en cada cima que coronaba: en Race Jaén, Alex Taylor «takes the lead
     * in the mountains» en el km 44 y otra vez en el km 100, y son 35 proclamaciones repetidas en 21
     * etapas del día de juego 46. Ganar el maillot es una noticia; conservarlo no es la misma
     * noticia contada dos veces. El motor de la v25 ya lo emite así; esto arregla lo congelado.
     */
    if (mios > mejorAjeno && proclamado !== quien) {
      proclamado = quien
      return e
    }
    return { ...e, datos: { ...e.datos, leads: 0 } }
  })
}

/**
 * Km sin un solo corte tras los cuales la siguiente criba es una historia NUEVA (y vuelve a
 * presentar a quien aprieta). Es el mismo criterio con el que el motor pone `splitPhase` a cero
 * cuando el grupo se reagrupa; aquí, sin ese dato, lo aproxima la distancia.
 */
const SPLIT_SELECTION_GAP_KM = 25

/**
 * Pone en orden la cadena de CORTES de las crónicas viejas. El motor de hoy ya emite bien los tres
 * datos que hacen falta —de cuántos a cuántos ha quedado el grupo y qué número de aviso es—, pero
 * las etapas ya corridas tienen sus eventos CONGELADOS y son las que el dueño está leyendo. Tres
 * arreglos, todos con información que la crónica sí tiene y el motor no tenía en carretera:
 *
 * 1. **`before` reconstruido** (crónicas anteriores a la v6, que solo traen `dropped` y `remaining`):
 *    el grupo de antes es el que dejó el aviso anterior de la misma selección.
 * 2. **Los avisos vacíos se tiran** (defecto B2): en Race Arabia e5 hay diez avisos entre el km 136 y
 *    el 163 y en cuatro de ellos no se descolgó nadie. Un corte en el que no cae nadie no es un corte.
 * 3. **`phase` reconstruida** (crónicas anteriores a la v8): sin ella un puerto largo se lee como diez
 *    partes clónicos que nombran diez veces al mismo equipo («Éclair Équipe lift the pace» ×10 en
 *    Race Great Ocean). Con ella, el primer aviso presenta a quien aprieta y los demás cuentan la
 *    progresión. Lo que ya venga del motor no se toca.
 */
function normalizeSplits(entries: ChronicleEntry[]): ChronicleEntry[] {
  let phase = 0
  let lastKm: number | null = null
  let lastRemaining: number | null = null
  const out: ChronicleEntry[] = []
  for (const e of entries) {
    if (e.plantilla === 'peloton_regroup') {
      phase = 0
      lastKm = null
      lastRemaining = e.datos?.remaining == null ? null : Number(e.datos.remaining)
      out.push(e)
      continue
    }
    if (e.plantilla !== 'peloton_split') {
      out.push(e)
      continue
    }
    if (lastKm !== null && e.km - lastKm > SPLIT_SELECTION_GAP_KM) {
      phase = 0
      lastRemaining = null
    }
    const remaining = e.datos?.remaining == null ? null : Number(e.datos.remaining)
    const before = e.datos?.before == null ? lastRemaining : Number(e.datos.before)
    // Nadie se ha descolgado: no hay corte que contar (y el aviso no cuenta como aviso).
    if (before != null && remaining != null && before <= remaining) continue
    lastKm = e.km
    if (remaining != null) lastRemaining = remaining
    const datos: Record<string, number | string> = {
      ...e.datos,
      phase: e.datos?.phase != null ? Number(e.datos.phase) : phase,
    }
    if (before != null) datos.before = before
    phase += 1
    out.push({ ...e, datos })
  }
  return out
}

/**
 * Marca la concesión que luego se desmiente. El motor decide en carretera y no puede saber que
 * treinta kilómetros después el pelotón cazará; la crónica sí lo sabe, y con `cazada` la web escoge
 * una redacción que no promete lo que la carrera no cumplió. Esto también arregla las crónicas ya
 * congeladas, que son las que el dueño está leyendo (defecto B4).
 */
function markConcession(
  e: ChronicleEvent,
  caughtLaterKm: number | null,
): Record<string, number | string> | undefined {
  if (e.plantilla !== 'peloton_concedes') return e.datos
  if (caughtLaterKm === null || caughtLaterKm <= e.km) return e.datos
  return { ...e.datos, cazada: 1 }
}

/**
 * Un corredor solo se descuelga UNA vez. Desde la v13 el motor ya no lo repite (`gaveUp`), pero las
 * etapas corridas antes tienen sus eventos congelados: en producción, Alex Taylor se dejaba ir en el
 * km 196, en el 204 y en el 209 de la misma carrera. La segunda mención se tira aquí, que es lo
 * único que puede arreglar un journal ya guardado (defecto B3).
 */
function dedupeSitUps(entries: ChronicleEntry[]): ChronicleEntry[] {
  const seen = new Set<string>()
  return entries.filter((e) => {
    if (e.plantilla !== 'rider_sits_up') return true
    const who = e.protagonists[0]?.name ?? ''
    if (seen.has(who)) return false
    seen.add(who)
    return true
  })
}

/**
 * Agrupa en una sola entrada las menciones individuales cercanas del mismo tipo, con su número
 * (encargo A3 del dueño: «no menciones uno a uno todos los ciclistas que se van descolgando… puedes
 * mencionar muchos juntos con número»). Vale para los descuelgues, las pájaras y los abandonos.
 * Las entradas agrupadas conservan a TODOS sus protagonistas: cuántos nombres se dicen y cuántos se
 * resumen en «and N others» lo decide la web, que es quien sabe cuánto texto cabe en una línea.
 */
function groupRuns(entries: ChronicleEntry[], single: string, many: string): ChronicleEntry[] {
  // Los índices de las menciones, en orden. Se agrupan sobre ellos y NO sobre el array entero:
  // entre dos descuelgues de la misma ventana puede haber otras frases (un parte de cabeza, un
  // ataque) que no se tocan ni cambian de sitio.
  const idx = entries.flatMap((e, i) => (e.plantilla === single ? [i] : []))
  /** El racimo que sustituye a cada posición; `null` en las que desaparecen absorbidas. */
  const replacement = new Map<number, ChronicleEntry | null>()
  for (let a = 0; a < idx.length;) {
    const first = entries[idx[a]!]!
    let b = a
    while (b + 1 < idx.length && entries[idx[b + 1]!]!.km - first.km <= SIT_UP_WINDOW_KM) b += 1
    const run = idx.slice(a, b + 1).map((i) => entries[i]!)
    if (run.length >= SIT_UP_GROUP_MIN) {
      const last = run[run.length - 1]!
      // El racimo ocupa el sitio del ÚLTIMO descuelgue: la frase se lee donde acaba la sangría, que
      // es donde el lector la espera («con 10 km para meta, cinco corredores se dejan ir»).
      for (let k = a; k < b; k++) replacement.set(idx[k]!, null)
      replacement.set(idx[b]!, {
        km: last.km,
        tS: last.tS,
        plantilla: many,
        protagonists: run.flatMap((e) => e.protagonists),
        datos: {
          count: run.length,
          // Los km que faltaban cuando se descolgó el último: es el punto de la carrera en el que la
          // frase se lee, y el que el lector necesita para situarla.
          toGo: Number(last.datos?.toGo ?? 0),
          from: first.km,
        },
      })
    }
    a = b + 1
  }
  if (replacement.size === 0) return entries
  return entries.flatMap((e, i) => {
    if (!replacement.has(i)) return [e]
    const r = replacement.get(i)
    return r ? [r] : []
  })
}

/** Momentos clave que se marcan sobre la altimetría: fuga, captura, banners y meta. */
export function buildMarkers(events: readonly ChronicleEvent[]): AltimetryMarker[] {
  return events
    .filter((e) => Object.hasOwn(MARKER_LABEL, e.tipo))
    .map((e) => ({ km: e.km, label: MARKER_LABEL[e.tipo] ?? '•' }))
}

/**
 * Lo que hay GUARDADO en `stage_snapshots.radio`. Los corredores van por ÍNDICE sobre `riders`, y
 * `member` dice en qué grupo va cada uno. Se valida y no se confía: una fila escrita por un motor
 * anterior no tiene esta forma, y ahí la respuesta correcta es «esta etapa no tiene radio», no un 500.
 */
const storedRaceRadioSchema = z.object({
  starters: z.number(),
  riders: z.array(z.string()),
  kms: z.array(
    z.object({
      km: z.number(),
      racing: z.number(),
      gone: z.number(),
      groups: z.array(
        z.object({
          kind: radioGroupKindSchema,
          size: z.number(),
          gapS: z.number(),
          speedKmh: z.number().nullable(),
          pulling: z.array(z.number()),
          watching: z.array(z.number()),
        }),
      ),
    }),
  ),
})

/**
 * A cuántos corredores se nombra como mucho en un grupo. En una fuga de seis se nombran los seis; en
 * un pelotón de ciento veinte, los que tiran y los que hay que ver —maillots y jefes de filas—, y el
 * resto se CUENTA. El tope es de lectura, no de dato: lo guardado los lleva a todos.
 */
const MAX_NAMED_PER_GROUP = 24

/**
 * LA RADIO DE CARRERA, con la gente puesta donde va.
 *
 * Tres cosas distintas que la vista tiene que poder separar, y que antes se mezclaban en una lista:
 *
 *  - quién **tira**, que desde la v34 es una sola lista y no dos;
 *  - quién va **a rueda** pero hay que ver igualmente: los maillots y los jefes de filas, porque
 *    «el equipo tira para X» no se entiende si X no aparece por ninguna parte;
 *  - y cuántos quedan sin nombrar, que se cuentan en vez de esconderse.
 *
 * A quién se sigue lo decidió quien ESCRIBIÓ la radio (`stageRun.ts`: los diez primeros de la
 * general y los diez de la etapa); aquí solo se les pone cara con el mismo índice de identidades que
 * usa el journal, así que la radio y la crónica no pueden llamar de dos maneras al mismo corredor.
 */
export function buildRaceRadio(stored: unknown, names: ChronicleNames): RaceRadio | null {
  const parsed = storedRaceRadioSchema.safeParse(stored)
  if (!parsed.success) return null
  const ids = parsed.data.riders
  return {
    starters: parsed.data.starters,
    kms: parsed.data.kms.map((k) => {
      // El líder de carrera es el primero de la carretera; los huecos se cuelgan de él y del grupo
      // de delante, que son las DOS preguntas que se hacen mirando una tabla de radio.
      let prevGap = 0
      return {
        km: k.km,
        racing: k.racing,
        gone: k.gone,
        groups: k.groups.map((g, gi) => {
          const named: RadioRider[] = []
          // 1) Los que TIRAN del grupo, en su orden (de más a menos trabajo reciente).
          for (const i2 of g.pulling) {
            const r = names.riderOf.get(ids[i2] ?? '')
            if (r) named.push({ ...r, role: 'pulling' })
          }
          // 2) Los que hay que ver aunque vayan a rueda: el motor los colocó, aquí se les pone cara.
          //    `protect` deja además que quien llama añada a alguien sin tocar lo guardado.
          for (const i2 of g.watching) {
            const r = names.riderOf.get(ids[i2] ?? '')
            if (r) named.push({ ...r, role: 'sheltered' })
          }
          const shown = named.slice(0, MAX_NAMED_PER_GROUP)
          const gapToPrevS = gi === 0 ? 0 : Math.max(0, g.gapS - prevGap)
          prevGap = g.gapS
          return {
            kind: g.kind,
            size: g.size,
            gapS: g.gapS,
            gapToPrevS,
            speedKmh: g.speedKmh,
            riders: shown,
            unnamed: Math.max(0, g.size - shown.length),
          }
        }),
      }
    }),
  }
}
