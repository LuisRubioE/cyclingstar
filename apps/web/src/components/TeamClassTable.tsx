import type { TeamClassEntry } from '../api/race'
import { formatTime } from '../domain/format'
import { plural } from '../domain/words'
import { TeamJersey } from './ui/TeamJersey'
import { RankTable, type RankTableColumn } from './ui/RankTable'
import { gluedLastWord } from './ui/TextLink'
import type { Layout } from './ui/types'

/** Un equipo con su puesto: null, fuera de clasificación. */
interface Fila {
  readonly r: TeamClassEntry
  readonly puesto: number | null
}

/**
 * Tabla de la clasificación POR EQUIPOS. La misma para la de una etapa y para la acumulada: las dos
 * tienen la misma forma (equipo, tiempo y diferencia con el líder), así que las dos páginas, ficha de
 * carrera y ficha de etapa, usan este componente y no dos copias que se desincronicen.
 *
 * En `RankTable` desde el PR 12b (E3, docs/visual.md §6.1; 6-f, 4-i y D-00j): el puesto, el nombre del
 * equipo seguido de su maillot de 28 (el de la fila, del día de la etapa que enseña: desde el 19e nunca nulo,
 * así que la tabla ya no espera a la lista de salida) y `Time`; sin la bandera ni la columna `Country`, que hacían de equipo (tres banderas de Francia
 * seguidas, captura 06), y sin marcar al equipo líder: la tabla lo dice por su orden. La acumulada lleva
 * además `Stages`, las etapas puntuadas. Los equipos FUERA de clasificación (los que se quedaron sin tres
 * corredores en alguna etapa) van al final, sin puesto y con `OUT`, como los DNF en la individual.
 */
export function TeamClassTable({
  rows,
  ownTeamId = null,
  cumulative = false,
  answer = false,
  layout,
}: {
  readonly rows: readonly TeamClassEntry[]
  /** el equipo del jugador: su fila (§6.2) */
  readonly ownTeamId?: string | null
  /** la acumulada: con `Stages` */
  readonly cumulative?: boolean
  /** la tabla que contesta a la pantalla (§7.3) */
  readonly answer?: boolean
  /** en una tarjeta de 20 de relleno, `-mx-4`: casi de borde a borde (§6.1) */
  readonly layout?: Layout
}) {
  const lider = rows.find((r) => !r.out)?.tiempoS ?? 0
  let n = 0
  const filas: Fila[] = rows.map((r) => ({ r, puesto: r.out ? null : ++n }))
  const tiempo: RankTableColumn<Fila> = {
    key: 'time',
    header: 'Time',
    priority: 'primary',
    numeric: true,
    render: ({ r, puesto }) =>
      puesto === 1 ? formatTime(r.tiempoS) : `+${formatTime(r.tiempoS - lider)}`,
  }
  const etapas: RankTableColumn<Fila> = {
    key: 'stages',
    header: 'Stages',
    priority: 'secondary',
    numeric: true,
    render: ({ r }) => r.stagesScored,
    second: ({ r }) => `${plural(r.stagesScored, 'stage')} scored`,
  }
  return (
    <RankTable
      caption={cumulative ? 'Team classification, overall' : 'Team classification'}
      rows={filas}
      rowKey={({ r }) => r.teamId}
      rank={({ puesto }) => puesto}
      identityHeader="Team"
      identity={({ r }) => {
        // el de la fila, el del día de la etapa que enseña (§8.5)
        return (
          <span className="text-row whitespace-nowrap text-ink">
            {gluedLastWord(r.teamName)}
            <span className="ml-1 inline-flex align-middle">
              <TeamJersey team={{ name: r.teamName, kit: r.kit }} size={28} />
            </span>
          </span>
        )
      }}
      href={({ r }) => `/world/teams/${r.teamId}`}
      columns={cumulative ? [etapas, tiempo] : [tiempo]}
      isOwn={({ r }) => ownTeamId !== null && r.teamId === ownTeamId}
      inactiveLabel={() => 'OUT'}
      answer={answer}
      {...(layout === undefined ? {} : { layout })}
    />
  )
}

/**
 * Explicación de la regla, para que nadie tenga que adivinar de dónde sale el tiempo. Va bajo la tabla,
 * en un panel casi de borde a borde (`-mx-4`, PR 12b): su `px-4` devuelve el texto a su sitio.
 */
export function TeamClassNote() {
  return (
    <p className="mt-2 px-4 text-caption text-ink-3">
      Combined finishing times of the three best riders from each team on every stage. Time bonuses
      do not count. A team left with fewer than three riders drops out of the classification.
    </p>
  )
}
