import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { NOTICES_KEY, getNotices, putNoticePrefs } from '../api/notices'
import {
  type BrowserState,
  askSnoozed,
  browserState,
  enablePush,
  snoozeAsk,
} from '../notifications/push'
import { Button } from './ui/Button'
import { Notice } from './ui/Notice'

/**
 * LOS DOS `Notice` DEL PERMISO (docs/cuenta.md §13.3; DD-03 A, D-44, 13-f; PR 14 de E4). Nunca al cargar: el
 * permiso se pide al pulsar `Turn on`. `home` va en la portada de quien ya tiene corredor; `race`, en la página
 * de una carrera justo después de seguirla, y su `Turn on` enciende también `stage_ready`. Cerrarlo
 * (`Not now`) lo calla `NOTICE_ASK_SNOOZE_DAYS` días. En un iPhone fuera de la pantalla de inicio, `See how`
 * lleva a `Account › Notifications`. Sin las VAPID, ya encendidos, bloqueados o sin soporte, nada.
 */
export const ASK_TEXT = {
  home: {
    title: 'Get notified when your stages are ready?',
    body: 'One notification in the evening when stages with your rider are ready to watch, and a few about your training plan and contract offers. Never more than 3 a day.',
  },
  race: { title: 'Get a notification when each stage of this race is ready?', body: null },
} as const

/** Si se ofrece en este estado del navegador. */
export function asksIn(state: BrowserState | null): boolean {
  return state === 'default' || state === 'granted-off' || state === 'ios-home'
}

export function NoticeAsk({
  variant,
  initial,
}: {
  readonly variant: 'home' | 'race'
  /** el estado del navegador, para sus tests */
  readonly initial?: BrowserState
}) {
  const query = useQuery({ queryKey: NOTICES_KEY, queryFn: getNotices })
  const queryClient = useQueryClient()
  const [state, setState] = useState<BrowserState | null>(initial ?? null)
  const [closed, setClosed] = useState(() => initial === undefined && askSnoozed())
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const info = query.data ?? null

  useEffect(() => {
    if (info === null || initial !== undefined) return
    let vivo = true
    void browserState(info).then((s) => {
      if (vivo) setState(s)
    })
    return () => {
      vivo = false
    }
  }, [info, initial])

  if (closed || info === null || !info.enabled || !asksIn(state)) return null
  const t = ASK_TEXT[variant]

  async function onTurnOn() {
    if (info === null || busy) return
    setBusy(true)
    setFailed(false)
    try {
      const r = await enablePush(info)
      if (r === 'on' && variant === 'race') await putNoticePrefs({ stage_ready: true })
      setState(r === 'on' ? 'on' : 'denied')
      void queryClient.invalidateQueries({ queryKey: NOTICES_KEY })
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const close = () => {
    snoozeAsk()
    setClosed(true)
  }
  return (
    <Notice tone="info" title={t.title}>
      {t.body !== null && <p>{t.body}</p>}
      <span className="mt-1 flex flex-wrap gap-2">
        {state === 'ios-home' ? (
          <Button variant="secondary" size="sm" to="/account/notifications">
            See how
          </Button>
        ) : (
          <Button variant="secondary" size="sm" busy={busy} onClick={() => void onTurnOn()}>
            Turn on
          </Button>
        )}
        <Button variant="quiet" size="sm" onClick={close}>
          Not now
        </Button>
      </span>
      {failed && (
        <span role="alert" className="block text-bad">
          Couldn&apos;t turn on notifications. Try again in a minute.
        </span>
      )}
    </Notice>
  )
}
