import { describe, expect, it } from 'vitest'
import { createMailQueue } from './mailQueue.js'

describe('mailQueue: lo que se manda después de responder', () => {
  it('drain espera a todo lo apuntado, también a lo que se apunta mientras espera', async () => {
    const cola = createMailQueue()
    const hecho: string[] = []
    const tarde = (nombre: string, ms: number) =>
      new Promise<void>((resolve) =>
        setTimeout(() => {
          hecho.push(nombre)
          resolve()
        }, ms),
      )
    cola.track(tarde('uno', 20))
    cola.track(tarde('dos', 5).then(() => cola.track(tarde('tres', 20))))
    expect(cola.pending).toBe(2)
    await cola.drain()
    expect(hecho.sort()).toEqual(['dos', 'tres', 'uno'])
    expect(cola.pending).toBe(0)
  })

  it('un correo que falla no rompe la cola ni sale como rechazo sin atender', async () => {
    const errores: unknown[] = []
    const cola = createMailQueue((err) => errores.push(err))
    cola.track(Promise.reject(new Error('resend caído')))
    await cola.drain()
    expect(errores).toHaveLength(1)
  })
})
