/**
 * El journal de una etapa: convierte los eventos del motor en la crónica que lee el jugador.
 *
 * Estaba dentro de `pages/StageReplay.tsx`. Vive aquí porque ahora lo pintan DOS páginas: la ficha
 * de etapa de una carrera por etapas y la ficha de una carrera de UN DÍA, donde la carrera y la
 * etapa son la misma cosa y el journal es el contenido principal (docs/navegacion.md §7.1).
 *
 * Presentación pura: sin React ni HTTP, y por tanto probable sin DOM. Los textos son de interfaz,
 * así que van en inglés; el vocabulario de los eventos sigue en el idioma del motor.
 */

import type { ChronicleEntry, StageResultEntry } from '@cyclingstar/shared'
import { STAGE } from '@cyclingstar/engine'
import { formatTime } from './format'

/**
 * Por debajo de este tamaño el grupo de cabeza deja de ser «un pelotón»: se nombra a los corredores
 * y no al equipo que tira. Es el MISMO umbral con el que el motor decide emitir los nombres
 * (`STAGE.frontNamesMaxRiders`), para que la crónica no diga «cinco en cabeza» en una frase y
 * «Cumbre Escuadra impone el ritmo» en la siguiente: con tres corredores no tira un equipo.
 */
const SMALL_FRONT_GROUP = STAGE.frontNamesMaxRiders

