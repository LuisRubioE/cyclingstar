/**
 * LAS TRES REINAS CONGELADAS POR FORMA (docs/generador.md §13.5, decisión 33; paso 9 de §15.11). En
 * la entrada «mundo y radio» de la matriz de `ci.yml` (regla 4 de §15.1).
 *
 * El test es el de §13.5 entero: cada motivo válido en su firma, Σ km, `kind` reina, el `finalKind`
 * del literal, el km, el D+ dentro del rango del literal, V8b siempre, `verify` a `null` o a V8 (solo
 * V8a puede saltar: ninguna es reina de verdad por V8a y congelarlas por forma es conservarla) y la
 * huella sellada, para que `REAL_QUEENS` sea una lista cerrada también por forma (decisión 33).
 */
import { describe, expect, it } from 'vitest'
import { ARCH } from '../constants.js'
import { finalKindOf, profileKm } from '../routes/finalKind.js'
import { dPlusDe, subidaLejanaShare } from '../routes/grammar/geometry.js'
import { validateMotif } from '../routes/grammar/motifs.js'
import { colocarPlantilla } from '../routes/grammar/place.js'
import { verify } from '../routes/grammar/veto.js'
import { huellaFNV } from '../routes/profileGen.js'
import { stageKindOf } from '../routes/stageKind.js'
import { FROZEN_QUEENS, frozenGeo, frozenProfile, frozenRequest } from './frozenSkeletons.js'
import { REAL_QUEENS, findStage } from './realQueens.js'

describe('las tres reinas congeladas por forma (decisión 33)', () => {
  it('son Colombia e5, Guatemala e9 y Táchira e6, en ese orden, y están en REAL_QUEENS', () => {
    expect(FROZEN_QUEENS.map((q) => `${q.raceId}:${q.stageIndex}`)).toEqual([
      'race-colombia:5',
      'race-guatemala:9',
      'race-tachira:6',
    ])
    expect(REAL_QUEENS).toHaveLength(9)
    for (const q of FROZEN_QUEENS) {
      expect(REAL_QUEENS.some((r) => r.raceId === q.raceId && r.stageIndex === q.stageIndex)).toBe(
        true,
      )
      expect(q.why.startsWith('CONGELADA POR FORMA (E1, decisión 33;')).toBe(true)
    }
  })

  for (const q of FROZEN_QUEENS) {
    it(`${q.raceId} e${q.stageIndex}: el esqueleto congelado rinde lo que su why describe`, () => {
      for (const m of q.motivos)
        expect(validateMotif(m, frozenGeo(q)), `${m.kind} ${m.km}`).toBeNull()
      expect(q.motivos.reduce((a, m) => a + m.km, 0)).toBeCloseTo(q.km, 1)
      expect(q.skeleton.canonico).toBe(q.motivos)
      const profile = frozenProfile(q)
      expect(stageKindOf(profile, false).kind).toBe('reina')
      expect(finalKindOf(profile)).toBe(q.skeleton.finalKind)
      expect(profileKm(profile)).toBeCloseTo(q.km, 1)
      const d = dPlusDe(profile)
      expect(d).toBeGreaterThanOrEqual(q.skeleton.dPlus[0])
      expect(d).toBeLessThanOrEqual(q.skeleton.dPlus[1])
      expect(subidaLejanaShare(profile)).toBeGreaterThanOrEqual(ARCH.reina.subidaLejanaMin) // V8b siempre
      const v = verify(
        profile,
        q.skeleton,
        frozenRequest(q),
        q.motivos,
        q.km,
        colocarPlantilla(q.motivos),
      )
      expect([null, 'V8'], v?.detalle).toContain(v?.id ?? null) // solo V8a puede saltar (§13.5)
      expect(huellaFNV(profile)).toBe(q.huellaFNV)
    })
  }

  it('findStage devuelve la congelada, no la etapa que dibuja el calendario', () => {
    for (const q of FROZEN_QUEENS) {
      const { stage } = findStage(q.raceId, q.stageIndex)
      expect(huellaFNV(stage.profile)).toBe(q.huellaFNV)
      expect(stage.kind).toBe('reina')
      // …salvo cuando el banco pregunta qué trae el calendario (`calendarQueens`).
      const delCalendario = findStage(q.raceId, q.stageIndex, undefined, false).stage
      expect(huellaFNV(delCalendario.profile)).not.toBe(q.huellaFNV)
    }
  })
})
