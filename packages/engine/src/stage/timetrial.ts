/**
 * Contrarreloj, cronoescalada y CRE: el mismo motor con grupos de un corredor (SPEC 6.13).
 * Sin drafting ni hazards de ataque, compromiso fijo de esfuerzo sostenido y perfil compuesto
 * (0.75·CRI + 0.15·LLA + 0.10·RES en llano, deslizando hacia MON con w(g) en subida). La erosión
 * castiga los recorridos largos; un ruido final N(1, 0.006) sobre el tiempo. Puro y determinista.
 *
 * **EL RELOJ DE CARRERA (v18).** Hasta la v17 cada corredor corría contra un cronómetro que empezaba
 * en cero y la etapa entera se resolvía en un solo evento. Ahora la rampa se reparte con la regla de
 * `stage/startOrder.ts` y de ahí cuelga todo lo que una crono tiene y aquí no existía:
 *
 * - **Hora de salida y hora de llegada.** El tiempo de la clasificación sigue siendo el propio de
 *   cada uno —la física NO se ha tocado y los tiempos son los mismos dígito a dígito—, pero el reloj
 *   de la carrera avanza y dice quién está en la carretera a la vez que quién.
 * - **La silla del mejor tiempo**, que es la columna vertebral de la crónica de una crono.
 * - **Los parciales**, en `STAGE.ttSplitChecks` puntos de control repartidos por el recorrido.
 * - **El ALCANCE.** Con el orden inverso de la general los mejores salen al final y los peores
 *   delante, así que uno de los últimos caza al que salió dos minutos antes. **Alcanzar NO da
 *   rebufo** —está prohibido y el alcanzado tiene que apartarse—, así que se detecta LEYENDO las
 *   trazas ya calculadas y no toca el tiempo de nadie. Si el alcance diera ventaja, la crono estaría
 *   rota.
 */
import { normal } from '../random.js'
import { ENGINE_VERSION, STAGE } from '../constants.js'
import { applyTimeCut } from './abandon.js'
import { EventLog } from './events.js'
import {
  type Eff,
  blockCost,
  blockSeconds,
  climbWeight,
  effNow,
  erosion,
  stepSpeed,
  tankState,
  targetSpeed,
} from './physics.js'
import { sampleProfile } from './sample.js'
import { stageRng } from './rng.js'
import { timeTrialStartOrder } from './startOrder.js'
import type { Block, StageInput, StageOutput, StageResult, TankState } from './types.js'

/** Perfil de crono: compuesto de especialista en llano que desliza hacia MON en subida (6.13). */
function ttPerfil(eff: Eff, block: Block): number {
  const flat =
    STAGE.ttCompositeCri * eff.CRI + STAGE.ttCompositeLla * eff.LLA + STAGE.ttCompositeRes * eff.RES
  if (block.tipo !== 'subida') return flat
  const w = climbWeight(block.g)
  return (1 - w) * flat + w * eff.MON
}

/** La carrera de un corredor: su traza de tiempos bloque a bloque y sus dos horas. */
interface Ride {
  riderId: string
  /**
   * Tiempo acumulado EN BRUTO al final de cada bloque, sin el ruido final. Se guarda crudo y el
   * ruido se aplica al leerlo (`at`) para que el último valor sea `raw · noise` bit a bit, es decir
   * exactamente el tiempo de la v17.
   */
  raw: Float64Array
  noise: number
  /** Tiempo de meta, el que va a la clasificación. */
  tS: number
  /** Hora de salida, en segundos desde que sale el primero. */
  startS: number
  /** Hora de llegada en el reloj de carrera. */
  finishS: number
}

/** Reloj de carrera en que este corredor pasa por el final del bloque `i`. */
function clockAt(ride: Ride, i: number): number {
  return ride.startS + ride.raw[i]! * ride.noise
}

/** Un suceso del reloj, candidato a línea de crónica. */
interface Beat {
  /** Reloj de carrera en que ocurre. */
  tS: number
  /** Se cuenta sí o sí, aunque el throttle no le tocara (una mejora grande, el último parte…). */
  forced?: boolean
}

/**
 * Separación efectiva entre dos líneas del mismo tipo, sobre el reloj de carrera. Es el throttle de
 * la crono, y se calcula sobre la VENTANA de la jornada en vez de ser un número fijo: así una crono
 * de 40 corredores y una de 176 cuentan aproximadamente las mismas líneas, y el número no depende
 * del tamaño del campo ni del intervalo de salida.
 */
