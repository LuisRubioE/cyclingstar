import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  AdminAuthError,
  type AdminKey,
  type BlockedKind,
  addBlocked,
  fetchAdminWhoami,
  fetchBlocklist,
  fetchWorldHealth,
  removeBlocked,
  setPremium,
} from '../api/admin'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { EmptyState } from '../components/ui/EmptyState'
import { Field } from '../components/ui/Field'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'
import { Stat } from '../components/ui/Stat'

/**
 * Base secreta de admins (no enlazada en la navegación): lista de bloqueo de nombres de equipos
 * reales y de ciclistas / personas famosas reales, para evitar su uso. Un administrador con sesión
 * entra directo; sin ella, se sigue pudiendo desbloquear con el ADMIN_TOKEN (el del tick).
 *
 * SEGURIDAD: el token vive SOLO en el estado de React de esta página y se pasa a mano a cada
 * llamada. No se guarda en localStorage ni en ninguna otra parte, así que un XSS no puede
 * robarlo del almacenamiento y no sobrevive a una recarga: hay que introducirlo en cada sesión.
 *
 * Con el sistema desde el PR 21d (E3, docs/visual.md §17.21): la cabecera en `PageHeader`, con la vuelta
 * de 44 al panel en lugar de la `←`; cada campo, un `Field` con su rótulo a la vista y, donde Intro envía,
 * en su `form`; los botones, `Button`, y vacío no se deshabilitan sin porqué (§4.1): el campo dice su
 * error; la salud del mundo en `Stat`, cada tick con su `Chip` en lugar del `✓` y el `✗` (3-d), y cada
 * bloque en su `Panel`.
 */
export function AdminNames() {
  const [token, setToken] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [tokenError, setTokenError] = useState<string | null>(null)
  const whoami = useQuery({ queryKey: ['admin-whoami'], queryFn: fetchAdminWhoami, retry: false })
  // Con sesión de admin no hace falta token: `null` es «con mi sesión».
  const key: AdminKey | undefined = token
    ? token
    : whoami.data?.via === 'session'
      ? null
      : undefined

  function unlock() {
    const value = tokenInput.trim()
    if (!value) {
      setTokenError('Enter the admin token first.')
      return
    }
    setToken(value)
    setTokenInput('')
    setTokenError(null)
  }

  function lock() {
    setToken('')
  }

  // Mientras llega `whoami`, su carga (o su pausa sin red) con `QueryView` (E3, PR 10). Si falla, el
  // token sigue a mano: es la vía de quien no puede entrar con su sesión (y el 401 de quien no es admin
  // llega como `null`).
  if (!token && whoami.isPending)
    return <QueryView query={whoami} label="your admin access" skeleton={{ kind: 'panel' }} />

  if (key === undefined) {
    return (
      <section className="mx-auto max-w-form space-y-4">
        <PageHeader title="Admin — blocked names" />
        <p className="text-meta text-ink-2">
          Enter the admin token to manage the list of real team and rider/celebrity names to keep
          out of the game. The token is kept in memory only, so you have to enter it again after a
          reload.
        </p>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            unlock()
          }}
        >
          <Field
            kind="input"
            id="admin-token"
            label="Admin token"
            type="password"
            autoComplete="off"
            value={tokenInput}
            onChange={(v) => {
              setTokenInput(v)
              setTokenError(null)
            }}
            {...(tokenError !== null ? { error: tokenError } : {})}
          />
          <Button variant="primary" type="submit" layout="justify-self-start">
            Unlock
          </Button>
        </form>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Blocked names"
        status="Names here are never generated and existing ones get renamed on the next world tick."
        {...(token
          ? {
              action: (
                <Button variant="secondary" onClick={lock}>
                  Lock
                </Button>
              ),
            }
          : { back: { to: '/admin', label: 'Admin panel' } })}
      />

      <HealthPanel token={key} onExpired={lock} />

      <div className="grid gap-6 lg:grid-cols-2">
        <BlocklistPanel
          token={key}
          kind="team"
          title="Real team names"
          hint="e.g. UAE Team Emirates, Jumbo-Visma"
          onExpired={lock}
        />
        <BlocklistPanel
          token={key}
          kind="rider"
          title="Real riders & famous people"
          hint="e.g. Tadej Pogačar, Cristiano Ronaldo"
          onExpired={lock}
        />
      </div>

      <Panel title="Premium accounts">
        <p className="text-meta text-ink-2">
          Premium players (admin + trusted, paid later) can take over the bot team their rider races
          for and turn it into a player-managed team.
        </p>
        <PremiumPanel token={key} onExpired={lock} />
      </Panel>
    </section>
  )
}

/**
 * Dar o quitar premium por correo. Sin `form` a propósito: dar premium es un poder, y no sale de un Intro
 * por descuido. Ocupado, el botón que se pulsó; el otro no actúa mientras.
 */
