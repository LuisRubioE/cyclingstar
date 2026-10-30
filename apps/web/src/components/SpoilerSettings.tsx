import type { HorizonSummary, SpoilerScope } from '@cyclingstar/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { putSpoilerScope } from '../api/watch'
import { useHorizon, useHorizonRev, veilApplies } from '../queryClient'
import { Panel } from './ui/Panel'
import { Segmented } from './ui/Segmented'

/**
 * Los tres alcances (§10.4, DD-01), con lo que protege cada uno dicho para el jugador. Desde el PR 21f, cada
 * uno con su palabra corta, la de su opción en el `Segmented`, y su pista entera, que se lee debajo.
 */
const SCOPES: readonly {
  readonly scope: SpoilerScope
  readonly label: string
  readonly hint: string
}[] = [
  {
    scope: 'guarded',
    label: 'Yours and the big ones',
    hint: 'Your rider’s and your team’s races, the ones you follow, the three grand tours and the five monuments.',
  },
  {
    scope: 'own_only',
    label: 'Only yours',
    hint: 'Your rider’s and your team’s races, and the ones you follow.',
  },
  { scope: 'off', label: 'Nothing', hint: 'Results show as soon as each stage is raced.' },
]

const ASK = [
  { key: 'yes', label: 'Yes' },
  { key: 'no', label: 'No' },
] as const

/**
 * El horizonte de quien mira si la protección se enseña, o null: solo con el velo para quien mira, y con
 * su horizonte ya llegado. Lo lee también la cuenta, que sin ella da la respuesta a otro `Panel` (§7.3).
 */
export function useSpoilerProtection(): HorizonSummary | null {
  const rev = useHorizonRev()
  const horizon = useHorizon()
  return veilApplies(rev) ? (horizon.data ?? null) : null
}

/**
 * EL ALCANCE DEL VELO EN LOS AJUSTES (E2, docs/retransmision.md §10.4 y §11.11; DD-01, DD-17; paso 9b). Qué
 * carreras se protegen sin pedirlo (`guarded`, por defecto; `own_only`; u `off`), y si `Show result`
 * pregunta antes (`users.reveal_confirm`, que `Don't ask again` apaga). Es el destino de `Manage` en los
 * avisos de los agregados (`/account#spoilers`). Solo con el velo para quien mira: con `SPOILER_MODE`
 * apagado, o en `admins` para un jugador, no sale, y la cuenta es la de hoy.
 *
 * CON EL SISTEMA (E3, docs/visual.md §17.21; PR 21f): el `Panel` que contesta a la 28 (§7.3). Las dos
 * elecciones, en `Segmented`, como el modo del cuadro (PR 14), en lugar de los radios de 13 px y la casilla:
 * el alcance, con la pista de la elegida a la vista debajo; y si pregunta antes, `Yes` o `No`, con su frase
 * encima, porque el nombre de un `Segmented` solo lo oye el lector. Cada pulsación guarda, como el radio de
 * antes, y mientras guarda no se manda otra.
 */
export function SpoilerSettings() {
  const queryClient = useQueryClient()
  const h = useSpoilerProtection()
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
  if (h === null) return null
  const askFirst = h.revealConfirm ?? true
  const elegido = SCOPES.find((s) => s.scope === h.scope) ?? SCOPES[0]!
  const guarda = (next: { scope: SpoilerScope; revealConfirm?: boolean }) => {
    if (!save.isPending) save.mutate(next)
  }
  return (
    // el ancla de `Manage` (`/account#spoilers`): el `Panel` no lleva `id`
    <div id="spoilers">
      <Panel title="Spoiler protection" answer>
        <div className="grid gap-3">
          <p className="text-meta text-ink-2">
            Which races keep their results hidden until you watch them. Everything else in the world
            is shown up to date.
          </p>
          <div className="grid gap-1">
            <Segmented
              label="Races to protect"
              options={SCOPES.map((s) => ({ key: s.scope, label: s.label }))}
              value={h.scope}
              onChange={(scope) => guarda({ scope })}
            />
            <p className="text-meta text-ink-2">{elegido.hint}</p>
          </div>
          <div className="grid gap-1">
            <p className="text-meta font-semibold text-ink">Ask before showing a result</p>
            <Segmented
              label="Ask before showing a result"
              options={ASK}
              value={askFirst ? 'yes' : 'no'}
              onChange={(v) => guarda({ scope: h.scope, revealConfirm: v === 'yes' })}
            />
          </div>
          {save.isError && (
            <p role="alert" className="text-meta text-bad">
              Could not save your settings.
            </p>
          )}
        </div>
      </Panel>
    </div>
  )
}
