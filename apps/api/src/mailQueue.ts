/**
 * LA COLA DE CORREO: LO QUE better-auth MANDA DESPUÉS DE RESPONDER (docs/cuenta.md §18, PR 3).
 *
 * Con `advanced.backgroundTasks.handler`, better-auth deja de esperar al correo antes de responder:
 * el enlace de recuperación o de verificación sale cuando la respuesta ya se ha ido, y el tiempo de
 * la respuesta no dice si la cuenta existe. El precio es que un despliegue puede matar el proceso
 * con un correo a medias; por eso `track` apunta cada promesa y `drain` espera a todas, y el arranque
 * (`index.ts`) llama a `drain` al recibir `SIGTERM`.
 */
export interface MailQueue {
  /** Apunta una tarea en segundo plano. Nunca lanza: un fallo se registra y se olvida. */
  track: (promise: Promise<unknown>) => void
  /** Espera a que terminen todas las tareas apuntadas, también las que se apunten mientras tanto. */
  drain: () => Promise<void>
  /** Cuántas tareas siguen en marcha. */
  readonly pending: number
}

export function createMailQueue(
  onError: (err: unknown) => void = (err) => console.error('mail task failed', err),
): MailQueue {
  const enMarcha = new Set<Promise<unknown>>()
  return {
    track(promise) {
      const tarea: Promise<unknown> = promise.catch(onError).finally(() => enMarcha.delete(tarea))
      enMarcha.add(tarea)
    },
    async drain() {
      while (enMarcha.size > 0) await Promise.allSettled([...enMarcha])
    },
    get pending() {
      return enMarcha.size
    },
  }
}

/** La cola del proceso: la que usa `createAuth` si no le dan otra y la que vacía `SIGTERM`. */
export const mailQueue = createMailQueue()
