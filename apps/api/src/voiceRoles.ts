import {
  BROADCAST,
  type InstantContext,
  type RaceS,
  type RiderIx,
  type StageTimeline,
  fromDs,
  groupRoleAt,
  photoBlocksOf,
  visibilityOf,
} from '@cyclingstar/shared'
import type { ChronicleEvent } from './chronicle.js'
import { type ClusterClock, liveClusters } from './liveClusters.js'

/**
 * LOS PAPELES DE GRUPO EN LA VOZ Y EN EL ACTA (E2, docs/retransmision.md §12.6 y §14.3; D-18, 12-b,
 * 12-n; paso 6b). Puro sobre la línea.
 *
 * La voz no calcula el papel: el motor dice «the bunch» por el grupo que titula pelotón, y una de cada
 * cinco veces (`l8/rol.mjs`: 40 de 210 líneas) la barra llama a ese grupo `Chase group` en la misma
 * pantalla, que es lo que C7 prohíbe. La API anota en `datos` el papel del grupo del título con
 * `instantAt` en la hora de la línea (`mainRole`, y `mainJersey` si su etiqueta es `jersey_group`), y en
 * `crash`, el del grupo del caído (`groupRole`, `groupJersey`); la web elige la palabra (`groupNounOf`).
 */

/** Las plantillas que dicen «the bunch» por el grupo que el motor titula pelotón: su palabra es la de su papel. */
export const MAIN_GROUP_TEMPLATES: ReadonlySet<string> = new Set([
  'attack_go',
  'attack_short',
  'attack_reeled',
  'sprinters_chase',
  'sprinters_give_up',
  'peloton_concedes',
  'peloton_pull',
  'breakaway_caught',
  'time_gap',
  'time_gap_run',
])

/**
 * EL CONTEXTO DE LA ANOTACIÓN (§14.3, paso 2): sin espectador y con los maillots de salida del reparto
 * congelado SIN degradar (quién lleva puesto cada `leader`), de los que sale `GroupNow.jerseys` y con
 * él la etiqueta `jersey_group`. Ni `own` ni el resto de `start` cambian grupos, papeles ni etiquetas,
 * así que la anotación no depende de quien mira; a quien tiene velada una etapa anterior la ruta le da
 * 403 `previous_unseen` antes de construir la voz (§14.2).
 */
export function rolesContextOf(tl: StageTimeline): InstantContext {
  const leaders: { gc: RiderIx | null; points: RiderIx | null; kom: RiderIx | null } = {
    gc: null,
    points: null,
    kom: null,
  }
  for (const c of tl.cast.riders) if (c.worn.kind === 'leader') leaders[c.worn.jersey] = c.rider
  return {
    own: new Set(),
    start: { leaders, gcTop: [], racingAtStart: tl.riderIds.length },
    photoBlocks: photoBlocksOf(tl.lengthKm, tl.dx),
  }
}

/**
 * Copia de los sucesos con `datos.mainRole` (el papel del grupo del título) y `datos.mainJersey` (el
 * maillot que lo nombra, si su etiqueta es `jersey_group`, §6.3) en las diez plantillas de
 * `MAIN_GROUP_TEMPLATES` y, en `crash`, `datos.groupRole` y `datos.groupJersey` (los del grupo del
 * caído). Un `map`: los sucesos en su orden, una copia en los que anota y el mismo objeto en los demás,
 * así que la ruta ata las horas DESPUÉS, posición a posición (12-n). Sin grupo del título (o sin el
 * caído en ningún grupo) en esa hora, el suceso tal cual: dice `the bunch`, como hoy.
 *
 * El papel y la etiqueta son los de `instantAt` en esa hora (`groupRoleAt`, que solo calcula los de ese
 * grupo: B8). Una desviación del diseño, medida: §12.6 da por hecho que el título nunca es `gruppetto`,
 * y con la histéresis de 4-q lo es un momento tras cambiar de grupo (4 de las 191 líneas del título de
 * las cinco congeladas). Las filas de `GROUP_NOUNS` de esas diez plantillas (el motor, que el 6b no
 * toca) no tienen `the gruppetto`: ese papel no se anota y la línea dice `the bunch`, como hoy, salvo
 * que el grupo lleve un maillot, que sí se anota.
 */
