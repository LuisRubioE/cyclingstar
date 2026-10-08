import { describe, expect, it } from 'vitest'
import { broadcastChunkKey, broadcastHeadKey } from './api/broadcast'
import { STALE_TIME, createQueryClient } from './queryClient'

/**
 * LOS DEFECTOS DE LA CACHÉ DE LA RETRANSMISIÓN (docs/retransmision.md §14.11; paso 3b): un tramo se
 * guarda para siempre y ninguna de sus consultas se reintenta sola, porque sus fallos los resuelve el
 * reproductor (o son la puerta y el interruptor, que no cambian por repetir).
 */
describe('web: createQueryClient', () => {
  const client = createQueryClient()

  it('un tramo no caduca nunca ni se reintenta (14-m)', () => {
    expect(
      client.getQueryDefaults([...broadcastChunkKey('race-france', 7, 2, 0, 9000)]),
    ).toMatchObject({ staleTime: Infinity, retry: false })
  })

  it('la cabecera y el acta no se reintentan: un 403 o un 404 no cambian por repetirlos', () => {
    expect(
      client.getQueryDefaults([...broadcastHeadKey('race-france', 7, undefined, false, '9.1')]),
    ).toMatchObject({
      retry: false,
    })
    expect(client.getQueryDefaults(['stage-report', 'race-france', 7])).toMatchObject({
      retry: false,
    })
  })

  it('lo de antes sigue igual: la ruta de etapa, con el tiempo del mundo', () => {
    expect(client.getQueryDefaults(['stage-replay', 'race-france', 7])).toEqual({
      staleTime: STALE_TIME.world,
    })
  })
})

describe('web: el horizonte en la caché (docs/retransmision.md §10.9, regla 2; paso 9a)', () => {
  it('[horizon] caduca en el acto y se pide al enfocar la ventana; las demás, no', () => {
    const client = createQueryClient()
    expect(client.getQueryDefaults(['horizon'])).toMatchObject({
      staleTime: 0,
      refetchOnWindowFocus: true,
    })
    expect(client.getQueryDefaults(['stage-replay', 'race-france', 7])).not.toHaveProperty(
      'refetchOnWindowFocus',
    )
  })
})
