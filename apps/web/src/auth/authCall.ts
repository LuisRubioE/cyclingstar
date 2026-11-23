import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type AuthErrorBody,
  authErrorText,
  countdownText,
  retryAfterOf,
} from '../domain/authErrors'

/**
 * LAS LLAMADAS DE LA CUENTA, CON SU FALLO TRADUCIDO (docs/cuenta.md §12.3; D-25). better-auth devuelve el
 * fallo con el cuerpo esparcido y su `status` (`@better-fetch/fetch`), y sin red lanza: aquí las dos cosas
 * acaban en un `AuthFailure` con el texto de `authErrorText` y, si fue un 429, cuánto esperar.
 */
export interface AuthFailure {
  /** el texto de la tabla; null si la página lo dice a su manera (`EMAIL_NOT_VERIFIED`) */
  readonly text: string | null
  readonly code: string | undefined
  readonly status: number
  /** los segundos de la cuenta atrás, solo con un 429 */
  readonly retryAfterS: number | null
  /** el 429 `PASSWORD_ATTEMPTS_LOCKED` cerró esta sesión: la página lleva a `/login` (§12.3) */
  readonly signedOut?: boolean
}

/** Llama, y devuelve null si fue bien o su fallo traducido. */
export async function authCall(
  call: () => Promise<{ error: unknown }>,
): Promise<AuthFailure | null> {
  let error: unknown
  try {
    ;({ error } = await call())
  } catch {
    return { text: authErrorText(null, 0, null), code: undefined, status: 0, retryAfterS: null }
  }
  if (error === null || error === undefined) return null
  const body = error as AuthErrorBody & { readonly status?: unknown; readonly signedOut?: unknown }
  const status = typeof body.status === 'number' ? body.status : 500
  return {
    text: authErrorText(body, status, null),
    code: body.code,
    status,
    retryAfterS: status === 429 ? retryAfterOf(body, null) : null,
    ...(status === 429 && body.signedOut === true ? { signedOut: true } : {}),
  }
}

/**
 * LA CUENTA ATRÁS DEL BOTÓN TRAS UN 429 (§12.3; docs/visual.md §4.1): el botón queda deshabilitado con su
 * porqué, `You can try again in 3:58.`, que baja cada segundo; al llegar a cero se habilita, el porqué se va
 * y se llama a `onEnd` (la página quita su fallo, que decía cuánto esperar). `initialS`, para los tests.
 */
export function useRetryWait(initialS = 0): {
  readonly button: { readonly disabledReason?: string }
  readonly start: (seconds: number, onEnd?: () => void) => void
} {
  const [left, setLeft] = useState(initialS)
  const [until, setUntil] = useState<number | null>(null)
  const onEnd = useRef<(() => void) | undefined>(undefined)

  const start = useCallback((seconds: number, end?: () => void) => {
    onEnd.current = end
    setLeft(Math.ceil(seconds))
    setUntil(Date.now() + seconds * 1000)
  }, [])

  useEffect(() => {
    if (until === null) return
    const id = setInterval(() => {
      const s = Math.max(0, Math.ceil((until - Date.now()) / 1000))
      setLeft(s)
      if (s === 0) {
        setUntil(null)
        onEnd.current?.()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [until])

  return { button: left > 0 ? { disabledReason: countdownText(left) } : {}, start }
}
