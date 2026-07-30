import { describe, expect, it } from 'vitest'
import { DB_PACKAGE } from './index.js'

describe('db: esqueleto', () => {
  it('se identifica', () => {
    expect(DB_PACKAGE).toBe('@cyclingstar/db')
  })
})
