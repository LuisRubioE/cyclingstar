import { type FormEvent, useEffect, useState } from 'react'
import { authCall, useRetryWait } from '../auth/authCall'
import { authClient } from '../auth/client'
import { clearPendingEmail, readPendingEmail, writePendingEmail } from '../auth/pendingEmail'
import { Button } from '../components/ui/Button'
import { DateField, type DateFieldValue, EMPTY_DATE, toIsoDate } from '../components/ui/DateField'
import { Field } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { TextLink } from '../components/ui/TextLink'
import {
  BIRTH_DATE_INVALID,
  type FieldProblem,
  birthDateEntryProblem,
  registerProblem,
} from '../domain/entryForms'

/**
 * LA PUERTA DEL MENOR (docs/cuenta.md §4.4; D-04, O-12): tras un `UNDER_MINIMUM_AGE` (del servidor o calculado
 * aquí con la misma regla), `cs.ageGate` en `sessionStorage`, y mientras la pestaña viva `/register` enseña
 * `AgeGate` en lugar del formulario. `sessionStorage` y no `localStorage`, para que un hermano mayor en el
 * mismo navegador no herede la puerta. No impide mentir (A8); impide el «pruebo otra fecha» inmediato.
 */
export const AGE_GATE_KEY = 'cs.ageGate'

function readAgeGate(): boolean {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(AGE_GATE_KEY) !== null
  } catch {
    return false
  }
}

function writeAgeGate(): void {
  try {
    sessionStorage.setItem(AGE_GATE_KEY, '1')
  } catch {
    // sin almacenamiento: la pantalla se ve, pero no sobrevive a recargar
  }
}

/** Quien no tiene 16 (§4.4): no se guardó nada de lo que tecleó. */
export function AgeGate() {
  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader title="Sorry, you can't play yet" />
      <Panel ariaLabel="Why you can't play yet" answer>
        <div className="grid gap-3">
          <p className="text-body text-ink-2">
            Cycling Star is for people aged 16 or over. We have not kept anything you typed.
          </p>
          <Button variant="primary" to="/">
            Back to the home page
          </Button>
        </div>
      </Panel>
    </section>
  )
}

/**
 * CREAR LA CUENTA, CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21j): la cabecera en
 * `PageHeader`; el formulario en el `Panel` que contesta a la 32 (§7.3), con cada campo en su `Field` y crearla
 * en un `Button` ocupado mientras pregunta; lo que falta lo dice su campo (`registerProblem`), y lo que dice el
 * servidor, debajo, en `role="alert"`.
 */

/**
 * Después de registrarse, la PETICIÓN RECIBIDA (docs/cuenta.md §4.9 y §5.3; PR 5): la cuenta queda `pending` y
 * no sale ningún correo hasta que un administrador la aprueba; entonces sale el enlace para terminar. La misma
 * pantalla para un correo nuevo, para uno que ya existe y para el de `ADMIN_EMAIL`, así que no dice nada de
 * quién juega. Sin `Send it again`: no hay nada que reenviar hasta la aprobación. La caducidad es la de hoy,
 * una hora; las 24 horas de §5.1 llegan con `EMAIL_JWT_TTL_S`, en su PR.
 */
export function CheckInbox({
  email,
  onStartAgain,
}: {
  email: string
  /** `Start again`: el correo deja de esperar y vuelve el formulario */
  onStartAgain?: () => void
}) {
  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader title="Request received" />
      <Panel ariaLabel="Your request" answer>
        <div className="grid gap-3">
          <p className="text-body text-ink-2">
            An administrator reviews new accounts by hand, a few each day. When yours is approved,
            we&apos;ll email <strong className="font-semibold text-ink">{email}</strong> a link to
            finish signing up. The link expires in 24 hours.
          </p>
          <p className="text-meta text-ink-2">
            Nothing yet? Check the spam folder once you&apos;ve been approved.
          </p>
          <div className="flex flex-wrap items-center gap-x-2">
            <p className="text-meta text-ink-2">Wrong address?</p>
            <Button
              variant="quiet"
              size="sm"
              onClick={() => {
                clearPendingEmail()
                onStartAgain?.()
              }}
            >
              Start again
            </Button>
          </div>
          <p className="text-meta text-ink-2">
            Already have an account with this email? Nothing is sent: log in or reset your password.
          </p>
        </div>
      </Panel>
      <p className="text-meta text-ink-2">
        <TextLink to="/login" inline>
          Log in
        </TextLink>
      </p>
    </section>
  )
}

interface RegisterState {
  readonly problem: FieldProblem<'email' | 'password' | 'birthDate'> | null
  readonly error: string | null
  /** el correo que espera confirmación: con él, `CheckInbox` */
  readonly pending: string | null
  /** los segundos que quedan tras un 429 */
  readonly waitS: number
  /** la pantalla del menor (`cs.ageGate`) */
  readonly ageGate: boolean
}

