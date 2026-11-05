import { writeFileSync } from 'node:fs'
import { COUNTRIES, KIT_CODES, KIT_MIN_DISTANCE, type KitCode, TORSO } from '@cyclingstar/shared'
import { VISIONS, type View, type Vision } from '@cyclingstar/shared/colorMath'
import { beforeAll, describe, expect, it } from 'vitest'
import { KIT_SIGNALS, kitContrastOk } from './kitConflicts.js'
import { KIT_ALLOWED, KIT_CONFLICTS } from './kitConflicts.generated.js'
import {
  type KitDrawing,
  type KitRaster,
  LEADER_EDGE,
  kitRaster,
  rasterDistance,
} from './kitDistance.js'

/**
 * LA SEÑAL DE CAMPEÓN, MEDIDA (E3, docs/visual.md §9.1, §9.6 y §16.2; 9-h y 9-k; PR 16a). El nacional
 * viste su bandera sin estrella (D-00m), y por eso ningún maillot de equipo puede parecérsele: la reserva
 * de D-00h. Aquí, a 28 px y con la distancia dibujada de `kitDistance.ts`: las 138 señales lejos de todo
 * maillot permitido, el mundial y el continental lejos de los líderes, la reserva de cada maillot que se
 * parece a un nacional y la distancia a la marca de la UCI. Lo que no tiene umbral (un nacional frente a
 * un líder o a otro nacional, porque ni una bandera ni un líder se pueden cambiar) se escribe.
 *
 * Con `KIT_HOJA=<fichero>` escribe además los datos de la hoja de revisión del dueño (D-00f, §9.5), que
 * pinta `node apps/web/scripts/flag-sprite.mjs --hoja <datos> <hoja.html>`.
 */

const SIZE = 28
const VIEWS: readonly View[] = [...VISIONS, 'gray']
const r1 = (x: number) => Math.round(x * 10) / 10
const raster = (drawing: KitDrawing): KitRaster => kitRaster(drawing, SIZE)
const kit = (code: KitCode) => raster({ kind: 'kit', code })
const min4 = (a: KitRaster, b: KitRaster) =>
  Math.min(...VISIONS.map((v) => rasterDistance(a, b, v)))
const fiveViews = (a: KitRaster, b: KitRaster) =>
  Object.fromEntries(VIEWS.map((v) => [v, r1(rasterDistance(a, b, v))])) as Record<View, number>

const signals = new Map(KIT_SIGNALS.map((s) => [s.id, raster(s.drawing)]))
const leaders = KIT_SIGNALS.filter((s) => s.id.startsWith('leader:'))
const nationals = KIT_SIGNALS.filter((s) => /^champion:[A-Z]{2}$/.test(s.id))
const nameOf = new Map(COUNTRIES.map((c) => [c.code, c.name]))
const isNational = (id: string | null) => id !== null && /^champion:[A-Z]{2}$/.test(id)

/**
 * La marca de la UCI, la V0 del mapa 03 §7.2: la silueta blanca con el filete de líder y las cinco bandas
 * de la guía de la UCI (5.3, abril de 2025) de 2 u en el pecho, de y 22 a 32. Nada de esto es
 * asesoramiento jurídico (§9.2).
 */
const UCI_COLORS = ['#0078c8', '#c8143c', '#000000', '#fae100', '#32b432'] as const
const UCI_MARK: KitDrawing = {
  kind: 'layers',
  key: 'uci-v0',
  layers: [
    {
      mode: 'fill',
      shape: { kind: 'path', d: TORSO },
      paint: { kind: 'solid', color: '#ffffff', alpha: 1 },
    },
    {
      mode: 'stroke',
      shape: { kind: 'path', d: TORSO },
      widthU: LEADER_EDGE.widthU,
      paint: { kind: 'solid', color: LEADER_EDGE.color, alpha: LEADER_EDGE.alpha },
    },
    ...UCI_COLORS.map((color, i) => ({
      mode: 'fill' as const,
      shape: { kind: 'rect' as const, x: 14, y: 22 + 2 * i, w: 20, h: 2 },
      paint: { kind: 'solid' as const, color, alpha: 1 },
    })),
  ],
}

/** Una distancia de un maillot a una señal: la menor de las cuatro visiones, cuál, y la de grises. */
interface ToSignal {
  readonly d: number
  readonly vision: Vision
  readonly gray: number
}

