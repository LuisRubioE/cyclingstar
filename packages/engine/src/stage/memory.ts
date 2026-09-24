/**
 * LA MEMORIA DE LA CARRERA (R09 + R10, docs/tactica.md paso 16).
 *
 * Hasta aquí cada etapa de una gran vuelta se corría **como si fuera la primera**: el pelotón no
 * recordaba quién ganó ayer, a quién le robaron la etapa, quién lleva quince días sin nada ni quién
 * le debe un relevo a quién. Y esa amnesia es la causa directa de una de las quejas del dueño —«gana
 * dos etapas seguidas»—, porque al ganador de ayer se le da hoy exactamente la misma cuerda.
 *
 * La memoria **la construye `packages/db`** leyendo los días anteriores; el motor la recibe en
 * `StageInput.race.memory` y **no la escribe**. Eso no es una comodidad: es lo que mantiene la
 * frontera que hace que ningún banco se rompa, y lo que hace que una carrera de un día —donde no hay
 * ayer— corra igual que antes sin una sola guarda especial.
 */
import { STAGE } from '../constants.js'
import type { MoodCause, RaceMemory } from './views.js'

/**
 * EL HUMOR TIENE CAUSA (R09.1, S-224/S-234/S-422/S-424/S-427/S-484). El día después de la reina el
 * pelotón no sale igual que la víspera de un descanso, y eso no lo decide un dado: lo decide el
 * calendario. Cada causa mueve el centro, y el dado sigue existiendo —encogido— porque el dueño lo
 * pidió con nombre: «la probabilidad de que el pelotón eche la hueva».
 */
export function moodCentre(cause: MoodCause | undefined, calor: number): number {
  const efecto = cause != null ? (STAGE.memory.moodEffect[cause] ?? 0) : 0
  return STAGE.pelotonMoodCentre + efecto - STAGE.memory.moodHeat * Math.max(0, Math.min(1, calor))
}

/** Y el dado se encoge a la mitad: sigue habiendo días raros, pero menos raros. */
export function moodSpread(conMemoria: boolean): number {
  return conMemoria ? STAGE.memory.moodSpread : STAGE.pelotonMoodSpread
}

/**
 * LA MEMORIA DE LA ADUANA (R09.2, S-423/S-425/S-106/S-401), y **dónde multiplica es toda la regla**.
 *
 * Va sobre `payable` —lo que un equipo está dispuesto a pagar por cerrar— y **no** sobre `objection`
 * —si le molesta o no—. Con la objeción saturada en 1 (salta con cualquier rematador decente), un
 * ×1,6 sobre ella no movía el resultado ni un dígito y la queja del dueño seguía viva. Sobre lo que
 * uno paga sí: el equipo dispuesto a poner 0,6 pone 0,96 contra el ganador de ayer.
 *
 * Es un descuento fuerte, **no un veto**: al ganador de ayer se le acorta la cuerda, no se le
 * prohíbe irse.
 */
export function customsMemoryFactor(
  mem: RaceMemory | undefined,
  teamId: string | null,
  idsDelMovimiento: readonly string[],
): number {
  if (mem == null) return 1
  let f = 1
  const ganadorAyer = mem.yesterdayWinnerId ?? null
  if (ganadorAyer !== null && idsDelMovimiento.includes(ganadorAyer)) {
    f *= STAGE.memory.customsYesterdayWinner
  }
  // Y el equipo al que la fuga le robó la etapa ayer hoy no le da cuerda a nadie.
  if (teamId !== null && (mem.burnedTeams ?? []).includes(teamId)) {
    f *= STAGE.memory.customsBurnedUs
  }
  return f
}

/**
 * LA DESESPERACIÓN (R09.4, S-397/S-402): «el que cumplió guarda a su gente; el que lleva quince días
 * sin nada mete dos hombres en todos los intentos». Con escalado y no con un binario, que es la
 * diferencia entre una regla y un interruptor.
 */
export function desperation(mem: RaceMemory | undefined, teamId: string | null): number {
  if (mem == null || teamId === null) return 0
  const dias = mem.daysSinceResult?.[teamId]
  if (dias == null) return 0
  return Math.max(0, Math.min(1, dias / STAGE.memory.desperationDays))
}

/** …y su contrario: el que ya ganó algo esta semana guarda a los suyos. */
export function alreadyWonDamp(mem: RaceMemory | undefined, teamId: string | null): number {
  if (mem == null || teamId === null) return 1
  return mem.satisfiedTeams.includes(teamId) ? STAGE.memory.wonAlreadyDamp : 1
}

/** Lo que la desesperación le añade al apetito de atacar. */
export function desperationAttackGain(d: number): number {
  return 1 + STAGE.memory.desperationAttackGain * d
}

/**
 * RIVALIDADES (R09.5, S-404/S-174): dos equipos que no colaboran **nunca**, aunque les convenga a
 * los dos. Es la mitad del ciclismo que no sale en los números y sí en las carreras.
 */
export function areRivals(
  mem: RaceMemory | undefined,
  a: string | null,
  b: string | null,
): boolean {
  if (mem == null || a === null || b === null) return false
  return (mem.rivalries ?? []).some(([x, y]) => (x === a && y === b) || (x === b && y === a))
}

/** La reputación de un equipo. Sin memoria, todo el mundo parte de cero. */
export function goodwillOf(mem: RaceMemory | undefined, teamId: string | null): number {
  if (mem == null || teamId === null) return 0
  return mem.goodwill?.[teamId] ?? 0
}

/**
 * LA DEUDA DE RELEVOS (R09.3, S-081/S-413/S-453): al que ayer no relevó, hoy no se le releva. Se
 * cobra **en el grupo donde vaya el acreedor** y no en abstracto, que es como funciona de verdad: la
 * factura se pasa cuando os volvéis a encontrar.
 */
export function relayDebtPenalty(
  mem: RaceMemory | undefined,
  riderId: string,
  enElGrupo: ReadonlySet<string>,
): number {
  if (mem == null) return 0
  for (const d of mem.debts) {
    if (d.from === riderId && enElGrupo.has(d.to)) return STAGE.memory.relayDebtPenalty
  }
  return 0
}

/**
 * CUÁNTO PESA HOY (R10, S-405): en una gran vuelta **no todos los días valen igual**, y un equipo
 * que se juega la carrera en la etapa 17 no se vacía en la 4. Sin plan, todos los días pesan 1 y el
 * motor corre como hasta ahora.
 */
export function dayWeight(mem: RaceMemory | undefined): number {
  return mem?.dayWeight ?? 1
}
