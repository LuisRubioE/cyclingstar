import { randomUUID } from 'node:crypto'
import {
  BANISTER,
  type Division,
  HARD_RETIRE_AGE,
  MORALE,
  generateNpcRider,
  neoproAge,
  sampleArchetype,
  shouldRetire,
} from '@cyclingstar/engine'
import { ATTRIBUTES, riderAge, seededRng } from '@cyclingstar/shared'
import { and, eq, inArray, isNotNull, isNull, lt, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { generateName } from './names.js'
import { emitNews } from './news.js'
import { contracts, palmares, riderAttrs, riderHidden, riders, teams } from './schema.js'
import { ROSTER_SIZE } from './world.js'

/**
 * Rollover de temporada (SPEC 2, 11, Paso 37). Al cruzar el día 364 amanece una temporada nueva sin
 * intervención: envejecen todos (implícito, la edad deriva de birthSeason + temporada), se retiran
 * los NPC mayores y entran neoprofesionales para mantener la población, los equipos ascienden y
 * descienden según su fuerza, los puntos se reinician y los contratos vencidos liberan al corredor.
 */

type Db = ReturnType<typeof drizzle>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

const SEASON_DAYS = 364
// Debe casar con la meta de población de la génesis (world.ts): con cifras reales por división el
// mundo ronda los ~3.200 corredores. Los neopros del rollover reponen bajas y mantienen ese tamaño.
const TARGET_POPULATION = 3900
const PROMO_RELEGATE = 2
const COUNTRIES = [
  'FR',
  'IT',
  'ES',
  'BE',
  'GB',
  'DE',
  'NL',
  'US',
  'CO',
  'DK',
  'NO',
  'PT',
  'SI',
  'AU',
]

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!
}

/**
 * ASCENSOS Y DESCENSOS POR LO QUE HA HECHO EL EQUIPO ESTA TEMPORADA (docs/epics.md «G4», v55).
 *
 * La maquinaria existía —dos suben y dos bajan por división, cada rollover— pero **se alimentaba de
 * una columna vacía**: la fuerza era `sum(riders.fame)`, y `fame` no se escribe en NINGUNA parte del
 * código. Es un `real DEFAULT 0` que nadie actualiza nunca desde que se creó (migración 0002). O sea
 * que todos los equipos empataban a cero, el orden lo decidía el desempate del `sort` sobre valores
 * iguales, y **quién ascendía y quién bajaba era arbitrario cada temporada**.
 *
 * Eso hacía verdad la queja del epic —«no hay consecuencia deportiva para un equipo que va mal o
 * bien durante una temporada»— pero no por la razón que decía: no es que faltara el mecanismo, es
 * que el mecanismo estaba conectado a un cable suelto.
 *
 * Ahora la fuerza son los PUNTOS DE LA TEMPORADA de sus corredores, que es el número que el jugador
 * ya ve en la ficha del equipo (`browse.ts` lo calcula igual, sumando `seasonPoints` del roster) y
 * el que de verdad se escribe al terminar cada etapa y cada general.
 */
async function promoteRelegate(tx: Tx, worldId: string): Promise<void> {
  const rows = await tx
    .select({
      id: teams.id,
      division: teams.division,
      strength: sql<number>`coalesce(sum(${riders.seasonPoints}), 0)::float`,
    })
    .from(teams)
    .leftJoin(riders, and(eq(riders.teamId, teams.id), isNull(riders.retiredAt)))
    .where(eq(teams.worldId, worldId))
    .groupBy(teams.id)
  const byDiv = (d: Division) =>
    rows.filter((r) => r.division === d).sort((a, b) => b.strength - a.strength)
  const wt = byDiv('WT')
  const prs = byDiv('PRS')
  const con = byDiv('CON')
  if (wt.length < PROMO_RELEGATE || prs.length < PROMO_RELEGATE || con.length < PROMO_RELEGATE)
    return

  const setDivision = async (id: string, division: Division) =>
    tx.update(teams).set({ division }).where(eq(teams.id, id))

  const promoteToWT = prs.slice(0, PROMO_RELEGATE)
  const relegateFromWT = wt.slice(-PROMO_RELEGATE)
  const promoteToPRS = con.slice(0, PROMO_RELEGATE)
  // Los peores PRS que no ascienden a WT bajan a CON.
  const promotedIds = new Set(promoteToWT.map((t) => t.id))
  const relegateFromPRS = prs.filter((t) => !promotedIds.has(t.id)).slice(-PROMO_RELEGATE)

  for (const t of promoteToWT) await setDivision(t.id, 'WT')
  for (const t of relegateFromWT) await setDivision(t.id, 'PRS')
  for (const t of promoteToPRS) await setDivision(t.id, 'PRS')
  for (const t of relegateFromPRS) await setDivision(t.id, 'CON')
}

