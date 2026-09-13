/**
 * RELLENO HACIA ATRÁS DE LOS ARQUETIPOS (paso 5 del rediseño de entrenamiento).
 *
 * El enum pasa de cinco valores a ocho, y los corredores que ya existen llevan uno de los cinco
 * viejos. Ninguno dice `puncheur`, `rodador` ni `gregario`, así que en un mundo vivo el reparto
 * nuevo no se notaría hasta que se retirase el último bot de los de antes: años.
 *
 * SE HACE EN TYPESCRIPT Y NO EN SQL, y es la regla de la casa por una razón concreta: el arquetipo
 * se deriva con `archetypeFromAttributes`, que es una función del motor con su propia lógica —el
 * argmax de las seis cartas, el listón de separación sobre la media, el corte del gregario—.
 * Reimplementarla en SQL sería tener dos versiones de la misma regla, y el día que una cambie la
 * otra se queda vieja sin que nadie lo note.
 *
 * SOLO BOTS (`user_id IS NULL`). El arquetipo de un humano es su DECISIÓN, no una lectura de sus
 * atributos: si un jugador eligió escalador y va flojo de montaña, sigue siendo escalador y lo que
 * tiene es un problema, no una etiqueta equivocada.
 */
import type { Attribute } from '@cyclingstar/shared'
import { archetypeFromAttributes } from '@cyclingstar/shared'
import { eq, isNull } from 'drizzle-orm'
import type { Database } from '../client.js'
import { riderAttrs, riders } from '../schema.js'

export interface BackfillResult {
  mirados: number
  cambiados: number
  porArquetipo: Record<string, number>
}

export async function backfillArchetypes(db: Database): Promise<BackfillResult> {
  const filas = await db
    .select({ id: riders.id, archetype: riders.archetype })
    .from(riders)
    .where(isNull(riders.userId))

  const attrs = await db
    .select({ riderId: riderAttrs.riderId, attr: riderAttrs.attr, value: riderAttrs.value })
    .from(riderAttrs)
  const porCorredor = new Map<string, Record<Attribute, number>>()
  for (const a of attrs) {
    const r = porCorredor.get(a.riderId) ?? ({} as Record<Attribute, number>)
    r[a.attr] = a.value
    porCorredor.set(a.riderId, r)
  }

  const porArquetipo: Record<string, number> = {}
  let cambiados = 0
  for (const fila of filas) {
    const suyos = porCorredor.get(fila.id)
    // Un corredor sin atributos no se toca: no hay de qué derivar, y adivinar sería peor.
    if (suyos === undefined) continue
    const nuevo = archetypeFromAttributes(suyos)
    porArquetipo[nuevo] = (porArquetipo[nuevo] ?? 0) + 1
    if (nuevo === fila.archetype) continue
    await db.update(riders).set({ archetype: nuevo }).where(eq(riders.id, fila.id))
    cambiados += 1
  }
  return { mirados: filas.length, cambiados, porArquetipo }
}
