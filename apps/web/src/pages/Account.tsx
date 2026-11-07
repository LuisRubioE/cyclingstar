import { useQuery } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAdminWhoami } from '../api/admin'
import { authClient } from '../auth/client'
import { SpoilerSettings, useSpoilerProtection } from '../components/SpoilerSettings'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Notice } from '../components/ui/Notice'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { Segmented } from '../components/ui/Segmented'
import { TextLink } from '../components/ui/TextLink'
import { useTheme } from '../theme'

/**
 * AJUSTES DE LA CUENTA (SPEC 7): correo, contraseña, cerrar sesión y borrar la cuenta.
 *
 * CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21f): la cabecera en `PageHeader`; la
 * protección de resultados, el `Panel` que contesta a la 28 (§7.3), y sin velo para quien mira, el del
 * correo; cada formulario en su `Panel`, con sus campos en `Field`, el rótulo a la vista y en 16 px (hoy en
 * 14, que Safari del iPhone amplía), y sus botones en `Button`, ocupado el que guarda. Lo que falta en un
 * campo lo dice el campo; lo que dice el servidor, debajo, en `role="status"` o `role="alert"`.
 */

/** Estado de un formulario de ajustes: mensaje de éxito o de error, más "enviando". */
type Status =
  { kind: 'idle' } | { kind: 'saving' } | { kind: 'ok'; msg: string } | { kind: 'err'; msg: string }

/** Los dos modos, en pantalla (§3.3, D-00i). */
const MODOS = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
] as const

/**
 * EL MODO (E3, docs/visual.md §3.3, D-00i; paso 23): claro u oscuro, que se ve al momento y se guarda en
 * la cuenta para que siga al jugador a otro aparato. No depende del velo.
 */
function Appearance() {
  const { theme, setTheme, saveFailed } = useTheme()
  return (
    <Panel title="Appearance">
      <div className="grid gap-1">
        <Segmented label="Appearance" options={MODOS} value={theme} onChange={setTheme} />
        {saveFailed && (
          <p role="alert" className="text-meta text-bad">
            Could not save your appearance.
          </p>
        )}
      </div>
    </Panel>
  )
}

/**
 * Lo que contestó el servidor, debajo del formulario. La región de estado está desde el principio, vacía y
 * fuera de la vista (`sr-only`, y no `hidden`, que la sacaría también del lector): insertada ya llena, el lector
 * no siempre la lee (las revisiones del 21f y del 21j). Un fallo sí se oye al insertarse (`alert`).
 */
function Resultado({ status }: { status: Status }) {
  return (
    <>
      <p role="status" className="text-meta text-good empty:sr-only">
        {status.kind === 'ok' ? status.msg : ''}
      </p>
      {status.kind === 'err' && (
        <p role="alert" className="text-meta text-bad">
          {status.msg}
        </p>
      )}
    </>
  )
}

/**
 * Verificación de la dirección. Ahora es obligatoria para ENTRAR, pero las cuentas anteriores a
 * ese cambio conservan la sesión que ya tenían: este aviso es para ellas, para que confirmen antes
 * de que la sesión caduque y el login se lo pida. Desde el PR 21f, un `Notice` `warn` con su acción.
 */
function VerifyEmailNotice({ email }: { email: string }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function onSend() {
    // mientras sale el primero, no sale otro
    if (status.kind === 'saving') return
    setStatus({ kind: 'saving' })
    const res = await authClient.sendVerificationEmail({ email, callbackURL: '/verify-email' })
    if (res.error) {
      setStatus({ kind: 'err', msg: res.error.message ?? 'Could not send the email.' })
    } else {
      setStatus({ kind: 'ok', msg: 'Link sent — check your inbox (and the spam folder).' })
    }
  }

  return (
    <Notice
      tone="warn"
      title="Your email is not confirmed"
      action={{
        label: 'Send me a confirmation link',
        onClick: () => void onSend(),
        busy: status.kind === 'saving',
      }}
    >
      You will need it the next time you log in, and to recover your account if you ever lose your
      password.
      <Resultado status={status} />
    </Notice>
  )
}

