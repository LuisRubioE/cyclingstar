import { type Database, type Horizon, getStageResults, stageGateOf } from '@cyclingstar/db'
import { SEASON_CALENDAR } from '@cyclingstar/engine'
import {
  type PreStageInfo,
  STAGE_KIND_WORDS,
  pageTitle,
  stageQuerySchema,
  stageReadyNotice,
} from '@cyclingstar/shared'
import { z } from 'zod'
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
 * no tiene puerta para el horizonte de quien pide (`stageGateOf`): ni velada ni con una anterior velada.
 * `horizonOf` se llama solo para el acta: las demás páginas (y lo que no es una página de carrera) no
 * resuelven la sesión de quien pide ni le calculan el horizonte.
 */
export async function shellMetaFor(
  db: Database,
  horizonOf: () => Promise<Horizon>,
  url: URL,
): Promise<ShellMeta | null> {
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
  // El mismo horizonte decide la puerta y lee el resultado (8a: toda lectora lo recibe, §10.6).
  const h = await horizonOf()
  if (stageGateOf(h, `${race.id}:s${p.season}`, day) !== null)
    return { title, ogTitle: title, ogDescription: neutral }
  const winner = (await getStageResults(db, h, `${race.id}:s${p.season}`, day)).find(
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

// --------------------------------------- lo que la página de etapa precarga (10b, los arreglos; §18.5)

/**
 * EL MANIFIESTO DE VITE (`apps/web/dist/.vite/manifest.json`, `build.manifest`): por cada fuente o trozo,
 * su fichero y sus importaciones estáticas, por clave. Se valida al leerlo (Zod en los bordes); lo demás
 * que trae (`css`, `dynamicImports`, `isEntry`…) no se usa.
 */
export const viteManifestSchema = z.record(
  z.string(),
  z.object({ file: z.string(), imports: z.array(z.string()).optional() }),
)
export type ViteManifest = z.infer<typeof viteManifestSchema>

/** La página de etapa en el manifiesto: la fuente de su ruta en `App.tsx`. */
export const STAGE_PAGE_SRC = 'src/pages/StageReplay.tsx'

/** Los ficheros de una clave y de todo lo que importa estáticamente, en orden de anchura, con su `/`. */
function closureOf(manifest: ViteManifest, key: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const todo = [key]
  while (todo.length > 0) {
    const k = todo.shift()!
    const chunk = manifest[k]
    if (seen.has(k) || chunk === undefined) continue
    seen.add(k)
    out.push(`/${chunk.file}`)
    todo.push(...(chunk.imports ?? []))
  }
  return out
}

/**
 * LOS FICHEROS DE LA PÁGINA DE ETAPA: el cierre de `src/pages/StageReplay.tsx` por sus importaciones
 * estáticas, sin lo que ya carga el índice (sus `modulepreload` vienen en `index.html`), con la página
 * primero. Vacío si la página no está en el manifiesto.
 */
export function stagePageModules(manifest: ViteManifest): string[] {
  const main = new Set(closureOf(manifest, 'index.html'))
  return closureOf(manifest, STAGE_PAGE_SRC).filter((f) => !main.has(f))
}

/** Lo que el HTML de la página precarga: peticiones de la API (`fetch`) y ficheros JS (módulos). */
export interface ShellPreloads {
  readonly fetches: readonly string[]
  readonly modules: readonly string[]
}

const NO_PRELOADS: ShellPreloads = { fetches: [], modules: [] }

/**
 * LO QUE LA PÁGINA DE ETAPA PRECARGA CON EL HTML (E2, paso 10b, los arreglos; §18.5, D-56). En una carga en
 * frío la página de etapa era una cadena: la web, los ficheros de la página, `/health`, el horizonte, la
 * ficha y la cabecera, cada uno tras el anterior, unos 175 ms por viaje con la red de un teléfono. El
 * fallback ya sabe que es una etapa, así que pone en su HTML lo que la página va a pedir de todos modos,
 * para que salga con él: sus ficheros JS (`modules`, de `stagePageModules`) y, si no es el modo diagnóstico
 * (la web lo pide con `?diag=1`), las tres peticiones de la primera pintura con las URL exactas que pide la
 * web (`fetchHorizon`, `fetchCalendarStage` y `fetchBroadcastHead`): el horizonte si el velo vale para
 * quien pide, y la ficha y la cabecera. Solo con `Watch` encendido para quien pide (`watch`, que es
 * `request.broadcastOn()`): con `off`, o con `admins` para quien no es administrador, el HTML de siempre.
 * Fuera de la página de una etapa (la ficha de carrera, el acta) no se pregunta nada por quien pide.
 */
export async function stagePagePreloads(
  url: URL,
  on: { readonly watch: () => Promise<boolean>; readonly veil: () => Promise<boolean> },
  modules: readonly string[],
): Promise<ShellPreloads> {
  const m = SHELL_PATH.exec(url.pathname)
  if (m === null || m[2] === undefined || m[3] !== undefined) return NO_PRELOADS
  if (!(await on.watch())) return NO_PRELOADS
  if (url.searchParams.get('diag') === '1') return { fetches: [], modules }
  const stage = `/api/races/${m[1]!}/stages/${Number(m[2])}`
  return {
    fetches: [...((await on.veil()) ? ['/api/me/horizon'] : []), stage, `${stage}/broadcast`],
    modules,
  }
}

/**
 * Las precargas delante de `</head>`: las peticiones como `fetch` con `crossorigin` anónimo, que es como
 * casa con el `fetch` de la web (same-origin; con otro modo de credenciales el navegador no la usa y la
 * pide dos veces), y los ficheros como `modulepreload`, como los de `index.html`. Las peticiones primero:
 * así llegan antes de que la página las pida. Sin nada, el HTML tal cual.
 */
export function injectShellPreloads(html: string, p: ShellPreloads): string {
  const links = [
    ...p.fetches.map(
      (href) =>
        `<link rel="preload" href="${escapeHtml(href)}" as="fetch" crossorigin="anonymous" />`,
    ),
    ...p.modules.map(
      (href) => `<link rel="modulepreload" crossorigin href="${escapeHtml(href)}" />`,
    ),
  ]
  if (links.length === 0) return html
  return html.replace('</head>', () => `  ${links.join('\n    ')}\n  </head>`)
}
