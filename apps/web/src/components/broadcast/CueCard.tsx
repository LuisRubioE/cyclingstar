import type { CueClass, RiderCard } from '@cyclingstar/shared'
import { memo } from 'react'
import { type CueBody, type CueText, cardTexts } from '../../domain/broadcast/screen'
import { Flag } from '../ui/Flag'
import { LeaderJersey } from '../ui/LeaderJersey'
import { TeamJersey } from '../ui/TeamJersey'
import { WornJerseyIcon, wornTeamOf } from './WornJerseyIcon'

/** El rótulo que está en pantalla: su texto, fijado al salir, su clase y lo que se pinta con iconos. */
export interface ShownCueCard {
  readonly text: CueText
  readonly cls: CueClass
  /** cambia con cada rótulo que sale, aunque el texto se repita */
  readonly seq: number
  /** la carta del corredor, la lista de una fuga o las filas de un cuadro (`cueBodyOf`, 6b) */
  readonly body?: Omit<CueBody, 'text'>
}

/**
 * EL PLANO (docs/retransmision.md §6.1, §6.5, §6.7 y §7.1; D-21, D-57). El rótulo del momento, uno a la
 * vez, el que la cola del reproductor tiene en pantalla (`CueDeck`, `player.ts`): la palabra de arriba
 * en mayúsculas (`ATTACK`, `CRASH`, `KOM`) y lo que la sigue. Su texto se fija cuando sale, con el
 * instante de ese momento, para que no cambie mientras se lee. Desde el 6b, con lo que lleva iconos: la
 * carta del corredor de §7.1 (su maillot, dorsal, nombre, bandera, la equipación y el nombre de su
 * equipo, el titular, hasta tres líneas y `Your rider`), la lista de la fuga con el maillot de cada uno
 * (§6.7: «cuando se escapan cinco, que se vean sus maillots») y las filas del cuadro de diferencias y de
 * la general virtual.
 *
 * La región está siempre, vacía entre rótulo y rótulo, y es `aria-live="polite"` (D-57, §18.8): un
 * lector de pantalla dice cada rótulo al salir sin cortar lo que estaba diciendo. Ocupa su sitio
 * aunque esté vacía (88 px desde el 17a, el título y dos renglones de 28 con maillot; §14.5, 14-b), para
 * que la voz no salte de sitio con cada rótulo. La clase pinta el fondo: la 3 (la meta, la caza, el
 * corte) de rojo; la 2, de oscuro; el resto, más claro.
 *
 * Desde el 17a (E3, docs/visual.md §14.1 y §14.5; D-00b, D-00c): los maillots a 28 px y con el filete
 * claro (`surface="dark"`), en el orden de D-00c: el dorsal, la bandera, el nombre y el maillot que
 * lleva; y los nombres no se cortan, parten de línea (Ruso-040).
 *
 * Desde el PR 20 (E3, docs/visual.md §14.5; 14-a): la tarjeta va en el ámbito oscuro, con los fondos
 * `bad` (la clase 3), `navy-dark` (la 2) y `navy` (las demás), y no `ink-2`, que dentro del ámbito es
 * blanco al 75 % y un token de tinta nunca es un fondo. El texto, en `ink`; el secundario, en `ink-2`
 * solo sobre `navy-dark` y `navy`: sobre `bad` no está medido, y va en `ink`. El título, en `caption`
 * 600 en versales.
 */
