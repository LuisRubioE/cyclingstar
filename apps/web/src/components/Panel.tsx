import type { ReactNode } from 'react'

/**
 * Tarjeta con cabecera en cian (estilo manager): título en blanco a la izquierda, acciones a la
 * derecha, cuerpo blanco. Es la unidad visual de casi toda la interfaz.
 */
export function Panel({
  title,
  action,
  children,
  bodyClassName = 'p-4',
  className = '',
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  bodyClassName?: string
  className?: string
}) {
  return (
    <section
      className={`overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/5 ${className}`}
    >
      {title != null && (
        <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-brand-cyan to-brand-cyan-light px-4 py-2">
          <h2 className="text-sm font-semibold tracking-wide text-white">{title}</h2>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

/** Barra dorada de sección: título de página (como "Novo Jogador" en el manager de referencia). */
export function SectionBar({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-gradient-to-r from-brand-gold-light to-brand-gold px-4 py-2.5 shadow-sm">
      <h1 className="text-lg font-bold tracking-wide text-white">{children}</h1>
      {action}
    </div>
  )
}

/** Fila etiqueta→valor para bloques de "información" (dos columnas, etiqueta en negrita). */
export function InfoRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-1.5 last:border-0">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span className="text-right text-sm text-slate-900">{children}</span>
    </div>
  )
}
