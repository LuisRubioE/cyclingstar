import type { UpcomingRace } from '@cyclingstar/shared'
import { dayRange } from './trainingPlan'

/**
 * EL VIAJE DE UNA CARRERA DEL PROGRAMA (E3, docs/visual.md §11.6; D-43, I-34; PR 15): ida, carrera y vuelta
 * son un viaje, y se ve donde se decide. `Day 51 out, Day 53 back · paid 48` para el agente libre, que se lo
 * pagó al inscribirse; sin la cifra para el corredor de un equipo, que no paga; y nada en casa. Los días, de
 * la temporada, como en el resto de la pantalla.
 */
export function programmeTravel(
  race: Pick<UpcomingRace, 'travelOut' | 'travelBack' | 'travelPaid'>,
): string | null {
  const tramo = (days: readonly number[], what: string) => {
    const first = days[0]
    const last = days[days.length - 1]
    return first === undefined || last === undefined ? null : `${dayRange(first, last)} ${what}`
  }
  const partes = [tramo(race.travelOut, 'out'), tramo(race.travelBack, 'back')].filter(
    (p): p is string => p !== null,
  )
  if (partes.length === 0) return null
  const pagado =
    race.travelPaid === null ? '' : ` · paid ${race.travelPaid.toLocaleString('en-US')}`
  return `${partes.join(', ')}${pagado}`
}