export function withGroupRoles(
  events: readonly ChronicleEvent[],
  tl: StageTimeline,
  revealS: (e: ChronicleEvent) => RaceS,
  ctx: InstantContext,
): ChronicleEvent[] {
  if (tl.timeTrial) return [...events] // la crono no tiene grupos que nombrar
  const ixOf = new Map(tl.riderIds.map((id, r) => [id, r] as const))
  return events.map((e) => {
    const crash = e.plantilla === 'crash'
    if (!crash && !MAIN_GROUP_TEMPLATES.has(e.plantilla)) return e
    const fallen = ixOf.get(e.protagonistas[0] ?? '')
    if (crash && fallen === undefined) return e
    // el papel y la etiqueta de §4.5 en la hora de la línea, del grupo del título o del caído
    const g = groupRoleAt(tl, revealS(e), ctx, (x) =>
      crash ? x.members.includes(fallen!) : x.kind === 'peloton',
    )
    if (g === null) return e
    const role = !crash && g.role === 'gruppetto' ? null : g.role
    const jersey = g.label.k === 'jersey_group' ? g.label.jersey : null
    if (role === null && jersey === null) return e
    const [roleKey, jerseyKey] = crash ? ['groupRole', 'groupJersey'] : ['mainRole', 'mainJersey']
    return {
      ...e,
      datos: {
        ...e.datos,
        ...(role === null ? {} : { [roleKey]: role }),
        ...(jersey === null ? {} : { [jerseyKey]: jersey }),
      },
    }
  })
}

/** La voz de una línea sin el tramo: los pasos 1 a 3 de §14.3, lo que la ruta guarda una vez por línea. */
export interface LineVoice {
  /** lo que entra en `buildChronicle`: los sucesos anotados de antes de la meta y los racimos en vivo */
  readonly entrada: readonly ChronicleEvent[]
  /** la hora de cada uno, atada por la identidad del objeto DESPUÉS de anotar (12-n) */
  readonly revealOf: ReadonlyMap<ChronicleEvent, RaceS>
  /** el borde de la meta (§4.6) */
  readonly finishS: RaceS
  /** cuántos racimos en vivo entran */
  readonly clusters: number
}

/**
 * Los racimos en vivo de la voz: apagados (`BROADCAST.liveClusters`, DD-18), con la política de nombres
 * real (`namedLineOf`), o con todos los corredores sin rótulo, el peor caso con que B19 los midió en el 2.
 */
export type VoiceClusters = 'off' | 'named' | 'all'

/**
 * LA VOZ DE UNA LÍNEA, pasos 1 a 3 de §14.3: (1) los sucesos de antes de la meta, cada uno el guardado
 * (con su km original, 4-h) o el sintetizado (la caída, D-13), en el orden de `tl.events`; (2) los
 * papeles ANTES de atar las horas (12-n); (3) los racimos en vivo (§12.3), que entran con su hora y
 * sacan a sus sueltos. La comparten la ruta del tramo y B19 (`voicePrefix.test.ts`), para que el banco
 * mida la voz que se sirve.
 */
