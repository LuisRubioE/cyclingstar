import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'
import { SkeletonBar } from './Skeleton'
import { FOCUS } from './styles'

/**
 * LA CABEZA DE LA PÁGINA (E3, docs/visual.md §4.4; PR 9a, I-32). En las de segundo nivel, la vuelta (el
 * `chevron-left` y el nombre del padre, de 44); el `h1` en `text-page`, uno por página; debajo, la línea
 * de estado en `meta` `ink-2`: lo permanente de la página, como la capa fija de la televisión (el modo y
 * el estado del plan se leen sin bajar), y lo eventual va en `Notice`. La línea es un `<p>`, no una región
 * viva. Cargando, la línea es un esqueleto de 20 px (`SkeletonBar`, PR 10).
 */

export interface PageHeaderProps {
  readonly title: string
  readonly back?: { readonly to: string; readonly label: string }
  /** `Mixed · your plan runs Day 51 to Day 78` */
  readonly status?: string
  readonly loading?: boolean
  readonly action?: ReactNode
}

export function PageHeader({ title, back, status, loading = false, action }: PageHeaderProps) {
  return (
    <header
      data-ui="PageHeader"
      data-variant={back === undefined ? 'default' : 'back'}
      data-state={loading ? 'loading' : 'ready'}
      className="grid gap-1"
    >
      {back !== undefined && (
        <Link
          to={back.to}
          className={`inline-flex min-h-11 items-center gap-1 self-start rounded-ui text-meta text-accent ${FOCUS}`}
        >
          <Icon name="chevron-left" size={20} />
          {back.label}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-page text-ink">{title}</h1>
        {action}
      </div>
      {loading ? (
        <SkeletonBar size="line" />
      ) : (
        status !== undefined && <p className="text-meta text-ink-2">{status}</p>
      )}
    </header>
  )
}
