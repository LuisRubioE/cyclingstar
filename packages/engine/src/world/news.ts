/**
 * Generador de noticias templado (SPEC, Paso 39). Convierte eventos del mundo (victorias, fugas,
 * cimas, fichajes, lesiones, récords) en titulares en inglés. Puro y determinista: la variante de
 * redacción sale de una semilla, así que el feed cuenta la historia sin repetir la misma frase.
 */
import { seededRng } from '@cyclingstar/shared'

export type NewsKind = 'stage_win' | 'breakaway_win' | 'kom' | 'gc_win' | 'contract' | 'injury'

export interface NewsData {
  rider?: string
  team?: string
  race?: string
  stage?: number
  detail?: string
}

const TEMPLATES: Record<NewsKind, ((d: NewsData) => string)[]> = {
  stage_win: [
    (d) => `${d.rider} powers to victory on stage ${d.stage} of the ${d.race}.`,
    (d) => `Stage ${d.stage} goes to ${d.rider} after a commanding finish at the ${d.race}.`,
    (d) => `${d.rider} times the sprint to perfection to win stage ${d.stage}.`,
    (d) => `No answer for ${d.rider}, who takes stage ${d.stage} of the ${d.race}.`,
  ],
  breakaway_win: [
    (d) => `${d.rider} survives from the break to win stage ${d.stage} of the ${d.race}.`,
    (d) => `The peloton misjudges it — ${d.rider} holds on from the break on stage ${d.stage}.`,
    (d) => `A perfect raid: ${d.rider} wins stage ${d.stage} from the day's move.`,
  ],
  kom: [
    (d) => `${d.rider} is first over the summit and leads the mountains at the ${d.race}.`,
    (d) => `${d.rider} attacks on the climb and grabs the KOM points on stage ${d.stage}.`,
    (d) => `The polka-dot fight heats up as ${d.rider} tops the queen-stage climb.`,
  ],
  gc_win: [
    (d) => `${d.rider} seals the overall win at the ${d.race}.`,
    (d) => `${d.rider} defends the lead all the way to take the ${d.race} title.`,
    (d) => `The ${d.race} is decided: ${d.rider} wins the general classification.`,
  ],
  contract: [
    (d) => `${d.rider} signs for ${d.team}.`,
    (d) => `${d.team} land the signature of ${d.rider}.`,
    (d) => `Transfer done: ${d.rider} joins ${d.team}.`,
  ],
  injury: [
    (d) => `${d.rider} crashes and will need time to recover.`,
    (d) => `Bad luck for ${d.rider}, down in a crash and forced out.`,
    (d) => `${d.rider} hits the deck — the medical report is awaited.`,
  ],
}

/** Redacta un titular determinista para un evento, variando la frase con la semilla. */
export function renderNews(kind: NewsKind, seed: string, data: NewsData): string {
  const options = TEMPLATES[kind]
  const rng = seededRng(`news:${kind}:${seed}`)
  const idx = Math.floor(rng() * options.length)
  return options[idx]!(data)
}
