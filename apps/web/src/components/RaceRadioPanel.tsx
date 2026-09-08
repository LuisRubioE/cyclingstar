import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type {
  JerseyKind,
  RaceRadio,
  RadioGroup,
  RadioGroupKind,
  RadioRider,
} from '@cyclingstar/shared'
// El listón de «esto es el pelotón» vive en el motor (v34), que es quien lo usa también para la
// radio de terminal: web y terminal no pueden decir cosas distintas del mismo grupo.
import { isTheBunch } from '@cyclingstar/engine'
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

/** `2nd`, `3rd`… para cuando no hay pelotón y a los grupos hay que llamarlos por su sitio. */
function ordinal(n: number): string {
  const rest = n % 100
  if (rest >= 11 && rest <= 13) return `${n}th`
  const last = n % 10
  return `${n}${last === 1 ? 'st' : last === 2 ? 'nd' : last === 3 ? 'rd' : 'th'}`
}

/**
 * El nombre de carretera de cada grupo, que es como se anuncia por la radio.
 *
 * …Y EL GRUPO DONDE VA EL MAILLOT SE LLAMA POR ÉL (v58). El dueño: «el grupo del líder, en caso de
 * que no sea el pelotón ni la cabeza de carrera, podría llamarse *grupo del maillot amarillo* en vez
 * de *grupo 3*». Y tiene razón: «tercer grupo» es lo único cierto que se puede decir de un grupo
 * cualquiera, pero cuando dentro va el hombre que lleva la carrera, eso es lo que ES.
 *
 * Solo cuando no es ya otra cosa más importante: el pelotón se sigue llamando pelotón —el maillot
 * va ahí casi siempre— y la cabeza de carrera, cabeza de carrera.
 */
export function groupName(
  kind: RadioGroupKind,
  position: number,
  size: number,
  racing: number,
  jerseyDentro?: JerseyKind | null,
): string {
  // El pelotón se llama por lo que ES —cuánta carrera lleva dentro— y no por dónde va: si va en
  // cabeza porque no se ha escapado nadie, sigue siendo el pelotón y no «una fuga».
  if (isTheBunch(kind, size, racing)) {
    return size >= racing ? 'Bunch together' : 'Peloton'
  }
  if (position === 0) return 'Lead group'
  if (jerseyDentro) return JERSEY_GROUP_NAME[jerseyDentro]
  if (kind === 'contra') return 'Chase group'
  if (kind === 'tierra') return 'No man’s land'
  if (kind === 'grupeto') return 'Grupetto'
  // Llevaba el título de pelotón pero ya no manda en la carrera: se le llama por su sitio en la
  // carretera, que es lo único cierto que se puede decir de él.
  if (kind === 'peloton') return `${ordinal(position + 1)} group`
  return 'Group'
}

/**
 * Cómo se llama el grupo de cada maillot. El de la general manda sobre los otros dos: si en un grupo
 * van el líder y el de la montaña, ése es el grupo del líder.
 */
const JERSEY_GROUP_NAME: Record<JerseyKind, string> = {
  gc: 'Race leader’s group',
  kom: 'KOM leader’s group',
  points: 'Points leader’s group',
}

/**
 * El maillot MÁS IMPORTANTE que va en este grupo, si va alguno. Solo mira a los que la radio nombra,
 * que es justamente a quien hay que poder seguir siempre (`priority` en `radioForStorage`): si un
 * maillot está en un grupo, la radio lo nombra ahí.
 */
function jerseyDelGrupo(g: RadioGroup): JerseyKind | null {
  for (const kind of JERSEY_ORDEN) {
    if (g.riders.some((r) => r.jersey === kind)) return kind
  }
  return null
}
const JERSEY_ORDEN: JerseyKind[] = ['gc', 'kom', 'points']

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

/** Cómo va este hombre: o tira o no tira. */
const ROLE_MARK: Record<RadioRider['role'], { icon: string; title: string; cls: string }> = {
  pulling: { icon: '⏵', title: 'Pulling: taking turns into the wind', cls: 'text-rose-600' },
  sheltered: { icon: '⌂', title: 'Sitting in, sheltered', cls: 'text-slate-400' },
}

/**
 * PARA QUÉ TIRA, en una palabra.
 *
 * Lo pidió el dueño después de ver a un equipo dando relevos en el TERCER grupo mientras su líder
 * iba en el segundo: «¿para qué carajos tiran si en ese grupo donde están no está su líder? ¿Para
 * llevarle 138 ciclistas más a su líder? MAL. No deberían tirar… o no entiendo para qué tiran; o
 * sea, busca de algún modo dejar una evidencia que explique por qué o para qué tira cada ciclista de
 * un grupo».
 *
 * Ésa es la evidencia. La etiqueta sale de la misma rama con la que el motor decidió el turno, así
 * que la tabla ya no obliga a adivinar: o dice algo que se sostiene («his team owns the front —
 * defending the jersey») o dice `just riding`, y entonces lo que hay que mirar es el motor.
 */
