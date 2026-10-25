import type { Page } from '@playwright/test'

/**
 * LAS 46 PANTALLAS DE LA PRUEBA DEL TELÉFONO (E3, docs/visual.md §7.3; PR 2b, O-27). Una por cada fila con
 * medidas del mapa 05 (`docs/diseno/e3-visual/capturas/README.md`, de la 01 a la 37 y de la 40 a la 47) y
 * la 38, la contrarreloj, que no tiene captura (Ruso-018; 7-i). Cada una dice su ruta, la cuenta que la
 * abre, el `data-ui` del elemento que contesta la pantalla (`data-answer`, la comprobación 7), si es una
 * herramienta (la 9) y, si la tiene, su edición (la 8).
 *
 * El `data-answer` es de §7.3: dice qué contesta cada pantalla, y lo pone la sección que la rediseña. Hoy
 * no lo lleva ninguna, así que la 7 falla en todas, y la línea base lo apunta.
 */

export type CuentaDePrueba = 'jugador' | 'manager' | 'visitante' | 'nuevo'

/** `cuentas.json` del mundo, más los dos ids que la prueba resuelve al empezar. */
export interface MundoDePrueba {
  readonly day: number
  readonly password: string
  readonly accounts: Readonly<Record<CuentaDePrueba, { readonly email: string | null }>>
  /** el primer equipo WorldTour de `GET /api/teams` */
  readonly firstWorldTourTeamId: string
  /** el primero de `GET /api/rankings` */
  readonly topRankedRiderId: string
  /** la primera contrarreloj corrida, de `cuentas.json` (§7.2) */
  readonly firstTimeTrialStage: { readonly race: string; readonly stage: number }
}

export interface TelefonoPantalla {
  /** el de la captura: `01-me-training` */
  readonly id: string
  readonly path: string | ((world: MundoDePrueba) => string)
  readonly account: CuentaDePrueba
  /** el `data-ui` del elemento con `data-answer` */
  readonly answer: string
  /** corre la comprobación 9 */
  readonly tool: boolean
  /** deja cambios sin guardar; sin ella, la 8 no corre */
  readonly edit?: (page: Page) => Promise<void>
  /** los estados 40 a 42: una ruta de la API que no contesta o que contesta 500 */
  readonly intercept?: { readonly url: string; readonly respond: 'hang' | 500 }
  /** lo que se hace antes de medir: la 09 y la 38, `Play`, un salto de la hoja `⋯` y `Pause` (7-j) */
  readonly prepare?: (page: Page) => Promise<void>
  /** espera antes de medir, en vez de esperar a que la página acabe de cargar: la 40, 3.000 */
  readonly waitMs?: number
}

/** La etapa en línea de `Watch` del mapa 05: las pantallas 08, 09, 10 y 36. */
const ETAPA = '/world/races/race-valencia/stages/3'

/**
 * `Play`, un salto de la hoja `⋯` y `Pause` (7-j): la pantalla se mide en pausa, siempre en el mismo
 * sitio de la carrera, y no tras unos segundos de reloj, que en un ejecutor más o menos cargado no dan
 * siempre la misma pantalla (Ruso-019).
 */
const saltaYPara =
  (salto: string) =>
  async (page: Page): Promise<void> => {
    await page.getByRole('button', { name: 'Play', exact: true }).first().click()
    await page.getByRole('button', { name: 'More', exact: true }).first().click()
    await page.getByRole('button', { name: salto, exact: true }).first().click()
    await page.getByRole('button', { name: 'Pause', exact: true }).first().click()
  }

/** La 25: otro papel en la primera etapa de las órdenes, sin guardar. */
async function cambiaElPapel(page: Page): Promise<void> {
  const papel = page.locator('select[id^="role-"]').first()
  const actual = await papel.inputValue()
  const otro = await papel
    .locator('option')
    .evaluateAll(
      (opciones, valor) =>
        opciones.map((o) => (o as HTMLOptionElement).value).find((v) => v !== valor) ?? null,
      actual,
    )
  if (otro === null) throw new Error('la 25 no tiene otro papel que elegir')
  await papel.selectOption(otro)
}

