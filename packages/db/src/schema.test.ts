import type { SpoilerScope } from '@cyclingstar/shared'
import { getTableColumns, getTableName } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { BIB_STYLES } from '@cyclingstar/shared'
import {
  gameState,
  kitSetByEnum,
  raceWatch,
  spoilerScopeEnum,
  stageTimelines,
  teamKits,
  teams,
  tickLog,
  users,
  worlds,
} from './schema.js'

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

  it('lo visto vive en race_watch (E2, §13.4; la 0048)', () => {
    expect(getTableName(raceWatch)).toBe('race_watch')
  })

  it('la semilla del dibujo ya no está en el esquema, y la identidad sí (E3, §8.9; 19e): la base la guarda hasta la 0053', () => {
    expect(Object.values(getTableColumns(teams)).map((c) => c.name)).not.toContain(
      'jersey_style_seed',
    )
    expect(teams.jerseySeed.notNull).toBe(true)
  })

  it('el maillot vive en team_kits, con su historia, y teams lleva el canónico, el culote y el día de dueño (E3, §8.5; la 0052)', () => {
    expect(getTableName(teamKits)).toBe('team_kits')
    expect([...kitSetByEnum.enumValues]).toEqual(['system', 'manager', 'sponsor', 'moderator'])
    expect(teams.bib.notNull).toBe(true)
    expect(teams.bib.default).toBe('black')
    expect(BIB_STYLES).toContain(teams.bib.default)
    expect(teams.kitCanonical.notNull).toBe(false)
    expect(teams.managedSinceDay.notNull).toBe(false)
  })

  /**
   * EL ALCANCE DEL VELO, ATADO A SU TIPO EN LOS DOS SENTIDOS (docs/retransmision.md §13.10, punto 4):
   * `users.spoiler_scope` y `SpoilerScope` de `shared` (la web y las rutas lo validan con él). Un
   * valor nuevo en uno solo no compila; el enum de Postgres solo se amplía (regla 6 de §13.1).
   */
  it('spoilerScopeEnum y SpoilerScope son el mismo conjunto de valores (al compilar y al correr)', () => {
    type DelEnum = (typeof spoilerScopeEnum.enumValues)[number]
    const delEnumAlTipo: SpoilerScope = null as unknown as DelEnum
    const delTipoAlEnum: DelEnum = null as unknown as SpoilerScope
    expect(delEnumAlTipo).toBe(delTipoAlEnum)
    const todos: Record<SpoilerScope, true> = { guarded: true, own_only: true, off: true }
    expect([...spoilerScopeEnum.enumValues].sort()).toEqual(Object.keys(todos).sort())
  })
})
