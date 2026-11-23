import { afterEach, describe, expect, it } from 'vitest'
import {
  NOTICE_ASKED_AT_KEY,
  askSnoozed,
  keyBytes,
  otherDevices,
  pushSupport,
  quietLine,
  snoozeAsk,
} from './push'

/**
 * EL LADO DE LA WEB DE LOS AVISOS (docs/cuenta.md §13.3 y §13.4; PR 14 de E4): qué puede el navegador (el
 * iPhone fuera de la pantalla de inicio es `ios-home`, como en `twilightstruggle`), el silencio del `Notice`
 * del permiso y las líneas de la pantalla.
 */
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
const todo = {
  platform: 'Linux armv8l',
  maxTouchPoints: 5,
  standalone: false,
  serviceWorker: true,
  pushManager: true,
  notification: true,
}

// los tests de la web corren en Node, sin DOM: un `localStorage` de mentira
const almacen = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => almacen.get(k) ?? null,
  setItem: (k: string, v: string) => void almacen.set(k, v),
  removeItem: (k: string) => void almacen.delete(k),
  clear: () => almacen.clear(),
  key: () => null,
  length: 0,
} as Storage
afterEach(() => almacen.clear())

describe('pushSupport (§13.4)', () => {
  it('un iPhone en Safari es ios-home; desde la pantalla de inicio, ok', () => {
    expect(pushSupport({ ...todo, userAgent: IPHONE, platform: 'iPhone' })).toBe('ios-home')
    expect(pushSupport({ ...todo, userAgent: IPHONE, platform: 'iPhone', standalone: true })).toBe(
      'ok',
    )
  })

  it('un iPad que se anuncia como Mac (MacIntel con puntos táctiles) también es ios-home; un Mac, no', () => {
    expect(pushSupport({ ...todo, userAgent: MAC, platform: 'MacIntel' })).toBe('ios-home')
    expect(pushSupport({ ...todo, userAgent: MAC, platform: 'MacIntel', maxTouchPoints: 0 })).toBe(
      'ok',
    )
  })

  it('sin service worker, PushManager o Notification, unsupported; Chrome en Android, ok', () => {
    expect(pushSupport({ ...todo, userAgent: ANDROID, pushManager: false })).toBe('unsupported')
    expect(pushSupport({ ...todo, userAgent: ANDROID, notification: false })).toBe('unsupported')
    expect(pushSupport({ ...todo, userAgent: ANDROID })).toBe('ok')
  })
})

describe('el Notice del permiso y las líneas', () => {
  it('cerrado, se calla 30 días', () => {
    const t = new Date('2026-11-23T12:00:00Z')
    expect(askSnoozed(t)).toBe(false)
    snoozeAsk(t)
    expect(localStorage.getItem(NOTICE_ASKED_AT_KEY)).toBe(String(t.getTime()))
    expect(askSnoozed(new Date('2026-12-22T12:00:00Z'))).toBe(true)
    expect(askSnoozed(new Date('2026-12-23T12:00:01Z'))).toBe(false)
  })

  it('el silencio con la zona guardada; los otros aparatos sin el propio, el último en recibir primero', () => {
    expect(quietLine({ timeZone: 'Europe/Madrid' })).toBe(
      'Quiet hours 22:00 to 08:00 (Europe/Madrid). Notifications wait until morning.',
    )
    const t = (id: string, current: boolean, lastOkAt: string | null) => ({
      id,
      label: id,
      createdAt: '2026-11-01T00:00:00.000Z',
      lastOkAt,
      current,
    })
    expect(
      otherDevices({
        targets: [
          t('a', true, null),
          t('b', false, null),
          t('c', false, '2026-11-20T00:00:00.000Z'),
        ],
      }).map((x) => x.id),
    ).toEqual(['c', 'b'])
  })

  it('la clave pública en base64url pasa a bytes', () => {
    expect([...keyBytes('AQID')]).toEqual([1, 2, 3])
  })
})
