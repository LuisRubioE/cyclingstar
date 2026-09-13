/**
 * Banco de MUNDO: `pnpm sim:mundo [temporadas] [corridas] [--json] [--sin-carreras] [--politica=X]`
 * `[--arco] [--dispersion]`
 * (docs/epics.md «G1»).
 *
 * `pnpm sim` mide lo que pasa en una etapa y `pnpm sim:tactics` lo que promete la capa táctica.
 * Ninguno de los dos ve pasar el TIEMPO, y las preguntas del dueño sobre los entrenamientos son
 * todas sobre el tiempo: «que no acaben todos siendo Pogačar», «que tampoco se quede nadie sin
 * pasar de cuatro en nada», «que se puedan balancear entrenamiento y carreras». Eso no se contesta
 * con una etapa: se contesta mirando a la POBLACIÓN veinticinco temporadas después.
 *
 * Solo lectura: no toca base de datos ni red, y todo el azar sale de la semilla.
 */
import { RIDER_ARCHETYPES } from '@cyclingstar/shared'
import {
  type Aprendizaje,
  type Politica,
  type WorldSeasonRow,
  analyzeWorld,
  arcoHumano,
  runWorld,
} from './world.js'

const CABECERA = [
  'temp',
  '5★med',
  '5★mej',
  'cracks%',
  'sin4%',
  'media',
  'mejor',
  'mediana',
  'p90−p10',
  'margen%',
  'congel%',
  'edad',
]

/**
 * LOS ARGUMENTOS, CON LAS BANDERAS SEPARADAS DE LOS POSICIONALES.
 *
 * Antes esto era `Number(process.argv[2] ?? 25)` y `Number(process.argv[3] ?? 3)` a pelo, sin
 * ningún parseo de banderas. Funcionaba mientras nadie escribiera una: `pnpm sim:mundo --json`
 * pasaba `'--json'` por temporadas, daba `NaN`, y el banco corría cero temporadas y no decía por
 * qué. Un banco que se traga una bandera y devuelve una tabla vacía es peor que uno que falla.
 *
 * Los posicionales siguen siendo los de siempre —temporadas y corridas, en ese orden— y las
 * banderas se filtran antes de mirarlos, así que el orden entre unos y otras da igual.
 */
interface Args {
  seasons: number
  runs: number
  json: boolean
  sinCarreras: boolean
  politica: Politica | null
  aprendizaje: Aprendizaje | null
  arco: boolean
  dispersion: boolean
}

export function parseArgs(argv: readonly string[]): Args {
  const banderas = argv.filter((a) => a.startsWith('--'))
  const posicionales = argv.filter((a) => !a.startsWith('--'))
  const valorDe = (nombre: string): string | null => {
    const b = banderas.find((x) => x === `--${nombre}` || x.startsWith(`--${nombre}=`))
    if (b === undefined) return null
    const i = b.indexOf('=')
    return i === -1 ? '' : b.slice(i + 1)
  }
  const numero = (x: string | undefined, defecto: number): number => {
    if (x === undefined) return defecto
    const n = Number(x)
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error(`argumento no numérico: «${x}». Uso: sim:mundo [temporadas] [corridas]`)
    }
    return n
  }
  return {
    seasons: numero(posicionales[0], 25),
    runs: numero(posicionales[1], 3),
    json: valorDe('json') !== null,
    sinCarreras: valorDe('sin-carreras') !== null,
    politica: unaDe(valorDe('politica'), ['bot', 'buena', 'mala'], 'politica'),
    aprendizaje: unaDe(valorDe('aprendizaje'), ['hoy', 'conKDim'], 'aprendizaje'),
    arco: valorDe('arco') !== null,
    dispersion: valorDe('dispersion') !== null,
  }
}

/**
 * Una bandera con valor cerrado. Falla en voz alta: `--politica=buean` sin esto se colaría como
 * «no es ninguna de las tres» y el banco correría el brazo del bot creyendo que corre otro.
 */
