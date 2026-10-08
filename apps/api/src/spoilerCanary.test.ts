import { anonHorizon, computeHorizon } from '@cyclingstar/db'
import { pageTitle } from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { stageReadyEmail } from './emails.js'
import { preStageInfoFor, shellMetaFor } from './spaShell.js'
import {
  OWN_RIDER,
  RACE_ID,
  RACE_KEY,
  VEILED,
  type SpoilerWorld,
  type Swept,
  dayOf,
  routeOf,
  serverErrors,
  startSpoilerWorld,
  sweep,
} from './__fixtures__/spoilerWorld.js'

/**
 * B1a · EL CANARIO (docs/retransmision.md §16.3; I-30, D-54; E2, paso 7a). Suite rápida.
 *
 * Tras correr la etapa velada se plantan valores que solo existen en su desenlace, en campos que la API
 * sirve, y se barren todas las `GET` del registro con la sesión del jugador, que no la ha visto: ninguna
 * respuesta puede llevarlos. Hasta el 8b, las rutas que aún destripaban iban en `PENDING_ROUTES` y su
 * `it` comprobaba que lo seguían haciendo; vacía desde el 8b, la constante y su `it` se borraron en el 9b
 * (§16.3, 17-n). No se busca el nombre del ganador en las respuestas JSON, que sale
 * con razón en la lista de salida: eso es B1c. Sí se busca en el título, las `og:` y el correo, que no
 * llevan ninguna lista (§11.8, §11.9): es el tercer `it`, que entra en el 9a con `spaShell.ts` y
 * `stageReadyEmail`.
 *
 * Los tres primeros `it` miran el MISMO estado del mundo (la etapa corrida y velada) y comparten un
 * barrido. Con el de `reveal`, cuatro barridos de 62 peticiones serían 248 en unos segundos, cerca de
 * las 300 por minuto del límite global (security.ts), y pasado ese límite el barrido vería 429 en vez
 * de cuerpos; así son dos.
 */

/** EL CANARIO: valores que solo existen en el desenlace de la etapa velada, en campos que la API sirve. Se plantan tras correrla. */
const CANARY = {
  timeS: 31337,
  money: 424242,
  points: 7373,
  word: 'c0ffee00',
  stageDay: 97,
} as const
const TOKENS: readonly RegExp[] = [
  /(?<![0-9])31337(?![0-9])/,
  /(?<![0-9])424242(?![0-9])/,
  /(?<![0-9])7373(?![0-9])/,
  /c0ffee00/,
  /stage 97\b/,
]

async function plantCanary(w: SpoilerWorld): Promise<void> {
  const day = dayOf(VEILED)
  // el tiempo del ganador: la ruta de etapa y la del acta
  await w.t
    .client`update stage_results set tiempo_s = ${CANARY.timeS} where race_id = ${RACE_KEY} and stage_day = ${VEILED} and puesto = 1`
  // un premio del día, insertado como lo escribe awardRacePrizes (que solo paga a humanos, economy.ts): desde el 8a con su
  // etapa, race_key y stage_day (la 0049), y con el saldo movido a la vez, como creditRider. Lo sirven
  // /api/riders/me/ledger y, sumado, /summary. RE-SELLADO EN EL 8b: la fila iba sin etapa y sin mover el saldo, y desde
  // el 8b un premio sin etapa cuenta como conocido (13-l: ni la resta del saldo ni el filtro del libro pueden casarlo con
  // una etapa, porque `race_key` nulo no casa con ninguna) y la resta del saldo quitaba un premio que el saldo no tenía.
  await w.t
    .client`insert into transactions (rider_id, game_day, kind, amount, note, race_key, stage_day) values (${OWN_RIDER}, ${day}, 'premio', ${CANARY.money}, 'Race France · stage win', ${RACE_KEY}, ${VEILED})`
  await w.t.client`update riders set money = money + ${CANARY.money} where id = ${OWN_RIDER}`
  // los puntos del día: solo salen sumados (ranking.ts), así que 7373 solo cae si son los únicos del corredor en la ventana.
  // RE-SELLADO EN EL 8b: `riders.season_points` se mueve con ellos, como en addSeasonPointsBatch, para que la temporada del
  // corredor siga siendo la suma de sus puntos y la resta de R (§10.6) no reste lo que la temporada no tiene.
  await w.t.client`update riders r set season_points = r.season_points + p.delta
                   from (select rider_id, sum(${CANARY.points} - points)::int as delta from rider_points
                         where game_day = ${day} group by rider_id) p
                   where r.id = p.rider_id`
  await w.t.client`update rider_points set points = ${CANARY.points} where game_day = ${day}`
  // el palmarés del día: /api/riders/:id/palmares sirve `detail`
  await w.t.client`update palmares set detail = ${`Stage ${CANARY.word}`} where game_day = ${day}`
  // las noticias del día: se redactan de `data` al leer (§12.8); una etapa imposible sale como «stage 97»
  await w.t
    .client`update news set data = jsonb_set(data, '{stageDay}', ${String(CANARY.stageDay)}::jsonb) where game_day = ${day} and data ? 'stageDay'`
}
const leaking = (bodies: ReadonlyMap<string, Swept>): string[] =>
  [...bodies].filter(([, r]) => TOKENS.some((t) => t.test(r.body))).map(([k]) => k)

