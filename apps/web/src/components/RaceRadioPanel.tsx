import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RIDER_LINK_CLASS } from './RiderName'
import {
  BROADCAST,
  JERSEY_PRIORITY,
  type RaceRadio,
  type RadioGroup,
  type RadioGroupKind,
  type RadioRider,
  groupLabelOf,
  groupLabelText,
  groupRoleOf,
} from '@cyclingstar/shared'
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
 * LOS NOMBRES DE CARRETERA DE LA RADIO (E2, D-18; docs/retransmision.md §6.3, paso 6b): los de la barra
 * de `Watch`, con las mismas funciones (`groupRoleOf`, `groupLabelOf`, `groupLabelText`) sobre la
 * carretera ENTERA del km, porque el papel de un grupo depende de los demás. `Bunch` es el grupo con el
 * título y dos tercios de los que corren (`bunchMinShare`, el listón del motor, `isTheBunch`); entre la
 * cabeza y él, `Chase group`; detrás, `Gruppetto`; sin grueso, persigue lo que va con el título o por
 * delante y la referencia de `chaseReferenceIndex`. El grupo de un maillot de líder que persigue o va
 * descolgado se llama por el maillot (`Race leader’s group`, `Mountains leader’s group`…, por
 * `JERSEY_PRIORITY`), y uno de tres o menos, por sus corredores.
 *
 * Re-sellado a propósito en el 6b (`raceRadioNames.test.tsx`, seis `it`, los ocho casos de §6.3): se
 * retiran `Peloton` (DD-04: la palabra es `Bunch`), `No man’s land` (el suelto se nombra), `2nd group` y
 * `3rd group` (el número de carretera no es identidad; ya va delante de cada fila), `Group` y la grafía
 * `Grupetto`. El grupo de la montaña era `KOM leader’s group`; `KOM` es en `Watch` la pancarta.
 *
 * Un grupo de tres o menos cuyos corredores no salen todos en la radio guardada (que nombra a los que
 * tiran y a los que hay que ver) se llama por su papel: no se inventa a quien no está. La radio desde la
 * línea (11a, `radioFromTimeline`) nombra entero todo grupo de hasta `nameWholeGroupUpTo`, así que en
 * las etapas con línea esos grupos salen por sus nombres, como en la barra; solo uno con un corredor que
 * la ficha no sabe resolver se queda con su papel.
 */