function unaDe<T extends string>(v: string | null, validos: T[], nombre: string): T | null {
  if (v === null) return null
  if (!validos.includes(v as T)) {
    throw new Error(`--${nombre}=${v} no vale. Opciones: ${validos.join(' | ')}`)
  }
  return v as T
}

/** La tabla de siempre, que es la que se lee de un vistazo. */
function tabla(filas: WorldSeasonRow[], seasons: number): void {
  console.log(CABECERA.map((c) => c.padStart(9)).join(''))
  for (const f of filas) {
    // Las tres primeras y luego de cinco en cinco: lo interesante pasa al principio y en la deriva.
    if (f.season > 3 && f.season % 5 !== 0 && f.season !== seasons) continue
    const v = [
      f.season,
      f.estrellas5Medias,
      f.estrellas5Mejor,
      f.cracksPct,
      f.sinNadaSobre4Pct,
      f.mediaGlobal,
      f.mejor,
      f.mediana,
      f.anchoP90P10,
      f.margenAlTechoPct,
      f.congeladosPct,
      f.edadMedia,
    ]
    console.log(v.map((x) => x.toFixed(2).padStart(9)).join(''))
  }
}

/**
 * LA FOTO DE ANTES, en las temporadas que el rediseño usa como referencia. Se imprime aparte de la
 * tabla porque son veintitantas filas y no caben en una línea; y se imprime SIN BANDAS, a
 * propósito: el paso 0 mide y no vigila.
 */
function foto(filas: WorldSeasonRow[]): void {
  const hitos = [1, 5, 15, 25].filter((t) => filas.some((f) => f.season === t))
  const de = (t: number): WorldSeasonRow => filas.find((f) => f.season === t)!
  const fila = (nombre: string, saca: (f: WorldSeasonRow) => number, dec = 1): void => {
    const vs = hitos.map((t) => saca(de(t)).toFixed(dec).padStart(9))
    console.log(`  ${nombre.padEnd(34)}${vs.join('')}`)
  }
  console.log(`\n  LA FOTO DE ANTES (sin bandas: esto mide, no vigila)\n`)
  console.log(`  ${'temporada'.padEnd(34)}${hitos.map((t) => String(t).padStart(9)).join('')}`)
  fila('WT con algún atributo 5★ (%)', (f) => f.cincoEstrellasWTPct)
  fila('  …solo los maduros 26-31 (%)', (f) => f.cincoEstrellasWTMadurosPct)
  fila('cracks: 3+ de 5★ (%)', (f) => f.cracksPct)
  fila('WT sin nada sobre 4★ (%)', (f) => f.sinNadaSobre4WTPct)
  fila('  …sin contar gregarios (%)', (f) => f.sinNadaSobre4NoGregariosWTPct)
  fila('margen al techo · motor (%)', (f) => f.margenMotorPct)
  fila('margen al techo · oficio (%)', (f) => f.margenOficioPct)
  fila('margen ≤23 / 24-27 / 28+ (%)', (f) => f.margenJovenesPct)
  fila('  24-27', (f) => f.margenMediosPct)
  fila('  28+', (f) => f.margenVeteranosPct)
  fila('jóvenes 19-23 con margen ≥8 (%)', (f) => f.jovenesConMargenPct)
  fila('congelados jóvenes (%)', (f) => f.congeladosJovenesPct, 2)
  fila('crecimiento neopro WT (Δ carta)', (f) => f.crecimientoNeoproWT, 2)
  fila('puros: velocistas (%)', (f) => f.purosVelocistasPct)
  fila('puros: escaladores (%)', (f) => f.purosEscaladoresPct)
  fila('el mejor es de su casa (% mundos)', (f) => f.mejorPorArquetipoOk)
  fila('curva edad aeróbica 20-21', (f) => f.curvaEdadAerobicaJoven, 3)
  fila('curva edad aeróbica 33-35', (f) => f.curvaEdadAerobicaVeterana, 3)
  fila('curva edad neuro 20-21', (f) => f.curvaEdadNeuroJoven, 3)
  fila('curva edad neuro 33-35', (f) => f.curvaEdadNeuroVeterana, 3)
  fila('TAC(33-35) − TAC(20-21)', (f) => f.curvaEdadTAC, 2)
  fila('vets 34+ menos 28-30', (f) => f.vets34vs28, 2)
  fila('aprendido/día ≤23', (f) => f.aprendidoJovenes, 3)
  fila('  24-27', (f) => f.aprendidoMedios, 3)
  fila('  28+', (f) => f.aprendidoVeteranos, 3)
  fila('días enfermo / año', (f) => f.enfermedadesAno, 2)
  fila('días con molestias / año', (f) => f.diasMolestiasAno, 2)
  fila('gana RES / año', (f) => f.ganaRESporAno, 2)
  fila('gana TAC / año', (f) => f.ganaTACporAno, 2)
  console.log('\n  reparto por arquetipo (%), derivado de los atributos:')
  for (const a of RIDER_ARCHETYPES) {
    fila(`  ${a}`, (f) => f.arquetiposPct[a])
  }
  console.log(
    '\n  techo de carta de los neopros menos el de la generación inicial («—» = ya no queda con quién comparar):',
  )
  for (const d of ['WT', 'PRS', 'CON'] as const) {
    const vs = hitos.map((t) => {
      const x = de(t).techosNeoprosVsGen0[d]
      return (x === null ? '—' : x.toFixed(2)).padStart(9)
    })
    console.log(`  ${`  ${d}`.padEnd(34)}${vs.join('')}`)
  }
  /**
   * ESTACIONARIEDAD: se deriva de las filas y no se guarda como columna. Es |media(t) − media(t−5)|,
   * o sea una relación ENTRE temporadas, y meterla dentro de la foto de una sola obligaría a que
   * cada temporada arrastrase la de hace cinco. Se calcula aquí, donde están todas.
   */
  const derivas = filas
    .filter((f) => f.season >= 10)
    .map((f) => Math.abs(f.mediaGlobal - filas[f.season - 6]!.mediaGlobal))
  if (derivas.length > 0) {
    console.log(
      `\n  estacionariedad |media(t) − media(t−5)|, t ≥ 10: máx ${Math.max(...derivas).toFixed(2)}`,
    )
  }
}

