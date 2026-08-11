import type { AltimetryMarker } from '@cyclingstar/engine'
import { type ChronicleRider, type RaceLeaders, jerseyOf } from '@cyclingstar/shared'

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
  // Quién tira del pelotón va DESPUÉS del parte de ventaja: primero cuánto hay, luego quién está
  // trabajando para cerrarlo. Y cómo se reparte el trabajo en la fuga, con lo demás de la fuga.
  break_share: 2,
  peloton_pull: 2.5,
  sprint_intermediate: 2,
  climb_kom: 3,
  peloton_split: 4,
  // El reagrupamiento comparte sitio con el corte: son la misma cuenta (de cuántos a cuántos ha
  // pasado el grupo) contada en las dos direcciones, y nunca coinciden en el mismo kilómetro.
  peloton_regroup: 4,
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
        : a.km - b.km ||
          (EVENT_ORDER[a.plantilla] ?? 9) - (EVENT_ORDER[b.plantilla] ?? 9) ||
          a.tS - b.tS,
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
  for (const kind of CLUSTERED) out = groupRuns(out, kind.single, kind.many)
  return out
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
  return entries.map((e) => {
    if (e.plantilla !== 'climb_kom') return e
    const quien = e.protagonists[0]?.name ?? ''
    puntos.set(quien, (puntos.get(quien) ?? 0) + Number(e.datos?.points ?? 0))
    if (e.datos?.leads !== 1) return e
    const mios = puntos.get(quien) ?? 0
    let mejorAjeno = 0
    for (const [otro, pts] of puntos) if (otro !== quien) mejorAjeno = Math.max(mejorAjeno, pts)
    if (mios > mejorAjeno) return e
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