function narrateGapS(windowS: number, minGapS: number, maxLines: number): number {
  return Math.max(minGapS, maxLines > 0 ? windowS / maxLines : minGapS)
}

/** Adelgaza una lista de sucesos ya ordenados por reloj, respetando los forzados. */
function thin<T extends Beat>(items: readonly T[], gapS: number): T[] {
  const out: T[] = []
  let last = -Infinity
  for (const it of items) {
    if (it.forced === true || it.tS - last >= gapS) {
      out.push(it)
      last = it.tS
    }
  }
  return out
}

/** Un cambio en la silla del mejor tiempo (en meta o en un punto de control). */
interface BestBeat extends Beat {
  riderId: string
  /** El tiempo (o el parcial) que acaba de marcar. */
  timeS: number
  /** Cuánto le ha quitado al anterior mejor. */
  gainS: number
  /** A quién se lo ha quitado; vacío si es el primero en pasar. */
  previousId: string
}

/**
 * La cadena de mejores marcas: quién va marcando el mejor registro y a quién se lo quita. Los
 * corredores llegan al punto en orden de RELOJ, que en una crono no es el orden de salida.
 *
 * **EL CRONÓMETRO TIENE UN SEGUNDO DE RESOLUCIÓN** (v19), y la silla lo respeta: se compara en
 * segundos redondeados, que son los que van a la clasificación y los que el jugador lee. Dos
 * corredores al mismo segundo COMPARTEN el mejor tiempo y el segundo no se lo quita al primero,
 * como en carretera. Antes se comparaba en crudo y con un campo apretado salían líneas que decían
 * «X le quita el mejor tiempo a Y» enseñando el mismo tiempo para los dos.
 */
function bestChain(arrivals: readonly { riderId: string; timeS: number; clockS: number }[]): {
  first: BestBeat | null
  changes: BestBeat[]
} {
  let best = Infinity
  let holder = ''
  let first: BestBeat | null = null
  const changes: BestBeat[] = []
  for (const a of arrivals) {
    const timeS = Math.round(a.timeS)
    if (timeS >= best) continue
    const beat: BestBeat = {
      tS: a.clockS,
      riderId: a.riderId,
      timeS,
      gainS: best === Infinity ? 0 : best - timeS,
      previousId: holder,
    }
    if (first === null) first = beat
    else changes.push(beat)
    best = timeS
    holder = a.riderId
  }
  return { first, changes }
}

/** Un alcance: quién caza a quién, dónde y con cuánta ventaja de salida. */
interface CatchBeat extends Beat {
  chaserId: string
  caughtId: string
  km: number
  /** Segundos que el alcanzado salió por delante. */
  headStartS: number
}

/**
 * Los ALCANCES, leídos de las trazas ya calculadas (no se simula nada nuevo y no cambia ningún
 * tiempo). Dos corredores están juntos en el km x cuando coinciden sus relojes ahí; que B pase a A
 * es exactamente que el reloj de B en ese punto baje del de A. Se recorre el recorrido bloque a
 * bloque manteniendo la lista ordenada por reloj —que es el orden REAL en la carretera— y cada
 * trasposición es un adelantamiento. Solo se cuenta la PRIMERA vez que un corredor pasa a otro: si
 * el alcanzado le devuelve el adelantamiento más adelante, eso ya es otra historia y no un alcance.
 */
