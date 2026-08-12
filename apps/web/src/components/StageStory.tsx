import { JERSEY_PRIORITY, type StageReplay } from '@cyclingstar/shared'
import { Flag } from './Flag'
import { LeaderJersey, RiderJersey } from './Jersey'
import { RiderName } from './RiderName'
import { chronicleParts, timeTrialStory } from '../domain/stageJournal'
import { formatTime } from '../domain/format'
import { raceTeamLabel } from '../domain/labels'

/**
 * El journal de una etapa: cómo se desarrolló y quién ganó. Es el contenido con más carga emocional
 * del juego, y por eso lo pintan dos sitios:
 *
 * - `StageReplay`, en la pestaña `Story` de una etapa de una carrera por etapas;
 * - `Race`, en la pestaña `Story` de una carrera de UN DÍA, donde la carrera y la etapa son la
 *   misma cosa y llegar aquí costaba tres clics (docs/navegacion.md §7.1).
 *
 * `onFullResult` es opcional: si la página tiene una pestaña de resultado completo, el podio ofrece
 * el atajo; si no, no se pinta el botón.
 */
export function StageStory({
  data,
  onFullResult,
}: {
  data: StageReplay
  onFullResult?: () => void
}) {
  const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
  const head = 'text-xs font-semibold uppercase tracking-wide text-slate-400'
  const results = data.results ?? []
  // En una carrera de un día la etapa ES la carrera: el rótulo lo dice como lo diría un periódico.
  const oneDay = data.race?.stageCount === 1
  // ¿Hay crónica que contar? En una CRONO hace falta más de una línea: las corridas antes de la v18
  // guardaron un único evento (el ganador en meta) y con eso no se cuenta una tarde de reloj, así
  // que esas siguen con el resumen reconstruido desde los tiempos (`timeTrialStory`).
  const hasChronicle = data.timeTrial
    ? (data.chronicle?.length ?? 0) > 1
    : (data.chronicle?.length ?? 0) > 0
  // Los maillots que se llevaban PUESTOS ese día (la clasificación tras la etapa anterior). Son los
  // que nombra la crónica, y no los de las tablas de esta misma página, que son los de DESPUÉS.
  const onRoad = data.leaders?.onRoad
  // El nombre de cada líder sale de lo que ya trae la página (la general de la etapa y el
  // resultado): no hace falta que la API lo repita. Y un maillot cuyo dueño no se sepa nombrar no
  // se pinta —un icono suelto sin nombre no dice nada—, en vez de dejar el hueco.
  const nameOf = new Map([...(data.gc ?? []), ...results].map((r) => [r.riderId, r.name] as const))
  const leaderName = (riderId: string | null | undefined): string | undefined =>
    riderId ? nameOf.get(riderId) : undefined
  const wornToday = onRoad ? JERSEY_PRIORITY.filter((k) => leaderName(onRoad[k]) !== undefined) : []
  return (
    <>
      {data.journalUnavailable && (
        <div className={card}>
          <p className="text-sm text-slate-500">
            The detailed journal wasn't recorded for this stage — it was raced before the chronicle
            was saved. The result is still the official one.
          </p>
        </div>
      )}
      {/* CRONO SIN CRÓNICA: las corridas antes de la v18 solo guardaron el evento del ganador, así
          que su historia se reconstruye desde los tiempos. Las nuevas traen su crónica completa
          (orden de salida, mejor tiempo, parciales y alcances) y caen en el bloque de abajo. */}
      {data.timeTrial && results.length > 0 && !hasChronicle && (
        <div className={card}>
          <h2 className={head}>Against the clock</h2>
          <ul className="mt-3 space-y-2">
            {timeTrialStory(results).map((line, i) => (
              <li key={i} className="text-sm text-slate-700">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
      {hasChronicle && data.chronicle && (
        <div className={card}>
          <h2 className={head}>
            {data.timeTrial ? 'Against the clock' : `How the ${oneDay ? 'race' : 'stage'} unfolded`}
          </h2>
          {/* QUIÉN SALIÓ DE AMARILLO. La crónica marca a los líderes con el maillot que llevaban
              PUESTO ese día —el de la clasificación tras la etapa anterior—, mientras que las tablas
              de la pestaña `Classifications` enseñan la de DESPUÉS. Las dos cosas son ciertas y
              pueden no coincidir; esta línea es la que lo explica, en vez de dejar que el lector
              descubra la contradicción por su cuenta. */}
          {wornToday.length > 0 && (
            <p
              className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500"
              title="The jerseys as they were worn at the start of this stage — the standings after it are in Classifications."
            >
              <span className="text-slate-400">On the road today</span>
              {wornToday.map((kind) => (
                <span key={kind} className="flex items-center gap-1">
                  <LeaderJersey kind={kind} size={14} />
                  {leaderName(onRoad?.[kind])}
                </span>
              ))}
            </p>
          )}
          <ol className="mt-3 space-y-2">
            {data.chronicle.map((e, i) => (
              <li key={i} className="flex gap-3 text-sm">
                {/* EL MARGEN DICE DÓNDE VA LA CARRERA, y en una crono eso no es el kilómetro sino
                    LA HORA: mientras uno cruza la meta, otro aún no ha tomado la rampa, así que la
                    crónica va ordenada por el reloj de carrera (`buildChronicle`, byClock) y la
                    columna tiene que decir lo mismo o el lector la lee como si retrocediera. */}
                <span className="w-14 shrink-0 text-right tabular-nums text-slate-400">
                  {data.timeTrial ? formatTime(e.tS) : `km ${e.km}`}
                </span>
                <span className="text-slate-700">
                  {/* Cada mención de un ciclista lleva su bandera, y la bandera es la MISMA del
                      resto de la web (`<Flag/>`, SVG local): los emoji de bandera no se pintan en
                      Windows. `chronicleParts` devuelve la frase ya partida en texto y banderas. */}
                  {chronicleParts(e).map((part, j) =>
                    'flag' in part ? (
                      <Flag key={j} code={part.flag} size={12} className="mx-0.5 align-baseline" />
                    ) : 'jersey' in part ? (
                      // Y el maillot de líder, con el mismo trato que la bandera: dibujo propio,
                      // nunca un emoji, y con su texto alternativo («Race leader»…).
                      <LeaderJersey key={j} kind={part.jersey} size={13} className="mx-0.5" />
                    ) : (
                      <span key={j}>{part.text}</span>
                    ),
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {/* El desenlace, sin cambiar de pestaña: los tres primeros y la salida al resultado completo. */}
      {results.length > 0 && (
        <div className={card}>
          <h2 className={head}>Podium</h2>
          <ol className="mt-2 space-y-1.5">
            {results.slice(0, 3).map((r) => (
              <li key={r.riderId} className="flex items-center gap-3 text-sm">
                <span className="w-5 shrink-0 tabular-nums text-slate-400">{r.puesto}</span>
                <Flag code={r.country} size={16} />
                {/* El podio es el RESULTADO, así que lleva los maillots de DESPUÉS de la etapa,
                    como el resto de tablas de la página; la crónica de arriba lleva los de antes. */}
                <RiderJersey leaders={data.leaders?.afterStage} riderId={r.riderId} className="" />
                <RiderName riderId={r.riderId} name={r.name} isBot={r.isBot} />
                <span className="text-xs text-slate-400">{raceTeamLabel(r.teamName)}</span>
              </li>
            ))}
          </ol>
          {onFullResult && (
            <button
              type="button"
              onClick={onFullResult}
              className="mt-2 text-sm font-medium text-brand-cyan hover:underline"
            >
              Full result →
            </button>
          )}
        </div>
      )}
    </>
  )
}
