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
 * Las plantillas cuyo grupo es EL DE SUS PROTAGONISTAS (W1, la revisión de `Watch` del dueño, su punto 4): la
 * cabeza que crece (`front_group`), el puente que engancha, la fuga que se entiende o no y quien carga con
 * ella, y las cribas y el abanico del grupo en que va quien aprieta. La frase lo nombra por su sitio
 * («the lead group», «the chase group»), y la barra, por su maillot si lo lleva (§6.3): la API anota, como en
 * `crash`, el maillot de la etiqueta del grupo de su primer protagonista en la hora de la línea
 * (`groupJersey`), y la voz dice su palabra (D-18). Por su grupo y no por la fila 1 de la barra: en esa hora
 * el grupo de la frase puede no ir en cabeza (la línea 102 de la e18 dice «3 at the front now» de tres que
 * la barra enseña terceros, detrás del grupo del líder). Y solo si es de verdad el de la frase
 * (`lineGroupFits`). Fuera, el reagrupamiento (`peloton_regroup`), que el motor emite sin protagonistas, y
 * las que hablan de la fuga que otros persiguen (`sprinters_chase`, `peloton_pull`, `peloton_concedes`):
 * nada de la línea las identifica, y siguen diciendo su sitio.
 */
export const RIDER_GROUP_TEMPLATES: ReadonlySet<string> = new Set([
  'front_group',
  'bridge_made',
  'break_cooperation',
  'break_share',
  'peloton_split',
  'peloton_selection',
  'echelon_split',
])

/**
 * ¿ES ESTE GRUPO EL DE LA FRASE? (W1). En la hora de la línea, el del primer protagonista puede ser otro: la
 * cabeza que cuenta `front_group` puede morir en el mismo bloque, cazada, y el protagonista ir ya en el grupo
 * que la cazó. En el banco, race-italy e17 con la semilla b11-1, km 187,1, la voz habría dicho «The race
 * leader’s group is up to 1 … 1:06 clear» de uno que la barra enseña dentro del grupo del líder, de 50. Se
 * anota solo si el grupo tiene lo que la línea dice de él: los mismos corredores en `front_group` y
 * `break_cooperation`, que los nombran a todos; el tamaño en `bridge_made` y `break_share`; y lo que queda
 * tras el corte en `peloton_split`, `peloton_selection` y `echelon_split`. Si no casa, la frase dice su sitio,
 * como hoy, y no un maillot que quizá no es el suyo.
 */
export function lineGroupFits(
  e: Pick<ChronicleEvent, 'plantilla' | 'protagonistas' | 'datos'>,
  members: readonly RiderIx[],
  ixOf: ReadonlyMap<string, RiderIx>,
): boolean {
  const said = (key: string): number | null => {
    const v = e.datos?.[key]
    return v === undefined ? null : Number(v)
  }
  switch (e.plantilla) {
    case 'front_group':
    case 'break_cooperation':
      return (
        members.length === e.protagonistas.length &&
        e.protagonistas.every((id) => {
          const r = ixOf.get(id)
          return r !== undefined && members.includes(r)
        })
      )
    case 'bridge_made':
    case 'break_share':
      return said('size') === members.length
    case 'peloton_split':
    case 'peloton_selection':
    case 'echelon_split':
      return said('remaining') === members.length
    default:
      return false
  }
}

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
    start: { leaders, gcTop: [] },
    photoBlocks: photoBlocksOf(tl.lengthKm, tl.dx),
  }
}

/**
 * Copia de los sucesos con `datos.mainRole` (el papel del grupo del título) y `datos.mainJersey` (el
 * maillot que lo nombra, si su etiqueta es `jersey_group`, §6.3) en las diez plantillas de
 * `MAIN_GROUP_TEMPLATES`; en `crash`, `datos.groupRole` y `datos.groupJersey` (los del grupo del
 * caído); y desde W1, solo `datos.groupJersey` (el maillot que nombra al grupo de su primer
 * protagonista, si es el de la frase) en las de `RIDER_GROUP_TEMPLATES`. Un `map`: los sucesos en su orden, una copia en los
 * que anota y el mismo objeto en los demás, así que la ruta ata las horas DESPUÉS, posición a posición
 * (12-n). Sin nada que anotar en esa hora (sin grupo del título, sin el caído en ningún grupo, el grupo de
 * un protagonista sin maillot que lo nombre), el suceso tal cual: dice `the bunch` o su sitio, como hoy.
 *
 * El papel y la etiqueta son los de `instantAt` en esa hora (`groupRoleAt`, que solo calcula los de ese
 * grupo: B8; el de un protagonista, solo si lleva un maillot de líder). Una desviación del diseño, medida:
 * §12.6 da por hecho que el título nunca es `gruppetto`, y con la histéresis de 4-q lo es un momento tras
 * cambiar de grupo (4 de las 191 líneas del título de las cinco congeladas). Las filas de `GROUP_NOUNS` de
 * esas diez plantillas (el motor, que el 6b no toca) no tienen `the gruppetto`: ese papel no se anota y la
 * línea dice `the bunch`, como hoy, salvo que el grupo lleve un maillot, que sí se anota.
 */
export function withGroupRoles(
  events: readonly ChronicleEvent[],
  tl: StageTimeline,
  revealS: (e: ChronicleEvent) => RaceS,
  ctx: InstantContext,
): ChronicleEvent[] {
  if (tl.timeTrial) return [...events] // la crono no tiene grupos que nombrar
  const ixOf = new Map(tl.riderIds.map((id, r) => [id, r] as const))
  // los que llevan un maillot de líder: sin ninguno dentro, ningún grupo se nombra por el maillot (§6.3)
  const { gc, points, kom } = ctx.start.leaders
  const leaders = [gc, points, kom].filter((r): r is RiderIx => r !== null)
  return events.map((e) => {
    const crash = e.plantilla === 'crash'
    const ofRider = crash || RIDER_GROUP_TEMPLATES.has(e.plantilla)
    if (!ofRider && !MAIN_GROUP_TEMPLATES.has(e.plantilla)) return e
    const first = ixOf.get(e.protagonistas[0] ?? '')
    if (ofRider && first === undefined) return e
    // fuera de la caída, del grupo de un protagonista solo se anota el maillot: sin maillots, nada que leer
    if (ofRider && !crash && leaders.length === 0) return e
    // el papel y la etiqueta de §4.5 en la hora de la línea, del grupo del título o del de un protagonista,
    // y este, solo si lleva un maillot de líder y es de verdad el de la frase
    const g = groupRoleAt(tl, revealS(e), ctx, (x) =>
      ofRider
        ? x.members.includes(first!) &&
          (crash ||
            (leaders.some((r) => x.members.includes(r)) && lineGroupFits(e, x.members, ixOf)))
        : x.kind === 'peloton',
    )
    if (g === null) return e
    const role = crash ? g.role : ofRider || g.role === 'gruppetto' ? null : g.role
    const jersey = g.label.k === 'jersey_group' ? g.label.jersey : null
    if (role === null && jersey === null) return e
    const [roleKey, jerseyKey] = ofRider ? ['groupRole', 'groupJersey'] : ['mainRole', 'mainJersey']
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
