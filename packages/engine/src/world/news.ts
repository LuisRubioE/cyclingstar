/**
 * Generador de noticias templado (SPEC, Paso 39). Convierte eventos del mundo (victorias, fugas,
 * cimas, fichajes, lesiones, récords) en titulares en inglés. Puro y determinista: la variante de
 * redacción sale de una semilla, así que el feed cuenta la historia sin repetir la misma frase.
 */
import { seededRng } from '@cyclingstar/shared'

export type NewsKind =
  | 'stage_win'
  | 'tt_win'
  | 'breakaway_win'
  | 'one_day_win'
  | 'one_day_tt_win'
  | 'kom'
  | 'gc_win'
  | 'contract'
  | 'injury'
  | 'abandon'
  | 'retirement'

export interface NewsData {
  rider?: string
  team?: string
  race?: string
  stage?: number
  detail?: string
}

/**
 * Titulares CONCRETOS y sin florituras (SPEC 39): un hecho por línea —quién, qué, dónde—. El estilo
 * narrativo va en el journal de la etapa, no aquí. Una sola redacción por tipo: la noticia es un dato.
 */
const TEMPLATES: Record<NewsKind, ((d: NewsData) => string)[]> = {
  stage_win: [(d) => `${d.rider} wins stage ${d.stage} of the ${d.race}.`],
  tt_win: [(d) => `${d.rider} wins the stage ${d.stage} time trial at the ${d.race}.`],
  breakaway_win: [(d) => `${d.rider} wins stage ${d.stage} of the ${d.race} from the breakaway.`],
  one_day_win: [(d) => `${d.rider} wins the ${d.race}.`],
  one_day_tt_win: [(d) => `${d.rider} wins the ${d.race} time trial.`],
  kom: [(d) => `${d.rider} wins the mountains classification at the ${d.race}.`],
  gc_win: [(d) => `${d.rider} wins the ${d.race} overall.`],
  contract: [(d) => `${d.rider} signs for ${d.team}${d.detail ? ` ${d.detail}` : ''}.`],
  injury: [(d) => `${d.rider} injured${d.detail ? ` — out for ${d.detail}` : ''}.`],
  // Abandono en una carrera por etapas (docs/motor.md §VI.3 y §V.5). `detail` dice por qué: se bajó
  // de la bici, quedó fuera de control, se lesionó, enfermó, o el jugador decidió retirarse.
  abandon: [
    (d) =>
      `${d.rider} abandons the ${d.race}${d.stage ? ` on stage ${d.stage}` : ''}${d.detail ? ` — ${d.detail}` : ''}.`,
  ],
  retirement: [(d) => `${d.rider} retires${d.detail ? ` ${d.detail}` : ''}.`],
}

/** Redacta un titular determinista para un evento, variando la frase con la semilla. */
export function renderNews(kind: NewsKind, seed: string, data: NewsData): string {
  const options = TEMPLATES[kind]
  const rng = seededRng(`news:${kind}:${seed}`)
  const idx = Math.floor(rng() * options.length)
  return options[idx]!(data)
}
