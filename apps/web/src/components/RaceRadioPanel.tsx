import { useMemo, useState } from 'react'
import type { RaceRadio, RadioGroup, RadioGroupKind, RadioRider } from '@cyclingstar/shared'
import { Flag } from './Flag'
import { LeaderJersey } from './Jersey'

/**
 * LA RACE RADIO: la carrera en UN punto del recorrido.
 *
 * La primera versión era una lista vertical de kilómetros, y el dueño la mandó a paseo con razón:
 * «en lugar de ver en vertical cada km, quiero que solo muestres al mismo tiempo un punto… ahora
 * mostrando siempre solo una foto, tienes mucho más espacio».
 *
 * Así que esto es UNA foto —un kilómetro— con todo el ancho para ella, y una barra para moverse por
 * la etapa. Lo que se ve en esa foto responde a las preguntas que se hacen mirando una carrera:
 *
 *  - **Qué grupos hay**, con su nombre de carretera (grupo de cabeza, persecución, pelotón, grupeto)
 *    y cuánta gente lleva cada uno.
 *  - **A cuánto**, y de dos maneras porque son dos preguntas: al líder de carrera y al grupo de
 *    delante. Antes se enseñaba una sola cifra sin decir cuál era, que es lo que no se entendía.
 *  - **A qué velocidad** pasan por ahí. Sustituye al % de depósito de la primera versión, que era el
 *    tanque de energía del motor: una magnitud real, pero que no se ve en ninguna carrera y que sin
 *    una explicación al lado no significa nada.
 *  - **Quién tira y quién va a rueda**, que son cosas distintas: los que están pasando por el relevo
 *    salen todos —si son veinte, veinte—, y detrás los que hay que ver aunque se guarden (maillots y
 *    jefes de filas). Los demás se cuentan.
 */

/**
 * QUÉ PARTE DE LA CARRERA HAY QUE LLEVAR PARA LLAMARSE PELOTÓN. Dos tercios de los que siguen en
 * carrera. El número sale de las dos quejas que lo fijan, una por cada lado:
 *
 *  - un grupo de **129** con la carrera casi entera dentro salía como «Lead group» solo por haber
 *    perdido a alguien —el listón era `size >= racing`, o sea el pelotón EN PLENO—, y un pelotón
 *    sigue siendo el pelotón aunque se le haya escapado una fuga y se le haya caído un grupeto;
 *  - y cuando la carrera se parte en **59 y 65**, el de 65 tampoco es «el pelotón»: es media
 *    carrera. Con mayoría simple (65 de 124 es un 52 %) se habría seguido llamando pelotón, así que
 *    la mayoría no vale como listón.
 */
const PELOTON_MIN_SHARE = 2 / 3

/** `2nd`, `3rd`… para cuando no hay pelotón y a los grupos hay que llamarlos por su sitio. */
function ordinal(n: number): string {
  const rest = n % 100
  if (rest >= 11 && rest <= 13) return `${n}th`
  const last = n % 10
  return `${n}${last === 1 ? 'st' : last === 2 ? 'nd' : last === 3 ? 'rd' : 'th'}`
}

/** El nombre de carretera de cada grupo, que es como se anuncia por la radio. */
export function groupName(
  kind: RadioGroupKind,
  position: number,
  size: number,
  racing: number,
): string {
  // El pelotón se llama por lo que ES —cuánta carrera lleva dentro— y no por dónde va: si va en
  // cabeza porque no se ha escapado nadie, sigue siendo el pelotón y no «una fuga».
  if (kind === 'peloton' && size >= racing * PELOTON_MIN_SHARE) {
    return size >= racing ? 'Bunch together' : 'Peloton'
  }
  if (position === 0) return 'Lead group'
  if (kind === 'contra') return 'Chase group'
  if (kind === 'tierra') return 'No man’s land'
  if (kind === 'grupeto') return 'Grupetto'
  // Llevaba el título de pelotón pero ya no manda en la carrera: se le llama por su sitio en la
  // carretera, que es lo único cierto que se puede decir de él.
  if (kind === 'peloton') return `${ordinal(position + 1)} group`
  return 'Group'
}

