import { type NewsItem, newsResponseSchema } from '@cyclingstar/shared'
import { request } from './request'

export type { NewsItem }

export async function fetchNews(): Promise<NewsItem[]> {
  const data = await request('/api/news', newsResponseSchema, {
    errorMessage: 'Could not load the news feed.',
  })
  return data.news
}
