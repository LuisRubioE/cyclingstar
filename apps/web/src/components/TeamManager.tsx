import { COUNTRIES } from '@cyclingstar/shared'
import { useId } from 'react'
import { Field } from './ui/Field'

/** Mensajes de error del servidor al editar el equipo, cada uno en su campo. */
const EDIT_ERROR: Readonly<
  Record<string, { readonly field: 'name' | 'country'; readonly text: string }>
> = {
  nombre_invalido: { field: 'name', text: 'The name must be 2–40 characters.' },
  nombre_bloqueado: { field: 'name', text: 'That name is a real team or a blocked name.' },
  nombre_repetido: { field: 'name', text: 'Another team already uses that name.' },
  pais_desconocido: { field: 'country', text: 'Pick a country from the list.' },
}

/** Lo que dice un error del servidor y en qué campo; los que no son de un campo, sin él. */
export function teamEditError(code: string): {
  readonly field: 'name' | 'country' | null
  readonly text: string
} {
  if (code === 'sin_equipo') return { field: null, text: 'You do not manage a team.' }
  return EDIT_ERROR[code] ?? { field: null, text: 'Could not save changes.' }
}

/** El largo del nombre que acepta la API (`nombre_invalido`). */
const NAME_MAX = 40

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.code, label: c.name }))

/**
 * El nombre y el país del equipo que lleva el usuario (SPEC 7), los dos `Field` de 48. Sin botón propio
 * desde el 18b de E3 (docs/visual.md §8.7, 8-h): los guarda la `ActionBar` de `/team/identity` junto con el
 * maillot, y lo que se escribe lo lleva la página. El panel de las doce semillas salió en el 17b (17-i).
 */
export function TeamManager({
  name,
  country,
  onName,
  onCountry,
  error,
}: {
  readonly name: string
  readonly country: string
  readonly onName: (name: string) => void
  readonly onCountry: (country: string) => void
  /** el código de error del servidor del último guardado, si fue de uno de estos campos */
  readonly error: string | null
}) {
  const nameId = useId()
  const countryId = useId()
  const fallo = error === null ? null : teamEditError(error)
  const enNombre = fallo?.field === 'name' ? { error: fallo.text } : {}
  const enPais = fallo?.field === 'country' ? { error: fallo.text } : {}
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field
        kind="input"
        id={nameId}
        label="Name"
        value={name}
        onChange={(v) => onName(v.slice(0, NAME_MAX))}
        autoComplete="off"
        {...enNombre}
      />
      <Field
        kind="select"
        id={countryId}
        label="Country"
        value={country}
        onChange={onCountry}
        options={COUNTRY_OPTIONS}
        {...enPais}
      />
    </div>
  )
}
