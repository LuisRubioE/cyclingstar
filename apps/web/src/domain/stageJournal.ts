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

import type {
  ChronicleEntry,
  ChronicleRider,
  JerseyKind,
  StageResultEntry,
} from '@cyclingstar/shared'
import { STAGE } from '@cyclingstar/engine'
import { formatTime } from './format'
import { raceTeamLabel } from './labels'

/**
 * Por debajo de este tamaño el grupo de cabeza deja de ser «un pelotón»: se nombra a los corredores
 * y no al equipo que tira. Es el MISMO umbral con el que el motor decide emitir los nombres
 * (`STAGE.frontNamesMaxRiders`), para que la crónica no diga «cinco en cabeza» en una frase y
 * «Cumbre Escuadra impone el ritmo» en la siguiente: con tres corredores no tira un equipo.
 */
const SMALL_FRONT_GROUP = STAGE.frontNamesMaxRiders

/**
 * EL VOCABULARIO DE GRUPOS (v27, SPEC 6.15 y docs/motor.md §16). En la carretera hay TRES cosas y por
 * tanto hay tres nombres, ni uno más:
 *
 * - `LEAD_GROUP` — los que van delante. Con tres o menos, sus nombres.
 * - `CHASE_GROUP` — el grupo que persigue a los de delante, sea quien sea.
 * - `BUNCH` — el grueso de la carrera, que ya no pelea por la etapa.
 *
 * El dueño leyó Race Andalucía y no pudo seguirla: «the bunch», «the chase», «the favourites», «the
 * sprinters' teams», «the peloton», «the break» y «the chase group» se usaban como sinónimos, y
 * desde la criba del km 26 eran grupos DISTINTOS. Cuatro nombres para tres cosas no se pueden
 * seguir, y por eso «the break» y «the peloton» se retiran: la fuga del día es el grupo de cabeza
 * desde el momento en que se cuenta que sale, y llamarla de otra manera la convierte en una segunda
 * cosa que el lector tiene que casar con la primera —que es exactamente el defecto madre de la v25—.
 *
 * «The favourites» y «the sprinters' teams» tampoco vuelven: no son grupos, son PAPELES dentro de
 * uno, y cuando la criba los reparte en tres grupos distintos dejan de señalar a nadie.
 *
 * La lista vive en `packages/engine/src/sim/coherence.ts` (`GROUP_NOUNS`), que es quien cuenta
 * cuántos nombres ve un lector por etapa, y `stageJournal.test.ts` comprueba que ninguna frase
 * imprime uno que no esté declarado.
 */
const LEAD_GROUP = 'the lead group'
const CHASE_GROUP = 'the chase group'
const BUNCH = 'the bunch'

/**
 * CONTRA QUIÉN SE MIDE LA VENTAJA, dicho con el vocabulario de arriba (v27). El motor manda
 * `chaseKind` desde la v27: `peloton` si el grupo de referencia es el grueso de la carrera y `caza`
 * si es un trozo que persigue por delante del resto. Las crónicas congeladas no lo traen, y entonces
 * la frase NO dice sobre quién: inventarse la referencia de una etapa ya corrida sería lo mismo que
 * esta tanda vino a quitar.
 */
function overWhom(datos: Record<string, number | string> | undefined): string {
  const kind = String(datos?.chaseKind ?? '')
  if (kind === 'peloton') return ` over ${BUNCH}`
  if (kind === 'caza') return ` over ${CHASE_GROUP}`
  return ''
}

/**
 * EL SUJETO DEL PARTE DE VENTAJA, con su concordancia (v27). Si se sabe quién va delante, sus
 * nombres; si no, el grupo —por número cuando son pocos, y con el nombre del vocabulario cuando no—.
 * El verbo va detrás, y por eso el número viaja con la frase: «the lead group HOLDS 28s» pero «the
 * 4 out front HOLD 28s», que es la clase de concordancia que ya se rompió una vez en producción.
 */
function gapSubject(
  who: string,
  riders: number,
  lead: number | null,
): { text: string; plural: boolean } {
  if (who) return { text: who, plural: riders > 1 }
  if (lead === 1) return { text: 'the lone leader', plural: false }
  if (lead != null && lead > 1 && lead <= SMALL_FRONT_GROUP)
    return { text: `the ${lead} out front`, plural: true }
  return { text: LEAD_GROUP, plural: false }
}

/** «…, 42 km to go»: el punto de la carretera en el que se lee la ventaja (v27). */
function toGoTail(datos: Record<string, number | string> | undefined): string {
  const toGo = datos?.toGo == null ? 0 : Number(datos.toGo)
  return toGo > 0 ? `, ${toGo} km to go` : ''
}

