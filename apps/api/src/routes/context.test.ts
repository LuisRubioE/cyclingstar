import type { FastifyRequest } from 'fastify'
import { describe, expect, it } from 'vitest'
import type { Auth } from '../auth.js'
import { createCurrentUserId, isPastSessionCeiling } from './context.js'

const DIA = 86_400_000

/** Un doble de better-auth con una sesión abierta hace `dias` días; apunta lo que se borra. */
function authCon(dias: number, borradas: string[]): Auth {
  return {
    api: {
      getSession: async () => ({
        user: { id: 'u1' },
        session: { token: 'tok', createdAt: new Date(Date.now() - dias * DIA) },
      }),
    },
    $context: Promise.resolve({
      internalAdapter: { deleteSession: async (token: string) => void borradas.push(token) },
    }),
  } as unknown as Auth
}

const peticion = { headers: {} } as FastifyRequest

describe('el techo de 90 días de la sesión (docs/cuenta.md §6.1)', () => {
  it('isPastSessionCeiling: 90 días aún valen, 90 y uno no', () => {
    const ahora = Date.now()
    expect(isPastSessionCeiling(new Date(ahora - 90 * DIA + 1000), ahora)).toBe(false)
    expect(isPastSessionCeiling(new Date(ahora - 91 * DIA), ahora)).toBe(true)
  })

  it('createCurrentUserId: la sesión que pasó el techo cuenta como ninguna y se borra', async () => {
    const borradas: string[] = []
    expect(await createCurrentUserId(authCon(91, borradas))(peticion)).toBeNull()
    expect(borradas).toEqual(['tok'])
    expect(await createCurrentUserId(authCon(89, borradas))(peticion)).toBe('u1')
    expect(borradas).toEqual(['tok'])
  })
})
