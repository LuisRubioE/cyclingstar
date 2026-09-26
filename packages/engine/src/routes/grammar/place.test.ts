import { describe, expect, it } from 'vitest'
import { ARCH } from '../../constants.js'
import { routeRng } from '../profileGen.js'
import type { StageRequest } from './generate.js'
import { ZONAS, admite, type GeoSignature, type GeoZone } from './geo.js'
import type { Instancia, Motif } from './motifs.js'
import { colocar, colocarPlantilla, kmNoEnlace, type Placed } from './place.js'
import { SKELETONS, SKELETON_IDS, type Skeleton, type SkeletonId } from './skeletons.js'

/**
 * LA COLOCACIÓN POR VENTANAS (docs/generador.md §8.6 y §8.14, paso 4 del plan §15.6).
 *
 * `instanciar` es del paso 5, así que las instancias de este fichero las fabrica `instanciaDePrueba`:
 * cada hueco no firma con una cardinalidad y unos km y g sorteados en `ARCH.motivo ∩ Slot.params ∩
 * zona`, y los compuestos y la meta copiados de la plantilla canónica del esqueleto. No reproduce el
 * sorteo del paso 5 (ni la persecución del desnivel ni la regla de la primera cota): solo da a
 * `colocar` listas de motivos plausibles, con la meta al final, para medir la colocación.
 *
 * Paso 5: el circuito de firma acaba en la meta sin enlace entre medias, así que los casos con
 * circuito de firma piden el km que sale del circuito (§8.4) y no uno cualquiera de `sk.km`.
 */

const r1 = (x: number): number => Math.round(x * 10) / 10
const semillas = (n: number): string[] => Array.from({ length: n }, (_, i) => `t${i}`)
const entre = (v: number, a: number, b: number, msg?: string): void => {
  expect(v, msg).toBeGreaterThanOrEqual(a - 1e-9)
  expect(v, msg).toBeLessThanOrEqual(b + 1e-9)
}
type R = readonly [number, number]
const corta = (...rs: (R | undefined)[]): [number, number] => {
  const lo = Math.max(...rs.map((r) => r?.[0] ?? -Infinity))
  const hi = Math.min(...rs.map((r) => r?.[1] ?? Infinity))
  return lo <= hi ? [lo, hi] : [rs[0]![0], rs[0]![1]] // vacío: manda el rango del motivo
}
const U = (rand: () => number, [a, b]: R): number => r1(a + rand() * (b - a))

function reqDe(
  id: SkeletonId,
  geo: GeoSignature,
  km: number,
  extra: Partial<StageRequest> = {},
): StageRequest {
  return {
    raceId: 'test',
    stageIndex: 1,
    season: 0,
    role: 'un_dia',
    terrain: 'hilly',
    raceClass: 'WT',
    format: 'un-dia',
    routeSource: 'generado',
    geo,
    km,
    fixed: { skeleton: id },
    ...extra,
  }
}

/** Una lista de motivos del esqueleto como la que dará `instanciar` (sin su sorteo fino). */
function instanciaDePrueba(sk: Skeleton, geo: GeoSignature, seed: string): Instancia[] {
  const rand = routeRng(`instancia|${sk.id}|${seed}`)
  const out: Instancia[] = []
  const deCanonica = (kind: Motif['kind']): Motif | undefined =>
    sk.canonico.find((m) => m.kind === kind)
  sk.slots.forEach((sl, slot) => {
    if (sl.motif === 'enlace') return
    const n = sl.n[0] + Math.floor(rand() * (sl.n[1] - sl.n[0] + 1))
    for (let j = 0; j < n; j++) {
      const p = sl.params ?? {}
      let motif: Motif
      switch (sl.motif) {
        case 'cota':
        case 'puerto':
        case 'muro': {
          const A = ARCH.motivo[sl.motif]
          const z = geo[sl.motif]
          const km = U(rand, corta(A.km, p.kmRango, z?.km))
          const g = U(rand, corta(A.g, p.gRango, z?.g))
          motif = { kind: sl.motif, km, g: sl.motif === 'cota' ? Math.min(g, 7.9) : g }
          break
        }
        case 'tendida':
          motif = {
            kind: 'tendida',
            km: U(rand, corta(ARCH.motivo.tendida.km, p.kmRango)),
            g: U(rand, corta(ARCH.motivo.tendida.g, p.gRango)),
          }
          break
        case 'expuesto':
          motif = { kind: 'expuesto', km: U(rand, [10, 40]) }
          break
        case 'sector':
          motif = {
            kind: 'sector',
            km: U(rand, corta(ARCH.motivo.sector.km, p.kmRango)),
            estrellas: 2 + Math.floor(rand() * 2),
          }
          break
        default: {
          const c = deCanonica(sl.motif)
          if (c === undefined) return
          motif = structuredClone(c)
        }
      }
      if (sl.firma) motif.firma = true
      out.push({ slot, j, motif })
    }
  })
  out.push({ slot: 'meta', j: 0, motif: structuredClone(sk.canonico.at(-1)!) })
  return out
}

