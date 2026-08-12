/**
 * VALIDACIÓN de los recorridos reales cargados (classicRoutes.ts). Son datos extraídos de fuentes
 * abiertas, así que lo que se comprueba aquí no es la lógica del motor sino la SANIDAD DEL DATO: que
 * cada carrera diga de dónde viene, que sus km cuadren con la distancia oficial, que las cimas vayan
 * en orden y dentro del recorrido, que los sectores de pavé no se pisen, y que el perfil que sale de
 * todo eso pase por el muestreo del motor sin romperse.
 *
 * Si una fuente se corrige o se cambia de edición, estos tests son la red que avisa de que el dato
 * dejó de cuadrar.
 */
import { describe, expect, it } from 'vitest'
import { sampleProfile, stageLengthKm } from '../stage/sample.js'
import { SEASON_CALENDAR } from './calendar.js'
import { CLASSIC_FEATURES, CLASSIC_ROUTE_SOURCES, STAGE_ROUTE_SOURCES } from './classicRoutes.js'
import { RACE_EDITIONS } from './editions.js'
import { buildFeatureProfile } from './featureProfile.js'
import { STAGE_FEATURES } from './stageFeatures.js'

const IDS = Object.keys(CLASSIC_FEATURES)

/** Desnivel positivo acumulado de un perfil, en metros. */
function gainM(segments: readonly { km: number; tramos?: { km: number; g: number }[] }[]): number {
  let gain = 0
  for (const s of segments)
    for (const t of s.tramos ?? []) if (t.g > 0) gain += (t.g / 100) * t.km * 1000
  return gain
}

