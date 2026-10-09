import type { CueClass, RiderCard } from '@cyclingstar/shared'
import { memo } from 'react'
import { type CueBody, type CueText, cardTexts } from '../../domain/broadcast/screen'
import { Flag } from '../Flag'
import { Jersey, LeaderJersey } from '../Jersey'
import { WornJerseyIcon } from './WornJerseyIcon'

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
 * aunque esté vacía (72 px en el teléfono, §6.1), para que la voz no salte de sitio con cada rótulo.
 * La clase pinta el fondo: la 3 (la meta, la caza, el corte) de rojo; la 2, de oscuro; el resto, más
 * claro.
 */
/** Con el mismo rótulo, no se pinta otra vez (10b, los arreglos): cambia con la cola, no a `overlayHz`. */
export const CueCard = memo(function CueCard({ cue }: { cue: ShownCueCard | null }) {
  const tone =
    cue === null
      ? ''
      : cue.cls >= 3
        ? 'bg-red-700 text-white'
        : cue.cls === 2
          ? 'bg-slate-900 text-white'
          : 'bg-slate-700 text-white'
  const body = cue?.body
  return (
    <div aria-live="polite" aria-atomic="true" className="min-h-[72px]" data-cue-card="">
      {cue !== null && (
        <div key={cue.seq} data-cue-class={cue.cls} className={`rounded-2xl px-3 py-2 ${tone}`}>
          {cue.text.title !== '' && (
            <p className="text-xs font-bold uppercase tracking-wide">{cue.text.title}</p>
          )}
          {body?.rider !== undefined && <RiderCardView card={body.rider} />}
          {cue.text.detail !== null && <p className="text-sm">{cue.text.detail}</p>}
          {body?.riders !== undefined && body.riders.length > 0 && (
            <ul
              data-cue-riders=""
              className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 sm:grid-cols-3"
            >
              {body.riders.map((c) => (
                <li key={c.ix} className="flex min-w-0 items-center gap-1 text-xs">
                  <WornJerseyIcon card={c} size={14} />
                  <span className="tabular-nums text-white/70">{c.bib ?? ''}</span>
                  <span className="truncate">{c.name}</span>
                </li>
              ))}
              {(body.more ?? 0) > 0 && (
                <li className="text-xs text-white/70">
                  +{body.more} {body.more === 1 ? 'rider' : 'riders'}
                </li>
              )}
            </ul>
          )}
          {body?.rows !== undefined && body.rows.length > 0 && (
            <ol data-cue-rows="" className="mt-1 space-y-0.5 text-xs">
              {body.rows.map((r) => (
                <li key={r.key} className="flex items-center gap-2">
                  <span className="w-4 shrink-0 text-right tabular-nums text-white/60">
                    {r.left}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-1 truncate">
                    {r.cards.map((c, i) => (
                      <span key={c.ix} className="inline-flex min-w-0 items-center gap-1">
                        {i > 0 && <span className="text-white/40">·</span>}
                        <WornJerseyIcon card={c} size={13} />
                        <span className="truncate">{c.name}</span>
                      </span>
                    ))}
                    {r.label !== null && <span className="truncate">{r.label}</span>}
                    {r.jerseys.map((j) => (
                      <LeaderJersey key={j} kind={j} size={12} />
                    ))}
                  </span>
                  <span className="shrink-0 tabular-nums">{r.right}</span>
                </li>
              ))}
              {body.behind != null && <li className="pl-6 text-white/70">{body.behind}</li>}
            </ol>
          )}
        </div>
      )}
    </div>
  )
})

/**
 * LA CARTA DEL CORREDOR (§7.1): el maillot que lleva (`WornJerseyIcon`: el de líder, `ChampionMark` o
 * la equipación), el dorsal, el nombre tal como está guardado (7-a), la bandera, la equipación y el
 * nombre de su equipo, el titular (`cardCaption`), hasta tres líneas (`cardLineText`, ya cortadas al
 * servir) y `Your rider`, que es una marca y no una línea. En el móvil, dos renglones.
 */
export function RiderCardView({ card }: { card: RiderCard }) {
  const { caption, lines } = cardTexts(card)
  return (
    <div data-rider-card={card.ix} className="text-sm">
      <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <WornJerseyIcon card={card} size={16} />
        {card.bib !== null && <span className="font-semibold tabular-nums">{card.bib}</span>}
        <span className="font-semibold">{card.name}</span>
        <Flag code={card.country} size={11} />
        {card.team !== null && (
          <span className="inline-flex items-center gap-1 text-white/80">
            <Jersey seed={card.team.jerseySeed} size={13} />
            {card.team.name}
          </span>
        )}
        {card.own && (
          <span className="rounded bg-cyan-500 px-1 text-[10px] font-bold uppercase text-slate-900">
            Your rider
          </span>
        )}
      </p>
      {(caption !== null || lines.length > 0) && (
        <p className="text-xs text-white/80">
          {[caption, ...lines].filter((x) => x !== null).join(' · ')}
        </p>
      )}
    </div>
  )
}
