/**
 * LA RADIO HASTA LO PINTADO (E2, docs/retransmision.md §11.16 y §12.10; decisión 11-i; paso 11a). Pura.
 *
 * La `Race Radio` de una etapa que quien mira no conoce no viene en la ficha: la ruta de etapa no la
 * manda sin el resultado (§14.1). La web la construye con `radioFromTimeline` sobre la línea que ya
 * tiene, la de la cabecera y los tramos (`servedLine.ts`), cortada en lo ALCANZADO, que es lo pintado y
 * nunca lo descargado (D-57), y `radioFromTimeline` da sobre ella solo las fotos cerradas: las de los km
 * por los que ya habían pasado todos los grupos vivos. La foto del km 150 lleva el hueco del grupeto en
 * el km 150, y enseñarla cuando la cabeza llega allí adelantaría si el grupeto entra en el control.
 *
 * A quién nombra (12-o): la política de §7.7 sobre el reparto servido, que ya viene con el velo
 * (`veilCast`, §10.10): los que llevan un maillot que no es el de su equipo, los `namedGcTop` primeros de
 * la general de salida y los protagonistas de los sucesos ya revelados hasta cada foto; y los del
 * espectador, siempre (R23.7). Las caras son las cartas de la cabecera, con el maillot de líder que
 * llevan (el de la carretera, como en la radio de siempre).
 *
 * No hay ruta nueva ni campo nuevo en la ruta de etapa: los tramos son los de `Watch`, de la caché o
 * pedidos con su misma clave, y solo hasta lo alcanzado, que el servidor admite (§10.11).
 */
import {
  BROADCAST,
  type BroadcastChunk,
  type BroadcastHead,
  type ChronicleRider,
  type Ds,
  type RaceRadio,
  type RaceS,
  type RadioNames,
  type TimelineCore,
  cutTimeline,
  radioFromTimeline,
  radioNameableAt,
} from '@cyclingstar/shared'
import { servedLineOf, withChunk } from './servedLine'

/** Los nombres de la radio de una etapa no conocida: las cartas de la cabecera y la política de §7.7 (12-o). */
export function radioNamesOf(head: BroadcastHead, line: Pick<TimelineCore, 'events'>): RadioNames {
  const riderOf = new Map<string, ChronicleRider>()
  for (const c of head.cast)
    riderOf.set(c.id, {
      id: c.id,
      name: c.name,
      bib: c.bib,
      team: c.team?.name ?? null,
      country: c.country,
      ...(c.worn.kind === 'leader' ? { jersey: c.worn.jersey } : {}),
    })
  return {
    riderOf,
    own: new Set(head.cast.filter((c) => c.own).map((c) => c.ix)),
    nameableAt: radioNameableAt(line, {
      wearing: head.cast.filter((c) => c.worn.kind !== 'team').map((c) => c.ix),
      gcTop: head.startState.gcTop,
    }),
  }
}

/**
 * LA RADIO HASTA LO PINTADO (11-i): sobre la línea servida cortada en `reachedS`, las fotos cerradas. Con
 * nada pintado, ninguna.
 */
export function paintedRadioOf(
  head: BroadcastHead,
  core: TimelineCore,
  reachedS: RaceS,
): RaceRadio {
  const cut = cutTimeline(core, Math.max(0, reachedS))
  return radioFromTimeline(cut, radioNamesOf(head, cut))
}

/** La radio hasta lo pintado con los tramos ya juntados en orden (`chunkChainOf`). */
export function paintedRadioFromChunks(
  head: BroadcastHead,
  chunks: readonly BroadcastChunk[],
  reachedS: RaceS,
): RaceRadio {
  let line = servedLineOf(head)
  for (const c of chunks) line = withChunk(head, line, c)
  return paintedRadioOf(head, line.core, reachedS)
}

/**
 * Los tramos que se juntan, en su orden: el que empieza en 0 y después, cada uno donde acabó el anterior
 * (de dos que empiezan igual, el que llega más lejos), hasta que falte uno. Los de la caché de `Watch`
 * pueden venir de dos visitas con bordes distintos: solo así se juntan sin repetir ni saltar nada.
 */
export function chunkChainOf(chunks: readonly BroadcastChunk[]): BroadcastChunk[] {
  const byFrom = new Map<Ds, BroadcastChunk>()
  for (const c of chunks) {
    const other = byFrom.get(c.fromDs)
    if (other === undefined || c.toDs > other.toDs) byFrom.set(c.fromDs, c)
  }
  const chain: BroadcastChunk[] = []
  let at: Ds = 0
  for (;;) {
    const next = byFrom.get(at)
    if (next === undefined || next.toDs <= at) break
    chain.push(next)
    if (next.atFinish) break
    at = next.toDs
  }
  return chain
}

/**
 * Los tramos que faltan de `fromDs` a lo alcanzado, de `chunkRaceS` en `chunkRaceS`: `[desde, hasta]` en
 * décimas, el último hasta lo alcanzado hacia abajo, que el servidor siempre admite (§10.11).
 */
export function missingSpansOf(fromDs: Ds, reachedS: RaceS): (readonly [Ds, Ds])[] {
  const upTo = Math.floor(Math.max(0, reachedS) * 10 + 1e-6)
  const spans: (readonly [Ds, Ds])[] = []
  for (let at = fromDs; at < upTo; at += BROADCAST.chunkRaceS * 10)
    spans.push([at, Math.min(upTo, at + BROADCAST.chunkRaceS * 10)])
  return spans
}

/** El km de la última foto cerrada, para la cabecera de la pestaña (`up to km 142`); null sin ninguna. */
export function paintedUpToKm(radio: RaceRadio): number | null {
  const last = radio.kms.at(-1)
  return last === undefined ? null : Math.round(last.km)
}
