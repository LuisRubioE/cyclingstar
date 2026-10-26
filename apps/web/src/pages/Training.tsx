import type { TrainingOrder } from '@cyclingstar/shared'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { fetchMyRider } from '../api/rider'
import {
  type TrainingPlanResponse,
  fetchTrainingPlan,
  previewTrainingPlan,
  saveTrainingPlan,
} from '../api/sheet'
import {
  type OrdersResponse,
  type TeamTraining,
  fetchOrders,
  fetchTeamTraining,
  saveOrders,
  saveTeamTraining,
} from '../api/training'
import { ArrivalCards } from '../components/ArrivalCards'
import { DayByDay } from '../components/DayByDay'
import { PlanLadder } from '../components/PlanLadder'
import { ActionBar, type ActionBarStatus } from '../components/ui/ActionBar'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { QueryView } from '../components/ui/QueryView'
import { Skeleton } from '../components/ui/Skeleton'
import {
  type DayEdits,
  type PlanDraft,
  adoptTeamSuggestions,
  applyEdits,
  backTarget,
  backToLabel,
  buildServerPlan,
  changeCount,
  consequenceText,
  ordersWindow,
  planChanges,
  planWeeks,
  previewRequest,
  savedDraft,
  statusLine,
  tripsOf,
  weekOfDay,
  withDayEdit,
  withoutOrder,
} from '../domain/trainingPlan'
import { horizonKey, useHorizonRev } from '../queryClient'

/**
 * EL CUADRO DE ENTRENAMIENTO (E3, docs/visual.md §10; PR 14): el examen de E3, una pantalla con el motor bien
 * que no se entendía. Contesta cuatro preguntas, de arriba abajo (§10.1): cómo llego a mis próximas carreras
 * (`How you'll arrive`, la respuesta), qué hago cada día y quién lo ha decidido (`Your month`), cómo lo cambio
 * y qué cambia (sus bloques y la `ActionBar`), y un día concreto (`Edit day by day`, plegado: el dueño pidió
 * «que permita ver y editar los próximos 28 días, no solo 1 semana»).
 *
 * Lo que dice cada día y cada llegada sale de la vista previa (§11.2), que proyecta lo que hará el tick con
 * la misma precedencia (`resolveTrainingDay`) y la curva que escribe; la pantalla solo pone encima lo tocado
 * para que se vea al momento. Lo guardado llega de `GET /plan` y `GET /orders`; lo tocado vive aparte, por
 * día de juego, y un refetch en segundo plano nunca lo pisa. Un solo guardado (§10.9): `PUT /plan`, si cambió
 * el plan, y después `PUT /orders` con la ventana de la pantalla, si cambió un día.
 */

export function Training() {
  const rev = useHorizonRev()
  const mine = useQuery({
    queryKey: horizonKey(['rider', 'me'], rev),
    queryFn: fetchMyRider,
    enabled: rev !== undefined,
  })
  const orders = useQuery({
    queryKey: horizonKey(['orders'], rev),
    queryFn: fetchOrders,
    enabled: rev !== undefined,
  })
  const stored = useQuery({ queryKey: ['training-plan'], queryFn: fetchTrainingPlan })
  const team = useQuery({ queryKey: ['team-training'], queryFn: fetchTeamTraining })

  // Los estados, con `QueryView` (E3, PR 10): la respuesta de las pantallas 40, 41 y 45.
  if (mine.data === undefined)
    return <QueryView query={mine} label="your rider" skeleton={{ kind: 'panel' }} answer />
  if (mine.data === null)
    return (
      <EmptyState
        icon="rider"
        text="You don't have a rider yet. Create one, and plan their training here."
        action={
          <Button to="/create" variant="primary">
            Create your rider
          </Button>
        }
        answer
      />
    )
  if (orders.data === undefined)
    return (
      <QueryView query={orders} label="your training plan" skeleton={{ kind: 'panel' }} answer />
    )
  if (stored.data === undefined)
    return (
      <QueryView query={stored} label="your training plan" skeleton={{ kind: 'panel' }} answer />
    )
  return <Cuadro orders={orders.data} stored={stored.data} team={team.data ?? null} />
}