function ChangeEmail({
  current,
  verified,
  answer,
}: {
  current: string
  verified: boolean
  /** la respuesta de la 28 cuando no hay protección de resultados (§7.3) */
  answer: boolean
}) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [fieldError, setFieldError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (status.kind === 'saving') return
    if (!email || email === current) {
      // lo que contestó el servidor antes ya no vale (la revisión del 21f)
      setStatus({ kind: 'idle' })
      setFieldError('Enter a new, different email.')
      return
    }
    setFieldError(null)
    setStatus({ kind: 'saving' })
    // callbackURL: a dónde vuelve quien abre el enlace de confirmación.
    const res = await authClient.changeEmail({ newEmail: email, callbackURL: '/verify-email' })
    if (res.error) {
      setStatus({ kind: 'err', msg: res.error.message ?? 'Could not change your email.' })
    } else {
      // La dirección nueva SIEMPRE se verifica antes de aplicarse. Si la actual está confirmada,
      // el primer correo va a ELLA (para aprobar el cambio) y sólo después sale el de la nueva.
      setStatus({
        kind: 'ok',
        msg: verified
          ? `We have sent an approval link to ${current}. Once you approve, a confirmation link goes to ${email}; your email changes when you open it.`
          : `We have sent a confirmation link to ${email}. Your email changes when you open it.`,
      })
      setEmail('')
    }
  }

  return (
    <Panel title="Email" answer={answer}>
      <form onSubmit={onSubmit} className="grid gap-3">
        <p className="text-meta text-ink-2">
          Signed in as <span className="font-semibold text-ink">{current}</span>. A new address has
          to be confirmed by email before it replaces this one.
        </p>
        <Field
          kind="input"
          type="email"
          id="new-email"
          label="New email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(v) => {
            setEmail(v)
            setFieldError(null)
          }}
          {...(fieldError !== null ? { error: fieldError } : {})}
        />
        <Resultado status={status} />
        <Button
          variant="primary"
          type="submit"
          busy={status.kind === 'saving'}
          layout="justify-self-start"
        >
          Update email
        </Button>
      </form>
    </Panel>
  )
}

function ChangePassword({
  answer,
}: {
  /** la respuesta de la 28 sin protección de resultados ni correo (§7.3) */
  answer: boolean
}) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [fieldError, setFieldError] = useState<{
    field: 'next' | 'confirm'
    msg: string
  } | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (status.kind === 'saving') return
    if (next.length < 8) {
      setStatus({ kind: 'idle' })
      setFieldError({ field: 'next', msg: 'New password must be at least 8 characters.' })
      return
    }
    if (next !== confirm) {
      setStatus({ kind: 'idle' })
      setFieldError({ field: 'confirm', msg: 'The new passwords do not match.' })
      return
    }
    setFieldError(null)
    setStatus({ kind: 'saving' })
    const res = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    })
    if (res.error) {
      setStatus({ kind: 'err', msg: res.error.message ?? 'Could not change your password.' })
    } else {
      setStatus({ kind: 'ok', msg: 'Password updated.' })
      setCurrent('')
      setNext('')
      setConfirm('')
    }
  }

  const errorOf = (field: 'next' | 'confirm') =>
    fieldError?.field === field ? { error: fieldError.msg } : {}

  return (
    <Panel title="Password" answer={answer}>
      <form onSubmit={onSubmit} className="grid gap-3">
        <p className="text-meta text-ink-2">
          Changing your password signs you out of other devices.
        </p>
        <Field
          kind="input"
          type="password"
          id="cur-pw"
          label="Current password"
          autoComplete="current-password"
          value={current}
          onChange={setCurrent}
        />
        <Field
          kind="input"
          type="password"
          id="new-pw"
          label="New password"
          autoComplete="new-password"
          help="At least 8 characters."
          value={next}
          onChange={(v) => {
            setNext(v)
            setFieldError(null)
          }}
          {...errorOf('next')}
        />
        <Field
          kind="input"
          type="password"
          id="confirm-pw"
          label="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChange={(v) => {
            setConfirm(v)
            setFieldError(null)
          }}
          {...errorOf('confirm')}
        />
        <Resultado status={status} />
        <Button
          variant="primary"
          type="submit"
          busy={status.kind === 'saving'}
          layout="justify-self-start"
        >
          Update password
        </Button>
      </form>
    </Panel>
  )
}