/** El arco del humano que empieza de cero, contra el suelo del continental y el techo del WT. */
function imprimirArco(): void {
  const { arcos, p25ConA22, p90WtA25 } = arcoHumano('mundo-0')
  console.log('\nEl arco del humano — nace a los 18, plan del bot, 45 días de continental al año\n')
  console.log(
    `  ${'vocación'.padEnd(12)}${'a 20'.padStart(9)}${'a 22'.padStart(9)}${'a 25'.padStart(9)}${'carta 25'.padStart(10)}`,
  )
  for (const a of arcos) {
    console.log(
      `  ${a.vocation.padEnd(12)}${a.a20.toFixed(1).padStart(9)}${a.a22.toFixed(1).padStart(9)}${a.a25.toFixed(1).padStart(9)}${a.cartaA25.toFixed(1).padStart(10)}`,
    )
  }
  console.log(
    `\n  Referencias (bots recién generados a esa edad): p25 del CON a los 22 = ${p25ConA22.toFixed(1)} · p90 del WT a los 25 = ${p90WtA25.toFixed(1)}`,
  )
  console.log(
    '  Los dos extremos son defectos: por debajo del p25 a los 22 nadie le ficha; por encima del p90 a los 25 las decisiones del jugador no valen nada.\n',
  )
}

/**
 * LA DESVIACIÓN ENTRE SEMILLAS, que es lo que hace falta para poner un listón (§7.2 y paso 12).
 *
 * Existe porque el banco lo necesitó de verdad: en la v61 se puso roja `sinNadaSobre4WTPct ≤ 30` y,
 * al medirla sobre SEIS mundos en vez de dos, resultó que su desviación entre semillas era de **3,07
 * puntos**. O sea que el listón estaba sellado DENTRO de su propio ruido y lo pasaba un mundo de cada
 * seis: no era un guardarraíl, era una cara de una moneda.
 *
 * `analyzeWorld` PROMEDIA las corridas, así que no sirve para esto: lo que hace falta es cada mundo
 * por separado. La regla del paso 12 es «banda ≥ 2× la desviación medida», y ésta es la herramienta
 * que da ese número, en el repositorio y no en un fichero de usar y tirar.
 */
