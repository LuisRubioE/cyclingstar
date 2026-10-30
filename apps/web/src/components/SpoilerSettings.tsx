import type { HorizonSummary, SpoilerScope } from '@cyclingstar/shared'
import { type UseQueryResult, useMutation, useQueryClient } from '@tanstack/react-query'
import { putSpoilerScope } from '../api/watch'
import {
  horizonWanted,
  revOf,
  useAdminStatus,
  useHealth,
  useHorizon,
  veilApplies,
} from '../queryClient'
import { InfoButton } from './ui/InfoButton'
import { Panel } from './ui/Panel'
import { QueryView } from './ui/QueryView'
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

/** Si la protección se enseña: no (`off`), en espera de su horizonte (`wait`), o con él (`on`). */
export type SpoilerProtection =
  | { readonly kind: 'off' }
  | { readonly kind: 'wait'; readonly query: UseQueryResult<HorizonSummary | null> }
  | { readonly kind: 'on'; readonly horizon: HorizonSummary }

/**
 * Si la protección se enseña: solo con el velo para quien mira. Mientras su horizonte no llega, o si falla,
 * se enseña su espera o su fallo, en su sitio, y no nada (§4.2; la revisión del 21f): así la respuesta de la
 * 28 no salta al llegar, y quien viene de `Manage` sabe por qué no está. Lo lee también la cuenta, que sin
 * ella da la respuesta a otro `Panel` (§7.3).
 */
export function useSpoilerProtection(): SpoilerProtection {
  const health = useHealth()
  const admin = useAdminStatus()
  const horizon = useHorizon()
  if (veilApplies(revOf(health, horizon, admin)) && horizon.data != null)
    return { kind: 'on', horizon: horizon.data }
  if (health.data !== undefined && horizonWanted(health.data, admin) && horizon.data === undefined)
    return { kind: 'wait', query: horizon }
  return { kind: 'off' }
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
 * antes. Desde la revisión del 21f, la que se pulsó se ve marcada al momento, y mientras guarda las dos
 * quedan quietas con su porqué (`Saving…`, §4.1), en lugar de no hacer caso sin decirlo; y las tres pistas
 * van juntas tras un `InfoButton`, para compararlas sin guardar ninguna.
 */
export function SpoilerSettings() {
  const queryClient = useQueryClient()
  const proteccion = useSpoilerProtection()
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
  if (proteccion.kind === 'off') return null
  if (proteccion.kind === 'wait')
    return (
      <div id="spoilers">
        <Panel title="Spoiler protection" answer>
          <QueryView
            query={proteccion.query}
            label="your spoiler settings"
            skeleton={{ kind: 'panel' }}
          />
        </Panel>
      </div>
    )
  const h = proteccion.horizon
  // mientras guarda, lo que se pulsó, marcado ya, y las dos elecciones quietas con su porqué
  const pendiente = save.isPending ? save.variables : undefined
  const scope = pendiente?.scope ?? h.scope
  const askFirst = pendiente?.revealConfirm ?? h.revealConfirm ?? true
  const elegido = SCOPES.find((s) => s.scope === scope) ?? SCOPES[0]!
  const guardando = save.isPending ? { disabledReason: 'Saving…' } : {}
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
              value={scope}
              onChange={(next) => save.mutate({ scope: next })}
              {...guardando}
            />
            <div className="flex flex-wrap items-center gap-x-1">
              <p className="min-w-0 flex-1 text-meta text-ink-2">{elegido.hint}</p>
              <InfoButton label="About the three options">
                {SCOPES.map((s) => (
                  <span key={s.scope} className="block">
                    <span className="font-semibold text-ink">{s.label}</span>: {s.hint}
                  </span>
                ))}
              </InfoButton>
            </div>
          </div>
          <div className="grid gap-1">
            <p className="text-meta font-semibold text-ink">Ask before showing a result</p>
            <Segmented
              label="Ask before showing a result"
              options={ASK}
              value={askFirst ? 'yes' : 'no'}
              onChange={(v) => save.mutate({ scope, revealConfirm: v === 'yes' })}
              {...guardando}
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
