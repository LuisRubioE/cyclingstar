import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import {
  type AdminAuditEntryView,
  type AdminUser,
  type AdminUserPatch,
  approveUser,
  deleteAdminUser,
  fetchAdminAudit,
  fetchAdminUsers,
  fetchAdminWhoami,
  fetchPendingUsers,
  rejectUser,
  updateAdminUser,
} from '../api/admin'
import { RenameTeam } from '../components/RenameTeam'
import { Button } from '../components/ui/Button'
import { Checkbox } from '../components/ui/Checkbox'
import { Chip } from '../components/ui/Chip'
import { Field } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'
import { TextLink } from '../components/ui/TextLink'
import { DELETE_ROOT, DELETE_YOURSELF, adminErrorMessage } from '../domain/adminErrors'

/**
 * Panel de administración (cuentas). Sólo entra quien la API reconoce como admin por su SESIÓN:
 * la columna `is_admin` o el correo confirmado de `ADMIN_EMAIL`. Aquí no se pide token; la
 * decisión la toma el servidor en cada petición, y esta página sólo enseña lo que él permite.
 *
 * Las salvaguardas viven en la API (no quitarse el admin, no borrarse, no borrar al raíz); la
 * interfaz las refleja desactivando botones, pero no es la que protege.
 *
 * Con el sistema desde el PR 21m (E3, docs/visual.md §17.21): la cabecera en `PageHeader`, con el enlace a
 * la base de nombres en un `TextLink`; la búsqueda, un `Field` con su rótulo a la vista; las cuentas, en un
 * solo `Panel`, cada una un `li` de su lista, con sus chapas en `Chip` y sus acciones en `Button`, que llevan
 * la cuenta en su nombre. Lo que no se puede (el raíz, uno mismo) se deshabilita con su porqué debajo (§4.1),
 * donde antes iba un `title` o nada (regla `ui/4`).
 * Decisión: ocupada una acción, los demás botones ya no se ven deshabilitados; parecen listos y no hacen nada, porque deshabilitar pide su porqué a la vista (§4.1).
 *
 * Con E4 (docs/cuenta.md §8.5; PR 5): abre con la cola de aprobación, `Waiting for approval (<n>)`, de la
 * más vieja a la más nueva; cada cuenta gana `Change email` y, si tiene equipo, `Rename team`; y debajo de la
 * lista, `Recent changes`, las 50 últimas filas del registro del panel. `Change date of birth` llega con el
 * PR 9, con la columna.
 */

const USERS_KEY = 'admin-users'
const PENDING_KEY = 'admin-pending'
const AUDIT_KEY = 'admin-audit'

/** «19 Nov 2026», la fecha de las filas del panel. */
export function panelDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

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

      {/* Las cuentas, en un solo `Panel` y no una región por cuenta; sus estados, con `QueryView` (E3, PR 10),
          dentro, como las listas de `AdminNames`. */}
      <PendingQueue />

      <Panel ariaLabel="Accounts">
        <QueryView
          query={users}
          label="accounts"
          skeleton={{ kind: 'rows', rowHeight: 64 }}
          isEmpty={(list) => list.length === 0}
          empty={{ text: 'No accounts match.' }}
        >
          {(list) => (
            <ul className="divide-y divide-line">
              {list.map((u) => (
                <UserCard key={u.id} user={u} isMe={u.id === me} />
              ))}
            </ul>
          )}
        </QueryView>
      </Panel>

      <RecentChanges />
    </section>
  )
}

/** Tras cualquier cambio del panel: las cuentas, la cola y el registro. */
async function refrescaPanel(queryClient: ReturnType<typeof useQueryClient>): Promise<void> {
  await Promise.all(
    [USERS_KEY, PENDING_KEY, AUDIT_KEY].map((k) =>
      queryClient.invalidateQueries({ queryKey: [k] }),
    ),
  )
}

