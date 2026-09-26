#!/usr/bin/env node
// scripts/galeria-recorridos.mjs (paso 5; `pnpm --filter @cyclingstar/engine build` antes de correrlo)
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
 *
 * Tanda del paso 5 (§16.7): `index.html`, una página por zona (`zona-*.html`), `nacionales.html` y
 * `adoquin.html`. `calendario.html`, `continentales.html`, `vueltas.html` y la columna «Ediciones»
 * llegan al cerrar el paso 6 (piden `raceForSeason` / `stagesForSeason`); `--congelar-antes` es del
 * paso 9. Lee el `dist` por ruta profunda, como `inventario-recorridos.mjs`, y nunca de
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
import { SEASON_CALENDAR } from '../packages/engine/dist/routes/calendar.js'
import { routeRng } from '../packages/engine/dist/routes/profileGen.js'
import { STAGE_FEATURES } from '../packages/engine/dist/routes/stageFeatures.js'
import { RACE_CLASSES } from '../packages/engine/dist/routes/uci.js'
import { generateStage } from '../packages/engine/dist/routes/grammar/generate.js'
import { ZONAS, admite, territorioDe, zonaDe } from '../packages/engine/dist/routes/grammar/geo.js'
import {
  COBBLES_IDS,
  RACE_REGION,
  regionOf,
} from '../packages/engine/dist/routes/grammar/regions.js'
import { SKELETONS } from '../packages/engine/dist/routes/grammar/skeletons.js'
import { kmDe } from '../packages/engine/dist/routes/grammar/tour.js'
import { deriveFinishTerrain, finishType } from '../packages/engine/dist/stage/finish.js'
import { sampleProfile, stageLengthKm } from '../packages/engine/dist/stage/sample.js'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')

const GALERIA = {
  salida: 'docs/galeria-recorridos', // no versionado: entra en .gitignore (§16.3)
  revision: 'docs/galeria-revision.json', // lo único versionado: las respuestas del dueño fusionadas (§16.6)
  semillasPorCelda: 5, // decisión 41: 5 perfiles por (zona × esqueleto compatible)
  svg: { width: 720, height: 200 }, // los valores por defecto de renderAltimetrySvg, explícitos
  grupoMeta: 50, // groupSize del finishType del censo (§B.2 RouteStats.finishType)
  season: 0, // BASE_SEASON: la temporada canónica
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
}

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

