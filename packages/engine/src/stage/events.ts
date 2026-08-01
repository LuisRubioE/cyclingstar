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

  /** Eventos ordenados por tiempo de carrera (SPEC 6.15). */
  toArray(): RaceEvent[] {
    return [...this.events].sort((a, b) => a.tS - b.tS || a.km - b.km)
  }
}
