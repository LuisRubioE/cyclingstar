/**
 * EL CENSO DEL CALENDARIO QUE EL JUEGO CORRE (docs/generador.md §13.8, forma del paso 0 de §15.2).
 *
 * Todas las bandas de `ROUTE_CENSUS_TARGETS` están escritas ya. Las que hoy pasan son `it`; las que
 * hoy fallan son `it.todo` con la cifra MEDIDA en el paso 0 en el nombre, y se encienden en el paso 8
 * quitando su línea de `ROJAS_EN_EL_PASO_0`: así el diff enseña qué se encendió y desde dónde. Las
 * que se filtran por `skeleton`, `zona` o `meta` no tienen población hasta el paso 8; si la forma de
 * hoy que ocupa su lugar las incumple, van también aquí con la medida «por forma».
 *
 * Corre en `test:rapido` (está bajo `routes/`) y muestrea vía `routeCensus`, que pasa `sampleProfile`
 * por las 1.418 etapas: 0,41 s medidos en el paso 0.
 */
import { describe, expect, it } from 'vitest'
import { CENSUS_N_MIN, ROUTE_CENSUS_TARGETS, routeCensus } from '../../sim/routeCensus.js'
import { SEASON_CALENDAR } from '../calendar.js'
import { RACE_EDITIONS } from '../editions.js'
import { stageKindOf } from '../stageKind.js'
import type { RouteSource } from './generate.js'

const filas = routeCensus() // SEASON_CALENDAR, 1.418 filas

/**
 * Bandas rojas en el paso 0, con la cifra medida sobre el calendario de `ENGINE_VERSION` 86. «Por
 * forma» = la población de la banda aún no existe y se mide la forma de hoy que ocupa su sitio (los
 * un día generados con cota, los que tienen pavés, los `nc-*-road`, las formas por `label`).
 */
const ROJAS_EN_EL_PASO_0: Readonly<Record<string, string>> = {
  'esqueletos.clase.udWTPro': 'hoy 3 formas en 32 etapas',
  'esqueletos.clase.ud12': 'hoy 6 formas en 126 etapas',
  'esqueletos.clase.papeles': 'hoy 7 formas en 551 etapas',
  'finales.reparto.alto': 'hoy 23 de 103, 0,223',
  'reina.dplus.minimo': 'hoy 1.973 m',
  'finales.muro': 'hoy 0 de 911',
  'finales.puncheur': 'hoy 30 de 911, 3,3 %',
  'unDia.ultimaCota.km': 'hoy sin esqueletos; por forma 21 de 85 un día generados con cota, 24,7 %',
  'unDia.ultimaCota.aMeta': 'hoy sin esqueletos; por forma 8 de 85, 9,4 %',
  'unDia.murosMeta': 'hoy sin esqueletos; por forma 0 de 1, el único un día Classic generado',
  'muros.cotas.p10': 'hoy sin esqueletos; por forma 4 muros en el único un día Classic generado',
  'adoquin.sectores.p10': 'hoy sin esqueletos; por forma 3 sectores en los 13 un día con pavés',
  'adoquin.km.p10': 'hoy sin esqueletos; por forma p10 de 7,3 km en los 13 un día con pavés',
  'km.clase.p90dosVuelta': 'hoy el p90 de .2 es 189',
  'km.clase.p50dosUnDia': 'hoy 210',
  'km.clase.max': 'hoy 176 etapas',
  'nacionales.zona':
    'hoy sin esqueletos; por forma los 266 nc en ruta son classic sin zona, 0 bits',
  'nacionales.firmas': 'hoy sin esqueletos; por forma 1 sola forma en los 266',
  'nacionales.adoquin': 'hoy sin esqueletos; por forma 0 de 4 BE/NL',
  'nacionales.cota': 'hoy sin esqueletos; por forma 0 de 4 CO/EC',
  'nacionales.expuesto': 'hoy sin esqueletos; por forma 0 de 4 DK/AE',
  'variedad.correlacion.max': 'hoy sin esqueletos; por forma 0,910, en ITT',
  'variedad.finalesPorVuelta': 'hoy 1, race-isere',
  'variedad.kmUnDia.dos': 'hoy σ 6,8 km',
}

