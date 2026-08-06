/**
 * Campo de texto etiquetado, reutilizado en los formularios de acceso y registro.
 * `required` es opcional (por defecto sí, que es lo que necesitan esos formularios): antes estaba
 * forzado en el marcado y el componente no servía para campos opcionales.
 */
export function TextField(props: {
  label: string
  value: string
  onChange: (value: string) => void
  type: string
  autoComplete: string
  minLength?: number
  hint?: string
  required?: boolean
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{props.label}</span>
      <input
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        type={props.type}
        value={props.value}
        autoComplete={props.autoComplete}
        minLength={props.minLength}
        onChange={(event) => props.onChange(event.target.value)}
        required={props.required ?? true}
      />
      {props.hint && <span className="text-xs text-slate-400">{props.hint}</span>}
    </label>
  )
}
