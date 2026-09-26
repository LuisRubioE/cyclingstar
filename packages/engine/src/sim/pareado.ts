/**
 * EL PAREADO VIEJO CONTRA NUEVO (docs/generador.md §13.6 punto 3 y §15.11; paso 9). `pnpm sim:pareado
 * [semillas=12]` corre cada banco de simulación con el calendario de la v86 (`legacyCalendar()`, en
 * `sim/legacy/`) y con el de la v87 (`SEASON_CALENDAR`), con las MISMAS semillas y los mismos campos
 * (`engineVersion: 1` fijo en la semilla de etapa, como todo el banco), y escribe UNA tabla Markdown
 * por `stdout`: `| banda | viejo | nuevo | Δ mediana | previsto | cumple |`, una fila por banda de
 * `PRE_REGISTRO`. `viejo` y `nuevo` son la cifra del banco sobre todas las semillas (la misma cuenta
 * que su test); `Δ mediana` es la mediana de las diferencias por semilla. El progreso y lo que se
 * imprime sin banda (los estratos, las reinas generadas, qué ocho carreras entran) van por `stderr`.
 * No escribe ningún fichero y no exporta nada (§3.10): el implementador pega la tabla en «v87 §2».
 *
 * Lectura de «cumple» (§13.6): `sube` si la mediana de las diferencias es positiva, `baja` si es
 * negativa, `igual` si el cero cae entre el p25 y el p75 de las diferencias, y el intervalo
 * `previsto`, si lo hay, acota la diferencia o el valor nuevo según diga la fila.
 *
 * Se borra con `sim/legacy/` (sin `legacyCalendar()` no compila), en el mismo cambio que cierra
 * «v87 §2» si se cumplen las cuatro condiciones de la decisión 30.
 */
import type { CalendarRace } from '../routes/calendar.js'
import { SEASON_CALENDAR } from '../routes/calendar.js'
import { simulateStage } from '../stage/simulate.js'
import type { RaceEvent } from '../stage/types.js'
import { analyzeErosion } from './analyze.js'
import { allCalendarQueens, calendarQueenSample, BANDAS_DESNIVEL } from './calendarQueens.js'
import { type AuditEntry, type DefectKey, auditStage } from './coherence.js'
import { GENERATED_QUEENS } from './frozenSkeletons.js'
import { tailStats, type StageTail } from './grandTour.js'
import { legacyCalendar } from './legacy/profileGenLegacy.js'
import { PRE_REGISTRO, type PreRegistro } from './preRegistro.js'
import { REAL_QUEENS, realQueenSetup, runRealQueen } from './realQueens.js'
import { hardestOneDay } from './saturation.js'
import { campaignSeeds, realRaceScenario } from './scenarios.js'
import {
  SMALL_TOURS,
  finishPhoto,
  moveMargins,
  runSmallTour,
  shapeStats,
  winShare,
  type SmallTourRun,
} from './smallTours.js'
import { REAL_TIME_TRIALS, runRealTimeTrial } from './timeTrials.js'

const arg = process.argv[2]
const semillas = arg === undefined ? 12 : Number(arg)
if (!Number.isInteger(semillas) || semillas < 1)
  throw new Error(`sim:pareado: semillas tiene que ser un entero ≥ 1 (recibido ${arg})`)

const log = (s: string): void => {
  process.stderr.write(`${s}\n`)
}
const mediana = (xs: readonly number[]): number => {
  if (xs.length === 0) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}
const cuantil = (xs: readonly number[], p: number): number => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))] ?? NaN
}

/** Lo que un banco devuelve para un calendario: la cifra de cada banda y la de cada semilla. */
interface Medida {
  conjunto: Record<string, number>
  porSemilla: Record<string, number>[]
}

type Lado = 'viejo' | 'nuevo'
const CALENDARIO: Record<Lado, CalendarRace[]> = {
  viejo: legacyCalendar(),
  nuevo: SEASON_CALENDAR,
}
const BANCOS = 6
let bancoActual = 0
const progreso = (nombre: string, lado: Lado, s: number): void =>
  log(`banco ${bancoActual} de ${BANCOS} (${nombre}, ${lado}), semilla ${s + 1} de ${semillas}`)

