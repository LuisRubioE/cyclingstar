import { z } from 'zod'
import { stageReadyNotice } from '../broadcast/pageTitle.js'
import type { PreStageInfo } from '../broadcast/wire.js'

/**
 * LOS AVISOS (docs/cuenta.md §13; D-42 a D-50, 13-a a 13-l; PR 14 de E4). Un aviso es una notificación del
 * navegador o de la app, nunca un correo (D-00c). Este fichero es el catálogo, el único constructor de la
 * carga (`noticePayload`, pura: ningún aviso destripa, §13.8) y las constantes del tope y del silencio.
 */

export const NOTICE_KINDS = [
  'stage_digest',
  'stage_ready',
  'plan_ending',
  'offer_received',
  'away_warning',
  'away_over',
  'password_changed',
  'new_sign_in',
  'email_changed',
] as const
export type NoticeKind = (typeof NOTICE_KINDS)[number]

export interface NoticeSpec {
  /** Se puede apagar en `Notifications` y con `Turn off these`. Los de seguridad, no. */
  readonly switchable: boolean
  /** Encendido sin que el jugador diga nada (DD-02 A). */
  readonly byDefault: boolean
  /** Cuenta en `NOTICE_DAILY_CAP`. */
  readonly capped: boolean
  /** Espera al final del silencio. */
  readonly quiet: boolean
  /** Sale con la ausencia viva. */
  readonly whileAway: boolean
  readonly ttlS: number
  readonly urgency: 'normal' | 'high'
  /** Rótulo de la fila de `Notifications` (pantalla). */
  readonly label: string
}

const H12 = 43_200
const juego = (label: string, byDefault: boolean, extra: Partial<NoticeSpec> = {}): NoticeSpec => ({
  switchable: true,
  byDefault,
  capped: true,
  quiet: true,
  whileAway: false,
  ttlS: H12,
  urgency: 'normal',
  label,
  ...extra,
})
/** Los tres de seguridad (13-a): sin interruptor, fuera del tope y del silencio, también con la ausencia. */
const seguridad = (label: string): NoticeSpec => ({
  switchable: false,
  byDefault: true,
  capped: false,
  quiet: false,
  whileAway: true,
  ttlS: H12,
  urgency: 'high',
  label,
})

/** La tabla de §13.1 y el párrafo que sigue al bloque de código. */
export const NOTICE_CATALOG: Readonly<Record<NoticeKind, NoticeSpec>> = {
  stage_digest: juego('Stages ready', true),
  stage_ready: juego('Every stage of races you follow', false, { ttlS: 21_600 }),
  plan_ending: juego('Training plan ending', true),
  offer_received: juego('Contract offers', true),
  away_warning: juego('Before your coach takes over', true, { capped: false }),
  away_over: juego('Your away time is over', true, { whileAway: true }),
  password_changed: seguridad('Password changed'),
  new_sign_in: seguridad('New sign-in'),
  email_changed: seguridad('Email changed'),
}

/** Los `byDefault` de los apagables (DD-02 A): lo que vale `users.notice_prefs = {}`. */
export const NOTICE_DEFAULTS: Readonly<Partial<Record<NoticeKind, boolean>>> = Object.fromEntries(
  NOTICE_KINDS.filter((k) => NOTICE_CATALOG[k].switchable).map((k) => [
    k,
    NOTICE_CATALOG[k].byDefault,
  ]),
)

/** Los avisos que el jugador puede apagar, en el orden de la pantalla. */
export const SWITCHABLE_NOTICE_KINDS: readonly NoticeKind[] = NOTICE_KINDS.filter(
  (k) => NOTICE_CATALOG[k].switchable,
)

/**
 * Si un aviso está encendido para estas preferencias guardadas. Una clave de un aviso no apagable se ignora
 * al leer (§13.1): los de seguridad están siempre encendidos.
 */
export function isNoticeOn(prefs: Readonly<Record<string, unknown>>, kind: NoticeKind): boolean {
  const spec = NOTICE_CATALOG[kind]
  if (!spec.switchable) return true
  const v = prefs[kind]
  return typeof v === 'boolean' ? v : spec.byDefault
}

