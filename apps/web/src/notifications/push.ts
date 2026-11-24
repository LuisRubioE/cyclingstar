import { NOTICE_ASK_SNOOZE_DAYS, type NoticesResponse } from '@cyclingstar/shared'
import { deletePushTarget, postPushTarget } from '../api/notices'

/**
 * LOS AVISOS, EL LADO DE LA WEB (docs/cuenta.md §13.3 a §13.5; PR 14 de E4), como `ai/ui/src/online/push.ts`
 * de `twilightstruggle`. El permiso solo se pide con un toque, nunca al cargar (D-44): Firefox y Safari no lo
 * conceden de otra forma. El service worker es `/sw.js` (`apps/web/public/sw.js`), con ámbito `/`, y se
 * registra solo al pulsar `Turn on`.
 *
 * El iPhone y el iPad (desde iOS 16.4) reciben avisos solo desde la web añadida a la pantalla de inicio y
 * abierta desde allí (DD-04): en Safari, la página explica cómo en vez de ofrecer un botón que no puede
 * funcionar. Para eso está el manifiesto mínimo (`apps/web/public/manifest.webmanifest`, §13.5).
 */

const SW_URL = '/sw.js'
const SCOPE = '/'
/** La fila de este navegador en `push_targets`: `Sign out` la borra antes de salir (§13.4; D-49). */
export const PUSH_TARGET_ID_KEY = 'cs.pushTargetId'
/** Cuándo se cerró el `Notice` del permiso: no vuelve en `NOTICE_ASK_SNOOZE_DAYS` días (D-44). */
export const NOTICE_ASKED_AT_KEY = 'cs.noticeAskedAt'

/** Lo que este navegador puede hacer: recibir avisos, solo desde la pantalla de inicio (iOS), o nada. */
export type Support = 'ok' | 'ios-home' | 'unsupported'

interface Entorno {
  readonly userAgent: string
  readonly platform: string
  readonly maxTouchPoints: number
  readonly standalone: boolean
  readonly serviceWorker: boolean
  readonly pushManager: boolean
  readonly notification: boolean
}

function entorno(): Entorno {
  const nav = navigator as Navigator & { standalone?: boolean }
  return {
    userAgent: nav.userAgent,
    platform: nav.platform,
    maxTouchPoints: nav.maxTouchPoints,
    standalone:
      window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true,
    serviceWorker: 'serviceWorker' in nav,
    pushManager: 'PushManager' in window,
    notification: 'Notification' in window,
  }
}

/**
 * Qué puede el navegador (§13.4), como `pushSupport` de `twilightstruggle`: un iPhone o iPad (`iPad`, `iPhone`
 * o `iPod` en el agente, o `MacIntel` con más de un punto táctil) fuera del modo `standalone` es `ios-home`;
 * sin `serviceWorker`, `PushManager` o `Notification`, `unsupported`; si no, `ok`.
 */
export function pushSupport(e: Entorno = entorno()): Support {
  const ios =
    /iPad|iPhone|iPod/.test(e.userAgent) || (e.platform === 'MacIntel' && e.maxTouchPoints > 1)
  if (ios && !e.standalone) return 'ios-home'
  if (!e.serviceWorker || !e.pushManager || !e.notification) return 'unsupported'
  return 'ok'
}

/** El estado del panel `This browser` (§13.4, la tabla). */
export type BrowserState =
  'disabled' | 'unsupported' | 'ios-home' | 'default' | 'denied' | 'granted-off' | 'on'

/** La clave pública del servidor, como la quiere `PushManager`. */
export function keyBytes(base64url: string): Uint8Array {
  const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

/** Si la suscripción se hizo con esta clave (el servidor puede cambiarla). */
function sameKey(sub: PushSubscription, publicKey: string): boolean {
  const k = sub.options?.applicationServerKey
  if (!k) return true
  const a = new Uint8Array(k)
  const b = keyBytes(publicKey)
  return a.length === b.length && a.every((x, i) => x === b[i])
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== 'ok') return null
  const reg = await navigator.serviceWorker.getRegistration(SCOPE)
  return reg ? reg.pushManager.getSubscription() : null
}

const guardado = (): string | null => {
  try {
    return localStorage.getItem(PUSH_TARGET_ID_KEY)
  } catch {
    return null
  }
}

