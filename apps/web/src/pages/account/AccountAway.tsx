import { AWAY_SHORTCUT_DAYS, type AwayResponse, awayLines, awayWindow } from '@cyclingstar/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { AWAY_KEY, getAway, putAway } from '../../api/away'
import { BackNotice, useEndAway } from '../../components/AwayBand'
import { Button } from '../../components/ui/Button'
import { DateField, type DateFieldValue, EMPTY_DATE } from '../../components/ui/DateField'
import { Panel } from '../../components/ui/Panel'
import { Segmented } from '../../components/ui/Segmented'
import { shortDate } from '../../domain/accountDates'
import { AccountSubpage, apiFailureText } from './AccountSubpage'

/**
 * `Account › Away` (docs/cuenta.md §14.1; DD-05 A; PR 13 de E4). Sin ausencia, el formulario: los atajos
 * (`Segmented`, `AWAY_SHORTCUT_DAYS`) rellenan `Back on` con hoy más 7, 14 o 28 días, y tocar la fecha
 * deselecciona el atajo; debajo, `While you're away` con las líneas calculadas con los datos de cada
 * jugador, y el botón con la fecha. La web manda las 00:00 locales del día elegido. Con la ausencia viva,
 * la fecha de vuelta, `Change date` y `End now`. Las frases de los avisos llegan con el PR 14 (18-c), y la
 * de la regla del mes, con el 15.
 */

/** Los atajos, en pantalla. */
const ATAJOS = AWAY_SHORTCUT_DAYS.map((n) => ({
  key: String(n) as `${(typeof AWAY_SHORTCUT_DAYS)[number]}`,
  label: n === 7 ? '1 week' : `${n / 7} weeks`,
}))
type Atajo = (typeof ATAJOS)[number]['key'] | ''

/** La fecha local de hoy más `dias`, en los tres campos. */
export function shortcutDate(dias: number, now: Date): DateFieldValue {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dias)
  return {
    day: String(d.getDate()),
    month: String(d.getMonth() + 1),
    year: String(d.getFullYear()),
  }
}

/** Las 00:00 locales del día de los tres campos, o null si no es una fecha. */
export function localMidnight(v: DateFieldValue): Date | null {
  const [d, m, y] = [v.day, v.month, v.year].map((x) => Number(x.trim()))
  if (![d, m, y].every((x) => Number.isInteger(x)) || y! < 1000) return null
  const fecha = new Date(y!, m! - 1, d!)
  return fecha.getDate() === d && fecha.getMonth() === m! - 1 ? fecha : null
}

/** El error de `Back on` (§14.1), o null si la fecha vale. */
export function backOnProblem(v: DateFieldValue, now: Date): string | null {
  const fecha = localMidnight(v)
  if (fecha === null) return 'Enter a real date.'
  const { min, max } = awayWindow(now)
  if (fecha < min) return 'Pick a later date.'
  if (fecha > max) return 'Up to 28 days. For longer, come back once and set it again.'
  return null
}

/** La fecha de una ausencia viva, en los tres campos (`Change date`). */
function fieldsOf(iso: string): DateFieldValue {
  const d = new Date(iso)
  return {
    day: String(d.getDate()),
    month: String(d.getMonth() + 1),
    year: String(d.getFullYear()),
  }
}

export function AccountAway() {
  const away = useQuery({ queryKey: AWAY_KEY, queryFn: getAway })
  const a = away.data ?? null
  return (
    <AccountSubpage title="Away" loading={a === null && away.isPending}>
      {a === null ? (
        away.isError && (
          <p role="alert" className="text-meta text-bad">
            {apiFailureText(away.error)}
          </p>
        )
      ) : (
        <AwayBody away={a} now={new Date()} />
      )}
    </AccountSubpage>
  )
}

/** El cuerpo de `Away` con lo que dijo `GET /api/me/away`; aparte para pintarlo en sus estados. */
export function AwayBody({
  away,
  now,
  initialEditing = false,
  initialBack = EMPTY_DATE,
  initialError,
}: {
  readonly away: AwayResponse
  readonly now: Date
  readonly initialEditing?: boolean
  readonly initialBack?: DateFieldValue
  readonly initialError?: string
}) {
  const client = useQueryClient()
  const viva = away.awayUntil !== null && new Date(away.awayUntil) > now
  const [editando, setEditando] = useState(initialEditing)
  const [atajo, setAtajo] = useState<Atajo>('')
  const [vuelta, setVuelta] = useState<DateFieldValue>(initialBack)
  const [error, setError] = useState<string | undefined>(initialError)
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)
  const [vuelto, setVuelto] = useState(false)
  const fin = useEndAway()
  const fecha = (iso: string) => shortDate(iso, now)

  if (viva && !editando)
    return (
      <Panel title={`You're away until ${fecha(away.awayUntil!)}.`} answer>
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setVuelta(fieldsOf(away.awayUntil!))
                setAtajo('')
                setError(undefined)
                setEditando(true)
              }}
            >
              Change date
            </Button>
            <Button busy={fin.busy} onClick={() => void fin.end().then((ok) => setVuelto(ok))}>
              End now
            </Button>
          </div>
          {fin.error !== null && (
            <p role="alert" className="text-meta text-bad">
              {fin.error}
            </p>
          )}
        </div>
      </Panel>
    )

  const elegida = localMidnight(vuelta)
  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (guardando) return
    const problema = backOnProblem(vuelta, new Date())
    setError(problema ?? undefined)
    setFallo(null)
    if (problema !== null || elegida === null) return
    setGuardando(true)
    try {
      const nueva = await putAway(elegida.toISOString())
      client.setQueryData(AWAY_KEY, nueva)
      setEditando(false)
      setVuelto(false)
    } catch (err) {
      // fuera de la ventana para el servidor (el reloj del aparato no es el suyo): el error del campo
      const p = backOnProblem(vuelta, new Date())
      if (p !== null) setError(p)
      else setFallo(apiFailureText(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      {vuelto && <BackNotice onDismiss={() => setVuelto(false)} />}
      {!viva && (
        <p className="text-body text-ink-2">Going on holiday? Tell us when you&apos;ll be back.</p>
      )}
      <form className="grid gap-4" noValidate onSubmit={(e) => void onSubmit(e)}>
        <Segmented<Atajo>
          label="Away for"
          options={ATAJOS}
          value={atajo}
          onChange={(k) => {
            if (k === '') return
            setAtajo(k)
            setVuelta(shortcutDate(Number(k), now))
            setError(undefined)
          }}
        />
        <DateField
          id="away-back"
          label="Back on"
          autoComplete="off"
          value={vuelta}
          onChange={(v) => {
            setVuelta(v)
            setAtajo('')
            setError(undefined)
          }}
          {...(error !== undefined ? { error } : {})}
        />
        <Panel title="While you're away" answer>
          <ul className="grid list-disc gap-1 pl-4 text-meta text-ink-2">
            {awayLines(away.facts, fecha).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </Panel>
        <div className="grid justify-items-start gap-1">
          <Button type="submit" variant="primary" busy={guardando}>
            {elegida === null ? 'Set away' : `Set away until ${fecha(elegida.toISOString())}`}
          </Button>
          {fallo !== null && (
            <p role="alert" className="text-meta text-bad">
              {fallo}
            </p>
          )}
        </div>
      </form>
    </>
  )
}
