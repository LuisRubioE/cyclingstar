import {
  NOTICE_CATALOG,
  type NoticeKind,
  type NoticesResponse,
  SWITCHABLE_NOTICE_KINDS,
} from '@cyclingstar/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { NOTICES_KEY, deletePushTarget, getNotices, putNoticePrefs } from '../../api/notices'
import { ActionRow } from '../../components/ui/ActionRow'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Checkbox'
import { Notice } from '../../components/ui/Notice'
import { Panel } from '../../components/ui/Panel'
import { QueryView } from '../../components/ui/QueryView'
import { shortDate } from '../../domain/accountDates'
import {
  type BrowserState,
  browserState,
  disablePush,
  enablePush,
  notificationsValue,
  otherDevices,
  prefOn,
  quietLine,
} from '../../notifications/push'
import { AccountSubpage } from './AccountSubpage'

/**
 * `Account › Notifications` (docs/cuenta.md §13.4; DD-02 A, DD-04; PR 14 de E4): el panel `This browser` en
 * sus estados, las casillas de `What we notify` (cada una guarda al cambiar) y los otros aparatos. Sin las
 * tres VAPID en el servidor, una frase y nada más. En un iPhone fuera de la pantalla de inicio, cómo añadir
 * la web y encenderlos desde allí (iOS 16.4 o más). `initial`, para sus tests.
 */

/** Las casillas que se pintan: `away_warning` llega con el PR 15, con la regla de E7. */
export const NOTICE_ROWS: readonly NoticeKind[] = SWITCHABLE_NOTICE_KINDS.filter(
  (k) => k !== 'away_warning',
)

/** El rótulo de una casilla: el del catálogo, con la hora del resumen. */
export function noticeRowLabel(kind: NoticeKind): string {
  const label = NOTICE_CATALOG[kind].label
  return kind === 'stage_digest' ? `${label} (once a day, 19:00)` : label
}

export const EVERYTHING_ON_HOME =
  'Everything a notification would tell you is also on your Home page.'
export const IOS_HOME_STEPS =
  'Tap Share, then Add to Home Screen. Open Cycling Star from there, log in, and turn notifications on in Account, Notifications. You need iOS 16.4 or later.'

interface NotificationsState {
  readonly browser: BrowserState | null
  readonly failed: boolean
  readonly saved: string | null
}

/** El panel `This browser`, en cada estado de la tabla de §13.4. */
export function ThisBrowser({
  state,
  label,
  failed,
  busy,
  onTurnOn,
  onTurnOff,
}: {
  readonly state: BrowserState
  readonly label: string
  readonly failed: boolean
  readonly busy: boolean
  readonly onTurnOn: () => void
  readonly onTurnOff: () => void
}) {
  const turnOn = (
    <Button layout="justify-self-start" busy={busy} onClick={onTurnOn}>
      Turn on
    </Button>
  )
  return (
    <Panel title="This browser" answer>
      <div className="grid gap-3">
        {failed && (
          <Notice
            tone="bad"
            role="alert"
            title="Couldn't turn on notifications. Try again in a minute."
          />
        )}
        {state === 'unsupported' && (
          <p className="text-body text-ink">
            This browser can&apos;t show notifications. {EVERYTHING_ON_HOME}
          </p>
        )}
        {state === 'ios-home' && (
          <>
            <p className="text-body font-semibold text-ink">
              On iPhone and iPad, notifications only work from the Home Screen.
            </p>
            <p className="text-body text-ink">{IOS_HOME_STEPS}</p>
            <p className="text-meta text-ink-soft">{EVERYTHING_ON_HOME}</p>
          </>
        )}
        {state === 'default' && (
          <>
            <p className="text-body text-ink">Get notifications on this browser.</p>
            {turnOn}
          </>
        )}
        {state === 'denied' && (
          <p className="text-body text-ink">
            Notifications are blocked for Cycling Star in this browser&apos;s settings. Allow them
            there, then come back.
          </p>
        )}
        {state === 'granted-off' && (
          <>
            <p className="text-body text-ink">Notifications are off on this browser.</p>
            {turnOn}
          </>
        )}
        {state === 'on' && (
          <>
            <p className="text-body text-ink">{label} · On</p>
            <p className="text-meta text-ink-soft">
              Signing out of this browser turns its notifications off.
            </p>
            <Button layout="justify-self-start" busy={busy} onClick={onTurnOff}>
              Turn off on this browser
            </Button>
          </>
        )}
      </div>
    </Panel>
  )
}

