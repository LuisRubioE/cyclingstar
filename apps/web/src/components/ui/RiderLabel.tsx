import {
  COUNTRY_NAMES,
  type ChampionTitle,
  type JerseyKind,
  KIT_PX,
  type WornJersey,
  championTitleText,
} from '@cyclingstar/shared'
import type { ReactNode } from 'react'
import { NO_TEAM_LABEL } from '../../domain/labels'
import { ChampionMark, LeaderJersey } from '../Jersey'
import { Flag } from './Flag'
import { LegacyJersey } from './LegacyJersey'
import { TextLink, gluedLastWord } from './TextLink'

/**
 * EL CORREDOR, EN UNA LISTA (E3, docs/visual.md §4.6; PR 9b; I-18, O-17, D-00c). «Cada vez que menciones
 * un ciclista, pon su dorsal, su equipo entre paréntesis y su bandera» ([DUEÑO 26]), y la bandera, el
 * nombre y el maillot, siempre juntos y en ese orden ([DUEÑO], 21 de octubre). **Primer renglón**: el
 * dorsal si el contexto lo tiene (`#214`), la `Flag` a 21 × 16, el nombre en `row` (un humano en 600; un
 * bot, en cursiva y 400) como `TextLink` `rider` a su ficha, y el maillot a 28 (`KIT_PX.row`). **Segundo
 * renglón**: el equipo en `meta` `ink-3`, cortado con `…` si no cabe (el maillot lleva su nombre), o
 * `Individual` para un agente libre, que lleva el hueco del maillot. **El nombre no se corta nunca**: si
 * parte de línea, el maillot va pegado a su última palabra ([DUEÑO 17]): el renglón va en `nowrap` y
 * solo lo de delante de la última palabra en `normal` (`gluedLastWord`), así que la bandera tampoco se
 * separa de la primera; el dorsal sí, si no cabe con ellas (PR 12b).
 * En una frase (`inline`), todo en un renglón: `#214`, la bandera, el nombre, el maillot y `(Mistral
 * Racing)`.
 *
 * **Qué maillot** (D-00c): el que lleva ese día (`worn`, de `RiderCard`) manda; si no, en una tabla, el de
 * líder de la clasificación que enseña (`leader`) y, si no, el de campeón (`champion`); si no, la
 * equipación. Hasta el 17a, con los dibujos de hoy: `LeaderJersey`, el de campeón sin la bandera de al
 * lado, que D-00c quita, y `LegacyJersey` con la semilla del equipo (`team: { name, legacySeed }`, 17-e).
 */

/** El equipo de ese día, hasta el 17a (17-e): su nombre y la semilla de su dibujo de hoy. */
export interface LegacyTeam {
  readonly name: string
  readonly legacySeed: string
}

export interface RiderLabelProps {
  readonly rider: {
    readonly id: string
    /** como está guardado */
    readonly name: string
    /** 600; un bot, cursiva */
    readonly human: boolean
    /** ISO 3166-1 alfa-2 */
    readonly country: string | null
  }
  /** solo donde el contexto lo tiene */
  readonly bib?: number | null
  /** el equipo de ese día; null, un agente libre (`Individual`) */
  readonly team?: LegacyTeam | null
  /** donde llega `RiderCard.worn` (`Watch`, `Report`): el que lleva ese día; manda sobre los dos de abajo */
  readonly worn?: WornJersey
  /** en una tabla, el de líder de la clasificación que enseña: `jerseyOf(leaders, riderId)` (§6.1) */
  readonly leader?: JerseyKind | null
  /** en una tabla, el título que lleva ese día: `champions[riderId]` (§6.1, desde el 17a) */
  readonly champion?: ChampionTitle | null
  /** por defecto true; false dentro de una celda que ya enlaza */
  readonly link?: boolean
  readonly inline?: boolean
  /** por defecto true; false en una `RankTable`, donde el equipo es la columna `Team` (§6.1) */
  readonly teamLine?: boolean
}

