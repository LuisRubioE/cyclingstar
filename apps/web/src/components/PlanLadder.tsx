import {
  ATTRIBUTES,
  ATTRIBUTE_LABELS,
  type Attribute,
  INTENSITIES,
  INTENSITY_LABELS,
  type Intensity,
  seasonPosition,
} from '@cyclingstar/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  type TrainingMode,
  type TrainingPlanInput,
  fetchTrainingPlan,
  previewTrainingPlan,
  saveTrainingPlan,
} from '../api/sheet'
import { Panel } from './Panel'

/**
 * THE PLAN, ONE LEVEL UP (docs/entrenamiento.md §5.3).
 *
 * The old screen asked for 28 × (session, intensity) — 56 dropdowns — and showed nothing at all
 * until the days went by one at a time: the consequence of hammering three weeks straight arrived
 * when it could no longer be undone. Here you pick four weeks, an emphasis and an intensity, and
 * you see how you'll arrive BEFORE you save. The 28 days are still there, and still editable.
 */

type Block = 'base' | 'construccion' | 'especifico' | 'afinado' | 'recuperacion'

const BLOCK_LABEL: Record<Block, string> = {
  base: 'Base',
  construccion: 'Build',
  especifico: 'Specific',
  afinado: 'Taper',
  recuperacion: 'Recovery',
}

/** What each block is FOR. Not decoration: it's the reason to pick one over another. */
const BLOCK_WHY: Record<Block, string> = {
  base: 'Builds fitness without digging a hole. Pre-season, back from injury, a down week.',
  construccion: 'Where attributes actually move. Leaves you tired — that is the point.',
  especifico: 'Sharpens what your goal race asks for, plus tactics.',
  afinado: 'Sheds fatigue so you arrive at the race fresh. Lightest week before a goal.',
  recuperacion: 'After a stage race. Rebuilds recovery and keeps you off the physio table.',
}

const MODE_LABEL: Record<TrainingMode, string> = {
  entrenador: 'Coach decides',
  mixto: 'Mixed',
  manual: 'I decide',
}

const MODE_WHY: Record<TrainingMode, string> = {
  entrenador:
    'Your coach picks every day using how you actually feel that morning — better information than a plan you wrote four weeks ago. Nothing you set here is used.',
  mixto: 'Your blocks and your edits win; anything you leave alone goes back to the coach.',
  manual: 'Only what you write. Days you leave empty are active recovery, not a coach session.',
}

