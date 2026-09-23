import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  type AdminUser,
  type AdminUserPatch,
  deleteAdminUser,
  fetchAdminUsers,
  fetchAdminWhoami,
  updateAdminUser,
} from '../api/admin'
import { ApiError } from '../api/request'

/**
 * Panel de administración (cuentas). Sólo entra quien la API reconoce como admin por su SESIÓN:
 * la columna `is_admin` o el correo confirmado de `ADMIN_EMAIL`. Aquí no se pide token; la
 * decisión la toma el servidor en cada petición, y esta página sólo enseña lo que él permite.
 *
 * Las salvaguardas viven en la API (no quitarse el admin, no borrarse, no borrar al raíz); la
 * interfaz las refleja desactivando botones, pero no es la que protege.
 */

/** Traducción de los códigos de error del panel a qué ha pasado. */
function adminErrorMessage(err: unknown): string {
  const code = err instanceof ApiError ? err.code : null
  switch (code) {
    case 'no_puedes_quitarte_admin':
      return 'You cannot remove your own admin rights.'
    case 'borra_tu_cuenta_desde_ajustes':
      return 'Delete your own account from Account settings.'
    case 'es_el_admin_raiz':
      return 'That is the root admin (ADMIN_EMAIL): it cannot be deleted from here.'
    case 'no_encontrado':
      return 'That account no longer exists.'
    default:
      return err instanceof Error ? err.message : 'Something went wrong.'
  }
}

const USERS_KEY = 'admin-users'

export function AdminPanel() {
  const whoami = useQuery({ queryKey: ['admin-whoami'], queryFn: fetchAdminWhoami, retry: false })

  if (whoami.isPending) return <p className="text-slate-500">Loading…</p>
  if (!whoami.data || whoami.data.via !== 'session') {
    return (
      <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">No access</h1>
        <p className="mt-2 text-sm text-slate-500">This page is for administrators only.</p>
      </section>
    )
  }
  return <Panel me={whoami.data.userId} />
}

function Panel({ me }: { me: string | null }) {
  const [search, setSearch] = useState('')
  const users = useQuery({
    queryKey: [USERS_KEY, search.trim()],
    queryFn: () => fetchAdminUsers(null, search),
    retry: false,
  })

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <p className="mt-1 text-sm text-slate-500">Accounts, newest first.</p>
        </div>
        <Link
          to="/admin/names"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Blocked names &amp; world health →
        </Link>
      </div>

      <label htmlFor="admin-search" className="sr-only">
        Search by email
      </label>
      <input
        id="admin-search"
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by email…"
        className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      />

      {users.isPending && <p className="text-sm text-slate-500">Loading accounts…</p>}
      {users.isError && <p className="text-sm text-red-600">{adminErrorMessage(users.error)}</p>}
      {users.data && users.data.length === 0 && (
        <p className="text-sm text-slate-500">No accounts match.</p>
      )}
      {users.data && users.data.length > 0 && (
        <ul className="space-y-3">
          {users.data.map((u) => (
            <UserCard key={u.id} user={u} isMe={u.id === me} />
          ))}
        </ul>
      )}
    </section>
  )
}

function Badge({
  tone,
  children,
}: {
  tone: 'green' | 'amber' | 'indigo' | 'slate'
  children: string
}) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    slate: 'bg-slate-50 text-slate-600 ring-slate-200',
  } as const
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${tones[tone]}`}>
      {children}
    </span>
  )
}

const actionClass =
  'rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'

function UserCard({ user, isMe }: { user: AdminUser; isMe: boolean }) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await queryClient.invalidateQueries({ queryKey: [USERS_KEY] })
    } catch (err) {
      setError(adminErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const patch = (p: AdminUserPatch) => run(() => updateAdminUser(null, user.id, p))
  const admin = user.isAdmin || user.isRootAdmin

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="break-all font-medium text-slate-900">{user.email}</span>
        {isMe && <Badge tone="slate">you</Badge>}
        {user.emailVerified ? (
          <Badge tone="green">confirmed</Badge>
        ) : (
          <Badge tone="amber">not confirmed</Badge>
        )}
        {user.isRootAdmin && <Badge tone="indigo">root admin</Badge>}
        {user.isAdmin && !user.isRootAdmin && <Badge tone="indigo">admin</Badge>}
        {user.premium && <Badge tone="indigo">premium</Badge>}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Joined {new Date(user.createdAt).toLocaleDateString()}
        {' · '}
        {user.rider ? (
          <Link to={`/world/riders/${user.rider.id}`} className="text-indigo-600 hover:underline">
            {user.rider.name}
          </Link>
        ) : (
          'no rider'
        )}
        {user.team && (
          <>
            {' · manages '}
            <Link to={`/world/teams/${user.team.id}`} className="text-indigo-600 hover:underline">
              {user.team.name}
            </Link>
          </>
        )}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {!user.emailVerified && (
          <button
            type="button"
            disabled={busy}
            onClick={() => patch({ emailVerified: true })}
            className={actionClass}
          >
            Confirm email
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ premium: !user.premium })}
          className={actionClass}
        >
          {user.premium ? 'Remove premium' : 'Grant premium'}
        </button>
        <button
          type="button"
          // El raíz es admin por ADMIN_EMAIL, no por la columna: quitársela no cambiaría nada.
          disabled={busy || user.isRootAdmin || (isMe && admin)}
          title={
            user.isRootAdmin
              ? 'Root admin (ADMIN_EMAIL)'
              : isMe
                ? 'You cannot remove your own admin rights'
                : undefined
          }
          onClick={() => patch({ isAdmin: !user.isAdmin })}
          className={actionClass}
        >
          {admin ? 'Remove admin' : 'Make admin'}
        </button>
        {!confirmDelete ? (
          <button
            type="button"
            disabled={busy || isMe || user.isRootAdmin}
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete…
          </button>
        ) : (
          <span className="flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-800">
            Delete this account? The rider and team stay, run by the game.
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => deleteAdminUser(null, user.id))}
              className="rounded-md bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-500 disabled:opacity-50"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="font-medium text-red-800 hover:underline"
            >
              Cancel
            </button>
          </span>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </li>
  )
}
