import { type SQL, and, asc, eq, isNull } from 'drizzle-orm'
import { raceGc, raceRosters } from './schema.js'

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

/**
 * QUIÉN ESTÁ EN LA GENERAL, y la respuesta NO es «quien tenga fila en `race_gc`».
 *
 * El defecto, visto en producción y contado por el dueño: «Iván García en su palmarés pone que ganó
 * la vuelta a Andalucía; no es cierto, se retiró en la primera etapa». Y así fue: se retiró tras la
 * etapa 1, así que en `race_gc` quedó su fila con **una sola etapa de tiempo** —13.654 s— contra los
 * cinco días de todos los demás. Ordenando por tiempo ascendente, el que abandona primero gana.
 *
 * Lo peor es que la general que se MUESTRA ya lo hacía bien (`getRaceGc` manda a los abandonados al
 * final), y la que REPARTE —premios, puntos UCI y palmarés— no. Dos definiciones de lo mismo en dos
 * sitios, y solo una arreglada. Por eso esto vive aquí, junto al orden: quien pregunte por la
 * general tiene que preguntar las dos cosas en el mismo sitio.
 *
 * Un abandono NO se borra de `race_gc` a propósito: la ficha de la carrera quiere enseñarlo como DNF
 * con lo que llevaba hecho. Lo que no puede es estar CLASIFICADO.
 */
export function gcFinishersWhere(raceId: string): SQL | undefined {
  return and(eq(raceGc.raceId, raceId), isNull(raceRosters.abandonedDay))
}

/** La condición del JOIN con el roster, que es de donde sale el abandono. Va con la de arriba. */
export function gcRosterOn(): SQL | undefined {
  return and(eq(raceRosters.raceId, raceGc.raceId), eq(raceRosters.riderId, raceGc.riderId))
}
