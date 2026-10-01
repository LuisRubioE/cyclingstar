import { readFileSync } from 'node:fs'
import { NPC } from '@cyclingstar/engine'
import { ARCHETYPE_CEILING_OFFSETS, ATTRIBUTES } from '@cyclingstar/shared'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { riderAttrs, riderHidden, riders, teams, users, worlds } from './schema.js'
import { type TestDb, startTestDb } from './testDb.js'

/**
 * La migración 0043: los topes del arquetipo de la génesis v2, aplicados una vez a los BOTS del mundo
 * vivo, que nació con la génesis legacy y cuyos techos reabrió la 0032 sin mirar el arquetipo.
 *
 * Dos cosas se comprueban. Que la lista de pares escrita en el SQL es la que dicen las constantes
 * (si un offset cambia, este test lo avisa). Y que el SQL hace lo que dice sobre una base real: baja
 * a 83 techo y atributo de lo que el arquetipo penaliza, no toca lo demás, no toca a los humanos y
 * no sube a nadie.
 */

const SQL = readFileSync(new URL('../drizzle/0043_topes_de_arquetipo.sql', import.meta.url), 'utf8')
const CAP = NPC.ceilingCapOffTrade

describe('migración 0043: topes del arquetipo', () => {
  it('la lista de pares del SQL es la de ARCHETYPE_CEILING_OFFSETS (offset ≤ −14, sin TAC)', () => {
    const esperados = new Set<string>()
    for (const [arq, offsets] of Object.entries(ARCHETYPE_CEILING_OFFSETS)) {
      for (const attr of ATTRIBUTES) {
        if (attr !== 'TAC' && offsets[attr] <= -14) esperados.add(`${arq}:${attr}`)
      }
    }
    // Los dos UPDATE llevan la misma lista.
    const bloques = SQL.split('--> statement-breakpoint')
    expect(bloques).toHaveLength(2)
    for (const bloque of bloques) {
      const escritos = new Set(
        [...bloque.matchAll(/\('(\w+)', '(\w+)'\)/g)].map((m) => `${m[1]}:${m[2]}`),
      )
      expect(escritos).toEqual(esperados)
    }
    expect(CAP).toBe(83)
  })

  describe('sobre una base real', () => {
    let t: TestDb
    const ids = { bot: '', humano: '', velocista: '' }

    beforeAll(async () => {
      t = await startTestDb()
      const [world] = await t.db
        .insert(worlds)
        .values({ worldSeed: 'topes', engineVersion: 1 })
        .returning({ id: worlds.id })
      const [team] = await t.db
        .insert(teams)
        .values({
          worldId: world!.id,
          name: 'Equipo',
          division: 'PRS',
          philosophy: 'general',
          jerseySeed: 'j',
          country: 'DE',
        })
        .returning({ id: teams.id })
      const [user] = await t.db
        .insert(users)
        .values({ email: 'jugador@example.com' })
        .returning({ id: users.id })
      const base = {
        worldId: world!.id,
        teamId: team!.id,
        country: 'PT',
        gender: 'M' as const,
        birthSeason: -3,
      }
      const creados = await t.db
        .insert(riders)
        .values([
          { ...base, name: 'Bot crono', archetype: 'crono' as const, faceSeed: 'a' },
          {
            ...base,
            name: 'Humano crono',
            archetype: 'crono' as const,
            faceSeed: 'b',
            userId: user!.id,
          },
          { ...base, name: 'Bot velocista', archetype: 'velocidad' as const, faceSeed: 'c' },
        ])
        .returning({ id: riders.id })
      ids.bot = creados[0]!.id
      ids.humano = creados[1]!.id
      ids.velocista = creados[2]!.id

      // Los tres con el mismo perfil de «monstruo»: CRI 95 y SPR 90,4, techos por encima.
      const attrs: Record<string, number> = { CRI: 95.1, SPR: 90.4, MON: 70, TAC: 86 }
      const techos: Record<string, number> = { CRI: 96, SPR: 94, MON: 88, TAC: 90 }
      for (const id of Object.values(ids)) {
        await t.db
          .insert(riderAttrs)
          .values(ATTRIBUTES.map((attr) => ({ riderId: id, attr, value: attrs[attr] ?? 60 })))
        await t.db.insert(riderHidden).values({
          riderId: id,
          talent: 50,
          ceilings: Object.fromEntries(ATTRIBUTES.map((a) => [a, techos[a] ?? 70])),
          fragility: 1,
          peakAge: 28,
          declineAge: 33,
        })
      }

      for (const sentencia of SQL.split('--> statement-breakpoint')) {
        await t.client.unsafe(sentencia)
      }
    }, 180_000)

    afterAll(async () => {
      await t?.close()
    })

    const leer = async (id: string) => {
      const attrs = await t.db.select().from(riderAttrs).where(eq(riderAttrs.riderId, id))
      const [hidden] = await t.db.select().from(riderHidden).where(eq(riderHidden.riderId, id))
      return {
        attr: Object.fromEntries(attrs.map((a) => [a.attr, a.value])),
        techo: hidden!.ceilings,
      }
    }

    it('al bot crono le baja a 83 el esprint (atributo y techo) y la montaña solo de techo', async () => {
      const r = await leer(ids.bot)
      expect(r.attr.SPR).toBe(CAP)
      expect(r.techo.SPR).toBe(CAP)
      // MON penaliza (−16): el techo 88 baja a 83; el atributo, 70, ya estaba debajo y no se mueve.
      expect(r.techo.MON).toBe(CAP)
      expect(r.attr.MON).toBeCloseTo(70)
      // Lo suyo no se toca: CRI sigue en 95,1 con techo 96.
      expect(r.attr.CRI).toBeCloseTo(95.1)
      expect(r.techo.CRI).toBe(96)
      // TAC es oficio: fuera de la regla.
      expect(r.attr.TAC).toBeCloseTo(86)
      expect(r.techo.TAC).toBe(90)
    })

    it('al corredor de un jugador no se le toca', async () => {
      const r = await leer(ids.humano)
      expect(r.attr.SPR).toBeCloseTo(90.4)
      expect(r.techo.SPR).toBe(94)
    })

    it('al velocista se le recorta la crono, no el esprint', async () => {
      const r = await leer(ids.velocista)
      expect(r.attr.SPR).toBeCloseTo(90.4)
      expect(r.techo.SPR).toBe(94)
      expect(r.attr.CRI).toBe(CAP)
      expect(r.techo.CRI).toBe(CAP)
    })
  })
})
