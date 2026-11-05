import { BROADCAST } from '@cyclingstar/shared'
import { useEffect, useState } from 'react'
import type {
  ArrivalCard,
  ClosingCard,
  PreviewCard,
  RecapView,
} from '../../domain/broadcast/montage'
import { Button } from '../ui/Button'
import { LeaderJersey } from '../ui/LeaderJersey'

/**
 * LA PREVIA, LA LLEGADA, EL CIERRE Y LOS RESÚMENES EN PANTALLA (docs/retransmision.md §6.11, §8.5 a §8.7;
 * D-22, DD-14, 8-i, 8-n; paso 10a). Pintan lo que dice `domain/broadcast/montage.ts`; el hook de
 * `StageWatch.tsx` cuenta los cuadros de la previa y de la llegada (con el reloj del reproductor, que se
 * para al ocultar la pestaña), y el cierre pasa sus cuadros solo, cada `closingCardS`, o con el dedo, y se
 * queda en el último. Sustituyen a los provisionales del 3c (`PreviewCard`, `WinnerCard`, `ClosingCard`).
 *
 * Desde el PR 20 (E3, docs/visual.md §14.6; I-10, O-18): las cuatro van en el ámbito oscuro, igual en los
 * dos modos, también el cierre, que era blanco; sus botones son del catálogo, con un solo `primary` por
 * tarjeta (`Watch`, con el icono `play`), y los nombres de sus filas parten de línea en lugar de cortarse
 * (Ruso-040).
 */

/** El ámbito oscuro de una tarjeta (§3.3). */
const dark = 'rounded-ui bg-surface p-4 text-ink'
/** Los títulos van ya en mayúsculas donde las lleva el texto (§8.6): `STAGE 18 · SUMMIT FINISH · 185 km`. */
const caption = 'text-caption font-semibold tracking-caps'

