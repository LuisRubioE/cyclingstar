#!/usr/bin/env node
// scripts/galeria-recorridos.mjs (pasos 5 y 6; `pnpm --filter @cyclingstar/engine build` antes de correrlo)
/**
 * LA GALERÍA DE RECORRIDOS (docs/generador.md sección 16): que el dueño vea antes de aceptar.
 *
 * La tabla geográfica (`ZONAS`, `TERRITORIOS`, `RACE_REGION`) es juicio y no dato, y no hay fuente
 * externa con la que validarla. Este script dibuja lo que el generador hace con ella y deja al dueño
 * marcar, perfil a perfil, lo que no existe; lo que marque se corrige editando DATOS (§16.6), nunca
 * código. No es un banco: no tiene bandas, no entra en vitest ni en CI.
 *
 *   pnpm --filter @cyclingstar/engine build
 *   node scripts/galeria-recorridos.mjs              # genera docs/galeria-recorridos/ (§16.3)
 *   node scripts/galeria-recorridos.mjs --medir      # lo mismo, e imprime ms y KB por página
 *   node scripts/galeria-recorridos.mjs --comprobar  # lo mismo, y las comprobaciones de §16.7 (salida 1 si falla alguna)
 *   node scripts/galeria-recorridos.mjs --fusionar   # funde revision-*.json en docs/galeria-revision.json (§16.6)
 *   node scripts/galeria-recorridos.mjs --sellar     # genera y reescribe docs/galeria-sello-paso6.json (comprobación 3)
 *
 * Tanda del paso 5 (§16.7): `index.html`, una página por zona (`zona-*.html`), `nacionales.html` y
 * `adoquin.html`. Tanda del paso 6: `calendario.html`, `continentales.html`, `vueltas.html` y la
 * columna «Ediciones» (temporadas 1 y 2), que leen `raceForSeason` / `stagesForSeason`, la ruta nueva
 * del calendario, que desde el paso 8 es la que el juego corre (`SEASON_CALENDAR`); «hoy» es el calendario
 * de la v86, `legacyCalendar()` de `sim/legacy/`, que vive hasta el paso 9; `adoquin.html` lee
 * también de ella. `--congelar-antes` es del paso 9. Lee el `dist` por ruta profunda, como
 * `inventario-recorridos.mjs`, y nunca de
 * `dist/index.js`, que no lista la gramática. Determinista: sin `Math.random` y sin reloj en lo
 * dibujado (la fecha de las páginas es la del último commit), así que un `diff` entre dos
 * generaciones solo enseña las filas que cambiaron.
 */
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { COUNTRIES } from '../packages/shared/dist/countries.js'
import { ARCH } from '../packages/engine/dist/constants.js'
import { renderAltimetrySvg } from '../packages/engine/dist/routes/altimetry.js'
import {
  RACE_ROWS,
  SEASON_CALENDAR,
  calendarForSeason,
  stagesForSeason,
} from '../packages/engine/dist/routes/calendar.js'
import { RACE_EDITIONS } from '../packages/engine/dist/routes/editions.js'
import { legacyCalendar } from '../packages/engine/dist/sim/legacy/profileGenLegacy.js'
import { profileKm } from '../packages/engine/dist/routes/finalKind.js'
import { huellaFNV, routeRng } from '../packages/engine/dist/routes/profileGen.js'
import { RACE_ROUTES } from '../packages/engine/dist/routes/raceRoutes.js'
import { STAGE_FEATURES } from '../packages/engine/dist/routes/stageFeatures.js'
import { RACE_CLASSES } from '../packages/engine/dist/routes/uci.js'
import {
  BASE_SEASON,
  diffMotivos,
  opcionDe,
} from '../packages/engine/dist/routes/grammar/edition.js'
import { generateStage } from '../packages/engine/dist/routes/grammar/generate.js'
import { ZONAS, admite, territorioDe, zonaDe } from '../packages/engine/dist/routes/grammar/geo.js'
import {
  COBBLES_IDS,
  RACE_REGION,
  regionOf,
} from '../packages/engine/dist/routes/grammar/regions.js'
import { SKELETONS } from '../packages/engine/dist/routes/grammar/skeletons.js'
import { itinerarioDe, kmDe } from '../packages/engine/dist/routes/grammar/tour.js'
import { deriveFinishTerrain, finishType } from '../packages/engine/dist/stage/finish.js'
import { sampleProfile, stageLengthKm } from '../packages/engine/dist/stage/sample.js'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')

const GALERIA = {
  salida: 'docs/galeria-recorridos', // no versionado: entra en .gitignore (§16.3)
  revision: 'docs/galeria-revision.json', // lo único versionado: las respuestas del dueño fusionadas (§16.6)
  semillasPorCelda: 5, // decisión 41: 5 perfiles por (zona × esqueleto compatible)
  sello: 'docs/galeria-sello-paso6.json', // versionado: la columna «nuevo» de las páginas de carreras al cerrar el paso 6 (§16.7, comprobación 3)
  svg: { width: 720, height: 200 }, // los valores por defecto de renderAltimetrySvg, explícitos
  miniatura: { width: 360, height: 100 }, // vueltas.html y la columna «Ediciones»
  grupoMeta: 50, // groupSize del finishType del censo (§B.2 RouteStats.finishType)
  season: 0, // BASE_SEASON: la temporada canónica
  ediciones: [1, 2], // columna «Ediciones» (desde el paso 6): las dos temporadas siguientes
  primeraPasada: {
    zonas: [
      'flandes',
      'francia_norte',
      'ardenas',
      'italia_norte',
      'italia_centro',
      'alpes',
      'pirineos',
      'cantabrico',
      'meseta',
      'levante',
      'generico',
    ], // §16.5
    maxPerfiles: 600, // cota de lo que se pide al dueño en su primera pasada (§16.5)
  },
}

const MODO = {
  medir: process.argv.includes('--medir'),
  comprobar: process.argv.includes('--comprobar'),
  fusionar: process.argv.includes('--fusionar'),
  congelar: process.argv.includes('--congelar-antes'),
  sellar: process.argv.includes('--sellar'),
}

/** «Hoy»: el calendario de la v86, el que el juego corría antes del paso 8 (`sim/legacy/`, hasta el paso 9). */
const HOY = legacyCalendar()

// ---------------------------------------------------------------------------------------------------
// La petición de cada fila (§16.2).
// ---------------------------------------------------------------------------------------------------

/** Papel de la petición: `un_dia` en `ud_*` y `nc_*`; en `et_*`, el primero de la columna «Papel» (§5.3). */
const PAPEL = {
  et_llana: 'llana',
  et_llana_viento: 'llana_viento',
  et_media_valle: 'media',
  et_media_tendida: 'media',
  et_media_alto: 'media_alto',
  et_media_muro: 'media_muro',
  et_reina_alto_largo: 'reina_alto',
  et_reina_alto_corto: 'reina_alto',
  et_reina_valle: 'reina_valle',
  et_reina_cima_cerca: 'reina_valle',
  et_reina_encadenada: 'reina_encadenada',
  et_montana_corta: 'montana_corta',
  et_reina_blanda: 'reina_alto',
  et_crono: 'cri',
  et_prologo: 'prologo',
  et_cronoescalada: 'cronoescalada',
}
const esEtapa = (sk) => sk.id.startsWith('et_')
const papelDe = (sk) => (esEtapa(sk) ? PAPEL[sk.id] : 'un_dia')
/** `nc_crono` pide `cri` para leer la columna `crono` de `ARCH.km.porClase.NC` (§16.2). */
const rolKmDe = (sk) => (sk.id === 'nc_crono' ? 'cri' : papelDe(sk))
const etapasDe = (sk) => (esEtapa(sk) ? 5 : 1)
const terrenoDe = (sk) =>
  sk.label === 'Cobbles'
    ? 'cobbles'
    : { llana: 'flat', media: 'hilly', clasica: 'classic', reina: 'mountain', cri: 'itt' }[sk.kind]
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x))
/** Regla 3 de §5.7 en un día (el sorteo de la clase recortado al esqueleto); en etapa, `kmDe` tal cual. */
function kmDeFila(sk, clase, raceId) {
  const rand = routeRng(`${raceId}|km`)
  if (esEtapa(sk)) return kmDe(papelDe(sk), clase, etapasDe(sk), false, rand)
  const km = kmDe(rolKmDe(sk), clase, 1, false, rand)
  return clamp(km, sk.km[0], Math.min(sk.km[1], ARCH.km.maxPorClase[clase]))
}
const finishTypeDe = (profile) =>
  finishType(deriveFinishTerrain(sampleProfile(profile)), GALERIA.grupoMeta)

