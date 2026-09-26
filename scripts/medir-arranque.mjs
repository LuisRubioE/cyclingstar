/**
 * EL COSTE DE ARRANQUE DEL CALENDARIO, MEDIDO (docs/generador.md §14.3, decisión 35).
 *
 * Vive en `scripts/` y no en `packages/engine/src` por la misma razón que `medir-carrera.mjs`: el
 * motor es puro y esto es herramienta de banco que lee del `dist` compilado. La carga de un módulo
 * solo se puede medir UNA vez por proceso, así que el script se lanza a sí mismo `n` veces como
 * proceso hijo (`--una`) y da la mediana y el máximo: un número de `balance.md` no puede ser el de
 * un runner cargado (la variación entre dos noches del nocturno es del 30 %).
 *
 * Uso: pnpm --filter @cyclingstar/engine build && node scripts/medir-arranque.mjs [--n 5] [--temporadas 3]
 *
 * Imprime una tabla Markdown lista para pegar en «vN §0» (paso 0, generador viejo; anexo del paso 6) y
 * «vN §1» (paso 8). Desde el paso 6 lee objetivo, techo y coste por temporada de `ARCH.arranque`, y mide
 * `calendarForSeason`: la temporada 0 por la ruta nueva mientras `SEASON_CALENDAR` siga siendo la vieja
 * (pasos 6 y 7), las temporadas 1 a `--temporadas` y la segunda lectura, que es memoizada.
 */
import { execFileSync } from 'node:child_process'
import { statSync } from 'node:fs'
import { cpus } from 'node:os'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const DIST = new URL('../packages/engine/dist/', import.meta.url)
const args = process.argv.slice(2)
const opcion = (nombre, defecto) => {
  const i = args.indexOf(nombre)
  return i >= 0 && args[i + 1] !== undefined ? Number(args[i + 1]) : defecto
}
const N = opcion('--n', 5)
const TEMPORADAS = opcion('--temporadas', 3)

if (args.includes('--una')) await una()
else await padre()

/** Un hijo: una sola carga del módulo, una línea JSON. */
async function una() {
  const t0 = performance.now()
  const mod = await import(new URL('routes/calendar.js', DIST).href)
  const cargaMs = performance.now() - t0
  const cal = mod.SEASON_CALENDAR
  const etapas = cal.flatMap((r) => r.stages)
  const segmentos = etapas.reduce((a, s) => a + s.profile.segments.length, 0)

  // Pasos 6 y 7: `calendarForSeason(0)` existe y NO es `SEASON_CALENDAR` (la ruta nueva no tiene
  // llamadores hasta el paso 8), así que su primera llamada construye la temporada 0 por la gramática.
  // Desde el paso 8 es la misma referencia y cuesta cero, porque ya se pagó en la carga.
  let temporada0 = null
  let nueva = null
  if (typeof mod.calendarForSeason === 'function') {
    const h0 = process.memoryUsage().heapUsed
    const a = performance.now()
    nueva = mod.calendarForSeason(0)
    temporada0 = {
      ms: performance.now() - a,
      mb: (process.memoryUsage().heapUsed - h0) / 2 ** 20,
      misma: nueva === cal,
    }
  }
  // Con `arch` (la ruta nueva): histograma de intentos y degradados. Del calendario que corre el juego
  // si ya la lleva (paso 8), y si no, de la temporada 0 por la ruta nueva (pasos 6 y 7).
  const conArch = (
    etapas.some((s) => s.arch) || !nueva ? etapas : nueva.flatMap((r) => r.stages)
  ).filter((s) => s.arch)
  const intentos = conArch.map((s) => s.arch.intentos).sort((a, b) => a - b)
  const q = (p) =>
    intentos.length
      ? intentos[Math.min(intentos.length - 1, Math.floor(intentos.length * p))]
      : null

  const temporadas = []
  let memoMs = null
  for (let s = 1; s <= TEMPORADAS; s++) {
    if (typeof mod.calendarForSeason !== 'function') {
      temporadas.push(null) // paso 0: la función no existe todavía; la línea base es la temporada 0
      continue
    }
    const h0 = process.memoryUsage().heapUsed
    const a = performance.now()
    mod.calendarForSeason(s)
    temporadas.push({
      ms: performance.now() - a,
      mb: (process.memoryUsage().heapUsed - h0) / 2 ** 20,
    })
  }
  if (typeof mod.calendarForSeason === 'function' && TEMPORADAS >= 1) {
    const a = performance.now()
    mod.calendarForSeason(1) // segunda lectura: memoizada
    memoMs = performance.now() - a
  }

  // La pasada de motor de referencia (la del juez, `coste-motor.mjs`): no es arranque, es lo que el
  // censo paga una vez por calendario.
  const { sampleProfile } = await import(new URL('stage/sample.js', DIST).href)
  const { deriveFinishTerrain, finishType } = await import(new URL('stage/finish.js', DIST).href)
  const { stageKindOf } = await import(new URL('routes/stageKind.js', DIST).href)
  const { finalKindOf } = await import(new URL('routes/finalKind.js', DIST).href)
  const p0 = performance.now()
  let bloques = 0
  for (const st of etapas) {
    const b = sampleProfile(st.profile)
    bloques += b.length
    finishType(deriveFinishTerrain(b), 50)
    stageKindOf(st.profile, st.timeTrial === true)
    finalKindOf(st.profile)
  }
  const pasadaMs = performance.now() - p0

  console.log(
    JSON.stringify({
      cargaMs,
      carreras: cal.length,
      etapas: etapas.length,
      segmentos,
      temporadas,
      temporada0,
      memoMs,
      pasadaMs,
      bloques,
      intentos: intentos.length ? { p50: q(0.5), p95: q(0.95), max: intentos.at(-1) } : null,
      degradados: conArch.filter((s) => s.arch.degradado).length,
      conArch: conArch.length,
    }),
  )
}

