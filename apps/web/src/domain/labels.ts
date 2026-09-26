/**
 * Traducción del vocabulario de dominio (interno, en español) a la UI (en inglés).
 *
 * ÚNICO lugar donde vive este diccionario. Antes estaba duplicado y divergente en varios clientes
 * de api/ (roles en `lastRace` y `market` con claves distintas, mentalidades en `lastRace` y en la
 * página de órdenes, tipos de apunte en `finances` y en `rankings`), con el riesgo de que una
 * página tradujera y otra mostrara la clave interna en crudo.
 */

import type {
  Effort,
  Mentality,
  RaceClass,
  RaceFormat,
  RaceRouteSource,
  RouteSource,
  StageRole,
} from '@cyclingstar/shared'

/**
 * Roles: cubre tanto los del CONTRATO (líder, colíder, gregario, libre) como los de la ORDEN de
 * etapa (sprinter, lanzador, cazaetapas, marcador). Antes el mercado no traducía estos últimos.
 */
const ROLE_LABEL: Record<string, string> = {
  lider: 'Leader',
  colider: 'Co-leader',
  gregario: 'Domestique',
  libre: 'Free role',
  lanzador: 'Lead-out',
  sprinter: 'Sprinter',
  cazaetapas: 'Break hunter',
  marcador: 'Marker',
}

/** Nombre visible de un rol; si es desconocido se muestra tal cual (nunca se oculta el dato). */
export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role
}

/** Etiqueta de la mentalidad como opción de formulario (capitalizada). */
export const MENTALITY_LABEL: Record<Mentality, string> = {
  reservon: 'Conservative',
  oportunista: 'Opportunist',
  combativo: 'Aggressive',
  supercombativo: 'Super-aggressive',
}

/** Misma mentalidad dentro de una frase ("you rode conservative…"): en minúscula. */
const MENTALITY_INLINE: Record<string, string> = {
  reservon: 'conservative',
  oportunista: 'opportunistic',
  combativo: 'aggressive',
  supercombativo: 'all-out aggressive',
}

export function mentalityLabel(mentality: string): string {
  return MENTALITY_INLINE[mentality] ?? mentality
}

/** Qué hace cada mentalidad (ayuda de la consola de órdenes). */
export const MENTALITY_DESC: Record<Mentality, string> = {
  reservon: 'Conservative — saves energy and only reacts.',
  oportunista: 'Opportunist — takes a good chance when it appears.',
  combativo: 'Aggressive — attacks and forces the race.',
  supercombativo: 'Super-aggressive — attacks early and often (burns through energy).',
}

/** Orden en el que se ofrecen las mentalidades en la consola de órdenes. */
export const MENTALITY_OPTIONS: Mentality[] = [
  'reservon',
  'oportunista',
  'combativo',
  'supercombativo',
]

/** Orden en el que se ofrecen los roles de etapa (el rol libre primero, es el valor por defecto). */
export const STAGE_ROLE_OPTIONS: StageRole[] = [
  'libre',
  'lider',
  'sprinter',
  'lanzador',
  'gregario',
  'cazaetapas',
  'marcador',
]

/** Etiqueta y descripción de cada rol de etapa (consola de órdenes). */
export const STAGE_ROLE_LABEL: Record<StageRole, string> = {
  libre: 'Free',
  lider: 'Leader',
  sprinter: 'Sprinter',
  lanzador: 'Lead-out',
  gregario: 'Domestique',
  cazaetapas: 'Stage hunter',
  marcador: 'Marker',
}

export const STAGE_ROLE_DESC: Record<StageRole, string> = {
  libre: 'Rides on instinct with no special job — a free role.',
  lider: 'Your protected leader: teammates shelter and pace them, saving them for the finish.',
  sprinter: 'Sits in for the finish and contests a bunch sprint.',
  lanzador: 'Lead-out: delivers a teammate to the sprint at top speed, then swings off.',
  gregario: 'Domestique: works for a teammate — shelters them, sets the pace, fetches bottles.',
  cazaetapas: 'Stage hunter: gets in the breakaway to fight for the stage win.',
  marcador: "Marker: shadows a RIVAL and follows their attacks so they can't get away.",
}

/**
 * DE QUÉ VA CADA ETAPA, en una palabra (v58). El motor las llama por su tipo (`llana`, `media`,
 * `reina`, `cri`, `clasica`) y la pantalla de órdenes lo enseñaba solo dibujado en el perfil: la
 * decisión que se toma ahí —qué rol le doy hoy— depende justamente de esto.
 */
export const STAGE_KIND_LABEL: Record<string, string> = {
  llana: 'Flat',
  media: 'Hilly',
  reina: 'Mountain',
  cri: 'Time trial',
  clasica: 'Classic',
}

export const EFFORT_OPTIONS: Effort[] = ['ahorrar', 'normal', 'a_tope']

