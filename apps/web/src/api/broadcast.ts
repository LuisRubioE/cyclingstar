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
 * código: el reproductor los traduce con `failureAction` (14-q, §14.11). Un 403 con la puerta llega como
 * `GateError` (9a).
 *
 * Desde el 9a, las cuatro llevan el `?diag=1` del modo diagnóstico del dueño cuando la página lo lleva
 * (§11.15, D-40): la API sirve a un administrador con sesión la etapa con el horizonte del mundo, sin
 * puerta ni tope, y la meta no escribe; para cualquier otro el parámetro no existe (11-h). Y las claves
 * de la cabecera y del acta llevan `diag` y el `rev` del horizonte (`horizonKey`, §10.9); la del tramo,
 * `diag` y no el `rev`, porque su contenido no cambia nunca (14-m).
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
import { horizonKey } from '../queryClient'
import { request } from './request'

/** Cómo se pide una ruta de etapa: con el `?diag=1` del modo diagnóstico de la página (§11.15; 9a). */
export interface StageRequestOptions {
  readonly diag?: boolean
}

const stagePath = (raceId: string, day: number): string =>
  `/api/races/${encodeURIComponent(raceId)}/stages/${day}`

/** El `diag=1` de la consulta, o nada: solo su valor exacto, como en la API (`stageQuerySchema`). */
const diagParam = (opts: StageRequestOptions): 1 | undefined => (opts.diag === true ? 1 : undefined)

/** `?a=1&b=2` con los que tienen valor, en su orden; nada si ninguno lo tiene. */
function query(params: Readonly<Record<string, number | undefined>>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined) q.set(k, String(v))
  const s = q.toString()
  return s === '' ? '' : `?${s}`
}

/**
 * La clave de la cabecera: con `diag` y, al final, el `rev` del horizonte (`horizonKey`, §10.9 y §14.11;
 * 9a). Con otro `rev` (lo visto o lo revelado en otro dispositivo, o el día nuevo) se pide otra vez.
 */
export function broadcastHeadKey(
  raceId: string,
  day: number,
  season: number | undefined,
  diag: boolean,
  rev: string | undefined,
): readonly unknown[] {
  return horizonKey(['broadcast-head', raceId, day, season, diag], rev)
}

/**
 * La clave de un tramo: sin `rev`, porque su contenido no cambia nunca ni depende de quién lo pide
 * (14-m); con `diag` al final (9a), para que lo pedido en el modo diagnóstico, sin tope, no lo sirva la
 * caché a la vista normal (§11.15).
 */
export function broadcastChunkKey(
  raceId: string,
  day: number,
  season: number | undefined,
  fromDs: Ds,
  toDs: Ds,
  diag = false,
): readonly unknown[] {
  return ['broadcast-chunk', raceId, day, season, fromDs, toDs, diag]
}

/** La clave del acta (`GET …/report`): como la de la cabecera, con `diag` y el `rev` al final (9a). */
export function stageReportKey(
  raceId: string,
  day: number,
  season: number | undefined,
  diag: boolean,
  rev: string | undefined,
): readonly unknown[] {
  return horizonKey(['stage-report', raceId, day, season, diag], rev)
}

/** La cabecera: recorrido, reparto y salida; nada de la carrera (404 `broadcast_off` con el interruptor apagado). */
export async function fetchBroadcastHead(
  raceId: string,
  day: number,
  season?: number,
  opts: StageRequestOptions = {},
): Promise<BroadcastHead> {
  return request(
    `${stagePath(raceId, day)}/broadcast${query({ season, diag: diagParam(opts) })}`,
    broadcastHeadSchema,
    { errorMessage: 'Could not load the broadcast.' },
  )
}

/** Un tramo `(fromDs, toDs]` de como mucho `BROADCAST.chunkRaceS` de carrera, con su voz (§14.3). */
export async function fetchBroadcastChunk(
  raceId: string,
  day: number,
  fromDs: Ds,
  toDs: Ds,
  season?: number,
  opts: StageRequestOptions = {},
): Promise<BroadcastChunk> {
  return request(
    `${stagePath(raceId, day)}/broadcast/chunk${query({ season, fromDs, toDs, diag: diagParam(opts) })}`,
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
  opts: StageRequestOptions = {},
): Promise<BroadcastFinish> {
  return request(
    `${stagePath(raceId, day)}/broadcast/finish${query({ season, diag: diagParam(opts) })}`,
    broadcastFinishSchema,
    { method: 'POST', json: { mode }, errorMessage: 'Could not load the finish.' },
  )
}

/**
 * El acta (`Report`, pantalla): el `StageReplay` entero de una etapa corrida; con la etapa sin ver,
 * 403 con la puerta (`GateError`, 7b).
 */
export async function fetchStageReport(
  raceId: string,
  day: number,
  season?: number,
  opts: StageRequestOptions = {},
): Promise<StageReport> {
  return request(
    `${stagePath(raceId, day)}/report${query({ season, diag: diagParam(opts) })}`,
    stageReplaySchema,
    { errorMessage: 'Could not load the report.' },
  )
}
