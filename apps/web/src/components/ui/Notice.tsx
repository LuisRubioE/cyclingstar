import type { ReactNode } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'
import { TONES } from './styles'
import type { Tone } from './types'

/**
 * EL AVISO (E3, docs/visual.md §4.7; PR 9a, D-13). Un borde de 4 px a la izquierda en el color del tono,
 * el fondo del tono, su icono de 20 (la silueta que dice el tono sin el color, §3.7), el título
 * obligatorio en `body` 600 y el texto en `meta` `ink-2`; una acción `quiet` al final y, solo en `info` y
 * `good`, cerrar. Su papel: `note` si está desde el principio, `status` si llega después, `alert` tras
 * una acción que falla. Bajo el `PageHeader` caben dos como mucho (4-e).
 */

export interface NoticeProps {
  readonly tone: Exclude<Tone, 'neutral' | 'accent'>
  /** obligatorio (D-13) */
  readonly title: string
  /** el texto */
  readonly children?: ReactNode
  /** por defecto, `note` */
  readonly role?: 'note' | 'status' | 'alert'
  readonly action?: {
    readonly label: string
    readonly to?: string
    readonly onClick?: () => void
  }
  /** solo con `info` o `good` */
  readonly onDismiss?: () => void
}

export function Notice({ tone, title, children, role = 'note', action, onDismiss }: NoticeProps) {
  const t = TONES[tone]
  if (onDismiss !== undefined && tone !== 'info' && tone !== 'good')
    throw new Error(`Notice: un aviso ${tone} no se cierra`)
  return (
    <div
      data-ui="Notice"
      data-variant={tone}
      data-state="ready"
      role={role}
      className={`flex items-start gap-3 rounded-ui border-l-4 p-3 ${t.border} ${t.bg}`}
    >
      {t.icon !== null && (
        <span className={`inline-flex pt-0.5 ${t.text}`}>
          <Icon name={t.icon} size={20} />
        </span>
      )}
      <div className="grid min-w-0 flex-1 gap-1">
        <p className="text-body font-semibold text-ink">{title}</p>
        {children !== undefined && <div className="text-meta text-ink-2">{children}</div>}
        {action !== undefined && (
          <Button
            variant="quiet"
            layout="-ml-4 self-start"
            {...(action.to !== undefined ? { to: action.to } : {})}
            {...(action.onClick !== undefined ? { onClick: action.onClick } : {})}
          >
            {action.label}
          </Button>
        )}
      </div>
      {onDismiss !== undefined && (
        <Button
          variant="quiet"
          icon="close"
          ariaLabel="Dismiss"
          onClick={onDismiss}
          layout="-my-2 -mr-2"
        />
      )}
    </div>
  )
}