describe('el censo del calendario que el juego corre', () => {
  for (const t of ROUTE_CENSUS_TARGETS) {
    const roja = ROJAS_EN_EL_PASO_0[t.id]
    if (roja !== undefined) {
      it.todo(`${t.id}: ${t.label} (${roja})`)
      continue
    }
    const nombre = `${t.id}: ${t.label} (hoy ${t.hoy ?? 'sin población'})`
    if (t.estado === 'informativa') {
      it.skip(nombre, () => {}) // se imprime en pnpm sim, no afirma
      continue
    }
    it(nombre, () => {
      const pob = filas.filter(t.poblacion)
      if (pob.length < Math.max(t.nMin, CENSUS_N_MIN)) return // "n insuficiente": se imprime, no falla
      const v = t.medida(pob)
      if (t.min !== undefined) expect(v).toBeGreaterThanOrEqual(t.min)
      if (t.max !== undefined) expect(v).toBeLessThanOrEqual(t.max)
    })
  }

  it('los km de las etapas de edición cuadran al redondeo (verde hoy)', () => {
    for (const [id, ed] of Object.entries(RACE_EDITIONS))
      filas
        .filter((r) => r.raceId === id)
        .forEach((r) => expect(Math.round(r.km)).toBe(ed.stages[r.stageIndex - 1]!.km))
  })

  it('ningún segmento generado mide menos de 0,5 km (verde hoy; los 164 que hay son de perfiles reales)', () => {
    for (const race of SEASON_CALENDAR)
      race.stages.forEach((st, i) => {
        if (
          filas.find((r) => r.raceId === race.id && r.stageIndex === i + 1)?.routeSource === 'real'
        )
          return
        for (const s of st.profile.segments)
          expect(s.km, `${race.id} e${i + 1}`).toBeGreaterThanOrEqual(0.5)
      })
  })

  it('el kind declarado coincide con stageKindOf en 1.346 de 1.418 etapas (1.232 de 1.241 generadas)', () => {
    // Las discrepancias en lo generado son la banda V6 (cruces.kind), no la de segmentos cortos: entre
    // ellas los perfiles cuya clasificación cruza el borde de PASS_MIN_KM 8,5 km porque `segment.km`
    // va redondeado y los tramos no (mapa 01 §5.1: 3 de 1.500, `mountain 175 semilla-167`).
    let todas = 0
    let generadas = 0
    let nGeneradas = 0
    for (const race of SEASON_CALENDAR)
      race.stages.forEach((st, i) => {
        const coincide = stageKindOf(st.profile, st.timeTrial === true).kind === st.kind
        if (coincide) todas++
        const fila = filas.find((r) => r.raceId === race.id && r.stageIndex === i + 1)!
        if (fila.routeSource === 'real') return
        nGeneradas++
        if (coincide) generadas++
      })
    expect([todas, generadas, nGeneradas]).toEqual([1346, 1232, 1241])
  })
  it.todo(
    'cruces.kind: el kind declarado coincide con stageKindOf en el 100 % de lo generado (hoy 1.232 de 1.241)',
  )

  it('el desnivel total contiene al de los puertos: dPlus ≥ 0,99 × dPlusBloques en toda etapa generada', () => {
    // dPlusBloques (calendarQueens::desnivelDe) cuenta solo segmentos `puerto`; dPlus (dPlusDe) suma además el relleno
    for (const r of filas.filter((x) => x.routeSource !== 'real'))
      expect(r.dPlus, `${r.raceId} e${r.stageIndex}`).toBeGreaterThanOrEqual(0.99 * r.dPlusBloques)
  })

  it('el reparto por origen es 177 real, 226 edicion y 1.015 generado (sección 11, §11.1)', () => {
    const n = (s: RouteSource): number => filas.filter((r) => r.routeSource === s).length
    expect([n('real'), n('edicion'), n('generado')]).toEqual([177, 226, 1015])
  })

  it('el censo del calendario cabe en un push', () => {
    const t0 = performance.now()
    routeCensus()
    expect(performance.now() - t0).toBeLessThan(5_000) // 0,41 s medidos en el paso 0; techo holgado para CI cargado
  })
})
