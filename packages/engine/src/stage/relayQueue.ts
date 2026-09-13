/**
 * EL TURNO DE RELEVOS COMO UNA COLA (docs/tactica.md R18.1).
 *
 * Hoy `relayTurn` **se rehace entera desde cero cada bloque de cien metros y en cada grupo**, por
 * puntuación de deber con un desempate fijo. No hay memoria de quién acaba de tirar, no hay relevo
 * hacia atrás y no hay duración: la constante que contaba el apartarse (`pullOffFrontShare`) se
 * retiró y no se sustituyó por nada.
 *
 * La consecuencia es la que se ve en la telemetría: **los mismos hombres van al frente kilómetro
 * tras kilómetro** hasta que la frescura les cambia el orden por sí sola. Un relevo no es eso. Un
 * relevo es una cola: das tu turno, te apartas, te vas al final y no vuelves a cabeza hasta que la
 * cola gire entera.
 *
 * Esta pieza NO decide quién quiere tirar —eso lo sigue decidiendo el deber de `relayTurn`, con sus
 * tres listones y su suelo de rescate, que están medidos y no se tocan—. Decide **en qué orden y
 * durante cuánto**, que es lo que faltaba.
 */
import { STAGE } from '../constants.js'

/** El estado persistente del turno de un grupo. Vive entre bloques; es lo que hoy no existe. */
export interface RelayQueue {
  /** La cola, en orden. El de cabeza es el que lleva más tiempo dando la cara. */
  order: string[]
  /** Km que le quedan de turno a cada uno de los que están dando la cara ahora mismo. */
  kmLeft: Map<string, number>
}

export function emptyQueue(): RelayQueue {
  return { order: [], kmLeft: new Map() }
}

/** Cuánto dura un turno según el terreno: en cuesta se relevan antes, y con viento de lado más. */
export function pullKmFor(terreno: 'llano' | 'subida' | 'abanico'): number {
  return STAGE.teamPlay.turnPullKm[terreno]
}

/**
 * AVANZA LA COLA UN BLOQUE y devuelve **quiénes pagan viento ahora**.
 *
 * - `elegibles` son los que el deber ya ha dicho que quieren tirar (la pertenencia se recalcula por
 *   bloque, como hoy; lo que persiste es el ORDEN).
 * - `techo` es cuántos caben delante, que lo decide `relayTurn` con su ritmo y su tope de veinte.
 *
 * El que agota su turno **sale por delante y se va al final de la cola**, y entra el siguiente. Con
 * techo 1 —un grupeto, una pareja— la ventana es un hombre y la cola es literal.
 */
export function advanceQueue(
  q: RelayQueue,
  elegibles: readonly string[],
  techo: number,
  dx: number,
  terreno: 'llano' | 'subida' | 'abanico',
): Set<string> {
  const vivos = new Set(elegibles)
  // 1. Fuera los que ya no están (se descolgaron, atacaron, acabaron su trabajo).
  q.order = q.order.filter((id) => vivos.has(id))
  for (const id of [...q.kmLeft.keys()]) if (!vivos.has(id)) q.kmLeft.delete(id)
  // 2. Dentro los nuevos, POR EL FINAL: el que acaba de decidir que colabora no entra de cabeza.
  //    El orden de llegada es el de `elegibles`, que `relayTurn` ya deja ordenado por deber con
  //    desempate total por id, así que esto es determinista.
  const enCola = new Set(q.order)
  for (const id of elegibles) if (!enCola.has(id)) q.order.push(id)
  if (q.order.length === 0) return new Set()

  const ventana = Math.max(1, Math.min(techo, q.order.length))
  // 3. Los de la ventana pagan viento y gastan turno. El que lo agota se va al final.
  const alFinal: string[] = []
  const dando = q.order.slice(0, ventana)
  for (const id of dando) {
    const queda = (q.kmLeft.get(id) ?? pullKmFor(terreno)) - dx
    if (queda <= 0) {
      q.kmLeft.delete(id)
      alFinal.push(id)
    } else {
      q.kmLeft.set(id, queda)
    }
  }
  if (alFinal.length > 0) {
    q.order = [...q.order.filter((id) => !alFinal.includes(id)), ...alFinal]
  }
  // 4. Y los que pagan viento ESTE bloque son los de la ventana de después de rotar: si el de
  //    cabeza acaba de apartarse, el que entra ya está dando la cara, no en el bloque siguiente.
  return new Set(q.order.slice(0, Math.max(1, Math.min(techo, q.order.length))))
}
