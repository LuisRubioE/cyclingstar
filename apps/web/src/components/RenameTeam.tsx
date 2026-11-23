import { useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { renameTeamAsAdmin } from '../api/admin'
import { adminErrorMessage } from '../domain/adminErrors'
import { Button } from './ui/Button'
import { Field } from './ui/Field'

/**
 * `RENAME TEAM`, PARA UN ADMINISTRADOR (docs/cuenta.md §8.5; 8-e, 8-j). El mismo en la fila de la cuenta del
 * panel y en la página del equipo, `/world/teams/:id`, para los equipos sin fila de cuenta (el de quien se
 * borró, un bot). Cerrado es un botón; abierto, el campo `Team name` con `Save` y `Cancel`. Las reglas son las
 * del dueño y las dice la API; aquí solo se traduce su código. Al guardar se invalida lo que lleva el nombre.
 */
export function RenameTeam({
  teamId,
  teamName,
  initialOpen = false,
  initialError = null,
}: {
  readonly teamId: string
  readonly teamName: string
  /** abierto y con un fallo, en estático: para su test */
  readonly initialOpen?: boolean
  readonly initialError?: string | null
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(initialOpen)
  const [name, setName] = useState(teamName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
  const id = `rename-team-${teamId}`

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await renameTeamAsAdmin(null, teamId, name)
      await queryClient.invalidateQueries()
      setOpen(false)
    } catch (err) {
      setError(adminErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (!open)
    return (
      <Button
        size="sm"
        ariaLabel={`Rename team ${teamName}`}
        onClick={() => {
          setName(teamName)
          setError(null)
          setOpen(true)
        }}
      >
        Rename team
      </Button>
    )
  return (
    <form onSubmit={onSubmit} className="grid w-full max-w-form gap-2">
      <Field
        kind="input"
        id={id}
        label="Team name"
        value={name}
        onChange={setName}
        {...(error !== null ? { error } : {})}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="primary"
          type="submit"
          ariaLabel={`Save the name of ${teamName}`}
          busy={busy}
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="quiet"
          ariaLabel={`Cancel renaming ${teamName}`}
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
