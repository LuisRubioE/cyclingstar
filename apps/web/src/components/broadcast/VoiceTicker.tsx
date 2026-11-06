import type { ChronicleEntry, LiveLine } from '@cyclingstar/shared'
import { chronicleParts } from '../../domain/stageJournal'
import { type VoiceExtras, type VoiceItem, voiceItemsOf } from '../../domain/voice'
import { Expander } from '../ui/Expander'
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
 * Desde el PR 20 (E3, docs/visual.md §14.5; Ruso-040, 14-i), con tokens. Desde W2 (la revisión de `Watch`
 * del dueño, su punto 7: «aparecen truncados a menudo, no da para leerlos y solo se ve 1, no se ve lo de
 * atrás»), la línea dicha entera: parte de línea en lugar de cortarse (a 360 px, en un renglón solo cabía
 * entera una de cada diez), con tres renglones reservados en cuanto se ha dicho algo, los de nueve de cada
 * diez, para que lo de abajo no salte con cada una. Y `Commentary` va aquí, justo bajo la línea, con las ya
 * dichas contadas (`Commentary · 12`), y no en los mandos, que se esconden a los 3 s sin tocar (8-p): abre
 * el historial debajo, sin repetir la de ahora, que va entera encima.
 */
export function VoiceTicker({
  lines,
  t,
  open,
  onToggle,
  quiet = false,
  unnamed,
  extras,
  rev = 0,
}: {
  lines: readonly LiveLine[]
  t: number
  /** `Commentary`: las líneas ya dichas */
  open: boolean
  /** abre o cierra `Commentary` */
  onToggle?: () => void
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
  // `Commentary` despliega las anteriores: la que dice ahora ya está arriba, entera
  const before = last === undefined ? said : said.slice(0, -1)
  return (
    <div className="space-y-1">
      {/* tres renglones reservados en cuanto hay algo dicho, también callada en el final: no salta lo de abajo */}
      <p className={`${said.length > 0 ? 'min-h-15 ' : ''}text-meta text-ink`} aria-live="off">
        {last !== undefined && <Item item={last} rev={rev} />}
      </p>
      {before.length > 0 && (
        <>
          <Expander expanded={open} controls={HISTORY_ID} onToggle={onToggle ?? (() => undefined)}>
            <span className="text-meta font-semibold text-ink-2">
              Commentary <span className="tabular-nums">· {before.length}</span>
            </span>
          </Expander>
          {/* en el árbol también cerrada, para `aria-controls`; se pinta al abrir */}
          <ol
            id={HISTORY_ID}
            hidden={!open}
            className="max-h-72 space-y-1.5 overflow-y-auto border-t border-line pt-2"
          >
            {open &&
              [...before].reverse().map((l, i) => (
                <li key={`${l.revealS}-${i}`} className="flex gap-2 text-meta">
                  <span className="w-14 shrink-0 text-right tabular-nums text-ink-3">
                    km {l.km}
                  </span>
                  <span className="text-ink">
                    <Item item={l} rev={rev} />
                  </span>
                </li>
              ))}
          </ol>
        </>
      )}
    </div>
  )
}

/** La lista de `Commentary`: una sola voz por página. */
const HISTORY_ID = 'voice-history'

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