/**
 * El `DiffInput` de una etapa (§10.8): km, motivos y el nombre de la opción de nivel 2 con que se tiró
 * (la de `BASE_SEASON` en una etapa `edicion`, cuyo plan no lleva la temporada, §10.4).
 */
function vistaDe(stage, raceId, season) {
  const a = stage.arch
  const sk = SKELETONS[a.skeleton]
  const op = opcionDe(sk, raceId, stage.routeSource === 'edicion' ? BASE_SEASON : season)
  const nombre = op > 0 ? sk.alternativas?.[op - 1]?.nombre : undefined
  return {
    km: profileKm(stage.profile),
    motivos: a.motivos,
    ...(nombre !== undefined ? { opcion: nombre } : {}),
  }
}

/** La columna «Ediciones» (§16.4): cada temporada de `GALERIA.ediciones` con su miniatura y sus cambios respecto de la anterior. */
function edicionesDe(raceId, base, deTemporada, titulo) {
  let prev = base
  return GALERIA.ediciones.map((s) => {
    const stage = deTemporada(s)
    const cambios = diffMotivos(vistaDe(prev, raceId, s - 1), vistaDe(stage, raceId, s))
    prev = stage
    return {
      season: s,
      stage,
      cambios,
      svg: renderAltimetrySvg(stage.profile, {
        ...GALERIA.miniatura,
        title: `${titulo} · edición ${s + 1}`,
      }),
    }
  })
}

/** Una fila dibujada: la etapa, su `finishType` y su SVG; con `conEdiciones`, las temporadas 1 y 2 de la misma petición. */
function fila(base, req, titulo, conEdiciones = false) {
  const stage = generateStage(req)
  return {
    ...base,
    km: req.km,
    stage,
    finishType: finishTypeDe(stage.profile),
    svg: renderAltimetrySvg(stage.profile, { ...GALERIA.svg, title: titulo }),
    ...(conEdiciones
      ? {
          ediciones: edicionesDe(
            req.raceId,
            stage,
            (s) => generateStage({ ...req, season: s }),
            titulo,
          ),
        }
      : {}),
  }
}

/** Una fila de una página de carreras: la etapa `i` de `stagesForSeason(raceId, 0)`, la de hoy y sus ediciones. */
function filaCarrera(race, i, titulo) {
  const stage = stagesForSeason(race.id, GALERIA.season)[i]
  const hoy = HOY.find((r) => r.id === race.id).stages[i]
  return {
    raceId: race.id,
    zona: stage.arch.geo,
    esqueleto: stage.arch.skeleton,
    clase: race.raceClass,
    km: Math.round(profileKm(stage.profile) * 10) / 10,
    stage,
    hoy,
    finishType: finishTypeDe(stage.profile),
    svg: renderAltimetrySvg(stage.profile, { ...GALERIA.svg, title: `nuevo · ${titulo}` }),
    svgHoy: renderAltimetrySvg(hoy.profile, { ...GALERIA.svg, title: `hoy · ${titulo}` }),
    ediciones: edicionesDe(race.id, stage, (s) => stagesForSeason(race.id, s)[i], titulo),
  }
}

// ---------------------------------------------------------------------------------------------------
// HTML común: estilo, fila de datos y casillas con localStorage (§16.4 y §16.5).
// ---------------------------------------------------------------------------------------------------

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  )
const num = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('es-ES')
const p95 = (xs) => [...xs].sort((a, b) => a - b)[Math.ceil(xs.length * 0.95) - 1] ?? 0

/** Commit de la generación: determinista para un árbol dado, a diferencia del reloj. */
function fechaDelArbol() {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cI'], {
      cwd: RAIZ,
      encoding: 'utf8',
    }).trim()
  } catch {
    return 'desconocida'
  }
}
const GENERADA_EN = fechaDelArbol()

const VIENTO = [
  'sin llano abierto',
  'algo de llano abierto',
  'llano abierto',
  'mucho llano abierto',
]
const VEREDICTOS = [
  ['no_existe_aqui', 'no existe aquí'],
  ['no_existe_en_clase', 'no existe en esta clase'],
  ['no_lo_reconozco', 'no lo reconozco'],
]
/** La cuarta pregunta, solo donde hay columna «Ediciones» (§16.5). */
const VEREDICTO_EDICION = ['no_es_la_misma_carrera', 'no es la misma carrera']
/** Las tres preguntas de una vuelta entera en `vueltas.html` (§16.5); la última pide nota. */
const VEREDICTOS_VUELTA = [
  ['itinerario_no_existe', 'el itinerario no existe'],
  ['montana_mal_puesta', 'la montaña está mal puesta'],
  ['general_no_se_decide_asi', 'la general no se decide así'],
]

const CSS = `
:root { --fondo: #fafaf8; --texto: #1d1d1b; --suave: #6b6b66; --borde: #d9d8d2; --marca: #b3261e; --fila: #ffffff; }
@media (prefers-color-scheme: dark) { :root { --fondo: #161615; --texto: #ecebe6; --suave: #a3a29c; --borde: #3a3936; --marca: #f2b8b5; --fila: #1f1f1d; } }
* { box-sizing: border-box; }
body { margin: 0; padding: 16px; background: var(--fondo); color: var(--texto); font: 14px/1.45 system-ui, sans-serif; }
h1 { font-size: 22px; margin: 0 0 8px; } h2 { font-size: 17px; margin: 28px 0 8px; } h3 { font-size: 15px; margin: 20px 0 6px; }
a { color: inherit; } .suave { color: var(--suave); } .marca { color: var(--marca); font-weight: 600; }
table { border-collapse: collapse; width: 100%; } td, th { border-bottom: 1px solid var(--borde); padding: 6px 8px; vertical-align: top; text-align: left; }
.desliza { overflow-x: auto; } .fila { background: var(--fila); }
.svg svg { width: 100%; max-width: 720px; height: auto; display: block; }
.datos { font-size: 13px; min-width: 240px; } .datos div { margin: 1px 0; }
.revision { min-width: 190px; font-size: 13px; } .revision label { display: block; } .revision textarea { width: 100%; min-height: 38px; }
pre { white-space: pre-wrap; font-size: 12px; background: var(--fila); border: 1px solid var(--borde); padding: 8px; }
.barra { position: sticky; top: 0; background: var(--fondo); padding: 8px 0; border-bottom: 1px solid var(--borde); z-index: 1; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.lado { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px; }
.ediciones { min-width: 240px; font-size: 12px; } .ediciones ul { margin: 2px 0 8px; padding-left: 16px; }
.mini svg { max-width: 360px; } details { margin: 6px 0 14px; } summary { cursor: pointer; }
`

