/**
 * Cliente HTTP común de la web: una sola forma de hablar con la API.
 *
 * Unifica lo que antes hacía cada módulo a su manera:
 * - Valida SIEMPRE la respuesta con el esquema Zod compartido (`@cyclingstar/shared`), así un
 *   cambio de contrato en el backend falla aquí, con mensaje claro, en vez de aparecer como
 *   `undefined` en mitad de la interfaz.
 * - Errores tipados (`ApiError` con `status` y `code`) en vez de `Error` genérico o de tragarse
 *   el fallo devolviendo lista vacía (eso ocultaba los 500).
 * - Trato coherente del 401: por defecto se propaga (el manejador global de sesión caducada lo
 *   convierte en una redirección a /login); las llamadas que son legítimamente opcionales sin
 *   sesión usan `requestOptionalAuth`, que devuelve `null`.
 */

import { type StageGate, apiErrorBodySchema, stageGateErrorSchema } from '@cyclingstar/shared'
import type { ZodType } from 'zod'

/** Fallo de red o respuesta de error de la API. `status` es 0 cuando ni siquiera hubo respuesta. */
export class ApiError extends Error {
  readonly status: number
  /** Código de error del servidor (`{ ok:false, error:'no_autorizado' }`), si vino. */
  readonly code: string | null
  /**
   * Los segundos de la cabecera `retry-after` de un 429 (`demasiadas_peticiones`); null en cualquier
   * otra respuesta o si no se puede leer. El reproductor de `Watch` espera eso con `Loading` y repite,
   * sin `Connection lost` (docs/retransmision.md §10.12 y §14.11, 14-q).
   */
  readonly retryAfterS: number | null

  constructor(
    message: string,
    status: number,
    code: string | null = null,
    retryAfterS: number | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.retryAfterS = retryAfterS
  }
}

/**
 * LA PUERTA (E2, docs/retransmision.md §14.2 y §14.11; D-37, 14-h; paso 9a): el 403 de una ruta de etapa
 * que no se va a servir hasta que se vea o se revele, con el error de siempre (`not_seen` o
 * `previous_unseen`) y la puerta al lado. Las pantallas preguntan `error instanceof GateError` para
 * pintar `StageGateCard`; para todo lo demás es un `ApiError` más.
 */
export class GateError extends ApiError {
  readonly gate: StageGate

  constructor(message: string, status: number, code: string | null, gate: StageGate) {
    super(message, status, code)
    this.name = 'GateError'
    this.gate = gate
  }
}

/** La respuesta llegó pero no cumple el contrato compartido: bug de contrato, no del usuario. */
export class ContractError extends Error {
  readonly path: string
  readonly issues: string

  constructor(path: string, issues: string) {
    super(`Unexpected response from the server (${path}).`)
    this.name = 'ContractError'
    this.path = path
    this.issues = issues
  }
}

/** ¿El error viene de una sesión ausente o caducada? Lo usa el manejador global de 401. */
export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

export interface RequestOptions {
  method?: string
  /** Cuerpo JSON: se serializa y se pone la cabecera `content-type`. */
  json?: unknown
  headers?: Record<string, string>
  /** Mensaje para el usuario si la petición falla (en inglés, es UI). */
  errorMessage?: string
  /**
   * `keepalive` de fetch: la petición sigue aunque la página se cierre o se oculte. Lo usa el informe
   * de lo alcanzado de `Watch` (E2, docs/retransmision.md §14.11; paso 7a), que se manda al pausar,
   * ocultar la pestaña o salir.
   */
  keepalive?: boolean
}

/** El `error` del cuerpo uniforme de la API, si lo hay, y la puerta, si es un 403 con `gate` (9a). */
async function readErrorBody(
  res: Response,
): Promise<{ readonly code: string | null; readonly gate: StageGate | null }> {
  try {
    const body: unknown = await res.json()
    const gated = stageGateErrorSchema.safeParse(body)
    if (gated.success) return { code: gated.data.error, gate: gated.data.gate }
    const parsed = apiErrorBodySchema.safeParse(body)
    return { code: parsed.success ? parsed.data.error : null, gate: null }
  } catch {
    return { code: null, gate: null }
  }
}

/**
 * Los segundos de un `retry-after`. @fastify/rate-limit los manda como un entero de segundos; una
 * fecha HTTP o cualquier otra cosa da null, y quien espera usa su propio respaldo.
 */
export function retryAfterOf(value: string | null): number | null {
  if (value === null) return null
  const v = value.trim()
  if (!/^\d+(\.\d+)?$/.test(v)) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * El error de una respuesta que no es 2xx: `ApiError` con el código del servidor; un 429, con su
 * `retry-after`; y un 403 con la puerta, `GateError` (9a). El cuerpo se lee una sola vez.
 */
async function failed(res: Response, fallback: string): Promise<ApiError> {
  const { code, gate } = await readErrorBody(res)
  if (res.status === 403 && gate !== null)
    return new GateError(code ?? fallback, res.status, code, gate)
  const retryAfterS = res.status === 429 ? retryAfterOf(res.headers.get('retry-after')) : null
  return new ApiError(code ?? fallback, res.status, code, retryAfterS)
}

async function fetchOrThrow(path: string, options: RequestOptions): Promise<Response> {
  const init: RequestInit = { method: options.method ?? 'GET' }
  const headers: Record<string, string> = { ...(options.headers ?? {}) }
  if (options.json !== undefined) {
    headers['content-type'] = 'application/json'
    init.body = JSON.stringify(options.json)
  }
  if (Object.keys(headers).length > 0) init.headers = headers
  if (options.keepalive === true) init.keepalive = true
  try {
    return await fetch(path, init)
  } catch {
    // Sin respuesta: offline, DNS, CORS… status 0 para distinguirlo de un error de la API.
    throw new ApiError('Network error — please check your connection.', 0, 'network')
  }
}

/** Valida el cuerpo contra el contrato compartido. */
function parse<T>(path: string, schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (result.success) return result.data
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ')
  // Con el contrato roto no se puede seguir: mejor un error visible que datos a medias.
  throw new ContractError(path, issues)
}

/** Petición tipada y validada. Lanza `ApiError` (incluido el 401) o `ContractError`. */
export async function request<T>(
  path: string,
  schema: ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const res = await fetchOrThrow(path, options)
  if (!res.ok) throw await failed(res, options.errorMessage ?? 'Request failed.')
  return parse(path, schema, await res.json())
}

/**
 * Igual que `request`, pero un 401 significa "aún no hay sesión" y devuelve `null` en vez de
 * lanzar. Solo para datos opcionales de páginas que también se ven sin iniciar sesión.
 */
export async function requestOptionalAuth<T>(
  path: string,
  schema: ZodType<T>,
  options: RequestOptions = {},
): Promise<T | null> {
  const res = await fetchOrThrow(path, options)
  if (res.status === 401) return null
  if (!res.ok) throw await failed(res, options.errorMessage ?? 'Request failed.')
  return parse(path, schema, await res.json())
}