// ---- 1. Reinas reales (§13.5): el lado viejo corre las tres como las dibujaba la v86 ----
function reinasReales(lado: Lado): Medida {
  const cal = CALENDARIO[lado]
  const congeladas = lado === 'nuevo'
  const porEtapa = new Map<string, number[]>()
  const todas: StageTail[] = []
  const porSemilla: Record<string, number>[] = []
  for (let s = 0; s < semillas; s++) {
    progreso('realQueens', lado, s)
    const colas = REAL_QUEENS.map((q) => {
      const t = runRealQueen(q, s, cal, congeladas)
      porEtapa.set(q.raceId, [...(porEtapa.get(q.raceId) ?? []), t.lastGroupPct])
      return t
    })
    todas.push(...colas)
    porSemilla.push({
      'realQueens.lastGroupPct': mediana(colas.map((t) => t.lastGroupPct)),
      'realQueens.worstStagePct': Math.max(...colas.map((t) => t.lastGroupPct)),
    })
  }
  if (lado === 'nuevo')
    for (const g of GENERATED_QUEENS) {
      const colas = Array.from({ length: Math.min(6, semillas) }, (_, s) =>
        runRealQueen({ raceId: g.raceId, stageIndex: g.stageIndex, why: '' }, s, cal),
      )
      log(
        `  generada ${g.finalKind} (${g.raceId} e${g.stageIndex}, ${g.skeleton}): cola mediana ${tailStats(colas).medianLastGroupPct.toFixed(2)} %`,
      )
    }
  return {
    conjunto: {
      'realQueens.lastGroupPct': tailStats(todas).medianLastGroupPct,
      'realQueens.worstStagePct': Math.max(...[...porEtapa.values()].map(mediana)),
    },
    porSemilla,
  }
}

// ---- 2. Cronos reales ----
function cronos(lado: Lado): Medida {
  const cal = CALENDARIO[lado]
  const porCrono = new Map<string, number[]>()
  const todas: number[] = []
  const porSemilla: Record<string, number>[] = []
  for (let s = 0; s < semillas; s++) {
    progreso('timeTrials', lado, s)
    const colas = REAL_TIME_TRIALS.map((tt) => {
      const t = runRealTimeTrial(tt, s, cal).tailPct
      porCrono.set(tt.raceId, [...(porCrono.get(tt.raceId) ?? []), t])
      return t
    })
    todas.push(...colas)
    porSemilla.push({
      'timeTrials.tailPct': mediana(colas),
      'timeTrials.worstStagePct': Math.max(...colas),
    })
  }
  return {
    conjunto: {
      'timeTrials.tailPct': mediana(todas),
      'timeTrials.worstStagePct': Math.max(...[...porCrono.values()].map(mediana)),
    },
    porSemilla,
  }
}

// ---- 3. La montaña que se corre (§13.4): cada calendario con su propia muestra estratificada ----
function reinasDelCalendario(lado: Lado): Medida {
  const cal = CALENDARIO[lado]
  const muestra = calendarQueenSample(allCalendarQueens(cal))
  const bandaDe = (d: number): string =>
    BANDAS_DESNIVEL.find((b) => d >= b.min && d < b.max)!.nombre
  const porBanda = new Map<string, { n: number; w: number }>()
  const porSemilla: Record<string, number>[] = []
  let total = 0
  let fugas = 0
  for (let s = 0; s < semillas; s++) {
    progreso('calendarQueens', lado, s)
    let w = 0
    const bandaSemilla = new Map<string, { n: number; w: number }>()
    for (const q of muestra) {
      const { input, seed } = realQueenSetup(
        { raceId: q.raceId, stageIndex: q.stageIndex, why: '' },
        s,
        cal,
        false,
      )
      const gana = simulateStage(input, seed).events.find((e) => e.tipo === 'meta')?.datos?.fuga
      const b = bandaDe(q.dPlus)
      for (const m of [porBanda, bandaSemilla]) {
        const acc = m.get(b) ?? { n: 0, w: 0 }
        acc.n += 1
        acc.w += gana === 1 ? 1 : 0
        m.set(b, acc)
      }
      if (gana === 1) w += 1
    }
    total += muestra.length
    fugas += w
    porSemilla.push({
      'calendarQueens.breakawayWinPct': (100 * w) / muestra.length,
      'calendarQueens.porCubeta': monotona(bandaSemilla),
    })
  }
  log(
    `  ${lado}: muestra de ${muestra.length} reinas; fuga por banda ` +
      BANDAS_DESNIVEL.map((b) => {
        const acc = porBanda.get(b.nombre)
        return `${b.nombre} ${acc ? `${((100 * acc.w) / acc.n).toFixed(1)} % (${acc.n / semillas})` : '—'}`
      }).join(' · '),
  )
  return {
    conjunto: {
      'calendarQueens.breakawayWinPct': (100 * fugas) / total,
      'calendarQueens.porCubeta': monotona(porBanda),
    },
    porSemilla,
  }
}
/** 1 si el % de fugas no crece con el desnivel entre las bandas pobladas, 0 si crece en alguna. */
function monotona(m: Map<string, { n: number; w: number }>): number {
  const pcts = BANDAS_DESNIVEL.map((b) => m.get(b.nombre))
    .filter((x): x is { n: number; w: number } => x !== undefined && x.n > 0)
    .map((x) => x.w / x.n)
  return pcts.every((p, i) => i === 0 || p <= pcts[i - 1]! + 1e-9) ? 1 : 0
}

