import { VOCATIONS, VOCATION_LABELS, type Vocation } from '@cyclingstar/shared'
import { type QueryClient, useQueryClient } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { setArchetype } from '../api/rider'
import { Button } from './ui/Button'
import { Field } from './ui/Field'

/**
 * Lo que se vuelve a pedir tras guardar el papel: el corredor propio y su ficha pública, de donde salen el papel
 * de la cabecera y el del editor (la revisión del 21h: solo se pedía el primero, y los dos seguían en el viejo).
 */
export async function afterRoleChange(qc: QueryClient): Promise<void> {
  await Promise.all([
    qc.invalidateQueries({ queryKey: ['rider', 'me'] }),
    qc.invalidateQueries({ queryKey: ['public-rider'] }),
  ])
}

/**
 * Cambiar la vocación declarada (la etiqueta) del corredor (#50). Solo cambia el tipo: alinear el
 * entrenamiento hacia él queda en manos del jugador. También influye en las convocatorias por tipo.
 *
 * Con el sistema desde el 21h de E3 (docs/visual.md §4.6): `Change role`, un `Button` `quiet` de 44, en lugar
 * del texto de 12 px; abierto, el `Field` `select` con su rótulo, `Save`, ocupado mientras guarda, y `Cancel`;
 * el fallo, en su `alert`. `defaultOpen`, para su test, que no puede pulsar.
 */
export function RoleEditor({
  current,
  defaultOpen = false,
}: {
  current: Vocation
  defaultOpen?: boolean
}) {
  const qc = useQueryClient()
  const id = useId()
  const [open, setOpen] = useState(defaultOpen)
  const [value, setValue] = useState<Vocation>(current)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (value === current) {
      setOpen(false)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await setArchetype(value)
      await afterRoleChange(qc)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <span className="flex flex-wrap items-center gap-x-2">
        <span className="text-ink">{VOCATION_LABELS[current]}</span>
        <Button
          variant="quiet"
          onClick={() => {
            setValue(current)
            setOpen(true)
          }}
        >
          Change role
        </Button>
      </span>
    )
  }

  return (
    <div className="grid gap-3 rounded-ui bg-surface-2 p-3">
      <p className="text-meta text-ink-2">
        Pick a new role. This only changes your declared specialty (and which races you get called
        to) — it's up to you to steer your training toward it.
      </p>
      <Field
        kind="select"
        id={id}
        label="Role"
        value={value}
        onChange={(v) => {
          const vocation = VOCATIONS.find((x) => x === v)
          if (vocation !== undefined) setValue(vocation)
        }}
        options={VOCATIONS.map((v) => ({ value: v, label: VOCATION_LABELS[v] }))}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => void save()} busy={saving} busyLabel="Saving…">
          Save
        </Button>
        <Button variant="quiet" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-meta text-bad">
          {error}
        </p>
      )}
    </div>
  )
}