const KIND_DOT: Record<RadioGroupKind, string> = {
  fuga: 'bg-emerald-500',
  contra: 'bg-amber-500',
  peloton: 'bg-indigo-500',
  tierra: 'bg-slate-400',
  grupeto: 'bg-slate-300',
}

/** `m:ss`. El líder de carrera no lleva hueco: va a raya. */
export function radioGap(seconds: number): string {
  if (seconds <= 0) return '—'
  const s = Math.round(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Cómo va este hombre: dando la cara, relevando colocado, o a rueda. */
const ROLE_MARK: Record<RadioRider['role'], { icon: string; title: string; cls: string }> = {
  front: { icon: '⏵', title: 'On the front, into the wind', cls: 'text-rose-600' },
  relay: { icon: '↻', title: 'Taking turns in the rotation', cls: 'text-amber-600' },
  sheltered: { icon: '⌂', title: 'Sitting in, sheltered', cls: 'text-slate-400' },
}

function RiderLine({ r }: { r: RadioRider }) {
  const mark = ROLE_MARK[r.role]
  return (
    <li className="flex items-center gap-1.5 text-xs">
      <span className={`w-3 shrink-0 text-center ${mark.cls}`} title={mark.title}>
        {mark.icon}
      </span>
      {r.jersey ? (
        <LeaderJersey kind={r.jersey} size={14} />
      ) : (
        <span className="w-[14px] shrink-0" aria-hidden="true" />
      )}
      {r.country ? (
        <Flag code={r.country} size={12} />
      ) : (
        <span className="w-3 shrink-0" aria-hidden="true" />
      )}
      <span className="w-7 shrink-0 text-right font-mono text-[11px] text-slate-400">
        {r.bib ?? ''}
      </span>
      <span className="truncate text-slate-700">{r.name}</span>
      {r.team && <span className="truncate text-[11px] text-slate-400">{r.team}</span>}
    </li>
  )
}

function GroupCard({ g, position, racing }: { g: RadioGroup; position: number; racing: number }) {
  /**
   * TRES LISTAS Y NO DOS, porque son tres cosas distintas y el motor las distingue desde la v15.
   *
   * «Driving the group» las juntaba, y de ahí la queja: en el km 1 salían doce hombres de seis
   * equipos «tirando del pelotón», que no tiene ningún sentido. Y no lo tenía porque no era verdad:
   * en un pelotón el turno de relevos son cuarenta hombres, y de esos **los que de verdad dan la
   * cara al viento son los del equipo que ha tomado el frente** (`onTheFront` en el motor, que paga
   * `shelterWorking`); el resto van en el turno pero colocados detrás, a `shelterRelay`.
   *
   * Juntarlos convertía «el equipo X está tirando» —que es la frase que se quiere leer— en una
   * ensalada de nombres sueltos de media parrilla.
   */
  const front = g.riders.filter((r) => r.role === 'front')
  const rotation = g.riders.filter((r) => r.role === 'relay')
  const sitting = g.riders.filter((r) => r.role === 'sheltered')
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`h-2.5 w-2.5 rounded-full ${KIND_DOT[g.kind]}`} aria-hidden="true" />
        <h3 className="font-semibold text-slate-800">
          {groupName(g.kind, position, g.size, racing)}
        </h3>
        <span className="text-sm text-slate-500">
          {g.size} rider{g.size === 1 ? '' : 's'}
        </span>
        {g.speedKmh !== null && (
          <span className="ml-auto font-mono text-sm text-slate-600">{g.speedKmh} km/h</span>
        )}
      </div>

      {/* Los DOS huecos, cada uno dicho por su nombre: era la queja exacta. */}
      {position > 0 && (
        <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-slate-500">
          <span>
            <span className="font-mono text-slate-700">{radioGap(g.gapS)}</span> behind the leaders
          </span>
          <span>
            <span className="font-mono text-slate-700">{radioGap(g.gapToPrevS)}</span> behind the
            group ahead
          </span>
        </div>
      )}

      {front.length > 0 && (
        <>
          <p className="mt-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            On the front ({front.length})
          </p>
          <ul className="mt-0.5 space-y-0.5">
            {front.map((r) => (
              <RiderLine key={`${r.name}-${r.bib ?? ''}`} r={r} />
            ))}
          </ul>
        </>
      )}
      {rotation.length > 0 && (
        <>
          <p className="mt-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            {/* En una fuga NO hay «equipo al frente», así que aquí van los que se relevan: los seis
                de la fuga rodando a turnos son, literalmente, quien la lleva. */}
            {front.length > 0
              ? `In the rotation (${rotation.length})`
              : `Taking turns (${rotation.length})`}
          </p>
          <ul className="mt-0.5 space-y-0.5">
            {rotation.map((r) => (
              <RiderLine key={`${r.name}-${r.bib ?? ''}`} r={r} />
            ))}
          </ul>
        </>
      )}
      {sitting.length > 0 && (
        <>
          <p className="mt-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            Sitting in
          </p>
          <ul className="mt-0.5 space-y-0.5">
            {sitting.map((r) => (
              <RiderLine key={`${r.name}-${r.bib ?? ''}`} r={r} />
            ))}
          </ul>
        </>
      )}
      {g.unnamed > 0 && (
        <p className="mt-2 text-xs text-slate-400">
          +{g.unnamed} rider{g.unnamed === 1 ? '' : 's'} more
        </p>
      )}
    </div>
  )
}

