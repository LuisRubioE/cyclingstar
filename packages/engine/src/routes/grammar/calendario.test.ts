/**
 * EL CENSO DEL CALENDARIO QUE EL JUEGO CORRE (docs/generador.md §13.8; paso 0 de §15.2 y paso 8 de
 * §15.10).
 *
 * Todas las bandas de `ROUTE_CENSUS_TARGETS` se afirman sobre `calendarForSeason(BASE_SEASON)`, que
 * desde la v87 es `SEASON_CALENDAR`. En el paso 0 las que fallaban eran `it.todo` con la cifra medida
 * en el nombre (la tabla está en docs/balance.md, «v87 §0»); el paso 8 las encendió todas. Las que el
 * generador de la v87 no alcanza por construcción siguen en `it.todo`, con la cifra y la causa en el
 * nombre, en `PARA_EL_PASO_9`: la banda no se toca, se corrige el generador (docs/balance.md, v87 §1).
 *
 * Corre en `test:rapido` (está bajo `routes/`) y muestrea vía `routeCensus`, que pasa `sampleProfile`
 * por las 1.418 etapas.
 */
import { describe, expect, it } from 'vitest'
import { ARCH } from '../../constants.js'
import {
  CENSUS_N_MIN,
  ROUTE_CENSUS_TARGETS,
  aggregate,
  routeCensus,
} from '../../sim/routeCensus.js'
import { SEASON_CALENDAR, calendarForSeason, raceForSeason } from '../calendar.js' // calendar.ts, no edition.ts (§3.8)
import { RACE_EDITIONS } from '../editions.js'
import { stageKindOf } from '../stageKind.js'
import { BASE_SEASON } from './edition.js'
import { raceRouteSourceOf, type RouteSource } from './generate.js'
import { profileCorrelation } from './geometry.js'
import type { Segment } from '../../stage/types.js'
import type { Motif } from './motifs.js'

const filas = routeCensus(calendarForSeason(BASE_SEASON)) // 1.418 filas

/**
 * Bandas que el generador de la v87 no alcanza, con la cifra medida y la causa (docs/balance.md, v87
 * §1). No se aflojan: las cierra el paso 9, corrigiendo el catálogo o calibrando `ARCH.anticlon`.
 */
const PARA_EL_PASO_9: Readonly<Record<string, string>> = {
  'esqueletos.entropia':
    'medido 1,00 bits en cono_sur y 1,09 en generico: son zonas de nacionales, dos esqueletos por país por construcción (decisión 15)',
  'finales.reparto.valleLargo':
    'medido 0 de 86: ningún esqueleto reina corona a más de 20 km de meta (et_reina_valle llega a 19,3)',
  'km.clase.max':
    'medido 11, todas etapas de edición cuyo km es el de la edición real (contrato, §3.7) por encima de ARCH.km.maxPorClase: race-colombia e5 232 km en una .1; el techo por clase es la decisión D9, a confirmar con el reglamento UCI',
  'nacionales.firmas':
    'medido 4: el circuito de nc_ruta solo admite cota, muro y sector, solo flandes da sector y el techo de desnivel quita el muro antes que una vuelta',
  'variedad.correlacion.max':
    'medido 0,993 (dos et_prologo de 3 km) y 25 de 2.096 pares por encima de 0,85, casi todos nc_crono con su cota en [0,3; 0,7]: ARCH.anticlon.maxCorrelacion se calibra en el paso 9',
  'variedad.dplusCubetaAlta':
    'medido σ 481 m en 60 reinas: el objetivo de desnivel se sortea dentro de lo factible en su zona y sus km (§8.5), que estrecha la cola alta',
}