export function radioGroupNames(
  groups: readonly Pick<RadioGroup, 'kind' | 'size' | 'riders'>[],
  racing: number,
): string[] {
  const roles = groupRoleOf(
    groups.map((g) => ({ size: g.size, kind: g.kind })),
    racing,
  )
  return groups.map((g, i) => {
    const role = roles[i]!
    const jerseys = JERSEY_PRIORITY.filter((j) => g.riders.some((r) => r.jersey === j))
    const label =
      g.size <= BROADCAST.byNamesUpTo && g.riders.length < g.size
        ? ({ k: 'role' } as const)
        : groupLabelOf(
            g.size,
            g.riders.map((_, k) => k),
            jerseys,
            role,
            groups.length,
          )
    return groupLabelText('en', label, role, 'bar', (k) => g.riders[k]?.name ?? '')
  })
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
  /**
   * CERO SEGUNDOS NO ES «NO SE SABE» (v70.1). Esto pintaba `—` para todo hueco ≤ 0, y la radio
   * guarda el hueco REDONDEADO a segundos enteros: un grupo a cuatro décimas del de delante se
   * guardaba como 0 y salía con los dos huecos en blanco, que es lo que el dueño vio —un tercer
   * grupo «5:13 detrás del líder y 5:13 detrás del grupo de delante», o sea el de en medio a cero—.
   * Estar a menos de un segundo es una respuesta, y se dice.
   */
  if (seconds < 0) return '—'
  if (seconds === 0) return '0:00'
  const s = Math.round(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Cómo se llama en pantalla lo que le ha pasado a un grupo (UI en inglés). */
const MISHAP_LABEL: Record<'caida' | 'pinchazo' | 'averia', string> = {
  caida: 'Crash',
  pinchazo: 'Puncture',
  averia: 'Mechanical',
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
    /**
     * --- LOS CINCO DEL PASO 17c (R23.1) ---------------------------------------------------------
     *
     * El vocabulario tenía diez palabras y la carretera produce quince. Sin estas cinco frases, los
     * motivos nuevos caían en el `default` y el corredor salía SIN explicación: el motor sabía por
     * qué tiraba y la pantalla no lo decía.
     */
    case 'propio':
      // S-434: ocho hombres en el último puerto y el favorito delante marcando tempo. Eso no es
      // «le toca por su papel»: es el motivo más claro que hay en una carrera.
      return 'setting his own tempo'
    case 'equipo_puntos':
      return para ? `riding the points jersey for ${para}` : 'his team rides for the points jersey'
    case 'equipo_montana':
      return para ? `riding the mountains jersey for ${para}` : 'his team rides for the KOM'
    case 'infiltrado':
      // R03.5, y la gracia es que se narra como que NO tira: su equipo le metió ahí para no tener
      // que perseguir, así que su trabajo es exactamente no hacer ninguno.
      return 'sitting on — his team has no reason to chase'
    case 'colocando':
      return para ? `keeping ${para} out of trouble` : 'keeping his leader out of trouble'
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
      {/*
        EL NOMBRE NO SE ENCOGE, EL MOTIVO SÍ (v59). El dueño: «en el grupo 3 los que tiran no se ve
        su nombre». Y era cierto: el motivo llevaba `shrink-0`, así que en el pelotón —donde la
        frase es larga, «his team's card for this finish: Bojan Kovacic»— toda la presión caía sobre
        el nombre y salía «R… B…». En el grupo de cabeza no pasaba porque «working the break» es
        corto, que es lo que hacía que pareciera cosa del grupo.
        La prioridad es la de una tabla de carrera: primero quién, después para qué.
      */}
      <span className="max-w-[11rem] shrink-0 truncate text-slate-700">
        {r.id ? (
          <Link to={`/world/riders/${r.id}`} className={RIDER_LINK_CLASS}>
            {r.name}
          </Link>
        ) : (
          r.name
        )}
      </span>
      {r.team && <span className="min-w-0 truncate text-[11px] text-slate-400">{r.team}</span>}
      {motivo && (
        <span className="ml-auto min-w-0 truncate text-[11px] text-slate-400 italic">{motivo}</span>
      )}
    </li>
  )
}

function GroupCard({ g, name, position }: { g: RadioGroup; name: string; position: number }) {
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
        <h3 className="font-semibold text-slate-800">{name}</h3>
        <span className="text-sm text-slate-500">
          {g.size} rider{g.size === 1 ? '' : 's'}
        </span>
        {/*
          LA VELOCIDAD, O LO QUE LA SUSTITUYE (v70.1). Un grupo cuyo único hombre se paró a cambiar
          una rueda no tiene velocidad que enseñar: tiene un percance, y ésa es la noticia. Antes
          salía el kilómetro dividido entre el tiempo que estuvo de pie —«16,1 km/h» para un líder
          en solitario que en realidad estaba parado— y eso no era lento: era falso.
        */}
        {g.speedKmh !== null ? (
          <span className="ml-auto font-mono text-sm text-slate-600">{g.speedKmh} km/h</span>
        ) : g.mishap ? (
          <span className="ml-auto text-sm font-medium text-rose-600">
            {MISHAP_LABEL[g.mishap.tipo]} — {radioGap(g.mishap.lostS)} lost
          </span>
        ) : null}
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
          {/*
            LA CUENTA, NO EL TOPE. El dueño: «si en 1 km solo pasa 1 al relevo, no tiene sentido que
            en el pelotón pongamos que pasan 15, porque no es real». Los dos números eran correctos
            —los dos dicen quiénes están en el turno— y aun así la comparación engañaba, porque la
            lista se corta en doce nombres y la cuenta no: medido, en un grupo de 31-100 se relevan
            veintisiete y salían doce. Ahora, cuando se corta, se dice: «Pulling (12 of 27)».
          */}
          <p className="mt-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            Pulling ({pulling.length}
            {g.pullingTotal > pulling.length ? ` of ${g.pullingTotal}` : ''})
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

/**
 * `painted`: LA RADIO HASTA LO PINTADO de una etapa que quien mira no conoce (E2, docs/retransmision.md
 * §11.16, decisión 11-i; paso 11a): solo las fotos cerradas en lo que ha visto, así que el deslizador
 * acaba en la última, no hay `Finish` y la cabecera lo dice: `Race Radio · up to km 142 · as far as
 * you've watched`.
 */
export function RaceRadioPanel({
  radio,
  painted = false,
}: {
  radio: RaceRadio
  painted?: boolean
}) {
  // Se abre en la SALIDA, donde el pelotón va entero salvo en una crono: es el punto en que la foto
  // se entiende sin haber leído nada, y desde ahí se avanza.
  const [i, setI] = useState(0)
  const last = radio.kms.length - 1
  const row = radio.kms[Math.min(i, last)]
  const step = useMemo(() => (n: number) => setI((x) => Math.max(0, Math.min(last, x + n))), [last])
  const names = useMemo(() => (row ? radioGroupNames(row.groups, row.racing) : []), [row])
  if (!row) return null
  const btn =
    'rounded-lg border border-slate-200 px-2.5 py-1 font-mono text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40'
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-lg font-semibold text-slate-800">Race Radio</h2>
        {painted && (
          <span className="text-sm text-slate-500">
            · up to km {Math.round(radio.kms[last]?.km ?? 0)} · as far as you&apos;ve watched
          </span>
        )}
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
        {/* hasta lo pintado no hay meta a la que saltar: la última foto es la última cerrada (11-i) */}
        {!painted && (
          <button type="button" className={`${btn} ml-auto`} onClick={() => setI(last)}>
            Finish
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {row.groups.map((g, gi) => (
          <GroupCard key={`${g.kind}-${gi}`} g={g} name={names[gi] ?? ''} position={gi} />
        ))}
      </div>
    </div>
  )
}