/**
 * Cuota del núcleo nacional por división (debe casar con world.ts NATIONAL_CORE_SHARE): un neopro
 * que entra en un equipo es, con esta probabilidad, del país del equipo; si no, del reparto general.
 */
const NATIONAL_CORE_SHARE: Record<Division, number> = { WT: 0.35, PRS: 0.5, CON: 0.7 }

/** Inserta un neoprofesional (~20 años) en un equipo (o como agente libre si teamId es null). */
async function insertNeopro(
  tx: Tx,
  worldId: string,
  division: Division,
  teamId: string | null,
  seed: string,
  newSeason: number,
  teamCountry?: string | null,
): Promise<void> {
  const rng = seededRng(`${seed}:meta`)
  /** El arquetipo del neopro, con las cuotas de su división: un cuarto son gregarios. */
  const archetype = sampleArchetype(rng, division)
  // Núcleo nacional: mayoría del país del equipo cuando ficha para uno (SPEC 7.1).
  const country =
    teamCountry && rng() < NATIONAL_CORE_SHARE[division] ? teamCountry : pick(COUNTRIES, rng)
  const age = neoproAge(rng)
  const genome = generateNpcRider(`${seed}:genome`, {
    division,
    vocation: 'fondo',
    age,
    v2: true,
    archetype,
  })
  const name = generateName(`${seed}:name`, { country, gender: 'M' }).fullName
  const id = randomUUID()
  await tx.insert(riders).values({
    id,
    worldId,
    userId: null,
    teamId,
    name,
    country,
    // Un neopro con equipo vive en el país del equipo (base); un agente libre, en el suyo (como génesis).
    residence: (teamId ? (teamCountry ?? country) : country) ?? country,
    gender: 'M',
    birthSeason: newSeason - (age - 20),
    archetype,
    faceSeed: `${id}:face`,
    ctl: BANISTER.initialCtl,
    atl: BANISTER.initialAtl,
    morale: MORALE.mean,
  })
  await tx
    .insert(riderAttrs)
    .values(ATTRIBUTES.map((attr) => ({ riderId: id, attr, value: genome.attributes[attr] })))
  await tx.insert(riderHidden).values({
    riderId: id,
    talent: genome.hidden.talent,
    ceilings: genome.hidden.ceilings,
    fragility: genome.hidden.fragility,
    peakAge: genome.hidden.peakAge,
    declineAge: genome.hidden.declineAge,
  })
}

/**
 * Rellena las plantillas NPC bajo mínimos hasta ROSTER_SIZE de su división. A diferencia del rollover
 * (que limita los neopros al objetivo de población), esto completa SIEMPRE los huecos: sirve para
 * mundos creados con plantillas más pequeñas (p.ej. WT a 14) que hay que subir al tamaño actual (28)
 * sin regenerar el mundo. Idempotente: cuando todos los equipos están al completo no hace nada.
 * Corre cada tick; el coste es una consulta de conteo cuando no hay huecos. Devuelve cuántos creó.
 */
