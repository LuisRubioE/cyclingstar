import { useState } from 'react'
import type { RaceRadio, RadioGroup, RadioGroupKind, RadioKm } from '@cyclingstar/shared'
import { Flag } from './Flag'

/**
 * LA RACE RADIO: la etapa kilómetro a kilómetro.
 *
 * El journal cuenta la etapa DESPUÉS, con frases. Esto es lo otro, y lo pidió el dueño así: «ver km
 * por km qué grupos hay, quién va en cada grupo (por lo menos número, maillots de colores y quiénes
 * tiran…) y las distancias entre grupos». Es lo que se oye por la radio de carrera mientras la etapa
 * pasa, y es también la herramienta con la que se depura el motor.
 *
 * Los huecos NO son estimaciones: son la resta de los relojes de dos grupos en el mismo kilómetro,
 * recogida mientras la etapa se corría. Por eso la tabla dice «+3:47» y no «unos tres minutos y
 * medio».
 */

/** El color de cada clase de grupo: la fuga delante en verde, el pelotón azul, los descolgados gris. */
const KIND_STYLE: Record<RadioGroupKind, { label: string; dot: string; text: string }> = {
  fuga: { label: 'Break', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  contra: { label: 'Chase', dot: 'bg-amber-500', text: 'text-amber-700' },
  peloton: { label: 'Bunch', dot: 'bg-indigo-500', text: 'text-indigo-700' },
  tierra: { label: 'No man’s land', dot: 'bg-slate-400', text: 'text-slate-600' },
  grupeto: { label: 'Grupetto', dot: 'bg-slate-300', text: 'text-slate-500' },
}

/** `+m:ss`, como se lee en carretera. El líder de carrera va a raya. */
export function radioGap(seconds: number): string {
  if (seconds <= 0) return '—'
  const s = Math.round(seconds)
  return `+${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function GroupCard({ g }: { g: RadioGroup }) {
  const style = KIND_STYLE[g.kind]
  return (
    <div className="min-w-[11rem] shrink-0 rounded-lg border border-slate-200 bg-white p-2">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
        <span className={`text-xs font-semibold ${style.text}`}>{style.label}</span>
        <span className="ml-auto text-sm font-bold text-slate-700">{g.size}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-sm text-slate-600">{radioGap(g.gapS)}</span>
        <span className="ml-auto text-[11px] text-slate-400">{g.energyPct}%</span>
      </div>
      {/* El depósito medio del grupo: una barra, que es como se lee de un vistazo. */}
      <div className="mt-1 h-1 w-full rounded bg-slate-100">
        <div
          className="h-1 rounded bg-slate-400"
          style={{ width: `${Math.max(0, Math.min(100, g.energyPct))}%` }}
        />
      </div>
      {g.pulling.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {g.pulling.map((r) => (
            <li key={`${r.name}-${r.bib ?? ''}`} className="flex items-center gap-1 text-[11px]">
              {r.country && <Flag code={r.country} size={12} />}
              <span className="text-slate-500">{r.bib ?? ''}</span>
              <span className="truncate text-slate-700">{r.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function KmRow({ row, maxGroups }: { row: RadioKm; maxGroups: number }) {
  const shown = row.groups.slice(0, maxGroups)
  const rest = row.groups.slice(maxGroups)
  const restRiders = rest.reduce((a, g) => a + g.size, 0)
  return (
    <div className="flex items-start gap-2 border-b border-slate-100 py-2 last:border-b-0">
      <div className="w-14 shrink-0 pt-2 text-right">
        <span className="font-mono text-sm font-semibold text-slate-500">{Math.round(row.km)}</span>
        <span className="block text-[10px] text-slate-400">km</span>
      </div>
      <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
        {shown.map((g, i) => (
          <GroupCard key={`${g.kind}-${i}`} g={g} />
        ))}
        {rest.length > 0 && (
          <div className="flex min-w-[7rem] shrink-0 items-center rounded-lg border border-dashed border-slate-200 p-2 text-[11px] text-slate-400">
            {restRiders} more in {rest.length} group{rest.length === 1 ? '' : 's'}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Qué filas se pintan. Una etapa son ~180 y todas de golpe son un muro de números, así que por
 * defecto se enseña una de cada cinco. Con una excepción que NO es cosmética: un kilómetro con más
 * de dos grupos sale siempre, aunque no le toque, porque ahí es donde se rompe la carrera y es justo
 * lo que se viene a mirar.
 */
export function radioRows(kms: readonly RadioKm[], everyKm: number): RadioKm[] {
  return kms.filter((k, i) => i % everyKm === 0 || i === kms.length - 1 || k.groups.length > 2)
}

export function RaceRadioPanel({ radio }: { radio: RaceRadio }) {
  const [everyKm, setEveryKm] = useState(5)
  const [maxGroups, setMaxGroups] = useState(4)
  const rows = radioRows(radio.kms, everyKm)
  const last = radio.kms[radio.kms.length - 1]
  const chip = (on: boolean): string =>
    `rounded-full border px-2.5 py-1 ${
      on ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'
    }`
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-lg font-semibold text-slate-800">Race Radio</h2>
        <p className="text-sm text-slate-500">
          {radio.starters} starters
          {last && last.gone > 0 ? ` · ${last.gone} did not finish` : ''}
        </p>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Where the race was, kilometre by kilometre: how many riders in each group, how they were
        doing and who was on the front. Every gap is an exact clock difference, not an estimate.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500">Show every</span>
        {[1, 5, 10].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setEveryKm(n)}
            className={chip(everyKm === n)}
          >
            {n} km
          </button>
        ))}
        <span className="ml-2 text-slate-500">Groups</span>
        {[3, 4, 6].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setMaxGroups(n)}
            className={chip(maxGroups === n)}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="mt-3 max-h-[38rem] overflow-y-auto">
        {rows.map((row) => (
          <KmRow key={row.km} row={row} maxGroups={maxGroups} />
        ))}
      </div>
    </div>
  )
}