/** El padre: comprueba que el `dist` es el del código, lanza los hijos y agrega. */
async function padre() {
  const src = new URL('../packages/engine/src/', import.meta.url)
  for (const f of ['constants', 'routes/calendar']) {
    const d = statSync(new URL(`${f}.js`, DIST)).mtimeMs
    const s = statSync(new URL(`${f}.ts`, src)).mtimeMs
    if (d < s) {
      console.error(
        `dist/${f}.js es más antiguo que src/${f}.ts: se mediría otro código. Compila antes con\n` +
          '  pnpm --filter @cyclingstar/engine build',
      )
      process.exit(1)
    }
  }
  const { ENGINE_VERSION, ARCH } = await import(new URL('constants.js', DIST).href)
  // Desde el paso 6 las tres cifras son las de `ARCH.arranque` (§12.9), no literales del script.
  if (!ARCH?.arranque) {
    console.error('dist/constants.js no tiene ARCH.arranque (paso 6): compila el código de hoy.')
    process.exit(1)
  }
  const { objetivoMs, techoMs, porTemporadaMs } = ARCH.arranque
  const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: RAIZ })
    .toString()
    .trim()
  const ruta = fileURLToPath(import.meta.url)

  const medidas = []
  for (let i = 0; i < N; i++) {
    const salida = execFileSync(
      process.execPath,
      [ruta, '--una', '--temporadas', String(TEMPORADAS)],
      {
        cwd: RAIZ,
      },
    ).toString()
    medidas.push(JSON.parse(salida.trim().split('\n').at(-1)))
  }
  const mediana = (xs) => {
    const s = [...xs].sort((a, b) => a - b)
    return s[Math.floor((s.length - 1) / 2)]
  }
  const maximo = (xs) => Math.max(...xs)
  const f0 = (x) => x.toFixed(0)
  const f2 = (x) => x.toFixed(2)
  const m0 = medidas[0]

  let cargasTest = 'n/a'
  try {
    cargasTest = execFileSync(
      'grep',
      [
        '-rlE',
        'SEASON_CALENDAR|@cyclingstar/engine',
        'packages',
        'apps',
        '--include=*.test.ts',
        '--exclude-dir=node_modules',
      ],
      { cwd: RAIZ },
    )
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean).length
  } catch {
    cargasTest = 0
  }

  const carga = medidas.map((m) => m.cargaMs)
  const pasada = medidas.map((m) => m.pasadaMs)
  const filas = [
    ['HEAD / ENGINE_VERSION', `${head} / ${ENGINE_VERSION}`, '', 'git, dist/constants.js'],
    [
      'Máquina',
      `${cpus()[0]?.model ?? '?'} × ${cpus().length}, node ${process.versions.node}`,
      '',
      'os.cpus()',
    ],
    [
      'Carga de routes/calendar.js (ms)',
      f0(mediana(carga)),
      f0(maximo(carga)),
      `mediana de ${N} procesos hijo`,
    ],
    [
      'Margen: objetivoMs / mediana; techoMs / mediana',
      `${f2(objetivoMs / mediana(carga))}; ${f2(techoMs / mediana(carga))}`,
      '',
      `objetivo ${objetivoMs}, techo ${techoMs} (§12.9)`,
    ],
    [
      'Carreras / etapas / segmentos / segmentos por etapa',
      `${m0.carreras} / ${m0.etapas} / ${m0.segmentos} / ${(m0.segmentos / m0.etapas).toFixed(1)}`,
      '',
      'SEASON_CALENDAR',
    ],
  ]
  const t0s = medidas.map((m) => m.temporada0)
  if (t0s.some((x) => x === null))
    filas.push([
      'Temporada 0 por la ruta nueva (ms; MB de heap)',
      'n/a',
      'n/a',
      'calendarForSeason no existe todavía',
    ])
  else if (t0s.every((x) => x.misma))
    filas.push([
      'Temporada 0 por la ruta nueva',
      'es SEASON_CALENDAR',
      '',
      'calendarForSeason(0) === SEASON_CALENDAR (paso 8)',
    ])
  else
    filas.push([
      'Temporada 0 por la ruta nueva (ms; MB de heap)',
      `${f0(mediana(t0s.map((x) => x.ms)))}; ${f2(mediana(t0s.map((x) => x.mb)))}`,
      `${f0(maximo(t0s.map((x) => x.ms)))}; ${f2(maximo(t0s.map((x) => x.mb)))}`,
      `calendarForSeason(0), distinta de SEASON_CALENDAR hasta el paso 8; objetivo ${objetivoMs}, techo ${techoMs}`,
    ])
  for (let s = 1; s <= TEMPORADAS; s++) {
    const t = medidas.map((m) => m.temporadas[s - 1])
    if (t.some((x) => x === null))
      filas.push([
        `Temporada ${s} (ms; MB de heap)`,
        'n/a',
        'n/a',
        'calendarForSeason no existe todavía',
      ])
    else
      filas.push([
        `Temporada ${s} (ms; MB de heap)`,
        `${f0(mediana(t.map((x) => x.ms)))}; ${f2(mediana(t.map((x) => x.mb)))}`,
        `${f0(maximo(t.map((x) => x.ms)))}; ${f2(maximo(t.map((x) => x.mb)))}`,
        `calendarForSeason(${s}); porTemporadaMs ${porTemporadaMs} (margen ${f2(porTemporadaMs / mediana(t.map((x) => x.ms)))})`,
      ])
  }
  const memo = medidas.map((m) => m.memoMs)
  if (!memo.some((x) => x === null))
    filas.push([
      'Segunda lectura de una temporada (ms)',
      f2(mediana(memo)),
      f2(maximo(memo)),
      'calendarForSeason(1) otra vez: memoizada, misma referencia',
    ])
  filas.push([
    'Pasada de motor (ms; ms por etapa; bloques)',
    `${f0(mediana(pasada))}; ${(mediana(pasada) / m0.etapas).toFixed(3)}; ${m0.bloques}`,
    `${f0(maximo(pasada))}`,
    'sampleProfile + finishType(deriveFinishTerrain, 50) + stageKindOf + finalKindOf',
  ])
  filas.push([
    'Intentos p50 / p95 / máx',
    m0.intentos ? `${m0.intentos.p50} / ${m0.intentos.p95} / ${m0.intentos.max}` : 'n/a (sin arch)',
    '',
    'arch.intentos',
  ])
  filas.push([
    'Degradados',
    m0.conArch ? String(m0.degradados) : 'n/a (sin arch)',
    '',
    'arch.degradado',
  ])
  filas.push([
    'Cargas directas de test (suelo)',
    String(cargasTest),
    '',
    "grep -rlE 'SEASON_CALENDAR\\|@cyclingstar/engine' packages apps --include='*.test.ts'",
  ])

  console.log('| Medida | Mediana | Máximo | Fuente |')
  console.log('| --- | --- | --- | --- |')
  for (const f of filas) console.log(`| ${f.join(' | ')} |`)
  console.log(`\nCargas medidas (ms): ${carga.map(f0).join(', ')}`)
}
