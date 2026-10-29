import { COUNTRIES } from '@cyclingstar/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { type TeamDetail, updateMyTeam } from '../api/browse'

/** Mensajes de error del servidor al editar el equipo. */
const EDIT_ERROR: Record<string, string> = {
  nombre_invalido: 'The name must be 2–40 characters.',
  nombre_bloqueado: 'That name is a real team or a blocked name.',
  nombre_repetido: 'Another team already uses that name.',
  pais_desconocido: 'Pick a country from the list.',
  sin_equipo: 'You do not manage a team.',
}

/**
 * Panel de gestión del dueño: renombrar y cambiar país (SPEC 7). El panel de las doce semillas del
 * maillot salió en el 17b de E3 (docs/visual.md §8.6, 17-i): desde la traducción, lo que eligiera ya no
 * se vería; el maillot vigente lo enseña `/team/identity`, y se cambia con el editor del 18b.
 */
export function TeamManager({ team }: { team: TeamDetail }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(team.name)
  const [country, setCountry] = useState(team.country ?? 'ES')

  const save = useMutation({
    mutationFn: () =>
      updateMyTeam({
        name: name.trim() === team.name ? undefined : name.trim(),
        country: country === team.country ? undefined : country,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['team', team.id] })
      void queryClient.invalidateQueries({ queryKey: ['teams'] })
      void queryClient.invalidateQueries({ queryKey: ['team-control'] })
    },
  })

  const dirty = name.trim() !== team.name || country !== (team.country ?? 'ES')
  const errorCode = save.error instanceof Error ? save.error.message : null

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Manage team</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Country</span>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {errorCode && (
        <p className="text-sm text-red-600">{EDIT_ERROR[errorCode] ?? 'Could not save changes.'}</p>
      )}
      {save.isSuccess && !dirty && <p className="text-sm text-emerald-600">Saved.</p>}

      <button
        type="button"
        onClick={() => save.mutate()}
        disabled={!dirty || save.isPending}
        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
      >
        {save.isPending ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  )
}
