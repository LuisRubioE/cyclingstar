import { COUNTRIES } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { calendarForSeason, stageCities } from './calendar.js'
import { RACE_EDITIONS } from './editions.js'
import { CIUDADES, ciudadesDe } from './grammar/ciudades.js'
import { semillaDe } from './grammar/edition.js'
import { TERRITORIOS, zonaDe } from './grammar/geo.js'
import { hashInt } from './profileGen.js'
import { RACE_ROUTES } from './raceRoutes.js'

/**
 * CIUDADES DE SALIDA Y LLEGADA EN TODAS LAS ETAPAS (docs/balance.md, nota del mismo nombre).
 *
 * Lo primero es lo que NO puede cambiar: los perfiles. Las ciudades salen de datos de autoría y, en
 * los campeonatos, de un subflujo propio (`ciudad`); si alguna tirada se hubiera movido, la huella
 * de todas las etapas de las temporadas 0 y 1 dejaría de ser la sellada antes del cambio.
 */
const HUELLA_SELLADA: Record<number, { etapas: number; huella: number }> = {
  0: { etapas: 1418, huella: 1575594318 },
  1: { etapas: 1418, huella: 3687512453 },
}

const ASCII = /^[\x20-\x7e]+$/
const SEASONS = [0, 1] as const

describe('ciudades de salida y llegada', () => {
  it.each(SEASONS)('temporada %i: los perfiles son los mismos que antes de las ciudades', (s) => {
    const hs = calendarForSeason(s).flatMap((r) =>
      r.stages.map((st) => `${r.id}|${st.index}|${hashInt(JSON.stringify(st.profile))}`),
    )
    expect({ etapas: hs.length, huella: hashInt(hs.join(';')) }).toEqual(HUELLA_SELLADA[s])
  })

  it.each(SEASONS)('temporada %i: toda etapa tiene salida y llegada, en ASCII', (s) => {
    for (const r of calendarForSeason(s))
      for (const st of r.stages) {
        const clave = `${r.id} e${st.index}`
        expect(ASCII.test(st.from), clave).toBe(true)
        expect(ASCII.test(st.to), clave).toBe(true)
        expect(st.from.trim(), clave).toBe(st.from)
        expect(st.to.trim(), clave).toBe(st.to)
      }
  })

  it('las ediciones reales conservan sus ciudades reales', () => {
    for (const s of SEASONS)
      for (const r of calendarForSeason(s)) {
        const ed = RACE_EDITIONS[r.id]
        if (!ed) continue
        r.stages.forEach((st, i) => {
          expect({ from: st.from, to: st.to }, `${r.id} e${st.index}`).toEqual({
            from: ed.stages[i]!.from,
            to: ed.stages[i]!.to,
          })
        })
      }
  })

  it('el resto de carreras de equipos usa su recorrido de autoría; una crono llana o un circuito, en una sola ciudad', () => {
    let unaCiudad = 0
    for (const r of calendarForSeason(0)) {
      if (r.championshipCountry || RACE_EDITIONS[r.id]) continue
      r.stages.forEach((st, i) => {
        const [from, to] = RACE_ROUTES[r.id]![i]!
        const clave = `${r.id} e${st.index}`
        if (st.from === from && st.to === to) return
        // Solo se toca un par para dejarlo en UNA de sus dos ciudades.
        expect(st.from, clave).toBe(st.to)
        expect([from, to], clave).toContain(st.from)
        unaCiudad += 1
        if (st.timeTrial) expect(st.from, clave).toBe(from)
        else expect(st.to, clave).toBe(to)
      })
    }
    expect(unaCiudad).toBeGreaterThan(0)
  })

  it('una carrera de equipos tiene las mismas ciudades en todas las temporadas (identidad)', () => {
    const s1 = new Map(calendarForSeason(1).map((r) => [r.id, r]))
    for (const r of calendarForSeason(0)) {
      if (r.championshipCountry) continue
      const otra = s1.get(r.id)!
      r.stages.forEach((st, i) =>
        expect([otra.stages[i]!.from, otra.stages[i]!.to], `${r.id} e${st.index}`).toEqual([
          st.from,
          st.to,
        ]),
      )
    }
  })

  it('un campeonato nacional: una ciudad por país y temporada, de su zona, salida y llegada en ella', () => {
    const cambian = new Set<string>()
    const porPais = new Map<string, string>()
    for (const s of SEASONS)
      for (const r of calendarForSeason(s)) {
        const cc = r.championshipCountry
        if (!cc) continue
        const st = r.stages[0]!
        expect(st.from, r.id).toBe(st.to)
        expect(ciudadesDe(cc, zonaDe(cc)), r.id).toContain(st.from)
        const clave = `${cc}|${s}`
        const ya = porPais.get(clave)
        if (ya !== undefined) expect(st.from, r.id).toBe(ya)
        else porPais.set(clave, st.from)
        if (s === 1 && porPais.get(`${cc}|0`) !== st.from) cambian.add(cc)
      }
    expect(porPais.size).toBe(COUNTRIES.length * SEASONS.length)
    // La ciudad rota entre temporadas en la mayoría de países (no en todos: es un sorteo).
    expect(cambian.size).toBeGreaterThan(COUNTRIES.length / 2)
  })

  it.each(SEASONS)(
    'temporada %i: stageCities da lo mismo que el calendario, sin construirlo',
    (s) => {
      for (const r of calendarForSeason(s))
        for (const st of r.stages)
          expect(stageCities(r.id, s, st.index), `${r.id} e${st.index}`).toEqual({
            from: st.from,
            to: st.to,
          })
      expect(stageCities('test-tour', s, 1)).toBeNull()
      expect(stageCities('race-france', s, 99)).toBeNull()
    },
  )

  it('el subflujo `ciudad` es propio: con temporada y sin intento ni redibujo', () => {
    const req = {
      raceId: 'nc-es',
      stageIndex: 1,
      routeSource: 'generado' as const,
      season: 3,
      redibujo: 2,
    }
    expect(semillaDe('ciudad', req)).toBe('ciudad|nc-es|1|3')
  })
})

describe('la tabla CIUDADES', () => {
  it('todo país tiene lista en la zona de sus recorridos: ≥ 10 con territorio, ≥ 3 sin él', () => {
    for (const c of COUNTRIES) {
      const lista = CIUDADES[c.code]?.[zonaDe(c.code)]
      expect(lista, c.code).toBeDefined()
      expect(lista!.length, c.code).toBeGreaterThanOrEqual(TERRITORIOS[c.code] ? 10 : 3)
      expect(lista!.length, c.code).toBeLessThanOrEqual(30)
    }
    // Sin filas de países que no existen en COUNTRIES.
    const codigos = new Set(COUNTRIES.map((c) => c.code))
    for (const code of Object.keys(CIUDADES)) expect(codigos.has(code), code).toBe(true)
  })

  it('nombres en ASCII, sin espacios sobrantes y sin repetidos dentro de una lista', () => {
    for (const [code, zonas] of Object.entries(CIUDADES))
      for (const [zona, lista] of Object.entries(zonas)) {
        expect(new Set(lista).size, `${code}/${zona}`).toBe(lista!.length)
        for (const c of lista!) {
          expect(ASCII.test(c), `${code}/${zona}: ${c}`).toBe(true)
          expect(c.trim(), `${code}/${zona}: ${c}`).toBe(c)
        }
      }
  })
})