describe('routes: recorridos reales de las clásicas (dato cargado de fuentes abiertas)', () => {
  it('carga las doce clásicas que tenían fuente', () => {
    // Ocho desde la v4; Strade Bianche entra en la v12, cuando el motor por fin descuelga en el
    // firme roto (docs/motor.md §14) y una carrera cuya única dificultad es el sterrato tiene
    // sentido cargarla; las tres de circuito (Great Ocean, Québec y Montréal) entran con la tanda
    // de perfiles del WorldTour (ver docs/fuentes-recorridos.md).
    expect(IDS).toHaveLength(12)
  })

  it('cada recorrido declara su procedencia: carrera real, edición, artículo y fecha', () => {
    for (const id of IDS) {
      const src = CLASSIC_ROUTE_SOURCES[id]
      expect(src, `falta la fuente de ${id}`).toBeDefined()
      expect(src!.race.length).toBeGreaterThan(3)
      expect(src!.edition).toBeGreaterThanOrEqual(2023)
      // Atribución obligatoria: Wikipedia es CC BY-SA.
      expect(src!.wikipedia ?? '').toMatch(/^https:\/\/[a-z]{2}\.wikipedia\.org\/wiki\//)
      expect(src!.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(src!.notes.length).toBeGreaterThan(0)
    }
  })

  it('los rasgos reales llegan al motor por STAGE_FEATURES', () => {
    for (const id of IDS) expect(STAGE_FEATURES[id]?.[0]).toBe(CLASSIC_FEATURES[id]![0])
  })

  it('la distancia del calendario es la distancia oficial de la edición usada', () => {
    const byId = new Map(SEASON_CALENDAR.map((r) => [r.id, r]))
    for (const id of IDS) {
      const race = byId.get(id)
      expect(race, `${id} no está en el calendario`).toBeDefined()
      expect(race!.stages).toHaveLength(1)
      const km = stageLengthKm(race!.stages[0]!.profile)
      expect(km, `${id}: el recorrido no mide la distancia oficial`).toBeCloseTo(
        CLASSIC_ROUTE_SOURCES[id]!.distanceKm,
        1,
      )
    }
  })

  describe.each(IDS)('%s', (id) => {
    const features = CLASSIC_FEATURES[id]![0]
    const totalKm = CLASSIC_ROUTE_SOURCES[id]!.distanceKm
    const profile = buildFeatureProfile(totalKm, features, id)

    it('los puertos van en orden, dentro del recorrido y con pendiente creíble', () => {
      const climbs = features.climbs ?? []
      let prev = 0
      for (const c of climbs) {
        expect(c.summitKm, `${c.name}: cima fuera de orden`).toBeGreaterThanOrEqual(prev)
        prev = c.summitKm
        expect(c.summitKm).toBeLessThanOrEqual(totalKm)
        expect(c.summitKm - c.lengthKm).toBeGreaterThanOrEqual(0)
        expect(c.lengthKm).toBeGreaterThan(0)
        expect(c.avgGradient).toBeGreaterThan(1)
        expect(c.avgGradient).toBeLessThan(20)
      }
    })

    it('los sectores de pavé no se solapan y caben en el recorrido', () => {
      let end = 0
      for (const s of features.cobbles ?? []) {
        expect(s.startKm, `${s.name}: se solapa con el sector anterior`).toBeGreaterThanOrEqual(end)
        expect(s.lengthKm).toBeGreaterThan(0)
        expect(s.stars).toBeGreaterThanOrEqual(1)
        expect(s.stars).toBeLessThanOrEqual(5)
        end = s.startKm + s.lengthKm
        expect(end).toBeLessThanOrEqual(totalKm)
      }
    })

    it('los sprints intermedios caen dentro del recorrido', () => {
      for (const s of features.sprints ?? []) {
        expect(s.km).toBeGreaterThan(0)
        expect(s.km).toBeLessThan(totalKm)
      }
    })

    it('el perfil mide la distancia oficial y se muestrea sin romperse', () => {
      expect(stageLengthKm(profile)).toBeCloseTo(totalKm, 1)
      const blocks = sampleProfile(profile)
      expect(blocks).toHaveLength(Math.round(totalKm * 10))
      for (const b of blocks) {
        expect(Number.isFinite(b.g)).toBe(true)
        expect(Math.abs(b.g)).toBeLessThan(25)
        expect(b.estrellas).toBeGreaterThanOrEqual(0)
        expect(b.estrellas).toBeLessThanOrEqual(5)
      }
    })

    it('el desnivel queda en rango creíble para una clásica', () => {
      const gain = gainM(profile.segments)
      // Suelo: el perfil tiene que contener AL MENOS el desnivel de los puertos publicados.
      const publicado = (features.climbs ?? []).reduce(
        (acc, c) => acc + (c.avgGradient / 100) * c.lengthKm * 1000,
        0,
      )
      expect(gain).toBeGreaterThanOrEqual(publicado)
      // Techo: 30 m de desnivel por km es ya ritmo de etapa reina; una clásica no lo pasa.
      expect(gain / totalKm).toBeLessThan(30)
      expect(gain / totalKm).toBeGreaterThan(4)
    })

    it('el adoquín declarado llega al recorrido (salvo el que pisa un muro)', () => {
      const declarado = (features.cobbles ?? []).reduce((acc, c) => acc + c.lengthKm, 0)
      const enPerfil = profile.segments
        .filter((s) => s.tipo === 'paves')
        .reduce((acc, s) => acc + s.km, 0)
      // Un sector que cae dentro de un muro se queda como puerto (featureProfile.ts): por eso el
      // umbral no es el 100 %. Lo que no puede pasar es que se pierda un sector entero.
      expect(enPerfil).toBeGreaterThanOrEqual(declarado * 0.88)
      expect(enPerfil).toBeLessThanOrEqual(declarado + 0.2)
    })

    it('cada puerto real deja su cima en el kilómetro real', () => {
      const cimas = (profile.banners ?? []).filter((b) => b.tipo === 'cima').map((b) => b.km)
      expect(cimas).toEqual((features.climbs ?? []).map((c) => Math.round(c.summitKm)))
    })
  })
})

/**
 * Lo mismo, para las CARRERAS POR ETAPAS cargadas de fuente. Aquí el dato tiene un enganche más que
 * vigilar: los rasgos de la etapa i tienen que caber en la etapa i de `editions.ts`, que es la que
 * pone la distancia. Si alguien cambia una y no la otra, un puerto se sale de su etapa.
 */
const STAGE_IDS = Object.keys(STAGE_ROUTE_SOURCES)

describe('routes: recorridos reales de las carreras por etapas', () => {
  it('cada carrera cargada declara su procedencia y su fecha de extracción', () => {
    for (const id of STAGE_IDS) {
      const src = STAGE_ROUTE_SOURCES[id]!
      expect(src.race.length).toBeGreaterThan(3)
      expect(src.edition).toBeGreaterThanOrEqual(2023)
      // O Wikipedia (CC BY-SA, atribución obligatoria) o la web oficial: alguna de las dos.
      expect(src.wikipedia ?? src.official ?? '').toMatch(/^https:\/\//)
      expect(src.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(src.notes.length).toBeGreaterThan(0)
    }
  })

  it('la distancia declarada es la suma de las etapas de la edición (±1 %)', () => {
    for (const id of STAGE_IDS) {
      const edition = RACE_EDITIONS[id]
      expect(edition, `${id} no tiene edición real en editions.ts`).toBeDefined()
      const suma = edition!.stages.reduce((acc, s) => acc + s.km, 0)
      const declarada = STAGE_ROUTE_SOURCES[id]!.distanceKm
      expect(Math.abs(suma - declarada) / declarada).toBeLessThan(0.01)
    }
  })

  it('hay un hueco de rasgos por etapa, ni uno más ni uno menos', () => {
    for (const id of STAGE_IDS) {
      expect(STAGE_FEATURES[id]).toHaveLength(RACE_EDITIONS[id]!.stages.length)
    }
  })

  it('los puertos van en orden y caben en SU etapa, con pendiente y categoría creíbles', () => {
    for (const id of STAGE_IDS) {
      const stages = STAGE_FEATURES[id]!
      RACE_EDITIONS[id]!.stages.forEach((s, i) => {
        let prev = 0
        for (const c of stages[i]?.climbs ?? []) {
          expect(
            c.summitKm,
            `${id} e${i + 1} ${c.name}: cima fuera de orden`,
          ).toBeGreaterThanOrEqual(prev)
          prev = c.summitKm
          // Medio km de holgura: la distancia del juego va redondeada al km (ver editions.ts).
          expect(
            c.summitKm,
            `${id} e${i + 1} ${c.name}: cima fuera de la etapa`,
          ).toBeLessThanOrEqual(s.km + 0.5)
          expect(c.lengthKm).toBeGreaterThan(0)
          expect(c.avgGradient).toBeGreaterThan(1)
          expect(c.avgGradient).toBeLessThan(20)
          if (c.category) expect(['HC', 'cat1', 'cat2', 'cat3', 'cat4']).toContain(c.category)
        }
      })
    }
  })

  it('cada etapa con rasgos se construye y se muestrea sin romperse', () => {
    for (const id of STAGE_IDS) {
      const stages = STAGE_FEATURES[id]!
      RACE_EDITIONS[id]!.stages.forEach((s, i) => {
        const f = stages[i]
        if (!f) return
        const profile = buildFeatureProfile(s.km, f, `${id}-e${i + 1}`, s.terrain)
        expect(stageLengthKm(profile)).toBeCloseTo(s.km, 1)
        for (const b of sampleProfile(profile)) {
          expect(Number.isFinite(b.g)).toBe(true)
          expect(Math.abs(b.g)).toBeLessThan(25)
        }
      })
    }
  })
})