export function AccountNotifications({
  initial = {},
}: { initial?: Partial<NotificationsState> } = {}) {
  const query = useQuery({ queryKey: NOTICES_KEY, queryFn: getNotices })
  const queryClient = useQueryClient()
  const [browser, setBrowser] = useState<BrowserState | null>(initial.browser ?? null)
  const [failed, setFailed] = useState(initial.failed ?? false)
  const [saved, setSaved] = useState<string | null>(initial.saved ?? null)
  const [busy, setBusy] = useState<string | null>(null)
  const info = query.data ?? null

  useEffect(() => {
    if (info === null || initial.browser !== undefined) return
    let vivo = true
    void browserState(info).then((s) => {
      if (vivo) setBrowser(s)
    })
    return () => {
      vivo = false
    }
  }, [info, initial.browser])

  const refrescar = () => void queryClient.invalidateQueries({ queryKey: NOTICES_KEY })

  async function onTurnOn() {
    if (info === null || busy !== null) return
    setBusy('browser')
    setFailed(false)
    try {
      const r = await enablePush(info)
      setBrowser(r === 'on' ? 'on' : 'denied')
      refrescar()
    } catch {
      setFailed(true)
    } finally {
      setBusy(null)
    }
  }

  async function onTurnOff() {
    if (busy !== null) return
    setBusy('browser')
    await disablePush()
    setBrowser('granted-off')
    refrescar()
    setBusy(null)
  }

  async function onToggle(kind: NoticeKind, on: boolean) {
    if (info === null) return
    const antes = info
    queryClient.setQueryData<NoticesResponse | null>(NOTICES_KEY, (old) =>
      old ? { ...old, prefs: { ...old.prefs, [kind]: on } } : old,
    )
    try {
      await putNoticePrefs({ [kind]: on })
      setSaved('Notification settings saved.')
    } catch {
      // vuelve atrás y lo dice
      queryClient.setQueryData(NOTICES_KEY, antes)
      setSaved("Couldn't save. Try again in a minute.")
    }
  }

  async function onRemove(id: string) {
    if (busy !== null) return
    setBusy(id)
    try {
      await deletePushTarget(id)
      refrescar()
    } finally {
      setBusy(null)
    }
  }

  const now = new Date()
  const actual = info?.targets.find((t) => t.current)
  return (
    <AccountSubpage
      title="Notifications"
      loading={info === null && query.isPending}
      {...(browser !== null && info?.enabled === true
        ? { status: notificationsValue(browser) }
        : {})}
    >
      <QueryView query={query} label="your notification settings" skeleton={{ kind: 'panel' }}>
        {(data) =>
          data === null ? null : !data.enabled ? (
            <p className="text-body text-ink">Notifications aren&apos;t available yet.</p>
          ) : (
            <div className="grid gap-4">
              {browser !== null && (
                <ThisBrowser
                  state={browser}
                  label={actual?.label ?? 'This browser'}
                  failed={failed}
                  busy={busy === 'browser'}
                  onTurnOn={() => void onTurnOn()}
                  onTurnOff={() => void onTurnOff()}
                />
              )}
              <Panel title="What we notify">
                <div className="grid gap-1">
                  {NOTICE_ROWS.map((k) => (
                    <Checkbox
                      key={k}
                      label={noticeRowLabel(k)}
                      checked={prefOn(data, k)}
                      onChange={(on) => void onToggle(k, on)}
                    />
                  ))}
                  <p className="text-meta text-ink-soft">
                    Always on: a changed password, a new sign-in and a changed email.
                  </p>
                  <p className="text-meta text-ink-soft">{quietLine(data)}</p>
                  <p role="status" className="text-meta text-good empty:sr-only">
                    {saved ?? ''}
                  </p>
                </div>
              </Panel>
              {otherDevices(data).length > 0 && (
                <Panel title="Other devices">
                  <ul className="divide-y divide-line">
                    {otherDevices(data).map((t) => (
                      <ActionRow
                        key={t.id}
                        title={t.label}
                        meta={`since ${shortDate(t.createdAt, now)}`}
                        action={{
                          label: 'Remove',
                          ariaLabel: `Remove ${t.label}`,
                          busy: busy === t.id,
                          onClick: () => void onRemove(t.id),
                        }}
                      />
                    ))}
                  </ul>
                </Panel>
              )}
            </div>
          )
        }
      </QueryView>
    </AccountSubpage>
  )
}
