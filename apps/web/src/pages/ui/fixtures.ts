import type { ChampionTitle, JerseyKind } from '@cyclingstar/shared'
import { ApiError } from '../../api/request'
import type { QueryViewProps } from '../../components/ui/QueryView'
import type { LegacyTeam } from '../../components/ui/RiderLabel'

/**
 * LOS DATOS FIJOS DE `/_ui` (E3, docs/visual.md §5.4; PR 9a, D-10): los casos difíciles, medidos, para
 * que cada estado se vea en lo peor que le va a tocar y sin llamar a la API. El 9b añade los suyos (el
 * nombre de corredor más largo del mundo de prueba, 28 caracteres; el título más largo, de 59; la
 * clasificación de 140 filas con la fila propia en el puesto 34) y el 10, una consulta en cada uno de
 * sus seis estados.
 */

/** Una consecuencia de la `ActionBar` que a 320 px pide tres renglones y corta en dos (§4.3). */
export const LONG_CONSEQUENCE =
  'Race Sardegna: Fine (was Loaded) · Race Var: Spot on (was Fine) · 2 travel days (1 out, 1 back)'

/** La de cada día: `Race Var: Fine (was Loaded)`. */
export const SHORT_CONSEQUENCE = 'Race Var: Fine (was Loaded)'

/** Lo que se vio por última vez, para `OfflineBanner`: las 14:02 en la hora de la prueba (Madrid). */
export const SEEN_AT = Date.UTC(2026, 9, 25, 13, 2)

/** Muchas pestañas: el carril se desplaza y se desvanece por la derecha (§4.4). */
export const MANY_TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'training', label: 'Training' },
  { key: 'orders', label: 'Race orders' },
  { key: 'races', label: 'My races' },
  { key: 'contract', label: 'Contract' },
  { key: 'finances', label: 'Finances' },
] as const

/** El modo del plan, en un `Segmented` de tres (`PlanLadder.tsx` l. 50-54). */
export const PLAN_MODES = [
  { key: 'coach', label: 'Coach decides' },
  { key: 'mixed', label: 'Mixed' },
  { key: 'me', label: 'I decide' },
] as const

/* ── LO DEL 9b: la identidad, las tablas y las escalas ───────────────────────────────────────────── */

/** El nombre de corredor más largo del mundo de prueba: 28 caracteres (telefono §5.1). */
export const LONGEST_NAME = 'Jean-Baptiste Delacroix-Mény'

/** El título más largo, de 59 caracteres (D-56): `U23 time trial champion of Saint Vincent and the Grenadines`. */
export const LONGEST_TITLE: ChampionTitle = {
  scope: 'national',
  country: 'VC',
  discipline: 'itt',
  category: 'u23',
  season: 0,
  validFromDay: 40,
  validToDay: 404,
  source: { raceKey: 'vc-itt:s0', stageDay: 1 },
  provisional: true,
}

/** Un título de campeón de cada día: `Champion of Italy`. */
export const ITALY_TITLE: ChampionTitle = {
  ...LONGEST_TITLE,
  country: 'IT',
  discipline: 'road',
  category: 'elite',
}

/** Los equipos de las filas, con la semilla de su dibujo de hoy (las de la génesis). */
export const UI_TEAMS: readonly LegacyTeam[] = [
  'Valencia Pro Team',
  'Mistral Racing',
  'Noord Cycling',
  'Andes Ruta',
  'Northwind Cycling Team',
  'Alpenrose Velo',
  'Squadra Dolomiti',
  'Atlantic Coast Cycling Club',
  'Baltic Wind',
  'Sierra Morena Ciclismo',
  'Rhône Valley Racing',
  'Fjord Riders',
].map((name, i) => ({
  name,
  legacySeed: `cyclingstar-2:team:${i < 6 ? 'WT' : 'PRS'}:${i % 6}:jersey`,
}))

const NOMBRES = [
  'Sander',
  'Luc',
  'Marco',
  'Tom',
  'Jonas',
  'Pablo',
  'Mads',
  'Felix',
  'Aleksandr',
  'Kenji',
  'Diego',
  'Oskar',
  'Thibaut',
]
const APELLIDOS = [
  'Wouters',
  'Martin',
  'Rossi',
  'Berg',
  'Castro',
  'Holm',
  'Evers',
  'Gall',
  'Novak',
  'Sato',
  'Ferreira',
  'Lindqvist',
  'Moreau',
  'Kowalski',
  'Ibarra',
  'Dekker',
  'Hansen',
]
const PAISES = [
  'BE',
  'FR',
  'IT',
  'NL',
  'ES',
  'DK',
  'DE',
  'AT',
  'SI',
  'JP',
  'CO',
  'NO',
  'PL',
  'PT',
  'GB',
  'AU',
  'CH',
]