/** La zona de cada esqueleto para el barrido: la primera de `ZONAS` que lo admite, sin transición. */
const zonaDe = (sk: Skeleton): GeoZone =>
  (Object.keys(ZONAS) as GeoZone[]).find((z) => admite(sk.requiere, ZONAS[z]))!
const kmTotal = (m: Motif): number => m.km * (m.vueltas ?? 1)
const finDe = (p: Placed): number => p.finKm + (p.bajada?.km ?? 0)

/** 1.000 esqueletos instanciados: los 32, cada uno en su zona, con km repartidos en su rango bruto. */
function casos(): { sk: Skeleton; geo: GeoSignature; km: number; seed: string }[] {
  const out: { sk: Skeleton; geo: GeoSignature; km: number; seed: string }[] = []
  for (let i = 0; i < 1000; i++) {
    const sk = SKELETONS[SKELETON_IDS[i % SKELETON_IDS.length]!]
    const f = (Math.floor(i / SKELETON_IDS.length) % 5) / 4
    out.push({
      sk,
      geo: ZONAS[zonaDe(sk)],
      km: r1(sk.km[0] + f * (sk.km[1] - sk.km[0])),
      seed: `t${i}`,
    })
  }
  return out
}

describe('colocar', () => {
  it('sobre 1.000 esqueletos instanciados: ventanas, enlaces mínimos, 12 % de enlace o null', () => {
    let colocados = 0
    let nulos = 0
    let fueraDeVentana = 0
    for (const { sk, geo, km, seed } of casos()) {
      const motivos = instanciaDePrueba(sk, geo, seed)
      const p = colocar(motivos, km, sk, reqDe(sk.id, geo, km), routeRng(`pos|t|${seed}`))
      if (p === null) {
        nulos++
        continue
      }
      colocados++
      // Σ enlaces ≥ 12 % (V10(a) antes de dibujar), contado como lo cuenta V10.
      const noEnlace = p.reduce((a, x) => a + kmNoEnlace(x), 0)
      expect(km - noEnlace, `${sk.id} ${seed}`).toBeGreaterThanOrEqual(
        ARCH.colocacion.enlaceMinimoTotal * km - 1e-6,
      )
      // La meta al final, acabando en km; el orden de carretera, sin solapes.
      expect(p.at(-1)!.slot).toBe('meta')
      expect(p.at(-1)!.finKm).toBeCloseTo(km, 6)
      for (let i = 1; i < p.length; i++) {
        const hueco = r1(p[i]!.inicioKm - finDe(p[i - 1]!))
        const pegado =
          (sk.id === 'et_reina_encadenada' &&
            p[i - 1]!.bajada !== undefined &&
            p[i]!.slot !== 'meta') ||
          (p[i]!.slot === 'meta' &&
            p[i - 1]!.motif.kind === 'circuito' &&
            p[i - 1]!.motif.firma === true) // paso 5: el circuito de firma acaba en la meta
        expect(hueco, `${sk.id} ${seed} #${i}`).toBeGreaterThanOrEqual(
          pegado ? 0 : ARCH.colocacion.enlaceMinimo - 1e-9,
        ) // dos dificultades nunca se tocan salvo dentro de cadena y de reina encadenada
      }
      // Ningún motivo empieza fuera de su ventana (se cuenta: la cascada contra la meta puede sacarlo).
      for (const x of p)
        if (x.slot !== 'meta') {
          const [a, b] = sk.slots[x.slot]!.ventana
          const f = x.inicioKm / km
          if (f < a - 0.05 / km - 1e-9 || f > b + 0.05 / km + 1e-9) fueraDeVentana++
        }
    }
    console.info(
      `[place] 1.000 instancias: ${colocados} colocadas, ${nulos} null (V10), ${fueraDeVentana} motivos fuera de su ventana`,
    )
    expect(colocados).toBeGreaterThan(850)
    expect(fueraDeVentana).toBe(0)
  })
  it('respeta la ventana: el inicio de cada dificultad de ud_montana cae en km × [a, b]', () => {
    const sk = SKELETONS.ud_montana
    for (const seed of semillas(200)) {
      const p = colocar(
        instanciaDePrueba(sk, ZONAS.alpes, seed),
        240,
        sk,
        reqDe('ud_montana', ZONAS.alpes, 240),
        routeRng(`pos|t|${seed}`),
      )
      if (p === null) continue
      p.filter((x) => x.slot !== 'meta').forEach((x) => {
        const [a, b] = sk.slots[x.slot as number]!.ventana
        entre(x.inicioKm / 240, a - 0.05 / 240, b + 0.05 / 240, `${seed} slot ${x.slot}`) // ± 0,05 km: el redondeo al 0,1
      })
    }
  })
  it('la bajada tras un puerto de 12 km al 7 % mide 10 km (clamp de 840/55) y su media queda en [3; 6,5]', () => {
    const sk = SKELETONS.et_reina_valle
    for (const seed of semillas(100)) {
      const motivos: Instancia[] = [
        { slot: 0, j: 0, motif: { kind: 'puerto', km: 12, g: 7, forma: 'regular' } },
        { slot: 0, j: 1, motif: { kind: 'puerto', km: 10, g: 6, forma: 'regular' } },
        { slot: 0, j: 2, motif: { kind: 'puerto', km: 9, g: 5 } },
        { slot: 'meta', j: 0, motif: structuredClone(sk.canonico.at(-1)!) },
      ]
      const p = colocar(
        motivos,
        185,
        sk,
        reqDe(sk.id, ZONAS.alpes, 185),
        routeRng(`pos|b|${seed}`),
      )!
      const b = p.find((x) => x.motif.km === 12)!.bajada!
      expect(b.km).toBe(10)
      entre(-b.g!, 3, 6.5)
      const b9 = p.find((x) => x.motif.km === 9)!.bajada!
      expect(b9.km).toBe(8.2) // 9 × 5 × 10 / 55 = 8,18
      entre(-b9.g!, 3, 6.5)
    }
  })
  it('en un ud_muros no hay bajadas; en et_* y ud_montana* cada puerto y cota no de meta la lleva', () => {
    for (const id of ['ud_muros', 'ud_sterrato', 'ud_circuito'] as const) {
      const sk = SKELETONS[id]
      const p = colocar(
        instanciaDePrueba(sk, ZONAS[zonaDe(sk)], 't0'),
        sk.km[1],
        sk,
        reqDe(id, ZONAS[zonaDe(sk)], sk.km[1]),
        routeRng('pos|t|0'),
      )!
      expect(
        p.every((x) => x.bajada === undefined),
        id,
      ).toBe(true)
    }
    for (const id of ['ud_montana', 'et_media_valle', 'et_reina_alto_largo'] as const) {
      const sk = SKELETONS[id]
      const p = colocar(
        instanciaDePrueba(sk, ZONAS[zonaDe(sk)], 't0'),
        sk.km[1],
        sk,
        reqDe(id, ZONAS[zonaDe(sk)], sk.km[1]),
        routeRng('pos|t|0'),
      )!
      for (const x of p)
        if (x.motif.kind === 'puerto' || x.motif.kind === 'cota')
          expect(x.bajada?.kind, `${id} ${x.motif.kind}`).toBe('descenso')
    }
  })
  it('devuelve null cuando los enlaces no llegan al 12 % (V10 antes de dibujar)', () => {
    const sk = SKELETONS.et_reina_encadenada
    const motivos: Instancia[] = [
      ...[14, 12, 14, 11].map((km, j): Instancia => ({
        slot: 0,
        j,
        motif: { kind: 'puerto', km, g: 8, firma: true },
      })),
      { slot: 'meta', j: 0, motif: structuredClone(sk.canonico.at(-1)!) },
    ]
    expect(
      colocar(motivos, 95, sk, reqDe(sk.id, ZONAS.dolomitas, 95), routeRng('pos|t|1')),
    ).toBeNull()
  })
  it('recorta la dificultad no firma más larga hasta dejar el 12 % de enlace, sin tirar dados', () => {
    const sk = SKELETONS.et_reina_encadenada // ventana ancha y puertos pegados: cabe tras recortar
    const motivos: Instancia[] = [
      { slot: 0, j: 0, motif: { kind: 'puerto', km: 20, g: 8 } },
      { slot: 0, j: 1, motif: { kind: 'puerto', km: 14, g: 8 } },
      { slot: 0, j: 2, motif: { kind: 'puerto', km: 12, g: 8 } },
      { slot: 'meta', j: 0, motif: structuredClone(sk.canonico.at(-1)!) }, // alto_corto de 7 km
    ]
    // Con bajadas de 10 km: 30 + 24 + 22 + 7 = 83 km que no son enlace en 90; el 12 % pide ≤ 79,2.
    let llamadas = 0
    const base = routeRng('pos|recorte')
    const p = colocar(motivos, 90, sk, reqDe(sk.id, ZONAS.dolomitas, 90), () => {
      llamadas++
      return base()
    })
    expect(p).not.toBeNull()
    expect(llamadas).toBe(3 + 3) // tres f y tres inicios: el recorte no tira
    expect(90 - p!.reduce((a, x) => a + kmNoEnlace(x), 0)).toBeGreaterThanOrEqual(0.12 * 90 - 1e-6)
    expect(
      p!
        .map((x) => x.motif.km)
        .slice(0, 3)
        .sort((a, b) => a - b),
    ).toEqual([12, 14, 16.2]) // solo el de 20 se recortó
    expect(motivos[0]!.motif.km).toBe(20) // la entrada no se toca
  })
  it('circuito: la aproximación mide ≥ 1,5 km, el circuito de firma no cambia de km y acaba en la meta', () => {
    for (const id of ['ud_circuito', 'nc_ruta', 'ud_criterium'] as const) {
      const sk = SKELETONS[id]
      const geo = ZONAS[zonaDe(sk)]
      for (const seed of semillas(50)) {
        const motivos = instanciaDePrueba(sk, geo, seed)
        // El km de la etapa sale del circuito de firma (§8.4): la aproximación es lo que queda delante,
        // 3 km aquí, dentro de la ventana [0; 0,1] de ud_criterium.
        const km = r1(motivos.reduce((a, m) => a + kmTotal(m.motif), 0) + 3)
        const p = colocar(motivos, km, sk, reqDe(id, geo, km), routeRng(`pos|c|${seed}`))!
        const c = p.find((x) => x.motif.kind === 'circuito')!
        expect(c.inicioKm, `${id} ${seed}`).toBeGreaterThanOrEqual(ARCH.colocacion.enlaceMinimo)
        expect(c.finKm).toBeCloseTo(p.at(-1)!.inicioKm, 6) // paso 5: sin enlace entre el circuito y la meta
        expect(c.finKm - c.inicioKm).toBeCloseTo(
          kmTotal(motivos.find((m) => m.motif.kind === 'circuito')!.motif),
          6,
        )
      }
    }
  })
  it('transición: con desde = meseta ninguna dificultad empieza antes del 40 %', () => {
    const sk = SKELETONS.et_media_alto
    const geo = ZONAS.cantabrico
    for (const seed of semillas(200)) {
      const km = 170
      const p = colocar(
        instanciaDePrueba(sk, geo, seed),
        km,
        sk,
        reqDe(sk.id, geo, km, { desde: 'meseta' }),
        routeRng(`pos|tr|${seed}`),
      )
      if (p === null) continue
      for (const x of p)
        expect(x.inicioKm / km, seed).toBeGreaterThanOrEqual(ARCH.itinerario.transicion - 1e-9)
    }
  })
  it('orden de pos: colocar llama nBajadas + nColocables veces y las f van antes que los inicios', () => {
    for (const { sk, geo, km, seed } of casos().slice(0, 320)) {
      const motivos = instanciaDePrueba(sk, geo, seed)
      let llamadas = 0
      const base = routeRng(`pos|n|${seed}`)
      const p = colocar(motivos, km, sk, reqDe(sk.id, geo, km), () => {
        llamadas++
        return base()
      })
      if (p === null) continue
      const colocables = p.filter((x) => x.slot !== 'meta')
      const nBajadas = colocables.filter((x) => x.bajada !== undefined).length
      expect(llamadas, `${sk.id} ${seed}`).toBe(nBajadas + colocables.length)
    }
    // Las f primero: cambiar la tirada del primer inicio no cambia ninguna bajada.
    const sk = SKELETONS.et_reina_alto_largo
    const motivos = instanciaDePrueba(sk, ZONAS.pirineos, 't7')
    const nB = motivos.filter((m) => m.motif.kind === 'puerto').length
    const conCambio = (valor: number) => {
      let i = 0
      const base = routeRng('pos|orden')
      return colocar(motivos, 180, sk, reqDe(sk.id, ZONAS.pirineos, 180), () => {
        const v = base()
        return i++ === nB ? valor : v
      })!
    }
    expect(conCambio(0.01).map((x) => x.bajada)).toEqual(conCambio(0.99).map((x) => x.bajada))
  })
  it('colocar no cambia las separaciones de ningún compuesto: deepEqual de hijos y separaciones', () => {
    for (const id of [
      'ud_muros',
      'ud_adoquin',
      'ud_circuito',
      'nc_ruta',
      'et_media_muro',
    ] as const) {
      const sk = SKELETONS[id]
      const geo = ZONAS[zonaDe(sk)]
      const motivos = instanciaDePrueba(sk, geo, 't3')
      // Con circuito de firma el km sale de él (§8.4) y la aproximación cabe en su ventana; sin él, km[1].
      const conFirma = motivos.some((m) => m.motif.kind === 'circuito' && m.motif.firma === true)
      const km = conFirma ? r1(motivos.reduce((a, m) => a + kmTotal(m.motif), 0) + 3) : sk.km[1]
      const p = colocar(motivos, km, sk, reqDe(id, geo, km), routeRng('pos|sep'))!
      for (const m of motivos.filter((x) => x.motif.hijos)) {
        const x = p.find((q) => q.slot === m.slot && q.motif.kind === m.motif.kind)!
        expect(x.motif.hijos).toEqual(m.motif.hijos)
        expect(x.motif.separaciones).toEqual(m.motif.separaciones)
      }
    }
  })
  it('es pura: misma entrada y misma corriente, misma colocación; la entrada no se toca', () => {
    const sk = SKELETONS.ud_montana
    const motivos = instanciaDePrueba(sk, ZONAS.alpes, 't9')
    const copia = structuredClone(motivos)
    const a = colocar(motivos, 230, sk, reqDe(sk.id, ZONAS.alpes, 230), routeRng('pos|p'))
    const b = colocar(motivos, 230, sk, reqDe(sk.id, ZONAS.alpes, 230), routeRng('pos|p'))
    expect(a).toEqual(b)
    expect(motivos).toEqual(copia)
  })
})

