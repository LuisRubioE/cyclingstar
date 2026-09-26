/**
 * EL PRE-REGISTRO Y LAS REINAS GENERADAS (docs/generador.md §13.8; paso 9 de §15.11). En la entrada
 * «mundo y radio» de la matriz de `ci.yml` (regla 4 de §15.1). Es barato: no simula nada.
 */
import { describe, expect, it } from 'vitest'
import { finalKindOf } from '../routes/finalKind.js'
import { GENERATED_QUEENS } from './frozenSkeletons.js'
import { BANDAS_SOBRE_GENERADO, PRE_REGISTRO } from './preRegistro.js'
import { findStage } from './realQueens.js'
import { TARGETS } from './targets.js'

describe('pre-registro (§13.6 punto 2)', () => {
  it('toda banda que lee perfiles generados tiene dirección pre-registrada', () => {
    expect(BANDAS_SOBRE_GENERADO).toHaveLength(20) // la lista literal de §13.6 punto 2
    for (const banda of BANDAS_SOBRE_GENERADO)
      expect(
        PRE_REGISTRO.find((p) => p.banda === banda),
        banda,
      ).toBeDefined()
  })

  it('las 20 son claves de TARGETS y ninguna fila se repite', () => {
    const t = TARGETS as unknown as Record<string, Record<string, unknown>>
    for (const banda of BANDAS_SOBRE_GENERADO) {
      const [grupo, clave] = banda.split('.') as [string, string]
      expect(t[grupo]?.[clave], banda).toBeDefined()
    }
    expect(new Set(PRE_REGISTRO.map((p) => p.banda)).size).toBe(PRE_REGISTRO.length)
  })

  it('GENERATED_QUEENS siguen teniendo la forma con la que se eligieron', () => {
    expect(GENERATED_QUEENS.map((q) => q.finalKind)).toEqual(['alto', 'cima_cerca', 'valle_largo'])
    for (const q of GENERATED_QUEENS) {
      const { stage } = findStage(q.raceId, q.stageIndex)
      expect(stage.routeSource, `${q.raceId} e${q.stageIndex}`).not.toBe('real')
      expect(finalKindOf(stage.profile), `${q.raceId} e${q.stageIndex}`).toBe(q.finalKind)
      expect(stage.arch?.skeleton, `${q.raceId} e${q.stageIndex}`).toBe(q.skeleton)
    }
  })
})
