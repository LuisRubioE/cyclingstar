import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION } from './index.js'

describe('engine: esqueleto', () => {
  it('expone una engine_version sellada', () => {
    expect(ENGINE_VERSION).toBe(1)
  })
})
