import type { ChronicleEntry, LiveLine } from '@cyclingstar/shared'
import { chronicleParts } from '../../domain/stageJournal'
import { type VoiceExtras, type VoiceItem, voiceItemsOf } from '../../domain/voice'
import { Flag } from '../Flag'
import { LeaderJersey } from '../Jersey'

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
 */
export function VoiceTicker({
  lines,
  t,
  open,
  quiet = false,
  unnamed,
  extras,
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
}) {
  const said = voiceItemsOf(lines, t, unnamed, extras)
  const last = quiet ? undefined : said[said.length - 1]
  // `Commentary` despliega las anteriores: la que dice ahora ya está arriba
  const before = last === undefined ? said : said.slice(0, -1)
  return (
    <div className="space-y-2">
      <p className="min-h-[1.25rem] truncate text-sm text-slate-700" aria-live="off">
        {last !== undefined && <Item item={last} />}
      </p>
      {open && (
        <ol className="max-h-72 space-y-1.5 overflow-y-auto border-t border-slate-100 pt-2">
          {[...before].reverse().map((l, i) => (
            <li key={`${l.revealS}-${i}`} className="flex gap-2 text-sm">
              <span className="w-14 shrink-0 text-right tabular-nums text-slate-400">
                km {l.km}
              </span>
              <span className="text-slate-700">
                <Item item={l} />
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function Item({ item }: { item: VoiceItem }) {
  return item.k === 'text' ? <>{item.text}</> : <Sentence e={item.e} />
}

/** Una frase de la voz con sus banderas y sus maillots, como en el acta (`StageStory`). */
function Sentence({ e }: { e: ChronicleEntry }) {
  return (
    <>
      {chronicleParts(e).map((part, j) =>
        'flag' in part ? (
          <Flag key={j} code={part.flag} size={12} className="mx-0.5 align-baseline" />
        ) : 'jersey' in part ? (
          <LeaderJersey key={j} kind={part.jersey} size={13} className="mx-0.5" />
        ) : (
          <span key={j}>{part.text}</span>
        ),
      )}
    </>
  )
}