function dispersion(runs: number, seasons: number): void {
  const ultimas = Array.from({ length: runs }, (_, i) => {
    const filas = runWorld(`mundo-${i}`, seasons)
    return filas[filas.length - 1]!
  })
  console.log(`\nDispersión entre semillas — ${runs} mundos × ${seasons} temporadas\n`)
  console.log(
    `  ${'métrica'.padEnd(32)}${'media'.padStart(9)}${'sd'.padStart(9)}${'mín'.padStart(9)}${'máx'.padStart(9)}${'m+2sd'.padStart(9)}${'m−2sd'.padStart(9)}`,
  )
  const claves = Object.keys(ultimas[0]!).filter(
    (k) => typeof (ultimas[0] as unknown as Record<string, unknown>)[k] === 'number',
  )
  for (const k of claves) {
    const vs = ultimas.map((u) => (u as unknown as Record<string, number>)[k]!)
    const m = vs.reduce((a, b) => a + b, 0) / vs.length
    const sd = Math.sqrt(vs.reduce((a, b) => a + (b - m) ** 2, 0) / vs.length)
    const c = (x: number): string => x.toFixed(2).padStart(9)
    console.log(
      `  ${k.padEnd(32)}${c(m)}${c(sd)}${c(Math.min(...vs))}${c(Math.max(...vs))}${c(m + 2 * sd)}${c(m - 2 * sd)}`,
    )
  }
  console.log(
    '\n  Un listón más estrecho que m±2sd no vigila el mundo: vigila qué semillas lee el banco.\n',
  )
}

function main(): void {
  const args = parseArgs(process.argv.slice(2))
  if (args.arco) {
    imprimirArco()
    return
  }
  if (args.dispersion) {
    dispersion(args.runs, args.seasons)
    return
  }
  const filas = analyzeWorld(args.runs, args.seasons, {
    sinCarreras: args.sinCarreras,
    ...(args.politica !== null ? { politica: args.politica } : {}),
    ...(args.aprendizaje !== null ? { aprendizaje: args.aprendizaje } : {}),
  })

  if (args.json) {
    console.log(JSON.stringify(filas, null, 2))
    return
  }

  const brazos = [
    args.sinCarreras ? 'SIN CARRERAS (solo entrenando)' : null,
    args.politica !== null && args.politica !== 'bot' ? `política ${args.politica}` : null,
    args.aprendizaje === 'conKDim' ? 'carrera CON kDim' : null,
  ].filter((x) => x !== null)
  const brazo = brazos.length > 0 ? ` — brazo ${brazos.join(' + ')}` : ''
  console.log(`\nBanco de mundo — ${args.runs} mundos × ${args.seasons} temporadas${brazo}\n`)
  tabla(filas, args.seasons)

  const primera = filas[0]
  const ultima = filas[filas.length - 1]
  if (primera === undefined || ultima === undefined) return
  console.log('\n  Cómo se lee esto (las tres preguntas del dueño, en este orden):\n')
  console.log(
    `  ¿acaban todos siendo Pogačar?   cracks (3+ atributos de 5★) ${primera.cracksPct.toFixed(1)}% → ${ultima.cracksPct.toFixed(1)}%`,
  )
  console.log(
    `  ¿se queda nadie en medianía?    sin nada por encima de 4★    ${primera.sinNadaSobre4Pct.toFixed(1)}% → ${ultima.sinNadaSobre4Pct.toFixed(1)}%`,
  )
  console.log(
    `  ¿se aplanan las diferencias?    ancho p90−p10 de la media    ${primera.anchoP90P10.toFixed(1)} → ${ultima.anchoP90P10.toFixed(1)}`,
  )
  console.log(
    `\n  Y a cuánta gente le sirve entrenar: congelados ${primera.congeladosPct.toFixed(1)}% → ${ultima.congeladosPct.toFixed(1)}%`,
  )
  foto(filas)
}

main()