/** Con el mismo rótulo, no se pinta otra vez (10b, los arreglos): cambia con la cola, no a `overlayHz`. */
export const CueCard = memo(function CueCard({ cue }: { cue: ShownCueCard | null }) {
  const onBad = cue !== null && cue.cls >= 3
  const tone = cue === null ? '' : onBad ? 'bg-bad' : cue.cls === 2 ? 'bg-navy-dark' : 'bg-navy'
  /** el secundario: `ink-2` sobre `navy-dark` y `navy`; sobre `bad`, `ink` (14-a) */
  const second = onBad ? 'text-ink' : 'text-ink-2'
  const body = cue?.body
  return (
    <div aria-live="polite" aria-atomic="true" className="min-h-22" data-cue-card="">
      {cue !== null && (
        <div
          key={cue.seq}
          data-cue-class={cue.cls}
          data-surface="dark"
          className={`rounded-ui px-3 py-2 text-ink ${tone}`}
        >
          {cue.text.title !== '' && (
            <p data-caps="" className="text-caption font-semibold uppercase tracking-caps">
              {cue.text.title}
            </p>
          )}
          {body?.rider !== undefined && <RiderCardView card={body.rider} second={second} />}
          {cue.text.detail !== null && <p className="text-meta">{cue.text.detail}</p>}
          {body?.riders !== undefined && body.riders.length > 0 && (
            <ul
              data-cue-riders=""
              className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 sm:grid-cols-3"
            >
              {body.riders.map((c) => (
                <li key={c.ix} className="flex min-w-0 flex-wrap items-center gap-1 text-caption">
                  <span className={`tabular-nums ${second}`}>{c.bib ?? ''}</span>
                  <Flag country={c.country} />
                  <span className="min-w-0 break-words">{c.name}</span>
                  <WornJerseyIcon worn={c.worn} team={wornTeamOf(c)} size={28} surface="dark" />
                </li>
              ))}
              {(body.more ?? 0) > 0 && (
                <li className={`text-caption ${second}`}>
                  +{body.more} {body.more === 1 ? 'rider' : 'riders'}
                </li>
              )}
            </ul>
          )}
          {body?.rows !== undefined && body.rows.length > 0 && (
            <ol data-cue-rows="" className="mt-1 space-y-0.5 text-caption">
              {body.rows.map((r) => (
                <li key={r.key} className="flex items-center gap-2">
                  <span className={`w-4 shrink-0 text-right tabular-nums ${second}`}>{r.left}</span>
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                    {r.cards.map((c, i) => (
                      <span key={c.ix} className="inline-flex min-w-0 items-center gap-1">
                        {i > 0 && <span className={second}>·</span>}
                        <Flag country={c.country} />
                        <span className="break-words">{c.name}</span>
                        <WornJerseyIcon
                          worn={c.worn}
                          team={wornTeamOf(c)}
                          size={28}
                          surface="dark"
                        />
                      </span>
                    ))}
                    {r.label !== null && <span className="break-words">{r.label}</span>}
                    {r.jerseys.map((j) => (
                      <LeaderJersey key={j} kind={j} size={28} surface="dark" />
                    ))}
                  </span>
                  <span className="shrink-0 tabular-nums">{r.right}</span>
                </li>
              ))}
              {body.behind != null && <li className={`pl-6 ${second}`}>{body.behind}</li>}
            </ol>
          )}
        </div>
      )}
    </div>
  )
})

/**
 * LA CARTA DEL CORREDOR (§7.1; E3, §14.1, D-00c): en el primer renglón, el dorsal (`#214`), la bandera,
 * el nombre tal como está guardado (7-a) y el maillot que lleva (`WornJerseyIcon`: el de líder, el de
 * campeón o la equipación), y `Your rider`, que es una marca y no una línea; en el segundo, el equipo,
 * con su maillot solo si el corredor lleva el de líder o el de campeón, el titular (`cardCaption`) y
 * hasta tres líneas (`cardLineText`, ya cortadas al servir).
 */
export function RiderCardView({
  card,
  second = 'text-ink-2',
}: {
  card: RiderCard
  /** el color del segundo renglón: `ink-2`, o `ink` sobre `bad` (14-a) */
  second?: string
}) {
  const { caption, lines } = cardTexts(card)
  const team = wornTeamOf(card)
  return (
    <div data-rider-card={card.ix} className="text-meta">
      <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
        {card.bib !== null && <span className="font-semibold tabular-nums">#{card.bib}</span>}
        <Flag country={card.country} />
        <span className="font-semibold">{card.name}</span>
        <WornJerseyIcon worn={card.worn} team={team} size={28} surface="dark" />
        {card.own && (
          <span className="rounded-ui bg-accent px-1 text-caption font-semibold uppercase text-on-accent">
            Your rider
          </span>
        )}
      </p>
      {(team !== null || caption !== null || lines.length > 0) && (
        <p className={`flex min-w-0 flex-wrap items-center gap-x-1 text-caption ${second}`}>
          {team !== null && (
            <span data-rider-team="" className="inline-flex items-center gap-1">
              {card.worn.kind !== 'team' && <TeamJersey team={team} size={28} surface="dark" />}
              {team.name}
            </span>
          )}
          {(caption !== null || lines.length > 0) && (
            <span>
              {team !== null && '· '}
              {[caption, ...lines].filter((x) => x !== null).join(' · ')}
            </span>
          )}
        </p>
      )}
    </div>
  )
}