export const TELEFONO_PANTALLAS: readonly TelefonoPantalla[] = [
  { id: '01-me-training', path: '/me/training', account: 'jugador', answer: 'Panel', tool: true },
  { id: '02-me-races', path: '/me/races', account: 'jugador', answer: 'Panel', tool: true },
  {
    id: '03-me-races-enter',
    path: '/me/races?tab=enter',
    account: 'jugador',
    answer: 'Panel',
    tool: true,
  },
  { id: '04-me-profile', path: '/me/profile', account: 'jugador', answer: 'Panel', tool: false },
  {
    id: '05-race-vuelta',
    path: '/world/races/race-valencia',
    account: 'visitante',
    answer: 'RankTable',
    tool: false,
  },
  {
    id: '06-race-vuelta-teams',
    path: '/world/races/race-valencia?tab=classifications&cls=teams',
    account: 'visitante',
    answer: 'RankTable',
    tool: false,
  },
  {
    id: '07-race-en-curso',
    path: '/world/races/race-emirates',
    account: 'visitante',
    answer: 'RankTable',
    tool: false,
  },
  { id: '08-stage-watch', path: ETAPA, account: 'visitante', answer: 'FixedOverlay', tool: false },
  {
    id: '09-stage-watch-jugando',
    path: ETAPA,
    account: 'visitante',
    answer: 'FixedOverlay',
    tool: false,
    prepare: saltaYPara('+5 km'),
  },
  {
    id: '10-stage-report',
    path: `${ETAPA}/report`,
    account: 'visitante',
    answer: 'RankTable',
    tool: false,
  },
  {
    id: '11-world-rankings',
    path: '/world/rankings',
    account: 'visitante',
    answer: 'RankTable',
    tool: false,
  },
  {
    id: '12-world-team',
    path: (w) => `/world/teams/${w.firstWorldTourTeamId}`,
    account: 'visitante',
    answer: 'RankTable',
    tool: false,
  },
  {
    id: '13-world-rider',
    path: (w) => `/world/riders/${w.topRankedRiderId}`,
    account: 'visitante',
    answer: 'Panel',
    tool: false,
  },
  {
    id: '14-team-squad',
    path: '/team/squad',
    account: 'manager',
    answer: 'RankTable',
    tool: false,
  },
  {
    id: '15-team-calendar',
    path: '/team/calendar',
    account: 'manager',
    answer: 'Panel',
    tool: true,
  },
  // La 16 gana su edición (cambiar el color de base) con el editor, en el 18b.
  {
    id: '16-team-identity',
    path: '/team/identity',
    account: 'manager',
    answer: 'KitPicker',
    tool: true,
  },
  { id: '17-home-jugador', path: '/', account: 'jugador', answer: 'Panel', tool: false },
  { id: '18-home-visitante', path: '/', account: 'visitante', answer: 'Panel', tool: false },
  { id: '19-news', path: '/news', account: 'visitante', answer: 'Panel', tool: false },
  {
    id: '20-world-races',
    path: '/world/races',
    account: 'visitante',
    answer: 'Panel',
    tool: false,
  },
  {
    id: '21-world-teams',
    path: '/world/teams',
    account: 'visitante',
    answer: 'Panel',
    tool: false,
  },
  {
    id: '22-world-nations',
    path: '/world/nations',
    account: 'visitante',
    answer: 'Panel',
    tool: false,
  },
  {
    id: '23-world-nation',
    path: '/world/nations/ES',
    account: 'visitante',
    answer: 'RankTable',
    tool: false,
  },
  {
    id: '24-hall-of-fame',
    path: '/world/hall-of-fame',
    account: 'visitante',
    answer: 'RankTable',
    tool: false,
  },
  {
    id: '25-me-orders',
    path: '/me/orders',
    account: 'jugador',
    answer: 'Panel',
    tool: true,
    edit: cambiaElPapel,
  },
  { id: '26-me-contract', path: '/me/contract', account: 'jugador', answer: 'Panel', tool: true },
  { id: '27-me-finances', path: '/me/finances', account: 'jugador', answer: 'Stat', tool: false },
  { id: '28-account', path: '/account', account: 'jugador', answer: 'Panel', tool: true },
  // La 01 y la 29 ganan su edición (cambiar el bloque de la semana 1) con el cuadro de §10, en el 14.
  {
    id: '29-me-training-manager',
    path: '/me/training',
    account: 'manager',
    answer: 'Panel',
    tool: true,
  },
  { id: '30-home-manager', path: '/', account: 'manager', answer: 'Panel', tool: false },
  { id: '31-login', path: '/login', account: 'visitante', answer: 'Panel', tool: true },
  { id: '32-register', path: '/register', account: 'visitante', answer: 'Panel', tool: true },
  {
    id: '33-how-to-play',
    path: '/how-to-play',
    account: 'visitante',
    answer: 'Panel',
    tool: false,
  },
  { id: '34-create', path: '/create', account: 'nuevo', answer: 'Panel', tool: true },
  {
    id: '35-race-un-dia',
    path: '/world/races/race-jaen',
    account: 'visitante',
    answer: 'FixedOverlay',
    tool: false,
  },
  {
    id: '36-stage-classifications',
    path: `${ETAPA}?tab=classifications`,
    account: 'visitante',
    answer: 'RankTable',
    tool: false,
  },
  {
    id: '37-me-races-results',
    path: '/me/races?tab=results',
    account: 'jugador',
    answer: 'RankTable',
    tool: false,
  },
  // La 38 salta a `Last starter` y no a `+10 min` (7-j): en la primera crono del mundo, la de Australia
  // (39 km), los diez minutos caen antes del primer parcial y `TimeTrialBoard` no pinta ni su segundo
  // botón ni filas, que son lo que la pantalla mira (Ruso-018); y el salto de diez minutos es relativo a
  // la hora, que corre entre clic y clic (0:11:02 en una carga, 0:12:28 en otra). `Last starter` es fijo.
  {
    id: '38-stage-crono',
    path: (w) => `/world/races/${w.firstTimeTrialStage.race}/stages/${w.firstTimeTrialStage.stage}`,
    account: 'visitante',
    answer: 'FixedOverlay',
    tool: false,
    prepare: saltaYPara('Last starter'),
  },
  // Los estados.
  {
    id: '40-cargando',
    path: '/me/training',
    account: 'jugador',
    answer: 'Skeleton',
    tool: true,
    intercept: { url: '**/api/riders/me/orders**', respond: 'hang' },
    waitMs: 3000,
  },
  {
    id: '41-error',
    path: '/me/training',
    account: 'jugador',
    answer: 'ErrorState',
    tool: true,
    intercept: { url: '**/api/riders/me/orders**', respond: 500 },
  },
  {
    id: '42-error-todo',
    path: '/world/rankings',
    account: 'visitante',
    answer: 'ErrorState',
    tool: false,
    intercept: { url: '**/api/**', respond: 500 },
  },
  {
    id: '43-vacio-team-squad',
    path: '/team/squad',
    account: 'jugador',
    answer: 'EmptyState',
    tool: false,
  },
  {
    id: '44-vacio-home-sin-corredor',
    path: '/',
    account: 'nuevo',
    answer: 'EmptyState',
    tool: false,
  },
  {
    id: '45-vacio-training-sin-corredor',
    path: '/me/training',
    account: 'nuevo',
    answer: 'EmptyState',
    tool: true,
  },
  {
    id: '46-no-encontrada',
    path: '/ruta-que-no-existe',
    account: 'visitante',
    answer: 'ErrorState',
    tool: false,
  },
  {
    id: '47-corredor-inexistente',
    path: '/world/riders/00000000-0000-4000-8000-000000000000',
    account: 'visitante',
    answer: 'ErrorState',
    tool: false,
  },
]

/** La ruta de una pantalla en este mundo. */
export const rutaDe = (p: TelefonoPantalla, world: MundoDePrueba): string =>
  typeof p.path === 'string' ? p.path : p.path(world)
