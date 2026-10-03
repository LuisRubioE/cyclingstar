/**
 * LA RETRANSMISIÓN, por la red (E2, docs/retransmision.md §14.2 y §14.11; paso 3b). Solo HTTP y
 * validación: qué pedir y cuándo lo decide el reproductor (`domain/broadcast/player.ts`), y quién lo
 * pide, `StageWatch.tsx` (3c), que ejecuta sus peticiones en orden.
 *
 * Las cuatro rutas de la etapa: la cabecera (`GET …/broadcast`), un tramo (`GET …/broadcast/chunk`),
 * la meta (`POST …/broadcast/finish`, la única que trae la llegada, el resultado y el acta, y la que
 * escribe la letra de lo visto con su `mode`, 14-f) y el acta (`GET …/report`). Todas con `?season=`
 * si la etapa es de otra temporada que la de hoy; sin él, la de hoy. El progreso y el revelado
 * (`POST /api/me/…`) son de `watch.ts`, en el 7a.
 *
 * Un 429 llega como `ApiError` con `retryAfterS` y un 409 `beyond_reached` como `ApiError` con ese
 * código: el reproductor los traduce con `failureAction` (14-q, §14.11).
 */
import {
  type BroadcastChunk,
  type BroadcastFinish,
  type BroadcastHead,
  type Ds,
  type StageReport,
  type WatchMode,
  broadcastChunkSchema,
  broadcastFinishSchema,
  broadcastHeadSchema,
  stageReplaySchema,
} from '@cyclingstar/shared'
import { request } from './request'

const stagePath = (raceId: string, day: number): string =>
  `/api/races/${encodeURIComponent(raceId)}/stages/${day}`

/** `?a=1&b=2` con los que tienen valor, en su orden; nada si ninguno lo tiene. */
function query(params: Readonly<Record<string, number | undefined>>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined) q.set(k, String(v))
  const s = q.toString()
  return s === '' ? '' : `?${s}`
}

/** La clave de la cabecera. Desde el 9a, con el `rev` del horizonte al final (`horizonKey`, §14.11). */
export function broadcastHeadKey(raceId: string, day: number, season?: number): readonly unknown[] {
  return ['broadcast-head', raceId, day, season]
}

/** La clave de un tramo: sin `rev`, porque su contenido no cambia nunca ni depende de quién lo pide (14-m). */
export function broadcastChunkKey(
  raceId: string,
  day: number,
  season: number | undefined,
  fromDs: Ds,
  toDs: Ds,
): readonly unknown[] {
  return ['broadcast-chunk', raceId, day, season, fromDs, toDs]
}

/** La cabecera: recorrido, reparto y salida; nada de la carrera (404 `broadcast_off` con el interruptor apagado). */
export async function fetchBroadcastHead(
  raceId: string,
  day: number,
  season?: number,
): Promise<BroadcastHead> {
  return request(`${stagePath(raceId, day)}/broadcast${query({ season })}`, broadcastHeadSchema, {
    errorMessage: 'Could not load the broadcast.',
  })
}

/** Un tramo `(fromDs, toDs]` de como mucho `BROADCAST.chunkRaceS` de carrera, con su voz (§14.3). */
export async function fetchBroadcastChunk(
  raceId: string,
  day: number,
  fromDs: Ds,
  toDs: Ds,
  season?: number,
): Promise<BroadcastChunk> {
  return request(
    `${stagePath(raceId, day)}/broadcast/chunk${query({ season, fromDs, toDs })}`,
    broadcastChunkSchema,
    { errorMessage: 'Could not load the race.' },
  )
}

/** La meta: llegadas, resultado, cierre, acta y noticias, con el modo con que se llegó (la letra, §8.1). */
export async function postBroadcastFinish(
  raceId: string,
  day: number,
  mode: WatchMode,
  season?: number,
): Promise<BroadcastFinish> {
  return request(
    `${stagePath(raceId, day)}/broadcast/finish${query({ season })}`,
    broadcastFinishSchema,
    { method: 'POST', json: { mode }, errorMessage: 'Could not load the finish.' },
  )
}

/** El acta (`Report`, pantalla): el `StageReplay` entero de una etapa corrida. */
export async function fetchStageReport(
  raceId: string,
  day: number,
  season?: number,
): Promise<StageReport> {
  return request(`${stagePath(raceId, day)}/report${query({ season })}`, stageReplaySchema, {
    errorMessage: 'Could not load the report.',
  })
}
