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
    // --- La capa táctica (docs/motor.md §13) ------------------------------------------------
    // Un ataque que ocurre y no se cuenta no existe para el jugador. El motor emite todos los
    // intentos como telemetría y marca cuáles merecen frase; aquí se les pone voz. Cada tipo de
    // movimiento se cuenta como lo que es: no es lo mismo el manotazo del km 5 que el ataque del
    // último puerto, ni un puente que se cierra que uno que se queda a medio camino.
    case 'attack_go': {
      const jumped = Number(e.datos?.saltan ?? e.protagonists.length)
      const stranded = Number(e.datos?.tierra ?? 0)
      const toGo = Number(e.datos?.toGo ?? 0)
      const held = e.datos?.cuerda === 0
      const tail =
        stranded > 0
          ? ` ${stranded} more tr${stranded === 1 ? 'ies' : 'y'} to go with them and cannot hold the wheel.`
          : ''
      if (e.datos?.kind === 'puente')
        return `${who || 'A rider'} jump${jumped === 1 ? 's' : ''} across, chasing the leaders on their own.${tail}`
      if (e.datos?.kind === 'ataque_final')
        return pick([
          `${who} attack${jumped === 1 ? 's' : ''} with ${toGo} km to go.${tail}`,
          `It is ${who} who goes, ${toGo} km from the line.${tail}`,
        ])
      if (e.datos?.kind === 'ataque_grupo')
        return pick([
          `${who} attack${jumped === 1 ? 's' : ''} out of the front group.${tail}`,
          `The move splinters: ${who} kick${jumped === 1 ? 's' : ''} clear.${tail}`,
        ])
      // `cuerda` dice si el pelotón ha decidido dar cuerda al movimiento. Lo que se narra es su
      // REACCIÓN, no el desenlace: a veces el pelotón se pone a cerrar y aun así no llega.
      const chased = held ? ' The bunch reacts at once and the pace goes up behind.' : ''
      return pick([
        `${who} go clear off the front.${tail}${chased}`,
        `Attack: ${who} force${jumped === 1 ? 's' : ''} the pace and open a gap.${tail}${chased}`,
        `${who} tr${jumped === 1 ? 'ies' : 'y'} their luck up the road.${tail}${chased}`,
      ])
    }
    case 'attack_swarm': {
      // Regla 2 llevada al extremo: saltan tantos que el ataque no separa nada.
      const jumped = Number(e.datos?.saltan ?? 0)
      return pick([
        `${who} go, but half the group goes with them — ${jumped} riders and no gap.`,
        `Everyone is watching: ${jumped} jump across at once and nothing opens up.`,
      ])
    }
    case 'attack_sticks': {
      const gap = fmtGap(Number(e.datos?.gapS ?? 0))
      const toGo = Number(e.datos?.toGo ?? 0)
      const size = Number(e.datos?.size ?? e.protagonists.length)
      if (size === 1) return `${who} has a real gap now — ${gap}, ${toGo} km from the finish.`
      return `The move sticks: ${who} have ${gap} with ${toGo} km to go.`
    }
    case 'attack_reeled':
      return pick([
        `The bunch closes it down and ${who || 'the move'} ${e.protagonists.length === 1 ? 'is' : 'are'} back.`,
        `Nothing doing: ${who || 'the attack'} ${e.protagonists.length === 1 ? 'is' : 'are'} swept up again.`,
        `The elastic snaps back — ${who || 'the attackers'} sit up.`,
      ])
    case 'move_caught':
      return pick([
        `The chase brings ${who || 'the leaders'} back into the fold.`,
        `${who || 'The move'} ${e.protagonists.length === 1 ? 'is' : 'are'} caught.`,
      ])
    case 'bridge_made':
      return pick([
        `${who} make${e.protagonists.length === 1 ? 's' : ''} the junction and joins the leaders.`,
        `The bridge works: ${who} get${e.protagonists.length === 1 ? 's' : ''} across to the front group.`,
      ])
    case 'bridge_failed':
      return pick([
        `${who || 'The chaser'} run${e.protagonists.length === 1 ? 's' : ''} out of legs in no man's land.`,
        `The junction is never made — ${who || 'the move'} hang${e.protagonists.length === 1 ? 's' : ''} between the two groups.`,
      ])
    case 'move_merge':
      return `The groups come together up front — ${Number(e.datos?.size ?? 0)} riders now in the lead.`
    case 'rider_sits_up': {
      // Regla 8: el agotado sin nada que jugarse administra el esfuerzo.
      const toGo = Number(e.datos?.toGo ?? 0)
      return pick([
        `${who} is empty and lets the group go with ${toGo} km left, riding home at his own pace.`,
        `Nothing left for ${who}: he sits up ${toGo} km from the line.`,
      ])
    }
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
    // --- La atribución del trabajo (v11, docs/motor.md §16) ---------------------------------
    // Las dos preguntas del dueño: «quién tira del pelotón» y «no sé quién hizo el trabajo para
    // reducir la distancia». El motor solo nombra CORREDORES —no conoce los equipos—; la voz de la
    // frase se decide aquí, con `protagonistTeams` y con el tamaño del grupo.
    case 'peloton_pull': {
      const size = Number(e.datos?.size ?? 0)
      const toGo = Number(e.datos?.toGo ?? 0)
      const effort = String(e.datos?.effort ?? 'firme')
      const left = toGo > 0 ? ` with ${toGo} km to go` : ''
      const nTeams = e.protagonistTeams?.length ?? 0
      // Con un grupo pequeño no tira un equipo, tira un corredor: es el mismo umbral con el que el
      // motor decide nombrar a los de cabeza, para que la crónica no se contradiga en dos frases.
      const small = size > 0 && size <= SMALL_FRONT_GROUP
      const group = small ? 'the front group' : 'the bunch'
      if (!small && nTeams === 1 && team) {
        // Los que tiran son todos del MISMO equipo: eso es un equipo tomando la carretera.
        if (effort === 'tope')
          return pick([
            `${team} have the bunch strung out in a single line${left}.`,
            `${team} are drilling it on the front — the bunch is in one long line${left}.`,
          ])
        if (effort === 'tempo')
          return pick([
            `${team} have taken the front and settled into a steady tempo${left}.`,
            `${team} line up at the head of the bunch and set a manageable pace${left}.`,
          ])
        return pick([
          `${team} mass on the front and wind the pace up${left}.`,
          `${team} take up the work at the head of the bunch${left}.`,
          `The pace is in the hands of ${team}${left}.`,
        ])
      }
      // Corredores de EQUIPOS DISTINTOS turnándose al frente es otra información, y más
      // interesante: no es un equipo controlando, es una alianza que se ha montado en carretera.
      if (!small && nTeams > 1)
        return pick([
          `${who} are sharing the work on the front of ${group}${left}.`,
          `An alliance on the front${left}: ${who} are the ones doing the pulling.`,
          `${who} take turns at the head of ${group}${left} — ${nTeams} different teams doing the work.`,
        ])
      const one = e.protagonists.length === 1
      if (effort === 'tope')
        return `${who || 'The leaders'} ${one ? 'is' : 'are'} flat out on the front of ${group}${left}.`
      return pick([
        `${who || 'The leaders'} ${one ? 'is' : 'are'} doing the pulling in ${group}${left}.`,
        `The work in ${group} falls to ${who || 'the strongest'}${left}.`,
      ])
    }
    case 'chase_work': {
      // Quién cerró. El motor solo lo emite si de verdad hubo trabajo: una fuga que se hunde sola
      // no tiene autor y no llega hasta aquí.
      const closed = fmtGap(Number(e.datos?.closedS ?? 0))
      const km = Number(e.datos?.km ?? 0)
      const over = km > 0 ? ` over the last ${km} km` : ''
      const nTeams = e.protagonistTeams?.length ?? 0
      if (nTeams === 1 && team)
        return pick([
          `The work was ${team}'s: ${closed} pulled back${over}.`,
          `${team} did the closing — ${closed} taken out of the lead${over}.`,
          `It is ${team} who have driven the chase, clawing back ${closed}${over}.`,
        ])
      if (nTeams > 1)
        return pick([
          `${who} shared the chasing between them: ${closed} pulled back${over}.`,
          `The catch belongs to ${who}, who took ${closed} out of the gap${over}.`,
        ])
      return pick([
        `${who || 'The chasers'} did the work to close it: ${closed}${over}.`,
        `${closed} pulled back${over}, and it was ${who || 'the chase'} who did it.`,
      ])
    }
    case 'break_share': {
      // Quién colabora y quién va a rueda dentro de la fuga. `break_cooperation` dice si el grupo
      // se entiende; esto dice a costa de quién.
      const passengers = Number(e.datos?.passengers ?? 0)
      const one = e.protagonists.length === 1
      const sitting =
        passengers > 0
          ? ` while ${passengers} of their companion${passengers === 1 ? '' : 's'} sit${passengers === 1 ? 's' : ''} on.`
          : '.'
      return pick([
        `${who} ${one ? 'is' : 'are'} doing the lion's share of the work up front${sitting}`,
        `Up the road the turns are uneven: ${who} keep${one ? 's' : ''} the move going${sitting}`,
        `${who} ${one ? 'is' : 'are'} on the front of the break far more than anyone else${sitting}`,
      ])
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
    case 'peloton_regroup': {
      // El reagrupamiento (v8). Existía en el modelo desde siempre y no se narraba nunca: la crónica
      // dejaba «about 51 left in front» y en meta llegaban más de cien juntos, sin nada que lo
      // explicara. Es información de carrera de primer orden, no un detalle.
      const joined = Number(e.datos?.joined ?? 0)
      const now = Number(e.datos?.remaining ?? 0)
      const before = Number(e.datos?.before ?? 0)
      const group = e.datos?.chasing === 1 ? 'the chase group' : 'the front group'
      if (before <= 1)
        return `The chase gets back on: ${joined} riders rejoin and ${group} is ${now} strong again.`
      return pick([
        `The gap closes and ${joined} riders get back on — ${group} is up from ${before} to ${now}.`,
        `Regrouping on the run-in: ${group} goes from ${before} to ${now} as the chasers rejoin.`,
        `${joined} riders claw their way back — ${now} together again at the front.`,
      ])
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
      // `phase` llega desde v8: cuántos avisos lleva ya esta misma criba. El primero presenta a
      // quien aprieta; los siguientes cuentan la PROGRESIÓN y no vuelven a nombrarlo, que es lo que
      // hacía que un puerto largo se leyera como diez partes clónicos con el mismo equipo repetido.
      const phase = Number(e.datos?.phase ?? 0)
      if (phase > 0 && before != null && remaining != null && before > remaining) {
        if (remaining === 1)
          return `The selection goes on and the last companions crack — ${who || 'the leader'} rides on alone.`
        return pick([
          `The selection goes on: ${group} is down from ${before} to ${remaining}.`,
          `The climb keeps biting — ${dropped} more lose contact and only ${remaining} of the ${before} are left ${where}.`,
          `Another surge cuts ${group} again, from ${before} to ${remaining}.`,
        ])
      }
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
        // Caso extremo pero posible: el grupo se deshace entero y no queda nadie a ese ritmo.
        if (remaining === 0)
          return `The pace blows ${group} to pieces — all ${before} riders are strung out over the climb.`
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
