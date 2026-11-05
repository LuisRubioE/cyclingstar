import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  type AdminUser,
  type AdminUserPatch,
  deleteAdminUser,
  fetchAdminUsers,
  fetchAdminWhoami,
  updateAdminUser,
} from '../api/admin'
import { ApiError } from '../api/request'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { Field } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'
import { TextLink } from '../components/ui/TextLink'

/**
 * Panel de administración (cuentas). Sólo entra quien la API reconoce como admin por su SESIÓN:
 * la columna `is_admin` o el correo confirmado de `ADMIN_EMAIL`. Aquí no se pide token; la
 * decisión la toma el servidor en cada petición, y esta página sólo enseña lo que él permite.
 *
 * Las salvaguardas viven en la API (no quitarse el admin, no borrarse, no borrar al raíz); la
 * interfaz las refleja desactivando botones, pero no es la que protege.
 *
 * Con el sistema desde el PR 21m (E3, docs/visual.md §17.21): la cabecera en `PageHeader`, con el enlace a
 * la base de nombres en un `TextLink`; la búsqueda, un `Field` con su rótulo a la vista; cada cuenta en su
 * `Panel`, sus chapas en `Chip` y sus acciones en `Button`. Lo que no se puede (el raíz, uno mismo) se
 * deshabilita con su porqué debajo (§4.1), donde antes iba un `title` o nada (regla `ui/4`); y ocupada una
 * acción, su botón gira y los demás no actúan mientras, como el `disabled` de antes.
 */

/** Por qué no se borra una cuenta: lo que contesta la API si se intenta, y el porqué del botón deshabilitado. */
const DELETE_YOURSELF = 'Delete your own account from Account settings.'
const DELETE_ROOT = 'That is the root admin (ADMIN_EMAIL): it cannot be deleted from here.'

/** Traducción de los códigos de error del panel a qué ha pasado. */
function adminErrorMessage(err: unknown): string {
  const code = err instanceof ApiError ? err.code : null
  switch (code) {
    case 'no_puedes_quitarte_admin':
      return 'You cannot remove your own admin rights.'
    case 'borra_tu_cuenta_desde_ajustes':
      return DELETE_YOURSELF
    case 'es_el_admin_raiz':
      return DELETE_ROOT
    case 'no_encontrado':
      return 'That account no longer exists.'
    default:
      return err instanceof Error ? err.message : 'Something went wrong.'
  }
}

const USERS_KEY = 'admin-users'

export function AdminPanel() {
  const whoami = useQuery({ queryKey: ['admin-whoami'], queryFn: fetchAdminWhoami, retry: false })

  // Los estados, con `QueryView` (E3, PR 10): un fallo de `whoami` ya no se pinta como «sin acceso» (el
  // 401 de quien no es admin llega como `null`).
  if (whoami.data === undefined)
    return <QueryView query={whoami} label="your admin access" skeleton={{ kind: 'panel' }} />
  if (!whoami.data || whoami.data.via !== 'session') {
    return (
      <section className="mx-auto max-w-form">
        <PageHeader title="No access" status="This page is for administrators only." />
      </section>
    )
  }
  return <Accounts me={whoami.data.userId} />
}