export const EFFORT_LABEL: Record<Effort, string> = {
  ahorrar: 'Save',
  normal: 'Normal',
  a_tope: 'All-in',
}

export const EFFORT_DESC: Record<Effort, string> = {
  ahorrar: 'Save — ride within yourself to keep energy for later.',
  normal: 'Normal — a balanced effort for the day.',
  a_tope: 'All-in — empty the tank today.',
}

/** Tipos de apunte del libro de cuentas del corredor (SPEC 9). */
const LEDGER_KIND_LABEL: Record<string, string> = {
  salario: 'Salary',
  premio: 'Prize',
  staff: 'Staff',
  patrocinador: 'Sponsor',
  viaje: 'Travel',
  vivienda: 'Housing',
  otro: 'Other',
}

export function ledgerKindLabel(kind: string): string {
  return LEDGER_KIND_LABEL[kind] ?? kind
}

/** Tipos de entrada del palmarés. */
const PALMARES_KIND_LABEL: Record<string, string> = {
  gc: 'Overall win',
  stage: 'Stage win',
  kom: 'Mountains classification',
  points: 'Points classification',
}

export function palmaresLabel(kind: string): string {
  return PALMARES_KIND_LABEL[kind] ?? kind
}

/**
 * Familia del titular del feed, para la etiqueta de la izquierda: una palabra, sin iconos. El feed
 * pide un diseño sobrio con jerarquía tipográfica (docs/navegacion.md §3.5), y una fila de emojis
 * ni se puede leer en voz alta ni distingue un triunfo de etapa de uno de la general.
 */
const NEWS_KIND_LABEL: Record<string, string> = {
  stage_win: 'Stage',
  tt_win: 'Time trial',
  breakaway_win: 'Breakaway',
  one_day_win: 'Classic',
  one_day_tt_win: 'Time trial',
  kom: 'Mountains',
  gc_win: 'Overall',
  contract: 'Transfer',
  injury: 'Injury',
  // Abandonar una carrera es su propio tipo de noticia: no es una lesión (se abandona también por
  // colapso, por enfermedad, por el corte de tiempo o porque el jugador lo decide) — docs/motor.md §VI.3.
  abandon: 'Abandon',
  retirement: 'Retirement',
}

export function newsLabel(kind: string): string {
  return NEWS_KIND_LABEL[kind] ?? 'News'
}

/** Clase de la carrera tal como se escribe en el ciclismo real (.WT, .Pro, .1…). */
const RACE_CLASS_LABEL: Record<RaceClass, string> = {
  WT: '.WT',
  Pro: '.Pro',
  '1': '.1',
  '2': '.2',
  NC: '.NC',
}

export function raceClassLabel(cls: RaceClass): string {
  return RACE_CLASS_LABEL[cls] ?? cls
}

const FORMAT_LABEL: Record<RaceFormat, string> = {
  'gran-vuelta': 'Grand tour',
  'una-semana': 'Stage race',
  'un-dia': 'One-day',
}

export function formatLabel(format: RaceFormat): string {
  return FORMAT_LABEL[format]
}

/**
 * DE DÓNDE SALE EL RECORRIDO DE UNA ETAPA (docs/generador.md §11.4, decisión 39). Los tres textos
 * del documento, en inglés: lo real manda y se distingue hasta la pantalla, y la marca verde tiene
 * que significar algo, así que una etapa con ciudades y km reales pero relieve generado no se llama
 * real.
 */
export const ROUTE_SOURCE_LABEL: Record<RouteSource, string> = {
  real: 'Real route (source cited)',
  edicion: 'Real towns and distance, generated terrain',
  generado: 'Generated route',
}

/**
 * La marca de una CARRERA, agregada de sus etapas (§11.4). Una carrera `mixto` con alguna etapa real
 * dice cuántas; una sin ninguna real (todas de ciudades y distancia reales) lo dice con la marca de
 * esas etapas, porque «0 of 5 stages real» no le cuenta nada al jugador.
 */
export function raceRouteSourceLabel(
  source: RaceRouteSource,
  stages: readonly { routeSource: RouteSource }[],
): string {
  if (source === 'real') return ROUTE_SOURCE_LABEL.real
  if (source === 'generado') return ROUTE_SOURCE_LABEL.generado
  const reales = stages.filter((s) => s.routeSource === 'real').length
  if (reales === 0) return ROUTE_SOURCE_LABEL.edicion
  return `Partly real route: ${reales} of ${stages.length} stages`
}

/** «Edition N»: la edición de la carrera en este mundo (su temporada + 1). */
export function editionLabel(edicion: number): string {
  return `Edition ${edicion}`
}