function Cuadro({
  orders,
  stored,
  team,
}: {
  readonly orders: OrdersResponse
  readonly stored: TrainingPlanResponse
  readonly team: TeamTraining | null
}) {
  const qc = useQueryClient()
  const rev = useHorizonRev()
  const saved = useMemo(() => savedDraft(stored), [stored])
  // Lo tocado sin guardar, APARTE de lo guardado: un refetch cambia la base, nunca esto.
  const [cambios, setCambios] = useState<Partial<PlanDraft>>({})
  const [edits, setEdits] = useState<DayEdits>({})
  const [status, setStatus] = useState<ActionBarStatus>('idle')
  const [teamMessage, setTeamMessage] = useState<string | null>(null)
  const draft: PlanDraft = { ...saved, ...cambios }

  const tomorrow = orders.currentDay + 1
  const ventana = ordersWindow(orders.orders, edits)
  const savedReq = previewRequest(saved, orders.orders)
  const draftReq = previewRequest(draft, ventana)
  const savedPreview = useQuery({
    queryKey: horizonKey(['plan-preview', JSON.stringify(savedReq)], rev),
    queryFn: () => previewTrainingPlan(savedReq),
    enabled: rev !== undefined,
  })
  // Mientras llega la de lo tocado, la anterior: la pantalla no se vacía a cada cambio.
  const preview = useQuery({
    queryKey: horizonKey(['plan-preview', JSON.stringify(draftReq)], rev),
    queryFn: () => previewTrainingPlan(draftReq),
    enabled: rev !== undefined,
    placeholderData: keepPreviousData,
  })

  const calendar = planWeeks({
    tomorrow,
    horizonDays: orders.horizonDays,
    startDay: draft.startFresh ? null : (stored.plan?.startDay ?? null),
  })
  const teamByDay = new Map((team?.plan ?? []).map((o) => [o.gameDay, o]))
  const fallback = (gameDay: number) => {
    const week = weekOfDay(calendar, gameDay)
    const weekBlock = week === null ? null : (draft.blocks[week.index] ?? null)
    const source = backTarget({ mode: draft.mode, weekBlock, teamPlanDay: teamByDay.has(gameDay) })
    return {
      source,
      block:
        source === 'bloque' && weekBlock !== null && week !== null
          ? { code: weekBlock, week: (week.index + 1) as 1 | 2 | 3 | 4 }
          : null,
    }
  }
  const days =
    preview.data === undefined
      ? null
      : applyEdits(preview.data.days, edits, { mode: draft.mode, fallback })
  const races = preview.data?.races ?? []
  const direction = new Map(orders.travelDays.map((t) => [t.gameDay, t.direction]))
  const trips = days === null ? [] : tripsOf({ races, days, travelDays: orders.travelDays })

  const changes = changeCount(saved, draft, edits)
  const consequence = consequenceText({
    saved,
    draft,
    savedRaces: savedPreview.data?.races ?? races,
    draftRaces: races,
    tomorrow,
  })

  function cambia(patch: Partial<PlanDraft>) {
    setStatus('idle')
    setCambios((c) => ({ ...c, ...patch }))
  }
  function tocaDias(f: (e: DayEdits) => DayEdits) {
    setStatus('idle')
    setEdits(f)
  }

  async function guardar() {
    setStatus('saving')
    try {
      if (planChanges(saved, draft) > 0)
        await saveTrainingPlan({
          mode: draft.mode,
          plan: {
            blocks: [...draft.blocks],
            focusAttr: draft.focusAttr,
            intensity: draft.intensity,
          },
          startFresh: draft.startFresh,
        })
      if (Object.keys(edits).length > 0) await saveOrders(ventana)
      // Lo guardado, de nuevo, antes de soltar lo tocado: la pantalla no vuelve a lo de antes un momento.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['training-plan'] }),
        qc.invalidateQueries({ queryKey: ['orders'] }),
        qc.invalidateQueries({ queryKey: ['plan-preview'] }),
      ])
      setCambios({})
      setEdits({})
      setStatus('saved')
    } catch {
      setStatus('failed')
    }
  }

  async function publicar() {
    setTeamMessage(null)
    const plan: TrainingOrder[] = (days === null ? [] : buildServerPlan(days)).map((d) => ({
      gameDay: d.gameDay,
      session: d.session ?? 'descanso_activo',
      intensity: d.intensity ?? 'normal',
    }))
    try {
      await saveTeamTraining(plan)
      setTeamMessage('Published to your squad.')
      await qc.invalidateQueries({ queryKey: ['team-training'] })
    } catch (err) {
      setTeamMessage(err instanceof Error ? err.message : 'Could not publish.')
    }
  }

  const sinDias = <Skeleton shape={{ kind: 'rows', rows: 4, rowHeight: 64 }} />

  return (
    <section className="grid gap-4">
      <PageHeader title="Training" status={statusLine({ mode: saved.mode, plan: stored.plan })} />

      <Panel title="How you'll arrive" answer>
        <QueryView
          query={preview}
          label="your training plan"
          skeleton={{ kind: 'rows', rows: 3, rowHeight: 64 }}
        >
          {(p) => <ArrivalCards races={p.races} days={days ?? p.days} today={orders.currentDay} />}
        </QueryView>
      </Panel>

      <Panel title="Your month">
        <PlanLadder
          draft={draft}
          calendar={calendar}
          days={days}
          direction={direction}
          canStartFresh={stored.plan !== null && stored.plan.startDay < tomorrow}
          onMode={(mode) => cambia({ mode })}
          onBlock={(i, b) => cambia({ blocks: draft.blocks.map((x, j) => (j === i ? b : x)) })}
          onFocus={(focusAttr) => cambia({ focusAttr })}
          onIntensity={(intensity) => cambia({ intensity })}
          onStartFresh={() => cambia({ startFresh: true })}
        />
      </Panel>

      <Panel title="Edit day by day">
        {days === null ? (
          sinDias
        ) : (
          <DayByDay
            mode={draft.mode}
            calendar={calendar}
            blocks={draft.blocks}
            days={days}
            races={races}
            trips={trips}
            actions={{
              onEdit: (gameDay, choice) =>
                tocaDias((e) => withDayEdit(e, orders.orders, gameDay, choice)),
              onBack: (gameDay) => tocaDias((e) => withoutOrder(e, orders.orders, gameDay)),
              backLabel: (gameDay) => {
                const week = weekOfDay(calendar, gameDay)
                return backToLabel({
                  mode: draft.mode,
                  weekBlock: week === null ? null : (draft.blocks[week.index] ?? null),
                  teamPlanDay: teamByDay.has(gameDay),
                })
              },
            }}
            onSwitchToMixed={() => cambia({ mode: 'mixto' })}
            {...(draft.mode === 'mixto' && teamByDay.size > 0
              ? {
                  onAdopt: () =>
                    tocaDias((e) => adoptTeamSuggestions(e, orders.orders, days, teamByDay)),
                }
              : {})}
            {...(team?.canEdit === true ? { onPublish: () => void publicar() } : {})}
            teamMessage={teamMessage}
          />
        )}
      </Panel>

      <ActionBar
        changes={changes}
        consequence={consequence}
        actionLabel="Save plan"
        status={status}
        onSave={() => void guardar()}
      />
    </section>
  )
}
