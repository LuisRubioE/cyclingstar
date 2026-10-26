import { type RaceLeaders, jerseyOf } from '@cyclingstar/shared'
import type { StageResultEntry } from '../api/results'
import { formatTime } from '../domain/format'
import { raceTeamLabel } from '../domain/labels'
import { NO_TABLE_IDENTITY, type TableIdentity, rowTeam } from '../domain/tableIdentity'
import { LoadingState } from './ui/QueryView'
import { RankTable, type RankTableColumn } from './ui/RankTable'
import { RiderLabel } from './ui/RiderLabel'
import type { Layout } from './ui/types'

/**
 * LAS CLASIFICACIONES DE UNA CARRERA (E3, docs/visual.md §6.1; PR 12b). La general, los puntos y la
 * montaña de la ficha de carrera y de la de etapa, y la llegada, en `RankTable`: el puesto; la identidad
 * (`RiderLabel`: el dorsal, la bandera, el nombre y el maillot de 28, el de líder de la clasificación que se
 * enseña o la equipación); el equipo debajo hasta 640; y el tiempo o los puntos. Lo que la fila no trae,
 * el dorsal y el dibujo del equipo (`identity`, de la lista de salida, 17-q) y el corredor del jugador
 * (`ownRiderId`, §6.2), llega de la página: aquí no hay consultas, y las tablas se pintan en un test sin
 * `QueryClientProvider`. Mientras la lista de salida llega, la tabla espera (`pending`): los dorsales y los
 * maillots que llegan después la moverían, y a 320 la harían otra.
 */

export interface RaceTableContext {
  /** los maillots de líder de lo que la tabla enseña: tras la etapa, o los de la carretera en la llegada */
  readonly leaders: RaceLeaders | undefined
  /** el dorsal y el dibujo del equipo (`useRaceIdentity`); sin él, ni dorsal ni equipación */
  readonly identity?: TableIdentity
  /** el corredor del jugador: su fila, anclada si no está entre las 20 */
  readonly ownRiderId?: string | null
  /** la tabla que contesta a la pantalla (§7.3) */
  readonly answer?: boolean
  /** en una tarjeta de 20 de relleno, `-mx-4`: la tabla casi de borde a borde, como el `Panel` `bleed` (§6.1) */
  readonly layout?: Layout
}

/** La tabla, mientras llega la lista de salida: el esqueleto de sus filas, que la prueba espera. */
export function RaceTableWaiting() {
  return <LoadingState label="the classification" skeleton={{ kind: 'rows', rowHeight: 56 }} />
}

/** Lo que tiene toda fila de corredor de una carrera. */
interface RiderRow {
  readonly riderId: string
  readonly name: string
  readonly country: string
  readonly teamId?: string | null | undefined
  readonly teamName: string | null
  readonly isBot: boolean
}

/** Una fila con su puesto: el de las que siguen en carrera, por su orden; null, la que no. */
interface Puesto<Row> {
  readonly r: Row
  readonly puesto: number | null
}

function conPuesto<Row>(rows: readonly Row[], fuera: (r: Row) => boolean): Puesto<Row>[] {
  let n = 0
  return rows.map((r) => ({ r, puesto: fuera(r) ? null : ++n }))
}

function identidad(r: RiderRow, ctx: RaceTableContext) {
  const id = ctx.identity ?? NO_TABLE_IDENTITY
  const team = rowTeam(r.teamId, r.teamName, id)
  return (
    <RiderLabel
      rider={{ id: r.riderId, name: r.name, human: !r.isBot, country: r.country || null }}
      bib={id.bibOf(r.riderId)}
      {...(team === undefined ? {} : { team })}
      leader={jerseyOf(ctx.leaders, r.riderId)}
      link={false}
      teamLine={false}
    />
  )
}

const columnaEquipo = <Row extends RiderRow>(): RankTableColumn<Puesto<Row>> => ({
  key: 'team',
  header: 'Team',
  priority: 'secondary',
  clip: true,
  render: ({ r }) => raceTeamLabel(r.teamName),
})

const comunes = <Row extends RiderRow>(ctx: RaceTableContext) => ({
  rowKey: ({ r }: Puesto<Row>) => r.riderId,
  rank: ({ puesto }: Puesto<Row>) => puesto,
  identity: ({ r }: Puesto<Row>) => identidad(r, ctx),
  href: ({ r }: Puesto<Row>) => `/world/riders/${r.riderId}`,
  isOwn: ({ r }: Puesto<Row>) => ctx.ownRiderId != null && r.riderId === ctx.ownRiderId,
  ...(ctx.answer === true ? { answer: true } : {}),
  ...(ctx.layout === undefined ? {} : { layout: ctx.layout }),
})

/** Una fila de una general: la de la carrera (`GcRow`) o la de tras una etapa (`StageGcEntry`). */
interface GcLike extends RiderRow {
  readonly tiempoTotalS: number
  /** abandonó, o le falta una etapa: sin puesto y al final */
  readonly dnf?: boolean | undefined
}

