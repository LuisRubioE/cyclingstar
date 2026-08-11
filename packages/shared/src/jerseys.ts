/**
 * QUIÉN LLEVA CADA MAILLOT DE LÍDER.
 *
 * > «en el Journal cuando menciona al ciclista que va el primero en la general, debería mencionarlo
 * > como con una imagen de maillot amarillo… y poner un maillot amarillo en todas las
 * > clasificaciones… y uno verde al que vaya primero por puntos excepto si coincide con el
 * > anterior… y uno azul al que vaya primero en la montaña.» — el dueño.
 *
 * No hay dato nuevo que guardar: quién lleva cada maillot es una CONSULTA sobre las clasificaciones
 * que ya existen. Por eso esto es una función pura, sin base de datos, y vive en `shared`: la
 * calcula la API (que tiene las clasificaciones) y la web solo pinta lo que llega.
 *
 * Los tres maillots son EXCLUYENTES entre sí; el marcador de equipo líder (`leadingTeam`, más
 * abajo) NO lo es y va aparte a propósito: un cuerpo no puede llevar dos camisetas, pero un
 * corredor sí puede ir de amarillo Y ser del equipo líder a la vez, que además es lo normal.
 */

/** Los tres maillots que lleva un CORREDOR, en orden de prioridad. */
export type JerseyKind = 'gc' | 'points' | 'kom'

/** El orden manda: si un corredor pudiera llevar dos, se queda con el primero de esta lista. */
export const JERSEY_PRIORITY: readonly JerseyKind[] = ['gc', 'points', 'kom']

/** Quién lleva cada maillot (id de corredor), y qué equipo lleva los dorsales de líder. */
export interface RaceLeaders {
  /** Líder de la general: maillot amarillo. */
  gc: string | null
  /** Primero por puntos: maillot verde. */
  points: string | null
  /** Primero en la montaña: maillot azul. */
  kom: string | null
  /** Equipo líder de la clasificación por equipos: sus corredores llevan dorsal amarillo. */
  team: string | null
}

/** Nadie lleva nada: etapa 1, carrera de un día, o carrera sin clasificaciones todavía. */
export const NO_LEADERS: RaceLeaders = { gc: null, points: null, kom: null, team: null }

/** Una fila de la general: lo único que hace falta es quién es y si sigue clasificado. */
export interface GcStanding {
  riderId: string
  /** No clasificado: abandonó o le falta alguna etapa (ver `getGcThroughStage`). */
  dnf?: boolean
}

/** Una fila de puntos o montaña, ya ORDENADA por la clasificación (la primera es la primera). */
export interface PointsStanding {
  riderId: string
}

export interface JerseyInput {
  /** General ordenada; los no clasificados van marcados con `dnf` (y suelen ir al final). */
  gc: readonly GcStanding[]
  /** Clasificación por puntos, ordenada. */
  points: readonly PointsStanding[]
  /** Clasificación de la montaña, ordenada. */
  kom: readonly PointsStanding[]
}

/**
 * Reparte los tres maillots aplicando la prioridad **amarillo > verde > azul**.
 *
 * LA DECISIÓN QUE HAY QUE PODER CAMBIAR EN UN SITIO: cuando el líder de la general va además
 * primero por puntos, el verde **PASA AL SIGUIENTE** de la clasificación de puntos, que es la regla
 * real del ciclismo —en carretera el maillot lo lleva alguien, no desaparece—. Igual con el azul, y
 * encadenado: si el mismo corredor lidera las tres, el verde va al 2.º de puntos y el azul al 2.º
 * de montaña; y si ese 2.º de montaña es justo el que acaba de coger el verde, al 3.º.
 *
 * > **La alternativa, si algún día se prefiere:** que el maillot simplemente NO SE PINTE cuando
 * > coincide con uno de más prioridad («excepto si coincide», que es lo que dijo el dueño al pie de
 * > la letra). Para cambiarlo basta con quedarse con la primera fila de cada clasificación y
 * > devolver `null` si ya lleva otro maillot, en vez de seguir bajando: es el bucle `for` de aquí
 * > abajo, y no hay que tocar nada más en toda la aplicación.
 *
 * QUIEN ABANDONÓ NO LLEVA MAILLOT. Ya no está clasificado, así que no puede defender nada al día
 * siguiente. La general es la única clasificación que sabe quién abandonó (`dnf`), y de ella sale
 * la lista de excluidos que se aplica también a puntos y montaña —donde un abandonado puede seguir
 * apareciendo con los puntos que ganó antes de irse—.
 */
export function assignLeaderJerseys(input: JerseyInput): Omit<RaceLeaders, 'team'> {
  const unranked = new Set(input.gc.filter((r) => r.dnf).map((r) => r.riderId))
  const standings: Record<JerseyKind, readonly { riderId: string }[]> = {
    gc: input.gc.filter((r) => !r.dnf),
    points: input.points,
    kom: input.kom,
  }
  const worn = new Set<string>()
  const out: Omit<RaceLeaders, 'team'> = { gc: null, points: null, kom: null }
  for (const kind of JERSEY_PRIORITY) {
    // El primero de esta clasificación que siga en carrera y no lleve ya otro maillot. Bajar por la
    // tabla ES la regla del «pasa al siguiente»; quedarse solo con `[0]` sería la alternativa.
    const holder = standings[kind].find((r) => !unranked.has(r.riderId) && !worn.has(r.riderId))
    if (!holder) continue
    out[kind] = holder.riderId
    worn.add(holder.riderId)
  }
  return out
}

/** Una fila de la clasificación por equipos, ordenada; `out` = se quedó fuera (menos de tres). */
export interface TeamStanding {
  teamId: string
  out?: boolean
}

/**
 * El equipo que lleva los DORSALES de líder: el primero de la clasificación por equipos ACUMULADA.
 *
 * Va aparte de los tres maillots y no entra en su cadena de prioridad: en el ciclismo real el
 * equipo líder no lleva maillot —sus corredores llevan el dorsal amarillo—, así que no compite con
 * nada y un corredor puede ir de amarillo y llevar dorsal amarillo a la vez.
 *
 * Se pasa SIEMPRE la acumulada, nunca la de una etapa suelta: el que mejor lo hizo hoy no es el que
 * lleva los dorsales mañana.
 */
export function leadingTeam(overall: readonly TeamStanding[]): string | null {
  return overall.find((t) => !t.out)?.teamId ?? null
}

/** Las cuatro cosas de una vez, que es como las pide la ficha de una etapa o de una carrera. */
export function raceLeaders(input: JerseyInput & { teams?: readonly TeamStanding[] }): RaceLeaders {
  return { ...assignLeaderJerseys(input), team: leadingTeam(input.teams ?? []) }
}

/** El maillot que lleva un corredor concreto, o null. Es la consulta que hacen todas las tablas. */
export function jerseyOf(leaders: RaceLeaders | undefined, riderId: string): JerseyKind | null {
  if (!leaders) return null
  for (const kind of JERSEY_PRIORITY) if (leaders[kind] === riderId) return kind
  return null
}

/** Rótulo de cada maillot, para el `aria-label` y el `title`. Textos de interfaz: en inglés. */
export const JERSEY_LABEL: Record<JerseyKind, string> = {
  gc: 'Race leader',
  points: 'Points leader',
  kom: 'Mountains leader',
}

/** Rótulo del dorsal de líder por equipos. */
export const LEADING_TEAM_LABEL = 'Leading team'