const ARRIVAL_LABEL: Record<string, { text: string; cls: string }> = {
  oxidado: { text: 'Rusty', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  perfecto: { text: 'Spot on', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  bien: { text: 'Fine', cls: 'bg-slate-50 text-slate-600 ring-slate-200' },
  cargado: { text: 'Loaded', cls: 'bg-orange-50 text-orange-700 ring-orange-200' },
  fundido: { text: 'Cooked', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
}

const BLOCKS: Block[] = ['base', 'construccion', 'especifico', 'afinado', 'recuperacion']

const PLAN_VACIO: TrainingPlanInput = {
  startDay: 0,
  blocks: [null, null, null, null],
  focusAttr: null,
  intensity: null,
  goalRaceId: null,
}

export function PlanLadder() {
  const qc = useQueryClient()
  const stored = useQuery({ queryKey: ['training-plan'], queryFn: fetchTrainingPlan })
  const [mode, setMode] = useState<TrainingMode>('mixto')
  const [plan, setPlan] = useState<TrainingPlanInput>(PLAN_VACIO)
  const [tocado, setTocado] = useState(false)

  // El plan del servidor se adopta UNA vez y no vuelve a pisar lo que el jugador esté tocando: un
  // refetch en segundo plano no puede deshacerle una decisión a medio tomar.
  useEffect(() => {
    if (tocado || !stored.data) return
    setMode(stored.data.mode)
    if (stored.data.plan) setPlan(stored.data.plan)
  }, [stored.data, tocado])

  const preview = useQuery({
    queryKey: ['plan-preview', mode, JSON.stringify(plan)],
    queryFn: () => previewTrainingPlan({ mode, plan }),
    enabled: stored.data !== undefined,
  })

  const guardar = useMutation({
    mutationFn: () => saveTrainingPlan({ mode, plan }),
    onSuccess: async () => {
      setTocado(false)
      await qc.invalidateQueries({ queryKey: ['training-plan'] })
      await qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  function cambia(patch: Partial<TrainingPlanInput>) {
    setTocado(true)
    setPlan((p) => ({ ...p, ...patch }))
  }

  function ponBloque(i: number, b: Block | null) {
    setTocado(true)
    setPlan((p) => ({ ...p, blocks: p.blocks.map((x, j) => (j === i ? b : x)) }))
  }

  const soloEntrenador = mode === 'entrenador'

  return (
    <Panel title="Your month">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(MODE_LABEL) as TrainingMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setTocado(true)
              setMode(m)
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 transition ${
              mode === m
                ? 'bg-brand-cyan/15 text-brand-navy ring-brand-cyan/40'
                : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">{MODE_WHY[mode]}</p>

      {!soloEntrenador && (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {plan.blocks.map((b, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Week {i + 1}
                </p>
                <select
                  value={b ?? ''}
                  onChange={(e) => ponBloque(i, (e.target.value || null) as Block | null)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                >
                  <option value="">Leave it to the coach</option>
                  {BLOCKS.map((x) => (
                    <option key={x} value={x}>
                      {BLOCK_LABEL[x]}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-slate-500">
                  {b ? BLOCK_WHY[b] : 'Your coach picks this week from how you are on the day.'}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-4">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-slate-500">Emphasis</span>
              <select
                value={plan.focusAttr ?? ''}
                onChange={(e) =>
                  cambia({ focusAttr: (e.target.value || null) as Attribute | null })
                }
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
              >
                <option value="">My strength</option>
                {ATTRIBUTES.map((a) => (
                  <option key={a} value={a}>
                    {ATTRIBUTE_LABELS[a]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-slate-500">Intensity</span>
              <select
                value={plan.intensity ?? 'normal'}
                onChange={(e) => cambia({ intensity: e.target.value as Intensity })}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
              >
                {INTENSITIES.map((i) => (
                  <option key={i} value={i}>
                    {INTENSITY_LABELS[i]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => guardar.mutate()}
              disabled={guardar.isPending}
              className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-cyan-light disabled:opacity-60"
            >
              {guardar.isPending ? 'Saving…' : 'Save plan'}
            </button>
            {guardar.isSuccess && !tocado && (
              <span className="text-sm text-emerald-600">Saved.</span>
            )}
            {guardar.isError && <span className="text-sm text-red-600">Could not save.</span>}
          </div>
        </>
      )}

      {/*
        LO QUE EL PLAN VA A HACERTE, antes de guardarlo. La cuenta la hace el motor —el mismo
        Banister del tick—, así que lo que dice aquí es lo que va a pasar y no una aproximación
        escrita aparte en el navegador.
      */}
      {preview.data && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            What this does to you
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {Math.round(preview.data.totalTss)} TSS over four weeks.
          </p>
          {preview.data.arrivals.length === 0 ? (
            <p className="mt-1 text-sm text-slate-500">
              No races in the next four weeks — this month is for building.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {preview.data.arrivals.map((a) => {
                const look = ARRIVAL_LABEL[a.label] ?? ARRIVAL_LABEL.bien!
                return (
                  <li key={a.gameDay} className="flex items-center gap-2 text-sm">
                    <span className="w-28 shrink-0 text-slate-500">
                      Day {seasonPosition(a.gameDay).dayOfSeason}
                    </span>
                    <span className="text-slate-600">You'll arrive:</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${look.cls}`}
                    >
                      {look.text}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </Panel>
  )
}
