import { HEALTH_STATES, type HealthState } from '@cyclingstar/shared'
import type { TeamRider } from '../api/browse'
import { HEALTH_LOOK, isOut } from '../domain/health'
import { archetypeLabel } from '../domain/labels'
import { Chip } from './ui/Chip'
import { RankTable, type RankTableColumn } from './ui/RankTable'
import { RiderLabel } from './ui/RiderLabel'

/** El estado de salud de la respuesta, si es uno de los cuatro. */
const esEstado = (s: string): s is HealthState => (HEALTH_STATES as readonly string[]).includes(s)

/**
 * La salud en `Chip`, solo si no está sano, para no meter ruido: `Niggle` en `warn`; `Ill` e `Injured`,
 * fuera de combate, en `bad`. Las palabras, las de la ficha (`HEALTH_LOOK`).
 */
function healthChip(health: string) {
  if (!esEstado(health) || health === 'sano') return null
  return <Chip tone={isOut(health) ? 'bad' : 'warn'}>{HEALTH_LOOK[health].label}</Chip>
}

/** El papel y los puntos debajo del nombre hasta 640, y la salud hasta 1.024 (§6.1). */
const COLUMNAS: readonly RankTableColumn<TeamRider>[] = [
  {
    key: 'role',
    header: 'Role',
    priority: 'secondary',
    render: (r) => archetypeLabel(r.archetype),
  },
  {
    key: 'pts',
    header: 'Pts',
    priority: 'secondary',
    numeric: true,
    render: (r) => r.seasonPoints.toLocaleString('en-US'),
    second: (r) => `${r.seasonPoints.toLocaleString('en-US')} pts`,
  },
  { key: 'health', header: 'Health', priority: 'optional', render: (r) => healthChip(r.health) },
]

/**
 * LA PLANTILLA (E3, docs/visual.md §6.1 y §6.2; PR 12b): la de la ficha del equipo y la de `My Team →
 * Squad`. En `RankTable` sin puesto, con todas las filas y sin fila propia: el corredor con su bandera,
 * que ya dice quién es extranjero, y el maillot del equipo de la ficha; la celda entera enlaza a su ficha.
 */
export function SquadTable({
  rows,
  team,
  answer = false,
}: {
  readonly rows: readonly TeamRider[]
  /** el equipo de la ficha: su nombre y la semilla de su dibujo */
  readonly team: { readonly name: string; readonly jerseySeed: string }
  /** la tabla que contesta a la pantalla (§7.3) */
  readonly answer?: boolean
}) {
  const kit = { name: team.name, legacySeed: team.jerseySeed }
  return (
    <RankTable
      caption={`${team.name} roster: rider, role, season points and health`}
      rows={rows}
      rowKey={(r) => r.id}
      identity={(r) => (
        <RiderLabel
          rider={{ id: r.id, name: r.name, human: !r.isBot, country: r.country || null }}
          team={kit}
          link={false}
          teamLine={false}
        />
      )}
      href={(r) => `/world/riders/${r.id}`}
      columns={COLUMNAS}
      all
      answer={answer}
    />
  )
}
