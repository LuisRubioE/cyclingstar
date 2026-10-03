import { getTableName } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { gameState, stageTimelines, tickLog, users, worlds } from './schema.js'

describe('db: esquema fundacional', () => {
  it('define las 4 tablas del Paso 6 con sus nombres del SPEC 11', () => {
    expect(getTableName(worlds)).toBe('worlds')
    expect(getTableName(users)).toBe('users')
    expect(getTableName(gameState)).toBe('game_state')
    expect(getTableName(tickLog)).toBe('tick_log')
  })

  it('la línea temporal de cada etapa vive en stage_timelines (E2, §13.3; la 0047)', () => {
    expect(getTableName(stageTimelines)).toBe('stage_timelines')
  })
})