/** Segundos como diferencia de carrera: 45s, 1:30, 12:05. */
export function fmtGap(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = String(seconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

/** Índice determinista para elegir una variante de frase (misma entrada ⇒ misma variante). */
export function variantIndex(seed: string, mod: number): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0
  return mod > 0 ? h % mod : 0
}

/** Une una lista con comas y "and" al final: "A", "A and B", "A, B and C". */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * Convierte un evento del motor en una frase del journal. Varias redacciones por evento, elegidas
 * de forma determinista (misma etapa ⇒ mismo relato, pero variado entre eventos y etapas), y con
 * nombres de corredores y de equipos para que se lea como una crónica de verdad.
 */
export function chronicleLine(e: ChronicleEntry): string {
  const who = listNames(e.protagonists)
  const team = e.protagonistTeams?.[0]
  const teams = listNames(e.protagonistTeams ?? [])
  const seed = `${e.plantilla}:${e.km}:${who}`
  const pick = (opts: string[]): string => opts[variantIndex(seed, opts.length)] ?? opts[0] ?? ''
  switch (e.plantilla) {
    case 'breakaway_formed':
      return pick([
        `${who || 'A group'} attack and open up the day's break.`,
        `${who || 'A handful of riders'} jump clear off the front.`,
        `The break of the day forms: ${who || 'an early move'} go up the road.`,
        `${who || 'A move'} slip away and get a gap.`,
      ])
    case 'break_cooperation':
      return e.datos?.cooperating === 1
        ? pick([
            'Up front they collaborate well, rolling smooth turns.',
            'The break is working like a well-drilled team, sharing the load.',
            'Good understanding in the move — everyone takes their turn.',
          ])
        : pick([
            'There is little cooperation up front — the move looks disorganised.',
            'The escapees eye each other and few want to work.',
            'No unity in the break; the turns are ragged.',
          ])
    case 'sprinters_chase':
      return team
        ? pick([
            `${team} hit the front and take up the chase.`,
            `${team} mass at the head of the bunch to reel the break in.`,
            `${team} take control, winding up the pace behind ${e.protagonists[0] ?? 'their sprinter'}.`,
          ])
        : pick([
            "The sprinters' teams take up the chase.",
            'The bunch organises behind — the chase is on.',
          ])
    case 'time_gap': {
      const g = fmtGap(Number(e.datos?.gapS ?? 0))
      const trend = Number(e.datos?.trend ?? 0)
      // `leadSize` llega desde v6 del motor: dice CUÁNTOS van en cabeza, así que la frase puede
      // hablar de "the lone leader" o "the five out front" en vez de dar por hecho que es la fuga.
      // Las crónicas guardadas antes de v6 no lo traen y caen a la redacción de siempre.
      const lead = e.datos?.leadSize == null ? null : Number(e.datos.leadSize)
      if (lead === 1) {
        if (trend > 0) return `Out front the lone leader stretches the advantage to ${g}.`
        if (trend < 0) return `The lone leader's advantage is down to ${g}.`
        return `The lone leader holds ${g}.`
      }
      if (lead != null && lead <= SMALL_FRONT_GROUP) {
        if (trend > 0) return `The ${lead} out front pull away — ${g} now.`
        if (trend < 0) return `The chase is eating into it: the ${lead} leaders are ${g} up.`
        return `The ${lead} leaders hold ${g} over the chase.`
      }
      if (trend > 0)
        return pick([`The lead stretches out to ${g}.`, `Out front the gap grows to ${g}.`])
      if (trend < 0)
        return pick([
          `The advantage is down to ${g} and falling.`,
          `The bunch has the gap back to ${g}.`,
        ])
      return pick([`The break leads by ${g}.`, `Out front the advantage holds at ${g}.`])
    }
    case 'front_group': {
      // Quiénes van delante. El motor solo emitía un número ("about 5 left in front") y el lector
      // se quedaba con la pregunta obvia: ¿cuáles cinco? Desde v6 vienen los nombres.
      const size = Number(e.datos?.size ?? e.protagonists.length)
      const toGo = Number(e.datos?.toGo ?? 0)
      const gap = Number(e.datos?.gapS ?? 0)
      const left = toGo > 0 ? ` with ${toGo} km to go` : ''
      // La ventaja solo se dice si es de verdad. El "perseguidor" inmediato puede ser el compañero
      // que acaba de soltarse tres segundos antes, y «3s clear» ahí no informa de nada: engaña.
      const clear = gap >= STAGE.gapReportMinSeconds ? `, ${fmtGap(gap)} clear` : ''
      if (size === 1) return `${who || 'The leader'} is alone at the front${clear}${left}.`
      if (size === 2) return `Just two left in front${left}: ${who}${clear}.`
      return `Only ${size} riders left in front${left}: ${who}${clear}.`
    }
    case 'peloton_concedes':
      return pick([
        'The peloton concedes — the break is given room to fight for the win.',
        'The bunch eases and lets the move take its rope.',
        'No panic behind: the favourites wave the break up the road.',
      ])
    case 'sprinters_give_up':
      return pick([
        "The sprinters' teams give up the chase.",
        'The lead-out trains sit up — the catch looks off.',
        'Behind, the fast men run out of legs and abandon the pursuit.',
      ])
    case 'breakaway_caught':
      return pick([
        'The peloton catches the breakaway — everyone back together.',
        'The break is caught; the race is all together again.',
        'The chase succeeds and the escapees are reeled back in.',
      ])
    case 'sprint_intermediate':
      return pick([
        `${who} takes the intermediate sprint.`,
        `${who} kicks first at the intermediate.`,
        `${who} grabs the points at the intermediate sprint.`,
      ])
    case 'climb_kom': {
      const cat = String(e.datos?.category ?? '')
      const catLabel =
        cat === 'HC'
          ? 'hors-catégorie climb'
          : cat.startsWith('cat')
            ? `category ${cat.slice(3)} climb`
            : 'climb'
      const pts = Number(e.datos?.points ?? 0)
      const t = team ? ` (${team})` : ''
      const ptsPart = pts > 0 ? `, taking ${pts} KOM point${pts === 1 ? '' : 's'}` : ''
      const leadPart = e.datos?.leads === 1 ? ' — he now leads the mountains classification' : ''
      return `${who}${t} is first over the ${catLabel}${ptsPart}${leadPart}.`
    }
    case 'peloton_split': {
      const dropped = Number(e.datos?.dropped ?? 0)
      const remaining = e.datos?.remaining == null ? null : Number(e.datos.remaining)
      // `before` y `chasing` llegan desde v6. Sin ellos (crónicas guardadas antes) se narra como
      // siempre: es la redacción vieja, que no miente, solo cuenta menos.
      const before = e.datos?.before == null ? null : Number(e.datos.before)
      // Si la fuga sigue en carretera, este grupo NO va en cabeza: decir "left in front" era falso.
      const chasing = e.datos?.chasing === 1
      const group = chasing ? 'the chase group' : 'the lead group'
      const where = chasing ? 'in the chase' : 'in front'
      // Con un grupo grande tira un EQUIPO y así se narra; con un grupo pequeño no tira un equipo,
      // tira un corredor. Es la observación del dueño: "Cumbre Escuadra lift the pace" con tres
      // corredores en cabeza es absurdo. El tamaño de referencia es el del grupo ANTES del corte.
      const groupSize = before ?? remaining ?? 0
      const small = groupSize > 0 && groupSize <= SMALL_FRONT_GROUP
      const driver = small
        ? who
          ? `${who} forces the pace`
          : 'The pace goes up'
        : team
          ? `${team} lift the pace`
          : who
            ? `${who} lifts the pace`
            : 'The pace lifts'

      // Con `before` la frase dice de cuántos a cuántos ha quedado el grupo, que es lo que el
      // lector necesita para no encontrarse 78 corredores desaparecidos entre dos líneas.
      if (before != null && remaining != null && before > remaining) {
        if (remaining === 1)
          return `${driver} and the last companions crack — ${who || 'the leader'} rides on alone.`
        if (small)
          return pick([
            `${driver} and ${group} is down from ${before} to ${remaining}.`,
            `${driver}; ${dropped} of the ${before} leaders let go — ${remaining} still there.`,
          ])
        return pick([
          `${driver} and the climb tears ${group} apart — from ${before} riders down to ${remaining}.`,
          `${driver}: ${dropped} riders are shelled and ${group} is cut from ${before} to ${remaining}.`,
          `${driver}; ${group} thins out from ${before} to ${remaining} over the climb.`,
        ])
      }

      const left = remaining != null ? ` — about ${remaining} left ${where}` : ''
      return pick([
        `${driver} on the climb — ${dropped} riders are shelled${left}.`,
        `${driver} and ${dropped} riders slip off the back${left}.`,
        `${driver}; the climb thins ${group} by ${dropped}${left}.`,
      ])
    }
    case 'final_km': {
      const margin = Number(e.datos?.margin ?? 0)
      const field = Number(e.datos?.field ?? 0)
      const m = margin > 0 ? ` by ${fmtGap(margin)}` : ''
      if (field <= 1)
        return `Into the final kilometre ${who} leads alone${m} — barring mishap the stage is won.`
      return `Into the final kilometre ${who} are clear${m} — the win will be fought out among them.`
    }
    case 'bunch_sprint': {
      const led = e.datos?.ledOut === 1
      const trio = listNames(e.protagonists.slice(0, 3))
      return pick([
        `Into the final kilometre it's a bunch sprint — ${trio} fight it out.`,
        `The trains wind up for a mass gallop; ${trio} are in the mix.`,
        led
          ? `Perfectly led out, ${e.protagonists[0] ?? 'the sprinter'} launches with ${trio} for company.`
          : `All together for the sprint: ${trio} line it up.`,
      ])
    }
    case 'stage_win': {
      const t = team ? ` (${team})` : ''
      const won = e.datos?.won
      const margin = Number(e.datos?.margin ?? 0)
      if (won === 'solo')
        return pick([
          `${who}${t} solos to victory, ${fmtGap(margin)} clear of the chase.`,
          `${who}${t} holds on alone to win by ${fmtGap(margin)}.`,
        ])
      if (won === 'sprint')
        return pick([
          `${who}${t} wins the bunch sprint.`,
          `${who}${t} takes the sprint from the bunch.`,
          `${who}${t} throws up the arms — fastest in the sprint.`,
        ])
      if (won === 'group')
        return pick([
          `${who}${t} wins from the lead group.`,
          `${who}${t} outkicks the leaders for the stage.`,
        ])
      return `${who}${t} wins the stage.`
    }
    case 'stage_win_itt':
      return `${who} sets the fastest time.`
    default:
      return `${e.plantilla}${who ? `: ${who}` : ''}${teams ? ` (${teams})` : ''}`
  }
}

/** Diferencia contra el mejor tiempo, formateada (+Ns o +m:ss). */
export function gapToBest(seconds: number): string {
  if (seconds < 60) return `+${seconds}s`
  const m = Math.floor(seconds / 60)
  const ss = String(seconds % 60).padStart(2, '0')
  return `+${m}:${ss}`
}

/**
 * Relato de una contrarreloj a partir de los tiempos reales: una crono no tiene fuga ni sprint que
 * narrar, así que el journal cuenta lo que importa —mejor tiempo, quién se acercó, y cuán apretada
 * quedó la clasificación contra el crono—.
 */
export function timeTrialStory(results: StageResultEntry[]): string[] {
  if (results.length === 0) return []
  const winner = results[0]!
  const gap = (r: StageResultEntry) => r.tiempoS - winner.tiempoS
  const lines = [`Best time of the day: ${winner.name} — ${formatTime(winner.tiempoS)}.`]
  if (results[1]) lines.push(`${results[1].name} came closest, ${gapToBest(gap(results[1]))} down.`)
  if (results[2])
    lines.push(`${results[2].name} rounded out the podium at ${gapToBest(gap(results[2]))}.`)
  const within = results.filter((r) => gap(r) <= 60).length
  if (within >= 2)
    lines.push(`${within} riders finished within a minute of the best time — a tight one.`)
  return lines
}