/** La cola de aprobación (docs/cuenta.md §4.9; 8-k): un `Panel` con su cuenta en el título. */
function PendingQueue() {
  const pending = useQuery({ queryKey: [PENDING_KEY], queryFn: () => fetchPendingUsers(null) })
  const title =
    pending.data === undefined
      ? 'Waiting for approval'
      : `Waiting for approval (${pending.data.length})`
  return (
    <Panel title={title}>
      <QueryView
        query={pending}
        label="requests"
        skeleton={{ kind: 'rows', rowHeight: 44 }}
        isEmpty={(list) => list.length === 0}
        empty={{ text: 'Nobody is waiting.' }}
      >
        {(list) => (
          <ul className="divide-y divide-line">
            {list.map((u) => (
              <PendingRow key={u.id} user={u} />
            ))}
          </ul>
        )}
      </QueryView>
    </Panel>
  )
}

/**
 * Una petición de la cola: el correo, cuándo la pidió, `Approve` y `Reject`, que pregunta antes. Se exporta
 * para su test, con la pregunta abierta y un fallo en estático.
 */
export function PendingRow({
  user,
  initialConfirm = false,
  initialError = null,
}: {
  readonly user: AdminUser
  readonly initialConfirm?: boolean
  readonly initialError?: string | null
}) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [confirm, setConfirm] = useState(initialConfirm)
  const [error, setError] = useState<string | null>(initialError)

  async function run(accion: 'approve' | 'reject') {
    if (busy !== null) return
    setBusy(accion)
    setError(null)
    try {
      await (accion === 'approve' ? approveUser(null, user.id) : rejectUser(null, user.id))
      await refrescaPanel(queryClient)
    } catch (err) {
      setError(adminErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="break-all text-body font-semibold text-ink">{user.email}</span>
        <span className="text-meta text-ink-2">Requested {panelDate(user.createdAt)}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {confirm ? (
          <>
            <span className="text-meta text-ink-2">
              {`Reject ${user.email}? The request is deleted and nothing is sent.`}
            </span>
            <Button
              variant="danger"
              size="sm"
              ariaLabel={`Reject ${user.email}`}
              busy={busy === 'reject'}
              onClick={() => void run('reject')}
            >
              Reject
            </Button>
            <Button
              variant="quiet"
              size="sm"
              ariaLabel={`Cancel rejecting ${user.email}`}
              onClick={() => setConfirm(false)}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="primary"
              size="sm"
              ariaLabel={`Approve ${user.email}`}
              busy={busy === 'approve'}
              onClick={() => void run('approve')}
            >
              Approve
            </Button>
            <Button
              size="sm"
              ariaLabel={`Reject ${user.email}…`}
              onClick={() => {
                if (busy === null) setConfirm(true)
              }}
            >
              Reject…
            </Button>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-meta text-bad">
          {error}
        </p>
      )}
    </li>
  )
}

/** Cómo se llama cada campo en `Recent changes`. */
const CAMPO: Readonly<Record<string, string>> = {
  status: 'status',
  email: 'email',
  emailVerified: 'email confirmed',
  isAdmin: 'admin',
  premium: 'premium',
  name: 'team name',
  kit: 'kit reverted',
  team: 'blocked team name',
  rider: 'blocked rider name',
}

const valor = (v: string | number | boolean | null): string =>
  v === null ? '—' : typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v)

/**
 * Una fila de `Recent changes` (§8.5): «19 Nov 2026, 18:42 · <actor> · email · old → new». El actor es el
 * correo de quien actuó, o `token` con `ADMIN_TOKEN`. Lo que no tiene valor que enseñar lo dice en palabras.
 */
