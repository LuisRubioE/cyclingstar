/**
 * EL HORIZONTE DE QUIEN MIRA (E2, docs/retransmision.md §4.11, §10.9 y §14.11; paso 7a):
 * `GET /api/me/horizon`, con su esquema. Lo que tiene por ver, en guardia, a medias y lo que caducó
 * desde la última visita, y el `rev` que llevan al final las claves de las consultas `horizon` y `watch`
 * (la regla de §10.9, que la web aplica desde el 9a con `horizonKey`).
 *
 * Con `requestOptionalAuth`: el 401 de quien no tiene sesión ni `cs_viewer` es null, y para la web su
 * `rev` es `'anon'`; con `cs_viewer` y sin sesión llegan el `rev` y el alcance con las listas vacías
 * (14-i), y con `SPOILER_MODE` apagado para quien pide, el `rev` es `'world'` (10-h).
 */
import { type HorizonSummary, horizonSummarySchema } from '@cyclingstar/shared'
import { requestOptionalAuth } from './request'

export async function fetchHorizon(): Promise<HorizonSummary | null> {
  return requestOptionalAuth('/api/me/horizon', horizonSummarySchema, {
    errorMessage: 'Could not load what you have to watch.',
  })
}
