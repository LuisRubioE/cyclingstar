import { NOTICE_CATALOG, NOTICE_KINDS, type NoticeKind } from '@cyclingstar/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { NOTICES_KEY, turnNoticeOff } from '../api/notices'
import { Notice } from './ui/Notice'

/**
 * `Don't want these?` (docs/cuenta.md §13.3): donde el navegador no pinta botones en los avisos (Safari),
 * tocar uno abre su página con `?from=notice&kind=<kind>`, y arriba se ofrece apagarlo de un toque, sin
 * contraseña. Solo para los avisos que se apagan; los de seguridad no llevan la marca.
 */
export function noticeOptOutKind(params: URLSearchParams): NoticeKind | null {
  if (params.get('from') !== 'notice') return null
  const kind = NOTICE_KINDS.find((k) => k === params.get('kind'))
  return kind !== undefined && NOTICE_CATALOG[kind].switchable ? kind : null
}

export function NoticeOptOutView({
  kind,
  state,
  onTurnOff,
}: {
  readonly kind: NoticeKind
  readonly state: 'ask' | 'busy' | 'done' | 'failed'
  readonly onTurnOff: () => void
}) {
  if (state === 'done')
    return (
      <Notice
        tone="good"
        role="status"
        title="Turned off. You can turn it on again in Account, Notifications."
      />
    )
  return (
    <Notice
      tone="info"
      title={`Don't want these? Turn off "${NOTICE_CATALOG[kind].label}"`}
      action={{ label: 'Turn off', onClick: onTurnOff, busy: state === 'busy' }}
    >
      {state === 'failed' ? "Couldn't turn it off. Try again in a minute." : undefined}
    </Notice>
  )
}

export function NoticeOptOut() {
  const [params] = useSearchParams()
  const queryClient = useQueryClient()
  const [state, setState] = useState<'ask' | 'busy' | 'done' | 'failed'>('ask')
  const kind = noticeOptOutKind(params)
  if (kind === null) return null
  const onTurnOff = () => {
    setState('busy')
    turnNoticeOff(kind)
      .then(() => {
        setState('done')
        void queryClient.invalidateQueries({ queryKey: NOTICES_KEY })
      })
      .catch(() => setState('failed'))
  }
  return (
    <div className="mb-4">
      <NoticeOptOutView kind={kind} state={state} onTurnOff={onTurnOff} />
    </div>
  )
}
