/**
 * LO VISTO, POR LA RED (E2, docs/retransmision.md §10.3, §14.2 y §14.11; paso 7a). Solo HTTP y
 * validación: cuándo informar lo decide el reproductor (`domain/broadcast/player.ts`) y lo ejecuta la
 * cola de `effects.ts`.
 *
 * - El progreso, `POST /api/me/watch/:raceKey/:day`, con `keepalive`: sigue aunque la página se oculte o
 *   se cierre. Al salir (`pagehide`, desmontar), `beaconWatchProgress`: `sendBeacon` con un `Blob`
 *   `application/json`; si el navegador no admite el `Blob` JSON y lanza, el mismo JSON en `text/plain`,
 *   que la ruta también acepta (14-g); si la cola del navegador no lo acepta, `fetch` con `keepalive`.
 * - Revelar, seguir y el alcance devuelven el `rev` de después, para cambiar las claves de una vez
 *   (§10.9); los usa la web desde el 9a y el 10a.
 * - Sin sesión no se manda progreso: el del visitante vive en `localStorage` (11-p, D-36), así que el
 *   manejador global de 401 nunca lo manda a `/login` por ver una etapa.
 */
import {
  type SpoilerScope,
  type WatchMode,
  revResponseSchema,
  watchResponseSchema,
} from '@cyclingstar/shared'
import type { z } from 'zod'
import { request } from './request'

export type WatchResponse = z.infer<typeof watchResponseSchema>
export type RevResponse = z.infer<typeof revResponseSchema>
/** El cuerpo del progreso: lo alcanzado en segundos de carrera (en décimas, hacia abajo) y cómo se llegó (§8.1). */
export interface WatchProgressBody {
  readonly reachedS: number
  readonly mode: WatchMode
}
/** `Follow without spoilers`, `Stop protecting this race` o la regla (D-30). */
export type FollowChoice = 'follow' | 'drop' | 'default'

const enc = encodeURIComponent
const watchPath = (raceKey: string, day: number): string => `/api/me/watch/${enc(raceKey)}/${day}`

/** El progreso con sesión: si la etapa sigue a medias o ya es conocida, y el `rev` de después. */
export async function postWatchProgress(
  raceKey: string,
  day: number,
  body: WatchProgressBody,
): Promise<WatchResponse> {
  return request(watchPath(raceKey, day), watchResponseSchema, {
    method: 'POST',
    json: body,
    keepalive: true,
    errorMessage: 'Could not save how far you watched.',
  })
}

/** `navigator.sendBeacon` del navegador, o undefined donde no existe. */
function browserBeacon(): ((url: string, data: BodyInit) => boolean) | undefined {
  try {
    const nav = typeof navigator === 'undefined' ? undefined : navigator
    return typeof nav?.sendBeacon === 'function' ? nav.sendBeacon.bind(nav) : undefined
  } catch {
    return undefined
  }
}

/**
 * EL INFORME DE SALIR (14-g): sin esperar respuesta, porque la página se va. `beacon` y `post` se
 * inyectan en los tests; en la web son `navigator.sendBeacon` y `postWatchProgress`. Nunca lanza.
 */
export function beaconWatchProgress(
  raceKey: string,
  day: number,
  body: WatchProgressBody,
  beacon: ((url: string, data: BodyInit) => boolean) | undefined = browserBeacon(),
  post: typeof postWatchProgress = postWatchProgress,
): void {
  const url = watchPath(raceKey, day)
  const json = JSON.stringify(body)
  if (beacon !== undefined) {
    try {
      if (beacon(url, new Blob([json], { type: 'application/json' }))) return
    } catch {
      // El navegador no admite el Blob JSON en sendBeacon: el mismo JSON en text/plain (14-g).
      try {
        if (beacon(url, json)) return
      } catch {
        // tampoco: fetch con keepalive
      }
    }
  }
  void post(raceKey, day, body).catch(() => undefined)
}

/** `Show result` (10a): la etapa pasa a conocida con la R, o con la X si la carrera ha caducado (§10.5). */
export async function postReveal(raceKey: string, day: number): Promise<RevResponse> {
  return request(`/api/me/reveal/${enc(raceKey)}/${day}`, revResponseSchema, {
    method: 'POST',
    json: {},
    errorMessage: 'Could not show the result.',
  })
}

/** Seguir una carrera sin destripes, soltarla o volver a la regla (D-30). */
export async function putFollow(raceKey: string, follow: FollowChoice): Promise<RevResponse> {
  return request(`/api/me/follow/${enc(raceKey)}`, revResponseSchema, {
    method: 'PUT',
    json: { follow },
    errorMessage: 'Could not change this race.',
  })
}