// ---- 4. Saturación de las ocho más duras fuera del WorldTour ----
const SATURACION_VACIADO = 0.96 // los umbrales de invariantsClasicas.test.ts, sin tocar
const SATURACION_PAJARAS = 14
function saturacion(lado: Lado): Medida {
  const cal = CALENDARIO[lado]
  const ocho = hardestOneDay(cal)
  log(`  ${lado}: las ocho más duras: ${ocho.join(', ')}`)
  const satura = (st: { medianDepletion: number; bonkPct: number }): boolean =>
    st.medianDepletion > SATURACION_VACIADO || st.bonkPct > SATURACION_PAJARAS
  const porSemilla: Record<string, number>[] = []
  for (let s = 0; s < semillas; s++) {
    progreso('saturación', lado, s)
    porSemilla.push({
      'saturacion.ochoMasDuras': ocho.filter((id) =>
        satura(analyzeErosion(realRaceScenario(id, 1, cal), [campaignSeeds(id, s + 1)[s]!])),
      ).length,
    })
  }
  let saturadas = 0
  for (const id of ocho) {
    const st = analyzeErosion(realRaceScenario(id, 1, cal), campaignSeeds(id, semillas))
    log(
      `  ${lado} ${id}: vaciado ${st.medianDepletion.toFixed(3)}, pájaras ${st.bonkPct.toFixed(1)} %`,
    )
    if (satura(st)) saturadas += 1
  }
  return { conjunto: { 'saturacion.ochoMasDuras': saturadas }, porSemilla }
}

// ---- 5. Carreras pequeñas ----
function pequenas(lado: Lado): Medida {
  const cal = CALENDARIO[lado]
  const todas: SmallTourRun[] = []
  const porSemilla: Record<string, number>[] = []
  const cifras = (runs: SmallTourRun[]): Record<string, number> => {
    const filas = runs.flatMap((r) => r.rows)
    const share = winShare(runs)
    const photo = finishPhoto(runs)
    return {
      'smallTours.mediaGroups': shapeStats(filas.filter((r) => r.kind === 'media')).medianGroups,
      'smallTours.mediaOneGroupPct': shapeStats(filas.filter((r) => r.kind === 'media'))
        .oneGroupPct,
      'smallTours.flatWinnerGroupPct': shapeStats(filas.filter((r) => r.kind === 'llana'))
        .medianWinnerGroupPct,
      'smallTours.photoRepeatTopFive': photo.repeatTopFive,
      'smallTours.worstRacePhotoRepeat': photo.worstRepeatTopFive,
      'smallTours.sameWinnerPairPct': photo.sameWinnerPct,
      'smallTours.bestSprinterWinPct': share.bestSprinterWinPct,
      'smallTours.sweepPct': share.sweepPct,
      'smallTours.flatMoveWorstMarginS': moveMargins(filas.filter((r) => r.kind === 'llana'))
        .maxMarginS,
    }
  }
  for (let s = 0; s < semillas; s++) {
    progreso('smallTours', lado, s)
    const runs = SMALL_TOURS.map((t) => runSmallTour(t, s, cal))
    todas.push(...runs)
    porSemilla.push(cifras(runs))
  }
  const media = todas.flatMap((r) => r.rows).filter((r) => r.kind === 'media').length
  log(`  ${lado}: ${media} etapas media en ${todas.length} carreras`)
  return { conjunto: cifras(todas), porSemilla }
}

// ---- 6. Coherencia de la crónica sobre Race Jaén (40 semillas, las del banco) ----
const INVARIANTES: readonly DefectKey[] = [
  'frenteSinExplicar',
  'cazadaFantasma',
  'ataqueSinCerrar',
  'montanaDosVeces',
  'perseguidorDeUno',
]
const TOLERANCIA: Partial<Record<DefectKey, number>> = { ataqueSinCerrar: 2 }
/** La crónica cruda como la lee `coherence.test.ts` (su `rawChronicle`, copiado). */
function cronica(events: readonly RaceEvent[]): AuditEntry[] {
  return events
    .filter((e) => e.datos?.narra !== 0)
    .filter((e) => !(e.plantilla === 'attack_go' && e.km < 1))
    .map((e) => ({
      km: Math.round(e.km),
      plantilla: e.plantilla,
      riders: e.protagonistas,
      datos: e.datos ?? {},
      tS: e.tS,
    }))
    .sort((a, b) => a.km - b.km || a.tS - b.tS)
    .map(({ km, plantilla, riders, datos }) => ({ km, plantilla, riders, datos }))
}
function coherencia(lado: Lado): Medida {
  const cal = CALENDARIO[lado]
  const escenario = realRaceScenario('race-jaen', 1, cal)
  const n = Math.max(40, semillas)
  const peor: Record<string, number> = {}
  const porSemilla: Record<string, number>[] = []
  const seeds = campaignSeeds('Race Jaén', n)
  for (let s = 0; s < n; s++) {
    if (s % 10 === 0) progreso('coherencia', lado, s)
    const { counts } = auditStage(cronica(simulateStage(escenario.input, seeds[s]!).events))
    let fuera = 0
    for (const d of INVARIANTES) {
      peor[d] = Math.max(peor[d] ?? 0, counts[d])
      fuera += Math.max(0, counts[d] - (TOLERANCIA[d] ?? 0))
    }
    porSemilla.push({ 'coherencia.jaen': fuera })
  }
  const total = INVARIANTES.reduce(
    (a, d) => a + Math.max(0, (peor[d] ?? 0) - (TOLERANCIA[d] ?? 0)),
    0,
  )
  return { conjunto: { 'coherencia.jaen': total }, porSemilla }
}