/**
 * POR QUÉ TIRA, Y PARA QUIÉN (v57). El dueño, viendo la etiqueta a secas: «dice algo así como *his
 * team's card for this finish*… pero no dice quién es, wey». El nombre del destinatario viaja desde
 * el motor (`pullFor`), así que aquí solo hay que decirlo: sin nombre la frase no responde a la
 * pregunta que se hace quien mira la radio, que es siempre «¿por quién?».
 *
 * `para` puede faltar —etapas anteriores a la v57, o motivos que no tienen destinatario (va solo, va
 * en el abanico, rueda en el grupeto)—, y entonces se cae a la frase genérica de siempre.
 */
function motiveLabel(motivo: string, para: string | null): string | undefined {
  switch (motivo) {
    case 'solo':
      return 'alone — no one else to do it'
    case 'abanico':
      return 'in the echelon — pull or lose the wheel'
    case 'tren':
      return para ? `lead-out for ${para}` : 'lead-out for his sprinter'
    case 'fuga':
      return 'working the break'
    case 'persecucion':
      // v58: ir por delante del grueso no es ir escapado. El dueño, viendo el grupo del maillot ir
      // a por un escapado: «esto no es una escapada, es el grupo del maillot intentando alcanzar
      // al segundo». Aquí se dice lo que es: van a por alguien.
      //
      // v59: y desde que un grupo de DETRÁS que rueda más fuerte que el grueso también es una
      // persecución, la frase sin nombre no puede hablar de «the man up the road» —a quien persigue
      // un grupeto que se ha puesto a tirar es al grupo entero—. «The group ahead» es verdad en los
      // dos casos.
      return para ? `chasing ${para} up the road` : 'chasing the group ahead'
    case 'grupeto':
      return 'just riding — this group is chasing nothing'
    case 'equipo_etapa':
      return para ? `his team's card for this finish: ${para}` : "his team's card for this finish"
    case 'equipo_maillot':
      return para ? `defending the jersey of ${para}` : 'his team defends the jersey'
    case 'equipo_general':
      return para ? `riding the GC for ${para}` : 'his team rides for the GC'
    case 'rol':
      return 'his job in the team'
    default:
      return undefined
  }
}

function RiderLine({ r }: { r: RadioRider }) {
  const mark = ROLE_MARK[r.role]
  const motivo =
    r.role === 'pulling' && r.motivo ? motiveLabel(r.motivo, r.para?.name ?? null) : null
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
      {/* El nombre lleva a su ficha (v58): «cuando salga el nombre de un ciclista que tenga enlace
          a su ficha». Sin id —una etapa congelada de alguien que ya no está— se lee igual, sin
          enlace, que es mejor que un enlace roto. */}
      <span className="truncate text-slate-700">
        {r.id ? (
          <Link to={`/world/riders/${r.id}`} className="hover:text-indigo-600 hover:underline">
            {r.name}
          </Link>
        ) : (
          r.name
        )}
      </span>
      {r.team && <span className="truncate text-[11px] text-slate-400">{r.team}</span>}
      {motivo && (
        <span className="ml-auto shrink-0 truncate text-[11px] text-slate-400 italic">
          {motivo}
        </span>
      )}
    </li>
  )
}

function GroupCard({ g, position, racing }: { g: RadioGroup; position: number; racing: number }) {
  /**
   * UNA LISTA DE LOS QUE TIRAN, Y LOS QUE VAN A RUEDA (v34). Eran tres —«on the front», «in the
   * rotation» y «sitting in»— y la de en medio era el problema: en el pelotón salían 36,5 nombres
   * de 14,9 equipos distintos, que no es «el equipo X está tirando» sino una ensalada de nombres
   * sueltos de media parrilla.
   *
   * El motor ya no distingue esos dos estados (`shelterOf`): o tiras —y entonces te repartes el
   * viento con los otros que tiran— o vas a rueda. La radio dice exactamente lo mismo, con las
   * mismas palabras, que es de lo que iba el encargo.
   */
  const pulling = g.riders.filter((r) => r.role === 'pulling')
  const sitting = g.riders.filter((r) => r.role === 'sheltered')
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`h-2.5 w-2.5 rounded-full ${KIND_DOT[g.kind]}`} aria-hidden="true" />
        <h3 className="font-semibold text-slate-800">
          {groupName(g.kind, position, g.size, racing, jerseyDelGrupo(g))}
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

      {pulling.length > 0 && (
        <>
          <p className="mt-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            Pulling ({pulling.length})
          </p>
          <ul className="mt-0.5 space-y-0.5">
            {pulling.map((r) => (
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
