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
// Ciclo solo de tipos con la línea temporal (E2, §4.8): `import type` se borra al compilar.
import type { RiderIx, StageRef } from './broadcast/timeline.js'

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

/*
 * ── EL MAILLOT QUE SE VE Y EL RÓTULO (E2, docs/retransmision.md §4.8) ────────────────────────────
 *
 * El maillot LLEVADO (uno, el que se ve) no es lo mismo que las DISTINCIONES (varias, en el rótulo).
 * Aquí nacen solo los TIPOS, en el PR 2, porque `broadcast/timeline.ts` los importa (decisión 17-z);
 * la regla UCI que los calcula (`wornJerseys`, `distinctions`), la notoriedad (`notorietyOf`,
 * `staticNotoriety`) y la fuente de títulos llegan en el paso 5 (§7.2, §7.4, §7.5). `JerseyKind` no
 * crece: `WornJersey` es una unión aparte para que ni `JERSEY_LABEL` ni los `Record<JerseyKind, …>`
 * de hoy cambien.
 */

/** Un título de campeón (§7.4). Lo deriva hoy E2 de palmares; E12 lo dará de su tabla detrás de la misma interfaz. */
export interface ChampionTitle {
  /** hoy solo 'national': no hay Mundial ni continentales en el calendario */
  readonly scope: 'world' | 'continental' | 'national'
  /** ISO-2 en mayúsculas, como riders.country; null en el del mundo */
  readonly country: string | null
  readonly discipline: 'road' | 'itt'
  /** de la carrera que lo dio (`championshipCategory`) */
  readonly category: 'elite' | 'u23'
  readonly season: number
  /** día de juego absoluto del campeonato (palmares.game_day) */
  readonly validFromDay: number
  /** el de la edición siguiente, o validFromDay + DAYS_PER_SEASON */
  readonly validToDay: number
  /** la etapa que lo dio: si está velada para el espectador, el título no viaja (B13) */
  readonly source: StageRef
  /** true mientras lo derive E2 de palmares */
  readonly provisional: boolean
}

/** EL maillot que se ve. Se graba en CastRider.worn al correr la etapa (D-15, D-24). */
export type WornJersey =
  /** delegated: no es el primero de su tabla; from: la N−1 */
  | {
      readonly kind: 'leader'
      readonly jersey: JerseyKind
      readonly delegated: boolean
      readonly from: StageRef
    }
  /** su título vigente de la disciplina y la categoría del día */
  | { readonly kind: 'champion'; readonly title: ChampionTitle }
  /** la equipación de su equipo del día (CastTeam.jerseySeed) */
  | { readonly kind: 'team' }

/** Lo que el rótulo dice además, como mucho BROADCAST.cardLinesMax, en este orden (§7.2). Cada una con su procedencia. */
export type Distinction =
  /** lidera sin llevarlo: `Also leads the mountains` (pantalla) */
  | { readonly kind: 'leads'; readonly jersey: JerseyKind; readonly from: StageRef }
  /** lo lleva delegado: `Points jersey (2nd in the classification)` */
  | {
      readonly kind: 'wears_for'
      readonly jersey: JerseyKind
      readonly rank: number
      readonly from: StageRef
    }
  /** un título que no lleva puesto */
  | { readonly kind: 'champion'; readonly title: ChampionTitle }
  /** puesto de salida ≤ BROADCAST.gcLineTop y no líder: `14th overall +4:02` */
  | {
      readonly kind: 'gc'
      readonly rank: number
      readonly deficitS: number
      readonly from: StageRef
    }
  /** etapas ganadas en ESTA carrera hasta la N−1 */
  | { readonly kind: 'stage_wins'; readonly stages: readonly StageRef[] }

/** La entrada de wornJerseys: todo de SALIDA, es decir, de tras la N−1. */
export interface WornInput {
  /** etapa 1 de vuelta o carrera de un día: nadie lleva maillot de líder (UCI 2.6.018; hoy NO_LEADERS) */
  readonly firstDay: boolean
  /** 'itt' si la etapa es crono (input.timeTrial) */
  readonly discipline: 'road' | 'itt'
  /** la de la carrera (championshipCategory ?? 'elite') */
  readonly category: 'elite' | 'u23'
  /** general, puntos y montaña de salida, como las arma buildTimelineCast (7-b) */
  readonly standings: JerseyInput
  /** la N−1; null el primer día */
  readonly standingsFrom: StageRef | null
  /** riderId → títulos vigentes el día de la etapa */
  readonly titles: ReadonlyMap<string, readonly ChampionTitle[]>
}

/** El orden de la frase del comentarista, de menor a mayor (D-26, §7.5): 0 lleva el maillot de la general … 8 el resto. */
export type NotorietyLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

/** EL RÓTULO SERVIDO, ya pasado por el velo del espectador (D-15, B13). Se deriva al servir la cabecera de CastRider y los nombres. */
export interface RiderCard {
  readonly ix: RiderIx
  /** riderId */
  readonly id: string
  /** riders.name, resuelto al leer */
  readonly name: string
  readonly bib: number | null
  /** ISO-2 en mayúsculas */
  readonly country: string
  /** CastRider.gender: la concordancia de E10 se hace en la web, que recibe esto y no el reparto (D-62) */
  readonly gender: 'M' | 'F'
  /** el equipo CON EL QUE CORRIÓ y su equipación de ese día; el nombre, el de hoy (NameResolver.team al servir) */
  readonly team: { readonly id: string; readonly name: string; readonly jerseySeed: string } | null
  /** degradado: un `leader` cuyo `from` está velado pasa a { kind: 'team' } */
  readonly worn: WornJersey
  /** como mucho cardLinesMax; sin las de `from` velado */
  readonly lines: readonly Distinction[]
  /** staticNotoriety (§7.5) al servir, tras el velo y el corte; notorietyOf la ajusta durante la carrera */
  readonly notoriety: NotorietyLevel
  /** del espectador o de su equipo (R23.7) */
  readonly own: boolean
}