export function lineVoiceOf(
  tl: StageTimeline,
  stored: readonly ChronicleEvent[],
  view: ClusterClock,
  clusters: VoiceClusters,
): LineVoice {
  const finishS = fromDs(visibilityOf(tl).finishDs)
  // 1. Los sucesos de antes de la meta, cada uno con su hora (lo de la meta va en el paquete de meta).
  const sucesos: ChronicleEvent[] = []
  const horas: RaceS[] = []
  for (const e of tl.events) {
    if (e.revealS >= finishS) continue
    sucesos.push(
      stored[e.source] ?? {
        km: e.km,
        tS: e.tS,
        tipo: 'caida',
        plantilla: e.plantilla,
        protagonistas: e.riders.map((r) => tl.riderIds[r] ?? ''),
        ...(e.datos === null ? {} : { datos: { ...e.datos } }),
      },
    )
    horas.push(e.revealS)
  }
  // 2. Los papeles, con la hora que ya se sabe de cada suceso; las horas se atan sobre lo anotado.
  const horaDe = new Map(sucesos.map((ev, i) => [ev, horas[i] ?? finishS] as const))
  const anotados = withGroupRoles(
    sucesos,
    tl,
    (ev) => horaDe.get(ev) ?? finishS,
    rolesContextOf(tl),
  )
  const revealOf = new Map<ChronicleEvent, RaceS>(
    anotados.map((ev, i) => [ev, horas[i] ?? finishS] as const),
  )
  // 3. Los racimos en vivo: entran con su hora y sus sueltos salen; uno que se cierra en la meta o
  //    después queda para el acta, y sus sueltos tampoco se dicen en vivo.
  let entrada: readonly ChronicleEvent[] = anotados
  let count = 0
  if (clusters !== 'off') {
    const hora = (ev: ChronicleEvent): RaceS => revealOf.get(ev) ?? finishS
    const racimos = liveClusters(
      anotados,
      view,
      hora,
      clusters === 'named' ? namedLineOf(tl, hora) : undefined,
    )
    const absorbidos = new Set(racimos.flatMap((c) => c.members))
    const enVivo = racimos.filter((c) => c.revealS < finishS)
    for (const c of enVivo) revealOf.set(c.event, c.revealS)
    entrada = [...anotados.filter((ev) => !absorbidos.has(ev)), ...enVivo.map((c) => c.event)]
    count = enVivo.length
  }
  return { entrada, revealOf, finishS, clusters: count }
}

/**
 * QUIÉN CONSERVA SU LÍNEA SUELTA en los racimos en vivo (12-s, §7.7; DD-18): la política de nombres
 * real sobre el reparto congelado, sin espectador, porque la voz no depende de quien mira. Conservan
 * su línea los que llevan un maillot que no es el de su equipo (`worn`), los `namedGcTop` primeros de
 * la general de salida y los que iban en una fuga ya revelada (`breakaway_formed`) a la hora del
 * suelto; los propios del espectador, que 12-s también nombra, no entran: la voz es la misma para
 * todos. El resto se cuenta en su racimo.
 */
export function namedLineOf(
  tl: StageTimeline,
  revealS: (e: ChronicleEvent) => RaceS,
): (e: ChronicleEvent) => boolean {
  const ixOf = new Map(tl.riderIds.map((id, r) => [id, r] as const))
  const always = new Set<RiderIx>()
  for (const c of tl.cast.riders)
    if (
      c.worn.kind !== 'team' ||
      (c.start.gcRank !== null && c.start.gcRank <= BROADCAST.namedGcTop)
    )
      always.add(c.rider)
  const breaks = tl.events.filter((e) => e.plantilla === 'breakaway_formed')
  return (e) => {
    const r = ixOf.get(e.protagonistas[0] ?? '')
    if (r === undefined) return false
    if (always.has(r)) return true
    const at = revealS(e)
    return breaks.some((b) => b.revealS <= at && b.riders.includes(r))
  }
}

/** Los sucesos guardados anotados de cada línea, una vez por objeto (§12.6): el acta los pide en cada lectura. */
const storedRoles = new WeakMap<StageTimeline, readonly ChronicleEvent[]>()

/**
 * EL ACTA CON LOS PAPELES (§12.6): los sucesos guardados, en su orden, anotados con la hora de su
 * suceso en la línea (el de su `source`; uno sin él, con el borde de la meta). Solo para quien tiene
 * `Watch` encendido: la ruta la pide con `request.broadcastOn()` (§14.5).
 */
export function storedWithRoles(
  tl: StageTimeline,
  stored: readonly ChronicleEvent[],
): readonly ChronicleEvent[] {
  const hit = storedRoles.get(tl)
  if (hit !== undefined && hit.length === stored.length) return hit
  const finishS = fromDs(visibilityOf(tl).finishDs)
  const bySource = new Map<number, RaceS>()
  for (const e of tl.events) if (e.source >= 0) bySource.set(e.source, e.revealS)
  const horaDe = new Map(stored.map((ev, i) => [ev, bySource.get(i) ?? finishS] as const))
  const out = withGroupRoles(stored, tl, (ev) => horaDe.get(ev) ?? finishS, rolesContextOf(tl))
  storedRoles.set(tl, out)
  return out
}
