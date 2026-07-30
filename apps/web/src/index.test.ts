import { describe, expect, it } from 'vitest'
import { WEB_PACKAGE } from './index.js'

describe('web: esqueleto', () => {
  it('se identifica', () => {
    expect(WEB_PACKAGE).toBe('@cyclingstar/web')
  })
})