/** El estado de este navegador con lo que dice el servidor. */
export async function browserState(
  info: Pick<NoticesResponse, 'enabled' | 'targets'>,
): Promise<BrowserState> {
  if (!info.enabled) return 'disabled'
  const s = pushSupport()
  if (s !== 'ok') return s
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission === 'default') return 'default'
  const sub = await currentSubscription().catch(() => null)
  const id = guardado()
  return sub !== null && info.targets.some((t) => t.current || t.id === id) ? 'on' : 'granted-off'
}

/** La zona del navegador, para el silencio y la hora del resumen (§13.2). */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/**
 * Avisos encendidos en este navegador. Llamarla directamente desde el toque: el permiso se pide primero,
 * mientras el navegador aún cuenta el toque (Safari lo exige). Con el permiso ya concedido, suscribe sin
 * volver a pedirlo.
 */
export async function enablePush(
  info: Pick<NoticesResponse, 'publicKey'>,
): Promise<'on' | 'denied'> {
  const publicKey = info.publicKey
  if (publicKey === null) return 'denied'
  const permiso =
    Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
  if (permiso !== 'granted') return 'denied'
  const reg = await navigator.serviceWorker.register(SW_URL, { scope: SCOPE })
  await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (sub && !sameKey(sub, publicKey)) {
    await sub.unsubscribe()
    sub = null
  }
  sub ??= await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes(publicKey) as BufferSource,
  })
  const json = sub.toJSON()
  const id = await postPushTarget({
    endpoint: sub.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
    timeZone: browserTimeZone(),
  })
  try {
    localStorage.setItem(PUSH_TARGET_ID_KEY, id)
  } catch {
    /* sin almacenamiento, `Sign out` no podrá borrarla antes: la borra el 404 o el 410 */
  }
  return 'on'
}

/** Avisos apagados en este navegador: el servidor la olvida, y el navegador también. */
export async function disablePush(): Promise<void> {
  const id = guardado()
  if (id !== null) await deletePushTarget(id).catch(() => undefined)
  try {
    localStorage.removeItem(PUSH_TARGET_ID_KEY)
  } catch {
    /* nada */
  }
  const sub = await currentSubscription().catch(() => null)
  await sub?.unsubscribe().catch(() => false)
}

/** `Sign out` (§13.4; D-49): borra antes la suscripción de este navegador. Nunca estorba a la salida. */
export async function forgetPushBeforeSignOut(): Promise<void> {
  try {
    if (guardado() !== null) await disablePush()
  } catch {
    /* la salida sigue */
  }
}

/** Si el `Notice` del permiso está callado (se cerró hace menos de `NOTICE_ASK_SNOOZE_DAYS` días). */
export function askSnoozed(now: Date = new Date()): boolean {
  try {
    const at = Number(localStorage.getItem(NOTICE_ASKED_AT_KEY))
    return at > 0 && now.getTime() - at < NOTICE_ASK_SNOOZE_DAYS * 86_400_000
  } catch {
    return false
  }
}

/** Cierra el `Notice` del permiso por `NOTICE_ASK_SNOOZE_DAYS` días. */
export function snoozeAsk(now: Date = new Date()): void {
  try {
    localStorage.setItem(NOTICE_ASKED_AT_KEY, String(now.getTime()))
  } catch {
    /* nada */
  }
}

/** Una casilla de `What we notify`, con los defectos que ya pone el servidor. */
export function prefOn(info: Pick<NoticesResponse, 'prefs'>, kind: string): boolean {
  return info.prefs[kind] === true
}

/** `Quiet hours 22:00 to 08:00 (Europe/Madrid). Notifications wait until morning.` (§13.4). */
export function quietLine(info: Pick<NoticesResponse, 'timeZone'>): string {
  return `Quiet hours 22:00 to 08:00 (${info.timeZone ?? browserTimeZone()}). Notifications wait until morning.`
}

/** Los otros aparatos con avisos (`Other devices`), el que recibió el último primero. */
export function otherDevices(info: Pick<NoticesResponse, 'targets'>): NoticesResponse['targets'] {
  const id = guardado()
  const cuando = (t: NoticesResponse['targets'][number]) => t.lastOkAt ?? t.createdAt
  return info.targets
    .filter((t) => !t.current && t.id !== id)
    .sort((a, b) => cuando(b).localeCompare(cuando(a)))
}

/** El valor de la fila de `Account`: `On for this browser` u `Off`. */
export function notificationsValue(state: BrowserState | null): string {
  if (state === null) return ''
  if (state === 'on') return 'On for this browser'
  if (state === 'ios-home' || state === 'unsupported') return 'Not on this browser'
  return 'Off'
}