describe('el censo del calendario que el juego corre', () => {
  for (const t of ROUTE_CENSUS_TARGETS) {
    const pendiente = PARA_EL_PASO_9[t.id]
    if (pendiente !== undefined) {
      it.todo(`${t.id}: ${t.label} (paso 9: ${pendiente})`)
      continue
    }
    const nombre = `${t.id}: ${t.label} (paso 0: ${t.hoy ?? 'sin población'})`
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

  it('ninguna etapa generada llega degradada en las temporadas 0 a 3 y el p95 de intentos es ≤ ARCH.veto.intentosP95', () => {
    for (const s of [0, 1, 2, 3]) {
      // las cuatro que §14.5 presupuesta (2,5 + 3 s de tope)
      const gen = routeCensus(calendarForSeason(s)).filter((r) => r.routeSource !== 'real')
      expect(gen.filter((r) => r.degradado).length, `temporada ${s}`).toBe(0)
      expect(
        aggregate(gen, () => 'todo').todo!.num.intentos!.p95,
        `temporada ${s}`,
      ).toBeLessThanOrEqual(ARCH.veto.intentosP95)
    }
  })

  it('los km de las etapas de edición cuadran con la edición', () => {
    for (const [id, ed] of Object.entries(RACE_EDITIONS))
      filas
        .filter((r) => r.raceId === id)
        .forEach((r) => expect(Math.round(r.km)).toBe(ed.stages[r.stageIndex - 1]!.km))
  })

  it('ningún segmento generado mide menos de 0,5 km salvo los dos cortos de V10(b)', () => {
    // RE-SELLADO en el paso 8: en el paso 0 era «ninguno por debajo de 0,5 km» y valía porque los
    // generadores viejos no dibujaban muros de una rampa ni sectores cortos. La gramática sí, y V10(b)
    // los admite por escrito (§9.2, `ARCH.veto.segmentoMinKm`): el `puerto` de UNA rampa desde
    // `ARCH.motivo.muro.km[0]` (el muro corto, Paterberg) y el `paves` desde `ARCH.motivo.sector.km[0]`.
    // Medido en la v87: 8 etapas con alguno (muros de 0,4 en `et_media_muro` y sectores de 0,3 y 0,4 en
    // `ud_adoquin`); ningún otro segmento baja de 0,5.
    const cortoAdmitido = (s: Segment): boolean =>
      (s.tipo === 'puerto' && s.tramos?.length === 1 && s.km >= ARCH.motivo.muro.km[0]) ||
      (s.tipo === 'paves' && s.km >= ARCH.motivo.sector.km[0])
    for (const race of SEASON_CALENDAR)
      for (const st of race.stages) {
        if (st.routeSource === 'real') continue
        for (const s of st.profile.segments)
          if (!cortoAdmitido(s))
            expect(s.km, `${race.id} e${st.index} ${s.tipo}`).toBeGreaterThanOrEqual(
              ARCH.veto.segmentoMinKm,
            )
      }
  })

  it('cruces.kind: el kind de toda etapa no real coincide con stageKindOf (1.241 de 1.241; en el paso 0, 1.232)', () => {
    // V6 medido en frío (§11.6): lo no real lleva el `kind` que su perfil dicta. Lo real conserva el de
    // su terreno de edición y su discrepancia es la banda informativa `real.cruces` (D2).
    let generadas = 0
    let coinciden = 0
    for (const race of SEASON_CALENDAR)
      for (const st of race.stages) {
        if (st.routeSource === 'real') continue
        generadas++
        if (stageKindOf(st.profile, st.timeTrial === true).kind === st.kind) coinciden++
      }
    expect([coinciden, generadas]).toEqual([1241, 1241])
  })

  it('el desnivel total contiene al de los puertos: dPlus ≥ 0,99 × dPlusBloques en toda etapa generada', () => {
    // dPlusBloques (calendarQueens::desnivelDe) cuenta solo segmentos `puerto`; dPlus (dPlusDe) suma además el relleno
    for (const r of filas.filter((x) => x.routeSource !== 'real'))
      expect(r.dPlus, `${r.raceId} e${r.stageIndex}`).toBeGreaterThanOrEqual(0.99 * r.dPlusBloques)
  })

  it('el reparto por origen es 177 real, 226 edicion y 1.015 generado (sección 11, §11.1), igual en el paso 0 y tras el 8', () => {
    const n = (s: RouteSource): number => filas.filter((r) => r.routeSource === s).length // el campo de la etapa desde el paso 8
    expect([n('real'), n('edicion'), n('generado')]).toEqual([177, 226, 1015])
  })

  it('routeSource de carrera es el agregado de sus etapas (§3.11)', () => {
    let todasEdicion = 0
    for (const race of calendarForSeason(BASE_SEASON)) {
      const set = new Set(race.stages.map((s) => s.routeSource))
      const esperado =
        set.size > 1 || set.has('edicion') ? 'mixto' : set.has('real') ? 'real' : 'generado'
      expect(race.routeSource).toBe(esperado)
      expect(race.routeSource).toBe(raceRouteSourceOf(race.stages))
      if (set.size === 1 && set.has('edicion')) todasEdicion += 1
      for (const s of race.stages) {
        if (s.routeSource === 'real') expect(s.arch).toBeUndefined()
        else expect(s.arch?.skeleton).toBeDefined()
      }
    }
    expect(todasEdicion).toBe(39) // medido sobre editions.ts y stageFeatures.ts; solo un dato real nuevo puede moverlo
  })

  it('ninguna etapa generada de equipos cae en la zona generico (§3.6); cuatro de edición sí, por datos', () => {
    // El generador no vuelve a quedar ciego a la geografía por la puerta de atrás: toda etapa
    // `generado` que no es un campeonato tiene la zona de su país o de `RACE_REGION`. Las cuatro de
    // edición que caen en `generico` están CURADAS así en `RACE_REGION` (`regions.ts`): Yopal, Socopó,
    // Puerto Barrios y Coatepeque son llanos tropicales a poca altura y no hay zona para ellos. Es
    // contenido y no generador: una zona nueva las movería.
    const enGenerico: string[] = []
    for (const race of SEASON_CALENDAR)
      for (const st of race.stages)
        if (race.raceClass !== 'NC' && st.arch?.geo === 'generico')
          enGenerico.push(`${race.id}:${st.index}:${st.routeSource}`)
    expect(enGenerico).toEqual([
      'race-tachira:1:edicion',
      'race-colombia:1:edicion',
      'race-guatemala:1:edicion',
      'race-guatemala:4:edicion',
    ])
  })

  it('H9: race-olympia (NL) sin puerto ni reina; race-colombia-tour (CO) con puerto; sin clones entre las dos', () => {
    const kinds = (ms: readonly Motif[]): string[] =>
      ms.flatMap((m) => [m.kind, ...(m.hijos ? kinds(m.hijos) : [])])
    const olympia = raceForSeason('race-olympia', BASE_SEASON)
    const colombia = raceForSeason('race-colombia-tour', BASE_SEASON)
    for (const st of olympia.stages) {
      expect(st.arch!.geo).toBe('flandes')
      expect(kinds(st.arch!.motivos), `race-olympia e${st.index}`).not.toContain('puerto')
      expect(st.kind).not.toBe('reina')
    }
    expect(colombia.stages.every((st) => st.arch!.geo === 'andes')).toBe(true)
    expect(colombia.stages.some((st) => kinds(st.arch!.motivos).includes('puerto'))).toBe(true)
    for (const a of olympia.stages)
      for (const b of colombia.stages)
        if (a.arch!.skeleton === b.arch!.skeleton)
          expect(profileCorrelation(a.profile, b.profile)).toBeLessThan(
            ARCH.anticlon.maxCorrelacion,
          )
  })

  it('el censo de la temporada 0 cabe en un push', () => {
    const t0 = performance.now()
    routeCensus(calendarForSeason(BASE_SEASON))
    expect(performance.now() - t0).toBeLessThan(5_000) // 0,41 s medidos en el paso 0; techo holgado para CI cargado
  })
})
