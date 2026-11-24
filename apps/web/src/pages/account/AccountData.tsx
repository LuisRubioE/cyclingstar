import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type ExportFile, postExport } from '../../api/account'
import { authCall, useRetryWait } from '../../auth/authCall'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Panel } from '../../components/ui/Panel'
import { AccountSubpage, Resultado, type Status, fallar } from './AccountSubpage'

interface DataState {
  readonly status: Status
  readonly fieldError: string | null
}

/** Guarda el fichero con su nombre: un enlace de un solo uso a la copia en memoria. */
function guardar(file: ExportFile): void {
  const url = URL.createObjectURL(file.blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.filename
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * `Account › Your data` (docs/cuenta.md §12.2; PR 12): la contraseña y `Download my data`, con
 * `POST /api/me/export` (§10.5). La contraseña mala, L3, la cuarta del día (`EXPORT_LIMIT`) y la red, con la
 * tabla única (§12.3); tras un 429, el botón espera con su cuenta atrás. Bien, el navegador guarda el JSON.
 * `initial`, para sus tests.
 */
export function AccountData({ initial = {} }: { initial?: Partial<DataState> } = {}) {
  const navigate = useNavigate()
  const espera = useRetryWait()
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>(initial.status ?? { kind: 'idle' })
  const [fieldError, setFieldError] = useState<string | null>(initial.fieldError ?? null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (status.kind === 'saving') return
    if (!password) {
      setStatus({ kind: 'idle' })
      setFieldError('Enter your password to download your data.')
      return
    }
    setFieldError(null)
    setStatus({ kind: 'saving' })
    const out: { file: ExportFile | null } = { file: null }
    const res = await authCall(async () => {
      const r = await postExport(password)
      if (r.error === null) out.file = r.file
      return r
    })
    if (res?.signedOut === true) {
      void navigate('/login', { state: { arrival: 'signed-out-passwords' } })
      return
    }
    if (res !== null) {
      fallar(res, setStatus, espera)
      return
    }
    if (out.file !== null) guardar(out.file)
    setPassword('')
    setStatus({ kind: 'idle' })
  }

  return (
    <AccountSubpage title="Your data">
      <Panel ariaLabel="Your data" answer>
        <form onSubmit={onSubmit} className="grid gap-3">
          <p className="text-meta text-ink-2">
            Download a copy of everything we keep about you, as a JSON file.
          </p>
          <Field
            kind="input"
            type="password"
            id="data-pw"
            label="Password"
            autoComplete="current-password"
            reveal
            value={password}
            onChange={(v) => {
              setPassword(v)
              setFieldError(null)
            }}
            {...(fieldError !== null ? { error: fieldError } : {})}
          />
          <Resultado status={status} />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" busy={status.kind === 'saving'} {...espera.button}>
              Download my data
            </Button>
          </div>
        </form>
      </Panel>
    </AccountSubpage>
  )
}
