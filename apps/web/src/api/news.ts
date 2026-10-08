import { type NewsItem, newsResponseSchema } from '@cyclingstar/shared'
import { horizonKey } from '../queryClient'
import { request } from './request'

export type { NewsItem }

/**
 * El feed global. Con `diag`, el `?diag=1` del modo diagnóstico (E2, docs/retransmision.md §11.15, 11-h;
 * la API lo acepta desde el 8a y la web lo reenvía desde el 9b): un administrador con sesión lo recibe con
 * el horizonte del mundo, sin marcadores; para cualquier otro la API lo ignora.
 */
export async function fetchNews(opts: { readonly diag?: boolean } = {}): Promise<NewsItem[]> {
  const data = await request(
    `/api/news${opts.diag === true ? '?diag=1' : ''}`,
    newsResponseSchema,
    {
      errorMessage: 'Could not load the news feed.',
    },
  )
  return data.news
}

/** La clave del feed (§10.9): con `diag` y el `rev` del horizonte al final (9b). */
export function newsKey(diag: boolean, rev: string | undefined): readonly unknown[] {
  return horizonKey(['news', diag], rev)
}
