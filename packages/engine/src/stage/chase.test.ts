/**
 * La FUERZA DE LA CAZA (docs/balance.md «v10 — Composición y caza»). Antes esto era un interruptor
 * global —un solo corredor con SPR ≥ 70 y el pelotón entero perseguía a tope— y por eso una
 * continental modesta cazaba igual que una gran vuelta. Aquí se prueba la medida del campo y, sobre
 * todo, que la medida CAMBIA la carrera.
 */
import { describe, expect, it } from 'vitest'
import type { Attribute } from '@cyclingstar/shared'
import { chaseField } from './chase.js'
import { simulateStage } from './simulate.js'
import { stageSeed } from './rng.js'
import type { StageInput, StageOrders, StageRider } from './types.js'

function eff(
  base: number,
  over: Partial<Record<Attribute, number>> = {},
): Record<Attribute, number> {
  return {
    RES: base,
    REC: base,
    LLA: base,
    MON: base,
    COL: base,
    CRI: base,
    SPR: base,
    DES: base,
    PAV: base,
    TAC: base,
    ...over,
  }
}

const orders = (o: Partial<StageOrders>): StageOrders => ({
  role: 'libre',
  mentality: 'reservon',
  contestSprints: false,
  contestClimbs: false,
  ...o,
})

function rider(id: string, over: Partial<StageRider>): StageRider {
  return {
    riderId: id,
    eff0: eff(50),
    energy: 100,
    matches: 4,
    tsb: 0,
    orders: orders({}),
    gcDeficitSeconds: 0,
    ...over,
  }
}

/** Relleno de pelotón: ni rematan ni trabajan para nadie. */
function filler(n: number, base = 56): StageRider[] {
  return Array.from({ length: n }, (_, i) => rider(`pel-${i}`, { eff0: eff(base, { LLA: 62 }) }))
}

/** Un tren: el rematador con su punta de velocidad y `helpers` compañeros a su servicio. */
function train(tag: string, spr: number, helpers: number): StageRider[] {
  const leader = rider(`spr-${tag}`, {
    eff0: eff(58, { SPR: spr, LLA: 68 }),
    orders: orders({ role: 'sprinter', contestSprints: true }),
  })
  const crew = Array.from({ length: helpers }, (_, i) =>
    rider(`lan-${tag}-${i}`, {
      eff0: eff(58, { LLA: 70 }),
      orders: orders({ role: i === 0 ? 'lanzador' : 'gregario', targetRiderId: leader.riderId }),
    }),
  )
  return [leader, ...crew]
}

describe('la fuerza de la caza sale del campo (SPEC 6.9)', () => {
  it('tres rematadores de primer nivel cazan cualquier cosa: fuerza plena', () => {
    const riders = [...train('a', 84, 0), ...train('b', 85, 0), ...train('c', 86, 0), ...filler(31)]
    const field = chaseField(riders)
    expect(field.trains).toHaveLength(3)
    // EXACTAMENTE 1: con la fuerza plena el controlador tiene que dar los mismos números que antes
    // de esta capa, y eso solo se cumple si el escalar no arrastra error de coma flotante.
    expect(field.force).toBe(1)
  })

  it('un rematador suelto y sin equipo apenas organiza nada', () => {
    // El caso del dueño: `race-sharjah`, un sprinter de 78 y 39 rivales que no rematan.
    const riders = [...train('solo', 78, 0), ...filler(39, 60)]
    const field = chaseField(riders)
    expect(field.trains).toHaveLength(1)
    expect(field.force).toBeLessThan(0.4)
    expect(field.force).toBeGreaterThan(0)
  })

  it('el mismo rematador con tren detrás caza mejor que solo', () => {
    const alone = chaseField([...train('solo', 78, 0), ...filler(39, 60)]).force
    const withTeam = chaseField([...train('solo', 78, 3), ...filler(36, 60)]).force
    expect(withTeam).toBeGreaterThan(alone)
  })

  it('un rematador sin opciones reales no cuenta como tren', () => {
    // 72 de punta contra un 88 no gana el sprint ni con tren: su equipo no se pone a tirar.
    const riders = [...train('top', 88, 0), ...train('lejos', 72, 2), ...filler(37)]
    const field = chaseField(riders)
    expect(field.trains.map((t) => t.riderId)).toEqual(['spr-top'])
  })

  it('un campo sin rematadores no organiza ninguna caza', () => {
    const field = chaseField(filler(40, 58))
    expect(field.trains).toHaveLength(0)
    expect(field.force).toBe(0)
  })

  it('la fuerza crece con el número de trenes', () => {
    const one = chaseField([...train('a', 80, 1), ...filler(38)]).force
    const two = chaseField([...train('a', 80, 1), ...train('b', 80, 1), ...filler(36)]).force
    expect(two).toBeGreaterThan(one)
  })
})

describe('un campo flojo deja llegar a la fuga; uno fuerte, no', () => {
  // Es el criterio del dueño: la misma etapa, el mismo número de corredores y las mismas semillas.
  // Lo único que cambia es QUIÉN persigue.
  const profile = {
    segments: [{ km: 150, tipo: 'llano' as const }],
  }
  const baroudeurs = (n: number): StageRider[] =>
    Array.from({ length: n }, (_, i) =>
      rider(`brk-${i}`, {
        eff0: eff(58, { TAC: 62, LLA: 68 }),
        orders: orders({ role: 'cazaetapas', mentality: 'combativo', contestSprints: true }),
      }),
    )

  const weak: StageInput = {
    profile,
    riders: [...train('solo', 78, 0), ...baroudeurs(6), ...filler(33, 58)],
  }
  const strong: StageInput = {
    profile,
    riders: [
      ...train('a', 84, 3),
      ...train('b', 86, 3),
      ...train('c', 85, 3),
      ...baroudeurs(6),
      ...filler(22, 58),
    ],
  }

  const winsFromBreak = (input: StageInput, tag: string, n: number): number => {
    let wins = 0
    for (let i = 0; i < n; i++) {
      const seed = stageSeed({
        worldSeed: `${tag}-${i}`,
        raceId: tag,
        stageDay: 1,
        engineVersion: 1,
      })
      const out = simulateStage(input, seed)
      const meta = out.events.find((e) => e.tipo === 'meta')
      if (meta?.datos?.fuga === 1) wins += 1
    }
    return wins
  }

  it(
    'la fuga llega más veces en la carrera modesta que en la de los cinco trenes',
    { timeout: 120000 },
    () => {
      const runs = 16
      // Las MISMAS semillas para los dos campos: la diferencia no puede venir del azar.
      const weakWins = winsFromBreak(weak, 'caza', runs)
      const strongWins = winsFromBreak(strong, 'caza', runs)
      expect(weakWins).toBeGreaterThan(strongWins)
      // Y el campo fuerte sigue cazando casi siempre: la diferencia entre categorías es el objetivo.
      expect(strongWins).toBeLessThanOrEqual(Math.round(runs * 0.2))
    },
  )
})
