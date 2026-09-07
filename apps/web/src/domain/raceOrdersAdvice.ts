import type { Effort, Mentality, StageOrder, StageRole } from '@cyclingstar/shared'

/**
 * LO QUE LA PANTALLA TIENE QUE DECIRTE ANTES DE QUE CORRAS (v58).
 *
 * El dueño: «creo que hay que rediseñar y mejorar el tema de las instrucciones por etapa… no
 * funciona muy bien, y el resultado es casi lo mismo ponga lo que ponga ahí».
 *
 * Medido, la primera mitad de esa frase era literal: dos de las cinco palancas —el esfuerzo y el
 * kilómetro del ataque— no llegaban al motor (arreglado aparte). La segunda mitad es ésta: las que
 * SÍ llegan deciden mucho —el mismo corredor, con las mismas semillas, gana 7 de 16 llanas como
 * `sprinter` y 0 de 16 como `gregario`— pero **la pantalla no lo cuenta**, así que el jugador no
 * tiene forma de saber si lo que ha puesto es una orden o un disparate.
 *
 * Esto no es validación —nada de esto se prohíbe: un sprinter puede intentar la fuga en una reina si
 * quiere— sino lo que le diría un director al leer la hoja: aquí estás pidiendo algo que no encaja.
 */
export interface OrderAdvice {
  /** `warn` es un choque de verdad; `info` es un matiz que conviene saber. */
  level: 'warn' | 'info'
  text: string
}

const MONTAÑA = new Set(['reina', 'media'])

export function orderAdvice(
  order: Pick<
    StageOrder,
    'role' | 'mentality' | 'effort' | 'triggerKm' | 'targetRiderId' | 'contestSprints'
  >,
  stage: { kind: string; km: number; timeTrial: boolean },
): OrderAdvice[] {
  const out: OrderAdvice[] = []
  if (stage.timeTrial) return out

  // 1. El rol contra el terreno: lo que se juega hoy no lo decides tú, lo decide el recorrido.
  if (order.role === 'sprinter' && MONTAÑA.has(stage.kind)) {
    out.push({
      level: 'warn',
      text: 'A sprinter has nothing to wait for on a mountain day — the finish will be decided up the road.',
    })
  }
  if (order.role === 'lanzador' && MONTAÑA.has(stage.kind)) {
    out.push({
      level: 'warn',
      text: 'There is no lead-out on a mountain finish: your man will be alone long before the line.',
    })
  }
  if (order.role === 'sprinter' && !order.contestSprints) {
    out.push({
      level: 'info',
      text: 'You are riding as a sprinter but skipping the intermediate sprints — the points jersey is decided there too.',
    })
  }

  // 2. Los roles que necesitan a alguien y no lo tienen: sin objetivo, el rol no significa nada.
  if (order.role === 'lanzador' && !order.targetRiderId) {
    out.push({ level: 'warn', text: 'A lead-out rider with nobody to lead out just rides.' })
  }
  if (order.role === 'gregario' && !order.targetRiderId) {
    out.push({
      level: 'warn',
      text: 'Pick the teammate you are working for, or this is just a hard day.',
    })
  }
  if (order.role === 'marcador' && !order.targetRiderId) {
    out.push({
      level: 'warn',
      text: 'Marking nobody in particular is the same as riding your own race.',
    })
  }

  // 3. El kilómetro del ataque, ahora que de verdad significa algo (v58).
  if (order.triggerKm != null) {
    if (order.triggerKm > stage.km) {
      out.push({
        level: 'warn',
        text: `Your attack is set past the finish (km ${order.triggerKm} of a ${Math.round(stage.km)} km stage).`,
      })
    } else if (order.triggerKm > stage.km - 3) {
      out.push({
        level: 'info',
        text: 'That is inside the last three kilometres: it is a sprint, not a move.',
      })
    }
    if (order.role === 'sprinter' || order.role === 'lanzador') {
      out.push({
        level: 'info',
        text: 'You have set an attack point but your role is to wait for the finish; the role will usually win.',
      })
    }
  }

  // 4. El esfuerzo, que desde la v58 sí llega al motor.
  if (order.effort === 'a_tope' && order.role === 'gregario') {
    out.push({
      level: 'info',
      text: 'All-in as a domestique means you will empty yourself for your leader and finish far back. That is the job — just know it.',
    })
  }
  if (order.effort === 'ahorrar' && order.mentality === 'supercombativo') {
    out.push({
      level: 'warn',
      text: 'Saving energy and attacking everything are opposite orders: the tank decides, and yours will be shut.',
    })
  }
  return out
}

/** Cuántas etapas de la lista llevan una orden que choca de verdad. Para el resumen de arriba. */
export function countWarnings(
  entries: {
    order: Pick<
      StageOrder,
      'role' | 'mentality' | 'effort' | 'triggerKm' | 'targetRiderId' | 'contestSprints'
    >
    stage: { kind: string; km: number; timeTrial: boolean }
  }[],
): number {
  return entries.filter((e) => orderAdvice(e.order, e.stage).some((a) => a.level === 'warn')).length
}

export type { Effort, Mentality, StageRole }