/** El maillot que le toca en ese sitio, por orden (D-00c). */
export type RiderJerseyChoice =
  | { readonly kind: 'leader'; readonly jersey: JerseyKind }
  | { readonly kind: 'champion'; readonly title: ChampionTitle }
  | { readonly kind: 'team'; readonly team: LegacyTeam }
  /** un agente libre: el hueco de su ancho (§9.10) */
  | { readonly kind: 'none' }
  /** sin equipo que pintar: ni maillot ni hueco */
  | { readonly kind: 'unknown' }

export function riderJerseyOf(
  p: Pick<RiderLabelProps, 'team' | 'worn' | 'leader' | 'champion'>,
): RiderJerseyChoice {
  const equipo = (): RiderJerseyChoice =>
    p.team === undefined
      ? { kind: 'unknown' }
      : p.team === null
        ? { kind: 'none' }
        : { kind: 'team', team: p.team }
  if (p.worn !== undefined) {
    if (p.worn.kind === 'leader') return { kind: 'leader', jersey: p.worn.jersey }
    if (p.worn.kind === 'champion') return { kind: 'champion', title: p.worn.title }
    return equipo()
  }
  if (p.leader !== undefined && p.leader !== null) return { kind: 'leader', jersey: p.leader }
  if (p.champion !== undefined && p.champion !== null)
    return { kind: 'champion', title: p.champion }
  return equipo()
}

/** El maillot elegido, a `size`; también lo pinta `RiderHeader`, a 40. */
export function ChosenJersey({
  choice,
  size,
}: {
  readonly choice: RiderJerseyChoice
  readonly size: 28 | 40
}) {
  if (choice.kind === 'leader') return <LeaderJersey kind={choice.jersey} size={size} />
  if (choice.kind === 'champion')
    return (
      <ChampionMark
        country={null}
        label={championTitleText('en', choice.title, COUNTRY_NAMES)}
        size={size}
      />
    )
  if (choice.kind === 'team')
    return <LegacyJersey seed={choice.team.legacySeed} size={size} team={choice.team.name} />
  if (choice.kind === 'none')
    return (
      <span
        aria-hidden="true"
        className="inline-block shrink-0"
        style={{ width: size, height: size }}
      />
    )
  return null
}

export function RiderLabel(props: RiderLabelProps) {
  const { rider, bib, team, link = true, inline = false, teamLine = true } = props
  const choice = riderJerseyOf(props)
  const peso = rider.human ? 'font-semibold' : 'font-normal italic'
  const nombre: ReactNode = link ? (
    <TextLink to={`/world/riders/${rider.id}`} variant="rider" inline glueEnd>
      {rider.name}
    </TextLink>
  ) : (
    gluedLastWord(rider.name)
  )
  const primera = (
    <>
      {bib !== undefined && bib !== null && (
        <>
          <span className="mr-1 text-meta font-normal tabular-nums text-ink-2">#{bib}</span>
          {/* tras el dorsal, el renglón puede partir (PR 12b): un dorsal de tres cifras, la bandera y una
              primera palabra larga (`Népomuscène`) no caben juntos en una celda de 171 px a 320 */}
          <span className="whitespace-normal">
            <wbr />
          </span>
        </>
      )}
      <Flag country={rider.country} layout="mr-1" />
      <span data-rider={rider.human ? 'human' : 'bot'} className={peso}>
        {nombre}
      </span>
      {choice.kind !== 'unknown' && (
        <>
          <span className="ml-1 inline-flex align-middle">
            <ChosenJersey choice={choice} size={KIT_PX.row} />
          </span>
        </>
      )}
    </>
  )
  const equipo = team === undefined ? null : (team?.name ?? NO_TEAM_LABEL)

  if (inline)
    return (
      <span
        data-ui="RiderLabel"
        data-variant="inline"
        data-state="ready"
        className="whitespace-nowrap"
      >
        {primera}
        {equipo !== null && <span className="whitespace-normal">{` (${equipo})`}</span>}
      </span>
    )
  return (
    <span data-ui="RiderLabel" data-variant="row" data-state="ready" className="block min-w-0">
      <span className="block text-row whitespace-nowrap text-ink">{primera}</span>
      {teamLine && equipo !== null && (
        <span data-clip-ok="" className="block truncate text-meta text-ink-3">
          {equipo}
        </span>
      )}
    </span>
  )
}
