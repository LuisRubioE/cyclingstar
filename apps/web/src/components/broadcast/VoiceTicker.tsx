import type { ChronicleEntry, LiveLine } from '@cyclingstar/shared'
import { chronicleParts } from '../../domain/stageJournal'
import { type VoiceExtras, type VoiceItem, voiceItemsOf } from '../../domain/voice'
import { Flag } from '../ui/Flag'
import { LeaderJersey } from '../ui/LeaderJersey'

/**
 * LA VOZ (docs/retransmision.md §6.1, §6.10, §12.2 y §12.5; D-43): la última línea dicha, y con
 * `Commentary` las anteriores, la más reciente arriba. Solo lo que la voz ya ha dicho a la hora pintada:
 * nunca una línea con `revealS` mayor que `t`. Calla lo que ya dice el estado (`inVoice`) y, en los
 * últimos `quietFinalM`, todo (§6.9). Cada corredor, con la identidad entera de la frase (bandera,
 * dorsal, nombre, equipo y maillot), como el acta; sin enlaces: un nombre no saca de la retransmisión.
 * Desde el 6b, lo que la web pone en la voz (`voiceItemsOf`, §12.5): la frase de la fuga en lugar de la
 * línea de `breakaway_formed`, la tendencia del hueco y los nombres de una caída en un segundo tiempo.
 *
 * No es una región viva: el anuncio es por rótulo, no por línea (§18.8).
 *
 * Desde el PR 20 (E3, docs/visual.md §14.5; Ruso-040, 14-i): con tokens, y la línea dicha en un renglón
 * de 28 (el de sus maillots), que es lo único de `Watch` que puede cortarse, porque la frase entera queda
 * en el historial: lleva `data-clip-ok`.
 */
export function VoiceTicker({
  lines,
  t,
  open,
  quiet = false,
  unnamed,
  extras,
  rev = 0,
}: {
  lines: readonly LiveLine[]
  t: number
  /** `Commentary`: las líneas ya dichas */
  open: boolean
  /** los últimos `quietFinalM`: la voz calla */
  quiet?: boolean
  /** por línea, el corredor no estaba nombrado antes de ella (`inVoice`, `unnamedBefore`) */
  unnamed: (line: LiveLine) => (riderId: string) => boolean
  extras?: VoiceExtras
  /** la revisión de plantillas de la etapa (`BroadcastHead.tplRev`, §12.7; paso 12): la que elige cada redacción */
  rev?: number
}) {
  const said = voiceItemsOf(lines, t, unnamed, extras)
  const last = quiet ? undefined : said[said.length - 1]
  // `Commentary` despliega las anteriores: la que dice ahora ya está arriba
  const before = last === undefined ? said : said.slice(0, -1)
  return (
    <div className="space-y-2">
      <p data-clip-ok="" className="min-h-7 truncate text-meta text-ink" aria-live="off">
        {last !== undefined && <Item item={last} rev={rev} />}
      </p>
      {open && (
        <ol className="max-h-72 space-y-1.5 overflow-y-auto border-t border-line pt-2">
          {[...before].reverse().map((l, i) => (
            <li key={`${l.revealS}-${i}`} className="flex gap-2 text-meta">
              <span className="w-14 shrink-0 text-right tabular-nums text-ink-3">km {l.km}</span>
              <span className="text-ink">
                <Item item={l} rev={rev} />
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function Item({ item, rev }: { item: VoiceItem; rev: number }) {
  return item.k === 'text' ? <>{item.text}</> : <Sentence e={item.e} rev={rev} />
}

/** Una frase de la voz con sus banderas y sus maillots, como en el acta (`StageStory`). */
function Sentence({ e, rev }: { e: ChronicleEntry; rev: number }) {
  return (
    <>
      {chronicleParts('en', e, rev).map((part, j) =>
        'flag' in part ? (
          <Flag key={j} country={part.flag} height={12} layout="mx-0.5" />
        ) : 'jersey' in part ? (
          <span key={j} className="mx-0.5 inline-flex align-middle">
            <LeaderJersey kind={part.jersey} size={28} />
          </span>
        ) : (
          <span key={j}>{part.text}</span>
        ),
      )}
    </>
  )
}