/**
 * Borrar la cuenta. Irreversible, así que va en dos pasos (abrir el formulario, luego confirmar con
 * la contraseña, que el servidor exige siempre) y dice qué pasa con el corredor y el equipo: se
 * quedan en el mundo como NPC, no desaparecen. Se exporta para su test, que abierto no lo puede pulsar
 * (`defaultOpen`).
 */
export function DeleteAccount({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [fieldError, setFieldError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (status.kind === 'saving') return
    if (!password) {
      setStatus({ kind: 'idle' })
      setFieldError('Enter your password to delete your account.')
      return
    }
    setFieldError(null)
    setStatus({ kind: 'saving' })
    const res = await authClient.deleteUser({ password })
    if (res.error) {
      setStatus({ kind: 'err', msg: res.error.message ?? 'Could not delete your account.' })
      return
    }
    // Recarga completa: la sesión ya no existe y ninguna caché de la SPA debe sobrevivirla.
    window.location.assign('/')
  }

  return (
    <Panel title="Delete account">
      <div className="grid gap-3">
        <p className="text-meta text-ink-2">
          This cannot be undone. Your rider and your team stay in the world, run by the game, and
          your email becomes free to use on another account.
        </p>
        {open ? (
          <form onSubmit={onSubmit} className="grid gap-3">
            <Field
              kind="input"
              type="password"
              id="delete-pw"
              label="Password"
              autoComplete="current-password"
              value={password}
              onChange={(v) => {
                setPassword(v)
                setFieldError(null)
              }}
              {...(fieldError !== null ? { error: fieldError } : {})}
            />
            <Resultado status={status} />
            <div className="flex flex-wrap gap-3">
              <Button variant="danger" type="submit" busy={status.kind === 'saving'}>
                Delete my account for good
              </Button>
              <Button
                variant="quiet"
                onClick={() => {
                  setOpen(false)
                  setPassword('')
                  setStatus({ kind: 'idle' })
                  setFieldError(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button onClick={() => setOpen(true)} layout="justify-self-start">
            Delete my account…
          </Button>
        )}
      </div>
    </Panel>
  )
}

export function Account() {
  const navigate = useNavigate()
  const { data } = authClient.useSession()
  // Sólo para enseñar el enlace: el servidor vuelve a decidir en cada petición del panel.
  const whoami = useQuery({ queryKey: ['admin-whoami'], queryFn: fetchAdminWhoami, retry: false })
  // la respuesta de la 28 (§7.3), la protección de resultados; sin velo para quien mira no sale, y
  // contesta el correo, o la contraseña mientras no se sabe el correo
  const conVelo = useSpoilerProtection().kind !== 'off'

  async function onLogout() {
    await authClient.signOut()
    navigate('/login')
  }

  const email = data?.user.email ?? ''

  return (
    <section className="mx-auto max-w-form space-y-4">
      <PageHeader title="Account settings" status="Manage your login details." />

      {whoami.data?.via === 'session' && <TextLink to="/admin">Admin panel</TextLink>}

      {/* Qué se protege de destripes (E2, §10.4; 9b): solo con el velo para quien mira. */}
      <SpoilerSettings />

      <Appearance />

      {email && data?.user.emailVerified === false && <VerifyEmailNotice email={email} />}
      {email && (
        <ChangeEmail
          current={email}
          verified={data?.user.emailVerified === true}
          answer={!conVelo}
        />
      )}
      <ChangePassword answer={!conVelo && !email} />

      <Button onClick={() => void onLogout()}>Sign out</Button>

      <DeleteAccount />
    </section>
  )
}