export async function backfillRosters(
  tx: Tx,
  worldId: string,
  worldSeed: string,
  season: number,
): Promise<number> {
  const gaps = await tx
    .select({
      id: teams.id,
      division: teams.division,
      country: teams.country,
      roster: sql<number>`count(${riders.id})::int`,
    })
    .from(teams)
    .leftJoin(riders, and(eq(riders.teamId, teams.id), isNull(riders.retiredAt)))
    .where(eq(teams.worldId, worldId))
    .groupBy(teams.id)
  let created = 0
  for (const g of gaps) {
    const div = g.division as Division
    for (let i = g.roster; i < ROSTER_SIZE[div]; i++) {
      await insertNeopro(
        tx,
        worldId,
        div,
        g.id,
        `${worldSeed}:backfill:${g.id}:${i}`,
        season,
        g.country,
      )
      created++
    }
  }
  return created
}

/** Corre el rollover cuando el mundo cruza a una temporada nueva (día 364, 728, ...). */
export async function runRollover(
  tx: Tx,
  worldId: string,
  gameDay: number,
  worldSeed: string,
): Promise<void> {
  if (gameDay === 0 || gameDay % SEASON_DAYS !== 0) return
  const newSeason = gameDay / SEASON_DAYS

  // 1) Ascensos y descensos por la fuerza de la temporada que acaba.
  await promoteRelegate(tx, worldId)

  // 2) Reinicio de puntos de TEMPORADA de equipos y corredores. El palmarés es permanente, y
  //    `rider_points` TAMPOCO se toca: es la puntuación fechada de la que vive el ranking a 365
  //    días (docs/epics.md «G3»), que necesita justamente poder ver el año anterior.
  await tx.update(teams).set({ pointsSeason: 0 }).where(eq(teams.worldId, worldId))
  await tx.update(riders).set({ seasonPoints: 0 }).where(eq(riders.worldId, worldId))

  // 3) Contratos vencidos: liberan al corredor (el mercado lo re-fichará).
  await tx.delete(contracts).where(lt(contracts.endSeason, newSeason))

  // 4) Retiros de NPC mayores.
  const npcs = await tx
    .select({
      id: riders.id,
      name: riders.name,
      birthSeason: riders.birthSeason,
      teamId: riders.teamId,
      declineAge: riderHidden.declineAge,
    })
    .from(riders)
    .innerJoin(riderHidden, eq(riderHidden.riderId, riders.id))
    .where(and(eq(riders.worldId, worldId), isNull(riders.userId), isNull(riders.retiredAt)))

  const rng = seededRng(`${worldSeed}:rollover:s${newSeason}`)
  let retired = 0
  const retirees: { id: string; name: string; age: number }[] = []
  for (const npc of npcs) {
    const age = 20 - npc.birthSeason + newSeason
    if (shouldRetire(age, npc.declineAge, rng)) {
      await tx
        .update(riders)
        .set({ retiredAt: newSeason, teamId: null })
        .where(eq(riders.id, npc.id))
      retired++
      retirees.push({ id: npc.id, name: npc.name, age })
    }
  }

  /**
   * 4-bis) EL JUGADOR HUMANO TAMBIÉN SE RETIRA (v47). Hasta aquí el bloque de arriba filtraba por
   * `isNull(riders.userId)`, así que un corredor de jugador **no se retiraba nunca**: ni a los 39 ni
   * a los sesenta. El dueño lo pidió explícito —«tiene que obligar al jugador humano a retirarse, y
   * ahí puede crear otro nuevo»— y es además lo que hace que las edades signifiquen algo.
   *
   * Y se le aplica SOLO LA EDAD DURA, no la curva de declive de los NPC, que es aleatoria desde
   * `declineAge`. Un humano al que el juego jubila por sorpresa a los 33 pierde su partida sin poder
   * preverlo; con la edad dura sabe exactamente cuántas temporadas le quedan y puede planear su
   * última. Es la misma diferencia que hay entre un bot y alguien que ha invertido meses.
   */
  const humanos = await tx
    .select({
      id: riders.id,
      name: riders.name,
      birthSeason: riders.birthSeason,
    })
    .from(riders)
    .where(and(eq(riders.worldId, worldId), isNotNull(riders.userId), isNull(riders.retiredAt)))
  for (const h of humanos) {
    const age = riderAge(h.birthSeason, newSeason)
    if (age < HARD_RETIRE_AGE) continue
    await tx.update(riders).set({ retiredAt: newSeason, teamId: null }).where(eq(riders.id, h.id))
    retired++
    retirees.push({ id: h.id, name: h.name, age })
  }

  /**
   * ANUNCIOS DE RETIRADA (#24): solo los más renombrados, para no inundar el feed. Titular global.
   *
   * ESTO NO HABÍA SALTADO NUNCA (v55). El filtro era `fame >= 40`, y `fame` no se escribe en ninguna
   * parte del código: es un `real DEFAULT 0` desde la migración 0002 que nadie actualiza jamás. O
   * sea que la condición era `0 >= 40` para todo el mundo y **no se ha anunciado una sola retirada
   * en la historia del juego**, ni de un NPC ni de un jugador.
   *
   * «Renombrado» pasa a ser lo único que de verdad mide una carrera entera: el PALMARÉS, que no se
   * reinicia nunca. Los puntos de temporada no sirven aquí —quien se retira a los 39 lleva media
   * temporada sin puntuar— y ése es justo el corredor cuya retirada es noticia.
   */
  const palmaresPorCorredor = new Map<string, number>()
  if (retirees.length > 0) {
    const filas = await tx
      .select({ riderId: palmares.riderId, n: sql<number>`count(*)::int` })
      .from(palmares)
      .where(
        and(
          eq(palmares.worldId, worldId),
          inArray(
            palmares.riderId,
            retirees.map((r) => r.id),
          ),
        ),
      )
      .groupBy(palmares.riderId)
    for (const f of filas) palmaresPorCorredor.set(f.riderId, f.n)
  }
  const notable = retirees
    .map((r) => ({ ...r, honores: palmaresPorCorredor.get(r.id) ?? 0 }))
    // Con al menos una victoria en el palmarés: si nunca ganó nada, su retirada no es un titular.
    .filter((r) => r.honores > 0)
    .sort((a, b) => b.honores - a.honores || (a.id < b.id ? -1 : 1))
    .slice(0, 6)
  for (const r of notable) {
    await emitNews(tx, {
      worldId,
      gameDay,
      kind: 'retirement',
      seed: `${worldSeed}:retire:${r.id}`,
      data: { rider: r.name, detail: `at ${r.age}` },
      riderId: r.id,
    })
  }

  // 5) Neoprofesionales para mantener la población (~1.600). Rellenan huecos de plantilla; el resto
  //    entra como agente libre en Continental.
  const popRows = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(riders)
    .where(and(eq(riders.worldId, worldId), isNull(riders.retiredAt)))
  const population = popRows[0]?.n ?? 0
  const needed = Math.max(retired, TARGET_POPULATION - population)

  // Equipos con hueco (los que perdieron corredores por retiro), para colocar algunos neopros.
  const gaps = await tx
    .select({
      id: teams.id,
      division: teams.division,
      country: teams.country,
      roster: sql<number>`count(${riders.id})::int`,
    })
    .from(teams)
    .leftJoin(riders, and(eq(riders.teamId, teams.id), isNull(riders.retiredAt)))
    .where(eq(teams.worldId, worldId))
    .groupBy(teams.id)
  const target = ROSTER_SIZE
  const openSlots: { teamId: string; division: Division; country: string | null }[] = []
  for (const g of gaps) {
    const div = g.division as Division
    for (let i = g.roster; i < target[div]; i++)
      openSlots.push({ teamId: g.id, division: div, country: g.country })
  }

  for (let i = 0; i < needed; i++) {
    const slot = openSlots[i]
    const division = slot?.division ?? 'CON'
    const teamId = slot?.teamId ?? null
    await insertNeopro(
      tx,
      worldId,
      division,
      teamId,
      `${worldSeed}:neopro:s${newSeason}:${i}`,
      newSeason,
      slot?.country ?? null,
    )
  }
}