function findCatches(rides: readonly Ride[], blocks: number, dxKm: number): CatchBeat[] {
  // Al principio el orden en la carretera es el de salida: el que salió antes va por delante.
  const order = rides.map((_, i) => i).sort((a, b) => rides[a]!.startS - rides[b]!.startS)
  const seen = new Set<number>()
  const out: CatchBeat[] = []
  const n = order.length
  for (let i = 0; i < blocks; i++) {
    // Ordenación por inserción: la lista viene casi ordenada del bloque anterior, y cada
    // intercambio adyacente es un cruce entre esos dos corredores.
    for (let j = 1; j < n; j++) {
      let k = j
      while (k > 0) {
        const behind = order[k]!
        const ahead = order[k - 1]!
        if (clockAt(rides[behind]!, i) >= clockAt(rides[ahead]!, i)) break
        order[k - 1] = behind
        order[k] = ahead
        const key = behind * n + ahead
        const chaser = rides[behind]!
        const caught = rides[ahead]!
        // ALCANZAR es cazar a quien te precede en la RAMPA. Un corredor puede recuperar el
        // adelantamiento más adelante —le pasa por un repecho y lo vuelve a perder— y ese cruce de
        // vuelta no es un alcance: es el alcanzado volviendo a su sitio, y contarlo diría que
        // alguien «caza» a quien salió después que él. Se descarta.
        if (!seen.has(key) && chaser.startS > caught.startS) {
          seen.add(key)
          out.push({
            tS: clockAt(chaser, i),
            chaserId: chaser.riderId,
            caughtId: caught.riderId,
            km: Math.round((i + 1) * dxKm),
            headStartS: Math.round(chaser.startS - caught.startS),
          })
        }
        k -= 1
      }
    }
  }
  return out.sort((a, b) => a.tS - b.tS)
}

/** Simula una contrarreloj individual: cada corredor solo contra el crono (SPEC 6.13). */
export function simulateTimeTrial(input: StageInput, seed: string): StageOutput {
  const streams = stageRng(seed)
  const rngNoise = streams('tt')
  const rngDay = streams('day')
  const blocks = sampleProfile(input.profile)
  const log = new EventLog()
  const workUnits = new Map<string, number>()
  const tank = new Map<string, TankState>()

  // LA RAMPA DE SALIDA (v18). La regla vive aparte y es pura: aquí solo se consulta a qué hora sale
  // cada uno. Ningún dado: el orden sale del dorsal y de la general, que son datos de entrada.
  const plan = timeTrialStartOrder(input.riders)
  const startOf = new Map(plan.slots.map((s) => [s.riderId, s.startS]))

  const rides = input.riders.map((rider): Ride => {
    // Piernas del día: escala el nivel efectivo del corredor esta crono (SPEC 6.7), como en carretera.
    const dayFactor = Math.max(
      1 - 3 * STAGE.dayFormSd,
      Math.min(1 + 3 * STAGE.dayFormSd, normal(rngDay, 1, STAGE.dayFormSd)),
    )
    const eff0 = {} as Eff
    for (const k in rider.eff0) {
      const key = k as keyof Eff
      eff0[key] = Math.max(0, Math.min(100, rider.eff0[key] * dayFactor))
    }
    let energy = rider.energy
    let vActual: number = STAGE.initialSpeed
    let tS = 0
    let work = 0
    // La traza es lo único que se añade al bucle: el mismo cálculo, apuntado bloque a bloque para
    // que después se pueda leer quién iba dónde a cada hora (parciales y alcances).
    const raw = new Float64Array(blocks.length)
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]!
      const e = erosion(energy, rider.energy, eff0.RES)
      const eff = effNow(eff0, e)
      const perfil = ttPerfil(eff, block)
      const vObj = targetSpeed(block, perfil, STAGE.ttCommitment)
      const dtIn = blockSeconds(vActual)
      vActual = stepSpeed(vActual, vObj, block.g, dtIn)
      tS += blockSeconds(vActual)
      raw[i] = tS
      // Solo, sin rebufo (shelter 0): el crono se paga entero.
      const cost = blockCost(block, STAGE.ttCommitment, STAGE.shelterAlone)
      energy = Math.max(0, energy - cost)
      work += cost
    }
    workUnits.set(rider.riderId, work)
    tank.set(rider.riderId, tankState(energy, rider.energy, eff0.RES))
    const noise = normal(rngNoise, 1, STAGE.ttNoiseSd)
    const startS = startOf.get(rider.riderId) ?? 0
    const total = tS * noise
    return { riderId: rider.riderId, raw, noise, tS: total, startS, finishS: startS + total }
  })

  const finishers = [...rides].sort((a, b) => a.tS - b.tS)
  const outOfTime = applyIttTimeCut(finishers, input.riders.length, finishKm(input), log)
  // El mismo contrato que `buildResults` en carretera: primero los CLASIFICADOS en orden de etapa y
  // los no clasificados al final, para que quien consume el array por índice —los puntos de
  // temporada, la clasificación por equipos— siga viendo el orden real de la etapa.
  const classified = finishers.filter((f) => !outOfTime.has(f.riderId))
  const results: StageResult[] = [
    ...classified.map((f, idx) => ({
      riderId: f.riderId,
      puesto: idx + 1,
      tiempoS: Math.round(f.tS),
      bonificacionS: 0,
      puntosVolante: 0,
      puntosMontana: 0,
      estado: 'finish' as const,
    })),
    ...finishers
      .filter((f) => outOfTime.has(f.riderId))
      .map((f) => ({
        riderId: f.riderId,
        puesto: 0,
        tiempoS: Math.round(f.tS),
        bonificacionS: 0,
        puntosVolante: 0,
        puntosMontana: 0,
        estado: 'dnf' as const,
      })),
  ]

  narrate(log, input, plan, rides, blocks.length)

  return {
    events: log.toArray(),
    results,
    workUnits,
    incidents: [],
    tank,
    engineVersion: ENGINE_VERSION,
  }
}