/**
 * La general: `Time`, el total del líder y la diferencia de los demás (`+0:20`, `formatTime`, D-15); y
 * desde 1.024, `Total`. El líder es el primer CLASIFICADO, no la primera fila (los no clasificados van al
 * final); su tiempo acumulado, el de quien no está clasificado, no significa nada y no se enseña.
 */
export function GcRankTable({
  rows,
  caption = 'General classification',
  ...ctx
}: RaceTableContext & { readonly rows: readonly GcLike[]; readonly caption?: string }) {
  const lider = rows.find((r) => r.dnf !== true)?.tiempoTotalS ?? 0
  const columnas: readonly RankTableColumn<Puesto<GcLike>>[] = [
    columnaEquipo<GcLike>(),
    {
      key: 'total',
      header: 'Total',
      priority: 'optional',
      numeric: true,
      render: ({ r }) => (r.dnf === true ? null : formatTime(r.tiempoTotalS)),
    },
    {
      key: 'time',
      header: 'Time',
      priority: 'primary',
      numeric: true,
      render: ({ r, puesto }) =>
        puesto === 1 ? formatTime(r.tiempoTotalS) : `+${formatTime(r.tiempoTotalS - lider)}`,
    },
  ]
  if (ctx.identity?.pending === true) return <RaceTableWaiting />
  return (
    <RankTable
      caption={caption}
      rows={conPuesto(rows, (r) => r.dnf === true)}
      columns={columnas}
      {...comunes<GcLike>(ctx)}
    />
  )
}

/** Una fila de puntos o de montaña (`PointsEntry`). */
interface PointsLike extends RiderRow {
  readonly puntos: number
}

/** Los puntos y la montaña: `Pts`, y el equipo debajo hasta 640. */
export function PointsRankTable({
  rows,
  caption = 'Points classification',
  ...ctx
}: RaceTableContext & { readonly rows: readonly PointsLike[]; readonly caption?: string }) {
  const columnas: readonly RankTableColumn<Puesto<PointsLike>>[] = [
    columnaEquipo<PointsLike>(),
    {
      key: 'pts',
      header: 'Pts',
      priority: 'primary',
      numeric: true,
      render: ({ r }) => r.puntos,
    },
  ]
  if (ctx.identity?.pending === true) return <RaceTableWaiting />
  return (
    <RankTable
      caption={caption}
      rows={conPuesto(rows, () => false)}
      columns={columnas}
      {...comunes<PointsLike>(ctx)}
    />
  )
}

/**
 * CÓMO SE DICE QUE ALGUIEN NO ACABÓ. `fuera_control` es su propia cosa (cruzó la meta, pero tarde) y la
 * hoja de una carrera de verdad no lo llama DNF; el resto se agrupa, porque para el lector «se bajó de la
 * bici» y «se cayó y no siguió» son la misma noticia y el porqué lo cuenta el journal.
 */
export function dnfLabel(reason: string | null | undefined): string {
  return reason === 'fuera_control' ? 'OTL' : 'DNF'
}

/**
 * La llegada: `Time` (el del ganador y la diferencia de los demás); desde 640, `Bonus` (`−10 s`); desde
 * 1.024, `Sprint` y `KOM`. LOS QUE NO ACABARON SE VEN SIEMPRE, también con la tabla plegada (v50): al
 * final, sin puesto, con `OTL` o `DNF`, y sin contar en `Show all N`.
 */
export function StageResultRankTable({
  rows,
  caption = 'Stage result',
  ...ctx
}: RaceTableContext & { readonly rows: readonly StageResultEntry[]; readonly caption?: string }) {
  const ganador = rows.find((r) => !r.dnf)?.tiempoS ?? 0
  const columnas: readonly RankTableColumn<Puesto<StageResultEntry>>[] = [
    columnaEquipo<StageResultEntry>(),
    {
      key: 'bonus',
      header: 'Bonus',
      priority: 'secondary',
      numeric: true,
      render: ({ r }) => (r.bonificacionS > 0 ? `−${r.bonificacionS} s` : null),
    },
    {
      key: 'sprint',
      header: 'Sprint',
      priority: 'optional',
      numeric: true,
      render: ({ r }) => (r.puntosVolante > 0 ? r.puntosVolante : null),
      second: ({ r }) => (r.puntosVolante > 0 ? `${r.puntosVolante} sprint pts` : null),
    },
    {
      key: 'kom',
      header: 'KOM',
      priority: 'optional',
      numeric: true,
      render: ({ r }) => (r.puntosMontana > 0 ? r.puntosMontana : null),
      second: ({ r }) => (r.puntosMontana > 0 ? `${r.puntosMontana} KOM pts` : null),
    },
    {
      key: 'time',
      header: 'Time',
      priority: 'primary',
      numeric: true,
      render: ({ r, puesto }) =>
        puesto === 1 ? formatTime(r.tiempoS) : `+${formatTime(r.tiempoS - ganador)}`,
    },
  ]
  if (ctx.identity?.pending === true) return <RaceTableWaiting />
  return (
    <RankTable
      caption={caption}
      rows={rows.map((r) => ({ r, puesto: r.dnf ? null : r.puesto }))}
      columns={columnas}
      inactiveLabel={({ r }) => dnfLabel(r.reason)}
      {...comunes<StageResultEntry>(ctx)}
    />
  )
}
