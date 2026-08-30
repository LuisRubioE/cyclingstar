/**
 * Registro de eventos de carrera con plantillas (SPEC 6.15). Los eventos se acumulan en orden
 * cronológico y el cliente los renderiza; aquí solo se guarda la plantilla y sus protagonistas
 * (i18n barato). Puro: sin tiempo real.
 */
import type { RaceEvent } from './types.js'

/** Acumulador ordenado de eventos de una etapa. */
export class EventLog {
  private readonly events: RaceEvent[] = []

  add(event: RaceEvent): void {
    this.events.push(event)
  }

  emit(
    km: number,
    tS: number,
    tipo: string,
    plantilla: string,
    protagonistas: string[] = [],
    datos?: Record<string, number | string>,
  ): void {
    this.events.push(
      datos
        ? { km, tS, tipo, plantilla, protagonistas, datos }
        : { km, tS, tipo, plantilla, protagonistas },
    )
  }

  /**
   * Los últimos partes emitidos EN ESTE KILÓMETRO, para no contar dos veces lo mismo (v40). Va por
   * orden de emisión y no por reloj: lo que interesa es lo que el lector acaba de leer.
   */
  sameKm(km: number): RaceEvent[] {
    const out: RaceEvent[] = []
    for (let i = this.events.length - 1; i >= 0; i--) {
      const e = this.events[i]!
      if (Math.round(e.km) !== Math.round(km)) break
      out.push(e)
    }
    return out
  }

  /** Eventos ordenados por tiempo de carrera (SPEC 6.15). */
  toArray(): RaceEvent[] {
    return [...this.events].sort((a, b) => a.tS - b.tS || a.km - b.km)
  }
}

/**
 * EL QUE CORRE POR SU CUENTA SE ANUNCIA DONDE HACE ALGO (v31, docs/motor.md §VI.2).
 *
 * La v15 lo anunciaba en el **km 0**: la primera línea del diario decía «Team orders are one thing —
 * 175 Rui Correia (Lince Racing) is racing his own race today» antes de que la carrera hubiera
 * empezado. El dueño lo llamó por su nombre: «esta tontería absurda y que no se entiende». Y son dos
 * defectos, no uno:
 *
 * 1. **En el km 0 no ha pasado nada.** Es una declaración de intenciones, no un hecho de carrera, y
 *    el diario cuenta lo que pasa. Si el rebelde no vuelve a aparecer en todo el día —que es lo
 *    normal—, esa línea se queda sola, sin consecuencia, y el lector no sabe qué mirar.
 * 2. **No dice qué hace distinto.** «Corre su propia carrera» no se puede ver en ninguna parte.
 *
 * La regla es la que el motor ya aplica a los grupos desde la v25 —no se habla de algo cuya salida no
 * se ha contado—: el rebelde se anuncia **la primera vez que aparece en la crónica**, en el kilómetro
 * en que aparece, y la frase se cuelga de LO QUE ESTÁ HACIENDO ahí. Si no aparece nunca, no hay
 * línea: una desobediencia sin consecuencia no es noticia.
 *
 * Pura y determinista: recoloca eventos ya emitidos y no consume un solo dado.
 */
export function announceRebels(
  events: readonly RaceEvent[],
  rebels: ReadonlySet<string>,
): RaceEvent[] {
  if (rebels.size === 0) return [...events]
  const pending = new Set(rebels)
  const out: RaceEvent[] = []
  for (const e of events) {
    // La propia línea de rebeldía no cuenta como aparición: si no, se anunciaría a sí misma.
    if (e.plantilla !== 'rider_defies_team') {
      for (const id of e.protagonistas) {
        if (!pending.has(id)) continue
        pending.delete(id)
        out.push({
          km: e.km,
          tS: e.tS,
          tipo: 'por_libre',
          plantilla: 'rider_defies_team',
          protagonistas: [id],
          // QUÉ está haciendo cuando se le nombra, que es lo que hace la frase legible. El detalle
          // fino lo cuenta el evento que viene justo detrás; esto solo elige la redacción.
          datos: { doing: doingOf(e.plantilla) },
        })
      }
    }
    out.push(e)
  }
  return out
}

/** De la plantilla del evento en que aparece el rebelde a la clase de acto que la frase nombra. */
function doingOf(plantilla: string): string {
  if (
    plantilla.startsWith('attack') ||
    plantilla.startsWith('move') ||
    plantilla.startsWith('bridge')
  )
    return 'ataca'
  if (plantilla === 'peloton_pull' || plantilla === 'chase_work' || plantilla === 'break_share')
    return 'tira'
  return 'aparece'
}