/** Km de meta del recorrido, que es donde se cuelgan los eventos de llegada. */
function finishKm(input: StageInput): number {
  return Math.round(input.profile.segments.reduce((sum, seg) => sum + seg.km, 0))
}

/**
 * EL CORTE DE TIEMPO DE LA CONTRARRELOJ (v20, docs/motor.md §VI.3). La deuda que la v14 abrió y la
 * v19 dejó medida y sin activar.
 *
 * **Por qué necesita constante propia, y no es una perilla de calibración.** En una etapa en línea
 * los tiempos llegan apelotonados en un puñado de relojes, así que el corte del 8 % señala al ÚLTIMO
 * GRUPO y a nadie más; en una crono cada uno tiene su tiempo y la distribución es un CONTINUO, de
 * modo que cualquier corte por debajo de la cola se lleva media clasificación por definición. Medido
 * en la v19 sobre `race-colombia` e3: el 8 % elimina a 60 de 130, el 12 % a 5 y el 15 % a 0. El
 * reglamento real da a las contrarrelojes individuales un plazo mucho más generoso —del orden del
 * 25 %— justamente por eso, y con `timeCutItt` = 0,25 el corte no señala a nadie en una crono normal
 * y solo alcanza a quien pincha o se cae, que es lo que un corte tiene que hacer.
 *
 * **Y con las dos salvaguardas de §VI.3, igual que en carretera.** El tope del 4 % del pelotón por
 * etapa y la readmisión con penalización de lo que no quepa en él. Lo único que cambia es lo que es
 * un «grupo»: en una crono, un grupo es UN corredor, porque cada uno corre su carrera. Se reutiliza
 * `applyTimeCut` en vez de escribir una segunda versión de la regla, para que el corte no pueda
 * divergir entre las dos disciplinas.
 *
 * (La etapa 1 de una gran vuelta es el caso que hizo saltar la alarma en la v14 —con el corte de la
 * llana habría eliminado a 150 de 176—; con éste elimina a cero. Ver docs/balance.md «v20».)
 */
function applyIttTimeCut(
  finishers: readonly Ride[],
  starters: number,
  km: number,
  log: EventLog,
): Set<string> {
  const out = new Set<string>()
  if (finishers.length === 0) return out
  const winnerTs = finishers[0]!.tS
  if (winnerTs <= 0) return out
  const limitS = winnerTs * (1 + STAGE.timeCutItt)
  const budget = Math.floor(STAGE.abandonStageCapFraction * starters)
  // Un «grupo» de crono es un corredor: los tiempos son un continuo y nadie llega acompañado.
  const groups = finishers.map((f) => ({ size: 1, timeS: f.tS }))
  const outcome = applyTimeCut(groups, limitS, budget)
  if (outcome.eliminated.length === 0 && outcome.readmitted.length === 0) return out

  const pct = Math.round(1000 * STAGE.timeCutItt) / 10
  const gone = outcome.eliminated.map((i) => finishers[i]!)
  for (const f of gone) out.add(f.riderId)
  if (gone.length > 0) {
    log.emit(km, gone[0]!.finishS, 'fuera_control', 'time_cut', [
      ...gone.slice(0, 3).map((f) => f.riderId),
    ], {
      count: gone.length,
      limitPct: pct,
      gapS: Math.round(gone[0]!.tS - winnerTs),
    })
  }
  const back = outcome.readmitted.map((i) => finishers[i]!)
  if (back.length > 0) {
    // La penalización del reglamento es la misma que en carretera —perder los puntos de la
    // clasificación por puntos de la etapa— y en una crono no hay ninguno que perder, así que aquí
    // se readmite y se cuenta. Sigue haciendo falta: es lo que impide que un corte mal puesto vacíe
    // media carrera de golpe.
    log.emit(km, back[back.length - 1]!.finishS, 'readmision', 'time_cut_readmitted', [
      ...back.slice(0, 3).map((f) => f.riderId),
    ], {
      count: back.length,
      limitPct: pct,
      gapS: Math.round(back[back.length - 1]!.tS - winnerTs),
    })
  }
  return out
}

