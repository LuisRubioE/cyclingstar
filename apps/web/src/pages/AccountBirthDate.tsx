import { useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { putBirthDate } from '../api/account'
import { ApiError } from '../api/request'
import { ME_ACCOUNT_KEY } from '../components/ProtectedRoute'
import { Button } from '../components/ui/Button'
import { DateField, type DateFieldValue, EMPTY_DATE, toIsoDate } from '../components/ui/DateField'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { BIRTH_DATE_INVALID, birthDateEntryProblem } from '../domain/entryForms'

/**
 * LA PUERTA DE LA FECHA (docs/cuenta.md §4.5; D-09; PR 9 de E4). Una cuenta de antes del PR 9 llega aquí desde
 * `ProtectedRoute` antes de nada, y da su fecha una vez (`PUT /api/me/birth-date`). Con menos de 16 la API no
 * la guarda y la página ofrece borrar la cuenta: nada se bloquea ni se borra solo (§21.3). Ya guardada (409
 * `already_set`), lo dice. Al guardar, vuelve a donde iba.
 */

interface BirthDateState {
  readonly error: string | null
  /** menos de 16: la cuenta no puede seguir abierta (§4.5) */
  readonly underage: boolean
}

export function AccountBirthDate({ initial = {} }: { initial?: Partial<BirthDateState> } = {}) {
  const [birth, setBirth] = useState<DateFieldValue>(EMPTY_DATE)
  const [error, setError] = useState<string | null>(initial.error ?? null)
  const [underage, setUnderage] = useState(initial.underage ?? false)
  const [foco, setFoco] = useState<keyof DateFieldValue | null>(null)
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'

  useEffect(() => {
    if (foco !== null) document.getElementById(`birth-date-${foco}`)?.focus()
  }, [foco, error])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    const problema = birthDateEntryProblem(birth)
    if (problema?.kind === 'underage') return setUnderage(true)
    if (problema !== null) {
      setFoco(problema.kind === 'missing' ? problema.part : 'day')
      setError(problema.msg)
      return
    }
    setSaving(true)
    try {
      await putBirthDate(toIsoDate(birth) ?? '')
    } catch (err) {
      setSaving(false)
      const code = err instanceof ApiError ? err.code : null
      if (code === 'UNDER_MINIMUM_AGE') return setUnderage(true)
      if (code === 'INVALID_BIRTH_DATE') {
        setFoco('day')
        return setError(BIRTH_DATE_INVALID)
      }
      if (code !== 'already_set') return setError('Could not save your date of birth. Try again.')
      // ya guardada: lo dice y sigue
      setError('Your date of birth is already saved.')
    }
    await queryClient.invalidateQueries({ queryKey: ME_ACCOUNT_KEY })
    setSaving(false)
    void navigate(from, { replace: true })
  }

  if (underage)
    return (
      <section className="mx-auto grid max-w-form gap-4">
        <PageHeader title="One more thing" />
        <Panel ariaLabel="Your account" answer>
          <div className="grid gap-3">
            <p className="text-body text-ink-2">
              Cycling Star is for people aged 16 or over, so this account can&apos;t stay open. You
              can delete it here.
            </p>
            <Button variant="primary" to="/account/delete">
              Delete account
            </Button>
          </div>
        </Panel>
      </section>
    )

  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader
        title="One more thing"
        status="We now ask everyone for their date of birth. Cycling Star is for people aged 16 or over."
      />
      <Panel ariaLabel="Your date of birth" answer>
        <form onSubmit={onSubmit} className="grid gap-3">
          <DateField
            id="birth-date"
            label="Date of birth"
            value={birth}
            onChange={(v) => {
              setBirth(v)
              setError(null)
            }}
            {...(error !== null ? { error } : {})}
          />
          <Button variant="primary" type="submit" busy={saving} busyLabel="Saving…">
            Save and continue
          </Button>
        </form>
      </Panel>
    </section>
  )
}
