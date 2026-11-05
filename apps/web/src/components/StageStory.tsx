import { JERSEY_PRIORITY, type StageReplay } from '@cyclingstar/shared'
import { ChronicleSentence } from './ChronicleSentence'
import { RiderJersey } from './Jersey'
import { Button } from './ui/Button'
import { Flag } from './ui/Flag'
import { InfoButton } from './ui/InfoButton'
import { LeaderJersey } from './ui/LeaderJersey'
import { TextLink } from './ui/TextLink'
import { timeTrialStory } from '../domain/stageJournal'
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
 *
 * `podium` (E2, paso 9a): `Report`, el acta de la página de etapa con `Watch` encendido, lleva el
 * resultado entero encima y no repite el podio (decisión 1 del dueño durante la implementación).
 *
 * Con el sistema (E3, docs/visual.md §14 y §8.3; PR 21m): solo cambia el aspecto. Las tarjetas con los
 * tokens de la página de etapa, el porqué de `On the road today` en un `InfoButton` y no en un `title`
 * (`ui/4`), `Full result →` en un `Button` y el podio en filas de 44, con la identidad en el orden de
 * D-00c (la bandera, el nombre y el maillot) y el nombre en `TextLink`, con su peso de humano o de bot.
 */
export function StageStory({
  data,
  onFullResult,
  podium = true,
}: {
  data: StageReplay
  onFullResult?: () => void
  podium?: boolean
}) {
  const card = 'rounded-ui border border-line bg-surface p-4 shadow-card'
  const head = 'text-caption font-semibold uppercase tracking-caps text-ink-3'
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
  // que nombra la crónica y los que van en el podio, porque las dos cosas cuentan la tarde tal como
  // se vio. Los de DESPUÉS solo salen en la pestaña `Classifications`, que es la que enseña el
  // estado nuevo.
  const onRoad = data.leaders?.onRoad
  // El nombre de cada líder sale de lo que ya trae la página (la general de la etapa y el
  // resultado): no hace falta que la API lo repita. Y un maillot cuyo dueño no se sepa nombrar no
  // se pinta —un icono suelto sin nombre no dice nada—, en vez de dejar el hueco.
  const nameOf = new Map([...(data.gc ?? []), ...results].map((r) => [r.riderId, r.name] as const))
  const leaderName = (riderId: string | null | undefined): string | undefined =>
    riderId ? nameOf.get(riderId) : undefined
  const wornToday = onRoad ? JERSEY_PRIORITY.filter((k) => leaderName(onRoad[k]) !== undefined) : []
  // LA REVISIÓN DE PLANTILLAS DE LA ETAPA (E2, §12.7; paso 12): la elige la redacción de cada línea
  // entre las que existían cuando se corrió. La sirven el acta (`/report`) y el paquete de meta; la
  // ruta de etapa no, y sin ella vale 0, la de toda etapa corrida hasta hoy.
  const rev = data.tplRev ?? 0
  return (
    <>
      {data.journalUnavailable && (
        <div className={card}>
          <p className="text-meta text-ink-2">
            The detailed journal wasn&apos;t recorded for this stage — it was raced before the
            chronicle was saved. The result is still the official one.
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
              <li key={i} className="text-meta text-ink">
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
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-2">
              <span className="text-ink-3">On the road today</span>
              {wornToday.map((kind) => (
                <span key={kind} className="flex items-center gap-1">
                  <LeaderJersey kind={kind} size={28} />
                  {leaderName(onRoad?.[kind])}
                </span>
              ))}
              {/* el porqué, que vivía en un `title` que el dedo no abre (ui/4; PR 21m) */}
              <InfoButton label="About the jerseys on the road">
                The jerseys as they were worn at the start of this stage — the standings after it
                are in Classifications.
              </InfoButton>
            </p>
          )}
          <ol className="mt-3 space-y-2">
            {data.chronicle.map((e, i) => (
              <li key={i} className="flex gap-3 text-meta">
                {/* EL MARGEN DICE DÓNDE VA LA CARRERA, y en una crono eso no es el kilómetro sino
                    LA HORA: mientras uno cruza la meta, otro aún no ha tomado la rampa, así que la
                    crónica va ordenada por el reloj de carrera (`buildChronicle`, byClock) y la
                    columna tiene que decir lo mismo o el lector la lee como si retrocediera. */}
                <span className="w-14 shrink-0 text-right tabular-nums text-ink-3">
                  {data.timeTrial ? formatTime(e.tS) : `km ${e.km}`}
                </span>
                <span className="text-ink">
                  {/* Cada mención con su bandera, su maillot y su enlace (`ChronicleSentence`). */}
                  <ChronicleSentence e={e} rev={rev} />
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {/* El desenlace, sin cambiar de pestaña: los tres primeros y la salida al resultado completo. */}
      {podium && results.length > 0 && (
        <div className={card}>
          <h2 className={head}>Podium</h2>
          <ol className="mt-2 space-y-1.5">
            {results.slice(0, 3).map((r) => (
              <li
                key={r.riderId}
                className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 text-meta"
              >
                <span className="w-5 shrink-0 tabular-nums text-ink-3">{r.puesto}</span>
                {/* la identidad en el orden de D-00c (E3, §14.1; PR 21m): la bandera, el nombre y el
                    maillot; el nombre, en negrita si es de un humano y en cursiva si es de un bot */}
                <Flag country={r.country} />
                <span
                  data-rider={r.isBot ? 'bot' : 'human'}
                  className={r.isBot ? 'font-normal italic' : 'font-semibold'}
                >
                  <TextLink to={`/world/riders/${r.riderId}`} variant="rider" inline>
                    {r.name}
                  </TextLink>
                </span>
                {/* El podio es el RESULTADO —el orden de llegada de esta tarde—, así que lleva los
                    maillots que se llevaban PUESTOS en la carretera, igual que la crónica de arriba
                    y que la tabla de `Result`. Los de después de la etapa están en
                    `Classifications`, que es la pestaña que muestra el estado nuevo. */}
                <RiderJersey leaders={data.leaders?.onRoad} riderId={r.riderId} />
                <span className="text-caption text-ink-3">{raceTeamLabel(r.teamName)}</span>
              </li>
            ))}
          </ol>
          {onFullResult && (
            <Button variant="quiet" size="sm" layout="mt-2" onClick={onFullResult}>
              Full result →
            </Button>
          )}
        </div>
      )}
    </>
  )
}
