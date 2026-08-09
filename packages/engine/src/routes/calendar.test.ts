import { describe, expect, it } from 'vitest'
import { RACE_CLASSES } from './uci.js'
import { SEASON_CALENDAR, stageMix } from './calendar.js'
import { RACE_EDITIONS } from './editions.js'
import type { RouteTerrain } from './featureProfile.js'
import type { StageSpec } from './calendar.js'

describe('engine: calendario de temporada (SPEC 8, Paso 34)', () => {
  it('incluye el WorldTour real (36) y 4 campeonatos por país (133 países), con id único', () => {
    const wt = SEASON_CALENDAR.filter((r) => r.level === 'WT')
    const nc = SEASON_CALENDAR.filter((r) => r.championshipCountry)
    expect(wt).toHaveLength(36) // 33 de un día/semana + 3 grandes vueltas
    expect(nc).toHaveLength(133 * 4) // Elite/Sub-23 × Crono/Ruta
    const ids = SEASON_CALENDAR.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('tiene circuitos continentales con región en los cinco continentes', () => {
    const regional = SEASON_CALENDAR.filter((r) => r.region != null)
    const continents = new Set(regional.map((r) => r.region))
    expect(continents).toEqual(new Set(['Europe', 'Asia', 'Africa', 'America', 'Oceania']))
    // Todas las regionales son del circuito continental (.1/.2).
    for (const r of regional) expect(['1', '2']).toContain(r.raceClass)
  })

  it('el WorldTour arranca en las fechas reales (día del año)', () => {
    const byId = new Map(SEASON_CALENDAR.map((r) => [r.id, r]))
    // Ene 20 → 20; monumentos y grandes vueltas en su fecha real.
    expect(byId.get('race-down-under')?.startDay).toBe(20)
    expect(byId.get('race-flanders')?.startDay).toBe(31 + 28 + 31 + 5) // 5 abr
    expect(byId.get('race-italy')?.startDay).toBe(31 + 28 + 31 + 30 + 8) // 8 may
    expect(byId.get('race-france')?.startDay).toBe(181 + 4) // 4 jul
    expect(byId.get('race-lombardy')?.startDay).toBe(273 + 10) // 10 oct
  })

  it('cada carrera lleva una clase de carrera coherente con su nivel', () => {
    for (const race of SEASON_CALENDAR) {
      expect(RACE_CLASSES).toContain(race.raceClass)
      if (race.championshipCountry) expect(race.raceClass).toBe('NC')
      else if (race.level === 'WT') expect(race.raceClass).toBe('WT')
      else if (race.level === 'PRS') expect(race.raceClass).toBe('Pro')
    }
  })

  it('cada campeonato nacional es de un día, con país, categoría y sin inscripción por división', () => {
    const nc = SEASON_CALENDAR.filter((r) => r.championshipCountry)
    for (const race of nc) {
      expect(race.format).toBe('un-dia')
      expect(race.championshipCountry).toMatch(/^[A-Z]{2}$/)
      expect(['elite', 'u23']).toContain(race.championshipCategory)
      expect(race.openTo).toHaveLength(0)
    }
    // 4 campeonatos por país (Elite/Sub-23 × Crono/Ruta), todos en la misma semana.
    const byCountry = new Map<string, number>()
    for (const r of nc)
      byCountry.set(r.championshipCountry!, (byCountry.get(r.championshipCountry!) ?? 0) + 1)
    for (const n of byCountry.values()) expect(n).toBe(4)
  })

  it('todas arrancan en días de competición (5..315) y están ordenadas por día', () => {
    for (const race of SEASON_CALENDAR) {
      expect(race.startDay).toBeGreaterThanOrEqual(5)
      expect(race.startDay).toBeLessThanOrEqual(315)
    }
    const days = SEASON_CALENDAR.map((r) => r.startDay)
    expect([...days].sort((a, b) => a - b)).toEqual(days)
  })

  it('incluye las tres grandes vueltas con 21 etapas y sus descansos reales (Giro 2026: 3)', () => {
    const grandTours = SEASON_CALENDAR.filter((r) => r.format === 'gran-vuelta')
    expect(grandTours.map((r) => r.id).sort()).toEqual(['race-france', 'race-italy', 'race-spain'])
    for (const gt of grandTours) {
      expect(gt.stages).toHaveLength(21)
      // Tour y Vuelta 2026: 2 descansos; Giro 2026: 3 (salida desde Bulgaria).
      const expected = gt.id === 'race-italy' ? 3 : 2
      expect(gt.restAfter).toHaveLength(expected)
    }
  })

  it('Race France (edición 2026) tiene dos cronos y perfiles variados', () => {
    const france = SEASON_CALENDAR.find((r) => r.id === 'race-france')
    expect(france).toBeDefined()
    expect(france?.stages).toHaveLength(21)
    const kinds = new Set(france?.stages.map((s) => s.kind))
    expect(kinds).toContain('llana')
    expect(kinds).toContain('reina')
    expect(kinds).toContain('cri')
    // Tour 2026: crono por equipos (etapa 1) + crono individual (etapa 16) = 2 contrarreloj.
    expect(france?.stages.filter((s) => s.timeTrial)).toHaveLength(2)
  })

  it('cada etapa tiene un perfil con segmentos de km positivos', () => {
    for (const race of SEASON_CALENDAR) {
      expect(race.stages.length).toBeGreaterThan(0)
      for (const stage of race.stages) {
        expect(stage.profile.segments.length).toBeGreaterThan(0)
        for (const seg of stage.profile.segments) {
          expect(seg.km).toBeGreaterThan(0)
        }
        // Los banners caen dentro del recorrido.
        const total = stage.profile.segments.reduce((sum, s) => sum + s.km, 0)
        for (const banner of stage.profile.banners ?? []) {
          expect(banner.km).toBeGreaterThanOrEqual(0)
          expect(banner.km).toBeLessThanOrEqual(Math.round(total))
        }
      }
    }
  })

  it('las reglas de inscripción respetan la jerarquía de divisiones', () => {
    // Los campeonatos nacionales tienen pelotón individual (openTo vacío): fuera de esta regla.
    for (const race of SEASON_CALENDAR.filter((r) => !r.championshipCountry)) {
      if (race.level === 'WT') expect(race.openTo).toEqual(['WT', 'PRS'])
      if (race.level === 'PRS') expect(race.openTo).toEqual(['WT', 'PRS', 'CON'])
      if (race.level === 'CON') expect(race.openTo).toEqual(['PRS', 'CON'])
    }
  })

  it('las carreras globales (WT/Pro) y los campeonatos llevan país; el NC coincide con su país', () => {
    for (const race of SEASON_CALENDAR) {
      if (race.championshipCountry) {
        expect(race.country).toBe(race.championshipCountry)
      } else if (race.level === 'WT' || race.level === 'PRS') {
        expect(race.country).toMatch(/^[A-Z]{2}$/)
      }
    }
    // Las grandes vueltas en su país real.
    const byId = new Map(SEASON_CALENDAR.map((r) => [r.id, r]))
    expect(byId.get('race-france')?.country).toBe('FR')
    expect(byId.get('race-italy')?.country).toBe('IT')
    expect(byId.get('race-spain')?.country).toBe('ES')
  })

  it('TODAS las carreras llevan país (base del sistema de viajes)', () => {
    for (const race of SEASON_CALENDAR) {
      expect(race.country).toMatch(/^[A-Z]{2}$/)
    }
  })

  it('las carreras con recorrido REAL no pasan por la mezcla: sus km son los de la edición', () => {
    // El generador de composición solo compone carreras de autoría. Las ediciones verificadas
    // (grandes vueltas, Volta a Portugal…) mandan su distancia etapa a etapa, y esto lo vigila.
    for (const [id, edition] of Object.entries(RACE_EDITIONS)) {
      const race = SEASON_CALENDAR.find((r) => r.id === id)
      if (!race) continue
      expect(race.stages).toHaveLength(edition.stages.length)
      race.stages.forEach((stage, i) => {
        const km = stage.profile.segments.reduce((a, s) => a + s.km, 0)
        expect(Math.round(km)).toBe(edition.stages[i]!.km)
      })
    }
  })

  it('cubre los tres niveles y los tres formatos', () => {
    const levels = new Set(SEASON_CALENDAR.map((r) => r.level))
    expect(levels).toEqual(new Set(['WT', 'PRS', 'CON']))
    const formats = new Set(SEASON_CALENDAR.map((r) => r.format))
    expect(formats).toEqual(new Set(['gran-vuelta', 'una-semana', 'un-dia']))
  })
})

/**
 * Composición de una vuelta por etapas GENERADA (docs/balance.md, «v10 — Composición y caza»). Lo
 * que se prueba no son los sorteos —eso es azar sembrado— sino las GARANTÍAS: que una vuelta corta
 * pueda llevar crono (antes era imposible), que una vuelta llana no sea una fila de sprints, y que
 * ninguna se quede sin nada con que hacer la general.
 */
describe('engine: composición de una vuelta por etapas (stageMix)', () => {
  const TERRAINS: RouteTerrain[] = ['flat', 'hilly', 'mountain']
  const seeds = Array.from({ length: 120 }, (_, i) => `mix-test-${i}`)
  const isItt = (s: StageSpec): boolean => s.timeTrial === true
  const isUphill = (s: StageSpec): boolean =>
    s.label === 'Uphill finish' || s.label === 'Summit finish'
  const isClimbing = (s: StageSpec): boolean => !isItt(s) && s.label !== 'Flat'

  it('una vuelta de 5 etapas PUEDE llevar crono (antes hacían falta 6)', () => {
    const withItt = seeds.filter((s) => stageMix(5, 'hilly', s).some(isItt))
    expect(withItt.length).toBeGreaterThan(0)
  })

  it('una vuelta LLANA de 4+ etapas lleva SIEMPRE crono: es su única general', () => {
    // Es la exclusión que dejaba a `race-sharjah` sin nada: `terrain !== 'flat'` la prohibía.
    for (const n of [4, 5, 6, 7, 21]) {
      for (const seed of seeds) {
        expect(stageMix(n, 'flat', seed).some(isItt)).toBe(true)
      }
    }
  })

  it('cinco etapas llanas NO son cinco finales al sprint', () => {
    for (const seed of seeds) {
      const mix = stageMix(5, 'flat', seed)
      // Al menos dos etapas con puertos (lo que tenía el Tour de Sharjah real)…
      expect(mix.filter(isClimbing).length).toBeGreaterThanOrEqual(2)
      // …y al menos una que muere arriba: no todas pueden acabar en llano.
      expect(mix.some(isUphill)).toBe(true)
    }
  })

  it('ninguna vuelta generada se queda sin crono NI final en alto', () => {
    for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 21]) {
      for (const terrain of TERRAINS) {
        for (const seed of seeds) {
          const mix = stageMix(n, terrain, seed)
          expect(mix.some((s) => isItt(s) || isUphill(s))).toBe(true)
        }
      }
    }
  })

  it('la primera etapa es siempre llana y nunca es la crono', () => {
    for (const n of [3, 5, 7, 21]) {
      for (const terrain of TERRAINS) {
        for (const seed of seeds) {
          const first = stageMix(n, terrain, seed)[0]!
          expect(first.timeTrial).toBeUndefined()
          expect(first.label).toBe('Flat')
        }
      }
    }
  })

  it('la última etapa PUEDE ser decisiva, y también puede ser el paseo al sprint', () => {
    const last = (n: number, t: RouteTerrain, seed: string): StageSpec => {
      const mix = stageMix(n, t, seed)
      return mix[mix.length - 1]!
    }
    // En terreno llano manda el final al sprint, pero no siempre: antes era SIEMPRE llana.
    const flatLast = seeds.map((s) => last(5, 'flat', s))
    expect(flatLast.filter((s) => s.label === 'Flat').length).toBeGreaterThan(0)
    expect(flatLast.filter(isUphill).length).toBeGreaterThan(0)
    // Y en montaña casi todas cierran arriba.
    const mtnLast = seeds.map((s) => last(5, 'mountain', s))
    expect(mtnLast.filter(isUphill).length).toBeGreaterThan(seeds.length / 2)
  })

  it('es determinista: la misma carrera compone siempre la misma vuelta', () => {
    const a = stageMix(7, 'hilly', 'race-x')
    const b = stageMix(7, 'hilly', 'race-x')
    expect(a.map((s) => `${s.label}|${s.profile.segments.length}`)).toEqual(
      b.map((s) => `${s.label}|${s.profile.segments.length}`),
    )
    // …y dos carreras distintas no componen la misma vuelta.
    const c = stageMix(7, 'hilly', 'race-y')
    expect(a.map((s) => s.label)).not.toEqual(c.map((s) => s.label))
  })

  it('el caso del dueño: race-sharjah tiene crono y final en alto', () => {
    const race = SEASON_CALENDAR.find((r) => r.id === 'race-sharjah')
    expect(race).toBeDefined()
    expect(race!.stages.some((s) => s.timeTrial)).toBe(true)
    expect(
      race!.stages.some((s) => s.label === 'Uphill finish' || s.label === 'Summit finish'),
    ).toBe(true)
  })

  it('una etapa con final en alto termina cuesta arriba de verdad', () => {
    // La garantía de fondo del tipo de etapa nuevo: el último km sube. Si acabara en llano, el
    // modelo de final (§12) volvería a resolverla al sprint, que es justo lo que se quería evitar.
    const mix = stageMix(5, 'flat', 'race-sharjah')
    const uphill = mix.find((s) => s.label === 'Uphill finish')
    expect(uphill).toBeDefined()
    const last = uphill!.profile.segments[uphill!.profile.segments.length - 1]!
    expect(last.tipo).toBe('puerto')
  })
})
