import { type Ledger, type LedgerEntry, ledgerResponseSchema } from '@cyclingstar/shared'
import { request } from './request'

export type { Ledger, LedgerEntry }

export async function fetchLedger(): Promise<Ledger> {
  return request('/api/riders/me/ledger', ledgerResponseSchema, {
    errorMessage: 'Could not load your finances.',
  })
}