export interface UiGcRow {
  readonly id: string
  readonly rider: {
    readonly id: string
    readonly name: string
    readonly human: boolean
    readonly country: string | null
  }
  readonly bib: number
  readonly team: LegacyTeam | null
  readonly leader: JerseyKind | null
  readonly rank: number | null
  /** el tiempo del primero, en segundos */
  readonly total: number
  /** la diferencia con el primero */
  readonly gap: number
}

/** La fila propia: José Quintáns, del jugador de la prueba, en el puesto 34. */
export const OWN_RIDER_ID = 'r-own'
export const OWN_RANK = 34

/** La general tras la etapa 3: 140 filas, la propia en el 34, el nombre de 28 en el 3. */
export const GC_ROWS: readonly UiGcRow[] = Array.from({ length: 140 }, (_, i): UiGcRow => {
  const rank = i + 1
  const base = { rank, bib: 11 + i * 3, total: 51_725, gap: i === 0 ? 0 : i * 9 + (i % 4) * 2 }
  if (rank === OWN_RANK)
    return {
      ...base,
      id: OWN_RIDER_ID,
      rider: { id: OWN_RIDER_ID, name: 'José Quintáns', human: true, country: 'ES' },
      bib: 214,
      team: UI_TEAMS[0] ?? null,
      leader: null,
    }
  const name =
    rank === 3
      ? LONGEST_NAME
      : `${NOMBRES[i % NOMBRES.length]} ${APELLIDOS[(i * 7) % APELLIDOS.length]}`
  return {
    ...base,
    id: `r${rank}`,
    rider: {
      id: `r${rank}`,
      name,
      human: rank % 11 === 0,
      country: rank === 3 ? 'FR' : (PAISES[i % PAISES.length] ?? null),
    },
    team: rank % 37 === 0 ? null : (UI_TEAMS[(i * 5) % UI_TEAMS.length] ?? null),
    leader: rank === 1 ? 'gc' : rank === 5 ? 'points' : rank === 9 ? 'kom' : null,
  }
})

/** Una general corta con dos abandonos, que van al final, sin puesto y sin contar. */
export const GC_WITH_DNF: readonly UiGcRow[] = [
  ...GC_ROWS.slice(0, 5),
  { ...(GC_ROWS[60] as UiGcRow), id: 'dnf-1', rank: null },
  { ...(GC_ROWS[61] as UiGcRow), id: 'dnf-2', rank: null },
]

export interface UiTeamRow {
  readonly team: LegacyTeam
  readonly rank: number
  readonly gap: number
}

/** La clasificación por equipos: el nombre seguido de su maillot, en filas de 44. */
export const TEAM_ROWS: readonly UiTeamRow[] = UI_TEAMS.slice(0, 6).map((team, i) => ({
  team,
  rank: i + 1,
  gap: i * 47,
}))

/* ── LO DEL 10: una consulta en cada uno de sus seis estados (§5.4) ─────────────────────────────── */

/** La consulta de mentira de `QueryView`, sin React Query: lo que mira y un `refetch` que no hace nada. */
export type UiQuery = QueryViewProps<readonly string[]>['query']

const sinRefetch = (() => Promise.resolve()) as unknown as UiQuery['refetch']
const consulta = (o: Partial<UiQuery>): UiQuery => ({
  data: undefined,
  error: null,
  status: 'pending',
  fetchStatus: 'fetching',
  refetch: sinRefetch,
  ...o,
})

/** Los seis estados, con su nombre: la lenta, por un 429, que lo es desde el primer instante. */
export const UI_QUERIES: readonly (readonly [string, UiQuery])[] = [
  ['loading · the skeleton, after 300 ms', consulta({})],
  [
    'slow · a 429, or 8 s loading',
    consulta({
      status: 'error',
      fetchStatus: 'idle',
      error: new ApiError('Too many requests', 429, 'demasiadas_peticiones', 30),
    }),
  ],
  ['offline · paused by React Query', consulta({ fetchStatus: 'paused' })],
  [
    'error',
    consulta({
      status: 'error',
      fetchStatus: 'idle',
      error: new ApiError('Server error', 500, null),
    }),
  ],
  ['empty', consulta({ status: 'success', fetchStatus: 'idle', data: [] })],
  [
    'ready',
    consulta({ status: 'success', fetchStatus: 'idle', data: ['Race Var', 'Race Sardegna'] }),
  ],
]
