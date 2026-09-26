/**
 * QUÉ CARRERAS DE UN DÍA VIGILA EL BANCO DE SATURACIÓN (docs/generador.md §13.6 punto 3; paso 9 de
 * §15.11). Estaba inline en `invariantsClasicas.test.ts`; sale aquí para que el pareado pueda elegir
 * el conjunto con el calendario viejo y con el nuevo, que no es el mismo: el generador decide qué ocho
 * entran.
 *
 * Las de un día del WorldTour son las más largas del calendario y por tanto el peor caso; y las más
 * DURAS del calendario entero, sean de la categoría que sean, porque el filtro `level === 'WT'` es
 * exactamente por donde se coló el defecto de la v40 (Jura, Andorra, Appennino, Ses Salines
 * reventaban el pelotón y la batería salía verde). Cuál es dura se sabe sin simular: la demanda es la
 * integral del coste base del recorrido.
 */
import { STAGE } from '../constants.js'
import { type CalendarRace, SEASON_CALENDAR } from '../routes/calendar.js'
import { costBase } from '../stage/physics.js'
import { sampleProfile } from '../stage/sample.js'
import { realRaceScenario } from './scenarios.js'

/** Las carreras de un día del WorldTour que no son crono. */
export function oneDayWorldTour(calendar: CalendarRace[] = SEASON_CALENDAR): string[] {
  return calendar
    .filter(
      (r) => r.level === 'WT' && r.format === 'un-dia' && r.stages[0] && !r.stages[0].timeTrial,
    )
    .map((r) => r.id)
}

/** La demanda de una carrera de un día: la integral del coste base de su recorrido, sin simular. */
export function demandaDe(id: string, calendar: CalendarRace[] = SEASON_CALENDAR): number {
  return sampleProfile(realRaceScenario(id, 1, calendar).input.profile).reduce(
    (acc, b) => acc + costBase(b) * STAGE.dx,
    0,
  )
}

/** Las `n` carreras de un día más exigentes fuera del WorldTour (no crono), de más a menos demanda. */
export function hardestOneDay(calendar: CalendarRace[] = SEASON_CALENDAR, n = 8): string[] {
  const wt = oneDayWorldTour(calendar)
  return calendar
    .filter((r) => r.format === 'un-dia' && r.stages[0] && !r.stages[0].timeTrial)
    .map((r) => r.id)
    .filter((id) => !wt.includes(id))
    .map((id): [string, number] => [id, demandaDe(id, calendar)])
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([id]) => id)
}