describe('db: la señal de campeón y la reserva de D-00h (E3, §9.1 y §9.6)', () => {
  /** Los 547 con contraste frente a las 138 señales, una vez: lo que miden los casos de abajo. */
  const contrast = KIT_CODES.filter(kitContrastOk)
  const matrix = new Map<string, Map<KitCode, ToSignal>>()

  beforeAll(() => {
    for (const signal of KIT_SIGNALS) {
      const s = signals.get(signal.id)!
      const row = new Map<KitCode, ToSignal>()
      for (const code of contrast) {
        const k = kit(code)
        let best: { d: number; vision: Vision } = { d: Number.POSITIVE_INFINITY, vision: 'normal' }
        for (const vision of VISIONS) {
          const d = rasterDistance(k, s, vision)
          if (d < best.d) best = { d, vision }
        }
        const gray = signal.grayCounts ? rasterDistance(k, s, 'gray') : Number.NaN
        row.set(code, { ...best, gray })
      }
      matrix.set(signal.id, row)
    }
  }, 120_000)

  it('las 138 señales, a 10 o más de todo maillot permitido en las cuatro visiones', () => {
    expect(KIT_SIGNALS).toHaveLength(138)
    let worst = { d: Number.POSITIVE_INFINITY, signal: '', code: '' }
    for (const signal of KIT_SIGNALS) {
      const row = matrix.get(signal.id)!
      for (const code of KIT_ALLOWED) {
        const { d, gray } = row.get(code)!
        if (d < worst.d) worst = { d, signal: signal.id, code }
        expect(d, `${code} frente a ${signal.id}`).toBeGreaterThanOrEqual(KIT_MIN_DISTANCE)
        if (signal.grayCounts)
          expect(gray, `${code} frente a ${signal.id}, en grises`).toBeGreaterThanOrEqual(
            KIT_MIN_DISTANCE,
          )
      }
    }
    console.info(
      `champion: el permitido más cercano a una señal, ${worst.code} a ${r1(worst.d)} de ${worst.signal}`,
    )
  })

  it('el mundial y el continental, a 10 o más de los tres líderes (el diseño midió 25,9 y 25,6)', () => {
    for (const id of ['champion:world', 'champion:continental']) {
      const d = Math.min(...leaders.map((l) => min4(signals.get(id)!, signals.get(l.id)!)))
      console.info(`champion: ${id}, a ${r1(d)} del líder más cercano`)
      expect(d).toBeGreaterThanOrEqual(KIT_MIN_DISTANCE)
    }
  })

  it('la reserva de D-00h: todo maillot a menos de 10 de un nacional, reservado en la tabla con su país', () => {
    const byNational = new Set<KitCode>()
    for (const code of contrast) {
      const reserved = KIT_CONFLICTS[code].reserved
      // los que reserva antes un líder, el mundial o el continental no llegan a medirse contra los
      // nacionales (§8.1: las cuentas van en ese orden)
      if (reserved !== null && !isNational(reserved)) continue
      let nearest = { d: Number.POSITIVE_INFINITY, id: '' }
      for (const n of nationals) {
        const { d } = matrix.get(n.id)!.get(code)!
        if (d < nearest.d) nearest = { d, id: n.id }
      }
      if (nearest.d < KIT_MIN_DISTANCE) {
        expect(reserved, code).toBe(nearest.id)
        byNational.add(code)
      } else expect(reserved, code).toBeNull()
    }
    console.info(
      `champion: ${byNational.size} maillots reservados por un nacional (el diseño, con Chromium, 26)`,
    )
    expect(byNational.size).toBeGreaterThan(0)
  })

  it('la marca de la UCI, a la distancia medida o más (el mundial 12,7; el nacional más cercano 14,4)', () => {
    const uci = raster(UCI_MARK)
    const world = rasterDistance(signals.get('champion:world')!, uci, 'normal')
    const nearestNational = Math.min(
      ...nationals.map((n) => rasterDistance(signals.get(n.id)!, uci, 'normal')),
    )
    console.info(
      `champion: a la marca de la UCI, el mundial ${r1(world)} y el nacional más cercano ${r1(nearestNational)}`,
    )
    expect(r1(world)).toBeGreaterThanOrEqual(12.7)
    expect(r1(nearestNational)).toBeGreaterThanOrEqual(14.4)
  })

  it('sin umbral: los nacionales frente a los líderes y entre sí, en las cinco vistas (9-k)', () => {
    let leaderMin = { d: Number.POSITIVE_INFINITY, national: '', leader: '' }
    const grayUnder10: Record<string, string[]> = {}
    for (const n of nationals) {
      for (const l of leaders) {
        const d = min4(signals.get(n.id)!, signals.get(l.id)!)
        if (d < leaderMin.d) leaderMin = { d, national: n.id, leader: l.id }
        if (rasterDistance(signals.get(n.id)!, signals.get(l.id)!, 'gray') < KIT_MIN_DISTANCE)
          (grayUnder10[l.id] ??= []).push(n.id.slice(9))
      }
    }
    const twins: [string, string, number][] = []
    for (const [i, a] of nationals.entries())
      for (const b of nationals.slice(i + 1)) {
        const d = min4(signals.get(a.id)!, signals.get(b.id)!)
        if (d < KIT_MIN_DISTANCE) twins.push([a.id.slice(9), b.id.slice(9), r1(d)])
      }
    twins.sort((x, y) => x[2] - y[2])
    console.info(
      `champion: el nacional más cercano a un líder, ${leaderMin.national} a ${r1(leaderMin.d)} de ${leaderMin.leader}; ` +
        `en grises bajan de 10 ${Object.entries(grayUnder10)
          .map(([l, ns]) => `${ns.length} frente a ${l} (${ns.join(', ')})`)
          .join(', ')}; ` +
        `${twins.length} parejas de gemelas, las más cercanas ${twins
          .slice(0, 6)
          .map((t) => t.join(' '))
          .join('; ')}`,
    )
    expect(twins.length).toBeGreaterThan(0)

    const out = process.env.KIT_HOJA
    if (out === undefined) return
    // los datos de la hoja de revisión (§9.5): cada nacional con su maillot de equipo más cercano antes de
    // la reserva de D-00h (y si la reserva lo quita), su gemela más cercana y los tres líderes en las
    // cinco vistas; y el mundial y el continental con su permitido más cercano
    const beforeD00h = contrast.filter((c) => {
      const reserved = KIT_CONFLICTS[c].reserved
      return reserved === null || isNational(reserved)
    })
    const nearestOf = (id: string, pool: readonly KitCode[]) => {
      const row = matrix.get(id)!
      let best = { code: '' as string, d: Number.POSITIVE_INFINITY, vision: 'normal' as Vision }
      for (const code of pool) {
        const e = row.get(code)!
        if (e.d < best.d) best = { code, d: e.d, vision: e.vision }
      }
      return { ...best, d: r1(best.d) }
    }
    const sheet = nationals.map((n) => {
      const s = signals.get(n.id)!
      let twin = { d: Number.POSITIVE_INFINITY, code: '' }
      for (const m of nationals) {
        if (m.id === n.id) continue
        const d = min4(s, signals.get(m.id)!)
        if (d < twin.d) twin = { d, code: m.id.slice(9) }
      }
      const cc = n.id.slice(9)
      const nearestKit = nearestOf(n.id, beforeD00h)
      return {
        code: cc,
        name: nameOf.get(cc) ?? cc,
        nearestKit: {
          ...nearestKit,
          // la señal que lo quita a los equipos (la reserva de D-00h, este nacional u otro), o null
          reservedBy: KIT_CONFLICTS[nearestKit.code as KitCode].reserved,
        },
        twin: { code: twin.code, d: r1(twin.d) },
        leaders: Object.fromEntries(
          leaders.map((l) => [l.id.slice(7), fiveViews(s, signals.get(l.id)!)]),
        ),
      }
    })
    const champions = ['champion:world', 'champion:continental'].map((id) => ({
      id,
      nearestKit: nearestOf(id, KIT_ALLOWED),
      leaders: Object.fromEntries(
        leaders.map((l) => [l.id.slice(7), fiveViews(signals.get(id)!, signals.get(l.id)!)]),
      ),
    }))
    // los maillots de equipo que la reserva de D-00h quita a los equipos, con el nacional al que se parecen
    const reservedByNationals = KIT_CODES.filter((c) => isNational(KIT_CONFLICTS[c].reserved)).map(
      (c) => [c, KIT_CONFLICTS[c].reserved!.slice(9)],
    )
    writeFileSync(
      out,
      JSON.stringify(
        { size: SIZE, nationals: sheet, champions, twins, reservedByNationals },
        null,
        1,
      ),
    )
  })
})
