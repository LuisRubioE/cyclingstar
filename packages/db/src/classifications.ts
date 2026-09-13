import type { StandingRow } from '@cyclingstar/engine'
import { riderAge, seasonPosition } from '@cyclingstar/shared'
import { eq, inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { Database } from './client.js'

type Db = ReturnType<typeof drizzle>
/** La base o una transacción: el contexto se arma dentro de la del tick. */
type Conn = Database | Parameters<Parameters<Db['transaction']>[0]>[0]
import { raceGc, riders } from './schema.js'

/**
 * LAS CLASIFICACIONES SECUNDARIAS (docs/tactica.md §3.3 y paso 4).
 *
 * Puntos, montaña y joven. Existen para que un corredor pueda decidir MIRANDO ALGO: R05 («motivos
 * secundarios como claim de equipo»), R06 (las pancartas) y R07 (las bonificaciones) preguntan las
 * tres lo mismo —«¿me sirve de algo pelear esto hoy?»— y hoy no hay a quién preguntárselo.
 *
 * **NO SE CREA LA TABLA `race_classifications`, y hay que decir por qué en vez de crearla.** El plan
 * la pedía, y sería una **segunda fuente de verdad para un dato que `race_gc` ya tiene**:
 * `puntos_volante` y `puntos_montana` se acumulan ahí etapa a etapa desde hace versiones, y la
 * clasificación de jóvenes es ese mismo `race_gc` filtrado por edad. Escribirla en otra tabla no
 * añade información: añade la posibilidad de que las dos discrepen.
 *
 * Y este repositorio tiene el defecto con nombre propio: `fame`, `teamTrust` y `facilities` fueron
 * tres columnas que existían, se rellenaban y no decidían nada, y hay una prueba
 * (`columnasVivas.test.ts`) escrita justamente para que no vuelva a pasar. Duplicar `race_gc` en una
 * tabla nueva es la versión de al lado del mismo error.
 *
 * Se calcula al leer. Son dos consultas y un `sort`, y el contexto de carrera se arma una vez por
 * etapa, no por corredor ni por bloque.
 *
 * **La de EQUIPOS no vive aquí**: la calcula `teamClassification.ts` con las reglas UCI y sus
 * desempates, y se lee de ahí. Reescribirla habría sido tener dos reglamentos.
 */

/** Una fila de la clasificación, ya ordenada y con el hueco al de delante. */
export interface ClassificationRow {
  riderId: string
  rank: number
  points: number
  /** A cuánto está del que va delante. 0 para el primero. */
  toNextRank: number
}

export interface RaceClassifications {
  puntos: ClassificationRow[]
  montana: ClassificationRow[]
  joven: ClassificationRow[]
}

/** La edad por debajo de la cual un corredor entra en la clasificación de jóvenes (regla UCI). */
export const YOUNG_MAX_AGE = 25

function ordenar(
  filas: { riderId: string; points: number }[],
  masEsMejor: boolean,
): ClassificationRow[] {
  const orden = [...filas].sort(
    (a, b) =>
      (masEsMejor ? b.points - a.points : a.points - b.points) || (a.riderId < b.riderId ? -1 : 1),
  )
  return orden.map((f, i) => ({
    riderId: f.riderId,
    rank: i + 1,
    points: f.points,
    // El hueco al de DELANTE, que es lo que decide si vale la pena pelear hoy: ir segundo a un punto
    // y ir segundo a cuarenta son dos carreras distintas, y «rank 2» no las distingue.
    toNextRank: i === 0 ? 0 : Math.abs((orden[i - 1]?.points ?? f.points) - f.points),
  }))
}

/** Las tres clasificaciones de una carrera, calculadas de `race_gc`. */
export async function getRaceClassifications(
  db: Conn,
  raceKey: string,
  gameDay: number,
): Promise<RaceClassifications> {
  const filas = await db
    .select({
      riderId: raceGc.riderId,
      tiempoTotalS: raceGc.tiempoTotalS,
      puntosVolante: raceGc.puntosVolante,
      puntosMontana: raceGc.puntosMontana,
    })
    .from(raceGc)
    .where(eq(raceGc.raceId, raceKey))
  if (filas.length === 0) return { puntos: [], montana: [], joven: [] }

  const nacimientos = await db
    .select({ id: riders.id, birthSeason: riders.birthSeason })
    .from(riders)
    .where(
      inArray(
        riders.id,
        filas.map((f) => f.riderId),
      ),
    )
  const season = seasonPosition(gameDay).season
  const jovenes = new Set(
    nacimientos.filter((n) => riderAge(n.birthSeason, season) <= YOUNG_MAX_AGE).map((n) => n.id),
  )

  return {
    puntos: ordenar(
      filas.map((f) => ({ riderId: f.riderId, points: f.puntosVolante })),
      true,
    ),
    montana: ordenar(
      filas.map((f) => ({ riderId: f.riderId, points: f.puntosMontana })),
      true,
    ),
    // La de jóvenes es la GENERAL filtrada por edad, así que va por TIEMPO y menos es mejor.
    joven: ordenar(
      filas
        .filter((f) => jovenes.has(f.riderId))
        .map((f) => ({
          riderId: f.riderId,
          points: f.tiempoTotalS,
        })),
      false,
    ),
  }
}

/**
 * Las clasificaciones vueltas del revés: por corredor, sus filas. Es la forma en que `StageRider`
 * las quiere, porque lo que el motor pregunta es «¿qué me juego YO hoy?», no «¿quién va líder?».
 */
export function standingsByRider(c: RaceClassifications): Map<string, StandingRow[]> {
  const out = new Map<string, StandingRow[]>()
  const meter = (kind: StandingRow['kind'], filas: ClassificationRow[]): void => {
    for (const f of filas) {
      const lista = out.get(f.riderId) ?? []
      lista.push({ kind, rank: f.rank, points: f.points, toNextRank: f.toNextRank })
      out.set(f.riderId, lista)
    }
  }
  meter('puntos', c.puntos)
  meter('montana', c.montana)
  meter('joven', c.joven)
  return out
}
