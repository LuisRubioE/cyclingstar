import { describe, expect, it } from 'vitest' // vitest.config.ts no activa `globals`
import { SEASON_CALENDAR } from './calendar.js'
import { profileKm } from './finalKind.js' // Σ s.km
import { huellaFNV } from './profileGen.js' // FNV-1a de JSON.stringify(profile.segments)
import { GRANDES_VUELTAS, SELLADAS } from './realFingerprint.sealed.js'
import { STAGE_FEATURES } from './stageFeatures.js'

/**
 * LO REAL NO SE MUEVE (docs/generador.md §11.3, decisión 28). Sellado en el paso 1, antes de tocar
 * `profileGen.ts`, y vivo para siempre: las 177 etapas con rasgos reales una a una, y la estructura
 * de las tres grandes vueltas con la huella de perfil de sus etapas reales.
 */
describe('lo real no se mueve', () => {
  it('las 177 etapas con rasgos tienen la huella sellada', () => {
    const vistas: string[] = []
    for (const race of SEASON_CALENDAR) {
      for (const stage of race.stages) {
        const hit = STAGE_FEATURES[race.id]?.[stage.index - 1] // un día: índice 0; edición: índice i
        if (!hit) continue
        const key = `${race.id}:${stage.index}`
        vistas.push(key)
        const s = SELLADAS[key]
        expect(s, key).toBeDefined()
        expect(stage.profile.segments.length, key).toBe(s!.nSegmentos)
        expect(profileKm(stage.profile), key).toBeCloseTo(s!.km, 1)
        expect(huellaFNV(stage.profile), key).toBe(s!.huella)
      }
    }
    expect(vistas.length).toBe(177)
    expect(Object.keys(SELLADAS).length).toBe(177)
  })

  it('las tres grandes vueltas conservan estructura, y perfil en sus etapas reales', () => {
    for (const [id, gv] of Object.entries(GRANDES_VUELTAS)) {
      const race = SEASON_CALENDAR.find((r) => r.id === id)!
      expect(race.stages.length).toBe(21)
      expect(race.restAfter).toEqual(gv.restAfter)
      race.stages.forEach((st, i) => {
        const e = gv.etapas[i]!
        expect([st.kind, st.label, st.timeTrial ?? false, profileKm(st.profile)]).toEqual([
          e.kind,
          e.label,
          e.timeTrial,
          e.km,
        ])
        if (e.huella !== null) expect(huellaFNV(st.profile), `${id}:${i + 1}`).toBe(e.huella)
      })
    }
  })
})