/** Segundos como diferencia de carrera: 45s, 1:30, 12:05. */
export function fmtGap(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = String(seconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

/** Sufijo ordinal inglés: 1st, 2nd, 3rd, 4th… (11th, 12th y 13th son la excepción de siempre). */
export function ordinalSuffix(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return 'th'
  const mod10 = n % 10
  return mod10 === 1 ? 'st' : mod10 === 2 ? 'nd' : mod10 === 3 ? 'rd' : 'th'
}

/** Índice determinista para elegir una variante de frase (misma entrada ⇒ misma variante). */
export function variantIndex(seed: string, mod: number): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0
  return mod > 0 ? h % mod : 0
}

/**
 * La coletilla de los que saltan a la rueda y no la aguantan, con la concordancia del que ataca:
 * detrás de un corredor solo se va CON ÉL, no con ellos.
 */
function attackTail(stranded: number, alone: boolean): string {
  if (stranded <= 0) return ''
  const tries = stranded === 1 ? 'tries' : 'try'
  return ` ${stranded} more ${tries} to go with ${alone ? 'him' : 'them'} and cannot hold the wheel.`
}

/** «the bunch» al empezar una frase. Los tres nombres del vocabulario van en minúscula por dentro. */
function capitalize(s: string): string {
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}`
}

/** Une una lista con comas y "and" al final: "A", "A and B", "A, B and C". */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

// --- La IDENTIDAD de cada corredor mencionado (encargo A1 del dueño) --------------------------
// «Cada vez que menciones un ciclista, pon su dorsal, su equipo entre paréntesis y su bandera.»
//
// La bandera NO puede ir como emoji: `components/Flag.tsx` explica por qué (en Windows y en muchos
// navegadores de escritorio los emoji de bandera salen como dos letras), y toda la web la pinta como
// SVG local con las clases `fi fi-xx`. Como esto es un módulo de texto puro y sin React, la frase se
// compone con una MARCA invisible alrededor del código de país y `chronicleParts()` la parte en
// trozos para que `StageStory` intercale el mismo `<Flag/>` del resto de la web. `chronicleLine()`
// devuelve el texto pelado (sin banderas) y sigue siendo lo que usan los tests y cualquier contexto
// sin DOM.
const FLAG_MARK = '\u0001'

/**
 * EL MAILLOT DE LÍDER, con el mismo truco y por la misma razón (encargo del dueño: «cuando menciona
 * al ciclista que va el primero en la general, debería mencionarlo como con una imagen de maillot
 * amarillo»). Tampoco vale un emoji: no hay ninguno que sea un maillot de líder, y el cuadrado de
 * color se pinta distinto en cada sistema. Se dibuja en SVG reutilizando la MISMA silueta del
 * maillot de equipo que ya existía (`components/Jersey.tsx`).
 *
 * El maillot viaja DENTRO de la identidad de cada corredor, resuelto por la API: es el de la
 * clasificación tras la etapa ANTERIOR, o sea el que llevaba puesto ese día en la carretera.
 */
const JERSEY_MARK = '\u0002'

/**
 * Un trozo marcado —bandera o maillot—, con grupo de captura para que `split` conserve los
 * delimitadores y la frase se reparta en una sola pasada. Va con `g` porque `chronicleLine()` la
 * usa para quitarlos TODOS; `split` y `replace` no arrastran `lastIndex` entre llamadas, así que
 * una sola instancia compartida es segura y evita compilar la expresión en cada frase.
 */
const MARKED = new RegExp(
  `(${FLAG_MARK}[^${FLAG_MARK}]*${FLAG_MARK}|${JERSEY_MARK}[^${JERSEY_MARK}]*${JERSEY_MARK})`,
  'g',
)

/**
 * Cuántos corredores se NOMBRAN en una frase que resume a muchos («73 riders sit up, among them A,
 * B and C»). No tiene nada que ver con cuánta identidad lleva cada nombre —eso es siempre completa,
 * ver `riderFull`—: es cuántos se citan antes de que la lista vuelva a ser el muro que el racimo
 * venía a quitar.
 *
 * Hubo un umbral de identidad, de tres, por el que a partir del cuarto corredor la frase se quedaba
 * en bandera y nombre. El dueño lo rechazó al verlo en producción («siguen saliendo entradas sin
 * dorsal y nombre de equipo»): quiere saber quién es quién SIEMPRE, y tiene razón —un dorsal sin
 * equipo no sirve para seguir una carrera—. El muro se evita nombrando a menos, no identificando
 * peor.
 */
const NAMED_IN_SUMMARY = 3

/**
 * A cuántos km de meta una captura es «a la vista de la línea» (v21). Es la diferencia entre una
 * fuga que se apaga y el desenlace de Race Bességes e4, donde el escapado llevaba 130 km delante,
 * le cogieron en el último kilómetro y acabó cuarto a cinco segundos.
 */
const CAUGHT_AT_THE_LINE_KM = 2

/**
 * Un trozo de frase: texto corrido, una bandera que la web pinta con `<Flag/>` o un maillot de
 * líder que pinta con `<LeaderJersey/>`. La web decide cómo se ven; aquí solo se dice qué son.
 */
export type ChroniclePart = { text: string } | { flag: string } | { jersey: JerseyKind }

const flagMark = (country: string | null): string =>
  country ? `${FLAG_MARK}${country}${FLAG_MARK}` : ''

const jerseyMark = (jersey: JerseyKind | null | undefined): string =>
  jersey ? `${JERSEY_MARK}${jersey}${JERSEY_MARK}` : ''

/**
 * Un corredor, con toda la identidad que se le conozca: `🟨 🇸🇮 42 Andrej Pucnik (Al Assad Cycling)`.
 * Lo que falte se cae solo —sin maillot, sin dorsal, sin bandera, sin equipo— porque los eventos de
 * las etapas ya corridas están congelados y se resuelven contra el roster de HOY: un corredor que ya
 * no esté en él llega sin nada más que su nombre y la frase tiene que seguir leyéndose.
 *
 * EL MAILLOT VA DELANTE DEL TODO, antes incluso de la bandera. En la carretera el maillot es lo
 * primero que se ve —se reconoce al amarillo antes de leerle el dorsal— y ponerlo al frente deja
 * intacto el bloque `bandera + dorsal + nombre` que el lector ya tiene aprendido.
 *
 * Medido sobre las ocho etapas corridas de Race Colombia: el maillot aparece en el 0-11 % de las
 * menciones (de 0 a 12 líneas por crónica, siempre en las que de verdad hablan de los líderes).
 * Marca sin invadir, que era el riesgo.
 */
export function riderFull(r: ChronicleRider): string {
  const bib = r.bib != null ? `${r.bib} ` : ''
  /**
   * El que corre SIN equipo lleva «(Individual)», que es lo que pone una hoja de resultados de
   * verdad: el relleno regional de las continentales entra sin equipo comercial y dejarle el hueco
   * vacío se lee como un fallo (ver `raceTeamLabel` en domain/labels).
   *
   * PERO SOLO SI SABEMOS QUE NO TIENE EQUIPO. `team` en null significa dos cosas distintas: «no
   * tiene» y «no hemos podido averiguarlo», que es lo que pasa con un corredor de una crónica
   * congelada que ya no está en el roster de hoy —llega sin dorsal, sin equipo y sin bandera—.
   * Llamar «Individual» a ese sería inventárselo. El dorsal es el testigo: si lo hemos resuelto, la
   * identidad viene del roster o del resultado y su equipo vacío es un hecho; si no, no sabemos
   * nada y la frase se lee sin equipo, como hasta ahora.
   */
  const team = r.bib != null ? ` (${raceTeamLabel(r.team)})` : r.team ? ` (${r.team})` : ''
  return `${jerseyMark(r.jersey)}${flagMark(r.country)}${bib}${r.name}${team}`
}

/**
 * El corredor en versión corta —bandera y nombre— para las frases que YA dicen su equipo aparte y
 * repetirlo sonaría a tartamudeo: «Al Assad Cycling tira para su sprinter, 🇦🇪 11 Marwan Al Maktoum
 * (Al Assad Cycling)». Fuera de ese caso la identidad va siempre completa.
 */
export function riderShort(r: ChronicleRider): string {
  return `${jerseyMark(r.jersey)}${flagMark(r.country)}${r.bib != null ? `${r.bib} ` : ''}${r.name}`
}

/**
 * La lista de protagonistas de una frase, SIEMPRE con la identidad completa: bandera, dorsal,
 * nombre y equipo. Sean tres o sean ocho.
 */
export function listRiders(riders: readonly ChronicleRider[]): string {
  return listNames(riders.map(riderFull))
}

/** Solo los nombres, sin bandera ni dorsal: para las frases que ya nombran al equipo aparte. */
export function listPlain(riders: readonly ChronicleRider[]): string {
  return listNames(riders.map((r) => r.name))
}

/** Equipos DISTINTOS de los protagonistas, en orden de aparición y sin repetir. */
export function teamsOf(e: ChronicleEntry): string[] {
  return [...new Set((e.protagonists ?? []).map((p) => p.team).filter((t): t is string => !!t))]
}

/**
 * La frase partida en trozos para pintarla: el texto tal cual y las banderas como marcas, que
 * `StageStory` convierte en el `<Flag/>` de siempre.
 */
export function chronicleParts(e: ChronicleEntry): ChroniclePart[] {
  return chronicleTemplate(e)
    .split(MARKED)
    .map((chunk): ChroniclePart => {
      if (chunk.startsWith(FLAG_MARK)) return { flag: chunk.slice(1, -1) }
      if (chunk.startsWith(JERSEY_MARK)) return { jersey: chunk.slice(1, -1) as JerseyKind }
      return { text: chunk }
    })
    .filter((p) => !('text' in p) || p.text.length > 0)
}

/**
 * La frase en TEXTO PELADO, sin banderas. Es lo que usan los tests, los contextos sin DOM y
 * cualquier sitio que solo quiera la línea; para pintarla en la web con las banderas del resto del
 * sitio se usa `chronicleParts()`.
 */
export function chronicleLine(e: ChronicleEntry): string {
  return chronicleTemplate(e).replace(MARKED, '')
}

/**
 * Convierte un evento del motor en una frase del journal. Varias redacciones por evento, elegidas
 * de forma determinista (misma etapa ⇒ mismo relato, pero variado entre eventos y etapas), y con
 * la identidad de los corredores y el nombre de los equipos para que se lea como una crónica de
 * verdad. Devuelve la frase con las banderas y los maillots MARCADOS (ver `FLAG_MARK` y
 * `JERSEY_MARK`); `chronicleParts()` los reparte y `chronicleLine()` los quita.
 */
function chronicleTemplate(e: ChronicleEntry): string {
  const riders = e.protagonists ?? []
  const who = listRiders(riders)
  const plain = listPlain(riders)
  const teamList = teamsOf(e)
  const team = teamList[0]
  const teams = listNames(teamList)
  // La semilla de la variante usa los NOMBRES pelados: así la redacción elegida no cambia porque un
  // corredor gane o pierda el dorsal en la base (la crónica de una etapa es siempre la misma).
  const seed = `${e.plantilla}:${e.km}:${plain}`
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
      // CON UN SOLO PROTAGONISTA SE VA CON ÉL, NO CON ELLOS (v25). La coletilla de los que se quedan
      // a rueda estaba escrita para un grupo: en producción, «3 more try to go with THEM» detrás de
      // un corredor solo, 13 veces en 13 etapas del día de juego 46. `solo` lo marca la crónica, que
      // es la capa que ve la entrada entera (ver `markAgreement` en apps/api).
      const tail = attackTail(stranded, jumped === 1 || e.datos?.solo === 1)
      /**
       * EN EL DESENLACE, LA SUBTRAMA SE CUENTA RESPECTO DEL LÍDER (v27). Peter Schulz ataca a 11 km
       * de meta en Race Andalucía y acaba SEGUNDO: su línea no sobra. Lo que sobra es contarla como
       * si fuera la carrera, cuando la carrera está seis minutos por delante. Con el líder nombrado
       * en la misma frase, el lector sabe a la vez que alguien se mueve y quién va ganando.
       */
      const lider = e.datos?.respecto === 1 ? e.mentions?.liderId : undefined
      if (e.datos?.kind === 'puente')
        return `${who || 'A rider'} jump${jumped === 1 ? 's' : ''} across${lider ? `, chasing ${riderFull(lider)}` : ', chasing the race'} on ${jumped === 1 ? 'his' : 'their'} own.${tail}`
      if (e.datos?.kind === 'ataque_final') {
        if (lider)
          return `${who} attack${jumped === 1 ? 's' : ''} with ${toGo} km to go, going after ${riderFull(lider)}.${tail}`
        // (sin líder conocido la frase se queda como estaba: no se inventa a quién persigue)
        return pick([
          `${who} attack${jumped === 1 ? 's' : ''} with ${toGo} km to go.${tail}`,
          `It is ${who} who ${jumped === 1 ? 'goes' : 'go'}, ${toGo} km from the line.${tail}`,
        ])
      }
      if (e.datos?.kind === 'ataque_grupo')
        return pick([
          `${who} attack${jumped === 1 ? 's' : ''} out of ${LEAD_GROUP}.${tail}`,
          `${capitalize(LEAD_GROUP)} splinters: ${who} kick${jumped === 1 ? 's' : ''} clear.${tail}`,
        ])
      // `cuerda` dice si el pelotón ha decidido dar cuerda al movimiento. Lo que se narra es su
      // REACCIÓN, no el desenlace: a veces el pelotón se pone a cerrar y aun así no llega.
      const chased = held ? ` ${capitalize(BUNCH)} reacts at once and the pace goes up behind.` : ''
      const s1 = jumped === 1
      return pick([
        `${who} go${s1 ? 'es' : ''} clear off the front.${tail}${chased}`,
        `Attack: ${who} force${s1 ? 's' : ''} the pace and open${s1 ? 's' : ''} a gap.${tail}${chased}`,
        `${who} tr${s1 ? 'ies' : 'y'} ${s1 ? 'his' : 'their'} luck up the road.${tail}${chased}`,
      ])
    }
    /**
     * EL MANOTAZO QUE DURA UN KILÓMETRO (v25). La v25 retira el umbral que dejaba a 184 ataques
     * narrados sin desenlace —lo que se abre se cierra—, y cuando el desenlace llega al kilómetro
     * siguiente la crónica funde las dos líneas en ésta (`foldQuickAttacks` en apps/api): la
     * historia se cuenta entera y ocupa la mitad.
     */
    case 'attack_short': {
      const jumped = Number(e.datos?.saltan ?? e.protagonists.length)
      const one = jumped === 1 || e.datos?.solo === 1
      const km = Number(e.datos?.km ?? 1)
      const span = km <= 1 ? 'within the kilometre' : `after ${km} km`
      const tail = attackTail(Number(e.datos?.tierra ?? 0), one)
      return pick([
        `${who} go${one ? 'es' : ''} clear off the front, but ${BUNCH} has ${one ? 'him' : 'them'} back ${span}.${tail}`,
        `A dig from ${who}${tail ? `.${tail}` : ','} ${tail ? 'The' : 'the'} elastic snaps back ${span}.`,
        `${who} tr${one ? 'ies' : 'y'} ${one ? 'his' : 'their'} luck up the road and ${one ? 'is' : 'are'} swept up ${span}.${tail}`,
      ])
    }
    case 'attack_swarm': {
      // Regla 2 llevada al extremo: saltan tantos que el ataque no separa nada.
      const jumped = Number(e.datos?.saltan ?? 0)
      return pick([
        `${who} go, but so many follow that nothing opens up — ${jumped} riders and no gap.`,
        `Everyone is watching: ${jumped} jump across at once and nothing opens up.`,
      ])
    }
    case 'attack_sticks': {
      const gap = fmtGap(Number(e.datos?.gapS ?? 0))
      const toGo = Number(e.datos?.toGo ?? 0)
      const size = Number(e.datos?.size ?? e.protagonists.length)
      // …Y EN EL DESENLACE, RESPECTO DEL LÍDER (v27). Dos hombres «con hueco» a la vez en el último
      // kilómetro —Schwarz por 16s y Bailey por 46s— dejan al lector sin saber quién va ganando. El
      // hueco de quien no manda es cierto y se cuenta, pero contra el grupo del que salió y con el
      // líder de la etapa nombrado al lado.
      const lider = e.datos?.respecto === 1 ? e.mentions?.liderId : undefined
      if (lider) {
        const suyo = `${who} ${size === 1 ? 'has' : 'have'} ${gap} on the group ${size === 1 ? 'he' : 'they'} left with ${toGo} km to go`
        // En el desenlace se puede decir que la etapa ya está decidida; a cien kilómetros de meta,
        // no. La misma información, con la prudencia que tiene el sitio de la carretera.
        return e.datos?.desenlace === 1
          ? `Behind, ${suyo} — but the stage is up the road with ${riderFull(lider)}.`
          : `Behind ${riderFull(lider)}, ${suyo}.`
      }
      if (size === 1) return `${who} has a real gap now — ${gap}, ${toGo} km from the finish.`
      return `The attack sticks: ${who} have ${gap} with ${toGo} km to go.`
    }
    case 'attack_reeled': {
      // …Y UN CORREDOR SOLO NO «SIT UP» (v27). La frase estaba escrita para varios y en producción
      // salía «152 Markus Weber sit up».
      const one = e.protagonists.length === 1
      return pick([
        `${capitalize(BUNCH)} closes it down and ${who || 'the attack'} ${one ? 'is' : 'are'} back.`,
        `Nothing doing: ${who || 'the attack'} ${one ? 'is' : 'are'} swept up again.`,
        `The elastic snaps back — ${who || 'the attackers'} sit${one ? 's' : ''} up.`,
      ])
    }
    /**
     * EL MOVIMIENTO QUE SE APAGA (v25). Un intento no siempre acaba cazado ni enganchado: a veces se
     * queda sin nadie porque los suyos se van descolgando de él uno a uno, y el motor lo borraba en
     * silencio. Es la mitad más callada del defecto más numeroso de los doce —ataques con frase de
     * salida y sin desenlace— y se cuenta por lo que es: no le cogieron, se apagó.
     */
    case 'move_faded': {
      const km = Number(e.datos?.km ?? 0)
      const lasted = km > 0 ? ` after ${km} km out in front` : ''
      const one = e.protagonists.length === 1
      return pick([
        `The attack up the road simply dies out${lasted} — ${who || 'the attackers'} ${one ? 'has' : 'have'} nothing left.`,
        `Nothing comes of it: ${who || 'the attack'} fade${one ? 's' : ''} away${lasted} without ever being caught.`,
      ])
    }
    case 'move_caught':
      return pick([
        `${capitalize(CHASE_GROUP)} brings ${who || 'them'} back into the fold.`,
        `${who || 'The attack'} ${e.protagonists.length === 1 ? 'is' : 'are'} caught.`,
      ])
    case 'bridge_made': {
      // …y EN CUÁNTOS QUEDA LA CABEZA (v25). El puente que engancha hace CRECER al grupo de delante,
      // y hasta ahora la frase no lo decía: el lector veía aparecer nombres nuevos en el siguiente
      // parte de cabeza sin que nadie le hubiera contado por dónde entraban.
      const now = Number(e.datos?.size ?? 0)
      const tail = now > 1 ? ` — ${now} in front now` : ''
      return pick([
        `${who} make${e.protagonists.length === 1 ? 's' : ''} the junction and joins ${LEAD_GROUP}${tail}.`,
        `The bridge works: ${who} get${e.protagonists.length === 1 ? 's' : ''} across to ${LEAD_GROUP}${tail}.`,
      ])
    }
    case 'bridge_failed':
      return pick([
        `${who || 'The chaser'} run${e.protagonists.length === 1 ? 's' : ''} out of legs in no man's land.`,
        `The junction is never made — ${who || 'the attack'} hang${e.protagonists.length === 1 ? 's' : ''} between the two groups.`,
      ])
    case 'move_merge': {
      const joined = Number(e.datos?.entran ?? 0)
      const now = Number(e.datos?.size ?? 0)
      if (joined > 0)
        return `Up front they join forces: ${joined} more come${joined === 1 ? 's' : ''} across and there are ${now} riders in the lead.`
      return `Up front they join forces — ${now} riders now in the lead.`
    }
    case 'rider_sits_up': {
      // Regla 8: el agotado sin nada que jugarse administra el esfuerzo. Uno o dos sueltos SÍ tienen
      // mención propia; a partir de tres, la crónica los agrupa (ver `riders_sit_up`).
      const toGo = Number(e.datos?.toGo ?? 0)
      return pick([
        `${who} is empty and loses the wheel with ${toGo} km left, riding home at his own pace.`,
        `Nothing left for ${who}: he sits up ${toGo} km from the line.`,
      ])
    }
    case 'riders_sit_up': {
      // Encargo A3 del dueño: «no menciones uno a uno todos los ciclistas que se van descolgando…
      // puedes mencionar muchos juntos con número». El racimo lo arma la crónica (apps/api), que ve
      // la etapa entera; aquí se cuenta. Con pocos se nombran, con muchos manda el número: quince
      // nombres seguidos vuelven a ser la lista que había que quitar.
      const count = Number(e.datos?.count ?? e.protagonists.length)
      const toGo = Number(e.datos?.toGo ?? 0)
      const left = toGo > 0 ? ` with ${toGo} km to go` : ''
      const named = riders.slice(0, NAMED_IN_SUMMARY).map(riderFull)
      const rest = count - named.length
      if (count <= NAMED_IN_SUMMARY)
        return `${count} riders lose the wheel${left}: ${listNames(named)}.`
      // Los nombrados y «N more» se enumeran JUNTOS: «A, B, C and 3 more», no «A, B and C and 3 more».
      const withRest = listNames([...named, `${rest} more`])
      return pick([
        `The back of the race is falling apart${left}: ${count} riders sit up, among them ${listNames(named)}.`,
        `${count} riders give up the fight${left} — ${withRest} ride home at their own pace.`,
        `Behind, ${count} riders lose the wheel${left}, ${listNames(named)} among them.`,
      ])
    }
    case 'rider_defies_team': {
      // DESOBEDECER LAS ÓRDENES (docs/motor.md §VI.2, motor v15). El equipo ya tiene jefe de filas
      // y este corredor sale a lo suyo: queda fuera del plan, así que ni le empujan sus compañeros
      // ni le arropan. Es raro por construcción —solo pasa con una orden humana que contradice el
      // plan— y por eso se cuenta una vez, al principio, y no se vuelve a mencionar.
      const total = Number(e.datos?.total ?? e.protagonists.length)
      if (total > 1) return `${who} are riding to their own orders today, not their teams'.`
      return pick([
        `${who} has other ideas: he is riding for himself today, not for his team leader.`,
        `Team orders are one thing — ${who} is racing his own race today.`,
      ])
    }
    case 'rider_bonks': {
      // LA PÁJARA (docs/motor.md §15). El motor la ejecuta desde la v8 y no la contaba: era el
      // agujero que docs/balance.md arrastraba desde entonces («no narra la pájara»). Se cuenta con
      // throttle largo porque en una etapa reina se vacía el pelotón entero.
      const toGo = Number(e.datos?.toGo ?? 0)
      return pick([
        `${who} blows up completely and comes off the back with ${toGo} km to go.`,
        `The tank is empty for ${who}: he cracks and slides off the back, ${toGo} km from home.`,
        `${who} hits the wall and loses the wheels with ${toGo} km left.`,
      ])
    }
    case 'riders_bonk': {
      const count = Number(e.datos?.count ?? e.protagonists.length)
      const named = riders.slice(0, NAMED_IN_SUMMARY).map(riderFull)
      const toGo = Number(e.datos?.toGo ?? 0)
      const left = toGo > 0 ? ` with ${toGo} km to go` : ''
      return `${count} riders run out of fuel${left}, ${listNames(named)} among them.`
    }
    case 'rider_abandons': {
      // ABANDONO EN CARRETERA (docs/motor.md §VI.3): se baja de la bici y no llega a meta. Es el
      // final de la carrera de ese corredor, así que lleva su identidad completa.
      //
      // Y desde la v20 el motor dice POR QUÉ: el que se vacía y el que se ha caído no abandonan por
      // lo mismo, y contar «nothing left» de un corredor al que se ha llevado una caída sería
      // narrar otra carrera. `causa` viene del evento; si falta, se cuenta como colapso, que es lo
      // único que el motor emitía antes.
      const toGo = Number(e.datos?.toGo ?? 0)
      if (e.datos?.causa === 'caida') {
        return pick([
          `${who} abandons: too badly hurt in that crash to go on, ${toGo} km from the finish.`,
          `It is over for ${who} — the crash has ended his race with ${toGo} km still to ride.`,
          `${who} climbs off, still bleeding from his fall, ${toGo} km from home.`,
        ])
      }
      return pick([
        `${who} climbs off and steps into the team car, ${toGo} km from the finish.`,
        `It is over for ${who}: he abandons with ${toGo} km still to ride.`,
        `${who} pulls out of the race — nothing left, ${toGo} km from home.`,
      ])
    }
    case 'riders_abandon': {
      const count = Number(e.datos?.count ?? e.protagonists.length)
      const named = riders.slice(0, NAMED_IN_SUMMARY).map(riderFull)
      if (count <= NAMED_IN_SUMMARY)
        return `${count} riders abandon: ${listNames(named)} climb off and step into the team cars.`
      const rest = count - named.length
      return `${count} riders abandon — ${listNames([...named, `${rest} more`])} climb off.`
    }
    case 'time_cut': {
      // FUERA DE CONTROL. Lo decide el jurado en meta y se narra al final de la crónica.
      const count = Number(e.datos?.count ?? e.protagonists.length)
      const limit = Number(e.datos?.limitPct ?? 0)
      const named = riders.slice(0, NAMED_IN_SUMMARY).map(riderFull)
      const who2 = named.length > 0 ? `: ${listNames(named)}` : ''
      return count === 1
        ? `${who} finishes outside the time limit (${limit}% of the winner's time) and is out of the race.`
        : `${count} riders finish outside the ${limit}% time limit and are eliminated${who2}.`
    }
    case 'time_cut_readmitted': {
      // …y la salvaguarda: cuando llega un grupo numeroso fuera de control, el jurado lo readmite
      // con penalización en vez de vaciar la carrera (docs/motor.md §VI.3, salvaguarda 1).
      const count = Number(e.datos?.count ?? e.protagonists.length)
      const limit = Number(e.datos?.limitPct ?? 0)
      return `${count} riders come home outside the ${limit}% limit, but the jury lets them start again — they lose their points for the stage.`
    }
    case 'breakaway_formed': {
      // CONCORDANCIA CON UN SOLO FUGADO (v21). En producción salía «The break of the day forms:
      // Nicolas Ferrari GO up the road»: el número de protagonistas puede ser uno y el verbo estaba
      // siempre en plural. Con uno la frase se escribe en singular y además dice lo que es —una
      // escapada en solitario—, que es más noticia todavía.
      /**
       * …Y LA FUGA DEL DÍA ES EL GRUPO DE CABEZA (v27). Se llamaba «the break» aquí y «the lead
       * group» veinte líneas después, y son la misma gente: el lector tenía que casar dos nombres
       * para seguir a los mismos hombres. Desde que sale se llama por el nombre con el que se le va
       * a hablar el resto de la etapa (SPEC 6.15 y docs/motor.md §16).
       */
      if (riders.length === 1)
        return pick([
          `${who} goes clear alone — today's lead group is one rider.`,
          `${who} slips away on his own and becomes ${LEAD_GROUP} of the day.`,
          `${capitalize(LEAD_GROUP)} of the day is a lone rider: ${who} goes up the road.`,
        ])
      return pick([
        `${who || 'A group'} attack and form ${LEAD_GROUP} of the day.`,
        `${who || 'A handful of riders'} jump clear off the front and become ${LEAD_GROUP}.`,
        `${capitalize(LEAD_GROUP)} of the day forms: ${who || 'an early move'} go up the road.`,
        `${who || 'A move'} slip away and get a gap on the rest.`,
      ])
    }
    case 'break_cooperation':
      // UNO NO COLABORA CONSIGO MISMO (v21). El motor de hoy ya no lo emite con un solo fugado y la
      // crónica lo tira de las etapas ya corridas —donde está congelado: «up front they collaborate
      // well, rolling smooth turns» para un corredor solo—. Esto es la red de seguridad: si por
      // cualquier vía llega uno, la frase dice lo único que se puede decir de un hombre solo.
      if (riders.length === 1) return 'No wheels to share up front: he is on his own.'
      return e.datos?.cooperating === 1
        ? pick([
            'Up front they collaborate well, rolling smooth turns.',
            `${capitalize(LEAD_GROUP)} is working like a well-drilled team, sharing the load.`,
            'Good understanding up front — everyone takes their turn.',
          ])
        : pick([
            'There is little cooperation up front — the turns are ragged.',
            'They eye each other up front and few want to work.',
            `No unity in ${LEAD_GROUP}: nobody wants to do the work.`,
          ])
    case 'sprinters_chase': {
      // El motor nombra al JEFE DE FILAS de los sprinters (el mejor rematador del campo): es SU
      // equipo el que se pone a tirar, y hasta ahora la frase decía el nombre del equipo sin decir
      // que fuera el suyo, o el del corredor sin decir que tirara su equipo (encargo A2 del dueño).
      const boss = riders[0]
      // …y desde la v15, POR QUÉ se ha puesto a tirar el equipo que lleva el frente: no siempre es
      // por el sprint. Si la fuga amenaza al maillot, la caza es otra cosa y se cuenta como otra cosa.
      const chaseWhy = String(e.datos?.porQue ?? '')
      if (chaseWhy === 'maillot' || chaseWhy === 'general')
        return pick([
          `${capitalize(BUNCH)} is riding, and not for the stage: ${LEAD_GROUP} is a threat on general classification.`,
          `This move is dangerous for the overall, and ${BUNCH} knows it — behind, they start to ride in earnest.`,
        ])
      if (boss && team)
        return pick([
          `${team} hit the front and take up the chase for ${riderFull(boss)}.`,
          `${team} mass at the head of ${BUNCH} to reel ${LEAD_GROUP} in for their sprinter, ${riderShort(boss)}.`,
          `${team} take control, winding up the pace for ${riderFull(boss)}.`,
        ])
      if (boss)
        return pick([
          `${capitalize(BUNCH)} keeps riding behind, wound up for ${riderFull(boss)}.`,
          `${capitalize(BUNCH)} organises behind for ${riderShort(boss)}.`,
        ])
      return `${capitalize(BUNCH)} organises behind and takes up the pursuit.`
    }
    /**
     * EL PARTE DE VENTAJA, CON LAS CUATRO RESPUESTAS (v27). Era la línea que más se repite en un
     * diario y la que menos contaba: «Out front the lone leader stretches the advantage to 2:57» no
     * dice QUIÉN va delante, ni SOBRE QUIÉN se lleva la ventaja, ni CUÁNTO QUEDA. El dueño leyó cien
     * kilómetros de esa frase en Race Andalucía y en meta no reconoció al ganador.
     *
     * Ahora el sujeto es el corredor cuando se sabe quién es —el motor lo manda desde la v27 y la
     * crónica lo reconstruye para las etapas ya corridas (`followTheLeader`)—, la referencia se
     * nombra con el vocabulario de tres palabras, y la ventaja se sitúa en la carretera.
     */
    case 'time_gap': {
      const g = fmtGap(Number(e.datos?.gapS ?? 0))
      const trend = Number(e.datos?.trend ?? 0)
      // `leadSize` llega desde v6 del motor: dice CUÁNTOS van en cabeza, así que la frase puede
      // hablar de "the lone leader" o "the five out front" en vez de dar por hecho que es la fuga.
      // Las crónicas guardadas antes de v6 no lo traen y caen a la redacción de siempre.
      const lead = e.datos?.leadSize == null ? null : Number(e.datos.leadSize)
      const over = overWhom(e.datos)
      const clock = toGoTail(e.datos)
      // Con nombres manda el nombre; sin ellos, el grupo. Es la misma regla del parte de cabeza.
      const { text: subject, plural } = gapSubject(who, riders.length, lead)
      const s = plural ? '' : 's'
      if (trend > 0) return `${capitalize(subject)} stretche${s} the lead to ${g}${over}${clock}.`
      if (trend < 0) return `Down to ${g}${over} for ${subject}${clock}, and falling.`
      return `${capitalize(subject)} hold${s} ${g}${over}${clock}.`
    }
    /**
     * LA RACHA DE PARTES DE BOQUETE, EN UNA LÍNEA (v21). Nueve frases seguidas para contar que una
     * fuga se hunde («down to 3:36 / 2:59 / 2:29 / 1:59…») son UNA noticia contada nueve veces. La
     * crónica agrupa la racha (`groupGapRuns`) y aquí se redacta el arco entero: de dónde venía la
     * ventaja, en qué se ha quedado y en cuántos kilómetros. El primer parte de la racha se sigue
     * leyendo tal cual —es el que da la novedad—; esto es el desenlace.
     */
    case 'time_gap_run': {
      const to = fmtGap(Number(e.datos?.gapS ?? 0))
      const from = fmtGap(Number(e.datos?.fromGapS ?? 0))
      const over = Math.max(0, e.km - Number(e.datos?.fromKm ?? e.km))
      // La frase se lee DONDE ACABA la racha, así que los kilómetros se cuentan hacia atrás: es lo
      // que ha pasado desde el parte anterior, no lo que va a pasar.
      const span = over > 0 ? ` over the last ${over} km` : ''
      const trend = Number(e.datos?.trend ?? 0)
      const lead = e.datos?.leadSize == null ? null : Number(e.datos.leadSize)
      // Y la racha, con las mismas cuatro respuestas que el parte suelto (v27): quién, cuánto, sobre
      // quién y cuánto queda. Es la línea que resume cien kilómetros de carrera y era justo la que
      // no nombraba a nadie.
      const subject = gapSubject(who, riders.length, lead).text
      const overWho = overWhom(e.datos)
      const clock = toGoTail(e.datos)
      // Cada redacción NOMBRA de quién se habla —la racha resume varios partes y el lector se ha
      // podido perder por el camino de quién era la ventaja— y ninguna pone al grupo de SUJETO: «the
      // lone leader» y «the 4 out front» no conjugan igual, y una frase por número sería un enredo.
      if (trend < 0)
        return pick([
          `They keep grinding away at ${subject}: ${from} becomes ${to}${span}${clock}.`,
          `And it keeps falling for ${subject} — from ${from} to ${to}${span}${clock}.`,
          `The gap on ${subject} comes down and down${span}: ${from}, then ${to}${clock}.`,
        ])
      if (trend > 0)
        return pick([
          `And the gap keeps going up for ${subject}: ${from} becomes ${to}${overWho}${span}${clock}.`,
          `Nobody answers${span}: the advantage of ${subject} goes from ${from} to ${to}${overWho}${clock}.`,
          `The lead grows and grows for ${subject} — ${from} to ${to}${overWho}${span}${clock}.`,
        ])
      return pick([
        `The gap barely moves${span}: still ${to} for ${subject}${overWho}${clock}.`,
        `Stalemate${span} — ${to} for ${subject}${overWho}${clock}, and nothing changes.`,
      ])
    }
    /**
     * LA CRIBA LEJOS DE META (v21, docs/motor.md §16). El corte del desenlace (`peloton_split`) solo
     * se narra en los últimos 30 km, y la etapa se decide a veces mucho antes: en Race Great Ocean
     * el grupo de cabeza pasó de 116 a 80 a 50 km de meta y la crónica no dijo nada. Esta frase es
     * esa selección, y por eso lleva SIEMPRE los km que faltaban: lo que la hace noticia no es solo
     * cuánta gente se quedó, sino lo lejos de meta que ocurrió.
     */
    case 'peloton_selection': {
      const before = Number(e.datos?.before ?? 0)
      const remaining = Number(e.datos?.remaining ?? 0)
      const dropped = Number(e.datos?.dropped ?? Math.max(0, before - remaining))
      const toGo = Number(e.datos?.toGo ?? 0)
      const left = toGo > 0 ? ` with ${toGo} km still to go` : ''
      const group = e.datos?.chasing === 1 ? CHASE_GROUP : LEAD_GROUP
      const where = e.datos?.chasing === 1 ? `in ${CHASE_GROUP}` : 'in front'
      // Con el pelotón entero delante quien aprieta es un EQUIPO; con un grupo ya reducido, un
      // corredor. Es el mismo umbral que usa el corte del desenlace.
      const driver =
        before > SMALL_FRONT_GROUP && team
          ? `${team} force the selection`
          : who
            ? `${who} forces the selection`
            : 'The pace goes up'
      if (remaining <= 1)
        return `This is where the race breaks${left}: ${who || 'the leader'} is left alone in front, ${dropped} riders shed on the way.`
      return pick([
        `The race is made a long way from home${left}: ${driver} and ${group} is cut from ${before} riders to ${remaining}.`,
        `${driver}${left} — ${dropped} riders lose the wheel and only ${remaining} of the ${before} are left ${where}.`,
        `This is the selection of the day${left}: ${group} goes from ${before} down to ${remaining}, and those left behind never come back.`,
      ])
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
      /**
       * CUANDO EL GRUPO DE CABEZA CRECE HAY QUE DECIR OTRA COSA (v25). «Only N riders left in front»
       * da por hecho que una fuga solo se deshace, y en Race Jaén la frase salió con N CRECIENDO
       * —3, luego 4, luego 5—: 69 veces en 31 etapas del día de juego 46. `entran` y `salen` dicen
       * qué ha cambiado desde el parte anterior (los manda el motor desde la v25 y la crónica los
       * reconstruye para las etapas ya corridas), y con eso la frase cuenta el MOVIMIENTO del grupo
       * y no una foto que se contradice con la anterior.
       */
      const entran = Number(e.datos?.entran ?? 0)
      const salen = Number(e.datos?.salen ?? 0)
      if (entran > 0) {
        const gone = salen > 0 ? `, ${salen} ${salen === 1 ? 'has' : 'have'} dropped out of it` : ''
        const joined = entran === 1 ? 'one more has come across' : `${entran} more have come across`
        return pick([
          `The lead group is up to ${size}${left}: ${joined}${gone} — ${who}${clear}.`,
          `${joined.charAt(0).toUpperCase()}${joined.slice(1)}${gone}: ${size} at the front now${left} — ${who}${clear}.`,
        ])
      }
      if (salen > 0 && size > 0) {
        if (size === 1) return `${who || 'The leader'} is alone at the front now${clear}${left}.`
        return pick([
          `The move is coming apart: ${salen} ${salen === 1 ? 'is' : 'are'} gone and ${size} are left in front${left} — ${who}${clear}.`,
          `Down to ${size} at the front${left} — ${who}${clear}.`,
        ])
      }
      if (size === 1) return `${who || 'The leader'} is alone at the front${clear}${left}.`
      if (size === 2) return `Just two left in front${left}: ${who}${clear}.`
      return `Only ${size} riders left in front${left}: ${who}${clear}.`
    }
    // --- La atribución del trabajo (v11, docs/motor.md §16) ---------------------------------
    // Las dos preguntas del dueño: «quién tira del pelotón» y «no sé quién hizo el trabajo para
    // reducir la distancia». El motor solo nombra CORREDORES —no conoce los equipos—; la voz de la
    // frase se decide aquí, con los equipos de los protagonistas y el tamaño del grupo.
    //
    // Y desde la v13, el POR QUÉ: «cada vez que alguien tire del pelotón, tienes que mencionar por
    // qué; está trabajando para alguien, ¿no? Si no, no debería desgastarse a lo wey». El motor manda
    // `forKind` (gregarios / tren / equipo / alianza / libre) y `forId` con el jefe de filas.
    case 'peloton_pull': {
      const size = Number(e.datos?.size ?? 0)
      const toGo = Number(e.datos?.toGo ?? 0)
      const effort = String(e.datos?.effort ?? 'firme')
      const left = toGo > 0 ? ` with ${toGo} km to go` : ''
      const nTeams = teamList.length
      const chasing = e.datos?.chasing === 1
      const kind = String(e.datos?.forKind ?? '')
      const boss = e.mentions?.forId
      // Para quién, dicho una vez y bien. Sin `forKind` (crónicas anteriores a la v13) no se inventa
      // motivo: la frase se queda como estaba, que no miente, solo cuenta menos.
      const forWhom = boss ? riderFull(boss) : ''
      // Con un grupo pequeño no tira un equipo, tira un corredor: es el mismo umbral con el que el
      // motor decide nombrar a los de cabeza, para que la crónica no se contradiga en dos frases.
      const small = size > 0 && size <= SMALL_FRONT_GROUP
      const group = small ? LEAD_GROUP : BUNCH
      /**
       * SI YA ESTABAN AHÍ, LA FRASE CUENTA LO QUE HA CAMBIADO (v25). Fuego Escuadra tiraba para
       * Sergio Gómez SEIS veces en Race Jaén con la misma redacción de presentación. La crónica ya
       * tira los partes que no traen nada nuevo (`dropRepeatedPulls` en apps/api) y marca con
       * `repite` los que sobreviven porque el esfuerzo o el motivo han cambiado: eso es lo que se
       * cuenta —que aprietan, que aflojan, que ya no persiguen—, y no otra presentación.
       */
      if (e.datos?.repite === 1 && !small) {
        const quien = team ?? who
        if (effort === 'tope')
          return pick([
            `${quien} turn the screw${left}: the front of ${group} is one long line now.`,
            `And now it is full gas from ${quien}${left} — ${group} is strung out.`,
          ])
        if (effort === 'tempo')
          return pick([
            `${quien} ease off at the front${left}: back to a steady tempo.`,
            `The pace comes down again with ${quien} still on the front${left}.`,
          ])
        if (!chasing)
          return pick([
            `${quien} keep the front${left}, but they are not chasing anything now.`,
            `Nothing left to chase: ${quien} simply hold the head of ${group}${left}.`,
          ])
        return pick([
          `${quien} lift it again at the head of ${group}${left}.`,
          `${quien} are still on the front${left}, and the pace is up.`,
        ])
      }
      // El TREN: lanzadores de un sprinter cerca de meta. Es su propia noticia y va antes que todo
      // lo demás, porque no es «controlar la carrera», es montar el lanzamiento.
      if (kind === 'tren' && forWhom)
        return pick([
          `${team ? `${team} ` : 'The lead-out men '}wind it up at the head of ${group}${left}, building the train for ${forWhom}.`,
          `The lead-out is on${left}: ${plain} drive ${group} with ${forWhom} on the last wheel.`,
        ])
      // Y el caso que el dueño quería ver señalado: nadie detrás de ese esfuerzo. Va ANTES que la
      // voz del equipo, porque dos corredores del mismo equipo tirando sin jefe de filas siguen sin
      // tener a quién servir. No se maquilla con un motivo inventado; se dice que van por su cuenta.
      // Medido, es el 1,9% de las menciones: es raro, y por eso merece nombrarse cuando pasa.
      if (kind === 'libre' && !small) {
        const solo = riders.length === 1
        return pick([
          `${who} ${solo ? 'is' : 'are'} on the front of ${group}${left} with no leader to work for.`,
          `Nobody's orders behind it: ${who} ${solo ? 'sets' : 'set'} the pace in ${group}${left} on ${solo ? 'his' : 'their'} own account.`,
        ])
      }
      if (!small && nTeams === 1 && team) {
        // Los que tiran son todos del MISMO equipo: eso es un equipo tomando la carretera. Y ahora se
        // dice a cuenta de quién lo hacen y POR QUÉ, que es lo que faltaba.
        //
        // El MOTIVO (v15 del motor, docs/motor.md §V.1) es la respuesta al «no es solo saber qué
        // equipos participan de la persecución… también es saber POR QUÉ». Son tres carreras
        // distintas y se leen distinto: tirar por la etapa, tirar defendiendo el maillot y tirar
        // porque la fuga amenaza a tu hombre de la general. Si el motor no manda motivo (crónicas
        // anteriores a la v15, o un equipo tirando sin nada que defender) la frase se queda como
        // estaba: no se inventa una razón.
        const forTail = forWhom ? `, working for ${forWhom}` : ''
        const porQue = String(e.datos?.porQue ?? '')
        if (porQue === 'maillot')
          return pick([
            `${team} take the front to defend the race lead${left} — this move is a threat to the jersey.`,
            `The leader's team goes to the front: ${team} are not letting this one go${left}.`,
            `${team} shoulder the work${left}; with the jersey on their backs the gap is their problem.`,
          ])
        if (porQue === 'general')
          return pick([
            `${team} come to the front${left}: ${LEAD_GROUP} is dangerous for ${forWhom || 'their GC leader'} and they cannot sit on it.`,
            `${team} drive ${BUNCH}${left}: ${LEAD_GROUP} threatens ${forWhom || 'their leader'} on general classification, so they have to ride.`,
            `${team} take up the chase${left} with the general classification in mind, not the stage.`,
          ])
        if (porQue === 'etapa') {
          if (effort === 'tope')
            return pick([
              `${team} have the bunch strung out in a single line${left}: this finish suits ${forWhom || 'their leader'} and they want it.`,
              `${team} are drilling it on the front for ${forWhom || 'their leader'} — the bunch is in one long line${left}.`,
            ])
          return pick([
            `${team} mass on the front and wind the pace up${left}, riding for the stage with ${forWhom || 'their leader'}.`,
            `${team} take up the work at the head of the bunch${left}: today's finish is made for ${forWhom || 'their man'}.`,
            `The pace is in the hands of ${team}${left}, setting the race up for ${forWhom || 'their leader'}.`,
          ])
        }
        if (effort === 'tope')
          return pick([
            `${team} have the bunch strung out in a single line${left}${forTail}.`,
            `${team} are drilling it on the front for ${forWhom || 'their leader'} — the bunch is in one long line${left}.`,
          ])
        if (effort === 'tempo')
          return pick([
            `${team} have taken the front and settled into a steady tempo${left}${forTail}.`,
            `${team} line up at the head of the bunch and set a manageable pace${left}${forTail}.`,
          ])
        return pick([
          `${team} mass on the front and wind the pace up${left}${forTail}.`,
          `${team} take up the work at the head of the bunch${left}${forTail}.`,
          `The pace is in the hands of ${team}${left}${forTail}.`,
        ])
      }
      // Corredores de EQUIPOS DISTINTOS turnándose al frente es otra información, y más
      // interesante: no es un equipo controlando, es una alianza que se ha montado en carretera. Y
      // la alianza tiene un motivo: los dos quieren la misma cosa, y casi siempre es cazar.
      if (!small && (nTeams > 1 || kind === 'alianza')) {
        const nLeaders = Number(e.datos?.forLeaders ?? nTeams)
        const why = chasing
          ? ` — different leaders, one shared interest: ${LEAD_GROUP} has to come back`
          : kind === 'alianza'
            ? ` — ${nLeaders} different leaders whose teams have decided the same thing`
            : ''
        // El motivo NO va en las tres redacciones: en una etapa con cuatro partes de alianza,
        // repetir «different leaders, one shared interest» cuatro veces cansa más que informa.
        return pick([
          `${who} are sharing the work on the front of ${group}${left}${why}.`,
          `An alliance on the front${left}: ${who} are the ones doing the pulling.`,
          `${who} take turns at the head of ${group}${left} — ${nTeams} different teams doing the work.`,
        ])
      }
      const one = riders.length === 1
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
      //
      // LA FRASE DICE LO QUE EL DATO MIDE (v21). Decía «took 2:20 out of the gap over the last
      // 5 km» y el lector acababa de leer «1:50» dos kilómetros antes: las dos cifras eran ciertas
      // —`closedS` es la CÚSPIDE del boquete y `km`, los kilómetros desde esa cúspide— pero juntas
      // se leían como una contradicción. Ahora la frase nombra la cúspide como lo que es.
      const peak = fmtGap(Number(e.datos?.closedS ?? 0))
      const km = Number(e.datos?.km ?? 0)
      /**
       * DOS NÚMEROS QUE DICEN LO MISMO Y NO COINCIDEN (v25). En Race Jaén esta frase decía «172 km
       * later» pegada a un «189 km up the road»: las dos son ciertas —una cuenta desde la cúspide
       * del boquete y la otra desde que salió la fuga— y juntas se leen como un error. Cuando la
       * frase va detrás de la captura, la cuenta de kilómetros ya está dicha y ésta se calla.
       */
      const since = e.datos?.pegado === 1 ? '' : km > 0 ? ` ${km} km later` : ' before the line'
      // …y la CÚSPIDE se sitúa en la carretera. «Peaked at 3:04» dos líneas después de un «2:53» se
      // lee como una contradicción; «3:04 allá por el km 26» es un sitio de la etapa.
      const peakAt = e.datos?.peakKm == null ? '' : ` back at km ${Number(e.datos.peakKm)}`
      const nTeams = teamList.length
      // Solo se habla en nombre de equipos si TODOS los que firman tienen uno. Con un agente libre
      // entre medias, atribuirlo a «el equipo» lo borraría del parte: cazó él, y él firma.
      const allHaveTeam = riders.length > 0 && riders.every((r) => !!r.team)
      if (nTeams === 1 && team && allHaveTeam)
        return pick([
          `The work was ${team}'s: the lead peaked at ${peak}${peakAt} and was gone${since}.`,
          `${team} did the closing — from a high of ${peak}${peakAt} to nothing${since}.`,
          `It is ${team} who have driven the chase: ${peak}${peakAt} at its best, and gone${since}.`,
        ])
      /*
       * UNA PERSECUCIÓN LA HACEN EQUIPOS (v28). El dueño lo repitió varias veces: «no tiene sentido
       * que si 3 equipos colaboraron, solo 1 de cada aparezca». La frase nombraba a los tres
       * corredores que más habían puesto —uno por escuadra— y se leía como si la caza la hubieran
       * hecho tres señores, justo después de haber contado que tiraba un equipo. Aquí se nombra a
       * los EQUIPOS, que es como se cuenta una caza en cualquier crónica de verdad.
       *
       * Y `datos.teams` dice cuántos cazaron DE VERDAD, que puede ser más de los que caben en la
       * frase (el motor nombra tres como mucho): los que no caben se cuentan, no se esconden. Si
       * entre los protagonistas hay un agente libre —sin equipo al que nombrar— se vuelve a los
       * nombres, que ahí sí son la verdad.
       */
      if (nTeams > 1 && allHaveTeam) {
        const realTeams = Math.max(nTeams, Number(e.datos?.teams ?? nTeams))
        const rest = realTeams - nTeams
        const andMore = rest > 0 ? ` and ${rest} more team${rest === 1 ? '' : 's'}` : ''
        return pick([
          `${teams}${andMore} shared the chasing between them: the gap peaked at ${peak}${peakAt} and was gone${since}.`,
          `The catch belongs to ${teams}${andMore} — from ${peak}${peakAt} at its high point to nothing${since}.`,
        ])
      }
      if (nTeams > 1)
        return pick([
          `${who} shared the chasing between them: the gap peaked at ${peak}${peakAt} and was gone${since}.`,
          `The catch belongs to ${who} — from ${peak}${peakAt} at its high point to nothing${since}.`,
        ])
      return pick([
        `${who || 'The chasers'} did the work to close it: ${peak}${peakAt} at its widest, gone${since}.`,
        `A lead of ${peak}${peakAt} wiped out${since}, and it was ${who || CHASE_GROUP} who did it.`,
      ])
    }
    case 'break_share': {
      // Quién colabora y quién va a rueda dentro de la fuga. `break_cooperation` dice si el grupo
      // se entiende; esto dice a costa de quién.
      const passengers = Number(e.datos?.passengers ?? 0)
      const one = riders.length === 1
      // «1 OF THEIR COMPANION SITS ON» (v25). La frase estaba escrita para varios y con uno se
      // rompía: el que va a rueda es UN compañero, no «uno de su compañero». Con más de uno la
      // cuenta manda, que es como se lee una fuga en la que la mitad no releva.
      const sitting =
        passengers === 1
          ? ` while one of their companions sits on.`
          : passengers > 1
            ? ` while ${passengers} of their companions sit on.`
            : '.'
      return pick([
        `${who} ${one ? 'is' : 'are'} doing the lion's share of the work up front${sitting}`,
        `Up the road the turns are uneven: ${who} keep${one ? 's' : ''} it going${sitting}`,
        `${who} ${one ? 'is' : 'are'} on the front of ${LEAD_GROUP} far more than anyone else${sitting}`,
      ])
    }
    case 'peloton_concedes':
      // El pelotón concede… salvo cuando luego caza. `cazada` lo marca la crónica, que ve la etapa
      // entera y sabe si la fuga terminó cogida (el motor decide en carretera y no ve el futuro). Es
      // la mitad del arreglo del defecto B4: la otra mitad es que el motor ya no concede en el km 10,
      // pero las etapas ya corridas están congeladas y sus concesiones tempranas siguen ahí.
      return e.datos?.cazada === 1
        ? pick([
            `For now ${BUNCH} eases and gives them their rope.`,
            `No panic behind: ${LEAD_GROUP} is allowed to go clear — for the moment.`,
            `${capitalize(BUNCH)} relaxes and leaves them to it, at least for now.`,
          ])
        : pick([
            `${capitalize(BUNCH)} concedes — ${LEAD_GROUP} is given room to fight for the win.`,
            `${capitalize(BUNCH)} eases and lets them take their rope.`,
            `No panic behind: ${BUNCH} waves ${LEAD_GROUP} up the road.`,
          ])
    case 'sprinters_give_up':
      return pick([
        `${capitalize(BUNCH)} gives up: the catch is off.`,
        `It is over behind: ${BUNCH} sits up and the catch is not coming.`,
        `Behind, ${BUNCH} runs out of legs and abandons the pursuit.`,
      ])
    /**
     * LA CAPTURA, CON NOMBRE Y CON CUENTAS (v21). Dos defectos de producción a la vez, los dos de
     * Race Bességes e4: (1) Nicolás Ferrari se pasó 130 km escapado en solitario, le cazaron a la
     * vista de la meta y acabó CUARTO a 5 s, y la crónica lo despachó sin nombrarlo; (2) la frase
     * decía «the race is all together again» con seis grupos en meta y 76 corredores a 1:51.
     *
     * El motor manda ahora cuántos eran, cuánto llevaban delante y a cuánto de meta se acabó; y la
     * crónica —la única que ve la etapa entera— marca con `juntos` si aquello reunió a alguien.
     */
    case 'breakaway_caught': {
      const away = Number(e.datos?.awayKm ?? 0)
      const toGo = Number(e.datos?.toGo ?? -1)
      const size = Number(e.datos?.size ?? riders.length)
      const juntos = e.datos?.juntos !== 0
      const forKm = away > 0 ? ` after ${away} km up the road` : ''
      /**
       * LO QUE QUEDABA DE LA FUGA (v25). `size` son los que iban delante EN ESE MOMENTO y `deLos`,
       * de cuántos había salido: cuando no coinciden, el grupo cambió por el camino y decirlo es la
       * mitad de la historia. Antes el evento viajaba con la lista congelada del kilómetro en que la
       * fuga se formó y la frase nombraba a quien llevaba cuarenta kilómetros en el pelotón.
       */
      const deLos = Number(e.datos?.deLos ?? size)
      const ofWhat = deLos > size ? ` — what was left of a move that started with ${deLos}` : ''
      /**
       * …Y SI NADIE LLEGÓ A CAZARLA, NO SE DICE QUE LA CAZARON. Una fuga puede acabarse porque el
       * pelotón se la come o porque se va cayendo sola, y no es el mismo desenlace.
       */
      if (e.datos?.motivo === 'deshecha')
        return pick([
          `${capitalize(LEAD_GROUP)} of the day simply falls apart${forKm}: nothing left of it out on the road.`,
          `No catch to speak of — ${LEAD_GROUP} comes undone on its own${forKm}.`,
        ])
      // A la vista de la meta: es el desenlace más duro que hay y merece decirse así.
      const atTheLine = toGo >= 0 && toGo <= CAUGHT_AT_THE_LINE_KM
      // Con la fuga pequeña se nombra a quien iba dentro: es SU historia la que se acaba.
      if (size > 0 && size <= NAMED_IN_SUMMARY && who) {
        if (atTheLine)
          return `Caught within sight of the line: ${who} ${size === 1 ? 'is' : 'are'} swallowed up${forKm}.`
        return pick([
          `It is over for ${who}: caught${forKm}${ofWhat}.`,
          `The chase finally lands${forKm} — ${who} ${size === 1 ? 'is' : 'are'} back in the bunch${ofWhat}.`,
        ])
      }
      if (!juntos)
        return pick([
          `${capitalize(LEAD_GROUP)} is caught${forKm}, though there is no bunch left to speak of behind.`,
          `What is left of ${BUNCH} swallows them${forKm} — the race is in pieces.`,
        ])
      return pick([
        `${capitalize(BUNCH)} catches the ${size} out front${ofWhat} — everyone back together.`,
        `${capitalize(LEAD_GROUP)} is caught${ofWhat}; the race is all together again.`,
        `The pursuit succeeds and ${LEAD_GROUP} is reeled back in.`,
      ])
    }
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
      const ptsPart = pts > 0 ? `, taking ${pts} KOM point${pts === 1 ? '' : 's'}` : ''
      // Desde la v13 `leads` solo llega a 1 si el ganador está ESTRICTAMENTE por delante de todos los
      // demás: tres corredores con un punto cada uno no pueden liderar los tres (defecto B5). Y la
      // frase deja claro que habla de la montaña DE LA CARRERA, que es lo que el motor sabe contar.
      const leadPart = e.datos?.leads === 1 ? ' — and takes the lead in the mountains' : ''
      return `${who} is first over the ${catLabel}${ptsPart}${leadPart}.`
    }
    case 'peloton_regroup': {
      // El reagrupamiento (v8). Existía en el modelo desde siempre y no se narraba nunca: la crónica
      // dejaba «about 51 left in front» y en meta llegaban más de cien juntos, sin nada que lo
      // explicara. Es información de carrera de primer orden, no un detalle.
      const joined = Number(e.datos?.joined ?? 0)
      const now = Number(e.datos?.remaining ?? 0)
      const before = Number(e.datos?.before ?? 0)
      const group = e.datos?.chasing === 1 ? CHASE_GROUP : LEAD_GROUP
      if (before <= 1)
        return `The chase gets back on: ${joined} riders rejoin and ${group} is ${now} strong again.`
      return pick([
        `The gap closes and ${joined} riders get back on — ${group} is up from ${before} to ${now}.`,
        `Regrouping on the run-in: ${group} goes from ${before} to ${now} as they rejoin.`,
        `${joined} riders claw their way back — ${now} together again at the front.`,
      ])
    }
    case 'peloton_split': {
      const remaining = e.datos?.remaining == null ? null : Number(e.datos.remaining)
      // `before` y `chasing` llegan desde v6. Sin ellos (crónicas guardadas antes) se narra como
      // siempre: es la redacción vieja, que no miente, solo cuenta menos.
      const before = e.datos?.before == null ? null : Number(e.datos.before)
      // EL NÚMERO DE DESCOLGADOS NO PUEDE SER MAYOR QUE EL GRUPO (defecto B1). En producción hay
      // crónicas congeladas que dicen «2010 riders are shelled» en una carrera de 147: son etapas
      // corridas ANTES de la v8, cuando `dropped` viajaba con el recuento BRUTO de veces que se
      // rompió la goma bloque a bloque (los mismos corredores soltándose y volviendo). El motor ya
      // no emite eso —desde la v8 manda la pérdida real, `before − remaining − escapados`— pero los
      // eventos guardados no se pueden reescribir, así que la frase se queda con lo que sí es
      // coherente. `before` y `remaining` siempre lo fueron.
      const raw = Number(e.datos?.dropped ?? 0)
      const dropped =
        before != null && remaining != null && raw > before - remaining
          ? Math.max(0, before - remaining)
          : raw
      // Si la fuga sigue en carretera, este grupo NO va en cabeza: decir "left in front" era falso.
      const chasing = e.datos?.chasing === 1
      const group = chasing ? CHASE_GROUP : LEAD_GROUP
      const where = chasing ? `in ${CHASE_GROUP}` : 'in front'
      // `phase` llega desde v8: cuántos avisos lleva ya esta misma criba. El primero presenta a
      // quien aprieta; los siguientes cuentan la PROGRESIÓN y no vuelven a nombrarlo, que es lo que
      // hacía que un puerto largo se leyera como diez partes clónicos con el mismo equipo repetido.
      const phase = Number(e.datos?.phase ?? 0)
      if (phase > 0 && before != null && remaining != null && before > remaining) {
        if (remaining === 1)
          return `The selection goes on and the last companions crack — ${who || 'the leader'} rides on alone.`
        return pick([
          `The selection goes on: ${group} is down from ${before} to ${remaining}.`,
          `The climb keeps biting — ${dropped} more lose${dropped === 1 ? 's' : ''} contact and only ${remaining} of the ${before} are left ${where}.`,
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
          `${driver}: ${dropped} rider${dropped === 1 ? ' is' : 's are'} shelled and ${group} is cut from ${before} to ${remaining}.`,
          `${driver}; ${group} thins out from ${before} to ${remaining} over the climb.`,
        ])
      }

      const left = remaining != null ? ` — about ${remaining} left ${where}` : ''
      const one = dropped === 1
      return pick([
        `${driver} on the climb — ${dropped} rider${one ? ' is' : 's are'} shelled${left}.`,
        `${driver} and ${dropped} rider${one ? '' : 's'} slip${one ? 's' : ''} off the back${left}.`,
        `${driver}; the climb thins ${group} by ${dropped}${left}.`,
      ])
    }
    case 'final_km': {
      const margin = Number(e.datos?.margin ?? 0)
      const field = Number(e.datos?.field ?? 0)
      /**
       * …Y SOBRE QUIÉN VA ESE MARGEN (v27). Es la última línea antes de la meta y la que responde
       * «quién va ganando»: el margen es al SIGUIENTE grupo, que después de media etapa leyendo
       * «6:53 sobre el pelotón» no es lo mismo. Con `chaseSize` (v27) la frase dice sobre cuántos
       * se lleva; sin él —etapas ya corridas— se queda como estaba y no se inventa la referencia.
       */
      const chaseSize = Number(e.datos?.chaseSize ?? 0)
      const overWho =
        chaseSize === 1
          ? ' over the next man on the road'
          : chaseSize > 1
            ? ` over the next ${chaseSize} on the road`
            : ''
      const m = margin > 0 ? ` by ${fmtGap(margin)}${overWho}` : ''
      if (field <= 1)
        return `Into the final kilometre ${who} leads alone${m} — barring mishap the stage is won.`
      return `Into the final kilometre ${who} are clear${m} — the win will be fought out among them.`
    }
    case 'bunch_sprint': {
      // Los tres del sprint van con identidad completa: son tres, y son EL momento de la etapa.
      const led = e.datos?.ledOut === 1
      const trio = listRiders(riders.slice(0, 3))
      const first = riders[0]
      return pick([
        `Into the final kilometre it's a bunch sprint — ${trio} fight it out.`,
        `${capitalize(BUNCH)} winds up for a mass gallop; ${trio} are in the mix.`,
        led && first
          ? `Perfectly led out, ${riderFull(first)} launches with ${listRiders(riders.slice(1, 3))} for company.`
          : `All together for the sprint: ${trio} line it up.`,
      ])
    }
    case 'stage_win': {
      // `who` ya trae dorsal, equipo y bandera del ganador: la coletilla `(equipo)` que se añadía
      // aquí a mano sobraba y salía dos veces.
      const won = e.datos?.won
      const margin = Number(e.datos?.margin ?? 0)
      if (won === 'solo')
        return pick([
          `${who} solos to victory, ${fmtGap(margin)} clear of ${CHASE_GROUP}.`,
          `${who} holds on alone to win by ${fmtGap(margin)}.`,
        ])
      if (won === 'sprint')
        return pick([
          `${who} wins the bunch sprint.`,
          `${who} takes the sprint from ${BUNCH}.`,
          `${who} throws up the arms — fastest in the sprint.`,
        ])
      if (won === 'group')
        return pick([
          `${who} wins from ${LEAD_GROUP}.`,
          `${who} outkicks the rest of ${LEAD_GROUP} for the stage.`,
        ])
      return `${who} wins the stage.`
    }
    // --- LA CONTRARRELOJ (motor v18, docs/balance.md «v18 — La contrarreloj») -------------------
    // Una crono se cuenta con el reloj, no con la carretera: quién sale y en qué orden, quién marca
    // el mejor tiempo, quién se lo baja, cómo van los favoritos en los parciales, quién alcanza a
    // quién, y el desenlace cuando entra el último. Hasta la v17 una crono entera era UNA línea
    // (`stage_win_itt` y nada más).
    case 'tt_start_order': {
      // El formato de salida, dicho una vez y bien: es lo que hace legible todo lo que viene
      // después (por qué el amarillo sale el último, por qué a uno le alcanzan).
      const mins = Math.round(Number(e.datos?.intervalS ?? 0) / 60)
      const every = mins === 1 ? 'at one-minute intervals' : `${mins} minutes apart`
      const n = Number(e.datos?.riders ?? 0)
      const field = n > 0 ? `${n} riders ` : ''
      if (e.datos?.mode === 'general')
        return pick([
          `${field}roll down the start ramp in reverse order on general classification, ${every}: last on GC first, the race leader last. ${who || 'The first man'} is first off.`,
          `The start order is the classification turned on its head — ${field}${every}, with the leader's jersey the last to leave the ramp. First away: ${who}.`,
        ])
      return pick([
        `No classification to reverse yet, so the start order follows the race numbers, ${every}: the numbers ending in 1 go last and the team leaders close the day. First off is ${who}.`,
        `${field}take the ramp by race number, ${every} — highest numbers first, and number 1 the very last man to start. ${who} opens the road.`,
      ])
    }
    case 'tt_last_off': {
      // Horas después: el último toma la salida con medio campo ya duchado. Su maillot sale solo
      // por la identidad, así que la frase no lo repite. La espera se dice en h:mm:ss y no en
      // minutos corridos: una rampa de 130 corredores dura cuatro horas y «258:00» no se lee.
      const after = formatTime(Number(e.datos?.afterS ?? 0))
      return pick([
        `The last man down the ramp is ${who}, ${after} after the first rider left it.`,
        `${who} is the last to start, with the rest of the field already out on the road.`,
        `Now ${who} takes the ramp — the final starter, ${after} into the day.`,
      ])
    }
    case 'tt_split': {
      // El parcial: en el punto de control se compara con el mejor. `protagonists[0]` es el que
      // acaba de marcar el mejor parcial; `[1]`, a quien se lo quita (si había alguien).
      const at = Number(e.datos?.checkKm ?? e.km)
      const split = formatTime(Number(e.datos?.splitS ?? 0))
      const gain = Number(e.datos?.gainS ?? 0)
      const me = riders[0] ? riderFull(riders[0]) : 'The leader'
      const beaten = riders[1] ? riderFull(riders[1]) : ''
      if (!beaten) return `First through the ${at} km check is ${me}, in ${split}.`
      const by = gain > 0 ? ` by ${fmtGap(gain)}` : ''
      return pick([
        `At the ${at} km check ${me} is fastest so far in ${split}, quicker than ${beaten}${by}.`,
        `${me} comes through the ${at} km time check in ${split} — that is${by ? ` ${fmtGap(gain)}` : ''} up on ${beaten}.`,
        `New best at the ${at} km split: ${me}, ${split}${by ? `, ${fmtGap(gain)} inside ${beaten}` : `, ahead of ${beaten}`}.`,
      ])
    }
    case 'tt_first_time': {
      // La silla del mejor tiempo se estrena: el primero en llegar siempre la ocupa.
      const t = formatTime(Number(e.datos?.timeS ?? 0))
      return pick([
        `${who} is the first man home and sets the time to beat: ${t}.`,
        `First finisher of the day, ${who} stops the clock at ${t} — the mark everyone else now has to chase.`,
      ])
    }
    case 'tt_best_time': {
      const t = formatTime(Number(e.datos?.timeS ?? 0))
      const gain = Number(e.datos?.gainS ?? 0)
      const me = riders[0] ? riderFull(riders[0]) : who
      const beaten = riders[1] ? riderFull(riders[1]) : 'the previous best'
      const by = gain > 0 ? fmtGap(gain) : ''
      return pick([
        `${me} takes over the hot seat: ${t}, ${by ? `${by} ` : ''}quicker than ${beaten}.`,
        `Best time of the day so far to ${me} — ${t}${by ? `, ${by} inside ${beaten}` : `, ahead of ${beaten}`}.`,
        `${beaten} is out of the chair: ${me} goes fastest with ${t}${by ? `, ${by} better` : ''}.`,
      ])
    }
    case 'tt_catch': {
      // EL ALCANCE. La regla es la de verdad: no da rebufo, está prohibido, y el alcanzado se
      // aparta. Se dice en la frase para que nadie lea el alcance como una ventaja.
      const chaser = riders[0] ? riderFull(riders[0]) : 'A rider'
      const victim = riders[1] ? riderFull(riders[1]) : 'a rider'
      const victimPlain = riders[1]?.name ?? 'the caught rider'
      const head = fmtGap(Number(e.datos?.headStartS ?? 0))
      const at = `km ${e.km}`
      return pick([
        `${chaser} catches ${victim} at ${at} — he left the ramp ${head} earlier. No shelter allowed on a time trial, so ${victimPlain} pulls aside and lets him through.`,
        `${head} of a head start gone: ${chaser} reels in ${victim} at ${at}, and rides straight past without a metre of shelter.`,
        `${victim} is caught at ${at} by ${chaser}, who started ${head} behind him, and has to swing wide out of the way.`,
      ])
    }
    case 'tt_catches': {
      // El recuento honesto. Con el abanico de tiempos que reparte hoy el modelo de crono el número
      // es grande, y taparlo sería esconder un defecto medido (docs/balance.md, «v18 §7»).
      const count = Number(e.datos?.count ?? 0)
      return count === 1
        ? 'One rider was caught by a later starter over the course of the day.'
        : `${count} riders were caught by a later starter in the course of the day.`
    }
    case 'tt_last_home': {
      // El que salió el último, al entrar: con orden inverso es el maillot de líder, y su llegada
      // cierra la crono. El maillot va en la identidad, así que la frase no lo nombra dos veces.
      const gap = Number(e.datos?.gapS ?? 0)
      const place = Number(e.datos?.puesto ?? 0)
      const t = formatTime(Number(e.datos?.timeS ?? 0))
      const nth = place > 0 ? `${place}${ordinalSuffix(place)}` : ''
      if (gap <= 0) return `The last starter, ${who}, comes home in ${t}.`
      return pick([
        `The last man off the ramp comes home: ${who} finishes ${gapToBest(gap)} down${nth ? `, ${nth} on the day` : ''}.`,
        `${who} crosses the line in ${t} — ${gapToBest(gap)} off the best time${nth ? ` and ${nth} today` : ''}.`,
      ])
    }
    case 'stage_win_itt': {
      // Las crónicas congeladas antes de la v18 no traen `datos`: la frase se queda como estaba,
      // que no miente, solo cuenta menos.
      const t = e.datos?.timeS == null ? '' : formatTime(Number(e.datos.timeS))
      const margin = Number(e.datos?.marginS ?? 0)
      if (!t) return `${who} sets the fastest time.`
      const by = margin > 0 ? `, ${fmtGap(margin)} clear of the field` : ''
      return pick([
        `Nobody beats it: ${who} wins the time trial in ${t}${by}.`,
        `The fastest time of the day belongs to ${who} — ${t}${by}.`,
      ])
    }
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
