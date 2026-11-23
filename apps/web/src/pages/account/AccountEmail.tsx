import { useState } from 'react'
import { authCall } from '../../auth/authCall'
import { authClient } from '../../auth/client'
import { Notice } from '../../components/ui/Notice'
import { Panel } from '../../components/ui/Panel'
import { AccountSubpage, Resultado, type Status } from './AccountSubpage'

/**
 * Verificación de la dirección. Es obligatoria para ENTRAR, pero las cuentas anteriores a ese cambio
 * conservan la sesión que ya tenían: este aviso es para ellas, para que confirmen antes de que la sesión
 * caduque y el login se lo pida (docs/cuenta.md §12.2, `Account.tsx` de antes l. 81 a 111).
 */
function VerifyEmailNotice({ email }: { email: string }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function onSend() {
    // mientras sale el primero, no sale otro
    if (status.kind === 'saving') return
    setStatus({ kind: 'saving' })
    const res = await authCall(() =>
      authClient.sendVerificationEmail({ email, callbackURL: '/verify-email' }),
    )
    if (res !== null) {
      setStatus({ kind: 'err', msg: res.text ?? 'Something went wrong. Try again in a minute.' })
    } else {
      setStatus({ kind: 'ok', msg: 'Link sent. Check your inbox and the spam folder.' })
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

/**
 * `Account › Email` (docs/cuenta.md §5.5 y §12.2; 12-a): el correo y dos frases, sin formulario. El jugador
 * ya no lo cambia; lo cambia un administrador desde el panel, y `change-email` da 404 desde el PR 5.
 */
export function AccountEmail() {
  const { data } = authClient.useSession()
  const email = data?.user.email ?? ''
  return (
    <AccountSubpage title="Email">
      {email && data?.user.emailVerified === false && <VerifyEmailNotice email={email} />}
      <Panel ariaLabel="Your email" answer>
        <div className="grid gap-3">
          <p className="text-body font-semibold break-words text-ink">{email}</p>
          <p className="text-meta text-ink-2">
            Your email can only be changed by an administrator.
          </p>
          <p className="text-meta text-ink-2">
            If you lose access to this email, you won&apos;t be able to recover your account.
          </p>
        </div>
      </Panel>
    </AccountSubpage>
  )
}
