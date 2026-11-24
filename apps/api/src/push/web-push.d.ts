/**
 * La parte de `web-push` (4.0.0, un módulo ES sin tipos propios) que usa `deliver.ts` (docs/cuenta.md §13.6),
 * como `ai/src/pvp/web-push.d.ts` de `twilightstruggle`.
 */
declare module 'web-push' {
  export interface PushSubscription {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }
  export interface RequestOptions {
    vapidDetails?: { subject: string; publicKey: string; privateKey: string }
    TTL?: number
    urgency?: 'very-low' | 'low' | 'normal' | 'high'
    topic?: string
    timeout?: number
    headers?: Record<string, string>
  }
  export interface SendResult {
    statusCode: number
    body: string
    headers: Record<string, string>
  }
  export class WebPushError extends Error {
    statusCode: number
    headers: Record<string, string>
    body: string
    endpoint: string
  }
  export function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer | null,
    options?: RequestOptions,
  ): Promise<SendResult>
  export function generateVAPIDKeys(): { publicKey: string; privateKey: string }
}
