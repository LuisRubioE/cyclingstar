import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { forgetDevice, getMeAccount } from '../api/account'
import { fetchAdminWhoami } from '../api/admin'
import { authClient } from '../auth/client'
import { ME_ACCOUNT_KEY } from '../components/ProtectedRoute'
import { scopeLabel, useSpoilerProtection } from '../components/SpoilerSettings'
import { ActionRow } from '../components/ui/ActionRow'
import { Button } from '../components/ui/Button'
import { Notice } from '../components/ui/Notice'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { TextLink } from '../components/ui/TextLink'
import { shortDate } from '../domain/accountDates'
import { useTheme } from '../theme'
import { apiFailureText } from './account/AccountSubpage'

/**
 * `Account` COMO LISTA (docs/cuenta.md §12.1; DD-07 A; PR 11 de E4). Antes era una página de 1.950 px a 360
 * donde lo de la cuenta empezaba dos pantallas por debajo (mapa 05 §7); ahora cada tarea es una fila
 * (`ActionRow`) que abre su subpágina en `/account/<tarea>`, con su valor debajo, que sale de
 * `GET /api/me/account` (12-b). Dos grupos: `Your account` (lo que contesta la pantalla, §7.3) y `The game`.
 * `Notifications` y `Away` llegan con sus PR (13 y 14): sus filas no salen antes. Debajo, `Sign out` y
 * `Shared computer? Forget this device` (12-i), que quita la entrada de este navegador de la `cs_device` y
 * sale (§6.5).
 */

/** El valor de la fila de la contraseña: `Changed 12 Nov`, o `Set` si la fecha no se sabe (§12.1). */
export function passwordValue(changedAt: string | null, now: Date): string {
  return changedAt === null ? 'Set' : `Changed ${shortDate(changedAt, now)}`
}

/** El valor de la fila de los aparatos: `3 signed in`. */
export const devicesValue = (n: number): string => `${n} signed in`

/**
 * EL CORREO QUE NO LLEGA (docs/cuenta.md §9.3; 9-c, 9-d), encima de todo. Resend dejó de mandar a este buzón
 * tras un rebote duro, una queja o una supresión, y el webhook lo apuntó en la cuenta. Sin acción: el jugador
 * ya no cambia su correo (§5.5). Se va cuando un administrador lo cambia o llega un correo entregado después.
 */
function UndeliverableNotice({ email }: { email: string }) {
  return (
    <Notice tone="warn" title={`We can't deliver email to ${email}`}>
      {
        "Without it you can't reset your password if you forget it. Only an administrator can change the email of an account."
      }
    </Notice>
  )
}

export function Account() {
  const navigate = useNavigate()
  const cuenta = useQuery({ queryKey: ME_ACCOUNT_KEY, queryFn: getMeAccount })
  // Sólo para enseñar el enlace: el servidor vuelve a decidir en cada petición del panel.
  const whoami = useQuery({ queryKey: ['admin-whoami'], queryFn: fetchAdminWhoami, retry: false })
  const proteccion = useSpoilerProtection()
  const { theme } = useTheme()
  const [saliendo, setSaliendo] = useState<'sign-out' | 'forget' | null>(null)
  const [fallo, setFallo] = useState<string | null>(null)

  async function onLogout() {
    if (saliendo !== null) return
    setSaliendo('sign-out')
    await authClient.signOut()
    void navigate('/login')
  }

  /** Quita este navegador de la `cs_device` y sale; en `/login`, su final (§12.1). */
  async function onForget() {
    if (saliendo !== null) return
    setSaliendo('forget')
    setFallo(null)
    try {
      await forgetDevice()
    } catch (err) {
      setSaliendo(null)
      setFallo(apiFailureText(err))
      return
    }
    await authClient.signOut()
    void navigate('/login', { state: { arrival: 'device-forgotten' } })
  }

  const c = cuenta.data ?? null
  const now = new Date()
  const email = c?.email ?? ''

  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader
        title="Account"
        loading={c === null && cuenta.isPending}
        {...(c !== null
          ? { status: `${c.email} · Joined ${shortDate(c.joinedAt, now, true)}` }
          : {})}
      />

      {c !== null && c.emailUndeliverableAt !== null && <UndeliverableNotice email={c.email} />}

      {whoami.data?.via === 'session' && <TextLink to="/admin">Admin panel</TextLink>}

      <Panel title="Your account" answer>
        <ul className="divide-y divide-line">
          <ActionRow title="Email" meta={email} href="/account/email" />
          <ActionRow
            title="Password"
            meta={c === null ? '' : passwordValue(c.passwordChangedAt, now)}
            href="/account/password"
          />
          <ActionRow
            title="Devices"
            meta={c === null ? '' : devicesValue(c.devices)}
            href="/account/devices"
          />
          <ActionRow title="Your data" meta="Download a copy" href="/account/data" />
          <ActionRow title="Delete account" meta="" href="/account/delete" />
        </ul>
      </Panel>

      <Panel title="The game">
        <ul className="divide-y divide-line">
          {/* solo con el velo para quien mira, como su panel (E2, §10.4) */}
          {proteccion.kind !== 'off' && (
            <ActionRow
              title="Spoiler protection"
              meta={proteccion.kind === 'on' ? scopeLabel(proteccion.horizon.scope) : ''}
              href="/account/spoilers"
            />
          )}
          <ActionRow
            title="Appearance"
            meta={theme === 'dark' ? 'Dark' : 'Light'}
            href="/account/appearance"
          />
        </ul>
      </Panel>

      <div className="grid justify-items-start gap-1">
        <Button busy={saliendo === 'sign-out'} onClick={() => void onLogout()}>
          Sign out
        </Button>
        <Button variant="quiet" busy={saliendo === 'forget'} onClick={() => void onForget()}>
          Shared computer? Forget this device
        </Button>
        {fallo !== null && (
          <p role="alert" className="text-meta text-bad">
            {fallo}
          </p>
        )}
      </div>
    </section>
  )
}
