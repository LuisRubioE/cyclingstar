import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import {
  type BroadcastChunk,
  type BroadcastHead,
  type Instant,
  instantAt,
  mainGapText,
  photoBlocksOf,
} from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { type ServedLine, servedLineOf, withChunk } from './servedLine'

/**
 * LAS DIFERENCIAS DE LA BARRA, COHERENTES ENTRE FILAS (la revisión de `Watch` del dueño, W1; su punto 5): «un
 * grupo que iba a menos tiempo que su grupo antecesor». Lo vio en la etapa 1 de Race Alps, y el fixture es lo
 * que la API pública sirve de ella (la cabecera y sus 14 tramos, con el motor v91, bajados el 5 de noviembre
 * de 2026): la barra se arma con lo mismo que en la web (`servedLineOf`, `withChunk` e `instantAt`).
 *
 * Antes del arreglo, recorrida cada 2 s, tenía 16 episodios y 890 s de carrera con una fila por debajo de la
 * de delante, por tres causas: cada fila leía en su propio km de foto (en el km 59,5, +0:13 leído en el 59 y,
 * justo detrás, +0:10 leído en el 58); dos grupos en el mismo km, ordenados al revés de como pasaron por el
 * último punto común (en el 96,6); y un grupo recién nacido sin lectura, que caía a `s.t.` (en el 115,2).
 */

interface Served {
  readonly head: BroadcastHead
  readonly chunks: readonly BroadcastChunk[]
}

const served = JSON.parse(
  gunzipSync(
    readFileSync(new URL('./__fixtures__/race-alps-e1.served.json.gz', import.meta.url)),
  ).toString('utf8'),
) as Served

function lineOf({ head, chunks }: Served): ServedLine {
  let line = servedLineOf(head)
  for (const c of chunks) line = withChunk(head, line, c)
  return line
}

/** Las filas de la barra con alguien dentro, en su orden, y lo que enseña cada una. */
const rowsOf = (i: Instant) => i.groups.filter((g) => g.members.length > 0)

/** Dónde una fila enseña menos que la de delante (la fila 1 es la cabeza y no lleva diferencia). */
function inversions(i: Instant): string[] {
  const rows = rowsOf(i)
  const out: string[] = []
  for (let k = 2; k < rows.length; k++) {
    const a = rows[k - 1]!
    const b = rows[k]!
    const shownA = mainGapText(a.gap.toHeadS)
    const shownB = mainGapText(b.gap.toHeadS)
    if (shownA !== shownB && b.gap.toHeadS < a.gap.toHeadS - 0.5)
      out.push(
        `t=${i.t} km ${i.headKm.toFixed(1)}: fila ${k} ${shownA} (${a.size}) y fila ${k + 1} ${shownB} (${b.size})`,
      )
  }
  return out
}

describe('la barra de Race Alps, etapa 1 (W1)', () => {
  const line = lineOf(served)
  const ctx = {
    own: new Set<number>(),
    start: served.head.startState,
    photoBlocks: photoBlocksOf(served.head.stage.lengthKm, served.head.stage.dx),
  }
  const fin = line.toDs / 10

  it('es la etapa entera, hasta la meta', () => {
    expect(served.chunks).toHaveLength(14)
    expect(fin).toBeCloseTo(12320.4, 1)
  })

  it('recorrida cada 2 s, ninguna fila enseña menos tiempo que la de delante', () => {
    const malas: string[] = []
    for (let t = 0; t <= fin; t += 2) malas.push(...inversions(instantAt(line.core, t, ctx)))
    expect(malas.slice(0, 8), `${malas.length} filas por debajo de la de delante`).toEqual([])
  })

  it('la capa fija dice del pelotón lo mismo que su fila de la barra, en cada instante', () => {
    const distintas: string[] = []
    for (let t = 0; t <= fin; t += 2) {
      const i = instantAt(line.core, t, ctx)
      const gap = i.mainGap
      if (gap === null) continue
      const row = i.groups.find((g) => g.g === gap.behind)
      if (row === undefined) continue
      if (mainGapText(gap.gapS) !== mainGapText(row.gap.toHeadS))
        distintas.push(
          `t=${t}: la capa ${mainGapText(gap.gapS)}, la fila ${mainGapText(row.gap.toHeadS)}`,
        )
    }
    expect(distintas.slice(0, 8), `${distintas.length} instantes distintos`).toEqual([])
  })
})
