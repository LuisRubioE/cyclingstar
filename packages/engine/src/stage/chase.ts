/**
 * LA FUERZA DE LA CAZA (SPEC 6.9, docs/balance.md «v10 — Composición y caza»).
 *
 * Hasta la v9 el pelotón perseguía o no perseguía según un interruptor global: bastaba UN corredor
 * con SPR ≥ 70 en el campo para que el pelotón entero se pusiera a tirar con toda su fuerza, y se
 * aplicaba igual en una continental modesta que en una gran vuelta con cinco trenes organizados. En
 * el ciclismo real la fuga llega mucho más a menudo en las carreras pequeñas, y no por azar: es que
 * allí no hay equipos capaces de organizarse para cazarla.
 *
 * Aquí se mide ESE campo. Un «tren» es un rematador con opciones reales más los compañeros que
 * trabajan para él. El motor no conoce equipos —`StageRider` no trae `teamId`—, pero sí conoce el
 * trabajo de equipo: los lanzadores y gregarios apuntan a su jefe de filas con `targetRiderId`
 * (SPEC 6.18), y eso ES el tren. En producción los reparte `world/autoOrders.ts`: un equipo nombra
 * sprinter al suyo solo si pasa de 68 de SPR, y le pone un lanzador y hasta dos gregarios; un equipo
 * continental sin rematador no nombra a ninguno y por tanto no aporta nada a la caza.
 *
 * La salida es un escalar en [0,1] que el controlador del pelotón usa para tres cosas: cuánta cuerda
 * da, con cuánta fuerza puede cerrar y cuándo se rinde.
 */
import { STAGE } from '../constants.js'
import type { StageRider } from './types.js'

/** Un tren de caza: el rematador y los compañeros que trabajan para él. */
export interface ChaseTrain {
  riderId: string
  /** Su punta de velocidad (SPR efectivo de salida). */
  spr: number
  /** Lanzadores y gregarios que le apuntan como objetivo. */
  helpers: number
}

/** El campo que puede organizar la caza en esta etapa. */
export interface ChaseField {
  trains: ChaseTrain[]
  /**
   * Fuerza de la caza en [0,1]. 1 = varios trenes de primer nivel y bien acompañados (una gran
   * vuelta); cerca de 0 = un rematador suelto sin equipo, o ninguno.
   */
  force: number
}

/** ¿Interesa a este corredor la llegada masiva? (SPEC 6.9). */
export function isFinisher(r: StageRider): boolean {
  return r.orders.role === 'sprinter' || r.eff0.SPR >= STAGE.chaseContenderMinSpr
}

/**
 * Los trenes de caza del campo y la fuerza que suman. Un rematador solo cuenta si tiene OPCIONES
 * REALES: al que le saca el mejor del campo más de `chaseContenderMaxGap` de punta no le va a tirar
 * su equipo, porque no va a ganar el sprint de todas formas.
 */
export function chaseField(riders: StageRider[]): ChaseField {
  const contenders = riders.filter(isFinisher)
  if (contenders.length === 0) return { trains: [], force: 0 }
  const bestSpr = contenders.reduce((mx, r) => Math.max(mx, r.eff0.SPR), 0)

  // Compañeros por jefe de filas: quien va de lanzador o de gregario TRABAJA para su objetivo.
  const helpersOf = new Map<string, number>()
  for (const r of riders) {
    const target = r.orders.targetRiderId
    if (!target) continue
    if (r.orders.role !== 'lanzador' && r.orders.role !== 'gregario') continue
    helpersOf.set(target, (helpersOf.get(target) ?? 0) + 1)
  }

  const trains: ChaseTrain[] = []
  for (const r of contenders) {
    if (bestSpr - r.eff0.SPR > STAGE.chaseContenderMaxGap) continue
    trains.push({
      riderId: r.riderId,
      spr: r.eff0.SPR,
      helpers: helpersOf.get(r.riderId) ?? 0,
    })
  }

  // Cada tren aporta según lo bueno que sea su rematador y con cuánta ayuda cuenta; la suma se
  // normaliza contra el campo que sabe cazar cualquier cosa (`chaseFullUnits`).
  let units = 0
  for (const t of trains) {
    const quality = Math.max(
      0,
      Math.min(
        1,
        (t.spr - STAGE.chaseQualityFloor) / (STAGE.chaseQualityFull - STAGE.chaseQualityFloor),
      ),
    )
    units += quality * (1 + STAGE.chaseHelperBonus * Math.min(t.helpers, STAGE.chaseHelpersMax))
  }
  return { trains, force: Math.max(0, Math.min(1, units / STAGE.chaseFullUnits)) }
}

/**
 * Interpolación que respeta los extremos EXACTAMENTE: con `t = 1` devuelve `b` sin arrastrar el
 * error de coma flotante de `a + (b - a)·t`. Importa de verdad: con la caza a fuerza plena el
 * controlador tiene que dar los MISMOS números que antes de esta capa, o los invariantes de balance
 * se moverían por un 0,8500000000000001.
 */
export function lerp(a: number, b: number, t: number): number {
  return (1 - t) * a + t * b
}
