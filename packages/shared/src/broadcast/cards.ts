/**
 * LAS CARTAS SERVIDAS Y LA SALIDA (E2, docs/retransmision.md §4.8, §4.11, §7.5 y §7.8; D-15, D-26; paso
 * 6b). Puro.
 *
 * `BroadcastHead.cast` es un `RiderCard` por corredor, armado con el reparto congelado (`CastRider`,
 * §4.2) y los nombres de hoy; `BroadcastHead.startState`, los maillots con que se salió y la general
 * de salida. Los dos los arma la API al servir la cabecera (`serveCast` y la ruta, §7.8), y aquí se
 * escribe la parte que no lee la base, para que la web pruebe la retransmisión con la cabecera que arma
 * la ruta (B3, `breakPresentation.test.ts`) y no con una copia: el orden de §7.8 es degradar por el velo
 * (7b, `veilCast`, ANTES de llamar aquí), cortar las líneas a `cardLinesMax` y calcular la notoriedad con
 * lo que queda, así que una línea velada no ocupa un hueco ni sube de nivel a nadie.
 *
 * No estaba en §17.20, que ponía todo `serveCast` en `apps/api/src/broadcastSource.ts`: `serveCast`
 * sigue allí (con el velo del 7b delante) y llama a `riderCardsOf`.
 */
import { type RiderCard, staticNotoriety } from '../jerseys.js'
import type { NameResolver } from '../news.js'
import { BROADCAST } from './constants.js'
import type { RiderIx, TimelineCast } from './timeline.js'
import type { StartState } from './wire.js'

/**
 * EL REPARTO SERVIDO (§7.8): por `RiderIx`, cada corredor con su nombre y el de su equipo de hoy
 * (`names`), el equipo CON EL QUE CORRIÓ y su equipación de ese día, el maillot que lleva, sus líneas
 * cortadas a `cardLinesMax` y su notoriedad (`staticNotoriety`, §7.5) con la categoría del día
 * (`dayCategory`: `championshipCategory` de la carrera, o élite). `cast` llega ya degradado por el velo.
 */
export function riderCardsOf(
  cast: TimelineCast,
  names: Pick<NameResolver, 'rider' | 'team'>,
  own: ReadonlySet<RiderIx>,
  dayCategory: 'elite' | 'u23',
): RiderCard[] {
  return cast.riders.map((c) => {
    const t = c.team === null ? undefined : cast.teams[c.team]
    const lines = c.distinctions.slice(0, BROADCAST.cardLinesMax)
    return {
      ix: c.rider,
      id: c.riderId,
      name: names.rider(c.riderId),
      bib: c.bib,
      country: c.country,
      gender: c.gender,
      team:
        t === undefined
          ? null
          : { id: t.teamId, name: names.team(t.teamId), jerseySeed: t.jerseySeed },
      worn: c.worn,
      lines,
      notoriety: staticNotoriety(c.worn, lines, c.knownWins, dayCategory, {
        gcThreatTop: BROADCAST.gcThreatTop,
        knownNameMinWins: BROADCAST.knownNameMinWins,
      }),
      own: own.has(c.rider),
    }
  })
}

/**
 * LA SALIDA (§4.11): quién LLEVA cada maillot (el de líder de `worn`, delegado o no; todo null el primer
 * día), los `virtualGcTop` primeros de la general de salida con su déficit y cuántos salen. Sale del
 * reparto ya degradado, así que un maillot o un puesto que vienen de una etapa velada no están (B13).
 */
export function startStateOf(cast: TimelineCast, racingAtStart: number): StartState {
  const leaders: { gc: RiderIx | null; points: RiderIx | null; kom: RiderIx | null } = {
    gc: null,
    points: null,
    kom: null,
  }
  for (const c of cast.riders) if (c.worn.kind === 'leader') leaders[c.worn.jersey] = c.rider
  const gcTop = cast.riders
    .flatMap((c) =>
      c.start.gcRank !== null && c.start.gcRank <= BROADCAST.virtualGcTop
        ? [{ rider: c.rider, rank: c.start.gcRank, gapS: c.start.gcDeficitS ?? 0 }]
        : [],
    )
    .sort((x, y) => x.rank - y.rank || x.rider - y.rider)
  return { leaders, gcTop, racingAtStart }
}