export function auditLine(e: AdminAuditEntryView): string {
  const cuando = new Date(e.at).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const quien = e.actorEmail ?? e.actor
  const { field, from, to } = e.detail
  const que =
    e.action === 'user.delete'
      ? 'account · deleted'
      : e.action === 'user.birth_date'
        ? 'date of birth · changed'
        : e.action === 'world.tick'
          ? `tick · ${valor(to)} day`
          : e.action === 'world.advance'
            ? `advance · ${valor(to)} days`
            : `${CAMPO[field] ?? field} · ${valor(from)} → ${valor(to)}`
  return `${cuando} · ${quien} · ${que}`
}

/** `Recent changes` (§8.5): las 50 últimas filas del registro del panel, las más nuevas primero. */
function RecentChanges() {
  const audit = useQuery({ queryKey: [AUDIT_KEY], queryFn: () => fetchAdminAudit(null, 50) })
  return (
    <Panel title="Recent changes">
      <QueryView
        query={audit}
        label="recent changes"
        skeleton={{ kind: 'rows', rowHeight: 44 }}
        isEmpty={(list) => list.length === 0}
        empty={{ text: 'No changes yet.' }}
      >
        {(list) => (
          <ul className="grid gap-1">
            {list.map((e) => (
              <li key={e.id} className="break-all text-meta text-ink-2">
                {auditLine(e)}
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </Panel>
  )
}

/** Lo que hace cada botón de una cuenta, para saber cuál está ocupado. */
type Accion = 'verify' | 'premium' | 'admin' | 'delete' | 'email'

/**
 * Una cuenta, con sus acciones: un `li` de la lista del `Panel` de las cuentas. Se exporta para su test, con
 * `initialError`: el fallo de una acción, que en la página solo llega tras pulsar, pintado en estático (como
 * los `initial` de la entrada, PR 21j).
 */
export function UserCard({
  user,
  isMe,
  initialError = null,
  initialEmail = null,
}: {
  readonly user: AdminUser
  readonly isMe: boolean
  readonly initialError?: string | null
  /** `Change email` abierto en estático, para su test: el campo y, si `confirm`, la pregunta */
  readonly initialEmail?: { readonly value: string; readonly confirm: boolean } | null
}) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState<Accion | null>(null)
  const [error, setError] = useState<string | null>(initialError)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [emailOpen, setEmailOpen] = useState(initialEmail !== null)

  async function run(accion: Accion, action: () => Promise<void>): Promise<boolean> {
    // una a la vez: mientras una acción está en marcha, las otras no actúan
    if (busy !== null) return false
    setBusy(accion)
    setError(null)
    try {
      await action()
      await refrescaPanel(queryClient)
      return true
    } catch (err) {
      setError(adminErrorMessage(err, accion === 'delete' ? 'delete' : undefined))
      return false
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
    <li className="py-3">
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
            ariaLabel={`Confirm email for ${user.email}`}
            busy={busy === 'verify'}
            onClick={() => patch('verify', { emailVerified: true })}
          >
            Confirm email
          </Button>
        )}
        <Button
          size="sm"
          ariaLabel={
            user.premium ? `Remove premium from ${user.email}` : `Grant premium to ${user.email}`
          }
          busy={busy === 'premium'}
          onClick={() => patch('premium', { premium: !user.premium })}
        >
          {user.premium ? 'Remove premium' : 'Grant premium'}
        </Button>
        <Button
          size="sm"
          ariaLabel={admin ? `Remove admin from ${user.email}` : `Make admin: ${user.email}`}
          busy={busy === 'admin'}
          {...(adminReason !== undefined ? { disabledReason: adminReason } : {})}
          onClick={() => patch('admin', { isAdmin: !user.isAdmin })}
        >
          {admin ? 'Remove admin' : 'Make admin'}
        </Button>
        {!emailOpen && (
          <Button
            size="sm"
            ariaLabel={`Change email for ${user.email}`}
            onClick={() => {
              setError(null)
              setEmailOpen(true)
            }}
          >
            Change email
          </Button>
        )}
        {user.team && <RenameTeam teamId={user.team.id} teamName={user.team.name} />}
        <Borrado
          email={user.email}
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
      {emailOpen && (
        <ChangeEmail
          oldEmail={user.email}
          initialValue={initialEmail?.value ?? ''}
          initialConfirm={initialEmail?.confirm ?? false}
          busy={busy === 'email'}
          onCancel={() => setEmailOpen(false)}
          onSave={async (email, signOutEverywhere) => {
            const hecho = await run('email', () =>
              updateAdminUser(null, user.id, { email, signOutEverywhere }),
            )
            if (hecho) setEmailOpen(false)
          }}
        />
      )}
      {error && (
        <p role="alert" className="mt-2 text-meta text-bad">
          {error}
        </p>
      )}
    </li>
  )
}

/**
 * `Change email` (docs/cuenta.md §5.5): el campo `New email`, la casilla `Sign out everywhere`, encendida, y
 * `Save`, que pregunta antes de cambiar. No sale ningún correo; el aviso a los aparatos (`email_changed`) llega
 * con el PR 14, y hasta entonces la pregunta no lo promete.
 */
function ChangeEmail({
  oldEmail,
  initialValue,
  initialConfirm,
  busy,
  onCancel,
  onSave,
}: {
  readonly oldEmail: string
  readonly initialValue: string
  readonly initialConfirm: boolean
  readonly busy: boolean
  readonly onCancel: () => void
  readonly onSave: (email: string, signOutEverywhere: boolean) => Promise<void>
}) {
  const [value, setValue] = useState(initialValue)
  const [signOut, setSignOut] = useState(true)
  const [confirm, setConfirm] = useState(initialConfirm)
  const nuevo = value.trim().toLowerCase()

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (nuevo !== '') setConfirm(true)
  }

  if (confirm)
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-meta text-ink-2">
          {`Change ${oldEmail} to ${nuevo}? No email is sent to either address.`}
        </span>
        <Button
          variant="danger"
          size="sm"
          ariaLabel={`Change email of ${oldEmail} to ${nuevo}`}
          busy={busy}
          onClick={() => void onSave(nuevo, signOut)}
        >
          Change email
        </Button>
        <Button
          variant="quiet"
          size="sm"
          ariaLabel={`Cancel changing the email of ${oldEmail}`}
          onClick={() => setConfirm(false)}
        >
          Cancel
        </Button>
      </div>
    )
  return (
    <form onSubmit={onSubmit} className="mt-3 grid max-w-form gap-2">
      <Field
        kind="input"
        type="email"
        id={`new-email-${oldEmail}`}
        label="New email"
        autoComplete="off"
        value={value}
        onChange={setValue}
      />
      <Checkbox label="Sign out everywhere" checked={signOut} onChange={setSignOut} />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          type="submit"
          ariaLabel={`Save the new email of ${oldEmail}`}
        >
          Save
        </Button>
        <Button
          variant="quiet"
          size="sm"
          ariaLabel={`Cancel changing the email of ${oldEmail}`}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

/**
 * Borrar una cuenta, que no se deshace: nunca a la primera; primero pregunta, como la retirada de
 * `MyRaces`. Sin poder borrarla (uno mismo, el raíz), el botón lo dice debajo. Se exporta para su test,
 * que lo pinta en sus dos estados.
 */
export function Borrado({
  email,
  confirming,
  busy,
  disabledReason,
  onAsk,
  onCancel,
  onConfirm,
}: {
  /** la cuenta, para el nombre de sus botones */
  readonly email: string
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
        ariaLabel={`Delete ${email}…`}
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
      <Button
        variant="danger"
        size="sm"
        ariaLabel={`Delete ${email}`}
        busy={busy}
        onClick={onConfirm}
      >
        Delete
      </Button>
      <Button variant="quiet" size="sm" ariaLabel={`Cancel deleting ${email}`} onClick={onCancel}>
        Cancel
      </Button>
    </span>
  )
}