/** Los puntos de un pase de cuadros: cuál se ve de cuántos. */
function Dots({ n, at }: { n: number; at: number }) {
  if (n <= 1) return null
  return (
    <span className="flex gap-1" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i === at ? 'bg-current' : 'bg-current opacity-30'}`}
        />
      ))}
    </span>
  )
}

/**
 * LA PREVIA (§8.6): el cuadro `index` de los de `previewCardsOf`, cada uno `previewCardS`, y `▶ Watch`
 * para empezar ya.
 */
export function StagePreviewCards({
  cards,
  index,
  onWatch,
}: {
  cards: readonly PreviewCard[]
  index: number
  onWatch: () => void
}) {
  const at = Math.max(0, Math.min(cards.length - 1, index))
  const card = cards[at]
  if (card === undefined) return null
  return (
    <div
      data-surface="dark"
      className={dark}
      role="region"
      aria-label="Before the start"
      data-preview-card={card.k}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <PreviewCardView card={card} />
        </div>
        <Button variant="primary" icon="play" ariaLabel="Play" onClick={onWatch}>
          Watch
        </Button>
      </div>
      <div className="mt-3 text-ink-2">
        <Dots n={cards.length} at={at} />
      </div>
    </div>
  )
}

/** Un cuadro de la previa, sin estado: se exporta para probar cada uno. */
export function PreviewCardView({ card }: { card: PreviewCard }) {
  switch (card.k) {
    case 'route':
      return (
        <>
          <p className={caption}>{card.title}</p>
          <ul className="mt-1 space-y-0.5 text-meta text-ink">
            {card.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </>
      )
    case 'weather':
      return (
        <>
          <p className={caption}>WEATHER</p>
          <ul className="mt-1 space-y-0.5 text-meta text-ink">
            {card.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </>
      )
    case 'jerseys':
      return (
        <>
          <p className={caption}>JERSEYS IN PLAY</p>
          <ul className="mt-1 space-y-1 text-meta text-ink">
            {card.rows.map((r) => (
              <li key={r.text} className="flex items-start gap-2">
                {r.jersey !== null && <LeaderJersey kind={r.jersey} size={28} />}
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        </>
      )
    case 'favourites':
      return (
        <>
          <p className={caption}>FAVOURITES</p>
          <ul className="mt-1 space-y-0.5 text-meta text-ink">
            {card.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </>
      )
  }
}

/** LA LLEGADA (§8.7): el cuadro del momento, el ganador, un grupo que llega o el fuera de control. */
export function ArrivalCardView({ card }: { card: ArrivalCard }) {
  const tone = card.k === 'winner' ? 'text-gold' : 'text-ink-2'
  return (
    <div data-surface="dark" className={dark} role="status" data-arrival-card={card.k}>
      <p className={`${caption} ${tone}`}>{card.title}</p>
      <p className={card.k === 'winner' ? 'text-title font-bold' : 'text-body font-semibold'}>
        {card.detail}
      </p>
    </div>
  )
}

/**
 * `WHILE YOU SKIPPED` Y `PREVIOUSLY` (§8.5, 8-i, 8-n): como mucho `recapMaxCues` rótulos de clase ≥ 2, en
 * orden de carrera, con el reloj quieto, `cueHoldS[3]` o hasta que se tocan.
 */
export function RecapCard({ recap, onDone }: { recap: RecapView; onDone: () => void }) {
  return (
    <div data-surface="dark" className={dark} role="status" aria-live="polite" data-recap="">
      <div className="flex items-center justify-between gap-3">
        <p className={caption}>{recap.title}</p>
        <Button variant="quiet" size="sm" onClick={onDone}>
          Continue
        </Button>
      </div>
      {recap.rows.length === 0 ? (
        <p className="mt-1 text-meta text-ink-2">Nothing to tell yet.</p>
      ) : (
        <ol className="mt-1 space-y-0.5 text-meta">
          {recap.rows.map((r) => (
            <li key={r.key} className="flex gap-3">
              <span className="w-14 shrink-0 tabular-nums text-ink-2">{r.where}</span>
              <span className="min-w-0 break-words">
                <span className="font-semibold">{r.title}</span>
                {r.detail !== null && <span className="text-ink-2"> · {r.detail}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/**
 * EL CIERRE (§8.6): los cuadros de `closingCardsOf`, cada `closingCardS` o con un toque, y el último se
 * queda. El último lleva la siguiente (`Next: Stage 19 · 204 km · Hills` con `Watch`) y siempre `Report`.
 */
export function StageClosingCards({
  cards,
  nextHref,
  onReport,
}: {
  cards: readonly ClosingCard[]
  /** la página de la siguiente, en `Watch`; null si no hay */
  nextHref: (day: number) => string
  onReport: () => void
}) {
  const [at, setAt] = useState(0)
  const last = cards.length - 1
  useEffect(() => {
    if (at >= last) return
    const id = window.setTimeout(() => setAt((i) => i + 1), BROADCAST.closingCardS * 1000)
    return () => window.clearTimeout(id)
  }, [at, last])
  const card = cards[Math.min(at, last)]
  if (card === undefined) return null
  return (
    <div data-surface="dark" className={dark} data-closing="">
      <ClosingCardView card={card} nextHref={nextHref} onReport={onReport} />
      <div className="mt-3 flex items-center justify-between text-ink-2">
        <Dots n={cards.length} at={Math.min(at, last)} />
        {at < last && (
          <Button variant="quiet" size="sm" onClick={() => setAt((i) => Math.min(last, i + 1))}>
            Next card
          </Button>
        )}
      </div>
    </div>
  )
}

const title = 'text-caption font-semibold tracking-caps text-ink-2'

/** Un cuadro del cierre, sin estado: se exporta para probar cada uno. */
export function ClosingCardView({
  card,
  nextHref,
  onReport,
}: {
  card: ClosingCard
  nextHref: (day: number) => string
  onReport: () => void
}) {
  switch (card.k) {
    case 'result':
      return (
        <>
          <h2 className={title}>{card.title}</h2>
          <ol className="mt-2 space-y-1 text-meta">
            {card.rows.map((r) => (
              <li
                key={r.key}
                data-podium={r.podium ? '' : undefined}
                className={`flex gap-2 ${r.podium ? 'font-semibold' : ''}`}
              >
                <span className="w-6 shrink-0 text-right tabular-nums text-ink-2">{r.pos}</span>
                <span className="min-w-0 flex-1 break-words text-ink">
                  {r.name}
                  {r.own ? ' (your rider)' : ''}
                  {r.team !== null && (
                    <>
                      {' '}
                      <span className="ml-1 text-caption font-normal text-ink-2">{r.team}</span>
                    </>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-ink-2">
                  {r.time}
                  {r.note !== null && (
                    <span className="ml-1 text-caption font-normal text-ink-2">{r.note}</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </>
      )
    case 'gc':
      return (
        <>
          <h2 className={title}>{card.title}</h2>
          <ol className="mt-2 space-y-1 text-meta">
            {card.rows.map((r) => (
              <li key={r.key} className="flex gap-2">
                <span className="w-6 shrink-0 text-right tabular-nums text-ink-2">{r.rank}</span>
                <span className="w-8 shrink-0 text-caption tabular-nums text-ink-2">{r.move}</span>
                <span className="min-w-0 flex-1 break-words text-ink">
                  {r.name}
                  {r.own ? ' (your rider)' : ''}
                </span>
                <span className="shrink-0 tabular-nums text-ink-2">{r.gap}</span>
              </li>
            ))}
          </ol>
        </>
      )
    case 'jerseys':
      return (
        <>
          <h2 className={title}>{card.title}</h2>
          <ul className="mt-2 space-y-1 text-meta text-ink">
            {card.rows.map((r) => (
              <li key={r.jersey} className="flex items-center gap-2">
                <LeaderJersey kind={r.jersey} size={28} />
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        </>
      )
    case 'outFront':
      return (
        <>
          <h2 className={title}>{card.title}</h2>
          <p className="mt-2 text-meta text-ink">{card.text}</p>
        </>
      )
    case 'out':
      return (
        <>
          <h2 className={title}>{card.title}</h2>
          <ul className="mt-2 space-y-1 text-meta text-ink">
            {card.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </>
      )
    case 'next':
      return (
        <div className="flex flex-wrap items-center gap-3 text-meta">
          {card.text !== null && <span className="text-ink">{card.text}</span>}
          {card.nextDay !== null && (
            <Button variant="primary" icon="play" to={nextHref(card.nextDay)}>
              Watch
            </Button>
          )}
          <Button variant="secondary" onClick={onReport}>
            Report
          </Button>
        </div>
      )
  }
}