/**
 * LA CRÓNICA DE LA CRONO. Todo lo que sigue es OBSERVACIÓN: lee las trazas y el reparto de la rampa
 * y emite eventos. No consume azar, no toca ni un tiempo y se puede quitar entera sin que cambie una
 * sola clasificación.
 */
function narrate(
  log: EventLog,
  input: StageInput,
  plan: ReturnType<typeof timeTrialStartOrder>,
  rides: readonly Ride[],
  blockCount: number,
): void {
  if (rides.length === 0 || blockCount === 0) return
  const meta = finishKm(input)
  const byFinish = [...rides].sort((a, b) => a.finishS - b.finishS || a.tS - b.tS)
  const winner = [...rides].sort((a, b) => a.tS - b.tS)[0]!
  const lastOff = plan.slots[plan.slots.length - 1]!
  const lastHome = byFinish[byFinish.length - 1]!
  // La ventana de la jornada: de que sale el primero a que entra el último. Es la referencia del
  // throttle, para que el número de líneas no dependa de cuánta gente haya en la carrera. Cada tipo
  // de línea se reparte sobre la ventana en la que PUEDE ocurrir —los cambios de mejor tiempo, entre
  // la primera y la última llegada— y no sobre el día entero: si no, la mitad del presupuesto de
  // líneas se gasta en un tramo del reloj en el que no hay nada que contar.
  const windowS = Math.max(1, lastHome.finishS)

  // --- 1. La rampa ------------------------------------------------------------------------------
  const firstOff = plan.slots[0]!
  log.emit(0, 0, 'salida', 'tt_start_order', [firstOff.riderId], {
    mode: plan.mode,
    intervalS: plan.intervalS,
    riders: plan.slots.length,
    windowS: Math.round(lastOff.startS),
  })
  // …y el último en tomarla, que con orden inverso de la general es el líder. Se cuenta cuando de
  // verdad ocurre —horas después, con medio campo ya en meta—, no en la línea de salida.
  if (plan.slots.length > 1) {
    log.emit(0, lastOff.startS, 'salida', 'tt_last_off', [lastOff.riderId], {
      afterS: Math.round(lastOff.startS),
      riders: plan.slots.length,
    })
  }

  // --- 2. Los parciales -------------------------------------------------------------------------
  // Puntos de control propios, repartidos a partes iguales (ver `STAGE.ttSplitChecks`).
  const dxKm = STAGE.dx
  for (let c = 1; c <= STAGE.ttSplitChecks; c++) {
    const idx = Math.floor((blockCount * c) / (STAGE.ttSplitChecks + 1)) - 1
    const km = Math.round((idx + 1) * dxKm)
    if (idx < 0 || km < STAGE.ttSplitMinKm || meta - km < STAGE.ttSplitMinKm) continue
    const arrivals = rides
      .map((r) => ({ riderId: r.riderId, timeS: r.raw[idx]! * r.noise, clockS: clockAt(r, idx) }))
      .sort((a, b) => a.clockS - b.clockS)
    const { first, changes } = bestChain(arrivals)
    if (!first) continue
    // El ÚLTIMO cambio manda: es el mejor parcial definitivo del punto de control, y por eso va
    // forzado aunque el throttle lo dejara fuera.
    const beats = [...changes]
    if (beats.length > 0) beats[beats.length - 1] = { ...beats[beats.length - 1]!, forced: true }
    const checkWindowS = arrivals[arrivals.length - 1]!.clockS - arrivals[0]!.clockS
    const gap = narrateGapS(checkWindowS, STAGE.ttSplitMinClockGapS, STAGE.ttSplitNarrateMax)
    for (const b of thin(beats, gap)) {
      const prev = b.previousId ? [b.previousId] : []
      log.emit(km, b.tS, 'parcial', 'tt_split', [b.riderId, ...prev], {
        checkKm: km,
        splitS: Math.round(b.timeS),
        gainS: Math.round(b.gainS),
        ...(b.previousId ? { prevId: b.previousId } : {}),
      })
    }
  }

  // --- 3. La silla del mejor tiempo -------------------------------------------------------------
  const finishArrivals = byFinish.map((r) => ({
    riderId: r.riderId,
    timeS: r.tS,
    clockS: r.finishS,
  }))
  const { first, changes } = bestChain(finishArrivals)
  if (first) {
    log.emit(meta, first.tS, 'meta', 'tt_first_time', [first.riderId], {
      timeS: Math.round(first.timeS),
    })
  }
  // El último cambio de la silla es el GANADOR y lo cuenta `stage_win_itt`: aquí sobra.
  const bestBeats = changes
    .slice(0, -1)
    .map((b) => (b.gainS >= STAGE.ttBestBigGainS ? { ...b, forced: true } : b))
  const finishWindowS = lastHome.finishS - byFinish[0]!.finishS
  const bestGap = narrateGapS(finishWindowS, STAGE.ttBestMinClockGapS, STAGE.ttBestNarrateMax)
  for (const b of thin(bestBeats, bestGap)) {
    log.emit(meta, b.tS, 'meta', 'tt_best_time', [b.riderId, b.previousId], {
      timeS: Math.round(b.timeS),
      gainS: Math.round(b.gainS),
      prevId: b.previousId,
    })
  }

  // --- 4. Los alcances --------------------------------------------------------------------------
  const catches = findCatches(rides, blockCount, dxKm)
  const catchGap = narrateGapS(windowS, STAGE.ttCatchMinClockGapS, STAGE.ttCatchNarrateMax)
  // Al throttle del reloj se le suma una regla de VARIEDAD: ningún corredor sale dos veces en el
  // parte de alcances. Sin ella el mismo rezagado protagoniza media crónica —con el abanico de hoy
  // hay quien es cazado seis veces— y ocho líneas cuentan una historia en vez de ocho.
  const named = new Set<string>()
  let lastCatchS = -Infinity
  for (const c of catches) {
    if (c.tS - lastCatchS < catchGap) continue
    if (named.has(c.chaserId) || named.has(c.caughtId)) continue
    named.add(c.chaserId)
    named.add(c.caughtId)
    lastCatchS = c.tS
    log.emit(c.km, c.tS, 'alcance', 'tt_catch', [c.chaserId, c.caughtId], {
      headStartS: c.headStartS,
    })
  }
  // Y CUÁNTOS FUERON EN TOTAL, que es un dato de la crono y no un adorno: con el abanico de tiempos
  // que reparte hoy el modelo, los primeros en salir se pasan la tarde apartándose.
  if (catches.length > 0) {
    log.emit(meta, lastHome.finishS, 'alcance', 'tt_catches', [], { count: catches.length })
  }

  // --- 5. El desenlace --------------------------------------------------------------------------
  // EL QUE SALIÓ EL ÚLTIMO, cuando entra. Con orden inverso de la general es el maillot de líder y
  // su llegada es el final de la historia; por dorsales es el 1, que es el jefe de filas del equipo
  // que abre la numeración. No se cuenta si además ha ganado: para eso está `stage_win_itt`.
  const lastRide = rides.find((r) => r.riderId === lastOff.riderId)
  if (lastRide && lastRide.riderId !== winner.riderId) {
    log.emit(meta, lastRide.finishS, 'meta', 'tt_last_home', [lastRide.riderId], {
      gapS: Math.round(lastRide.tS - winner.tS),
      timeS: Math.round(lastRide.tS),
      puesto: rides.filter((r) => r.tS < lastRide.tS).length + 1,
    })
  }
  // El evento de mejor tiempo cae en META, y en el reloj en que el resultado queda cerrado: el
  // ganador puede haber entrado hace media hora, pero la crono no se gana hasta que entra el último.
  const runnerUp = [...rides].sort((a, b) => a.tS - b.tS)[1]
  log.emit(meta, lastHome.finishS, 'meta', 'stage_win_itt', [winner.riderId], {
    timeS: Math.round(winner.tS),
    marginS: runnerUp ? Math.round(runnerUp.tS - winner.tS) : 0,
    startedNth: plan.slots.findIndex((s) => s.riderId === winner.riderId) + 1,
    riders: rides.length,
  })
}
