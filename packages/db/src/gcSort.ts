import { type SQL, asc } from 'drizzle-orm'
import { raceGc } from './schema.js'

/**
 * El ORDEN de la clasificación general, en un solo sitio.
 *
 * Regla del ciclismo: manda el tiempo; a igualdad de tiempo va primero quien acumula MEJORES PUESTOS
 * (suma menor) y, si sigue el empate, quien mejor acabó la ÚLTIMA etapa disputada. El último criterio
 * es el id del corredor: no es deportivo, es lo que hace el orden TOTAL y DETERMINISTA. Sin él, con
 * el pelotón empatado a tiempo (lo normal en una llana) Postgres devolvía el orden que quería y no
 * era estable entre consultas: dos recargas daban dos generales distintas, y los puntos UCI se
 * repartían por ese azar.
 */
export function gcOrderBy(): SQL[] {
  return [
    asc(raceGc.tiempoTotalS),
    asc(raceGc.sumaPuestos),
    asc(raceGc.ultimoPuesto),
    asc(raceGc.riderId),
  ]
}