export function Register({ initial = {} }: { initial?: Partial<RegisterState> } = {}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birth, setBirth] = useState<DateFieldValue>(EMPTY_DATE)
  const [problem, setProblem] = useState(initial.problem ?? null)
  const [ageGate, setAgeGate] = useState(() => initial.ageGate ?? readAgeGate())
  const [error, setError] = useState<string | null>(initial.error ?? null)
  const [loading, setLoading] = useState(false)
  // sobrevive a recargar y a volver atrás: el correo, en `cs.pendingEmail` (docs/cuenta.md §5.3)
  const [pending, setPending] = useState<string | null>(() =>
    initial.pending !== undefined ? initial.pending : readPendingEmail(),
  )
  const espera = useRetryWait(initial.waitS)

  // el foco, al campo que falta: su error se oye con él (en la fecha, al primer trozo vacío o al día)
  const [focoFecha, setFocoFecha] = useState<keyof DateFieldValue>('day')
  useEffect(() => {
    if (problem === null) return
    const id =
      problem.field === 'birthDate' ? `register-dob-${focoFecha}` : `register-${problem.field}`
    document.getElementById(id)?.focus()
  }, [problem, focoFecha])

  function menor() {
    writeAgeGate()
    setAgeGate(true)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (loading) return
    setError(null)
    const falta = registerProblem(email, password)
    setProblem(falta)
    if (falta !== null) return
    // la fecha, con la regla del servidor (docs/cuenta.md §4.8): el menor no llega a enviar nada
    const fecha = birthDateEntryProblem(birth)
    if (fecha?.kind === 'underage') return menor()
    if (fecha !== null) {
      setFocoFecha(fecha.kind === 'missing' ? fecha.part : 'day')
      setProblem({ field: 'birthDate', msg: fecha.msg })
      return
    }
    setLoading(true)
    // No se pide el nombre: better-auth requiere el campo y el servidor lo pone a 'Player' (§4.7).
    // Confirmar el correo es OBLIGATORIO: el registro no abre sesión, la abre el enlace del correo.
    // (El servidor fija a dónde vuelve ese enlace; el callbackURL va por coherencia.)
    const fallo = await authCall(() =>
      authClient.signUp.email({
        name: '',
        email,
        password,
        birthDate: toIsoDate(birth) ?? '',
        callbackURL: '/verify-email',
      }),
    )
    setLoading(false)
    // la regla de la fecha, del servidor: el 400 `VALIDATION_ERROR` lleva el código en el `message` (§4.2)
    if (fallo?.code === 'VALIDATION_ERROR' && fallo.message === 'UNDER_MINIMUM_AGE') return menor()
    if (fallo?.code === 'VALIDATION_ERROR' && fallo.message === 'INVALID_BIRTH_DATE') {
      setFocoFecha('day')
      setProblem({ field: 'birthDate', msg: BIRTH_DATE_INVALID })
      return
    }
    if (fallo !== null) {
      setError(fallo.text)
      if (fallo.retryAfterS !== null) espera.start(fallo.retryAfterS, () => setError(null))
      return
    }
    // Aunque el correo ya tuviera cuenta, better-auth responde igual (para no revelar quién está
    // registrado), así que la pantalla también es la misma.
    writePendingEmail(email)
    setPending(email)
  }

  if (ageGate) return <AgeGate />

  if (pending !== null)
    return (
      <CheckInbox
        email={pending}
        onStartAgain={() => {
          // el formulario vuelve con la dirección de antes, para corregirla
          setEmail(pending)
          setPending(null)
        }}
      />
    )

  const errorOf = (field: 'email' | 'password' | 'birthDate') =>
    problem?.field === field ? { error: problem.msg } : {}

  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader title="Create your account" status="Start building your rider." />
      <Panel ariaLabel="Your email and password" answer>
        <form onSubmit={onSubmit} className="grid gap-3">
          <Field
            kind="input"
            type="email"
            id="register-email"
            label="Email"
            autoComplete="email"
            value={email}
            onChange={(v) => {
              setEmail(v)
              setProblem(null)
            }}
            {...errorOf('email')}
          />
          <Field
            kind="input"
            type="password"
            id="register-password"
            label="Password"
            autoComplete="new-password"
            reveal
            help="At least 8 characters."
            value={password}
            onChange={(v) => {
              setPassword(v)
              setProblem(null)
            }}
            {...errorOf('password')}
          />
          <DateField
            id="register-dob"
            label="Date of birth"
            hint="We only use it to check you're old enough to play."
            value={birth}
            onChange={(v) => {
              setBirth(v)
              setProblem(null)
            }}
            {...errorOf('birthDate')}
          />
          {error !== null && (
            <p role="alert" className="text-meta text-bad">
              {error}
            </p>
          )}
          <Button
            variant="primary"
            type="submit"
            busy={loading}
            busyLabel="Creating…"
            {...espera.button}
          >
            Create account
          </Button>
          {/* Los dos enlaces, como controles de 44 px y no de frase: a 320 px la frase partía los dos
              enlaces en líneas seguidas y quedaban demasiado juntos (prueba del teléfono, 5). */}
          <div className="grid gap-1">
            <p className="text-meta text-ink-2">By creating an account you agree to the:</p>
            <div className="flex flex-wrap gap-x-6">
              <TextLink to="/terms">Terms of use</TextLink>
              <TextLink to="/privacy">Privacy notice</TextLink>
            </div>
          </div>
        </form>
      </Panel>
      <p className="text-meta text-ink-2">
        Already have an account?{' '}
        <TextLink to="/login" inline>
          Log in
        </TextLink>
      </p>
    </section>
  )
}