/** Las preferencias efectivas de los apagables, con los defectos puestos. */
export function effectiveNoticePrefs(
  prefs: Readonly<Record<string, unknown>>,
): Partial<Record<NoticeKind, boolean>> {
  return Object.fromEntries(SWITCHABLE_NOTICE_KINDS.map((k) => [k, isNoticeOn(prefs, k)]))
}

/** Lo que viaja al service worker y a la app: sin nada más que esto. */
export interface NoticePayload {
  readonly kind: NoticeKind
  readonly title: string
  readonly body: string
  /** Ruta de la web; la app la traduce a la suya. */
  readonly path: string
  readonly tag: string
  /** Si el service worker ofrece `Turn off these` (`NOTICE_CATALOG[kind].switchable`). */
  readonly off: boolean
}

export interface ReadyStage {
  readonly info: PreStageInfo
  /** El id de la carrera del calendario (`tdf`), no la clave con temporada: la ruta de la web. */
  readonly raceId: string
  readonly ownRiderOnStartlist: boolean
}

export type NoticeInput =
  | { readonly kind: 'stage_digest'; readonly stages: readonly ReadyStage[] }
  | { readonly kind: 'stage_ready'; readonly stage: ReadyStage }
  | { readonly kind: 'plan_ending'; readonly riderName: string }
  | { readonly kind: 'offer_received'; readonly riderName: string; readonly offers: number }
  | {
      readonly kind: 'away_warning'
      readonly riderName: string
      readonly daysLeft: number
      /** Ya escrito como `19 Dec` (§5.7): la función no lee relojes. */
      readonly deadline: string
    }
  | { readonly kind: 'away_over' }
  | { readonly kind: 'password_changed' }
  | { readonly kind: 'new_sign_in'; readonly deviceLabel: string }
  | { readonly kind: 'email_changed' }

const ON_START_LIST = 'your rider is on the start list'

function texto(input: NoticeInput): { title: string; body: string; path: string; tag: string } {
  switch (input.kind) {
    case 'stage_digest': {
      const [una] = input.stages
      if (input.stages.length === 1 && una !== undefined) {
        const n = stageReadyNotice('en', una.info, una.ownRiderOnStartlist)
        return { title: n.subject, body: n.text, path: '/', tag: 'digest' }
      }
      const carreras = [...new Set(input.stages.map((s) => s.raceId))]
      const propio = input.stages.every((s) => s.ownRiderOnStartlist)
      const donde =
        carreras.length === 1 ? (input.stages[0]?.info.raceName ?? '') : `${carreras.length} races`
      return {
        title: `${input.stages.length} stages are ready to watch`,
        body: propio ? `${donde} · ${ON_START_LIST}` : donde,
        path: '/',
        tag: 'digest',
      }
    }
    case 'stage_ready': {
      const s = input.stage
      const n = stageReadyNotice('en', s.info, s.ownRiderOnStartlist)
      return {
        title: n.subject,
        body: n.text,
        path: `/world/races/${s.raceId}/stages/${s.info.stageDay}`,
        tag: `stage-${s.raceId}`,
      }
    }
    case 'plan_ending':
      return {
        title: 'Your training plan ends tomorrow',
        body: `After that your coach picks ${input.riderName}'s training.`,
        path: '/me/training',
        tag: 'plan',
      }
    case 'offer_received':
      return {
        title: `New contract offers for ${input.riderName}`,
        body: `${input.offers === 1 ? 'One team' : `${input.offers} teams`} made an offer. Offers expire in about 5 days.`,
        path: '/me/contract',
        tag: 'offers',
      }
    case 'away_warning':
      return {
        title: `${input.daysLeft} days left`,
        body: `If you don't visit by ${input.deadline}, your coach takes over ${input.riderName}. One visit is enough.`,
        path: '/',
        tag: 'away',
      }
    case 'away_over':
      return {
        title: 'Welcome back',
        body: 'Your away time is over. Your notifications are on again.',
        path: '/',
        tag: 'away',
      }
    case 'password_changed':
      return {
        title: 'Your password was changed',
        body: "If it wasn't you, reset it now.",
        path: '/forgot-password',
        tag: 'password',
      }
    case 'new_sign_in':
      return {
        title: 'New sign-in to your account',
        body: `${input.deviceLabel} signed in just now. If it wasn't you, reset your password.`,
        path: '/account/devices',
        tag: 'signin',
      }
    case 'email_changed':
      return {
        title: 'Your account email was changed by an administrator',
        body: "If you didn't ask for this, sign in and check Account.",
        path: '/account/email',
        tag: 'email',
      }
  }
}

