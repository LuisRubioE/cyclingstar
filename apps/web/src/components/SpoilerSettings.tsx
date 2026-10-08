import type { HorizonSummary, SpoilerScope } from '@cyclingstar/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { putSpoilerScope } from '../api/watch'
import { useHorizon, useHorizonRev, veilApplies } from '../queryClient'

/** Los tres alcances (§10.4, DD-01), con lo que protege cada uno dicho para el jugador. */
const SCOPES: readonly {
  readonly scope: SpoilerScope
  readonly label: string
  readonly hint: string
}[] = [
  {
    scope: 'guarded',
    label: 'Your races and the big ones',
    hint: 'Your rider’s and your team’s races, the ones you follow, the three grand tours and the five monuments.',
  },
  {
    scope: 'own_only',
    label: 'Only your own races',
    hint: 'Your rider’s and your team’s races, and the ones you follow.',
  },
  { scope: 'off', label: 'Nothing', hint: 'Results show as soon as each stage is raced.' },
]

/**
 * EL ALCANCE DEL VELO EN LOS AJUSTES (E2, docs/retransmision.md §10.4 y §11.11; DD-01, DD-17; paso 9b). Qué
 * carreras se protegen sin pedirlo (`guarded`, por defecto; `own_only`; u `off`), y si `Show result`
 * pregunta antes (`users.reveal_confirm`, que `Don't ask again` apaga). Es el destino de `Manage` en los
 * avisos de los agregados (`/account#spoilers`). Solo con el velo para quien mira: con `SPOILER_MODE`
 * apagado, o en `admins` para un jugador, no sale, y la cuenta es la de hoy.
 */
export function SpoilerSettings() {
  const queryClient = useQueryClient()
  const rev = useHorizonRev()
  const horizon = useHorizon()
  const save = useMutation({
    mutationFn: (next: { scope: SpoilerScope; revealConfirm?: boolean }) =>
      putSpoilerScope(next.scope, next.revealConfirm),
    onSuccess: ({ rev: nextRev }, next) => {
      queryClient.setQueryData<HorizonSummary | null>(['horizon'], (old) =>
        old == null
          ? old
          : {
              ...old,
              rev: nextRev,
              scope: next.scope,
              ...(next.revealConfirm === undefined ? {} : { revealConfirm: next.revealConfirm }),
            },
      )
      // lo que queda por ver cambia con el alcance: el horizonte se pide otra vez
      void queryClient.invalidateQueries({ queryKey: ['horizon'] })
    },
  })
  const h = horizon.data
  if (!veilApplies(rev) || h == null) return null
  const askFirst = h.revealConfirm ?? true
  return (
    <div id="spoilers" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Spoiler protection</h2>
      <p className="mt-1 text-xs text-slate-500">
        Which races keep their results hidden until you watch them. Everything else in the world is
        shown up to date.
      </p>
      <fieldset className="mt-3 space-y-2" disabled={save.isPending}>
        <legend className="sr-only">Races to protect</legend>
        {SCOPES.map((s) => (
          <label key={s.scope} className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="spoiler-scope"
              className="mt-1"
              checked={h.scope === s.scope}
              onChange={() => save.mutate({ scope: s.scope })}
            />
            <span>
              <span className="font-medium">{s.label}</span>
              <span className="block text-xs text-slate-500">{s.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={askFirst}
          disabled={save.isPending}
          onChange={(e) => save.mutate({ scope: h.scope, revealConfirm: e.target.checked })}
        />
        Ask before showing a result
      </label>
      {save.isError && <p className="mt-2 text-sm text-red-600">Could not save your settings.</p>}
    </div>
  )
}