/** Una fila dibujada: la etapa, su `finishType` y su SVG. */
function fila(base, req, titulo) {
  const stage = generateStage(req)
  return {
    ...base,
    km: req.km,
    stage,
    finishType: finishTypeDe(stage.profile),
    svg: renderAltimetrySvg(stage.profile, { ...GALERIA.svg, title: titulo }),
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
] // `no_es_la_misma_carrera` solo donde hay columna «Ediciones» (desde el paso 6)

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
        if (v === 'no_lo_reconozco' && !(e.nota || '').trim()) faltan.push(tr.dataset.fila);
        const d = tr.dataset;
        filas.push({ raceId: d.race, stageIndex: Number(d.etapa), zona: d.zona, esqueleto: d.esqueleto || null,
          clase: d.clase, km: d.km ? Number(d.km) : null, veredicto: v, ...(e.nota ? { nota: e.nota } : {}) });
      }
    }
    if (faltan.length) { alert('«no lo reconozco» pide una nota de una línea: ' + faltan.join(', ')); return; }
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
function casillas() {
  return `${VEREDICTOS.map(([v, t]) => `<label><input type="checkbox" value="${v}"> ${t}</label>`).join('')}
<textarea placeholder="nota (obligatoria con «no lo reconozco»)"></textarea>`
}
function filaHtml(f, idFila, stageIndex = 1) {
  return `<tr class="fila" data-fila="${esc(idFila)}" data-race="${esc(f.raceId)}" data-etapa="${stageIndex}" data-zona="${esc(f.zona)}" data-esqueleto="${esc(f.esqueleto ?? '')}" data-clase="${esc(f.clase)}" data-km="${f.km}">
<td class="svg">${f.svg}</td><td class="datos">${datosDe(f)}</td><td class="revision">${casillas()}</td></tr>`
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
  }Cinco perfiles por esqueleto compatible (${celdas.length} esqueletos), temporada ${GALERIA.season}, km de <code>kmDe</code> por clase. Tres preguntas por perfil, en orden: ¿existe en ese sitio?, ¿existe en esa clase?, ¿la reconocería un aficionado? La columna «Ediciones» llega al cerrar el paso 6.</p>
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
      const sk = SKELETONS[n.sk]
      const km = clamp(
        kmDe(n.rol, 'NC', 1, false, routeRng(`${raceId}|km`)),
        sk.km[0],
        Math.min(sk.km[1], ARCH.km.maxPorClase.NC),
      )
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
    `<p class="suave">Los ${paises.length} países, ordenados por carreras de equipos. Cuatro perfiles por país con la petición que construirá <code>nationalChampionships</code> en el paso 8: zona <code>zonaDe(cc)</code>, clase NC, sin <code>fixed</code>.</p>
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
    if (!race) throw new Error(`adoquin: ${raceId} no está en SEASON_CALENDAR`)
    const hoy = race.stages[0]
    const zona = regionOf(raceId, 1, race.country ?? null)
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
    } // sin `fixed` (§16.2); al cerrar el paso 6 pasa a `stagesForSeason(raceId, 0)`
    const nuevo = fila(
      { raceId, zona, esqueleto: null, clase: race.raceClass },
      req,
      `nuevo · ${raceId} · ${zona} · ${num(km)} km`,
    )
    return {
      race,
      hoy,
      real: esReal(race),
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
    `<p class="suave">Las ${filas.length} carreras con <code>terrain: 'cobbles'</code>. A la izquierda, lo que el calendario les da hoy; a la derecha, lo que el generador nuevo hace con la fila.</p>${cuerpo}`,
  )
}

// ---------------------------------------------------------------------------------------------------
// El índice (§16.3).
// ---------------------------------------------------------------------------------------------------

function paginaIndice(porZona, nac, ado, paisesFallback, primeraPasada) {
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
    ['continentales.html', 'continentales (cierre del paso 6)', true],
    ['vueltas.html', 'vueltas (cierre del paso 6)', true],
    ['calendario.html', 'calendario (cierre del paso 6)', true],
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
<p>${nCeldas} celdas zona × esqueleto y ${nPerfiles} perfiles (${degTotales} degradados); ${nac.filas.length} perfiles nacionales; ${ado.length} + ${ado.length} de adoquín.
Primera pasada: ${primeraPasada} perfiles de ${GALERIA.primeraPasada.maxPerfiles} (fila 0 de cada celda en ${GALERIA.primeraPasada.zonas.length} zonas y la columna derecha de adoquín; las carreras de un día del calendario se suman al cerrar el paso 6).</p>
<p class="suave">Generada del árbol del ${esc(GENERADA_EN)}, temporada ${GALERIA.season}.</p>
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
    '[galeria] --congelar-antes es del cierre del paso 9 (§16.3): todavía no existe legacyCalendar().',
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
const primeraPasada =
  GALERIA.primeraPasada.zonas.reduce((a, z) => a + porZona.get(z).length, 0) + ado.length
escribe('index.html', () => paginaIndice(porZona, nac, ado, paisesFallback, primeraPasada))
const total = performance.now() - t0

const todas = [...porZona.values()].flat()
console.log(
  `[galeria] ${medidas.length} páginas en ${GALERIA.salida}/: ${todas.length} celdas, ${todas.reduce((a, c) => a + c.filas.length, 0)} perfiles de zona, ${nac.filas.length} nacionales, ${ado.length} de adoquín; ${(total / 1000).toFixed(1)} s, ${(medidas.reduce((a, m) => a + m.kb, 0) / 1024).toFixed(1)} MB`,
)
if (MODO.medir)
  for (const m of medidas)
    console.log(
      `  ${m.nombre.padEnd(28)} ${m.ms.toFixed(0).padStart(6)} ms ${m.kb.toFixed(0).padStart(7)} KB`,
    )

if (MODO.comprobar) {
  // §16.7. En el paso 5 se comprueban 1, 4 y 5; la 2 y la 3 piden `stagesForSeason` (pasos 6 y 8).
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
  console.log('[galeria] (2) y (3) pendientes: piden stagesForSeason (pasos 6 y 8)')
  if (fallos.length) {
    for (const f of fallos) console.error(`[galeria] FALLA ${f}`)
    process.exit(1)
  }
  console.log('[galeria] --comprobar: 1, 4 y 5 en verde')
}