describe('B1a · el canario', () => {
  let w: SpoilerWorld
  let veiled: Promise<Map<string, Swept>> | null = null
  /** El barrido con la etapa corrida y velada, uno para los tres primeros `it`. */
  const veiledSweep = (): Promise<Map<string, Swept>> => (veiled ??= sweep(w, 'player'))

  let winnerName = ''

  beforeAll(async () => {
    w = await startSpoilerWorld('b1a-base')
    await w.runVeiled('b1a-velada')
    await plantCanary(w)
    const winner = await w.winner()
    w.extraRiders.push(winner) // su ficha es la que más tendría que contar
    winnerName = (
      await w.t.client<{ name: string }[]>`select name from riders where id = ${winner}`
    )[0]!.name
  }, 300_000)
  afterAll(async () => {
    await w?.close()
  })

  it('ninguna respuesta le cuenta el desenlace a quien no ha visto la etapa', async () => {
    const leaks = leaking(await veiledSweep())
    expect(leaks).toEqual([])
  })

  it('ninguna respuesta del barrido es un 5xx: un 500 no cuenta ni destripa, es un banco que no ha mirado', async () => {
    expect(serverErrors(await veiledSweep())).toEqual([])
  })

  it('ni el título, ni las og:, ni el aviso llevan al ganador; el robot sin cookie sí lo ve en el acta, marcado', async () => {
    const h = await computeHorizon(
      w.t.db,
      { userId: w.userId, readOnly: false },
      { worldId: w.worldId, currentDay: dayOf(VEILED) },
    )
    const watch = new URL(`/world/races/${RACE_ID}/stages/${VEILED}`, 'http://localhost')
    const report = new URL(`/world/races/${RACE_ID}/stages/${VEILED}/report`, 'http://localhost')
    for (const url of [watch, report])
      expect(
        JSON.stringify(await shellMetaFor(w.t.db, () => Promise.resolve(h), url)),
      ).not.toContain(winnerName)
    // no vacío (DD-12): el robot de vista previa, sin cookie, ve el acta con el ganador, marcado
    const robot = await shellMetaFor(w.t.db, () => Promise.resolve(anonHorizon()), report)
    expect(robot?.ogDescription).toContain(`Spoiler · Winner: ${winnerName}`)
    const info = await preStageInfoFor(w.t.db, RACE_ID, VEILED, 0)
    expect(info).not.toBeNull()
    // el locale delante (12-q)
    expect(JSON.stringify(stageReadyEmail('en', info!, true, watch.href))).not.toContain(winnerName)
    for (const page of ['watch', 'report', 'race'] as const)
      expect(pageTitle('en', info, page)).not.toContain(winnerName)
  })

  it('no es vacío: con la etapa vista, el canario sale en cinco rutas o más, de las seis que lo llevan', async () => {
    await w.reveal() // el último: deja la etapa conocida
    expect(new Set(leaking(await sweep(w, 'player')).map(routeOf)).size).toBeGreaterThanOrEqual(5)
  })
})