/** El guion de las casillas: `localStorage` envuelto en `try` y el botón «Descargar revisión». */
const JS = (pagina) => `
(() => {
  const clave = 'galeria|${pagina}';
  let estado = {};
  try { estado = JSON.parse(localStorage.getItem(clave) || '{}') || {}; } catch { estado = {}; }
  const guarda = () => { try { localStorage.setItem(clave, JSON.stringify(estado)); } catch {} };
  for (const tr of document.querySelectorAll('tr[data-fila]')) {
    const id = tr.dataset.fila;
    const e = estado[id] || { veredictos: [], nota: '' };
    for (const c of tr.querySelectorAll('input[type=checkbox]')) {
      c.checked = e.veredictos.includes(c.value);
      c.addEventListener('change', () => {
        const act = estado[id] || { veredictos: [], nota: '' };
        act.veredictos = [...tr.querySelectorAll('input[type=checkbox]:checked')].map((x) => x.value);
        estado[id] = act; guarda();
      });
    }
    const t = tr.querySelector('textarea');
    if (t) { t.value = e.nota || ''; t.addEventListener('input', () => { const act = estado[id] || { veredictos: [], nota: '' }; act.nota = t.value; estado[id] = act; guarda(); }); }
  }
  document.getElementById('descargar').addEventListener('click', () => {
    const pasada = Number(document.getElementById('pasada').value);
    const filas = [];
    const faltan = [];
    for (const tr of document.querySelectorAll('tr[data-fila]')) {
      const e = estado[tr.dataset.fila];
      if (!e) continue;
      for (const v of e.veredictos) {
        if ((v === 'no_lo_reconozco' || v === 'general_no_se_decide_asi') && !(e.nota || '').trim()) faltan.push(tr.dataset.fila);
        const d = tr.dataset;
        filas.push({ raceId: d.race, stageIndex: d.etapa ? Number(d.etapa) : null, zona: d.zona, esqueleto: d.esqueleto || null,
          clase: d.clase, km: d.km ? Number(d.km) : null, veredicto: v, ...(e.nota ? { nota: e.nota } : {}) });
      }
    }
    if (faltan.length) { alert('«no lo reconozco» y «la general no se decide así» piden una nota de una línea: ' + faltan.join(', ')); return; }
    const rev = { pagina: '${pagina}', generadaEn: document.body.dataset.generada, pasada, filas };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(rev, null, 2)], { type: 'application/json' }));
    a.download = 'revision-${pagina}.json';
    a.click();
  });
})();
`

