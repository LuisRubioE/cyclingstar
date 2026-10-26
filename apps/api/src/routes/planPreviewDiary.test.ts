import { existsSync } from 'node:fs'
import {
  type Database,
  clearRaceDayTssCache,
  getDailyLog,
  getPlanForDay,
  getRiderRaceDays,
  projectTraining,
  worldHorizon,
} from '@cyclingstar/db'
import { type TestDb, startTestDbFromDump } from '@cyclingstar/db/test'
import { BANISTER, SEASON_CALENDAR, arrivalLabel, projectLoad } from '@cyclingstar/engine'
import {
  type ArrivalLabel,
  type Attribute,
  type CoachBlock,
  type Intensity,
  type RiderArchetype,
  type TrainingChoice,
  blockWeek,
} from '@cyclingstar/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * LA LLEGADA PROYECTADA FRENTE AL DIARIO (E3, docs/visual.md §11.3; H-20, 11-g, 16-h; PR 13b). En el mundo
 * de la prueba del teléfono (`TELEFONO_MUNDO`, en el trabajo `Teléfono`), desde el día 40 y sin correr el
 * tick: para cada corredor con una carrera que sale entre los días 41 y 50, la llegada a su salida que
 * pronostica la vista previa nueva, y la que pronosticaba la de antes, frente a la que trae el diario
 * (`arrivalLabel` del TSB con que amaneció el día de la salida). Escribe el acuerdo de las dos, la fracción
 * de carreras en el mismo tramo, y falla si la nueva no acierta más, salvo que las dos acierten todo.
 *
 * El mundo, cortado en el día 40 en su copia en memoria: sin el diario de después y sin los abandonos de
 * después. La salud y la tensión son las del día 50, que no se guardan por día; los planes y las órdenes,
 * los que hay (casi ninguno: es un mundo de bots).
 */

const DESDE = 40
const PRIMERA = 41
const ULTIMA = 50
const HORIZONTE = 28
const MUNDO = process.env.TELEFONO_MUNDO

/**
 * LA VISTA PREVIA DE ANTES, CONGELADA: `apps/api/src/routes/riders.ts` l. 429-486 de `68fad6b`, copiada
 * como referencia. Cada día de carrera, `descanso_activo` de 25 TSS; cada día de los demás, el bloque de
 * su semana contada desde mañana (`base` si es `null`); la curva con `projectLoad`, y la llegada de un día
 * de carrera, el TSB de la víspera, o 0 si es mañana. Devuelve la llegada de cada día de carrera.
 */
async function llegadasDeAntes(
  db: Database,
  rider: { readonly id: string; readonly archetype: RiderArchetype; readonly rec: number },
  plan: {
    readonly blocks: readonly (CoachBlock | null)[]
    readonly focusAttr: Attribute | null
    readonly intensity: Intensity | null
  },
): Promise<Map<number, ArrivalLabel>> {
  const log = await getDailyLog(db, worldHorizon, rider.id, 1)
  const ultimo = log[log.length - 1]
  const desde = DESDE + 1
  const hasta = DESDE + HORIZONTE
  const raceDays = new Set(
    (await getRiderRaceDays(db, worldHorizon, rider.id, desde, hasta)).map((d) => d.gameDay),
  )
  const dias: TrainingChoice[] = []
  for (let i = 0; i < HORIZONTE; i++) {
    const gameDay = desde + i
    if (raceDays.has(gameDay)) {
      dias.push({ session: 'descanso_activo', intensity: 'normal' })
      continue
    }
    const bloque = plan.blocks[Math.floor(i / 7)] ?? 'base'
    dias.push(
      blockWeek(bloque, rider.archetype, gameDay, plan.focusAttr, plan.intensity ?? 'normal'),
    )
  }
  const curva = projectLoad(
    { ctl: ultimo?.ctl ?? BANISTER.initialCtl, atl: ultimo?.atl ?? BANISTER.initialAtl },
    dias,
    rider.rec,
  )
  const out = new Map<number, ArrivalLabel>()
  for (const d of raceDays) out.set(d, arrivalLabel(curva[d - desde - 1]?.tsb ?? 0))
  return out
}

