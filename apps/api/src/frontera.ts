/**
 * LA FRONTERA (E3, docs/visual.md §13; D-53, D-54, D-55; PR 19a). Toda respuesta de la API es un
 * subconjunto de lo que una pantalla enseña a quien la pide, en su forma de pantalla: un número interno no
 * cruza nunca, y lo que cruza, alguien lo lee en la web. `frontera.test.ts` recorre los esquemas de
 * respuesta del registro hoja por hoja y lo comprueba; lo que hoy no cumple va aquí, con su motivo y su PR
 * de salida, y la lista solo encoge.
 */

/** Los nombres de los números internos: una hoja que se llama así no cruza (§13.2, punto 3). */
export const INTERNAL_NUMBER_NAMES = [
  'ctl',
  'atl',
  'tsb',
  'tss',
  'ceiling',
  'talent',
  'fragility',
] as const

/** Lo que una hoja de una respuesta rompe de la regla. */
export type FronteraBreak =
  /** nadie la lee en `apps/web/src` */
  | 'sin_lector'
  /** se llama como un número interno */
  | 'numero_interno'
  /** cruza con más resolución de la que enseña la pantalla: un `attributes` de números */
  | 'resolucion'

/**
 * Una excepción: las rutas, las hojas (con `[]` por cada array y `.*` por cada registro) y lo que rompen,
 * con su porqué y el PR que la quita. Una fila de la tabla de §13.2 es una excepción, aunque nombre varias
 * rutas o varias hojas.
 */
export interface FronteraException {
  readonly routes: readonly [string, ...string[]]
  readonly fields: readonly [string, ...string[]]
  readonly breaks: FronteraBreak
  readonly why: string
  readonly until: '19b' | '19c'
}

/** Solo encoge: añadir una entrada pide subir el tope, y eso se revisa en el PR (13-e). */
export const FRONTERA_SIN_USO_MAX = 22

/** Las rutas de la etapa que llevan los títulos de campeón y la clasificación por equipos. */
const ETAPA = 'GET /api/races/:raceId/stages/:day'
const META = 'POST /api/races/:raceId/stages/:day/broadcast/finish'
const ACTA = 'GET /api/races/:raceId/stages/:day/report'
const CABECERA = 'GET /api/races/:raceId/stages/:day/broadcast'

/**
 * La tabla de §13.2, el día que entra el 19a (con lo de la vista previa ya fuera en el 13b, §11.2), y lo
 * que el test encontró además al entrar, con su salida en el 19c (§13.2: «el 19a los añade con su motivo
 * y su salida, y sube FRONTERA_SIN_USO_MAX una vez»). Los campos van con `[]` por cada array, `*` por un
 * tramo cualquiera y `**` por los que sean.
 */