function pagina(nombre, titulo, cuerpo, conRevision = true) {
  const barra = conRevision
    ? `<div class="barra"><a href="index.html">← índice</a>
<label>Pasada <select id="pasada"><option value="1">1 (obligatoria)</option><option value="2">2 (por muestreo)</option></select></label>
<button id="descargar" type="button">Descargar revisión</button>
<span class="suave">Un perfil sin casilla marcada es aceptado. Se guarda en este navegador al marcar.</span></div>`
    : ''
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title><style>${CSS}</style></head>
<body data-generada="${esc(GENERADA_EN)}">${barra}
<h1>${esc(titulo)}</h1>
${cuerpo}
${conRevision ? `<script>${JS(nombre)}</script>` : ''}
</body></html>
`
}

/** Las columnas de §16.4 de una fila (sin «Hoy» ni «Ediciones», que llegan con las páginas de carreras). */
function datosDe(f) {
  const a = f.stage.arch
  const rech = a.rechazos.map((r) => `${r.id}: ${r.detalle}`)
  return `<div><b>${esc(a.frase)}</b></div>
<div>${esc(f.stage.kind)} / ${esc(f.stage.label)}${a.finalKind ? ` · final ${esc(a.finalKind)}` : ''} · D+ ${num(a.dPlus, 0)} m</div>
<div>${num(f.km)} km · clase ${esc(f.clase)} · ${esc(a.skeleton)} · ${esc(a.geo)}</div>
<div>finishType ${esc(f.finishType)} · ${esc(VIENTO[a.metadatos.viento])} · altitud ${esc(a.metadatos.altitud)}</div>
<div class="${a.degradado || a.intentos > ARCH.veto.intentosP95 ? 'marca' : 'suave'}">intentos ${a.intentos}${a.degradado ? ' · DEGRADADO (canónica)' : ''}${rech.length ? ` · rechazos: ${esc(rech.join(' | '))}` : ''}</div>`
}
function casillas(conEdiciones = false, lista = VEREDICTOS) {
  const vs = conEdiciones ? [...lista, VEREDICTO_EDICION] : lista
  return `${vs.map(([v, t]) => `<label><input type="checkbox" value="${v}"> ${t}</label>`).join('')}
<textarea placeholder="nota (obligatoria con «no lo reconozco» y «la general no se decide así»)"></textarea>`
}
/** La columna «Ediciones»: miniatura de cada temporada y `cambiosRespectoAnterior` debajo (§16.4). */
function edicionesHtml(eds) {
  return eds
    .map(
      (e) =>
        `<div><div class="suave">Edición ${e.season + 1} · ${num(profileKm(e.stage.profile))} km${e.stage.arch.degradado ? ' · <span class="marca">DEGRADADO</span>' : ''}</div><div class="svg mini">${e.svg}</div><div>${
          e.cambios.length
            ? `<ul>${e.cambios.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>`
            : '<span class="suave">sin cambios que anunciar</span>'
        }</div></div>`,
    )
    .join('')
}
function filaHtml(f, idFila, stageIndex = 1) {
  const hoy = f.svgHoy
    ? `<td class="svg"><div class="suave">Hoy · ${esc(f.hoy.kind)} / ${esc(f.hoy.label)}</div>${f.svgHoy}</td>`
    : ''
  const eds = f.ediciones ? `<td class="ediciones">${edicionesHtml(f.ediciones)}</td>` : ''
  return `<tr class="fila" data-fila="${esc(idFila)}" data-race="${esc(f.raceId)}" data-etapa="${stageIndex}" data-zona="${esc(f.zona)}" data-esqueleto="${esc(f.esqueleto ?? '')}" data-clase="${esc(f.clase)}" data-km="${f.km}">
${hoy}<td class="svg">${f.svgHoy ? '<div class="suave">Nuevo</div>' : ''}${f.svg}</td><td class="datos">${datosDe(f)}</td>${eds}<td class="revision">${casillas(Boolean(f.ediciones))}</td></tr>`
}

// ---------------------------------------------------------------------------------------------------
// Las celdas zona × esqueleto (§16.2) y sus páginas.
// ---------------------------------------------------------------------------------------------------

const ZONAS_IDS = Object.keys(ZONAS)
const PESO_CERO = Object.values(SKELETONS).filter((sk) =>
  RACE_CLASSES.every((c) => ARCH.pesoPorClase[sk.id][c] === 0),
)

function celdasDe(zona) {
  const geo = ZONAS[zona]
  const out = []
  for (const sk of Object.values(SKELETONS)) {
    if (!admite(sk.requiere, geo) || geo.pesos?.[sk.id] === 0) continue
    const clases = RACE_CLASSES.filter((c) => ARCH.pesoPorClase[sk.id][c] > 0)
    if (clases.length === 0) continue // peso 0 en todas: una línea en el índice, sin celda
    const filas = []
    for (let i = 0; i < GALERIA.semillasPorCelda; i++) {
      const clase = clases[i % clases.length]
      const raceId = `gal|${zona}|${sk.id}|${i}`
      const km = kmDeFila(sk, clase, raceId)
      const req = {
        raceId,
        stageIndex: 1,
        season: GALERIA.season,
        km,
        role: papelDe(sk),
        terrain: terrenoDe(sk),
        geo,
        raceClass: clase,
        format: esEtapa(sk) ? 'una-semana' : 'un-dia',
        routeSource: 'generado',
        fixed: { skeleton: sk.id },
      }
      filas.push(
        fila(
          { raceId, zona, esqueleto: sk.id, clase, i },
          req,
          `${zona} · ${sk.id} · ${clase} · ${num(km)} km`,
          i === 0, // la columna «Ediciones» va en la fila 0 de cada celda (§16.4)
        ),
      )
    }
    out.push({ zona, esqueleto: sk.id, clases, filas })
  }
  return out
}

function paginaDeZona(zona, celdas, paisesFallback) {
  const geo = ZONAS[zona]
  const cabecera = `<p class="suave">${
    zona === 'generico'
      ? `Zona de los países sin territorio (${paisesFallback.length}): ${esc(paisesFallback.map((c) => c.code).join(', '))}. `
      : ''
  }Cinco perfiles por esqueleto compatible (${celdas.length} esqueletos), temporada ${GALERIA.season}, km de <code>kmDe</code> por clase. Tres preguntas por perfil, en orden: ¿existe en ese sitio?, ¿existe en esa clase?, ¿la reconocería un aficionado? La fila 0 de cada celda lleva además la columna «Ediciones» (temporadas 1 y 2, con los cambios que anunciaría la ficha) y una cuarta: ¿es la misma carrera otro año?</p>
<pre>${esc(JSON.stringify(geo, null, 1))}</pre>`
  const tablas = celdas
    .map(
      (
        c,
      ) => `<h2 id="${esc(c.esqueleto)}">${esc(c.esqueleto)} <span class="suave">(${esc(SKELETONS[c.esqueleto].kind)} / ${esc(SKELETONS[c.esqueleto].label)}; clases ${esc(c.clases.join(', '))})</span></h2>
<div class="desliza"><table>${c.filas.map((f) => filaHtml(f, f.raceId)).join('\n')}</table></div>`,
    )
    .join('\n')
  return pagina(`zona-${zona}`, `Galería · zona ${zona}`, cabecera + tablas)
}

// ---------------------------------------------------------------------------------------------------
// Nacionales (§16.3): 133 países × 4 carreras, con la petición de `nationalChampionships` del paso 8.
// ---------------------------------------------------------------------------------------------------

const NACIONALES = [
  { sufijo: 'road', rol: 'un_dia', terrain: 'classic', sk: 'nc_ruta', nombre: 'ruta' },
  {
    sufijo: 'u23-road',
    rol: 'un_dia_u23',
    terrain: 'classic',
    sk: 'nc_ruta',
    nombre: 'ruta sub-23',
  },
  { sufijo: 'itt', rol: 'cri', terrain: 'itt', sk: 'nc_crono', nombre: 'crono' },
  { sufijo: 'u23-itt', rol: 'cri_u23', terrain: 'itt', sk: 'nc_crono', nombre: 'crono sub-23' },
]
function nacionales(carrerasPorPais) {
  const paises = [...COUNTRIES].sort(
    (a, b) =>
      (carrerasPorPais.get(b.code) ?? 0) - (carrerasPorPais.get(a.code) ?? 0) ||
      a.code.localeCompare(b.code),
  )
  const filas = []
  for (const { code } of paises) {
    const zona = zonaDe(code)
    for (const n of NACIONALES) {
      const raceId = `nc-${code.toLowerCase()}-${n.sufijo}`
      // La petición de `nationalChampionships` por la gramática (calendar.ts, paso 6): el km de `kmDe`
      // en `firma|${raceId}|km`, sin recorte. La comprobación 2 exige que salga lo mismo que en
      // `stagesForSeason(raceId, 0)`.
      const km = kmDe(n.rol, 'NC', 1, false, routeRng(`firma|${raceId}|km`))
      const req = {
        raceId,
        stageIndex: 1,
        season: GALERIA.season,
        km,
        role: 'un_dia',
        terrain: n.terrain,
        geo: ZONAS[zona],
        raceClass: 'NC',
        format: 'un-dia',
        routeSource: 'generado',
      } // sin `fixed`: la rama NC de `candidatos` elige nc_ruta o nc_crono (§5.7)
      filas.push(
        fila(
          { raceId, zona, esqueleto: null, clase: 'NC', code, nombre: n.nombre },
          req,
          `${code} · ${n.nombre} · ${zona} · ${num(km)} km`,
          true,
        ),
      )
    }
  }
  return { paises, filas }
}
function paginaNacionales({ paises, filas }, carrerasPorPais) {
  const lista = `<div class="desliza"><table><tr><th>País</th><th>Carreras de equipos</th><th>Zona</th><th></th></tr>${paises
    .map(
      (c) =>
        `<tr><td>${esc(c.flag)} ${esc(c.code)} · ${esc(c.name)}</td><td>${carrerasPorPais.get(c.code) ?? 0}</td><td>${esc(zonaDe(c.code))}</td><td class="suave">${territorioDe(c.code).fallback ? 'territorio genérico' : ''}</td></tr>`,
    )
    .join('')}</table></div>`
  const perfiles = paises
    .map(
      (c) =>
        `<h2 id="${esc(c.code)}">${esc(c.flag)} ${esc(c.name)} <span class="suave">(${esc(zonaDe(c.code))})</span></h2>
<div class="desliza"><table>${filas
          .filter((f) => f.code === c.code)
          .map((f) => filaHtml(f, f.raceId))
          .join('\n')}</table></div>`,
    )
    .join('\n')
  return pagina(
    'nacionales',
    'Galería · campeonatos nacionales',
    `<p class="suave">Los ${paises.length} países, ordenados por carreras de equipos. Cuatro perfiles por país con la petición de <code>nationalChampionships</code> por la gramática (la que el calendario usará desde el paso 8): zona <code>zonaDe(cc)</code>, clase NC, km de <code>kmDe</code> en <code>firma|id|km</code>, sin <code>fixed</code>; con sus ediciones 1 y 2.</p>
<h2>País y zona</h2>${lista}<h2>Perfiles</h2>${perfiles}`,
  )
}

// ---------------------------------------------------------------------------------------------------
// Adoquín (§16.3): las 20 filas de `COBBLES_IDS`, hoy contra nuevo.
// ---------------------------------------------------------------------------------------------------

const DE_ADOQUIN = ['ud_adoquin', 'ud_adoquin_ligero', 'ud_muros_adoquin', 'ud_sterrato']
function esReal(race) {
  const feats = STAGE_FEATURES[race.id]
  return Boolean(Array.isArray(feats) ? feats[0] : feats)
}
function adoquin() {
  return COBBLES_IDS.map((raceId) => {
    const race = SEASON_CALENDAR.find((r) => r.id === raceId)
    const hoyRace = HOY.find((r) => r.id === raceId)
    if (!race) throw new Error(`adoquin: ${raceId} no está en SEASON_CALENDAR`)
    const hoy = hoyRace.stages[0]
    const zona = regionOf(raceId, 1, race.country ?? null)
    const real = esReal(race)
    if (!real) {
      // Desde el paso 6 la columna derecha es la etapa de la ruta nueva, `stagesForSeason(raceId, 0)`.
      const nuevo = filaCarrera(race, 0, `${raceId} · ${zona}`)
      return {
        race,
        hoy,
        real,
        zona,
        duda: RACE_REGION[raceId]?.duda === true,
        svgHoy: nuevo.svgHoy,
        nuevo: { ...nuevo, svgHoy: undefined },
      }
    }
    const km = Math.round(stageLengthKm(hoy.profile) * 10) / 10
    const req = {
      raceId,
      stageIndex: 1,
      season: GALERIA.season,
      km,
      role: 'un_dia',
      terrain: 'cobbles',
      geo: ZONAS[zona],
      raceClass: race.raceClass,
      format: 'un-dia',
      routeSource: 'generado',
    } // una carrera con perfil real: lo que haría el generador si no tuviera dato (§16.3), sin `fixed`
    const nuevo = fila(
      { raceId, zona, esqueleto: null, clase: race.raceClass },
      req,
      `nuevo · ${raceId} · ${zona} · ${num(km)} km`,
    )
    return {
      race,
      hoy,
      real,
      zona,
      duda: RACE_REGION[raceId]?.duda === true,
      svgHoy: renderAltimetrySvg(hoy.profile, {
        ...GALERIA.svg,
        title: `hoy · ${raceId} · ${hoy.label}`,
      }),
      nuevo,
    }
  })
}
function paginaAdoquin(filas) {
  const cuerpo = filas
    .map(
      (
        a,
      ) => `<h2 id="${esc(a.race.id)}">${esc(a.race.name)} <span class="suave">(${esc(a.race.id)} · ${esc(a.race.raceClass)} · ${esc(a.race.country ?? '?')} · zona ${esc(a.zona)}${a.duda ? ' · duda' : ''})</span></h2>
<div class="lado"><div><div class="suave">Hoy: ${a.real ? 'perfil REAL de STAGE_FEATURES' : 'el generado de hoy (referencia de forma, no de la carretera)'} · ${esc(a.hoy.kind)} / ${esc(a.hoy.label)}</div><div class="svg">${a.svgHoy}</div></div>
<div><div class="suave">Nuevo${a.real ? ' (lo que haría si no tuviera dato)' : ''}</div><table>${filaHtml(a.nuevo, a.race.id)}</table></div></div>`,
    )
    .join('\n')
  return pagina(
    'adoquin',
    'Galería · adoquín',
    `<p class="suave">Las ${filas.length} carreras con <code>terrain: 'cobbles'</code>. A la izquierda, lo que el calendario les da hoy; a la derecha, la etapa del calendario nuevo (<code>stagesForSeason(raceId, 0)</code>, con sus ediciones 1 y 2) o, en las que tienen perfil real, lo que el generador haría con la fila si no tuviera dato.</p>${cuerpo}`,
  )
}

// ---------------------------------------------------------------------------------------------------
// Las páginas de carreras (§16.3, cierre del paso 6): calendario, continentales y vueltas. Leen la
// ruta nueva (`calendarForSeason(0)` y `stagesForSeason(raceId, s)`) y enseñan al lado lo de hoy
// (`SEASON_CALENDAR`). Las etapas `real` no se dibujan: no cambian.
// ---------------------------------------------------------------------------------------------------

const CAL0 = calendarForSeason(GALERIA.season)
const EQUIPOS = CAL0.filter((r) => r.raceClass !== 'NC')
const FILA_DE = new Map(RACE_ROWS.map((r) => [r.id, r]))
const esVuelta = (r) => r.format !== 'un-dia' && r.stages.length > 1
const generadaDeUnDia = (r) => !esVuelta(r) && r.stages[0].routeSource !== 'real'

/** La ciudad que justifica la zona: la meta de la etapa única, o salida y meta de la vuelta (`RACE_ROUTES`). */
function ciudadDe(race) {
  const ruta = RACE_ROUTES[race.id]
  if (!ruta || ruta.length === 0) return '?'
  return ruta.length === 1 ? ruta[0][1] : `${ruta[0][0]} → ${ruta.at(-1)[1]}`
}

/** La lista de las 310 carreras de equipos con su zona (se lee como tabla, no como perfil). */
function listaDeZonas() {
  const filas = EQUIPOS.map((r) => {
    const reg = RACE_REGION[r.id]
    const etapas = reg?.stages
      ? Object.entries(reg.stages)
          .map(([k, z]) => `e${k} ${z}`)
          .join(', ')
      : ''
    return `<tr><td>${esc(r.id)}</td><td>${esc(r.name)}</td><td>${esc(r.raceClass)}</td><td>${esc(r.format)} · ${r.stages.length}</td><td>${esc(r.country ?? '?')}</td><td>${esc(reg?.default ?? zonaDe(r.country ?? null))}${etapas ? `<div class="suave">${esc(etapas)}</div>` : ''}</td><td>${esc(ciudadDe(r))}</td><td>${reg?.duda ? '<span class="marca">duda</span>' : ''}</td><td>${esc(reg?.skeleton ?? '')}</td><td>${esc(r.routeSource ?? '')}</td></tr>`
  })
  return `<div class="desliza"><table><tr><th>raceId</th><th>Nombre</th><th>Clase</th><th>Formato · etapas</th><th>País</th><th>Zona (RACE_REGION)</th><th>Ciudad</th><th></th><th>Atada</th><th>Origen</th></tr>${filas.join('\n')}</table></div>`
}

/** Las carreras de un día generadas de las clases dadas, con cuatro altimetrías por fila: hoy, nuevo y ediciones 1 y 2. */
function unDiaDe(clases) {
  return EQUIPOS.filter((r) => clases.includes(r.raceClass) && generadaDeUnDia(r)).map((r) =>
    filaCarrera(r, 0, `${r.id} · ${r.raceClass} · ${r.country ?? '?'}`),
  )
}
function tablaUnDia(filas) {
  return filas
    .map(
      (f) =>
        `<h3 id="${esc(f.raceId)}">${esc(f.raceId)} <span class="suave">(${esc(f.clase)} · zona ${esc(f.zona)}${RACE_REGION[f.raceId]?.duda ? ' · duda' : ''})</span></h3>
<div class="desliza"><table>${filaHtml(f, f.raceId)}</table></div>`,
    )
    .join('\n')
}

function paginaCalendario(filas) {
  const reales = EQUIPOS.filter((r) => !esVuelta(r) && !generadaDeUnDia(r))
  return pagina(
    'calendario',
    'Galería · calendario',
    `<p class="suave">Las ${EQUIPOS.length} carreras de equipos de <code>calendarForSeason(0)</code> con su zona, y los perfiles de las ${filas.length} carreras de un día WT y Pro generadas: hoy (el calendario de la v86, <code>legacyCalendar()</code>), nuevo (<code>stagesForSeason(raceId, 0)</code>) y las ediciones 1 y 2 con los cambios que anunciaría la ficha. Las vueltas están en <a href="vueltas.html">vueltas.html</a>; las ${reales.length} carreras de un día con perfil real no se dibujan (no cambian). Cuatro preguntas por perfil: ¿existe en ese sitio?, ¿existe en esa clase?, ¿la reconocería un aficionado?, ¿es la misma carrera otro año?</p>
<h2>Carreras y zonas</h2>${listaDeZonas()}
<h2>Un día WT y Pro</h2>${tablaUnDia(filas)}`,
  )
}

function paginaContinentales(filas) {
  const orden = [
    ...filas.filter((f) => f.raceId === 'race-zwolle'),
    ...filas.filter((f) => f.raceId !== 'race-zwolle'),
  ]
  return pagina(
    'continentales',
    'Galería · continentales',
    `<p class="suave">Las ${filas.length} carreras de un día .1 y .2 generadas, las de la queja del dueño («los perfiles de las carreras continentales»). Abre con <code>race-zwolle</code> (.2, NL); la .2 colombiana por etapas está a la cabeza de <a href="vueltas.html#race-colombia-tour">vueltas.html</a>.</p>${tablaUnDia(orden)}`,
  )
}

/** Una vuelta: una fila por etapa con su ficha y dos filas de miniaturas (hoy y nuevo), y las ediciones 1 y 2 plegadas. */
function vuelta(race) {
  const fila = FILA_DE.get(race.id)
  const it = fila
    ? itinerarioDe(
        race.id,
        race.country ?? null,
        race.stages.length,
        fila.terrain ?? 'flat',
        race.raceClass,
        'una-semana',
      )
    : null
  const compuesta = Boolean(fila) && !RACE_EDITIONS[race.id]
  const hoy = HOY.find((r) => r.id === race.id)
  const mini = (p, t) => renderAltimetrySvg(p, { ...GALERIA.miniatura, title: t })
  const etapas = race.stages.map((st, i) => {
    const h = hoy.stages[i]
    if (st.routeSource === 'real')
      return {
        st,
        real: true,
        huella: huellaFNV(st.profile),
        fila: `<tr><td>e${i + 1}</td><td colspan="6" class="suave">real (${esc(st.label)}, ${num(profileKm(st.profile))} km): no cambia</td></tr>`,
      }
    const a = st.arch
    const eds = edicionesDe(
      race.id,
      st,
      (s) => stagesForSeason(race.id, s)[i],
      `${race.id} e${i + 1}`,
    )
    return {
      st,
      real: false,
      huella: huellaFNV(st.profile),
      degradado: a.degradado || eds.some((e) => e.stage.arch.degradado),
      fila: `<tr><td>e${i + 1}</td><td>${esc(a.geo)}${it && it.desde[i] !== it.metas[i] ? `<div class="suave">desde ${esc(it.desde[i])}</div>` : ''}</td><td>${esc(a.skeleton)}</td><td>${esc(st.kind)} / ${esc(st.label)}${a.finalKind ? `<div class="suave">${esc(a.finalKind)}</div>` : ''}</td><td>${num(profileKm(st.profile))} km · D+ ${num(a.dPlus, 0)} m</td><td>${esc(a.frase)}<div class="${a.degradado || a.intentos > ARCH.veto.intentosP95 ? 'marca' : 'suave'}">intentos ${a.intentos}${a.degradado ? ' · DEGRADADO' : ''} · hoy ${esc(h.kind)} / ${esc(h.label)}</div></td><td>${eds.map((e) => `<div class="suave">ed. ${e.season + 1}: ${e.cambios.length ? esc(e.cambios.join('; ')) : 'sin cambios que anunciar'}</div>`).join('')}</td></tr>`,
      miniHoy: mini(h.profile, `hoy · e${i + 1}`),
      miniNuevo: mini(st.profile, `nuevo · e${i + 1}`),
      miniEds: eds.map((e) => e.svg),
    }
  })
  const dibujadas = etapas.filter((e) => !e.real)
  const notas = it?.notas.length
    ? `<div class="suave">Notas del itinerario: ${esc(it.notas.join(' · '))}</div>`
    : ''
  const cab = `<h2 id="${esc(race.id)}">${esc(race.name)} <span class="suave">(${esc(race.id)} · ${esc(race.raceClass)} · ${esc(race.country ?? '?')} · ${race.stages.length} etapas · ${compuesta ? 'compuesta' : 'edición real'}${fila?.terrain ? ` · terreno ${esc(fila.terrain)}` : ''})</span></h2>${notas}`
  const tabla = `<div class="desliza"><table><tr><th></th><th>Zona</th><th>Esqueleto</th><th>kind / label</th><th>km · D+</th><th>Frase</th><th>Ediciones</th></tr>${etapas.map((e) => e.fila).join('\n')}</table></div>`
  const tiras = dibujadas.length
    ? `<div class="suave">Hoy</div><div class="desliza lado mini">${dibujadas.map((e) => e.miniHoy).join('')}</div>
<div class="suave">Nuevo</div><div class="desliza lado mini">${dibujadas.map((e) => e.miniNuevo).join('')}</div>
<details><summary>Ediciones 1 y 2</summary>${GALERIA.ediciones.map((s, k) => `<div class="suave">Edición ${s + 1}</div><div class="desliza lado mini">${dibujadas.map((e) => e.miniEds[k]).join('')}</div>`).join('')}</details>`
    : ''
  const zona = RACE_REGION[race.id]?.default ?? zonaDe(race.country ?? null)
  const revision = `<table><tr class="fila" data-fila="${esc(race.id)}" data-race="${esc(race.id)}" data-etapa="" data-zona="${esc(zona)}" data-esqueleto="" data-clase="${esc(race.raceClass)}" data-km=""><td class="revision">${casillas(false, VEREDICTOS_VUELTA)}</td></tr></table>`
  return { race, compuesta, etapas, html: `${cab}${tabla}${tiras}${revision}` }
}

function vueltas() {
  const todas = EQUIPOS.filter(esVuelta)
  const cabeza = ['race-olympia', 'race-colombia-tour']
  const orden = { 2: 0, 1: 1, Pro: 2, WT: 3 }
  const compuestas = todas
    .filter((r) => !RACE_EDITIONS[r.id] && !cabeza.includes(r.id))
    .sort((a, b) => (orden[a.raceClass] ?? 9) - (orden[b.raceClass] ?? 9))
  const deEdicion = todas.filter((r) => RACE_EDITIONS[r.id] && !cabeza.includes(r.id))
  return [
    ...cabeza.map((id) => todas.find((r) => r.id === id)).filter(Boolean),
    ...compuestas,
    ...deEdicion,
  ].map(vuelta)
}
function paginaVueltas(vs) {
  const n = vs.filter((v) => v.compuesta).length
  return pagina(
    'vueltas',
    'Galería · vueltas',
    `<p class="suave">Las ${vs.length} vueltas de equipos: abre con el par de la agenda (<code>race-olympia</code>, .2 NL, y <code>race-colombia-tour</code>, .2 CO), después las ${n} compuestas por <code>composeTour</code> por clase (.2, .1, Pro, WT) y al final las ${vs.length - n} con edición real, cuyo itinerario es dato y solo se juzga el dibujo. Por vuelta, tres preguntas: ¿es un itinerario plausible por ese país?, ¿cae la montaña donde debe?, ¿se decide la general donde se decide en la realidad?</p>${vs.map((v) => v.html).join('\n')}`,
  )
}

// ---------------------------------------------------------------------------------------------------
// El índice (§16.3).
// ---------------------------------------------------------------------------------------------------

function paginaIndice(porZona, nac, ado, carreras, paisesFallback, primeraPasada) {
  const skIds = Object.keys(SKELETONS)
  const nCeldas = [...porZona.values()].reduce((a, cs) => a + cs.length, 0)
  const nPerfiles = [...porZona.values()].reduce(
    (a, cs) => a + cs.reduce((b, c) => b + c.filas.length, 0),
    0,
  )
  const cab = `<tr><th>Zona</th>${skIds.map((id) => `<th title="${esc(id)}" style="writing-mode: vertical-rl; font-weight: 400">${esc(id)}</th>`).join('')}</tr>`
  const cuerpo = ZONAS_IDS.map((z) => {
    const cs = new Map(porZona.get(z).map((c) => [c.esqueleto, c]))
    return `<tr><td><a href="zona-${esc(z)}.html">${esc(z)}</a></td>${skIds
      .map((id) => {
        const c = cs.get(id)
        if (!c) return '<td class="suave">·</td>'
        const deg = c.filas.filter((f) => f.stage.arch.degradado).length
        const p = p95(c.filas.map((f) => f.stage.arch.intentos))
        return `<td class="${deg > 0 || p > ARCH.veto.intentosP95 ? 'marca' : ''}" title="${esc(`${z} · ${id}: ${c.filas.length} filas, ${deg} degradadas, p95 de intentos ${p}`)}"><a href="zona-${esc(z)}.html#${esc(id)}">${c.filas.length}${deg ? `·${deg}d` : ''}${p > 1 ? `·p${p}` : ''}</a></td>`
      })
      .join('')}</tr>`
  }).join('\n')
  const orden = [
    ...GALERIA.primeraPasada.zonas.map((z) => [`zona-${z}.html`, `zona ${z}`]),
    ['continentales.html', 'continentales'],
    ['vueltas.html', 'vueltas'],
    ['calendario.html', 'calendario'],
    ['adoquin.html', 'adoquín'],
    ['nacionales.html', 'nacionales'],
    ...ZONAS_IDS.filter((z) => !GALERIA.primeraPasada.zonas.includes(z)).map((z) => [
      `zona-${z}.html`,
      `zona ${z}`,
    ]),
  ]
  const degTotales = [...porZona.values()]
    .flat()
    .flatMap((c) => c.filas)
    .filter((f) => f.stage.arch.degradado).length
  return pagina(
    'index',
    'Galería de recorridos',
    `<p><b>Vetos activos por etapa: V1 a V10 y V15</b> (los once que reintentan, sección 9).</p>
<p>${nCeldas} celdas zona × esqueleto y ${nPerfiles} perfiles (${degTotales} degradados), con las ediciones 1 y 2 en la fila 0 de cada celda; ${nac.filas.length} perfiles nacionales; ${ado.length} + ${ado.length} de adoquín; ${carreras.unDia} carreras de un día generadas en <a href="calendario.html">calendario</a> y <a href="continentales.html">continentales</a> y ${carreras.vueltas} vueltas (${carreras.compuestas} compuestas) en <a href="vueltas.html">vueltas</a>, con ${carreras.degradadas} etapas degradadas en las temporadas 0 a 2.
Primera pasada: ${primeraPasada} perfiles de ${GALERIA.primeraPasada.maxPerfiles} (fila 0 de cada celda en ${GALERIA.primeraPasada.zonas.length} zonas, la columna derecha de adoquín y las carreras de un día generadas del calendario), más ${carreras.compuestas} vueltas compuestas y ${carreras.lista} filas de lista (${carreras.lista - COUNTRIES.length} carreras de equipos y ${COUNTRIES.length} países).</p>
<p class="suave">Generada del árbol del ${esc(GENERADA_EN)}, temporada ${GALERIA.season} (ediciones ${GALERIA.ediciones.join(' y ')}). Las páginas de carreras leen el calendario que el juego corre desde el paso 8 (<code>calendarForSeason</code>); «hoy» es el de la v86, <code>legacyCalendar()</code>.</p>
<h2>Orden de lectura</h2><ol>${orden
      .map(([href, t, pendiente]) =>
        pendiente ? `<li class="suave">${esc(t)}</li>` : `<li><a href="${href}">${esc(t)}</a></li>`,
      )
      .join('')}</ol>
<h2>Zona × esqueleto</h2><p class="suave">Filas por celda; «·Nd» = N degradadas, «·pN» = p95 de intentos si pasa de 1. En rojo, lo que el implementador tiene que mirar.</p>
<div class="desliza"><table style="font-size: 12px">${cab}${cuerpo}</table></div>
<h2>En catálogo, peso 0</h2><ul>${PESO_CERO.map((sk) => `<li>${esc(sk.id)} (${esc(sk.kind)} / ${esc(sk.label)})</li>`).join('')}</ul>
<h2>Países con territorio genérico (${paisesFallback.length})</h2><p>${esc(paisesFallback.map((c) => `${c.code} ${c.name}`).join(', '))}</p>`,
    false,
  )
}

// ---------------------------------------------------------------------------------------------------
// --fusionar (§16.6)
// ---------------------------------------------------------------------------------------------------

function fusionar() {
  const dir = join(RAIZ, GALERIA.salida)
  const destino = join(RAIZ, GALERIA.revision)
  const previas = existsSync(destino)
    ? JSON.parse(readFileSync(destino, 'utf8'))
    : { revisiones: [] }
  const ficheros = existsSync(dir)
    ? readdirSync(dir).filter((f) => /^revision-.*\.json$/.test(f))
    : []
  if (ficheros.length === 0) {
    console.log(`[galeria] nada que fusionar en ${GALERIA.salida}/`)
    return
  }
  const fusionadaEn = new Date().toISOString()
  for (const f of ficheros) {
    const rev = JSON.parse(readFileSync(join(dir, f), 'utf8'))
    previas.revisiones.push({ ...rev, fusionadaEn })
  }
  writeFileSync(destino, `${JSON.stringify(previas, null, 2)}\n`)
  for (const f of ficheros) unlinkSync(join(dir, f))
  console.log(`[galeria] ${ficheros.length} revisiones fusionadas en ${GALERIA.revision}`)
}

// ---------------------------------------------------------------------------------------------------
// Principal
// ---------------------------------------------------------------------------------------------------

if (MODO.fusionar) {
  fusionar()
  process.exit(0)
}
if (MODO.congelar) {
  console.error(
    '[galeria] --congelar-antes es del cierre del paso 9 (§16.3), con sim/frozenSkeletons.ts.',
  )
  process.exit(2)
}

const salida = join(RAIZ, GALERIA.salida)
mkdirSync(salida, { recursive: true })
const medidas = []
function escribe(nombre, generar) {
  const t0 = performance.now()
  const html = generar()
  writeFileSync(join(salida, nombre), html)
  medidas.push({ nombre, ms: performance.now() - t0, kb: Buffer.byteLength(html) / 1024 })
}

const t0 = performance.now()
const paisesFallback = COUNTRIES.filter((c) => territorioDe(c.code).fallback === true)
const porZona = new Map()
for (const zona of ZONAS_IDS) {
  let celdas = []
  escribe(`zona-${zona}.html`, () => {
    celdas = celdasDe(zona)
    return paginaDeZona(zona, celdas, paisesFallback)
  })
  porZona.set(zona, celdas)
}
const carrerasPorPais = new Map()
for (const r of SEASON_CALENDAR)
  if (!r.championshipCountry && r.country)
    carrerasPorPais.set(r.country, (carrerasPorPais.get(r.country) ?? 0) + 1)
let nac = { paises: [], filas: [] }
escribe('nacionales.html', () => {
  nac = nacionales(carrerasPorPais)
  return paginaNacionales(nac, carrerasPorPais)
})
let ado = []
escribe('adoquin.html', () => {
  ado = adoquin()
  return paginaAdoquin(ado)
})
let unDiaWTPro = []
escribe('calendario.html', () => {
  unDiaWTPro = unDiaDe(['WT', 'Pro'])
  return paginaCalendario(unDiaWTPro)
})
let unDiaCon = []
escribe('continentales.html', () => {
  unDiaCon = unDiaDe(['1', '2'])
  return paginaContinentales(unDiaCon)
})
let vs = []
escribe('vueltas.html', () => {
  vs = vueltas()
  return paginaVueltas(vs)
})
const unDiaCal = [...unDiaWTPro, ...unDiaCon]
const carreras = {
  unDia: unDiaCal.length,
  vueltas: vs.length,
  compuestas: vs.filter((v) => v.compuesta).length,
  lista: EQUIPOS.length + COUNTRIES.length,
  degradadas:
    unDiaCal.filter(
      (f) => f.stage.arch.degradado || f.ediciones.some((e) => e.stage.arch.degradado),
    ).length + vs.flatMap((v) => v.etapas).filter((e) => e.degradado).length,
}
const primeraPasada =
  GALERIA.primeraPasada.zonas.reduce((a, z) => a + porZona.get(z).length, 0) +
  ado.length +
  unDiaCal.length
escribe('index.html', () =>
  paginaIndice(porZona, nac, ado, carreras, paisesFallback, primeraPasada),
)
const total = performance.now() - t0

const todas = [...porZona.values()].flat()
console.log(
  `[galeria] ${medidas.length} páginas en ${GALERIA.salida}/: ${todas.length} celdas, ${todas.reduce((a, c) => a + c.filas.length, 0)} perfiles de zona, ${nac.filas.length} nacionales, ${ado.length} de adoquín, ${unDiaCal.length} carreras de un día y ${vs.length} vueltas (${vs.reduce((a, v) => a + v.etapas.length, 0)} etapas); primera pasada ${primeraPasada}; ${(total / 1000).toFixed(1)} s, ${(medidas.reduce((a, m) => a + m.kb, 0) / 1024).toFixed(1)} MB`,
)
if (MODO.medir)
  for (const m of medidas)
    console.log(
      `  ${m.nombre.padEnd(28)} ${m.ms.toFixed(0).padStart(6)} ms ${m.kb.toFixed(0).padStart(7)} KB`,
    )

/**
 * La columna «nuevo» de las páginas de carreras, etapa a etapa: `raceId:índice` → `huellaFNV` del
 * perfil. Es lo que el dueño revisa al cerrar el paso 6 y lo que la comprobación 3 exige que el paso 8
 * conecte sin cambiar (salvo las filas que la revisión editó). Sin las etapas `real`, que no cambian.
 */
function columnaNuevo() {
  const out = {}
  for (const f of unDiaCal) out[`${f.raceId}:1`] = huellaFNV(f.stage.profile)
  for (const v of vs)
    v.etapas.forEach((e, i) => {
      if (!e.real) out[`${v.race.id}:${i + 1}`] = e.huella
    })
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)))
}

if (MODO.sellar) {
  const sello = {
    nota: 'Columna «nuevo» de calendario.html, continentales.html y vueltas.html (docs/generador.md §16.7, comprobación 3): sellada al cerrar el paso 6 y re-sellada en el paso 8 con las correcciones de la gramática de docs/balance.md v87 §1. Se reescribe con --sellar; no se edita a mano.',
    generadaEn: GENERADA_EN,
    carreras: new Set(Object.keys(columnaNuevo()).map((k) => k.split(':')[0])).size,
    etapas: columnaNuevo(),
  }
  writeFileSync(join(RAIZ, GALERIA.sello), `${JSON.stringify(sello, null, 2)}\n`)
  console.log(`[galeria] sello de ${Object.keys(sello.etapas).length} etapas en ${GALERIA.sello}`)
}

if (MODO.comprobar) {
  // §16.7, las cinco. La 2 y la 3 leen `stagesForSeason` (paso 6).
  const fallos = []
  const degradadas = todas.flatMap((c) => c.filas).filter((f) => f.stage.arch.degradado)
  if (degradadas.length > 0)
    fallos.push(
      `(1) ${degradadas.length} perfiles degradados: ${degradadas.map((f) => f.raceId).join(', ')}`,
    )
  const bajan = []
  for (const a of ado) {
    const sk = a.nuevo.stage.arch.skeleton
    if (DE_ADOQUIN.includes(sk)) continue
    // Una fila con edición real manda su terreno de edición sobre el de la tabla (edición real >
    // rasgos > generado, §11.1): `race-bruges` es `flat` en `editions.ts` y hoy ya sale `Flat` (§16.3).
    const ed = RACE_EDITIONS[a.race.id]?.stages[0]
    if (ed && ed.terrain !== 'cobbles') {
      bajan.push(`${a.race.id} (${a.zona}, edición real ${ed.terrain}) → ${sk}`)
      continue
    }
    const cabria = DE_ADOQUIN.some(
      (id) =>
        admite(SKELETONS[id].requiere, ZONAS[a.zona]) &&
        ARCH.pesoPorClase[id][a.race.raceClass] > 0,
    )
    if (cabria) fallos.push(`(4) ${a.race.id} en ${a.zona} admite adoquín y recibe ${sk}`)
    else bajan.push(`${a.race.id} (${a.zona}) → ${sk}`)
  }
  if (bajan.length)
    console.log(`[galeria] (4) filas cobbles que bajan por ESCALON_TERRENO: ${bajan.join('; ')}`)
  if (primeraPasada > GALERIA.primeraPasada.maxPerfiles)
    fallos.push(
      `(5) primera pasada de ${primeraPasada} perfiles > ${GALERIA.primeraPasada.maxPerfiles}`,
    )
  // (2) Los 532 nacionales que dibuja la página coinciden con el calendario: misma petición, mismo resultado.
  let distintos = 0
  for (const f of nac.filas) {
    const cal = stagesForSeason(f.raceId, 0)[0]
    const a = [
      f.stage.kind,
      f.stage.label,
      profileKm(f.stage.profile).toFixed(1),
      f.stage.arch.skeleton,
    ]
    const b = [cal.kind, cal.label, profileKm(cal.profile).toFixed(1), cal.arch?.skeleton]
    if (a.join('|') !== b.join('|')) {
      distintos += 1
      if (distintos <= 5)
        fallos.push(
          `(2) ${f.raceId}: galería ${a.join(' / ')} frente a calendario ${b.join(' / ')}`,
        )
    }
  }
  if (nac.filas.length !== 532) fallos.push(`(2) ${nac.filas.length} nacionales, no 532`)
  if (distintos > 5) fallos.push(`(2) y ${distintos - 5} nacionales más distintos del calendario`)
  // (3) La columna «nuevo» no cambia respecto del sello del cierre del paso 6, salvo en las carreras
  // que la revisión del dueño editó (docs/galeria-revision.json); incluye el número de etapas.
  const rutaSello = join(RAIZ, GALERIA.sello)
  if (!existsSync(rutaSello))
    fallos.push(`(3) falta ${GALERIA.sello}: se escribe con --sellar al cerrar el paso 6`)
  else {
    const sellado = JSON.parse(readFileSync(rutaSello, 'utf8')).etapas
    const rutaRev = join(RAIZ, GALERIA.revision)
    const editadas = new Set(
      existsSync(rutaRev)
        ? JSON.parse(readFileSync(rutaRev, 'utf8')).revisiones.flatMap((r) =>
            r.filas.map((f) => f.raceId),
          )
        : [],
    )
    const ahora = columnaNuevo()
    const claves = new Set([...Object.keys(sellado), ...Object.keys(ahora)])
    const cambian = [...claves].filter(
      (k) => sellado[k] !== ahora[k] && !editadas.has(k.split(':')[0]),
    )
    if (cambian.length > 0)
      fallos.push(
        `(3) ${cambian.length} etapas de la columna «nuevo» cambian respecto del sello: ${cambian.slice(0, 10).join(', ')}`,
      )
    else
      console.log(
        `[galeria] (3) ${claves.size} etapas iguales al sello (${editadas.size} carreras editadas por la revisión)`,
      )
  }
  if (fallos.length) {
    for (const f of fallos) console.error(`[galeria] FALLA ${f}`)
    process.exit(1)
  }
  console.log('[galeria] --comprobar: las cinco en verde')
}