function PremiumPanel({ token, onExpired }: { token: AdminKey; onExpired: () => void }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState<'grant' | 'remove' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)

  async function apply(premium: boolean) {
    if (busy !== null) return
    const e = email.trim()
    if (!e) {
      setFieldError("Enter the player's email first.")
      return
    }
    setBusy(premium ? 'grant' : 'remove')
    setMsg(null)
    setError(null)
    try {
      await setPremium(token, e, premium)
      setMsg(`${premium ? 'Granted' : 'Removed'} premium for ${e}.`)
      setEmail('')
    } catch (err) {
      if (err instanceof AdminAuthError) {
        onExpired()
        return
      }
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mt-3 grid max-w-form gap-3">
      <Field
        kind="input"
        id="premium-email"
        label="Player email"
        type="email"
        placeholder="player@email.com"
        value={email}
        onChange={(v) => {
          setEmail(v)
          setFieldError(null)
        }}
        {...(fieldError !== null ? { error: fieldError } : {})}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" busy={busy === 'grant'} onClick={() => void apply(true)}>
          Grant
        </Button>
        <Button variant="secondary" busy={busy === 'remove'} onClick={() => void apply(false)}>
          Remove
        </Button>
      </div>
      {msg && (
        <p role="status" className="text-meta text-good">
          {msg}
        </p>
      )}
      {error && (
        <p role="alert" className="text-meta text-bad">
          {error}
        </p>
      )}
    </div>
  )
}

function HealthPanel({ token, onExpired }: { token: AdminKey; onExpired: () => void }) {
  const query = useQuery({
    queryKey: ['admin-health'],
    queryFn: () => fetchWorldHealth(token),
    retry: false,
  })
  if (query.isError && query.error instanceof AdminAuthError) onExpired()
  // Los estados, con `QueryView` (E3, PR 10): un fallo ya no se pinta como nada.
  if (query.data === undefined)
    return <QueryView query={query} label="world health" skeleton={{ kind: 'panel' }} />
  const h = query.data
  return (
    <div className="grid gap-4">
      {/* las cifras, en `Stat` (§4.4; PR 21d), en un renglón que parte en el teléfono, como las de `My races` */}
      <Panel title="World health">
        <div className="flex flex-wrap gap-x-6 gap-y-3 sm:grid sm:grid-cols-4 lg:grid-cols-6">
          <Stat label="Game day" value={h.currentDay} />
          <Stat label="Season" value={h.season + 1} />
          <Stat label="Active riders" value={h.riders.active} />
          <Stat label="Human riders" value={h.riders.human} />
          <Stat label="Free agents" value={h.riders.freeAgents} />
          <Stat label="Retired" value={h.riders.retired} />
          <Stat label="Teams" value={h.teams.total} />
          <Stat label="Player teams" value={h.teams.human} />
          <Stat label="WT / PRS / CON" value={`${h.teams.wt}/${h.teams.prs}/${h.teams.con}`} />
          <Stat label="Accounts" value={h.users} />
        </div>
      </Panel>
      {/* cada tick, con su `Chip`, `OK` o `Failed`, en lugar del `✓` y el `✗` (3-d) */}
      <Panel title="Recent ticks">
        {h.recentTicks.length === 0 ? (
          <EmptyState text="No ticks yet." />
        ) : (
          <ul className="divide-y divide-line">
            {h.recentTicks.map((t, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-meta text-ink-2"
              >
                <span>{new Date(t.startedAt).toLocaleString()}</span>
                <span className="flex items-center gap-2 tabular-nums">
                  <Chip tone={t.ok ? 'good' : 'bad'}>{t.ok ? 'OK' : 'Failed'}</Chip>
                  {t.daysProcessed}d · {t.durationMs}ms
                  {t.notes ? ` · ${t.notes}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

function BlocklistPanel({
  token,
  kind,
  title,
  hint,
  onExpired,
}: {
  token: AdminKey
  kind: BlockedKind
  title: string
  hint: string
  onExpired: () => void
}) {
  const qc = useQueryClient()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const query = useQuery({
    queryKey: ['blocklist', kind],
    queryFn: () => fetchBlocklist(token, kind),
    retry: false,
  })

  function handleError(err: unknown) {
    if (err instanceof AdminAuthError) {
      onExpired()
      return
    }
    setError(err instanceof Error ? err.message : 'Something went wrong.')
  }

  async function add() {
    if (busy) return
    const v = value.trim()
    if (!v) {
      setFieldError('Enter a name first.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await addBlocked(token, kind, v)
      setValue('')
      await qc.invalidateQueries({ queryKey: ['blocklist', kind] })
    } catch (err) {
      handleError(err)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setError(null)
    try {
      await removeBlocked(token, id)
      await qc.invalidateQueries({ queryKey: ['blocklist', kind] })
    } catch (err) {
      handleError(err)
    }
  }

  if (query.isError && query.error instanceof AdminAuthError) {
    onExpired()
  }

  return (
    <Panel title={title}>
      <div className="grid gap-3">
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
        >
          <Field
            kind="input"
            id={`blocked-${kind}`}
            label="Add a name"
            help={hint}
            value={value}
            onChange={(v) => {
              setValue(v)
              setFieldError(null)
            }}
            {...(fieldError !== null ? { error: fieldError } : {})}
          />
          <Button variant="primary" type="submit" busy={busy} layout="justify-self-start">
            Add
          </Button>
        </form>

        {error && (
          <p role="alert" className="text-meta text-bad">
            {error}
          </p>
        )}

        {/* Los estados, con `QueryView` (E3, PR 10): un fallo ya no se pinta como «nada bloqueado». */}
        <QueryView
          query={query}
          label={title.toLowerCase()}
          skeleton={{ kind: 'rows', rowHeight: 44 }}
          isEmpty={(items) => items.length === 0}
          empty={{ text: 'Nothing blocked yet.' }}
        >
          {(items) => (
            <ul className="divide-y divide-line">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 text-body text-ink">{item.value}</span>
                  <Button
                    variant="quiet"
                    ariaLabel={`Remove ${item.value}`}
                    onClick={() => void remove(item.id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </QueryView>
      </div>
    </Panel>
  )
}
