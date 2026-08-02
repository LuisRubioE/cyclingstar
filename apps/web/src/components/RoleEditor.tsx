import { VOCATIONS, VOCATION_LABELS, type Vocation } from '@cyclingstar/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { setArchetype } from '../api/rider'

/**
 * Cambiar la vocación declarada (la etiqueta) del corredor (#50). Solo cambia el tipo: alinear el
 * entrenamiento hacia él queda en manos del jugador. También influye en las convocatorias por tipo.
 */
export function RoleEditor({ current }: { current: Vocation }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<Vocation>(current)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (value === current) {
      setOpen(false)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await setArchetype(value)
      await qc.invalidateQueries({ queryKey: ['rider', 'me'] })
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(current)
          setOpen(true)
        }}
        className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
      >
        Change role
      </button>
    )
  }

  return (
    <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">
        Pick a new role. This only changes your declared specialty (and which races you get called
        to) — it's up to you to steer your training toward it.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={value}
          onChange={(e) => setValue(e.target.value as Vocation)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        >
          {VOCATIONS.map((v) => (
            <option key={v} value={v}>
              {VOCATION_LABELS[v]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white"
        >
          Cancel
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
