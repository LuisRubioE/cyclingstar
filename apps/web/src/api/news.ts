export interface NewsItem {
  gameDay: number
  kind: string
  text: string
  personal: boolean
}

export async function fetchNews(): Promise<NewsItem[]> {
  const res = await fetch('/api/news')
  if (!res.ok) throw new Error('Could not load the news feed.')
  return ((await res.json()) as { news: NewsItem[] }).news
}

const KIND_ICON: Record<string, string> = {
  stage_win: '🏆',
  breakaway_win: '🚀',
  kom: '⛰️',
  gc_win: '👑',
  contract: '✍️',
  injury: '🚑',
}

export function newsIcon(kind: string): string {
  return KIND_ICON[kind] ?? '📰'
}
