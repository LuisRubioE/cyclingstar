import type { NewsData, NewsKind } from '@cyclingstar/engine'
import { renderNews } from '@cyclingstar/engine'
import { and, desc, eq, or } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { Database } from './client.js'
import { news, riders, teams } from './schema.js'

/**
 * Feed de noticias (SPEC, Paso 39). El generador templado del motor redacta el titular; aquí se
 * persiste con su ámbito (global o personal). El feed personal incluye también las globales.
 */

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/**
 * Redacta y guarda una noticia. `riderId` es el PROTAGONISTA (siempre que lo haya): permite pintar su
 * bandera, enlazarlo y resaltar en tu feed las noticias sobre TU corredor. `personal` marca las que van
 * dirigidas al jugador (mensajes suyos); una victoria/fichaje/lesión es un titular GLOBAL aunque lleve
 * protagonista, así que se ve en el feed de todos.
 */
export async function emitNews(
  tx: Tx,
  opts: {
    worldId: string
    gameDay: number
    kind: NewsKind
    seed: string
    data: NewsData
    riderId?: string | null
    personal?: boolean
  },
): Promise<void> {
  const text = renderNews(opts.kind, opts.seed, opts.data)
  await tx.insert(news).values({
    worldId: opts.worldId,
    gameDay: opts.gameDay,
    scope: opts.personal ? 'personal' : 'global',
    riderId: opts.riderId ?? null,
    kind: opts.kind,
    text,
  })
}

export interface NewsItem {
  gameDay: number
  kind: string
  text: string
  /** Va sobre el corredor del jugador (o es un mensaje suyo): se resalta en su feed. */
  personal: boolean
  /** Protagonista, para pintar su bandera y enlazarlo (null si el titular no tiene corredor). */
  riderId: string | null
  riderName: string | null
  country: string | null
  /** Equipo ACTUAL del protagonista: es lo que permite filtrar el feed por equipo (§3.5). */
  teamId: string | null
  teamName: string | null
}

/** Feed global del mundo, lo más reciente primero. */
export async function getGlobalNews(
  db: Database,
  worldId: string,
  limit = 40,
): Promise<NewsItem[]> {
  const rows = await db
    .select({
      gameDay: news.gameDay,
      kind: news.kind,
      text: news.text,
      riderId: news.riderId,
      riderName: riders.name,
      country: riders.country,
      teamId: riders.teamId,
      teamName: teams.name,
    })
    .from(news)
    .leftJoin(riders, eq(riders.id, news.riderId))
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(eq(news.worldId, worldId))
    .orderBy(desc(news.gameDay), desc(news.createdAt))
    .limit(limit)
  return rows.map((r) => ({ ...r, personal: false }))
}

/**
 * Noticias de un equipo (#16): titulares cuyo protagonista corre hoy en el equipo (victorias de
 * etapa, generales, fugas de sus corredores…). Sin columna nueva: se deriva del enlace corredor.
 */
export async function getTeamNews(db: Database, teamId: string, limit = 15): Promise<NewsItem[]> {
  const rows = await db
    .select({
      gameDay: news.gameDay,
      kind: news.kind,
      text: news.text,
      riderId: news.riderId,
      riderName: riders.name,
      country: riders.country,
      teamId: riders.teamId,
      teamName: teams.name,
    })
    .from(news)
    .innerJoin(riders, eq(riders.id, news.riderId))
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(eq(riders.teamId, teamId))
    .orderBy(desc(news.gameDay), desc(news.createdAt))
    .limit(limit)
  return rows.map((r) => ({ ...r, personal: false }))
}

/** Feed personal de un corredor: las globales del mundo más las que van sobre él (resaltadas). */
export async function getRiderNews(
  db: Database,
  worldId: string,
  riderId: string,
  limit = 40,
): Promise<NewsItem[]> {
  const rows = await db
    .select({
      gameDay: news.gameDay,
      kind: news.kind,
      text: news.text,
      scope: news.scope,
      riderId: news.riderId,
      riderName: riders.name,
      country: riders.country,
      teamId: riders.teamId,
      teamName: teams.name,
    })
    .from(news)
    .leftJoin(riders, eq(riders.id, news.riderId))
    .leftJoin(teams, eq(teams.id, riders.teamId))
    .where(and(eq(news.worldId, worldId), or(eq(news.riderId, riderId), eq(news.scope, 'global'))))
    .orderBy(desc(news.gameDay), desc(news.createdAt))
    .limit(limit)
  return rows.map(({ scope, ...r }) => ({
    ...r,
    personal: r.riderId === riderId || scope === 'personal',
  }))
}