export const FRONTERA_SIN_USO: readonly FronteraException[] = [
  // --- las nueve de §13.2
  {
    routes: ['GET /api/riders/me/form'],
    fields: ['log[].ctl', 'log[].tsb'],
    breaks: 'numero_interno',
    why: 'las lee conditionBars en la web para sus dos barras (condition.ts)',
    until: '19b',
  },
  {
    routes: ['GET /api/riders/me/form'],
    fields: ['log[].atl', 'log[].tss'],
    breaks: 'numero_interno',
    why: 'la atl no la lee nadie; la tss la pinta el diario de carrera (RaceEffortLog, «TSS 105»)',
    until: '19b',
  },
  {
    routes: ['GET /api/riders/me'],
    fields: ['rider.attributes.*'],
    breaks: 'resolucion',
    why: 'con decimales; la web pinta estrellas, marca y cerillos',
    until: '19b',
  },
  {
    routes: ['GET /api/riders/:id'],
    fields: ['rider.attributes.*'],
    breaks: 'resolucion',
    why: 'con decimales, de cualquier corredor; la web pinta estrellas',
    until: '19b',
  },
  {
    routes: ['GET /api/riders/me/trend'],
    fields: ['trend[].delta28'],
    breaks: 'resolucion',
    why: 'la web pinta la flecha',
    until: '19b',
  },
  {
    routes: ['GET /api/riders/me/summary'],
    fields: ['summary.morale'],
    breaks: 'resolucion',
    why: 'con decimales; la web pinta el porcentaje',
    until: '19b',
  },
  {
    routes: ['GET /api/riders/me/coach-view'],
    fields: ['coachView.facilities'],
    breaks: 'sin_lector',
    why: 'no se pinta; season tampoco, pero la comprobación por nombre la da por leída (sale también en el 19c)',
    until: '19c',
  },
  {
    routes: [
      'GET /api/riders/me/summary',
      'GET /api/riders/:id',
      'GET /api/countries/:code',
      'GET /api/free-agents',
    ],
    fields: ['**.fame'],
    breaks: 'sin_lector',
    why: 'vale siempre 0: la columna no se escribe (schema.ts)',
    until: '19c',
  },
  {
    routes: ['GET /api/riders/me/plan'],
    fields: ['plan.goalRaceId'],
    breaks: 'sin_lector',
    why: 'el objetivo D1 no tiene control',
    until: '19c',
  },
  // --- lo que el test encontró al entrar, sin lector en la web (19c)
  {
    routes: ['GET /api/names/generate'],
    fields: ['firstName', 'surname'],
    breaks: 'sin_lector',
    why: 'la web pinta fullName',
    until: '19c',
  },
  {
    routes: ['GET /api/riders/me'],
    fields: ['rider.birthSeason'],
    breaks: 'sin_lector',
    why: 'no se lee: la edad que pinta la ficha llega ya hecha, en age, con la ficha pública',
    until: '19c',
  },
  {
    routes: ['GET /api/riders/me/last-race'],
    fields: ['report.bonusS'],
    breaks: 'sin_lector',
    why: 'la bonificación no se pinta',
    until: '19c',
  },
  {
    routes: ['GET /api/riders/me/report'],
    fields: ['report.fromDay', 'report.toDay'],
    breaks: 'sin_lector',
    why: 'el informe del bloque no pinta sus días',
    until: '19c',
  },
  {
    routes: ['POST /api/riders/me/races/:raceKey/retire'],
    fields: ['alreadyOut'],
    breaks: 'sin_lector',
    why: 'la web no distingue si ya estaba fuera',
    until: '19c',
  },
  {
    routes: ['GET /api/riders/:id', ETAPA, CABECERA, META, ACTA, 'GET /api/calendar/:raceId'],
    fields: ['**.validToDay', '**.provisional'],
    breaks: 'sin_lector',
    why: 'el título de campeón se pinta por su ámbito y su país, no hasta cuándo vale ni si es provisional',
    until: '19c',
  },
  {
    routes: ['GET /api/teams/:id/news', 'GET /api/news', META],
    fields: [
      'news[].payload.prevHealth',
      'news[].payload.prevUntilDay',
      'news[].payload.fromTeamId',
    ],
    breaks: 'sin_lector',
    why: 'el texto de la noticia (newsText, packages/shared/src/news.ts) no los usa',
    until: '19c',
  },
  {
    routes: ['GET /api/my-orders'],
    fields: ['orders[].triggerOn.byRiderId'],
    breaks: 'sin_lector',
    why: 'la orden se pinta sin el corredor que la dispara',
    until: '19c',
  },
  {
    routes: [ETAPA, META, ACTA, 'GET /api/calendar/:raceId'],
    fields: ['**.sumaPuestos'],
    breaks: 'sin_lector',
    why: 'la clasificación por equipos pinta el puesto y el tiempo, no la suma con que se desempata',
    until: '19c',
  },
  {
    routes: [CABECERA],
    fields: ['weather.spans[].windDir', 'preview.weather.spans[].windDir'],
    breaks: 'sin_lector',
    why: 'el viento se pinta con su fuerza y si es de costado, no con su dirección',
    until: '19c',
  },
  {
    routes: [CABECERA],
    fields: ['startState.racingAtStart'],
    breaks: 'sin_lector',
    why: 'no se pinta',
    until: '19c',
  },
  {
    routes: ['GET /api/me/horizon'],
    fields: ['ready[].expiresOnDay'],
    breaks: 'sin_lector',
    why: 'no se pinta',
    until: '19c',
  },
  {
    routes: ['GET /api/calendar/:raceId'],
    fields: ['stages[].arch.geo'],
    breaks: 'sin_lector',
    why: 'no se pinta',
    until: '19c',
  },
]

/**
 * Si una hoja casa con el campo de una excepción: `*` casa con un tramo cualquiera y `**` con los que sean.
 * Lo usan `frontera.test.ts` y el canario (`spoilerCanary.test.ts`).
 */
export function fieldMatches(field: string, pattern: string): boolean {
  const a = field.split('.')
  const b = pattern.split('.')
  const desde = (i: number, j: number): boolean => {
    if (j === b.length) return i === a.length
    if (b[j] === '**') return desde(i, j + 1) || (i < a.length && desde(i + 1, j))
    return i < a.length && (b[j] === '*' || b[j] === a[i]) && desde(i + 1, j + 1)
  }
  return desde(0, 0)
}

/** Si `FRONTERA_SIN_USO` todavía deja pasar esa hoja en esa ruta. */
export const excused = (route: string, field: string): boolean =>
  FRONTERA_SIN_USO.some(
    (x) => x.routes.includes(route) && x.fields.some((p) => fieldMatches(field, p)),
  )
