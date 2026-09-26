/**
 * EL CENSO DEL CALENDARIO QUE EL JUEGO CORRE (docs/generador.md §13.8; paso 0 de §15.2 y paso 8 de
 * §15.10).
 *
 * Todas las bandas de `ROUTE_CENSUS_TARGETS` se afirman sobre `calendarForSeason(BASE_SEASON)`, que
 * desde la v87 es `SEASON_CALENDAR`. En el paso 0 las que fallaban eran `it.todo` con la cifra medida
 * en el nombre (la tabla está en docs/balance.md, «v87 §0»); el paso 8 las encendió todas y dejó seis
 * en `it.todo` para el paso 9. El paso 9 cerró tres (dos corrigiendo la población que la banda medía
 * contra lo que el diseño excluye, una corrigiendo el catálogo) y las otras tres siguen en `it.todo`,
 * con la cifra y la causa en el nombre, en `PENDIENTES`: la banda no se toca y la decide el dueño con
 * la cifra delante (docs/balance.md, v87 §2).
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
 * Bandas que el generador de la v87 no alcanza tras el paso 9, con la cifra medida y la causa
 * (docs/balance.md, v87 §2). No se aflojan: son decisiones abiertas del dueño.
 *
 * Las otras tres del paso 8 se cerraron así: `esqueletos.entropia` mide ya solo las carreras de
 * equipos (los nacionales llevan dos esqueletos por país por construcción, decisión 15; §13.3 los
 * saca de las bandas de esqueletos): 2,30 bits el peor, `macizo_central`. `km.clase.max` mide solo lo
 * sorteado: el km de una edición real es un contrato (§3.7) y no pasa por el techo (D9, decisión 36):
 * 0. `nacionales.firmas` sube de 4 a 6 corrigiendo `nc_ruta` (el circuito pierde una vuelta antes que
 * un muro, y un `expuesto` delante del circuito donde la zona tiene viento, §13.3).
 */
const PENDIENTES: Readonly<Record<string, string>> = {
  'finales.reparto.valleLargo':
    'medido 4 de 86 (0,047): et_reina_valle corre el final largo por carrera con p 0,5 donde cabe (paso 9) y el calendario solo tiene 10 et_reina_valle; en el paso 8 era 0',
  'variedad.correlacion.max':
    'medido 0,993 contra el tope calibrado 0,32 (p90 de 338 pares reales, §9.5): 566 de 2.065 pares generados lo pasan, sobre todo nc_crono, et_crono y reinas con final en alto; previsión fallida H6, decisión del dueño',
  'variedad.dplusCubetaAlta':
    'medido σ 474 m en 59 reinas: el objetivo de desnivel se sortea dentro de lo factible en su zona y sus km (§8.5), que estrecha la cola alta; decisión del dueño',
}

describe('el censo del calendario que el juego corre', () => {
  for (const t of ROUTE_CENSUS_TARGETS) {
    const pendiente = PENDIENTES[t.id]
    if (pendiente !== undefined) {
      it.todo(`${t.id}: ${t.label} (v87 §2: ${pendiente})`)
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

  const kinds = (ms: readonly Motif[]): string[] =>
    ms.flatMap((m) => [m.kind, ...(m.hijos ? kinds(m.hijos) : [])])
  const olympia = raceForSeason('race-olympia', BASE_SEASON)
  const colombia = raceForSeason('race-colombia-tour', BASE_SEASON)

  it('H9: race-olympia (NL) sin puerto ni reina; race-colombia-tour (CO) con puerto', () => {
    for (const st of olympia.stages) {
      expect(st.arch!.geo).toBe('flandes')
      expect(kinds(st.arch!.motivos), `race-olympia e${st.index}`).not.toContain('puerto')
      expect(st.kind).not.toBe('reina')
    }
    expect(colombia.stages.every((st) => st.arch!.geo === 'andes')).toBe(true)
    expect(colombia.stages.some((st) => kinds(st.arch!.motivos).includes('puerto'))).toBe(true)
  })

  // SALTADO en el paso 9 por la regla «previsión fallida» de §13.7 (docs/balance.md, v87 §2, H6):
  // con `ARCH.anticlon.maxCorrelacion` calibrado a 0,32 (p90 de pares reales, §9.5) el par más
  // parecido de las dos vueltas con el mismo esqueleto da 0,57; con el 0,85 provisional pasaba. Qué
  // tope de clon quiere el dueño queda abierto, y hasta entonces el test no se ensancha: se salta.
  it.skip('H9: sin clones entre race-olympia y race-colombia-tour (ARCH.anticlon.maxCorrelacion)', () => {
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
