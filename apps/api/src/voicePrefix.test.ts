import type { LiveLine, RaceS } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import {
  ROAD_FIXTURES,
  type RoadFixtureName,
  fixtureNames,
  fixtureStage,
  loadEvents,
  loadStoredRadio,
} from './__fixtures__/broadcast/load.js'
import { revealStoredEvents } from './broadcastSource.js'
import { type ChronicleEvent, buildChronicle } from './chronicle.js'
import { liveClusters } from './liveClusters.js'

/**
 * B19 · LA VOZ ES PREFIJO DE SÍ MISMA (docs/retransmision.md §16.4, §12.2; D-43).
 *
 * La voz de `Watch` se sirve por tramos: la ruta construye la voz hasta el final de cada tramo y se
 * queda con las líneas nuevas (§14.3). Que concatenar los tramos dé la voz entera, y que lo que el
 * espectador ya leyó no cambie nunca, es esta propiedad: en cada etapa congelada en línea, la voz
 * hasta `t` es prefijo EXACTO de la voz hasta `t + 30 s` (misma plantilla, km, protagonistas, datos y
 * hora, línea a línea), cada 30 s de carrera hasta el borde de la meta. Umbral: 0 violaciones.
 *
 * En el paso 2 la voz se construye sobre lo que guarda hoy una etapa sin línea: los sucesos de
 * `stage_snapshots.events` con el `revealS` del adaptador de la radio, sobre su reloj estimado (16-a,
 * §3.8). Desde el 5, B19 usa la línea grabada; en el 6b, la voz pasa antes por `withGroupRoles` (12-n)
 * y el segundo caso, por la política de nombres real (DD-18).
 */

/** El paso con que se construye la voz: el de §16.4. */
const STEP_S = 30

interface Medida {
  /** pasos de 30 s en que la voz anterior no es prefijo exacto de la nueva */
  readonly violaciones: number
  readonly pasos: number
  /** líneas de la voz al llegar a la meta */
  readonly lineas: number
  readonly racimos: number
  /** la primera violación, para leerla en rojo */
  readonly primera: string | null
}

/**
 * La voz de una etapa como la construirá la ruta del tramo (§14.3), cada 30 s de carrera hasta el
 * borde de la meta. Con `racimos`, los racimos en vivo de §12.3 con TODOS los corredores sin rótulo:
 * nadie conserva su línea, que es el peor caso.
 */
function medir(name: RoadFixtureName, racimos: boolean): Medida {
  const stage = fixtureStage(name)
  const guardados = loadEvents(name)
  const reveal = revealStoredEvents(guardados, {
    radio: loadStoredRadio(name),
    riderIds: stage.riderIds,
    lengthKm: stage.lengthKm,
    winnerS: stage.winnerS,
  })
  if (reveal === null) throw new Error(`${name}: la radio no tiene velocidad de cabeza`)
  const finishS = reveal.view.finishS
  // 1. Los sucesos de antes de la meta, cada uno con su hora, atada por la identidad del objeto: lo de
  //    la meta sale en el paquete de meta (D-06), nunca en un tramo.
  const sucesos: ChronicleEvent[] = []
  const horaDe = new Map<ChronicleEvent, RaceS>()
  guardados.forEach((e, i) => {
    const hora = reveal.revealS[i]!
    if (hora >= finishS) return
    sucesos.push(e)
    horaDe.set(e, hora)
  })
  // 3. Los racimos en vivo: cada racimo entra con su hora y sus sueltos salen. Uno que se cierra en
  //    la meta o después queda para el acta, con sus sueltos.
  let entrada: readonly ChronicleEvent[] = sucesos
  let cuantos = 0
  if (racimos) {
    const lista = liveClusters(sucesos, reveal.view, (ev) => horaDe.get(ev) ?? finishS)
    const absorbidos = new Set(lista.flatMap((c) => c.members))
    const enVivo = lista.filter((c) => c.revealS < finishS)
    for (const c of enVivo) horaDe.set(c.event, c.revealS)
    entrada = [...sucesos.filter((ev) => !absorbidos.has(ev)), ...enVivo.map((c) => c.event)]
    cuantos = enVivo.length
  }
  // 4. La voz hasta el final de cada tramo: buildChronicle se queda con revealS ≤ untilS.
  const names = fixtureNames(name)
  const voz = (untilS: RaceS): readonly LiveLine[] =>
    buildChronicle(entrada, names, {
      live: { untilS, stageKm: stage.lengthKm, revealS: (ev) => horaDe.get(ev) ?? untilS },
    })
  let antes = voz(0).map((l) => JSON.stringify(l))
  let violaciones = 0
  let pasos = 0
  let primera: string | null = null
  for (let t = STEP_S; ; t += STEP_S) {
    const untilS = Math.min(t, finishS)
    const ahora = voz(untilS).map((l) => JSON.stringify(l))
    pasos += 1
    const roto = antes.findIndex((l, i) => ahora[i] !== l)
    if (roto >= 0) {
      violaciones += 1
      primera ??= `en ${untilS} s, la línea ${roto}: ${antes[roto]} → ${ahora[roto] ?? '(ya no está)'}`
    }
    antes = ahora
    if (untilS >= finishS) break
  }
  return { violaciones, pasos, lineas: antes.length, racimos: cuantos, primera }
}

describe('B19 · la voz es prefijo de sí misma (§16.4)', () => {
  it.each(ROAD_FIXTURES)('%s: la voz de t es prefijo exacto de la de t + 30 s', (name) => {
    const m = medir(name, false)
    expect(m.primera).toBeNull()
    expect(m.violaciones).toBe(0)
    // No vacío: que la igualdad no sea de una voz muda contra otra.
    expect(m.lineas).toBeGreaterThan(10)
    expect(m.pasos).toBeGreaterThan(100)
  })

  it.each(ROAD_FIXTURES)(
    '%s: …y con los racimos en vivo y todos los corredores sin rótulo, el peor caso (DD-18)',
    (name) => {
      const m = medir(name, true)
      expect(m.primera).toBeNull()
      expect(m.violaciones).toBe(0)
    },
  )

  it('los racimos no son de mentira: las dos reinas con descolgados los tienen', () => {
    // §12.3 midió los descuelgues sueltos de la voz sobre todo en la e20 y en race-colombia e5; si
    // aquí no saliera ningún racimo, el segundo caso no estaría probando nada.
    expect(medir('race-france-e20', true).racimos).toBeGreaterThan(0)
    expect(medir('race-colombia-e5', true).racimos).toBeGreaterThan(0)
  })
})
