/**
 * EL TÍTULO DE LA PESTAÑA Y EL AVISO DE «ETAPA LISTA» (E2, docs/retransmision.md §11.8 y §11.9; D-42,
 * I-27; paso 9a). Puro: lo usan la web (`usePageTitle`, el único escritor de `document.title`), el
 * fallback de la SPA (`apps/api/src/spaShell.ts`, §14.10), que inyecta el MISMO título antes del
 * JavaScript (11-c), y el correo de etapa lista (`stageReadyEmail`, 11-d).
 *
 * Por tipo no cabe un resultado: solo reciben una `PreStageInfo` (o, el título, tres de sus campos) y
 * un `PageKind`, y ninguno de esos campos dice nada del desenlace. `pageTitle.test.ts` comprueba además
 * que en sus salidas no hay más palabras que las de `STAGE_KIND_WORDS`, el nombre de la carrera, los
 * números y las fijas.
 */
import type { StageKind } from '../contracts.js'
import type { PreStageInfo } from './wire.js'

export type PageKind =
  'watch' | 'report' | 'race' | 'rider' | 'team' | 'news' | 'rankings' | 'home' | 'other'

/**
 * Lo que el título necesita de una etapa: el nombre de la carrera, la etapa y cuántas tiene. Tres
 * campos de `PreStageInfo`, ninguno del desenlace; así la web titula con lo que trae la ruta de etapa
 * (que no lleva la etiqueta ni la temporada) y el fallback de la SPA, con su `PreStageInfo` entera.
 */
export type PageTitleInfo = Pick<PreStageInfo, 'raceName' | 'stageDay' | 'stageCount'>

const APP = 'Cycling Star'

/** Las palabras de un tipo de etapa: salen del recorrido, nunca de la carrera. Las usan el aviso y la vista previa. */
export const STAGE_KIND_WORDS = {
  llana: 'flat stage',
  media: 'hilly stage',
  reina: 'mountain stage',
  cri: 'time trial',
  clasica: 'one-day race',
} as const satisfies Record<StageKind, string>

/** Las páginas sin etapa llevan un nombre fijo; `home` y `other`, solo el de la app. */
const PAGE_WORDS = {
  rider: 'Rider',
  team: 'Team',
  news: 'News',
  rankings: 'Rankings',
  home: null,
  other: null,
} as const satisfies Record<Exclude<PageKind, 'watch' | 'report' | 'race'>, string | null>

/**
 * EL título (D-42). Con la etapa conocida o no, el mismo: el historial y el autocompletado guardan
 * títulos (sup. X6). `_locale` delante desde que nace, con el tipo literal `'en'` y el nombre `_locale`
 * mientras no lo lea (noUnusedParameters; 12-q, D-62).
 */
export function pageTitle(_locale: 'en', p: PageTitleInfo | null, page: PageKind): string {
  if (page === 'watch' || page === 'report' || page === 'race') {
    if (p === null) return APP
    if (page === 'race') return `${p.raceName} · ${APP}`
    // una carrera de un día no tiene «Stage 1»
    const stage = p.stageCount === 1 ? p.raceName : `Stage ${p.stageDay} · ${p.raceName}`
    if (page === 'watch') return `${stage} · ${APP}`
    return p.stageCount === 1
      ? `${p.raceName} report · ${APP}`
      : `Stage ${p.stageDay} report · ${p.raceName} · ${APP}`
  }
  const words = PAGE_WORDS[page]
  return words === null ? APP : `${words} · ${APP}`
}

/**
 * El aviso de «etapa lista» (D-42): asunto y primera línea. Por tipo no cabe un resultado;
 * `ownRiderOnStartlist` sale de la LISTA DE SALIDA, que se sabe antes de correr. Ningún adjetivo que
 * dependa de lo que pasó (§11.9, regla 2): las únicas palabras variables son las del recorrido.
 */
export function stageReadyNotice(
  _locale: 'en',
  p: PreStageInfo,
  ownRiderOnStartlist: boolean,
): { readonly subject: string; readonly text: string } {
  const where = p.stageCount === 1 ? p.raceName : `Stage ${p.stageDay} of ${p.raceName}`
  const parts = [
    `${Math.round(p.km)} km`,
    STAGE_KIND_WORDS[p.stageKind],
    ...(ownRiderOnStartlist ? ['your rider is on the start list'] : []),
  ]
  return { subject: `${where} is ready to watch`, text: parts.join(' · ') }
}
