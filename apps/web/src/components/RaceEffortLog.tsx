import { type LoadLevel, seasonPosition } from '@cyclingstar/shared'
import type { FormPoint } from '../api/form'
import { raceDayTitle } from '../domain/raceDay'
import { LOAD_WORD, formatGameDay } from '../domain/words'
import { StageRoute } from './StageRoute'

/**
 * DÓNDE SE FUE LA ENERGÍA DE UN DÍA DE CARRERA.
 *
 * El dueño, sobre dos etapas que ordenó correr «súper agresivo»: «no hay ni una sola mención en el
 * journal ni en la race radio… pero consumió un montón de energía; algo habrá hecho, digo yo». Y sí
 * había hecho: lo que pasa es que la crónica solo cuenta lo que es NOTICIA —un ataque que abre
 * hueco, una fuga, una pájara— y un día entero dando la cara en el pelotón no lo es, aunque sea
 * exactamente lo que te deja sin piernas mañana.
 *
 * Esto no narra: CONTABILIZA. Los cinco conceptos son los mismos cinco sitios en los que el motor
 * descuenta depósito, así que la barra y el total no pueden discrepar. La carga del día va en palabras,
 * como en el cuadro (`Load: hard`; E3, docs/visual.md §10.7, PR 19b): el TSS ya no cruza la API.
 *
 * Con el sistema desde el 21h de E3 (§4.6): el día de la temporada (`Day 52`) y el título de la etapa de su
 * clave (`France · Stage 3`); la barra, un SVG con un tramo por concepto en sus tokens, sin el `title` que el
 * dedo no abre, y lo que dice, en palabras para el lector (`Where it went, most first: …`); y la leyenda en
 * `caption`.
 */

const CONCEPTOS = [
  { key: 'rodar', label: 'Riding in the bunch', fill: 'fill-line-strong', bg: 'bg-line-strong' },
  { key: 'relevo', label: 'On the front', fill: 'fill-accent', bg: 'bg-accent' },
  { key: 'cerillos', label: 'Attacks & jumps', fill: 'fill-bad', bg: 'bg-bad' },
  { key: 'reserva', label: 'Digging deep', fill: 'fill-gold', bg: 'bg-gold' },
  { key: 'banderas', label: 'Sprints & KOMs', fill: 'fill-good', bg: 'bg-good' },
] as const

type Gasto = NonNullable<FormPoint['parte']>['gasto']

const km = (v: number): string => `${v.toFixed(1)} km`

/** Lo que dice la barra, para el lector: los conceptos con gasto, del que más al que menos. */
function enPalabras(g: Gasto): string {
  const usados = CONCEPTOS.filter((c) => g[c.key] > 0).sort((a, b) => g[b.key] - g[a.key])
  return `Where it went, most first: ${usados.map((c) => c.label.toLowerCase()).join(', ')}`
}

/** La barra del día: un tramo por concepto con gasto, en su proporción, sobre un fondo `surface-2`. */
function Barra({ gasto }: { readonly gasto: Gasto }) {
  const total = CONCEPTOS.reduce((a, c) => a + gasto[c.key], 0)
  if (total <= 0) return <span className="block h-2 rounded-full bg-surface-2" />
  let x = 0
  return (
    <>
      <span className="block h-2 overflow-hidden rounded-full bg-surface-2">
        <svg
          viewBox="0 0 100 8"
          preserveAspectRatio="none"
          className="block h-2 w-full"
          aria-hidden="true"
        >
          {CONCEPTOS.map((c) => {
            if (gasto[c.key] <= 0) return null
            const ancho = (100 * gasto[c.key]) / total
            const tramo = (
              <rect key={c.key} x={x} y={0} width={ancho} height={8} className={c.fill} />
            )
            x += ancho
            return tramo
          })}
        </svg>
      </span>
      <span className="sr-only">{enPalabras(gasto)}</span>
    </>
  )
}

export function RaceEffortLog({ points, max = 8 }: { points: FormPoint[]; max?: number }) {
  const dias = points
    .filter((p) => p.parte != null)
    .slice(-max)
    .reverse()
  if (dias.length === 0) {
    return (
      <p className="text-meta text-ink-2">
        No race days logged yet — the breakdown appears once your rider races a stage.
      </p>
    )
  }
  return (
    <ul className="divide-y divide-line">
      {dias.map((p) => {
        const parte = p.parte!
        const notas: string[] = []
        if (parte.kmAlFrente > 0) notas.push(`${km(parte.kmAlFrente)} on the front`)
        if (parte.kmEnFuga > 0) notas.push(`${km(parte.kmEnFuga)} up the road`)
        if (parte.ataques > 0) notas.push(`${parte.ataques} attack${parte.ataques > 1 ? 's' : ''}`)
        if (parte.saltos > 0) notas.push(`${parte.saltos} jumped onto moves`)
        if (parte.cerillos > 0) notas.push(`${parte.cerillos} matches burned`)
        if (parte.reservaGastadaS > 0)
          notas.push(`${Math.round(parte.reservaGastadaS)}s over threshold`)
        if (parte.kmDescolgado > 0) notas.push(`${km(parte.kmDescolgado)} off the back`)
        if (parte.descuelgueKm != null)
          notas.push(`lost the bunch at km ${Math.round(parte.descuelgueKm)}`)
        if (parte.pajaraKm != null) notas.push(`ran empty at km ${Math.round(parte.pajaraKm)}`)
        return (
          <li key={p.gameDay} className="grid gap-1.5 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-row font-semibold text-ink">
                {raceDayTitle(p.activity) ?? p.activity}
                {/* de dónde a dónde fue la etapa */}
                <StageRoute from={p.from} to={p.to} className="ml-1.5 font-normal text-ink-2" />
              </span>
              <span className="text-caption tabular-nums text-ink-3">
                {formatGameDay(seasonPosition(p.gameDay).dayOfSeason, null)} · Load:{' '}
                {LOAD_WORD[p.load as LoadLevel].toLowerCase()}
              </span>
            </div>
            <Barra gasto={parte.gasto} />
            <p className="text-meta text-ink-2">
              {notas.length > 0 ? notas.join(' · ') : 'Sat in the wheels all day.'}
            </p>
          </li>
        )
      })}
      <li className="flex flex-wrap gap-x-3 gap-y-1 pt-2 text-caption text-ink-2">
        {CONCEPTOS.map((c) => (
          <span key={c.key} className="flex items-center gap-1">
            <span className={`inline-block size-2 rounded-full ${c.bg}`} aria-hidden="true" />
            {c.label}
          </span>
        ))}
      </li>
    </ul>
  )
}