describe('colocarPlantilla y kmNoEnlace', () => {
  it('coloca la canónica por acumulación: enlaces como huecos, bajadas colgadas, meta al final', () => {
    for (const id of SKELETON_IDS) {
      const plantilla = SKELETONS[id].canonico
      const p = colocarPlantilla(plantilla)
      const total = plantilla.reduce((a, m) => a + kmTotal(m), 0)
      expect(p.at(-1)!.slot, id).toBe('meta')
      expect(p.at(-1)!.finKm, id).toBeCloseTo(total, 6)
      expect(p.filter((x) => x.slot !== 'meta').map((x) => x.slot)).toEqual(
        p.slice(0, -1).map((_, i) => i),
      ) // índice corrido de dificultad
      const sinHuecos = plantilla.filter(
        (m) => m.kind !== 'enlace' && m.kind !== 'expuesto' && m.kind !== 'descenso',
      )
      expect(p.map((x) => x.motif)).toEqual(sinHuecos)
      expect(p.filter((x) => x.bajada).length).toBe(
        plantilla.filter((m) => m.kind === 'descenso').length,
      )
    }
  })
  it('kmNoEnlace: dificultad con su bajada; de un compuesto sus hijos; de la meta su cotaFinal o su sector', () => {
    const P = (motif: Motif, bajada?: Motif): Placed => ({
      motif,
      slot: 0,
      inicioKm: 0,
      finKm: 0,
      ...(bajada ? { bajada } : {}),
    })
    expect(
      kmNoEnlace(P({ kind: 'puerto', km: 12, g: 7 }, { kind: 'descenso', km: 10, g: -6 })),
    ).toBe(22)
    expect(kmNoEnlace(P({ kind: 'enlace', km: 40 }))).toBe(0)
    expect(kmNoEnlace(P({ kind: 'tendida', km: 20, g: 2 }))).toBe(0)
    expect(kmNoEnlace(P({ kind: 'expuesto', km: 30 }))).toBe(0)
    const cad = SKELETONS.ud_muros.canonico[1]! // 5 muros de 5,1 km y 15 km de separaciones
    expect(kmNoEnlace(P(cad))).toBeCloseTo(5.1, 9)
    const circ = SKELETONS.ud_circuito.canonico[1]! // 16 vueltas × (0,4 + 1,0)
    expect(kmNoEnlace(P(circ))).toBeCloseTo(16 * 1.4, 9)
    expect(kmNoEnlace(P(SKELETONS.ud_montana.canonico.at(-1)!))).toBe(2.7) // cotaFinal
    expect(kmNoEnlace(P(SKELETONS.ud_adoquin.canonico.at(-1)!))).toBe(0.3) // el sector de meta
    expect(kmNoEnlace(P(SKELETONS.ud_esprint.canonico.at(-1)!))).toBe(0) // esprint
  })
})
