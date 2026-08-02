import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm'
import type { Database } from './client.js'
import { gameState, riders, teams, tickLog, users, worlds } from './schema.js'

/**
 * Salud del mundo para el panel de admin (#84): día/temporada, censo de corredores y equipos,
 * cuentas y los últimos ticks. Solo lectura; lo consume la ruta protegida por ADMIN_TOKEN.
 */

export interface TickLogRow {
  startedAt: string
  daysProcessed: number
  durationMs: number
  ok: boolean
  notes: string | null
}

export interface WorldHealth {
  currentDay: number
  season: number
  worldCreatedAt: string | null
  riders: { active: number; human: number; bots: number; retired: number; freeAgents: number }
  teams: { total: number; human: number; wt: number; prs: number; con: number }
  users: number
  recentTicks: TickLogRow[]
}

async function count(
  db: Database,
  table: typeof riders | typeof teams | typeof users,
  where?: ReturnType<typeof and>,
): Promise<number> {
  const q = db.select({ n: sql<number>`count(*)::int` }).from(table)
  const rows = where ? await q.where(where) : await q
  return rows[0]?.n ?? 0
}

/** Estado agregado del mundo actual (o valores en cero si aún no hay génesis). */
export async function getWorldHealth(db: Database): Promise<WorldHealth> {
  const clockRows = await db
    .select({
      worldId: gameState.worldId,
      currentDay: gameState.currentDay,
      createdAt: worlds.createdAt,
    })
    .from(gameState)
    .innerJoin(worlds, eq(worlds.id, gameState.worldId))
    .limit(1)
  const clock = clockRows[0]

  const recent = await db
    .select({
      startedAt: tickLog.startedAt,
      daysProcessed: tickLog.daysProcessed,
      durationMs: tickLog.durationMs,
      ok: tickLog.ok,
      notes: tickLog.notes,
    })
    .from(tickLog)
    .orderBy(desc(tickLog.startedAt))
    .limit(12)

  if (!clock) {
    return {
      currentDay: 0,
      season: 0,
      worldCreatedAt: null,
      riders: { active: 0, human: 0, bots: 0, retired: 0, freeAgents: 0 },
      teams: { total: 0, human: 0, wt: 0, prs: 0, con: 0 },
      users: 0,
      recentTicks: recent.map((t) => ({ ...t, startedAt: t.startedAt.toISOString() })),
    }
  }

  const w = clock.worldId
  const activeWorld = and(eq(riders.worldId, w), isNull(riders.retiredAt))
  const [active, human, retired, freeAgents, totalTeams, humanTeams, wt, prs, con, userCount] =
    await Promise.all([
      count(db, riders, activeWorld),
      count(db, riders, and(activeWorld, isNotNull(riders.userId))),
      count(db, riders, and(eq(riders.worldId, w), isNotNull(riders.retiredAt))),
      count(db, riders, and(activeWorld, isNull(riders.teamId))),
      count(db, teams, eq(teams.worldId, w)),
      count(db, teams, and(eq(teams.worldId, w), isNotNull(teams.ownerUserId))),
      count(db, teams, and(eq(teams.worldId, w), eq(teams.division, 'WT'))),
      count(db, teams, and(eq(teams.worldId, w), eq(teams.division, 'PRS'))),
      count(db, teams, and(eq(teams.worldId, w), eq(teams.division, 'CON'))),
      count(db, users),
    ])

  return {
    currentDay: clock.currentDay,
    season: Math.floor(clock.currentDay / 364),
    worldCreatedAt: clock.createdAt.toISOString(),
    riders: { active, human, bots: active - human, retired, freeAgents },
    teams: { total: totalTeams, human: humanTeams, wt, prs, con },
    users: userCount,
    recentTicks: recent.map((t) => ({ ...t, startedAt: t.startedAt.toISOString() })),
  }
}
