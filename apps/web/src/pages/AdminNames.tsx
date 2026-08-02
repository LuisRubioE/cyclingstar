import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  AdminAuthError,
  type BlockedKind,
  addBlocked,
  clearAdminToken,
  fetchBlocklist,
  getAdminToken,
  removeBlocked,
  setAdminToken,
  setPremium,
} from '../api/admin'

/**
 * Base secreta de admins (no enlazada en la navegación): lista de bloqueo de nombres de equipos
 * reales y de ciclistas / personas famosas reales, para evitar su uso. Se protege con el
 * ADMIN_TOKEN (el que ya usas para el tick), guardado en el navegador.
 */
export function AdminNames() {
  const [unlocked, setUnlocked] = useState(getAdminToken().length > 0)
  const [tokenInput, setTokenInput] = useState('')

  function unlock() {
    if (!tokenInput.trim()) return
    setAdminToken(tokenInput)
    setTokenInput('')
    setUnlocked(true)
  }

  function lock() {
    clearAdminToken()
    setUnlocked(false)
  }

  if (!unlocked) {
    return (
      <section className="mx-auto max-w-md space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Admin — blocked names</h1>
        <p className="text-sm text-slate-500">
          Enter the admin token to manage the list of real team and rider/celebrity names to keep
          out of the game.
        </p>
        <input
          type="password"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && unlock()}
          placeholder="Admin token"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <button
          type="button"
          onClick={unlock}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500"
        >
          Unlock
        </button>
      </section>
    )
  }

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Blocked names</h1>
          <p className="mt-1 text-sm text-slate-500">
            Names here are never generated and existing ones get renamed on the next world tick.
          </p>
        </div>
        <button
          type="button"
          onClick={lock}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Lock
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <BlocklistPanel
          kind="team"
          title="Real team names"
          hint="e.g. UAE Team Emirates, Jumbo-Visma"
          onExpired={lock}
        />
        <BlocklistPanel
          kind="rider"
          title="Real riders & famous people"
          hint="e.g. Tadej Pogačar, Cristiano Ronaldo"
          onExpired={lock}
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-800">Premium accounts</h2>
        <p className="text-xs text-slate-400">
          Premium players (admin + trusted, paid later) can take over the bot team their rider races
          for and turn it into a player-managed team.
        </p>
        <PremiumPanel onExpired={lock} />
      </div>
    </section>
  )
}

function PremiumPanel({ onExpired }: { onExpired: () => void }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function apply(premium: boolean) {
    const e = email.trim()
    if (!e) return
    setBusy(true)
    setMsg(null)
    setError(null)
    try {
      await setPremium(e, premium)
      setMsg(`${premium ? 'Granted' : 'Removed'} premium for ${e}.`)
      setEmail('')
    } catch (err) {
      if (err instanceof AdminAuthError) {
        onExpired()
        return
      }
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 max-w-xl space-y-2">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="player@email.com"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <button
          type="button"
          onClick={() => apply(true)}
          disabled={busy || email.trim().length === 0}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          Grant
        </button>
        <button
          type="button"
          onClick={() => apply(false)}
          disabled={busy || email.trim().length === 0}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Remove
        </button>
      </div>
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

function BlocklistPanel({
  kind,
  title,
  hint,
  onExpired,
}: {
  kind: BlockedKind
  title: string
  hint: string
  onExpired: () => void
}) {
  const qc = useQueryClient()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const query = useQuery({
    queryKey: ['blocklist', kind],
    queryFn: () => fetchBlocklist(kind),
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
    const v = value.trim()
    if (!v) return
    setBusy(true)
    setError(null)
    try {
      await addBlocked(kind, v)
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
      await removeBlocked(id)
      await qc.invalidateQueries({ queryKey: ['blocklist', kind] })
    } catch (err) {
      handleError(err)
    }
  }

  if (query.isError && query.error instanceof AdminAuthError) {
    onExpired()
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        <p className="text-xs text-slate-400">{hint}</p>
      </div>

      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add a name…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <button
          type="button"
          onClick={add}
          disabled={busy || value.trim().length === 0}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {query.isPending ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {(query.data ?? []).length === 0 && (
            <li className="px-3 py-3 text-sm text-slate-400">Nothing blocked yet.</li>
          )}
          {(query.data ?? []).map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-sm text-slate-700">{item.value}</span>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="text-xs font-medium text-slate-400 transition hover:text-red-600"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
