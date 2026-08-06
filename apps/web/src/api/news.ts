export interface NewsItem {
  gameDay: number
  kind: string
  text: string
  personal: boolean
  /** Protagonista, para pintar su bandera y enlazarlo (null si el titular no tiene corredor). */
  riderId: string | null
  country: string | null
}

export async function fetchNews(): Promise<NewsItem[]> {
  const res = await fetch('/api/news')
  if (!res.ok) throw new Error('Could not load the news feed.')
  return ((await res.json()) as { news: NewsItem[] }).news
}

const KIND_ICON: Record<string, string> = {
  stage_win: '🏆',
  tt_win: '⏱️',
  breakaway_win: '🚀',
  one_day_win: '🏆',
  one_day_tt_win: '⏱️',
  kom: '⛰️',
  gc_win: '👑',
  contract: '✍️',
  injury: '🚑',
  retirement: '👋',
}

export function newsIcon(kind: string): string {
  return KIND_ICON[kind] ?? '📰'
}
