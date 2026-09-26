/**
 * TEMPORADA E IDENTIDAD (docs/generador.md §3.8 y sección 10).
 *
 * NO importa valores de `calendar.ts` (lo sella `routes/arranque.test.ts`): las funciones de
 * temporada y su memo viven allí, y aquí solo lo que es de la edición (el plan, las semillas y
 * `diffMotivos`).
 *
 * Paso 1: solo los tipos `EditionPlan`, `Subflujo` y `DiffInput`. Paso 5: `BASE_SEASON`, `opcionDe`,
 * `planDeEdicion`, `claveEtapa`, `seasonDe` y `semillaDe`; paso 6: `diffMotivos`.
 */
import type { Motif } from './motifs.js'

/** Lo que la edición (la temporada) decide de una etapa, encima de su identidad. */
export interface EditionPlan {
  km: number // al 0,1, ya con jitter y acotado; = req.km si routeSource === 'edicion'; derivado en circuitos de firma
  n: Record<number, number> // cardinalidad por índice de hueco no firma
  vueltas?: number // circuito de firma, tras vueltasJitter
  opcion: number // = opcionDe(sk, req.raceId, season): 0 canonico, k la alternativa k − 1
  dPlusObjetivo: number // metros, TOTAL con relleno (sección 8, §8.4)
}

/**
 * Lista CERRADA de subflujos de azar (sección 10, §10.4). Sin `season` (`arch`, `firma`) son la
 * identidad; con `season` (`ed`, `mot`, `pos`, `dib`) la edición. Uno nuevo se declara aquí antes de
 * usarse (§15.1 regla 6).
 */
export type Subflujo = 'arch' | 'firma' | 'ed' | 'mot' | 'pos' | 'dib'

/** Lo que diffMotivos compara de una etapa: el km viaja aparte porque no es un campo de Motif (sección 10, §10.8). */
export interface DiffInput {
  km: number // Σ segment.km del perfil
  motivos: readonly Motif[] // arch.motivos
  opcion?: string // Alternativa.nombre de la opción de nivel 2; ausente en la canónica
}