export function RaceRadioPanel({ radio }: { radio: RaceRadio }) {
  // Se abre en la SALIDA, donde el pelotón va entero salvo en una crono: es el punto en que la foto
  // se entiende sin haber leído nada, y desde ahí se avanza.
  const [i, setI] = useState(0)
  const last = radio.kms.length - 1
  const row = radio.kms[Math.min(i, last)]
  const step = useMemo(() => (n: number) => setI((x) => Math.max(0, Math.min(last, x + n))), [last])
  if (!row) return null
  const btn =
    'rounded-lg border border-slate-200 px-2.5 py-1 font-mono text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40'
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-lg font-semibold text-slate-800">Race Radio</h2>
        <span className="text-sm text-slate-500">
          {row.racing} racing
          {row.gone > 0 ? ` · ${row.gone} out` : ''} of {radio.starters}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-3xl font-semibold text-slate-800">
          {Math.round(row.km)}
        </span>
        <span className="text-sm text-slate-500">km</span>
      </div>

      <input
        type="range"
        min={0}
        max={last}
        value={Math.min(i, last)}
        onChange={(e) => setI(Number(e.target.value))}
        aria-label="Point on the course"
        className="mt-2 w-full accent-indigo-600"
      />

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button type="button" className={btn} onClick={() => step(-20)} disabled={i === 0}>
          −20
        </button>
        <button type="button" className={btn} onClick={() => step(-5)} disabled={i === 0}>
          −5
        </button>
        <button type="button" className={btn} onClick={() => step(-1)} disabled={i === 0}>
          ◀ km
        </button>
        <button type="button" className={btn} onClick={() => step(1)} disabled={i >= last}>
          km ▶
        </button>
        <button type="button" className={btn} onClick={() => step(5)} disabled={i >= last}>
          +5
        </button>
        <button type="button" className={btn} onClick={() => step(20)} disabled={i >= last}>
          +20
        </button>
        <button type="button" className={`${btn} ml-auto`} onClick={() => setI(last)}>
          Finish
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {row.groups.map((g, gi) => (
          <GroupCard key={`${g.kind}-${gi}`} g={g} position={gi} racing={row.racing} />
        ))}
      </div>
    </div>
  )
}