describe.runIf(MUNDO !== undefined && MUNDO !== '' && existsSync(MUNDO))(
  'la llegada pronosticada frente al diario, en el mundo de la prueba (§11.3, H-20)',
  () => {
    let t: TestDb
    /** Cada carrera de los días 41 a 50 de cada corredor que la salió, con su llegada de verdad. */
    let casos: {
      riderId: string
      archetype: RiderArchetype
      rec: number
      raceKey: string
      startDay: number
      real: ArrivalLabel
    }[] = []

    beforeAll(async () => {
      t = await startTestDbFromDump(MUNDO!)
      const salidas = SEASON_CALENDAR.filter((r) => r.startDay >= PRIMERA && r.startDay <= ULTIMA)
      const claves = salidas.map((r) => `${r.id}:s0`)
      // La llegada de verdad: el TSB con que amaneció el día de la salida, en la fila de su primera etapa.
      const filas = await t.client<
        {
          rider_id: string
          race_id: string
          game_day: number
          tsb: number
          archetype: RiderArchetype
          rec: number | null
        }[]
      >`
        select r.race_id, l.rider_id, l.game_day, l.tsb, c.archetype,
               (select value from rider_attrs a where a.rider_id = l.rider_id and a.attr = 'REC') as rec
        from race_rosters r
        join rider_daily_log l on l.rider_id = r.rider_id
        join riders c on c.id = r.rider_id
        where r.race_id = any(${claves}::text[])
          and l.activity like 'carrera:' || split_part(r.race_id, ':', 1) || ':%'`
      const salida = new Map(salidas.map((r) => [`${r.id}:s0`, r.startDay]))
      casos = filas
        .filter((f) => f.game_day === salida.get(f.race_id))
        .map((f) => ({
          riderId: f.rider_id,
          archetype: f.archetype,
          rec: f.rec ?? 0,
          raceKey: f.race_id,
          startDay: f.game_day,
          real: arrivalLabel(f.tsb),
        }))
      // El mundo del día 40: sin el diario de después y sin los abandonos de después.
      await t.client`delete from rider_daily_log where game_day > ${DESDE}`
      await t.client`update race_rosters set abandoned_day = null where abandoned_day > ${DESDE}`
      clearRaceDayTssCache()
    }, 600_000)

    afterAll(async () => {
      await t?.close()
    })

    it('la vista previa nueva acierta más llegadas que la de antes', async () => {
      expect(casos.length).toBeGreaterThan(0)
      let nueva = 0
      let antes = 0
      const porCorredor = new Map<string, typeof casos>()
      for (const c of casos) porCorredor.set(c.riderId, [...(porCorredor.get(c.riderId) ?? []), c])
      for (const [riderId, suyos] of porCorredor) {
        const vivo = await getPlanForDay(t.db, riderId, DESDE + 1)
        const proyeccion = await projectTraining(t.db, worldHorizon, {
          riderId,
          currentDay: DESDE,
          horizonDays: HORIZONTE,
        })
        const deAntes = await llegadasDeAntes(
          t.db,
          { id: riderId, archetype: suyos[0]!.archetype, rec: suyos[0]!.rec },
          vivo?.plan ?? { blocks: [null, null, null, null], focusAttr: null, intensity: null },
        )
        for (const c of suyos) {
          const pronostico = proyeccion.races.find((r) => r.raceKey === c.raceKey)?.arrival
          if (pronostico === c.real) nueva++
          if (deAntes.get(c.startDay) === c.real) antes++
        }
      }
      const n = casos.length
      console.log(
        `llegadas comparadas: ${n} (${porCorredor.size} corredores); acierto de la vista previa nueva ${(nueva / n).toFixed(3)}, de la de antes ${(antes / n).toFixed(3)}`,
      )
      if (!(nueva === n && antes === n)) expect(nueva).toBeGreaterThan(antes)
    }, 900_000)
  },
)