function Accounts({ me }: { me: string | null }) {
  const [search, setSearch] = useState('')
  const users = useQuery({
    queryKey: [USERS_KEY, search.trim()],
    queryFn: () => fetchAdminUsers(null, search),
    retry: false,
  })

  return (
    <section className="space-y-6">
      <PageHeader
        title="Admin"
        status="Accounts, newest first."
        action={<TextLink to="/admin/names">Blocked names &amp; world health →</TextLink>}
      />

      <Field
        kind="input"
        id="admin-search"
        type="search"
        label="Search by email"
        placeholder="Search by email…"
        value={search}
        onChange={setSearch}
        layout="max-w-form"
      />

      {/* Los estados, con `QueryView` (E3, PR 10). */}
      <QueryView
        query={users}
        label="accounts"
        skeleton={{ kind: 'rows', rowHeight: 64 }}
        isEmpty={(list) => list.length === 0}
        empty={{ text: 'No accounts match.' }}
      >
        {(list) => (
          <ul className="space-y-3">
            {list.map((u) => (
              <li key={u.id}>
                <UserCard user={u} isMe={u.id === me} />
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </section>
  )
}

/** Lo que hace cada botón de una cuenta, para saber cuál está ocupado. */
type Accion = 'verify' | 'premium' | 'admin' | 'delete'

/**
 * Una cuenta, con sus acciones. Se exporta para su test, con `initialError`: el fallo de una acción, que en la
 * página solo llega tras pulsar, pintado en estático (como los `initial` de la entrada, PR 21j).
 */
export function UserCard({
  user,
  isMe,
  initialError = null,
}: {
  readonly user: AdminUser
  readonly isMe: boolean
  readonly initialError?: string | null
}) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState<Accion | null>(null)
  const [error, setError] = useState<string | null>(initialError)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function run(accion: Accion, action: () => Promise<void>) {
    // una a la vez: mientras una acción está en marcha, las otras no actúan
    if (busy !== null) return
    setBusy(accion)
    setError(null)
    try {
      await action()
      await queryClient.invalidateQueries({ queryKey: [USERS_KEY] })
    } catch (err) {
      setError(adminErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const patch = (accion: Accion, p: AdminUserPatch) =>
    void run(accion, () => updateAdminUser(null, user.id, p))
  const admin = user.isAdmin || user.isRootAdmin
  // El raíz es admin por ADMIN_EMAIL, no por la columna: quitársela no cambiaría nada.
  const adminReason = user.isRootAdmin
    ? 'Root admin (ADMIN_EMAIL)'
    : isMe && admin
      ? 'You cannot remove your own admin rights'
      : undefined
  const deleteReason = isMe ? DELETE_YOURSELF : user.isRootAdmin ? DELETE_ROOT : undefined

  return (
    <Panel ariaLabel={user.email}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="break-all text-body font-semibold text-ink">{user.email}</span>
        {isMe && <Chip tone="neutral">you</Chip>}
        {user.emailVerified ? (
          <Chip tone="good">confirmed</Chip>
        ) : (
          <Chip tone="warn">not confirmed</Chip>
        )}
        {user.isRootAdmin && <Chip tone="accent">root admin</Chip>}
        {user.isAdmin && !user.isRootAdmin && <Chip tone="accent">admin</Chip>}
        {user.premium && <Chip tone="accent">premium</Chip>}
      </div>
      <p className="mt-1 text-meta text-ink-2">
        Joined {new Date(user.createdAt).toLocaleDateString()}
        {' · '}
        {user.rider ? (
          <TextLink to={`/world/riders/${user.rider.id}`} variant="rider" inline>
            {user.rider.name}
          </TextLink>
        ) : (
          'no rider'
        )}
        {user.team && (
          <>
            {' · manages '}
            <TextLink to={`/world/teams/${user.team.id}`} inline>
              {user.team.name}
            </TextLink>
          </>
        )}
      </p>

      <div className="mt-3 flex flex-wrap items-start gap-2">
        {!user.emailVerified && (
          <Button
            size="sm"
            busy={busy === 'verify'}
            onClick={() => patch('verify', { emailVerified: true })}
          >
            Confirm email
          </Button>
        )}
        <Button
          size="sm"
          busy={busy === 'premium'}
          onClick={() => patch('premium', { premium: !user.premium })}
        >
          {user.premium ? 'Remove premium' : 'Grant premium'}
        </Button>
        <Button
          size="sm"
          busy={busy === 'admin'}
          {...(adminReason !== undefined ? { disabledReason: adminReason } : {})}
          onClick={() => patch('admin', { isAdmin: !user.isAdmin })}
        >
          {admin ? 'Remove admin' : 'Make admin'}
        </Button>
        <Borrado
          confirming={confirmDelete}
          busy={busy === 'delete'}
          disabledReason={deleteReason}
          onAsk={() => {
            if (busy === null) setConfirmDelete(true)
          }}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void run('delete', () => deleteAdminUser(null, user.id))}
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-meta text-bad">
          {error}
        </p>
      )}
    </Panel>
  )
}

/**
 * Borrar una cuenta, que no se deshace: nunca a la primera; primero pregunta, como la retirada de
 * `MyRaces`. Sin poder borrarla (uno mismo, el raíz), el botón lo dice debajo. Se exporta para su test,
 * que lo pinta en sus dos estados.
 */
export function Borrado({
  confirming,
  busy,
  disabledReason,
  onAsk,
  onCancel,
  onConfirm,
}: {
  readonly confirming: boolean
  readonly busy: boolean
  readonly disabledReason?: string | undefined
  readonly onAsk: () => void
  readonly onCancel: () => void
  readonly onConfirm: () => void
}) {
  if (!confirming)
    return (
      <Button
        size="sm"
        onClick={onAsk}
        {...(disabledReason !== undefined ? { disabledReason } : {})}
      >
        Delete…
      </Button>
    )
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-meta text-ink-2">
        Delete this account? The rider and team stay, run by the game.
      </span>
      <Button variant="danger" size="sm" busy={busy} onClick={onConfirm}>
        Delete
      </Button>
      <Button variant="quiet" size="sm" onClick={onCancel}>
        Cancel
      </Button>
    </span>
  )
}
