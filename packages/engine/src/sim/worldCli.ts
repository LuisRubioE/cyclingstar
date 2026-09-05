/**
 * Banco de MUNDO: `pnpm sim:mundo [temporadas] [corridas]` (docs/epics.md «G1»).
 *
 * `pnpm sim` mide lo que pasa en una etapa y `pnpm sim:tactics` lo que promete la capa táctica.
 * Ninguno de los dos ve pasar el TIEMPO, y las preguntas del dueño sobre los entrenamientos son
 * todas sobre el tiempo: «que no acaben todos siendo Pogačar», «que tampoco se quede nadie sin
 * pasar de cuatro en nada», «que se puedan balancear entrenamiento y carreras». Eso no se contesta
 * con una etapa: se contesta mirando a la POBLACIÓN veinticinco temporadas después.
 *
 * Solo lectura: no toca base de datos ni red, y todo el azar sale de la semilla.
 */
import { analyzeWorld } from './world.js'

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

function main(): void {
  const seasons = Number(process.argv[2] ?? 25)
  const runs = Number(process.argv[3] ?? 3)
  const filas = analyzeWorld(runs, seasons)

  console.log(`\nBanco de mundo — ${runs} mundos × ${seasons} temporadas\n`)
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
    `\n  Y a cuánta gente le sirve entrenar: congelados ${primera.congeladosPct.toFixed(1)}% → ${ultima.congeladosPct.toFixed(1)}%\n`,
  )
}

main()
