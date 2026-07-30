import { describe, expect, it } from 'vitest'
import { API_PACKAGE } from './index.js'

describe('api: esqueleto', () => {
  it('se identifica', () => {
    expect(API_PACKAGE).toBe('@cyclingstar/api')
  })
})
