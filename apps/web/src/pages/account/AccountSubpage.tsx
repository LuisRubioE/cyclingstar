import type { ReactNode } from 'react'
import { ApiError } from '../../api/request'
import type { AuthFailure, useRetryWait } from '../../auth/authCall'
import { PageHeader } from '../../components/ui/PageHeader'
import { authErrorText } from '../../domain/authErrors'

/**
 * LO QUE COMPARTEN LAS SUBPÁGINAS DE `Account` (docs/cuenta.md §12.2; DD-07 A): la cabecera con `‹ Account`
 * para volver, el estado de un formulario y lo que contestó el servidor, con el texto de la tabla única
 * (§12.3) y nunca el `message` del servidor.
 */
export function AccountSubpage({
  title,
  status,
  loading = false,
  children,
}: {
  readonly title: string
  readonly status?: string
  readonly loading?: boolean
  readonly children: ReactNode
}) {
  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader
        title={title}
        back={{ to: '/account', label: 'Account' }}
        loading={loading}
        {...(status !== undefined ? { status } : {})}
      />
      {children}
    </section>
  )
}

/** Estado de un formulario de la cuenta: mensaje de éxito o de error, más "enviando". */
export type Status =
  { kind: 'idle' } | { kind: 'saving' } | { kind: 'ok'; msg: string } | { kind: 'err'; msg: string }

const OTRO = 'Something went wrong. Try again in a minute.'

/**
 * El fallo de un formulario, con el texto de la tabla única (§12.3); tras un 429, el botón espera con su
 * cuenta atrás y, al acabar, el fallo se va.
 */
export function fallar(
  f: AuthFailure,
  setStatus: (s: Status) => void,
  espera: ReturnType<typeof useRetryWait>,
): void {
  setStatus({ kind: 'err', msg: f.text ?? OTRO })
  if (f.retryAfterS !== null) espera.start(f.retryAfterS, () => setStatus({ kind: 'idle' }))
}

/** El texto de un fallo de la API de la cuenta (`ApiError`, o sin red), por la tabla única (§12.3). */
export function apiFailureText(err: unknown): string {
  if (!(err instanceof ApiError)) return OTRO
  return (
    authErrorText(
      err.code === null ? null : { code: err.code, error: err.code },
      err.status,
      err.retryAfterS,
    ) ?? OTRO
  )
}

/**
 * Lo que contestó el servidor, debajo del formulario. La región de estado está desde el principio, vacía y
 * fuera de la vista (`sr-only`, y no `hidden`, que la sacaría también del lector): insertada ya llena, el lector
 * no siempre la lee (las revisiones del 21f y del 21j). Un fallo sí se oye al insertarse (`alert`).
 */
export function Resultado({ status }: { status: Status }) {
  return (
    <>
      <p role="status" className="text-meta text-good empty:sr-only">
        {status.kind === 'ok' ? status.msg : ''}
      </p>
      {status.kind === 'err' && (
        <p role="alert" className="text-meta text-bad">
          {status.msg}
        </p>
      )}
    </>
  )
}
