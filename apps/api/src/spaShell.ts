import { type Database, type Horizon, getStageResults, stageGateOf } from '@cyclingstar/db'
import { SEASON_CALENDAR } from '@cyclingstar/engine'
import {
  type PreStageInfo,
  STAGE_KIND_WORDS,
  pageTitle,
  stageQuerySchema,
  stageReadyNotice,
} from '@cyclingstar/shared'
import { escapeHtml } from './emails.js'
import { stageContextOf } from './stageReplay.js'

/**
 * EL FALLBACK DE LA SPA CON SU TÍTULO Y SUS `og:` (E2, docs/retransmision.md §11.8, §11.10 y §14.10;
 * D-36, D-42, DD-12, 11-c, 14-k; paso 9a).
 *
 * La vista previa de un enlace (la de un chat, la de un buscador) no ejecuta JavaScript, y hasta aquí
 * el fallback servía `index.html` tal cual, con `<title>Cycling Star</title>`. Para las rutas de una
 * carrera, de una etapa y de su acta, el manejador de 404 de `app.ts` inyecta el MISMO título que pondrá
 * `usePageTitle` (`pageTitle`, con la misma información de la etapa: 11-c, el título antes y después del
 * JavaScript es el mismo) y unas `og:` neutras. Nunca un resultado, salvo el del acta fuera del velo de
 * QUIEN PIDE la página (DD-12): el robot de vista previa no lleva cookie y su horizonte es `anon`, con el
 * velo vacío, así que el enlace compartido del acta enseña `Spoiler · Winner: …` a todo el que lo vea;
 * un jugador con la etapa velada que abre la página recibe la descripción neutra. Es el precio de
 * DD-12, que el dueño aceptó con su valor por defecto.
 */

/** Lo que el fallback inyecta en index.html. Nunca un resultado, salvo el del acta fuera del velo (DD-12). */
export interface ShellMeta {
  readonly title: string
  readonly ogTitle: string
  readonly ogDescription: string
}

/** Carrera, etapa y acta, y las rutas viejas de /races que la web redirige (`App.tsx`, `Legacy`). */
export const SHELL_PATH =
  /^\/(?:world\/)?races\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/stages\/(\d{1,2})(\/report)?)?\/?$/

const APP = 'Cycling Star'

/**
 * La `PreStageInfo` de una etapa, resuelta como la ruta de etapa (`stageContextOf`: la carrera del
 * calendario, la edición que corre el mundo y su etiqueta); null si la carrera o la etapa no existen.
 */
export async function preStageInfoFor(
  db: Database,
  raceId: string,
  stageDay: number,
  season: number | undefined,
): Promise<PreStageInfo | null> {
  const ctx = await stageContextOf(db, raceId, stageDay, season)
  if (ctx === null) return null
  return {
    raceName: ctx.race.name,
    season: ctx.season,
    stageDay: ctx.day,
    stageCount: ctx.race.stages.length,
    km: ctx.km,
    label: ctx.spec.label,
    stageKind: ctx.spec.kind,
  }
}

/**
 * La meta de una página, o null si la URL no es de una carrera o de una etapa del calendario (entonces
 * index.html tal cual). La carrera titula con la información de su etapa 1, como la web (11-c); la etapa,
 * con la de Watch; el acta, con la suya, y su descripción lleva el ganador solo si la etapa se corrió y
 * no tiene puerta para `h` (`stageGateOf`): ni velada ni con una anterior velada.
 */
export async function shellMetaFor(db: Database, h: Horizon, url: URL): Promise<ShellMeta | null> {
  const m = SHELL_PATH.exec(url.pathname)
  if (m === null) return null
  const race = SEASON_CALENDAR.find((r) => r.id === m[1])
  if (race === undefined) return null
  // `?season=` como en las rutas de etapa (§14.2); uno que no vale se ignora y queda la de hoy
  const q = stageQuerySchema.safeParse({ season: url.searchParams.get('season') ?? undefined })
  const season = q.success ? q.data.season : undefined
  if (m[2] === undefined) {
    const p1 = await preStageInfoFor(db, race.id, 1, season)
    return {
      title: pageTitle('en', p1, 'race'),
      ogTitle: `${race.name} · ${APP}`,
      // «1 stages» no es inglés: una carrera de un día se describe como tal
      ogDescription:
        race.stages.length === 1 ? STAGE_KIND_WORDS.clasica : `${race.stages.length} stages`,
    }
  }
  const day = Number(m[2])
  const p = await preStageInfoFor(db, race.id, day, season)
  if (p === null) return null
  // `187 km · mountain stage`: por tipo no cabe un resultado
  const neutral = stageReadyNotice('en', p, false).text
  if (m[3] === undefined) {
    const stage = p.stageCount === 1 ? p.raceName : `Stage ${day} · ${p.raceName}`
    return {
      title: pageTitle('en', p, 'watch'),
      ogTitle: `${stage} · Watch the race`,
      ogDescription: neutral,
    }
  }
  const title = pageTitle('en', p, 'report')
  if (stageGateOf(h, `${race.id}:s${p.season}`, day) !== null)
    return { title, ogTitle: title, ogDescription: neutral }
  const winner = (await getStageResults(db, `${race.id}:s${p.season}`, day)).find(
    (r) => !r.dnf && r.puesto === 1,
  )
  return {
    title,
    ogTitle: title,
    ogDescription: winner === undefined ? neutral : `Spoiler · Winner: ${winner.name} · ${neutral}`,
  }
}

/**
 * Cambia el primer `<title>` y añade las `og:` antes de `</head>`, escapando `&`, `<`, `>`, `"` y `'`
 * (`escapeHtml`, el de los correos). Un index.html sin `<title>` lo gana junto a las `og:`.
 */
export function injectShellMeta(html: string, meta: ShellMeta): string {
  const title = `<title>${escapeHtml(meta.title)}</title>`
  const og = [
    `<meta property="og:title" content="${escapeHtml(meta.ogTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.ogDescription)}" />`,
  ].join('\n    ')
  const titled = /<title>[\s\S]*?<\/title>/.test(html)
    ? html.replace(/<title>[\s\S]*?<\/title>/, () => title)
    : html.replace('</head>', () => `${title}\n  </head>`)
  return titled.replace('</head>', () => `  ${og}\n  </head>`)
}