/**
 * EL EQUIPO DE UN CORREDOR EN UNA CARRERA, incluido el que no tiene ninguno.
 *
 * Las carreras continentales se completan con «relleno regional»: corredores individuales del
 * continente que entran sin equipo comercial, el equivalente a las selecciones y equipos club de
 * relleno de esas pruebas (`packages/db/src/calendarRun.ts`). Son el 3,6 % de los resultados del
 * mundo —90 corredores, en bloques de hasta 12 por carrera—, y hasta ahora salían con el hueco del
 * equipo VACÍO: sin paréntesis en el journal y con la columna en blanco en las tablas, que el
 * jugador lee como un fallo y no como lo que es.
 *
 * «Individual» es lo que pone una hoja de resultados de verdad para el corredor sin equipo. NO es
 * lo mismo que el «Free agent» de la ficha del corredor, que responde a otra pregunta —su situación
 * contractual, no cómo figura en esta carrera— y por eso se queda donde está.
 *
 * Y no vale para las frases de EQUIPO de la crónica: «Individual se pone a tirar» no significa nada,
 * porque esos corredores no son un equipo. De eso se encarga `teamsOf`, que sigue descartando a
 * quien no tiene equipo antes de nombrar a nadie.
 */
export const NO_TEAM_LABEL = 'Individual'

/** El nombre del equipo de un corredor tal como se muestra en una carrera. */
export function raceTeamLabel(teamName: string | null | undefined): string {
  return teamName || NO_TEAM_LABEL
}

// --- Las cuatro palancas del paso 17a ----------------------------------------------------------

/**
 * A QUÉ SALE HOY ESTE HOMBRE (R22 · S-216, S-024, S-030). Declara, no negocia: el jugador dice a qué
 * va y el resto del plan se ordena alrededor. `null` = sin preferencia, y decide el motor.
 */
export const DAY_GOAL_OPTIONS = [
  'ganar',
  'general',
  'puntos',
  'montana',
  'grupeto',
  'ahorrar',
  'servir',
] as const
export type DayGoalUi = (typeof DAY_GOAL_OPTIONS)[number]

export const DAY_GOAL_LABEL: Record<DayGoalUi, string> = {
  ganar: 'Win the stage',
  general: 'Defend my GC place',
  puntos: 'Points jersey',
  montana: 'Mountains jersey',
  grupeto: 'Ride in the grupetto',
  ahorrar: 'Save myself for later',
  servir: 'Work for someone else',
}

export const DAY_GOAL_DESC: Record<DayGoalUi, string> = {
  ganar: 'Everything is spent on today. No saving for tomorrow.',
  general: 'Mark the riders near you on time and stay out of trouble.',
  puntos: 'Contest the intermediate sprints and the finish.',
  montana: 'Contest the climbs, even from a breakaway.',
  grupeto: 'Sit up and finish inside the time limit with the others.',
  ahorrar: 'Ride as easy as the race allows. Tomorrow matters more.',
  servir: 'No ambition of your own today.',
}

/** QUÉ HACE TU EQUIPO CON UNA FUGA (R22 · S-215, S-071). */
export const CHASE_POLICY_OPTIONS = ['nunca', 'si_amenaza', 'siempre'] as const
export type ChasePolicyUi = (typeof CHASE_POLICY_OPTIONS)[number]

export const CHASE_POLICY_LABEL: Record<ChasePolicyUi, string> = {
  nunca: 'Never chase',
  si_amenaza: 'Chase if it threatens us',
  siempre: 'Always chase',
}

export const CHASE_POLICY_DESC: Record<ChasePolicyUi, string> = {
  nunca: 'Let it go. Someone else can do the work.',
  si_amenaza: 'Only pull when the break carries a real danger.',
  siempre: 'Pull regardless of who is up the road.',
}

/**
 * CUÁNDO LANZA SU MOVIMIENTO (R22 · S-214/S-321/S-322). Seis formas de decir «cuándo», y **cinco
 * dependen de lo que pase en la carretera** — que es toda la diferencia entre una cita y un
 * despertador. El kilómetro sigue estando porque a veces es lo que el jugador quiere decir, y
 * porque las hojas guardadas antes de este paso lo usan.
 */
export const TRIGGER_KIND_OPTIONS = ['ninguno', 'km', 'climb', 'gap', 'weather', 'sector'] as const
export type TriggerKindUi = (typeof TRIGGER_KIND_OPTIONS)[number]

export const TRIGGER_KIND_LABEL: Record<TriggerKindUi, string> = {
  ninguno: 'Let my mentality decide',
  km: 'At a kilometre',
  climb: 'On a climb',
  gap: 'When the gap reaches',
  weather: 'If the weather turns',
  sector: 'On a cobbled sector',
}

export const CLIMB_WHICH_LABEL = { last: 'the last climb', penultimate: 'the second-to-last climb' }
export const CLIMB_PART_LABEL = {
  pie: 'at the foot',
  duro: 'on the steepest part',
  cima: 'near the top',
}
export const WEATHER_COND_LABEL = { lluvia: 'it rains', viento: 'the wind picks up' }
