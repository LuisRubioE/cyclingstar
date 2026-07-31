/** Campo de texto etiquetado, reutilizado en los formularios de acceso y registro. */
export function TextField(props: {
  label: string
  value: string
  onChange: (value: string) => void
  type: string
  autoComplete: string
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{props.label}</span>
      <input
        className="w-full rounded-md border border-slate-300 px-3 py-2"
        type={props.type}
        value={props.value}
        autoComplete={props.autoComplete}
        onChange={(event) => props.onChange(event.target.value)}
        required
      />
    </label>
  )
}