/**
 * Pura: el único constructor de avisos (§13.1, §13.8). Los de etapa salen de `stageReadyNotice` y de contar
 * etapas; `path` y `tag` del `raceId` de fuera, porque `PreStageInfo` no lo lleva. Ninguna palabra depende de
 * lo que pasó en una etapa.
 */
export function noticePayload(input: NoticeInput): NoticePayload {
  const t = texto(input)
  return { kind: input.kind, ...t, off: NOTICE_CATALOG[input.kind].switchable }
}

/** Avisos por día local y usuario, contando solo los `capped` (D-43). */
export const NOTICE_DAILY_CAP = 3
/** El silencio, en la zona del jugador (§13.2; O-06): de 22 a 8. */
export const NOTICE_QUIET_START_H = 22
export const NOTICE_QUIET_END_H = 8
/** `stage_digest`, una vez al día, por la tarde (D-43). */
export const STAGE_DIGEST_HOUR = 19
/** Una carrera seguida no suena en cada etapa (§13.1). */
export const STAGE_READY_EVERY_H = 6
/** `plan_ending`: un día real antes del fin del plan (cuatro días de juego). */
export const PLAN_ENDING_GAME_DAYS = 4
/** El `Notice` del permiso cerrado no vuelve en un mes (D-44). */
export const NOTICE_ASK_SNOOZE_DAYS = 30
/** `new_sign_in`, como mucho uno por hora y cuenta (DD-16; 7-g). */
export const NEW_SIGN_IN_EVERY_H = 1
/** Aparatos con avisos por cuenta: el undécimo saca al más viejo (D-46). */
export const PUSH_TARGETS_PER_USER = 10
/** Tres fallos seguidos que no son 404 ni 410 borran la suscripción (D-46). */
export const PUSH_DEAD_AFTER_FAILS = 3
/** El de `twilightstruggle` (§13.6). */
export const PUSH_SEND_TIMEOUT_MS = 15_000

/** Si `h` (hora local, 0 a 23) cae en el silencio. */
export function isQuietHour(h: number): boolean {
  return h >= NOTICE_QUIET_START_H || h < NOTICE_QUIET_END_H
}

/** Una zona IANA que este motor conoce, o `UTC`. */
export function isKnownTimeZone(tz: string): boolean {
  if (tz === 'UTC') return true
  try {
    return Intl.supportedValuesOf('timeZone').includes(tz)
  } catch {
    return false
  }
}

/** La fecha (`2026-11-23`) y la hora local de `now` en `timeZone` (sin zona, UTC). */
export function localClock(now: Date, timeZone: string | null): { date: string; hour: number } {
  const zona = timeZone !== null && isKnownTimeZone(timeZone) ? timeZone : 'UTC'
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const de = (t: string): string => partes.find((p) => p.type === t)?.value ?? '00'
  return { date: `${de('year')}-${de('month')}-${de('day')}`, hour: Number(de('hour')) % 24 }
}

/** `PUT /api/me/notices`: solo claves apagables; una de seguridad se rechaza (§13.1). */
export const noticePrefsBodySchema = z
  .object(
    Object.fromEntries(SWITCHABLE_NOTICE_KINDS.map((k) => [k, z.boolean().optional()])) as Record<
      NoticeKind,
      z.ZodOptional<z.ZodBoolean>
    >,
  )
  .strict()

/** `GET /api/me/notices` (§13.6). */
export const noticesResponseSchema = z.object({
  ok: z.literal(true),
  /** Sin las tres VAPID en el servidor, false: la web oculta los avisos. */
  enabled: z.boolean(),
  publicKey: z.string().nullable(),
  prefs: z.record(z.string(), z.boolean()),
  timeZone: z.string().nullable(),
  targets: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      createdAt: z.string(),
      lastOkAt: z.string().nullable(),
      /** La de la sesión de esta petición. */
      current: z.boolean(),
    }),
  ),
})
export type NoticesResponse = z.infer<typeof noticesResponseSchema>
