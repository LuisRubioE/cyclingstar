import {
  ATTRIBUTES,
  ATTRIBUTE_DESCRIPTIONS,
  ATTRIBUTE_LABELS,
  type Attribute,
  type CeilingOpinion,
  SESSION_CATALOG,
  type TrendCode,
  sessionsForAttribute,
} from '@cyclingstar/shared'
import { COACH_OPINION_TEXT } from '../domain/coachOpinion'
import { TREND_WORD } from '../domain/words'
import { Icon } from './ui/Icon'
import { InfoButton } from './ui/InfoButton'
import { MeterSegments } from './ui/Meter'
import { StarRating } from './ui/StarRating'

/**
 * The extra layer that only YOUR OWN sheet gets (docs/entrenamiento.md §2.3): the progress mark
 * inside the band, the 28-day trend arrow and the coach's opinion. Other riders' profiles show
 * stars and nothing else — scouting someone else's potential isn't a thing you can do yet.
 */
export interface AttributeDetail {
  /**
   * The 28-day arrow per attribute, as the code `GET /trend` sends (E3, 13-a): the Δ it comes from stays on
   * the server. Missing means it didn't move.
   */
  trend?: Partial<Record<Attribute, TrendCode>>
  /**
   * What the coach makes of each attribute: RELATIVE to the rest of this rider, and vaguer the less
   * he knows him (docs/agenda.md §4.20). Never a level, never stars.
   */
  opinion?: Partial<Record<Attribute, CeilingOpinion>>
}

/**
 * Las opiniones que solo lleva un atributo, el de techo más alto que ve el entrenador (`ceilingOpinions`,
 * `packages/engine/src/coachView.ts`): `lo_tuyo` en la lectura clara y `asoma` en la primera. La de la lectura
 * que se forma, `apunta`, la llevan varios, y no dice cuál es el más alto: esa no sale a la vista.
 */
const TECHO: readonly CeilingOpinion[] = ['lo_tuyo', 'asoma']

/**
 * Four segments under the stars: which quarter of its band the attribute sits in, as the API sends it
 * (`mark`, 0 to 3; E3, 13-b), in the segments of the `Meter` (§4.6; PR 21h), with its words for the reader.
 *
 * Four and not a continuous bar, on purpose: a continuous bar over a 16-point band would resolve
 * the attribute to under half a point, which is more resolution than the half-stars themselves and
 * amounts to showing the internal number through the back door.
 */
function ProgressMark({ mark }: { mark: number }) {
  return (
    <span className="flex">
      <MeterSegments value={mark + 1} />
      <span className="sr-only">{`${mark + 1} of 4 through this band`}</span>
    </span>
  )
}

/** How far the `trend` icon turns for each code: up, up the diagonal, flat, down the diagonal, down. */
const TREND_TURN: Readonly<Record<TrendCode, -90 | -45 | 0 | 45 | 90>> = {
  sube_mucho: -90,
  sube: -45,
  igual: 0,
  baja: 45,
  baja_mucho: 90,
}

/** The 28-day arrow: the `trend` icon turned for its code, with its words, in its tone (E3, 13-a; PR 21h). */
function TrendArrow({ code }: { code: TrendCode }) {
  const tone =
    code === 'sube_mucho' || code === 'sube'
      ? 'text-good'
      : code === 'baja_mucho' || code === 'baja'
        ? 'text-bad'
        : 'text-ink-3'
  return (
    <span className={tone}>
      <Icon name="trend" size={16} turn={TREND_TURN[code]} label={TREND_WORD[code]} />
    </span>
  )
}

/**
 * Attribute list (#8): what each attribute is, what it's for and which training sessions improve it, behind
 * its `InfoButton` (E3, §4.6; PR 21h). TAC also learns from racing. The stars, and the mark of your own
 * rider, come from the API already in their screen form (E3, §13.5): the value they come from never reaches
 * the browser. Ten rows of 44, the stars at 20; on your own sheet, the arrow and the mark, and the coach's
 * opinion in each box, with the one about your biggest potential out in view, under its row.
 */
export function AttributeList({
  attributes,
  detail,
}: {
  attributes: Readonly<Record<Attribute, { readonly stars: number; readonly mark?: number }>>
  detail?: AttributeDetail
}) {
  const techo = ATTRIBUTES.find((a) => {
    const o = detail?.opinion?.[a]
    return o !== undefined && TECHO.includes(o)
  })
  return (
    <ul className="grid sm:grid-cols-2 sm:gap-x-8">
      {ATTRIBUTES.map((attr) => {
        const { stars, mark } = attributes[attr]
        const trainedBy = sessionsForAttribute(attr).map((s) => SESSION_CATALOG[s].label)
        const opinion = detail?.opinion?.[attr]
        const trend = detail?.trend?.[attr] ?? 'igual'
        return (
          <li
            key={attr}
            className="flex min-h-11 flex-wrap items-center gap-x-2 border-b border-line py-1 last:border-0"
          >
            <span className="text-row text-ink">{ATTRIBUTE_LABELS[attr]}</span>
            <span className="ml-auto flex items-center gap-2">
              {detail && <TrendArrow code={trend} />}
              <span className="grid justify-items-end gap-1">
                <StarRating value={stars} size={20} />
                {detail && mark !== undefined && <ProgressMark mark={mark} />}
              </span>
            </span>
            <InfoButton label={`About ${ATTRIBUTE_LABELS[attr]}`}>
              <span className="block">{ATTRIBUTE_DESCRIPTIONS[attr]}</span>
              <span className="block pt-2">
                <span className="font-semibold text-ink">Improve with: </span>
                {trainedBy.length > 0 ? trainedBy.join(', ') : 'racing experience'}
                {attr === 'TAC' && trainedBy.length > 0 && ', and racing'}
              </span>
              {detail && (
                <span className="block pt-2">{`Last 28 days: ${TREND_WORD[trend]}`}</span>
              )}
              {opinion && (
                <span className="block pt-2">
                  <span className="font-semibold text-ink">Coach: </span>
                  {COACH_OPINION_TEXT[opinion]}
                </span>
              )}
            </InfoButton>
            {/* la frase del entrenador a la vista, junto al atributo de techo más alto (§4.6, punto 4) */}
            {techo === attr && opinion && (
              <p className="basis-full pb-2 text-meta text-ink-2">
                <span className="font-semibold text-ink">Coach: </span>
                {COACH_OPINION_TEXT[opinion]}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
