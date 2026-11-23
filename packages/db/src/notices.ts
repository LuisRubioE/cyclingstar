import {
  NOTICE_CATALOG,
  NOTICE_DAILY_CAP,
  NOTICE_KINDS,
  type NoticeInput,
  type NoticeKind,
  type NoticePayload,
  PLAN_ENDING_GAME_DAYS,
  PUSH_DEAD_AFTER_FAILS,
  PUSH_TARGETS_PER_USER,
  type PreStageInfo,
  type ReadyStage,
  STAGE_DIGEST_HOUR,
  STAGE_READY_EVERY_H,
  isNoticeOn,
  isQuietHour,
  localClock,
  noticePayload,
  parseRaceKey,
} from '@cyclingstar/shared'
import { and, asc, desc, eq, gt, inArray, like, ne, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import { computeHorizon } from './horizon.js'
import { isAway } from './inactivity.js'
import { LOCK_CLASS, hashInt, toInt32 } from './locks.js'
import { getCurrentWorld } from './riders.js'
import { noticeLog, offers, pushTargets, riders, users } from './schema.js'
import { getPlanForDay } from './training.js'

/**
 * LOS AVISOS EN LA BASE (docs/cuenta.md §13.6 y §13.7; PR 14 de E4): los aparatos (`push_targets`), lo avisado
 * (`notice_log`, con el tope del día) y el barrido que manda los avisos de juego. Aquí no se envía nada: quien
 * envía (`apps/api/src/push/deliver.ts`, con `web-push`) llega como `send`, y la base no sabe de VAPID.
 */

export type PushChannel = (typeof pushTargets.$inferSelect)['channel']

/** Una fila de `push_targets` tal como la necesita quien envía. */
export interface PushTargetRow {
  readonly id: string
  readonly userId: string
  readonly sessionId: string | null
  readonly channel: PushChannel
  /** Se valida con el esquema de su canal antes de usarla. */
  readonly credential: unknown
}

/** Manda una carga a esas filas y apunta el resultado de cada una (`recordDelivery`). Nunca lanza. */
export type NoticeSend = (
  targets: readonly PushTargetRow[],
  payload: NoticePayload,
) => Promise<void>

const DIA_MS = 86_400_000
const HORA_MS = 3_600_000

const COLS = {
  id: pushTargets.id,
  userId: pushTargets.userId,
  sessionId: pushTargets.sessionId,
  channel: pushTargets.channel,
  credential: pushTargets.credential,
} as const

// ------------------------------------------------------------------------------------- los aparatos

export interface SavePushTarget {
  readonly userId: string
  readonly sessionId: string | null
  readonly channel: PushChannel
  readonly endpointHash: string
  readonly credential: unknown
  readonly label: string
  /** Zona IANA ya validada, o null (UTC). */
  readonly timeZone: string | null
}

/**
 * `POST /api/me/push-targets` (§13.6): guarda por `endpoint_hash`; si ya existe, la fila pasa a esta cuenta y
 * a esta sesión (un navegador compartido, §13.4). Con más de `PUSH_TARGETS_PER_USER`, sale el de `last_ok_at`
 * (o `created_at`) más viejo. Escribe `users.time_zone`. Devuelve el id.
 */
export async function savePushTarget(db: Database, t: SavePushTarget): Promise<string> {
  return db.transaction(async (tx) => {
    const [fila] = await tx
      .insert(pushTargets)
      .values({
        userId: t.userId,
        sessionId: t.sessionId,
        channel: t.channel,
        endpointHash: t.endpointHash,
        credential: t.credential,
        label: t.label,
      })
      .onConflictDoUpdate({
        target: pushTargets.endpointHash,
        set: {
          userId: t.userId,
          sessionId: t.sessionId,
          credential: t.credential,
          label: t.label,
          failures: 0,
        },
      })
      .returning({ id: pushTargets.id })
    const id = fila!.id
    const sobran = await tx
      .select({ id: pushTargets.id })
      .from(pushTargets)
      .where(and(eq(pushTargets.userId, t.userId), ne(pushTargets.id, id)))
      .orderBy(
        desc(sql`coalesce(${pushTargets.lastOkAt}, ${pushTargets.createdAt})`),
        desc(pushTargets.id),
      )
      .offset(PUSH_TARGETS_PER_USER - 1)
    if (sobran.length > 0)
      await tx.delete(pushTargets).where(
        inArray(
          pushTargets.id,
          sobran.map((s) => s.id),
        ),
      )
    await tx.update(users).set({ timeZone: t.timeZone }).where(eq(users.id, t.userId))
    return id
  })
}

/** Borra un aparato de la cuenta; false si no era suyo o no existe. */
export async function deletePushTarget(db: Database, userId: string, id: string): Promise<boolean> {
  const fuera = await db
    .delete(pushTargets)
    .where(and(eq(pushTargets.userId, userId), eq(pushTargets.id, id)))
    .returning({ id: pushTargets.id })
  return fuera.length > 0
}

/** Borra los aparatos de unas sesiones (cerrar una desde `Devices`, cerrar las otras; I-25). */
export async function deletePushTargetsOfSessions(
  db: Database,
  sessionIds: readonly string[],
): Promise<void> {
  if (sessionIds.length === 0) return
  await db.delete(pushTargets).where(inArray(pushTargets.sessionId, [...sessionIds]))
}

/** Borra aparatos por id (los de las otras sesiones al cambiar la contraseña, 13-l). */
export async function deletePushTargetsById(db: Database, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return
  await db.delete(pushTargets).where(inArray(pushTargets.id, [...ids]))
}

/** Todas las filas de la cuenta, para enviar. */
export function pushTargetsOf(db: Database, userId: string): Promise<PushTargetRow[]> {
  return db.select(COLS).from(pushTargets).where(eq(pushTargets.userId, userId))
}

/**
 * Las borra todas y las devuelve (§5.4, 5-d): quien recupera la contraseña no hereda las suscripciones de un
 * intruso, y `password_changed` se manda con esta copia en memoria.
 */
export function takePushTargets(db: Database, userId: string): Promise<PushTargetRow[]> {
  return db.delete(pushTargets).where(eq(pushTargets.userId, userId)).returning(COLS)
}

/** La lista de `Notifications` y de la exportación: sin la credencial (§10.3, §13.6). */
export async function listPushTargets(
  db: Database,
  userId: string,
): Promise<
  {
    id: string
    sessionId: string | null
    channel: PushChannel
    label: string
    createdAt: Date
    lastOkAt: Date | null
  }[]
> {
  return db
    .select({
      id: pushTargets.id,
      sessionId: pushTargets.sessionId,
      channel: pushTargets.channel,
      label: pushTargets.label,
      createdAt: pushTargets.createdAt,
      lastOkAt: pushTargets.lastOkAt,
    })
    .from(pushTargets)
    .where(eq(pushTargets.userId, userId))
    .orderBy(asc(pushTargets.createdAt))
}

export type DeliveryResult = 'ok' | 'gone' | 'retry'

/**
 * Lo que dejó un envío (§13.6): `ok` pone `last_ok_at` y los fallos a cero; `gone` (404, 410 o un endpoint que
 * ya no pasa la lista) borra la fila; `retry` suma un fallo, y al tercero seguido la borra.
 */
export async function recordDelivery(
  db: Database,
  id: string,
  result: DeliveryResult,
  now: Date = new Date(),
): Promise<void> {
  if (result === 'ok') {
    await db.update(pushTargets).set({ lastOkAt: now, failures: 0 }).where(eq(pushTargets.id, id))
  } else if (result === 'gone') {
    await db.delete(pushTargets).where(eq(pushTargets.id, id))
  } else {
    const [f] = await db
      .update(pushTargets)
      .set({ failures: sql`${pushTargets.failures} + 1` })
      .where(eq(pushTargets.id, id))
      .returning({ failures: pushTargets.failures })
    if (f !== undefined && f.failures >= PUSH_DEAD_AFTER_FAILS)
      await db.delete(pushTargets).where(eq(pushTargets.id, id))
  }
}

// ------------------------------------------------------------------------------------- las preferencias

export interface NoticeSettings {
  readonly prefs: Readonly<Record<string, unknown>>
  readonly timeZone: string | null
}

export async function readNoticeSettings(
  db: Database,
  userId: string,
): Promise<NoticeSettings | null> {
  const [u] = await db
    .select({ prefs: users.noticePrefs, timeZone: users.timeZone })
    .from(users)
    .where(eq(users.id, userId))
  return u ?? null
}

/** `PUT /api/me/notices` y `Turn off these`: guarda solo lo que el jugador cambió (§13.1). */
export async function setNoticePrefs(
  db: Database,
  userId: string,
  patch: Readonly<Partial<Record<NoticeKind, boolean | undefined>>>,
): Promise<void> {
  const limpio = Object.fromEntries(
    Object.entries(patch).filter(
      ([k, v]) => typeof v === 'boolean' && NOTICE_CATALOG[k as NoticeKind]?.switchable === true,
    ),
  )
  if (Object.keys(limpio).length === 0) return
  await db
    .update(users)
    .set({ noticePrefs: sql`${users.noticePrefs} || ${JSON.stringify(limpio)}::jsonb` })
    .where(eq(users.id, userId))
}

// ------------------------------------------------------------------------------------- lo avisado

export type ClaimResult = 'new' | 'dup' | 'capped'

/**
 * EL APUNTE ANTES DE ENVIAR (§13.7). Con el cerrojo del usuario, mira el tope del día local (solo los
 * `capped`, D-43) y escribe `(user, kind, ref)`: `new` si la fila es nueva y cabe, y solo entonces se envía;
 * `capped` si es nueva y no cabe (se apunta igual para no mandarla mañana, 13-d); `dup` si ya estaba.
 */
export async function claimNotice(
  db: Database,
  c: {
    readonly userId: string
    readonly kind: NoticeKind
    readonly ref: string
    readonly now: Date
    readonly timeZone: string | null
  },
): Promise<ClaimResult> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(${LOCK_CLASS.notices}, ${toInt32(hashInt(c.userId))})`,
    )
    let cabe = true
    if (NOTICE_CATALOG[c.kind].capped) {
      const hoy = localClock(c.now, c.timeZone).date
      const capados = NOTICE_KINDS.filter((k) => NOTICE_CATALOG[k].capped)
      const recientes = await tx
        .select({ sentAt: noticeLog.sentAt })
        .from(noticeLog)
        .where(
          and(
            eq(noticeLog.userId, c.userId),
            inArray(noticeLog.kind, capados),
            gt(noticeLog.sentAt, new Date(c.now.getTime() - 26 * HORA_MS)),
          ),
        )
      const delDia = recientes.filter((r) => localClock(r.sentAt, c.timeZone).date === hoy)
      cabe = delDia.length < NOTICE_DAILY_CAP
    }
    const nueva = await tx
      .insert(noticeLog)
      .values({ userId: c.userId, kind: c.kind, ref: c.ref, sentAt: c.now })
      .onConflictDoNothing()
      .returning({ ref: noticeLog.ref })
    if (nueva.length === 0) return 'dup'
    return cabe ? 'new' : 'capped'
  })
}

/** El último apunte de un aviso de un usuario (opcionalmente, de las `ref` que empiezan así). */
async function lastSent(
  db: Database,
  userId: string,
  kind: NoticeKind,
  refPrefix?: string,
): Promise<Date | null> {
  const [f] = await db
    .select({ sentAt: noticeLog.sentAt })
    .from(noticeLog)
    .where(
      and(
        eq(noticeLog.userId, userId),
        eq(noticeLog.kind, kind),
        ...(refPrefix === undefined ? [] : [like(noticeLog.ref, `${refPrefix}%`)]),
      ),
    )
    .orderBy(desc(noticeLog.sentAt))
    .limit(1)
  return f?.sentAt ?? null
}

// ------------------------------------------------------------------------------------- el barrido

export interface SweepDeps {
  /** Quien envía (y apunta el resultado de cada fila). */
  readonly send: NoticeSend
  /** La `PreStageInfo` de una etapa (la API la resuelve como la ruta de etapa); null si no existe. */
  readonly stageInfo: (raceKey: string, stageDay: number) => Promise<PreStageInfo | null>
  /** Lo que dura un día de juego en tiempo real (`TICK_INTERVAL_MINUTES`). */
  readonly msPerGameDay: number
}

export interface SweepSummary {
  users: number
  sent: number
  capped: number
}

/**
 * El día de juego aproximado de un instante pasado: el de hoy menos los días de juego que caben en lo que ha
 * pasado desde entonces. Sirve para «desde el último aviso» sin guardar más que `notice_log.sent_at`.
 */
function gameDayAt(at: Date, now: Date, currentDay: number, msPerGameDay: number): number {
  return currentDay - Math.ceil((now.getTime() - at.getTime()) / msPerGameDay)
}

/**
 * EL BARRIDO DE LOS AVISOS DE JUEGO (§13.7; D-47, X-04, O-11). Por cada usuario con al menos un aparato: con
 * la ausencia viva, solo los `whileAway`; en el silencio, ninguno `quiet`; por cada aviso encendido cuyo
 * disparador se cumple, su `ref`, el tope y el apunte, y solo si la fila es nueva se envía. Idempotente: dos
 * barridos a la vez no duplican porque el apunte va antes del envío. `away_warning` llega con el PR 15.
 */
export async function noticeSweep(db: Database, now: Date, deps: SweepDeps): Promise<SweepSummary> {
  const resumen: SweepSummary = { users: 0, sent: 0, capped: 0 }
  const world = await getCurrentWorld(db)
  const quienes = await db
    .selectDistinct({
      id: users.id,
      timeZone: users.timeZone,
      prefs: users.noticePrefs,
      awaySince: users.awaySince,
      awayUntil: users.awayUntil,
    })
    .from(users)
    .innerJoin(pushTargets, eq(pushTargets.userId, users.id))
  for (const u of quienes) {
    resumen.users += 1
    const reloj = localClock(now, u.timeZone)
    const fuera = isAway(u, now)
    const silencio = isQuietHour(reloj.hour)
    const puede = (k: NoticeKind): boolean => {
      const spec = NOTICE_CATALOG[k]
      if (!isNoticeOn(u.prefs, k)) return false
      if (fuera && !spec.whileAway) return false
      return !(silencio && spec.quiet)
    }
    const avisos: { input: NoticeInput; ref: string }[] = []

    // away_over: llegó `away_until` (en el último día), una vez por ausencia; a las 00:00 locales cae en el
    // silencio y sale a las 8 (§14.3)
    if (
      puede('away_over') &&
      u.awaySince !== null &&
      u.awayUntil !== null &&
      u.awayUntil <= now &&
      now.getTime() - u.awayUntil.getTime() < DIA_MS
    )
      avisos.push({ input: { kind: 'away_over' }, ref: u.awaySince.toISOString() })

    if (world !== null) {
      const [r] = await db
        .select({ id: riders.id, name: riders.name, trainingMode: riders.trainingMode })
        .from(riders)
        .where(eq(riders.userId, u.id))
        .limit(1)
      if (r !== undefined && puede('plan_ending') && r.trainingMode !== 'entrenador') {
        const vivo = await getPlanForDay(db, r.id, world.currentDay)
        if (vivo !== null) {
          const quedan = vivo.plan.startDay + 28 - world.currentDay
          const siguiente = await getPlanForDay(db, r.id, vivo.plan.startDay + 28)
          if (quedan >= 1 && quedan <= PLAN_ENDING_GAME_DAYS && siguiente === null)
            avisos.push({
              input: { kind: 'plan_ending', riderName: r.name },
              ref: `${r.id}:${vivo.plan.startDay}`,
            })
        }
      }
      if (r !== undefined && puede('offer_received')) {
        const ultimo = await lastSent(db, u.id, 'offer_received')
        const desde = Math.max(
          gameDayAt(ultimo ?? new Date(0), now, world.currentDay, deps.msPerGameDay),
          gameDayAt(new Date(now.getTime() - DIA_MS), now, world.currentDay, deps.msPerGameDay),
        )
        const [n] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(offers)
          .where(
            and(
              eq(offers.riderId, r.id),
              eq(offers.status, 'pendiente'),
              gt(offers.createdDay, desde),
            ),
          )
        if ((n?.n ?? 0) > 0)
          avisos.push({
            input: { kind: 'offer_received', riderName: r.name, offers: n!.n },
            ref: reloj.date,
          })
      }

      // Las etapas: el velo de quien mira, el mismo que pinta `Ready to watch` (§13.1). Solo se calcula si
      // hay algo que preguntarle: la franja del resumen sin resumen hoy, o `stage_ready` encendido. Las
      // carreras seguidas salen del propio horizonte (motivo `follow`): lo visto solo lo lee `horizon.ts` (D-38).
      const franja =
        puede('stage_digest') &&
        reloj.hour >= STAGE_DIGEST_HOUR &&
        (await lastSent(db, u.id, 'stage_digest', reloj.date)) === null
      if (franja || puede('stage_ready')) {
        const h = await computeHorizon(db, { userId: u.id, readOnly: true }, world)
        const seguidas = puede('stage_ready')
          ? [...new Set(h.veil.filter((v) => v.reason === 'follow').map((v) => v.raceKey))]
          : []
        const listo = async (raceKey: string, stageDay: number, own: boolean) => {
          const info = await deps.stageInfo(raceKey, stageDay)
          return info === null
            ? null
            : ({
                info,
                raceId: parseRaceKey(raceKey).raceId,
                ownRiderOnStartlist: own,
              } satisfies ReadyStage)
        }
        if (franja) {
          // solo las veladas desde el último resumen (13-c)
          const ultimo = await lastSent(db, u.id, 'stage_digest')
          const desde =
            ultimo === null
              ? Number.NEGATIVE_INFINITY
              : gameDayAt(ultimo, now, world.currentDay, deps.msPerGameDay)
          const etapas: ReadyStage[] = []
          for (const v of h.veil)
            if (v.reason === 'own_rider' && v.gameDay > desde) {
              const s = await listo(v.raceKey, v.stageDay, true)
              if (s !== null) etapas.push(s)
            }
          if (etapas.length > 0)
            avisos.push({ input: { kind: 'stage_digest', stages: etapas }, ref: reloj.date })
        }
        for (const raceKey of seguidas) {
          // la última velada de cada carrera seguida, y como mucho una cada STAGE_READY_EVERY_H
          const dias = h.veil.filter((v) => v.raceKey === raceKey).map((v) => v.stageDay)
          if (dias.length === 0) continue
          const ultimo = await lastSent(db, u.id, 'stage_ready', `${raceKey}:`)
          if (ultimo !== null && now.getTime() - ultimo.getTime() < STAGE_READY_EVERY_H * HORA_MS)
            continue
          const dia = Math.max(...dias)
          const s = await listo(
            raceKey,
            dia,
            h.veil.some((v) => v.raceKey === raceKey && v.reason === 'own_rider'),
          )
          if (s !== null)
            avisos.push({ input: { kind: 'stage_ready', stage: s }, ref: `${raceKey}:${dia}` })
        }
      }
    }

    if (avisos.length === 0) continue
    const destinos = await pushTargetsOf(db, u.id)
    for (const a of avisos) {
      const r = await claimNotice(db, {
        userId: u.id,
        kind: a.input.kind,
        ref: a.ref,
        now,
        timeZone: u.timeZone,
      })
      if (r === 'capped') resumen.capped += 1
      if (r !== 'new') continue
      await deps.send(destinos, noticePayload(a.input))
      resumen.sent += 1
    }
  }
  return resumen
}
