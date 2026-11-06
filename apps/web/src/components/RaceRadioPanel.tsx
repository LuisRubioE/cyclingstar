import { useMemo, useState } from 'react'
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
import { Button } from './ui/Button'
import { Flag } from './ui/Flag'
import { InfoButton } from './ui/InfoButton'
import { LeaderJersey } from './ui/LeaderJersey'
import { FOCUS } from './ui/styles'
import { TextLink, gluedLastWord } from './ui/TextLink'

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
 *
 * CON EL SISTEMA (E3, docs/visual.md §14 y §6.4; PR 21m): solo cambia el aspecto. Los tokens donde iba la
 * paleta, la letra de 12 como mínimo, los botones del catálogo y el nombre enlazado con `TextLink`. Los
 * glifos del relevo (`⏵` y `⌂`) se van, porque el rótulo de su lista ya dice lo mismo (3-d), y su porqué,
 * que vivía en un `title`, pasa a un `InfoButton` junto al título (`ui/4`). Nada se corta: la fila parte
 * y crece, y la bandera, el nombre y el maillot van juntos, como en `RiderLabel` (D-00c).
 */

/**
 * LOS NOMBRES DE CARRETERA DE LA RADIO (E2, D-18; docs/retransmision.md §6.3, paso 6b): los de la barra
 * de `Watch`, con las mismas funciones (`groupRoleOf`, `groupLabelOf`, `groupLabelText`) sobre la
 * carretera ENTERA del km, porque el papel de un grupo depende de los demás. `Bunch` es el grupo con el
 * título y dos tercios de los que corren (`bunchMinShare`, el listón del motor, `isTheBunch`); entre la
 * cabeza y él, `Chase group`; detrás, `Gruppetto`; sin grueso, persigue lo que va con el título o por
 * delante y la referencia de `chaseReferenceIndex`. El grupo de un maillot de líder que persigue o va
 * descolgado se llama por el maillot (`Race leader’s group`, `Mountains leader’s group`…, por
 * `JERSEY_PRIORITY`), y desde W1 también el de cabeza con el amarillo que no es el pelotón; uno de tres o
 * menos, por sus corredores.
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

/** El punto de cada grupo, con tokens (PR 21m): la fuga en `good`, la contra en `gold`, el grueso en `accent`. */
const KIND_DOT: Record<RadioGroupKind, string> = {
  fuga: 'bg-good',
  contra: 'bg-gold',
  peloton: 'bg-accent',
  tierra: 'bg-line-strong',
  grupeto: 'bg-line',
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

/**
 * Lo que decían los glifos del relevo en su `title`, ahora en el `InfoButton` del título (PR 21m): cada
 * corredor va ya bajo el rótulo de su lista, `Pulling` o `Sitting in`.
 */
const ROLE_WHY = 'Pulling: taking turns into the wind. Sitting in, sheltered.'

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
  const motivo =
    r.role === 'pulling' && r.motivo ? motiveLabel(r.motivo, r.para?.name ?? null) : null
  return (
    <li className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-caption">
      {/* el orden de D-00c (E3, §14.1; PR 17a): el dorsal, la bandera, el nombre y el maillot */}
      <span className="w-7 shrink-0 text-right tabular-nums text-ink-3">{r.bib ?? ''}</span>
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
        Desde el PR 21m (E3, §6.4) no se corta nada, tampoco el motivo, que suele acabar en un
        nombre: la fila parte de línea. La bandera, el nombre y el maillot, siempre juntos (D-00c),
        como en `RiderLabel`: en `nowrap`, y el nombre parte por sus espacios salvo en su última
        palabra, pegada al maillot. Sin país, la `Flag` deja el hueco de su ancho, que no se lee.
      */}
      <span className="min-w-0 whitespace-nowrap text-ink">
        <Flag country={r.country} height={12} layout="mr-1" />
        {r.id ? (
          <TextLink to={`/world/riders/${r.id}`} variant="rider" inline glueEnd>
            {r.name}
          </TextLink>
        ) : (
          gluedLastWord(r.name)
        )}
        {r.jersey && (
          <span className="ml-1 inline-flex align-middle">
            <LeaderJersey kind={r.jersey} size={28} />
          </span>
        )}
      </span>
      {r.team && <span className="min-w-0 break-words text-ink-3">{r.team}</span>}
      {motivo && <span className="ml-auto min-w-0 break-words text-ink-3 italic">{motivo}</span>}
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
    <div className="rounded-ui border border-line bg-surface p-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {/* redondo con el radio del tema, que a 10 px es un círculo: `rounded-full` es solo de `Chip` (D-07) */}
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-ui ${KIND_DOT[g.kind]}`}
          aria-hidden="true"
        />
        <h3 className="font-semibold text-ink">{name}</h3>
        <span className="text-meta text-ink-2">
          {g.size} rider{g.size === 1 ? '' : 's'}
        </span>
        {/*
          LA VELOCIDAD, O LO QUE LA SUSTITUYE (v70.1). Un grupo cuyo único hombre se paró a cambiar
          una rueda no tiene velocidad que enseñar: tiene un percance, y ésa es la noticia. Antes
          salía el kilómetro dividido entre el tiempo que estuvo de pie —«16,1 km/h» para un líder
          en solitario que en realidad estaba parado— y eso no era lento: era falso.
        */}
        {g.speedKmh !== null ? (
          <span className="ml-auto text-meta tabular-nums text-ink-2">{g.speedKmh} km/h</span>
        ) : g.mishap ? (
          <span className="ml-auto text-meta font-semibold text-bad">
            {MISHAP_LABEL[g.mishap.tipo]} — {radioGap(g.mishap.lostS)} lost
          </span>
        ) : null}
      </div>

      {/* Los DOS huecos, cada uno dicho por su nombre: era la queja exacta. */}
      {position > 0 && (
        <div className="mt-1 flex flex-wrap gap-x-4 text-caption text-ink-2">
          <span>
            <span className="tabular-nums text-ink">{radioGap(g.gapS)}</span> behind the leaders
          </span>
          <span>
            <span className="tabular-nums text-ink">{radioGap(g.gapToPrevS)}</span> behind the group
            ahead
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
          <p className="mt-2 text-caption font-semibold tracking-caps text-ink-3 uppercase">
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
          <p className="mt-2 text-caption font-semibold tracking-caps text-ink-3 uppercase">
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
        <p className="mt-2 text-caption text-ink-3">
          +{g.unnamed} rider{g.unnamed === 1 ? '' : 's'} more
        </p>
      )}
    </div>
  )
}

/**
 * LOS SALTOS, CON EL `Button` DEL CATÁLOGO (PR 21m): su texto y cuántos km mueve. Antes, en un borde, los
 * que no podían moverse estaban `disabled` y no se podían pulsar. Ahora es una decisión: no se
 * deshabilitan, porque deshabilitar pide su porqué a la vista (§4.1), que saldría repetido bajo tres
 * botones, y quitarlos movería el de al lado bajo el dedo. Se pueden pulsar y no mueven la foto, porque
 * `step` no sale de la etapa.
 */
const JUMPS: readonly (readonly [string, number])[] = [
  ['−20', -20],
  ['−5', -5],
  ['◀ km', -1],
  ['km ▶', 1],
  ['+5', 5],
  ['+20', 20],
]

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
  return (
    <div className="rounded-ui border border-line bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-title text-ink">Race Radio</h2>
        {painted && (
          <span className="text-meta text-ink-2">
            · up to km {Math.round(radio.kms[last]?.km ?? 0)} · as far as you&apos;ve watched
          </span>
        )}
        <span className="text-meta text-ink-2">
          {row.racing} racing
          {row.gone > 0 ? ` · ${row.gone} out` : ''} of {radio.starters}
        </span>
        <InfoButton label="About pulling and sitting in">{ROLE_WHY}</InfoButton>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-display tabular-nums text-ink">{Math.round(row.km)}</span>
        <span className="text-meta text-ink-2">km</span>
      </div>

      {/* el deslizador nativo, con tokens y 44 de alto (§6.4): el catálogo no tiene uno */}
      <input
        type="range"
        min={0}
        max={last}
        value={Math.min(i, last)}
        onChange={(e) => setI(Number(e.target.value))}
        aria-label="Point on the course"
        className={`mt-2 block h-11 w-full accent-accent ${FOCUS}`}
      />

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {JUMPS.map(([text, n]) => (
          <Button key={text} size="sm" onClick={() => step(n)}>
            {text}
          </Button>
        ))}
        {/* hasta lo pintado no hay meta a la que saltar: la última foto es la última cerrada (11-i) */}
        {!painted && (
          <Button size="sm" layout="ml-auto" onClick={() => setI(last)}>
            Finish
          </Button>
        )}
      </div>

      {/* tres columnas desde `lg`: el sistema no tiene `xl` (§3.5; PR 21m) */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {row.groups.map((g, gi) => (
          <GroupCard key={`${g.kind}-${gi}`} g={g} name={names[gi] ?? ''} position={gi} />
        ))}
      </div>
    </div>
  )
}
