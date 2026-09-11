import { ATTRIBUTES, type Attribute, seededRng } from '@cyclingstar/shared'
import { describe, expect, it } from 'vitest'
import { eff0, initialEnergy } from '../banister.js'
import { generateNpcRider, sampleNpcAge } from '../world/npc.js'
import { matchCount } from './physics.js'
import { stageSeed } from './rng.js'
import { simulateStage } from './simulate.js'
import type { StageOrders, StageProfile, StageRider } from './types.js'
import type { RaceContext } from './views.js'

/**
 * INVARIANTE 74: CON EL CONTEXTO PUESTO Y QUITADO, LA CARRERA ES LA MISMA
 * (docs/tactica.md paso 2 y paso 4).
 *
 * Los pasos 2 y 4 meten en `StageInput` tres contextos, las clasificaciones secundarias y la memoria
 * de la carrera, **y ninguno de los cuatro racimos que los van a leer existe todavía**. La condición
 * de esos pasos no es que algo funcione: es que **nada cambie**.
 *
 * Y hace falta comprobarlo, no suponerlo. Un campo nuevo puede cambiar la conducta sin que nadie lo
 * lea —basta con que entre en un orden de iteración, en una clave de mapa o en un `JSON.stringify`
 * que siembre un dado— y ése es exactamente el defecto que no se ve en una revisión.
 *
 * Cuando el paso 6 empiece a leer el contexto, esta prueba **tiene que ponerse roja**, y eso también
 * es información: significará que el contexto por fin decide algo.
 */

const PERFIL: StageProfile = {
  segments: [
    { km: 50, tipo: 'llano' },
    { km: 9, tipo: 'puerto' },
    { km: 12, tipo: 'descenso' },
    { km: 40, tipo: 'llano' },
  ],
  banners: [
    { km: 30, tipo: 'meta_volante' },
    { km: 59, tipo: 'cima' },
  ],
}

const ORDENES: StageOrders = {
  role: 'libre',
  mentality: 'oportunista',
  contestSprints: true,
  contestClimbs: true,
}

function campo(seed: string): StageRider[] {
  const rng = seededRng(`${seed}:campo`)
  const out: StageRider[] = []
  for (let t = 0; t < 8; t++) {
    for (let k = 0; k < 6; k++) {
      const riderId = `c-${t}-${k}`
      const g = generateNpcRider(`${seed}:${riderId}`, {
        division: 'PRS',
        vocation: 'fondo',
        age: sampleNpcAge(`${seed}:${riderId}:edad`, { v2: true }),
        v2: true,
      })
      const ctl = 60 + 15 * rng()
      const atl = 50 + 12 * rng()
      const tsb = ctl - atl
      const eff = {} as Record<Attribute, number>
      for (const a of ATTRIBUTES) eff[a] = eff0(g.attributes[a], ctl, tsb, 'sano', 60)
      out.push({
        riderId,
        eff0: eff,
        energy: initialEnergy(ctl, tsb, 'sano'),
        matches: matchCount(eff, tsb, false),
        tsb,
        orders: ORDENES,
        gcDeficitSeconds: t * 30,
        fragility: g.hidden.fragility,
        teamId: `c-team-${t}`,
      })
    }
  }
  return out
}

/** Un contexto POBLADO de verdad: si fuera vacío, la prueba no probaría nada. */
const CONTEXTO: RaceContext = {
  stageDay: 3,
  totalStages: 5,
  shape: {
    totalKm: 111,
    kmDone: 0,
    nextClimbKm: 59,
    lastClimbKm: 59,
    valleyAfterLastClimbKm: 52,
    daysLeft: 3,
  },
  standings: new Map([
    ['c-0-0', [{ kind: 'puntos' as const, rank: 1, points: 40, toNextRank: 0 }]],
    ['c-1-0', [{ kind: 'montana' as const, rank: 2, points: 12, toNextRank: 5 }]],
  ]),
  memory: { debts: [], winners: ['c-2-0'], satisfiedTeams: ['c-3'] },
}

const huella = (riders: StageRider[], race?: RaceContext): string => {
  const out = simulateStage(
    { profile: PERFIL, riders, ...(race ? { race } : {}) },
    stageSeed({ worldSeed: 'ctx', raceId: 'ctx-race', stageDay: 3, engineVersion: 1 }),
  )
  return out.results.map((r) => `${r.puesto}:${r.riderId}:${r.tiempoS}`).join(',')
}

describe('engine: el contexto de carrera viaja y NADIE lo lee', () => {
  it('la etapa sale IDÉNTICA con contexto y sin él', () => {
    const riders = campo('ctx')
    expect(huella(riders, CONTEXTO)).toBe(huella(riders))
  })

  it('…y también con las clasificaciones metidas en cada corredor', () => {
    // `StageRider.standings` es el otro campo que el paso 4 añade. Mismo contrato: viaja y no decide.
    const riders = campo('ctx')
    const conStandings = riders.map((r) => ({
      ...r,
      standings: [{ kind: 'puntos' as const, rank: 3, points: 18, toNextRank: 4 }],
    }))
    expect(huella(conStandings)).toBe(huella(riders))
  })

  it('cambiar el contexto ENTERO tampoco mueve un segundo', () => {
    // El control del control: si la prueba de arriba pasara porque el contexto es inerte por ser
    // siempre el mismo, esto lo cazaría.
    const riders = campo('ctx')
    const otro: RaceContext = {
      ...CONTEXTO,
      stageDay: 1,
      memory: { debts: [], winners: [], satisfiedTeams: [] },
      standings: new Map(),
    }
    expect(huella(riders, otro)).toBe(huella(riders, CONTEXTO))
  })
})