// ---- La tabla ----
const fmt = (x: number): string =>
  Number.isNaN(x) ? '—' : (Math.round(x * 100) / 100).toString().replace('.', ',')
const previstoTexto = (p: PreRegistro): string => {
  const dir = p.direccion === 'igual_ruido' ? 'igual con ruido' : p.direccion
  const base = p.oIgual ? `${dir} o igual` : dir
  if (!p.previsto) return base
  const [a, b] = p.previsto.map(fmt)
  return `${base}, ${p.sobre === 'delta' ? 'Δ' : 'nuevo'} en [${a}; ${b}]`
}
function cumple(p: PreRegistro, viejo: number, nuevo: number, deltas: number[]): string {
  const med = mediana(deltas)
  const ceroDentro = cuantil(deltas, 0.25) <= 1e-9 && cuantil(deltas, 0.75) >= -1e-9
  let ok: boolean
  switch (p.direccion) {
    case 'sube':
      ok = med > 0
      break
    case 'baja':
      ok = med < 0 || (p.oIgual === true && ceroDentro)
      break
    default:
      ok = ceroDentro
  }
  if (p.previsto) {
    const v = p.sobre === 'delta' ? med : nuevo
    if (v < p.previsto[0] - 1e-9 || v > p.previsto[1] + 1e-9) ok = false
  }
  void viejo
  return ok ? 'sí' : 'no'
}

const bancos: { nombre: string; correr: (l: Lado) => Medida }[] = [
  { nombre: 'realQueens', correr: reinasReales },
  { nombre: 'timeTrials', correr: cronos },
  { nombre: 'calendarQueens', correr: reinasDelCalendario },
  { nombre: 'saturación', correr: saturacion },
  { nombre: 'smallTours', correr: pequenas },
  { nombre: 'coherencia', correr: coherencia },
]
const medidas: Record<Lado, Medida> = {
  viejo: { conjunto: {}, porSemilla: [] },
  nuevo: { conjunto: {}, porSemilla: [] },
}
for (const b of bancos) {
  bancoActual += 1
  for (const lado of ['viejo', 'nuevo'] as const) {
    const t0 = performance.now()
    const m = b.correr(lado)
    Object.assign(medidas[lado].conjunto, m.conjunto)
    m.porSemilla.forEach((fila, s) => {
      medidas[lado].porSemilla[s] = { ...(medidas[lado].porSemilla[s] ?? {}), ...fila }
    })
    log(`${b.nombre} (${lado}): ${((performance.now() - t0) / 1000).toFixed(0)} s`)
  }
}

const filas = [
  '| banda | viejo | nuevo | Δ mediana | previsto | cumple |',
  '| ----- | ----- | ----- | --------- | -------- | ------ |',
]
for (const p of PRE_REGISTRO) {
  if (p.noPareado) {
    filas.push(`| \`${p.banda}\` | — | — | — | ${previstoTexto(p)} | no pareado: ${p.noPareado} |`)
    continue
  }
  const viejo = medidas.viejo.conjunto[p.banda] ?? NaN
  const nuevo = medidas.nuevo.conjunto[p.banda] ?? NaN
  const deltas = medidas.nuevo.porSemilla
    .map((f, s) => (f[p.banda] ?? NaN) - (medidas.viejo.porSemilla[s]?.[p.banda] ?? NaN))
    .filter((d) => !Number.isNaN(d))
  filas.push(
    `| \`${p.banda}\` | ${fmt(viejo)} | ${fmt(nuevo)} | ${fmt(mediana(deltas))} | ${previstoTexto(p)} | ${cumple(p, viejo, nuevo, deltas)} |`,
  )
}
process.stdout.write(`${filas.join('\n')}\n`)
