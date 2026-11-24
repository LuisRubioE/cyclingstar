import type { DeviceRow, DevicesResponse } from '@cyclingstar/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { deleteDevice, getDevices, signOutOthers } from '../../api/account'
import { ME_ACCOUNT_KEY } from '../../components/ProtectedRoute'
import { ActionRow } from '../../components/ui/ActionRow'
import { Button } from '../../components/ui/Button'
import { Notice } from '../../components/ui/Notice'
import { Panel } from '../../components/ui/Panel'
import { QueryView } from '../../components/ui/QueryView'
import { Sheet } from '../../components/ui/Sheet'
import { deviceMeta, devicesStatus, othersText } from '../../domain/accountDates'
import { AccountSubpage, apiFailureText } from './AccountSubpage'

/** La consulta de las sesiones de la cuenta (`GET /api/me/devices`). */
export const DEVICES_KEY = ['me-devices'] as const

interface DevicesState {
  /** el `Notice` `good` tras cerrar: `Signed out of Safari on iPhone.` */
  readonly done: string | null
  /** el fallo, con el texto de la tabla única (§12.3) */
  readonly error: string | null
  /** la hoja de `Sign out everywhere else`, abierta */
  readonly confirming: boolean
}

/**
 * `Account › Devices` (docs/cuenta.md §12.2; DD-06 A, 12-g): dónde tiene sesión la cuenta, con el nombre que
 * calcula la API (`Chrome on Android`), la propia marcada `This device` y las otras con su `Sign out`, sin
 * confirmación (se deshace entrando, D-20). `Sign out everywhere else` pregunta en una `Sheet` y dice cuántas
 * cerró (6-c). Con una sola, `You're only signed in here.` y sin botones. `initial`, para sus tests.
 */
export function AccountDevices({ initial = {} }: { initial?: Partial<DevicesState> } = {}) {
  const query = useQuery({ queryKey: DEVICES_KEY, queryFn: getDevices })
  const queryClient = useQueryClient()
  const [done, setDone] = useState<string | null>(initial.done ?? null)
  const [error, setError] = useState<string | null>(initial.error ?? null)
  const [confirming, setConfirming] = useState(initial.confirming ?? false)
  const [busy, setBusy] = useState<string | null>(null)
  const devices = query.data?.devices ?? []
  const otras = devices.filter((d) => !d.current).length

  /** La lista sin las que se cerraron, al momento; después, la de la API y el número de la lista de `Account`. */
  const quita = (keep: (d: DeviceRow) => boolean) => {
    queryClient.setQueryData<DevicesResponse>(DEVICES_KEY, (old) =>
      old === undefined ? old : { ...old, devices: old.devices.filter(keep) },
    )
    void queryClient.invalidateQueries({ queryKey: DEVICES_KEY })
    void queryClient.invalidateQueries({ queryKey: ME_ACCOUNT_KEY })
  }

  async function onSignOut(row: DeviceRow) {
    if (busy !== null) return
    setBusy(row.id)
    setError(null)
    setDone(null)
    try {
      await deleteDevice(row.id)
      quita((d) => d.id !== row.id)
      setDone(`Signed out of ${row.label}.`)
    } catch (err) {
      setError(apiFailureText(err))
    } finally {
      setBusy(null)
    }
  }

  async function onSignOutOthers() {
    if (busy !== null) return
    setBusy('others')
    setError(null)
    setDone(null)
    try {
      const { closed } = await signOutOthers()
      quita((d) => d.current)
      setConfirming(false)
      setDone(`Signed out of ${othersText(closed)}.`)
    } catch (err) {
      setConfirming(false)
      setError(apiFailureText(err))
    } finally {
      setBusy(null)
    }
  }

  const now = new Date()
  return (
    <AccountSubpage
      title="Devices"
      loading={query.data === undefined && query.isPending}
      {...(query.data !== undefined ? { status: devicesStatus(devices.length) } : {})}
    >
      {done !== null && <Notice tone="good" role="status" title={done} />}
      {error !== null && <Notice tone="bad" role="alert" title={error} />}
      <Panel ariaLabel="Where you're signed in" answer>
        <QueryView query={query} label="your devices" skeleton={{ kind: 'panel' }}>
          {(data) => (
            <div className="grid gap-3">
              <ul className="divide-y divide-line">
                {data.devices.map((d) => (
                  <ActionRow
                    key={d.id}
                    title={d.label}
                    meta={deviceMeta(d, now)}
                    {...(d.current
                      ? { done: { text: 'This device', tone: 'neutral' as const } }
                      : {
                          action: {
                            label: 'Sign out',
                            ariaLabel: `Sign out of ${d.label}`,
                            busy: busy === d.id,
                            onClick: () => void onSignOut(d),
                          },
                        })}
                  />
                ))}
              </ul>
              {data.devices.some((d) => !d.current) && (
                <Button layout="justify-self-start" onClick={() => setConfirming(true)}>
                  Sign out everywhere else
                </Button>
              )}
            </div>
          )}
        </QueryView>
      </Panel>
      <Sheet
        open={confirming}
        title={`Sign out of ${othersText(otras)}?`}
        onClose={() => setConfirming(false)}
      >
        <div className="flex flex-wrap gap-3 px-3">
          <Button variant="danger" busy={busy === 'others'} onClick={() => void onSignOutOthers()}>
            Sign out
          </Button>
          <Button variant="quiet" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      </Sheet>
    </AccountSubpage>
  )
}
