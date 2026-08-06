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

import { apiErrorBodySchema } from '@cyclingstar/shared'
import type { ZodType } from 'zod'

/** Fallo de red o respuesta de error de la API. `status` es 0 cuando ni siquiera hubo respuesta. */
export class ApiError extends Error {
  readonly status: number
  /** Código de error del servidor (`{ ok:false, error:'no_autorizado' }`), si vino. */
  readonly code: string | null

  constructor(message: string, status: number, code: string | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
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
}

/** Extrae el `error` del cuerpo uniforme de la API, si lo hay. */
async function readErrorCode(res: Response): Promise<string | null> {
  try {
    const parsed = apiErrorBodySchema.safeParse(await res.json())
    return parsed.success ? parsed.data.error : null
  } catch {
    return null
  }
}

/** Lanza `ApiError` con el código del servidor cuando la respuesta no es 2xx. */
async function failed(res: Response, fallback: string): Promise<ApiError> {
  const code = await readErrorCode(res)
  return new ApiError(code ?? fallback, res.status, code)
}

async function fetchOrThrow(path: string, options: RequestOptions): Promise<Response> {
  const init: RequestInit = { method: options.method ?? 'GET' }
  const headers: Record<string, string> = { ...(options.headers ?? {}) }
  if (options.json !== undefined) {
    headers['content-type'] = 'application/json'
    init.body = JSON.stringify(options.json)
  }
  if (Object.keys(headers).length > 0) init.headers = headers
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
