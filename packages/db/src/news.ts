import type { NewsData, NewsKind } from '@cyclingstar/engine'
import { renderNews } from '@cyclingstar/engine'
import { and, desc, eq, or } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { Database } from './client.js'
import { news } from './schema.js'

/**
 * Feed de noticias (SPEC, Paso 39). El generador templado del motor redacta el titular; aquí se
 * persiste con su ámbito (global o personal). El feed personal incluye también las globales.
 */

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/** Redacta y guarda una noticia. Si `riderId` va, es personal de ese corredor; si no, global. */
export async function emitNews(
  tx: Tx,
  opts: {
    worldId: string
    gameDay: number
    kind: NewsKind
    seed: string
    data: NewsData
    riderId?: string | null
  },
): Promise<void> {
  const text = renderNews(opts.kind, opts.seed, opts.data)
  await tx.insert(news).values({
    worldId: opts.worldId,
    gameDay: opts.gameDay,
    scope: opts.riderId ? 'personal' : 'global',
    riderId: opts.riderId ?? null,
    kind: opts.kind,
    text,
  })
}

export interface NewsItem {
  gameDay: number
  kind: string
  text: string
  personal: boolean
}

/** Feed global del mundo, lo más reciente primero. */
export async function getGlobalNews(
  db: Database,
  worldId: string,
  limit = 40,
): Promise<NewsItem[]> {
  const rows = await db
    .select({ gameDay: news.gameDay, kind: news.kind, text: news.text, scope: news.scope })
    .from(news)
    .where(eq(news.worldId, worldId))
    .orderBy(desc(news.gameDay), desc(news.createdAt))
    .limit(limit)
  return rows.map((r) => ({ ...r, personal: r.scope === 'personal' }))
}

/** Feed personal de un corredor: sus noticias más las globales del mundo. */
export async function getRiderNews(
  db: Database,
  worldId: string,
  riderId: string,
  limit = 40,
): Promise<NewsItem[]> {
  const rows = await db
    .select({ gameDay: news.gameDay, kind: news.kind, text: news.text, scope: news.scope })
    .from(news)
    .where(and(eq(news.worldId, worldId), or(eq(news.riderId, riderId), eq(news.scope, 'global'))))
    .orderBy(desc(news.gameDay), desc(news.createdAt))
    .limit(limit)
  return rows.map((r) => ({ ...r, personal: r.scope === 'personal' }))
}