/** El alcance de la protección (DD-01) y, si viene, `Don't ask again` (DD-17). */
export async function putSpoilerScope(
  scope: SpoilerScope,
  revealConfirm?: boolean,
): Promise<RevResponse> {
  return request('/api/me/spoiler-scope', revResponseSchema, {
    method: 'PUT',
    json: revealConfirm === undefined ? { scope } : { scope, revealConfirm },
    errorMessage: 'Could not save your spoiler settings.',
  })
}

// ----------------------------------------------------------- el progreso del visitante (11-p)

/** Lo que se usa de `Storage`: `localStorage` en la web, un doble en los tests. */
export type ProgressStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** El `localStorage` del navegador, o null: en una ventana privada o con el almacenamiento bloqueado, leerlo puede lanzar. */
function browserStorage(): ProgressStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** `cs.watch.<raceKey>.<day>` (11-p). */
export const localProgressKey = (raceKey: string, day: number): string =>
  `cs.watch.${raceKey}.${day}`

/** Lo alcanzado por el visitante en esa etapa, o null si no hay nada que valga. Nunca lanza. */
export function readLocalProgress(
  raceKey: string,
  day: number,
  storage: ProgressStorage | null = browserStorage(),
): number | null {
  try {
    const raw = storage?.getItem(localProgressKey(raceKey, day))
    if (raw == null) return null
    const v: unknown = JSON.parse(raw)
    const reachedS =
      typeof v === 'object' && v !== null && !Array.isArray(v)
        ? (v as { reachedS?: unknown }).reachedS
        : undefined
    // los mismos límites que el cuerpo del progreso con sesión (`watchProgressBodySchema`)
    return typeof reachedS === 'number' &&
      Number.isFinite(reachedS) &&
      reachedS >= 0 &&
      reachedS <= 86_400
      ? reachedS
      : null
  } catch {
    return null
  }
}

/** Apunta lo alcanzado, sin bajar nunca de lo que ya había: `{ "reachedS": n }` (11-p). Nunca lanza. */
export function writeLocalProgress(
  raceKey: string,
  day: number,
  reachedS: number,
  storage: ProgressStorage | null = browserStorage(),
): void {
  try {
    const before = readLocalProgress(raceKey, day, storage)
    if (before !== null && before >= reachedS) return
    storage?.setItem(localProgressKey(raceKey, day), JSON.stringify({ reachedS }))
  } catch {
    // lleno o bloqueado: la etapa empezará desde la salida la próxima vez, y nada falla
  }
}

/** Tras la meta, la etapa es conocida en este dispositivo: la vuelta siguiente abre en la previa (8-l). Nunca lanza. */
export function forgetLocalProgress(
  raceKey: string,
  day: number,
  storage: ProgressStorage | null = browserStorage(),
): void {
  try {
    storage?.removeItem(localProgressKey(raceKey, day))
  } catch {
    // bloqueado: nada que hacer
  }
}

// ------------------------------------------------- la oferta adaptativa (DD-16, 10-b; 9b)

/** `cs.adaptiveIgnored`: las carreras de cabecera que caducaron sin conocerse enteras, en este navegador. */
export const ADAPTIVE_IGNORED_KEY = 'cs.adaptiveIgnored'
/** `cs.adaptiveAsked`: la oferta ya se hizo en este navegador (10-b). */
export const ADAPTIVE_ASKED_KEY = 'cs.adaptiveAsked'

/** Lo que la oferta recuerda en este navegador. Nunca lanza: sin almacenamiento, nada (se puede repetir, sin destripar). */
export function readAdaptive(storage: ProgressStorage | null = browserStorage()): {
  readonly ignored: readonly string[]
  readonly asked: boolean
} {
  try {
    const raw = storage?.getItem(ADAPTIVE_IGNORED_KEY)
    const v: unknown = raw == null ? [] : JSON.parse(raw)
    const ignored = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
    return { ignored, asked: storage?.getItem(ADAPTIVE_ASKED_KEY) === '1' }
  } catch {
    return { ignored: [], asked: false }
  }
}

/** Guarda la lista y, si se pide, la marca de ofrecida. Nunca lanza. */
export function writeAdaptive(
  ignored: readonly string[],
  asked: boolean,
  storage: ProgressStorage | null = browserStorage(),
): void {
  try {
    storage?.setItem(ADAPTIVE_IGNORED_KEY, JSON.stringify(ignored))
    if (asked) storage?.setItem(ADAPTIVE_ASKED_KEY, '1')
  } catch {
    // lleno o bloqueado: la oferta podrá repetirse, que no destripa nada
  }
}
