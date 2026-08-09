import type { AltimetryMarker } from '@cyclingstar/engine'

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

/** Una entrada de la crónica ya lista para la web (nombres resueltos, sin ids). */
export interface ChronicleEntry {
  km: number
  tS: number
  plantilla: string
  protagonists: string[]
  protagonistTeams: string[]
  datos: Record<string, number | string> | undefined
}

/**
 * Orden narrativo dentro de un mismo kilómetro: primero se forma la fuga, luego la reacción del
 * pelotón, los sprints y las cimas, después la caza, y la victoria siempre al final.
 */
const EVENT_ORDER: Record<string, number> = {
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
  sprinters_chase: 1,
  peloton_concedes: 1,
  sprinters_give_up: 1,
  time_gap: 2,
  sprint_intermediate: 2,
  climb_kom: 3,
  peloton_split: 4,
  // El reagrupamiento comparte sitio con el corte: son la misma cuenta (de cuántos a cuántos ha
  // pasado el grupo) contada en las dos direcciones, y nunca coinciden en el mismo kilómetro.
  peloton_regroup: 4,
  // El parte de quién va en cabeza va DESPUÉS de lo que lo ha producido —el corte del grupo o la
  // captura de la fuga—: primero se cuenta qué ha pasado y luego quiénes han quedado delante.
  breakaway_caught: 5,
  front_group: 6,
  final_km: 7,
  bunch_sprint: 7,
  stage_win: 8,
  stage_win_itt: 7,
}

/** Tipos de evento que se pintan como hito sobre la altimetría, con su etiqueta en la web. */
const MARKER_LABEL: Record<string, string> = {
  ataque: 'attack',
  fuga_formada: 'break',
  fuga_cazada: 'caught',
  banner: 'banner',
  meta: 'finish',
}

/** Nombre y equipo de cada corredor de la etapa, para resolver los ids de los eventos. */
export interface ChronicleNames {
  nameOf: Map<string, string>
  teamOf: Map<string, string | null>
}

/** Construye los índices de nombre y equipo a partir de los resultados de la etapa. */
export function chronicleNames(
  results: readonly { riderId: string; name: string; teamName: string | null }[],
): ChronicleNames {
  return {
    nameOf: new Map(results.map((r) => [r.riderId, r.name])),
    teamOf: new Map(results.map((r) => [r.riderId, r.teamName])),
  }
}

/**
 * Traduce los eventos a la crónica que consume la web: resuelve ids a nombres, ordena por km (y
 * dentro del km por orden narrativo) y quita los duplicados exactos consecutivos.
 */
export function buildChronicle(
  events: readonly ChronicleEvent[],
  names: ChronicleNames,
): ChronicleEntry[] {
  return (
    events
      // TELEMETRÍA frente a NARRATIVA (docs/motor.md §16): el motor emite TODOS los intentos de
      // movimiento porque son dato de carrera, y marca con `narra` cuáles merecen una frase. Una
      // etapa tiene una docena de intentos y la crónica no puede ser su inventario.
      .filter((e) => e.datos?.narra !== 0)
      .map((e) => ({
        km: Math.round(e.km),
        tS: Math.round(e.tS),
        plantilla: e.plantilla,
        protagonists: e.protagonistas.map((id) => names.nameOf.get(id) ?? id),
        protagonistTeams: [
          ...new Set(
            e.protagonistas.map((id) => names.teamOf.get(id)).filter((t): t is string => !!t),
          ),
        ],
        datos: e.datos,
      }))
      .sort(
        (a, b) =>
          a.km - b.km ||
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
          prev.protagonists.join() !== e.protagonists.join()
        )
      })
  )
}

/** Momentos clave que se marcan sobre la altimetría: fuga, captura, banners y meta. */
export function buildMarkers(events: readonly ChronicleEvent[]): AltimetryMarker[] {
  return events
    .filter((e) => Object.hasOwn(MARKER_LABEL, e.tipo))
    .map((e) => ({ km: e.km, label: MARKER_LABEL[e.tipo] ?? '•' }))
}
