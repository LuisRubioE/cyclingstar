/**
 * Motor de narración de la crónica (presentación pura, sin HTTP).
 *
 * Estaba dentro de los clientes de api/ (`results.ts` y `lastRace.ts`); aquí no cambia ni un texto
 * ni el algoritmo de variante: solo deja de vivir en la capa de red. Los textos son de UI, así que
 * van en inglés; el vocabulario interno de los eventos sigue en el idioma del motor.
 */

import type { RiderRaceReport } from '@cyclingstar/shared'

/**
 * Plantillas de crónica (#79): varias redacciones por evento para que el relato no repita siempre
 * la misma frase. La variante es determinista (misma semilla ⇒ misma frase), así que re-renderizar
 * la etapa cuenta la misma historia.
 */
const CHRONICLE: Record<string, ((n: string) => string)[]> = {
  breakaway_formed: [
    (n) => `${n} attack and open a gap`,
    (n) => `${n} jump clear off the front`,
    (n) => `A move goes clear — ${n} force the pace`,
    (n) => `${n} slip away and the break is on`,
  ],
  peloton_concedes: [
    () => 'The peloton lets the move go',
    () => 'The bunch eases and grants the break its leash',
    () => 'No panic behind — the peloton concedes the gap',
    () => 'The favourites nod the move up the road',
  ],
  sprinters_give_up: [
    () => "The sprinters' teams give up the chase",
    () => 'The lead-out trains sit up — the catch looks unlikely',
    () => 'Behind, the fast men wave the white flag',
    () => 'The chase falters as the sprinters run out of legs',
  ],
  sprint_intermediate: [
    (n) => `${n} takes the intermediate sprint`,
    (n) => `${n} kicks first at the intermediate`,
    (n) => `${n} grabs the bonus points at the sprint`,
    (n) => `${n} pips the rest to the intermediate line`,
  ],
  climb_kom: [
    (n) => `${n} crests the climb first`,
    (n) => `${n} leads over the top for the KOM points`,
    (n) => `${n} dances away to top the climb`,
    (n) => `${n} is first to the summit`,
  ],
  break_cooperation: [(n) => `${n} start working together up front`],
  bunch_sprint: [
    (n) => `Into the final kilometre it's a bunch sprint — ${n} fight it out`,
    (n) => `The trains wind up for a mass gallop; ${n} in the mix`,
  ],
  final_km: [
    (n) => `Into the final kilometre ${n || 'the leaders'} are clear at the front`,
    (n) => `${n || 'The leaders'} hit the last kilometre in front`,
  ],
  time_gap: [() => 'Out front, the break presses on with its advantage'],
  sprinters_chase: [
    () => "The sprinters' teams hit the front to chase",
    () => 'The bunch organises behind — the chase is on',
  ],
  peloton_split: [
    (n) => `${n || 'The front'} lifts the tempo on the climb and the group thins`,
    (n) => `Selection on the climb as ${n || 'the leaders'} press the pace`,
    (n) => `${n || 'The pace'} bites on the climb — riders slip off the back`,
  ],
  peloton_regroup: [
    () => 'The groups come back together at the front',
    () => 'The chasers get back on — the front group swells again',
    () => 'Regrouping on the road: the race is together again',
  ],
  front_group: [
    (n) => `Only a handful left in front: ${n}`,
    (n) => `The race is down to a select group — ${n}`,
  ],
  breakaway_caught: [
    () => 'The peloton reels the breakaway back in',
    () => 'It all comes back together — the break is caught',
    () => 'The elastic snaps: the bunch swallows the move',
    () => 'Game over for the break as the peloton surges up',
  ],
  breakaway_consolidated: [
    (n) => `${n} settle into a rhythm with a healthy lead`,
    (n) => `The gap stabilises as ${n} commit to the move`,
    (n) => `${n} build their advantage out front`,
  ],
  crash: [
    (n) => `Chaos in the bunch — ${n} hit the deck`,
    (n) => `A touch of wheels brings down ${n}`,
    (n) => `Riders down: ${n} caught in a crash`,
  ],
  dropped: [
    (n) => `${n} can't hold the pace and slip back`,
    (n) => `The rhythm proves too much — ${n} are distanced`,
    (n) => `${n} lose contact with the group`,
  ],
  stage_win: [
    (n) => `${n} wins the stage`,
    (n) => `${n} throws up the arms — stage victory`,
    (n) => `${n} takes it at the line`,
    (n) => `Nobody could answer ${n} — the stage is theirs`,
  ],
  stage_win_itt: [
    (n) => `${n} wins the time trial`,
    (n) => `${n} sets the best time against the clock`,
    (n) => `${n} stops the clock fastest to take the TT`,
  ],
}

/** Elige la variante con un hash FNV-1a de (evento, semilla, protagonistas): determinista. */
function pickVariant(key: string, seed: number, names: string, count: number): number {
  let h = 2166136261
  const s = `${key}:${seed}:${names}`
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0
  return h % count
}

/** Narra un evento del replay en inglés, variando la frase de forma determinista (SPEC 6.15, #79). */
export function narrate(plantilla: string, who: string[], seed = 0): string {
  const names = who.join(', ')
  const options = CHRONICLE[plantilla]
  if (!options) return plantilla
  const variant = options[pickVariant(plantilla, seed, names, options.length)]!
  return variant(names)
}

/** Frase en segunda persona para un momento en el que el corredor fue protagonista. */
export function personalNarration(plantilla: string): string {
  switch (plantilla) {
    case 'breakaway_formed':
      return 'You attacked and made the breakaway'
    case 'sprint_intermediate':
      return 'You took the intermediate sprint'
    case 'climb_kom':
      return 'You crested the climb first — KOM points'
    case 'breakaway_caught':
      return 'Your breakaway was reeled back in'
    case 'stage_win':
      return 'You won the stage! 🏆'
    case 'stage_win_itt':
      return 'You won the time trial! 🏆'
    default:
      return plantilla
  }
}

/** Veredicto corto comparando lo ordenado con lo sucedido. */
export function raceVerdict(r: RiderRaceReport): string {
  const top = r.fieldSize > 0 ? r.position / r.fieldSize : 1
  if (r.position === 1) return 'Perfect execution — you took the win.'
  if (r.position <= 3) return 'A podium — the plan came together.'
  if (r.orders?.contestSprints && r.position <= 8)
    return 'You went for the sprint and were right in the mix.'
  if (r.orders?.contestClimbs && r.komPoints > 0)
    return 'You animated the climbs and grabbed mountain points.'
  if (r.orders?.role === 'gregario') return 'A domestique day — work done for the team.'
  if (top <= 0.15) return 'A strong ride near the front.'
  if (top <= 0.4) return 'A solid day in the bunch.'
  return 'A quiet day — the race got away from you.'
}
